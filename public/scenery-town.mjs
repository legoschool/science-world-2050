// 마을 소품: 가로등, 벤치, 분수, 화단, 이정표, 게시판, 우물, 통·상자, 울타리, 석상, 깃발, 광장 안내석, 구역 관문.
import { Ras, out, rng, rnd, hash, vnoise, tone, clamp01, lambert, ramp, col, mix, blob, cylV, box, cells, C } from './scenery-core.mjs';
import { icon } from './scenery-icons.mjs';
import { canopy, PAL } from './scenery-nature.mjs';

export const STONE = [[62, 58, 54], [88, 84, 78], [116, 110, 100], [144, 136, 122], [170, 162, 146], [194, 186, 168], [216, 210, 192]];
export const IRON = [[16, 16, 20], [30, 30, 36], [48, 48, 56], [72, 72, 80], [104, 104, 112]];
export const WOOD = [[48, 30, 22], [70, 46, 30], [94, 64, 40], [120, 84, 52], [146, 106, 66], [172, 130, 84]];
export const BRASS = [[76, 50, 22], [120, 84, 30], [168, 126, 46], [208, 168, 72], [236, 206, 120], [252, 238, 186]];
export const WATER = [[22, 64, 84], [32, 92, 112], [48, 124, 140], [78, 158, 168], [130, 198, 204], [206, 236, 236]];
const INK = [28, 22, 26];

export const THEME = {
  farm: { cloth: '#4e8e3e', trim: '#e0b948', icon: 'wheat', ic: '#f2d468' },
  fire: { cloth: '#b63a2c', trim: '#f09c40', icon: 'flame', ic: '#ffb444' },
  power: { cloth: '#3a63a6', trim: '#d6dde6', icon: 'bolt', ic: '#f6d84a' },
  future: { cloth: '#7450b0', trim: '#ece8f6', icon: 'star', ic: '#c8f4ff' },
  life: { cloth: '#2f8a7a', trim: '#f2e3b3', icon: 'heart', ic: '#ff8f9c' },
  school: { cloth: '#2f5d8c', trim: '#e6c65e', icon: 'book', ic: '#f4ecd8' },
};

// 돌 쌓은 면(가로 줄눈 + 세로 줄눈), u·v는 0..1
function ashlar(rp, x, y, x0, y0, rowH = 7, bw = 14, seed = 1, base = 0.5) {
  const lx = x - x0, ly = y - y0, row = Math.floor(ly / rowH), off = (row & 1) * (bw >> 1), bx = Math.floor((lx + off) / bw);
  const ry = ly - row * rowH, rx = (lx + off) - bx * bw;
  if (ry === rowH - 1 || rx === bw - 1) return rp[1];
  let v = base + ((hash(bx, row, seed) & 255) / 255 - 0.5) * 0.18 + (rnd(x, y, seed) - 0.5) * 0.07;
  if (ry === 0) v += 0.14; else if (ry === rowH - 2) v -= 0.1;
  if (rx === 0) v += 0.06; else if (rx === bw - 2) v -= 0.08;
  return tone(rp, clamp01(v), x, y);
}
// 3/4 시점 돌 상자(윗면 + 앞면)
function stoneBox(R, x, y, w, top, front, rp = STONE, seed = 1) {
  R.rect(x, y, w, top, (i, j, u, v) => tone(rp, clamp01(0.72 - v * 0.12 + (j === y ? 0.1 : 0) + (u < 0.04 ? 0.08 : u > 0.96 ? -0.1 : 0) + (rnd(i, j, seed) - 0.5) * 0.06), i, j));
  R.rect(x, y + top, w, front, (i, j, u) => {
    const c = ashlar(rp, i, j, x, y + top, Math.max(4, Math.min(7, front)), 14, seed, 0.44);
    return u > 0.95 ? mix(c, [0, 0, 0], 0.2) : c;
  });
}

// ---------------------------------------------------------------- 가로등
function lamp(v) {
  const on = v !== 'off', W = 80, H = 110, ax = 30, ay = 100, R = new Ras(W, H);
  R.sEll(ax + 4, ay, 9, 3, 0.4);
  R.sPoly([[ax - 1, ay - 1], [ax + 2, ay - 2], [ax + 40, ay + 8], [ax + 36, ay + 9]], 0.25);
  stoneBox(R, ax - 7, ay - 12, 14, 3, 9, STONE, 3);
  cylV(R, ax - 4, ay - 18, 8, 6, IRON);
  cylV(R, ax - 2, ay - 76, 4, 60, IRON, { amp: 0.7 });
  for (const yy of [ay - 22, ay - 50, ay - 76]) cylV(R, ax - 3, yy, 6, 3, IRON, { bias: 0.1 });
  // 등 머리
  const ly = ay - 96;
  cylV(R, ax - 5, ly + 16, 10, 3, IRON);
  R.rect(ax - 6, ly + 2, 12, 14, (i, j, u, vv) => {
    const edge = i === ax - 6 || i === ax + 5 || i === ax - 1 || i === ax;
    if (edge) return tone(IRON, i === ax - 6 ? 0.55 : 0.2, i, j);
    if (on) return tone([[196, 120, 40], [236, 170, 70], [255, 214, 120], [255, 240, 190], [255, 252, 236]], clamp01(0.95 - vv * 0.5 - Math.abs(u - 0.5) * 0.6), i, j);
    return tone([[24, 30, 40], [38, 48, 62], [60, 74, 90], [110, 130, 146]], clamp01(0.3 + ((i - j) % 7 === 0 ? 0.5 : 0) - vv * 0.1), i, j);
  });
  R.poly([[ax - 8, ly + 3], [ax, ly - 5], [ax + 8, ly + 3]], (i, j, u) => tone(IRON, clamp01(0.6 - u * 0.5), i, j));
  R.rect(ax - 8, ly + 2, 16, 2, (i, j, u) => tone(IRON, clamp01(0.5 - u * 0.3), i, j));
  R.line(ax, ly - 9, ax, ly - 5, IRON[2]); R.set(ax, ly - 10, BRASS[3]);
  R.outline({ ink: INK });
  if (on) { R.glow(ax, ly + 9, 30, [255, 196, 110], 0.42); R.glow(ax, ly + 9, 12, [255, 230, 170], 0.5); }
  return out(R, ax, ay, { block: { x: -6, y: -6, w: 12, h: 7 }, light: on ? { x: 0, y: -87, r: 60 } : undefined });
}

