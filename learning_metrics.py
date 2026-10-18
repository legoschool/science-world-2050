"""Measured active interaction intervals and teacher-only learning aggregates.

Old event timestamps are never converted to elapsed participation time. A pulse
credits only a bounded interval between consecutive live requests from one tab.
Original events and teacher reviews are read, never rewritten.
"""
import json
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCHEMA = [
    'CREATE TABLE IF NOT EXISTS activity_cursors(owner TEXT PRIMARY KEY,session_id TEXT NOT NULL,sequence INTEGER NOT NULL,last_seen DOUBLE PRECISION NOT NULL,run_id TEXT NOT NULL,game_id TEXT NOT NULL,task_id TEXT NOT NULL,active INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS activity_intervals(id TEXT PRIMARY KEY,owner TEXT NOT NULL,class_id TEXT NOT NULL,run_id TEXT NOT NULL,game_id TEXT NOT NULL,task_id TEXT NOT NULL,started DOUBLE PRECISION NOT NULL,ended DOUBLE PRECISION NOT NULL,active_ms INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS activity_intervals_class_time ON activity_intervals(class_id,ended)',
    'CREATE TABLE IF NOT EXISTS activity_errors(id TEXT PRIMARY KEY,owner TEXT NOT NULL,class_id TEXT NOT NULL,run_id TEXT NOT NULL,game_id TEXT NOT NULL,task_id TEXT NOT NULL,code TEXT NOT NULL,operation TEXT NOT NULL,status INTEGER NOT NULL,received DOUBLE PRECISION NOT NULL)',
    'CREATE INDEX IF NOT EXISTS activity_errors_class_time ON activity_errors(class_id,received)',
]
KST = timezone(timedelta(hours=9))
ERROR_MESSAGES = {'save_failed':'기록 저장 요청 실패', 'activity_failed':'활동 확인 요청 실패', 'load_failed':'자료 불러오기 실패', 'script_error':'화면 실행 오류', 'student_report':'학생이 보낸 오류 제보', 'content_version':'제출 당시 문항 확인 필요'}
OPERATIONS = {'state','events','mission-check','writeup-check','discovery-check','answer-check','mission','writeup','discovery','other'}
ROOT=Path(__file__).resolve().parent
REGION_PREFIX={'R1':'farm','R2':'fire','R3':'power','R4':'future','R5':'life'}
PACE_KINDS=('pace.chosen','pace.entered','competency.checked','daily.answered') # 길 고르기와 역량 점검은 의뢰 응답 집계에 넣지 않는다
PACE_LABELS={'story':'이야기 모두 보기','quick':'빠르게 문제만'}
CUSTOM_MAPS={'power-lab':('R3-G04',None),'g05-intro':('R3-G05','intro'),'motor-workshop':('R3-G05','motor'),'buzzer-workshop':('R3-G05','buzzer'),'deduction-workshop':('R3-G05','deduction'),'application-workshop':('R3-G05','application'),'workshop-summary':('R3-G05','closure'),'magnet-workshop':('R3-G06',None),'crane-workshop':('R3-G07',None)}

def data_json(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))

def objective_task(task):
    if task.get('diagnostic'):return False
    kind=task.get('type')
    if kind in {'text','report'}:return bool(task.get('answerRule') or task.get('answerRules'))
    if kind=='form':return any(f.get('answerRule') for f in task.get('fields',[]))
    if kind=='plan':return False
    if kind=='quiz':return any(p.get('key') is not None for p in task.get('parts',[]))
    if kind in {'multi','find','action'}:return task.get('keys') is not None
    if kind=='number' and task.get('fields'):return all(f.get('key') is not None for f in task['fields'])
    if kind=='signal':return bool(task.get('rule'))
    return task.get('key') is not None

