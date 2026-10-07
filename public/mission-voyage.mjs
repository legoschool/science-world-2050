// 축소 탐험 캡슐 체험(모형): 우리 몸의 구조와 기능 보완 단원(R5-G01~G03)의 몸속 탐험 장면. 의뢰 엔진은 VOYAGE_COMPONENTS를 COMPONENTS에 합친다.
// 학생은 캡슐을 방향키, WASD, 화면 단추, 캔버스 누르기, 「다음 장소로」로 움직이고, 장소에 도착하면 그 자리에서 조작해 결과를 본다.
// 캡슐이 작아져 몸속을 다니는 것은 시뮬레이션이다(실제로 몸이 작아지지 않는다). 체온, 심장 박동 수, 계기판, 근육 길이는 모두 모형 값이다.
// 과학 내용 지킴: 음식물은 숨관과 폐로 가지 않고 공기는 위로 가지 않는다. 영양소는 작은창자에서 흡수된 뒤에만 혈액에 실린다.
// 오줌은 콩팥이 혈액 속 노폐물을 걸러 만든다. 숨을 들이마시는 까닭은 갈비뼈가 올라가고 가로막이 내려가 가슴이 커지기 때문이다.
// 근육은 짧아지며 당기기만 하고 밀지 못한다. 근육은 관절을 사이에 두고 서로 다른 뼈에 붙어야 뼈를 움직인다.
// 「기관」이라는 말만 쓰고 조직과 기관계는 쓰지 않는다. 질병은 교과서 예시와 예방 습관만 다루고, 진단처럼 말하거나 치료법을 알려 주지 않는다.
const VW = 720, VH = 380, TAU = Math.PI * 2, INK = '#233a5c';
const FONT = (s, b = true) => `${b ? 'bold ' : ''}${s}px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif`;
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const act = (task, fire) => (a) => { if (task.type === 'action') fire?.(a); };
const later = (on) => setTimeout(() => on?.(), 0);
const jo = (w, a, b) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 ? a : b); };
const ro = (w) => { const k = w.charCodeAt(w.length - 1) - 0xac00; return w + (k >= 0 && k < 11172 && k % 28 && k % 28 !== 8 ? '으로' : '로'); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const hyp = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function seeded(n) { let a = n >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function segNear(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
  const u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / L2, 0, 1);
  return {x: a.x + dx * u, y: a.y + dy * u, u};
}

// ---------------------------------------------------------------- 그리기 도구
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function txt(c, s, x, y, {size = 13, bold = true, color = INK, align = 'left'} = {}) { c.font = FONT(size, bold); c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(s, x, y); }
function panel(c, x, y, w, h, fill = 'rgba(12,24,40,.84)') { rr(c, x, y, w, h, 8); c.fillStyle = fill; c.fill(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1; c.stroke(); }
function dot(c, x, y, r, fill, stroke, lw = 1.5) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
function oval(c, x, y, rx, ry, rot, fill, stroke, lw = 1.5) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
function line(c, pts, col, w, cap = 'round') { c.strokeStyle = col; c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
function heartPath(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s); c.bezierCurveTo(x - s * 1.45, y - s * 0.1, x - s * 0.72, y - s * 1.25, x, y - s * 0.42); c.bezierCurveTo(x + s * 0.72, y - s * 1.25, x + s * 1.45, y - s * 0.1, x, y + s); c.closePath(); }
function kidneyPath(c, x, y, s, f = 1) {
  c.beginPath(); c.moveTo(x + f * s * 0.25, y - s);
  c.bezierCurveTo(x - f * s * 0.95, y - s * 1.15, x - f * s * 0.95, y + s * 1.15, x + f * s * 0.25, y + s);
  c.bezierCurveTo(x + f * s * 0.8, y + s * 0.95, x + f * s * 0.62, y + s * 0.32, x + f * s * 0.32, y);
  c.bezierCurveTo(x + f * s * 0.62, y - s * 0.32, x + f * s * 0.8, y - s * 0.95, x + f * s * 0.25, y - s); c.closePath();
}
function star(c, x, y, r, col, edge) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } c.closePath(); c.fillStyle = col; c.fill(); if (edge) { c.strokeStyle = edge; c.lineWidth = 1; c.stroke(); } }
function drop(c, x, y, r, col) { c.beginPath(); c.moveTo(x, y - r * 1.6); c.quadraticCurveTo(x + r * 1.1, y - r * 0.2, x, y + r); c.quadraticCurveTo(x - r * 1.1, y - r * 0.2, x, y - r * 1.6); c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(20,60,110,.45)'; c.lineWidth = 0.8; c.stroke(); }
function bone(c, x1, y1, x2, y2, w, col = '#f4ecd6', edge = '#8a7a58') {
  line(c, [[x1, y1], [x2, y2]], edge, w + 3); line(c, [[x1, y1], [x2, y2]], col, w);
  for (const [x, y] of [[x1, y1], [x2, y2]]) dot(c, x, y, w * 0.62, col, edge, 1.5);
}
function arrowHead(c, x, y, ang, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s); c.lineTo(x + Math.cos(ang + 2.5) * s, y + Math.sin(ang + 2.5) * s); c.lineTo(x + Math.cos(ang - 2.5) * s, y + Math.sin(ang - 2.5) * s); c.closePath(); c.fill(); }
function eyes(c, x, y, s, happy) {
  dot(c, x - s, y, s * 0.42, '#2a1b1b'); dot(c, x + s, y, s * 0.42, '#2a1b1b');
  c.strokeStyle = '#2a1b1b'; c.lineWidth = Math.max(1.2, s * 0.25); c.lineCap = 'round'; c.beginPath();
  if (happy) c.arc(x, y + s * 0.5, s * 0.7, 0.2 * Math.PI, 0.8 * Math.PI); else { c.moveTo(x - s * 0.5, y + s * 1.1); c.lineTo(x + s * 0.5, y + s * 1.1); }
  c.stroke();
}
// 막대 계기(모형 값): 0~1
function bar(c, x, y, w, h, v, col, back = 'rgba(255,255,255,.18)') { rr(c, x, y, w, h, h / 2); c.fillStyle = back; c.fill(); if (v > 0.01) { rr(c, x, y, Math.max(h, w * clamp(v, 0, 1)), h, h / 2); c.fillStyle = col; c.fill(); } }
function check(c, x, y, r, on, cur, opt) {
  if (on) { dot(c, x, y, r, '#3fbf74', '#1d6b3f', 1.2); c.strokeStyle = '#fff'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x - r * 0.5, y); c.lineTo(x - r * 0.1, y + r * 0.45); c.lineTo(x + r * 0.55, y - r * 0.45); c.stroke(); return; }
  if (opt) c.setLineDash([2, 2]);
  dot(c, x, y, r, cur ? 'rgba(255,213,74,.25)' : null, cur ? '#ffd54a' : '#9fb0c6', cur ? 2 : 1.3);
  c.setLineDash([]);
}

function device(el, owner, label) {
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas voy-canvas', width: 1440, height: 760, role: 'img', 'aria-label': label, tabindex: '0'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray voy-tray'});
  const node = el('div', {class: 'signal-device sun voyage-lab'}, el('div', {class: 'signal-owner'}, owner), canvas, tray, status);
  return {canvas, status, tray, node, c: canvas.getContext('2d')};
}

