"""교과 목표에 맞게 작성한 핵심어 규칙으로 답을 확인한다.

원문은 고치지 않는다. 조사, 어미, 띄어쓰기, 문장부호는 점수가 아니며,
규칙이 없는 예상과 의견에는 정답을 만들지 않는다.
"""
import re
import hashlib
import json
import unicodedata

CHOSUNG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
SCHEMA = ['CREATE TABLE IF NOT EXISTS answer_editions(revision TEXT PRIMARY KEY,game_id TEXT NOT NULL,scope TEXT NOT NULL,payload TEXT NOT NULL)']
CUSTOM_IDS = {'R3-G05', 'R3-G06', 'R3-G07'}


def normalize(text):
    return re.sub(r'[^0-9a-z가-힣]', '', unicodedata.normalize('NFKC', str(text)).lower())


def initial(text):
    return ''.join(CHOSUNG[(ord(c) - 0xac00) // 588] if '가' <= c <= '힣' else c for c in str(text))


def branches(rule):
    if not isinstance(rule, dict):
        return []
    return [b for b in [rule, *rule.get('alternatives', [])] if isinstance(b, dict) and b.get('groups')]


def check(text, rule):
    """각 갈래의 모든 의미군을 확인한다. 정답 단어는 응답에 돌려주지 않는다."""
    options = branches(rule)
    if not options:
        return None
    value = normalize(text)
    results = []
    for branch in options:
        missing = []
        for index, group in enumerate(branch['groups']):
            if not any(normalize(word) and normalize(word) in value for word in group.get('any', [])):
                missing.append(str(group.get('id', index + 1)))
        results.append(missing)
    missing = min(results, key=len)
    correct = not missing
    total = len(options[results.index(missing)]['groups'])
    if correct:
        feedback = '핵심 내용이 맞아요.'
    elif total > 1:
        # 몇 가지가 이미 들어 있는지 알려 주어, 처음부터 다시 쓰지 않고 빠진 내용만 보태게 한다
        feedback = f'핵심 내용 {total}가지 가운데 {total - len(missing)}가지가 들어 있어요. 초성 힌트에서 「아직 없어요」가 붙은 내용을 넣어 보세요.'
    else:
        feedback = '핵심 내용을 더 적어 볼까요? 어려우면 초성 힌트를 눌러 보세요.'
    return {'correct': correct, 'evaluation': 'core_keywords',
            'answerCheck': {'matched': correct, 'missing': missing},
            'answerRuleVersion': rule.get('version', 1),
            'answerFeedback': feedback}


def hints(rule):
    """학생이 도움을 요청했을 때 대표 핵심어의 초성만 반환한다."""
    options = branches(rule)
    if not options:
        return []
    return [{'id': str(g.get('id', i + 1)), 'label': g.get('label', f'핵심어 {i + 1}'),
             'pattern': initial(g.get('hint') or g['any'][0])}
            for i, g in enumerate(options[0]['groups']) if g.get('any')]


def teacher_lines(rule):
    return ['핵심어 묶음: ' + ' + '.join(' / '.join(g['any']) for g in branch['groups'])
            for branch in branches(rule)]


def word_rule(task):
    return task.get('answerRule') or {'groups': [{'id': 'word', 'label': '떠올릴 낱말',
                                               'any': [task['key'], *task.get('accept', [])]}]}


def rule_for(task, roles=None):
    if task.get('type') == 'word':
        return word_rule(task)
    return task.get('answerRules', {}).get((roles or {}).get('product')) or task.get('answerRule')


def supports(task):
    return bool(branches(rule_for(task)) or task.get('answerRules') or
                any(branches(f.get('answerRule')) for f in task.get('fields', [])))


def fingerprint(task):
    """정답 규칙과 지원 자료를 제외한 문항 원문이 같은지 확인하는 값."""
    def clean(value):
        if isinstance(value, dict):
            return {k: clean(v) for k, v in value.items() if k not in {'answerRule', 'answerRules', 'support', 'answerSupport'}}
        if isinstance(value, list):
            return [clean(v) for v in value]
        return value
    return hashlib.sha256(json.dumps(clean(task), ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def custom(root, db, gid, revision=None):
    if not isinstance(gid, str) or gid not in CUSTOM_IDS:
        raise ValueError('답을 확인할 설명 문항이 아닙니다.')
    if revision is not None:
        if not isinstance(revision, str) or not re.fullmatch('[0-9a-f]{64}', revision):
            raise ValueError('설명 확인 자료를 다시 열어 주세요.')
        row = db.execute('SELECT payload FROM answer_editions WHERE revision=? AND game_id=? AND scope=?', (revision, gid, 'CLOSURE')).fetchone()
        if not row:
            raise ValueError('설명 확인 자료를 다시 열어 주세요.')
        return json.loads(row['payload']), revision
    source = root / 'data' / 'custom-answer-rules.json'
    item = json.loads(source.read_text(encoding='utf-8')).get(gid) if source.exists() else None
    if not item:
        raise ValueError('답을 확인할 설명 문항이 아닙니다.')
    revision = hashlib.sha256(json.dumps({'gameId': gid, 'taskId': 'CLOSURE', **item}, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    db.execute('INSERT INTO answer_editions VALUES(?,?,?,?) ON CONFLICT DO NOTHING', (revision, gid, 'CLOSURE', json.dumps(item, ensure_ascii=False)))
    return item, revision


def custom_check(root, db, gid, revision, text):
    if not isinstance(text, str) or not normalize(text) or len(text) > 300:
        raise ValueError('핵심 내용을 300자 안으로 적어 주세요.')
    item, revision = custom(root, db, gid, revision)
    return {**check(text, item['answerRule']), 'ruleRevision': revision, 'taskTitle': item['title']}
