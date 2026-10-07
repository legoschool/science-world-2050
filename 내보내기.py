"""science-world에서 깃허브에 올릴 핵심 코드만 이 폴더로 복사한다.

정답 열쇠가 든 data/, 그림(public/assets, public/manual-shots), 시험(tests/),
제작 도구(tools/), 설명서 원본(docs/), 실행 스크립트(*.ps1)와 연결 정보(.env*, .vercel)는 복사하지 않는다.
다시 올릴 때: python 내보내기.py 실행 뒤 git add -A, git commit, git push.
"""
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / 'science-world'

ROOT_FILES = ['server.py', 'teaching.py', 'inquiry.py', 'writeup.py',
              'health_inquiry.py', 'health_partner.py', 'requirements.txt', 'vercel.json']
PUBLIC_EXT = {'.mjs', '.js', '.css', '.html', '.json'}
PUBLIC_SKIP = ('zz-', 'chibi-preview.', 'scenery-preview.')
KEEP = {'.git', 'README.md', '.gitignore', '내보내기.py'}


def main():
    for p in HERE.iterdir():
        if p.name in KEEP:
            continue
        shutil.rmtree(p) if p.is_dir() else p.unlink()
    for name in ROOT_FILES:
        shutil.copy2(SRC / name, HERE / name)
    (HERE / 'api').mkdir()
    shutil.copy2(SRC / 'api' / 'index.py', HERE / 'api' / 'index.py')
    (HERE / 'public').mkdir()
    for p in sorted((SRC / 'public').iterdir()):
        if p.is_file() and p.suffix in PUBLIC_EXT and not p.name.startswith(PUBLIC_SKIP):
            shutil.copy2(p, HERE / 'public' / p.name)
    shutil.copytree(SRC / 'public' / 'vendor', HERE / 'public' / 'vendor')
    count = sum(1 for p in HERE.rglob('*') if p.is_file() and '.git' not in p.parts)
    print(f'{count}개 파일을 복사했다.')


if __name__ == '__main__':
    main()
