// 풍경 그림 공용 도구: 잡음, 색 램프(명암 단계), 작은 RGBA 래스터(그림자·윤곽선·빛 번짐 포함).
// 모든 스프라이트와 바닥이 이 파일의 도구로 그려진다. 빛은 왼쪽 위에서 오고 그림자는 오른쪽 아래로 진다.

export const T = 32;

// ---------------------------------------------------------------- 잡음
export function hash(x, y, s = 0) {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1597334677)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = Math.imul(n ^ (n >>> 16), 2246822519);
  return (n ^ (n >>> 15)) >>> 0;
}
export const rnd = (x, y, s = 0) => hash(x, y, s) / 4294967296;

export function vnoise(x, y, sc, s = 0) {
  const gx = x / sc, gy = y / sc, x0 = Math.floor(gx), y0 = Math.floor(gy);
  let fx = gx - x0, fy = gy - y0;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = rnd(x0, y0, s), b = rnd(x0 + 1, y0, s), c = rnd(x0, y0 + 1, s), d = rnd(x0 + 1, y0 + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(x, y, sc, s = 0, oct = 3) {
  let v = 0, amp = 0.5, tot = 0;
  for (let o = 0; o < oct; o++) { v += vnoise(x, y, sc, s + o * 17) * amp; tot += amp; amp *= 0.5; sc /= 2; }
  return v / tot;
}

// 격자 전체에 값 잡음을 한 줄씩 더한다(가로·세로 크기를 따로 줄 수 있다). 픽셀당 연산이 몇 개뿐이라 큰 맵도 빠르다.
export function addNoise(F, W, H, scx, scy, seed, amp, ox = 0, oy = 0) {
  const bx = Math.floor(ox / scx);
  const nx = Math.floor((W - 1 + ox) / scx) - bx + 2;
  const xi = new Int32Array(W), xs = new Float32Array(W);
  for (let x = 0; x < W; x++) { const g = (x + ox) / scx, i = Math.floor(g), f = g - i; xi[x] = i - bx; xs[x] = f * f * (3 - 2 * f); }
  let A = new Float32Array(nx), B = new Float32Array(nx);
  const C = new Float32Array(nx);
  let last = -1e9;
  for (let y = 0; y < H; y++) {
    const g = (y + oy) / scy, y0 = Math.floor(g); let f = g - y0; f = f * f * (3 - 2 * f);
    if (y0 !== last) {
      if (y0 === last + 1) { const t = A; A = B; B = t; for (let i = 0; i < nx; i++) B[i] = rnd(bx + i, y0 + 1, seed); }
      else for (let i = 0; i < nx; i++) { A[i] = rnd(bx + i, y0, seed); B[i] = rnd(bx + i, y0 + 1, seed); }
      last = y0;
    }
    for (let i = 0; i < nx; i++) C[i] = A[i] + (B[i] - A[i]) * f;
    const row = y * W;
    for (let x = 0; x < W; x++) { const i = xi[x], a = C[i]; F[row + x] += amp * (a + (C[i + 1] - a) * xs[x]); }
  }
}

// 결정적 난수(스프라이트마다 같은 씨앗이면 같은 그림)
export function rng(seed) {
  let a = (seed | 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function strSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const BAYER = Float32Array.from(B4, (v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

// ---------------------------------------------------------------- 색
const cssCache = new Map();
let cssCtx = null;
export function col(c) {
  if (Array.isArray(c)) return c;
  let v = cssCache.get(c);
  if (v) return v;
  if (/^#[0-9a-f]{6}$/i.test(c)) { const n = parseInt(c.slice(1), 16); v = [n >> 16, (n >> 8) & 255, n & 255]; }
  else {
    if (!cssCtx) cssCtx = document.createElement('canvas').getContext('2d');
    cssCtx.fillStyle = '#000'; cssCtx.fillStyle = c;
    const s = cssCtx.fillStyle;
    if (s[0] === '#') { const n = parseInt(s.slice(1), 16); v = [n >> 16, (n >> 8) & 255, n & 255]; }
    else { const m = s.match(/[\d.]+/g) || [0, 0, 0]; v = [+m[0], +m[1], +m[2]]; }
  }
  cssCache.set(c, v);
  return v;
}
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// 어두운 쪽은 파랗게(차갑게), 밝은 쪽은 노랗게(따뜻하게) 색상을 옮겨 가며 명암을 만든다.
export const darken = (c, k) => [c[0] * (1 - k * 1.06), c[1] * (1 - k * 0.97), c[2] * (1 - k * 0.72)];
export const lighten = (c, k) => [c[0] + (255 - c[0]) * k, c[1] + (246 - c[1]) * k * 0.96, c[2] + (206 - c[2]) * k * 0.86];
export const tint = (c, k) => (k < 0 ? darken(c, -k) : lighten(c, k));
export function ramp(base, n = 6, { dark = 0.62, light = 0.42, mid = 0.55 } = {}) {
  base = col(base);
  const out = [], bi = (n - 1) * mid;
  for (let i = 0; i < n; i++) {
    const c = i <= bi ? darken(base, ((bi - i) / bi) * dark) : lighten(base, ((i - bi) / (n - 1 - bi)) * light);
    out.push(c.map((v) => Math.max(0, Math.min(255, Math.round(v)))));
  }
  return out;
}
// 연속값 v(0..1) → 램프 색(바이어 디더링)
export function tone(rp, v, x, y, dz = 1) {
  const n = rp.length;
  let i = Math.round(v * (n - 1) + (bayer(x, y) - 0.5) * dz);
  return rp[i < 0 ? 0 : i >= n ? n - 1 : i];
}
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// 빛 방향(왼쪽 위 앞)
const Ln = Math.hypot(-0.52, -0.62, 0.58);
export const L = [-0.52 / Ln, -0.62 / Ln, 0.58 / Ln];
export function lambert(nx, ny) {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return nx * L[0] + ny * L[1] + nz * L[2];
}

// ---------------------------------------------------------------- 래스터
export class Ras {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
    this.sh = new Float32Array(w * h);
    this.glows = [];
  }
  set(x, y, c, a = 1) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    if (c.length > 3) a *= c[3];
    if (a <= 0.004) return;
    const d = this.d, i = (y * this.w + x) * 4;
    if (a >= 0.996 || d[i + 3] === 0) {
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = Math.max(d[i + 3], a * 255);
      if (a >= 0.996) d[i + 3] = 255;
      return;
    }
    const da = d[i + 3] / 255, oa = a + da * (1 - a);
    d[i] = (c[0] * a + d[i] * da * (1 - a)) / oa;
    d[i + 1] = (c[1] * a + d[i + 1] * da * (1 - a)) / oa;
    d[i + 2] = (c[2] * a + d[i + 2] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }
  a(x, y) { x = Math.floor(x); y = Math.floor(y); return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[(y * this.w + x) * 4 + 3]; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; const i = (y * this.w + x) * 4, d = this.d; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; }
  // 이미 칠한 색에 명암만 더한다(k<0 어둡게)
  shadeAt(x, y, k) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.d;
    if (!d[i + 3]) return;
    const c = tint([d[i], d[i + 1], d[i + 2]], k);
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  _paint(x, y, c, args) {
    const v = typeof c === 'function' ? c(x, y, ...args) : c;
    if (v) this.set(x, y, v);
  }
  rect(x, y, w, h, c) {
    const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      const v = typeof c === 'function' ? c(i, j, (i - x0 + 0.5) / (x1 - x0), (j - y0 + 0.5) / (y1 - y0)) : c;
      if (v) this.set(i, j, v);
    }
  }
  // 타원: 셰이더는 (x, y, nx, ny) — nx, ny는 중심 기준 -1..1
  ell(cx, cy, rx, ry, c) {
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx), y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const nx = (i + 0.5 - cx) / rx, ny = (j + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      const v = typeof c === 'function' ? c(i, j, nx, ny) : c;
      if (v) this.set(i, j, v);
    }
  }
  // 다각형(짝홀 규칙): 셰이더는 (x, y, u, v) — u, v는 외접 사각형 기준 0..1
  poly(pts, c) {
    let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9;
    for (const [px, py] of pts) { minY = Math.min(minY, py); maxY = Math.max(maxY, py); minX = Math.min(minX, px); maxX = Math.max(maxX, px); }
    const n = pts.length, xs = [];
    for (let j = Math.floor(minY); j <= Math.ceil(maxY); j++) {
      const yy = j + 0.5; xs.length = 0;
      for (let k = 0; k < n; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % n];
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let i = Math.round(xs[k]); i < Math.round(xs[k + 1]); i++) {
          const v = typeof c === 'function' ? c(i, j, (i + 0.5 - minX) / (maxX - minX || 1), (yy - minY) / (maxY - minY || 1)) : c;
          if (v) this.set(i, j, v);
        }
      }
    }
  }
  line(x0, y0, x1, y1, c, th = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 1.5));
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (th <= 1) this.set(x, y, typeof c === 'function' ? c(x, y, t) : c);
      else this.rect(Math.round(x - th / 2), Math.round(y - th / 2), th, th, typeof c === 'function' ? c(x, y, t) : c);
    }
  }
  // 두께가 변하는 곡선(가지·잎줄기·밧줄)
  stroke(pts, w0, w1, c) {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
      for (let s = 0; s <= n; s++) {
        const t = (k + s / n) / (pts.length - 1), x = ax + (bx - ax) * (s / n), y = ay + (by - ay) * (s / n);
        const r = (w0 + (w1 - w0) * t) / 2;
        for (let j = Math.floor(y - r); j <= Math.ceil(y + r); j++) for (let i = Math.floor(x - r); i <= Math.ceil(x + r); i++) {
          const dx = i + 0.5 - x, dy = j + 0.5 - y;
          if (dx * dx + dy * dy <= r * r + 0.25) {
            const v = typeof c === 'function' ? c(i, j, t, dx / (r || 1), dy / (r || 1)) : c;
            if (v) this.set(i, j, v);
          }
        }
      }
    }
  }
  // 바닥 그림자(부드러운 타원·다각형). 값은 최종 불투명도(0..1).
  sEll(cx, cy, rx, ry, a = 0.4) {
    for (let j = Math.floor(cy - ry - 1); j <= Math.ceil(cy + ry + 1); j++) for (let i = Math.floor(cx - rx - 1); i <= Math.ceil(cx + rx + 1); i++) {
      if (i < 0 || j < 0 || i >= this.w || j >= this.h) continue;
      const nx = (i + 0.5 - cx) / rx, ny = (j + 0.5 - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) continue;
      const v = a * Math.min(1, (1 - d) * 2.2);
      const k = j * this.w + i;
      if (v > this.sh[k]) this.sh[k] = v;
    }
  }
  sPoly(pts, a = 0.4) {
    const saveD = this.d; // 다각형 채우기를 재사용하려고 임시 버퍼에 그린다
    const w = this.w, sh = this.sh;
    this.d = new Uint8ClampedArray(this.w * this.h * 4);
    this.poly(pts, [0, 0, 0]);
    const tmp = this.d; this.d = saveD;
    for (let k = 0; k < w * this.h; k++) if (tmp[k * 4 + 3] && a > sh[k]) sh[k] = a;
  }
  sRect(x, y, w, h, a = 0.4) { this.sPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], a); }
  // 투명 칸 가운데 그림과 맞닿은 칸에 "이웃 색을 어둡게 한 색"으로 윤곽을 두른다(아래·옆은 진하게, 위는 옅게).
  outline({ ink = [34, 24, 30], bottom = 0.5, side = 0.42, top = 0.22, minA = 150, x0 = 0, y0 = 0, x1 = this.w, y1 = this.h } = {}) {
    const { w, h } = this, src = this.d.slice(), d = this.d;
    const A = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : src[(j * w + i) * 4 + 3]);
    for (let j = Math.max(0, y0); j < Math.min(h, y1); j++) for (let i = Math.max(0, x0); i < Math.min(w, x1); i++) {
      if (A(i, j) > 40) continue;
      let k = -1, f = 0;
      if (A(i, j - 1) >= minA) { k = ((j - 1) * w + i) * 4; f = bottom; }
      else if (A(i - 1, j) >= minA) { k = (j * w + i - 1) * 4; f = side; }
      else if (A(i + 1, j) >= minA) { k = (j * w + i + 1) * 4; f = side; }
      else if (A(i, j + 1) >= minA) { k = ((j + 1) * w + i) * 4; f = top; }
      if (k < 0) continue;
      const q = (j * w + i) * 4, keep = 1 - f * 1.25;
      d[q] = src[k] * keep * 0.8 + ink[0] * f;
      d[q + 1] = src[k + 1] * keep * 0.8 + ink[1] * f;
      d[q + 2] = src[k + 2] * keep * 0.85 + ink[2] * f;
      d[q + 3] = 255;
    }
  }
  glow(cx, cy, r, c = [255, 214, 140], a = 0.5) { this.glows.push([cx, cy, r, col(c), a]); }
  _blurShadow(r) {
    const { w, h } = this; let s = this.sh;
    const t = new Float32Array(w * h);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) {
        let acc = 0; const row = y * w;
        for (let x = -r; x <= r; x++) acc += s[row + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) {
          t[row + x] = acc / (2 * r + 1);
          acc += s[row + Math.min(w - 1, x + r + 1)] - s[row + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += t[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) {
          s[y * w + x] = acc / (2 * r + 1);
          acc += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x];
        }
      }
    }
    this.sh = s;
  }
  canvas({ blur = 2, sc = [22, 30, 30] } = {}) {
    const { w, h, d } = this;
    if (blur > 0) this._blurShadow(blur);
    const sh = this.sh;
    for (let k = 0; k < w * h; k++) {
      const s = sh[k];
      if (s <= 0.003) continue;
      const q = k * 4, oa = d[q + 3] / 255;
      if (oa >= 1) continue;
      const na = oa + s * (1 - oa);
      d[q] = (d[q] * oa + sc[0] * s * (1 - oa)) / na;
      d[q + 1] = (d[q + 1] * oa + sc[1] * s * (1 - oa)) / na;
      d[q + 2] = (d[q + 2] * oa + sc[2] * s * (1 - oa)) / na;
      d[q + 3] = na * 255;
    }
    for (const [cx, cy, r, c, a] of this.glows) {
      for (let j = Math.max(0, Math.floor(cy - r)); j < Math.min(h, Math.ceil(cy + r)); j++) for (let i = Math.max(0, Math.floor(cx - r)); i < Math.min(w, Math.ceil(cx + r)); i++) {
        const dd = Math.hypot(i + 0.5 - cx, j + 0.5 - cy) / r;
        if (dd >= 1) continue;
        const g = a * (1 - dd) * (1 - dd);
        const q = (j * w + i) * 4, da = d[q + 3] / 255, na = da + g * (1 - da);
        const lr = Math.min(255, d[q] + c[0] * g), lg = Math.min(255, d[q + 1] + c[1] * g), lb = Math.min(255, d[q + 2] + c[2] * g);
        d[q] = (lr * da + c[0] * g * (1 - da)) / na;
        d[q + 1] = (lg * da + c[1] * g * (1 - da)) / na;
        d[q + 2] = (lb * da + c[2] * g * (1 - da)) / na;
        d[q + 3] = na * 255;
      }
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.putImageData(new ImageData(d, w, h), 0, 0);
    return c;
  }
}

