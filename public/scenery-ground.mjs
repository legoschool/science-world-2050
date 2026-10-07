// 바닥 전체를 한 장으로 칠한다. 타일 경계는 월드 좌표 잡음으로 비틀어 흙길·풀밭·모래·물이 불규칙하게 섞이고,
// 돌바닥(광장·시장·부두·실내)은 곧은 경계를 유지하되 연석·그림자·풀 덤불이 경계를 덮는다.
import { hash, rnd, addNoise, BAYER } from './scenery-core.mjs';

const CODES = 'gGpPhxkfwsdmt';
const GR = 0, GM = 1, PD = 2, PL = 3, MK = 4, CN = 5, DK = 6, FL = 7, WA = 8, SA = 9, FA = 10, TE = 11, FB = 12;
const SOFT = new Uint8Array([1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1]);
const HARD = new Uint8Array([0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0]);

// ---------------------------------------------------------------- 팔레트
const GRASS = [[42, 70, 40], [56, 90, 44], [72, 110, 48], [90, 128, 52], [110, 146, 58], [134, 164, 66], [162, 182, 84]];
const MEADOW = [[32, 60, 38], [42, 78, 42], [54, 96, 46], [68, 114, 50], [86, 132, 54], [108, 150, 60], [134, 168, 72]];

// 풀잎 무늬: 짧은 잎이 아래(어두움)에서 끝(밝음)으로 올라가며 겹친다. 255×256 타일로 한 번만 계산한다.
const BTW = 255, BTH = 256;
const bladeTiles = new Map();
function bladeTile(L0, seed) {
  const key = L0 * 100 + seed;
  let t = bladeTiles.get(key);
  if (t) return t;
  t = new Float32Array(BTW * BTH);
  const NCX = BTW / 3, NCY = BTH / 2;
  for (let y = 0; y < BTH; y++) for (let x = 0; x < BTW; x++) {
    let best = -1, bf = 0, bj = 0;
    const cx0 = Math.floor(x / 3), cy0 = Math.floor(y / 2);
    for (let cy = cy0; cy <= cy0 + 3; cy++) for (let cx = cx0 - 1; cx <= cx0 + 1; cx++) {
      const hb = hash(((cx % NCX) + NCX) % NCX, cy % NCY, seed);
      const oy = cy * 2 + (hb & 1);
      if (oy < y) continue;
      const Lb = L0 + ((hb >>> 1) % 3), up = oy - y;
      if (up >= Lb) continue;
      const f = up / (Lb - 1), lean = ((hb >>> 3) % 3) - 1;
      let bx = cx * 3 + ((hb >>> 5) % 3) + Math.round(lean * f * f * 1.6);
      bx = ((bx % BTW) + BTW) % BTW;
      if (bx !== x) continue;
      if (oy > best) { best = oy; bf = f; bj = ((hb >>> 8) & 255) / 255; }
    }
    t[y * BTW + x] = best < 0 ? -0.2 : bf * 0.34 - 0.08 + (bj - 0.5) * 0.14;
  }
  bladeTiles.set(key, t);
  return t;
}
const DIRT = [[98, 74, 56], [120, 92, 66], [142, 110, 78], [160, 127, 90], [177, 144, 104], [192, 162, 120], [208, 180, 138]];
const SAND = [[170, 148, 110], [188, 166, 126], [203, 184, 142], [215, 198, 156], [226, 212, 172], [237, 226, 192]];
const FARM = [[46, 32, 26], [62, 44, 32], [80, 58, 40], [100, 74, 50], [120, 92, 62], [140, 110, 76]];
const SOIL = [[40, 30, 26], [54, 40, 32], [70, 52, 40], [86, 66, 50], [102, 80, 60]];
const STONE = [[194, 180, 154], [178, 170, 154], [204, 192, 166], [170, 158, 140], [188, 174, 148], [168, 164, 152], [200, 182, 150], [182, 166, 140]];
const MARKET = [[140, 96, 74], [124, 90, 74], [152, 110, 84], [110, 94, 84], [134, 104, 88], [118, 82, 66]];
const FLOWER = [[238, 234, 222], [242, 208, 78], [222, 128, 158], [154, 116, 206], [226, 92, 72], [250, 244, 236]];
const WOOD = [[112, 76, 48], [132, 92, 58], [150, 106, 66], [166, 120, 76], [182, 136, 88]];
const FLOOR = [[150, 100, 62], [170, 118, 74], [188, 134, 86], [202, 150, 98], [214, 164, 112]];
const DEEP = [28, 80, 102], MID = [42, 112, 126], SHAL = [78, 150, 148], FOAM = [226, 238, 228];

function edgeDist(m, lx, ly) {
  let d = 99;
  if (m & 1 && lx < d) d = lx;
  if (m & 2 && 31 - lx < d) d = 31 - lx;
  if (m & 4 && ly < d) d = ly;
  if (m & 8 && 31 - ly < d) d = 31 - ly;
  if (m & 16) d = Math.min(d, Math.max(lx, ly));
  if (m & 32) d = Math.min(d, Math.max(31 - lx, ly));
  if (m & 64) d = Math.min(d, Math.max(lx, 31 - ly));
  if (m & 128) d = Math.min(d, Math.max(31 - lx, 31 - ly));
  return d;
}

