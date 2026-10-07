// 풍경 그림 진입점: 바닥(buildSceneGround), 소품·나무(getSceneSprite), 건물(getBuildingSprite), 빛 번짐(drawGlow), 전선(drawWire).
// 모든 그림은 코드로 그린다(이미지 파일 없음). 1 월드 px = 1 캔버스 px, 타일 32×32. 빛은 왼쪽 위, 그림자는 오른쪽 아래.
import { Ras, out } from './scenery-core.mjs';
import { NATURE } from './scenery-nature.mjs';
import { TOWN } from './scenery-town.mjs';
import { PROPS } from './scenery-props.mjs';
export { buildSceneGround } from './scenery-ground.mjs';
export { getBuildingSprite } from './scenery-build.mjs';

const MAKERS = { ...NATURE, ...TOWN, ...PROPS };

// 미리보기와 다른 모듈이 목록을 알 수 있게 종류·변형을 적어 둔다(첫 변형이 기본값).
export const CATALOG = [
  ['tree', ['oak', 'pine', 'autumn', 'blossom', 'palm']],
  ['bush', ['green', 'flower']],
  ['flowers', ['red', 'yellow', 'white', 'purple']],
  ['rock', ['small', 'large']],
  ['stump'], ['grass-tuft'], ['reeds'], ['lily'],
  ['lamp', ['on', 'off']], ['bench'], ['fountain'], ['flowerbed'], ['signpost'], ['noticeboard'], ['well'],
  ['barrel'], ['crate'], ['crates'], ['fence-h'], ['fence-v'], ['hedge-h'], ['statue'],
  ['banner', ['farm', 'fire', 'power', 'future', 'life', 'school']],
  ['plaza-sign', ['off', 'on']],
  ['gate', ['farm', 'power', 'fire', 'future', 'life']],
  ['crops', ['sprout', 'cabbage', 'wheat', 'corn']], ['scarecrow'], ['haystack'], ['windmill'], ['greenhouse'], ['sundial'], ['beehive'],
  ['stall', ['red', 'blue', 'green', 'yellow']], ['tent'], ['forge'], ['lantern-post'], ['alarm-tower'], ['sensor-post'], ['firepit', ['lit', 'out']],
  ['power-pole'], ['transformer'], ['solar-panel'], ['harbor-crane'], ['boat'], ['lighthouse'], ['signal-tower', ['on', 'off']], ['bollard'], ['anchor-decor'], ['cargo'],
  ['lab-dome'], ['radar-dish'], ['holo-board'], ['observation-tower'], ['server-tower'], ['wind-turbine'], ['crystal'], ['robot-helper'],
];
const DEFAULT_VARIANT = Object.fromEntries(CATALOG.map(([k, v]) => [k, v ? v[0] : undefined]));

const cache = new Map();
function placeholder() {
  const R = new Ras(24, 28);
  R.rect(4, 6, 16, 18, (x, y) => ((x + y) & 1 ? [150, 110, 70] : [130, 94, 60]));
  R.outline();
  R.sEll(14, 24, 11, 4, 0.35);
  return out(R, 12, 24, { block: { x: -8, y: -6, w: 16, h: 8 } });
}

export function getSceneSprite(kind, variant) {
  const v = variant ?? DEFAULT_VARIANT[kind];
  const key = `${kind}|${v ?? ''}`;
  let s = cache.get(key);
  if (s) return s;
  const make = MAKERS[kind];
  s = make ? make(v) : placeholder();
  if (!s) s = placeholder();
  cache.set(key, s);
  return s;
}

// 부드러운 빛 덩어리(등불·되살아난 표지판). 'lighter' 합성으로 겹칠수록 밝아진다.
export function drawGlow(ctx, x, y, radius, color = '#ffd98a', alpha = 0.5) {
  if (radius <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  const c = parseColor(color);
  g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha})`);
  g.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.45})`);
  g.addColorStop(0.7, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.12})`);
  g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}
let pc = null;
function parseColor(s) {
  if (Array.isArray(s)) return s;
  if (/^#[0-9a-f]{6}$/i.test(s)) { const n = parseInt(s.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  if (!pc) pc = document.createElement('canvas').getContext('2d');
  pc.fillStyle = '#000'; pc.fillStyle = s;
  const f = pc.fillStyle;
  if (f[0] === '#') { const n = parseInt(f.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  const m = f.match(/[\d.]+/g) || [255, 220, 140];
  return [+m[0], +m[1], +m[2]];
}

// 전봇대 꼭대기 사이에 처진 전선(1px, 픽셀이 또렷하게). 아래쪽에 옅은 반사선을 한 줄 더 긋는다.
export function drawWire(ctx, x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const sag = 6 + dist * 0.09;
  const n = Math.max(2, Math.ceil(dist * 1.2));
  ctx.save();
  let lx = null, ly = null;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t + sag * 4 * t * (1 - t));
    if (x === lx && y === ly) continue;
    ctx.fillStyle = 'rgba(28,24,26,0.95)';
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = 'rgba(120,112,104,0.35)';
    ctx.fillRect(x, y + 1, 1, 1);
    lx = x; ly = y;
  }
  ctx.restore();
}

// 지역별 분위기 덧칠(아주 옅게)
export const THEMES = {
  hub: { tint: 'rgba(255,214,150,0.06)', fog: null, groundDefault: 'g' },
  farm: { tint: 'rgba(255,226,120,0.08)', fog: 'rgba(255,248,220,0.04)', groundDefault: 'g' },
  fire: { tint: 'rgba(255,128,70,0.08)', fog: 'rgba(80,40,30,0.05)', groundDefault: 'g' },
  power: { tint: 'rgba(120,170,230,0.08)', fog: 'rgba(210,230,255,0.05)', groundDefault: 'g' },
  future: { tint: 'rgba(170,130,255,0.08)', fog: 'rgba(200,190,255,0.05)', groundDefault: 'g' },
  life: { tint: 'rgba(110,220,190,0.07)', fog: 'rgba(220,255,245,0.04)', groundDefault: 'g' },
};
