// 구역 소품: 농장(작물·허수아비·풍차·온실…), 시장·불(가판대·대장간·망루…), 전기·항구(전봇대·크레인·등대…), 미래(돔·레이더·홀로그램…).
import { Ras, out, rng, rnd, hash, vnoise, tone, clamp01, lambert, ramp, mix, blob, cylV, cells, C } from './scenery-core.mjs';
import { icon } from './scenery-icons.mjs';
import { canopy, PAL } from './scenery-nature.mjs';
import { STONE, IRON, WOOD, BRASS, WATER, stoneBox, ashlar, barrelAt, crateAt } from './scenery-town.mjs';

const INK = [28, 22, 26];
const STEEL = [[40, 44, 50], [62, 68, 76], [88, 96, 104], [118, 126, 134], [150, 158, 164], [186, 192, 196], [220, 224, 226]];
const WHITE = [[92, 98, 108], [128, 136, 146], [164, 172, 180], [196, 202, 208], [222, 226, 230], [240, 242, 244]];
const CYAN = [[20, 70, 90], [30, 120, 150], [60, 180, 210], [120, 226, 244], [200, 250, 255]];
const GOLD = [[110, 70, 20], [160, 110, 30], [206, 156, 50], [232, 196, 90], [248, 226, 150]];
const STRAW = [[110, 78, 30], [146, 108, 42], [182, 142, 60], [212, 176, 84], [234, 206, 120], [248, 232, 170]];
const LEAF = PAL.bush;

// ================================================================ 농장
function crops(v) {
  const R = new Ras(40, 70), ax = 16, ay = 62, rand = rng(hash(v.length, 7, 3));
  if (v === 'sprout') {
    const G = [[40, 84, 40], [62, 116, 48], [92, 150, 58], [128, 182, 74], [168, 206, 100]];
    for (let row = 0; row < 2; row++) for (let k = 0; k < 3; k++) {
      const x = ax - 10 + k * 10 + (row ? 5 : 0), y = ay - 3 - row * 14;
      R.ell(x + 0.5, y + 1, 4, 1.6, (i, j, nx, ny) => tone([[60, 40, 30], [84, 60, 42], [110, 82, 58]], clamp01(0.6 - ny * 0.4), i, j));
      R.sEll(x + 3, y + 1, 4, 1.5, 0.25);
      for (let s = 0; s < 4; s++) R.set(x, y - s, G[1 + (s > 1 ? 1 : 0)]);
      const leaf = (dir, len, hy) => { for (let s = 0; s < len; s++) { R.set(x + dir * (s + 1), y - hy - (s > len - 2 ? 1 : 0), G[Math.min(4, 2 + (s > 0 ? 1 : 0) + (dir < 0 ? 1 : 0))]); R.set(x + dir * (s + 1), y - hy + 1, G[1]); } };
      leaf(-1, 3, 4); leaf(1, 3, 3); leaf(-1, 2, 1);
    }
  } else if (v === 'cabbage') {
    for (const [x, y, r] of [[ax - 8, ay - 19, 8], [ax + 8, ay - 17, 8], [ax, ay - 6, 9]]) {
      R.sEll(x + 3, y + r * 0.6, r + 1, r * 0.4, 0.35);
      canopy(R, x, y, r + 3, r * 0.75 + 2, PAL.bush, x * 3 + y, { n: 6, tops: 1, leafW: 4, leafH: 3, edge: 0.2, under: 0.4 });
      blob(R, x, y - 1, r * 0.66, r * 0.55, [[84, 130, 66], [118, 164, 84], [156, 198, 112], [196, 224, 150], [226, 240, 194]], { tex: (i, j, nx) => (Math.abs(nx) < 0.08 ? -0.12 : 0) });
    }
  } else if (v === 'wheat') {
    R.sEll(ax + 3, ay - 2, 16, 4, 0.25);
    for (let k = 0; k < 34; k++) {
      const bx = ax - 14 + rand() * 28, by = ay - 1 - rand() * 12, hgt = 16 + rand() * 8, lean = (rand() - 0.3) * 4;
      for (let s = 0; s < hgt; s++) { const t = s / hgt; R.set(bx + lean * t * t, by - s, STRAW[Math.min(5, 1 + Math.floor(t * 3))]); }
      const tx = bx + lean, ty = by - hgt;
      for (let s = 0; s < 5; s++) { R.set(tx, ty - s, STRAW[4]); if (s % 2) { R.set(tx - 1, ty - s, STRAW[3]); R.set(tx + 1, ty - s, STRAW[2]); } }
    }
  } else {
    R.sEll(ax + 6, ay - 2, 16, 4, 0.3);
    for (const [bx, hgt] of [[ax - 8, 52], [ax + 7, 56], [ax, 46]]) {
      for (let s = 0; s < hgt; s++) R.set(bx, ay - 2 - s, LEAF[s % 7 === 0 ? 2 : 3]), R.set(bx + 1, ay - 2 - s, LEAF[2]);
      for (let k = 0; k < 5; k++) {
        const y0 = ay - 10 - k * 9, dir = k % 2 ? 1 : -1, len = 12 - k;
        R.stroke([[bx, y0], [bx + dir * len * 0.6, y0 - 4], [bx + dir * len, y0 + 2]], 3, 1, (x, y, t) => tone(LEAF, clamp01(0.6 - t * 0.2 + (dir < 0 ? 0.1 : -0.05)), x, y));
      }
      const cy = ay - 22 - (bx & 7);
      blob(R, bx + 3, cy, 2.5, 6, GOLD);
      R.stroke([[bx + 1, cy + 6], [bx + 4, cy - 2], [bx + 5, cy - 8]], 2, 1, LEAF[3]);
      for (let s = 0; s < 6; s++) R.set(bx + (s % 3) - 1, ay - 2 - hgt - s, STRAW[3 + (s & 1)]);
    }
  }
  R.outline({ ink: [26, 34, 22], bottom: 0.35, side: 0.35, top: 0.18 });
  return out(R, ax, ay);
}

function scarecrow() {
  const R = new Ras(64, 80), ax = 28, ay = 72, cloth = ramp('#a8483a', 6), patch = ramp('#4a6a9a', 5);
  R.sEll(ax + 8, ay - 1, 16, 4, 0.35);
  cylV(R, ax - 2, ay - 50, 4, 50, WOOD);
  R.rect(ax - 20, ay - 46, 40, 3, (i, j, u, v) => tone(WOOD, clamp01(0.6 - v * 0.4), i, j));
  R.poly([[ax - 11, ay - 48], [ax + 11, ay - 48], [ax + 13, ay - 24], [ax - 13, ay - 24]], (i, j, u, v) => {
    const plaid = ((i >> 2) + (j >> 2)) & 1;
    return tone(cloth, clamp01(0.3 + lambert((u * 2 - 1) * 0.9, 0) * 0.45 + (plaid ? 0.08 : -0.04)), i, j);
  });
  R.rect(ax + 2, ay - 38, 7, 6, (i, j, u, v) => tone(patch, clamp01(0.6 - v * 0.3), i, j));
  for (const s of [-1, 1]) {
    R.poly([[ax + s * 10, ay - 48], [ax + s * 22, ay - 48], [ax + s * 22, ay - 42], [ax + s * 10, ay - 40]], (i, j, u, v) => tone(cloth, clamp01(0.5 - v * 0.2 + (s < 0 ? 0.1 : -0.1)), i, j));
    for (let k = 0; k < 5; k++) R.line(ax + s * 22, ay - 47 + k, ax + s * (25 + (k % 3)), ay - 49 + k * 2, STRAW[3 + (k & 1)]);
  }
  for (let k = 0; k < 7; k++) R.line(ax - 10 + k * 3.3, ay - 24, ax - 11 + k * 3.6, ay - 18 - (k % 2) * 2, STRAW[2 + (k % 3)]);
  blob(R, ax, ay - 55, 7, 7, ramp('#c8b088', 6));
  R.set(ax - 3, ay - 56, [40, 30, 24]); R.set(ax + 2, ay - 56, [40, 30, 24]);
  for (let k = -3; k <= 3; k++) R.set(ax + k, ay - 52 + (Math.abs(k) === 3 ? -1 : 0), [96, 70, 50]);
  R.ell(ax, ay - 61, 15, 4, (i, j, nx, ny) => tone(STRAW, clamp01(0.62 - ny * 0.25 - nx * 0.15), i, j));
  R.poly([[ax - 7, ay - 62], [ax - 5, ay - 71], [ax + 5, ay - 71], [ax + 7, ay - 62]], (i, j, u) => tone(STRAW, clamp01(0.7 - u * 0.4), i, j));
  R.rect(ax - 7, ay - 64, 14, 2, (i, j) => tone(cloth, 0.4, i, j));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -4, y: -4, w: 8, h: 5 } });
}

function haystack() {
  const R = new Ras(70, 54), ax = 30, ay = 46;
  R.sEll(ax + 8, ay - 2, 26, 8, 0.4);
  R.ell(ax, ay - 14, 24, 18, (x, y, nx, ny) => {
    if (y > ay) return null;
    const strand = rnd(Math.floor(x - y * 0.4), Math.floor(y / 3), 5);
    return tone(STRAW, clamp01(0.3 + lambert(nx * 0.9, ny * 0.9) * 0.55 + (strand - 0.5) * 0.3), x, y);
  });
  const rand = rng(11);
  for (let k = 0; k < 16; k++) { const x = ax - 24 + rand() * 48, y = ay - 2 + rand() * 4; R.line(x, y, x + (rand() - 0.5) * 8, y - rand() * 3, STRAW[2 + Math.floor(rand() * 3)]); }
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -22, y: -12, w: 44, h: 13 } });
}

