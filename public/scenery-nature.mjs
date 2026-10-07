// 나무·덤불·꽃·바위·물가 풀. 잎은 둥근 뭉치(구면 조명) + 작은 잎 세포 무늬로 칠해 손그림 느낌을 낸다.
import { Ras, out, rng, rnd, hash, vnoise, tone, clamp01, lambert, cells, C, ramp, cylV, blob } from './scenery-core.mjs';

export const PAL = {
  oak: [[18, 38, 34], [28, 56, 40], [40, 76, 44], [56, 98, 48], [76, 120, 52], [100, 142, 58], [132, 164, 70], [168, 188, 92], [204, 212, 128]],
  autumn: [[60, 26, 26], [96, 38, 28], [136, 58, 30], [174, 86, 34], [204, 120, 44], [226, 156, 60], [240, 192, 92], [250, 222, 146], [255, 240, 196]],
  blossom: [[96, 54, 78], [132, 74, 100], [170, 102, 130], [204, 136, 162], [226, 168, 188], [240, 198, 210], [250, 222, 228], [255, 242, 242]],
  pine: [[14, 32, 34], [20, 46, 42], [28, 62, 48], [38, 80, 54], [52, 98, 60], [72, 120, 68], [100, 146, 80], [138, 172, 100]],
  bush: [[24, 46, 34], [36, 66, 40], [50, 88, 46], [68, 110, 52], [90, 132, 58], [118, 154, 70], [152, 178, 90]],
  palm: [[26, 50, 30], [38, 72, 36], [54, 96, 42], [74, 120, 48], [98, 144, 56], [130, 166, 70], [164, 188, 92]],
  bark: [[44, 30, 26], [62, 42, 32], [82, 56, 40], [102, 72, 50], [124, 90, 62], [146, 110, 76]],
  palmBark: [[70, 52, 38], [96, 72, 50], [122, 94, 64], [148, 118, 82], [172, 144, 104], [194, 170, 128]],
  stone: [[60, 58, 56], [86, 82, 76], [112, 106, 96], [138, 130, 116], [162, 154, 138], [186, 178, 160], [208, 200, 182]],
};
const LEAF_INK = [18, 30, 26];

// 둥근 잎 뭉치 여러 개로 된 수관
export function canopy(R, cx, cy, rx, ry, rp, seed, o = {}) {
  const { n = 10, edge = 0.14, leafW = 6, leafH = 5, under = 0.26, tops = 4, clip = 1e9, dz = 0.7, amp = 0.72 } = o;
  const rand = rng(seed);
  const rm = Math.min(rx, ry), cl = [[cx, cy + ry * 0.05, rm * 0.74, 0]];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.5, rr = rm * (0.34 + rand() * 0.15);
    const px = cx + Math.cos(a) * (rx - rr) * (0.86 + rand() * 0.14), py = cy + Math.sin(a) * (ry - rr) * (0.86 + rand() * 0.14);
    cl.push([px, py, rr, Math.sin(a) * rm * 0.16]);
  }
  for (let k = 0; k < tops; k++) cl.push([cx + (rand() - 0.5) * rx * 0.9, cy - ry * (0.12 + rand() * 0.34), rm * (0.3 + rand() * 0.13), rm * 0.26]);
  const x0 = Math.floor(cx - rx - 3), x1 = Math.ceil(cx + rx + 3), y0 = Math.floor(cy - ry - 3), y1 = Math.min(clip, Math.ceil(cy + ry + 3));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const e = (vnoise(x, y, 2.2, seed) - 0.5) * edge * 2 + (vnoise(x, y, 5, seed + 3) - 0.5) * edge;
    let h1 = -1e9, h2 = -1e9, bi = -1, bnx = 0, bny = 0;
    for (let k = 0; k < cl.length; k++) {
      const q = cl[k], dx = (x + 0.5 - q[0]) / q[2], dy = (y + 0.5 - q[1]) / q[2];
      const d = Math.sqrt(dx * dx + dy * dy) + e;
      if (d >= 1) continue;
      const h = Math.sqrt(1 - d * d) * q[2] + q[3];
      if (h > h1) { h2 = h1; h1 = h; bi = k; bnx = dx; bny = dy; } else if (h > h2) h2 = h;
    }
    if (bi < 0) continue;
    const r = cl[bi][2];
    let v = 0.28 + lambert(bnx * 0.9, bny * 0.9) * amp;
    if (h2 > -1e8) v -= (1 - Math.min(1, (h1 - h2) / (r * 0.3))) * 0.3;
    v -= Math.max(0, (y - cy) / ry) * under;
    v += Math.max(0, -(y - cy) / ry) * 0.08;
    cells(x, y, leafW, leafH, seed + 11);
    const lit = -(((x - C.cx) / leafW) * 0.7 + ((y - C.cy) / leafH) * 0.75);
    v += lit * 0.26 - (C.f2 - C.f1 < 0.1 ? 0.14 : 0) + (((C.id >>> 16) & 255) / 255 - 0.5) * 0.06 + (rnd(x, y, seed) - 0.5) * 0.04;
    R.set(x, y, tone(rp, clamp01(v), x, y, dz));
  }
}

