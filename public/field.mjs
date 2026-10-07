// 구역 지도 안의 현장 활동(field.json)과 지역 주민·이야기(world-extra.json).
// 지도에 놓이는 장치(스위치, 패널, 지구본 등)와 숨은 물건은 그림 파일 없이 캔버스로 그린다. 모든 그림은 발밑(x, y)을 기준점으로 한다.
import {randomAvatar} from './vendor/shared/avatar.mjs';

let fieldCache = null, extraCache = null;
export const loadField = () => (fieldCache ??= fetch('/field.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));
export const loadWorldExtra = () => (extraCache ??= fetch('/world-extra.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));
export const REGION_CODE = {farm: 'R1', fire: 'R2', power: 'R3', future: 'R4', life: 'R5'};

// 활동 진행 상태: adventure.field[구역] = {on: 받음, got: [찾은 물건], set: {장치: 상태 번호}, done: 해결}
export function fieldEntry(adv, zone) { adv.field ??= {}; return (adv.field[zone] ??= {}); }
export function stateOf(fs, o) { const v = fs.set?.[o.id]; return Number.isInteger(v) && v >= 0 && v < o.states.length ? v : o.start; }
export function fieldReady(q, fs) {
  if (!q || !fs) return false;
  if (q.kind === 'collect') return q.items.filter((i) => i.ok !== false).every((i) => fs.got?.includes(i.id));
  const set = q.objs.every((o) => stateOf(fs, o) === o.goal);
  // 기록하며 맞추기: 장치를 맞추고 기록표의 모든 칸을 바르게 적어야 끝난다
  return q.record ? set && q.record.answers.every((a, k) => fs.rec?.[k] === a) : set;
}
export function fieldProgress(q, fs) {
  if (q.kind === 'collect') { const need = q.items.filter((i) => i.ok !== false); return [need.filter((i) => fs.got?.includes(i.id)).length, need.length]; }
  if (q.record) return [q.record.answers.filter((a, k) => fs.rec?.[k] === a).length, q.record.answers.length];
  return [q.objs.filter((o) => stateOf(fs, o) === o.goal).length, q.objs.length];
}

// 같은 주민은 늘 같은 모습이 되도록 이름으로 씨앗을 만든다
function seeded(text) { let h = 2166136261; for (const ch of text) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
export function residentAvatar(key, name) {
  const rand = seeded(key + name), a = randomAvatar(rand);
  a.skin = Math.floor(rand() * 4); a.hat = [0, 0, 0, 1, 2, 3, 4][Math.floor(rand() * 7)];
  if (/할머니|할아버지/.test(name)) { a.hairColor = 6; a.beard = name.includes('할아버지') && rand() < 0.6 ? 1 : 0; a.glasses = rand() < 0.4 ? 1 : 0; }
  if (a.glasses > 1) a.glasses = 0;
  return a;
}

// ---------------------------------------------------------------- 그리기 도구
const R = (c, x, y, w, h, fill, line = '#1b1f27') => { c.fillStyle = fill; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); if (line) { c.strokeStyle = line; c.lineWidth = 2; c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1); } };
const O = (c, x, y, r, fill, line = '#1b1f27') => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = 2; c.stroke(); } };
const shadow = (c, x, y, w) => { c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2); c.fill(); };
function flame(c, x, y, s, now, still) {
  if (s <= 0) return;
  const f = still ? 1 : 0.85 + 0.15 * Math.sin(now / 90 + x);
  for (const [col, k] of [['#ff6a2b', 1], ['#ffb02e', 0.68], ['#fff1a0', 0.36]]) {
    c.fillStyle = col; c.beginPath(); c.moveTo(x - 9 * s * k, y); c.quadraticCurveTo(x - 6 * s * k, y - 16 * s * k * f, x, y - 24 * s * k * f); c.quadraticCurveTo(x + 6 * s * k, y - 16 * s * k * f, x + 9 * s * k, y); c.closePath(); c.fill();
  }
}
function smoke(c, x, y, now, still) { c.fillStyle = 'rgba(150,150,160,.55)'; for (let i = 0; i < 3; i++) { const t = still ? i / 3 : ((now / 1400 + i / 3) % 1); O(c, x + Math.sin(t * 6 + i) * 4, y - t * 26, 3 + t * 5, `rgba(160,160,170,${0.6 - t * 0.5})`, null); } }
// 측정 막대(발전량, 불 온도, 밝기): 값이 바뀌면 천천히 따라간다
function meter(c, o, x, y, v, label) {
  o._m = o._m == null ? v : o._m + (v - o._m) * 0.12;
  R(c, x, y - 44, 9, 44, '#21262f');
  const h = Math.max(2, 40 * o._m), col = o._m > 0.85 ? '#7be06a' : o._m > 0.5 ? '#ffd34d' : '#ff8a4a';
  c.fillStyle = col; c.fillRect(x + 2, y - 2 - h, 5, h);
  if (label) { c.font = 'bold 10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(20,24,32,.85)'; c.strokeText(label, x + 4.5, y - 48); c.fillStyle = '#fff'; c.fillText(label, x + 4.5, y - 48); }
}