def stage_catalog(catalog):
    """All current learning screens, including screens with no responses yet."""
    out={}
    def add(gid,tid,title,graded=False,optional=False):out[(gid,tid)]={'gameId':gid,'id':tid,'title':title,'graded':bool(graded),'optional':bool(optional)}
    add('WORLD','hub','중앙 학교 광장',False,True)
    for region,r in data_json('public/regions.json').items():
        add('WORLD',region,r['title'],False,True)
        for z in r['zones']:add('WORLD',z['id'],z['title'],False,True)
    for gid,m in catalog.items():
        for t in m.get('tasks',[]):add(gid,t['id'],t['title'],objective_task(t),t.get('optional') or t.get('required') is False)
        if m.get('inquiry'):
            for tid,title,graded in [('DISCOVERY.explore','자기 방법으로 탐색',False),('DISCOVERY.reflect','관찰 비교와 정리',False),('DISCOVERY.transfer','새 조건에 적용',True)]:add(gid,tid,title,graded)
        if m.get('transfer'):add(gid,'transfer','새 조건에 적용',True,True)
    for gid in data_json('data/writeup.json'):
        if gid in catalog:add(gid,'WRITEUP','내 말로 설명하기',True)
    custom=data_json('data/answers-custom.json')
    for gid in ['R3-G04','R3-G07']:
        if gid not in catalog:continue
        for i,t in enumerate(custom[gid]['steps']):add(gid,'T'+str(i+1).zfill(2),t['title'],i not in ({0,3} if gid=='R3-G04' else {0,1,7}))
    for gid,rows in {
        'R3-G05':[('intro','조사할 것 정하기',False),('motor','전동기 관찰',True),('buzzer','버저 관찰',True),('deduction','가린 회로 추리와 조건 확인',True),('application','목적에 맞는 연결',True),('closure','관찰 근거로 마지막 설명',True)],
        'R3-G06':[('intro','자석 경험과 원인 후보',False),('materials','재료와 역할',True),('build','전자석 만들기와 스위치 관찰',True),('repair','고장 찾아 고치기',True),('meaning','전자석 원리 정리',True),('closure','제작 카드로 마지막 설명',True)],
    }.items():
        if gid in catalog:
            for tid,title,graded in rows:add(gid,tid,title,graded)
    return out

def text(value, label, limit=80):
    if not isinstance(value, str) or not value or len(value)>limit or any(ord(ch)<32 for ch in value):
        raise ValueError(label+'을 확인해 주세요.')
    return value

def context(d, catalog):
    run = text(d.get('runId'), '회차')
    game = d.get('gameId')
    if game != 'WORLD' and game not in catalog:raise ValueError('활동 장소를 확인해 주세요.')
    task = text(d.get('taskId'), '활동 단계')
    if not re.fullmatch(r'[A-Za-z0-9_.:-]{1,80}',task):raise ValueError('활동 단계를 확인해 주세요.')
    return run,game,task

def eligible(u):
    if u['role'] != 'student' or u.get('guest') or u.get('test'):
        raise PermissionError('학생 학습 계정에서만 기록할 수 있습니다.')

def pulse(c,u,d,catalog,now=None):
    eligible(u)
    if set(d)!={'sessionId','sequence','runId','gameId','taskId','active','activeMs'}:raise ValueError('활동 시간 형식을 확인해 주세요.')
    session=text(d['sessionId'],'활동 연결'); seq=d['sequence']; active=d['active']; ms=d['activeMs']
    if type(seq)is not int or not 0<=seq<=2147483647 or type(active)is not bool or type(ms)is not int or not 0<=ms<=15000:raise ValueError('활동 시간을 확인해 주세요.')
    run,game,task=context(d,catalog); now=time.time() if now is None else now
    old=c.execute('SELECT * FROM activity_cursors WHERE owner=?',(u['id'],)).fetchone()
    credited=0
    if old:
        gap=now-old['last_seen']
        if old['session_id']==session and seq<=old['sequence']:return {'acceptedMs':0,'duplicate':True}
        if old['session_id']!=session and old['active'] and gap<20:return {'acceptedMs':0,'competing':True}
        same=old['session_id']==session and (old['run_id'],old['game_id'],old['task_id'])==(run,game,task)
        # The stop packet carries the last measured part of a short stage.
        # An inactive cursor can never start earning without a new handshake.
        if same and old['active'] and 0<gap<=20:credited=min(ms,round(gap*1000),15000)
        changed=c.execute('UPDATE activity_cursors SET session_id=?,sequence=?,last_seen=?,run_id=?,game_id=?,task_id=?,active=? WHERE owner=? AND session_id=? AND sequence=? AND last_seen=?',
            (session,seq,now,run,game,task,int(active),u['id'],old['session_id'],old['sequence'],old['last_seen'])).rowcount
        if changed!=1:return {'acceptedMs':0,'competing':True}
    else:
        changed=c.execute('INSERT INTO activity_cursors VALUES(?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',(u['id'],session,seq,now,run,game,task,int(active))).rowcount
        if changed!=1:return {'acceptedMs':0,'competing':True}
    if credited>0:
        c.execute('INSERT INTO activity_intervals VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',
            (u['id']+':'+session+':'+str(seq),u['id'],u['class_id'],run,game,task,now-credited/1000,now,credited))
    return {'acceptedMs':credited}

def error(c,u,d,catalog,now=None):
    eligible(u)
    if set(d)-{'id','runId','gameId','taskId','code','operation','status'}:raise ValueError('오류 기록 형식을 확인해 주세요.')
    eid=text(d.get('id'),'오류 기록'); run,game,task=context(d,catalog)
    code=d.get('code'); op=d.get('operation'); status=d.get('status',0)
    if code not in {'save_failed','activity_failed','load_failed','script_error'} or op not in OPERATIONS or type(status)is not int or not 0<=status<=599:raise ValueError('오류 항목을 확인해 주세요.')
    now=time.time() if now is None else now
    # A repeating failure must not flood the teacher's view or storage.
    old=c.execute('SELECT id FROM activity_errors WHERE owner=? AND code=? AND operation=? AND received>?',(u['id'],code,op,now-30)).fetchone()
    if old:return {'saved':False,'duplicate':True}
    c.execute('INSERT INTO activity_errors VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',(u['id']+':'+eid,u['id'],u['class_id'],run,game,task,code,op,status,now))
    return {'saved':True}

