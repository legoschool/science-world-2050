"""다시 들어올 까닭: 오늘의 탐구와 도전 게시판.

오늘의 탐구: 날마다(한국 시각 자정에 바뀜) 학생마다 세 문제. 끝낸 의뢰, 그 가운데서도 이틀 넘게 지난 의뢰의 개념 문제를 먼저 다시 묻는다
(배운 것을 시간이 지나 다시 꺼내 보게). 장면 없이 풀 수 있고 해설이 있는 고르기 문제만 쓴다. 한 문제에 한 번 답하고, 답하면 해설을 보여 준다.
연속 접속 보상이나 놓친 날의 불이익은 두지 않는다.
도전 게시판: 들어가 본 의뢰의 더 해보기(선택 과제) 가운데 아직 해결하지 않은 것과, 그 과제로 열리는 숨은 도감 카드를 모아 보인다.
"""
import hashlib
import json
import time

DAILY_KIND = 'daily.answered'
PER_DAY = 3
_pool = {'key': None, 'data': []}


def today(now=None):
    now = time.time() if now is None else now
    return time.strftime('%Y-%m-%d', time.gmtime(now + 9 * 3600))


def pool(missions):
    """오늘의 탐구에 쓸 문제: 고르기, 장면과 그림 없음, 진단 아님, 해설 있음, 보기 셋 이상."""
    key = tuple(sorted((g, m.get('version')) for g, m in missions.items()))
    if _pool['key'] != key:
        out = []
        for gid, m in sorted(missions.items()):
            for t in m['tasks']:
                if t.get('type') != 'choice' or t.get('component') or t.get('diagnostic') or not t.get('key') or not t.get('explain'):
                    continue
                if t.get('figure') or t.get('note') or t.get('memo') or t.get('recall') or len(t.get('options', [])) < 3:
                    continue
                if any(o.get('img') or o.get('figure') for o in t['options']):
                    continue
                out.append((gid, t['id']))
        _pool.update(key=key, data=out)
    return _pool['data']


def _rank(seed, item):
    return hashlib.sha256((seed + item[0] + item[1]).encode()).hexdigest()


def pick(missions, uid, events, now=None):
    """오늘 이 학생의 세 문제. 끝낸 지 이틀 넘은 의뢰 → 끝낸 의뢰 → 나머지 순으로, 서로 다른 의뢰에서 고른다."""
    now = time.time() if now is None else now
    day = today(now)
    done_at = {}
    for kind, at, p in events:
        if kind == 'mission.completed' and p.get('gameId'):
            done_at.setdefault(p['gameId'], at)
    items = pool(missions)
    seed = day + uid
    old = [x for x in items if x[0] in done_at and now - done_at[x[0]] >= 2 * 86400]
    fresh = [x for x in items if x[0] in done_at and x not in old]
    rest = [x for x in items if x[0] not in done_at]
    chosen, used = [], set()
    for group in (old, fresh, rest):
        for x in sorted(group, key=lambda x: _rank(seed, x)):
            if len(chosen) >= PER_DAY:
                break
            if x[0] in used:
                continue
            chosen.append(x); used.add(x[0])
    return day, chosen


def answered(events, day):
    out = {}
    for kind, at, p in events:
        if kind == DAILY_KIND and p.get('date') == day:
            out.setdefault(p.get('gameId', '') + '.' + p.get('taskId', ''), {'answer': p.get('answer'), 'correct': p.get('correct')})
    return out


def public_item(missions, gid, tid, uid):
    m = missions[gid]
    t = next(x for x in m['tasks'] if x['id'] == tid)
    opts = sorted(({'id': o['id'], 'label': o['label']} for o in t['options']), key=lambda o: hashlib.sha256((uid + gid + tid + o['id']).encode()).hexdigest())
    return {'ref': gid + '.' + tid, 'gameId': gid, 'taskId': tid, 'mission': m.get('title', gid), 'title': t['title'], 'say': [list(x) for x in t.get('say', [])], 'options': opts}


def reveal(missions, gid, tid):
    t = next(x for x in missions[gid]['tasks'] if x['id'] == tid)
    return {'key': t['key'], 'keyLabel': next((o['label'] for o in t['options'] if o['id'] == t['key']), ''), 'explain': t.get('explain', '')}


def challenges(missions, events, run, dex_cards):
    """들어가 본 의뢰의 남은 더 해보기와 숨은 카드. dex_cards(gid, tid) -> [{'id','name','bonus'}]."""
    started, done = set(), set()
    for kind, at, p in events:
        if p.get('runId') != run or not kind.startswith('mission.'):
            continue
        gid = p.get('gameId')
        if gid in missions:
            started.add(gid)
        if kind == 'mission.answered' and p.get('correct') is not False:
            done.add((gid, str(p.get('taskId') or '').split('.')[-1]))
    out = []
    for gid in sorted(started):
        m = missions[gid]
        extra = [t for t in m['tasks'] if t.get('optional') or t.get('required') is False]
        if not extra:
            continue
        left = [t for t in extra if (gid, t['id']) not in done]
        items = []
        for t in left:
            hidden = [c['name'] for c in dex_cards(gid, t['id']) if c.get('bonus')]
            items.append({'taskId': t['id'], 'title': t['title'], 'hidden': hidden})
        out.append({'gameId': gid, 'title': m.get('title', gid), 'zone': m.get('zone'), 'total': len(extra), 'done': len(extra) - len(left), 'items': items})
    return out
