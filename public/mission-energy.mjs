// 푸른 생활 지구 푸른 목장 마을(학습보완자료 자원과 에너지) 조작 장면. 의뢰 엔진은 ENERGY_COMPONENTS를 COMPONENTS에 합친다.
// 목장 자원 양, 마을 공급량, 집 모형 온도, 집 설계 막대는 비교용 모형 값이다(e1-01~e1-03 명세에서 확인한 수치를 그대로 쓴다).
// 실제 자료는 자원 이용 기간 그래프(학습보완자료 과학 48쪽, 에너지 연구소 2023)뿐이다. 에너지 형태와 전환이라는 말은 쓰지 않는다.
const FONT = (s, b) => `${b ? 'bold ' : ''}${s}px "Malgun Gothic",sans-serif`;
const INK = '#233a5c', SOFT = '#51637a', GOOD = '#1f8a5b', BAD = '#b8452e';
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const act = (task, fire) => (a) => { if (task.type === 'action') fire?.(a); };
const later = (on) => setTimeout(() => on?.(), 0);
const jo = (w, a, b) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
function device(el, owner, label) {
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: 1440, height: 760, role: 'img', 'aria-label': label});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device sun energy-lab'}, el('div', {class: 'signal-owner'}, owner), canvas, tray, status);
  // 단추 줄을 다시 그려도 키보드 초점이 같은 단추(없으면 진행 단추)에 남게 한다
  const fill = tray.replaceChildren.bind(tray);
  tray.replaceChildren = (...kids) => {
    const a = document.activeElement, key = a && tray.contains(a) ? a.getAttribute('aria-label') || a.textContent : null;
    fill(...kids);
    if (key) queueMicrotask(() => { const all = [...tray.querySelectorAll('button')].filter((b) => !b.disabled); (all.find((b) => (b.getAttribute('aria-label') || b.textContent) === key) || all.find((b) => b.classList.contains('mission-go')) || all[0])?.focus({preventScroll: true}); });
  };
  return {canvas, status, tray, node, c: canvas.getContext('2d')};
}
// 한 줄 단추 묶음. list: [값, 글자, 화면 읽기 이름]
function seg(el, button, name, list, cur, on, off = () => false) {
  return el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, name), el('span', {class: 'bench-seg'}, list.map(([v, n, aria]) => {
    const b = button(n, () => on(v), 'bench-opt');
    b.setAttribute('aria-pressed', String(Array.isArray(cur) ? cur.includes(v) : cur === v));
    if (aria) b.setAttribute('aria-label', aria);
    if (off(v)) b.disabled = true;
    return b;
  })));
}
const where = (canvas, e) => { const r = canvas.getBoundingClientRect(); return {x: (e.clientX - r.left) * 720 / r.width, y: (e.clientY - r.top) * 380 / r.height}; };
function txt(c, s, x, y, {size = 14, bold = true, color = INK, align = 'left'} = {}) { c.fillStyle = color; c.font = FONT(size, bold); c.textAlign = align; c.fillText(s, x, y); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function chip(c, s, x, y, {bg = 'rgba(255,255,255,.94)', color = INK, size = 12} = {}) { c.font = FONT(size, true); const w = c.measureText(s).width + 14; c.fillStyle = bg; rr(c, x - w / 2, y - size - 3, w, size + 9, 5); c.fill(); txt(c, s, x, y, {size, color, align: 'center'}); return w; }
function wrap(c, s, x, y, maxW, lh, {size = 12, bold = false, color = INK} = {}) {
  c.font = FONT(size, bold); let line = '', yy = y;
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && c.measureText(t).width > maxW) { txt(c, line, x, yy, {size, bold, color}); line = w; yy += lh; } else line = t; }
  if (line) txt(c, line, x, yy, {size, bold, color});
  return yy;
}
function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); c.fill(); }
function meter(c, x, y, w, h, frac, col, back = '#dfe7ef') { c.fillStyle = back; c.fillRect(x, y, w, h); c.fillStyle = col; c.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h); }
function heart(c, x, y, s, on) {
  c.beginPath(); c.moveTo(x, y + s * 0.3);
  c.bezierCurveTo(x, y - s * 0.15, x - s * 0.6, y - s * 0.15, x - s * 0.6, y + s * 0.2);
  c.bezierCurveTo(x - s * 0.6, y + s * 0.55, x, y + s * 0.75, x, y + s);
  c.bezierCurveTo(x, y + s * 0.75, x + s * 0.6, y + s * 0.55, x + s * 0.6, y + s * 0.2);
  c.bezierCurveTo(x + s * 0.6, y - s * 0.15, x, y - s * 0.15, x, y + s * 0.3); c.closePath();
  if (on) { c.fillStyle = '#e2483e'; c.fill(); }
  c.strokeStyle = on ? '#9a2a22' : '#9aa6b5'; c.lineWidth = 1.2; c.stroke();
}
// 축하 한마디: 성공한 뒤 몇 초 동안 꽃가루와 말풍선을 보여 준다(움직임 줄이기 설정이면 멈춘 채로)
function cheer(c, t0, x, y, msg) {
  if (!t0) return;
  const age = (performance.now() - t0) / 1000; if (age > 4.5) return;
  const rm = reduceMotion(), cols = ['#f2b632', '#5bb37a', '#3f8fd8', '#e2683e'];
  c.save(); c.globalAlpha = Math.max(0, Math.min(1, (4.5 - age) / 0.6));
  c.font = FONT(14, true); const w = c.measureText(msg).width + 26;
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + (rm ? 0 : age * 0.8), r = rm ? 1 : 0.6 + Math.min(1, age * 2) * 0.4; c.fillStyle = cols[i % 4]; c.save(); c.translate(x + Math.cos(a) * (w / 2 + 14) * r, y + 1 + Math.sin(a) * 34 * r); c.rotate(a + (rm ? 0 : age * 3)); c.fillRect(-4, -2, 8, 4); c.restore(); }
  c.fillStyle = '#ffffff'; c.strokeStyle = GOOD; c.lineWidth = 2; rr(c, x - w / 2, y - 14, w, 30, 12); c.fill(); c.stroke();
  txt(c, msg, x, y + 6, {size: 14, color: '#1f6b47', align: 'center'});
  c.restore();
}
function tree(c, x, y, k = 1, alive = true) {
  if (!alive) { c.fillStyle = '#9b7a52'; c.fillRect(x - 3 * k, y - 4 * k, 6 * k, 5 * k); return; }
  c.fillStyle = '#7a5532'; c.fillRect(x - 2 * k, y - 8 * k, 4 * k, 9 * k);
  c.fillStyle = '#3f8a35'; c.beginPath(); c.moveTo(x, y - 28 * k); c.lineTo(x + 11 * k, y - 7 * k); c.lineTo(x - 11 * k, y - 7 * k); c.closePath(); c.fill();
}
function sunIcon(c, x, y, r = 10) { c.fillStyle = '#f2b632'; ellipse(c, x, y, r, r); c.strokeStyle = '#f2b632'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3)); c.lineTo(x + Math.cos(a) * (r + 7), y + Math.sin(a) * (r + 7)); c.stroke(); } }
function cloudIcon(c, x, y, k = 1, col = '#b9c3cf') { c.fillStyle = col; ellipse(c, x - 8 * k, y + 2 * k, 9 * k, 7 * k); ellipse(c, x + 2 * k, y - 3 * k, 11 * k, 9 * k); ellipse(c, x + 12 * k, y + 3 * k, 8 * k, 6 * k); c.fillRect(x - 8 * k, y + 2 * k, 20 * k, 7 * k); }
function drop(c, x, y) { c.fillStyle = '#3f8fd8'; c.beginPath(); c.moveTo(x, y - 6); c.quadraticCurveTo(x + 5, y + 1, x, y + 4); c.quadraticCurveTo(x - 5, y + 1, x, y - 6); c.fill(); }

// ================================================================ 목장 자원 모형(e1-01 명세 값)
// 처음 양 물 40, 나무 30, 광물 20. 회가 끝나면 물 +4, 나무 +1 다시 채우고 광물은 채우지 않는다(최대치는 처음 양).
// 목장 하나가 회마다 필요한 양 물 2, 나무 1, 광물 1. 필요한 양을 하나라도 다 받지 못한 목장은 그 회에 행복도 -1.
const RES = [
  {id: 'water', name: '물', place: '호수', start: 40, refill: 4, need: 2, col: '#3f8fd8'},
  {id: 'wood', name: '나무', place: '숲', start: 30, refill: 1, need: 1, col: '#3f8a35'},
  {id: 'ore', name: '광물', place: '광산', start: 20, refill: 0, need: 1, col: '#8a5fb8'},
];
const RANCHES = ['내 목장', '욕심 목장', '보통 목장', '아끼는 목장'];
const PROMISES = [
  {id: 'recycle', name: '광물은 재활용하기', how: '마을이 그 회에 쓴 광물의 절반을 광산으로 돌려받아요. 재활용해도 모두 돌려받지는 못해요.'},
  {id: 'forest', name: '숲은 두 번에 한 번만 쓰기', how: '모든 목장이 짝수 회에만 나무를 가져가고, 홀수 회에는 가져간 나무를 이어 써요.'},
  {id: 'notice', name: '욕심 목장에 약속 알리기', how: '욕심 목장도 필요한 만큼만 가져가요.'},
];
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function ranchStart() { return {left: {water: 40, wood: 30, ore: 20}, happy: [5, 5, 5, 5], round: 0, log: []}; }
function needOf(w, r, cards, id) {
  let n = RES.find((x) => x.id === id).need;
  if (w === 3 && id === 'ore' && r % 2 === 0) n = 0; // 아끼는 목장은 짝수 회에 가진 물건을 고쳐 써서 광물이 필요 없다
  if (cards.includes('forest') && id === 'wood' && r % 2 === 1) n = 0;
  return n;
}
// 한 회 진행. mine: 내 목장이 가져갈 양, cards: 약속 카드('need'는 내 목장이 필요한 양보다 많이 가져가지 않음)
export function ranchStep(s, mine, cards, seed) {
  const r = s.round + 1, rand = rng(seed * 101 + r * 7919), want = [{}, {}, {}, {}], got = [{}, {}, {}, {}];
  for (const {id, need} of RES) for (let w = 0; w < 4; w++) {
    const n = needOf(w, r, cards, id);
    if (w === 0) want[0][id] = cards.includes('forest') && id === 'wood' && r % 2 === 1 ? 0 : Math.max(0, Math.min(6, cards.includes('need') ? Math.min(mine[id] ?? need, need) : mine[id] ?? need));
    else want[w][id] = w === 1 && !cards.includes('notice') ? n * 2 : n;
  }
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const left = {...s.left}, use = {water: 0, wood: 0, ore: 0};
  for (const w of order) for (const {id} of RES) { const g = Math.min(want[w][id], left[id]); got[w][id] = g; left[id] -= g; use[id] += g; }
  const miss = [0, 1, 2, 3].filter((w) => RES.some(({id}) => got[w][id] < needOf(w, r, cards, id)));
  const happy = s.happy.map((h, w) => (miss.includes(w) ? Math.max(0, h - 1) : h));
  const back = cards.includes('recycle') ? Math.floor(use.ore / 2) : 0; // 마을 전체가 쓴 광물의 절반(내림)
  const add = {water: Math.min(4, 40 - left.water), wood: Math.min(1, 30 - left.wood), ore: Math.min(back, 20 - left.ore)};
  const row = {r, left: {...left}, add, use, happy: [...happy], miss, mine: {...got[0]}};
  return {left: {water: left.water + add.water, wood: left.wood + add.wood, ore: left.ore + add.ore}, happy, round: r, log: [...s.log, row]};
}
export function ranchRun(mine, cards, seed) { let s = ranchStart(); for (let r = 1; r <= 8; r++) s = ranchStep(s, typeof mine === 'function' ? mine(r) : mine, cards, seed); return s; }
export function firstOut(log) { for (const row of log) { const z = RES.filter(({id}) => row.left[id] === 0).map((x) => x.id); if (z.length) return {r: row.r, ids: z}; } return null; }

// 목장 놀이판 그림: 울타리(목재), 가축 우리 지붕(철), 먹이 통(건초), 가축 물통(물), 트랙터 연료 통(석유)
const SPOTS = {
  fence: {x: 30, y: 236, w: 184, h: 90, lx: 122, ly: 228, name: '울타리 자리'},
  roof: {x: 232, y: 118, w: 176, h: 76, lx: 320, ly: 112, name: '가축 우리 지붕'},
  feeder: {x: 430, y: 196, w: 90, h: 70, lx: 475, ly: 190, name: '먹이 통'},
  trough: {x: 424, y: 284, w: 104, h: 42, lx: 476, ly: 346, name: '가축 물통'},
  tractor: {x: 562, y: 206, w: 136, h: 128, lx: 630, ly: 200, name: '트랙터 연료 통'},
};
const BUILD = [
  {id: 'wood', card: '목재', spot: 'fence', done: '목재로 울타리를 세웠어요. 목재는 숲의 나무를 베어 얻어요.'},
  {id: 'iron', card: '철', spot: 'roof', done: '철판으로 가축 우리 지붕을 덮었어요. 철은 땅속에서 캐낸 광물로 만들어요.'},
  {id: 'water', card: '물', spot: 'trough', done: '가축 물통에 물을 채웠어요. 물은 가축이 마시고 풀밭에도 뿌려요.'},
  {id: 'hay', card: '건초', spot: 'feeder', done: '먹이 통에 건초를 담았어요. 건초는 풀을 베어 말린 가축의 먹이예요.'},
  {id: 'oil', card: '석유', spot: 'tractor', done: '트랙터 연료 통에 석유를 넣었어요. 석유는 트랙터를 움직이는 연료로 써요.'},
];
const OUT_SPOT = {water: 'trough', wood: 'fence', ore: 'roof'};
function drawRanchScene(c, built, grey = new Set(), labels = true) {
  const g = (id, col) => col;
  const fade = (id, fn) => { if (!grey.has(id)) return fn(); c.save(); c.globalAlpha = 0.22; fn(); c.restore(); const sp = SPOTS[id]; c.strokeStyle = '#c0392b'; c.lineWidth = 2; c.setLineDash([6, 5]); c.strokeRect(sp.x, sp.y, sp.w, sp.h); c.setLineDash([]); };
  c.fillStyle = '#e3f2fb'; c.fillRect(0, 60, 720, 74);
  c.fillStyle = '#cfe8ad'; c.fillRect(0, 134, 720, 246);
  c.fillStyle = '#bfdc98'; for (let i = 0; i < 24; i++) c.fillRect((i * 67) % 700, 150 + (i * 41) % 220, 14, 3);
  // 울타리
  if (built.has('fence')) fade('fence', () => {
    c.fillStyle = g('fence', '#a8743f');
    for (let x = 40; x <= 200; x += 40) c.fillRect(x - 4, 250, 8, 64);
    c.fillRect(34, 264, 174, 8); c.fillRect(34, 290, 174, 8);
  });
  // 가축 우리
  c.fillStyle = '#c0533e'; c.fillRect(250, 192, 140, 128); c.fillStyle = '#7a2f22'; c.fillRect(300, 250, 40, 70);
  c.strokeStyle = '#f3e6d0'; c.lineWidth = 3; c.beginPath(); c.moveTo(300, 250); c.lineTo(340, 320); c.moveTo(340, 250); c.lineTo(300, 320); c.stroke();
  if (built.has('roof')) fade('roof', () => {
    c.fillStyle = g('roof', '#8796a6'); c.beginPath(); c.moveTo(238, 194); c.lineTo(320, 128); c.lineTo(402, 194); c.closePath(); c.fill();
    c.strokeStyle = '#aab8c6'; c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(250 + k * 25, 192); c.lineTo(320, 132); c.stroke(); }
  });
  else { c.strokeStyle = '#7a2f22'; c.setLineDash([5, 5]); c.lineWidth = 2; c.beginPath(); c.moveTo(238, 194); c.lineTo(320, 128); c.lineTo(402, 194); c.stroke(); c.setLineDash([]); }
  // 먹이 통
  c.fillStyle = '#9c6b3c'; c.fillRect(440, 212, 70, 30); c.fillRect(446, 242, 6, 22); c.fillRect(498, 242, 6, 22);
  if (built.has('feeder')) fade('feeder', () => { c.fillStyle = g('feeder', '#e3c25a'); c.beginPath(); c.moveTo(440, 214); c.quadraticCurveTo(475, 196, 510, 214); c.fill(); });
  // 가축 물통과 소
  c.fillStyle = '#9c6b3c'; c.fillRect(430, 292, 90, 26);
  if (built.has('trough')) fade('trough', () => { c.fillStyle = g('trough', '#5aa6e0'); c.fillRect(434, 292, 82, 8); });
  c.fillStyle = '#fafafa'; ellipse(c, 540, 270, 22, 13); c.fillStyle = '#3a3a3a'; ellipse(c, 534, 268, 6, 5); ellipse(c, 548, 274, 5, 4);
  c.fillStyle = '#fafafa'; ellipse(c, 522, 262, 8, 7); c.fillStyle = '#3a3a3a'; c.fillRect(528, 280, 3, 12); c.fillRect(552, 280, 3, 12);
  // 트랙터
  c.fillStyle = '#3f8a35'; c.fillRect(580, 252, 92, 40); c.fillRect(612, 216, 40, 38); c.fillStyle = '#cfe9f5'; c.fillRect(618, 222, 28, 20);
  c.fillStyle = '#2b2b2b'; ellipse(c, 604, 300, 24, 24); ellipse(c, 662, 306, 15, 15); c.fillStyle = '#9a9a9a'; ellipse(c, 604, 300, 9, 9); ellipse(c, 662, 306, 5, 5);
  c.fillStyle = '#ffffff'; c.fillRect(676, 256, 14, 26); c.fillStyle = built.has('tractor') ? g('tractor', '#e09a2a') : '#dfe3e8'; c.fillRect(678, built.has('tractor') ? 258 : 276, 10, built.has('tractor') ? 22 : 4);
  if (!labels) return;
  for (const [id, sp] of Object.entries(SPOTS)) {
    if (built.has(id)) continue;
    c.strokeStyle = '#2f6fd6'; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.strokeRect(sp.x, sp.y, sp.w, sp.h); c.setLineDash([]);
    chip(c, sp.name, sp.lx, sp.ly, {bg: 'rgba(225,238,255,.95)', color: '#1d4f86', size: 11});
  }
}