function windmill() {
  const W = 150, H = 200, ax = 64, ay = 190, R = new Ras(W, H);
  R.sPoly([[ax - 22, ay - 6], [ax + 22, ay - 6], [ax + 70, ay + 8], [ax - 4, ay + 8]], 0.4);
  const top = ay - 104;
  for (let y = top; y < ay; y++) {
    const t = (y - top) / (ay - top), hw = 15 + t * 8;
    for (let x = Math.floor(ax - hw); x < ax + hw; x++) {
      const u = (x + 0.5 - (ax - hw)) / (hw * 2);
      const c = ashlar(STONE, x, y, ax - 30, top, 7, 11, 4, 0.36 + lambert((u * 2 - 1) * 0.95, 0) * 0.34);
      R.set(x, y, c);
    }
  }
  const dsh = (x, y, w, h) => R.rect(x, y, w, h, (i, j, u, v) => tone([[20, 14, 12], [44, 30, 22], [84, 58, 38]], clamp01(v < 0.3 ? 0.1 : 0.4 - u * 0.2), i, j));
  dsh(ax - 5, ay - 20, 10, 20); R.rect(ax - 7, ay - 22, 14, 2, (i, j) => tone(STONE, 0.8, i, j));
  dsh(ax - 3, ay - 62, 6, 9);
  const rp = ramp('#7a3e30', 7);
  R.poly([[ax - 21, top + 2], [ax - 3, top - 26], [ax + 3, top - 26], [ax + 21, top + 2]], (i, j, u, v) => {
    const row = Math.floor((j - top + 26) / 4); let t = 0.3 + lambert((u * 2 - 1) * 0.9, -0.3) * 0.4 + (rnd(Math.floor(i / 5) + row, row, 3) - 0.5) * 0.15;
    if ((j - top + 26) % 4 === 0) t -= 0.2;
    return tone(rp, clamp01(t), i, j);
  });
  R.rect(ax - 22, top, 44, 3, (i, j, u) => tone(WOOD, clamp01(0.5 - u * 0.3), i, j));
  const hx = ax, hy = top - 6, sailC = ramp('#e8dcc0', 5);
  for (const a0 of [0.35, 0.35 + Math.PI / 2, 0.35 + Math.PI, 0.35 + Math.PI * 1.5]) {
    const dx = Math.cos(a0), dy = Math.sin(a0), nx = -dy, ny = dx, L = 60;
    R.poly([[hx + dx * 10 + nx * 2, hy + dy * 10 + ny * 2], [hx + dx * L + nx * 2, hy + dy * L + ny * 2], [hx + dx * L + nx * 13, hy + dy * L + ny * 13], [hx + dx * 12 + nx * 11, hy + dy * 12 + ny * 11]], (i, j) => {
      const along = (i - hx) * dx + (j - hy) * dy, across = (i - hx) * nx + (j - hy) * ny;
      if (Math.abs(along % 8) < 1 || Math.abs(across - 7.5) < 0.6) return tone(WOOD, 0.35, i, j);
      return tone(sailC, clamp01(0.62 - across * 0.02 + (a0 > 2 && a0 < 5 ? -0.12 : 0.05)), i, j);
    });
    R.line(hx, hy, hx + dx * (L + 2), hy + dy * (L + 2), (x, y) => tone(WOOD, 0.3, Math.round(x), Math.round(y)), 2);
  }
  blob(R, hx, hy, 4, 4, WOOD);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -22, y: -18, w: 44, h: 19 } });
}

function greenhouse() {
  const W = 140, H = 104, ax = 56, ay = 94, R = new Ras(W, H), w = 96, x0 = ax - w / 2, fh = 48, dk = 30;
  R.sPoly([[x0 + w, ay - 50], [x0 + w + 34, ay - 30], [x0 + w + 36, ay + 7], [x0 + 10, ay + 7], [x0, ay]], 0.36);
  const glass = [[40, 70, 70], [62, 102, 100], [96, 140, 136], [140, 180, 176], [196, 224, 222], [236, 248, 246]];
  // 지붕(뒤로 휘어진 면)
  for (let y = ay - fh - dk; y < ay - fh + 8; y++) for (let x = x0; x < x0 + w; x++) {
    const u = (x + 0.5 - x0) / w, nx = u * 2 - 1, arcY = ay - fh + 8 - Math.sqrt(Math.max(0, 1 - nx * nx)) * 12;
    const backY = arcY - dk;
    if (y < backY || y > arcY) continue;
    const rib = (y - backY) % 10 === 0, seam = Math.abs((u * 8) % 1 - 0.5) > 0.46;
    let v = 0.55 + lambert(nx * 0.9, -0.5) * 0.3 + ((x - y * 0.8) % 28 < 3 ? 0.25 : 0);
    R.set(x, y, rib || seam ? tone(WHITE, clamp01(0.7 - u * 0.3), x, y) : tone(glass, clamp01(v), x, y), rib || seam ? 1 : 0.9);
  }
  // 앞 아치 면
  R.poly((() => { const P = []; for (let k = 0; k <= 20; k++) { const a = Math.PI - (k / 20) * Math.PI; P.push([ax + Math.cos(a) * w / 2, ay - Math.sin(a) * fh * 0.35 - fh * 0.65]); } P.push([x0 + w, ay]); P.push([x0, ay]); return P; })(), (x, y, u, v) => {
    const seam = Math.abs((u * 6) % 1 - 0.5) > 0.45 || (ay - y) % 14 === 0;
    if (seam) return tone(WHITE, clamp01(0.75 - u * 0.3), x, y);
    const plant = vnoise(x, y, 5, 3) > 0.55 && v > 0.5;
    let t = 0.4 + ((x - y * 0.7) % 30 < 3 ? 0.3 : 0) - v * 0.1;
    return plant ? tone(LEAF, clamp01(0.35 + (vnoise(x, y, 2, 4) - 0.5) * 0.4), x, y) : tone(glass, clamp01(t), x, y);
  });
  R.rect(ax - 9, ay - 30, 18, 30, (i, j, u, v) => (u < 0.1 || u > 0.9 || v < 0.06) ? tone(WHITE, 0.7 - u * 0.3, i, j) : tone(glass, clamp01(0.3 + (u > 0.48 && u < 0.52 ? 0.4 : 0)), i, j));
  R.rect(x0 - 2, ay - 3, w + 4, 3, (i, j, u, v) => tone(STONE, clamp01(0.7 - v * 0.4), i, j));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -w / 2, y: -40, w, h: 42 } });
}

function sundial() {
  const R = new Ras(60, 60), ax = 24, ay = 52;
  R.sPoly([[ax - 12, ay - 3], [ax + 12, ay - 3], [ax + 24, ay + 5], [ax, ay + 5]], 0.38);
  stoneBox(R, ax - 12, ay - 8, 24, 3, 5, STONE, 3);
  cylV(R, ax - 6, ay - 30, 12, 22, STONE, { tex: (i, j) => (((j - ay) % 6) === 0 ? -0.15 : 0) });
  R.ell(ax, ay - 32, 16, 6, (x, y, nx, ny) => tone(STONE, clamp01(0.72 - ny * 0.2 - nx * 0.1), x, y));
  R.ell(ax, ay - 33, 13, 4.5, (x, y, nx, ny) => { const a = Math.atan2(ny, nx), tick = Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) > 0.4 && Math.hypot(nx, ny) > 0.7; return tone(BRASS, clamp01(0.65 - ny * 0.2 - (tick ? 0.35 : 0)), x, y); });
  R.line(ax + 1, ay - 33, ax + 11, ay - 31, [70, 50, 26]);
  R.poly([[ax - 1, ay - 33], [ax + 6, ay - 33], [ax - 1, ay - 41]], (x, y, u) => tone(BRASS, clamp01(0.8 - u * 0.4), x, y));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -12, y: -8, w: 24, h: 9 } });
}

function beehive() {
  const R = new Ras(50, 56), ax = 20, ay = 48, paint = ramp('#e8d8a0', 6);
  R.sPoly([[ax - 14, ay - 3], [ax + 14, ay - 3], [ax + 26, ay + 5], [ax - 2, ay + 5]], 0.36);
  for (const x of [ax - 12, ax + 9]) R.rect(x, ay - 12, 3, 12, (i, j, u) => tone(WOOD, clamp01(0.5 - u * 0.3), i, j));
  R.rect(ax - 14, ay - 14, 28, 3, (i, j, u, v) => tone(WOOD, clamp01(0.65 - v * 0.4), i, j));
  for (let k = 0; k < 2; k++) {
    const y = ay - 26 - k * 12;
    R.rect(ax - 12, y, 24, 12, (i, j, u, v) => tone(paint, clamp01(0.62 - v * 0.25 + (u < 0.06 ? 0.12 : u > 0.94 ? -0.15 : 0) + (v < 0.1 ? 0.12 : 0) + (((i - ax) % 6) === 0 ? -0.05 : 0)), i, j));
  }
  R.rect(ax - 4, ay - 17, 8, 2, [34, 24, 16]);
  R.poly([[ax - 15, ay - 38], [ax + 15, ay - 38], [ax + 11, ay - 44], [ax - 11, ay - 44]], (i, j, u, v) => tone(ramp('#8a5a3a', 6), clamp01(0.3 + v * 0.45 - u * 0.1), i, j));
  const rand = rng(5);
  for (let k = 0; k < 7; k++) { const x = ax - 14 + rand() * 30, y = ay - 44 + rand() * 30; R.set(x, y, [240, 190, 40]); R.set(x + 1, y, [30, 24, 20]); }
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -14, y: -8, w: 28, h: 9 } });
}