// ---------------------------------------------------------------- 벤치
function bench() {
  const W = 72, H = 40, ax = 30, ay = 32, R = new Ras(W, H);
  R.sPoly([[ax - 24, ay - 3], [ax + 26, ay - 3], [ax + 34, ay + 5], [ax - 16, ay + 5]], 0.36);
  const leg = (x) => { R.rect(x, ay - 12, 3, 12, (i, j, u) => tone(IRON, clamp01(0.5 - u * 0.3), i, j)); R.rect(x - 1, ay - 1, 5, 1, IRON[1]); };
  leg(ax - 23); leg(ax + 20);
  // 등받이(뒤쪽이라 위에 보인다)
  for (const yy of [ay - 25, ay - 20]) R.rect(ax - 25, yy, 50, 4, (i, j, u, vv) => tone(WOOD, clamp01(0.6 - vv * 0.35 + (vnoise(i / 5, j, 1, 3) - 0.5) * 0.2), i, j));
  for (const x of [ax - 22, ax + 19]) R.rect(x, ay - 27, 3, 16, (i, j, u) => tone(IRON, clamp01(0.55 - u * 0.3), i, j));
  // 앉는 판
  for (let k = 0; k < 3; k++) R.rect(ax - 25, ay - 14 + k * 3, 50, 3, (i, j, u, vv) => tone(WOOD, clamp01(0.72 - k * 0.08 - vv * 0.3 + (vnoise(i / 5, j, 1, 5 + k) - 0.5) * 0.2), i, j));
  R.rect(ax - 25, ay - 5, 50, 2, (i, j) => tone(WOOD, 0.2, i, j));
  for (const x of [ax - 25, ax + 22]) R.rect(x, ay - 17, 3, 5, (i, j, u) => tone(IRON, clamp01(0.6 - u * 0.3), i, j));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -25, y: -12, w: 50, h: 13 } });
}

// ---------------------------------------------------------------- 분수
function fountain() {
  const W = 196, H = 168, cx = 84, rx = 74, ry = 30, cyB = 100, wallH = 15, ay = cyB + ry + wallH - 1, R = new Ras(W, H);
  R.sEll(cx + 24, ay - ry + 12, rx + 6, ry + 5, 0.46);
  const irx = rx - 9, iry = ry - 5;
  // 바깥 벽(앞쪽 곡면)
  for (let x = cx - rx; x <= cx + rx; x++) {
    const nx = (x + 0.5 - cx) / rx;
    if (Math.abs(nx) > 1) continue;
    const yTop = cyB + ry * Math.sqrt(1 - nx * nx);
    for (let y = Math.floor(yTop); y < yTop + wallH; y++) {
      const seg = Math.floor((Math.asin(nx) + Math.PI / 2) / (Math.PI / 16)), ly = y - yTop, row = ly < wallH / 2 ? 0 : 1;
      const sgo = Math.floor((Math.asin(nx) + Math.PI / 2 + row * 0.1) / (Math.PI / 16));
      let v = 0.5 + lambert(nx * 0.95, 0.1) * 0.4 - 0.18 + ((hash(sgo, row, 4) & 255) / 255 - 0.5) * 0.14 + (rnd(x, y, 2) - 0.5) * 0.06;
      if (Math.abs(ly - wallH / 2) < 0.6) v = 0.14;
      if (ly < 1) v += 0.12;
      if (ly > wallH - 3) v -= 0.12;
      const next = Math.floor((Math.asin(Math.min(1, (x + 1.5 - cx) / rx)) + Math.PI / 2 + row * 0.1) / (Math.PI / 16));
      if (next !== sgo) v -= 0.2;
      R.set(x, y, tone(STONE, clamp01(v), x, y));
      void seg;
    }
  }
  // 물(안쪽) + 뒤쪽 안벽
  R.ell(cx, cyB, irx, iry, (x, y, nx, ny) => {
    const wl = cyB - iry * Math.sqrt(Math.max(0, 1 - nx * nx)) + 5;
    if (y < wl) return tone(STONE, clamp01(0.3 + (y - (wl - 5)) * -0.02 + lambert(-nx, 0.3) * 0.2 + (rnd(x, y, 7) - 0.5) * 0.08), x, y);
    const d = Math.hypot(nx, ny * 1.1), ring = Math.sin(d * 26 - 1.2) * 0.5 + 0.5;
    let v = 0.36 + ring * 0.12 - d * 0.1 + (vnoise(x, y, 5, 3) - 0.5) * 0.14;
    if (y < wl + 2) v -= 0.18;
    if (ring > 0.92 && rnd(x, y, 9) > 0.4) v += 0.3;
    if ((nx < -0.3 && ny < 0.2 && ny > -0.5 && ((x + y) % 5 === 0))) v += 0.25;
    return tone(WATER, clamp01(v), x, y, 0.8);
  });
  // 윗 테두리 돌
  R.ell(cx, cyB, rx, ry, (x, y, nx, ny) => {
    const ix = (x + 0.5 - cx) / irx, iy = (y + 0.5 - cyB) / iry;
    if (ix * ix + iy * iy < 1) return null;
    const a = Math.atan2(ny, nx), seg = Math.floor((a + Math.PI) / (Math.PI / 12)), sa = ((a + Math.PI) / (Math.PI / 12)) % 1;
    let v = 0.68 + ((hash(seg, 0, 5) & 255) / 255 - 0.5) * 0.16 - ny * 0.08 - nx * 0.06 + (rnd(x, y, 3) - 0.5) * 0.06;
    if (sa < 0.07) v -= 0.3;
    const rr = Math.hypot(nx, ny);
    if (rr > 0.97) v -= 0.15; else if (rr < 0.88 && ny < 0) v -= 0.06;
    return tone(STONE, clamp01(v), x, y);
  });
  // 가운데 받침과 위 물그릇
  const px = cx, bowlY = cyB - 38;
  cylV(R, px - 7, bowlY, 14, cyB - bowlY + 2, STONE, { tex: (i, j) => (((j - bowlY) % 9) === 0 ? -0.18 : 0) });
  R.ell(px, cyB + 2, 12, 5, (x, y, nx, ny) => (ny > 0 ? tone(WATER, clamp01(0.75 - nx * 0.2), x, y) : null));
  R.ell(px, bowlY + 3, 28, 10, (x, y, nx, ny) => (ny > 0 ? tone(STONE, clamp01(0.4 + lambert(nx * 0.9, 0.3) * 0.3 - ny * 0.2), x, y) : null));
  R.ell(px, bowlY, 28, 9, (x, y, nx, ny) => {
    const d = Math.hypot(nx, ny);
    if (d > 0.8) return tone(STONE, clamp01(0.72 - ny * 0.2 - nx * 0.08), x, y);
    return tone(WATER, clamp01(0.5 + Math.sin(d * 18) * 0.12 - ny * 0.1 + (rnd(x, y, 4) > 0.9 ? 0.3 : 0)), x, y);
  });
  cylV(R, px - 4, bowlY - 22, 8, 22, STONE);
  R.ell(px, bowlY - 22, 12, 4, (x, y, nx, ny) => tone(STONE, clamp01(0.7 - ny * 0.25 - nx * 0.1), x, y));
  blob(R, px, bowlY - 28, 5, 5, STONE);
  R.outline({ ink: INK });
  // 물줄기(반투명)
  const jet = [206, 236, 240];
  for (const s of [-1, 1]) {
    for (let k = 0; k <= 30; k++) {
      const t = k / 30, x = px + s * (4 + t * 20), y = bowlY - 30 - Math.sin(t * Math.PI) * 10 + t * 26;
      R.set(x, y, jet, 0.85); R.set(x, y + 1, jet, 0.45);
    }
    for (let y = bowlY + 1; y < cyB + 4; y++) {
      const x = px + s * (27 + (y - bowlY) * 0.12);
      R.set(x, y, jet, 0.55 + rnd(0, y, s + 5) * 0.3); R.set(x + s, y, jet, 0.25);
    }
  }
  for (let k = 0; k < 40; k++) {
    const a = rnd(k, 1, 6) * Math.PI * 2, r = 0.2 + rnd(k, 2, 6);
    R.set(px + Math.cos(a) * 30 * r, cyB + 5 + Math.sin(a) * 6 * r, [230, 246, 246], 0.7);
  }
  for (let k = 0; k < 12; k++) R.set(px - 3 + rnd(k, 3, 7) * 6, bowlY - 31 - rnd(k, 4, 7) * 3, [255, 255, 255], 0.9);
  return out(R, cx, ay, { block: { x: -rx + 6, y: -ry * 2 - 4, w: rx * 2 - 12, h: ry * 2 + 6 } }, { blur: 3 });
}

