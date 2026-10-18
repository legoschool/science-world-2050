import {radar} from './competency.mjs';
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  const append = value => {
    if (Array.isArray(value)) value.forEach(append);
    else if (value != null && value !== false) node.append(value instanceof Node ? value : String(value));
  };
  children.forEach(append);
  return node;
};
const button = (label, fn, attrs = {}) => el('button', {type:'button', onclick:fn, ...attrs}, label);
const option = (value, label) => el('option', {value}, label);
const number = n => Number.isFinite(Number(n)) && n != null ? Number(n) : 0;
const count = n => number(n).toLocaleString('ko-KR');
const ratio = row => number(row.graded) ? number(row.correct) / number(row.graded) * 100 : null;
const percent = row => ratio(row) == null ? '판정 기록 없음' : `${ratio(row).toFixed(1)}%`;
const duration = value => {
  if (value == null || !Number.isFinite(Number(value))) return '미수집';
  const sec = Math.max(0, Math.round(Number(value))), hours = Math.floor(sec / 3600), mins = Math.floor(sec % 3600 / 60);
  return hours ? `${hours}시간 ${mins}분` : mins ? `${mins}분 ${sec % 60}초` : `${sec}초`;
};
const when = value => {
  if (!value) return '기록 없음';
  const date = new Date(typeof value === 'number' ? value * (value < 1e12 ? 1000 : 1) : value);
  return Number.isNaN(date.valueOf()) ? '시각 확인 필요' : date.toLocaleString('ko-KR');
};
const className = (data, id) => data.filters?.classes?.find(c => c.id === id)?.name || '반 정보 없음';
const studentName = row => `${row.number ? row.number + '번 ' : ''}${row.nickname || '학생'}`;
const activityStatus = current => current?.statusLabel || ({active:'활동 신호 확인',idle:'최근 접속 확인',offline:'최근 접속 미확인',unknown:'확인 기록 없음'}[current?.status] || '확인 기록 없음');
const errorLabel = row => row.kind === 'learning' ? '학습 오답' : ({network:'연결 문제',save:'저장 문제',render:'화면 문제',runtime:'화면 문제',asset:'자료 불러오기 문제',save_failed:'저장 문제',activity_failed:'활동 처리 문제',load_failed:'자료 불러오기 문제',script_error:'화면 문제',content_version:'활동 자료 변경',student_report:'학생 오류 제보'}[row.code] || '기술 오류');
const errorMessage = row => {
  const message = String(row.message || '');
  if (row.kind === 'technical' && /Traceback|Exception|OperationalError|sqlite|postgres|SELECT\s|INSERT\s|UPDATE\s|DELETE\s|\/api\/|[A-Z]:\\|\n\s+at\s/i.test(message)) return '활동 중 기술 문제가 기록되었습니다. 문제가 생긴 단계와 시각을 확인해 주세요.';
  return message || (row.kind === 'learning' ? '제출한 답을 다시 확인할 필요가 있습니다.' : '활동 중 기술 문제가 기록되었습니다.');
};
function stylesheet() {
  if (!document.getElementById('learning-dashboard-css')) document.head.append(el('link', {
    id:'learning-dashboard-css', rel:'stylesheet', href:new URL('./dashboard.css', import.meta.url).href,
  }));
}

