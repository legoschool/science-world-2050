// 착용 소품: 의뢰를 해결하면 모자, 등 소품, 따라다니는 동료가 열린다.
// 열림은 퀘스트 수첩의 완료(서버에 남은 의뢰 완료 기록)로 세고, 레벨이 오를 때마다 목록 순서대로 하나씩도 열린다(탐험 왕관은 네 지구 의뢰 52개 해결만).
// 그림 파일 없이 캐릭터 그림 위에 점으로 그려 얹는다.
export const SLOTS = [['head', '머리'], ['back', '등'], ['pet', '동료']];
const RN = {R1: '햇살 농장 지구', R2: '불꽃 에너지 지구', R3: '전력망 지구', R4: '미래 연구 본부', R5: '푸른 생활 지구'};
const how = (k, n) => (k === 'main' ? '네 지구 의뢰 52개를 모두 해결' : k === 'all' ? `의뢰 ${n}개 해결` : `${RN[k]} 의뢰 ${n}개 해결`);
export const WEAR = [
  ['hat-explorer', 'head', '탐사 모자', {all: 1}],
  ['bag', 'back', '탐험 가방', {all: 3}],
  ['hat-straw', 'head', '밀짚모자', {R1: 3}],
  ['goggles', 'head', '실험 고글', {R2: 3}],
  ['hardhat', 'head', '안전모', {R3: 3}],
  ['headphones', 'head', '헤드폰', {R4: 3}],
  ['cap', 'head', '야구 모자', {all: 6}],
  ['pet-drone', 'pet', '미니 드론', {R4: 6}],
  ['pet-sprout', 'pet', '새싹 요정', {R1: 8}],
  ['pet-salamander', 'pet', '불꽃 도롱뇽', {R2: 8}],
  ['pet-robot', 'pet', '꼬마 로봇', {R3: 8}],
  ['beanie', 'head', '털모자', {all: 10}],
  ['cape', 'back', '구조대 망토', {all: 15}],
  ['cat-ears', 'head', '고양이 귀', {all: 20}],
  ['solar-wings', 'back', '태양광 날개', {all: 30}],
  ['pet-starcat', 'pet', '별빛 고양이', {all: 40}],
  ['crown', 'head', '탐험 왕관', {main: 52}],
].map(([id, slot, name, need], i) => { const [k, n] = Object.entries(need)[0], lv = id === 'crown' ? 0 : i + 2; return {id, slot, name, key: k, need: n, lv, how: (lv ? `Lv.${lv} 또는 ` : '') + how(k, n)}; });
export const wearById = (id) => WEAR.find((w) => w.id === id);

export function countDone(doneIds) {
  const c = {all: 0, main: 0, R1: 0, R2: 0, R3: 0, R4: 0, R5: 0};
  for (const id of doneIds) { c.all++; const r = String(id).slice(0, 2); if (r in c) c[r]++; if (/^R[1-4]-/.test(String(id))) c.main++; }
  return c;
}
// counts.level이 있으면 레벨로도 연다
export const isOpen = (w, counts) => (counts[w.key] || 0) >= w.need || (w.lv > 0 && (counts.level || 0) >= w.lv);
// 저장된 착용값에서 아직 열리지 않았거나 없는 소품은 뺀다
export function cleanWear(wear, counts) {
  const out = {};
  for (const [slot] of SLOTS) { const w = wearById(wear?.[slot]); if (w && w.slot === slot && isOpen(w, counts)) out[slot] = w.id; }
  return out;
}

// ---------------------------------------------------------------- 점 그림 도구
function P(c) {
  return {
    r: (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    // 가로줄로 채운 타원. top만 그리면 위쪽 반만
    oval: (cx, cy, rx, ry, col, half) => {
      c.fillStyle = col;
      for (let dy = -ry; dy <= (half ? 0 : ry); dy++) { const k = 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)); if (k <= 0) continue; const hw = Math.round(rx * Math.sqrt(k)); c.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1); }
    },
    tri: (x, y, w, h, col) => { c.fillStyle = col; for (let i = 0; i < h; i++) { const ww = Math.max(1, Math.round((w * (i + 1)) / h)); c.fillRect(Math.round(x + (w - ww) / 2), Math.round(y + i), ww, 1); } },
  };
}
const INK = '#2a211c';