// ---------------------------------------------------------------- 화단
function flowerbed() {
  const W = 84, H = 50, ax = 36, ay = 40, R = new Ras(W, H), x0 = ax - 32, w = 64, top = ay - 26;
  R.sPoly([[x0, ay - 4], [x0 + w, ay - 4], [x0 + w + 10, ay + 5], [x0 + 4, ay + 5]], 0.36);
  stoneBox(R, x0, top, w, 5, 21, STONE, 4);
  R.rect(x0 + 4, top + 3, w - 8, 9, (i, j) => tone([[38, 28, 22], [54, 40, 30], [72, 54, 40], [90, 70, 52]], clamp01(0.45 + (rnd(i, j, 3) - 0.5) * 0.4 - (j - top - 3) * 0.02), i, j));
  canopy(R, ax, top + 1, 22, 9, PAL.bush, 81, { n: 7, tops: 2, leafW: 4, leafH: 3, under: 0.2, clip: top + 11 });
  const rand = rng(83), fc = [[[232, 70, 70], [252, 150, 140]], [[248, 206, 70], [255, 240, 150]], [[236, 236, 230], [255, 255, 255]], [[168, 110, 214], [214, 180, 246]], [[244, 130, 170], [255, 200, 220]]];
  for (let k = 0; k < 34; k++) {
    const x = Math.round(x0 + 6 + rand() * (w - 12)), y = Math.round(top - 6 + rand() * 15);
    if (R.a(x, y) < 200) continue;
    const [d, l] = fc[Math.floor(rand() * fc.length)];
    R.set(x, y, l); R.set(x + 1, y, d); R.set(x, y + 1, d); R.set(x + 1, y + 1, mix(d, [0, 0, 0], 0.3));
  }
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -32, y: -20, w: 64, h: 21 } });
}

// ---------------------------------------------------------------- 이정표·게시판
function signpost() {
  const W = 70, H = 70, ax = 30, ay = 62, R = new Ras(W, H);
  R.sEll(ax + 4, ay, 8, 3, 0.4);
  R.sPoly([[ax, ay - 1], [ax + 3, ay - 2], [ax + 30, ay + 8], [ax + 26, ay + 9]], 0.22);
  cylV(R, ax - 3, ay - 52, 6, 52, WOOD, { tex: (i, j) => (vnoise(i, j / 6, 1, 3) - 0.5) * 0.3 });
  R.ell(ax, ay - 52, 3, 1.5, (i, j) => tone(WOOD, 0.8, i, j));
  const arrow = (y, dir, len, rp) => {
    const x0 = dir > 0 ? ax - 4 : ax + 4 - len, x1 = x0 + len, tip = dir > 0 ? x1 + 6 : x0 - 6;
    const pts = dir > 0 ? [[x0, y], [x1, y], [tip, y + 5], [x1, y + 10], [x0, y + 10]] : [[x1, y], [x0, y], [tip, y + 5], [x0, y + 10], [x1, y + 10]];
    R.poly(pts, (i, j, u, v) => tone(rp, clamp01(0.62 - v * 0.35 + (vnoise(i / 6, j, 1, y) - 0.5) * 0.18 + (v < 0.12 ? 0.15 : 0) + (Math.abs(v - 0.5) < 0.1 && u > 0.2 && u < 0.8 ? -0.12 : 0)), i, j));
    R.set(dir > 0 ? x0 + 3 : x1 - 3, y + 5, IRON[3]);
  };
  arrow(ay - 50, 1, 26, ramp('#b88a56', 6));
  arrow(ay - 38, -1, 24, ramp('#a0784a', 6));
  arrow(ay - 26, 1, 20, ramp('#c09a64', 6));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -4, y: -4, w: 8, h: 5 } });
}

