// 간판·문장·깃발에 들어가는 작은 그림(글자 없음). 모양은 -1..1 좌표의 함수로 정의하고 왼쪽 위 빛으로 명암을 넣는다.
import { tone, clamp01 } from './scenery-core.mjs';

function inPoly(u, v, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const STAR = (() => { const p = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 0.42 : 1; p.push([Math.cos(a) * r, Math.sin(a) * r * 0.98 + 0.06]); } return p; })();
const BOLT = [[0.2, -1], [-0.55, 0.12], [-0.05, 0.12], [-0.3, 1], [0.6, -0.2], [0.08, -0.2], [0.38, -1]];
const CRYSTAL = [[0, -1], [0.5, -0.45], [0.5, 0.5], [0, 1], [-0.5, 0.5], [-0.5, -0.45]];

// 모양 함수: 1 = 채움, 2 = 안쪽 무늬(더 밝거나 어둡게), 0 = 비움
const SHAPES = {
  star: (u, v) => (inPoly(u, v, STAR) ? (Math.abs(u) + Math.abs(v - 0.05) < 0.3 ? 2 : 1) : 0),
  bolt: (u, v) => (inPoly(u, v, BOLT) ? 1 : 0),
  heart: (u, v) => {
    const x = u * 1.2, y = -v * 1.2 + 0.3, a = x * x + y * y - 1;
    if (a * a * a - x * x * y * y * y > 0) return 0;
    return Math.hypot(x + 0.45, y - 0.5) < 0.22 ? 2 : 1;
  },
  crystal: (u, v) => (inPoly(u, v, CRYSTAL) ? (u < -0.05 && u > -0.25 && v > -0.6 && v < 0.5 ? 2 : 1) : 0),
  gear: (u, v) => {
    const r = Math.hypot(u, v), a = Math.atan2(v, u);
    if (r < 0.3) return 0;
    if (r < 0.66) return r < 0.4 ? 2 : 1;
    return r < 0.95 && Math.cos(a * 8) > 0.2 ? 1 : 0;
  },
  clock: (u, v) => {
    const r = Math.hypot(u, v);
    if (r > 0.98) return 0;
    if (r > 0.8) return 1;
    if ((Math.abs(u) < 0.09 && v < 0.05 && v > -0.62) || (Math.abs(v) < 0.09 && u > -0.05 && u < 0.45)) return 3;
    const a = Math.atan2(v, u), tick = Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) > 0.42 && r > 0.62;
    return tick ? 3 : 2;
  },
  bell: (u, v) => {
    if (v > 0.62 && v < 0.95 && Math.hypot(u, v - 0.78) < 0.2) return 1;
    if (v < -0.85 || v > 0.62) return 0;
    const t = (v + 0.85) / 1.47, w = 0.28 + 0.34 * t * t + (t > 0.85 ? (t - 0.85) * 2.2 : 0);
    if (Math.abs(u) > w) return 0;
    return t > 0.8 && t < 0.9 ? 2 : 1;
  },
  flame: (u, v) => {
    const t = (v + 1) / 2;
    const w = Math.sin(Math.pow(t, 0.8) * Math.PI) * 0.72 * (t > 0.75 ? 1 : 0.9 + t * 0.1) + Math.sin(v * 7) * 0.05;
    const s = u + Math.sin(t * 5) * 0.12 * (1 - t);
    if (Math.abs(s) > w) return 0;
    return Math.abs(s) < w * 0.45 && t > 0.4 ? 2 : 1;
  },
  leaf: (u, v) => {
    const a = -0.75, x = u * Math.cos(a) - v * Math.sin(a), y = u * Math.sin(a) + v * Math.cos(a);
    if ((x * x) / 0.95 + (y * y) / 0.22 > 1) return (Math.abs(u + v * 0.1 + 0.55) < 0.08 && v > 0.5 && v < 1) ? 1 : 0;
    return Math.abs(y) < 0.06 ? 2 : 1;
  },
  book: (u, v) => {
    if (Math.abs(u) > 0.95 || v > 0.7) return 0;
    const top = -0.55 + Math.abs(u) * -0.12 + (Math.abs(u) < 0.08 ? 0.15 : 0);
    if (v < top) return 0;
    if (Math.abs(u) < 0.06) return 3;
    if (v > 0.55) return 3;
    const line = Math.abs(u) > 0.2 && Math.abs(u) < 0.8 && ((v + 0.3) % 0.25 + 0.25) % 0.25 < 0.07 && v < 0.4;
    return line ? 2 : 1;
  },
  wheat: (u, v) => {
    if (Math.abs(u + (v - 0.95) * 0.05) < 0.1 && v > -0.35 && v < 0.98) return 3;
    const e = (cx, cy, a, rx = 0.27, ry = 0.14) => { const dx = u - cx, dy = v - cy, c = Math.cos(a), s = Math.sin(a), px = dx * c + dy * s, py = -dx * s + dy * c; return (px * px) / (rx * rx) + (py * py) / (ry * ry) < 1; };
    for (let k = 0; k < 3; k++) {
      const yy = -0.5 + k * 0.3;
      if (e(-0.2, yy, -1.0)) return k === 0 ? 2 : 1;
      if (e(0.2, yy, 1.0)) return 1;
    }
    if (e(0, -0.8, Math.PI / 2, 0.24, 0.13)) return 2;
    if (e(0.3, 0.55, -0.6, 0.26, 0.09)) return 1;
    return 0;
  },
};

// rp: 명암 램프(어두움→밝음). 윤곽은 램프 가장 어두운 색보다 더 어둡게.
export function icon(R, kind, cx, cy, s, rp, { outline = true, ink = null } = {}) {
  const f = SHAPES[kind];
  if (!f) return;
  const x0 = Math.floor(cx - s), x1 = Math.ceil(cx + s), y0 = Math.floor(cy - s), y1 = Math.ceil(cy + s);
  const inside = (x, y) => f((x + 0.5 - cx) / s, (y + 0.5 - cy) / s);
  const dark = ink || rp[0].map((v) => v * 0.55);
  for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    const k = inside(x, y);
    if (k) {
      const u = (x + 0.5 - cx) / s, v = (y + 0.5 - cy) / s;
      let t = 0.62 - u * 0.16 - v * 0.2;
      if (!inside(x - 1, y) || !inside(x, y - 1)) t += 0.22;
      if (!inside(x + 1, y) || !inside(x, y + 1)) t -= 0.22;
      if (k === 2) t += 0.25;
      if (k === 3) t = 0.08;
      R.set(x, y, tone(rp, clamp01(t), x, y, 0.5));
    } else if (outline && (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1))) R.set(x, y, dark);
  }
}
export const ICONS = Object.keys(SHAPES);