// 모자: cx는 머리 가운데, top은 머리카락 꼭대기, hw는 머리 너비, dir은 바라보는 쪽
function drawHead(c, id, cx, top0, hw, dir) {
  const p = P(c), h = hw / 2, side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, top = top0 + 3;
  if (id === 'hat-explorer' || id === 'hat-straw') {
    const straw = id === 'hat-straw', brim = straw ? h + 8 : h + 5, base = straw ? '#e8cf7a' : '#cfae6c', dark = straw ? '#b89a4a' : '#8d7240';
    p.oval(cx, top + 12, brim + 1, 4, INK); p.oval(cx, top + 12, brim, 3, base);
    p.oval(cx, top + 8, h, 11, INK, true); p.oval(cx, top + 8, h - 1, 10, base, true);
    p.r(cx - h + 2, top + 5, hw - 4, 3, straw ? '#c8443a' : '#6b4f2a');
    p.r(cx - h + 6, top - 1, 4, 2, '#fff3c8');
    p.r(cx - brim, top + 13, brim * 2, 1, dark);
  } else if (id === 'hardhat') {
    p.oval(cx, top + 10, h + 3, 13, INK, true); p.oval(cx, top + 10, h + 2, 12, '#f2c230', true);
    p.r(cx - 1, top - 2, 3, 12, '#ffe27a');
    p.r(cx - h - 5, top + 9, hw + 10, 4, INK); p.r(cx - h - 4, top + 10, hw + 8, 2, '#d9a514');
    if (side) p.r(cx + side * (h + 2) - (side > 0 ? 0 : 7), top + 8, 7, 4, '#d9a514');
  } else if (id === 'cap') {
    p.oval(cx, top + 10, h + 1, 12, INK, true); p.oval(cx, top + 10, h, 11, '#2f6fd6', true);
    p.r(cx - 2, top - 1, 4, 2, '#7fb0ff');
    if (dir === 'down') { p.oval(cx, top + 11, h - 2, 2, INK); p.oval(cx, top + 11, h - 3, 1, '#1f4ea0'); }
    else if (side) { const x0 = side > 0 ? cx + h - 4 : cx - h - 11; p.r(x0, top + 8, 15, 4, INK); p.r(x0 + 1, top + 9, 13, 2, '#1f4ea0'); }
    else p.r(cx - 5, top + 8, 10, 2, '#1f4ea0');
  } else if (id === 'beanie') {
    p.oval(cx, top + 12, h + 2, 15, INK, true); p.oval(cx, top + 12, h + 1, 14, '#d8443c', true);
    for (let x = cx - h + 3; x < cx + h - 2; x += 4) p.r(x, top, 1, 10, '#b8302a');
    p.r(cx - h - 2, top + 10, hw + 4, 6, INK); p.r(cx - h - 1, top + 11, hw + 2, 4, '#f1ece0');
    p.oval(cx, top - 4, 4, 4, INK); p.oval(cx, top - 4, 3, 3, '#ffffff');
  } else if (id === 'cat-ears') {
    for (const s of [-1, 1]) {
      if (side && s === -side) continue;
      const x = cx + s * (h - 8) - 8;
      p.tri(x - 1, top - 12, 18, 17, INK); p.tri(x + 1, top - 9, 14, 13, '#4a3b36'); p.tri(x + 4, top - 5, 8, 8, '#f49ab8');
    }
  } else if (id === 'headphones') {
    for (let a = 0; a <= 24; a++) { const t = Math.PI * (a / 24), x = cx - Math.cos(t) * (h + 3), y = top + 18 - Math.sin(t) * 19; p.r(x - 2, y - 1, 5, 5, INK); p.r(x - 1, y, 3, 3, '#47505e'); }
    const cups = side ? [cx - side * 2] : [cx - h - 3, cx + h + 3];
    for (const x of cups) { p.r(x - 5, top + 16, 10, 13, INK); p.r(x - 4, top + 17, 8, 11, '#e2503f'); p.r(x - 3, top + 18, 3, 5, '#ff9a8a'); }
  } else if (id === 'goggles') {
    const eyeY = top0 + 23, strap = Math.min(30, hw), half = strap / 2;
    p.r(cx - half - 1, eyeY - 1, strap + 2, 3, INK); p.r(cx - half, eyeY, strap, 1, '#3b4a5a');
    const lenses = dir === 'up' ? [] : side ? [cx + side * (half - 7)] : [cx - 6, cx + 6];
    for (const x of lenses) { p.oval(x, eyeY, 5, 4, INK); p.oval(x, eyeY, 4, 3, '#8fdcf0'); p.r(x - 2, eyeY - 2, 1, 2, '#ffffff'); }
  } else if (id === 'crown') {
    const w = Math.max(22, hw - 10), x0 = cx - w / 2;
    p.r(x0 - 1, top - 1, w + 2, 9, INK); p.r(x0, top, w, 7, '#f2c14e');
    for (let i = 0; i < 3; i++) { const x = x0 + (i * (w - 10)) / 2; p.tri(x - 1, top - 11, 12, 11, INK); p.tri(x + 1, top - 9, 8, 9, '#f2c14e'); }
    p.r(cx - 2, top + 2, 4, 3, '#d8343a'); p.r(x0 + 3, top + 2, 3, 3, '#2659c8'); p.r(x0 + w - 6, top + 2, 3, 3, '#3aa04b');
  }
}

