// 푸른 생활 지구 빛 공방 거리(학습보완자료 빛의 성질) 조작 장면. 의뢰 엔진은 LIGHT_COMPONENTS를 COMPONENTS에 합친다.
// 어둠상자와 어둠 창고(물체를 보려면 빛이 있어야 함), 레이저 빛 경로 퍼즐(직진, 반사, 굴절), 거울과 렌즈 설계 상자.
// 방 조명 밝기, 손전등 배터리, 물의 굴절률 같은 값은 모두 모형 값이다. 반사와 굴절의 법칙, 각도 숫자는 화면에 쓰지 않는다.
// 눈에서 무언가 나가는 것처럼 보이는 그림(시야 부채꼴, 눈에서 나가는 화살표)은 그리지 않는다. 빛은 광원에서 물체를 거쳐 눈으로만 그린다.
// 모든 조작은 아래 단추로 할 수 있고, 캔버스 누르기와 방향키는 덧붙인 방법이다.
import {trace, allHit, anyHit, mirrorAt, lensAt} from './ray-engine.mjs';

const FONT = (s, b) => `${b ? 'bold ' : ''}${s}px "Malgun Gothic",sans-serif`;
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const act = (task, fire) => (a) => { if (task.type === 'action') fire?.(a); };
const later = (on) => setTimeout(() => on?.(), 0);
// 받침이 있으면 a, 없으면 b를 붙인다. 숫자로 끝나면 읽는 소리(영, 일, 삼, 육, 칠, 팔은 받침 있음)로 정한다.
const jo = (w, a, b) => { const last = w[w.length - 1]; if (/[0-9]/.test(last)) return w + ('013678'.includes(last) ? a : b); const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
function device(el, owner, label, keys = false) {
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: 1440, height: 760, role: 'img', 'aria-label': label, ...(keys ? {tabindex: '0'} : {})});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device sun light-lab'}, el('div', {class: 'signal-owner'}, owner), canvas, tray, status);
  // 단추 줄을 다시 그려도 키보드 초점이 같은 단추(없으면 진행 단추)에 남게 한다(mission-energy.mjs의 device와 같은 방식).
  const fill = tray.replaceChildren.bind(tray);
  tray.replaceChildren = (...kids) => {
    const a = document.activeElement, key = a && tray.contains(a) ? a.getAttribute('aria-label') || a.textContent : null;
    fill(...kids);
    if (key) queueMicrotask(() => { const all = [...tray.querySelectorAll('button')].filter((b) => !b.disabled); (all.find((b) => (b.getAttribute('aria-label') || b.textContent) === key) || all.find((b) => b.classList.contains('mission-go')) || all[0])?.focus({preventScroll: true}); });
  };
  return {canvas, status, tray, node, c: canvas.getContext('2d')};
}
const seg = (el, button, name, list, cur, on, dis = () => false) => el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, name), el('span', {class: 'bench-seg'}, list.map(([v, n]) => { const b = button(n, () => on(v), 'bench-opt'); b.setAttribute('aria-pressed', String(cur === v)); if (dis(v)) b.disabled = true; return b; })));
function text(c, s, x, y, {size = 14, bold = true, color = '#233a5c', align = 'left'} = {}) { c.fillStyle = color; c.font = FONT(size, bold); c.textAlign = align; c.fillText(s, x, y); }
function chip(c, s, x, y, {bg = 'rgba(255,255,255,.92)', color = '#233a5c', size = 12} = {}) { c.font = FONT(size, true); const w = c.measureText(s).width + 12; c.fillStyle = bg; c.fillRect(x - w / 2, y - size - 1, w, size + 6); text(c, s, x, y, {size, color, align: 'center'}); }
function paper(c, col = '#f6f3ea', grid = '#e6e0d2') {
  c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = col; c.fillRect(0, 0, 720, 380);
  if (!grid) return;
  c.strokeStyle = grid; c.lineWidth = 1; c.beginPath();
  for (let x = 20; x < 720; x += 20) { c.moveTo(x, 0); c.lineTo(x, 380); }
  for (let y = 20; y < 380; y += 20) { c.moveTo(0, y); c.lineTo(720, y); }
  c.stroke();
}
function arrow(c, x1, y1, x2, y2, col, {w = 3, off = 0} = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - Math.cos(a) * 11, hy = y2 - Math.sin(a) * 11;
  c.strokeStyle = col; c.lineWidth = w; c.setLineDash([9, 6]); c.lineDashOffset = -off;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(hx, hy); c.stroke(); c.setLineDash([]); c.lineDashOffset = 0;
  c.fillStyle = col; c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - Math.cos(a - 0.42) * 14, y2 - Math.sin(a - 0.42) * 14); c.lineTo(x2 - Math.cos(a + 0.42) * 14, y2 - Math.sin(a + 0.42) * 14); c.closePath(); c.fill();
}
// 관찰 체크 목록: [이름, 했는지]
function checks(c, items, x, y) {
  let cx = x;
  for (const [label, ok] of items) {
    c.strokeStyle = ok ? '#1f8a5b' : '#8a96a8'; c.lineWidth = 2; c.beginPath(); c.arc(cx + 7, y - 5, 7, 0, Math.PI * 2); c.stroke();
    if (ok) { c.beginPath(); c.moveTo(cx + 3, y - 5); c.lineTo(cx + 6, y - 1); c.lineTo(cx + 12, y - 10); c.stroke(); }
    text(c, label, cx + 19, y, {size: 12, color: ok ? '#1f6b47' : '#4a5a70'});
    c.font = FONT(12, true); cx += 19 + c.measureText(label).width + 16;
  }
}
function drawKey(c, x, y, s = 1, col = '#e8b923') {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = '#7a5a10'; c.lineWidth = 1.5; c.fillStyle = col;
  c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.arc(0, 0, 4, 0, Math.PI * 2, true); c.fill('evenodd'); c.stroke();
  c.fillRect(8, -2.5, 26, 5); c.strokeRect(8, -2.5, 26, 5); c.fillRect(24, 2.5, 4, 6); c.fillRect(30, 2.5, 4, 8);
  c.restore();
}
// 눈 그림(보는 쪽 dir: 1 오른쪽, -1 왼쪽). 눈에서 나가는 선은 그리지 않는다.
function drawEye(c, x, y, s = 1, dir = 1) {
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  c.fillStyle = '#fff'; c.strokeStyle = '#3a3a3a'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(0, -11, 14, 0); c.quadraticCurveTo(0, 11, -14, 0); c.fill(); c.stroke();
  c.fillStyle = '#5a3b1f'; c.beginPath(); c.arc(4, 0, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(5, 0, 2.2, 0, Math.PI * 2); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- 어둠상자: 윗면 구멍을 막고 보기, 1분 기다리기, 손전등을 놓고 켜고 보기(과학 2~3쪽)
export function darkBox({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '빛 공방 창고의 어둠상자', '옆면에 들여다보는 구멍, 윗면에 빛이 들어오는 구멍이 있는 어둠상자. 상자 속 바닥에 열쇠가 있어요.');
  const {c, status, tray, node} = d;
  const s = memory.darkbox ??= {top: 'lid', on: false, seen: {}, view: '', done: false};
  let alive = true, raf = 0, wait = -1, waiting = false, fired = !!s.done;
  const lit = () => s.top === 'torch' && s.on;
  function draw() {
    if (!alive) return;
    paper(c, '#ece5d6', null);
    c.fillStyle = '#c9a77a'; c.fillRect(0, 318, 410, 62);
    const L = lit();
    c.fillStyle = L ? '#3b3327' : '#09090b'; c.fillRect(80, 110, 240, 190);
    if (L) { const g = c.createLinearGradient(0, 110, 0, 300); g.addColorStop(0, 'rgba(255,238,170,.85)'); g.addColorStop(1, 'rgba(255,238,170,.22)'); c.fillStyle = g; c.beginPath(); c.moveTo(188, 110); c.lineTo(212, 110); c.lineTo(306, 300); c.lineTo(94, 300); c.closePath(); c.fill(); }
    c.fillStyle = L ? '#e8d9a8' : '#09090b'; c.fillRect(185, 100, 30, 10); c.fillStyle = '#09090b'; c.fillRect(70, 215, 10, 20);
    c.fillStyle = '#a8774a';
    c.fillRect(70, 100, 115, 10); c.fillRect(215, 100, 115, 10); c.fillRect(70, 100, 10, 115); c.fillRect(70, 235, 10, 75); c.fillRect(320, 100, 10, 210); c.fillRect(70, 300, 260, 10);
    if (L) drawKey(c, 222, 286, 1.1);
    else { c.setLineDash([3, 3]); c.strokeStyle = '#5c5c66'; c.lineWidth = 1.2; c.beginPath(); c.arc(222, 286, 10, 0, Math.PI * 2); c.rect(232, 283, 28, 6); c.stroke(); c.setLineDash([]); }
    text(c, L ? '열쇠' : '상자 속 열쇠', 244, 264, {size: 12, color: L ? '#fff2c4' : '#8a8f9c', align: 'center'});
    text(c, '옆 구멍', 88, 252, {size: 12, color: L ? '#efe2c0' : '#9aa2ad'});
    if (s.top === 'lid') { c.fillStyle = '#3e3e44'; c.fillRect(178, 92, 44, 9); text(c, '덮개', 200, 86, {size: 12, align: 'center'}); }
    else {
      c.fillStyle = '#4a6fa5'; c.fillRect(187, 38, 26, 54); c.fillStyle = '#c7cfd8'; c.fillRect(182, 88, 36, 13);
      c.fillStyle = s.on ? '#ffe066' : '#6b7480'; c.fillRect(186, 98, 28, 4);
      c.fillStyle = s.on ? '#3fbf6a' : '#c0392b'; c.beginPath(); c.arc(200, 56, 4, 0, Math.PI * 2); c.fill();
      text(c, s.on ? '손전등 켜짐' : '손전등 꺼짐', 222, 60, {size: 12});
    }
    text(c, '윗면 구멍', 250, 92, {size: 12});
    drawEye(c, 44, 225, 1.1);
    text(c, '어둠상자', 200, 346, {size: 14, align: 'center', color: '#4a3418'});
    if (wait >= 0) {
      c.fillStyle = '#fff'; c.strokeStyle = '#555'; c.lineWidth = 2; c.beginPath(); c.arc(110, 58, 20, 0, Math.PI * 2); c.fill(); c.stroke();
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(110 + Math.cos(a) * 16, 58 + Math.sin(a) * 16); c.lineTo(110 + Math.cos(a) * 19, 58 + Math.sin(a) * 19); c.stroke(); }
      const a = -Math.PI / 2 + wait * Math.PI * 2; c.strokeStyle = '#c0392b'; c.beginPath(); c.moveTo(110, 58); c.lineTo(110 + Math.cos(a) * 15, 58 + Math.sin(a) * 15); c.stroke();
      text(c, waiting ? '1분 기다리는 중' : '1분이 지났어요', 110, 94, {size: 12, align: 'center'});
    }
    checks(c, [['막고 보기', !!s.seen.dark], ['1분 기다려 보기', !!s.seen.wait], ['손전등 켜고 보기', !!s.seen.lit]], 12, 24);
    text(c, '옆 구멍으로 본 모습', 552, 38, {size: 15, align: 'center'});
    c.save(); c.beginPath(); c.arc(552, 192, 126, 0, Math.PI * 2); c.clip();
    if (!s.view) { c.fillStyle = '#3a4350'; c.fillRect(420, 60, 270, 270); }
    else if (s.view === 'dark') { c.fillStyle = '#000'; c.fillRect(420, 60, 270, 270); }
    else { const g = c.createRadialGradient(552, 150, 10, 552, 190, 170); g.addColorStop(0, '#7a6744'); g.addColorStop(1, '#241d14'); c.fillStyle = g; c.fillRect(420, 60, 270, 270); c.fillStyle = '#4a3c28'; c.fillRect(420, 246, 270, 90); drawKey(c, 506, 240, 2.6); }
    c.restore();
    c.strokeStyle = '#2b2b2b'; c.lineWidth = 6; c.beginPath(); c.arc(552, 192, 126, 0, Math.PI * 2); c.stroke();
    if (!s.view) text(c, '들여다보기를 눌러요', 552, 198, {size: 14, color: '#d5dde8', align: 'center'});
    text(c, !s.view ? '아직 들여다보지 않았어요' : s.view === 'dark' ? '아무것도 보이지 않아요' : '열쇠가 보여요', 552, 352, {size: 15, align: 'center', color: s.view === 'lit' ? '#1f6b47' : '#2b3a52'});
    raf = requestAnimationFrame(draw);
  }
  function check() {
    if (fired || !(s.seen.dark && s.seen.wait && s.seen.lit)) return;
    fired = true; s.done = true; status.textContent += ' 세 가지를 모두 관찰했어요.'; onAction('observed'); onReady?.();
  }
  function look() {
    if (waiting) return;
    wait = -1; s.view = lit() ? 'lit' : 'dark';
    if (lit()) { s.seen.lit = true; status.textContent = '손전등 빛이 윗면 구멍으로 들어가 열쇠에 닿으니 열쇠가 보여요.'; }
    else { s.seen.dark = true; status.textContent = s.top === 'lid' ? '윗면 구멍을 막았더니 상자 속이 깜깜해서 아무것도 보이지 않아요.' : '손전등을 놓았지만 켜지 않아서 상자 속에 빛이 없어요. 아무것도 보이지 않아요.'; }
    check();
  }
  function waitMinute() {
    if (waiting) return;
    if (lit()) { status.textContent = '손전등이 켜져 있어서 기다리지 않아도 열쇠가 보여요. 손전등을 끄거나 덮개로 막고 기다려 봐요.'; return; }
    waiting = true; wait = 0; s.view = 'dark'; status.textContent = '눈을 크게 뜨고 1분 동안 기다려요.'; renderTray();
    const end = () => { if (!alive) return; waiting = false; wait = 1; s.view = 'dark'; s.seen.wait = true; status.textContent = '1분을 기다렸지만 여전히 아무것도 보이지 않아요. 빛이 없으면 오래 기다려도 보이지 않아요.'; check(); renderTray(); };
    if (reduceMotion()) end();
    else { const t0 = performance.now(); const tick = () => { if (!alive) return; wait = Math.min(1, (performance.now() - t0) / 2600); if (wait >= 1) end(); else setTimeout(tick, 60); }; tick(); }
  }
  function renderTray() {
    const lookBtn = button('옆 구멍으로 들여다보기', look, 'mission-go'), waitBtn = button('1분 기다렸다가 다시 보기', waitMinute, 'bench-opt');
    lookBtn.disabled = waitBtn.disabled = waiting;
    tray.replaceChildren(
      seg(el, button, '윗면 구멍', [['lid', '덮개로 막기'], ['torch', '손전등 놓기']], s.top, (v) => { if (waiting) return; s.top = v; if (v === 'lid') s.on = false; s.view = ''; wait = -1; status.textContent = v === 'lid' ? '윗면 구멍을 덮개로 막았어요.' : '윗면 구멍 위에 손전등을 놓았어요. 아직 켜지 않았어요.'; renderTray(); }),
      seg(el, button, '손전등', [['off', '끄기'], ['on', '켜기']], s.on ? 'on' : 'off', (v) => { if (waiting) return; if (s.top !== 'torch') { status.textContent = '먼저 윗면 구멍 위에 손전등을 놓아요.'; return; } s.on = v === 'on'; s.view = ''; wait = -1; status.textContent = s.on ? '손전등을 켰어요. 옆 구멍으로 들여다보세요.' : '손전등을 껐어요.'; renderTray(); }),
      lookBtn, waitBtn);
  }
  renderTray();
  status.textContent = fired ? '이미 세 가지를 관찰했어요. 다시 해 봐도 괜찮아요.' : '윗면 구멍을 덮개로 막은 채 옆 구멍으로 들여다보는 것부터 해요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 어둠 창고(위에서 본 모습): 조건 실험(light), 기록(table), 빛의 길(path), 물건 찾기(find)
// 물건이 보이는 조건(모형): 빛이 닿고(방 조명 또는 손전등 빛), 그 물건과 눈 사이를 가구가 가리지 않고, 보는 쪽에 있을 때.
// 어두운 색 물건은 빛이 적으면 잘 보이지 않는다(빛의 양 x 밝기 0.25 이상일 때 보임, 모형 값).
export const STORE = {
  room: {x: 20, y: 20, w: 470, h: 340},
  furn: [{id: 'shelf', label: '높은 선반', x: 330, y: 88, w: 140, h: 24}, {id: 'bench', label: '작업대', x: 40, y: 292, w: 96, h: 44}, {id: 'crate', label: '나무 상자', x: 392, y: 276, w: 70, h: 52}],
  objs: [
    {id: 'toolbox', label: '공구 상자', x: 270, y: 125, ref: 0.9, col: '#d6453a'},
    {id: 'hammer', label: '고무망치', x: 215, y: 235, ref: 0.35, col: '#2a2a2e'},
    {id: 'bulb', label: '전구 상자', x: 430, y: 185, ref: 0.9, col: '#f2c84b'},
    {id: 'brush', label: '붓 통', x: 95, y: 205, ref: 0.9, col: '#3d7fd6'},
    {id: 'keys', label: '열쇠 꾸러미', x: 405, y: 58, ref: 0.9, col: '#e8b923'},
  ],
  spots: [{id: 'door', label: '문 앞', x: 250, y: 335}, {id: 'back', label: '선반 뒤 통로', x: 300, y: 50}, {id: 'corner', label: '창고 왼쪽 구석', x: 80, y: 78}],
  lamp: {x: 255, y: 190}, cone: 20, fov: 60, range: 300,
};
const COND = [{room: 0, torch: false}, {room: 0, torch: true}, {room: 30, torch: false}, {room: 100, torch: false}];
const condKey = (r, t) => `${r}-${t ? 'on' : 'off'}`;
const angOf = (dx, dy) => Math.atan2(dy, dx) * 180 / Math.PI;
const adiff = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
function segHitsRect(a, b, r) {
  let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - r.x], [dx, r.x + r.w - a.x], [-dy, a.y - r.y], [dy, r.y + r.h - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
const spotOf = (id) => STORE.spots.find((p) => p.id === id) || STORE.spots[0];
export function lightAt(o, v) {
  const sp = spotOf(v.spot), dx = o.x - sp.x, dy = o.y - sp.y, a = angOf(dx, dy);
  const los = !STORE.furn.some((f) => segHitsRect(sp, o, f)), inView = adiff(a, v.face) <= STORE.fov;
  const flash = v.torch && adiff(a, v.face) <= STORE.cone && Math.hypot(dx, dy) <= STORE.range && los;
  return {los, inView, light: Math.max(v.room / 100, flash ? 1 : 0)};
}
export const seenIds = (v) => STORE.objs.filter((o) => { const L = lightAt(o, v); return L.los && L.inView && L.light * o.ref >= 0.25; }).map((o) => o.id);
function drawObj(c, o, dim = 1) {
  c.save(); c.globalAlpha = dim; c.translate(o.x, o.y);
  c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.2;
  if (o.id === 'toolbox') { c.fillStyle = o.col; c.fillRect(-14, -8, 28, 16); c.strokeRect(-14, -8, 28, 16); c.strokeStyle = '#555'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-6, -8); c.lineTo(-6, -12); c.lineTo(6, -12); c.lineTo(6, -8); c.stroke(); }
  if (o.id === 'hammer') { c.fillStyle = '#9a6b3d'; c.fillRect(-2, -2, 22, 4); c.fillStyle = o.col; c.fillRect(-12, -7, 12, 14); c.strokeRect(-12, -7, 12, 14); }
  if (o.id === 'bulb') { c.fillStyle = o.col; c.fillRect(-13, -10, 26, 20); c.strokeRect(-13, -10, 26, 20); c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(0, -1, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#888'; c.fillRect(-2, 4, 4, 3); }
  if (o.id === 'brush') { c.fillStyle = o.col; c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#f0e0b0'; for (const [x, y] of [[-3, -3], [3, -2], [0, 3]]) { c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.fill(); } }
  if (o.id === 'keys') { drawKey(c, -6, 0, 0.75); drawKey(c, -2, 5, 0.6, '#c9a227'); }
  c.restore();
}
function conePath(ctx, sp, fa) {
  const a0 = fa - STORE.cone * Math.PI / 180, a1 = fa + STORE.cone * Math.PI / 180, hx = sp.x + Math.cos(fa) * 12, hy = sp.y + Math.sin(fa) * 12;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(sp.x, sp.y, STORE.range, a0, a1); ctx.closePath();
}
export function storeRoom({el, button, mode = 'light', task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const OWNER = {light: '빛 공방 창고 조건 실험 (모형 값)', table: '어둠 창고 실험 기록', path: '빛의 길 보기', find: '깜깜한 창고에서 물건 찾기 (모형 값)'}[mode];
  const LABEL = {light: '위에서 본 창고. 방 조명 밝기와 손전등을 바꾸며 문 앞에서 보이는 물건 수를 세어요.', table: '방 조명과 손전등 조건에 따라 보인 물건 수를 적은 기록표', path: '천장 등에서 나온 빛이 물건에 닿은 뒤 문 앞에 선 내 눈으로 들어오는 길을 화살표로 보여 줘요.', find: '등이 꺼진 창고. 손전등을 켜고 서 있을 곳과 방향을 바꾸며 물건 다섯 개를 찾아요.'}[mode];
  const d = device(el, OWNER, LABEL, mode === 'find'), {c, status, tray, node, canvas} = d;
  const S = memory.store ??= {};
  S.rec ??= {}; S.traced ??= []; S.found ??= []; S.done ??= {}; S.lt ??= {room: 100, torch: false, last: null};
  S.fd ??= {at: 'door', face: -90, torch: false, battery: 60, swaps: 0};
  let alive = true, raf = 0, k = 0, fired = !!S.done[mode], cur = null, timer = 0;
  const fog = document.createElement('canvas'); fog.width = 1440; fog.height = 760; const fc = fog.getContext('2d');
  const view = () => mode === 'light' ? {spot: 'door', face: -90, torch: S.lt.torch, room: S.lt.room}
    : mode === 'find' ? {spot: S.fd.at, face: S.fd.face, torch: S.fd.torch && S.fd.battery > 0, room: 0}
    : {spot: 'door', face: -90, torch: false, room: 100};
  function drawRoom(v) {
    const R0 = STORE.room, sp = spotOf(v.spot), fa = v.face * Math.PI / 180, amb = v.room / 100;
    c.fillStyle = '#b99a6b'; c.fillRect(R0.x, R0.y, R0.w, R0.h);
    c.strokeStyle = 'rgba(90,60,30,.25)'; c.lineWidth = 1; c.beginPath(); for (let y = R0.y + 34; y < R0.y + R0.h; y += 34) { c.moveTo(R0.x, y); c.lineTo(R0.x + R0.w, y); } c.stroke();
    c.fillStyle = '#8f7a5a'; c.fillRect(222, R0.y + R0.h - 4, 56, 4);
    for (const f of STORE.furn) { c.fillStyle = '#6b4a2e'; c.fillRect(f.x, f.y, f.w, f.h); c.fillStyle = '#8a6440'; c.fillRect(f.x + 3, f.y + 3, f.w - 6, 5); text(c, f.label, f.x + f.w / 2, f.y + f.h / 2 + 6, {size: 11, color: '#f4e6cf', align: 'center'}); }
    if (mode === 'path') { const L = STORE.lamp; c.fillStyle = '#fff3b0'; c.strokeStyle = '#a07a10'; c.lineWidth = 2; c.beginPath(); c.arc(L.x, L.y, 10, 0, Math.PI * 2); c.fill(); c.stroke(); c.strokeStyle = '#e0a800'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(L.x + Math.cos(a) * 13, L.y + Math.sin(a) * 13); c.lineTo(L.x + Math.cos(a) * 18, L.y + Math.sin(a) * 18); c.stroke(); } chip(c, '천장 등', L.x, L.y + 34, {size: 11, bg: 'rgba(255,248,214,.95)'}); }
    const alpha = amb >= 1 ? 0 : amb > 0 ? 0.6 : 0.965;
    if (alpha > 0) {
      fc.setTransform(2, 0, 0, 2, 0, 0); fc.clearRect(0, 0, 720, 380); fc.globalCompositeOperation = 'source-over';
      fc.fillStyle = `rgba(4,6,10,${alpha})`; fc.fillRect(R0.x, R0.y, R0.w, R0.h);
      if (v.torch) { fc.save(); fc.beginPath(); fc.rect(R0.x, R0.y, R0.w, R0.h); fc.clip(); fc.globalCompositeOperation = 'destination-out'; const g = fc.createRadialGradient(sp.x, sp.y, 6, sp.x, sp.y, STORE.range); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.8, 'rgba(0,0,0,.92)'); g.addColorStop(1, 'rgba(0,0,0,0)'); fc.fillStyle = g; conePath(fc, sp, fa); fc.fill(); fc.restore(); fc.globalCompositeOperation = 'source-over'; }
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(fog, 0, 0); c.restore();
    }
    if (v.torch) { c.save(); c.beginPath(); c.rect(R0.x, R0.y, R0.w, R0.h); c.clip(); c.fillStyle = 'rgba(255,232,150,.18)'; conePath(c, sp, fa); c.fill(); c.restore(); }
    const vis = seenIds(v);
    for (const o of STORE.objs) if (vis.includes(o.id)) { const L = lightAt(o, v); drawObj(c, o, L.light >= 1 ? 1 : 0.85); chip(c, o.label, o.x, o.y + 27, {size: 11}); }
    // 나: 몸과 손전등(보는 쪽으로 든다)
    c.save(); c.translate(sp.x, sp.y); c.rotate(fa); c.fillStyle = v.torch ? '#ffd34d' : '#5b6675'; c.fillRect(9, -3, 10, 6); c.restore();
    c.fillStyle = '#3d6fb4'; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(sp.x, sp.y, 10, 0, Math.PI * 2); c.fill(); c.stroke();
    chip(c, '나', sp.x - 24, sp.y + 5, {size: 11, bg: 'rgba(220,235,255,.95)'});
    return vis;
  }
  function panelLight() {
    text(c, '실험 기록', 610, 34, {size: 15, align: 'center'});
    c.fillStyle = '#dfe6d6'; c.fillRect(504, 46, 210, 22);
    text(c, '방 조명', 510, 62, {size: 12}); text(c, '손전등', 570, 62, {size: 12}); text(c, '보이는 물건', 630, 62, {size: 12});
    COND.forEach((cd, i) => {
      const y = 72 + i * 30, key = condKey(cd.room, cd.torch), now = S.lt.room === cd.room && S.lt.torch === cd.torch;
      c.fillStyle = now ? '#fff1bf' : '#ffffff'; c.fillRect(504, y, 210, 26);
      text(c, String(cd.room), 510, y + 18, {size: 13, bold: false}); text(c, cd.torch ? '켬' : '끔', 570, y + 18, {size: 13, bold: false});
      if (S.rec[key] !== undefined) text(c, `${S.rec[key]}개`, 630, y + 18, {size: 13});
    });
    text(c, '방 조명 밝기는 모형 값이에요.', 610, 210, {size: 12, bold: false, color: '#51637a', align: 'center'});
    text(c, `지금 방 조명 ${S.lt.room}, 손전등 ${S.lt.torch ? '켬' : '끔'}`, 610, 244, {size: 13, align: 'center'});
    if (S.lt.last !== null) text(c, `보이는 물건 ${S.lt.last}개`, 610, 272, {size: 16, align: 'center', color: '#1f6b47'});
  }
  function panelPath() {
    text(c, '빛의 길을 본 물건', 610, 34, {size: 15, align: 'center'});
    text(c, `${Math.min(3, S.traced.length)} / 3`, 610, 58, {size: 14, align: 'center', color: '#51637a'});
    S.traced.forEach((id, i) => { const o = STORE.objs.find((x) => x.id === id); text(c, o.label, 560, 88 + i * 26, {size: 13}); c.strokeStyle = '#1f8a5b'; c.lineWidth = 2; c.beginPath(); c.moveTo(538, 83 + i * 26); c.lineTo(542, 87 + i * 26); c.lineTo(550, 78 + i * 26); c.stroke(); });
    arrow(c, 514, 262, 556, 262, '#f0a400', {w: 3}); text(c, '등에서 물체로', 564, 267, {size: 12});
    arrow(c, 514, 296, 556, 296, '#ff6a1f', {w: 3}); text(c, '물체에서 눈으로', 564, 301, {size: 12});
  }
  function panelFind() {
    text(c, `찾은 물건 ${S.found.length} / 5`, 610, 34, {size: 15, align: 'center'});
    STORE.objs.forEach((o, i) => {
      const y = 66 + i * 28, got = S.found.includes(o.id);
      c.fillStyle = got ? '#ffffff' : '#e7e1d3'; c.fillRect(512, y - 16, 196, 24);
      if (got) { drawObj(c, {...o, x: 532, y: y - 4}, 1); text(c, o.label, 562, y + 1, {size: 13}); }
      else text(c, '아직 못 찾았어요', 562, y + 1, {size: 12, bold: false, color: '#7a8596'});
    });
    text(c, '손전등 배터리 (모형 값)', 610, 230, {size: 12, align: 'center'});
    c.fillStyle = '#d9d3c4'; c.fillRect(520, 240, 180, 14); c.fillStyle = S.fd.battery > 15 ? '#3fae6a' : '#e2683e'; c.fillRect(520, 240, 180 * S.fd.battery / 60, 14);
    text(c, `${S.fd.battery}초 남았어요`, 610, 276, {size: 13, align: 'center'});
    text(c, `서 있는 곳: ${spotOf(S.fd.at).label}`, 610, 312, {size: 12, align: 'center', color: '#51637a'});
  }
  function drawTable() {
    paper(c, '#f4efe3', null);
    text(c, '어둠 창고 조건 실험 기록', 360, 48, {size: 20, align: 'center'});
    c.fillStyle = '#dfe6d6'; c.fillRect(140, 70, 440, 34);
    text(c, '방 조명 밝기', 160, 93, {size: 15}); text(c, '손전등', 320, 93, {size: 15}); text(c, '보이는 물건 수', 440, 93, {size: 15});
    COND.forEach((cd, i) => { const y = 110 + i * 44, v = S.rec[condKey(cd.room, cd.torch)]; c.fillStyle = '#ffffff'; c.fillRect(140, y, 440, 40); text(c, String(cd.room), 160, y + 27, {size: 16, bold: false}); text(c, cd.torch ? '켬' : '끔', 320, y + 27, {size: 16, bold: false}); text(c, v === undefined ? '기록 없음' : `${v}개`, 440, y + 27, {size: 16, color: v === undefined ? '#8a96a8' : '#233a5c'}); });
    text(c, '방 조명 밝기는 모형 값이에요. 문 앞 같은 자리에서 같은 쪽을 보며 셌어요.', 360, 312, {size: 13, bold: false, align: 'center', color: '#51637a'});
  }
  function draw() {
    if (!alive) return; k++;
    if (mode === 'table') { drawTable(); raf = requestAnimationFrame(draw); return; }
    paper(c, '#2a2f38', null);
    const v = view();
    drawRoom(v);
    if (mode === 'path' && cur) {
      const o = STORE.objs.find((x) => x.id === cur), L = STORE.lamp, sp = spotOf('door'), off = reduceMotion() ? 0 : (k * 0.6) % 15;
      const sh = (ax, ay, bx, by, m) => { const len = Math.hypot(bx - ax, by - ay); return [ax + (bx - ax) * m / len, ay + (by - ay) * m / len]; };
      const [a1x, a1y] = sh(L.x, L.y, o.x, o.y, 14), [b1x, b1y] = sh(o.x, o.y, L.x, L.y, 16);
      arrow(c, a1x, a1y, b1x, b1y, '#f0a400', {w: 3, off});
      const [a2x, a2y] = sh(o.x, o.y, sp.x, sp.y, 16), [b2x, b2y] = sh(sp.x, sp.y, o.x, o.y, 12);
      arrow(c, a2x, a2y, b2x, b2y, '#ff6a1f', {w: 3, off});
    }
    c.fillStyle = '#f4efe3'; c.fillRect(500, 0, 220, 380);
    if (mode === 'light') panelLight(); else if (mode === 'path') panelPath(); else panelFind();
    raf = requestAnimationFrame(draw);
  }
  const done = (val) => { if (fired) return; fired = true; S.done[mode] = true; onAction(val); onReady?.(); };
  // 조건 실험
  function count() {
    const n = seenIds(view()).length, key = condKey(S.lt.room, S.lt.torch), inTable = COND.some((cd) => condKey(cd.room, cd.torch) === key);
    S.lt.last = n; if (inTable) S.rec[key] = n;
    status.textContent = `방 조명 ${S.lt.room}, 손전등 ${S.lt.torch ? '켬' : '끔'}일 때 보이는 물건은 ${n}개예요.` + (n === 0 ? ' 빛이 전혀 없어서 아무것도 보이지 않아요.' : '') + (inTable ? '' : ' 이 조건은 기록표에 없어서 적지 않았어요.');
    if (COND.every((cd) => S.rec[condKey(cd.room, cd.torch)] !== undefined) && !fired) { status.textContent += ' 네 가지 조건을 모두 기록했어요.'; done('recorded'); }
  }
  // 물건 찾기: 지금 보이는 물건을 찾은 목록에 넣는다
  function look(why) {
    const vis = seenIds(view()), fresh = vis.filter((id) => !S.found.includes(id));
    S.found.push(...fresh);
    const names = fresh.map((id) => STORE.objs.find((o) => o.id === id).label);
    if (fresh.length) status.textContent = `${[...names.slice(0, -1), jo(names[names.length - 1], '을', '를')].join(', ')} 찾았어요.` + (fresh.includes('keys') ? ' 선반에 가려 문 앞에서는 보이지 않던 물건이에요.' : ' 손전등 빛이 닿은 물건만 보여요.');
    else if (!view().torch) status.textContent = S.fd.battery > 0 ? '손전등이 꺼져 있어서 아무것도 보이지 않아요.' : '배터리가 다 됐어요. 쓰지 않을 때 손전등을 꺼 두면 배터리를 아낄 수 있어요.';
    else status.textContent = why === 'turn' ? '빛이 닿은 곳에 새로 찾은 물건이 없어요. 다른 쪽을 비춰 봐요.' : '여기서는 새로 보이는 물건이 없어요. 가구에 가려진 곳은 다른 자리에서 비춰 봐요.';
    if (S.found.length === STORE.objs.length && !fired) { status.textContent += ' 물건 다섯 개를 모두 찾았어요.'; done('found'); }
  }
  function battery() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!alive) return clearInterval(timer);
      if (!S.fd.torch || S.fd.battery <= 0) return;
      S.fd.battery--;
      if (S.fd.battery <= 0) { S.fd.torch = false; status.textContent = '배터리가 다 됐어요. 쓰지 않을 때 손전등을 꺼 두면 배터리를 아낄 수 있어요. 새 배터리를 넣어 보세요.'; renderTray(); }
    }, 1000);
  }
  const turn = (by) => { S.fd.face = ((S.fd.face + by + 540) % 360) - 180; look('turn'); };
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'light') tray.append(
      seg(el, button, '방 조명 밝기', [[0, '0'], [30, '30'], [100, '100']], S.lt.room, (v) => { S.lt.room = v; S.lt.last = null; status.textContent = `방 조명 밝기를 ${v}으로 맞췄어요.`; renderTray(); }),
      seg(el, button, '손전등', [[false, '끄기'], [true, '켜기']], S.lt.torch, (v) => { S.lt.torch = v; S.lt.last = null; status.textContent = v ? '손전등을 켜서 앞쪽을 비췄어요.' : '손전등을 껐어요.'; renderTray(); }),
      button('보이는 물건 세기', count, 'mission-go'));
    if (mode === 'path') {
      const vis = seenIds(view());
      tray.append(seg(el, button, '빛의 길을 볼 물건', STORE.objs.filter((o) => vis.includes(o.id)).map((o) => [o.id, o.label]), cur, (id) => {
        cur = id; const o = STORE.objs.find((x) => x.id === id);
        if (!S.traced.includes(id)) S.traced.push(id);
        status.textContent = `천장 등에서 나온 빛이 ${o.label}에 닿고, ${o.label}에서 다시 내 눈으로 들어와요.`;
        if (S.traced.length >= 3 && !fired) { status.textContent += ' 세 물건 모두 빛이 등에서 물체를 거쳐 눈으로 왔어요.'; done('traced'); }
        renderTray();
      }));
    }
    if (mode === 'find') {
      tray.append(seg(el, button, '서 있을 곳', STORE.spots.map((p) => [p.id, p.label]), S.fd.at, (v) => { S.fd.at = v; look('move'); renderTray(); }),
        button('왼쪽으로 돌기', () => turn(-45), 'bench-opt'), button('오른쪽으로 돌기', () => turn(45), 'bench-opt'),
        seg(el, button, '손전등', [[false, '끄기'], [true, '켜기']], S.fd.torch, (v) => { if (v && S.fd.battery <= 0) { status.textContent = '배터리가 다 됐어요. 새 배터리를 넣어 보세요.'; return; } S.fd.torch = v; if (v) look('torch'); else status.textContent = '손전등을 껐어요. 창고가 깜깜해졌어요.'; renderTray(); }));
      if (S.fd.battery <= 0) tray.append(button('새 배터리 넣기', () => { S.fd.battery = 60; S.fd.swaps++; status.textContent = '새 배터리를 넣었어요. 손전등을 켜 보세요.'; renderTray(); }, 'mission-go'));
    }
  }
  if (mode === 'find') {
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-45); }
      if (e.key === 'ArrowRight') { e.preventDefault(); turn(45); }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (S.fd.battery > 0) { S.fd.torch = !S.fd.torch; if (S.fd.torch) look('torch'); renderTray(); } }
    });
    battery();
  }
  if (mode === 'path') {
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * 720 / r.width, y = (e.clientY - r.top) * 380 / r.height;
      const vis = seenIds(view()), o = STORE.objs.find((q) => vis.includes(q.id) && Math.hypot(q.x - x, q.y - y) < 20);
      if (o) [...tray.querySelectorAll('button')].find((b) => b.textContent === o.label)?.click();
    });
  }
  renderTray();
  status.textContent = fired && mode !== 'table' ? '이미 끝낸 활동이에요. 다시 해 봐도 괜찮아요.' : {
    light: '방 조명 밝기와 손전등을 바꾸고 「보이는 물건 세기」를 눌러 기록표의 네 조건을 채워요.',
    table: '앞에서 실험한 기록이에요.',
    path: '물건을 하나 고르면 그 물건에서 빛이 어떻게 왔는지 화살표로 보여요. 세 물건을 살펴봐요.',
    find: '등이 꺼진 창고예요. 손전등을 켜고 서 있을 곳과 방향을 바꾸며 물건 다섯 개를 찾아요.',
  }[mode];
  if (fired || mode === 'table') later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); clearInterval(timer); }};
}

