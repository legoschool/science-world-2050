// 태양 고도 모형 (햇살 농장 지구, 과학 14~19쪽). 화면의 값은 모두 모형 값이다.
// 태양 고도 h = asin(sin φ sin δ + cos φ cos δ cos H). 기본 위치는 진해(북위 35.15°, 동경 128.69°), 기본 날짜는 9월 23일.
// 그림자 길이 = 막대 높이 / tan h. 기온은 14시 30분에 가장 높은 모형 곡선을 쓴다.
export const PLACE = {lat: 35.15, lon: 128.69};
const R = Math.PI / 180;
export function decl(doy) { return 23.44 * Math.sin(2 * Math.PI * (284 + doy) / 365); }
export function altitude(clock, {lat = PLACE.lat, lon = PLACE.lon, doy = 266} = {}) {
  const solar = clock + (lon - 135) / 15, H = 15 * (solar - 12), d = decl(doy) * R, p = lat * R;
  return Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H * R)) / R;
}
export const shadow = (h, stick = 10) => stick / Math.tan(Math.max(1, h) * R);
// 9시 30분 22℃에서 14시 30분 27.6℃까지 오르고 뒤에 천천히 내려간다. 0.5℃ 눈금으로 읽어도 14시 30분이 유일한 최댓값이다.
export const temperature = (clock) => (clock <= 14.5 ? 22 + 5.6 * (1 - Math.cos(Math.PI * Math.max(0, clock - 9.5) / 5)) / 2 : 27.6 - 2.5 * (1 - Math.cos(Math.PI * Math.min(4, clock - 14.5) / 4)) / 2);
export const fmtTime = (t) => `${Math.floor(t)}시${t % 1 ? ' 30분' : ''}`;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- 그림: 막대, 그림자, 햇빛, 각
export function paintSunStick(c, {h = 45, stick = 60, showAngle = true, label = '', light = 'sun', bg = '#eef6ff'}) {
  c.fillStyle = bg; c.fillRect(0, 0, 240, 180);
  c.fillStyle = '#9ccf7a'; c.fillRect(0, 140, 240, 40);
  const x0 = 70, y0 = 140, len = stick / Math.tan(h * R);
  c.fillStyle = 'rgba(60,60,60,.35)'; c.fillRect(x0, y0 - 3, len, 6);
  c.strokeStyle = '#8a5a2b'; c.lineWidth = 5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y0 - stick); c.stroke();
  // 햇빛: 평행한 빛줄기
  c.strokeStyle = 'rgba(240,170,20,.8)'; c.lineWidth = 2;
  const dx = Math.cos(h * R), dy = Math.sin(h * R);
  for (let i = -2; i <= 2; i++) { const sx = x0 + len + i * 26, sy = y0; c.beginPath(); c.moveTo(sx - dx * 200, sy - dy * 200); c.lineTo(sx - dx * 12, sy - dy * 12); c.stroke(); }
  c.fillStyle = '#ffcf3a'; c.beginPath(); c.arc(x0 + len - dx * 150, y0 - dy * 150, 14, 0, Math.PI * 2); c.fill();
  // 실과 각
  c.strokeStyle = '#c0392b'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, y0 - stick); c.lineTo(x0 + len, y0); c.stroke();
  if (showAngle) { c.strokeStyle = '#2f5fa8'; c.lineWidth = 2; c.beginPath(); c.arc(x0 + len, y0, 22, Math.PI, Math.PI + h * R, false); c.stroke(); c.fillStyle = '#2f5fa8'; c.font = 'bold 12px "Malgun Gothic",sans-serif'; c.fillText('태양 고도', x0 + len - 70, y0 - 14); }
  if (label) { c.fillStyle = '#233a5c'; c.font = 'bold 13px "Malgun Gothic",sans-serif'; c.fillText(label, 8, 18); }
}
export function paintMeterParts(c) {
  c.fillStyle = '#eef6ff'; c.fillRect(0, 0, 240, 180);
  c.fillStyle = '#9ccf7a'; c.fillRect(0, 140, 240, 40);
  const x0 = 60, y0 = 132, h = 40, stick = 60, len = stick / Math.tan(h * R);
  c.fillStyle = '#e8d9b5'; c.fillRect(30, y0, 190, 8);
  c.fillStyle = '#5a4a2a'; for (let i = 0; i < 16; i++) c.fillRect(x0 + i * 10, y0 + 8, 1, i % 5 ? 3 : 6);
  c.fillStyle = 'rgba(40,40,40,.4)'; c.fillRect(x0, y0 - 3, len, 5);
  c.strokeStyle = '#8a5a2b'; c.lineWidth = 5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y0 - stick); c.stroke();
  c.strokeStyle = '#c0392b'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, y0 - stick); c.lineTo(x0 + len, y0); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.strokeStyle = '#2f5fa8'; c.beginPath(); c.arc(x0 + len, y0, 26, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
  const tag = (x, y, tx, ty, s) => { c.strokeStyle = '#39424e'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(tx, ty); c.stroke(); c.fillStyle = '#3e5f8f'; c.beginPath(); c.arc(tx, ty, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 11px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, tx, ty + 1); };
  tag(x0 + 100, y0 + 10, x0 + 110, 168, '가'); tag(x0, y0 - 40, 24, 50, '나'); tag(x0 + len / 2, y0 - stick / 2, x0 + 40, 30, '다'); tag(x0 + len + 14, y0 - 20, 200, 60, '라'); tag(x0 + len / 2, y0 - 1, x0 + 30, 170, '마');
}
export function paintRays(c, {light = 'sun'}) {
  const kind = light;
  c.fillStyle = kind === 'sun' ? '#eef6ff' : '#2a2f3a'; c.fillRect(0, 0, 240, 180);
  c.fillStyle = kind === 'sun' ? '#9ccf7a' : '#4a4f5a'; c.fillRect(0, 140, 240, 40);
  const sticks = [50, 110, 170];
  if (kind === 'sun') {
    c.strokeStyle = 'rgba(240,170,20,.8)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(i * 45 - 60, 0); c.lineTo(i * 45 + 20, 130); c.stroke(); }
    for (const x of sticks) { c.fillStyle = 'rgba(60,60,60,.4)'; c.fillRect(x, 137, 26, 6); }
  } else {
    const lx = 120, ly = 20; c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(lx, ly, 10, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,230,140,.6)'; c.lineWidth = 2; for (const x of sticks) { c.beginPath(); c.moveTo(lx, ly); c.lineTo(x, 118); c.stroke(); }
    for (const x of sticks) { const dx = (x - lx) / (118 - ly) * 22; c.fillStyle = 'rgba(0,0,0,.5)'; c.save(); c.translate(x, 140); c.beginPath(); c.moveTo(-2, 0); c.lineTo(dx - 2, 3); c.lineTo(dx + 2, 3); c.lineTo(2, 0); c.fill(); c.restore(); }
  }
  for (const x of sticks) { c.strokeStyle = '#8a5a2b'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, 140); c.lineTo(x, 118); c.stroke(); }
}

// ---------------------------------------------------------------- 측정기 읽기
// mode 'meter': 실 끝을 그림자 끝에 맞춘 뒤 각도기로 태양 고도를 읽는다. task.at = {time, lat, doy}
// mode 'compare': 10 cm와 20 cm 막대를 같은 시각 같은 자리에 두고 나란히 본다.
export function sunMeter({el, button, mode, task, memory = {}, onReady}) {
  const W = 720, H = 400;
  const at = task.at || {time: 12, lat: PLACE.lat, doy: 266};
  const h = at.h ?? altitude(at.time, at), night = !!at.night;
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: W * 2, height: H * 2, tabindex: 0, role: 'img', 'aria-label': mode === 'compare' ? '길이가 다른 막대 두 개의 그림자' : '태양 고도 측정기. 실 끝을 그림자 끝에 맞춰 보세요.'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, `${at.name || '관측 자리'}, ${fmtTime(at.time)}(모형 값)`), canvas, tray, status);
  const c = canvas.getContext('2d');
  const stickPx = 120, scale = stickPx / 10, x0 = 170, y0 = 300;
  const tip = x0 + shadow(h) * scale;
  let end = x0 + 40, alive = true, raf = 0, matched = false, tiltA = 15;
  function draw() {
    if (!alive) return;
    c.setTransform(2, 0, 0, 2, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, night ? '#101a33' : '#bfe2ff'); g.addColorStop(1, night ? '#2a3553' : '#eaf6ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = night ? '#3d5a3a' : '#8fc46a'; c.fillRect(0, y0, W, H - y0);
    // 햇빛 (밤에는 달빛)
    const dx = Math.cos(h * R), dy = Math.sin(h * R);
    c.fillStyle = night ? '#f4f1d0' : '#ffcf3a'; c.beginPath(); c.arc(Math.max(40, Math.min(W - 40, tip - dx * 420)), Math.max(40, y0 - dy * 420), 26, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(240,170,20,.55)'; c.lineWidth = 2; for (let i = -3; i <= 3; i++) { const sx = tip + i * 60; c.beginPath(); c.moveTo(sx - dx * 500, y0 - dy * 500); c.lineTo(sx, y0); c.stroke(); }
    if (mode === 'compare') {
      for (const [xs, len, name] of [[120, 10, '10 cm 막대'], [420, 20, '20 cm 막대']]) {
        const sp = len * scale * 0.7, tp = xs + shadow(h, len) * scale * 0.7;
        c.fillStyle = 'rgba(40,40,40,.4)'; c.fillRect(xs, y0 - 4, tp - xs, 8);
        c.strokeStyle = '#8a5a2b'; c.lineWidth = 7; c.beginPath(); c.moveTo(xs, y0); c.lineTo(xs, y0 - sp); c.stroke();
        c.strokeStyle = '#c0392b'; c.lineWidth = 2; c.beginPath(); c.moveTo(xs, y0 - sp); c.lineTo(tp, y0); c.stroke();
        c.strokeStyle = '#2f5fa8'; c.lineWidth = 3; c.beginPath(); c.arc(tp, y0, 34, Math.PI, Math.PI + h * R); c.stroke();
        c.fillStyle = '#233a5c'; c.font = 'bold 15px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.fillText(name, xs, y0 + 26);
        c.fillText(`각 ${Math.round(h)}°, 그림자 ${shadow(h, len).toFixed(1)} cm`, (xs + tp) / 2 + 40, y0 + 50);
      }
      raf = requestAnimationFrame(draw); return;
    }
    if (mode === 'tilt') {
      // 햇빛은 왼쪽 위에서 오므로 판은 오른쪽 경첩에서 태양 쪽(왼쪽 위)으로 세운다. 판의 각이 태양 고도와 같으면 판이 햇빛과 나란하다.
      const hx = 560, hy = y0 - 4, L = 300, a = tiltA * R;
      const ex = hx - Math.cos(a) * L, ey = hy - Math.sin(a) * L;
      c.strokeStyle = '#b98a55'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.stroke();
      // 판 끝의 작은 날개: 판이 햇빛과 나란하지 않으면 눈금 쪽으로 그림자가 진다
      const fx = hx - Math.cos(a) * (L - 20), fy = hy - Math.sin(a) * (L - 20), nx = Math.sin(a), ny = -Math.cos(a);
      c.strokeStyle = '#6b4a2a'; c.lineWidth = 6; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + nx * 30, fy + ny * 30); c.stroke();
      const off = (tiltA - h);
      if (Math.abs(off) > 1) { const sl = Math.min(220, Math.abs(Math.tan(off * R)) * 30 * 6 + 10); c.strokeStyle = 'rgba(40,40,40,.45)'; c.lineWidth = 9; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + Math.cos(a) * sl, fy + Math.sin(a) * sl); c.stroke(); }
      c.fillStyle = '#233a5c'; c.font = 'bold 14px "Malgun Gothic",sans-serif'; c.textAlign = 'left';
      c.fillText(Math.abs(off) <= 1 ? '눈금 부분의 그림자가 사라졌어요. 판과 지면이 이루는 각을 읽어 보세요.' : '판을 기울여 눈금 부분에 그림자가 생기지 않게 맞춰 보세요.', 20, 30);
      if (Math.abs(off) <= 1) { c.save(); c.translate(hx, hy); c.fillStyle = 'rgba(255,255,255,.8)'; c.strokeStyle = '#2f5fa8'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 120, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#233a5c'; c.font = '10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; for (let d = 0; d <= 90; d += 1) { const ang = Math.PI + d * R, r1 = d % 10 === 0 ? 104 : d % 5 === 0 ? 110 : 114; c.beginPath(); c.moveTo(Math.cos(ang) * 120, Math.sin(ang) * 120); c.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); c.strokeStyle = '#2f5fa8'; c.stroke(); if (d % 10 === 0) c.fillText(String(d), Math.cos(ang) * 92, Math.sin(ang) * 92 + 3); } c.restore(); }
      raf = requestAnimationFrame(draw); return;
    }
    // 측정판과 막대
    c.fillStyle = '#e8d9b5'; c.fillRect(x0 - 40, y0 - 6, 470, 12);
    c.fillStyle = 'rgba(40,40,40,.42)'; c.fillRect(x0, y0 - 6, tip - x0, 8);
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 7; c.beginPath(); c.moveTo(x0, y0 - 6); c.lineTo(x0, y0 - 6 - stickPx); c.stroke();
    // 눈금
    c.fillStyle = '#5a4a2a'; c.font = '11px "Malgun Gothic",sans-serif'; c.textAlign = 'center';
    for (let cm = 0; cm <= 30; cm += 1) { const x = x0 + cm * scale; c.fillRect(x, y0 + 6, 1, cm % 5 ? 5 : 10); if (cm % 5 === 0) c.fillText(cm + ' cm', x, y0 + 26); }
    // 실
    c.strokeStyle = '#c0392b'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0 - 6 - stickPx); c.lineTo(end, y0 - 6); c.stroke();
    c.fillStyle = '#c0392b'; c.beginPath(); c.arc(end, y0 - 6, 7, 0, Math.PI * 2); c.fill();
    if (matched) {
      // 각도기: 중심은 실 끝(그림자 끝)
      c.save(); c.translate(end, y0 - 6);
      c.fillStyle = 'rgba(255,255,255,.75)'; c.strokeStyle = '#2f5fa8'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 110, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#233a5c'; c.font = '10px "Malgun Gothic",sans-serif';
      for (let a = 0; a <= 180; a += 1) { const r1 = a % 10 === 0 ? 94 : a % 5 === 0 ? 100 : 104, ang = Math.PI + a * R; c.beginPath(); c.moveTo(Math.cos(ang) * 110, Math.sin(ang) * 110); c.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); c.strokeStyle = '#2f5fa8'; c.stroke(); if (a % 10 === 0 && a <= 90) { c.fillText(String(a), Math.cos(ang) * 84, Math.sin(ang) * 84 + 3); } }
      c.restore();
      c.fillStyle = night ? '#e8ecf2' : '#233a5c'; c.font = 'bold 13px "Malgun Gothic",sans-serif'; c.textAlign = 'left'; c.fillText('각도기 중심을 그림자 끝에 맞췄어요. 실이 가리키는 눈금을 읽어 보세요.', 20, 30);
    }
    raf = requestAnimationFrame(draw);
  }
  // 실 끝을 그림자 끝에 맞춘 뒤에는 실과 각도기를 그 자리에 고정한다(움직이면 각도기가 따라가 다른 각을 읽게 된다).
  function move(d) { if (mode === 'compare' || matched) return; end =Math.max(x0 + 10, Math.min(x0 + 460, end + d)); check(); }
  function check() {
    const ok = Math.abs(end - tip) <= 6;
    if (ok && !matched) { matched = true; end = tip; status.textContent = '실 끝이 그림자 끝에 닿았어요. 각도기 눈금을 읽어 아래에 입력하세요.'; onReady?.(); }
    else if (!ok && !matched) status.textContent = Math.abs(end - tip) < 30 ? '조금만 더 움직여 보세요.' : '실 끝을 그림자 끝까지 옮겨 보세요.';
  }
  if (mode === 'tilt') {
    const turn = (d) => { if (matched) return; tiltA = Math.max(0, Math.min(88, tiltA + d)); if (Math.abs(tiltA - h) <= 1) { matched = true; tiltA = h; status.textContent = '그림자가 사라졌어요. 각도기 눈금을 읽어 아래에 입력하세요.'; onReady?.(); } else status.textContent = '판을 기울였어요. 눈금 부분에 그림자가 남았는지 살펴보세요.'; };
    tray.append(button('판 눕히기 ◀◀', () => turn(-5), 'bench-opt'), button('◀ 조금', () => turn(-1), 'bench-opt'), button('조금 ▶', () => turn(1), 'bench-opt'), button('판 세우기 ▶▶', () => turn(5), 'bench-opt'));
    canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); turn(e.shiftKey ? -5 : -1); } if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); turn(e.shiftKey ? 5 : 1); } });
    status.textContent = '판을 기울여 눈금 부분에 그림자가 생기지 않게 맞춰 보세요.';
  } else if (mode !== 'compare') {
    const hold = (label, d) => { const b = button(label, () => move(d), 'bench-opt'); return b; };
    tray.append(hold('◀ 조금', -4), hold('◀◀', -20), hold('▶▶', 20), hold('조금 ▶', 4));
    canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); move(e.shiftKey ? -20 : -4); } if (e.key === 'ArrowRight') { e.preventDefault(); move(e.shiftKey ? 20 : 4); } });
    let drag = false;
    const toX = (e) => { const r = canvas.getBoundingClientRect(); return (e.clientX - r.left) * (W / r.width); };
    canvas.addEventListener('pointerdown', (e) => { if (matched) return; drag = true; canvas.setPointerCapture?.(e.pointerId); end = Math.max(x0 + 10, Math.min(x0 + 460, toX(e))); check(); });
    canvas.addEventListener('pointermove', (e) => { if (drag && !matched) { end = Math.max(x0 + 10, Math.min(x0 + 460, toX(e))); check(); } });
    for (const k of ['pointerup', 'pointercancel']) canvas.addEventListener(k, () => { drag = false; });
    status.textContent = '실 끝을 끌어 막대 그림자 끝에 맞춰 보세요. 방향키로도 움직일 수 있어요.';
  } else { status.textContent = '같은 시각, 같은 자리에 둔 두 막대예요. 각과 그림자 길이를 비교해 보세요.'; setTimeout(() => onReady?.(), 0); }
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 하루 관측
// 시각을 옮기며 태양 고도, 그림자 길이, 기온을 기록하고 세 꺾은선그래프를 겹쳐 본다.
export const DAY_TIMES = [9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5];
export function dayRecord(t) { const h = altitude(t); return {h: Math.round(h), s: Math.round(shadow(h) * 10) / 10, T: Math.round(temperature(t) * 2) / 2}; }
export function sunDay({el, button, mode, memory = {}, onAction, onReady}) {
  const W = 720, H = 360;
  const recs = memory.day ??= {};
  let t = 9.5, alive = true, raf = 0, bent = false, bentFixed = !!memory.bentFixed;
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: W * 2, height: H * 2, role: 'img', 'aria-label': '운동장 관측 장면. 시각에 따라 태양의 위치, 막대 그림자, 온도계가 바뀐다.'});
  const graph = el('canvas', {class: 'bench-canvas sun-graph', width: W * 2, height: 340 * 2, role: 'img', 'aria-label': '태양 고도, 그림자 길이, 기온을 겹친 꺾은선그래프'});
  const table = el('div', {class: 'sun-table'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const showScene = mode !== 'graph';
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, '학교 운동장 관측, 9월 23일(모형 값)'), showScene ? canvas : '', showScene ? tray : '', status, table, graph);
  const c = canvas.getContext('2d'), gc = graph.getContext('2d');
  function scene() {
    if (!alive || !showScene) return;
    c.setTransform(2, 0, 0, 2, 0, 0);
    const h = altitude(t);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9fd3ff'); g.addColorStop(1, '#e6f4ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#c9a36a'; c.fillRect(0, 250, W, 110);
    c.fillStyle = '#233a5c'; c.font = 'bold 13px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.fillText('동', 40, 240); c.fillText('남', 360, 240); c.fillText('서', 680, 240);
    // 태양 길: 동쪽에서 떠서 남쪽 높이, 서쪽으로
    c.strokeStyle = 'rgba(255,200,60,.5)'; c.setLineDash([6, 6]); c.beginPath(); for (let k = 7; k <= 18; k += 0.25) { const x = 40 + (k - 6.5) / 12 * 640, y = 250 - Math.max(0, altitude(k)) * 3.2; k === 7 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); c.setLineDash([]);
    const sx = 40 + (t - 6.5) / 12 * 640, sy = 250 - h * 3.2;
    c.fillStyle = '#ffcf3a'; c.beginPath(); c.arc(sx, sy, 18, 0, Math.PI * 2); c.fill();
    // 측정기와 그림자 (옆에서 본 모습, 해가 동쪽이면 그림자는 서쪽)
    const bx = 300, by = 300, sp = 60 / 10, len = shadow(h) * sp, dir = t < 12.42 ? 1 : -1;
    c.fillStyle = '#e8d9b5'; c.fillRect(bx - 150, by - 4, 300, 8);
    c.fillStyle = 'rgba(40,40,40,.4)'; c.fillRect(bx, by - 4, dir * Math.min(150, len), 7);
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 6; c.beginPath(); c.moveTo(bx, by - 4);
    if (bent) { c.quadraticCurveTo(bx + 16, by - 34, bx + 10, by - 64); } else c.lineTo(bx, by - 64);
    c.stroke();
    // 백엽상과 온도계
    c.fillStyle = '#f4f4f4'; c.fillRect(560, 170, 70, 60); c.strokeStyle = '#999'; c.strokeRect(560, 170, 70, 60); c.fillStyle = '#8a8a8a'; c.fillRect(592, 230, 6, 70);
    const T = temperature(t); c.fillStyle = '#fff'; c.fillRect(585, 176, 20, 48); c.fillStyle = '#d33'; c.fillRect(592, 176 + 44 - (T - 18) * 3.2, 6, (T - 18) * 3.2);
    c.fillStyle = '#233a5c'; c.font = 'bold 14px "Malgun Gothic",sans-serif'; c.textAlign = 'left';
    c.fillText(fmtTime(t), 20, 28);
    raf = requestAnimationFrame(scene);
  }
  function paintGraph() {
    gc.setTransform(2, 0, 0, 2, 0, 0); gc.fillStyle = '#fff'; gc.fillRect(0, 0, W, 340);
    const L = 60, Rr = 660, T0 = 30, B = 290;
    gc.strokeStyle = '#c9d4e2'; gc.lineWidth = 1; gc.fillStyle = '#51637a'; gc.font = '12px "Malgun Gothic",sans-serif'; gc.textAlign = 'center';
    DAY_TIMES.forEach((tt, i) => { const x = L + i * (Rr - L) / 6; gc.beginPath(); gc.moveTo(x, T0); gc.lineTo(x, B); gc.stroke(); gc.fillText(fmtTime(tt), x, B + 18); });
    for (let k = 0; k <= 4; k++) { const y = B - k * (B - T0) / 4; gc.beginPath(); gc.moveTo(L, y); gc.lineTo(Rr, y); gc.stroke(); }
    const series = [['h', '태양 고도(°)', '#e0701f', 0, 80, []], ['s', '그림자 길이(cm)', '#2f5fa8', 0, 40, [6, 4]], ['T', '기온(℃)', '#c0392b', 18, 30, [2, 3]]];
    series.forEach(([k, name, col, lo, hi, dash], si) => {
      gc.strokeStyle = col; gc.fillStyle = col; gc.lineWidth = 2.5; gc.setLineDash(dash); gc.beginPath();
      let first = true;
      DAY_TIMES.forEach((tt, i) => { const r = recs[tt]; if (!r) return; const x = L + i * (Rr - L) / 6, y = B - (r[k] - lo) / (hi - lo) * (B - T0); if (first) { gc.moveTo(x, y); first = false; } else gc.lineTo(x, y); });
      gc.stroke(); gc.setLineDash([]);
      DAY_TIMES.forEach((tt, i) => { const r = recs[tt]; if (!r) return; const x = L + i * (Rr - L) / 6, y = B - (r[k] - lo) / (hi - lo) * (B - T0); gc.beginPath(); gc.arc(x, y, 4, 0, Math.PI * 2); gc.fill(); });
      gc.textAlign = 'left'; gc.font = 'bold 12px "Malgun Gothic",sans-serif'; gc.fillRect(L + si * 200, 10, 20, 3); gc.fillText(name, L + si * 200 + 26, 15);
    });
  }
  function paintTable() {
    table.replaceChildren(el('table', {}, el('tr', {}, el('th', {}, '시각'), DAY_TIMES.map((tt) => el('th', {}, fmtTime(tt)))),
      el('tr', {}, el('th', {}, '태양 고도(°)'), DAY_TIMES.map((tt) => el('td', {}, recs[tt] ? String(recs[tt].h) : ''))),
      el('tr', {}, el('th', {}, '그림자 길이(cm)'), DAY_TIMES.map((tt) => el('td', {}, recs[tt] ? String(recs[tt].s) : ''))),
      el('tr', {}, el('th', {}, '기온(℃)'), DAY_TIMES.map((tt) => el('td', {}, recs[tt] ? String(recs[tt].T) : '')))));
    paintGraph();
  }
  function paintTray() {
    tray.replaceChildren();
    const sel = el('div', {class: 'bench-seg'}, DAY_TIMES.map((tt) => { const b = button(fmtTime(tt), () => { t = tt; bent = tt === 13.5 && !bentFixed; status.textContent = bent ? `${fmtTime(tt)}. 어, 측정기의 막대가 이상해요. 무엇이 잘못됐는지 살펴보세요.` : `${fmtTime(tt)}. 측정기와 온도계를 읽고 기록하세요.`; paintTray(); }, 'bench-opt' + (recs[tt] ? ' tested' : '')); b.setAttribute('aria-pressed', String(t === tt)); return b; }));
    tray.append(sel);
    if (bent) tray.append(button('휜 막대를 바로 세우기', () => { bent = false; bentFixed = true; memory.bentFixed = true; status.textContent = '막대를 수직으로 바로 세웠어요. 이제 기록해도 돼요.'; paintTray(); }, 'signal-hold'));
    else tray.append(button(`${fmtTime(t)} 값 기록하기`, record, 'mission-go'));
  }
  function record() {
    if (bent) return;
    recs[t] = dayRecord(t);
    const n = DAY_TIMES.filter((tt) => recs[tt]).length;
    status.textContent = `${fmtTime(t)} 기록: 태양 고도 ${recs[t].h}°, 그림자 ${recs[t].s} cm, 기온 ${recs[t].T}℃. (${n}/7)`;
    paintTable(); paintTray();
    if (n >= DAY_TIMES.length) { status.textContent += ' 일곱 번 모두 기록했어요. 아래 그래프를 살펴보세요.'; onAction?.('recorded'); onReady?.(); }
  }
  if (showScene) { paintTray(); raf = requestAnimationFrame(scene); status.textContent = '시각을 고르고 값을 기록하세요. 모두 일곱 번 재요.'; }
  else { status.textContent = '내가 기록한 값과 그래프예요.'; setTimeout(() => onReady?.(), 0); }
  paintTable();
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 계절 (과학 20~23쪽)
// 매월 20일의 남중 고도와 낮의 길이(계산값). 남중 고도 = 90° - 위도 + 적위. 낮의 길이는 해가 보이기 시작한 때부터 보이지 않게 된 때까지(대기에서 꺾이는 빛 0.833° 포함).
export const MONTH_DOY = [20, 51, 79, 110, 140, 171, 201, 232, 263, 293, 324, 354];
export const MARCH_FIRST = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];
export const REGIONS = {jinhae: {name: '진해', lat: 35.15, lon: 128.69}, seoul: {name: '서울', lat: 37.57, lon: 126.98}, jeju: {name: '제주', lat: 33.5, lon: 126.53}};
export const noonAlt = (doy, lat = PLACE.lat) => 90 - lat + decl(doy);
export function dayLength(doy, lat = PLACE.lat) {
  const d = decl(doy) * R, p = lat * R, c = (Math.sin(-0.833 * R) - Math.sin(p) * Math.sin(d)) / (Math.cos(p) * Math.cos(d));
  return 2 * Math.acos(Math.max(-1, Math.min(1, c))) / R / 15;
}
export const hm = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}시간 ${m % 60}분`; };
export const clockText = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}시 ${String(m % 60).padStart(2, '0')}분`; };
export function dayRecordOf(doy, place = PLACE) {
  const len = dayLength(doy, place.lat), noon = 12 + (135 - place.lon) / 15;
  return {alt: Math.round(noonAlt(doy, place.lat)), len, rise: noon - len / 2, set: noon + len / 2};
}
export const monthRecord = (i, place = PLACE) => dayRecordOf(MONTH_DOY[i], place);
function azAlt(clock, doy, place = PLACE) {
  const solar = clock + (place.lon - 135) / 15, H = 15 * (solar - 12) * R, d = decl(doy) * R, p = place.lat * R;
  const alt = Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(p) - Math.tan(d) * Math.cos(p)) + Math.PI;
  return {alt: alt / R, az: az / R};
}
const KEY_DAYS = [{id: 'mar', label: '3월 21일', doy: 80, color: '#3f9a2f'}, {id: 'jun', label: '6월 21일', doy: 172, color: '#d9601a'}, {id: 'sep', label: '9월 23일', doy: 266, color: '#7a4bc6'}, {id: 'dec', label: '12월 21일', doy: 355, color: '#2f6fc8'}];
const FONT = (s, b) => `${b ? 'bold ' : ''}${s}px "Malgun Gothic",sans-serif`;

