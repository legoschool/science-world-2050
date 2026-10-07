// 전구 회로 그림과 작업대 (꺼진 비상 조명실, 과학 68~69쪽, 실험관찰 34쪽).
// 판정은 그림 속 위치가 아니라 접점 연결로 한다. 전지의 +극과 −극이 전구의 꼭지와 꼭지쇠에 하나씩 이어지고,
// 전지의 두 극을 전선으로 바로 잇지 않았으며, 필라멘트가 끊기지 않았을 때만 불이 켜진다.
// 일반 전구는 발광 다이오드와 달리 +극과 −극을 바꿔 이어도 켜진다. 합선은 학생이 만들지 않고 모형 설명만 보여 준다.
export const BULB_ENDS = [{id: 'tip', label: '꼭지'}, {id: 'side', label: '꼭지쇠'}, {id: 'glass', label: '유리'}, {id: 'none', label: '떼기'}];
export const CARDS = {
  1: {links: [['+', 'tip'], ['-', 'side']]},
  2: {links: [['+', '-'], ['+', 'tip']], short: true},
  3: {links: [['+', 'side'], ['-', 'tip']]},
  4: {links: [['+', 'side'], ['-', 'side']]},
  5: {links: [['+', 'tip']]},
  6: {links: [['+', 'tip'], ['-', 'side']], broken: true},
  7: {links: [['+', 'glass'], ['-', 'side']]},
  8: {links: [['+', 'tip'], ['-', 'tip']]},
};
export function isLit({links = [], broken = false, switchOpen = false}) {
  if (broken || switchOpen) return false;
  if (links.some(([a, b]) => (a === '+' && b === '-') || (a === '-' && b === '+'))) return false;
  const reach = (pole) => new Set(links.filter(([a, b]) => a === pole && (b === 'tip' || b === 'side')).map(([, b]) => b));
  const p = reach('+'), m = reach('-');
  return (p.has('tip') && m.has('side')) || (p.has('side') && m.has('tip'));
}
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const WIRE = ['#e8742a', '#2f7fd8', '#6fbf4a'];

