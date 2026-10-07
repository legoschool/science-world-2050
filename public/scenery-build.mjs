// 3/4 시점 앞모습 건물. 돌벽·목조 뼈대·벽돌·판자 벽, 기와·슬레이트·동판 지붕, 아치 창문과 나무 문을 코드로 칠한다.
// 모든 건물은 결정적이다(같은 옵션 → 같은 픽셀). 빛은 왼쪽 위, 그림자는 오른쪽 아래.
import { Ras, out, rng, rnd, hash, vnoise, tone, clamp01, lambert, ramp, col, mix, blob, cylV, strSeed } from './scenery-core.mjs';
import { icon } from './scenery-icons.mjs';

const TIMBER = [[32, 22, 20], [46, 32, 26], [62, 42, 30], [82, 56, 38], [104, 74, 50], [126, 92, 62]];
const TRIM = [[70, 66, 60], [98, 92, 84], [126, 118, 106], [154, 146, 130], [180, 172, 154], [204, 196, 178], [224, 218, 202]];
const FOUND = [[52, 50, 48], [74, 70, 66], [98, 92, 86], [122, 116, 106], [146, 138, 126], [168, 160, 146]];
const GLASS = [[18, 26, 40], [28, 42, 60], [42, 62, 84], [64, 92, 116], [104, 140, 160], [168, 200, 210]];
const IRON = [[18, 18, 22], [32, 32, 38], [50, 50, 58], [76, 76, 84], [110, 110, 116]];
const DOORW = [[42, 24, 18], [60, 38, 26], [82, 54, 34], [104, 70, 44], [128, 90, 56], [152, 112, 72]];
const BRASS = [[76, 50, 22], [120, 84, 30], [168, 126, 46], [208, 168, 72], [236, 206, 120], [252, 238, 186]];
const INK = [30, 22, 24];

const STY = {
  school: { wallH: 112, floors: 2, wall: '#d7c8a6', mat: 'stone', roof: '#4c6680', roofMat: 'slate', roofType: 'hip', fh: 50, bh: 16, tower: true, sign: 'clock', door: 'double', win: 'arch', winW: 15, winH: 26, found: true },
  library: { wallH: 90, floors: 1, wall: '#cdc1a6', mat: 'ashlar', roof: '#4d7a6a', roofMat: 'copper', roofType: 'hip', fh: 48, bh: 14, pediment: true, sign: 'book', door: 'double', win: 'tall', winW: 14, winH: 42, found: true, quoins: true },
  house: { wallH: 66, floors: 1, wall: '#ecdcbc', mat: 'timber', roof: '#b0593b', roofMat: 'tile', roofType: 'front', gh: 0.34, dk: 50, chimney: true, sign: 'none', door: 'arch', win: 'rect', winW: 18, winH: 20, shutters: '#5d7f50', flowerbox: true, found: true },
  shop: { wallH: 94, floors: 2, wall: '#e8d4ae', mat: 'timber-stone', roof: '#a6553a', roofMat: 'tile', roofType: 'gable', fh: 50, bh: 14, dormer: true, awning: '#b3453a', sign: 'bell', door: 'arch', win: 'rect', winW: 16, winH: 17, shutters: '#7a4e36', flowerbox: true, found: true },
  barn: { wallH: 78, floors: 1, wall: '#9c3d31', mat: 'planks', roof: '#5b5049', roofMat: 'shingle', roofType: 'gambrel', gh: 0.42, dk: 46, sign: 'leaf', door: 'barn', win: 'rect', winW: 14, winH: 14, found: true },
  workshop: { wallH: 74, floors: 1, wall: '#a9654a', mat: 'brick', roof: '#555b66', roofMat: 'slate', roofType: 'gable', fh: 46, bh: 14, chimney: 'stack', sign: 'gear', door: 'wide', win: 'arch', winW: 16, winH: 24, found: true, quoins: true },
  warehouse: { wallH: 80, floors: 1, wall: '#8a939a', mat: 'corrugated', roof: '#7d736a', roofMat: 'metal', roofType: 'lowfront', gh: 0.15, dk: 54, sign: 'none', door: 'roller', win: 'high', winW: 14, winH: 8, found: true },
  lab: { wallH: 72, floors: 1, wall: '#e2e6e9', mat: 'panel', roof: '#86b4ca', roofMat: 'glass', roofType: 'flatdome', dk: 36, sign: 'star', door: 'glass', win: 'band', found: false },
  observatory: { wallH: 72, floors: 1, wall: '#d0c6b2', mat: 'ashlar', roof: '#8d9ba7', roofMat: 'metal', roofType: 'dome', sign: 'star', door: 'arch', win: 'arch', winW: 11, winH: 18, found: true },
  office: { wallH: 114, floors: 2, wall: '#d8d0c0', mat: 'stucco', roof: '#6c6660', roofMat: 'flat', roofType: 'flat', dk: 36, sign: 'bolt', door: 'glass', win: 'rect', winW: 15, winH: 22, found: true, quoins: true },
};

// ---------------------------------------------------------------- 쌓기 무늬
function masonry(w, h, rowH, minL, maxL, seed, regular = false) {
  const id = new Int32Array(w * h), rand = rng(seed);
  let y = 0, row = 0;
  while (y < h) {
    const rh = regular ? rowH : rowH + Math.floor(rand() * 3) - 1;
    let x = regular ? -((row & 1) * (maxL >> 1)) : -Math.floor(rand() * maxL);
    while (x < w) {
      const L = minL + Math.floor(rand() * (maxL - minL + 1)), bid = (hash(row, x, seed) | 1) & 0x7fffffff;
      for (let yy = y; yy < Math.min(h, y + rh); yy++) for (let xx = Math.max(0, x); xx < Math.min(w, x + L); xx++) id[yy * w + xx] = yy === y + rh - 1 || xx === x + L - 1 ? 0 : bid;
      x += L;
    }
    y += rh; row++;
  }
  return id;
}
function masonryV(mas, w, h, i, j, x, y, seed) {
  const k = j * w + i, id = mas[k];
  if (!id) return -1;
  let v = 0.5 + ((hash(id, 0, 3) & 255) / 255 - 0.5) * 0.24;
  const up = j > 0 ? mas[k - w] : -1, dn = j < h - 1 ? mas[k + w] : -1, lf = i > 0 ? mas[k - 1] : -1, rt = i < w - 1 ? mas[k + 1] : -1;
  if (up !== id) v += 0.17; else if (dn !== id) v -= 0.15;
  if (lf !== id) v += 0.08; else if (rt !== id) v -= 0.11;
  return v + (rnd(x, y, seed) - 0.5) * 0.08 + (vnoise(x, y, 3, seed) - 0.5) * 0.08;
}

