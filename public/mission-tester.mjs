// 전기 시험대 (항구 수리 창고, 과학 70~71쪽, 실험관찰 35쪽).
// 전지 끼우개, 전구 끼우개, 스위치, 집게 달린 전선으로 회로를 만들고, 두 집게 사이에 물체를 끼워 전기가 잘 흐르는지 시험한다.
// 판정은 접점 연결로 한다. 전지 두 끝이 전구 끼우개의 두 끝에 각각 이어지고(스위치와 물체를 거쳐도 됨) 전지 두 끝이 바로 이어지지 않았을 때 켜진다.
export const OBJECTS = [
  {id: 'wood', label: '나무 막대', on: false, color: '#b98a55'},
  {id: 'coin', label: '동전', on: true, color: '#d4a64a'},
  {id: 'foil', label: '알루미늄 포일', on: true, color: '#d9dee4'},
  {id: 'eraser', label: '지우개', on: false, color: '#f4f1ea'},
  {id: 'pin', label: '철 옷핀', on: true, color: '#9aa3ae'},
  {id: 'clip', label: '철 클립', on: true, color: '#b7bec8'},
  {id: 'ruler', label: '플라스틱 자', on: false, color: '#8fc3ea'},
];
const T = {
  A: {x: 92, y: 132, label: '전지 끼우개 + 쪽'}, B: {x: 24, y: 132, label: '전지 끼우개 − 쪽'},
  C: {x: 98, y: 56, label: '전구 끼우개 왼쪽'}, D: {x: 142, y: 56, label: '전구 끼우개 오른쪽'},
  E: {x: 164, y: 128, label: '스위치 왼쪽'}, F: {x: 218, y: 128, label: '스위치 오른쪽'},
  G: {x: 108, y: 160, label: '시험 집게 왼쪽'}, H: {x: 156, y: 160, label: '시험 집게 오른쪽'},
};
const WIRE = ['#e8742a', '#2f7fd8', '#6fbf4a', '#c0392b'];
export function litOf({wires, closed, bridge}) {
  const p = {}; const f = (k) => (p[k] ??= k, p[k] === k ? k : (p[k] = f(p[k])));
  const u = (a, b) => { p[f(a)] = f(b); };
  for (const [a, b] of wires) u(a, b);
  if (closed) u('E', 'F');
  if (bridge) u('G', 'H');
  if (f('A') === f('B')) return false;
  return (f('C') === f('A') && f('D') === f('B')) || (f('C') === f('B') && f('D') === f('A'));
}
// 전구를 거치지 않고 전지 끼우개의 두 끝(A, B)이 전선이나 닫힌 스위치로 바로 이어지는지(합선)
export function shortOf({wires, closed}) {
  const p = {}; const f = (k) => (p[k] ??= k, p[k] === k ? k : (p[k] = f(p[k])));
  for (const [a, b] of wires) p[f(a)] = f(b);
  if (closed) p[f('E')] = f('F');
  return f('A') === f('B');
}
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// 받침에 맞는 조사: j('스위치 왼쪽', '을', '를')
const j = (w, withB, noB) => { const code = w.charCodeAt(w.length - 1) - 0xac00; return w + (code >= 0 && code < 11172 && code % 28 ? withB : noB); };