export function ranchBoard(props) {
  const mode = props.mode;
  if (mode === 'build') return ranchBuild(props);
  if (mode === 'graph') return reserveGraph(props);
  if (mode === 'compare') return ranchCompare(props);
  if (mode === 'tech') return ranchTech(props);
  return ranchPlay(props);
}

// ---------------------------------------------------------------- 자원 카드로 목장 꾸미기
function ranchBuild({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '2026년 목장 놀이판', '목장 놀이판에서 모은 자원 카드 다섯 장과 울타리 자리, 가축 우리 지붕, 먹이 통, 가축 물통, 트랙터가 있는 목장');
  const {c, status, tray, node, canvas} = d;
  const st = memory['ranch-build'] ??= {used: [], done: false};
  let sel = null, fired = st.done, alive = true, raf = 0;
  function draw() {
    if (!alive) return;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#f4efe2'; c.fillRect(0, 0, 720, 380);
    drawRanchScene(c, new Set(BUILD.filter((b) => st.used.includes(b.id)).map((b) => b.spot)));
    c.fillStyle = '#f4efe2'; c.fillRect(0, 0, 720, 60);
    BUILD.forEach((b, i) => {
      const x = 12 + i * 142, used = st.used.includes(b.id), on = sel === b;
      c.fillStyle = used ? '#e2efe0' : on ? '#ffe08a' : '#ffffff'; rr(c, x, 8, 132, 46, 7); c.fill();
      c.strokeStyle = on ? '#c98a00' : '#b9c3cf'; c.lineWidth = on ? 2.5 : 1.2; c.stroke();
      txt(c, b.card, x + 66, 28, {size: 15, align: 'center', color: used ? SOFT : INK});
      txt(c, used ? SPOTS[b.spot].name.replace(' 자리', '') + '에 썼어요' : '자원 카드', x + 66, 46, {size: 11, bold: false, align: 'center', color: used ? GOOD : SOFT});
    });
    raf = requestAnimationFrame(draw);
  }
  function place(spot) {
    if (fired && st.used.length === BUILD.length) return;
    if (!sel) { status.textContent = '먼저 아래에서 쓸 자원 카드를 골라 주세요.'; return; }
    if (sel.spot !== spot) { status.textContent = `${SPOTS[spot].name}에는 다른 자원이 필요해요. 그 물건을 무엇으로 만들거나 채우는지 떠올려 봐요.`; return; }
    st.used.push(sel.id); status.textContent = sel.done; sel = null; renderTray();
    if (st.used.length === BUILD.length && !fired) { fired = true; st.done = true; status.textContent += ' 목장을 다 꾸몄어요. 생활에 쓰는 물건과 연료는 모두 자원으로 만들거나 채워요.'; onAction('built'); onReady?.(); }
  }
  function renderTray() {
    tray.replaceChildren();
    const left = BUILD.filter((b) => !st.used.includes(b.id));
    if (!left.length) return;
    tray.append(seg(el, button, '자원 카드', left.map((b) => [b.id, b.card]), sel?.id, (v) => { sel = BUILD.find((b) => b.id === v); status.textContent = `${jo(sel.card, '을', '를')} 골랐어요. 목장의 어느 곳에 쓸까요?`; renderTray(); }));
    if (sel) tray.append(seg(el, button, '쓸 곳', Object.entries(SPOTS).filter(([id]) => !BUILD.some((b) => b.spot === id && st.used.includes(b.id))).map(([id, sp]) => [id, sp.name]), null, place));
  }
  canvas.addEventListener('click', (e) => { const p = where(canvas, e); const hit = Object.entries(SPOTS).find(([, s]) => p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h); if (hit) place(hit[0]); });
  renderTray();
  status.textContent = fired ? '이미 목장을 다 꾸몄어요.' : '자원 카드를 하나 고른 뒤, 그 자원을 쓸 곳을 골라 목장을 꾸며요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 자원 이용 기간 그래프(학습보완자료 과학 48쪽, 에너지 연구소 2023)
const RESERVE = [['gas', '천연가스', 48.8], ['coal', '석탄', 139], ['oil', '석유', 53.5]];
function reserveGraph({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '목장 창고 벽의 그래프', '자원을 앞으로 이용할 수 있는 기간을 나타낸 막대그래프. 천연가스, 석탄, 석유 막대가 있고 아래에 자료 출처가 적혀 있다.');
  const {c, status, tray, node} = d;
  const st = memory['ranch-graph'] ??= {read: [], done: false};
  let cur = null, fired = st.done;
  const X0 = 180, PX = 2.8, Y0 = 282; // 1년 = 2.8 칸
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.fillStyle = '#c99a62'; c.fillRect(0, 0, 720, 380);
    c.strokeStyle = '#b5864f'; c.lineWidth = 2; for (let y = 30; y < 380; y += 38) { c.beginPath(); c.moveTo(0, y); c.lineTo(720, y); c.stroke(); }
    c.fillStyle = '#fffdf6'; rr(c, 44, 18, 632, 344, 8); c.fill(); c.strokeStyle = '#8a6a44'; c.lineWidth = 2; c.stroke();
    txt(c, '자원을 앞으로 이용할 수 있는 기간', 360, 52, {size: 18, align: 'center'});
    // 눈금
    c.strokeStyle = '#d5dbe3'; c.lineWidth = 1;
    for (let v = 0; v <= 150; v += 25) { const x = X0 + v * PX; c.beginPath(); c.moveTo(x, 78); c.lineTo(x, Y0); c.stroke(); txt(c, String(v), x, Y0 + 18, {size: 11, bold: false, color: SOFT, align: 'center'}); }
    c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X0, 78); c.lineTo(X0, Y0); c.lineTo(X0 + 150 * PX + 6, Y0); c.stroke();
    txt(c, '단위: 년', X0 + 150 * PX, Y0 + 36, {size: 11, bold: false, color: SOFT, align: 'right'});
    RESERVE.forEach(([id, name, v], i) => {
      const y = 96 + i * 60, on = cur === id, read = st.read.includes(id);
      txt(c, name, X0 - 12, y + 22, {size: 15, align: 'right'});
      c.fillStyle = on ? '#e0a52a' : read ? '#6f9fd8' : '#9fb7d3'; c.fillRect(X0, y, v * PX, 34);
      if (on) { c.strokeStyle = '#c0392b'; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(X0 + v * PX, y + 34); c.lineTo(X0 + v * PX, Y0); c.stroke(); c.setLineDash([]); }
      if (read) txt(c, `${v}년`, X0 + v * PX + 8, y + 23, {size: 14, color: on ? '#a35a00' : INK});
    });
    txt(c, '자료: 에너지 연구소, 2023', 70, 330, {size: 12, bold: false, color: SOFT});
    txt(c, '알려진 양과 쓰는 양으로 셈한 값이라 달라질 수 있어요.', 70, 350, {size: 12, bold: false, color: SOFT});
  }
  function renderTray() {
    tray.replaceChildren(seg(el, button, '막대 읽기', RESERVE.map(([id, name]) => [id, name]), cur, (id) => {
      cur = id; if (!st.read.includes(id)) st.read.push(id);
      const [, name, v] = RESERVE.find((x) => x[0] === id);
      status.textContent = `${name} 막대 끝은 ${v}년이에요. 지금 알려진 양을 지금처럼 쓴다면 앞으로 약 ${v}년 동안 이용할 수 있다고 셈한 값이에요.`;
      if (st.read.length === RESERVE.length && !fired) { fired = true; st.done = true; status.textContent += ' 세 자원 모두 이용할 수 있는 기간이 정해져 있어요.'; onAction('read'); onReady?.(); }
      draw(); renderTray();
    }));
  }
  draw(); renderTray();
  status.textContent = fired ? '이미 그래프를 읽었어요.' : '단추를 눌러 막대 세 개를 하나씩 읽어 봐요.';
  if (fired) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- 목장 8회 경영(첫째 판 그대로 쓰기, 둘째 판 효율적으로 쓰기)