// ---------------------------------------------------------------- 벽
function paintWall(R, x0, y0, w, h, S, wp, seed, groundH) {
  const mat = S.mat;
  let mas = null, mas2 = null;
  if (mat === 'stone') mas = masonry(w, h, 8, 9, 17, seed);
  if (mat === 'ashlar') mas = masonry(w, h, 9, 18, 26, seed, true);
  if (mat === 'timber-stone') mas2 = masonry(w, h, 8, 9, 16, seed + 1);
  const stoneRp = ramp([184, 172, 150], 7, { dark: 0.55, light: 0.3 });
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = x0 + i, y = y0 + j;
    let v = 0.55, c = null, rp = wp;
    switch (mat) {
      case 'stone': case 'ashlar': {
        v = masonryV(mas, w, h, i, j, x, y, seed);
        if (v < 0) c = mat === 'ashlar' ? [134, 124, 108] : [96, 88, 78];
        break;
      }
      case 'timber-stone': case 'timber': {
        if (mat === 'timber-stone' && j >= h - groundH) {
          v = masonryV(mas2, w, h, i, j, x, y, seed); rp = stoneRp;
          if (v < 0) c = [96, 88, 78];
        } else v = 0.62 + (vnoise(x, y, 6, seed) - 0.5) * 0.12 + (rnd(x, y, seed) - 0.5) * 0.06;
        break;
      }
      case 'planks': {
        const b = Math.floor(i / 7), bi = i % 7;
        v = 0.48 + ((hash(b, 0, seed) & 255) / 255 - 0.5) * 0.2 + (vnoise(x / 1.2, y / 9, 1, seed) - 0.5) * 0.26;
        if (bi === 0) v = 0.1; else if (bi === 1) v += 0.1; else if (bi === 6) v -= 0.1;
        if ((j === 6 || j === h - 14) && (bi === 3)) c = [60, 54, 50];
        break;
      }
      case 'brick': {
        const row = Math.floor(j / 4), off = (row & 1) * 4, bx = Math.floor((i + off) / 9);
        if (j % 4 === 3 || (i + off) % 9 === 8) c = [150, 138, 122].map((q) => q + (rnd(x, y, 2) - 0.5) * 12);
        else { v = 0.5 + ((hash(bx, row, seed) & 255) / 255 - 0.5) * 0.28; if (j % 4 === 0) v += 0.08; v += (rnd(x, y, seed) - 0.5) * 0.08; }
        break;
      }
      case 'corrugated': {
        v = 0.52 + Math.sin((i / 5) * Math.PI * 2 + 0.8) * 0.18 + (vnoise(x, y, 10, seed) - 0.5) * 0.08;
        if (j % 38 === 0) v = 0.2; else if (j % 38 === 1) v += 0.1;
        if (vnoise(x / 2, y / 10, 1.6, seed + 3) > 0.77) c = mix(tone(wp, clamp01(v), x, y), [132, 78, 50], 0.28);
        break;
      }
      case 'panel': {
        const pi = i % 30, pj = j % 24;
        v = 0.64 - pj * 0.004 + (rnd(Math.floor(i / 30), Math.floor(j / 24), seed) - 0.5) * 0.05;
        if (pi === 0 || pj === 0) v = 0.3; else if (pi === 1 || pj === 1) v = 0.78;
        break;
      }
      case 'stucco': default: {
        v = 0.6 + (vnoise(x, y, 5, seed) - 0.5) * 0.08 + (rnd(x, y, seed) - 0.5) * 0.05;
      }
    }
    if (!c) {
      v -= Math.max(0, (j - (h - 22)) / 22) * 0.1;
      v += (vnoise(x, y, 18, seed + 9) - 0.5) * 0.08;
      c = tone(rp, clamp01(v), x, y, 0.7);
    }
    R.set(x, y, c);
  }
}

function beam(R, x, y, w, h, vert) {
  R.rect(x, y, w, h, (i, j) => {
    const a = vert ? j : i, b = vert ? i - x : j - y, n = vert ? w : h;
    let v = 0.46 + (vnoise(vert ? i * 3 : a / 7, vert ? a / 7 : j * 3, 1, 7) - 0.5) * 0.3;
    if (b === 0) v += 0.2; else if (b === n - 1) v -= 0.22;
    return tone(TIMBER, clamp01(v), i, j);
  });
}
function brace(R, x0, y0, x1, y1) {
  R.stroke([[x0, y0], [x1, y1]], 4, 4, (x, y, t, nx, ny) => tone(TIMBER, clamp01(0.45 - (nx + ny) * 0.12 + (vnoise(x, y, 2, 8) - 0.5) * 0.2), x, y));
}

function stoneBand(R, x, y, w, h, rp = TRIM, seed = 3) {
  const mas = masonry(w, h, h, 12, 20, seed);
  R.rect(x, y, w, h, (i, j) => {
    const v = masonryV(mas, w, h, i - x, j - y, i, j, seed);
    return v < 0 ? rp[0] : tone(rp, clamp01(v - 0.02), i, j);
  });
}

// ---------------------------------------------------------------- 창·문
function drawWindow(R, x, y, w, h, kind, o = {}) {
  const arch = kind === 'arch' || kind === 'tall', round = kind === 'round', r = arch ? w / 2 : 0;
  const inside = (i, j) => {
    if (round) { const dx = i + 0.5 - w / 2, dy = j + 0.5 - h / 2; return dx * dx + dy * dy <= (w / 2) * (w / 2); }
    if (i < 0 || i >= w || j < 0 || j >= h) return false;
    if (arch && j < r) { const dx = i + 0.5 - w / 2, dy = j + 0.5 - r; return dx * dx + dy * dy <= r * r; }
    return true;
  };
  const near = (i, j, d) => { for (let q = -d; q <= d; q++) for (let p = -d; p <= d; p++) if (inside(i + p, j + q)) return true; return false; };
  const frame = o.frame || TRIM, fw = o.fw ?? 2;
  if (o.shutters) {
    const sp = ramp(o.shutters, 5), sw = Math.round(w * 0.5);
    for (const sx of [x - fw - sw, x + w + fw]) R.rect(sx, y - (arch ? 0 : 1), sw, h + (arch ? 0 : 2), (i, j, u, v) => tone(sp, clamp01(0.55 + ((j - y) % 3 === 0 ? -0.25 : 0.05) + (u < 0.15 ? 0.12 : u > 0.85 ? -0.15 : 0)), i, j));
  }
  for (let j = -fw - 1; j < h + fw; j++) for (let i = -fw - 1; i < w + fw + 1; i++) {
    const X = x + i, Y = y + j;
    if (inside(i, j)) {
      const d = ((i - j * 0.7 + h * 2) % (w + 9) + (w + 9)) % (w + 9);
      let v = 0.24 + (j / h) * 0.12 + (d < 2 ? 0.42 : d < 4 ? 0.18 : 0);
      if (!inside(i, j - 2)) v -= 0.14;
      if (o.lit) v = 0.62 + (d < 2 ? 0.2 : 0) - (j / h) * 0.1;
      R.set(X, Y, tone(o.lit ? BRASS : GLASS, clamp01(v), X, Y, 0.6));
    } else if (fw > 0 && near(i, j, fw)) {
      let v = 0.62;
      if (!near(i, j - 1, fw) || !near(i - 1, j, fw)) v += 0.18;
      if (!near(i, j + 1, fw) || !near(i + 1, j, fw)) v -= 0.22;
      if (inside(i, j + 1) || inside(i - 1, j)) v -= 0.25;
      R.set(X, Y, tone(frame, clamp01(v), X, Y, 0.6));
    }
  }
  if (!round) {
    const mc = o.mullion || [226, 220, 204], md = mix(mc, [0, 0, 0], 0.4);
    const mx = x + Math.floor(w / 2) - (w % 2 ? 0 : 1), my = y + Math.round(h * (arch ? 0.52 : 0.46));
    for (let j = 0; j < h; j++) if (inside(mx - x, j)) { R.set(mx, y + j, mc); if (w > 8) R.set(mx + 1, y + j, md); }
    for (let i = 0; i < w; i++) if (inside(i, my - y)) { R.set(x + i, my, mc); R.set(x + i, my + 1, md); }
    if (kind === 'tall') { const m2 = y + Math.round(h * 0.78); for (let i = 0; i < w; i++) { R.set(x + i, m2, mc); R.set(x + i, m2 + 1, md); } }
    R.rect(x - fw - 2, y + h + fw - 1, w + fw * 2 + 4, 3, (i, j, u, v) => tone(frame, clamp01(v < 0.34 ? 0.82 : v < 0.67 ? 0.55 : 0.2), i, j));
    if (arch) R.rect(x + Math.floor(w / 2) - 2, y - fw - 2, 4 + (w % 2), 4, (i, j, u, v) => tone(frame, clamp01(0.75 - v * 0.4 + (u < 0.3 ? 0.1 : 0)), i, j));
  }
  if (o.flowerbox) {
    const by = y + h + fw + 2;
    R.rect(x - 2, by, w + 4, 4, (i, j, u, v) => tone(TIMBER, clamp01(0.55 - v * 0.35 + (u < 0.06 ? 0.1 : 0)), i, j));
    const rand = rng(x * 7 + y), cols = [[222, 70, 70], [246, 150, 170], [250, 220, 90], [236, 236, 230]];
    for (let i = -1; i < w + 1; i++) {
      const hgt = 2 + Math.floor(rand() * 3);
      for (let k = 1; k <= hgt; k++) R.set(x + i, by - k, [[44, 88, 44], [62, 110, 50], [84, 132, 58]][Math.floor(rand() * 3)]);
      if (rand() < 0.45) { const fc = cols[Math.floor(rand() * 4)]; R.set(x + i, by - hgt - 1, fc); if (rand() < 0.5) R.set(x + i, by - hgt, mix(fc, [0, 0, 0], 0.3)); }
    }
  }
}