// ---------------------------------------------------------------- 그림 (240 × 180 좌표)
export function paintKit(c, s = {}, now = 0) {
  const {battery = true, bulb = true, wires = [], closed = false, lit = false, gap = false, obj = null, sel = null, labels = false, clipOn = null, tags = false} = s;
  c.fillStyle = s.bg || '#f7f3e8'; c.fillRect(0, 0, 240, 180);
  c.fillStyle = 'rgba(120,100,70,.12)'; c.fillRect(0, 148, 240, 32);
  // 전지 끼우개
  c.fillStyle = '#2f3b52'; c.fillRect(18, 118, 80, 28); c.fillStyle = '#4a5a7a'; c.fillRect(22, 122, 72, 20);
  c.fillStyle = '#c9ced6'; c.fillRect(20, 124, 6, 16); c.fillRect(90, 124, 6, 16);
  if (battery) { c.fillStyle = '#2b2f36'; c.fillRect(30, 124, 56, 16); c.fillStyle = '#e0a52a'; c.fillRect(46, 124, 20, 16); c.fillStyle = '#c9ced6'; c.fillRect(86, 128, 4, 8); c.fillStyle = '#fff'; c.font = 'bold 10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('−', 36, 132); c.fillText('+', 80, 132); }
  // 전구 끼우개와 전구
  c.fillStyle = '#6b4a2a'; c.fillRect(92, 58, 56, 10); c.fillStyle = '#26292e'; c.fillRect(108, 46, 24, 14);
  c.fillStyle = '#c9ced6'; c.fillRect(94, 52, 8, 6); c.fillRect(138, 52, 8, 6);
  if (bulb) {
    if (lit) { const r = c.createRadialGradient(120, 28, 3, 120, 28, reduceMotion() ? 58 : 54 + Math.sin(now / 140) * 4); r.addColorStop(0, 'rgba(255,236,150,.95)'); r.addColorStop(0.5, 'rgba(255,214,90,.3)'); r.addColorStop(1, 'rgba(255,214,90,0)'); c.fillStyle = r; c.fillRect(60, -30, 120, 120); }
    c.fillStyle = lit ? 'rgba(255,248,200,.95)' : 'rgba(220,235,245,.6)'; c.strokeStyle = '#8fa3b5'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(120, 28, 15, Math.PI * 0.8, Math.PI * 2.2); c.lineTo(126, 46); c.lineTo(114, 46); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = lit ? '#ff9a1f' : '#5a4a3a'; c.lineWidth = lit ? 2 : 1.2; c.beginPath(); c.moveTo(114, 30); for (let i = 0; i <= 6; i++) c.lineTo(114 + i * 2, 30 + (i % 2 ? -5 : 0)); c.stroke();
  }
  // 스위치
  c.fillStyle = '#6b4a2a'; c.fillRect(158, 132, 66, 10);
  c.fillStyle = '#c9ced6'; c.beginPath(); c.arc(T.E.x, T.E.y, 3.5, 0, Math.PI * 2); c.arc(T.F.x, T.F.y, 3.5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#39424e'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(T.E.x, T.E.y); c.lineTo(closed ? T.F.x : T.F.x - 8, closed ? T.F.y : T.F.y - 20); c.stroke();
  c.fillStyle = '#c0392b'; c.beginPath(); c.arc(closed ? T.F.x - 4 : T.F.x - 10, closed ? T.F.y - 2 : T.F.y - 21, 3, 0, Math.PI * 2); c.fill();
  // 시험 집게와 물체
  if (gap) {
    for (const k of ['G', 'H']) { c.fillStyle = '#c0392b'; c.fillRect(T[k].x - 6, T[k].y - 4, 12, 8); }
    if (obj) {
      const o = OBJECTS.find((x) => x.id === obj);
      c.fillStyle = o.color; c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
      if (obj === 'coin') { c.beginPath(); c.arc(132, 160, 9, 0, Math.PI * 2); c.fill(); c.stroke(); }
      else if (obj === 'foil') { c.beginPath(); c.moveTo(114, 156); c.lineTo(124, 152); c.lineTo(134, 157); c.lineTo(146, 152); c.lineTo(150, 164); c.lineTo(138, 168); c.lineTo(126, 164); c.lineTo(114, 166); c.closePath(); c.fill(); c.stroke(); }
      else if (obj === 'pin' || obj === 'clip') { c.strokeStyle = o.color; c.lineWidth = 2.4; c.beginPath(); c.moveTo(112, 162); c.lineTo(150, 162); c.lineTo(150, 156); c.lineTo(116, 156); c.lineTo(116, 160); c.lineTo(144, 160); c.stroke(); }
      else { c.fillRect(112, 155, 40, 10); c.strokeRect(112, 155, 40, 10); }
      c.fillStyle = '#39424e'; c.font = '10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.label, 132, 175);
    }
  }
  // 전선
  wires.forEach(([a, b], i) => {
    const p = T[a], q = T[b];
    c.strokeStyle = WIRE[i % WIRE.length]; c.lineWidth = 2.6; c.lineCap = 'round';
    const mx = (p.x + q.x) / 2, my = Math.max(p.y, q.y) + 18 + i * 3;
    c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(mx, p.y < 90 && q.y < 90 ? Math.min(p.y, q.y) - 24 : my, q.x, q.y); c.stroke();
    for (const t of [p, q]) { c.fillStyle = '#c0392b'; c.fillRect(t.x - 3, t.y - 3, 6, 6); }
  });
  if (clipOn) {
    // 마지막 전선의 집게: 고무 부분 또는 금속 부분
    c.strokeStyle = '#3f9a36'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(T.D.x, T.D.y); c.quadraticCurveTo(170, 20, clipOn === 'metal' ? T.B.x + 2 : 66, clipOn === 'metal' ? T.B.y : 92); c.stroke();
    c.fillStyle = '#39424e'; c.fillRect(40, 88, 40, 7); c.fillStyle = '#c9ced6'; c.fillRect(80, 89, 6, 5);
    c.fillStyle = '#26292e'; c.font = '10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.fillText('전선의 고무 덮개', 58, 80);
    c.fillStyle = '#c0392b'; const [x, y] = clipOn === 'metal' ? [T.B.x + 2, T.B.y] : [66, 92]; c.fillRect(x - 5, y - 4, 10, 8);
  }
  if (sel) { const t = T[sel]; c.strokeStyle = '#ffd35a'; c.lineWidth = 2; c.beginPath(); c.arc(t.x, t.y, 7, 0, Math.PI * 2); c.stroke(); }
  if (labels) {
    c.fillStyle = '#39424e'; c.font = '10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('전지 끼우개', 58, 112); c.fillText('전구 끼우개', 120, 76); c.fillText('스위치', 191, 150);
  }
  if (tags) {
    const tag = (x, y, tx, ty, t) => { c.strokeStyle = '#39424e'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(tx, ty); c.stroke(); c.fillStyle = '#3e5f8f'; c.beginPath(); c.arc(tx, ty, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 11px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, tx, ty + 1); };
    tag(40, 120, 20, 96, '가'); tag(132, 58, 176, 30, '나'); tag(124, 162, 92, 170, '다'); tag(200, 134, 222, 104, '라');
    c.strokeStyle = '#e8742a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(108, 160); c.quadraticCurveTo(128, 176, 156, 160); c.stroke();
    for (const k of ['G', 'H']) { c.fillStyle = '#c0392b'; c.fillRect(T[k].x - 6, T[k].y - 4, 12, 8); }
  }
}
export function paintHolder(c) {
  c.fillStyle = '#f7f3e8'; c.fillRect(0, 0, 240, 180);
  c.fillStyle = '#6b4a2a'; c.fillRect(60, 120, 120, 16);
  c.fillStyle = '#e9e2cf'; c.fillRect(84, 70, 72, 52);
  c.fillStyle = '#c9ced6'; c.fillRect(84, 70, 8, 52); c.fillRect(148, 70, 8, 52); c.fillRect(108, 112, 24, 8);
  c.fillStyle = 'rgba(220,235,245,.7)'; c.strokeStyle = '#8fa3b5'; c.beginPath(); c.arc(120, 40, 24, Math.PI * 0.8, Math.PI * 2.2); c.lineTo(130, 70); c.lineTo(110, 70); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#b8c0ca'; c.fillRect(106, 70, 28, 34); c.fillStyle = '#26292e'; c.fillRect(110, 104, 20, 4); c.fillStyle = '#9aa3ae'; c.fillRect(114, 108, 12, 4);
  c.font = '11px "Malgun Gothic",sans-serif'; c.fillStyle = '#39424e'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText('옆면 금속', 160, 84); c.fillText('바닥 금속', 136, 128); c.fillText('사이의 받침', 160, 104);
  c.strokeStyle = '#39424e'; c.lineWidth = 1; c.beginPath(); c.moveTo(158, 84); c.lineTo(154, 84); c.moveTo(134, 126); c.lineTo(128, 118); c.moveTo(158, 104); c.lineTo(140, 100); c.stroke();
}

// ---------------------------------------------------------------- 시험대
// mode: 'build' 끼우개와 스위치로 회로 만들기, 'test' 물체 시험, 'clip' 도체 부분끼리 잇기
export function tester({el, button, mode, memory = {}, onAction}) {
  const canvas = el('canvas', {class: 'bench-canvas', width: 720, height: 540, tabindex: 0, role: 'img', 'aria-label': mode === 'test' ? '물체를 시험하는 회로' : mode === 'clip' ? '집게가 물린 곳을 바꿔 보는 회로' : '끼우개와 스위치로 회로 만들기'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const controls = el('div', {class: 'bench-controls'});
  const node = el('div', {class: 'signal-device bench'}, canvas, controls, status);
  const c = canvas.getContext('2d');
  let alive = true, raf = 0, gloves = mode !== 'build', battery = mode !== 'build', bulb = mode !== 'build', wires = [], closed = false, sel = null, obj = null, clipOn = 'rubber', done = false;
  const results = memory.results ??= {};
  if (mode === 'test') wires = [['A', 'E'], ['F', 'C'], ['D', 'G'], ['H', 'B']];
  if (mode === 'clip') { wires = [['A', 'E'], ['F', 'C']]; closed = true; }
  const say = (t) => { status.textContent = t; };
  const lit = () => battery && bulb && (mode === 'clip' ? clipOn === 'metal' && litOf({wires: [...wires, ['D', 'B']], closed}) : litOf({wires, closed, bridge: mode === 'test' && !!obj && OBJECTS.find((o) => o.id === obj).on}));
  function connect(k) {
    if (mode !== 'build' || !battery || !bulb) return;
    if (!sel) { sel = k; say(`${j(T[k].label, '을', '를')} 골랐어요. 이을 곳을 하나 더 골라 주세요.`); render(); return; }
    if (sel === k) { sel = null; render(); return; }
    const pair = [sel, k].sort();
    const i = wires.findIndex((w) => w.join() === pair.join());
    if (i >= 0) { wires.splice(i, 1); say('그 전선을 뗐어요.'); }
    else if (wires.length >= 4) say('집게 달린 전선은 네 개뿐이에요. 필요 없는 전선을 먼저 떼어 보세요.');
    // 합선은 학생이 직접 만들지 않는다: 전구를 거치지 않고 전지의 두 끝이 전선으로 바로 이어지면 잇지 않고 까닭을 알려 준다.
    else if (shortOf({wires: [...wires, pair], closed: false})) say('그렇게 이으면 전구를 거치지 않고 전지의 두 끝이 바로 이어져요(합선). 전지가 뜨거워져 위험하니 이 전선은 잇지 않아요.');
    else { wires.push(pair); say(`${j(T[pair[0]].label, '과', '와')} ${j(T[pair[1]].label, '을', '를')} 전선으로 이었어요.`); }
    sel = null; after(); render();
  }
  function after() {
    if (mode === 'build' && closed && shortOf({wires, closed})) {
      closed = false;
      say('스위치를 닫으면 전구를 거치지 않고 전지의 두 끝이 바로 이어져요(합선). 전지가 뜨거워질 수 있어 스위치를 다시 열었어요. 전기가 전구를 거쳐 가도록 이어 보세요.');
      return;
    }
    if (mode === 'build' && !done) {
      const withSwitch = litOf({wires, closed: true}) && !litOf({wires, closed: false});
      if (lit() && withSwitch) { done = true; say('스위치를 닫으니 불이 켜졌어요. 스위치로 켜고 끌 수 있는 회로 완성이에요.'); onAction?.('built'); }
      else if (lit()) say('불은 켜졌는데 스위치가 회로에 들어 있지 않아요. 스위치를 거쳐 가도록 이어 보세요.');
      else if (closed && wires.length >= 3) say('스위치를 닫았는데 불이 켜지지 않아요. 전지 끼우개에서 나온 길이 스위치와 전구 끼우개를 거쳐 다시 전지 끼우개로 돌아오는지 따라가 보세요.');
    }
    if (mode === 'test' && obj && closed) {
      const o = OBJECTS.find((x) => x.id === obj), on = lit();
      if (!results[obj]) { results[obj] = on ? 'on' : 'off'; }
      const pred = memory.predict?.[obj];
      say(`${o.label}: ${on ? '불이 켜졌어요' : '불이 켜지지 않았어요'}.${obj === 'eraser' ? ' 지우개는 집게 대신 전선 끝을 대어 시험했어요.' : ''}${pred ? (pred === (on ? 'on' : 'off') ? ' 예상과 같아요.' : ' 예상과 달라요.') : ''}`);
      if (OBJECTS.every((x) => results[x.id]) && !done) { done = true; onAction?.('tested'); }
    }
    if (mode === 'clip') {
      if (lit() && !done) { done = true; say('집게를 금속 부분으로 옮기니 불이 켜졌어요.'); onAction?.('metal'); }
      else if (!lit()) say('스위치는 닫혀 있는데 불이 켜지지 않아요. 초록 전선의 집게가 어디를 물고 있는지 보세요.');
    }
  }
  function render() {
    controls.replaceChildren();
    if (mode === 'build') {
      if (!gloves) { controls.append(el('p', {class: 'bench-note'}, '실험 전에 보호 장갑부터 껴요.'), button('보호 장갑 끼기', () => { gloves = true; say('장갑을 꼈어요. 전지와 전구를 끼우개에 끼워 보세요.'); render(); })); return; }
      if (!battery || !bulb) {
        controls.append(el('div', {class: 'signal-tray'}, button('전지를 전지 끼우개에 끼우기', () => { battery = true; say('전지를 끼웠어요.'); render(); }, battery ? 'secondary' : ''), button('전구를 전구 끼우개에 돌려 끼우기', () => { bulb = true; say('전구를 끼웠어요.'); render(); }, bulb ? 'secondary' : '')));
        return;
      }
      const grid = el('div', {class: 'tester-terms', role: 'group', 'aria-label': '전선을 이을 곳'});
      for (const k of ['A', 'B', 'C', 'D', 'E', 'F']) { const b = button(T[k].label, () => connect(k), 'bench-opt'); b.setAttribute('aria-pressed', String(sel === k)); grid.append(b); }
      controls.append(el('p', {class: 'bench-note'}, `이을 곳 두 군데를 차례로 누르면 집게 달린 전선이 이어져요. 같은 두 곳을 다시 누르면 떼어져요. 쓴 전선 ${wires.length} / 4`), grid,
        el('div', {class: 'signal-tray'}, button(closed ? '스위치 열기' : '스위치 닫기', () => { closed = !closed; after(); render(); }, 'signal-hold'), button('전선 모두 떼기', () => { wires = []; sel = null; say('전선을 모두 뗐어요.'); render(); }, 'secondary')));
      return;
    }
    if (mode === 'test') {
      const tray = el('div', {class: 'tester-objects', role: 'group', 'aria-label': '시험할 물체'});
      for (const o of OBJECTS) { const b = button(o.label + (results[o.id] ? (results[o.id] === 'on' ? ' (켜짐)' : ' (꺼짐)') : ''), () => { obj = o.id; closed = false; say(`${j(o.label, '을', '를')} 두 집게 사이에 끼웠어요. 스위치를 닫아 보세요.`); render(); }, 'bench-opt' + (results[o.id] ? ' tested' : '')); b.setAttribute('aria-pressed', String(obj === o.id)); tray.append(b); }
      controls.append(el('p', {class: 'bench-note'}, `시험한 물체 ${Object.keys(results).filter((k) => OBJECTS.some((o) => o.id === k)).length} / ${OBJECTS.length}`), tray,
        el('div', {class: 'signal-tray'}, button(closed ? '스위치 열기' : '스위치 닫기', () => { if (!obj) return say('먼저 시험할 물체를 골라 주세요.'); closed = !closed; after(); render(); }, 'signal-hold')));
      return;
    }
    controls.append(el('div', {class: 'signal-tray'},
      button('집게를 전선의 고무 덮개에 물리기', () => { clipOn = 'rubber'; after(); render(); }, clipOn === 'rubber' ? '' : 'secondary'),
      button('집게를 전지 끼우개의 금속 부분에 물리기', () => { clipOn = 'metal'; after(); render(); }, clipOn === 'metal' ? '' : 'secondary')));
  }
  function pickAt(e) {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * (240 / r.width), y = (e.clientY - r.top) * (180 / r.height);
    let best = null, d = 12;
    for (const k of ['A', 'B', 'C', 'D', 'E', 'F']) { const dd = Math.hypot(T[k].x - x, T[k].y - y); if (dd < d) { d = dd; best = k; } }
    if (best) connect(best);
  }
  canvas.addEventListener('click', pickAt);
  function draw(now) {
    if (!alive) return;
    c.setTransform(3, 0, 0, 3, 0, 0);
    paintKit(c, {battery, bulb, wires, closed, lit: lit(), gap: mode === 'test', obj, sel, labels: true, clipOn: mode === 'clip' ? clipOn : null, bg: '#fbf8ef'}, now);
    raf = requestAnimationFrame(draw);
  }
  render();
  say(mode === 'build' ? '보호 장갑을 끼고, 전지와 전구를 끼운 다음 집게 달린 전선 네 개로 스위치가 들어간 회로를 만들어 보세요.' : mode === 'test' ? '물체를 하나씩 골라 두 집게 사이에 끼우고 스위치를 닫아 보세요.' : '스위치는 닫혀 있는데 불이 켜지지 않아요. 초록 전선의 집게가 어디를 물고 있는지 보세요.');
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}