function ranchBox(c, s, i, x, y, cards, missNow) {
  const h = s.happy[i];
  c.fillStyle = i === 0 ? '#fff6d8' : '#ffffff'; rr(c, x, y, 164, 68, 7); c.fill(); c.strokeStyle = i === 0 ? '#d9a320' : '#b9c3cf'; c.lineWidth = 1.5; c.stroke();
  txt(c, RANCHES[i], x + 8, y + 18, {size: 13});
  const how = [cards.includes('need') ? '필요한 양까지 가져가요' : '가져갈 양을 내가 정해요', cards.includes('notice') ? '약속대로 필요한 만큼 가져가요' : '필요한 양의 두 배를 가져가요', '필요한 만큼 가져가요', '광물은 두 번에 한 번만 써요'][i];
  txt(c, how, x + 8, y + 34, {size: 10.5, bold: false, color: SOFT});
  for (let k = 0; k < 5; k++) heart(c, x + 14 + k * 16, y + 43, 10, k < h);
  txt(c, `행복도 ${h}`, x + 156, y + 55, {size: 11, color: h >= 3 ? GOOD : BAD, align: 'right'});
  if (missNow) chip(c, '모자람', x + 132, y + 19, {bg: '#ffe0d8', color: '#9a2a22', size: 10});
}
function drawRunMap(c, s, disp, cards, missNow) {
  c.fillStyle = '#d4ebb4'; c.fillRect(0, 0, 442, 380);
  c.strokeStyle = '#eadfb9'; c.lineWidth = 9; c.lineCap = 'round';
  for (const [x, y] of [[90, 74], [350, 74], [90, 300], [350, 300]]) { c.beginPath(); c.moveTo(222, 196); c.lineTo(x, y); c.stroke(); }
  c.lineCap = 'butt';
  const wf = Math.max(0, disp.water) / 40;
  c.fillStyle = '#c8b48a'; ellipse(c, 108, 186, 64, 36);
  if (wf > 0.001) { c.fillStyle = '#5aa6e0'; ellipse(c, 108, 186, 64 * Math.sqrt(wf), 36 * Math.sqrt(wf)); }
  const trees = Math.ceil(Math.max(0, disp.wood) / 3 - 0.01);
  for (let i = 0; i < 10; i++) tree(c, 182 + (i % 5) * 20, 146 + Math.floor(i / 5) * 32, 0.85, i < trees);
  c.fillStyle = '#9a8f86'; c.beginPath(); c.moveTo(284, 216); c.lineTo(334, 138); c.lineTo(384, 216); c.closePath(); c.fill();
  c.fillStyle = '#4b4038'; c.beginPath(); c.arc(334, 216, 14, Math.PI, 0); c.fill();
  const nug = Math.ceil(Math.max(0, disp.ore) / 2 - 0.01);
  for (let i = 0; i < nug; i++) { const x = 300 + (i % 5) * 17, y = 168 + Math.floor(i / 5) * 18; c.fillStyle = '#8a5fb8'; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + 6, y); c.lineTo(x, y + 6); c.lineTo(x - 6, y); c.closePath(); c.fill(); }
  RES.forEach((r, i) => {
    const cx = [108, 222, 334][i], v = s.left[r.id];
    txt(c, `${r.place} ${r.name} ${v}`, cx, 248, {size: 12, align: 'center', color: v === 0 ? BAD : INK});
    meter(c, cx - 45, 255, 90, 8, v / r.start, r.col);
  });
  [[8, 6], [270, 6], [8, 304], [270, 304]].forEach(([x, y], i) => ranchBox(c, s, i, x, y, cards, missNow.includes(i)));
  txt(c, `${s.round}회 / 8회`, 222, 334, {size: 14, align: 'center'});
}
function drawLines(c, logs, id, {x0 = 50, x1 = 420, y0 = 320, y1 = 60} = {}) {
  const r = RES.find((x) => x.id === id), k = (y0 - y1) / r.start, X = (i) => x0 + i * (x1 - x0) / 8;
  c.strokeStyle = '#d5dbe3'; c.lineWidth = 1;
  for (let v = 0; v <= r.start; v += 10) { const y = y0 - v * k; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); txt(c, String(v), x0 - 6, y + 4, {size: 10, bold: false, color: SOFT, align: 'right'}); }
  for (let i = 0; i <= 8; i++) txt(c, i ? `${i}회` : '처음', X(i), y0 + 16, {size: 10, bold: false, color: SOFT, align: 'center'});
  for (const {log, col, dash} of logs) {
    c.strokeStyle = col; c.lineWidth = 3; c.setLineDash(dash || []); c.beginPath(); c.moveTo(X(0), y0 - r.start * k);
    log.forEach((row) => c.lineTo(X(row.r), y0 - row.left[id] * k)); c.stroke(); c.setLineDash([]);
    log.forEach((row) => { c.fillStyle = col; ellipse(c, X(row.r), y0 - row.left[id] * k, 3.5, 3.5); });
  }
}
function ranchPlay({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire), two = mode === 'run2';
  const d = device(el, two ? '목장 경영 둘째 판: 효율적으로 쓰기 (모형 값)' : '목장 경영 첫째 판: 그대로 쓰기 (모형 값)', '가운데 호수, 숲, 광산과 둘레의 네 목장. 회마다 목장들이 자원을 가져가면 남은 양과 목장의 행복도가 바뀐다. 오른쪽에 회마다 남은 양을 적는 기록 표가 있다.');
  const {c, status, tray, node} = d;
  const st = memory['ranch-' + mode] ??= {cards: [], started: !two, take: {water: 2, wood: 1, ore: 1}, s: null, tries: 0, done: false, answer: '', best: null};
  st.s ??= ranchStart();
  let alive = true, raf = 0, fired = st.done, party = 0;
  const disp = {...st.s.left};
  const cards = () => (two ? [...st.cards, 'need'] : []);
  const seed = () => (two ? 500 : 100) + st.tries;
  const ended = () => st.s.round >= 8;
  function draw() {
    if (!alive) return;
    for (const r of RES) { disp[r.id] += (st.s.left[r.id] - disp[r.id]) * (reduceMotion() ? 1 : 0.16); if (Math.abs(disp[r.id] - st.s.left[r.id]) < 0.05) disp[r.id] = st.s.left[r.id]; }
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#f7faf3'; c.fillRect(0, 0, 720, 380);
    const last = st.s.log.at(-1);
    if (!two && ended() && st.answer) drawMissing();
    else if (!two && ended()) { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 442, 380); txt(c, '회가 지날 때 남은 양', 20, 26, {size: 14}); RES.forEach((r, i) => { c.fillStyle = r.col; c.fillRect(200 + i * 76, 17, 18, 5); txt(c, r.name, 222 + i * 76, 24, {size: 12, color: r.col}); }); drawOreWood(); }
    else drawRunMap(c, st.s, disp, cards(), last?.miss || []);
    drawTable();
    if (two) cheer(c, party, 221, 100, '보리: 네 목장이 모두 웃어요');
    raf = requestAnimationFrame(draw);
  }
  // 결과 그래프: 세 자원의 남은 양(가져간 뒤, 다시 채우기 전)
  function drawOreWood() {
    c.fillStyle = '#ffffff'; c.fillRect(0, 36, 442, 344);
    const x0 = 50, x1 = 420, y0 = 320, y1 = 60, X = (i) => x0 + i * (x1 - x0) / 8, k = (y0 - y1) / 40;
    c.strokeStyle = '#d5dbe3'; c.lineWidth = 1;
    for (let v = 0; v <= 40; v += 10) { const y = y0 - v * k; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); txt(c, String(v), x0 - 6, y + 4, {size: 10, bold: false, color: SOFT, align: 'right'}); }
    for (let i = 0; i <= 8; i++) txt(c, i ? `${i}회` : '처음', X(i), y0 + 16, {size: 10, bold: false, color: SOFT, align: 'center'});
    for (const r of RES) {
      c.strokeStyle = r.col; c.lineWidth = 3; c.beginPath(); c.moveTo(X(0), y0 - r.start * k);
      st.s.log.forEach((row) => c.lineTo(X(row.r), y0 - row.left[r.id] * k)); c.stroke();
      st.s.log.forEach((row) => { c.fillStyle = r.col; ellipse(c, X(row.r), y0 - row.left[r.id] * k, 3.5, 3.5); });
    }
    txt(c, '가져간 뒤 남은 양', x0, 50, {size: 11, bold: false, color: SOFT});
  }
  function drawMissing() {
    c.fillStyle = '#f4efe2'; c.fillRect(0, 0, 442, 380);
    const spot = OUT_SPOT[st.answer], sp = SPOTS[spot];
    c.save(); c.translate(-10, 6); c.scale(0.62, 0.62); drawRanchScene(c, new Set(Object.keys(SPOTS)), new Set([spot]), false); c.restore();
    const r = RES.find((x) => x.id === st.answer);
    txt(c, `${r.place}의 ${jo(r.name, '이', '가')} 바닥난 뒤의 목장`, 20, 26, {size: 14});
    chip(c, '더 만들 수 없어요', -10 + (sp.x + sp.w / 2) * 0.62, 6 + sp.y * 0.62 - 6, {bg: '#ffe0d8', color: '#9a2a22', size: 12});
    txt(c, ({water: '물이 없으면 가축 물통을 채우지 못해요.', wood: '나무가 없으면 울타리를 고치거나 세우지 못해요.', ore: '광물이 없으면 철판 지붕을 고치거나 만들지 못해요.'})[st.answer], 20, 276, {size: 12, bold: false});
  }
  function drawTable() {
    const X = 452;
    c.fillStyle = '#f7faf3'; c.fillRect(442, 0, 278, 380);
    txt(c, two ? '둘째 판: 효율적으로 쓰기' : '첫째 판: 그대로 쓰기', X, 22, {size: 14});
    txt(c, '목장마다 필요한 양: 물 2, 나무 1, 광물 1', X, 40, {size: 11, bold: false, color: SOFT});
    const cols = [['회', 36], ['물', 74], ['나무', 74], ['광물', 74]];
    let x = X;
    cols.forEach(([h, w]) => { c.fillStyle = '#dbe8d4'; c.fillRect(x, 50, w - 3, 20); txt(c, h, x + 6, 65, {size: 12}); x += w; });
    for (let i = 0; i < 8; i++) {
      const y = 74 + i * 22, row = st.s.log[i], now = i === st.s.round && !ended();
      x = X;
      cols.forEach(([, w], k) => {
        const id = RES[k - 1]?.id, zero = row && id && row.left[id] === 0;
        c.fillStyle = zero ? '#ffe1da' : now ? '#fff3c4' : '#ffffff'; c.fillRect(x, y, w - 3, 20);
        if (k === 0) txt(c, `${i + 1}회`, x + 5, y + 15, {size: 11, bold: false, color: SOFT});
        else if (row) { txt(c, String(row.left[id]), x + 8, y + 15, {size: 13, color: zero ? BAD : INK}); if (row.add[id]) txt(c, `+${row.add[id]}`, x + 40, y + 15, {size: 10, color: GOOD}); }
        x += w;
      });
    }
    txt(c, '가져간 뒤 남은 양이에요. 초록 숫자는', X, 268, {size: 10.5, bold: false, color: SOFT});
    txt(c, '회가 끝날 때 다시 채워지거나 돌려받은 양이에요.', X, 284, {size: 10.5, bold: false, color: SOFT});
    if (two) {
      txt(c, '약속 카드', X, 308, {size: 12});
      (st.cards.length ? st.cards : ['']).forEach((id, i) => txt(c, id ? PROMISES.find((p) => p.id === id).name : '아직 고르지 않았어요', X, 326 + i * 16, {size: 11, bold: false}));
      txt(c, '목표: 네 목장의 행복도를 모두 3 이상으로', X, 368, {size: 11, color: '#1d4f86'});
    } else {
      txt(c, '필요한 양을 다 받지 못한 목장은', X, 308, {size: 10.5, bold: false, color: SOFT});
      txt(c, '그 회에 행복도가 1 줄어요.', X, 324, {size: 10.5, bold: false, color: SOFT});
    }
  }
  function step() {
    if (ended()) return;
    const take = {...st.take};
    st.s = ranchStep(st.s, take, cards(), seed());
    const row = st.s.log.at(-1), zero = RES.filter(({id}) => row.left[id] === 0).map((r) => r.name);
    status.textContent = `${row.r}회: 물 ${row.left.water}, 나무 ${row.left.wood}, 광물 ${row.left.ore} 남았어요.` + (row.miss.length ? ` 필요한 양을 다 받지 못한 목장: ${row.miss.map((w) => RANCHES[w]).join(', ')}.` : '') + (zero.length ? ` ${zero.join(', ')} 남은 양이 0이에요.` : '');
    if (ended()) endRun();
    renderTray();
  }
  function endRun() {
    if (!two) { status.textContent += ' 8회가 끝났어요. 기록 표에서 남은 양이 가장 먼저 0이 된 자원을 골라 보세요.'; return; }
    const low = st.s.happy.map((h, i) => [h, RANCHES[i]]).filter(([h]) => h < 3);
    if (!low.length) {
      st.best = st.s.log;
      status.textContent += ' 8회가 끝났어요. 네 목장의 행복도가 모두 3 이상이에요. 약속을 지키며 아껴 쓰니 자원이 오래 남았어요.';
      party = performance.now();
      if (!fired) { fired = true; st.done = true; onAction('kept'); onReady?.(); }
    } else status.textContent += ` 8회가 끝났어요. ${low.map(([, n]) => n).join(', ')}의 행복도가 3보다 낮아요. 어떤 자원이 먼저 바닥났는지 보고 약속 카드를 다시 골라 봐요.`;
  }
  function answer(id) {
    const out = firstOut(st.s.log);
    if (out && !out.ids.includes(id)) { status.textContent = `${jo(RES.find((r) => r.id === id).name, '은', '는')} 가장 먼저 바닥나지 않았어요. 기록 표에서 남은 양이 처음으로 0이 된 칸을 다시 찾아보세요.`; return; }
    st.answer = id; const r = RES.find((x) => x.id === id);
    status.textContent = `${out ? out.r + '회에 ' : ''}${r.place}의 ${jo(r.name, '이', '가')} 가장 먼저 바닥났어요. ${({water: '물이 없으니 가축 물통을 채울 수 없어요.', wood: '나무가 없으니 울타리를 더 고치거나 세울 수 없어요.', ore: '광물로 만드는 철판이 없으니 가축 우리 지붕을 더 고치거나 만들 수 없어요.'})[id]}`;
    if (!fired) { fired = true; st.done = true; onAction('out'); onReady?.(); }
    renderTray();
  }
  function renderTray() {
    tray.replaceChildren();
    if (two && !st.started) {
      tray.append(seg(el, button, '약속 카드', PROMISES.map((p) => [p.id, p.name]), st.cards, (id) => {
        const p = PROMISES.find((x) => x.id === id);
        if (st.cards.includes(id)) st.cards = st.cards.filter((x) => x !== id);
        else if (st.cards.length >= 2) { status.textContent = '약속 카드는 두 장까지 고를 수 있어요. 한 장을 빼고 골라 주세요.'; return; }
        else st.cards.push(id);
        status.textContent = st.cards.includes(id) ? `${p.name}: ${p.how}` : `${jo(p.name, '을', '를')} 뺐어요.`;
        renderTray();
      }), button('약속 정하고 시작하기', () => { st.started = true; st.tries++; st.s = ranchStart(); st.take = {water: 2, wood: 1, ore: 1}; status.textContent = `약속 카드 ${st.cards.length}장으로 시작해요. 둘째 판에서는 내 목장도 필요한 양보다 많이 가져가지 않아요.`; renderTray(); }, 'mission-go'));
      return;
    }
    if (!ended()) {
      const max = (r) => (two ? r.need : 6);
      for (const r of RES) {
        const rest = two && st.cards.includes('forest') && r.id === 'wood' && (st.s.round + 1) % 2 === 1;
        tray.append(seg(el, button, rest ? '나무 쉬는 회' : r.name, Array.from({length: max(r) + 1}, (_, n) => [n, String(n), `${r.name} ${n}개 가져가기`]), rest ? -1 : st.take[r.id], (n) => { st.take[r.id] = n; status.textContent = `내 목장은 이번 회에 ${r.name} ${n}개를 가져가요.` + (n < r.need ? ' 필요한 양보다 적으면 내 목장의 행복도가 줄어요.' : ''); renderTray(); }, () => rest));
      }
      tray.append(button(`${st.s.round + 1}회 진행`, step, 'mission-go'));
      return;
    }
    if (!two && !st.answer) { tray.append(seg(el, button, '가장 먼저 바닥난 자원', RES.map((r) => [r.id, r.name]), null, answer)); return; }
    if (two && !st.s.happy.every((h) => h >= 3)) tray.append(button('약속 다시 정하기', () => { st.started = false; st.s = ranchStart(); status.textContent = '약속 카드를 다시 골라 주세요.'; renderTray(); }, 'mission-go'));
  }
  renderTray();
  status.textContent = fired ? '이미 끝낸 판이에요. 기록을 다시 살펴봐도 괜찮아요.'
    : two ? (st.started ? '내 목장이 가져갈 양을 정하고 회를 진행해요.' : '마을 약속 카드를 두 장까지 고르고 시작해요. 네 목장의 행복도를 모두 3 이상으로 지켜 봐요.')
    : '가져갈 양을 정하고 회를 진행해요. 바꾸지 않으면 지난 회와 같은 양을 가져가요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 두 판 비교
function ranchLogs(memory) {
  const r1 = memory['ranch-run1'], r2 = memory['ranch-run2'];
  const one = r1?.s?.log?.length === 8 ? r1.s.log : null, two = r2?.best?.length === 8 ? r2.best : null;
  return {one: one || ranchRun({water: 2, wood: 1, ore: 1}, [], 100).log, two: two || ranchRun({water: 2, wood: 1, ore: 1}, ['recycle', 'notice', 'need'], 500).log, sample: !one || !two, cards: two ? r2.cards : ['recycle', 'notice']};
}
function ranchCompare({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '두 판 기록 비교 (모형 값)', '첫째 판과 둘째 판에서 회마다 남은 양을 겹쳐 그린 꺾은선그래프와 두 판의 행복도, 쓴 양, 돌려받은 양');
  const {c, status, tray, node} = d;
  const st = memory['ranch-compare'] ??= {seen: [], done: false};
  const L = ranchLogs(memory);
  let cur = 'ore', fired = st.done;
  if (!st.seen.includes('ore')) st.seen.push('ore');
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 720, 380);
    const r = RES.find((x) => x.id === cur);
    txt(c, `${r.place}에 남은 ${r.name}`, 20, 26, {size: 15});
    c.strokeStyle = '#e08a32'; c.lineWidth = 3; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(210, 22); c.lineTo(236, 22); c.stroke(); c.setLineDash([]); txt(c, '첫째 판', 242, 26, {size: 12, color: '#a35a00'});
    c.strokeStyle = '#2f9a5b'; c.beginPath(); c.moveTo(310, 22); c.lineTo(336, 22); c.stroke(); txt(c, '둘째 판', 342, 26, {size: 12, color: GOOD});
    drawLines(c, [{log: L.one, col: '#e08a32', dash: [6, 4]}, {log: L.two, col: '#2f9a5b'}], cur, {x0: 50, x1: 420, y0: 320, y1: 56});
    txt(c, '가져간 뒤 남은 양', 50, 48, {size: 11, bold: false, color: SOFT});
    c.fillStyle = '#f4f7fb'; c.fillRect(444, 0, 276, 380);
    const sum = (log, f) => log.reduce((n, row) => n + f(row), 0);
    [['첫째 판: 그대로 쓰기', L.one, '#a35a00'], ['둘째 판: 효율적으로 쓰기', L.two, GOOD]].forEach(([name, log, col], i) => {
      const y = 30 + i * 150;
      txt(c, name, 456, y, {size: 13, color: col});
      txt(c, `가장 낮은 행복도: ${Math.min(...log.at(-1).happy)}`, 456, y + 24, {size: 12, bold: false});
      txt(c, `8회 동안 쓴 ${r.name}: ${sum(log, (row) => row.use[cur])}개`, 456, y + 44, {size: 12, bold: false});
      txt(c, `${cur === 'ore' ? '돌려받은' : '다시 채워진'} ${r.name}: ${sum(log, (row) => row.add[cur])}개`, 456, y + 64, {size: 12, bold: false});
      const z = log.find((row) => row.left[cur] === 0);
      txt(c, z ? `${z.r}회에 처음 0이 됐어요` : '8회까지 0이 되지 않았어요', 456, y + 84, {size: 12, bold: false, color: z ? BAD : GOOD});
    });
    txt(c, '둘째 판 약속 카드', 456, 300, {size: 11, color: SOFT});
    L.cards.forEach((id, i) => txt(c, PROMISES.find((p) => p.id === id)?.name || '', 456, 318 + i * 16, {size: 11, bold: false, color: SOFT}));
    if (L.sample) txt(c, '예시 기록으로 보여 줘요.', 456, 368, {size: 11, bold: false, color: SOFT});
  }
  function renderTray() {
    tray.replaceChildren(seg(el, button, '살펴볼 자원', RES.map((r) => [r.id, r.name]), cur, (id) => {
      cur = id; if (!st.seen.includes(id)) st.seen.push(id);
      const r = RES.find((x) => x.id === id);
      status.textContent = `${r.name} 그래프예요. 두 판의 선이 0에 닿는 때와 오른쪽의 쓴 양을 비교해 보세요.`;
      if (st.seen.length === RES.length && !fired) { fired = true; st.done = true; status.textContent += ' 세 자원을 모두 살펴봤어요.'; onAction('compared'); onReady?.(); }
      draw(); renderTray();
    }));
  }
  draw(); renderTray();
  status.textContent = fired ? '이미 두 판을 비교했어요.' : '광물 그래프부터 보여 줘요. 물과 나무도 골라 두 판을 비교해 봐요.';
  if (fired) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- 새 기술 카드: 깊은 곳의 광물 8개(모형 값, 한 번만)