// ================================================================ 시장·불
const STALL = { red: '#b8403a', blue: '#3a62a6', green: '#3e8a4a', yellow: '#d8a832' };
function stall(v) {
  const W = 140, H = 104, ax = 56, ay = 94, R = new Ras(W, H), w = 100, x0 = ax - w / 2, cp = ramp(STALL[v] || STALL.red, 6), cream = ramp('#efe4c6', 6);
  R.sPoly([[x0, ay - 30], [x0 + w, ay - 30], [x0 + w + 34, ay - 10], [x0 + w + 34, ay + 7], [x0 + 12, ay + 7], [x0, ay]], 0.38);
  for (const x of [x0 + 2, x0 + w - 6]) cylV(R, x, ay - 66, 4, 66, WOOD);
  // 진열대
  R.rect(x0 + 4, ay - 30, w - 8, 10, (i, j, u, vv) => tone(WOOD, clamp01(0.72 - vv * 0.15 + (((j - ay) % 3) === 0 ? -0.12 : 0)), i, j));
  R.rect(x0 + 4, ay - 20, w - 8, 20, (i, j, u, vv) => { const b = (i - x0) % 8; return tone(WOOD, clamp01(0.45 - vv * 0.2 + (b === 0 ? -0.2 : b === 1 ? 0.08 : 0) + (vnoise(i / 1.2, j / 6, 1, 3) - 0.5) * 0.15), i, j); });
  R.rect(x0 + 4, ay - 20, w - 8, 2, (i, j) => tone(WOOD, 0.15, i, j));
  const goods = [[ramp('#d84a3a', 5), 4], [ramp('#f0962c', 5), 4], [ramp('#e8cc3a', 5), 3.5], [ramp('#7ab040', 5), 4], [ramp('#9a4aa0', 5), 3]];
  for (let k = 0; k < 7; k++) {
    const gx = x0 + 12 + k * 13, [gp, r] = goods[k % 5];
    R.rect(gx - 6, ay - 30, 12, 5, (i, j, u, vv) => tone(ramp('#a07848', 5), clamp01(0.6 - vv * 0.4), i, j));
    for (const [dx, dy] of [[-3, -1], [3, -1], [0, -4], [-2, -6], [2, -5]]) if (dy > -6 || k % 2) blob(R, gx + dx, ay - 30 + dy, r * 0.8, r * 0.8, gp);
  }
  // 줄무늬 차양
  const top = ay - 86, fr = ay - 62;
  R.poly([[x0 - 4, fr], [x0 + 6, top], [x0 + w - 6, top], [x0 + w + 4, fr]], (i, j, u, vv) => {
    const st = Math.floor((i - x0 + 4 + (fr - j) * 0.1) / 10) % 2;
    return tone(st ? cream : cp, clamp01(0.4 + vv * 0.3 + (u < 0.08 ? 0.12 : u > 0.92 ? -0.15 : 0)), i, j);
  });
  for (let x = x0 - 4; x < x0 + w + 4; x++) {
    const k = (x - x0 + 4) % 10, st = Math.floor((x - x0 + 4) / 10) % 2, dep = 3 + Math.round(Math.sin((k / 10) * Math.PI) * 3);
    for (let j = 0; j < dep; j++) R.set(x, fr + j, tone(st ? cream : cp, clamp01(0.42 - j * 0.05), x, fr + j));
  }
  for (let x = x0 + 4; x < x0 + w - 4; x++) for (let k = 0; k < 8; k++) R.shadeAt(x, fr + 6 + k, -0.3 + k * 0.035);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -w / 2 + 2, y: -26, w: w - 4, h: 27 } });
}

function tent() {
  const R = new Ras(96, 70), ax = 38, ay = 60, cv = ramp('#8e8a4e', 7);
  R.sPoly([[ax - 32, ay - 2], [ax + 32, ay - 2], [ax + 48, ay + 7], [ax - 16, ay + 7]], 0.36);
  R.poly([[ax - 32, ay], [ax - 4, ay - 46], [ax - 4 + 24, ay - 52], [ax + 36, ay - 4]], (i, j, u, v) => tone(cv, clamp01(0.3 + v * 0.1 - u * 0.1 + (Math.abs(((i - j * 0.5) % 12)) < 1 ? -0.08 : 0)), i, j));
  R.poly([[ax - 32, ay], [ax, ay - 50], [ax + 32, ay]], (i, j, u, v) => {
    const door = Math.abs(i - ax) < (j - (ay - 34)) * 0.45 && j > ay - 34;
    if (door) return tone([[18, 16, 12], [34, 30, 22], [56, 50, 34]], clamp01(0.2 + (j - ay + 34) * 0.01), i, j);
    return tone(cv, clamp01(0.62 - u * 0.35 + (Math.abs(i - ax) < 1 ? -0.2 : 0)), i, j);
  });
  R.poly([[ax, ay - 34], [ax - 10, ay], [ax - 16, ay]], (i, j) => tone(cv, 0.78, i, j));
  R.line(ax, ay - 50, ax + 22, ay - 56, WOOD[1], 2);
  R.line(ax - 32, ay, ax - 40, ay + 3, [150, 130, 96]); R.line(ax + 32, ay, ax + 42, ay + 3, [150, 130, 96]);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -30, y: -16, w: 62, h: 17 } });
}

function forge() {
  const W = 110, H = 110, ax = 44, ay = 100, R = new Ras(W, H), x0 = ax - 26;
  R.sPoly([[x0, ay - 40], [x0 + 52, ay - 40], [x0 + 88, ay - 16], [x0 + 88, ay + 7], [x0 + 10, ay + 7], [x0, ay]], 0.42);
  const br = ramp('#8a4a3a', 7);
  R.rect(ax + 6, ay - 94, 14, 50, (i, j, u) => { const row = Math.floor((j - ay) / 4), off = (row & 1) * 3; return ((j - ay) % 4 === 0 || (i - ax + off) % 7 === 0) ? br[1] : tone(br, clamp01(0.55 - u * 0.35 + (rnd(i >> 2, row, 3) - 0.5) * 0.15), i, j); });
  R.rect(ax + 4, ay - 98, 18, 5, (i, j, u, v) => tone(STONE, clamp01(0.8 - v * 0.4 - u * 0.2), i, j));
  stoneBox(R, x0, ay - 48, 52, 6, 42, STONE, 21);
  R.poly([[x0 + 10, ay - 4], [x0 + 10, ay - 26], [x0 + 26, ay - 34], [x0 + 42, ay - 26], [x0 + 42, ay - 4]], (i, j, u, v) => tone([[140, 40, 16], [210, 90, 24], [248, 150, 50], [255, 210, 110], [255, 244, 200]], clamp01(0.95 - v * 0.2 - Math.abs(u - 0.5) * 1.1 + (rnd(i, j, 4) - 0.5) * 0.15), i, j));
  for (let k = 0; k < 6; k++) R.rect(x0 + 13 + k * 5, ay - 8, 4, 3, (i, j) => tone([[20, 14, 12], [50, 30, 20]], 0.4, i, j));
  // 모루
  const vx = ax + 38;
  cylV(R, vx - 7, ay - 14, 14, 14, WOOD);
  R.poly([[vx - 12, ay - 24], [vx + 10, ay - 24], [vx + 5, ay - 18], [vx - 5, ay - 18]], (i, j, u, v) => tone(IRON, clamp01(0.7 - v * 0.5 - u * 0.2), i, j));
  R.poly([[vx - 12, ay - 24], [vx - 18, ay - 22], [vx - 12, ay - 20]], (i, j) => tone(IRON, 0.5, i, j));
  R.rect(vx - 4, ay - 18, 8, 4, (i, j, u) => tone(IRON, clamp01(0.4 - u * 0.3), i, j));
  barrelAt(R, x0 - 4, ay, 12, 14);
  R.outline({ ink: INK });
  R.glow(x0 + 26, ay - 16, 34, [255, 150, 60], 0.45);
  R.glow(x0 + 26, ay - 16, 14, [255, 220, 150], 0.5);
  return out(R, ax, ay, { block: { x: -28, y: -34, w: 76, h: 35 }, light: { x: -18, y: -16, r: 70 } });
}