// ---------------------------------------------------------------- 장치
// glow(c, x, y, r, color, alpha)는 scene-kit의 drawGlow를 받는다
// 지도 그림 크기에 맞춰 발밑을 기준으로 1.7배 키워 그린다
export const OBJ_SCALE = 1.7;
export function drawFieldObject(c, o, idx, now, {glow, still = false} = {}) {
  const x = o.x, y = o.y;
  c.save(); c.translate(x, y); c.scale(OBJ_SCALE, OBJ_SCALE); c.translate(-x, -y);
  shadow(c, x, y, 16);
  switch (o.art) {
    case 'switch': {
      R(c, x - 3, y - 26, 6, 26, '#6b5236');
      R(c, x - 12, y - 48, 24, 24, '#c9ced6');
      c.strokeStyle = '#2b2f36'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 6, y - 36);
      if (idx === 1) c.lineTo(x + 7, y - 36); else c.lineTo(x + 5, y - 46);
      c.stroke(); O(c, x - 6, y - 36, 2.5, '#2b2f36', null);
      O(c, x + 7, y - 30, 3, idx === 1 ? '#5be36b' : '#ff5a4a', '#1b1f27');
      if (idx === 1 && glow) glow(c, x + 7, y - 30, 10, '#9dff9d', 0.5);
      break;
    }
    case 'panel': {
      const ang = [-0.5, 0, 0.5, Math.PI][idx] ?? 0;
      R(c, x - 3, y - 22, 6, 22, '#5b6270');
      c.save(); c.translate(x, y - 30); c.scale(Math.cos(ang) * 0.5 + (idx === 3 ? -0.4 : 0.5), 1);
      c.fillStyle = idx === 3 ? '#2a3550' : '#2f5fb8'; c.strokeStyle = '#1b1f27'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-22, 6); c.lineTo(22, 6); c.lineTo(16, -14); c.lineTo(-16, -14); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(200,230,255,.6)'; c.lineWidth = 1; for (const k of [-8, 0, 8]) { c.beginPath(); c.moveTo(k * 1.1, 6); c.lineTo(k * 0.8, -14); c.stroke(); }
      c.restore();
      R(c, x - 12, y - 8, 24, 13, '#f2e6c4');
      c.font = 'bold 10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#3a2c12'; c.fillText(o.states[idx][0], x, y + 2);
      meter(c, o, x + 26, y, o.meter[idx]);
      break;
    }
    case 'globe': {
      const deg = (o.deg?.[idx] ?? 0) * Math.PI / 180;
      R(c, x - 14, y - 6, 28, 6, '#7a5a34');
      c.strokeStyle = '#a07a3c'; c.lineWidth = 3; c.beginPath(); c.arc(x, y - 30, 19, Math.PI * 0.55, Math.PI * 1.45); c.stroke();
      R(c, x - 2, y - 12, 4, 8, '#7a5a34', null);
      O(c, x, y - 30, 15, '#3a8fe0');
      c.fillStyle = '#6fcf63'; c.beginPath(); c.ellipse(x - 5, y - 34, 6, 4, 0.4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x + 6, y - 25, 4, 5, -0.3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ff4a3d'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - Math.sin(deg) * 22, y - 30 + Math.cos(deg) * 22); c.lineTo(x + Math.sin(deg) * 22, y - 30 - Math.cos(deg) * 22); c.stroke();
      c.setLineDash([3, 3]); c.strokeStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(x, y - 54); c.lineTo(x, y - 6); c.stroke(); c.setLineDash([]);
      break;
    }
    case 'grill': {
      R(c, x - 12, y - 8, 3, 8, '#2b2f36', null); R(c, x + 9, y - 8, 3, 8, '#2b2f36', null);
      R(c, x - 16, y - 26, 32, 18, '#3b4048');
      R(c, x - 6, y - 15, 12, 5, idx === 1 ? '#1a0d08' : '#8b919b');
      if (idx === 1) { c.fillStyle = o.use ? '#ff7a2e' : '#d24a2a'; c.fillRect(x - 4, y - 14, 8, 3); }
      c.strokeStyle = '#8b919b'; c.lineWidth = 1; for (let k = -12; k <= 12; k += 4) { c.beginPath(); c.moveTo(x + k, y - 27); c.lineTo(x + k, y - 25); c.stroke(); }
      if (o.use && idx === 1) { flame(c, x - 6, y - 26, 0.7, now, still); flame(c, x + 6, y - 26, 0.6, now + 300, still); if (glow) glow(c, x, y - 34, 26, '#ffb35a', 0.45); }
      else if (o.use) { c.fillStyle = '#7a2a1a'; c.fillRect(x - 12, y - 28, 24, 3); smoke(c, x, y - 30, now, still); }
      else if (idx === 1) { c.fillStyle = '#e8462a'; for (const k of [-8, -2, 5, 10]) c.fillRect(x + k, y - 29, 3, 3); if (glow) glow(c, x, y - 30, 16, '#ff6a3a', 0.35); }
      else { c.fillStyle = '#2a2a2e'; c.fillRect(x - 12, y - 28, 24, 3); }
      break;
    }
    case 'bellows': {
      const sp = [0, 1, 2, 3][idx] || 0, squeeze = still || !sp ? 0 : (Math.sin(now / (420 / sp)) + 1) * 3;
      R(c, x + 2, y - 30, 24, 30, '#8a8f99');
      c.fillStyle = '#1e1a18'; c.fillRect(x + 7, y - 22, 14, 12);
      flame(c, x + 14, y - 10, 0.25 + o.meter[idx] * 0.45, now, still);
      if (glow) glow(c, x + 14, y - 18, 14 + o.meter[idx] * 22, idx >= 3 ? '#fff2a0' : '#ff9a4a', 0.25 + o.meter[idx] * 0.35);
      c.fillStyle = '#9a6a3a'; c.strokeStyle = '#1b1f27'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x - 2, y - 15); c.lineTo(x - 30, y - 24 + squeeze); c.lineTo(x - 30, y - 6 - squeeze); c.closePath(); c.fill(); c.stroke();
      R(c, x - 40, y - 17 + 0, 11, 4, '#6b4a2a', null);
      meter(c, o, x + 32, y, o.meter[idx]);
      break;
    }
    case 'battery': {
      R(c, x - 20, y - 22, 40, 22, '#2f6b4f');
      const cell = (bx, by, vertical) => { if (vertical) { R(c, bx - 4, by - 8, 8, 16, '#e9c64a'); R(c, bx - 2, by - 10, 4, 2, '#c9ced6', null); } else { R(c, bx - 8, by - 4, 16, 8, '#e9c64a'); R(c, bx + 8, by - 2, 2, 4, '#c9ced6', null); } };
      c.strokeStyle = '#ffd34d'; c.lineWidth = 1.5;
      if (idx === 0) cell(x, y - 11, false);
      else if (idx === 1) { cell(x - 6, y - 11, true); cell(x + 6, y - 11, true); c.beginPath(); c.moveTo(x - 6, y - 21); c.lineTo(x + 6, y - 21); c.moveTo(x - 6, y - 1); c.lineTo(x + 6, y - 1); c.stroke(); }
      else { cell(x - 9, y - 11, false); cell(x + 9, y - 11, false); }
      c.strokeStyle = '#1b1f27'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 22); c.lineTo(x, y - 34); c.stroke();
      const v = o.meter[idx];
      if (glow) glow(c, x, y - 42, 12 + v * 30, '#fff1b0', 0.2 + v * 0.55);
      O(c, x, y - 42, 8, v > 0.6 ? '#fff6c0' : '#e8d98a');
      meter(c, o, x + 26, y, v);
      break;
    }
    case 'bulb': {
      R(c, x - 16, y - 40, 32, 40, '#b98a5a');
      R(c, x - 11, y - 34, 22, 20, idx === 1 ? '#ffe9a0' : '#27324a');
      c.strokeStyle = '#6b4a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 34); c.lineTo(x, y - 14); c.moveTo(x - 11, y - 24); c.lineTo(x + 11, y - 24); c.stroke();
      R(c, x - 4, y - 10, 8, 10, '#7a5230', null);
      if (idx === 1 && glow) glow(c, x, y - 24, 30, '#ffe7a0', 0.5);
      break;
    }
    case 'tv': {
      R(c, x - 3, y - 10, 6, 10, '#2b2f36', null); R(c, x - 10, y - 4, 20, 4, '#2b2f36', null);
      R(c, x - 18, y - 36, 36, 26, '#2b2f36');
      if (idx === 1) { const t = still ? 0 : now / 300; c.fillStyle = `hsl(${200 + 40 * Math.sin(t)},70%,${55 + 10 * Math.sin(t * 1.7)}%)`; c.fillRect(x - 14, y - 32, 28, 18); if (glow) glow(c, x, y - 24, 26, '#9fd0ff', 0.4); }
      else { c.fillStyle = '#0d1016'; c.fillRect(x - 14, y - 32, 28, 18); }
      break;
    }
    case 'charger': {
      R(c, x - 10, y - 34, 20, 34, '#e8e8e8');
      O(c, x - 3, y - 24, 2, '#2b2f36', null); O(c, x + 3, y - 24, 2, '#2b2f36', null);
      c.strokeStyle = '#2b2f36'; c.lineWidth = 2;
      if (idx === 1) { R(c, x - 6, y - 30, 12, 10, '#f7f7f7'); c.beginPath(); c.moveTo(x, y - 20); c.quadraticCurveTo(x + 18, y - 10, x + 14, y - 2); c.stroke(); R(c, x + 10, y - 6, 9, 6, '#3a3f48', null); O(c, x + 6, y - 31, 2, '#5be36b', null); if (glow) glow(c, x + 6, y - 31, 6, '#9dff9d', 0.5); }
      else { c.beginPath(); c.moveTo(x + 18, y - 2); c.quadraticCurveTo(x + 26, y - 8, x + 20, y - 14); c.stroke(); R(c, x + 16, y - 4, 10, 7, '#f7f7f7'); }
      break;
    }
    case 'fridge': {
      R(c, x - 12, y - 46, 24, 46, '#eef2f5');
      c.strokeStyle = '#9aa3ad'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 12, y - 30); c.lineTo(x + 12, y - 30); c.stroke();
      R(c, x + 6, y - 42, 2, 8, '#9aa3ad', null); R(c, x + 6, y - 26, 2, 10, '#9aa3ad', null);
      O(c, x - 6, y - 38, 2, idx === 1 ? '#4ad0ff' : '#4a4f58', null);
      if (idx === 1 && glow) glow(c, x - 6, y - 38, 7, '#9fe6ff', 0.6);
      if (idx === 0) { c.fillStyle = '#7fc6ff'; c.beginPath(); c.moveTo(x + 2, y + 2); c.quadraticCurveTo(x + 6, y + 6, x + 2, y + 8); c.quadraticCurveTo(x - 2, y + 6, x + 2, y + 2); c.fill(); }
      break;
    }
    case 'news': {
      R(c, x - 16, y - 8, 3, 8, '#6b5236', null); R(c, x + 13, y - 8, 3, 8, '#6b5236', null);
      R(c, x - 18, y - 38, 36, 30, '#8a5a32');
      R(c, x - 14, y - 34, 28, 22, '#f6f1e3', '#b8ae96');
      c.strokeStyle = '#9a9384'; c.lineWidth = 1; for (const k of [-29, -25, -21, -17]) { c.beginPath(); c.moveTo(x - 11, y + k); c.lineTo(x + 6, y + k); c.stroke(); }
      if (idx === 1) { c.strokeStyle = '#2f9a45'; c.lineWidth = 2.5; c.beginPath(); c.arc(x + 8, y - 18, 6, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x + 5, y - 18); c.lineTo(x + 7.5, y - 15.5); c.lineTo(x + 11.5, y - 21); c.stroke(); }
      else { c.strokeStyle = '#8a8f99'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + 4, y - 22); c.lineTo(x + 12, y - 14); c.moveTo(x + 12, y - 22); c.lineTo(x + 4, y - 14); c.stroke(); }
      break;
    }
    default: O(c, x, y - 14, 10, '#c9ced6');
  }
  c.restore();
}

