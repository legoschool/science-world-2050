# Vercel 서버리스 함수 입구. /api/* 요청을 server.py의 Handler가 그대로 처리한다.
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from server import Handler


class handler(Handler):
    pass