function lanternPost() {
  const R = new Ras(70, 90), ax = 22, ay = 80;
  R.sEll(ax + 3, ay, 7, 3, 0.4);
  R.sPoly([[ax - 1, ay - 1], [ax + 2, ay - 2], [ax + 36, ay + 7], [ax + 32, ay + 8]], 0.22);
  cylV(R, ax - 3, ay - 66, 6, 66, WOOD, { tex: (i, j) => (vnoise(i, j / 6, 1, 3) - 0.5) * 0.3 });
  R.rect(ax - 2, ay - 64, 26, 3, (i, j, u, v) => tone(WOOD, clamp01(0.62 - v * 0.4), i, j));
  R.line(ax + 3, ay - 61, ax + 10, ay - 54, WOOD[2], 2);
  R.line(ax + 19, ay - 61, ax + 19, ay - 56, IRON[2]);
  const lx = ax + 13, ly = ay - 56;
  R.rect(lx, ly, 12, 14, (i, j, u, v) => (u < 0.12 || u > 0.88) ? tone(IRON, u < 0.5 ? 0.5 : 0.2, i, j) : tone([[200, 90, 30], [240, 150, 60], [255, 204, 110], [255, 236, 180]], clamp01(0.9 - v * 0.4 - Math.abs(u - 0.5)), i, j));
  R.poly([[lx - 1, ly + 1], [lx + 6, ly - 5], [lx + 13, ly + 1]], (i, j, u) => tone(IRON, clamp01(0.6 - u * 0.5), i, j));
  R.rect(lx + 1, ly + 14, 10, 2, IRON[1]);
  R.outline({ ink: INK });
  R.glow(lx + 6, ly + 7, 24, [255, 180, 90], 0.42);
  return out(R, ax, ay, { block: { x: -4, y: -4, w: 8, h: 5 }, light: { x: 19 - 3, y: -49, r: 50 } });
}

function alarmTower() {
  const W = 110, H = 170, ax = 44, ay = 160, R = new Ras(W, H), plat = ay - 104;
  R.sPoly([[ax - 24, ay - 4], [ax + 24, ay - 4], [ax + 80, ay + 8], [ax + 20, ay + 9]], 0.36);
  const legs = [[ax - 24, ax - 14], [ax + 24, ax + 14]];
  for (const [bx, tx] of legs) R.stroke([[bx, ay], [tx, plat]], 5, 4, (x, y, t, nx) => tone(WOOD, clamp01(0.5 - nx * 0.25 + (vnoise(x, y / 5, 1, 3) - 0.5) * 0.2), x, y));
  for (let k = 0; k < 3; k++) {
    const y0 = ay - 8 - k * 32, y1 = y0 - 30, w0 = 24 - (k * 32 + 8) / 104 * 10, w1 = 24 - (k * 32 + 38) / 104 * 10;
    R.line(ax - w0, y0, ax + w1, y1, WOOD[2], 2); R.line(ax + w0, y0, ax - w1, y1, WOOD[1], 2);
    R.line(ax - w0, y0, ax + w0, y0, WOOD[3], 2);
  }
  for (let y = ay - 4; y > plat; y -= 5) { R.set(ax - 2, y, WOOD[4]); R.set(ax + 2, y, WOOD[4]); R.set(ax - 1, y, WOOD[3]); R.set(ax, y, WOOD[3]); R.set(ax + 1, y, WOOD[3]); }
  R.rect(ax - 20, plat - 4, 40, 6, (i, j, u, v) => tone(WOOD, clamp01(0.7 - v * 0.4 - u * 0.1), i, j));
  R.rect(ax - 20, plat - 14, 40, 2, (i, j, u) => tone(WOOD, clamp01(0.6 - u * 0.3), i, j));
  for (let x = ax - 20; x <= ax + 18; x += 6) R.rect(x, plat - 14, 2, 10, (i, j, u) => tone(WOOD, clamp01(0.55 - u * 0.3), i, j));
  for (const x of [ax - 18, ax + 16]) R.rect(x, plat - 36, 3, 24, (i, j, u) => tone(WOOD, clamp01(0.55 - u * 0.3), i, j));
  blob(R, ax, plat - 24, 7, 7, GOLD, { tex: (i, j, nx, ny) => (ny < 0 ? 0 : -0.1) });
  R.rect(ax - 8, plat - 20, 16, 3, (i, j, u) => tone(GOLD, clamp01(0.6 - u * 0.4), i, j));
  R.set(ax, plat - 16, GOLD[1]); R.set(ax, plat - 15, GOLD[0]);
  const rp = ramp('#7a4a34', 6);
  R.poly([[ax - 26, plat - 34], [ax, plat - 50], [ax, plat - 42], [ax - 26, plat - 28]], (i, j) => tone(rp, clamp01(0.66 + ((i - ax) % 5 === 0 ? -0.2 : 0)), i, j));
  R.poly([[ax + 26, plat - 34], [ax, plat - 50], [ax, plat - 42], [ax + 26, plat - 28]], (i, j) => tone(rp, clamp01(0.36 + ((i - ax) % 5 === 0 ? -0.2 : 0)), i, j));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -26, y: -12, w: 52, h: 13 } });
}

function sensorPost() {
  const R = new Ras(60, 100), ax = 22, ay = 92;
  R.sEll(ax + 3, ay, 8, 3, 0.4);
  R.sPoly([[ax - 1, ay - 1], [ax + 2, ay - 2], [ax + 34, ay + 7], [ax + 30, ay + 8]], 0.22);
  R.rect(ax - 6, ay - 4, 12, 4, (i, j, u, v) => tone(STONE, clamp01(0.7 - v * 0.4), i, j));
  cylV(R, ax - 2, ay - 76, 4, 72, STEEL);
  R.rect(ax + 2, ay - 44, 14, 16, (i, j, u, v) => tone(WHITE, clamp01(0.7 - u * 0.3 - v * 0.15 + (v < 0.1 ? 0.1 : 0)), i, j));
  R.set(ax + 13, ay - 41, [255, 60, 60]); R.set(ax + 12, ay - 41, [180, 30, 30]);
  R.poly([[ax - 18, ay - 58], [ax - 2, ay - 62], [ax - 2, ay - 52], [ax - 18, ay - 48]], (i, j, u, v) => (((i - ax) % 4 === 0) || ((j - ay) % 4 === 0)) ? [180, 190, 200] : tone([[20, 30, 60], [30, 50, 100], [50, 80, 150], [110, 150, 210]], clamp01(0.35 + (u + v < 0.5 ? 0.3 : 0)), i, j));
  R.line(ax, ay - 76, ax, ay - 84, STEEL[2]);
  for (const [dx, dy] of [[-8, -2], [7, -3], [0, 3]]) { R.line(ax, ay - 84, ax + dx, ay - 84 + dy, STEEL[3]); blob(R, ax + dx, ay - 84 + dy, 2, 1.8, WHITE); }
  R.line(ax, ay - 70, ax + 12, ay - 70, STEEL[2]); R.poly([[ax + 10, ay - 73], [ax + 16, ay - 70], [ax + 10, ay - 67]], (i, j) => tone(ramp('#d84a3a', 4), 0.6, i, j));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -6, y: -5, w: 12, h: 6 } });
}

function firepit(v) {
  const lit = v !== 'out', R = new Ras(70, 70), ax = 30, ay = 58, rx = 18, ry = 7, cy = ay - 7;
  R.sEll(ax + 5, ay - 2, 22, 7, 0.35);
  R.ell(ax, cy, rx - 3, ry - 2, (x, y) => tone(lit ? [[40, 20, 14], [70, 34, 20], [110, 50, 24]] : [[30, 28, 28], [54, 50, 48], [90, 86, 80]], clamp01(0.3 + (rnd(x, y, 3) - 0.5) * 0.5), x, y));
  for (const [a, b] of [[-10, 6], [8, -5], [-4, -7]]) R.stroke([[ax + a, cy + 2], [ax + b, cy - 2]], 4, 3, (x, y, t, nx) => tone(lit ? WOOD : [[20, 18, 18], [40, 36, 34], [70, 64, 60]], clamp01(0.45 - nx * 0.3), x, y));
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2, x = ax + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    blob(R, x, y, 4.2, 3.4, STONE, { bias: Math.sin(a) > 0 ? 0 : -0.05 });
  }
  if (lit) {
    const fl = [[180, 50, 20], [230, 100, 30], [250, 160, 50], [255, 216, 110], [255, 246, 200]];
    for (const [dx, h, w] of [[-6, 18, 6], [5, 22, 6], [0, 30, 8], [-2, 14, 5]]) {
      for (let y = 0; y < h; y++) {
        const t = y / h, hw = w * Math.sin(Math.pow(1 - t, 0.7) * Math.PI * 0.9) * (1 - t * 0.3), sx = Math.sin(t * 6 + dx) * 2 * t;
        for (let x = -Math.ceil(hw); x <= hw; x++) R.set(ax + dx + x + sx, cy - 2 - y, tone(fl, clamp01(0.95 - t * 0.7 - Math.abs(x) / (hw + 1) * 0.5 + 0.1), ax + x, y));
      }
    }
    for (let k = 0; k < 8; k++) R.set(ax - 8 + rnd(k, 1, 4) * 16, cy - 30 - rnd(k, 2, 4) * 14, [255, 200, 90], 0.9);
  }
  R.outline({ ink: INK });
  if (lit) { R.glow(ax, cy - 10, 36, [255, 150, 60], 0.45); R.glow(ax, cy - 10, 14, [255, 220, 150], 0.4); }
  return out(R, ax, ay, { block: { x: -18, y: -14, w: 36, h: 15 }, light: lit ? { x: 0, y: -17, r: 80 } : undefined });
}

