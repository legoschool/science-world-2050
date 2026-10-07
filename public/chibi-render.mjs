// 치비(2등신) 아바타 렌더러. avatar-render.mjs와 같은 이름으로 내보내므로 import 경로만 바꿔 쓸 수 있다.
// 아바타 숫자(shared/avatar.mjs)는 그대로 두고, 그림은 모두 코드로 만든다(그림 파일 없음).
//
// 그리는 방식
//  - 머리: 머리통·귀·코·머리카락 껍질·긴 머리 커튼·후드를 타원체로 두고, 화소마다 광선을 쏘아 가장 앞의 면을 고른다.
//    머리카락은 가마(whorl)를 중심으로 한 결 좌표로 덩어리·결 선·끝 뾰족함·천사 고리(비등방 반사)를 만든다.
//  - 몸: 도형(타원·다각형·캡슐·곡선 덩어리)을 채우고 모양에서 법선을 어림해 5단 명암을 준다.
//  - 윤곽: 부위마다 번호를 두고, 뒤에 있는 부위와 맞닿은 앞 부위 가장자리에만 선을 긋는다.
//    같은 재질끼리는 옅은 선, 다른 재질과는 진한 선, 바깥 실루엣은 가장 진한 색(같은 색 계열)으로 긋는다.
//
// 프레임 48×72, 발 접점 (24, 69). 시트는 가로 9칸 × 세로 4줄.
//  줄: 0 아래(앞) · 1 왼쪽 · 2 오른쪽 · 3 위(뒤)
//  칸: 0~3 걷기(0·2는 선 자세, 1·3은 한 발 내딛기) · 4~5 손 흔들기 · 6~7 만세 · 8 앉기 (감정 표현은 0줄 앞모습)
//  1줄 4~7칸에는 방향별 숨 고르기 프레임(BREATH)을 둔다. 나머지 빈 칸은 앞모습 감정 표현을 복사해 둔다.
import { SKIN, HAIR, CLOTH, sanitizeAvatar, avatarKey } from './vendor/shared/avatar.mjs';

export const FW = 48;
export const FH = 72;
export const ANCHOR = { x: 24, y: 69 };
export const COLS = 9;
export const ROW_OF = { down: 0, left: 1, right: 2, up: 3 };
export const COL = { walk: 0, wave: 4, cheer: 6, sit: 8 };
export const BREATH = { down: { col: 4, row: 1 }, left: { col: 5, row: 1 }, right: { col: 6, row: 1 }, up: { col: 7, row: 1 } };

// 피부 0번은 브릭 그림의 노란색 대신 밝은 살구색으로 해석한다(나머지는 팔레트 그대로).
export const SKIN_TONES = ['#ffdfc0', ...SKIN.slice(1)];

// ---------------------------------------------------------------- 색
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const lumOf = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
const clampc = (v) => v.map((x) => Math.max(0, Math.min(255, Math.round(x))));
const WARM = [255, 247, 226];

// 한 색에서 7단 색 계열을 만든다: 0 반짝 · 1 밝음 · 2 바탕 · 3 그늘 · 4 깊은 그늘 · 5 선 · 6 실루엣
// HSL에서 밝은 쪽은 노란 쪽으로, 그늘은 보라(피부는 붉은) 쪽으로 색상을 돌려 도트 그림 느낌을 낸다.
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [240, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const toward = (h, target, amt) => { let d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); };
function makeRamp(col, kind = 'cloth') {
  const c = typeof col === 'string' ? hex(col) : col;
  let [h, s, l] = rgb2hsl(c);
  let C = (1 - Math.abs(2 * l - 1)) * s; // 채도 대신 색 농도(chroma)를 유지하며 밝기를 바꾼다
  const grey = C < 0.06;
  if (grey) h = 235;
  const skin = kind === 'skin';
  const L = Math.max(l, kind === 'hair' ? 0.24 : 0.2);
  const cool = skin ? 352 : 262, warm = 48;
  // [색상 이동, 농도 배율, 회색일 때 더할 농도, 밝기]
  const spec = [
    [toward(h, warm, 10), 0.8, 0.0, L + (1 - L) * (L > 0.85 ? 0.75 : 0.5)],
    [toward(h, warm, 5), 0.95, 0.0, L + (1 - L) * (L > 0.85 ? 0.45 : 0.22)],
    [h, 1, 0, L],
    [toward(h, cool, skin ? 8 : 12), 1.1, 0.05, L * (skin ? 0.88 : 0.79)],
    [toward(h, cool, skin ? 14 : 20), 1.15, 0.07, L * (skin ? 0.76 : 0.61)],
    [toward(h, cool, 26), 1.0, 0.08, L * (skin ? 0.52 : 0.4)],
    [toward(h, cool, 30), 0.8, 0.07, L * (skin ? 0.36 : 0.24)],
  ];
  return spec.map(([hh, k, add, ll]) => {
    const boost = ll > L ? Math.min(2.4, (ll / L) ** 0.85) : 1;
    const cc = C * k * boost * (kind === 'hair' ? 1.15 : 1) + (grey ? add : 0), den = 1 - Math.abs(2 * ll - 1);
    return clampc(hsl2rgb(hh, den > 0.001 ? Math.min(1, cc / den) : 0, ll));
  });
}
const flatRamp = (...cols) => cols.map((c) => hex(c));

const FIX = {
  white: flatRamp('#ffffff', '#fbfaf7', '#eeebf3', '#d4cce0', '#b4a8c8', '#6e5e82', '#3a2c48'),
  lash: flatRamp('#9a6a70', '#7a4c56', '#5a3242', '#442432', '#341a26', '#26121c', '#180a12'),
  mouth: makeRamp('#b8404e'),
  tongue: makeRamp('#f7909c'),
  shoe: makeRamp('#8a5a40'),
  gold: makeRamp('#efbe48'),
  red: makeRamp('#e2404c'),
  lens: makeRamp('#3c3a5c'),
  goggle: makeRamp('#2fa6aa'),
  glass: makeRamp('#cdeeff'),
  frame: makeRamp('#6a4430'),
  cream: makeRamp('#fff3da'),
  pink: makeRamp('#ffb0c4'),
  sock: makeRamp('#f7f3ec'),
  metal: makeRamp('#bfc3cf'),
  tie: makeRamp('#3a3242'),
  band: makeRamp('#7a5436'),
  collar: makeRamp('#dfeaff'),
  saek: ['#e8453c', '#f7c534', '#3aa04b', '#2e6bd0', '#f28bbd'].map((c) => makeRamp(c)),
};

function irisColor(av) {
  let c = mixc(hex(HAIR[av.hairColor]), [70, 38, 44], 0.38);
  if (lumOf(c) > 0.42) c = mulc(c, 0.72);
  return clampc(c);
}

function palette(av) {
  const list = [null];
  const add = (r) => { list.push(r); return list.length - 1; };
  const P = { list };
  const skin = makeRamp(SKIN_TONES[av.skin], 'skin');
  P.skin = add(skin);
  P.blush = add(skin.map((c, i) => clampc(mixc(c, [255, 96, 120], i < 3 ? 0.3 : 0.18))));
  P.stub = add(skin.map((c) => clampc(mixc(c, [92, 84, 108], 0.2))));
  P.hair = add(makeRamp(HAIR[av.hairColor], 'hair'));
  P.iris = add(makeRamp(irisColor(av)));
  P.top = add(makeRamp(CLOTH[av.topColor]));
  P.top2 = add(makeRamp(CLOTH[av.top2Color]));
  P.bot = add(makeRamp(CLOTH[av.bottomColor]));
  P.glove = av.gloves ? add(makeRamp(CLOTH[av.gloves - 1])) : P.skin;
  P.hat = add(makeRamp(CLOTH[av.hatColor]));
  P.back = add(makeRamp(CLOTH[av.backColor]));
  for (const [k, r] of Object.entries(FIX)) P[k] = k === 'saek' ? r.map(add) : add(r);
  return P;
}

// ---------------------------------------------------------------- 빛과 명암 단계
const LX = -0.4, LY = -0.56, LZ = 0.725; // 왼쪽 위 앞에서 오는 빛
const HX = -0.215, HY = -0.302, HZ = 0.929; // 빛과 시선의 중간 방향(머리카락 반사)
const quant = (s) => (s > 0.95 ? 0 : s > 0.8 ? 1 : s > 0.52 ? 2 : s > 0.26 ? 3 : 4);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
const G = { SKIN: 1, HAIR: 2, TOP: 3, BOT: 4, SHOE: 5, HAND: 6, HAT: 7, ACC: 8, BAG: 9, FEAT: 10, HOOD: 11 };

// ---------------------------------------------------------------- 도형 채우기(화소 중심 표본)
const POOL = new Map(); // 크기별 빈 버퍼(한 프레임이 끝나면 돌려받는다)
class Mask {
  constructor(sc) {
    const n = sc.W * sc.H, pool = POOL.get(n);
    this.sc = sc; this.d = pool && pool.length ? pool.pop() : new Uint8Array(n);
    this.i0 = 1e9; this.j0 = 1e9; this.i1 = -1; this.j1 = -1;
    sc.masks.push(this);
  }
  grow(i0, j0, i1, j1) { if (i0 < this.i0) this.i0 = i0; if (j0 < this.j0) this.j0 = j0; if (i1 > this.i1) this.i1 = i1; if (j1 > this.j1) this.j1 = j1; }
  fill(minX, minY, maxX, maxY, test, v = 1) {
    const { W, H, S, ox, oy } = this.sc, d = this.d;
    const i0 = Math.max(0, Math.floor((minX - ox) * S)), i1 = Math.min(W - 1, Math.ceil((maxX - ox) * S));
    const j0 = Math.max(0, Math.floor((minY - oy) * S)), j1 = Math.min(H - 1, Math.ceil((maxY - oy) * S));
    let any = false;
    for (let j = j0; j <= j1; j++) {
      const sy = oy + (j + 0.5) / S;
      for (let i = i0; i <= i1; i++) if (test(ox + (i + 0.5) / S, sy)) { d[j * W + i] = v; any = true; }
    }
    if (v && any) this.grow(i0, j0, i1, j1);
    return this;
  }
  ell(cx, cy, rx, ry, v = 1) { return this.fill(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, v); }
  rect(x, y, w, h, v = 1) { return this.fill(x, y, x + w, y + h, (sx, sy) => sx >= x && sx < x + w && sy >= y && sy < y + h, v); }
  poly(pts, v = 1) {
    let a = 1e9, b = 1e9, c = -1e9, e = -1e9;
    for (const [x, y] of pts) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > e) e = y; }
    const n = pts.length;
    return this.fill(a, b, c, e, (sx, sy) => {
      let inside = false;
      for (let p = 0, q = n - 1; p < n; q = p++) {
        const xa = pts[p][0], ya = pts[p][1], xb = pts[q][0], yb = pts[q][1];
        if ((ya > sy) !== (yb > sy) && sx < ((xb - xa) * (sy - ya)) / (yb - ya) + xa) inside = !inside;
      }
      return inside;
    }, v);
  }
  cap(ax, ay, bx, by, ra, rb = ra, v = 1) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-6, rm = Math.max(ra, rb);
    return this.fill(Math.min(ax, bx) - rm, Math.min(ay, by) - rm, Math.max(ax, bx) + rm, Math.max(ay, by) + rm, (x, y) => {
      let t = ((x - ax) * dx + (y - ay) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = ax + dx * t - x, ey = ay + dy * t - y, r = ra + (rb - ra) * t;
      return ex * ex + ey * ey <= r * r;
    }, v);
  }
  // 이차 곡선 뼈대를 따라 가늘어지는 덩어리(머리카락 가닥·꼬리)
  bez(p0, p1, p2, w0, w1 = 0, v = 1, n = 12, pw = 0.8) {
    const L = [], R = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      const x = a * p0[0] + b * p1[0] + c * p2[0], y = a * p0[1] + b * p1[1] + c * p2[1];
      let tx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), ty = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const w = w0 * Math.pow(1 - t, pw) + w1 * t;
      L.push([x - ty * w, y + tx * w]); R.push([x + ty * w, y - tx * w]);
    }
    return this.poly([...L, ...R.reverse()], v);
  }
  or(m) { const d = this.d, e = m.d; for (let k = 0; k < d.length; k++) if (e[k]) d[k] = 1; if (m.i1 >= 0) this.grow(m.i0, m.j0, m.i1, m.j1); return this; }
  and(m) { const d = this.d, e = m.d; for (let k = 0; k < d.length; k++) if (d[k] && !e[k]) d[k] = 0; return this; }
  minus(m) { const d = this.d, e = m.d; for (let k = 0; k < d.length; k++) if (e[k]) d[k] = 0; return this; }
  clone() { const m = new Mask(this.sc); m.d.set(this.d); m.i0 = this.i0; m.j0 = this.j0; m.i1 = this.i1; m.j1 = this.j1; return m; }
  set(p) { this.d[p] = 1; const W = this.sc.W, i = p % W, j = (p - i) / W; this.grow(i, j, i, j); }
  count() { let n = 0; for (const v of this.d) n += v; return n; }
}