// 0이 아닌 칸까지의 거리(5=한 칸, 7=대각선). 계산은 [bx0,bx1)×[by0,by1) 상자 안에서만 한다.
function chamfer(src, W, H, cap, bx0 = 0, by0 = 0, bx1 = W, by1 = H) {
  const INF = cap * 5, D = new Uint16Array(W * H).fill(INF);
  for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) { const i = y * W + x; if (src[i]) D[i] = 0; }
  for (let y = by0; y < by1; y++) {
    const r = y * W;
    for (let x = bx0; x < bx1; x++) {
      const i = r + x; let v = D[i];
      if (!v) continue;
      if (x > bx0 && D[i - 1] + 5 < v) v = D[i - 1] + 5;
      if (y > by0) {
        if (D[i - W] + 5 < v) v = D[i - W] + 5;
        if (x > bx0 && D[i - W - 1] + 7 < v) v = D[i - W - 1] + 7;
        if (x < bx1 - 1 && D[i - W + 1] + 7 < v) v = D[i - W + 1] + 7;
      }
      D[i] = v;
    }
  }
  for (let y = by1 - 1; y >= by0; y--) {
    const r = y * W;
    for (let x = bx1 - 1; x >= bx0; x--) {
      const i = r + x; let v = D[i];
      if (!v) continue;
      if (x < bx1 - 1 && D[i + 1] + 5 < v) v = D[i + 1] + 5;
      if (y < by1 - 1) {
        if (D[i + W] + 5 < v) v = D[i + W] + 5;
        if (x < bx1 - 1 && D[i + W + 1] + 7 < v) v = D[i + W + 1] + 7;
        if (x > bx0 && D[i + W - 1] + 7 < v) v = D[i + W - 1] + 7;
      }
      D[i] = v;
    }
  }
  return D;
}

// 보로노이 돌 무늬(엇갈린 줄). 세포 중심은 맵마다 표로 미리 계산하고, 결과는 모듈 변수로 돌려준다.
let vE = 0, vId = 0, vCx = 0, vCy = 0, vD = 0;
function cobbleTable(W, H, RH, CW, an, jx, jy, seed) {
  const rows = Math.ceil(H / RH) + 3, cols = Math.ceil(W / CW) + 5, half = CW >> 1;
  const PX = new Float32Array(rows * cols), PY = new Float32Array(rows * cols), ID = new Uint32Array(rows * cols);
  for (let r = -1; r < rows - 1; r++) for (let c = -2; c < cols - 2; c++) {
    const k = (r + 1) * cols + (c + 2), hq = hash(c, r, seed);
    PX[k] = c * CW + (r & 1) * half + CW * 0.5 + ((hq & 255) / 255 - 0.5) * jx;
    PY[k] = r * RH + RH * 0.5 + (((hq >>> 8) & 255) / 255 - 0.5) * jy;
    ID[k] = hq;
  }
  return { PX, PY, ID, cols, RH, CW, half, an };
}
function voro(x, y, T) {
  const { PX, PY, ID, cols, RH, CW, half, an } = T;
  const row = Math.floor(y / RH);
  let b1 = 1e9, b2 = 1e9, p1x = 0, p1y = 0, p2x = 0, p2y = 0, id1 = 0;
  for (let rr = row - 1; rr <= row + 1; rr++) {
    const c0 = Math.floor((x - (rr & 1) * half) / CW), base = (rr + 1) * cols + 2;
    for (let cc = c0 - 1; cc <= c0 + 1; cc++) {
      const k = base + cc, px = PX[k], py = PY[k];
      const dx = x - px, dy = (y - py) * an, dd = dx * dx + dy * dy;
      if (dd < b1) { b2 = b1; p2x = p1x; p2y = p1y; b1 = dd; p1x = px; p1y = py; id1 = ID[k]; }
      else if (dd < b2) { b2 = dd; p2x = px; p2y = py; }
    }
  }
  const ex = p2x - p1x, ey = (p2y - p1y) * an, el = Math.sqrt(ex * ex + ey * ey) || 1;
  vE = (((p1x + p2x) * 0.5 - x) * ex + ((p1y + p2y) * 0.5 - y) * an * ey) / el;
  vId = id1; vCx = p1x; vCy = p1y; vD = Math.sqrt(b1);
}

const cache = new Map();
export function buildSceneGround(map) {
  if (map && map.id != null && cache.has(map.id)) return cache.get(map.id);
  const c = paintGround(map);
  if (map && map.id != null) cache.set(map.id, c);
  return c;
}
export function clearGroundCache(id) { if (id == null) cache.clear(); else cache.delete(id); }