// 나무줄기: 뿌리가 퍼지고 세로 결이 있는 원통
function trunk(R, cx, yTop, yBot, wTop, wBot, rp, seed, dark = 12) {
  for (let y = Math.floor(yTop); y <= yBot; y++) {
    const t = (y - yTop) / (yBot - yTop);
    let w = wTop + (wBot - wTop) * t * t;
    if (t > 0.82) w += ((t - 0.82) / 0.18) ** 2 * 10;
    const x0 = cx - w / 2 + Math.sin(y * 0.15 + seed) * 0.6;
    for (let x = Math.floor(x0); x < x0 + w; x++) {
      const u = (x + 0.5 - x0) / w, n = u * 2 - 1;
      let v = 0.36 + lambert(n * 0.95, -0.1) * 0.56;
      v += (vnoise(x / 1.1, y / 6, 1, seed) - 0.5) * 0.34 + (rnd(x, y, seed) - 0.5) * 0.08;
      if (y - yTop < dark) v -= ((dark - (y - yTop)) / dark) * 0.35;
      R.set(x, y, tone(rp, clamp01(v), x, y));
    }
  }
}

function branch(R, pts, w0, w1, rp, seed) {
  R.stroke(pts, w0, w1, (x, y, t, nx) => tone(rp, clamp01(0.36 + lambert(nx * 0.9, -0.2) * 0.5 - 0.12 + (vnoise(x, y, 2, seed) - 0.5) * 0.25), x, y));
}

function broadleaf(variant) {
  const pal = PAL[variant] || PAL.oak, seed = { oak: 11, autumn: 23, blossom: 37 }[variant] || 11;
  const rx = variant === 'blossom' ? 44 : 48, ry = variant === 'blossom' ? 38 : 42, lift = 74;
  const W = rx * 2 + 44, H = lift + ry + 22, ax = rx + 8, ay = H - 16;
  const R = new Ras(W, H);
  R.sEll(ax + rx * 0.42, ay - 2, rx * 1.02, rx * 0.34, 0.55);
  R.sEll(ax + 3, ay, 13, 4, 0.3);
  const bark = variant === 'blossom' ? ramp([92, 62, 56], 6) : PAL.bark;
  trunk(R, ax, ay - lift + 20, ay, 12, 16, bark, seed, 14);
  branch(R, [[ax - 1, ay - lift + 32], [ax - 12, ay - lift + 12], [ax - 22, ay - lift]], 8, 3, bark, seed);
  branch(R, [[ax + 1, ay - lift + 28], [ax + 14, ay - lift + 10], [ax + 20, ay - lift - 4]], 7, 3, bark, seed + 1);
  canopy(R, ax, ay - lift, rx, ry, pal, seed, { n: 11, tops: 4 });
  if (variant === 'blossom') {
    const rand = rng(91);
    for (let k = 0; k < 90; k++) {
      const x = Math.round(ax - rx + rand() * rx * 2), y = Math.round(ay - lift - ry + rand() * ry * 1.7);
      if (R.a(x, y) < 200 || R.a(x + 1, y + 1) < 200) continue;
      R.set(x, y, [255, 248, 246]); R.set(x + 1, y, [246, 214, 224]); R.set(x, y + 1, [240, 200, 214]);
    }
  }
  R.outline({ ink: LEAF_INK });
  if (variant === 'blossom' || variant === 'autumn') {
    const rand = rng(seed + 5), c1 = variant === 'blossom' ? [246, 196, 210] : [214, 120, 44], c2 = variant === 'blossom' ? [255, 236, 240] : [236, 176, 70];
    for (let k = 0; k < 16; k++) {
      const x = ax - 30 + rand() * 70, y = ay - 6 + rand() * 12;
      if (R.a(x, y) > 100) continue;
      R.set(x, y, rand() < 0.5 ? c1 : c2); if (rand() < 0.4) R.set(x + 1, y, c1);
    }
  }
  return out(R, ax, ay, { block: { x: -9, y: -7, w: 18, h: 9 } }, { blur: 3 });
}