function noticeboard() {
  const W = 76, H = 70, ax = 32, ay = 62, R = new Ras(W, H), x0 = ax - 25, w = 50;
  R.sPoly([[x0, ay - 2], [x0 + w, ay - 2], [x0 + w + 14, ay + 6], [x0 + 8, ay + 6]], 0.34);
  for (const x of [x0 + 3, x0 + w - 8]) cylV(R, x, ay - 50, 5, 50, WOOD);
  R.rect(x0, ay - 46, w, 30, (i, j, u, v) => (u < 0.05 || u > 0.95 || v < 0.07 || v > 0.93) ? tone(WOOD, clamp01(0.6 - u * 0.3 - v * 0.2), i, j) : tone(ramp('#9c7a52', 6), clamp01(0.5 + (vnoise(i / 1.3, j / 7, 1, 2) - 0.5) * 0.3 - v * 0.15), i, j));
  const papers = [[x0 + 5, ay - 42, 12, 14, '#f2ead6'], [x0 + 19, ay - 43, 11, 10, '#f6e9a8'], [x0 + 32, ay - 41, 13, 16, '#eef0f2'], [x0 + 18, ay - 31, 12, 11, '#f0d8c8'], [x0 + 6, ay - 26, 10, 7, '#e8f0dc']];
  for (const [px, py, pw, ph, c] of papers) {
    const rp = ramp(c, 5);
    for (let k = 0; k < 3; k++) R.set(px + pw, py + 1 + k, [60, 44, 30]);
    R.rect(px, py, pw, ph, (i, j, u, v) => { const line = (j - py) % 3 === 2 && u > 0.15 && u < 0.85 && v > 0.2; return tone(rp, clamp01((line ? 0.35 : 0.72) - u * 0.12 - v * 0.1), i, j); });
    R.set(px + (pw >> 1), py + 1, [200, 50, 50]);
  }
  R.poly([[x0 - 4, ay - 46], [x0 + w + 4, ay - 46], [x0 + w - 2, ay - 55], [x0 + 2, ay - 55]], (i, j, u, v) => tone(ramp('#6a4a3a', 6), clamp01(0.3 + v * 0.5 + (((j - (ay - 55)) % 3) === 0 ? -0.2 : 0) + (rnd(Math.floor(i / 5), j, 3) - 0.5) * 0.15), i, j));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -25, y: -6, w: 50, h: 7 } });
}

// ---------------------------------------------------------------- 우물
function well() {
  const W = 76, H = 90, ax = 32, ay = 80, R = new Ras(W, H), rx = 20, ry = 8, cy = ay - 16;
  R.sEll(ax + 8, ay - 5, 24, 10, 0.4);
  for (const x of [ax - 19, ax + 15]) cylV(R, x, ay - 64, 4, 50, WOOD);
  for (let x = ax - rx; x <= ax + rx; x++) {
    const nx = (x + 0.5 - ax) / rx; if (Math.abs(nx) > 1) continue;
    const yt = cy + ry * Math.sqrt(1 - nx * nx);
    for (let y = Math.floor(yt); y < yt + 14; y++) {
      const row = Math.floor((y - yt) / 5), seg = Math.floor((Math.asin(nx) + (row & 1) * 0.2 + 2) / 0.36);
      let v = 0.45 + lambert(nx, 0.1) * 0.3 + ((hash(seg, row, 3) & 255) / 255 - 0.5) * 0.18;
      if ((y - yt) % 5 >= 4.2) v = 0.15;
      R.set(x, y, tone(STONE, clamp01(v - (y - yt) * 0.01), x, y));
    }
  }
  R.ell(ax, cy, rx, ry, (x, y, nx, ny) => { const d = Math.hypot(nx, ny); return d < 0.72 ? tone([[10, 14, 18], [20, 30, 34], [34, 56, 60]], clamp01(0.15 + (ny > 0.2 ? 0.3 : 0)), x, y) : tone(STONE, clamp01(0.7 - ny * 0.2), x, y); });
  R.line(ax - 17, ay - 56, ax + 17, ay - 56, WOOD[1], 2);
  R.line(ax + 2, ay - 55, ax + 2, cy - 4, [150, 130, 96]);
  R.rect(ax - 2, cy - 9, 8, 7, (i, j, u, v) => tone(WOOD, clamp01(0.7 - u * 0.4 - v * 0.2 + ((i - ax) % 3 === 0 ? -0.1 : 0)), i, j));
  R.rect(ax - 2, cy - 9, 8, 1, IRON[2]);
  const rp = ramp('#a8553a', 6);
  R.poly([[ax - 26, ay - 60], [ax, ay - 76], [ax, ay - 66], [ax - 26, ay - 50]], (i, j) => tone(rp, clamp01(0.62 + ((i - ax) % 5 === 0 ? -0.2 : 0) + (rnd(Math.floor(i / 5), j >> 2, 3) - 0.5) * 0.15), i, j));
  R.poly([[ax + 26, ay - 60], [ax, ay - 76], [ax, ay - 66], [ax + 26, ay - 50]], (i, j) => tone(rp, clamp01(0.36 + ((i - ax) % 5 === 0 ? -0.2 : 0) + (rnd(Math.floor(i / 5), j >> 2, 4) - 0.5) * 0.15), i, j));
  R.line(ax - 26, ay - 50, ax, ay - 66, WOOD[2], 2); R.line(ax + 26, ay - 50, ax, ay - 66, WOOD[1], 2);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -21, y: -18, w: 42, h: 19 } });
}