// ---------------------------------------------------------------- 칠하기 도우미
// 세로 원통(기둥·통·나무줄기): 왼쪽이 밝고 오른쪽이 어둡다. tex(x,y)로 무늬를 더한다.
export function cylV(R, x, y, w, h, rp, { tex = null, bias = 0, amp = 0.55, dz = 0.9 } = {}) {
  R.rect(x, y, w, h, (i, j, u) => {
    const n = u * 2 - 1;
    let v = 0.5 + bias + lambert(n * 0.95, -0.1) * amp - 0.18;
    if (tex) v += tex(i, j, u);
    return tone(rp, clamp01(v), i, j, dz);
  });
}
// 타원체(덤불·바위·과일): 구면 조명 + 잡음
export function blob(R, cx, cy, rx, ry, rp, { tex = null, bias = 0, amp = 0.7, dz = 0.9 } = {}) {
  R.ell(cx, cy, rx, ry, (i, j, nx, ny) => {
    let v = 0.42 + bias + lambert(nx * 0.9, ny * 0.9) * amp - 0.2;
    if (tex) v += tex(i, j, nx, ny);
    return tone(rp, clamp01(v), i, j, dz);
  });
}
// 윗면 + 앞면이 보이는 상자(3/4 시점)
export function box(R, x, y, w, top, front, rpTop, rpFront, { tex = null, texTop = null } = {}) {
  R.rect(x, y, w, top, (i, j, u, v) => tone(rpTop, clamp01(0.62 - v * 0.12 + (texTop ? texTop(i, j, u, v) : 0) + (u < 0.04 ? 0.12 : 0)), i, j));
  R.rect(x, y + top, w, front, (i, j, u, v) => tone(rpFront, clamp01(0.5 - v * 0.2 + (tex ? tex(i, j, u, v) : 0) + (u < 0.05 ? 0.12 : u > 0.95 ? -0.14 : 0) + (v < 0.06 ? 0.15 : 0)), i, j));
}

