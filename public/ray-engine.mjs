// 빛 경로 계산(화면 없이 쓰는 순수 함수). 빛 공방 거리의 퍼즐과 설계 상자가 함께 쓴다.
// 빛은 한 물질 안에서 곧게 나아가고, 거울에서 반사하며, 공기와 물, 공기와 렌즈의 경계에서만 꺾인다.
// 물의 굴절률 1.33은 계산용 모형 값이고 화면에는 숫자와 각도를 보이지 않는다.
// 렌즈는 얇은 렌즈 근사: 렌즈 선을 지날 때 광축에서 떨어진 높이 y, 기울기 s에 대해 s' = s - y / f (볼록 f > 0, 오목 f < 0).
export const N_WATER = 1.33;
const EPS = 1e-6;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

// 반직선 p + t d 와 선분 a-b가 만나는 t(없으면 Infinity)와 선분 위 위치 u(0~1)
function hitSeg(p, d, a, b) {
  const e = sub(b, a), den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-12) {
    // 빛이 선분과 나란한 경우: 같은 직선 위 앞쪽에 선분이 있으면 가까운 끝(옆 모서리)에 닿는다(edge).
    // 거울이나 렌즈를 빛과 나란하게 돌려도 빛이 부품을 뚫고 지나가지 않게 한다.
    const w = sub(a, p);
    if (Math.abs(w[0] * d[1] - w[1] * d[0]) > 1e-6) return {t: Infinity};
    const ta = dot(w, d), tb = dot(sub(b, p), d);
    if (Math.max(ta, tb) <= EPS) return {t: Infinity};
    return {t: Math.max(Math.min(ta, tb), 2 * EPS), u: ta <= tb ? 0 : 1, edge: true};
  }
  const w = sub(a, p), t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den;
  if (t > EPS && u >= -1e-9 && u <= 1 + 1e-9) return {t, u};
  return {t: Infinity};
}
function hitCircle(p, d, c, r) {
  const m = sub(p, c), b = dot(m, d), q = dot(m, m) - r * r, disc = b * b - q;
  if (disc < 0) return Infinity;
  const s = Math.sqrt(disc), t1 = -b - s, t2 = -b + s;
  if (t1 > EPS) return t1;
  if (t2 > EPS) return t2;
  return Infinity;
}
export function reflect(d, n) { const k = 2 * dot(d, n); return unit([d[0] - k * n[0], d[1] - k * n[1]]); }
// 굴절(벡터식). n1에서 n2로 넘어간다. 나갈 수 없으면(전반사) null
export function refract(d, normal, n1, n2) {
  let N = normal;
  if (dot(N, d) > 0) N = [-N[0], -N[1]];
  const cosi = -dot(N, d), eta = n1 / n2, k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null;
  const a = eta * cosi - Math.sqrt(k);
  return unit([eta * d[0] + a * N[0], eta * d[1] + a * N[1]]);
}
// 얇은 렌즈: 렌즈 선(a-b) 위 점 h를 지나는 빛의 새 방향
export function thinLens(d, h, lens) {
  const A = [lens.x1, lens.y1], B = [lens.x2, lens.y2], C = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const u = unit(sub(B, A));
  let ax = [-u[1], u[0]];
  if (dot(d, ax) < 0) ax = [-ax[0], -ax[1]];
  const da = dot(d, ax), du = dot(d, u), y = dot(sub(h, C), u);
  const s = du / da - y / lens.f;
  return unit([ax[0] + s * u[0], ax[1] + s * u[1]]);
}
function insideWater(w, p) {
  if (w.shape === 'circle') return Math.hypot(p[0] - w.cx, p[1] - w.cy) < w.r;
  return p[0] > w.x && p[0] < w.x + w.w && p[1] > w.y && p[1] < w.y + w.h;
}
// 네모 수조: 윗면과 아랫면으로만 빛이 드나들고, 옆면 두 곳은 빛을 흡수하는 검은 판이다.
function waterEdges(w) {
  if (w.shape === 'circle') return [];
  const {x, y, w: W, h: H} = w;
  return [
    {a: [x, y], b: [x + W, y], n: [0, -1], kind: 'iface'},
    {a: [x, y + H], b: [x + W, y + H], n: [0, 1], kind: 'iface'},
    {a: [x, y], b: [x, y + H], kind: 'absorb'},
    {a: [x + W, y], b: [x + W, y + H], kind: 'absorb'},
  ];
}