function ranchTech({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '새 기술 카드 (모형 값)', '광산에 남은 광물 막대 위에 새 기술로 캐낸 광물 8개가 더해지고, 네 목장이 회마다 4개씩 쓰면 막대가 줄어드는 모습');
  const {c, status, tray, node} = d;
  const L = ranchLogs(memory), endRow = L.two.at(-1), base = endRow.left.ore + endRow.add.ore;
  const st = memory['ranch-tech'] ??= {base, hist: [base + 8], done: false};
  let fired = st.done;
  const now = () => st.hist.at(-1);
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef1f6'; c.fillRect(0, 0, 720, 380);
    const total = now(), start = st.base + 8, oldPart = Math.min(total, st.base), newPart = Math.max(0, total - st.base), used = start - total;
    txt(c, '새 기술로 광산 깊은 곳의 광물 8개를 더 캐냈어요', 20, 28, {size: 14});
    // 광산 단면: 위쪽 광산, 아래쪽 깊은 층(새로 캐낸 광물이 있던 자리는 흐리게)
    c.fillStyle = '#c9b48a'; c.fillRect(20, 230, 230, 120); c.fillStyle = '#a88f68'; c.fillRect(20, 300, 230, 50);
    c.fillStyle = '#9a8f86'; c.beginPath(); c.moveTo(20, 230); c.lineTo(135, 64); c.lineTo(250, 230); c.closePath(); c.fill();
    c.fillStyle = '#4b4038'; c.beginPath(); c.arc(135, 230, 26, Math.PI, 0); c.fill();
    c.strokeStyle = '#4b4038'; c.lineWidth = 8; c.beginPath(); c.moveTo(135, 230); c.lineTo(135, 318); c.lineTo(200, 318); c.stroke();
    for (let i = 0; i < 8; i++) { const x = 60 + (i % 4) * 22, y = 318 + Math.floor(i / 4) * 16 - 8; c.fillStyle = 'rgba(224,165,42,.35)'; c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y); c.closePath(); c.fill(); }
    txt(c, '깊은 층', 210, 342, {size: 11, color: '#5e4630'});
    // 막대: 아래는 둘째 판이 끝날 때 남은 광물, 위는 새로 캐낸 광물
    const MAX = Math.max(16, start), k = 220 / MAX, X = 296, Y = 330;
    c.fillStyle = '#ffffff'; c.fillRect(X, Y - MAX * k, 54, MAX * k); c.strokeStyle = '#b9c3cf'; c.lineWidth = 1; c.strokeRect(X, Y - MAX * k, 54, MAX * k);
    c.fillStyle = '#8a5fb8'; c.fillRect(X, Y - oldPart * k, 54, oldPart * k);
    c.fillStyle = '#e0a52a'; c.fillRect(X, Y - (oldPart + newPart) * k, 54, newPart * k);
    if (used) { c.strokeStyle = '#c0392b'; c.setLineDash([5, 4]); c.lineWidth = 1.5; c.strokeRect(X + 1, Y - start * k, 52, used * k); c.setLineDash([]); txt(c, `처음 ${start}개`, X + 27, Y - start * k - 6, {size: 11, color: BAD, align: 'center'}); }
    txt(c, `남은 광물 ${total}개`, X + 27, Y + 20, {size: 13, align: 'center'});
    if (newPart) txt(c, `새로 캐낸 ${newPart}개`, X + 62, Y - (oldPart + newPart / 2) * k + 4, {size: 12, color: '#a35a00'});
    if (oldPart) txt(c, `원래 남은 ${oldPart}개`, X + 62, Y - oldPart / 2 * k + 4, {size: 12, color: '#5b3a8a'});
    // 오른쪽: 회마다 남은 광물
    const n = Math.ceil(start / 4), gx = 500, gy = 290, gw = 196, gh = 190, P = (i, v) => [gx + i * gw / n, gy - v / MAX * gh];
    txt(c, '회마다 남은 광물', gx - 20, 70, {size: 13});
    c.strokeStyle = '#c7d0db'; c.lineWidth = 1;
    for (const v of [0, Math.round(MAX / 2), MAX]) { c.beginPath(); c.moveTo(gx, P(0, v)[1]); c.lineTo(gx + gw, P(0, v)[1]); c.stroke(); txt(c, String(v), gx - 6, P(0, v)[1] + 4, {size: 10, bold: false, color: SOFT, align: 'right'}); }
    for (let i = 0; i <= n; i++) txt(c, i ? `${i}회` : '처음', P(i, 0)[0], gy + 16, {size: 10, bold: false, color: SOFT, align: 'center'});
    c.strokeStyle = '#e0a52a'; c.lineWidth = 3; c.beginPath(); st.hist.forEach((v, i) => (i ? c.lineTo(...P(i, v)) : c.moveTo(...P(i, v)))); c.stroke();
    st.hist.forEach((v, i) => { c.fillStyle = '#e0a52a'; ellipse(c, ...P(i, v), 3.5, 3.5); });
    txt(c, '이번에는 네 목장이 회마다 1개씩 써요.', 470, 334, {size: 11, bold: false, color: SOFT});
    txt(c, '캐낸 광물은 다시 채워지지 않아요.', 470, 352, {size: 11, bold: false, color: SOFT});
    if (!total) chip(c, '광물이 다시 바닥났어요', 135, 54, {bg: '#ffe0d8', color: '#9a2a22', size: 13});
  }
  function renderTray() {
    tray.replaceChildren();
    if (now() > 0) tray.append(button('1회 지나기', () => {
      st.hist.push(Math.max(0, now() - 4));
      status.textContent = `${st.hist.length - 1}회: 광물 4개를 쓰고 ${now()}개 남았어요.`;
      if (!now() && !fired) { fired = true; st.done = true; status.textContent += ' 새 기술로 캐낸 광물까지 모두 바닥났어요.'; onAction('used'); onReady?.(); }
      draw(); renderTray();
    }, 'mission-go'));
  }
  draw(); renderTray();
  status.textContent = fired ? '이미 살펴봤어요.' : `둘째 판이 끝날 때 광산에 광물이 ${st.base}개 남았어요. 새 기술로 8개를 더 캐냈어요. 회를 넘겨 막대가 어떻게 되는지 보세요.`;
  if (fired) later(onReady);
  return {node, stop: () => {}};
}

// ================================================================ 재생에너지 마을(e1-02 명세 값)
// 한 시간마다 마을 필요량: 낮(6~18시) 8, 저녁(18~22시) 12(그 가운데 2는 온수), 밤(22~6시) 5. 예산 20, 사흘 날씨는 아래와 같다.
const FACS = [
  {id: 'sun', name: '태양광 발전', kind: '태양 에너지', res: '태양의 빛', cost: 2, on: ['field', 'roof'], at: '들판이나 마을 지붕', rule: '맑은 낮 3, 흐린 낮 1, 저녁과 밤 0', look: '판이 해를 향해 비스듬히 놓여 있어요.'},
  {id: 'heat', name: '태양열 온수', kind: '태양 에너지', res: '태양의 열', cost: 1, on: ['roof'], at: '마을 지붕', rule: '낮에 데운 물을 저녁에 써요. 맑은 날 2, 흐린 날 1, 온수는 2까지', look: '지붕 위 판 아래에 물탱크가 붙어 있어요.'},
  {id: 'wind', name: '풍력 발전', kind: '풍력', res: '바람', cost: 3, on: ['ridge', 'coast'], at: '산 능선이나 해안', rule: '바람 강함 4, 보통 2, 약함 0', look: '높은 기둥 끝에 커다란 날개가 달려 있어요.'},
  {id: 'hydro', name: '수력 발전', kind: '수력', res: '높은 곳에 있는 물', cost: 4, on: ['river'], at: '강', rule: '비 온 뒤 4, 그 밖의 날 3', look: '높은 곳에서 흘러온 강물을 막아 둔 둑이 있어요.'},
  {id: 'tidal', name: '조력 발전', kind: '해양 에너지', res: '밀물과 썰물', cost: 4, on: ['dam'], at: '바다와 맞닿은 둑', rule: '6시간마다 3과 1을 번갈아 얻어요', look: '바닷물이 들어오고 나가는 길목을 둑으로 막아 두었어요.'},
  {id: 'geo', name: '지열 이용', kind: '지열 에너지', res: '땅속의 열', cost: 3, on: ['heat'], at: '땅속 열이 나오는 곳', rule: '언제나 2', look: '땅속 깊이 관을 묻어 두었어요.'},
  {id: 'bio', name: '바이오 에너지', kind: '바이오 에너지', res: '농작물이나 가축의 배설물', cost: 2, on: ['farmside'], at: '농장 옆', rule: '언제나 1', look: '가축 우리 옆 둥근 통에 가축의 배설물과 짚을 모아 바이오 가스를 얻어요.'},
];
const WEATHER = [{sky: 'clear', rain: false, wind: 'weak', label: '맑음', wl: '바람 약함'}, {sky: 'cloudy', rain: false, wind: 'strong', label: '흐림', wl: '바람 강함'}, {sky: 'clear', rain: true, wind: 'normal', label: '비 온 뒤 맑음', wl: '바람 보통'}];
const PART = (h) => (h >= 6 && h < 18 ? 'day' : h >= 18 && h < 22 ? 'eve' : 'night');
const PNAME = {day: '낮', eve: '저녁', night: '밤'};
const partName = (h) => (h < 6 ? '새벽' : PNAME[PART(h)]);
const NEED = {day: 8, eve: 12, night: 5};
export function facSupply(id, d, h) {
  const w = WEATHER[d], p = PART(h);
  switch (id) {
    case 'sun': return p === 'day' ? (w.sky === 'clear' ? 3 : 1) : 0;
    case 'heat': return p === 'eve' ? (w.sky === 'clear' ? 2 : 1) : 0;
    case 'wind': return {strong: 4, normal: 2, weak: 0}[w.wind];
    case 'hydro': return w.rain ? 4 : 3;
    case 'tidal': return [3, 1, 3, 1][Math.floor(h / 6)];
    case 'geo': return 2;
    case 'bio': return 1;
  }
  return 0;
}
// 온수 필요 2는 태양열 온수로 먼저 채우고(여러 대여도 2까지), 나머지는 다른 시설로 채운다. 공급과 필요가 같으면 부족이 아니다.
export function villageSim(counts, days = 3) {
  const hours = [];
  for (let d = 0; d < days; d++) for (let h = 0; h < 24; h++) {
    let other = 0, hot = 0;
    for (const [id, n] of Object.entries(counts)) { if (!n) continue; const v = facSupply(id, d, h) * n; if (id === 'heat') hot += v; else other += v; }
    const need = NEED[PART(h)], total = other + Math.min(2, hot);
    hours.push({d, h, need, total, short: total < need});
  }
  return {hours, short: hours.filter((x) => x.short).length};
}
const MAP = ['RRFFWFFFCS', 'RHFFWFFFDS', 'RHFFWFFFCS', 'FFFFPFFFDS', 'ABFTTFFFCS', 'ABFTTFFFCS', 'FFFFFFFFCS'];
const CT = {S: 'sea', C: 'coast', D: 'dam', R: 'ridge', H: 'heat', F: 'field', T: 'roof', W: 'river', P: 'pond', A: 'farm', B: 'farmside'};
const TNAME = {sea: '바다', coast: '해안', dam: '바다와 맞닿은 둑', ridge: '산 능선', heat: '땅속 열이 나오는 곳', field: '들판', roof: '마을 지붕', river: '강', pond: '저수지', farm: '농장', farmside: '농장 옆'};
const TSHORT = {coast: '해안', dam: '둑', ridge: '능선', heat: '땅속 열', field: '들판', roof: '지붕', river: '강', farmside: '농장 옆'};
const CELLS = (() => { const n = {}, out = []; MAP.forEach((row, y) => [...row].forEach((ch, x) => { const t = CT[ch]; n[t] = (n[t] || 0) + 1; out.push({x, y, t, key: x + ',' + y, name: t === 'field' ? '들판' : `${TSHORT[t] || TNAME[t]} ${n[t]}`}); })); return out; })();
const MX = 14, MY = 40, CS = 34;
const countsOf = (placed) => { const n = {}; for (const f of Object.values(placed)) n[f] = (n[f] || 0) + 1; return n; };
const costOf = (placed) => Object.values(placed).reduce((s, f) => s + FACS.find((x) => x.id === f).cost, 0);
function facIcon(c, id, x, y, k = 1, spin = 0) {
  c.save(); c.translate(x, y); c.scale(k, k);
  switch (id) {
    case 'sun': c.fillStyle = '#1f3f7a'; c.beginPath(); c.moveTo(-12, 6); c.lineTo(-6, -8); c.lineTo(12, -8); c.lineTo(6, 6); c.closePath(); c.fill(); c.strokeStyle = '#7fb0ff'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, -1); c.lineTo(9, -1); c.moveTo(0, -8); c.lineTo(-3, 6); c.stroke(); c.fillStyle = '#555'; c.fillRect(-1, 6, 2, 6); break;
    case 'heat': c.fillStyle = '#2b4f8a'; c.fillRect(-12, -6, 16, 12); c.fillStyle = '#e8e8e8'; c.fillRect(5, -9, 9, 16); c.strokeStyle = '#888'; c.lineWidth = 1; c.strokeRect(5, -9, 9, 16); break;
    case 'wind': c.strokeStyle = '#f4f6f8'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -4); c.stroke(); c.fillStyle = '#f4f6f8'; for (let i = 0; i < 3; i++) { const a = spin + i * Math.PI * 2 / 3; c.beginPath(); c.moveTo(0, -4); c.lineTo(Math.cos(a) * 13 - Math.sin(a) * 2, -4 + Math.sin(a) * 13 + Math.cos(a) * 2); c.lineTo(Math.cos(a) * 13 + Math.sin(a) * 2, -4 + Math.sin(a) * 13 - Math.cos(a) * 2); c.closePath(); c.fill(); } c.fillStyle = '#7a8796'; ellipse(c, 0, -4, 2.5, 2.5); break;
    case 'hydro': c.fillStyle = '#8b97a5'; c.beginPath(); c.moveTo(-14, -6); c.lineTo(14, -6); c.lineTo(10, 10); c.lineTo(-10, 10); c.closePath(); c.fill(); c.fillStyle = '#ffffff'; c.fillRect(-4, 2, 8, 8); break;
    case 'tidal': c.fillStyle = '#6f7c8b'; c.fillRect(-14, -5, 28, 12); c.fillStyle = '#3f8fd8'; for (let i = -9; i <= 9; i += 9) ellipse(c, i, 2, 3, 3); break;
    case 'geo': c.fillStyle = '#7a8796'; c.fillRect(-3, -10, 6, 22); c.fillStyle = '#e8743a'; ellipse(c, 0, 12, 7, 4); c.fillStyle = '#d0d6de'; c.fillRect(-9, -12, 18, 5); break;
    case 'bio': c.fillStyle = '#4f9a3a'; c.fillRect(-11, -2, 22, 13); c.beginPath(); c.arc(0, -2, 11, Math.PI, 0); c.fill(); c.fillStyle = '#2f6b25'; c.fillRect(-11, 4, 22, 2); break;
  }
  c.restore();
}
function drawCell(c, cell, x, y, s, lit) {
  const col = {sea: '#4f97d8', coast: '#ead9a0', dam: '#ead9a0', ridge: '#9bb07a', heat: '#d9a46a', field: '#b9dd8c', roof: '#b9dd8c', river: '#6cb6ea', pond: '#5aa6e0', farm: '#b9dd8c', farmside: '#d6c48a'}[cell.t];
  c.fillStyle = col; c.fillRect(x, y, s, s);
  const m = s / 34;
  if (cell.t === 'sea') { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 5 * m, y + 14 * m); c.quadraticCurveTo(x + 12 * m, y + 9 * m, x + 19 * m, y + 14 * m); c.moveTo(x + 14 * m, y + 26 * m); c.quadraticCurveTo(x + 21 * m, y + 21 * m, x + 28 * m, y + 26 * m); c.stroke(); }
  if (cell.t === 'dam') { c.fillStyle = '#6f7c8b'; c.fillRect(x + s - 7 * m, y, 7 * m, s); }
  if (cell.t === 'ridge') { c.fillStyle = '#6f8752'; c.beginPath(); c.moveTo(x + 3 * m, y + 30 * m); c.lineTo(x + 17 * m, y + 6 * m); c.lineTo(x + 31 * m, y + 30 * m); c.closePath(); c.fill(); }
  if (cell.t === 'heat') { c.strokeStyle = '#a8462a'; c.lineWidth = 1.5; for (const dx of [10, 18, 26]) { c.beginPath(); c.moveTo(x + dx * m, y + 28 * m); c.quadraticCurveTo(x + (dx - 4) * m, y + 20 * m, x + dx * m, y + 14 * m); c.quadraticCurveTo(x + (dx + 4) * m, y + 9 * m, x + dx * m, y + 4 * m); c.stroke(); } }
  if (cell.t === 'field') { c.fillStyle = '#9fcb6e'; c.fillRect(x + 6 * m, y + 22 * m, 6 * m, 2); c.fillRect(x + 20 * m, y + 10 * m, 6 * m, 2); }
  if (cell.t === 'river' || cell.t === 'pond') { c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 12 * m, y + 4 * m); c.lineTo(x + 12 * m, y + 14 * m); c.moveTo(x + 22 * m, y + 18 * m); c.lineTo(x + 22 * m, y + 28 * m); c.stroke(); }
  if (cell.t === 'roof') { c.fillStyle = '#f3ead8'; c.fillRect(x + 6 * m, y + 15 * m, 22 * m, 15 * m); c.fillStyle = '#c0533e'; c.beginPath(); c.moveTo(x + 3 * m, y + 16 * m); c.lineTo(x + 17 * m, y + 4 * m); c.lineTo(x + 31 * m, y + 16 * m); c.closePath(); c.fill(); c.fillStyle = lit ? '#ffd34d' : '#3a4656'; c.fillRect(x + 10 * m, y + 19 * m, 6 * m, 6 * m); c.fillRect(x + 19 * m, y + 19 * m, 6 * m, 6 * m); }
  if (cell.t === 'farm') { c.fillStyle = '#b5452f'; c.fillRect(x + 6 * m, y + 12 * m, 22 * m, 18 * m); c.fillStyle = '#7a2f22'; c.beginPath(); c.moveTo(x + 4 * m, y + 13 * m); c.lineTo(x + 17 * m, y + 4 * m); c.lineTo(x + 30 * m, y + 13 * m); c.closePath(); c.fill(); }
  if (cell.t === 'farmside') { c.fillStyle = '#e3c25a'; ellipse(c, x + 17 * m, y + 22 * m, 9 * m, 6 * m); }
  c.strokeStyle = 'rgba(40,60,80,.18)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}
