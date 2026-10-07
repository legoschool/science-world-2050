// 바닥·건물·소품 도트 그림을 코드로 그린다. 도트 1칸 = 월드 1px, 타일 1칸 = 32도트.
// 바닥은 한 칸씩 무늬를 찍지 않고 월드 좌표 기준 잡음(noise)으로 칠해 반복 무늬가 보이지 않게 한다.
import { shade, mk, Pen, FLAT } from './pix.mjs';
import { stud, brick, finish } from './style.mjs';
import { getPropSprite } from './props.mjs'; // 공용 부품·마무리는 스타일 엔진 한 곳에서
// 코드 그림은 캔버스를 꽉 채우는 것이 많아 항상 1칸 여백을 두고 마무리한다
const finishPad = (c, cx, ax, ay, shadow) => finish(c, cx, ax, ay, shadow, true);

export const NT = 32;

// ---------------------------------------------------------------- 잡음
const hash = (x, y, s = 0) => {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1597334677)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
};
const rnd = (x, y, s) => hash(x, y, s) / 4294967296;
function vnoise(x, y, sc, s) {
  const gx = x / sc, gy = y / sc, x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = rnd(x0, y0, s), b = rnd(x0 + 1, y0, s), c = rnd(x0, y0 + 1, s), d = rnd(x0 + 1, y0 + 1, s);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

// ---------------------------------------------------------------- 바닥 한 점의 색
function wallInfo(map) {
  const info = map.tiles.map((r) => [...r].map(() => null));
  for (let tx = 0; tx < map.w; tx++) {
    let ty = 0;
    while (ty < map.h) {
      if (map.tiles[ty][tx] !== 'W') { ty++; continue; }
      const start = ty;
      while (ty < map.h && map.tiles[ty][tx] === 'W') ty++;
      const face = ty < map.h && ty - start <= 4; // 아래가 바닥이고 높이 4칸 이하면 정면 벽
      for (let k = start; k < ty; k++) info[k][tx] = face ? { face: true, topY: start * NT, floorY: ty * NT } : { face: false };
    }
  }
  return info;
}

function groundPixel(ch, x, y, frame, wi, o) {
  let r, g, b;
  switch (ch) {
    case 'g': {
      const n = vnoise(x, y, 60, 1) * 0.62 + vnoise(x, y, 19, 2) * 0.38;
      if (n < 0.4) { r = 92; g = 174; b = 80; } else if (n < 0.6) { r = 108; g = 190; b = 90; } else { r = 126; g = 204; b = 100; }
      const h = hash(x, y, 3) % 89;
      if (h === 0) { r += 26; g += 22; b += 14; } else if (h === 1) { r -= 18; g -= 22; b -= 14; }
      break;
    }
    case 'p': { // 벽돌 길
      const row = y >> 3, off = (row & 1) * 8, bx = (x + off) >> 4, lx = (x + off) & 15, ly = y & 7;
      if (lx === 0 || ly === 0) { r = 200; g = 166; b = 116; break; }
      const v = (hash(bx, row, 4) % 13) - 6;
      r = 236 + v; g = 206 + v; b = 154 + v;
      if (ly === 1) { r += 8; g += 8; b += 8; } else if (ly === 7) { r -= 16; g -= 17; b -= 14; } else if (lx === 15) { r -= 8; g -= 8; b -= 6; }
      break;
    }
    case 'P': { // 광장 돌판
      const bx = x >> 4, by = y >> 4, lx = x & 15, ly = y & 15;
      if (lx === 0 || ly === 0) { r = 182; g = 188; b = 204; break; }
      const v = (hash(bx, by, 5) % 9) - 4;
      r = 222 + v; g = 226 + v; b = 235 + v;
      if (ly === 1 || lx === 1) { r += 10; g += 10; b += 8; } else if (ly === 15 || lx === 15) { r -= 14; g -= 14; b -= 12; }
      break;
    }
    case 'w': {
      const n = vnoise(x, y, 26, 6);
      r = 66 + n * 22; g = 158 + n * 20; b = 226 + n * 14;
      const band = (y / 10) | 0, sx = x + frame * 5 + band * 13;
      if (y % 10 === 0 && hash((sx / 12) | 0, band, 7) % 3 === 0 && sx % 12 < 7) { r = 180; g = 228; b = 252; }
      break;
    }
    case 'f': { // 나무 마루
      const row = y >> 3, off = hash(row, 0, 8) % 64, bx = Math.floor((x + off) / 64), lx = (x + off) % 64, ly = y & 7;
      if (ly === 7) { r = 170; g = 116; b = 70; break; }
      if (lx === 0) { r = 182; g = 126; b = 80; break; }
      const v = (hash(bx, row, 9) % 11) - 5;
      r = 220 + v; g = 167 + v; b = 108 + v;
      if (ly === 0) { r += 10; g += 10; b += 8; }
      if (hash(x >> 1, y, 10) % 23 === 0) { r -= 12; g -= 12; b -= 10; }
      break;
    }
    case 'c': { // 카펫
      r = 76; g = 126; b = 214;
      if (((x + y) & 15) === 0 || ((x - y) & 15) === 0) { r = 64; g = 110; b = 196; }
      if ((x & 15) === 8 && (y & 15) === 8) { r = 250; g = 214; b = 96; }
      break;
    }
    case 'b': case 'r': { // O·X 활동판: 스터드가 있는 판
      const [br, bg, bb] = ch === 'b' ? [78, 136, 220] : [224, 94, 82];
      const lx = (x & 15) - 7.5, ly = (y & 15) - 7.5, r2 = lx * lx + ly * ly;
      let k = 0;
      if (r2 <= 18) k = lx + ly < -3 ? 28 : 10; else if (r2 <= 30 && lx + ly > 2) k = -26;
      r = br + k; g = bg + k; b = bb + k;
      break;
    }
    case 'W': {
      if (wi && wi.face) {
        const fy = wi.floorY - y;
        if (y - wi.topY < 6) { r = 222; g = 206; b = 172; if (y - wi.topY === 5) { r = 196; g = 178; b = 142; } }
        else if (fy <= 4) { r = fy <= 1 ? 118 : 148; g = fy <= 1 ? 84 : 106; b = fy <= 1 ? 56 : 70; }
        else if (fy <= 28) {
          r = 200; g = 150; b = 100;
          if (fy >= 26) { r = 218; g = 172; b = 120; } else if (fy === 25) { r = 168; g = 122; b = 80; }
          else if (x % 32 === 0) { r = 170; g = 124; b = 82; } else if (x % 32 === 1) { r = 214; g = 166; b = 114; }
        } else {
          r = 246; g = 234; b = 208;
          if ((x >> 3) & 1) { r = 240; g = 227; b = 199; }
          if (fy === 29) { r = 226; g = 210; b = 180; }
        }
      } else { r = 226; g = 210; b = 176; if (hash(x >> 2, y >> 2, 11) % 5 === 0) { r -= 5; g -= 5; b -= 5; } }
      break;
    }
    default: r = g = b = 0;
  }
  o[0] = r; o[1] = g; o[2] = b;
}

// ---------------------------------------------------------------- 경계·장식
function paintEdges(cx, map, walls) {
  const P = new Pen(cx);
  const at = (tx, ty) => (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h ? null : map.tiles[ty][tx]);
  const road = (c) => c === 'p' || c === 'P';
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const ch = map.tiles[ty][tx], X = tx * NT, Y = ty * NT;
      const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => [dx, dy, at(tx + dx, ty + dy)]);
      const strip = (dx, dy, t, c) => {
        if (dy === -1) P.rect(X, Y, NT, t, c); else if (dy === 1) P.rect(X, Y + NT - t, NT, t, c);
        else if (dx === -1) P.rect(X, Y, t, NT, c); else P.rect(X + NT - t, Y, t, NT, c);
      };
      if (road(ch)) {
        for (const [dx, dy, n] of sides) if (n && !road(n)) { strip(dx, dy, 3, ch === 'p' ? '#c29a62' : '#b3b9c9'); strip(dx, dy, 1, ch === 'p' ? '#9f7b4a' : '#949bb0'); }
      }
      if (ch === 'w') {
        for (const [dx, dy, n] of sides) {
          if (!n || n === 'w') continue;
          strip(dx, dy, 6, '#6b8fb0'); strip(dx, dy, 5, '#cfd4de'); strip(dx, dy, 2, '#eef0f5'); strip(dx, dy, 1, '#8d93a6');
        }
      }
      if (ch === 'b' || ch === 'r') {
        for (const [dx, dy, n] of sides) if (n && n !== 'b' && n !== 'r') strip(dx, dy, 2, ch === 'b' ? '#355f9e' : '#9e3a31');
      }
      if (ch === 'f' || ch === 'c') {
        for (const [dx, dy, n] of sides) {
          if (n !== 'W') continue;
          if (dy === -1) { P.rect(X, Y, NT, 7, 'rgba(70,40,20,0.14)'); P.rect(X, Y, NT, 3, 'rgba(70,40,20,0.12)'); }
          else if (dx) strip(dx, dy, 4, 'rgba(70,40,20,0.12)');
        }
      }
      if (ch === 'W' && walls[ty][tx] && !walls[ty][tx].face) {
        for (const [dx, dy, n] of sides) if (n === 'f' || n === 'c') { strip(dx, dy, 4, '#c8ae80'); strip(dx, dy, 1, '#957a52'); }
      }
      // 길가 잔디가 살짝 넘어온 모양
      if (ch === 'g') {
        for (const [dx, dy, n] of sides) {
          if (!road(n)) continue;
          for (let i = 2; i < NT - 2; i += 4) {
            if (hash(X + i, Y, 20 + dx * 3 + dy) % 3) continue;
            const c = '#6cbd5a';
            if (dy === 1) P.rect(X + i, Y + NT, 2, 2, c); else if (dy === -1) P.rect(X + i, Y - 2, 2, 2, c);
            else if (dx === 1) P.rect(X + NT, Y + i, 2, 2, c); else P.rect(X - 2, Y + i, 2, 2, c);
          }
        }
      }
    }
  }
}