// ================================================================ 탐험 엔진
// 장면 자료(MODES[mode]): 세계 크기, 길(nodes와 edges, 둥근 방), 자유롭게 다니는 사각 구역(rects), 장소(stations)와 장소마다 할 일(acts).
// 길은 edges의 need 장소를 마쳐야 열린다. one: 한쪽으로만 흐르는 길(혈액). deco: 그리기만 하는 길.
// 중간 진행 저장: 장면 상태(S)는 memory.voyage[mode]에 있고 의뢰 상태와 함께 저장된다. 장소를 마치면 바로, 장소 안에서 조작하면 조금 뒤에 save를 부른다.
// 다시 들어오면(새로 고침 포함) 마지막으로 마친 장소(S.ck)에서 이어 간다. 움직이던 길과 실려 가던 중(ride)은 저장하지 않으므로, 장면마다 init에서 끊긴 상태를 정리한다.
export function voyage({el, button, mode, task = {}, mission = {}, memory = {}, others = {}, save, avatarView, onAction: fire, onReady}) {
  const D = MODES[mode] || MODES.digest, onAction = act(task, fire), RM = reduceMotion();
  const V = memory.voyage ??= {};
  const S = V[mode] ??= {};
  S.acts ??= {}; S.done ??= {}; S.v ??= {};
  D.init?.(S, V);
  if (!S.pos) S.pos = {x: D.start[0], y: D.start[1]};
  const resumed = !S.finished && !!S.ck;
  if (resumed) S.pos = {x: S.ck.x, y: S.ck.y};
  let saveT = 0;
  const persist = () => { clearTimeout(saveT); saveT = 0; try { save?.(); } catch { /* 저장은 다음 기회에 다시 한다 */ } };
  const persistSoon = () => { clearTimeout(saveT); saveT = setTimeout(persist, 1500); };
  const {canvas, c, tray, status, node} = device(el, D.owner, D.label);
  const N = {};
  for (const [id, v] of Object.entries(D.nodes || {})) N[id] = {id, x: v[0], y: v[1], r: v[2] || 0, ...(v[3] || {})};
  const edges = (D.edges || []).map(([a, b, r, o]) => ({a: N[a], b: N[b], r, ...(o || {})}));
  const walkEdges = edges.filter((e) => !e.deco), rooms = Object.values(N).filter((n) => n.r && !n.deco), rects = D.rects || [];
  const open = (e) => !e.deco && (!e.need || !!S.done[e.need]) && (!e.when || e.when(S, V));
  const roomOpen = (n) => !n.need || !!S.done[n.need];
  const A = {}, fx = [], labels = [];
  let occupied = [], alive = true, raf = 0, last = performance.now(), T = 0, dtNow = 0.016, face = 1;
  let vel = {x: 0, y: 0}, auto = null, pendingRide = null, nudge = null, holdDir = null, holdT = 0, heldMs = 0, tapGoal = null, look = null, shake = null;
  let here = null, hereKey = null, bumpT = -9, checkT = 0, fired = !!S.finished, rideEnd = false, walking = false;
  let bubble = null; // 조종석 말풍선: 장소를 마치면 짧게 한마디 한다(움직임 줄이기 설정이면 튀어나오는 효과 없이 보여 준다)
  const keys = new Set();
  const cam = {x: clamp(S.pos.x - VW / 2, 0, Math.max(0, D.w - VW)), y: clamp(S.pos.y - VH / 2, 0, Math.max(0, D.h - VH))};
  // 내 아바타를 캡슐 조종석에 태운다(그림이 아직 비어 있으면 잠시 뒤 다시 받아 온다)
  let pilot = null;
  const getPilot = () => { try { const v = avatarView?.(); if (v && v.width) pilot = v; } catch { pilot = null; } };
  getPilot();
  const blank = () => { try { const d = pilot.getContext('2d').getImageData(0, 0, pilot.width, pilot.height).data; for (let i = 3; i < d.length; i += 16) if (d[i]) return false; return true; } catch { return false; } };
  setTimeout(() => { if (alive && (!pilot || blank())) getPilot(); }, 900);
  setTimeout(() => { if (alive && (!pilot || blank())) getPilot(); }, 2600);
  const rnd = seeded(D.w * 7 + D.h), back = Array.from({length: D.blobs?.n || 0}, () => [rnd() * D.w, rnd() * D.h, (D.blobs.r || 8) * (0.5 + rnd()), rnd()]);

  const say = (s) => { if (s) status.textContent = s; };
  const P = (st, i = 0) => { const s = st.spots ? st.spots[i] : st.at; return typeof s === 'string' ? N[s] : {x: s[0], y: s[1]}; };
  const spotN = (st) => (st.spots ? st.spots.length : 1);
  const ready = (st) => !st.ready || st.ready(S, V);
  function actDone(st, a, spot) {
    if (!a) return true;
    const bag = S.acts[st.id] || {}, need = a.times || 1;
    if (a.choices) return (bag[a.id] || 0) >= 1;
    if (a.perSpot) {
      if (spot == null) { const ok = (i) => (bag[a.id + '@' + i] || 0) >= need, ids = [...Array(spotN(st)).keys()]; return st.anySpot ? ids.some(ok) : ids.every(ok); }
      return (bag[a.id + '@' + spot] || 0) >= need;
    }
    return (bag[a.id] || 0) >= need;
  }
  const stationDone = (st) => (st.done ? !!st.done(S, V) : st.acts.filter((a) => !a.optional && !a.toggle).every((a) => actDone(st, a, null)));
  const spotDone = (st, i) => { const ps = st.acts.filter((a) => a.perSpot); return ps.length ? ps.every((a) => actDone(st, a, i)) : !!S.done[st.id]; };
  function nearStation() {
    let found = null;
    for (const st of D.stations) {
      if (!ready(st) && !S.done[st.id]) continue;
      for (let i = 0; i < spotN(st); i++) {
        const p = P(st, i);
        if (hyp(S.pos.x, S.pos.y, p.x, p.y) > st.r) continue;
        const cand = {st, spot: st.spots ? i : null};
        if (!S.done[st.id]) return cand;
        found = cand;
      }
    }
    return found;
  }
  function nextStation() {
    const id = D.next?.(S, V);
    if (id) return D.stations.find((s) => s.id === id) || null;
    const req = D.stations.filter((s) => !s.optional && !s.hidden && !S.done[s.id]);
    return req.find(ready) || req[0] || null;
  }
  // ---------------------------------------------------------------- 걷기: 열린 길, 방, 사각 구역 안에서만 움직인다
  function inside(p) {
    for (const e of walkEdges) if (open(e)) { const q = segNear(p, e.a, e.b); if (hyp(p.x, p.y, q.x, q.y) <= e.r) return true; }
    for (const n of rooms) if (roomOpen(n) && hyp(p.x, p.y, n.x, n.y) <= n.r) return true;
    for (const [x0, y0, x1, y1] of rects) if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) return true;
    return false;
  }
  function walk(p) {
    if (inside(p)) return p;
    let best = null, bd = Infinity;
    const cand = (q, d) => { if (d < bd) { bd = d; best = q; } };
    for (const e of walkEdges) if (open(e)) { const q = segNear(p, e.a, e.b), d = hyp(p.x, p.y, q.x, q.y), k = (e.r - 0.4) / (d || 1); cand({x: q.x + (p.x - q.x) * k, y: q.y + (p.y - q.y) * k}, d - e.r); }
    for (const n of rooms) if (roomOpen(n)) { const d = hyp(p.x, p.y, n.x, n.y), k = (n.r - 0.4) / (d || 1); cand({x: n.x + (p.x - n.x) * k, y: n.y + (p.y - n.y) * k}, d - n.r); }
    for (const [x0, y0, x1, y1] of rects) { const q = {x: clamp(p.x, x0, x1), y: clamp(p.y, y0, y1)}; cand(q, hyp(p.x, p.y, q.x, q.y)); }
    return best || p;
  }
  function lockedAt(p) { for (const e of walkEdges) if (!open(e)) { const q = segNear(p, e.a, e.b); if (hyp(p.x, p.y, q.x, q.y) <= e.r + 6) return e; } return null; }
  function flowAt(p) { for (const e of walkEdges) if (e.one && open(e)) { const q = segNear(p, e.a, e.b); if (hyp(p.x, p.y, q.x, q.y) <= e.r) { const L = hyp(e.a.x, e.a.y, e.b.x, e.b.y) || 1; return {x: (e.b.x - e.a.x) / L, y: (e.b.y - e.a.y) / L}; } } return null; }
  // ---------------------------------------------------------------- 길 찾기(「다음 장소로」와 캔버스 누르기)
  function route(tp, tn) {
    if (!tn) return {pts: [walk({x: tp.x, y: tp.y})], len: hyp(S.pos.x, S.pos.y, tp.x, tp.y)};
    const p = S.pos, start = new Map();
    const add = (n, d) => { if (!start.has(n) || start.get(n) > d) start.set(n, d); };
    for (const n of rooms) if (roomOpen(n) && hyp(p.x, p.y, n.x, n.y) <= n.r + 1) add(n, hyp(p.x, p.y, n.x, n.y));
    for (const e of walkEdges) if (open(e)) { const q = segNear(p, e.a, e.b); if (hyp(p.x, p.y, q.x, q.y) <= e.r + 2) { add(e.b, hyp(p.x, p.y, e.b.x, e.b.y)); if (!e.one) add(e.a, hyp(p.x, p.y, e.a.x, e.a.y)); } }
    if (!start.size) return null;
    const dist = new Map(start), prev = new Map(), done = new Set();
    for (;;) {
      let u = null, ud = Infinity;
      for (const [n, d] of dist) if (!done.has(n) && d < ud) { u = n; ud = d; }
      if (!u || u === tn) break;
      done.add(u);
      for (const e of walkEdges) {
        if (!open(e)) continue;
        const v = e.a === u ? e.b : e.b === u && !e.one ? e.a : null;
        if (!v || (v.r && !roomOpen(v))) continue;
        const nd = ud + hyp(u.x, u.y, v.x, v.y);
        if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); }
      }
    }
    if (!dist.has(tn)) return null;
    const pts = [];
    for (let n = tn; n; n = prev.get(n)) pts.unshift({x: n.x, y: n.y});
    if (tp && (tp.x !== tn.x || tp.y !== tn.y)) pts.push({x: tp.x, y: tp.y});
    return {pts, len: dist.get(tn)};
  }
  const graph = () => walkEdges.length > 0;
  function nearestNode(p) { let best = null, bd = Infinity; for (const n of Object.values(N)) { if (n.deco) continue; const d = hyp(p.x, p.y, n.x, n.y); if (d < bd) { bd = d; best = n; } } return best; }
  function startAuto(pts, speed, opts = {}) {
    if (!pts?.length) return;
    tapGoal = null; nudge = null;
    if (RM) { const e = pts[pts.length - 1]; S.pos.x = e.x; S.pos.y = e.y; auto = null; if (opts.ride) rideEnd = true; opts.then?.(); return; }
    auto = {pts, i: 0, speed, ride: !!opts.ride, then: opts.then, wind: opts.wind || 0};
  }
  function goNext() {
    if (auto?.ride) return;
    const st = nextStation();
    if (!st) { say(D.allDone || D.finish); return; }
    if (here && here.st === st && (!st.spots || !spotDone(st, here.spot))) { say(D.hereMsg?.(st, S) || '여기에서 할 일을 해 봐요. 아래 단추를 눌러요.'); actRow.querySelector('button:not(.voy-done)')?.focus({preventScroll: true}); return; }
    let best = null;
    for (let i = 0; i < spotN(st); i++) {
      if (st.spots && spotDone(st, i)) continue;
      const p = P(st, i), tn = graph() ? (typeof (st.spots ? st.spots[i] : st.at) === 'string' ? N[st.spots ? st.spots[i] : st.at] : nearestNode(p)) : null;
      const r = route(p, tn);
      if (r && (!best || r.len < best.len)) best = r;
    }
    if (!best) { say(D.blocked || '아직 길이 닫혀 있어요. 지금 있는 곳에서 할 일을 먼저 해요.'); return; }
    startAuto(best.pts, 300);
    say(`${ro(st.name)} 가요.`);
  }
  function goTap(wp) {
    if (auto?.ride) return;
    auto = null; nudge = null;
    if (!graph()) { tapGoal = walk(wp); return; }
    const q = walk(wp);
    if (hyp(q.x, q.y, wp.x, wp.y) > 60) return;
    const ends = [];
    for (const n of rooms) if (roomOpen(n) && hyp(q.x, q.y, n.x, n.y) <= n.r) ends.push(n);
    for (const e of walkEdges) if (open(e)) { const z = segNear(q, e.a, e.b); if (hyp(q.x, q.y, z.x, z.y) <= e.r + 1) { ends.push(e.a); if (!e.one) ends.push(e.b); } }
    let best = null;
    for (const n of ends) { const r = route(q, n); if (r && (!best || r.len + hyp(n.x, n.y, q.x, q.y) < best.len)) best = {...r, len: r.len + hyp(n.x, n.y, q.x, q.y)}; }
    if (best) startAuto(best.pts, 260);
  }
  // ---------------------------------------------------------------- 장면에서 쓰는 도구
  const E = {
    S, V, N, A, RM, edges, cam,
    get t() { return T; }, get dt() { return dtNow; }, get here() { return here?.st.id || null; }, get riding() { return !!auto?.ride; },
    say, open,
    tw(key, target, rate = 5) { const cur = A[key] ?? target; const v = RM ? target : cur + (target - cur) * Math.min(1, rate * dtNow); A[key] = Math.abs(v - target) < 0.002 ? target : v; return A[key]; },
    trigger(key) { A['@' + key] = T; },
    since(key) { return A['@' + key] == null ? Infinity : T - A['@' + key]; },
    wave(key, dur) { const st = A['@' + key]; if (st == null) return 0; const k = (T - st) / dur; if (k < 0 || k > 1) return 0; return RM ? 1 : Math.sin(k * Math.PI); },
    lab(s, x, y, o) { labels.push([s, x, y, o || {}]); },
    burst(k, x, y, n = 8, o = {}) { const cnt = RM ? Math.ceil(n / 3) : n; for (let i = 0; i < cnt; i++) { const a = Math.random() * TAU, sp = (o.speed ?? 60) * (0.4 + Math.random()); fx.push({k, x, y, vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0), g: o.g || 0, t: 0, life: (o.life ?? 0.9) * (0.7 + Math.random() * 0.6), r: o.r, col: o.col}); } },
    seek(k, x0, y0, x1, y1, dur = 0.8, o = {}) { const p = {k, sx: x0, sy: y0, tx: x1, ty: y1, x: x0, y: y0, dur, seek: true, t: -(o.delay || 0), life: dur + (o.stay ?? 0.5), vx: o.vx || 0, vy: o.vy || 0, r: o.r, col: o.col}; if (RM) { p.t = dur; p.x = x1; p.y = y1; } fx.push(p); },
    ball(x, y0, hitY, dir = 1) { if (RM) { fx.push({k: 'ball', x, y: hitY - 12, vx: 0, vy: 0, t: 0, life: 1.2, still: true}); fx.push({k: 'ring', x, y: hitY, t: 0, life: 0.9, r: 26}); return; } fx.push({k: 'ball', x, y: y0, vx: 0, vy: 0, hitY, dir, t: 0, life: 2.4}); },
    shake(a = 4, dur = 0.5) { if (!RM) shake = {a, until: T + dur}; },
    speak(s, dur = 2.8) { if (s) bubble = {s, t0: T, until: T + dur}; },
    // 꽃가루: 움직임 줄이기 설정이면 캡슐 둘레에 멈춘 채로 잠깐 보여 준다
    confetti(x, y, n = 30) {
      const cols = ['#ffd54a', '#5be08c', '#7fd6ff', '#ff8a7a', '#c9a2ff'];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + Math.random() * 0.3, sp = 90 + Math.random() * 90, col = cols[i % cols.length], a0 = Math.random() * TAU;
        if (RM) { if (i % 2) continue; fx.push({k: 'confetti', x: x + Math.cos(a) * 36, y: y + Math.sin(a) * 26, vx: 0, vy: 0, t: 0, life: 1.8, col, a0, still: true}); }
        else fx.push({k: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 220, t: 0, life: 1.4 + Math.random() * 0.6, col, a0});
      }
    },
    look(x, y, dur = 1.6) { look = {x, y, until: T + dur}; },
    ride(target, o = {}) { pendingRide = {target, o}; },
    route(ids) { const pts = ids.map((id) => N[id]), acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + hyp(pts[i].x, pts[i].y, pts[i - 1].x, pts[i - 1].y)); return {ids, pts, acc, len: acc[acc.length - 1]}; },
    routeS(R, p) { let best = 0, bd = Infinity; for (let i = 0; i < R.pts.length - 1; i++) { const q = segNear(p, R.pts[i], R.pts[i + 1]), d = hyp(p.x, p.y, q.x, q.y); if (d < bd - 0.01) { bd = d; best = R.acc[i] + q.u * (R.acc[i + 1] - R.acc[i]); } } return best; },
    routePt(R, s) { if (s <= 0) return {x: R.pts[0].x, y: R.pts[0].y}; for (let i = 0; i < R.pts.length - 1; i++) if (s <= R.acc[i + 1]) { const k = (s - R.acc[i]) / ((R.acc[i + 1] - R.acc[i]) || 1); return {x: lerp(R.pts[i].x, R.pts[i + 1].x, k), y: lerp(R.pts[i].y, R.pts[i + 1].y, k)}; } const e = R.pts[R.pts.length - 1]; return {x: e.x, y: e.y}; },
    edge(a, b) { return edges.find((e) => (e.a.id === a && e.b.id === b) || (e.a.id === b && e.b.id === a)); },
    inView(x, y, m = 40) { return x > cam.x - m && x < cam.x + VW + m && y > cam.y - m && y < cam.y + VH + m; },
    cnt(st, k) { return S.acts[st]?.[k] || 0; },
  };

  // ---------------------------------------------------------------- 단추 줄: 캡슐 움직이기(늘 그대로) + 지금 있는 곳에서 할 일
  const DIRS = [['left', '◀', '왼쪽으로 움직이기'], ['up', '▲', '위로 움직이기'], ['down', '▼', '아래로 움직이기'], ['right', '▶', '오른쪽으로 움직이기']];
  const pad = el('span', {class: 'bench-seg voy-pad'}, DIRS.map(([d, s, aria]) => {
    const b = button(s, () => { if (heldMs > 220) { heldMs = 0; return; } nudge = {d, left: 40}; auto = auto?.ride ? auto : null; tapGoal = null; }, 'bench-opt voy-dir');
    b.setAttribute('aria-label', aria);
    b.addEventListener('pointerdown', () => { holdDir = d; holdT = performance.now(); heldMs = 0; });
    const up = () => { if (holdDir === d) { heldMs = performance.now() - holdT; holdDir = null; } };
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    return b;
  }));
  const goBtn = button('다음 장소로', goNext, 'mission-go voy-go');
  const moveRow = el('div', {class: 'bench-wire voy-move'}, el('b', {class: 'bench-wire-name'}, D.moverName || '캡슐'), pad, goBtn);
  const actRow = el('div', {class: 'bench-wire voy-act'});
  tray.append(moveRow, actRow);
  function renderActs() {
    const keep = actRow.contains(document.activeElement) ? document.activeElement.dataset.act : null;
    actRow.replaceChildren();
    if (!here) {
      const nx = nextStation();
      actRow.append(el('b', {class: 'bench-wire-name'}, '목적지'), el('span', {class: 'voy-next'}, nx ? nx.name : (D.allName || '모두 둘러봤어요')));
      return;
    }
    const st = here.st, seg = el('span', {class: 'bench-seg'});
    actRow.append(el('b', {class: 'bench-wire-name'}, st.name), seg);
    for (const a of st.acts) {
      if (a.show && !a.show(S, V)) continue;
      if (a.choices) {
        for (const ch of a.choices) { const b = button(ch.label, () => doAct(st, a, ch), 'bench-opt'); b.dataset.act = `${st.id}:${a.id}:${ch.id}`; if (S.acts[st.id]?.[a.id] && S.v['pick:' + st.id] === ch.id) b.classList.add('voy-done'); seg.append(b); }
        continue;
      }
      const b = button(typeof a.label === 'function' ? a.label(S) : a.label, () => doAct(st, a), a.go ? 'mission-go' : 'bench-opt');
      b.dataset.act = `${st.id}:${a.id}`;
      if (a.toggle) b.setAttribute('aria-pressed', String(!!S.v.tg?.[a.id]));
      else if (!a.go && actDone(st, a, here.spot)) b.classList.add('voy-done');
      seg.append(b);
    }
    if (!seg.children.length) seg.append(el('span', {class: 'voy-next'}, S.done[st.id] ? '다 살펴봤어요' : ''));
    if (keep) (actRow.querySelector(`[data-act="${keep}"]`) || actRow.querySelector('button'))?.focus({preventScroll: true});
  }
  function doAct(st, a, ch) {
    if (auto?.ride) { say(D.busyMsg || '움직이는 중이에요. 잠시 기다려요.'); return; }
    if (!here || here.st !== st) return;
    const spot = here.spot;
    let block = null;
    if (typeof a.need === 'function') block = a.need(S, V, E);
    else if (a.need) { const miss = a.need.find((id) => !actDone(st, st.acts.find((x) => x.id === id), spot)); if (miss) block = a.needMsg || '먼저 다른 일을 해 봐요.'; }
    if (block) { say(block); return; }
    const bag = S.acts[st.id] ??= {};
    persistSoon();
    if (a.toggle) { S.v.tg ??= {}; S.v.tg[a.id] = !S.v.tg[a.id]; say(a.run?.(S, E, S.v.tg[a.id]) || ''); renderActs(); return; }
    if (a.choices) { const msg = ch.run ? ch.run(S, E) : ch.msg; if (ch.ok) { bag[a.id] = 1; S.v['pick:' + st.id] = ch.id; } say(msg); }
    else { const key = a.perSpot ? a.id + '@' + spot : a.id, was = bag[key] || 0, need = a.times || 1; bag[key] = Math.min(need, was + 1); say(a.run?.(S, E, bag[key], spot, was >= need) || ''); }
    checkStations(); renderActs();
  }
  function primaryAct() {
    if (!here) { goNext(); return; }
    const st = here.st;
    for (const a of st.acts) { if ((a.show && !a.show(S, V)) || a.choices || a.toggle) continue; if (a.go || !actDone(st, a, here.spot)) { doAct(st, a); return; } }
  }
  function checkStations() {
    let msg = '', ck = null;
    for (const st of D.stations) {
      if (S.done[st.id] || !ready(st)) continue;
      if (stationDone(st)) { S.done[st.id] = true; st.onDone?.(S, V, E); if (st.doneMsg) msg += st.doneMsg; const p = P(st); E.burst('spark', p.x, p.y, 14, {speed: 90, life: 1}); E.speak(st.cheer); ck = auto?.ride ? p : S.pos; }
    }
    if (msg) status.textContent = (status.textContent + msg).trim();
    const req = D.stations.filter((s) => !s.optional && !s.hidden);
    if (!fired && req.every((s) => S.done[s.id])) { fired = true; S.finished = true; status.textContent = (status.textContent + ' ' + D.finish).trim(); E.confetti(S.pos.x, S.pos.y - 8); E.speak(D.cheer || '탐험 성공이에요', 3.6); onAction(D.answer); onReady?.(); }
    // 마친 장소를 이어 갈 자리로 남기고 바로 저장한다(실려 가는 중이면 그 장소 자리)
    if (ck) { S.ck = {x: Math.round(ck.x), y: Math.round(ck.y)}; persist(); }
    if (msg) renderActs();
  }
  // ---------------------------------------------------------------- 입력
  const KEY = {ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down'};
  canvas.addEventListener('keydown', (e) => {
    const k = KEY[e.code] || KEY[e.key];
    if (k) { e.preventDefault(); keys.add(k); if (!auto?.ride) { auto = null; tapGoal = null; } return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (e.repeat) return; if (D.key?.(e.key, S, E)) return; primaryAct(); return; }
    if (e.code === 'KeyN') { e.preventDefault(); goNext(); }
  });
  canvas.addEventListener('keyup', (e) => { const k = KEY[e.code] || KEY[e.key]; if (k) keys.delete(k); });
  canvas.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect(), sx = (e.clientX - r.left) * VW / r.width, sy = (e.clientY - r.top) * VH / r.height;
    const m = hudBoxes.mini;
    if (m && sx >= m[0] && sx <= m[0] + m[2] && sy >= m[1] && sy <= m[1] + m[3]) { goTap({x: (sx - m[0] - 4) / m[4], y: (sy - m[1] - 4) / m[4]}); return; }
    goTap({x: sx + cam.x, y: sy + cam.y});
  });

  // ---------------------------------------------------------------- 움직임
  function update(dt) {
    D.update?.(S, E, dt);
    if (pendingRide) {
      const {target, o} = pendingRide; pendingRide = null;
      const tn = typeof target === 'string' ? N[target] : nearestNode({x: target[0], y: target[1]});
      const r = route(tn, tn);
      if (r) startAuto(r.pts, o.speed || 230, {ride: true, then: o.then, wind: o.wind}); else o.then?.();
    }
    let moving = false;
    if (auto) {
      let left = auto.speed * dt;
      while (left > 0 && auto) {
        const g = auto.pts[auto.i], d = hyp(S.pos.x, S.pos.y, g.x, g.y);
        if (Math.abs(g.x - S.pos.x) > 0.5) face = g.x > S.pos.x ? 1 : -1;
        if (d <= left) { S.pos.x = g.x; S.pos.y = g.y; left -= d; auto.i++; if (auto.i >= auto.pts.length) { const th = auto.then; if (auto.ride) rideEnd = true; auto = null; th?.(); } }
        else { S.pos.x += (g.x - S.pos.x) * left / d; S.pos.y += (g.y - S.pos.y) * left / d; left = 0; }
      }
      moving = true;
      if (auto?.wind && Math.random() < dt * 14) E.burst(auto.wind > 0 ? 'o2' : 'co2', S.pos.x + (Math.random() - 0.5) * 30, S.pos.y + (Math.random() - 0.5) * 30, 1, {speed: 20, life: 1.2});
    } else {
      let dx = 0, dy = 0;
      if (keys.has('left') || holdDir === 'left') dx -= 1; if (keys.has('right') || holdDir === 'right') dx += 1;
      if (keys.has('up') || holdDir === 'up') dy -= 1; if (keys.has('down') || holdDir === 'down') dy += 1;
      if (!dx && !dy && nudge) { dx = nudge.d === 'left' ? -1 : nudge.d === 'right' ? 1 : 0; dy = nudge.d === 'up' ? -1 : nudge.d === 'down' ? 1 : 0; }
      if (!dx && !dy && tapGoal) { const d = hyp(tapGoal.x, tapGoal.y, S.pos.x, S.pos.y); if (d < 5) tapGoal = null; else { dx = (tapGoal.x - S.pos.x) / d; dy = (tapGoal.y - S.pos.y) / d; } }
      const L = Math.hypot(dx, dy);
      let speed = D.speed || 175;
      const fl = D.flowSlow ? flowAt(S.pos) : null;
      if (fl && L && (dx * fl.x + dy * fl.y) / L < -0.3) { speed *= 0.45; if (T - bumpT > 3) { bumpT = T; say('혈액이 흐르는 방향과 반대라서 천천히 움직여요.'); } }
      const tv = L ? {x: dx / L * speed, y: dy / L * speed} : {x: 0, y: 0};
      const k = Math.min(1, dt * (L ? 10 : 7));
      vel.x += (tv.x - vel.x) * k; vel.y += (tv.y - vel.y) * k;
      const mv = Math.hypot(vel.x * dt, vel.y * dt);
      if (mv > 0.05) {
        moving = true;
        const n = Math.ceil(mv / 3), before = {x: S.pos.x, y: S.pos.y};
        for (let i = 0; i < n; i++) {
          const want = {x: S.pos.x + vel.x * dt / n, y: S.pos.y + vel.y * dt / n}, q = walk(want);
          if (hyp(q.x, q.y, want.x, want.y) > 0.6) { const e = lockedAt(want); if (e && T - bumpT > 2.5) { bumpT = T; say(e.msg || D.lockMsg || '아직 길이 닫혀 있어요. 지금 있는 곳에서 할 일을 먼저 해요.'); } }
          S.pos.x = q.x; S.pos.y = q.y;
        }
        if (Math.abs(vel.x) > 8) face = vel.x > 0 ? 1 : -1;
        if (nudge) { nudge.left -= hyp(S.pos.x, S.pos.y, before.x, before.y); if (nudge.left <= 0 || hyp(S.pos.x, S.pos.y, before.x, before.y) < 0.05) nudge = null; }
        if (tapGoal && hyp(S.pos.x, S.pos.y, before.x, before.y) < 0.05) tapGoal = null;
      }
    }
    if (moving && !RM && Math.random() < dt * 9) fx.push(D.trail ? {k: D.trail, x: S.pos.x - face * 8, y: S.pos.y + 14 + (Math.random() - 0.5) * 4, vx: -face * 8, vy: -6, t: 0, life: 0.8} : {k: 'bub', x: S.pos.x - face * 30, y: S.pos.y + (Math.random() - 0.5) * 8, vx: -face * 20, vy: -12, t: 0, life: 0.9});
    walking = moving;
    const h = auto?.ride ? null : nearStation(), key = h ? h.st.id + ':' + (h.spot ?? '') : '';
    if (key !== hereKey) {
      const prev = here, prevP = prev && P(prev.st, prev.spot || 0), stay = prev && h && hyp(S.pos.x, S.pos.y, prevP.x, prevP.y) <= prev.st.r;
      hereKey = key; here = h;
      if (h && !stay) {
        const st = h.st, info = typeof st.info === 'function' ? st.info(S, V) : st.info;
        const msg = st.spots && h.spot != null && spotDone(st, h.spot) && !S.done[st.id] ? (st.spotDone || '이곳은 다 했어요. 다음으로 빛나는 곳에 가 봐요.') : S.done[st.id] ? (st.again || info) : info;
        if (msg) say(rideEnd ? (status.textContent + ' ' + msg).trim() : msg);
      }
      rideEnd = false;
      renderActs();
    }
    checkT += dt;
    if (checkT > 0.25) { checkT = 0; checkStations(); }
    const lt = look && T < look.until ? look : null, tx = lt ? lt.x : S.pos.x, ty = lt ? lt.y : S.pos.y;
    const gx = clamp(tx - VW / 2, 0, Math.max(0, D.w - VW)), gy = clamp(ty - VH / 2, 0, Math.max(0, D.h - VH));
    const ck = RM ? 1 : Math.min(1, dt * (lt ? 3 : 6));
    cam.x += (gx - cam.x) * ck; cam.y += (gy - cam.y) * ck;
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i];
      p.t += dt;
      if (p.t < 0) continue;
      if (p.seek) { const k = clamp(p.t / p.dur, 0, 1), e = ease(k); p.x = lerp(p.sx, p.tx, e); p.y = lerp(p.sy, p.ty, e); if (k >= 1) { p.seek = false; p.sx = null; } }
      else if (p.k === 'ball' && !p.still) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (!p.hit && p.y >= p.hitY) { p.hit = true; p.y = p.hitY; p.vy = -330; p.vx = p.dir * 170; fx.push({k: 'ring', x: p.x, y: p.hitY + 10, t: 0, life: 0.7, r: 30}); } }
      else { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; p.vy = (p.vy || 0) + (p.g || 0) * dt; }
      if (p.t > p.life) fx.splice(i, 1);
    }
    if (fx.length > 420) fx.splice(0, fx.length - 420);
  }

  // ---------------------------------------------------------------- 그리기
  const hudBoxes = {};
  function layoutHud() {
    occupied = [];
    const sc = Math.min(112 / D.w, 88 / D.h), mw = D.w * sc + 8, mh = D.h * sc + 8;
    hudBoxes.mini = [8, 8, mw, mh, sc];
    const items = listItems(), title = listTitle();
    c.font = FONT(12, true);
    let w = c.measureText(title).width + 20;
    for (const it of items) w = Math.max(w, c.measureText(it.label).width + 38);
    hudBoxes.list = [VW - 8 - w, 8, w, 26 + items.length * 17, items, title];
    const bt = bannerText(); c.font = FONT(13, true);
    const bx = D.body ? 50 : 8;
    hudBoxes.banner = [bx, VH - 32, c.measureText(bt).width + 20, 24, bt];
    if (D.body) hudBoxes.body = [8, VH - 82, 38, 74];
    const extra = typeof D.hudBox === 'function' ? D.hudBox(S) : D.hudBox;
    hudBoxes.extra = extra ? (Array.isArray(extra[0]) ? extra : [extra]) : [];
    for (const b of [hudBoxes.mini, hudBoxes.list, hudBoxes.banner, hudBoxes.body, ...hudBoxes.extra]) if (b) occupied.push([b[0] - 2, b[1] - 2, b[0] + b[2] + 2, b[1] + b[3] + 2]);
  }
  function listItems() {
    const nx = nextStation();
    if (D.checklist) { const items = D.checklist(S, V).map(([label, done, opt]) => ({label, done, opt})); const cur = items.find((x) => !x.done && !x.opt); if (cur) cur.cur = true; return items; }
    return D.stations.filter((s) => !s.hidden).map((s) => ({label: s.short || s.name, done: !!S.done[s.id], cur: s === nx, opt: !!s.optional}));
  }
  const listTitle = () => (typeof D.listTitle === 'function' ? D.listTitle(S) : D.listTitle || '들를 곳');
  const bannerText = () => (here ? '지금 있는 곳: ' + here.st.name : D.travel || '캡슐로 이동하는 중이에요');
  function drawTubes() {
    const looks = D.looks || {}, L = (o) => looks[o.look || 'base'] || looks.base;
    const ex = (e) => e.hide || !(E.inView(e.a.x, e.a.y, e.r + 400) || E.inView(e.b.x, e.b.y, e.r + 400) || E.inView((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2, e.r + 400));
    for (const pass of [0, 1, 2]) {
      for (const e of edges) { if (ex(e)) continue; const lk = L(e), w = e.r * 2 + [13, 7, 0][pass]; line(c, [[e.a.x, e.a.y], [e.b.x, e.b.y]], pass === 0 ? lk.rim : pass === 1 ? lk.wall : (e.deco || open(e) ? lk.lumen : lk.dim), w); }
      for (const n of Object.values(N)) { if (!n.r || n.hide || !E.inView(n.x, n.y, n.r + 20)) continue; const lk = L(n); dot(c, n.x, n.y, n.r + [6.5, 3.5, 0][pass], pass === 0 ? lk.rim : pass === 1 ? lk.wall : (roomOpen(n) ? lk.lumen : lk.dim)); }
    }
    for (const e of edges) {
      if (e.deco || open(e) || e.valve === false || ex(e)) continue;
      const L2 = hyp(e.a.x, e.a.y, e.b.x, e.b.y) || 1, ux = (e.b.x - e.a.x) / L2, uy = (e.b.y - e.a.y) / L2, off = (e.a.r || 0) + 10, vx = e.a.x + ux * off, vy = e.a.y + uy * off;
      c.save(); c.translate(vx, vy); c.rotate(Math.atan2(uy, ux));
      oval(c, 0, 0, 7, e.r + 4, 0, D.valve || '#b4505f', 'rgba(60,10,20,.6)', 1.5);
      line(c, [[-3, -e.r * 0.6], [3, e.r * 0.6]], 'rgba(255,255,255,.55)', 1.5); line(c, [[3, -e.r * 0.6], [-3, e.r * 0.6]], 'rgba(255,255,255,.55)', 1.5);
      c.restore();
    }
  }
  const PD = {
    o2: (p) => dot(c, p.x, p.y, p.r || 4, '#8fd3ff', '#2a74b5', 1.2),
    co2: (p) => dot(c, p.x, p.y, p.r || 4, '#c1c7d1', '#5f6878', 1.2),
    nut: (p) => star(c, p.x, p.y, p.r || 6, '#ffd23f', '#9a7300'),
    water: (p) => drop(c, p.x, p.y, p.r || 4, '#6cc2ff'),
    saliva: (p) => drop(c, p.x, p.y, p.r || 3.5, '#bfe6ff'),
    juice: (p) => drop(c, p.x, p.y, p.r || 4, '#9ad66f'),
    waste: (p) => dot(c, p.x, p.y, p.r || 4, '#8a5a2b', '#4d300f', 1),
    urine: (p) => drop(c, p.x, p.y, p.r || 4, '#f2cf3a'),
    crumb: (p) => { c.fillStyle = p.col || '#fff3d6'; c.fillRect(p.x - 2.5, p.y - 2, 5, 4); },
    spark: (p) => star(c, p.x, p.y, (p.r || 5) * (1 - p.t / p.life * 0.5), '#fff6b0'),
    cell: (p) => dot(c, p.x, p.y, p.r || 5, '#e2443e', '#8a1d1d', 1),
    heat: (p) => { c.strokeStyle = 'rgba(255,140,60,.8)'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= 8; i++) { const yy = p.y - i * 3; c.lineTo(p.x + Math.sin(i * 0.9 + p.t * 6) * 3, yy); } c.stroke(); },
    bub: (p) => dot(c, p.x, p.y, 2.5 + p.t * 3, null, 'rgba(255,255,255,.6)', 1),
    snow: (p) => dot(c, p.x, p.y, 2 + p.t * 4, 'rgba(255,255,255,.7)', 'rgba(150,180,210,.5)', 0.8),
    mud: (p) => dot(c, p.x, p.y, 1.5 + p.t * 3, `rgba(110,90,60,${0.45 * (1 - p.t)})`),
    ring: (p) => dot(c, p.x, p.y, (p.r || 24) * (0.4 + p.t / p.life), null, `rgba(127,224,255,${1 - p.t / p.life})`, 3),
    ball: (p) => { dot(c, p.x, p.y, 10, '#ff9a3c', '#9a4a10', 1.5); dot(c, p.x - 3, p.y - 3, 3, 'rgba(255,255,255,.8)'); },
    confetti: (p) => { c.save(); c.translate(p.x, p.y); c.rotate(p.still ? p.a0 : p.a0 + p.t * 7); c.fillStyle = p.col || '#ffd54a'; c.fillRect(-3.5, -1.8, 7, 3.6); c.restore(); },
  };
  // 조종석 말풍선: 화면 좌표로 캡슐 위(안 되면 아래, 오른쪽, 왼쪽)에 그리고, 지도와 목록 같은 안내판은 가리지 않는다
  function drawBubble(ox, oy) {
    if (!bubble || T > bubble.until) return;
    c.font = FONT(13, true);
    const w = c.measureText(bubble.s).width + 20, h = 26, sx = S.pos.x - ox, sy = S.pos.y - oy;
    const tries = [[sx - w / 2, sy - 34 - h, 'down'], [sx - w / 2, sy + 30, 'up'], [sx + 38, sy - h / 2, 'left'], [sx - 38 - w, sy - h / 2, 'right']];
    let pick = tries.find(([x, y]) => fits(x, y, x + w, y + h));
    if (!pick) { const [x, y, d] = tries[0]; pick = [clamp(x, 6, VW - 6 - w), clamp(y, 6, VH - 6 - h), d]; }
    const [x, y, d] = pick, age = T - bubble.t0, pop = RM ? 1 : Math.min(1, 0.82 + age * 1.2);
    c.save(); c.globalAlpha = clamp((bubble.until - T) / 0.45, 0, 1);
    c.translate(x + w / 2, y + h / 2); c.scale(pop, pop); c.translate(-(x + w / 2), -(y + h / 2));
    rr(c, x, y, w, h, 12); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#245a86'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath();
    if (d === 'down') { c.moveTo(sx - 7, y + h - 1); c.lineTo(sx, y + h + 9); c.lineTo(sx + 7, y + h - 1); }
    else if (d === 'up') { c.moveTo(sx - 7, y + 1); c.lineTo(sx, y - 9); c.lineTo(sx + 7, y + 1); }
    else if (d === 'left') { c.moveTo(x + 1, y + h / 2 - 6); c.lineTo(x - 9, y + h / 2); c.lineTo(x + 1, y + h / 2 + 6); }
    else { c.moveTo(x + w - 1, y + h / 2 - 6); c.lineTo(x + w + 9, y + h / 2); c.lineTo(x + w - 1, y + h / 2 + 6); }
    c.closePath(); c.fill(); c.stroke();
    rr(c, x + 1.5, y + 1.5, w - 3, h - 3, 11); c.fillStyle = '#ffffff'; c.fill();
    txt(c, bubble.s, x + w / 2, y + 18, {size: 13, color: '#16324f', align: 'center'});
    c.restore();
  }
  function drawFx() {
    for (const p of fx) {
      if (p.t < 0 || !E.inView(p.x, p.y, 20)) continue;
      c.globalAlpha = clamp((p.life - p.t) / 0.4, 0, 1);
      PD[p.k]?.(p);
    }
    c.globalAlpha = 1;
  }
  function drawCapsule() {
    const bob = RM ? 0 : Math.sin(T * 3) * 1.6;
    c.save(); c.translate(S.pos.x, S.pos.y + bob); c.scale(face, 1);
    oval(c, 0, 0, 31, 22, 0, 'rgba(255,255,255,.2)');
    c.fillStyle = '#ff9d3c'; c.strokeStyle = '#8a4a12'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-19, -5); c.lineTo(-31, -14); c.lineTo(-27, 0); c.lineTo(-31, 13); c.lineTo(-19, 5); c.closePath(); c.fill(); c.stroke();
    const g = c.createLinearGradient(0, -15, 0, 15); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8fd0f5');
    oval(c, 0, 0, 23, 14.5, 0, g, '#245a86', 2);
    c.strokeStyle = '#ffcf4a'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 21, 12.5, 0, 0.62 * Math.PI, 0.95 * Math.PI); c.stroke();
    c.save(); c.beginPath(); c.arc(6, -2, 10.5, 0, TAU); c.clip();
    c.fillStyle = '#dff4ff'; c.fillRect(-6, -14, 24, 24);
    if (pilot) { const pw = pilot.width, ph = pilot.height, sh = ph * 0.6, dw = 25, dh = dw * sh / pw; c.imageSmoothingEnabled = false; c.drawImage(pilot, 0, 0, pw, sh, 6 - dw / 2, -2 - dh * 0.42, dw, dh); c.imageSmoothingEnabled = true; }
    else { dot(c, 6, 0, 6.5, '#f2c9a0', '#9a6a40', 1); c.fillStyle = '#4a3020'; c.beginPath(); c.arc(6, -2, 6.8, Math.PI, TAU); c.fill(); }
    c.restore();
    dot(c, 6, -2, 10.5, null, '#245a86', 2);
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(6, -2, 7.5, 3.7, 4.6); c.stroke();
    dot(c, 21, 3, 3, '#fff6b0', '#b08a10', 1);
    const sp = RM ? 1 : Math.abs(Math.sin(T * 26));
    oval(c, -25, 0, 2.5, 9 * sp + 1.5, 0, '#5b6b7d');
    c.restore();
  }
  function stationTarget(st) {
    let best = null, bd = Infinity;
    for (let i = 0; i < spotN(st); i++) { if (st.spots && spotDone(st, i)) continue; const p = P(st, i), d = hyp(p.x, p.y, S.pos.x, S.pos.y); if (d < bd) { bd = d; best = p; } }
    return best || P(st);
  }
  function drawTarget(nx) {
    if (!nx || auto?.ride || (here && here.st === nx && !nx.spots)) return null;
    const p = stationTarget(nx);
    const pulse = RM ? 0.5 : (Math.sin(T * 4) + 1) / 2;
    c.setLineDash([8, 6]); c.lineDashOffset = RM ? 0 : -T * 30;
    dot(c, p.x, p.y, 30 + pulse * 6, null, 'rgba(255,213,74,.9)', 3);
    c.setLineDash([]); c.lineDashOffset = 0;
    return p;
  }
  function pushStationLabels() {
    for (const st of D.stations) {
      if (st.hidden || st.nolab) continue;
      for (let i = 0; i < spotN(st); i++) {
        const p = P(st, i), o = st.lab || [0, -st.r * 0.75];
        if (st.spots && i > 0 && st.oneLab) break;
        labels.push([st.name, p.x + o[0], p.y + o[1], {size: 14, bg: S.done[st.id] ? 'rgba(214,247,224,.95)' : 'rgba(255,246,207,.95)', color: '#16324f', line: S.done[st.id] ? '#3fbf74' : '#d9a520'}]);
      }
    }
  }
  function fits(x0, y0, x1, y1) {
    if (x0 < 3 || y0 < 3 || x1 > VW - 3 || y1 > VH - 3) return false;
    for (const r of occupied) if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return false;
    return true;
  }
  function flushLabels(ox, oy) {
    for (const [s, x, y, o] of labels) {
      const size = o.size || 12, sx = x - ox, sy = y - oy;
      c.font = FONT(size, true);
      const w = c.measureText(s).width + 12, h = size + 8, x0 = o.align === 'left' ? sx - 6 : sx - w / 2, y0 = sy - size - 2;
      if (!fits(x0, y0, x0 + w, y0 + h)) continue;
      occupied.push([x0, y0, x0 + w, y0 + h]);
      rr(c, x0, y0, w, h, 6); c.fillStyle = o.bg || 'rgba(255,255,255,.92)'; c.fill();
      if (o.line) { c.strokeStyle = o.line; c.lineWidth = 1.5; c.stroke(); }
      txt(c, s, x0 + w / 2, y0 + size + 2, {size, color: o.color || INK, align: 'center'});
    }
    labels.length = 0;
  }
  function drawArrow(p) {
    if (!p) return;
    const sx = p.x - cam.x, sy = p.y - cam.y;
    if (sx > 30 && sx < VW - 30 && sy > 30 && sy < VH - 30) return;
    const cx = VW / 2, cy = VH / 2, dx = sx - cx, dy = sy - cy, k = Math.min((VW / 2 - 34) / Math.abs(dx || 1e-3), (VH / 2 - 34) / Math.abs(dy || 1e-3));
    const ax = cx + dx * k, ay = cy + dy * k, ang = Math.atan2(dy, dx), pulse = RM ? 0 : Math.sin(T * 5) * 3;
    dot(c, ax, ay, 15, 'rgba(20,30,50,.75)', '#ffd54a', 2);
    arrowHead(c, ax + Math.cos(ang) * pulse, ay + Math.sin(ang) * pulse, ang, 10, '#ffd54a');
  }
  function drawMini(nx) {
    const [x, y, w, h, sc] = hudBoxes.mini, ox = x + 4, oy = y + 4;
    panel(c, x, y, w, h, 'rgba(8,16,30,.82)');
    c.save(); c.beginPath(); c.rect(x + 1, y + 1, w - 2, h - 2); c.clip();
    if (D.mini) D.mini(c, ox, oy, sc, S, E);
    for (const e of edges) if (!e.hide) line(c, [[ox + e.a.x * sc, oy + e.a.y * sc], [ox + e.b.x * sc, oy + e.b.y * sc]], e.deco || open(e) ? (D.miniCol || 'rgba(255,190,180,.9)') : 'rgba(255,255,255,.22)', Math.max(1.6, e.r * 2 * sc));
    for (const n of Object.values(N)) if (n.r && !n.hide) dot(c, ox + n.x * sc, oy + n.y * sc, Math.max(2, n.r * sc), roomOpen(n) ? (D.miniCol || 'rgba(255,190,180,.9)') : 'rgba(255,255,255,.22)');
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.strokeRect(ox + cam.x * sc, oy + cam.y * sc, VW * sc, VH * sc);
    const blink = RM || Math.sin(T * 6) > 0;
    for (const st of D.stations) {
      if (st.hidden) continue;
      for (let i = 0; i < spotN(st); i++) { const p = P(st, i), done = S.done[st.id] || (st.spots && spotDone(st, i)); dot(c, ox + p.x * sc, oy + p.y * sc, 3, done ? '#5be08c' : st === nx ? (blink ? '#ffd54a' : '#9b7a10') : st.optional ? null : '#c4cfdd', st.optional && !done ? '#c4cfdd' : '#0b1626', 1); }
    }
    dot(c, ox + S.pos.x * sc, oy + S.pos.y * sc, 3.6, '#ffffff', '#ff7a2f', 1.8);
    c.restore();
  }
  function drawList() {
    const [x, y, w, h, items, title] = hudBoxes.list;
    panel(c, x, y, w, h);
    txt(c, title, x + 10, y + 17, {size: 12, color: '#ffe08a'});
    items.forEach((it, i) => { const yy = y + 26 + i * 17 + 9; check(c, x + 16, yy - 4, 5.5, it.done, it.cur, it.opt); txt(c, it.label, x + 28, yy, {size: 12, color: it.done ? '#bff5cf' : it.cur ? '#fff2b0' : '#d5deea'}); });
  }
  function drawBanner() {
    const [x, y, w, h, s] = hudBoxes.banner;
    panel(c, x, y, w, h, 'rgba(12,24,40,.86)');
    txt(c, s, x + 10, y + 17, {size: 13, color: '#ffffff'});
    if (!D.body) return;
    const [bx, by] = hudBoxes.body;
    panel(c, bx, by, 38, 74, 'rgba(12,24,40,.86)');
    c.fillStyle = 'rgba(255,224,200,.5)'; dot(c, bx + 19, by + 11, 6, 'rgba(255,224,200,.55)');
    rr(c, bx + 9, by + 19, 20, 28, 6); c.fill();
    c.fillRect(bx + 10, by + 46, 7, 24); c.fillRect(bx + 21, by + 46, 7, 24);
    c.fillRect(bx + 4, by + 21, 5, 22); c.fillRect(bx + 29, by + 21, 5, 22);
    const st = here?.st || D.stations.reduce((b, s) => { const p = P(s); const d = hyp(p.x, p.y, S.pos.x, S.pos.y); return !b || d < b.d ? {s, d} : b; }, null)?.s;
    if (st?.bp) { const px = bx + 4 + st.bp[0] * 30, py = by + 4 + st.bp[1] * 66; dot(c, px, py, RM ? 3.5 : 3 + Math.abs(Math.sin(T * 4)) * 1.5, '#ff4d4d', '#ffffff', 1.2); }
  }
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.fillStyle = D.bg; c.fillRect(0, 0, VW, VH);
    layoutHud();
    const nx = nextStation();
    const sx = shake && T < shake.until ? (Math.random() - 0.5) * shake.a : 0, sy = shake && T < shake.until ? (Math.random() - 0.5) * shake.a : 0;
    const ox = Math.round(cam.x) - sx, oy = Math.round(cam.y) - sy;
    pushStationLabels();
    c.save(); c.translate(-ox, -oy);
    if (D.blobs) { c.fillStyle = D.blobs.col; for (const [bx, by, br, k] of back) if (E.inView(bx, by, br)) { c.globalAlpha = 0.35 + k * 0.4; oval(c, bx, by, br * 1.3, br, k * 3, D.blobs.col); } c.globalAlpha = 1; }
    D.back?.(c, S, E);
    drawTubes();
    D.world?.(c, S, E);
    const tp = drawTarget(nx);
    drawFx();
    if (D.drawMover) D.drawMover(c, {x: S.pos.x, y: S.pos.y, face, t: T, RM, pilot, moving: walking}); else drawCapsule();
    D.front?.(c, S, E);
    c.restore();
    flushLabels(ox, oy);
    drawArrow(tp);
    drawMini(nx); drawList(); drawBanner();
    D.hud?.(c, S, E, hudBoxes);
    drawBubble(ox, oy);
  }
  function frame(now) {
    if (!alive) return;
    dtNow = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; T += dtNow;
    update(dtNow); draw();
    raf = requestAnimationFrame(frame);
  }
  // 이어 가기: 마지막으로 마친 장소에 캡슐을 두고, 그 장소의 할 일 줄을 바로 보여 준다(첫 장면 안내 대신 이어 가기 안내).
  if (resumed) { here = nearStation(); hereKey = here ? here.st.id + ':' + (here.spot ?? '') : ''; }
  renderActs();
  say(fired ? (D.again || '탐험을 모두 마쳤어요. 다시 둘러봐도 괜찮아요.') : resumed ? '지난번에 마친 곳에서 이어서 탐험해요. 마친 곳에는 초록색 표시가 있어요.' : D.intro);
  if (fired) { later(onReady); if (!others?.[mission?.id]?.done?.[task.id]) later(() => onAction(D.answer)); }
  // 자동 점검 도구(tools/harness)가 장면 상태를 읽는 통로. 화면에는 나타나지 않는다.
  node.voyState = () => ({mode, done: {...S.done}, acts: JSON.parse(JSON.stringify(S.acts)), here: here?.st.id || null, spot: here?.spot ?? null, pos: {x: Math.round(S.pos.x), y: Math.round(S.pos.y)}, auto: !!auto, ck: S.ck || null, resumed, finished: !!S.finished});
  raf = requestAnimationFrame(frame);
  // 떠날 때 저장을 기다리던 것이 있으면 버리지 않고 바로 저장한다.
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); if (saveT) persist(); }};
}

