// 불꽃 에너지 지구(2단원 물질의 연소) 조작 장면. 화면의 시간, 단계, 온도 변화 모습은 모형 값이다.
// 교과서에 나온 값(식초 5 mL 정도, 우유 60 °C, 심지 0.5 cm)만 실제 값으로 쓴다.
const R = Math.PI / 180;
const FONT = (s, b) => `${b ? 'bold ' : ''}${s}px "Malgun Gothic",sans-serif`;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const pick = (el, button, list, cur, on, cls = 'bench-opt') => el('div', {class: 'bench-seg'}, list.map(([id, label]) => { const b = button(label, () => on(id), cls); b.setAttribute('aria-pressed', String(cur === id)); return b; }));
function device(el, owner, label, extra = []) {
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: 1440, height: 760, role: 'img', 'aria-label': label});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device sun'}, el('div', {class: 'signal-owner'}, owner), canvas, tray, ...extra, status);
  const c = canvas.getContext('2d');
  keepTrayFocus(tray);
  return {canvas, status, tray, node, c};
}
// 단추 줄을 다시 그려도 키보드 초점이 같은 단추(없으면 진행 단추)에 남게 한다(mission-energy.mjs의 device와 같은 방식).
function keepTrayFocus(tray) {
  const fill = tray.replaceChildren.bind(tray);
  tray.replaceChildren = (...kids) => {
    const a = document.activeElement, key = a && tray.contains(a) ? a.getAttribute('aria-label') || a.textContent : null;
    fill(...kids);
    if (key) queueMicrotask(() => { const all = [...tray.querySelectorAll('button')].filter((b) => !b.disabled); (all.find((b) => (b.getAttribute('aria-label') || b.textContent) === key) || all.find((b) => b.classList.contains('mission-go')) || all[0])?.focus({preventScroll: true}); });
  };
}
function flame(c, x, y, h, {alcohol = false, t = 0, dark = false}) {
  const wob = Math.sin(t / 7) * 2;
  if (alcohol) {
    const g = c.createLinearGradient(x, y - h, x, y); g.addColorStop(0, dark ? 'rgba(255,140,60,.55)' : 'rgba(255,150,70,.25)'); g.addColorStop(0.6, dark ? 'rgba(255,120,60,.45)' : 'rgba(255,130,60,.2)'); g.addColorStop(1, dark ? 'rgba(80,140,255,.9)' : 'rgba(90,150,255,.45)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x, y - h + wob); c.quadraticCurveTo(x + h * 0.32, y - h * 0.35, x, y); c.quadraticCurveTo(x - h * 0.32, y - h * 0.35, x, y - h + wob); c.fill();
    return;
  }
  const g = c.createLinearGradient(x, y - h, x, y); g.addColorStop(0, 'rgba(255,90,40,.85)'); g.addColorStop(0.45, 'rgba(255,190,60,.95)'); g.addColorStop(0.85, 'rgba(255,240,180,1)'); g.addColorStop(1, 'rgba(70,120,255,.9)');
  c.fillStyle = g; c.beginPath(); c.moveTo(x, y - h + wob); c.quadraticCurveTo(x + h * 0.3, y - h * 0.3, x, y); c.quadraticCurveTo(x - h * 0.3, y - h * 0.3, x, y - h + wob); c.fill();
}

// ---------------------------------------------------------------- R2-G01 양초 공방 작업대
const SHAPES = [['lion', '사자'], ['penguin', '펭귄'], ['pillar', '원기둥']];
function candleBody(c, x, y, shape, scale, col) {
  c.fillStyle = col;
  const w = 70 * scale, h = 90 * scale;
  if (shape === 'pillar') { c.fillRect(x - w / 2, y - h, w, h); return y - h; }
  c.beginPath(); c.ellipse(x, y - h * 0.45, w * 0.55, h * 0.5, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x, y - h * 0.95, w * 0.36, 0, Math.PI * 2); c.fill();
  if (shape === 'lion') { c.fillStyle = 'rgba(180,90,20,.8)'; c.beginPath(); c.arc(x, y - h * 0.95, w * 0.5, 0, Math.PI * 2); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(x, y - h * 0.95, w * 0.34, 0, Math.PI * 2); c.fill(); }
  if (shape === 'penguin') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y - h * 0.4, w * 0.3, h * 0.35, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f0a020'; c.beginPath(); c.moveTo(x - 6, y - h * 0.92); c.lineTo(x + 6, y - h * 0.92); c.lineTo(x, y - h * 0.84); c.fill(); }
  c.fillStyle = '#222'; c.beginPath(); c.arc(x - w * 0.12, y - h * 0.98, 2.5, 0, Math.PI * 2); c.arc(x + w * 0.12, y - h * 0.98, 2.5, 0, Math.PI * 2); c.fill();
  return y - h * 1.3;
}
export function candleBench({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const d = device(el, {safety: '양초 공방 작업대 안전 점검', make: '양초 공방 작업대 (모형)', gallery: '반 공방 전시관'}[mode], '양초 공방 작업대');
  const {c, status, tray, node} = d;
  const s = memory.candle ??= {shape: null, step: 0, burn: 0, lit: false, name: null, posted: false};
  const safe = memory.candleSafe ??= {};
  let alive = true, raf = 0, t = 0, ff = 0;
  const COL = {lion: '#f2b24a', penguin: '#3a4a66', pillar: '#e87a9a'};
  const STEPS = ['양초 점토 반죽하기', '찰흙 칼로 모양 만들기', '이쑤시개로 심지 구멍 내기', '심지 꽂기', '점화기 잠금 풀고 심지에 불 붙이기'];
  function draw() {
    if (!alive) return; t++;
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.fillStyle = s.lit && ff > 0 ? '#2a2420' : '#efe4cf'; c.fillRect(0, 0, 720, 380);
    c.fillStyle = '#b98a55'; c.fillRect(0, 290, 720, 90);
    if (mode === 'safety') {
      const items = [['paper', '신문지', safe.paper, 150], ['board', '찰흙 판', safe.board, 290], ['goggles', '보안경', safe.goggles, 430], ['gloves', '장갑', safe.gloves, 540], ['lock', '점화기 잠금', safe.lock, 640]];
      if (!safe.paper) { c.fillStyle = '#ddd'; c.fillRect(90, 250, 130, 44); c.fillStyle = '#999'; for (let i = 0; i < 6; i++) c.fillRect(100, 258 + i * 6, 110, 2); }
      if (!safe.board) { c.fillStyle = '#8b6b4a'; c.fillRect(240, 262, 100, 30); }
      c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center';
      items.forEach(([k, n, ok, x]) => { c.fillStyle = ok ? '#2f9a4f' : '#b4531a'; c.fillText(n, x, 322); c.fillText(ok ? '완료' : '확인 필요', x, 342); }); // 이름과 상태를 두 줄로 써서 이웃 글씨와 겹치지 않게
      c.fillStyle = '#c0392b'; c.fillRect(620, 220, 40, 60); c.fillStyle = safe.lock ? '#2f9a4f' : '#f0b43c'; c.fillRect(628, 206, 24, 14);
      raf = requestAnimationFrame(draw); return;
    }
    if (mode === 'gallery') {
      const shelf = [[140, s.shape || 'pillar', '내 양초'], [320, 'penguin', '친구 양초 1'], [480, 'lion', '친구 양초 2'], [620, 'pillar', '친구 양초 3']];
      c.fillStyle = '#7a5a3a'; c.fillRect(60, 280, 620, 12);
      shelf.forEach(([x, sh, lab], i) => { if (i === 0 && !s.posted) return; candleBody(c, x, 280, sh, 0.8, i ? ['#6aa0d8', '#e0a040', '#9ad06a'][i - 1] : COL[sh]); c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'center'; c.fillText(i === 0 ? (s.name || '내 양초') : lab, x, 312); });
      raf = requestAnimationFrame(draw); return;
    }
    // make
    const cx = 360, base = 290, shrink = Math.max(0.35, 1 - s.burn * 0.65);
    // s.step은 마친 단계 수다. 반죽(1) 뒤에는 반죽 덩어리, 모양 만들기(2) 뒤에 모양, 구멍(3) 뒤에 구멍, 심지 꽂기(4) 뒤에 심지를 그린다.
    if (s.step >= 2) {
      if (s.burn > 0.02) { c.globalAlpha = 0.22; candleBody(c, cx - 190, base, s.shape || 'pillar', 1.7, COL[s.shape || 'pillar']); c.globalAlpha = 1; c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'center'; c.fillText('처음 크기', cx - 190, base + 22); }
      const top = candleBody(c, cx, base, s.shape || 'pillar', shrink * 1.7, COL[s.shape || 'pillar']);
      if (s.step >= 4) { c.fillStyle = '#6b5a3a'; c.fillRect(cx - 1.5, top + 18, 3, 16); }
      if (s.step === 3) { c.fillStyle = '#222'; c.beginPath(); c.arc(cx, top + 30, 3, 0, Math.PI * 2); c.fill(); }
      if (s.lit) { flame(c, cx, top + 18, 56, {t}); if (s.burn > 0.05) { c.fillStyle = COL[s.shape || 'pillar']; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(cx + 22, base - 4, 22 * s.burn + 6, 5, 0, 0, Math.PI * 2); c.fill(); c.fillRect(cx + 16, top + 30, 5, (base - top - 34) * Math.min(1, s.burn * 1.5)); c.globalAlpha = 1; } }
    } else { c.fillStyle = COL[s.shape || 'pillar'] || '#ddd'; c.beginPath(); c.ellipse(cx, base - 20, 60, 22, 0, 0, Math.PI * 2); c.fill(); }
    if (ff > 0) { s.burn = Math.min(1, s.burn + (reduceMotion() ? 1 : 0.006)); if (s.burn >= 1) { ff = 0; finishBurn(); } }
    c.fillStyle = s.lit && ff > 0 ? '#f5e6c8' : '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left';
    c.fillText(s.step < STEPS.length ? `지금 할 일: ${s.shape ? STEPS[s.step] : '모양 고르기'}` : s.burn > 0 ? `빨리 감기 ${Math.round(s.burn * 100)}%` : '불이 붙었어요. 빨리 감기로 타는 모습을 보세요.', 16, 28);
    raf = requestAnimationFrame(draw);
  }
  function finishBurn() { status.textContent = '주변이 밝아지고, 양초가 녹아 촛농이 흘러내리고, 양초 몸통이 줄어들었어요.'; renderTray(); onAction('made'); onReady?.(); }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'safety') {
      const list = [['paper', '신문지 치우기'], ['board', '찰흙 판 치우기'], ['goggles', '보안경 쓰기'], ['gloves', '장갑 끼기'], ['lock', '점화기 잠금 확인']];
      tray.append(...list.map(([k, n]) => button(n, () => { safe[k] = true; const left = list.filter(([x]) => !safe[x]).length; status.textContent = left ? `안전 점검 ${5 - left}/5` : '안전 점검을 마쳤어요. 작업대가 열렸어요.'; renderTray(); if (!left) { onAction('safe'); onReady?.(); } }, 'bench-opt' + (safe[k] ? ' tested' : ''))));
      return;
    }
    if (mode === 'gallery') {
      if (!s.posted) tray.append(pick(el, button, [['빛나는 사자', '이름 카드: 빛나는 사자'], ['펭귄 등불', '이름 카드: 펭귄 등불'], ['분홍 기둥', '이름 카드: 분홍 기둥']], s.name, (id) => { s.name = id; renderTray(); }), button('전시관에 내 양초 올리기', () => { if (!s.name) { status.textContent = '이름 카드를 먼저 골라 주세요.'; return; } s.posted = true; status.textContent = '전시관에 내 양초를 올렸어요.'; renderTray(); onAction('posted'); onReady?.(); }, 'mission-go'));
      return;
    }
    if (!s.shape) { tray.append(pick(el, button, SHAPES, s.shape, (id) => { s.shape = id; status.textContent = `${SHAPES.find(([k]) => k === id)[1]} 모양으로 정했어요. 반죽부터 해요.`; renderTray(); })); return; }
    if (s.step < STEPS.length) {
      tray.append(button(STEPS[s.step], () => {
        if (s.step === 4 && !memory.candleSafe?.lock && !s.unlock) { s.unlock = true; status.textContent = '점화기 잠금을 풀었어요. 한 번 더 눌러 심지에 불을 붙여요.'; renderTray(); return; }
        s.step++; if (s.step === STEPS.length) { s.lit = true; status.textContent = '심지에 불이 붙었어요.'; } else status.textContent = `${STEPS[s.step - 1]} 완료. 다음: ${STEPS[s.step]}`;
        renderTray();
      }, 'mission-go'));
      return;
    }
    if (s.burn < 1) tray.append(button(ff ? '빨리 감는 중' : '빨리 감기', () => { if (!ff) { ff = 1; renderTray(); } }, 'mission-go'));
    else tray.append(button('처음부터 다시 만들기', () => { Object.assign(s, {shape: null, step: 0, burn: 0, lit: false, unlock: false}); renderTray(); }, 'bench-opt'));
  }
  renderTray();
  status.textContent = {safety: '작업대를 점검해요. 탈 물질을 치우고 보호 장비를 갖춰요.', make: s.burn >= 1 ? '이미 만든 양초가 있어요.' : '양초 모양을 먼저 골라요.', gallery: s.posted ? '전시관에 내 양초가 올라가 있어요.' : '이름 카드를 고르고 전시관에 양초를 올려요.'}[mode];
  const ready = {safety: ['paper', 'board', 'goggles', 'gloves', 'lock'].every((k) => safe[k]), make: s.burn >= 1, gallery: s.posted}[mode];
  if (ready) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G02 알갱이 돋보기
// 소금: 흰색, 굵고 모난 알갱이. 갈색설탕: 갈색, 작고 둥글둥글한 알갱이. 후추: 검은색, 크기가 고르지 않은 알갱이.
function seeded(n) { let x = n; return () => (x = (x * 16807) % 2147483647) / 2147483647; }
function makeGrains(kind, n, rnd, cx, cy, r) { return Array.from({length: n}, (_, i) => { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r; return {id: `${kind}${i}`, kind, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, rot: rnd() * Math.PI, s: kind === 'salt' ? 3.2 + rnd() * 1.2 : kind === 'sugar' ? 2 + rnd() * 0.8 : 1.4 + rnd() * 2.4}; }); }
function paintGrain(c, g, k = 1) {
  c.save(); c.translate(g.x, g.y); c.rotate(g.rot); const s = g.s * k;
  if (g.kind === 'salt') { c.fillStyle = '#fbfbf7'; c.strokeStyle = 'rgba(120,120,120,.6)'; c.lineWidth = 0.6; c.beginPath(); c.rect(-s, -s, s * 2, s * 2); c.fill(); c.stroke(); }
  else if (g.kind === 'sugar') { c.fillStyle = '#9a5b2a'; c.beginPath(); c.arc(0, 0, s, 0, Math.PI * 2); c.fill(); }
  else { c.fillStyle = '#2a2622'; c.beginPath(); c.moveTo(-s, -s * 0.4); c.lineTo(s * 0.3, -s); c.lineTo(s, s * 0.2); c.lineTo(-s * 0.2, s); c.closePath(); c.fill(); }
  c.restore();
}
export function grainLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const bins = el('div', {class: 'grain-bins'});
  const d = device(el, {observe: '재료 관찰대 (돋보기)', mix: '섞은 접시 돋보기', pepper: '스스로 탐구: 소금과 후추'}[mode], '페트리접시 속 알갱이를 돋보기로 보는 장면', [bins]);
  const {c, status, tray, node, canvas} = d;
  const m = memory.grain ??= {};
  const tools = m.tools ??= {}, found = m[mode] ??= {salt: [], sugar: []}, pep = m.pep ??= {};
  const other = mode === 'pepper' ? 'pepper' : 'sugar', NAME = {salt: '소금', sugar: '갈색설탕', pepper: '후추'};
  const rnd = seeded(mode === 'pepper' ? 97 : 41);
  let grains = [], lens = {x: 360, y: 190}, into = 'salt', alive = true, raf = 0, spread = false;
  const mixed = () => mode === 'mix' || (mode === 'pepper' && pep.mixed);
  function build() {
    if (mixed()) grains = [...makeGrains('salt', 45, rnd, 360, 190, 130), ...makeGrains(other, 45, rnd, 360, 190, 130)];
    else grains = [...makeGrains('salt', 40, rnd, 200, 190, spread ? 120 : 70), ...makeGrains(other, 40, rnd, 520, 190, spread ? 120 : 70)];
    grains.sort(() => rnd() - 0.5);
  }
  build();
  function draw() {
    if (!alive) return;
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.fillStyle = '#39424e'; c.fillRect(0, 0, 720, 380);
    const paper = tools.paper || mode !== 'observe';
    const dish = (x, y, r) => { c.fillStyle = paper ? '#ffffff' : '#8a93a0'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(200,220,255,.7)'; c.lineWidth = 3; c.stroke(); };
    if (mixed()) dish(360, 190, 150); else { dish(200, 190, 140); dish(520, 190, 140); c.fillStyle = '#e8ecf2'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(NAME.salt, 200, 350); c.fillText(NAME[other], 520, 350); }
    for (const g of grains) if (!found.salt.includes(g.id) && !found.sugar.includes(g.id)) paintGrain(c, g);
    if (tools.lens || mode !== 'observe') {
      c.save(); c.beginPath(); c.arc(lens.x, lens.y, 70, 0, Math.PI * 2); c.clip(); c.fillStyle = '#fff'; c.fillRect(lens.x - 70, lens.y - 70, 140, 140);
      c.translate(lens.x, lens.y); c.scale(3, 3); c.translate(-lens.x, -lens.y);
      for (const g of grains) if (!found.salt.includes(g.id) && !found.sugar.includes(g.id) && Math.hypot(g.x - lens.x, g.y - lens.y) < 30) paintGrain(c, g);
      c.restore(); c.strokeStyle = '#c9a86a'; c.lineWidth = 6; c.beginPath(); c.arc(lens.x, lens.y, 70, 0, Math.PI * 2); c.stroke(); c.strokeStyle = 'rgba(200,60,40,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(lens.x - 10, lens.y); c.lineTo(lens.x + 10, lens.y); c.moveTo(lens.x, lens.y - 10); c.lineTo(lens.x, lens.y + 10); c.stroke(); // 가운데 표시: 이 자리의 알갱이가 담긴다
      c.strokeStyle = '#c9a86a'; c.lineWidth = 10; c.beginPath(); c.moveTo(lens.x + 50, lens.y + 50); c.lineTo(lens.x + 95, lens.y + 95); c.stroke();
    }
    raf = requestAnimationFrame(draw);
  }
  function nearest(x, y, near = 12) { let best = null, bd = 1e9; for (const g of grains) { if (found.salt.includes(g.id) || found.sugar.includes(g.id)) continue; const dd = Math.hypot(g.x - x, g.y - y); if (dd < bd) { bd = dd; best = g; } } return bd < near ? best : null; }
  function take(g) {
    if (!g) { status.textContent = '돋보기 가운데에 알갱이를 두고 눌러 보세요.'; return; }
    if (g.kind !== into) { status.textContent = `그 알갱이는 ${NAME[into]} 같지 않아요. 색깔, 크기, 모양을 다시 보세요.`; return; }
    const arr = g.kind === 'salt' ? found.salt : found.sugar;
    if (arr.length >= 5) { status.textContent = `${NAME[g.kind]} 알갱이는 5개를 모두 담았어요. 다른 칸을 골라 보세요.`; return; }
    arr.push(g.id);
    const a = found.salt.length, b = found.sugar.length; status.textContent = `${NAME.salt} ${a}/5, ${NAME[other]} ${b}/5`;
    paintBins();
    if (a >= 5 && b >= 5) { status.textContent = '두 가지 알갱이를 모두 찾았어요. 섞은 뒤에도 알갱이의 색깔과 모양이 그대로예요.'; onAction(mode === 'pepper' ? 'mixed' : 'found'); onReady?.(); }
  }
  canvas.addEventListener('pointermove', (e) => { const b = canvas.getBoundingClientRect(); lens = {x: (e.clientX - b.left) / b.width * 720, y: (e.clientY - b.top) / b.height * 380}; });
  canvas.addEventListener('click', (e) => { if (!(mode === 'mix' || (mode === 'pepper' && pep.mixed))) return; const b = canvas.getBoundingClientRect(); take(nearest((e.clientX - b.left) / b.width * 720, (e.clientY - b.top) / b.height * 380)); });
  function paintBins() { if (!mixed()) { bins.replaceChildren(); return; } bins.replaceChildren(...['salt', 'sugar'].map((k) => el('div', {class: 'grain-bin'}, el('b', {}, `${NAME[k === 'salt' ? 'salt' : other]} 칸`), el('span', {}, `${found[k].length}/5`)))); }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'observe') {
      tray.append(...[['paper', '흰 종이 대기'], ['lens', '돋보기로 보기'], ['rod', '유리 막대로 흩트리기']].map(([k, n]) => button(n, () => { tools[k] = true; if (k === 'rod') { spread = true; build(); } const n2 = ['paper', 'lens', 'rod'].filter((x) => tools[x]).length; status.textContent = n2 >= 3 ? '세 도구로 모두 관찰했어요. 알갱이의 색깔, 크기, 모양이 잘 보여요.' : `관찰 도구 ${n2}/3`; renderTray(); if (n2 >= 3) { onAction('observed'); onReady?.(); } }, 'bench-opt' + (tools[k] ? ' tested' : ''))));
      return;
    }
    if (mode === 'pepper' && !pep.mixed) {
      tray.append(button('소금 관찰하기', () => { pep.a = true; status.textContent = '소금: 흰색, 굵고 모난 알갱이예요.'; renderTray(); }, 'bench-opt' + (pep.a ? ' tested' : '')), button('후추 관찰하기', () => { pep.b = true; status.textContent = '후추: 검은색, 크기가 고르지 않은 알갱이예요.'; renderTray(); }, 'bench-opt' + (pep.b ? ' tested' : '')));
      if (pep.a && pep.b) tray.append(button('유리 막대로 섞기', () => { pep.mixed = true; build(); paintBins(); status.textContent = '섞었어요. 돋보기로 두 알갱이를 5개씩 찾아 칸에 담아요.'; renderTray(); }, 'mission-go'));
      return;
    }
    tray.append(pick(el, button, [['salt', `${NAME.salt} 칸에 담기`], [other, `${NAME[other]} 칸에 담기`]], into, (id) => { into = id; renderTray(); }),
      el('div', {class: 'bench-seg'}, button('돋보기 ←', () => { lens.x = Math.max(220, lens.x - 20); }, 'bench-opt'), button('돋보기 ↑', () => { lens.y = Math.max(50, lens.y - 20); }, 'bench-opt'), button('돋보기 ↓', () => { lens.y = Math.min(330, lens.y + 20); }, 'bench-opt'), button('돋보기 →', () => { lens.x = Math.min(500, lens.x + 20); }, 'bench-opt'), button('돋보기 가운데 알갱이 담기', () => take(nearest(lens.x, lens.y, 26)), 'mission-go')));
  }
  // 소금은 found.salt, 다른 재료(갈색설탕이나 후추)는 found.sugar에 담는다.
  renderTray(); paintBins();
  status.textContent = {observe: '흰 종이, 돋보기, 유리 막대를 써서 두 재료를 관찰해 보세요.', mix: '돋보기로 섞인 알갱이를 살펴보고, 담을 칸을 고른 뒤 알갱이를 눌러 담아요.', pepper: pep.mixed ? '돋보기로 두 알갱이를 5개씩 찾아 담아요.' : '소금과 후추를 따로 관찰한 뒤 섞어 보세요.'}[mode];
  const ready = {observe: ['paper', 'lens', 'rod'].every((k) => tools[k]), mix: found.salt.length >= 5 && found.sugar.length >= 5, pepper: pep.mixed && found.salt.length >= 5 && found.sugar.length >= 5}[mode];
  if (ready) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G03 우유와 식초 실험대