// ---------------------------------------------------------------- 숨은 물건
export function drawFieldItem(c, it, x, y, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  shadow(c, 0, 0, 9);
  const col = it.color || '#ffd34d';
  switch (it.art) {
    case 'card': R(c, -9, -16, 18, 13, '#fbf6e6'); c.fillStyle = col; c.fillRect(-7, -14, 14, 4); c.fillStyle = '#b8ae96'; c.fillRect(-7, -8, 10, 2); break;
    case 'note': R(c, -7, -18, 14, 17, '#fbf6e6'); c.fillStyle = col; c.fillRect(-5, -16, 10, 3); c.fillStyle = '#b8ae96'; for (const k of [-11, -8, -5]) c.fillRect(-5, k, 9, 1.5); break;
    case 'photo': R(c, -9, -17, 18, 15, '#ffffff'); c.fillStyle = col; c.fillRect(-7, -15, 14, 9); c.fillStyle = '#d8d2c0'; c.fillRect(-7, -5, 10, 2); break;
    case 'tool': R(c, -2, -16, 4, 14, '#7a5a34', null); O(c, 0, -17, 5, col); break;
    case 'extinguisher': R(c, -5, -20, 10, 19, '#d8343a'); R(c, -3, -24, 6, 4, '#2b2f36', null); c.strokeStyle = '#2b2f36'; c.lineWidth = 2; c.beginPath(); c.moveTo(3, -22); c.quadraticCurveTo(10, -18, 7, -8); c.stroke(); break;
    case 'bucket': c.fillStyle = '#9aa3ad'; c.strokeStyle = '#1b1f27'; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, -15); c.lineTo(8, -15); c.lineTo(6, -1); c.lineTo(-6, -1); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#e6c88a'; c.fillRect(-7, -15, 14, 3); break;
    case 'cloth': R(c, -10, -10, 20, 9, '#e0c9a0'); c.fillStyle = '#c9ad7f'; c.fillRect(-10, -6, 20, 2); break;
    case 'fan': c.fillStyle = '#f2d16b'; c.strokeStyle = '#1b1f27'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -6); c.arc(0, -6, 11, Math.PI * 1.1, Math.PI * 1.9); c.closePath(); c.fill(); c.stroke(); R(c, -1.5, -7, 3, 7, '#7a5a34', null); break;
    case 'box': R(c, -9, -13, 18, 12, it.color || '#c9a06a'); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-1, -13, 2, 12); break;
    case 'crate': R(c, -10, -14, 20, 13, col); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, -12); c.lineTo(8, -3); c.moveTo(8, -12); c.lineTo(-8, -3); c.stroke(); break;
    case 'pipe': for (const k of [-9, -5, -1]) R(c, -11, k - 4, 22, 4, col); break;
    case 'can': for (const k of [-7, 0, 7]) R(c, k - 3, -12, 6, 11, col); break;
    case 'coil': c.strokeStyle = col; c.lineWidth = 3; for (const r of [8, 5]) { c.beginPath(); c.ellipse(0, -8, r, r * 0.7, 0, 0, Math.PI * 2); c.stroke(); } break;
    default: O(c, 0, -8, 6, col);
  }
  c.restore();
}

// 미니맵·이름표가 없는 숨은 물건은 가까이 갈수록 또렷해진다
export const SEE_FAR = 210, SEE_NEAR = 80;