def safe_json(raw):
    try:
        p=json.loads(raw)
        return p if isinstance(p,dict) else {}
    except (TypeError,ValueError):return {}

def obj(value):return value if isinstance(value,dict) else {}

def step_number(value,maximum):
    return min(max(value,0),maximum) if type(value)is int else 0

def date_range(q,now):
    today=datetime.fromtimestamp(now,KST).date()
    try:
        start=datetime.strptime(q.get('from') or (today-timedelta(days=29)).isoformat(),'%Y-%m-%d').replace(tzinfo=KST)
        end=datetime.strptime(q.get('to') or today.isoformat(),'%Y-%m-%d').replace(tzinfo=KST)
    except (TypeError,ValueError):raise ValueError('조회 날짜를 확인해 주세요.')
    if end<start or (end-start).days>365:raise ValueError('조회 기간은 366일 이내로 선택해 주세요.')
    return start.timestamp(),(end+timedelta(days=1)).timestamp(),{'from':start.date().isoformat(),'to':end.date().isoformat(),'basis':'received','timezone':'Asia/Seoul'}

def task_key(gid,tid):
    tid=str(tid or 'GENERAL')
    tid=tid[len(gid)+1:] if tid.startswith(gid+'.') else tid
    if tid=='writeup':return 'WRITEUP'
    if tid in {'discovery:writeup','DISCOVERY.writeup'}:return 'WRITEUP'
    if tid.startswith('discovery:'):return 'DISCOVERY.'+tid.split(':',1)[1]
    if tid=='CLOSURE' and gid in {'R3-G05','R3-G06'}:return 'closure'
    if tid=='CLOSURE' and gid=='R3-G07':return 'T10'
    if tid=='TRANSFER':return 'transfer'
    return tid

def event_stage(kind,p,fallback):
    gid=p.get('gameId') or 'WORLD';tid=task_key(gid,p.get('taskId') or fallback)
    if kind.startswith('discovery.'):
        phase={'predicted':'explore','trial':'explore','reflection':'reflect','transfer':'transfer','support':'reflect' if p.get('answer')=='explain' else 'explore'}.get(kind.split('.')[-1])
        if phase:tid='DISCOVERY.'+phase
    if gid=='R3-G04' and not kind.startswith('mission.'):
        groups={'entry.submitted':'T01','comparison.marked':'T02','comparison.submitted':'T02','conditions.committed':'T02','controls.committed':'T02','connection.committed':'T03','assembly.changed':'T03','vocabulary.submitted':'T03','prediction.submitted':'T04','experiment.run':'T05','result.recorded':'T05','observation.table_submitted':'T06','explanation.submitted':'T06','followup.submitted':'T07','transfer.position_submitted':'T07','fault.inspected':'T08','fault.repaired':'T08','proposal.submitted':'T08'}
        tid=groups.get(kind,tid)
    if gid in {'R3-G05','R3-G06'} and not kind.startswith('mission.'):
        prefix=kind.split('.')[0]
        aliases={'inquiry':'intro','magnetIntro':'intro','magnetMaterials':'materials','magnet':'build','magnetRepair':'repair','magnetMeaning':'meaning','motor':'motor','buzzer':'buzzer','deduction':'deduction','application':'application'}
        tid=aliases.get(prefix,tid)
        if kind in {'answer.submitted','workshop.completed','magnet.completed'}:tid='closure'
    return tid

def stage_title(catalog,gid,tid):
    key=task_key(gid,tid)
    for suffix,label in [('.PREDICT','처음 예상'),('.REFLECT','생각 돌아보기')]:
        if key.endswith(suffix):return stage_title(catalog,gid,key[:-len(suffix)])+' / '+label
    titles={'GENERAL':'활동 기록','CLOSURE':'마지막 설명','closure':'마지막 설명','WRITEUP':'내 말로 설명하기','DISCOVERY.predict':'처음 예상','DISCOVERY.explore':'자기 방법으로 탐색','DISCOVERY.reflect':'관찰 비교와 정리','DISCOVERY.reflection':'관찰 비교와 정리','DISCOVERY.writeup':'내 말로 설명하기','DISCOVERY.transfer':'새 조건에 적용','INTRO':'의뢰 만나기','intro':'의뢰 만나기','FINISH':'의뢰 마무리','hub':'중앙 학교 광장','farm':'계절 들판','fire':'불빛 항구','power':'전력망 마을','future':'미래 도시','life':'푸른 생활 지구','motor':'전동기 관찰','buzzer':'버저 관찰','deduction':'관찰 비교와 추리','application':'목적에 맞는 연결','materials':'재료와 역할','repair':'고장 찾아 고치기','build':'전자석 만들기','meaning':'전자석 원리 정리'}
    return next((t['title'] for t in catalog.get(gid,{}).get('tasks',[]) if t['id']==key),titles.get(key,'마을 탐험' if gid=='WORLD' else '활동 단계'))