function pine() {
  const W = 106, H = 156, ax = 42, ay = 141, rp = PAL.pine;
  const R = new Ras(W, H);
  R.sEll(ax + 22, ay - 2, 38, 13, 0.55);
  R.sEll(ax + 2, ay, 9, 3, 0.3);
  trunk(R, ax, ay - 34, ay, 7, 10, PAL.bark, 5, 10);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const yb = ay - 18 - i * 21, yt = yb - 36 - (i === tiers - 1 ? 10 : 0), hw = 36 - i * 6.5, seed = 70 + i;
    const bottom = (x) => { const s = Math.abs((((x - ax) / 6.5 + i * 0.37) % 1 + 1) % 1 - 0.5) * 2; return yb + 1 + (1 - s) * 5 + rnd(Math.floor((x - ax) / 6.5), i, 3) * 2; };
    if (i > 0) for (let x = Math.floor(ax - hw - 3); x <= ax + hw + 3; x++) { const b = bottom(x); for (let y = Math.floor(b); y < b + 5; y++) R.shadeAt(x, y, -0.22 * (1 - (y - b) / 5)); }
    for (let y = Math.floor(yt); y <= yb + 7; y++) for (let x = Math.floor(ax - hw - 3); x <= ax + hw + 3; x++) {
      const t = (y - yt) / (yb - yt);
      if (t < 0) continue;
      const half = hw * Math.pow(Math.min(1, t), 0.9) + (vnoise(x, y, 2, seed) - 0.5) * 4;
      if (Math.abs(x + 0.5 - ax) > half || y > bottom(x)) continue;
      const u = (x + 0.5 - ax) / (hw + 1);
      let v = 0.62 - u * 0.36 - Math.max(0, t - 0.7) * 0.9 + (0.3 - Math.abs(t - 0.3)) * 0.12;
      cells(x + y * 0.6, y, 4, 3, seed);
      v += -(((x + y * 0.6 - C.cx) / 4) * 0.6 + ((y - C.cy) / 3) * 0.8) * 0.18 - (C.f2 - C.f1 < 0.13 ? 0.12 : 0) + (rnd(x, y, 9) - 0.5) * 0.07;
      R.set(x, y, tone(rp, clamp01(v), x, y, 0.8));
    }
  }
  R.outline({ ink: LEAF_INK });
  return out(R, ax, ay, { block: { x: -7, y: -6, w: 14, h: 8 } }, { blur: 3 });
}

