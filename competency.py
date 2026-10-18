"""과학 역량과 활동 성향: 게임 기록으로 본 모습과 역량 점검(측정 문항).

역량 여섯(사고력, 탐구, 문제 해결, 의사소통, 참여와 평생 학습, 태도)과 활동 성향 여섯(도전성, 끈기, 조작성, 협력, 탐색, 성찰)을
학생의 실제 기록(의뢰 단계 응답, 도움, 예상과 돌아보기, 새 조건 문제, 설명 쓰기, 게시판, 현장 활동)에서 0~100으로 계산한다.
점수는 기록이 쌓일수록 올라가는 「게임 기록으로 본 모습」이며 성적이나 순위가 아니다. 각 점수에는 근거(무엇을 몇 번)가 붙는다.
역량 점검은 역량마다 자기 평가 한 문항과 상황 문제 두 문항이고, A판과 B판을 번갈아 내어 처음과 나중을 견준다.
"""
import hashlib
import json
import time
from pathlib import Path

CHECK_KIND = 'competency.checked'
EXPERIMENT_PREFIXES = ('crane.', 'magnet.', 'magnetIntro.', 'magnetMaterials.', 'magnetRepair.', 'motor.', 'buzzer.', 'deduction.', 'application.')
EXPERIMENT_KINDS = {'experiment.run', 'observation.table_submitted', 'assembly.changed', 'controls.committed', 'fault.inspected', 'fault.repaired', 'connection.committed', 'conditions.committed', 'discovery.trial'}
CONCEPT_TYPES = {'choice', 'multi', 'quiz', 'sort', 'fill', 'order', 'word', 'chain', 'find'}
_cache = {'mtime': None, 'data': None}


def bank(root):
    path = Path(root) / 'data' / 'competency.json'
    m = path.stat().st_mtime
    if _cache['mtime'] != m:
        _cache.update(mtime=m, data=json.loads(path.read_text(encoding='utf-8')))
    return _cache['data']


def task_tags(t):
    """의뢰 단계 하나가 드러내는 역량. 실험 장면과 예상은 탐구, 개념 문제는 사고력, 글과 표현은 의사소통, 계획은 문제 해결, 실천 기록은 참여."""
    tags = set()
    kind = t.get('type')
    if t.get('diagnostic'):
        return tags
    if t.get('predict') or kind in ('action', 'number') or t.get('component'):
        tags.add('inquiry')
    if kind in CONCEPT_TYPES and not t.get('component'):
        tags.add('think')
    if kind in ('text', 'form', 'report'):
        tags.add('comm')
    if kind in ('plan', 'grid'):
        tags.add('solve')
    if t.get('log') or t.get('keepPlan') or t.get('recall'):
        tags.add('engage')
    if not tags:
        tags.add('think')
    return tags


def ramp(n, target):
    """기록 양에 따른 채움. 처음 몇 번의 성과도 육각형에 보이도록 제곱근으로 차오르고, 목표 수에서 가득 찬다."""
    return min(1.0, (n / target) ** 0.5) if target and n > 0 else 0.0


def blend(parts):
    """parts: [(값 0~1, 무게, 근거 이름, 개수)] → 점수와 근거"""
    w = sum(p[1] for p in parts) or 1
    score = round(100 * sum(p[0] * p[1] for p in parts) / w)
    return {'score': max(0, min(100, score)), 'evidence': sum(p[3] for p in parts), 'basis': [{'label': p[2], 'count': p[3]} for p in parts if p[3]]}


def load(c, owner):
    """학생 한 명의 계산 재료: 기록, 게시판 글과 답, 현장 활동."""
    events = []
    for r in c.execute('SELECT kind,received,payload FROM events WHERE owner=? ORDER BY received,id', (owner,)):
        try:
            p = json.loads(r['payload'])
        except (TypeError, ValueError):
            continue
        events.append((r['kind'], r['received'] or 0, p if isinstance(p, dict) else {}))
    social = [r['created'] or 0 for r in c.execute('SELECT created FROM board_posts WHERE owner=?', (owner,))]
    social += [r['created'] or 0 for r in c.execute('SELECT created FROM board_replies WHERE owner=?', (owner,))]
    fields = [r['created'] or 0 for r in c.execute('SELECT created FROM field_done WHERE owner=?', (owner,))]
    return events, social, fields