// ---------------------------------------------------------------- 통·상자
function barrelAt(R, cx, by, w = 18, h = 22) {
  const x0 = cx - w / 2, top = by - h;
  for (let y = top; y < by; y++) {
    const t = (y - top) / h, bulge = Math.sin(t * Math.PI) * 2, x1 = x0 - bulge, ww = w + bulge * 2;
    for (let x = Math.floor(x1); x < x1 + ww; x++) {
      const u = (x + 0.5 - x1) / ww, n = u * 2 - 1, st = Math.floor(u * 7);
      let v = 0.4 + lambert(n * 0.95, 0) * 0.45 - 0.1 + ((hash(st, 0, 3) & 255) / 255 - 0.5) * 0.12;
      if (Math.abs(u * 7 - st) < 0.12) v -= 0.18;
      const hoop = Math.abs(t - 0.2) < 0.05 || Math.abs(t - 0.8) < 0.05;
      R.set(x, y, hoop ? tone(IRON, clamp01(0.3 + lambert(n, 0) * 0.5), x, y) : tone(WOOD, clamp01(v), x, y));
    }
  }
  R.ell(cx, top, w / 2 + 0.5, 3.5, (x, y, nx, ny) => tone(WOOD, clamp01(Math.hypot(nx, ny) > 0.8 ? 0.35 : 0.72 - nx * 0.1 + (((x - cx) % 4) === 0 ? -0.12 : 0)), x, y));
}
function barrel() {
  const R = new Ras(40, 36), ax = 15, ay = 30;
  R.sEll(ax + 5, ay - 1, 12, 4, 0.4);
  barrelAt(R, ax, ay);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -9, y: -7, w: 18, h: 8 } });
}
function crateAt(R, x, y, w = 22, top = 8, front = 18, seed = 1) {
  const rp = ramp('#b08a58', 6);
  R.rect(x, y, w, top, (i, j, u, v) => tone(rp, clamp01(0.74 - v * 0.14 + ((i - x) % 5 === 0 ? -0.15 : 0) + (u < 0.06 || u > 0.94 || v < 0.15 ? 0.1 : 0)), i, j));
  R.rect(x, y + top, w, front, (i, j, u, v) => {
    const fr = u < 0.12 || u > 0.88 || v < 0.14 || v > 0.86;
    const diag = Math.abs((u - 0.12) / 0.76 - (v - 0.14) / 0.72) < 0.09;
    let vv = 0.45 + (vnoise(i / 6, j, 1, seed) - 0.5) * 0.15 + (((j - y - top) % 5) === 0 ? -0.18 : 0);
    if (fr || diag) vv = 0.58 + (u < 0.12 ? 0.08 : 0) - (v > 0.86 ? 0.12 : 0);
    if (u > 0.95) vv -= 0.12;
    return tone(rp, clamp01(vv), i, j);
  });
}
function crate() {
  const R = new Ras(40, 40), ax = 14, ay = 32;
  R.sPoly([[ax - 11, ay - 3], [ax + 11, ay - 3], [ax + 20, ay + 5], [ax - 4, ay + 5]], 0.38);
  crateAt(R, ax - 11, ay - 26, 22, 8, 18, 2);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -11, y: -9, w: 22, h: 10 } });
}
function crates() {
  const R = new Ras(64, 60), ax = 24, ay = 52;
  R.sPoly([[ax - 22, ay - 4], [ax + 22, ay - 4], [ax + 34, ay + 5], [ax - 12, ay + 5]], 0.38);
  crateAt(R, ax - 23, ay - 26, 22, 8, 18, 3);
  crateAt(R, ax + 1, ay - 26, 22, 8, 18, 4);
  for (let x = ax - 12; x < ax + 12; x++) for (let k = 0; k < 3; k++) R.shadeAt(x, ay - 26 + k, -0.3);
  crateAt(R, ax - 11, ay - 50, 22, 8, 18, 5);
  barrelAt(R, ax + 18, ay - 27, 12, 14);
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -23, y: -10, w: 46, h: 11 } });
}

// ---------------------------------------------------------------- 울타리
function fenceH() {
  const R = new Ras(40, 34), ax = 16, ay = 28, x0 = ax - 16;
  R.sRect(x0, ay - 2, 32, 4, 0.28);
  for (const yy of [ay - 19, ay - 10]) {
    R.rect(x0, yy, 32, 4, (i, j, u, v) => tone(WOOD, clamp01(0.66 - v * 0.4 + (vnoise(i / 5, j, 1, yy) - 0.5) * 0.2), i, j));
    for (let x = x0; x < x0 + 32; x++) R.shadeAt(x, yy + 4, -0.25);
  }
  cylV(R, x0 + 1, ay - 24, 5, 24, WOOD, { tex: (i, j) => (vnoise(i, j / 5, 1, 2) - 0.5) * 0.3 });
  R.poly([[x0 + 1, ay - 24], [x0 + 3.5, ay - 27], [x0 + 6, ay - 24]], (i, j, u) => tone(WOOD, clamp01(0.7 - u * 0.4), i, j));
  R.outline({ ink: INK, x0: x0, x1: x0 + 32 });
  return out(R, ax, ay, { block: { x: -16, y: -5, w: 32, h: 6 } }, { crop: false });
}
function fenceV() {
  const R = new Ras(24, 66), ax = 10, ay = 60;
  R.sRect(ax - 2, ay - 32, 5, 33, 0.25);
  R.rect(ax - 2, ay - 52, 4, 42, (i, j, u) => tone(WOOD, clamp01(0.62 - u * 0.4 + (vnoise(i, j / 5, 1, 4) - 0.5) * 0.2), i, j));
  cylV(R, ax - 3, ay - 24, 6, 24, WOOD, { tex: (i, j) => (vnoise(i, j / 5, 1, 2) - 0.5) * 0.3 });
  R.poly([[ax - 3, ay - 24], [ax, ay - 27], [ax + 3, ay - 24]], (i, j, u) => tone(WOOD, clamp01(0.7 - u * 0.4), i, j));
  R.outline({ ink: INK, y0: ay - 30 });
  return out(R, ax, ay, { block: { x: -4, y: -32, w: 8, h: 33 } }, { crop: false });
}