// 덩어리 양은 조건 조합에 따른 모형 값이다. 60 °C 이상의 우유, 식초 5 mL 정도, 살짝 몇 번 젓기가 가장 잘 생긴다.
export const curdLevel = ({hot, vin, gentle}) => (hot ? (vin ? (gentle ? 3 : 2) : 1) : (vin ? 1 : 0));
const CURD = ['거의 생기지 않음', '조금 생김', '꽤 생김', '많이 생김'];
export function curdLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const table = el('div', {class: 'sun-table'});
  const d = device(el, {smell: '냄새 맡기', mix: '우유와 식초 실험대 (모형)', vary: '조건 바꿔 보기 (모형)'}[mode], '비커 두 개와 스포이트가 있는 실험대', [table]);
  const {c, status, tray, node} = d;
  const s = memory.curd ??= {gloves: false, poured: false, ml: 0, stirred: false, done: false};
  const sm = memory.smell ??= {};
  const trials = memory.trials ??= [];
  let cond = {hot: true, vin: true, gentle: true}, alive = true, raf = 0, t = 0, grow = s.done ? 1 : 0;
  function beaker(x, y, fillCol, level, label, lumps = 0, clear = false) {
    level *= 1.4;
    c.fillStyle = clear ? 'rgba(245,225,140,.75)' : fillCol; c.fillRect(x - 62, y - level, 124, level);
    for (let i = 0; i < lumps * 8; i++) { const a = (i * 137.5) * R; c.fillStyle = '#fffdf6'; c.strokeStyle = 'rgba(200,190,160,.8)'; c.lineWidth = 1; c.beginPath(); c.arc(x + Math.cos(a) * (12 + (i % 5) * 9), y - level * 0.5 + Math.sin(a) * level * 0.35, 7 + (i % 3) * 2, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.strokeStyle = 'rgba(160,190,230,.95)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 66, y - 170); c.lineTo(x - 66, y); c.lineTo(x + 66, y); c.lineTo(x + 66, y - 170); c.stroke();
    c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'center'; c.fillText(label, x, y + 22);
  }
  function draw() {
    if (!alive) return; t++;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef3f8'; c.fillRect(0, 0, 720, 380); c.fillStyle = '#c8d2de'; c.fillRect(0, 300, 720, 80);
    if (mode === 'smell') {
      const bottle = (x, col, lab, ok) => { c.fillStyle = col; c.fillRect(x - 30, 150, 60, 140); c.fillStyle = '#5a6b80'; c.fillRect(x - 12, 128, 24, 22); c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(lab, x, 320); if (ok) { c.fillText(ok, x, 110); } };
      bottle(230, '#fffdf6', '뜨거운 우유', sm.milk && '고소한 냄새'); bottle(490, 'rgba(245,225,140,.9)', '식초', sm.vin && '시큼한 냄새');
      raf = requestAnimationFrame(draw); return;
    }
    if (mode === 'vary') {
      const last = trials.at(-1); beaker(250, 290, '#fffdf6', 90, '실험 비커', last ? last.level : 0, !!last && last.level > 0); beaker(470, 290, '#fffdf6', 90, '비교용 우유');
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(last ? `결과: 덩어리 ${CURD[last.level]}` : '조건을 고르고 해 보세요.', 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    if (s.stirred && grow < 1) grow = Math.min(1, grow + (reduceMotion() ? 1 : 0.01));
    beaker(250, 290, '#fffdf6', s.poured ? 64 : 0, '실험 비커', Math.round(grow * 3), grow > 0.3);
    beaker(470, 290, '#fffdf6', s.poured ? 60 : 118, s.poured ? '비교용 우유' : '뜨거운 우유');
    c.fillStyle = 'rgba(245,225,140,.9)'; c.fillRect(610, 180, 50, 110); c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(`식초 ${5 - s.ml} mL 남음`, 635, 312);
    c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(s.gloves ? '면장갑을 꼈어요.' : '비커를 잡으려면 면장갑이 필요해요.', 16, 28);
    if (s.done) c.fillText('식초를 넣은 부분부터 맑아지고 흰색 덩어리가 생겼어요.', 16, 52);
    raf = requestAnimationFrame(draw);
  }
  function paintTable() {
    if (mode !== 'vary') { table.replaceChildren(); return; }
    table.replaceChildren(trials.length ? el('table', {class: 'narrow'}, el('tr', {}, el('th', {}, '번'), el('th', {}, '우유 온도'), el('th', {}, '식초'), el('th', {}, '젓기'), el('th', {}, '덩어리')),
      trials.map((r, i) => el('tr', {}, el('th', {}, String(i + 1)), el('td', {}, r.hot ? '60 °C 이상' : '60 °C보다 낮음'), el('td', {}, r.vin ? '5 mL 정도' : '조금'), el('td', {}, r.gentle ? '살짝 몇 번' : '세게 오래'), el('td', {}, CURD[r.level])))) : '');
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'smell') {
      tray.append(button('코를 병 입구에 대고 맡기', () => { status.textContent = '멈춰요. 코를 가까이 대면 위험할 수 있어요. 손으로 바람을 일으켜 맡아요.'; }, 'bench-opt'),
        button('우유: 손으로 바람을 일으켜 맡기', () => { sm.milk = true; done2(); }, 'bench-opt' + (sm.milk ? ' tested' : '')), button('식초: 손으로 바람을 일으켜 맡기', () => { sm.vin = true; done2(); }, 'bench-opt' + (sm.vin ? ' tested' : '')));
      return;
    }
    if (mode === 'vary') {
      tray.append(pick(el, button, [['hot', '우유 60 °C 이상'], ['cold', '우유 60 °C보다 낮음']], cond.hot ? 'hot' : 'cold', (id) => { cond.hot = id === 'hot'; renderTray(); }),
        pick(el, button, [['vin', '식초 5 mL 정도'], ['little', '식초 조금']], cond.vin ? 'vin' : 'little', (id) => { cond.vin = id === 'vin'; renderTray(); }),
        pick(el, button, [['gentle', '살짝 몇 번 젓기'], ['hard', '세게 오래 젓기']], cond.gentle ? 'gentle' : 'hard', (id) => { cond.gentle = id === 'gentle'; renderTray(); }),
        button('이 조건으로 해 보기', () => { const r = {...cond, level: curdLevel(cond)}; trials.push(r); if (trials.length > 6) trials.shift(); const kinds = new Set(trials.map((x) => `${x.hot}${x.vin}${x.gentle}`)).size; status.textContent = `덩어리 ${CURD[r.level]}. 서로 다른 조건 ${kinds}번 해 봤어요.`; paintTable(); if (kinds >= 3) { onAction('varied'); onReady?.(); } }, 'mission-go'));
      return;
    }
    if (!s.gloves) tray.append(button('면장갑 끼기', () => { s.gloves = true; status.textContent = '면장갑을 꼈어요. 이제 뜨거운 비커를 잡을 수 있어요.'; renderTray(); }, 'mission-go'));
    else if (!s.poured) tray.append(button('뜨거운 우유 절반을 빈 비커에 붓기', () => { s.poured = true; status.textContent = '절반을 부었어요. 남은 우유는 비교용이에요.'; renderTray(); }, 'mission-go'));
    else if (s.ml < 5) tray.append(button(`스포이트로 식초 1 mL 넣기 (${s.ml}/5)`, () => { s.ml++; status.textContent = `식초 ${s.ml} mL를 넣었어요.`; renderTray(); }, 'mission-go'));
    else if (!s.stirred) tray.append(button('유리 막대로 살짝 젓기', () => { s.stirred = true; s.done = true; status.textContent = '식초를 넣은 부분부터 맑아지고 흰색 덩어리가 생겨요. 비교용 우유는 그대로예요.'; renderTray(); onAction('mixed'); onReady?.(); }, 'mission-go'));
  }
  function done2() { status.textContent = sm.milk && sm.vin ? '뜨거운 우유는 고소한 냄새, 식초는 시큼한 냄새가 나요.' : sm.milk ? '뜨거운 우유는 고소한 냄새가 나요.' : '식초는 시큼한 냄새가 나요.'; renderTray(); if (sm.milk && sm.vin) { onAction('smelled'); onReady?.(); } }
  renderTray(); paintTable();
  status.textContent = {smell: '냄새를 맡는 안전한 방법을 골라요.', mix: s.done ? '이미 실험을 마쳤어요.' : '면장갑부터 껴요.', vary: '세 조건을 바꿔 가며 서로 다른 조합으로 세 번 이상 해 보세요.'}[mode];
  const ready = {smell: sm.milk && sm.vin, mix: s.done, vary: new Set(trials.map((x) => `${x.hot}${x.vin}${x.gentle}`)).size >= 3}[mode];
  if (ready) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G04 불꽃 관측대
export function flameLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const d = device(el, mode === 'safety' ? '관측대 안전 준비' : '불꽃 관측대 (모형)', '양초와 알코올램프 불꽃을 관측하는 장면');
  const {c, status, tray, node} = d;
  const prep = memory.prep ??= {};
  const used = memory.flameUsed ??= {};
  let fuel = 'candle', zoom = false, dark = false, hand = 0, ff = 0, burnt = memory.burnt ?? 0, alive = true, raf = 0, t = 0;
  const HAND = ['멀리', '조금 가까이', '가까이', '아주 가까이 (옆면)'];
  function draw() {
    if (!alive) return; t++;
    c.setTransform(2, 0, 0, 2, 0, 0);
    if (mode === 'safety') {
      c.fillStyle = '#eef3f8'; c.fillRect(0, 0, 720, 380); c.fillStyle = '#c8d2de'; c.fillRect(0, 290, 720, 90);
      if (!prep.clear) { c.fillStyle = '#c9a36a'; c.fillRect(80, 220, 90, 70); c.fillRect(100, 180, 70, 40); }
      c.fillStyle = prep.window ? '#bfe2ff' : '#7f8fa3'; c.fillRect(560, 40, 120, 90); c.strokeStyle = '#4c6a92'; c.lineWidth = 4; c.strokeRect(560, 40, 120, 90); if (prep.window) { c.fillStyle = '#eef3f8'; c.fillRect(620, 44, 56, 82); }
      if (prep.sand) { c.fillStyle = '#d8c28a'; c.fillRect(470, 250, 70, 40); c.fillStyle = '#b4531a'; c.fillRect(550, 240, 60, 50); }
      c.fillStyle = '#f5e6c8'; c.save(); c.translate(330, 290); c.rotate(prep.fix ? 0 : 0.18); c.fillRect(-14, -80, 28, 80); c.restore();
      raf = requestAnimationFrame(draw); return;
    }
    c.fillStyle = dark ? '#0d1018' : '#eef3f8'; c.fillRect(0, 0, 720, 380); c.fillStyle = dark ? '#1a2030' : '#c8d2de'; c.fillRect(0, 300, 720, 80);
    const alc = fuel === 'alcohol', b = burnt, x = 360;
    // 빨리 감기는 양초와 알코올램프 모두 해야 채운다(양초 길이와 알코올 양이 모두 줄어드는 것을 보도록).
    if (ff > 0) { burnt = Math.min(1, burnt + (reduceMotion() ? 1 : 0.008)); memory.burnt = burnt; if (burnt >= 1) { ff = 0; used['ff_' + fuel] = true; used.ff = !!(used.ff || (used.ff_candle && used.ff_alcohol)); check(used.ff ? '' : `${alc ? '알코올램프' : '양초'}를 빨리 감아 보았어요. ${alc ? '양초' : '알코올램프'}도 빨리 감아 봐요.`); } }
    if (dark) { const g = c.createRadialGradient(x, 150, 10, x, 150, 260); g.addColorStop(0, alc ? 'rgba(120,150,255,.25)' : 'rgba(255,200,100,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 720, 380); }
    if (alc) {
      c.fillStyle = 'rgba(200,230,255,.55)'; c.beginPath(); c.ellipse(x, 260, 60, 42, 0, 0, Math.PI * 2); c.fill();
      const lv = 30 - b * 18; c.fillStyle = 'rgba(160,200,255,.8)'; c.beginPath(); c.ellipse(x, 290 - lv, 50, lv * 0.9, 0, 0, Math.PI); c.fill();
      c.fillStyle = '#8e97a3'; c.fillRect(x - 10, 204, 20, 16); c.fillStyle = '#e8e2d0'; c.fillRect(x - 2, 194, 4, 12);
      flame(c, x, 196, zoom ? 140 : 80, {alcohol: true, t, dark});
      c.fillStyle = dark ? '#e8ecf2' : '#233a5c'; c.font = FONT(13, true); c.textAlign = 'left'; c.fillText(`알코올 높이 ${b > 0.5 ? '많이 줄었어요' : b > 0 ? '조금 줄었어요' : '처음'}`, 470, 280);
    } else {
      const h = 150 - b * 90; c.fillStyle = '#f5f0e6'; c.fillRect(x - 22, 300 - h, 44, h);
      if (b > 0.05) { c.fillStyle = '#efe6d2'; c.fillRect(x + 14, 300 - h, 6, Math.min(h, 40 + b * 40)); c.beginPath(); c.ellipse(x + 30, 298, 16 + b * 20, 4, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#3a2f22'; c.fillRect(x - 1.5, 300 - h - 12, 3, 12);
      if (zoom) { c.fillStyle = 'rgba(245,235,210,.95)'; c.beginPath(); c.ellipse(x, 300 - h, 18, 5, 0, 0, Math.PI * 2); c.fill(); }
      flame(c, x, 300 - h - 10, zoom ? 150 : 70, {t, dark});
    }
    if (hand > 0) { const hx = x - 260 + hand * 70; c.fillStyle = '#f2c9a0'; c.beginPath(); c.ellipse(hx, 150, 34, 22, 0, 0, Math.PI * 2); c.fill(); c.fillRect(hx - 80, 140, 60, 20); }
    c.fillStyle = dark ? '#e8ecf2' : '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left';
    c.fillText(`${alc ? '알코올램프' : '양초'}${zoom ? ', 확대' : ''}${dark ? ', 어둡게' : ''}`, 16, 28);
    if (zoom) { c.font = FONT(13); c.fillText(alc ? '심지 쪽은 파란색, 바깥쪽은 주황색과 붉은색이에요. 잘 보이지 않을 수 있어요.' : '심지 쪽은 파란색, 위로 갈수록 노란색과 주황색이에요. 심지 주변에 녹은 양초가 고여요.', 16, 52); }
    if (hand > 0) { c.fillStyle = dark ? '#e8ecf2' : '#233a5c'; c.font = FONT(13, true); c.fillText(`손: ${HAND[hand]}`, 16, 350); c.fillStyle = '#e1e8f2'; c.fillRect(120, 340, 200, 12); c.fillStyle = '#e0701f'; c.fillRect(120, 340, 50 * hand, 12); c.fillStyle = dark ? '#e8ecf2' : '#233a5c'; c.fillText('따뜻함', 330, 350); }
    raf = requestAnimationFrame(draw);
  }
  // note: 방금 관찰한 것(손의 따뜻함 등)을 진행 상황 앞에 남겨 화면 읽기 프로그램에서도 들리게 한다.
  function check(note = '') { const need = ['zoom', 'hand', 'ff', 'dark', 'candle', 'alcohol'].filter((k) => used[k]).length; status.textContent = (note ? note + ' ' : '') + (need >= 6 ? '두 물질을 네 도구로 모두 관측했어요. 기록표를 채워요.' : `관측 도구와 물질 ${need}/6 (확대, 손 가까이, 두 물질 빨리 감기, 어둡게, 양초, 알코올)`); renderTray(); if (need >= 6) { onAction('observed'); onReady?.(); } }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'safety') {
      const L = [['clear', '탈 물질 치우기'], ['window', '창문 열기'], ['sand', '모래와 방염 담요 두기'], ['fix', '양초 고정하기']];
      tray.append(...L.map(([k, n]) => button(n, () => { prep[k] = true; const left = L.filter(([x]) => !prep[x]).length; status.textContent = left ? `안전 준비 ${4 - left}/4` : '안전 준비를 마쳤어요.'; renderTray(); if (!left) { onAction('ready'); onReady?.(); } }, 'bench-opt' + (prep[k] ? ' tested' : ''))));
      return;
    }
    tray.append(pick(el, button, [['candle', '양초'], ['alcohol', '알코올램프']], fuel, (id) => { fuel = id; used[id] = true; burnt = 0; memory.burnt = 0; check(); }),
      el('div', {class: 'bench-seg'}, button(zoom ? '확대 끄기' : '확대', () => { zoom = !zoom; used.zoom = true; check(); }, 'bench-opt'), button(dark ? '밝게' : '어둡게 하기', () => { dark = !dark; used.dark = true; check(); }, 'bench-opt'), button(ff ? '빨리 감는 중' : '빨리 감기', () => { if (!ff) { burnt = 0; ff = 1; } }, 'bench-opt')),
      el('div', {class: 'bench-seg'}, button('손을 옆면으로 조금 더 가까이', () => { hand = Math.min(3, hand + 1); used.hand = true; check(`손을 불꽃 옆면으로 ${HAND[hand]} 가져갔어요. ${hand >= 3 ? '아주 따뜻해요.' : '가까이 갈수록 따뜻해요.'}`); }, 'bench-opt'), button('손을 멀리', () => { hand = 0; check(); }, 'bench-opt'), button('손을 불꽃 윗부분으로', () => { status.textContent = '멈춰요. 불꽃 윗부분은 아주 뜨거워요. 손은 먼 곳에서부터 천천히 불꽃 옆면으로만 가져가요.'; }, 'bench-opt')));
  }
  used[fuel] = true;
  renderTray();
  status.textContent = mode === 'safety' ? '관측하기 전에 안전 준비를 해요.' : '물질을 고르고 네 도구로 관측해요. 양초와 알코올램프를 모두 봐요.';
  const ready = mode === 'safety' ? ['clear', 'window', 'sand', 'fix'].every((k) => prep[k]) : ['zoom', 'hand', 'ff', 'dark', 'candle', 'alcohol'].every((k) => used[k]);
  if (ready) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G05 크기가 다른 두 양초 (모형 값: 작은 양초 40초, 큰 양초 80초, 심지만 3초)
export function candleSize({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const d = device(el, mode === 'wick' ? '심지만 태워 보기 (모형 값)' : '크기가 다른 두 양초 (모형 값)', '크기가 다른 양초 두 개와 초시계');
  const {c, status, tray, node} = d;
  const s = memory.size ??= {step: 0, t: 0, done: false};
  const w = memory.wick ??= {t: -1, done: false};
  const STEPS = ['작은 양초 만들기 (점토 1 cm × 1 cm로 심지 감싸기)', '큰 양초 만들기 (점토 1 cm × 2 cm로 심지 감싸기)', '가위로 두 심지를 0.5 cm만 남기기', '두 양초를 페트리접시에 세우기', '두 양초에 동시에 불 붙이고 초시계 누르기'];
  let alive = true, raf = 0, k = 0, run = false;
  function candle(x, h, lit, left, label) {
    c.fillStyle = '#e8eef5'; c.beginPath(); c.ellipse(x, 300, 60, 10, 0, 0, Math.PI * 2); c.fill();
    const hh = h * left; c.fillStyle = '#f5ecd8'; c.fillRect(x - 26, 300 - hh, 52, hh);
    c.fillStyle = '#3a2f22'; c.fillRect(x - 1.5, 300 - hh - 10, 3, 10);
    if (lit && left > 0) flame(c, x, 300 - hh - 8, 44, {t: k});
    c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(label, x, 332);
  }
  function draw() {
    if (!alive) return; k++;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef3f8'; c.fillRect(0, 0, 720, 380); c.fillStyle = '#c8d2de'; c.fillRect(0, 310, 720, 70);
    if (mode === 'wick') {
      if (w.t >= 0 && w.t < 3.2) w.t += reduceMotion() ? 3.2 : 1 / 30;
      if (w.t >= 3.2 && !w.done) { w.done = true; status.textContent = '심지만 태우니 잠깐 타다가 꺼졌어요. 몸통이 있는 양초는 계속 타요.'; renderTray(); onAction('wick'); onReady?.(); }
      c.fillStyle = '#3a2f22'; c.fillRect(218, 250, 4, 50); if (w.t >= 0 && w.t < 3.2) flame(c, 220, 252, 30, {t: k});
      candle(500, 120, true, 1, '심지를 꽂은 양초');
      c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText('심지만', 220, 332);
      c.textAlign = 'left'; c.font = FONT(15, true); c.fillText(w.t < 0 ? '심지만 따로 불을 붙여 봐요.' : `심지만: ${Math.min(3, w.t).toFixed(1)}초${w.done ? ', 꺼졌어요' : ''}`, 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    if (run) { s.t = Math.min(84, s.t + (reduceMotion() ? 84 : 0.4)); if (s.t >= 84) { run = false; s.done = true; status.textContent = '작은 양초는 40초, 큰 양초는 80초에 꺼졌어요. 두 양초 모두 타면서 길이가 짧아졌어요.'; renderTray(); onAction('timed'); onReady?.(); } }
    const lit = s.step >= 5 && !s.done, small = Math.max(0, 1 - s.t / 40), large = Math.max(0, 1 - s.t / 80);
    if (s.step >= 1 || s.done) candle(240, 60, lit, s.done ? 0 : small, s.done || s.t >= 40 ? '작은 양초 (꺼짐)' : '작은 양초');
    if (s.step >= 2 || s.done) candle(480, 120, lit, s.done ? 0.05 : large, s.done || s.t >= 80 ? '큰 양초 (꺼짐)' : '큰 양초');
    c.fillStyle = '#233a5c'; c.font = FONT(16, true); c.textAlign = 'left';
    c.fillText(s.step < 5 && !s.done ? `지금 할 일: ${STEPS[s.step]}` : `초시계 ${Math.floor(s.t)}초${s.t >= 40 ? ', 작은 양초 꺼짐 (40초)' : ''}${s.t >= 80 ? ', 큰 양초 꺼짐 (80초)' : ''}`, 16, 28);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'wick') { if (w.t < 0) tray.append(button('심지만 따로 불 붙이기', () => { w.t = 0; renderTray(); }, 'mission-go')); return; }
    if (s.done) { tray.append(button('처음부터 다시 하기', () => { Object.assign(s, {step: 0, t: 0, done: false}); renderTray(); }, 'bench-opt')); return; }
    if (s.step < 5) tray.append(button(STEPS[s.step], () => { s.step++; status.textContent = s.step < 5 ? `다음: ${STEPS[s.step]}` : '불을 붙였어요. 빨리 감기로 꺼질 때까지 봐요.'; renderTray(); }, 'mission-go'));
    else tray.append(button(run ? '빨리 감는 중' : '빨리 감기', () => { run = true; renderTray(); }, 'mission-go'));
  }
  renderTray();
  status.textContent = mode === 'wick' ? (w.done ? '이미 확인했어요.' : '심지만 태우면 어떻게 될까요?') : (s.done ? '이미 실험을 마쳤어요. 작은 양초는 40초, 큰 양초는 80초에 꺼졌어요.' : '두 양초를 만들어 동시에 불을 붙여요. 심지 길이와 불 붙이는 시각은 같게 해요.');
  if (mode === 'wick' ? w.done : s.done) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G05 캠핑장 연료 관리 (모형: 연료 상자 12개, 30초마다 연료가 한 칸씩 줄어듦, 여섯 번이면 3분)
export function campFuel({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const d = device(el, '캠핑장 연료 관리실 (모형)', '모닥불, 가스레인지, 휴대용 가스레인지의 연료 칸');
  const {c, status, tray, node} = d;
  const s = memory.camp ??= {lv: {camp: 2, gas: 2, port: 2}, box: 12, turn: 0, out: null, done: false};
  const F = [['camp', '모닥불', '장작 넣기'], ['gas', '가스레인지', '가스관 밸브 열어 두기'], ['port', '휴대용 가스레인지', '가득 찬 연료 통으로 갈기']];
  let alive = true, raf = 0, k = 0;
  function draw() {
    if (!alive) return; k++;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#1d2433'; c.fillRect(0, 0, 720, 380);
    F.forEach(([id, name], i) => {
      const x = 130 + i * 230, lv = s.lv[id], on = lv > 0 && s.out !== id;
      if (id === 'camp') {
        c.fillStyle = '#6b6f78'; for (let j = -3; j <= 3; j++) { c.beginPath(); c.arc(x + j * 17, 276, 8, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#8a5a32'; c.save(); c.translate(x, 258); c.rotate(0.35); c.fillRect(-50, -7, 100, 14); c.rotate(-0.7); c.fillRect(-50, -7, 100, 14); c.restore();
        c.fillStyle = '#a0703f'; for (let j = 0; j < Math.min(3, Math.ceil(lv / 2)); j++) c.fillRect(x - 100 + j * 8, 262 - j * 10, 30, 8);
      } else if (id === 'gas') {
        c.fillStyle = '#4b5563'; c.fillRect(x - 60, 244, 120, 36); c.fillStyle = '#9aa3ae'; c.beginPath(); c.ellipse(x, 244, 26, 6, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#c9a227'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 60, 266); c.lineTo(x + 92, 266); c.lineTo(x + 92, 190); c.stroke();
        c.fillStyle = on ? '#3fbf6a' : '#d0453a'; c.beginPath(); c.arc(x + 92, 226, 7, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = '#2f3743'; c.fillRect(x - 48, 250, 96, 30); c.fillStyle = '#9aa3ae'; c.beginPath(); c.ellipse(x, 250, 20, 5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#d9d2c2'; c.fillRect(x + 54, 238, 22, 42); c.fillStyle = '#c0392b'; c.fillRect(x + 54, 250, 22, 8);
      }
      if (on) flame(c, x, 238, 30 + lv * 14, {t: k + i * 10});
      c.fillStyle = '#e8ecf2'; c.font = FONT(15, true); c.textAlign = 'center'; c.fillText(name, x, 310);
      for (let j = 0; j < 6; j++) { c.fillStyle = j < lv ? '#f0b43c' : '#39424e'; c.fillRect(x - 60 + j * 20, 330, 16, 12); }
      if (!on) { c.fillStyle = '#ff8f8f'; c.fillText('꺼짐', x, 200); }
    });
    c.fillStyle = '#e8ecf2'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(`연료 상자 ${s.box}개, 지난 시간 ${s.turn * 30}초 / 180초 (모형)`, 16, 28);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    if (s.done) { status.textContent = '3분 동안 세 불을 모두 지켰어요.'; return; }
    if (s.out) { tray.append(button('처음부터 다시 운영하기', () => { Object.assign(s, {lv: {camp: 2, gas: 2, port: 2}, box: 12, turn: 0, out: null}); renderTray(); }, 'mission-go')); return; }
    tray.append(...F.map(([id, name, act]) => button(`${name}: ${act}`, () => { if (s.box <= 0) { status.textContent = '연료 상자를 모두 썼어요.'; return; } if (s.lv[id] >= 6) { status.textContent = `${name} 연료 칸이 가득 찼어요.`; return; } s.box--; s.lv[id] = Math.min(6, s.lv[id] + 2); status.textContent = `${name}에 탈 물질을 채웠어요.`; }, 'bench-opt')),
      button('심지만 채우기 (척척 방식)', () => { status.textContent = '심지만 채우면 탈 물질이 늘지 않아요. 불은 탈 물질이 있어야 계속 타요.'; }, 'bench-opt'),
      button('30초 지나기', () => {
        s.turn++; for (const [id] of F) s.lv[id] = Math.max(0, s.lv[id] - 1);
        const gone = F.find(([id]) => s.lv[id] <= 0);
        if (gone) { s.out = gone[0]; status.textContent = `${gone[1]}의 탈 물질이 떨어져 불이 꺼졌어요. 다시 운영해 봐요.`; }
        else if (s.turn >= 6) { s.done = true; onAction('kept'); onReady?.(); }
        else status.textContent = `${s.turn * 30}초가 지났어요. 연료 칸을 살펴보세요.`;
        renderTray();
      }, 'mission-go'));
  }
  renderTray();
  if (!s.done) status.textContent = '세 불에 알맞은 방법으로 탈 물질을 채우며 3분(30초씩 여섯 번)을 지켜요.';
  if (s.done) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G06 숯불 조종판과 산소 실험 (모형 값: 공기만 든 병 12초, 산소를 더 넣은 병 30초)
export function oxygenLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const d = device(el, {grill: '숯불 구이 통 조종판', o2: '두 집기병 실험 (모형 값)', empty: '산소만 든 빈 병'}[mode], '숯불 구이 통과 집기병');
  const {c, status, tray, node} = d;
  const g = memory.grill ??= {tried: []};
  const o = memory.o2 ??= {step: 0, t: 0, done: false};
  const e = memory.empty ??= {done: false};
  let hole = 0, alive = true, raf = 0, k = 0, run = false;
  const STEPS = ['유리판으로 집기병 입구 일부를 가리기', '산소 캔을 1초 누르기', '유리판으로 입구를 덮어 두기', '두 양초에 불 붙이기', '두 촛불을 크기가 같은 집기병으로 동시에 덮기'];
  // 불을 붙이기 전에는 불꽃이 없고, 집기병으로 덮기 전에는 두 촛불이 같은 크기다(실험 전에 결과를 보여 주지 않는다)
  function jar(x, t, limit, big, label, burning = true, covered = true) {
    const lit = burning && t < limit, h = big && covered ? 64 : 44;
    c.fillStyle = '#f5ecd8'; c.fillRect(x - 16, 240, 32, 60); c.fillStyle = '#3a2f22'; c.fillRect(x - 1.5, 230, 3, 10);
    if (lit) flame(c, x, 232, h * Math.max(0.35, 1 - t / limit * 0.6), {t: k});
    c.strokeStyle = covered ? 'rgba(170,200,240,.95)' : 'rgba(170,200,240,.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 60, 300); c.lineTo(x - 60, 150); c.quadraticCurveTo(x - 60, 120, x - 30, 120); c.lineTo(x + 30, 120); c.quadraticCurveTo(x + 60, 120, x + 60, 150); c.lineTo(x + 60, 300); c.stroke();
    c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(label, x, 330); c.fillText(!burning ? '불 붙이기 전' : !covered ? '아직 덮기 전' : lit ? `불꽃 ${big ? '큼' : '보통'}` : `${limit}초에 꺼짐`, x, 352);
  }
  function draw() {
    if (!alive) return; k++;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef3f8'; c.fillRect(0, 0, 720, 380); c.fillStyle = '#c8d2de'; c.fillRect(0, 300, 720, 80);
    if (mode === 'grill') {
      c.fillStyle = '#39424e'; c.beginPath(); c.ellipse(360, 250, 150, 40, 0, 0, Math.PI * 2); c.fill(); c.fillRect(210, 250, 300, 50);
      c.fillStyle = '#111'; c.fillRect(250, 262, 30, 24); c.fillStyle = '#888'; c.fillRect(250 + hole * 10, 262, 30 - hole * 10, 24);
      const fl = [22, 40, 60, 80][hole]; for (let i = -2; i <= 2; i++) flame(c, 360 + i * 40, 222, fl, {t: k + i * 7});
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(`공기 구멍: ${['닫힘', '조금 열림', '반쯤 열림', '활짝 열림'][hole]}`, 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    if (mode === 'empty') {
      c.strokeStyle = 'rgba(170,200,240,.95)'; c.lineWidth = 3; c.strokeRect(300, 130, 120, 170);
      c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText('산소만 든 병 (탈 물질 없음)', 360, 330);
      c.fillStyle = '#c0392b'; c.fillRect(440, 150, 90, 12); if (e.tried) { c.fillStyle = 'rgba(255,200,80,.9)'; c.beginPath(); c.arc(436, 156, 5, 0, Math.PI * 2); c.fill(); }
      c.textAlign = 'left'; c.font = FONT(15, true); c.fillText(e.tried ? '점화기를 대도 병 속에서 불꽃이 생기지 않아요.' : '빈 병 입구에 점화기를 대 봐요.', 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    if (run) { o.t = Math.min(32, o.t + (reduceMotion() ? 32 : 0.12)); if (o.t >= 32) { run = false; o.done = true; status.textContent = '공기만 든 병의 촛불은 12초, 산소를 더 넣은 병의 촛불은 30초에 꺼졌어요. 산소를 더 넣은 병의 불꽃이 더 컸어요.'; renderTray(); onAction('timed'); onReady?.(); } }
    const covered = o.step >= 5 || o.done;
    const burning = o.step >= 4 || o.done;
    jar(230, covered ? o.t : 0, 12, false, '공기만 든 병', burning, covered); jar(490, covered ? o.t : 0, 30, true, '공기에 산소를 더 넣은 병', burning, covered);
    c.fillStyle = '#233a5c'; c.font = FONT(16, true); c.textAlign = 'left'; c.fillText(o.step < 5 && !o.done ? `지금 할 일: ${STEPS[o.step]}` : `초시계 ${Math.floor(o.t)}초`, 16, 28);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'grill') { tray.append(...[0, 1, 2, 3].map((v) => button(['구멍 닫기', '조금 열기', '반쯤 열기', '활짝 열기'][v], () => { hole = v; if (!g.tried.includes(v)) g.tried.push(v); status.textContent = v ? '구멍을 열수록 불꽃이 커져요.' : '구멍을 닫으니 불꽃이 작아졌어요.'; if (g.tried.length >= 3) onReady?.(); }, 'bench-opt'))); return; }
    if (mode === 'empty') { if (!e.tried) tray.append(button('빈 병 입구에 점화기 대기', () => { e.tried = true; e.done = true; status.textContent = '산소만 있고 탈 물질이 없으니 불꽃이 생기지 않아요. 산소는 물질이 타는 것을 도와요.'; renderTray(); onAction('checked'); onReady?.(); }, 'mission-go')); return; }
    if (o.done) { tray.append(button('처음부터 다시 하기', () => { Object.assign(o, {step: 0, t: 0, done: false}); renderTray(); }, 'bench-opt')); return; }
    if (o.step === 1) tray.append(button('산소 캔을 길게 누르기', () => { status.textContent = '멈춰요. 산소를 지나치게 많이 넣지 않아요. 1초만 눌러요. 분사 방향은 사람과 불이 없는 쪽이에요.'; }, 'bench-opt'));
    if (o.step < 5) tray.append(button(STEPS[o.step], () => { o.step++; status.textContent = o.step < 5 ? `다음: ${STEPS[o.step]}` : '동시에 덮었어요. 빨리 감기로 꺼질 때까지 봐요.'; renderTray(); }, 'mission-go'));
    else tray.append(button(run ? '빨리 감는 중' : '빨리 감기', () => { run = true; renderTray(); }, 'mission-go'));
  }
  renderTray();
  status.textContent = {grill: '공기 구멍 레버를 여러 칸으로 움직여 불꽃을 비교해 보세요.', o2: o.done ? '이미 실험을 마쳤어요. 공기만 든 병의 촛불은 12초, 산소를 더 넣은 병의 촛불은 30초에 꺼졌어요.' : '한 집기병에만 산소를 더 넣고 두 촛불을 동시에 덮어요.', empty: e.done ? '이미 확인했어요.' : '산소만 든 병에 점화기를 대면 어떻게 될까요?'}[mode];
  const ready = {grill: g.tried.length >= 3, o2: o.done, empty: e.done}[mode];
  if (ready) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G07 발화점 실험 (모형 값: 철판 온도 높음에서 성냥 머리 25초)
export function igniteLab({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const d = device(el, '가열판 발화점 실험 (모형 값)', '가열판 위 철판에 성냥 머리와 나무 조각을 올린 장면');
  const {c, status, tray, node} = d;
  const s = memory.ignite ??= {step: 0, heat: 0, t: 0, lit: false, off: false};
  const STEPS = ['성냥 머리 부분과 나무 부분을 같은 크기로 자르기', '내열 장갑 끼기', '핀셋으로 철판 가운데에서 같은 거리에 놓기', '가열판 전원 켜기'];
  let alive = true, raf = 0, k = 0;
  function draw() {
    if (!alive) return; k++;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef3f8'; c.fillRect(0, 0, 720, 380); c.fillStyle = '#c8d2de'; c.fillRect(0, 300, 720, 80);
    c.fillStyle = '#39424e'; c.fillRect(200, 250, 320, 50);
    const hot = ['#8e97a3', '#b7866a', '#d0703a', '#e84a2a'][s.heat]; c.fillStyle = hot; c.fillRect(220, 236, 280, 14);
    if (s.step >= 3) {
      if (s.heat >= 3 && !s.off) { s.t = Math.min(30, s.t + (reduceMotion() ? 30 : 0.1)); if (s.t >= 25 && !s.lit) { s.lit = true; status.textContent = '성냥 머리 부분에 갑자기 불이 붙어 타올랐어요. 나무 부분은 연기만 조금 나고 일부가 까맣게 그을렸어요. 이제 전원을 꺼요.'; renderTray(); } }
      c.fillStyle = s.lit ? '#2a2420' : '#b3342a'; c.beginPath(); c.arc(290, 230, s.lit ? 6 : 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c9a36a'; c.fillRect(410, 224, 26, 10); if (s.t > 20) { c.fillStyle = '#3a2a20'; c.fillRect(410, 224, 10, 10); }
      if (s.off) { c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'center'; c.fillText('철판이 아직 뜨거워요. 충분히 식힌 뒤 정리해요.', 360, 206); }
      if (s.lit && !s.off) flame(c, 290, 226, 50, {t: k});
      if (s.heat >= 2 && s.t > 8 && !s.off) { c.fillStyle = 'rgba(120,120,120,.35)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(423 + Math.sin((k + i * 30) / 12) * 6, 212 - ((k + i * 20) % 40), 6, 0, Math.PI * 2); c.fill(); } }
      c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'center'; c.fillText('성냥 머리 부분', 290, 272 + 50); c.fillText('나무 부분', 423, 272 + 50);
    }
    c.fillStyle = '#233a5c'; c.font = FONT(16, true); c.textAlign = 'left';
    c.fillText(s.step < 4 ? `지금 할 일: ${STEPS[s.step]}` : s.off ? '전원을 껐어요.' : `철판 온도: ${['꺼짐', '낮음', '중간', '높음'][s.heat]}${s.heat >= 3 ? `, 가열 ${Math.floor(s.t)}초` : ''}`, 16, 28);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    if (s.off) return;
    if (s.step < 4) {
      if (s.step === 2) tray.append(button('성냥 머리를 나무 조각 바로 옆에 붙여 놓기', () => { status.textContent = '너무 가까우면 불이 옮겨붙어요. 가운데에서 같은 거리에 따로 놓아요.'; }, 'bench-opt'));
      tray.append(button(STEPS[s.step], () => { s.step++; if (s.step === 4) s.heat = 1; status.textContent = s.step < 4 ? `다음: ${STEPS[s.step]}` : '전원을 켰어요. 온도를 조금씩 높여요.'; renderTray(); }, 'mission-go'));
      return;
    }
    if (s.heat < 3) tray.append(button('온도 높이기', () => { s.heat++; status.textContent = s.heat < 3 ? '철판이 따뜻해지고 있어요. 아직 변화가 없어요.' : '철판 온도가 높아졌어요. 얼굴을 가까이 대지 말고 관찰해요.'; renderTray(); }, 'mission-go'));
    tray.append(button('얼굴을 가까이 대고 보기', () => { status.textContent = '멈춰요. 얼굴을 가까이 대지 않아요. 관찰 거리를 지켜요.'; }, 'bench-opt'));
    if (s.lit) tray.append(button('변화가 나타났으니 전원 끄기', () => { s.off = true; status.textContent = '전원을 껐어요. 철판이 충분히 식은 뒤 내열 장갑을 끼고 정리해요.'; renderTray(); onAction('heated'); onReady?.(); }, 'mission-go'));
  }
  renderTray();
  status.textContent = s.off ? '이미 실험을 마쳤어요.' : '불을 직접 붙이지 않고 철판 온도만 높여 봐요. 두 물질의 크기와 거리를 같게 해요.';
  if (s.off) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G08 푸른색 염화 코발트 종이 검사
export function cobaltLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = (a) => { if (task.type === 'action') fire?.(a); };
  const d = device(el, {practice: '도구 익히기', test: '검사의 방 (모형)', extend: '확장 검사 (모형)'}[mode], '염화 코발트 종이와 집기병');
  const {c, status, tray, node} = d;
  const p = memory.practice ??= {drop: false};
  const s = memory.cobalt ??= {step: 0, dry: 0, t: 0, done: false};
  const x2 = memory.extend ??= {alc: false, wood: false};
  const STEPS = ['머리 말리개로 종이를 푸른색이 될 때까지 말리기', '종이 가운데에 셀로판테이프 붙이기', '핀셋으로 종이를 집기병 안쪽에 붙이기 (불꽃과 거리 두기)', '면장갑 끼기', '양초에 불 붙이고 집기병으로 덮기', '촛불이 꺼질 때까지 기다리기', '꺼진 뒤 충분히 더 기다리기'];
  let alive = true, raf = 0, k = 0;
  const BLUE = '#3f6fd8', PINK = '#e59bb8', RED = '#d9486e';
  function paper(x, y, col, tape) { c.fillStyle = col; c.fillRect(x - 26, y - 34, 52, 68); if (tape) { c.fillStyle = 'rgba(240,240,220,.85)'; c.fillRect(x - 26, y - 8, 52, 16); if (tape === 'blue') { c.fillStyle = BLUE; c.fillRect(x - 26, y - 8, 52, 16); c.fillStyle = 'rgba(240,240,220,.55)'; c.fillRect(x - 26, y - 8, 52, 16); } } }
  function draw() {
    if (!alive) return; k++;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef3f8'; c.fillRect(0, 0, 720, 380); c.fillStyle = '#c8d2de'; c.fillRect(0, 300, 720, 80);
    if (mode === 'practice') {
      paper(360, 200, p.drop ? RED : BLUE); if (!p.drop) { c.fillStyle = 'rgba(120,180,255,.8)'; c.beginPath(); c.arc(360, 120 + (k % 30), 6, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(p.drop ? '물이 닿은 곳이 붉게 변했어요.' : '푸른색 염화 코발트 종이에 물 한 방울을 떨어뜨려 봐요.', 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    if (mode === 'extend') {
      [['alc', '알코올램프', 230], ['wood', '나무 조각 (성냥개비 묶음)', 490]].forEach(([id, n, x]) => { c.strokeStyle = 'rgba(170,200,240,.95)'; c.lineWidth = 3; c.strokeRect(x - 60, 130, 120, 170); paper(x + 30, 200, x2[id] ? RED : BLUE); c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(n, x, 330); });
      raf = requestAnimationFrame(draw); return;
    }
    if (s.step === 5 && s.t < 1) s.t = Math.min(1, s.t + (reduceMotion() ? 1 : 0.01));
    const col = s.step === 0 ? (s.dry >= 3 ? BLUE : PINK) : BLUE;
    const burnt = s.step >= 6;
    c.strokeStyle = 'rgba(170,200,240,.95)'; c.lineWidth = 3; c.strokeRect(170, 130, 120, 170); c.strokeRect(430, 130, 120, 170);
    c.fillStyle = '#f5ecd8'; c.fillRect(214, 262, 32, 38); if (s.step >= 5 && s.t < 1 && s.step < 6) flame(c, 230, 258, 36 * (1 - s.t * 0.7), {t: k});
    paper(262, 200, burnt && s.done ? RED : col, s.step >= 2 ? (burnt && s.done ? 'blue' : true) : false);
    paper(490, 200, BLUE, true);
    c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText('실험 병', 230, 330); c.fillText('비교 병 (촛불 없음)', 490, 330);
    c.textAlign = 'left'; c.font = FONT(15, true); c.fillText(s.done ? '드러난 부분은 붉은색, 테이프 붙은 부분은 푸른색, 비교 병 종이는 푸른색이에요.' : `지금 할 일: ${STEPS[Math.min(s.step, STEPS.length - 1)]}`, 16, 28);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'practice') { if (!p.drop) tray.append(button('물 한 방울 떨어뜨리기', () => { p.drop = true; status.textContent = '푸른색 염화 코발트 종이는 물에 닿으면 붉게 변해요.'; renderTray(); onAction('practiced'); onReady?.(); }, 'mission-go')); return; }
    if (mode === 'extend') { tray.append(...[['alc', '알코올램프로 검사하기'], ['wood', '나무 조각으로 검사하기']].map(([id, n]) => button(n, () => { x2[id] = true; status.textContent = x2.alc && x2.wood ? '알코올과 나무도 연소하면 물이 생겨 종이가 붉게 변했어요.' : '종이가 붉게 변했어요.'; renderTray(); if (x2.alc && x2.wood) { onAction('extended'); onReady?.(); } }, 'bench-opt' + (x2[id] ? ' tested' : '')))); return; }
    if (s.done) return;
    if (s.step === 0) { tray.append(button(`머리 말리개로 말리기 (${s.dry}/3)`, () => { s.dry++; if (s.dry >= 3) { s.step = 1; status.textContent = '종이가 다시 푸른색이 됐어요. 공기 중 수증기 때문에 붉어졌던 거예요.'; } else status.textContent = '조금 더 말려요.'; renderTray(); }, 'mission-go')); return; }
    if (s.step === 5) { tray.append(button('촛불이 꺼질 때까지 기다리기', () => { s.t = 1; s.step = 6; status.textContent = '촛불이 꺼졌어요. 충분히 더 기다려요.'; renderTray(); }, 'mission-go')); return; }
    if (s.step === 6) { tray.append(button('충분히 더 기다린 뒤 종이 색 보기', () => { s.done = true; status.textContent = '드러난 부분만 붉게 변했어요. 테이프 붙은 부분과 비교 병 종이는 푸른색이에요.'; renderTray(); onAction('tested'); onReady?.(); }, 'mission-go')); return; }
    tray.append(button(STEPS[s.step], () => { s.step++; status.textContent = `다음: ${STEPS[s.step]}`; renderTray(); }, 'mission-go'));
  }
  renderTray();
  status.textContent = {practice: p.drop ? '이미 해 봤어요.' : '도구를 익혀요.', test: s.done ? '이미 검사를 마쳤어요.' : '종이가 조금 붉어 보여요. 먼저 말려서 써요.', extend: '다른 연료로도 물 검사를 빠르게 해 봐요.'}[mode];
  const ready = {practice: p.drop, test: s.done, extend: x2.alc && x2.wood}[mode];
  if (ready) setTimeout(() => onReady?.(), 0);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

export {FONT, device, flame, reduceMotion};