// ================================================================ 전기·항구
function powerPole() {
  const R = new Ras(64, 140), ax = 26, ay = 132;
  R.sEll(ax + 4, ay, 7, 3, 0.4);
  R.sPoly([[ax - 1, ay - 1], [ax + 3, ay - 2], [ax + 50, ay + 7], [ax + 46, ay + 8]], 0.22);
  cylV(R, ax - 3, ay - 116, 7, 116, ramp('#7a5a40', 6), { tex: (i, j) => (vnoise(i, j / 7, 1, 3) - 0.5) * 0.28 });
  for (let y = ay - 20; y > ay - 100; y -= 12) { R.set(ax + 4, y, IRON[3]); R.set(ax + 5, y, IRON[1]); }
  R.rect(ax - 20, ay - 110, 40, 4, (i, j, u, v) => tone(WOOD, clamp01(0.66 - v * 0.4 - u * 0.1), i, j));
  R.line(ax - 14, ay - 106, ax - 2, ay - 96, WOOD[2]); R.line(ax + 14, ay - 106, ax + 2, ay - 96, WOOD[1]);
  const ins = [[220, 220, 214], [180, 180, 176], [120, 124, 124], [240, 240, 236]];
  for (const dx of [-16, 0, 16]) for (let k = 0; k < 3; k++) R.rect(ax + dx - 2 + (k === 1 ? -1 : 0), ay - 113 - k * 2, 4 + (k === 1 ? 2 : 0), 2, (i, j, u) => [ins[3], ins[0], ins[1], ins[2]][Math.min(3, Math.floor(u * 4))]);
  R.outline({ ink: INK });
  const tops = [-16, 0, 16].map((dx) => ({ x: dx, y: -118 }));
  return out(R, ax, ay, { block: { x: -4, y: -4, w: 8, h: 5 }, wireTop: { x: 0, y: -118 }, wireTops: tops });
}

function transformer() {
  const R = new Ras(70, 70), ax = 28, ay = 60, rp = ramp('#7a8a86', 7);
  R.sPoly([[ax - 20, ay - 3], [ax + 20, ay - 3], [ax + 34, ay + 6], [ax - 6, ay + 6]], 0.4);
  R.rect(ax - 22, ay - 6, 44, 6, (i, j, u, v) => tone(STONE, clamp01(0.7 - v * 0.4), i, j));
  R.rect(ax - 16, ay - 42, 32, 6, (i, j, u, v) => tone(rp, clamp01(0.78 - v * 0.2), i, j));
  R.rect(ax - 16, ay - 36, 32, 30, (i, j, u, v) => tone(rp, clamp01(0.5 - v * 0.2 + (u < 0.06 ? 0.12 : u > 0.94 ? -0.15 : 0) + (v < 0.05 ? 0.1 : 0)), i, j));
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) R.rect(ax + s * (17 + k % 2) - (s < 0 ? 2 : 0), ay - 34 + k * 6, 3, 4, (i, j, u) => tone(rp, clamp01(0.45 - u * 0.2), i, j));
  R.rect(ax - 16, ay - 12, 32, 4, (i, j) => ((i + j) >> 2) & 1 ? [230, 190, 40] : [34, 30, 26]);
  icon(R, 'bolt', ax, ay - 24, 6, GOLD);
  for (const dx of [-9, 0, 9]) for (let k = 0; k < 4; k++) R.rect(ax + dx - 2, ay - 44 - k * 2, 4, 2, (i, j, u) => [[240, 236, 226], [200, 196, 188], [150, 146, 140], [110, 106, 100]][Math.min(3, Math.floor(u * 4))]);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -20, y: -12, w: 40, h: 13 } });
}

function solarPanel() {
  const R = new Ras(80, 60), ax = 32, ay = 50;
  R.sPoly([[ax - 26, ay - 10], [ax + 26, ay - 10], [ax + 36, ay + 4], [ax - 16, ay + 4]], 0.4);
  for (const x of [ax - 22, ax + 19]) R.rect(x, ay - 14, 3, 14, (i, j, u) => tone(STEEL, clamp01(0.55 - u * 0.3), i, j));
  const cell = [[16, 24, 50], [24, 40, 84], [36, 62, 120], [70, 104, 170], [150, 186, 230], [220, 236, 250]];
  R.poly([[ax - 28, ay - 14], [ax + 28, ay - 14], [ax + 24, ay - 40], [ax - 24, ay - 40]], (i, j, u, v) => {
    const cu = u * 6, cv = v * 3, gu = Math.abs(cu - Math.round(cu)) < 0.06, gv = Math.abs(cv - Math.round(cv)) < 0.07;
    if (gu || gv) return [176, 188, 200];
    const refl = ((i - j * 1.1) % 40 + 40) % 40 < 5;
    return tone(cell, clamp01(0.35 + (1 - v) * 0.15 + (refl ? 0.35 : 0)), i, j);
  });
  R.line(ax - 28, ay - 14, ax + 28, ay - 14, STEEL[4]); R.line(ax - 24, ay - 40, ax + 24, ay - 40, STEEL[5]);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -26, y: -14, w: 52, h: 15 } });
}

function harborCrane() {
  const W = 190, H = 220, ax = 66, ay = 210, R = new Ras(W, H), yel = ramp('#e0a830', 7), dk = ramp('#6a5a4a', 6);
  R.sPoly([[ax - 44, ay - 8], [ax + 44, ay - 8], [ax + 110, ay + 8], [ax + 10, ay + 9]], 0.36);
  for (const s of [-1, 1]) {
    R.stroke([[ax + s * 40, ay], [ax + s * 16, ay - 70]], 7, 6, (x, y, t, nx) => tone(yel, clamp01(0.5 - nx * 0.3), x, y));
    R.rect(ax + s * 40 - 7, ay - 4, 14, 4, (i, j, u, v) => tone(STEEL, clamp01(0.6 - v * 0.4), i, j));
  }
  R.rect(ax - 36, ay - 34, 72, 4, (i, j, u, v) => tone(yel, clamp01(0.6 - v * 0.3), i, j));
  for (let k = 0; k < 6; k++) R.line(ax - 34 + k * 12, ay - 30, ax - 28 + k * 12, ay - 70 + k, yel[2]);
  R.rect(ax - 22, ay - 76, 44, 8, (i, j, u, v) => tone(yel, clamp01(0.7 - v * 0.4), i, j));
  // 운전실
  R.rect(ax - 18, ay - 104, 30, 28, (i, j, u, v) => tone(yel, clamp01(0.55 - u * 0.25 + (v < 0.08 ? 0.15 : 0)), i, j));
  R.rect(ax - 14, ay - 99, 18, 10, (i, j, u, v) => tone([[20, 30, 44], [40, 62, 84], [90, 130, 160], [180, 210, 225]], clamp01(0.35 + (u - v < 0 ? 0.25 : 0)), i, j));
  R.rect(ax - 20, ay - 107, 34, 4, (i, j, u) => tone(dk, clamp01(0.5 - u * 0.3), i, j));
  // 붐(격자)
  const bx0 = ax + 6, by0 = ay - 94, bx1 = ax + 112, by1 = ay - 196;
  const len = Math.hypot(bx1 - bx0, by1 - by0), dx = (bx1 - bx0) / len, dy = (by1 - by0) / len, nx = -dy * 7, ny = dx * 7;
  R.line(bx0, by0, bx1, by1, (x, y) => tone(yel, 0.7, Math.round(x), Math.round(y)), 2);
  R.line(bx0 + nx, by0 + ny, bx1 + nx * 0.4, by1 + ny * 0.4, (x, y) => tone(yel, 0.35, Math.round(x), Math.round(y)), 2);
  for (let t = 0; t < len; t += 10) {
    const k = t / len, px = bx0 + dx * t, py = by0 + dy * t, sc = 1 - k * 0.6;
    R.line(px, py, px + nx * sc + dx * 10, py + ny * sc + dy * 10, yel[3]);
    R.line(px + nx * sc, py + ny * sc, px + dx * 10, py + dy * 10, yel[2]);
  }
  R.line(ax - 4, ay - 107, ax + 30, ay - 130, STEEL[2]); R.line(ax + 30, ay - 130, bx1, by1, STEEL[3]);
  R.line(ax - 4, ay - 107, bx1 - 20, by1 + 16, STEEL[2]);
  R.line(bx1, by1 + 2, bx1, ay - 70, [40, 40, 44]);
  R.rect(bx1 - 4, ay - 70, 8, 6, (i, j, u, v) => tone(yel, clamp01(0.6 - u * 0.4), i, j));
  R.stroke([[bx1, ay - 64], [bx1, ay - 58], [bx1 + 4, ay - 56]], 2, 2, IRON[2]);
  R.rect(ax - 30, ay - 116, 12, 10, (i, j, u, v) => tone(dk, clamp01(0.55 - u * 0.3), i, j));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -46, y: -12, w: 92, h: 13 } });
}

