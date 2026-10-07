// 도트 그림 도구: 명암이 들어간 블록·타원, 주변 색을 따르는 윤곽선, 바닥 그림자.
const rgbCache = new Map();
export function toRgb(c) {
  if (Array.isArray(c)) return c;
  let v = rgbCache.get(c);
  if (v) return v;
  if (c[0] === '#') { const n = parseInt(c.slice(1), 16); v = [n >> 16, (n >> 8) & 255, n & 255]; } else { const m = c.match(/[\d.]+/g); v = [+m[0], +m[1], +m[2]]; }
  rgbCache.set(c, v);
  return v;
}

// k > 0 밝게(살짝 따뜻하게), k < 0 어둡게(살짝 푸르게)
const shadeCache = new Map();
export function shade(c, k) {
  if (!k) return c;
  const key = `${c}|${k}`;
  let v = shadeCache.get(key);
  if (v) return v;
  let [r, g, b] = toRgb(c);
  if (k < 0) { r *= 1 + k; g *= 1 + k * 0.95; b *= 1 + k * 0.75; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k * 0.85; }
  v = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  shadeCache.set(key, v);
  return v;
}

export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

export const FLAT = { hi: 0, lo: 0, side: 0 };
const CORNER = [[], [1], [2, 1], [3, 1, 1], [4, 2, 1, 1], [5, 3, 2, 1, 1]];

export class Pen {
  constructor(cx, ox = 0, oy = 0) { this.cx = cx; this.ox = ox; this.oy = oy; }
  rect(x, y, w, h, c) { if (w <= 0 || h <= 0) return; this.cx.fillStyle = c; this.cx.fillRect(this.ox + x, this.oy + y, w, h); }
  px(x, y, c) { this.rect(x, y, 1, 1, c); }

  // 줄마다 [시작x, 끝x]로 모양을 채우고, 위로 드러난 칸은 밝게·아래로 드러난 칸은 어둡게·양 끝은 약하게 명암
  spans(y0, spans, c, { hi = 0.2, lo = -0.22, side = 0.1 } = {}) {
    const cH = shade(c, hi), cL = shade(c, lo), cS = shade(c, side), cD = shade(c, -side);
    const n = spans.length;
    const covers = (j, x) => j >= 0 && j < n && spans[j] && x >= spans[j][0] && x <= spans[j][1];
    for (let j = 0; j < n; j++) {
      const s = spans[j];
      if (!s) continue;
      const [a, b] = s, y = y0 + j;
      this.rect(a, y, b - a + 1, 1, c);
      if (side) { this.px(a, y, cS); if (b > a) this.px(b, y, cD); }
      if (!hi && !lo) continue;
      let run = a, runC = null;
      for (let x = a; x <= b + 1; x++) {
        let col = null;
        if (x <= b) { if (hi && !covers(j - 1, x)) col = cH; else if (lo && !covers(j + 1, x)) col = cL; }
        if (col !== runC) { if (runC) this.rect(run, y, x - run, 1, runC); run = x; runC = col; }
      }
    }
  }

  static rr(x, w, h, r) {
    const cut = CORNER[Math.min(r, CORNER.length - 1)];
    const s = [];
    for (let j = 0; j < h; j++) {
      const i = Math.max(j < cut.length ? cut[j] : 0, h - 1 - j < cut.length ? cut[h - 1 - j] : 0);
      s.push(w - 2 * i > 0 ? [x + i, x + w - 1 - i] : null);
    }
    return s;
  }
  blk(x, y, w, h, c, o = {}) { if (w > 0 && h > 0) this.spans(y, Pen.rr(x, w, h, o.r || 0), c, o); }

  static el(x, w, h) {
    const s = [], rx = w / 2, ry = h / 2;
    for (let j = 0; j < h; j++) {
      const dy = (j + 0.5 - ry) / ry;
      const half = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
      const a = Math.round(x + rx - half), b = Math.round(x + rx + half) - 1;
      s.push(b >= a ? [a, b] : null);
    }
    return s;
  }
  ellipse(x, y, w, h, c) { Pen.el(x, w, h).forEach((s, j) => s && this.rect(s[0], y + j, s[1] - s[0] + 1, 1, c)); }
  ell(x, y, w, h, c, o = {}) { this.spans(y, Pen.el(x, w, h), c, o); }
}

// 투명 칸 중 그림과 맞닿은 칸에 "이웃 색을 어둡게 한 색"으로 1px 윤곽선을 두른다.
export function selout(cx, x, y, w, h, mix = 0.6, ink = [44, 30, 52]) {
  const img = cx.getImageData(x, y, w, h), a = img.data;
  const A = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : a[(j * w + i) * 4 + 3]);
  const out = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (A(i, j) > 40) continue;
      let k = -1;
      if (A(i, j + 1) > 150) k = (j + 1) * w + i;
      else if (A(i, j - 1) > 150) k = (j - 1) * w + i;
      else if (A(i - 1, j) > 150) k = j * w + i - 1;
      else if (A(i + 1, j) > 150) k = j * w + i + 1;
      if (k >= 0) out.push(j * w + i, k);
    }
  }
  for (let n = 0; n < out.length; n += 2) {
    const q = out[n] * 4, s = out[n + 1] * 4;
    a[q] = a[s] * (1 - mix) * 0.7 + ink[0] * mix;
    a[q + 1] = a[s + 1] * (1 - mix) * 0.7 + ink[1] * mix;
    a[q + 2] = a[s + 2] * (1 - mix) * 0.75 + ink[2] * mix;
    a[q + 3] = 255;
  }
  cx.putImageData(img, x, y);
}

// 그림 밑에 깔리는 도트 타원 그림자
export function dropShadow(cx, x, y, rx, ry, alpha = 0.24) {
  cx.save();
  cx.globalCompositeOperation = 'destination-over';
  cx.fillStyle = `rgba(24,44,34,${alpha})`;
  const s = Pen.el(x - rx, rx * 2, ry * 2);
  s.forEach((sp, j) => sp && cx.fillRect(sp[0], Math.round(y - ry) + j, sp[1] - sp[0] + 1, 1));
  cx.restore();
}