// 소품 외곽을 먼저 구한다. 걸을 때 머리가 칸 가장자리로 움직여도 모자 일부가 잘리지 않게 한다.
// 원래 그림과 발 위치는 유지하고, 소품이 칸 밖으로 나가는 경우에만 안쪽으로 옮긴다.
const headArt = new Map();
function fitHead(c, id, cx, top, hw, dir, fw, fh) {
  const key = `${id}|${hw}|${dir}`;
  if (!headArt.has(key)) {
    const draft = document.createElement('canvas'); draft.width = 128; draft.height = 96;
    const d = draft.getContext('2d', {willReadFrequently: true});
    drawHead(d, id, 64, 32, hw, dir);
    const data = d.getImageData(0, 0, draft.width, draft.height).data;
    let left = draft.width, right = -1, above = draft.height, below = -1;
    for (let y = 0; y < draft.height; y++) for (let x = 0; x < draft.width; x++) if (data[(y * draft.width + x) * 4 + 3]) {
      left = Math.min(left, x); right = Math.max(right, x); above = Math.min(above, y); below = Math.max(below, y);
    }
    if (right < left) headArt.set(key, null);
    else {
      const image = document.createElement('canvas'); image.width = right - left + 1; image.height = below - above + 1;
      image.getContext('2d').drawImage(draft, left, above, image.width, image.height, 0, 0, image.width, image.height);
      headArt.set(key, {image, dx: left - 64, dy: above - 32});
    }
  }
  const art = headArt.get(key);
  if (!art) return;
  const x = Math.max(0, Math.min(fw - art.image.width, Math.round(cx + art.dx)));
  const y = Math.max(0, Math.min(fh - art.image.height, Math.round(top + art.dy)));
  c.drawImage(art.image, x, y);
}

// 등 소품: front가 참이면 몸 위(뒷모습), 거짓이면 몸 뒤에 그린다
function drawBack(c, id, cx, ty, tw, dir, front) {
  const p = P(c), side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, h = tw / 2;
  if (id === 'bag') {
    if (dir === 'up' && front) { p.r(cx - 10, ty + 2, 20, 18, INK); p.r(cx - 9, ty + 3, 18, 16, '#b8662c'); p.r(cx - 9, ty + 3, 18, 5, '#8c4a1c'); p.r(cx - 2, ty + 7, 4, 3, '#f2c14e'); }
    else if (dir === 'down' && front) { p.r(cx - h + 3, ty, 3, 12, '#7a3f1a'); p.r(cx + h - 6, ty, 3, 12, '#7a3f1a'); }
    else if (side && !front) { const x = cx - side * (h + 2) - 5; p.r(x - 1, ty + 1, 12, 17, INK); p.r(x, ty + 2, 10, 15, '#b8662c'); p.r(x, ty + 2, 10, 4, '#8c4a1c'); }
  } else if (id === 'cape') {
    const col = '#c8343a', dark = '#8e1f26';
    if (dir === 'up' ? front : !front) {
      const len = dir === 'down' ? 18 : 24, y0 = ty - 3;
      for (let i = 0; i < len; i++) {
        const w = side ? 5 + Math.round(i / 3) : (dir === 'down' ? tw + 2 : tw - 4) + Math.round(i / 2.5);
        const x = side > 0 ? cx - h + 7 - w : side < 0 ? cx + h - 7 : cx - w / 2;
        p.r(x - 1, y0 + i, w + 2, 1, INK); p.r(x, y0 + i, w, 1, i % 6 === 5 ? dark : col);
      }
      if (!side) p.r(cx - h + 2, y0 - 1, tw - 4, 3, '#f2c14e');
    }
  } else if (id === 'solar-wings') {
    if (dir === 'up' ? front : !front) {
      const wings = side ? [-side] : [-1, 1];
      for (const s of wings) {
        const x0 = side ? cx - side * 6 + (s < 0 ? -16 : 0) : cx + s * (h - 6) + (s < 0 ? -16 : 0);
        p.r(x0 - 1, ty - 11, 18, 22, INK); p.r(x0, ty - 10, 16, 20, '#2b5fa8');
        for (let gx = 4; gx < 16; gx += 5) p.r(x0 + gx, ty - 10, 1, 20, '#7fb6ff');
        for (let gy = 4; gy < 20; gy += 6) p.r(x0, ty - 10 + gy, 16, 1, '#7fb6ff');
      }
    }
  }
}

