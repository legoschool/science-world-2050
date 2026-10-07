"""Versioned, student-owned climate/health inquiry. No automatic achievement grading."""
import copy
import hashlib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = [
    'CREATE TABLE IF NOT EXISTS health_runs(owner TEXT NOT NULL,run_id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,catalog TEXT NOT NULL,updated DOUBLE PRECISION NOT NULL,PRIMARY KEY(owner,run_id))',
    'CREATE TABLE IF NOT EXISTS health_actions(id TEXT PRIMARY KEY,owner TEXT NOT NULL,run_id TEXT NOT NULL,digest TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS health_turns(id TEXT PRIMARY KEY,owner TEXT NOT NULL,run_id TEXT NOT NULL,class_id TEXT NOT NULL,created DOUBLE PRECISION NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS health_turn_owner ON health_turns(owner,created)',
    'CREATE INDEX IF NOT EXISTS health_turn_class ON health_turns(class_id,created)',
]

class InquiryError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status

def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))

def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', value):
        raise InquiryError('탐구 회차를 다시 확인해 주세요.')
    return value

def text(value, limit=1600, required=False):
    if not isinstance(value, str) or len(value) > limit or '\x00' in value:
        raise InquiryError(f'생각은 {limit}자 안으로 적어 주세요.')
    value = value.strip()
    if required and not value:
        raise InquiryError('생각이나 더 궁금한 점을 적어 주세요.')
    return value

def student(user):
    if user['role'] != 'student':
        raise InquiryError('학생 탐험 화면에서 열어 주세요.', 403)

def latest_catalog():
    return json.loads((Path(__file__).parent / 'data/health-inquiry.json').read_text(encoding='utf-8'))

def load(db, user, run):
    student(user)
    identifier(run)
    row = db.execute('SELECT * FROM health_runs WHERE owner=? AND run_id=?', (user['id'], run)).fetchone()
    if not row:
        catalog = latest_catalog()
        state = {'room':'clinic', 'visited':[], 'opened':[], 'notes':{}, 'savedRooms':[], 'classifications':{},
                 'hypotheses':[], 'edges':[], 'requests':[], 'warningVersions':[], 'decisions':{}, 'submitted':False}
        db.execute('INSERT INTO health_runs VALUES(?,?,?,?,?,?) ON CONFLICT(owner,run_id) DO NOTHING',
                   (user['id'], run, 0, encoded(state), encoded(catalog), time.time()))
        row = db.execute('SELECT * FROM health_runs WHERE owner=? AND run_id=?', (user['id'], run)).fetchone()
    return row, json.loads(row['payload']), json.loads(row['catalog'])

def available(state, catalog):
    ids = {cid for room in catalog['rooms'] for cid in room['cards'] if cid != 'update'}
    ids.update(state['requests'])
    if state['warningVersions']:
        ids.add('update')
    return ids

def view(db, user, run):
    row, state, catalog = load(db, user, run)
    public = copy.deepcopy(catalog)
    allowed = available(state, catalog)
    public['cards'] = [c for c in catalog['cards'] if c['id'] in allowed]
    turns = [dict(id=r['id'], status=r['status'], **json.loads(r['payload'])) for r in db.execute(
        'SELECT id,status,payload FROM health_turns WHERE owner=? AND run_id=? ORDER BY created', (user['id'], run))]
    return {'revision':row['revision'], 'state':state, 'catalog':public, 'turns':turns}

def record(db, user, run, event_id, kind, title, response, extra, catalog):
    now = time.time()
    payload = {'gameId':'R5-G03', 'runId':run, 'missionTitle':'얼어 있던 땅에서 온 경고',
               'taskTitle':title, 'responseText':response, 'evaluation':'ungraded',
               'review':'teacher_pending', 'modality':'simulation', 'gameVersion':catalog['version'],
               'contentRevision':hashlib.sha256(encoded(catalog).encode()).hexdigest(), **extra}
    db.execute('INSERT INTO events VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
               ('health-'+event_id, user['id'], 'health.'+kind, 'healthInquiry',
                datetime.now(timezone.utc).isoformat(), now, encoded(payload)))