function archShape(w, h) {
  const r = w / 2;
  return (i, j) => { if (i < 0 || i >= w || j < 0 || j >= h) return false; if (j < r) { const dx = i + 0.5 - r, dy = j + 0.5 - r; return dx * dx + dy * dy <= r * r; } return true; };
}
function drawDoor(R, cx, by, kind, wallRp) {
  if (kind === 'barn') {
    const w = 48, h = 58, x = Math.round(cx - w / 2), y = by - h;
    R.rect(x - 2, y - 3, w + 4, h + 3, [36, 22, 18]);
    R.rect(x, y, w, h, (i, j) => { const b = (i - x) % 6; let v = 0.36 + (vnoise(i / 1.2, j / 8, 1, 4) - 0.5) * 0.2 + (b === 0 ? -0.22 : b === 1 ? 0.08 : 0); return tone(wallRp, clamp01(v - 0.08), i, j); });
    const tr = [[150, 140, 126], [196, 186, 168], [226, 218, 200], [244, 238, 224]];
    const board = (x0, y0, x1, y1) => R.stroke([[x0, y0], [x1, y1]], 4, 4, (px, py, t, nx, ny) => tone(tr, clamp01(0.6 - (nx + ny) * 0.2), px, py));
    board(x + 2, y + 2, x + w - 3, y + 2); board(x + 2, y + h - 3, x + w - 3, y + h - 3); board(x + 2, y + 2, x + 2, y + h - 3); board(x + w - 3, y + 2, x + w - 3, y + h - 3);
    board(x + w / 2, y + 2, x + w / 2, y + h - 3);
    board(x + 3, y + 3, x + w / 2 - 1, y + h - 4); board(x + w / 2 - 1, y + 3, x + 3, y + h - 4);
    board(x + w / 2 + 1, y + 3, x + w - 4, y + h - 4); board(x + w - 4, y + 3, x + w / 2 + 1, y + h - 4);
    R.rect(x - 4, y - 6, w + 8, 3, (i, j, u, v) => tone(IRON, clamp01(0.6 - v * 0.4), i, j));
    return { w, h };
  }
  if (kind === 'roller') {
    const w = 64, h = 56, x = Math.round(cx - w / 2), y = by - h;
    R.rect(x - 4, y - 4, w + 8, h + 4, (i, j, u, v) => tone(FOUND, clamp01(0.55 + (u < 0.06 ? 0.15 : u > 0.94 ? -0.2 : 0) + (v < 0.07 ? 0.1 : 0)), i, j));
    R.rect(x, y, w, h, (i, j) => { const s = (j - y) % 4; return tone(IRON, clamp01(0.55 + (s === 0 ? 0.25 : s === 3 ? -0.25 : 0) - ((j - y) / h) * 0.15 + (rnd(i, j, 3) - 0.5) * 0.06), i, j); });
    R.rect(x + w / 2 - 5, by - 5, 10, 2, IRON[0]);
    R.rect(x, y, w, 4, (i, j) => tone(IRON, 0.12, i, j));
    return { w, h };
  }
  if (kind === 'glass') {
    const w = 30, h = 44, x = Math.round(cx - w / 2), y = by - h;
    R.rect(x - 2, y - 2, w + 4, h + 2, (i, j, u) => tone(IRON, clamp01(0.55 + (u < 0.1 ? 0.2 : -0.1)), i, j));
    R.rect(x, y, w, h, (i, j) => { const d = ((i - x) - (j - y) * 0.6 + 60) % 18; return tone(GLASS, clamp01(0.4 + (d < 2 ? 0.4 : d < 4 ? 0.15 : 0) + ((j - y) / h) * 0.1), i, j); });
    R.rect(x + w / 2 - 1, y, 2, h, IRON[2]);
    R.rect(x + w / 2 - 4, y + h / 2, 2, 6, [200, 204, 210]); R.rect(x + w / 2 + 2, y + h / 2, 2, 6, [200, 204, 210]);
    R.rect(x - 10, y - 9, w + 20, 5, (i, j, u, v) => tone([[70, 80, 90], [110, 120, 130], [160, 170, 178], [210, 216, 222]], clamp01(0.8 - v * 0.6), i, j));
    for (let i = x - 8; i < x + w + 8; i++) for (let k = 0; k < 4; k++) R.shadeAt(i, y - 4 + k, -0.3 + k * 0.07);
    return { w, h };
  }
  const w = kind === 'double' ? 32 : kind === 'wide' ? 42 : 24, h = kind === 'double' ? 46 : kind === 'wide' ? 50 : 40;
  const x = Math.round(cx - w / 2), y = by - h, sh = archShape(w, h), sh3 = archShape(w + 8, h + 4);
  for (let j = -4; j < h; j++) for (let i = -4; i < w + 4; i++) {
    if (sh(i, j) || !sh3(i + 4, j + 4)) continue;
    const X = x + i, Y = y + j;
    const a = Math.atan2(j - w / 2, i + 0.5 - w / 2), seg = Math.floor((a + Math.PI) / (Math.PI / 7));
    let v = 0.6 + ((hash(seg, j > w / 2 ? j >> 3 : 0, 5) & 255) / 255 - 0.5) * 0.14;
    if (!sh3(i + 3, j + 3) || !sh3(i + 4, j + 3)) v += 0.2;
    if (sh(i - 1, j) || sh(i, j - 1)) v -= 0.28;
    R.set(X, Y, tone(TRIM, clamp01(v), X, Y));
  }
  R.rect(x + w / 2 - 3, y - 5, 6, 5, (i, j, u, v) => tone(TRIM, clamp01(0.82 - v * 0.4), i, j));
  const leaves = kind === 'arch' ? 1 : 2;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!sh(i, j)) continue;
    const X = x + i, Y = y + j, pl = i % 5;
    let v = 0.46 + ((hash(Math.floor(i / 5), 0, 9) & 255) / 255 - 0.5) * 0.14 + (vnoise(X / 1.3, Y / 8, 1, 6) - 0.5) * 0.22;
    if (pl === 0) v -= 0.22; else if (pl === 1) v += 0.08;
    if (!sh(i, j - 3)) v -= 0.18;
    if (leaves === 2 && (i === Math.floor(w / 2) || i === Math.floor(w / 2) - 1)) v = i === Math.floor(w / 2) ? 0.08 : 0.3;
    if (leaves === 2 && ((j - Math.round(h * 0.42)) % Math.round(h * 0.32) === 0) && j > w / 2) v -= 0.18;
    R.set(X, Y, tone(DOORW, clamp01(v), X, Y));
  }
  for (const f of [0.3, 0.74]) {
    const yy = y + Math.round(h * f);
    for (let i = 1; i < w - 1; i++) if (sh(i, yy - y)) { R.set(x + i, yy, IRON[2]); R.set(x + i, yy + 1, IRON[0]); if (i % 4 === 2) R.set(x + i, yy, IRON[4]); }
  }
  const hx = leaves === 2 ? x + w / 2 : x + w - 5, hy = y + Math.round(h * 0.55);
  R.set(hx - 2, hy, BRASS[3]); R.set(hx - 2, hy + 1, BRASS[2]); R.set(hx + 1, hy, BRASS[3]); R.set(hx + 1, hy + 1, BRASS[2]);
  R.rect(x - 6, by, w + 12, 3, (i, j, u, v) => tone(FOUND, clamp01(v < 0.4 ? 0.85 : 0.35 - (u > 0.9 ? 0.1 : 0)), i, j));
  return { w, h };
}