def is_response(kind,p):
    # Completion repeats a successful answer and must not improve accuracy twice.
    if kind.endswith(('.completed','.hint')) or kind in {'hint.opened'} or kind.startswith('resource.'):return False
    if type(p.get('correct')) is bool:return True
    return kind.endswith(('.submitted','.answered','.unverified','.predicted','.reflected','.reflection','.transfer','.recalled','.suspected','.question'))

def grade_value(c,kind,p,catalog,editions):
    value=p.get('correct')
    if type(value)is not bool:return None
    if p.get('evaluation') in {'version_unavailable','diagnostic','diagnostic_only','ungraded','not_assessed','skipped'} or kind.endswith(('.predicted','.suspected','.recalled')) or kind=='prediction.submitted':return None
    if kind=='writeup.submitted':return value if p.get('evaluation')=='core_keywords' else None
    if kind=='mission.answered':
        revision=p.get('contentRevision');gid=p.get('gameId')
        if revision and revision not in editions:
            row=c.execute('SELECT payload FROM mission_editions WHERE revision=? AND game_id=?',(revision,gid)).fetchone()
            editions[revision]=safe_json(row['payload']) if row else None
        mission=editions.get(revision) if revision else catalog.get(gid)
        task=next((t for t in (mission or {}).get('tasks',[]) if t['id']==task_key(gid,p.get('taskId'))),None)
        if not task or task.get('diagnostic'):return None
        kind=task.get('type')
        if kind in {'text','form'}:return value if p.get('evaluation')=='core_keywords' else None
        if kind=='choice' and task.get('key') is None:return None
        if kind=='multi' and task.get('keys') is None:return None
        if kind=='action' and task.get('keys') is None:return None
        if kind=='quiz' and not any(part.get('key') is not None for part in task.get('parts',[])):return None
        if kind in {'sort','order','fill','grid','chain','number'} and task.get('key') is None and not (kind=='number' and task.get('fields') and all(f.get('key') is not None for f in task['fields'])):return None
        if kind=='find' and task.get('keys') is None:return None
        if kind=='plan':return None # Personal action plans are teacher-reviewed.
        if kind=='report':return value if p.get('evaluation')=='core_keywords' else None
    return value

def aggregate():
    return {'attempts':0,'correct':0,'graded':0,'incorrect':0,'ungraded':0,'activeSeconds':None,'timeSamples':0,'technicalErrors':0,'learningErrors':0,'eventCount':0,'firstAttempts':0,'firstCorrect':0,'_active':set(),'_time':set(),'_first':set(),'_answered':set(),'_graded':set()}

def finish(a,pop):
    result={k:v for k,v in a.items() if not k.startswith('_')}
    result.update(students=len(pop),activeStudents=len(a['_active']),timeStudents=len(a['_time']),answeredStudents=len(a['_answered']),unansweredStudents=len(set(pop)-a['_answered']),gradedStudents=len(a['_graded']),accuracy=round(100*a['correct']/a['graded'],1) if a['graded'] else None,firstAccuracy=round(100*a['firstCorrect']/a['firstAttempts'],1) if a['firstAttempts'] else None)
    if result['activeSeconds'] is not None:result['activeSeconds']=round(result['activeSeconds'],1)
    return result

