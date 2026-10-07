// 브릭월드 스타일 엔진: 모든 그림(코드 그림·레시피 소품·손으로 그린 픽셀)이 같은 규칙을 거치게 한다.
//  - 규격: 타일 32칸, 캐릭터 프레임 40×60(발밑 20,57), 도트 1칸 = 월드 1px
//  - 빛: 왼쪽 위에서 온다 → 위·왼쪽 가장자리는 밝게, 아래·오른쪽은 어둡게(그림자는 살짝 푸르게)
//  - 윤곽선: 바깥 1px, 이웃 색을 어둡게 섞은 색(검정 선을 쓰지 않음)
//  - 그림자: 바닥 기준점 아래 납작한 타원, 투명도 0.24
//  - 색: 공용 팔레트 + 명도 5단계(ramp)
import { shade, toRgb, mk, Pen, selout, dropShadow, FLAT } from './pix.mjs';

export const STYLE = {
  tile: 32,
  avatar: { w: 40, h: 60, anchor: { x: 20, y: 57 } },
  ramp: [0.42, 0.22, 0, -0.22, -0.4], // 가장 밝게 → 가장 어둡게
  bevel: { hi: 0.22, lo: -0.24, side: 0.12 },
  shadowAlpha: 0.24,
  // 한 그림의 색 수 상한: 명암 5단계 × 윤곽선 섞임을 고려해 그림 넓이에 따라 늘어난다
  maxColors: (w, h) => Math.min(128, Math.round(32 + Math.sqrt(w * h))),
};

// 공용 팔레트: 이름으로 부르면 어디서 그려도 같은 색이 된다
export const PALETTE = {
  white: '#f4f4f4', black: '#2a2a30', gray: '#8b8f99', stone: '#b9bdca', silver: '#c9ccd6',
  red: '#d8343a', orange: '#f28a1a', tangerine: '#f7ae2b', yellow: '#f5c518', gold: '#cfae5a',
  green: '#3aa04b', leaf: '#4fb153', lime: '#8fd14f', teal: '#1fa5a0', sky: '#8fd0ff',
  blue: '#2659c8', navy: '#1f3163', purple: '#7a4bc4', pink: '#ee7fb0', peach: '#f6c9a0',
  brick: '#b84a3a', wood: '#b77a45', darkwood: '#8d5b34', sand: '#e9d5a1', cream: '#f5e7c6',
  skin: '#ffd21f', glass: '#86c9f2', water: '#4ea8e6', paper: '#fbfbfd', ink: '#2a1f2d',
};

// 'red' → 기본색, 'red+1'·'red+2' → 밝게, 'red-1'·'red-2' → 어둡게, '#hex'는 그대로
export function color(c) {
  if (!c) return '#ff00ff';
  if (c[0] === '#' || c.startsWith('rgb')) return c;
  const m = c.match(/^([a-z]+)([+-]\d)?$/);
  const base = m && PALETTE[m[1]];
  if (!base) return '#ff00ff'; // 팔레트에 없는 이름은 눈에 띄는 분홍(검사기에서 잡힘)
  if (!m[2]) return base;
  const step = Number(m[2]);
  return shade(base, STYLE.ramp[2 - step] ?? (step > 0 ? STYLE.ramp[0] : STYLE.ramp[4]));
}
export const ramp = (c) => STYLE.ramp.map((k) => shade(color(c), k));