function hangingSign(R, x, y, kind, plaque = false) {
  let bx = x + 2, by = y + 6;
  if (plaque) { bx = x; by = y; for (let k = 0; k < 3; k++) for (let i = 0; i < 16; i++) R.shadeAt(bx + i + 2, by + 16 + k, -0.3 + k * 0.08); }
  else {
    R.rect(x, y, 16, 2, (i, j, u, v) => tone(IRON, v < 0.5 ? 0.6 : 0.2, i, j));
    R.rect(x, y - 3, 2, 8, IRON[1]);
    R.line(x + 2, y + 5, x + 9, y + 2, IRON[2]);
    R.set(x + 16, y - 1, IRON[2]); R.set(x + 16, y, IRON[1]);
    R.line(x + 5, y + 2, x + 5, y + 6, IRON[3]); R.line(x + 14, y + 2, x + 14, y + 6, IRON[3]);
  }
  R.rect(bx, by, 16, 16, (i, j, u, v) => {
    if (u < 0.08 || u > 0.92 || v < 0.08 || v > 0.92) return tone(BRASS, clamp01(0.7 - u * 0.3 - v * 0.3), i, j);
    return tone(DOORW, clamp01(0.52 + (vnoise(i / 1.2, j / 5, 1, 4) - 0.5) * 0.2 - v * 0.15), i, j);
  });
  const pal = { book: ramp('#b84a3c', 5), gear: ramp('#9aa0a8', 5), leaf: ramp('#6aa84a', 5), flame: ramp('#f08a2c', 5), bolt: ramp('#f2cc3a', 5), star: ramp('#f4cf52', 5), clock: BRASS.slice(1), bell: BRASS.slice(1) }[kind] || BRASS.slice(1);
  icon(R, kind, bx + 8, by + 8, 5.5, pal);
}

// ---------------------------------------------------------------- 지붕 무늬
function roofV(mat, a, b, seed) {
  switch (mat) {
    case 'tile': {
      const rh = 6, tw = 7, row = Math.floor(b / rh), off = (row & 1) * 3.5, ua = a + off, ti = Math.floor(ua / tw), u = (ua - ti * tw) / tw, vv = (b - row * rh) / rh;
      let v = 0.5 + (0.24 - Math.abs(u - 0.4)) * 0.85 + (vv - 0.5) * 0.3 + (rnd(ti, row, seed) - 0.5) * 0.14;
      if (vv < 0.18) v -= 0.3;
      if (u < 0.1 || u > 0.9) v -= 0.12;
      return v;
    }
    case 'slate': {
      const rh = 6, tw = 10, row = Math.floor(b / rh), off = (row & 1) * 5 + (hash(row, 0, seed) % 3), ua = a + off, ti = Math.floor(ua / tw), u = ua - ti * tw, vv = b - row * rh;
      let v = 0.5 + (rnd(ti, row, seed) - 0.5) * 0.2 + (vv / rh) * 0.12;
      if (vv < 1) v -= 0.32; else if (vv >= rh - 1) v += 0.06;
      if (u < 1) v -= 0.16;
      return v;
    }
    case 'shingle': {
      const rh = 5, row = Math.floor(b / rh), vv = b - row * rh;
      const tw = 5 + (hash(row, 1, seed) % 4), off = hash(row, 2, seed) % 7, ua = a + off, ti = Math.floor(ua / tw), u = ua - ti * tw;
      let v = 0.48 + (rnd(ti, row, seed) - 0.5) * 0.28 + (vnoise(a / 1.2, b * 2, 1, seed) - 0.5) * 0.12 + (vv / rh) * 0.1;
      if (vv < 1) v -= 0.3;
      if (u < 1) v -= 0.14;
      return v;
    }
    case 'copper': {
      const seam = ((Math.round(a) % 11) + 11) % 11;
      let v = 0.5 + (vnoise(a, b, 9, seed) - 0.5) * 0.16 + (rnd(Math.floor(a / 11), Math.floor(b / 18), seed) - 0.5) * 0.1 + (b / 60) * 0.06;
      if (seam === 0) v += 0.22; else if (seam === 1) v -= 0.22;
      if (((Math.round(b) % 18) + 18) % 18 === 0) v -= 0.1;
      return v;
    }
    case 'metal': {
      let v = 0.5 + Math.sin((a / 5) * Math.PI * 2) * 0.17;
      if (((Math.round(b) % 30) + 30) % 30 === 0) v -= 0.22;
      return v;
    }
    case 'glass': {
      const pa = ((Math.round(a) % 12) + 12) % 12, pb = ((Math.round(b) % 10) + 10) % 10;
      if (pa === 0 || pb === 0) return 0.2;
      return 0.55 + ((a - b * 0.8) % 30 < 4 ? 0.3 : 0) - pb * 0.02;
    }
    default: return 0.5;
  }
}
function face(R, pts, rp, mat, base, coord, seed, clipTop = -1e9) {
  R.poly(pts, (x, y) => {
    if (y < clipTop) return null;
    const [a, b] = coord(x, y);
    let v = roofV(mat, a, b, seed) + base + (rnd(x, y, seed + 1) - 0.5) * 0.05;
    let c = tone(rp, clamp01(v), x, y, 0.6);
    const n = vnoise(x, y, 11, seed + 5);
    if (mat === 'tile' && n > 0.7) c = mix(c, [96, 112, 62], (n - 0.7) * 1.4);
    if (mat === 'copper' && vnoise(x / 2, y / 6, 2, seed + 6) > 0.74) c = mix(c, [150, 196, 176], 0.16);
    if (mat === 'metal' && vnoise(x / 2, y / 9, 1.6, seed + 7) > 0.76) c = mix(c, [128, 78, 52], 0.26);
    return c;
  });
}
function ridgeCap(R, x0, x1, y, rp) {
  R.rect(x0, y - 2, x1 - x0, 4, (i, j, u, v) => { const s = (i - x0) % 7; return tone(rp, clamp01((v < 0.3 ? 0.78 : v < 0.6 ? 0.55 : 0.22) + (s === 0 ? -0.2 : s === 1 ? 0.06 : 0)), i, j); });
}
function edgeLine(R, x0, y0, x1, y1, rp, v) { R.line(x0, y0, x1, y1, (x, y) => tone(rp, clamp01(v), Math.round(x), Math.round(y)), 2); }

// ---------------------------------------------------------------- 조립
const cache = new Map();
export function getBuildingSprite(opts = {}) {
  const style = STY[opts.style] ? opts.style : 'house', S = STY[style];
  const w = Math.round(Math.max(120, Math.min(260, +opts.w || 170)));
  const o = { style, w, roof: opts.roof || S.roof, wall: opts.wall || S.wall, sign: opts.sign ?? S.sign };
  const key = JSON.stringify(o);
  let s = cache.get(key);
  if (!s) { s = build(o, S); cache.set(key, s); }
  return s;
}