def profile(missions, events, social, fields, until=None):
    """역량과 활동 성향 점수. until(초)을 주면 그때까지의 기록만 본다(성장 그래프)."""
    if until is not None:
        events = [e for e in events if e[1] <= until]
        social = [t for t in social if t <= until]
        fields = [t for t in fields if t <= until]
    tasks = {}  # (게임, 과제) -> {'first': bool|None, 'ok': bool, 'helped': bool, 'wrong': bool, 'tags': set, 'optional': bool, 'log': bool, 'action': bool}
    helps = set()
    started, completed, reflected, predicted, transfers, transfer_ok, writeups, revisions, closures, questions, experiments, completed_q = set(), set(), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    asked = 0
    for kind, at, p in events:
        gid = p.get('gameId') or ''
        tid = str(p.get('taskId') or '').split('.')[-1]
        if kind == 'mission.hint':
            helps.add((gid, tid))
            continue
        if kind == 'mission.answered':
            m = missions.get(gid)
            t = next((x for x in (m or {}).get('tasks', []) if x['id'] == tid), None)
            if not t:
                continue
            started.add(gid)
            key = (gid, tid)
            rec = tasks.get(key)
            correct = p.get('correct')
            if rec is None:
                rec = tasks[key] = {'first': correct if isinstance(correct, bool) else None, 'ok': False, 'helped': key in helps, 'wrong': False, 'tags': task_tags(t),
                                    'optional': bool(t.get('optional') or t.get('required') is False), 'log': bool(t.get('log')), 'action': t.get('type') == 'action' or bool(t.get('component'))}
            if correct is False:
                rec['wrong'] = True
            if correct is not False and not rec['ok']:
                rec['ok'] = True
                rec['helped'] = rec['helped'] or key in helps
            continue
        if kind == 'mission.completed':
            completed.add(gid)
            if len(str(p.get('answer') or '').strip()) >= 8:
                completed_q += 1
        elif kind in ('game.completed', 'workshop.completed', 'magnet.completed', 'crane.completed'):
            completed.add(kind)
        elif kind in ('mission.reflected', 'discovery.reflection'):
            reflected += 1
        elif kind in ('mission.predicted', 'discovery.predicted', 'prediction.submitted'):
            predicted += 1
        elif kind in ('mission.transfer', 'discovery.transfer', 'transfer.position_submitted'):
            if p.get('answer') != 'skip':
                transfers += 1
                transfer_ok += int(p.get('correct') is True)
        elif kind == 'writeup.submitted':
            writeups += 1
            revisions += int((p.get('version') or 1) > 1)
        elif kind == 'answer.submitted':
            closures += 1
        elif kind in ('question.submitted', 'followup.submitted', 'quest.received'):
            questions += 1
        if kind in EXPERIMENT_KINDS or kind.startswith(EXPERIMENT_PREFIXES):
            experiments += 1
        if kind.startswith(EXPERIMENT_PREFIXES) or kind in ('game.started', 'discovery.trial'):
            started.add(gid or kind.split('.')[0])

    def quality(sel):
        rows = [r for r in tasks.values() if sel(r) and (r['first'] is not None or r['ok'])]
        if not rows:
            return 0.0, 0
        val = 0.0
        for r in rows:
            if r['first'] is True:
                val += 1.0
            elif r['ok']:
                val += 0.55 if r['helped'] else 0.7
            else:
                val += 0.3
        return val / len(rows), len(rows)

    def has(tag):
        return lambda r: tag in r['tags'] and not r['optional']

    q_think, n_think = quality(has('think'))
    q_inq, n_inq = quality(has('inquiry'))
    q_comm, n_comm = quality(has('comm'))
    q_solve, n_solve = quality(has('solve'))
    optional_done = sum(1 for r in tasks.values() if r['optional'] and r['ok'])
    log_done = sum(1 for r in tasks.values() if r['log'] and r['ok'])
    wrongs = [r for r in tasks.values() if r['wrong']]
    recovered = sum(1 for r in wrongs if r['ok'])
    first_tries = [r for r in tasks.values() if r['first'] is not None and not r['optional']]
    unaided = sum(1 for r in first_tries if not r['helped'] or r['first'] is True)
    action_done = sum(1 for r in tasks.values() if r['action'] and r['ok'])
    n_social, n_field = len(social), len(fields)
    comp = {
        'think': blend([(q_think * (0.4 + 0.6 * ramp(n_think, 40)), 0.8, '개념 문제', n_think), (ramp(transfer_ok, 6), 0.2, '새 조건 문제를 맞힘', transfer_ok)]),
        'inquiry': blend([(q_inq * (0.4 + 0.6 * ramp(n_inq, 25)), 0.5, '실험 장면 단계', n_inq), (ramp(predicted, 12), 0.25, '실험 전 예상', predicted), (ramp(experiments, 30), 0.25, '전용 실험 조작', experiments)]),
        'solve': blend([((transfer_ok / transfers if transfers else 0) * ramp(transfers, 6), 0.35, '새 조건 문제', transfers), (ramp(len(completed), 20), 0.45, '해결한 의뢰', len(completed)), (q_solve * ramp(n_solve, 4), 0.2, '계획 세우기', n_solve)]),
        'comm': blend([(ramp(writeups + closures, 4), 0.3, '설명 쓰기', writeups + closures), (q_comm * ramp(n_comm, 8), 0.3, '글로 답하기', n_comm), (ramp(n_social, 6), 0.2, '게시판 글과 답', n_social), (ramp(completed_q, 10), 0.2, '의뢰를 마치며 남긴 말', completed_q)]),
        'engage': blend([(ramp(n_field, 8), 0.35, '현장 활동', n_field), (ramp(optional_done, 15), 0.3, '더 해보기', optional_done), (ramp(log_done, 3), 0.15, '실천 기록', log_done), (ramp(questions, 4), 0.2, '스스로 남긴 질문', questions)]),
        'attitude': blend([(ramp(reflected, 10), 0.35, '결과 보고 돌아보기', reflected), ((recovered / len(wrongs) if wrongs else 0) * ramp(len(wrongs), 8), 0.45, '틀린 뒤 끝까지 다시 해결', recovered), (ramp(revisions, 2), 0.2, '설명 고쳐 쓰기', revisions)]),
    }
    tend = {
        'challenge': blend([((unaided / len(first_tries) if first_tries else 0) * ramp(len(first_tries), 30), 0.5, '도움 없이 먼저 해 본 단계', unaided), (ramp(optional_done, 10), 0.3, '더 해보기', optional_done), (ramp(transfers, 6), 0.2, '새 조건 문제 도전', transfers)]),
        'persist': blend([((recovered / len(wrongs) if wrongs else 0) * ramp(len(wrongs), 8), 0.6, '틀린 단계를 다시 해결', recovered), ((len(completed) / max(1, len(started))) * ramp(len(started), 5), 0.4, '시작한 의뢰를 마침', len(completed))]),
        'handle': blend([(ramp(action_done, 30), 0.6, '실험 장면 조작', action_done), (ramp(experiments, 40), 0.4, '전용 실험 조작', experiments)]),
        'collab': blend([(ramp(n_social, 8), 1.0, '게시판 글과 답', n_social)]),
        'explore': blend([(ramp(len(started), 25), 0.5, '들어가 본 의뢰', len(started)), (ramp(n_field, 10), 0.3, '현장 활동', n_field), (ramp(optional_done, 15), 0.2, '더 해보기', optional_done)]),
        'reflect': blend([(ramp(reflected, 10), 0.5, '결과 보고 돌아보기', reflected), (ramp(writeups, 3), 0.3, '설명 쓰기', writeups), (ramp(completed_q, 10), 0.2, '의뢰를 마치며 남긴 말', completed_q)]),
    }
    return {'competencies': comp, 'tendencies': tend, 'evidence': sum(v['evidence'] for v in comp.values())}