function palm() {
  const W = 128, H = 162, ax = 50, ay = 146;
  const R = new Ras(W, H);
  R.sEll(ax + 34, ay - 1, 42, 12, 0.5);
  R.sEll(ax + 2, ay, 9, 3, 0.3);
  const top = [ax + 14, ay - 108], ctl = [ax - 10, ay - 52];
  const pt = (t) => [(1 - t) * (1 - t) * ax + 2 * (1 - t) * t * ctl[0] + t * t * top[0], (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * ctl[1] + t * t * top[1]];
  let len = 0, prev = pt(0);
  for (let s = 0; s <= 240; s++) {
    const t = s / 240, p = pt(t);
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p;
    const w = 11 - t * 4, ring = (len / 6) % 1;
    for (let x = Math.floor(p[0] - w / 2); x < p[0] + w / 2; x++) {
      const n = ((x + 0.5 - (p[0] - w / 2)) / w) * 2 - 1;
      let v = 0.4 + lambert(n * 0.95, -0.1) * 0.5 - (ring < 0.22 ? 0.2 : ring < 0.35 ? 0.08 : 0) + (rnd(x, Math.round(p[1]), 4) - 0.5) * 0.08;
      R.set(x, Math.round(p[1]), tone(PAL.palmBark, clamp01(v), x, Math.round(p[1])));
    }
  }
  const [cx, cy] = top;
  const fronds = [[-150, 44, 0], [-30, 44, 0], [-110, 36, 0], [-70, 38, 0], [175, 48, 1], [5, 48, 1], [150, 42, 2], [30, 42, 2], [100, 30, 2], [70, 32, 2]];
  for (const [deg, L, layer] of fronds) {
    const a = (deg * Math.PI) / 180, droop = 22 + layer * 6;
    const P = (t) => [cx + Math.cos(a) * L * t, cy + Math.sin(a) * L * t * 0.6 - 10 * t + droop * t * t];
    const lift = layer === 0 ? -0.12 : layer === 1 ? 0 : 0.1;
    for (let s = 2; s <= 30; s++) {
      const t = s / 30, [x, y] = P(t), [x2, y2] = P(Math.min(1, t + 0.03));
      const dx = x2 - x, dy = y2 - y, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
      const ll = 12 * (1 - t * 0.65);
      for (const sg of [1, -1]) {
        const ex = x + (nx * sg * 0.8 - (dx / dl) * 0.45) * ll, ey = y + (ny * sg * 0.8 - (dy / dl) * 0.45) * ll + ll * 0.35;
        const lit = sg * nx * -0.5 + sg * ny * -0.6;
        R.line(x, y, ex, ey, (px, py, u) => tone(PAL.palm, clamp01(0.5 + lift + lit * 0.18 - u * 0.12 - t * 0.1 + (rnd(Math.round(px), Math.round(py), 8) - 0.5) * 0.1), Math.round(px), Math.round(py)));
      }
      R.set(x, y, PAL.palm[layer === 2 ? 3 : 2]);
    }
  }
  for (const [ox, oy] of [[-4, 4], [3, 5], [0, 8]]) blob(R, cx + ox, cy + oy, 3.5, 3.5, ramp([106, 74, 40], 5));
  R.outline({ ink: LEAF_INK });
  return out(R, ax, ay, { block: { x: -7, y: -6, w: 14, h: 8 } }, { blur: 3 });
}

function tree(v) {
  if (v === 'pine') return pine();
  if (v === 'palm') return palm();
  return broadleaf(v);
}

function bush(v) {
  const W = 66, H = 44, ax = 28, ay = 38;
  const R = new Ras(W, H);
  R.sEll(ax + 8, ay, 28, 8, 0.42);
  canopy(R, ax, ay - 14, 25, 16, PAL.bush, v === 'flower' ? 61 : 53, { n: 8, tops: 3, leafW: 4, leafH: 3, clip: ay, under: 0.34 });
  if (v === 'flower') {
    const rand = rng(64);
    for (let k = 0; k < 40; k++) {
      const x = Math.round(ax - 22 + rand() * 44), y = Math.round(ay - 28 + rand() * 22);
      if (R.a(x, y) < 200 || R.a(x + 1, y + 1) < 200) continue;
      const pink = rand() < 0.7;
      R.set(x, y, pink ? [250, 196, 214] : [255, 250, 240]); R.set(x + 1, y, pink ? [232, 128, 160] : [242, 228, 214]);
      R.set(x, y + 1, pink ? [214, 104, 140] : [226, 214, 200]); R.set(x + 1, y + 1, pink ? [176, 70, 104] : [200, 186, 170]);
    }
  }
  R.outline({ ink: LEAF_INK });
  return out(R, ax, ay, { block: { x: -20, y: -8, w: 40, h: 10 } });
}

const FL = { red: [[140, 30, 34], [196, 52, 50], [232, 92, 80], [250, 150, 130]], yellow: [[168, 118, 20], [226, 180, 40], [246, 214, 80], [255, 240, 160]], white: [[176, 172, 170], [220, 218, 214], [244, 242, 236], [255, 255, 250]], purple: [[82, 50, 120], [128, 84, 176], [164, 122, 210], [206, 176, 240]] };
function flowers(v) {
  const P = FL[v] || FL.red, W = 34, H = 22, ax = 15, ay = 17;
  const R = new Ras(W, H), rand = rng(hash(v.length, 3, 77));
  R.sEll(ax + 3, ay, 13, 4, 0.22);
  const heads = [];
  for (let k = 0; k < 8; k++) heads.push([Math.round(ax - 10 + rand() * 20), Math.round(ay - 4 - rand() * 9)]);
  heads.sort((a, b) => a[1] - b[1]);
  for (const [x, y] of heads) {
    const g = [[46, 90, 42], [70, 118, 50], [100, 146, 60]];
    for (let s = 1; s <= ay - y; s++) R.set(x, y + s, g[1]);
    R.set(x - 1, ay - 2, g[0]); R.set(x + 1, ay - 3, g[2]); R.set(x - 2, ay - 3, g[1]);
    R.set(x, y - 1, P[3]); R.set(x - 1, y, P[2]); R.set(x + 1, y, P[1]); R.set(x, y + 1, P[1]); R.set(x, y, [250, 214, 80]);
    R.set(x + 1, y + 1, P[0]); R.set(x - 1, y - 1, P[2]);
  }
  R.outline({ ink: [30, 34, 26], bottom: 0.35, side: 0.3, top: 0.12 });
  return out(R, ax, ay);
}

function rock(v) {
  const big = v === 'large', rx = big ? 24 : 11, ry = big ? 16 : 8;
  const W = rx * 2 + 16, H = ry * 2 + 10, ax = rx + 4, ay = H - 5, cx = ax, cy = ay - ry + 1, seed = big ? 5 : 9;
  const R = new Ras(W, H);
  R.sEll(ax + rx * 0.35, ay, rx * 1.05, ry * 0.5, 0.42);
  const rp = PAL.stone;
  for (let y = Math.floor(cy - ry - 4); y <= ay; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
    const a = Math.atan2(y - cy, x - cx), rr = 1 + (vnoise(Math.cos(a) * 3 + 5, Math.sin(a) * 3 + 5, 1.1, seed) - 0.5) * 0.5;
    let nx = (x + 0.5 - cx) / (rx * rr), ny = (y + 0.5 - cy) / (ry * rr * (y < cy ? 1.25 : 1));
    if (nx * nx + ny * ny > 1 || y > ay - 1) continue;
    cells(x, y * 1.3, big ? 9 : 6, big ? 8 : 5, seed);
    const fx = ((C.id & 255) / 255 - 0.5) * 0.9, fy = (((C.id >>> 8) & 255) / 255 - 0.5) * 0.9;
    let v = 0.3 + lambert(nx * 0.7 + fx * 0.4, ny * 0.8 + fy * 0.4) * 0.62 - (C.f2 - C.f1 < 0.08 ? 0.16 : 0) + (rnd(x, y, 5) - 0.5) * 0.08;
    v -= Math.max(0, ny) * 0.18;
    let c = tone(rp, clamp01(v), x, y);
    if (ny < -0.2 && vnoise(x, y, 3, seed + 4) > 0.55) c = tone([[48, 70, 40], [66, 94, 48], [90, 118, 58], [118, 140, 70]], clamp01(v), x, y);
    R.set(x, y, c);
  }
  R.outline({ ink: [28, 26, 30] });
  return out(R, ax, ay, big ? { block: { x: -rx + 2, y: -ry, w: rx * 2 - 4, h: ry + 2 } } : {});
}

function stump() {
  const W = 44, H = 34, ax = 19, ay = 28, R = new Ras(W, H);
  R.sEll(ax + 7, ay, 18, 6, 0.4);
  const cx = ax, top = ay - 16;
  for (let y = top; y <= ay; y++) {
    const t = (y - top) / (ay - top), w = 22 + (t > 0.7 ? ((t - 0.7) / 0.3) ** 2 * 10 : 0);
    for (let x = Math.floor(cx - w / 2); x < cx + w / 2; x++) {
      const n = ((x + 0.5 - (cx - w / 2)) / w) * 2 - 1;
      R.set(x, y, tone(PAL.bark, clamp01(0.36 + lambert(n * 0.95, 0) * 0.5 + (vnoise(x / 1.1, y / 5, 1, 3) - 0.5) * 0.35), x, y));
    }
  }
  R.ell(cx, top, 11, 5, (x, y, nx, ny) => {
    const d = Math.sqrt(nx * nx + ny * ny), ring = (d * 4.2 + vnoise(x, y, 3, 2) * 0.6) % 1;
    const base = [[120, 86, 56], [150, 112, 74], [176, 138, 94], [198, 162, 116]];
    return tone(base, clamp01(0.62 - d * 0.3 + (ring < 0.22 ? -0.25 : 0) + (nx < -0.5 ? 0.1 : 0)), x, y);
  });
  R.outline({ ink: [30, 20, 18] });
  return out(R, ax, ay, { block: { x: -11, y: -8, w: 22, h: 10 } });
}

function grassTuft() {
  const W = 30, H = 22, ax = 13, ay = 18, R = new Ras(W, H), rand = rng(17);
  R.sEll(ax + 3, ay, 11, 3, 0.25);
  const P = [[34, 64, 38], [50, 88, 44], [70, 112, 50], [94, 136, 58], [124, 160, 70], [158, 186, 92]];
  for (let k = 0; k < 16; k++) {
    const bx = ax - 7 + rand() * 14, hgt = 7 + rand() * 9, lean = (bx - ax) * 0.5 + (rand() - 0.5) * 4;
    for (let s = 0; s <= hgt; s++) {
      const t = s / hgt, x = Math.round(bx + lean * t * t), y = Math.round(ay - s);
      R.set(x, y, P[Math.min(5, Math.floor(t * 4.5 + rand() * 1.2))]);
    }
  }
  R.outline({ ink: [22, 36, 26], bottom: 0.3, side: 0.35, top: 0.15 });
  return out(R, ax, ay);
}

function reeds() {
  const W = 40, H = 50, ax = 17, ay = 44, R = new Ras(W, H), rand = rng(29);
  R.sEll(ax + 4, ay, 15, 4, 0.35);
  const P = [[48, 62, 34], [68, 86, 40], [94, 112, 50], [126, 140, 66], [160, 168, 92]];
  for (let k = 0; k < 13; k++) {
    const bx = ax - 9 + rand() * 18, hgt = 20 + rand() * 18, lean = (rand() - 0.5) * 8;
    for (let s = 0; s <= hgt; s++) {
      const t = s / hgt, x = Math.round(bx + lean * t * t), y = Math.round(ay - s);
      R.set(x, y, P[Math.min(4, Math.floor(t * 3 + 1 + (k & 1) * 0.6))]);
    }
    if (k % 3 === 0) {
      const x = Math.round(bx + lean), y = Math.round(ay - hgt);
      for (let j = 0; j < 6; j++) { R.set(x, y + j, j < 2 ? [150, 96, 58] : [110, 66, 40]); R.set(x + 1, y + j, j < 1 ? [124, 80, 48] : [80, 48, 32]); }
      R.set(x, y - 1, P[3]); R.set(x, y - 2, P[3]);
    }
  }
  R.outline({ ink: [24, 30, 22], bottom: 0.3, side: 0.35, top: 0.15 });
  return out(R, ax, ay);
}

function lily() {
  const W = 40, H = 24, ax = 18, ay = 16, R = new Ras(W, H);
  const pads = [[ax - 6, ay - 3, 9, 5, 0.6], [ax + 7, ay + 1, 7, 4, 2.2], [ax + 2, ay - 8, 5, 3, 4.1]];
  for (const [cx, cy, rx, ry, cut] of pads) {
    R.sEll(cx + 2, cy + 2, rx, ry, 0.25);
    R.ell(cx, cy, rx, ry, (x, y, nx, ny) => {
      const a = Math.atan2(ny, nx);
      let da = Math.abs(((a - cut + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da > Math.PI - 0.35) return null;
      const d = Math.sqrt(nx * nx + ny * ny);
      const vein = Math.abs(((a * 3.2) % 1 + 1) % 1 - 0.5) < 0.06 && d > 0.3;
      return tone(PAL.bush, clamp01(0.62 - d * 0.18 - ny * 0.15 + (d > 0.82 ? 0.16 : 0) - (vein ? 0.12 : 0)), x, y);
    });
  }
  const fx = ax - 5, fy = ay - 6;
  for (const [dx, dy, c] of [[0, -2, [255, 236, 244]], [-2, -1, [246, 190, 212]], [2, -1, [236, 160, 190]], [-1, 0, [240, 176, 200]], [1, 0, [220, 128, 164]], [0, -1, [255, 220, 110]], [-1, -2, [255, 246, 250]], [1, -2, [246, 206, 222]]]) R.set(fx + dx, fy + dy, c);
  R.outline({ ink: [20, 40, 40], bottom: 0.35, side: 0.3, top: 0.15 });
  return out(R, ax, ay);
}

function hedge() {
  const W = 38, H = 40, ax = 16, ay = 32, R = new Ras(W, H);
  R.sRect(ax - 14, ay - 4, 36, 8, 0.36);
  const x0 = ax - 16, top = ay - 26;
  for (let y = top - 2; y < ay; y++) for (let x = x0; x < x0 + 32; x++) {
    const e = (vnoise(x, y, 2, 41) - 0.5) * 3;
    if (y < top + e || (y > ay - 2 && vnoise(x, 0, 2, 42) > 0.6)) continue;
    const onTop = y < top + 11;
    cells(x, y, 4, 3, 43);
    let v = onTop ? 0.66 - (y - top) * 0.012 : 0.46 - ((y - top - 11) / 15) * 0.26;
    if (onTop && y > top + 8) v -= 0.08;
    v += -(((x - C.cx) / 4) * 0.7 + ((y - C.cy) / 3) * 0.7) * 0.2 - (C.f2 - C.f1 < 0.12 ? 0.12 : 0) + (rnd(x, y, 44) - 0.5) * 0.06;
    R.set(x, y, tone(PAL.bush, clamp01(v), x, y, 0.8));
  }
  R.outline({ ink: LEAF_INK, x0: 0, x1: W, y0: 0, y1: H });
  // 옆 칸과 이어지도록 좌우 윤곽은 지운다
  for (let y = 0; y < H; y++) for (const x of [x0 - 1, x0 + 32]) { const q = (y * W + x) * 4; R.d[q + 3] = 0; }
  return out(R, ax, ay, { block: { x: -16, y: -10, w: 32, h: 12 } });
}

export const NATURE = {
  tree, bush, flowers, rock, stump,
  'grass-tuft': grassTuft, reeds, lily, 'hedge-h': hedge,
};
