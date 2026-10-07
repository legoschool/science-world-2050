// 고철 부두 크레인 (R3-G07, 6학년 전기의 이용 7차시 [6과15-03])
// 작은 실험대에서 전자석의 세 성질(켜고 끄기, 전지 수와 세기, 전지 방향과 극)을 확인하고
// 막대자석과 비교한 뒤, 확인한 규칙만 크레인 운반에 적용한다. 운반 개수는 점수가 아니다.
// 빵 끈 개수는 한 실행 안에서 비교하는 모형의 관찰 예이며 법칙으로 외우게 하지 않는다.
const IMG = {};
const img = (n) => { if (!IMG[n]) { const i = new Image(); i.src = `/assets/crane/${n}.png`; IMG[n] = i; } return IMG[n]; };
const dock = new Image(); dock.src = '/assets/crane/dock.jpg';
const PORTRAIT = (k) => `/assets/portraits/${k}.png`;
const NAMES = {comji: '컴지', dalsae: '달새', elm: '엘엠'};

const STEPS = ['자석 기억 떠올리기', '화물을 놓지 못하는 크레인', '스위치를 닫을 때와 열 때', '전지 수와 전자석의 세기', '나침반으로 극 읽기', '전지 방향과 전자석의 극', '막대자석과 전자석 비교', '크레인으로 고철 옮기기', '증거로 설명하기', '크레인에 전자석을 쓰는 까닭'];
const HELPER = ['comji', 'dalsae', 'comji', 'comji', 'dalsae', 'dalsae', 'comji', 'elm', 'dalsae', 'dalsae'];
const HINTS = [
  ['전자석이 철을 끌어당기려면 무엇이 흘러야 할까요?', '공방에서 스위치를 닫았을 때와 열었을 때를 떠올려 보세요.', '전류가 흐를 때 자석의 성질이 생겨요. 에나멜선은 양 끝 피복만 벗겨 연결해요.'],
  ['크레인이 철을 붙이는 때와 놓는 때를 나눠 생각해 보세요.', '자석을 늘 켜 두면 화물을 놓을 수 있을까요?', '"붙일 때와 놓을 때 스위치를 어떻게 해야 할까요?"처럼 두 때를 나눈 질문을 만들어 보세요.'],
  ['같은 전자석에서 스위치만 바꿔 두 상태를 보세요.', '닫았을 때와 열었을 때 빵 끈이 어디에 있는지 비교해요.', '스위치를 닫아 전류가 흐르면 붙고, 열어 전류를 끊으면 붙는 정도가 크게 줄어요.'],
  ['바꾸는 조건은 전지 수 하나예요. 볼트, 감긴 선, 빵 끈은 그대로 둬요.', '전지 한 개일 때와 두 개 직렬일 때 붙은 개수를 각각 세어 보세요.', '전지 두 개를 직렬로 연결하니 더 많이 붙었어요. 전자석의 세기가 세진 거예요.'],
  ['나침반 바늘의 빨간 쪽에 N, 파란 쪽에 S가 적혀 있어요.', '같은 극끼리는 밀어내고, 다른 극끼리는 끌어당겨요.', '막대자석의 N극에는 바늘의 S극(파란 쪽)이 끌려와요.'],
  ['바꾸는 조건은 전지 방향 하나예요.', '바늘의 N극(빨간 쪽)이 끌려가는 전자석 끝은 무슨 극일까요?', '다른 극끼리 끌어당기니 바늘의 N극이 가리키는 끝은 S극이에요. 전지 방향을 바꾸면 극도 바뀌어요.'],
  ['막대자석은 전기가 없어도 자석일까요?', '막대자석을 돌리면 방향이 바뀌는 것일 뿐, 끝의 극 자체가 바뀌지는 않아요.', '전자석은 전원이 필요하지만 세기와 극을 바꿀 수 있어요. 철을 끌어당기는 것은 둘 다 같아요.'],
  ['헤드를 화물 바로 위로 옮기고 내린 다음 스위치를 닫아 보세요.', '무거운 철 기둥은 전자석이 더 세야 들 수 있어요. 어떻게 하면 세질까요?', '구리와 알루미늄은 자석에 붙지 않아요. 화물통 위에서 스위치를 열면 내려놓을 수 있어요.'],
  ['세기가 달라진 것은 무엇을 보고 알았지요?', '극이 바뀐 것은 무엇을 보고 알았지요?', '세기는 붙은 개수, 극은 나침반 바늘 방향이 증거예요. 바늘 방향만으로는 세기를 비교할 수 없어요.'],
  ['크레인은 화물을 붙였다가 원하는 곳에서 놓아야 해요.', '막대자석으로 크레인을 만들면 화물을 놓을 수 있을까요?', '전자석은 필요할 때만 붙였다 놓을 수 있고 세기도 조절할 수 있어서 크레인에 알맞아요.'],
];
const MODEL_COUNT = {1: 6, 2: 13};
const TABLE_ROWS = [['power', '전원이 있어야 자석이 된다'], ['strength', '세기를 조절할 수 있다'], ['pole', '극을 바꿀 수 있다'], ['iron', '철을 끌어당긴다']];
const TABLE_TRUTH = {'power-bar': 'x', 'power-em': 'o', 'strength-bar': 'x', 'strength-em': 'o', 'pole-bar': 'x', 'pole-em': 'o', 'iron-bar': 'o', 'iron-em': 'o'};
const CARGO = [
  {id: 'gear', name: '철 톱니', metal: 'iron', x: 250, w: 58},
  {id: 'can', name: '알루미늄 캔', metal: 'aluminum', x: 340, w: 34},
  {id: 'beam', name: '무거운 철 기둥', metal: 'iron', heavy: true, x: 450, w: 96},
  {id: 'copper', name: '구리관', metal: 'copper', x: 560, w: 80},
  {id: 'bolt', name: '철 볼트', metal: 'iron', x: 640, w: 50},
];
const BIN = [720, 915];
const METAL = {iron: '철', copper: '구리', aluminum: '알루미늄'};
// 받침에 맞는 조사: j('톱니', '이', '가') → '톱니가'
const j = (w, withB, noB) => { const code = w.charCodeAt(w.length - 1) - 0xac00; return w + (code >= 0 && code < 11172 && code % 28 ? withB : noB); };

