import {openTeaching} from './teaching-ui.mjs';
import {discovery} from './discovery.mjs';
import {writeupView} from './writeup.mjs';
import {learningSupport} from './learning-support.mjs';
import {openTextbook} from './textbook.mjs';
import {answerHint} from './answer-support.mjs';
// 공용 미션 화면. data/missions/*.json에 적힌 과제를 순서대로 보여 주고, 채점은 서버(/api/mission-check)가 한다.
// 정답 열쇠는 학생 브라우저로 보내지 않는다. 학생 화면에는 장소, 이야기, 할 일, 도움말, 실제 저장 상태만 보여 준다.
import {signalDevice, PATTERNS, patternLabel, blips} from './mission-signal.mjs';
import {QUESTS, MISSIONS} from './quests.mjs';
import {candleBench, grainLab, curdLab, flameLab, candleSize, campFuel, oxygenLab, igniteLab, cobaltLab} from './mission-fire.mjs';
import {limeLab, climateModel, virtualSearch, actionCalendar, strategyBoard, ecoInterview, cardNews, bellowsLab} from './mission-eco.mjs';
import {telescope, capsule, newsPage, problemGauges, securityLab, nameCard, exhibitWall, wildCam, directorRoom, jobDict} from './mission-future.mjs';
import {circuitBench, wireLoop, circuitCanvas, paintBulbInside, paintParts, CARDS} from './mission-circuit.mjs';
import {tester, paintKit, paintHolder} from './mission-tester.mjs';
import {dexViewer} from './mission-dex.mjs';
import {dexStrip} from './codex.mjs';
import {interview} from './mission-interview.mjs';
import {patrolBoard} from './mission-patrol.mjs';
import {holdButtons} from './read-gate.mjs';
import {sfx, music} from './sound.mjs';
import {celebrate} from './celebrate.mjs';
import {gridModel} from './mission-grid.mjs';
import {memoryGame} from './mission-memory.mjs';
import {stickerBoard, armLab, breathLab, pumpLab, exerciseLab, habitSim} from './mission-body.mjs';
import {LIGHT_COMPONENTS} from './mission-light.mjs';
import {ENERGY_COMPONENTS} from './mission-energy.mjs';
import {VOYAGE_COMPONENTS} from './mission-voyage.mjs';
import {TUNDRA_COMPONENTS} from './mission-tundra.mjs';
import {sunMeter, sunDay, sunSeason, lampLab, orbitModel, seasonProof, eavesLab, proofMaker, sundial, polarSky, campPlanner, paintMidnightGlobe, paintSunPaths3, paintDialFace, paintSunStick, paintRays, paintMeterParts, paintLampAngle, paintGlobe, paintOrbitPanel, paintAxisAngle, paintOrbitDraw} from './mission-sun.mjs';

const PORTRAIT = {'컴지': 'comji', '달새': 'dalsae', '엘엠': 'elm', '신항이': 'dodam', '미스터리': 'mystery'};
const HELPER = {comji: '컴지', dalsae: '달새', elm: '엘엠', dodam: '신항이', mystery: '미스터리 선생님'};
// 결과를 본 뒤 돌아보기(채점하지 않는다). 탐구 장면(discovery.mjs)과 같은 세 갈래를 쓴다.
const REFLECT = {changed: '생각을 바꾸었어요', kept: '근거를 찾아 생각을 유지해요', unsure: '더 확인하고 싶어요'};
const MEANINGS = ['괜찮아요', '도와주세요', '출발해요', '도착했어요', '기다려 주세요', '위험해요'];
const DEFAULT_TABLE = {'p:S': '괜찮아요', 'p:SS': '도와주세요', 'p:L': '출발해요', 'p:SL': '도착했어요'};
const COMPONENTS = {signal: signalDevice, bench: circuitBench, loop: wireLoop, tester, dex: dexViewer, interview, patrol: patrolBoard, gridmap: gridModel, memory: memoryGame, sunmeter: sunMeter, sunday: sunDay, season: sunSeason, lamp: lampLab, orbit: orbitModel, proof: seasonProof, eaves: eavesLab, proofmake: proofMaker, dial: sundial, polar: polarSky, camp: campPlanner, candle: candleBench, grain: grainLab, curd: curdLab, flame: flameLab, size: candleSize, fuel: campFuel, oxygen: oxygenLab, ignite: igniteLab, cobalt: cobaltLab, lime: limeLab, climate: climateModel, search: virtualSearch, calendar: actionCalendar, strategy: strategyBoard, ecoiv: ecoInterview, cardnews: cardNews, bellows: bellowsLab, telescope, capsule, news: newsPage, gauges: problemGauges, security: securityLab, namecard: nameCard, exhibit: exhibitWall, wildcam: wildCam, director: directorRoom, jobdict: jobDict, stickers: stickerBoard, arm: armLab, breath: breathLab, pump: pumpLab, exercise: exerciseLab, habits: habitSim, ...LIGHT_COMPONENTS, ...ENERGY_COMPONENTS, ...VOYAGE_COMPONENTS, ...TUNDRA_COMPONENTS};
// 과제와 보기 옆에 붙는 그림. 전구 회로 카드는 연결 자료로 그리고, 켜졌는지는 그림에 드러내지 않는다.
function figure(el, spec, cls = 'circuit-fig') {
  if (!spec) return null;
  if (spec.kind === 'card') return circuitCanvas(el, {...CARDS[spec.n], lit: false}, cls, `회로 카드 ${spec.n}`);
  if (spec.kind === 'circuit') return circuitCanvas(el, {...spec, lit: false}, cls, spec.label);
  const cv = el('canvas', {class: cls, width: 480, height: 360, role: 'img', 'aria-label': spec.label || ''});
  const c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0);
  if (spec.kind === 'bulb-inside') paintBulbInside(c);
  if (spec.kind === 'parts') paintParts(c);
  if (spec.kind === 'kit') paintKit(c, {tags: true, battery: true, bulb: true});
  if (spec.kind === 'holder') paintHolder(c);
  if (spec.kind === 'sunstick') paintSunStick(c, spec);
  if (spec.kind === 'rays') paintRays(c, spec);
  if (spec.kind === 'meterparts') paintMeterParts(c);
  if (spec.kind === 'lampangle') paintLampAngle(c, spec);
  if (spec.kind === 'globe') paintGlobe(c, spec);
  if (spec.kind === 'orbitpanel') paintOrbitPanel(c);
  if (spec.kind === 'axisangle') paintAxisAngle(c, spec);
  if (spec.kind === 'orbitdraw') paintOrbitDraw(c);
  if (spec.kind === 'dialface') paintDialFace(c, spec);
  if (spec.kind === 'midnightglobe') paintMidnightGlobe(c, spec);
  if (spec.kind === 'sunpaths3') paintSunPaths3(c, spec);
  if (spec.kind === 'image') { cv.remove?.(); return el('img', {class: cls + ' photo', src: spec.src, alt: spec.label || ''}); }
  return cv;
}
// 보기 순서 섞기: 학생과 회차, 과제마다 정해진 순서로 섞어 다시 그려도 순서가 바뀌지 않는다. '해당 없음' 같은 보기는 맨 뒤에 둔다.
function seeded(text) { let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// 끌어서 놓기: 카드를 누른 채 움직이면 떠다니는 카드가 따라오고, data-drop 칸 위에서 놓으면 drop(칸)을 부른다.
// 조금만 움직였다면 원래 단추 누르기로 처리한다(키보드와 누르기로도 같은 일을 할 수 있다).
function suppressClick(scope) {
  const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
  scope.addEventListener('click', stop, true);
  setTimeout(() => scope.removeEventListener('click', stop, true), 350);
}
function dragSource(node, scope, drop) {
  node.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || scope.inert) return;
    const st = {x: e.clientX, y: e.clientY}, r = node.getBoundingClientRect();
    let ghost = null, over = null;
    const mv = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - st.x, ev.clientY - st.y) < 6) return;
        ghost = node.cloneNode(true); ghost.classList.add('m-ghost'); ghost.style.width = r.width + 'px';
        document.body.append(ghost); node.classList.add('dragging');
      }
      ghost.style.left = (ev.clientX - (st.x - r.left)) + 'px'; ghost.style.top = (ev.clientY - (st.y - r.top)) + 'px';
      const z = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]');
      if (z !== over) { over?.classList.remove('drop-over'); over = z && scope.contains(z) ? z : null; over?.classList.add('drop-over'); }
    };
    const up = () => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (!ghost) return;
      ghost.remove(); node.classList.remove('dragging'); over?.classList.remove('drop-over');
      suppressClick(scope);
      if (over) drop(over);
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  });
}

function shuffled(list, seed) {
  const rand = seeded(seed), last = list.filter((o) => o.id === 'none' || o.keepLast), out = list.filter((o) => !last.includes(o));
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return [...out, ...last];
}
const batchim = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };

export function missionScreen(host, {el, button, state, record, save, back, api, id, onFinish, avatarView, nickname, uid, preview = false, quick = false}) {
  // 빠르게 문제만: 앞뒤 대사를 한 줄 상황으로 줄이고 의뢰 고르기 판으로 돌아간다. 과제, 채점, 기록, 도움은 이야기 길과 같다.
  const backLabel = quick ? '의뢰 고르기로' : '지도로 돌아가기';
  const situation = (lines) => (lines || []).find(([who]) => !/척척|알림|단말|방송/.test(who)) || (lines || [])[0];
  let alive = true, m = null, stopTask = () => {}, top = null, wu = null;
  state.missions ??= {};
  let ms = state.missions[id];
  if (!ms || ms.run !== state.runId) ms = state.missions[id] = {run: state.runId, done: {}, hints: {}, seen: false};
  ms.done ??= {}; ms.hints ??= {};
  const root = el('section', {class: 'mission'});
  root.dataset.game = id;
  root.dataset.region = /^R\d/.test(id) ? id.slice(0, 2) : ''; // 낱말 뜻 보기(glossary.mjs)가 지역 낱말을 고를 때 쓴다
  host.replaceChildren(root);
  root.append(el('p', {class: 'mission-loading'}, '의뢰 장소로 가는 중…'));
  // 설명 쓰기 문항(writeup)은 의뢰 원본과 따로 온다. 의뢰를 예전 판으로 이어 가는 학생도 같은 문항을 쓴다.
  Promise.all([api('mission?id=' + encodeURIComponent(id) + (ms.contentRevision?'&revision='+encodeURIComponent(ms.contentRevision):'')), api('writeup?id=' + encodeURIComponent(id)).catch(() => null)])
    .then(([data, w]) => { if (!alive) return; m = data; wu = w?.item ? w : null; ms.contentRevision=data.contentRevision; ms.gameVersion=data.version; save(); if (!ms.seen) intro(); else render(); })
    .catch(() => { if (alive) root.replaceChildren(el('p', {class: 'mission-loading'}, '의뢰를 불러오지 못했어요. 연결을 확인하고 다시 들어와 주세요.'), button(backLabel, leave)); });

  const openDex = (card) => window.dispatchEvent(new CustomEvent('open-dex', {detail: {card}}));
  function leave() { if (!alive) return; alive = false; stopTask(); window.removeEventListener('mission-leave', leave); save(); back(m?.zone || MISSIONS[id]?.zone); } // 의뢰를 불러오지 못했어도 그 의뢰의 구역으로 돌아간다
  window.addEventListener('mission-leave', leave);
  // 「확인하기」 줄이 화면 아래에 붙어 있으므로, 결과와 도움말이 나오면 그 자리가 보이게 내린다
  const reveal = (node) => { if (node?.isConnected && hasText(node)) node.scrollIntoView({block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); };
  const hasText = (node) => !!node.textContent.trim();
  const show = (node, msg, tone) => { node.className = 'm-feedback ' + (tone || ''); node.replaceChildren(...[].concat(msg)); reveal(node); };
  function line([who, text]) {
    const key = PORTRAIT[who];
    // 경고 상자 모양은 척척 같은 기계 알림에만 쓴다. 그림이 없는 사람(연구소장, 주민)은 이름 첫 글자 동그라미로 보인다.
    const machine = !key && /척척|알림|단말|방송/.test(who);
    return el('div', {class: 'm-line' + (key ? '' : machine ? ' system' : ' person')},
      key ? el('img', {src: `/assets/portraits/${key}.png`, alt: ''}) : el('span', {class: machine ? 'm-sys-icon' : 'm-person-icon', 'aria-hidden': 'true'}, machine ? '!' : String(who || '').slice(0, 1)),
      el('div', {class: 'm-line-body'}, el('strong', {}, who === '미스터리' ? '미스터리 선생님' : who), el('p', {}, text)));
  }
  // 필수 과제만 차례로 진행한다. 선택 과제(더 해보기)는 단계 목록과 마무리 화면에서 골라 들어간다.
  const current = () => m.tasks.findIndex((t) => !ms.done[t.id] && !(t.optional || t.required === false));
  const required = () => m.tasks.filter((t) => !(t.optional || t.required === false));
  const extras = () => m.tasks.filter((t) => t.optional || t.required === false);
  const stepNo = (t) => (t.optional ? '더 해보기' : `${required().indexOf(t) + 1} / ${required().length}단계`); // 전체 단계 수를 함께 보여 남은 양을 알게 한다
  // 실천표: log가 같은 기록 과제(quiz)의 day 문항이 날짜 칸, 나머지 문항이 줄이 된다. 칸에는 보기의 mark를 적는다.
  function logTable(t) {
    const src = m.tasks.find((x) => x.log === t.log && x.parts), day = src?.parts.find((q) => q.id === 'day'), log = ms.mem?.[t.log] || {};
    if (!day) return null;
    const rows = src.parts.filter((q) => q !== day), n = day.options.filter((d) => log[d.id]).length, marks = new Map();
    for (const q of rows) for (const o of q.options) if (o.mark && !marks.has(o.mark)) marks.set(o.mark, o.label);
    // 날짜 칸은 모두 같은 폭으로 둔다(공용 표 규칙의 셋째 칸 넓이를 덮는다). 아직 기록하지 않은 칸은 빗금으로 둔다.
    const cell = (s) => { const c = el('td', {class: s ? '' : 'blank'}, s); c.style.minWidth = '3em'; return c; };
    return el('div', {class: 'm-plan-table m-log'}, el('strong', {}, `실천표 (기록한 날 ${n}일)`),
      el('table', {}, el('tr', {}, el('th', {}, '실천'), day.options.map((d) => el('th', {}, d.label))),
        rows.map((q) => el('tr', {}, el('td', {}, q.short || q.prompt), day.options.map((d) => cell(q.options.find((o) => o.id === log[d.id]?.[q.id])?.mark || ''))))),
      el('p', {class: 'm-how'}, [...marks].map(([k, v]) => `${k} ${v}`).join(', ')));
  }

  // ---------------------------------------------------------------- 도입 장면
  function intro() {
    stopTask(); music('mission');
    const box = el('section', {class: 'mission-intro'});
    box.style.backgroundImage = `url("${m.banner}")`;
    const lines = el('div', {class: 'mission-intro-lines', 'aria-live': 'polite'});
    let i = 0;
    const next = button('다음', () => step(), 'mission-go');
    const said = quick ? [situation(m.intro)].filter(Boolean) : m.intro || [];
    function step() {
      if (i < said.length) { lines.append(line(said[i++])); next.textContent = i < said.length ? '다음' : '조사 시작'; if (!quick) holdButtons([next]); return; }
      ms.seen = true; save(); render();
    }
    box.append(el('div', {class: 'mission-intro-title'}, el('small', {}, m.quest), el('h1', {}, m.place), el('p', {}, '배울 내용: ' + m.goal)),
      lines, el('div', {class: 'mission-intro-actions'}, button(backLabel, leave, 'secondary'), next));
    root.replaceChildren(box);
    step();
    next.focus();
  }

  // ---------------------------------------------------------------- 머리말과 단계 목록
  // 머리말은 한 줄(장소, 진행 막대, 할 일 목록, 지도로 돌아가기)로 두고, 단계 목록은 「할 일 목록」을 누를 때만 펼친다.
  function header(i) {
    const req = required(), doneN = req.filter((t) => ms.done[t.id]).length;
    const node = el('header', {class: 'mission-top'});
    node.style.backgroundImage = `url("${m.banner}")`;
    const fill = el('span', {class: 'mission-meter-fill'});
    fill.style.width = (doneN / Math.max(1, req.length)) * 100 + '%';
    node.append(el('div', {class: 'mission-name'}, el('small', {}, m.quest), el('h1', {}, m.place)),
      el('div', {class: 'mission-meter', role: 'img', 'aria-label': `${req.length}단계 가운데 ${doneN}단계 완료`}, el('span', {class: 'mission-meter-bar'}, fill), el('b', {}, `${doneN} / ${req.length}`)),
      el('details', {class: 'mission-steps-pop'}, el('summary', {}, '할 일 목록'), stepList(i)),
      button('교과서 펼쳐 보기', () => openTextbook({el, button, api, mission: id}), 'secondary mission-book'),
      button('선생님 활동',()=>openTeaching({api,uid,gameId:id,runId:state.runId,edition:m.contentRevision,onTask:tid=>{const n=m.tasks.findIndex(t=>t.id===tid);if(n>=0)render(n);}})),
      button(backLabel, leave, 'mission-leave'));
    return node;
  }
  function stepList(i) {
    const cur = current();
    const item = (x, open) => {
      const k = m.tasks.indexOf(x), li = el('li', {class: [ms.done[x.id] && ms.done[x.id] !== 'skip' ? 'done' : '', k === i ? 'now' : ''].join(' ').trim()});
      li.append(open && k !== i ? button(x.title, () => render(k), 'm-step-link') : el('span', {}, x.title));
      if (k === i) li.setAttribute('aria-current', 'step');
      return li;
    };
    const ol = el('ol', {class: 'mission-steps'}, required().map((x) => item(x, preview || ms.done[x.id] || m.tasks.indexOf(x) === cur)));
    const more = extras();
    return el('div', {class: 'mission-steps-panel'}, ol,
      more.length ? el('h3', {class: 'mission-extra-head'}, '더 해보기 (선택)') : null,
      more.length ? el('ul', {class: 'mission-steps extra'}, more.map((x) => item(x, true))) : null);
  }
  function refreshChrome(i) {
    const t2 = header(i);
    top.replaceWith(t2); top = t2;
  }
  function render(idx) {
    stopTask();
    if(m.inquiry && !ms.completed && !ms.discovery?.complete){
      root.dataset.task='discovery';top=header(-1);
      const panel=el('article');root.replaceChildren(top,el('div',{class:'mission-main'},panel));
      stopTask=discovery(panel,{el,button,config:m.inquiry,ms,save,record,api,id,uid,runId:state.runId,version:m.version,revision:m.contentRevision,done:()=>render(),preview,writeup:wu});
      return;
    }
    const cur = current();
    // 새 조건 문제: 필수 과제를 마친 뒤 처음 한 번, 그리고 광장의 달새가 미뤄 둔 문제를 다시 권했을 때(T.again) 연다
    if (cur < 0 && idx === undefined) return m.transfer && ((!ms.completed && !ms.poe?.T?.done) || (ms.poe?.T?.again && !ms.poe.T.ok)) ? transferView() : finish();
    const i = idx ?? cur;
    root.dataset.task = m.tasks[i]?.id || '';
    const panel = el('article', {class: 'mission-task', 'aria-labelledby': 'mt-title'});
    panel.dataset.taskType = m.tasks[i]?.type || ''; // 낱말 뜻 보기: 초성 맞히기, 빈칸 채우기, 끝말잇기는 보기 낱말 줄을 두지 않는다
    if (m.tasks[i]?.glossHide?.length) panel.dataset.glossHide = m.tasks[i].glossHide.join('|'); // 뜻이 답을 알려 주는 낱말은 이 과제에서 잇지 않는다
    top = header(i);
    root.replaceChildren(top, el('div', {class: 'mission-main'}, panel));
    taskView(panel, m.tasks[i], i);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  // ---------------------------------------------------------------- 과제 한 단계
  function taskView(panel, t, i) {
    const stage = el('div', {class: 'm-stage'}), work = el('div', {class: 'm-work'});
    const fb = el('p', {class: 'm-feedback', role: 'status'}), hintBox = el('div', {class: 'm-hint', 'aria-live': 'polite'});
    const actions = el('div', {class: 'm-actions'});
    panel.append(el('div', {class: 'm-task-head'}, el('span', {class: 'm-task-no'}, stepNo(t)), el('h2', {id: 'mt-title'}, t.title)),
      learningSupport(el, t.support || {goal: m.goal, next: t.how}, {renderFigure: data => figure(el, data, 'circuit-fig big'), openBook: (start) => openTextbook({el, button, api, mission: id, start})}),
      el('div', {class: 'm-talk'}, (t.say || []).map(line)), t.note ? el('div', {class: 'm-note'}, t.note.split(String.fromCharCode(10)).map((x) => el('p', {}, x))) : '', stage, work, fb, hintBox, actions);
    let busy = false, misses = 0;
    const gradingEdition = t.answerRevision ? {answerRevision: t.answerRevision} : {};
    const hintUsed = () => Math.max(ms.hints[t.id] || 0, ms.initialHints?.[t.id] ? 1 : 0);
    let lastMissing = [];
    const initials = t.answerSupport ? answerHint({el, button, api, missing: () => lastMissing,
      payload: () => ({gameId: id, taskId: t.id, contentRevision: m.contentRevision, ...gradingEdition}),
      isActive: () => alive && stage.isConnected,
      onHint: () => {
        (ms.initialHints ??= {})[t.id] = true;
        record('mission.hint', 'mission', {gameId: id, gameVersion: m.version, contentRevision: m.contentRevision, taskId: t.id, answer: 'initials', hint: hintUsed(), ...gradingEdition});
        save();
      }}) : null;
    const wasDoneEarly = !!ms.done[t.id];
    const gateNote = el('p', {class: 'm-how gate-note'}, t.gateText || '먼저 위의 활동을 끝내면 이 칸을 쓸 수 있어요.');
    const ctx = {stage, work, fb, submit: (r) => submit(r)};
    if (t.figure) stage.append(el('div', {class: 'm-figure'}, figure(el, t.figure, 'circuit-fig big')));
    ms.mem ??= {};
    if (t.recall) {
      // 계획은 plan 과제(장소, 기간, 규칙) 또는 keepPlan을 둔 form 과제(lines)에서 저장된다. t.log가 있으면 날마다 남긴 실천표도 함께 보여 준다.
      const plan = state.missions?.[t.recall]?.plan;
      stage.append(el('div', {class: 'm-note recall'}, el('p', {}, el('strong', {}, '내가 세운 실천 계획')), plan ? (plan.lines ? plan.lines.map((s) => el('p', {}, s)) : [el('p', {}, `장소: ${plan.placeLabel || ''}, 기간: ${plan.periodLabel || ''}`), el('p', {}, '규칙: ' + (plan.labels || []).join(', ') + (plan.custom ? ', ' + plan.custom : ''))]) : el('p', {}, t.recallEmpty || '아직 세운 계획이 없어요. 2026 우리 집 하루에서 계획을 세우면 여기에 나와요.'), t.log ? logTable(t) : null));
    }
    if (t.memo) {
      const src = m.tasks.find((x) => x.remember === t.memo), got = ms.mem[t.memo];
      const lines = src && got ? (src.parts || []).map((q) => `${q.prompt} ${q.options.find((o) => o.id === got[q.id])?.label || ''}`) : [];
      // 처음 생각을 남긴 과제(진단, 「생각」 과제)는 「처음 내 생각」, 예상 과제는 「내가 한 예상」. 남긴 것이 없으면(선택 과제를 하지 않음) 상자를 두지 않는다.
      const head = src?.diagnostic || /생각/.test(src?.title || '') ? '처음 내 생각' : '내가 한 예상';
      if (lines.length) stage.append(el('div', {class: 'm-note recall'}, el('p', {}, el('strong', {}, head)), lines.map((s) => el('p', {}, s))));
    }
    const ui = UI[t.type](t, ctx);
    if (!t.component) requestAnimationFrame(() => ui.mounted?.());
    let dev = null;
    if (t.component && COMPONENTS[t.component]) {
      // save: 장면이 중간 진행(memory)을 바로 저장하고 싶을 때 부른다. 쓰지 않는 장면은 무시한다.
      dev = COMPONENTS[t.component]({el, button, mode: t.mode, memory: ms.mem, others: state.missions, save, avatarView, nickname, task: t, mission: m, owner: ['fix', 'receive'].includes(t.mode) ? '신항이의 신호기' : '내 신호기',
        // 저장된 장면은 생성 중 바로 결과를 알릴 수 있다. 단추와 안내가 준비된 뒤 처리한다.
        onAction: (a) => queueMicrotask(() => { if (alive && stage.isConnected) submit({answer: a}); }),
        onReady: () => queueMicrotask(() => { if (!alive || !stage.isConnected) return; ui.unlock?.(); if (!ms.done[t.id] && !ui.lock) { work.inert = false; work.classList.remove('gated'); gateNote.remove(); } }),
        onPattern: (p) => ui.pattern?.(p)});
      stage.append(dev.node);
      ui.mounted?.(dev);
    }
    if (t.predict) predictGate(t, stage, [dev?.node, work].filter(Boolean), wasDoneEarly);
    stopTask = () => { dev?.stop(); ui.stop?.(); initials?.dispose(); };
    if (t.gate && ui.lock) ui.lock(true, t.gateText || '먼저 위의 장면에서 활동을 끝내 주세요.');
    else if (t.gate && !wasDoneEarly) { work.inert = true; work.classList.add('gated'); work.before(gateNote); }
    const check = button('확인하기', () => { const r = ui.collect(); if (typeof r === 'string') return show(fb, r, 'warn'); submit(r); }, 'mission-go');
    // 실험 장면(action) 과제는 「확인하기」가 없고 장면이 결과를 한 번만 보낸다. 보내지 못한 결과는 의뢰 기록(ms.pend)에 남겨
    // 「다시 보내기」로 다시 보내고, 나갔다가 다시 들어오면 저절로 다시 보낸다(연결이 한 번 끊겨도 그 단계에서 막히지 않게).
    const retryBtn = button('다시 보내기', () => { const p = ms.pend?.[t.id]; if (p) submit(p); }, 'mission-go');
    retryBtn.hidden = true;
    const helpBtn = button('', () => help(), 'secondary m-help');
    const last = i === m.tasks.length - 1;
    const nextBtn = button(last ? '의뢰 마무리하기' : '다음 단계로', () => render(), 'mission-go');
    const wasDone = !!ms.done[t.id];
    check.hidden = !!ui.auto;
    nextBtn.hidden = !wasDone;
    if (wasDone) { nextBtn.textContent = current() < 0 ? '의뢰 마무리 보기' : '지금 할 단계로'; show(fb, '이미 끝낸 단계예요. 다시 해 봐도 기록은 그대로 남아요.', 'ok'); if (t.predict) poeCompare(t, fb); }
    // 선택 과제는 풀지 않고 할 일로 돌아갈 수 있다. 둘러보기(체험 계정)는 풀지 않고 다음 과제를 볼 수 있다.
    const skipBtn = t.optional && !wasDone ? button(current() < 0 ? '마무리 화면으로' : '할 일로 돌아가기', () => render(), 'secondary') : '';
    const peekBtn = preview ? button(i < m.tasks.length - 1 ? '다음 과제 보기' : '마무리 화면 보기', () => (i < m.tasks.length - 1 ? render(i + 1) : finish()), 'secondary m-peek') : '';
    if (initials) work.after(initials.node);
    actions.append(t.hints?.length ? helpBtn : '', skipBtn, peekBtn, check, retryBtn, nextBtn);
    if (ui.auto && !wasDone && ms.pend?.[t.id]) { show(fb, '지난번에 보내지 못한 결과가 있어요. 다시 보내고 있어요.', 'warn'); setTimeout(() => { if (alive && stage.isConnected && !busy && ms.pend?.[t.id]) submit(ms.pend[t.id]); }, 0); }
    function paintHelp() { const n = ms.hints[t.id] || 0; helpBtn.textContent = n >= 3 ? '도움 다시 보기' : `도움 받기 (${n}/3)`; }
    function showHints() {
      const n = ms.hints[t.id] || 0;
      hintBox.replaceChildren();
      if (!n) return;
      const k = t.helper || 'comji';
      hintBox.append(el('img', {src: `/assets/portraits/${k}.png`, alt: ''}), el('div', {}, el('strong', {}, HELPER[k] + '의 도움'), el('ol', {}, t.hints.slice(0, n).map((h) => el('li', {}, h)))));
      reveal(hintBox);
    }
    function help() { sfx('hint'); helpBtn.classList.remove('m-help-pulse');
      const n = ms.hints[t.id] || 0;
      if (n < 3 && t.hints?.[n]) { ms.hints[t.id] = n + 1; record('mission.hint', 'mission', {gameId: id, gameVersion:m.version, contentRevision:m.contentRevision, taskId: t.id, answer: 'help', hint: n + 1}); save(); }
      showHints(); paintHelp();
    }
    paintHelp(); showHints();
    async function submit({answer = '', roles = {}}) {
      if (busy) return;
      busy = true; check.disabled = true;
      if (ui.auto) { (ms.pend ??= {})[t.id] = {answer, roles}; retryBtn.hidden = true; }
      let res;
      try { res = await api('mission-check', {gameId: id, gameVersion:m.version, contentRevision:m.contentRevision, taskId: t.id, answer, roles, ...gradingEdition}); }
      catch (e) {
        busy = false; check.disabled = false;
        if (ui.auto && e.status !== 400) { save(); retryBtn.hidden = false; return show(fb, '결과를 보내지 못했어요. 연결을 확인하고 「다시 보내기」를 눌러 주세요.', 'warn'); }
        if (ui.auto) delete ms.pend[t.id];
        return show(fb, e.status === 400 ? e.message : '연결을 확인하고 다시 눌러 주세요.', 'warn');
      }
      // 응답을 기다리는 사이 다른 장소나 과제로 갔다면 대기 결과를 남겨 재진입 때 기록한다.
      if (!alive || !stage.isConnected) return;
      if (ms.pend?.[t.id]) delete ms.pend[t.id];
      record('mission.answered', 'mission', {gameId: id, gameVersion:m.version, contentRevision:m.contentRevision, taskId: t.id, answer, roles, hint: hintUsed(), ...gradingEdition});
      busy = false; check.disabled = false;
      const ok = res.correct !== false;
      lastMissing = res.answerCheck?.missing || []; initials?.mark();
      ui.mark?.(res.wrong || [], ok);
      sfx(ok ? 'ok' : 'wrong');
      if (!ok) {
        // 두 번 틀리면 「도움 받기」 단추를 눈에 띄게 한다
        misses++;
        const extra = ui.wrongText?.(res.wrong || [], {answer, roles}), moreHelp = (ms.hints[t.id] || 0) < 3 && t.hints?.length;
        if (misses >= 2 && moreHelp) helpBtn.classList.add('m-help-pulse');
        if (misses >= 2) initials?.offer();
        // 장면별 안내(빨간 표시 수 등)와 과제의 다시 볼 곳(feedback.wrong)을 함께 보여 준다
        return show(fb, [res.answerFeedback || [extra, t.feedback?.wrong].filter(Boolean).join(' ') || '다시 살펴봐요.', initials ? ' 「초성 힌트」에서 필요한 낱말을 떠올려 보세요.' : moreHelp ? (misses >= 2 ? ' 「도움 받기」를 눌러 실마리를 확인해 보세요.' : ' 막히면 도움을 받아 보세요.') : ''].join(''), 'bad');
      }
      ms.done[t.id] = true;
      if (t.remember) ms.mem[t.remember] = roles;
      if (t.log && roles.day) { (ms.mem[t.log] ??= {})[roles.day] = roles; stage.querySelector('.m-log')?.replaceWith(logTable(t)); }
      ui.saved?.({answer, roles});
      save();
      show(fb, res.correct === true ? res.answerFeedback || t.feedback?.right || '맞아요.' : t.feedback?.done || '기록했어요.', 'ok');
      panel.querySelector('.m-explain')?.remove(); panel.querySelector('.m-dex')?.remove();
      if (res.explain) { const ex = el('div', {class: 'm-explain'}, el('strong', {}, '해설'), el('p', {}, res.explain)); fb.after(ex); reveal(ex); }
      // 이 과제로 열리는 과학 도감 카드(처음 맞혔을 때만 알린다)
      if (res.cards?.length && !wasDone) {
        const strip = dexStrip(el, button, res.cards, '도감 카드를 얻었어요', openDex);
        (panel.querySelector('.m-explain') || fb).after(strip); reveal(strip);
        window.dispatchEvent(new CustomEvent('dex-got', {detail: {ids: res.cards.map((c) => c.id)}}));
      }
      if (t.predict) poeCompare(t, fb);
      check.hidden = true; nextBtn.hidden = false; if (skipBtn) skipBtn.hidden = true;
      if (current() < 0) nextBtn.textContent = '의뢰 마무리하기';
      work.inert = true;
      refreshChrome(i);
      nextBtn.focus({preventScroll: true});
    }
  }

  // ---------------------------------------------------------------- 예상하고 관찰하고 설명하기
  // predict: 실험 장면 앞에서 한 번 눌러 예상을 남기고(「잘 모르겠어요」도 된다), 결과가 나오면 내 예상과 관찰을 나란히 보여 준 뒤
  // 해설로 이어 간다. 예상이 달라도 감점이나 잠금은 없다. 실제 결과(key)와 관찰 문장(observed)은 결과가 나온 뒤 서버에서 받는다.
  const poeOptions = (t) => [...t.predict.options, ...(t.predict.options.some((o) => o.id === 'unsure') ? [] : [{id: 'unsure', label: '잘 모르겠어요'}])];
  const poeLabel = (t, pid) => poeOptions(t).find((o) => o.id === pid)?.label || '';
  const poePayload = (extra) => ({gameId: id, gameVersion: m.version, contentRevision: m.contentRevision, ...extra});
  function predictGate(t, stage, targets, done) {
    const poe = ms.poe ??= {}, mine = poe[t.id];
    const recall = (pid) => el('p', {class: 'm-predict-recall'}, el('strong', {}, '내 예상'), ' ' + poeLabel(t, pid));
    if (mine?.p) { stage.prepend(recall(mine.p)); return; }
    if (done) return;
    const box = el('section', {class: 'm-predict', 'aria-label': '먼저 예상하기'}, el('strong', {}, '먼저 예상해요'), el('p', {}, t.predict.question));
    // 흐리게 잠긴 장면이 왜 잠겼는지 알려 준다(예상을 고르면 열린다). 예상은 맞고 틀림을 따지지 않는다.
    const opensNote = el('p', {class: 'm-predict-note'}, '예상을 하나 고르면 아래 장면이 열려요. 예상은 틀려도 괜찮아요.');
    const row = el('div', {class: 'm-options', role: 'group', 'aria-label': t.predict.question});
    // 보기는 회차마다 섞고, 첫 보기에 초점 테두리가 생기지 않게 상자에 초점을 둔다(정답 쪽으로 눈이 가지 않게)
    const opts = [...shuffled(t.predict.options, state.runId + id + t.id), ...poeOptions(t).filter((o) => !t.predict.options.includes(o))];
    for (const o of opts) row.append(button(o.label, () => choose(o.id), 'm-option'));
    box.append(row, opensNote); box.tabIndex = -1;
    for (const x of targets) { x.inert = true; x.classList.add('poe-wait'); }
    stage.prepend(box);
    requestAnimationFrame(() => box.focus({preventScroll: true}));
    function choose(pid) {
      poe[t.id] = {p: pid}; save();
      if (!preview) record('mission.predicted', 'mission', poePayload({taskId: t.id, answer: pid}));
      // 과제 자체의 잠금(gated)은 그대로 둔다. 장면 활동을 끝내야 풀린다.
      for (const x of targets) { x.inert = x.classList.contains('gated'); x.classList.remove('poe-wait'); }
      box.replaceWith(recall(pid));
    }
  }
  async function poeCompare(t, fb) {
    const mine = ms.poe?.[t.id];
    if (!mine?.p) return;
    let r = mine.res;
    if (!r) {
      try { r = await api('poe-check', {kind: 'mission.predicted', payload: poePayload({taskId: t.id, answer: mine.p, runId: state.runId})}); } catch { return; }
      mine.res = r = {matched: r.matched, observed: r.observed || r.actualLabel || ''}; save();
    }
    if (!alive || !fb.isConnected) return;
    fb.parentNode.querySelector('.m-compare')?.remove();
    const nextAt = t.predict.next ? m.tasks.findIndex((x) => x.id === t.predict.next) : -1;
    const card = el('section', {class: 'm-compare' + (r.matched === false ? ' differ' : r.matched === true ? ' same' : '')},
      el('strong', {}, r.matched === true ? '예상과 같았어요' : r.matched === false ? '예상과 달랐어요' : '결과를 확인했어요'),
      el('p', {}, el('b', {}, '내 예상'), ' ' + poeLabel(t, mine.p)),
      el('p', {}, el('b', {}, '관찰한 결과'), ' ' + r.observed),
      el('p', {class: 'm-compare-ask'}, r.matched === false ? '어디에서 달라졌는지 장면과 해설을 견주어 보세요.' : '왜 그렇게 되는지 해설로 확인해 보세요.' + (nextAt >= 0 ? ' 다른 조건에서도 그럴지 확인해 볼 수 있어요.' : '')));
    if (nextAt >= 0 && !ms.done[t.predict.next]) card.append(button('다른 조건으로 확인하기', () => render(nextAt), 'secondary'));
    const ask = el('div', {class: 'm-reflect', role: 'group', 'aria-label': '다시 보니 내 생각은'}, el('span', {}, '다시 보니 내 생각은'));
    for (const [v, label] of Object.entries(REFLECT)) {
      const b = button(label, () => { mine.r = v; save(); if (!preview) record('mission.reflected', 'mission', poePayload({taskId: t.id, answer: v})); ask.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }, 'm-option');
      b.setAttribute('aria-pressed', String(mine.r === v)); ask.append(b);
    }
    card.append(ask);
    fb.after(card);
  }
  // transfer: 필수 단계를 마친 뒤 마무리 화면 앞에서 조건이 달라진 상황에 적용해 본다. 틀려도 다시 고를 수 있고, 「나중에 다시 해 볼게요」로 마무리할 수 있다.
  function transferView() {
    stopTask();
    const tr = m.transfer, T = (ms.poe ??= {}).T ??= {};
    if (T.again) { delete T.again; save(); }
    root.dataset.task = 'transfer';
    top = header(-1);
    const panel = el('article', {class: 'mission-task m-transfer', 'aria-labelledby': 'mt-title'});
    if (tr.glossHide?.length) panel.dataset.glossHide = tr.glossHide.join('|'); // 낱말 뜻 보기에서 감출 낱말(과제의 glossHide와 같다)
    root.replaceChildren(top, el('div', {class: 'mission-main'}, panel));
    const fb = el('p', {class: 'm-feedback', role: 'status'}), hintBox = el('div', {class: 'm-hint', 'aria-live': 'polite'});
    let pick = null, busy = false, misses = 0;
    const opts = shuffled(tr.options, state.runId + id + 'transfer');
    const btns = opts.map((o) => radio(o.label, () => { pick = o.id; btns.forEach((x, k) => { x.setAttribute('aria-checked', String(opts[k].id === o.id)); x.classList.remove('recheck'); }); }));
    const close = () => { T.done = true; save(); render(); };
    const check = button('확인하기', () => submitTransfer(), 'mission-go');
    const done = button('의뢰 마무리하기', close, 'mission-go');
    const later = button('나중에 다시 해 볼게요', () => { if (!T.ok && !preview) record('mission.transfer', 'mission', poePayload({answer: 'skip'})); close(); }, 'secondary');
    const helpBtn = tr.hints?.length ? button('', () => { T.h = Math.min((T.h || 0) + 1, tr.hints.length); helpBtn.classList.remove('m-help-pulse'); save(); paintHints(); }, 'secondary m-help') : '';
    done.hidden = !T.ok; check.hidden = !!T.ok; later.hidden = !!T.ok;
    panel.append(el('div', {class: 'm-task-head'}, el('span', {class: 'm-task-no'}, '새 조건'), el('h2', {id: 'mt-title'}, tr.title || '다른 곳에서도 통할까요?')),
      el('div', {class: 'm-talk'}, (tr.say || []).map(line)), tr.situation ? el('div', {class: 'm-note'}, el('p', {}, tr.situation)) : '',
      el('div', {class: 'm-work'}, el('p', {class: 'm-how'}, tr.question), el('div', {class: 'm-options', role: 'radiogroup', 'aria-label': tr.question}, btns)),
      fb, hintBox, el('div', {class: 'm-actions'}, helpBtn, later, check, done));
    function paintHints() {
      if (!helpBtn) return;
      const n = T.h || 0, k = tr.helper || 'comji';
      helpBtn.textContent = n >= tr.hints.length ? '도움 다시 보기' : `도움 받기 (${n}/${tr.hints.length})`;
      hintBox.replaceChildren(...(n ? [el('img', {src: `/assets/portraits/${k}.png`, alt: ''}), el('div', {}, el('strong', {}, HELPER[k] + '의 도움'), el('ol', {}, tr.hints.slice(0, n).map((h) => el('li', {}, h))))] : []));
    }
    async function submitTransfer() {
      if (busy) return;
      if (!pick) return show(fb, '보기를 하나 골라 주세요.', 'warn');
      busy = true; check.disabled = true;
      let r;
      try { r = await api('poe-check', {kind: 'mission.transfer', payload: poePayload({answer: pick, runId: state.runId})}); }
      catch (e) { busy = false; check.disabled = false; return show(fb, e.status === 400 ? e.message : '연결을 확인하고 다시 눌러 주세요.', 'warn'); }
      busy = false; check.disabled = false;
      if (!alive) return;
      if (!preview) record('mission.transfer', 'mission', poePayload({answer: pick}));
      sfx(r.correct ? 'ok' : 'wrong');
      if (!r.correct) {
        misses++; btns[opts.findIndex((o) => o.id === pick)]?.classList.add('recheck');
        if (misses >= 2 && helpBtn && (T.h || 0) < tr.hints.length) helpBtn.classList.add('m-help-pulse');
        return show(fb, r.feedback || '앞에서 관찰한 결과와 이 상황에서 달라진 조건을 비교해 다시 골라 보세요.', 'bad');
      }
      T.ok = true; save();
      show(fb, r.feedback || '맞아요.', 'ok');
      check.hidden = true; later.hidden = true; done.hidden = false; done.focus({preventScroll: true});
    }
    paintHints();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  // 마무리 화면: 처음 예상과 결과, 돌아본 생각, 새 조건 문제를 한곳에 모은다
  function poeSummary() {
    const rows = m.tasks.filter((t) => t.predict && ms.poe?.[t.id]?.p).map((t) => {
      const x = ms.poe[t.id];
      return el('li', {}, `${t.title}: 처음 예상 「${poeLabel(t, x.p)}」` + (x.res?.matched === true ? ', 예상과 같았어요' : x.res?.matched === false ? ', 예상과 달랐어요' : '') + (x.r ? `, ${REFLECT[x.r]}` : ''));
    });
    if (!rows.length && !m.transfer) return null;
    return el('div', {class: 'mission-poe'}, el('small', {}, '내 생각의 변화'), rows.length ? el('ul', {}, rows) : '',
      m.transfer ? el('p', {}, ms.poe?.T?.ok ? '새 조건 문제를 해결했어요.' : '새 조건 문제는 언제든 다시 해 볼 수 있어요.') : '');
  }

  // ---------------------------------------------------------------- 과제 형식
  const radio = (label, on, cls = 'm-option') => { const b = button(label, on, cls); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); return b; };
  const withImg = (b, o) => { if (o.img) { b.classList.add('pic'); b.prepend(el('img', {src: o.img, alt: ''})); } else if (o.figure) { b.classList.add('pic', 'fig'); b.prepend(figure(el, o.figure, 'circuit-fig opt')); } return b; };
  const UI = {
    choice(t, {work}) {
      let pick = null;
      const note = el('p', {class: 'm-how'});
      const opts = shuffled(t.options, state.runId + t.id);
      const btns = opts.map((o) => withImg(radio(o.label, () => { pick = o.id; btns.forEach((x) => { x.setAttribute('aria-checked', String(x === b(o))); x.classList.remove('recheck'); }); }), o));
      const b = (o) => btns[opts.indexOf(o)];
      work.append(note, el('div', {class: 'm-options', role: 'radiogroup', 'aria-label': t.title}, btns));
      note.hidden = true;
      return {
        collect: () => (pick ? {answer: pick} : '보기를 하나 골라 주세요.'),
        lock: (v, why) => { btns.forEach((x) => (x.disabled = v)); note.hidden = !v; note.textContent = why || ''; },
        unlock() { this.lock(false); },
        mark: (w, ok) => { if (!ok) btns[opts.findIndex((o) => o.id === pick)]?.classList.add('recheck'); },
      };
    },
    multi(t, {work}) {
      const on = new Set(), opts = shuffled(t.options, state.runId + t.id);
      const btns = opts.map((o) => {
        const x = button(o.label, () => {
          if (on.has(o.id)) on.delete(o.id); else { if (o.id === 'none') on.clear(); else on.delete('none'); on.add(o.id); }
          btns.forEach((y, k) => y.setAttribute('aria-pressed', String(on.has(opts[k].id))));
        }, 'm-option');
        x.setAttribute('aria-pressed', 'false');
        return withImg(x, o);
      });
      work.append(el('p', {class: 'm-how'}, '해당하는 것을 모두 누르세요.'), el('div', {class: 'm-options'}, btns));
      // 덜 골랐는지, 아닌 것을 함께 골랐는지 알려 준다(어느 보기인지는 알려 주지 않는다)
      const gap = (w) => (w.includes('extra') ? '고른 것 가운데 빼야 할 것이 섞여 있어요. 고른 보기를 하나씩 다시 따져 봐요.' : w.includes('more') ? '고른 것은 맞았는데, 맞는 것을 더 골라야 해요. 고르지 않은 보기도 다시 살펴봐요.' : '');
      return {collect: () => (on.size ? {answer: [...on].join(',')} : '하나 이상 골라 주세요.'), wrongText: gap};
    },
    quiz(t, {work}) {
      const picks = {}, groups = {};
      // 문항마다 같은 보기(예: 효율, 안전, 둘 다)를 쓰면 섞는 순서도 같게 해 같은 보기를 문항마다 새로 찾지 않게 한다
      const same = t.parts.length > 1 && t.parts.every((q) => q.options.map((o) => o.label).sort().join('|') === t.parts[0].options.map((o) => o.label).sort().join('|'));
      const order = same ? shuffled(t.parts[0].options, state.runId + t.id).map((o) => o.label) : null;
      for (const q of t.parts) {
        const qo = same ? order.map((label) => q.options.find((o) => o.label === label)) : shuffled(q.options, state.runId + t.id + q.id);
        const btns = qo.map((o) => radio(o.label, () => { picks[q.id] = o.id; btns.forEach((x, k) => x.setAttribute('aria-checked', String(qo[k].id === o.id))); groups[q.id].classList.remove('recheck'); }));
        groups[q.id] = el('fieldset', {class: 'm-quiz' + (q.figure ? ' with-fig' : '')}, el('legend', {}, q.prompt), figure(el, q.figure), el('div', {class: 'm-options', role: 'radiogroup', 'aria-label': q.prompt}, btns));
        work.append(groups[q.id]);
      }
      return {
        collect: () => {
          const empty = t.parts.filter((q) => !picks[q.id]);
          if (!empty.length) return {roles: {...picks}};
          // 아직 고르지 않은 문항에 테두리를 두르고 첫 문항으로 옮겨 준다
          for (const q of empty) groups[q.id].classList.add('recheck');
          groups[empty[0].id].scrollIntoView({block: 'center', behavior: 'smooth'});
          return `아직 고르지 않은 문항이 ${empty.length}개 있어요. 테두리가 생긴 문항을 골라 주세요.`;
        },
        mark: (w) => { for (const k of w) groups[k]?.classList.add('recheck'); },
      };
    },
    sort(t, ctx) {
      if (t.view === 'match') return UI.match(t, ctx);
      const {work} = ctx;
      const where = {};
      let sel = null, wrong = [];
      const box = el('div', {class: 'm-sort'});
      const place = (cid, bin) => { if (bin) where[cid] = bin; else delete where[cid]; wrong = wrong.filter((w) => w !== cid); sel = null; paint(cid); };
      function paint(focusId) {
        const chip = (it) => {
          const x = button(it.figure ? '' : it.label, () => { sel = sel === it.id ? null : it.id; paint(it.id); }, 'm-chip' + (it.figure ? ' fig' : '') + (sel === it.id ? ' sel' : '') + (wrong.includes(it.id) ? ' recheck' : ''));
          if (it.figure) { x.append(figure(el, it.figure, 'circuit-fig chip'), el('span', {}, it.label)); x.setAttribute('aria-label', it.label); }
          x.setAttribute('aria-pressed', String(sel === it.id)); x.dataset.id = it.id;
          dragSource(x, work, (zone) => place(it.id, zone.dataset.drop || null));
          return x;
        };
        const pool = t.items.filter((it) => !where[it.id]);
        const bins = t.bins.map((bn) => {
          const put = button(sel ? '여기에 놓기' : '카드를 끌어 오거나 먼저 고르세요', () => { if (sel) place(sel, bn.id); }, 'm-put');
          put.disabled = !sel;
          return el('div', {class: 'm-bin', 'data-drop': bn.id}, el('h3', {}, bn.label), el('div', {class: 'm-bin-cards'}, t.items.filter((it) => where[it.id] === bn.id).map(chip)), put);
        });
        box.replaceChildren(el('div', {class: 'm-pool', 'data-drop': '', 'aria-label': '아직 나누지 않은 카드'}, pool.length ? pool.map(chip) : el('span', {class: 'm-empty'}, '카드를 모두 나눴어요.')), el('div', {class: 'm-bins'}, bins));
        if (focusId) box.querySelector(`[data-id="${focusId}"]`)?.focus({preventScroll: true});
      }
      paint();
      work.append(el('p', {class: 'm-how'}, '카드를 끌어서 알맞은 칸에 놓으세요. 카드를 누른 뒤 「여기에 놓기」를 눌러도 되고, 놓은 카드도 다시 옮길 수 있어요.'), box);
      return {
        collect: () => (Object.keys(where).length === t.items.length ? {roles: {...where}} : '모든 카드를 나눠 주세요.'),
        mark: (w) => { wrong = w; paint(); },
      };
    },
    // 선 잇기: 왼쪽 카드와 오른쪽 카드를 하나씩 짝지어 선으로 잇는다(채점은 분류와 같다)
    match(t, {work}) {
      const left = shuffled(t.items, state.runId + t.id + 'L'), right = shuffled(t.bins, state.runId + t.id + 'R');
      const pairs = {};
      let sel = null, wrong = [], temp = null;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'm-match-lines'); svg.setAttribute('aria-hidden', 'true');
      const leftCol = el('div', {class: 'm-match-col left'}), rightCol = el('div', {class: 'm-match-col right'});
      const wrap = el('div', {class: 'm-match'}, leftCol, svg, rightCol);
      const COLORS = ['#2f6fd6', '#e0763a', '#3aa04b', '#9a5bd6', '#d6455a', '#1f9aa5', '#b8861c', '#5a6b7a'];
      const link = (lid, rid) => { for (const k of Object.keys(pairs)) if (pairs[k] === rid) delete pairs[k]; pairs[lid] = rid; wrong = wrong.filter((w) => w !== lid); sel = null; paint(); };
      function center(node, side) { const r = node.getBoundingClientRect(), b = wrap.getBoundingClientRect(); return {x: (side === 'r' ? r.right : r.left) - b.left, y: r.top + r.height / 2 - b.top}; }
      function lines() {
        const b = wrap.getBoundingClientRect(); svg.setAttribute('width', b.width); svg.setAttribute('height', b.height); svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
        svg.replaceChildren();
        left.forEach((it, k) => {
          const rid = pairs[it.id]; if (!rid) return;
          const a = center(leftCol.querySelector(`[data-id="${it.id}"]`), 'r'), c = center(rightCol.querySelector(`[data-id="${rid}"]`), 'l');
          const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', c.x); ln.setAttribute('y2', c.y);
          ln.setAttribute('stroke', wrong.includes(it.id) ? '#c8341f' : COLORS[k % COLORS.length]); ln.setAttribute('stroke-width', '4'); ln.setAttribute('stroke-linecap', 'round');
          if (wrong.includes(it.id)) ln.setAttribute('stroke-dasharray', '8 6');
          svg.append(ln);
        });
        if (temp) { const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); ln.setAttribute('x1', temp.x1); ln.setAttribute('y1', temp.y1); ln.setAttribute('x2', temp.x2); ln.setAttribute('y2', temp.y2); ln.setAttribute('stroke', '#7a8a99'); ln.setAttribute('stroke-width', '3'); ln.setAttribute('stroke-dasharray', '6 5'); svg.append(ln); }
      }
      function paint() {
        leftCol.replaceChildren(...left.map((it, k) => {
          const done = pairs[it.id];
          const b = button('', () => { sel = sel === it.id ? null : it.id; paint(); }, 'm-match-item' + (sel === it.id ? ' sel' : '') + (done ? ' done' : '') + (wrong.includes(it.id) ? ' recheck' : ''));
          b.append(el('span', {}, it.label), el('i', {class: 'm-dot'})); b.dataset.id = it.id;
          if (done) b.style.setProperty('--pair', COLORS[k % COLORS.length]);
          b.setAttribute('aria-pressed', String(sel === it.id)); b.setAttribute('aria-label', it.label + (done ? `, ${right.find((x) => x.id === done).label}와 이음` : ''));
          // 왼쪽 카드에서 끌어 오른쪽 카드에 놓아도 잇는다
          b.addEventListener('pointerdown', (e) => {
            if (e.button > 0 || work.inert) return;
            const st = {x: e.clientX, y: e.clientY}; let moving = false;
            const mv = (ev) => { if (!moving && Math.hypot(ev.clientX - st.x, ev.clientY - st.y) < 6) return; moving = true; const a = center(b, 'r'), w = wrap.getBoundingClientRect(); temp = {x1: a.x, y1: a.y, x2: ev.clientX - w.left, y2: ev.clientY - w.top}; lines(); };
            const up = (ev) => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (!moving) return; temp = null; suppressClick(work); const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.m-match-item[data-rid]'); if (hit) link(it.id, hit.dataset.rid); else lines(); };
            window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
          });
          return b;
        }));
        rightCol.replaceChildren(...right.map((bn) => {
          const used = Object.keys(pairs).find((k) => pairs[k] === bn.id);
          const b = button('', () => { if (sel) link(sel, bn.id); }, 'm-match-item' + (used ? ' done' : '') + (sel ? ' ready' : ''));
          b.append(el('i', {class: 'm-dot'}), el('span', {}, bn.label)); b.dataset.id = bn.id; b.dataset.rid = bn.id;
          if (used) b.style.setProperty('--pair', COLORS[left.findIndex((x) => x.id === used) % COLORS.length]);
          return b;
        }));
        requestAnimationFrame(lines);
      }
      const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => lines()) : null;
      ro?.observe(wrap);
      paint();
      work.append(el('p', {class: 'm-how'}, '왼쪽 카드를 끌어 알맞은 오른쪽 카드에 놓거나, 왼쪽 카드를 누른 뒤 오른쪽 카드를 눌러 선으로 이으세요. 다시 이으면 선이 바뀌어요.'), wrap);
      return {
        collect: () => (t.items.every((it) => pairs[it.id]) ? {roles: {...pairs}} : '왼쪽 카드를 모두 이어 주세요.'),
        mark: (w) => { wrong = w; paint(); },
        stop: () => ro?.disconnect(),
      };
    },
    order(t, {work}) {
      let list = t.cards.map((x) => x.id), wrong = [];
      const ol = el('ol', {class: 'm-order'});
      // 옮긴 카드의 같은 방향 단추에 초점을 둔다(끝에 닿아 그 단추가 꺼졌으면 남은 단추에). focus()는 값을 돌려주지 않으므로 고를 단추를 먼저 정한다.
      function move(k, d) { [list[k], list[k + d]] = [list[k + d], list[k]]; wrong = []; paint(); const row = ol.children[k + d]; (row?.querySelector(d < 0 ? '.up:not(:disabled)' : '.down:not(:disabled)') || row?.querySelector('button:not(:disabled)'))?.focus(); }
      function paint() {
        ol.replaceChildren(...list.map((cid, k) => {
          const card = t.cards.find((x) => x.id === cid);
          const up = button('▲', () => move(k, -1), 'm-move up'), dn = button('▼', () => move(k, 1), 'm-move down');
          up.disabled = k === 0; dn.disabled = k === list.length - 1;
          up.setAttribute('aria-label', `${k + 1}번 카드를 위로`); dn.setAttribute('aria-label', `${k + 1}번 카드를 아래로`);
          const li = el('li', {class: wrong.includes(String(k)) ? 'recheck' : ''}, el('span', {class: 'm-grip', 'aria-hidden': 'true'}, '⠿'), el('span', {class: 'm-order-no'}, String(k + 1)), el('span', {class: 'm-order-text'}, card.label), el('span', {class: 'm-order-move'}, up, dn));
          // 카드를 위아래로 끌어 순서를 바꾼다(화살표 단추도 그대로 쓴다)
          li.addEventListener('pointerdown', (e) => {
            if (e.button > 0 || e.target.closest('button') || work.inert) return;
            const st = e.clientY; let moving = false, target = k;
            li.setPointerCapture?.(e.pointerId);
            const mv = (ev) => {
              if (!moving && Math.abs(ev.clientY - st) < 6) return;
              moving = true; li.classList.add('dragging'); li.style.transform = `translateY(${ev.clientY - st}px)`;
              const rows = [...ol.children]; target = rows.findIndex((r) => { const b = r.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; }); if (target < 0) target = rows.length;
              rows.forEach((r, j) => r.classList.toggle('drop-over', (j === target || (target === rows.length && j === rows.length - 1)) && j !== k));
            };
            const up = () => { li.removeEventListener('pointermove', mv); li.removeEventListener('pointerup', up); li.removeEventListener('pointercancel', up); if (!moving) return; suppressClick(work); const [it] = list.splice(k, 1); list.splice(target > k ? target - 1 : target, 0, it); wrong = []; paint(); };
            li.addEventListener('pointermove', mv); li.addEventListener('pointerup', up); li.addEventListener('pointercancel', up);
          });
          return li;
        }));
      }
      paint();
      work.append(el('p', {class: 'm-how'}, '카드를 위아래로 끌거나 화살표를 눌러 순서를 맞추세요.'), ol);
      return {collect: () => ({answer: list.join(',')}), mark: (w) => { wrong = w; paint(); }};
    },
    // 초성 맞히기: 설명과 초성을 보고 과학 낱말을 쓴다
    word(t, {work, submit}) {
      const boxes = el('div', {class: 'm-word-boxes', 'aria-hidden': 'true'});
      const input = el('input', {class: 'm-word-input', type: 'text', maxlength: '24', autocomplete: 'off', spellcheck: 'false', 'aria-label': '낱말 쓰기', placeholder: '낱말을 적어 주세요'});
      function paint() {
        const typed = [...input.value.replace(/\s/g, '')]; let n = 0;
        boxes.replaceChildren(...[...t.pattern].map((ch) => {
          if (ch === ' ') return el('span', {class: 'm-word-gap'});
          const got = typed[n++];
          return el('span', {class: 'm-word-box' + (got ? ' filled' : '')}, el('b', {}, got || ''), el('small', {}, ch));
        }));
      }
      input.addEventListener('input', () => { input.classList.remove('recheck'); paint(); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim() && !e.isComposing) { e.preventDefault(); submit({answer: input.value.trim()}); } });
      paint();
      work.append(el('p', {class: 'm-word-clue'}, el('b', {}, '설명 '), t.clue || ''), el('p', {class: 'm-how'}, `초성 ${t.pattern.replace(/\s/g, '').length}글자를 보고 알맞은 과학 낱말을 적으세요.`), boxes, input);
      return {
        collect: () => (input.value.trim() ? {answer: input.value.trim()} : '낱말을 적어 주세요.'),
        mark: (w, ok) => { if (!ok) input.classList.add('recheck'); },
        wrongText: () => '초성과 글자 수를 다시 맞춰 보세요.',
        mounted: () => input.focus({preventScroll: true}),
      };
    },
    // 과학 낱말 끝말잇기: 앞 낱말의 끝 글자로 시작하는 카드를 골라 사슬을 잇는다
    chain(t, {work}) {
      const pool = shuffled(t.pool.map((w) => ({id: w, label: w})), state.runId + t.id);
      let seq = [], wrong = [];
      const row = el('div', {class: 'm-chain', 'data-drop': 'chain'}), poolBox = el('div', {class: 'm-chain-pool'});
      const word = (w, cls) => { const s = el('span', {class: 'm-chain-word ' + (cls || '')}); s.append(el('u', {}, w[0]), w.slice(1, -1), w.length > 1 ? el('b', {}, w[w.length - 1]) : ''); return s; };
      const add = (w) => { if (seq.length < t.links && !seq.includes(w)) { seq.push(w); wrong = []; paint(); } };
      function paint() {
        const cells = [el('span', {class: 'm-chain-start'}, word(t.start, 'start'))];
        for (let k = 0; k < t.links; k++) {
          cells.push(el('span', {class: 'm-chain-arrow', 'aria-hidden': 'true'}, '→'));
          const w = seq[k];
          if (w) { const b = button('', () => { seq = seq.slice(0, k); wrong = []; paint(); }, 'm-chain-card placed' + (wrong.includes(String(k + 1)) ? ' recheck' : '')); b.append(word(w)); b.setAttribute('aria-label', `${w} 빼기`); cells.push(b); }
          else cells.push(el('span', {class: 'm-chain-slot' + (k === seq.length ? ' next' : '')}, k === seq.length ? (seq.length ? `「${seq[k - 1].slice(-1)}」로 시작` : `「${t.start.slice(-1)}」로 시작`) : ''));
        }
        row.replaceChildren(...cells);
        poolBox.replaceChildren(...pool.filter((p) => !seq.includes(p.id)).map((p) => { const b = button('', () => add(p.id), 'm-chain-card'); b.append(word(p.label)); b.setAttribute('aria-label', p.label); dragSource(b, work, () => add(p.id)); return b; }));
      }
      paint();
      work.append(el('p', {class: 'm-how'}, `앞 낱말의 끝 글자(굵은 글자)로 시작하는 낱말 카드를 골라 ${t.links}칸을 이으세요. 카드를 끌어 사슬에 놓아도 돼요. 놓은 카드를 누르면 그 뒤가 빠져요.`), row, el('p', {class: 'm-chain-label'}, '낱말 카드'), poolBox);
      return {
        collect: () => (seq.length === t.links ? {answer: seq.join(',')} : `낱말 ${t.links}개로 사슬을 끝까지 이어 주세요.`),
        mark: (w) => { wrong = w; paint(); },
        wrongText: (w) => (w[0] === 'short' ? `낱말 ${t.links}개를 모두 이어 주세요.` : w[0] ? `${w[0]}번째 낱말이 앞 낱말의 끝 글자로 시작하는지 살펴보세요.` : ''),
      };
    },
    fill(t, {work}) {
      const sels = {};
      const p = el('p', {class: 'm-fill'});
      let n = 0;
      for (const part of t.text.split(/(\{b\d+\})/)) {
        const hit = part.match(/^\{(b\d+)\}$/);
        if (!hit) { part.split(String.fromCharCode(10)).forEach((line, k) => { if (k) p.append(el('br')); if (line) p.append(line); }); continue; }
        const bl = t.blanks.find((x) => x.id === hit[1]);
        const s = el('select', {class: 'm-blank', 'aria-label': `빈칸 ${++n}`}, el('option', {value: ''}, '고르기'), bl.options.map((o) => el('option', {value: o.id}, o.label)));
        s.addEventListener('change', () => s.classList.remove('recheck'));
        sels[bl.id] = s; p.append(s);
      }
      work.append(p);
      return {
        collect: () => { const roles = {}; for (const [k, s] of Object.entries(sels)) { if (!s.value) return '빈칸을 모두 채워 주세요.'; roles[k] = s.value; } return {roles}; },
        mark: (w) => { for (const [k, s] of Object.entries(sels)) s.classList.toggle('recheck', w.includes(k)); },
      };
    },
    find(t, {work}) {
      const picked = new Set();
      const img = el('img', {src: t.image, alt: t.alt || '', draggable: 'false'});
      const marks = el('div', {class: 'm-find-marks'});
      const pic = el('div', {class: 'm-find'}, img, marks);
      const note = el('p', {class: 'm-find-note', 'aria-live': 'polite'});
      const listBox = el('div', {class: 'm-find-list'});
      let wrong = [];
      function nearest(px, py) {
        const r = img.getBoundingClientRect();
        let best = null, bestD = Infinity;
        for (const s of t.spots) for (const [x, y, rad] of s.at) {
          const dx = (px - r.left) - (x / 100) * r.width, dy = (py - r.top) - (y / 100) * r.height, d = Math.hypot(dx, dy) / ((rad / 100) * r.width);
          if (d <= 1 && d < bestD) { best = s; bestD = d; }
        }
        return best;
      }
      function toggle(s) {
        if (picked.has(s.id)) { picked.delete(s.id); note.textContent = `${s.label}${batchim(s.label) ? '을' : '를'} 목록에서 뺐어요.`; }
        else { picked.add(s.id); note.textContent = `${s.label}${batchim(s.label) ? '을' : '를'} 골랐어요.`; }
        wrong = wrong.filter((w) => w !== s.id);
        paint();
      }
      function paint() {
        marks.replaceChildren(...t.spots.filter((s) => picked.has(s.id)).map((s) => {
          const [x, y] = s.at[0];
          const mk = el('span', {class: 'm-find-mark' + (wrong.includes(s.id) ? ' recheck' : '')}, s.label);
          mk.style.left = x + '%'; mk.style.top = y + '%';
          return mk;
        }));
        // 그림 가장자리의 이름표가 잘리지 않게 안쪽으로 당긴다.
        const fit = () => { const W = marks.clientWidth, H = marks.clientHeight; if (!W) return; for (const mk of marks.children) { const w = mk.offsetWidth, h = mk.offsetHeight, cx = parseFloat(mk.style.left) / 100 * W, cy = parseFloat(mk.style.top) / 100 * H; if (W > w + 8) mk.style.left = Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, cx)) / W * 100 + '%'; if (H > h + 8) mk.style.top = Math.min(H - h / 2 - 4, Math.max(h / 2 + 4, cy)) / H * 100 + '%'; } };
        fit(); requestAnimationFrame(fit);
        listBox.replaceChildren(el('strong', {}, `고른 것 ${picked.size}개`), el('div', {class: 'm-find-picked'}, t.spots.filter((s) => picked.has(s.id)).map((s) => button(s.label + ' 빼기', () => toggle(s), 'm-chip' + (wrong.includes(s.id) ? ' recheck' : '')))));
      }
      pic.addEventListener('click', (e) => { const s = nearest(e.clientX, e.clientY); if (s) toggle(s); else note.textContent = '그곳에는 따로 살펴볼 것이 없어요. 다른 곳을 눌러 보세요.'; });
      const keyList = el('details', {class: 'm-find-keys'}, el('summary', {}, '그림 속 물건을 목록으로 고르기'), el('div', {class: 'm-options'}, t.spots.map((s) => button(s.label, () => toggle(s), 'm-option'))));
      paint();
      work.append(el('p', {class: 'm-how'}, '그림에서 해당하는 곳을 누르세요. 다시 누르면 뺄 수 있어요. 다 골랐으면 "확인하기"를 누르세요.'), pic, note, listBox, keyList);
      return {
        collect: () => (picked.size ? {answer: [...picked].join(',')} : '그림에서 하나 이상 골라 주세요.'),
        mark: (w) => { wrong = w.filter((x) => x !== 'missing'); paint(); },
        wrongText: (w) => { const miss = w.filter((x) => x === 'missing').length, bad = w.filter((x) => x !== 'missing').length; return [bad ? `${t.badText || '빨간 표시는 다시 살펴볼 곳이에요.'} 빨간 표시 ${bad}곳을 다시 눌러 빼 보세요.` : '', miss ? ` 아직 못 찾은 곳이 ${miss}곳 있어요.` : '', bad && !miss ? ' 찾아야 할 곳은 모두 골랐어요.' : ''].join('').trim(); },
      };
    },
    text(t, {work}) {
      const ta = el('textarea', {maxlength: '300', rows: '3', 'aria-label': t.title, placeholder: t.placeholder || ''});
      ms.texts ??= {};
      ta.value = ms.texts[t.id] || '';
      ta.addEventListener('input', () => { ms.texts[t.id] = ta.value; ta.classList.remove('recheck'); save(); });
      if (t.answerSupport) work.append(el('p', {class: 'm-how'}, '핵심 낱말이 들어가면 정답이에요. 같은 뜻의 말과 조사나 어미가 다른 표현도 괜찮아요.'));
      work.append(ta);
      return {collect: () => (ta.value.trim() ? {answer: ta.value.trim()} : '내 답을 적어 주세요.'), mark: (w, ok) => ta.classList.toggle('recheck', !ok), saved: ({answer}) => { ms.texts[t.id] = answer; ms.question = answer; }};
    },
    grid(t, {work}) {
      const on = {};
      let wrong = [];
      const table = el('table', {class: 'm-grid'});
      function paint() {
        table.replaceChildren(el('thead', {}, el('tr', {}, el('th', {}, ''), t.cols.map((c) => el('th', {}, c.label)))),
          el('tbody', {}, t.rows.map((r) => el('tr', {class: wrong.includes(r.id) ? 'recheck' : ''}, el('th', {}, r.label), t.cols.map((c) => {
            const set = on[r.id] ??= new Set();
            const b = button(set.has(c.id) ? '✓' : '', () => { set.has(c.id) ? set.delete(c.id) : set.add(c.id); wrong = wrong.filter((w) => w !== r.id); paint(); }, 'm-cell');
            b.setAttribute('aria-pressed', String(set.has(c.id))); b.setAttribute('aria-label', `${r.label}: ${c.label}`);
            return el('td', {}, b);
          })))));
      }
      paint();
      work.append(el('p', {class: 'm-how'}, t.how || '줄마다 알맞은 칸을 모두 누르세요. 여러 칸을 골라도 돼요.'), el('div', {class: 'm-grid-wrap'}, table));
      return {
        collect: () => (t.rows.every((r) => on[r.id]?.size) ? {roles: Object.fromEntries(t.rows.map((r) => [r.id, [...on[r.id]].join(',')]))} : '줄마다 하나 이상 골라 주세요.'),
        mark: (w) => { wrong = w; paint(); },
      };
    },
    report(t, {work}) {
      const dex = m.dex || {};
      const sel = (label, options) => el('label', {class: 'm-field'}, el('span', {}, label), el('select', {}, el('option', {value: ''}, '고르기'), options.map(([v, l]) => el('option', {value: v}, l))));
      const product = sel('조사한 제품', t.products.map((id) => [id, dex[id]?.label || id]));
      const prop = sel('이용하는 전자석의 성질', t.props.map((o) => [o.id, o.label]));
      const source = sel('자료 출처', Object.values(dex).map((d) => [d.source, d.source]));
      const merit = el('textarea', {maxlength: '300', rows: '3', placeholder: '이 제품 덕분에 무엇이 편리해졌는지 써 보세요.'});
      const ask = el('input', {type: 'text', maxlength: '80', placeholder: '예: 전동 휠체어의 속도는 어떻게 바꿀까요?'});
      const fields = {prop, source};
      work.append(el('div', {class: 'm-report'}, product, prop, source, el('label', {class: 'm-field wide'}, el('span', {}, '편리해진 점'), merit), el('label', {class: 'm-field wide'}, el('span', {}, '친구에게 묻고 싶은 점 (선택)'), ask)));
      const v = (f) => f.querySelector('select').value;
      return {
        collect: () => (!v(product) || !v(prop) || !v(source) ? '제품, 성질, 출처를 모두 골라 주세요.' : merit.value.trim().length < 5 ? '편리해진 점을 한 문장 이상 써 주세요.' : {answer: merit.value.trim(), roles: {product: v(product), prop: v(prop), source: v(source), ...(ask.value.trim() ? {ask: ask.value.trim()} : {})}}),
        mark: (w) => { for (const [k, f] of Object.entries(fields)) f.querySelector('select').classList.toggle('recheck', w.includes(k)); },
        wrongText: (w) => [w.includes('prop') ? '고른 성질이 조사 카드의 내용과 맞는지 다시 보세요.' : '', w.includes('source') ? '자료 출처는 이 제품을 조사한 카드로 골라야 해요.' : ''].join(' ').trim(),
      };
    },
    plan(t, {work}) {
      const sel = (label, options) => el('label', {class: 'm-field'}, el('span', {}, label), el('select', {}, el('option', {value: ''}, '고르기'), options.map((o) => el('option', {value: o.id}, o.label))));
      const place = sel('실천 장소', t.places), period = sel('실천 기간', t.periods);
      const on = new Set();
      const rules = el('div', {class: 'm-options'}, t.rules.map((r) => { const b = button(r.label, () => { on.has(r.id) ? on.delete(r.id) : on.add(r.id); b.setAttribute('aria-pressed', String(on.has(r.id))); b.classList.remove('recheck'); paintTable(); }, 'm-option'); b.setAttribute('aria-pressed', 'false'); return b; }));
      const custom = el('input', {type: 'text', maxlength: '80', placeholder: '내가 만든 규칙이 있으면 적어 보세요 (선택)'});
      const table = el('div', {class: 'm-plan-table'});
      function paintTable() {
        const days = Number(period.querySelector('select').value.replace(/[^0-9]/g, '')) || 5;
        const chosen = t.rules.filter((r) => on.has(r.id));
        table.replaceChildren(el('strong', {}, '실천표 미리 보기(실천한 뒤에 채워요)'), el('table', {}, el('tr', {}, el('th', {}, '규칙'), Array.from({length: Math.min(days, 7)}, (_, i) => el('th', {}, `${i + 1}일`))),
          (chosen.length ? chosen : [{label: '규칙을 고르면 여기에 나와요'}]).map((r) => el('tr', {}, el('td', {}, r.label), Array.from({length: Math.min(days, 7)}, () => el('td', {class: 'blank'}, ''))))));
      }
      period.querySelector('select').addEventListener('change', paintTable);
      work.append(el('div', {class: 'm-report'}, place, period), el('h3', {class: 'm-sub'}, '생활 규칙 고르기 (두 가지 이상)'), rules, el('label', {class: 'm-field wide'}, el('span', {}, '내가 만든 규칙'), custom), table);
      paintTable();
      const v = (f) => f.querySelector('select').value;
      return {
        collect: () => (!v(place) || !v(period) ? '실천 장소와 기간을 골라 주세요.' : on.size < 2 ? '생활 규칙을 두 가지 이상 골라 주세요.' : {roles: {place: v(place), period: v(period), rules: [...on].join(','), ...(custom.value.trim() ? {custom: custom.value.trim()} : {})}}),
        mark: (w) => { rules.querySelectorAll('.recheck').forEach((b) => b.classList.remove('recheck')); if (w.includes('rules')) rules.querySelectorAll('[aria-pressed="true"]').forEach((b) => b.classList.add('recheck')); },
        wrongText: () => '고른 규칙을 다시 보세요. 효율 규칙과 안전 규칙이 적어도 하나씩 들어가야 해요.',
        saved: ({roles}) => { ms.plan = {...roles, labels: t.rules.filter((r) => on.has(r.id)).map((r) => r.label), placeLabel: t.places.find((o) => o.id === roles.place)?.label, periodLabel: t.periods.find((o) => o.id === roles.period)?.label}; },
      };
    },
    form(t, {work}) {
      const inputs = {};
      const preview = t.preview ? el('div', {class: 'm-poster'}) : null;
      const wrap = el('div', {class: 'm-report'});
      for (const f of t.fields) {
        let input;
        if (f.kind === 'select') input = el('select', {}, el('option', {value: ''}, '고르기'), f.options.map((o) => el('option', {value: o.id}, o.label)));
        else if (f.kind === 'long') input = el('textarea', {maxlength: '300', rows: '3', placeholder: f.placeholder || ''});
        else input = el('input', {type: 'text', maxlength: '80', placeholder: f.placeholder || ''});
        input.addEventListener('input', paint); input.addEventListener('change', paint);
        inputs[f.id] = input;
        wrap.append(el('label', {class: 'm-field' + (f.kind === 'select' ? '' : ' wide')}, el('span', {}, f.label + (f.required === false ? ' (선택)' : '')), input));
      }
      function paint() {
        if (!preview) return;
        const val = (id) => { const f = t.fields.find((x) => x.id === id), i = inputs[id]; return f?.kind === 'select' ? f.options.find((o) => o.id === i.value)?.label || '' : i.value.trim(); };
        preview.replaceChildren(el('small', {}, val(t.preview.kind) || '안내물'), el('strong', {}, val(t.preview.title) || '지킬 행동을 적어 보세요'), el('p', {}, val(t.preview.reason) ? '왜? ' + val(t.preview.reason) : ''), el('p', {class: 'check'}, val(t.preview.check) ? '확인 방법: ' + val(t.preview.check) : ''));
      }
      if (t.answerSupport) work.append(el('p', {class: 'm-how'}, '설명은 핵심 낱말로 확인해요. 조사나 어미는 달라도 괜찮아요. 어려우면 초성 힌트를 열어 보세요.'));
      work.append(wrap, preview ? el('div', {class: 'm-poster-wrap'}, el('span', {class: 'm-how'}, '미리 보기'), preview) : '');
      paint();
      // keepPlan: 실천 계획으로 남길 칸 id 목록. 저장하면 recall 과제가 「내가 세운 실천 계획」으로 다시 보여 준다.
      const shown = (f) => (f.kind === 'select' ? f.options.find((o) => o.id === inputs[f.id].value)?.label || '' : inputs[f.id].value.trim());
      return {
        collect: () => { const roles = {}; for (const f of t.fields) { const v = inputs[f.id].value.trim(); if (f.required !== false && !v) return `'${f.label}' 칸을 채워 주세요.`; if (v) roles[f.id] = v; } return f0(roles); },
        mark: wrong => { for (const [fieldId, input] of Object.entries(inputs)) input.classList.toggle('recheck', wrong.includes(fieldId)); },
        saved: () => { if (t.keepPlan) ms.plan = {lines: t.fields.filter((f) => t.keepPlan.includes(f.id) && shown(f)).map((f) => `${f.label}: ${shown(f)}`)}; },
      };
      function f0(roles) { const long = t.fields.find((f) => f.kind === 'long'); if (long && roles[long.id]) { const answer = roles[long.id]; delete roles[long.id]; return {answer, roles: {...roles, [long.id]: '(설명은 answer)'}}; } return {roles}; }
    },
    number(t, {work}) {
      if (t.fields) {
        const inputs = {};
        work.append(el('div', {class: 'm-fields'}, t.fields.map((f) => { const inp = inputs[f.id] = el('input', {type: 'text', inputmode: 'decimal', maxlength: '8', class: 'm-number', 'aria-label': f.prompt}); return el('label', {class: 'm-field'}, el('span', {}, f.prompt), el('span', {class: 'm-number-row'}, inp, f.unit ? el('b', {}, f.unit) : '')); })));
        return {
          collect: () => { const roles = {}; for (const f of t.fields) { const v = inputs[f.id].value.trim(); if (!v) return '칸을 모두 채워 주세요.'; roles[f.id] = v; } return {roles}; },
          mark: (wrong) => { for (const f of t.fields) inputs[f.id].classList.toggle('recheck', (wrong || []).includes(f.id)); },
        };
      }
      const inp = el('input', {type: 'text', inputmode: 'decimal', maxlength: '8', class: 'm-number', 'aria-label': t.title});
      work.append(el('label', {class: 'm-field'}, el('span', {}, t.prompt || '값을 입력하세요'), el('span', {class: 'm-number-row'}, inp, t.unit ? el('b', {}, t.unit) : '')));
      return {collect: () => (inp.value.trim() ? {answer: inp.value.trim()} : '값을 입력해 주세요.'), mark: (w, ok) => inp.classList.toggle('recheck', !ok)};
    },
    action() {
      return {auto: true, collect: () => '위의 신호기를 직접 조작해 보세요.'};
    },
    signal(t, {work, fb, submit}) {
      if (t.mode === 'send') {
        const table = {...(ms.signalDraft || ms.table || {})};
        let meaning = null;
        const rows = el('div', {class: 'm-table'}), sendBox = el('div', {class: 'm-send'});
        const patOf = (w) => PATTERNS.find((p) => table['p:' + p.id] === w)?.id;
        function paint() {
          rows.replaceChildren(el('h3', {}, '깜빡이 약속표'), ...PATTERNS.map((p) => {
            const s = el('select', {'aria-label': p.label + ' 신호의 뜻'}, el('option', {value: ''}, '뜻 고르기'), MEANINGS.map((w) => el('option', {value: w}, w)));
            s.value = table['p:' + p.id] || '';
            s.addEventListener('change', () => { if (s.value) table['p:' + p.id] = s.value; else delete table['p:' + p.id]; meaning = null; ms.signalDraft = {...table}; save(); paint(); rows.querySelector(`[aria-label="${p.label} 신호의 뜻"]`)?.focus(); });
            return el('div', {class: 'm-table-row'}, blips(el, p.id), el('span', {}, p.label), s);
          }));
          const vals = Object.values(table), filled = PATTERNS.every((p) => table['p:' + p.id]), dup = new Set(vals).size !== vals.length;
          sendBox.replaceChildren();
          if (dup) return sendBox.append(el('p', {class: 'm-warn'}, '같은 뜻이 두 번 들어갔어요. 받는 사람이 헷갈리지 않게 서로 다른 뜻을 골라 주세요.'));
          const n = PATTERNS.filter((p) => table['p:' + p.id]).length;
          if (!filled) return sendBox.append(el('p', {class: 'm-how strong'}, `네 가지 깜빡임 가운데 ${n}가지에 뜻을 정했어요. 나머지 ${PATTERNS.length - n}가지도 서로 다른 뜻으로 정하면 여기에 「신항이에게 보낼 뜻」이 나와요.`));
          sendBox.append(el('h3', {}, '신항이에게 보낼 뜻'), el('div', {class: 'm-options'}, PATTERNS.map((p) => {
            const w = table['p:' + p.id], x = radio(w, () => { meaning = w; paint(); document.querySelector('.signal-device')?.scrollIntoView({block: 'center', behavior: 'smooth'}); });
            x.setAttribute('aria-checked', String(meaning === w));
            return x;
          })));
          if (meaning) sendBox.append(el('p', {class: 'm-how strong'}, `"${meaning}"의 약속은 `, blips(el, patOf(meaning)), ` ${patternLabel(patOf(meaning))}${batchim(patternLabel(patOf(meaning))) ? '이에요' : '예요'}. 위의 신호기에서 손잡이를 누르거나 「깜빡임을 골라 보내기」로 같은 모양을 만들어 보내세요.`));
        }
        paint();
        work.append(t.note ? '' : el('p', {class: 'm-how'}, '① 네 가지 신호에 서로 다른 뜻을 정해요. ② 보낼 뜻을 골라요. ③ 신호기에서 약속한 모양으로 보내요.'), rows, sendBox); // 과제 note에 순서가 있으면 같은 말을 두 번 쓰지 않는다
        return {
          auto: true, collect: () => '손잡이로 신호를 보내 보세요.',
          pattern: (p) => { if (!meaning) return show(fb, '먼저 약속표를 채우고 보낼 뜻을 골라 주세요.', 'warn'); submit({roles: {...table, sent: p, meaning}}); },
          wrongText: (w, {roles}) => {
            if (!roles.sent || roles['p:' + roles.sent] === meaning) return '';
            const want = Object.entries(roles).find(([k, v]) => k.startsWith('p:') && v === meaning)?.[0].slice(2);
            return `보낸 신호는 "${patternLabel(roles.sent)}"${batchim(patternLabel(roles.sent)) ? '이었어요' : '였어요'}. 약속표에서 "${meaning}"${batchim(meaning) ? '은' : '는'} ` + (want ? `"${patternLabel(want)}" 모양이에요. ` : '아직 모양이 정해지지 않았어요. ') + '손잡이를 짧게 누르면 짧은 깜빡임, 길게 누르고 있으면 긴 깜빡임이에요. 다시 보내 보세요.';
          },
          saved: ({roles}) => { ms.table = Object.fromEntries(Object.entries(roles).filter(([k]) => k.startsWith('p:'))); ms.sent = roles.sent; delete ms.signalDraft; },
        };
      }
      const table = ms.table && Object.keys(ms.table).length >= 2 ? ms.table : DEFAULT_TABLE;
      const pats = PATTERNS.filter((p) => table['p:' + p.id]);
      if (!pats.some((p) => p.id === ms.got)) { const pool = pats.filter((p) => p.id !== ms.sent); ms.got = (pool.length ? pool : pats)[Math.floor(Math.random() * (pool.length || pats.length))].id; save(); }
      let pick = null;
      const btns = pats.map((p) => radio(table['p:' + p.id], () => { pick = table['p:' + p.id]; btns.forEach((x) => x.setAttribute('aria-checked', String(x.textContent === pick))); }));
      work.append(el('div', {class: 'm-table readonly'}, el('h3', {}, '내가 만든 깜빡이 약속표'), pats.map((p) => el('div', {class: 'm-table-row'}, blips(el, p.id), el('span', {}, p.label), el('b', {}, table['p:' + p.id])))),
        el('h3', {class: 'm-sub'}, '신항이가 보낸 뜻은?'), el('div', {class: 'm-options', role: 'radiogroup'}, btns));
      return {
        mounted: (dev) => { dev.node.replay = () => dev.play(ms.got); dev.play(ms.got); },
        collect: () => (pick ? {roles: {...table, got: ms.got, decoded: pick}} : '신항이가 보낸 뜻을 골라 주세요.'),
      };
    },
  };

  // ---------------------------------------------------------------- 의뢰 해결
  function finish() {
    stopTask();
    if (!ms.completed && !preview) {
      record('mission.completed', 'mission', {gameId: id, gameVersion:m.version, contentRevision:m.contentRevision, answer: ms.question || m.finish?.title || m.quest, hint: 0});
      ms.completed = true;
      const adv = state.adventure;
      if (adv && (!adv.tracked || adv.tracked === id)) {
        const next = [...new Set([...Object.keys(QUESTS), ...Object.keys(MISSIONS)])].filter((x) => x.slice(0, 3) === id.slice(0, 3) && x > id).sort()[0];
        if (next) { adv.tracked = next; window.dispatchEvent(new Event('adventure-tracked')); }
      }
      save();
      onFinish?.(m);
    }
    const scene = el('div', {class: 'mission-finish-scene'}), goBtn = button(backLabel, leave, 'mission-go');
    scene.style.backgroundImage = `url("${m.banner}")`;
    if (m.beacon) { const bk = el('span', {class: 'mission-beacon', 'aria-hidden': 'true'}); const r = (1672 / 700) / (1672 / 941); bk.style.left = m.beacon[0] + '%'; bk.style.top = (m.beacon[1] * r - 30 * (r - 1)) + '%'; scene.append(bk); }
    scene.append(el('div', {class: 'mission-finish-title'}, el('small', {}, '의뢰 해결'), el('h1', {}, m.finish?.title || m.quest)));
    const body = el('div', {class: 'mission-finish-body'},
      (quick ? [] : m.finish?.lines || []).map(line), (m.wrap || []).map((w) => line(['미스터리', w])),
      el('div', {class: 'mission-clue'}, el('small', {}, '획득한 기록'), el('strong', {}, m.card), el('p', {}, m.finish?.clue || '')),
      finishDex(), poeSummary(),
      ms.question ? el('p', {class: 'mission-myq'}, '내가 남긴 질문: ' + ms.question) : null,
      el('div', {class: 'm-actions'}, button('단계 다시 보기', () => render(0), 'secondary'),
        m.transfer && !ms.poe?.T?.ok ? button('새 조건 문제', () => transferView(), 'secondary') : null,
        wu ? button(ms.writeup?.versions?.length ? '내가 쓴 설명' : '설명 쓰기', () => writeupScreen(), 'secondary') : null,
        (() => { const left = extras().filter((t) => !ms.done[t.id]); return left.length ? button(`더 해보기 ${left.length}개`, () => render(m.tasks.indexOf(left[0])), 'secondary') : null; })(),
        id === 'R5-G03' ? button('북쪽 마을 동토 탐사', () => { alive = false; stopTask(); window.removeEventListener('mission-leave', leave); save(); back('mission:R5-G10'); }, 'secondary') : null, goBtn));
    root.replaceChildren(el('section', {class: 'mission-finish'}, scene, body));
    if (!quick) holdButtons([goBtn]);
    celebrate(scene);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  // 마무리 화면에서 여는 설명 쓰기: 탐구에서 남긴 관찰 카드를 그대로 근거로 고르고, 선생님 피드백을 보고 고쳐 쓴다
  function writeupScreen() {
    stopTask();
    root.dataset.task = 'writeup';
    top = header(-1);
    const panel = el('article', {class: 'mission-writeup'});
    root.replaceChildren(top, el('div', {class: 'mission-main'}, panel));
    stopTask = writeupView(panel, {el, button, api, record, save, ms, wu, trials: ms.discovery?.trials || [], uid, runId: state.runId, gameId: id, preview,
      nextLabel: '의뢰 마무리 화면으로', onNext: () => finish(), onClose: () => finish(), closeLabel: '의뢰 마무리 화면으로'});
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  // 의뢰 마무리 화면: 이 의뢰에서 모은 도감 카드와 남은 카드 수
  function finishDex() {
    const box = el('div', {class: 'mission-dex'});
    if (preview) return box;
    const load = (again) => api('dex?runId=' + encodeURIComponent(state.runId) + '&game=' + encodeURIComponent(id)).then((d) => {
      if (!alive || !box.isConnected) return;
      const got = d.cards.filter((c) => c.got), left = d.cards.filter((c) => !c.got);
      if (!got.length) { if (!again) setTimeout(() => load(true), 1500); return; }
      box.replaceChildren(dexStrip(el, button, got, left.length ? `도감 카드 ${d.cards.length}장 가운데 ${got.length}장을 모았어요` : `이 의뢰의 도감 카드 ${got.length}장을 모두 모았어요`, openDex),
        left.some((c) => c.bonus) ? el('p', {class: 'mission-dex-left'}, '남은 숨은 카드는 더 해보기 과제에서 만날 수 있어요.') : '');
    }).catch(() => {});
    load(false);
    return box;
  }

  return () => { alive = false; stopTask(); window.removeEventListener('mission-leave', leave); };
}