const FLOWERS = [['#ffffff', '#ffd23f'], ['#ffe066', '#f28a1a'], ['#ff9cc4', '#ffffff'], ['#9fd4ff', '#ffffff']];
function paintDecor(cx, map) {
  const P = new Pen(cx);
  const grass = (tx, ty) => tx >= 0 && ty >= 0 && tx < map.w && ty < map.h && map.tiles[ty][tx] === 'g';
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (!grass(tx, ty) || !grass(tx - 1, ty) || !grass(tx + 1, ty) || !grass(tx, ty - 1) || !grass(tx, ty + 1)) continue;
      const h = hash(tx, ty, 30);
      const tufts = h % 3;
      for (let k = 0; k < tufts; k++) {
        const x = tx * NT + 4 + (hash(tx, ty, 31 + k) % 22), y = ty * NT + 6 + (hash(tx, ty, 41 + k) % 20);
        const dk = '#4f9c43', lt = '#9adc74';
        P.px(x, y + 2, dk); P.px(x + 1, y + 1, dk); P.px(x + 2, y, dk); P.px(x + 2, y + 1, dk); P.px(x + 3, y + 1, dk); P.px(x + 4, y + 2, dk);
        P.px(x + 2, y - 1, lt); P.px(x, y + 1, lt);
      }
      if (h % 11 === 0) {
        const [pc, cc] = FLOWERS[(h >>> 4) % FLOWERS.length];
        for (let k = 0; k < 3; k++) {
          const x = tx * NT + 5 + (hash(tx, ty, 51 + k) % 20), y = ty * NT + 5 + (hash(tx, ty, 61 + k) % 20);
          P.px(x + 1, y + 3, '#4f9c43');
          P.px(x + 1, y, pc); P.px(x, y + 1, pc); P.px(x + 2, y + 1, pc); P.px(x + 1, y + 2, pc); P.px(x + 1, y + 1, cc);
        }
      }
    }
  }
}