function build(o, S) {
  const W = o.w, ov = 7, type = S.roofType, seed = strSeed(o.style) % 1000 + W;
  const CW = W + 110, CH = 400, xL = 34, xR = xL + W, cx = xL + W / 2, ay = CH - 20;
  const wallH = S.wallH, wallTop = ay - wallH;
  const R = new Ras(CW, CH);
  const wp = ramp(o.wall, 7, { dark: 0.55, light: 0.34 }), rp = ramp(o.roof, 7, { dark: 0.62, light: 0.4 });
  const D = type === 'dome' ? 64 : 76;

  // 바닥 그림자(오른쪽 아래로 길게) + 벽 밑 접지 그림자
  const shTop = type === 'dome' ? wallTop + 10 : wallTop - 10;
  R.sPoly([[xR - 2, shTop], [xR + 46, shTop + 30], [xR + 52, ay + 9], [xL + 20, ay + 9], [xL + 10, ay + 1], [xR - 2, ay]], 0.5);
  R.sRect(xL - 3, ay - 2, W + 6, 5, 0.3);

  // 벽(평지붕은 난간만큼 위로)
  const parapet = type === 'flat' || type === 'flatdome' ? 8 : 0;
  const groundH = 50;
  paintWall(R, xL, wallTop - parapet, W, wallH + parapet, S, wp, seed, groundH);

  // 박공 벽(앞박공)
  let gh = 0, knee = null;
  if (type === 'front' || type === 'gambrel' || type === 'lowfront') {
    gh = Math.round(S.gh * W);
    if (type === 'gambrel') knee = [W * 0.17, gh * 0.6];
    const gpts = knee ? [[xL, wallTop], [xL + knee[0], wallTop - knee[1]], [cx, wallTop - gh + 2], [xR - knee[0], wallTop - knee[1]], [xR, wallTop]] : [[xL, wallTop + 1], [cx, wallTop - gh + 2], [xR, wallTop + 1]];
    const tmp = new Ras(W, gh + 4);
    paintWall(tmp, 0, 0, W, gh + 4, { ...S, mat: S.mat === 'timber-stone' ? 'timber' : S.mat }, wp, seed + 7, 0);
    R.poly(gpts, (x, y) => { const c = tmp.get(x - xL, y - (wallTop - gh - 2)); return c && c[3] ? [c[0], c[1], c[2]] : null; });
  }

  // 모퉁이돌
  if (S.quoins) {
    for (let y = wallTop - parapet + 2, k = 0; y < ay - 8; y += 9, k++) {
      const bw = k % 2 ? 7 : 12;
      stoneBand(R, xL, y, bw, 8, TRIM, 11 + k); stoneBand(R, xR - bw, y, bw, 8, TRIM, 31 + k);
    }
  }

  // 창문 배치
  const doorKind = S.door;
  const dW = { arch: 24, double: 32, wide: 42, barn: 48, roller: 64, glass: 30 }[doorKind] || 24;
  const wins = [];
  const floors = S.floors;
  const layoutRow = (y, full) => {
    const ww = S.winW, gap = S.win === 'tall' ? 16 : 12;
    if (full) {
      const n = Math.max(1, Math.floor((W - 20 + gap) / (ww + gap))), span = n * ww + (n - 1) * gap, sx = cx - span / 2;
      for (let k = 0; k < n; k++) wins.push([Math.round(sx + k * (ww + gap)), y, ww, S.winH]);
    } else {
      const zone = W / 2 - dW / 2 - 14 - 8;
      const n = Math.max(1, Math.floor((zone + gap) / (ww + gap)));
      for (const side of [-1, 1]) {
        const zc = cx + side * (dW / 2 + 14 + zone / 2), span = n * ww + (n - 1) * gap;
        for (let k = 0; k < n; k++) wins.push([Math.round(zc - span / 2 + k * (ww + gap)), y, ww, S.winH]);
      }
    }
  };
  if (S.win === 'band') { /* 띠창은 아래에서 */ }
  else if (S.win === 'high') layoutRow(wallTop + 10, false);
  else if (floors === 2) {
    const midY = wallTop + Math.round(wallH * 0.46);
    layoutRow(wallTop + 12, true);
    if (o.style !== 'shop') layoutRow(midY + 10, false);
  } else layoutRow(wallTop + Math.round((wallH - 8 - S.winH) / 2) - (S.win === 'arch' ? 1 : 3), false);

  // 목조 뼈대
  if (S.mat === 'timber' || S.mat === 'timber-stone') {
    const top = wallTop, bot = S.mat === 'timber' ? ay - 11 : ay - groundH;
    beam(R, xL, top, W, 4, false);
    beam(R, xL, bot - 4, W, 4, false);
    beam(R, xL, top, 4, bot - top, true); beam(R, xR - 4, top, 4, bot - top, true);
    const rowWins = wins.filter((q) => q[1] < bot && q[1] > top - 2);
    for (const [wx, wy, ww, wh] of rowWins) {
      const px0 = wx - (S.shutters ? Math.round(ww * 0.5) + 2 : 0) - 6, px1 = wx + ww + (S.shutters ? Math.round(ww * 0.5) + 2 : 0) + 2;
      beam(R, px0, top, 4, bot - top, true); beam(R, px1, top, 4, bot - top, true);
    }
    if (S.mat === 'timber') {
      const dl = cx - dW / 2 - 8, dr = cx + dW / 2 + 4;
      beam(R, dl, top, 4, bot - top, true); beam(R, dr, top, 4, bot - top, true);
      brace(R, xL + 4, bot - 5, xL + 16, top + 4); brace(R, xR - 5, bot - 5, xR - 17, top + 4);
    } else {
      const mid = Math.round((top + bot) / 2) + 6;
      beam(R, xL, mid, W, 3, false);
      brace(R, xL + 4, mid, xL + 14, top + 4); brace(R, xR - 5, mid, xR - 15, top + 4);
    }
    if (gh) {
      beam(R, cx - 2, wallTop - gh + 12, 4, gh - 10, true);
      beam(R, xL + 8, wallTop - 10, W - 16, 3, false);
      brace(R, cx - 2, wallTop - gh * 0.5, cx - W * 0.2, wallTop - 10);
      brace(R, cx + 2, wallTop - gh * 0.5, cx + W * 0.2, wallTop - 10);
    }
  }
  if (S.mat === 'stucco') {
    for (const yy of [wallTop + Math.round(wallH * 0.46)]) stoneBand(R, xL, yy, W, 4, TRIM, 17);
    stoneBand(R, xL - 3, wallTop - parapet - 1, W + 6, 5, TRIM, 19);
  }
  if (S.mat === 'planks') {
    R.rect(xL, wallTop, W, 4, (i, j, u, v) => tone([[150, 140, 126], [196, 186, 168], [226, 218, 200], [244, 238, 224]], clamp01(0.7 - v * 0.4), i, j));
    R.rect(xL, wallTop, 4, wallH - 8, (i, j, u) => tone([[150, 140, 126], [196, 186, 168], [226, 218, 200], [244, 238, 224]], clamp01(0.75 - u * 0.4), i, j));
    R.rect(xR - 4, wallTop, 4, wallH - 8, (i, j, u) => tone([[150, 140, 126], [196, 186, 168], [226, 218, 200], [244, 238, 224]], clamp01(0.55 - u * 0.4), i, j));
  }

  // 기초 돌띠
  if (S.found) stoneBand(R, xL - 2, ay - 8, W + 4, 8, FOUND, seed + 3);
  else R.rect(xL - 2, ay - 6, W + 4, 6, (i, j, u, v) => tone(FOUND, clamp01(0.6 - v * 0.3), i, j));

  // 창·문 그리기
  const winOpts = { shutters: S.shutters, flowerbox: S.flowerbox, mullion: S.mat === 'timber' || S.mat === 'timber-stone' ? [236, 228, 208] : S.mat === 'panel' ? [200, 206, 212] : [90, 70, 52], frame: S.mat === 'brick' ? ramp([176, 160, 140], 7) : TRIM };
  if (S.mat === 'timber' || S.mat === 'timber-stone') winOpts.fw = 1;
  for (const [wx, wy, ww, wh] of wins) drawWindow(R, wx, wy, ww, wh, S.win === 'high' ? 'rect' : S.win, { ...winOpts, flowerbox: S.flowerbox && wy > wallTop + 20 });
  if (o.style === 'shop') {
    // 가게 진열창 + 차양
    const zone = W / 2 - dW / 2 - 18;
    const dx0 = xL + 8, dw = Math.round(zone), dy = ay - 42;
    drawWindow(R, dx0, dy, dw, 26, 'rect', { frame: ramp([120, 84, 56], 7), fw: 2, mullion: [110, 80, 54] });
    const rp2 = ramp('#e6d2a8', 5);
    for (let k = 0; k < 4; k++) blob(R, dx0 + 6 + k * (dw - 10) / 3, dy + 21, 3, 3, k % 2 ? ramp('#d96a3a', 5) : ramp('#c8b04a', 5));
    drawWindow(R, xR - 8 - Math.round(zone * 0.6), dy + 2, Math.round(zone * 0.6), 20, 'rect', { frame: ramp([120, 84, 56], 7), fw: 2, mullion: [110, 80, 54], flowerbox: true });
    const aw = ramp(S.awning, 5), cream = ramp('#efe4c8', 5), ax0 = dx0 - 4, ax1 = dx0 + dw + 4, ay0 = dy - 12;
    R.poly([[ax0, ay0], [ax1, ay0], [ax1 + 3, ay0 + 11], [ax0 - 3, ay0 + 11]], (x, y, u, v) => {
      const stripe = Math.floor((x - ax0 + 3) / 6) % 2;
      return tone(stripe ? cream : aw, clamp01(0.72 - v * 0.35 + (y === ay0 ? 0.15 : 0)), x, y);
    });
    for (let x = ax0 - 3; x < ax1 + 3; x++) {
      const k = (x - ax0 + 3) % 6, stripe = Math.floor((x - ax0 + 3) / 6) % 2, dep = k === 0 || k === 5 ? 1 : k === 1 || k === 4 ? 2 : 3;
      for (let j = 0; j < dep; j++) R.set(x, ay0 + 11 + j, tone(stripe ? cream : aw, 0.3, x, ay0 + 11 + j));
    }
    for (let x = ax0; x < ax1; x++) for (let k = 0; k < 5; k++) R.shadeAt(x, ay0 + 14 + k, -0.3 + k * 0.06);
  }
  if (S.win === 'band') {
    const by = wallTop + 11, bh = 16;
    R.rect(xL + 8, by - 2, W - 16, bh + 4, (i, j, u, v) => tone(IRON, clamp01(0.6 - v * 0.3), i, j));
    R.rect(xL + 10, by, W - 20, bh, (i, j) => {
      const seg = (i - xL - 10) % 22; if (seg === 0) return IRON[2];
      const d = ((i - xL) - (j - by) * 0.8 + 100) % 28;
      return tone([[20, 50, 64], [34, 80, 98], [56, 118, 138], [96, 166, 182], [160, 214, 222]], clamp01(0.35 + (d < 3 ? 0.45 : d < 5 ? 0.2 : 0) + ((j - by) / bh) * 0.15), i, j);
    });
    R.rect(xL + 6, wallTop + 33, W - 12, 2, (i, j) => tone([[40, 150, 170], [90, 210, 225]], 0.8, i, j));
  }
  const door = drawDoor(R, cx, ay - 1, doorKind, wp);

  // 처마 그림자(벽 위쪽)
  const eaveShadow = type === 'flat' || type === 'flatdome' ? 4 : type === 'dome' ? 5 : 10;
  const esTop = type === 'front' || type === 'gambrel' || type === 'lowfront' ? wallTop + 3 : wallTop;
  for (let k = 0; k < eaveShadow; k++) for (let x = xL; x < xR; x++) R.shadeAt(x, esTop + k - (parapet ? parapet - 5 : 0), -0.42 * (1 - k / eaveShadow));

  // 지붕
  const x0 = xL - ov, x1 = xR + ov;
  if (type === 'hip' || type === 'gable') {
    const eY = wallTop + 5, rY = eY - S.fh, bY = rY - S.bh;
    if (type === 'hip') {
      const inset = Math.round(S.fh * 0.9), rx0 = x0 + inset, rx1 = x1 - inset;
      face(R, [[x0, bY], [x1, bY], [rx1, rY], [rx0, rY]], rp, S.roofMat, 0.14, (x, y) => [x, rY - y], seed);
      face(R, [[x0, eY], [rx0, rY], [rx1, rY], [x1, eY]], rp, S.roofMat, -0.02, (x, y) => [x, y - rY], seed);
      face(R, [[x0, bY], [rx0, rY], [x0, eY]], rp, S.roofMat, 0.1, (x, y) => [y, rx0 - x], seed + 2);
      face(R, [[x1, bY], [x1, eY], [rx1, rY]], rp, S.roofMat, -0.22, (x, y) => [y, x - rx1], seed + 3);
      edgeLine(R, x0 + 1, eY - 1, rx0, rY, rp, 0.85); edgeLine(R, x0 + 1, bY + 1, rx0, rY, rp, 0.75);
      edgeLine(R, x1 - 1, eY - 1, rx1, rY, rp, 0.18); edgeLine(R, x1 - 1, bY + 1, rx1, rY, rp, 0.3);
      ridgeCap(R, rx0, rx1, rY, rp);
    } else {
      face(R, [[x0 + 2, bY], [x1 - 2, bY], [x1 - 2, rY], [x0 + 2, rY]], rp, S.roofMat, 0.14, (x, y) => [x, rY - y], seed);
      face(R, [[x0, rY], [x1, rY], [x1, eY], [x0, eY]], rp, S.roofMat, -0.02, (x, y) => [x, y - rY], seed);
      ridgeCap(R, x0 + 2, x1 - 2, rY, rp);
      R.rect(x0, bY, 3, eY - bY, (i, j, u) => tone(TIMBER, clamp01(0.55 - u * 0.3), i, j));
      R.rect(x1 - 3, bY, 3, eY - bY, (i, j, u) => tone(TIMBER, clamp01(0.4 - u * 0.3), i, j));
    }
    R.rect(x0, eY - 1, x1 - x0, 3, (i, j, u, v) => tone(rp, clamp01(v < 0.4 ? 0.42 : 0.12), i, j));
    R.rect(x0, bY - 1, x1 - x0, 2, (i, j) => tone(rp, 0.2, i, j));

    if (S.dormer) {
      const dx = Math.round(cx + W * 0.2), dwid = 22, dyb = eY - 10, dyt = dyb - 18;
      for (let x = dx + dwid / 2 + 2; x < dx + dwid / 2 + 9; x++) for (let y = dyt - 6; y < dyb + 2; y++) R.shadeAt(x, y, -0.25);
      paintWall(R, dx - dwid / 2, dyt, dwid, 18, { mat: 'stucco' }, wp, seed + 9, 0);
      drawWindow(R, dx - 5, dyt + 5, 10, 11, 'rect', { fw: 1, frame: TIMBER, mullion: [236, 228, 208] });
      face(R, [[dx - dwid / 2 - 3, dyt + 2], [dx, dyt - 11], [dx, dyt - 20], [dx - dwid / 2 - 3, dyt - 7]], rp, S.roofMat, 0.08, (x, y) => [y, dx - x], seed + 4);
      face(R, [[dx + dwid / 2 + 3, dyt + 2], [dx, dyt - 11], [dx, dyt - 20], [dx + dwid / 2 + 3, dyt - 7]], rp, S.roofMat, -0.16, (x, y) => [y, x - dx], seed + 5);
      edgeLine(R, dx - dwid / 2 - 3, dyt + 2, dx, dyt - 11, TIMBER, 0.5); edgeLine(R, dx + dwid / 2 + 3, dyt + 2, dx, dyt - 11, TIMBER, 0.3);
    }
    if (S.chimney) chimney(R, Math.round(xL + W * 0.74), rY - 12, rY + 14, S.chimney === 'stack', seed);
    if (S.tower) tower(R, cx, eY, rY, rp, wp, S, seed);
    if (S.pediment) pediment(R, cx, ay, wallTop, o.sign);
  } else if (gh) {
    const dk = S.dk, apexY = wallTop - gh - 3, eY = wallTop + 4;
    const yFront = (x) => {
      const dx = Math.abs(x - cx), half = W / 2 + ov;
      if (!knee) return eY - (1 - dx / half) * (eY - apexY);
      const kx = half - knee[0] - ov, ky = eY - knee[1] - 5;
      return dx > kx ? eY - ((half - dx) / (half - kx)) * (eY - ky) : ky - ((kx - dx) / kx) * (ky - apexY);
    };
    const pts = (side) => {
      const P = [], xs = knee ? [x0, cx - (W / 2 - knee[0]), cx] : [x0, cx];
      const sx = (x) => (side < 0 ? x : 2 * cx - x);
      for (const x of xs) P.push([sx(x), yFront(x)]);
      for (let k = xs.length - 1; k >= 0; k--) P.push([sx(xs[k]), yFront(xs[k]) - dk]);
      return P;
    };
    face(R, pts(-1), rp, S.roofMat, 0.08, (x, y) => [y - yFront(x) + dk, cx - x], seed + 2);
    face(R, pts(1), rp, S.roofMat, -0.18, (x, y) => [y - yFront(x) + dk, x - cx], seed + 3);
    R.rect(cx - 1, apexY - dk, 3, dk, (i, j, u) => tone(rp, clamp01(u < 0.4 ? 0.8 : 0.3), i, j));
    // 박공 테두리(바람막이 판)
    const bb = knee ? [[x0, eY], [cx - (W / 2 - knee[0]), yFront(cx - (W / 2 - knee[0]))], [cx, apexY]] : [[x0, eY], [cx, apexY]];
    for (const side of [-1, 1]) for (let k = 0; k + 1 < bb.length; k++) {
      const [ax_, ay_] = bb[k], [bx_, by_] = bb[k + 1];
      const sx = (x) => (side < 0 ? x : 2 * cx - x);
      R.stroke([[sx(ax_), ay_ + 1], [sx(bx_), by_ + 1]], 5, 5, (x, y, t, nx, ny) => tone(S.mat === 'planks' ? [[150, 140, 126], [196, 186, 168], [226, 218, 200], [244, 238, 224]] : TIMBER, clamp01(0.5 - ny * 0.3 - (side > 0 ? 0.12 : 0)), x, y));
    }
    if (o.style === 'house') drawWindow(R, cx - 7, wallTop - Math.round(gh * 0.55), 14, 14, 'round', { frame: TIMBER, fw: 2 });
    if (o.style === 'barn') {
      const lw = 20, lh = 22, ly = wallTop - Math.round(gh * 0.72);
      R.rect(cx - lw / 2 - 2, ly - 2, lw + 4, lh + 2, [236, 228, 210]);
      R.rect(cx - lw / 2, ly, lw, lh, (i, j) => tone([[20, 14, 12], [36, 26, 20], [60, 44, 30]], clamp01(0.2 + ((j - ly) / lh) * 0.3), i, j));
      blob(R, cx - 2, ly + lh - 5, 7, 5, ramp('#d8b85a', 6));
      R.rect(cx - 2, ly - 10, 4, 8, (i, j, u) => tone(TIMBER, clamp01(0.6 - u * 0.4), i, j));
      R.line(cx, ly - 3, cx, ly + 6, IRON[2]);
    }
    if (o.style === 'warehouse') {
      R.rect(cx - 24, wallTop - 4, 48, 10, (i, j, u, v) => tone([[170, 160, 140], [200, 190, 170], [224, 216, 198]], clamp01(0.7 - v * 0.5), i, j));
    }
    if (S.chimney) chimney(R, Math.round(cx + W * 0.24), apexY - dk + 8, apexY - dk + 38, false, seed);
  } else if (type === 'flat' || type === 'flatdome') {
    const top = wallTop - parapet, dk = S.dk, rt = top - dk;
    R.rect(x0 + 3, rt, x1 - x0 - 6, dk, (i, j, u, v) => tone(ramp('#8a867e', 6), clamp01(0.5 + v * 0.1 + (rnd(i, j, 7) - 0.5) * 0.14 + (vnoise(i, j, 6, 3) - 0.5) * 0.1), i, j));
    R.rect(x0 + 3, rt - 5, x1 - x0 - 6, 5, (i, j, u, v) => tone(wp, clamp01(0.72 - v * 0.2), i, j));
    R.rect(x0 + 3, rt, 5, dk, (i, j, u) => tone(wp, clamp01(0.7 - u * 0.2), i, j));
    R.rect(x1 - 8, rt, 5, dk, (i, j, u) => tone(wp, clamp01(0.4 - u * 0.2), i, j));
    for (let x = x0 + 8; x < x1 - 8; x++) for (let k = 0; k < 4; k++) R.shadeAt(x, rt + k, -0.3 + k * 0.07);
    if (type === 'flat') {
      const bx = Math.round(xL + W * 0.2), by = rt + 8;
      R.rect(bx, by, 22, 5, (i, j, u, v) => tone(ramp('#a8aeb2', 5), clamp01(0.7 - v * 0.2), i, j));
      R.rect(bx, by + 5, 22, 10, (i, j, u, v) => tone(ramp('#9aa0a4', 5), clamp01(0.5 - v * 0.2 + ((i - bx) % 3 === 0 ? -0.15 : 0)), i, j));
      for (let x = bx + 22; x < bx + 30; x++) for (let y = by + 3; y < by + 16; y++) R.shadeAt(x, y, -0.2);
      cylV(R, Math.round(xL + W * 0.72), rt + 2, 16, 20, ramp('#8c7a66', 6));
      R.ell(Math.round(xL + W * 0.72) + 8, rt + 2, 8, 3, (i, j) => tone(ramp('#8c7a66', 6), 0.8, i, j));
    } else {
      const dr = Math.round(W * 0.26), dcx = cx, dcy = rt + dk * 0.62;
      R.ell(dcx, dcy + 2, dr + 4, 7, (i, j, nx, ny) => tone(ramp('#b8c0c6', 6), clamp01(0.6 - ny * 0.2 - nx * 0.1), i, j));
      R.ell(dcx, dcy, dr, dr * 0.95, (i, j, nx, ny) => {
        if (j > dcy) return null;
        const lon = Math.abs(((Math.atan2(nx, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))) / 0.4) % 1 + 1) % 1 - 0.5) < 0.06;
        const lat = Math.abs(((ny * 3.2) % 1 + 1) % 1 - 0.5) < 0.07;
        let v = 0.35 + lambert(nx * 0.9, ny * 0.9) * 0.4 + ((nx + ny < -0.7 && nx + ny > -0.95) ? 0.35 : 0);
        if (lon || lat) return tone(ramp('#dfe6ea', 5), clamp01(0.7 + lambert(nx, ny) * 0.2), i, j);
        return tone([[20, 60, 80], [36, 96, 120], [64, 140, 164], [110, 190, 208], [190, 234, 240]], clamp01(v), i, j);
      });
      R.line(dcx + dr * 0.5, dcy - dr * 0.8, dcx + dr * 0.5, dcy - dr * 0.8 - 14, IRON[2]);
      R.set(dcx + dr * 0.5, dcy - dr * 0.8 - 15, [255, 90, 90]);
    }
  } else if (type === 'dome') {
    const dr = W / 2 + 3, dry = W * 0.46;
    R.ell(cx, wallTop + 2, dr + 2, 6, (i, j, nx, ny) => tone(TRIM, clamp01(0.62 - ny * 0.25 - nx * 0.1), i, j));
    R.ell(cx, wallTop, dr, dry, (i, j, nx, ny) => {
      if (j > wallTop) return null;
      const gore = Math.abs(((Math.asin(Math.max(-1, Math.min(1, nx / Math.sqrt(Math.max(0.01, 1 - ny * ny))))) / 0.3) % 1 + 1) % 1 - 0.5) < 0.05;
      const slit = nx > -0.15 && nx < -0.03 && ny < 0.05;
      if (slit) return tone(IRON, clamp01(0.12 + (nx > -0.06 ? 0.22 : 0) + (ny > -0.5 && ny < -0.3 ? 0.3 : 0)), i, j);
      if (Math.abs(nx + 0.165) < 0.02 || Math.abs(nx + 0.015) < 0.02) return tone(rp, 0.85, i, j);
      let v = 0.3 + lambert(nx * 0.95, ny * 0.95) * 0.55 + (gore ? -0.14 : 0);
      return tone(rp, clamp01(v), i, j);
    });
    R.stroke([[cx - 6, wallTop - dry * 0.5], [cx - 11, wallTop - dry * 0.78]], 4, 3, (x, y, t, nx) => tone(ramp('#d8d0c0', 5), clamp01(0.6 - nx * 0.3), x, y));
    R.line(cx - 13, wallTop - dry - 2, cx - 13, wallTop - dry + 4, IRON[1]);
  }

  // 간판
  if (o.sign && o.sign !== 'none' && !(o.style === 'school' && o.sign === 'clock') && !(S.pediment)) {
    const sx = Math.round(cx + door.w / 2 + 5), sy = ay - door.h - 6;
    const hit = (x0, y0, w0, h0) => wins.some(([wx, wy, ww, wh]) => x0 < wx + ww + 4 + (S.shutters ? ww * 0.5 + 2 : 0) && x0 + w0 > wx - 4 - (S.shutters ? ww * 0.5 + 2 : 0) && y0 < wy + wh + 4 && y0 + h0 > wy - 4);
    const aboveY = ay - door.h - 24;
    if (!hit(sx, sy - 3, 20, 26)) hangingSign(R, sx, sy, o.sign);
    else if (aboveY > wallTop + 8 && !hit(cx - 8, aboveY, 16, 16)) hangingSign(R, Math.round(cx - 8), aboveY, o.sign, true);
    else if (gh) hangingSign(R, Math.round(cx + W * 0.16), wallTop - Math.round(gh * 0.42), o.sign, true);
    else hangingSign(R, xR - 22, wallTop + 12, o.sign, true);
  }

  R.outline({ ink: INK, bottom: 0.45, side: 0.42, top: 0.3 });
  const block = { x: -Math.round(W / 2), y: -D, w: W, h: D + 2 };
  return out(R, Math.round(cx), ay, { block, door: { x: 0, y: 4 } }, { blur: 3, crop: true });
}