def mutate(db, user, data):
    if set(data) != {'runId','id','revision','op','data'}:
        raise InquiryError('탐구 기록 형식을 확인해 주세요.')
    run, action_id = identifier(data['runId']), identifier(data['id'])
    p, op = data['data'], data['op']
    if not isinstance(p, dict) or not isinstance(op, str):
        raise InquiryError('탐구 기록 형식을 확인해 주세요.')
    row, s, c = load(db, user, run)
    digest = hashlib.sha256(encoded(data).encode()).hexdigest()
    previous = db.execute('SELECT * FROM health_actions WHERE id=?', (action_id,)).fetchone()
    if previous:
        if previous['owner'] != user['id'] or previous['run_id'] != run or previous['digest'] != digest:
            raise InquiryError('다른 기록과 겹쳤어요. 다시 저장해 주세요.', 409)
        return view(db, user, run)
    if type(data['revision']) is not int or row['revision'] != data['revision']:
        raise InquiryError('다른 기기의 기록이 도착했어요. 최신 기록을 읽은 뒤 내 초안을 다시 저장해 주세요.', 409)
    rooms = {r['id']:r for r in c['rooms']}
    cards = {r['id']:r for r in c['cards']}
    title, response = '', ''
    if op == 'visit' and set(p) == {'room'} and p['room'] in rooms:
        s['room'] = p['room']
        s['visited'] = list(dict.fromkeys(s['visited']+[p['room']]))
    elif op == 'read' and set(p) == {'card'} and p['card'] in available(s, c):
        s['opened'] = list(dict.fromkeys(s['opened']+[p['card']]))
        title, response = '자료 살펴보기', cards[p['card']]['title']
    elif op == 'save' and set(p) == {'room','notes'} and p['room'] in rooms and isinstance(p['notes'], dict):
        fields = {f[0] for f in rooms[p['room']]['fields']}
        if set(p['notes']) != fields:
            raise InquiryError('이 장소의 기록 항목을 확인해 주세요.')
        notes = {k:text(v) for k,v in p['notes'].items()}
        if not any(notes.values()):
            raise InquiryError('내 생각이나 아직 궁금한 점을 하나 남겨 주세요.')
        s['notes'].update(notes)
        if notes.get('prediction') and not s.get('firstPrediction'):
            s['firstPrediction'] = notes['prediction']
        s['savedRooms'] = list(dict.fromkeys(s['savedRooms']+[p['room']]))
        title = rooms[p['room']]['title']+'에서 남긴 생각'
        response = '\n'.join(label+': '+notes[key] for key,label in rooms[p['room']]['fields'] if notes[key])
        if 'warning' in notes and notes['warning']:
            s['warningVersions'].append({'text':notes['warning'], 'at':time.time(), 'afterUpdate':'update' in s['opened']})
    elif op == 'classify' and set(p) == {'card','category','reason'} and p['card'] in s['opened'] and p['category'] in ('confirmed','interpretation','unknown'):
        p = {**p, 'reason':text(p['reason'], 500)}
        s['classifications'][p['card']] = {'category':p['category'], 'reason':p['reason']}
        title, response = '자료의 근거 범위 분류', cards[p['card']]['title']+': '+{'confirmed':'직접 확인','interpretation':'가능한 설명','unknown':'아직 확인 못함'}[p['category']]+' / '+p['reason']
    elif op == 'hypotheses' and set(p) == {'selected'} and isinstance(p['selected'], list):
        allowed = {h['id'] for h in c['hypotheses']}
        if any(not isinstance(x,str) or x not in allowed for x in p['selected']) or len(p['selected']) != len(set(p['selected'])):
            raise InquiryError('함께 검토할 설명을 골라 주세요.')
        s['hypotheses'] = p['selected']
        title, response = '함께 검토할 설명', ' / '.join(h['title'] for h in c['hypotheses'] if h['id'] in p['selected'])
    elif op == 'link' and set(p) == {'hypothesis','card','relation','reason'} and p['hypothesis'] in s['hypotheses'] and p['card'] in s['opened'] and p['relation'] in ('supports','challenges','question'):
        p = {**p, 'reason':text(p['reason'], 500)}
        s['edges'] = [e for e in s['edges'] if (e['hypothesis'],e['card']) != (p['hypothesis'],p['card'])]+[p]
        title, response = '설명과 증거 연결', cards[p['card']]['title']+' / '+{'supports':'지지하는 자료','challenges':'설명하기 어려운 자료','question':'더 확인할 자료'}[p['relation']]+' / '+p['reason']
    elif op == 'request' and set(p) == {'selected','reason'} and isinstance(p['selected'], list):
        allowed = {r['id'] for r in c['requests']}
        if not 1 <= len(p['selected']) <= 3 or len(set(map(str,p['selected']))) != len(p['selected']) or any(not isinstance(x,str) or x not in allowed for x in p['selected']):
            raise InquiryError('이번에 요청할 자료를 세 가지까지 골라 주세요.')
        p = {**p, 'reason':text(p['reason'], 1600, True)}
        s['requests'] = list(dict.fromkeys(s['requests']+p['selected']))
        s['notes']['requestReason'] = p['reason']
        title, response = '추가 자료 요청', ' / '.join(r['title'] for r in c['requests'] if r['id'] in p['selected'])+'\n선택 이유: '+p['reason']
    elif op == 'decision' and set(p) == {'turn','choice','reason'} and p['choice'] in ('accept','revise','reject','hold'):
        identifier(p['turn'])
        found = db.execute("SELECT id FROM health_turns WHERE id=? AND owner=? AND run_id=? AND status='done'", (p['turn'],user['id'],run)).fetchone()
        if not found:
            raise InquiryError('검토할 AI 대화를 찾을 수 없어요.')
        p = {**p, 'reason':text(p['reason'], 500)}
        s['decisions'][p['turn']] = {'choice':p['choice'], 'reason':p['reason']}
        title, response = 'AI 제안을 검토한 판단', {'accept':'받아들임','revise':'고쳐서 사용','reject':'반박','hold':'보류'}[p['choice']]+' / '+p['reason']
    elif op == 'trial' and set(p) == {'scenario','channels','detour','update','prediction'}:
        scenario = next((x for x in c.get('experiments',[]) if x['id'] == p['scenario']), None)
        allowed = {x['id'] for x in c.get('channels',[])}
        if not scenario or not isinstance(p['channels'],list) or len(p['channels']) > 4 or any(not isinstance(x,str) or x not in allowed for x in p['channels']) or type(p['detour']) is not bool or type(p['update']) is not bool:
            raise InquiryError('시험할 마을의 조건과 안내 방법을 골라 주세요.')
        p = {**p, 'channels':list(dict.fromkeys(p['channels'])), 'prediction':text(p['prediction'],500)}
        outcomes = []
        for audience in scenario['audiences']:
            reached = bool(set(audience['channels']) & set(p['channels']))
            outcomes.append({'name':audience['name'], 'reached':reached,
                             'route':not audience['needsDetour'] or (reached and p['detour']),
                             'needsDetour':audience['needsDetour'], 'nextUpdate':reached and p['update']})
        p = {**p, 'outcomes':outcomes, 'at':time.time(), 'principle':s['notes'].get('principle',''),
             'plan':{k:s['notes'].get(k,'') for k in ('action','support','trigger')}}
        s.setdefault('trials',[]).append(p)
        title = '능동적 실험 / 조건을 바꿔 대응안 시험'
        response = scenario['title']+'\n예상: '+p['prediction']+'\n'+'\n'.join(o['name']+': '+('안내 도착' if o['reached'] else '안내 미도착')+' / '+('다음 소식 확인 가능' if o['nextUpdate'] else '다음 소식 안내 필요') for o in outcomes)
    elif op == 'finish' and not p:
        if not all(s['notes'].get(k) for k in ('question','claim','alternative','action','warning','reflection','transfer')) or not s['requests'] or 'update' not in s['opened']:
            raise InquiryError('조사 질문, 두 설명, 자료 요청, 대응, 안내문, 새 소식과 돌아본 생각을 수첩에 남겨 주세요.')
        if not any(v['afterUpdate'] for v in s['warningVersions']):
            raise InquiryError('새 소식을 본 뒤 방송실에서 안내문을 다시 확인하고 저장해 주세요. 그대로 유지해도 좋아요.')
        if c.get('cycle'):
            if not all(s['notes'].get(k) for k in ('principle','experimentReflection')):
                raise InquiryError('사건 지도실에서 나의 원리를, 대응 회의실에서 시험 결과를 돌아본 생각을 남겨 주세요.')
            conditions = {(t['scenario'],tuple(sorted(t['channels'])),t['detour'],t['update']) for t in s.get('trials',[])}
            if len(conditions) < 2:
                raise InquiryError('대응 회의실에서 마을 조건이나 안내 방법을 바꾸어 시험하고 두 결과를 비교해 주세요. 처음부터 잘 전달되어도 다른 조건에서 확인할 수 있어요.')
        s['submitted'] = True
        title, response = '공동 탐구 기록 제출', s['notes']['reflection']+'\n우리 학교에 적용: '+s['notes']['transfer']
    else:
        raise InquiryError('탐구할 장소와 자료를 다시 확인해 주세요.')
    # Bound a run without silently throwing away original versions.
    if len(encoded(s)) > 180000:
        raise InquiryError('이 회차의 수첩이 가득 찼어요. 기록을 내려받고 선생님과 다음 탐구를 시작해 주세요.')
    count = db.execute('UPDATE health_runs SET revision=revision+1,payload=?,updated=? WHERE owner=? AND run_id=? AND revision=?',
                       (encoded(s),time.time(),user['id'],run,row['revision'])).rowcount
    if count != 1:
        raise InquiryError('다른 기기의 기록이 도착했어요. 최신 기록을 읽은 뒤 다시 저장해 주세요.', 409)
    db.execute('INSERT INTO health_actions VALUES(?,?,?,?)', (action_id,user['id'],run,digest))
    if title:
        phase = next((x['title'] for x in c.get('cycle',[]) if p.get('room',s['room']) in x['rooms']), '')
        record(db,user,run,action_id,op,title,response,{'answer':p,'learningPhase':'능동적 실험' if op == 'trial' else phase},c)
    return view(db,user,run)