// ---------------------------------------------------------------- 석상(책 든 학자)
function statue() {
  const W = 80, H = 136, ax = 32, ay = 126, R = new Ras(W, H), sp = ramp('#aaa596', 7, { dark: 0.6, light: 0.35 });
  R.sPoly([[ax - 22, ay - 4], [ax + 22, ay - 4], [ax + 44, ay + 8], [ax - 6, ay + 8]], 0.4);
  stoneBox(R, ax - 23, ay - 12, 46, 4, 8, STONE, 6);
  stoneBox(R, ax - 18, ay - 44, 36, 3, 30, STONE, 7);
  R.rect(ax - 12, ay - 36, 24, 18, (i, j, u, v) => tone(STONE, clamp01(0.38 + (u < 0.06 || v < 0.08 ? -0.15 : 0) + (u > 0.94 || v > 0.92 ? 0.12 : 0)), i, j));
  stoneBox(R, ax - 21, ay - 50, 42, 3, 4, STONE, 8);
  const fy = ay - 50;
  // 옷자락
  R.poly([[ax - 12, fy], [ax + 12, fy], [ax + 8, fy - 40], [ax - 8, fy - 40]], (i, j, u, v) => {
    const fold = Math.sin(u * Math.PI * 5 + v * 1.5) * 0.08;
    return tone(sp, clamp01(0.3 + lambert((u * 2 - 1) * 0.9, -0.1) * 0.5 + fold - (1 - v) * 0.05), i, j);
  });
  R.rect(ax - 13, fy - 2, 26, 2, (i, j, u) => tone(sp, clamp01(0.4 - u * 0.2), i, j));
  // 팔과 책
  R.stroke([[ax - 7, fy - 36], [ax - 12, fy - 24], [ax - 6, fy - 20]], 5, 4, (x, y, t, nx) => tone(sp, clamp01(0.55 - nx * 0.2), x, y));
  R.poly([[ax - 12, fy - 26], [ax - 1, fy - 29], [ax - 1, fy - 18], [ax - 12, fy - 16]], (i, j, u, v) => tone(sp, clamp01(0.82 - v * 0.2 - (Math.abs(u - 0.5) < 0.06 ? 0.3 : 0)), i, j));
  R.stroke([[ax + 7, fy - 36], [ax + 13, fy - 44], [ax + 15, fy - 54]], 5, 4, (x, y, t, nx) => tone(sp, clamp01(0.45 - nx * 0.2), x, y));
  blob(R, ax + 15, fy - 56, 2.5, 2.5, sp);
  // 머리
  blob(R, ax, fy - 46, 6.5, 7, sp, { bias: 0.05 });
  R.rect(ax - 7, fy - 54, 14, 3, (i, j, u) => tone(sp, clamp01(0.6 - u * 0.35), i, j));
  R.rect(ax - 5, fy - 57, 10, 3, (i, j, u) => tone(sp, clamp01(0.66 - u * 0.35), i, j));
  R.rect(ax - 4, fy - 40, 8, 3, (i, j, u) => tone(sp, clamp01(0.35 - u * 0.2), i, j));
  for (let k = 0; k < 40; k++) { const x = ax - 12 + rnd(k, 1, 9) * 24, y = fy - 40 + rnd(k, 2, 9) * 40; if (R.a(x, y) > 200 && vnoise(x, y, 4, 2) > 0.62) R.set(x, y, [104, 128, 92], 0.6); }
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -23, y: -14, w: 46, h: 15 } });
}

// ---------------------------------------------------------------- 깃발
function clothAt(R, x0, y0, w, h, th, { tail = 'point', iconSize = 7 } = {}) {
  const cp = ramp(th.cloth, 7), tp = ramp(th.trim, 5), ic = ramp(th.ic, 5);
  const bottom = (x) => { const u = (x - x0) / w; return tail === 'point' ? y0 + h - Math.abs(u - 0.5) * 2 * 10 : y0 + h - (1 - Math.abs(u - 0.5) * 2) * 8; };
  for (let x = x0; x < x0 + w; x++) {
    const u = (x + 0.5 - x0) / w, fold = Math.sin(u * Math.PI * 3.2) * 0.14;
    for (let y = y0; y < bottom(x); y++) {
      const v = (y - y0) / h, edge = u < 0.1 || u > 0.9 || y > bottom(x) - 3;
      R.set(x, y, edge ? tone(tp, clamp01(0.62 + fold - v * 0.2), x, y) : tone(cp, clamp01(0.55 + fold - v * 0.18 - u * 0.08), x, y, 0.7));
    }
  }
  icon(R, th.icon, x0 + w / 2, y0 + h * 0.42, iconSize, ic);
}
function banner(v) {
  const th = THEME[v] || THEME.school, W = 60, H = 132, ax = 20, ay = 124, R = new Ras(W, H);
  R.sEll(ax + 3, ay, 7, 3, 0.4);
  R.sPoly([[ax - 1, ay - 1], [ax + 2, ay - 2], [ax + 44, ay + 7], [ax + 40, ay + 8]], 0.22);
  stoneBox(R, ax - 6, ay - 9, 12, 3, 6, STONE, 9);
  cylV(R, ax - 2, ay - 112, 4, 104, IRON);
  R.rect(ax - 2, ay - 106, 28, 3, (i, j, u, vv) => tone(IRON, clamp01(0.6 - vv * 0.4), i, j));
  clothAt(R, ax + 1, ay - 103, 24, 50, th, { iconSize: 8.5 });
  R.poly([[ax - 3, ay - 112], [ax, ay - 121], [ax + 3, ay - 112]], (i, j, u) => tone(BRASS, clamp01(0.8 - u * 0.5), i, j));
  R.outline({ ink: INK });
  return out(R, ax, ay, { block: { x: -5, y: -5, w: 10, h: 6 } });
}