// ---------------------------------------------------------------- 장면(부위별 색 계열·명암·번호)
class Scene {
  constructor(W, H, S, ox, oy, P) {
    this.W = W; this.H = H; this.S = S; this.ox = ox; this.oy = oy; this.P = P;
    const n = W * H;
    this.ramp = new Uint8Array(n); this.tone = new Int8Array(n); this.pid = new Uint16Array(n);
    this.parts = [{ grp: 0, line: 0 }];
    this.masks = [];
  }
  mask() { return new Mask(this); }
  dispose() {
    const n = this.W * this.H;
    let pool = POOL.get(n);
    if (!pool) { pool = []; POOL.set(n, pool); }
    for (const m of this.masks) { m.d.fill(0); if (pool.length < 400) pool.push(m.d); }
    this.masks = [];
  }
  part(grp, line, merge = 0) { this.parts.push({ grp, line, merge }); return this.parts.length - 1; }
  // o.n: 법선 어림({m:'blob'} 모양 기준 · {m:'sph',cx,cy,rx,ry} 공 · {m:'flat'})
  // o.bias: 밝기 보정 · o.tone: 고정 단계 · o.tones: 화소별 단계 · o.fn(t,sx,sy,p): 단계 고치기 · o.line: 0 없음 1 옅게만 2 보통
  paint(m, ramp, grp, o = {}) {
    const { W, S, ox, oy } = this;
    const id = this.part(grp, o.line ?? 2, o.merge || 0);
    if (m.i1 < m.i0) return id;
    const { i0, j0, i1, j1 } = m, d = m.d, bw = i1 - i0 + 1, bh = j1 - j0 + 1;
    const n = o.n || BLOB;
    let U = null, V = null;
    if (n.m === 'blob' && o.tone == null && !o.tones) {
      U = new Float32Array(bw * bh); V = new Float32Array(bw * bh);
      const k = (n.soft ?? 4) * S;
      for (let j = j0; j <= j1; j++) {
        let i = i0;
        while (i <= i1) {
          if (!d[j * W + i]) { i++; continue; }
          const a = i; while (i <= i1 && d[j * W + i]) i++;
          const len = i - 1 - a, f = Math.min(1, len / k);
          for (let x = a; x < i; x++) U[(j - j0) * bw + x - i0] = len ? ((2 * (x - a)) / len - 1) * f : 0;
        }
      }
      for (let i = i0; i <= i1; i++) {
        let j = j0;
        while (j <= j1) {
          if (!d[j * W + i]) { j++; continue; }
          const a = j; while (j <= j1 && d[j * W + i]) j++;
          const len = j - 1 - a, f = Math.min(1, len / k);
          for (let y = a; y < j; y++) V[(y - j0) * bw + i - i0] = len ? ((2 * (y - a)) / len - 1) * f : 0;
        }
      }
    }
    const ax = n.ax ?? 0.85, ay = n.ay ?? 0.6, fl = n.flat ?? 1, bias = o.bias || 0;
    const tmin = o.tmin ?? 0, tmax = o.tmax ?? 4, ramps = o.ramps;
    for (let j = j0; j <= j1; j++) {
      const sy = oy + (j + 0.5) / S;
      for (let i = i0; i <= i1; i++) {
        const p = j * W + i;
        if (!d[p]) continue;
        const sx = ox + (i + 0.5) / S;
        let t;
        if (o.tone != null) t = o.tone;
        else if (o.tones) t = o.tones[p];
        else {
          let nx = 0, ny = 0;
          if (U) {
            let u = U[(j - j0) * bw + i - i0], v = V[(j - j0) * bw + i - i0];
            if (fl !== 1) { u = Math.sign(u) * Math.abs(u) ** fl; v = Math.sign(v) * Math.abs(v) ** fl; }
            nx = u * ax; ny = v * ay;
          } else if (n.m === 'sph') {
            let u = (sx - n.cx) / n.rx, v = (sy - n.cy) / n.ry; const r2 = u * u + v * v;
            if (r2 > 1) { const r = Math.sqrt(r2); u /= r; v /= r; }
            nx = u * (n.k ?? 0.95); ny = v * (n.k ?? 0.95);
          }
          const nz = Math.sqrt(Math.max(0.06, 1 - nx * nx - ny * ny)), inv = 1 / Math.hypot(nx, ny, nz);
          t = quant((nx * LX + ny * LY + nz * LZ) * inv + bias);
        }
        if (o.fn) t = o.fn(t, sx, sy, p);
        t = t < tmin ? tmin : t > tmax ? tmax : t;
        this.ramp[p] = ramps ? ramps[p] || ramp : ramp; this.tone[p] = t; this.pid[p] = id;
      }
    }
    return id;
  }
  // 이미 칠한 화소의 색 계열만 바꾼다(명암·번호 유지): 줄무늬·배 무늬 등
  recolor(m, ramp, pred, tone) {
    const { W, S, ox, oy } = this, d = m.d;
    for (let j = Math.max(0, m.j0); j <= m.j1; j++) for (let i = Math.max(0, m.i0); i <= m.i1; i++) {
      const p = j * W + i;
      if (!d[p] || !this.ramp[p]) continue;
      if (pred && !pred(ox + (i + 0.5) / S, oy + (j + 0.5) / S)) continue;
      this.ramp[p] = ramp; if (tone != null) this.tone[p] = typeof tone === 'function' ? tone(this.tone[p]) : tone;
    }
  }
  // 칠한 화소의 명암 단계를 바꾼다(그림자·박음질 선)
  retone(m, f, grps) {
    const { W } = this, d = m.d;
    for (let j = Math.max(0, m.j0); j <= m.j1; j++) for (let i = Math.max(0, m.i0); i <= m.i1; i++) {
      const p = j * W + i;
      if (!d[p] || !this.ramp[p]) continue;
      if (grps && !grps.includes(this.parts[this.pid[p]].grp)) continue;
      this.tone[p] = typeof f === 'function' ? f(this.tone[p]) : Math.min(4, Math.max(0, this.tone[p] + f));
    }
  }
  // 가리는 부위(occ)를 (dx,dy)만큼 밀어 그 아래 보이는 화소를 어둡게 한다
  shadow(occ, dx, dy, dt, grps) {
    const { W, H, S } = this, d = occ.d, mx = Math.round(dx * S), my = Math.round(dy * S), hit = [];
    for (let j = occ.j0; j <= occ.j1; j++) for (let i = occ.i0; i <= occ.i1; i++) {
      if (!d[j * W + i]) continue;
      const x = i + mx, y = j + my;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const q = y * W + x;
      if (d[q] || !this.ramp[q]) continue;
      if (grps && !grps.includes(this.parts[this.pid[q]].grp)) continue;
      hit.push(q);
    }
    for (const q of hit) this.tone[q] = Math.min(4, this.tone[q] + dt);
  }
  // 글자판(한 글자 = 도트 1칸)을 찍는다. key: 글자 → [색 계열, 단계]
  stamp(x0, y0, rows, key, grp = G.FEAT, line = 0) {
    const id = this.part(grp, line), { W, H, S, ox, oy } = this;
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const k = key[row[c]];
        if (!k) continue;
        const a = Math.round((x0 + c - ox) * S), b = Math.round((y0 + r - oy) * S), e = Math.round((x0 + c + 1 - ox) * S), f = Math.round((y0 + r + 1 - oy) * S);
        for (let y = Math.max(0, b); y < Math.min(H, f); y++) for (let x = Math.max(0, a); x < Math.min(W, e); x++) {
          const p = y * W + x; this.ramp[p] = k[0]; this.tone[p] = k[1]; this.pid[p] = id;
        }
      }
    });
    return id;
  }
  // 윤곽선을 정하고 색을 칠해 RGBA 버퍼에 옮긴다
  resolve(out, outW, offX, offY) {
    const { W, H, ramp, tone, pid, parts } = this, R = this.P.list;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const p = j * W + i, r = ramp[p];
      if (!r) continue;
      let t = tone[p];
      const me = pid[p], meta = parts[me];
      if (meta.line) {
        let st = 0;
        for (let k = 0; k < 4; k++) {
          const x = k === 0 ? i - 1 : k === 1 ? i + 1 : i, y = k === 2 ? j - 1 : k === 3 ? j + 1 : j;
          if (x < 0 || y < 0 || x >= W || y >= H || !ramp[y * W + x]) { st = Math.max(st, k === 0 || k === 2 ? 3 : 4); continue; }
          const o = pid[y * W + x];
          if (o !== me && o < me && !(meta.merge && parts[o].merge === meta.merge)) st = Math.max(st, parts[o].grp === meta.grp ? 1 : 2);
        }
        if (meta.line === 1 && st === 2) st = 1;
        if (st === 1) t = t < 4 ? 4 : 5;
        else if (st === 2) t = 5;
        else if (st === 3) t = Math.max(t, 5); // 빛 쪽(왼·위) 실루엣은 한 단계 밝게
        else if (st === 4) t = 6;
      }
      const c = R[r][t], q = ((offY + j) * outW + offX + i) * 4;
      out[q] = c[0]; out[q + 1] = c[1]; out[q + 2] = c[2]; out[q + 3] = 255;
    }
  }
}
const BLOB = { m: 'blob' };

// ---------------------------------------------------------------- 머리(광선 투사)
// 머리 중심 기준 3D 좌표: x 오른쪽(앞모습 화면 기준), y 아래, z 보는 사람 쪽(얼굴이 향하는 쪽)
const HEAD = { a: 13.2, b: 12.6, c: 12 };
const SKULL = [
  { c: [0, 0, 0], r: [13.2, 12.6, 12], k: 0 },
  { c: [0, 4.6, 0.8], r: [11.3, 8.6, 10.8], k: 0 },
  { c: [12.3, 3.9, -0.9], r: [1.9, 3.0, 2.4], k: 1 },
  { c: [-12.3, 3.9, -0.9], r: [1.9, 3.0, 2.4], k: 1 },
  { c: [0, 6.7, 11.0], r: [0.9, 1.0, 1.3], k: 2 },
];
const VIEWS = {
  down: { b: (X, Y) => [X, Y, 0], d: [0, 0, 1], n: (n) => [n[0], n[1], n[2]], X: (p) => p[0], D: (p) => p[2] },
  up: { b: (X, Y) => [-X, Y, 0], d: [0, 0, -1], n: (n) => [-n[0], n[1], -n[2]], X: (p) => -p[0], D: (p) => -p[2] },
  left: { b: (X, Y) => [0, Y, -X], d: [1, 0, 0], n: (n) => [-n[2], n[1], n[0]], X: (p) => -p[2], D: (p) => p[0] },
  right: { b: (X, Y) => [0, Y, X], d: [-1, 0, 0], n: (n) => [n[2], n[1], -n[0]], X: (p) => p[2], D: (p) => -p[0] },
};
function hitE(b, d, c, r) {
  let A = 0, B = 0, C = -1;
  for (let k = 0; k < 3; k++) { const o = (b[k] - c[k]) / r[k], dd = d[k] / r[k]; A += dd * dd; B += 2 * o * dd; C += o * o; }
  const D = B * B - 4 * A * C;
  if (D < 0) return null;
  const s = Math.sqrt(D);
  return [(-B + s) / (2 * A), (-B - s) / (2 * A)];
}
const nrm3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };

// 각도 표(α: 얼굴 정면 0°, 앞모습 화면 오른쪽 +)로 머리카락 아래 끝 높이를 정한다
const pw = (tab) => (a) => {
  if (a <= tab[0][0]) return tab[0][1];
  for (let k = 1; k < tab.length; k++) if (a <= tab[k][0]) { const [a0, y0] = tab[k - 1], [a1, y1] = tab[k]; return y0 + ((y1 - y0) * (a - a0)) / (a1 - a0); }
  return tab[tab.length - 1][1];
};
const sym = (tab) => pw([...tab.slice().reverse().map(([a, y]) => [-a, y]), ...tab.filter(([a]) => a > 0)]);

// 뾰족 가닥: 껍질 위 (방위각, 올려본각)에서 바깥·위로 뻗는다
function spike(az, el, len, w, sh, bend = 0) {
  const ar = (az * Math.PI) / 180, er = (el * Math.PI) / 180;
  const u = [Math.sin(ar) * Math.cos(er), -Math.sin(er), Math.cos(ar) * Math.cos(er)];
  const rr = [HEAD.a + sh[0], HEAD.b + sh[1], HEAD.c + sh[2]];
  const root = [u[0] * rr[0] * 0.86, sh[3] + u[1] * rr[1] * 0.86, sh[4] + u[2] * rr[2] * 0.86];
  const dir = nrm3(u[0], u[1] - 0.55, u[2]);
  const tip = [root[0] + dir[0] * len, root[1] + dir[1] * len, root[2] + dir[2] * len];
  const ctrl = [(root[0] + tip[0]) / 2 + bend * dir[2], (root[1] + tip[1]) / 2 - Math.abs(bend) * 0.3, (root[2] + tip[2]) / 2 - bend * dir[0]];
  return [root, ctrl, tip, w];
}

