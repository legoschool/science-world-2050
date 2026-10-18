"""과학 탐험 서버. 로컬에서는 SQLite, 공개 배포(Vercel)에서는 DATABASE_URL의 Postgres를 쓴다."""
import re, base64, binascii, ipaddress, socket, os, ssl, threading
import argparse, hashlib, hmac, json, mimetypes, secrets, sqlite3, time, tempfile
from contextlib import contextmanager
from contextvars import ContextVar
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from http.cookies import SimpleCookie
from urllib.parse import urlparse, parse_qs
from collections import Counter
ROOT=Path(__file__).resolve().parent
import sys
sys.path.insert(0,str(ROOT))
import teaching
import inquiry
import health_inquiry
import health_partner
import writeup
import answer_support
import learning_metrics
import learning_reset
import textbook
REQUEST_LEARNING_EPOCH=ContextVar('request_learning_epoch',default=None)
SQLITE_REQUEST_CONNECTION=ContextVar('sqlite_request_connection',default=None)
DB=Path(tempfile.gettempdir())/'science-world-local-demo'/'demo.sqlite3'
PORT=4186
LAN=False
LAN_URLS=[]
PEPPERS={}
DATABASE_URL=os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL') or ''
PG=bool(DATABASE_URL)
PUBLIC=os.environ.get('VERCEL')=='1' or os.environ.get('SCIENCE_PUBLIC')=='1'
READY=False
SESSION_SECONDS=28800
TEXTBOOK_HOUR,TEXTBOOK_DAY=120,200 # 학생 한 명이 1시간, 24시간 동안 받을 수 있는 교과서 쪽 수(전체 265쪽보다 적게)
RESOURCE_EVENTS={'resource.opened','resource.external_opened','resource.video_requested'}
MOTOR_EVENTS={'motor.prepared','motor.switched','motor.observed','motor.hint'}
BUZZER_EVENTS={'buzzer.prepared','buzzer.switched','buzzer.observed','buzzer.hint'}
DEDUCTION_EVENTS={'deduction.inspected','deduction.submitted','deduction.uncertain','deduction.hint'}
APPLICATION_EVENTS={'application.trial','application.submitted','application.hint'}
INQUIRY_EVENTS={'inquiry.reviewed','inquiry.features'}
MAGNET_EVENTS={'magnet.prepared','magnet.assembled','magnet.connected','magnet.switched','magnet.observed','magnet.hint'}
REPAIR_EVENTS={'magnetRepair.inspected','magnetRepair.repaired','magnetRepair.tested','magnetRepair.hint'}
MEANING_EVENTS={'magnetMeaning.submitted','magnetMeaning.hint'}
MATERIAL_EVENTS={'magnetMaterials.submitted','magnetMaterials.hint'}
INTRO_MAGNET_EVENTS={'magnetIntro.recalled','magnetIntro.inspected','magnetIntro.suspected','magnetIntro.hint'}
MISSION_EVENTS={'mission.answered','mission.hint','mission.completed'}
CRANE_EVENTS={'crane.scene_released','crane.question','crane.switched','crane.observed','crane.hint','crane.recalled','crane.counted','crane.strength','crane.compass','crane.poles','crane.reversed','crane.compared','crane.moved','crane.delivered','crane.evidence','crane.completed'}
# 크레인(R3-G07) 기록 → 과제와 학습 요소 (지역3_전력망지구_게임설계.md R3-G07 표)
CRANE_TASKS={'crane.recalled':('T01',['3-097','3-107']),'crane.scene_released':('T02',['3-105','3-124']),'crane.question':('T02',['3-105','3-124']),'crane.switched':('T03',['3-108']),'crane.observed':('T03',['3-108','3-125']),'crane.counted':('T04',['3-109','3-110','3-111']),'crane.strength':('T04',['3-109','3-110','3-111']),'crane.compass':('T05',['3-112','3-113']),'crane.poles':('T06',['3-114','3-115','3-116']),'crane.reversed':('T06',['3-114','3-115','3-116']),'crane.compared':('T07',['3-117','3-118','3-119','3-120','3-121']),'crane.moved':('T08',['3-124','3-066','3-127']),'crane.delivered':('T08',['3-124','3-066','3-127']),'crane.evidence':('T09',['3-110','3-115','3-129']),'crane.completed':('T10',['3-118','3-124'])}
CRANE_TABLE={'power-bar':'x','power-em':'o','strength-bar':'x','strength-em':'o','pole-bar':'x','pole-em':'o','iron-bar':'o','iron-em':'o'}
EVENTS=MISSION_EVENTS|CRANE_EVENTS|INTRO_MAGNET_EVENTS|MATERIAL_EVENTS|MEANING_EVENTS|REPAIR_EVENTS|MAGNET_EVENTS|{'magnet.completed','workshop.completed'}|INQUIRY_EVENTS|APPLICATION_EVENTS|DEDUCTION_EVENTS|BUZZER_EVENTS|MOTOR_EVENTS|RESOURCE_EVENTS|{'quest.received','entry.submitted','observation.table_submitted','transfer.position_submitted','controls.committed','vocabulary.submitted','comparison.marked','comparison.submitted','proposal.submitted','fault.inspected','fault.repaired','assembly.changed','game.started','prediction.submitted','conditions.committed','connection.committed','experiment.run','result.recorded','explanation.submitted','hint.opened','followup.submitted','game.completed','question.submitted'}
TASKS={'mission','crane','closure6','magnetIntro','magnetMaterials','magnetMeaning','magnetRepair','magnet','closure5','inquiry5','application','deduction','buzzer','motor','resource','comparison','proposal','diagnosis','intro','prediction','conditions','connection','observe','explain','transfer','complete','question'}
ANSWERS={'conditions':'same','connection':'series','observe':'two','explain':'controlled','transfer':'fair'}
EVENTS |= inquiry.EVENTS
# 예상하고 관찰하고 설명하기: 실험 전 처음 예상, 결과를 본 뒤 돌아보기, 새 조건에 적용. 첫 시도 정답률과 도감에는 세지 않는다.
POE_EVENTS={'mission.predicted','mission.reflected','mission.transfer'}
EVENTS |= POE_EVENTS
TASKS.add('discovery')
# 자기 말로 설명하기: 원문과 교사 검토를 보존하고 문항 판의 핵심어 판정을 별도로 기록한다.
EVENTS |= writeup.EVENTS
TASKS.add('writeup')
EVENTS.add('answer.submitted')
TASKS.add('answer')
# 길 고르기: 이야기를 모두 보는 길과 빠르게 문제만 푸는 길. 고른 기록과 의뢰에 들어간 길을 남긴다(선생님 대시보드의 의뢰별 길).
PACE_EVENTS={'pace.chosen','pace.entered'}
PACES={'story','quick'}
EVENTS |= PACE_EVENTS
TASKS.add('pace')
# ---------------------------------------------------------------- 저장소
# SQL은 SQLite 문법으로 쓰고, Postgres에서는 자리표(? → %s)와 몇몇 차이만 바꿔 보낸다.
class Row(dict):
    def __init__(self,cols,vals):super().__init__(zip(cols,vals));self._vals=vals
    def __getitem__(self,k):return self._vals[k] if isinstance(k,int) else dict.__getitem__(self,k)
class PGCursor:
    def __init__(self,cur):
        self.cur=cur;self.cols=[d[0] for d in cur.description] if cur is not None and cur.description else [];self.rowcount=cur.rowcount if cur is not None else 0
    def fetchone(self):
        if not self.cols:return None
        r=self.cur.fetchone();return Row(self.cols,list(r)) if r is not None else None
    def fetchall(self):return [Row(self.cols,list(r)) for r in self.cur.fetchall()] if self.cols else []
    def __iter__(self):return iter(self.fetchall())
_PG_SQL={}
def pg_sql(sql):
    if sql not in _PG_SQL:
        q=sql.strip()
        if q.upper()=='BEGIN IMMEDIATE':_PG_SQL[sql]=None
        else:
            q=q.replace('ORDER BY rowid','ORDER BY seq')
            if q=='SELECT revision FROM checkpoints WHERE owner=?':q+=' FOR UPDATE'
            _PG_SQL[sql]=q.replace('%','%%').replace('?','%s')
    return _PG_SQL[sql]
def pg_value(v):
    if type(v) is bool:return int(v)
    if isinstance(v,memoryview):return bytes(v)
    return v
class PGConn:
    def __init__(self,raw):self.raw=raw
    def execute(self,sql,params=()):
        q=pg_sql(sql)
        if q is None:return PGCursor(None)
        cur=self.raw.cursor();cur.execute(q,tuple(pg_value(v) for v in params));return PGCursor(cur)
_PG={'raw':None,'used':0.0,'depth':0}
_PG_LOCK=threading.RLock()
class SQLiteRequestConn:
    """Reuse the guarded transaction for nested validation reads and writes."""
    def __init__(self,raw):self.raw=raw
    def execute(self,sql,params=()):
        if sql.strip().upper()=='BEGIN IMMEDIATE' and self.raw.in_transaction:return self.raw.execute('SELECT 1 WHERE 0')
        return self.raw.execute(sql,params)
    def __getattr__(self,name):return getattr(self.raw,name)
def pg_connect():
    import pg8000.dbapi
    from urllib.parse import unquote
    u=urlparse(DATABASE_URL);opts=parse_qs(u.query)
    local=u.hostname in ('127.0.0.1','localhost') or opts.get('sslmode',[''])[0]=='disable'
    return pg8000.dbapi.connect(user=unquote(u.username or 'postgres'),password=unquote(u.password) if u.password else None,host=u.hostname,port=u.port or 5432,database=(u.path or '/postgres').lstrip('/') or 'postgres',ssl_context=None if local else ssl.create_default_context(),timeout=15)
@contextmanager
def conn():
    if not PG:
        active=SQLITE_REQUEST_CONNECTION.get()
        if active and active[0]==str(DB):
            yield active[1];return
        c=sqlite3.connect(DB,timeout=10);c.row_factory=sqlite3.Row
        token=None
        try:
            with c:
                expected=REQUEST_LEARNING_EPOCH.get()
                if expected is not None:
                    c.execute('BEGIN IMMEDIATE')
                    guarded=SQLiteRequestConn(c)
                    token=SQLITE_REQUEST_CONNECTION.set((str(DB),guarded))
                    learning_reset.require_epoch(guarded,expected)
                    yield guarded
                else:yield c
        finally:
            if token is not None:SQLITE_REQUEST_CONNECTION.reset(token)
            c.close()
        return
    # 한 프로세스가 연결 하나를 잠금과 함께 쓴다. 안쪽에서 다시 열면 바깥 트랜잭션에 합쳐진다.
    with _PG_LOCK:
        if _PG['depth']==0:
            if _PG['raw'] is not None and time.time()-_PG['used']>60:
                try:_PG['raw'].cursor().execute('SELECT 1');_PG['raw'].rollback()
                except Exception:_PG['raw']=None
            if _PG['raw'] is None:_PG['raw']=pg_connect()
            _PG['used']=time.time()
        raw=_PG['raw'];_PG['depth']+=1
        try:
            c=PGConn(raw)
            expected=REQUEST_LEARNING_EPOCH.get()
            if expected is not None:learning_reset.require_epoch(c,expected,pg=True)
            yield c
            if _PG['depth']==1:raw.commit()
        except BaseException:
            if _PG['depth']==1:
                try:raw.rollback()
                except Exception:_PG['raw']=None
            raise
        finally:_PG['depth']-=1
PG_SCHEMA=['CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,role TEXT,class_id TEXT,grade INTEGER,room INTEGER,number INTEGER,nickname TEXT,salt BYTEA,secret BYTEA,lookup TEXT,avatar TEXT,active INTEGER DEFAULT 1,created DOUBLE PRECISION,code_enc TEXT)',
    'CREATE UNIQUE INDEX IF NOT EXISTS account_lookup ON accounts(lookup)',
    'CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,owner TEXT NOT NULL,kind TEXT,task TEXT,occurred TEXT,received DOUBLE PRECISION,payload TEXT)',
    'CREATE INDEX IF NOT EXISTS owner_events ON events(owner,received)',
    'CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,owner TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,data BYTEA NOT NULL)',
    'CREATE TABLE IF NOT EXISTS placements(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,published INTEGER NOT NULL,payload TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS resources(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,owner TEXT NOT NULL,published INTEGER NOT NULL,payload TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS checkpoints(owner TEXT PRIMARY KEY,revision INTEGER,state TEXT)',
    'CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value BYTEA)',
    'CREATE TABLE IF NOT EXISTS classes(id TEXT PRIMARY KEY,grade INTEGER,room INTEGER,name TEXT,created DOUBLE PRECISION)',
    'CREATE TABLE IF NOT EXISTS npcs(seq BIGSERIAL,id TEXT NOT NULL,class_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(id,class_id))',
    'CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT NOT NULL,expires DOUBLE PRECISION NOT NULL)',
    'CREATE INDEX IF NOT EXISTS session_uid ON sessions(uid)',
    'CREATE TABLE IF NOT EXISTS login_failures(key TEXT NOT NULL,t DOUBLE PRECISION NOT NULL)',
    'CREATE TABLE IF NOT EXISTS textbook_hits(owner TEXT NOT NULL,t DOUBLE PRECISION NOT NULL)','CREATE INDEX IF NOT EXISTS textbook_hits_owner ON textbook_hits(owner,t)',
    'CREATE INDEX IF NOT EXISTS failure_key ON login_failures(key,t)',
    'CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,owner TEXT NOT NULL,class_id TEXT,created DOUBLE PRECISION NOT NULL,kind TEXT NOT NULL,body TEXT NOT NULL,context TEXT,status TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS report_class ON reports(class_id,created)',
    'CREATE TABLE IF NOT EXISTS board_posts(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,owner TEXT NOT NULL,created DOUBLE PRECISION NOT NULL,updated DOUBLE PRECISION NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,game_id TEXT,status TEXT NOT NULL,solved TEXT)',
    'CREATE INDEX IF NOT EXISTS board_class ON board_posts(class_id,updated)',
    'CREATE TABLE IF NOT EXISTS board_replies(id TEXT PRIMARY KEY,post_id TEXT NOT NULL,class_id TEXT NOT NULL,owner TEXT NOT NULL,created DOUBLE PRECISION NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS reply_class ON board_replies(class_id,created)',
    'CREATE TABLE IF NOT EXISTS class_settings(class_id TEXT PRIMARY KEY,payload TEXT NOT NULL,updated DOUBLE PRECISION)',
    'CREATE TABLE IF NOT EXISTS presence(owner TEXT PRIMARY KEY,class_id TEXT NOT NULL,map TEXT NOT NULL,payload TEXT NOT NULL,updated DOUBLE PRECISION NOT NULL)',
    'CREATE INDEX IF NOT EXISTS presence_map ON presence(class_id,map,updated)',
    'CREATE TABLE IF NOT EXISTS chat_messages(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,owner TEXT NOT NULL,map TEXT,created DOUBLE PRECISION NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL,reason TEXT)',
    'CREATE INDEX IF NOT EXISTS chat_class ON chat_messages(class_id,created)',
    'CREATE INDEX IF NOT EXISTS chat_owner ON chat_messages(owner,created)',
    'CREATE TABLE IF NOT EXISTS coop_state(class_id TEXT NOT NULL,station TEXT NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL,updated DOUBLE PRECISION NOT NULL,PRIMARY KEY(class_id,station))',
    'CREATE TABLE IF NOT EXISTS field_done(owner TEXT NOT NULL,zone TEXT NOT NULL,class_id TEXT,created DOUBLE PRECISION,PRIMARY KEY(owner,zone))',
    'CREATE INDEX IF NOT EXISTS field_done_class ON field_done(class_id)']