// ---------------------------------------------------------------- 공용 부품
export function stud(P, x, y, c) { // 6×5 스터드
  P.rect(x + 1, y, 4, 1, shade(c, 0.4));
  P.rect(x, y + 1, 6, 2, shade(c, 0.2));
  P.px(x + 1, y + 1, shade(c, 0.55));
  P.rect(x, y + 3, 6, 1, c);
  P.rect(x + 1, y + 4, 4, 1, shade(c, -0.28));
}
// 비스듬히 내려다본 레고 브릭: 윗면(스터드) + 앞면
export function brick(P, x, y, w, c, { top = 7, front = 9 } = {}) {
  P.blk(x, y, w, top, shade(c, 0.14), { hi: 0.2, lo: 0, side: 0.06 });
  P.blk(x, y + top, w, front, c, { hi: 0, lo: -0.22, side: 0.12 });
  const n = Math.max(1, Math.floor(w / 8)), gap = (w - n * 8) / 2;
  for (let i = 0; i < n; i++) stud(P, Math.round(x + gap + 1 + i * 8), y - 2, shade(c, 0.14));
}
// 마무리: 윤곽선 → 바닥 그림자. 모든 소품은 이 함수로 끝낸다.
// pad: 그림이 캔버스 끝까지 차 있으면 윤곽선 자리가 없으므로 사방에 1칸 여백을 더한다(기준점도 1칸 옮겨 월드 위치는 같음).
export function finish(c, cx, ax, ay, shadow, pad = false) {
  if (pad) {
    const [p, px] = mk(c.width + 2, c.height + 2);
    px.drawImage(c, 1, 1);
    c = p; cx = px; ax += 1; ay += 1;
    if (shadow) shadow = [shadow[0] + 1, shadow[1] + 1, ...shadow.slice(2)];
  }
  selout(cx, 0, 0, c.width, c.height);
  if (shadow) dropShadow(cx, ...shadow);
  return { c, ax, ay };
}