// 남쪽 하늘. 가로는 방위(북동에서 북서까지), 세로는 고도.
function skyView(c, W, H) {
  const X = (az) => 30 + (az - 45) / 270 * (W - 60), Y = (alt) => H - 60 - alt * (H - 100) / 90;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9fd3ff'); g.addColorStop(1, '#e6f4ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = '#8fc46a'; c.fillRect(0, H - 60, W, 60);
  c.strokeStyle = 'rgba(35,58,92,.22)'; c.lineWidth = 1; c.fillStyle = '#51637a'; c.font = FONT(11); c.textAlign = 'left';
  for (let a = 0; a <= 90; a += 30) { c.beginPath(); c.moveTo(24, Y(a)); c.lineTo(W - 10, Y(a)); c.stroke(); c.fillText(a + '°', 2, Y(a) + 4); }
  c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center';
  [['북동', 45], ['동', 90], ['남동', 135], ['남', 180], ['남서', 225], ['서', 270], ['북서', 315]].forEach(([n, a]) => c.fillText(n, X(a), H - 36));
  return {X, Y};
}
function sunPath(c, v, doy, place, color, bold) {
  c.strokeStyle = color; c.lineWidth = bold ? 4 : 2.5; c.beginPath(); let first = true, rise = null;
  for (let t = 3; t <= 22; t += 0.05) { const p = azAlt(t, doy, place); if (p.alt < 0) continue; if (!rise) rise = p; const x = v.X(p.az), y = v.Y(p.alt); if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y); }
  c.stroke();
  const n = azAlt(12 + (135 - place.lon) / 15, doy, place);
  c.fillStyle = color; c.beginPath(); c.arc(v.X(n.az), v.Y(n.alt), 6, 0, Math.PI * 2); c.fill();
  if (rise) { c.beginPath(); c.arc(v.X(rise.az), v.Y(0), 5, 0, Math.PI * 2); c.fill(); }
  return n;
}
function vtable(el, head, rows) { return el('table', {class: 'narrow'}, el('tr', {}, head.map((h) => el('th', {}, h))), rows.map((r) => el('tr', {}, r.map((x, i) => el(i ? 'td' : 'th', {}, x))))); }