export function craneWorkshop(host, {el, button, state, record, save, back}) {
  const q = state.crane ??= {released: false, question: '', asked: false, closed: false, opened: false, answer: '', hint: 0};
  if (typeof q.step !== 'number') q.step = q.answer === 'decrease' ? 3 : q.asked ? 2 : q.released ? 1 : 0;
  q.recall ??= {}; q.counts ??= {}; q.poles ??= {}; q.table ??= {}; q.evidence ??= {}; q.picks ??= []; q.cargo ??= [];
  let on = false, battery = q.step === 7 && !q.delivered ? 1 : q.battery || 1, reversed = false, near = false, alive = true, raf, feedback = '', lift = 0;
  let craneX = 250, head = 0, headTarget = 0, holding = null, pendingAttach = false, keys = new Set(), last = performance.now();
  const items = CARGO.map((c) => ({...c, delivered: q.cargo.includes(c.id)}));
  const emit = (kind, p = {}) => record('crane.' + kind, 'crane', {...p, hint: q.hint});
  const root = el('section', {class: 'rpg-lab crane-lab'});
  const title = el('div', {class: 'crane-title'});
  const canvas = el('canvas', {class: 'crane-canvas', width: 960, height: 540, tabindex: 0});
  const panel = el('section', {class: 'card dialogue crane-panel'});
  root.append(title, canvas, panel);
  host.replaceChildren(root);

  function go(step) { q.step = step; q.hint = 0; feedback = ''; on = false; near = false; if (step === 7) { battery = 1; q.battery = 1; } save(); render(); window.scrollTo({top: 0, behavior: 'smooth'}); }
  function setOn(v) {
    if (on === v) return;
    on = v;
    if (q.step === 2) { if (on) q.closed = true; else if (q.closed) q.opened = true; emit('switched', {answer: on ? 'on' : 'off'}); save(); }
    if (q.step === 3 && on && !q.counts[battery]) { q.counts[battery] = true; emit('counted', {answer: String(battery)}); save(); }
    if (q.step === 7) { if (on && head < 0.95 && headTarget === 1) pendingAttach = true; else craneSwitch(); }
    render();
  }
  const choose = (list, pick) => el('div', {class: 'choices'}, list.map(([label, fn, pressed]) => { const b = button(label, fn); if (pressed) b.setAttribute('aria-pressed', 'true'); return b; }));
  const say = (who, text) => el('p', {class: 'crane-say'}, el('strong', {}, who + ': '), text);

  // ---------------------------------------------------------------- 크레인 조종 (T08)
  // 헤드 아래 화물이 여럿이면 지금 세기로 들 수 있는 철 화물, 무거운 철 화물, 나머지 차례로 고르고 같으면 가까운 것을 고른다.
  // 실제 전자석처럼 구리나 알루미늄 옆에 떨어진 철도 다시 들 수 있다.
  const pull = (c) => (c.metal !== 'iron' ? 0 : c.heavy && battery === 1 ? 1 : 2);
  function cargoUnder() { return items.filter((c) => !c.delivered && c !== holding && Math.abs(c.x - craneX) < 42).sort((a, b) => pull(b) - pull(a) || Math.abs(a.x - craneX) - Math.abs(b.x - craneX))[0]; }
  function craneSwitch() {
    if (on) {
      if (holding || head < 0.95) return;
      const c = cargoUnder();
      if (!c) { feedback = '헤드 아래에 화물이 없어요. 화물 바로 위로 옮겨 보세요.'; return; }
      if (c.metal !== 'iron') { feedback = `${j(c.name, '은', '는')} ${j(METAL[c.metal], '이라서', '라서')} 전자석에 붙지 않아요. 철로 된 화물만 붙어요.`; emit('moved', {answer: 'reject', card: c.id}); return; }
      if (c.heavy && battery === 1) { feedback = '철 기둥이 들렸다가 도로 떨어졌어요. 전자석을 더 세게 하려면 어떻게 해야 할까요?'; emit('moved', {answer: 'heavy', card: c.id}); return; }
      holding = c; feedback = `${j(c.name, '이', '가')} 붙었어요. 들어 올려서 화물통 위로 옮겨 보세요.`; emit('moved', {answer: 'attach', card: c.id});
    } else if (holding) {
      const c = holding; holding = null;
      if (craneX >= BIN[0] && craneX <= BIN[1]) {
        c.delivered = true; q.cargo = [...new Set([...q.cargo, c.id])]; emit('moved', {answer: 'release', card: c.id});
        feedback = `${j(c.name, '을', '를')} 화물통에 내려놓았어요. 스위치를 열어 전류를 끊으니 놓을 수 있었지요.`;
        if (items.filter((i) => i.metal === 'iron').every((i) => i.delivered)) { q.delivered = 3; emit('delivered', {answer: 'done'}); feedback = '철 화물 세 개를 모두 옮겼어요. 구리와 알루미늄은 부두에 남아 있지요.'; }
        save();
      } else { c.x = craneX; feedback = '화물통이 아닌 곳에서 스위치를 열어서 화물이 떨어졌어요. 오른쪽 화물통 위에서 열어 보세요.'; }
    }
  }
  // 전자석을 켠 채 헤드를 내리면 헤드가 화물에 닿을 때 붙인다.
  function setHead(t) { headTarget = t; if (t === 1 && q.step === 7 && on && !holding) pendingAttach = true; setTimeout(render, 500); }
  function setBattery(n) {
    if (battery === n) return; battery = n; q.battery = n;
    if (q.step === 7) {
      emit('moved', {answer: 'battery', card: n === 2 ? 'two' : 'one'});
      // 약해진 전자석은 무거운 철 기둥을 붙들지 못하고, 세진 전자석은 켜진 채로 아래에 있는 화물을 다시 붙인다.
      if (n === 1 && holding?.heavy) { holding.x = craneX; holding = null; feedback = '전지를 한 개로 줄이니 전자석이 약해져 철 기둥이 떨어졌어요.'; }
      else if (on && !holding && head > 0.95) craneSwitch();
    }
    save(); render();
  }

  // ---------------------------------------------------------------- 그리기
  const ties = Array.from({length: 16}, (_, i) => ({x: 395 + (i % 8) * 22 + (i > 7 ? 11 : 0), y: 470 + (i > 7 ? 14 : 0)}));
  function drawDock(c) { if (dock.complete && dock.naturalWidth) c.drawImage(dock, 0, 0, 960, 540); else { c.fillStyle = '#2a3f52'; c.fillRect(0, 0, 960, 540); } }
  function drawImg(c, name, x, y, w, flip = false) {
    const i = img(name); if (!i.complete || !i.naturalWidth) return;
    const h = w * i.naturalHeight / i.naturalWidth;
    c.save(); if (flip) { c.translate(x + w / 2, 0); c.scale(-1, 1); c.translate(-(x + w / 2), 0); }
    c.drawImage(i, x - w / 2, y - h / 2, w, h); c.restore();
  }
  function drawCrane(c, x, h, glow) {
    c.fillStyle = '#b8862f'; c.fillRect(96, 70, 26, 400); c.fillStyle = '#8a6322'; c.fillRect(118, 70, 6, 400);
    c.fillStyle = '#c99a3c'; c.fillRect(90, 58, 830, 22); c.fillStyle = '#8a6322'; for (let i = 100; i < 910; i += 40) c.fillRect(i, 62, 3, 14);
    c.fillStyle = '#4d5a66'; c.fillRect(x - 26, 76, 52, 18);
    const hy = 120 + h * 300;
    c.strokeStyle = '#2b2b30'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 8, 94); c.lineTo(x - 8, hy - 16); c.moveTo(x + 8, 94); c.lineTo(x + 8, hy - 16); c.stroke();
    if (glow) { const g = c.createRadialGradient(x, hy, 5, x, hy, 70); g.addColorStop(0, 'rgba(120,200,255,.55)'); g.addColorStop(1, 'rgba(120,200,255,0)'); c.fillStyle = g; c.fillRect(x - 70, hy - 70, 140, 140); }
    c.fillStyle = '#3a3f47'; c.beginPath(); c.ellipse(x, hy, 44, 14, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5b636e'; c.fillRect(x - 44, hy - 16, 88, 16); c.strokeStyle = '#c9772b'; c.lineWidth = 2; for (let i = -36; i <= 36; i += 8) { c.beginPath(); c.moveTo(x + i, hy - 15); c.lineTo(x + i, hy - 2); c.stroke(); }
    return hy;
  }
  function bench(c) { c.fillStyle = 'rgba(64,42,24,.88)'; c.fillRect(60, 300, 840, 230); c.fillStyle = 'rgba(140,98,56,.95)'; c.fillRect(60, 300, 840, 12); c.strokeStyle = '#2a1a0e'; c.lineWidth = 3; c.strokeRect(60, 300, 840, 230); }
  function magnetBar(c, x, y, len = 220, rev = false, showPole = false) {
    c.fillStyle = '#8f96a0'; c.fillRect(x - len / 2, y - 12, len, 24); c.fillStyle = '#b8bec7'; c.fillRect(x - len / 2, y - 12, len, 6);
    c.strokeStyle = '#c9772b'; c.lineWidth = 3; for (let i = x - len / 2 + 30; i < x + len / 2 - 30; i += 9) { c.beginPath(); c.moveTo(i, y - 16); c.lineTo(i + 4, y + 16); c.stroke(); }
    if (showPole) { c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillStyle = rev ? '#2e6bd0' : '#d8343a'; c.fillText(rev ? 'S' : 'N', x - len / 2 - 18, y + 7); c.fillStyle = rev ? '#d8343a' : '#2e6bd0'; c.fillText(rev ? 'N' : 'S', x + len / 2 + 18, y + 7); }
  }
  function sw(c, x, y, closed) {
    c.fillStyle = '#6b4a2b'; c.fillRect(x - 40, y - 8, 80, 20); c.fillStyle = '#c0c4cc'; c.fillRect(x - 30, y - 12, 10, 10); c.fillRect(x + 20, y - 12, 10, 10);
    c.strokeStyle = '#e8e8e8'; c.lineWidth = 6; c.beginPath(); c.moveTo(x - 25, y - 8); c.lineTo(closed ? x + 25 : x + 18, closed ? y - 8 : y - 38); c.stroke();
    c.fillStyle = '#fff3c8'; c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText(closed ? '스위치 닫힘' : '스위치 열림', x, y + 30);
  }
  function batteries(c, x, y, n, rev) { for (let i = 0; i < n; i++) drawImg(c, 'battery', x + (i - (n - 1) / 2) * 92, y, 88, rev); c.fillStyle = '#fff3c8'; c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText(n === 2 ? '전지 두 개 직렬' : '전지 한 개', x, y + 34); }
  function wires(c, pts) { c.strokeStyle = '#d8483a'; c.lineWidth = 3; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke(); }
  function needleDraw(c, x, y, angle, r = 34) {
    drawImg(c, 'compass', x, y - 6, 96);
    c.save(); c.translate(x, y); c.rotate(angle);
    c.fillStyle = '#d8343a'; c.beginPath(); c.moveTo(r, 0); c.lineTo(0, -6); c.lineTo(0, 6); c.closePath(); c.fill();
    c.fillStyle = '#2e6bd0'; c.beginPath(); c.moveTo(-r, 0); c.lineTo(0, -6); c.lineTo(0, 6); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillText('N', r - 11, 4); c.fillText('S', -r + 11, 4);
    c.fillStyle = '#333'; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill(); c.restore();
  }
  let needleA = [-Math.PI / 2, -Math.PI / 2];
  const turn = (i, target, dt) => { let d = target - needleA[i]; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; needleA[i] += d * Math.min(1, dt * 6); };
  function label(c, text, x, y) { c.font = 'bold 18px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(20,24,32,.85)'; c.strokeText(text, x, y); c.fillStyle = '#fff3c8'; c.fillText(text, x, y); }

  function frame(now) {
    if (!alive) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const c = canvas.getContext('2d'), s = q.step;
    c.imageSmoothingEnabled = true;
    drawDock(c);
    if (s <= 1 || s >= 7) {
      if (s === 7) {
        if (keys.has('ArrowLeft')) craneX = Math.max(150, craneX - 240 * dt);
        if (keys.has('ArrowRight')) craneX = Math.min(900, craneX + 240 * dt);
      }
      head += (headTarget - head) * Math.min(1, dt * 4);
      if (s === 7 && pendingAttach && head > 0.95) { pendingAttach = false; if (on) { craneSwitch(); render(); } }
      const x = s === 7 ? craneX : 480, h = s === 7 ? head : (s === 1 && q.released) || s > 7 ? 0.95 : 0.35;
      const hy = drawCrane(c, x, h, s === 7 ? on : s === 0 || (s === 1 && !q.released));
      // 부두 위 화물과 화물통 속 화물
      if (s >= 7) {
        let stack = 0;
        for (const it of items) {
          const w = it.w * 1.2;
          if (it === holding) drawImg(c, it.id, craneX, hy + 20, w);
          else if (it.delivered) { drawImg(c, it.id, 800 + (stack % 2) * 60, 470 - Math.floor(stack / 2) * 24, w * 0.8); stack++; }
          else if (s === 7) drawImg(c, it.id, it.x, 470, w);
          else drawImg(c, it.id, it.x, 470, w);
        }
        if (s === 7) { c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,230,120,.7)'; c.lineWidth = 2; c.strokeRect(BIN[0], 360, BIN[1] - BIN[0], 150); c.setLineDash([]); label(c, '화물통', (BIN[0] + BIN[1]) / 2, 352); }
      } else {
        const gearY = (s === 1 && q.released) ? 470 : hy + 22;
        drawImg(c, 'gear', (s === 1 && q.released) ? 800 : 480, gearY, 70);
        label(c, s === 1 && q.released ? '철 화물이 화물통으로 내려왔다' : '옛 규칙: 자석을 늘 켜 둔다', 480, 40);
      }
      if (s > 7) label(c, '부두 화물 이송이 다시 시작되었다', 480, 40);
    } else {
      bench(c);
      if (s === 2 || s === 3) {
        const n = s === 3 ? battery : 1, count = on ? (s === 3 ? MODEL_COUNT[battery] : 8) : 0;
        magnetBar(c, 480, 360);
        wires(c, [[370, 360], [300, 360], [300, 430], [230, 430]]); wires(c, [[590, 360], [680, 360], [680, 430], [720, 430]]);
        batteries(c, 180, 430, n, false); sw(c, 760, 440, on);
        lift += ((on ? 1 : 0) - lift) * Math.min(1, dt * 8);
        ties.forEach((t, i) => { const up = i < count; const ty = up ? t.y - (t.y - 378) * lift : t.y; const tx = up ? 390 + (i % 8) * 24 : t.x; c.fillStyle = '#d7dde4'; c.fillRect(tx, ty, 14, 4); c.fillStyle = '#8f96a0'; c.fillRect(tx, ty + 3, 14, 1); });
        label(c, on ? `스위치 닫힘, 붙은 빵 끈 ${count}개(모형의 관찰 예)` : '스위치 열림, 전류가 흐르지 않음', 480, 40);
        if (s === 3) label(c, '같은 볼트, 같은 감긴 선, 같은 빵 끈에서 전지 수만 바꿔요', 480, 280);
      }
      if (s === 4) {
        const target = near ? 0 : -Math.PI / 2; turn(0, target, dt);
        needleDraw(c, 560, 410, needleA[0], 36);
        const mx = near ? 400 : 250; drawImg(c, 'magnet', mx, 410, 150, true);
        c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('S', mx - 36, 416); c.fillText('N', mx + 36, 416);
        label(c, near ? '막대자석의 N극을 나침반 가까이 가져갔다' : '빨간 쪽 N, 파란 쪽 S가 적힌 나침반 바늘', 480, 40);
      }
      if (s === 5) {
        const pointing = on ? (reversed ? 0 : Math.PI) : -Math.PI / 2; turn(0, pointing, dt); turn(1, pointing, dt);
        magnetBar(c, 480, 380, 240, reversed, false);
        needleDraw(c, 290, 380, needleA[0], 32); needleDraw(c, 670, 380, needleA[1], 32);
        wires(c, [[380, 392], [380, 470], [330, 470]]); wires(c, [[580, 392], [580, 470], [620, 470]]);
        batteries(c, 250, 470, 1, reversed); sw(c, 700, 480, on);
        label(c, '왼쪽 끝', 360, 330); label(c, '오른쪽 끝', 600, 330);
        label(c, on ? (reversed ? '전지 방향을 바꾸고 스위치를 닫았어요' : '스위치를 닫았어요. 나침반 바늘을 봐요') : '같은 전자석에서 전지 방향만 바꿔요', 480, 40);
      }
      if (s === 6) {
        drawImg(c, 'magnet', 300, 410, 200); magnetBar(c, 660, 410, 200);
        c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('N', 250, 417); c.fillText('S', 350, 417);
        label(c, '막대자석', 300, 360); label(c, '전자석', 660, 360);
        label(c, '두 자석의 성질을 비교해 봐요', 480, 40);
      }
    }
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- 단계별 패널
  function hintBox() {
    const k = HELPER[q.step], box = el('div', {class: 'lab-helper'}, el('img', {src: PORTRAIT(k), alt: ''}), el('div', {}, el('strong', {}, NAMES[k]), el('span', {}, k === 'comji' ? '실험 도우미' : k === 'dalsae' ? '관찰 기록 도우미' : '길잡이 도우미'), el('p', {}, q.hint ? HINTS[q.step][q.hint - 1] : '막히면 생각 열쇠를 눌러 보세요. 한 단계씩 힌트를 줄게요.')));
    return el('div', {class: 'crane-help'}, box, button(q.hint >= 3 ? '생각 열쇠 3단계까지 봤어요' : `생각 열쇠 보기 (${q.hint}/3)`, () => { if (q.hint < 3) { q.hint++; emit('hint', {answer: 'help'}); save(); render(); } }, 'secondary'));
  }
  function render() {
    const s = q.step;
    title.replaceChildren(el('h1', {}, '고철 부두 크레인'), el('span', {class: 'crane-step'}, `${Math.min(s + 1, 10)}/10단계: ${STEPS[Math.min(s, 9)]}`));
    canvas.setAttribute('aria-label', `고철 부두 크레인. ${STEPS[Math.min(s, 9)]} 장면`);
    panel.replaceChildren();
    const next = (label = '다음 단계로') => button(label, () => go(s + 1), 'crane-next');
    if (q.done) {
      panel.append(el('h2', {}, '부두 화물 이송이 다시 시작되었다.'), say('크레인 기사', '탐험가가 확인한 규칙대로 전자석을 쓰니 화물을 붙였다 놓을 수 있게 됐어요. 고마워요.'), el('p', {class: 'muted'}, '관찰과 제안을 바탕으로 바꾼 미래 모형입니다.'), say('엘엠', '거리 곳곳에도 전자석이 숨어 있대요. 전자석 부두 구역의 "전자석이 숨은 거리"에 가서 무엇이 보이는지 관찰 노트에 남겨 봐요.'), button('전자석 부두로 돌아가기', () => { on = false; back(); }));
      return;
    }
    if (s === 0) {
      panel.append(say('크레인 기사', '공방에서 전자석을 만들어 봤다며? 크레인을 고치기 전에 먼저 기억을 떠올려 봐요.'));
      panel.append(el('h3', {}, '전자석이 철을 끌어당기는 때는?'), choose([['전류가 흐를 때', () => { q.recall.current = 'current'; render(); }, q.recall.current === 'current'], ['선이 감겨 있으면 언제나', () => { q.recall.current = 'always'; render(); }, q.recall.current === 'always'], ['아직 잘 모르겠다', () => { q.recall.current = 'unknown'; render(); }, q.recall.current === 'unknown']]));
      panel.append(el('h3', {}, '에나멜선의 끝은 어떻게 연결할까요?'), choose([['양 끝의 피복을 벗겨 연결한다', () => { q.recall.ends = 'ends'; render(); }, q.recall.ends === 'ends'], ['피복을 그대로 두고 연결한다', () => { q.recall.ends = 'covered'; render(); }, q.recall.ends === 'covered'], ['감긴 부분까지 모두 벗긴다', () => { q.recall.ends = 'all'; render(); }, q.recall.ends === 'all']]));
      if (q.recall.current && q.recall.ends) panel.append(say('컴지', q.recall.current === 'current' && q.recall.ends === 'ends' ? '맞아요, 전류가 흐를 때 자석의 성질이 생기고, 에나멜선은 양 끝만 벗겨 이어요.' : '괜찮아요, 지금 생각을 남긴 거예요. 오늘 실험대에서 직접 확인해 봐요.'), button('크레인을 살펴보러 가기', () => { emit('recalled', {answer: 'recall', roles: {current: q.recall.current, ends: q.recall.ends}}); go(1); }, 'crane-next'));
    }
    if (s === 1) {
      panel.append(say('크레인 기사', q.released ? '스위치를 여니 화물이 내려왔어요. 그런데 옛 규칙은 자석을 늘 켜 두라고 했거든요.' : '철 화물을 내려놓아야 하는데, 자석을 늘 켜 두라는 옛 규칙 때문에 놓지를 못해요.'));
      if (!q.released) panel.append(button('크레인의 스위치 열어 보기', () => { q.released = true; emit('scene_released', {answer: 'off'}); save(); render(); }));
      else {
        const input = el('textarea', {'aria-label': '붙일 때와 놓을 때의 질문', maxlength: 300, placeholder: '붙일 때와 놓을 때는 무엇이 달라야 할까요?'}); input.value = q.question; input.oninput = () => { q.question = input.value; clearTimeout(input.saveT); input.saveT = setTimeout(save, 800); }; // 글자마다 서버로 보내지 않고 입력이 멈추면 저장한다
        panel.append(el('h3', {}, '붙이는 때와 놓는 때를 나눠 질문을 만들어 봐요'), input, button('예시 질문 쓰기', () => { q.question = '붙일 때와 놓을 때 스위치를 어떻게 해야 할까요?'; input.value = q.question; save(); }, 'secondary'), button('질문을 들고 실험대로', () => { if (!q.question.trim()) { feedback = '붙이는 때와 놓는 때를 비교할 질문을 남겨 주세요.'; render(); return; } q.asked = true; emit('question', {answer: q.question.trim()}); go(2); }, 'crane-next'));
      }
    }
    if (s === 2) {
      panel.append(say('크레인 기사', '같은 전자석으로 스위치를 닫았을 때와 열었을 때를 비교해 봐요.'), el('p', {class: 'crane-cond'}, '같은 철 볼트, 같은 감긴 선, 같은 전지, 같은 빵 끈'), button(on ? '실험대 스위치 열기' : '실험대 스위치 닫기', () => setOn(!on)));
      if (q.closed && q.opened) panel.append(el('h3', {}, '두 상태를 비교하면?'), choose([['스위치를 열면 붙는 정도가 크게 줄어든다', () => { q.answer = 'decrease'; emit('observed', {answer: 'decrease'}); feedback = '붙일 때는 닫고, 놓을 때는 여는 성질을 관찰했어요. 실제 실험에서 조금 남아도 붙는 정도가 크게 줄었으면 같은 결과예요.'; save(); render(); }, q.answer === 'decrease'], ['스위치를 열어도 붙는 정도가 늘 같다', () => { emit('observed', {answer: 'always'}); feedback = '같은 장치에서 스위치를 닫고 열 때 빵 끈이 어디에 있었는지 다시 봐요.'; render(); }], ['실제 실험에서도 반드시 하나도 남지 않는다', () => { emit('observed', {answer: 'zero'}); feedback = '실제 실험에서는 일부가 남을 수도 있어요. 조금 남았다고 실패로 정하지 말고 붙는 정도가 줄었는지 비교해요.'; render(); }]]));
      if (q.answer === 'decrease') panel.append(next());
    }
    if (s === 3) {
      panel.append(say('컴지', '크레인이 무거운 화물도 들 수 있을까요? 전지 수만 바꿔서 붙는 빵 끈 수를 세어 봐요.'), el('p', {class: 'crane-cond'}, '유지: 같은 볼트, 같은 감긴 선, 같은 빵 끈 / 바꾸기: 전지 수'));
      panel.append(choose([['전지 한 개', () => { setOn(false); setBattery(1); }, battery === 1], ['전지 두 개 직렬', () => { setOn(false); setBattery(2); }, battery === 2]]), button(on ? '스위치 열기' : '스위치 닫고 세어 보기', () => setOn(!on)));
      const t = el('table', {class: 'crane-table'}, el('tr', {}, el('th', {}, '전지'), el('th', {}, '붙은 빵 끈')), el('tr', {}, el('td', {}, '한 개'), el('td', {}, q.counts[1] ? MODEL_COUNT[1] + '개' : '아직')), el('tr', {}, el('td', {}, '두 개 직렬'), el('td', {}, q.counts[2] ? MODEL_COUNT[2] + '개' : '아직')));
      panel.append(t, el('p', {class: 'muted'}, '모형의 관찰 예입니다. 실제로 센 개수는 달라도 괜찮아요.'));
      if (q.counts[1] && q.counts[2]) panel.append(el('h3', {}, '관찰한 결과를 고르면?'), choose([['전지 두 개를 직렬로 연결하면 더 많이 붙는다', () => { q.strength = 'two'; emit('strength', {answer: 'two'}); feedback = '맞아요. 전지 두 개를 직렬로 연결하면 전자석의 세기가 세져요.'; save(); render(); }, q.strength === 'two'], ['전지 수와 상관없이 같다', () => { emit('strength', {answer: 'same'}); feedback = '표에서 두 줄의 개수를 다시 비교해 보세요.'; render(); }], ['전지 한 개일 때 더 많이 붙는다', () => { emit('strength', {answer: 'one'}); feedback = '어느 쪽 개수가 더 많은지 다시 세어 봐요.'; render(); }]]));
      if (q.strength === 'two') panel.append(next());
    }
    if (s === 4) {
      panel.append(say('달새', '이번엔 극을 알아보는 도구, 나침반이에요. 바늘의 빨간 쪽이 N극, 파란 쪽이 S극이에요.'), el('h3', {}, '막대자석의 N극을 가까이 가져가면 바늘의 어느 쪽이 끌려올까요?'));
      panel.append(choose([['파란 S극 쪽', () => { q.compass = 'south'; near = true; emit('compass', {answer: 'south'}); feedback = '예상대로 파란 S극이 끌려왔어요. 다른 극끼리 끌어당기는 거예요.'; save(); render(); }, q.compass === 'south'], ['빨간 N극 쪽', () => { near = true; emit('compass', {answer: 'north'}); feedback = '직접 보니 파란 S극이 끌려왔지요? 같은 극끼리는 밀어내고 다른 극끼리 끌어당겨요. 다시 골라 봐요.'; render(); }]]));
      if (q.compass === 'south') panel.append(next());
    }
    if (s === 5) {
      panel.append(say('달새', '나침반으로 전자석 양 끝의 극을 알아봐요. 바늘의 N극(빨간 쪽)이 끌려가는 끝은 무슨 극일까요?'));
      const phase = !q.poles.forward ? 'forward' : !q.poles.reverse ? 'reverse' : 'done';
      if (phase === 'reverse' && !reversed) panel.append(button('전지 방향 바꾸기', () => { on = false; reversed = true; render(); }));
      panel.append(button(on ? '스위치 열기' : '스위치 닫기', () => setOn(!on)));
      if (on && phase !== 'done' && (phase === 'forward' || reversed)) {
        panel.append(el('h3', {}, phase === 'forward' ? '전자석의 오른쪽 끝은 무슨 극일까요?' : '전지 방향을 바꾼 뒤, 오른쪽 끝은 무슨 극일까요?'));
        panel.append(choose(['N', 'S'].map((p) => [p + '극', () => { emit('poles', {answer: p, battery: phase}); const ok = (phase === 'forward' && p === 'S') || (phase === 'reverse' && p === 'N'); if (ok) { q.poles[phase] = p; feedback = phase === 'forward' ? '맞아요. 바늘의 N극이 끌려가니 오른쪽 끝은 S극이에요. 이제 전지 방향을 바꿔 봐요.' : '맞아요. 이번엔 바늘의 S극이 끌려가니 오른쪽 끝이 N극이 됐어요.'; save(); } else feedback = '바늘의 빨간 N극이 가리키는 쪽을 보세요. 다른 극끼리 끌어당긴다는 걸 떠올려요.'; render(); }])));
      }
      if (phase === 'done') panel.append(el('h3', {}, '전지 방향을 바꾸었더니 어떻게 되었나요?'), choose([['전자석의 극이 바뀌었다', () => { q.reversed = 'pole'; emit('reversed', {answer: 'pole'}); feedback = '맞아요. 전지 방향을 바꾸면 전자석의 극이 바뀌어요. 나침반 바늘이 그 증거예요.'; save(); render(); }, q.reversed === 'pole'], ['전자석의 세기가 세졌다', () => { emit('reversed', {answer: 'strength'}); feedback = '세기가 달라졌는지는 붙은 개수로 알 수 있어요. 이번에 달라진 건 바늘 방향이에요.'; render(); }], ['아무 변화가 없었다', () => { emit('reversed', {answer: 'none'}); feedback = '전지 방향을 바꾸기 전과 후 바늘 방향을 비교해 보세요.'; render(); }]]));
      if (q.reversed === 'pole') panel.append(next());
    }
    if (s === 6) {
      panel.append(say('척척 알림', '"모든 자석은 붙였다 떼는 성질과 세기를 똑같이 조절할 수 있습니다."'), say('컴지', '정말 그럴까요? 막대자석과 전자석을 비교표로 확인해 봐요. 칸을 눌러 O와 X를 고르면 돼요.'));
      const tbl = el('table', {class: 'crane-table compare'}, el('tr', {}, el('th', {}, '성질'), el('th', {}, '막대자석'), el('th', {}, '전자석')));
      for (const [key, text] of TABLE_ROWS) {
        const row = el('tr', {}, el('td', {}, text));
        for (const m of ['bar', 'em']) { const k = key + '-' + m, v = q.table[k]; row.append(el('td', {}, button(v === 'o' ? 'O' : v === 'x' ? 'X' : '?', () => { q.table[k] = v === 'o' ? 'x' : 'o'; save(); render(); }, 'ox ' + (v || '')))); }
        tbl.append(row);
      }
      panel.append(tbl, el('h3', {}, '척척의 알림은 맞을까요?'), choose([['틀렸다', () => { q.claim = 'false'; render(); }, q.claim === 'false'], ['맞다', () => { q.claim = 'true'; render(); }, q.claim === 'true']]));
      const filled = Object.keys(TABLE_TRUTH).every((k) => q.table[k]);
      panel.append(button('비교표 제출하기', () => {
        if (!filled || !q.claim) { feedback = '비교표의 모든 칸과 척척 알림 판단을 골라 주세요.'; render(); return; }
        emit('compared', {answer: q.claim, roles: {...q.table}});
        const wrong = Object.keys(TABLE_TRUTH).filter((k) => q.table[k] !== TABLE_TRUTH[k]);
        if (!wrong.length && q.claim === 'false') { q.tableOk = true; feedback = '맞아요. 막대자석은 세기와 극을 바꿀 수 없지만, 전자석은 전원이 필요한 대신 세기와 극을 바꿀 수 있어요. 척척의 알림은 틀렸어요.'; }
        else feedback = wrong.length ? `다시 볼 칸이 ${wrong.length}개 있어요. ${wrong.map((k) => TABLE_ROWS.find(([r]) => k.startsWith(r))[1] + '(' + (k.endsWith('bar') ? '막대자석' : '전자석') + ')').join(', ')}` : '비교표는 맞았어요. 그럼 척척의 알림은 맞을까요?';
        save(); render();
      }));
      if (q.tableOk) panel.append(next());
    }
    if (s === 7) {
      const moved = items.filter((i) => i.metal === 'iron' && i.delivered).length;
      panel.append(say('크레인 기사', '이제 확인한 규칙으로 크레인을 조종해 보세요. 철 화물 세 개를 오른쪽 화물통에 옮기면 돼요.'), el('p', {class: 'crane-cond'}, `옮긴 철 화물 ${moved}/3, 헤드 ${headTarget ? '내려감' : '올라감'}, 전자석 ${on ? '켜짐' : '꺼짐'}, ${battery === 2 ? '전지 두 개 직렬' : '전지 한 개'}`));
      const ctl = el('div', {class: 'crane-controls'},
        button('◀ 왼쪽', () => { craneX = Math.max(150, craneX - 40); render(); }), button('오른쪽 ▶', () => { craneX = Math.min(900, craneX + 40); render(); }),
        button(headTarget ? '▲ 올리기' : '▼ 내리기', () => setHead(headTarget ? 0 : 1)),
        button(on ? '스위치 열기(놓기)' : '스위치 닫기(붙이기)', () => setOn(!on)),
        button(battery === 2 ? '전지 한 개로' : '전지 두 개 직렬로', () => setBattery(battery === 2 ? 1 : 2), 'secondary'));
      panel.append(ctl, el('p', {class: 'muted'}, '방향키 ← →로 옮기고 ↓ ↑로 내리고 올리고, 스페이스로 스위치를 닫고 열 수 있어요. 옮긴 개수는 점수가 아니에요.'));
      if (q.delivered >= 3) panel.append(next('증거를 정리하러 가기'));
    }
    if (s === 8) {
      const ev = q.evidence;
      panel.append(say('달새', '크레인을 움직인 규칙의 증거를 정리해 봐요.'));
      panel.append(el('h3', {}, '전자석의 세기가 달라진 것을 알려 준 증거는?'), choose([['붙은 빵 끈의 개수', () => { ev.force = 'count'; render(); }, ev.force === 'count'], ['나침반 바늘의 방향', () => { ev.force = 'compass'; render(); }, ev.force === 'compass']]));
      panel.append(el('h3', {}, '전자석의 극이 바뀐 것을 알려 준 증거는?'), choose([['나침반 바늘의 방향', () => { ev.pole = 'compass'; render(); }, ev.pole === 'compass'], ['붙은 빵 끈의 개수', () => { ev.pole = 'count'; render(); }, ev.pole === 'count']]));
      panel.append(el('h3', {}, '더 생각하기: 나침반 바늘 방향만 보고 세기를 비교할 수 있을까요?'), choose([['비교할 수 없다', () => { ev.deep = 'no'; render(); }, ev.deep === 'no'], ['비교할 수 있다', () => { ev.deep = 'yes'; render(); }, ev.deep === 'yes']]));
      panel.append(button('증거 정리 제출', () => {
        if (!ev.force || !ev.pole || !ev.deep) { feedback = '세 질문에 모두 답해 주세요.'; render(); return; }
        emit('evidence', {answer: 'submit', roles: {...ev}});
        if (ev.force === 'count' && ev.pole === 'compass' && ev.deep === 'no') { q.evidenceOk = true; feedback = '맞아요. 세기는 붙은 개수로, 극은 바늘 방향으로 확인했어요. 바늘 방향으로는 극만 알 수 있어요.'; }
        else feedback = '세기와 극은 서로 다른 증거로 확인했어요. 실험대에서 무엇을 세고 무엇을 봤는지 떠올려 보세요.';
        save(); render();
      }));
      if (q.evidenceOk) panel.append(next());
    }
    if (s === 9) {
      panel.append(say('크레인 기사', '크레인에 막대자석 대신 전자석을 쓰는 까닭을 정리해 줄래요? 부두 사람들에게 알려 줄게요.'));
      const opts = [['onoff', '필요할 때만 붙였다가 놓을 수 있다'], ['strength', '화물에 맞게 세기를 조절할 수 있다'], ['nopower', '전기가 없어도 언제나 자석이다']];
      panel.append(el('h3', {}, '알맞은 까닭을 모두 골라 봐요'), el('div', {class: 'choices'}, opts.map(([k, t]) => { const b = button(t, () => { q.picks = q.picks.includes(k) ? q.picks.filter((x) => x !== k) : [...q.picks, k]; save(); render(); }); if (q.picks.includes(k)) b.setAttribute('aria-pressed', 'true'); return b; })));
      const input = el('textarea', {maxlength: 300, 'aria-label': '내 말로 쓴 까닭', placeholder: '예: 전자석은 스위치를 열면 화물을 놓을 수 있어서 크레인에 알맞다.'}); input.value = q.reason || ''; input.oninput = () => { q.reason = input.value; clearTimeout(input.saveT); input.saveT = setTimeout(save, 800); };
      panel.append(el('h3', {}, '내 말로 까닭을 적어 봐요'), input);
      panel.append(button('설명을 크레인 기사에게 전하기', () => {
        if (q.picks.includes('nopower')) { feedback = '전기가 없어도 언제나 자석인 것은 막대자석의 성질이에요. 크레인에서 화물을 놓으려면 어떤 성질이 필요할까요?'; render(); return; }
        if (!q.picks.includes('onoff')) { feedback = '크레인은 화물을 붙였다가 놓아야 해요. 그 성질을 골라 봐요.'; render(); return; }
        if (!(q.reason || '').trim()) { feedback = '내 말로 까닭을 한 문장 적어 주세요.'; render(); return; }
        emit('completed', {answer: q.reason.trim(), card: q.picks.join(',')});
        q.done = true; save(); render();
      }, 'crane-next'));
    }
    if (feedback) panel.append(el('div', {class: 'feedback', role: 'status'}, feedback));
    if (!q.done) panel.append(hintBox());
    panel.append(button('전자석 부두로 돌아가기', () => { on = false; back(); }, 'secondary'));
  }

  // ---------------------------------------------------------------- 입력
  const down = (e) => {
    if (q.step !== 7 || e.target.tagName === 'TEXTAREA') return;
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); keys.add(e.key); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHead(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHead(0); }
    if (e.key === ' ') { e.preventDefault(); setOn(!on); }
  };
  const up = (e) => { if (keys.delete(e.key) && q.step === 7) render(); };
  canvas.addEventListener('keydown', down); window.addEventListener('keyup', up);
  canvas.addEventListener('click', (e) => {
    const b = canvas.getBoundingClientRect(), x = (e.clientX - b.left) * 960 / b.width, y = (e.clientY - b.top) * 540 / b.height;
    canvas.focus({preventScroll: true});
    if ([2, 3, 5].includes(q.step) && x > 690 && x < 830 && y > 400 && y < 500) setOn(!on);
    if (q.step === 7) { craneX = Math.max(150, Math.min(900, x)); render(); }
  });
  render();
  raf = requestAnimationFrame(frame);
  return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('keyup', up); };
}