// ---------------------------------------------------------------- 레시피 → 그림
// recipe = { w, h, anchor:{x,y}, shadow?: {rx, ry} | false, parts: [...] }
// part.s(모양): box(r=모서리) · ell(타원) · rect(평면 칠) · px(점 목록) · line(선) · brick · stud · glass(유리창) · mirror(좌우 대칭 복사)
// part.c: 팔레트 이름('wood', 'red+1') 또는 '#hex'. part.flat: 명암 없이 칠하기
function line(P, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) P.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
}
function drawPart(P, cx, p, w) {
  const c = color(p.c), sh = p.flat ? FLAT : { ...STYLE.bevel, ...(p.bevel || {}) };
  switch (p.s) {
    case 'box': P.blk(p.x, p.y, p.w, p.h, c, { r: p.r || 0, ...sh }); break;
    case 'ell': P.ell(p.x, p.y, p.w, p.h, c, { ...sh, side: p.flat ? 0 : 0.06 }); break;
    case 'rect': P.rect(p.x, p.y, p.w, p.h, c); break;
    case 'px': for (const [x, y] of p.pts) P.px(x, y, c); break;
    case 'line': line(P, p.x0, p.y0, p.x1, p.y1, c); break;
    case 'brick': brick(P, p.x, p.y, p.w, c, p); break;
    case 'stud': stud(P, p.x, p.y, c); break;
    case 'glass':
      P.blk(p.x, p.y, p.w, p.h, color('paper'), { r: 0, hi: 0.1, lo: -0.12, side: 0.06 });
      P.rect(p.x + 2, p.y + 2, p.w - 4, p.h - 4, c);
      P.rect(p.x + 2, p.y + 2, p.w - 4, Math.max(1, Math.floor((p.h - 4) / 3)), shade(c, 0.3));
      line(P, p.x + 3, p.y + p.h - 4, p.x + Math.min(p.w, p.h) - 4, p.y + 3, shade(c, 0.55));
      break;
    case 'mirror': { // 지금까지 그린 왼쪽 절반을 오른쪽으로 뒤집어 복사
      const half = Math.floor(w / 2);
      cx.save(); cx.translate(w, 0); cx.scale(-1, 1);
      cx.drawImage(cx.canvas, 0, 0, half, cx.canvas.height, 0, 0, half, cx.canvas.height);
      cx.restore();
      break;
    }
    default: throw new Error(`알 수 없는 모양: ${p.s}`);
  }
}
// ---- 상태(state)와 분리 부품(layer)
// recipe.states = { closed: { hide: ['portal'], recolor: { runes: 'sky+1' }, add: [...] }, ... }
//   part.tag로 묶은 부품을 상태마다 숨기거나(hide) 색을 바꾸거나(recolor) 더한다(add). 모든 상태는 같은 캔버스·기준점을 쓴다.
// recipe.layers = { glow: { parts: [...], pivot?: {x,y}, blend?: 'add' } } — 따로 움직이거나 빛나는 부품은 별도 PNG로 내보낸다.
export const statesOf = (recipe) => (recipe.states ? Object.keys(recipe.states) : ['default']);
function resolveParts(recipe, state) {
  const st = recipe.states?.[state] ?? {};
  const hide = new Set(st.hide ?? []);
  const parts = recipe.parts.filter((p) => !hide.has(p.tag)).map((p) => (st.recolor?.[p.tag] ? { ...p, c: st.recolor[p.tag] } : p));
  return parts.concat(st.add ?? []);
}
export function renderRecipe(recipe, state = statesOf(recipe)[0]) {
  const { w, h, anchor } = recipe;
  const [c, cx] = mk(w, h);
  const P = new Pen(cx);
  for (const p of resolveParts(recipe, state)) drawPart(P, cx, p, w);
  const sh = recipe.shadow === false ? null : [anchor.x, anchor.y - 1, recipe.shadow?.rx ?? Math.round(w * 0.4), recipe.shadow?.ry ?? 3, STYLE.shadowAlpha];
  return finish(c, cx, anchor.x, anchor.y, sh);
}
export function renderLayer(recipe, name, state = statesOf(recipe)[0]) {
  const layer = recipe.layers[name];
  const [c, cx] = mk(recipe.w, recipe.h);
  const P = new Pen(cx);
  const st = layer.states?.[state];
  if (st === false) return finish(c, cx, recipe.anchor.x, recipe.anchor.y, null); // 이 상태에서는 빈 레이어
  for (const p of layer.parts) drawPart(P, cx, st?.recolor?.[p.tag] ? { ...p, c: st.recolor[p.tag] } : p, recipe.w);
  return layer.outline === false ? { c, ax: recipe.anchor.x, ay: recipe.anchor.y } : finish(c, cx, recipe.anchor.x, recipe.anchor.y, null);
}
// 납품 규칙(요청서 11절)에 맞춘 메타데이터
export function recipeMeta(id, recipe, scale = 1) {
  const k = scale, pt = (o) => ({ x: o.x * k, y: o.y * k });
  const col = recipe.collision ?? { x: recipe.anchor.x - Math.round(recipe.w * 0.35), y: recipe.anchor.y - 6, w: Math.round(recipe.w * 0.7), h: 6 };
  return {
    assetId: `${recipe.requestId ?? 'X'}_${id}`, name: recipe.name, version: recipe.version ?? 1, source: 'brickworld style-engine recipe (public/js/props.mjs)',
    frameSize: { w: recipe.w * k, h: recipe.h * k }, scale: k, anchor: pt(recipe.anchor),
    collisionFootprint: { x: col.x * k, y: col.y * k, w: col.w * k, h: col.h * k },
    attachPoints: Object.fromEntries(Object.entries(recipe.attach ?? {}).map(([n, p]) => [n, pt(p)])),
    states: statesOf(recipe),
    layers: Object.fromEntries(Object.entries(recipe.layers ?? {}).map(([n, l]) => [n, { pivot: l.pivot ? pt(l.pivot) : null, blend: l.blend ?? 'normal' }])),
    animations: recipe.animations ?? {}, gameIds: recipe.gameIds ?? [], directions: ['front'],
  };
}
// 파일 이름 규칙: 요청ID_에셋이름_상태_방향_프레임.png
export const assetFileName = (id, recipe, state, layer = null, dir = 'front', frame = 0) => `${recipe.requestId ?? 'X'}_${id}${layer ? `-${layer}` : ''}_${state}_${dir}_${frame}.png`;

// 같은 에셋의 상태끼리 실루엣이 크게 달라지지 않았는지(요청서: 전후 상태는 같은 캔버스·앵커·실루엣 기준 공유)
export function silhouetteDiff(a, b) {
  const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, db = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
  let union = 0, diff = 0;
  for (let i = 3; i < da.length; i += 4) { const x = da[i] === 255, y = db[i] === 255; if (x || y) union++; if (x !== y) diff++; }
  return union ? diff / union : 0;
}