def current_snapshots(c,people,catalog,specs,now):
    """Current evidence is separate from the historical report filters.

    A saved checkpoint has no timestamp. It supplies saved progress only; its
    existence, an unexpired login cookie, and event gaps never establish online
    presence or elapsed time.
    """
    ids={p['id'] for p in people};classes=sorted({p['class_id'] for p in people})
    if not classes:return {}
    marks=','.join('?' for _ in classes)
    def scoped(table):
        return {r['owner']:dict(r) for r in c.execute('SELECT x.* FROM '+table+' x JOIN accounts a ON a.id=x.owner WHERE a.class_id IN ('+marks+')',tuple(classes)) if r['owner'] in ids}
    checkpoints=scoped('checkpoints');cursors=scoped('activity_cursors');presence=scoped('presence')
    last_events={r['owner']:r['last_seen'] for r in c.execute('SELECT e.owner,MAX(e.received) AS last_seen FROM events e JOIN accounts a ON a.id=e.owner WHERE a.class_id IN ('+marks+') GROUP BY e.owner',tuple(classes)) if r['owner'] in ids}
    last_errors={r['owner']:r['last_seen'] for r in c.execute('SELECT e.owner,MAX(e.received) AS last_seen FROM activity_errors e JOIN accounts a ON a.id=e.owner WHERE a.class_id IN ('+marks+') GROUP BY e.owner',tuple(classes)) if r['owner'] in ids}
    # 의뢰별로 들어간 길(빠르게 문제만, 이야기 모두 보기). 같은 회차 기록만 본다.
    paces={}
    for r in c.execute("SELECT e.owner,e.payload FROM events e JOIN accounts a ON a.id=e.owner WHERE a.class_id IN ("+marks+") AND e.kind='pace.entered' ORDER BY e.received,e.id",tuple(classes)):
        if r['owner'] in ids:paces.setdefault(r['owner'],[]).append(safe_json(r['payload']))
    regions=data_json('public/regions.json');map_titles={'hub':'중앙 학교 광장','quick':'의뢰 고르기 판'}
    for region,r in regions.items():
        map_titles[region]=r['title']
        for z in r['zones']:map_titles[z['id']]=z['title']
    result={}
    def title(gid,tid):return specs.get((gid,tid),{}).get('title') or stage_title(catalog,gid,tid)
    def saved_location(state):
        place=obj(state.get('travel')).get('map');place=place if isinstance(place,str) else None;gid='WORLD';tid=place
        if isinstance(place,str) and place.startswith('mission:') and place[8:] in catalog:
            gid=place[8:];m=catalog[gid];ms=obj(obj(state.get('missions')).get(gid));discovery=obj(ms.get('discovery'))
            if m.get('inquiry') and not ms.get('completed') and not discovery.get('complete'):tid=task_key(gid,'discovery:'+str(discovery.get('phase') or 'explore'))
            else:tid=next((t['id'] for t in m.get('tasks',[]) if not t.get('optional') and t.get('required') is not False and not obj(ms.get('done')).get(t['id'])), 'FINISH')
        elif place in CUSTOM_MAPS:
            gid,tid=CUSTOM_MAPS[place]
            if gid=='R3-G04':tid='T'+str(step_number(state.get('step'),7)+1).zfill(2)
            if gid=='R3-G06':tid='build' # Subpanels are known only from a live cursor.
            if gid=='R3-G07':tid='T'+str(step_number(obj(state.get('crane')).get('step'),9)+1).zfill(2)
        return gid,tid,place
    for sid in ids:
        state=safe_json(checkpoints.get(sid,{}).get('state'));adv=obj(state.get('adventure'));run=state.get('runId')
        region=adv.get('selectedRegion') if adv.get('selectedRegion') in regions else None
        # Fresh saves contain a default mission before the child chooses a path.
        # That default is not evidence of an accepted or ongoing request.
        awaiting_region=adv.get('welcomed') is False and region is None
        tracked=adv.get('tracked') if not awaiting_region and adv.get('tracked') in catalog else None
        gid,tid,place=saved_location(state);source='checkpoint' if state else 'none';observed=None
        cursor=cursors.get(sid);pr=presence.get(sid)
        same_run=bool(cursor and (not run or cursor['run_id']==run))
        fresh_cursor=same_run and 0<=now-cursor['last_seen']<=20
        fresh_presence=bool(pr and 0<=now-pr['updated']<=12)
        if fresh_cursor:
            gid=cursor['game_id'];tid=task_key(gid,cursor['task_id']);source='activity_cursor';observed=cursor['last_seen']
        if fresh_presence and (not fresh_cursor or pr['updated']>cursor['last_seen']):
            place=pr['map'];gid,tid,_=saved_location({'travel':{'map':place}});source='presence';observed=pr['updated']
        elif not state and same_run:
            gid=cursor['game_id'];tid=task_key(gid,cursor['task_id']);source='last_activity_cursor';observed=cursor['last_seen']
        elif not state and pr:
            place=pr['map'];gid,tid,_=saved_location({'travel':{'map':place}});source='last_presence';observed=pr['updated']
        seen=[v for v in [last_events.get(sid),last_errors.get(sid),(cursor or {}).get('last_seen'),(pr or {}).get('updated')] if isinstance(v,(int,float)) and v<=now]
        last_seen=max(seen) if seen else None
        active=bool(fresh_cursor and cursor['active']);online=bool(fresh_cursor or fresh_presence)
        status='active' if active else 'idle' if online else 'offline' if last_seen is not None else 'unknown'
        label={'active':'활동 신호 확인','idle':'최근 접속 확인','offline':'최근 접속 미확인','unknown':'저장된 진행만 있음' if state else '시작 기록 없음'}[status]
        current_region=REGION_PREFIX.get(str(gid)[:2]) if gid!='WORLD' else str(place or tid or '').split('-')[0]
        current_region_title=regions.get(current_region,{}).get('title') or ('중앙 학교 광장' if place=='hub' or tid=='hub' else None)
        tracked_ms=obj(obj(state.get('missions')).get(tracked))
        required=[t for t in catalog.get(tracked,{}).get('tasks',[]) if not t.get('optional') and t.get('required') is not False]
        completed=sum(obj(tracked_ms.get('done')).get(t['id']) is True for t in required)
        current={'regionTitle':current_region_title,'gameTitle':catalog.get(gid,{}).get('title') if gid!='WORLD' else '마을 탐험' if tid else None,'taskTitle':title(gid,tid) if gid!='WORLD' and tid else map_titles.get(place or tid),'lastSeen':last_seen,'status':status,'statusLabel':label,'online':online,'active':active,'observedAt':observed,'source':source,'locationTitle':map_titles.get(place),'basis':'latest_evidence','lastLoginAt':None}
        progress={'selectedRegion':region,'selectedRegionTitle':regions.get(region,{}).get('title'),'trackedGameId':tracked,'trackedGameTitle':catalog.get(tracked,{}).get('title'),'currentGameId':gid if tid else None,'currentTaskId':tid,'runId':run,'completedRequired':completed if required else None,'totalRequired':len(required) if required else None,'countBasis':'tracked_saved_required','source':source,'lastSavedAt':None}
        chosen=adv.get('pace') if adv.get('pace') in PACE_LABELS else None;by_game={}
        for p in paces.get(sid,[]):
            gid_p=p.get('gameId')
            if gid_p in catalog and p.get('answer') in PACE_LABELS and (not run or p.get('runId')==run):
                got=by_game.setdefault(gid_p,[])
                if p['answer'] not in got:got.append(p['answer'])
        pace={'current':chosen,'currentLabel':PACE_LABELS.get(chosen),'missions':[{'gameId':g,'title':catalog[g].get('title',g),'paces':v,'labels':[PACE_LABELS[x] for x in v]} for g,v in sorted(by_game.items())]}
        result[sid]={'pace':pace,'current':current,'currentStatus':{'status':status,'label':label,'online':online,'active':active,'lastSeen':last_seen,'source':source},'progress':progress}
    return result

