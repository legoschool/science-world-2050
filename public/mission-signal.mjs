// 발광 다이오드 신호기 모형 (깜빡이 신호탑, 과학 64~67쪽).
// 나무 막대 위에 전도성 테이프 두 줄, 동전 전지, 집게, 발광 다이오드를 놓는다.
// 집게 손잡이가 짧은 다리 쪽 테이프에 닿아야 전기가 흐르는 길이 이어지고,
// 동전 전지의 + 면이 긴 다리 쪽 테이프에 닿아 있어야 불이 켜진다. 밝기는 켜짐과 꺼짐만 나타낸다.
export const PATTERNS = [
  {id: 'S', label: '짧게 한 번'},
  {id: 'SS', label: '짧게 두 번'},
  {id: 'L', label: '길게 한 번'},
  {id: 'SL', label: '짧게 한 번, 길게 한 번'},
];
export const patternLabel = (p) => PATTERNS.find((x) => x.id === p)?.label || [...p].map((c) => (c === 'S' ? '짧게' : '길게')).join(', ');
export function blips(el, p) {
  return el('span', {class: 'blips', 'aria-label': patternLabel(p)}, [...p].map((c) => el('span', {class: 'blip ' + (c === 'S' ? 'short' : 'long')})));
}

const W = 720, H = 300, SHORT_MAX = 450;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function signalDevice({el, button, mode, owner = '', onAction, onReady, onPattern}) {
  const canvas = el('canvas', {class: 'signal-canvas', width: W, height: H, tabindex: 0,
    'aria-label': mode === 'receive' ? '신항이의 신호기. 불빛이 켜졌다 꺼지는 모양을 살펴보세요.' : '발광 다이오드 신호기. 누르고 있거나 스페이스 키를 누르면 집게 손잡이가 테이프에 닿습니다.'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device'}, owner ? el('div', {class: 'signal-owner'}, owner) : null, canvas, tray, status);
  const c = canvas.getContext('2d');
  const s = {tape: false, led: false, battery: null, clip: false, pressed: false, playOn: false, playing: false, flipped: false, seenOn: false, seenOff: false, ready: false, done: false, tries: 0};
  if (mode !== 'build') Object.assign(s, {tape: true, led: true, battery: mode === 'fix' ? 'up' : 'down', clip: true});
  let alive = true, raf = 0, downAt = 0, seq = [], endTimer = 0, timers = [];
  const built = () => s.tape && s.led && s.battery && s.clip;
  const lit = () => (mode === 'receive' ? s.playOn : built() && s.pressed && s.battery === 'down');
  const later = (fn, ms) => { const t = setTimeout(() => { if (alive) fn(); }, ms); timers.push(t); return t; };
  const wait = (ms) => new Promise((r) => later(r, ms));
  const say = (text) => { status.textContent = text; };

  function press(v) {
    if (mode === 'receive' || !built() || s.pressed === v) return;
    s.pressed = v;
    const now = performance.now();
    if (v) { downAt = now; clearTimeout(endTimer); if (lit()) s.seenOn = true; }
    else if (s.seenOn) s.seenOff = true;
    if (mode === 'observe' && s.seenOn && s.seenOff && !s.ready) { s.ready = true; say('켜질 때와 꺼질 때를 모두 봤어요. 이제 아래에서 골라 보세요.'); onReady?.(); }
    if (mode === 'build' && v && !s.done) {
      s.tries++;
      if (lit()) { s.done = true; say(s.flipped ? '동전 전지를 뒤집었더니 불이 켜졌어요.' : '불이 켜졌어요. 손잡이를 떼면 어떻게 되는지도 보세요.'); onAction?.(s.flipped ? 'lit-after-flip' : 'lit'); }
      else { say('손잡이를 눌렀는데 불이 켜지지 않아요. 동전 전지의 어느 면이 긴 다리 쪽 테이프에 닿아 있는지 살펴보세요.'); renderTray(); }
    }
    if (mode === 'fix' && v) say(lit() ? '불이 켜졌어요. 동전 전지 면을 바꾸니 달라졌지요?' : '손잡이가 테이프에 닿았는데도 불이 켜지지 않아요.');
    if (mode === 'send' && !v) {
      seq.push(now - downAt < SHORT_MAX ? 'S' : 'L');
      if (seq.length > 4) seq = seq.slice(-4);
      say('보내는 중: ' + seq.map((x) => (x === 'S' ? '짧게' : '길게')).join(', '));
      endTimer = later(() => { const p = seq.join(''); seq = []; say('보낸 신호: ' + patternLabel(p)); onPattern?.(p); }, 1300);
    }
  }
  async function play(p) {
    if (s.playing) return;
    s.playing = true; say('신항이가 신호를 보내는 중…');
    await wait(600);
    for (const ch of p) { if (!alive) return; s.playOn = true; await wait(ch === 'S' ? 260 : 900); s.playOn = false; await wait(420); }
    s.playing = false; say('신호가 끝났어요. 다시 보려면 "다시 보기"를 눌러 주세요.');
  }
  function hold(label) {
    const b = button(label, () => {}, 'signal-hold');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); press(true); });
    for (const k of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(k, () => press(false));
    b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(true); } });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(false); } });
    return b;
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'build') {
      const steps = [['tape', '전도성 테이프 붙이기'], ['led', '발광 다이오드 올리기'], ['battery', '동전 전지 올리기'], ['clip', '집게로 고정하기']];
      const next = steps.find(([k]) => !s[k]);
      tray.append(el('ol', {class: 'signal-steps'}, steps.map(([k, label]) => el('li', {class: s[k] ? 'done' : next?.[0] === k ? 'now' : ''}, label))));
      if (!next) {
        tray.append(hold('손잡이 누르기'));
        if (s.tries && !s.done) tray.append(button('집게를 풀고 동전 전지 뒤집기', () => { s.battery = s.battery === 'down' ? 'up' : 'down'; s.flipped = true; s.pressed = false; say('동전 전지를 뒤집어 다시 올리고 집게로 고정했어요. 손잡이를 다시 눌러 보세요.'); renderTray(); }, 'secondary'));
        return;
      }
      if (next[0] === 'tape') tray.append(button('나무 막대에 전도성 테이프 두 줄 붙이기', () => { s.tape = true; say('긴 다리 쪽과 짧은 다리 쪽에 테이프를 한 줄씩 붙였어요.'); renderTray(); }));
      if (next[0] === 'led') tray.append(button('발광 다이오드 올리기 (긴 다리는 왼쪽 테이프)', () => { s.led = true; say('긴 다리는 왼쪽 테이프, 짧은 다리는 오른쪽 테이프에 닿게 올렸어요.'); renderTray(); }));
      if (next[0] === 'battery') tray.append(button('+ 면이 아래로 가게 올리기', () => { s.battery = 'down'; say('+ 면이 긴 다리 쪽 테이프에 닿게 올렸어요.'); renderTray(); }), button('+ 면이 위로 가게 올리기', () => { s.battery = 'up'; say('+ 면이 위를 보게 올렸어요.'); renderTray(); }));
      if (next[0] === 'clip') tray.append(button('집게로 동전 전지 고정하기', () => { s.clip = true; say('이제 손잡이를 눌러 불이 켜지는지 확인해 보세요. 스페이스 키로도 누를 수 있어요.'); renderTray(); }));
      return;
    }
    if (mode === 'fix') { tray.append(hold('손잡이 누르기'), button('동전 전지 뒤집어 보기', () => { s.battery = s.battery === 'down' ? 'up' : 'down'; s.flipped = true; say('동전 전지를 뒤집었어요. 손잡이를 다시 눌러 보세요.'); }, 'secondary')); return; }
    if (mode === 'receive') { tray.append(button('다시 보기', () => node.replay?.(), 'secondary')); return; }
    tray.append(hold(mode === 'send' ? '손잡이로 신호 보내기' : '손잡이 누르기'));
  }
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); canvas.focus({preventScroll: true}); canvas.setPointerCapture?.(e.pointerId); press(true); });
  for (const k of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(k, () => press(false));
  canvas.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(true); } });
  canvas.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(false); } });

  // ---------------------------------------------------------------- 그리기
  function rr(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function tape(x, w) {
    const g = c.createLinearGradient(0, 192, 0, 202); g.addColorStop(0, '#f1f4f8'); g.addColorStop(0.5, '#b9c1cc'); g.addColorStop(1, '#8e97a3');
    c.fillStyle = g; c.fillRect(x, 193, w, 8);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x, 193, w, 2);
  }
  function drawBattery(face) {
    const cx = 190;
    c.fillStyle = '#6f7885'; c.beginPath(); c.ellipse(cx, 190, 44, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9aa3ae'; c.fillRect(cx - 44, 178, 88, 12);
    const g = c.createLinearGradient(cx - 44, 0, cx + 44, 0); g.addColorStop(0, '#dfe4ea'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#b7bec8');
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, 178, 44, 9, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#7d8793'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#39424e'; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (face === 'up') { c.font = 'bold 13px "Malgun Gothic",sans-serif'; c.fillText('+ 3V', cx - 4, 178); }
    else { c.strokeStyle = '#9aa3ae'; c.beginPath(); c.ellipse(cx, 178, 26, 5, 0, 0, Math.PI * 2); c.stroke(); c.font = 'bold 14px "Malgun Gothic",sans-serif'; c.fillText('−', cx, 177); }
    c.font = '12px "Malgun Gothic",sans-serif'; c.fillStyle = face === 'up' ? '#ffb4a8' : '#bfe7c4';
    c.fillText(face === 'up' ? '위쪽: + 면' : '아래쪽: + 면', cx, 158);
  }
  function drawLed(on) {
    c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = '#c9ced6';
    c.beginPath(); c.moveTo(357, 152); c.lineTo(357, 174); c.lineTo(318, 196); c.stroke();
    c.beginPath(); c.moveTo(373, 152); c.lineTo(373, 182); c.lineTo(396, 196); c.stroke();
    c.fillStyle = on ? '#ff5b5b' : '#9e2c34';
    c.beginPath(); c.moveTo(347, 150); c.lineTo(347, 104); c.arc(365, 104, 18, Math.PI, 0); c.lineTo(383, 150); c.closePath(); c.fill();
    c.fillStyle = on ? '#ff8a8a' : '#b8414a'; c.fillRect(343, 146, 44, 8);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(357, 100, 4, 12, -0.2, 0, Math.PI * 2); c.fill();
    c.font = '12px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#d8dde6';
    c.fillText('긴 다리', 300, 176); c.fillText('짧은 다리', 430, 176);
  }
  function drawClip(down) {
    c.fillStyle = '#1d2126'; rr(226, 164, 20, 76, 4); c.fill();
    c.fillRect(204, 164, 42, 9); c.fillRect(204, 231, 42, 9);
    const ex = 580, ey = down ? 190 : 126;
    c.lineCap = 'round'; c.lineWidth = 5; c.strokeStyle = '#dfe4ea';
    c.beginPath(); c.moveTo(240, 166); c.lineTo(268, 146); c.lineTo(ex, ey); c.stroke();
    c.fillStyle = '#eef2f6'; c.beginPath(); c.arc(ex, ey, 7, 0, Math.PI * 2); c.fill();
    if (mode !== 'receive') { c.font = '12px "Malgun Gothic",sans-serif'; c.fillStyle = '#d8dde6'; c.textAlign = 'center'; c.fillText(down ? '손잡이가 테이프에 닿음' : '집게 손잡이', ex - 10, down ? 174 : 110); }
  }
  function draw(now) {
    if (!alive) return;
    const on = lit();
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1f2633'); g.addColorStop(1, '#10141c');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#4c3727'; c.fillRect(0, 246, W, 54); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, 246, W, 3);
    if (on) { const r = c.createRadialGradient(365, 110, 6, 365, 110, reduceMotion() ? 200 : 180 + Math.sin(now / 120) * 8); r.addColorStop(0, 'rgba(255,110,100,.75)'); r.addColorStop(0.4, 'rgba(255,70,70,.22)'); r.addColorStop(1, 'rgba(255,60,60,0)'); c.fillStyle = r; c.fillRect(0, 0, W, H); }
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(360, 244, 300, 8, 0, 0, Math.PI * 2); c.fill();
    const wood = c.createLinearGradient(0, 200, 0, 232); wood.addColorStop(0, '#d9ab70'); wood.addColorStop(1, '#a8773f');
    c.fillStyle = wood; rr(80, 200, 560, 32, 6); c.fill();
    c.strokeStyle = 'rgba(110,70,30,.35)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(90, 208 + i * 6); c.bezierCurveTo(250, 204 + i * 7, 420, 214 + i * 5, 630, 207 + i * 6); c.stroke(); }
    if (s.tape) { tape(100, 240); tape(390, 230); }
    else { c.setLineDash([6, 5]); c.strokeStyle = '#e6c56f'; c.lineWidth = 2; c.strokeRect(100, 192, 240, 9); c.strokeRect(390, 192, 230, 9); c.setLineDash([]); }
    c.font = '13px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e8ecf2';
    c.fillText('긴 다리 쪽 테이프', 220, 266); c.fillText('짧은 다리 쪽 테이프', 505, 266);
    if (s.battery) drawBattery(s.battery);
    if (s.clip) drawClip(mode === 'receive' ? s.playOn : s.pressed);
    if (s.led) drawLed(on);
    if (on && !reduceMotion()) { c.strokeStyle = 'rgba(255,170,160,.55)'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = -Math.PI + (i / 7) * Math.PI; c.beginPath(); c.moveTo(365 + Math.cos(a) * 30, 104 + Math.sin(a) * 30); c.lineTo(365 + Math.cos(a) * 52, 104 + Math.sin(a) * 52); c.stroke(); } }
    raf = requestAnimationFrame(draw);
  }
  renderTray();
  say(mode === 'build' ? '아래 순서대로 부품을 올려 신호기를 만들어 보세요.' : mode === 'observe' ? '손잡이를 눌렀다 떼면서 불빛을 살펴보세요.' : mode === 'fix' ? '신항이의 신호기예요. 손잡이를 눌러 보세요.' : mode === 'send' ? '짧게 누르면 짧은 깜빡임, 길게 누르면 긴 깜빡임이에요.' : '');
  raf = requestAnimationFrame(draw);
  node.play = play;
  node.isLit = lit;
  return {node, play, stop: () => { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); }};
}