function chimney(R, x, top, bot, stack, seed) {
  const w = stack ? 14 : 12, br = ramp(stack ? '#8e4a3a' : '#9a8c78', 6);
  for (let xx = x + w; xx < x + w + 8; xx++) for (let y = top + 4; y < bot + 4; y++) R.shadeAt(xx, y, -0.25);
  R.rect(x, top, w, bot - top, (i, j) => {
    const row = Math.floor((j - top) / 4), off = (row & 1) * 3;
    if ((j - top) % 4 === 3 || (i - x + off) % 7 === 6) return tone(br, 0.12, i, j);
    return tone(br, clamp01(0.55 - ((i - x) / w) * 0.3 + (rnd(Math.floor((i - x + off) / 7), row, seed) - 0.5) * 0.2), i, j);
  });
  const ch = stack ? 6 : 4;
  R.rect(x - 2, top - ch, w + 4, ch, (i, j, u, v) => tone(TRIM, clamp01(0.8 - v * 0.5 - u * 0.2), i, j));
  R.rect(x + 1, top - ch - 2, w - 2, 2, (i, j) => tone(IRON, 0.1, i, j));
  if (stack) { R.rect(x - 1, top + 10, w + 2, 2, (i, j, u) => tone(TRIM, clamp01(0.6 - u * 0.3), i, j)); for (let k = 0; k < 10; k++) R.shadeAt(x + 2 + k, top - ch - 1, -0.4); }
}