// ================================================================ 골격 모형 속 탐험(R5-G01): 머리뼈, 갈비뼈, 척추뼈, 팔뼈와 관절, 다리뼈와 관절
function drawSkeleton(c, S, E) {
  const cx = 500, bend = E.wave('bend', 2.6), elbow = E.wave('elbow', 2.8), stand = E.wave('stand', 2.8), skull = E.tw('skull', S.v.skull ? 1 : 0, 3);
  const sx = (y) => cx + Math.sin(clamp((y - 285) / 470, 0, 1) * Math.PI) * bend * 40;
  const BC = '#f4ecd6', ED = '#8a7a58', HI = '#ffe28a';
  oval(c, cx, 1262, 330, 28, 0, 'rgba(127,214,255,.12)', 'rgba(127,214,255,.35)', 2);
  // 가슴 속 심장과 폐(갈비뼈 뒤)
  const inner = S.done.ribs || E.since('ribball') < 99 ? 1 : 0.5;
  c.globalAlpha = inner;
  oval(c, sx(440) - 50, 440, 46, 76, 0.08, '#f3a6b3', '#b8606f', 2); oval(c, sx(440) + 50, 440, 46, 76, -0.08, '#f3a6b3', '#b8606f', 2);
  heartPath(c, sx(455) + 12, 458, 24); c.fillStyle = '#d9414f'; c.fill(); c.strokeStyle = '#8a1d2a'; c.lineWidth = 1.5; c.stroke();
  c.globalAlpha = 1;
  if (inner > 0.9) { E.lab('폐', sx(440) - 74, 520); E.lab('심장', sx(455) + 40, 500); }
  // 척추뼈(작은 뼈가 기둥처럼 이어짐)
  const lit = E.since('spine'), sweep = lit < 99 ? Math.min(18, Math.floor(lit / 0.11)) : S.done.spine ? 18 : 0;
  for (let i = 0; i < 18; i++) { const y = 288 + i * 26, x = sx(y + 10), w = 28 + i * 0.7; rr(c, x - w / 2, y, w, 20, 5); c.fillStyle = i < sweep ? HI : BC; c.fill(); c.strokeStyle = ED; c.lineWidth = 1.5; c.stroke(); }
  for (let i = 0; i < 3; i++) { const y = 246 + i * 13; rr(c, cx - 11, y, 22, 10, 3); c.fillStyle = BC; c.fill(); c.strokeStyle = ED; c.stroke(); }
  // 갈비뼈(여러 개가 활 모양)
  const rc = E.since('ribs'), ribHi = rc < 99 ? Math.min(6, Math.floor(rc / 0.32) + 1) : S.done.ribs ? 6 : 0;
  for (let i = 0; i < 6; i++) {
    const y = 330 + i * 30, w = 122 - Math.abs(i - 2) * 8, x = sx(y);
    c.strokeStyle = ED; c.lineWidth = 9; c.beginPath(); c.ellipse(x, y, w, 30, 0, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
    c.strokeStyle = i < ribHi ? HI : BC; c.lineWidth = 6; c.beginPath(); c.ellipse(x, y, w, 30, 0, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
  }
  rr(c, sx(400) - 8, 318, 16, 150, 6); c.fillStyle = BC; c.fill(); c.strokeStyle = ED; c.lineWidth = 1.5; c.stroke();
  bone(c, sx(300) - 12, 300, 372, 296, 9); bone(c, sx(300) + 12, 300, 628, 296, 9);
  // 머리뼈(동그란 모양)
  c.fillStyle = BC; c.strokeStyle = ED; c.lineWidth = 2.5;
  rr(c, cx - 44, 190, 88, 56, 18); c.fill(); c.stroke();
  oval(c, cx, 150, 74, 84, 0, BC, ED, 2.5);
  if (skull > 0.01) { c.globalAlpha = skull; oval(c, cx, 132, 58, 58, 0, 'rgba(255,190,200,.85)', 'rgba(200,90,110,.8)', 1.5); c.setLineDash([6, 5]); dot(c, cx, 150, 92, null, '#7fe0ff', 2.5); c.setLineDash([]); c.globalAlpha = 1; if (skull > 0.6) E.lab('머릿속', cx, 140, {size: 12}); }
  oval(c, cx - 26, 172, 16, 14, 0, '#4a3d2a'); oval(c, cx + 26, 172, 16, 14, 0, '#4a3d2a');
  c.fillStyle = '#4a3d2a'; c.beginPath(); c.moveTo(cx, 188); c.lineTo(cx + 8, 206); c.lineTo(cx - 8, 206); c.closePath(); c.fill();
  for (let i = -3; i <= 3; i++) { c.fillStyle = '#fffaf0'; c.fillRect(cx + i * 10 - 4, 220, 8, 11); c.strokeStyle = ED; c.lineWidth = 1; c.strokeRect(cx + i * 10 - 4, 220, 8, 11); }
  // 팔뼈와 팔꿈치 관절
  const armC = S.v.arm ? HI : BC;
  bone(c, 365, 305, 345, 525, 18); bone(c, 345, 525, 330, 735, 14);
  bone(c, 635, 305, 660, 525, 18, armC);
  const a = (90 - 105 * elbow) * Math.PI / 180, wx = 660 + Math.cos(a) * 210, wy = 525 + Math.sin(a) * 210;
  bone(c, 660, 525, wx, wy, 14, armC);
  for (const [hx, hy, ang] of [[330, 735, Math.PI / 2], [wx, wy, a]]) for (let f = -2; f <= 2; f++) line(c, [[hx, hy], [hx + Math.cos(ang + f * 0.22) * 34, hy + Math.sin(ang + f * 0.22) * 34]], ED, 5);
  // 골반과 다리뼈, 무릎 관절
  oval(c, 448, 805, 62, 40, -0.35, BC, ED, 2); oval(c, 552, 805, 62, 40, 0.35, BC, ED, 2);
  const legC = S.v.leg ? HI : BC;
  for (const s of [-1, 1]) { bone(c, cx + s * 47, 838, cx + s * 55, 1055, 26, legC); bone(c, cx + s * 55, 1055, cx + s * 53, 1240, 20, legC); oval(c, cx + s * 70, 1252, 26, 10, 0, BC, ED, 2); }
  // 관절(뼈와 뼈가 이어진 곳)
  const glow = (x, y, on) => { if (!on) return; dot(c, x, y, 13 + (E.RM ? 0 : Math.sin(E.t * 4) * 2), 'rgba(255,214,90,.45)', '#ffd54a', 2); };
  glow(635, 305, S.done.arm); glow(660, 525, S.acts.arm?.joint || elbow > 0); glow(365, 305, S.done.arm); glow(345, 525, S.done.arm);
  glow(cx - 47, 838, S.done.leg); glow(cx + 47, 838, S.done.leg); glow(cx - 55, 1055, S.acts.leg?.look || S.done.leg); glow(cx + 55, 1055, S.acts.leg?.look || S.done.leg);
  if (S.v.arm) { E.lab('위팔뼈', 700, 420, {size: 12}); E.lab('아래팔뼈', wx + 40, (525 + wy) / 2 + 10, {size: 12}); }
  if (S.acts.arm?.joint) E.lab('팔꿈치 관절', 735, 548, {size: 12});
  if (S.acts.leg?.look) E.lab('무릎 관절', 640, 1072, {size: 12});
  if (stand > 0.01) { c.globalAlpha = stand; for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const y = 1220 - ((E.t * 120 + k * 90) % 360); arrowHead(c, cx + s * 54, y, -Math.PI / 2, 12, '#ffd54a'); } c.globalAlpha = 1; }
}
const SKEL_MINI = (c, ox, oy, sc) => {
  const P2 = (x, y) => [ox + x * sc, oy + y * sc];
  c.fillStyle = 'rgba(244,236,214,.9)'; c.beginPath(); c.arc(...P2(500, 155), 80 * sc, 0, TAU); c.fill();
  line(c, [P2(500, 240), P2(500, 760)], 'rgba(244,236,214,.9)', 3);
  for (let i = 0; i < 3; i++) { c.strokeStyle = 'rgba(244,236,214,.8)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(...P2(500, 340 + i * 60), 110 * sc, 26 * sc, 0, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke(); }
  for (const s of [-1, 1]) { line(c, [P2(500 + s * 135, 300), P2(500 + s * 160, 525), P2(500 + s * 168, 735)], 'rgba(244,236,214,.8)', 2); line(c, [P2(500 + s * 47, 838), P2(500 + s * 55, 1055), P2(500 + s * 53, 1240)], 'rgba(244,236,214,.8)', 2.5); }
};

const ARM_MINI = (c, ox, oy, sc, S, E) => {
  const P2 = (x, y) => [ox + x * sc, oy + y * sc], th = (E.A.th ?? S.v.th ?? 0) * Math.PI / 180;
  line(c, [P2(60, 380), P2(800, 380)], 'rgba(246,205,180,.55)', 330 * sc);
  line(c, [P2(150, 380), P2(800, 380)], 'rgba(244,236,214,.95)', 3);
  line(c, [P2(800, 380), P2(800 + Math.cos(th) * 300, 380 - Math.sin(th) * 300)], 'rgba(244,236,214,.95)', 3);
};
const BODY_MINI = (c, ox, oy, sc) => {
  const P2 = (x, y) => [ox + x * sc, oy + y * sc];
  c.fillStyle = 'rgba(242,211,191,.45)'; c.beginPath(); c.arc(...P2(500, 82), 62 * sc, 0, TAU); c.fill();
  rr(c, ...P2(285, 140), 430 * sc, 470 * sc, 6); c.fill();
  for (const s of [-1, 1]) { rr(c, ...P2(500 + s * 80 - 65, 590), 130 * sc, 290 * sc, 3); c.fill(); }
};
const DIARY_MINI = (c, ox, oy, sc) => {
  const P2 = (x, y) => [ox + x * sc, oy + y * sc];
  c.fillStyle = 'rgba(242,211,191,.5)'; c.beginPath(); c.arc(...P2(500, 100), 72 * sc, 0, TAU); c.fill();
  rr(c, ...P2(290, 190), 420 * sc, 590 * sc, 8); c.fill();
  oval(c, ...P2(585, 545), 92 * sc, 62 * sc, 0.25, 'rgba(240,176,122,.9)');
};
// ================================================================ 위팔 속 탐험(R5-G01): 근육이 짧아지며 아래팔뼈를 당긴다
const ARM = {E: {x: 800, y: 380}, Ain: {x: 210, y: 335}, Aout: {x: 210, y: 425}};
function armPts(th, attach) {
  const r = th * Math.PI / 180, R = (x, y) => ({x: ARM.E.x + x * Math.cos(r) + y * Math.sin(r), y: ARM.E.y - x * Math.sin(r) + y * Math.cos(r)});
  const Pin = attach === 'upper' ? {x: 700, y: 352} : R(70, -22), Pout = R(-30, 26);
  return {R, Pin, Pout, Lin: hyp(Pin.x, Pin.y, ARM.Ain.x, ARM.Ain.y), Lout: hyp(Pout.x, Pout.y, ARM.Aout.x, ARM.Aout.y)};
}
function muscle(c, A, P, side, thick, col, edge) {
  const dx = P.x - A.x, dy = P.y - A.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = uy * side, ny = -ux * side;
  line(c, [[A.x, A.y], [A.x + dx * 0.14, A.y + dy * 0.14]], '#f6f1e3', 7); line(c, [[A.x + dx * 0.8, A.y + dy * 0.8], [P.x, P.y]], '#f6f1e3', 6);
  const t0 = 0.12, t1 = 0.82, n = 20, pt = (i, s) => { const k = t0 + (t1 - t0) * i / n, b = Math.sin(Math.PI * i / n); return [A.x + dx * k + nx * b * thick * s, A.y + dy * k + ny * b * thick * s]; };
  c.beginPath(); for (let i = 0; i <= n; i++) c.lineTo(...pt(i, 1)); for (let i = n; i >= 0; i--) c.lineTo(...pt(i, -0.2)); c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = edge; c.lineWidth = 2; c.stroke();
  c.strokeStyle = 'rgba(255,220,210,.45)'; c.lineWidth = 1.2;
  for (const s of [0.25, 0.5, 0.75]) { c.beginPath(); for (let i = 2; i <= n - 2; i++) c.lineTo(...pt(i, s)); c.stroke(); }
  dot(c, A.x, A.y, 4.5, '#ffffff', '#6b5a3a', 1.5); dot(c, P.x, P.y, 4.5, '#ffffff', '#6b5a3a', 1.5);
}
function drawArm(c, S, E) {
  const th = E.tw('th', S.v.th || 0, 3), con = E.wave('contract', 1.8), nop = E.wave('nopush', 1.2), ap = armPts(th, S.v.attach), f = ap.R(300, 0), hand = ap.R(338, 0);
  // 살갗
  line(c, [[60, 380], [800, 380]], '#e9b394', 342); line(c, [[800, 380], [f.x, f.y]], '#e9b394', 262); dot(c, 800, 380, 171, '#e9b394');
  line(c, [[60, 380], [800, 380]], '#f6cdb4', 330); line(c, [[800, 380], [f.x, f.y]], '#f6cdb4', 250); dot(c, 800, 380, 165, '#f6cdb4');
  dot(c, hand.x, hand.y, 58, '#f6cdb4', '#e0a586', 2);
  // 뼈
  dot(c, 120, 380, 36, '#efe3c4', '#8a7a58', 2);
  bone(c, 150, 380, 790, 380, 40, '#efe3c4');
  bone(c, 800, 380, f.x, f.y, 32, '#efe3c4');
  const jl = S.v.joint ? 1 : 0;
  dot(c, 800, 380, 28, jl ? '#ffe28a' : '#e6d6ad', '#8a7a58', 2.5);
  if (jl) dot(c, 800, 380, 36 + (E.RM ? 0 : Math.sin(E.t * 4) * 3), null, '#ffd54a', 3);
  // 근육(짧아지면 굵어진다)
  const kin = clamp((661 - ap.Lin) / (661 - 556), 0, 1), kout = clamp((622 - ap.Lout) / (622 - 560), 0, 1);
  const tin = S.v.attach === 'upper' ? 46 + 16 * con : 36 + 26 * kin, tout = 32 + 22 * kout;
  muscle(c, ARM.Ain, ap.Pin, 1, tin, '#d24b44', '#7a1f1c');
  muscle(c, ARM.Aout, ap.Pout, -1, tout, '#c4544a', '#7a1f1c');
  if (con > 0.05 && S.v.attach === 'upper') for (let i = 0; i < 3; i++) arrowHead(c, 470 + i * 30 + con * 10, 300, 0, 7, 'rgba(255,255,255,.8)');
  if (nop > 0.05) E.lab('?', 760, 250, {size: 22, bg: 'rgba(255,255,255,.9)'});
  // 손
  for (let k = -2; k <= 2; k++) { const a = Math.atan2(hand.y - f.y, hand.x - f.x) + k * 0.25; line(c, [[hand.x, hand.y], [hand.x + Math.cos(a) * 42, hand.y + Math.sin(a) * 42]], '#efe3c4', 7); }
  E.lab('아래팔뼈', (800 + f.x) / 2 + 22, (380 + f.y) / 2 + 30, {size: 12});
  if (E.here === 'attach' || S.v.attach === 'upper') E.lab(S.v.attach === 'upper' ? '근육 끝이 위팔뼈에 붙음' : '근육 끝이 아래팔뼈에 붙음', ap.Pin.x + 20, ap.Pin.y - 34, {size: 11, bg: 'rgba(255,255,255,.85)'});
}

// ================================================================ 소화 여행(R5-G02): 입, 식도, 위, 작은창자, 큰창자, 항문
const DIG_ROUTE = ['lips', 'mouth', 'throat', 'eso1', 'eso2', 'cardia', 'stom', 'stom2', 'pylor', 'si0', 'sp1', 'si1', 'si2', 'sp2', 'si3', 'si4', 'sp3', 'si5', 'li0', 'li1', 'sp4', 'li3', 'li4', 'anus'];
const FOOD_WORD = ['큰 덩어리예요', '잘게 부서졌어요', '침과 섞여 뭉쳤어요', '더 잘게 쪼개졌어요', '영양소와 물이 빠졌어요', '단단한 찌꺼기예요', '몸 밖으로 나갔어요'];
function foodStage(S) { if (S.v.out) return 6; if (S.done.large) return 5; if (S.done.small) return 4; if (S.done.stomach) return 3; if (S.acts.mouth?.mix) return 2; return (S.acts.mouth?.chew || 0) ? 1 : 0; }
function drawFood(c, x, y, S, k = 1, t = 0) {
  const st = foodStage(S), n = S.acts.mouth?.chew || 0;
  if (st === 6) return;
  if (st <= 1 && !S.acts.mouth?.mix) {
    const cnt = [3, 6, 10, 16][n], sz = [20, 12, 8.5, 6][n] * k;
    for (let i = 0; i < cnt; i++) {
      const a = i * 2.4, r = (cnt > 3 ? 7 + i * 1.3 : 13) * k, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.62, kind = i % 3;
      if (kind === 0) { oval(c, px, py, sz * 0.62, sz * 0.5, 0, '#fffaf0', 'rgba(110,90,60,.7)', 1); for (let g = 0; g < 3; g++) oval(c, px - sz * 0.25 + g * sz * 0.25, py - sz * 0.05 * (g - 1), sz * 0.12, sz * 0.07, 0.6, '#efe2c4'); }
      else if (kind === 1) { dot(c, px, py - sz * 0.15, sz * 0.42, '#5aa83c', 'rgba(40,80,30,.7)', 1); c.fillStyle = '#9ccf6a'; c.fillRect(px - sz * 0.1, py, sz * 0.2, sz * 0.38); }
      else { rr(c, px - sz * 0.38, py - sz * 0.3, sz * 0.76, sz * 0.6, sz * 0.15); c.fillStyle = '#f08a3c'; c.fill(); c.strokeStyle = 'rgba(120,60,20,.7)'; c.lineWidth = 1; c.stroke(); }
    }
    return;
  }
  if (st === 2) { oval(c, x, y, 17 * k, 14 * k, 0, '#f3dcae', '#a07a3a', 1.5); for (let i = 0; i < 7; i++) dot(c, x + Math.cos(i * 2.2) * 8 * k, y + Math.sin(i * 2.2) * 6 * k, 2 * k, ['#7cc35a', '#f08a3c', '#fff7e6'][i % 3]); oval(c, x - 5 * k, y - 6 * k, 5 * k, 2.5 * k, -0.4, 'rgba(255,255,255,.75)'); return; }
  if (st === 3) { c.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = (18 + Math.sin(i * 1.7 + t * 3) * 3) * k; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8); } c.closePath(); c.fillStyle = '#e9b867'; c.fill(); c.strokeStyle = '#9a6a24'; c.lineWidth = 1.5; c.stroke(); for (let i = 0; i < 9; i++) dot(c, x + Math.cos(i * 1.9) * 10 * k, y + Math.sin(i * 1.9) * 7 * k, 1.6 * k, '#fff2c8'); return; }
  if (st === 4) { oval(c, x, y, 15 * k, 12 * k, 0, '#a8763d', '#5e3d17', 1.5); oval(c, x - 4 * k, y - 4 * k, 4 * k, 2 * k, -0.4, 'rgba(160,210,255,.7)'); return; }
  oval(c, x, y, 12 * k, 9 * k, 0.2, '#7a4d22', '#3e2510', 1.5);
}
function drawDigest(c, S, E) {
  const t = E.t, R = E.A.R;
  const chew = E.wave('chew', 0.5), eso = E.since('eso'), churn = E.wave('churn', 2.4);
  // 입: 이와 혀, 입술
  for (let i = 0; i < 9; i++) { const a = Math.PI * (1.18 + i * 0.08), x = 330 + Math.cos(a) * 88, y = 215 + Math.sin(a) * 88 + chew * 12; rr(c, x - 8, y - 9, 16, 18, 5); c.fillStyle = '#fffaf0'; c.fill(); c.strokeStyle = '#b9ad94'; c.lineWidth = 1.2; c.stroke(); }
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.18 + i * 0.08), x = 330 + Math.cos(a) * 88, y = 215 + Math.sin(a) * 88 - chew * 12; rr(c, x - 8, y - 9, 16, 18, 5); c.fillStyle = '#fffaf0'; c.fill(); c.strokeStyle = '#b9ad94'; c.lineWidth = 1.2; c.stroke(); }
  const tongue = E.wave('mix', 1.6);
  oval(c, 330, 262 - tongue * 6, 72, 22, Math.sin(t * 6) * tongue * 0.08, '#e9737e', '#a8404c', 2);
  oval(c, 128, 182, 30, 14, 0, '#e0707a', '#9a3b46', 2); oval(c, 128, 248, 30, 14, 0, '#e0707a', '#9a3b46', 2);
  E.lab('이', 250, 128, {size: 12}); E.lab('혀', 330, 300, {size: 12});
  if (E.since('mix') < 3) E.lab('침', 410, 170, {size: 12, bg: 'rgba(214,240,255,.95)'});
  // 식도의 꿈틀 운동
  if (eso < 2.2) { const k = clamp(eso / 2.2, 0, 1), y = lerp(345, 720, E.RM ? 0.5 : k); for (const s of [-1, 1]) oval(c, 330 + s * 25, y, 8, 18, 0, 'rgba(150,50,50,.55)'); }
  // 위: 주름과 꿈틀거림
  const st1 = E.N.stom, st2 = E.N.stom2;
  c.save(); c.beginPath(); c.arc(st1.x, st1.y, st1.r, 0, TAU); c.moveTo(st2.x + st2.r, st2.y); c.arc(st2.x, st2.y, st2.r, 0, TAU); c.clip();
  c.strokeStyle = 'rgba(190,90,80,.45)'; c.lineWidth = 3;
  for (let i = 0; i < 7; i++) { c.beginPath(); for (let k = 0; k <= 14; k++) { const x = 450 + k * 22, y = 760 + i * 30 + Math.sin(k * 0.9 + i + churn * t * 8) * (4 + churn * 6); c.lineTo(x, y); } c.stroke(); }
  c.restore();
  if (churn > 0.05) { dot(c, 560, 845, 108 + churn * 6, null, 'rgba(160,60,60,.35)', 4); }
  // 작은창자 벽의 작은 돌기와 흡수하는 곳, 혈관
  const vill = (e) => { const L = hyp(e.a.x, e.a.y, e.b.x, e.b.y), ux = (e.b.x - e.a.x) / L, uy = (e.b.y - e.a.y) / L; for (let d = 8; d < L - 8; d += 13) for (const s of [-1, 1]) { const bx = e.a.x + ux * d - uy * s * e.r, by = e.a.y + uy * d + ux * s * e.r; dot(c, bx + uy * s * 4, by - ux * s * 4, 4, '#f3b3a4'); } };
  for (const e of E.edges) if (e.look === 'small' && E.inView((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2, 500)) vill(e);
  const spots = [['sp1', 1076, 0, 120], ['sp2', 1186, 1, 150], ['sp3', 1296, 2, 150]];
  for (const [id, vy, i, hl] of spots) {
    const n = E.N[id];
    line(c, [[n.x - hl, vy], [n.x + hl, vy]], '#b0283a', 9); line(c, [[n.x - hl, vy], [n.x + hl, vy]], '#e24d5c', 5);
    for (const s of [-1, 1]) arrowHead(c, n.x + s * (hl + 8), vy, s > 0 ? 0 : Math.PI, 7, '#e24d5c');
    if (!S.acts.small?.['absorb@' + i]) dot(c, n.x, n.y + 21, 9 + (E.RM ? 0 : Math.sin(t * 5) * 2), 'rgba(255,230,90,.65)', '#e0a800', 2);
    E.lab('혈관', n.x + 112, vy + 18, {size: 11, bg: 'rgba(255,226,230,.95)'});
  }
  // 큰창자 마디
  for (const e of E.edges) if (e.look === 'large' && E.inView((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2, 400)) { const L = hyp(e.a.x, e.a.y, e.b.x, e.b.y), ux = (e.b.x - e.a.x) / L, uy = (e.b.y - e.a.y) / L; for (let d = 20; d < L - 10; d += 42) { const mx = e.a.x + ux * d, my = e.a.y + uy * d; c.strokeStyle = 'rgba(150,95,50,.45)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(mx - uy * e.r, my + ux * e.r); c.lineTo(mx + uy * e.r, my - ux * e.r); c.stroke(); } }
  if (!S.acts.large?.water) { const n = E.N.sp4; dot(c, n.x, n.y + 31, 9 + (E.RM ? 0 : Math.sin(t * 5) * 2), 'rgba(140,200,255,.6)', '#3d8fd6', 2); }
  // 항문
  dot(c, 270, 1650, 18, null, '#9a5a3a', 5);
  // 관찰 창: 간, 쓸개, 이자(음식물은 지나가지 않는다)
  const w = E.N.wglass;
  c.save(); c.beginPath(); c.arc(w.x, w.y, w.r, 0, TAU); c.clip();
  c.fillStyle = '#c0e2f5'; c.fillRect(w.x - w.r, w.y - w.r, w.r * 2, w.r * 2);
  oval(c, w.x - 12, w.y - 18, 46, 24, -0.2, '#8e3b33', '#5a1f1a', 1.5);
  oval(c, w.x + 6, w.y + 6, 9, 13, 0.4, '#5f9b3a', '#355a1e', 1.2);
  oval(c, w.x + 10, w.y + 34, 34, 9, -0.15, '#f1d48a', '#a98a3a', 1.2);
  c.restore();
  c.setLineDash([5, 4]); dot(c, w.x, w.y, w.r + 2, null, '#4a90c0', 2.5); c.setLineDash([]);
  if (E.here === 'liver' || S.done.liver) { E.lab('간', w.x - 34, w.y - 34, {size: 11}); E.lab('쓸개', w.x + 30, w.y + 4, {size: 11}); E.lab('이자', w.x - 28, w.y + 40, {size: 11}); }
  // 음식물
  if (R && S.foodS != null && foodStage(S) < 6) {
    let p = E.routePt(R, S.foodS);
    if (S.foodS <= R.acc[1] + 1) p = {x: 330, y: 240};
    const inSt = S.foodS >= R.acc[6] - 1 && S.foodS <= R.acc[8];
    if (inSt && churn > 0) p = {x: p.x + Math.sin(t * 5) * 14 * churn, y: p.y + Math.cos(t * 4) * 10 * churn};
    E.A.food = p;
    drawFood(c, p.x, p.y, S, 1, t);
  }
}
const DIG_HUD = [540, 268, 172, 104];
function digestHud(c, S, E) {
  const [x, y, w, h] = DIG_HUD;
  panel(c, x, y, w, h);
  txt(c, '음식물 모습', x + 10, y + 18, {size: 12, color: '#ffe08a'});
  dot(c, x + 42, y + 58, 26, 'rgba(255,240,225,.95)', '#d6a57c', 2);
  c.save(); c.beginPath(); c.arc(x + 42, y + 58, 25, 0, TAU); c.clip(); drawFood(c, x + 42, y + 58, S, 1.15, E.t); c.restore();
  const st = foodStage(S), parts = [];
  c.font = FONT(12, true);
  for (const wd of FOOD_WORD[st].split(' ')) { const tl = parts.length ? parts[parts.length - 1] + ' ' + wd : wd; if (parts.length && c.measureText(tl).width <= w - 84) parts[parts.length - 1] = tl; else parts.push(wd); }
  parts.slice(0, 2).forEach((s, i) => txt(c, s, x + 76, y + 52 + i * 17, {size: 12, color: '#ffffff'}));
  txt(c, '모형', x + 76, y + 92, {size: 11, bold: false, color: '#aebdd3'});
}

// ================================================================ 숨 여행(R5-G02): 몸 밖, 코, 숨관, 숨관가지, 폐, 다시 몸 밖
function breathBack(c, S, E) {
  // 얼굴의 코(관 뒤에 그린다)
  const ns = E.N.nose;
  c.fillStyle = '#f4c3a8'; c.strokeStyle = '#b07a5a'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(ns.x + 150, ns.y - 165); c.lineTo(ns.x - 30, ns.y - 165); c.quadraticCurveTo(ns.x - 40, ns.y - 90, ns.x - 125, ns.y - 10); c.quadraticCurveTo(ns.x - 140, ns.y + 22, ns.x - 96, ns.y + 34); c.quadraticCurveTo(ns.x - 70, ns.y + 52, ns.x - 82, ns.y + 78); c.quadraticCurveTo(ns.x - 70, ns.y + 100, ns.x - 88, ns.y + 118); c.lineTo(ns.x - 70, ns.y + 160); c.lineTo(ns.x + 150, ns.y + 160); c.closePath(); c.fill(); c.stroke();
  oval(c, ns.x - 70, ns.y - 92, 12, 6, 0, '#3a2a20');
}
function drawBreath(c, S, E) {
  const t = E.t, ch = E.tw('chest', S.v.chest || 0, 1.6);
  // 몸 밖 하늘과 산소
  const air = E.N.air;
  c.save(); c.beginPath(); c.arc(air.x, air.y, air.r, 0, TAU); c.clip();
  const g = c.createLinearGradient(0, air.y - air.r, 0, air.y + air.r); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#eaf7ff'); c.fillStyle = g; c.fillRect(air.x - air.r, air.y - air.r, air.r * 2, air.r * 2);
  oval(c, air.x - 30, air.y - 40, 26, 11, 0, '#ffffff'); oval(c, air.x + 22, air.y + 40, 30, 12, 0, '#ffffff');
  for (let i = 0; i < 9; i++) { const a = i * 0.7 + (E.RM ? 0 : t * 0.4), r = 30 + (i % 3) * 18; dot(c, air.x + Math.cos(a) * r, air.y + Math.sin(a) * r * 0.8, 4, '#8fd3ff', '#2a74b5', 1.2); }
  c.restore();
  // 콧속 털
  const ns = E.N.nose;
  for (let i = 0; i < 5; i++) line(c, [[ns.x - 50 + i * 8, ns.y + 28], [ns.x - 46 + i * 8, ns.y + 16]], '#8a5a3a', 1.5);
  // 숨관과 숨관가지의 고리
  for (const e of E.edges) if (e.rings) { const L = hyp(e.a.x, e.a.y, e.b.x, e.b.y), ux = (e.b.x - e.a.x) / L, uy = (e.b.y - e.a.y) / L; for (let d = 14; d < L - 6; d += 22) { const mx = e.a.x + ux * d, my = e.a.y + uy * d; c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(mx - uy * (e.r + 1), my + ux * (e.r + 1)); c.lineTo(mx + uy * (e.r + 1), my - ux * (e.r + 1)); c.stroke(); } }
  // 폐 속: 갈라지는 가지, 공기가 드나드는 작은 주머니와 혈관
  for (const id of ['lungL', 'lungR']) {
    const n = E.N[id], s = 1 + ch * 0.06;
    c.save(); c.beginPath(); c.arc(n.x, n.y, n.r, 0, TAU); c.clip();
    const tip = id === 'lungL' ? E.N.bl1 : E.N.br1, dir = id === 'lungL' ? -1 : 1;
    const br = (x, y, a, len, d) => { if (d > 3) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; line(c, [[x, y], [x2, y2]], 'rgba(214,111,127,.8)', 6 - d * 1.3); if (d === 3) { for (let k = 0; k < 5; k++) dot(c, x2 + Math.cos(k * 1.3) * 7 * s, y2 + Math.sin(k * 1.3) * 7 * s, 5.5 * s, '#ffd5dc', '#e07a8c', 1); c.strokeStyle = 'rgba(200,40,60,.55)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x2, y2, 15 * s, 0, TAU); c.stroke(); } br(x2, y2, a - 0.45, len * 0.72, d + 1); br(x2, y2, a + 0.45, len * 0.72, d + 1); };
    br(lerp(tip.x, n.x, 0.55), lerp(tip.y, n.y, 0.55), Math.PI / 2 + dir * 0.35, 48, 1);
    c.restore();
  }
  // 심장과 가로막, 갈비뼈(가슴이 커지면 갈비뼈가 올라가고 가로막이 내려간다)
  heartPath(c, 520, 880, 40); c.fillStyle = 'rgba(217,65,79,.85)'; c.fill(); c.strokeStyle = '#8a1d2a'; c.lineWidth = 1.5; c.stroke();
  const dy = 1010 + ch * 26;
  c.strokeStyle = '#a0522d'; c.lineWidth = 10; c.beginPath(); c.moveTo(120, 1040); c.quadraticCurveTo(520, dy - 110 + ch * 60, 920, 1040); c.stroke();
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const y = 730 + i * 70 - ch * 14, x = 520 + s * (330 + ch * 14); c.strokeStyle = '#e8d9b0'; c.lineWidth = 9; c.beginPath(); c.ellipse(520, y, 330 + ch * 14, 44, 0, s < 0 ? 0.62 * Math.PI : 0.07 * Math.PI, s < 0 ? 0.93 * Math.PI : 0.38 * Math.PI); c.stroke(); if (i === 0) E.lab('갈비뼈', x + s * -30, y + 30, {size: 11}); }
  E.lab('가로막', 520, dy - 10, {size: 12}); E.lab('심장', 520, 948, {size: 11});
  if (E.here === 'lung' || S.done.lung) for (const id of ['lungL', 'lungR']) E.lab('혈관', E.N[id].x + (id === 'lungL' ? -60 : 60), E.N[id].y + 60, {size: 11, bg: 'rgba(255,226,230,.95)'});
}
const BR_HUD = [508, 250, 204, 122];
function breathHud(c, S, E) {
  const [x, y, w, h] = BR_HUD, ch = E.A.chest ?? 0, prev = E.A.chestPrev ?? ch, sp = ch - prev;
  E.A.chestPrev = ch;
  panel(c, x, y, w, h);
  txt(c, '가슴 모습 (모형)', x + 10, y + 18, {size: 12, color: '#ffe08a'});
  const cx = x + 132, top = y + 30;
  c.fillStyle = 'rgba(255,224,200,.25)'; rr(c, cx - 50 - ch * 6, top, 100 + ch * 12, 84, 18); c.fill();
  for (const s of [-1, 1]) oval(c, cx + s * 22, top + 40 - ch * 2, 18 + ch * 4, 28 + ch * 5, 0, 'rgba(243,166,179,.9)', '#b8606f', 1.2);
  for (let i = 0; i < 4; i++) { const yy = top + 18 + i * 14 - ch * 6; c.strokeStyle = '#e8d9b0'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(cx, yy, 46 + ch * 6, 10, 0, 0.08 * Math.PI, 0.92 * Math.PI); c.stroke(); }
  const dy = top + 74 + ch * 8;
  c.strokeStyle = '#d0703d'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(cx - 48, top + 80); c.quadraticCurveTo(cx, dy - 26 + ch * 14, cx + 48, top + 80); c.stroke();
  txt(c, '갈비뼈', x + 10, y + 52, {size: 11, color: '#f1e3c0'});
  txt(c, '가로막', x + 10, y + 100, {size: 11, color: '#ffb48a'});
  if (Math.abs(sp) > 0.0008) { arrowHead(c, x + 64, y + 44, sp > 0 ? -Math.PI / 2 : Math.PI / 2, 6, '#ffe08a'); arrowHead(c, x + 64, y + 92, sp > 0 ? Math.PI / 2 : -Math.PI / 2, 6, '#ffb48a'); }
  txt(c, Math.abs(sp) > 0.0008 ? (sp > 0 ? '커져요' : '작아져요') : ch > 0.1 ? '커진 채' : '그대로', x + 10, y + 76, {size: 12, color: '#ffffff'});
}

// ================================================================ 혈액 배달(R5-G02): 심장, 폐, 작은창자, 근육, 다시 심장
function drawCells(c, E, speedK = 1) {
  const ph = E.A.flowPh || 0;
  for (const e of E.edges) {
    if (!e.one || e.deco || !E.open(e) || e.look === 'urine') continue;
    if (!E.inView((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2, 300)) continue;
    const L = hyp(e.a.x, e.a.y, e.b.x, e.b.y), n = Math.max(2, Math.floor(L / 30)), ux = (e.b.x - e.a.x) / L, uy = (e.b.y - e.a.y) / L;
    const ra = (e.a.r || 0) + 4, rb = (e.b.r || 0) + 4;
    for (let i = 0; i < n; i++) { const k = ((ph * speedK * 60 / L) + i / n) % 1, d = L * k; if (d < ra || d > L - rb) continue; const wob = Math.sin(i * 2.3) * e.r * 0.45; dot(c, e.a.x + ux * d - uy * wob, e.a.y + uy * d + ux * wob, 4.6, e.look === 'clean' ? '#ff5a52' : '#e2443e', '#8a1d1d', 1); }
    for (let d = Math.max(40, ra + 14); d < L - Math.max(20, rb + 10); d += 90) arrowHead(c, e.a.x + ux * d, e.a.y + uy * d, Math.atan2(uy, ux), 7, 'rgba(255,255,255,.55)');
  }
}
function heartBeat(E, rest = 1.05) {
  const A = E.A;
  A.beatT ??= -9;
  if (E.t - A.beatT > rest) A.beatT = E.t;
  const k = E.t - A.beatT, pulse = k < 0.3 ? Math.sin(k / 0.3 * Math.PI) : 0;
  A.flowPh = (A.flowPh || 0) + E.dt * (0.35 + pulse * 1.6);
  return E.RM ? 0 : pulse;
}
function drawBlood(c, S, E) {
  const pulse = heartBeat(E), t = E.t;
  // 폐
  const lg = E.N.lung; oval(c, lg.x - 34, lg.y, 30, 46, 0.1, '#f3a6b3', '#b8606f', 2); oval(c, lg.x + 34, lg.y, 30, 46, -0.1, '#f3a6b3', '#b8606f', 2);
  for (let i = 0; i < 6; i++) dot(c, lg.x + Math.cos(i + t * (E.RM ? 0 : 0.6)) * 40, lg.y + Math.sin(i * 1.7) * 30, 3.5, '#8fd3ff', '#2a74b5', 1);
  // 작은창자
  const gt = E.N.gut; c.strokeStyle = '#f0a38f'; c.lineWidth = 9; c.beginPath(); for (let i = 0; i < 4; i++) { const y = gt.y - 38 + i * 25; c.moveTo(gt.x - 50, y); c.bezierCurveTo(gt.x - 20, y - 14, gt.x + 20, y + 14, gt.x + 50, y); } c.stroke();
  for (let i = 0; i < 5; i++) star(c, gt.x + Math.cos(i * 1.3) * 44, gt.y + Math.sin(i * 1.3) * 34, 5, '#ffd23f', '#9a7300');
  // 근육
  const mu = E.N.musc, flex = E.wave('flex', 1.4);
  oval(c, mu.x, mu.y, 74 + flex * 8, 44 - flex * 5, 0, '#c94640', '#7a1f1c', 2);
  for (let i = -4; i <= 4; i++) line(c, [[mu.x + i * 14, mu.y - 34], [mu.x + i * 14, mu.y + 34]], 'rgba(255,200,190,.35)', 2);
  eyes(c, mu.x + 40, mu.y - 12, 4, !!S.acts.muscle?.give);
  // 콩팥
  const kd = E.N.kid; kidneyPath(c, kd.x - 22, kd.y, 30, -1); c.fillStyle = '#a0524f'; c.fill(); kidneyPath(c, kd.x + 22, kd.y, 30, 1); c.fill();
  drawCells(c, E);
  // 심장
  const h = E.N.heart, s = 58 * (1 + pulse * 0.1);
  heartPath(c, h.x, h.y + 6, s); const hg = c.createRadialGradient(h.x - 14, h.y - 14, 8, h.x, h.y, s * 1.3); hg.addColorStop(0, '#ff7a7a'); hg.addColorStop(1, '#a8202c'); c.fillStyle = hg; c.fill(); c.strokeStyle = '#5a0f16'; c.lineWidth = 3; c.stroke();
  line(c, [[h.x, h.y - 30], [h.x, h.y + 40]], 'rgba(90,15,22,.5)', 2);
  if (pulse > 0.2) dot(c, h.x, h.y, s * 1.2, null, `rgba(255,150,150,${pulse * 0.5})`, 4);
  // 캡슐이 실은 것
  const cg = S.cargo || {}, list = [cg.o2 && 'o2', cg.nut && 'nut', cg.waste && 'waste'].filter(Boolean);
  list.forEach((k, i) => { const a = t * (E.RM ? 0 : 2) + i * TAU / Math.max(1, list.length), x = S.pos.x + Math.cos(a) * 34, y = S.pos.y + Math.sin(a) * 24; if (k === 'o2') dot(c, x, y, 5, '#8fd3ff', '#2a74b5', 1.2); else if (k === 'nut') star(c, x, y, 6, '#ffd23f', '#9a7300'); else dot(c, x, y, 5, '#8a5a2b', '#4d300f', 1); });
  E.lab('콩팥', kd.x, kd.y - 46, {size: 12});
}
const BL_HUD = [[498, 286, 214, 86], [8, 112, 124, 82]];
function bloodHud(c, S, E) {
  const [x, y, w, h] = BL_HUD[0];
  panel(c, x, y, w, h);
  txt(c, '펌프 실험과 비교 (모형)', x + 10, y + 18, {size: 12, color: '#ffe08a'});
  [['펌프 → 심장', S.done.heart], ['비닐 호스 → 혈관', S.done.lung], ['붉은 색소 물 → 혈액', S.done.muscle]].forEach(([s, on], i) => { check(c, x + 17, y + 35 + i * 17, 5, !!on); txt(c, s, x + 29, y + 39 + i * 17, {size: 12, color: on ? '#bff5cf' : '#d5deea'}); });
  const [bx, by, bw, bh] = BL_HUD[1], cg = S.cargo || {};
  panel(c, bx, by, bw, bh);
  txt(c, '혈액이 실은 것', bx + 10, by + 18, {size: 12, color: '#ffe08a'});
  [['산소', cg.o2, (xx, yy) => dot(c, xx, yy, 5, '#8fd3ff', '#2a74b5', 1.2)], ['영양소', cg.nut, (xx, yy) => star(c, xx, yy, 6, '#ffd23f', '#9a7300')], ['노폐물', cg.waste, (xx, yy) => dot(c, xx, yy, 5, '#8a5a2b', '#4d300f', 1)]].forEach(([s, on, ic], i) => { c.globalAlpha = on ? 1 : 0.3; ic(bx + 17, by + 33 + i * 16); c.globalAlpha = 1; txt(c, s + (on ? '' : ' 없음'), bx + 30, by + 37 + i * 16, {size: 12, color: on ? '#ffffff' : '#8fa0b8'}); });
}

// ================================================================ 노폐물 청소(R5-G02): 심장, 콩팥, 방광
function drawWaste(c, S, E) {
  const pulse = heartBeat(E), t = E.t;
  // 다른 쪽 콩팥과 방광으로 가는 길(그림, 이름은 붙이지 않는다)
  kidneyPath(c, 300, 430, 58, -1); c.fillStyle = '#9a4c48'; c.fill(); c.strokeStyle = '#5a2422'; c.lineWidth = 2; c.stroke();
  c.strokeStyle = '#d9b23a'; c.lineWidth = 9; c.beginPath(); c.moveTo(330, 480); c.quadraticCurveTo(360, 700, 470, 800); c.stroke();
  // 콩팥(거르는 곳)
  const kd = E.N.kid, fl = E.wave('filter', 1.2);
  kidneyPath(c, kd.x, kd.y, 64, 1); c.fillStyle = '#a7514d'; c.fill(); c.strokeStyle = '#5a2422'; c.lineWidth = 2.5; c.stroke();
  for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45, x = kd.x - 18 + Math.cos(a) * 30, y = kd.y + Math.sin(a) * 38; dot(c, x, y, 7 + fl * 2, 'rgba(255,190,170,.8)', '#7a2e2a', 1.2); }
  // 노폐물이 섞인 혈액
  const filtered = E.cnt('kidney', 'filter');
  if (filtered < 3 && S.done.heart) for (let i = 0; i < 6 - filtered * 2; i++) { const k = ((t * (E.RM ? 0 : 0.25)) + i / 6) % 1, y = lerp(E.N.heart.y + 70, kd.y - 40, k); dot(c, kd.x + Math.sin(i * 2) * 9, y, 4, '#8a5a2b', '#4d300f', 1); }
  drawCells(c, E);
  for (const e of E.edges) if (e.look === 'urine' && !e.deco && E.open(e)) { const L = hyp(e.a.x, e.a.y, e.b.x, e.b.y); for (let i = 0; i < Math.floor(L / 40); i++) { const k = (((E.A.flowPh || 0) * 40 / L) + i * 40 / L) % 1; drop(c, lerp(e.a.x, e.b.x, k), lerp(e.a.y, e.b.y, k), 3.5, '#f2cf3a'); } }
  // 방광(오줌이 모이는 주머니)
  const bl = E.N.blad, fill = E.tw('fill', S.v.fill || 0, 2), out = E.wave('pee', 2.2);
  c.save(); c.beginPath(); c.arc(bl.x, bl.y, bl.r - 4, 0, TAU); c.clip();
  const lv = bl.y + bl.r - (bl.r * 2 - 8) * fill * (out > 0 ? 1 - out : 1);
  c.fillStyle = 'rgba(242,207,58,.75)'; c.fillRect(bl.x - bl.r, lv, bl.r * 2, bl.r * 2);
  c.restore();
  if (out > 0.05) for (let i = 0; i < 5; i++) drop(c, bl.x + Math.sin(i * 1.7) * 4, bl.y + bl.r + 20 + ((t * 120 + i * 30) % 120), 4, '#f2cf3a');
  // 심장
  const h = E.N.heart, s = 48 * (1 + pulse * 0.1);
  heartPath(c, h.x, h.y + 4, s); c.fillStyle = '#c3303c'; c.fill(); c.strokeStyle = '#5a0f16'; c.lineWidth = 2.5; c.stroke();
  E.lab('콩팥', 300, 352, {size: 12});
  if (S.done.kidney) { E.lab('깨끗해진 혈액', E.N.r1.x + 30, E.N.r1.y - 30, {size: 11, bg: 'rgba(255,226,230,.95)'}); E.lab('온몸으로', E.N.bodyOut.x + 10, E.N.bodyOut.y - 26, {size: 11}); }
  E.lab('몸 밖으로', E.N.ex.x + 60, E.N.ex.y - 6, {size: 11});
}
const WS_HUD = [[520, 290, 192, 82], [8, 112, 124, 50]];
function wasteHud(c, S, E) {
  const [x, y, w, h] = WS_HUD[0], f = E.cnt('kidney', 'filter');
  panel(c, x, y, w, h);
  txt(c, '콩팥과 방광 (모형)', x + 10, y + 18, {size: 12, color: '#ffe08a'});
  txt(c, '걸러 낸 노폐물', x + 10, y + 41, {size: 12, color: '#ffffff'});
  for (let i = 0; i < 3; i++) dot(c, x + 116 + i * 18, y + 37, 6, i < f ? '#d9b23a' : null, '#d9b23a', 1.5);
  txt(c, '방광', x + 10, y + 66, {size: 12, color: '#ffffff'});
  bar(c, x + 52, y + 57, 124, 11, (E.A.fill ?? 0) * (E.wave('pee', 2.2) > 0 ? 1 - E.wave('pee', 2.2) : 1), '#f2cf3a');
  const [bx, by, bw, bh] = WS_HUD[1], waste = !S.acts.kidney?.filter || E.cnt('kidney', 'filter') < 3;
  panel(c, bx, by, bw, bh);
  txt(c, '혈액이 실은 것', bx + 10, by + 18, {size: 12, color: '#ffe08a'});
  c.globalAlpha = waste ? 1 : 0.3; dot(c, bx + 17, by + 33, 5, '#8a5a2b', '#4d300f', 1); c.globalAlpha = 1;
  txt(c, waste ? '노폐물' : '노폐물 없음', bx + 30, by + 37, {size: 12, color: waste ? '#ffffff' : '#8fa0b8'});
}

// ================================================================ 운동할 때 몸 속(R5-G02): 평상시, 1분 제자리 달리기 직후, 5분 쉰 뒤(모형 값)
const EX_ROWS = [['평상시', '36.5 °C', '84회/분'], ['달리기 직후', '37.0 °C', '128회/분'], ['5분 쉰 뒤', '36.6 °C', '90회/분']];
function exRate(S) { return S.phase === 'run' || S.phase === 'after' ? 0.47 : S.phase === 'resting' ? 0.6 : S.phase === 'rested' ? 0.67 : 0.71; }
function drawTogether(c, S, E) {
  const t = E.t, run = S.phase === 'run', swing = run && !E.RM ? Math.sin(t * 9) : 0;
  const pulse = heartBeat(E, exRate(S)), br = E.RM ? 0.5 : (Math.sin(t * TAU / (run || S.phase === 'after' ? 1.76 : 3.3)) + 1) / 2;
  // 몸
  c.fillStyle = 'rgba(242,211,191,.22)'; c.strokeStyle = 'rgba(242,211,191,.6)'; c.lineWidth = 3;
  dot(c, 500, 82, 62, 'rgba(242,211,191,.22)', 'rgba(242,211,191,.6)', 3);
  rr(c, 285, 140, 430, 470, 70); c.fill(); c.stroke();
  for (const s of [-1, 1]) { const sw = swing * s * 10; rr(c, 500 + s * 80 - 65 + sw, 590, 130, 290, 40); c.fill(); c.stroke(); rr(c, 500 + s * 255 - 30 - sw, 170, 60, 330, 30); c.fill(); c.stroke(); }
  // 폐와 심장
  for (const s of [-1, 1]) oval(c, 500 + s * 90, 300, 70 + br * 8, 110 + br * 10, 0, 'rgba(243,166,179,.85)', '#b8606f', 2);
  heartPath(c, 540, 338, 40 * (1 + pulse * 0.12)); c.fillStyle = '#d33a46'; c.fill(); c.strokeStyle = '#6a121a'; c.lineWidth = 2; c.stroke();
  // 소화기관, 콩팥, 방광(희미하게)
  c.globalAlpha = 0.55; oval(c, 565, 470, 50, 32, 0.3, '#f0b07a', '#a0663a', 1.5); c.strokeStyle = '#f0a38f'; c.lineWidth = 8; c.beginPath(); for (let i = 0; i < 3; i++) { const y = 525 + i * 20; c.moveTo(430, y); c.bezierCurveTo(470, y - 12, 530, y + 12, 570, y); } c.stroke();
  kidneyPath(c, 420, 485, 20, -1); c.fillStyle = '#a0524f'; c.fill(); kidneyPath(c, 580, 485, 20, 1); c.fill(); c.globalAlpha = 1;
  // 다리 근육
  const mu = 720, flex = run ? Math.abs(Math.sin(t * 9)) : 0;
  oval(c, 420 + swing * -10, mu, 44 + flex * 6, 92 - flex * 6, 0, '#c94640', '#7a1f1c', 2.5);
  for (let i = -2; i <= 2; i++) line(c, [[420 + swing * -10 + i * 13, mu - 70], [420 + swing * -10 + i * 13, mu + 70]], 'rgba(255,200,190,.35)', 2);
  // 함께 일하는 기관: 산소, 영양소, 노폐물의 흐름
  if (run || S.phase === 'after') {
    if (Math.random() < E.dt * 10) { E.seek('o2', 430, 300, 540, 338, 0.6); E.seek('o2', 540, 345, 420, 660, 0.9, {delay: 0.6}); }
    if (Math.random() < E.dt * 6) { E.seek('nut', 500, 540, 540, 340, 0.8); E.seek('nut', 540, 345, 420, 680, 0.9, {delay: 0.8}); }
    if (Math.random() < E.dt * 5) E.seek('waste', 420, 680, 420, 490, 0.9);
    if (Math.random() < E.dt * 8) E.burst('heat', 420 + (Math.random() - 0.5) * 60, 640, 1, {speed: 10, vy: -40, life: 1});
  }
  // 측정 장치
  const ob = [500, 196];
  rr(c, ob[0] - 46, ob[1] - 22, 92, 40, 8); c.fillStyle = '#e8f1ff'; c.fill(); c.strokeStyle = '#3c5a80'; c.lineWidth = 2; c.stroke();
  line(c, [[ob[0] - 30, ob[1] + 8], [ob[0] - 30, ob[1] - 12]], '#d9414f', 4); dot(c, ob[0] - 30, ob[1] + 10, 5, '#d9414f');
  c.strokeStyle = '#2f9a5b'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= 40; i++) { const x = ob[0] - 14 + i * 1.2, k = ((i / 40) + t * (E.RM ? 0 : 1 / exRate(S))) % 1; c.lineTo(x, ob[1] - (k > 0.45 && k < 0.55 ? 12 : 0)); } c.stroke();
  E.lab('작은창자', 620, 560, {size: 11}); E.lab('콩팥', 380, 470, {size: 11}); E.lab('위', 618, 440, {size: 11});
}
const EX_HUD = [452, 270, 260, 102];
function togetherHud(c, S) {
  const [x, y, w, h] = EX_HUD;
  panel(c, x, y, w, h);
  txt(c, '측정 기록 (모형 값)', x + 10, y + 18, {size: 12, color: '#ffe08a'});
  const cols = [x + 10, x + 104, x + 172];
  ['때', '체온', '심장 박동 수'].forEach((s, i) => txt(c, s, cols[i], y + 37, {size: 11, color: '#aebdd3'}));
  EX_ROWS.forEach((r, i) => { const got = (S.rec || []).length > i, yy = y + 56 + i * 17; txt(c, r[0], cols[0], yy, {size: 12, color: '#ffffff'}); if (got) { txt(c, r[1], cols[1], yy, {size: 12, color: '#bff5cf'}); txt(c, r[2], cols[2], yy, {size: 12, color: '#bff5cf'}); } });
}

// ================================================================ 몸속 건강 순찰(R5-G03): 기관마다 생길 수 있는 질병과 예방 습관
const ZONES = {
  res: {name: '호흡기관', parts: '코, 숨관, 폐', dis: '비염, 감기', hard: ['코가 막히거나 기침이 나서', '숨쉬기가 불편할 수 있어요.'], extra: ' 감기의 원인이 되는 바이러스는 종류가 매우 많아요.', col: '#5aa9e6',
    habits: [['wash', '흐르는 물에 비누로 손 씻기', true], ['rub', '씻지 않은 손으로 눈, 코, 입 만지기', false], ['shut', '창문을 닫아 두고 환기하지 않기', false]], ok: '손을 깨끗이 씻으면 감기를 일으키는 바이러스가 몸에 들어오는 것을 줄일 수 있어요.'},
  dig: {name: '소화기관', parts: '위, 작은창자, 큰창자', dis: '위염, 소화 불량', hard: ['음식물을 소화하는 일이 힘들어지고', '속이 불편할 수 있어요.'], extra: '', col: '#e8914a',
    habits: [['chew', '음식을 천천히 꼭꼭 씹어 먹기', true], ['gulp', '음식을 급하게 삼키기', false], ['jump', '먹자마자 바로 뛰기', false]], ok: '꼭꼭 씹으면 음식물이 잘게 부서져 위와 작은창자가 소화하기 쉬워요.'},
  cir: {name: '순환기관', parts: '심장, 혈관', dis: '심장병, 고혈압', hard: ['혈액을 온몸으로 보내는 일이', '힘들어질 수 있어요.'], extra: '', col: '#e2483e',
    habits: [['bland', '싱겁게 먹고 꾸준히 운동하기', true], ['salty', '짠 과자를 자주 먹기', false], ['sit', '하루 종일 앉아만 있기', false]], ok: '싱겁게 먹고 꾸준히 운동하면 심장과 혈관이 튼튼하게 일하는 데 도움이 돼요.'},
  exc: {name: '배설기관', parts: '콩팥, 방광', dis: '신장염, 방광염', hard: ['노폐물을 걸러 내보내는 일이 힘들어지고', '오줌을 눌 때 불편할 수 있어요.'], extra: '', col: '#a77be0',
    habits: [['water', '물을 충분히 마시고 오줌 참지 않기', true], ['hold', '오줌을 오래 참기', false], ['dry', '물을 거의 마시지 않기', false]], ok: '물을 충분히 마시고 오줌을 참지 않으면 콩팥과 방광이 노폐물을 내보내는 데 도움이 돼요.'},
};
function zoneStation(id, at, lab) {
  const z = ZONES[id];
  return {id, name: z.name, cheer: `${z.name} 방패 완성이에요`, at: id, r: 100, lab, info: `${z.name} 구역이에요. ${jo(z.parts, '을', '를')} 살펴봐요. 질병 안내를 보고 예방 습관을 골라 방패를 세워요.`, again: `${z.name}에 예방 방패가 서 있어요.`,
    acts: [
      {id: 'info', label: '질병 안내 보기', run: (S) => { S.v.card = id; return `${z.name}에는 ${z.dis} 같은 질병이 생길 수 있어요. ${z.hard.join(' ')}${z.extra}`; }},
      {id: 'habit', need: ['info'], needMsg: '먼저 질병 안내를 봐요.', choices: z.habits.map(([hid, label, ok]) => ({id: hid, label, ok, run: (S, E) => { if (ok) { S.v.card = id; E.trigger('shield-' + id); return `${z.ok} ${z.name}에 예방 방패가 생겼어요.`; } E.trigger('tired-' + id); return `「${label}」 습관은 ${jo(z.name, '을', '를')} 힘들게 할 수 있어요. 다른 습관을 골라 봐요.`; }}))},
    ]};
}
function drawZoneArt(c, id, x, y, E, S) {
  const happy = !!S.done[id], tired = E.wave('tired-' + id, 1.2);
  const wob = tired * (E.RM ? 0 : Math.sin(E.t * 20) * 3);
  if (id === 'res') { line(c, [[x, y - 70], [x, y - 10]], '#e6a3ae', 14); for (const s of [-1, 1]) oval(c, x + s * 34 + wob, y + 22, 30, 44, 0, '#f3a6b3', '#b8606f', 2); oval(c, x, y - 76, 14, 10, 0, '#f4c3a8', '#b07a5a', 1.5); eyes(c, x, y + 20, 4, happy); }
  if (id === 'dig') { oval(c, x - 10 + wob, y - 24, 46, 30, 0.35, '#f0b07a', '#a0663a', 2); c.strokeStyle = '#f0a38f'; c.lineWidth = 9; c.beginPath(); for (let i = 0; i < 3; i++) { const yy = y + 18 + i * 18; c.moveTo(x - 44, yy); c.bezierCurveTo(x - 14, yy - 12, x + 14, yy + 12, x + 44, yy); } c.stroke(); eyes(c, x - 10, y - 26, 4, happy); }
  if (id === 'cir') { heartPath(c, x + wob, y, 40); c.fillStyle = '#d33a46'; c.fill(); c.strokeStyle = '#6a121a'; c.lineWidth = 2; c.stroke(); line(c, [[x - 60, y - 50], [x - 20, y - 30]], '#e2483e', 6); line(c, [[x + 60, y - 50], [x + 20, y - 30]], '#e2483e', 6); eyes(c, x, y - 4, 4, happy); }
  if (id === 'exc') { kidneyPath(c, x - 36 + wob, y - 20, 24, -1); c.fillStyle = '#a0524f'; c.fill(); kidneyPath(c, x + 36 - wob, y - 20, 24, 1); c.fill(); line(c, [[x - 30, y], [x - 10, y + 34]], '#d9b23a', 5); line(c, [[x + 30, y], [x + 10, y + 34]], '#d9b23a', 5); oval(c, x, y + 46, 22, 16, 0, '#f1c9a6', '#a0663a', 1.5); eyes(c, x, y + 44, 3.5, happy); }
  if (happy) { const sh = E.wave('shield-' + id, 1.2); dot(c, x, y, 86 + sh * 10, `rgba(160,240,255,${0.12 + sh * 0.2})`, 'rgba(160,240,255,.8)', 3); }
}
function drawPatrol(c, S, E) {
  for (const id of Object.keys(ZONES)) { const n = E.N[id]; drawZoneArt(c, id, n.x, n.y, E, S); rr(c, n.x + (n.x < 650 ? 70 : -96), n.y - 96, 26, 34, 5); c.fillStyle = '#16324f'; c.fill(); c.strokeStyle = ZONES[id].col; c.lineWidth = 2; c.stroke(); line(c, [[n.x + (n.x < 650 ? 83 : -83), n.y - 62], [n.x + (n.x < 650 ? 83 : -83), n.y - 44]], '#9fb0c6', 3); }
  const hb = E.N.hub; dot(c, hb.x, hb.y, 54, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.4)', 2);
  if (!E.RM) { c.strokeStyle = 'rgba(127,224,255,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(hb.x, hb.y); c.lineTo(hb.x + Math.cos(E.t * 2) * 50, hb.y + Math.sin(E.t * 2) * 50); c.stroke(); }
  for (const id of Object.keys(ZONES)) dot(c, hb.x + {res: -24, dig: -24, cir: 24, exc: 24}[id], hb.y + {res: -24, dig: 24, cir: -24, exc: 24}[id], 8, S.done[id] ? ZONES[id].col : 'rgba(255,255,255,.15)', '#ffffff', 1);
}
const PT_HUD = [446, 262, 266, 110];
function patrolHud(c, S, E) {
  const [x, y, w, h] = PT_HUD;
  if (E.here === 'hub' || S.v.days != null) {
    panel(c, x, y, w, h);
    const d = E.A.day = S.v.days == null ? 0 : E.RM ? 30 : Math.min(30, (E.A.day || 0) + E.dt * 12);
    txt(c, S.v.days == null ? '기관 계기판 (모형 값)' : `기관 계기판 (모형 값) ${Math.round(d)}일째`, x + 10, y + 18, {size: 12, color: '#ffe08a'});
    Object.entries(ZONES).forEach(([id, z], i) => { const v = S.done[id] ? 0.55 + 0.4 * d / 30 : 0.55 - 0.15 * d / 30, yy = y + 36 + i * 18; txt(c, z.name, x + 10, yy + 4, {size: 12, color: '#ffffff'}); bar(c, x + 78, yy - 5, 170, 10, v, z.col); });
    return;
  }
  const z = ZONES[S.v.card];
  if (!z) return;
  panel(c, x, y, w, h);
  txt(c, `${z.name}: ${z.parts}`, x + 10, y + 18, {size: 12, color: '#ffe08a'});
  txt(c, '질병: ' + z.dis, x + 10, y + 38, {size: 12, color: '#ffffff'});
  txt(c, z.hard[0], x + 10, y + 57, {size: 12, color: '#d5deea'}); txt(c, z.hard[1], x + 10, y + 74, {size: 12, color: '#d5deea'});
  txt(c, '자료: 질병관리청 국가건강정보포털', x + 10, y + 98, {size: 11, bold: false, color: '#aebdd3'});
}

// ================================================================ 친구 일기 속으로(R5-G03): 허겁지겁 먹고 곧장 축구한 날, 습관을 바꾼 날
function drawDiary(c, S, E) {
  const t = E.t, run = (S.v.run && !S.done.chest) || E.wave('replay', 3) > 0, swing = run && !E.RM ? Math.sin(t * 10) : 0;
  const full = E.tw('full', S.v.good ? 0.25 : S.v.food === 'big' ? 1 : 0, 2), dia = 470 - full * 22;
  c.fillStyle = 'rgba(242,211,191,.5)'; c.strokeStyle = '#c8987a'; c.lineWidth = 3;
  dot(c, 500, 100, 72, 'rgba(242,211,191,.5)', '#c8987a', 3);
  rr(c, 290 + swing * 3, 190, 420, 590, 80); c.fill(); c.stroke();
  oval(c, 500, 138, 26, 9, 0, '#c9545e', '#7a2a30', 1.5);
  // 식도
  line(c, [[500, 160], [500, dia - 10], [560, 520]], '#e9a08f', 20); line(c, [[500, 160], [500, dia - 10], [560, 520]], '#f8d4c8', 12);
  // 폐와 심장, 가로막
  const br = E.RM ? 0.5 : (Math.sin(t * TAU / (S.v.run && !S.done.chest ? 0.9 : 3)) + 1) / 2, shallow = S.v.run && !S.v.good ? 0.35 : 1;
  for (const s of [-1, 1]) oval(c, 500 + s * 100, 320, 70 + br * 8 * shallow, 108 + br * 10 * shallow - full * 14, 0, 'rgba(243,166,179,.9)', '#b8606f', 2);
  heartPath(c, 530, 350, 30); c.fillStyle = '#d33a46'; c.fill();
  c.strokeStyle = '#a0522d'; c.lineWidth = 8; c.beginPath(); c.moveTo(320, 470); c.quadraticCurveTo(500, dia - 60 - br * 10 * shallow, 680, 470); c.stroke();
  // 위와 음식물
  const sx = 585, sy = 545, k = 1 + full * 0.35, wob = run ? Math.sin(t * 12) * 4 : 0;
  oval(c, sx + wob, sy, 92 * k, 62 * k, 0.25, '#f0b07a', '#a0663a', 2.5);
  if (S.v.food === 'big' && !S.v.good) for (let i = 0; i < 4; i++) { const a = i * 1.6 + (run ? t * 3 : 0); rr(c, sx + Math.cos(a) * 34 - 14 + wob, sy + Math.sin(a) * 22 - 11, 28, 22, 6); c.fillStyle = ['#fff7e6', '#7cc35a', '#f08a3c', '#e9d8a6'][i]; c.fill(); c.strokeStyle = 'rgba(80,60,30,.6)'; c.lineWidth = 1; c.stroke(); }
  if (S.v.good) for (let i = 0; i < 14; i++) dot(c, sx + Math.cos(i * 1.7) * 40, sy + Math.sin(i * 2.3) * 24, 3.5, ['#e9b867', '#fff2c8'][i % 2]);
  c.globalAlpha = 0.5; c.strokeStyle = '#f0a38f'; c.lineWidth = 9; c.beginPath(); for (let i = 0; i < 3; i++) { const y = 650 + i * 26; c.moveTo(400, y); c.bezierCurveTo(450, y - 14, 550, y + 14, 600, y); } c.stroke(); c.globalAlpha = 1;
  // 떨어지는 덩어리(허겁지겁 먹을 때)
  const gl = E.since('gulp');
  // 덩어리는 위에 그린 식도 선(500,160 → 500,가로막 위 → 560,520)을 따라 내려간다. 곧은 대각선으로 그리면 심장과 폐 위를 지나가 음식이 그쪽으로 가는 것처럼 보인다.
  const L1 = dia - 10 - 160, L2 = Math.hypot(60, 520 - (dia - 10));
  if (gl < 1.4 && !E.RM) for (let i = 0; i < 3; i++) { const kk = clamp(gl / 1.2 - i * 0.15, 0, 1), d = kk * (L1 + L2), px = d <= L1 ? 500 : 500 + 60 * (d - L1) / L2, py = d <= L1 ? 160 + d : dia - 10 + (520 - (dia - 10)) * (d - L1) / L2; rr(c, px - 12, py - 10, 24, 20, 5); c.fillStyle = '#fff1d2'; c.fill(); }
  if (run && Math.random() < E.dt * 6) E.burst('heat', 420 + Math.random() * 160, 230, 1, {speed: 8, vy: -40, life: 0.8});
  E.lab('가로막', 340, 452, {size: 11}); E.lab('폐', 380, 236, {size: 11}); E.lab('식도', 455, 250, {size: 11}); E.lab('심장', 560, 400, {size: 11});
}
const DY_HUD = [500, 290, 212, 82];
function diaryHud(c, S, E) {
  const [x, y, w, h] = DY_HUD;
  panel(c, x, y, w, h);
  txt(c, '속 편안함 (모형)', x + 10, y + 18, {size: 12, color: '#ffe08a'});
  txt(c, '일기 그대로', x + 10, y + 43, {size: 12, color: '#ffffff'}); bar(c, x + 92, y + 34, 108, 11, E.tw('cA', S.v.cA ?? 0, 2), '#e2683e');
  txt(c, '습관 바꾼 뒤', x + 10, y + 66, {size: 12, color: '#ffffff'}); bar(c, x + 92, y + 57, 108, 11, E.tw('cB', S.v.cB ?? 0, 2), '#3fae6a');
}

// ================================================================ 장면 자료
const GUT_LOOK = {base: {rim: '#9c4a3c', wall: '#e08b78', lumen: '#fbe3d6', dim: '#d9b0a0'}, small: {rim: '#9c4a3c', wall: '#e8968a', lumen: '#fde9df', dim: '#d9b0a0'}, large: {rim: '#7a4a2a', wall: '#c98a5e', lumen: '#f3dcc0', dim: '#cbb197'}, glass: {rim: '#5a8fb8', wall: '#bfe0f5', lumen: '#e9f6ff', dim: '#bfd3e0'}};
const MODES = {
  skeleton: {
    owner: '축소 탐험 캡슐: 골격 모형 탐험 (모형)',
    label: '커다란 인체 골격 모형 둘레를 탐험 캡슐로 날아다니는 장면. 머리뼈, 갈비뼈, 척추뼈, 팔뼈, 다리뼈에 들러 생김새와 하는 일을 살펴본다.',
    w: 1000, h: 1300, rects: [[60, 50, 940, 1250]], start: [220, 190], answer: 'explored', bg: '#14243a', blobs: {n: 40, col: 'rgba(127,214,255,.12)', r: 7},
    listTitle: '살펴볼 뼈', speed: 190,
    intro: '캡슐을 타고 커다란 골격 모형 둘레를 날아요. 방향키나 아래 단추로 움직이고, 뼈 가까이 가면 할 일이 나와요.',
    cheer: '골격 모형 탐험 완료예요',
    finish: '골격 모형 탐험을 마쳤어요. 뼈는 생김새가 서로 다르고 몸을 받쳐요. 뼈는 근육과 함께 몸의 모양을 만들고 몸속 기관을 보호해요.',
    stations: [
      {id: 'skull', name: '머리뼈', cheer: '단단한 헬멧 같아요', at: [500, 165], r: 105, lab: [130, -60], info: '머리뼈에 왔어요. 생김새를 살펴보고 충격 공을 굴려 봐요.',
        acts: [
          {id: 'look', label: '모양 살펴보기', run: (S) => { S.v.skull = 1; return '머리뼈는 동그란 모양이에요. 바가지처럼 머릿속을 덮고 있어요.'; }},
          {id: 'ball', label: '충격 공 굴려 보기', run: (S, E) => { E.ball(520, -40, 62, 1); return '공이 동그란 머리뼈에 부딪혀 튕겨 나가요. 머리뼈는 머릿속을 감싸 보호해요.'; }},
        ], doneMsg: ' 머리뼈를 다 살펴봤어요.'},
      {id: 'ribs', name: '갈비뼈', cheer: '가슴을 지키는 울타리예요', at: [500, 440], r: 110, lab: [150, -95], info: '갈비뼈에 왔어요. 가슴을 둘러싼 뼈를 세어 보고 충격 공을 굴려 봐요.',
        acts: [
          {id: 'count', label: '갈비뼈 세어 보기', run: (S, E) => { E.trigger('ribs'); return '갈비뼈는 여러 개가 활 모양으로 휘어 가슴을 둘러싸요.'; }},
          {id: 'ball', label: '충격 공 굴려 보기', run: (S, E) => { E.trigger('ribball'); E.ball(560, 180, 318, 1); return '공이 갈비뼈에 막혀 튕겨 나가요. 갈비뼈는 가슴 속 심장과 폐를 보호해요.'; }},
        ], doneMsg: ' 갈비뼈를 다 살펴봤어요.'},
      {id: 'spine', name: '척추뼈', cheer: '작은 뼈들이 모인 기둥이에요', at: [500, 690], r: 80, lab: [118, 0], info: '척추뼈에 왔어요. 등 가운데를 지나는 뼈예요.',
        acts: [
          {id: 'look', label: '하나씩 비춰 보기', run: (S, E) => { E.trigger('spine'); return '척추뼈는 여러 개의 작은 뼈가 기둥 모양으로 이어져 있어요.'; }},
          {id: 'bend', label: '모형 허리 굽혀 보기', run: (S, E) => { E.trigger('bend'); return '작은 뼈가 여러 개 이어져 있어서 허리를 굽힐 수 있어요. 척추뼈는 기둥처럼 몸을 받쳐요.'; }},
        ], doneMsg: ' 척추뼈를 다 살펴봤어요.'},
      {id: 'arm', name: '팔뼈와 관절', short: '팔뼈와 팔꿈치', cheer: '관절에서 접혀요', at: [705, 560], r: 92, lab: [60, -100], info: '팔뼈에 왔어요. 뼈와 뼈가 이어진 곳도 찾아봐요.',
        acts: [
          {id: 'look', label: '팔뼈 살펴보기', run: (S) => { S.v.arm = 1; return '팔뼈는 위팔뼈와 아래팔뼈로 되어 있고 길쭉해요.'; }},
          {id: 'joint', label: '팔꿈치 접어 보기', run: (S, E) => { E.trigger('elbow'); return '뼈와 뼈가 이어진 곳을 관절이라고 해요. 모형을 손으로 접으면 관절에서 접혀요. 실제 몸에서는 근육이 뼈를 당겨 움직여요.'; }},
        ], doneMsg: ' 팔뼈와 관절을 다 살펴봤어요.'},
      {id: 'leg', name: '다리뼈와 관절', short: '다리뼈와 무릎', cheer: '몸을 든든히 받쳐요', at: [590, 1060], r: 95, lab: [105, -60], info: '다리뼈에 왔어요. 몸 아래쪽에서 몸을 받치는 뼈예요.',
        acts: [
          {id: 'look', label: '다리뼈 살펴보기', run: (S) => { S.v.leg = 1; return '다리뼈는 굵고 길쭉해요. 무릎에도 뼈와 뼈가 이어진 관절이 있어요.'; }},
          {id: 'stand', label: '서 있게 받쳐 보기', run: (S, E) => { E.trigger('stand'); return '굵고 긴 다리뼈가 몸을 받쳐서 몸이 서 있을 수 있어요.'; }},
        ], doneMsg: ' 다리뼈를 다 살펴봤어요.'},
    ],
    world: drawSkeleton, mini: SKEL_MINI,
  },
  arm: {
    owner: '축소 탐험 캡슐: 위팔 속 탐험 (모형)',
    label: '옆에서 본 팔 속. 위팔뼈와 아래팔뼈가 팔꿈치 관절에서 만나고, 위팔 안쪽과 바깥쪽에 근육이 붙어 있다. 근육을 줄이면 아래팔뼈가 당겨진다.',
    w: 1240, h: 700, rects: [[140, 215, 800, 545]], start: [205, 300], answer: 'moved', bg: '#f0c2a8',
    listTitle: '살펴볼 곳', speed: 170,
    intro: '캡슐이 위팔 속으로 들어왔어요. 방향키나 아래 단추로 움직여 뼈와 근육에 가 봐요.',
    cheer: '근육 덕분에 팔이 움직여요',
    finish: '근육이 짧아지며 뼈를 당겨서 팔이 움직였어요. 뼈는 스스로 움직이지 못하고, 근육은 관절을 사이에 두고 다른 뼈에 붙어 있어요.',
    init: (S) => { S.v.th ??= 0; S.v.attach ??= 'fore'; },
    stations: [
      {id: 'bone', name: '위팔뼈', cheer: '뼈 혼자서는 꼼짝 안 해요', at: [330, 380], r: 58, lab: [0, -34], info: '위팔뼈 위에 왔어요. 단단하고 길쭉한 뼈예요.',
        acts: [{id: 'alone', label: '뼈 혼자 움직여 보기', run: (S, E) => { E.trigger('nopush'); E.look(640, 300, 1.6); return '뼈에게 움직이라고 해도 팔이 그대로예요. 뼈는 스스로 움직이지 못해요.'; }}], doneMsg: ' 뼈를 움직이는 것이 무엇인지 근육에 가서 알아봐요.'},
      {id: 'inner', name: '안쪽 근육', cheer: '안쪽 근육이 당겼어요', at: [480, 288], r: 60, lab: [0, -40], info: '위팔 안쪽 근육이에요. 위팔 앞쪽과 아래팔뼈를 잇고 있어요.',
        acts: [
          {id: 'short', label: '안쪽 근육 줄이기', run: (S, E) => { E.look(640, 250, 2); if (S.v.attach === 'upper') { E.trigger('contract'); return '근육이 짧아져도 양 끝이 모두 위팔뼈에 붙어 있어서 팔이 움직이지 않아요.'; } if (S.v.th >= 100) return '팔이 이미 구부러졌어요. 바깥쪽 근육을 줄이면 팔이 펴져요.'; S.v.th = 105; return '안쪽 근육이 짧아지며 볼록해져요. 근육이 아래팔뼈를 당겨 팔이 구부러져요. 이때 바깥쪽 근육은 길어져요.'; }},
          {id: 'push', label: '안쪽 근육으로 밀어 보기', need: ['short'], needMsg: '먼저 안쪽 근육을 줄여 봐요.', run: (S, E) => { E.trigger('nopush'); E.look(640, 260, 1.6); return '근육은 짧아지며 당기기만 하고 뼈를 밀지는 못해요. 팔이 그대로예요.'; }},
        ]},
      {id: 'outer', name: '바깥쪽 근육', cheer: '이번엔 바깥쪽 근육 차례예요', at: [480, 472], r: 60, lab: [0, 70], info: '위팔 바깥쪽 근육이에요. 위팔 뒤쪽과 팔꿈치 뒤 아래팔뼈를 잇고 있어요.',
        acts: [{id: 'short', label: '바깥쪽 근육 줄이기', need: (S) => ((S.v.th || 0) < 50 ? '팔이 펴져 있어요. 안쪽 근육을 먼저 줄여 팔을 구부려 봐요.' : null), run: (S, E) => { S.v.th = 0; E.look(640, 300, 2); return '바깥쪽 근육이 짧아지며 아래팔뼈를 당겨 팔이 펴져요. 이때 안쪽 근육은 다시 길어져요.'; }}]},
      {id: 'joint', name: '팔꿈치 관절', cheer: '여기서 팔이 접혀요', at: [772, 380], r: 46, lab: [-20, -52], info: '위팔뼈와 아래팔뼈가 만나는 곳이에요.',
        acts: [{id: 'look', label: '관절 살펴보기', run: (S) => { S.v.joint = 1; return '위팔뼈와 아래팔뼈가 만나는 곳이 팔꿈치 관절이에요. 관절이 있어서 팔이 접혀요. 팔 모형에서는 할핀이 관절을 나타내요.'; }}]},
      {id: 'attach', name: '근육이 붙는 곳', cheer: '붙는 자리가 중요해요', at: [690, 290], r: 46, lab: [-10, -46], info: '안쪽 근육의 아래쪽 끝이 붙는 곳이에요. 붙는 자리를 바꿔 실험해 봐요.',
        acts: [
          {id: 'same', label: '끝을 위팔뼈로 옮기기', run: (S) => { S.v.attach = 'upper'; S.v.th = 0; return '안쪽 근육의 아래쪽 끝을 위팔뼈로 옮겼어요. 이제 근육을 줄여 봐요.'; }},
          {id: 'try', label: '옮긴 근육 줄여 보기', need: (S) => (S.v.attach !== 'upper' ? '먼저 근육 끝을 위팔뼈로 옮겨 봐요.' : null), run: (S, E) => { E.trigger('contract'); E.look(600, 320, 1.8); return '근육이 짧아져도 양 끝이 모두 위팔뼈에 붙어 있어서 팔이 움직이지 않아요.'; }},
          {id: 'back', label: '끝을 아래팔뼈로 되돌리기', need: ['try'], needMsg: '먼저 옮긴 근육을 줄여 봐요.', run: (S) => { S.v.attach = 'fore'; return '근육 끝을 관절 건너 아래팔뼈에 다시 붙였어요. 근육은 관절을 사이에 두고 서로 다른 뼈에 붙어야 뼈를 당겨 움직여요.'; }},
        ]},
    ],
    hudBox: [8, 86, 214, 100],
    world: drawArm, mini: ARM_MINI,
    hud(c, S, E) {
      const [x, y, w, h] = [8, 86, 214, 100], ap = armPts(E.A.th ?? S.v.th ?? 0, S.v.attach), straight = armPts(0, 'fore');
      panel(c, x, y, w, h);
      txt(c, '근육 길이 (모형 값)', x + 10, y + 18, {size: 12, color: '#ffe08a'});
      const word = (L, L0) => (L < L0 - 8 ? '짧아짐' : L > L0 + 8 ? '길어짐' : '보통');
      [['안쪽 근육', ap.Lin, straight.Lin, '#ff7a6e'], ['바깥쪽 근육', ap.Lout, straight.Lout, '#ffae6e']].forEach(([s, L, L0, col], i) => { const yy = y + 38 + i * 19; txt(c, s, x + 10, yy, {size: 12, color: '#ffffff'}); bar(c, x + 84, yy - 9, 74, 10, L / 680, col); txt(c, word(L, L0), x + 164, yy, {size: 12, color: '#ffe9c4'}); });
      [['빨대 → 근육', S.done.inner], ['할핀 → 관절', S.done.joint]].forEach(([s, on], i) => { const xx = x + 10 + i * 102; rr(c, xx, y + 74, 94, 18, 9); c.fillStyle = on ? 'rgba(63,191,116,.35)' : 'rgba(255,255,255,.08)'; c.fill(); txt(c, s, xx + 47, y + 87, {size: 11, color: on ? '#dfffe9' : '#9fb0c6', align: 'center'}); });
    },
  },
  digest: {
    owner: '축소 탐험 캡슐: 소화 여행 (모형)',
    label: '입에서 항문까지 이어진 소화기관 속을 음식물과 함께 지나가는 장면. 입, 식도, 위, 작은창자, 큰창자, 항문을 차례로 지나며 음식물이 잘게 쪼개지고 영양소와 물이 흡수된다.',
    w: 1400, h: 1760, start: [205, 215], answer: 'digested', bg: '#f0c3b0', body: true, looks: GUT_LOOK, blobs: {n: 140, col: 'rgba(214,130,110,.35)', r: 9},
    listTitle: '소화 여행 길', speed: 180,
    nodes: {lips: [130, 215], mouth: [330, 215, 100], throat: [330, 345], eso1: [330, 555], eso2: [330, 720], cardia: [430, 790], stom: [560, 845, 105], stom2: [675, 915, 78], pylor: [790, 975], si0: [860, 1040], sp1: [1020, 1040], si1: [1180, 1040], si2: [1180, 1150], sp2: [735, 1150], si3: [290, 1150], si4: [290, 1260], sp3: [700, 1260], si5: [1120, 1260], li0: [1240, 1330], li1: [1240, 1470], sp4: [700, 1470], li3: [270, 1470], li4: [270, 1585], anus: [270, 1650], wglass: [870, 725, 62, {look: 'glass'}]},
    edges: [
      ['lips', 'mouth', 34], ['mouth', 'throat', 28, {need: 'mouth', valve: false, msg: '음식물을 꼭꼭 씹고 침과 섞어야 삼킬 수 있어요.'}], ['throat', 'eso1', 24], ['eso1', 'eso2', 24], ['eso2', 'cardia', 24, {need: 'eso', msg: '식도에서 할 일을 먼저 해요.'}], ['cardia', 'stom', 26],
      ['stom', 'stom2', 60], ['stom2', 'pylor', 22, {need: 'stomach', msg: '위에서 할 일을 먼저 해요.'}], ['pylor', 'si0', 20, {look: 'small'}], ['si0', 'sp1', 20, {look: 'small'}], ['sp1', 'si1', 20, {look: 'small'}], ['si1', 'si2', 20, {look: 'small'}], ['si2', 'sp2', 20, {look: 'small'}], ['sp2', 'si3', 20, {look: 'small'}], ['si3', 'si4', 20, {look: 'small'}], ['si4', 'sp3', 20, {look: 'small'}], ['sp3', 'si5', 20, {look: 'small'}],
      ['si5', 'li0', 26, {look: 'large', need: 'small', msg: '작은창자에서 영양소와 물을 모두 흡수시켜요.'}], ['li0', 'li1', 30, {look: 'large'}], ['li1', 'sp4', 30, {look: 'large'}], ['sp4', 'li3', 30, {look: 'large'}], ['li3', 'li4', 28, {look: 'large', need: 'large', msg: '큰창자에서 할 일을 먼저 해요.'}], ['li4', 'anus', 22, {look: 'large'}],
      ['stom', 'wglass', 16, {look: 'glass'}],
    ],
    intro: '캡슐이 입에 들어왔어요. 방향키나 아래 단추로 움직이고, 「다음 장소로」를 누르면 다음 장소까지 저절로 가요.',
    cheer: '입에서 항문까지 여행 성공이에요',
    finish: '음식물은 입, 식도, 위, 작은창자, 큰창자를 지나며 소화되고, 영양소와 물은 흡수돼요. 남은 찌꺼기는 항문으로 나가요.',
    lockMsg: '아직 문이 닫혀 있어요. 지금 있는 곳에서 할 일을 먼저 해요.',
    stations: [
      {id: 'mouth', name: '입', cheer: '꼭꼭 씹으니 부드러워요', at: 'mouth', r: 95, lab: [0, -112], bp: [0.5, 0.12], info: '입이에요. 혀 위에 밥과 채소가 있어요. 이로 꼭꼭 씹어 봐요.',
        acts: [
          {id: 'chew', label: '꼭꼭 씹기', times: 3, run: (S, E, n) => { E.trigger('chew'); for (let i = 0; i < 6; i++) E.burst('crumb', 330, 240, 1, {speed: 70, life: 0.6, col: ['#fff7e6', '#7cc35a', '#f08a3c'][i % 3]}); return n < 3 ? '이가 음식물을 잘게 부숴요. 한 번 더 씹어 봐요.' : '이가 음식물을 아주 잘게 부쉈어요. 이제 혀로 침과 섞어요.'; }},
          {id: 'mix', label: '혀로 침과 섞기', need: ['chew'], needMsg: '먼저 꼭꼭 씹어 음식물을 잘게 부숴요.', run: (S, E) => { E.trigger('mix'); for (let i = 0; i < 8; i++) E.seek('saliva', 300 + i * 9, 140, 330 + (i - 4) * 4, 236, 0.7, {delay: i * 0.06}); return '혀가 음식물을 침과 섞어 부드럽게 뭉쳐요.'; }},
        ], doneMsg: ' 이제 삼킬 수 있어요. 식도로 내려가는 길이 열렸어요.'},
      {id: 'eso', name: '식도', cheer: '꿀꺽, 꿈틀꿈틀 내려가요', at: 'eso1', r: 72, lab: [70, -40], bp: [0.5, 0.26], info: '식도예요. 입과 위를 잇는 길쭉한 관이에요.',
        acts: [{id: 'push', label: '꿈틀 운동 보기', run: (S, E) => { E.trigger('eso'); return '식도는 음식물이 위로 이동하는 통로예요. 식도가 꿈틀거리며 음식물을 아래로 보내요.'; }}], doneMsg: ' 위로 들어가는 문이 열렸어요.'},
      {id: 'stomach', name: '위', cheer: '위가 꾸룩꾸룩 섞어요', at: [605, 870], r: 140, lab: [10, -150], bp: [0.6, 0.42], info: '위에 들어왔어요. 주머니처럼 생겼어요.',
        acts: [
          {id: 'churn', label: '위 주머니 꿈틀거리기', run: (S, E) => { E.trigger('churn'); E.shake(3, 0.6); return '위가 꿈틀거리며 음식물을 섞어요. 위는 음식물을 잠시 보관해요.'; }},
          {id: 'juice', label: '소화를 돕는 액체 뿌리기', run: (S, E) => { for (let i = 0; i < 12; i++) { const a = Math.PI * (1.1 + i * 0.07); E.seek('juice', 560 + Math.cos(a) * 100, 845 + Math.sin(a) * 100, E.A.food?.x ?? 600, E.A.food?.y ?? 870, 0.8, {delay: i * 0.05}); } return '소화를 돕는 액체가 음식물을 더 잘게 쪼개요.'; }},
        ], doneMsg: ' 작은창자로 가는 문이 열렸어요.'},
      {id: 'small', name: '작은창자', cheer: '영양소 흡수 완료예요', spots: ['sp1', 'sp2', 'sp3'], r: 62, lab: [0, -40], bp: [0.5, 0.55], spotDone: '이곳은 흡수를 마쳤어요. 다음으로 빛나는 곳에 가 봐요.', info: '작은창자예요. 꼬불꼬불하고 아주 길어요. 벽에서 빛나는 곳에 멈춰 흡수시켜 봐요.',
        acts: [{id: 'absorb', label: '영양소와 물 흡수시키기', perSpot: true, run: (S, E, n, spot) => {
          const p = E.N[['sp1', 'sp2', 'sp3'][spot]], vy = [1076, 1186, 1296][spot], f = E.A.food || p;
          for (let i = 0; i < 6; i++) E.seek(i % 3 ? 'nut' : 'water', f.x + (i - 3) * 6, f.y, p.x + (i - 3) * 14, vy, 0.9, {delay: i * 0.08, stay: 1.2, vx: 70});
          return ['작은창자에서 음식물이 더 잘게 쪼개지고, 영양소가 몸속으로 흡수돼요.', '물도 작은창자에서 몸속으로 흡수돼요.', '흡수된 영양소는 혈액에 실려 온몸으로 가요.'][spot];
        }}],
        onDone: (S, V) => { V.cargo ??= {}; V.cargo.nutrient = true; }, doneMsg: ' 남은 음식물 찌꺼기가 큰창자로 가요.'},
      {id: 'large', name: '큰창자', cheer: '찌꺼기에서 물을 쏙', spots: ['sp4'], r: 72, lab: [0, -48], bp: [0.32, 0.56], info: '큰창자예요. 작은창자보다 굵어요. 빛나는 곳에 멈춰 봐요.',
        acts: [{id: 'water', label: '찌꺼기에서 물 흡수시키기', run: (S, E) => { const f = E.A.food || E.N.sp4; for (let i = 0; i < 6; i++) E.seek('water', f.x, f.y, f.x + (i - 3) * 16, f.y + 60, 0.9, {delay: i * 0.07}); return '큰창자는 음식물 찌꺼기에서 물을 흡수해요. 찌꺼기가 단단해져요.'; }}], doneMsg: ' 항문 쪽 문이 열렸어요.'},
      {id: 'anus', name: '항문', cheer: '소화 여행 끝이에요', at: 'li4', r: 66, lab: [80, 0], bp: [0.5, 0.71], info: '항문이에요. 소화 여행의 마지막 장소예요.',
        acts: [{id: 'out', label: '찌꺼기 내보내기', run: (S) => { S.v.out = true; return '소화되지 않은 음식물 찌꺼기는 항문을 통해 몸 밖으로 나가요.'; }}]},
      {id: 'liver', name: '간, 쓸개, 이자', short: '간, 쓸개, 이자', cheer: '소화를 돕는 기관이에요', at: 'wglass', r: 64, optional: true, nolab: true, bp: [0.38, 0.4], info: '관찰 창이에요. 창밖으로 간, 쓸개, 이자가 보여요. 음식물은 이곳으로 지나가지 않아요.',
        acts: [{id: 'look', label: '간, 쓸개, 이자 살펴보기', run: () => '간, 쓸개, 이자는 음식물이 지나가지 않지만 소화를 도와요.'}]},
    ],
    update(S, E, dt) {
      const R = E.A.R ??= E.route(DIG_ROUTE);
      if (S.foodS == null) S.foodS = R.acc[1];
      if (S.v.out) { S.foodS = Math.min(R.len + 140, S.foodS + 140 * dt); return; }
      let lim = R.len;
      for (let i = 0; i < R.ids.length - 1; i++) { const e = E.edge(R.ids[i], R.ids[i + 1]); if (e && !E.open(e)) { lim = R.acc[i]; break; } }
      const goal = Math.min(lim, E.routeS(R, S.pos) - 36);
      if (goal > S.foodS) S.foodS = Math.min(goal, S.foodS + (E.RM ? 1e6 : 240 * dt));
    },
    world: drawDigest, hudBox: DIG_HUD, hud: digestHud,
  },
  breath: {
    owner: '축소 탐험 캡슐: 숨 여행 (모형)',
    label: '몸 밖에서 코, 숨관, 숨관가지를 지나 폐까지 공기와 함께 들어갔다가 다시 나오는 장면. 갈비뼈와 가로막이 움직여 가슴이 커지고 작아진다.',
    w: 1060, h: 1100, start: [120, 170], answer: 'breathed', bg: '#fbe1e5', body: true, blobs: {n: 80, col: 'rgba(230,150,165,.35)', r: 9},
    looks: {base: {rim: '#9a3b4c', wall: '#e58a99', lumen: '#eef8ff', dim: '#e2c9cf'}, air: {rim: '#9a3b4c', wall: '#e58a99', lumen: '#eef8ff', dim: '#e2c9cf'}, lung: {rim: '#9a3b4c', wall: '#f19aaa', lumen: '#fde3e8', dim: '#e8ccd2'}, sky: {rim: '#5a8fb8', wall: '#bfe0f5', lumen: '#eaf7ff', dim: '#d0e2ee'}},
    listTitle: '공기가 가는 길', speed: 170, busyMsg: '공기와 함께 움직이는 중이에요.',
    nodes: {air: [120, 170, 88, {look: 'sky'}], nose: [400, 170, 60], nt: [470, 250], tr1: [520, 330], trm: [520, 460], tr2: [520, 600], bl1: [400, 690], br1: [640, 690], lungL: [300, 850, 130, {look: 'lung'}], lungR: [740, 850, 130, {look: 'lung'}]},
    edges: [
      ['air', 'nose', 30, {need: 'air', valve: false, look: 'air', msg: '가슴이 커져야 공기와 함께 코로 들어갈 수 있어요.'}], ['nose', 'nt', 26, {need: 'nose', valve: false, look: 'air', msg: '숨을 더 들이마셔야 공기와 함께 내려갈 수 있어요.'}], ['nt', 'tr1', 26, {need: 'nose', valve: false, look: 'air'}], ['tr1', 'trm', 26, {need: 'nose', valve: false, look: 'air', rings: true}], ['trm', 'tr2', 26, {need: 'trachea', valve: false, look: 'air', rings: true, msg: '숨을 더 들이마셔야 공기와 함께 내려갈 수 있어요.'}],
      ['tr2', 'bl1', 22, {need: 'branch', valve: false, look: 'air', rings: true, msg: '숨관가지에서 숨을 들이마셔 봐요.', when: (S) => !S.done.lung || S.v.exhaling}], ['tr2', 'br1', 22, {need: 'branch', valve: false, look: 'air', rings: true, msg: '숨관가지에서 숨을 들이마셔 봐요.', when: (S) => !S.done.lung || S.v.exhaling}],
      ['bl1', 'lungL', 20, {need: 'branch', valve: false, look: 'air', when: (S) => !S.done.lung || S.v.exhaling, msg: '숨을 내쉬어야 공기와 함께 나갈 수 있어요.'}], ['br1', 'lungR', 20, {need: 'branch', valve: false, look: 'air', when: (S) => !S.done.lung || S.v.exhaling, msg: '숨을 내쉬어야 공기와 함께 나갈 수 있어요.'}],
    ],
    intro: '캡슐이 몸 밖 공기 속에 있어요. 공기와 함께 폐까지 들어가 봐요. 숨쉬기 단추를 누르면 가슴이 움직이고 공기가 흘러요.',
    cheer: '숨 여행 성공이에요',
    finish: '숨을 들이마실 때 공기는 코, 숨관, 숨관가지를 지나 폐로 가고, 내쉴 때는 폐, 숨관가지, 숨관, 코를 지나 몸 밖으로 나가요.',
    blocked: '숨을 들이마시거나 내쉬어야 공기와 함께 다음 장소로 갈 수 있어요.',
    next: (S) => (S.v.exhaling ? 'exit' : S.done.lung && !S.v.exhaled ? 'lung' : null),
    // 숨을 내쉬며 실려 나가던 중에 끊겼으면 폐(마지막으로 마친 장소)에서 다시 내쉬게 한다
    init: (S) => { if (S.v.exhaling && !S.v.exhaled) S.v.exhaling = false; },
    stations: [
      {id: 'air', name: '몸 밖', cheer: '가슴이 커지니 공기가 쑥', at: 'air', r: 88, lab: [0, -96], bp: [0.12, 0.06], info: '몸 밖 공기 속이에요. 공기에는 산소가 들어 있어요.',
        acts: [
          {id: 'still', label: '가슴 그대로 두기', run: (S, E) => { E.trigger('still'); return '가슴 크기가 그대로이니 공기가 코로 들어오지 않아요. 코가 공기를 빨아들이는 것이 아니에요.'; }},
          {id: 'in', label: '숨 들이마시기', need: ['still'], needMsg: '먼저 가슴을 그대로 두면 공기가 들어오는지 살펴봐요.', run: (S, E) => { S.v.chest = 0.3; E.ride('nose', {wind: 1}); return '갈비뼈가 올라가고 가로막이 내려가 가슴이 커져요. 그러자 공기가 코로 들어와요.'; }},
        ]},
      {id: 'nose', name: '코', cheer: '코로 공기가 들어왔어요', at: 'nose', r: 60, lab: [0, -70], bp: [0.5, 0.11], info: '코예요. 공기가 드나드는 곳이에요.',
        acts: [{id: 'in', label: '계속 들이마시기', run: (S, E) => { S.v.chest = 0.55; E.ride('trm', {wind: 1}); return '가슴이 더 커지며 공기가 숨관으로 내려가요.'; }}]},
      {id: 'trachea', name: '숨관', cheer: '숨관을 따라 쭉 내려가요', at: 'trm', r: 60, lab: [90, 0], bp: [0.5, 0.22], info: '숨관이에요. 코와 숨관가지를 잇는 굵은 관으로, 공기가 지나가는 길이에요.',
        acts: [{id: 'in', label: '계속 들이마시기', run: (S, E) => { S.v.chest = 0.78; E.ride('tr2', {wind: 1}); return '공기가 숨관을 따라 숨관가지로 내려가요.'; }}]},
      {id: 'branch', name: '숨관가지', cheer: '나뭇가지처럼 갈라져요', at: 'tr2', r: 56, lab: [0, -62], bp: [0.5, 0.3], info: '숨관가지예요. 숨관이 나뭇가지처럼 갈라져 양쪽 폐로 이어져요.',
        acts: [{id: 'go', choices: [
          {id: 'left', label: '왼쪽 폐로 들이마시기', ok: true, run: (S, E) => { S.v.chest = 1; E.ride('lungL', {wind: 1}); return '숨관가지를 따라 폐 속으로 들어가요. 가슴이 가장 크게 부풀었어요.'; }},
          {id: 'right', label: '오른쪽 폐로 들이마시기', ok: true, run: (S, E) => { S.v.chest = 1; E.ride('lungR', {wind: 1}); return '숨관가지를 따라 폐 속으로 들어가요. 가슴이 가장 크게 부풀었어요.'; }},
        ]}]},
      {id: 'lung', name: '폐', cheer: '산소를 받아들였어요', spots: ['lungL', 'lungR'], anySpot: true, r: 120, lab: [0, -100], bp: [0.36, 0.34], info: '폐예요. 가슴 양쪽에 하나씩 있어요. 폐 속 공기 가까이에 혈관이 지나가요.',
        acts: [
          {id: 'swap', label: '산소와 이산화 탄소 바꾸기', perSpot: true, run: (S, E, n, spot) => { const p = E.N[spot ? 'lungR' : 'lungL']; for (let i = 0; i < 6; i++) { const a = i * 1.05; E.seek('o2', p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, p.x + Math.cos(a) * 75, p.y + Math.sin(a) * 75, 1, {delay: i * 0.08, stay: 1}); E.seek('co2', p.x + Math.cos(a + 0.5) * 80, p.y + Math.sin(a + 0.5) * 80, p.x + Math.cos(a + 0.5) * 28, p.y + Math.sin(a + 0.5) * 28, 1, {delay: 0.3 + i * 0.08, stay: 1.4}); } S.v.swapped = true; return '몸 밖에서 들어온 산소는 폐에서 혈액으로 들어가고, 몸 안에서 생긴 이산화 탄소는 폐 속 공기로 나와요.'; }},
          {id: 'out', label: '숨 내쉬기', optional: true, need: (S) => (!S.v.swapped ? '먼저 폐에서 산소와 이산화 탄소를 바꿔 봐요.' : null), show: (S) => !S.v.exhaled, run: (S, E) => { S.v.chest = 0; S.v.exhaling = true; E.ride('air', {wind: -1, speed: 260, then: () => { S.v.exhaled = true; S.v.exhaling = false; }}); return '갈비뼈가 내려가고 가로막이 올라가 가슴이 작아져요. 이산화 탄소가 많아진 공기가 폐, 숨관가지, 숨관, 코를 지나 밖으로 나가요.'; }},
        ], onDone: (S, V) => { V.cargo ??= {}; V.cargo.oxygen = true; }, doneMsg: ' 이제 숨을 내쉬어 봐요.'},
      {id: 'exit', name: '다시 몸 밖', cheer: '후, 다시 바깥이에요', at: 'air', r: 88, nolab: true, bp: [0.12, 0.06], info: '', again: '', acts: [], done: (S) => !!S.v.exhaled},
    ],
    back: breathBack, world: drawBreath, hudBox: BR_HUD, hud: breathHud,
  },
  blood: {
    owner: '축소 탐험 캡슐: 혈액 배달 (모형)',
    label: '심장을 가운데 두고 폐, 작은창자, 근육, 콩팥으로 이어진 혈관 길. 심장이 혈액을 밀어 보내면 혈액이 혈관을 따라 온몸을 돈다.',
    w: 1300, h: 1000, start: [650, 470], answer: 'delivered', bg: '#3b1622', body: true, flowSlow: true, blobs: {n: 90, col: 'rgba(200,60,80,.25)', r: 10},
    looks: {base: {rim: '#5a0f1c', wall: '#a3283a', lumen: '#d9475a', dim: '#7a3a45'}, vein: {rim: '#4a0f22', wall: '#8a2448', lumen: '#b84468', dim: '#6a3a4a'}, organ: {rim: '#5a0f1c', wall: '#7a2a36', lumen: '#5e2030', dim: '#4a2a30'}},
    miniCol: 'rgba(255,120,130,.9)', listTitle: '배달 길', speed: 175,
    nodes: {heart: [650, 470, 85, {look: 'organ'}], la1: [600, 370], la2: [585, 215], lung: [650, 125, 72, {look: 'organ'}], lb2: [715, 215], lb1: [700, 370], ga1: [560, 440], ga2: [390, 410], gut: [235, 500, 78, {look: 'organ'}], gb2: [390, 590], gb1: [565, 515], ma1: [610, 570], ma2: [575, 760], musc: [650, 880, 82, {look: 'organ'}], mb2: [725, 760], mb1: [690, 570], ka1: [740, 440], ka2: [910, 410], kid: [1065, 500, 70, {look: 'organ'}], kb2: [910, 590], kb1: [735, 515]},
    edges: [
      ['heart', 'la1', 20, {one: 1}], ['la1', 'la2', 20, {one: 1}], ['la2', 'lung', 20, {one: 1}], ['lung', 'lb2', 20, {one: 1, look: 'vein'}], ['lb2', 'lb1', 20, {one: 1, look: 'vein'}], ['lb1', 'heart', 20, {one: 1, look: 'vein'}],
      ['heart', 'ga1', 20, {one: 1}], ['ga1', 'ga2', 20, {one: 1}], ['ga2', 'gut', 20, {one: 1}], ['gut', 'gb2', 20, {one: 1, look: 'vein'}], ['gb2', 'gb1', 20, {one: 1, look: 'vein'}], ['gb1', 'heart', 20, {one: 1, look: 'vein'}],
      ['heart', 'ma1', 20, {one: 1}], ['ma1', 'ma2', 20, {one: 1}], ['ma2', 'musc', 20, {one: 1}], ['musc', 'mb2', 20, {one: 1, look: 'vein'}], ['mb2', 'mb1', 20, {one: 1, look: 'vein'}], ['mb1', 'heart', 20, {one: 1, look: 'vein'}],
      ['heart', 'ka1', 20, {one: 1}], ['ka1', 'ka2', 20, {one: 1}], ['ka2', 'kid', 20, {one: 1}], ['kid', 'kb2', 20, {one: 1, look: 'vein'}], ['kb2', 'kb1', 20, {one: 1, look: 'vein'}], ['kb1', 'heart', 20, {one: 1, look: 'vein'}],
    ],
    init: (S) => { S.cargo ??= {}; },
    intro: '캡슐이 심장 속 혈액에 올라탔어요. 혈관은 한쪽으로 흘러요. 방향키나 아래 단추로 움직이고, 「다음 장소로」로 배달 장소에 가 봐요.',
    cheer: '혈액 배달 성공이에요',
    finish: '심장의 펌프 작용으로 혈액이 혈관을 따라 온몸을 돌며 영양소와 산소를 전달하고, 노폐물을 싣고 다시 심장으로 돌아와요.',
    stations: [
      {id: 'heart', name: '심장', cheer: '두근두근 출발해요', at: 'heart', r: 84, lab: [0, 104], bp: [0.55, 0.36], info: '심장이에요. 주먹만 한 크기의 근육으로 된 주머니예요. 펌프를 눌러 봐요.',
        acts: [{id: 'pump', label: '펌프 누르기', times: 4, run: (S, E, n, sp, again) => { E.A.beatT = E.t; E.shake(3, 0.25); return again ? '심장이 오므라들며 혈액을 밀어 보내요.' : n < 4 ? '심장이 오므라들며 혈액을 혈관으로 밀어 보내요. 더 눌러 봐요.' : '심장이 펌프처럼 혈액을 힘차게 밀어 보내요. 펌프 실험의 펌프가 심장을 나타내요.'; }}], doneMsg: ' 이제 혈관을 따라 폐로 가 봐요.'},
      {id: 'lung', name: '폐', cheer: '산소를 실었어요', at: 'lung', r: 74, lab: [120, 0], bp: [0.38, 0.32], info: '폐 둘레의 혈관에 왔어요.',
        acts: [{id: 'o2', label: '산소 싣기', run: (S, E) => { S.cargo.o2 = true; for (let i = 0; i < 6; i++) E.seek('o2', 650 + (i - 3) * 20, 100, S.pos.x, S.pos.y, 0.8, {delay: i * 0.07}); return '폐에서 혈액이 산소를 받아요. 숨을 쉬어 폐로 들어온 산소예요.'; }}]},
      {id: 'gut', name: '작은창자', cheer: '영양소를 실었어요', at: 'gut', r: 78, lab: [0, -96], bp: [0.5, 0.55], info: '작은창자 둘레의 혈관에 왔어요.',
        acts: [{id: 'nut', label: '영양소 싣기', run: (S, E) => { S.cargo.nut = true; for (let i = 0; i < 6; i++) E.seek('nut', 235 + (i - 3) * 16, 540, S.pos.x, S.pos.y, 0.8, {delay: i * 0.07}); return '작은창자에서 흡수된 영양소가 혈액에 실려요.'; }}]},
      {id: 'muscle', name: '근육', cheer: '근육에 배달 완료예요', at: 'musc', r: 82, lab: [140, 0], bp: [0.42, 0.84], info: '다리 근육이에요. 근육이 일하려면 영양소와 산소가 필요해요.',
        acts: [
          {id: 'give', label: '영양소와 산소 내려놓기', need: (S) => (!S.cargo.o2 || !S.cargo.nut ? '아직 싣지 않은 것이 있어요. 폐에서 산소를, 작은창자에서 영양소를 싣고 와요.' : null), run: (S, E) => { S.cargo.o2 = false; S.cargo.nut = false; E.trigger('flex'); E.seek('o2', S.pos.x, S.pos.y, 650, 880, 0.7); E.seek('nut', S.pos.x, S.pos.y, 640, 870, 0.7, {delay: 0.1}); return '혈액이 근육에 영양소와 산소를 내려놓아요. 근육이 힘을 내요.'; }},
          {id: 'take', label: '노폐물 싣기', need: ['give'], needMsg: '먼저 영양소와 산소를 내려놓아요.', run: (S, E) => { S.cargo.waste = true; for (let i = 0; i < 4; i++) E.seek('waste', 650 + (i - 2) * 18, 900, S.pos.x, S.pos.y, 0.8, {delay: i * 0.08}); return '근육이 일하면서 생긴 노폐물과 이산화 탄소를 혈액이 싣고 돌아가요.'; }},
        ], doneMsg: ' 이제 혈관을 따라 심장으로 돌아가요.'},
      {id: 'back', name: '다시 심장으로', cheer: '온몸 한 바퀴 성공이에요', at: 'heart', r: 84, nolab: true, bp: [0.55, 0.36], ready: (S) => !!S.done.muscle, info: '심장으로 돌아왔어요.', acts: [], done: (S) => !!S.v.home, doneMsg: ' 혈액이 온몸을 한 바퀴 돌아 다시 심장으로 돌아왔어요.'},
      {id: 'kidney', name: '콩팥', at: 'kid', r: 70, hidden: true, nolab: true, info: '콩팥 둘레의 혈관이에요. 노폐물 청소 여행에서 자세히 살펴봐요.', acts: [], done: () => false},
    ],
    update(S, E) { if (S.done.muscle && !S.v.home && hyp(S.pos.x, S.pos.y, E.N.heart.x, E.N.heart.y) < 80) S.v.home = true; },
    world: drawBlood, hudBox: BL_HUD, hud: bloodHud,
  },
  waste: {
    owner: '축소 탐험 캡슐: 노폐물 청소 (모형)',
    label: '노폐물이 많아진 혈액이 심장에서 콩팥으로 가고, 콩팥이 노폐물을 걸러 오줌을 만들며, 오줌이 방광에 모였다가 몸 밖으로 나가는 장면.',
    w: 1000, h: 1080, start: [520, 170], answer: 'cleaned', bg: '#2e1a2c', body: true, flowSlow: true, blobs: {n: 70, col: 'rgba(170,80,120,.22)', r: 10},
    looks: {base: {rim: '#5a0f1c', wall: '#a3283a', lumen: '#d9475a', dim: '#6a3a45'}, clean: {rim: '#5a0f1c', wall: '#c23040', lumen: '#ff6a6a', dim: '#6a3a45'}, urine: {rim: '#7a5a10', wall: '#d9b23a', lumen: '#fff1b8', dim: '#6a5a3a'}, organ: {rim: '#3a1020', wall: '#6a2a3a', lumen: '#4e2232', dim: '#3a2a30'}, bag: {rim: '#7a5a10', wall: '#e6c98a', lumen: '#fff6dc', dim: '#5a4a3a'}},
    miniCol: 'rgba(255,170,150,.9)', listTitle: '노폐물이 가는 길', speed: 175,
    nodes: {heart: [520, 170, 74, {look: 'organ'}], a1: [520, 300], kid: [520, 430, 80, {look: 'organ'}], r1: [700, 380], r2: [700, 220], body1: [380, 140], bodyOut: [210, 110], u1: [520, 540], u2: [520, 720], blad: [520, 830, 86, {look: 'bag', need: 'kidney'}], ex: [520, 1000]},
    edges: [
      ['heart', 'a1', 22, {one: 1, need: 'heart', valve: false, msg: '심장에서 펌프를 먼저 눌러요.'}], ['a1', 'kid', 22, {one: 1, need: 'heart', valve: false}],
      ['kid', 'r1', 20, {one: 1, need: 'kidney', valve: false, look: 'clean', msg: '콩팥에서 노폐물을 먼저 걸러요.'}], ['r1', 'r2', 20, {one: 1, need: 'kidney', valve: false, look: 'clean'}], ['r2', 'heart', 20, {one: 1, need: 'kidney', valve: false, look: 'clean'}],
      ['heart', 'body1', 20, {one: 1, need: 'kidney', valve: false, look: 'clean'}], ['body1', 'bodyOut', 20, {one: 1, need: 'kidney', valve: false, look: 'clean'}],
      ['kid', 'u1', 16, {one: 1, need: 'kidney', valve: false, look: 'urine', msg: '콩팥에서 노폐물을 걸러야 오줌이 만들어져요.'}], ['u1', 'u2', 16, {one: 1, need: 'kidney', valve: false, look: 'urine'}], ['u2', 'blad', 16, {one: 1, need: 'kidney', valve: false, look: 'urine'}],
      ['blad', 'ex', 14, {deco: true, look: 'urine'}],
    ],
    intro: '근육에서 생긴 노폐물을 실은 혈액이 심장에 모였어요. 혈액과 함께 콩팥으로 가 봐요.',
    cheer: '노폐물 청소 성공이에요',
    finish: '콩팥이 혈액 속 노폐물을 걸러 오줌을 만들고, 오줌은 방광에 모였다가 몸 밖으로 나가요. 노폐물이 걸러진 혈액은 다시 온몸을 순환해요.',
    stations: [
      {id: 'heart', name: '심장', cheer: '콩팥으로 출발해요', at: 'heart', r: 74, lab: [0, -84], bp: [0.55, 0.36], info: '심장이에요. 노폐물이 많아진 혈액이 모였어요.',
        acts: [{id: 'pump', label: '펌프 누르기', times: 2, run: (S, E, n) => { E.A.beatT = E.t; return n < 2 ? '심장이 혈액을 콩팥 쪽으로 밀어 보내요. 한 번 더 눌러 봐요.' : '노폐물이 많아진 혈액이 콩팥으로 가는 길이 열렸어요.'; }}]},
      {id: 'kidney', name: '콩팥', cheer: '노폐물을 걸러 냈어요', at: 'kid', r: 80, lab: [130, -20], bp: [0.42, 0.5], info: '콩팥이에요. 강낭콩 모양이고 등 쪽 허리 높이에 두 개 있어요.',
        acts: [
          {id: 'filter', label: '노폐물 거르기', times: 3, run: (S, E, n) => { E.trigger('filter'); for (let i = 0; i < 4; i++) E.seek('waste', 510 + (i - 2) * 10, 400, 520, 540 + i * 8, 0.8, {delay: i * 0.08}); E.seek('urine', 520, 500, 520, 600, 0.8, {delay: 0.5, stay: 1}); return n < 3 ? '콩팥이 혈액 속 노폐물을 걸러 내요. 더 걸러 봐요.' : '걸러 낸 노폐물로 오줌이 만들어져요.'; }},
          {id: 'clean', label: '깨끗해진 혈액 보내기', need: ['filter'], needMsg: '먼저 노폐물을 다 걸러요.', run: (S, E) => { for (let i = 0; i < 6; i++) E.seek('cell', 560, 420, 700, 300, 0.9, {delay: i * 0.1}); return '노폐물이 걸러진 깨끗한 혈액은 다시 온몸을 순환해요.'; }},
        ], doneMsg: ' 오줌이 지나가는 길이 열렸어요. 오줌을 따라가 봐요.'},
      {id: 'bladder', name: '방광', cheer: '노폐물 청소 끝이에요', at: 'blad', r: 86, lab: [140, 0], bp: [0.5, 0.66], info: '방광이에요. 오줌을 모아 두는 주머니예요.',
        acts: [
          {id: 'fill', label: '오줌 모으기', times: 2, run: (S, E, n) => { S.v.fill = n / 2; for (let i = 0; i < 5; i++) E.seek('urine', 520, 700, 520 + (i - 2) * 14, 840, 0.8, {delay: i * 0.08}); return n < 2 ? '오줌이 방광에 모여요.' : '방광에 오줌이 가득 모였어요.'; }},
          {id: 'out', label: '몸 밖으로 내보내기', need: ['fill'], needMsg: '먼저 오줌을 모아요.', run: (S, E) => { E.trigger('pee'); S.v.fill = 0; return '방광에 모인 오줌은 몸 밖으로 나가요.'; }},
        ]},
    ],
    world: drawWaste, hudBox: WS_HUD, hud: wasteHud,
  },
  together: {
    owner: '축소 탐험 캡슐: 달리는 몸 속 관찰 (모형)',
    label: '몸이 1분 동안 제자리 달리기를 하는 동안 몸속에 머물며 심장, 폐, 다리 근육의 변화를 관찰하고 체온과 심장 박동 수를 재는 장면.',
    w: 1000, h: 900, rects: [[310, 158, 690, 600], [372, 590, 470, 830]], start: [500, 252], answer: 'measured', bg: '#1b2738',
    speed: 180, listTitle: (S) => (S.phase === 'run' ? '달리는 중이에요' : S.phase === 'resting' ? '쉬는 중이에요' : '관찰할 것'),
    // 5분 쉬는 중(시간이 지나면 rested)에 끊겼으면 쉬기를 마친 것으로 이어 간다
    init: (S) => { S.rec ??= []; S.obs ??= {}; S.phase ??= 'rest'; if (S.phase === 'resting') S.phase = 'rested'; },
    intro: '캡슐이 몸속에 들어왔어요. 측정석에서 평상시 체온과 심장 박동 수부터 재 봐요.',
    cheer: '달리는 몸 관찰 완료예요',
    finish: '운동을 하면 호흡과 심장 박동이 빨라지고 체온이 올라가요. 쉬고 나면 다시 평상시 몸 상태로 돌아가요. 근육이 움직이려면 소화, 호흡, 순환, 배설기관이 함께 일해요.',
    next: (S) => { if (!S.rec.length || S.phase === 'rest') return 'obs'; if (S.phase === 'run') return ['heart', 'lung', 'muscle'].find((k) => !S.obs[k]) || 'obs'; return S.rec.length >= 3 ? null : 'obs'; },
    checklist: (S) => [['평상시 재기', S.rec.length >= 1], ['심장 살펴보기', !!S.obs.heart], ['폐 살펴보기', !!S.obs.lung], ['근육 살펴보기', !!S.obs.muscle], ['달리기 직후 재기', S.rec.length >= 2], ['5분 쉰 뒤 재기', S.rec.length >= 3]],
    stations: [
      {id: 'obs', name: '측정석', cheer: '세 번 모두 쟀어요', at: [500, 200], r: 56, lab: [0, -36], info: '측정석이에요. 체온과 심장 박동 수를 재요.', done: (S) => S.rec.length >= 3,
        acts: [
          {id: 'm0', label: '평상시 재기', go: true, show: (S) => !S.rec.length, run: (S) => { S.rec = ['rest']; return '평상시 체온은 36.5 °C, 심장 박동 수는 1분에 84번이에요. 모형 값이에요.'; }},
          {id: 'run', label: '1분 제자리 달리기', go: true, show: (S) => S.rec.length === 1 && S.phase === 'rest', run: (S, E) => { S.phase = 'run'; E.shake(2, 1); return '몸이 제자리 달리기를 시작했어요. 달리는 동안 심장, 폐, 다리 근육을 살펴봐요.'; }},
          {id: 'm1', label: '달리기 직후 재기', go: true, show: (S) => S.phase === 'run', need: (S) => (['heart', 'lung', 'muscle'].some((k) => !S.obs[k]) ? '심장, 폐, 다리 근육을 먼저 살펴봐요.' : null), run: (S) => { S.rec = ['rest', 'run']; S.phase = 'after'; return '1분 제자리 달리기를 한 직후예요. 체온은 37.0 °C로 올라가고, 심장 박동 수는 1분에 128번으로 늘었어요.'; }},
          {id: 'rest', label: '5분 쉬기', go: true, show: (S) => S.phase === 'after', run: (S, E) => { S.phase = 'resting'; setTimeout(() => { if (S.phase === 'resting') S.phase = 'rested'; }, E.RM ? 0 : 2200); return '5분 동안 쉬어요. 심장이 점점 천천히 뛰어요.'; }},
          {id: 'm2', label: '5분 쉰 뒤 재기', go: true, show: (S) => S.phase === 'resting' || S.phase === 'rested', need: (S) => (S.phase !== 'rested' ? '아직 쉬는 중이에요. 조금만 기다려요.' : null), run: (S) => { S.rec = ['rest', 'run', 'after']; S.phase = 'done'; return '5분 쉰 뒤에는 체온 36.6 °C, 심장 박동 수는 1분에 90번으로 평상시와 비슷해졌어요.'; }},
        ]},
      {id: 'heart', name: '심장', cheer: '심장이 쿵쾅쿵쾅 빨라요', at: [545, 340], r: 50, lab: [76, 0], done: (S) => !!S.obs.heart, info: '심장이에요.',
        acts: [{id: 'look', label: '심장 살펴보기', need: (S) => (S.phase !== 'run' ? '몸이 달리기를 할 때 살펴봐요.' : null), run: (S) => { S.obs.heart = true; return '심장이 평상시보다 빨리 뛰어요. 혈액이 영양소와 산소를 근육에 더 빨리 날라요.'; }}]},
      {id: 'lung', name: '폐', cheer: '숨이 헉헉 빨라요', at: [410, 300], r: 55, lab: [-70, -40], done: (S) => !!S.obs.lung, info: '폐예요.',
        acts: [{id: 'look', label: '폐 살펴보기', need: (S) => (S.phase !== 'run' ? '몸이 달리기를 할 때 살펴봐요.' : null), run: (S) => { S.obs.lung = true; return '숨을 더 빠르고 깊게 쉬어요. 산소를 더 많이 받아들이고 이산화 탄소를 더 많이 내보내요.'; }}]},
      {id: 'muscle', name: '다리 근육', cheer: '다리 근육이 후끈해요', at: [420, 720], r: 62, lab: [100, -40], done: (S) => !!S.obs.muscle, info: '다리 근육이에요.',
        acts: [{id: 'look', label: '근육 살펴보기', need: (S) => (S.phase !== 'run' ? '몸이 달리기를 할 때 살펴봐요.' : null), run: (S) => { S.obs.muscle = true; return '달리는 다리 근육이 영양소와 산소를 더 많이 써요. 근육에서 열이 나서 체온이 올라가요.'; }}]},
    ],
    world: drawTogether, mini: BODY_MINI, hudBox: EX_HUD, hud: togetherHud,
  },
  patrol: {
    owner: '축소 탐험 캡슐: 몸속 건강 순찰 (모형)',
    label: '순찰 본부를 가운데 두고 호흡기관, 소화기관, 순환기관, 배설기관 구역이 길로 이어진 몸속 순찰 지도. 구역마다 질병 안내를 보고 예방 습관을 고른다.',
    w: 1300, h: 900, start: [650, 450], answer: 'patrolled', bg: '#0f2f35', blobs: {n: 70, col: 'rgba(90,200,190,.16)', r: 9},
    looks: {base: {rim: '#0a4a4a', wall: '#2a8a86', lumen: '#8fcfc6', dim: '#4a6a6a'}, zone: {rim: '#0a3a40', wall: '#3a7a80', lumen: '#e3f7f3', dim: '#4a6a6a'}},
    miniCol: 'rgba(160,240,230,.9)', listTitle: '순찰할 곳', speed: 190,
    nodes: {hub: [650, 450, 78, {look: 'zone'}], res: [290, 200, 105, {look: 'zone'}], cir: [1010, 200, 105, {look: 'zone'}], dig: [290, 700, 105, {look: 'zone'}], exc: [1010, 700, 105, {look: 'zone'}]},
    edges: [['hub', 'res', 28], ['hub', 'cir', 28], ['hub', 'dig', 28], ['hub', 'exc', 28]],
    intro: '건강 순찰을 시작해요. 기관 구역마다 질병 안내를 보고, 그 기관을 지키는 예방 습관을 골라 방패를 세워요.',
    cheer: '네 기관 모두 튼튼해요',
    finish: '네 기관 모두 예방 방패를 세웠어요. 질병이 생기면 빠르게 치료해야 하지만, 생기지 않도록 날마다 예방 습관을 지키는 것이 더 좋아요.',
    stations: [
      zoneStation('res', 'res', [0, -118]), zoneStation('dig', 'dig', [0, 130]), zoneStation('cir', 'cir', [0, -118]), zoneStation('exc', 'exc', [0, 130]),
      {id: 'hub', name: '순찰 본부', cheer: '30일 동안 튼튼해요', at: 'hub', r: 76, lab: [0, -88], info: '순찰 본부예요. 네 기관에 예방 방패를 모두 세운 뒤 30일 동안 지켜봐요.',
        acts: [{id: 'days', label: '30일 지켜보기', go: true, need: (S) => (['res', 'dig', 'cir', 'exc'].some((k) => !S.done[k]) ? '아직 예방 방패가 없는 기관이 있어요. 네 구역을 모두 순찰해요.' : null), run: (S) => { S.v.days = 30; return '예방 습관을 30일 동안 꾸준히 지켰더니 네 기관 모두 튼튼하게 일해요. 계기판 값은 모형 값이에요.'; }}]},
    ],
    world: drawPatrol, hudBox: PT_HUD, hud: patrolHud,
  },
  diary: {
    owner: '축소 탐험 캡슐: 친구 일기 속으로 (모형)',
    label: '친구의 몸속을 잘라 본 모습. 입, 식도, 폐, 가로막, 위가 보인다. 허겁지겁 먹고 곧장 축구를 한 날과 습관을 바꾼 날을 비교한다.',
    w: 1000, h: 820, rects: [[90, 70, 910, 790]], start: [380, 130], answer: 'changed', bg: '#f6eddf',
    speed: 185, listTitle: '일기 속 장면',
    intro: '친구의 일기 속 점심시간으로 들어왔어요. 먼저 일기에 쓰인 대로 해 보고, 몸속에서 무슨 일이 생기는지 살펴봐요.',
    cheer: '바꾼 습관 덕분이에요',
    finish: '좋지 않은 습관을 바꾸니 소화기관과 호흡기관이 편안해졌어요.',
    stations: [
      {id: 'mouth', name: '입', cheer: '허겁지겁 꿀꺽', at: [500, 135], r: 64, lab: [0, -48], info: '입이에요. 점심을 먹는 곳이에요.',
        acts: [{id: 'gulp', label: '일기처럼 허겁지겁 먹기', run: (S, E) => { S.v.food = 'big'; E.trigger('gulp'); return '잘 씹지 않은 큰 덩어리가 급하게 위로 내려가요.'; }}]},
      {id: 'stomach', name: '위', cheer: '속이 답답해요', at: [585, 545], r: 82, lab: [-110, 60], info: '위예요. 음식물을 잠시 보관하며 잘게 쪼개요.',
        acts: [{id: 'soccer', label: '곧장 축구하기', need: (S) => (S.v.food !== 'big' ? '먼저 입에서 점심을 먹어요.' : null), run: (S, E) => { S.v.run = true; S.v.cA = 0.22; E.shake(3, 1.2); return '먹자마자 뛰니 위가 큰 덩어리를 잘게 쪼개기 힘들어요. 속이 점점 답답해져요.'; }}]},
      {id: 'chest', name: '가슴', cheer: '숨쉬기도 힘들어요', at: [500, 330], r: 66, lab: [0, -76], info: '가슴이에요. 폐와 가로막이 보여요.',
        acts: [{id: 'breath', label: '숨쉬기 살펴보기', need: (S) => (!S.v.run ? '먼저 위에서 축구를 시작해 봐요.' : null), run: () => '음식이 가득 차 부푼 위가 가로막을 밀면 가로막이 잘 내려가지 못해 숨쉬기가 힘들 수 있어요. 일기 속 친구는 보건실에 갔고, 보건 선생님께서 체한 것 같다고 하셨대요.'}]},
      {id: 'change', name: '습관 바꾸기', cheer: '속이 편안해요', at: [500, 135], r: 64, nolab: true, ready: (S) => !!S.done.chest, done: (S) => !!S.v.good, info: '입으로 돌아왔어요. 바꿀 습관을 골라 다시 해 봐요.',
        acts: [
          {id: 'chew', label: '꼭꼭 씹어 먹기', toggle: true, run: (S, E, on) => (on ? '꼭꼭 씹어 먹기로 했어요.' : '꼭꼭 씹어 먹기를 뺐어요.')},
          {id: 'slow', label: '천천히 먹기', toggle: true, run: (S, E, on) => (on ? '천천히 먹기로 했어요.' : '천천히 먹기를 뺐어요.')},
          {id: 'rest', label: '먹고 바로 뛰지 않기', toggle: true, run: (S, E, on) => (on ? '먹은 뒤 조금 쉬었다가 뛰기로 했어요.' : '먹고 바로 뛰지 않기를 뺐어요.')},
          {id: 'replay', label: '바꾼 습관으로 다시 해 보기', go: true, run: (S, E) => {
            const g = S.v.tg || {}, n = ['chew', 'slow', 'rest'].filter((k) => g[k]).length;
            if (!n) return '아직 바꾼 습관이 없어요. 바꿀 습관을 골라 봐요.';
            E.trigger('replay');
            if (n === 3) { S.v.good = true; S.v.food = 'small'; S.v.cB = 0.92; return '꼭꼭 씹어 천천히 먹고, 먹은 뒤 조금 쉬었다가 뛰었더니 위가 음식물을 잘 쪼개요. 속도 편안하고 숨쉬기도 편해요.'; }
            S.v.cB = 0.3 + n * 0.15;
            // 고른 습관에 맞게 남은 불편함을 말한다(고르지 않은 습관을 한 것처럼 말하지 않는다).
            const left = [];
            if (!g.chew || !g.slow) left.push('아직 큰 덩어리가 남아 위가 힘들어요.');
            if (!g.rest) left.push('먹자마자 뛰니 속이 조금 불편해요.');
            return left.join(' ') + ' 아직 고르지 않은 습관도 살펴봐요.';
          }},
        ]},
    ],
    world: drawDiary, mini: DIARY_MINI, hudBox: DY_HUD, hud: diaryHud,
  },
};

export const VOYAGE_COMPONENTS = {voyage};
// 다른 모듈이 같은 탐험 엔진으로 새 장면을 더할 때 쓴다(얼어 있던 땅 탐사 mission-tundra.mjs). 장면 자료의 꼴은 위 MODES와 같다.
export function addVoyageModes(more) { Object.assign(MODES, more); }
export const VOY = {FONT, INK, rr, txt, panel, dot, oval, line, bar, arrowHead, star, drop, eyes, clamp, lerp, seeded};