// ---------------------------------------------------------------- 캐릭터 시트에 소품 얹기
const ROWS = ['down', 'left', 'right', 'up'];
const cache = new WeakMap();
// 한 칸의 머리 꼭대기와 머리 너비, 몸통 위치를 그림의 불투명 점에서 찾는다
function anchors(data, W, x0, y0, fw, fh) {
  const op = (x, y) => data[((y0 + y) * W + x0 + x) * 4 + 3] > 40;
  let top = -1;
  for (let y = 0; y < fh && top < 0; y++) for (let x = 0; x < fw; x++) if (op(x, y)) { top = y; break; }
  if (top < 0) return null;
  const span = (ya, yb) => { let a = fw, b = -1; for (let y = ya; y < Math.min(fh, yb); y++) for (let x = 0; x < fw; x++) if (op(x, y)) { if (x < a) a = x; if (x > b) b = x; } return b < 0 ? null : [a, b]; };
  const head = span(top, top + 20) || [0, fw - 1], torso = span(top + 36, top + 48) || head;
  return {cx: (head[0] + head[1]) / 2, top, hw: head[1] - head[0] + 1, tcx: (torso[0] + torso[1]) / 2, ty: top + 34, tw: Math.min(30, torso[1] - torso[0] + 1)};
}
export function dressSheet(sheet, wear) {
  const m = sheet?.meta;
  if (!m || !m.cols || !(wear?.head || wear?.back)) return sheet;
  const key = (wear.head || '') + '|' + (wear.back || '');
  let per = cache.get(sheet);
  if (!per) { per = new Map(); cache.set(sheet, per); }
  if (per.has(key)) return per.get(key);
  const W = sheet.width, H = sheet.height, src = document.createElement('canvas'); src.width = W; src.height = H;
  const sx = src.getContext('2d', {willReadFrequently: true}); sx.drawImage(sheet, 0, 0);
  const data = sx.getImageData(0, 0, W, H).data;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const c = out.getContext('2d'); c.imageSmoothingEnabled = false;
  const rows = Math.round(H / m.fh);
  const points = Array.from({length: rows}, (_, r) => Array.from({length: m.cols}, (_, col) => anchors(data, W, col * m.fw, r * m.fh, m.fw, m.fh)));
  // 걷는 장면마다 머리카락 폭을 재면 모자가 늘었다 줄어든다. 방향별 대표 폭을 유지한다.
  const widths = points.map(row => { const w = row.filter(Boolean).map(a => a.hw).sort((a, b) => a - b); return Math.min(34, w[Math.floor(w.length / 2)] || 30); });
  for (let r = 0; r < rows; r++) for (let col = 0; col < m.cols; col++) {
    const x0 = col * m.fw, y0 = r * m.fh, dir = ROWS[r] || 'down', a = points[r][col];
    c.save(); c.beginPath(); c.rect(x0, y0, m.fw, m.fh); c.clip(); c.translate(x0, y0);
    if (a && wear.back) drawBack(c, wear.back, a.tcx, a.ty, a.tw, dir, false);
    c.drawImage(sheet, x0, y0, m.fw, m.fh, 0, 0, m.fw, m.fh);
    if (a && wear.back) drawBack(c, wear.back, a.tcx, a.ty, a.tw, dir, true);
    if (a && wear.head) fitHead(c, wear.head, a.cx, a.top, widths[r], dir, m.fw, m.fh);
    c.restore();
  }
  out.meta = m; out.lookKey = (sheet.lookKey || '') + '+' + key;
  per.set(key, out);
  return out;
}