/** Teacher-only endpoint is authoritative for every class and student scope. */
export async function openLearningDashboard({api, classId = '', gameId = '', taskId = '', student = '', runId = '', onReview} = {}) {
  stylesheet();
  const dialog = el('dialog', {class:'learning-dashboard', 'aria-label':'학습 대시보드'});
  const previousFocus = document.activeElement;
  const status = el('p', {class:'ld-status', role:'status', 'aria-live':'polite'}, '학습 기록을 불러오고 있습니다.');
  const filters = el('form', {class:'ld-filters', 'aria-label':'학습 기록 조회 조건'});
  const content = el('div', {class:'ld-content'});
  const selects = {}, dates = {};
  const makeSelect = (key, label, defaultLabel) => {
    const select = el('select', {'aria-label':label}, option('', defaultLabel));
    selects[key] = select;
    filters.append(el('label', {}, el('span', {}, label), select));
    return select;
  };
  makeSelect('classId', '학반', '볼 수 있는 모든 반').value = classId;
  makeSelect('student', '학생', '모든 학생').value = student;
  makeSelect('gameId', '학습 활동', '모든 활동').value = gameId;
  makeSelect('taskId', '학습 단계', '모든 단계').value = taskId;
  selects.taskId.disabled = true;
  for (const [key, label] of [['from','시작일'], ['to','종료일']]) {
    dates[key] = el('input', {type:'date', 'aria-label':label});
    filters.append(el('label', {}, el('span', {}, label), dates[key]));
  }
  const runSelect = el('select', {'aria-label':'연습 회차'}, option('', '모든 회차'));
  const extraFilter = el('details', {class:'ld-extra-filter'}, el('summary', {}, '회차로 좁히기'), el('label', {}, el('span', {}, '연습 회차'), runSelect));
  filters.append(extraFilter);
  const apply = el('button', {type:'submit', class:'ld-primary'}, '조회하기');
  const reset = button('조건 지우기', () => {
    Object.values(selects).forEach(s => {s.value = '';});
    Object.values(dates).forEach(input => {input.value = '';});
    runSelect.value = ''; updateStudentOptions(); updateTaskOptions(); load();
  });
  filters.append(el('div', {class:'ld-filter-actions'}, apply, reset));
  const autoRefresh = el('input', {type:'checkbox', 'aria-label':'30초 자동 갱신'});
  autoRefresh.checked = true;
  const refreshButton = button('지금 새로 확인', () => load({automatic:true}));
  const refreshBar = el('div', {class:'ld-refresh'}, status, el('div', {class:'ld-refresh-actions'},
    el('label', {}, autoRefresh, el('span', {}, '30초 자동 갱신')), refreshButton));
  const close = button('닫기', () => dialog.close(), {'aria-label':'학습 대시보드 닫기'});
  dialog.append(el('header', {class:'ld-heading'}, el('div', {}, el('h2', {}, '학습 대시보드'), el('p', {}, '학생의 시도와 참여 기록을 함께 살펴보세요.')), close), filters, refreshBar, content);
  document.body.append(dialog); dialog.showModal();
  let data = null, request = 0, tab = 'students', sortBy = 'name', scope = {classId, student, gameId, taskId, runId};
  let lastSuccess = null, refreshTimer = null, pending = false, studentView = 'current', compareByClass = false, errorKind = 'technical', pageIndex = 0;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    if (dialog.isConnected && dialog.open && autoRefresh.checked && !document.hidden && !pending)
      refreshTimer = setTimeout(() => load({automatic:true}), 30000);
  }
  function onVisibility() {
    clearTimeout(refreshTimer);
    if (!document.hidden && dialog.open && autoRefresh.checked && !pending) load({automatic:true});
  }
  autoRefresh.addEventListener('change', scheduleRefresh);
  document.addEventListener('visibilitychange', onVisibility);
  dialog.addEventListener('close', () => {
    request++; clearTimeout(refreshTimer); document.removeEventListener('visibilitychange', onVisibility);
    dialog.remove(); if (previousFocus?.isConnected) previousFocus.focus();
  }, {once:true});

  function updateStudentOptions() {
    if (!data) return;
    const current = selects.student.value;
    const students = (data.filters?.students || []).filter(s => !selects.classId.value || s.classId === selects.classId.value);
    selects.student.replaceChildren(option('', '모든 학생'), ...students.map(s => option(s.id, `${studentName(s)}${selects.classId.value ? '' : ' / ' + className(data,s.classId)}`)));
    if (students.some(s => s.id === current)) selects.student.value = current;
    updateRunOptions();
  }
  function updateRunOptions() {
    if (!data) return;
    const current = runSelect.value;
    const runs = (data.filters?.runs || []).filter(r => {
      const s = (data.filters?.students || []).find(s => s.id === r.studentId);
      return (!selects.student.value || r.studentId === selects.student.value) && (!selects.classId.value || (r.classId || s?.classId) === selects.classId.value);
    });
    runSelect.replaceChildren(option('', '모든 회차'), ...runs.map(r => option(r.id, r.label || [r.number ? `기간 내 ${r.number}번째` : '연습 기록', r.nickname || (data.filters?.students || []).find(s => s.id === r.studentId)?.nickname, r.started ? when(r.started) : ''].filter(Boolean).join(' / '))));
    if (runs.some(r => r.id === current)) runSelect.value = current;
  }
  function updateTaskOptions() {
    const current = selects.taskId.value;
    const tasks = (data?.filters?.tasks || []).filter(t => t.gameId === selects.gameId.value);
    selects.taskId.replaceChildren(option('', '모든 단계'), ...tasks.map(t => option(t.id, t.title)));
    selects.taskId.disabled = !selects.gameId.value || !tasks.length;
    if (tasks.some(t => t.id === current)) selects.taskId.value = current;
  }
  selects.classId.addEventListener('change', updateStudentOptions);
  selects.student.addEventListener('change', updateRunOptions);
  selects.gameId.addEventListener('change', () => {selects.taskId.value = ''; updateTaskOptions();});
  filters.addEventListener('submit', event => {event.preventDefault(); load();});

  function filterValues() {
    return {...Object.fromEntries(Object.entries(selects).map(([k,s]) => [k,s.value])),
      from:dates.from.value, to:dates.to.value, runId:runSelect.value};
  }
  function setFilters(values) {
    selects.classId.value = values.classId || ''; selects.gameId.value = values.gameId || '';
    updateStudentOptions(); selects.student.value = values.student || ''; updateRunOptions();
    runSelect.value = values.runId || ''; updateTaskOptions(); selects.taskId.value = values.taskId || '';
    dates.from.value = values.from || ''; dates.to.value = values.to || '';
  }
  async function load({initial = false, automatic = false, selection = null, nextTab = null} = {}) {
    if (!dialog.isConnected || !dialog.open || (automatic && (pending || document.hidden))) return;
    if (!automatic && dates.from.value && dates.to.value && dates.from.value > dates.to.value) {
      status.textContent = '시작일은 종료일과 같거나 더 이른 날로 골라 주세요.'; dates.from.focus(); return;
    }
    clearTimeout(refreshTimer);
    const mine = ++request;
    const selected = selection || (initial || automatic ? {...scope} : filterValues());
    pending = true; apply.disabled = true; reset.disabled = true; refreshButton.disabled = true; content.setAttribute('aria-busy', 'true');
    status.textContent = lastSuccess ? `기록을 확인하고 있습니다. 표시된 기록 확인: ${when(lastSuccess)}` : '학습 기록을 불러오고 있습니다.';
    try {
      const qs = new URLSearchParams(Object.entries(selected).filter(([,v]) => v));
      const response = await api('teaching/dashboard' + (qs.size ? '?' + qs : ''));
      if (mine !== request || !dialog.isConnected || !dialog.open) return;
      const draft = automatic ? filterValues() : null;
      const top = dialog.scrollTop, tableScroll = content.querySelector('.ld-table-wrap')?.scrollLeft || 0;
      const focusKey = content.contains(document.activeElement) ? document.activeElement?.getAttribute('data-focus-key') : null;
      const definitionsOpen = content.querySelector('.ld-definitions')?.open;
      data = response; scope = {...selected, from:response.range?.from || selected.from || '', to:response.range?.to || selected.to || ''};
      if (nextTab) {tab = nextTab; if (nextTab === 'students') studentView = 'metrics';}
      if (!automatic) pageIndex = 0;
      lastSuccess = Date.now(); status.dataset.state = 'fresh';
      const f = data.filters || {};
      selects.classId.replaceChildren(option('', '볼 수 있는 모든 반'), ...(f.classes || []).map(c => option(c.id, c.name)));
      selects.gameId.replaceChildren(option('', '모든 활동'), ...(f.missions || []).map(m => option(m.id, m.title)));
      setFilters(draft || scope);
      status.textContent = `마지막 확인: ${when(lastSuccess)} / ${rangeText()}`;
      draw();
      if (automatic) {
        if (definitionsOpen) content.querySelector('.ld-definitions').open = true;
        const matchingFocus = focusKey && [...content.querySelectorAll('[data-focus-key]')].find(n => n.getAttribute('data-focus-key') === focusKey);
        matchingFocus?.focus({preventScroll:true}); dialog.scrollTop = top;
        const wrap = content.querySelector('.ld-table-wrap'); if (wrap) wrap.scrollLeft = tableScroll;
      }
    } catch (error) {
      if (mine !== request || !dialog.isConnected || !dialog.open) return;
      status.dataset.state = 'stale';
      if ([401,403].includes(error.status)) {
        data = null; content.replaceChildren(); lastSuccess = null; autoRefresh.checked = false;
        status.textContent = error.status === 403 ? '이 학반의 기록을 볼 권한이 없습니다.' : '선생님 계정으로 다시 로그인해 주세요.';
      } else status.textContent = data ? `갱신하지 못했습니다. 아래는 ${when(lastSuccess)}에 확인한 이전 조회 결과입니다. ${rangeText()}` : '기록을 불러오지 못했습니다. 연결을 확인하고 다시 조회해 주세요.';
    } finally {
      if (mine === request && dialog.isConnected) {
        pending = false; apply.disabled = false; reset.disabled = false; refreshButton.disabled = false; content.removeAttribute('aria-busy'); scheduleRefresh();
      }
    }
  }
  function rangeText() {
    const from = data.range?.from || scope.from, to = data.range?.to || scope.to;
    return `${from || '기록 시작'} ~ ${to || '현재'} / 서버에 도착한 시각 기준`;
  }
  function metric(label, value, detail) {
    return el('article', {class:'ld-metric'}, el('h3', {}, label), el('strong', {}, value), el('p', {}, detail));
  }
  function rateCell(row) {
    return el('div', {class:'ld-rate'}, el('b', {}, percent(row)), el('span', {}, `${count(row.correct)} / ${count(row.graded)}건`));
  }
  function timeCell(row) {
    return el('div', {}, el('span', {}, duration(row.activeSeconds)), el('small', {class:'ld-sub'}, `${count(row.timeSamples)}개 시간 기록`));
  }
  function responseCell(row) {
    return row.answeredStudents == null ? '집계 없음' : `${count(row.answeredStudents)} / ${count(row.students)}명`;
  }
  function currentCell(row) {
    const c = row.current || {}, p = row.progress || {};
    return el('div', {class:'ld-current'}, el('b', {}, c.gameTitle || c.regionTitle || '진행 위치 미확인'),
      c.gameTitle && c.regionTitle ? el('small', {class:'ld-sub'}, c.regionTitle) : null,
      c.taskTitle ? el('span', {}, c.taskTitle) : null,
      c.source === 'checkpoint' ? el('small', {class:'ld-sub'}, '저장된 위치와 다음 단계 / 저장 시각 미수집') : null,
      p.selectedRegionTitle ? el('small', {class:'ld-sub'}, '선택한 복구 지역: ' + p.selectedRegionTitle) : null,
      p.trackedGameTitle && p.trackedGameTitle !== c.gameTitle ? el('small', {class:'ld-sub'}, '이어갈 의뢰: ' + p.trackedGameTitle) : null);
  }
  function currentStatusCell(row) {
    const c = row.current || {};
    return el('div', {}, el('span', {class:'ld-presence ld-presence-' + (['active','idle','offline'].includes(c.status) ? c.status : 'unknown')}, activityStatus(c)),
      el('small', {class:'ld-sub'}, '최근 확인: ' + when(c.lastSeen || c.observedAt)));
  }
  function progressCell(row) {
    const p = row.progress || {};
    if (p.completedRequired == null || p.totalRequired == null || !p.totalRequired) return '진행 기록 없음';
    return el('div', {}, `${count(p.completedRequired)} / ${count(p.totalRequired)}단계`, el('small', {class:'ld-sub'}, '필수 단계 완료'));
  }
  // 고른 길: 지금 고른 길과 의뢰마다 들어간 길(빠르게 문제만, 이야기 모두 보기)
  const paceList = row => (row.pace?.missions || []).map(m => `${m.title}: ${m.labels.join(', ')}`);
  function paceCell(row) {
    const p = row.pace || {}, list = p.missions || [];
    const quick = list.filter(m => m.paces.includes('quick')).length, story = list.filter(m => m.paces.includes('story')).length;
    return el('div', {class:'ld-pace'}, el('b', {}, p.currentLabel || '고르기 전'),
      list.length ? el('small', {class:'ld-sub'}, `빠르게 ${count(quick)}개, 이야기 ${count(story)}개`) : el('small', {class:'ld-sub'}, '들어간 의뢰 없음'),
      list.length ? el('details', {}, el('summary', {}, '의뢰별 길'), el('ul', {}, paceList(row).map(t => el('li', {}, t)))) : null);
  }
  function drill(changes, nextTab) {load({selection:{...scope,...changes},nextTab});}
  const tabs = [['students','학생별'],['activities','활동별'],['stages','단계별'],['classes','학반 비교'],['errors','오류 기록'],['competency','역량']];
  function draw() {
    const summary = data.summary || {};
    const chosenClass = scope.classId ? className(data,scope.classId) : data.filters?.classes?.length === 1 ? data.filters.classes[0].name : '볼 수 있는 모든 반';
    const chosenStudent = (data.filters?.students || []).find(s => s.id === scope.student);
    const chosenActivity = (data.filters?.missions || []).find(m => m.id === scope.gameId);
    const chosenTask = (data.filters?.tasks || []).find(t => t.gameId === scope.gameId && t.id === scope.taskId);
    const heading = el('div', {class:'ld-scope'}, el('p', {}, [chosenClass, chosenStudent && studentName(chosenStudent), chosenActivity?.title, chosenTask?.title, scope.runId && '선택한 연습 회차'].filter(Boolean).join(' / ')),
      scope.taskId ? button('이 활동의 모든 단계', () => drill({taskId:''},'stages'), {class:'ld-link'}) : null,
      scope.gameId ? button('모든 활동 보기', () => drill({gameId:'',taskId:''},'activities'), {class:'ld-link'}) : null,
      scope.student ? button('모든 학생 보기', () => drill({student:'',runId:''},'students'), {class:'ld-link'}) : null);
    const cards = el('div', {class:'ld-metrics'},
      metric('참여한 학생', `${count(summary.activeStudents)} / ${count(summary.students)}명`, '선택 범위에서 기록이 있는 학생 / 대상 학생'),
      metric('기록된 참여 시간', duration(summary.activeSeconds), `${count(summary.timeSamples)}개 기록 / 측정 학생 ${count(summary.timeStudents)}명`),
      metric('게임 정답률', percent(summary), `정답 ${count(summary.correct)} / 판정 ${count(summary.graded)}건`),
      metric('조회 기간 첫 시도 정답률', percent({correct:summary.firstCorrect,graded:summary.firstAttempts}), `첫 정답 ${count(summary.firstCorrect)} / 첫 판정 ${count(summary.firstAttempts)}건`),
      metric('학습 오답', `${count(summary.incorrect)}건`, `판정한 제출 ${count(summary.graded)}건 중`),
      metric('기술 오류', `${count(summary.technicalErrors)}건`, '화면, 연결, 저장 문제 기록'),
      metric('응답, 시도', `${count(summary.attempts)}건`, '제출, 선택, 예상, 회고 등의 응답 기록'),
      metric('정답 판정 없는 기록', `${count(summary.ungraded)}건`, '예상, 의견, 탐색 등 별도로 볼 기록'));
    const notes = el('details', {class:'ld-definitions'}, el('summary', {}, '숫자와 시간은 어떻게 읽나요?'),
      el('p', {}, '게임 정답률은 정답 판정이 있는 제출의 정답 수 ÷ 판정 수입니다. 여러 번 제출하면 각 시도가 포함됩니다. 학생의 전체 이해도나 교사 평가 점수를 뜻하지 않습니다.'),
      el('p', {}, '조회 기간 첫 시도 정답률은 선택한 기간 안에서 학생, 연습 회차, 학습 단계별 첫 채점 응답만 셉니다. 진단, 예상, 완료 표시와 판정 기준을 확인할 수 없는 기록은 정답률에서 제외합니다.'),
      el('p', {}, '응답한 학생은 조회 기간 안에 답, 선택, 예상, 회고 등을 제출한 학생입니다. 미응답은 대상 학생 중 응답 기록이 없는 학생이며 오답이나 미이수로 계산하지 않습니다. 선택 과제와 아직 시작하지 않은 활동도 포함될 수 있습니다.'),
      el('p', {}, '참여 시간은 화면이 활성화되어 있고 최근 조작 중임이 확인된 시간 기록만 합산합니다. 수집 전 활동과 시간 기록이 없는 항목은 미수집입니다. 0초와 미수집은 다릅니다.'),
      el('p', {}, '학습 오답과 화면, 연결, 저장 문제인 기술 오류는 따로 셉니다. 시간, 오답, 힌트 사용만으로 태도나 노력을 판단하지 않습니다.'));
    const tabBar = el('div', {class:'ld-tabs', 'aria-label':'기록 보기 방식'}, tabs.map(([id,label]) => button(label, () => {
      tab = id; sortBy = 'name'; pageIndex = 0; draw(); content.querySelector(`[data-tab="${id}"]`)?.focus();
    }, {'aria-pressed':String(tab === id), 'data-tab':id, 'data-focus-key':'tab-' + id})));
    const panel = el('section', {class:'ld-panel', 'aria-label':tabs.find(([id]) => id === tab)[1]});
    const coverage = summary.answeredStudents == null ? null : el('p', {class:'ld-coverage'}, `응답한 학생 ${count(summary.answeredStudents)} / ${count(summary.students)}명 / 미응답 ${count(summary.unansweredStudents)}명`, el('span', {}, '미응답은 오답에 포함하지 않습니다.'));
    content.replaceChildren(heading, cards, ...(coverage ? [coverage] : []), notes, tabBar, panel);
    drawPanel(panel);
  }
  function empty(panel, message) {panel.append(el('p', {class:'ld-empty'}, message));}
  function table(columns, rows) {
    const t = el('table', {class:'ld-table'}, el('thead', {}, el('tr', {}, columns.map(c => el('th', {scope:'col'}, c.label)))),
      el('tbody', {}, rows.map(row => el('tr', {}, columns.map(c => el('td', {'data-column':c.label}, c.cell(row)))))));
    return el('div', {class:'ld-table-wrap', tabindex:'0', role:'region', 'aria-label':'가로로 스크롤할 수 있는 기록 표'}, t);
  }
  function sorted(rows) {
    return [...rows].sort((a,b) => {
      if (sortBy === 'time') return (b.activeSeconds ?? -1) - (a.activeSeconds ?? -1);
      if (sortBy === 'accuracy') return (ratio(b) ?? -1) - (ratio(a) ?? -1);
      if (sortBy === 'errors') return number(b.technicalErrors) - number(a.technicalErrors);
      if (sortBy === 'wrong') return number(b.incorrect) - number(a.incorrect);
      return number(a.number) - number(b.number) || String(a.name || a.title || a.nickname || '').localeCompare(String(b.name || b.title || b.nickname || ''), 'ko');
    });
  }
  function commonColumns() {
    return [
      {label:'참여 학생', cell:r => `${count(r.activeStudents)} / ${count(r.students)}명`},
      {label:'응답한 학생 / 대상', cell:responseCell},
      {label:'미응답 학생', cell:r => r.unansweredStudents == null ? '집계 없음' : `${count(r.unansweredStudents)}명`},
      {label:'기록된 참여 시간', cell:timeCell},
      {label:'게임 정답률 (정답/판정)', cell:rateCell},
      {label:'조회 기간 첫 시도 정답률', cell:r => rateCell({correct:r.firstCorrect,graded:r.firstAttempts})},
      {label:'학습 오답', cell:r => `${count(r.incorrect)}건`},
      {label:'기술 오류', cell:r => `${count(r.technicalErrors)}건`},
      {label:'판정 없는 기록', cell:r => `${count(r.ungraded)}건`},
    ];
  }
  function drawPanel(panel) {
    const grouped = compareByClass && ['activities','stages'].includes(tab);
    const rows = data[grouped ? tab === 'activities' ? 'classActivities' : 'classStages' : tab] || [];
    panel.replaceChildren(el('h3', {}, tabs.find(([id]) => id === tab)[1]));
    if (tab === 'errors') {drawErrors(panel, rows); return;}
    if (tab === 'competency') {drawCompetency(panel); return;}
    const order = el('select', {'aria-label':'기록 정렬','data-focus-key':'sort'}, option('name','이름, 번호 순'), option('time','참여 시간 많은 순'), option('accuracy','정답률 높은 순'), option('wrong','학습 오답 많은 순'), option('errors','기술 오류 많은 순'));
    order.value = sortBy;
    order.onchange = () => {sortBy = order.value; pageIndex = 0; drawPanel(panel); panel.querySelector('[aria-label="기록 정렬"]')?.focus();};
    const tools = el('div', {class:'ld-panel-tools'}, el('label', {}, el('span', {}, '정렬'), order), button('이 표 CSV', () => download(rows, tab)));
    if (['activities','stages'].includes(tab)) {
      const grouping = el('select', {'aria-label':'집계 보기','data-focus-key':'grouping'}, option('all','전체 집계'), option('class','반별 비교'));
      grouping.value = grouped ? 'class' : 'all';
      grouping.onchange = () => {compareByClass = grouping.value === 'class'; pageIndex = 0; drawPanel(panel); panel.querySelector('[aria-label="집계 보기"]')?.focus();};
      tools.prepend(el('label', {}, el('span', {}, '집계 보기'), grouping));
    }
    if (tab === 'students') {
      const view = el('select', {'aria-label':'학생 표 보기','data-focus-key':'student-view'}, option('current','현재 진행'), option('metrics','조회 기간 집계'));
      view.value = studentView; view.onchange = () => {studentView = view.value; pageIndex = 0; drawPanel(panel); panel.querySelector('[aria-label="학생 표 보기"]')?.focus();};
      tools.prepend(el('label', {}, el('span', {}, '학생 표 보기'), view));
    }
    panel.append(tools);
    if (tab === 'classes' || grouped) panel.append(el('p', {class:'ld-note'}, '학반 비교는 학반과 학생 선택을 제외하고, 볼 수 있는 모든 학반의 같은 활동, 단계, 기간, 회차 기록을 비교합니다. 각 반의 학생 수와 판정 수를 함께 살펴보세요.'));
    if (tab === 'stages') panel.append(el('p', {class:'ld-note'}, '단계별 시간은 해당 단계에서 수집된 기록만 표시합니다. 앞뒤 제출 시각 차이로 빈 시간을 추정하지 않습니다.'));
    if (tab === 'students' && studentView === 'current') panel.append(el('p', {class:'ld-note'}, `현재 진행은 조회 기간과 회차 선택과 관계없이 최근 확인한 기록입니다. ${data.currentAsOf ? '서버 확인: ' + when(data.currentAsOf) + '. ' : ''}활동 신호나 접속 기록이 없는 경우 현재 접속 여부를 단정하지 않습니다.`));
    if (tab === 'stages' && grouped && !scope.gameId) {empty(panel, '학습 활동을 고르면 해당 활동의 단계별 반 비교를 볼 수 있습니다.'); return;}
    if (!rows.length) {empty(panel, '선택한 조건에 해당하는 기록이 없습니다. 기간이나 활동 조건을 바꾸어 보세요.'); return;}
    let columns;
    const studentActions = r => el('div', {class:'ld-row-actions'},
      button('단계 보기', () => drill({classId:r.classId || '',student:r.id},'stages'), {'data-focus-key':'stages-' + r.id}),
      onReview ? button('제출, 피드백', () => {dialog.close(); onReview({student:r.id,classId:r.classId});}, {'data-focus-key':'review-' + r.id}) : null);
    if (tab === 'students') columns = [
      {label:'학생', cell:r => el('div', {}, el('b', {}, studentName(r)), el('small', {class:'ld-sub'}, className(data,r.classId)))},
      ...(studentView === 'current' ? [{label:'최근 확인한 위치와 단계',cell:currentCell},{label:'활동 상태',cell:currentStatusCell},{label:'이어갈 의뢰 진행',cell:progressCell},{label:'고른 길',cell:paceCell}] : commonColumns().filter(c => c.label !== '참여 학생')),
      {label:'상세 확인', cell:studentActions},
    ];
    else if (tab === 'activities') columns = [{label:'활동',cell:r => button(r.title || '활동', () => drill({gameId:r.gameId,taskId:'',...(grouped ? {classId:r.classId,student:''} : {})},'stages'), {class:'ld-link','data-focus-key':'activity-' + (r.classId || '') + r.gameId})}, ...commonColumns(),
      {label:'상세 확인',cell:r => button('이 활동 학반 비교', () => drill({gameId:r.gameId,taskId:''},'classes'))}];
    else if (tab === 'classes') columns = [{label:'학반', cell:r => button(r.name || className(data,r.classId), () => drill({classId:r.classId,student:''},'students'), {class:'ld-link'})}, ...commonColumns()];
    else columns = [{label:'학습 단계', cell:r => el('div', {}, button(r.title || '학습 단계', () => drill({gameId:r.gameId,taskId:r.taskId,...(grouped ? {classId:r.classId,student:''} : {})},'students'), {class:'ld-link','data-focus-key':'stage-' + (r.classId || '') + r.gameId + r.taskId}), el('small', {class:'ld-sub'}, (data.filters?.missions || []).find(m => m.id === r.gameId)?.title || '학습 활동'),
      r.optional === true ? el('small', {class:'ld-sub'}, '선택 단계') : null, r.gradedTask === false ? el('small', {class:'ld-sub'}, '정답 판정 없는 단계') : null)}, ...commonColumns(),
      {label:'상세 확인',cell:r => button('이 단계 학반 비교', () => drill({gameId:r.gameId,taskId:r.taskId},'classes'))}];
    if (grouped) columns.unshift({label:'학반',cell:r => className(data,r.classId)});
    const pageSize = 25, pages = Math.max(1,Math.ceil(rows.length / pageSize));
    pageIndex = Math.min(pageIndex,pages - 1);
    const displayRows = sorted(rows).slice(pageIndex * pageSize,(pageIndex + 1) * pageSize);
    panel.append(el('p', {class:'ld-note'}, `표의 항목 ${count(rows.length)}개 / 정답률 분모는 각 항목의 판정 기록 수입니다. CSV는 이 표의 모든 항목을 담습니다.`), table(columns, displayRows));
    if (pages > 1) {
      const previous = button('이전 항목', () => {pageIndex--; drawPanel(panel); panel.querySelector('.ld-pagination button')?.focus();}, {'data-focus-key':'previous-page'});
      const next = button('다음 항목', () => {pageIndex++; drawPanel(panel); panel.querySelector('.ld-pagination button:last-child')?.focus();}, {'data-focus-key':'next-page'});
      previous.disabled = pageIndex === 0; next.disabled = pageIndex === pages - 1;
      panel.append(el('nav', {class:'ld-pagination','aria-label':'표 항목 이동'}, previous, el('span', {}, `${pageIndex + 1} / ${pages}쪽`), next));
    }
  }
  // 역량: 학생마다 과학 역량 여섯과 탐험 성향 여섯(게임 기록으로 본 모습), 처음 일주일과 지금, 역량 점검 처음과 최근
  let compClass = '', compData = null, compPick = '';
  async function drawCompetency(panel) {
    const classes = data.filters?.classes || [];
    const cid = scope.classId || compClass || classes[0]?.id || '';
    const pickClass = classes.length > 1 ? el('select', {'aria-label':'역량을 볼 학반','data-focus-key':'comp-class'}, classes.map(c => option(c.id, c.name))) : null;
    if (pickClass) {pickClass.value = cid; pickClass.onchange = () => {compClass = pickClass.value; compData = null; compPick = ''; drawCompetency(panel);};}
    const wait = el('p', {class:'ld-empty'}, '역량을 계산하고 있습니다.');
    panel.replaceChildren(el('h3', {}, '역량'), el('p', {class:'ld-note'}, '게임 기록(단계 응답, 도움, 예상과 돌아보기, 새 조건 문제, 설명 쓰기, 게시판, 현장 활동)에서 계산한 0~100입니다. 기록이 쌓일수록 오르고, 틀리거나 도움을 받아도 깎이지 않습니다. 성적이나 학생 사이 순위가 아니며, 근거 수가 적으면 아직 판단하기 이릅니다. 역량 점검은 역량마다 상황 문제 2개와 자기 평가 1개(4점)이고, 처음과 최근 점검을 견줍니다.'),
      pickClass ? el('label', {class:'ld-error-filter'}, el('span', {}, '학반'), pickClass) : '', wait);
    if (!compData || compData.classId !== cid) {
      try {compData = await api('teaching/competency' + (cid ? '?classId=' + encodeURIComponent(cid) : ''));}
      catch (e) {wait.textContent = e.message || '역량을 불러오지 못했습니다.'; return;}
    }
    const d = compData, comp = d.competencies, tend = d.tendencies;
    if (!d.students.length) {wait.textContent = '이 학반에 학생이 없습니다.'; return;}
    wait.remove();
    const scoreCell = (r, id) => {const v = r.competencies[id], up = r.start ? v - r.start[id] : 0; return el('span', {}, String(v), up > 0 ? el('small', {class:'ld-sub'}, `처음보다 +${up}`) : '');};
    const checkText = (ck) => ck ? comp.map(x => `${x.short} ${ck.right[x.id] ?? 0}/2(자기 평가 ${ck.rates[x.id] ?? '-'})`).join(', ') : '';
    const detail = el('div', {class:'ld-comp-detail'});
    const show = (r) => {
      compPick = r.id;
      const layers = [...(r.start ? [{values: comp.map(x => r.start[x.id]), cls:'before'}] : []), {values: comp.map(x => r.competencies[x.id]), cls:'now'}];
      detail.replaceChildren(el('h4', {}, studentName(r)),
        el('div', {class:'ld-comp-charts'},
          el('div', {}, el('b', {}, '과학 역량'), radar(comp.map(x => ({label:x.short})), layers, {size:260, title:'과학 역량'}), r.start ? el('p', {class:'ld-sub'}, '점선: 처음 일주일, 실선: 지금') : ''),
          el('div', {}, el('b', {}, '탐험 성향'), radar(tend.map(x => ({label:x.label})), [{values: tend.map(x => r.tendencies[x.id]), cls:'now tend'}], {size:260, title:'탐험 성향'}))),
        el('ul', {class:'ld-comp-basis'}, comp.map(x => el('li', {}, el('b', {}, `${x.label} ${r.competencies[x.id]}`), ': ', (r.basis[x.id] || []).map(b => `${b.label} ${b.count}`).join(', ') || '근거 기록 없음'))),
        el('p', {}, `역량 점검 ${r.checks.count}회`, r.checks.first ? el('br') : '', r.checks.first ? '처음: ' + checkText(r.checks.first) : '', r.checks.last ? el('br') : '', r.checks.last ? '최근: ' + checkText(r.checks.last) : ''));
    };
    const columns = [
      {label:'학생', cell:r => button(studentName(r), () => show(r), {class:'ld-link','data-focus-key':'comp-' + r.id})},
      ...comp.map(x => ({label:x.short, cell:r => scoreCell(r, x.id)})),
      {label:'근거 수', cell:r => count(r.evidence)},
      {label:'역량 점검', cell:r => r.checks.count ? `${r.checks.count}회` : '아직 없음'},
    ];
    panel.append(el('div', {class:'ld-panel-tools'}, button('역량 CSV', () => compCSV(d))), table(columns, d.students), detail);
    const picked = d.students.find(r => r.id === compPick) || d.students[0];
    if (picked) show(picked);
  }
  function compCSV(d) {
    const comp = d.competencies, tend = d.tendencies;
    const heads = ['번호','닉네임',...comp.map(x => x.label),...comp.map(x => x.label + ' 처음 일주일'),...tend.map(x => x.label),'근거 수','역량 점검 횟수',...comp.map(x => '처음 점검 ' + x.short + ' 문제'),...comp.map(x => '처음 점검 ' + x.short + ' 자기 평가'),...comp.map(x => '최근 점검 ' + x.short + ' 문제'),...comp.map(x => '최근 점검 ' + x.short + ' 자기 평가')];
    const ck = (c, id, k) => c ? (k === 'right' ? `${c.right[id] ?? 0}/2` : c.rates[id] ?? '') : '';
    const rows = d.students.map(r => [r.number, r.nickname, ...comp.map(x => r.competencies[x.id]), ...comp.map(x => r.start ? r.start[x.id] : ''), ...tend.map(x => r.tendencies[x.id]), r.evidence, r.checks.count,
      ...comp.map(x => ck(r.checks.first, x.id, 'right')), ...comp.map(x => ck(r.checks.first, x.id, 'rate')), ...comp.map(x => ck(r.checks.last, x.id, 'right')), ...comp.map(x => ck(r.checks.last, x.id, 'rate'))]);
    const quote = value => {let s = String(value ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"','""') + '"';};
    const blob = new Blob(['﻿' + [heads,...rows].map(row => row.map(quote).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), a = el('a', {href:url, download:`역량-${new Date().toISOString().slice(0,10)}.csv`});
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  function drawErrors(panel, rows) {
    const kind = el('select', {'aria-label':'오류 구분','data-focus-key':'error-kind'}, option('technical','기술 오류'), option('learning','학습 오답'));
    kind.value = errorKind;
    const list = el('div');
    const update = () => {
      const shown = rows.filter(row => row.kind === kind.value).sort((a,b) => number(b.received) - number(a.received));
      list.replaceChildren(el('p', {class:'ld-note'}, `${kind.value === 'technical' ? '기술 오류' : '학습 오답'} ${count(shown.length)}건 표시`));
      if (!shown.length) {empty(list, kind.value === 'technical' ? '선택한 조건에서 수집된 기술 오류가 없습니다.' : '선택한 조건에서 정답 판정을 받은 오답 기록이 없습니다.'); return;}
      list.append(table([
        {label:'도착 시각',cell:r => when(r.received)},
        {label:'학생',cell:studentName}, {label:'구분',cell:errorLabel},
        {label:'활동, 단계',cell:r => r.title || (data.filters?.missions || []).find(m => m.id === r.gameId)?.title || '활동 기록'},
        {label:'내용',cell:errorMessage},
      ], shown));
    };
    panel.append(el('p', {class:'ld-note'}, '기술 오류는 학습 오답에 포함하지 않습니다. 아래 목록은 최근 100개 오류 기록 범위이며, 위 집계는 선택한 기간 전체입니다. 수집 전의 오류는 포함되지 않습니다.'), el('label', {class:'ld-error-filter'}, el('span', {}, '오류 구분'), kind), list);
    kind.onchange = () => {errorKind = kind.value; update();}; update();
  }
  function download(rows, kind) {
    const heads = ['항목','학반','활동','참여 학생','대상 학생','응답한 학생','미응답 학생','기록된 참여 시간(초)','시간 기록 수','정답 수','판정 수','정답률(%)','조회 기간 첫 시도 정답 수','조회 기간 첫 시도 판정 수','조회 기간 첫 시도 정답률(%)','학습 오답 수','기술 오류 수','판정 없는 기록 수','조회 시작일','조회 종료일','조회 시각 기준','현재 활동 상태','최근 확인한 위치','최근 확인한 활동','최근 확인한 단계','선택한 복구 지역','이어갈 의뢰','완료 필수 단계','전체 필수 단계','최근 확인 시각','고른 길','의뢰별 길'];
    const values = sorted(rows).map(r => [r.title || r.name || studentName(r),r.classId ? className(data,r.classId) : scope.classId ? className(data,scope.classId) : '선택 범위 전체',(data.filters?.missions || []).find(m => m.id === (r.gameId || scope.gameId))?.title || '전체',r.activeStudents ?? '',r.students ?? '',r.answeredStudents ?? '집계 없음',r.unansweredStudents ?? '집계 없음',r.activeSeconds ?? '미수집',r.timeSamples ?? 0,r.correct ?? 0,r.graded ?? 0,ratio(r) ?? '판정 기록 없음',r.firstCorrect ?? 0,r.firstAttempts ?? 0,ratio({correct:r.firstCorrect,graded:r.firstAttempts}) ?? '판정 기록 없음',r.incorrect ?? 0,r.technicalErrors ?? 0,r.ungraded ?? 0,scope.from || '',scope.to || '','서버에 도착한 시각',r.current ? activityStatus(r.current) : '',r.current?.regionTitle || '',r.current?.gameTitle || '',r.current?.taskTitle || '',r.progress?.selectedRegionTitle || '',r.progress?.trackedGameTitle || '',r.progress?.completedRequired ?? '',r.progress?.totalRequired ?? '',r.current ? when(r.current.lastSeen || r.current.observedAt) : '',r.pace ? r.pace.currentLabel || '고르기 전' : '',r.pace ? paceList(r).join(' / ') : '']);
    heads.push('조회 단계','조회 회차','조회 확인 시각','현재 진행의 기준');
    const selectedTask = (data.filters?.tasks || []).find(t => t.gameId === scope.gameId && t.id === scope.taskId)?.title;
    const selectedRun = (data.filters?.runs || []).find(r => r.id === scope.runId)?.label;
    values.forEach(row => row.push(scope.taskId ? selectedTask || '선택한 단계' : '모든 단계',scope.runId ? selectedRun || '선택한 회차' : '모든 회차',when(lastSuccess),'기간과 회차 선택과 관계없는 최근 확인 및 저장 기록'));
    const quote = value => {let s = String(value ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"','""') + '"';};
    const blob = new Blob(['\ufeff' + [heads,...values].map(row => row.map(quote).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), a = el('a', {href:url, download:`학습기록-${tabs.find(([id]) => id === kind)?.[1] || '조회'}-${new Date().toISOString().slice(0,10)}.csv`});
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  await load({initial:true});
  return {dialog, refresh:() => load({automatic:true})};
}