function drawVillage(c, placed, {hour = null, hours = null, spin = 0, ox = MX, oy = MY, s = CS, sel = null} = {}) {
  const hr = hour === null ? null : hours?.[hour];
  const lit = !hr || !hr.short;
  for (const cell of CELLS) {
    const x = ox + cell.x * s, y = oy + cell.y * s;
    drawCell(c, cell, x, y, s, lit);
    const f = placed[cell.key];
    if (f) facIcon(c, f, x + s / 2, y + s / 2, s / 34, spin);
    if (sel && !f && sel.on.includes(cell.t)) { c.strokeStyle = '#ffd34d'; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, s - 4, s - 4); }
  }
  if (hr) {
    const p = PART(hr.h % 24); c.fillStyle = p === 'night' ? 'rgba(10,20,50,.5)' : p === 'eve' ? 'rgba(40,30,80,.3)' : 'rgba(0,0,0,0)'; c.fillRect(ox, oy, s * 10, s * 7);
    if (!lit) { for (const cell of CELLS.filter((q) => q.t === 'roof')) { c.fillStyle = '#3a4656'; c.fillRect(ox + cell.x * s + 10 * s / 34, oy + cell.y * s + 19 * s / 34, 6 * s / 34, 6 * s / 34); c.fillRect(ox + cell.x * s + 19 * s / 34, oy + cell.y * s + 19 * s / 34, 6 * s / 34, 6 * s / 34); } chip(c, '전기가 모자라요', ox + 4 * s, oy + 4 * s - 4, {bg: '#ffe0d8', color: '#9a2a22', size: 11}); }
    else if (p !== 'day') for (const cell of CELLS.filter((q) => q.t === 'roof')) { c.fillStyle = 'rgba(255,211,77,.35)'; ellipse(c, ox + cell.x * s + s / 2, oy + cell.y * s + s * 0.65, s * 0.5, s * 0.35); }
  }
}
function drawChart(c, sim, upto, {x0 = 380, y0 = 334, w = 324, k = 4, mark = null} = {}) {
  const bw = w / 72;
  for (let i = 0; i < 72; i++) { if (PART(i % 24) === 'night') { c.fillStyle = '#e9edf3'; c.fillRect(x0 + i * bw, y0 - 24 * k, bw, 24 * k); } }
  if (sim) sim.hours.slice(0, upto).forEach((hr, i) => { const v = Math.min(24, hr.total); c.fillStyle = hr.short ? '#e8a09a' : '#5bb37a'; c.fillRect(x0 + i * bw + 0.5, y0 - v * k, bw - 1, v * k); if (hr.short) { c.fillStyle = '#d9534f'; c.fillRect(x0 + i * bw + 0.5, y0 - hr.need * k, bw - 1, (hr.need - v) * k); } });
  c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath();
  for (let i = 0; i < 72; i++) { const y = y0 - NEED[PART(i % 24)] * k; i ? c.lineTo(x0 + i * bw, y) : c.moveTo(x0, y); c.lineTo(x0 + (i + 1) * bw, y); }
  c.stroke();
  c.strokeStyle = '#9aa6b5'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + w, y0); c.stroke();
  for (let d = 0; d < 3; d++) { if (d) { c.beginPath(); c.moveTo(x0 + d * 24 * bw, y0 - 24 * k); c.lineTo(x0 + d * 24 * bw, y0); c.stroke(); } txt(c, `${d + 1}일`, x0 + (d + 0.5) * 24 * bw, y0 + 14, {size: 11, bold: false, color: SOFT, align: 'center'}); }
  if (mark !== null) { c.strokeStyle = '#e0a52a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + (mark + 0.5) * bw, y0 - 24 * k - 4); c.lineTo(x0 + (mark + 0.5) * bw, y0); c.stroke(); }
}
function weatherRow(c, x, y) {
  WEATHER.forEach((w, d) => {
    const bx = x + d * 110;
    c.fillStyle = '#ffffff'; rr(c, bx, y, 102, 50, 6); c.fill(); c.strokeStyle = '#c7d0db'; c.lineWidth = 1; c.stroke();
    txt(c, `${d + 1}일`, bx + 8, y + 17, {size: 12});
    if (w.sky === 'clear') sunIcon(c, bx + 84, y + 15, 7); else cloudIcon(c, bx + 82, y + 15, 0.8);
    if (w.rain) drop(c, bx + 66, y + 16);
    txt(c, w.label, bx + 8, y + 33, {size: 10.5, bold: false});
    txt(c, w.wl, bx + 8, y + 46, {size: 10.5, bold: false, color: SOFT});
  });
}
export function villageBoard(props) {
  const mode = props.mode;
  if (mode === 'cards') return facilityCards(props);
  if (mode === 'oil') return oilVillage(props);
  if (mode === 'review') return villageReview(props);
  if (mode === 'coast') return coastVillage(props);
  return villagePlan(props);
}

