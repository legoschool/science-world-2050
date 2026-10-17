// 캐릭터 그림 연결 지점.
// 학생 아바타는 두 가지다. look 1~12는 미리 그린 캐릭터 시트, look 0은 부위를 골라 조립한 캐릭터다.
// 조립 캐릭터는 chibi-render.mjs(새 그림)를 쓰고, 불러오지 못하면 이전 도트 그림으로 대신한다.
import * as OLD from './vendor/brick/js/avatar-render.mjs';
import {DEFAULT_AVATAR, sanitizeAvatar} from './vendor/shared/avatar.mjs';
import {loadSheet, sheetFrame} from './npc-sheets.mjs';
import {dressSheet} from './wardrobe.mjs';

let R = OLD;
try { R = await import('./chibi-render.mjs'); R.getAvatarSheet(DEFAULT_AVATAR); } catch (e) { console.warn('chibi-render fallback', e); R = OLD; }

export const {FW, FH, ANCHOR, frameFor} = R;
export const SKIN_SWATCHES = R.SKIN_TONES || null;

export const LOOK_COUNT = 12;
export const lookUrl = (n) => `/assets/sprites/look-${String(n).padStart(2, '0')}.png`;
const looks = new Map();
export async function preloadLook(n) {
  if (n > 0 && !looks.has(n)) { try { const s = await loadSheet(lookUrl(n)); s.lookKey = 'look' + n; looks.set(n, s); } catch { /* 파일이 없으면 조립 캐릭터로 그린다 */ } }
  return looks.get(n) || null;
}

// 아바타 정리: 부위 값은 기존 규칙으로, look은 0~12만 받는다.
export const TINT_COUNT = 8;
export function cleanAvatar(av) {
  const out = sanitizeAvatar(av);
  out.look = Number.isInteger(av?.look) && av.look >= 0 && av.look <= LOOK_COUNT ? av.look : 0;
  out.tint = Number.isInteger(av?.tint) && av.tint >= 0 && av.tint < TINT_COUNT ? av.tint : 0;
  return out;
}

// 옷 색 바꾸기: 캐릭터마다 옷에 쓰인 색 범위(색상 도, 최소 채도, 최소 명도)만 골라 색상을 45도씩 돌린다.
// 머리의 푸른 하이라이트나 머리띠도 옷과 같은 색일 수 있어, 머리 영역은 색상과 무관하게 보존한다.
const TINT_RANGES = {1: [[190, 250, .35, .12]], 2: [[342, 360, .6, .4], [0, 5, .6, .4]], 3: [[75, 165, .25, .15]], 4: [[44, 70, .4, .4], [190, 250, .35, .15]], 5: [[245, 305, .25, .15]], 6: [[200, 250, .35, .12]], 7: [[315, 352, .18, .6], [195, 235, .3, .45]], 8: [[200, 255, .3, .1], [345, 360, .5, .3], [0, 6, .5, .3]], 9: [[110, 185, .2, .3]], 10: [[185, 250, .25, .15]], 11: [[75, 165, .25, .12]], 12: [[8, 38, .7, .72]]};
const tinted = new Map();
export function tintSheet(sheet, tint, look) {
  if (!tint) return sheet;
  const key = (sheet.lookKey || sheet.width + 'x' + sheet.height) + '@' + tint;
  if (tinted.has(key)) return tinted.get(key);
  const c = document.createElement('canvas'); c.width = sheet.width; c.height = sheet.height;
  const x = c.getContext('2d', {willReadFrequently: true}); x.drawImage(sheet, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height), a = img.data, rot = tint * 45, ranges = TINT_RANGES[look] || [];
  const meta = sheet.meta;
  const heads = new Map();
  if (meta) for (let y0 = 0; y0 < c.height; y0 += meta.fh) for (let x0 = 0; x0 < c.width; x0 += meta.fw) {
    let top = meta.fh;
    for (let y = 0; y < meta.fh && top === meta.fh; y++) for (let xx = 0; xx < meta.fw; xx++) {
      if (a[((y0 + y) * c.width + x0 + xx) * 4 + 3] > 40) { top = y; break; }
    }
    heads.set(`${x0},${y0}`, top + 30);
  }
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 10) continue;
    if (meta) {
      const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
      const x0 = Math.floor(px / meta.fw) * meta.fw, y0 = Math.floor(py / meta.fh) * meta.fh;
      if (py - y0 < heads.get(`${x0},${y0}`)) continue;
    }
    const r = a[i] / 255, g = a[i + 1] / 255, b = a[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, v = mx, s = mx ? d / mx : 0;
    let h = d === 0 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    if (!ranges.some(([lo, hi, sm, vm]) => h >= lo && h <= hi && s >= sm && v >= vm)) continue;
    const nh = (h + rot) % 360, cc = v * s, xx = cc * (1 - Math.abs(((nh / 60) % 2) - 1)), m = v - cc;
    const [rr, gg, bb] = nh < 60 ? [cc, xx, 0] : nh < 120 ? [xx, cc, 0] : nh < 180 ? [0, cc, xx] : nh < 240 ? [0, xx, cc] : nh < 300 ? [xx, 0, cc] : [cc, 0, xx];
    a[i] = Math.round((rr + m) * 255); a[i + 1] = Math.round((gg + m) * 255); a[i + 2] = Math.round((bb + m) * 255);
  }
  x.putImageData(img, 0, 0);
  c.meta = sheet.meta;
  c.lookKey = (sheet.lookKey || `look${look}`) + '@' + tint;
  tinted.set(key, c);
  return c;
}

export function getAvatarSheet(av) {
  const base = av?.look > 0 && looks.has(av.look) ? tintSheet(looks.get(av.look), av.tint || 0, av.look) : R.getAvatarSheet(av);
  return av === player && (wear.head || wear.back) ? dressSheet(base, wear) : base;
}

// 대화창 얼굴 그림
export function getPortrait(av, size = 96) {
  const sheet = getAvatarSheet(av);
  if (!sheet.meta && R.getPortrait) return R.getPortrait(av, size);
  const m = sheet.meta || {fw: FW, fh: FH};
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  const crop = Math.round(m.fw * 0.78);
  x.drawImage(sheet, m.cols ? m.fw + Math.round((m.fw - crop) / 2) : Math.round((m.fw - crop) / 2), Math.round(m.fh * 0.04), crop, crop, 0, 0, size, size);
  return c;
}

// 시트 한 장면을 발끝 기준점(x, y)에 그린다. 그림 캐릭터 시트와 조립 캐릭터 시트를 모두 처리한다.
export const sheetSize = (sheet) => sheet.meta || {fw: FW, fh: FH, ax: ANCHOR.x, ay: ANCHOR.y};
export function drawFrame(c, sheet, x, y, {dir = 'down', moving = false, t = 0, emote} = {}) {
  const m = sheetSize(sheet);
  let f = frameFor({dir, moving, t, emote});
  if (m.cols) f = sheetFrame(m, f, moving);
  c.drawImage(sheet, f.col * m.fw, f.row * m.fh, m.fw, m.fh, Math.round(x) - m.ax, Math.round(y) - m.ay, m.fw, m.fh);
}

// 지금 접속한 학생의 아바타. 모든 장면이 같은 값을 쓴다.
let player = {...DEFAULT_AVATAR, look: 0, tint: 0}, wear = {};
// 지금 착용한 소품(머리, 등, 동료). 퀘스트 수첩의 완료 수로 열린 것만 들어온다
export const setPlayerWear = (w) => { wear = w || {}; };
export const playerWear = () => wear;
export const setPlayerAvatar = (av) => { if (av) player = av; };
export const playerAvatar = () => player;