// ---------------------------------------------------------------- 그림 (240 × 180 좌표)
export function paintCircuit(c, spec, now = 0) {
  const {links = [], broken = false, lit = false, labels = false, sw = null, heat = false} = spec;
  c.save();
  c.fillStyle = spec.bg || '#f7f3e8'; c.fillRect(0, 0, 240, 180);
  c.fillStyle = 'rgba(120,100,70,.12)'; c.fillRect(0, 150, 240, 30);
  // 전지
  const bx = 44, by = 58;
  c.fillStyle = '#c9ced6'; c.fillRect(bx + 12, by - 8, 16, 9);
  const g = c.createLinearGradient(bx, 0, bx + 40, 0); g.addColorStop(0, '#2b2f36'); g.addColorStop(0.5, '#4a515c'); g.addColorStop(1, '#23272d');
  c.fillStyle = g; c.fillRect(bx, by, 40, 92);
  c.fillStyle = '#e0a52a'; c.fillRect(bx, by + 30, 40, 24);
  c.fillStyle = '#c9ced6'; c.fillRect(bx, by + 88, 40, 5);
  c.fillStyle = '#fff'; c.font = 'bold 15px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('+', bx + 20, by + 12); c.fillText('−', bx + 20, by + 76);
  if (heat) { c.strokeStyle = 'rgba(230,80,40,.8)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(bx + 8 + i * 12, by - 14); c.bezierCurveTo(bx + 2 + i * 12, by - 22, bx + 14 + i * 12, by - 28, bx + 8 + i * 12, by - 36); c.stroke(); } }
  // 전구
  const cx = 176, cy = 64;
  if (lit) { const r = c.createRadialGradient(cx, cy, 4, cx, cy, reduceMotion() ? 70 : 64 + Math.sin(now / 140) * 5); r.addColorStop(0, 'rgba(255,236,150,.95)'); r.addColorStop(0.45, 'rgba(255,214,90,.35)'); r.addColorStop(1, 'rgba(255,214,90,0)'); c.fillStyle = r; c.fillRect(cx - 80, cy - 80, 160, 160); }
  c.fillStyle = lit ? 'rgba(255,248,200,.95)' : 'rgba(220,235,245,.55)'; c.strokeStyle = '#8fa3b5'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(cx, cy, 28, Math.PI * 0.78, Math.PI * 2.22); c.lineTo(cx + 11, cy + 34); c.lineTo(cx - 11, cy + 34); c.closePath(); c.fill(); c.stroke();
  // 필라멘트와 받침선
  c.strokeStyle = '#7b6a55'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(cx - 6, cy + 34); c.lineTo(cx - 9, cy - 2); c.moveTo(cx + 6, cy + 34); c.lineTo(cx + 9, cy - 2); c.stroke();
  c.strokeStyle = lit ? '#ff9a1f' : '#5a4a3a'; c.lineWidth = lit ? 2.2 : 1.4;
  c.beginPath(); c.moveTo(cx - 9, cy - 2);
  const pts = [[-6, -8], [-3, -2], [0, -8], [3, -2], [6, -8], [9, -2]];
  pts.forEach(([x, y], i) => { if (broken && i === 3) c.moveTo(cx + x + 1, cy + y - 3); else c.lineTo(cx + x, cy + y); });
  c.stroke();
  if (broken) { c.fillStyle = '#c0392b'; c.font = 'bold 10px "Malgun Gothic",sans-serif'; c.fillText('끊김', cx, cy - 18); }
  // 꼭지쇠(나사 모양 금속 옆면)와 꼭지(아래 끝)
  const sg = c.createLinearGradient(cx - 12, 0, cx + 12, 0); sg.addColorStop(0, '#9aa3ae'); sg.addColorStop(0.5, '#eef1f5'); sg.addColorStop(1, '#8e97a3');
  c.fillStyle = sg; c.fillRect(cx - 12, cy + 34, 24, 22);
  c.strokeStyle = '#7d8793'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(cx - 12, cy + 38 + i * 5); c.lineTo(cx + 12, cy + 36 + i * 5); c.stroke(); }
  c.fillStyle = '#26292e'; c.fillRect(cx - 8, cy + 56, 16, 5);
  c.fillStyle = '#b9c1cc'; c.beginPath(); c.ellipse(cx, cy + 63, 5, 3, 0, 0, Math.PI * 2); c.fill();
  // 전선: 모서리가 둥근 꺾은선으로 그려 어느 접점에 닿는지 또렷하게 보이게 한다
  const tipY = cy + 63, sideY = cy + 44;
  const poly = (pts) => { c.beginPath(); c.moveTo(...pts[0]); for (let k = 1; k < pts.length - 1; k++) c.arcTo(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 6); c.lineTo(...pts[pts.length - 1]); c.stroke(); };
  const used = {};
  links.forEach(([a, b], i) => {
    c.strokeStyle = WIRE[i % WIRE.length]; c.lineWidth = 3.2; c.lineCap = 'round'; c.lineJoin = 'round';
    const up = a === '+', sx = bx + 20, sy = up ? by - 8 : by + 93, ry = up ? 30 - i * 5 : 168 + i * 4;
    let pts, end;
    if (b === '+' || b === '-') pts = [[sx, sy], [sx, ry], [14, ry], [14, 168], [sx, 168], [sx, by + 93]];
    else if (b === 'tip') { const x = cx + (used.tip ? 4 : -4); end = [x, tipY]; pts = up ? [[sx, sy], [sx, ry], [218 + i * 6, ry], [218 + i * 6, 146], [x, 146], end] : [[sx, sy], [sx, ry], [x, ry], end]; }
    else if (b === 'side') { const left = used.side; end = left ? [cx - 12, sideY] : [cx + 12, sideY]; const vx = left ? 140 : 210 + i * 8; pts = [[sx, sy], [sx, ry], [vx, ry], [vx, sideY], end]; }
    else { end = [cx - 24, cy + 8]; pts = [[sx, sy], [sx, ry], [132, ry], [132, cy + 8], end]; }
    used[b] = true;
    poly(pts);
    if (end) { c.fillStyle = '#39424e'; c.beginPath(); c.arc(end[0], end[1], 3.2, 0, Math.PI * 2); c.fill(); }
  });
  // 스위치 (손전등): −극 쪽 전선 가운데에 끼워 넣는다
  if (sw) {
    const i = links.findIndex(([a]) => a === '-'), y = 168 + Math.max(0, i) * 4;
    c.strokeStyle = spec.bg || '#f7f3e8'; c.lineWidth = 6; c.beginPath(); c.moveTo(102, y); c.lineTo(134, y); c.stroke();
    c.fillStyle = '#6b4a2a'; c.fillRect(96, y + 3, 44, 6);
    c.fillStyle = '#9aa3ae'; c.beginPath(); c.arc(102, y, 3.5, 0, Math.PI * 2); c.arc(134, y, 3.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#39424e'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(102, y); c.lineTo(sw === 'on' ? 134 : 128, sw === 'on' ? y : y - 16); c.stroke();
    c.fillStyle = '#39424e'; c.font = 'bold 10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sw === 'on' ? '스위치 닫힘' : '스위치 열림', 118, y - 22);
  }
  if (labels) {
    c.font = '11px "Malgun Gothic",sans-serif'; c.fillStyle = '#39424e'; c.textAlign = 'left';
    c.textAlign = 'right'; c.fillText('꼭지쇠', cx - 16, cy + 40); c.fillText('꼭지', cx - 10, cy + 60); c.fillText('유리', cx - 30, cy - 20);
  }
  c.restore();
}
export function circuitCanvas(el, spec, cls = 'circuit-fig', label = '') {
  const cv = el('canvas', {class: cls, width: 480, height: 360, role: 'img', 'aria-label': label || describe(spec)});
  const c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); paintCircuit(c, spec);
  return cv;
}
export function describe({links = [], broken, short}) {
  const name = {tip: '꼭지', side: '꼭지쇠', glass: '유리', '+': '+극', '-': '−극'};
  const parts = links.map(([a, b]) => `전지 ${name[a]}에서 ${b === '+' || b === '-' ? '전지 ' + name[b] : '전구 ' + name[b]}(으)로 전선`);
  return (parts.length ? parts.join(', ') : '연결된 전선 없음') + (broken ? ', 필라멘트가 끊긴 전구' : '') + (short ? ', 전지 두 극을 바로 이은 합선 모형' : '');
}