def growth(missions, events, social, fields, now=None, points=8):
    """처음 기록부터 지금까지 주마다 다시 계산한 역량 점수(가장 최근 8개)."""
    now = time.time() if now is None else now
    times = [e[1] for e in events] + social + fields
    if not times:
        return []
    start = min(times)
    cuts, t = [], start + 7 * 86400
    while t < now:
        cuts.append(t)
        t += 7 * 86400
    cuts = cuts[-(points - 1):] + [now]
    return [{'at': cut, 'competencies': {k: v['score'] for k, v in profile(missions, events, social, fields, cut)['competencies'].items()}} for cut in cuts]


def checks(events, root):
    """역량 점검 기록(시간 순)."""
    out = []
    for kind, at, p in events:
        if kind == CHECK_KIND:
            out.append({'at': at, 'form': p.get('form'), 'rates': p.get('rates', {}), 'right': p.get('right', {})})
    return out


def next_form(events):
    done = [p.get('form') for k, _, p in events if k == CHECK_KIND]
    return 'B' if done and done[-1] == 'A' else 'A'


def public_check(root, form, seed):
    """학생에게 보낼 점검지: 정답 없이, 보기 순서는 학생마다 정해진 대로 섞는다."""
    b = bank(root)
    items = []
    for it in b['forms'][form]:
        opts = sorted(it['options'], key=lambda o: hashlib.sha256((seed + it['id'] + o['id']).encode()).hexdigest())
        items.append({'id': it['id'], 'code': it['code'], 'stem': it['stem'], 'options': opts})
    return {'form': form, 'version': b['version'], 'rate': b['rate'], 'scale': b['scale'], 'items': items, 'labels': {c['id']: c['label'] for c in b['competencies']}}


def grade(root, form, rates, answers):
    b = bank(root)
    if form not in b['forms']:
        raise ValueError('점검지를 다시 열어 주세요.')
    codes = {c['id'] for c in b['competencies']}
    if not isinstance(rates, dict) or set(rates) != codes or any(type(v) is not int or not 1 <= v <= 4 for v in rates.values()):
        raise ValueError('나를 돌아보는 문항에 모두 답해 주세요.')
    items = b['forms'][form]
    if not isinstance(answers, dict) or set(answers) != {it['id'] for it in items} or any(answers[it['id']] not in {o['id'] for o in it['options']} for it in items):
        raise ValueError('문제에 모두 답해 주세요.')
    right = {c: 0 for c in codes}
    total = {c: 0 for c in codes}
    review = []
    for it in items:
        total[it['code']] += 1
        ok = answers[it['id']] == it['key']
        right[it['code']] += int(ok)
        review.append({'id': it['id'], 'ok': ok, 'key': it['key'], 'why': it['why']})
    return {'form': form, 'version': b['version'], 'rates': rates, 'answers': answers, 'right': right, 'total': total}, review