def dashboard(c,u,q,catalog,test_number,guest_class,now=None):
    if u['role'] not in {'teacher','admin'}:raise PermissionError('교사만 학습 현황을 볼 수 있습니다.')
    if set(q)-{'classId','gameId','taskId','student','from','to','runId'}:raise ValueError('조회 조건을 확인해 주세요.')
    classes=[dict(r) for r in c.execute('SELECT id,name FROM classes WHERE id<>? ORDER BY grade,room',(guest_class,))]
    if u['role']=='teacher':classes=[cl for cl in classes if cl['id']==u['class_id']]
    allowed={cl['id'] for cl in classes}; cid=q.get('classId')
    if cid and cid not in allowed:raise PermissionError('이 학급에 접근할 수 없습니다.')
    selected={cid} if cid else allowed
    people=[dict(r) for r in c.execute("SELECT id,nickname,number,class_id FROM accounts WHERE role='student' AND number<>? AND COALESCE(active,1)<>0 ORDER BY class_id,number",(test_number,)) if r['class_id'] in allowed and not r['id'].startswith('guest-')]
    by_id={p['id']:p for p in people}; student=q.get('student'); game=q.get('gameId'); run=q.get('runId');task_filter=q.get('taskId')
    if student and (student not in by_id or by_id[student]['class_id'] not in selected):raise PermissionError('이 학생 기록에 접근할 수 없습니다.')
    if game and game not in catalog and game!='WORLD':raise ValueError('활동 장소를 확인해 주세요.')
    if task_filter:
        if not game or not re.fullmatch(r'[A-Za-z0-9_.:-]{1,80}',task_filter):raise ValueError('활동과 단계를 함께 선택해 주세요.')
        task_filter=task_key(game,task_filter)
    if run:text(run,'회차')
    now=time.time() if now is None else now
    lo,hi,range_info=date_range(q,now)
    selected_people={p['id'] for p in people if p['class_id'] in selected and (not student or p['id']==student)}
    specs=stage_catalog(catalog)
    shown_games=[g for g in ['WORLD',*catalog] if not game or g==game]
    shown_stages={key:spec for key,spec in specs.items() if (not game or key[0]==game) and (not task_filter or key[1]==task_filter)}
    summary=aggregate(); class_rows={cl['id']:aggregate() for cl in classes}; student_rows={sid:aggregate() for sid in selected_people}; activity_rows={gid:aggregate() for gid in shown_games}; stage_rows={key:aggregate() for key in shown_stages}; errors=[]; runs={}; editions={}
    class_activities={(cl['id'],gid):aggregate() for cl in classes for gid in shown_games}
    class_stages={(cl['id'],gid,tid):aggregate() for cl in classes for gid,tid in shown_stages} if game else {}
    def accept(owner,p,tid):return owner in by_id and (not game or p.get('gameId')==game) and (not run or p.get('runId')==run) and (not task_filter or tid==task_filter)
    def add_run(owner,p,tid,at):
        if owner in selected_people and p.get('runId') and (not game or p.get('gameId')==game) and (not task_filter or tid==task_filter):
            key=(owner,p['runId']);runs[key]=min(runs.get(key,at),at)
    def buckets(owner,gid,tid):
        class_id=by_id[owner]['class_id']
        rows=[class_rows[class_id],class_activities.setdefault((class_id,gid),aggregate())]
        if game:rows.append(class_stages.setdefault((class_id,gid,tid),aggregate()))
        if owner in selected_people:
            rows += [summary,student_rows[owner],activity_rows.setdefault(gid,aggregate()),stage_rows.setdefault((gid,tid),aggregate())]
        return rows
    def record_error(e,code,message,kind='technical'):
        owner=e['owner'];p=e['p'];gid=p.get('gameId') or 'WORLD';tid=task_key(gid,p.get('taskId'))
        for a in buckets(owner,gid,tid):
            if kind=='technical':a['technicalErrors']+=1;a['_active'].add(owner)
        if owner in selected_people:
            person=by_id[owner]
            errors.append({'id':e['id'],'kind':kind,'code':code,'studentId':owner,'nickname':person['nickname'],'number':person['number'],'gameId':gid,'taskId':tid,'title':stage_title(catalog,gid,tid),'received':e['received'],'message':message})
    # Scope SQL before reading payloads; never fetch other teachers' classes.
    if allowed:
        placeholders=','.join('?' for _ in allowed); scope=tuple(sorted(allowed))
        records=c.execute('SELECT e.* FROM events e JOIN accounts a ON a.id=e.owner WHERE a.class_id IN ('+placeholders+') AND e.received>=? AND e.received<? ORDER BY e.received,e.id',(*scope,lo,hi)).fetchall()
        for e in records:
            p=safe_json(e['payload']); owner=e['owner']
            if e['kind'] in PACE_KINDS:continue # 고른 길 기록은 응답이나 참여 집계가 아니다(학생별 현재 진행의 pace에 따로 보인다)
            gid=p.get('gameId') or 'WORLD';tid=event_stage(e['kind'],p,e['task'])
            add_run(owner,p,tid,e['received'])
            if not accept(owner,p,tid):continue
            rows=buckets(owner,gid,tid)
            unavailable=p.get('evaluation')=='version_unavailable'; response=is_response(e['kind'],p)
            correct=grade_value(c,e['kind'],p,catalog,editions) if response else None
            for a in rows:
                a['eventCount']+=1;a['_active'].add(owner)
                if response:
                    a['attempts']+=1;a['_answered'].add(owner)
                    if type(correct)is bool:
                        a['graded']+=1;a['correct']+=int(correct);a['incorrect']+=int(not correct);a['learningErrors']+=int(not correct);a['_graded'].add(owner)
                        # The display may combine preparation and observation on
                        # one screen; their distinct graded questions keep their
                        # own first response. Repair cases and reversed battery
                        # conditions likewise remain separate questions.
                        first=(owner,p.get('runId',''),gid,str(p.get('taskId') or e['task']),e['kind'],str(p.get('caseId','')),str(p.get('battery','')))
                        if first not in a['_first']:a['_first'].add(first);a['firstAttempts']+=1;a['firstCorrect']+=int(correct)
                    else:a['ungraded']+=1
            if correct is False:record_error({'id':e['id'],'owner':owner,'received':e['received'],'p':{**p,'taskId':tid}},'incorrect','다시 확인한 학습 응답','learning')
            if unavailable:record_error({'id':e['id'],'owner':owner,'received':e['received'],'p':p},'content_version',ERROR_MESSAGES['content_version'])
        intervals=c.execute('SELECT * FROM activity_intervals WHERE class_id IN ('+placeholders+') AND ended>? AND started<? ORDER BY ended',(*scope,lo,hi)).fetchall()
        for r in intervals:
            p={'gameId':r['game_id'],'taskId':r['task_id'],'runId':r['run_id']};owner=r['owner']
            tid=task_key(r['game_id'],r['task_id']);add_run(owner,p,tid,r['started'])
            if not accept(owner,p,tid):continue
            duration=min(r['active_ms']/1000,max(0,min(r['ended'],hi)-max(r['started'],lo)))
            if not duration:continue
            for a in buckets(owner,r['game_id'],task_key(r['game_id'],r['task_id'])):
                a['activeSeconds']=(a['activeSeconds'] or 0)+duration;a['timeSamples']+=1;a['_time'].add(owner);a['_active'].add(owner)
        for r in c.execute('SELECT * FROM activity_errors WHERE class_id IN ('+placeholders+') AND received>=? AND received<? ORDER BY received',(*scope,lo,hi)):
            p={'gameId':r['game_id'],'taskId':r['task_id'],'runId':r['run_id']}
            tid=task_key(r['game_id'],r['task_id']);add_run(r['owner'],p,tid,r['received'])
            if accept(r['owner'],p,tid):record_error({'id':r['id'],'owner':r['owner'],'received':r['received'],'p':p},r['code'],ERROR_MESSAGES[r['code']])
        for r in c.execute("SELECT * FROM reports WHERE class_id IN ("+placeholders+") AND kind='error' AND created>=? AND created<? ORDER BY created",(*scope,lo,hi)):
            p=safe_json(r['context'])
            if accept(r['owner'],p,task_key(p.get('gameId') or 'WORLD',p.get('taskId'))):record_error({'id':r['id'],'owner':r['owner'],'received':r['created'],'p':p},'student_report',str(r['body'])[:280])
    run_list=[]; run_numbers={}
    for (owner,rid),started in sorted(runs.items(),key=lambda it:it[1]):
        number=run_numbers.get(owner,0)+1;run_numbers[owner]=number
        run_list.append({'id':rid,'number':number,'started':started,'studentId':owner,'nickname':by_id[owner]['nickname'],'label':'기간 내 '+str(number)+'번째 / '+by_id[owner]['nickname']+' / '+datetime.fromtimestamp(started,KST).strftime('%m-%d %H:%M')})
    snapshots=current_snapshots(c,[p for p in people if p['id'] in selected_people],catalog,specs,now)
    class_names={cl['id']:cl['name'] for cl in classes}
    populations={cl['id']:{p['id'] for p in people if p['class_id']==cl['id']} for cl in classes}
    def game_title(gid):return catalog.get(gid,{}).get('title','마을 탐험')
    def stage_info(gid,tid):
        spec=specs.get((gid,tid))
        return {'title':spec['title'] if spec else stage_title(catalog,gid,tid),'gradedTask':spec['graded'] if spec else None,'optional':spec['optional'] if spec else None,'catalogued':spec is not None}
    return {'filters':{'classes':classes,'missions':[{'id':'WORLD','title':'마을 탐험'}]+[{'id':gid,'title':m['title']} for gid,m in catalog.items()], 'students':[{'id':p['id'],'nickname':p['nickname'],'number':p['number'],'classId':p['class_id']} for p in people], 'runs':run_list,'tasks':[spec for (gid,tid),spec in specs.items() if not game or gid==game]},
        'currentAsOf':now,'definitions':{'accuracy':'correct / graded','firstAccuracy':'조회 기간과 회차 안에서 문항별 첫 채점 응답의 firstCorrect / firstAttempts. 같은 화면의 다른 채점 항목과 실험 조건은 구분','answeredStudents':'조회 기간과 활동 범위에서 응답을 한 번 이상 제출한 학생 수','unansweredStudents':'선택한 명부 학생 중 해당 범위에 응답 제출 기록이 없는 학생 수. 오답 수에 포함하지 않음','current':'날짜와 회차 필터와 별개인 최근 서버 확인 및 저장된 진행. checkpoint는 저장된 진행 기준의 다음 필수 단계이며 지금 열린 화면을 확정하지 않음. 로그인 시각은 미수집','classStages':'학습 활동을 선택하면 해당 활동의 모든 단계와 학반을 비교'},
        'range':range_info,'comparison':{'ignoresStudentFilter':True,'ignoresClassFilter':True},'summary':finish(summary,selected_people),
        'classes':[{'classId':cl['id'],'name':cl['name'],**finish(class_rows[cl['id']],{p['id'] for p in people if p['class_id']==cl['id']})} for cl in classes],
        'students':[{'id':sid,'nickname':by_id[sid]['nickname'],'number':by_id[sid]['number'],'classId':by_id[sid]['class_id'],**finish(a,{sid}),**snapshots[sid]} for sid,a in sorted(student_rows.items(),key=lambda it:(by_id[it[0]]['class_id'],by_id[it[0]]['number']))],
        'activities':[{'gameId':gid,'title':game_title(gid),**finish(a,selected_people)} for gid,a in sorted(activity_rows.items())],
        'stages':[{'gameId':gid,'taskId':tid,**stage_info(gid,tid),**finish(a,selected_people)} for (gid,tid),a in sorted(stage_rows.items())],
        'classActivities':[{'classId':cid,'name':class_names[cid],'gameId':gid,'title':game_title(gid),**finish(a,populations[cid])} for (cid,gid),a in sorted(class_activities.items())],
        'classStages':[{'classId':cid,'name':class_names[cid],'gameId':gid,'taskId':tid,**stage_info(gid,tid),**finish(a,populations[cid])} for (cid,gid,tid),a in sorted(class_stages.items())],
        'errors':sorted(errors,key=lambda e:e['received'],reverse=True)[:100]}