function tower(R, cx, eY, rY, rp, wp, S, seed) {
  const tw = 42, x0 = Math.round(cx - tw / 2), top = rY - 22, bot = eY + 2;
  for (let x = x0 + tw; x < x0 + tw + 12; x++) for (let y = top; y < bot; y++) R.shadeAt(x, y, -0.28);
  paintWall(R, x0, top, tw, bot - top, S, wp, seed + 21, 0);
  stoneBand(R, x0 - 3, top - 4, tw + 6, 5, TRIM, 41);
  stoneBand(R, x0 - 2, bot - 5, tw + 4, 5, TRIM, 42);
  const ccy = top + 20;
  R.ell(cx, ccy, 13, 13, (i, j, nx, ny) => tone(TRIM, clamp01(0.6 - nx * 0.2 - ny * 0.25), i, j));
  icon(R, 'clock', cx, ccy, 11, [[120, 108, 90], [188, 176, 150], [236, 228, 206], [250, 246, 232], [255, 255, 246]], { ink: [60, 46, 30] });
  drawWindow(R, cx - 5, ccy + 18, 10, 16, 'arch', { fw: 2 });
  const pt = top - 5, ap = pt - 30;
  face(R, [[x0 - 5, pt], [cx, ap], [cx, pt]], rp, S.roofMat, 0.1, (x, y) => [x, y - ap], seed + 7);
  face(R, [[cx, pt], [cx, ap], [x0 + tw + 5, pt]], rp, S.roofMat, -0.2, (x, y) => [x, y - ap], seed + 8);
  R.rect(x0 - 5, pt - 1, tw + 10, 2, (i, j) => tone(rp, 0.15, i, j));
  R.line(cx, ap - 10, cx, ap, IRON[2]);
  blob(R, cx + 0.5, ap - 3, 2.5, 2.5, BRASS);
  R.line(cx - 4, ap - 8, cx + 5, ap - 8, IRON[3]);
}