// 전구 속 구조(필라멘트가 꼭지와 꼭지쇠에 이어진 모습)와 부품 이름 그림
export function paintBulbInside(c) {
  c.fillStyle = '#f7f3e8'; c.fillRect(0, 0, 240, 180);
  const cx = 120, cy = 62;
  c.fillStyle = 'rgba(220,235,245,.6)'; c.strokeStyle = '#8fa3b5'; c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, 44, Math.PI * 0.8, Math.PI * 2.2); c.lineTo(cx + 16, cy + 52); c.lineTo(cx - 16, cy + 52); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#b8c0ca'; c.fillRect(cx - 18, cy + 52, 36, 30); c.fillStyle = '#26292e'; c.fillRect(cx - 12, cy + 82, 24, 7); c.fillStyle = '#b8c0ca'; c.beginPath(); c.ellipse(cx, cy + 92, 7, 4, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#e0701f'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(cx - 14, cy); for (let i = 0; i <= 8; i++) c.lineTo(cx - 14 + i * 3.5, cy + (i % 2 ? -8 : 0)); c.stroke();
  c.strokeStyle = '#2f7fd8'; c.lineWidth = 2; c.setLineDash([4, 3]);
  c.beginPath(); c.moveTo(cx - 14, cy); c.lineTo(cx - 8, cy + 60); c.lineTo(cx - 17, cy + 66); c.stroke();
  c.beginPath(); c.moveTo(cx + 14, cy); c.lineTo(cx + 4, cy + 60); c.lineTo(cx, cy + 92); c.stroke(); c.setLineDash([]);
  c.font = '12px "Malgun Gothic",sans-serif'; c.fillStyle = '#39424e'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText('필라멘트', cx + 30, cy - 14); c.fillText('꼭지쇠(옆면)', cx + 24, cy + 66); c.fillText('꼭지(아래 끝)', cx + 14, cy + 94);
  c.fillStyle = '#2f7fd8'; c.fillText('점선: 필라멘트와 이어진 선', 8, 172);
}
export function paintParts(c) {
  c.fillStyle = '#f7f3e8'; c.fillRect(0, 0, 240, 180);
  paintCircuit(c, {links: [], bg: '#f7f3e8'});
  // 집게 달린 전선
  c.strokeStyle = '#e8742a'; c.lineWidth = 3; c.beginPath(); c.moveTo(96, 168); c.bezierCurveTo(110, 150, 120, 175, 136, 160); c.stroke();
  c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(136, 154); c.lineTo(156, 150); c.lineTo(156, 158); c.lineTo(136, 166); c.closePath(); c.fill();
  c.fillStyle = '#9aa3ae'; c.fillRect(156, 150, 10, 8);
  const tag = (x, y, tx, ty, t) => { c.strokeStyle = '#39424e'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(tx, ty); c.stroke(); c.fillStyle = '#3e5f8f'; c.beginPath(); c.arc(tx, ty, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 11px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, tx, ty + 1); };
  tag(64, 52, 20, 30, '가'); tag(64, 150, 20, 150, '나'); tag(176, 128, 214, 150, '다'); tag(188, 108, 222, 110, '라'); tag(176, 58, 222, 30, '마'); tag(160, 154, 130, 132, '바');
}