// scene: {rays:[{x,y,dx,dy}], mirrors:[{x1,y1,x2,y2,two,nx,ny}], lenses:[{x1,y1,x2,y2,f}], blocks:[{x1,y1,x2,y2}],
//         targets:[{id,x1,y1,x2,y2,pass}], waters:[{shape:'rect',x,y,w,h,n}|{shape:'circle',cx,cy,r,n}]}
// 돌려주는 값: 빛마다 {points:[[x,y]...], hits:[표적 id], end:'target'|'absorb'|'back'|'edge'(거울이나 렌즈의 옆 모서리)|'out'|'limit', stop:[x,y], bends:꺾인 횟수, tir:전반사 횟수,
//   lensAtPoint:[{i:렌즈 선을 지난 점 번호, lens, din, dout}]} (그림에서 렌즈 두 면에서 꺾이게 나눠 그릴 때 쓴다)
export function trace(scene, {maxHits = 20, maxLen = 3000} = {}) {
  const mirrors = scene.mirrors || [], lenses = scene.lenses || [], blocks = scene.blocks || [], targets = scene.targets || [], waters = scene.waters || [];
  return (scene.rays || []).map((r0) => {
    let p = [r0.x, r0.y], d = unit([r0.dx, r0.dy]);
    const points = [[p[0], p[1]]], hits = [];
    let left = maxLen, n = 0, end = 'limit', bends = 0, tir = 0;
    const lensAtPoint = [];
    while (n <= maxHits) {
      let best = {t: Infinity};
      const take = (t, info) => { if (t < best.t) best = {t, ...info}; };
      for (const m of mirrors) { const h = hitSeg(p, d, [m.x1, m.y1], [m.x2, m.y2]); take(h.t, {kind: 'mirror', obj: m, edge: h.edge}); }
      for (const l of lenses) { const h = hitSeg(p, d, [l.x1, l.y1], [l.x2, l.y2]); take(h.t, {kind: 'lens', obj: l, edge: h.edge}); }
      for (const b of blocks) { const h = hitSeg(p, d, [b.x1, b.y1], [b.x2, b.y2]); take(h.t, {kind: 'block', obj: b}); }
      for (const g of targets) { const h = hitSeg(p, d, [g.x1, g.y1], [g.x2, g.y2]); take(h.t, {kind: 'target', obj: g}); }
      for (const w of waters) {
        if (w.shape === 'circle') take(hitCircle(p, d, [w.cx, w.cy], w.r), {kind: 'circle', obj: w});
        else for (const e of waterEdges(w)) { const h = hitSeg(p, d, e.a, e.b); take(h.t, {kind: e.kind === 'iface' ? 'iface' : 'block', obj: w, edge: e}); }
      }
      if (best.t === Infinity || best.t > left) {
        const t = Math.min(left, 4000);
        p = [p[0] + d[0] * t, p[1] + d[1] * t]; points.push(p); end = best.t === Infinity ? 'out' : 'limit'; break;
      }
      const h = [p[0] + d[0] * best.t, p[1] + d[1] * best.t];
      left -= best.t; points.push(h); n++;
      if (best.kind === 'block') { end = 'absorb'; p = h; break; }
      if (best.edge && (best.kind === 'mirror' || best.kind === 'lens')) { end = 'edge'; p = h; break; }
      if (best.kind === 'target') {
        if (!hits.includes(best.obj.id)) hits.push(best.obj.id);
        if (!best.obj.pass) { end = 'target'; p = h; break; }
        p = [h[0] + d[0] * 1e-3, h[1] + d[1] * 1e-3]; continue;
      }
      if (best.kind === 'mirror') {
        const m = best.obj, u = unit([m.x2 - m.x1, m.y2 - m.y1]), nn = [-u[1], u[0]];
        if (!m.two) { const front = [m.nx, m.ny]; if (dot(d, front) > 0) { end = 'back'; p = h; break; } }
        d = reflect(d, nn); bends++;
      } else if (best.kind === 'lens') {
        const nd = thinLens(d, h, best.obj);
        lensAtPoint.push({i: points.length - 1, lens: best.obj, din: d, dout: nd});
        if (Math.abs(nd[0] - d[0]) + Math.abs(nd[1] - d[1]) > 1e-9) bends++;
        d = nd;
      } else if (best.kind === 'iface' || best.kind === 'circle') {
        const w = best.obj, normal = best.kind === 'circle' ? unit([h[0] - w.cx, h[1] - w.cy]) : best.edge.n;
        const behind = [h[0] - d[0] * 1e-3, h[1] - d[1] * 1e-3];
        const wasIn = insideWater(w, behind), n1 = wasIn ? (w.n || N_WATER) : 1, n2 = wasIn ? 1 : (w.n || N_WATER);
        const nd = refract(d, normal, n1, n2);
        if (!nd) { d = reflect(d, normal); bends++; tir++; p = [h[0] + d[0] * 1e-3, h[1] + d[1] * 1e-3]; continue; }
        if (Math.abs(nd[0] - d[0]) + Math.abs(nd[1] - d[1]) > 1e-9) bends++;
        d = nd;
      }
      p = [h[0] + d[0] * 1e-3, h[1] + d[1] * 1e-3];
    }
    return {points, hits, end, stop: points[points.length - 1], bends, tir, lensAtPoint};
  });
}
// 여러 빛 가운데 모든 빛이 같은 표적에 닿았는지
export const allHit = (res, id) => res.length > 0 && res.every((r) => r.hits.includes(id));
export const anyHit = (res, id) => res.some((r) => r.hits.includes(id));
// 평면거울: 가운데(cx, cy), 반 길이 half, 각 deg(화면에서 오른쪽이 0, 시계 반대 방향이 +).
// 앞면(빛을 반사하는 면)의 법선은 (-uy, ux)로, y가 아래로 커지는 화면에서는 선 방향을 시계 방향으로 돌린 쪽이다. two가 참이면 양면 거울로 계산한다.
export function mirrorAt(cx, cy, deg, half, two = false) {
  const a = deg * Math.PI / 180, ux = Math.cos(a), uy = -Math.sin(a);
  return {x1: cx - ux * half, y1: cy - uy * half, x2: cx + ux * half, y2: cy + uy * half, nx: -uy, ny: ux, two, cx, cy, deg};
}
// 렌즈: 가운데(cx, cy), 렌즈 선이 세로(axis 'x', 빛이 좌우로 지남)인지 가로(axis 'y', 빛이 위아래로 지남)인지
export function lensAt(cx, cy, half, f, axis = 'x') {
  return axis === 'x' ? {x1: cx, y1: cy - half, x2: cx, y2: cy + half, f, cx, cy, axis} : {x1: cx - half, y1: cy, x2: cx + half, y2: cy, f, cx, cy, axis};
}
