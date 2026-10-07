"""자기 말로 설명하기. 꼭 넣을 낱말이 들어 있는지와 개념을 바르게 설명했는지는 따로 기록한다.
학생 원문은 고치지 않고, 낱말 확인과 관찰 근거만 덧붙인다. 개념 판단은 교사가 한다."""
import hashlib
import json
import re

import inquiry

EVENTS = {'writeup.submitted'}
SCHEMA = ['CREATE TABLE IF NOT EXISTS writeup_editions(revision TEXT PRIMARY KEY,game_id TEXT NOT NULL,payload TEXT NOT NULL)']
# 학생에게 보내지 않는 칸: 교사용 평가 기준 설명과 예시 답
TEACHER_ONLY = {'criteria', 'samples'}
MODES = {'written', 'oral_teacher'}
HELP = {'concept'}
KEYS = {'gameId', 'itemRevision', 'runId', 'gameVersion', 'sequence', 'hint', 'answer', 'evidence', 'version', 'revises', 'change', 'help', 'mode'}
LIMIT = 1200
MEMO = 300
MIN_CHARS = 10
_CACHE = {'stamp': None, 'data': {}}


def items(root):
    f = root / 'data' / 'writeup.json'
    stamp = f.stat().st_mtime if f.exists() else 0
    if stamp != _CACHE['stamp']:
        _CACHE.update(stamp=stamp, data=json.loads(f.read_text(encoding='utf-8')) if f.exists() else {})
    return _CACHE['data']


def revision(gid, item):
    return hashlib.sha256(json.dumps({'gameId': gid, **item}, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def archive(c, gid, item):
    rev = revision(gid, item)
    c.execute('INSERT INTO writeup_editions VALUES(?,?,?) ON CONFLICT DO NOTHING', (rev, gid, json.dumps(item, ensure_ascii=False)))
    return rev


def resolve(c, root, gid, rev=None):
    """문항 원본: 지금 문항과 같으면 지금 것을, 다르면 보관한 판을 돌려준다. 없으면 None."""
    cur = items(root).get(gid)
    if cur and (not rev or revision(gid, cur) == rev):
        return cur, revision(gid, cur)
    if rev and c is not None:
        row = c.execute('SELECT payload FROM writeup_editions WHERE revision=? AND game_id=?', (rev, gid)).fetchone()
        if row:
            return json.loads(row['payload']), rev
    return None, rev


def public(item):
    return {k: v for k, v in item.items() if k not in TEACHER_ONLY}


def editions(c, root, revs):
    """교사 화면: 기록에 남은 문항 판과 지금 판을 모두 준다(평가 기준과 예시 답 포함)."""
    out = {revision(gid, it): {'gameId': gid, **it} for gid, it in items(root).items()}
    for rev in set(revs) - set(out):
        if not isinstance(rev, str):
            continue
        row = c.execute('SELECT game_id,payload FROM writeup_editions WHERE revision=?', (rev,)).fetchone()
        if row:
            out[rev] = {'gameId': row['game_id'], **json.loads(row['payload'])}
    return out


def norm(s):
    return re.sub(r'\s+', '', str(s))


def term_check(item, text):
    """낱말이 들어 있는지만 본다. 바르게 썼는지는 판정하지 않는다."""
    t = norm(text)
    out = []
    for term in item.get('terms', []):
        hit = next((f for f in [term['word'], *term.get('forms', [])] if norm(f) and norm(f) in t), None)
        out.append({'id': term['id'], 'word': term['word'], 'used': bool(hit), 'form': hit or ''})
    return out


def overlap(a, b):
    """두 글에서 가장 길게 겹치는 부분의 글자 수(띄어쓰기 제외). 정리 내용을 그대로 옮겼는지 교사가 볼 수 있게 한다."""
    a, b = norm(a), norm(b)
    if not a or not b:
        return 0
    best, prev = 0, [0] * (len(b) + 1)
    for x in a:
        cur = [0] * (len(b) + 1)
        for j, y in enumerate(b, 1):
            if x == y:
                cur[j] = prev[j - 1] + 1
                if cur[j] > best:
                    best = cur[j]
        prev = cur
    return best


def evidence(conf, given):
    """학생이 고른 관찰 조건으로 관찰 결과를 서버에서 다시 만든다. 확인할 수 없는 조건은 빼고 수를 남긴다."""
    if not isinstance(given, list) or len(given) > 8:
        raise ValueError('근거로 고른 관찰을 확인해 주세요.')
    cards, dropped = [], 0
    for g in given:
        roles = g.get('roles') if isinstance(g, dict) else None
        try:
            if not conf:
                raise ValueError('탐구 자료 없음')
            r = inquiry.evaluate(conf, 'discovery.trial', {'roles': roles})
        except (ValueError, KeyError, TypeError):
            dropped += 1
            continue
        cards.append({'roles': roles, 'conditionText': r['conditionText'], 'observation': r['observation']})
    return cards, dropped


def evaluate(item, rev, conf, gid, mission_title, p):
    if not isinstance(p, dict) or set(p) - KEYS:
        raise ValueError('설명 기록 형식을 확인해 주세요.')
    if len(json.dumps(p, ensure_ascii=False)) > 6000:
        raise ValueError('설명 기록이 너무 깁니다.')
    mode = p.get('mode', 'written')
    if mode not in MODES:
        raise ValueError('응답 방식을 확인해 주세요.')
    answer = p.get('answer', '')
    if not isinstance(answer, str) or len(answer) > (LIMIT if mode == 'written' else MEMO):
        raise ValueError('설명은 1200자 안으로 써 주세요.' if mode == 'written' else '메모는 300자 안으로 적어 주세요.')
    if mode == 'written' and len(norm(answer)) < MIN_CHARS:
        raise ValueError('한두 문장 이상 써 주세요.')
    version = p.get('version', 1)
    if type(version) is not int or not 1 <= version <= 99:
        raise ValueError('설명 차례를 확인해 주세요.')
    for key, limit in [('revises', 80), ('change', MEMO), ('runId', 80), ('gameVersion', 40)]:
        if key in p and (not isinstance(p[key], str) or len(p[key]) > limit):
            raise ValueError('입력 길이를 확인해 주세요.')
    used_help = p.get('help', [])
    if not isinstance(used_help, list) or set(used_help) - HELP or len(set(used_help)) != len(used_help):
        raise ValueError('도움 기록을 확인해 주세요.')
    cards, dropped = evidence(conf, p.get('evidence', []))
    text = answer.strip()
    return {
        'gameId': gid, 'taskId': gid + '.WRITEUP', 'taskTitle': (item or {}).get('title', '설명 쓰기'), 'missionTitle': mission_title,
        'answer': answer, 'responseText': text or ('선생님께 말로 설명하기' if mode == 'oral_teacher' else ''),
        'mode': mode, 'version': version, 'revises': p.get('revises', ''), 'change': p.get('change', '').strip(), 'help': used_help,
        'evidence': cards, 'evidenceDropped': dropped,
        'terms': term_check(item, text) if item and mode == 'written' else [],
        'termsRequired': [t['word'] for t in (item or {}).get('terms', [])],
        'overlap': overlap(text, (conf or {}).get('explanation', '')) if mode == 'written' else 0,
        'itemRevision': rev, 'itemMissing': item is None,
        'review': 'teacher_pending', 'evaluation': 'teacher_review',
        'modality': 'student_explanation' if mode == 'written' else 'oral_teacher',
    }