// ---------------------------------------------------------------- 따라다니는 동료
// (x, y)는 발밑 기준점. t는 초 단위 시간. 너비 24점 안팎.
export function drawPet(c, id, x, y, t, dir) {
  const p = P(c), bob = Math.round(Math.sin(t * 6) * 1.5), f = dir === 'left' ? -1 : 1;
  c.save(); c.globalAlpha = 0.28; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y, 9, 3, 0, 0, Math.PI * 2); c.fill(); c.restore();
  if (id === 'pet-sprout') {
    const by = y - 12 + bob; p.oval(x, by, 9, 8, INK); p.oval(x, by, 8, 7, '#6fcf6a'); p.oval(x - 3, by - 3, 2, 2, '#a8f0a0');
    p.tri(x - 8, by - 16, 8, 8, INK); p.tri(x - 7, by - 15, 6, 7, '#3fa34a'); p.tri(x, by - 17, 8, 9, INK); p.tri(x + 1, by - 16, 6, 8, '#57c25a');
    p.r(x - 4, by - 1, 2, 3, INK); p.r(x + 2, by - 1, 2, 3, INK); p.r(x - 1, by + 3, 2, 1, '#e07a7a');
  } else if (id === 'pet-salamander') {
    const by = y - 6; p.r(x - 10 * f - (f > 0 ? 0 : 0), by - 6, 1, 1, INK);
    p.oval(x, by - 4, 9, 5, INK); p.oval(x, by - 4, 8, 4, '#f08a3a'); p.oval(x + 8 * f, by - 7 + bob, 5, 4, INK); p.oval(x + 8 * f, by - 7 + bob, 4, 3, '#f5a050');
    p.r(x + 9 * f, by - 8 + bob, 2, 2, INK);
    const fl = Math.floor(t * 10) % 2; p.tri(x - 14 * f - 3, by - 12 - fl, 6, 8, '#ffd23f'); p.tri(x - 14 * f - 2, by - 9 - fl, 4, 5, '#ff6a2a');
    p.r(x - 5, by, 2, 2, '#c45a1c'); p.r(x + 4, by, 2, 2, '#c45a1c');
  } else if (id === 'pet-robot') {
    const by = y - 4; p.r(x - 8, by - 4, 16, 4, INK); p.r(x - 6, by - 3, 4, 3, '#555'); p.r(x + 2, by - 3, 4, 3, '#555');
    p.r(x - 8, by - 18 + bob, 16, 14, INK); p.r(x - 7, by - 17 + bob, 14, 12, '#b9c4cf'); p.r(x - 5, by - 14 + bob, 10, 5, '#1d2a38');
    p.r(x - 4 + f, by - 13 + bob, 2, 2, '#7fe0ff'); p.r(x + 2 + f, by - 13 + bob, 2, 2, '#7fe0ff');
    p.r(x, by - 23 + bob, 1, 5, INK); p.r(x - 1, by - 25 + bob, 3, 3, Math.floor(t * 2) % 2 ? '#ff4a3d' : '#ffd23f');
  } else if (id === 'pet-drone') {
    const by = y - 26 + bob * 2; p.r(x - 7, by - 3, 14, 7, INK); p.r(x - 6, by - 2, 12, 5, '#e8eef5'); p.r(x - 2, by - 1, 4, 3, '#2659c8');
    const spin = Math.floor(t * 20) % 2 ? 6 : 3; for (const s of [-1, 1]) { p.r(x + s * 8 - spin, by - 6, spin * 2, 1, '#5a6472'); p.r(x + s * 8, by - 5, 1, 3, INK); }
    p.r(x - 1, by + 4, 2, 2, Math.floor(t * 3) % 2 ? '#3aa04b' : '#1f6b30');
  } else if (id === 'pet-starcat') {
    const by = y - 6; p.oval(x - 2 * f, by - 5, 8, 5, INK); p.oval(x - 2 * f, by - 5, 7, 4, '#2b3a78');
    p.oval(x + 6 * f, by - 10 + bob, 6, 5, INK); p.oval(x + 6 * f, by - 10 + bob, 5, 4, '#33448a');
    p.tri(x + 2 * f - 2, by - 18 + bob, 4, 4, '#33448a'); p.tri(x + 9 * f - 2, by - 18 + bob, 4, 4, '#33448a');
    p.r(x + 5 * f, by - 11 + bob, 1, 2, '#ffe45c'); p.r(x + 8 * f, by - 11 + bob, 1, 2, '#ffe45c');
    p.r(x - 10 * f, by - 10 - (Math.floor(t * 3) % 2), 2, 6, '#2b3a78');
    if (Math.floor(t * 2) % 3 === 0) { p.r(x - 12 * f, by - 18, 1, 3, '#ffe45c'); p.r(x - 13 * f, by - 17, 3, 1, '#ffe45c'); }
  }
}
