"""교과서 펼쳐 보기: 의뢰에 연결된 교과서(과학, 실험관찰) 쪽 그림을 학급 학생과 선생님에게만 준다.

그림과 목록은 tools/build_textbook.py 가 data/textbook/ 에 만든다. 출판사 저작물이므로
- 둘러보기(guest) 계정과 로그인하지 않은 사람에게는 주지 않는다.
- 목록(index.json)에 있는 쪽, 곧 의뢰와 연결된 쪽만 준다. 지도서(교사용)는 뽑지 않았다.
- 그림 주소는 정적 파일이 아니라 로그인이 필요한 /api 경로로만 열린다.
"""
import json
import re
from pathlib import Path

GUEST = '교과서 보기는 접근 코드로 들어온 학생과 선생님만 볼 수 있어요.'
HOUR_LIMIT = '교과서를 많이 펼쳐 봤어요. 잠시 쉬었다가 다시 펼쳐 주세요.'
DAY_LIMIT = '오늘은 교과서를 충분히 펼쳐 봤어요. 내일 다시 펼쳐 볼 수 있어요.'
_cache = {'mtime': None, 'data': None}


def index(root):
    path = Path(root) / 'data' / 'textbook' / 'index.json'
    if not path.exists():
        return {'books': {}, 'missions': {}}
    m = path.stat().st_mtime
    if _cache['mtime'] != m:
        _cache['data'] = json.loads(path.read_text(encoding='utf-8'))
        _cache['mtime'] = m
    return _cache['data']


_easy = {'key': None, 'data': {}}


def easy(root):
    """쉽게 보기: data/textbook/easy/<책>.json 의 쪽마다 쉬운 설명(say)과 먼저 볼 곳(look)."""
    folder = Path(root) / 'data' / 'textbook' / 'easy'
    files = sorted(folder.glob('*.json')) if folder.exists() else []
    key = tuple((f.name, f.stat().st_mtime) for f in files)
    if _easy['key'] != key:
        data = {}
        for f in files:
            try:
                data[f.stem] = json.loads(f.read_text(encoding='utf-8'))
            except ValueError:
                continue
        _easy.update(key=key, data=data)
    return _easy['data']


_names = {'mtime': None, 'data': {}}


def titles(root):
    """public/regions.json 의 의뢰 이름(전용 실험 포함)."""
    path = Path(root) / 'public' / 'regions.json'
    if not path.exists():
        return {}
    m = path.stat().st_mtime
    if _names['mtime'] != m:
        out = {}
        def walk(v):
            if isinstance(v, dict):
                if isinstance(v.get('id'), str) and re.fullmatch(r'R\d-G\d\d', v['id']) and v.get('title'):
                    out[v['id']] = v['title']
                for x in v.values():
                    walk(x)
            elif isinstance(v, list):
                for x in v:
                    walk(x)
        walk(json.loads(path.read_text(encoding='utf-8')))
        _names.update(mtime=m, data=out)
    return _names['data']


def sections(root, gid):
    """의뢰의 교과서 쪽 묶음. 같은 지역(단원) 다른 의뢰의 목록도 함께 준다(복습할 때 앞뒤 차시를 찾아 보게)."""
    if not isinstance(gid, str) or not re.fullmatch(r'R\d-G\d\d', gid):
        return None
    data = index(root)
    books = data.get('books', {})

    notes = easy(root)

    def note(book, p):
        v = notes.get(book, {}).get(p)
        if not isinstance(v, dict):
            return {}
        say = [x for x in v.get('say', []) if isinstance(x, str) and x.strip()][:4]
        look = v.get('look') if isinstance(v.get('look'), str) else ''
        return {'easy': {'say': say, 'look': look}} if say or look else {}

    def view(secs):
        return [{'book': s['book'], 'label': s['label'], 'title': books.get(s['book'], {}).get('title', ''),
                 'unit': books.get(s['book'], {}).get('unit', ''),
                 'pages': [{'id': p, **{k: books[s['book']]['pages'][p][k] for k in ('n', 'w', 'h')}, **note(s['book'], p)} for p in s['pages'] if p in books.get(s['book'], {}).get('pages', {})]}
                for s in secs]
    region = gid[:2]
    names = titles(root)
    others = [{'id': g, 'title': names.get(g, g), 'labels': [s['label'] for s in secs]} for g, secs in sorted(data.get('missions', {}).items()) if g[:2] == region]
    return {'mission': gid, 'sections': view(data.get('missions', {}).get(gid, [])), 'region': others}


def page(root, book, pid):
    """목록에 있는 쪽 그림만 읽는다. 경로를 조합하기 전에 이름을 확인한다."""
    if not isinstance(book, str) or not isinstance(pid, str) or not re.fullmatch(r'[a-z0-9-]{2,20}', book) or not re.fullmatch(r'p\d{1,3}', pid):
        return None
    if pid not in index(root).get('books', {}).get(book, {}).get('pages', {}):
        return None
    path = Path(root) / 'data' / 'textbook' / book / f'{pid}.webp'
    return path.read_bytes() if path.exists() else None
