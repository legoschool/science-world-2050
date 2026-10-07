// 배경 그림 연결 지점. scenery.mjs(새 배경 그림)가 있으면 그것을 쓰고,
// 아직 없거나 오류가 나면 기존 도트 그림(vendor/brick)으로 같은 모양의 결과를 만든다.
import {buildGround, getObjectSprite} from './vendor/brick/js/art.mjs';

const BASE = {g: 'g', G: 'g', p: 'p', P: 'P', h: 'p', x: 'P', k: 'f', f: 'f', w: 'w', s: 'p', d: 'p', m: 'P'};
const cache = new Map();

const fallback = {
  buildSceneGround(map) {
    if (cache.has(map.id)) return cache.get(map.id);
    const tiles = map.tiles.map((row) => [...row].map((ch) => BASE[ch] || 'g'));
    const c = buildGround({...map, tiles})[0];
    cache.set(map.id, c);
    return c;
  },
  getSceneSprite(kind, variant) {
    const o = {
      tree: {t: 'tree', w: 1, h: 1}, bush: {t: 'bush', w: 1, h: 1}, lamp: {t: 'lamp', w: 1, h: 1}, bench: {t: 'bench', w: 2, h: 1},
      fountain: {t: 'fountain', w: 3, h: 2}, flowerbed: {t: 'flowerbed', w: 2, h: 1}, signpost: {t: 'sign', w: 1, h: 1}, noticeboard: {t: 'board', w: 2, h: 1},
      rock: {t: 'prop', id: 'rock'}, stump: {t: 'prop', id: 'stump'}, crops: {t: 'prop', id: 'sunflower'}, 'robot-helper': {t: 'prop', id: 'robot'},
      crystal: {t: 'prop', id: 'globe'}, flowers: {t: 'prop', id: 'mushroom'},
    }[kind] || {t: 'brickpile', w: 1, h: 1};
    const s = getObjectSprite({...o, x: 0, y: 0});
    const solid = !['flowers', 'grass-tuft', 'lily', 'reeds', 'crops'].includes(kind);
    return {...s, w: s.c.width, h: s.c.height, block: solid ? {x: -12, y: -10, w: 24, h: 12} : undefined};
  },
  getBuildingSprite(opts) {
    const w = Math.max(4, Math.round((opts.w || 160) / 32));
    const style = ['school', 'library'].includes(opts.style) ? opts.style : opts.style === 'house' || opts.style === 'office' ? 'library' : 'workshop';
    const s = getObjectSprite({t: 'building', style, x: 0, y: 0, w, h: 3, doorX: Math.floor(w / 2)});
    const W = s.c.width;
    return {...s, w: W, h: s.c.height, block: {x: -W / 2 + 4, y: -84, w: W - 8, h: 84}, door: {x: 0, y: 6}};
  },
  drawGlow(ctx, x, y, r, color = '#ffd98a', alpha = 0.5) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  },
  drawWire(ctx, x1, y1, x2, y2) {
    ctx.save(); ctx.strokeStyle = '#2b2b30'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + 14, x2, y2); ctx.stroke(); ctx.restore();
  },
  THEMES: {hub: {tint: 'rgba(255,230,160,.05)'}, farm: {tint: 'rgba(255,220,90,.07)'}, fire: {tint: 'rgba(230,120,50,.08)'}, power: {tint: 'rgba(20,50,110,.12)'}, future: {tint: 'rgba(110,90,200,.08)'}, life: {tint: 'rgba(60,170,140,.07)'}},
};

let kit = fallback;
try {
  const m = await import('./scenery.mjs');
  kit = {...fallback, ...Object.fromEntries(Object.entries(m).filter(([, v]) => v))};
  kit.fancy = true;
} catch (e) {
  kit.fancy = false;
}

// 새 배경 그림이 한 가지 그림에서 오류를 내도 월드 전체가 멈추지 않도록 감싼다.
const safe = (name) => (...args) => {
  try { return kit[name](...args); } catch (e) { console.warn('scenery fallback', name, args[0], e); return fallback[name](...args); }
};
export const buildSceneGround = safe('buildSceneGround');
export const getSceneSprite = safe('getSceneSprite');
export const getBuildingSprite = safe('getBuildingSprite');
export const drawGlow = safe('drawGlow');
export const drawWire = safe('drawWire');
export const THEMES = kit.THEMES || fallback.THEMES;
export const fancy = kit.fancy;