function paintOX(cx) {
  const put = (fx) => {
    for (let y = -52; y <= 52; y++) for (let x = -52; x <= 52; x++) {
      const v = fx(x, y);
      if (v) { cx.fillStyle = v; cx.fillRect(Math.round(this_cx) + x, Math.round(this_cy) + y, 1, 1); }
    }
  };
  let this_cx = 35.5 * NT, this_cy = 31 * NT;
  put((x, y) => { const d = Math.hypot(x, y - 3); if (d <= 40 && d >= 27) return 'rgba(20,40,90,0.28)'; const e = Math.hypot(x, y); return e <= 40 && e >= 27 ? '#fbfbfd' : null; });
  this_cx = 40.5 * NT;
  const onX = (x, y) => Math.abs(x) <= 34 && Math.abs(y) <= 34 && (Math.abs(x - y) <= 8 || Math.abs(x + y) <= 8);
  put((x, y) => (onX(x, y) ? '#fbfbfd' : onX(x, y - 3) ? 'rgba(90,20,20,0.28)' : null));
}

function paintRug(cx) {
  const P = new Pen(cx);
  const x = 3 * NT + 3, y = 6 * NT + 3, w = 14 * NT - 6, h = 7 * NT - 6;
  for (const [i, c] of [[0, '#e9c65a'], [1, '#f7dc7c'], [4, '#e9c65a'], [5, '#b8942f']]) {
    P.rect(x + i, y + i, w - 2 * i, 1, c); P.rect(x + i, y + h - 1 - i, w - 2 * i, 1, c);
    P.rect(x + i, y + i, 1, h - 2 * i, c); P.rect(x + w - 1 - i, y + i, 1, h - 2 * i, c);
  }
}

function paintDoorMat(cx, map) {
  // 교실 출입문 발판
  for (const p of map.portals) {
    const P = new Pen(cx);
    P.blk(p.x + 4, p.y - 10, p.w - 8, 12, '#b0463b', { r: 1, hi: 0.15 });
    for (let x = p.x + 8; x < p.x + p.w - 8; x += 4) P.rect(x, p.y - 7, 2, 6, '#9a3a31');
  }
}