export function sunSeason({el, button, mode, task = {}, memory = {}, onAction, onReady}) {
  const W = 720, H = 380;
  const label = {paths: '시간 창 달력, 진해의 남쪽 하늘 (모형 값)', months: '시간 창 달력, 매월 20일 12시 30분 (모형 값)', region: '척척 지역 설정판, 6월 21일 (모형 값)', sky: '하늘 보기 창, 진해 (모형 값)', graph: '매월 20일 계산값 그래프, 진해', plot: '투명 모눈 필름 그래프 (모형 값)', make: '가려진 날 카드 만들기 (모형 값)'}[mode] || '';
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: W * 2, height: H * 2, role: 'img', 'aria-label': ['graph', 'plot'].includes(mode) ? '월별 남중 고도와 낮의 길이 그래프' : '남쪽 하늘을 바라본 모습. 태양이 지나는 길이 보인다.'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const table = el('div', {class: 'sun-table'});
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, label), mode === 'make' ? '' : canvas, tray, status, table);
  const c = canvas.getContext('2d');
  const paths = memory.paths ??= [];
  const months = memory.months ??= {};
  const regions = memory.regions ??= [];
  const plot = memory.plot ??= {alt: {}, len: {}};
  let month = null, region = 'jinhae', skyMonth = 2, skyTime = 12.5, trail = memory.trail ??= [], play = 0, seen = null, alive = true;
  const series = task.series || 'alt', acted = new Set(), act = (a) => { if (task.type === 'action' && !acted.has(a)) { acted.add(a); onAction?.(a); } };
  let pm = MARCH_FIRST[0], pv = series === 'alt' ? 45 : 12 * 60;

  function graph({altPts, lenPts, pending} = {}) {
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#fbfdff'; c.fillRect(0, 0, W, H);
    const L = 64, Rr = W - 70, T0 = 40, B = H - 44;
    const gx = (i) => L + i * (Rr - L) / 11, ya = (a) => B - a / 90 * (B - T0), yl = (h) => B - (h - 8) / 7.2 * (B - T0);
    c.strokeStyle = '#d5deea'; c.lineWidth = 1; c.fillStyle = '#51637a'; c.font = FONT(12);
    MARCH_FIRST.forEach((m, i) => { c.beginPath(); c.moveTo(gx(i), T0); c.lineTo(gx(i), B); c.stroke(); c.textAlign = 'center'; c.fillText(`${m + 1}월`, gx(i), B + 18); });
    for (let k = 0; k <= 9; k++) { const y = B - k * (B - T0) / 9; c.beginPath(); c.moveTo(L, y); c.lineTo(Rr, y); c.stroke(); c.textAlign = 'right'; c.fillStyle = '#b4531a'; c.fillText(`${k * 10}°`, L - 6, y + 4); c.textAlign = 'left'; c.fillStyle = '#2f5fa8'; c.fillText((8 + k * 0.8).toFixed(1), Rr + 6, y + 4); }
    c.font = FONT(12, true); c.textAlign = 'left'; c.fillStyle = '#b4531a'; c.fillText('남중 고도(°)', 6, 20); c.textAlign = 'right'; c.fillStyle = '#2f5fa8'; c.fillText('낮의 길이(시간)', W - 6, 20);
    const draw = (pts, fy, col, dash, faded) => {
      const idx = MARCH_FIRST.map((m, i) => [i, pts[m]]).filter(([, v]) => v != null);
      c.globalAlpha = faded ? 0.35 : 1; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2.5; c.setLineDash(dash);
      if (idx.length === 12) { c.beginPath(); idx.forEach(([i, v], k) => (k ? c.lineTo(gx(i), fy(v)) : c.moveTo(gx(i), fy(v)))); c.stroke(); }
      c.setLineDash([]); idx.forEach(([i, v]) => { c.beginPath(); c.arc(gx(i), fy(v), 4.5, 0, Math.PI * 2); c.fill(); });
      c.globalAlpha = 1;
    };
    if (altPts) draw(altPts.v, ya, '#d9601a', [], altPts.faded);
    if (lenPts) draw(lenPts.v, yl, '#2f5fa8', [7, 5], lenPts.faded);
    if (pending) { const i = MARCH_FIRST.indexOf(pending.m), y = pending.s === 'alt' ? ya(pending.v) : yl(pending.v / 60); c.strokeStyle = '#233a5c'; c.lineWidth = 2; c.beginPath(); c.arc(gx(i), y, 8, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(gx(i) - 12, y); c.lineTo(gx(i) + 12, y); c.moveTo(gx(i), y - 12); c.lineTo(gx(i), y + 12); c.stroke(); }
    c.font = FONT(12, true); c.textAlign = 'left';
    if (altPts) { c.fillStyle = '#d9601a'; c.fillRect(L + 150, 14, 22, 3); c.fillText('남중 고도', L + 178, 20); }
    if (lenPts) { c.strokeStyle = '#2f5fa8'; c.setLineDash([7, 5]); c.beginPath(); c.moveTo(L + 270, 16); c.lineTo(L + 292, 16); c.stroke(); c.setLineDash([]); c.fillStyle = '#2f5fa8'; c.fillText('낮의 길이', L + 298, 20); }
    return {gx, ya, yl, L, Rr, T0, B};
  }
  const full = (key) => Object.fromEntries(Array.from({length: 12}, (_, m) => [m, key === 'alt' ? monthRecord(m).alt : monthRecord(m).len]));

  function paintTable() {
    if (mode === 'months') {
      const done = Object.keys(months).map(Number).sort((a, b) => a - b);
      table.replaceChildren(done.length ? vtable(el, ['날짜', '남중 고도', '낮의 길이'], done.map((m) => [`${m + 1}월 20일`, `${months[m].alt}°`, hm(months[m].len)])) : '');
    } else if (mode === 'region') {
      table.replaceChildren(regions.length ? vtable(el, ['지역', '6월 21일 남중 고도', '낮의 길이'], regions.map((k) => { const r = dayRecordOf(172, REGIONS[k]); return [REGIONS[k].name, `${r.alt}°`, hm(r.len)]; })) : '');
    } else if (mode === 'plot') {
      table.replaceChildren(vtable(el, ['날짜', series === 'alt' ? '남중 고도' : '낮의 길이', '점'], MARCH_FIRST.map((m) => [`${m + 1}월 20일`, series === 'alt' ? `${monthRecord(m).alt}°` : hm(monthRecord(m).len), plot[series][m] != null ? '찍음' : ''])));
    }
  }

  function render() {
    tray.replaceChildren();
    c.setTransform(2, 0, 0, 2, 0, 0);
    if (mode === 'graph') { graph({altPts: {v: full('alt')}, lenPts: {v: full('len')}}); return; }
    if (mode === 'plot') {
      const other = series === 'alt' ? null : {v: Object.keys(plot.alt).length === 12 ? plot.alt : full('alt'), faded: false};
      graph({altPts: series === 'alt' ? {v: plot.alt} : other, lenPts: series === 'len' ? {v: Object.fromEntries(Object.entries(plot.len).map(([k, v]) => [k, v / 60]))} : null, pending: Object.keys(plot[series]).length < 12 ? {m: pm, v: pv, s: series} : null});
      if (Object.keys(plot[series]).length >= 12) { status.textContent = series === 'alt' ? '열두 점을 모두 찍고 선으로 이었어요.' : '낮의 길이 그래프를 남중 고도 그래프 위에 겹쳤어요. 두 그래프의 모양을 비교해 보세요.'; return; }
      tray.append(el('div', {class: 'bench-seg'}, MARCH_FIRST.map((m) => { const b = button(`${m + 1}월`, () => { pm = m; render(); }, 'bench-opt' + (plot[series][m] != null ? ' tested' : '')); b.setAttribute('aria-pressed', String(pm === m)); return b; })));
      const steps = series === 'alt' ? [[-10, '-10°'], [-1, '-1°'], [1, '+1°'], [10, '+10°']] : [[-60, '-1시간'], [-10, '-10분'], [10, '+10분'], [60, '+1시간']];
      const lo = series === 'alt' ? 0 : 8 * 60, hi = series === 'alt' ? 90 : 15 * 60 + 12;
      tray.append(el('div', {class: 'bench-seg'}, steps.map(([d, n]) => button(n, () => { pv = Math.max(lo, Math.min(hi, pv + d)); render(); }, 'bench-opt')), el('b', {class: 'bench-wire-name'}, `${pm + 1}월: ${series === 'alt' ? pv + '°' : hm(pv / 60)}`)));
      tray.append(button('이 자리에 점 찍기', () => {
        const truth = series === 'alt' ? monthRecord(pm).alt : monthRecord(pm).len * 60, ok = Math.abs(pv - truth) <= (series === 'alt' ? 2 : 15);
        if (!ok) { status.textContent = `${pm + 1}월 20일 값과 점의 높이가 달라요. 표의 값을 다시 읽고 눈금을 세어 보세요.`; return; }
        plot[series][pm] = pv; const n = Object.keys(plot[series]).length;
        const next = MARCH_FIRST.find((m) => plot[series][m] == null); if (next != null) { pm = next; pv = series === 'alt' ? pv : pv; }
        status.textContent = `${n}개째 점을 찍었어요.${n >= 12 ? '' : ' 다음 달로 넘어가요.'}`;
        paintTable(); render(); if (n >= 12) { act('plotted'); onReady?.(); }
      }, 'mission-go'));
      return;
    }
    if (mode === 'make') return;
    const v = skyView(c, W, H);
    if (mode === 'paths') {
      const OFF = {mar: [-128, -14], jun: [-56, -16], sep: [14, 18], dec: [-56, -14]};
      for (const k of KEY_DAYS) if (paths.includes(k.id)) sunPath(c, v, k.doy, PLACE, k.color);
      for (const k of KEY_DAYS) if (paths.includes(k.id)) {
        const n = azAlt(12 + (135 - PLACE.lon) / 15, k.doy), txt = `${k.label} ${Math.round(n.alt)}°`, [dx, dy] = OFF[k.id], x = v.X(n.az) + dx, y = v.Y(n.alt) + dy;
        c.font = FONT(13, true); const w = c.measureText(txt).width + 12;
        c.fillStyle = 'rgba(255,255,255,.92)'; c.fillRect(x - 6, y - 14, w, 20); c.strokeStyle = k.color; c.lineWidth = 1.5; c.strokeRect(x - 6, y - 14, w, 20);
        c.fillStyle = k.color; c.textAlign = 'left'; c.fillText(txt, x, y + 1);
      }
      tray.append(...KEY_DAYS.map((k) => button(`${k.label} 태양길 저장`, () => { if (!paths.includes(k.id)) paths.push(k.id); status.textContent = `${k.label}의 태양길을 저장했어요. (${paths.length}/4)`; render(); if (paths.length >= 4) { act('saved'); onReady?.(); } }, 'bench-opt' + (paths.includes(k.id) ? ' tested' : ''))));
      return;
    }
    if (mode === 'region') {
      c.globalAlpha = 0.35; for (const k of regions) if (k !== region) sunPath(c, v, 172, REGIONS[k], '#7a4bc6'); c.globalAlpha = 1;
      const p = REGIONS[region], n = sunPath(c, v, 172, p, '#d9601a', true);
      c.fillStyle = '#233a5c'; c.font = FONT(16, true); c.textAlign = 'left'; c.fillText(`${p.name}, 6월 21일 남중 고도 ${Math.round(n.alt)}°`, 34, 28);
      if (regions.length > 1) { c.font = FONT(13); c.fillStyle = '#5b3a9a'; c.fillText('흐린 보라색 길: 앞서 본 지역', 34, 50); }
      tray.append(el('div', {class: 'bench-seg'}, Object.entries(REGIONS).map(([k, r]) => { const b = button(`지역: ${r.name}`, () => { region = k; if (!regions.includes(k)) regions.push(k); const d = dayRecordOf(172, r); status.textContent = `${r.name}: 남중 고도 ${d.alt}°, 낮의 길이 ${hm(d.len)}. (${regions.length}/3)`; paintTable(); render(); if (regions.length >= 3) { act('compared'); onReady?.(); } }, 'bench-opt' + (regions.includes(k) ? ' tested' : '')); b.setAttribute('aria-pressed', String(region === k)); return b; })));
      return;
    }
    if (mode === 'sky') {
      const doy = MONTH_DOY[skyMonth], p = azAlt(skyTime, doy);
      // 3월과 9월처럼 같은 자리에 찍히는 달은 이름표를 하나로 묶는다.
      const spots = [];
      for (const t of trail) {
        const x = v.X(t.az), y = v.Y(t.alt), near = spots.find((s) => Math.hypot(s.x - x, s.y - y) < 18);
        c.fillStyle = 'rgba(217,96,26,.45)'; c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
        if (near) near.m.push(t.m + 1); else spots.push({x, y, m: [t.m + 1]});
      }
      c.fillStyle = '#7a3a10'; c.font = FONT(11, true); c.textAlign = 'center';
      for (const s of spots) c.fillText(s.m.sort((a, b) => a - b).map((n) => `${n}월`).join(', '), s.x, s.y - 11);
      if (p.alt > -1) { c.fillStyle = '#ffcf3a'; c.beginPath(); c.arc(v.X(p.az), v.Y(Math.max(0, p.alt)), 15, 0, Math.PI * 2); c.fill(); }
      else { c.fillStyle = 'rgba(16,26,51,.55)'; c.fillRect(0, 0, W, H - 60); }
      c.fillStyle = p.alt > -1 ? '#233a5c' : '#fff'; c.font = FONT(16, true); c.textAlign = 'left';
      c.fillText(`${skyMonth + 1}월 20일 ${clockText(skyTime)}, ${p.alt >= -0.833 ? `태양 고도 ${Math.round(p.alt)}°` : '해가 보이지 않아요'}`, 20, 26);
      if (seen?.rise != null) c.fillText(`해가 보이기 시작한 시각 ${clockText(seen.rise)}${seen.set != null ? `, 보이지 않게 된 시각 ${clockText(seen.set)}` : ''}`, 20, 52);
      tray.append(el('div', {class: 'bench-seg'}, Array.from({length: 12}, (_, m) => { const b = button(`${m + 1}월`, () => { stopPlay(); skyMonth = m; skyTime = 12.5; seen = null; const q = azAlt(12.5, MONTH_DOY[m]); if (!trail.some((t) => t.m === m)) trail.push({m, az: q.az, alt: q.alt}); status.textContent = `${m + 1}월 20일 12시 30분의 태양이에요. 앞서 본 달의 자리가 흐리게 남아 있어요.`; render(); if (trail.length >= 4) act('compared'); }, 'bench-opt' + (trail.some((t) => t.m === m) ? ' tested' : '')); b.setAttribute('aria-pressed', String(skyMonth === m)); return b; })));
      tray.append(button(play ? '멈추기' : '시간 빠르게 돌리기 (새벽 3시부터)', () => { if (play) { stopPlay(); render(); return; } skyTime = 3; seen = {}; if (reduceMotion()) { play = -1; while (play) tick(); return; } play = setInterval(tick, 40); render(); }, 'mission-go'));
      return;
    }
    // months
    if (month !== null) {
      const r = monthRecord(month), n = azAlt(12.5, MONTH_DOY[month]);
      c.fillStyle = '#ffcf3a'; c.beginPath(); c.arc(v.X(n.az), v.Y(n.alt), 16, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#c0392b'; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(v.X(n.az), v.Y(0)); c.lineTo(v.X(n.az), v.Y(n.alt)); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,.95)'; c.fillRect(W - 318, 12, 306, 128); c.strokeStyle = '#8fa9cf'; c.lineWidth = 2; c.strokeRect(W - 318, 12, 306, 128);
      c.fillStyle = '#233a5c'; c.font = FONT(16, true); c.textAlign = 'left'; c.fillText(`천문 자료 창 (${month + 1}월 20일, 진해)`, W - 304, 38);
      c.font = FONT(16); c.fillText(`남중 고도: ${r.alt}°`, W - 304, 66); c.fillText(`해가 보이기 시작한 시각: ${clockText(r.rise)}`, W - 304, 94); c.fillText(`해가 보이지 않게 된 시각: ${clockText(r.set)}`, W - 304, 122);
    }
    tray.append(el('div', {class: 'bench-seg'}, Array.from({length: 12}, (_, m) => { const b = button(`${m + 1}월`, () => { month = m; status.textContent = `${m + 1}월 20일 12시 30분의 하늘에 왔어요. 천문 자료 창을 확인하고 표에 기록하세요.`; render(); }, 'bench-opt' + (months[m] ? ' tested' : '')); b.setAttribute('aria-pressed', String(month === m)); return b; })));
    if (month !== null) tray.append(button(`${month + 1}월 20일 값을 표에 기록하기`, () => { months[month] = monthRecord(month); const n = Object.keys(months).length; status.textContent = `${month + 1}월 20일: 남중 고도 ${months[month].alt}°, 낮의 길이 ${hm(months[month].len)}. (${n}/12)`; paintTable(); render(); if (n >= 12) { act('measured'); onReady?.(); } }, 'mission-go'));
  }
  function tick() {
    if (!alive) return stopPlay();
    const doy = MONTH_DOY[skyMonth], dt = 5 / 60, thr = -0.833, before = azAlt(skyTime, doy).alt; skyTime += dt; const after = azAlt(skyTime, doy).alt;
    const at = () => skyTime - dt + (thr - before) / (after - before) * dt;
    if (before < thr && after >= thr) seen.rise = at(); if (before >= thr && after < thr) seen.set = at();
    if (skyTime >= 23.9 || (seen.set != null && skyTime > seen.set + 0.5)) { stopPlay(); status.textContent = seen.rise != null && seen.set != null ? `해가 ${clockText(seen.rise)}에 보이기 시작해 ${clockText(seen.set)}에 보이지 않게 됐어요. 두 시각의 차이가 낮의 길이예요.` : '다시 돌려 보세요.'; }
    render();
  }
  function stopPlay() { if (play > 0) clearInterval(play); play = 0; }

  // 가려진 날 카드 만들기
  function maker() {
    const card = memory.card ??= {};
    tray.replaceChildren();
    const box = el('div', {class: 'm-card-make'});
    const monthSel = el('div', {class: 'bench-seg'}, Array.from({length: 12}, (_, m) => { const b = button(`${m + 1}월 20일`, () => { card.m = m; card.pick = null; card.why = null; maker(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(card.m === m)); return b; }));
    box.append(el('p', {class: 'm-how'}, '1. 가릴 날을 고르세요.'), monthSel);
    if (card.m != null) {
      const r = monthRecord(card.m), prev = monthRecord((card.m + 11) % 12), trend = r.len > prev.len ? '한 달 전보다 낮이 길어졌어요' : '한 달 전보다 낮이 짧아졌어요';
      const truth = r.alt, opts = [truth, truth + 20 <= 90 ? truth + 20 : truth - 30, truth - 20 >= 20 ? truth - 20 : truth + 30].sort((a, b) => a - b);
      box.append(el('div', {class: 'm-hidden-card'}, el('b', {}, '가려진 날 카드'), el('p', {}, `낮의 길이: ${hm(r.len)}`), el('p', {}, `단서: ${trend}`)));
      box.append(el('p', {class: 'm-how'}, '2. 정답 남중 고도를 고르세요. 카드를 받는 친구가 풀 답이에요.'), el('div', {class: 'bench-seg'}, opts.map((a) => { const b = button(`${a}°`, () => { card.pick = a; maker(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(card.pick === a)); return b; })));
      const whys = [['rule', `낮의 길이가 ${r.len >= 12 ? '길' : '짧을'}수록 남중 고도가 ${r.len >= 12 ? '높' : '낮'}아서, 그래프에서 그 달의 남중 고도를 읽었어요`], ['near', '태양이 가까울수록 낮이 길어서 골랐어요']];
      box.append(el('p', {class: 'm-how'}, '3. 해설 문장을 고르세요.'), el('div', {class: 'm-options'}, whys.map(([id, w]) => { const b = button(w, () => { card.why = id; maker(); }, 'm-opt'); b.setAttribute('aria-pressed', String(card.why === id)); return b; })));
      if (card.pick != null && card.why) box.append(button('먼저 풀어 보고 게시판에 올리기', () => {
        if (card.pick !== truth) { status.textContent = '먼저 풀어 보니 정답과 맞지 않아요. 겹친 그래프에서 그 달의 남중 고도를 다시 읽어 보세요.'; return; }
        if (card.why !== 'rule') { status.textContent = '해설이 자료로 확인한 내용과 달라요. 그래프에서 알 수 있는 관계로 해설을 고르세요.'; return; }
        card.done = true; status.textContent = `${card.m + 1}월 20일 카드를 친구 문제 게시판에 올렸어요.`; act('made'); onReady?.();
      }, 'mission-go'));
    }
    tray.append(box);
  }

  canvas.addEventListener('click', (e) => {
    if (mode !== 'plot' || Object.keys(plot[series]).length >= 12) return;
    const b = canvas.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * W, y = (e.clientY - b.top) / b.height * H, i = Math.round((x - 64) / ((W - 134) / 11)), f = (H - 44 - y) / (H - 84);
    if (i < 0 || i > 11) return;
    pm = MARCH_FIRST[i]; pv = series === 'alt' ? Math.round(Math.max(0, Math.min(90, f * 90))) : Math.max(480, Math.min(912, Math.round((8 + f * 7.2) * 6) * 10)); render();
  });
  if (mode === 'make') { maker(); status.textContent = memory.card?.done ? '만든 카드가 게시판에 올라가 있어요.' : '날짜를 고르면 낮의 길이와 단서가 채워져요.'; }
  else render();
  paintTable();
  if (!status.textContent) status.textContent = {paths: '네 날의 태양길을 하나씩 저장해 보세요.', months: '달을 고르면 그달 20일 12시 30분의 하늘로 가요. 열두 달을 모두 기록해요.', region: '척척의 지역 설정을 진해, 서울, 제주로 바꿔 보세요.', sky: '달을 바꾸며 12시 30분의 태양 자리를 비교하거나, 시간을 빠르게 돌려 보세요.', graph: '매월 20일의 계산값으로 그린 그래프예요. 가로축은 3월부터 시작해요.', plot: series === 'alt' ? '달을 고르고 표의 남중 고도만큼 점의 높이를 맞춘 뒤 점을 찍으세요.' : '다른 색으로 낮의 길이 점을 찍어 남중 고도 그래프 위에 겹치세요.'}[mode] || '';
  const ready = {paths: paths.length >= 4, months: Object.keys(months).length >= 12, region: regions.length >= 3, graph: true, sky: true, plot: Object.keys(plot[series]).length >= 12, make: !!memory.card?.done}[mode];
  if (ready) setTimeout(() => onReady?.(), 0);
  return {node, stop: () => { alive = false; stopPlay(); }};
}

// ---------------------------------------------------------------- 전등과 모래 (과학 24~25쪽)
// 온도 오름(℃) = 12 × sin(각) × (25 ÷ 거리)² × (켜는 시간 ÷ 5), 처음 온도 23℃. 비추는 모눈 칸 수 = 4 ÷ sin(각)을 반올림. 모두 모형 값.
// 가장 가까운 15 cm, 90°, 5분에도 56℃ 안팎이 되도록 계수를 정했다(예전 계수 36은 같은 조건에서 123℃가 나왔다).
export const sandRise = (ang, dist = 25, min = 5) => 12 * Math.sin(ang * R) * (25 / dist) ** 2 * (min / 5);
export const sandTemp = (ang, dist = 25, min = 5) => Math.round((23 + sandRise(ang, dist, min)) * 10) / 10;
export const sandCells = (ang) => Math.round(4 / Math.sin(ang * R));
export function paintLampAngle(c, {ang = 90, label = ''}) {
  c.fillStyle = '#2a2f3a'; c.fillRect(0, 0, 240, 180);
  const cx = 120, cy = 140, a = ang * R, L = 100, lx = cx - Math.cos(a) * L, ly = cy - Math.sin(a) * L, w = sandCells(ang) * 10;
  c.fillStyle = '#d8c28a'; c.fillRect(40, cy, 160, 10);
  c.fillStyle = 'rgba(255,220,90,.35)'; c.beginPath(); c.moveTo(lx, ly); c.lineTo(cx - w / 2, cy); c.lineTo(cx + w / 2, cy); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,220,90,.9)'; c.fillRect(cx - w / 2, cy - 2, w, 4);
  c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(lx, ly, 9, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#7fb6ff'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 26, Math.PI, Math.PI + a); c.stroke();
  c.fillStyle = '#e8ecf2'; c.font = FONT(12, true); c.textAlign = 'left'; c.fillText(label || `각 ${ang}°`, 8, 18);
}
export function lampLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const W = 720, H = 360;
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: W * 2, height: H * 2, role: 'img', 'aria-label': {cart: '태양광 운반 수레. 판을 기울여 햇빛이 판에 수직으로 들게 한다.', board: '햇빛을 받는 판지 세 장과 온도계', lab: '전등 두 개와 모래 접시. 전등과 모래가 이루는 각을 다르게 한다.'}[mode || 'lab']});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const sheet = el('div', {class: 'sun-table'});
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, {cart: '태양광 운반 수레 (모형 값)', board: '판지 기울기 실험 (모형 값)', lab: '비닐 온실 실험실 (모형 값)'}[mode || 'lab']), canvas, tray, status, sheet);
  const c = canvas.getContext('2d');
  const s = memory.lamp ??= {a: 90, b: 30, dist: 25, min: 5, step: 'set', read: {}, rec: null};
  const bd = memory.board ??= {waited: false};
  let alive = true, raf = 0, tilt = 10, x = 80, glow = 0;
  const SUN = 40;
  function dish(cx, ang, lit) {
    const cy = 240, L = 150, a = ang * R, lx = cx - Math.cos(a) * L, ly = cy - Math.sin(a) * L, cells = sandCells(ang);
    const CW = 18, st = -Math.floor(cells / 2);
    c.fillStyle = '#5b6472'; c.fillRect(cx - 140, cy + 24, 280, 4);
    if (lit) { c.fillStyle = 'rgba(255,220,90,.2)'; c.beginPath(); c.moveTo(lx, ly); c.lineTo(cx + st * CW, cy - 8); c.lineTo(cx + (st + cells) * CW, cy - 8); c.closePath(); c.fill(); }
    // 모눈 띠 (한 칸 18 px). 전등이 비추는 칸은 밝게 칠해 셀 수 있게 한다.
    for (let i = -7; i < 7; i++) { const on = lit && i >= st && i < st + cells, x = cx + i * CW; c.fillStyle = on ? '#ffe45c' : '#8c7446'; c.fillRect(x + 1, cy - 8, CW - 2, 16); if (on) { c.strokeStyle = '#fff8c8'; c.lineWidth = 1.5; c.strokeRect(x + 1.5, cy - 7.5, CW - 3, 15); } }
    c.strokeStyle = '#5a4a2a'; c.lineWidth = 1; c.strokeRect(cx - 7 * CW, cy - 9, 14 * CW, 18);
    c.strokeStyle = '#8e97a3'; c.lineWidth = 5; c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx - Math.cos(a) * 36, ly - Math.sin(a) * 36); c.stroke();
    c.fillStyle = lit ? '#fff3b0' : '#cfd8e6'; c.beginPath(); c.arc(lx, ly, 13, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#7fb6ff'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy - 6, 40, Math.PI, Math.PI + a); c.stroke();
    c.fillStyle = '#e8ecf2'; c.font = FONT(15, true); c.textAlign = 'center'; c.fillText(`전등과 모래가 이루는 각 ${ang}°`, cx, cy + 52);
  }
  function thermo(cx, side) {
    const v = s.read[side]; if (v == null) return;
    c.fillStyle = '#10151f'; c.fillRect(cx + 40, 60, 104, 40); c.strokeStyle = '#ff6b6b'; c.strokeRect(cx + 40, 60, 104, 40);
    c.fillStyle = '#ff8f8f'; c.font = FONT(20, true); c.textAlign = 'center'; c.fillText(`${v.toFixed(1)}℃`, cx + 92, 88);
  }
  function draw() {
    if (!alive) return;
    c.setTransform(2, 0, 0, 2, 0, 0);
    if (mode === 'cart') {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9fd3ff'); g.addColorStop(1, '#e6f4ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#c9a36a'; c.fillRect(0, 280, W, 80);
      const dx = Math.cos(SUN * R), dy = Math.sin(SUN * R);
      c.strokeStyle = 'rgba(240,170,20,.55)'; c.lineWidth = 2; for (let i = -2; i <= 9; i++) { c.beginPath(); c.moveTo(i * 80 + 600 - dx * 600, 250 - dy * 600 + 0); c.lineTo(i * 80 + 600 - dx * 60, 250 - dy * 60); c.stroke(); }
      const angle = SUN + tilt, speed = Math.max(0, Math.sin(Math.min(180, angle) * R));
      if (!reduceMotion()) { x += speed * speed * 2.2; if (x > W - 40) x = 60; }
      c.fillStyle = '#8a5a2b'; c.fillRect(x - 44, 244, 88, 22); c.fillStyle = '#39424e'; c.beginPath(); c.arc(x - 28, 270, 9, 0, Math.PI * 2); c.arc(x + 28, 270, 9, 0, Math.PI * 2); c.fill();
      // 판: 수레 왼쪽(태양 쪽)을 향해 tilt만큼 기울어진다
      c.save(); c.translate(x, 238); c.rotate(-tilt * R); c.fillStyle = '#1f3f7a'; c.fillRect(-40, -5, 80, 8); c.fillStyle = '#6fa0e8'; for (let i = -36; i < 36; i += 12) c.fillRect(i, -4, 10, 5); c.restore();
      c.strokeStyle = '#39424e'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 244); c.lineTo(x, 238); c.stroke();
      c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'left';
      c.fillText(`판의 기울기 ${tilt}°, 햇빛과 판이 이루는 각 ${Math.min(angle, 180 - angle)}°`, 16, 26);
      c.fillText('수레 빠르기', 16, 50); c.fillStyle = '#e1e8f2'; c.fillRect(110, 40, 200, 12); c.fillStyle = '#2f9a4f'; c.fillRect(110, 40, 200 * speed * speed, 12);
      raf = requestAnimationFrame(draw); return;
    }
    c.fillStyle = '#1f2633'; c.fillRect(0, 0, W, H);
    if (mode === 'board') {
      [10, 45, 90].forEach((ang, i) => {
        const cx = 130 + i * 230, cy = 230, a = (90 - ang) * R, len = 90;
        c.strokeStyle = '#c9a36a'; c.lineWidth = 8; c.beginPath(); c.moveTo(cx - Math.cos(a) * len / 2, cy + Math.sin(a) * len / 2); c.lineTo(cx + Math.cos(a) * len / 2, cy - Math.sin(a) * len / 2); c.stroke();
        c.strokeStyle = 'rgba(255,220,90,.55)'; c.lineWidth = 2; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(cx + k * 14 - 40, 40); c.lineTo(cx + k * 14 - 40, cy - 40); c.stroke(); }
        c.fillStyle = '#e8ecf2'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(`햇빛과 판지가 이루는 각 ${ang}°`, cx, cy + 70);
        if (bd.waited) c.fillText(`5분 뒤 ${sandTemp(ang)}℃, 모눈 ${sandCells(ang)}칸`, cx, cy + 94);
      });
      c.fillStyle = '#9fb0c8'; c.font = FONT(12); c.textAlign = 'left'; c.fillText('햇빛은 위에서 곧게 내려와요. 판지를 기울여 햇빛과 판지가 이루는 각을 바꿨어요.', 16, 22);
      raf = requestAnimationFrame(draw); return;
    }
    if (s.step === 'run') glow = Math.min(1, glow + (reduceMotion() ? 1 : 0.01));
    const lit = s.step === 'run' || s.step === 'after';
    dish(190, s.a, lit); dish(530, s.b, lit); thermo(190, 'a'); thermo(530, 'b');
    c.fillStyle = '#9fb0c8'; c.font = FONT(12); c.textAlign = 'left'; c.fillText(`전등과 모래 사이 거리 ${s.dist} cm, 켜는 시간 ${s.min}분, 전등 종류와 세기, 접시 크기, 모래의 양과 종류는 두 장치가 같아요.`, 16, 22);
    raf = requestAnimationFrame(draw);
  }
  function seg(name, list, get, set, fmt) { return el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, name), el('span', {class: 'bench-seg'}, list.map((v) => { const b = button(fmt(v), () => set(v), 'bench-opt'); b.setAttribute('aria-pressed', String(get() === v)); return b; }))); }
  function renderTray() {
    tray.replaceChildren(); sheet.replaceChildren();
    if (mode === 'cart') { tray.append(button('판 눕히기', () => { tilt = Math.max(0, tilt - 5); check(); }, 'bench-opt'), button('판 세우기', () => { tilt = Math.min(90, tilt + 5); check(); }, 'bench-opt')); return; }
    if (mode === 'board') { if (!bd.waited) tray.append(button('5분 동안 햇빛에 두기', () => { bd.waited = true; status.textContent = '5분이 지났어요. 판지마다 온도와 햇빛이 닿은 모눈 칸 수를 비교해 보세요.'; onAction?.('waited'); onReady?.(); renderTray(); }, 'mission-go')); return; }
    const locked = s.step !== 'set';
    if (!locked) {
      tray.append(seg('왼쪽 전등', [20, 30, 40, 50, 60, 70, 80, 90], () => s.a, (v) => { s.a = v; renderTray(); }, (v) => `${v}°`), seg('오른쪽 전등', [20, 30, 40, 50, 60, 70, 80, 90], () => s.b, (v) => { s.b = v; renderTray(); }, (v) => `${v}°`),
        seg('두 장치의 거리', [15, 20, 25, 30], () => s.dist, (v) => { s.dist = v; renderTray(); }, (v) => `${v} cm`), seg('켜는 시간', [3, 4, 5], () => s.min, (v) => { s.min = v; renderTray(); }, (v) => `${v}분`));
      const go = button('각을 정하고 처음 온도 재기', () => { s.step = 'before'; s.read = {a: 23, b: 23}; status.textContent = '적외선 온도계로 두 접시의 처음 온도를 쟀어요. 아래 기록지에 옮겨 적으세요.'; renderTray(); }, 'mission-go');
      go.disabled = Math.abs(s.a - s.b) < 30;
      tray.append(go);
      if (go.disabled) status.textContent = '두 각의 차이가 30° 이상이어야 결과를 비교하기 쉬워요. 하나는 크게, 하나는 작게 정하세요.';
    }
    if (s.step === 'before') tray.append(button(`동시에 같은 밝기로 켜기 (${s.min}분)`, () => { s.step = 'run'; glow = 0; s.read = {}; status.textContent = `전등을 켰어요. 전등이 비추는 모눈 칸 수를 비교해 보세요. ${s.min}분이 지나면 온도를 재요.`; renderTray(); }, 'mission-go'));
    if (s.step === 'run') tray.append(button(`${s.min}분 뒤 온도 재기`, () => { s.step = 'after'; s.read = {a: sandTemp(s.a, s.dist, s.min), b: sandTemp(s.b, s.dist, s.min)}; status.textContent = '적외선 온도계로 두 접시의 온도를 쟀어요. 기록지를 채우세요.'; renderTray(); }, 'mission-go'));
    if (s.step === 'after' || s.step === 'before' || s.step === 'run') tray.append(button('처음부터 다시 하기', () => { s.step = 'set'; s.read = {}; s.rec = null; s.draft = {}; renderTray(); }, 'bench-opt'));
    // 기록지는 처음 온도를 잰 때부터 보여 준다. 적은 값은 단계가 바뀌어 다시 그려도 남긴다.
    if (s.step === 'before' || s.step === 'run' || s.step === 'after' || s.rec) {
      s.draft ??= {};
      const f = {}, inp = (k, lab) => (f[k] = el('input', {type: 'text', inputmode: 'decimal', maxlength: '6', class: 'm-number', 'aria-label': lab, oninput: (e) => { s.draft[k] = e.target.value; }}));
      const rows = [['왼쪽 (' + s.a + '°)', 'a'], ['오른쪽 (' + s.b + '°)', 'b']];
      sheet.append(el('table', {class: 'narrow'}, el('tr', {}, el('th', {}, '장치'), el('th', {}, '처음 온도(℃)'), el('th', {}, '나중 온도(℃)'), el('th', {}, '비추는 칸 수')),
        rows.map(([n, k]) => el('tr', {}, el('th', {}, n), el('td', {}, inp(k + '0', n + ' 처음 온도')), el('td', {}, inp(k + '1', n + ' 나중 온도')), el('td', {}, inp(k + 'c', n + ' 비추는 칸 수'))))));
      for (const [k, v] of Object.entries({...s.draft, ...(s.rec || {})})) if (f[k]) f[k].value = v;
      if (s.step === 'after' || s.rec) sheet.append(button('기록지 확인', () => {
        const want = {a0: 23, b0: 23, a1: sandTemp(s.a, s.dist, s.min), b1: sandTemp(s.b, s.dist, s.min), ac: sandCells(s.a), bc: sandCells(s.b)};
        const bad = Object.keys(want).filter((k) => { const v = parseFloat(f[k].value.replace(',', '.')); f[k].classList.toggle('recheck', !(Math.abs(v - want[k]) <= (k.endsWith('c') ? 0 : 0.5))); return !(Math.abs(v - want[k]) <= (k.endsWith('c') ? 0 : 0.5)); });
        if (bad.length) { status.textContent = '표시한 칸을 다시 확인하세요. 온도는 온도계 숫자를, 칸 수는 노랗게 밝은 모눈을 세어요.'; return; }
        s.rec = Object.fromEntries(Object.keys(want).map((k) => [k, f[k].value])); status.textContent = '기록지를 모두 채웠어요.'; onAction?.('recorded'); onReady?.();
      }, 'mission-go'));
    }
  }
  function check() { const angle = SUN + tilt, off = Math.abs(90 - angle); status.textContent = off <= 5 ? '햇빛이 판에 수직으로 들어요. 수레가 가장 빨리 움직여요.' : '판의 기울기를 바꿔 수레가 가장 빨리 움직이는 때를 찾아보세요.'; if (off <= 5) { onAction?.('fast'); onReady?.(); } }
  renderTray();
  if (!status.textContent) status.textContent = {cart: '판의 기울기를 바꿔 수레가 가장 빨리 움직이는 때를 찾아보세요.', board: '판지 세 장을 햇빛에 5분 동안 두어 보세요.'}[mode] || (s.rec ? '기록지를 이미 채웠어요.' : '두 전등과 모래가 이루는 각을 정하세요.');
  if ((mode === 'board' && bd.waited) || (!mode || mode === 'lab') && s.rec) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 공전 모형 (과학 26~27쪽)