// ---------------------------------------------------------------- 마을 설계: 예산 20, 사흘 날씨
const firstEmpty = (placed, t) => CELLS.find((q) => q.t === t && !placed[q.key]);
function villagePlan({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '2026년 에너지관 마을 지도 (모형 값)', '가로 10칸, 세로 7칸 마을 지도. 산 능선, 땅속 열이 나오는 곳, 강, 저수지, 들판, 마을 지붕, 농장, 해안, 바다와 맞닿은 둑, 바다가 있다. 오른쪽에 예산, 사흘 날씨, 공급과 필요 그래프가 있다.');
  const {c, status, tray, node, canvas} = d;
  const st = memory['village-plan'] ??= {placed: {}, order: [], tries: 0, done: false, last: null};
  let sel = null, sim = st.last !== null ? villageSim(countsOf(st.placed)) : null, upto = sim ? 72 : 0, playing = false, days = 3, alive = true, raf = 0, spin = 0, fired = st.done, t0 = 0, party = 0;
  function draw() {
    if (!alive) return;
    if (playing) { upto = Math.min(days * 24, reduceMotion() ? days * 24 : Math.floor((performance.now() - t0) / 40)); if (upto >= days * 24) { playing = false; finishRun(); } }
    const hour = playing || upto ? Math.max(0, upto - 1) : null, hr = hour !== null ? sim?.hours[hour] : null;
    if (playing && hr) spin += facSupply('wind', hr.d, hr.h) * 0.05;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#f2f6f9'; c.fillRect(0, 0, 720, 380);
    txt(c, '마을 지도', MX, 26, {size: 14});
    drawVillage(c, st.placed, {hour: playing ? hour : null, hours: sim?.hours, spin, sel});
    // 아래: 놓은 시설과 진행 시각
    const n = countsOf(st.placed), list = FACS.filter((f) => n[f.id]).map((f) => `${f.name} ${n[f.id]}`);
    wrap(c, list.length ? '놓은 시설: ' + list.join(', ') : '놓은 시설이 아직 없어요.', MX, 300, 340, 16, {size: 11.5});
    if (hr && playing) txt(c, `${hr.d + 1}일 ${hr.h}시 ${partName(hr.h)}, ${WEATHER[hr.d].label}, ${WEATHER[hr.d].wl}`, MX, 352, {size: 12});
    if (hr && playing) txt(c, `공급 ${hr.total}, 필요 ${hr.need}`, MX, 370, {size: 12, color: hr.short ? BAD : GOOD});
    // 오른쪽
    const used = costOf(st.placed);
    txt(c, `쓴 예산 ${used} / 20`, 380, 24, {size: 13});
    meter(c, 380, 30, 324, 8, used / 20, used > 20 ? BAD : '#e0a52a');
    weatherRow(c, 380, 46);
    if (sel) { txt(c, `${sel.name}, 비용 ${sel.cost}`, 380, 120, {size: 13}); txt(c, `${sel.res}, ${sel.at}`, 380, 138, {size: 11.5, bold: false}); wrap(c, sel.rule, 380, 155, 324, 15, {size: 11.5, color: SOFT}); }
    else { txt(c, '시설을 골라 지도에 놓아요.', 380, 120, {size: 12, bold: false, color: SOFT}); txt(c, '부족한 시간이 없게 하는 것이 목표예요.', 380, 138, {size: 12, bold: false, color: SOFT}); }
    txt(c, '공급과 필요', 380, 210, {size: 12});
    c.fillStyle = '#5bb37a'; c.fillRect(470, 202, 10, 8); txt(c, '공급', 484, 210, {size: 10.5, bold: false});
    c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(520, 206); c.lineTo(536, 206); c.stroke(); txt(c, '필요', 540, 210, {size: 10.5, bold: false});
    c.fillStyle = '#d9534f'; c.fillRect(578, 202, 10, 8); txt(c, '모자람', 592, 210, {size: 10.5, bold: false});
    drawChart(c, sim, upto);
    if (sim && !playing && upto) txt(c, `${days === 1 ? '1일' : '사흘'} 동안 부족한 시간 ${sim.hours.slice(0, days * 24).filter((x) => x.short).length}시간`, 380, 370, {size: 13, color: sim.hours.slice(0, days * 24).some((x) => x.short) ? BAD : GOOD});
    txt(c, `사흘 진행 ${st.tries}번`, 704, 370, {size: 11, bold: false, color: SOFT, align: 'right'});
    cheer(c, party, MX + 5 * CS, MY + 3.5 * CS, '새롬: 밤에도 마을 불이 환해요');
    raf = requestAnimationFrame(draw);
  }
  function put(cell) {
    if (playing) return;
    const f = st.placed[cell.key];
    if (f && (!sel || sel.id === f || !sel.on.includes(cell.t))) { delete st.placed[cell.key]; st.order = st.order.filter((k) => k !== cell.key); status.textContent = `${cell.name}의 ${jo(FACS.find((x) => x.id === f).name, '을', '를')} 뺐어요.`; changed(); return; }
    if (!sel) { const can = FACS.filter((x) => x.on.includes(cell.t)).map((x) => x.name).join(', '); status.textContent = can ? `${cell.name}에는 ${jo(can, '을', '를')} 놓을 수 있어요. 먼저 아래에서 시설을 골라 주세요.` : `${TNAME[cell.t]}에는 시설을 놓지 않아요.`; return; }
    if (!sel.on.includes(cell.t)) { status.textContent = `${jo(sel.name, '은', '는')} ${sel.at}에만 놓을 수 있어요.`; return; }
    if (costOf(st.placed) - (f ? FACS.find((x) => x.id === f).cost : 0) + sel.cost > 20) { status.textContent = '예산이 모자라요. 다른 시설을 빼고 놓아 봐요.'; return; }
    st.placed[cell.key] = sel.id; st.order = [...st.order.filter((k) => k !== cell.key), cell.key];
    status.textContent = `${cell.name}에 ${jo(sel.name, '을', '를')} 놓았어요. 남은 예산 ${20 - costOf(st.placed)}.`;
    changed();
  }
  function changed() { sim = null; upto = 0; renderTray(); }
  function run(n) {
    if (playing) return;
    if (!Object.keys(st.placed).length) { status.textContent = '먼저 시설을 하나 이상 놓아 주세요.'; return; }
    days = n; sim = villageSim(countsOf(st.placed)); upto = 0; t0 = performance.now(); playing = true;
    if (n === 3) st.tries++;
    status.textContent = n === 1 ? '1일을 시험해요.' : '사흘을 진행해요.';
    renderTray();
  }
  function finishRun() {
    const hrs = sim.hours.slice(0, days * 24), short = hrs.filter((x) => x.short), f = short[0];
    const where = f ? ` 처음 모자란 때는 ${f.d + 1}일 ${f.h}시 ${partName(f.h)}, ${WEATHER[f.d].label}, ${WEATHER[f.d].wl}일 때예요. 그때 에너지를 얻을 수 있는 시설을 찾아봐요.` : '';
    if (days === 1) { status.textContent = `1일 동안 부족한 시간은 ${short.length}시간이에요.` + (where || ' 사흘 진행도 해 봐요.'); renderTray(); return; }
    st.last = short.length;
    const pass = short.length === 0 || (st.tries >= 3 && short.length <= 2);
    if (pass) {
      status.textContent = short.length ? `부족한 시간이 ${short.length}시간으로 줄었어요. 세 번 넘게 고쳐 거의 끊기지 않는 마을을 만들었어요.` : '사흘 동안 부족한 시간이 한 시간도 없었어요. 마을의 불이 꺼지지 않았어요.';
      party = performance.now();
      if (!fired) { fired = true; st.done = true; st.plan = {...st.placed}; onAction('lit'); onReady?.(); }
      else st.plan = {...st.placed};
    } else status.textContent = `사흘 동안 부족한 시간이 ${short.length}시간이에요.` + where;
    renderTray();
  }
  function renderTray() {
    tray.replaceChildren(seg(el, button, '시설', FACS.map((f) => [f.id, f.name]), sel?.id, (id) => { sel = sel?.id === id ? null : FACS.find((f) => f.id === id); status.textContent = sel ? `${jo(sel.name, '은', '는')} ${jo(sel.res, '을', '를')} 이용해요. 놓을 곳 ${sel.at}, 비용 ${sel.cost}. 지도에서 노란 테두리 칸을 누르거나 아래에서 놓을 곳을 골라요.` : '시설 고르기를 풀었어요.'; renderTray(); }));
    if (sel) {
      const spots = []; const seen = new Set();
      for (const q of CELLS) { if (!sel.on.includes(q.t) || st.placed[q.key]) continue; if (q.t === 'field') { if (seen.has('field')) continue; seen.add('field'); spots.push([q.key, '들판 빈칸']); } else spots.push([q.key, q.name]); }
      tray.append(spots.length ? seg(el, button, '놓을 곳', spots, null, (key) => put(CELLS.find((q) => q.key === key))) : el('p', {class: 'bench-wire'}, '놓을 수 있는 빈칸이 없어요.'));
    }
    const undo = button('마지막에 놓은 시설 빼기', () => { const k = st.order.at(-1); if (!k) return; const cell = CELLS.find((q) => q.key === k), f = st.placed[k]; delete st.placed[k]; st.order.pop(); status.textContent = `${cell.name}의 ${jo(FACS.find((x) => x.id === f).name, '을', '를')} 뺐어요.`; changed(); }, 'bench-opt');
    const clear = button('모두 빼기', () => { st.placed = {}; st.order = []; status.textContent = '시설을 모두 뺐어요.'; changed(); }, 'bench-opt');
    undo.disabled = clear.disabled = !st.order.length || playing;
    tray.append(undo, clear, button('1일 시험', () => run(1), 'bench-opt'), button('사흘 진행', () => run(3), 'mission-go'));
  }
  canvas.addEventListener('click', (e) => { const p = where(canvas, e), x = Math.floor((p.x - MX) / CS), y = Math.floor((p.y - MY) / CS); const cell = CELLS.find((q) => q.x === x && q.y === y); if (cell) put(cell); });
  renderTray();
  status.textContent = fired ? '이미 마을을 설계했어요. 다시 고쳐 봐도 기록은 그대로 남아요.' : '시설을 골라 지도에 놓고 사흘을 진행해 봐요. 칸을 다시 누르면 놓은 시설을 뺄 수 있어요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 설계 돌아보기: 태양광만 놓은 마을과 내 마을
const SOLAR_ONLY = (() => { const p = {}; CELLS.filter((q) => q.t === 'roof').forEach((q) => { p[q.key] = 'sun'; }); CELLS.filter((q) => q.t === 'field').slice(10, 16).forEach((q) => { p[q.key] = 'sun'; }); return p; })();
const SAMPLE_PLAN = (() => { const p = {}; const add = (t, f, n) => CELLS.filter((q) => q.t === t).slice(0, n).forEach((q) => { p[q.key] = f; }); add('river', 'hydro', 2); add('heat', 'geo', 2); add('farmside', 'bio', 2); add('roof', 'heat', 2); return p; })();
const TIMES = [['noon', '낮 12시', 12], ['eve', '저녁 8시', 20], ['late', '새벽 2시', 2]];
function villageReview({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '설계 돌아보기 (모형 값)', '태양광 발전만 10개 놓은 마을과 내가 설계한 마을의 지도, 고른 시각의 마을 불빛, 사흘 공급과 필요 그래프');
  const {c, status, tray, node} = d;
  const mine = memory['village-plan']?.plan || memory['village-plan']?.done && memory['village-plan'].placed;
  const plans = {solar: SOLAR_ONLY, mine: mine && Object.keys(mine).length ? mine : SAMPLE_PLAN};
  const sims = {solar: villageSim(countsOf(plans.solar)), mine: villageSim(countsOf(plans.mine))};
  const st = memory['village-review'] ??= {seen: [], dark: false, done: false};
  let view = 'solar', day = 0, time = 'eve', fired = st.done;
  const hourIdx = () => day * 24 + TIMES.find((t) => t[0] === time)[2];
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#f2f6f9'; c.fillRect(0, 0, 720, 380);
    const sim = sims[view], hi = hourIdx(), hr = sim.hours[hi];
    txt(c, view === 'solar' ? '태양광 발전만 10개 놓은 마을' : mine ? '내가 설계한 마을' : '설계 예시 마을', MX, 26, {size: 14});
    drawVillage(c, plans[view], {hour: hi, hours: sim.hours});
    txt(c, `${day + 1}일 ${TIMES.find((t) => t[0] === time)[1]}, ${WEATHER[day].label}, ${WEATHER[day].wl}`, MX, 304, {size: 12});
    txt(c, `공급 ${hr.total}, 필요 ${hr.need}`, MX, 324, {size: 13, color: hr.short ? BAD : GOOD});
    txt(c, hr.short ? '전기가 모자라 마을 불이 꺼졌어요.' : '마을에 필요한 만큼 전기를 얻고 있어요.', MX, 344, {size: 12, bold: false});
    const n = countsOf(plans[view]);
    wrap(c, FACS.filter((f) => n[f.id]).map((f) => `${f.name} ${n[f.id]}`).join(', '), MX, 364, 340, 14, {size: 11, color: SOFT});
    weatherRow(c, 380, 20);
    txt(c, '사흘 공급과 필요', 380, 100, {size: 12});
    drawChart(c, sim, 72, {mark: hi, y0: 300});
    txt(c, `사흘 동안 부족한 시간 ${sim.short}시간`, 380, 346, {size: 13, color: sim.short ? BAD : GOOD});
  }
  function check() {
    if (!st.seen.includes(view)) st.seen.push(view);
    if (view === 'solar' && time !== 'noon') st.dark = true;
    if (!fired && st.seen.length === 2 && st.dark) { fired = true; st.done = true; status.textContent += ' 두 마을을 모두 살펴봤어요.'; onAction('reviewed'); onReady?.(); }
  }
  function say() { const hr = sims[view].hours[hourIdx()]; status.textContent = `${view === 'solar' ? '태양광만 놓은 마을' : '내 마을'}, ${day + 1}일 ${TIMES.find((t) => t[0] === time)[1]}: 공급 ${hr.total}, 필요 ${hr.need}. ` + (hr.short ? '전기가 모자라요.' : '끊기지 않았어요.'); }
  function renderTray() {
    tray.replaceChildren(
      seg(el, button, '마을', [['solar', '태양광만 놓은 마을'], ['mine', '내가 설계한 마을']], view, (v) => { view = v; say(); check(); draw(); renderTray(); }),
      seg(el, button, '날', [[0, '1일'], [1, '2일'], [2, '3일']], day, (v) => { day = v; say(); check(); draw(); renderTray(); }),
      seg(el, button, '시각', TIMES.map(([id, n]) => [id, n]), time, (v) => { time = v; say(); check(); draw(); renderTray(); }));
  }
  draw(); renderTray();
  status.textContent = fired ? '이미 두 마을을 살펴봤어요.' : '마을과 날, 시각을 바꾸며 불빛과 그래프를 비교해 봐요.';
  if (fired) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- 재생에너지 시설 카드(크게 보기)
function facScene(c, id, t) {
  // 시설이 놓이는 곳과 함께 그린다. 영역: x 16~456, y 64~360
  c.save(); c.beginPath(); c.rect(16, 64, 440, 296); c.clip();
  c.fillStyle = '#dff0fb'; c.fillRect(16, 64, 440, 296);
  const ground = (col, y = 280) => { c.fillStyle = col; c.fillRect(16, y, 440, 360 - y); };
  switch (id) {
    case 'sun':
      sunIcon(c, 400, 104, 16); ground('#b9dd8c', 270);
      for (let i = 0; i < 3; i++) { const x = 70 + i * 120; c.fillStyle = '#555'; c.fillRect(x + 40, 262, 5, 30); c.fillStyle = '#1f3f7a'; c.beginPath(); c.moveTo(x, 270); c.lineTo(x + 20, 222); c.lineTo(x + 100, 222); c.lineTo(x + 80, 270); c.closePath(); c.fill(); c.strokeStyle = '#7fb0ff'; c.lineWidth = 1; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 25, 270); c.lineTo(x + 20 + k * 20, 222); c.stroke(); } }
      break;
    case 'heat':
      sunIcon(c, 400, 104, 16); ground('#b9dd8c', 300);
      c.fillStyle = '#f3ead8'; c.fillRect(110, 210, 230, 92); c.fillStyle = '#c0533e'; c.beginPath(); c.moveTo(90, 214); c.lineTo(225, 130); c.lineTo(360, 214); c.closePath(); c.fill();
      c.fillStyle = '#2b4f8a'; c.save(); c.translate(250, 168); c.rotate(0.55); c.fillRect(-44, -12, 88, 22); c.restore();
      c.fillStyle = '#e8e8e8'; c.fillRect(214, 150, 56, 20); c.strokeStyle = '#888'; c.strokeRect(214, 150, 56, 20);
      c.strokeStyle = '#d9534f'; c.lineWidth = 3; c.beginPath(); c.moveTo(240, 172); c.lineTo(240, 240); c.stroke();
      break;
    case 'wind':
      c.fillStyle = '#9bb07a'; c.beginPath(); c.moveTo(16, 360); c.lineTo(16, 260); c.quadraticCurveTo(200, 170, 456, 250); c.lineTo(456, 360); c.closePath(); c.fill();
      for (const [x, y] of [[170, 214], [330, 214]]) { c.strokeStyle = '#f4f6f8'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 110); c.stroke(); for (let i = 0; i < 3; i++) { const a = t + i * Math.PI * 2 / 3; c.strokeStyle = '#f4f6f8'; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y - 110); c.lineTo(x + Math.cos(a) * 52, y - 110 + Math.sin(a) * 52); c.stroke(); } c.fillStyle = '#7a8796'; ellipse(c, x, y - 110, 6, 6); }
      c.strokeStyle = 'rgba(80,120,160,.6)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { const y = 100 + i * 22; c.beginPath(); c.moveTo(30 + i * 12, y); c.quadraticCurveTo(70, y - 8, 110 + i * 12, y); c.stroke(); }
      break;
    case 'hydro':
      c.fillStyle = '#8fa58a'; c.beginPath(); c.moveTo(16, 230); c.lineTo(110, 110); c.lineTo(200, 200); c.lineTo(290, 120); c.lineTo(456, 230); c.lineTo(456, 360); c.lineTo(16, 360); c.closePath(); c.fill();
      c.fillStyle = '#6cb6ea'; c.beginPath(); c.moveTo(170, 200); c.lineTo(250, 200); c.lineTo(250, 250); c.lineTo(150, 250); c.closePath(); c.fill();
      c.fillStyle = '#8b97a5'; c.beginPath(); c.moveTo(250, 190); c.lineTo(276, 190); c.lineTo(296, 300); c.lineTo(250, 300); c.closePath(); c.fill();
      c.fillStyle = '#6cb6ea'; c.beginPath(); c.moveTo(296, 290); c.quadraticCurveTo(380, 300, 456, 340); c.lineTo(456, 360); c.lineTo(296, 360); c.closePath(); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(300, 270, 40, 26); c.fillStyle = '#c0533e'; c.fillRect(298, 262, 44, 9);
      break;
    case 'tidal':
      c.fillStyle = '#4f97d8'; c.fillRect(16, 200, 440, 160);
      c.fillStyle = '#ead9a0'; c.fillRect(16, 150, 440, 60);
      c.fillStyle = '#6cb6ea'; c.fillRect(16, 210, 200, 150);
      c.fillStyle = '#6f7c8b'; c.fillRect(210, 200, 22, 160);
      for (let y = 230; y < 350; y += 34) { c.fillStyle = '#3a4656'; c.fillRect(212, y, 18, 14); }
      c.strokeStyle = '#ffffff'; c.lineWidth = 3; const dx = Math.sin(t * 0.6) * 20;
      c.beginPath(); c.moveTo(300 + dx, 280); c.lineTo(250 + dx, 280); c.moveTo(262 + dx, 272); c.lineTo(250 + dx, 280); c.lineTo(262 + dx, 288); c.stroke();
      txt(c, '바다', 380, 330, {size: 13, color: '#ffffff'}); txt(c, '호수처럼 막힌 바다', 40, 340, {size: 12, color: '#1d4f86'});
      break;
    case 'geo':
      ground('#9b7a52', 200); c.fillStyle = '#7d5e3c'; c.fillRect(16, 260, 440, 50); c.fillStyle = '#5e4630'; c.fillRect(16, 310, 440, 50);
      c.fillStyle = 'rgba(232,116,58,.6)'; ellipse(c, 236, 352, 160, 30);
      c.fillStyle = '#f3ead8'; c.fillRect(170, 132, 130, 70); c.fillStyle = '#c0533e'; c.beginPath(); c.moveTo(156, 136); c.lineTo(235, 92); c.lineTo(314, 136); c.closePath(); c.fill();
      c.strokeStyle = '#d0d6de'; c.lineWidth = 7; c.beginPath(); c.moveTo(220, 200); c.lineTo(220, 345); c.moveTo(250, 345); c.lineTo(250, 200); c.stroke();
      break;
    case 'bio':
      ground('#b9dd8c', 270);
      c.fillStyle = '#b5452f'; c.fillRect(50, 180, 150, 100); c.fillStyle = '#7a2f22'; c.beginPath(); c.moveTo(40, 184); c.lineTo(125, 130); c.lineTo(210, 184); c.closePath(); c.fill();
      c.fillStyle = '#4f9a3a'; c.fillRect(270, 210, 120, 70); c.beginPath(); c.arc(330, 210, 60, Math.PI, 0); c.fill();
      c.strokeStyle = '#7a8796'; c.lineWidth = 5; c.beginPath(); c.moveTo(200, 262); c.lineTo(270, 262); c.stroke();
      c.fillStyle = '#e3c25a'; ellipse(c, 230, 300, 20, 10);
      c.fillStyle = '#fafafa'; ellipse(c, 120, 310, 20, 11); c.fillStyle = '#3a3a3a'; ellipse(c, 114, 308, 5, 4);
      break;
  }
  c.restore();
  c.strokeStyle = '#9aa6b5'; c.lineWidth = 1.5; c.strokeRect(16, 64, 440, 296);
}
function facilityCards({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '에너지관 재생에너지 시설 카드', '재생에너지 시설 카드 일곱 장. 고른 카드의 시설 모습과 시설이 놓이는 곳을 크게 그린 그림');
  const {c, status, tray, node} = d;
  const st = memory['village-cards'] ??= {seen: [], done: false};
  let cur = st.seen.length ? FACS.find((f) => f.id === st.seen.at(-1)) : null, fired = st.done, alive = true, raf = 0, t = 0;
  function draw() {
    if (!alive) return;
    t += reduceMotion() ? 0 : 0.03;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef3f7'; c.fillRect(0, 0, 720, 380);
    FACS.forEach((f, i) => {
      const x = 16 + i * 98, on = cur === f, seen = st.seen.includes(f.id);
      c.fillStyle = on ? '#ffe08a' : seen ? '#e2efe0' : '#ffffff'; rr(c, x, 10, 92, 42, 6); c.fill(); c.strokeStyle = on ? '#c98a00' : '#b9c3cf'; c.lineWidth = on ? 2 : 1; c.stroke();
      c.fillStyle = '#9cc3e4'; ellipse(c, x + 15, 31, 12, 12); facIcon(c, f.id, x + 15, 32, 0.65, 0.4);
      txt(c, f.name.replace(' 발전', '').replace(' 이용', '').replace(' 에너지', ''), x + 61, 36, {size: 11, align: 'center', color: INK});
    });
    if (cur) {
      facScene(c, cur.id, t);
      txt(c, cur.name, 476, 90, {size: 18}); const kl = `재생에너지 종류: ${cur.kind}`; c.font = FONT(11, true); chip(c, kl, 476 + (c.measureText(kl).width + 14) / 2, 116, {bg: '#e2efe0', color: '#1f6b47', size: 11});
      txt(c, '놓이는 곳', 476, 140, {size: 12, color: SOFT}); txt(c, cur.at, 476, 158, {size: 14});
      txt(c, '살펴볼 점', 476, 186, {size: 12, color: SOFT}); wrap(c, cur.look, 476, 204, 228, 18, {size: 13});
      txt(c, `본 카드 ${st.seen.length} / 7`, 476, 350, {size: 12, color: SOFT});
    } else { c.fillStyle = '#ffffff'; c.fillRect(16, 64, 688, 296); txt(c, '카드를 고르면 시설 모습을 크게 볼 수 있어요.', 360, 210, {size: 15, align: 'center', color: SOFT}); }
    raf = requestAnimationFrame(draw);
  }
  function pick(id) {
    cur = FACS.find((f) => f.id === id); if (!st.seen.includes(id)) st.seen.push(id);
    status.textContent = `${cur.name}: ${cur.kind}의 하나예요. ${cur.at}에 있어요. ${cur.look}`;
    if (st.seen.length === FACS.length && !fired) { fired = true; st.done = true; status.textContent += ' 카드 일곱 장을 모두 봤어요.'; onAction('viewed'); onReady?.(); }
    renderTray();
  }
  function renderTray() {
    tray.replaceChildren(seg(el, button, '시설 카드', FACS.map((f) => [f.id, f.name]), cur?.id, pick));
    const next = FACS.find((f) => !st.seen.includes(f.id));
    if (next) tray.append(button('다음 카드 보기', () => pick(next.id), 'mission-go'));
  }
  renderTray();
  status.textContent = fired ? '이미 카드를 모두 봤어요.' : '카드를 눌러 시설 모습과 놓이는 곳을 크게 봐요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 석유 발전기 하나뿐인 2050년 마을(모형 값: 하루에 석유 10)
function oilVillage({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '2050년 석유 발전기 마을 (모형 값)', '석유 발전기 하나로 전기를 얻는 마을. 석유 창고의 양, 굴뚝 매연, 집 창문 불빛이 날마다 바뀐다.');
  const {c, status, tray, node} = d;
  const st = memory['village-oil'] ??= {day: 0, order: false, done: false};
  let fired = st.done, alive = true, raf = 0, t = 0;
  const tank = () => Math.max(0, 30 - st.day * 10);
  function draw() {
    if (!alive) return;
    t += reduceMotion() ? 0 : 0.02;
    c.setTransform(2, 0, 0, 2, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#3a3f6b'); g.addColorStop(1, '#d98a5a'); c.fillStyle = g; c.fillRect(0, 0, 720, 380);
    c.fillStyle = `rgba(120,120,120,${Math.min(0.55, st.day * 0.17)})`; c.fillRect(0, 0, 720, 260);
    c.fillStyle = '#5c6b4a'; c.fillRect(0, 260, 720, 120);
    const on = tank() > 0;
    // 집들
    for (let i = 0; i < 5; i++) { const x = 40 + i * 80; c.fillStyle = '#e9dcc4'; c.fillRect(x, 220, 60, 44); c.fillStyle = '#8a3a2a'; c.beginPath(); c.moveTo(x - 6, 222); c.lineTo(x + 30, 196); c.lineTo(x + 66, 222); c.closePath(); c.fill(); c.fillStyle = on ? '#ffd34d' : '#2c3442'; c.fillRect(x + 10, 232, 14, 12); c.fillRect(x + 36, 232, 14, 12); }
    // 발전기
    c.fillStyle = '#7d8794'; c.fillRect(470, 190, 110, 76); c.fillStyle = '#5a6370'; c.fillRect(546, 120, 18, 72);
    if (on && st.day > 0) for (let i = 0; i < 2 + st.day * 2; i++) { const k = (t * 0.6 + i / (2 + st.day * 2)) % 1; c.fillStyle = `rgba(90,90,90,${0.55 * (1 - k)})`; ellipse(c, 556 + k * 70, 112 - k * 90, 12 + k * 22, 9 + k * 14); }
    txt(c, '석유 발전기', 525, 290, {size: 13, color: '#ffffff', align: 'center'});
    if (!on) chip(c, '발전기가 멈췄어요', 525, 180, {bg: '#ffe0d8', color: '#9a2a22', size: 13});
    // 석유 창고
    c.fillStyle = '#ffffff'; rr(c, 610, 140, 90, 130, 8); c.fill();
    txt(c, '석유 창고', 655, 160, {size: 12, align: 'center'});
    c.fillStyle = '#dfe7ef'; c.fillRect(636, 170, 38, 80); c.fillStyle = '#3a3a3a'; c.fillRect(636, 250 - tank() / 30 * 80, 38, tank() / 30 * 80);
    txt(c, `${tank()}통 남음`, 655, 264, {size: 12, align: 'center', color: tank() ? INK : BAD});
    txt(c, st.day ? `${st.day}일째 밤` : '첫날 저녁', 20, 30, {size: 16, color: '#ffffff'});
    txt(c, '하루에 석유 10통을 써요.', 20, 52, {size: 12, bold: false, color: '#ffffff'});
    if (st.order) {
      c.fillStyle = '#ffffff'; rr(c, 230, 40, 280, 120, 8); c.fill();
      txt(c, '이웃 마을의 답장', 246, 64, {size: 13});
      txt(c, '우리 마을 석유 창고에도 12통밖에 없어요.', 246, 88, {size: 12, bold: false});
      txt(c, '우리도 날마다 석유 10통을 써요.', 246, 108, {size: 12, bold: false});
      c.fillStyle = '#dfe7ef'; c.fillRect(246, 122, 240, 12); c.fillStyle = '#3a3a3a'; c.fillRect(246, 122, 240 * 12 / 30, 12);
      txt(c, '이웃 마을 창고', 246, 152, {size: 11, bold: false, color: SOFT});
    }
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    if (st.day < 3) tray.append(button('하루 보내기', () => {
      st.day++;
      status.textContent = st.day < 3 ? `${st.day}일째: 석유 10통을 태워 전기를 얻었어요. 석유가 ${tank()}통 남았고, 굴뚝 매연으로 하늘이 더 뿌옇게 됐어요.` : '3일째 밤: 석유가 바닥나 발전기가 멈췄어요. 마을 창문의 불이 모두 꺼졌어요. 척척 말대로 이웃 마을에 석유를 주문해 봐요.';
      renderTray();
    }, 'mission-go'));
    else if (!st.order) tray.append(button('이웃 마을에 석유 주문하기', () => {
      st.order = true; status.textContent = '이웃 마을에서 답장이 왔어요. 이웃 마을도 날마다 석유를 써서 창고가 줄고 있어요. 석유는 쓰면 다시 채워지지 않아요.';
      if (!fired) { fired = true; st.done = true; onAction('ordered'); onReady?.(); }
      renderTray();
    }, 'mission-go'));
  }
  renderTray();
  status.textContent = fired ? '이미 사흘을 보내 봤어요.' : '하루씩 보내며 석유 창고와 마을 하늘을 살펴봐요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 바닷가 이웃 마을 살펴보기
function coastVillage({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '바닷가 이웃 마을', '왼쪽에 낮은 언덕, 가운데에 마을, 오른쪽에 모래밭과 바다가 있는 바닷가 마을. 바다에는 물 높이 막대, 둑 끝에는 바람 자루가 있다.');
  const {c, status, tray, node} = d;
  const st = memory['village-coast'] ??= {seen: [], done: false};
  let tide = 0, goal = 0, fired = st.done, alive = true, raf = 0, t = 0, look = null;
  function draw() {
    if (!alive) return;
    t += reduceMotion() ? 0 : 0.05; tide += (goal - tide) * (reduceMotion() ? 1 : 0.04);
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#b9dd8c'; c.fillRect(0, 0, 720, 380);
    // 언덕(강 없음)
    c.fillStyle = '#9bb07a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(150, 0); c.quadraticCurveTo(190, 190, 120, 380); c.lineTo(0, 380); c.closePath(); c.fill();
    c.strokeStyle = '#7f9660'; c.lineWidth = 1.5; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(0, 0 + i * 10); c.quadraticCurveTo(140 - i * 25, 190, 0, 380 - i * 10); c.stroke(); }
    // 마을
    for (let i = 0; i < 6; i++) { const x = 200 + (i % 3) * 64, y = 110 + Math.floor(i / 3) * 110; c.fillStyle = '#f3ead8'; c.fillRect(x, y, 46, 36); c.fillStyle = '#c0533e'; c.beginPath(); c.moveTo(x - 5, y + 2); c.lineTo(x + 23, y - 18); c.lineTo(x + 51, y + 2); c.closePath(); c.fill(); }
    // 모래밭과 바다(밀물이면 물가가 왼쪽으로 온다)
    const shore = 560 - tide * 70;
    c.fillStyle = '#ead9a0'; c.fillRect(420, 0, 300, 380);
    c.fillStyle = '#4f97d8'; c.fillRect(shore, 0, 720 - shore, 380);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; for (let y = 30; y < 380; y += 46) { c.beginPath(); c.moveTo(shore + 10, y + Math.sin(t + y) * 3); c.quadraticCurveTo(shore + 40, y - 8, shore + 70, y); c.stroke(); }
    if (st.seen.includes('tide')) {
      c.setLineDash([6, 5]); c.strokeStyle = '#1d4f86'; c.lineWidth = 2; for (const x of [490, 560]) { c.beginPath(); c.moveTo(x, 20); c.lineTo(x, 360); c.stroke(); } c.setLineDash([]);
      chip(c, '밀물 때 물가', 490, 44, {size: 11}); chip(c, '썰물 때 물가', 560, 76, {size: 11});
      chip(c, '물 높이 차이가 커요', 640, 120, {bg: '#e1efff', color: '#1d4f86', size: 12});
    }
    // 둑과 바람 자루
    c.fillStyle = '#6f7c8b'; c.fillRect(440, 300, 240, 12);
    c.strokeStyle = '#3a4656'; c.lineWidth = 3; c.beginPath(); c.moveTo(660, 300); c.lineTo(660, 236); c.stroke();
    const sway = st.seen.includes('wind') ? Math.sin(t * 3) * 0.06 : 0.9;
    c.save(); c.translate(660, 240); c.rotate(sway); c.fillStyle = '#e8743a'; c.beginPath(); c.moveTo(0, -6); c.lineTo(-46, -3); c.lineTo(-46, 3); c.lineTo(0, 6); c.closePath(); c.fill(); c.fillStyle = '#ffffff'; c.fillRect(-30, -5, 8, 10); c.restore();
    if (st.seen.includes('wind')) { c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { const y = 214 + i * 12, x = 700 - ((t * 40 + i * 30) % 120); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 30, y); c.stroke(); } chip(c, '바닷바람이 자주 세게 불어요', 600, 206, {bg: '#fff1d6', color: '#7a4314', size: 12}); }
    if (st.seen.includes('map')) { chip(c, '마을에 강이 흐르지 않아요', 270, 60, {bg: '#ffffff', size: 12}); chip(c, '땅속 열이 나오는 곳이 없어요', 270, 340, {bg: '#ffffff', size: 12}); }
    raf = requestAnimationFrame(draw);
  }
  function see(id) {
    look = id; if (!st.seen.includes(id)) st.seen.push(id);
    if (id === 'tide') { goal = goal ? 0 : 1; status.textContent = goal ? '밀물이 들어와 물가가 마을 가까이 왔어요. 썰물 때와 물 높이 차이가 아주 커요.' : '썰물이 되어 물가가 멀리 물러났어요. 밀물과 썰물의 물 높이 차이가 커요.'; }
    if (id === 'wind') status.textContent = '바람 자루가 옆으로 길게 펴졌어요. 바닷바람이 자주 세게 불어요.';
    if (id === 'map') status.textContent = '마을 지도에는 강이 없고, 땅속 열이 나오는 곳 표시도 없어요.';
    if (st.seen.length === 3 && !fired) { fired = true; st.done = true; status.textContent += ' 세 가지를 모두 살펴봤어요.'; onAction('surveyed'); onReady?.(); }
    renderTray();
  }
  function renderTray() { tray.replaceChildren(seg(el, button, '살펴보기', [['tide', '밀물과 썰물 살펴보기'], ['wind', '바람 자루 살펴보기'], ['map', '마을 지도 살펴보기']], look, see)); }
  renderTray();
  status.textContent = fired ? '이미 모두 살펴봤어요.' : '바다의 물 높이, 바람 자루, 마을 지도를 하나씩 살펴봐요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ================================================================ 집 모형 실험(과학 56쪽): 손난로 위에서 데운 두 집 모형을 얼음 수조 위 철판에 동시에 올려 2분마다 집 안 온도를 잰다.
// 온도는 교사용 지도서 결과 예시와 같은 모형 값이다(처음 26.0 ℃에서 단열재를 감싼 집이 더 천천히 식는다).
export const MILK_TEMPS = {none: [26.0, 21.5, 18.0, 16.5, 16.0, 15.5], insul: [26.0, 22.5, 19.5, 18.0, 17.5, 17.0]};
const MILK_STEPS = ['나 집 모형에 단열재 감싸기', '두 집 모형을 손난로 위에서 데우기', '두 집 모형을 얼음 철판에 동시에 올리기', '처음 온도 재기', '2분 지나고 온도 재기'];
function milkHouse(c, x, insul, {warmer, plate, temp, t}) {
  if (plate) { c.fillStyle = '#cfe6f5'; c.fillRect(x - 20, 300, 180, 18); c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(x - 14 + i * 22, 304); c.lineTo(x - 4 + i * 22, 314); c.stroke(); } c.fillStyle = '#9fb3c6'; c.fillRect(x - 20, 318, 180, 6); }
  const y = plate ? 300 : warmer ? 306 : 324; // 데우는 동안은 손난로 위에 올려 둔다
  c.fillStyle = '#f7f7f2'; c.fillRect(x, y - 120, 140, 120); c.strokeStyle = '#8a95a3'; c.lineWidth = 2; c.strokeRect(x, y - 120, 140, 120);
  c.fillStyle = '#e8edf2'; c.beginPath(); c.moveTo(x - 6, y - 118); c.lineTo(x + 70, y - 170); c.lineTo(x + 146, y - 118); c.closePath(); c.fill(); c.stroke();
  // 잘라 낸 앞면으로 보이는 안쪽
  c.fillStyle = '#fbfaf5'; c.fillRect(x + 14, y - 106, 112, 100);
  if (insul) { c.fillStyle = '#c9d6e3'; c.fillRect(x + 6, y - 112, 8, 106); c.fillRect(x + 126, y - 112, 8, 106); c.fillRect(x + 6, y - 112, 128, 8); c.fillStyle = '#ffffff'; for (let k = 0; k < 6; k++) { ellipse(c, x + 10, y - 100 + k * 16, 2.5, 2.5); ellipse(c, x + 130, y - 100 + k * 16, 2.5, 2.5); } }
  if (warmer) { c.fillStyle = '#e8743a'; rr(c, x + 20, y + 1, 100, 17, 4); c.fill(); txt(c, '손난로', x + 70, y + 14, {size: 10, color: '#ffffff', align: 'center'}); }
  // 온도계
  c.fillStyle = '#ffffff'; c.fillRect(x + 100, y - 150, 10, 110); c.strokeStyle = '#8a95a3'; c.lineWidth = 1; c.strokeRect(x + 100, y - 150, 10, 110);
  const lv = temp === null ? 0 : Math.max(0, (temp - 10) / 20);
  c.fillStyle = '#d9534f'; c.fillRect(x + 102, y - 42 - lv * 100, 6, lv * 100 + 2); ellipse(c, x + 105, y - 40, 7, 7);
  if (plate && temp !== null) {
    const n = insul ? 2 : 6; // 집 밖으로 빠져나가는 열
    c.strokeStyle = 'rgba(217,83,79,.8)'; c.lineWidth = 2.5;
    for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, yy = y - 96 + Math.floor(i / 2) * 30, wob = Math.sin(t + i) * 3, bx = side > 0 ? x + 140 : x; c.beginPath(); c.moveTo(bx - side * 4, yy); c.lineTo(bx + side * (18 + wob), yy); c.lineTo(bx + side * (12 + wob), yy - 5); c.moveTo(bx + side * (18 + wob), yy); c.lineTo(bx + side * (12 + wob), yy + 5); c.stroke(); }
  }
}
export function ecoHouse(props) { return props.mode === 'design' ? houseDesign(props) : milkTest(props); }
function milkTest({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '우유갑 집 모형 실험 (모형 값)', '우유갑으로 만든 집 모형 두 개. 가 집은 단열재가 없고 나 집은 단열재를 감싼다. 두 집을 손난로 위에서 데운 뒤 얼음 수조 위 철판에 동시에 올려 2분마다 집 안 온도를 잰다. 오른쪽에 온도 기록 표와 꺾은선그래프가 있다.');
  const {c, status, tray, node} = d;
  const st = memory['eco-milk'] ??= {step: 0, done: false};
  let fired = st.done, alive = true, raf = 0, t = 0;
  const reads = () => Math.max(0, st.step - 3); // 잰 횟수(0분 포함)
  function draw() {
    if (!alive) return;
    t += reduceMotion() ? 0 : 0.08;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef3ea'; c.fillRect(0, 0, 720, 380);
    c.fillStyle = '#d8c3a0'; c.fillRect(0, 324, 470, 56);
    const n = reads(), temp = (k) => (n ? MILK_TEMPS[k][n - 1] : null);
    // 손난로 위에서 데우는 동안과 얼음판에 옮긴 뒤 처음 재기 전까지는 두 집 모두 26.0 ℃로 보인다(막대가 바닥으로 떨어졌다 다시 오르지 않게)
    const warm = st.step === 2, pre = st.step === 2 || st.step === 3 ? 26.0 : null;
    milkHouse(c, 40, false, {warmer: warm, plate: st.step >= 3, temp: temp('none') ?? pre, t});
    milkHouse(c, 270, st.step >= 1, {warmer: warm, plate: st.step >= 3, temp: temp('insul') ?? pre, t});
    txt(c, '가 단열재 없음', 110, 348, {size: 13, align: 'center'}); txt(c, st.step >= 1 ? '나 단열재 감쌈' : '나 집 모형', 340, 348, {size: 13, align: 'center'});
    if (warm) { chip(c, '26.0 ℃', 150, 120, {size: 13}); chip(c, '26.0 ℃', 380, 120, {size: 13}); }
    if (n) { chip(c, `${temp('none').toFixed(1)} ℃`, 150, 120, {size: 13}); chip(c, `${temp('insul').toFixed(1)} ℃`, 380, 120, {size: 13}); }
    // 기록 표
    const X = 486; c.fillStyle = '#ffffff'; c.fillRect(478, 0, 242, 380);
    txt(c, '집 안 온도 기록', X, 24, {size: 14});
    [['시간', 60], ['가', 80], ['나', 80]].reduce((x, [h, w]) => { c.fillStyle = '#dbe8d4'; c.fillRect(x, 34, w - 3, 20); txt(c, h, x + 6, 49, {size: 12}); return x + w; }, X);
    for (let i = 0; i < 6; i++) {
      const y = 58 + i * 21, got = i < n;
      c.fillStyle = i === n - 1 ? '#fff3c4' : '#f7f9fb'; c.fillRect(X, y, 57, 18); c.fillRect(X + 60, y, 77, 18); c.fillRect(X + 140, y, 77, 18);
      txt(c, `${i * 2}분`, X + 6, y + 14, {size: 11, bold: false});
      if (got) { txt(c, MILK_TEMPS.none[i].toFixed(1), X + 66, y + 14, {size: 12}); txt(c, MILK_TEMPS.insul[i].toFixed(1), X + 146, y + 14, {size: 12}); }
    }
    // 꺾은선그래프
    const gx = 510, gy = 330, gw = 190, gh = 120, Y = (v) => gy - (v - 14) / 13 * gh, Xp = (i) => gx + i * gw / 5;
    c.strokeStyle = '#c7d0db'; c.lineWidth = 1; for (const v of [15, 20, 25]) { c.beginPath(); c.moveTo(gx, Y(v)); c.lineTo(gx + gw, Y(v)); c.stroke(); txt(c, String(v), gx - 4, Y(v) + 4, {size: 10, bold: false, color: SOFT, align: 'right'}); }
    for (const [k, col] of [['none', '#e08a32'], ['insul', '#2f6fd6']]) { if (!n) break; c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i < n; i++) { const p = [Xp(i), Y(MILK_TEMPS[k][i])]; i ? c.lineTo(...p) : c.moveTo(...p); } c.stroke(); }
    txt(c, '℃', gx - 4, gy - gh - 8, {size: 10, bold: false, color: SOFT, align: 'right'});
    txt(c, '0분', gx + 2, gy + 16, {size: 10, bold: false, color: SOFT}); txt(c, '10분', gx + gw, gy + 16, {size: 10, bold: false, color: SOFT, align: 'right'});
    c.fillStyle = '#e08a32'; c.fillRect(X, 362, 12, 4); txt(c, '가', X + 16, 368, {size: 11}); c.fillStyle = '#2f6fd6'; c.fillRect(X + 40, 362, 12, 4); txt(c, '나', X + 56, 368, {size: 11});
    raf = requestAnimationFrame(draw);
  }
  function next() {
    const s = st.step;
    if (reads() >= 6) return;
    st.step++;
    if (s === 0) status.textContent = '나 집 모형에 스타이로폼 단열재를 여러 겹 감쌌어요. 다르게 하는 조건은 단열재 하나뿐이에요.';
    else if (s === 1) status.textContent = '두 집 모형을 같은 손난로 위에 올려 데웠어요. 두 집 안 온도가 26.0 ℃로 같아졌어요.';
    else if (s === 2) status.textContent = '얼음이 담긴 수조 위 철판에 두 집 모형을 동시에 올렸어요. 바닥이 차가워서 집 안의 열이 빠져나가요.';
    else { const i = reads() - 1; status.textContent = `${i * 2}분: 가 집 ${MILK_TEMPS.none[i].toFixed(1)} ℃, 나 집 ${MILK_TEMPS.insul[i].toFixed(1)} ℃예요.` + (i === 5 ? ' 10분까지 모두 쟀어요. 단열재를 감싼 나 집의 온도가 더 잘 유지되었어요.' : ''); }
    if (reads() === 6 && !fired) { fired = true; st.done = true; onAction('measured'); onReady?.(); }
    renderTray();
  }
  function renderTray() { tray.replaceChildren(); if (reads() < 6) tray.append(button(MILK_STEPS[Math.min(st.step, 4)], next, 'mission-go')); }
  renderTray();
  status.textContent = fired ? '이미 실험을 끝냈어요.' : '손난로와 얼음, 철판은 면장갑을 끼고 다뤄요. 아래 단추를 차례대로 눌러 실험해요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 예산 10으로 집 설계(난방, 냉방, 조명 막대는 모형 값)
