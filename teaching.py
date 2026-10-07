"""과제 원본 보존, 교사 확인, 장소별 학급 활동. 학생 기록은 덮어쓰지 않는다."""
import hashlib
import json
import secrets
import time

SCHEMA = [
    'CREATE TABLE IF NOT EXISTS mission_editions(revision TEXT PRIMARY KEY,game_id TEXT NOT NULL,version TEXT NOT NULL,payload TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS learning_activities(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS event_reviews(event_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS review_history(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,payload TEXT NOT NULL)',
]

def revision(m):
    return hashlib.sha256(json.dumps(m, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def archive(c, m):
    rev = revision(m)
    c.execute('INSERT INTO mission_editions VALUES(?,?,?,?) ON CONFLICT DO NOTHING',
              (rev, m['id'], m.get('version', '1'), json.dumps(m, ensure_ascii=False)))
    return rev

def resolve(c, catalog, gid, rev=None, version=None):
    if rev:
        row = c.execute('SELECT payload FROM mission_editions WHERE revision=? AND game_id=?', (rev, gid)).fetchone()
        return json.loads(row['payload']) if row else None
    m = catalog.get(gid)
    # 예전 앱은 모든 의뢰에 G04 버전을 보냈다. 이 응답은 새 답안으로 채점하지 않는다.
    if not version or (m and version == m.get('version', '1')):
        return m
    rows = c.execute('SELECT payload FROM mission_editions WHERE game_id=? AND version=?', (gid, version)).fetchall()
    return json.loads(rows[0]['payload']) if len(rows) == 1 else None

def response_text(task, p):
    """제출 당시 보기 문구로 표시 문자열을 보존한다. 원래 응답도 그대로 남긴다."""
    def label(items, value):
        if not isinstance(items, list):
            return value
        return next((str(x.get('label') or x.get('prompt') or x.get('title') or value) for x in items if isinstance(x, dict) and x.get('id') == value), value)
    a = p.get('answer', '')
    choices = task.get('options') or task.get('cards') or task.get('spots') or []
    parts = [label(choices, x) for x in a.split(',')] if a else []
    fields = task.get('parts') or task.get('blanks') or task.get('fields') or task.get('items') or task.get('rows') or []
    for key, value in p.get('roles', {}).items():
        f = next((f for f in fields if f.get('id') == key), {})
        options = f.get('options') or task.get('bins') or task.get('cols') or []
        parts.append(str(f.get('prompt') or f.get('label') or key) + ': ' + ', '.join(label(options, x) for x in value.split(',')))
    return ' / '.join(parts)

def scope(c, u, cid=None):
    if u['role'] == 'admin':
        if not cid or not c.execute('SELECT 1 FROM classes WHERE id=?', (cid,)).fetchone():
            raise ValueError('학급을 선택해 주세요.')
        return cid
    if cid and cid != u['class_id']:
        raise PermissionError('이 학급에 접근할 수 없습니다.')
    return u['class_id']

def attach_reviews(c, events):
    for e in events:
        row = c.execute('SELECT payload FROM event_reviews WHERE event_id=?', (e['id'],)).fetchone()
        e['teacherReview'] = json.loads(row['payload']) if row else None
    return events

def text(value, label, limit, required=True):
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise ValueError(label + '을 확인해 주세요.')
    return value.strip()

def get(c, u, q, catalog):
    cid = scope(c, u, q.get('classId'))
    staff = u['role'] in ('teacher', 'admin')
    activities = [json.loads(r['payload']) for r in c.execute('SELECT payload FROM learning_activities WHERE class_id=?', (cid,))]
    if not staff:
        activities = [a for a in activities if a['published']]
    if q.get('gameId'):
        activities = [a for a in activities if a['gameId'] == q['gameId']]
    owner = q.get('student') if staff else u['id']
    events = []
    if owner:
        events = [dict(r) for r in c.execute('SELECT e.* FROM events e JOIN accounts a ON a.id=e.owner WHERE a.class_id=? AND e.owner=? ORDER BY e.received', (cid, owner))]
        for e in events:
            e['payload'] = json.loads(e['payload'])
        if q.get('runId'):
            events = [e for e in events if e['payload'].get('runId') == q['runId']]
        if q.get('gameId'):
            events = [e for e in events if e['payload'].get('gameId') == q['gameId']]
        attach_reviews(c, events)
    students = [dict(r) for r in c.execute("SELECT id,number,nickname FROM accounts WHERE class_id=? AND role='student' ORDER BY number", (cid,))] if staff else []
    return {'activities': activities, 'events': events, 'students': students, 'staff': staff,
            'catalog': [{'id': m['id'], 'title': m['title'], 'place': m['place'], 'revision': revision(m),
                         'tasks': [{'id': t['id'], 'title': t['title'], 'optional': bool(t.get('optional') or t.get('required') is False)} for t in m['tasks']]}
                        for m in catalog.values()] if staff else []}

def post(c, u, path, d, catalog):
    if path == '/api/teaching/review':
        if u['role'] not in ('teacher', 'admin'):
            raise PermissionError('교사만 확인할 수 있습니다.')
        row = c.execute('SELECT e.*,a.class_id FROM events e JOIN accounts a ON a.id=e.owner WHERE e.id=?', (d.get('eventId'),)).fetchone()
        if not row:
            raise ValueError('제출 기록을 찾을 수 없습니다.')
        scope(c, u, row['class_id'])
        if row['task'] == 'resource' or row['kind'].endswith('.hint'):
            raise ValueError('열람이나 도움 기록은 수행 확인 대상이 아닙니다.')
        status = d.get('status')
        # insufficient: 글이나 말만으로는 이해를 판단할 자료가 부족함(이해 부족과 구별한다)
        if status not in ('pending', 'revise', 'confirmed', 'insufficient') or d.get('actual') not in ('unverified', 'observed', 'not_applicable'):
            raise ValueError('확인 상태를 선택해 주세요.')
        feedback = text(d.get('feedback', ''), '피드백', 1000, status == 'revise')
        rubric = d.get('rubric', {})
        # 과정 관찰 넷(prediction~revision), 설명 글 넷(concept~terms), 새 조건 적용(transfer)
        if not isinstance(rubric, dict) or set(rubric) - {'prediction', 'control', 'evidence', 'revision', 'concept', 'data', 'link', 'terms', 'transfer'} or any(type(v) is not int or v not in (0, 1, 2) for v in rubric.values()):
            raise ValueError('관찰 점수를 확인해 주세요.')
        old = c.execute('SELECT revision FROM event_reviews WHERE event_id=?', (row['id'],)).fetchone()
        version = old['revision'] if old else 0
        if d.get('revision', 0) != version:
            raise ValueError('다른 확인 내용이 저장되었습니다. 다시 열어 주세요.')
        payload = {'eventId': row['id'], 'revision': version + 1, 'status': status, 'actual': d['actual'],
                   'feedback': feedback, 'rubric': rubric, 'reviewer': u['id'], 'updated': time.time()}
        raw = json.dumps(payload, ensure_ascii=False)
        if old:
            changed = c.execute('UPDATE event_reviews SET revision=?,payload=? WHERE event_id=? AND revision=?', (version+1, raw, row['id'], version)).rowcount
        else:
            changed = c.execute('INSERT INTO event_reviews VALUES(?,?,?) ON CONFLICT DO NOTHING', (row['id'], 1, raw)).rowcount
        if changed != 1:
            raise ValueError('다른 확인 내용이 저장되었습니다. 다시 열어 주세요.')
        c.execute('INSERT INTO review_history VALUES(?,?,?)', (secrets.token_hex(16), row['id'], raw))
        return payload
    cid = scope(c, u, d.get('classId'))
    if path == '/api/teaching/activity':
        if u['role'] not in ('teacher', 'admin'):
            raise PermissionError('교사만 활동을 등록할 수 있습니다.')
        a = d.get('activity', {})
        if not isinstance(a, dict):
            raise ValueError('활동을 확인해 주세요.')
        gid = a.get('gameId'); m = catalog.get(gid)
        if not m:
            raise ValueError('학습 장소를 선택해 주세요.')
        aid = a.get('id') or secrets.token_hex(16)
        text(aid, '활동', 80)
        old = c.execute('SELECT * FROM learning_activities WHERE id=?', (aid,)).fetchone()
        if old and old['class_id'] != cid:
            raise PermissionError('다른 학급의 활동입니다.')
        ver = old['revision'] if old else 0
        if a.get('revision', 0) != ver:
            raise ValueError('활동이 변경되었습니다. 다시 열어 주세요.')
        if a.get('kind') not in ('custom', 'assignment') or type(a.get('published')) is not bool:
            raise ValueError('활동 종류와 게시 상태를 확인해 주세요.')
        task_ids = a.get('taskIds', [])
        if not isinstance(task_ids, list) or any(not isinstance(t, str) for t in task_ids) or len(task_ids) != len(set(task_ids)) or set(task_ids) - {t['id'] for t in m['tasks']}:
            raise ValueError('배정할 과제를 확인해 주세요.')
        if a['kind'] == 'assignment' and not task_ids:
            raise ValueError('배정할 과제를 골라 주세요.')
        out = {'id': aid, 'revision': ver+1, 'kind': a['kind'], 'gameId': gid, 'place': m['place'],
               'title': text(a.get('title'), '활동 제목', 100), 'question': text(a.get('question'), '관찰 질문', 600),
               'evidence': text(a.get('evidence'), '제출할 근거', 600), 'published': a['published'],
               'taskIds': task_ids, 'taskTitles': {t['id']: t['title'] for t in m['tasks'] if t['id'] in task_ids},
               'contentRevision': archive(c, m), 'updated': time.time()}
        raw = json.dumps(out, ensure_ascii=False)
        if old:
            changed = c.execute('UPDATE learning_activities SET revision=?,payload=? WHERE id=? AND revision=?', (ver+1, raw, aid, ver)).rowcount
        else:
            changed = c.execute('INSERT INTO learning_activities VALUES(?,?,?,?) ON CONFLICT DO NOTHING', (aid, cid, 1, raw)).rowcount
        if changed != 1:
            raise ValueError('활동이 변경되었습니다. 다시 열어 주세요.')
        return out
    if path == '/api/teaching/submit':
        if u['role'] != 'student' or u.get('guest'):
            raise PermissionError('학생 계정으로 제출해 주세요.')
        eid = text(d.get('id'), '제출 번호', 80)
        old = c.execute('SELECT owner,payload FROM events WHERE id=?', (eid,)).fetchone()
        if old:
            if old['owner'] != u['id']:
                raise PermissionError('다른 학생의 기록입니다.')
            return {'id': eid, 'saved': True}
        row = c.execute('SELECT payload FROM learning_activities WHERE id=? AND class_id=?', (d.get('activityId'), cid)).fetchone()
        a = json.loads(row['payload']) if row else None
        if not a or not a['published'] or a['kind'] != 'custom':
            raise ValueError('지금 제출할 수 있는 활동이 아닙니다.')
        if d.get('revision') != a['revision']:
            raise ValueError('선생님이 활동을 수정했습니다. 작성한 내용을 보관하고 활동을 다시 열어 주세요.')
        payload = {'activity': a, 'gameId': a['gameId'], 'taskId': 'activity:'+a['id'], 'runId': text(d.get('runId'), '모험 회차', 80),
                   'answer': text(d.get('answer'), '관찰 근거', 2000), 'review': 'teacher_pending', 'modality': 'student_report',
                   'missionTitle': a['place'], 'taskTitle': a['title']}
        now = time.time()
        c.execute('INSERT INTO events VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING', (eid, u['id'], 'activity.submitted', 'activity', str(now), now, json.dumps(payload, ensure_ascii=False)))
        return {'id': eid, 'saved': True}
    raise ValueError('없는 요청입니다.')