function boat() {
  const R = new Ras(104, 64), ax = 46, ay = 46, hull = ramp('#8a5a3a', 7), paint = ramp('#3a6a9a', 6), L = 40, cy = ay - 16;
  for (let k = 0; k < 3; k++) R.sEll(ax + 6, ay - 6 + k, 44 - k * 4, 10 - k, 0.12);
  const half = (x, s) => { const nx = (x + 0.5 - ax) / (L * s); if (Math.abs(nx) > 1) return -1; return (nx < 0 ? Math.sqrt(1 - nx ** 6) : Math.pow(1 - nx ** 1.7, 0.75)) * 11 * s; };
  const inside = (x, y, s, dy = 0) => { const h = half(x, s); return h > 0 && Math.abs(y - dy - cy) <= h; };
  for (let y = cy - 14; y <= ay + 2; y++) for (let x = ax - L - 2; x <= ax + L + 2; x++) {
    const inTop = inside(x, y, 1);
    if (!inTop && inside(x, y, 1, 7) && y > cy) {
      const d = y - (cy + half(x, 1));
      R.set(x, y, d < 2 ? tone(WHITE, clamp01(0.7 - (x - ax) / 90), x, y) : tone(paint, clamp01(0.52 - d * 0.04 - (x - ax) / 90 * 0.3), x, y));
      continue;
    }
    if (!inTop) continue;
    if (!inside(x, y, 0.84)) { R.set(x, y, tone(hull, clamp01(0.74 - (x - ax) / 100 * 0.3 - (y > cy ? 0.12 : 0)), x, y)); continue; }
    const plank = ((y - cy) % 4 + 4) % 4 === 0;
    R.set(x, y, tone(hull, clamp01(0.4 + (plank ? -0.14 : 0) + (y < cy ? -0.08 : 0.04) + (vnoise(x / 5, y, 1, 3) - 0.5) * 0.15), x, y));
  }
  for (const sx of [ax - 14, ax + 10]) R.rect(sx, cy - 8, 5, 17, (i, j, u, v) => tone(hull, clamp01(0.72 - u * 0.3 - v * 0.15), i, j));
  R.line(ax - 22, cy - 3, ax - 2, cy + 8, WOOD[3], 2);
  R.stroke([[ax + 34, cy], [ax + 40, cy - 2], [ax + 46, cy + 3]], 1.5, 1.5, [170, 150, 110]);
  R.outline({ ink: [20, 30, 36] });
  for (let x = ax - 46; x < ax + 50; x += 3) if (rnd(x, 0, 5) > 0.4) R.set(x, ay + 2 + (x & 1), [200, 230, 232], 0.6);
  return out(R, ax, ay, { block: { x: -40, y: -26, w: 82, h: 27 } });
}

function lighthouse() {
  const W = 100, H = 240, ax = 40, ay = 230, R = new Ras(W, H), red = ramp('#b8403a', 6), top = ay - 170;
  R.sPoly([[ax - 24, ay - 8], [ax + 24, ay - 8], [ax + 70, ay + 8], [ax + 20, ay + 9]], 0.4);
  stoneBox(R, ax - 28, ay - 14, 56, 5, 9, STONE, 3);
  for (let y = top; y < ay - 14; y++) {
    const t = (y - top) / (ay - 14 - top), hw = 13 + t * 9, band = Math.floor((y - top) / 26) % 2 === 1;
    for (let x = Math.floor(ax - hw); x < ax + hw; x++) {
      const n = (x + 0.5 - ax) / hw, v = 0.36 + lambert(n * 0.95, -0.05) * 0.5 - 0.06 + (rnd(x, y, 3) - 0.5) * 0.05;
      R.set(x, y, tone(band ? red : WHITE, clamp01(v), x, y));
    }
  }
  R.rect(ax - 4, ay - 30, 8, 16, (i, j, u, v) => tone(WOOD, clamp01(0.4 - u * 0.2 + (v < 0.1 ? -0.2 : 0)), i, j));
  for (const yy of [ay - 70, ay - 118]) R.rect(ax - 2, yy, 5, 7, (i, j, u, v) => tone([[20, 30, 44], [60, 90, 120], [150, 190, 210]], clamp01(0.3 + (u < 0.3 ? 0.4 : 0)), i, j));
  R.rect(ax - 20, top - 4, 40, 5, (i, j, u, v) => tone(STEEL, clamp01(0.7 - v * 0.4 - u * 0.2), i, j));
  for (let x = ax - 19; x < ax + 20; x += 4) R.rect(x, top - 12, 1, 8, STEEL[1]);
  R.rect(ax - 20, top - 13, 40, 2, (i, j, u) => tone(STEEL, clamp01(0.6 - u * 0.3), i, j));
  R.rect(ax - 11, top - 30, 22, 26, (i, j, u, v) => {
    if ((i - ax + 11) % 7 === 0) return STEEL[1];
    return tone([[200, 120, 40], [250, 190, 80], [255, 236, 160], [255, 252, 230]], clamp01(0.9 - Math.abs(u - 0.45) * 1.2 - v * 0.2), i, j);
  });
  R.ell(ax, top - 30, 14, 12, (x, y, nx, ny) => (y > top - 30 ? null : tone(red, clamp01(0.36 + lambert(nx, ny) * 0.5), x, y)));
  R.line(ax, top - 42, ax, top - 50, IRON[2]); blob(R, ax, top - 50, 2, 2, BRASS);
  R.outline({ ink: INK });
  R.glow(ax, top - 18, 40, [255, 220, 140], 0.45);
  R.glow(ax, top - 18, 16, [255, 250, 220], 0.55);
  return out(R, ax, ay, { block: { x: -26, y: -16, w: 52, h: 17 }, light: { x: 0, y: top - 18 - ay, r: 90 } });
}

function signalTower(v) {
  const on = v !== 'off', W = 80, H = 180, ax = 30, ay = 170, R = new Ras(W, H), top = ay - 150;
  R.sPoly([[ax - 16, ay - 4], [ax + 16, ay - 4], [ax + 60, ay + 8], [ax + 20, ay + 9]], 0.32);
  const hw = (y) => 16 - ((ay - y) / (ay - top)) * 12;
  for (const s of [-1, 1]) R.line(ax + s * 16, ay, ax + s * 4, top, (x, y) => tone(STEEL, s < 0 ? 0.65 : 0.35, Math.round(x), Math.round(y)), 2);
  for (let y = ay - 4; y > top + 6; y -= 14) {
    const a = hw(y), b = hw(y - 14);
    R.line(ax - a, y, ax + b, y - 14, STEEL[3]); R.line(ax + a, y, ax - b, y - 14, STEEL[2]);
    R.line(ax - a, y, ax + a, y, STEEL[4]);
  }
  R.rect(ax - 10, top - 3, 20, 4, (i, j, u, vv) => tone(STEEL, clamp01(0.7 - vv * 0.4 - u * 0.2), i, j));
  const lc = on ? [[180, 40, 30], [240, 90, 60], [255, 170, 130], [255, 230, 210]] : [[40, 20, 20], [70, 34, 30], [110, 60, 54], [150, 100, 96]];
  blob(R, ax, top - 8, 5, 5, lc, { bias: on ? 0.3 : 0 });
  R.rect(ax - 6, top - 4, 12, 2, STEEL[1]);
  R.outline({ ink: INK });
  if (on) { R.glow(ax, top - 8, 26, [255, 90, 60], 0.5); R.glow(ax, top - 8, 9, [255, 220, 200], 0.5); }
  return out(R, ax, ay, { block: { x: -16, y: -8, w: 32, h: 9 }, light: on ? { x: 0, y: top - 8 - ay, r: 50 } : undefined });
}

function bollard() {
  const R = new Ras(34, 34), ax = 12, ay = 26;
  R.sEll(ax + 4, ay - 1, 9, 3, 0.4);
  cylV(R, ax - 6, ay - 14, 12, 14, IRON, { amp: 0.7 });
  R.ell(ax, ay - 16, 7.5, 3.5, (x, y, nx, ny) => tone(IRON, clamp01(0.6 - ny * 0.3 - nx * 0.2), x, y));
  R.ell(ax, ay - 17, 5, 2, (x, y) => tone(IRON, 0.75, x, y));
  R.stroke([[ax - 6, ay - 9], [ax - 3, ay - 5], [ax + 4, ay - 5], [ax + 7, ay - 9]], 2, 2, (x, y) => tone([[110, 86, 50], [160, 130, 80], [200, 170, 110]], 0.6, x, y));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -7, y: -6, w: 14, h: 7 } });
}

function anchorDecor() {
  const R = new Ras(70, 70), ax = 28, ay = 60;
  R.sPoly([[ax - 18, ay - 3], [ax + 18, ay - 3], [ax + 34, ay + 6], [ax - 2, ay + 6]], 0.38);
  stoneBox(R, ax - 18, ay - 10, 36, 4, 6, STONE, 5);
  const I = (x, y, t, nx) => tone(IRON, clamp01(0.5 - nx * 0.3), x, y);
  R.stroke([[ax, ay - 12], [ax, ay - 50]], 5, 4, I);
  R.stroke([[ax - 16, ay - 24], [ax - 12, ay - 16], [ax, ay - 12], [ax + 12, ay - 16], [ax + 16, ay - 24]], 4, 4, I);
  R.poly([[ax - 19, ay - 26], [ax - 13, ay - 26], [ax - 16, ay - 32]], (x, y) => tone(IRON, 0.6, x, y));
  R.poly([[ax + 13, ay - 26], [ax + 19, ay - 26], [ax + 16, ay - 32]], (x, y) => tone(IRON, 0.35, x, y));
  R.rect(ax - 10, ay - 46, 20, 4, (i, j, u, v) => tone(IRON, clamp01(0.6 - v * 0.4), i, j));
  R.ell(ax, ay - 54, 5, 5, (x, y, nx, ny) => (Math.hypot(nx, ny) > 0.55 ? tone(IRON, clamp01(0.5 - nx * 0.3 - ny * 0.2), x, y) : null));
  R.stroke([[ax + 4, ay - 54], [ax + 12, ay - 44], [ax + 8, ay - 34], [ax + 16, ay - 20], [ax + 22, ay - 12]], 2, 2, (x, y) => tone([[110, 86, 50], [160, 130, 80], [210, 180, 120]], 0.6, x, y));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -18, y: -12, w: 36, h: 13 } });
}