const HOUSE_OPT = [
  {id: 'wall', name: '벽 단열', list: [[0, '없음', 0], [1, '보통', 2], [2, '두꺼움', 4]]},
  {id: 'win', name: '창', list: [[0, '홑창', 0], [1, '이중창', 3]]},
  {id: 'dir', name: '큰 창 방향', list: [['S', '남쪽', 0], ['N', '북쪽', 0]]},
  {id: 'eave', name: '처마', list: [[0, '없음', 0], [1, '짧게', 1], [2, '길게', 2]]},
  {id: 'lamp', name: '전등', list: [[0, '백열등', 0], [1, 'LED 전등', 1]]},
  {id: 'gap', name: '문틈 막기', list: [[0, '안 함', 0], [1, '함', 1]]},
  {id: 'pv', name: '지붕 태양광', list: [[0, '없음', 0], [1, '있음', 4]]},
];
const BASE_HOUSE = {wall: 0, win: 0, dir: 'S', eave: 0, lamp: 0, gap: 0, pv: 0};
const D2R = Math.PI / 180, ALT = {summer: 78, winter: 31}; // 진해의 여름, 겨울 태양 남중 고도(1단원 값)
export function sunIn(h, alt) { const L = [0, 0.3, 0.6][h.eave], v = Math.max(0, Math.min(1, (2.4 - L * Math.tan(alt * D2R) - 0.9) / 1.2)); return h.dir === 'N' ? v * 0.2 : v; }
export function houseBars(h) {
  const wk = [1, 0.7, 0.5][h.wall], ck = [1, 0.8][h.win], gk = h.gap ? 0.9 : 1;
  const r1 = (v) => Math.round(v * 10) / 10;
  return {heat: r1(100 * wk * ck * gk - 20 * sunIn(h, ALT.winter)), cool: r1(60 * (0.6 + 0.4 * wk) + 30 * sunIn(h, ALT.summer)), light: h.lamp ? 4 : 20, pv: h.pv ? 15 : 0};
}
export const houseCost = (h) => HOUSE_OPT.reduce((s, o) => s + o.list.find((x) => x[0] === h[o.id])[2], 0);
const BASE_SUM = (() => { const b = houseBars(BASE_HOUSE); return b.heat + b.cool + b.light; })();
export const HOUSE_GOAL = Math.round(BASE_SUM * 0.6 * 10) / 10;
function houseDesign({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '모델하우스 설계 (모형 값)', '옆에서 본 집 단면. 벽 단열, 창, 처마, 전등, 문틈, 지붕 태양광이 보이고 고른 계절의 햇빛이 창으로 들어온다. 오른쪽에 예산과 난방, 냉방, 조명 막대가 있다.');
  const {c, status, tray, node} = d;
  const st = memory['eco-design'] ??= {h: {...BASE_HOUSE}, season: 'winter', tries: 0, done: false};
  let fired = st.done, alive = true, raf = 0, t = 0, party = 0;
  function drawHouse() {
    const h = st.h, alt = ALT[st.season], L = [0, 0.3, 0.6][h.eave] * 50, FY = 320, RW = 260, LW = 40, EY = 200;
    const sky = c.createLinearGradient(0, 0, 0, FY); sky.addColorStop(0, st.season === 'summer' ? '#bfe3ff' : '#dbe7f3'); sky.addColorStop(1, '#f3f8fc'); c.fillStyle = sky; c.fillRect(0, 0, 384, FY);
    c.fillStyle = st.season === 'summer' ? '#9fcf72' : '#e8eef2'; c.fillRect(0, FY, 384, 60);
    // 해와 햇빛
    const sx = RW + Math.cos(alt * D2R) * 120, sy = 245 - Math.sin(alt * D2R) * 120;
    sunIcon(c, sx, sy, 13);
    // 방 안
    c.fillStyle = '#fbf7ee'; c.fillRect(LW, EY, RW - LW, FY - EY);
    // 창으로 들어오는 햇빛(남쪽 창일 때)
    if (h.dir === 'S') {
      const tan = Math.tan(alt * D2R), yTip = EY + L * tan, top = Math.max(215, yTip), bot = 275;
      if (top < bot) {
        const xTop = RW - (FY - top) / tan, xBot = RW - (FY - bot) / tan;
        c.fillStyle = 'rgba(255,214,90,.45)'; c.beginPath(); c.moveTo(RW, top); c.lineTo(RW, bot); c.lineTo(Math.max(LW, xBot), FY); c.lineTo(Math.max(LW, xTop), FY); c.closePath(); c.fill();
      }
      c.strokeStyle = 'rgba(242,182,50,.8)'; c.lineWidth = 1.5; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(sx, sy); if (top < bot) c.lineTo(RW, (top + bot) / 2); else { c.lineTo(RW + L, EY + 3); } c.stroke(); c.setLineDash([]);
    }
    // 벽(단열 두께)
    const wt = [4, 9, 15][h.wall];
    for (const x of [LW, RW]) { c.fillStyle = '#a7a39a'; c.fillRect(x - 3, EY, 6, FY - EY); if (h.wall) { c.fillStyle = '#f2d16b'; c.fillRect(x === LW ? x + 3 : x - 3 - wt, EY, wt, FY - EY); c.strokeStyle = '#d4a93a'; c.lineWidth = 1; for (let y = EY + 6; y < FY; y += 10) { c.beginPath(); c.moveTo(x === LW ? x + 3 : x - 3 - wt, y); c.lineTo(x === LW ? x + 3 + wt : x - 3, y + 6); c.stroke(); } } }
    // 창(남쪽은 오른쪽 벽, 북쪽은 왼쪽 벽)
    const wx = h.dir === 'S' ? RW : LW;
    c.fillStyle = '#cfe9f5'; c.fillRect(wx - 4, 215, 8, 60); c.strokeStyle = '#3a6f9a'; c.lineWidth = 1.5; c.strokeRect(wx - 4, 215, 8, 60);
    if (h.win) { c.beginPath(); c.moveTo(wx, 215); c.lineTo(wx, 275); c.stroke(); }
    // 지붕과 처마
    c.fillStyle = '#7a5a46'; c.beginPath(); c.moveTo(LW - 18, EY); c.lineTo(150, 128); c.lineTo(RW + L + 2, EY); c.lineTo(RW + L + 2, EY + 6); c.lineTo(LW - 18, EY + 6); c.closePath(); c.fill();
    if (h.pv) { c.fillStyle = '#1f3f7a'; c.save(); c.translate(150, 128); const ang = Math.atan2(EY - 128, RW + L - 150); c.rotate(ang); c.fillRect(16, -7, 80, 7); c.restore(); }
    // 문과 문틈 바람
    c.fillStyle = '#9c6b3c'; c.fillRect(LW - 3, 252, 6, 68);
    if (!h.gap) { c.strokeStyle = '#3f8fd8'; c.lineWidth = 2; for (let i = 0; i < 2; i++) { const y = 262 + i * 30, dx = (t * 20 + i * 12) % 30; c.beginPath(); c.moveTo(LW - 20 + dx, y); c.lineTo(LW + 4 + dx, y); c.lineTo(LW - 2 + dx, y - 4); c.moveTo(LW + 4 + dx, y); c.lineTo(LW - 2 + dx, y + 4); c.stroke(); } }
    // 전등
    c.strokeStyle = '#555'; c.lineWidth = 1; c.beginPath(); c.moveTo(150, EY + 6); c.lineTo(150, 222); c.stroke();
    if (h.lamp) { c.fillStyle = '#ffffff'; c.fillRect(138, 222, 24, 6); c.fillStyle = 'rgba(255,255,220,.5)'; ellipse(c, 150, 236, 26, 12); }
    else { c.fillStyle = 'rgba(255,190,60,.35)'; ellipse(c, 150, 230, 22, 22); c.fillStyle = '#ffd34d'; ellipse(c, 150, 228, 7, 9); }
    txt(c, st.season === 'summer' ? '여름 한낮' : '겨울 한낮', 14, 26, {size: 15});
    txt(c, '북쪽', LW, 344, {size: 11, bold: false, color: SOFT, align: 'center'}); txt(c, '남쪽', RW, 344, {size: 11, bold: false, color: SOFT, align: 'center'});
    if (h.dir === 'S') txt(c, h.eave === 2 ? (st.season === 'summer' ? '처마가 햇빛을 가려요' : '햇빛이 방 안 깊이 들어와요') : st.season === 'summer' ? '여름 햇빛이 창으로 들어와요' : '햇빛이 방 안 깊이 들어와요', 14, 368, {size: 12, bold: false});
    else txt(c, '큰 창이 북쪽이라 햇빛이 거의 들지 않아요', 14, 368, {size: 12, bold: false});
  }
  function draw() {
    if (!alive) return;
    t += reduceMotion() ? 0 : 0.05;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 720, 380);
    drawHouse();
    const h = st.h, b = houseBars(h), base = houseBars(BASE_HOUSE), cost = houseCost(h), sum = Math.round((b.heat + b.cool + b.light) * 10) / 10;
    const X = 398;
    c.fillStyle = '#f5f8fb'; c.fillRect(388, 0, 332, 380);
    txt(c, `쓴 예산 ${cost} / 10`, X, 24, {size: 13}); meter(c, X, 30, 300, 8, cost / 10, '#e0a52a');
    [['heat', '난방', '#d9534f'], ['cool', '냉방', '#3f8fd8'], ['light', '조명', '#e0a52a']].forEach(([k, n, col], i) => {
      const y = 58 + i * 30;
      txt(c, n, X, y + 13, {size: 12});
      meter(c, X + 40, y, 210, 16, b[k] / 100, col, '#e3e9ef');
      c.fillStyle = INK; c.fillRect(X + 40 + 210 * base[k] / 100, y - 3, 2, 22);
      txt(c, String(Math.round(b[k])), X + 256, y + 13, {size: 12});
    });
    txt(c, '검은 눈금은 기본 집의 값이에요.', X, 160, {size: 10.5, bold: false, color: SOFT});
    // 합은 판정과 같은 소수 한 자리로 보여 준다(114.4를 114로 반올림해 보이면 목표 안처럼 보이는데 판정은 넘기 때문).
    txt(c, `세 막대의 합 ${sum}`, X, 186, {size: 15, color: sum <= HOUSE_GOAL ? GOOD : BAD});
    txt(c, `목표 ${Math.round(HOUSE_GOAL)} 이하, 기본 집 ${Math.round(BASE_SUM)}`, X + 130, 186, {size: 11, bold: false, color: SOFT});
    if (h.pv) { txt(c, '지붕 태양광으로 얻는 전기', X, 210, {size: 11, bold: false}); meter(c, X + 150, 201, 15 * 2.1, 10, 1, '#f2b632'); txt(c, '15', X + 188, 210, {size: 11}); }
    txt(c, '비용', X, 236, {size: 12});
    ['벽 단열 보통 2, 두꺼움 4', '이중창 3', '처마 짧게 1, 길게 2', 'LED 전등 1, 문틈 막기 1', '지붕 태양광 4', '큰 창 방향은 비용이 없어요'].forEach((s, i) => txt(c, s, X, 254 + i * 17, {size: 11, bold: false}));
    txt(c, '막대 값은 모두 모형 값이에요.', X, 370, {size: 10.5, bold: false, color: SOFT});
    cheer(c, party, 192, 70, '보람: 냉난방기가 드디어 쉬어요');
    raf = requestAnimationFrame(draw);
  }
  function set(id, v) {
    const next = {...st.h, [id]: v};
    if (houseCost(next) > 10) { status.textContent = `예산 10을 넘어요. 지금 쓴 예산은 ${houseCost(st.h)}. 다른 것을 줄이고 골라 봐요.`; return; }
    st.h = next; const b = houseBars(next);
    status.textContent = `난방 ${Math.round(b.heat)}, 냉방 ${Math.round(b.cool)}, 조명 ${b.light}, 합 ${Math.round((b.heat + b.cool + b.light) * 10) / 10}. 남은 예산 ${10 - houseCost(next)}.`;
    renderTray();
  }
  function decide() {
    const b = houseBars(st.h), sum = Math.round((b.heat + b.cool + b.light) * 10) / 10;
    st.tries++;
    if (sum <= HOUSE_GOAL) {
      status.textContent = `세 막대의 합은 ${sum}, 목표 ${Math.round(HOUSE_GOAL)} 이하예요. 기본 집 ${Math.round(BASE_SUM)}보다 에너지를 적게 쓰는 집을 설계했어요.`;
      party = performance.now();
      if (!fired) { fired = true; st.done = true; onAction('designed'); onReady?.(); }
    } else status.textContent = `세 막대의 합은 ${sum}, 목표는 ${Math.round(HOUSE_GOAL)} 이하예요. 가장 긴 막대를 줄이는 방법부터 찾아 다시 골라 봐요.`;
  }
  function renderTray() {
    tray.replaceChildren(seg(el, button, '계절', [['summer', '여름 한낮'], ['winter', '겨울 한낮']], st.season, (v) => { st.season = v; status.textContent = v === 'summer' ? '여름 한낮이에요. 태양이 높이 떠 있어요.' : '겨울 한낮이에요. 태양이 낮게 떠 있어요.'; renderTray(); }),
      ...HOUSE_OPT.map((o) => seg(el, button, o.name, o.list.map(([v, n, cost]) => [v, n, `${o.name} ${n}, 비용 ${cost}`]), st.h[o.id], (v) => set(o.id, v))),
      button('이 집으로 정하기', decide, 'mission-go'));
  }
  renderTray();
  status.textContent = fired ? '이미 집을 설계했어요. 다른 설계도 시험해 봐도 괜찮아요.' : '조건을 고르면 막대가 바로 바뀌어요. 계절을 바꾸면 창으로 들어오는 햇빛이 보여요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

export const ENERGY_COMPONENTS = {ranch: ranchBoard, village: villageBoard, ecohouse: ecoHouse};