// 머리 모양 10가지(LABELS.hair 순서). sh: 껍질 [폭+, 높이+, 깊이+, 중심y, 중심z] · w: 가마 방향 · n: 덩어리 수
// tip: 끝 뾰족함 · jag: 덩어리 길이 흩어짐 · edge(α): 껍질 머리카락의 아래 끝 · cur: 아래로 늘어지는 머리(단발·긴 머리)
const HAIRS = [
  null, // 0 민머리
  { // 1 짧은 머리(엘엠): 머리통에 붙고 왼쪽 앞머리가 솟았다가 오른쪽으로 쓸려 내려온다
    sh: [1.4, 1.6, 1.4, -0.7, -0.3], w: [-0.5, -0.82, 0.28], n: 15, tip: 2.2, jag: 0.5, rib: 0.3,
    edge: pw([[-180, 8.5], [-140, 7], [-100, 1.4], [-82, 3.4], [-68, 1], [-50, -3.4], [-25, -4.2], [0, -2.6], [25, -1.2], [45, 0.2], [62, 1.5], [78, 3.8], [100, 1.4], [140, 7], [180, 8.5]]),
    clumps: [[[-5, -10.5, 8], [-6.5, -16.5, 8], [-0.5, -17.8, 5], 3.1], [[-0.5, -11.8, 8.5], [1.5, -16.2, 6.5], [6.2, -15.6, 4], 2.6], [[4, -11.5, 8], [7.5, -14, 6], [10.5, -12, 4], 2.2]],
  },
  { // 2 쓸어넘김: 이마를 드러내고 뒤로 넘긴다
    sh: [1.2, 2.2, 2.4, -1.2, -0.9], w: [0, 0.3, -0.95], n: 16, tip: 0.8, jag: 0.2, rib: 0.26,
    edge: sym([[0, -7.4], [25, -7.0], [45, -5.6], [60, -3.2], [72, 2.4], [84, 1.0], [100, 1.0], [140, 7.5], [180, 9]]),
    clumps: [[[0, -13.5, -3], [2, -16, -8], [5, -15, -12], 2.6]],
  },
  { // 3 단발: 옆으로 쓸린 앞머리 + 끝이 바깥으로 뻗친 단발
    sh: [1.8, 1.8, 1.9, -0.8, -0.2], w: [-0.4, -0.88, 0.25], n: 18, tip: 1.8, jag: 0.35, rib: 0.3,
    edge: pw([[-180, 4], [-60, 4], [-50, -3.6], [-24, -2.8], [0, -1.8], [22, -0.4], [40, 1.2], [50, 2.6], [58, 4], [180, 4]]),
    cur: { fl: 0.13, n: 22, tip: 1.7, jag: 0.5, edge: sym([[0, -99], [45, -99], [49, 2], [60, 6.5], [74, 10], [90, 10.4], [180, 10.2]]) },
    clumps: [[[15.2, 7.6, 1], [16.9, 10.4, 1.2], [18.5, 9.9, 1.2], 1.9], [[-15.2, 7.6, 1], [-16.9, 10.4, 1.2], [-18.5, 9.9, 1.2], 1.9],
      [[9.5, 8.2, -12.2], [10.8, 10.8, -13.8], [12.2, 10.3, -15], 1.8], [[-9.5, 8.2, -12.2], [-10.8, 10.8, -13.8], [-12.2, 10.3, -15], 1.8]],
  },
  { // 4 긴 머리
    sh: [1.5, 1.5, 1.6, -0.6, -0.2], w: [0, -0.98, 0.18], n: 16, tip: 2.8, jag: 0.5, rib: 0.3,
    edge: sym([[0, -1.0], [38, -0.8], [48, 1.8], [56, 4], [180, 4]]),
    cur: { fl: 0.09, n: 24, tip: 2.4, jag: 0.8, edge: sym([[0, -99], [46, -99], [50, 19], [62, 25], [90, 27], [180, 29]]) },
  },
  { // 5 뾰족 머리
    sh: [0.8, 0.9, 0.9, -0.5, -0.2], w: [0, -1, -0.1], n: 10, tip: 3.8, jag: 0.8, rib: 0.34,
    edge: sym([[0, -1.0], [40, -1.6], [58, 1.0], [72, 3.0], [90, 1.0], [130, 5.5], [180, 7.5]]),
    spikes: [[0, 62, 7.5, 3.4], [42, 50, 7, 3.3], [-42, 50, 7, 3.3], [95, 30, 6.5, 3.1], [-95, 30, 6.5, 3.1], [145, 40, 7, 3.3], [-145, 40, 7, 3.3], [180, 55, 6.5, 3.2], [20, 30, 5, 2.8], [-20, 30, 5, 2.8]],
  },
  { // 6 텁수룩 옆머리
    sh: [2.0, 1.9, 2.0, -0.5, -0.3], w: [0.15, -1, 0.05], n: 11, tip: 3.4, jag: 1.6, rib: 0.34,
    edge: sym([[0, 0.2], [30, -0.4], [50, 3.4], [72, 7.6], [95, 9.4], [140, 10.6], [180, 11.2]]),
    clumps: [[[14.2, 2, 2], [16.4, 6.5, 2], [16.6, 10.8, 2.5], 2.3], [[-14.2, 2, 2], [-16.4, 6.5, 2], [-16.6, 10.8, 2.5], 2.3],
      [[12, 3, -8], [14.6, 7, -9.5], [14.4, 12, -10], 2.2], [[-12, 3, -8], [-14.6, 7, -9.5], [-14.4, 12, -10], 2.2],
      [[-3.5, -9.5, 11.5], [-5, -5, 13.4], [-4.6, 0.8, 13], 2.1], [[5, -9, 11], [7, -4, 12.6], [7.4, 1.6, 12], 2.0],
      [[1, -14, -2], [3.5, -17.5, -5], [6.5, -16.5, -9], 2.4], [[-3, -14, -4], [-6, -17, -7], [-9, -15, -9], 2.2]],
  },
  { // 7 결 올림머리(컴지): 오른쪽 위로 솟은 볼륨, 이마 왼쪽이 조금 드러난다
    sh: [1.4, 3.0, 2.0, -2.0, -0.4], w: [0.15, -0.3, -0.94], n: 14, tip: 0.8, jag: 0.3, rib: 0.3,
    edge: pw([[-180, 8.5], [-140, 7.2], [-100, 0.8], [-82, 2.2], [-66, 0.2], [-45, -3.4], [-18, -4.4], [0, -4.8], [20, -4.2], [42, -3.0], [64, 0.2], [80, 2.4], [100, 0.8], [140, 7.2], [180, 8.5]]),
    clumps: [[[-7, -12, 6], [-6.5, -17.5, 4.5], [-1.5, -19.8, 1], 3.3], [[-2, -13, 7], [0, -18.5, 4], [5, -19.8, 0], 3.3],
      [[3, -13, 6.5], [6.5, -17.8, 3], [10.5, -17.6, -1], 3.1], [[8, -11, 5], [11.2, -14.6, 2], [14.6, -13.8, -2], 2.7],
      [[4.5, -10.5, 10], [6.5, -6.5, 12], [6.8, -3.2, 12], 1.9]],
  },
  { // 8 앞머리 단발(달새): 둥근 단발 + 일자 앞머리
    sh: [2.2, 2.1, 2.3, -1.0, -0.2], w: [0, -1, 0.05], n: 22, tip: 1.0, jag: 0.2, rib: 0.28,
    edge: sym([[0, -0.3], [40, -0.3], [52, 0.8], [58, 4], [180, 4]]),
    cur: { fl: 0.1, round: 3.2, n: 26, tip: 1.1, jag: 0.45, edge: sym([[0, -99], [48, -99], [52, 3], [62, 7], [76, 9.3], [90, 9.6], [180, 9.8]]) },
  },
  { // 9 짧은 옆가르마(선생님): 단정한 윗머리 + 왼쪽 가르마 + 오른쪽으로 빗은 결
    sh: [0.9, 1.1, 1.0, -0.4, 0], w: [-0.62, -0.76, 0.18], n: 15, tip: 0.8, jag: 0.15, rib: 0.24, part: [-4.5, -9.5, 7.5],
    edge: pw([[-180, 8], [-140, 6.5], [-100, 1.4], [-82, 2.8], [-70, 1.0], [-50, -3.2], [-30, -4.6], [-10, -4.0], [15, -2.8], [40, -1.4], [60, 0.2], [74, 2.6], [100, 1.4], [140, 6.5], [180, 8]]),
  },
];
// 가마 기준 좌표축 미리 계산
HAIRS.forEach((st, idx) => {
  if (!st) return;
  st.idx = idx;
  st.W = nrm3(...st.w);
  const up = Math.abs(st.W[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
  const e1 = nrm3(up[1] * st.W[2] - up[2] * st.W[1], up[2] * st.W[0] - up[0] * st.W[2], up[0] * st.W[1] - up[1] * st.W[0]);
  st.e1 = e1;
  st.e2 = [st.W[1] * e1[2] - st.W[2] * e1[1], st.W[2] * e1[0] - st.W[0] * e1[2], st.W[0] * e1[1] - st.W[1] * e1[0]];
  st.R = [HEAD.a + st.sh[0], HEAD.b + st.sh[1], HEAD.c + st.sh[2]];
  st.C = [0, st.sh[3], st.sh[4]];
  if (st.spikes) st.clumps = (st.clumps || []).concat(st.spikes.map(([az, el, len, w]) => spike(az, el, len, w, st.sh, az > 0 ? 0.6 : -0.6)));
  if (st.cur) st.cur.maxY = Math.max(...[0, 45, 60, 90, 120, 150, 180].map((a) => st.cur.edge(a)));
  if (st.part) { const q = nrm3(st.part[0] / st.R[0], (st.part[1] - st.C[1]) / st.R[1], (st.part[2] - st.C[2]) / st.R[2]); st.partTheta = Math.atan2(dot(q, st.e2), dot(q, st.e1)); st.partAng = Math.acos(dot(q, st.W)); }
});
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

// 껍질 위 한 점의 머리카락 정보: 덮이는지, 덩어리 안 위치 u, 가마에서 떨어진 각
function shellInfo(st, p, out) {
  const R = st.R, C = st.C;
  const q = nrm3(p[0] / R[0], (p[1] - C[1]) / R[1], (p[2] - C[2]) / R[2]);
  const cw = dot(q, st.W), ang = Math.acos(Math.max(-1, Math.min(1, cw)));
  const th = Math.atan2(dot(q, st.e2), dot(q, st.e1));
  const c = (th / (2 * Math.PI)) * st.n + 100, ci = Math.floor(c), u = c - ci;
  const al = (Math.atan2(p[0], p[2]) * 180) / Math.PI;
  const edge = st.edge(al) + hash(ci + st.idx * 31) * st.jag;
  out.ok = p[1] < edge - st.tip * Math.abs(2 * u - 1);
  out.u = u; out.ang = ang; out.q = q; out.th = th; out.edgeGap = edge - p[1];
  return out;
}
function curtainInfo(st, p, out) {
  const cu = st.cur;
  const al = (Math.atan2(p[0], p[2] - st.C[2]) * 180) / Math.PI;
  const c = ((al + 180) / 360) * cu.n + 100, ci = Math.floor(c), u = c - ci;
  const edge = cu.edge(al) + hash(ci * 7 + st.idx * 13) * cu.jag;
  out.ok = p[1] >= st.C[1] - 0.5 && p[1] < edge - cu.tip * Math.abs(2 * u - 1);
  out.u = u; out.al = al; out.edgeGap = edge - p[1];
  return out;
}
function curtainRadius(st, y) {
  const cu = st.cur, dy = Math.max(0, y - st.C[1]);
  let k = cu.fl * dy;
  if (cu.round) { const r0 = cu.maxY - cu.round; if (y > r0) k -= ((y - r0) / cu.round) ** 2 * 2.2; }
  return [st.R[0] + k, st.R[2] + k];
}

// 후드(호랑이 옷): 얼굴 둘레가 트인 큰 껍질 + 둥근 귀
const HOOD = { c: [0, -1.2, -0.8], r: [16.6, 16.0, 15.2] };
const HOOD_EARS = [{ c: [10.6, -14.4, -0.4], r: [4.7, 4.5, 3.2] }, { c: [-10.6, -14.4, -0.4], r: [4.7, 4.5, 3.2] }];
// 호랑이 줄무늬: 이마 셋(테두리에서 위로 가늘게) · 옆·뒤 아래쪽에서 위로 · 뒤통수 위에서 아래로
function hoodStripe(al, y) {
  const a = Math.abs(al), dist = (c) => Math.abs(((al - c + 540) % 360) - 180);
  // 이마: 테두리에서 위로 뾰족해지는 세 줄
  if (a < 40) return y < -7.2 && y > -13.8 && [-22, 0, 22].some((c) => dist(c) < (6.5 * (y + 13.8)) / 6.6);
  // 옆·뒤: 아래 끝에서 올라오는 줄과 정수리에서 내려오는 줄이 엇갈린다
  const up = (c) => dist(c) < (12 * (y - 1)) / 11.5 || dist(-c) < (12 * (y - 1)) / 11.5;
  const dn = (c) => dist(c) < (11 * (-3 - y)) / 12.5 || dist(-c) < (11 * (-3 - y)) / 12.5;
  if (y > 1 && [68, 124, 180].some(up)) return true;
  if (y < -3 && y > -15.5 && a > 70 && [96, 152].some(dn)) return true;
  return false;
}
const hoodOpen = (al, y) => Math.abs(al) < 54 && y > -5.8 && y < 14;

const C_SKIN = 1, C_HAIR = 2, C_HAIRF = 3, C_CUR = 4, C_CURF = 5, C_HOOD = 6, C_HOODF = 7;

// 머리 한 장면: 화소마다 가장 앞의 면을 골라 부류·명암·색 계열을 정한다
let headCache = null;
function castHead(sc, P, av, view, hc) {
  const ck = headCache && sc.S === 1 ? `${view}|${hc.x}|${hc.y}` : null;
  if (ck && headCache.has(ck)) return headCache.get(ck);
  const H = castHeadRaw(sc, P, av, view, hc);
  if (ck) headCache.set(ck, H);
  return H;
}
function castHeadRaw(sc, P, av, view, hc) {
  const V = VIEWS[view], st = HAIRS[av.hair];
  const hooded = av.top === 3 && av.hat === 0;
  const { W, H, S, ox, oy } = sc;
  const n = W * H;
  const cls = new Uint8Array(n), T = new Int8Array(n), RM = new Uint8Array(n);
  const x0 = hc.x - 24, x1 = hc.x + 24, y0 = hc.y - 22, y1 = hc.y + (st && st.cur ? st.cur.maxY + 3 : 16);
  const i0 = Math.max(0, Math.floor((x0 - ox) * S)), i1 = Math.min(W - 1, Math.ceil((x1 - ox) * S));
  const j0 = Math.max(0, Math.floor((y0 - oy) * S)), j1 = Math.min(H - 1, Math.ceil((y1 - oy) * S));
  const d = V.d, info = {}, cinfo = {};
  const nv = (nl) => V.n(nl);
  for (let j = j0; j <= j1; j++) {
    const Y = oy + (j + 0.5) / S - hc.y;
    for (let i = i0; i <= i1; i++) {
      const X = ox + (i + 0.5) / S - hc.x;
      const b = V.b(X, Y);
      let best = -1e9, bc = 0, bp = null, bn = null, bk = 0, bu = 0, bang = 0, bq = null, bgap = 9, bth = 0;
      // 피부
      for (const e of SKULL) {
        const h = hitE(b, d, e.c, e.r);
        if (h && h[0] > best) {
          best = h[0]; bc = C_SKIN; bk = e.k;
          bp = [b[0] + d[0] * h[0], b[1] + d[1] * h[0], b[2] + d[2] * h[0]];
          bn = nrm3((bp[0] - e.c[0]) / (e.r[0] * e.r[0]), (bp[1] - e.c[1]) / (e.r[1] * e.r[1]), (bp[2] - e.c[2]) / (e.r[2] * e.r[2]));
        }
      }
      if (st) {
        const h = hitE(b, d, st.C, st.R);
        if (h) {
          for (let f = 0; f < 2; f++) {
            const t = h[f];
            if (t <= best) continue;
            const p = [b[0] + d[0] * t, b[1] + d[1] * t, b[2] + d[2] * t];
            if (st.cur && p[1] > st.C[1] + 1.5 && Math.abs(Math.atan2(p[0], p[2]) * 57.3) > 45) continue;
            shellInfo(st, p, info);
            if (!info.ok) continue;
            best = t; bc = f ? C_HAIRF : C_HAIR; bp = p; bu = info.u; bang = info.ang; bq = info.q; bgap = info.edgeGap; bth = info.th;
            bn = nrm3((p[0] - st.C[0]) / (st.R[0] * st.R[0]), (p[1] - st.C[1]) / (st.R[1] * st.R[1]), (p[2] - st.C[2]) / (st.R[2] * st.R[2]));
            break;
          }
        }
        if (st.cur && Y >= st.C[1] - 0.5 && Y <= st.cur.maxY + 1) {
          let [rx, rz] = curtainRadius(st, Y);
          if (hooded) { rx = Math.min(rx, HOOD.r[0] - 2.2); rz = Math.min(rz, HOOD.r[2] - 2.2); }
          const o0 = b[0] / rx, d0 = d[0] / rx, o2 = (b[2] - st.C[2]) / rz, d2 = d[2] / rz;
          const A = d0 * d0 + d2 * d2, B = 2 * (o0 * d0 + o2 * d2), C = o0 * o0 + o2 * o2 - 1, D = B * B - 4 * A * C;
          if (D >= 0) {
            const s = Math.sqrt(D);
            for (let f = 0; f < 2; f++) {
              const t = (-B + (f ? -s : s)) / (2 * A);
              if (t <= best) continue;
              const p = [b[0] + d[0] * t, Y, b[2] + d[2] * t];
              curtainInfo(st, p, cinfo);
              if (!cinfo.ok) continue;
              best = t; bc = f ? C_CURF : C_CUR; bp = p; bu = cinfo.u; bgap = cinfo.edgeGap;
              bn = nrm3(p[0] / (rx * rx), 0, (p[2] - st.C[2]) / (rz * rz));
              break;
            }
          }
        }
      }
      if (hooded) {
        const hh = hitE(b, d, HOOD.c, HOOD.r);
        if (hh) {
          for (let f = 0; f < 2; f++) {
            const t = hh[f];
            if (t <= best) continue;
            const p = [b[0] + d[0] * t, b[1] + d[1] * t, b[2] + d[2] * t];
            const al = (Math.atan2(p[0], p[2]) * 180) / Math.PI;
            if (p[1] > 12.5 || hoodOpen(al, p[1])) continue;
            best = t; bc = f ? C_HOODF : C_HOOD; bp = p; bk = 0;
            bn = nrm3((p[0] - HOOD.c[0]) / (HOOD.r[0] ** 2), (p[1] - HOOD.c[1]) / (HOOD.r[1] ** 2), (p[2] - HOOD.c[2]) / (HOOD.r[2] ** 2));
            break;
          }
        }
        for (const e of HOOD_EARS) {
          const h = hitE(b, d, e.c, e.r);
          if (h && h[0] > best) {
            best = h[0]; bc = C_HOOD; bk = 3;
            bp = [b[0] + d[0] * h[0], b[1] + d[1] * h[0], b[2] + d[2] * h[0]];
            bn = nrm3((bp[0] - e.c[0]) / (e.r[0] ** 2), (bp[1] - e.c[1]) / (e.r[1] ** 2), (bp[2] - e.c[2]) / (e.r[2] ** 2));
          }
        }
      }
      if (!bc) continue;
      const p = j * W + i;
      cls[p] = bc;
      const N = nv(bn);
      const s = N[0] * LX + N[1] * LY + N[2] * LZ;
      if (bc === C_SKIN) {
        const fx = N[0] * 0.55, fy = N[1] * 0.62, fz = Math.sqrt(Math.max(0.05, 1 - fx * fx - fy * fy));
        const ss = fx * LX + fy * LY + fz * LZ;
        let t = ss > 0.84 ? 1 : ss > 0.55 ? 2 : ss > 0.3 ? 3 : 4;
        if (bk === 1) t = Math.min(4, t + 1);
        if (bk === 2 && ss > 0.7) t = 1;
        T[p] = t; RM[p] = P.skin;
      } else if (bc === C_HAIR) {
        let ss = s + (0.5 - bu) * st.rib;
        let t = quant(ss + 0.03);
        const strand = bang > 0.5 && (bu < 0.1 || bu > 0.95);
        if (strand) t = Math.min(4, t + 1);
        if (bgap < 1.1 && t < 3 && !(st.cur && bp[1] > st.C[1] - 1.5)) t++;
        // 천사 고리: 결 방향과 반사 방향이 직각인 곳
        if (bang > 0.35 && !strand && ss > 0.28) {
          const q = bq, W3 = st.W, c = dot(q, W3);
          const tl = nrm3((q[0] * c - W3[0]) * st.R[0], (q[1] * c - W3[1]) * st.R[1], (q[2] * c - W3[2]) * st.R[2]);
          const tv = nv(tl), th = tv[0] * HX + tv[1] * HY + tv[2] * HZ;
          const k = Math.abs(th) + Math.abs(bu - 0.5) * 0.1 + hash(Math.floor(bth * st.n / 6.283)) * 0.025;
          if (k < 0.1) t = 0; else if (k < 0.19) t = Math.min(t, 1);
        }
        if (st.part && bang < st.partAng + 0.08 && bang > 0.12) {
          let dth = Math.abs(bth - st.partTheta); if (dth > Math.PI) dth = 2 * Math.PI - dth;
          const dist = dth * Math.sin(bang);
          if (dist < 0.05 * (1 / S + 0.5)) t = 5; else if (dist < 0.11) t = Math.min(t, 1);
        }
        T[p] = t; RM[p] = P.hair;
      } else if (bc === C_CUR) {
        let ss = s + (0.5 - bu) * 0.3 - Math.max(0, bp[1] - 2) * 0.012;
        let t = quant(ss);
        if (bu < 0.1 || bu > 0.94) t = Math.min(4, t + 1);
        if (bgap < 1.2 && t < 3) t++;
        T[p] = t; RM[p] = P.hair;
      } else if (bc === C_HAIRF || bc === C_CURF) {
        T[p] = (bu < 0.12 ? 4 : bp[1] < -6 ? 3 : 4); RM[p] = P.hair;
      } else if (bc === C_HOOD) {
        let t = quant(s + 0.02);
        const al = (Math.atan2(bp[0], bp[2]) * 180) / Math.PI;
        let r = P.top;
        if (bk === 3) { // 귀: 앞쪽 가운데는 크림색
          if (N[2] > 0.5 && view !== 'up') r = P.cream;
        } else {
          const rim = Math.abs(al) < 62 && bp[1] > -7.4 && bp[1] < 14.5;
          if (rim) t = Math.max(0, Math.min(t, 2) - 1);
          else if (hoodStripe(al, bp[1])) { r = P.top2; t = Math.min(4, Math.max(t, 2) + 1); }
        }
        T[p] = t; RM[p] = r;
      } else if (bc === C_HOODF) {
        T[p] = 4; RM[p] = P.top;
      }
    }
  }
  // 앞머리 그늘: 앞머리 바로 아래 피부를 한 단계 어둡게
  const drop = Math.max(1, Math.round(1.5 * S));
  for (let j = j1; j >= j0; j--) for (let i = i0; i <= i1; i++) {
    const p = j * W + i;
    if (cls[p] !== C_SKIN) continue;
    for (let k = 1; k <= drop; k++) {
      const q = p - k * W;
      if (q < 0) break;
      const c = cls[q];
      if (c === C_HAIR || c === C_CUR || c === C_HOOD) { T[p] = Math.max(T[p], 3); break; }
      if (c !== C_SKIN) break;
    }
  }
  return { cls, T, RM, i0, i1, j0, j1, st, hooded, view, hc };
}

// ---------------------------------------------------------------- 얼굴(1배 도트 글자판)
// 왼쪽 눈(화면 기준). 오른쪽 눈은 거울상이지만 반짝임은 같은 쪽(왼쪽 위)에 둔다.
const EYES = {
  open: ['......', '.KKKK.', 'KKKKKK', 'KHHIIK', 'KHIIiK', '.iiij.', '..jj..'],
  openR: ['......', '.KKKK.', 'KKKKKK', 'KHHIIK', 'KHIIiK', '.iiij.', '..jj..'],
  surprise: ['......', '.KKKK.', 'KWWWWK', 'KWHIWK', 'KWIIWK', '.WWWW.', '..kk..'],
  surpriseR: ['......', '.KKKK.', 'KWWWWK', 'KWHIWK', 'KWIIWK', '.WWWW.', '..kk..'],
  happy: ['......', '......', '..KK..', '.KKKK.', 'KK..KK', 'K....K', '......'],
  happyR: ['......', '......', '..KK..', '.KKKK.', 'KK..KK', 'K....K', '......'],
  lash: ['......', 'K.....', '.KKKK.', 'KKKKKK', 'K....K', '......', '......'],
  lashR: ['......', '.....K', '.KKKK.', 'KKKKKK', 'K....K', '......', '......'],
  serious: ['......', '......', '......', 'KKKKKK', 'KHHIiK', '.iiij.', '..jj..'],
  seriousR: ['......', '......', '......', 'KKKKKK', 'KHHIiK', '.iiij.', '..jj..'],
  winkR: ['......', '......', 'KK....', '.KKK..', '...KKK', '......', '......'],
};
const EYE_SIDE = {
  open: ['....', '.KKK', 'KKKK', 'HHIK', 'HIiK', 'iij.', '.j..'],
  happy: ['....', '....', '.KK.', 'KKKK', 'K..K', '....', '....'],
  lash: ['....', '...K', '.KKK', 'KKKK', 'K..K', '....', '....'],
  surprise: ['....', 'KKK.', 'WWWK', 'HIW.', 'IPW.', 'WWW.', '....'],
  serious: ['....', '....', '....', 'KKKK', 'HIiK', 'iij.', '.j..'],
};
const MOUTHS = {
  0: ['K..K', '.KK.'],
  1: ['KKKKKK', 'KMMMMK', '.KTTK.'],
  2: ['.KK.', 'KMMK', '.KK.'],
  3: ['KKKK', 'KMMK', '.KK.'],
  4: ['.KK.'],
  5: ['KKKKKK', 'KMMMMK', 'KMTTMK', '.KKKK.'],
  6: ['K...K', '.KKK.', '..T..'],
};
const MOUTH_SIDE = { 0: ['K.', '.K'], 1: ['KK', 'MK', 'TK'], 2: ['KK', 'MK', 'KK'], 3: ['KK', 'MK'], 4: ['KK'], 5: ['KK', 'MK', 'TK', 'KK'], 6: ['K.', '.K'] };
const flip = (rows) => rows.map((r) => [...r].reverse().join(''));

function faceKey(P) {
  return {
    K: [P.lash, 5], k: [P.lash, 2], I: [P.iris, 4], i: [P.iris, 2], j: [P.iris, 1], P: [P.iris, 6],
    W: [P.white, 2], H: [P.white, 0], h: [P.white, 1], M: [P.mouth, 4], T: [P.tongue, 2],
  };
}

// 얼굴 이목구비(앞·옆) · 볼 터치 · 눈썹 · 수염
function drawFace(sc, P, av, H) {
  const { view, hc } = H;
  if (view === 'up') return;
  const f = av.face, key = faceKey(P);
  const skin = sc.mask();
  for (let p = 0; p < H.cls.length; p++) if (H.cls[p] === C_SKIN) skin.set(p);
  // 볼 터치
  const blush = sc.mask();
  if (view === 'down') { blush.ell(hc.x - 8.6, hc.y + 7.9, 2.0, 1.0); blush.ell(hc.x + 8.6, hc.y + 7.9, 2.0, 1.0); }
  else { const F = view === 'left' ? -1 : 1; blush.ell(hc.x + F * 5.6, hc.y + 7.9, 1.8, 1.0); }
  if (av.beard !== 1) sc.recolor(blush.and(skin), P.blush);
  // 까슬 수염
  if (av.beard === 2) {
    const m = sc.mask();
    if (view === 'down') { m.ell(hc.x, hc.y + 8.4, 11.6, 5.6); m.ell(hc.x, hc.y + 5.6, 9.4, 5.2, 0); m.ell(hc.x, hc.y + 9.8, 2.8, 1.3, 0); }
    else { const F = view === 'left' ? -1 : 1; m.ell(hc.x + F * 6.5, hc.y + 10, 5.2, 3.4); m.ell(hc.x + F * 8.8, hc.y + 9.6, 2.2, 1.2, 0); }
    m.and(skin);
    sc.recolor(m, P.stub, (x, y) => (Math.floor(x) + Math.floor(y)) % 2 === 0);
  }
  const top = Math.round(hc.y + 4.4 - 4);
  if (view === 'down') {
    const L = f === 2 ? EYES.surprise : f === 3 ? EYES.happy : f === 4 ? EYES.serious : f === 5 ? EYES.lash : EYES.open;
    const R = f === 2 ? EYES.surpriseR : f === 3 ? EYES.happyR : f === 4 ? EYES.seriousR : f === 5 ? EYES.lashR : f === 6 ? EYES.winkR : EYES.openR;
    const cx = Math.round(hc.x);
    sc.stamp(cx - 9, top, L, key);
    sc.stamp(cx + 3, top, R, key);
    const m = MOUTHS[f], mw = m[0].length;
    sc.stamp(cx - mw / 2, Math.round(hc.y + 9.3), m, key);
    sc.stamp(cx, Math.round(hc.y + 6.9), ['n'], { n: [P.skin, 3] });
    // 눈썹(앞머리 아래에 먼저 그린다)
    if (f !== 4) {
      const by = top - 1;
      sc.stamp(cx - 8, by, ['.bb.', 'b..b'].map((r, k) => (k ? r : r)), { b: [P.hair, 5] });
      sc.stamp(cx + 4, by, ['.bb.', 'b..b'], { b: [P.hair, 5] });
    }
  } else {
    const F = view === 'left' ? -1 : 1;
    const ex = hc.x + F * 9.2, cxp = Math.round(ex - (F < 0 ? 1.5 : 2.5));
    let e = f === 2 ? EYE_SIDE.surprise : f === 3 ? EYE_SIDE.happy : f === 4 ? EYE_SIDE.serious : f === 5 ? EYE_SIDE.lash : EYE_SIDE.open;
    if (f === 6 && F > 0) e = EYE_SIDE.happy; // 윙크하는 눈(오른쪽 눈)이 보이는 쪽
    sc.stamp(cxp, top, F < 0 ? e : flip(e), key);
    const m = MOUTH_SIDE[f];
    const mx = Math.round(hc.x + F * 10.2 - (F < 0 ? 0.5 : 1.5));
    sc.stamp(mx, Math.round(hc.y + 9.2), F < 0 ? m : flip(m), key);
  }
}
function drawBrowsOver(sc, P, av, H) {
  const { view, hc } = H;
  if (av.face !== 4 || view === 'up') return;
  const top = Math.round(hc.y + 4.4 - 3.5), cx = Math.round(hc.x), k = { b: [P.hair, 5] };
  if (view === 'down') {
    sc.stamp(cx - 9, top - 3, ['bb....', '..bbb.'], k, G.FEAT);
    sc.stamp(cx + 3, top - 3, ['....bb', '.bbb..'], k, G.FEAT);
  } else {
    const F = view === 'left' ? -1 : 1;
    sc.stamp(Math.round(hc.x + F * 9.9 - 2), top - 2, F < 0 ? ['bbb.', '...b'] : ['.bbb', 'b...'], k);
  }
}

// ---------------------------------------------------------------- 수염·안경·모자
function drawBeard(sc, P, av, H) {
  if (av.beard !== 1 || H.view === 'up') return;
  const { hc, view } = H;
  const skin = sc.mask();
  for (let p = 0; p < H.cls.length; p++) if (H.cls[p] === C_SKIN) skin.set(p);
  const m = sc.mask();
  if (view === 'down') {
    m.ell(hc.x, hc.y + 6.6, 12.8, 7.6); m.ell(hc.x, hc.y + 3.2, 10.4, 6.6, 0);
    m.ell(hc.x - 2.4, hc.y + 8.4, 2.8, 1.2); m.ell(hc.x + 2.4, hc.y + 8.4, 2.8, 1.2);
    m.ell(hc.x, hc.y + 10.2, 2.4, 1.0, 0);
  } else {
    const F = view === 'left' ? -1 : 1;
    m.ell(hc.x + F * 3, hc.y + 7.5, 10, 7); m.ell(hc.x + F * 5.5, hc.y + 3.5, 7, 5.5, 0);
    m.ell(hc.x + F * 8.6, hc.y + 8.6, 2.2, 1.1);
  }
  m.and(skin);
  sc.paint(m, P.hair, G.HAIR, { n: { m: 'blob', ax: 0.7, ay: 0.5 }, bias: -0.05, line: 1 });
}

function drawGlasses(sc, P, av, H) {
  const g = av.glasses, { hc, view } = H;
  if (!g) return;
  const ey = hc.y + 4.4;
  if (view === 'up') {
    if (g !== 3) return;
    const strap = sc.mask().rect(hc.x - 17, ey - 1.6, 34, 2.6);
    const face = sc.mask(); for (let p = 0; p < H.cls.length; p++) if (H.cls[p]) face.set(p);
    sc.paint(strap.and(face), P.goggle, G.ACC, { n: { m: 'blob', ax: 0.9, ay: 0.4 }, bias: -0.1, line: 2 });
    return;
  }
  if (view === 'down') {
    const E = [hc.x - 6, hc.x + 6];
    if (g === 1) {
      const m = sc.mask();
      for (const x of E) { m.ell(x, ey, 4.0, 3.7); }
      for (const x of E) m.ell(x, ey, 3.05, 2.75, 0);
      m.rect(hc.x - 2.2, ey - 1.2, 4.4, 1); m.rect(hc.x - 12.8, ey - 1.2, 2.8, 1); m.rect(hc.x + 10, ey - 1.2, 2.8, 1);
      sc.paint(m, P.frame, G.ACC, { tone: 3, line: 0 });
      const gl = sc.mask();
      for (const x of E) gl.rect(x - 2.6, ey + 1.4, 1, 1);
      sc.paint(gl, P.glass, G.ACC, { tone: 0, line: 0 });
    } else if (g === 2) {
      const m = sc.mask();
      for (const x of E) m.ell(x, ey + 0.4, 4.1, 3.1);
      m.rect(hc.x - 2.2, ey - 0.8, 4.4, 1.2); m.rect(hc.x - 12.8, ey - 0.8, 2.6, 1); m.rect(hc.x + 10.2, ey - 0.8, 2.6, 1);
      sc.paint(m, P.lens, G.ACC, { n: { m: 'blob', ax: 0.4, ay: 0.9 }, bias: -0.1, line: 2 });
      const gl = sc.mask();
      for (const x of E) { gl.rect(x - 2.6, ey - 1.2, 2, 1); gl.rect(x - 2.6, ey - 0.2, 1, 1); }
      sc.recolor(gl, P.glass, null, 1);
    } else {
      const strap = sc.mask(); strap.rect(hc.x - 16, ey - 1.6, 32, 2.6);
      const face = sc.mask(); for (let p = 0; p < H.cls.length; p++) if (H.cls[p]) face.set(p);
      strap.and(face);
      sc.paint(strap, P.goggle, G.ACC, { tone: 4, line: 1 });
      const m = sc.mask();
      for (const x of E) m.ell(x, ey, 4.5, 4.1);
      m.rect(hc.x - 2, ey - 1.2, 4, 2);
      sc.paint(m, P.goggle, G.ACC, { n: { m: 'blob', ax: 0.8, ay: 0.7 }, line: 2 });
      const l = sc.mask();
      for (const x of E) l.ell(x, ey, 3.3, 2.9);
      sc.paint(l, P.glass, G.ACC, { n: { m: 'blob', ax: 0.5, ay: 0.8 }, bias: 0.1, line: 1 });
      const gl = sc.mask(); for (const x of E) { gl.rect(x - 2.4, ey - 2, 2, 1); gl.rect(x - 2.4, ey - 1, 1, 1); }
      sc.recolor(gl, P.white, null, 0);
    }
  } else {
    const F = view === 'left' ? -1 : 1, ex = hc.x + F * 9.4, earX = hc.x - F * 0.9;
    if (g === 1) {
      const m = sc.mask(); m.ell(ex, ey, 2.4, 3.6); m.ell(ex, ey, 1.5, 2.7, 0);
      m.rect(Math.min(ex, earX) + 1.5, ey - 1.2, Math.abs(earX - ex) - 1.5, 1);
      sc.paint(m, P.frame, G.ACC, { tone: 3, line: 0 });
    } else if (g === 2) {
      const m = sc.mask(); m.ell(ex, ey + 0.4, 2.4, 3.0); m.rect(Math.min(ex, earX), ey - 0.8, Math.abs(earX - ex), 1);
      sc.paint(m, P.lens, G.ACC, { n: { m: 'blob', ax: 0.4, ay: 0.9 }, bias: -0.1, line: 2 });
    } else {
      const strap = sc.mask(); strap.rect(hc.x - 16, ey - 1.6, 32, 2.6);
      const face = sc.mask(); for (let p = 0; p < H.cls.length; p++) if (H.cls[p]) face.set(p);
      strap.and(face);
      sc.paint(strap, P.goggle, G.ACC, { tone: 4, line: 1 });
      const m = sc.mask(); m.ell(ex + F * 0.6, ey, 2.8, 4.2);
      sc.paint(m, P.goggle, G.ACC, { line: 2 });
      const l = sc.mask(); l.ell(ex + F * 1.0, ey, 1.6, 3.0);
      sc.paint(l, P.glass, G.ACC, { bias: 0.1, line: 1 });
    }
  }
}

// 모자 실루엣(머리카락을 모자 밖으로 삐져나오지 않게 자를 때도 쓴다)
function hatShape(sc, av, view, hc, topY) {
  const h = av.hat, m = sc.mask(), F = view === 'left' ? -1 : view === 'right' ? 1 : 0;
  if (h === 1) { m.ell(hc.x, hc.y - 4.8, 15.4, 11.6); m.rect(hc.x - 20, hc.y - 3.2, 40, 20, 0); m.ell(hc.x + F * 2, hc.y - 3.3, F ? 18.4 : 17.6, 2.4); }
  if (h === 2) { m.ell(hc.x, hc.y - 7.4, 12.6, 9.6); m.rect(hc.x - 20, hc.y - 3.4, 40, 20, 0); m.ell(hc.x, hc.y - 3.4, 20.5, 3.4); }
  if (h === 3) {
    m.ell(hc.x, hc.y - 5, 14.6, 11); m.rect(hc.x - 20, hc.y - 2.6, 40, 20, 0);
    if (view === 'down') { const v = sc.mask().ell(hc.x, hc.y - 2.6, 11.6, 3.2); v.rect(hc.x - 20, hc.y - 10, 40, 7.2, 0); m.or(v); }
    if (F) m.ell(hc.x + F * 13.4, hc.y - 2.9, 7.2, 1.9);
  }
  if (h === 4) { m.ell(hc.x, hc.y - 4.4, 15.1, 12.2); m.rect(hc.x - 20, hc.y - 1.6, 40, 20, 0); m.ell(hc.x + F * -1.5, hc.y - 16.4, 3.7, 3.5); }
  return m;
}
function drawHat(sc, P, av, H, topY) {
  const h = av.hat, { hc, view } = H;
  if (!h) return;
  const F = view === 'left' ? -1 : view === 'right' ? 1 : 0;
  const c = P.hat;
  if (h === 1) {
    const dome = sc.mask().ell(hc.x, hc.y - 4.8, 15.4, 11.6); dome.rect(hc.x - 20, hc.y - 3.2, 40, 20, 0);
    sc.paint(dome, c, G.HAT, { n: { m: 'sph', cx: hc.x - 1, cy: hc.y - 6.5, rx: 15.4, ry: 11.6 } });
    const ridge = sc.mask();
    if (F) ridge.ell(hc.x + F * 1, hc.y - 5.2, 13.4, 9.8), ridge.ell(hc.x + F * 1, hc.y - 4.2, 13.4, 9.8, 0);
    else ridge.rect(hc.x - 1.5, hc.y - 16.5, 3, 13.4);
    ridge.and(dome); sc.retone(ridge, (t) => Math.max(0, t - 1));
    const brim = sc.mask().ell(hc.x + F * 2, hc.y - 3.3, F ? 18.4 : 17.6, 2.4);
    sc.paint(brim, c, G.HAT, { n: { m: 'blob', ax: 0.5, ay: 0.8 }, bias: -0.04 });
  }
  if (h === 2) {
    const brim = sc.mask().ell(hc.x, hc.y - 3.4, 20.5, 3.4);
    sc.paint(brim, c, G.HAT, { n: { m: 'blob', ax: 0.4, ay: 0.9 }, bias: -0.02 });
    const crown = sc.mask().ell(hc.x, hc.y - 7.4, 12.6, 9.6); crown.rect(hc.x - 20, hc.y - 3.6, 40, 20, 0);
    sc.paint(crown, c, G.HAT, { n: { m: 'sph', cx: hc.x - 1.5, cy: hc.y - 9, rx: 12.6, ry: 9.6 }, bias: 0.02 });
    const band = sc.mask().rect(hc.x - 14, hc.y - 6.4, 28, 2.8); band.and(crown);
    sc.recolor(band, P.band);
  }
  if (h === 3) {
    const dome = sc.mask().ell(hc.x, hc.y - 5, 14.6, 11); dome.rect(hc.x - 20, hc.y - 2.6, 40, 20, 0);
    sc.paint(dome, c, G.HAT, { n: { m: 'sph', cx: hc.x - 1, cy: hc.y - 7, rx: 14.6, ry: 11 } });
    if (view === 'down') {
      const v = sc.mask().ell(hc.x, hc.y - 2.6, 11.6, 3.2); v.rect(hc.x - 20, hc.y - 10, 40, 7.2, 0);
      sc.paint(v, c, G.HAT, { n: { m: 'blob', ax: 0.6, ay: 0.4 }, bias: -0.22 });
      const logo = sc.mask().ell(hc.x, hc.y - 8.2, 2.4, 2.1);
      sc.paint(logo, P.cream, G.HAT, { n: { m: 'blob' }, line: 1 });
    } else if (F) {
      const v = sc.mask().ell(hc.x + F * 13.4, hc.y - 2.9, 7.2, 1.9);
      sc.paint(v, c, G.HAT, { n: { m: 'blob', ax: 0.4, ay: 0.8 }, bias: -0.1 });
    } else {
      const hole = sc.mask().ell(hc.x, hc.y - 3.2, 3.2, 2.2); hole.and(dome);
      sc.recolor(hole, P.hair, null, 4);
    }
    const btn = sc.mask().ell(hc.x + F * -1, hc.y - 15.9, 1.5, 1.1);
    sc.paint(btn, c, G.HAT, { tone: 1, line: 1 });
  }
  if (h === 4) {
    const dome = sc.mask().ell(hc.x, hc.y - 4.4, 15.1, 12.2); dome.rect(hc.x - 20, hc.y - 1.6, 40, 20, 0);
    sc.paint(dome, c, G.HAT, { n: { m: 'sph', cx: hc.x - 1, cy: hc.y - 7, rx: 15.1, ry: 12.2 } });
    const cuff = sc.mask().rect(hc.x - 16, hc.y - 5.4, 32, 3.8); cuff.and(dome);
    sc.paint(cuff, c, G.HAT, { n: { m: 'blob', ax: 0.8, ay: 0.3 }, bias: 0.05, line: 1, fn: (t, x) => (Math.floor(x) % 2 ? Math.min(4, t + 1) : t) });
    const pom = sc.mask().ell(hc.x + F * -1.5, hc.y - 16.4, 3.7, 3.5);
    sc.paint(pom, P.cream, G.HAT, { n: { m: 'sph', cx: hc.x + F * -1.5 - 1, cy: hc.y - 17.2, rx: 3.7, ry: 3.5 } });
  }
  if (h === 5) { // 고양이 귀 머리띠
    const ear = (bx, dir, inner, by = 0) => {
      const b = topY + 5.2 + by;
      const m = sc.mask().poly([[bx - 5.0 * dir, b], [bx - 3.2 * dir, b - 5.4], [bx - 1.2 * dir, b - 8.6], [bx + 0.2 * dir, b - 9.2], [bx + 1.4 * dir, b - 8.2], [bx + 3.6 * dir, b - 2.6], [bx + 4.4 * dir, b + 0.8]]);
      sc.paint(m, c, G.HAT, { n: { m: 'blob', ax: 0.75, ay: 0.55 } });
      if (inner) { const k = sc.mask().poly([[bx - 2.8 * dir, b - 0.8], [bx - 0.6 * dir, b - 6.6], [bx + 0.6 * dir, b - 6.6], [bx + 2.6 * dir, b - 0.4]]); sc.paint(k, P.pink, G.HAT, { n: BLOB, line: 1 }); }
    };
    if (F) { ear(hc.x - F * 4.6, -F, false, 0.6); ear(hc.x + F * 2.2, -F, true); }
    else { ear(hc.x - 8.4, 1, view === 'down'); ear(hc.x + 8.4, -1, view === 'down'); }
  }
  if (h === 6) { // 왕관
    const w = F ? 13 : 17, x0 = hc.x - w / 2, b = topY + 4.2;
    const pts = [[x0 + 0.4, b], [x0 - 0.8, b - 7.4], [x0 + w * 0.22, b - 4.2], [hc.x, b - 9.6], [x0 + w * 0.78, b - 4.2], [x0 + w + 0.8, b - 7.4], [x0 + w - 0.4, b]];
    const m = sc.mask().poly(pts);
    for (const [x, y] of [[x0 - 0.8, b - 7.6], [hc.x, b - 9.8], [x0 + w + 0.8, b - 7.6]]) m.ell(x, y, 1.3, 1.3);
    sc.paint(m, c, G.HAT, { n: { m: 'blob', ax: 0.9, ay: 0.5 }, bias: 0.05 });
    const rim = sc.mask().rect(x0 - 0.5, b - 2.4, w + 1, 2.4); rim.and(m);
    sc.paint(rim, c, G.HAT, { n: { m: 'blob', ax: 0.9, ay: 0.6 }, bias: -0.08, line: 1 });
    const gem = sc.mask().ell(hc.x, b - 4.6, 1.6, 1.5);
    sc.paint(gem, P.red, G.HAT, { n: { m: 'blob', ax: 0.8, ay: 0.8 }, line: 1 });
    const g2 = sc.mask(); g2.ell(x0 + w * 0.22, b - 1.2, 1.0, 0.8); g2.ell(x0 + w * 0.78, b - 1.2, 1.0, 0.8);
    sc.paint(g2, P.saek[3], G.HAT, { tone: 1, line: 0 });
  }
  if (h === 7) { // 헤드폰
    const band = sc.mask();
    band.ell(hc.x, topY + 12.8, 15.2, 13.8); band.ell(hc.x, topY + 12.8, 13.4, 12.2, 0); band.rect(hc.x - 20, topY + 12, 40, 20, 0);
    if (F) { band.d.fill(0); band.cap(hc.x - F * 0.9, hc.y + 1, hc.x - F * 0.4, topY + 1.3, 1.35, 1.15); }
    sc.paint(band, c, G.HAT, { tone: 3, line: 2 });
    const cups = sc.mask();
    if (F) cups.ell(hc.x - F * 0.9, hc.y + 3.6, 3.8, 4.6); else { cups.ell(hc.x - 14.3, hc.y + 3.6, 3.1, 4.4); cups.ell(hc.x + 14.3, hc.y + 3.6, 3.1, 4.4); }
    sc.paint(cups, c, G.HAT, { n: BLOB, bias: 0.04 });
    const pad = sc.mask();
    if (F) pad.ell(hc.x - F * 0.9, hc.y + 3.6, 2.0, 2.8); else { pad.ell(hc.x - 14.6, hc.y + 3.6, 1.2, 2.6); pad.ell(hc.x + 14.6, hc.y + 3.6, 1.2, 2.6); }
    sc.recolor(pad, c, null, 4);
  }
}

// 머리 전체를 그린다. layer: 'behind'(몸 뒤로 가는 긴 머리) 또는 'main'
function paintHead(sc, P, av, H, layer) {
  const { cls, T, RM, view, hc, st } = H;
  const chinCut = hc.y + 13.4;
  const splitBehind = view !== 'up';
  const S = sc.S, oy = sc.oy, W = sc.W;
  const rowY = (p) => oy + (Math.floor(p / W) + 0.5) / S;
  const hatCover = av.hat >= 1 && av.hat <= 4;
  const hairTop = st ? hc.y + st.C[1] - st.R[1] : hc.y - HEAD.b;
  const pick = (want, behind) => {
    const m = sc.mask();
    for (let j = H.j0; j <= H.j1; j++) for (let i = H.i0; i <= H.i1; i++) {
      const p = j * W + i, c = cls[p];
      if (!want.includes(c)) continue;
      const isBehind = splitBehind && c !== C_SKIN && rowY(p) > chinCut;
      if (isBehind === behind) m.set(p);
    }
    return m;
  };
  // 모자에 가려질 윗머리: 모자 실루엣 밖, 챙 선 위의 머리카락은 지운다
  let hatM = null;
  if (hatCover) hatM = hatShape(sc, av, view, hc, hairTop);
  const clipHat = (m) => {
    if (!hatM) return m;
    const cut = hc.y - (av.hat === 4 ? 1.6 : av.hat === 3 ? 2.6 : 3.3);
    for (let j = m.j0; j <= m.j1; j++) { const y = oy + (j + 0.5) / S; if (y >= cut) continue; for (let i = m.i0; i <= m.i1; i++) { const p = j * W + i; if (m.d[p] && !hatM.d[p]) m.d[p] = 0; } }
    return m;
  };
  if (layer === 'behind') {
    const m = clipHat(pick([C_HAIR, C_HAIRF, C_CUR, C_CURF, C_HOOD, C_HOODF], true));
    sc.paint(m, P.hair, G.HAIR, { tones: T, ramps: RM, line: 2, merge: 1 });
    return;
  }
  // 덧붙는 가닥(3D 곡선)을 화면에 옮긴다
  const V = VIEWS[view];
  const clumps = [];
  if (st && st.clumps) for (const [r, c, t, w] of st.clumps) {
    if (hatCover && r[1] < -5) continue;
    if (H.hooded && (r[2] < 5 || r[1] < -9)) continue;
    const pr = (q) => [hc.x + V.X(q), hc.y + q[1]];
    const depth = (V.D(r) + V.D(c) + V.D(t)) / 3;
    clumps.push({ p: [pr(r), pr(c), pr(t)], w, depth, front: V.D(t) > 1.5 || (V.D(r) > 3 && V.D(t) > -1) });
  }
  const paintClump = (k) => {
    const m = sc.mask().bez(k.p[0], k.p[1], k.p[2], k.w, 0.3, 1, 12, 0.75);
    clipHat(m);
    if (H.hooded) { const hm = pick([C_HOOD], false); m.minus(hm); }
    sc.paint(m, P.hair, G.HAIR, { n: { m: 'blob', ax: 0.85, ay: 0.5 }, bias: k.depth > 0 ? 0.02 : -0.08, line: 2 });
  };
  clumps.filter((k) => !k.front).forEach(paintClump);
  const inner = clipHat(pick([C_HAIRF, C_CURF, C_HOODF], false));
  sc.paint(inner, P.hair, G.HAIR, { tones: T, ramps: RM, line: 1 });
  const skin = pick([C_SKIN], false);
  sc.paint(skin, P.skin, G.SKIN, { tones: T, line: 2 });
  drawFace(sc, P, av, H);
  drawBeard(sc, P, av, H);
  const hair = clipHat(pick([C_HAIR, C_CUR], false));
  sc.paint(hair, P.hair, G.HAIR, { tones: T, ramps: RM, line: 2, merge: 1 });
  // 앞머리 그늘이 눈 위로 떨어진다
  clumps.filter((k) => k.front).forEach(paintClump);
  const hood = pick([C_HOOD], false);
  if (hood.i1 >= 0) sc.paint(hood, P.top, G.HOOD, { tones: T, ramps: RM, line: 2 });
  drawBrowsOver(sc, P, av, H);
  drawGlasses(sc, P, av, H);
  drawHat(sc, P, av, H, hairTop);
}

// ---------------------------------------------------------------- 몸
const SIDE_T = [[-4.4, 36.3], [4.0, 36.3], [5.6, 38.4], [5.5, 46.5], [5.1, 50.8], [-5.0, 50.8], [-5.4, 46.5], [-5.8, 38.4]];
const FRONT_T = [[17.3, 36.2], [30.7, 36.2], [32.6, 38.3], [32.2, 46.5], [31.8, 50.8], [16.2, 50.8], [15.8, 46.5], [15.4, 38.3]];

// 팔 하나: 소매(윗옷에 따라 긴·짧은) + 손/장갑. 반환: 팔 도형(그림자용)
function drawArm(sc, P, av, sh, hand, side) {
  const t = av.top, slv = t === 2 ? P.top2 : P.top;
  const dx = hand[0] - sh[0], dy = hand[1] - sh[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const wr = [hand[0] - ux * 1.7, hand[1] - uy * 1.7];
  const along = (x, y) => ((x - sh[0]) * ux + (y - sh[1]) * uy) / L;
  const across = (x, y) => ((x - sh[0]) * uy - (y - sh[1]) * ux) * side; // 바깥쪽 +
  const arm = sc.mask();
  if (t === 0) {
    const el = [sh[0] + dx * 0.46, sh[1] + dy * 0.46];
    const fore = sc.mask().cap(el[0], el[1], wr[0], wr[1], 2.05, 1.9);
    sc.paint(fore, P.skin, G.SKIN, { n: { m: 'blob', ax: 0.8, ay: 0.3 }, line: 2 });
    const sl = sc.mask().cap(sh[0], sh[1], el[0] + ux * 0.6, el[1] + uy * 0.6, 2.7, 2.65);
    sc.paint(sl, slv, G.TOP, { n: { m: 'blob', ax: 0.85, ay: 0.5 }, line: 2 });
    arm.or(fore).or(sl);
  } else {
    const sl = sc.mask().cap(sh[0], sh[1], wr[0], wr[1], 2.6, 2.25);
    let fn = null;
    if (t === 1) fn = (tt, x, y) => { const a = along(x, y); return a > 0.8 && a < 0.87 ? Math.min(4, tt + 1) : tt; };
    if (t === 5) fn = (tt, x, y) => (along(x, y) > 0.84 ? Math.min(4, tt + 1) : tt);
    sc.paint(sl, slv, G.TOP, { n: { m: 'blob', ax: 0.85, ay: 0.45 }, line: 2, fn });
    if (t === 3) sc.recolor(sl, P.top2, (x, y) => { const a = along(x, y) + across(x, y) * 0.05; return (a > 0.3 && a < 0.4) || (a > 0.6 && a < 0.7); });
    if (t === 4) sc.recolor(sl, P.top2, (x, y) => along(x, y) > 0.82);
    if (t === 6) sc.recolor(sl, P.top2, (x, y) => { const c = across(x, y); return c > 0.7 && c < 1.7; });
    if (t === 7) { for (let k = 0; k < 5; k++) sc.recolor(sl, P.saek[k], (x, y) => { const a = along(x, y); return a > 0.24 && Math.floor((a - 0.24) * 10.5) % 5 === k; }); }
    arm.or(sl);
  }
  const hm = sc.mask().ell(hand[0], hand[1], 2.3, 2.45);
  sc.paint(hm, P.glove, av.gloves ? G.HAND : G.SKIN, { n: { m: 'blob', ax: 0.8, ay: 0.7 }, line: 2 });
  if (av.gloves) { const cf = sc.mask().ell(wr[0] + ux * 0.2, wr[1] + uy * 0.2, 2.6, 1.3); cf.and(sc.mask().cap(sh[0], sh[1], hand[0], hand[1], 3, 3)); sc.paint(cf, P.glove, G.HAND, { tone: 1, line: 1 }); }
  return arm.or(hm);
}

function drawLegFront(sc, P, av, hip, foot, inner) {
  const b = av.bottom, ank = [foot[0], foot[1] - 2.3];
  const hanbokLong = b === 2 && av.top === 7;
  if (!hanbokLong) {
    if (b === 0 || b === 3) {
      const m = sc.mask().cap(hip[0], hip[1], ank[0], ank[1], 3.25, 2.85);
      sc.paint(m, P.bot, G.BOT, { n: { m: 'blob', ax: 0.85, ay: 0.3 }, line: 2 });
      if (av.top === 3) { // 호랑이 옷: 다리 바깥쪽 줄무늬
        const s = sc.mask(), dir = inner;
        for (const y of [55.5, 59.5]) s.poly([[hip[0] - 3.2 * dir, foot[1] - 66.3 + y], [hip[0] - 0.4 * dir, foot[1] - 66.3 + y + 0.6], [hip[0] - 3.2 * dir, foot[1] - 66.3 + y + 1.6]]);
        s.and(m); sc.recolor(s, P.top2);
      }
    } else {
      const m = sc.mask().cap(hip[0], hip[1], ank[0], ank[1], 2.7, 2.35);
      sc.paint(m, P.skin, G.SKIN, { n: { m: 'blob', ax: 0.8, ay: 0.3 }, line: 2 });
      const so = sc.mask().cap(ank[0], ank[1] - 1.4, ank[0], ank[1] + 0.4, 2.35);
      sc.paint(so, P.sock, G.BOT, { n: { m: 'blob', ax: 0.8, ay: 0.3 }, line: 1 });
      if (b === 1) {
        const sh = sc.mask().cap(hip[0], hip[1], hip[0] + (ank[0] - hip[0]) * 0.3, hip[1] + 5.4, 3.2, 3.1);
        sc.paint(sh, P.bot, G.BOT, { n: { m: 'blob', ax: 0.85, ay: 0.4 }, line: 2 });
      }
    }
  }
  const shoe = sc.mask().ell(foot[0], foot[1], 3.7, 2.5);
  sc.paint(shoe, P.shoe, G.SHOE, { n: { m: 'blob', ax: 0.8, ay: 0.7 }, bias: 0.04, line: 2 });
}

function drawTorsoFront(sc, P, av, by, back) {
  const t = av.top, pts = FRONT_T.map(([x, y]) => [x, y + by]);
  const tor = sc.mask().poly(pts);
  sc.paint(tor, P.top, G.TOP, { n: { m: 'blob', ax: 0.8, ay: 0.45, soft: 6 }, line: 2 });
  const Y = (y) => y + by;
  const part = (m, ramp, o = {}) => { m.and(tor); return sc.paint(m, ramp, o.grp ?? G.TOP, { n: { m: 'blob', ax: 0.7, ay: 0.4 }, line: o.line ?? 1, bias: o.bias || 0, tone: o.tone }); };
  const rec = (m, ramp, tone) => { m.and(tor); sc.recolor(m, ramp, null, tone); };
  const ret = (m, f) => { m.and(tor); sc.retone(m, f); };
  if (back) {
    if (t === 0) part(sc.mask().ell(24, Y(36.2), 3.4, 1.2), P.top, { line: 1, tone: 4 });
    if (t === 1) { ret(sc.mask().rect(23.5, Y(40), 1, 11), 1); part(sc.mask().poly([[19.6, Y(36.2)], [28.4, Y(36.2)], [27.4, Y(38.6)], [20.6, Y(38.6)]]), P.top, { line: 2 }); }
    if (t === 2) { part(sc.mask().ell(24, Y(36.4), 4.6, 1.8), P.collar, { line: 1 }); for (const y of [41.6, 45.2]) sc.recolor(sc.mask().rect(16, Y(y), 16, 1).and(tor), P.top, (x) => Math.floor(x) % 2 === 0, 1); rec(sc.mask().rect(15.5, Y(47.6), 17, 1.6), P.cream); }
    if (t === 3) {
      const s = sc.mask();
      for (const y of [39, 42.6, 46.2]) { s.poly([[15, Y(y)], [19.8, Y(y + 0.6)], [15, Y(y + 1.8)]]); s.poly([[33, Y(y)], [28.2, Y(y + 0.6)], [33, Y(y + 1.8)]]); }
      for (const y of [38.6, 44]) s.poly([[22.2, Y(y)], [25.8, Y(y)], [24, Y(y + 2.6)]]);
      rec(s, P.top2);
    }
    if (t === 4) { part(sc.mask().rect(15.4, Y(36.4), 4.4, 1.9), P.top2, { line: 1 }); part(sc.mask().rect(28.2, Y(36.4), 4.4, 1.9), P.top2, { line: 1 }); rec(sc.mask().rect(15.5, Y(48.8), 17, 1.6), P.tie); ret(sc.mask().rect(23.5, Y(42), 1, 7), 1); }
    if (t === 5) { const hd = sc.mask().ell(24, Y(39.6), 6.4, 4.4); hd.rect(15, Y(34), 18, 2.4, 0); part(hd, P.top, { line: 2 }); ret(sc.mask().ell(24, Y(39.6), 3.6, 2.2), 1); ret(sc.mask().rect(15.5, Y(49.4), 17, 1.4), 1); }
    if (t === 6) { const s = sc.mask().poly([[16.3, Y(38.4)], [18.1, Y(38.4)], [17.9, Y(50.8)], [16.1, Y(50.8)]]).poly([[29.9, Y(38.4)], [31.7, Y(38.4)], [31.9, Y(50.8)], [30.1, Y(50.8)]]); rec(s, P.top2); part(sc.mask().poly([[19.8, Y(35.4)], [28.2, Y(35.4)], [28.6, Y(38.2)], [19.4, Y(38.2)]]), P.top, { line: 2 }); }
    if (t === 7) part(sc.mask().rect(20, Y(36.2), 8, 1.6), P.white, { line: 1 });
    return tor;
  }
  if (t === 0) {
    const neck = sc.mask().ell(24, Y(36.0), 3.1, 1.9); neck.and(tor);
    sc.paint(neck, P.skin, G.SKIN, { tone: 3, line: 2 });
    const star = [];
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 1.3 : 3.1; star.push([24 + Math.cos(a) * r, Y(43.4) + Math.sin(a) * r]); }
    part(sc.mask().poly(star), P.top2, { line: 1, bias: 0.05 });
  }
  if (t === 1) {
    part(sc.mask().poly([[21, Y(36)], [27, Y(36)], [24.9, Y(44.6)], [23.1, Y(44.6)]]), P.top2, { line: 1 });
    part(sc.mask().poly([[19.6, Y(36.2)], [21.8, Y(36.2)], [23.9, Y(44.8)], [22.6, Y(45.2)], [19.8, Y(39)]]), P.top, { line: 2, bias: 0.06 });
    part(sc.mask().poly([[28.4, Y(36.2)], [26.2, Y(36.2)], [24.1, Y(44.8)], [25.4, Y(45.2)], [28.2, Y(39)]]), P.top, { line: 2, bias: -0.04 });
    ret(sc.mask().rect(23.5, Y(45), 1, 6), 2);
    ret(sc.mask().rect(26.4, Y(41.2), 3.6, 0.9), 1);
    part(sc.mask().rect(28, Y(39.4), 1, 2.4), P.saek[3], { line: 0, tone: 2 });
    part(sc.mask().rect(17.6, Y(40.6), 2.8, 1.6), P.red, { line: 1 });
  }
  if (t === 2) {
    part(sc.mask().ell(24, Y(36.3), 3.3, 1.6), P.top2, { line: 1 });
    const ring = sc.mask().ell(24, Y(36.7), 4.6, 2.5); ring.ell(24, Y(36.2), 3.2, 1.6, 0);
    part(ring, P.collar, { line: 1 });
    for (const y of [41.6, 45.2]) sc.recolor(sc.mask().rect(16, Y(y), 16, 1).and(tor), P.top, (x) => Math.floor(x) % 2 === 0, 1);
    for (const x of [19.5, 28.5]) sc.recolor(sc.mask().rect(x, Y(39), 1, 8.4).and(tor), P.top, (xx, y) => Math.floor(y) % 2 === 0, 1);
    rec(sc.mask().rect(15.5, Y(47.6), 17, 1.6), P.cream);
    const z = sc.mask().rect(23.5, Y(38.6), 1, 12.2); z.and(tor); sc.recolor(z, P.metal, null, 3);
    sc.recolor(sc.mask().rect(24.5, Y(38.6), 1, 12.2).and(tor), P.top, null, 1);
    part(sc.mask().poly([[17.2, Y(39.4)], [21.2, Y(39.4)], [21.2, Y(41.8)], [19.2, Y(43.2)], [17.2, Y(41.8)]]), P.red, { line: 2 });
    part(sc.mask().rect(18.6, Y(40.4), 1.2, 1.2), P.white, { line: 0, tone: 0 });
    part(sc.mask().rect(26.4, Y(40.2), 3.6, 0.9), P.white, { line: 0, tone: 1 });
  }
  if (t === 3) {
    part(sc.mask().ell(24, Y(45.4), 4.7, 5.6), P.cream, { line: 1, bias: 0.04 });
    const s = sc.mask();
    for (const y of [39, 42.6, 46.2]) { s.poly([[15, Y(y)], [19.6, Y(y + 0.6)], [15, Y(y + 1.8)]]); s.poly([[33, Y(y)], [28.4, Y(y + 0.6)], [33, Y(y + 1.8)]]); }
    for (const x of [19.4, 28.6]) s.poly([[x - 1.2, Y(36)], [x, Y(38.8)], [x + 1.2, Y(36)]]);
    rec(s, P.top2);
  }
  if (t === 4) {
    part(sc.mask().poly([[20.6, Y(36)], [24, Y(36)], [24, Y(39)]]), P.white, { line: 2 });
    part(sc.mask().poly([[27.4, Y(36)], [24, Y(36)], [24, Y(39)]]), P.white, { line: 2 });
    part(sc.mask().poly([[23.2, Y(37.6)], [24.8, Y(37.6)], [25.1, Y(42.6)], [24, Y(43.6)], [22.9, Y(42.6)]]), P.tie, { line: 1 });
    for (const x of [20.9, 27.1]) for (const y of [41.4, 44.4, 47.4]) { part(sc.mask().rect(x - 0.5, Y(y), 1, 1), P.top2, { line: 0, tone: 1 }); ret(sc.mask().rect(x - 0.5, Y(y + 1), 1, 1), 1); }
    part(sc.mask().rect(15.3, Y(36.4), 4.6, 1.9), P.top2, { line: 1 });
    part(sc.mask().rect(28.1, Y(36.4), 4.6, 1.9), P.top2, { line: 1 });
    rec(sc.mask().rect(15.5, Y(48.8), 17, 1.6), P.tie);
    part(sc.mask().rect(23, Y(48.6), 2, 2), P.top2, { line: 1, tone: 1 });
  }
  if (t === 5) {
    const hood = sc.mask().ell(24, Y(36.6), 6.6, 3.0); hood.ell(24, Y(35.8), 3.4, 1.7, 0); hood.rect(15, Y(33), 18, 1.8, 0);
    part(hood, P.top, { line: 2, bias: 0.05 });
    for (const x of [21.5, 25.5]) part(sc.mask().rect(x, Y(38.6), 1, 4.6), P.top2, { line: 0 });
    part(sc.mask().poly([[19.4, Y(44.6)], [28.6, Y(44.6)], [29.8, Y(48.9)], [18.2, Y(48.9)]]), P.top, { line: 1, bias: -0.06 });
    ret(sc.mask().rect(15.5, Y(49.5), 17, 1.4), 1);
  }
  if (t === 6) {
    part(sc.mask().poly([[19.8, Y(35.4)], [28.2, Y(35.4)], [28.6, Y(38.3)], [19.4, Y(38.3)]]), P.top, { line: 2, bias: 0.04 });
    const s = sc.mask().poly([[16.3, Y(38.4)], [18.1, Y(38.4)], [17.9, Y(50.8)], [16.1, Y(50.8)]]).poly([[29.9, Y(38.4)], [31.7, Y(38.4)], [31.9, Y(50.8)], [30.1, Y(50.8)]]);
    rec(s, P.top2);
    const z = sc.mask().rect(23.5, Y(36), 1, 14.8); z.and(tor); sc.recolor(z, P.metal, null, 3);
    part(sc.mask().rect(23.5, Y(38.4), 1, 1.4), P.metal, { line: 0, tone: 1 });
    ret(sc.mask().rect(15.5, Y(49.6), 17, 1.2), 1);
  }
  if (t === 7) {
    part(sc.mask().poly([[21.4, Y(36)], [26.4, Y(36)], [23.6, Y(38.8)]]), P.skin, { grp: G.SKIN, tone: 3, line: 2 });
    part(sc.mask().cap(20.6, Y(36.4), 23.4, Y(39.6), 0.9), P.white, { line: 2 });
    part(sc.mask().cap(27.2, Y(36.4), 20.4, Y(43.4), 1.0), P.white, { line: 2 });
    const bow = sc.mask().ell(21.6, Y(43.4), 1.5, 1.2);
    bow.cap(21.3, Y(43.8), 20.2, Y(50.2), 0.9, 1.05); bow.cap(22.2, Y(43.8), 23.6, Y(49.4), 0.9, 1.05);
    part(bow, P.top2, { line: 2, bias: 0.05 });
    ret(sc.mask().rect(15.5, Y(49.6), 17, 1.2), 1);
  }
  return tor;
}

function drawBottomFront(sc, P, av, by, back) {
  const b = av.bottom, Y = (y) => y + by;
  if (b === 2) {
    const hanbok = av.top === 7;
    const pts = hanbok ? [[17.2, Y(46.2)], [30.8, Y(46.2)], [35.4, 66.4], [12.6, 66.4]] : [[17.4, Y(48.6)], [30.6, Y(48.6)], [34.6, Y(57.2)], [34, Y(58.4)], [14, Y(58.4)], [13.4, Y(57.2)]];
    const m = sc.mask().poly(pts);
    sc.paint(m, P.bot, G.BOT, { n: { m: 'blob', ax: 0.8, ay: 0.3, soft: 6 }, line: 2, fn: (t, x, y) => {
      const k = ((x - 24) / (y - (hanbok ? 30 : 36))) * 6;
      return Math.abs(k - Math.round(k)) < 0.09 && y > Y(50) ? Math.min(4, t + 1) : t;
    } });
    return m;
  }
  const m = sc.mask().poly([[16.4, Y(48.6)], [31.6, Y(48.6)], [32.2, Y(54.2)], [15.8, Y(54.2)]]);
  sc.paint(m, P.bot, G.BOT, { n: { m: 'blob', ax: 0.8, ay: 0.4 }, line: 2 });
  if (!back && b !== 3) sc.retone(sc.mask().rect(23.5, Y(51.6), 1, 3).and(m), 1);
  return m;
}
function drawOverallsFront(sc, P, av, by, back) {
  if (av.bottom !== 3) return;
  const Y = (y) => y + by;
  if (back) {
    const s = sc.mask().cap(19, Y(37), 24, Y(46), 0.9).cap(29, Y(37), 24, Y(46), 0.9);
    sc.paint(s, P.bot, G.BOT, { n: BLOB, line: 2 });
    sc.paint(sc.mask().rect(19.8, Y(45.6), 8.4, 4), P.bot, G.BOT, { n: BLOB, line: 2 });
    return;
  }
  const s = sc.mask().cap(20.2, Y(43), 18.8, Y(36.6), 0.9).cap(27.8, Y(43), 29.2, Y(36.6), 0.9);
  sc.paint(s, P.bot, G.BOT, { n: BLOB, line: 2 });
  sc.paint(sc.mask().rect(19.6, Y(42.6), 8.8, 7.6), P.bot, G.BOT, { n: { m: 'blob', ax: 0.7, ay: 0.4 }, line: 2 });
  sc.paint(sc.mask().rect(22, Y(44.4), 4, 2.2), P.bot, G.BOT, { tone: 3, line: 1 });
  sc.paint(sc.mask().rect(19.8, Y(42.8), 1, 1).rect(27.2, Y(42.8), 1, 1), P.gold, G.BOT, { tone: 1, line: 0 });
}
function drawCoatSkirtFront(sc, P, av, by, back) {
  if (av.top !== 1) return;
  const Y = (y) => y + by;
  const m = sc.mask().poly([[16.2, Y(49.2)], [31.8, Y(49.2)], [33.2, Y(57.6)], [14.8, Y(57.6)]]);
  if (!back) m.poly([[23.5, Y(50.4)], [24.5, Y(50.4)], [25.8, Y(57.8)], [22.2, Y(57.8)]], 0);
  sc.paint(m, P.top, G.TOP, { n: { m: 'blob', ax: 0.75, ay: 0.3, soft: 6 }, line: 2 });
  if (back) sc.retone(sc.mask().rect(23.5, Y(52), 1, 6).and(m), 2);
  else { sc.retone(sc.mask().rect(17.4, Y(52.4), 3.2, 0.9).and(m), 1); sc.retone(sc.mask().rect(27.4, Y(52.4), 3.2, 0.9).and(m), 1); }
}
function drawBackpackFront(sc, P, av, by) {
  if (!av.back) return;
  const Y = (y) => y + by;
  const s = sc.mask().cap(18.7, Y(36.8), 18.3, Y(45.4), 1.0).cap(29.3, Y(36.8), 29.7, Y(45.4), 1.0);
  sc.paint(s, P.back, G.BAG, { n: { m: 'blob', ax: 0.9, ay: 0.3 }, line: 2 });
}
function drawBackpackBack(sc, P, av, by) {
  if (!av.back) return;
  const Y = (y) => y + by;
  const m = sc.mask().poly([[17.6, Y(38.2)], [30.4, Y(38.2)], [31.6, Y(40)], [31.6, Y(49.4)], [30.4, Y(50.6)], [17.6, Y(50.6)], [16.4, Y(49.4)], [16.4, Y(40)]]);
  sc.paint(m, P.back, G.BAG, { n: { m: 'blob', ax: 0.85, ay: 0.55, soft: 6 }, line: 2 });
  const flap = sc.mask().poly([[17.4, Y(38.2)], [30.6, Y(38.2)], [31.2, Y(43.2)], [16.8, Y(43.2)]]);
  sc.paint(flap.and(m), P.back, G.BAG, { n: { m: 'blob', ax: 0.8, ay: 0.5 }, bias: -0.06, line: 1 });
  sc.paint(sc.mask().poly([[19.6, Y(45.2)], [28.4, Y(45.2)], [28.8, Y(49.6)], [19.2, Y(49.6)]]), P.back, G.BAG, { n: BLOB, bias: 0.06, line: 1 });
  sc.paint(sc.mask().rect(23, Y(42.4), 2, 1.8), P.gold, G.BAG, { tone: 1, line: 1 });
}
function drawTail(sc, P, av, p0, p1, p2) {
  if (av.top !== 3) return;
  const m = sc.mask().bez(p0, p1, p2, 1.7, 1.2, 1, 14, 0.4);
  sc.paint(m, P.top, G.TOP, { n: { m: 'blob', ax: 0.8, ay: 0.6 }, line: 2 });
  const total = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  sc.recolor(m, P.top2, (x, y) => { const d = Math.hypot(x - p0[0], y - p0[1]) / total; return (d > 0.3 && d < 0.4) || (d > 0.56 && d < 0.66) || Math.hypot(x - p2[0], y - p2[1]) < 1.8; });
}

// ---------------------------------------------------------------- 자세
// 앞·뒤: 다리 [엉덩이x, 발x, 발y] · 팔 [손x, 손y, 몸 뒤로 가는가]
const LIFT = 2; // 윗몸 전체를 내려 다리를 짧게(2등신 비율)
const FRONT_POSES = [
  { by: 0, legs: [[20.3, 20.1, 66.3], [27.7, 27.9, 66.3]], arms: [[14.6, 48.6, 0], [33.4, 48.6, 0]] },
  { by: 1, legs: [[20.3, 20.2, 66.7], [27.7, 27.7, 64.6]], arms: [[15.1, 47.6, 1], [32.6, 49.3, 0]] },
  { by: 0, legs: [[20.3, 20.1, 66.3], [27.7, 27.9, 66.3]], arms: [[14.6, 48.6, 0], [33.4, 48.6, 0]] },
  { by: 1, legs: [[20.3, 20.3, 64.6], [27.7, 27.8, 66.7]], arms: [[15.4, 49.3, 0], [32.9, 47.6, 1]] },
];
// 옆: d(얼굴 쪽 +) 기준. near/far 발 [d, y], 팔 손 [d, y]
const SIDE_POSES = [
  { by: 0, near: [0.9, 66.4], far: [-0.9, 66.1], nearArm: [0.3, 48.7], farArm: [0.8, 48.3] },
  { by: 1, near: [4.4, 66.4], far: [-3.8, 65.3], nearArm: [-3.4, 47.9], farArm: [3.8, 47.6] },
  { by: 0, near: [0.7, 66.4], far: [-0.2, 64.5], nearArm: [0.4, 48.7], farArm: [0.4, 48.4] },
  { by: 1, near: [-3.8, 65.3], far: [4.4, 66.4], nearArm: [3.8, 47.6], farArm: [-3.4, 47.9] },
];

function frontFrame(sc, P, av, pose, view) {
  const back = view === 'up', by = pose.by + LIFT, jump = pose.jump || 0;
  pose = { ...pose, arms: pose.arms.map(([x, y, b]) => [x, y + LIFT, b]), raise: pose.raise && pose.raise.map((r) => r && [r[0], r[1] + LIFT]) };
  const hc = { x: 24, y: 22.5 + by + (pose.headDy || 0) - jump };
  const H = castHead(sc, P, av, view, hc);
  const shY = 38.7 + by - jump;
  paintHead(sc, P, av, H, 'behind');
  // 목
  sc.paint(sc.mask().rect(21.4, hc.y + 10.6, 5.2, 5.2), P.skin, G.SKIN, { tone: 3, line: 2 });
  // 몸 뒤로 간 팔
  const armOf = (k) => pose.arms[k];
  const shoulders = [[16.9, shY], [31.1, shY]];
  const sides = back ? [1, -1] : [-1, 1];
  const behindArms = [];
  const arms = [0, 1].map((k) => ({ k, a: armOf(k) }));
  for (const { k, a } of arms) if (a[2] && !pose.raise?.[k] && !back) behindArms.push(k);
  if (back) for (const { k, a } of arms) if (!a[2] && !pose.raise?.[k]) behindArms.push(k);
  for (const k of behindArms) drawArm(sc, P, av, shoulders[k], [armOf(k)[0], armOf(k)[1] - jump], sides[k]);
  // 다리
  if (pose.sit) {
    if (av.bottom !== 2) drawBottomFront(sc, P, av, by, back);
    drawSitLegs(sc, P, av, pose, by);
  } else {
    pose.legs.forEach(([hx, fx, fy], k) => drawLegFront(sc, P, av, [hx, 50.6 + by - jump], [fx, fy - jump], k === 0 ? 1 : -1));
    drawBottomFront(sc, P, av, by - jump, back);
  }
  drawCoatSkirtFront(sc, P, av, by - jump, back);
  drawTorsoFront(sc, P, av, by - jump, back);
  if (back) drawTail(sc, P, av, [25.2, 51 + by], [32.4, 53.4 + by], [33, 45.2 + by]);
  drawOverallsFront(sc, P, av, by - jump, back);
  if (back) drawBackpackBack(sc, P, av, by - jump); else drawBackpackFront(sc, P, av, by - jump);
  // 머리 그림자(턱 밑)
  const chin = sc.mask().ell(hc.x, hc.y + 12.4, 8.6, 3.2);
  sc.retone(chin, 1, [G.TOP, G.SKIN, G.BAG, G.BOT]);
  for (const { k, a } of arms) {
    if (behindArms.includes(k) || pose.raise?.[k]) continue;
    const am = drawArm(sc, P, av, shoulders[k], [a[0], a[1] - jump], sides[k]);
    sc.shadow(am, sides[k] < 0 ? 1 : -1, 0.6, 1, [G.TOP, G.BOT]);
  }
  paintHead(sc, P, av, H, 'main');
  if (pose.raise) pose.raise.forEach((r, k) => { if (r) drawArm(sc, P, av, [shoulders[k][0] + (k ? -0.6 : 0.6), shoulders[k][1] - 0.4], r, sides[k]); });
}

// 앉기: 무릎을 양옆으로 벌리고 발바닥을 마주 댄 자세(앞모습)
function drawSitLegs(sc, P, av, pose, by) {
  const b = av.bottom, hipY = 57.8 + by - 7;
  const bare = b === 1 || b === 2;
  for (const dir of [-1, 1]) {
    const hip = [24 + dir * 3.6, hipY], knee = [24 + dir * 9.8, 63.4], foot = [24 + dir * 3.1, 66.3];
    const shin = sc.mask().cap(knee[0], knee[1], foot[0] + dir * 1.2, foot[1] - 0.6, 2.7, 2.3);
    const thigh = sc.mask().cap(hip[0], hip[1], knee[0], knee[1], 3.3, 2.9);
    if (b === 2) {
      sc.paint(shin, P.skin, G.SKIN, { n: { m: 'blob', ax: 0.6, ay: 0.7 }, line: 2 });
    } else {
      sc.paint(shin, bare ? P.skin : P.bot, bare ? G.SKIN : G.BOT, { n: { m: 'blob', ax: 0.6, ay: 0.7 }, bias: -0.06, line: 2 });
      if (bare) sc.paint(sc.mask().cap(foot[0] + dir * 1.8, foot[1] - 1.2, foot[0] + dir * 2.4, foot[1] - 2.4, 2.1), P.sock, G.BOT, { n: BLOB, line: 1 });
      if (b === 1) { sc.paint(thigh, P.skin, G.SKIN, { n: { m: 'blob', ax: 0.7, ay: 0.8 }, line: 2 }); const sh = sc.mask().cap(hip[0], hip[1], hip[0] + (knee[0] - hip[0]) * 0.5, hip[1] + (knee[1] - hip[1]) * 0.5, 3.5, 3.3); sc.paint(sh, P.bot, G.BOT, { n: BLOB, line: 2 }); }
      else sc.paint(thigh, P.bot, G.BOT, { n: { m: 'blob', ax: 0.7, ay: 0.8 }, line: 2 });
    }
    const shoe = sc.mask().ell(foot[0], foot[1], 2.9, 2.3);
    sc.paint(shoe, P.shoe, G.SHOE, { n: { m: 'blob', ax: 0.8, ay: 0.7 }, line: 2 });
  }
  if (b === 2) { // 치마는 바닥에 둥글게 펼친다
    const m = sc.mask().ell(24, 61.6, av.top === 7 ? 12.4 : 11.2, 4.4);
    m.rect(10, 45, 28, hipY - 2.4 - 45, 0);
    sc.paint(m, P.bot, G.BOT, { n: { m: 'blob', ax: 0.8, ay: 0.6, soft: 6 }, line: 2 });
  }
}

function sideFrame(sc, P, av, pose, view) {
  const F = view === 'left' ? -1 : 1, by = pose.by + LIFT;
  pose = { ...pose, nearArm: [pose.nearArm[0], pose.nearArm[1] + LIFT], farArm: [pose.farArm[0], pose.farArm[1] + LIFT] };
  const X = (d) => 24 + F * d;
  const hc = { x: 24, y: 22.5 + by + (pose.headDy || 0) };
  const H = castHead(sc, P, av, view, hc);
  const shY = 38.6 + by;
  const t = av.top, b = av.bottom;
  paintHead(sc, P, av, H, 'behind');
  // 목 → 먼 팔
  sc.paint(sc.mask().rect(Math.min(X(-2.8), X(2.2)), hc.y + 10.6, 5, 5.2), P.skin, G.SKIN, { tone: 3, line: 2 });
  drawArm(sc, P, av, [X(0.6), shY], [X(pose.farArm[0]), pose.farArm[1] + by], F);
  if (b !== 2) {
    // 먼 다리 → 가까운 다리
    const leg = (foot, far) => {
      const hip = [X(0.2), 50.8 + by], ank = [X(foot[0]), foot[1] - 2.2];
      const bare = b === 1 || b === 2;
      const legM = sc.mask().cap(hip[0], hip[1], ank[0], ank[1], bare ? 2.6 : 3.15, bare ? 2.3 : 2.8);
      sc.paint(legM, bare ? P.skin : P.bot, bare ? G.SKIN : G.BOT, { n: { m: 'blob', ax: 0.8, ay: 0.3 }, bias: far ? -0.14 : 0, line: 2 });
      if (bare) {
        sc.paint(sc.mask().cap(ank[0], ank[1] - 1.3, ank[0], ank[1] + 0.3, 2.25), P.sock, G.BOT, { n: BLOB, line: 1, bias: far ? -0.14 : 0 });
        if (b === 1) sc.paint(sc.mask().cap(hip[0], hip[1], hip[0] + (ank[0] - hip[0]) * 0.34, hip[1] + 5, 3.1), P.bot, G.BOT, { n: BLOB, bias: far ? -0.14 : 0, line: 2 });
      } else if (t === 3) {
        const s = sc.mask(); for (const y of [55.5, 59.5]) s.poly([[hip[0] - F * 3, y + by], [hip[0] - F * 0.2, y + 0.6 + by], [hip[0] - F * 3, y + 1.6 + by]]);
        sc.recolor(s.and(legM), P.top2);
      }
      const shoe = sc.mask().ell(ank[0] + F * 1.5, foot[1], 4.1, 2.5);
      sc.paint(shoe, P.shoe, G.SHOE, { n: { m: 'blob', ax: 0.8, ay: 0.7 }, bias: far ? -0.12 : 0.04, line: 2 });
    };
    leg(pose.far, true); leg(pose.near, false);
  }
  drawTail(sc, P, av, [X(-4.4), 50 + by], [X(-9.6), 51.8 + by], [X(-10.8), 45 + by]);
  // 엉덩이·치마
  if (b === 2) {
    const hanbok = t === 7;
    const pts = hanbok ? [[-5.2, 46.2 + by], [5.4, 46.2 + by], [8.2, 66.4], [-7.6, 66.4]] : [[-5.2, 48.6 + by], [5.4, 48.6 + by], [8.4, 57.6 + by], [-7.8, 57.6 + by]];
    if (!hanbok) {
      for (const [foot, far] of [[pose.far, true], [pose.near, false]]) {
        const ank = [X(foot[0]), foot[1] - 2.2];
        sc.paint(sc.mask().cap(X(0.2), 54 + by, ank[0], ank[1], 2.2, 2.0), P.skin, G.SKIN, { n: BLOB, bias: far ? -0.14 : 0, line: 2 });
        sc.paint(sc.mask().cap(ank[0], ank[1] - 1.3, ank[0], ank[1] + 0.3, 2.2), P.sock, G.BOT, { n: BLOB, line: 1 });
        sc.paint(sc.mask().ell(ank[0] + F * 1.5, foot[1], 4.0, 2.35), P.shoe, G.SHOE, { n: { m: 'blob', ax: 0.8, ay: 0.7 }, bias: far ? -0.12 : 0.04, line: 2 });
      }
    } else {
      sc.paint(sc.mask().ell(X(2.6), 66.2, 3.8, 2.2), P.shoe, G.SHOE, { n: BLOB, line: 2 });
    }
    sc.paint(sc.mask().poly(pts.map(([d, y]) => [X(d), y])), P.bot, G.BOT, { n: { m: 'blob', ax: 0.8, ay: 0.3, soft: 6 }, line: 2 });
  } else {
    sc.paint(sc.mask().poly([[X(-5.2), 48.6 + by], [X(5.4), 48.6 + by], [X(5.6), 54 + by], [X(-5.4), 54 + by]]), P.bot, G.BOT, { n: BLOB, line: 2 });
  }
  if (av.back) {
    const pk = sc.mask().poly([[X(-4.4), 38.2 + by], [X(-8.6), 38.8 + by], [X(-9.8), 41 + by], [X(-9.8), 48.6 + by], [X(-8.6), 50.2 + by], [X(-4.4), 50.2 + by]]);
    sc.paint(pk, P.back, G.BAG, { n: { m: 'blob', ax: 0.85, ay: 0.5 }, line: 2 });
    sc.paint(sc.mask().poly([[X(-8.8), 43.6 + by], [X(-10.4), 44 + by], [X(-10.4), 48.4 + by], [X(-8.8), 49.2 + by]]), P.back, G.BAG, { n: BLOB, bias: 0.05, line: 1 });
  }
  if (t === 1) {
    const m = sc.mask().poly([[X(-5.2), 49.2 + by], [X(5.6), 49.2 + by], [X(6.8), 57.6 + by], [X(-6.4), 57.6 + by]]);
    sc.paint(m, P.top, G.TOP, { n: { m: 'blob', ax: 0.75, ay: 0.3 }, line: 2 });
  }
  const tor = sc.mask().poly(SIDE_T.map(([d, y]) => [X(d), y + by]));
  sc.paint(tor, P.top, G.TOP, { n: { m: 'blob', ax: 0.8, ay: 0.45, soft: 6 }, line: 2 });
  const Y = (y) => y + by;
  const part = (m, ramp, o = {}) => { m.and(tor); return sc.paint(m, ramp, o.grp ?? G.TOP, { n: { m: 'blob', ax: 0.7, ay: 0.4 }, line: o.line ?? 1, bias: o.bias || 0, tone: o.tone }); };
  const rec = (m, ramp, tone) => { m.and(tor); sc.recolor(m, ramp, null, tone); };
  const ret = (m, f) => { m.and(tor); sc.retone(m, f); };
  const R = (d0, y0, d1, y1) => { const a = X(d0), c = X(d1); return sc.mask().rect(Math.min(a, c), Y(y0), Math.abs(c - a), y1 - y0); };
  if (t === 0) part(R(2.2, 36, 4.6, 37.6), P.skin, { grp: G.SKIN, tone: 3, line: 2 });
  if (t === 1) { part(R(3.4, 36, 6, 44.6), P.top2, { line: 1 }); ret(R(2.6, 36.2, 3.4, 50.8), 1); ret(R(-1, 41.2, 2.4, 42.1), 1); }
  if (t === 2) {
    part(R(1.6, 36, 5.2, 37.8), P.collar, { line: 1 });
    ret(R(4.4, 38, 5.4, 50.8), 2);
    for (const y of [41.6, 45.2]) sc.recolor(R(-6, y, 6, y + 1).and(tor), P.top, (x) => Math.floor(x) % 2 === 0, 1);
    rec(R(-6, 47.6, 6, 49.2), P.cream);
    if (F > 0) part(sc.mask().poly([[X(1.2), Y(39.4)], [X(4.2), Y(39.4)], [X(4.2), Y(41.8)], [X(2.7), Y(43)], [X(1.2), Y(41.8)]]), P.red, { line: 2 });
    else part(R(1, 40.2, 4, 41.1), P.white, { line: 0, tone: 1 });
  }
  if (t === 3) {
    part(sc.mask().ell(X(4.2), Y(45.2), 2.4, 5), P.cream, { line: 1 });
    const s = sc.mask(); for (const y of [39, 42.6, 46.2]) s.poly([[X(-6), Y(y)], [X(-1.4), Y(y + 0.6)], [X(-6), Y(y + 1.8)]]);
    s.poly([[X(-1.4), Y(36)], [X(0), Y(38.8)], [X(1.2), Y(36)]]);
    rec(s, P.top2);
  }
  if (t === 4) {
    part(R(2.6, 36, 5.4, 38.6), P.white, { line: 2 });
    part(R(4.2, 37.4, 5.4, 42.6), P.tie, { line: 1 });
    for (const y of [41.4, 44.4, 47.4]) part(R(2.6, y, 3.6, y + 1), P.top2, { line: 0, tone: 1 });
    part(R(-3.2, 36.3, 2.4, 38), P.top2, { line: 1 });
    rec(R(-6, 48.8, 6, 50.4), P.tie);
  }
  if (t === 5) {
    const hd = sc.mask().ell(X(-3.6), Y(37.6), 3.6, 3.2); part(hd, P.top, { line: 2 });
    part(R(1.6, 44.6, 5.6, 48.9), P.top, { line: 1, bias: -0.06 });
    part(R(3.6, 38.6, 4.6, 43.2), P.top2, { line: 0 });
    ret(R(-6, 49.5, 6, 50.9), 1);
  }
  if (t === 6) { part(R(0.4, 35.4, 5.4, 38.3), P.top, { line: 2 }); rec(R(-0.9, 38.4, 0.9, 50.8), P.top2); ret(R(4.6, 36, 5.6, 50.8), 2); }
  if (t === 7) {
    part(sc.mask().cap(X(1.4), Y(36.4), X(5), Y(43), 1.0), P.white, { line: 2 });
    const bow = sc.mask().ell(X(4.6), Y(43.4), 1.4, 1.2); bow.cap(X(4.8), Y(43.8), X(5.6), Y(49.6), 0.9, 1.05);
    part(bow, P.top2, { line: 2 });
  }
  if (b === 3) { part(R(1.6, 42.6, 5.6, 50.4), P.bot, { grp: G.BOT, line: 2 }); part(R(-0.4, 36.4, 1.4, 43), P.bot, { grp: G.BOT, line: 2 }); }
  if (av.back) part(sc.mask().cap(X(-1.2), Y(36.8), X(-3.6), Y(46), 0.95), P.back, { grp: G.BAG, line: 2 });
  sc.retone(sc.mask().ell(hc.x + F * 1, hc.y + 12.6, 7.6, 3.0), 1, [G.TOP, G.SKIN, G.BAG, G.BOT]);
  paintHead(sc, P, av, H, 'main');
  // 가까운 팔
  const am = drawArm(sc, P, av, [X(0.2), shY], [X(pose.nearArm[0]), pose.nearArm[1] + by], -F);
  sc.shadow(am, F > 0 ? 1 : -1, 0.7, 1, [G.TOP, G.BOT]);
}

// ---------------------------------------------------------------- 감정 표현(앞모습)
function emotePose(col) {
  const base = FRONT_POSES[0];
  if (col === 4 || col === 5) return { ...base, arms: [base.arms[0], [33.4, 48.6, 0]], raise: [null, col === 4 ? [36.4, 30.6] : [37.6, 31.4]] };
  if (col === 6) return { ...base, raise: [[11.4, 29.8], [36.6, 29.8]] };
  if (col === 7) return { ...base, jump: 2, raise: [[10.4, 28.4], [37.6, 28.4]] };
  return { by: 7, sit: true, legs: base.legs, arms: [[16.4, 55.6, 0], [31.6, 55.6, 0]] };
}

// ---------------------------------------------------------------- 시트
function renderFrame(P, av, view, col, breath, target, outW, offX, offY) {
  const sc = new Scene(FW, FH, 1, 0, 0, P);
  paintCell(sc, P, av, view, col, breath);
  sc.resolve(target, outW, offX, offY);
  sc.dispose();
  // 발밑 그림자(반투명 타원)
  const jump = view === 'down' && col === 7 ? 1 : 0;
  const rx = jump ? 8.5 : 9.8, ry = 2.6, cy = 68.4;
  for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(24 - rx); i <= Math.ceil(24 + rx); i++) {
    const u = (i + 0.5 - 24) / rx, v = (j + 0.5 - cy) / ry;
    if (u * u + v * v > 1 || j >= FH) continue;
    const q = ((offY + j) * outW + offX + i) * 4;
    if (target[q + 3]) continue;
    target[q] = 26; target[q + 1] = 34; target[q + 2] = 30; target[q + 3] = u * u + v * v > 0.55 ? 52 : 80;
  }
}
function paintCell(sc, P, av, view, col, breath) {
  if (view === 'down' || view === 'up') {
    let pose = col < 4 ? FRONT_POSES[col] : emotePose(col);
    if (breath) pose = { ...pose, by: pose.by + 1, headDy: 0 };
    frontFrame(sc, P, av, pose, view);
  } else {
    let pose = SIDE_POSES[col];
    if (breath) pose = { ...pose, by: pose.by + 1 };
    sideFrame(sc, P, av, pose, view);
  }
}

function renderSheetData(input) {
  const av = sanitizeAvatar(input);
  const P = palette(av);
  const w = COLS * FW, h = 4 * FH, data = new Uint8ClampedArray(w * h * 4);
  const dirs = ['down', 'left', 'right', 'up'];
  headCache = new Map();
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) renderFrame(P, av, dirs[r], c, false, data, w, c * FW, r * FH);
  for (let c = 4; c < 9; c++) renderFrame(P, av, 'down', c, false, data, w, c * FW, 0);
  // 숨 고르기(1줄 4~7칸)
  dirs.forEach((dname, k) => renderFrame(P, av, dname, 0, true, data, w, (4 + k) * FW, FH));
  // 나머지 빈 칸: 앞모습 감정 표현 복사
  const copy = (sc, sr, dc, dr) => { for (let y = 0; y < FH; y++) data.copyWithin(((dr * FH + y) * w + dc * FW) * 4, ((sr * FH + y) * w + sc * FW) * 4, ((sr * FH + y) * w + sc * FW + FW) * 4); };
  copy(8, 0, 8, 1);
  for (let r = 2; r < 4; r++) for (let c = 4; c < 9; c++) copy(c, 0, c, r);
  headCache = null;
  return { w, h, data, av };
}

