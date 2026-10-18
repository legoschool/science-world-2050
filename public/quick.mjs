// 빠르게 문제만: 마을을 걷지 않고 지역과 의뢰를 한눈에 보고 의뢰 하나를 바로 고른다.
// 완료와 진행은 이야기 길과 같은 기록(/api/adventure, 의뢰 저장 상태)을 읽으므로 두 길을 오가도 그대로 이어진다.
import {JOURNEY_REGIONS, regionForQuest, regionQuest} from './region-journey.mjs';
import {MISSIONS, loadMissions, questSteps} from './quests.mjs';

// 다른 의뢰를 먼저 해결해야 열리는 의뢰
export const QUICK_LOCKS = {'R3-G05': 'R3-G04'};
// 전력망 지구 전용 실험의 들어가는 곳. R3-G05는 정비소 안의 여섯 곳을 차례로 고른다.
const G05_PLACES = [['g05-intro', '새 조사 시작하기'], ['motor-workshop', '전동기 작업대'], ['buzzer-workshop', '버저 작업대'], ['deduction-workshop', '가린 장치 조사하기'], ['application-workshop', '주민의 의뢰 살펴보기'], ['workshop-summary', '정비소 기록 마무리']];
const EXTRA = {life: [['북쪽 자매 마을', ['R5-G10']]]};
let lastTab = {run: '', key: ''};
const batchim = (w) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };

export function quickBoard(host, {el, button, state, api, onEnter, onRecord, onDaily, onChallenges}) {
  let alive = true, quests = [], progress = {}, regions = null;
  const adv = state.adventure ??= {welcomed: false, tracked: 'R3-G04'};
  const root = el('section', {class: 'quick-board', 'aria-label': '의뢰 고르기'});
  const total = el('span', {class: 'qb-total'});
  const tabs = el('div', {class: 'qb-tabs', role: 'tablist', 'aria-label': '지역'});
  const list = el('div', {class: 'qb-list'});
  root.append(el('div', {class: 'qb-head', 'data-no-gloss': ''}, el('h1', {}, '의뢰 고르기'), total, el('span', {class: 'qb-head-tools'}, onDaily ? button('오늘의 탐구', onDaily, 'qb-tool') : '', onChallenges ? button('도전 게시판', onChallenges, 'qb-tool') : '')), tabs, list);
  host.replaceChildren(root);
  list.append(el('p', {class: 'qb-loading'}, '의뢰를 불러오고 있어요.'));
  const get = (url) => fetch(url, {credentials: 'same-origin'}).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const run = encodeURIComponent(state.runId || '');
  Promise.all([get('/regions.json'), get('/api/adventure?runId=' + run), loadMissions(), get('/api/workshop-progress?runId=' + run), get('/api/magnet-progress?runId=' + run)]).then(([r, prog, , g05, g06]) => {
    if (!alive) return;
    if (!r || !prog) { list.replaceChildren(el('p', {class: 'qb-loading'}, '의뢰를 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.')); return; }
    regions = r; quests = prog.quests || []; progress = {g05, g06};
    draw();
  });

  // 방금 끝낸 의뢰는 완료 기록이 서버에 닿기 전이라도 이 기기의 의뢰 기록으로 해결로 본다
  const localDone = (id) => (id === 'R3-G04' ? !!state.complete : !!(state.missions?.[id]?.completed && state.missions[id].run === state.runId));
  const statusOf = (id) => (localDone(id) ? 'completed' : quests.find((q) => q.id === id)?.status || 'available');
  const titleOf = (id) => MISSIONS[id]?.title || quests.find((q) => q.id === id)?.place || id;
  const questOf = (id) => quests.find((q) => q.id === id)?.title || MISSIONS[id]?.quest || '';
  function lockOf(id) { const need = QUICK_LOCKS[id]; return need && statusOf(need) !== 'completed' ? need : ''; }
  function stepsOf(id) {
    const s = questSteps(id, state, progress);
    return s.length ? {done: s.filter(Boolean).length, all: s.length} : null;
  }
  function groups(key) {
    const reg = regions[key];
    return [...reg.zones.map((z) => [z.title, z.games.map((g) => g.id)]), ...(EXTRA[key] || [])];
  }
  function draw() {
    const all = quests.filter((q) => regionForQuest(q.id)), solved = all.filter((q) => statusOf(q.id) === 'completed').length;
    total.textContent = `해결한 의뢰 ${solved} / ${all.length}`;
    // 아직 지역을 고르지 않은 학생의 기본 추적값(R3-G04)은 고른 지역으로 보지 않는다
    const tab = (lastTab.run === state.runId && lastTab.key) || adv.selectedRegion || (adv.welcomed ? regionForQuest(adv.tracked) : '') || 'farm';
    tabs.replaceChildren(...JOURNEY_REGIONS.map((r) => {
      const ids = groups(r.key).flatMap(([, g]) => g), done = ids.filter((id) => statusOf(id) === 'completed').length;
      const b = button('', () => { lastTab = {run: state.runId, key: r.key}; draw(); }, 'qb-tab');
      b.append(el('strong', {}, r.title), el('small', {}, `${done} / ${ids.length}`));
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(r.key === tab)); b.dataset.region = r.key;
      return b;
    }));
    const region = JOURNEY_REGIONS.find((r) => r.key === tab);
    // 이어서 할 의뢰: 지금 추적하는 의뢰가 이 지역에 있고 아직 안 끝났으면 그것, 아니면 지역별로 하던 의뢰나 첫 미해결 의뢰
    const tracked = adv.welcomed && regionForQuest(adv.tracked) === tab && statusOf(adv.tracked) !== 'completed' ? adv.tracked : '';
    const next = tracked || regionQuest(adv, tab, quests.map((q) => ({...q, status: statusOf(q.id)})))?.id;
    list.replaceChildren(el('p', {class: 'qb-problem'}, region.problem), ...groups(tab).map(([title, ids]) => el('section', {class: 'qb-zone'},
      el('h2', {'data-no-gloss': ''}, title), el('div', {class: 'qb-grid'}, ids.map((id) => card(id, id === next))))));
    list.scrollTop = 0;
  }
  function card(id, isNext) {
    const st = statusOf(id), lock = lockOf(id), steps = stepsOf(id);
    const b = button('', () => open(id), 'qb-card ' + st + (isNext ? ' next' : ''));
    b.dataset.game = id;
    const label = st === 'completed' ? '해결' : steps && steps.done ? `${steps.done} / ${steps.all}단계` : '새 의뢰';
    b.append(el('span', {class: 'qb-state'}, isNext && st !== 'completed' ? '이어서, ' + label : label), el('strong', {}, titleOf(id)), st === 'completed' && MISSIONS[id]?.solved ? el('span', {class: 'qb-solved'}, MISSIONS[id].solved) : el('span', {class: 'qb-quest'}, questOf(id)));
    if (lock) { b.disabled = true; b.classList.add('locked'); b.append(el('span', {class: 'qb-lock'}, `${titleOf(lock)}${batchim(titleOf(lock)) ? '을' : '를'} 먼저 해결해요`)); }
    return b;
  }
  function open(id) {
    if (lockOf(id)) return;
    if (id === 'R3-G05') return g05Places();
    onEnter(id);
  }
  // 가린 회로 추리: 관리실에서 가져온 질문을 받고 정비소 안 여섯 곳 가운데 하나를 고른다
  async function g05Places() {
    const d = el('dialog', {class: 'adventure-dialog qb-places', 'aria-label': '가린 회로 추리'});
    const missing = new Set((progress.g05?.missing || []).map((m) => m.map));
    const rows = el('ol', {class: 'qb-place-list'}, G05_PLACES.map(([map, label]) => {
      const done = map === 'workshop-summary' ? !!progress.g05?.completed : !missing.has(map) && !!progress.g05;
      const b = button(label, () => { d.close(); onEnter('R3-G05', map); }, 'qb-place' + (done ? ' done' : ''));
      return el('li', {}, b, done ? el('span', {class: 'qb-done'}, '마침') : '');
    }));
    const q = el('p', {class: 'quest-story'});
    d.append(el('div', {class: 'dlg-head'}, el('h2', {}, titleOf('R3-G05')), button('닫기', () => d.close())), q, rows);
    d.addEventListener('close', () => d.remove(), {once: true});
    document.body.append(d); d.showModal();
    const h = await get('/api/handoff?runId=' + run);
    if (!alive || !d.isConnected) return;
    const handoff = h?.handoff;
    if (handoff?.question) {
      q.textContent = `관리실에서 가져온 내 질문: “${handoff.question}”`;
      if (!handoff.received) { onRecord?.(handoff.question); handoff.received = true; }
    } else q.remove();
  }
  return () => { alive = false; document.querySelector('.qb-places')?.close(); };
}