// ---------------------------------------------------------------- 광장 안내석
function plazaSign(v) {
  const on = v === 'on', W = 110, H = 150, ax = 44, ay = 138, R = new Ras(W, H);
  R.sPoly([[ax - 32, ay - 4], [ax + 32, ay - 4], [ax + 56, ay + 9], [ax - 12, ay + 9]], 0.42);
  stoneBox(R, ax - 33, ay - 12, 66, 5, 7, STONE, 11);
  stoneBox(R, ax - 27, ay - 21, 54, 4, 6, STONE, 12);
  const bx = ax - 20, bw = 40, bt = ay - 80, bb = ay - 21;
  R.rect(bx, bt, bw, bb - bt, (i, j, u) => { const c = ashlar(STONE, i, j, bx, bt, 8, 20, 13, 0.52); return u > 0.9 ? mix(c, [0, 0, 0], 0.22) : u < 0.08 ? mix(c, [255, 250, 230], 0.12) : c; });
  // 황동 틀 + 안내판
  const px = bx + 6, pw = bw - 12, pt = bt + 7, ph = 36;
  R.rect(px - 2, pt - 2, pw + 4, ph + 4, (i, j, u, vv) => tone(BRASS, clamp01(0.7 - u * 0.3 - vv * 0.3 + ((i + j) % 9 === 0 ? 0.1 : 0)), i, j));
  R.rect(px, pt, pw, ph, (i, j, u, vv) => {
    if (on) {
      const d = Math.hypot(u - 0.5, (vv - 0.45) * 0.8);
      const ring = Math.abs(d - 0.28) < 0.03 || Math.abs(d - 0.16) < 0.025, spoke = d < 0.3 && (Math.abs(u - 0.5) < 0.025 || Math.abs(vv - 0.45) < 0.02);
      let t = 0.72 - d * 0.6 + (ring || spoke ? 0.25 : 0) + ((j - pt) % 4 === 0 && vv > 0.82 ? 0.15 : 0);
      return tone([[120, 60, 20], [184, 110, 36], [232, 164, 66], [252, 212, 120], [255, 240, 190], [255, 252, 236]], clamp01(t), i, j, 0.7);
    }
    const d = ((i - px) - (j - pt) * 0.7 + 60) % 26;
    let t = 0.22 + (d < 2 ? 0.25 : 0) + (vnoise(i, j, 4, 5) - 0.5) * 0.1;
    if (Math.abs((i - px) - (j - pt) * 0.45 - 6) < 0.6 && vv < 0.6) t = 0.05;
    return tone([[16, 18, 22], [28, 32, 38], [46, 52, 60], [76, 84, 94]], clamp01(t), i, j);
  });
  for (const [qx, qy] of [[px - 1, pt - 1], [px + pw, pt - 1], [px - 1, pt + ph], [px + pw, pt + ph]]) R.set(qx, qy, BRASS[5]);
  // 윗단(처마돌) + 황동 받침 + 수정
  stoneBox(R, bx - 5, bt - 7, bw + 10, 3, 5, STONE, 14);
  const cyT = bt - 7;
  R.poly([[ax - 12, cyT], [ax + 12, cyT], [ax + 7, cyT - 7], [ax - 7, cyT - 7]], (i, j, u, vv) => tone(BRASS, clamp01(0.75 - u * 0.4 + vv * 0.1), i, j));
  const crystal = on ? [[160, 96, 30], [232, 170, 60], [255, 220, 120], [255, 244, 190], [255, 255, 240]] : [[36, 34, 48], [56, 54, 72], [80, 78, 100], [112, 110, 132], [150, 148, 170]];
  const ct = cyT - 29, cb = cyT - 6;
  R.poly([[ax, ct], [ax + 8, ct + 7], [ax + 7, cb - 4], [ax, cb], [ax - 7, cb - 4], [ax - 8, ct + 7]], (i, j) => {
    const fx = i < ax - 3 ? 0.25 : i < ax + 1 ? 0.5 : 0.1;
    return tone(crystal, clamp01(fx + (j < ct + 8 ? 0.2 : 0) + (on ? 0.35 : 0)), i, j);
  });
  for (const s of [-1, 1]) R.stroke([[ax + s * 9, cyT - 5], [ax + s * 10, cyT - 14], [ax + s * 7, cyT - 21]], 2, 1.5, (x, y) => tone(BRASS, s < 0 ? 0.75 : 0.45, x, y));
  for (const s of [-1, 1]) { R.rect(ax + s * 22 - 2, bt - 12, 4, 5, (i, j, u) => tone(BRASS, clamp01(0.8 - u * 0.5), i, j)); blob(R, ax + s * 22, bt - 14, 2.5, 2.5, BRASS); }
  if (!on) for (let k = 0; k < 20; k++) { const x = bx + 2 + rnd(k, 1, 3) * 6, y = bb - 4 - rnd(k, 2, 3) * 30; if (R.a(x, y) > 200) R.set(x, y, [64, 98, 52], 0.8); }
  R.outline({ ink: INK });
  if (on) {
    R.glow(ax, ct + 12, 34, [255, 200, 110], 0.45);
    R.glow(ax, ct + 12, 12, [255, 244, 200], 0.6);
    R.glow(ax, pt + ph / 2, 26, [255, 190, 100], 0.22);
  }
  return out(R, ax, ay, { block: { x: -32, y: -13, w: 64, h: 14 }, light: on ? { x: 0, y: ct + 12 - ay, r: 70 } : undefined });
}