// 스프라이트 결과 객체
export function out(R, ax, ay, extra = {}, opts = {}) {
  let c = R.canvas(opts);
  if (opts.crop === false) return { c, ax, ay, w: R.w, h: R.h, ...extra };
  // 빈 여백을 잘라 낸다(앵커는 따라 옮긴다)
  const d = R.d, w = R.w, h = R.h;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 2) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { c, ax, ay, w, h, ...extra };
  x0 = Math.max(0, Math.min(x0 - 1, Math.round(ax) - 1)); y0 = Math.max(0, y0 - 1);
  x1 = Math.min(w - 1, Math.max(x1 + 1, Math.round(ax) + 1)); y1 = Math.min(h - 1, Math.max(y1 + 1, Math.round(ay) + 1));
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  if (cw === w && ch === h) return { c, ax, ay, w, h, ...extra };
  const c2 = document.createElement('canvas');
  c2.width = cw; c2.height = ch;
  c2.getContext('2d').drawImage(c, -x0, -y0);
  return { c: c2, ax: Math.round(ax) - x0, ay: Math.round(ay) - y0, w: cw, h: ch, ...extra };
}

// 작은 세포 무늬(잎 뭉치·바위 면·돌 쌓기). 결과: C.f1, C.f2(가장 가까운/두 번째 거리), C.cx, C.cy(세포 중심), C.id
export const C = { f1: 0, f2: 0, cx: 0, cy: 0, id: 0 };
export function cells(x, y, cw, ch, seed, jit = 0.8) {
  const gx = Math.floor(x / cw), gy = Math.floor(y / ch);
  let b1 = 1e9, b2 = 1e9, bx = 0, by = 0, bid = 0;
  for (let j = gy - 1; j <= gy + 1; j++) for (let i = gx - 1; i <= gx + 1; i++) {
    const h = hash(i, j, seed);
    const px = (i + 0.5 + ((h & 255) / 255 - 0.5) * jit) * cw, py = (j + 0.5 + (((h >>> 8) & 255) / 255 - 0.5) * jit) * ch;
    const dx = (x - px) / cw, dy = (y - py) / ch, d = dx * dx + dy * dy;
    if (d < b1) { b2 = b1; b1 = d; bx = px; by = py; bid = h; } else if (d < b2) b2 = d;
  }
  C.f1 = Math.sqrt(b1); C.f2 = Math.sqrt(b2); C.cx = bx; C.cy = by; C.id = bid;
  return C;
}