const sheetCache = new Map();
export function getAvatarSheet(input) {
  const av = sanitizeAvatar(input), key = avatarKey(av);
  let sheet = sheetCache.get(key);
  if (sheet) return sheet;
  const { w, h, data } = renderSheetData(av);
  sheet = document.createElement('canvas');
  sheet.width = w; sheet.height = h;
  sheet.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  if (sheetCache.size > 200) sheetCache.delete(sheetCache.keys().next().value);
  sheetCache.set(key, sheet);
  return sheet;
}

// 현재 상태에 맞는 (열, 줄)을 고른다.
export function frameFor({ dir, moving, run, emote, t = 0 }) {
  const row = ROW_OF[dir] ?? 0;
  if (emote === 'sit') return { col: COL.sit, row: 0 };
  if (emote === 'wave') return { col: COL.wave + (Math.floor(t * 5) % 2), row: 0 };
  if (emote === 'cheer') return { col: COL.cheer + (Math.floor(t * 4) % 2), row: 0 };
  if (!moving) return Math.floor(t * 1.6) % 2 ? { ...(BREATH[dir] || BREATH.down) } : { col: 0, row };
  const fps = run ? 11 : 8;
  return { col: Math.floor(t * fps) % 4, row };
}

// 대화창용 얼굴·어깨 초상화(앞모습). 도트 크기를 키워 선명하게 그린다.
function renderPortraitData(input, size = 96) {
  const av = sanitizeAvatar(input), P = palette(av);
  const S = Math.max(1, Math.floor(size / 44)), region = size / S;
  const ox = 24 - region / 2, oy = 25.5 - region / 2;
  const sc = new Scene(size, size, S, ox, oy, P);
  frontFrame(sc, P, av, FRONT_POSES[0], 'down');
  const data = new Uint8ClampedArray(size * size * 4);
  sc.resolve(data, size, 0, 0);
  sc.dispose();
  return { w: size, h: size, data };
}
const portraitCache = new Map();
export function getPortrait(input, size = 96) {
  const av = sanitizeAvatar(input), key = `${avatarKey(av)}@${size}`;
  let c = portraitCache.get(key);
  if (c) return c;
  const { w, h, data } = renderPortraitData(av, size);
  c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  if (portraitCache.size > 100) portraitCache.delete(portraitCache.keys().next().value);
  portraitCache.set(key, c);
  return c;
}

// 시험·미리보기용(캔버스 없이 RGBA 버퍼만 만든다)
export const _debug = { renderSheetData, renderPortraitData, EYES, EYE_SIDE, MOUTHS };