function containerAt(R, x, y, w, h, top, color, seed) {
  const cp = ramp(color, 7);
  R.rect(x, y, w, top, (i, j, u, v) => tone(cp, clamp01(0.74 - v * 0.1 + (((i - x) % 6) === 0 ? -0.08 : 0)), i, j));
  R.rect(x, y + top, w, h, (i, j, u, v) => {
    const rib = Math.sin(((i - x) / 4) * Math.PI * 2) * 0.1;
    let t = 0.48 + rib - v * 0.12 + (u < 0.03 ? 0.14 : u > 0.97 ? -0.18 : 0) + (v < 0.06 ? 0.1 : v > 0.94 ? -0.15 : 0);
    if (vnoise(i / 2, j / 8, 1.5, seed) > 0.72) t -= 0.12;
    return tone(cp, clamp01(t), i, j);
  });
  for (const fx of [x + 1, x + w - 3]) R.rect(fx, y + top, 2, h, (i, j) => tone(cp, 0.3, i, j));
}
function cargo() {
  const R = new Ras(130, 90), ax = 52, ay = 80;
  R.sPoly([[ax - 50, ay - 8], [ax + 50, ay - 8], [ax + 70, ay + 7], [ax - 30, ay + 7]], 0.42);
  containerAt(R, ax - 50, ay - 34, 50, 26, 8, '#b84a3a', 1);
  containerAt(R, ax, ay - 34, 50, 26, 8, '#3a6aa6', 2);
  for (let x = ax - 30; x < ax + 26; x++) for (let k = 0; k < 4; k++) R.shadeAt(x, ay - 34 + k, -0.3 + k * 0.06);
  containerAt(R, ax - 28, ay - 68, 52, 26, 8, '#3e8a5a', 3);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -50, y: -18, w: 100, h: 19 } });
}

// ================================================================ 미래
function labDome() {
  const W = 230, H = 170, ax = 92, ay = 158, R = new Ras(W, H), rx = 90, wallH = 26, cy = ay - wallH;
  R.sPoly([[ax + rx - 10, ay - 90], [ax + rx + 40, ay - 50], [ax + rx + 44, ay + 8], [ax - rx + 20, ay + 9], [ax - rx, ay]], 0.42);
  for (let x = ax - rx; x <= ax + rx; x++) {
    const n = (x + 0.5 - ax) / rx; if (Math.abs(n) > 1) continue;
    const bulge = Math.sqrt(1 - n * n) * 8;
    for (let y = Math.floor(cy - 4 + bulge * 0.3); y < ay + bulge * 0.3 - 3; y++) {
      const band = y > ay - 12 + bulge * 0.3;
      R.set(x, y, tone(band ? STEEL : WHITE, clamp01(0.35 + lambert(n * 0.95, 0) * 0.45 + (band ? -0.05 : 0) + ((y - cy) === 6 ? -0.2 : 0)), x, y));
    }
  }
  const glassP = [[16, 50, 70], [26, 84, 110], [44, 124, 150], [80, 170, 194], [150, 220, 236], [220, 250, 255]];
  R.ell(ax, cy, rx - 6, 94, (x, y, nx, ny) => {
    if (y > cy) return null;
    const lon = Math.abs(((Math.atan2(nx, Math.sqrt(Math.max(0.001, 1 - nx * nx - ny * ny))) / 0.28) % 1 + 1) % 1 - 0.5) < 0.05;
    const lat = Math.abs(((ny * 4) % 1 + 1) % 1 - 0.5) < 0.06;
    if (lon || lat) return tone(WHITE, clamp01(0.55 + lambert(nx, ny) * 0.35), x, y);
    let v = 0.3 + lambert(nx * 0.9, ny * 0.9) * 0.35 + (Math.abs(nx + ny * 0.6 + 0.55) < 0.08 ? 0.35 : 0);
    if (Math.hypot(nx, ny + 0.35) < 0.35 && vnoise(x, y, 4, 3) > 0.45) v += 0.15;
    return tone(glassP, clamp01(v), x, y);
  });
  R.rect(ax - 12, ay - 32, 24, 28, (i, j, u, v) => (u < 0.1 || u > 0.9 || v < 0.07) ? tone(STEEL, 0.6 - u * 0.3, i, j) : tone(CYAN, clamp01(0.4 + (Math.abs(u - 0.5) < 0.04 ? -0.3 : 0) + (u + v < 0.6 ? 0.25 : 0)), i, j));
  R.rect(ax - 18, ay - 4, 36, 4, (i, j, u, v) => tone(STEEL, clamp01(0.7 - v * 0.4), i, j));
  R.outline({ ink: [22, 30, 36] });
  R.glow(ax, cy - 30, 60, [120, 230, 255], 0.16);
  return out(R, ax, ay, { block: { x: -rx, y: -70, w: rx * 2, h: 71 } });
}

function radarDish() {
  const R = new Ras(90, 90), ax = 36, ay = 80;
  R.sPoly([[ax - 14, ay - 4], [ax + 14, ay - 4], [ax + 44, ay + 7], [ax + 10, ay + 8]], 0.4);
  stoneBox(R, ax - 14, ay - 10, 28, 4, 6, ramp('#b8bcc0', 7), 3);
  cylV(R, ax - 4, ay - 36, 8, 26, STEEL);
  R.rect(ax - 8, ay - 40, 16, 6, (i, j, u, v) => tone(STEEL, clamp01(0.6 - u * 0.3 - v * 0.2), i, j));
  const dx = ax - 4, dy = ay - 58;
  R.ell(dx, dy, 26, 20, (x, y, nx, ny) => {
    const r = Math.hypot(nx, ny);
    if (r > 0.9) return tone(WHITE, clamp01(0.7 - nx * 0.2 - ny * 0.3), x, y);
    return tone(WHITE, clamp01(0.3 + r * 0.35 + nx * 0.15 + ny * 0.15 + ((Math.abs(((r * 4) % 1) - 0.5) > 0.45) ? -0.1 : 0)), x, y);
  });
  R.line(dx + 18, dy - 12, dx + 4, dy - 2, STEEL[2]); R.line(dx - 16, dy + 14, dx + 4, dy - 2, STEEL[2]); R.line(dx + 18, dy + 12, dx + 4, dy - 2, STEEL[3]);
  blob(R, dx + 4, dy - 2, 3, 3, STEEL);
  R.set(dx + 4, dy - 3, [255, 80, 80]);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -14, y: -12, w: 28, h: 13 } });
}

function holoBoard() {
  const R = new Ras(90, 96), ax = 34, ay = 84;
  R.sEll(ax + 5, ay - 1, 14, 4, 0.36);
  R.rect(ax - 10, ay - 8, 20, 8, (i, j, u, v) => tone(STEEL, clamp01(0.65 - v * 0.4 - u * 0.2), i, j));
  R.ell(ax, ay - 8, 10, 3, (x, y, nx, ny) => tone(STEEL, clamp01(0.75 - ny * 0.2), x, y));
  R.ell(ax, ay - 9, 5, 1.5, (x, y) => CYAN[3]);
  R.outline({ ink: INK });
  for (let y = ay - 30; y < ay - 9; y++) { const t = (ay - 9 - y) / 21; for (let x = ax - 3 - t * 20; x <= ax + 3 + t * 20; x++) R.set(x, y, CYAN[3], 0.12 * (1 - t * 0.5)); }
  const px = ax - 26, py = ay - 70, pw = 52, ph = 36;
  R.rect(px, py, pw, ph, (i, j, u, v) => {
    const border = u < 0.03 || u > 0.97 || v < 0.05 || v > 0.95;
    if (border) return [...CYAN[4], 0.9];
    const grid = (i - px) % 8 === 0 || (j - py) % 8 === 0;
    const bars = v > 0.55 && [0.18, 0.3, 0.42, 0.54].some((b, k) => Math.abs(u - b) < 0.04 && v > 0.9 - k * 0.1);
    const wave = Math.abs((1 - v) * ph - (18 + Math.sin(u * 9) * 5)) < 1 && u > 0.6;
    if (bars || wave) return [...CYAN[4], 0.95];
    return [...CYAN[grid ? 3 : 2], grid ? 0.5 : 0.28];
  });
  R.glow(px + pw / 2, py + ph / 2, 42, [100, 220, 255], 0.22);
  return out(R, ax, ay, { block: { x: -10, y: -6, w: 20, h: 7 }, light: { x: 0, y: -52, r: 50 } });
}

function observationTower() {
  const R = new Ras(90, 200), ax = 36, ay = 190, top = ay - 150;
  R.sPoly([[ax - 12, ay - 4], [ax + 12, ay - 4], [ax + 70, ay + 8], [ax + 30, ay + 9]], 0.34);
  stoneBox(R, ax - 16, ay - 10, 32, 4, 6, ramp('#b8bcc0', 7), 5);
  cylV(R, ax - 5, top, 10, ay - 10 - top, WHITE, { tex: (i, j) => (((j - top) % 20) === 0 ? -0.15 : 0) });
  R.rect(ax - 1, top + 10, 2, ay - 30 - top, (i, j) => (((j - top) % 6) < 3 ? CYAN[3] : CYAN[1]));
  R.ell(ax, top + 4, 22, 7, (x, y, nx, ny) => tone(WHITE, clamp01(0.5 - ny * 0.3 - nx * 0.2), x, y));
  R.rect(ax - 20, top - 12, 40, 14, (i, j, u, v) => {
    const n = u * 2 - 1;
    if (v > 0.2 && v < 0.8) return tone(CYAN, clamp01(0.35 + lambert(n, 0) * 0.3 + (((i - ax) % 6) === 0 ? -0.2 : 0)), i, j);
    return tone(WHITE, clamp01(0.4 + lambert(n * 0.95, 0) * 0.4), i, j);
  });
  R.ell(ax, top - 12, 20, 6, (x, y, nx, ny) => tone(WHITE, clamp01(0.7 - ny * 0.2 - nx * 0.15), x, y));
  R.line(ax, top - 18, ax, top - 36, STEEL[3]); R.set(ax, top - 37, [255, 90, 90]);
  R.outline({ ink: INK });
  R.glow(ax, top - 5, 30, [120, 230, 255], 0.2);
  return out(R, ax, ay, { block: { x: -16, y: -12, w: 32, h: 13 } });
}