function pediment(R, cx, ay, wallTop, sign) {
  const pw = 70, px0 = Math.round(cx - pw / 2), colTop = wallTop + 14, colBot = ay - 8;
  for (const x of [px0 + 3, px0 + pw - 11]) {
    for (let xx = x + 8; xx < x + 13; xx++) for (let y = colTop; y < colBot; y++) R.shadeAt(xx, y, -0.28);
    cylV(R, x, colTop, 8, colBot - colTop, TRIM, { tex: (i, j, u) => (Math.round(u * 8) % 3 === 0 ? -0.06 : 0) });
    R.rect(x - 2, colTop, 12, 3, (i, j, u, v) => tone(TRIM, clamp01(0.8 - v * 0.5), i, j));
    R.rect(x - 2, colBot - 3, 12, 3, (i, j, u, v) => tone(TRIM, clamp01(0.7 - v * 0.4), i, j));
  }
  const et = colTop - 7;
  R.rect(px0 - 4, et, pw + 8, 7, (i, j, u, v) => tone(TRIM, clamp01(v < 0.3 ? 0.85 : v > 0.8 ? 0.25 : 0.6), i, j));
  for (let x = px0 - 2; x < px0 + pw + 2; x++) for (let k = 0; k < 5; k++) R.shadeAt(x, et + 7 + k, -0.32 + k * 0.06);
  const ph = 24;
  R.poly([[px0 - 6, et], [cx, et - ph], [px0 + pw + 6, et]], (x, y) => {
    const inner = y > et - ph + 6 && y < et - 2 && Math.abs(x - cx) < (y - (et - ph + 6)) * ((pw / 2) / (ph - 6)) - 2;
    return tone(TRIM, clamp01(inner ? 0.4 : 0.72 - (x - cx) / pw * 0.3), x, y);
  });
  R.line(px0 - 6, et, cx, et - ph, (x, y) => tone(TRIM, 0.9, x, y));
  R.line(cx, et - ph, px0 + pw + 6, et, (x, y) => tone(TRIM, 0.35, x, y));
  if (sign && sign !== 'none') icon(R, sign, cx, et - 9, 6, { book: ramp('#b04a3a', 5), star: BRASS.slice(1) }[sign] || BRASS.slice(1));
  R.rect(px0 - 8, ay - 2, pw + 16, 3, (i, j, u, v) => tone(FOUND, clamp01(v < 0.4 ? 0.85 : 0.4), i, j));
}
