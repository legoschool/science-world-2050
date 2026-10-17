// 푸른 생활 지구 튼튼 몸 연구소(학습보완자료 우리 몸의 구조와 기능) 조작 장면.
// 빨대 길이, 체온, 심장 박동 수, 계기판 값은 모두 비교용 모형 값이다. 조직과 기관계라는 말은 쓰지 않는다.
const FONT = (s, b) => `${b ? 'bold ' : ''}${s}px "Malgun Gothic",sans-serif`;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = Math.PI / 180;
const act = (task, fire) => (a) => { if (task.type === 'action') fire?.(a); };
const later = (on) => setTimeout(() => on?.(), 0);
const jo = (w, a, b) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
function device(el, owner, label) {
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: 1440, height: 760, role: 'img', 'aria-label': label});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device sun body-lab'}, el('div', {class: 'signal-owner'}, owner), canvas, tray, status);
  return {canvas, status, tray, node, c: canvas.getContext('2d')};
}
const seg = (el, button, name, list, cur, on) => el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, name), el('span', {class: 'bench-seg'}, list.map(([v, n]) => { const b = button(n, () => on(v), 'bench-opt'); b.setAttribute('aria-pressed', String(cur === v)); return b; })));
function text(c, s, x, y, {size = 14, bold = true, color = '#233a5c', align = 'left'} = {}) { c.fillStyle = color; c.font = FONT(size, bold); c.textAlign = align; c.fillText(s, x, y); }
function chip(c, s, x, y, bg = 'rgba(255,255,255,.9)', color = '#233a5c') { c.font = FONT(13, true); const w = c.measureText(s).width + 14; c.fillStyle = bg; c.fillRect(x - w / 2, y - 14, w, 20); text(c, s, x, y, {size: 13, color, align: 'center'}); }
function bone(c, x1, y1, x2, y2, w = 14, col = '#f1e6c8') {
  c.strokeStyle = '#8a7a58'; c.lineCap = 'round'; c.lineWidth = w + 3; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  for (const [x, y] of [[x1, y1], [x2, y2]]) { c.fillStyle = col; c.beginPath(); c.arc(x, y, w * 0.62, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#8a7a58'; c.lineWidth = 1.5; c.stroke(); }
}

// ---------------------------------------------------------------- 붙임딱지 판: 골격 모형(bones), 기관(organs)
const BX = 360; // 몸 그림 가운데
const BONES = [
  {id: 'skull', label: '머리뼈', x: BX, y: 52},
  {id: 'ribs', label: '갈비뼈', x: BX, y: 140},
  {id: 'spine', label: '척추뼈', x: BX, y: 214},
  {id: 'arm', label: '팔뼈', x: BX - 96, y: 170},
  {id: 'leg', label: '다리뼈', x: BX - 26, y: 300},
];
const ORGANS = [
  {id: 'nose', label: '코', x: BX, y: 46, group: '호흡기관'},
  {id: 'mouth', label: '입', x: BX, y: 70, group: '소화기관'},
  {id: 'trachea', label: '숨관', x: BX - 14, y: 112, group: '호흡기관'},
  {id: 'esophagus', label: '식도', x: BX + 16, y: 116, group: '소화기관'},
  {id: 'bronchi', label: '숨관가지', x: BX, y: 146, group: '호흡기관'},
  {id: 'lungs', label: '폐', x: BX - 40, y: 168, group: '호흡기관'},
  {id: 'heart', label: '심장', x: BX + 18, y: 182, group: '순환기관'},
  {id: 'liver', label: '간', x: BX - 26, y: 214, group: '소화기관', note: '소화를 돕는 기관'},
  {id: 'stomach', label: '위', x: BX + 34, y: 216, group: '소화기관'},
  {id: 'kidney', label: '콩팥', x: BX - 58, y: 240, group: '배설기관'},
  {id: 'small', label: '작은창자', x: BX, y: 262, group: '소화기관'},
  {id: 'large', label: '큰창자', x: BX + 58, y: 258, group: '소화기관'},
  {id: 'bladder', label: '방광', x: BX, y: 304, group: '배설기관'},
  {id: 'anus', label: '항문', x: BX, y: 330, group: '소화기관'},
];
const GROUP_COLOR = {소화기관: '#e8914a', 호흡기관: '#5aa9e6', 순환기관: '#e2483e', 배설기관: '#a77be0'};
function bodyOutline(c, legs = true) {
  c.fillStyle = 'rgba(255,236,214,.95)'; c.strokeStyle = '#b08a6a'; c.lineWidth = 2;
  c.beginPath(); c.arc(BX, 54, 32, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(BX - 14, 84); c.lineTo(BX + 14, 84); c.lineTo(BX + 16, 100); c.lineTo(BX + 78, 108); c.quadraticCurveTo(BX + 92, 112, BX + 92, 130); c.lineTo(BX + 116, 250); c.lineTo(BX + 100, 254); c.lineTo(BX + 80, 160);
  c.lineTo(BX + 74, 320); c.lineTo(BX - 74, 320); c.lineTo(BX - 80, 160); c.lineTo(BX - 100, 254); c.lineTo(BX - 116, 250); c.lineTo(BX - 92, 130); c.quadraticCurveTo(BX - 92, 112, BX - 78, 108); c.lineTo(BX - 16, 100); c.closePath(); c.fill(); c.stroke();
  if (legs) { c.beginPath(); c.moveTo(BX - 70, 318); c.lineTo(BX - 62, 372); c.lineTo(BX - 14, 372); c.lineTo(BX - 6, 330); c.lineTo(BX + 6, 330); c.lineTo(BX + 14, 372); c.lineTo(BX + 62, 372); c.lineTo(BX + 70, 318); c.closePath(); c.fill(); c.stroke(); }
}
function drawBone(c, id) {
  if (id === 'skull') { c.fillStyle = '#f6eed6'; c.strokeStyle = '#8a7a58'; c.lineWidth = 2; c.beginPath(); c.ellipse(BX, 50, 24, 26, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#5a4d3a'; c.beginPath(); c.ellipse(BX - 9, 50, 6, 5, 0, 0, Math.PI * 2); c.ellipse(BX + 9, 50, 6, 5, 0, 0, Math.PI * 2); c.fill(); c.fillRect(BX - 9, 66, 18, 4); }
  if (id === 'spine') for (let y = 86; y <= 300; y += 13) { c.fillStyle = '#efe3c2'; c.strokeStyle = '#8a7a58'; c.lineWidth = 1.5; c.fillRect(BX - 7, y, 14, 10); c.strokeRect(BX - 7, y, 14, 10); }
  if (id === 'ribs') for (let i = 0; i < 6; i++) { const y = 112 + i * 15, w = 62 - Math.abs(i - 2) * 4; c.strokeStyle = '#8a7a58'; c.lineWidth = 6; c.beginPath(); c.ellipse(BX, y, w, 11, 0, Math.PI * 0.05, Math.PI * 0.95); c.stroke(); c.strokeStyle = '#f1e6c8'; c.lineWidth = 3.5; c.beginPath(); c.ellipse(BX, y, w, 11, 0, Math.PI * 0.05, Math.PI * 0.95); c.stroke(); }
  if (id === 'arm') for (const s of [-1, 1]) { bone(c, BX + s * 86, 116, BX + s * 98, 182, 9); bone(c, BX + s * 98, 186, BX + s * 108, 246, 7); }
  if (id === 'leg') for (const s of [-1, 1]) { bone(c, BX + s * 36, 300, BX + s * 38, 336, 10); bone(c, BX + s * 38, 340, BX + s * 40, 370, 8); c.fillStyle = '#f1e6c8'; c.strokeStyle = '#8a7a58'; c.lineWidth = 2; c.beginPath(); c.ellipse(BX, 296, 50, 14, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
}
function drawOrgan(c, o) {
  const col = GROUP_COLOR[o.group];
  c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.5;
  const blob = (x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fill(); c.stroke(); };
  switch (o.id) {
    case 'nose': c.beginPath(); c.moveTo(BX, 40); c.lineTo(BX + 7, 56); c.lineTo(BX - 7, 56); c.closePath(); c.fill(); c.stroke(); break;
    case 'mouth': blob(BX, 70, 11, 4); break;
    case 'trachea': c.fillRect(BX - 19, 92, 9, 48); c.strokeRect(BX - 19, 92, 9, 48); break;
    case 'esophagus': c.fillRect(BX + 12, 92, 8, 104); c.strokeRect(BX + 12, 92, 8, 104); break;
    case 'bronchi': c.lineWidth = 5; c.strokeStyle = col; c.beginPath(); c.moveTo(BX - 14, 138); c.lineTo(BX - 34, 160); c.moveTo(BX - 14, 138); c.lineTo(BX + 6, 160); c.moveTo(BX - 30, 155); c.lineTo(BX - 44, 168); c.stroke(); break;
    case 'lungs': c.globalAlpha = 0.75; blob(BX - 40, 166, 26, 40); blob(BX + 38, 166, 24, 38); c.globalAlpha = 1; break;
    case 'heart': c.beginPath(); c.moveTo(BX + 18, 198); c.bezierCurveTo(BX - 4, 184, BX + 2, 166, BX + 14, 172); c.bezierCurveTo(BX + 22, 162, BX + 40, 170, BX + 18, 198); c.fill(); c.stroke(); break;
    case 'liver': blob(BX - 24, 212, 34, 16, -0.2); break;
    case 'stomach': blob(BX + 34, 216, 20, 15, 0.5); break;
    case 'kidney': blob(BX - 58, 240, 9, 15); blob(BX + 74, 240, 9, 15); break;
    case 'small': c.lineWidth = 5; c.strokeStyle = col; c.beginPath(); for (let i = 0; i < 5; i++) { const y = 246 + i * 8; c.moveTo(BX - 30, y); c.bezierCurveTo(BX - 10, y - 8, BX + 10, y + 8, BX + 30, y); } c.stroke(); break;
    case 'large': c.lineWidth = 9; c.strokeStyle = col; c.beginPath(); c.moveTo(BX - 50, 290); c.lineTo(BX - 50, 236); c.lineTo(BX + 54, 236); c.lineTo(BX + 54, 290); c.stroke(); break;
    case 'bladder': blob(BX, 304, 14, 10); break;
    case 'anus': blob(BX, 330, 5, 5); break;
  }
}
export function stickerBoard({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire), organs = mode === 'organs', spots = organs ? ORGANS : BONES;
  const d = device(el, organs ? '인체 골격 모형과 기관 붙임딱지' : '인체 골격 모형 맞추기', organs ? '몸 그림에 번호 자리가 있다. 기관 붙임딱지를 알맞은 번호 자리에 붙인다.' : '몸 그림에 번호 자리가 있다. 뼈 조각을 알맞은 번호 자리에 붙인다.');
  const {c, status, tray, node} = d;
  const st = memory['stick-' + mode] ??= {placed: [], miss: 0};
  const order = organs ? [...spots].sort((a, b) => a.label.localeCompare(b.label, 'ko')) : [3, 0, 4, 1, 2].map((i) => spots[i]);
  let sel = null, fired = st.placed.length === spots.length;
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eaf4f1'; c.fillRect(0, 0, 720, 380);
    bodyOutline(c);
    if (organs) { for (const id of ['spine', 'ribs']) { c.globalAlpha = 0.25; drawBone(c, id); c.globalAlpha = 1; } }
    spots.forEach((o, i) => { if (st.placed.includes(o.id)) (organs ? drawOrgan(c, o) : drawBone(c, o.id)); });
    spots.forEach((o, i) => {
      if (st.placed.includes(o.id)) return;
      c.fillStyle = sel ? '#ffd34d' : '#2f8a7a'; c.beginPath(); c.arc(o.x, o.y, 10, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#173f38'; c.lineWidth = 1.5; c.stroke();
      text(c, String(i + 1), o.x, o.y + 5, {size: 12, color: sel ? '#3a2a00' : '#fff', align: 'center'});
    });
    // 오른쪽에 붙인 이름 목록(모둠 색)
    let y = 30; text(c, organs ? '붙인 기관' : '붙인 뼈', 560, y, {size: 15});
    for (const o of spots.filter((s) => st.placed.includes(s.id))) { y += 20; c.fillStyle = organs ? GROUP_COLOR[o.group] : '#c9b37a'; c.fillRect(560, y - 12, 12, 12); text(c, o.label + (organs ? ` (${o.note || o.group})` : ''), 578, y, {size: 13, bold: false}); }
    text(c, `${st.placed.length} / ${spots.length}`, 40, 30, {size: 16});
  }
  function place(o) {
    if (!sel) { status.textContent = '먼저 아래에서 붙일 ' + (organs ? '붙임딱지를' : '뼈 조각을') + ' 골라 주세요.'; return; }
    if (sel.id !== o.id) { st.miss++; status.textContent = `그곳은 ${sel.label} 자리가 아니에요. 몸 그림에서 ${jo(sel.label, '이', '가')} 있는 곳을 다시 떠올려 봐요.`; return; }
    st.placed.push(o.id); status.textContent = `${jo(o.label, '을', '를')} 붙였어요.` + (organs ? (o.note ? ' 음식물이 지나가지는 않지만 소화를 도와주는 기관이에요.' : ` ${o.group}이에요.`) : ''); sel = null; draw(); renderTray();
    if (st.placed.length === spots.length && !fired) { fired = true; status.textContent = organs ? '붙임딱지를 모두 붙였어요. 색깔이 같은 기관끼리 함께 일해요.' : '골격 모형을 완성했어요. 뼈는 크기와 생김새가 서로 달라요.'; onAction('placed'); onReady?.(); }
  }
  function renderTray() {
    tray.replaceChildren();
    const left = order.filter((o) => !st.placed.includes(o.id));
    if (!left.length) return;
    tray.append(el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, organs ? '붙임딱지' : '뼈 조각'), el('span', {class: 'bench-seg'}, left.map((o) => { const b = button(o.label, () => { sel = o; status.textContent = `${jo(o.label, '을', '를')} 골랐어요. 몇 번 자리에 붙일까요?`; draw(); renderTray(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(sel === o)); return b; }))));
    if (sel) tray.append(el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, '붙일 자리'), el('span', {class: 'bench-seg'}, spots.map((o, i) => (st.placed.includes(o.id) ? null : button(`${i + 1}번`, () => place(o), 'bench-opt'))).filter(Boolean))));
  }
  d.canvas.addEventListener('click', (e) => {
    const r = d.canvas.getBoundingClientRect(), x = (e.clientX - r.left) * 720 / r.width, y = (e.clientY - r.top) * 380 / r.height;
    const o = spots.find((s) => !st.placed.includes(s.id) && Math.hypot(s.x - x, s.y - y) < 14);
    if (o) place(o);
  });
  draw(); renderTray();
  status.textContent = fired ? '이미 모두 붙였어요.' : organs ? '붙임딱지를 하나 고른 뒤, 몸 그림에서 알맞은 번호 자리를 눌러 붙여요.' : '뼈 조각을 하나 고른 뒤, 몸 그림에서 알맞은 번호 자리를 눌러 붙여요.';
  if (fired) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- 팔: 내 팔 관찰(feel), 빨대 팔 모형(model), 붙는 위치(attach), 로봇 팔(robot)
const SH = {x: 250, y: 78}, EL = {x: 250, y: 238}, FORE = 150;
const dirOf = (f) => ({x: Math.sin(f * R), y: Math.cos(f * R)});
const nOf = (f) => ({x: Math.cos(f * R), y: -Math.sin(f * R)});
function armPoints(f, attach = 'fore') {
  const d = dirOf(f), n = nOf(f);
  const hand = {x: EL.x + d.x * FORE, y: EL.y + d.y * FORE};
  const inA = {x: SH.x + 12, y: SH.y + 16}, outA = {x: SH.x - 12, y: SH.y + 16};
  const inB = attach === 'upper' ? {x: EL.x + 12, y: EL.y - 40} : {x: EL.x + d.x * 42 + n.x * 9, y: EL.y + d.y * 42 + n.y * 9};
  const outB = {x: EL.x - d.x * 16 - n.x * 9, y: EL.y - d.y * 16 - n.y * 9};
  return {hand, inA, inB, outA, outB, inL: Math.hypot(inB.x - inA.x, inB.y - inA.y), outL: Math.hypot(outB.x - outA.x, outB.y - outA.y)};
}
const cm = (px) => (px / 18).toFixed(1);
export function armLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const OWNER = {feel: '내 팔 구부리고 펴기', model: '빨대 팔 모형 (모형 값)', attach: '빨대가 붙는 위치 바꾸기 (모형 값)', robot: '2050년 재활 로봇 팔'}[mode];
  const LABEL = {feel: '옆에서 본 팔. 위팔 안쪽과 바깥쪽 근육의 길이와 굵기가 보인다.', model: '위팔뼈와 아래팔뼈를 할핀으로 잇고 위팔 안쪽과 바깥쪽에 빨대를 붙인 팔 모형', attach: '위팔 안쪽 빨대의 아래 끝을 아래팔뼈나 위팔뼈에 붙여 보는 팔 모형', robot: '근육 줄이 빠진 로봇 팔과 탁자 위 컵'}[mode];
  const d = device(el, OWNER, LABEL), {c, status, tray, node} = d;
  const s = memory['arm-' + mode] ??= {f: mode === 'robot' ? 0 : 10, seen: {}, attach: 'fore', inCord: '', outCord: '', cupUp: false, done: false};
  let f = s.f, goal = s.f, alive = true, raf = 0, fired = !!s.done, cheerAt = 0;
  function draw() {
    if (!alive) return;
    f += (goal - f) * (reduceMotion() ? 1 : 0.18); if (Math.abs(goal - f) < 0.3) f = goal;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = mode === 'robot' ? '#1f2c3a' : '#f3f7f6'; c.fillRect(0, 0, 720, 380);
    const p = armPoints(f, mode === 'attach' ? s.attach : mode === 'robot' ? (s.inCord === 'upper' ? 'upper' : 'fore') : 'fore');
    if (mode === 'feel') drawFeel(p); else if (mode === 'robot') drawRobot(p); else drawModel(p);
    raf = requestAnimationFrame(draw);
  }
  function drawFeel(p) {
    // 팔 살갗
    const d1 = dirOf(f);
    c.strokeStyle = '#f2c9a0'; c.lineCap = 'round'; c.lineWidth = 56; c.beginPath(); c.moveTo(SH.x, SH.y); c.lineTo(EL.x, EL.y); c.lineTo(p.hand.x, p.hand.y); c.stroke();
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(p.hand.x + d1.x * 14, p.hand.y + d1.y * 14, 20, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.35; bone(c, SH.x, SH.y, EL.x, EL.y - 6, 12); bone(c, EL.x, EL.y + 4, p.hand.x, p.hand.y, 10); c.globalAlpha = 1;
    // 근육: 짧아지면 굵어진다
    const muscle = (A, B, L, col, side) => { const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, ang = Math.atan2(B.y - A.y, B.x - A.x), th = Math.max(6, 2200 / L); c.fillStyle = col; c.beginPath(); c.ellipse(mx + side * th * 0.3, my, L / 2, th, ang, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(80,20,20,.5)'; c.lineWidth = 1.5; c.stroke(); };
    muscle(p.inA, p.inB, p.inL, 'rgba(214,72,72,.85)', 1); muscle(p.outA, p.outB, p.outL, 'rgba(196,110,60,.8)', -1);
    chip(c, `위팔 안쪽 근육: ${p.inL < 150 ? '짧고 굵어졌어요' : p.inL > 185 ? '길고 가늘어졌어요' : '보통'}`, 520, 120, 'rgba(255,230,230,.95)', '#8a1f1f');
    chip(c, `위팔 바깥쪽 근육: ${p.outL > 162 ? '길어졌어요' : p.outL < 150 ? '짧아졌어요' : '보통'}`, 520, 160, 'rgba(255,240,225,.95)', '#7a4314');
    text(c, f > 60 ? '팔을 구부린 모습' : '팔을 편 모습', 520, 60, {size: 16, align: 'center'});
  }
  function drawModel(p) {
    bone(c, SH.x, SH.y, EL.x, EL.y, 16); bone(c, EL.x, EL.y, p.hand.x, p.hand.y, 13);
    text(c, '위팔뼈', SH.x - 70, (SH.y + EL.y) / 2, {size: 13}); text(c, '아래팔뼈', (EL.x + p.hand.x) / 2 + 18, (EL.y + p.hand.y) / 2 + 18, {size: 13});
    c.fillStyle = '#c0a050'; c.beginPath(); c.arc(EL.x, EL.y, 5, 0, Math.PI * 2); c.fill(); text(c, '할핀', EL.x - 44, EL.y + 4, {size: 12, bold: false});
    const straw = (A, B, col) => { c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = 7; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.5; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.setLineDash([]); for (const q of [A, B]) { c.fillStyle = '#555'; c.beginPath(); c.arc(q.x, q.y, 3.5, 0, Math.PI * 2); c.fill(); } };
    straw(p.inA, p.inB, '#3d8fd6'); straw(p.outA, p.outB, '#e08a32');
    chip(c, `위팔 안쪽 빨대 ${cm(p.inL)} cm`, 520, 110, 'rgba(225,240,255,.95)', '#1d4f86');
    chip(c, `위팔 바깥쪽 빨대 ${cm(p.outL)} cm`, 520, 146, 'rgba(255,240,225,.95)', '#7a4314');
    if (mode === 'attach') chip(c, s.attach === 'upper' ? '안쪽 빨대 아래 끝: 위팔뼈' : '안쪽 빨대 아래 끝: 아래팔뼈', 520, 186, 'rgba(240,240,200,.95)');
    text(c, f > 60 ? '팔 모형이 구부러졌어요' : f < 20 ? '팔 모형이 펴져 있어요' : '', 520, 60, {size: 16, align: 'center'});
    text(c, '빨대 길이는 모형 값이에요.', 520, 350, {size: 12, bold: false, color: '#51637a', align: 'center'});
  }
  function drawRobot(p) {
    c.fillStyle = '#34485c'; c.fillRect(0, 330, 720, 50); c.fillStyle = '#5b7a96'; c.fillRect(300, 300, 260, 12);
    const metal = (A, B, w) => { c.strokeStyle = '#9fb3c6'; c.lineCap = 'round'; c.lineWidth = w; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.strokeStyle = '#d7e3ee'; c.lineWidth = w * 0.35; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); };
    metal(SH, EL, 20); metal(EL, p.hand, 16);
    c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(EL.x, EL.y, 7, 0, Math.PI * 2); c.fill();
    const cup = s.cupUp || f > 60 ? {x: p.hand.x + 10, y: p.hand.y - 6} : {x: 400, y: 288};
    c.fillStyle = '#f2f2f2'; c.fillRect(cup.x - 12, cup.y - 22, 24, 24); c.fillStyle = '#7fd6ff'; c.fillRect(cup.x - 10, cup.y - 18, 20, 8);
    const cord = (A, B, col, ok) => { c.strokeStyle = ok ? col : 'rgba(255,255,255,.25)'; c.lineWidth = 5; c.setLineDash(ok ? [] : [4, 6]); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.setLineDash([]); };
    if (s.inCord) cord(p.inA, p.inB, '#ff6b6b', true); if (s.outCord) cord(p.outA, s.outCord === 'upper' ? {x: SH.x - 12, y: SH.y + 90} : p.outB, '#ffb347', true);
    text(c, '2050 재활 연구실 로봇 팔', 20, 30, {size: 15, color: '#e8f1ff'});
    // 로봇 얼굴 화면: 근육 줄이 없으면 시무룩, 컵을 들면 놀람, 다 고치면 웃음
    const fx = 110, fy = 120, mood = s.done ? 'happy' : s.cupUp ? 'wow' : 'sad';
    c.fillStyle = '#9fb3c6'; c.fillRect(fx + 52, fy - 6, SH.x - fx - 52, 12);
    c.fillStyle = '#2b3d52'; c.strokeStyle = '#9fb3c6'; c.lineWidth = 3; c.beginPath(); c.roundRect?.(fx - 52, fy - 38, 104, 76, 14); if (!c.roundRect) c.rect(fx - 52, fy - 38, 104, 76); c.fill(); c.stroke();
    c.fillStyle = mood === 'sad' ? '#7fb2d8' : '#7fffb0';
    for (const ex of [-20, 20]) { c.beginPath(); c.ellipse(fx + ex, fy - 8, 7, mood === 'wow' ? 10 : 8, 0, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = c.fillStyle; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath();
    if (mood === 'happy') c.arc(fx, fy + 6, 16, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (mood === 'wow') c.arc(fx, fy + 16, 6, 0, Math.PI * 2);
    else c.arc(fx, fy + 26, 14, 1.2 * Math.PI, 1.8 * Math.PI);
    c.stroke();
    if (s.done) {
      const age = cheerAt ? (performance.now() - cheerAt) / 1000 : 9;
      const rm = reduceMotion(), tw = rm ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(performance.now() / 260));
      c.fillStyle = `rgba(255,224,110,${tw})`;
      for (const [sx, sy] of [[-30, -34], [34, -28], [-38, 6], [40, 10]]) { const x = 400 + sx, y = 268 + sy; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 2.5 : 7; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); }
      if (age < 5) {
        const msg = '고마워요, 다시 컵을 들어요';
        c.font = FONT(14, true); const w = c.measureText(msg).width + 24, bx = 16, by = fy + 52;
        c.globalAlpha = Math.max(0, Math.min(1, (5 - age) / 0.5));
        c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(fx - 8, by + 1); c.lineTo(fx, by - 10); c.lineTo(fx + 8, by + 1); c.fill();
        c.fillRect(bx, by, w, 28); text(c, msg, bx + w / 2, by + 19, {size: 14, color: '#1d4f86', align: 'center'});
        c.globalAlpha = 1;
      }
    }
    text(c, s.done ? '로봇 팔이 컵을 들었다가 내려놓았어요.' : s.cupUp ? '컵을 들었어요. 이제 내려놓아 봐요.' : '근육 줄 두 가닥을 이어야 움직일 수 있어요.', 360, 370, {size: 13, color: '#ffe9a8', align: 'center'});
  }
  function bend(by) { // by: 'in' 안쪽 빨대 줄이기, 'out' 바깥쪽 빨대 줄이기
    if (mode === 'attach' && by === 'in' && s.attach === 'upper') { s.seen.upperPull = true; status.textContent = '빨대는 짧아졌지만 양 끝이 모두 위팔뼈에 붙어 있어서 팔 모형이 움직이지 않아요.'; check(); return; }
    const before = goal;
    goal = by === 'in' ? Math.min(120, goal + 25) : Math.max(0, goal - 25);
    if (goal === before) { status.textContent = by === 'in' ? '더 줄일 수 없을 만큼 구부러졌어요. 이번에는 바깥쪽 빨대를 줄여 봐요.' : '팔 모형이 다 펴졌어요. 안쪽 빨대를 줄여 봐요.'; return; }
    if (by === 'in') { s.seen.bent = true; if (mode === 'attach') s.seen.forePull = true; status.textContent = `위팔 안쪽 빨대를 줄였더니 아래팔뼈가 당겨져 팔 모형이 ${goal > 50 ? '' : '조금 '}구부러졌어요. 이때 바깥쪽 빨대는 길어져요.`; }
    // 펴는 것은 먼저 구부린 뒤에 해야 센다(바깥쪽부터 눌러 거의 펴진 팔을 조금 더 펴는 것만으로 끝나지 않게).
    // 장면 글과 같은 기준(20 미만이면 「펴져 있어요」)으로 다 펴졌을 때만 「폈다」로 센다. 조금 펴졌으면 더 줄여 보라고 알려 준다
    else { if (s.seen.bent && goal < 20) s.seen.straight = true; status.textContent = goal < 20 ? '위팔 바깥쪽 빨대를 줄였더니 팔 모형이 다 펴졌어요. 이때 안쪽 빨대는 길어져요.' : '위팔 바깥쪽 빨대를 줄였더니 팔 모형이 조금 펴졌어요. 바깥쪽 빨대를 더 줄이면 다 펴져요.'; }
    s.f = goal; check();
  }
  function check() {
    if (fired) return;
    const ok = mode === 'model' ? s.seen.bent && s.seen.straight && goal <= 30 : mode === 'attach' ? s.seen.upperPull && s.seen.forePull : false;
    if (ok) { fired = true; s.done = true; status.textContent += mode === 'model' ? ' 빨대가 짧아지면 뼈가 당겨져 움직여요.' : ' 근육의 양 끝은 서로 다른 뼈에 붙어 있어야 몸이 움직여요.'; onAction(mode === 'model' ? 'pulled' : 'attached'); onReady?.(); }
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'feel') {
      tray.append(button('팔 구부리기', () => { goal = 110; s.f = goal; s.seen.bend = true; status.textContent = '팔을 구부렸어요. 위팔 안쪽을 보세요. 근육이 짧아지면서 볼록해졌어요.'; feelDone(); }, 'bench-opt'),
        button('팔 펴기', () => { goal = 5; s.f = goal; s.seen.extend = true; status.textContent = '팔을 폈어요. 위팔 안쪽 근육은 다시 길어지고, 바깥쪽 근육이 짧아졌어요.'; feelDone(); }, 'bench-opt'));
      return;
    }
    if (mode === 'robot') {
      tray.append(seg(el, button, '안쪽 근육 줄', [['fore', '위팔 앞쪽에서 아래팔뼈로'], ['upper', '위팔 앞쪽에서 위팔뼈 아래쪽으로']], s.inCord, (v) => { s.inCord = v; s.cupUp = false; goal = 0; s.f = 0; status.textContent = '안쪽 근육 줄을 이었어요.'; renderTray(); }),
        seg(el, button, '바깥쪽 근육 줄', [['back', '위팔 뒤쪽에서 팔꿈치 뒤 아래팔뼈로'], ['upper', '위팔 뒤쪽에서 위팔뼈 가운데로']], s.outCord, (v) => { s.outCord = v; status.textContent = '바깥쪽 근육 줄을 이었어요.'; renderTray(); }),
        button('안쪽 줄 당겨 컵 들기', () => { if (!s.inCord) return void (status.textContent = '먼저 안쪽 근육 줄을 이어 주세요.'); if (s.inCord === 'upper') return void (status.textContent = '줄은 짧아졌지만 양 끝이 모두 위팔에 붙어 있어 팔이 그대로예요. 줄 끝을 아래팔뼈로 옮겨 봐요.'); goal = 105; s.f = goal; s.cupUp = true; status.textContent = '안쪽 줄이 짧아지며 아래팔을 당겨 컵을 들었어요.'; }, 'mission-go'),
        button('바깥쪽 줄 당겨 컵 내려놓기', () => { if (!s.cupUp) return void (status.textContent = '먼저 컵을 들어 보세요.'); if (s.outCord !== 'back') return void (status.textContent = s.outCord ? '줄 양 끝이 모두 위팔에 붙어 있어 팔이 펴지지 않아요. 팔꿈치 뒤 아래팔뼈로 이어 봐요.' : '바깥쪽 근육 줄이 없어서 팔을 펼 수 없어요.'); goal = 0; s.f = 0; s.cupUp = false; if (!fired) { fired = true; s.done = true; cheerAt = performance.now(); status.textContent = '바깥쪽 줄이 짧아지며 팔이 펴져 컵을 내려놓았어요. 로봇 팔이 다시 움직여요.'; onAction('fixed'); onReady?.(); } }, 'mission-go'));
      return;
    }
    if (mode === 'attach') tray.append(seg(el, button, '안쪽 빨대 아래 끝', [['fore', '아래팔뼈에 붙이기'], ['upper', '위팔뼈에 붙이기']], s.attach, (v) => { s.attach = v; goal = 10; s.f = 10; status.textContent = v === 'upper' ? '안쪽 빨대의 양 끝을 모두 위팔뼈에 붙였어요. 줄여 보세요.' : '안쪽 빨대 아래 끝을 아래팔뼈에 붙였어요. 줄여 보세요.'; renderTray(); }));
    tray.append(button('위팔 안쪽 빨대 줄이기', () => bend('in'), 'bench-opt'));
    if (mode === 'model') tray.append(button('위팔 바깥쪽 빨대 줄이기', () => bend('out'), 'bench-opt'));
  }
  function feelDone() { if (!fired && s.seen.bend && s.seen.extend) { fired = true; s.done = true; onAction('felt'); onReady?.(); } }
  renderTray();
  status.textContent = fired ? '이미 해 봤어요. 다시 조작해 봐도 괜찮아요.' : {feel: '팔을 구부리고 펴면서 위팔 안쪽과 바깥쪽 근육을 살펴보세요.', model: '빨대는 근육을 나타내요. 안쪽 빨대와 바깥쪽 빨대를 차례로 줄여 보세요.', attach: '안쪽 빨대 아래 끝을 아래팔뼈에 붙였을 때와 위팔뼈에 붙였을 때 각각 줄여 보세요.', robot: '근육 줄 두 가닥을 알맞게 잇고 컵을 들었다가 내려놓아 보세요.'}[mode];
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 숨쉬기: 누르고 있는 동안 들이마시고, 떼면 내쉰다
export function breathLab({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '숨쉬기 관찰 (모형)', '가슴 속 폐와 갈비뼈, 가로막. 숨을 들이마시면 가슴이 커지고 공기가 코, 숨관, 숨관가지를 지나 폐로 들어간다.'), {c, status, tray, node} = d;
  const s = memory.breath ??= {n: 0, done: false};
  let v = 0, holding = false, peak = false, alive = true, raf = 0, k = 0, fired = s.done;
  function draw() {
    if (!alive) return; k++;
    v += ((holding ? 1 : 0) - v) * (reduceMotion() ? 1 : 0.05);
    if (v > 0.9) peak = true;
    if (peak && v < 0.12) { peak = false; s.n++; status.textContent = `숨을 ${s.n}번 쉬었어요.` + (s.n >= 2 ? '' : ' 한 번 더 해 봐요.'); if (s.n >= 2 && !fired) { fired = true; s.done = true; status.textContent = '숨을 들이마실 때는 가슴이 커지며 공기가 들어오고, 내쉴 때는 가슴이 작아지며 공기가 나가요.'; onAction('breathed'); onReady?.(); } }
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef6fb'; c.fillRect(0, 0, 720, 380);
    const cx = 250, w = 92 + v * 14;
    // 몸통과 갈비뼈
    c.fillStyle = '#ffe9d6'; c.strokeStyle = '#b08a6a'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, 26, 26, 24, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(cx - 12, 48); c.lineTo(cx + 12, 48); c.lineTo(cx + w, 110); c.lineTo(cx + w - 6, 300); c.lineTo(cx - w + 6, 300); c.lineTo(cx - w, 110); c.closePath(); c.fill(); c.stroke();
    // 폐
    const lr = 0.82 + v * 0.22; c.fillStyle = 'rgba(240,140,150,.75)'; c.strokeStyle = '#b05060';
    for (const sgn of [-1, 1]) { c.beginPath(); c.ellipse(cx + sgn * 42, 170, 34 * lr, 62 * lr, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    // 숨관과 숨관가지
    c.strokeStyle = '#5aa9e6'; c.lineWidth = 7; c.beginPath(); c.moveTo(cx, 40); c.lineTo(cx, 110); c.moveTo(cx, 110); c.lineTo(cx - 30, 140); c.moveTo(cx, 110); c.lineTo(cx + 30, 140); c.stroke();
    // 갈비뼈
    for (let i = 0; i < 6; i++) { const y = 104 + i * 26 - v * 6; c.strokeStyle = '#c9b37a'; c.lineWidth = 4; c.beginPath(); c.ellipse(cx, y, w - 8, 14, 0, Math.PI * 0.08, Math.PI * 0.92); c.stroke(); }
    // 가로막
    const dy = 252 + v * 26; c.strokeStyle = '#a0522d'; c.lineWidth = 6; c.beginPath(); c.moveTo(cx - w + 10, 262); c.quadraticCurveTo(cx, dy - 40 + v * 30, cx + w - 10, 262); c.stroke();
    // 공기 알갱이
    const flow = holding ? 1 : v > 0.05 ? -1 : 0;
    for (let i = 0; i < 8 && flow; i++) { const t = ((k * 0.02 + i / 8) % 1), tt = flow > 0 ? t : 1 - t, y = 10 + tt * 150, x = cx + (y > 110 ? (i % 2 ? -1 : 1) * (y - 110) * 0.8 : 0); c.fillStyle = flow > 0 ? 'rgba(80,170,255,.9)' : 'rgba(150,150,150,.9)'; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill(); }
    text(c, '코', cx + 34, 30, {size: 13}); text(c, '숨관', cx + 12, 84, {size: 13}); text(c, '숨관가지', cx + 34, 132, {size: 13}); text(c, '폐', cx + 86, 176, {size: 13}); text(c, '갈비뼈', cx - w - 54, 130, {size: 13}); text(c, '가로막', cx - w - 54, 270, {size: 13});
    text(c, holding ? '숨을 들이마셔요' : v > 0.05 ? '숨을 내쉬어요' : '숨을 멈췄어요', 540, 60, {size: 17, align: 'center'});
    text(c, holding ? '갈비뼈가 올라가고 가로막이 내려가요' : v > 0.05 ? '갈비뼈가 내려오고 가로막이 올라가요' : '', 540, 96, {size: 14, bold: false, align: 'center'});
    text(c, holding ? '산소가 든 공기가 폐로 들어가요' : v > 0.05 ? '이산화 탄소가 더해진 공기가 나가요' : '', 540, 126, {size: 14, bold: false, align: 'center'});
    c.fillStyle = '#dfe9f2'; c.fillRect(470, 160, 140, 18); c.fillStyle = '#5aa9e6'; c.fillRect(470, 160, 140 * v, 18); text(c, '가슴 크기', 540, 196, {size: 12, bold: false, align: 'center'});
    raf = requestAnimationFrame(draw);
  }
  const hold = button('숨 들이마시기 (누르고 있기)', () => {}, 'signal-hold');
  const on = (e) => { e.preventDefault?.(); holding = true; }, off = () => { holding = false; };
  hold.addEventListener('pointerdown', on); hold.addEventListener('pointerup', off); hold.addEventListener('pointerleave', off); hold.addEventListener('pointercancel', off);
  hold.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') on(e); }); hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') off(); });
  tray.append(hold);
  status.textContent = fired ? '이미 해 봤어요.' : '단추를 누르고 있으면 숨을 들이마시고, 떼면 내쉬어요. 숨을 두 번 쉬어 보세요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 펌프 실험: 펌프를 느리게, 빠르게 눌러 붉은 색소 물의 이동을 본다
export function pumpLab({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '혈액 순환 실험 장치 (모형)', '붉은 색소 물이 담긴 수조, 구멍 두 개 뚫린 뚜껑, 비닐 호스가 달린 수동 펌프'), {c, status, tray, node} = d;
  const s = memory.pump ??= {slow: false, fast: false, done: false};
  let speed = 0, left = 0, phase = 0, alive = true, raf = 0, k = 0, fired = s.done, presses = 0;
  const path = [[150, 300], [150, 120], [360, 70], [570, 120], [570, 300]];
  const along = (t) => { const segs = path.length - 1, i = Math.min(segs - 1, Math.floor(t * segs)), u = t * segs - i, a = path[i], b = path[i + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };
  function draw() {
    if (!alive) return; k++;
    if (left > 0) { left--; phase = (phase + speed) % 1; presses += speed > 0.01 ? 1 : 0; if (!left) speed = 0; }
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#f4f8fb'; c.fillRect(0, 0, 720, 380);
    c.fillStyle = 'rgba(210,60,60,.55)'; c.fillRect(110, 290, 500, 70); c.strokeStyle = '#6b8aa8'; c.lineWidth = 3; c.strokeRect(110, 270, 500, 92); c.fillStyle = '#9fb3c6'; c.fillRect(104, 262, 512, 10);
    c.strokeStyle = 'rgba(160,190,220,.9)'; c.lineWidth = 14; c.lineJoin = 'round'; c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    c.strokeStyle = 'rgba(200,40,40,.85)'; c.lineWidth = 8; c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    for (let i = 0; i < 10; i++) { const [x, y] = along((phase + i / 10) % 1); c.fillStyle = '#ffd6d6'; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); }
    const squeeze = left > 0 ? Math.abs(Math.sin(k * speed * 2.2)) : 0;
    c.fillStyle = '#3a4a5a'; c.beginPath(); c.ellipse(360, 70, 42 - squeeze * 10, 26 - squeeze * 6, 0, 0, Math.PI * 2); c.fill();
    text(c, '펌프', 360, 30, {size: 14, align: 'center'}); text(c, '비닐 호스', 560, 200, {size: 13, align: 'left'}); text(c, '붉은 색소 물', 360, 330, {size: 13, color: '#fff', align: 'center'});
    text(c, left > 0 ? (speed > 0.012 ? '빠르게 누르는 중' : '천천히 누르는 중') : '펌프를 눌러 보세요', 360, 236, {size: 15, align: 'center'});
    raf = requestAnimationFrame(draw);
  }
  const press = (fast) => {
    speed = fast ? 0.02 : 0.006; left = 150;
    if (fast) s.fast = true; else s.slow = true;
    status.textContent = fast ? '펌프를 빠르게 누르니 붉은 색소 물이 호스를 따라 빠르게 돌아요.' : '펌프를 천천히 누르니 붉은 색소 물이 호스를 따라 천천히 돌아요.';
    if (!fired && s.slow && s.fast) { fired = true; s.done = true; status.textContent += ' 펌프를 빨리 누를수록 물이 빨리 돌았어요.'; onAction('pumped'); onReady?.(); }
  };
  tray.append(button('펌프 천천히 누르기', () => press(false), 'bench-opt'), button('펌프 빠르게 누르기', () => press(true), 'bench-opt'));
  status.textContent = fired ? '이미 해 봤어요.' : '펌프를 천천히 눌렀을 때와 빠르게 눌렀을 때를 모두 해 보세요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 운동할 때 몸의 변화: 평상시, 1분 제자리 달리기 직후, 5분 쉰 뒤 (모형 값)
const EXER = [
  {id: 'rest', label: '평상시', btn: '평상시 체온과 심장 박동 수 재기', temp: 36.5, beat: 84, breath: 18},
  {id: 'run', label: '1분 제자리 달리기 직후', btn: '1분 제자리 달리기 뒤 바로 재기', temp: 37.0, beat: 128, breath: 34},
  {id: 'after', label: '5분 쉰 뒤', btn: '5분 쉰 뒤 다시 재기', temp: 36.6, beat: 90, breath: 20},
];
export function exerciseLab({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '운동할 때 몸의 변화 측정 (모형 값)', '체온계와 심장 박동 수 측정기로 평상시, 제자리 달리기 직후, 쉰 뒤를 재는 장면'), {c, status, tray, node} = d;
  const s = memory.exer ??= {rec: [], done: false};
  let cur = s.rec.length ? EXER[s.rec.length - 1] : EXER[0], alive = true, raf = 0, k = 0, fired = s.done, running = 0;
  function draw() {
    if (!alive) return; k++; if (running) running--;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#f5f8f2'; c.fillRect(0, 0, 720, 380);
    const bob = running ? Math.abs(Math.sin(k / 4)) * 14 : 0, x = 140, y = 250 - bob;
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(x, y - 120, 22, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3d6fb4'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y - 96); c.lineTo(x, y - 30); c.stroke();
    c.strokeStyle = '#26456e'; c.lineWidth = 12; const sw = running ? Math.sin(k / 4) * 22 : 0; c.beginPath(); c.moveTo(x, y - 30); c.lineTo(x - 14 + sw, y + 40); c.moveTo(x, y - 30); c.lineTo(x + 14 - sw, y + 40); c.stroke();
    c.strokeStyle = '#f2c9a0'; c.lineWidth = 9; c.beginPath(); c.moveTo(x, y - 86); c.lineTo(x - 30 - sw, y - 46); c.moveTo(x, y - 86); c.lineTo(x + 30 + sw, y - 46); c.stroke();
    // 심장
    const beat = cur.beat / 60, pulse = 1 + 0.18 * Math.max(0, Math.sin(k / 60 * Math.PI * 2 * beat * 0.5));
    c.fillStyle = '#e2483e'; c.save(); c.translate(x + 6, y - 78); c.scale(pulse, pulse); c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-14, -2, -8, -14, 0, -6); c.bezierCurveTo(8, -14, 14, -2, 0, 8); c.fill(); c.restore();
    if (running && k % 20 < 10) { c.fillStyle = 'rgba(120,180,255,.8)'; c.beginPath(); c.arc(x + 26, y - 128, 4, 0, Math.PI * 2); c.fill(); }
    // 기록표
    const tx = 300; text(c, '측정 기록 (모형 값)', tx, 40, {size: 15});
    const cols = ['때', '체온', '심장 박동 수', '숨 쉬는 횟수'], cw = [150, 80, 110, 100]; let cx = tx;
    cols.forEach((h, i) => { c.fillStyle = '#dbe8d4'; c.fillRect(cx, 56, cw[i] - 4, 26); text(c, h, cx + 6, 74, {size: 13}); cx += cw[i]; });
    EXER.forEach((e, r) => { cx = tx; const got = s.rec.includes(e.id), row = [e.label, got ? `${e.temp.toFixed(1)} °C` : '', got ? `${e.beat}회/분` : '', got ? `${e.breath}회/분` : '']; row.forEach((v, i) => { c.fillStyle = '#fff'; c.fillRect(cx, 86 + r * 32, cw[i] - 4, 28); text(c, v, cx + 6, 105 + r * 32, {size: 13, bold: i === 0}); cx += cw[i]; }); });
    text(c, running ? '제자리 달리기를 하는 중이에요' : '', 470, 230, {size: 14, align: 'center', color: '#3d6fb4'});
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    const next = EXER[s.rec.length];
    if (!next) return;
    tray.append(button(next.btn, () => {
      if (next.id === 'run') running = 110;
      s.rec.push(next.id); cur = next;
      status.textContent = `${next.label}: 체온 ${next.temp.toFixed(1)} °C, 심장 박동 수 ${next.beat}회/분이에요.` + (next.id === 'run' ? ' 심장이 평상시보다 빨리 뛰고 숨도 가빠졌어요.' : next.id === 'after' ? ' 쉬고 나니 평상시와 비슷해졌어요.' : '');
      renderTray();
      if (s.rec.length === EXER.length && !fired) { fired = true; s.done = true; onAction('measured'); onReady?.(); }
    }, 'mission-go'));
  }
  renderTray();
  status.textContent = fired ? '이미 모두 쟀어요.' : '평상시, 1분 동안 제자리 달리기를 한 직후, 5분 쉰 뒤 차례로 재요. 달릴 때는 친구와 부딪치지 않게 거리를 둬요.';
  if (fired) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- 건강 생활 30일: 습관 다섯 가지를 골라 30일을 지내면 기관 계기판이 바뀐다(모형 값)
const ORG4 = [['dig', '소화기관'], ['res', '호흡기관'], ['cir', '순환기관'], ['exc', '배설기관']];
export const HABITS = [
  {id: 'chew', label: '음식을 천천히 꼭꼭 씹어 먹기', eff: {dig: 1}},
  {id: 'wash', label: '흐르는 물에 비누로 30초 이상 손 씻기', eff: {res: 1}},
  {id: 'mask', label: '감기가 돌 때 사람이 많은 곳에서 마스크 쓰기', eff: {res: 1}},
  {id: 'exercise', label: '하루에 30분씩 운동하기', eff: {cir: 1, res: 0.4}},
  {id: 'salt', label: '음식을 싱겁게 먹기', eff: {cir: 1}},
  {id: 'water', label: '물을 충분히 마시고 오줌을 참지 않기', eff: {exc: 1}},
  {id: 'gulp', label: '음식을 급하게 삼키기', eff: {dig: -1}},
  {id: 'salty', label: '짠 과자를 자주 먹기', eff: {cir: -1}},
  {id: 'hold', label: '오줌을 오래 참기', eff: {exc: -1}},
  {id: 'rub', label: '씻지 않은 손으로 눈, 코, 입 만지기', eff: {res: -1}},
];
export function habitSim({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = act(task, fire);
  const d = device(el, '건강 생활 30일 (모형 값)', '습관 다섯 가지를 골라 30일을 지내면 소화기관, 호흡기관, 순환기관, 배설기관 계기판이 바뀌는 모형'), {c, status, tray, node} = d;
  const s = memory.habit ??= {pick: [], runs: 0, done: false, last: null};
  let day = 0, g = {dig: 70, res: 70, cir: 70, exc: 70}, timer = 0, fired = s.done;
  if (s.last) g = {...s.last};
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#f2f8f6'; c.fillRect(0, 0, 720, 380);
    text(c, `${day}일째`, 40, 44, {size: 22}); text(c, '계기판 값은 비교용 모형 값이에요.', 40, 70, {size: 12, bold: false, color: '#51637a'});
    ORG4.forEach(([k, n], i) => {
      const y = 110 + i * 62, v = g[k];
      text(c, n, 40, y + 4, {size: 15});
      c.fillStyle = '#dfe8e5'; c.fillRect(150, y - 14, 320, 24); c.fillStyle = v >= 80 ? '#3fae6a' : v >= 60 ? '#e7b13a' : '#e2683e'; c.fillRect(150, y - 14, 320 * v / 100, 24);
      c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(150 + 320 * 0.8, y - 18); c.lineTo(150 + 320 * 0.8, y + 14); c.stroke();
      text(c, String(Math.round(v)), 482, y + 4, {size: 14});
    });
    text(c, '건강한 기준', 150 + 320 * 0.8, 92, {size: 11, bold: false, align: 'center'});
    text(c, '고른 습관', 540, 44, {size: 14});
    s.pick.forEach((id, i) => { const h = HABITS.find((x) => x.id === id), good = Object.values(h.eff).some((v) => v > 0); c.fillStyle = good ? '#3fae6a' : '#e2683e'; c.fillRect(540, 58 + i * 26, 8, 18); text(c, h.label.length > 13 ? h.label.slice(0, 13) + '…' : h.label, 554, 72 + i * 26, {size: 12, bold: false}); });
  }
  function run() {
    if (s.pick.length !== 5) { status.textContent = '습관을 다섯 가지 골라 주세요.'; return; }
    clearInterval(timer); day = 0; g = {dig: 70, res: 70, cir: 70, exc: 70};
    const step = () => {
      day++;
      for (const [k] of ORG4) { const e = s.pick.reduce((n, id) => n + (HABITS.find((h) => h.id === id).eff[k] || 0), 0); g[k] = Math.max(30, Math.min(100, g[k] + e * 0.6 - 0.1)); }
      draw();
      if (day >= 30) {
        clearInterval(timer); s.runs++; s.last = {...g};
        const low = ORG4.filter(([k]) => g[k] < 80).map(([, n]) => n);
        if (!low.length) { status.textContent = '30일 동안 네 기관 계기판이 모두 건강한 기준을 넘었어요.'; if (!fired) { fired = true; s.done = true; onAction('healthy'); onReady?.(); } }
        else status.textContent = `${low.join(', ')} 계기판이 기준에 닿지 않았어요. 그 기관을 돕는 습관이 빠졌는지, 좋지 않은 습관이 들어 있는지 살펴보고 다시 골라 봐요.`;
        renderTray();
      }
    };
    if (reduceMotion()) { for (let i = 0; i < 30; i++) step(); } else timer = setInterval(step, 60);
  }
  function renderTray() {
    tray.replaceChildren();
    tray.append(el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, `습관 고르기 ${s.pick.length}/5`), el('span', {class: 'bench-seg habit-seg'}, HABITS.map((h) => {
      const b = button(h.label, () => { const i = s.pick.indexOf(h.id); if (i >= 0) s.pick.splice(i, 1); else if (s.pick.length < 5) s.pick.push(h.id); else { status.textContent = '다섯 가지까지 고를 수 있어요. 하나를 빼고 골라 주세요.'; return; } draw(); renderTray(); }, 'bench-opt');
      b.setAttribute('aria-pressed', String(s.pick.includes(h.id))); return b;
    }))), button('30일 지내 보기', run, 'mission-go'));
  }
  draw(); renderTray();
  status.textContent = fired ? '이미 건강한 30일을 보냈어요. 다른 습관으로 다시 해 봐도 괜찮아요.' : '날마다 할 습관 다섯 가지를 골라 30일을 지내 보세요. 네 기관 계기판이 모두 건강한 기준을 넘게 해 봐요.';
  if (fired) later(onReady);
  return {node, stop: () => clearInterval(timer)};
}