PG_SCHEMA += teaching.SCHEMA
PG_SCHEMA += health_inquiry.SCHEMA + health_partner.SCHEMA
PG_SCHEMA += writeup.SCHEMA + answer_support.SCHEMA + learning_metrics.SCHEMA
SCHEMA_VERSION=b'11'
def initialize(seed=True):
    global READY
    if PG:
        try:
            with conn() as c:ok=(c.execute("SELECT value FROM meta WHERE key='schema'").fetchone() or {}).get('value')
        except Exception:ok=None
        if ok is None or bytes(ok)!=SCHEMA_VERSION:
            with conn() as c:
                for q in PG_SCHEMA:c.execute(q)
                c.execute("INSERT INTO meta VALUES('schema',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(SCHEMA_VERSION,))
        with conn() as c:c.execute("INSERT INTO meta VALUES('pepper',?) ON CONFLICT DO NOTHING",(secrets.token_bytes(32),))
        with conn() as c: # 관리자 「전체 코드」용 열. 스키마 번호와 상관없이 없을 때만 더한다.
            if not c.execute("SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='code_enc'").fetchone():c.execute('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS code_enc TEXT')
        PEPPERS.pop(str(DB),None)
        if seed:seed_demo()
        with conn() as c:
            for m in missions().values():teaching.archive(c,m)
        with conn() as c:c.execute("INSERT INTO meta VALUES('learning_epoch',?) ON CONFLICT DO NOTHING",(learning_reset.INITIAL,))
        READY=True;return
    DB.parent.mkdir(parents=True,exist_ok=True)
    with conn() as c:
        c.executescript('''PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,role TEXT,class_id TEXT,grade INTEGER,room INTEGER,number INTEGER,nickname TEXT,salt BLOB,secret BLOB);
        CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,owner TEXT NOT NULL,kind TEXT,task TEXT,occurred TEXT,received REAL,payload TEXT);
        CREATE INDEX IF NOT EXISTS owner_events ON events(owner,received);
        CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,owner TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,data BLOB NOT NULL);
        CREATE TABLE IF NOT EXISTS placements(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,published INTEGER NOT NULL,payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS resources(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,owner TEXT NOT NULL,published INTEGER NOT NULL,payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS checkpoints(owner TEXT PRIMARY KEY,revision INTEGER,state TEXT);
        CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value BLOB);
        CREATE TABLE IF NOT EXISTS classes(id TEXT PRIMARY KEY,grade INTEGER,room INTEGER,name TEXT,created REAL);
        CREATE TABLE IF NOT EXISTS npcs(id TEXT NOT NULL,class_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(id,class_id));
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT NOT NULL,expires REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS session_uid ON sessions(uid);
        CREATE TABLE IF NOT EXISTS login_failures(key TEXT NOT NULL,t REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS textbook_hits(owner TEXT NOT NULL,t REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS textbook_hits_owner ON textbook_hits(owner,t);
        CREATE INDEX IF NOT EXISTS failure_key ON login_failures(key,t);
        CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,owner TEXT NOT NULL,class_id TEXT,created REAL NOT NULL,kind TEXT NOT NULL,body TEXT NOT NULL,context TEXT,status TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS report_class ON reports(class_id,created);
        CREATE TABLE IF NOT EXISTS board_posts(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,owner TEXT NOT NULL,created REAL NOT NULL,updated REAL NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,game_id TEXT,status TEXT NOT NULL,solved TEXT);
        CREATE INDEX IF NOT EXISTS board_class ON board_posts(class_id,updated);
        CREATE TABLE IF NOT EXISTS board_replies(id TEXT PRIMARY KEY,post_id TEXT NOT NULL,class_id TEXT NOT NULL,owner TEXT NOT NULL,created REAL NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS reply_class ON board_replies(class_id,created);
        CREATE TABLE IF NOT EXISTS class_settings(class_id TEXT PRIMARY KEY,payload TEXT NOT NULL,updated REAL);
        CREATE TABLE IF NOT EXISTS presence(owner TEXT PRIMARY KEY,class_id TEXT NOT NULL,map TEXT NOT NULL,payload TEXT NOT NULL,updated REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS presence_map ON presence(class_id,map,updated);
        CREATE TABLE IF NOT EXISTS chat_messages(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,owner TEXT NOT NULL,map TEXT,created REAL NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL,reason TEXT);
        CREATE INDEX IF NOT EXISTS chat_class ON chat_messages(class_id,created);
        CREATE INDEX IF NOT EXISTS chat_owner ON chat_messages(owner,created);
        CREATE TABLE IF NOT EXISTS coop_state(class_id TEXT NOT NULL,station TEXT NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL,updated REAL NOT NULL,PRIMARY KEY(class_id,station));
        CREATE TABLE IF NOT EXISTS field_done(owner TEXT NOT NULL,zone TEXT NOT NULL,class_id TEXT,created REAL,PRIMARY KEY(owner,zone));
        CREATE INDEX IF NOT EXISTS field_done_class ON field_done(class_id);
        ''')
    with conn() as c:c.execute("INSERT INTO meta VALUES('pepper',?) ON CONFLICT DO NOTHING",(secrets.token_bytes(32),)) # 한 번 만들어 커밋한 뒤에만 읽는다.
    PEPPERS.pop(str(DB),None)
    with conn() as c:
        have={r['name'] for r in c.execute('PRAGMA table_info(accounts)')}
        for col,decl in [('lookup','TEXT'),('avatar','TEXT'),('active','INTEGER DEFAULT 1'),('created','REAL'),('code_enc','TEXT')]:
            if col not in have:c.execute(f'ALTER TABLE accounts ADD COLUMN {col} {decl}')
        c.execute('CREATE UNIQUE INDEX IF NOT EXISTS account_lookup ON accounts(lookup)')
    with conn() as c:
        for sql in teaching.SCHEMA:c.execute(sql)
        for sql in health_inquiry.SCHEMA + health_partner.SCHEMA + writeup.SCHEMA + answer_support.SCHEMA + learning_metrics.SCHEMA:c.execute(sql)
        for m in missions().values():teaching.archive(c,m)
    with conn() as c:c.execute("INSERT INTO meta VALUES('learning_epoch',?) ON CONFLICT DO NOTHING",(learning_reset.INITIAL,))
    if seed:seed_demo()
    READY=True
def seed_demo():
    with conn() as c:
        now=time.time();c.execute("INSERT INTO classes VALUES('demo-class',6,2,'6학년 2반',?) ON CONFLICT DO NOTHING",(now,))
        for uid,role,cl,grade,room,num,nick,code in [('demo-7','student','demo-class',6,2,7,'별빛탐험가','STAR-07'),('demo-8','student','demo-class',6,2,8,'바람연구원','WIND-08'),('teacher','teacher','demo-class',6,2,0,'선생님','TEACHER-DEMO'),('admin','admin',None,None,None,0,'관리자','ADMIN-DEMO')]:
            if c.execute('SELECT 1 FROM accounts WHERE id=?',(uid,)).fetchone():c.execute('UPDATE accounts SET lookup=? WHERE id=? AND lookup IS NULL',(code_lookup(c,code),uid));c.execute('UPDATE accounts SET code_enc=? WHERE id=? AND code_enc IS NULL AND lookup=?',(seal_code(c,code),uid,code_lookup(c,code)))
            else:salt,digest=hash_code(code);c.execute('INSERT INTO accounts(id,role,class_id,grade,room,number,nickname,salt,secret,lookup,active,created,code_enc) VALUES(?,?,?,?,?,?,?,?,?,?,1,?,?)',(uid,role,cl,grade,room,num,nick,salt,digest,code_lookup(c,code),now,seal_code(c,code)))
            c.execute('UPDATE accounts SET created=? WHERE id=? AND created IS NULL',(now,uid))

# 접속 코드: 평문은 저장하지 않는다. lookup(HMAC)으로 계정 한 줄을 찾고 scrypt로 확인한다.
# 관리자 「전체 코드」 화면을 위해 code_enc에 코드를 감싸 둔다. 키는 pepper에서 뽑아 데이터베이스 표만 봐서는 읽지 못한다.
def code_key(c):return hmac.new(pepper(c),b'code-view-v1',hashlib.sha256).digest()
def _code_stream(key,nonce,n):return b''.join(hmac.new(key,nonce+i.to_bytes(4,'big'),hashlib.sha256).digest() for i in range((n+31)//32))[:n]
def seal_code(c,code):
    key=code_key(c);nonce=secrets.token_bytes(12);raw=norm_code(code).encode()
    ct=bytes(a^b for a,b in zip(raw,_code_stream(key,nonce,len(raw))))
    return base64.b64encode(nonce+hmac.new(key,nonce+ct,hashlib.sha256).digest()[:16]+ct).decode()
def open_code(c,blob):
    if not blob:return None
    try:raw=base64.b64decode(blob,validate=True)
    except (TypeError,ValueError,binascii.Error):return None
    key=code_key(c);nonce,tag,ct=raw[:12],raw[12:28],raw[28:]
    if len(raw)<29 or not hmac.compare_digest(tag,hmac.new(key,nonce+ct,hashlib.sha256).digest()[:16]):return None
    return bytes(a^b for a,b in zip(ct,_code_stream(key,nonce,len(ct)))).decode()
CODE_WORDS=['STAR','MARS','BEAR','DEER','FERN','HARP','JUMP','DUCK','GEAR','WAVE','NEST','TREE','SAND','CAKE','HAWK','SEED','PEAR','PUMA','ZEBRA','TUNA','CRAB','SWAN','DUNE','CUBE','BEAM','SPARK','EARTH','VENUS','RAVEN','CEDAR','AMBER','BERRY','WHEAT','PEACH','HERB','SUGAR'] # I·L·O 없음
def norm_code(code):return code.strip().upper()
def pepper(c):
    key=str(DB)
    if key not in PEPPERS:PEPPERS[key]=bytes(c.execute("SELECT value FROM meta WHERE key='pepper'").fetchone()['value'])
    return PEPPERS[key]
def code_lookup(c,code):return hmac.new(pepper(c),norm_code(code).encode(),hashlib.sha256).hexdigest()
def hash_code(code):salt=secrets.token_bytes(16);return salt,hashlib.scrypt(norm_code(code).encode(),salt=salt,n=16384,r=8,p=1)
def issue_codes(count,teacher=False):
    """Returns [(code,lookup,salt,digest)] unique among themselves and existing accounts. Hashing happens outside write transactions."""
    with conn() as c:taken={r['lookup'] for r in c.execute('SELECT lookup FROM accounts WHERE lookup IS NOT NULL')};pep=pepper(c)
    out=[]
    while len(out)<count:
        code='-'.join([secrets.choice(CODE_WORDS)]+([secrets.choice(CODE_WORDS)] if teacher else [])+[''.join(secrets.choice('23456789') for _ in range(4))])
        lk=hmac.new(pep,code.encode(),hashlib.sha256).hexdigest()
        if lk in taken:continue
        taken.add(lk);out.append((code,lk,*hash_code(code)))
    return out
def session_key(token):return hashlib.sha256(token.encode()).hexdigest() if token else ''
def drop_sessions(uid,keep=None):
    with conn() as c:c.execute('DELETE FROM sessions WHERE uid=? AND token<>?',(uid,session_key(keep) if keep else ''))
class _Failures:
    def clear(self):
        with conn() as c:c.execute('DELETE FROM login_failures')
FAILURES=_Failures()

# public/vendor/shared/avatar.mjs 의 RANGES·DEFAULT_AVATAR·sanitizeAvatar와 같게 유지한다. 그쪽을 바꾸면 여기도 바꾼다.
STORY_BADGES={'arrive','friends','first-quest','predict','fair-test','recheck','light','repair','detective','magnet','crane','explorer','collector','notes','helper-hand','fieldwork','chuck-fixer','dex-farm','dex-fire','dex-power','dex-future','dex-life','dex-master'} # public/progress.mjs 의 BADGES와 같게
AVATAR_RANGES={'skin':6,'hair':10,'hairColor':11,'face':7,'glasses':4,'beard':3,'top':8,'topColor':14,'top2Color':14,'bottom':4,'bottomColor':14,'gloves':15,'hat':8,'hatColor':14,'back':2,'backColor':14,'look':13,'tint':8}
AVATAR_DEFAULT={'skin':0,'hair':1,'hairColor':0,'face':0,'glasses':0,'beard':0,'top':0,'topColor':3,'top2Color':0,'bottom':0,'bottomColor':4,'gloves':0,'hat':0,'hatColor':5,'back':0,'backColor':2,'look':0,'tint':0}
def sanitize_avatar(src):
    src=src if isinstance(src,dict) else {};out={}
    for key,default in AVATAR_DEFAULT.items():
        v=src.get(key);n=int(v) if type(v) is int or (type(v) is float and v.is_integer()) else default
        out[key]=n if 0<=n<AVATAR_RANGES[key] else default
    return out

# 체험 계정: 반마다 하나, 학생 역할의 0번. 학생 명부와 진행 통계에서 빠지고 게임에서 둘러보기를 쓸 수 있다.
TEST_NUMBER=0
# 코드 없이 둘러보기: 첫 화면에서 누구나 만드는 임시 계정. 체험 계정처럼 둘러보기를 쓰고, 어느 학급에도 속하지 않는다.
# 게시판, AI 도우미, 제보는 쓸 수 없다. 7일이 지난 둘러보기 계정은 새 계정을 만들 때 지운다.
GUEST_CLASS='guest';GUEST_SECONDS=86400;GUEST_DAILY=2000
def public_user(row):
    u={k:row[k] for k in ['id','role','class_id','grade','room','number','nickname']}
    u['test']=row['role']=='student' and row['number']==TEST_NUMBER
    u['guest']=str(row['id']).startswith('guest-')
    try:u['avatar']=json.loads(row['avatar']) if 'avatar' in row.keys() and row['avatar'] else None
    except (ValueError,TypeError):u['avatar']=None
    return u

class Invalid(ValueError):
    """사용자에게 그대로 보여 줄 수 있는 입력 오류."""
class NotFound(Exception):pass

def private_ipv4(host):
    try:a=ipaddress.IPv4Address(host)
    except ValueError:return False
    return any(a in ipaddress.IPv4Network(n) for n in ['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','169.254.0.0/16'])
def host_allowed(host,lan=None,port=None):
    if PUBLIC:return isinstance(host,str) and bool(host)
    lan=LAN if lan is None else lan;port=PORT if port is None else port
    if host in {f'127.0.0.1:{port}',f'localhost:{port}'}:return True
    if not lan or not isinstance(host,str):return False
    name,sep,p=host.rpartition(':')
    return bool(sep) and p==str(port) and private_ipv4(name)
def origin_allowed(origin,host,lan=None,port=None):
    if PUBLIC:return isinstance(host,str) and origin=='https://'+host
    lan=LAN if lan is None else lan;port=PORT if port is None else port
    if not lan:return origin in {f'http://127.0.0.1:{port}',f'http://localhost:{port}'}
    return host_allowed(host,lan,port) and origin=='http://'+host
def lan_addresses():
    found=[]
    try:
        with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as s:s.connect(('8.8.8.8',80));found.append(s.getsockname()[0]) # UDP connect: 패킷을 보내지 않고 기본 경로의 주소만 얻는다.
    except OSError:pass
    try:found+=socket.gethostbyname_ex(socket.gethostname())[2]
    except OSError:pass
    return [ip for ip in dict.fromkeys(found) if private_ipv4(ip)]

STORY_ITEMS={'safety-card','magnifier','map','battery-pair','bulb','wire','switch','sign-badge','motor-part','magnet-core','sun-card','candle','news-clip','mirror-shard'}
QUEST_KINDS={'R3-G04':'game.completed','R3-G05':'workshop.completed','R3-G06':'magnet.completed'}
LEGACY_DONE={'game.completed':'R3-G04','workshop.completed':'R3-G05','magnet.completed':'R3-G06','crane.completed':'R3-G07'}
_REGIONS=[]
# 처음 부를 때 한 번 읽는다. 여러 요청이 동시에 처음 들어와도 목록이 겹쳐 쌓이지 않도록 다 만든 목록을 한 번에 바꿔 넣는다(extend로 덧붙이면 지구가 R6~R20처럼 늘어났다).
def region_games():
    if not _REGIONS:
        data=json.loads((ROOT/'public/regions.json').read_text(encoding='utf-8'))
        _REGIONS[:]=[(key,reg.get('title',key),[g['id'] for z in reg.get('zones',[]) for g in z.get('games',[])]) for key,reg in data.items()]
    return _REGIONS
# 지구 코드(R1~)와 지도 열쇠(farm~)는 regions.json에 적힌 차례로 정한다. 지구를 더하면 여기서부터 모두 따라온다.
def region_codes():return {f'R{i+1}':key for i,(key,_,_) in enumerate(region_games())}
def region_keys():return [key for key,_,_ in region_games()]
_ZONES=[]
def zone_ids():
    if not _ZONES:
        data=json.loads((ROOT/'public/regions.json').read_text(encoding='utf-8'))
        _ZONES[:]=[z['id'] for reg in data.values() for z in reg.get('zones',[])]
    return _ZONES
def region_code_re():return '|'.join(region_codes())
def region_key_re():return '|'.join(region_keys())
def listed_games():return {g for _,_,ids in region_games() for g in ids}
# 학생 상태에 들어갈 수 있는 의뢰: 지도에 오른 의뢰와, 지도 밖에서 여는 의뢰 파일(광장 포털의 북쪽 마을 동토 탐사 R5-G10)
def state_games():return listed_games()|set(missions())
def class_finished(c,cid):
    """학급 학생마다 실제 완료 기록이 있는 의뢰 id 모음."""
    finished={}
    for r in c.execute("SELECT owner,kind,payload FROM events WHERE kind IN ('mission.completed','game.completed','workshop.completed','magnet.completed','crane.completed') AND owner IN (SELECT id FROM accounts WHERE class_id=? AND role='student')",(cid,)):
        gid=LEGACY_DONE.get(r['kind'])
        if not gid:
            try:gid=json.loads(r['payload']).get('gameId')
            except (ValueError,TypeError,AttributeError):gid=None
        if gid:finished.setdefault(r['owner'],set()).add(gid)
    return finished
def class_students(c,cid):
    finished=class_finished(c,cid)
    stats={r['owner']:r for r in c.execute("SELECT owner,MAX(received) last,COUNT(*) n,MAX(CASE WHEN kind='game.completed' THEN 1 ELSE 0 END) g4,MAX(CASE WHEN kind='workshop.completed' THEN 1 ELSE 0 END) g5,MAX(CASE WHEN kind='magnet.completed' THEN 1 ELSE 0 END) g6 FROM events WHERE owner IN (SELECT id FROM accounts WHERE class_id=? AND role='student') GROUP BY owner",(cid,))}
    out=[]
    for a in c.execute("SELECT * FROM accounts WHERE class_id=? AND role='student' AND number<>? ORDER BY number,COALESCE(active,1) DESC,created",(cid,TEST_NUMBER)):
        s=stats.get(a['id'])
        out.append(dict(id=a['id'],number=a['number'],nickname=a['nickname'],active=a['active']!=0,avatar=public_user(a)['avatar'],lastActive=s['last'] if s else None,eventCount=s['n'] if s else 0,quests={'R3-G04':bool(s and s['g4']),'R3-G05':bool(s and s['g5']),'R3-G06':bool(s and s['g6'])},regions=[dict(id=k,title=t,done=len(finished.get(a['id'],set())&set(g)),total=len(g)) for k,t,g in region_games()]))
    return out
# public/wardrobe.mjs 의 WEAR id와 같게 유지한다
WEAR_IDS={'hat-explorer','bag','hat-straw','goggles','hardhat','headphones','cap','pet-drone','pet-sprout','pet-salamander','pet-robot','beanie','cape','cat-ears','solar-wings','pet-starcat','crown'}
REPORT_KINDS={'error','hard','idea','other'}
REPORT_CONTEXT={'view','map','place','gameId','taskId','title','screen','agent','sync','url'}
def report_row(r):
    try:ctx=json.loads(r['context'] or '{}')
    except (ValueError,TypeError):ctx={}
    return {'id':r['id'],'created':r['created'],'kind':r['kind'],'body':r['body'],'status':r['status'],'context':ctx,'nickname':r['nickname'],'number':r['number'],'role':r['role'],'className':r['class_name']}
# ---------------------------------------------------------------- 반 게시판
# 같은 반 학생과 선생님만 읽고 쓴다. 학생 화면에는 닉네임과 캐릭터만 보이고 번호는 선생님 화면에만 보인다.
# 학생이 지운 글과 선생님이 가린 글은 학생에게 내려가지 않지만, 선생님 화면에는 상태와 함께 남는다.
BOARD_KINDS={'question','share'}
BOARD_LIMITS={'post':(15,60),'reply':(60,300)} # 하루에 쓸 수 있는 수(학생, 선생님)
def board_text(v,lo,hi,message,line=False):
    if not isinstance(v,str):raise Invalid(message)
    v=v.replace('\r\n','\n').replace('\r','\n').strip()
    if line:v=' '.join(v.split())
    if not lo<=len(v)<=hi or any(ord(ch)<32 and ch!='\n' for ch in v):raise Invalid(message)
    return v
def board_class(c,u,cid):
    if u['role']=='student':
        if not u['class_id']:raise Invalid('학급이 정해지지 않았어요. 선생님께 알려 주세요.')
        return u['class_id']
    return managed_class(c,u,cid)['id']
def board_author(r,u,staff):
    try:av=json.loads(r['avatar']) if r['avatar'] else None
    except (ValueError,TypeError):av=None
    out={'nickname':r['nickname'] or '알 수 없음','role':r['role'] or 'student','avatar':av,'mine':r['owner']==u['id']}
    if staff and r['role']=='student':out['number']=r['number']
    return out
def board_view(c,u,cid):
    staff=u['role']!='student'
    posts=c.execute('SELECT p.*,a.nickname,a.number,a.role,a.avatar FROM board_posts p LEFT JOIN accounts a ON a.id=p.owner WHERE p.class_id=?'+('' if staff else " AND p.status='shown'")+' ORDER BY p.updated DESC LIMIT 200',(cid,)).fetchall()
    keep={p['id'] for p in posts};replies={}
    for r in c.execute('SELECT r.*,a.nickname,a.number,a.role,a.avatar FROM board_replies r LEFT JOIN accounts a ON a.id=r.owner WHERE r.class_id=?'+('' if staff else " AND r.status='shown'")+' ORDER BY r.created',(cid,)):
        if r['owner']=='ai':continue # 예전 AI 도우미 답(기능을 뺐다)은 보이지 않는다
        if r['post_id'] in keep:replies.setdefault(r['post_id'],[]).append(r)
    finished=class_finished(c,cid);out=[]
    for p in posts:
        rs=[dict(id=r['id'],body=r['body'],created=r['created'],author=board_author(r,u,staff),**({'status':r['status']} if staff else {})) for r in replies.get(p['id'],[])]
        solved=p['solved'] if any(r['id']==p['solved'] and r.get('status','shown')=='shown' for r in rs) else None
        item=dict(id=p['id'],kind=p['kind'],title=p['title'],body=p['body'],gameId=p['game_id'],created=p['created'],updated=p['updated'],solved=solved,author=board_author(p,u,staff),done=bool(p['game_id'] and p['game_id'] in finished.get(p['owner'],set())),replies=rs)
        if staff:item['status']=p['status']
        out.append(item)
    return {'posts':out,'staff':staff}
def board_open(c,cid):
    """친구나 선생님의 답이 아직 없는 질문 수(관리 화면 탭에 표시)."""
    return c.execute("SELECT COUNT(*) FROM board_posts p WHERE p.class_id=? AND p.kind='question' AND p.status='shown' AND NOT EXISTS (SELECT 1 FROM board_replies r WHERE r.post_id=p.id AND r.status='shown' AND r.owner<>'ai')",(cid,)).fetchone()[0]

# ---------------------------------------------------------------- 함께하기
# 선생님이 반마다 켜면 같은 지도의 반 친구가 보이고(몇 초마다 위치를 주고받는다) 채팅을 쓸 수 있다. 처음에는 꺼져 있다.
# 채팅은 욕설, 비하, 성적 표현, 위험한 말, 개인 정보, 링크, 도배를 막는다. 막힌 말도 이유와 함께 남겨 선생님이 「함께하기」 탭에서 본다.
TOGETHER_DEFAULT={'together':False,'chat':False,'muted':[],'weekly':False}
PRESENCE_TTL=12;CHAT_MAX=60;CHAT_GAP=2.0;CHAT_DAILY=300
def class_settings(c,cid):
    r=c.execute('SELECT payload FROM class_settings WHERE class_id=?',(cid,)).fetchone()
    try:raw=json.loads(r['payload']) if r else {}
    except (ValueError,TypeError):raw={}
    out=dict(TOGETHER_DEFAULT);out.update({k:raw[k] for k in TOGETHER_DEFAULT if k in raw})
    out['together']=out['together'] is True;out['chat']=out['chat'] is True and out['together'];out['weekly']=out['weekly'] is True
    out['muted']=[x for x in out['muted'] if isinstance(x,str)][:200] if isinstance(out['muted'],list) else []
    return out
def save_settings(c,cid,st):
    c.execute('INSERT INTO class_settings VALUES(?,?,?) ON CONFLICT(class_id) DO UPDATE SET payload=excluded.payload,updated=excluded.updated',(cid,json.dumps(st,ensure_ascii=False),time.time()))
def world_bounds(m):return (1920,1280) if m=='hub' else (960,960)
def account_avatar(r):
    try:return json.loads(r['avatar']) if r['avatar'] else None
    except (ValueError,TypeError):return None

# 막을 말과 글자가 겹치는 바른 낱말은 먼저 지운다(예: 「시발점」, 「시바견」, 「병자호란」)
CHAT_OK=['시발점','시발역','시바견','병자호란','바보온달']
CHAT_BAD={
    '욕설':['시발','씨발','씨팔','시팔','씨바','시바','씨빨','씨벌','시벌','십알','십새','씹새','씹창','십팔놈','18놈','ㅅㅂ','ㅆㅂ','ㅅㅍ','ㅆㅍ','ㅅ발','ㅆ발','c발','씨ㅂ','시ㅂ',
          '병신','븅신','빙신','ㅂㅅ','ㅄ','지랄','ㅈㄹ','염병','엠창','좆','좃','존나','졸라','ㅈㄴ','ㅈ같','개새','개색','개세끼','개쉐','개쌔','개섹','ㄱㅅㄲ','ㅅㄲ','개같','개소리',
          '개년','개놈','썅','쌍놈','쌍년','미친놈','미친년','미친새','ㅁㅊ','또라이','돌아이','등신','찐따','닥쳐','닥치라','ㄷㅊ','꺼져라','꺼지라','꺼져버','ㄲㅈ','엿먹',
          '니애미','니어미','느금','느개비','애미','애비','니엄마','니아빠','fuck','fck','fuk','shit','bitch','sibal','ssibal','tlqkf','qudtls','wlfkf','dick','nigg','wtf'],
    '비하 표현':['틀딱','급식충','맘충','한남','김치녀','짱깨','쪽바리','깜둥','저능','멍청','바보','루저','못생긴','못생겼','장애인새','병신같'],
    '성적 표현':['섹스','야동','포르노','성관계','야한','sex','porn'],
    '위험한 말':['죽어라','죽을래','죽여','죽일','죽인다','뒤져','뒈져','디져라','자살','자해','죽고싶','때려죽','칼로찔'],
    '개인 정보':['전화번호','폰번호','카톡','카카오톡','인스타','디스코드','디코','틱톡','오픈채팅','오픈톡'],
}
def chat_compact(text,digits=True):
    t=''.join(chr(ord(ch)-0xFEE0) if 0xFF01<=ord(ch)<=0xFF5E else ch for ch in str(text)).lower()
    t=re.sub(r'[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]' if digits else r'[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]','',t)
    for w in CHAT_OK:t=t.replace(w,'')
    return t
def chat_filter(text,recent=()):
    """보낼 수 없는 말이면 이유(욕설, 비하 표현, 성적 표현, 위험한 말, 개인 정보, 링크, 도배)를, 괜찮으면 None을 돌려준다."""
    raw=str(text)
    if re.search(r'0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}',raw) or re.search(r'\d{8,}',re.sub(r'[-.\s]','',raw)):return '개인 정보'
    if re.search(r'[\w.+-]+@[\w-]+\.\w',raw):return '개인 정보'
    if re.search(r'https?:|www\.|\.(com|net|kr|org|io|me|gg|ly|tv)\b',raw.lower()):return '링크'
    # 낱말 안의 기호와 숫자는 지우고(「시1발」, 「ㅅ.ㅂ」), 한 글자씩 띄어 쓴 것만 붙여 본다(「시 발」, 「f u c k」). 「다시 발표」처럼 낱말 사이 띄어쓰기는 그대로 둔다.
    toks=[t for t in (chat_compact(w) for w in raw.split()) if t];chunks=[];prev=''
    for t in toks:
        if chunks and (len(t)==1 or len(prev)==1):chunks[-1]+=t
        else:chunks.append(t)
        prev=t
    letters=chat_compact(raw,False)
    if letters in ('ㅗ','ㅗㅗ') or any('ㅗㅗ' in ch for ch in chunks):return '욕설'
    for ch in chunks:
        plain=re.sub(r'[0-9]','',ch)
        for reason,words in CHAT_BAD.items():
            for w in words:
                if w in plain or w in ch:return reason
    if re.search(r'(.)\1{11,}',raw):return '도배'
    if letters and sum(1 for r in recent if chat_compact(r,False)==letters)>=2:return '도배'
    return None

# 함께 하는 현장 활동: field.json에서 coop가 참인 돌려 맞추기 활동. 반마다 장치 하나를 함께 쓴다(돌리는 사람, 적는 사람).
_FIELD={'mtime':None,'data':{}}
def field_conf():
    f=ROOT/'public'/'field.json';m=f.stat().st_mtime
    if _FIELD['mtime']!=m:_FIELD.update(mtime=m,data=json.loads(f.read_text(encoding='utf-8')))
    return _FIELD['data']
def coop_conf(station):
    q=(field_conf().get('zones') or {}).get(station) if isinstance(station,str) else None
    if not q or not q.get('coop') or q.get('kind')!='dial' or not q.get('record'):return None
    o=q['objs'][0];r=q['record']
    return {'n':len(o['states']),'start':o['start'],'goal':o['goal'],'choices':r['choices'],'answers':r['answers']}
def coop_fresh(conf,now):return {'s':conf['start'],'rec':{},'ops':[],'recs':[],'done':False,'doneAt':0,'by':[],'at':now}
def coop_aged(st,conf,now):
    # 해결한 뒤 60초가 지나면, 아무도 손대지 않은 채 10분이 지나면 처음 상태로 돌아가 다음 모둠이 쓴다
    if (st.get('done') and now-st.get('doneAt',0)>60) or (not st.get('done') and now-st.get('at',now)>600):return coop_fresh(conf,now)
    return st
def coop_view(c,st,conf):
    ids=sorted(set(st['ops'])|set(st['recs'])|set(st['by']))
    names={r['id']:r['nickname'] for r in c.execute('SELECT id,nickname FROM accounts WHERE id IN ('+','.join('?'*len(ids))+')',tuple(ids))} if ids else {}
    return {'s':st['s'],'rec':st['rec'],'ok':{k:conf['answers'][int(k)]==v for k,v in st['rec'].items() if k.isdigit() and int(k)<conf['n']},'done':st['done'],
            'by':st['by'],'byNames':[names.get(i,'친구') for i in st['by']],'ops':[names.get(i,'친구') for i in st['ops']][-3:],'recs':[names.get(i,'친구') for i in st['recs']][-3:]}

# 반 공동 목표: 반 학생(체험 계정 제외)이 해결한 의뢰와 현장 활동을 지구별로 모은다
def all_games():return sorted(set(missions())|{'R3-G04','R3-G05','R3-G06','R3-G07'})
OPTIONAL_REGIONS={'R5'} # 학습보완 단원 지구: 엔딩과 반 복구 탑 비율에 넣지 않는다
def class_goal(c,cid):
    ids=[r['id'] for r in c.execute("SELECT id FROM accounts WHERE class_id=? AND role='student' AND number<>? AND COALESCE(active,1)<>0",(cid,TEST_NUMBER))]
    n=len(ids);fin=class_finished(c,cid);games=all_games();fields={}
    for r in c.execute('SELECT owner,zone FROM field_done WHERE class_id=?',(cid,)):fields.setdefault(r['owner'],set()).add(r['zone'])
    regions={}
    fzones=list(field_conf().get('zones',{}))
    for rk,zp in region_codes().items():
        gs={g for g in games if g.startswith(rk+'-')}
        nf=sum(1 for z in fzones if z.startswith(zp+'-'))
        regions[rk]={'solved':sum(len(fin.get(s,set())&gs) for s in ids),'fields':sum(1 for s in ids for z in fields.get(s,()) if z.startswith(zp+'-')),'target':n*(len(gs)+nf)}
    # 탑의 깃발(전체 비율)은 엔딩처럼 1~4단원 네 지구로 센다. 푸른 생활 지구(학습보완 단원)는 자기 막대만 차오른다.
    main=[r for rk,r in regions.items() if rk not in OPTIONAL_REGIONS]
    done=sum(r['solved']+r['fields'] for r in main);target=sum(r['target'] for r in main)
    return {'students':n,'regions':regions,'done':done,'target':target,'percent':round(100*done/target,1) if target else 0}

# ---------------------------------------------------------------- 배움 현황, 내 배움 지도, 이번 주 반짝 탐험가
# 공용 미션 기록(mission.answered, mission.hint, mission.completed)을 학생과 과제별로 모은다.
# 첫 시도는 학생이 그 과제에 처음 낸 답이다(새 모험으로 다시 풀어도 처음 답이 남는다).
_STANDARDS={'stamp':None,'data':None}
def standards_conf():
    path=ROOT/'public/standards.json';stamp=path.stat().st_mtime
    if _STANDARDS['stamp']!=stamp:_STANDARDS.update(stamp=stamp,data=json.loads(path.read_text(encoding='utf-8')))
    return _STANDARDS['data']
# 처음 생각을 묻는 진단 과제 가운데, 의뢰를 끝낸 뒤 광장의 달새가 다시 묻는 과제(답은 내 배움 지도에 처음 생각과 나란히 보인다)
RETHINK=['R1-G01.T02','R1-G01.T03','R3-G01.T01','R3-G03.T03','R3-G03.T07','R3-G14.T01'] # 회로 카드 예상(R3-G02.T06)은 카드 그림 없이 물을 수 없어 뺐다
def task_index():
    """과제 id(R1-G01.T02)로 (미션, 과제)를 찾는 표. 미션 파일 확인은 요청마다 한 번만 한다."""
    ms=missions();return ms,{m['id']+'.'+t['id']:(m,t) for m in ms.values() for t in m['tasks']}
def short_text(v,n=24):
    v=' '.join(str(v).split());return v if len(v)<=n else v[:n-1]+'…'
def answer_label(task,p):
    """학생이 고른 답을 짧은 말로 바꾼다(반 배움 현황의 「자주 고른 답」)."""
    kind=task['type'];a=p.get('answer') or '';roles=p.get('roles') or {}
    lab=lambda xs,i:next((x.get('label',x['id']) for x in xs if x['id']==i),str(i))
    try:
        if kind=='choice':return lab(task['options'],a)
        if kind=='multi':return ', '.join(lab(task['options'],x) for x in a.split(',') if x)
        if kind=='quiz':
            parts=[q for q in task['parts'] if q.get('key') is not None and roles.get(q['id'])!=q['key']] or task['parts']
            return f"{short_text(parts[0].get('prompt',''),18)}: {lab(parts[0]['options'],roles.get(parts[0]['id']))}"
        if kind=='sort':
            return ', '.join(f"{lab(task['items'],k)} → {lab(task['bins'],roles.get(k))}" for k,v in (task.get('key') or {}).items() if roles.get(k)!=v and k in roles)
        if kind=='fill':
            blanks={b['id']:b for b in task['blanks']}
            return ', '.join(lab(blanks[k]['options'],roles.get(k)) for k,v in (task.get('key') or {}).items() if k in blanks and roles.get(k)!=v)
        if kind=='order':return ' > '.join(short_text(lab(task['cards'],x),10) for x in a.split(',') if x)
        if kind=='find':return ', '.join(lab(task['spots'],x) for x in a.split(',') if x) or '고르지 않음'
        if kind=='word':return norm_word(a)
        if kind=='number' and not task.get('fields'):return a.strip()+(task.get('unit') or '')
    except (KeyError,TypeError,IndexError):return ''
    return ''
def rethink_parts(task):
    """진단 과제를 문항 목록으로 맞춘다. 분류 과제는 카드 하나가 한 문항이다."""
    if task['type']=='quiz':return [{'id':q['id'],'prompt':q.get('prompt',''),'options':q['options'],'key':q.get('key')} for q in task['parts']]
    if task['type']=='sort':return [{'id':i['id'],'prompt':i['label'],'options':task['bins'],'key':(task.get('key') or {}).get(i['id'])} for i in task['items']]
    if task['type']=='choice':return [{'id':'answer','prompt':task['title'],'options':task['options'],'key':task.get('key')}]
    return []
def part_answer(task,part,p):return (p.get('answer') if task['type']=='choice' else (p.get('roles') or {}).get(part['id']))
def learn_events(c,ids):
    """학생들의 공용 미션 기록을 받은 차례대로 돌려준다."""
    out=[]
    for i in range(0,len(ids),200):
        part=ids[i:i+200]
        for r in c.execute("SELECT owner,kind,received,payload FROM events WHERE kind IN ('mission.answered','mission.hint','mission.completed') AND owner IN ("+','.join('?'*len(part))+')',tuple(part)):
            try:p=json.loads(r['payload'])
            except (ValueError,TypeError):continue
            if isinstance(p,dict):out.append((r['received'] or 0,r['owner'],r['kind'],p))
    out.sort(key=lambda x:x[0]);return out
def learn_digest(events,idx):
    """학생과 과제마다 첫 시도, 도움을 본 횟수, 진단 과제의 처음 답과 마지막 답, 의뢰를 끝내며 남긴 말을 모은다."""
    first,hints,diag,notes={},{},{},{}
    for t,o,k,p in events:
        if k=='mission.completed':
            if p.get('gameId') and str(p.get('answer','')).strip():notes[(o,p['gameId'])]=(t,str(p['answer']).strip())
            continue
        tid=p.get('taskId','')
        if k=='mission.hint':hints[(o,tid)]=hints.get((o,tid),0)+1;continue
        task=idx.get(tid,(None,None))[1]
        if not task:continue
        if task.get('diagnostic'):
            d=diag.setdefault((o,tid),{'first':p,'last':p,'n':0,'at':t});d['last']=p;d['n']+=1;d['at']=t
        elif (o,tid) not in first:first[(o,tid)]=p
    return {'first':first,'hints':hints,'diag':diag,'notes':notes}
def finished_of(c,uid):
    done=set()
    for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind IN ('mission.completed','game.completed','workshop.completed','magnet.completed','crane.completed')",(uid,)):
        gid=LEGACY_DONE.get(r['kind'])
        if not gid:
            try:gid=json.loads(r['payload']).get('gameId')
            except (ValueError,TypeError,AttributeError):gid=None
        if gid:done.add(gid)
    return done
def class_roster(c,cid):
    return [dict(r) for r in c.execute("SELECT id,number,nickname FROM accounts WHERE class_id=? AND role='student' AND number<>? AND COALESCE(active,1)<>0 ORDER BY number",(cid,TEST_NUMBER))]
def class_learning(c,cid):
    """관리 화면 「배움 현황」: 성취기준별 해결, 의뢰별 해결, 처음에 많이 틀린 과제, 도움을 많이 본 과제, 처음 생각 조사, 과학 도감."""
    pop=class_roster(c,cid);ids=[x['id'] for x in pop];n=len(ids);conf=standards_conf();fin=class_finished(c,cid);ms,idx=task_index()
    evs=learn_events(c,ids);dg=learn_digest(evs,idx)
    started={}
    for (o,tid) in [*dg['first'],*dg['diag']]:started.setdefault(tid.split('.')[0],set()).add(o)
    games=[]
    for gid,g in conf['games'].items():
        solved={x for x in ids if gid in fin.get(x,())}
        games.append({'id':gid,'title':g['title'],'region':g['region'],'solved':len(solved),'started':len(started.get(gid,set())-solved) if gid in ms else None})
    standards=[]
    for code,st in conf['standards'].items():
        gs=[gid for gid,g in conf['games'].items() if code in g['codes']]
        per={x:sum(1 for g in gs if g in fin.get(x,())) for x in ids}
        standards.append({'code':code,'short':st['short'],'text':st['text'],'region':st['region'],'games':len(gs),'solved':sum(per.values()),'target':n*len(gs),
                          'all':sum(1 for v in per.values() if v==len(gs)),'none':[{'number':x['number'],'nickname':x['nickname']} for x in pop if per[x['id']]==0]})
    agg={}
    for (o,tid),p in dg['first'].items():
        if 'correct' not in p:continue
        a=agg.setdefault(tid,{'tried':0,'ok':0,'wrong':Counter()});a['tried']+=1
        if p['correct'] is True:a['ok']+=1
        else:
            task=idx.get(tid,(None,None))[1];label=answer_label(task,p) if task else ''
            if label:a['wrong'][label]+=1
    helpers=Counter(tid for (o,tid) in dg['hints'])
    def row(tid,tried,ok,wrong=None):
        m,t=idx[tid];w=wrong.most_common(1) if wrong else []
        return {'id':tid,'gameId':m['id'],'gameTitle':m['title'],'title':t['title'],'tried':tried,'ok':ok,'rate':round(100*ok/tried) if tried else None,'wrong':{'label':w[0][0],'count':w[0][1]} if w else None,'hints':helpers.get(tid,0)}
    need=3 if n>=6 else 1
    hard=sorted((row(tid,a['tried'],a['ok'],a['wrong']) for tid,a in agg.items() if a['tried']>=need and a['ok']<a['tried'] and tid in idx),key=lambda r:(r['rate'],-r['tried']))[:10]
    helped=sorted((row(tid,agg.get(tid,{}).get('tried',0),agg.get(tid,{}).get('ok',0)) for tid in helpers if tid in idx),key=lambda r:-r['hints'])[:5]
    rethink=[]
    for tid in RETHINK:
        if tid not in idx:continue
        m,t=idx[tid]
        rows=[v for (o,x),v in dg['diag'].items() if x==tid];again=[v['last'] for v in rows if v['n']>1]
        def dist(ps,part):
            cnt=Counter(part_answer(t,part,q) for q in ps)
            return [{'label':o.get('label',o['id']),'count':cnt[o['id']],'key':o['id']==part['key']} for o in part['options'] if cnt[o['id']]]
        rethink.append({'id':tid,'gameId':m['id'],'gameTitle':m['title'],'title':t['title'],'first':len(rows),'again':len(again),
                        'parts':[{'prompt':pt['prompt'],'keyed':pt['key'] is not None,'first':dist([v['first'] for v in rows],pt),'again':dist(again,pt)} for pt in rethink_parts(t)]})
    return {'students':n,'standards':standards,'regions':conf['regions'],'games':games,'hard':hard,'helped':helped,'rethink':rethink,'duels':class_duels(c,ids),'dex':class_dex(c,pop,evs),'poe':class_poe(c,ids),'writeup':class_writeup(c,pop)}
def class_writeup(c,pop):
    """관리 화면 「설명 쓰기」: 학생마다 그 의뢰에 마지막으로 보낸 설명을 기준으로 센다. 꼭 넣을 말은 낱말이 들어 있는지만 센 수다."""
    conf=writeup.items(ROOT);names={x['id']:x for x in pop};ids=list(names)
    if not conf or not ids:return []
    per={}
    for i in range(0,len(ids),200):
        part=ids[i:i+200]
        for r in c.execute("SELECT id,owner,received,payload FROM events WHERE kind='writeup.submitted' AND owner IN ("+','.join('?'*len(part))+')',tuple(part)):
            try:p=json.loads(r['payload'])
            except (ValueError,TypeError):continue
            if isinstance(p,dict) and p.get('gameId') in conf:per.setdefault((r['owner'],p['gameId']),[]).append((r['received'] or 0,r['id'],p))
    reviews={}
    every=[eid for v in per.values() for _,eid,_ in v]
    for i in range(0,len(every),200):
        part=every[i:i+200]
        for r in c.execute('SELECT event_id,payload FROM event_reviews WHERE event_id IN ('+','.join('?'*len(part))+')',tuple(part)):reviews[r['event_id']]=json.loads(r['payload'])
    out=[]
    for gid,item in conf.items():
        rows={o:sorted(v,key=lambda x:x[0]) for (o,g),v in per.items() if g==gid}
        if not rows:
            out.append({'gameId':gid,'gameTitle':missions()[gid]['title'] if gid in missions() else gid,'title':item['title'],'terms':[t['word'] for t in item.get('terms',[])],'students':0});continue
        count=Counter();waiting=[]
        for o,v in rows.items():
            written=[p for _,_,p in v if p.get('mode')=='written']
            if written:count['written']+=1
            if len(written)>1:count['revised']+=1
            if any(p.get('mode')=='oral_teacher' for _,_,p in v):count['oral']+=1
            if written and written[-1].get('terms') and all(t.get('used') for t in written[-1]['terms']):count['allTerms']+=1
            st=(reviews.get(v[-1][1]) or {}).get('status','pending');count[st]+=1
            if st=='pending' and o in names:waiting.append(f"{names[o]['number']}번 {names[o]['nickname']}")
        out.append({'gameId':gid,'gameTitle':missions()[gid]['title'] if gid in missions() else gid,'title':item['title'],'terms':[t['word'] for t in item.get('terms',[])],'students':len(rows),
                    **{k:count[k] for k in ('written','revised','oral','allTerms','pending','revise','confirmed','insufficient')},'waiting':waiting})
    return out
def class_poe(c,ids):
    """관리 화면 「예상과 새 조건」: 실험 장면 앞에서 처음 고른 예상, 결과를 본 뒤 돌아본 생각, 새 조건 문제의 첫 시도와 다시 고른 결과."""
    ms=missions();pred,refl,trans={},{},{}
    for i in range(0,len(ids),200):
        part=ids[i:i+200]
        for r in c.execute("SELECT owner,kind,received,payload FROM events WHERE kind IN ('mission.predicted','mission.reflected','mission.transfer') AND owner IN ("+','.join('?'*len(part))+')',tuple(part)):
            try:p=json.loads(r['payload'])
            except (ValueError,TypeError):continue
            if not isinstance(p,dict) or p.get('evaluation')=='version_unavailable':continue
            o=r['owner'];tid=str(p.get('taskId',''));at=r['received'] or 0
            if r['kind']=='mission.predicted':
                k=(o,tid.rsplit('.',1)[0])
                if k not in pred or at<pred[k][0]:pred[k]=(at,p) # 학생마다 처음 예상
            elif r['kind']=='mission.reflected':
                k=(o,tid.rsplit('.',1)[0])
                if k not in refl or at>=refl[k][0]:refl[k]=(at,p) # 마지막으로 고른 생각
            elif p.get('gameId'):trans.setdefault((o,p['gameId']),[]).append((at,p))
    predict=[];transfer=[]
    for gid,m in ms.items():
        for t in m['tasks']:
            pr=t.get('predict');key=f"{gid}.{t['id']}"
            ps=[p for (o,k),(at,p) in pred.items() if k==key] if pr else []
            if not ps:continue
            cnt=Counter(p.get('answer') for p in ps);rs=Counter(p.get('answer') for (o,k),(at,p) in refl.items() if k==key)
            predict.append({'gameId':gid,'gameTitle':m['title'],'title':t['title'],'question':pr['question'],'students':len(ps),'matched':cnt[pr['key']],
                'options':[{'label':o['label'],'count':cnt[o['id']],'key':o['id']==pr['key']} for o in [*pr['options'],{'id':'unsure','label':'잘 모르겠어요'}] if cnt[o['id']]],
                'reflect':[{'label':REFLECT_LABELS[x],'count':rs[x]} for x in REFLECT_LABELS if rs[x]]})
        tr=m.get('transfer')
        rows=[sorted(v,key=lambda x:x[0]) for (o,g),v in trans.items() if g==gid] if tr else []
        if not rows:continue
        labels={o['id']:o['label'] for o in tr['options']};first_ok=later_ok=skipped=0;wrong=Counter()
        for v in rows:
            tries=[p for at,p in v if 'correct' in p]
            if tries and tries[0]['correct'] is True:first_ok+=1
            elif any(p['correct'] is True for p in tries):later_ok+=1
            elif any(p.get('evaluation')=='skipped' for at,p in v):skipped+=1
            if tries and tries[0]['correct'] is False and tries[0].get('answer') in labels:wrong[labels[tries[0]['answer']]]+=1
        w=wrong.most_common(1)
        transfer.append({'gameId':gid,'gameTitle':m['title'],'question':tr['question'],'situation':tr.get('situation',''),'students':len(rows),'firstOk':first_ok,'laterOk':later_ok,'skipped':skipped,'wrong':{'label':w[0][0],'count':w[0][1]} if w else None})
    predict.sort(key=lambda r:(r['matched']/r['students'],-r['students']))
    transfer.sort(key=lambda r:(r['firstOk']/r['students'],-r['students']))
    return {'predict':predict[:12],'transfer':transfer[:12]}
def my_learning(c,u):
    """학생 퀘스트 수첩 「내 배움 지도」: 의뢰별 해결과 한 번에 맞힌 과제, 처음 생각과 지금 생각, 의뢰를 끝내며 남긴 말."""
    uid=u['id'];conf=standards_conf();ms,idx=task_index();dg=learn_digest(learn_events(c,[uid]),idx);fin=finished_of(c,uid)
    games={gid:{'title':g['title'],'done':gid in fin,'tried':0,'ok':0} for gid,g in conf['games'].items()}
    for (o,tid),p in dg['first'].items():
        g=games.get(tid.split('.')[0])
        if g and 'correct' in p:g['tried']+=1;g['ok']+=p['correct'] is True
    rethink=[]
    for tid in RETHINK:
        m,t=idx.get(tid,(None,None));d=dg['diag'].get((uid,tid))
        if not t or not d:continue
        parts=[]
        for pt in rethink_parts(t):
            lab=lambda q:(next((o.get('label',o['id']) for o in pt['options'] if o['id']==part_answer(t,pt,q)),None))
            item={'id':pt['id'],'prompt':pt['prompt'],'options':[{'id':o['id'],'label':o.get('label',o['id'])} for o in pt['options']],'first':lab(d['first']),'now':lab(d['last']) if d['n']>1 else None}
            if pt['key'] is not None:item.update(firstOk=part_answer(t,pt,d['first'])==pt['key'],nowOk=part_answer(t,pt,d['last'])==pt['key'] if d['n']>1 else None)
            parts.append(item)
        rethink.append({'id':tid,'gameId':m['id'],'gameTitle':m['title'],'title':t['title'],'type':t['type'],'done':m['id'] in fin,'parts':parts})
    notes=[{'gameId':g,'title':conf['games'].get(g,{}).get('title',g),'answer':a,'at':t} for (o,g),(t,a) in dg['notes'].items()]
    notes.sort(key=lambda x:-x['at'])
    return {'standards':conf['standards'],'regions':conf['regions'],'gameCodes':{g:v['codes'] for g,v in conf['games'].items()},'games':games,'rethink':rethink,'notes':notes}
# 이번 주 반짝 탐험가: 월요일 0시(한국 시간)에 새로 시작한다. 점수나 정답률 순위는 두지 않는다. 갈래는 다섯(의뢰, 도감 카드, 현장 활동, 도움이 된 답, 지난주보다 많이 맞힌 과제).
WEEKLY_CATS=[('missions','새로 해결한 의뢰'),('dex','새로 모은 도감 카드'),('fields','현장 활동'),('helpful','도움이 된 답'),('growth','지난주보다 많이 맞힌 과제')]
def week_bounds(now=None):
    k=(time.time() if now is None else now)+9*3600
    start=(k-4*86400)//604800*604800+4*86400-9*3600
    return start,start+604800
def class_weekly(c,cid,uid=None,staff=False,now=None):
    start,end=week_bounds(now);last=start-604800
    pop={x['id']:x for x in class_roster(c,cid)};vals={k:Counter() for k,_ in WEEKLY_CATS};prev=Counter()
    firstdone={}
    for r in c.execute("SELECT owner,kind,received,payload FROM events WHERE kind IN ('mission.completed','game.completed','workshop.completed','magnet.completed','crane.completed') AND owner IN (SELECT id FROM accounts WHERE class_id=? AND role='student')",(cid,)):
        gid=LEGACY_DONE.get(r['kind'])
        if not gid:
            try:gid=json.loads(r['payload']).get('gameId')
            except (ValueError,TypeError,AttributeError):gid=None
        key=(r['owner'],gid)
        if gid and (key not in firstdone or (r['received'] or 0)<firstdone[key]):firstdone[key]=r['received'] or 0
    for (o,g),t in firstdone.items():
        if start<=t<end:vals['missions'][o]+=1
    # 새로 모은 도감 카드: 학생 화면의 도감과 같은 회차에서, 이번 주에 처음 열린 카드 수
    runs=class_runs(c,list(pop));dexev={};kinds=('mission.answered','mission.completed')+tuple(k for *_,k in CUSTOM_GAMES)
    for r in c.execute('SELECT owner,kind,received,payload FROM events WHERE kind IN ('+','.join('?'*len(kinds))+") AND received<? AND owner IN (SELECT id FROM accounts WHERE class_id=? AND role='student')",(*kinds,end,cid)):
        try:dexev.setdefault(r['owner'],[]).append({'kind':r['kind'],'received':r['received'] or 0,'payload':json.loads(r['payload'])})
        except (ValueError,TypeError):continue
    for o in pop:
        n=sum(1 for t in dex_times(dexev.get(o,[]),runs.get(o)).values() if start<=t<end)
        if n:vals['dex'][o]=n
    for r in c.execute('SELECT owner FROM field_done WHERE class_id=? AND created>=? AND created<?',(cid,start,end)):vals['fields'][r['owner']]+=1
    for r in c.execute("SELECT r.owner FROM board_replies r JOIN board_posts p ON p.solved=r.id WHERE r.class_id=? AND r.status='shown' AND p.status='shown' AND r.created>=? AND r.created<?",(cid,start,end)):vals['helpful'][r['owner']]+=1
    seen=set()
    for r in c.execute("SELECT owner,received,payload FROM events WHERE kind='mission.answered' AND received>=? AND received<? AND owner IN (SELECT id FROM accounts WHERE class_id=? AND role='student')",(last,end,cid)):
        try:p=json.loads(r['payload'])
        except (ValueError,TypeError):continue
        now_week=r['received']>=start;key=(r['owner'],p.get('runId'),p.get('taskId'),now_week)
        if p.get('correct') is not True or key in seen:continue
        seen.add(key);(vals['growth'] if now_week else prev)[r['owner']]+=1
    this_week=Counter(vals['growth']);vals['growth']=Counter({o:this_week[o]-prev[o] for o in pop})
    cats=[]
    for k,title in WEEKLY_CATS:
        ranked=sorted(((o,v) for o,v in vals[k].items() if v>0 and o in pop),key=lambda t:(-t[1],pop[t[0]]['number'] or 0))
        cut=ranked[2][1] if len(ranked)>2 else 0
        shown=[(o,v) for o,v in ranked if v>=cut]
        top=[{'nickname':pop[o]['nickname'],'value':v,'mine':o==uid,**({'number':pop[o]['number']} if staff else {})} for o,v in shown[:6]]
        item={'id':k,'title':title,'top':top,'more':len(shown)-len(top)} # 같은 기록이 많아 다 보이지 못한 친구 수
        if uid in pop:
            item['me']=vals[k].get(uid,0)
            if k=='growth':item.update(now=this_week.get(uid,0),last=prev.get(uid,0))
        cats.append(item)
    return {'start':start,'end':end,'cats':cats}

# ---------------------------------------------------------------- 척척 오류 대결
# 지구 지도 가운데의 「척척 지구 단말」이 그 지구에서 배운 내용을 틀리게 말하고, 학생은 의뢰에서 찾은 증거로 반박한다(data/duels.json).
# 그 지구 의뢰를 모두 해결하면 열리고(체험 계정과 둘러보기는 바로 열림), 틀려도 손해 없이 다시 고른다. 정답 열쇠는 학생에게 보내지 않는다.
_DUELS={'stamp':None,'data':None}
def duel_region():return region_codes()
def duels_conf():
    path=ROOT/'data'/'duels.json';stamp=path.stat().st_mtime
    if _DUELS['stamp']!=stamp:_DUELS.update(stamp=stamp,data=json.loads(path.read_text(encoding='utf-8')))
    return _DUELS['data']
def duel_progress(c,u,region):
    conf=duels_conf()[region];games={g for k,_,ids in region_games() if k==duel_region()[region] for g in ids}
    left=len(games-finished_of(c,u['id']));fixed=set();done=False
    for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind IN ('duel.answered','duel.completed')",(u['id'],)):
        try:p=json.loads(r['payload'])
        except (ValueError,TypeError):continue
        if not isinstance(p,dict) or p.get('region')!=region:continue
        if r['kind']=='duel.completed':done=True
        elif p.get('correct') is True:fixed.add(p.get('claim'))
    ids=[x['id'] for x in conf['claims']]
    return {'region':region,'title':conf['title'],'ready':left==0 or bool(u.get('guest') or u.get('test')),'left':left,'done':done,'total':len(ids),
            'fixed':[i for i in ids if i in fixed],'claims':[{'id':x['id'],'claim':x['claim'],'options':x['options']} for x in conf['claims']],'doneLines':conf['done']}
def duel_event(c,uid,kind,payload):
    now=time.time()
    c.execute('INSERT INTO events VALUES(?,?,?,?,?,?,?)',('duel-'+secrets.token_hex(12),uid,kind,'duel',time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(now)),now,json.dumps(payload,ensure_ascii=False)))
def class_duels(c,ids):
    """배움 현황의 「척척 오류 대결」: 지구마다 이긴 학생 수, 틀린 말마다 첫 반박에 맞힌 학생과 자주 고른 답."""
    conf=duels_conf();first={};done={}
    for i in range(0,len(ids),200):
        part=ids[i:i+200]
        for r in c.execute("SELECT owner,kind,received,payload FROM events WHERE kind IN ('duel.answered','duel.completed') AND owner IN ("+','.join('?'*len(part))+') ORDER BY received',tuple(part)):
            try:p=json.loads(r['payload'])
            except (ValueError,TypeError):continue
            if not isinstance(p,dict):continue
            if r['kind']=='duel.completed':done.setdefault(p.get('region'),set()).add(r['owner'])
            else:first.setdefault((r['owner'],p.get('region'),p.get('claim')),p)
    out=[]
    for region,v in conf.items():
        claims=[]
        for x in v['claims']:
            ps=[p for (o,rg,cl),p in first.items() if rg==region and cl==x['id']];wrong=Counter(p.get('label','') for p in ps if p.get('correct') is not True).most_common(1)
            claims.append({'id':x['id'],'claim':x['claim'],'tried':len(ps),'ok':sum(1 for p in ps if p.get('correct') is True),'wrong':{'label':wrong[0][0],'count':wrong[0][1]} if wrong else None})
        out.append({'region':region,'title':v['title'],'done':len(done.get(region,set())),'started':len({o for (o,rg,cl) in first if rg==region}),'claims':claims})
    return out

# ---------------------------------------------------------------- 과학 도감
# 의뢰에서 만난 개념, 실험 도구, 현상, 직업을 카드로 모은다(data/dex.json). 같은 회차에 맞힌 과제나 끝낸 의뢰가 카드를 연다.
# 아직 열리지 않은 카드는 이름과 설명을 보내지 않고, 만날 곳만 알려 준다.
_DEX={'stamp':None,'data':None}
# 전용 화면으로 진행하는 전력망 의뢰: (게임 id, 의뢰 이름, 장소, 구역, 끝낸 기록 종류)
CUSTOM_GAMES=[('R3-G04','어두운 안내판에 빛을','관리실 빛 자물쇠','power-1','game.completed'),('R3-G05','항구의 장치를 고쳐요','가린 회로 추리','power-1','workshop.completed'),('R3-G06','철을 붙였다 놓는 공방','부두 전자석 공방','power-2','magnet.completed'),('R3-G07','화물을 놓지 못하는 크레인','고철 부두 크레인','power-2','crane.completed')]
def dex_conf():
    path=ROOT/'data'/'dex.json';stamp=path.stat().st_mtime
    if _DEX['stamp']!=stamp:_DEX.update(stamp=stamp,data=json.loads(path.read_text(encoding='utf-8')))
    return _DEX['data']
def run_progress(events,run):
    """같은 회차 기록에서 끝낸 의뢰(R3-G04)와 맞힌 과제(R1-G01.T02)를 모은다. events: [{'kind','payload'}]"""
    games,tasks=set(),set();custom={k:g for g,_,_,_,k in CUSTOM_GAMES}
    for e in events:
        p=e['payload'];k=e['kind']
        if not isinstance(p,dict) or p.get('runId')!=run:continue
        if k=='mission.answered' and p.get('correct') is not False and p.get('taskId'):tasks.add(p['taskId'])
        elif k=='mission.completed' and p.get('gameId'):games.add(p['gameId'])
        elif k in custom and p.get('gameId')==custom[k]:games.add(custom[k])
    return games,tasks
def dex_open(card,games,tasks):return any(s in games or s in tasks for s in card['at'])
def dex_got(games,tasks):return [{'id':x['id'],'name':x['name'],'region':x['region']} for x in dex_conf()['cards'] if dex_open(x,games,tasks)]
def dex_region_totals():return dict(Counter(x['region'] for x in dex_conf()['cards']))
def dex_events(c,uid):
    kinds=('mission.answered','mission.completed')+tuple(k for *_,k in CUSTOM_GAMES)
    out=[]
    for r in c.execute('SELECT kind,payload FROM events WHERE owner=? AND kind IN ('+','.join('?'*len(kinds))+')',(uid,*kinds)):
        try:out.append({'kind':r['kind'],'payload':json.loads(r['payload'])})
        except (ValueError,TypeError):continue
    return out
def dex_view(games,tasks,game=None):
    """도감 화면: 지구별 모은 수와 카드 목록. game을 주면 그 의뢰에서 만나는 카드만 돌려준다(의뢰 마무리 화면)."""
    conf=dex_conf();ms=missions();custom={g:(t,p) for g,t,p,_,_ in CUSTOM_GAMES}
    def where(src):
        gid=src.split('.')[0];m=ms.get(gid);title,place=(m['quest'],m['place']) if m else custom.get(gid,(gid,''))
        return {'gameId':gid,'title':title,'place':place}
    regions,cards={},[]
    for no,x in enumerate(conf['cards'],1):
        ok=dex_open(x,games,tasks);r=regions.setdefault(x['region'],{'got':0,'total':0});r['total']+=1;r['got']+=ok
        if game and not any(s.split('.')[0]==game for s in x['at']):continue
        card={'id':x['id'],'no':no,'region':x['region'],'kind':x['kind'],'key':bool(x.get('key')),'bonus':bool(x.get('bonus')),'got':ok,'where':where(x['at'][0])}
        if ok:card.update(name=x['name'],text=x['text'],note=x.get('note',''),see=x.get('see',[]))
        cards.append(card)
    return {'total':len(conf['cards']),'got':sum(v['got'] for v in regions.values()),'kinds':conf['kinds'],'regions':regions,'cards':cards}
def class_runs(c,ids):
    """학생마다 저장 상태(checkpoints)에 적힌 지금 회차 id."""
    runs={}
    for i in range(0,len(ids),200):
        part=ids[i:i+200]
        for r in c.execute('SELECT owner,state FROM checkpoints WHERE owner IN ('+','.join('?'*len(part))+')',tuple(part)):
            try:runs[r['owner']]=(json.loads(r['state']) or {}).get('runId')
            except (ValueError,TypeError,AttributeError):pass
    return runs
def dex_times(events,run):
    """같은 회차 기록에서 카드마다 처음 열린 때(기록을 받은 시각). events: [{'kind','received','payload'}]"""
    first={};custom={k:g for g,_,_,_,k in CUSTOM_GAMES}
    for e in events:
        p=e['payload'];k=e['kind'];t=e.get('received') or 0
        if not isinstance(p,dict) or not run or p.get('runId')!=run:continue
        if k=='mission.answered' and p.get('correct') is not False and p.get('taskId'):src=p['taskId']
        elif k=='mission.completed' and p.get('gameId'):src=p['gameId']
        elif k in custom and p.get('gameId')==custom[k]:src=custom[k]
        else:continue
        if src not in first or t<first[src]:first[src]=t
    out={}
    for card in dex_conf()['cards']:
        ts=[first[x] for x in card['at'] if x in first]
        if ts:out[card['id']]=min(ts)
    return out
def class_dex(c,pop,evs):
    """배움 현황 「과학 도감」: 학생마다 지금 회차(저장 상태의 runId)에서 모은 카드와, 카드마다 연 학생과 아직 못 연 학생.
    evs: learn_events가 읽은 공용 미션 기록. 전용 화면 의뢰의 끝낸 기록은 여기서 더 읽는다."""
    ids=[x['id'] for x in pop];conf=dex_conf();runs=class_runs(c,ids);mine={}
    for i in range(0,len(ids),200):
        part=ids[i:i+200];marks=','.join('?'*len(part))
        kinds=tuple(k for *_,k in CUSTOM_GAMES)
        for r in c.execute('SELECT owner,kind,payload FROM events WHERE kind IN ('+','.join('?'*len(kinds))+') AND owner IN ('+marks+')',(*kinds,*part)):
            try:mine.setdefault(r['owner'],[]).append({'kind':r['kind'],'payload':json.loads(r['payload'])})
            except (ValueError,TypeError):continue
    for _,o,k,p in evs:
        if k!='mission.hint':mine.setdefault(o,[]).append({'kind':k,'payload':p})
    got={x:{card['id'] for card in conf['cards'] if dex_open(card,*run_progress(mine.get(x,[]),runs.get(x)))} for x in ids} if ids else {}
    who=lambda x:{'number':x['number'],'nickname':x['nickname']}
    region={card['id']:card['region'] for card in conf['cards']};bonus={card['id'] for card in conf['cards'] if card.get('bonus')}
    students=[{**who(x),'got':len(got[x['id']]),'bonus':len(got[x['id']]&bonus),'regions':{r:sum(1 for i in got[x['id']] if region[i]==r) for r in region_codes()}} for x in pop]
    cards=[]
    for no,card in enumerate(conf['cards'],1):
        have=[x for x in pop if card['id'] in got[x['id']]]
        cards.append({'id':card['id'],'no':no,'name':card['name'],'region':card['region'],'kind':card['kind'],'key':bool(card.get('key')),'bonus':bool(card.get('bonus')),'got':len(have),
                      'missing':[who(x) for x in pop if card['id'] not in got[x['id']]] if 0<len(have)<len(pop) else []})
    return {'total':len(conf['cards']),'kinds':conf['kinds'],'students':students,'cards':cards}
def dex_task_cards(gid,tid):
    """과제를 맞혔을 때 그 과제로 열리는 카드(미션 확인 응답에 붙인다)."""
    src=gid+'.'+tid
    return [{'id':x['id'],'name':x['name'],'kind':x['kind'],'key':bool(x.get('key'))} for x in dex_conf()['cards'] if src in x['at']]

# ---------------------------------------------------------------- 교사용 정답 모음
# 학생에게는 보내지 않는다. 관리 화면 「정답」 탭(/api/admin/answers)에서만 쓴다.
def answer_lines(task):
    t=task['type'];lab=lambda opts,i:next((o['label'] for o in opts if o['id']==i),str(i))
    unit=lambda x:(' '+x['unit'] if x.get('unit') else '')+(f" (±{x['tol']})" if x.get('tol') else '')
    if t=='choice':return [f"정답: {lab(task['options'],task['key'])}"] if task.get('key') is not None else ['정해진 정답 없이 자기 생각을 고릅니다.']
    if t=='multi':return ['모두 고르기: '+', '.join(lab(task['options'],k) for k in task['keys'])] if task.get('keys') else ['정해진 정답 없이 고릅니다.']
    if t=='quiz':return [f"{q.get('prompt','')} → "+(lab(q['options'],q['key']) if q.get('key') is not None else '정해진 정답 없음') for q in task['parts']]
    if t=='sort':
        if task.get('distinct'):return ['카드를 칸마다 하나씩, 서로 다른 칸에 놓습니다.']
        if not task.get('key'):return ['정해진 정답 없이 나눕니다.']
        return [f"{b['label']}: "+(', '.join(lab(task['items'],k) for k,v in task['key'].items() if v==b['id']) or '없음') for b in task['bins']]
    if t=='order':return ['순서: '+' → '.join(lab(task['cards'],k) for k in task['key'])]
    if t=='fill':
        txt=task.get('text','')
        for b in task['blanks']:txt=txt.replace('{'+b['id']+'}','['+lab(b['options'],task['key'].get(b['id']))+']')
        return [txt]
    if t=='find':return ['찾을 곳: '+', '.join(lab(task['spots'],k) for k in task['keys'])]
    if t=='word':return [f"정답: {task['key']} (초성 {chosung(task['key'])})"]+([f"다른 정답 표기: {', '.join(task['accept'])}"] if task.get('accept') else [])
    if t=='chain':return ['예시 사슬: '+' → '.join([task['start'],*task['key']]),'앞 낱말의 끝 글자로 시작하면 다른 사슬도 정답입니다.']
    if t=='text':return answer_support.teacher_lines(task.get('answerRule'))+['각 묶음에서 한 낱말씩 있으면 정답입니다. 조사와 어미는 채점하지 않습니다.'] if task.get('answerRule') else ['자유롭게 한 문장을 씁니다. 선생님이 확인합니다.']
    if t=='form':return ['칸을 채워 계획이나 기록을 남깁니다. 선생님이 확인합니다.']+[f['label']+': '+line for f in task.get('fields',[]) for line in answer_support.teacher_lines(f.get('answerRule'))]
    if t=='signal':return ['깜빡임 모양마다 서로 다른 뜻을 정해 약속표를 만들고 신호를 보냅니다.' if task.get('rule')=='send' else '받은 깜빡임을 약속표에서 찾아 뜻을 고릅니다.']
    if t=='grid':return [f"{r['label']}: 꼭 고를 것 "+', '.join(lab(task['cols'],c) for c in task['key'][r['id']]['core'])+(' / 함께 골라도 되는 것 '+', '.join(lab(task['cols'],c) for c in task['key'][r['id']]['ok'] if c not in task['key'][r['id']]['core']) if set(task['key'][r['id']]['ok'])-set(task['key'][r['id']]['core']) else '') for r in task['rows']]
    if t=='number':
        if task.get('fields'):return [f"{f['prompt']}: {f['key']}{unit(f)}" for f in task['fields']]
        return [f"정답: {task['key']}{unit(task)}"] if task.get('key') is not None else ['숫자를 읽어 기록합니다.']
    if t=='report':return ['조사한 제품마다 맞는 성질과 출처를 고르고 편리한 점을 한 문장 씁니다. 선생님이 확인합니다.']
    if t=='plan':
        eff=[r['label'] for r in task['rules'] if task['keys'].get(r['id'])=='eff'];safe=[r['label'] for r in task['rules'] if task['keys'].get(r['id'])=='safe']
        return ['효율 규칙과 안전 규칙을 하나 이상씩 고릅니다.','효율: '+', '.join(eff),'안전: '+', '.join(safe)]
    return ['그림 속 장치를 직접 조작해 정해진 관찰이나 제작을 마치면 통과합니다. 막히면 아래 힌트를 보세요.']
def poe_lines(pr):
    if not pr:return []
    return [f"먼저 예상하기: {pr['question']}",f"장면의 실제 결과: {next(o['label'] for o in pr['options'] if o['id']==pr['key'])} ({pr['observed']})",'예상은 채점하지 않습니다. 예상과 결과를 비교하고 생각을 돌아봅니다.']
def answer_book(gid):
    if not gid:
        regions=json.loads((ROOT/'public'/'regions.json').read_text(encoding='utf-8'));custom=json.loads((ROOT/'data'/'answers-custom.json').read_text(encoding='utf-8'));ms=missions();out=[]
        for key,r in regions.items():
            for z in r['zones']:
                for g in z['games']:out.append({'id':g['id'],'title':g['title'],'region':r['title'],'zone':z['title'],'count':len(ms[g['id']]['tasks']) if g['id'] in ms else len(custom.get(g['id'],{}).get('steps',[]))})
        return {'missions':out}
    ms=missions()
    if gid in ms:
        m=ms[gid];tasks=[]
        for t in m['tasks']:
            tasks.append({'id':t['id'],'title':t['title'],'optional':bool(t.get('optional') or t.get('required') is False),'diagnostic':bool(t.get('diagnostic')),'prompt':' '.join(x[1] for x in t.get('say',[]) if isinstance(x,list) and len(x)>1),'answer':answer_lines(t)+([f"해설: {t['explain']}"] if t.get('explain') else [])+poe_lines(t.get('predict')),'hints':t.get('hints',[]),'right':t.get('feedback',{}).get('right','')})
        tr=m.get('transfer')
        if tr:tasks.append({'id':'새 조건','title':tr.get('title','다른 곳에서도 통할까요?'),'optional':True,'diagnostic':False,'prompt':' '.join(x for x in [tr.get('situation',''),tr['question']] if x),
            'answer':[f"정답: {next(o['label'] for o in tr['options'] if o['id']==tr['key'])}",f"해설: {tr['explain']}",f"틀렸을 때: {tr['retry']}",'필수 단계를 마친 뒤 한 번 나오며, 「나중에 다시 해 볼게요」로 넘길 수 있습니다.'],'hints':tr.get('hints',[]),'right':''})
        return {'id':gid,'title':m['title'],'quest':m['quest'],'place':m['place'],'goal':m['goal'],'tasks':tasks}
    custom=json.loads((ROOT/'data'/'answers-custom.json').read_text(encoding='utf-8'))
    if gid in custom:
        c=custom[gid];return {'id':gid,'note':c.get('note',''),'tasks':[{'id':f'{i+1}단계','title':s['title'],'optional':False,'diagnostic':False,'prompt':'','answer':s['answer'],'hints':[],'right':''} for i,s in enumerate(c['steps'])]}
    return None
def managed_class(c,u,cid):
    if u['role']=='teacher':
        if cid not in (None,'',u['class_id']):raise PermissionError
        cid=u['class_id']
    elif u['role']!='admin':raise PermissionError
    if not isinstance(cid,str) or not cid:raise Invalid('학급을 먼저 골라 주세요.')
    row=c.execute('SELECT id,grade,room,name FROM classes WHERE id=?',(cid,)).fetchone()
    if row:return dict(row)
    if u['role']=='teacher':return {'id':cid,'grade':u['grade'],'room':u['room'],'name':f"{u['grade']}학년 {u['room']}반"}
    raise Invalid('없는 학급입니다.')
def managed_student(c,u,sid):
    if not isinstance(sid,str) or not sid:raise Invalid('학생을 골라 주세요.')
    row=c.execute("SELECT * FROM accounts WHERE id=? AND role='student'",(sid,)).fetchone()
    if not row:raise NotFound
    if u['role']!='admin' and row['class_id']!=u['class_id']:raise PermissionError
    return row
def student_view(row):return dict(id=row['id'],number=row['number'],nickname=row['nickname'],active=row['active']!=0,avatar=public_user(row)['avatar'])
def clean_nickname(v,number=None):
    if number is not None and (v is None or (isinstance(v,str) and not v.strip())):return f'탐험가{number}'
    if not isinstance(v,str) or not 1<=len(v.strip())<=20 or any(ord(ch)<32 for ch in v):raise Invalid('닉네임은 1자에서 20자까지 쓸 수 있습니다.')
    return v.strip()
def clean_number(v):
    if type(v) is not int or not 1<=v<=60:raise Invalid('번호는 1부터 60까지 쓸 수 있습니다.')
    return v

def npc_maps():
    regions=json.loads((ROOT/'public/regions.json').read_text(encoding='utf-8'))
    return {'hub'}|set(regions)|{z['id'] for r in regions.values() for z in r['zones']}
def default_npc_ids():
    try:text=(ROOT/'public/npcs.mjs').read_text(encoding='utf-8')
    except OSError:return set()
    return set(re.findall(r"""\bid\s*:\s*['"]([A-Za-z0-9_-]{1,80})['"]""",text.split('DEFAULT_NPCS',1)[-1]))
def validate_npc(n):
    if not isinstance(n,dict) or set(n)!={'id','name','role','map','x','y','avatar','lines','published'}:raise Invalid('인물 정보 형식을 확인해 주세요.')
    if not isinstance(n['id'],str) or len(n['id'])>80:raise Invalid('인물 ID를 확인해 주세요.')
    if not isinstance(n['name'],str) or not 1<=len(n['name'].strip())<=20:raise Invalid('이름은 1자에서 20자까지 쓸 수 있습니다.')
    if not isinstance(n['role'],str) or len(n['role'].strip())>30:raise Invalid('역할은 30자 이하로 써 주세요.')
    if not isinstance(n['map'],str) or n['map'] not in npc_maps():raise Invalid('지도를 골라 주세요.')
    w,h=(1920,1280) if n['map']=='hub' else (960,960) # 지구와 구역 지도는 주민 마을까지 960×960 (public/npcs.mjs mapSize)
    if any(type(n[k]) is not int for k in ['x','y']) or not 20<=n['x']<=w-20 or not 40<=n['y']<=h-10:raise Invalid(f'위치는 가로 20~{w-20}, 세로 40~{h-10} 안에서 정해 주세요.')
    if not isinstance(n['avatar'],dict):raise Invalid('외형을 골라 주세요.')
    lines=n['lines']
    if not isinstance(lines,list) or not 1<=len(lines)<=8 or any(not isinstance(v,str) or not v.strip() or len(v.strip())>200 for v in lines):raise Invalid('대사는 1줄에서 8줄까지, 한 줄에 200자 이하로 써 주세요.')
    if type(n['published']) is not bool:raise Invalid('게시 여부를 확인해 주세요.')
    return dict(id=n['id'],name=n['name'].strip(),role=n['role'].strip(),map=n['map'],x=n['x'],y=n['y'],avatar=sanitize_avatar(n['avatar']),lines=[v.strip() for v in lines],published=n['published'])
G05_REQUIREMENTS=[('inquiry.reviewed','밝기 기록 적용','g05-intro',None),('inquiry.features','조사 항목 선택','g05-intro',None),('motor.prepared','전동기 준비','motor-workshop',None),('motor.observed','회전 관찰','motor-workshop',None),('buzzer.prepared','버저 연결','buzzer-workshop',None),('buzzer.observed','소리 관찰','buzzer-workshop',None),('deduction.submitted','두 증거 추리','deduction-workshop',None),('deduction.uncertain','조건 확인 요청','deduction-workshop',None),('application.submitted','자동차 제안','application-workshop','car'),('application.submitted','도서관 제안','application-workshop','quiet')]
def g05_progress(c,owner,run):
    events=[{**dict(r),'payload':json.loads(r['payload'])} for r in c.execute('SELECT kind,payload FROM events WHERE owner=? ORDER BY received',(owner,))]
    events=[e for e in events if e['payload'].get('runId')==run and e['payload'].get('gameId')=='R3-G05']
    missing=[{'title':title,'map':map_id} for kind,title,map_id,case in G05_REQUIREMENTS if not any(e['kind']==kind and e['payload'].get('correct') is True and (case is None or e['payload'].get('caseId')==case) for e in events)]
    done=[e['payload'] for e in events if e['kind']=='workshop.completed']
    return {'missing':missing,'completed':bool(done),'question':done[-1]['answer'] if done else '', 'reason':done[-1]['reason'] if done else ''}

G06_REQUIREMENTS=[('magnetIntro.recalled','처음 생각과 경험','intro',False),('magnetIntro.suspected','원인 후보','intro',False),('magnetMaterials.submitted','재료와 역할','materials',True),('magnet.prepared','안전 준비','build',True),('magnet.assembled','테이프와 감기','build',False),('magnet.connected','끝 피복과 연결','build',True),('magnet.observed','스위치 전후 관찰','build',True),('magnetRepair.tested','고장 수정 후 재확인','repair',True),('magnetMeaning.submitted','전자석 설명과 사용 이유','meaning',True)]
def g06_progress(c,owner,run):
    events=[{**dict(r),'payload':json.loads(r['payload'])} for r in c.execute('SELECT kind,payload FROM events WHERE owner=? ORDER BY received',(owner,))]
    events=[e for e in events if e['payload'].get('runId')==run and e['payload'].get('gameId')=='R3-G06']
    def matches(e,kind,graded):
        if e['kind']!=kind or (graded and e['payload'].get('correct') is not True):return False
        if kind=='magnet.assembled':
            a=e['payload'].get('assembly',{});return a.get('tape') is True and a.get('turns')==3 and a.get('tails') is True
        return True
    missing=[{'title':title,'scene':scene} for kind,title,scene,graded in G06_REQUIREMENTS if not any(matches(e,kind,graded) for e in events)]
    done=[e['payload'] for e in events if e['kind']=='magnet.completed']
    return dict(missing=missing,completed=bool(done),reason=done[-1]['reason'] if done else '',question=done[-1]['answer'] if done else '')

# ---------------------------------------------------------------- 공용 미션 엔진
# 미션 내용과 정답 열쇠는 data/missions/<게임ID>.json에 둔다. 학생에게는 열쇠를 뺀 내용만 보낸다.
MISSION_DIR=ROOT/'data'/'missions'
_MISSIONS={'stamp':None,'data':{}}
def missions():
    if _MISSIONS.get('checked',0)>time.monotonic()-2 and _MISSIONS['data']:return _MISSIONS['data']
    _MISSIONS['checked']=time.monotonic()
    files=sorted(MISSION_DIR.glob('R*-G*.json')) if MISSION_DIR.exists() else []
    inquiry_file=ROOT/'data'/'inquiry.json'
    stamp=tuple((p.name,p.stat().st_mtime) for p in files)+(('inquiry',inquiry_file.stat().st_mtime if inquiry_file.exists() else 0),)
    if stamp!=_MISSIONS['stamp']:
        data={};inquiries=json.loads(inquiry_file.read_text(encoding='utf-8')) if inquiry_file.exists() else {}
        for p in files:
            m=json.loads(p.read_text(encoding='utf-8'));data[m['id']]=m
            if m['id'] in inquiries:m['inquiry']=inquiries[m['id']]
        _MISSIONS.update(stamp=stamp,data=data)
    return _MISSIONS['data']
SECRET_KEYS={'key','keys','rule','accept','explain','observed','answerRule','answerRules'}
CHOSUNG='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
def chosung(word):
    # 초성 맞히기: 한글 음절은 초성으로, 띄어쓰기는 그대로 둔다
    return ''.join(CHOSUNG[(ord(c)-0xAC00)//588] if '가'<=c<='힣' else c for c in word)
def norm_word(s):return re.sub(r'[^0-9A-Za-z가-힣]','',str(s))
# Display repairs verified against the saved pre-repair source. This does not
# alter archived questions, answers, fingerprints, or grading edition selection.
DISPLAY_REPAIRS={
    ('R1-G04','T17'):('e11519fdf21ad9c12cd514e0526ca0500fb95b2c5f8aa7a54e6e9f9b23354f58',{'note'}),
    ('R1-G04','T26'):('04b63a065d13a42e12e17fb90bafdb6a091df35e1b77d6c97ac60aae28fd3fed',{'component','mode'}),
    ('R1-G04','T27'):('cef849e843ffa97779345800f63527800f9a2d5d028eb37fcb106a70f741df9d',{'component','mode'}),
    ('R1-G06','T15'):('750a723d801796e8142a86a90fd2e11d53295559ed75828107bbe0a2bf51ed6a',{'component','mode'}),
    ('R2-G12','T08'):('61ffb46a33955582f316b2e4f9763d83977eb53c1392743fdf2dab58273b0c13',{'component','mode'}),
}
def public_mission(m):
    def strip(v):
        if isinstance(v,dict):return {k:strip(x) for k,x in v.items() if k not in SECRET_KEYS}
        if isinstance(v,list):return [strip(x) for x in v]
        return v
    out=strip(m)
    current=missions().get(m['id'],m)
    current_tasks={t['id']:t for t in current.get('tasks',[])}
    support_file=ROOT/'data'/'task-support.json'
    support=json.loads(support_file.read_text(encoding='utf-8')).get('missions',{}).get(m['id'],{}) if support_file.exists() else {}
    for t,o in zip(m.get('tasks',[]),out.get('tasks',[])):
        if t.get('type')=='word':o['pattern']=chosung(t['key'])
        if t.get('type')=='chain':o['links']=len(t['key'])
        n=len(ease_steps(m,t))
        if n:o['easeSteps']=n # 쉽게 하기를 쓸 수 있는 횟수. 0이면 단추를 두지 않는다
        same=current_tasks.get(t['id'])
        active=same if same and answer_support.fingerprint(same)==answer_support.fingerprint(t) else t
        if answer_support.supports(active):
            o['answerSupport']=True
            o['answerRevision']=teaching.revision(current if active is same else m)
            for f,of in zip(active.get('fields',[]),o.get('fields',[])):
                if answer_support.branches(f.get('answerRule')):of['answerSupport']=True
        guide=support.get('tasks',{}).get(t['id'],{})
        repair=DISPLAY_REPAIRS.get((m['id'],t['id'])); compatible=False
        if repair and same and answer_support.fingerprint(t)==repair[0]:
            # Future question changes cannot silently inherit this exception.
            compatible=answer_support.fingerprint({k:v for k,v in t.items() if k not in repair[1]})==answer_support.fingerprint({k:v for k,v in same.items() if k not in repair[1]})
            if compatible:
                for key in repair[1]:
                    if key in same:o[key]=strip(same[key])
        if guide.get('taskFingerprint')==answer_support.fingerprint(t) or compatible and guide.get('taskFingerprint')==answer_support.fingerprint(same):
            o['support']={k:v for k,v in guide.items() if k!='taskFingerprint'}
            if 'sources' in o['support']:
                o['support']['sources']=[{k:v for k,v in source.items() if k in {'title','page'}} for source in guide['sources']]
    return out

def answer_task(m,task,revision,db):
    """내용이 같은 문항의 새 핵심어 규칙만 명시한 판으로 적용한다. 기록 원문은 바꾸지 않는다."""
    if not revision:return task
    if not isinstance(revision,str) or not re.fullmatch('[0-9a-f]{64}',revision):raise ValueError('답 확인 자료를 다시 열어 주세요.')
    edition=teaching.resolve(db,missions(),m['id'],revision)
    fresh=next((t for t in (edition or {}).get('tasks',[]) if t['id']==task['id']),None)
    if not fresh or answer_support.fingerprint(fresh)!=answer_support.fingerprint(task):raise ValueError('문항 내용이 달라졌어요. 의뢰를 다시 열어 주세요.')
    return fresh
def teaching_catalog():
    out=dict(missions())
    for gid,quest,place,zone,kind in CUSTOM_GAMES:
        if gid not in out:out[gid]={'id':gid,'title':place,'place':place,'zone':zone,'version':'custom-1','tasks':[]}
    return out

def mission_summary(m):
    # 퀘스트 수첩의 단계는 필수 과제만 센다. 선택 과제(더 해보기)는 extraIds로 따로 준다.
    req=[t for t in m['tasks'] if not (t.get('optional') or t.get('required') is False)]
    return {'id':m['id'],'title':m['title'],'quest':m['quest'],'place':m['place'],'zone':m['zone'],'goal':m['goal'],'steps':[s['title'] for s in req],'taskIds':[s['id'] for s in req],'extraIds':[s['id'] for s in m['tasks'] if s not in req],'wrap':m.get('wrap',[]),'solved':(m.get('finish') or {}).get('title','')}
# 쉽게 하기: 학생이 누르면 틀린 보기를 하나씩 지우거나(고르기, 여러 문항, 빈칸) 맞는 짝을 하나씩 놓아 준다(나누기, 선 잇기).
# 단계는 늘 같은 순서로 나오고, 학생이 혼자 판단할 몫(보기 둘, 짝 하나)은 남긴다. 채점은 그대로 judge_mission이 한다.
def ease_steps(m,task):
    if task.get('diagnostic') or task.get('component') or task.get('optional') or task.get('required') is False:return []
    kind=task['type'];order=lambda xs:sorted(xs,key=lambda x:hashlib.sha256((m['id']+task['id']+x).encode()).hexdigest())
    def per_group(groups):
        # groups: [(묶음 id, [틀린 보기 id], 보기 수)] → 차례마다 묶음마다 틀린 보기 하나, 보기 둘은 남긴다
        steps=[];r=0
        while True:
            hide={g:wr[r] for g,wr,n in groups if r<len(wr) and n-(r+1)>=2}
            if not hide:return steps
            steps.append({'hide':hide});r+=1
    if kind=='choice' and task.get('key') is not None:
        wrong=order([o['id'] for o in task['options'] if o['id']!=task['key']])
        return [{'hide':{'':x}} for x in wrong[:max(0,len(task['options'])-2)]]
    if kind=='multi' and task.get('keys') is not None:
        wrong=order([o['id'] for o in task['options'] if o['id'] not in task['keys']])
        return [{'hide':{'':x}} for x in wrong[:-1]]
    if kind=='quiz':
        return per_group([(q['id'],order([o['id'] for o in q['options'] if o['id']!=q['key']]),len(q['options'])) for q in task['parts'] if q.get('key') is not None])
    if kind=='fill' and isinstance(task.get('key'),dict):
        return per_group([(b['id'],order([o['id'] for o in b['options'] if o['id']!=task['key'].get(b['id'])]),len(b['options'])) for b in task['blanks'] if b['id'] in task['key']])
    if kind=='sort' and not task.get('distinct') and isinstance(task.get('key'),dict):
        items=order(list(task['key']))
        return [{'place':{k:task['key'][k]}} for k in items[:-1]]
    return []
def judge_mission(m,task,p):
    """과제 종류별로 응답을 확인하고 correct(충족 후보)와 diagnosticCorrect(진단)를 정한다."""
    kind=task['type'];a=p.get('answer','');roles=p.get('roles',{});out={}
    ids=lambda xs:{x['id'] for x in xs}
    if kind=='choice':
        if a not in ids(task['options']):raise ValueError('보기에 없는 응답')
        if task.get('key') is not None:out['correct']=a==task['key']
    elif kind=='multi':
        got=[x for x in a.split(',') if x]
        if not got or set(got)-ids(task['options']):raise ValueError('보기에 없는 응답')
        if task.get('keys') is not None:out['correct']=set(got)==set(task['keys'])
    elif kind=='quiz':
        parts={q['id']:q for q in task['parts']}
        if set(roles)!=set(parts) or any(roles[k] not in ids(parts[k]['options']) for k in roles):raise ValueError('모든 문항에 답해 주세요.')
        keyed={k:q['key'] for k,q in parts.items() if q.get('key') is not None}
        if keyed:out['diagnosticCorrect' if task.get('diagnostic') else 'correct']=all(roles[k]==v for k,v in keyed.items())
    elif kind=='sort':
        if set(roles)!=ids(task['items']) or set(roles.values())-ids(task['bins']):raise ValueError('모든 카드를 나눠 주세요.')
        if task.get('distinct'):out['correct']=len(set(roles.values()))==len(roles)==len(task['bins'])
        else:out['correct']=all(roles[k]==v for k,v in task['key'].items())
    elif kind=='order':
        got=[x for x in a.split(',') if x]
        if sorted(got)!=sorted(ids(task['cards'])):raise ValueError('모든 카드를 순서대로 놓아 주세요.')
        out['correct']=got==task['key']
    elif kind=='fill':
        blanks={b['id']:b for b in task['blanks']}
        if set(roles)!=set(blanks) or any(roles[k] not in [o['id'] for o in blanks[k]['options']] for k in roles):raise ValueError('빈칸을 모두 채워 주세요.')
        out['correct']=all(roles[k]==v for k,v in task['key'].items())
    elif kind=='find':
        got=set(x for x in a.split(',') if x)
        if got-ids(task['spots']):raise ValueError('없는 물건')
        out['correct']=got==set(task['keys'])
    elif kind=='word':
        if not norm_word(a):raise ValueError('낱말을 적어 주세요.')
        out.update(answer_support.check(a,answer_support.word_rule(task)))
    elif kind=='chain':
        got=[x for x in a.split(',') if x]
        if not got or len(got)>len(task['pool']) or set(got)-set(task['pool']) or len(set(got))!=len(got):raise ValueError('카드 꾸러미의 낱말로 사슬을 이어 주세요.')
        seq=[task['start'],*got];out['correct']=len(got)==len(task['key']) and all(seq[i][-1]==seq[i+1][0] for i in range(len(got)))
    elif kind=='text':
        if not a.strip() or len(a)>300:raise ValueError('내 생각을 한 문장 남겨 주세요.')
        out['review']='teacher_pending'
        out.update(answer_support.check(a,task.get('answerRule')) or {})
    elif kind=='action':
        if a not in task['options']:raise ValueError('허용되지 않은 조작')
        if task.get('keys') is not None:out['correct']=a in task['keys']
    elif kind=='signal':
        mapping={k:v for k,v in roles.items() if k.startswith('p:')}
        if task.get('rule')=='send':out['correct']=len(mapping)>=2 and len(set(mapping.values()))==len(mapping) and all(v for v in mapping.values()) and bool(roles.get('sent')) and mapping.get('p:'+roles.get('sent',''))==roles.get('meaning')
        elif task.get('rule')=='receive':out['correct']=bool(roles.get('got')) and roles.get('decoded')==mapping.get('p:'+roles.get('got',''))
    elif kind=='grid':
        rows={r['id'] for r in task['rows']};cols={c['id'] for c in task['cols']};chosen={k:{x for x in v.split(',') if x} for k,v in roles.items()}
        if set(chosen)!=rows or any(not v or v-cols for v in chosen.values()):raise ValueError('줄마다 하나 이상 골라 주세요.')
        out['correct']=all(chosen[r]&set(task['key'][r]['core']) and chosen[r]<=set(task['key'][r]['ok']) for r in rows)
    elif kind=='report':
        e=m.get('dex',{}).get(roles.get('product'))
        rule=answer_support.rule_for(task,roles)
        if not e or roles.get('product') not in task['products'] or not roles.get('prop') or not roles.get('source') or len(a.strip())<(1 if rule else 5):raise ValueError('조사서의 칸을 모두 채워 주세요. 편리한 점을 써 주세요.')
        out['correct']=roles['prop'] in e.get('keys',[]) and roles['source']==e.get('source');out['review']='teacher_pending'
        graded=answer_support.check(a,rule)
        if graded:
            selected=out['correct'];out.update(graded);out['correct']=selected and graded['correct']
    elif kind=='plan':
        if roles.get('place') not in [o['id'] for o in task['places']] or roles.get('period') not in [o['id'] for o in task['periods']]:raise ValueError('장소와 기간을 골라 주세요.')
        chosen=[x for x in roles.get('rules','').split(',') if x]
        if len(chosen)<2 or set(chosen)-{r['id'] for r in task['rules']}:raise ValueError('생활 규칙을 두 가지 이상 골라 주세요.')
        kinds={task['keys'][x] for x in chosen}
        out['correct']={'eff','safe'}<=kinds;out['review']='teacher_pending'
    elif kind=='form':
        fields={}
        for f in task['fields']:
            v=roles.get(f['id'],'')
            if f.get('required',True) and not v.strip():raise ValueError(f"'{f['label']}' 칸을 채워 주세요.")
            if f['kind']=='select' and v and v not in [o['id'] for o in f['options']]:raise ValueError('보기에 없는 응답')
            checked=answer_support.check(v,f.get('answerRule'))
            if checked:fields[f['id']]=checked
        out['review']='teacher_pending'
        if fields:
            out.update(correct=all(x['correct'] for x in fields.values()),evaluation='core_keywords',answerRuleVersion=1,
                       answerCheck={'fields':{k:v['answerCheck'] for k,v in fields.items()}},
                       answerFeedback='핵심 내용이 맞아요.' if all(x['correct'] for x in fields.values()) else '핵심 내용을 더 적을 칸을 살펴보세요. 어려우면 초성 힌트를 눌러 보세요.')
    elif kind=='number' and task.get('fields'):
        try:vals={f['id']:float(str(roles[f['id']]).replace(',','.')) for f in task['fields']}
        except (KeyError,ValueError):raise ValueError('칸마다 숫자로 입력해 주세요.')
        out['correct']=all(abs(vals[f['id']]-float(f['key']))<=float(f.get('tol',0)) for f in task['fields'])
    elif kind=='number':
        try:v=float(a.replace(',','.'))
        except ValueError:raise ValueError('숫자로 입력해 주세요.')
        out['correct']=abs(v-float(task['key']))<=float(task.get('tol',0))
    else:raise ValueError('알 수 없는 과제 형식')
    if task.get('diagnostic') and 'correct' in out:out['diagnosticCorrect']=out.pop('correct')
    return out
def mission_wrong(task,a,roles,m=None):
    # 다시 살펴볼 카드와 빈칸. 정답은 알려 주지 않고 어디를 다시 볼지만 돌려준다.
    kind=task['type']
    if kind=='form':return [f['id'] for f in task.get('fields',[]) if (answer_support.check(roles.get(f['id'],''),f.get('answerRule')) or {}).get('correct') is False]
    if kind=='text':return ['answer'] if (answer_support.check(a,task.get('answerRule')) or {}).get('correct') is False else []
    if kind in ('sort','fill'):return [k for k,v in task.get('key',{}).items() if roles.get(k)!=v]
    if kind=='multi' and task.get('keys'):
        # 어느 보기인지는 알려 주지 않고, 더 골라야 하는지(more), 빼야 할 것이 섞였는지(extra)만 알려 준다
        got={x for x in a.split(',') if x};keys=set(task['keys']);return (['extra'] if got-keys else [])+(['more'] if keys-got else [])
    if kind=='number' and task.get('fields'):
        def off(f):
            try:return abs(float(str(roles.get(f['id'])).replace(',','.'))-float(f['key']))>float(f.get('tol',0))
            except ValueError:return True
        return [f['id'] for f in task['fields'] if off(f)]
    if kind=='quiz' and not task.get('diagnostic'):return [q['id'] for q in task['parts'] if q.get('key') is not None and roles.get(q['id'])!=q['key']]
    if kind=='order':return [str(i) for i,(x,y) in enumerate(zip([x for x in a.split(',') if x],task['key'])) if x!=y]
    if kind=='plan':
        kinds={task['keys'].get(x) for x in roles.get('rules','').split(',') if x};return [] if {'eff','safe'}<=kinds else ['rules']
    if kind=='grid':return [r for r,v in roles.items() if not ({x for x in v.split(',') if x}&set(task['key'].get(r,{}).get('core',[])) and {x for x in v.split(',') if x}<=set(task['key'].get(r,{}).get('ok',[])))]
    if kind=='report':
        e=m.get('dex',{}).get(roles.get('product'),{});return [k for k,ok in [('prop',roles.get('prop') in e.get('keys',[])),('source',roles.get('source')==e.get('source')),('answer',(answer_support.check(a,answer_support.rule_for(task,roles)) or {}).get('correct') is not False)] if not ok]
    if kind=='find':got=set(x for x in a.split(',') if x);return sorted(got-set(task['keys']))+['missing']*len(set(task['keys'])-got)
    if kind=='chain':
        seq=[task['start'],*[x for x in a.split(',') if x]]
        return [str(i) for i in range(1,len(seq)) if seq[i-1][-1]!=seq[i][0]][:1] or (['short'] if len(seq)-1<len(task['key']) else [])
    return []
REFLECT_LABELS={'changed':'생각을 바꾸었어요','kept':'근거를 찾아 생각을 유지해요','unsure':'더 확인하고 싶어요'}
def poe_options(pr):return [*pr['options'],*([] if any(o['id']=='unsure' for o in pr['options']) else [{'id':'unsure','label':'잘 모르겠어요'}])]
def poe_evaluate(m,k,p):
    """예상, 돌아보기, 새 조건 적용 기록을 확인한다. 예상과 돌아보기는 채점하지 않는다."""
    a=p.get('answer','');reason=p.get('reason','')
    if not isinstance(reason,str) or len(reason)>300:raise ValueError('생각은 300자 안으로 적어 주세요.')
    base={'modality':'simulation','missionTitle':m['title'],'standardCodes':m.get('standards',[]),'gameVersion':m.get('version','1'),'contentRevision':teaching.revision(m)}
    if k=='mission.transfer':
        tr=m.get('transfer')
        if not tr:raise ValueError('새 조건 문제가 없는 의뢰예요.')
        opts={o['id']:o['label'] for o in tr['options']}
        if a=='skip':return {**base,'taskId':m['id']+'.TRANSFER','taskTitle':'새 조건에 적용','responseText':'나중에 다시 해 보기','evaluation':'skipped'}
        if a not in opts:raise ValueError('보기를 골라 주세요.')
        ok=a==tr['key']
        return {**base,'taskId':m['id']+'.TRANSFER','taskTitle':'새 조건에 적용','correct':ok,'responseText':opts[a]+(' · '+reason if reason else ''),
                'feedback':tr.get('explain','') if ok else tr.get('retry','앞에서 관찰한 결과와 이 상황에서 달라진 조건을 비교해 다시 골라 보세요.')}
    task=next((x for x in m['tasks'] if x['id']==p.get('taskId')),None)
    if not task or not task.get('predict'):raise ValueError('예상할 과제가 아니에요.')
    pr=task['predict']
    if k=='mission.predicted':
        opts={o['id']:o['label'] for o in poe_options(pr)}
        if a not in opts:raise ValueError('예상을 골라 주세요.')
        actual=next((o['label'] for o in pr['options'] if o['id']==pr['key']),'')
        return {**base,'taskId':m['id']+'.'+task['id']+'.PREDICT','taskTitle':task['title']+' / 처음 예상','responseText':opts[a],'evaluation':'ungraded',
                'matched':None if a=='unsure' else a==pr['key'],'actualLabel':actual,'observed':pr.get('observed','')}
    if a not in REFLECT_LABELS:raise ValueError('돌아본 생각을 골라 주세요.')
    return {**base,'taskId':m['id']+'.'+task['id']+'.REFLECT','taskTitle':task['title']+' / 결과 돌아보기','responseText':REFLECT_LABELS[a]+(' · '+reason if reason else ''),'evaluation':'ungraded'}
def writeup_event(p,db=None):
    """설명 글 기록. 학생이 연 문항 판으로 낱말을 확인하고, 고른 관찰은 지금 탐구 조건으로 다시 계산한다. 판을 찾지 못해도 글은 보존한다."""
    gid=p.get('gameId');rev=p.get('itemRevision')
    if not isinstance(gid,str) or gid not in missions():raise ValueError('없는 의뢰입니다.')
    if rev is not None and (not isinstance(rev,str) or not re.fullmatch('[0-9a-f]{64}',rev)):raise ValueError('설명 문항 버전을 확인해 주세요.')
    if type(p.get('hint',0)) is not int or not 0<=p.get('hint',0)<=3 or type(p.get('sequence',0)) is not int:raise ValueError('설명 기록 오류')
    if db is not None:
        item,rev=writeup.resolve(db,ROOT,gid,rev)
        if item is not None:writeup.archive(db,gid,item)
    else:
        with conn() as c:item,rev=writeup.resolve(c,ROOT,gid,rev)
    m=missions()[gid]
    return {**{k:p[k] for k in ('runId','sequence','hint','gameVersion') if k in p},**writeup.evaluate(item,rev,m.get('inquiry'),gid,m['title'],p)}

def closure_check(p,gid,text,db=None,required=False):
    if p.get('ruleRevision') is None:
        if required:raise ValueError('설명 확인 자료를 다시 열어 주세요.')
        return {}
    if db is not None:return answer_support.custom_check(ROOT,db,gid,p['ruleRevision'],text)
    with conn() as c:return answer_support.custom_check(ROOT,c,gid,p['ruleRevision'],text)
def validate_event(e, db=None):
    if not isinstance(e,dict) or set(e)-{'id','kind','task','occurred','payload'}:raise ValueError('기록 형식이 올바르지 않습니다.')
    if not isinstance(e.get('id'),str) or not 8<=len(e['id'])<=80:raise ValueError('기록 ID를 확인해 주세요.')
    if not isinstance(e.get('kind'),str) or not isinstance(e.get('task'),str) or e['kind'] not in EVENTS or e['task'] not in TASKS:raise ValueError('허용된 과제의 기록이 아닙니다.')
    # 데이터베이스 조회에 쓰는 값은 글자여야 한다(목록이 들어오면 SQL 매개변수 오류로 묶음 전체가 실패한다)
    if isinstance(e.get('payload'),dict) and any(k in e['payload'] and not isinstance(e['payload'][k],str) for k in ('gameId','taskId','runId','gameVersion','contentRevision','caseId','resourceId','eventId','activityId')):raise ValueError('기록 형식이 올바르지 않습니다.')
    p=e.get('payload');t=e['task'];k=e['kind']
    if k in writeup.EVENTS:
        # 설명 글은 길 수 있어 공통 길이 한도 대신 writeup.evaluate의 한도를 쓴다
        if t!='writeup' or not isinstance(p,dict) or not p.get('runId') or not isinstance(e.get('occurred'),str) or len(e['occurred'])>40:raise ValueError('설명 기록 오류')
        return writeup_event(p,db)
    if t=='writeup':raise ValueError('설명 기록 오류')
    if k=='answer.submitted':
        if t!='answer' or not isinstance(p,dict) or set(p)-{'gameId','taskId','answer','ruleRevision','runId','gameVersion','sequence','hint'} or p.get('taskId')!='CLOSURE' or not isinstance(p.get('runId'),str) or not 1<=len(p['runId'])<=80 or type(p.get('sequence',0)) is not int or type(p.get('hint',0)) is not int or not 0<=p.get('hint',0)<=3 or not isinstance(e.get('occurred'),str) or len(e['occurred'])>40 or len(json.dumps(p,ensure_ascii=False))>2500:raise ValueError('설명 기록을 확인해 주세요.')
        grade=closure_check(p,p.get('gameId'),p.get('answer'),db,True)
        return {**p,**grade,'taskId':p['gameId']+'.CLOSURE','responseText':p['answer'],'review':'teacher_pending','modality':'student_explanation'}
    if t=='answer':raise ValueError('설명 기록 오류')
    allowed={'rows','resourceId','roles','marked','evidence','caseId','inspected','assembly','answer','reason','hint','card','battery','connection','bulbs','model','runId','gameVersion','contentRevision','answerRevision','ruleRevision','sequence','revision','gameId','taskId'}
    if not isinstance(p,dict) or set(p)-allowed:raise ValueError('허용되지 않은 기록 항목입니다.')
    if len(json.dumps(p,ensure_ascii=False))>2500:raise ValueError('기록이 너무 깁니다.')
    for key in ['answer','reason','card','connection','bulbs','runId','gameVersion']:
        if key in p and (not isinstance(p[key],str) or len(p[key])>500):raise ValueError('입력 길이를 확인해 주세요.')
    if type(p.get('hint',0)) is not int or not 0<=p.get('hint',0)<=3:raise ValueError('힌트 단계 오류')
    if not isinstance(e.get('occurred'),str) or len(e['occurred'])>40:raise ValueError('기록 시각 오류')
    if k in PACE_EVENTS:
        if t!='pace' or set(p)-{'gameId','answer','runId','gameVersion','sequence','hint'} or p.get('answer') not in PACES or not isinstance(p.get('runId'),str) or not 1<=len(p['runId'])<=80:raise ValueError('길 기록 오류')
        if k=='pace.entered' and p.get('gameId') not in teaching_catalog():raise ValueError('없는 의뢰입니다.')
        if k=='pace.chosen' and 'gameId' in p:raise ValueError('길 기록 오류')
        return dict(p)
    if t=='pace':raise ValueError('길 기록 오류')
    if k in inquiry.EVENTS:
        if t!='discovery' or set(p)-{'gameId','answer','reason','roles','runId','gameVersion','contentRevision','sequence','hint'} or not p.get('runId'):raise ValueError('탐구 기록 오류')
        rev=p.get('contentRevision')
        if not isinstance(rev,str) or not re.fullmatch('[0-9a-f]{64}',rev):raise ValueError('탐구 자료 버전을 확인해 주세요.')
        if db is not None:m=teaching.resolve(db,missions(),p.get('gameId'),rev,p.get('gameVersion'))
        else:
            with conn() as c:m=teaching.resolve(c,missions(),p.get('gameId'),rev,p.get('gameVersion'))
        if not m or not m.get('inquiry') or p.get('gameVersion')!=m.get('version','1'):raise ValueError('탐구 자료를 다시 열어 주세요.')
        return {**p,**inquiry.evaluate(m['inquiry'],k,p),'gameVersion':m.get('version','1'),'contentRevision':teaching.revision(m),'missionTitle':m['title'],'taskId':m['id']+'.DISCOVERY','standardCodes':m.get('standards',[])}
    if t=='discovery':raise ValueError('탐구 과제 오류')
    if k in POE_EVENTS:
        if t!='mission' or set(p)-{'gameId','taskId','answer','reason','runId','gameVersion','contentRevision','sequence','hint'} or not p.get('runId'):raise ValueError('미션 기록 오류')
        catalog=missions();gid=p.get('gameId');rev=p.get('contentRevision')
        if gid not in catalog:raise ValueError('없는 미션입니다.')
        if rev is not None and (not isinstance(rev,str) or not re.fullmatch('[0-9a-f]{64}',rev)):raise ValueError('과제 기록 오류')
        if db is not None:m=teaching.resolve(db,catalog,gid,rev,p.get('gameVersion'))
        else:
            with conn() as c:m=teaching.resolve(c,catalog,gid,rev,p.get('gameVersion'))
        if m is None:return {**p,'evaluation':'version_unavailable','taskId':gid+'.'+str(p.get('taskId') or 'TRANSFER'),'originalKind':k}
        return {**p,**poe_evaluate(m,k,p)}
    if k in MISSION_EVENTS:
        if t!='mission' or set(p)-{'gameId','taskId','answer','roles','hint','runId','gameVersion','contentRevision','answerRevision','sequence'} or not p.get('runId'):raise ValueError('미션 기록 오류')
        catalog=missions();gid=p.get('gameId');rev=p.get('contentRevision')
        if gid not in catalog:raise ValueError('없는 미션입니다.')
        if rev is not None and (not isinstance(rev,str) or not re.fullmatch('[0-9a-f]{64}',rev)):raise ValueError('과제 기록 오류')
        if db is not None:m=teaching.resolve(db,catalog,gid,rev,p.get('gameVersion'))
        else:
            with conn() as c:m=teaching.resolve(c,catalog,gid,rev,p.get('gameVersion'))
        roles=p.get('roles',{})
        if not isinstance(roles,dict) or len(roles)>24 or any(not isinstance(v,str) or len(v)>80 or len(str(key))>40 for key,v in roles.items()):raise ValueError('미션 응답 오류')
        if m is None:
            return {**p,'correct':False,'evaluation':'version_unavailable','review':'teacher_pending','taskId':gid+'.'+str(p.get('taskId','END')),'originalKind':k}
        result={**p,'gameVersion':m.get('version','1'),'contentRevision':teaching.revision(m),'standardCodes':m.get('standards',[]),'modality':'simulation','missionTitle':m['title']}
        if p.get('gameVersion') and p['gameVersion']!=m.get('version','1'):raise ValueError('과제 버전이 일치하지 않습니다.')
        if k=='mission.completed':
            if not p.get('answer','').strip() or len(p['answer'])>300:raise ValueError('마지막 질문이나 설명을 남겨 주세요.')
            result.update(taskId=m['id']+'.END',taskTitle='의뢰 마무리',review='teacher_pending');return result
        task=next((x for x in m['tasks'] if x['id']==p.get('taskId')),None)
        if not task:raise ValueError('없는 과제입니다.')
        if db is not None:task=answer_task(m,task,p.get('answerRevision'),db)
        else:
            with conn() as c:task=answer_task(m,task,p.get('answerRevision'),c)
        result.update(taskId=m['id']+'.'+task['id'],taskTitle=task['title'],responseText=teaching.response_text(task,p),elementIds=task.get('elements',[]))
        if k=='mission.hint':
            if p.get('answer') not in {'help','initials','ease'}:raise ValueError('도움 기록 오류')
            return result
        result.update(judge_mission(m,task,p));return result
    if t=='mission':raise ValueError('미션 과제 오류')
    if k in CRANE_EVENTS:
        if t!='crane' or set(p)-{'answer','hint','runId','gameVersion','sequence','roles','battery','card','ruleRevision'} or not p.get('runId'):raise ValueError('크레인 기록 오류')
        roles=p.get('roles',{})
        if not isinstance(roles,dict) or len(roles)>10 or any(not isinstance(v,str) or len(v)>40 for v in roles.values()):raise ValueError('크레인 선택 오류')
        task,elements=CRANE_TASKS.get(k,('T03',['3-108']))
        result={**p,'gameId':'R3-G07','gameVersion':'g07-full-1','taskId':'R3-G07.'+task,'elementIds':elements,'standardCodes':['6과15-03'],'modality':'simulation'}
        a=p.get('answer','')
        if k in ['crane.question','crane.completed']:
            if not a.strip() or len(a)>300:raise ValueError('질문이나 설명을 남겨 주세요.')
        elif k=='crane.hint':
            if a!='help':raise ValueError('크레인 도움 오류')
        else:
            options={'crane.scene_released':['off'],'crane.switched':['on','off'],'crane.observed':['decrease','always','zero'],'crane.recalled':['recall'],'crane.counted':['1','2'],'crane.strength':['two','same','one'],'crane.compass':['south','north'],'crane.poles':['N','S'],'crane.reversed':['pole','strength','none'],'crane.compared':['false','true'],'crane.moved':['attach','release','reject','heavy','battery'],'crane.delivered':['done'],'crane.evidence':['submit']}[k]
            if a not in options:raise ValueError('크레인 관찰 오류')
        if k=='crane.observed':result['correct']=a=='decrease'
        if k=='crane.recalled':result['diagnosticCorrect']=roles.get('current')=='current' and roles.get('ends')=='ends'
        if k=='crane.strength':result['correct']=a=='two'
        if k=='crane.compass':result['correct']=a=='south'
        if k=='crane.poles':
            if p.get('battery') not in ['forward','reverse']:raise ValueError('전지 방향 오류')
            result['correct']=(p['battery'],a) in [('forward','S'),('reverse','N')]
        if k=='crane.reversed':result['correct']=a=='pole'
        if k=='crane.compared':result['correct']=a=='false' and all(roles.get(key)==v for key,v in CRANE_TABLE.items())
        if k=='crane.evidence':result['correct']=roles.get('force')=='count' and roles.get('pole')=='compass' and roles.get('deep')=='no'
        if k=='crane.completed':
            grade=closure_check(p,'R3-G07',a,db)
            if grade.get('correct') is False:raise ValueError(grade['answerFeedback'])
            result.update(grade);result['review']='teacher_pending'
        return result
    if t=='crane':raise ValueError('크레인 과제 오류')
    if k=='magnet.completed':
        if t!='closure6' or set(p)-{'reason','answer','hint','runId','gameVersion','sequence','ruleRevision'} or not p.get('runId') or any(not p.get(v,'').strip() or len(p[v])>300 for v in ['reason','answer']):raise ValueError('제작 설명과 다음 질문 필요')
        grade=closure_check(p,'R3-G06',p['reason'],db)
        if grade.get('correct') is False:raise ValueError(grade['answerFeedback'])
        return {**p,**grade,'gameId':'R3-G06','gameVersion':'g06-closure-1','taskId':'R3-G06.T10','elementIds':['3-107','3-129'],'standardCodes':['6과15-03'],'modality':'simulation','explanationReview':'teacher_pending','targetGameId':'R3-G07'}
    if t=='closure6':raise ValueError('제작 설명 과제 오류')
    if k in INTRO_MAGNET_EVENTS:
        if t!='magnetIntro' or set(p)-{'answer','reason','hint','runId','gameVersion','sequence'} or not p.get('runId'):raise ValueError('공방 도입 기록 오류')
        task='T01' if k=='magnetIntro.recalled' else 'T02'
        result={**p,'gameId':'R3-G06','gameVersion':'g06-intro-1','taskId':'R3-G06.'+task,'standardCodes':['6과15-03'],'elementIds':['3-066','3-096'] if task=='T01' else ['3-106'],'modality':'simulation'}
        if k=='magnetIntro.recalled':
            if p.get('answer') not in ['same','different','unknown'] or not p.get('reason','').strip() or len(p['reason'])>300:raise ValueError('처음 생각과 경험 필요')
            result['diagnosticCorrect']=p['answer']=='different'
        elif p.get('answer') not in (['battery','contact','ends'] if k=='magnetIntro.inspected' else ['battery','contact','ends','unknown'] if k=='magnetIntro.suspected' else ['help']):raise ValueError('조사와 후보 선택 오류')
        return result
    if t=='magnetIntro':raise ValueError('공방 도입 과제 오류')
    if k in MATERIAL_EVENTS:
        if t!='magnetMaterials' or set(p)-{'answer','roles','hint','runId','gameVersion','sequence'} or not p.get('runId'):raise ValueError('재료 기록 오류')
        result={**p,'gameId':'R3-G06','gameVersion':'g06-materials-1','taskId':'R3-G06.T03','standardCodes':['6과15-03'],'elementIds':['3-098','3-103'],'modality':'simulation'}
        if k=='magnetMaterials.submitted':
            r=p.get('roles')
            if p.get('answer') not in ['iron','brass','plastic'] or not isinstance(r,dict) or set(r)!={'bolt','wire','battery','switch'} or any(v not in ['core','coil','source','control'] for v in r.values()):raise ValueError('재료 역할 선택 오류')
            result['correct']=p['answer']=='iron' and r==dict(bolt='core',wire='coil',battery='source',switch='control')
        elif p.get('answer')!='help':raise ValueError('재료 도움 오류')
        return result
    if t=='magnetMaterials':raise ValueError('재료 과제 오류')
    if k in MEANING_EVENTS:
        if t!='magnetMeaning' or set(p)-{'answer','roles','hint','runId','gameVersion','sequence'} or not p.get('runId'):raise ValueError('전자석 설명 오류')
        result={**p,'gameId':'R3-G06','gameVersion':'g06-meaning-1','taskId':'R3-G06.T09','standardCodes':['6과15-03'],'elementIds':['3-097','3-127'],'modality':'simulation'}
        if k=='magnetMeaning.submitted':
            r=p.get('roles')
            if not isinstance(r,dict) or set(r)!={'name','reason'} or r['name'] not in ['electromagnet','always','conductor'] or r['reason'] not in ['heat','strong','empty']:raise ValueError('이름과 사용 이유 필요')
            result['correct']=r['name']=='electromagnet' and r['reason']=='heat'
        elif p.get('answer')!='help':raise ValueError('도움 요청 오류')
        return result
    if t=='magnetMeaning':raise ValueError('전자석 설명 과제 오류')
    if k in REPAIR_EVENTS:
        if t!='magnetRepair' or set(p)-{'answer','hint','runId','gameVersion','sequence'} or not p.get('runId'):raise ValueError('점검 기록 오류')
        choices=['battery','contact','ends'] if k in ['magnetRepair.inspected','magnetRepair.repaired'] else ['on'] if k=='magnetRepair.tested' else ['help']
        if p.get('answer') not in choices:raise ValueError('점검 선택 오류')
        result={**p,'gameId':'R3-G06','gameVersion':'g06-repair-1','taskId':'R3-G06.T08','standardCodes':['6과15-03'],'elementIds':['3-106'],'modality':'simulation'}
        if k=='magnetRepair.repaired':result['correct']=p['answer']=='ends'
        return result
    if t=='magnetRepair':raise ValueError('점검 과제 오류')
    if k in MAGNET_EVENTS:
        if t!='magnet' or set(p)-{'answer','roles','assembly','hint','runId','gameVersion','sequence'} or not p.get('runId'):raise ValueError('전자석 기록 오류')
        task='T04' if k=='magnet.prepared' else 'T05' if k=='magnet.assembled' else 'T06' if k=='magnet.connected' else 'T07'
        result={**p,'gameId':'R3-G06','gameVersion':'g06-build-1','taskId':'R3-G06.'+task,'standardCodes':['6과15-03'],'modality':'simulation','elementIds':{'T04':['3-126','3-128'],'T05':['3-099','3-100'],'T06':['3-101','3-102'],'T07':['3-104','3-105','3-107']}[task]}
        if k=='magnet.prepared':
            roles=p.get('roles')
            if not isinstance(roles,dict) or set(roles)!={'gloves','ends','power'} or any(type(v)is not bool for v in roles.values()):raise ValueError('전자석 안전 오류')
            result['correct']=all(roles.values())
        if k in ['magnet.assembled','magnet.connected']:
            a=p.get('assembly')
            if not isinstance(a,dict) or set(a)!={'tape','turns','tails','ends'} or any(type(a[v])is not bool for v in ['tape','tails']) or type(a['turns'])is not int or not 0<=a['turns']<=3 or a['ends'] not in ['covered','ends','all']:raise ValueError('전자석 조립 오류')
            if k=='magnet.connected':result['correct']=a['tape'] and a['turns']==3 and a['tails'] and a['ends']=='ends'
        if k=='magnet.switched' and p.get('answer') not in ['on','off']:raise ValueError('스위치 오류')
        if k=='magnet.observed':
            if p.get('answer') not in ['current','always']:raise ValueError('전자석 관찰 오류')
            result['correct']=p['answer']=='current'
        return result
    if t=='magnet':raise ValueError('전자석 과제 오류')
    if k=='workshop.completed':
        if t!='closure5' or set(p)-{'answer','reason','runId','gameVersion','sequence','hint','ruleRevision'} or not p.get('runId') or any(not p.get(v,'').strip() or len(p[v])>300 for v in ['answer','reason']):raise ValueError('마무리 설명과 질문 필요')
        grade=closure_check(p,'R3-G05',p['reason'],db)
        if grade.get('correct') is False:raise ValueError(grade['answerFeedback'])
        return {**p,**grade,'gameId':'R3-G05','gameVersion':'g05-closure-1','taskId':'R3-G05.T10','elementIds':['3-089','3-090','3-095'],'standardCodes':['6과15-02'],'modality':'simulation','explanationReview':'teacher_pending','targetGameId':'R3-G06'}
    if t=='closure5':raise ValueError('마무리 과제 오류')
    if k in INQUIRY_EVENTS:
        if t!='inquiry5' or set(p)-{'answer','reason','roles','hint','runId','gameVersion','sequence'} or not p.get('runId'):raise ValueError('새 조사 기록 오류')
        result=dict(p);review=k=='inquiry.reviewed';result.update(gameId='R3-G05',gameVersion='g05-intro-1',taskId='R3-G05.T01' if review else 'R3-G05.T02',elementIds=['3-075'] if review else ['3-083','3-084'],standardCodes=['6과15-02'],modality='simulation')
        if review:
            if p.get('answer') not in ['one','two'] or p.get('reason') not in ['controlled','position']:raise ValueError('기록 재적용 오류')
            result['correct']=p['answer']=='two' and p['reason']=='controlled'
        else:
            roles=p.get('roles')
            if not isinstance(roles,dict) or set(roles)!={'motor','buzzer'} or any(v not in ['speed','volume','brightness'] for v in roles.values()):raise ValueError('조사 항목 오류')
            result['correct']=roles=={'motor':'speed','buzzer':'volume'}
        return result
    if t=='inquiry5':raise ValueError('새 조사 과제 오류')
    if k in APPLICATION_EVENTS:
        if t!='application' or set(p)-{'answer','evidence','caseId','hint','runId','gameVersion','sequence'} or not p.get('runId') or p.get('caseId') not in ['car','quiet']:raise ValueError('의뢰 기록 오류')
        result=dict(p);result.update(gameId='R3-G05',gameVersion='g05-application-1',taskId='R3-G05.T09',elementIds=['3-091','3-092'],standardCodes=['6과15-02'],modality='simulation')
        if k!='application.hint' and p.get('answer') not in ['one','two']:raise ValueError('의뢰 연결 오류')
        if k=='application.submitted':
            if p.get('evidence') not in ['motor','buzzer','more']:raise ValueError('의뢰 근거 오류')
            result['correct']=(p['answer'],p['evidence'])==(('two','motor') if p['caseId']=='car' else ('one','buzzer'))
        return result
    if t=='application':raise ValueError('의뢰 과제 오류')
    if k in DEDUCTION_EVENTS:
        if t!='deduction' or set(p)-{'answer','evidence','inspected','hint','runId','gameVersion','sequence'} or not p.get('runId'):raise ValueError('추리 기록 오류')
        result=dict(p);unknown=k=='deduction.uncertain';result.update(gameId='R3-G05',gameVersion='g05-deduction-1',taskId='R3-G05.T08' if unknown else 'R3-G05.T07',elementIds=['3-082','3-095'] if unknown else ['3-089','3-090'],standardCodes=['6과15-02'],modality='simulation')
        if k=='deduction.inspected' and p.get('answer') not in ['light','motor','sound']:raise ValueError('증거 종류 오류')
        if k=='deduction.submitted':
            seen=p.get('inspected')
            if p.get('answer') not in ['one','two'] or not isinstance(seen,list) or len(seen)>3 or any(v not in ['light','motor','sound'] for v in seen):raise ValueError('추리 증거 오류')
            result['correct']=p['answer']=='two' and len(set(seen))>=2
        if unknown:
            if p.get('answer') not in ['two','unknown'] or p.get('evidence') not in ['conditions','color']:raise ValueError('정보 요청 오류')
            result['correct']=p['answer']=='unknown' and p['evidence']=='conditions'
        return result
    if t=='deduction':raise ValueError('추리 과제 오류')
    if k in BUZZER_EVENTS:
        if t!='buzzer' or set(p)-{'answer','reason','hint','runId','gameVersion','sequence'}:raise ValueError('버저 기록 오류')
        result=dict(p);result.update(gameId='R3-G05',gameVersion='g05-buzzer-1',standardCodes=['6과15-02'],modality='simulation',rubricVersion='g05-buzzer-1')
        task='T05' if k=='buzzer.prepared' else 'T06';result.update(taskId='R3-G05.'+task,elementIds=['3-084','3-088'] if task=='T05' else ['3-086'])
        if k=='buzzer.prepared':
            if p.get('answer') not in ['','plus','minus'] or p.get('reason') not in ['','plus','minus']:raise ValueError('버저 준비 오류')
            result['correct']=p['answer']=='plus' and p['reason']=='minus'
        if k=='buzzer.switched' and p.get('answer') not in ['on','off']:raise ValueError('스위치 오류')
        if k=='buzzer.observed':
            if p.get('answer') not in ['two','same']:raise ValueError('버저 관찰 오류')
            result['correct']=p['answer']=='two'
        return result
    if t=='buzzer':raise ValueError('버저 과제 오류')
    if k in MOTOR_EVENTS:
        if t!='motor' or set(p)-{'answer','reason','hint','runId','gameVersion','sequence'}:raise ValueError('전동기 기록 오류')
        result=dict(p);result.update(gameId='R3-G05',gameVersion='g05-motor-1',standardCodes=['6과15-02'],modality='simulation',rubricVersion='g05-motor-1')
        task='T03' if k=='motor.prepared' else 'T04';result.update(taskId='R3-G05.'+task,elementIds=['3-082','3-093'] if task=='T03' else ['3-085','3-087'])
        if k=='motor.prepared':
            if p.get('answer') not in ['','same','different'] or p.get('reason') not in ['','away','touch']:raise ValueError('전동기 준비 오류')
            result['correct']=p['answer']=='same' and p['reason']=='away'
        if k=='motor.switched' and p.get('answer') not in ['on','off']:raise ValueError('스위치 오류')
        if k=='motor.observed':
            if p.get('answer') not in ['two','same']:raise ValueError('전동기 관찰 오류')
            result['correct']=p['answer']=='two'
        return result
    if t=='motor':raise ValueError('전동기 과제 오류')
    if k in RESOURCE_EVENTS:
        if t!='resource' or set(p)-{'resourceId','runId','gameVersion','sequence','hint'} or not isinstance(p.get('resourceId'),str) or not 1<=len(p['resourceId'])<=80 or not p.get('runId'):raise ValueError('자료 기록 오류')
        return {'resourceId':p['resourceId'],'runId':p['runId'],'sequence':p.get('sequence',0),'modality':'resource','evaluation':'not_assessed'}
    if t=='resource' or 'resourceId' in p:raise ValueError('자료 기록 종류 오류')
    expected={'quest.received':'question','entry.submitted':'intro','observation.table_submitted':'explain','transfer.position_submitted':'transfer','controls.committed':'conditions','vocabulary.submitted':'connection','comparison.marked':'comparison','comparison.submitted':'comparison','proposal.submitted':'proposal','fault.inspected':'diagnosis','fault.repaired':'diagnosis','assembly.changed':'connection','prediction.submitted':'prediction','conditions.committed':'conditions','connection.committed':'connection','experiment.run':'observe','result.recorded':'observe','explanation.submitted':'explain','followup.submitted':'transfer','game.completed':'complete','game.started':'intro','question.submitted':'question'}
    if k in expected and t!=expected[k]:raise ValueError('과제와 기록 종류가 다릅니다.')
    if 'assembly' in p:validate_assembly(p['assembly'])
    if k=='assembly.changed' and 'assembly' not in p:raise ValueError('조립 기록 필요')
    result=dict(p)
    curriculum={'comparison':('T02',['3-071','3-082']),'proposal':('T09',['3-077','3-095']),'diagnosis':('T06',['3-081','3-094']),'conditions':('T03',['3-076','3-082']),'connection':('T04',['3-072','3-073']),'prediction':('T05',['3-074']),'observe':('T08' if k=='result.recorded' else 'T05',['3-075','3-078']),'explain':('T08',['3-073','3-075']),'transfer':('T07',['3-082']),'complete':('T10',[]),'intro':('intro',[]),'question':('T10',[])}
    task_code,elements=curriculum[t]
    result.update(gameId='R3-G04',taskId='R3-G04.'+task_code,elementIds=elements,standardCodes=['6과15-02'],modality='simulation',rubricVersion='g04-slice-1')
    if k in {'conditions.committed','connection.committed','result.recorded','explanation.submitted','followup.submitted'}:result['correct']=p.get('answer')==ANSWERS[t]
    if k=='connection.committed' and p.get('gameVersion') in {'g04-slice-2','g04-slice-3','g04-slice-4','g04-slice-5','g04-slice-6','g04-slice-7','g04-slice-8'}:
        a=p.get('assembly');validate_assembly(a)
        result['correct']=all(a['placed']) and a['linked'] and a['reversed'][0]==a['reversed'][1]
        result['rubricVersion']='g04-slice-2'
    if k in {'fault.inspected','fault.repaired'}:
        repairs={'contact':'wire','battery':'battery','filament':'bulb'}
        if p.get('caseId') not in repairs or p.get('answer') not in {'wire','battery','bulb'}:raise ValueError('점검 오류')
        if k=='fault.repaired':
            if not isinstance(p.get('inspected'),list) or any(v not in {'wire','battery','bulb'} for v in p['inspected']):raise ValueError('점검 근거 오류')
            result['correct']=set(p['inspected'])=={'wire','battery','bulb'} and p['answer']==repairs[p['caseId']]
    if k in {'comparison.marked','comparison.submitted'}:
        if not isinstance(p.get('marked'),list) or len(p['marked'])>3 or any(v not in ['battery','bulb','background'] for v in p['marked']):raise ValueError('비교 표시 오류')
        if k=='comparison.submitted':result['correct']=set(p['marked'])=={'battery','bulb'} and bool(p.get('reason','').strip())
    if k=='proposal.submitted':
        if p.get('answer') not in {'one','series'} or p.get('evidence') not in {'controlled','different','unlimited'}:raise ValueError('제안 오류')
        result['correct']=p['answer']=='series' and p['evidence']=='controlled'
    if k=='quest.received':
        if p.get('card')!='R3-G05' or not p.get('answer','').strip():raise ValueError('다음 의뢰 오류')
        result.update(taskId='R3-G04.T10',elementIds=['3-074','3-077'],targetGameId='R3-G05')
    if k=='entry.submitted':
        if p.get('answer') not in ['closed','open'] or not p.get('reason','').strip() or len(p['reason'])>160:raise ValueError('도입 진단 오류')
        result.update(taskId='R3-G04.T01',elementIds=['3-029','3-070'],diagnosticCircuitCorrect=p['answer']=='closed',evaluation='diagnostic_only')
    if 'rows' in p and k!='observation.table_submitted':raise ValueError('관찰표 종류 오류')
    if k=='observation.table_submitted':
        rows=p.get('rows')
        if not isinstance(rows,dict) or set(rows)!={'one','two'} or any(v not in ['dim','bright','equal'] for v in rows.values()):raise ValueError('관찰표 오류')
        result['correct']=rows=={'one':'dim','two':'bright'}
        result['elementIds']=['3-075','3-078']
    if k=='transfer.position_submitted':
        if p.get('caseId')!='mirrored' or p.get('answer') not in ['left','right','equal'] or p.get('evidence') not in ['count','side','shape']:raise ValueError('배치 비교 오류')
        result['correct']=p['answer']=='left' and p['evidence']=='count'
    if k=='controls.committed':
        roles=p.get('roles')
        if not isinstance(roles,dict) or set(roles)-{'battery','bulb','background'} or any(v not in ['change','keep'] for v in roles.values()):raise ValueError('조건 배치 오류')
        result['correct']=roles=={'battery':'change','bulb':'keep','background':'keep'}
    if k=='vocabulary.submitted':result['correct']=p.get('answer')=='series'
    if k=='prediction.submitted' and p.get('gameVersion') in {'g04-slice-5','g04-slice-6','g04-slice-7','g04-slice-8'}:
        if p.get('answer') not in ['one','two','same','unknown'] or not p.get('reason','').strip():raise ValueError('예상 이유 필요')
    return result

def validate_assembly(a):
    if not isinstance(a,dict) or set(a)!={'placed','reversed','linked'}:raise ValueError('조립 형식 오류')
    for key in ['placed','reversed']:
        if not isinstance(a[key],list) or len(a[key])!=2 or any(type(v)is not bool for v in a[key]):raise ValueError('전지 상태 오류')
    if type(a['linked'])is not bool:raise ValueError('연결 상태 오류')

def validate_resource(r):
    fields={'id','title','kind','region','gameIds','source','question','body','url','published'}
    if not isinstance(r,dict) or set(r)!=fields:raise ValueError('자료 형식 오류')
    for key,limit in [('id',80),('title',120),('source',200),('question',300),('url',2000)]:
        if not isinstance(r[key],str) or len(r[key])>limit:raise ValueError('자료 길이 오류')
    if not r['title'].strip() or r['kind'] not in ['reading','link','video','image','pdf'] or r['region'] not in ['all',*region_keys()] or type(r['published'])is not bool:raise ValueError('자료 항목 오류')
    games=listed_games()
    if not isinstance(r['gameIds'],list) or len(r['gameIds'])>len(games) or any(g not in games for g in r['gameIds']):raise ValueError('자료 장소 오류')
    if not isinstance(r['body'],list) or len(r['body'])>30 or any(not isinstance(v,str) or len(v)>1000 for v in r['body']):raise ValueError('본문 오류')
    if r['kind']=='reading' and not any(v.strip() for v in r['body']):raise ValueError('본문 필요')
    result=dict(r)
    if r['kind'] in ['image','pdf']:
        if not re.fullmatch(r'/api/files/[a-f0-9]{32}',r['url']):raise ValueError('첨부 파일 오류')
    if r['kind'] in ['link','video']:
        u=urlparse(r['url'])
        if u.scheme!='https' or not u.hostname or u.username or u.password:raise ValueError('HTTPS 주소 필요')
        from urllib.parse import parse_qs
        video=(u.path.strip('/') if u.hostname=='youtu.be' else parse_qs(u.query).get('v',[''])[0] if u.hostname in ['youtube.com','www.youtube.com','m.youtube.com'] else '')
        if r['kind']=='video' and re.fullmatch(r'[A-Za-z0-9_-]{11}',video):result['youtubeId']=video
    return result

def validate_placement(p):
    if not isinstance(p,dict) or set(p)!={'id','title','map','x','y','kind','resourceIds','published'}:raise ValueError('배치 형식 오류')
    for k,n in [('id',80),('title',40)]:
        if not isinstance(p[k],str) or len(p[k])>n:raise ValueError('배치 이름 오류')
    regions=json.loads((ROOT/'public/regions.json').read_text(encoding='utf-8'))
    maps={'hub':4}
    for key,r in regions.items():
        maps[key]=len(r['zones'])
        for z in r['zones']:maps[z['id']]=len(z['games'])
    if not isinstance(p['map'],str) or p['map'] not in maps or p['kind'] not in ['bookshelf','terminal','board'] or not p['title'].strip() or type(p['published'])is not bool:raise ValueError('배치 항목 오류')
    if any(type(p[k])is not int for k in ['x','y']) or not 40<=p['x']<=880 or not 80<=p['y']<=560:raise ValueError('배치 위치 오류')
    coords=[(160,240),(480,175),(800,240),(480,420)] if maps[p['map']]<=4 else [(160,210),(480,175),(800,210),(160,410),(480,410),(800,410)]
    if any(abs(p['x']-x)<115 and y-145<p['y']<y+65 for x,y in coords[:maps[p['map']]]) or abs(p['x']-80)<90 and p['y']>465 or abs(p['x']-480)<55 and p['y']>470:raise ValueError('입구를 비워 주세요')
    ids=p['resourceIds']
    if not isinstance(ids,list) or not 1<=len(ids)<=20 or any(not isinstance(i,str) or len(i)>80 for i in ids) or len(set(ids))!=len(ids):raise ValueError('연결 자료 오류')
    return dict(p)

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def send_json(self,status,data,headers=None):
        raw=json.dumps(data,ensure_ascii=False).encode();self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        for k,v in (headers or {}).items():self.send_header(k,v)
        self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    def valid_host(self):return host_allowed(self.headers.get('Host'))
    def token(self):
        try:t=SimpleCookie(self.headers.get('Cookie','')).get('science_session');return t.value if t else ''
        except Exception:return ''
    def user(self):
        try:
            token=self.token()
            if not token:return None
            with conn() as c:row=c.execute('SELECT a.* FROM sessions s JOIN accounts a ON a.id=s.uid WHERE s.token=? AND s.expires>?',(session_key(token),time.time())).fetchone()
            return public_user(row) if row and row['active']!=0 else None
        except Exception:return None
    def ready(self):
        if READY:return True
        if PUBLIC and not PG:self.send_json(503,{'error':'기록 저장소가 아직 연결되지 않았습니다.'});return False
        try:initialize(seed=not PUBLIC);return True
        except Exception:self.send_json(503,{'error':'기록 저장소에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'});return False
    def client_key(self):
        if PUBLIC:return (self.headers.get('X-Forwarded-For') or self.client_address[0]).split(',')[0].strip()
        return self.client_address[0]
    def cookie(self,token,age):return f'science_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={age}'+('; Secure' if PUBLIC else '')
    def do_GET(self):
        token=REQUEST_LEARNING_EPOCH.set(None)
        try:return self.get_route()
        except learning_reset.ResetRequired as e:return self.send_json(409,{'error':str(e),'code':'learning_reset','learningEpoch':e.epoch})
        except Exception:
            import traceback;traceback.print_exc()
            return self.send_json(500,{'error':'잠시 뒤 다시 시도해 주세요.'})
        finally:REQUEST_LEARNING_EPOCH.reset(token)
    def get_route(self):
        if not self.valid_host():return self.send_json(403,{'error':'선생님이 알려 준 주소로 접속해 주세요.' if LAN else '로컬 개발 주소로 접속해 주세요.'})
        path=urlparse(self.path).path
        if path.startswith('/api/') and not self.ready():return
        if path=='/api/setup':
            with conn() as c:need=not c.execute("SELECT 1 FROM accounts WHERE role='admin' AND COALESCE(active,1)<>0").fetchone()
            return self.send_json(200,{'needed':need})
        if path.startswith('/api/'):
            u=self.user()
            if not u:return self.send_json(401,{'error':'다시 접속해 주세요.'})
            if path=='/api/me':return self.send_json(200,u)
            if u['role']=='student' and path=='/api/health-inquiry':REQUEST_LEARNING_EPOCH.set(self.headers.get('X-Science-Learning-Epoch','0'))
            query=parse_qs(urlparse(self.path).query)
            if path=='/api/teaching/dashboard':
                try:
                    with conn() as c:result=learning_metrics.dashboard(c,u,{k:v[0] for k,v in query.items()},teaching_catalog(),TEST_NUMBER,GUEST_CLASS)
                    return self.send_json(200,result)
                except PermissionError as e:return self.send_json(403,{'error':str(e)})
                except ValueError as e:return self.send_json(400,{'error':str(e)})
            if path=='/api/health-inquiry':
                try:
                    with conn() as c:result=health_inquiry.view(c,u,query.get('runId',[''])[0])
                    return self.send_json(200,{**result,'partner':health_partner.status(u)})
                except health_inquiry.InquiryError as e:return self.send_json(e.status,{'error':str(e)})
            if path=='/api/writeup':
                # 의뢰의 설명 쓰기 문항. 교사용 평가 기준과 예시 답은 보내지 않는다.
                gid=query.get('id',[''])[0]
                if gid not in missions():return self.send_json(404,{'error':'없는 의뢰입니다.'})
                item=writeup.items(ROOT).get(gid)
                if not item:return self.send_json(200,{'item':None})
                with conn() as c:rev=writeup.archive(c,gid,item)
                conf=missions()[gid].get('inquiry') or {}
                return self.send_json(200,{'item':writeup.public(item),'itemRevision':rev,'concept':conf.get('explanation',''),'kind':conf.get('kind','')})
            if path=='/api/teaching':
                try:
                    with conn() as c:
                        result=teaching.get(c,u,{k:v[0] for k,v in query.items()},teaching_catalog())
                        if result['staff']:result['writeups']=writeup.editions(c,ROOT,[e['payload'].get('itemRevision') for e in result['events'] if e['kind'] in writeup.EVENTS])
                    return self.send_json(200,result)
                except PermissionError as e:return self.send_json(403,{'error':str(e)})
                except ValueError as e:return self.send_json(400,{'error':str(e)})
            if path=='/api/npcs':
                cid=query.get('classId',[None])[0] if u['role']=='admin' else u['class_id']
                with conn() as c:rows=[json.loads(r['payload']) for r in c.execute('SELECT payload FROM npcs WHERE class_id=? ORDER BY rowid',(cid,))]
                if u['role']=='student':rows=[r if r['published'] else {'id':r['id'],'published':False} for r in rows if r['published'] or not r['id'].startswith('custom-')]
                return self.send_json(200,{'npcs':rows})
            if path=='/api/board':
                try:
                    with conn() as c:board=board_view(c,u,board_class(c,u,query.get('classId',[None])[0]))
                except Invalid as e:return self.send_json(400,{'error':str(e)})
                except PermissionError:return self.send_json(403,{'error':'이 학급을 관리할 권한이 없습니다.'})
                return self.send_json(200,board)
            if path=='/api/my-learning':
                if u['role']!='student':return self.send_json(403,{'error':'학생 화면에서 볼 수 있어요.'})
                if u.get('guest'):return self.send_json(200,{'guest':True,'standards':standards_conf()['standards'],'regions':standards_conf()['regions'],'gameCodes':{g:v['codes'] for g,v in standards_conf()['games'].items()},'games':{},'rethink':[],'notes':[]})
                with conn() as c:return self.send_json(200,my_learning(c,u))
            if path=='/api/duel':
                region=query.get('region',[''])[0]
                if u['role']!='student':return self.send_json(403,{'error':'학생 화면에서 볼 수 있어요.'})
                if region not in duel_region():return self.send_json(400,{'error':'지구를 확인해 주세요.'})
                with conn() as c:return self.send_json(200,duel_progress(c,u,region))
            if path=='/api/weekly':
                try:
                    with conn() as c:
                        if u['role']=='student':
                            if u.get('guest') or not u['class_id'] or not class_settings(c,u['class_id'])['weekly']:return self.send_json(200,{'on':False})
                            return self.send_json(200,{'on':True,**class_weekly(c,u['class_id'],u['id'])})
                        cid=managed_class(c,u,query.get('classId',[None])[0])['id']
                        return self.send_json(200,{'on':class_settings(c,cid)['weekly'],**class_weekly(c,cid,staff=True)})
                except Invalid as e:return self.send_json(400,{'error':str(e)})
                except PermissionError:return self.send_json(403,{'error':'이 학급을 관리할 권한이 없습니다.'})
            if path=='/api/class-goal':
                try:
                    with conn() as c:
                        if u['role']=='student':
                            if u.get('guest') or not u['class_id']:return self.send_json(200,{'students':0,'regions':{},'done':0,'target':0,'percent':0})
                            cid=u['class_id']
                        else:cid=managed_class(c,u,query.get('classId',[None])[0])['id']
                        return self.send_json(200,class_goal(c,cid))
                except Invalid as e:return self.send_json(400,{'error':str(e)})
                except PermissionError:return self.send_json(403,{'error':'이 학급을 관리할 권한이 없습니다.'})
            if path.startswith('/api/admin/'):
                if u['role'] not in ('teacher','admin'):return self.send_json(403,{'error':'선생님 권한이 필요합니다.'})
                if path=='/api/admin/learning':
                    try:
                        with conn() as c:
                            cl=managed_class(c,u,query.get('classId',[None])[0])
                            return self.send_json(200,{'class':cl,**class_learning(c,cl['id'])})
                    except Invalid as e:return self.send_json(400,{'error':str(e)})
                if path=='/api/admin/together':
                    # 함께하기 설정, 지금 지도에 있는 학생, 채팅 기록(막힌 말 포함, 최근 500개)
                    try:
                        with conn() as c:
                            cl=managed_class(c,u,query.get('classId',[None])[0]);cid=cl['id'];now=time.time()
                            online=[{'id':r['owner'],'nickname':r['nickname'],'number':r['number'],'map':r['map'],'ago':round(now-r['updated'])} for r in c.execute('SELECT p.owner,p.map,p.updated,a.nickname,a.number FROM presence p JOIN accounts a ON a.id=p.owner WHERE p.class_id=? AND p.updated>? ORDER BY a.number',(cid,now-PRESENCE_TTL-8))]
                            msgs=[{'id':r['id'],'owner':r['owner'],'nickname':r['nickname'],'number':r['number'],'map':r['map'],'created':r['created'],'body':r['body'],'status':r['status'],'reason':r['reason']} for r in c.execute('SELECT m.*,a.nickname,a.number FROM chat_messages m LEFT JOIN accounts a ON a.id=m.owner WHERE m.class_id=? ORDER BY m.created DESC LIMIT 500',(cid,))]
                            students=[{'id':r['id'],'number':r['number'],'nickname':r['nickname']} for r in c.execute("SELECT id,number,nickname FROM accounts WHERE class_id=? AND role='student' AND COALESCE(active,1)<>0 ORDER BY number",(cid,))]
                            st=class_settings(c,cid)
                    except Invalid as e:return self.send_json(400,{'error':str(e)})
                    return self.send_json(200,{'class':cl,'settings':st,'online':online,'messages':msgs,'students':students})
                if path=='/api/admin/answers':
                    book=answer_book(query.get('gameId',[''])[0])
                    return self.send_json(200,book) if book is not None else self.send_json(404,{'error':'없는 의뢰입니다.'})
                if path=='/api/admin/reports':
                    q='SELECT r.id,r.created,r.kind,r.body,r.context,r.status,a.nickname,a.number,a.role,cl.name AS class_name FROM reports r LEFT JOIN accounts a ON a.id=r.owner LEFT JOIN classes cl ON cl.id=r.class_id'
                    with conn() as c:rows=c.execute(q+' ORDER BY r.created DESC LIMIT 500').fetchall() if u['role']=='admin' else c.execute(q+' WHERE r.class_id=? ORDER BY r.created DESC LIMIT 500',(u['class_id'],)).fetchall()
                    return self.send_json(200,{'reports':[report_row(r) for r in rows]})
                if path=='/api/admin/codes':
                    # 관리자는 모든 학급, 교사는 자기 학급. 모르는 코드(기능 전에 만들고 아직 한 번도 안 들어온 계정)는 null.
                    with conn() as c:
                        classes=[dict(r) for r in c.execute('SELECT id,grade,room,name FROM classes ORDER BY grade,room,created')] if u['role']=='admin' else [managed_class(c,u,None)]
                        for cl in classes:
                            t=c.execute("SELECT code_enc FROM accounts WHERE class_id=? AND role='teacher' ORDER BY created LIMIT 1",(cl['id'],)).fetchone()
                            cl['teacherCode']=open_code(c,t['code_enc']) if t else None
                            tst=c.execute("SELECT code_enc FROM accounts WHERE class_id=? AND role='student' AND number=? AND COALESCE(active,1)<>0",(cl['id'],TEST_NUMBER)).fetchone()
                            cl['testCode']=open_code(c,tst['code_enc']) if tst else None
                            cl['students']=[dict(id=a['id'],number=a['number'],nickname=a['nickname'],active=a['active']!=0,code=open_code(c,a['code_enc'])) for a in c.execute("SELECT id,number,nickname,active,code_enc FROM accounts WHERE class_id=? AND role='student' AND number<>0 ORDER BY number,COALESCE(active,1) DESC,created",(cl['id'],))]
                        mine=c.execute('SELECT code_enc FROM accounts WHERE id=?',(u['id'],)).fetchone()
                        my_code=open_code(c,mine['code_enc']) if mine else None
                    return self.send_json(200,{'classes':classes,'myCode':my_code})
                if path!='/api/admin/overview':return self.send_json(404,{'error':'없는 요청입니다.'})
                with conn() as c:
                    classes=c.execute('SELECT id,grade,room,name FROM classes ORDER BY grade,room,created').fetchall() if u['role']=='admin' else c.execute('SELECT id,grade,room,name FROM classes WHERE id=?',(u['class_id'],)).fetchall()
                    classes=[dict(r) for r in classes]
                    if u['role']=='teacher' and not classes and u['class_id']:classes=[{'id':u['class_id'],'grade':u['grade'],'room':u['room'],'name':f"{u['grade']}학년 {u['room']}반"}]
                    for cl in classes:
                        t=c.execute("SELECT id,nickname FROM accounts WHERE class_id=? AND role='teacher' ORDER BY created LIMIT 1",(cl['id'],)).fetchone()
                        cl.update(teacher=dict(t) if t else None,students=class_students(c,cl['id']))
                with conn() as c:
                    fresh=c.execute("SELECT COUNT(*) FROM reports WHERE status='new'"+('' if u['role']=='admin' else ' AND class_id=?'),() if u['role']=='admin' else (u['class_id'],)).fetchone()[0]
                    for cl in classes:cl['boardOpen']=board_open(c,cl['id'])
                return self.send_json(200,{'me':u,'classes':classes,'lan':{'enabled':LAN,'urls':LAN_URLS,'public':PUBLIC},'reportsNew':fresh})
            if path=='/api/adventure':
                if u['role']!='student':return self.send_json(403,{'error':'학생 모험입니다.'})
                run=parse_qs(urlparse(self.path).query).get('runId',[''])[0]
                with conn() as c:
                    events=[{**dict(r),'payload':json.loads(r['payload'])} for r in c.execute('SELECT kind,payload FROM events WHERE owner=? ORDER BY received',(u['id'],))]
                events=[e for e in events if e['payload'].get('runId')==run]
                catalog=list(CUSTOM_GAMES)
                quests=[];items=[dict(id='notebook',title='탐구 수첩',description='발견한 것과 실험 기록을 모아 두는 수첩.',source='중앙 광장',count=1)]
                catalog=catalog+[(m['id'],m['quest'],m['place'],m['zone'],'mission.completed') for m in missions().values() if m['id'] not in {c[0] for c in catalog}]
                for gid,title,place,zone,completion in catalog:
                    evidence=[e for e in events if e['payload'].get('gameId')==gid]
                    done=bool(completion and any(e['kind']==completion for e in evidence))
                    quests.append(dict(id=gid,title=title,place=place,zone=zone,status='completed' if done else 'active' if evidence else 'available'))
                    if done:
                        card=next(e['payload'] for e in reversed(evidence) if e['kind']==completion)
                        items.append(dict(id=gid,title={'R3-G04':'빛 복구 기록','R3-G05':'항구 비교 기록','R3-G06':'전자석 제작 카드','R3-G07':'크레인 운반 기록'}.get(gid) or missions().get(gid,{}).get('card','의뢰 기록'),description=card.get('reason') or missions().get(gid,{}).get('finish',{}).get('clue') or '실험과 설명을 마치고 남긴 기록입니다.',source=place,count=1))
                return self.send_json(200,dict(quests=quests,items=items,dex=dex_got(*run_progress(events,run)),dexTotal=len(dex_conf()['cards']),dexRegions=dex_region_totals()))
            if path=='/api/dex':
                if u['role']!='student':return self.send_json(403,{'error':'학생 화면에서 볼 수 있어요.'})
                q=parse_qs(urlparse(self.path).query);run=q.get('runId',[''])[0];game=q.get('game',[''])[0]
                if game and not re.fullmatch(r'R\d-G\d\d',game):return self.send_json(400,{'error':'의뢰를 확인해 주세요.'})
                with conn() as c:events=dex_events(c,u['id'])
                return self.send_json(200,dex_view(*run_progress(events,run),game=game or None))
            if path=='/api/missions':return self.send_json(200,{'missions':[mission_summary(m) for m in missions().values()]})
            # 교과서 펼쳐 보기: 출판사 저작물이라 둘러보기 계정에는 주지 않고, 의뢰에 연결된 쪽만 준다(textbook.py)
            if path=='/api/textbook':
                if u.get('guest'):return self.send_json(403,{'error':textbook.GUEST})
                data=textbook.sections(ROOT,query.get('mission',[''])[0])
                return self.send_json(200,data) if data else self.send_json(404,{'error':'의뢰를 확인해 주세요.'})
            if path=='/api/textbook-page':
                if u.get('guest'):return self.send_json(403,{'error':textbook.GUEST})
                raw=textbook.page(ROOT,query.get('book',[''])[0],query.get('page',[''])[0])
                if raw is None:return self.send_json(404,{'error':'교과서 쪽을 찾을 수 없어요.'})
                if u['role']=='student': # 학생 코드 하나로 교과서 전체를 차례로 받아 가지 못하게 학생마다 받는 쪽 수를 제한한다(선생님은 제한 없음)
                    now=time.time()
                    with conn() as c:
                        c.execute('DELETE FROM textbook_hits WHERE owner=? AND t<?',(u['id'],now-86400))
                        day=c.execute('SELECT COUNT(*) FROM textbook_hits WHERE owner=?',(u['id'],)).fetchone()[0]
                        hour=c.execute('SELECT COUNT(*) FROM textbook_hits WHERE owner=? AND t>?',(u['id'],now-3600)).fetchone()[0]
                        if day>=TEXTBOOK_DAY:return self.send_json(429,{'error':textbook.DAY_LIMIT})
                        if hour>=TEXTBOOK_HOUR:return self.send_json(429,{'error':textbook.HOUR_LIMIT})
                        c.execute('INSERT INTO textbook_hits VALUES(?,?)',(u['id'],now))
                self.send_response(200);self.send_header('Content-Type','image/webp');self.send_header('Cache-Control','no-store');self.send_header('Pragma','no-cache');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
            if path=='/api/mission':
                with conn() as c:
                    m=teaching.resolve(c,missions(),query.get('id',[''])[0],query.get('revision',[None])[0])
                    if not m:return self.send_json(404,{'error':'과제 원본을 찾을 수 없습니다. 선생님께 알려 주세요.'})
                    rev=teaching.archive(c,m)
                    if m['id'] in missions():teaching.archive(c,missions()[m['id']])
                return self.send_json(200,{**public_mission(m),'contentRevision':rev})
            if path=='/api/magnet-progress':
                if u['role']!='student':return self.send_json(403,{'error':'학생 의뢰입니다.'})
                run=parse_qs(urlparse(self.path).query).get('runId',[''])[0]
                with conn() as c:progress=g06_progress(c,u['id'],run)
                return self.send_json(200,progress)
            if path=='/api/workshop-progress':
                if u['role']!='student':return self.send_json(403,{'error':'학생 의뢰입니다.'})
                run=parse_qs(urlparse(self.path).query).get('runId',[''])[0]
                with conn() as c:progress=g05_progress(c,u['id'],run)
                return self.send_json(200,progress)
            if path=='/api/handoff':
                if u['role']!='student':return self.send_json(403,{'error':'학생 의뢰입니다.'})
                run=parse_qs(urlparse(self.path).query).get('runId',[''])[0]
                with conn() as c:events=[dict(r) for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind IN ('question.submitted','game.completed','quest.received') ORDER BY received",(u['id'],))]
                events=[{**e,'payload':json.loads(e['payload'])} for e in events]
                events=[e for e in events if e['payload'].get('runId')==run]
                completed=any(e['kind']=='game.completed' for e in events)
                questions=[e['payload'].get('answer','') for e in events if e['kind']=='question.submitted' and e['payload'].get('answer')]
                return self.send_json(200,{'handoff':{'question':questions[-1],'source':'관리실 빛 자물쇠','destination':'가린 회로 추리','received':any(e['kind']=='quest.received' for e in events)} if completed and questions else None})
            if path=='/api/state':
                with conn() as c:
                    current=learning_reset.status(c,' FOR SHARE' if PG else '')
                    row=c.execute('SELECT * FROM checkpoints WHERE owner=?',(u['id'],)).fetchone()
                return self.send_json(200,{'revision':row['revision'] if row else 0,'state':json.loads(row['state']) if row else None,'learningEpoch':current['epoch']})
            if path.startswith('/api/files/'):
                fid=path.rsplit('/',1)[-1]
                with conn() as c:
                    file=c.execute('SELECT * FROM files WHERE id=? AND class_id=?',(fid,u['class_id'])).fetchone()
                    visible=u['role']=='teacher' or any(json.loads(r['payload']).get('url')==path for r in c.execute('SELECT payload FROM resources WHERE class_id=? AND published=1',(u['class_id'],)))
                if not file or not visible:return self.send_json(404,{'error':'열 수 있는 파일이 없습니다.'})
                from urllib.parse import quote
                raw=file['data'];self.send_response(200);self.send_header('Content-Type',file['mime']);self.send_header('Content-Length',str(len(raw)));self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','private, no-store');self.send_header('Content-Disposition',"inline; filename*=UTF-8''"+quote(file['name']));self.send_header('Content-Security-Policy',"sandbox; default-src 'none'; frame-ancestors 'self'");self.end_headers();self.wfile.write(raw);return
            if path=='/api/placements':
                with conn() as c:
                    rows=c.execute('SELECT payload FROM placements WHERE class_id=?'+('' if u['role']=='teacher' else ' AND published=1'),(u['class_id'],)).fetchall()
                    visible={r['id'] for r in c.execute('SELECT id FROM resources WHERE class_id=? AND published=1',(u['class_id'],))}
                items=[json.loads(r['payload']) for r in rows]
                if u['role']!='teacher':
                    for p in items:p['resourceIds']=[i for i in p['resourceIds'] if i in visible]
                    items=[p for p in items if p['resourceIds']]
                return self.send_json(200,{'placements':items})
            if path=='/api/resources':
                # 학생은 자기 반의 게시 자료만, 선생님은 숨긴 자료까지, 관리자는 고른 학급의 자료를 본다.
                staff=u['role'] in ('teacher','admin')
                try:
                    with conn() as c:
                        cid=managed_class(c,u,query.get('classId',[None])[0])['id'] if staff else u['class_id']
                        rows=c.execute('SELECT payload FROM resources WHERE class_id=?'+('' if staff else ' AND published=1'),(cid,)).fetchall()
                except Invalid as e:return self.send_json(400,{'error':str(e)})
                except PermissionError:return self.send_json(403,{'error':'이 학급을 관리할 권한이 없습니다.'})
                return self.send_json(200,{'resources':[json.loads(x['payload']) for x in rows]})
            if path=='/api/dashboard':
                if u['role'] not in ('teacher','admin'):return self.send_json(403,{'error':'교사 권한이 필요합니다.'})
                cid=u['class_id'] if u['role']=='teacher' else query.get('classId',[None])[0]
                with conn() as c:
                    students=[public_user(x) for x in c.execute('SELECT * FROM accounts WHERE class_id=? AND role=? ORDER BY number',(cid,'student'))]
                    # 배움 관찰실은 한 학생씩 본다. student를 주면 그 학생 기록만 보낸다(반 전체 기록은 Vercel 응답 한도 4.5 MB를 넘을 수 있다).
                    sid=query.get('student',[None])[0]
                    if sid is not None:events=[dict(x) for x in c.execute('SELECT e.* FROM events e JOIN accounts a ON e.owner=a.id WHERE a.class_id=? AND e.owner=? ORDER BY e.received',(cid,sid))]
                    else:events=[dict(x) for x in c.execute('SELECT e.* FROM events e JOIN accounts a ON e.owner=a.id WHERE a.class_id=? ORDER BY e.received',(cid,))]
                for e in events:e['payload']=json.loads(e['payload'])
                with conn() as c:teaching.attach_reviews(c,events)
                return self.send_json(200,{'students':students,'events':events,'asOf':time.time(),'demo':True})
            return self.send_json(404,{'error':'없는 요청입니다.'})
        file=(ROOT/'public'/('index.html' if path=='/' else 'admin.html' if path in ('/admin','/admin/') else path.lstrip('/'))).resolve()
        if not file.is_relative_to((ROOT/'public').resolve()) or not file.is_file():return self.send_json(404,{'error':'파일이 없습니다.'})
        raw=file.read_bytes();mime='text/javascript' if file.suffix=='.mjs' else mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
        self.send_response(200);self.send_header('Content-Type',mime+'; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-cache');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self' https://www.youtube-nocookie.com; frame-ancestors 'none'; object-src 'none'; base-uri 'none'");self.end_headers();self.wfile.write(raw)
    def admin_post(self,u,path,data):
        # 교사는 자기 학급만, 관리자는 모든 학급. 학생 기록은 지우지 않고 비활성화만 한다.
        if u['role'] not in ('teacher','admin'):return self.send_json(403,{'error':'선생님 권한이 필요합니다.'})
        if path=='/api/admin/together':
            # 함께하기와 채팅 켜고 끄기, 학생 한 명의 채팅 막기와 풀기
            if set(data)-{'classId','together','chat','mute','weekly'}:raise Invalid('설정 항목을 확인해 주세요.')
            if any(k in data and type(data[k]) is not bool for k in ('together','chat','weekly')):raise Invalid('켜기와 끄기 값을 확인해 주세요.')
            with conn() as c:
                cid=managed_class(c,u,data.get('classId'))['id'];st=class_settings(c,cid)
                for k in ('together','chat','weekly'):
                    if k in data:st[k]=data[k]
                if not st['together']:st['chat']=False
                m=data.get('mute')
                if m is not None:
                    if not isinstance(m,dict) or set(m)!={'id','on'} or type(m['on']) is not bool or not isinstance(m['id'],str):raise Invalid('채팅 막기 값을 확인해 주세요.')
                    if not c.execute("SELECT 1 FROM accounts WHERE id=? AND class_id=? AND role='student'",(m['id'],cid)).fetchone():raise NotFound
                    st['muted']=[x for x in st['muted'] if x!=m['id']]+([m['id']] if m['on'] else [])
                save_settings(c,cid,st)
                if not st['together']:c.execute('DELETE FROM presence WHERE class_id=?',(cid,))
            return self.send_json(200,{'settings':st})
        if path=='/api/admin/chat/status':
            # 선생님이 채팅 한 줄을 가리거나 다시 보인다(막힌 말을 잘못 막았다고 보면 보이게 할 수도 있다)
            if set(data)-{'id','status','classId'} or not isinstance(data.get('id'),str) or data.get('status') not in ('hidden','shown'):raise Invalid('채팅 상태 값을 확인해 주세요.')
            with conn() as c:
                row=c.execute('SELECT class_id FROM chat_messages WHERE id=?',(data['id'],)).fetchone()
                if not row:raise NotFound
                managed_class(c,u,row['class_id'])
                c.execute('UPDATE chat_messages SET status=? WHERE id=?',(data['status'],data['id']))
            return self.send_json(200,{'ok':True})
        if path=='/api/admin/reports/status':
            if set(data)!={'id','status'} or not isinstance(data['id'],str) or data['status'] not in ('new','seen','done'):raise Invalid('제보 상태 값을 확인해 주세요.')
            with conn() as c:
                row=c.execute('SELECT class_id FROM reports WHERE id=?',(data['id'],)).fetchone()
                if not row or (u['role']!='admin' and row['class_id']!=u['class_id']):raise PermissionError
                c.execute('UPDATE reports SET status=? WHERE id=?',(data['status'],data['id']))
            return self.send_json(200,{'ok':True})
        if path=='/api/admin/students/create':
            entries=data.get('entries')
            if set(data)-{'classId','entries'} or not isinstance(entries,list) or not 1<=len(entries)<=60:raise Invalid('한 번에 1명에서 60명까지 만들 수 있습니다.')
            clean=[]
            for e in entries:
                if not isinstance(e,dict) or set(e)-{'number','nickname'}:raise Invalid('학생 정보 형식을 확인해 주세요.')
                n=clean_number(e.get('number'));clean.append((n,clean_nickname(e.get('nickname'),n)))
            numbers={n for n,_ in clean}
            if len(numbers)!=len(clean):raise Invalid('같은 번호가 두 번 들어 있습니다.')
            def check(c):
                cl=managed_class(c,u,data.get('classId'))
                clash=sorted(numbers&{r['number'] for r in c.execute("SELECT number FROM accounts WHERE class_id=? AND role='student' AND COALESCE(active,1)<>0",(cl['id'],))})
                if clash:raise Invalid('이미 있는 번호입니다: '+', '.join(f'{n}번' for n in clash))
                return cl
            with conn() as c:check(c)
            codes=issue_codes(len(clean));now=time.time();made=[]
            with conn() as c:
                c.execute('BEGIN IMMEDIATE');cl=check(c)
                for (n,nick),(code,lk,salt,digest) in zip(clean,codes):
                    sid='s-'+secrets.token_hex(6);c.execute('INSERT INTO accounts(id,role,class_id,grade,room,number,nickname,salt,secret,lookup,active,created,code_enc) VALUES(?,?,?,?,?,?,?,?,?,?,1,?,?)',(sid,'student',cl['id'],cl['grade'],cl['room'],n,nick,salt,digest,lk,now,seal_code(c,code)))
                    made.append(dict(id=sid,number=n,nickname=nick,code=code))
            return self.send_json(200,made)
        if path=='/api/admin/students/update':
            if set(data)-{'id','nickname','number','active'}:raise Invalid('수정 항목을 확인해 주세요.')
            with conn() as c:
                c.execute('BEGIN IMMEDIATE');row=managed_student(c,u,data.get('id'))
                nick=clean_nickname(data['nickname']) if 'nickname' in data else row['nickname']
                num=clean_number(data['number']) if 'number' in data else row['number']
                if 'active' in data and type(data['active']) is not bool:raise Invalid('상태 값을 확인해 주세요.')
                active=data.get('active',row['active']!=0)
                if active and (num!=row['number'] or row['active']==0) and c.execute("SELECT 1 FROM accounts WHERE class_id=? AND role='student' AND number=? AND id<>? AND COALESCE(active,1)<>0",(row['class_id'],num,row['id'])).fetchone():raise Invalid(f'{num}번 학생이 이미 있습니다. 번호를 먼저 바꿔 주세요.')
                c.execute('UPDATE accounts SET nickname=?,number=?,active=? WHERE id=?',(nick,num,int(active),row['id']));row=c.execute('SELECT * FROM accounts WHERE id=?',(row['id'],)).fetchone()
            if not active:drop_sessions(row['id'])
            return self.send_json(200,student_view(row))
        if path in ('/api/admin/students/reset-code','/api/admin/teachers/reset-code','/api/admin/me/reset-code'):
            student=path=='/api/admin/students/reset-code'
            with conn() as c:
                if student:target=managed_student(c,u,data.get('id'))['id']
                elif path=='/api/admin/me/reset-code':target=u['id']
                else:
                    if u['role']!='admin':raise PermissionError
                    t=c.execute("SELECT id FROM accounts WHERE class_id=? AND role='teacher' ORDER BY created LIMIT 1",(managed_class(c,u,data.get('classId'))['id'],)).fetchone()
                    if not t:raise NotFound
                    target=t['id']
            code,lk,salt,digest=issue_codes(1,teacher=not student)[0]
            with conn() as c:c.execute('UPDATE accounts SET salt=?,secret=?,lookup=?,code_enc=? WHERE id=?',(salt,digest,lk,seal_code(c,code),target))
            drop_sessions(target,keep=self.token() if target==u['id'] else None)
            return self.send_json(200,{'code':code})
        if path=='/api/admin/test-account':
            # 반의 체험 계정을 만들거나, 이미 있으면 새 코드로 바꾼다. 코드는 이때 한 번 보이고 「전체 코드」에도 남는다.
            if set(data)-{'classId'}:raise Invalid('학급 정보를 확인해 주세요.')
            with conn() as c:
                cl=managed_class(c,u,data.get('classId'))
                old=c.execute("SELECT id FROM accounts WHERE class_id=? AND role='student' AND number=?",(cl['id'],TEST_NUMBER)).fetchone()
            code,lk,salt,digest=issue_codes(1)[0];now=time.time()
            with conn() as c:
                if old:c.execute('UPDATE accounts SET salt=?,secret=?,lookup=?,code_enc=?,active=1 WHERE id=?',(salt,digest,lk,seal_code(c,code),old['id']));tid=old['id']
                else:
                    tid='test-'+secrets.token_hex(6)
                    c.execute('INSERT INTO accounts(id,role,class_id,grade,room,number,nickname,salt,secret,lookup,active,created,code_enc) VALUES(?,?,?,?,?,?,?,?,?,?,1,?,?)',(tid,'student',cl['id'],cl['grade'],cl['room'],TEST_NUMBER,'체험 계정',salt,digest,lk,now,seal_code(c,code)))
            if old:drop_sessions(tid)
            return self.send_json(200,{'code':code,'created':not old})
        if path=='/api/admin/students/reset-avatar':
            with conn() as c:row=managed_student(c,u,data.get('id'));c.execute('UPDATE accounts SET avatar=NULL WHERE id=?',(row['id'],))
            return self.send_json(200,{'ok':True})
        if path=='/api/admin/codes/import':
            if u['role']!='admin':raise PermissionError
            codes=data.get('codes')
            if set(data)-{'codes'} or not isinstance(codes,list) or not 1<=len(codes)<=400 or not all(isinstance(x,str) and 0<len(x)<=60 for x in codes):raise Invalid('코드는 한 번에 400개까지 등록할 수 있습니다.')
            saved,unknown=0,[]
            with conn() as c:
                for code in dict.fromkeys(norm_code(x) for x in codes if norm_code(x)):
                    row=c.execute('SELECT id,code_enc FROM accounts WHERE lookup=?',(code_lookup(c,code),)).fetchone()
                    if not row:unknown.append(code);continue
                    if open_code(c,row['code_enc'])!=code:c.execute('UPDATE accounts SET code_enc=? WHERE id=?',(seal_code(c,code),row['id']))
                    saved+=1
            return self.send_json(200,{'saved':saved,'unknown':unknown})
        if path=='/api/admin/classes/create':
            if u['role']!='admin':raise PermissionError
            grade,room,name=data.get('grade'),data.get('room'),data.get('name') or ''
            if set(data)-{'grade','room','name'}:raise Invalid('학급 정보 형식을 확인해 주세요.')
            if type(grade) is not int or not 1<=grade<=6:raise Invalid('학년은 1부터 6까지 고를 수 있습니다.')
            if type(room) is not int or not 1<=room<=20:raise Invalid('반은 1부터 20까지 고를 수 있습니다.')
            if not isinstance(name,str) or len(name.strip())>30 or any(ord(ch)<32 for ch in name):raise Invalid('학급 이름은 30자 이하로 써 주세요.')
            name=name.strip() or f'{grade}학년 {room}반';cid='class-'+secrets.token_hex(5);tid='t-'+secrets.token_hex(6);code,lk,salt,digest=issue_codes(1,teacher=True)[0];now=time.time()
            with conn() as c:
                c.execute('INSERT INTO classes VALUES(?,?,?,?,?)',(cid,grade,room,name,now))
                c.execute('INSERT INTO accounts(id,role,class_id,grade,room,number,nickname,salt,secret,lookup,active,created,code_enc) VALUES(?,?,?,?,?,?,?,?,?,?,1,?,?)',(tid,'teacher',cid,grade,room,0,'선생님',salt,digest,lk,now,seal_code(c,code)))
            return self.send_json(200,{'class':{'id':cid,'grade':grade,'room':room,'name':name},'teacher':{'id':tid,'code':code}})
        if path=='/api/admin/npcs':
            if set(data)-{'classId','npc'}:raise Invalid('인물 정보 형식을 확인해 주세요.')
            npc=validate_npc(data.get('npc'))
            with conn() as c:
                c.execute('BEGIN IMMEDIATE');cl=managed_class(c,u,data.get('classId'))
                if not npc['id']:npc['id']='custom-'+secrets.token_hex(8)
                elif npc['id'].startswith('custom-'):
                    if not c.execute('SELECT 1 FROM npcs WHERE id=? AND class_id=?',(npc['id'],cl['id'])).fetchone():raise Invalid('없는 인물입니다.')
                elif npc['id'] not in default_npc_ids():raise Invalid('없는 인물입니다.')
                c.execute('INSERT INTO npcs(id,class_id,payload) VALUES(?,?,?) ON CONFLICT(id,class_id) DO UPDATE SET payload=excluded.payload',(npc['id'],cl['id'],json.dumps(npc,ensure_ascii=False)))
            return self.send_json(200,npc)
        if path=='/api/admin/npcs/reset':
            if set(data)-{'classId','id'} or not isinstance(data.get('id'),str):raise Invalid('인물을 골라 주세요.')
            with conn() as c:cl=managed_class(c,u,data.get('classId'));removed=c.execute('DELETE FROM npcs WHERE id=? AND class_id=?',(data['id'],cl['id'])).rowcount
            return self.send_json(200,{'ok':True,'removed':bool(removed)})
        return self.send_json(404,{'error':'없는 요청입니다.'})
    def board_post(self,u,path,data):
        with conn() as c:out=self.board_apply(c,u,path,data) # 응답은 기록을 저장한 뒤에 보낸다
        if out is None:return self.send_json(404,{'error':'없는 요청입니다.'})
        return self.send_json(200,out)
    def board_apply(self,c,u,path,data):
        now=time.time();staff=u['role']!='student'
        cid=board_class(c,u,data.get('classId'))
        def post_of(pid):
            p=c.execute('SELECT * FROM board_posts WHERE id=?',(pid,)).fetchone() if isinstance(pid,str) else None
            if not p or p['class_id']!=cid or (p['status']!='shown' and not staff):raise Invalid('찾는 글이 없어요. 지워졌을 수 있어요.')
            return p
        def limit(table,kind):
            if c.execute(f'SELECT COUNT(*) FROM {table} WHERE owner=? AND created>?',(u['id'],now-86400)).fetchone()[0]>=BOARD_LIMITS[kind][1 if staff else 0]:raise Invalid('오늘은 더 쓸 수 없어요. 내일 다시 써 주세요.')
        if path=='/api/board/post':
            if set(data)-{'kind','title','body','gameId','classId'} or data.get('kind') not in BOARD_KINDS:raise Invalid('글 종류를 골라 주세요.')
            title=board_text(data.get('title'),2,40,'제목을 2자에서 40자 사이로 적어 주세요.',line=True)
            body=board_text(data.get('body'),2,500,'내용을 2자에서 500자 사이로 적어 주세요.')
            game=data.get('gameId') or None
            if game is not None and (not isinstance(game,str) or game not in {g for _,_,gs in region_games() for g in gs}):raise Invalid('의뢰를 다시 골라 주세요.')
            if data['kind']=='share' and not game:raise Invalid('어느 의뢰에서 얻은 결과인지 골라 주세요.')
            limit('board_posts','post');pid=secrets.token_hex(8)
            c.execute('INSERT INTO board_posts(id,class_id,owner,created,updated,kind,title,body,game_id,status,solved) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(pid,cid,u['id'],now,now,data['kind'],title,body,game,'shown',None))
            return {'ok':True,'id':pid}
        if path=='/api/board/reply':
            if set(data)-{'postId','body','classId'}:raise Invalid('답 형식을 확인해 주세요.')
            p=post_of(data.get('postId'));body=board_text(data.get('body'),2,300,'답을 2자에서 300자 사이로 적어 주세요.')
            limit('board_replies','reply');rid=secrets.token_hex(8)
            c.execute('INSERT INTO board_replies(id,post_id,class_id,owner,created,body,status) VALUES(?,?,?,?,?,?,?)',(rid,p['id'],cid,u['id'],now,body,'shown'))
            c.execute('UPDATE board_posts SET updated=? WHERE id=?',(now,p['id']))
            return {'ok':True,'id':rid}
        if path=='/api/board/solve':
            # 질문을 올린 학생(또는 선생님)이 도움이 된 답 하나를 고른다. null이면 고른 것을 푼다.
            if set(data)-{'postId','replyId','classId'}:raise Invalid('고른 답을 확인해 주세요.')
            p=post_of(data.get('postId'));rid=data.get('replyId')
            if p['kind']!='question' or (p['owner']!=u['id'] and not staff):raise Invalid('질문을 올린 사람만 도움이 된 답을 고를 수 있어요.')
            if rid is not None and not (isinstance(rid,str) and c.execute("SELECT 1 FROM board_replies WHERE id=? AND post_id=? AND status='shown'",(rid,p['id'])).fetchone()):raise Invalid('고른 답을 찾을 수 없어요.')
            c.execute('UPDATE board_posts SET solved=? WHERE id=?',(rid,p['id']))
            return {'ok':True}
        if path=='/api/board/remove':
            # 자기 글과 답만 지운다. 학생 화면에서는 사라지고 선생님 화면에는 「지운 글」로 남는다.
            keys=data.keys()-{'classId'}
            if keys not in ({'postId'},{'replyId'}):raise Invalid('지울 글을 확인해 주세요.')
            table,key=('board_posts','postId') if keys=={'postId'} else ('board_replies','replyId')
            row=c.execute(f'SELECT owner,class_id FROM {table} WHERE id=?',(data[key],)).fetchone() if isinstance(data[key],str) else None
            if not row or row['class_id']!=cid:raise Invalid('찾는 글이 없어요. 지워졌을 수 있어요.')
            if row['owner']!=u['id']:raise Invalid('내가 쓴 글만 지울 수 있어요.')
            c.execute(f"UPDATE {table} SET status='deleted' WHERE id=?",(data[key],))
            return {'ok':True}
        if path=='/api/board/status':
            # 선생님이 글이나 답을 학생 화면에서 가리거나 다시 보인다.
            if not staff:raise PermissionError
            if data.keys()-{'classId'}!={'type','id','status'} or data['type'] not in ('post','reply') or data['status'] not in ('shown','hidden') or not isinstance(data['id'],str):raise Invalid('바꿀 상태를 확인해 주세요.')
            table='board_posts' if data['type']=='post' else 'board_replies'
            row=c.execute(f'SELECT class_id,status FROM {table} WHERE id=?',(data['id'],)).fetchone()
            if not row or row['class_id']!=cid:raise Invalid('찾는 글이 없어요.')
            if row['status']=='deleted':raise Invalid('글쓴이가 지운 글은 다시 보일 수 없습니다.')
            c.execute(f'UPDATE {table} SET status=? WHERE id=?',(data['status'],data['id']))
            return {'ok':True}
        return None
    def do_POST(self):
        token=REQUEST_LEARNING_EPOCH.set(None)
        try:return self.post_route()
        finally:REQUEST_LEARNING_EPOCH.reset(token)
    def post_route(self):
        if not self.valid_host() or self.headers.get('X-Science-Client')!='local-v1' or not origin_allowed(self.headers.get('Origin'),self.headers.get('Host')):return self.send_json(403,{'error':'허용되지 않은 요청입니다.'})
        try:
            length=int(self.headers.get('Content-Length',0))
            if not 0<length<=((4200000 if PUBLIC else 7100000) if urlparse(self.path).path=='/api/files' else 250000):raise ValueError('요청 크기 오류')
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict):raise ValueError('요청 형식 오류')
            path=urlparse(self.path).path
            if not self.ready():return
            if path=='/api/setup':
                # 공개 배포 첫 설정: 관리자가 한 명도 없을 때만 관리자 코드를 한 번 만들어 보여 준다.
                code,lk,salt,digest=issue_codes(1,teacher=True)[0];now=time.time()
                with conn() as c:made=c.execute("INSERT INTO accounts(id,role,class_id,grade,room,number,nickname,salt,secret,lookup,active,created,code_enc) SELECT ?,'admin',NULL,NULL,NULL,0,'관리자',?,?,?,1,?,? WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE role='admin' AND COALESCE(active,1)<>0)",('admin-'+secrets.token_hex(4),salt,digest,lk,now,seal_code(c,code))).rowcount
                if made!=1:return self.send_json(403,{'error':'이미 관리자 코드가 있습니다.'})
                return self.send_json(200,{'code':code})
            if path=='/api/guest':
                now=time.time();key='guest:'+self.client_key()
                with conn() as c:
                    c.execute('DELETE FROM login_failures WHERE t<?',(now-60,))
                    made=c.execute('SELECT COUNT(*) FROM login_failures WHERE key=?',(key,)).fetchone()[0]
                # 연수에서는 여러 선생님이 같은 인터넷 주소로 한꺼번에 들어오므로 1분에 100개까지 둔다
                if made>=100:return self.send_json(429,{'error':'잠시 뒤 다시 눌러 주세요.'})
                with conn() as c:today=c.execute("SELECT COUNT(*) FROM accounts WHERE id LIKE 'guest-%' AND created>?",(now-86400,)).fetchone()[0]
                if today>=GUEST_DAILY:return self.send_json(429,{'error':'오늘은 둘러보기를 더 열 수 없어요. 내일 다시 눌러 주세요.'})
                gid='guest-'+secrets.token_hex(8);token=secrets.token_urlsafe(32)
                with conn() as c:
                    c.execute('INSERT INTO login_failures VALUES(?,?)',(key,now))
                    for old in [r['id'] for r in c.execute("SELECT id FROM accounts WHERE id LIKE 'guest-%' AND created<? LIMIT 50",(now-7*86400,)).fetchall()]:
                        for table,col in [('sessions','uid'),('checkpoints','owner'),('events','owner'),('health_actions','owner'),('health_turns','owner'),('health_runs','owner'),('accounts','id')]:c.execute(f'DELETE FROM {table} WHERE {col}=?',(old,))
                    c.execute('INSERT INTO accounts(id,role,class_id,grade,room,number,nickname,lookup,active,created) VALUES(?,?,?,?,?,?,?,?,1,?)',(gid,'student',GUEST_CLASS,6,0,TEST_NUMBER,'둘러보기','guest:'+gid,now))
                    c.execute('DELETE FROM sessions WHERE expires<?',(now,))
                    c.execute('INSERT INTO sessions VALUES(?,?,?)',(session_key(token),gid,now+GUEST_SECONDS))
                    row=c.execute('SELECT * FROM accounts WHERE id=?',(gid,)).fetchone()
                return self.send_json(200,public_user(row),{'Set-Cookie':self.cookie(token,GUEST_SECONDS)})
            if path=='/api/login':
                code=data.get('code','');now=time.time();key=self.client_key()
                with conn() as c:
                    c.execute('DELETE FROM login_failures WHERE t<?',(now-60,))
                    tries=c.execute('SELECT COUNT(*) FROM login_failures WHERE key=?',(key,)).fetchone()[0]
                # 공개 주소에서는 한 학급이 같은 인터넷 주소를 쓰므로 한도를 넉넉히 둔다.
                if tries>=(40 if PUBLIC else 8):return self.send_json(429,{'error':'잠시 뒤 다시 시도해 주세요.'})
                if not isinstance(code,str) or len(code)>60:raise ValueError('접근 코드를 확인해 주세요.')
                found=None
                if norm_code(code):
                    with conn() as c:
                        lookup=code_lookup(c,code)
                        rows=c.execute('SELECT * FROM accounts WHERE lookup=?',(lookup,)).fetchall() or c.execute('SELECT * FROM accounts WHERE lookup IS NULL').fetchall() # lookup이 없는 옛 계정만 전체 확인
                    for row in rows:
                        if row['salt'] and row['secret'] and hmac.compare_digest(hashlib.scrypt(norm_code(code).encode(),salt=row['salt'],n=16384,r=8,p=1),row['secret']):found=row
                    if found and found['lookup'] is None:
                        with conn() as c:c.execute('UPDATE accounts SET lookup=? WHERE id=? AND lookup IS NULL',(lookup,found['id']))
                    if found and not found['code_enc']: # 기능을 넣기 전에 만든 코드는 처음 들어올 때 「전체 코드」에 채운다
                        with conn() as c:c.execute('UPDATE accounts SET code_enc=? WHERE id=? AND code_enc IS NULL',(seal_code(c,code),found['id']))
                if not found or found['active']==0:
                    with conn() as c:c.execute('INSERT INTO login_failures VALUES(?,?)',(key,now))
                    return self.send_json(401,{'error':'접근 코드가 맞지 않습니다.'})
                token=secrets.token_urlsafe(32)
                with conn() as c:
                    c.execute('DELETE FROM sessions WHERE expires<?',(now,))
                    c.execute('INSERT INTO sessions VALUES(?,?,?)',(session_key(token),found['id'],now+SESSION_SECONDS))
                return self.send_json(200,public_user(found),{'Set-Cookie':self.cookie(token,SESSION_SECONDS)})
            u=self.user()
            if not u:return self.send_json(401,{'error':'다시 접속해 주세요.'})
            if u['role']=='student' and path not in {'/api/logout','/api/avatar','/api/nickname'}:
                REQUEST_LEARNING_EPOCH.set(self.headers.get('X-Science-Learning-Epoch','0'))
                with conn():pass
            if path=='/api/nickname':
                if u['role']!='student':return self.send_json(403,{'error':'학생 계정에서 바꿀 수 있어요.'})
                if set(data)!={'nickname'}:raise Invalid('닉네임만 바꿀 수 있어요.')
                nickname=clean_nickname(data['nickname'])
                with conn() as c:
                    c.execute('UPDATE accounts SET nickname=? WHERE id=?',(nickname,u['id']))
                    changed=c.execute('SELECT * FROM accounts WHERE id=?',(u['id'],)).fetchone()
                return self.send_json(200,public_user(changed))
            if path in {'/api/activity-pulse','/api/activity-error'}:
                try:
                    with conn() as c:result=(learning_metrics.pulse if path.endswith('pulse') else learning_metrics.error)(c,u,data,teaching_catalog())
                    return self.send_json(200,result)
                except PermissionError as e:return self.send_json(403,{'error':str(e)})
                except ValueError as e:return self.send_json(400,{'error':str(e)})
            if path in ('/api/health-inquiry/action','/api/health-inquiry/partner'):
                try:
                    if path.endswith('/action'):
                        with conn() as c:result=health_inquiry.mutate(c,u,data)
                        return self.send_json(200,{**result,'partner':health_partner.status(u)})
                    with conn() as c:pending=health_partner.reserve(c,u,data)
                    if 'cached' in pending:return self.send_json(200,pending['cached'])
                    try:reply=health_partner.generate(pending['context'])
                    except health_inquiry.InquiryError as e:
                        with conn() as c:health_partner.finish(c,u,pending,error=e)
                        raise
                    with conn() as c:result=health_partner.finish(c,u,pending,result=reply)
                    return self.send_json(200,result)
                except health_inquiry.InquiryError as e:return self.send_json(e.status,{'error':str(e)})
            if path.startswith('/api/teaching/'):
                try:
                    with conn() as c:result=teaching.post(c,u,path,data,teaching_catalog())
                    return self.send_json(200,result)
                except PermissionError as e:return self.send_json(403,{'error':str(e)})
                except ValueError as e:return self.send_json(400,{'error':str(e)})
            if path=='/api/logout':
                with conn() as c:c.execute('DELETE FROM sessions WHERE token=?',(session_key(self.token()),))
                return self.send_json(200,{'ok':True},{'Set-Cookie':self.cookie('',0)})
            if path=='/api/avatar':
                if not isinstance(data.get('avatar'),dict):raise Invalid('아바타 형식을 확인해 주세요.')
                with conn() as c:
                    c.execute('UPDATE accounts SET avatar=? WHERE id=?',(json.dumps(sanitize_avatar(data['avatar'])),u['id']));row=c.execute('SELECT * FROM accounts WHERE id=?',(u['id'],)).fetchone()
                return self.send_json(200,public_user(row))
            if path.startswith('/api/admin/'):return self.admin_post(u,path,data)
            if path=='/api/report' and u.get('guest'):return self.send_json(403,{'error':'둘러보기에서는 제보를 보낼 수 없어요.'})
            if path=='/api/report':
                # 화면에서 본 오류와 개선점. 관리 화면의 「제보」 탭에서 본다.
                body,ctx=data.get('body'),data.get('context') or {}
                if set(data)-{'kind','body','context'} or data.get('kind') not in REPORT_KINDS:raise Invalid('제보 종류를 골라 주세요.')
                if not isinstance(body,str) or not 2<=len(body.strip())<=600:raise Invalid('제보 내용을 2자에서 600자 사이로 적어 주세요.')
                if not isinstance(ctx,dict) or set(ctx)-REPORT_CONTEXT or any(not isinstance(v,(str,int,float)) or isinstance(v,bool) or (isinstance(v,str) and len(v)>300) for v in ctx.values()):raise Invalid('제보 위치 정보 형식을 확인해 주세요.')
                now=time.time()
                with conn() as c:
                    if c.execute('SELECT COUNT(*) FROM reports WHERE owner=? AND created>?',(u['id'],now-86400)).fetchone()[0]>=30:return self.send_json(429,{'error':'오늘은 제보를 더 보낼 수 없어요. 내일 다시 보내 주세요.'})
                    rid=secrets.token_hex(8)
                    c.execute('INSERT INTO reports(id,owner,class_id,created,kind,body,context,status) VALUES(?,?,?,?,?,?,?,?)',(rid,u['id'],u['class_id'],now,data['kind'],body.strip(),json.dumps(ctx,ensure_ascii=False),'new'))
                return self.send_json(200,{'ok':True,'id':rid})
            if path=='/api/files':
                if u['role']!='teacher':return self.send_json(403,{'error':'교사 권한이 필요합니다.'})
                if set(data)!={'name','data'} or not isinstance(data['name'],str) or not 1<=len(data['name'])<=180 or any(ord(ch)<32 for ch in data['name']) or not isinstance(data['data'],str):raise ValueError('파일 형식 오류')
                try:raw=base64.b64decode(data['data'],validate=True)
                except (ValueError,binascii.Error):raise ValueError('파일 내용 오류')
                if not 0<len(raw)<=(3 if PUBLIC else 5)*1024*1024:raise ValueError(f'파일은 {3 if PUBLIC else 5} MB 이하만 가능합니다.')
                mime='application/pdf' if raw.startswith(b'%PDF-') else 'image/png' if raw.startswith(bytes([137,80,78,71,13,10,26,10])) else 'image/jpeg' if raw.startswith(bytes([255,216,255])) else None
                if mime is None:raise ValueError('PDF, PNG, JPG 파일만 가능합니다.')
                fid=secrets.token_hex(16)
                with conn() as c:c.execute('INSERT INTO files VALUES(?,?,?,?,?,?)',(fid,u['class_id'],u['id'],data['name'],mime,raw))
                return self.send_json(200,{'url':'/api/files/'+fid,'name':data['name'],'kind':'pdf' if mime=='application/pdf' else 'image','size':len(raw)})
            if path=='/api/placements':
                if u['role']!='teacher':return self.send_json(403,{'error':'교사 권한이 필요합니다.'})
                p=validate_placement(data.get('placement'));pid=p['id'] or 'place-'+secrets.token_hex(12);p['id']=pid
                with conn() as c:
                    c.execute('BEGIN IMMEDIATE')
                    old=c.execute('SELECT class_id FROM placements WHERE id=?',(pid,)).fetchone()
                    if old and old['class_id']!=u['class_id']:raise ValueError('다른 학급 배치')
                    own={r['id'] for r in c.execute('SELECT id FROM resources WHERE class_id=?',(u['class_id'],))}
                    if not set(p['resourceIds'])<=own:raise ValueError('다른 학급 자료')
                    others=[json.loads(r['payload']) for r in c.execute('SELECT payload FROM placements WHERE class_id=? AND id<>?',(u['class_id'],pid))]
                    if p['published'] and any(q['published'] and q['map']==p['map'] and abs(q['x']-p['x'])<70 and abs(q['y']-p['y'])<70 for q in others):raise ValueError('물체가 겹칩니다')
                    c.execute('INSERT INTO placements VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET published=excluded.published,payload=excluded.payload',(pid,u['class_id'],p['published'],json.dumps(p,ensure_ascii=False)))
                return self.send_json(200,p)
            if path=='/api/resources':
                if u['role'] not in ('teacher','admin'):return self.send_json(403,{'error':'교사 권한이 필요합니다.'})
                if set(data)-{'resource','classId'}:raise ValueError('자료 형식 오류')
                resource=validate_resource(data.get('resource'));rid=resource['id'] or 'custom-'+secrets.token_hex(12);resource['id']=rid
                with conn() as c:
                    cid=managed_class(c,u,data.get('classId'))['id']
                    if resource['kind'] in ['image','pdf']:
                        file=c.execute('SELECT mime FROM files WHERE id=? AND class_id=?',(resource['url'].rsplit('/',1)[-1],cid)).fetchone()
                        if not file or (resource['kind']=='pdf')!=(file['mime']=='application/pdf'):raise ValueError('첨부 파일을 확인해 주세요.')
                    old=c.execute('SELECT class_id FROM resources WHERE id=?',(rid,)).fetchone()
                    if old and old['class_id']!=cid:return self.send_json(403,{'error':'다른 학급의 자료입니다.'})
                    if not old and data['resource']['id']:raise ValueError('없는 자료 ID')
                    c.execute('INSERT INTO resources VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET published=excluded.published,payload=excluded.payload',(rid,cid,u['id'],int(resource['published']),json.dumps(resource,ensure_ascii=False)))
                return self.send_json(200,resource)
            if path.startswith('/api/board/') and u.get('guest'):return self.send_json(403,{'error':'둘러보기에서는 게시판에 글을 쓸 수 없어요.'})
            if path.startswith('/api/board/'):return self.board_post(u,path,data)
            if u['role']!='student':return self.send_json(403,{'error':'학생 활동 요청만 받습니다.'})
            if path=='/api/together':
                # 몇 초마다 내 위치를 알리고, 같은 지도의 반 친구 위치, 새 채팅, 함께 하는 활동 상태를 받는다
                cid=u['class_id'];now=time.time()
                if u.get('guest') or not cid:return self.send_json(200,{'on':False,'chat':False})
                mp=data.get('map')
                if not isinstance(mp,str) or mp not in npc_maps():raise Invalid('지도를 확인해 주세요.')
                w,h=world_bounds(mp);x,y=data.get('x'),data.get('y')
                if type(x) not in (int,float) or type(y) not in (int,float) or not 0<=x<=w or not 0<=y<=h:raise Invalid('위치를 확인해 주세요.')
                d=data.get('dir') if data.get('dir') in ('up','down','left','right') else 'down';since=data.get('since') if type(data.get('since')) in (int,float) else 0
                with conn() as c:
                    st=class_settings(c,cid)
                    if not st['together']:return self.send_json(200,{'on':False,'chat':False})
                    c.execute('INSERT INTO presence VALUES(?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET class_id=excluded.class_id,map=excluded.map,payload=excluded.payload,updated=excluded.updated',(u['id'],cid,mp,json.dumps({'x':round(x),'y':round(y),'dir':d,'moving':data.get('moving') is True}),now))
                    others=[]
                    for r in c.execute('SELECT p.owner,p.payload,p.updated,a.nickname,a.avatar FROM presence p JOIN accounts a ON a.id=p.owner WHERE p.class_id=? AND p.map=? AND p.updated>? AND p.owner<>? AND COALESCE(a.active,1)<>0 ORDER BY p.updated DESC LIMIT 40',(cid,mp,now-PRESENCE_TTL,u['id'])):
                        try:pos=json.loads(r['payload'])
                        except (ValueError,TypeError):continue
                        others.append({'id':r['owner'],'nickname':r['nickname'],'avatar':account_avatar(r),**pos})
                    msgs=[]
                    if st['chat']:
                        msgs=[{'id':r['id'],'owner':r['owner'],'nickname':r['nickname'],'body':r['body'],'created':r['created'],'map':r['map'],'mine':r['owner']==u['id']} for r in c.execute("SELECT m.id,m.owner,m.body,m.created,m.map,a.nickname FROM chat_messages m JOIN accounts a ON a.id=m.owner WHERE m.class_id=? AND m.status='shown' AND m.created>? ORDER BY m.created DESC LIMIT 30",(cid,max(since,now-1800)))][::-1]
                    stations={}
                    conf=coop_conf(mp)
                    if conf:
                        row=c.execute('SELECT payload FROM coop_state WHERE class_id=? AND station=?',(cid,mp)).fetchone()
                        cs=coop_aged(json.loads(row['payload']),conf,now) if row else coop_fresh(conf,now)
                        stations[mp]=coop_view(c,cs,conf)
                return self.send_json(200,{'on':True,'chat':st['chat'],'muted':u['id'] in st['muted'],'others':others,'messages':msgs,'stations':stations,'now':now})
            if path=='/api/duel':
                region,claim,ans=data.get('region'),data.get('claim'),data.get('answer')
                if set(data)-{'region','claim','answer'} or region not in duel_region() or not isinstance(claim,str) or not isinstance(ans,str):raise Invalid('대결 기록을 확인해 주세요.')
                x=next((q for q in duels_conf()[region]['claims'] if q['id']==claim),None)
                if not x or ans not in [o['id'] for o in x['options']]:raise Invalid('대결 기록을 확인해 주세요.')
                with conn() as c:
                    pr=duel_progress(c,u,region)
                    if not pr['ready']:raise Invalid('이 지구의 의뢰를 모두 해결하면 척척과 대결할 수 있어요.')
                    ids=[q['id'] for q in duels_conf()[region]['claims']];fixed=set(pr['fixed']);ok=ans==x['key'];just=False
                    if claim not in fixed and not pr['done']: # 이미 바로잡은 말은 다시 기록하지 않는다(첫 반박 통계를 지킨다)
                        duel_event(c,u['id'],'duel.answered',{'region':region,'claim':claim,'answer':ans,'label':next(o['label'] for o in x['options'] if o['id']==ans),'correct':ok})
                        if ok:fixed.add(claim)
                        if ok and len(fixed)==len(ids):duel_event(c,u['id'],'duel.completed',{'region':region});just=True
                return self.send_json(200,{'correct':ok,'reply':x['ok'] if ok else x['hint'],'fixed':[i for i in ids if i in fixed],'done':pr['done'] or just,'justDone':just})
            if path=='/api/chat':
                cid=u['class_id'];now=time.time();body=data.get('body');mp=data.get('map')
                if u.get('guest') or not cid:raise Invalid('둘러보기에서는 채팅을 쓸 수 없어요.')
                if not isinstance(body,str) or not body.strip():raise Invalid('보낼 말을 적어 주세요.')
                body=re.sub(r'[\x00-\x1f\x7f]','',body).strip()
                if len(body)>CHAT_MAX:raise Invalid(f'한 번에 {CHAT_MAX}자까지 보낼 수 있어요.')
                if mp is not None and (not isinstance(mp,str) or mp not in npc_maps()):mp=None
                with conn() as c:
                    st=class_settings(c,cid)
                    if not st['chat']:raise Invalid('지금은 채팅을 쓸 수 없어요.')
                    if u['id'] in st['muted']:raise Invalid('선생님이 채팅을 잠시 막아 두었어요.')
                    last=c.execute('SELECT created,body FROM chat_messages WHERE owner=? ORDER BY created DESC LIMIT 3',(u['id'],)).fetchall()
                    if last and now-last[0]['created']<CHAT_GAP:raise Invalid('조금 천천히 보내 주세요.')
                    if c.execute('SELECT COUNT(*) FROM chat_messages WHERE owner=? AND created>?',(u['id'],now-86400)).fetchone()[0]>=CHAT_DAILY:raise Invalid('오늘은 채팅을 더 보낼 수 없어요.')
                    reason=chat_filter(body,[r['body'] for r in last if now-r['created']<60])
                    mid='chat-'+secrets.token_hex(8)
                    c.execute('INSERT INTO chat_messages VALUES(?,?,?,?,?,?,?,?)',(mid,cid,u['id'],mp,now,body,'blocked' if reason else 'shown',reason))
                if reason:return self.send_json(200,{'ok':False,'blocked':True,'reason':reason})
                return self.send_json(200,{'ok':True,'id':mid,'created':now})
            if path=='/api/coop':
                # 함께 하는 현장 활동: 반마다 장치 하나를 함께 돌리고(turn) 기록표를 함께 채운다(record). 동시에 눌러도 판이 꼬이지 않게 판 번호로 고친다.
                cid=u['class_id'];now=time.time();station=data.get('station');op=data.get('op');value=data.get('value')
                conf=coop_conf(station)
                if not conf or u.get('guest') or not cid:raise Invalid('함께 하는 활동이 아니에요.')
                if op not in ('look','turn','record'):raise Invalid('하려는 일을 확인해 주세요.')
                if op=='turn' and value not in (-1,1):raise Invalid('돌릴 방향을 확인해 주세요.')
                if op=='record' and value not in conf['choices']:raise Invalid('기록할 값을 확인해 주세요.')
                for _ in range(5):
                    with conn() as c:
                        if not class_settings(c,cid)['together']:raise Invalid('함께하기가 꺼져 있어요.')
                        row=c.execute('SELECT payload,version FROM coop_state WHERE class_id=? AND station=?',(cid,station)).fetchone()
                        ver=row['version'] if row else 0
                        cs=coop_aged(json.loads(row['payload']),conf,now) if row else coop_fresh(conf,now)
                        if op=='look' or cs['done']:return self.send_json(200,coop_view(c,cs,conf))
                        if op=='turn':cs['s']=(cs['s']+value)%conf['n'];cs['ops']=[x for x in cs['ops'] if x!=u['id']]+[u['id']]
                        else:cs['rec'][str(cs['s'])]=value;cs['recs']=[x for x in cs['recs'] if x!=u['id']]+[u['id']]
                        cs['ops'],cs['recs'],cs['at']=cs['ops'][-8:],cs['recs'][-8:],now
                        if cs['s']==conf['goal'] and all(cs['rec'].get(str(i))==conf['answers'][i] for i in range(conf['n'])):cs.update(done=True,doneAt=now,by=sorted(set(cs['ops'])|set(cs['recs'])))
                        if row:changed=c.execute('UPDATE coop_state SET payload=?,version=?,updated=? WHERE class_id=? AND station=? AND version=?',(json.dumps(cs),ver+1,now,cid,station,ver)).rowcount
                        else:changed=c.execute('INSERT INTO coop_state VALUES(?,?,?,?,?) ON CONFLICT(class_id,station) DO NOTHING',(cid,station,json.dumps(cs),1,now)).rowcount
                        if changed:result=coop_view(c,cs,conf)
                    if changed:return self.send_json(200,result)
                raise Invalid('친구와 동시에 눌렀어요. 다시 눌러 주세요.')
            if path=='/api/discovery-check':
                event={'id':'discovery-check','kind':data.get('kind'),'task':'discovery','occurred':'check','payload':data.get('payload')}
                if event['kind'] not in inquiry.EVENTS:raise ValueError('탐구 확인 오류')
                return self.send_json(200,validate_event(event))
            if path=='/api/writeup-check':
                # 보내기 전에 학생에게 보여 줄 낱말 확인과 관찰 근거. 저장하지 않는다.
                p=data.get('payload')
                if not isinstance(p,dict):raise ValueError('설명 확인 오류')
                try:r=writeup_event(p)
                except Invalid:raise
                except ValueError as e:return self.send_json(400,{'error':str(e)})
                return self.send_json(200,{k:r[k] for k in ('terms','evidence','evidenceDropped','itemMissing','version','mode','correct','evaluation','answerCheck','answerFeedback','answerRuleVersion') if k in r})
            if path=='/api/answer-check':
                if set(data)-{'gameId','taskId','answer','ruleRevision'} or data.get('taskId')!='CLOSURE':raise ValueError('답을 확인할 설명 문항이 아닙니다.')
                with conn() as c:result=answer_support.custom_check(ROOT,c,data.get('gameId'),data.get('ruleRevision'),data.get('answer'))
                return self.send_json(200,result)
            if path=='/api/answer-hint':
                if set(data)-{'gameId','taskId','contentRevision','answerRevision','gameVersion','itemRevision','fieldId','product','ruleRevision'}:raise ValueError('도움 요청을 확인해 주세요.')
                gid=data.get('gameId');tid=data.get('taskId')
                if not isinstance(gid,str) or not isinstance(tid,str) or gid not in teaching_catalog():raise ValueError('도움받을 의뢰를 확인해 주세요.')
                extra={}
                with conn() as c:
                    if tid=='CLOSURE':
                        item,rev=answer_support.custom(ROOT,c,gid,data.get('ruleRevision'))
                        result=answer_support.hints(item['answerRule']);extra['ruleRevision']=rev
                    elif tid in {'WRITEUP',gid+'.WRITEUP'}:
                        rev=data.get('itemRevision')
                        if rev is not None and (not isinstance(rev,str) or not re.fullmatch('[0-9a-f]{64}',rev)):raise ValueError('설명 문항 버전을 확인해 주세요.')
                        item,rev=writeup.resolve(c,ROOT,gid,rev)
                        if not item:raise ValueError('설명 문항을 다시 열어 주세요.')
                        result=answer_support.hints(item.get('answerRule'))
                    else:
                        m=teaching.resolve(c,missions(),gid,data.get('contentRevision'),data.get('gameVersion'))
                        task=next((x for x in (m or {}).get('tasks',[]) if x['id']==tid),None)
                        if not task:raise ValueError('없는 과제입니다.')
                        task=answer_task(m,task,data.get('answerRevision'),c)
                        field=data.get('fieldId')
                        if field is not None and not isinstance(field,str):raise ValueError('도움받을 칸을 확인해 주세요.')
                        if task['type']=='form':
                            result=[]
                            for f in task.get('fields',[]):
                                if field and field!=f['id']:continue
                                result.extend({**h,'fieldId':f['id'],'fieldLabel':f['label']} for h in answer_support.hints(f.get('answerRule')))
                        else:
                            product=data.get('product')
                            if product is not None and not isinstance(product,str):raise ValueError('조사할 제품을 확인해 주세요.')
                            result=answer_support.hints(answer_support.rule_for(task,{'product':product}))
                return self.send_json(200,{**extra,'hints':result,'message':'초성을 보고 핵심어를 떠올려 보세요. 조사나 문장 끝맺음은 자유롭게 써도 돼요.' if result else '내 관찰과 생각을 자유롭게 적어 주세요.'})
            if path=='/api/poe-check':
                event={'id':'poe-check-0000','kind':data.get('kind'),'task':'mission','occurred':'check','payload':data.get('payload')}
                if event['kind'] not in POE_EVENTS:raise ValueError('예상 확인 오류')
                r=validate_event(event)
                if r.get('evaluation')=='version_unavailable':raise ValueError('의뢰 자료가 바뀌었어요. 의뢰를 다시 열어 주세요.')
                return self.send_json(200,{k:r[k] for k in ('matched','actualLabel','observed','correct','feedback','evaluation') if k in r})
            if path=='/api/mission-ease':
                if set(data)-{'gameId','taskId','contentRevision','answerRevision','gameVersion','step'} or type(data.get('step')) is not int or not 0<=data['step']<=40:raise ValueError('도움 요청을 확인해 주세요.')
                with conn() as c:
                    m=teaching.resolve(c,missions(),data.get('gameId'),data.get('contentRevision'),data.get('gameVersion'))
                    task=next((x for x in (m or {}).get('tasks',[]) if x['id']==data.get('taskId')),None)
                    if not task:raise ValueError('없는 과제입니다.')
                    task=answer_task(m,task,data.get('answerRevision'),c)
                steps=ease_steps(m,task)
                return self.send_json(200,{'steps':steps[:data['step']+1],'left':max(0,len(steps)-data['step']-1)})
            if path=='/api/mission-check':
                with conn() as c:
                    m=teaching.resolve(c,missions(),data.get('gameId'),data.get('contentRevision'),data.get('gameVersion'))
                    task=next((x for x in (m or {}).get('tasks',[]) if x['id']==data.get('taskId')),None)
                    if not task:raise ValueError('없는 과제입니다.')
                    task=answer_task(m,task,data.get('answerRevision'),c)
                roles=data.get('roles',{});answer=data.get('answer','')
                if not isinstance(roles,dict) or len(roles)>24 or any(not isinstance(v,str) or len(v)>80 or len(str(k))>40 for k,v in roles.items()) or not isinstance(answer,str) or len(answer)>500:raise ValueError('미션 응답 오류')
                out=judge_mission(m,task,{'answer':answer,'roles':roles})
                # 해설은 틀린 답에만 숨긴다. 정답이 정해지지 않은 과제(내 생각, 예상, 계획 고르기)도 답한 뒤에 해설을 보여 준다.
                if task.get('explain') and out.get('correct') is not False:out['explain']=task['explain']
                cards=dex_task_cards(m['id'],task['id']) if out.get('correct') is not False else []
                if cards:out['cards']=cards
                return self.send_json(200,{**out,'wrong':[] if task.get('diagnostic') else mission_wrong(task,answer,roles,m)})
            if path=='/api/events':
                batch=data.get('events')
                if not isinstance(batch,list) or not 1<=len(batch)<=50:raise ValueError('기록 묶음 오류')
                accepted=[]
                with conn() as c:
                    errors,rejected=[],[] # 한 기록이 저장 조건에 맞지 않아도 나머지는 받는다. 모두 맞지 않을 때만 400.
                    for event in batch:
                        try:
                            payload=validate_event(event,c)
                            if event['kind']=='mission.completed' and payload.get('evaluation')!='version_unavailable':
                                m=teaching.resolve(c,missions(),payload['gameId'],payload.get('contentRevision'));need={x['id'] for x in m['tasks'] if not (x.get('optional') or x.get('required') is False) and (x['type']!='text' or x.get('answerRule'))}
                                done={json.loads(r['payload']).get('taskId','').split('.')[-1] for r in c.execute("SELECT payload FROM events WHERE owner=? AND kind='mission.answered'",(u['id'],)) if json.loads(r['payload']).get('runId')==payload['runId'] and json.loads(r['payload']).get('gameId')==payload['gameId'] and json.loads(r['payload']).get('correct') is not False and json.loads(r['payload']).get('contentRevision',payload['contentRevision'])==payload['contentRevision']}
                                if need-done:raise ValueError('아직 끝내지 않은 과제가 있어요.')
                            if event['kind'].startswith('crane.') and event['kind'] not in ['crane.scene_released','crane.recalled','crane.hint']:
                                prior=[{**dict(r),'payload':json.loads(r['payload'])} for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind LIKE 'crane.%'",(u['id'],))]
                                same=[r for r in prior if r['payload'].get('runId')==payload['runId']]
                                needed='crane.scene_released' if event['kind']=='crane.question' else 'crane.question'
                                if not any(r['kind']==needed for r in same):raise ValueError('크레인 사건과 질문 먼저 확인')
                                if event['kind']=='crane.observed':payload['correct']=payload['correct'] and {'on','off'}<={r['payload']['answer'] for r in same if r['kind']=='crane.switched'}
                                if event['kind']=='crane.strength':payload['correct']=payload['correct'] and {'1','2'}<={r['payload']['answer'] for r in same if r['kind']=='crane.counted'}
                                if event['kind']=='crane.reversed':payload['correct']=payload['correct'] and {'forward','reverse'}<={r['payload'].get('battery') for r in same if r['kind']=='crane.poles' and r['payload'].get('correct') is True}
                                if event['kind']=='crane.completed' and not any(r['kind']=='crane.delivered' for r in same):raise ValueError('크레인 운반을 먼저 마쳐 주세요.')
                            if event['kind']=='magnetIntro.suspected':
                                prior=[json.loads(r['payload']) for r in c.execute("SELECT payload FROM events WHERE owner=? AND kind='magnetIntro.inspected'",(u['id'],))]
                                if {p.get('answer') for p in prior if p.get('runId')==payload['runId']}!={'battery','contact','ends'}:raise ValueError('세 부분 조사 필요')
                            if event['kind']=='magnetMeaning.submitted':
                                observed=[json.loads(r['payload']) for r in c.execute("SELECT payload FROM events WHERE owner=? AND kind='magnet.observed'",(u['id'],))]
                                payload['correct']=payload['correct'] and any(p.get('runId')==payload['runId'] and p.get('correct') is True for p in observed)
                            if event['kind'] in {'magnetRepair.repaired','magnetRepair.tested'}:
                                prior=[{**dict(r),'payload':json.loads(r['payload'])} for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind LIKE 'magnetRepair.%' ORDER BY received",(u['id'],))]
                                same=[r for r in prior if r['payload'].get('runId')==payload['runId']]
                                if event['kind']=='magnetRepair.repaired' and {r['payload']['answer'] for r in same if r['kind']=='magnetRepair.inspected'}!={'battery','contact','ends'}:raise ValueError('세 부분 점검 필요')
                                attempts=[r for r in same if r['kind'] in ['magnetRepair.repaired','magnetRepair.tested']]
                                if event['kind']=='magnetRepair.repaired' and attempts and attempts[-1]['kind']=='magnetRepair.repaired':raise ValueError('수정 후 재확인 필요')
                                if event['kind']=='magnetRepair.tested':payload['correct']=any(r['kind']=='magnetRepair.repaired' and r['payload'].get('correct') is True for r in same)
                            if event['kind'] in {'magnet.connected','magnet.switched','magnet.observed'}:
                                rows=[{**dict(r),'payload':json.loads(r['payload'])} for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind LIKE 'magnet.%' ORDER BY received",(u['id'],))]
                                same=[r for r in rows if r['payload'].get('runId')==payload.get('runId')]
                                if not any(r['kind']=='magnet.prepared' and r['payload'].get('correct') is True for r in same):raise ValueError('전자석 안전 준비 필요')
                                if event['kind']=='magnet.switched':
                                    connections=[r for r in same if r['kind'] in ['magnet.assembled','magnet.connected']]
                                    if not connections or connections[-1]['kind']!='magnet.connected' or connections[-1]['payload'].get('correct') is not True:raise ValueError('전자석 회로 연결 필요')
                                if event['kind']=='magnet.observed':
                                    switches={r['payload'].get('answer') for r in same if r['kind']=='magnet.switched'}
                                    payload['correct']=payload['correct'] and {'on','off'}<=switches
                            if event['kind']=='magnet.completed' and g06_progress(c,u['id'],payload['runId'])['missing']:raise ValueError('공방의 탐구 기록이 아직 부족합니다')
                            if event['kind']=='workshop.completed' and g05_progress(c,u['id'],payload['runId'])['missing']:raise ValueError('정비소의 탐구 근거가 아직 부족합니다')
                            if event['kind']=='application.submitted':
                                prior=[dict(r) for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind IN ('application.trial','motor.observed','buzzer.observed')",(u['id'],))]
                                same=[{**r,'payload':json.loads(r['payload'])} for r in prior if json.loads(r['payload']).get('runId')==payload.get('runId')]
                                tried=any(r['kind']=='application.trial' and r['payload'].get('caseId')==payload['caseId'] and r['payload'].get('answer')==payload['answer'] for r in same)
                                observed=any(r['kind']==('motor.observed' if payload['caseId']=='car' else 'buzzer.observed') and r['payload'].get('correct') is True for r in same)
                                payload['correct']=payload['correct'] and tried and observed
                            if event['kind']=='deduction.submitted':
                                inspected=[json.loads(r['payload']) for r in c.execute("SELECT payload FROM events WHERE owner=? AND kind='deduction.inspected'",(u['id'],))]
                                seen={p['answer'] for p in inspected if p.get('runId')==payload.get('runId')}
                                payload['correct']=payload['correct'] and set(payload['inspected'])<=seen
                            if event['kind'] in {'buzzer.switched','buzzer.observed'}:
                                prior=[dict(r) for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind IN ('buzzer.prepared','buzzer.switched')",(u['id'],))]
                                same=[{**r,'payload':json.loads(r['payload'])} for r in prior if json.loads(r['payload']).get('runId')==payload.get('runId')]
                                if not any(r['kind']=='buzzer.prepared' and r['payload'].get('correct') is True for r in same):raise ValueError('버저 준비 근거 필요')
                                if event['kind']=='buzzer.observed' and not any(r['kind']=='buzzer.switched' and r['payload'].get('answer')=='on' for r in same):raise ValueError('버저 관찰 실행 필요')
                            if event['kind'] in {'motor.switched','motor.observed'}:
                                prior=[dict(r) for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind IN ('motor.prepared','motor.switched')",(u['id'],))]
                                same=[{**r,'payload':json.loads(r['payload'])} for r in prior if json.loads(r['payload']).get('runId')==payload.get('runId')]
                                if not any(r['kind']=='motor.prepared' and r['payload'].get('correct') is True for r in same):raise ValueError('전동기 준비 근거 필요')
                                if event['kind']=='motor.observed' and not any(r['kind']=='motor.switched' and r['payload'].get('answer')=='on' for r in same):raise ValueError('전동기 관찰 실행 필요')
                            if event['kind']=='quest.received':
                                prior=[dict(r) for r in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind IN ('question.submitted','game.completed')",(u['id'],))]
                                prior=[{**r,'payload':json.loads(r['payload'])} for r in prior]
                                same=[r for r in prior if r['payload'].get('runId')==payload.get('runId')]
                                if not any(r['kind']=='game.completed' for r in same) or not any(r['kind']=='question.submitted' and r['payload'].get('answer')==payload['answer'] for r in same):raise ValueError('완료한 의뢰의 질문이 아닙니다')
                            if event['kind'] in RESOURCE_EVENTS:
                                rid=payload['resourceId']
                                resource=next((r for r in json.loads((ROOT/'public/resources.json').read_text(encoding='utf-8')) if r['id']==rid),None)
                                if resource is None:
                                    row=c.execute('SELECT payload FROM resources WHERE id=? AND class_id=?',(rid,u['class_id'])).fetchone()
                                    if row:resource=json.loads(row['payload'])
                                if resource is None:raise ValueError('학급 자료가 아닙니다')
                                if event['kind']=='resource.video_requested' and resource['kind']!='video':raise ValueError('영상 자료가 아닙니다')
                                if event['kind']=='resource.external_opened' and resource['kind']=='reading':raise ValueError('외부 자료가 아닙니다')
                                payload.update(resourceTitle=resource['title'],resourceKind=resource['kind'],relatedGameIds=resource['gameIds'])
                            if event['kind']=='writeup.submitted':
                                # 근거로 고른 관찰이 이 학생의 같은 회차 탐구 기록에 있는지 표시한다(없어도 글은 받는다)
                                trials=[json.loads(r['payload']) for r in c.execute("SELECT payload FROM events WHERE owner=? AND kind='discovery.trial'",(u['id'],))]
                                seen=[q.get('roles') for q in trials if q.get('runId')==payload.get('runId') and q.get('gameId')==payload['gameId']]
                                for card in payload['evidence']:card['recorded']=card['roles'] in seen
                            old=c.execute('SELECT owner FROM events WHERE id=?',(event['id'],)).fetchone()
                            if old and old['owner']!=u['id']:raise ValueError('다른 학생의 기록 ID입니다.')
                            # Server checks completion evidence instead of trusting a client score.
                            if event['kind']=='game.completed':
                                prior=c.execute('SELECT task,kind,payload FROM events WHERE owner=?',(u['id'],)).fetchall()
                                required_kind={'conditions':'conditions.committed','connection':'connection.committed','observe':'result.recorded','explain':'explanation.submitted','transfer':'followup.submitted'}
                                ok={x['task'] for x in prior if x['kind']==required_kind.get(x['task']) and json.loads(x['payload']).get('correct') is True and json.loads(x['payload']).get('runId')==payload.get('runId')}
                                if not set(ANSWERS)<=ok:raise ValueError('필수 학습 근거가 부족합니다.')
                            if event['kind']=='fault.repaired':
                                evidence=[json.loads(x['payload']) for x in c.execute("SELECT payload FROM events WHERE owner=? AND kind='fault.inspected'",(u['id'],))]
                                inspected={p.get('answer') for p in evidence if p.get('runId')==payload.get('runId') and p.get('caseId')==payload.get('caseId')}
                                payload['correct']=payload['correct'] and inspected=={'wire','battery','bulb'}
                            if event['kind']=='game.completed' and payload.get('gameVersion') in {'g04-slice-3','g04-slice-4','g04-slice-5','g04-slice-6','g04-slice-7','g04-slice-8'}:
                                evidence=[json.loads(x['payload']) for x in c.execute("SELECT payload FROM events WHERE owner=? AND kind='fault.repaired'",(u['id'],))]
                                repaired={p.get('caseId') for p in evidence if p.get('runId')==payload.get('runId') and p.get('correct') is True}
                                if repaired!={'contact','battery','filament'}:raise ValueError('고장 점검 근거 부족')
                                questions=[json.loads(x['payload']) for x in c.execute("SELECT payload FROM events WHERE owner=? AND kind='question.submitted'",(u['id'],))]
                                if not any(p.get('runId')==payload.get('runId') and p.get('answer','').strip() for p in questions):raise ValueError('새 질문 필요')
                            if event['kind']=='game.completed' and payload.get('gameVersion') in {'g04-slice-4','g04-slice-5','g04-slice-6','g04-slice-7','g04-slice-8'}:
                                evidence=[dict(x) for x in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind IN ('comparison.submitted','proposal.submitted')",(u['id'],))]
                                valid={x['kind'] for x in evidence if json.loads(x['payload']).get('runId')==payload.get('runId') and json.loads(x['payload']).get('correct') is True}
                                if valid!={'comparison.submitted','proposal.submitted'}:raise ValueError('비교와 적용 근거 부족')
                            if event['kind']=='game.completed' and payload.get('gameVersion') in {'g04-slice-5','g04-slice-6','g04-slice-7','g04-slice-8'}:
                                evidence=[dict(x) for x in c.execute("SELECT kind,payload FROM events WHERE owner=? AND kind IN ('controls.committed','vocabulary.submitted','prediction.submitted')",(u['id'],))]
                                valid={x['kind'] for x in evidence if json.loads(x['payload']).get('runId')==payload.get('runId') and (json.loads(x['payload']).get('correct') is True or (x['kind']=='prediction.submitted' and json.loads(x['payload']).get('reason','').strip()))}
                                if valid!={'controls.committed','vocabulary.submitted','prediction.submitted'}:raise ValueError('준비와 예상 근거 부족')
                            if event['kind']=='game.completed' and payload.get('gameVersion') in {'g04-slice-6','g04-slice-7','g04-slice-8'}:
                                evidence=[json.loads(x['payload']) for x in c.execute("SELECT payload FROM events WHERE owner=? AND kind='transfer.position_submitted'",(u['id'],))]
                                if not any(p.get('runId')==payload.get('runId') and p.get('correct') is True for p in evidence):raise ValueError('새 배치 비교 근거 부족')
                            if event['kind']=='game.completed' and payload.get('gameVersion') in {'g04-slice-7','g04-slice-8'}:
                                evidence=[json.loads(x['payload']) for x in c.execute("SELECT payload FROM events WHERE owner=? AND kind='observation.table_submitted'",(u['id'],))]
                                if not any(p.get('runId')==payload.get('runId') and p.get('correct') is True for p in evidence):raise ValueError('관찰표 근거 부족')
                            if event['kind']=='game.completed' and payload.get('gameVersion')=='g04-slice-8':
                                evidence=[json.loads(x['payload']) for x in c.execute("SELECT payload FROM events WHERE owner=? AND kind='entry.submitted'",(u['id'],))]
                                if not any(p.get('runId')==payload.get('runId') for p in evidence):raise ValueError('도입 기록 필요')
                            c.execute('INSERT INTO events VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',(event['id'],u['id'],'mission.unverified' if payload.get('evaluation')=='version_unavailable' else event['kind'],event['task'],event['occurred'],time.time(),json.dumps(payload,ensure_ascii=False)))
                            accepted.append(event['id'])
                        except (ValueError,TypeError,KeyError,AttributeError) as err: # 형식이 틀린 기록 하나 때문에 묶음의 다른 기록까지 버리지 않는다
                            if not isinstance(err,ValueError):err=ValueError('기록 형식이 올바르지 않습니다.')
                            errors.append(err);rejected.append({'id':event.get('id') if isinstance(event,dict) else None,'error':str(err) if isinstance(err,Invalid) else '저장 조건이 맞지 않는 기록입니다.'})
                if errors and not accepted:raise errors[0]
                return self.send_json(200,{'accepted':accepted,'rejected':rejected})
            if path=='/api/state':
                state=data.get('state');revision=data.get('revision')
                if not isinstance(state,dict) or len(json.dumps(state))>160000 or type(revision)is not int:raise ValueError('저장 형식 오류')
                if set(state)-{'missions','story','profile','adventure','crane','magnetClosure','magnetIntro','magnetMaterials','magnetMeaning','magnetRepair','magnet','workshopClosure','g05Intro','application','deduction','buzzer','motor','entryCheck','observationTable','transferCheck','runVersion','step','prediction','conditions','connection','observed','answer','hints','complete','reason','future','runId','sequence','responses','assembly','journey','travel','diagnostic','newQuestion','inquiry','preparation'}:raise ValueError('허용되지 않은 상태입니다.')
                if 'runVersion' in state and state['runVersion'] not in ['g04-slice-4','g04-slice-5','g04-slice-6','g04-slice-7','g04-slice-8']:raise ValueError('버전 오류')
                if 'adventure' in state:
                    a=state['adventure']
                    if not isinstance(a,dict) or not {'welcomed','tracked'}<=set(a) or set(a)-{'welcomed','tracked','selectedRegion','regionTracks','storyItems','wear','seenWear','regionsDone','ended','field','scenes','duels','pace','paceAt','quickIntro','storyMap'} or type(a['welcomed'])is not bool or str(a['tracked']) not in state_games():raise ValueError('모험 기록 오류')
                    region_prefix={'farm':'R1-','fire':'R2-','power':'R3-','future':'R4-','life':'R5-'}
                    if 'selectedRegion' in a and (not isinstance(a['selectedRegion'],str) or a['selectedRegion'] not in region_prefix):raise ValueError('탐험할 지역을 확인해 주세요.')
                    tracks=a.get('regionTracks',{})
                    if not isinstance(tracks,dict) or set(tracks)-set(region_prefix) or any(not isinstance(gid,str) or gid not in state_games() or not gid.startswith(region_prefix[region]) for region,gid in tracks.items()):raise ValueError('지역별 의뢰 기록을 확인해 주세요.')
                    items=a.get('storyItems',[])
                    wear,seen,regions=a.get('wear',{}),a.get('seenWear',[]),a.get('regionsDone',[])
                    if not isinstance(wear,dict) or set(wear)-{'head','back','pet'} or any(v not in WEAR_IDS for v in wear.values()):raise ValueError('소품 기록 오류')
                    if not isinstance(seen,list) or any(v not in WEAR_IDS for v in seen) or len(set(seen))!=len(seen):raise ValueError('소품 기록 오류')
                    if not isinstance(regions,list) or any(v not in region_codes() for v in regions) or len(set(regions))!=len(regions):raise ValueError('지구 복구 기록 오류')
                    duels=a.get('duels',[])
                    if not isinstance(duels,list) or any(v not in region_codes() for v in duels) or len(set(duels))!=len(duels):raise ValueError('척척 오류 대결 기록 오류')
                    if 'ended' in a and (type(a['ended']) not in (int,float) or a['ended']<0):raise ValueError('엔딩 기록 오류')
                    # 고른 길(이야기 모두 보기, 빠르게 문제만)과 빠른 길에서 이야기 길로 돌아갈 지도
                    if 'pace' in a and a['pace'] not in PACES:raise ValueError('고른 길을 확인해 주세요.')
                    if 'paceAt' in a and (type(a['paceAt']) not in (int,float) or a['paceAt']<0):raise ValueError('고른 길을 확인해 주세요.')
                    if 'quickIntro' in a and type(a['quickIntro']) is not bool:raise ValueError('고른 길을 확인해 주세요.')
                    if 'storyMap' in a and a['storyMap'] not in {'hub',*region_keys(),'power-lab',*zone_ids()}:raise ValueError('고른 길을 확인해 주세요.')
                    # 구역 현장 활동(public/field.json): {구역: {on, got: [물건 id], set: {장치 id: 상태 번호}, done}}
                    field=a.get('field',{})
                    if not isinstance(field,dict) or len(field)>len(zone_ids()) or any(str(k) not in zone_ids() or not isinstance(v,dict) or set(v)-{'on','got','set','done','rec'} for k,v in field.items()):raise ValueError('현장 활동 기록 오류')
                    for v in field.values():
                        got,sets=v.get('got',[]),v.get('set',{})
                        if any(k in v and type(v[k]) is not bool for k in ('on','done')) or not isinstance(got,list) or len(got)>12 or len(set(map(str,got)))!=len(got) or any(not isinstance(x,str) or not re.fullmatch(r'[a-z0-9-]{1,20}',x) for x in got):raise ValueError('현장 활동 기록 오류')
                        if not isinstance(sets,dict) or len(sets)>12 or any(not re.fullmatch(r'[a-z0-9-]{1,20}',str(k)) or type(x) is not int or not 0<=x<=9 for k,x in sets.items()):raise ValueError('현장 활동 기록 오류')
                        rec=v.get('rec',{})
                        if not isinstance(rec,dict) or len(rec)>9 or any(not re.fullmatch(r'[0-8]',str(k)) or not isinstance(x,str) or len(x)>12 for k,x in rec.items()):raise ValueError('현장 활동 기록 오류')
                    scenes=a.get('scenes',[])
                    if not isinstance(scenes,list) or len(scenes)>3*len(region_codes()) or len(set(map(str,scenes)))!=len(scenes) or any(not isinstance(x,str) or not re.fullmatch(r'('+region_code_re()+r')-(intro|middle|outro)',x) for x in scenes):raise ValueError('지역 이야기 기록 오류')
                    if not isinstance(items,list) or len(items)>20 or any(i not in STORY_ITEMS for i in items) or len(set(items))!=len(items):raise ValueError('이야기 물건 오류')
                if 'story' in state:
                    q=state['story']
                    if not isinstance(q,dict) or set(q)-{'step','met','map','chapters','hint','repaired','used','badges','side','level'}:raise ValueError('이야기 저장 오류')
                    if 'step' in q and q['step'] not in ['arrival','meet','done']:raise ValueError('이야기 단계 오류')
                    for key,names in [('met',{'comji','dalsae','elm'}),('chapters',{'g04','g05','g06','g07','w04','w05','w06','w07','repair'}),('side',{'grandma','chorong','narae'})]:
                        if key in q and (not isinstance(q[key],dict) or set(q[key])-names or any(type(v)is not bool for v in q[key].values())):raise ValueError('이야기 진행 오류')
                    if any(k in q and type(q[k])is not bool for k in ['map','repaired']):raise ValueError('이야기 상태 오류')
                    if 'used' in q and (not isinstance(q['used'],list) or len(q['used'])>20 or any(i not in STORY_ITEMS for i in q['used']) or len(set(q['used']))!=len(q['used'])):raise ValueError('사용한 물건 오류')
                    if 'hint' in q and (not isinstance(q['hint'],str) or len(q['hint'])>120):raise ValueError('이야기 안내 오류')
                    if 'badges' in q and (not isinstance(q['badges'],list) or len(q['badges'])>40 or any(b not in STORY_BADGES for b in q['badges']) or len(set(q['badges']))!=len(q['badges'])):raise ValueError('징표 저장 오류')
                    if 'level' in q and (type(q['level']) is not int or not 1<=q['level']<=99):raise ValueError('레벨 저장 오류')
                if 'profile' in state:
                    q=state['profile']
                    if not isinstance(q,dict) or set(q)-{'avatar'} or ('avatar' in q and not isinstance(q['avatar'],dict)):raise ValueError('프로필 저장 오류')
                    if 'avatar' in q:q['avatar']=sanitize_avatar(q['avatar'])
                if 'missions' in state:
                    q=state['missions']
                    if not isinstance(q,dict) or len(q)>len(state_games()) or any(str(k) not in state_games() or not isinstance(v,dict) for k,v in q.items()) or len(json.dumps(q,ensure_ascii=False))>120000:raise ValueError('미션 저장 오류')
                if 'crane' in state:
                    q=state['crane']
                    if not isinstance(q,dict) or set(q)-{'released','question','asked','closed','opened','answer','hint','step','recall','battery','counts','strength','compass','poles','reversed','table','claim','delivered','cargo','evidence','reason','picks','done','tableOk','evidenceOk','ruleRevision','answerHint'} or any(k in q and type(q[k]) is not bool for k in ['released','asked','closed','opened','done','tableOk','evidenceOk']) or not isinstance(q.get('question',''),str) or len(q.get('question',''))>300 or q.get('answer','') not in ['','decrease','always','zero'] or type(q.get('hint',0)) is not int or not 0<=q.get('hint',0)<=3 or len(json.dumps(q,ensure_ascii=False))>4000:raise ValueError('크레인 저장 오류')
                if 'magnetClosure' in state:
                    q=state['magnetClosure']
                    if not isinstance(q,dict) or set(q)-{'reason','question','ruleRevision','answerHint'} or not {'reason','question'}<=set(q) or any(not isinstance(q[k],str) or len(q[k])>300 for k in ['reason','question']):raise ValueError('제작 카드 저장 오류')
                if 'magnetIntro' in state:
                    q=state['magnetIntro']
                    if not isinstance(q,dict) or set(q)!={'comparison','experience','recalled','inspected','candidate','hint'} or q['comparison'] not in ['','same','different','unknown'] or not isinstance(q['experience'],str) or len(q['experience'])>300 or type(q['recalled'])is not bool or not isinstance(q['inspected'],list) or any(v not in ['battery','contact','ends'] for v in q['inspected']) or len(q['inspected'])!=len(set(q['inspected'])) or q['candidate'] not in ['','battery','contact','ends','unknown'] or type(q['hint'])is not int or not 0<=q['hint']<=3:raise ValueError('공방 도입 저장 오류')
                if 'magnetMaterials' in state:
                    q=state['magnetMaterials']
                    if not isinstance(q,dict) or set(q)!={'core','roles','hint'} or q['core'] not in ['','iron','brass','plastic'] or not isinstance(q['roles'],dict) or set(q['roles'])!={'bolt','wire','battery','switch'} or any(v not in ['','core','coil','source','control'] for v in q['roles'].values()) or type(q['hint'])is not int or not 0<=q['hint']<=3:raise ValueError('재료 저장 오류')
                if 'magnetMeaning' in state:
                    q=state['magnetMeaning']
                    if not isinstance(q,dict) or set(q)!={'name','reason','hint'} or q['name'] not in ['','electromagnet','always','conductor'] or q['reason'] not in ['','heat','strong','empty'] or type(q['hint'])is not int or not 0<=q['hint']<=3:raise ValueError('전자석 설명 저장 오류')
                if 'magnetRepair' in state:
                    r=state['magnetRepair']
                    if not isinstance(r,dict) or set(r)-{'inspected','fixed','tested','hint','pending'} or not {'inspected','fixed','tested','hint'}<=set(r) or not isinstance(r['inspected'],list) or any(k not in ['battery','contact','ends'] for k in r['inspected']) or len(r['inspected'])!=len(set(r['inspected'])) or any(type(r[k])is not bool for k in ['fixed','tested']) or type(r.get('pending',False))is not bool or type(r['hint'])is not int or not 0<=r['hint']<=3:raise ValueError('점검 저장 오류')
                if 'magnet' in state:
                    m=state['magnet']
                    if not isinstance(m,dict) or set(m)!={'checks','safe','tape','turns','tails','ends','connected','ran','opened','answer','hint'} or not isinstance(m['checks'],dict) or set(m['checks'])!={'gloves','ends','power'} or any(type(v)is not bool for v in m['checks'].values()) or any(type(m[k])is not bool for k in ['safe','tape','tails','connected','ran','opened']) or type(m['turns'])is not int or not 0<=m['turns']<=3 or m['ends'] not in ['covered','ends','all'] or m['answer'] not in ['','current','always'] or type(m['hint'])is not int or not 0<=m['hint']<=3:raise ValueError('전자석 저장 오류')
                if 'workshopClosure' in state:
                    w=state['workshopClosure']
                    if not isinstance(w,dict) or set(w)-{'reason','question','ruleRevision','answerHint'} or not {'reason','question'}<=set(w) or any(not isinstance(w[k],str) or len(w[k])>300 for k in ['reason','question']):raise ValueError('마무리 저장 오류')
                for draft_name in ['crane','magnetClosure','workshopClosure']:
                    draft=state.get(draft_name,{})
                    if 'ruleRevision' in draft and (not isinstance(draft['ruleRevision'],str) or (draft['ruleRevision'] and not re.fullmatch('[0-9a-f]{64}',draft['ruleRevision']))):raise ValueError('설명 확인 자료 저장 오류')
                    if 'answerHint' in draft and (type(draft['answerHint']) is not int or draft['answerHint'] not in {0,1}):raise ValueError('설명 도움 저장 오류')
                if 'g05Intro' in state:
                    q=state['g05Intro']
                    if not isinstance(q,dict) or set(q)!={'circuit','reason','reviewed','motor','buzzer','done'} or q['circuit'] not in ['','one','two'] or q['reason'] not in ['','controlled','position'] or any(q[k] not in ['','speed','volume','brightness'] for k in ['motor','buzzer']) or any(type(q[k])is not bool for k in ['reviewed','done']):raise ValueError('새 조사 저장 오류')
                if 'application' in state:
                    a=state['application']
                    if not isinstance(a,dict) or set(a)!={'caseId','choice','evidence','tested','solved','hint'} or a['caseId'] not in ['car','quiet'] or any(a[k] not in ['','one','two'] for k in ['choice','tested']) or a['evidence'] not in ['','motor','buzzer','more'] or not isinstance(a['solved'],list) or len(a['solved'])>2 or any(v not in ['car','quiet'] for v in a['solved']) or type(a['hint'])is not int or not 0<=a['hint']<=3:raise ValueError('의뢰 저장 오류')
                if 'deduction' in state:
                    d=state['deduction']
                    if not isinstance(d,dict) or set(d)!={'seen','answer','revealed','stage','uncertain','request','hint'} or not isinstance(d['seen'],list) or len(d['seen'])>3 or any(v not in ['light','motor','sound'] for v in d['seen']) or d['answer'] not in ['','one','two'] or type(d['revealed'])is not bool or d['stage'] not in ['known','unknown'] or d['uncertain'] not in ['','two','unknown'] or d['request'] not in ['','conditions','color'] or type(d['hint'])is not int or not 0<=d['hint']<=3:raise ValueError('추리 저장 오류')
                if 'buzzer' in state:
                    m=state['buzzer']
                    if not isinstance(m,dict) or set(m)!={'red','black','prepared','hasRun','answer','hint'} or m['red'] not in ['','plus','minus'] or m['black'] not in ['','plus','minus'] or m['answer'] not in ['','two','same'] or type(m['hint'])is not int or not 0<=m['hint']<=3 or any(type(m[k])is not bool for k in ['prepared','hasRun']):raise ValueError('버저 상태 오류')
                if 'motor' in state:
                    m=state['motor']
                    if not isinstance(m,dict) or set(m)!={'parts','safety','prepared','hasRun','answer','hint'} or m['parts'] not in ['','same','different'] or m['safety'] not in ['','away','touch'] or m['answer'] not in ['','two','same'] or type(m['hint'])is not int or not 0<=m['hint']<=3 or any(type(m[k])is not bool for k in ['prepared','hasRun']):raise ValueError('전동기 상태 오류')
                if 'entryCheck' in state:
                    t=state['entryCheck']
                    if not isinstance(t,dict) or set(t)!={'circuit','experience','submitted','done'} or t['circuit'] not in ['','closed','open'] or not isinstance(t['experience'],str) or len(t['experience'])>160 or any(type(t[k])is not bool for k in ['submitted','done']):raise ValueError('도입 저장 오류')
                if 'observationTable' in state:
                    t=state['observationTable']
                    if not isinstance(t,dict) or set(t)!={'one','two','saved'} or any(t[k] not in ['','dim','bright','equal'] for k in ['one','two']) or type(t['saved'])is not bool:raise ValueError('관찰표 저장 오류')
                if 'transferCheck' in state:
                    t=state['transferCheck']
                    if not isinstance(t,dict) or set(t)!={'answer','evidence','passed','done'} or t['answer'] not in ['','left','right','equal'] or t['evidence'] not in ['','count','side','shape'] or any(type(t[k])is not bool for k in ['passed','done']):raise ValueError('전이 저장 오류')
                if 'preparation' in state:
                    p=state['preparation']
                    if not isinstance(p,dict) or set(p)!={'bulbs','selected','roles','term','predictionReason'} or p['bulbs'] not in ['','same'] or p['selected'] not in ['','battery','bulb','background'] or p['term'] not in ['','series']:raise ValueError('준비 상태 오류')
                    if not isinstance(p['predictionReason'],str) or len(p['predictionReason'])>160 or not isinstance(p['roles'],dict) or set(p['roles'])-{'battery','bulb','background'} or any(v not in ['change','keep'] for v in p['roles'].values()):raise ValueError('준비 기록 오류')
                if 'inquiry' in state:
                    q=state['inquiry']
                    if not isinstance(q,dict) or set(q)!={'marked','question','compared','proposal','evidence','proposed'}:raise ValueError('비교 저장 오류')
                    if not isinstance(q['marked'],list) or len(q['marked'])>3 or any(v not in ['battery','bulb','background'] for v in q['marked']):raise ValueError('조건 저장 오류')
                    if not isinstance(q['question'],str) or len(q['question'])>160 or any(type(q[k])is not bool for k in ['compared','proposed']) or q['proposal'] not in ['','one','series'] or q['evidence'] not in ['','controlled','different','unlimited']:raise ValueError('제안 저장 오류')
                if 'newQuestion' in state and (not isinstance(state['newQuestion'],str) or len(state['newQuestion'])>160):raise ValueError('질문 저장 오류')
                if 'diagnostic' in state:
                    d=state['diagnostic']
                    if not isinstance(d,dict) or set(d)!={'case','inspected','fixed'} or type(d['case'])is not int or not 0<=d['case']<=3 or type(d['fixed'])is not bool or not isinstance(d['inspected'],list) or any(v not in ['wire','battery','bulb'] for v in d['inspected']):raise ValueError('점검 저장 오류')
                if 'travel' in state:
                    t=state['travel']
                    if not isinstance(t,dict) or set(t)!={'map','positions','visited','notes'}:raise ValueError('지도 저장 오류')
                    maps={'hub',*region_keys(),'power-lab','motor-workshop','buzzer-workshop','deduction-workshop','application-workshop','g05-intro','workshop-summary','magnet-workshop','crane-workshop',*zone_ids()}
                    if (t['map'] not in maps|{'quick'} and str(t['map']).removeprefix('mission:') not in state_games()) or any(not isinstance(t[k],dict) for k in ['positions','visited','notes']):raise ValueError('지도 저장 오류')
                    if any(not isinstance(v,str) or len(v)>160 for v in t['notes'].values()):raise ValueError('관찰 저장 오류')
                    games=state_games()
                    if set(t['notes'])-games or set(t['visited'])-games or set(t['positions'])-maps-{'hub@2'}:raise ValueError('장소 ID 오류')
                    if any(type(v)is not bool for v in t['visited'].values()):raise ValueError('방문 상태 오류')
                    for key,pos in t['positions'].items():
                        w,h=(1920,1280) if key=='hub@2' else (960,960) if key in region_keys() or key in zone_ids() else (960,640) # 지구와 구역은 아래쪽 주민 마을까지 960×960
                        if not isinstance(pos,dict) or set(pos)!={'x','y'} or any(type(pos[k])not in (int,float) for k in ['x','y']) or not 0<=pos['x']<=w or not 0<=pos['y']<=h:raise ValueError('지도 위치 오류')
                if 'journey' in state:
                    j=state['journey']
                    if not isinstance(j,dict) or set(j)!={'met','sign','library','x','y'}:raise ValueError('탐험 상태 오류')
                    if any(type(j[k])is not bool for k in ['met','sign','library']):raise ValueError('탐험 상태 오류')
                    if any(type(j[k])not in (int,float) for k in ['x','y']) or not 0<=j['x']<832 or not 0<=j['y']<512:raise ValueError('위치 오류')
                if 'assembly' in state:validate_assembly(state['assembly'])
                with conn() as c:
                    c.execute('BEGIN IMMEDIATE');row=c.execute('SELECT revision FROM checkpoints WHERE owner=?',(u['id'],)).fetchone();current=row['revision'] if row else 0
                    if current!=revision:return self.send_json(409,{'error':'다른 화면의 저장이 있습니다. 새로고침해 확인해 주세요.'})
                    c.execute('INSERT INTO checkpoints VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET revision=excluded.revision,state=excluded.state',(u['id'],current+1,json.dumps(state,ensure_ascii=False)))
                    # 반 공동 목표에 쓰려고 해결한 현장 활동을 따로 남긴다(새 모험을 시작해도 반 기록에는 남는다)
                    for z,v in ((state.get('adventure') or {}).get('field') or {}).items():
                        if isinstance(v,dict) and v.get('done') is True and not u.get('guest'):c.execute('INSERT INTO field_done VALUES(?,?,?,?) ON CONFLICT(owner,zone) DO NOTHING',(u['id'],z,u['class_id'],time.time()))
                return self.send_json(200,{'revision':current+1})
            return self.send_json(404,{'error':'없는 요청입니다.'})
        except learning_reset.ResetRequired as e:return self.send_json(409,{'error':str(e),'code':'learning_reset','learningEpoch':e.epoch})
        except PermissionError:return self.send_json(403,{'error':'이 학급을 관리할 권한이 없습니다.'})
        except NotFound:return self.send_json(404,{'error':'찾는 학생이나 학급이 없습니다.'})
        except Invalid as e:return self.send_json(400,{'error':str(e)})
        except (ValueError,TypeError,KeyError,json.JSONDecodeError):return self.send_json(400,{'error':'기록 형식 또는 필수 근거를 확인해 주세요.'})
        except Exception:
            import traceback;traceback.print_exc()
            return self.send_json(500,{'error':'저장 중 문제가 생겼습니다. 기기 기록을 유지하고 다시 시도해 주세요.'})

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--demo',action='store_true');ap.add_argument('--port',type=int,default=4186);ap.add_argument('--db',type=Path);ap.add_argument('--lan',action='store_true',help='같은 학교 네트워크(사설 IP)의 다른 기기에서도 접속을 받는다.');a=ap.parse_args()
    if not a.demo:ap.error('현재는 가상 학생 전용입니다. --demo로 실행하세요.')
    PORT=a.port;LAN=a.lan
    if a.db:DB=a.db.resolve()
    initialize();print(f'Demo ready http://127.0.0.1:{PORT}',flush=True)
    if LAN:
        LAN_URLS=[f'http://{ip}:{PORT}/' for ip in lan_addresses()]
        try:
            print('학급 접속 모드: 같은 네트워크의 학생 기기에서 아래 주소로 접속합니다.',flush=True)
            for url in LAN_URLS or ['(사설 IP 주소를 찾지 못했습니다. 네트워크 연결을 확인해 주세요.)']:print('  '+url,flush=True)
            print(f'선생님 관리 화면: http://127.0.0.1:{PORT}/admin',flush=True)
        except UnicodeEncodeError:print('LAN: '+' '.join(LAN_URLS),flush=True)
    ThreadingHTTPServer(('0.0.0.0' if LAN else '127.0.0.1',PORT),Handler).serve_forever()