// ---------------------------------------------------------------- 구역 관문
function gate(v) {
  const key = THEME[v] ? v : 'farm', th = THEME[key], W = 210, H = 190, ax = 90, ay = 178, R = new Ras(W, H);
  const pw = 28, gapHalf = 52, lx = ax - gapHalf - pw, rx = ax + gapHalf, ptop = ay - 118;
  R.sPoly([[lx, ay - 6], [rx + pw, ay - 6], [rx + pw + 40, ay + 10], [lx + 30, ay + 10]], 0.3);
  for (const px of [lx, rx]) {
    R.sPoly([[px, ay - 3], [px + pw, ay - 3], [px + pw + 16, ay + 7], [px + 12, ay + 7]], 0.42);
    stoneBox(R, px - 4, ay - 14, pw + 8, 4, 10, STONE, px);
    R.rect(px, ptop, pw, ay - 14 - ptop, (i, j, u) => { const c = ashlar(STONE, i, j, px, ptop, 9, 14, px + 1, 0.54); return u > 0.86 ? mix(c, [0, 0, 0], 0.2) : u < 0.1 ? mix(c, [255, 250, 230], 0.1) : c; });
    stoneBox(R, px - 3, ptop - 6, pw + 6, 3, 4, STONE, px + 2);
  }
  // 아치
  const ar = gapHalf + pw * 0.5, acy = ptop + 6, th2 = 14;
  for (let y = acy - ar * 0.62 - th2 - 2; y <= acy; y++) for (let x = ax - ar - pw / 2; x <= ax + ar + pw / 2; x++) {
    const dx = (x + 0.5 - ax) / ar, dy = (y + 0.5 - acy) / (ar * 0.62);
    const d = Math.sqrt(dx * dx + dy * dy), thick = th2 / (ar * 0.62);
    if (d < 1 - thick * 0.15 || d > 1 + thick || y > acy) continue;
    if (Math.abs(x + 0.5 - ax) > gapHalf + pw) continue;
    const a = Math.atan2(dy, dx), seg = Math.floor((a + Math.PI) / (Math.PI / 11)), sa = ((a + Math.PI) / (Math.PI / 11)) % 1;
    let vv = 0.58 + ((hash(seg, 0, 21) & 255) / 255 - 0.5) * 0.16 + (rnd(x, y, 2) - 0.5) * 0.06;
    if (sa < 0.08) vv = 0.16;
    if (d > 1 + thick * 0.85) vv += 0.15;
    if (d < 1 + thick * 0.12) vv -= 0.2;
    R.set(x, y, tone(STONE, clamp01(vv), x, y));
  }
  // 깃발(기둥 앞)
  for (const px of [lx, rx]) clothAt(R, px + 3, ptop + 12, pw - 6, 46, th, { iconSize: 8.5 });
  // 기둥 머리 장식
  for (const px of [lx, rx]) {
    if (key === 'future') {
      const cx = px + pw / 2, cr = [[70, 40, 120], [120, 80, 190], [170, 130, 236], [214, 190, 255], [248, 240, 255]];
      R.poly([[cx, ptop - 26], [cx + 6, ptop - 17], [cx + 5, ptop - 8], [cx, ptop - 5], [cx - 5, ptop - 8], [cx - 6, ptop - 17]], (i, j) => tone(cr, clamp01((i < cx - 1 ? 0.7 : i < cx + 2 ? 0.95 : 0.4) + (j < ptop - 17 ? 0.1 : 0)), i, j));
    } else {
      R.poly([[px - 1, ptop - 6], [px + pw + 1, ptop - 6], [px + pw / 2, ptop - 20]], (i, j) => tone(STONE, clamp01(i < px + pw / 2 ? 0.72 : 0.36), i, j));
      blob(R, px + pw / 2, ptop - 22, 3.5, 3.5, ramp(th.trim, 5));
    }
  }
  // 문장(방패)
  const sx = ax, sy = acy - ar * 0.62 - th2 + 2, sw = 16, sh = 22, cp = ramp(th.cloth, 7), tp = ramp(th.trim, 5);
  R.rect(sx - 26, sy + 6, 52, 7, (i, j, u, vv) => { const wv = Math.sin(u * Math.PI * 2) * 0.1; return tone(tp, clamp01(0.62 + wv - vv * 0.3 + (u < 0.1 || u > 0.9 ? -0.12 : 0)), i, j); });
  for (let y = sy - 4; y < sy + sh; y++) for (let x = sx - sw; x <= sx + sw; x++) {
    const u = (x + 0.5 - sx) / sw, t = (y - sy + 4) / (sh + 4);
    const half = t < 0.55 ? 1 : Math.sqrt(Math.max(0, 1 - ((t - 0.55) / 0.45) ** 2));
    if (Math.abs(u) > half) continue;
    const rim = Math.abs(u) > half - 0.16 || t < 0.1;
    R.set(x, y, rim ? tone(tp, clamp01(0.72 - u * 0.3 - t * 0.2), x, y) : tone(cp, clamp01(0.58 - u * 0.2 - t * 0.2), x, y));
  }
  icon(R, th.icon, sx, sy + 8, 10.5, ramp(th.ic, 5));
  if (key === 'future') icon(R, 'crystal', sx, sy - 12, 6, [[70, 40, 120], [120, 80, 190], [170, 130, 236], [214, 190, 255], [248, 240, 255]]);
  R.outline({ ink: INK });
  if (key === 'future') { R.glow(lx + pw / 2, ptop - 15, 16, [200, 160, 255], 0.4); R.glow(rx + pw / 2, ptop - 15, 16, [200, 160, 255], 0.4); }
  const blocks = [{ x: lx - 4 - ax, y: -12, w: pw + 8, h: 13 }, { x: rx - 4 - ax, y: -12, w: pw + 8, h: 13 }];
  return out(R, ax, ay, { block: blocks, blocks });
}

export const TOWN = {
  lamp, bench, fountain, flowerbed, signpost, noticeboard, well, barrel, crate, crates,
  'fence-h': fenceH, 'fence-v': fenceV, statue, banner, 'plaza-sign': plazaSign, gate,
};
export { stoneBox, ashlar, clothAt, barrelAt, crateAt };