// ---------------------------------------------------------------- 작업대
// mode: 'test' 회로 카드 확인, 'fix' 고장 회로 고치기, 'flashlight' 손전등 완성
export function circuitBench({el, button, mode, memory = {}, onAction, onReady}) {
  const canvas = el('canvas', {class: 'bench-canvas', width: 720, height: 540, tabindex: 0, role: 'img'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const controls = el('div', {class: 'bench-controls'});
  const top = el('div', {class: 'bench-top'});
  const node = el('div', {class: 'signal-device bench'}, top, canvas, controls, status);
  const c = canvas.getContext('2d');
  let alive = true, raf = 0, gloves = mode !== 'test', card = null, heatUntil = 0;
  const tested = new Set(memory.tested || []);
  const REQUIRED = [1, 4, 5, 6, 7];
  const PUZZLES = [
    {wires: [['+', 'tip'], ['-', 'side']], broken: true, say: '첫 번째 손전등: 연결은 맞아 보이는데 켜지지 않아요.'},
    {wires: [['+', 'tip'], ['+', 'side']], broken: false, say: '두 번째 손전등: 전선 두 개가 모두 전지에 이어져 있는데 켜지지 않아요.'},
    {wires: [['+', 'tip'], ['none', 'side']], broken: false, say: '세 번째 손전등: 전선 하나의 끝이 비어 있어요.'},
  ];
  let pz = 0, fixedCount = 0, counted = -1;
  // 전선 두 개: [전지 쪽, 전구 쪽]
  let wires = [['+', 'none'], ['-', 'none']], broken = false, swOn = false, seenOn = false, seenOff = false;
  if (mode === 'fix') loadPuzzle(0);
  if (mode === 'flashlight') { wires = [['+', 'glass'], ['-', 'side']]; }
  function loadPuzzle(i) { const p = PUZZLES[i]; wires = p.wires.map((w) => [...w]); broken = p.broken; say(p.say); }
  const links = () => wires.filter(([a, b]) => a !== 'none' && b !== 'none').map(([a, b]) => [a, b]);
  const lit = () => (mode === 'test' ? !!card && card.shown && card.result : isLit({links: links(), broken, switchOpen: mode === 'flashlight' && !swOn}));
  function say(t) { status.textContent = t; }

  function renderTop() {
    top.replaceChildren();
    if (mode === 'test') {
      if (!gloves) { top.append(el('p', {class: 'bench-note'}, '실험 전에 보호 장갑부터 껴요.'), button('보호 장갑 끼기', () => { gloves = true; say('장갑을 꼈어요. 확인할 카드를 골라 주세요.'); renderTop(); renderControls(); })); return; }
      const row = el('div', {class: 'bench-cards', role: 'group', 'aria-label': '확인할 회로 카드'});
      for (let n = 1; n <= 8; n++) {
        const b = button(`카드 ${n}`, () => pick(n), 'bench-card' + (tested.has(n) ? ' done' : '') + (card?.n === n ? ' sel' : '') + (REQUIRED.includes(n) ? ' need' : ''));
        b.setAttribute('aria-pressed', String(card?.n === n));
        row.append(b);
      }
      const left = REQUIRED.filter((n) => !tested.has(n));
      top.append(row, el('p', {class: 'bench-note'}, left.length ? `꼭 확인할 카드: ${left.map((n) => n + '번').join(', ')}` : '꼭 확인할 카드를 모두 확인했어요.'));
    }
    if (mode === 'fix') top.append(el('p', {class: 'bench-note'}, `고친 손전등 ${fixedCount} / ${PUZZLES.length}`));
  }
  function pick(n) {
    const spec = CARDS[n];
    if (n === 2) {
      card = {n, shown: false};
      heatUntil = performance.now() + 2600;
      say('카드 2는 전지의 두 극을 전선으로 바로 이은 합선 회로예요. 전지가 뜨거워져 위험해서 직접 만들지 않아요. 모형으로만 잠깐 보여 주고 바로 끊을게요.');
      tested.add(2); memory.tested = [...tested]; renderTop(); renderControls(); return;
    }
    card = {n, shown: false, result: isLit(spec)};
    wires = [['+', 'none'], ['-', 'none']]; broken = !!spec.broken;
    say(`카드 ${n}처럼 전선을 이어 보세요.${broken ? ' 이 카드의 전구는 필라멘트가 끊긴 전구예요.' : ''}`);
    renderTop(); renderControls();
  }
  function wireRow(i, name) {
    const [a, b] = wires[i];
    const seg = (list, cur, set) => el('span', {class: 'bench-seg'}, list.map(([id, label]) => { const x = button(label, () => { set(id); if (card) card.shown = false; afterChange(); }, 'bench-opt'); x.setAttribute('aria-pressed', String(cur === id)); return x; }));
    return el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name w' + i}, name),
      el('span', {class: 'bench-lab'}, '전지 쪽'), seg([['+', '+극'], ['-', '−극'], ['none', '떼기']], a, (v) => { wires[i][0] = v; }),
      el('span', {class: 'bench-lab'}, '전구 쪽'), seg(BULB_ENDS.map((x) => [x.id, x.label]), b, (v) => { wires[i][1] = v; }));
  }
  function renderControls() {
    controls.replaceChildren();
    if (mode === 'test' && (!gloves || !card || card.n === 2)) return;
    controls.append(wireRow(0, '주황 전선'), wireRow(1, '파란 전선'));
    if (mode === 'test') controls.append(button('불이 켜지는지 확인하기', check, 'mission-go'));
    if (mode === 'fix' && broken) controls.append(button('전구를 새것으로 바꾸기', () => { broken = false; say('새 전구로 바꿨어요.'); afterChange(); }, 'secondary'));
    if (mode === 'flashlight') { const s = button(swOn ? '스위치 열기' : '스위치 닫기', () => { swOn = !swOn; afterChange(); }, 'signal-hold'); controls.append(s); }
  }
  function same(a, b) { const k = (l) => l.map(([x, y]) => x + '>' + y).sort().join('|'); return k(a) === k(b); }
  function check() {
    const spec = CARDS[card.n];
    if (!same(links(), spec.links)) { card.shown = false; say(`아직 카드 ${card.n}과 연결이 달라요. 카드 그림에서 전선이 전지와 전구의 어디에 닿는지 다시 보세요.`); return; }
    card.shown = true;
    tested.add(card.n); memory.tested = [...tested];
    const pred = memory.predict?.['c' + card.n];
    const result = card.result ? '켜짐' : '꺼짐';
    const predText = pred ? ` 내 예상은 "${pred === 'on' ? '켜짐' : '꺼짐'}"이었어요.${(pred === 'on') === card.result ? ' 예상과 같아요.' : (spec.broken ? ' 예상과 달랐네요. 전구 속 필라멘트를 살펴보세요.' : ' 예상과 달랐네요. 전선이 전구의 어디에 닿았는지 살펴보세요.')}` : '';
    say(`카드 ${card.n}: ${result}.${predText}`);
    renderTop();
    if (REQUIRED.every((n) => tested.has(n))) onAction?.('compared');
  }
  function afterChange() {
    renderControls();
    if (mode === 'fix') {
      // 손전등 하나는 한 번만 센다. 다음 손전등이 나올 때까지 조작 단추를 잠가 같은 손전등을 여러 번 세지 않게 한다.
      if (lit() && counted !== pz) {
        counted = pz; fixedCount++; say(fixedCount < PUZZLES.length ? '불이 켜졌어요. 다음 손전등을 고쳐 봐요.' : '세 손전등을 모두 고쳤어요.');
        renderTop();
        if (fixedCount < PUZZLES.length) { controls.inert = true; setTimeout(() => { if (alive) { pz++; loadPuzzle(pz); controls.inert = false; renderControls(); } }, 1400); }
        else onAction?.('fixed');
      }
    }
    if (mode === 'flashlight') {
      const ok = isLit({links: links(), broken});
      if (lit()) { seenOn = true; say('스위치를 닫으니 불이 켜졌어요.'); }
      else if (ok && seenOn && !swOn) { seenOff = true; say('스위치를 여니 전선을 떼지 않아도 불이 꺼졌어요.'); }
      else if (!ok) say('연결을 먼저 바르게 고쳐 보세요. 전지 두 극이 전구의 꼭지와 꼭지쇠에 하나씩 이어져야 해요.');
      else say('연결은 맞아요. 스위치를 닫아 보세요.');
      if (seenOn && seenOff) onReady?.();
    }
  }
  function draw(now) {
    if (!alive) return;
    c.setTransform(3, 0, 0, 3, 0, 0);
    const l = mode === 'test' && card?.n === 2 ? CARDS[2].links : links();
    const showHeat = now < heatUntil;
    paintCircuit(c, {links: mode === 'test' && card?.n === 2 && !showHeat ? [] : l, broken, lit: lit(), labels: true, sw: mode === 'flashlight' ? (swOn ? 'on' : 'off') : null, heat: showHeat, bg: '#fbf8ef'}, now);
    if (mode === 'test' && card && card.n !== 2) { c.fillStyle = 'rgba(62,95,143,.9)'; c.fillRect(0, 0, 64, 18); c.fillStyle = '#fff'; c.font = 'bold 11px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`카드 ${card.n}`, 32, 9); }
    raf = requestAnimationFrame(draw);
  }
  canvas.setAttribute('aria-label', mode === 'test' ? '회로 카드를 따라 연결해 보는 작업대' : mode === 'fix' ? '고장 난 손전등 회로' : '손전등 회로와 스위치');
  renderTop(); renderControls();
  if (mode === 'test') say('보호 장갑을 끼고, 카드를 하나씩 골라 똑같이 연결해 보세요.');
  if (mode === 'flashlight') say('예전과 배치가 다른 손전등이에요. 연결을 고친 다음 스위치로 켜고 꺼 보세요.');
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 철사 고리 통과 놀이
export function wireLoop({el, button, onReady}) {
  const W = 720, H = 300;
  const canvas = el('canvas', {class: 'bench-canvas', width: W, height: H, tabindex: 0, 'aria-label': '철사 고리 통과 놀이판. 방향키로 고리를 움직입니다. 고리가 철사에 닿으면 전구에 불이 켜집니다.'});
  const status = el('p', {class: 'signal-status', role: 'status'}, '방향키나 손가락으로 고리를 오른쪽 끝까지 옮겨 보세요. 고리가 철사에 닿으면 어떻게 될까요?');
  const pad = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device'}, el('div', {class: 'signal-owner'}, '철사 고리 놀이판'), canvas, pad, status);
  const c = canvas.getContext('2d');
  const wy = (x) => 150 + Math.sin(x / 70) * 50 + Math.sin(x / 23) * 10;
  let rx = 70, ry = wy(70), alive = true, raf = 0, touches = 0, touching = false, done = false, keys = new Set(), last = performance.now(), drag = false;
  const R = 22;
  // 실제 놀이판처럼 철사가 늘 고리 안을 지나게 한다. 고리는 철사에 닿을 수는 있어도 철사에서 빠져나가지 못한다.
  const keepOn = (x, y) => Math.max(wy(x) - (R - 3), Math.min(wy(x) + (R - 3), Math.max(40, Math.min(H - 40, y))));
  function near() { let best = 1e9; for (let x = rx - R - 4; x <= rx + R + 4; x += 2) best = Math.min(best, Math.hypot(x - rx, wy(x) - ry)); return best; }
  function step(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const v = 120;
    if (keys.has('ArrowRight')) rx += v * dt; if (keys.has('ArrowLeft')) rx -= v * dt; if (keys.has('ArrowUp')) ry -= v * dt; if (keys.has('ArrowDown')) ry += v * dt;
    rx = Math.max(60, Math.min(W - 60, rx)); ry = keepOn(rx, ry);
    const t = near() > R - 5;
    if (t && !touching) { touches++; status.textContent = '고리가 철사에 닿았어요. 전기가 흐르는 길이 이어져 불이 켜졌어요.'; }
    touching = t;
    if (rx >= W - 70 && !done) { done = true; status.textContent = `끝까지 왔어요. 닿은 횟수: ${touches}번.`; }
    if ((touches > 0 || done) && onReady) { const f = onReady; onReady = null; f(); }
    draw(now);
    raf = requestAnimationFrame(step);
  }
  function draw(now) {
    c.fillStyle = '#1b2230'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#6b4a2a'; c.fillRect(30, H - 40, W - 60, 22);
    c.strokeStyle = '#d9b36a'; c.lineWidth = 5; c.beginPath(); for (let x = 50; x <= W - 50; x += 4) { const y = wy(x); if (x === 50) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    c.strokeStyle = '#c9ced6'; c.lineWidth = 3; c.beginPath(); c.moveTo(50, wy(50)); c.lineTo(50, H - 40); c.moveTo(W - 50, wy(W - 50)); c.lineTo(W - 50, H - 40); c.stroke();
    // 전구 표시
    const on = touching;
    if (on) { const g = c.createRadialGradient(W - 40, 40, 2, W - 40, 40, 60); g.addColorStop(0, 'rgba(255,236,150,.95)'); g.addColorStop(1, 'rgba(255,214,90,0)'); c.fillStyle = g; c.fillRect(W - 110, 0, 110, 110); }
    c.fillStyle = on ? '#fff3b0' : '#6c7686'; c.beginPath(); c.arc(W - 40, 36, 16, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9aa3ae'; c.fillRect(W - 48, 50, 16, 10);
    c.fillStyle = '#e8ecf2'; c.font = '13px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.fillText(on ? '켜짐' : '꺼짐', W - 40, 78);
    // 고리와 손잡이
    c.strokeStyle = on ? '#ffd35a' : '#dfe4ea'; c.lineWidth = 5; c.beginPath(); c.arc(rx, ry, R, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#3e5f8f'; c.lineWidth = 8; c.beginPath(); c.moveTo(rx, ry + R); c.lineTo(rx, ry + R + 40); c.stroke();
  }
  const hold = (label, key) => { const b = button(label, () => {}, 'bench-opt'); b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(key); }); for (const k of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) b.addEventListener(k, () => keys.delete(key));
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); keys.add(key); } }); b.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') keys.delete(key); }); return b; };
  pad.append(hold('◀', 'ArrowLeft'), hold('▲', 'ArrowUp'), hold('▼', 'ArrowDown'), hold('▶', 'ArrowRight'));
  canvas.addEventListener('keydown', (e) => { if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.add(e.key); } });
  canvas.addEventListener('keyup', (e) => keys.delete(e.key));
  const toLocal = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)]; };
  canvas.addEventListener('pointerdown', (e) => { const [x, y] = toLocal(e); if (Math.hypot(x - rx, y - ry) < R + 30) { drag = true; canvas.setPointerCapture?.(e.pointerId); } canvas.focus({preventScroll: true}); });
  canvas.addEventListener('pointermove', (e) => { if (!drag) return; const [x, y] = toLocal(e); rx = Math.max(60, Math.min(W - 60, x)); ry = keepOn(rx, y); });
  for (const k of ['pointerup', 'pointercancel']) canvas.addEventListener(k, () => { drag = false; });
  raf = requestAnimationFrame(step);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}