function serverTower() {
  const R = new Ras(60, 120), ax = 22, ay = 110, dk = [[14, 16, 22], [22, 26, 34], [34, 40, 52], [52, 60, 76], [80, 90, 108], [120, 132, 150]];
  R.sPoly([[ax - 14, ay - 8], [ax + 14, ay - 8], [ax + 34, ay + 6], [ax - 2, ay + 7]], 0.42);
  R.rect(ax - 14, ay - 100, 28, 8, (i, j, u, v) => tone(dk, clamp01(0.7 - v * 0.2), i, j));
  R.rect(ax - 14, ay - 92, 28, 92, (i, j, u, v) => {
    let t = 0.35 + (u < 0.06 ? 0.2 : u > 0.94 ? -0.15 : 0) + (((j - ay) % 12) === 0 ? -0.2 : 0);
    return tone(dk, clamp01(t), i, j);
  });
  const leds = [[80, 255, 140], [80, 220, 255], [120, 160, 255], [255, 200, 80]];
  for (let row = 0; row < 7; row++) for (let k = 0; k < 4; k++) if (hash(row, k, 3) % 3) {
    const c = leds[hash(row, k, 4) % 4];
    R.set(ax - 9 + k * 4, ay - 86 + row * 12, c); R.set(ax - 9 + k * 4, ay - 85 + row * 12, mix(c, [0, 0, 0], 0.5));
  }
  for (let row = 0; row < 7; row++) R.rect(ax + 6, ay - 86 + row * 12, 5, 6, (i, j) => (((j - ay) & 1) ? dk[1] : dk[3]));
  R.rect(ax - 12, ay - 99, 24, 2, CYAN[3]);
  R.outline({ ink: [16, 20, 26] });
  R.glow(ax, ay - 98, 20, [100, 220, 255], 0.3);
  return out(R, ax, ay, { block: { x: -14, y: -10, w: 28, h: 11 } });
}

function windTurbine() {
  const R = new Ras(150, 230), ax = 70, ay = 220, top = ay - 160;
  R.sPoly([[ax - 8, ay - 3], [ax + 8, ay - 3], [ax + 60, ay + 8], [ax + 44, ay + 9]], 0.34);
  stoneBox(R, ax - 12, ay - 8, 24, 3, 5, ramp('#b8bcc0', 7), 4);
  for (let y = top; y < ay - 8; y++) {
    const t = (y - top) / (ay - 8 - top), hw = 2.5 + t * 3.5;
    for (let x = Math.floor(ax - hw); x < ax + hw; x++) R.set(x, y, tone(WHITE, clamp01(0.4 + lambert(((x + 0.5 - ax) / hw) * 0.95, 0) * 0.45), x, y));
  }
  R.rect(ax - 6, top - 7, 16, 8, (i, j, u, v) => tone(WHITE, clamp01(0.7 - u * 0.3 - v * 0.2), i, j));
  const hx = ax - 6, hy = top - 3;
  for (const a0 of [-Math.PI / 2 + 0.2, -Math.PI / 2 + 0.2 + (Math.PI * 2) / 3, -Math.PI / 2 + 0.2 + (Math.PI * 4) / 3]) {
    const dx = Math.cos(a0), dy = Math.sin(a0), nx = -dy, ny = dx, L = 66;
    R.poly([[hx + nx * 2, hy + ny * 2], [hx + dx * 16 + nx * 4, hy + dy * 16 + ny * 4], [hx + dx * L, hy + dy * L], [hx - nx * 1.5, hy - ny * 1.5]], (x, y) => tone(WHITE, clamp01(0.6 + (dy < 0 ? 0.1 : -0.1) - (((x - hx) * nx + (y - hy) * ny) < 0 ? 0.15 : 0)), x, y));
  }
  blob(R, hx, hy, 3.5, 3.5, WHITE);
  R.set(ax + 4, top - 8, [255, 70, 70]);
  R.outline({ ink: [40, 46, 56] });
  return out(R, ax, ay, { block: { x: -10, y: -8, w: 20, h: 9 } });
}

function crystal() {
  const R = new Ras(70, 90), ax = 28, ay = 80, cr = [[50, 30, 100], [90, 60, 170], [140, 110, 230], [190, 170, 255], [230, 220, 255], [255, 255, 255]];
  R.sPoly([[ax - 14, ay - 3], [ax + 14, ay - 3], [ax + 26, ay + 6], [ax - 2, ay + 6]], 0.38);
  stoneBox(R, ax - 14, ay - 12, 28, 4, 8, STONE, 7);
  R.poly([[ax - 10, ay - 12], [ax + 10, ay - 12], [ax + 7, ay - 22], [ax - 7, ay - 22]], (i, j, u, v) => tone(STONE, clamp01(0.62 - u * 0.3), i, j));
  R.rect(ax - 8, ay - 24, 16, 3, (i, j, u) => tone(BRASS, clamp01(0.8 - u * 0.5), i, j));
  const ct = ay - 64;
  R.poly([[ax, ct], [ax + 9, ct + 12], [ax + 7, ay - 28], [ax, ay - 23], [ax - 7, ay - 28], [ax - 9, ct + 12]], (i, j) => {
    const f = i < ax - 3 ? 0.62 : i < ax + 2 ? 0.85 : 0.38;
    return tone(cr, clamp01(f + (j < ct + 12 ? 0.12 : 0) + (Math.abs(i - ax + 1) < 1 && j > ct + 6 ? 0.2 : 0)), i, j);
  });
  for (const s of [-1, 1]) R.poly([[ax + s * 9, ay - 34], [ax + s * 14, ay - 42], [ax + s * 13, ay - 28], [ax + s * 9, ay - 26]], (i, j) => tone(cr, s < 0 ? 0.6 : 0.3, i, j));
  R.outline({ ink: [30, 20, 50] });
  R.glow(ax, ay - 44, 34, [180, 140, 255], 0.4);
  R.glow(ax, ay - 44, 12, [240, 230, 255], 0.4);
  return out(R, ax, ay, { block: { x: -14, y: -12, w: 28, h: 13 }, light: { x: 0, y: -44, r: 60 } });
}

function robotHelper() {
  const R = new Ras(50, 56), ax = 20, ay = 48, body = ramp('#e4eef4', 7);
  R.sEll(ax + 3, ay - 1, 11, 3.5, 0.4);
  blob(R, ax, ay - 16, 12, 12, body, { amp: 0.8 });
  R.rect(ax - 8, ay - 22, 16, 7, (i, j, u, v) => tone([[14, 22, 34], [24, 38, 56], [40, 64, 90]], clamp01(0.4 - v * 0.2 + (u < 0.3 && v < 0.4 ? 0.3 : 0)), i, j));
  for (const dx of [-4, 3]) { R.set(ax + dx, ay - 19, CYAN[4]); R.set(ax + dx + 1, ay - 19, CYAN[3]); R.set(ax + dx, ay - 18, CYAN[2]); R.set(ax + dx + 1, ay - 18, CYAN[2]); }
  R.line(ax, ay - 28, ax + 2, ay - 34, STEEL[3]); blob(R, ax + 2, ay - 35, 2, 2, [[160, 60, 40], [240, 110, 70], [255, 190, 150], [255, 240, 220]]);
  for (const s of [-1, 1]) R.stroke([[ax + s * 11, ay - 14], [ax + s * 15, ay - 9]], 3, 3, (x, y, t, nx) => tone(body, clamp01(0.5 - nx * 0.3), x, y));
  R.ell(ax, ay - 4, 7, 3, (x, y, nx) => tone(STEEL, clamp01(0.45 - nx * 0.3), x, y));
  R.outline({ ink: [26, 34, 44] });
  R.glow(ax, ay - 18, 14, [120, 230, 255], 0.18);
  return out(R, ax, ay);
}

export const PROPS = {
  crops, scarecrow, haystack, windmill, greenhouse, sundial, beehive,
  stall, tent, forge, 'lantern-post': lanternPost, 'alarm-tower': alarmTower, 'sensor-post': sensorPost, firepit,
  'power-pole': powerPole, transformer, 'solar-panel': solarPanel, 'harbor-crane': harborCrane, boat, lighthouse, 'signal-tower': signalTower, bollard, 'anchor-decor': anchorDecor, cargo,
  'lab-dome': labDome, 'radar-dish': radarDish, 'holo-board': holoBoard, 'observation-tower': observationTower, 'server-tower': serverTower, 'wind-turbine': windTurbine, crystal, 'robot-helper': robotHelper,
};