// ---------------------------------------------------------------- 손으로 그린 그림 다듬기(픽셀 에디터용)
// 같은 색 덩어리마다 위·왼쪽 가장자리는 밝게, 아래·오른쪽은 어둡게 → 코드 그림과 같은 입체감
export function autoShade(id, strength = 1) {
  const { width: w, height: h, data: a } = id;
  const src = new Uint8ClampedArray(a);
  const same = (i, j) => src[j + 3] > 127 && src[i] === src[j] && src[i + 1] === src[j + 1] && src[i + 2] === src[j + 2];
  const put = (i, k) => { const [r, g, b] = toRgb(shade(`rgb(${src[i]},${src[i + 1]},${src[i + 2]})`, k * strength)); a[i] = r; a[i + 1] = g; a[i + 2] = b; };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] <= 127) continue;
      const up = y > 0 && same(i, i - w * 4), down = y < h - 1 && same(i, i + w * 4);
      const left = x > 0 && same(i, i - 4), right = x < w - 1 && same(i, i + 4);
      if (!up) put(i, STYLE.bevel.hi);
      else if (!down) put(i, STYLE.bevel.lo);
      else if (!left) put(i, STYLE.bevel.side);
      else if (!right) put(i, -STYLE.bevel.side);
    }
  }
  return id;
}
// 반투명 픽셀을 없앤다(픽셀 아트는 완전 불투명/완전 투명만)
export function crispAlpha(id) {
  const a = id.data;
  for (let i = 3; i < a.length; i += 4) a[i] = a[i] > 127 ? 255 : 0;
  return id;
}

// ---------------------------------------------------------------- 균일성 검사
const SHADOW_RGB = [24, 44, 34];
/**
 * 그림이 스타일 규칙을 지키는지 검사한다.
 * @returns {{ ok: boolean, issues: string[], stats: object }}
 */
export function checkSprite(canvas, { kind = 'prop', anchor = null } = {}) {
  const w = canvas.width, h = canvas.height;
  const a = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const issues = [];
  const colors = new Set();
  let opaque = 0, partial = 0, edge = 0, darkEdge = 0, touching = 0;
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : a[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, al = a[i + 3];
      if (!al) continue;
      const isShadow = al < 255 && Math.abs(a[i] - SHADOW_RGB[0]) < 12 && Math.abs(a[i + 1] - SHADOW_RGB[1]) < 12 && Math.abs(a[i + 2] - SHADOW_RGB[2]) < 12;
      if (al < 255) { if (!isShadow) partial++; continue; }
      opaque++;
      colors.add((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]);
      const luma = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2];
      if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && luma >= 120) touching++;
      if (A(x - 1, y) < 255 || A(x + 1, y) < 255 || A(x, y - 1) < 255 || A(x, y + 1) < 255) {
        edge++;
        if (0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2] < 120) darkEdge++;
      }
    }
  }
  if (!opaque) issues.push('그림이 비어 있어요.');
  if (partial > opaque * 0.01) issues.push(`반투명 픽셀 ${partial}개: 픽셀 아트는 완전 불투명/투명만 써요(그림자 제외).`);
  const maxC = STYLE.maxColors(w, h);
  if (colors.size > maxC) issues.push(`색이 ${colors.size}개로 많아요(이 크기 권장 ${maxC}개 이하).`);
  if (edge && darkEdge / edge < 0.85) issues.push(`바깥 윤곽선이 약해요(가장자리 중 어두운 선 ${Math.round((darkEdge / edge) * 100)}%).`);
  if (touching > 0) issues.push('그림이 캔버스 끝에 닿아 윤곽선이 잘려요(1칸 이상 여백 필요).');
  if (kind === 'tile' && (w % STYLE.tile || h % STYLE.tile)) issues.push(`타일은 ${STYLE.tile}칸 단위여야 해요(지금 ${w}×${h}).`);
  if (kind === 'avatar' && (w !== STYLE.avatar.w || h !== STYLE.avatar.h)) issues.push(`캐릭터 칸은 ${STYLE.avatar.w}×${STYLE.avatar.h}이어야 해요.`);
  if (anchor && (anchor.x < 0 || anchor.x > w || anchor.y < 0 || anchor.y > h)) issues.push('바닥 기준점이 그림 밖에 있어요.');
  return { ok: issues.length === 0, issues, stats: { w, h, colors: colors.size, opaque, outline: edge ? Math.round((darkEdge / edge) * 100) : 0 } };
}