function paintGround(map) {
  const TW = map.w, TH = map.h, W = TW * 32, H = TH * 32, N = W * H;
  const tiles = new Uint8Array(TW * TH);
  let hasWater = false, hasSand = false;
  for (let ty = 0; ty < TH; ty++) {
    const row = map.tiles[ty] || '';
    for (let tx = 0; tx < TW; tx++) {
      const k = CODES.indexOf(row[tx]);
      const t = k < 0 ? GR : k;
      tiles[ty * TW + tx] = t;
      if (t === WA) hasWater = true;
      if (t === SA) hasSand = true;
    }
  }
  const at = (tx, ty) => tiles[(ty < 0 ? 0 : ty >= TH ? TH - 1 : ty) * TW + (tx < 0 ? 0 : tx >= TW ? TW - 1 : tx)];
  const NB = [[-1, 0, 1], [1, 0, 2], [0, -1, 4], [0, 1, 8], [-1, -1, 16], [1, -1, 32], [-1, 1, 64], [1, 1, 128]];
  const edge = new Uint8Array(TW * TH), diffMask = new Uint8Array(TW * TH), hardMask = new Uint8Array(TW * TH), grassMask = new Uint8Array(TW * TH);
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    const k = ty * TW + tx, t = tiles[k];
    for (const [dx, dy, bit] of NB) {
      const nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue;
      const n = tiles[ny * TW + nx];
      if (n !== t) { diffMask[k] |= bit; if (SOFT[t] && SOFT[n]) edge[k] = 1; }
      if (HARD[n]) hardMask[k] |= bit;
      if (n === GR || n === GM) grassMask[k] |= bit;
    }
  }

  // 1) 재질 지도: 부드러운 재질끼리는 경계를 잡음으로 비튼다
  let anyEdge = false;
  for (let k = 0; k < TW * TH; k++) if (edge[k]) { anyEdge = true; break; }
  const HW = (W >> 1) + 1, HH = (H >> 1) + 1;
  let WX = null, WY = null;
  if (anyEdge) {
    WX = new Float32Array(HW * HH); WY = new Float32Array(HW * HH);
    addNoise(WX, HW, HH, 9, 9, 101, 1); addNoise(WX, HW, HH, 3.5, 3.5, 102, 0.5);
    addNoise(WY, HW, HH, 9, 9, 103, 1); addNoise(WY, HW, HH, 3.5, 3.5, 104, 0.5);
  }
  const mat = new Uint8Array(N);
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    const k = ty * TW + tx, t = tiles[k];
    for (let ly = 0; ly < 32; ly++) {
      const y = ty * 32 + ly, row = y * W;
      if (!edge[k]) { mat.fill(t, row + tx * 32, row + tx * 32 + 32); continue; }
      for (let lx = 0; lx < 32; lx++) {
        const x = tx * 32 + lx, i = row + x, hk = (y >> 1) * HW + (x >> 1);
        let wx = (x + (WX[hk] - 0.75) * 20) | 0, wy = (y + (WY[hk] - 0.75) * 20) | 0;
        wx = wx < 0 ? 0 : wx >= W ? W - 1 : wx; wy = wy < 0 ? 0 : wy >= H ? H - 1 : wy;
        const t2 = tiles[(wy >> 5) * TW + (wx >> 5)];
        mat[i] = SOFT[t2] ? t2 : t;
      }
    }
  }

  // 2) 무늬용 잡음(휘게 한 버퍼를 다시 쓴다)
  WX = WY = null;
  const F1 = new Float32Array(N), F2 = new Float32Array(N);
  addNoise(F1, W, H, 120, 120, 201, 0.58); addNoise(F1, W, H, 40, 40, 202, 0.42);
  addNoise(F2, W, H, 9, 9, 211, 0.62); addNoise(F2, W, H, 4, 4, 212, 0.38);
  const N1 = F1, N2 = F2;
  let N3 = null;
  if (hasWater || hasSand) { N3 = new Float32Array(N); addNoise(N3, W, H, 28, 6, 221, 0.65); addNoise(N3, W, H, 11, 3, 222, 0.35); }
  let DWL = null, DLW = null;
  if (hasWater) {
    const sL = new Uint8Array(N), sW = new Uint8Array(N);
    for (let i = 0; i < N; i++) { if (mat[i] === WA) sW[i] = 1; else sL[i] = 1; }
    let tx0 = TW, ty0 = TH, tx1 = -1, ty1 = -1;
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) if (tiles[ty * TW + tx] === WA) { tx0 = Math.min(tx0, tx); tx1 = Math.max(tx1, tx); ty0 = Math.min(ty0, ty); ty1 = Math.max(ty1, ty); }
    const bx0 = Math.max(0, tx0 - 2) * 32, by0 = Math.max(0, ty0 - 2) * 32, bx1 = Math.min(TW, tx1 + 3) * 32, by1 = Math.min(TH, ty1 + 3) * 32;
    DWL = chamfer(sL, W, H, 40, bx0, by0, bx1, by1);
    DLW = chamfer(sW, W, H, 12, bx0, by0, bx1, by1);
  }
  // 햇빛 얼룩(아주 큰 무늬)은 따로 한 겹
  const NL = new Float32Array(N); addNoise(NL, W, H, 170, 150, 231, 1);
  const matAt = (x, y) => mat[(y < 0 ? 0 : y >= H ? H - 1 : y) * W + (x < 0 ? 0 : x >= W ? W - 1 : x)];
  const isGrass = (m) => m === GR || m === GM;

  const BLG = bladeTile(3, 25), BLM = bladeTile(4, 26);
  let hasP = false, hasM = false;
  for (let k = 0; k < TW * TH; k++) { if (tiles[k] === PL) hasP = true; if (tiles[k] === MK) hasM = true; }
  const VP = hasP ? cobbleTable(W, H, 11, 17, 1.25, 9, 4, 51) : null, VM = hasM ? cobbleTable(W, H, 8, 11, 1.15, 6, 4, 61) : null;
  const img = new ImageData(W, H), a = img.data;
  let r = 0, g = 0, b = 0;

  for (let y = 0; y < H; y++) {
    const ty = y >> 5, ly = y & 31;
    for (let x = 0; x < W; x++) {
      const tx = x >> 5, lx = x & 31, i = y * W + x, m = mat[i], tk = ty * TW + tx, t = tiles[tk];
      const n1 = N1[i], n2 = N2[i], hh = hash(x, y, 7), gr = (hh & 255) / 255, bz = BAYER[((y & 3) << 2) | (x & 3)];
      let outdoor = true;
      switch (m) {
        case GR: case GM: case FB: {
          if (m === FB) {
            // 꽃밭 흙: 기름진 흙 위에 꽃이 촘촘하다
            let v = 0.45 + (n2 - 0.5) * 0.6 + (gr - 0.5) * 0.3;
            const ci = Math.round(v * 4 + (bz - 0.5)); const c = SOIL[ci < 0 ? 0 : ci > 4 ? 4 : ci];
            r = c[0]; g = c[1]; b = c[2];
            const cx = (x / 5) | 0, cy = (y / 5) | 0, hc = hash(cx, cy, 33);
            if ((hc & 255) < 150) {
              const fx = cx * 5 + 1 + ((hc >>> 8) % 3), fy = cy * 5 + 1 + ((hc >>> 10) % 3), dx = x - fx, dy = y - fy;
              const fc = FLOWER[(hc >>> 13) % 6];
              if (dx === 0 && dy === 0) { r = 250; g = 214; b = 90; }
              else if (Math.abs(dx) + Math.abs(dy) === 1) { r = fc[0]; g = fc[1]; b = fc[2]; if (dy === 1 || dx === 1) { r *= 0.82; g *= 0.82; b *= 0.86; } }
              else if (Math.abs(dx) <= 1 && dy === 2) { r = 46; g = 92; b = 44; }
            }
            break;
          }
          const iu = y > 1 && x > 1 ? i - 2 * W - 2 : i, id = y < H - 2 && x < W - 2 ? i + 2 * W + 2 : i;
          const emb = N2[iu] - N2[id];
          const bl = (m === GM ? BLM : BLG)[(y & 255) * BTW + (x % BTW)];
          let v = 0.5 + (n2 - 0.5) * 0.5 + emb * 1.1 + bl * 0.58 + (n1 - 0.5) * 0.75;
          if (diffMask[tk]) {
            // 흙·돌바닥과 맞닿은 풀 가장자리는 살짝 어둡게, 돌 연석이 드리우는 그림자
            const hm = hardMask[tk];
            if (hm) {
              if ((hm & 4) && ly < 4) v -= (4 - ly) * 0.07;
              if ((hm & 1) && lx < 4) v -= (4 - lx) * 0.06;
              if ((hm & 16) && lx < 4 && ly < 4) v -= 0.12;
            }
            if (!isGrass(matAt(x, y - 2)) || !isGrass(matAt(x - 2, y)) || !isGrass(matAt(x + 2, y)) || !isGrass(matAt(x, y + 2))) v -= 0.12;
          }
          if (DLW) { const dw = DLW[i] * 0.2; if (dw < 4) v -= (4 - dw) * 0.06; }
          const P = m === GM ? MEADOW : GRASS;
          let ci = Math.round(v * 6 + (bz * 0.45 + gr * 0.55 - 0.5) * 0.9); ci = ci < 0 ? 0 : ci > 6 ? 6 : ci;
          const c = P[ci]; r = c[0]; g = c[1]; b = c[2];
          { const dry = (n1 - 0.5) * 0.6 + (NL[i] - 0.5) * 0.5; r += dry * 34; g += dry * 10; b -= dry * 12; }
          if (DLW) { const dw = DLW[i] * 0.2; if (dw < 2.5) { const k = (2.5 - dw) / 2.5 * 0.55; r += (74 - r) * k; g += (70 - g) * k; b += (48 - b) * k; } }
          // 들꽃
          const fs = m === GM ? 5 : 7, cx = (x / fs) | 0, cy = (y / fs) | 0, hc = hash(cx, cy, 31);
          if ((hc & 1023) < (m === GM ? 150 : 14)) {
            const fx = cx * fs + 1 + ((hc >>> 10) % (fs - 2)), fy = cy * fs + 1 + ((hc >>> 14) % (fs - 2)), dx = x - fx, dy = y - fy;
            const fc = FLOWER[m === GM ? (hc >>> 18) % 5 : (hc >>> 18) % 2 ? 0 : 1];
            if (m === GM || (hc >>> 20) & 1) {
              if (dx === 0 && dy === 0) { r = 248; g = 216; b = 96; }
              else if (Math.abs(dx) + Math.abs(dy) === 1) { r = fc[0]; g = fc[1]; b = fc[2]; if (dy === 1 || dx === 1) { r *= 0.84; g *= 0.84; b *= 0.88; } }
              else if (dx === 1 && dy === 2) { r *= 0.7; g *= 0.72; b *= 0.8; }
            } else if (dx === 0 && dy === 0) { r = fc[0]; g = fc[1]; b = fc[2]; }
          }
          break;
        }
        case PD: {
          const iu = y > 1 && x > 1 ? i - 2 * W - 2 : i, id = y < H - 2 && x < W - 2 ? i + 2 * W + 2 : i;
          const emb = N2[iu] - N2[id];
          let v = 0.52 + (n2 - 0.5) * 0.5 + (n1 - 0.5) * 0.55 + (gr - 0.5) * 0.16 + emb * 0.9;
          if (diffMask[tk]) {
            if (isGrass(matAt(x, y - 2)) || isGrass(matAt(x - 2, y))) v -= 0.2;
            else if (isGrass(matAt(x, y - 4)) || isGrass(matAt(x - 4, y)) || isGrass(matAt(x + 3, y)) || isGrass(matAt(x, y + 3))) v -= 0.09;
          }
          if (DLW) { const dw = DLW[i] * 0.2; if (dw < 5) v -= (5 - dw) * 0.05; }
          let ci = Math.round(v * 6 + (bz * 0.4 + gr * 0.6 - 0.5) * 1.0); ci = ci < 0 ? 0 : ci > 6 ? 6 : ci;
          const c = DIRT[ci]; r = c[0]; g = c[1]; b = c[2];
          // 자갈
          const cx = (x / 6) | 0, cy = (y / 6) | 0, hc = hash(cx, cy, 41);
          if ((hc & 255) < 34) {
            const px = cx * 6 + 1 + ((hc >>> 8) % 3), py = cy * 6 + 1 + ((hc >>> 11) % 3), dx = x - px, dy = y - py;
            const big = (hc >>> 14) & 1;
            if (dx >= 0 && dy >= 0 && dx <= big + 1 && dy <= 1) {
              const s = dx + dy === 0 ? 1.18 : dx === big + 1 && dy === 1 ? 0.8 : 1.0, pc = (hc >>> 16) & 1 ? [168, 160, 146] : [150, 128, 104];
              r = pc[0] * s; g = pc[1] * s; b = pc[2] * s;
            } else if ((dx === big + 2 && dy === 1) || (dy === 2 && dx >= 1 && dx <= big + 2)) { r *= 0.8; g *= 0.78; b *= 0.8; }
          }
          break;
        }
        case PL: {
          const dm = diffMask[tk];
          const d = dm ? edgeDist(dm, lx, ly) : 99;
          if (d <= 4) {
            const dl = dm & 1 ? lx : 99, dr = dm & 2 ? 31 - lx : 99, dt = dm & 4 ? ly : 99, db = dm & 8 ? 31 - ly : 99;
            const horiz = Math.min(dt, db) <= Math.min(dl, dr);
            const along = horiz ? x : y, lit = horiz ? (dt <= db) : (dl <= dr);
            if (d === 0) { r = 70; g = 64; b = 58; }
            else if (d === 4) { r = 92; g = 86; b = 76; }
            else {
              const sp = (along + 5) % 14, seg = Math.floor((along + 5) / 14);
              if (sp === 0) { r = 96; g = 90; b = 80; }
              else {
                let s = 0.93 + rnd(seg, horiz ? ty : tx, 55) * 0.12 + (n2 - 0.5) * 0.08 + (gr - 0.5) * 0.05;
                if (lit) s += d === 1 ? 0.1 : d === 3 ? -0.05 : 0; else s += d === 1 ? -0.16 : d === 2 ? -0.07 : 0.04;
                if (sp === 1) s += 0.06; if (sp === 13) s -= 0.08;
                s -= Math.max(0, n1 - 0.62) * 0.4;
                r = 194 * s; g = 184 * s; b = 162 * s;
              }
            }
            break;
          }
          voro(x + 0.5, y + 0.5, VP);
          const e = vE + (n2 - 0.5) * 1.3 + (gr - 0.5) * 0.5;
          if (e < 1.05) {
            const k = e < 0.4 ? 0.74 : 0.88;
            r = 94 * k; g = 88 * k; b = 76 * k;
            const moss = n1 - 0.6;
            if (moss > 0) { const q = Math.min(1, moss * 7); r += (70 - r) * q * 0.7; g += (96 - g) * q * 0.7; b += (48 - b) * q * 0.7; }
            break;
          }
          const base = STONE[vId % 8];
          const dx = x + 0.5 - vCx, dy = (y + 0.5 - vCy) * 1.25, dl2 = Math.sqrt(dx * dx + dy * dy) || 1;
          const lit = -(dx * 0.72 + dy * 0.7) / dl2;
          const w = e < 3.4 ? 1 - (e - 1.05) / 2.35 : 0;
          let s = 0.92 + ((vId >>> 16) & 255) / 255 * 0.15 + w * lit * 0.2 - w * 0.06 - vD * 0.007 + (n2 - 0.5) * 0.1 + (gr - 0.5) * 0.07;
          if (e < 1.9) s += lit > 0.3 ? 0.1 : lit < -0.3 ? -0.15 : -0.03;
          s -= Math.max(0, n1 - 0.6) * 0.5;
          s = Math.round((s + (bz - 0.5) * 0.05) / 0.05) * 0.05;
          r = base[0] * s; g = base[1] * s; b = base[2] * s;
          break;
        }
        case MK: {
          const dm = diffMask[tk], d = dm ? edgeDist(dm, lx, ly) : 99;
          voro(x + 0.5, y + 0.5, VM);
          const e = vE + (n2 - 0.5) * 1.5 + (gr - 0.5) * 0.6;
          if (e < 1.3) {
            const k = e < 0.6 ? 0.72 : 0.9;
            r = 60 * k; g = 50 * k; b = 44 * k;
          } else {
            const base = MARKET[vId % 6];
            const dx = x + 0.5 - vCx, dy = (y + 0.5 - vCy) * 1.15, dl2 = Math.sqrt(dx * dx + dy * dy) || 1;
            const lit = -(dx * 0.72 + dy * 0.7) / dl2;
            const w = e < 3 ? 1 - (e - 1.3) / 1.7 : 0;
            let s = 0.88 + ((vId >>> 16) & 255) / 255 * 0.18 + w * lit * 0.22 - w * 0.08 + (1 - Math.min(1, vD / 5)) * 0.06 + (n2 - 0.5) * 0.12 + (gr - 0.5) * 0.08;
            s -= Math.max(0, n1 - 0.52) * 0.6;
            s = Math.round((s + (bz - 0.5) * 0.06) / 0.06) * 0.06;
            r = base[0] * s; g = base[1] * s; b = base[2] * s;
          }
          if (d <= 1) { r *= 0.72; g *= 0.7; b *= 0.7; }
          break;
        }
        case CN: {
          const sy = y >> 5, ox = (sy & 1) * 16, sx = (x + ox) >> 5, slx = (x + ox) & 31;
          const dm = diffMask[tk], d = dm ? edgeDist(dm, lx, ly) : 99;
          let s = 0.95 + rnd(sx, sy, 71) * 0.09 + (n2 - 0.5) * 0.1 + (gr - 0.5) * 0.08;
          s -= Math.max(0, n1 - 0.58) * 0.5;
          const hs = hash(sx, sy, 73);
          r = 152 * s; g = 152 * s; b = 146 * s;
          if (hh % 53 === 0) { r *= 0.8; g *= 0.8; b *= 0.8; } else if (hh % 61 === 0) { r *= 1.12; g *= 1.12; b *= 1.1; }
          if (n1 > 0.6) { const q = Math.min(1, (n1 - 0.6) * 4) * 0.18; r += (110 - r) * q; g += (96 - g) * q; b += (78 - b) * q; }
          if (Math.abs(n2 - 0.5) < 0.011 && (hs & 3) === 0) { r *= 0.62; g *= 0.62; b *= 0.62; }
          if (slx === 0 || ly === 0) { r = 100; g = 102; b = 100; }
          else if (slx === 1 || ly === 1) { r = Math.min(255, r * 1.1); g = Math.min(255, g * 1.1); b = Math.min(255, b * 1.08); }
          else if (slx === 31 || ly === 31) { r *= 0.9; g *= 0.9; b *= 0.9; }
          if (hs % 23 === 0 && slx >= 9 && slx <= 22 && ly >= 12 && ly <= 19) {
            if (slx === 9 || slx === 22 || ly === 12 || ly === 19) { r = 88; g = 90; b = 90; }
            else if (slx & 1) { r = 30; g = 34; b = 36; } else { r = 104; g = 106; b = 106; }
          }
          if (d === 0) { r *= 0.78; g *= 0.78; b *= 0.78; } else if (d === 1) { r *= 1.08; g *= 1.08; b *= 1.06; }
          break;
        }
        case DK: {
          const lr = at(tx - 1, ty), rr = at(tx + 1, ty), up = at(tx, ty - 1), dn = at(tx, ty + 1);
          const vertPier = lr !== DK && rr !== DK && (up === DK || dn === DK);
          const planksH = vertPier || !(up !== DK && dn !== DK && (lr === DK || rr === DK));
          const across = planksH ? y : x, along = planksH ? x : y;
          const pl = across >> 3, la = across & 7;
          const off = hash(pl, 0, 62) & 63, jp = (along + off) & 63;
          if (dn === WA && ly >= 27 && planksH) {
            // 부두 앞면 들보
            const q = ly - 27;
            const s = q === 0 ? 1.12 : q === 4 ? 0.6 : 0.78 + (rnd(x >> 2, 0, 63) - 0.5) * 0.08;
            r = 118 * s; g = 82 * s; b = 52 * s;
            break;
          }
          if (la === 7) { r = 28; g = 44; b = 50; if ((hh & 31) === 0) { r = 70; g = 104; b = 110; } break; }
          const base = WOOD[hash(pl, (along + off) >> 6, 64) % 5];
          let s = 0.96 + (rnd(pl, (along + off) >> 2, 65) - 0.5) * 0.1 + (rnd(pl * 7 + la, along >> 3, 66) - 0.5) * 0.08 + (n1 - 0.5) * 0.18;
          if (la === 0) s += 0.1; else if (la === 6) s -= 0.14;
          if (jp === 0) s = 0.55; else if (jp === 1) s += 0.08;
          r = base[0] * s; g = base[1] * s; b = base[2] * s;
          if ((jp === 3 || jp === 60) && (la === 2 || la === 4)) { r = 62; g = 58; b = 56; if (la === 2) { r = 150; g = 146; b = 140; } }
          if (!planksH || !vertPier) {
            if ((lr === WA && lx < 2) || (rr === WA && lx > 29)) { r *= 0.68; g *= 0.66; b *= 0.64; }
          }
          break;
        }
        case FL: {
          outdoor = false;
          const row = y >> 3, la = y & 7, off = hash(row, 0, 81) & 63, jp = (x + off) % 72;
          if (la === 7) { r = 108; g = 70; b = 44; break; }
          const base = FLOOR[hash(row, Math.floor((x + off) / 72), 82) % 5];
          let s = 0.97 + (rnd(row, (x + off) >> 3, 83) - 0.5) * 0.08 + (rnd(row * 5 + la, x >> 4, 84) - 0.5) * 0.06;
          if (la === 0) s += 0.07; else if (la === 6) s -= 0.08;
          if (jp === 0) s = 0.66;
          if ((hash(x >> 2, row, 85) & 255) < 3) s -= 0.12;
          r = base[0] * s; g = base[1] * s; b = base[2] * s;
          break;
        }
        case WA: {
          const dl = DWL[i] * 0.2, hm = hardMask[tk], up = at(tx, ty - 1);
          if (HARD[up] && ly < 7 && ty > 0) {
            if (up === DK) {
              if (ly < 4) { const s = ly === 0 ? 1.1 : ly === 3 ? 0.6 : 0.8; r = 104 * s; g = 72 * s; b = 46 * s; }
              else { r = 22; g = 50; b = 60; }
            } else {
              // 부두 석벽 앞면
              const row = ly < 3 ? 0 : 1, bx = (x + row * 6) % 12;
              let s = 0.86 - ly * 0.05 + (rnd((x + row * 6) / 12 | 0, ty * 2 + row, 91) - 0.5) * 0.1;
              if (bx === 0 || ly === 3) s = 0.5;
              if (ly === 6) { r = 44; g = 62; b = 58; } else { r = 150 * s; g = 146 * s; b = 136 * s; }
            }
            break;
          }
          let t2 = dl / 30; t2 = t2 > 1 ? 1 : t2; t2 = t2 * t2 * (3 - 2 * t2);
          const nr = N3[i];
          if (t2 < 0.5) { const q = t2 * 2; r = SHAL[0] + (MID[0] - SHAL[0]) * q; g = SHAL[1] + (MID[1] - SHAL[1]) * q; b = SHAL[2] + (MID[2] - SHAL[2]) * q; }
          else { const q = (t2 - 0.5) * 2; r = MID[0] + (DEEP[0] - MID[0]) * q; g = MID[1] + (DEEP[1] - MID[1]) * q; b = MID[2] + (DEEP[2] - MID[2]) * q; }
          let s = 1 + (nr - 0.5) * 0.26 + (n2 - 0.5) * 0.06 + (n1 - 0.5) * 0.1;
          if (nr > 0.7) s += 0.08;
          s = Math.round((s + (bz - 0.5) * 0.04) / 0.04) * 0.04;
          r *= s; g *= s; b *= s;
          // 부두 기둥
          if (up === DK && ty > 0 && ly < 14 && ((lx >= 3 && lx <= 5) || (lx >= 26 && lx <= 28))) {
            const e = lx === 3 || lx === 26 ? 1.15 : lx === 5 || lx === 28 ? 0.7 : 0.9;
            r = 86 * e; g = 62 * e; b = 44 * e;
            if (ly > 10) { r = r * 0.6 + 30; g = g * 0.6 + 50; b = b * 0.6 + 56; }
            break;
          }
          const dh = hm ? edgeDist(hm, lx, ly) : 99;
          let sh = 0;
          if (HARD[up] && ty > 0 && ly < 18) sh = Math.max(sh, (18 - ly) / 11 * 0.5);
          if ((hm & 1) && lx < 7) sh = Math.max(sh, (7 - lx) / 7 * 0.35);
          if ((hm & 2) && lx > 29) sh = Math.max(sh, 0.18);
          if ((hm & 8) && ly > 29) sh = Math.max(sh, 0.2);
          if (dh < dl + 1.5 && dh < 3) sh = Math.max(sh, 0.25);
          if (HARD[up] && ty > 0 && ly === 8 && (hh & 3)) { r = r * 0.6 + 70; g = g * 0.6 + 90; b = b * 0.6 + 90; }
          if (sh > 0) { r *= 1 - sh; g *= 1 - sh * 0.85; b *= 1 - sh * 0.7; }
          if (!(dh < dl + 1.5)) {
            // 부드러운 물가: 흙 둑·거품
            const land = y > 2 ? mat[i - 3 * W] : WA;
            if (dl < 2.6 && land !== WA && land !== SA && SOFT[land]) { r = 74; g = 64; b = 44; if (dl < 1.3) { r = 62; g = 54; b = 38; } break; }
            let f = 0;
            if (dl < 1.4) f = gr < 0.3 ? 0.35 : 0.72 + (n2 - 0.5) * 0.3;
            else if (dl < 3.4) f = 0.16 + (n2 > 0.55 ? 0.16 : 0) + (gr > 0.85 ? 0.2 : 0);
            else { const wv = 6 + (n2 - 0.5) * 5; if (Math.abs(dl - wv) < 0.8 && n1 > 0.42) f = 0.38; }
            if (f > 0) { r += (FOAM[0] - r) * f; g += (FOAM[1] - g) * f; b += (FOAM[2] - b) * f; }
          }
          if (t2 > 0.25 && ((rnd(x >> 2, y, 87) < 0.004 && (x & 3) !== 3) || (Math.abs(nr - 0.74) < 0.01 && (hh & 1)))) { r = r * 0.3 + 170; g = g * 0.3 + 190; b = b * 0.3 + 186; }
          break;
        }
        case SA: {
          let v = 0.55 + (n2 - 0.5) * 0.35 + (n1 - 0.5) * 0.4 + (gr - 0.5) * 0.24 + (N3[i] - 0.5) * 0.22;
          let ci = Math.round(v * 5 + (bz * 0.4 + gr * 0.6 - 0.5) * 1.0); ci = ci < 0 ? 0 : ci > 5 ? 5 : ci;
          const c = SAND[ci]; r = c[0]; g = c[1]; b = c[2];
          if (hh % 1400 === 0) { r = 240; g = 226; b = 216; }
          else if (hh % 997 === 1) { r *= 0.8; g *= 0.78; b *= 0.76; }
          if (DLW) {
            const dw = DLW[i] * 0.2;
            if (dw < 7) { const k = (7 - dw) / 7; r *= 1 - k * 0.3; g *= 1 - k * 0.26; b *= 1 - k * 0.18; }
            if (dw < 1.3 && gr > 0.3) { r = r * 0.4 + 140; g = g * 0.4 + 146; b = b * 0.4 + 138; }
          }
          break;
        }
        case FA: {
          const wob = (n2 - 0.5) * 3.2 + (n1 - 0.5) * 2;
          let fy = (y + wob) % 8; if (fy < 0) fy += 8;
          const p = fy / 8, hgt = Math.cos((p - 0.4) * Math.PI * 2), slope = -Math.sin((p - 0.4) * Math.PI * 2);
          let v = 0.44 + hgt * 0.22 + slope * 0.12 + (gr - 0.5) * 0.22 + (n1 - 0.5) * 0.3;
          if (diffMask[tk] && (matAt(x, y - 2) !== FA || matAt(x - 2, y) !== FA || matAt(x + 2, y) !== FA || matAt(x, y + 2) !== FA)) v -= 0.12;
          let ci = Math.round(v * 5 + (bz - 0.5) * 1.0); ci = ci < 0 ? 0 : ci > 5 ? 5 : ci;
          const c = FARM[ci]; r = c[0]; g = c[1]; b = c[2];
          if (hgt > 0.6 && (hh & 63) === 0) { r += 30; g += 24; b += 16; }
          break;
        }
        case TE: {
          outdoor = false;
          const dm = diffMask[tk], d = dm ? edgeDist(dm, lx, ly) : 99;
          const ph = hash(tx, ty, 95);
          let s = 0.94 + ((lx + ly) / 64) * 0.06 + (ph & 15) / 15 * 0.04 + (n2 - 0.5) * 0.03 + (gr - 0.5) * 0.02;
          r = 194 * s; g = 202 * s; b = 212 * s;
          if (lx === 0 || ly === 0) {
            const gl = 0.55 + 0.45 * Math.sin((x + y) * 0.045 + (ph & 7));
            r = 70 + 50 * gl; g = 170 + 70 * gl; b = 190 + 60 * gl;
          } else if (lx === 1 || ly === 1 || lx === 31 || ly === 31) {
            if (lx === 31 || ly === 31) { r *= 0.8; g *= 0.82; b *= 0.86; } else { r = Math.min(255, r * 1.08); g = Math.min(255, g * 1.08); b = Math.min(255, b * 1.06); }
          } else if (lx === 2 || ly === 2) { r = r * 0.8 + 20; g = g * 0.8 + 50; b = b * 0.8 + 52; }
          if (ph % 5 === 0) { const dd = Math.hypot(lx - 15.5, ly - 15.5); if (dd > 5 && dd < 7) { r *= 0.72; g *= 0.74; b *= 0.8; } else if (dd <= 5 && ((lx + ly) & 1)) { r *= 0.84; g *= 0.86; b *= 0.9; } }
          if ((lx === 4 || lx === 27) && (ly === 4 || ly === 27)) { r *= 0.7; g *= 0.72; b *= 0.76; }
          if (d === 0) { r *= 0.7; g *= 0.72; b *= 0.76; }
          break;
        }
        default: { r = 255; g = 0; b = 255; }
      }
      if (outdoor) {
        const lt = 0.94 + (NL[i] - 0.5) * 0.2;
        r *= lt * 1.01; g *= lt; b *= lt * 0.97;
      }
      const q = i * 4;
      a[q] = r; a[q + 1] = g; a[q + 2] = b; a[q + 3] = 255;
    }
  }

  // 3) 풀 덤불: 풀과 다른 바닥의 경계를 덮는다
  const put = (x, y, c, k = 1) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const q = (y * W + x) * 4;
    if (k >= 1) { a[q] = c[0]; a[q + 1] = c[1]; a[q + 2] = c[2]; }
    else { a[q] += (c[0] - a[q]) * k; a[q + 1] += (c[1] - a[q + 1]) * k; a[q + 2] += (c[2] - a[q + 2]) * k; }
  };
  const dim = (x, y, k) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const q = (y * W + x) * 4; a[q] *= k; a[q + 1] *= k; a[q + 2] *= k * 1.04; };
  const tuft = (bx, by, seed, P, big) => {
    const n = 3 + (seed % 3) + (big ? 2 : 0);
    for (let k = -1; k <= n; k++) dim(bx - 1 + k, by + 1, 0.78);
    for (let k = 0; k < n; k++) {
      const hs = hash(seed, k, 131), hb = (big ? 4 : 3) + (hs % (big ? 4 : 3)), lean = ((hs >>> 4) % 3) - 1;
      const ox = k - (n >> 1) + (((hs >>> 8) & 1) ? 0 : 0);
      for (let s = 0; s < hb; s++) {
        const px = bx + ox + Math.round((lean * s * s) / (hb * hb) * 2), py = by - s;
        const ci = Math.min(P.length - 1, 1 + Math.floor((s / hb) * (P.length - 2)) + ((hs >>> 12) & 1));
        put(px, py, P[ci]);
      }
    }
  };
  const TUFTABLE = new Uint8Array([0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0]);
  const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    const t = tiles[ty * TW + tx];
    if (t !== GR && t !== GM) {
      if (t === PD && (hash(tx, ty, 140) & 3) === 0) {
        const hx = hash(tx, ty, 141);
        tuft(tx * 32 + 6 + (hx % 20), ty * 32 + 8 + ((hx >>> 8) % 18), hx, GRASS.slice(1, 6), false);
      }
      continue;
    }
    const P = t === GM ? MEADOW : GRASS;
    // 풀밭 안쪽의 작은 덤불
    const hi = hash(tx, ty, 150), cnt = 1 + (hi % 3);
    for (let k = 0; k < cnt; k++) {
      const hk = hash(tx, ty, 151 + k), px = tx * 32 + 3 + (hk % 26), py = ty * 32 + 6 + ((hk >>> 8) % 24);
      if (isGrass(matAt(px, py)) && isGrass(matAt(px, py + 3)) && isGrass(matAt(px - 3, py)) && isGrass(matAt(px + 3, py))) tuft(px, py, hk, P.slice(0, 6), (hk >>> 20) % 4 === 0);
    }
    for (let dd = 0; dd < 4; dd++) {
      const [dx, dy] = DIRS[dd], nx = tx + dx, ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue;
      const n = tiles[ny * TW + nx];
      if (!TUFTABLE[n]) continue;
      const count = 3 + (hash(tx, ty, 160 + dd) % 3);
      for (let k = 0; k < count; k++) {
        const hk = hash(tx * 4 + dd, ty, 170 + k), along = 2 + (hk % 28);
        const ex = dx === 0 ? tx * 32 + along : dx > 0 ? tx * 32 + 32 : tx * 32;
        const ey = dy === 0 ? ty * 32 + along : dy > 0 ? ty * 32 + 32 : ty * 32;
        let fx = -1, fy = -1;
        for (let s = -12; s <= 12; s++) {
          const px = ex + dx * s, py = ey + dy * s;
          if (isGrass(matAt(px - dx, py - dy)) && !isGrass(matAt(px, py))) { fx = px; fy = py; break; }
        }
        if (fx < 0) continue;
        const into = 1 + ((hk >>> 8) % 3);
        const bx = dx ? fx + dx * (into - 1) : fx, by = dy > 0 ? fy + into : dy < 0 ? fy + 2 : fy + ((hk >>> 12) % 3);
        tuft(bx, by, hk, P.slice(0, 6), (hk >>> 16) % 3 === 0);
      }
    }
  }

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}