// 전등(태양) 둘레 네 위치 (가)~(라). 공전은 시계 반대 방향이고 자전축은 (나) 쪽에서 북극이 전등을 향하게 기울어져 있다.
// 자전축이 수직이면 네 위치의 그림자 길이가 같고, 23.5° 기울이면 달라진다. 모형 위도 37.5°, 막대는 춘분 위치 그림자가 1.2 cm가 되게 정했다(모형 값).
export const ORBIT_POS = [{id: 'ga', label: '(가)', ang: 270, dec: 0}, {id: 'na', label: '(나)', ang: 180, dec: 1}, {id: 'da', label: '(다)', ang: 90, dec: 0}, {id: 'ra', label: '(라)', ang: 0, dec: -1}];
const STICK = 1.2 * Math.tan(52.5 * R);
export function orbitShadow(pos, tilt) { const k = ORBIT_POS.find((p) => p.id === pos).dec, alt = 90 - 37.5 + k * tilt; return {len: Math.round(STICK / Math.tan(Math.min(alt, 180 - alt) * R) * 10) / 10, cells: Math.round(4 / Math.sin(alt * R)), alt}; }
export function paintGlobe(c, {face = 0, label = ''}) {
  c.fillStyle = '#141a26'; c.fillRect(0, 0, 240, 180);
  c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(30, 90, 16, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,220,90,.45)'; c.lineWidth = 2; for (let y = 60; y <= 120; y += 15) { c.beginPath(); c.moveTo(50, y); c.lineTo(120, y); c.stroke(); }
  c.fillStyle = '#3f7d5a'; c.beginPath(); c.arc(170, 90, 40, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(170, 90, 40, -Math.PI / 2, Math.PI / 2); c.fill();
  const a = (180 + face) * R, sx = 170 + Math.cos(a) * 40, sy = 90 + Math.sin(a) * 40;
  c.strokeStyle = '#ff6b6b'; c.lineWidth = 4; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * 16, sy + Math.sin(a) * 16); c.stroke();
  c.fillStyle = '#e8ecf2'; c.font = FONT(12, true); c.textAlign = 'left'; if (label) c.fillText(label, 8, 18);
}
export function paintOrbitPanel(c) {
  c.fillStyle = '#1b2230'; c.fillRect(0, 0, 240, 180);
  c.strokeStyle = '#4c6a92'; c.lineWidth = 2; c.strokeRect(6, 6, 228, 168);
  c.fillStyle = '#3f7d5a'; c.beginPath(); c.arc(46, 70, 22, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(46, 38); c.lineTo(46, 102); c.stroke();
  c.fillStyle = '#9fb0c8'; c.font = FONT(11, true); c.textAlign = 'center'; c.fillText('자전축', 46, 122);
  ['(가)', '(나)', '(다)', '(라)'].forEach((n, i) => { const x = 100 + i * 34; c.fillStyle = '#0f141d'; c.fillRect(x - 12, 40, 24, 80); c.fillStyle = '#7fd18b'; c.fillRect(x - 8, 88, 16, 28); c.fillStyle = '#e8ecf2'; c.fillText(n, x, 134); });
  c.fillStyle = '#9fb0c8'; c.fillText('네 위치의 그림자 길이', 150, 30);
  c.fillText('공전 위치', 150, 154);
}
export function orbitModel({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const W = 720, H = 420;
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: W * 2, height: H * 2, role: 'img', 'aria-label': '공전 모형. 전등 둘레 네 위치에서 지구본의 자전축과 측정기 그림자를 본다.'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const sheet = el('div', {class: 'sun-table'});
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, '관측소 공전 모형실, 전등과 지구본 사이 30 cm (모형 값)'), canvas, tray, status, sheet);
  const c = canvas.getContext('2d');
  const rec = memory.orbit ??= {A: {}, B: {}};
  const lap = memory.lap ??= {path: [], free: false};
  const slide = memory.slide ??= [];
  let tilt = mode === 'slider' ? 23.5 : 23.5, tilted = true, lock = true, pos = mode === 'orbit' ? (lap.path.at(-1) || 'ga') : 'ga', alive = true, raf = 0, ang = ORBIT_POS.find((p) => p.id === pos).ang, target = ang;
  if (mode === 'measure') tilted = false;
  const curTilt = () => (mode === 'slider' ? tilt : tilted ? 23.5 : 0);
  function globe(x, y, r, axisAng, hi, labelTxt, sun) {
    c.fillStyle = hi ? '#6fa7e8' : '#3f7d5a'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    if (sun) { const a = Math.atan2(sun[1] - y, sun[0] - x); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(x, y, r, a + Math.PI / 2, a + Math.PI * 3 / 2); c.fill(); c.strokeStyle = '#ff6b6b'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.lineTo(x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12)); c.stroke(); }
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - Math.sin(axisAng) * (r + 10), y + Math.cos(axisAng) * (r + 10)); c.lineTo(x + Math.sin(axisAng) * (r + 10), y - Math.cos(axisAng) * (r + 10)); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x + Math.sin(axisAng) * (r + 10), y - Math.cos(axisAng) * (r + 10), 3, 0, Math.PI * 2); c.fill();
    if (labelTxt) { c.fillStyle = '#e8ecf2'; c.font = FONT(13, true); c.textAlign = 'center'; c.fillText(labelTxt, x, y - r - 18); }
  }
  function draw() {
    if (!alive) return;
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.fillStyle = '#141a26'; c.fillRect(0, 0, W, H);
    const cx = mode === 'orbit' ? 360 : 235, cy = 215, rx = mode === 'orbit' ? 250 : 165, ry = 130;
    if (Math.abs(target - ang) > 0.5) ang += Math.sign(target - ang) * Math.min(Math.abs(target - ang), reduceMotion() ? 90 : 3); else ang = target;
    c.strokeStyle = 'rgba(200,210,230,.35)'; c.setLineDash([6, 6]); c.lineWidth = 1.5; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    // 공전 방향 화살표 (시계 반대 방향)
    c.strokeStyle = 'rgba(200,210,230,.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, cy, rx + 16, ry + 12, 0, 1.2 * Math.PI, 1.4 * Math.PI); c.stroke();
    const ax = cx + Math.cos(1.2 * Math.PI) * (rx + 16), ay = cy + Math.sin(1.2 * Math.PI) * (ry + 12); c.fillStyle = 'rgba(200,210,230,.8)'; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 4, ay - 10); c.lineTo(ax + 10, ay + 2); c.fill();
    const g = c.createRadialGradient(cx, cy, 4, cx, cy, 70); g.addColorStop(0, '#fff6c8'); g.addColorStop(1, 'rgba(255,220,90,0)'); c.fillStyle = g; c.fillRect(cx - 70, cy - 70, 140, 140);
    c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(cx, cy, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8ecf2'; c.font = FONT(12); c.textAlign = 'center'; c.fillText('전등(태양)', cx, cy + 36);
    const t = curTilt() * R;
    for (const p of ORBIT_POS) { const a = p.ang * R; c.fillStyle = 'rgba(232,236,242,.85)'; c.font = FONT(15, true); c.textAlign = 'center'; c.fillText(p.label, cx + Math.cos(a) * (rx + 40), cy + Math.sin(a) * (ry + 34) + 5); }
    if (mode === 'measure' || mode === 'slider') for (const p of ORBIT_POS) { const a = p.ang * R; globe(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 15, t, p.id === pos); }
    else { const a = ang * R; globe(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 22, lock ? t : -Math.cos(a) * t, true, null, [cx, cy]); }
    c.fillStyle = '#e8ecf2'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(`자전축: ${curTilt() ? `${curTilt()}° 기울임` : '수직'}${mode === 'orbit' ? `, 방향 고정 ${lock ? '켬' : '끔'}` : ''}`, 16, 26);
    if (mode !== 'orbit') zoom(mode === 'slider' ? 'na' : pos, 470, 50, mode === 'slider' ? '(나) 확대 창' : null);
    if (mode === 'slider') zoom('ra', 470, 235, '(라) 확대 창');
    raf = requestAnimationFrame(draw);
  }
  // 확대 창: 측정기 막대와 그림자, 자, 빛 다발이 비추는 모눈
  function zoom(p, x0, y0, title) {
    const r = orbitShadow(p, curTilt()), h = mode === 'slider' ? 170 : 330, w = 236;
    c.fillStyle = '#eef6ff'; c.fillRect(x0, y0, w, h); c.strokeStyle = '#8fa9cf'; c.strokeRect(x0, y0, w, h);
    c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'left'; c.fillText(title || `${ORBIT_POS.find((q) => q.id === p).label} 확대 창`, x0 + 10, y0 + 20);
    c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
    const base = y0 + (mode === 'slider' ? 120 : 180), sx = x0 + 14, cm = mode === 'slider' ? 26 : 60, stick = STICK * cm, len = r.len * cm;
    c.fillStyle = '#9ccf7a'; c.fillRect(x0 + 1, base, w - 2, 12);
    c.fillStyle = 'rgba(40,40,40,.5)'; c.fillRect(sx, base - 4, len, 5);
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 5; c.beginPath(); c.moveTo(sx, base); c.lineTo(sx, base - stick); c.stroke();
    const dx = Math.cos(r.alt * R), dy = Math.sin(r.alt * R); c.strokeStyle = 'rgba(240,170,20,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + len - dx * 140, base - dy * 140); c.lineTo(sx + len, base); c.stroke();
    if (mode === 'slider') { c.restore(); c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'left'; c.fillText(`그림자 ${r.len} cm`, x0 + 130, y0 + 20); return; }
    // 자 (mm 눈금)
    c.fillStyle = '#fffbe8'; c.fillRect(sx - 6, base + 12, 3.5 * cm + 12, 30); c.fillStyle = '#39424e'; c.font = FONT(13, true); c.textAlign = 'center';
    for (let mm = 0; mm <= 35; mm++) { const xx = sx + mm * cm / 10; c.fillRect(xx, base + 12, 1, mm % 10 === 0 ? 13 : mm % 5 === 0 ? 9 : 5); if (mm % 10 === 0) c.fillText(`${mm / 10}`, xx, base + 38); }
    // 빛 다발이 비추는 모눈 (한 칸 16 px, 빛 다발 폭 4칸)
    const gy = y0 + 270; c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'left'; c.fillText('빛 다발이 비추는 모눈', x0 + 10, gy - 10);
    for (let i = 0; i < 12; i++) { const on = i < r.cells; c.fillStyle = on ? '#ffd35a' : '#fff'; c.fillRect(x0 + 22 + i * 16, gy, 14, 14); c.strokeStyle = '#8fa9cf'; c.strokeRect(x0 + 22 + i * 16, gy, 14, 14); }
    c.fillStyle = '#51637a'; c.font = FONT(12); c.textAlign = 'right'; c.fillText('단위: cm', x0 + w - 8, base + 58);
    c.restore();
  }
  function paintSheet() {
    if (mode !== 'measure') { sheet.replaceChildren(); return; }
    const row = (k, name) => el('tr', {}, el('th', {}, name), ORBIT_POS.map((p) => el('td', {}, rec[k][p.id] ? `${rec[k][p.id].len} cm, ${rec[k][p.id].cells}칸` : '')));
    sheet.replaceChildren(el('table', {class: 'narrow'}, el('tr', {}, el('th', {}, '조건'), ORBIT_POS.map((p) => el('th', {}, p.label))), row('A', '조건 A 수직'), row('B', '조건 B 23.5°')));
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'orbit') {
      const i = ORBIT_POS.findIndex((p) => p.id === pos);
      const lockB = button(`자전축 방향 고정 ${lock ? '끄기' : '켜기'}`, () => { lock = !lock; if (!lock) lap.free = true; status.textContent = lock ? '자전축이 늘 같은 방향을 향한 채 공전해요.' : '방향 고정을 껐어요. 공전하면서 자전축이 가리키는 방향이 바뀌어요. 한 칸 돌려 비교해 보세요.'; renderTray(); }, 'bench-opt');
      tray.append(button('시계 반대 방향으로 한 칸 공전', () => {
        const next = ORBIT_POS[(i + 1) % 4]; pos = next.id; target -= 90;
        if (lock) { if (lap.path.at(-1) !== pos) lap.path.push(pos); } else lap.freeMoved = true;
        const n = new Set(lap.path).size;
        status.textContent = lock ? `${next.label} 위치에 왔어요. 측정기가 전등을 향하는 쪽에 있어요.${n >= 4 ? ' 한 바퀴를 모두 돌았어요.' : ''}` : '방향 고정을 끄고 돌리니 자전축이 다른 방향을 가리켜요. 실제 지구의 자전축은 늘 같은 방향을 향해요.';
        renderTray(); if (new Set(lap.path).size >= 4 && lap.path.length >= 4 && lap.freeMoved) { onAction?.('orbited'); onReady?.(); }
      }, 'mission-go'), button('시계 방향으로 끌기', () => { status.textContent = '이 방향으로는 움직이지 않아요. 지구는 서쪽에서 동쪽으로, 시계 반대 방향으로 공전해요.'; }, 'bench-opt'), lockB);
      return;
    }
    if (mode === 'slider') {
      tray.append(button('기울기 줄이기', () => setTilt(tilt - 5), 'bench-opt'), button('기울기 늘리기', () => setTilt(tilt + 5), 'bench-opt'), el('b', {class: 'bench-wire-name'}, `자전축 기울기 ${tilt}°`));
      return;
    }
    tray.append(el('div', {class: 'bench-seg'}, [['조건 A 수직', false], ['조건 B 23.5° 기울임', true]].map(([n, v]) => { const b = button(n, () => { tilted = v; renderTray(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(tilted === v)); return b; })),
      el('div', {class: 'bench-seg'}, ORBIT_POS.map((p) => { const b = button(`${p.label}로 옮기기`, () => { pos = p.id; renderTray(); }, 'bench-opt' + (rec[tilted ? 'B' : 'A'][p.id] ? ' tested' : '')); b.setAttribute('aria-pressed', String(pos === p.id)); return b; })));
    const lenI = el('input', {type: 'text', inputmode: 'decimal', maxlength: '5', class: 'm-number', 'aria-label': '그림자 길이(cm)'}), cellI = el('input', {type: 'text', inputmode: 'numeric', maxlength: '3', class: 'm-number', 'aria-label': '모눈 칸 수'});
    tray.append(el('div', {class: 'm-number-row'}, el('span', {}, '그림자 길이'), lenI, el('b', {}, 'cm'), el('span', {}, '모눈'), cellI, el('b', {}, '칸')),
      button('기록하기', () => {
        const r = orbitShadow(pos, tilted ? 23.5 : 0), L = parseFloat(lenI.value.replace(',', '.')), C = parseInt(cellI.value, 10);
        const okL = Math.abs(L - r.len) <= 0.2, okC = C === r.cells; lenI.classList.toggle('recheck', !okL); cellI.classList.toggle('recheck', !okC);
        if (!okL || !okC) { status.textContent = !okL ? '그림자 끝이 자의 어느 눈금에 닿는지 다시 읽어 보세요. 작은 눈금 한 칸은 0.1 cm예요.' : '노랗게 밝은 모눈 칸을 다시 세어 보세요.'; return; }
        const k = tilted ? 'B' : 'A'; rec[k][pos] = {len: r.len, cells: r.cells}; const n = Object.keys(rec.A).length + Object.keys(rec.B).length;
        status.textContent = `${tilted ? '조건 B' : '조건 A'} ${ORBIT_POS.find((p) => p.id === pos).label}: 그림자 ${r.len} cm, 모눈 ${r.cells}칸. (${n}/8)`; paintSheet(); renderTray();
        if (n >= 8) { onAction?.('recorded'); onReady?.(); }
      }, 'mission-go'));
  }
  function setTilt(v) { tilt = Math.max(0, Math.min(40, v)); if (!slide.includes(tilt)) slide.push(tilt); const a = orbitShadow('na', tilt), b = orbitShadow('ra', tilt); status.textContent = `기울기 ${tilt}°: (나) ${a.len} cm, (라) ${b.len} cm, 차이 ${Math.round((b.len - a.len) * 10) / 10} cm`; renderTray(); if (slide.length >= 3 && slide.some((x) => x > 23.5)) { onAction?.('explored'); onReady?.(); } }
  renderTray(); paintSheet();
  status.textContent = {orbit: '측정기가 늘 전등을 향하게 하고 시계 반대 방향으로 한 바퀴 공전시키세요. 방향 고정을 끄고도 한 번 돌려 보세요.', measure: '조건과 위치를 고르고 확대 창의 자로 그림자 길이를 읽어 기록하세요. 모눈 칸 수도 세어요.', slider: '자전축 기울기를 바꿔 가며 (나)와 (라)의 그림자 길이를 비교해 보세요.'}[mode] || '';
  const ready = {orbit: new Set(lap.path).size >= 4 && lap.freeMoved, measure: Object.keys(rec.A).length + Object.keys(rec.B).length >= 8, slider: slide.length >= 3 && slide.some((x) => x > 23.5)}[mode];
  if (ready) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 반례 카드 모형 (과학 28~29쪽, 실험관찰 15쪽 해 보기 더)
// 조건 C: 공전을 끈 채 (나)에 머무름. 남반구 측정 위치는 뉴질랜드(모형 남위 35°). 조건 D: 자전축은 수직이고 거리만 크게 바뀌는 가상 지구.
// 실제 거리는 7월 약 1억 5,210만 km, 1월 약 1억 4,710만 km. 가상 지구의 거리는 차이를 보이려고 정한 모형 값이다.
const KR = {name: '우리나라', lat: 37.5}, NZ = {name: '뉴질랜드', lat: -35};
const KOF = {ga: 0, na: 1, da: 0, ra: -1};
export function proofShadow(lat, pos, tilt = 23.5) {
  const alt = 90 - Math.abs(lat) + Math.sign(lat) * KOF[pos] * tilt, a = Math.min(alt, 180 - alt);
  return {alt, len: Math.round(STICK / Math.tan(Math.max(1, a) * R) * 10) / 10};
}
const REAL_KM = {ga: '약 1억 4,960만 km', na: '약 1억 5,210만 km', da: '약 1억 4,960만 km', ra: '약 1억 4,710만 km'};
const FAKE_KM = {ga: '1억 5,000만 km', na: '1억 7,000만 km', da: '1억 5,000만 km', ra: '1억 3,000만 km'};
function zoomBox(c, {x0, y0, w, h, title, len, alt, cm = 60, ruler = true, note = ''}) {
  c.save(); c.fillStyle = '#eef6ff'; c.fillRect(x0, y0, w, h); c.strokeStyle = '#8fa9cf'; c.lineWidth = 1.5; c.strokeRect(x0, y0, w, h);
  c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'left'; c.fillText(title, x0 + 10, y0 + 20);
  const base = y0 + h - (ruler ? 62 : 24), sx = x0 + 14, stick = STICK * cm, L = len * cm;
  c.fillStyle = '#9ccf7a'; c.fillRect(x0 + 1, base, w - 2, 10);
  c.fillStyle = 'rgba(40,40,40,.5)'; c.fillRect(sx, base - 4, L, 5);
  c.strokeStyle = '#8a5a2b'; c.lineWidth = 5; c.beginPath(); c.moveTo(sx, base); c.lineTo(sx, base - stick); c.stroke();
  const dx = Math.cos(alt * R), dy = Math.sin(alt * R); c.strokeStyle = 'rgba(240,170,20,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + L - dx * 160, base - dy * 160); c.lineTo(sx + L, base); c.stroke();
  if (ruler) {
    c.fillStyle = '#fffbe8'; c.fillRect(sx - 6, base + 10, 3.5 * cm + 12, 30); c.fillStyle = '#39424e'; c.font = FONT(13, true); c.textAlign = 'center';
    for (let mm = 0; mm <= 35; mm++) { const xx = sx + mm * cm / 10; c.fillRect(xx, base + 10, 1, mm % 10 === 0 ? 13 : mm % 5 === 0 ? 9 : 5); if (mm % 10 === 0) c.fillText(`${mm / 10}`, xx, base + 36); }
    c.textAlign = 'right'; c.font = FONT(12); c.fillStyle = '#51637a'; c.fillText('단위: cm', x0 + w - 8, base + 54);
  }
  if (note) { c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'right'; c.fillText(note, x0 + w - 8, y0 + 20); }
  c.restore();
}
export function seasonProof({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const W = 720, H = 420;
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: W * 2, height: H * 2, role: 'img', 'aria-label': '공전 모형과 확대 창. 측정기의 그림자를 본다.'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const sheet = el('div', {class: 'sun-table'});
  const owner = {still: '조건 C, 공전을 끈 지구본 (모형 값)', south: '측정기를 뉴질랜드로 옮긴 공전 모형 (모형 값)', distance: '거리 모드 (모형 값)', day: '하루 돌리기 (모형 값)', lat: '위도 비교, 춘분 무렵 12시 (모형 값)'}[mode];
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, owner), canvas, tray, status, sheet);
  const c = canvas.getContext('2d');
  const st = memory.proof ??= {};
  const still = st.still ??= [], south = st.south ??= {}, seen = st.seen ??= [], spun = st.spun ??= [], lats = st.lats ??= [];
  let pos = mode === 'still' ? 'na' : 'ga', world = 'fake', spin = 0, spinning = false, alive = true, raf = 0, latPick = 'kr';
  const cx = 235, cy = 215, rx = 165, ry = 130;
  const P = (id) => ORBIT_POS.find((p) => p.id === id);
  function orbit(tilt, lampOff = 0) {
    const lx = cx + lampOff;
    c.strokeStyle = 'rgba(200,210,230,.35)'; c.setLineDash([6, 6]); c.lineWidth = 1.5; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    const g = c.createRadialGradient(lx, cy, 4, lx, cy, 70); g.addColorStop(0, '#fff6c8'); g.addColorStop(1, 'rgba(255,220,90,0)'); c.fillStyle = g; c.fillRect(lx - 70, cy - 70, 140, 140);
    c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(lx, cy, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8ecf2'; c.font = FONT(12); c.textAlign = 'center'; c.fillText('전등(태양)', lx, cy + 36);
    for (const p of ORBIT_POS) {
      const a = p.ang * R, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, on = p.id === pos, t = tilt * R;
      if (mode === 'still' && p.id !== 'na') { c.globalAlpha = 0.25; }
      c.fillStyle = on ? '#6fa7e8' : '#3f7d5a'; c.beginPath(); c.arc(x, y, on ? 18 : 14, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - Math.sin(t) * 26, y + Math.cos(t) * 26); c.lineTo(x + Math.sin(t) * 26, y - Math.cos(t) * 26); c.stroke();
      c.globalAlpha = 1; c.fillStyle = 'rgba(232,236,242,.85)'; c.font = FONT(15, true); c.textAlign = 'center'; c.fillText(p.label, cx + Math.cos(a) * (rx + 40), cy + Math.sin(a) * (ry + 34) + 5);
    }
  }
  function draw() {
    if (!alive) return;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#141a26'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#e8ecf2'; c.font = FONT(15, true); c.textAlign = 'left';
    if (mode === 'still') {
      orbit(23.5); head(); c.fillText('공전 꺼짐, 자전축 23.5° 기울임', 16, 26);
      const r = proofShadow(KR.lat, 'na'); zoomBox(c, {x0: 470, y0: 50, w: 236, h: 330, title: '(나) 확대 창', len: r.len, alt: r.alt});
    } else if (mode === 'south') {
      orbit(23.5); head(); c.fillText('자전축 23.5° 기울임, 측정기: 뉴질랜드', 16, 26);
      const r = proofShadow(NZ.lat, pos); zoomBox(c, {x0: 470, y0: 50, w: 236, h: 330, title: `${P(pos).label} 뉴질랜드 확대 창`, len: r.len, alt: r.alt});
    } else if (mode === 'distance') {
      const fake = world === 'fake', tilt = fake ? 0 : 23.5;
      orbit(tilt, fake ? 55 : 0); head(); c.fillText(fake ? '가상 지구(조건 D): 자전축 수직, 거리만 크게 달라져요' : '실제 지구: 자전축 23.5° 기울임', 16, 26);
      const km = fake ? FAKE_KM[pos] : REAL_KM[pos]; c.font = FONT(14, true); c.fillText(`${P(pos).label} 태양과의 거리 ${km}${fake ? ' (가상)' : ''}`, 16, 404);
      const k = proofShadow(KR.lat, pos, tilt), n = proofShadow(NZ.lat, pos, tilt), near = fake && pos === 'ra', far = fake && pos === 'na';
      const warm = (s) => (fake ? (near ? '거리로 정하면 여름' : far ? '거리로 정하면 겨울' : '거리로 정하면 봄이나 가을') : s.alt >= 70 ? '남중 고도가 높아요' : s.alt <= 35 ? '남중 고도가 낮아요' : '남중 고도가 중간이에요');
      zoomBox(c, {x0: 470, y0: 40, w: 236, h: 170, title: '우리나라', len: k.len, alt: k.alt, cm: 30, ruler: false, note: `그림자 ${k.len} cm`});
      zoomBox(c, {x0: 470, y0: 222, w: 236, h: 170, title: '뉴질랜드', len: n.len, alt: n.alt, cm: 30, ruler: false, note: `그림자 ${n.len} cm`});
      c.fillStyle = '#b4531a'; c.font = FONT(13, true); c.textAlign = 'left'; c.fillText(warm(k), 480, 84); c.fillText(warm(n), 480, 266);
    } else if (mode === 'day') {
      orbit(23.5); head(); c.fillText(`${P(pos).label}에서 하루 돌리기`, 16, 26);
      const gx = 590, gy = 215, gr = 100, sunDir = Math.atan2(cy - (cy + Math.sin(P(pos).ang * R) * ry), cx - (cx + Math.cos(P(pos).ang * R) * rx));
      c.fillStyle = '#2f6d4a'; c.beginPath(); c.arc(gx, gy, gr, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(gx, gy, gr, sunDir + Math.PI / 2, sunDir + Math.PI * 3 / 2); c.fill();
      c.strokeStyle = 'rgba(255,220,90,.7)'; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { const bx = gx + Math.cos(sunDir) * 150 - Math.sin(sunDir) * i * 30, by = gy + Math.sin(sunDir) * 150 + Math.cos(sunDir) * i * 30; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - Math.cos(sunDir) * 40, by - Math.sin(sunDir) * 40); c.stroke(); }
      // 북극 위에서 보면 지구는 시계 반대 방향(서에서 동)으로 돈다. 화면은 y가 아래로 커지므로 각을 빼 준다.
      const ma = -spin, mx = gx +Math.cos(ma) * gr * 0.62, my = gy + Math.sin(ma) * gr * 0.62, dayside = Math.cos(ma - sunDir) > 0;
      c.fillStyle = '#ff6b6b'; c.beginPath(); c.arc(mx, my, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(`우리나라: ${dayside ? '낮' : '밤'}`, gx, gy + gr + 28);
      c.font = FONT(12); c.fillText('북극 위에서 본 지구본', gx, gy - gr - 12);
      if (spinning) { spin += reduceMotion() ? Math.PI / 2 : 0.05; if (spin >= Math.PI * 2 * 1.02) { spinning = false; spin = 0; if (!spun.includes(pos)) spun.push(pos); status.textContent = `${P(pos).label}에서도 우리나라는 하루 동안 낮과 밤을 모두 지나요. (${spun.length}/2)`; renderTray(); if (spun.length >= 2) { onAction('rotated'); onReady?.(); } } }
    } else if (mode === 'lat') {
      c.fillText('같은 날(춘분 무렵) 12시, 측정기를 옮겨 그림자를 비교해요', 16, 26);
      const L = {eq: ['적도', 0], kr: ['우리나라', 37.5], pole: ['북극 가까이', 80]};
      Object.entries(L).forEach(([k, [n, lat]], i) => { const alt = 90 - lat, len = Math.round(STICK / Math.tan(Math.max(1, alt) * R) * 10) / 10; zoomBox(c, {x0: 16 + i * 236, y0: 50, w: 224, h: 300, title: n, len: Math.min(len, 6), alt: Math.max(alt, 1), cm: 34, ruler: false, note: lats.includes(k) ? `그림자 ${len} cm` : '?'}); if (latPick === k) { c.strokeStyle = '#f0b43c'; c.lineWidth = 3; c.strokeRect(16 + i * 236, 50, 224, 300); } });
    }
    raf = requestAnimationFrame(draw);
  }
  function head() { c.fillStyle = '#e8ecf2'; c.font = FONT(15, true); c.textAlign = 'left'; }
  function inputs(label, onOk) {
    const lenI = el('input', {type: 'text', inputmode: 'decimal', maxlength: '5', class: 'm-number', 'aria-label': '그림자 길이(cm)'});
    tray.append(el('div', {class: 'm-number-row'}, el('span', {}, '그림자 길이'), lenI, el('b', {}, 'cm')), button(label, () => { const v = parseFloat(lenI.value.replace(',', '.')); onOk(v, lenI); }, 'mission-go'));
  }
  function renderTray() {
    tray.replaceChildren(); sheet.replaceChildren();
    if (mode === 'still') {
      if (still.length < 4) inputs(still.length ? '3개월 기다렸다가 다시 재어 기록' : '재어서 기록', (v, i) => { const r = proofShadow(KR.lat, 'na'); const ok = Math.abs(v - r.len) <= 0.2; i.classList.toggle('recheck', !ok); if (!ok) { status.textContent = '그림자 끝이 닿은 눈금을 다시 읽어 보세요. 작은 눈금 한 칸은 0.1 cm예요.'; return; } still.push(r.len); status.textContent = `${still.length}번째 기록: ${r.len} cm. 공전하지 않으니 지구본은 계속 (나)에 있어요.`; renderTray(); if (still.length >= 4) { onAction('recorded'); onReady?.(); } });
      sheet.append(el('table', {class: 'narrow'}, el('tr', {}, el('th', {}, '측정'), [1, 2, 3, 4].map((n) => el('th', {}, `${n}번째`))), el('tr', {}, el('th', {}, '그림자 길이'), [0, 1, 2, 3].map((i) => el('td', {}, still[i] != null ? `${still[i]} cm` : '')))));
      return;
    }
    if (mode === 'south') {
      tray.append(el('div', {class: 'bench-seg'}, ORBIT_POS.map((p) => { const b = button(`${p.label}로 공전`, () => { pos = p.id; renderTray(); }, 'bench-opt' + (south[p.id] != null ? ' tested' : '')); b.setAttribute('aria-pressed', String(pos === p.id)); return b; })));
      inputs('기록하기', (v, i) => { const r = proofShadow(NZ.lat, pos); const ok = Math.abs(v - r.len) <= 0.2; i.classList.toggle('recheck', !ok); if (!ok) { status.textContent = '그림자 끝이 닿은 눈금을 다시 읽어 보세요.'; return; } south[pos] = r.len; const n = Object.keys(south).length; status.textContent = `뉴질랜드 ${P(pos).label}: ${r.len} cm. (${n}/4)`; renderTray(); if (n >= 4) { onAction('recorded'); onReady?.(); } });
      sheet.append(el('table', {class: 'narrow'}, el('tr', {}, el('th', {}, '위치'), ORBIT_POS.map((p) => el('th', {}, p.label))), el('tr', {}, el('th', {}, '우리나라 (조건 B)'), ORBIT_POS.map((p) => el('td', {}, `${proofShadow(KR.lat, p.id).len} cm`))), el('tr', {}, el('th', {}, '뉴질랜드'), ORBIT_POS.map((p) => el('td', {}, south[p.id] != null ? `${south[p.id]} cm` : '')))));
      return;
    }
    if (mode === 'distance') {
      tray.append(el('div', {class: 'bench-seg'}, [['fake', '가상 지구 (조건 D)'], ['real', '실제 지구']].map(([k, n]) => { const b = button(n, () => { world = k; look(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(world === k)); return b; })),
        el('div', {class: 'bench-seg'}, ORBIT_POS.map((p) => { const b = button(`${p.label}로 공전`, () => { pos = p.id; look(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(pos === p.id)); return b; })));
      return;
    }
    if (mode === 'day') {
      tray.append(el('div', {class: 'bench-seg'}, ['na', 'ra'].map((id) => { const b = button(`${P(id).label} 위치`, () => { if (spinning) return; pos = id; renderTray(); }, 'bench-opt' + (spun.includes(id) ? ' tested' : '')); b.setAttribute('aria-pressed', String(pos === id)); return b; })),
        button(spinning ? '돌리는 중' : '하루 돌리기', () => { if (spinning) return; spinning = true; spin = 0; renderTray(); }, 'mission-go'));
      return;
    }
    if (mode === 'lat') {
      tray.append(el('div', {class: 'bench-seg'}, [['eq', '적도'], ['kr', '우리나라'], ['pole', '북극 가까이']].map(([k, n]) => { const b = button(`측정기를 ${n}로`, () => { latPick = k; if (!lats.includes(k)) lats.push(k); status.textContent = k === 'eq' ? '적도에서는 태양이 거의 머리 위에 있어 그림자가 거의 없어요.' : k === 'pole' ? '북극 가까이에서는 태양이 낮게 떠 그림자가 아주 길어요.' : '우리나라에서는 그 중간이에요.'; renderTray(); if (lats.length >= 3) { onAction('compared'); onReady?.(); } }, 'bench-opt' + (lats.includes(k) ? ' tested' : '')); b.setAttribute('aria-pressed', String(latPick === k)); return b; })));
    }
  }
  function look() { const key = world + ':' + pos; if (!seen.includes(key)) seen.push(key); const need = ['fake:na', 'fake:ra', 'real:na', 'real:ra'].filter((k) => seen.includes(k)).length; status.textContent = world === 'fake' ? `가상 지구에서는 가까울 때 두 곳이 함께 따뜻해지고 멀 때 함께 추워져요. (${need}/4)` : `실제 지구에서는 (라)가 가장 가까운데도 우리나라의 남중 고도가 가장 낮아요. (${need}/4)`; renderTray(); if (need >= 4) { onAction('compared'); onReady?.(); } }
  renderTray();
  status.textContent = {still: '공전을 끄고 (나) 위치에 둔 채 시간이 지나도 그림자가 변하는지 네 번 재어 보세요.', south: '측정기를 뉴질랜드로 옮겼어요. (가)부터 (라)까지 그림자 길이를 재어 우리나라와 비교해요.', distance: '가상 지구와 실제 지구를 바꿔 가며 (나)와 (라)를 비교해 보세요.', day: '(나)와 (라)에서 한 번씩 하루를 돌려 우리나라가 낮과 밤을 지나는지 보세요.', lat: '측정기를 적도, 우리나라, 북극 가까이로 옮겨 보세요.'}[mode];
  const ready = {still: still.length >= 4, south: Object.keys(south).length >= 4, distance: ['fake:na', 'fake:ra', 'real:na', 'real:ra'].every((k) => seen.includes(k)), day: spun.length >= 2, lat: lats.length >= 3}[mode];
  if (ready) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}
// 자전축과 공전 궤도면 (지도서 참고). 각도기를 읽으면 66.5°.
export function paintAxisAngle(c, {label = ''}) {
  c.fillStyle = '#141a26'; c.fillRect(0, 0, 240, 180);
  const x = 120, y = 100, t = 23.5 * R;
  c.strokeStyle = 'rgba(200,210,230,.8)'; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(10, y); c.lineTo(230, y); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#9fb0c8'; c.font = FONT(10); c.textAlign = 'left'; c.fillText('공전 궤도면', 12, y - 6);
  c.fillStyle = '#3f7d5a'; c.beginPath(); c.arc(x, y, 34, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - Math.sin(t) * 70, y + Math.cos(t) * 70); c.lineTo(x + Math.sin(t) * 70, y - Math.cos(t) * 70); c.stroke();
  c.save(); c.translate(x, y); c.strokeStyle = '#7fb6ff'; c.fillStyle = 'rgba(127,182,255,.15)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 60, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#cfe0f5'; c.font = FONT(8); c.textAlign = 'center';
  for (let d = 0; d <= 180; d += 10) { const a = -d * R; c.beginPath(); c.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); c.lineTo(Math.cos(a) * (d % 30 ? 55 : 51), Math.sin(a) * (d % 30 ? 55 : 51)); c.strokeStyle = '#7fb6ff'; c.stroke(); if (d % 30 === 0) c.fillText(String(d), Math.cos(a) * 44, Math.sin(a) * 44 + 3); }
  c.strokeStyle = '#f0b43c'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 24, -Math.PI / 2 + t, 0); c.stroke(); c.restore();
  if (label) { c.fillStyle = '#e8ecf2'; c.font = FONT(12, true); c.textAlign = 'left'; c.fillText(label, 8, 16); }
}
// 신항이가 그린 공전 그림: 태양과 지구를 크게, 가깝게 그렸다.
export function paintOrbitDraw(c) {
  c.fillStyle = '#fffbe8'; c.fillRect(0, 0, 240, 180);
  c.strokeStyle = '#8a7444'; c.setLineDash([4, 4]); c.beginPath(); c.ellipse(120, 92, 92, 52, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#f3a73a'; c.beginPath(); c.arc(120, 92, 26, 0, Math.PI * 2); c.fill();
  [[28, 92], [120, 40], [212, 92], [120, 144]].forEach(([x, y]) => { c.fillStyle = '#4f8fd6'; c.beginPath(); c.arc(x, y, 15, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#233a5c'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 6, y + 16); c.lineTo(x + 6, y - 16); c.stroke(); });
  c.fillStyle = '#5a4a2a'; c.font = FONT(10, true); c.textAlign = 'left'; c.fillText('신항이가 그린 공전 그림', 6, 14);
}

// ---------------------------------------------------------------- 처마와 차양 (과학 28쪽 곁글) · 텃밭 관리실 설계 (지도서 대체 탐구)
// 옆에서 본 모형: 처마 높이 2.4 m, 문(창) 0.3~2.1 m, 1 m = 100 px. 여름 남중 78.5°, 겨울 남중 31.5°(모형 위치 북위 35°).
export function eaveLight(L, alt) { const h = 2.4 - L * Math.tan(alt * R), top = Math.min(h, 2.1); return top <= 0.3 ? {blocked: true, depth: 0, top} : {blocked: false, depth: top / Math.tan(alt * R), near: 0.3 / Math.tan(alt * R), top}; }
export function eavesLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const W = 720, H = 380;
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: W * 2, height: H * 2, role: 'img', 'aria-label': mode === 'house' ? '위에서 본 텃밭 관리실. 큰 창의 방향과 크기, 처마를 고른다.' : '옆에서 본 한옥. 처마 길이에 따라 여름과 겨울 남중 햇빛이 방 안에 드는 모습이 달라진다.'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, mode === 'house' ? '텃밭 관리실 설계판 (모형 값)' : '한옥 처마 모형 (모형 값)'), canvas, tray, status);
  const c = canvas.getContext('2d');
  const s = memory.eave ??= {L: 0.1}, hs = memory.house ??= {dir: 'e', size: 'small', eave: false, tried: []};
  const SUM = 78.5, WIN = 31.5;
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0);
    if (mode === 'house') return drawHouse();
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bfe2ff'); g.addColorStop(1, '#eaf6ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const fy = 345, wx = 350, m = 80, X = (d) => wx + d * m, Y = (h) => fy - h * m, RW = 3.5;
    c.fillStyle = '#9ccf7a'; c.fillRect(0, fy, W, H - fy); c.fillStyle = '#e9dcc0'; c.fillRect(wx, Y(2.4), RW * m, fy - Y(2.4)); c.fillStyle = '#d8c7a2'; c.fillRect(wx, fy - 6, RW * m, 6);
    c.fillStyle = '#8a5a2b'; c.fillRect(wx - 6, Y(2.4), 6, Y(2.1) - Y(2.4)); c.fillRect(wx - 6, Y(0.3), 6, fy - Y(0.3));
    c.fillStyle = '#5a3d22'; c.beginPath(); c.moveTo(X(-s.L) - 6, Y(2.4) + 4); c.lineTo(X(0), Y(2.4) - 18); c.lineTo(X(RW), Y(2.4) - 50); c.lineTo(X(RW), Y(2.4) - 40); c.lineTo(X(0), Y(2.4) - 4); c.lineTo(X(-s.L) - 6, Y(2.4) + 10); c.fill();
    const ray = (alt, col, fill) => { const r = eaveLight(s.L, alt), tipx = X(-s.L), tipy = Y(2.4), dx = Math.cos(alt * R), dy = Math.sin(alt * R), h = 2.4 - s.L * Math.tan(alt * R);
      const end = h >= 0 ? [X(0), Y(h)] : [tipx + (fy - tipy) / Math.tan(alt * R), fy];
      c.strokeStyle = col; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(tipx - dx * 400, tipy - dy * 400); c.lineTo(end[0], end[1]); c.stroke(); c.setLineDash([]);
      if (!r.blocked) { c.fillStyle = fill; c.beginPath(); c.moveTo(X(0), Y(r.top)); c.lineTo(X(0), Y(0.3)); c.lineTo(X(Math.min(r.near, RW)), fy); c.lineTo(X(Math.min(r.depth, RW)), fy); c.closePath(); c.fill(); c.fillStyle = col; c.fillRect(X(Math.min(r.near, RW)), fy - 5, X(Math.min(r.depth, RW)) - X(Math.min(r.near, RW)), 5); }
      return r; };
    const rs = ray(SUM, 'rgba(224,112,31,1)', 'rgba(255,170,90,.35)'), rw = ray(WIN, 'rgba(47,111,200,1)', 'rgba(255,226,120,.55)');
    c.fillStyle = 'rgba(255,255,255,.88)'; c.fillRect(8, 8, 470, 76); c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left';
    c.fillText(`처마 길이 ${s.L.toFixed(1)} m`, 16, 26);
    c.fillStyle = '#b4531a'; c.fillText(`여름 남중 햇빛(78.5°): ${rs.blocked ? '방 안에 들지 않아요' : `방 안 ${rs.depth.toFixed(1)} m까지 들어와요`}`, 16, 50);
    c.fillStyle = '#2f5fa8'; c.fillText(`겨울 남중 햇빛(31.5°): ${rw.blocked ? '방 안에 들지 않아요' : `방 안 ${Math.min(rw.depth, RW).toFixed(1)} m까지 들어와요`}`, 16, 74);
    c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'left'; c.fillText('남쪽', 16, fy + 24); c.textAlign = 'right'; c.fillText('북쪽 (방 안쪽)', W - 16, fy + 24);
    return {rs, rw};
  }
  function drawHouse() {
    c.fillStyle = '#dfeccf'; c.fillRect(0, 0, W, H);
    const bx = 260, by = 110, bw = 200, bh = 150;
    c.fillStyle = '#f3e6c8'; c.fillRect(bx, by, bw, bh); c.strokeStyle = '#8a7444'; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh);
    const len = hs.size === 'large' ? 120 : 60, pos = {s: [bx + bw / 2 - len / 2, by + bh - 4, len, 8], n: [bx + bw / 2 - len / 2, by - 4, len, 8], e: [bx + bw - 4, by + bh / 2 - len / 2, 8, len], w: [bx - 4, by + bh / 2 - len / 2, 8, len]}[hs.dir];
    c.fillStyle = '#6fb6ff'; c.fillRect(...pos);
    if (hs.eave) { c.strokeStyle = '#5a3d22'; c.lineWidth = 6; c.strokeRect(bx - 14, by - 14, bw + 28, bh + 28); }
    c.fillStyle = '#233a5c'; c.font = FONT(16, true); c.textAlign = 'center'; c.fillText('북', 620, 60); c.fillText('남', 620, 150); c.fillText('서', 575, 105); c.fillText('동', 665, 105);
    c.strokeStyle = '#233a5c'; c.lineWidth = 2; c.beginPath(); c.moveTo(620, 70); c.lineTo(620, 135); c.moveTo(585, 102); c.lineTo(655, 102); c.stroke();
    const f = {s: 1, e: 0.35, w: 0.35, n: 0}[hs.dir] * (hs.size === 'large' ? 2 : 1), winter = Math.round(f * 45 * (hs.eave ? 0.95 : 1)), summer = Math.round({s: 1, e: 0.6, w: 0.6, n: 0.1}[hs.dir] * (hs.size === 'large' ? 2 : 1) * (hs.dir === 's' && hs.eave ? 0.25 : 1) * 45);
    const bar = (y, lab, v, col) => { c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'left'; c.fillText(lab, 30, y); c.fillStyle = '#fff'; c.fillRect(30, y + 8, 200, 16); c.fillStyle = col; c.fillRect(30, y + 8, Math.min(200, v * 2.2), 16); c.fillStyle = '#233a5c'; c.fillText(`${v}`, 238, y + 22); };
    bar(300, '겨울 한낮 거실에 드는 햇빛', winter, '#f0b43c'); bar(345, '여름 한낮 거실이 더워지는 정도', summer, '#e0701f');
    c.fillStyle = '#51637a'; c.font = FONT(12); c.textAlign = 'left'; c.fillText('막대 길이는 비교용 모형 값이에요.', 300, 370);
    return {winter, summer};
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'house') {
      const seg = (name, list, key) => el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, name), el('span', {class: 'bench-seg'}, list.map(([v, n]) => { const b = button(n, () => { hs[key] = v; tryIt(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(hs[key] === v)); return b; })));
      tray.append(seg('큰 창 방향', [['s', '남쪽'], ['e', '동쪽'], ['w', '서쪽'], ['n', '북쪽']], 'dir'), seg('창 크기', [['small', '작은 창'], ['large', '큰 창']], 'size'), seg('처마', [[false, '없음'], [true, '있음']], 'eave'));
      return;
    }
    tray.append(button('처마 짧게', () => setL(s.L - 0.1), 'bench-opt'), button('처마 길게', () => setL(s.L + 0.1), 'bench-opt'));
  }
  function tryIt() { const key = `${hs.dir}-${hs.size}-${hs.eave}`; if (!hs.tried.includes(key)) hs.tried.push(key); const r = draw(); status.textContent = `설계 ${hs.tried.length}개를 비교했어요. 겨울 햇빛 ${r.winter}, 여름 더위 ${r.summer}.`; renderTray(); if (hs.tried.length >= 3) { onAction('designed'); onReady?.(); } }
  function setL(v) { s.L = Math.round(Math.max(0, Math.min(2, v)) * 10) / 10; const {rs, rw} = draw(); const ok = rs.blocked && Math.min(rw.depth, 3) >= 2.5; status.textContent = ok ? '여름 한낮 햇빛은 막고 겨울 한낮 햇빛은 방 안 깊이 들어와요.' : rs.blocked ? '여름 햇빛은 막았어요. 겨울 햇빛도 방 안 깊이 들어오게 맞춰 보세요.' : '여름 한낮 햇빛이 방 안에 들어와요. 처마 길이를 바꿔 보세요.'; renderTray(); if (ok) { onAction('fitted'); onReady?.(); } }
  renderTray(); draw();
  status.textContent = mode === 'house' ? '큰 창의 방향과 크기, 처마를 바꿔 세 가지 이상 설계를 비교해 보세요.' : '처마 길이를 바꿔 여름 한낮 햇빛은 막고 겨울 한낮 햇빛은 방 안 깊이 들게 해 보세요.';
  if (mode === 'house' ? hs.tried.length >= 3 : (eaveLight(s.L, SUM).blocked && Math.min(eaveLight(s.L, WIN).depth, 3) >= 2.5)) setTimeout(() => onReady?.(), 0);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- 반례 카드 만들기 (출제)
const ALERTS = [
  {id: 'm05', text: '"여름에는 태양과 지구가 가까워서 덥습니다."', ok: 'bd', why: '거리가 계절을 정한다면 남반구와 북반구가 같은 때 여름이어야 하는데, 실제로는 계절이 반대예요.'},
  {id: 'm06', text: '"여름에는 태양이 더 뜨겁게 빛납니다."', ok: 'lamp', why: '전등 밝기가 같아도 남중 고도가 높은 (나)에서 같은 넓이가 받는 에너지가 더 많았어요.'},
  {id: 'm07', text: '"우리나라가 태양 쪽을 향하면 여름입니다."', ok: 'day', why: '태양 쪽을 향했다가 반대쪽을 향하는 동안 바뀌는 것은 낮과 밤이에요.'},
  {id: 'm12', text: '"자전축만 기울어져 있으면 공전하지 않아도 계절이 생깁니다."', ok: 'c', why: '공전을 끄니 여러 번 재어도 그림자 길이가 그대로였어요.'},
];
const PROOF_CONDS = [['bd', '조건 B와 D 비교, 실제 지구 거리 모드'], ['lamp', '전등 밝기가 같았던 표시'], ['day', '하루 돌리기 장면'], ['c', '조건 C (공전 끄기)']];
export function proofMaker({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const status = el('p', {class: 'signal-status', role: 'status'});
  const box = el('div', {class: 'm-card-make'});
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, '반례 카드 만들기'), box, status);
  const card = memory.proofCard ??= {};
  function paint() {
    box.replaceChildren();
    const pick = (list, key, cls = 'bench-opt') => el('div', {class: cls === 'm-opt' ? 'm-options' : 'bench-seg'}, list.map(([id, label]) => { const b = button(label, () => { card[key] = id; if (key === 'alert') { card.cond = null; card.why = null; } card.done = false; paint(); }, cls); b.setAttribute('aria-pressed', String(card[key] === id)); return b; }));
    box.append(el('p', {class: 'm-how'}, '1. 반박할 척척 알림을 고르세요.'), pick(ALERTS.map((a) => [a.id, a.text]), 'alert', 'm-opt'));
    const a = ALERTS.find((x) => x.id === card.alert);
    if (!a) return;
    box.append(el('p', {class: 'm-how'}, '2. 이 알림을 반박할 모형 조건을 고르세요.'), pick(PROOF_CONDS, 'cond'));
    box.append(el('p', {class: 'm-how'}, '3. 정답 해설 문장을 고르세요.'), pick([['right', a.why], ['wrong', '척척이 그렇게 말했으니 맞는 말이에요.']], 'why', 'm-opt'));
    if (card.cond && card.why) box.append(button('먼저 풀어 보고 게시판에 올리기', () => {
      if (card.cond !== a.ok) { status.textContent = '먼저 풀어 보니 고른 조건으로는 이 알림을 반박하기 어려워요. 알림과 관계있는 장면을 다시 떠올려 보세요.'; return; }
      if (card.why !== 'right') { status.textContent = '해설이 증거가 아니라 척척의 말에 기대고 있어요. 모형에서 확인한 사실로 고르세요.'; return; }
      card.done = true; status.textContent = '반례 카드를 친구 문제 게시판에 올렸어요.'; onAction('made'); onReady?.(); paint();
    }, 'mission-go'));
    if (card.done) box.append(el('div', {class: 'm-hidden-card'}, el('b', {}, '반례 카드'), el('p', {}, a.text), el('p', {}, '증거: ' + PROOF_CONDS.find(([id]) => id === card.cond)[1]), el('p', {}, '해설: ' + a.why)));
  }
  paint();
  status.textContent = card.done ? '만든 카드가 게시판에 올라가 있어요.' : '척척 알림 한 장과 그것을 반박할 증거를 골라 카드를 만들어요.';
  if (card.done) setTimeout(() => onReady?.(), 0);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- 해시계 (과학 30~31쪽)
// 국기 게양대 장면은 실제 방위각과 고도로 그림자를 그린다(진해, 9월 23일). 종이 접시 해시계는 교과서처럼 1시간에 15°씩 시각선을 긋는 단순한 모형이다.
export function sunAzAlt(clock, doy = 266, place = PLACE) { return azAlt(clock, doy, place); }
const DIAL_DOY = {sum: 172, win: 355, now: 266};
export function dialShadow(hour, day = 'now', stick = 10) { const alt = azAlt(hour + (135 - PLACE.lon) / 15, DIAL_DOY[day]).alt; return {ang: (hour - 12) * 15, len: stick / Math.tan(Math.max(3, alt) * R), alt}; }
function plate(c, {cx, cy, r, rot = 0, lines = [], labels = true, missing = [], shadow = null, gnomon = true, compass = false}) {
  c.save(); c.translate(cx, cy);
  if (compass) { c.fillStyle = '#233a5c'; c.font = FONT(16, true); c.textAlign = 'center'; c.fillText('N', 0, -r - 26); c.strokeStyle = '#c0392b'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -r - 18); c.lineTo(0, -r - 4); c.stroke(); }
  c.rotate(rot * R);
  c.fillStyle = '#fffdf5'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#c9b88e'; c.lineWidth = 4; c.stroke();
  c.strokeStyle = '#e4dcc4'; c.lineWidth = 1; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
  for (const a of lines) {
    const t = (a - 90) * R; c.strokeStyle = '#2f5fa8'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t) * (r - 8), Math.sin(t) * (r - 8)); c.stroke();
    const hour = 12 + a / 15; if (labels && !missing.includes(hour)) { c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(String(hour), Math.cos(t) * (r + 16), Math.sin(t) * (r + 16) + 5); }
  }
  if (shadow) { const t = (shadow.ang - 90) * R, L = Math.min(r - 4, shadow.px); c.strokeStyle = 'rgba(40,40,40,.55)'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t) * L, Math.sin(t) * L); c.stroke(); c.lineCap = 'butt'; }
  if (gnomon) { c.fillStyle = '#8a5a2b'; c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill(); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
export function paintDialFace(c, {label = '', mark = null}) {
  c.fillStyle = '#eef6ff'; c.fillRect(0, 0, 240, 180);
  const lines = [-45, -30, -15, 0, 15, 30, 45], names = ['㉠', '㉡', '㉢', '㉣', '㉤', '㉥', '㉦'];
  c.save(); c.translate(120, 150); c.fillStyle = '#fffdf5'; c.beginPath(); c.arc(0, 0, 118, Math.PI, 0); c.fill(); c.strokeStyle = '#c9b88e'; c.lineWidth = 3; c.stroke();
  lines.forEach((a, i) => { const t = (a - 90) * R; c.strokeStyle = '#2f5fa8'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t) * 104, Math.sin(t) * 104); c.stroke(); c.fillStyle = '#233a5c'; c.font = FONT(12, true); c.textAlign = 'center'; c.fillText(names[i], Math.cos(t) * 114, Math.sin(t) * 114 + 4); });
  c.fillStyle = '#8a5a2b'; c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.restore();
  c.fillStyle = '#233a5c'; c.font = FONT(11, true); c.textAlign = 'left'; c.fillText('북', 114, 12); c.fillText(label, 6, 14);
}
export function sundial({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const W = 720, H = 400;
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: W * 2, height: H * 2, role: 'img', 'aria-label': mode === 'flag' ? '위에서 본 운동장과 국기 게양대 그림자' : '종이 접시 해시계와 막대 그림자'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const box = el('div', {class: 'm-card-make'});
  const owner = {flag: '시간 창, 2026년 운동장 국기 게양대 (모형 값)', lines: '부서진 해시계 시각판 복원', season: '해시계 계절 퍼즐, 12시 (모형 값)', make: '우리 모둠 시각판 만들기', orient: '해시계 광장, 방위 맞추기', check: '해시계 점검대 (모형 값)', read: '해시계 읽기 (모형 값)', riddle: '그림자 수수께끼 만들기 (모형 값)'}[mode];
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, owner), canvas, tray, box, status);
  const c = canvas.getContext('2d');
  const m = memory.dial ??= {};
  const flagSeen = m.flagSeen ??= [], drawn = m.drawn ??= [], seasons = m.seasons ??= [], reads = m.reads ??= [];
  let hour = 9, guide = 0, rot = m.rot ?? 60, play = 0, day = 'sum', scene = 0, alive = true;
  const riddle = m.riddle ??= {day: 'sum', hour: 10};
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0);
    if (mode === 'flag') {
      c.fillStyle = '#c9a36a'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.strokeRect(40, 40, W - 80, H - 80); c.beginPath(); c.arc(W / 2, H / 2, 50, 0, Math.PI * 2); c.stroke();
      const p = azAlt(hour, DIAL_DOY.now), fx = 400, fy = 270, len = Math.min(210, 110 / Math.tan(Math.max(4, p.alt) * R)), sa = (p.az + 180) * R;
      c.strokeStyle = 'rgba(40,40,40,.5)'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + Math.sin(sa) * len, fy - Math.cos(sa) * len); c.stroke(); c.lineCap = 'butt';
      for (const h of flagSeen) { const q = azAlt(h, DIAL_DOY.now), l2 = Math.min(210, 110 / Math.tan(Math.max(4, q.alt) * R)), a2 = (q.az + 180) * R; c.fillStyle = 'rgba(35,58,92,.85)'; c.beginPath(); c.arc(fx + Math.sin(a2) * l2, fy - Math.cos(a2) * l2, 5, 0, Math.PI * 2); c.fill(); c.font = FONT(13, true); c.textAlign = 'center'; c.fillText(`${h}시`, fx + Math.sin(a2) * l2, fy - Math.cos(a2) * l2 + (h % 2 ? 20 : -10)); }
      c.fillStyle = '#eee'; c.beginPath(); c.arc(fx, fy, 7, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#555'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#233a5c'; c.font = FONT(16, true); c.textAlign = 'center'; c.fillText('북', W - 30, 34); c.fillText('남', W - 30, H - 20); c.fillText('서', 20, H / 2 + 6); c.fillText('동', W - 20, H / 2 + 6);
      c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(12, 12, 250, 34); c.fillStyle = '#233a5c'; c.textAlign = 'left'; c.fillText(`9월 23일 ${fmtTime(hour)}, 태양 고도 ${Math.round(p.alt)}°`, 22, 35);
      return;
    }
    c.fillStyle = '#e6f1dc'; c.fillRect(0, 0, W, H);
    if (mode === 'lines' || mode === 'make') {
      plate(c, {cx: 360, cy: 230, r: 150, lines: drawn, labels: mode === 'lines' ? drawn.length >= 7 : !!m.stuck});
      const t = (guide - 90) * R; c.save(); c.translate(360, 230); c.strokeStyle = 'rgba(192,57,43,.8)'; c.setLineDash([6, 5]); c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t) * 170, Math.sin(t) * 170); c.stroke(); c.setLineDash([]);
      c.strokeStyle = 'rgba(47,95,168,.5)'; c.fillStyle = 'rgba(127,182,255,.12)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 120, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#2f5fa8'; c.font = FONT(10); c.textAlign = 'center'; for (let d = -90; d <= 90; d += 15) { const a = (d - 90) * R; c.fillRect(Math.cos(a) * 114, Math.sin(a) * 114, 2, 2); c.fillText(`${Math.abs(d)}`, Math.cos(a) * 104, Math.sin(a) * 104 + 3); } c.restore();
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(`각도기 기준선에서 ${Math.abs(guide)}° ${guide < 0 ? '왼쪽' : guide > 0 ? '오른쪽' : ''}`, 16, 28);
      return;
    }
    if (mode === 'season') {
      const s = dialShadow(12, day); plate(c, {cx: 250, cy: 220, r: 150, lines: [-45, -30, -15, 0, 15, 30, 45], shadow: {ang: 0, px: s.len * 8}});
      c.fillStyle = '#233a5c'; c.font = FONT(16, true); c.textAlign = 'left'; c.fillText(`${day === 'sum' ? '하지(6월 21일)' : '동지(12월 21일)'} 12시`, 440, 120); c.font = FONT(15); c.fillText(`태양 고도 약 ${Math.round(s.alt)}°`, 440, 150); c.fillText(`막대 10 cm의 그림자 ${s.len.toFixed(1)} cm`, 440, 176);
      return;
    }
    if (mode === 'orient') {
      const s = dialShadow(11, 'now'); plate(c, {cx: 330, cy: 220, r: 150, rot, lines: [-45, -30, -15, 0, 15, 30, 45], compass: true, shadow: {ang: -15 - rot, px: s.len * 9}});
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText('지금은 오전 11시예요.', 16, 28); c.fillText(rot === 0 ? '12시 선이 N극 쪽을 향해요.' : '12시 선이 N극 쪽을 향하게 돌려 보세요.', 16, 52);
      c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(620, 90); c.lineTo(610, 130); c.lineTo(630, 130); c.fill(); c.fillStyle = '#233a5c'; c.beginPath(); c.moveTo(620, 170); c.lineTo(610, 130); c.lineTo(630, 130); c.fill(); c.font = FONT(14, true); c.textAlign = 'center'; c.fillText('N', 620, 82); c.fillText('나침반', 620, 190);
      return;
    }
    if (mode === 'check') {
      const s = dialShadow(hour, 'now'); plate(c, {cx: 330, cy: 220, r: 150, lines: [-45, -30, -15, 0, 15, 30, 45], missing: [10, 14], shadow: {ang: (hour - 12) * 15, px: s.len * 9}});
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(`모둠 해시계 점검 (${fmtTime(hour)})`, 16, 28);
      return;
    }
    if (mode === 'read') {
      const h = scene ? 14 : 10, s = dialShadow(h, 'now'); plate(c, {cx: 330, cy: 220, r: 150, lines: [-45, -30, -15, 0, 15, 30, 45], shadow: {ang: (h - 12) * 15, px: s.len * 9}});
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(`장면 ${scene + 1}`, 16, 28);
      return;
    }
    if (mode === 'riddle') {
      const s = dialShadow(riddle.hour, riddle.day); plate(c, {cx: 330, cy: 220, r: 150, lines: [-45, -30, -15, 0, 15, 30, 45], labels: false, shadow: {ang: (riddle.hour - 12) * 15, px: s.len * 9}});
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText('수수께끼 그림 (시각 숫자는 가렸어요)', 16, 28);
    }
  }
  function renderTray() {
    tray.replaceChildren(); box.replaceChildren();
    if (mode === 'flag') {
      tray.append(button('1시간 앞으로', () => { hour = Math.min(15, hour + 1); see(); }, 'bench-opt'), button('1시간 뒤로', () => { hour = Math.max(9, hour - 1); see(); }, 'bench-opt'),
        button(play ? '멈추기' : '9시부터 재생', () => { if (play) { clearInterval(play); play = 0; renderTray(); return; } hour = 9; see(); play = setInterval(() => { if (!alive || hour >= 15) { clearInterval(play); play = 0; renderTray(); return; } hour += 1; see(); }, reduceMotion() ? 200 : 700); renderTray(); }, 'mission-go'));
      return;
    }
    if (mode === 'lines' || mode === 'make') {
      if (drawn.length < 7) tray.append(button('기준선 왼쪽으로 5°', () => { guide = Math.max(-90, guide - 5); draw(); }, 'bench-opt'), button('기준선 오른쪽으로 5°', () => { guide = Math.min(90, guide + 5); draw(); }, 'bench-opt'),
        button('이 자리에 시각선 긋기', () => {
          if (guide % 15 !== 0 || Math.abs(guide) > 45) { status.textContent = guide % 15 ? '시각선은 15°마다 그어요. 각도기 눈금을 다시 보세요.' : '이 해시계에는 9시부터 15시까지만 그어요.'; return; }
          if (drawn.includes(guide)) { status.textContent = '이미 그은 자리예요.'; return; }
          drawn.push(guide); drawn.sort((a, b) => a - b); status.textContent = `시각선 ${drawn.length}개를 그었어요.${drawn.length >= 7 ? (mode === 'lines' ? ' 시각 숫자가 되살아났어요.' : ' 이제 12시 붙임딱지를 붙여요.') : ''}`; draw(); renderTray();
          if (drawn.length >= 7 && mode === 'lines') { onAction('drawn'); onReady?.(); }
        }, 'mission-go'));
      else if (mode === 'make' && !m.stuck) box.append(el('p', {class: 'm-how'}, '12시 붙임딱지를 붙일 선을 고르세요. 12시 선은 나침반 N극 쪽을 향하게 놓을 선이에요.'), el('div', {class: 'bench-seg'}, drawn.map((a, i) => button(`${i + 1}번 선`, () => { if (a !== 0) { status.textContent = '12시는 시각선 한가운데예요. 오전 시각은 왼쪽, 오후 시각은 오른쪽에 와요.'; return; } m.stuck = true; status.textContent = '12시 붙임딱지를 붙이니 나머지 시각도 차례로 붙었어요.'; draw(); renderTray(); onAction('made'); onReady?.(); }, 'bench-opt'))));
      return;
    }
    if (mode === 'season') {
      tray.append(el('div', {class: 'bench-seg'}, [['sum', '하지로 바꾸기'], ['win', '동지로 바꾸기']].map(([k, n]) => { const b = button(n, () => { day = k; if (!seasons.includes(k)) seasons.push(k); status.textContent = `${k === 'sum' ? '하지' : '동지'} 12시의 그림자예요.${seasons.length >= 2 ? ' 두 날의 그림자 길이를 비교해 보세요.' : ''}`; draw(); renderTray(); if (seasons.length >= 2) { onAction('compared'); onReady?.(); } }, 'bench-opt' + (seasons.includes(k) ? ' tested' : '')); b.setAttribute('aria-pressed', String(day === k)); return b; })));
      return;
    }
    if (mode === 'orient') {
      tray.append(button('해시계를 왼쪽으로 15° 돌리기', () => turn(-15), 'bench-opt'), button('해시계를 오른쪽으로 15° 돌리기', () => turn(15), 'bench-opt'));
      return;
    }
    if (mode === 'check') {
      tray.append(button(play ? '재생 중' : '9시부터 시간 재생', () => { if (play) return; hour = 9; draw(); play = setInterval(() => { if (!alive) { clearInterval(play); return; } hour += 1; draw(); if (hour >= 15) { clearInterval(play); play = 0; m.checked = true; status.textContent = '시간이 지나면서 그림자가 시각선을 따라 옮겨 갔어요. 점검 목록을 나눠 보세요.'; renderTray(); onReady?.(); } }, reduceMotion() ? 150 : 600); renderTray(); }, 'mission-go'));
      return;
    }
    if (mode === 'read') {
      tray.append(el('div', {class: 'bench-seg'}, ['장면 1', '장면 2'].map((n, i) => { const b = button(n, () => { scene = i; if (!reads.includes(i)) reads.push(i); draw(); renderTray(); if (reads.length >= 2) onReady?.(); }, 'bench-opt' + (reads.includes(i) ? ' tested' : '')); b.setAttribute('aria-pressed', String(scene === i)); return b; })));
      return;
    }
    if (mode === 'riddle') {
      const truth = riddle.hour, opts = [truth, truth <= 12 ? truth + 3 : truth - 3, truth === 12 ? 9 : 12].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
      box.append(el('p', {class: 'm-how'}, '1. 날짜와 시각을 정하세요.'), el('div', {class: 'bench-seg'}, [['sum', '하지'], ['win', '동지']].map(([k, n]) => { const b = button(n, () => { riddle.day = k; riddle.pick = null; riddle.done = false; draw(); renderTray(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(riddle.day === k)); return b; })),
        el('div', {class: 'bench-seg'}, [9, 10, 11, 12, 13, 14, 15].map((h) => { const b = button(`${h}시`, () => { riddle.hour = h; riddle.pick = null; riddle.done = false; draw(); renderTray(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(riddle.hour === h)); return b; })),
        el('p', {class: 'm-how'}, '2. 친구가 맞힐 정답 시각을 고르세요.'), el('div', {class: 'bench-seg'}, opts.map((h) => { const b = button(`${h}시`, () => { riddle.pick = h; renderTray(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(riddle.pick === h)); return b; })),
        el('p', {class: 'm-how'}, '3. 해설 문장을 고르세요.'), el('div', {class: 'm-options'}, [['rule', `그림자가 ${truth < 12 ? '12시 선 왼쪽' : truth > 12 ? '12시 선 오른쪽' : '12시 선 위'}에 있고, 시각선은 1시간에 15°씩이에요`], ['len', '그림자가 길수록 늦은 시각이에요']].map(([id, w]) => { const b = button(w, () => { riddle.why = id; renderTray(); }, 'm-opt'); b.setAttribute('aria-pressed', String(riddle.why === id)); return b; })));
      if (riddle.pick != null && riddle.why) box.append(button('먼저 풀어 보고 게시판에 올리기', () => {
        if (riddle.pick !== truth) { status.textContent = '먼저 풀어 보니 정답과 맞지 않아요. 그림자가 놓인 시각선을 세어 보세요.'; return; }
        if (riddle.why !== 'rule') { status.textContent = '해설이 틀렸어요. 그림자의 길이는 계절과 시각에 따라 달라져요. 시각은 그림자가 놓인 선으로 읽어요.'; return; }
        riddle.done = true; status.textContent = `${riddle.day === 'sum' ? '하지' : '동지'} ${truth}시 그림자 수수께끼를 게시판에 올렸어요.`; onAction('made'); onReady?.();
      }, 'mission-go'));
    }
  }
  function see() { if (!flagSeen.includes(hour)) flagSeen.push(hour); status.textContent = `${fmtTime(hour)}의 그림자예요. 본 시각 ${flagSeen.length}개.`; draw(); if (flagSeen.length >= 3) { onAction('watched'); onReady?.(); } }
  function turn(d) { rot = ((rot + d + 540) % 360) - 180; m.rot = rot; draw(); if (rot === 0) { status.textContent = '12시 선을 N극 쪽에 맞췄어요. 그림자가 11시 선에 놓였어요.'; onAction('oriented'); onReady?.(); } else status.textContent = `해시계를 ${Math.abs(rot)}° 더 돌려야 해요.`; }
  renderTray(); draw();
  status.textContent = {flag: '시간을 바꿔 가며 국기 게양대 그림자를 살펴보세요.', lines: '각도기 기준선을 15°씩 옮겨 가며 시각선을 그어 보세요. 9시부터 15시까지 일곱 개예요.', season: '날짜를 하지와 동지로 바꿔 12시 그림자를 비교해 보세요.', make: '각도기로 15°마다 시각선을 긋고 12시 붙임딱지를 붙여요.', orient: '해시계를 돌려 12시 선이 나침반 N극 쪽을 향하게 놓아 보세요.', check: '시간을 재생하며 해시계가 잘 작동하는지 점검해요.', read: '장면 1과 장면 2의 그림자를 읽어 보세요.', riddle: riddle.done ? '만든 수수께끼가 게시판에 올라가 있어요.' : '날짜와 시각을 정하면 그림자 그림이 만들어져요.'}[mode];
  const ready = {flag: flagSeen.length >= 3, lines: drawn.length >= 7, season: seasons.length >= 2, make: !!m.stuck, orient: m.rot === 0, check: !!m.checked, read: reads.length >= 2, riddle: !!riddle.done}[mode];
  if (ready) setTimeout(() => onReady?.(), 0);
  return {node, stop: () => { alive = false; if (play) clearInterval(play); }};
}

// ---------------------------------------------------------------- 백야와 극야 (과학 34~35쪽, 과학과 생활)
// 고위도 하루 하늘 재생. 시각은 그곳의 태양시로 보여 준다(모형 값). 북쪽 자매 마을 북위 70°, 남극 기지 남위 75°.
export function polarSky({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const at = task.at || {lat: 70, doy: 172, name: '북쪽 자매 마을'}, place = {lat: at.lat, lon: 135};
  const W = 720, H = 360;
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: W * 2, height: H * 2, role: 'img', 'aria-label': `${at.name}의 하루 하늘. 태양이 지나는 길과 지평선이 보인다.`});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const dateText = {172: '6월 21일 무렵', 355: '12월 21일 무렵'}[at.doy] || '';
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, `하늘 재생, ${at.name} (${at.lat > 0 ? '북위' : '남위'} ${Math.abs(at.lat)}°, ${dateText}, 모형 값)`), canvas, tray, status);
  const c = canvas.getContext('2d');
  const key = `${at.lat}:${at.doy}`, done = memory.polar ??= [];
  let t = 0, play = 0, alive = true;
  const X = (az) => 30 + (((az % 360) + 360) % 360) / 360 * (W - 60), Y = (alt) => 250 - alt * 3.2;
  const pts = Array.from({length: 97}, (_, i) => ({h: i / 4, ...azAlt(i / 4, at.doy, place)}));
  const maxA = Math.max(...pts.map((p) => p.alt)), minA = Math.min(...pts.map((p) => p.alt));
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0);
    const p = azAlt(t, at.doy, place), day = p.alt > -0.833;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, day ? '#9fd3ff' : '#0d1530'); g.addColorStop(1, day ? '#fbe3b0' : '#27335a'); c.fillStyle = g; c.fillRect(0, 0, W, Y(0));
    c.fillStyle = at.lat < 0 ? '#e8eef5' : '#6f9a5a'; c.fillRect(0, Y(0), W, H - Y(0));
    c.strokeStyle = '#233a5c'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(W, Y(0)); c.stroke();
    c.fillStyle = day ? '#233a5c' : '#e8ecf2'; c.font = FONT(14, true); c.textAlign = 'center';
    [['북', 0], ['동', 90], ['남', 180], ['서', 270], ['북', 360]].forEach(([n, a]) => { c.fillStyle = at.lat < 0 ? '#233a5c' : '#fff'; c.fillText(n, X(a === 360 ? 359.9 : a), Y(0) + 22); });
    c.strokeStyle = 'rgba(255,190,60,.8)'; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); let first = true, last = null;
    for (const q of pts) { const x = X(q.az); if (last && Math.abs(x - last) > W / 2) first = true; if (first) { c.moveTo(x, Y(q.alt)); first = false; } else c.lineTo(x, Y(q.alt)); last = x; }
    c.stroke(); c.setLineDash([]);
    c.fillStyle = p.alt > -0.833 ? '#ffcf3a' : 'rgba(255,207,58,.35)'; c.beginPath(); c.arc(X(p.az), Y(p.alt), 13, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(10, 10, 330, 50); c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left';
    c.fillText(`${clockText(t)}, 태양 고도 ${Math.round(p.alt)}°`, 20, 32); c.font = FONT(13); c.fillText(p.alt > -0.833 ? '해가 지평선 위에 있어요' : '해가 지평선 아래에 있어요', 20, 52);
  }
  function renderTray() {
    tray.replaceChildren(button(play ? '재생 중' : '하루 재생 (0시부터 24시까지)', () => {
      if (play) return; t = 0;
      const end = () => { play = 0; if (!done.includes(key)) done.push(key); status.textContent = maxA < 0 ? `하루 내내 해가 지평선 위로 올라오지 않았어요. 가장 높을 때도 ${Math.round(maxA)}°예요.` : minA > 0 ? `하루 내내 해가 지평선 아래로 내려가지 않았어요. 가장 낮을 때도 ${Math.round(minA)}°예요.` : '해가 뜨고 졌어요.'; renderTray(); draw(); onAction('replayed'); onReady?.(); };
      if (reduceMotion()) { t = 24; end(); return; }
      play = setInterval(() => { if (!alive) { clearInterval(play); return; } t = Math.min(24, t + 0.25); draw(); if (t >= 24) { clearInterval(play); end(); } }, 45); renderTray();
    }, 'mission-go'));
  }
  renderTray(); draw();
  status.textContent = done.includes(key) ? '이미 재생해 봤어요. 다시 재생해도 돼요.' : '하루 재생을 눌러 해가 움직이는 모습을 보세요.';
  if (done.includes(key)) setTimeout(() => onReady?.(), 0);
  return {node, stop: () => { alive = false; if (play) clearInterval(play); }};
}
// 백야 캠프 하루 일정판. 3시간씩 8칸. 점수는 비교용 모형 값이다.
const CAMP_ACTS = [['', '비어 있음'], ['sleep', '잠자기'], ['out', '야외 활동'], ['fest', '축제'], ['meal', '식사']];
export function campPlanner({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const status = el('p', {class: 'signal-status', role: 'status'});
  const board = el('div', {class: 'camp-board'});
  const bars = el('div', {class: 'camp-bars'});
  const tray = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, '백야 캠프 하루 일정판 (모형 값)'), board, tray, bars, status);
  const s = memory.camp ??= {slots: ['', '', '', '', '', '', '', ''], curtain: false};
  function score() {
    const n = (k) => s.slots.filter((x) => x === k).length;
    const sleep = Math.round(Math.min(100, n('sleep') * 34) * (s.curtain ? 1 : 0.4)), fun = Math.min(100, (n('out') + n('fest')) * 25 + (n('fest') ? 10 : 0));
    return {sleep, fun, meal: n('meal')};
  }
  function paint() {
    board.replaceChildren(...s.slots.map((v, i) => {
      const b = button(`${String(i * 3).padStart(2, '0')}~${String(i * 3 + 3).padStart(2, '0')}시: ${CAMP_ACTS.find(([k]) => k === v)[1]}`, () => { const k = CAMP_ACTS.findIndex(([x]) => x === v); s.slots[i] = CAMP_ACTS[(k + 1) % CAMP_ACTS.length][0]; paint(); }, 'camp-slot ' + (v || 'empty'));
      b.setAttribute('aria-label', `${i * 3}시부터 ${i * 3 + 3}시까지 활동, 지금 ${CAMP_ACTS.find(([k]) => k === v)[1]}. 누르면 바뀌어요.`); return b;
    }));
    tray.replaceChildren(button(s.curtain ? '두꺼운 커튼 달았어요' : '두꺼운 커튼 달기', () => { s.curtain = !s.curtain; paint(); }, 'bench-opt' + (s.curtain ? ' tested' : '')));
    const r = score();
    const bar = (lab, v, col) => el('div', {class: 'camp-bar'}, el('span', {}, `${lab} ${v}`), el('i', {class: 'camp-fill ' + col}));
    bars.replaceChildren(bar('잠자리 점수', r.sleep, 'sleep'), bar('즐거움 점수', r.fun, 'fun'));
    bars.querySelectorAll('.camp-fill').forEach((f, i) => { f.style.width = `${[r.sleep, r.fun][i]}%`; });
    const ok = r.sleep >= 90 && r.fun >= 50;
    status.textContent = ok ? '참가자들이 잘 자고 즐겁게 지낼 수 있는 일정이에요.' : r.sleep < 90 && !s.curtain && s.slots.includes('sleep') ? '밤에도 밝아서 잠을 설쳐요. 잠자리를 어둡게 할 방법을 찾아보세요.' : r.sleep < 90 ? '잠자는 시간이 모자라요. 잠자기 칸을 세 칸 이상 두세요.' : '즐길 거리가 모자라요. 야외 활동과 축제를 넣어 보세요.';
    if (ok && !s.done) { s.done = true; onAction('planned'); onReady?.(); }
  }
  paint();
  if (s.done) setTimeout(() => onReady?.(), 0);
  return {node, stop: () => {}};
}
export function paintMidnightGlobe(c, {label = ''}) {
  c.fillStyle = '#141a26'; c.fillRect(0, 0, 240, 180);
  c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(22, 90, 16, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,220,90,.5)'; c.lineWidth = 2; for (let y = 50; y <= 130; y += 16) { c.beginPath(); c.moveTo(42, y); c.lineTo(100, y); c.stroke(); }
  const x = 160, y = 95, r = 52, t = -23.5 * R;
  c.fillStyle = '#3f7d5a'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, Math.PI / 2); c.fill();
  c.save(); c.translate(x, y); c.rotate(t);
  c.strokeStyle = '#ffe066'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -r * 0.92, r * 0.4, 5, 0, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -r - 14); c.lineTo(0, r + 14); c.stroke();
  c.restore();
  c.fillStyle = '#ffe066'; c.font = FONT(10, true); c.textAlign = 'left'; c.fillText('계속 햇빛을 받는 곳', 150, 22);
  if (label) { c.fillStyle = '#e8ecf2'; c.font = FONT(11, true); c.fillText(label, 6, 14); }
}