// 맵 전체 바닥을 한 장으로 미리 그린다(물결 2프레임)
export function buildGround(map) {
  const W = map.w * NT, H = map.h * NT;
  const walls = wallInfo(map);
  const frames = [];
  const o = [0, 0, 0];
  for (let frame = 0; frame < 2; frame++) {
    const [c, cx] = mk(W, H);
    const img = cx.createImageData(W, H), a = img.data;
    for (let y = 0; y < H; y++) {
      const ty = y >> 5, row = map.tiles[ty], wrow = walls[ty];
      for (let x = 0; x < W; x++) {
        const tx = x >> 5;
        groundPixel(row[tx], x, y, frame, wrow[tx], o);
        const k = (y * W + x) * 4;
        a[k] = o[0]; a[k + 1] = o[1]; a[k + 2] = o[2]; a[k + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    paintEdges(cx, map, walls);
    if (map.id === 'campus') { paintDecor(cx, map); paintOX(cx); }
    if (map.id === 'classroom') { paintRug(cx); paintDoorMat(cx, map); }
    frames.push(c);
  }
  return frames;
}

// ---------------------------------------------------------------- 공통 부품
// ---------------------------------------------------------------- 건물
const STYLES = {
  school: { roof: '#2f9cad', trim: '#23708a', door: '#2e6bd0', sign: 'clock' },
  library: { roof: '#d8423a', trim: '#8f3530', door: '#2e6bd0', sign: 'book' },
  workshop: { roof: '#f2b91c', trim: '#2e6bd0', door: '#2e6bd0', sign: 'gear' },
};
const WALL = '#f5e7c6';

function windowArt(P, x, y, box) {
  P.blk(x, y, 26, 32, '#fbfbfd', { hi: 0.1, lo: -0.12, side: 0.06 });
  P.rect(x + 3, y + 3, 20, 26, '#6fbdef');
  P.rect(x + 3, y + 3, 20, 11, '#9fd6f8');
  for (let i = 0; i < 7; i++) { P.px(x + 6 + i, y + 22 - i, '#d4efff'); P.px(x + 7 + i, y + 22 - i, '#d4efff'); }
  P.rect(x + 12, y + 3, 2, 26, '#fbfbfd'); P.rect(x + 3, y + 14, 20, 2, '#fbfbfd');
  P.blk(x - 2, y + 32, 30, 3, '#cdd1dc', { hi: 0.3 });
  if (box) {
    P.blk(x, y + 35, 26, 5, '#9a6a3c', { hi: 0.2 });
    for (let i = 0; i < 6; i++) { const fx = x + 2 + i * 4; P.rect(fx, y + 33, 3, 2, '#4fae52'); P.px(fx + 1, y + 32, ['#ff6b8b', '#ffd23f', '#ffffff'][i % 3]); }
  }
}

function building(o) {
  const st = STYLES[o.style];
  const W = o.w * NT, FHt = o.h * NT;
  const extra = o.style === 'school' ? 40 : o.style === 'workshop' ? 16 : 0;
  const H = FHt + extra;
  const [c, cx] = mk(W, H);
  const P = new Pen(cx);
  const plinth = 8, wallH = o.style === 'school' ? 136 : 100, inset = 6;
  const wallTop = H - plinth - wallH, roofTop = extra + 2, roofBottom = wallTop + 6;
  const dx = (o.doorX - o.x) * NT;

  // 정면 벽: 벽돌 줄눈 + 모서리 기둥
  P.rect(inset, wallTop, W - 2 * inset, wallH, WALL);
  for (let y = wallTop + 6, n = 0; y < H - plinth; y += 6, n++) {
    P.rect(inset, y, W - 2 * inset, 1, '#e6d4ad');
    for (let x = inset + (n % 2 ? 6 : 0); x < W - inset; x += 12) P.rect(x, y + 1, 1, 5, '#ecdcb8');
  }
  P.blk(inset, wallTop, 9, wallH, st.trim, { hi: 0.1, side: 0.18 });
  P.blk(W - inset - 9, wallTop, 9, wallH, st.trim, { hi: 0.1, side: 0.18 });
  // 창문(학교는 2층)
  const rows = o.style === 'school' ? [wallTop + 14, wallTop + 76] : [wallTop + 20];
  if (o.style === 'school') P.blk(inset, wallTop + 60, W - 2 * inset, 5, st.trim, { hi: 0.25, lo: -0.2, side: 0 });
  for (const winY of rows) {
    for (let x = inset + 20; x + 26 < dx - 12; x += 44) windowArt(P, x, winY, o.style === 'library');
    for (let x = W - inset - 20 - 26; x > dx + 64 + 12; x -= 44) windowArt(P, x, winY, o.style === 'library');
  }
  // 문
  const dt = H - plinth - 54;
  P.blk(dx - 5, dt - 5, 74, 59, st.trim, { hi: 0.18, side: 0.12, lo: 0 });
  P.rect(dx, dt, 64, 54, '#34384f');
  for (const x of [dx + 2, dx + 33]) {
    P.blk(x, dt + 2, 29, 52, st.door, { hi: 0.22, side: 0.14, lo: 0 });
    P.rect(x + 4, dt + 7, 21, 38, '#86c9f2'); P.rect(x + 4, dt + 7, 21, 13, '#b2e0fb');
    for (let i = 0; i < 6; i++) P.px(x + 7 + i, dt + 30 - i, '#dcf2ff');
  }
  P.rect(dx + 27, dt + 26, 2, 8, '#f5c518'); P.rect(dx + 35, dt + 26, 2, 8, '#f5c518');
  // 차양과 간판
  P.blk(dx - 10, dt - 16, 84, 9, st.roof, { hi: 0.25, lo: -0.3 });
  for (let x = dx - 8; x < dx + 72; x += 10) P.rect(x, dt - 9, 5, 2, shade(st.roof, -0.35));
  const sx = dx + 32, sy = dt - 34;
  P.blk(sx - 26, sy, 52, 16, '#fbfbfd', { r: 1, hi: 0.1, lo: -0.12 });
  if (st.sign === 'clock') { for (const [yy, w] of [[4, 34], [9, 24]]) P.rect(sx - w / 2, sy + yy, w, 2, st.roof); }
  if (st.sign === 'book') {
    P.rect(sx - 13, sy + 3, 12, 10, '#ffffff'); P.rect(sx + 1, sy + 3, 12, 10, '#ffffff'); P.rect(sx - 1, sy + 2, 2, 12, st.roof);
    for (const yy of [5, 8, 11]) { P.rect(sx - 11, sy + yy, 8, 1, '#a5acbc'); P.rect(sx + 3, sy + yy, 8, 1, '#a5acbc'); }
    P.rect(sx - 13, sy + 13, 26, 1, '#8b93a6');
  }
  if (st.sign === 'gear') {
    for (let a = 0; a < 8; a++) { const t = (a * Math.PI) / 4; P.rect(Math.round(sx + Math.cos(t) * 6) - 1, Math.round(sy + 8 + Math.sin(t) * 6) - 1, 3, 3, '#7d8494'); }
    P.ellipse(sx - 5, sy + 3, 10, 10, '#8b93a6'); P.ellipse(sx - 2, sy + 6, 4, 4, '#fbfbfd');
    P.rect(sx + 9, sy + 4, 8, 3, '#d8343a'); P.rect(sx - 17, sy + 9, 8, 3, '#2e6bd0');
  }
  // 기초와 계단
  P.blk(inset - 3, H - plinth, W - 2 * inset + 6, plinth, '#b7bbc8', { hi: 0.2, lo: -0.2 });
  for (let x = inset + 8; x < W - inset; x += 16) P.rect(x, H - plinth + 1, 1, plinth - 2, '#9ea3b3');
  P.blk(dx - 6, H - plinth, 76, 4, '#dde0e8', { hi: 0.25, lo: -0.1 });
  P.blk(dx - 10, H - 4, 84, 4, '#c8ccd6', { hi: 0.25, lo: -0.15 });

  // 지붕: 기와 줄 + 처마 그림자 + 용마루 스터드
  const roofH = roofBottom - roofTop;
  P.blk(0, roofTop, W, roofH, st.roof, { r: 1, hi: 0.2, lo: 0, side: 0.14 });
  for (let y = roofBottom - 10, n = 0; y > roofTop + 8; y -= 10, n++) {
    P.rect(2, y, W - 4, 1, shade(st.roof, -0.24)); P.rect(2, y + 1, W - 4, 1, shade(st.roof, 0.14));
    for (let x = 2 + (n % 2 ? 8 : 0); x < W - 2; x += 16) P.rect(x, y + 2, 1, 8, shade(st.roof, -0.12));
  }
  P.blk(0, roofBottom - 7, W, 7, shade(st.roof, -0.3), { hi: 0.12, lo: -0.1, side: 0.08 });
  P.rect(inset, roofBottom, W - 2 * inset, 3, 'rgba(70,45,25,0.25)');
  P.blk(10, roofTop, W - 20, 6, shade(st.roof, 0.18), { r: 1, hi: 0.2, lo: -0.1 });
  for (let x = 16; x < W - 20; x += 16) stud(P, x, roofTop - 3, shade(st.roof, 0.18));

  // 모양별 장식
  if (o.style === 'school') {
    const tw = 56, tx = W / 2 - tw / 2, towerBottom = roofTop + 34;
    P.blk(tx + 4, 18, tw - 8, towerBottom - 18, WALL, { hi: 0.12, side: 0.14 });
    P.blk(tx + 4, towerBottom - 6, tw - 8, 6, st.trim, { hi: 0.15 });
    for (let j = 0; j < 22; j++) {
      const half = Math.round(6 + j * 1.2);
      P.rect(W / 2 - half, j, half, 1, shade(st.roof, 0.12)); P.rect(W / 2, j, half, 1, shade(st.roof, -0.12));
      if (j % 5 === 4) P.rect(W / 2 - half, j, half * 2, 1, shade(st.roof, -0.28));
    }
    P.rect(W / 2 - 1, 0, 2, 3, '#f5c518');
    const cy = 38;
    P.ell(W / 2 - 12, cy - 12, 24, 24, st.trim, FLAT);
    P.ell(W / 2 - 10, cy - 10, 20, 20, '#fdfdfd', { hi: 0, lo: -0.1, side: 0 });
    for (const [ax, ay] of [[0, -8], [8, 0], [0, 8], [-8, 0]]) P.px(W / 2 + ax - (ax > 0 ? 1 : 0), cy + ay - (ay > 0 ? 1 : 0), '#6b7285');
    P.rect(W / 2 - 1, cy - 7, 2, 7, '#2a2a36'); P.rect(W / 2, cy - 1, 6, 2, '#2a2a36'); P.px(W / 2, cy, '#d8343a');
  }
  if (o.style === 'workshop') {
    brick(P, 18, roofTop + 10, 48, '#d8343a', { top: 10, front: 14 });
    brick(P, W - 70, roofTop + 2, 32, '#2e6bd0', { top: 10, front: 16 });
    brick(P, W - 44, roofTop + 20, 24, '#3aa04b', { top: 8, front: 12 });
  }
  return finishPad(c, cx, W / 2, H, null);
}

// ---------------------------------------------------------------- 자연물
function tree(o) {
  const pink = o.v === 1;
  const base = pink ? '#f3a2c6' : '#4fb153';
  const [c, cx] = mk(52, 72);
  const P = new Pen(cx);
  P.blk(22, 44, 9, 24, '#8d5b34', { hi: 0.1, lo: -0.2, side: 0.18 });
  P.rect(24, 48, 1, 16, '#a8703f'); P.rect(20, 66, 3, 2, '#7a4d2b'); P.rect(30, 66, 3, 2, '#7a4d2b');
  const blobs = [[4, 18, 44, 30], [10, 6, 32, 28], [2, 28, 22, 20], [28, 28, 22, 20], [14, 32, 26, 18]];
  for (const [x, y, w, h] of blobs) P.ellipse(x, y + 2, w, h, shade(base, -0.3));
  for (const [x, y, w, h] of blobs) P.ellipse(x, y - 1, w - 2, h - 3, base);
  for (const [x, y, w, h] of blobs) P.ellipse(x + 3, y, Math.round(w * 0.55), Math.round(h * 0.45), shade(base, 0.2));
  const inside = (x, y) => blobs.some(([bx, by, w, h]) => ((x - bx - w / 2) / (w / 2 - 2)) ** 2 + ((y - by - h / 2) / (h / 2 - 2)) ** 2 < 1);
  for (let i = 0; i < 40; i++) {
    const x = 4 + (hash(i, 1, 70 + (pink ? 1 : 0)) % 44), y = 6 + (hash(i, 2, 70) % 42);
    if (!inside(x, y)) continue;
    if (pink) { P.px(x, y, i % 3 ? '#ffffff' : '#e46aa6'); if (i % 2) P.px(x + 1, y, '#ffd8e8'); }
    else { P.rect(x, y, 2, 1, i % 2 ? shade(base, -0.18) : shade(base, 0.3)); }
  }
  stud(P, 18, 4, shade(base, 0.2)); stud(P, 27, 4, shade(base, 0.2));
  return finishPad(c, cx, 26, 67, [26, 67, 17, 5]);
}

function bush(o) {
  const [c, cx] = mk(38, 30);
  const P = new Pen(cx);
  const g = '#46a64d';
  const blobs = [[2, 10, 22, 18], [14, 5, 22, 20], [7, 12, 26, 16]];
  for (const [x, y, w, h] of blobs) P.ellipse(x, y + 2, w, h, shade(g, -0.3));
  for (const [x, y, w, h] of blobs) P.ellipse(x, y - 1, w - 2, h - 3, g);
  for (const [x, y, w, h] of blobs) P.ellipse(x + 3, y, Math.round(w * 0.5), Math.round(h * 0.45), shade(g, 0.22));
  const [pc, cc] = FLOWERS[(o.v ?? 0) % 2 ? 2 : 0];
  for (const [x, y] of [[8, 13], [18, 9], [26, 15], [14, 19]]) { P.px(x + 1, y, pc); P.px(x, y + 1, pc); P.px(x + 2, y + 1, pc); P.px(x + 1, y + 2, pc); P.px(x + 1, y + 1, cc); }
  return finishPad(c, cx, 19, 27, [19, 27, 15, 4]);
}

// ---------------------------------------------------------------- 캠퍼스 소품
function lamp() {
  const [c, cx] = mk(18, 62);
  const P = new Pen(cx);
  P.blk(3, 53, 12, 6, '#3d4350', { r: 1, hi: 0.25 });
  P.blk(7, 16, 4, 38, '#454c5c', { hi: 0.1, side: 0.25 });
  P.blk(3, 5, 12, 13, '#fff1a6', { hi: 0.2, lo: -0.1, side: 0.08 });
  P.rect(5, 8, 3, 7, '#fffbe0');
  P.rect(3, 5, 12, 1, '#3d4350'); P.rect(3, 17, 12, 1, '#3d4350'); P.rect(8, 5, 2, 13, '#3d4350');
  P.blk(1, 1, 16, 5, '#3d4350', { r: 1, hi: 0.3 }); P.rect(8, 0, 2, 1, '#3d4350');
  return finishPad(c, cx, 9, 58, [9, 58, 7, 3]);
}

function sign(o) {
  const [c, cx] = mk(44, 48);
  const P = new Pen(cx);
  P.blk(19, 10, 5, 34, '#8d5b34', { hi: 0.1, side: 0.2 });
  const board = (x, y, w, col, left) => {
    P.blk(x, y, w, 10, col, { r: 1, hi: 0.25, lo: -0.25 });
    for (let j = 0; j < 5; j++) P.rect(left ? x - 1 - j : x + w + j, y + j, 1, 10 - 2 * j, col);
    P.rect(x + 4, y + 4, w - 8, 2, shade(col, -0.38));
  };
  if (o.text === 0) { board(9, 4, 26, '#edc98c', false); board(12, 18, 24, '#edc98c', true); }
  else { board(8, 4, 28, '#9fd6c2', true); board(10, 18, 24, '#edc98c', false); }
  P.blk(15, 42, 13, 4, '#9ca2b2', { hi: 0.25 });
  return finishPad(c, cx, 22, 45, [22, 45, 10, 3]);
}

function bench(o) {
  const w = o.w * NT;
  const [c, cx] = mk(w, 34);
  const P = new Pen(cx);
  const wood = '#b77a45';
  P.blk(4, 2, w - 8, 9, wood, { r: 1, hi: 0.25, lo: -0.25 });
  P.rect(6, 6, w - 12, 1, shade(wood, -0.25));
  P.blk(2, 13, w - 4, 10, wood, { r: 1, hi: 0.28, lo: -0.3 });
  P.rect(4, 16, w - 8, 1, shade(wood, -0.2)); P.rect(4, 19, w - 8, 1, shade(wood, -0.2));
  for (const x of [5, w - 15]) { P.blk(x, 23, 10, 9, '#2e6bd0', { hi: 0.2, lo: -0.25 }); stud(P, x + 2, 21, '#3e7be0'); }
  return finishPad(c, cx, w / 2, 31, [w / 2, 31, w / 2 - 2, 3]);
}

function flowerbed(o) {
  const w = o.w * NT;
  const [c, cx] = mk(w, 32);
  const P = new Pen(cx);
  P.blk(0, 16, w, 13, '#b9bdca', { hi: 0, lo: -0.25, side: 0.1 });
  for (let x = 8; x < w; x += 16) P.rect(x, 17, 1, 11, '#a2a7b6');
  P.rect(0, 22, w, 1, '#a2a7b6');
  P.blk(0, 11, w, 6, '#dde0e8', { hi: 0.2, lo: 0, side: 0.06 });
  P.rect(3, 12, w - 6, 4, '#6e4a2c');
  const cols = o.v === 1 ? [['#ff6b8b', '#ffe066'], ['#ffd23f', '#f28a1a'], ['#ffffff', '#ffd23f']] : [['#d8343a', '#ffe066'], ['#ffd23f', '#f28a1a'], ['#ee7fb0', '#ffffff']];
  for (let i = 0; i < 8; i++) {
    const x = 4 + i * Math.floor((w - 10) / 7), y = 3 + ((i * 5) % 3);
    P.rect(x + 1, y + 3, 1, 12 - y, '#3f9a45'); P.rect(x + 2, y + 7, 2, 1, '#57b85c');
    const [pc, cc] = cols[i % 3];
    P.rect(x, y, 3, 3, pc); P.px(x - 1, y + 1, pc); P.px(x + 3, y + 1, pc); P.px(x + 1, y - 1, pc); P.px(x + 1, y + 1, cc);
  }
  return finishPad(c, cx, w / 2, 29, [w / 2, 29, w / 2 - 1, 3]);
}

function brickpile(o) {
  const [c, cx] = mk(38, 36);
  const P = new Pen(cx);
  const cs = [['#d8343a', '#2e6bd0', '#f5c518'], ['#2e6bd0', '#f5c518', '#3aa04b'], ['#f5c518', '#d8343a', '#2e6bd0']][(o.v ?? 0) % 3];
  brick(P, 2, 18, 32, cs[0]);
  brick(P, 4, 7, 16, cs[1]);
  brick(P, 20, 9, 16, cs[2], { front: 7 });
  return finishPad(c, cx, 19, 34, [19, 34, 17, 3]);
}

function fountain() {
  const W = 128, H = 106;
  const [c, cx] = mk(W, H);
  const P = new Pen(cx);
  const stone = '#d3d7e1';
  P.ell(4, 44, 120, 58, shade(stone, -0.22), FLAT);
  P.ell(4, 36, 120, 58, stone, { hi: 0.2, lo: 0, side: 0 });
  P.ell(12, 42, 104, 44, '#4ea8e6', FLAT);
  P.ell(16, 45, 96, 38, '#5cb4ec', FLAT);
  for (const [x, y, w] of [[26, 56, 12], [80, 70, 16], [44, 74, 10], [88, 54, 8]]) P.rect(x, y, w, 1, '#bfe6fb');
  P.ell(40, 72, 48, 12, 'rgba(30,80,140,0.25)', FLAT);
  P.blk(56, 34, 16, 38, stone, { hi: 0.15, lo: -0.2, side: 0.2 });
  P.ell(42, 26, 44, 16, shade(stone, -0.15), FLAT);
  P.ell(42, 23, 44, 14, stone, { hi: 0.2, lo: 0, side: 0 });
  P.ell(48, 25, 32, 8, '#5cb4ec', FLAT);
  P.blk(60, 10, 8, 16, stone, { hi: 0.2, side: 0.2 });
  P.ell(58, 4, 12, 8, '#8fd0f6', FLAT);
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const yL = Math.round(8 + t * t * 18);
    P.rect(Math.round(58 - t * 16), yL, 2, 2, '#bfe6fb'); P.rect(Math.round(68 + t * 16), yL, 2, 2, '#bfe6fb');
  }
  for (const x of [20, 44, 84, 108]) stud(P, x - 3, 38 + (x === 44 || x === 84 ? -2 : 3), stone);
  return finishPad(c, cx, 64, 102, [64, 100, 60, 6]);
}

// ---------------------------------------------------------------- 교실 소품
function board() {
  const [c, cx] = mk(192, 58);
  const P = new Pen(cx);
  P.blk(0, 0, 192, 50, '#9a6a3c', { hi: 0.2, lo: -0.25, side: 0.1 });
  P.rect(6, 6, 180, 38, '#2f6b4f');
  for (let i = 0; i < 70; i++) P.px(6 + (hash(i, 3, 80) % 180), 6 + (hash(i, 4, 80) % 38), '#3a7a5c');
  for (const [x, y, w] of [[16, 14, 54], [16, 22, 72], [16, 30, 40]]) P.rect(x, y, w, 2, '#e8efe9');
  P.ell(140, 12, 26, 26, '#ffd84a', { hi: 0.2, lo: -0.2, side: 0 });
  P.rect(146, 20, 3, 4, '#3a2a1a'); P.rect(157, 20, 3, 4, '#3a2a1a'); P.rect(147, 29, 12, 2, '#3a2a1a'); P.px(146, 28, '#3a2a1a'); P.px(159, 28, '#3a2a1a');
  P.blk(4, 46, 184, 7, '#7d5230', { hi: 0.25, lo: -0.2 });
  P.rect(20, 44, 10, 3, '#ffffff'); P.rect(34, 44, 8, 3, '#ffd23f'); P.rect(46, 44, 8, 3, '#ff8c8c'); P.rect(160, 43, 14, 4, '#46465a');
  return finishPad(c, cx, 96, 58, null);
}
function windowWall() {
  const [c, cx] = mk(88, 58);
  const P = new Pen(cx);
  P.blk(0, 0, 88, 52, '#fbfbfd', { hi: 0.1, lo: -0.15, side: 0.06 });
  P.rect(5, 5, 78, 42, '#8fd0ff'); P.rect(5, 5, 78, 16, '#b7e3ff');
  P.rect(5, 36, 78, 11, '#6cc15a'); P.rect(5, 33, 30, 3, '#6cc15a'); P.rect(56, 31, 27, 5, '#6cc15a');
  P.ell(12, 10, 20, 7, '#ffffff', FLAT); P.ell(18, 7, 12, 6, '#ffffff', FLAT); P.ell(56, 14, 18, 6, '#ffffff', FLAT);
  P.ell(66, 24, 12, 12, '#4fb153', FLAT); P.rect(71, 34, 2, 4, '#8d5b34');
  P.rect(42, 5, 4, 42, '#fbfbfd'); P.rect(5, 24, 78, 3, '#fbfbfd');
  P.blk(-1 + 1, 50, 88, 6, '#cfd3dd', { hi: 0.3, lo: -0.2 });
  return finishPad(c, cx, 44, 58, null);
}
function shelf() {
  const [c, cx] = mk(64, 84);
  const P = new Pen(cx);
  P.blk(0, 0, 64, 84, '#9a6a3c', { hi: 0.2, lo: -0.25, side: 0.14 });
  P.rect(4, 4, 56, 76, '#5e3d22');
  const cols = ['#d8343a', '#2e6bd0', '#f5c518', '#3aa04b', '#7a4bc4', '#f28a1a', '#1fa5a0', '#ee7fb0'];
  [4, 30, 56].forEach((y, r) => {
    let x = 6;
    for (let i = 0; x < 56; i++) {
      const bw = 4 + ((i + r) % 3), bh = 16 + ((i * 5 + r * 3) % 6), col = cols[(i * 3 + r * 2) % cols.length];
      if (x + bw > 58) break;
      P.blk(x, y + 22 - bh, bw, bh, col, { hi: 0.25, lo: -0.2, side: 0.12 });
      P.rect(x, y + 22 - bh + 3, bw, 1, shade(col, 0.4));
      x += bw + 1;
    }
    P.blk(2, y + 22, 60, 4, '#b77a45', { hi: 0.3, lo: -0.2 });
  });
  return finishPad(c, cx, 32, 84, null);
}
function teacherdesk() {
  const [c, cx] = mk(96, 62);
  const P = new Pen(cx);
  P.blk(6, 36, 84, 22, '#c9ccd6', { hi: 0, lo: -0.25, side: 0.12 });
  P.blk(12, 40, 30, 8, '#b6bac6', { r: 1, hi: 0.2 }); P.blk(54, 40, 30, 8, '#b6bac6', { r: 1, hi: 0.2 });
  P.rect(24, 43, 6, 2, '#5f6678'); P.rect(66, 43, 6, 2, '#5f6678');
  P.blk(2, 24, 92, 12, '#3e7be0', { hi: 0.22, lo: -0.3, side: 0.1 });
  for (const x of [6, 82]) stud(P, x, 25, '#3e7be0');
  P.blk(30, 2, 34, 22, '#3d4350', { r: 1, hi: 0.2, lo: 0, side: 0.1 });
  P.rect(33, 5, 28, 15, '#6fd0ff'); P.rect(33, 5, 28, 5, '#a8e6ff'); P.rect(36, 12, 14, 2, '#ffffff'); P.rect(36, 16, 20, 1, '#d9f3ff');
  P.blk(44, 24, 8, 3, '#5f6678', FLAT);
  P.blk(24, 26, 36, 6, '#e3e6ee', { r: 1, hi: 0.2 });
  for (let x = 26; x < 58; x += 3) P.px(x, 28, '#9ca2b2');
  brick(P, 70, 18, 16, '#d8343a', { top: 5, front: 6 });
  P.rect(8, 22, 12, 3, '#ffffff'); P.rect(10, 20, 10, 2, '#fff6c8');
  return finishPad(c, cx, 48, 58, [48, 58, 44, 4]);
}
function desk() {
  const [c, cx] = mk(64, 42);
  const P = new Pen(cx);
  for (const x of [5, 53]) P.blk(x, 20, 6, 18, '#8b91a3', { hi: 0.1, side: 0.25 });
  P.blk(2, 8, 60, 13, '#3e7be0', { hi: 0.25, lo: -0.32, side: 0.1 });
  for (const x of [6, 52]) stud(P, x, 9, '#3e7be0');
  P.blk(20, 10, 18, 8, '#ffffff', { hi: 0, lo: -0.15, side: 0.05 });
  for (const y of [12, 14, 16]) P.rect(22, y, 13, 1, '#b8c0cf');
  P.rect(40, 12, 10, 2, '#f5c518'); P.px(50, 12, '#ff8c8c');
  return finishPad(c, cx, 32, 38, [32, 38, 28, 3]);
}
function chair() {
  const [c, cx] = mk(32, 38);
  const P = new Pen(cx);
  for (const x of [7, 22]) P.blk(x, 20, 3, 15, '#8b91a3', { hi: 0, side: 0.25 });
  P.blk(5, 16, 22, 6, shade('#f5c518', -0.1), { hi: 0.2, lo: -0.25 });
  P.blk(5, 2, 22, 15, '#f5c518', { r: 2, hi: 0.3, lo: -0.2, side: 0.12 });
  P.rect(8, 5, 16, 2, '#ffe07a');
  return finishPad(c, cx, 16, 35, [16, 35, 12, 3]);
}
function plant() {
  const [c, cx] = mk(30, 48);
  const P = new Pen(cx);
  P.blk(7, 30, 16, 15, '#e5795a', { hi: 0.2, lo: -0.25, side: 0.14 });
  P.blk(5, 28, 20, 5, '#f08d6c', { r: 1, hi: 0.25 });
  P.rect(8, 29, 14, 2, '#5b3a22');
  const g = '#46a64d';
  for (const [x, y, w, h] of [[2, 14, 12, 16], [16, 12, 12, 17], [8, 2, 14, 20], [10, 16, 10, 14]]) { P.ellipse(x, y + 1, w, h, shade(g, -0.3)); P.ellipse(x, y, w - 1, h - 2, g); P.ellipse(x + 2, y + 1, Math.round(w / 2), Math.round(h / 2), shade(g, 0.22)); }
  P.rect(14, 18, 2, 11, '#3f8a3f');
  return finishPad(c, cx, 15, 44, [15, 44, 10, 3]);
}

const MAKERS = { prop: (o) => getPropSprite(o.id), building, tree, bush, lamp, sign, bench, flowerbed, brickpile, fountain, board, window: windowWall, shelf, teacherdesk, desk, chair, plant };
const spriteCache = new Map();
export function getObjectSprite(o) {
  if (o.t === 'prop') return getPropSprite(o.id);
  const key = `${o.t}|${o.style ?? ''}|${o.v ?? ''}|${o.text ?? ''}|${o.w}x${o.h}|${o.doorX ? o.doorX - o.x : ''}`;
  let s = spriteCache.get(key);
  if (!s) { s = MAKERS[o.t](o); spriteCache.set(key, s); }
  return s;
}
