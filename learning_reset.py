"""Explicit, one-off learning reset; account identities and teaching material remain."""
import json
import re
import time

KEY = 'learning_epoch'
INITIAL = b'{"epoch":"0"}'
STUDENTS = "SELECT id FROM accounts WHERE role='student'"
OWNED = ['checkpoints','events','activity_cursors','activity_intervals','activity_errors',
         'health_actions','health_turns','health_runs','field_done','presence','chat_messages']

class ResetRequired(Exception):
    def __init__(self, epoch):
        self.epoch = epoch
        super().__init__('학습 기록이 초기화되었어요. 새로 접속해 시작 지역을 골라 주세요.')

def status(c, lock=''):
    row = c.execute("SELECT value FROM meta WHERE key='learning_epoch'" + lock).fetchone()
    if not row:return {'epoch':'0'}
    raw = row['value']
    return json.loads(bytes(raw).decode() if isinstance(raw,(bytes,bytearray,memoryview)) else raw)

def require_epoch(c, expected, pg=False):
    # PostgreSQL holds this shared lock until the writing transaction commits.
    # The reset takes the exclusive row lock before deleting any learning data.
    current = status(c, ' FOR SHARE' if pg else '')
    if str(expected or '0') != current['epoch']:raise ResetRequired(current['epoch'])

def counts(c):
    result = {'students':c.execute('SELECT COUNT(*) FROM accounts WHERE role=?',('student',)).fetchone()[0]}
    for table in OWNED + ['board_posts','board_replies','reports']:
        result[table] = c.execute(f'SELECT COUNT(*) FROM {table} WHERE owner IN ({STUDENTS})').fetchone()[0]
    for table in ['event_reviews','review_history']:
        result[table] = c.execute(f'SELECT COUNT(*) FROM {table} WHERE event_id IN (SELECT id FROM events WHERE owner IN ({STUDENTS}))').fetchone()[0]
    result['coop_state'] = c.execute("SELECT COUNT(*) FROM coop_state WHERE class_id IN (SELECT class_id FROM accounts WHERE role='student')").fetchone()[0]
    return result

def reset(c, operation, pg=False):
    if not isinstance(operation,str) or not re.fullmatch(r'[A-Za-z0-9_-]{8,80}',operation):raise ValueError('초기화 작업 번호 필요')
    if not pg:c.execute('BEGIN IMMEDIATE')
    previous = status(c, ' FOR UPDATE' if pg else '')
    if previous['epoch'] == operation:return {**previous,'alreadyApplied':True}
    before = counts(c)
    for table in ['review_history','event_reviews']:
        c.execute(f'DELETE FROM {table} WHERE event_id IN (SELECT id FROM events WHERE owner IN ({STUDENTS}))')
    # Remove replies to removed student work, including teacher feedback on it.
    c.execute(f'DELETE FROM board_replies WHERE owner IN ({STUDENTS}) OR post_id IN (SELECT id FROM board_posts WHERE owner IN ({STUDENTS}))')
    c.execute(f'DELETE FROM board_posts WHERE owner IN ({STUDENTS})')
    for table in OWNED + ['reports']:
        c.execute(f'DELETE FROM {table} WHERE owner IN ({STUDENTS})')
    c.execute("DELETE FROM coop_state WHERE class_id IN (SELECT class_id FROM accounts WHERE role='student')")
    result = {'epoch':operation,'resetAt':time.time(),'deleted':before}
    c.execute("INSERT INTO meta VALUES('learning_epoch',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(json.dumps(result).encode(),))
    return result