// 계절별 태양 경로 ㉠(겨울, 낮고 짧음) ㉡(여름, 높고 긺) ㉢(봄과 가을, 중간). 과학 33쪽 문항 그림을 새로 그렸다.
export function paintSunPaths3(c, {label = ''}) {
  c.fillStyle = '#e6f4ff'; c.fillRect(0, 0, 240, 180); c.fillStyle = '#8fc46a'; c.fillRect(0, 150, 240, 30);
  const X = (az) => 12 + (az - 45) / 270 * 216, Y = (alt) => 150 - alt * 1.45;
  [[355, '#2f6fc8', '㉠'], [172, '#d9601a', '㉡'], [80, '#3f9a2f', '㉢']].forEach(([doy, col, name]) => {
    c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); let first = true;
    for (let t = 3; t <= 22; t += 0.1) { const p = azAlt(t, doy); if (p.alt < 0) continue; if (first) { c.moveTo(X(p.az), Y(p.alt)); first = false; } else c.lineTo(X(p.az), Y(p.alt)); }
    c.stroke(); const n = azAlt(12.42, doy); c.fillStyle = col; c.font = FONT(13, true); c.textAlign = 'center'; c.fillText(name, X(n.az), Y(n.alt) - 6);
  });
  c.fillStyle = '#233a5c'; c.font = FONT(11, true); c.textAlign = 'center'; [['동', 90], ['남', 180], ['서', 270]].forEach(([n, a]) => c.fillText(n, X(a), 167));
  if (label) { c.textAlign = 'left'; c.fillText(label, 6, 14); }
}
