// 불꽃 에너지 지구 뒷부분(연소 후 이산화 탄소, 이산화 탄소와 생태계, 홍보, 풀무) 조작 장면.
// 화면의 시간, 단계, 막대 높이는 모형 값이다. 실제 값으로 쓰는 것은 교과서 값(1,500 °C, 1,200 °C)뿐이다.
import {FONT, device, flame, reduceMotion} from './mission-fire.mjs';

const actOf = (task, fire) => (a) => { if (task.type === 'action') fire?.(a); };
const later = (on) => setTimeout(() => on?.(), 0);
function panel(el, owner, cls, ...kids) {
  const status = el('p', {class: 'signal-status', role: 'status'});
  const node = el('div', {class: 'signal-device sun ' + cls}, el('div', {class: 'signal-owner'}, owner), ...kids, status);
  return {node, status};
}

// ---------------------------------------------------------------- R2-G09 석회수 검사 (모형: 촛불 3초, 식히기와 흔들기 1.5초)
const MILK = (k) => `rgba(236,238,232,${0.12 + 0.8 * k})`;
function glassJar(c, x, {down = false, water = 0, cloud = 0, plate = false, label = '', hot = 0}) {
  c.save();
  if (down) { c.translate(0, 426); c.scale(1, -1); }
  c.strokeStyle = hot > 0.05 ? `rgba(230,120,90,${0.5 + hot * 0.4})` : 'rgba(150,185,230,.95)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x - 52, 126); c.lineTo(x - 52, 280); c.quadraticCurveTo(x - 52, 300, x - 32, 300); c.lineTo(x + 32, 300); c.quadraticCurveTo(x + 52, 300, x + 52, 280); c.lineTo(x + 52, 126); c.stroke();
  c.fillStyle = 'rgba(150,185,230,.9)'; c.fillRect(x - 58, 122, 12, 6); c.fillRect(x + 46, 122, 12, 6);
  if (water > 0) { c.fillStyle = cloud > 0.02 ? MILK(cloud) : 'rgba(205,228,255,.45)'; c.fillRect(x - 50, 298 - water, 100, water); }
  if (plate) { c.fillStyle = 'rgba(205,225,245,.9)'; c.fillRect(x - 64, 114, 128, 7); }
  c.restore();
  if (label) { c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(label, x, 332); }
}
function goggles(c, on) {
  if (!on) return;
  c.fillStyle = '#2f9a4f'; c.font = FONT(13, true); c.textAlign = 'right'; c.fillText('보안경 착용', 704, 28);
}
export function limeLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const title = {practice: '도구 확인: 석회수', test: '석회수 검사 (모형)', extend: '확장 검사 (모형)', layers: '촛불을 덮은 집기병 속 온도', incense: '해 보기 더: 향불 넣기 (모형)', humid: '연소 전과 후 습도계 (모형)'}[mode];
  const d = device(el, title, '집기병과 석회수');
  const {c, status, tray, node} = d;
  const p = memory.limeP ??= {step: 0, k: 0, done: false};
  const s = memory.lime ??= {step: 0, t: 0, cool: 0, shake: 0, done: false};
  const x = memory.limeX ??= {pick: null, k: 0, done: false};
  const inc = memory.limeI ??= {step: 0, k: 0, done: false};
  let alive = true, raf = 0, k = 0, anim = null;
  const SP = ['보안경 쓰기', '4학년 때 이산화 탄소를 모은 병에 석회수 붓기', '유리판을 덮고 수평으로 천천히 돌려 흔들기'];
  const ST = ['보안경 쓰기', '양초에 불을 붙이고 집기병으로 덮기 (비교 병은 불 없이 옆에 두기)', '촛불이 꺼지면 살짝 들어 올려 유리판으로 덮어 세우기', '충분히 식히기', '두 병에 석회수를 붓고 유리판으로 덮기', '유리판을 누른 채 수평으로 천천히 돌려 흔들기', '검은 종이를 대고 처음 모습과 비교하기', '쓴 석회수를 폐수 통에 모으기'];
  const SI = ['촛불 위 1 cm에서 집기병을 거꾸로 들기', '1분 동안 기체 모으기', '유리판으로 입구를 덮어 뒤집기', '향불을 집기병 속에 넣기'];
  const speed = () => (reduceMotion() ? 1 : 1 / 45);
  function candle(cx, lit, h = 38) { c.fillStyle = '#f5ecd8'; c.fillRect(cx - 14, 262, 28, 38); c.fillStyle = '#3a2f22'; c.fillRect(cx - 1.5, 254, 3, 8); if (lit) flame(c, cx, 256, h, {t: k}); }
  function draw() {
    if (!alive) return; k++;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#eef3f8'; c.fillRect(0, 0, 720, 380); c.fillStyle = '#c8d2de'; c.fillRect(0, 300, 720, 80);
    c.textAlign = 'left'; c.font = FONT(15, true); c.fillStyle = '#233a5c';
    if (mode === 'practice') {
      if (anim === 'shake') { p.k = Math.min(1, p.k + speed()); if (p.k >= 1) { anim = null; p.done = true; status.textContent = '맑던 석회수가 뿌옇게 흐려졌어요. 석회수는 이산화 탄소와 만나면 뿌옇게 흐려져요.'; renderTray(); onAction('practiced'); onReady?.(); } }
      const wob = anim === 'shake' ? Math.sin(k / 3) * 6 : 0;
      c.save(); c.translate(wob, 0); glassJar(c, 360, {water: p.step >= 2 ? 46 : 0, cloud: p.k, plate: p.step >= 2, label: '이산화 탄소를 모은 병'}); c.restore();
      goggles(c, p.step >= 1);
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left';
      c.fillText(p.done ? '석회수가 뿌옇게 흐려졌어요.' : `지금 할 일: ${SP[Math.min(p.step, 2)]}`, 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    if (mode === 'layers') {
      const band = [['위쪽', '온도 높음', 'rgba(240,140,100,.45)', 130, 158], ['가운데', '온도 중간', 'rgba(245,205,120,.45)', 187, 213], ['아래쪽', '온도 낮음', 'rgba(150,190,238,.45)', 243, 270]];
      band.forEach(([, , col, y0]) => { c.fillStyle = col; c.fillRect(310, y0, 100, 56); });
      glassJar(c, 360, {down: true, label: '촛불을 덮은 집기병'}); candle(360, true, 44);
      band.forEach(([n, tt, col, , y]) => { c.strokeStyle = '#5a6f8f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(414, y); c.lineTo(450, y); c.stroke(); c.fillStyle = col; c.fillRect(454, y - 12, 22, 22); c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'left'; c.fillText(`${n}: ${tt}`, 484, y + 5); });
      c.strokeStyle = 'rgba(220,110,70,.7)'; c.lineWidth = 2; for (let i = -1; i <= 1; i++) { const yy = 240 - ((k * 0.6 + i * 25) % 90); c.beginPath(); c.moveTo(360 + i * 16, yy + 18); c.lineTo(360 + i * 16, yy); c.lineTo(355 + i * 16, yy + 6); c.moveTo(360 + i * 16, yy); c.lineTo(365 + i * 16, yy + 6); c.stroke(); }
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText('촛불이 타면서 데워진 기체는 위로 올라가요.', 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    if (mode === 'humid') {
      [['연소 전', 180, 0.3], ['연소 후', 520, 0.68]].forEach(([n, cx, v]) => {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, 190, 80, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#5a6f8f'; c.lineWidth = 3; c.stroke();
        c.strokeStyle = '#9aa8bd'; c.lineWidth = 2; for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.8 + i * 0.14); c.beginPath(); c.moveTo(cx + Math.cos(a) * 66, 190 + Math.sin(a) * 66); c.lineTo(cx + Math.cos(a) * 76, 190 + Math.sin(a) * 76); c.stroke(); }
        const a = Math.PI * (0.8 + v * 1.4); c.strokeStyle = '#c0392b'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx, 190); c.lineTo(cx + Math.cos(a) * 60, 190 + Math.sin(a) * 60); c.stroke();
        c.fillStyle = '#233a5c'; c.font = FONT(13); c.textAlign = 'center'; c.fillText('건조', cx - 62, 262); c.fillText('습함', cx + 62, 262);
        c.font = FONT(16, true); c.fillText(`${n} 습도계`, cx, 300 + 30); c.font = FONT(13); c.fillText('온도는 같아요', cx, 352);
      });
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText('같은 온도에서 양초를 태우기 전과 태운 뒤 습도계를 비교해요.', 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    if (mode === 'extend') {
      if (anim === 'run') { x.k = Math.min(1, x.k + speed()); if (x.k >= 1) { anim = null; x.done = true; status.textContent = `${x.pick === 'alc' ? '알코올이' : '나무가'} 연소한 집기병의 석회수도 뿌옇게 흐려졌어요. 해 본 물질 칸에만 기록해요.`; renderTray(); onAction('extended'); onReady?.(); } }
      glassJar(c, 250, {water: x.pick ? 46 : 0, cloud: x.k, plate: !!x.pick, label: x.pick === 'alc' ? '알코올램프를 태운 병' : x.pick === 'wood' ? '나무 조각을 태운 병' : '검사할 병'});
      c.fillStyle = '#fff'; c.fillRect(420, 120, 280, 120); c.strokeStyle = '#8fa9cf'; c.strokeRect(420, 120, 280, 120);
      c.fillStyle = '#233a5c'; c.font = FONT(14, true); c.textAlign = 'left'; c.fillText('검사 기록표', 434, 144);
      c.font = FONT(14); c.fillText(`알코올램프: ${x.pick === 'alc' && x.done ? '뿌옇게 흐려짐' : '(빈칸)'}`, 434, 180); c.fillText(`나무 조각: ${x.pick === 'wood' && x.done ? '뿌옇게 흐려짐' : '(빈칸)'}`, 434, 214);
      c.font = FONT(15, true); c.fillText(x.done ? '해 본 물질만 기록했어요.' : '알코올램프와 나무 조각 가운데 하나로 검사해요.', 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    if (mode === 'incense') {
      if (anim === 'collect') { inc.k = Math.min(1, inc.k + speed()); if (inc.k >= 1) { anim = null; inc.step = 2; status.textContent = '기체를 모았어요. 유리판으로 덮어 뒤집어요.'; renderTray(); } }
      const up = inc.step >= 3;
      glassJar(c, 360, {down: !up, plate: up, label: up ? '모은 기체가 든 집기병' : '거꾸로 든 집기병'});
      if (!up) { c.save(); c.translate(0, -60); candle(360, true, 40); c.restore(); }
      if (inc.step >= 4) { c.strokeStyle = '#6b4a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(420, 60); c.lineTo(372, 200); c.stroke(); c.fillStyle = 'rgba(120,120,120,.5)'; c.beginPath(); c.arc(372, 196 - (k % 20), 3, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(inc.done ? '향불이 바로 꺼졌어요.' : `지금 할 일: ${SI[Math.min(inc.step, 3)]}`, 16, 28);
      raf = requestAnimationFrame(draw); return;
    }
    // test
    if (anim === 'burn') { s.t = Math.min(1, s.t + (reduceMotion() ? 1 : 1 / 180)); if (s.t >= 1) { anim = null; status.textContent = '촛불이 꺼졌어요. 이제 살짝 들어 올려 유리판으로 덮어 세워요.'; renderTray(); } }
    if (anim === 'cool') { s.cool = Math.min(1, s.cool + speed()); if (s.cool >= 1) { anim = null; s.step = 4; status.textContent = '충분히 식었어요.'; renderTray(); } }
    if (anim === 'shake') { s.shake = Math.min(1, s.shake + speed()); if (s.shake >= 1) { anim = null; s.step = 6; status.textContent = '실험 병의 석회수가 뿌옇게 흐려졌어요. 비교 병은 그대로예요.'; renderTray(); } }
    if (s.step >= 6) { c.fillStyle = '#1a1a1a'; c.fillRect(160, 110, 140, 196); c.fillRect(420, 110, 140, 196); }
    const up = s.step >= 3, wob = anim === 'shake' ? Math.sin(k / 3) * 5 : 0;
    const hot = s.step >= 2 ? 1 - s.cool : 0;
    c.save(); c.translate(wob, 0);
    glassJar(c, 230, {down: !up, water: s.step >= 5 ? 46 : 0, cloud: s.shake, plate: up, hot, label: '실험 병'});
    glassJar(c, 490, {down: !up, water: s.step >= 5 ? 46 : 0, cloud: 0, plate: up, label: '비교 병 (촛불 없음)'});
    c.restore();
    if (!up && s.step >= 2) candle(230, s.t < 1, 36 * (1 - s.t * 0.6));
    if (!up && s.step < 2) candle(230, false);
    if (s.step >= 7 || s.done) { c.fillStyle = '#7d8795'; c.fillRect(620, 250, 70, 50); c.fillStyle = '#e8ecf2'; c.font = FONT(12, true); c.textAlign = 'center'; c.fillText('폐수 통', 655, 280); }
    goggles(c, s.step >= 1);
    c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left';
    c.fillText(s.done ? '실험 병은 뿌옇게 흐려지고 비교 병은 맑아요.' : anim === 'burn' ? '촛불이 꺼질 때까지 기다려요.' : `지금 할 일: ${ST[Math.min(s.step, ST.length - 1)]}`, 16, 28);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'practice') {
      if (p.done || anim) return;
      if (p.step === 2) tray.append(button('위아래로 세게 흔들기', () => { status.textContent = '멈춰요. 석회수가 튈 수 있어요. 유리판을 덮고 수평으로 천천히 돌려요.'; }, 'bench-opt'));
      tray.append(button(SP[p.step], () => { if (p.step === 2) { anim = 'shake'; renderTray(); return; } p.step++; status.textContent = `다음: ${SP[p.step]}`; renderTray(); }, 'mission-go'));
      return;
    }
    if (mode === 'extend') {
      if (x.pick) return;
      tray.append(...[['alc', '알코올램프로 검사하기'], ['wood', '나무 조각으로 검사하기']].map(([id, n]) => button(n, () => { x.pick = id; anim = 'run'; renderTray(); }, 'mission-go')));
      return;
    }
    if (mode === 'incense') {
      if (inc.done || anim) return;
      if (inc.step === 1) { tray.append(button('1분 동안 기체 모으기', () => { anim = 'collect'; renderTray(); }, 'mission-go')); return; }
      tray.append(button(SI[inc.step], () => { if (inc.step === 3) { inc.step = 4; inc.done = true; status.textContent = '향불이 바로 꺼졌어요. 촛불 위에서 모은 기체에는 산소가 적고 이산화 탄소가 많아요.'; renderTray(); onAction('incense'); onReady?.(); return; } inc.step++; status.textContent = `다음: ${SI[inc.step]}`; renderTray(); }, 'mission-go'));
      return;
    }
    if (mode !== 'test' || s.done || anim) return;
    if (s.step === 2 && s.t < 1) return;
    if (s.step === 3) tray.append(button('바로 석회수 붓기', () => { status.textContent = '멈춰요. 뜨거운 집기병에 차가운 석회수를 부으면 깨질 수 있어요. 충분히 식혀요.'; }, 'bench-opt'));
    if (s.step === 5) tray.append(button('위아래로 세게 흔들기', () => { status.textContent = '멈춰요. 석회수가 튈 수 있어요. 유리판을 누른 채 수평으로 천천히 돌려요.'; }, 'bench-opt'));
    if (s.step === 7) tray.append(button('쓴 석회수를 싱크대에 붓기', () => { status.textContent = '쓴 석회수는 싱크대에 버리지 않고 폐수 통에 모아요.'; }, 'bench-opt'));
    tray.append(button(ST[s.step], () => {
      if (s.step === 1) { s.step = 2; anim = 'burn'; renderTray(); return; }
      if (s.step === 3) { anim = 'cool'; renderTray(); return; }
      if (s.step === 5) { anim = 'shake'; renderTray(); return; }
      if (s.step === 7) { s.done = true; status.textContent = '검사를 마쳤어요. 실험 병의 석회수만 뿌옇게 흐려졌어요.'; renderTray(); onAction('tested'); onReady?.(); return; }
      s.step++; status.textContent = s.step === 7 ? '검은 종이를 대니 흐려진 모습이 잘 보여요. 처음에는 두 병 모두 맑았어요.' : `다음: ${ST[s.step]}`; renderTray();
    }, 'mission-go'));
  }
  // 촛불이 꺼지기를 기다리거나 확장 검사를 하는 도중에 나갔다가 다시 들어오면 멈춘 곳부터 이어 움직인다(누를 단추가 없는 채로 멈추지 않게).
  if (mode === 'test' && !s.done && s.step === 2 && s.t < 1) anim = 'burn';
  if (mode === 'extend' && x.pick && !x.done) anim = 'run';
  renderTray();
  status.textContent = {practice: p.done ? '이미 확인했어요.' : '4학년 때 모은 이산화 탄소 병으로 석회수가 어떻게 변하는지 먼저 확인해요.', test: s.done ? '이미 검사를 마쳤어요.' : '집기병 크기, 석회수 양, 흔드는 방법은 두 병 모두 같게 해요.', extend: x.done ? '이미 검사했어요.' : '다른 연료로도 석회수 검사를 해 봐요.', layers: '온도 표시를 보고 이산화 탄소가 먼저 모이는 곳을 생각해 봐요.', incense: inc.done ? '이미 해 봤어요.' : '촛불 위에서 기체를 모아 향불을 넣어 봐요.', humid: '두 습도계 바늘을 비교해 보세요.'}[mode];
  const ready = {practice: p.done, test: s.done, extend: x.done, layers: true, incense: inc.done, humid: true}[mode];
  if (ready) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G10 이산화 탄소와 생태계 모형 (단순화한 모형, 숫자 없음)
const LEVEL = ['아주 적음', '적음', '보통', '많음', '아주 많음'];
const SCENE = {
  sea: ['산호 색이 선명해요', '산호 색이 선명해요', '산호 일부가 하얗게 변했어요', '산호가 많이 하얗게 변했어요', '산호 대부분이 하얗게 변했어요'],
  beach: ['새끼 거북이 고르게 나와요', '새끼 거북이 고르게 나와요', '모래가 뜨거워졌어요', '암컷 표시가 많아졌어요', '거북 수가 줄었어요'],
  forest: ['구상나무 숲이 넓어요', '구상나무 숲이 넓어요', '숲 가장자리가 말랐어요', '구상나무 서식지가 줄었어요', '서식지가 크게 줄었어요'],
  polar: ['얼음이 넓어요', '얼음이 넓어요', '얼음이 조금 줄었어요', '얼음이 많이 줄었어요', '얼음이 조각만 남았어요'],
};
export function climateModel({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const caption = el('p', {class: 'eco-caption'}, '실제 변화는 여러 원인이 함께 작용해요. 이 화면은 경향만 보여 주는 단순화한 모형이에요.');
  const d = device(el, '바다와 숲 관측 화면 (단순화한 모형)', '산호 바다, 거북 해변, 구상나무 숲, 극지방 모습', [caption]);
  const {c, status, tray, node} = d;
  const m = memory.climate ??= {v: {car: 1, power: 1, heat: 1}, hi: false, lo: false};
  let alive = true, raf = 0, k = 0, fired = m.hi && m.lo;
  if (fired) later(onReady);
  const stage = () => Math.round((m.v.car + m.v.power + m.v.heat) / 3);
  function box(x, y, w, h, title) { c.fillStyle = '#ffffff'; c.fillRect(x, y, w, h); c.strokeStyle = '#8fa9cf'; c.lineWidth = 2; c.strokeRect(x, y, w, h); c.fillStyle = '#233a5c'; c.font = FONT(13, true); c.textAlign = 'left'; c.fillText(title, x + 8, y + 18); }
  function draw() {
    if (!alive) return; k++;
    const s = stage();
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#e9eff6'; c.fillRect(0, 0, 720, 380);
    c.fillStyle = '#233a5c'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText('공기 중 이산화 탄소', 16, 26);
    for (let i = 0; i < 5; i++) { c.fillStyle = i <= s ? ['#7fc97f', '#b8d86b', '#f0c24a', '#f08a3c', '#d9483b'][i] : '#cfd8e3'; c.fillRect(170 + i * 34, 12, 30, 18); }
    c.fillStyle = '#233a5c'; c.font = FONT(14); c.fillText(LEVEL[s], 350, 26);
    // 산호 바다
    box(10, 40, 345, 160, '산호 바다'); c.fillStyle = '#5aa0d8'; c.fillRect(12, 64, 341, 134);
    const white = [0, 0, 2, 4, 5][s], COL = ['#ff7f7f', '#ffb347', '#c77dff', '#ff9ec7', '#7fe0c0', '#ffd166'];
    COL.forEach((col, i) => { const cx = 50 + i * 52, cy = 170; c.fillStyle = i < white ? '#f4f4ee' : col; c.beginPath(); c.arc(cx, cy, 16, Math.PI, 0); c.fill(); c.fillRect(cx - 4, cy, 8, 22); c.beginPath(); c.arc(cx - 12, cy - 8, 8, 0, Math.PI * 2); c.arc(cx + 12, cy - 10, 7, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = '#fff'; c.font = FONT(12, true); c.fillText(SCENE.sea[s], 20, 90);
    // 거북 해변
    box(365, 40, 345, 160, '거북 해변'); const sand = ['#f3dca0', '#f3dca0', '#f6c983', '#f9b46b', '#fb9e55'][s]; c.fillStyle = sand; c.fillRect(367, 110, 341, 88); c.fillStyle = '#6fb0e0'; c.fillRect(367, 64, 341, 46);
    if (s >= 2) { c.strokeStyle = 'rgba(230,90,40,.5)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); const bx = 400 + i * 80; for (let j = 0; j < 20; j++) c.lineTo(bx + Math.sin((j + k / 6) / 2) * 4, 190 - j * 3); c.stroke(); } }
    const n = [8, 8, 6, 4, 2][s];
    for (let i = 0; i < n; i++) { const tx = 390 + i * 38, ty = 160 + (i % 2) * 14; c.fillStyle = '#4f7d3a'; c.beginPath(); c.ellipse(tx, ty, 9, 6, 0, 0, Math.PI * 2); c.fill(); if (s >= 3) { c.fillStyle = '#e0529a'; c.beginPath(); c.arc(tx, ty - 11, 3, 0, Math.PI * 2); c.fill(); } }
    c.fillStyle = '#233a5c'; c.font = FONT(12, true); c.fillText(SCENE.beach[s], 375, 90);
    // 구상나무 숲
    box(10, 210, 345, 160, '구상나무 숲'); c.fillStyle = '#cfe3f3'; c.fillRect(12, 232, 341, 136); c.fillStyle = '#8a9a7a'; c.beginPath(); c.moveTo(12, 368); c.lineTo(180, 250); c.lineTo(353, 368); c.fill();
    const trees = [11, 11, 9, 6, 3][s];
    for (let i = 0; i < 11; i++) { const tx = 60 + i * 24, ty = 350 - Math.max(0, 90 - Math.abs(tx - 180) * 0.7); const alive2 = i >= (11 - trees) / 2 && i < (11 + trees) / 2; c.fillStyle = alive2 ? (s >= 2 && (i === Math.ceil((11 - trees) / 2) || i === Math.floor((11 + trees) / 2) - 1) ? '#a08a4a' : '#2f6b3a') : '#b9a98a'; c.beginPath(); c.moveTo(tx, ty - 26); c.lineTo(tx + 9, ty); c.lineTo(tx - 9, ty); c.fill(); }
    c.fillStyle = '#233a5c'; c.font = FONT(12, true); c.fillText(SCENE.forest[s], 20, 258);
    // 극지방 지식 카드
    box(365, 210, 345, 160, '극지방 (지식 카드)'); c.fillStyle = '#3b6f9e'; c.fillRect(367, 232, 341, 136);
    const ice = [1, 1, 0.8, 0.55, 0.25][s]; c.fillStyle = '#f2f7fb';
    if (s < 4) { c.beginPath(); c.ellipse(537, 300, 150 * ice, 50 * ice, 0, 0, Math.PI * 2); c.fill(); } else { [[480, 300], [560, 320], [610, 290]].forEach(([ix, iy]) => { c.beginPath(); c.ellipse(ix, iy, 22, 10, 0.3, 0, Math.PI * 2); c.fill(); }); }
    c.fillStyle = '#fff'; c.font = FONT(12, true); c.fillText(SCENE.polar[s], 375, 258);
    raf = requestAnimationFrame(draw);
  }
  const rows = [['car', '자동차'], ['power', '화석 연료 발전'], ['heat', '난방']].map(([id, name]) => {
    const r = el('input', {type: 'range', min: '0', max: '4', step: '1', value: String(m.v[id]), 'aria-label': name + ' 연소량'});
    const out = el('span', {class: 'eco-level'}, LEVEL[m.v[id]]);
    r.addEventListener('input', () => { m.v[id] = Number(r.value); out.textContent = LEVEL[m.v[id]]; check(); });
    return el('label', {class: 'eco-slider'}, el('span', {}, name + ' 연소량'), r, out);
  });
  function check() {
    const s = stage();
    if (s >= 4) m.hi = true; if (s <= 1) m.lo = true;
    status.textContent = m.hi && m.lo ? `이산화 탄소가 많을 때와 적을 때를 모두 봤어요. 지금은 ${LEVEL[s]} 단계예요.` : `연소량을 올리고 내리며 네 장면을 비교해 보세요. ${m.hi ? '' : '가장 많을 때'}${!m.hi && !m.lo ? '와 ' : ''}${m.lo ? '' : '적을 때'}를 아직 보지 않았어요.`;
    if (m.hi && m.lo && !fired) { fired = true; onAction('explored'); onReady?.(); }
  }
  tray.append(el('div', {class: 'eco-sliders'}, rows));
  check();
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G10 가상 검색 (교사 준비 자료만 보여 주고 외부 인터넷에 연결하지 않음)
const DOCS = [
  {id: 'fir', tags: ['기후변화', '구상나무'], kind: 'ok', title: '한라산 구상나무 숲이 줄어들어요', src: '과학 교과서 57쪽 사례', body: '높은 산에 사는 구상나무가 사는 곳이 줄어들고 있어요. 기온이 높아진 것이 까닭으로 꼽혀요.'},
  {id: 'turtle', tags: ['기후변화', '붉은바다거북'], kind: 'ok', title: '붉은바다거북이 줄어들어요', src: '과학 교과서 57쪽 사례', body: '붉은바다거북 알은 모래 온도에 따라 암컷과 수컷이 정해져요. 모래가 뜨거워지면 암컷이 많이 태어나 번식이 어려워지고 거북 수가 줄어요.'},
  {id: 'coral', tags: ['기후변화', '산호'], kind: 'ok', title: '산호가 하얗게 변해요', src: '과학 교과서 57쪽 사례', body: '바닷물 온도가 높아지면 산호가 하얗게 변하고 살기 어려워져요.'},
  {id: 'polar', tags: ['기후변화'], kind: 'ok', title: '극지방 얼음이 줄어들어요', src: '선생님이 준비한 수업 자료', body: '기온이 높아지면 빙하와 언 땅이 녹아 추운 곳에 적응한 생물이 살기 어려워져요.'},
  {id: 'nosrc', tags: ['기후변화', '구상나무', '붉은바다거북'], kind: 'nosource', title: '생물 피해는 전혀 없다는 글 (예시)', src: '출처가 없는 글', body: ''},
  {id: 'game', tags: ['기후변화'], kind: 'unrelated', title: '무료 게임 설치 파일 (예시)', src: '활동과 관계없는 파일', body: ''},
  {id: 'ad', tags: ['기후변화', '산호'], kind: 'unrelated', title: '바닷가 기념품 할인 광고 (예시)', src: '활동과 관계없는 누리집', body: ''},
];
export function virtualSearch({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const m = memory.search ??= {terms: [], opened: []};
  const terms = el('div', {class: 'bench-seg'}), list = el('div', {class: 'eco-list'}), read = el('div', {class: 'eco-read', 'aria-live': 'polite'});
  const {node, status} = panel(el, '탐구대 가상 검색 (선생님이 준비한 자료만 나와요)', 'eco-search', el('p', {class: 'eco-how'}, '넓은 검색어로 먼저 찾고, 구체적인 주제어를 더해 좁혀 보세요.'), terms, list, read);
  const narrowed = () => m.terms.some((t) => t !== '기후변화');
  let fired = narrowed() && m.opened.length >= 2;
  if (fired) later(onReady);
  function results() { const sp = m.terms.filter((t) => t !== '기후변화'); if (!m.terms.length) return []; return DOCS.filter((d) => (sp.length ? sp.some((t) => d.tags.includes(t)) : d.tags.includes('기후변화'))); }
  function paint() {
    terms.replaceChildren(...['기후변화', '구상나무', '붉은바다거북', '산호'].map((t) => { const on = m.terms.includes(t); const b = button((on ? '검색어 빼기: ' : '검색어 더하기: ') + t, () => { if (on) m.terms = m.terms.filter((x) => x !== t); else { if (t !== '기후변화' && !m.terms.includes('기후변화')) { status.textContent = '먼저 넓은 검색어 "기후변화"로 찾아 보세요.'; return; } m.terms.push(t); } paint(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(on)); return b; }));
    const rs = results();
    list.replaceChildren(el('strong', {}, m.terms.length ? `검색 결과 ${rs.length}개 (검색어: ${m.terms.join(' + ')})` : '검색어를 골라 주세요.'), ...rs.map((d) => el('div', {class: 'eco-item ' + d.kind + (m.opened.includes(d.id) ? ' opened' : '')}, el('span', {class: 'eco-title'}, d.title), el('small', {}, '만든 곳: ' + d.src), button('열어 보기', () => open(d), 'bench-opt'))));
    check();
  }
  function open(d) {
    if (d.kind === 'unrelated') { read.replaceChildren(el('p', {class: 'eco-warn'}, '멈춰요. 조사와 관계없는 파일이나 누리집은 열지 않아요.')); return; }
    if (d.kind === 'nosource') { read.replaceChildren(el('p', {class: 'eco-warn'}, '누가 썼는지 알 수 없는 글이에요. 믿을 만한 근거로 쓰기 어려워요. 전문가나 공공기관 자료를 골라요.')); return; }
    if (!m.opened.includes(d.id)) m.opened.push(d.id);
    read.replaceChildren(el('h4', {}, d.title), el('p', {}, d.body), el('small', {}, '출처: ' + d.src));
    paint();
  }
  function check() {
    const n = m.opened.length;
    status.textContent = narrowed() && n >= 2 ? `믿을 만한 자료 ${n}개를 읽었어요.` : `${narrowed() ? '검색어를 좁혔어요.' : '주제어를 더해 결과를 좁혀 보세요.'} 믿을 만한 자료 ${n}/2`;
    if (narrowed() && n >= 2 && !fired) { fired = true; onAction('searched'); onReady?.(); }
  }
  paint();
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- 실천 달력 (게임은 켜고 체크만 한다)
export function actionCalendar({el, button, task = {}, memory = {}, save, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const m = memory.cal ??= {place: null, method: null, on: false, checks: []};
  const PLACES = task.places || [['road', '자동차가 많이 다니는 길'], ['boiler', '보일러 굴뚝이 있는 집'], ['grill', '불판을 쓰는 식당']];
  const METHODS = task.methods || [['walk', '가까운 거리는 걸어 다니기'], ['plug', '안 쓰는 플러그 뽑기'], ['temp', '냉난방 온도 알맞게 맞추기']];
  const box = el('div', {class: 'eco-cal'});
  const {node, status} = panel(el, '일주일 실천 달력', 'eco-calendar', box);
  function paint() {
    const pickRow = (list, key, label) => el('div', {}, el('p', {class: 'eco-how'}, label), el('div', {class: 'bench-seg'}, list.map(([id, n]) => { const b = button(n, () => { if (m.on) return; m[key] = id; paint(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(m[key] === id)); return b; })));
    const days = el('div', {class: 'eco-days'}, Array.from({length: 7}, (_, i) => el('span', {class: 'eco-day' + (m.checks.includes(i) ? ' done' : '')}, `${i + 1}일째`)));
    box.replaceChildren(pickRow(PLACES, 'place', task.placeLabel || '주변에서 연소로 이산화 탄소가 생기는 곳'), pickRow(METHODS, 'method', task.methodLabel || '이산화 탄소를 줄이는 방법 한 가지'),
      m.on ? days : button('일주일 실천 달력 켜기', () => { if (!m.place || !m.method) { status.textContent = '위와 아래에서 하나씩 골라 주세요.'; return; } m.on = true; paint(); onAction('calendar'); onReady?.(); }, 'mission-go'),
      m.on && m.checks.length < 7 ? button('오늘 실천했어요', () => {
        // 달력은 하루에 한 칸씩 채운다. 체크한 날은 바로 저장한다.
        const today = new Date().toLocaleDateString('sv');
        m.dates ??= [];
        if (m.dates.includes(today)) { status.textContent = '오늘은 이미 체크했어요. 내일 실천하고 다시 체크해요.'; return; }
        m.dates.push(today); m.checks.push(m.checks.length); paint(); save?.();
      }, 'bench-opt') : '');
    status.textContent = m.on ? '실천은 실제 생활에서 하고, 달력에는 날마다 체크만 해요.' : '위와 아래에서 하나씩 고르고 달력을 켜요.';
  }
  paint();
  if (m.on) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- R2-G11 실천 전략판 (모형 값: 세 연소량 모두 4단계에서 시작, 행동 포인트 10점)
const PLAYS = [
  ['walk', '가까운 거리는 걷거나 자전거 타기', 'cut', 1, {car: -1}], ['bus', '대중교통 이용하기', 'cut', 1, {car: -1}],
  ['plug', '안 쓰는 플러그 뽑기', 'cut', 1, {power: -1}], ['tv', 'TV를 보지 않을 때 전원 끄기', 'cut', 1, {power: -1}],
  ['save', '전기 아껴 쓰기', 'cut', 1, {power: -1}], ['temp', '냉난방 온도 알맞게 맞추기', 'cut', 1, {heat: -1}],
  ['trash', '해변 쓰레기 줍기', 'protect', 1, {beach: 1}], ['shade', '해변에 나무를 심어 그늘 만들기 제안', 'protect', 2, {shade: 1}],
  ['fir', '구상나무를 여러 곳에 심어 서식지 늘리기 제안', 'protect', 2, {forest: 1}],
  ['car', '가까운 거리도 자가용 타기', 'trap', 0, {car: 1}], ['cup', '편리한 일회용품 자주 쓰기', 'trap', 0, {litter: 1}], ['idle', '쓰지 않는 고효율 제품 계속 켜 두기', 'trap', 0, {power: 1}],
];
export function strategyBoard({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const d = device(el, '실천 전략판 (모형)', '세 연소량 막대와 해변, 숲 모습');
  const {c, status, tray, node} = d;
  const m = memory.plan ??= {on: [], done: false};
  let alive = true, raf = 0;
  const eff = () => { const v = {car: 4, power: 4, heat: 4, beach: 0, shade: 0, forest: 0, litter: 0}; for (const id of m.on) { const p = PLAYS.find((x) => x[0] === id); for (const [kk, dv] of Object.entries(p[4])) v[kk] = Math.max(0, Math.min(4, v[kk] + dv)); } return v; };
  const points = () => m.on.reduce((a, id) => a + PLAYS.find((x) => x[0] === id)[3], 0);
  const stage = (v) => Math.round((v.car + v.power + v.heat) / 3);
  function draw() {
    if (!alive) return;
    const v = eff(), s = stage(v);
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#1d2433'; c.fillRect(0, 0, 720, 380);
    c.fillStyle = '#e8ecf2'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(`행동 포인트 ${10 - points()}점 남음`, 16, 28);
    [['car', '자동차'], ['power', '발전'], ['heat', '난방']].forEach(([kk, n], i) => { const x = 40 + i * 110; c.fillStyle = '#39424e'; c.fillRect(x, 70, 60, 200); c.fillStyle = '#f08a3c'; c.fillRect(x, 270 - v[kk] * 50, 60, v[kk] * 50); c.fillStyle = '#e8ecf2'; c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(n, x + 30, 296); });
    c.fillStyle = '#e8ecf2'; c.textAlign = 'left'; c.font = FONT(15, true); c.fillText('이산화 탄소', 380, 70);
    for (let i = 0; i < 5; i++) { c.fillStyle = i <= s ? ['#7fc97f', '#b8d86b', '#f0c24a', '#f08a3c', '#d9483b'][i] : '#39424e'; c.fillRect(380 + i * 60, 82, 54, 22); }
    c.fillStyle = '#9ec5ff'; c.fillText('목표: 2단계 이하 (초록과 연두, 노랑)', 380, 128);
    c.fillStyle = '#f3dca0'; c.fillRect(380, 150, 150, 90); c.fillStyle = '#6fb0e0'; c.fillRect(380, 150, 150, 26);
    if (v.beach) { c.fillStyle = '#7fc97f'; c.font = FONT(12, true); c.fillText('해변 보호', 390, 230); }
    if (v.shade) { c.fillStyle = '#2f6b3a'; c.beginPath(); c.arc(500, 195, 18, 0, Math.PI * 2); c.fill(); c.fillStyle = '#6b4a2a'; c.fillRect(497, 205, 6, 20); }
    for (let i = 0; i < v.litter * 3; i++) { c.fillStyle = '#d0d4da'; c.fillRect(395 + i * 22, 208, 10, 6); }
    c.fillStyle = '#e8ecf2'; c.font = FONT(13, true); c.fillText('거북 해변', 380, 258);
    c.fillStyle = '#8a9a7a'; c.beginPath(); c.moveTo(550, 240); c.lineTo(625, 150); c.lineTo(700, 240); c.fill();
    for (let i = 0; i < (v.forest ? 6 : 3); i++) { c.fillStyle = '#2f6b3a'; const tx = 590 + i * 14; c.beginPath(); c.moveTo(tx, 196); c.lineTo(tx + 6, 214); c.lineTo(tx - 6, 214); c.fill(); }
    c.fillStyle = '#e8ecf2'; c.fillText('구상나무 숲', 560, 258);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren(el('div', {class: 'eco-plays'}, ...[['cut', '이산화 탄소 줄이기'], ['protect', '생물 지키기'], ['trap', '다른 카드']].map(([kind, h]) => el('div', {class: 'eco-play-col'}, el('strong', {}, h), ...PLAYS.filter((p) => p[2] === kind).map(([id, n, , pt]) => {
      const on = m.on.includes(id);
      const b = button(`${n} (${pt}점)`, () => {
        if (m.done) return;
        if (on) m.on = m.on.filter((x) => x !== id);
        else { if (points() + pt > 10) { status.textContent = '행동 포인트가 모자라요. 다른 카드를 빼 보세요.'; return; } m.on.push(id); }
        const p = PLAYS.find((x) => x[0] === id);
        status.textContent = !on && p[2] === 'trap' ? '이 카드를 놓았더니 막대가 어떻게 되었는지 보세요.' : `이산화 탄소 ${stage(eff())}단계 모형이에요.`;
        renderTray();
      }, 'bench-opt');
      b.setAttribute('aria-pressed', String(on)); return b;
    })))), m.done ? '' : button('전략 적용하기', apply, 'mission-go'));
  }
  function apply() {
    const v = eff(), s = stage(v), traps = m.on.filter((id) => PLAYS.find((x) => x[0] === id)[2] === 'trap'), prot = m.on.filter((id) => PLAYS.find((x) => x[0] === id)[2] === 'protect');
    if (traps.length) { status.textContent = '막대를 올리는 카드가 놓여 있어요. 먼저 빼고 적용해요.'; return; }
    if (s > 2) { status.textContent = `이산화 탄소가 ${s}단계예요. 줄이기 카드를 더 놓아 2단계 이하로 낮춰요.`; return; }
    if (!prot.length) { status.textContent = '생물 지키기 카드도 한 장 이상 놓아요.'; return; }
    m.done = true; status.textContent = `이산화 탄소 ${s}단계, 생물 지키기 카드 ${prot.length}장으로 목표를 이뤘어요. 나와 가족의 작은 실천이 막대를 낮췄어요.`; renderTray(); onAction('applied'); onReady?.();
  }
  renderTray();
  status.textContent = m.done ? '전략을 적용했어요.' : '카드를 놓아 이산화 탄소를 2단계 이하로 낮추고, 생물 지키기 카드를 한 장 이상 놓아요. 막대는 카드로만 바뀌어요.';
  if (m.done) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R2-G11 인터뷰 (질문 카드를 골라 알맞은 사람에게 묻는다)
export function ecoInterview({el, button, task = {}, mission = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const people = mission.people || {}, qs = mission.questions || [];
  const m = memory.iv ??= {got: [], who: Object.keys(people)[0]};
  const tabs = el('div', {class: 'iv-tabs', role: 'tablist'}), talk = el('div', {class: 'iv-log', 'aria-live': 'polite'}), deck = el('div', {class: 'm-options'}), notes = el('div', {class: 'iv-notes'});
  const {node, status} = panel(el, mission.ivTitle || '방송실 인터뷰', 'eco-iv', tabs, talk, deck, notes);
  const need = mission.needCards || [], rule = mission.needRule;
  const complete = () => rule ? m.got.length >= rule.total && Object.keys(people).every((w) => m.got.filter((x) => x.startsWith(w + '.')).length >= rule.each) : need.every((x) => m.got.includes(x));
  const noteOf = (key) => { if (!key.includes('.')) { const q = qs.find((x) => x.card === key); return q ? `${q.tag}: ${q.note}` : ''; } const [w, c] = key.split('.'); const q = qs.find((x) => x.card === c); return q && people[w] ? `${people[w].name} ${q.tag}: ${q.answers?.[w]?.note || ''}` : ''; };
  let fired = complete();
  if (fired) later(onReady);
  function paint() {
    tabs.replaceChildren(...Object.entries(people).map(([id, p]) => { const b = button('', () => { m.who = id; talk.replaceChildren(el('p', {class: 'iv-a'}, `${p.name}: ${p.intro}`)); paint(); }, 'iv-tab' + (m.who === id ? ' sel' : '')); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(m.who === id)); b.append(el('img', {src: p.img, alt: ''}), el('span', {}, p.name)); return b; }));
    deck.replaceChildren(...qs.map((q) => button(q.q, () => ask(q), 'm-option')));
    const head = rule ? `모은 카드 ${m.got.length}/${rule.total} (사람마다 ${rule.each}장 이상)` : `모은 답 카드 ${need.filter((x) => m.got.includes(x)).length}/${need.length}`;
    notes.replaceChildren(el('strong', {}, head), m.got.length ? el('ul', {}, m.got.map((k) => el('li', {}, noteOf(k)))) : el('p', {}, '아직 모은 카드가 없어요.'));
    if (complete() && !fired) { fired = true; status.textContent = mission.doneText || '홍보 계획에 필요한 답 카드를 모두 모았어요.'; onAction('interviewed'); onReady?.(); }
  }
  function ask(q) {
    const p = people[m.who];
    let line;
    if (!q.card) line = `${p.name}: ${mission.offTopic || '그 질문은 홍보 계획과 관계가 없어요. 다른 질문 카드를 골라 보세요.'}`;
    else if (q.answers) { const per = q.answers[m.who]; if (per) { line = `${p.name}: ${per.a}`; const key = m.who + '.' + q.card; if (!m.got.includes(key)) m.got.push(key); } else line = `${p.name}: ${q.redirect || '그 질문에는 다른 사람이 더 잘 답할 수 있어요.'}`; }
    else if (!q.who.includes(m.who)) line = `${p.name}: ${q.redirect}`;
    else { line = `${p.name}: ${q.a}`; if (!m.got.includes(q.card)) m.got.push(q.card); }
    talk.replaceChildren(el('p', {class: 'iv-q'}, '나: ' + q.q), el('p', {class: 'iv-a'}, line));
    paint();
  }
  status.textContent = mission.ivHow || '사람을 고른 뒤 질문 카드를 누르세요. 알맞은 사람에게 물어야 답 카드가 생겨요.';
  if (people[m.who]) talk.replaceChildren(el('p', {class: 'iv-a'}, `${people[m.who].name}: ${people[m.who].intro}`));
  paint();
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- R2-G12 카드 뉴스 편집기 (그림은 게임이 그린 그림 은행과 선생님 자료만 쓴다)
const BANK = '/assets/missions/r2g12/';
const CN = [
  {id: 'c1', title: '표지와 피해 정도', opts: [['ok', '붉은바다거북이 줄고 있어요. 모래가 뜨거워져 알에서 암컷이 훨씬 많이 태어나요.', 'ok'], ['hard', '붉은바다거북 개체군의 성비 불균형이 심화되고 있어요.', 'hard'], ['wrong', '붉은바다거북이 점점 늘어나고 있어요.', 'wrong']]},
  {id: 'c2', title: '원인과 예상 결과', opts: [['ok', '연소로 이산화 탄소가 늘어 기온과 모래 온도가 높아졌어요. 이대로면 번식이 어려워 멸종할 수 있어요.', 'ok'], ['nocause', '이대로면 붉은바다거북이 멸종할 수 있어요.', 'missing'], ['wrong', '이산화 탄소가 늘어 기온이 낮아졌어요.', 'wrong']]},
  {id: 'c3', title: '해결 방법', opts: [['ok', '이산화 탄소를 줄이고, 해변 쓰레기를 치우고, 알 낳는 곳을 보호해요.', 'ok'], ['hard', '온실가스 배출 저감 및 산란지 보전 정책을 추진해요.', 'hard']]},
  {id: 'c4', title: '우리가 실천할 수 있는 방법', opts: [['ok', '가까운 거리는 걷고, 안 쓰는 플러그를 뽑고, 해변 쓰레기를 주워요.', 'ok'], ['far', '오늘부터 우리 동네 자동차를 모두 없애요.', 'far']]},
];
const PICS = [['turtle', '알에서 나온 새끼 거북'], ['bike', '자전거와 버스'], ['plug', '플러그 뽑기'], ['trash', '해변 쓰레기 줍기'], ['web', '인터넷에서 찾은 사진 (누가 찍었는지 모름)']];
const SRC = [['', '출처 칸 비워 두기'], ['bank', '탐구대 그림 은행 (게임이 그린 그림)'], ['teacher', '선생님이 넣은 자료']];
const SAMPLE = {c1: {s: 'hard', img: 'web', src: ''}, c2: {s: 'nocause', img: 'turtle', src: 'bank'}, c3: {s: 'hard', img: 'trash', src: 'bank'}, c4: {s: 'far', img: 'bike', src: 'bank'}};
const FRIEND = [
  {title: '표지와 피해 정도', text: '붉은바다거북이 사라지고 있어요. 모래가 뜨거우면 암컷이 훨씬 많이 태어나요.', img: 'turtle', life: true},
  {title: '원인과 예상 결과', text: '이산화 탄소가 늘어 모래가 뜨거워졌어요. 수컷이 없으면 알을 낳기 어려워요.', img: null, life: false},
  {title: '해결 방법', text: '이산화 탄소를 줄이고, 해변을 깨끗하게 지켜요.', img: 'trash', life: false},
  {title: '우리가 할 일', text: '가까운 길은 걷고 플러그를 뽑아요.', img: 'bike', life: false},
];
const imgOk = (card) => card?.img && card.img !== 'web' && card.src;
function cnCard(el, n, title, text, card, extra, plain = false) {
  const alt = PICS.find((p) => p[0] === card?.img)?.[1] || '';
  const pic = !card?.img ? el('div', {class: 'cn-pic empty'}, '그림 없음') : imgOk(card) || plain ? el('div', {class: 'cn-pic'}, el('img', {src: BANK + card.img + '.jpg', alt})) : el('div', {class: 'cn-pic blocked'}, el('img', {src: BANK + card.img + '.jpg', alt}), el('span', {}, '출처 칸이 비어 있어 넣을 수 없어요'));
  return el('div', {class: 'cn-card'}, el('small', {class: 'cn-no'}, `${n}. ${title}`), pic, el('p', {}, text || '문장을 골라 주세요.'), el('small', {class: 'cn-src'}, '그림 출처: ' + (imgOk(card) ? SRC.find((x) => x[0] === card.src)[1] : '비어 있음')), extra || '');
}
export function cardNews({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const cards = memory.cn ??= {c1: {s: null, img: 'web', src: ''}, c2: {s: null, img: null, src: ''}, c3: {s: 'hard', img: null, src: ''}, c4: {s: null, img: null, src: ''}};
  const flags = memory.cnFlags ??= {made: false, checked: false};
  const grid = el('div', {class: 'cn-grid'}), side = el('div', {class: 'cn-side'});
  const {node, status} = panel(el, {sample: '척척이 만든 견본 카드 뉴스', edit: '카드 뉴스 편집기', check: '체크리스트 검토', friend: '달새 모둠 카드 뉴스 (예시)'}[mode], 'eco-cn', grid, side);
  const textOf = (c, sid) => c.opts.find((o) => o[0] === sid)?.[1];
  const kindOf = (c, sid) => c.opts.find((o) => o[0] === sid)?.[2];
  function checks() {
    const miss = CN.filter((c) => !cards[c.id].s || kindOf(c, cards[c.id].s) === 'missing').map((c) => c.id);
    const wrong = CN.filter((c) => kindOf(c, cards[c.id].s) === 'wrong').map((c) => c.id);
    const clear = CN.filter((c) => ['hard', 'far'].includes(kindOf(c, cards[c.id].s))).map((c) => c.id);
    const src = CN.filter((c) => !imgOk(cards[c.id])).map((c) => c.id);
    return [['빠진 내용은 없나요?', miss], ['어색하거나 잘못된 말은 없나요?', wrong], ['전달하려는 내용이 분명한가요? (쉬운 말, 할 수 있는 실천)', clear], ['그림의 출처를 밝혔나요?', src]];
  }
  function editor(c) {
    const cur = cards[c.id];
    const sel = (label, list, val, on) => { const s = el('select', {'aria-label': `${c.title} ${label}`}, list.map(([v, l]) => el('option', {value: v}, l))); s.value = val ?? ''; s.addEventListener('change', () => on(s.value)); return el('label', {class: 'm-field'}, el('span', {}, label), s); };
    const srcList = cur.img === 'web' ? [['', '출처를 알 수 없어요']] : SRC;
    return el('div', {class: 'cn-edit'},
      sel('문장', [['', '고르기'], ...c.opts.map(([v, l]) => [v, l])], cur.s, (v) => { cur.s = v || null; paint(); }),
      sel('그림', [['', '고르기'], ...PICS], cur.img, (v) => { cur.img = v || null; if (v === 'web') cur.src = ''; paint(); }),
      sel('그림 출처', srcList, cur.src, (v) => { cur.src = v; paint(); }));
  }
  let fixing = null;
  function paint() {
    if (mode === 'sample') { grid.replaceChildren(...CN.map((c, i) => cnCard(el, i + 1, c.title, textOf(c, SAMPLE[c.id].s), SAMPLE[c.id], '', true))); side.replaceChildren(); return; }
    if (mode === 'friend') {
      grid.replaceChildren(...FRIEND.map((f, i) => el('div', {class: 'cn-card'}, el('small', {class: 'cn-no'}, `${i + 1}. ${f.title}`),
        f.life ? el('div', {class: 'cn-life'}, el('span', {}, '알'), el('b', {}, '→'), el('span', {}, '새끼 거북'), el('b', {}, '→'), el('span', {}, '어른 거북'), el('b', {class: 'cut'}, '✕'), el('span', {}, '모래가 뜨거우면 암컷이 많아져요')) : '',
        f.img ? el('div', {class: 'cn-pic'}, el('img', {src: BANK + f.img + '.jpg', alt: ''})) : '', el('p', {}, f.text), el('small', {class: 'cn-src'}, f.img ? '그림 출처: 탐구대 그림 은행' : ''))));
      side.replaceChildren(); return;
    }
    grid.replaceChildren(...CN.map((c, i) => cnCard(el, i + 1, c.title, textOf(c, cards[c.id].s), cards[c.id], mode === 'edit' ? editor(c) : fixing === c.id ? editor(c) : '')));
    if (mode === 'edit') {
      const ready = CN.every((c) => cards[c.id].s && imgOk(cards[c.id]));
      side.replaceChildren(el('p', {class: 'eco-how'}, '척척이 먼저 채워 둔 칸도 있어요. 카드마다 문장과 그림을 고르고, 그림 출처를 채워야 그림이 카드에 들어가요.'));
      status.textContent = ready ? '카드 네 장을 모두 만들었어요.' : `카드 ${CN.filter((c) => cards[c.id].s && imgOk(cards[c.id])).length}/4 완성`;
      if (ready && !flags.made) { flags.made = true; onAction('made'); onReady?.(); }
      return;
    }
    const list = checks();
    side.replaceChildren(el('ul', {class: 'cn-check'}, list.map(([q, bad]) => el('li', {class: bad.length ? 'bad' : 'ok'}, el('span', {}, (bad.length ? '고칠 곳 있음: ' : '통과: ') + q), ...bad.map((id) => button(`카드 ${id.slice(1)} 고치기`, () => { fixing = id; paint(); }, 'bench-opt'))))));
    const pass = list.every(([, bad]) => !bad.length);
    status.textContent = pass ? '체크리스트를 모두 통과했어요.' : '고칠 곳을 눌러 카드를 고쳐 보세요.';
    if (pass && !flags.checked) { flags.checked = true; fixing = null; onAction('checked'); onReady?.(); paint(); }
  }
  paint();
  if (mode === 'sample') status.textContent = '척척 카드를 살펴보고 잘못된 곳을 찾아보세요.';
  if (mode === 'friend') status.textContent = '달새 모둠 카드에서 잘된 점을 찾아보세요.';
  if (mode === 'sample' || mode === 'friend' || (mode === 'edit' && flags.made) || (mode === 'check' && flags.checked)) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- R2-G13 풀무와 노 (모형: 1,500 °C 선 밖의 눈금에는 숫자를 쓰지 않음)
export function bellowsLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const d = device(el, mode === 'furnace' ? '용광로에서 철 얻기 (모형)' : '발풀무와 노 (모형)', '발풀무, 바닥 밑 관, 노와 불 온도 막대');
  const {c, status, tray, node} = d;
  const b = memory.bel ??= {tried: [], crossed: false};
  const f = memory.furn ??= {step: 0, done: false};
  const TARGET = [0.18, 0.4, 0.62, 0.9], LINE = 0.75;
  let air = 0, temp = mode === 'furnace' ? 0.15 : 0.18, alive = true, raf = 0, k = 0, blocked = false, fired = mode === 'pump' && b.crossed && [1, 2, 3].every((v) => b.tried.includes(v));
  const FS = ['숯 넣기', '철광석 넣기', '풀무로 공기를 많이 넣기', '벽과 뚜껑으로 열이 빠져나가지 않게 가두기', '녹은 철 받기'];
  function draw() {
    if (!alive) return; k++;
    const goal = mode === 'furnace' ? [0.15, 0.2, 0.25, 0.7, 0.92, 0.92][f.done ? 5 : f.step] : blocked ? 0.1 : TARGET[air];
    temp += (goal - temp) * (reduceMotion() ? 1 : 0.03);
    if (mode === 'pump' && temp > LINE && !b.crossed) { b.crossed = true; }
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#2b2320'; c.fillRect(0, 0, 720, 380); c.fillStyle = '#5a4a3c'; c.fillRect(0, 300, 720, 80);
    // 노
    c.fillStyle = '#8a5a3a'; c.beginPath(); c.moveTo(150, 300); c.lineTo(170, 170); c.quadraticCurveTo(210, 140, 250, 170); c.lineTo(270, 300); c.fill();
    const glow = Math.min(1, temp); c.fillStyle = `rgba(255,${Math.round(200 - glow * 120)},60,${0.4 + glow * 0.6})`; c.beginPath(); c.ellipse(210, 250, 34, 40, 0, 0, Math.PI * 2); c.fill();
    flame(c, 210, 176, 30 + glow * 70, {t: k});
    if (mode === 'furnace') { if (f.step >= 1) { c.fillStyle = '#222'; for (let i = 0; i < 6; i++) c.fillRect(186 + (i % 3) * 16, 272 - Math.floor(i / 3) * 12, 12, 9); } if (f.step >= 2) { c.fillStyle = '#7a5a4a'; for (let i = 0; i < 4; i++) c.fillRect(192 + (i % 2) * 18, 248 - Math.floor(i / 2) * 11, 13, 10); } if (f.step >= 4) { c.fillStyle = '#6b4a2a'; c.fillRect(160, 150, 100, 18); } if (f.done) { c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(270, 290); c.quadraticCurveTo(320, 300, 360, 296); c.lineTo(360, 304); c.quadraticCurveTo(320, 308, 270, 300); c.fill(); } }
    // 관과 공기
    c.fillStyle = '#3a302a'; c.fillRect(260, 318, 260, 14); c.fillRect(250, 290, 14, 42);
    const flow = mode === 'furnace' ? (f.step >= 3 ? 3 : 0) : blocked ? 0 : air;
    for (let i = 0; i < flow * 3; i++) { const px = 510 - ((k * (1 + flow) + i * 30) % 250); c.fillStyle = 'rgba(200,230,255,.8)'; c.beginPath(); c.arc(px, 325, 3, 0, Math.PI * 2); c.fill(); }
    // 발풀무
    const tilt = flow ? Math.sin(k / (12 - flow * 3)) * 0.18 : 0;
    c.save(); c.translate(520, 290); c.rotate(tilt); c.fillStyle = '#9a7048'; c.fillRect(-90, -8, 180, 14); c.restore(); c.fillStyle = '#6b4a2a'; c.beginPath(); c.moveTo(505, 300); c.lineTo(520, 284); c.lineTo(535, 300); c.fill();
    if (flow) { c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(520 + (tilt > 0 ? -60 : 60), 250, 12, 0, Math.PI * 2); c.fill(); c.fillStyle = '#4a6aa0'; c.fillRect(508 + (tilt > 0 ? -60 : 60), 262, 24, 22); }
    // 온도 막대
    c.fillStyle = '#39424e'; c.fillRect(640, 60, 36, 230); const hgt = 230 * Math.min(1, temp); c.fillStyle = temp > LINE ? '#ff5a3a' : '#f0a040'; c.fillRect(640, 290 - hgt, 36, hgt);
    c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(600, 290 - 230 * LINE); c.lineTo(700, 290 - 230 * LINE); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#ffffff'; c.font = FONT(13, true); c.textAlign = 'right'; c.fillText('1,500 °C', 594, 295 - 230 * LINE); c.font = FONT(12); c.fillText('철이 녹는 데 필요한 온도', 594, 278 - 230 * LINE);
    c.textAlign = 'center'; c.fillText('불 온도', 658, 310);
    c.fillStyle = '#f5e6c8'; c.font = FONT(15, true); c.textAlign = 'left';
    c.fillText(mode === 'furnace' ? (f.done ? '철광석에서 철을 얻었어요.' : `지금 할 일: ${FS[f.step]}`) : blocked ? '공기 구멍을 막았어요.' : `넣는 공기: ${['없음', '적음', '보통', '많음'][air]}`, 16, 28);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'furnace') {
      if (f.done) return;
      if (f.step === 2) tray.append(button('풀무로 공기를 조금만 넣기', () => { status.textContent = '공기가 적으면 불 온도가 1,500 °C 선에 닿지 않아요.'; }, 'bench-opt'));
      tray.append(button(FS[f.step], () => { if (f.step === 4) { if (temp < LINE) { status.textContent = '아직 온도가 1,500 °C 선에 닿지 않았어요. 잠시 기다려요.'; return; } f.done = true; status.textContent = '열을 가둔 용광로의 높은 온도로 철광석에서 철을 얻었어요.'; renderTray(); onAction('smelted'); onReady?.(); return; } f.step++; status.textContent = f.step === 3 ? '공기가 많이 들어가 불 온도가 올라가요.' : `다음: ${FS[f.step]}`; renderTray(); }, 'mission-go'));
      return;
    }
    tray.append(...[[0, '밟지 않기'], [1, '천천히 밟기 (공기 적음)'], [2, '보통 빠르기로 밟기 (공기 보통)'], [3, '빠르게 밟기 (공기 많음)']].map(([v, n]) => { const x = button(n, () => { air = v; blocked = false; if (v && !b.tried.includes(v)) b.tried.push(v); status.textContent = v ? `공기를 ${['', '적게', '보통으로', '많이'][v]} 넣었어요. 불 온도 막대를 보세요.` : '공기를 넣지 않아요.'; renderTray(); }, 'bench-opt'); x.setAttribute('aria-pressed', String(!blocked && air === v)); return x; }),
      button('공기 구멍을 막기', () => { blocked = true; status.textContent = '공기가 들어가지 않으니 불 온도가 내려가요. 불을 세게 하려면 공기를 막는 것이 아니라 더 넣어야 해요.'; renderTray(); }, 'bench-opt'));
  }
  const timer = setInterval(() => {
    if (mode !== 'pump' || fired) return;
    if (b.crossed && [1, 2, 3].every((v) => b.tried.includes(v))) { fired = true; status.textContent = '공기를 많이 넣을 때만 불 온도가 1,500 °C 선을 넘었어요.'; onAction('pumped'); onReady?.(); }
  }, 300);
  renderTray();
  status.textContent = mode === 'furnace' ? (f.done ? '이미 철을 얻었어요.' : '용광로에 재료를 넣고 불 온도를 높여요.') : fired ? '이미 해 봤어요.' : '밟는 빠르기를 바꿔 넣는 공기의 양을 바꿔 보세요. 세 가지를 모두 해 봐요.';
  if (fired || (mode === 'furnace' && f.done)) later(onReady);
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); clearInterval(timer); }};
}