// ---------------------------------------------------------------- 레이저 안전: 보안경을 쓰고, 흰 종이 쪽으로 겨눈 뒤 켠다
export function laserSafety({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '레이저 지시기 안전 점검', '실험대 위 레이저 지시기, 벽에 붙인 흰 종이, 옆자리 친구'), {c, status, tray, node} = d;
  const s = memory.laser ??= {goggles: !!memory.goggles, aim: '', on: false, done: false};
  let alive = true, raf = 0, fired = !!s.done;
  function draw() {
    if (!alive) return;
    paper(c, '#e9edf2', null);
    c.fillStyle = '#d8c7a6'; c.fillRect(30, 130, 600, 200); c.fillStyle = '#c4b08c'; c.fillRect(30, 322, 600, 8);
    c.fillStyle = '#ffffff'; c.strokeStyle = '#9aa4b2'; c.lineWidth = 2; c.fillRect(646, 150, 20, 160); c.strokeRect(646, 150, 20, 160);
    text(c, '흰 종이', 656, 140, {size: 12, align: 'center'});
    // 친구
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(430, 74, 20, 0, Math.PI * 2); c.fill(); c.fillStyle = '#4a3020'; c.beginPath(); c.arc(430, 66, 20, Math.PI, 0); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(423, 76, 2.3, 0, Math.PI * 2); c.arc(437, 76, 2.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a8f4a'; c.fillRect(410, 94, 40, 30); text(c, '친구', 462, 80, {size: 12});
    // 나
    const mx = 110, my = 228;
    c.fillStyle = '#3d6fb4'; c.fillRect(mx - 22, my + 22, 44, 60);
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(mx, my, 22, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2a1e14'; c.beginPath(); c.arc(mx, my - 8, 22, Math.PI, 0); c.fill();
    if (s.goggles) { c.fillStyle = 'rgba(80,200,120,.55)'; c.strokeStyle = '#1f5a36'; c.lineWidth = 2; c.fillRect(mx - 18, my - 6, 36, 12); c.strokeRect(mx - 18, my - 6, 36, 12); c.beginPath(); c.moveTo(mx - 22, my); c.lineTo(mx - 18, my); c.moveTo(mx + 18, my); c.lineTo(mx + 22, my); c.stroke(); }
    else { c.fillStyle = '#222'; c.beginPath(); c.arc(mx - 7, my - 1, 2.5, 0, Math.PI * 2); c.arc(mx + 7, my - 1, 2.5, 0, Math.PI * 2); c.fill(); }
    text(c, '나', mx, my + 100, {size: 12, align: 'center'});
    // 레이저 지시기
    const tip = {x: 168, y: 250}, aimAt = s.aim === 'friend' ? {x: 430, y: 74} : {x: 646, y: 250};
    const a = s.aim ? Math.atan2(aimAt.y - tip.y, aimAt.x - tip.x) : 0;
    c.save(); c.translate(tip.x, tip.y); c.rotate(a); c.fillStyle = '#3a3f48'; c.fillRect(-40, -5, 40, 10); c.fillStyle = '#c0392b'; c.fillRect(-4, -3, 4, 6); c.restore();
    text(c, '레이저 지시기', 130, 285, {size: 12});
    if (s.aim === 'friend') {
      c.strokeStyle = 'rgba(184,69,46,.8)'; c.lineWidth = 2; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(tip.x, tip.y); c.lineTo(aimAt.x - 30, aimAt.y + 26); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#b8452e'; c.lineWidth = 4; c.beginPath(); c.arc(330, 152, 18, 0, Math.PI * 2); c.moveTo(318, 140); c.lineTo(342, 164); c.stroke();
    }
    if (s.on) { c.strokeStyle = 'rgba(255,40,30,.3)'; c.lineWidth = 7; c.beginPath(); c.moveTo(tip.x, tip.y); c.lineTo(646, 250); c.stroke(); c.strokeStyle = '#ff2a1a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(tip.x, tip.y); c.lineTo(646, 250); c.stroke(); c.fillStyle = '#ff2a1a'; c.beginPath(); c.arc(648, 250, 5, 0, Math.PI * 2); c.fill(); }
    text(c, '레이저 빛을 사람의 눈에 비추지 않아요.', 20, 32, {size: 15, color: '#9a2d1a'});
    checks(c, [['보안경 쓰기', !!s.goggles], ['흰 종이 쪽으로 겨누기', s.aim === 'paper'], ['레이저 켜기', !!s.on]], 20, 362);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren(
      seg(el, button, '보안경', [[false, '벗기'], [true, '쓰기']], !!s.goggles, (v) => { const wasOn = s.on; s.goggles = v; memory.goggles = v; if (!v && s.on) s.on = false; status.textContent = v ? '레이저 보안경을 썼어요.' : wasOn ? '보안경을 벗었어요. 레이저를 껐어요.' : '보안경을 벗었어요.'; renderTray(); }),
      seg(el, button, '겨눌 곳', [['paper', '흰 종이 쪽'], ['friend', '친구 쪽']], s.aim, (v) => { if (s.on) s.on = false; s.aim = v; status.textContent = v === 'friend' ? '친구 쪽으로는 겨누지 않아요. 레이저 빛이 눈에 들어가면 눈을 다칠 수 있어요.' : '흰 종이 쪽으로 겨눴어요.'; renderTray(); }),
      button('레이저 켜기', () => {
        if (!s.goggles) { status.textContent = '먼저 보안경을 써요.'; return; }
        if (!s.aim) { status.textContent = '어디를 겨눌지 먼저 골라요.'; return; }
        if (s.aim === 'friend') { status.textContent = '레이저 빛은 사람의 눈이나 얼굴 쪽으로 겨누지 않아요. 흰 종이 쪽으로 돌려요.'; return; }
        s.on = true; memory.goggles = true; status.textContent = '레이저 빛이 흰 종이에 닿았어요. 이제 안전하게 실험할 수 있어요.';
        if (!fired) { fired = true; s.done = true; onAction('safe'); onReady?.(); }
      }, 'mission-go'));
  }
  renderTray();
  status.textContent = fired ? '이미 안전 점검을 마쳤어요.' : '레이저를 켜기 전에 보안경을 쓰고 겨눌 곳을 정해요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 빛 경로 퍼즐: 직진, 반사, 굴절(물, 렌즈), 종합(등대), 더 해보기(ㄷ자 통로, 렌즈 고르기, 그림자 속 빛 감지기, 반투명 표적)
// 부품은 정해진 자리와 방향 가운데에서 단추로 옮기고 돌린다. 각도 숫자는 보이지 않는다.
const ROT = Array.from({length: 16}, (_, i) => i * 22.5);
const RANGE = (a, b, step) => Array.from({length: Math.round((b - a) / step) + 1}, (_, i) => a + i * step);
const seg2 = (x1, y1, x2, y2) => ({x1, y1, x2, y2});
const BOARD_X = [220, 340, 460];
const WALLS_MIRROR = [seg2(40, 260, 380, 260), seg2(380, 260, 380, 30), seg2(460, 30, 460, 340), seg2(40, 340, 460, 340), seg2(40, 260, 40, 340)];
const WALLS_CHANNEL = [seg2(40, 40, 460, 40), seg2(460, 40, 460, 340), seg2(460, 340, 40, 340), seg2(40, 120, 380, 120), seg2(380, 120, 380, 260), seg2(380, 260, 40, 260), seg2(40, 40, 40, 120)];
const hitCount = (res, id) => res.filter((r) => r.hits.includes(id)).length;
// hide가 붙은 장애물은 계산에만 쓰고 굵은 벽으로 그리지 않는다(실험대 테두리, 스크린, 따로 그리는 나무 블록)
const hide = (b) => ({...b, hide: true});
const rect4 = (x, y, w, h) => [seg2(x, y, x + w, y), seg2(x + w, y, x + w, y + h), seg2(x + w, y + h, x, y + h), seg2(x, y + h, x, y)];
const FRAME = [seg2(40, 30, 700, 30), seg2(700, 30, 700, 350), seg2(700, 350, 40, 350), seg2(40, 350, 40, 30)].map(hide);
// 그림자 퍼즐(더 해보기): 위에서 본 어두운 실험대. 손전등은 한 점에서 0.5도 간격으로 퍼지는 빛 129줄로 계산한다.
// 나무 블록 1은 위쪽 벽에, 나무 블록 2는 아래쪽 벽에 붙어 있고, 빛 감지기는 흰 스크린 앞에 있다.
// 손전등 자리 여섯 곳 가운데 감지기에 빛이 닿는 곳은 200 한 곳뿐이다(감지기를 위아래로 8 늘이거나 블록 끝을 4 옮겨도 같다, 0.25도 간격으로 확인).
const SHADE = {lamp: 100, screen: 650, sensor: 190, blocks: [{name: '나무 블록 1', x: 250, y: 30, w: 24, h: 154}, {name: '나무 블록 2', x: 430, y: 198, w: 24, h: 152}]};
const fan = (x, y) => Array.from({length: 129}, (_, i) => { const a = (-32 + i * 0.5) * Math.PI / 180; return {x, y, dx: Math.cos(a), dy: Math.sin(a)}; });
// 손전등에서 감지기 가운데로 곧게 그은 선을 가리는 블록
const shadeOf = (ly) => SHADE.blocks.find((b) => segHitsRect({x: SHADE.lamp, y: ly}, {x: 640, y: SHADE.sensor}, b));
export const RAY_PUZZLES = {
  straight: {owner: '빛의 직진 퍼즐', label: '레이저 지시기, 구멍 뚫린 판 세 장, 표적이 놓인 실험대', stages: [{
    name: '구멍 뚫린 판',
    parts: [1, 3, 0].map((at, i) => ({id: 'b' + (i + 1), name: `판 ${i + 1}`, kind: 'y', vals: [110, 150, 190, 230, 270], at})),
    build: (v) => ({rays: [{x: 78, y: 190, dx: 1, dy: 0}], blocks: [seg2(50, 182, 50, 198), ...BOARD_X.flatMap((x, i) => [seg2(x, 60, x, v[i] - 9), seg2(x, v[i] + 9, x, 320)]), seg2(700, 0, 700, 380)], targets: [{id: 'T', ...seg2(600, 178, 600, 202)}]}),
    goal: (res) => allHit(res, 'T'),
    say: (res) => { if (allHit(res, 'T')) return '빛이 세 구멍을 곧게 지나 표적에 닿았어요.'; const i = BOARD_X.findIndex((x) => Math.abs(res[0].stop[0] - x) < 1); return i >= 0 ? `빛이 판 ${i + 1}에 막혔어요. 빛은 곧게 나아가니 구멍을 빛이 지나는 줄에 맞춰 봐요.` : '빛이 표적에 닿지 않았어요.'; },
  }]},
  mirror: {owner: '빛의 반사 퍼즐', label: '레이저 지시기, 꺾인 통로, 평면거울 한 개, 모퉁이 너머 표적', stages: [{
    name: '꺾인 통로',
    parts: [{id: 'm', name: '평면거울', kind: 'rot', vals: ROT, at: 12}],
    build: (v) => ({rays: [{x: 78, y: 300, dx: 1, dy: 0}], mirrors: [mirrorAt(420, 300, v[0], 26)], blocks: [seg2(50, 292, 50, 308), ...WALLS_MIRROR], targets: [{id: 'T', ...seg2(386, 36, 454, 36)}]}),
    goal: (res) => allHit(res, 'T'),
    say: (res, v, ctx) => res[0].end === 'back' ? '빛이 거울 뒷면에 닿아 막혔어요. 거울의 반짝이는 앞면이 빛 쪽을 보게 돌려 봐요.' : allHit(res, 'T') ? '거울에서 방향이 바뀐 빛이 모퉁이 너머 표적에 닿았어요.' : ctx.moved ? '거울을 돌렸더니 반사된 빛이 나아가는 방향이 바뀌었어요.' : '거울에 닿은 빛이 방향이 바뀌어 나아가요.',
  }]},
  water: {owner: '공기와 물의 경계 퍼즐', label: '물이 든 네모 수조와 원형 물통에 레이저 빛을 비추는 실험대', stages: [{
    name: '네모 수조',
    parts: [{id: 'l', name: '레이저 지시기', kind: 'x', vals: RANGE(100, 320, 20), at: 5}],
    build: (v) => ({rays: [{x: v[0], y: 80, dx: 1, dy: 1.2}], waters: [{shape: 'rect', x: 200, y: 170, w: 360, h: 160}], blocks: [seg2(0, 352, 720, 352)], targets: [{id: 'T', ...seg2(388, 322, 412, 322)}]}),
    goal: (res) => allHit(res, 'T'),
    say: (res) => allHit(res, 'T') ? '물에 들어가는 곳에서 꺾인 빛이 물속 표적에 닿았어요.' : res[0].bends ? '빛이 공기와 물의 경계에서 꺾였어요. 겨냥선과 실제 빛이 갈라지는 곳을 보세요.' : res[0].end === 'absorb' && res[0].stop[1] < 340 ? '빛이 수조 옆면의 검은 판에 막혔어요. 레이저를 옮겨 빛이 윗면으로 들어가게 해 봐요.' : '빛이 물에 들어가지 않았어요.',
  }, {
    name: '원형 물통',
    parts: [{id: 'l3', name: '레이저 지시기', kind: 'y', vals: RANGE(110, 270, 20), at: 1}],
    build: (v) => ({rays: [-20, 0, 20].map((o) => ({x: 92, y: v[0] + o, dx: 1, dy: 0})), waters: [{shape: 'circle', cx: 360, cy: 190, r: 60}], blocks: [seg2(660, 0, 660, 380)], targets: [{id: 'T', ...seg2(480, 185, 480, 195)}]}),
    goal: (res) => allHit(res, 'T'),
    say: (res) => allHit(res, 'T') ? '가장자리 빛 두 줄은 물통에 들어갈 때와 나올 때 꺾이고, 가운데 빛은 곧게 지나 세 줄이 표적에 모였어요.' : (hitCount(res, 'T') ? `빛 ${hitCount(res, 'T')}줄이 표적에 닿았어요.` : '표적에 닿은 빛이 없어요.') + ' 빛이 물통 경계에서 어떻게 꺾이는지 보며 레이저를 옮겨 봐요.',
  }]},
  lens: {owner: '공기와 렌즈의 경계 퍼즐', label: '빛 세 줄이 나오는 레이저, 볼록 렌즈와 오목 렌즈, 표적', stages: [{
    name: '볼록 렌즈',
    parts: [{id: 'L', name: '볼록 렌즈', kind: 'x', vals: [240, 300, 360, 420, 480, 540], at: 1}],
    build: (v) => ({rays: [170, 190, 210].map((y) => ({x: 92, y, dx: 1, dy: 0})), lenses: [lensAt(v[0], 190, 50, 100)], blocks: [seg2(700, 0, 700, 380)], targets: [{id: 'T', ...seg2(580, 184, 580, 196)}]}),
    goal: (res) => allHit(res, 'T'),
    say: (res) => allHit(res, 'T') ? '볼록 렌즈를 지난 가장자리 빛 두 줄이 렌즈의 두꺼운 가운데 쪽으로 꺾여, 곧게 지난 가운데 빛과 한곳에서 모였어요. 작은 표적에 닿았어요.' : '볼록 렌즈를 지난 빛이 가운데 쪽으로 꺾여 한곳으로 모였다가 다시 퍼져요. 모이는 곳이 표적에 오게 렌즈를 옮겨 봐요.',
  }, {
    name: '오목 렌즈',
    parts: [{id: 'L', name: '오목 렌즈', kind: 'x', vals: [250, 310, 370, 430, 490, 550], at: 5}],
    build: (v) => ({rays: [170, 190, 210].map((y) => ({x: 92, y, dx: 1, dy: 0})), lenses: [lensAt(v[0], 190, 50, -80)], blocks: [seg2(700, 0, 700, 380)], targets: [{id: 'A', ...seg2(650, 118, 650, 142)}, {id: 'B', ...seg2(650, 178, 650, 202)}, {id: 'C', ...seg2(650, 238, 650, 262)}]}),
    goal: (res) => ['A', 'B', 'C'].every((id) => anyHit(res, id)),
    say: (res) => { const n = ['A', 'B', 'C'].filter((id) => anyHit(res, id)).length; return n === 3 ? '오목 렌즈를 지난 가장자리 빛 두 줄은 렌즈의 두꺼운 가장자리 쪽으로 꺾여 퍼지고, 가운데 빛은 곧게 나아가 넓은 표적 세 칸을 한꺼번에 밝혔어요.' : `오목 렌즈를 지난 빛이 가장자리 쪽으로 꺾여 퍼져요. 표적 ${n}칸이 밝아졌어요. 렌즈를 옮겨 세 칸을 모두 밝혀 봐요.`; },
  }]},
  combo: {owner: '2050년 등대 빛 고치기', label: '밤바다의 등대, 빛을 꺾을 평면거울과 볼록 렌즈, 항구 표적', night: true, stages: [{
    name: '등대',
    parts: [{id: 'm', name: '평면거울', kind: 'rot', vals: ROT, at: 12}, {id: 'L', name: '볼록 렌즈', kind: 'y', vals: [160, 190, 220, 250, 280], at: 0}],
    build: (v) => ({rays: [70, 90, 110].map((y) => ({x: 92, y, dx: 1, dy: 0})), mirrors: [mirrorAt(380, 90, v[0], 34)], lenses: [lensAt(380, v[1], 40, 60, 'y')], blocks: [seg2(80, 56, 80, 124), seg2(470, 0, 470, 300), seg2(0, 352, 720, 352)], targets: [{id: 'T', ...seg2(374, 340, 386, 340)}]}),
    goal: (res) => allHit(res, 'T'),
    say: (res) => {
      if (allHit(res, 'T')) return '거울에서 방향이 바뀐 빛이 볼록 렌즈를 지나며 모여 항구 표적에 닿았어요. 배들이 항구로 들어와요.';
      if (res.some((r) => r.end === 'back')) return '빛이 거울 뒷면에 닿아 막혔어요. 거울의 앞면이 등대 쪽을 보게 돌려 봐요.';
      if (res.some((r) => r.end === 'absorb' && Math.abs(r.stop[0] - 470) < 1)) return '빛이 절벽에 막혔어요. 거울을 돌려 빛이 항구 쪽으로 가게 해 봐요.';
      if (res.some((r) => r.end === 'absorb' && Math.abs(r.stop[0] - 80) < 1)) return '거울에 닿은 빛이 등대 쪽으로 되돌아왔어요. 거울을 돌려 봐요.';
      const n = hitCount(res, 'T');
      return n ? `항구 표적에 빛 ${n}줄이 닿았어요. 볼록 렌즈를 옮겨 빛 세 줄이 한곳에 모이게 해 봐요.` : '빛이 항구 표적에 닿지 않았어요. 거울과 렌즈를 살펴봐요.';
    },
  }]},
  channel: {owner: 'ㄷ자 통로 퍼즐', label: '레이저 지시기, ㄷ자 모양 통로, 평면거울 두 개, 표적', stages: [{
    name: 'ㄷ자 통로',
    parts: [{id: 'm1', name: '거울 1', kind: 'rot', vals: ROT, at: 12}, {id: 'm2', name: '거울 2', kind: 'rot', vals: ROT, at: 12}],
    build: (v) => ({rays: [{x: 78, y: 80, dx: 1, dy: 0}], mirrors: [mirrorAt(420, 80, v[0], 26), mirrorAt(420, 300, v[1], 26)], blocks: [seg2(50, 72, 50, 88), ...WALLS_CHANNEL], targets: [{id: 'T', ...seg2(60, 288, 60, 312)}]}),
    goal: (res) => allHit(res, 'T'),
    say: (res, v, ctx) => res[0].end === 'back' ? '빛이 거울 뒷면에 닿아 막혔어요. 거울의 앞면이 빛 쪽을 보게 돌려 봐요.' : allHit(res, 'T') ? '거울 두 개에서 방향이 바뀐 빛이 ㄷ자 통로를 지나 표적에 닿았어요.' : ctx.moved ? '거울을 돌렸더니 반사된 빛이 나아가는 방향이 바뀌었어요.' : '빛이 거울 1에 닿아 방향이 바뀌었어요.',
  }]},
  pick: {owner: '렌즈 고르기', label: '빛 세 줄이 나오는 레이저, 렌즈 자리, 세 칸짜리 넓은 간판', stages: [{
    name: '넓은 간판',
    parts: [{id: 'k', name: '렌즈 자리', kind: 'pick', vals: ['none', 'convex', 'concave'], names: ['비우기', '볼록 렌즈', '오목 렌즈'], at: 0}],
    build: (v) => { const f = v[0] === 'convex' ? 112 : v[0] === 'concave' ? -112 : 0; return {rays: [170, 190, 210].map((y) => ({x: 92, y, dx: 1, dy: 0})), lenses: f ? [lensAt(360, 190, 50, f)] : [], blocks: [seg2(700, 0, 700, 380)], targets: [{id: 'A', ...seg2(640, 106, 640, 134)}, {id: 'B', ...seg2(640, 176, 640, 204)}, {id: 'C', ...seg2(640, 246, 640, 274)}]}; },
    goal: (res) => ['A', 'B', 'C'].every((id) => anyHit(res, id)),
    say: (res, v) => ['A', 'B', 'C'].every((id) => anyHit(res, id)) ? '오목 렌즈로 빛을 퍼뜨려 간판 세 칸을 모두 밝혔어요.' : v[0] === 'convex' ? '볼록 렌즈를 지난 빛은 모였다가 다시 퍼져서 간판 위아래 칸에 닿지 않아요.' : '렌즈가 없으면 빛 세 줄이 곧게 나아가 가운데 칸만 밝아요.',
  }]},
  shadow: {owner: '그림자 속 빛 감지기', label: '위에서 본 어두운 실험대. 왼쪽에 위아래로 옮길 수 있는 손전등, 가운데에 나무 블록 두 개, 오른쪽에 흰 스크린과 빛 감지기가 있어요.', lamp: true, stages: [{
    name: '나무 블록',
    parts: [{id: 'f', name: '손전등', kind: 'y', vals: [80, 120, 160, 200, 240, 280], at: 1}],
    build: (v) => ({rays: fan(SHADE.lamp, v[0]), blocks: [hide(seg2(40, 30, 700, 30)), hide(seg2(40, 350, 700, 350)), hide(seg2(SHADE.screen, 30, SHADE.screen, 350)), ...SHADE.blocks.flatMap((b) => rect4(b.x, b.y, b.w, b.h).map(hide))], targets: [{id: 'T', ...seg2(640, SHADE.sensor - 12, 640, SHADE.sensor + 12)}]}),
    goal: (res) => anyHit(res, 'T'),
    say: (res, v, ctx) => {
      if (anyHit(res, 'T')) return '손전등 빛이 두 나무 블록 사이로 곧게 지나 빛 감지기에 닿았어요.';
      const b = shadeOf(v[0]);
      return (b ? `빛 감지기가 ${b.name}의 그림자 속에 있어요. 빛은 곧게 나아가서 블록에 막힌 뒤쪽에는 닿지 않아요.` : '빛 감지기에 빛이 닿지 않았어요.') + (ctx.moved ? ' 손전등을 옮기니 그림자의 자리도 바뀌었어요.' : ' 손전등을 옮겨 봐요.');
    },
  }]},
  pass: {owner: '반투명 표적 퍼즐', label: '레이저 지시기, 평면거울 두 개, 한 줄로 놓인 반투명 표적과 표적', stages: [{
    name: '두 표적',
    parts: [{id: 'm1', name: '거울 1', kind: 'rot', vals: ROT, at: 12}, {id: 'm2', name: '거울 2', kind: 'rot', vals: ROT, at: 0}],
    build: (v) => ({rays: [{x: 78, y: 300, dx: 1, dy: 0}], mirrors: [mirrorAt(250, 300, v[0], 26), mirrorAt(250, 90, v[1], 26)], blocks: [seg2(50, 292, 50, 308), ...FRAME], targets: [{id: 'A', ...seg2(420, 76, 420, 104), pass: true}, {id: 'B', ...seg2(600, 76, 600, 104)}]}),
    goal: (res) => anyHit(res, 'A') && anyHit(res, 'B'),
    say: (res, v, ctx) => {
      const a = anyHit(res, 'A'), b = anyHit(res, 'B'), r = res[0];
      if (a && b) return '빛 일부가 반투명 표적을 지나 곧게 나아가 뒤 표적에도 닿았어요. 두 표적이 모두 밝아졌어요.';
      if (r.end === 'back') return '빛이 거울 뒷면에 닿아 막혔어요. 거울의 앞면이 빛 쪽을 보게 돌려 봐요.';
      if (a) return '반투명 표적은 밝아졌지만 뒤 표적에는 빛이 닿지 않았어요. 두 표적이 한 줄로 놓인 쪽으로 빛을 보내 봐요.';
      if (r.end === 'absorb' && Math.abs(r.stop[0] - 50) < 1) return '거울에서 방향이 바뀐 빛이 레이저 쪽으로 되돌아왔어요. 거울을 돌려 봐요.';
      return (ctx.moved ? '거울을 돌렸더니 반사된 빛이 나아가는 방향이 바뀌었어요.' : '빛이 아직 표적에 닿지 않았어요.') + ' 거울 두 개로 빛을 두 표적이 놓인 줄로 보내 봐요.';
    },
  }]},
};
function drawMirror(c, m, two = false) {
  const u = [m.x2 - m.x1, m.y2 - m.y1], len = Math.hypot(u[0], u[1]), nx = two ? 0 : m.nx, ny = two ? 0 : m.ny;
  c.lineCap = 'round';
  if (!two) {
    c.strokeStyle = '#5b5f66'; c.lineWidth = 6; c.beginPath(); c.moveTo(m.x1 - nx * 3, m.y1 - ny * 3); c.lineTo(m.x2 - nx * 3, m.y2 - ny * 3); c.stroke();
    c.strokeStyle = '#3c4048'; c.lineWidth = 1.2; c.beginPath();
    for (let t = 0.1; t < 1; t += 0.15) { const x = m.x1 + u[0] * t - nx * 5, y = m.y1 + u[1] * t - ny * 5; c.moveTo(x, y); c.lineTo(x - nx * 5 + u[0] / len * 4, y - ny * 5 + u[1] / len * 4); }
    c.stroke();
  }
  if (two) { c.strokeStyle = '#5b6b7c'; c.lineWidth = 7; c.beginPath(); c.moveTo(m.x1, m.y1); c.lineTo(m.x2, m.y2); c.stroke(); }
  c.strokeStyle = '#eaf2f8'; c.lineWidth = 4; c.beginPath(); c.moveTo(m.x1, m.y1); c.lineTo(m.x2, m.y2); c.stroke();
  c.strokeStyle = '#8fb3cf'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(m.x1, m.y1); c.lineTo(m.x2, m.y2); c.stroke();
  c.lineCap = 'butt';
}
const lensW = (L) => Math.max(7, Math.hypot(L.x2 - L.x1, L.y2 - L.y1) / 2 * 0.22);
// 렌즈 그림의 한쪽 면이 렌즈 가운데 선에서 떨어진 거리(가운데 선 위 높이 y에서)
function lensFace(L, y) { const half = Math.hypot(L.x2 - L.x1, L.y2 - L.y1) / 2, w = lensW(L), q = 1 - Math.min(1, (y / half) ** 2); return L.f > 0 ? w * q : w - 0.425 * w * q; }
// 얇은 렌즈로 계산한 빛을 그릴 때는 렌즈의 두 면(공기와 렌즈의 경계)에서 나누어 꺾이게 그린다. 렌즈 밖의 빛 길은 바뀌지 않는다.
function beamPoints(r) {
  if (!r.lensAtPoint?.length) return r.points;
  const out = [];
  r.points.forEach((p, i) => {
    const m = r.lensAtPoint.find((x) => x.i === i);
    if (!m) return out.push(p);
    const L = m.lens, cx = (L.x1 + L.x2) / 2, cy = (L.y1 + L.y2) / 2, ux = (L.x2 - L.x1), uy = (L.y2 - L.y1), ul = Math.hypot(ux, uy), u = [ux / ul, uy / ul], ax = [-u[1], u[0]];
    const y = (p[0] - cx) * u[0] + (p[1] - cy) * u[1], off = lensFace(L, y);
    const ki = Math.max(0.35, Math.abs(m.din[0] * ax[0] + m.din[1] * ax[1])), ko = Math.max(0.35, Math.abs(m.dout[0] * ax[0] + m.dout[1] * ax[1]));
    out.push([p[0] - m.din[0] * off / ki, p[1] - m.din[1] * off / ki], [p[0] + m.dout[0] * off / ko, p[1] + m.dout[1] * off / ko]);
  });
  return out;
}
function drawLens(c, L) {
  const half = Math.hypot(L.x2 - L.x1, L.y2 - L.y1) / 2, w = lensW(L), conv = L.f > 0;
  c.save(); c.translate((L.x1 + L.x2) / 2, (L.y1 + L.y2) / 2); if (L.axis === 'y') c.rotate(Math.PI / 2);
  c.beginPath();
  if (conv) { c.moveTo(0, -half); c.quadraticCurveTo(w * 2, 0, 0, half); c.quadraticCurveTo(-w * 2, 0, 0, -half); }
  else { c.moveTo(-w, -half); c.lineTo(w, -half); c.quadraticCurveTo(w * 0.15, 0, w, half); c.lineTo(-w, half); c.quadraticCurveTo(-w * 0.15, 0, -w, -half); }
  c.fillStyle = 'rgba(160,215,255,.6)'; c.fill(); c.strokeStyle = '#3f7fb0'; c.lineWidth = 1.6; c.stroke();
  c.restore();
}
function drawLaser(c, x, y, dir = [1, 0], n = 1) {
  const a = Math.atan2(dir[1], dir[0]);
  c.save(); c.translate(x, y); c.rotate(a);
  const h = n > 1 ? 54 : 14; c.fillStyle = '#3a3f48'; c.fillRect(-40, -h / 2, 40, h); c.fillStyle = '#596170'; c.fillRect(-36, -h / 2 + 2, 10, h - 4);
  c.fillStyle = '#d03a2a'; for (const o of n > 1 ? [-20, 0, 20] : [0]) c.fillRect(-4, o - 3, 4, 6);
  c.restore();
}
function drawTarget(c, t, lit) {
  const cx = (t.x1 + t.x2) / 2, cy = (t.y1 + t.y2) / 2, vert = Math.abs(t.x1 - t.x2) < 1, len = Math.hypot(t.x2 - t.x1, t.y2 - t.y1);
  // 반투명 표적: 얇고 비쳐 보이는 판(점선 테두리). 빛이 닿으면 밝아지고 빛 일부는 그대로 지나간다.
  if (t.pass) {
    c.fillStyle = lit ? 'rgba(255,211,77,.6)' : 'rgba(205,216,230,.55)'; c.strokeStyle = lit ? '#b07a00' : '#7d8794'; c.lineWidth = 1.5; c.setLineDash([3, 3]);
    if (vert) { c.fillRect(cx - 4, cy - len / 2, 8, len); c.strokeRect(cx - 4, cy - len / 2, 8, len); } else { c.fillRect(cx - len / 2, cy - 4, len, 8); c.strokeRect(cx - len / 2, cy - 4, len, 8); }
    c.setLineDash([]);
    if (lit) { c.fillStyle = 'rgba(255,220,90,.25)'; c.beginPath(); c.arc(cx, cy, 14, 0, Math.PI * 2); c.fill(); }
    return;
  }
  c.fillStyle = lit ? '#ffd34d' : '#d9dee6'; c.strokeStyle = lit ? '#b07a00' : '#7d8794'; c.lineWidth = 2;
  if (vert) { c.fillRect(cx, cy - len / 2, 10, len); c.strokeRect(cx, cy - len / 2, 10, len); }
  else { c.fillRect(cx - len / 2, cy, len, 10); c.strokeRect(cx - len / 2, cy, len, 10); }
  if (lit) { c.fillStyle = 'rgba(255,220,90,.35)'; c.beginPath(); c.arc(cx + (vert ? 5 : 0), cy + (vert ? 0 : 5), 16, 0, Math.PI * 2); c.fill(); }
}
const onSeg = (p, t) => { const vx = t.x2 - t.x1, vy = t.y2 - t.y1, u = Math.max(0, Math.min(1, ((p[0] - t.x1) * vx + (p[1] - t.y1) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(p[0] - t.x1 - u * vx, p[1] - t.y1 - u * vy) < 0.6; };
// passT(반투명 표적)를 지난 뒤의 빛은 일부만 지나가므로 흐리게 그린다
function drawBeams(c, res, col = '#ff2a1a', glow = 'rgba(255,60,40,.25)', passT = []) {
  for (const r of res) {
    c.lineJoin = 'round';
    const pts = beamPoints(r), k = passT.length ? pts.findIndex((p, i) => i > 0 && passT.some((t) => onSeg(p, t))) : -1;
    for (const [ps, alpha] of k > 0 ? [[pts.slice(0, k + 1), 1], [pts.slice(k), 0.45]] : [[pts, 1]]) {
      c.globalAlpha = alpha;
      c.strokeStyle = glow; c.lineWidth = 7; c.beginPath(); ps.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); ps.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    }
    c.globalAlpha = 1;
  }
}
// 손전등 빛: 이웃한 두 줄기가 같은 면(같은 가로선이나 세로선)에서 멈추면 그 사이를 밝게 칠한다. 멈춘 곳이 다르면 줄기만 그려 그림자 경계를 넘겨 칠하지 않는다.
function drawFan(c, res) {
  const same = (p, q) => Math.abs(p[0] - q[0]) < 0.5 || Math.abs(p[1] - q[1]) < 0.5;
  c.fillStyle = 'rgba(255,214,90,.3)';
  for (let i = 0; i + 1 < res.length; i++) { const a = res[i], b = res[i + 1]; if (!same(a.stop, b.stop)) continue; c.beginPath(); c.moveTo(a.points[0][0], a.points[0][1]); c.lineTo(a.stop[0], a.stop[1]); c.lineTo(b.stop[0], b.stop[1]); c.closePath(); c.fill(); }
  c.strokeStyle = 'rgba(255,200,60,.35)'; c.lineWidth = 1; c.beginPath();
  for (const r of res) { c.moveTo(r.points[0][0], r.points[0][1]); c.lineTo(r.stop[0], r.stop[1]); }
  c.stroke();
}
function drawLamp(c, x, y) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#4a6fa5'; c.fillRect(-46, -7, 34, 14); c.fillStyle = '#3fbf6a'; c.beginPath(); c.arc(-30, -7, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#c7cfd8'; c.beginPath(); c.moveTo(-12, -9); c.lineTo(-1, -14); c.lineTo(-1, 14); c.lineTo(-12, 9); c.closePath(); c.fill();
  c.fillStyle = '#ffe680'; c.fillRect(-3, -13, 3, 26);
  c.restore();
}
// 그림자 퍼즐의 손전등 길, 흰 스크린, 나무 블록
function drawShadeProps(c, vals, ly) {
  c.strokeStyle = 'rgba(200,210,230,.45)'; c.lineWidth = 2; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(70, vals[0] - 16); c.lineTo(70, vals[vals.length - 1] + 16); c.stroke(); c.setLineDash([]);
  for (const y of vals) { c.fillStyle = y === ly ? '#ffe680' : 'rgba(200,210,230,.6)'; c.fillRect(62, y - 1.5, 16, 3); }
  c.fillStyle = '#4a5162'; c.fillRect(SHADE.screen, 30, 14, 320); c.strokeStyle = '#9aa4b2'; c.lineWidth = 1.5; c.strokeRect(SHADE.screen, 30, 14, 320);
  for (const b of SHADE.blocks) {
    c.fillStyle = '#8a5a34'; c.fillRect(b.x, b.y, b.w, b.h); c.fillStyle = '#a8774a'; c.fillRect(b.x + 3, b.y, 5, b.h);
    c.strokeStyle = 'rgba(60,35,15,.5)'; c.lineWidth = 1; c.beginPath(); for (let y = b.y + 22; y < b.y + b.h; y += 26) { c.moveTo(b.x + 10, y); c.lineTo(b.x + b.w - 3, y + 4); } c.stroke();
  }
}
// 스크린: 빛 줄기가 닿은 곳만 밝게 칠한다. 그림자는 손전등 자리에서 블록 네 모서리를 스크린까지 곧게 이은 범위(한 점에서 나오는 빛의 그림자)를 합친 곳이다.
function drawShadeBands(c, ly, res) {
  const onScreen = (r) => r && Math.abs(r.stop[0] - SHADE.screen) < 0.5;
  c.fillStyle = '#fff1b8';
  res.forEach((a, i) => { if (!onScreen(a)) return; const b = res[i + 1], y1 = onScreen(b) ? b.stop[1] : a.stop[1]; c.fillRect(SHADE.screen, Math.min(a.stop[1], y1) - 1, 14, Math.abs(y1 - a.stop[1]) + 2); });
  const spans = SHADE.blocks.map((b) => { const ys = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([x, y]) => ly + (y - ly) * (SHADE.screen - SHADE.lamp) / (x - SHADE.lamp)); return [Math.max(30, Math.min(...ys)), Math.min(350, Math.max(...ys))]; })
    .filter(([y0, y1]) => y1 - y0 >= 2).sort((p, q) => p[0] - q[0]);
  const merged = [];
  for (const [y0, y1] of spans) { const last = merged[merged.length - 1]; if (last && y0 <= last[1]) last[1] = Math.max(last[1], y1); else merged.push([y0, y1]); }
  for (const [y0, y1] of merged) {
    c.fillStyle = 'rgba(10,12,20,.4)'; c.fillRect(SHADE.screen - 14, y0, 28, y1 - y0);
    if (y1 - y0 > 24) chip(c, '그림자', 690, (y0 + y1) / 2 + 5, {size: 11, bg: 'rgba(40,46,62,.92)', color: '#e8ecf2'});
  }
}
function partBox(mode, stage, p, v) {
  const val = v[stage.parts.indexOf(p)]; // v는 부품 값(자리, 각)
  if (mode === 'straight') { const x = BOARD_X[stage.parts.indexOf(p)]; return [x - 12, 52, 24, 276]; }
  if (mode === 'shadow') return [50, val - 20, 56, 40];
  if (p.kind === 'rot') { const m = stage.build(v).mirrors[stage.parts.filter((q) => q.kind === 'rot').indexOf(p)]; return [m.cx - 36, m.cy - 36, 72, 72]; }
  if (mode === 'water' && stage.name === '네모 수조') return [val - 48, 60, 56, 40];
  if (mode === 'water') return [44, val - 34, 56, 68];
  if (mode === 'combo') return [334, val - 16, 92, 32];
  if (mode === 'pick') return [340, 132, 40, 116];
  return [val - 22, 132, 44, 116];
}
const RAY_CHEERS = {straight: ['세 구멍을 지나 명중이에요'], mirror: ['거울로 모퉁이를 돌았어요'], water: ['꺾인 빛으로 명중이에요', '들어갈 때도 나올 때도 꺾였어요'], lens: ['빛을 한곳에 모았어요', '세 칸이 모두 환해요'], combo: ['배들이 항구로 돌아와요'], channel: ['두 번 꺾어 명중이에요'], pick: ['간판이 환해졌어요'], shadow: ['그림자 틈으로 쏙 통과했어요'], pass: ['두 표적 모두 반짝여요']};
function drawParty(c, party, res, sc, k, night) {
  const age = k - party.k0; if (age > 170) return;
  const rm = reduceMotion(), lit = (sc.targets || []).filter((t) => anyHit(res, t.id));
  if (!lit.length) return;
  const grow = rm ? 1 : Math.min(1, age / 18), fade = Math.min(1, (170 - age) / 30);
  c.save(); c.globalAlpha = fade; c.strokeStyle = night ? '#ffe680' : '#f2b632'; c.lineWidth = 2.5; c.lineCap = 'round';
  for (const t of lit) {
    const cx = (t.x1 + t.x2) / 2, cy = (t.y1 + t.y2) / 2, spin = rm ? 0 : age * 0.02;
    for (let i = 0; i < 8; i++) { const a = spin + i * Math.PI / 4, r0 = 14 + 6 * grow, r1 = 18 + 16 * grow; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke(); }
  }
  const t = lit[0], cx = (t.x1 + t.x2) / 2, cy = (t.y1 + t.y2) / 2;
  c.font = FONT(13, true); const w = c.measureText(party.text).width + 20, h = 26;
  const bx = Math.max(8, Math.min(712 - w, cx - w / 2)), above = cy - 44 - h > 8, by = above ? cy - 44 - h : Math.min(372 - h, cy + 40);
  c.fillStyle = '#ffffff'; c.strokeStyle = '#1d4f86'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(bx + 10, by); c.arcTo(bx + w, by, bx + w, by + h, 10); c.arcTo(bx + w, by + h, bx, by + h, 10); c.arcTo(bx, by + h, bx, by, 10); c.arcTo(bx, by, bx + w, by, 10); c.closePath(); c.fill(); c.stroke();
  const tx = Math.max(bx + 12, Math.min(bx + w - 12, cx));
  c.beginPath(); if (above) { c.moveTo(tx - 6, by + h - 1); c.lineTo(tx, by + h + 8); c.lineTo(tx + 6, by + h - 1); } else { c.moveTo(tx - 6, by + 1); c.lineTo(tx, by - 8); c.lineTo(tx + 6, by + 1); } c.closePath(); c.fill();
  text(c, party.text, bx + w / 2, by + 18, {size: 13, color: '#1d4f86', align: 'center'});
  c.restore();
}
export function rayPuzzle({el, button, mode = 'straight', task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire), P = RAY_PUZZLES[mode] || RAY_PUZZLES.straight;
  const d = device(el, P.owner, P.label, true), {c, status, tray, node, canvas} = d;
  const s = memory['ray-' + mode] ??= {stage: 0, v: P.stages.map((st) => st.parts.map((p) => p.at)), solved: P.stages.map(() => false), done: false};
  let alive = true, raf = 0, k = 0, fired = !!s.done, sel = 0, res = [], ship = 0, party = null;
  const stage = () => P.stages[s.stage], vals = () => stage().parts.map((p, i) => p.vals[s.v[s.stage][i]]);
  const goggles = () => !!P.lamp || !!P.night || !!memory.goggles; // 손전등 퍼즐과 등대 불빛 퍼즐은 레이저가 아니므로 보안경 없이 켠다
  function recompute() { res = goggles() ? trace(stage().build(vals())) : []; }
  function drawScene() {
    const st = stage(), v = vals(), sc = st.build(v), night = !!P.night;
    if (night) {
      paper(c, '#0f1a2e', null);
      c.fillStyle = '#f4f1d0'; for (const [x, y] of [[140, 30], [220, 60], [300, 24], [520, 40], [600, 70], [660, 22], [250, 120]]) { c.beginPath(); c.arc(x, y, 1.6, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#17385a'; c.fillRect(0, 300, 720, 80); c.strokeStyle = 'rgba(180,210,240,.25)'; c.lineWidth = 1; c.beginPath(); for (let x = 0; x < 720; x += 30) { c.moveTo(x, 318 + (x % 60 ? 4 : 0)); c.lineTo(x + 16, 318 + (x % 60 ? 4 : 0)); } c.stroke();
      c.fillStyle = '#3c3530'; c.beginPath(); c.moveTo(470, 0); c.lineTo(720, 0); c.lineTo(720, 300); c.lineTo(486, 300); c.lineTo(470, 220); c.closePath(); c.fill(); text(c, '절벽', 600, 160, {size: 13, color: '#c9bba8', align: 'center'});
      c.fillStyle = '#d9d2c3'; c.fillRect(34, 120, 44, 190); c.fillStyle = '#b8402e'; for (let y = 150; y < 300; y += 40) c.fillRect(34, y, 44, 14);
      c.fillStyle = '#2b2f36'; c.fillRect(28, 50, 56, 74); c.fillStyle = goggles() ? '#ffe680' : '#706a50'; c.fillRect(36, 58, 40, 58); text(c, '등대', 56, 40, {size: 13, color: '#f4e6b0', align: 'center'});
      const solved = st.goal(res);
      ship = solved ? Math.min(1, ship + (reduceMotion() ? 1 : 0.006)) : 0;
      const sx = 640 - ship * 180; c.fillStyle = '#e8e2d0'; c.beginPath(); c.moveTo(sx - 26, 318); c.lineTo(sx + 26, 318); c.lineTo(sx + 18, 332); c.lineTo(sx - 18, 332); c.closePath(); c.fill(); c.fillStyle = '#b8402e'; c.fillRect(sx - 4, 296, 4, 22); c.fillStyle = '#f4f1e6'; c.beginPath(); c.moveTo(sx, 296); c.lineTo(sx + 16, 314); c.lineTo(sx, 314); c.closePath(); c.fill();
      c.fillStyle = '#8a3b2a'; c.fillRect(372, 350, 16, 6); text(c, '항구 표적', 300, 372, {size: 12, color: '#f4e6b0', align: 'center'});
      if (solved) { c.fillStyle = 'rgba(255,214,90,.25)'; c.beginPath(); c.arc(380, 345, 26, 0, Math.PI * 2); c.fill(); }
    } else if (P.lamp) paper(c, '#262c3a', '#2e3546');
    else paper(c);
    // 물
    for (const w of sc.waters || []) {
      if (w.shape === 'rect') {
        c.fillStyle = 'rgba(120,190,235,.45)'; c.fillRect(w.x, w.y, w.w, w.h); c.strokeStyle = 'rgba(70,140,200,.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(w.x, w.y); c.lineTo(w.x + w.w, w.y); c.stroke();
        c.strokeStyle = '#9fb4c7'; c.lineWidth = 2; c.beginPath(); c.moveTo(w.x, w.y + w.h); c.lineTo(w.x + w.w, w.y + w.h); c.stroke();
        c.fillStyle = '#16181c'; c.fillRect(w.x - 5, w.y - 18, 8, w.h + 22); c.fillRect(w.x + w.w - 3, w.y - 18, 8, w.h + 22);
        text(c, '물', w.x + 24, w.y + 26, {size: 13, color: '#245a85'}); text(c, '공기', w.x + 24, w.y - 24, {size: 13, color: '#51637a'});
        c.fillStyle = '#d8c9a8'; c.fillRect(0, 352, 720, 28);
      } else {
        c.fillStyle = 'rgba(120,190,235,.45)'; c.beginPath(); c.arc(w.cx, w.cy, w.r, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#4f8fbf'; c.lineWidth = 3; c.stroke();
        text(c, '원형 물통 (위에서 본 모습)', w.cx, w.cy - w.r - 12, {size: 12, align: 'center', color: '#245a85'});
      }
    }
    if (mode === 'straight') BOARD_X.forEach((x, i) => { c.fillStyle = '#5a6272'; c.fillRect(x - 4, 60, 8, v[i] - 9 - 60); c.fillRect(x - 4, v[i] + 9, 8, 320 - v[i] - 9); text(c, `판 ${i + 1}`, x, 48, {size: 12, align: 'center'}); });
    else if (P.lamp) { drawFan(c, res); drawShadeProps(c, st.parts[0].vals, v[0]); }
    else if (!night) for (const b of sc.blocks || []) { if (b.hide) continue; if ((b.x1 === 700 || b.x1 === 660) && b.x2 === b.x1) continue; if (b.y1 === 352 && b.y2 === 352) continue; if (Math.abs(b.x1 - 50) < 1 && Math.abs(b.x2 - 50) < 1) continue; c.strokeStyle = '#4a5466'; c.lineWidth = 8; c.lineCap = 'square'; c.beginPath(); c.moveTo(b.x1, b.y1); c.lineTo(b.x2, b.y2); c.stroke(); c.lineCap = 'butt'; }
    for (const L of sc.lenses || []) drawLens(c, L);
    for (const m of sc.mirrors || []) drawMirror(c, m);
    for (const t of sc.targets || []) drawTarget(c, t, anyHit(res, t.id));
    if (P.lamp) drawShadeBands(c, v[0], res);
    // 겨냥선(네모 수조): 레이저가 가리키는 방향으로 곧게 그은 점선
    if (mode === 'water' && st.name === '네모 수조' && goggles()) {
      const r0 = sc.rays[0], t = (345 - r0.y) / r0.dy, ex = r0.x + r0.dx * t;
      c.strokeStyle = 'rgba(60,70,90,.7)'; c.lineWidth = 1.5; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(r0.x, r0.y); c.lineTo(ex, 345); c.stroke(); c.setLineDash([]);
      text(c, '겨냥선', ex + 8, 349, {size: 12, color: '#3c465a'});
    }
    if (!P.lamp) drawBeams(c, res, night ? '#ffd34d' : '#ff2a1a', night ? 'rgba(255,220,90,.28)' : 'rgba(255,60,40,.25)', (sc.targets || []).filter((t) => t.pass));
    if (!P.lamp) for (const r of res) if (r.end === 'absorb' || r.end === 'back' || r.end === 'edge') { c.fillStyle = night ? '#ffe680' : '#c4180c'; c.beginPath(); c.arc(r.stop[0], r.stop[1], 3.5, 0, Math.PI * 2); c.fill(); }
    // 레이저 지시기와 이름
    if (P.lamp) { drawLamp(c, SHADE.lamp, v[0]); chip(c, '손전등', 74, v[0] - 16, {size: 11}); }
    else if (!night) {
      const r0 = sc.rays[0], multi = sc.rays.length > 1, ly = multi ? (sc.rays[0].y + sc.rays[sc.rays.length - 1].y) / 2 : r0.y;
      drawLaser(c, r0.x, ly, [r0.dx, r0.dy], sc.rays.length);
      if (mode === 'water' && st.name === '네모 수조') { c.strokeStyle = '#8a8f99'; c.lineWidth = 3; c.beginPath(); c.moveTo(80, 64); c.lineTo(340, 64); c.stroke(); text(c, '레이저 지시기', r0.x - 20, 48, {size: 12, align: 'center'}); }
      else if (mode === 'mirror' || mode === 'channel' || mode === 'pass') text(c, '레이저 지시기', 124, ly - 14, {size: 12, align: 'center'});
      else text(c, '레이저 지시기', 62, multi ? ly - 36 : ly - 16, {size: 12, align: 'center'});
    }
    const lab = (s0, x, y) => text(c, s0, x, y, {size: 12, align: 'center', color: night ? '#f4e6b0' : '#233a5c'});
    if (mode === 'straight' || (mode === 'lens' && st.name === '볼록 렌즈')) for (const t of sc.targets) lab('표적', t.x1 + 5, Math.min(t.y1, t.y2) - 8);
    if ((mode === 'lens' && st.name === '오목 렌즈') || mode === 'pick') lab('넓은 표적 세 칸', sc.targets[0].x1 - 10, sc.targets[0].y1 - 10);
    if (mode === 'mirror') { lab('평면거울', 420, 362); lab('표적', 420, 28); }
    if (mode === 'channel') { sc.mirrors.forEach((m, i) => lab(`거울 ${i + 1}`, m.cx - 62, m.cy - 14)); lab('표적', 92, 280); }
    if (mode === 'water' && st.name === '네모 수조') lab('표적', 400, 312);
    if (mode === 'water' && st.name === '원형 물통') lab('표적', 486, 174);
    if (mode === 'lens' || mode === 'pick') for (const L of sc.lenses) lab(L.f > 0 ? '볼록 렌즈' : '오목 렌즈', L.cx, 262);
    if (mode === 'pick' && !sc.lenses.length) { c.strokeStyle = '#8a96a8'; c.setLineDash([4, 4]); c.lineWidth = 1.5; c.strokeRect(344, 136, 32, 108); c.setLineDash([]); lab('렌즈 자리', 360, 262); }
    if (mode === 'combo') { lab('평면거울', 438, 52); lab('볼록 렌즈', 468, v[1] + 4); }
    if (mode === 'pass') { lab('거울 1', 250, 344); lab('거울 2', 250, 52); lab('반투명 표적', 424, 66); lab('표적', 604, 66); }
    if (mode === 'shadow') { const tag = (s0, x, y) => chip(c, s0, x, y, {size: 11}); SHADE.blocks.forEach((b, i) => tag(b.name, b.x + b.w / 2, i ? 368 : 22)); tag('흰 스크린', 657, 22); tag('빛 감지기', 596, SHADE.sensor + 36); }
    // 고른 부품 표시
    const p = st.parts[sel];
    if (p && p.kind !== 'pick') { const [x, y, w, h] = partBox(mode, st, p, v); c.strokeStyle = night ? '#ffe08a' : '#e0a52a'; c.lineWidth = 2; c.setLineDash([5, 4]); c.strokeRect(x, y, w, h); c.setLineDash([]); }
    if (!goggles()) { c.fillStyle = 'rgba(20,24,32,.55)'; c.fillRect(0, 0, 720, 380); text(c, '보안경을 쓰면 레이저가 켜져요', 360, 196, {size: 18, color: '#fff3c4', align: 'center'}); }
    if (P.stages.length > 1) text(c, P.stages.map((x, i) => (i === s.stage ? `[${x.name}]` : x.name)).join('   '), 710, 22, {size: 12, align: 'right', color: night ? '#f4e6b0' : '#51637a'});
    if (party && party.stage === s.stage && st.goal(res)) drawParty(c, party, res, sc, k, night);
  }
  function draw() { if (!alive) return; k++; drawScene(); raf = requestAnimationFrame(draw); }
  function after(moved) {
    recompute();
    const st = stage(), ok = st.goal(res);
    // 거울이나 렌즈를 빛과 나란하게 돌리면 빛이 옆 모서리에 닿아 막힌다(반사되지 않는다).
    let msg = !ok && res.some((r) => r.end === 'edge') ? '빛이 부품의 옆 모서리에 닿아 막혔어요. 앞면이 빛을 받도록 부품을 돌리거나 옮겨 봐요.' : st.say(res, vals(), {moved});
    if (ok && !s.solved[s.stage]) {
      s.solved[s.stage] = true;
      const ch = RAY_CHEERS[mode] || [];
      if (ch[s.stage]) party = {k0: k, stage: s.stage, text: ch[s.stage]};
      if (s.stage < P.stages.length - 1) msg += ` 이제 ${jo(P.stages[s.stage + 1].name, '으로', '로')} 가 봐요.`;
    }
    if (s.solved.every(Boolean) && !fired) { fired = true; s.done = true; onAction('solved'); onReady?.(); }
    status.textContent = msg;
    renderTray();
  }
  function move(dir) {
    const st = stage(), p = st.parts[sel], idx = s.v[s.stage];
    if (!p || !goggles()) return;
    let n = idx[sel] + dir;
    if (p.kind === 'rot') n = (n + p.vals.length) % p.vals.length;
    else if (n < 0 || n >= p.vals.length) { status.textContent = '더 옮길 수 없어요. 반대쪽으로 옮겨 봐요.'; return; }
    idx[sel] = n; after(true);
  }
  const MOVES = {y: [['위로 옮기기', -1], ['아래로 옮기기', 1]], x: [['왼쪽으로 옮기기', -1], ['오른쪽으로 옮기기', 1]], rot: [['왼쪽으로 돌리기', 1], ['오른쪽으로 돌리기', -1]]};
  function renderTray() {
    tray.replaceChildren();
    if (!goggles()) { tray.append(button('보안경 쓰기', () => { memory.goggles = true; status.textContent = '보안경을 썼어요. 레이저가 켜졌어요.'; after(false); }, 'mission-go')); return; }
    const st = stage();
    if (P.stages.length > 1) tray.append(seg(el, button, '장면', P.stages.map((x, i) => [i, x.name]), s.stage, (i) => { s.stage = i; sel = 0; after(false); }, (i) => i > 0 && !s.solved[i - 1]));
    if (st.parts.length > 1) tray.append(seg(el, button, '고를 부품', st.parts.map((x, i) => [i, x.name]), sel, (i) => { sel = i; status.textContent = `${jo(st.parts[i].name, '을', '를')} 골랐어요.`; renderTray(); }));
    const p = st.parts[sel];
    if (p.kind === 'pick') tray.append(seg(el, button, p.name, p.vals.map((x, i) => [i, p.names[i]]), s.v[s.stage][sel], (i) => { s.v[s.stage][sel] = i; after(true); }));
    else tray.append(el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, p.name), el('span', {class: 'bench-seg'}, MOVES[p.kind].map(([n, dir]) => button(n, () => move(dir), 'bench-opt')))));
    if (s.solved[s.stage] && s.stage < P.stages.length - 1) tray.append(button(`${P.stages[s.stage + 1].name} 실험하기`, () => { s.stage++; sel = 0; after(false); }, 'mission-go'));
  }
  canvas.addEventListener('keydown', (e) => {
    const p = stage().parts[sel]; if (!p || !goggles()) return;
    const map = p.kind === 'y' ? {ArrowUp: -1, ArrowDown: 1} : p.kind === 'x' ? {ArrowLeft: -1, ArrowRight: 1} : p.kind === 'rot' ? {ArrowLeft: 1, ArrowRight: -1} : {};
    if (map[e.key] !== undefined) { e.preventDefault(); move(map[e.key]); }
    if (/^[1-3]$/.test(e.key) && stage().parts[+e.key - 1]) { sel = +e.key - 1; renderTray(); }
  });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * 720 / r.width, y = (e.clientY - r.top) * 380 / r.height, st = stage();
    const i = st.parts.findIndex((p) => { const [bx, by, bw, bh] = partBox(mode, st, p, vals()); return x >= bx && x <= bx + bw && y >= by && y <= by + bh; });
    if (i >= 0 && i !== sel) { sel = i; status.textContent = `${jo(st.parts[i].name, '을', '를')} 골랐어요.`; renderTray(); }
  });
  recompute(); renderTray();
  status.textContent = !goggles() ? '레이저를 켜기 전에 보안경을 써요. 레이저 빛을 사람의 눈에 비추지 않아요.' : fired ? '이미 푼 퍼즐이에요. 다시 해 봐도 괜찮아요.' : stage().say(res, vals(), {moved: false});
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 세 단계 도움말 놀이(과학 10~11쪽): 도움말을 하나씩 열며 거울이나 렌즈를 이용한 물건을 맞힌다
const RIDDLES = [
  {answer: 'periscope', hints: ['거울을 이용해요.', '안에 평면거울 두 개가 서로 나란하게 들어 있어요.', '담장 너머나 물 위를 고개를 내밀지 않고 볼 수 있어요.']},
  {answer: 'magnifier', hints: ['렌즈를 이용해요.', '가운데가 가장자리보다 두꺼운 렌즈 하나로 되어 있어요.', '작은 글씨나 곤충을 크게 볼 수 있어요.']},
];
const THINGS = [['periscope', '잠망경'], ['magnifier', '돋보기'], ['glasses', '안경'], ['dental', '미용실 거울'], ['dance', '태권도장 거울'], ['camera', '사진기']];
export function lightRiddle({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '세 단계 도움말 놀이', '도움말 카드 세 장을 하나씩 열며 거울이나 렌즈를 이용한 물건을 맞히는 놀이'), {c, status, tray, node} = d;
  const s = memory.riddle ??= {round: 0, shown: 1, wrong: [], solved: [], done: false};
  let alive = true, raf = 0, fired = !!s.done;
  const R0 = () => RIDDLES[Math.min(s.round, RIDDLES.length - 1)], name = (id) => THINGS.find((t) => t[0] === id)[1];
  function draw() {
    if (!alive) return;
    paper(c, '#fdf7e8', null);
    text(c, '세 단계 도움말 놀이', 360, 34, {size: 18, align: 'center'});
    text(c, ['첫 번째 물건', '두 번째 물건', '세 번째 물건'][Math.min(s.round, RIDDLES.length - 1)], 360, 58, {size: 13, align: 'center', color: '#51637a'});
    const solved = s.solved[s.round] !== undefined;
    R0().hints.forEach((h, i) => {
      const y = 74 + i * 72, open = i < s.shown || solved;
      c.fillStyle = open ? '#ffffff' : '#e9e2cf'; c.strokeStyle = open ? '#d0b46a' : '#c9c0aa'; c.lineWidth = 2; c.fillRect(70, y, 580, 58); c.strokeRect(70, y, 580, 58);
      c.fillStyle = open ? '#e0a52a' : '#b8ae96'; c.beginPath(); c.arc(100, y + 29, 16, 0, Math.PI * 2); c.fill(); text(c, String(i + 1), 100, y + 35, {size: 16, color: '#fff', align: 'center'});
      text(c, open ? h : '아직 열지 않은 도움말', 128, y + 35, {size: open ? 16 : 14, bold: open, color: open ? '#233a5c' : '#8a8270'});
    });
    if (solved) text(c, `정답: ${name(R0().answer)}`, 360, 312, {size: 18, align: 'center', color: '#1f6b47'});
    else if (s.wrong.length) text(c, `아닌 것: ${s.wrong.map(name).join(', ')}`, 360, 312, {size: 14, align: 'center', color: '#8a3b2a'});
    text(c, '도움말을 적게 보고 맞힐수록 좋아요.', 360, 352, {size: 12, bold: false, align: 'center', color: '#51637a'});
    raf = requestAnimationFrame(draw);
  }
  function guess(id) {
    if (s.solved[s.round] !== undefined) return;
    if (id === R0().answer) {
      s.solved[s.round] = s.shown; s.wrong = [];
      status.textContent = `맞아요. 도움말 ${s.shown}개로 ${jo(name(id), '을', '를')} 찾았어요.`;
      if (s.round >= RIDDLES.length - 1 && !fired) { fired = true; s.done = true; status.textContent += ' 두 물건을 모두 맞혔어요.'; onAction('solved'); onReady?.(); }
    } else {
      if (!s.wrong.includes(id)) s.wrong.push(id);
      status.textContent = s.shown < 3 ? `${jo(name(id), '은', '는')} 아니에요. 다음 도움말을 열어 봐요.` : `${jo(name(id), '은', '는')} 아니에요. 세 도움말을 모두 다시 읽고 골라 봐요.`;
    }
    renderTray();
  }
  function renderTray() {
    const solved = s.solved[s.round] !== undefined;
    const more = button('다음 도움말 보기', () => { if (s.shown < 3) { s.shown++; status.textContent = `${s.shown}번째 도움말을 열었어요.`; renderTray(); } }, 'bench-opt');
    more.disabled = solved || s.shown >= 3;
    tray.replaceChildren(more, el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, '이 물건은'), el('span', {class: 'bench-seg'}, THINGS.map(([id, n]) => { const b = button(n, () => guess(id), 'bench-opt'); b.disabled = solved || s.wrong.includes(id); return b; }))));
    if (solved && s.round < RIDDLES.length - 1) tray.append(button('다음 물건', () => { s.round++; s.shown = 1; s.wrong = []; status.textContent = '새 물건의 첫 도움말이에요.'; renderTray(); }, 'mission-go'));
  }
  renderTray();
  status.textContent = fired ? '이미 두 물건을 모두 맞혔어요.' : '첫 도움말을 읽고 어떤 물건인지 골라 봐요. 모르겠으면 도움말을 더 열어요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 설계 상자(옆에서 본 모습): 잠망경, 확대경, 모퉁이 너머 보기
// 부품 자리마다 평면거울, 볼록 렌즈, 오목 렌즈를 넣고 「시험하기」를 누르면 빛이 지나간다. 빛이 눈에 닿으면 성공이고, 멈춘 곳은 빨간 점으로 보인다.
const PART_NAMES = [['none', '비우기'], ['mirror', '평면거울'], ['convex', '볼록 렌즈'], ['concave', '오목 렌즈']];
export const BENCH = {
  periscope: {
    owner: '잠망경 설계 상자', label: '옆에서 본 세로 상자. 위쪽 구멍은 담장 너머 바다 쪽, 아래쪽 구멍은 내 눈 쪽을 봐요. 위 모서리, 가운데, 아래 모서리에 부품을 넣어요.',
    slots: [{id: 'top', name: '위 모서리', x: 340, y: 75, axis: 'x'}, {id: 'mid', name: '가운데', x: 340, y: 190, axis: 'y'}, {id: 'bot', name: '아래 모서리', x: 340, y: 305, axis: 'x'}],
    start: {top: 'convex', mid: 'none', bot: 'concave'}, f: 60, tilt: true,
    rays: [62, 75, 88].map((y) => ({x: 614, y, dx: -1, dy: 0})),
    blocks: [seg2(300, 40, 300, 280), seg2(300, 330, 300, 340), seg2(380, 40, 380, 50), seg2(380, 100, 380, 340), seg2(300, 40, 380, 40), seg2(300, 340, 380, 340), seg2(420, 120, 420, 360), seg2(420, 120, 450, 120), seg2(450, 120, 450, 360), seg2(0, 360, 720, 360)],
    eye: seg2(250, 282, 250, 328),
  },
  magnifier: {
    owner: '확대경 설계 상자', label: '옆에서 본 모습. 왼쪽에 약병의 작은 글씨, 오른쪽에 내 눈, 가운데에 부품 자리가 있어요.',
    slots: [{id: 'mid', name: '부품 자리', x: 260, y: 190, axis: 'x'}],
    start: {mid: 'mirror'}, f: 160, tilt: false, half: 30,
    rays: [-18, 0, 18].map((dy) => ({x: 112, y: 190, dx: 148, dy})),
    blocks: [seg2(110, 150, 110, 230), seg2(700, 0, 700, 380)],
    eye: seg2(622, 166, 622, 214),
  },
  corner: {
    owner: '모퉁이 너머 보기', label: '위에서 본 방과 복도. 방 안의 나는 위쪽을 보고, 복도 끝에 꽃병이 있어요. 모퉁이에 부품 자리가 있어요.',
    slots: [{id: 'mid', name: '모퉁이', x: 360, y: 80, axis: 'x'}],
    start: {mid: 'none'}, f: 60, tilt: true,
    rays: [70, 80, 90].map((y) => ({x: 666, y, dx: -1, dy: 0})),
    blocks: [seg2(300, 40, 300, 360), seg2(300, 40, 720, 40), seg2(420, 120, 720, 120), seg2(420, 120, 420, 360)],
    eye: seg2(338, 350, 382, 350),
  },
};
export function benchScene(B, st) {
  const mirrors = [], lenses = [];
  for (const sl of B.slots) {
    const kind = st.slot[sl.id], tilt = st.tilt[sl.id];
    if (kind === 'mirror') mirrors.push(mirrorAt(sl.x, sl.y, B.tilt ? (tilt === 'a' ? 45 : 135) : 90, B.half || 30, true));
    if (kind === 'convex' || kind === 'concave') lenses.push(lensAt(sl.x, sl.y, B.half || 26, kind === 'convex' ? B.f : -B.f, sl.axis));
  }
  return {rays: B.rays, mirrors, lenses, blocks: B.blocks, targets: [{id: 'E', ...B.eye}]};
}
export function lightBench({el, button, mode = 'periscope', task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire), B = BENCH[mode] || BENCH.periscope;
  const d = device(el, B.owner, B.label), {c, status, tray, node} = d;
  const s = memory['bench-' + mode] ??= {slot: {...B.start}, tilt: Object.fromEntries(B.slots.map((x) => [x.id, 'b'])), tested: false, ok: false, tries: 0, done: false};
  let alive = true, raf = 0, fired = !!s.done, res = [];
  const sunCol = '#ffb703';
  if (s.tested) res = trace(benchScene(B, s));
  function inset(x, y, w, h) {
    c.fillStyle = '#1b2230'; c.fillRect(x, y, w, h); c.strokeStyle = '#46566e'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
    text(c, '눈에 보이는 모습', x + w / 2, y + 18, {size: 12, align: 'center', color: '#ffe08a'});
    c.save(); c.beginPath(); c.rect(x + 6, y + 26, w - 12, h - 32); c.clip();
    const ix = x + 6, iy = y + 26, iw = w - 12, ih = h - 32, cx = ix + iw / 2, cy = iy + ih / 2;
    if (!s.tested) { c.fillStyle = '#2a3242'; c.fillRect(ix, iy, iw, ih); text(c, '시험하기를 눌러요', cx, cy + 5, {size: 13, color: '#cfd8e3', align: 'center'}); }
    else if (mode === 'magnifier') {
      const k = s.slot.mid, ok = s.ok;
      c.fillStyle = k === 'mirror' ? '#0d0f14' : '#f7f2e6'; c.fillRect(ix, iy, iw, ih);
      if (k === 'mirror') text(c, '글씨에서 온 빛이 눈으로 오지 않아요', cx, cy + 5, {size: 12, color: '#cfd8e3', align: 'center'});
      else { const sz = ok ? 26 : k === 'concave' ? 8 : 11; text(c, '하루 세 번 드세요', cx, cy + sz / 3, {size: sz, color: '#2b2b2b', align: 'center'}); }
    } else if (s.ok) {
      c.fillStyle = '#bfe3ff'; c.fillRect(ix, iy, iw, ih); c.fillStyle = '#2f78b8'; c.fillRect(ix, iy + ih * 0.6, iw, ih * 0.4);
      if (mode === 'periscope') { c.fillStyle = '#f4f1e6'; c.beginPath(); c.moveTo(cx - 30, cy + 12); c.lineTo(cx + 30, cy + 12); c.lineTo(cx + 20, cy + 26); c.lineTo(cx - 20, cy + 26); c.closePath(); c.fill(); c.fillStyle = '#b8402e'; c.fillRect(cx - 2, cy - 18, 4, 30); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx + 2, cy - 18); c.lineTo(cx + 22, cy + 8); c.lineTo(cx + 2, cy + 8); c.closePath(); c.fill(); }
      else { c.fillStyle = '#d8c9a8'; c.fillRect(ix, iy + ih * 0.6, iw, ih * 0.4); c.fillStyle = '#b86a3c'; c.fillRect(cx - 12, cy, 24, 26); c.fillStyle = '#e2483e'; for (const [dx, dy] of [[-10, -6], [0, -14], [10, -6]]) { c.beginPath(); c.arc(cx + dx, cy + dy, 7, 0, Math.PI * 2); c.fill(); } }
    } else { c.fillStyle = '#0d0f14'; c.fillRect(ix, iy, iw, ih); text(c, '아무것도 보이지 않아요', cx, cy + 5, {size: 13, color: '#cfd8e3', align: 'center'}); }
    c.restore();
  }
  function drawPerson(x, y, dir = 1, up = false) {
    if (up) { c.fillStyle = '#3d6fb4'; c.beginPath(); c.arc(x, y + 14, 14, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2a1e14'; c.beginPath(); c.arc(x, y + 3, 10, 0, Math.PI); c.fill(); return; }
    c.fillStyle = '#3d6fb4'; c.fillRect(x - 16 * dir - 12, y + 18, 24, 44);
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(x - 16 * dir, y, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a1e14'; c.beginPath(); c.arc(x - 16 * dir, y - 6, 18, Math.PI, 0); c.fill();
    drawEye(c, x - 6 * dir, y, 0.55, dir);
  }
  function draw() {
    if (!alive) return;
    const sc = benchScene(B, s);
    if (mode === 'periscope') {
      paper(c, '#d7ecff', null);
      c.fillStyle = '#8fc26a'; c.fillRect(0, 360, 720, 20);
      c.fillStyle = '#2f78b8'; c.fillRect(456, 100, 264, 20); c.fillStyle = '#f4f1e6'; c.beginPath(); c.moveTo(612, 92); c.lineTo(690, 92); c.lineTo(678, 104); c.lineTo(624, 104); c.closePath(); c.fill(); c.fillStyle = '#b8402e'; c.fillRect(648, 56, 4, 36); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(652, 56); c.lineTo(676, 88); c.lineTo(652, 88); c.closePath(); c.fill(); c.fillStyle = '#e8e2d0'; c.beginPath(); c.moveTo(646, 60); c.lineTo(624, 88); c.lineTo(646, 88); c.closePath(); c.fill();
      text(c, '바다의 배', 652, 46, {size: 12, align: 'center'});
      c.fillStyle = '#b5654a'; c.fillRect(420, 120, 30, 240); c.strokeStyle = '#8a4a34'; c.lineWidth = 1; c.beginPath(); for (let y = 132; y < 360; y += 12) { c.moveTo(420, y); c.lineTo(450, y); } c.stroke(); text(c, '담장', 476, 200, {size: 13});
      c.fillStyle = '#e9d8b5'; c.fillRect(300, 40, 80, 300); c.fillStyle = '#d7ecff'; c.fillRect(376, 50, 8, 50); c.fillRect(296, 280, 8, 50);
      c.strokeStyle = '#8a6a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(300, 280); c.lineTo(300, 40); c.lineTo(380, 40); c.lineTo(380, 50); c.moveTo(380, 100); c.lineTo(380, 340); c.lineTo(300, 340); c.lineTo(300, 330); c.stroke();
      drawPerson(262, 305, 1); text(c, '나', 226, 280, {size: 12, align: 'center'});
      inset(14, 14, 190, 112);
    } else if (mode === 'magnifier') {
      paper(c, '#f1e7d2', null);
      c.fillStyle = '#d8c9a8'; c.fillRect(0, 300, 720, 80);
      c.fillStyle = '#8a5a2b'; c.fillRect(78, 138, 32, 104); c.fillStyle = '#fff'; c.fillRect(82, 160, 24, 60); c.fillStyle = '#555'; for (let y = 168; y < 216; y += 8) c.fillRect(86, y, 16, 2);
      text(c, '약병 글씨', 94, 266, {size: 12, align: 'center'});
      drawEye(c, 642, 190, 2.1, -1); text(c, '나', 642, 236, {size: 12, align: 'center'});
      inset(456, 14, 250, 104);
    } else {
      paper(c, '#efe8da', null);
      c.fillStyle = '#d9cdb5'; c.fillRect(300, 40, 120, 320); c.fillRect(420, 40, 300, 80);
      c.strokeStyle = '#5a4632'; c.lineWidth = 6; c.beginPath(); for (const b of B.blocks) { c.moveTo(b.x1, b.y1); c.lineTo(b.x2, b.y2); } c.stroke();
      text(c, '복도', 560, 104, {size: 13}); text(c, '방', 330, 220, {size: 13});
      c.fillStyle = '#b86a3c'; c.fillRect(670, 72, 18, 18); c.fillStyle = '#e2483e'; c.beginPath(); c.arc(679, 66, 8, 0, Math.PI * 2); c.fill(); text(c, '꽃병', 679, 108, {size: 12, align: 'center'});
      drawPerson(360, 338, 1, true); text(c, '나', 396, 352, {size: 12});
      inset(470, 180, 236, 120);
    }
    // 부품 자리
    for (const sl of B.slots) {
      const kind = s.slot[sl.id];
      if (kind === 'none') { c.strokeStyle = '#8a96a8'; c.lineWidth = 1.5; c.setLineDash([4, 4]); c.beginPath(); c.arc(sl.x, sl.y, 18, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
    }
    for (const L of sc.lenses) drawLens(c, L);
    for (const m of sc.mirrors) drawMirror(c, m, true);
    if (s.tested) {
      drawBeams(c, res, sunCol, 'rgba(255,183,3,.28)');
      for (const r of res) if (!r.hits.includes('E')) { c.fillStyle = '#d0201a'; c.beginPath(); c.arc(r.stop[0], r.stop[1], 4.5, 0, Math.PI * 2); c.fill(); }
    }
    for (const sl of B.slots) chip(c, sl.name, sl.x, mode === 'periscope' ? {top: 122, mid: 232, bot: 268}[sl.id] : mode === 'corner' ? sl.y - 28 : sl.y + 54, {size: 11, bg: 'rgba(255,255,255,.88)', color: '#4a5a70'});
    raf = requestAnimationFrame(draw);
  }
  function changed(msg) { s.tested = false; s.ok = false; res = []; status.textContent = msg + ' 「시험하기」를 눌러 확인해요.'; renderTray(); }
  function test() {
    res = trace(benchScene(B, s)); s.tested = true; s.tries++;
    s.ok = allHit(res, 'E');
    const n = res.filter((r) => r.hits.includes('E')).length, kinds = Object.values(s.slot);
    if (s.ok) {
      status.textContent = mode === 'periscope' ? '담장 너머 바다의 배가 보여요. 거울 두 개가 빛의 방향을 두 번 바꿔 눈으로 보냈어요.' : mode === 'magnifier' ? '작은 글씨가 크게 보여요. 볼록 렌즈가 글씨에서 온 빛을 꺾어 눈으로 보냈어요.' : '모퉁이 너머 꽃병이 보여요. 거울이 빛의 방향을 바꿔 눈으로 보냈어요.';
      if (!fired) { fired = true; s.done = true; onAction('built'); onReady?.(); }
    } else if (mode === 'magnifier') {
      const k = s.slot.mid;
      status.textContent = k === 'mirror' ? '평면거울은 글씨에서 온 빛을 되돌려 보내서 눈에 닿지 않아요. 빨간 점을 보세요.' : k === 'concave' ? '오목 렌즈는 빛을 퍼뜨려서 글씨가 작게 보여요. 다른 부품을 넣어 봐요.' : '부품이 없으면 글씨가 작은 그대로예요. 빛을 모으는 부품을 넣어 봐요.';
    } else {
      const lensIn = kinds.some((k) => k === 'convex' || k === 'concave');
      status.textContent = `빛 ${n}줄이 눈에 닿았어요. 빨간 점은 빛이 멈춘 곳이에요.` + (lensIn ? ' 렌즈는 빛을 꺾지만 모퉁이를 돌게 하지는 못해요.' : ' 부품이나 거울 방향을 바꿔 다시 시험해 봐요.');
    }
    renderTray();
  }
  function renderTray() {
    tray.replaceChildren();
    for (const sl of B.slots) {
      const row = el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, sl.name), el('span', {class: 'bench-seg'}, PART_NAMES.map(([v, n]) => {
        const b = button(n, () => { s.slot[sl.id] = v; changed(v === 'none' ? `${sl.name} 자리를 비웠어요.` : `${sl.name} 자리에 ${jo(n, '을', '를')} 넣었어요.`); }, 'bench-opt');
        b.setAttribute('aria-pressed', String(s.slot[sl.id] === v)); return b;
      })));
      if (B.tilt && s.slot[sl.id] === 'mirror') {
        const t = s.tilt[sl.id], tb = button('거울 방향 바꾸기', () => { s.tilt[sl.id] = t === 'a' ? 'b' : 'a'; changed(`${sl.name} 거울을 ${s.tilt[sl.id] === 'a' ? '오른쪽이 올라가게' : '왼쪽이 올라가게'} 기울였어요.`); }, 'bench-opt');
        tb.setAttribute('aria-label', `${sl.name} 거울 방향 바꾸기, 지금은 ${t === 'a' ? '오른쪽이 올라간' : '왼쪽이 올라간'} 방향`);
        row.lastChild.append(tb);
      }
      tray.append(row);
    }
    tray.append(button('시험하기', test, 'mission-go'));
  }
  renderTray();
  status.textContent = fired ? '이미 만든 장치예요. 부품을 바꿔 다시 시험해 봐도 괜찮아요.' : {periscope: '척척이 상자에 렌즈를 끼워 놓았어요. 부품을 바꾸고 「시험하기」를 눌러 담장 너머가 보이게 해 봐요.', magnifier: '척척이 확대경에 거울을 끼워 놓았어요. 부품을 바꾸고 「시험하기」를 눌러 작은 글씨가 크게 보이게 해 봐요.', corner: '모퉁이 자리에 부품을 넣고 「시험하기」를 눌러 복도의 꽃병이 보이게 해 봐요.'}[mode];
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

export const LIGHT_COMPONENTS = {darkbox: darkBox, storeroom: storeRoom, laser: laserSafety, raypuzzle: rayPuzzle, lightriddle: lightRiddle, lightbench: lightBench};
