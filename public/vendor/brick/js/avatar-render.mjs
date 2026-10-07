// 아바타 조립 렌더러: 숫자 몇 개(shared/avatar.mjs)로 미니피규어풍 도트 스프라이트 시트를 만든다.
// 공용 몸 한 벌 위에 머리카락·얼굴·상의·하의·모자·가방을 겹쳐 그리므로 옷을 바꿔도 키와 발 위치가 변하지 않는다.
// 도트 1칸 = 월드 1px. 프레임 40×60, 발밑 기준점 (20, 57).
import { SKIN, HAIR, CLOTH, avatarKey } from '../../shared/avatar.mjs';
import { shade, Pen, selout, FLAT } from './pix.mjs';
import { HAIR_DRAFTS } from './hair-drafts.mjs';

export { shade };
export const FW = 40;
export const FH = 60;
export const ANCHOR = { x: 20, y: 57 };
export const COLS = 9; // 걷기 4 + 손흔들기 2 + 만세 2 + 앉기 1
export const ROW_OF = { down: 0, left: 1, right: 2, up: 3 };
export const COL = { walk: 0, wave: 4, cheer: 6, sit: 8 };

const INK = '#2a1f2d';
const WHITE = '#ffffff';
const MOUTH = '#74222e';
const TONGUE = '#ee6f7c';
const BLUSH = '#ffa48e';
const FRAME = '#3d2b22';
const LENS = '#1e1c28';
const SHOE = '#3b3a46';
const SASH = '#9b2232';
const SAEKDONG = ['#e8453c', '#f7c534', '#3aa04b', '#2e6bd0', '#f28bbd']; // 한복 색동 소매
const GOGGLE = '#2fa4a8', GOGGLE_LENS = '#c9efff';
const EAR_PINK = '#ffb3c7';
const STUB = '#7b5a2c';

// 몸통 사다리꼴(위 16칸 → 아래 20칸), y 26~39
const TORSO = Array.from({ length: 14 }, (_, j) => { const i = Math.round(2 * (1 - j / 13)); return [10 + i, 29 - i]; });

function paintCell(cx, ox, oy, av, view, col) {
  const skin = SKIN[av.skin], hairC = HAIR[av.hairColor];
  const topC = CLOTH[av.topColor], top2 = CLOTH[av.top2Color], botC = CLOTH[av.bottomColor];
  const glove = av.gloves ? CLOTH[av.gloves - 1] : skin;
  const hatC = CLOTH[av.hatColor], backC = CLOTH[av.backColor];
  const sleeve = av.top === 2 ? top2 : topC;
  const hatOn = av.hat > 0 && av.hat <= 4;
  const draft = HAIR_DRAFTS[av.hair]; // 머리 시안(고르기용): 앞모습만 시안, 옆·뒤는 base
  const st = draft ? draft.base : av.hair, ft = av.face;
  const laugh = ft === 3 || ft === 5; // 눈 감고 활짝 웃기(5는 속눈썹 추가)
  const hh = shade(hairC, 0.26), hd = shade(hairC, -0.26);

  const isWalk = col < 4, step = isWalk ? [0, 1, 0, -1][col] : 0;
  const wave = col === 4 || col === 5, cheer = col === 6 || col === 7, sit = col === 8;
  const jump = col === 7 ? 2 : 0;
  const d = sit ? 7 : step ? 1 : 0; // 엉덩이 위 몸 전체가 내려가는 양
  const p = new Pen(cx, ox, oy - jump); // 다리용
  const u = new Pen(cx, ox, oy - jump + d); // 엉덩이 위(몸통·팔·머리)용

  const H = (x, y, w, h, r = 0) => u.blk(x, y, w, h, hairC, { r, hi: 0.24, lo: -0.24, side: 0.1 });
  const HB = (x, y, w, h, r = 0) => u.blk(x, y, w, h, hairC, { r, hi: 0, lo: -0.24, side: 0.1 }); // 윗머리에 이어 붙는 뒷머리(이음선 없음)
  // 머리 결: 두 점을 잇는 어두운 선 + 왼쪽에 광택(끝 두 칸 제외)
  const strand = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      u.px(x, y, hd); if (i < n - 2) u.px(x - 1, y, hh);
    }
  };
  const spikes = (tops) => {
    for (const [xc, yt] of tops) {
      for (let y = yt; y < 10; y++) { const hw = Math.floor((y - yt) / 2); u.rect(xc - hw, y, 2 * hw + 2, 1, hairC); u.px(xc - hw, y, hh); }
    }
  };

  // ---------------------------------------------------------------- 다리·엉덩이
  const leg = (x, y, h, { col: c = botC, foot = 0 } = {}) => {
    const dim = c !== botC;
    const skinC = dim ? shade(skin, -0.14) : skin, shoe = dim ? shade(SHOE, -0.15) : SHOE;
    if (av.bottom === 2) { // 치마: 다리는 맨살 + 신발(윗부분은 치마가 덮는다)
      p.blk(x, y, 8, h, skinC, { hi: 0.12 });
      if (h > 3) p.blk(x - foot, y + h - 3, 8 + foot, 3, shoe, { hi: 0.3, side: 0 });
      return;
    }
    if (av.bottom === 1) {
      const k = Math.min(5, h);
      p.blk(x, y, 8, k, c);
      if (h > k) p.blk(x, y + k, 8, h - k, skinC, { hi: 0.12 });
      if (h > k + 3) p.blk(x - foot, y + h - 3, 8 + foot, 3, shoe, { hi: 0.3, side: 0 });
    } else {
      p.blk(x, y, 8, h, c);
      if (h > 7) p.rect(x, y + h - 4, 8, 1, shade(c, -0.2));
      if (foot) p.blk(x - foot, y + h - 3, foot + 1, 3, c, { hi: 0.12, side: 0 });
      if (av.top === 3 && h > 9) { // 호랑이 옷은 다리 바깥쪽까지 삼각 줄무늬
        const sc = dim ? shade(top2, -0.1) : top2;
        for (const yy of [2, 6]) { p.rect(x, y + yy, 3, 1, sc); p.px(x, y + yy + 1, sc); p.rect(x + 5, y + yy + 2, 3, 1, sc); p.px(x + 7, y + yy + 3, sc); }
      }
      if (av.top === 2 && h > 9) { // 레이싱 슈트는 다리도 누빔
        const dc = shade(c, 0.26);
        for (let yy = 2; yy < h - 4; yy += 3) p.px(x + 4, y + yy, dc);
        p.rect(x + 1, y + 5, 1, 1, dc); p.rect(x + 3, y + 5, 1, 1, dc); p.rect(x + 6, y + 5, 1, 1, dc);
      }
    }
  };
  const legsFrontBack = () => {
    const top = 44 + d;
    [[11, 0], [21, 1]].forEach(([x, i]) => {
      let bottom = 56;
      if (step && (step === 1) === (i === 1)) bottom -= 3; // 들어 올린 다리
      leg(x, top, bottom - top + 1);
    });
  };
  const hips = () => {
    if (av.bottom === 2) { skirt(10, 29); return; }
    u.blk(10, 40, 20, 4, shade(botC, -0.06), { hi: 0.12 });
    u.rect(19, 41, 2, 3, shade(botC, -0.32));
  };
  // 치마: 허리(y40)에서 아래로 퍼지는 나팔 모양 + 주름
  const skirt = (a, b, back = 0) => {
    const spans = Array.from({ length: 11 }, (_, j) => [a - Math.floor(j / 3), b + Math.floor(j / 3) + back]);
    u.spans(40, spans, botC, { hi: 0.2, lo: -0.26, side: 0.12 });
    u.rect(a, 40, b - a + 1, 1, shade(botC, -0.25));
    for (let x = a + 3; x < b - 1; x += 4) for (let j = 3; j < 10; j++) u.px(x - (x < 20 ? Math.floor(j / 4) : -Math.floor(j / 4)), 40 + j, shade(botC, -0.16));
  };
  // 멜빵바지: 가슴 앞판 + 어깨끈 + 단추
  const overallsFront = () => {
    u.blk(14, 32, 12, 8, botC, { hi: 0.18, lo: 0, side: 0.1 });
    u.rect(14, 26, 2, 6, botC); u.rect(24, 26, 2, 6, botC);
    u.rect(17, 34, 6, 3, shade(botC, -0.12)); u.rect(17, 34, 6, 1, shade(botC, -0.25));
    u.px(15, 32, '#f5c518'); u.px(24, 32, '#f5c518');
  };
  const overallsBack = () => {
    for (let i = 0; i < 9; i++) { u.rect(14 + i, 27 + i, 2, 1, botC); u.rect(24 - i, 27 + i, 2, 1, botC); }
    u.blk(15, 36, 10, 4, botC, { hi: 0.15, lo: 0, side: 0.1 });
  };

  // ---------------------------------------------------------------- 몸통
  const row = (y, c) => { const s = TORSO[y - 26]; if (s) u.rect(s[0], y, s[1] - s[0] + 1, 1, c); };
  // 레이싱 조끼(엘엠): 둥근 옷깃 + 지퍼 + 누빔 박음질 + 왼쪽 빨간 배지 + 오른쪽 YRR 글씨
  const quilt = (back) => {
    const dash = shade(topC, 0.28);
    for (const y of [34]) { const s = TORSO[y - 26]; for (let x = s[0] + 2; x < s[1] - 1; x += 3) u.px(x, y, dash); }
    for (const x of back ? [15, 24] : [14, 25]) for (let y = 29; y < 36; y += 3) u.px(x, y, dash);
    // 허리 이름띠(R. Racer): 흰 줄 사이에 흰 이름표
    row(37, WHITE); row(39, shade(WHITE, -0.12));
    if (!back) { u.blk(15, 37, 10, 3, WHITE, { r: 1, hi: 0, lo: -0.1, side: 0 }); u.rect(16, 38, 8, 1, shade(topC, 0.1)); for (const x of [17, 19, 20, 22]) u.px(x, 38, WHITE); }
  };
  const vestFront = () => {
    const ring = '#dbe8ff';
    u.rect(16, 26, 8, 1, shade(topC, -0.35));
    u.px(15, 26, ring); u.px(24, 26, ring); u.rect(16, 27, 8, 1, ring);
    u.rect(19, 28, 1, 12, shade(topC, -0.35)); u.rect(20, 28, 1, 12, shade(topC, 0.18));
    quilt(false);
    u.rect(11, 30, 6, 3, '#d8343a'); u.rect(12, 31, 4, 1, WHITE); u.px(13, 30, WHITE);
    // 3×3 글씨 Y R R
    for (const [x, y] of [[20, 30], [22, 30], [21, 31], [21, 32]]) u.px(x, y, WHITE);
    for (const x0 of [23, 26]) for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [2, 2]]) u.px(x0 + x, 30 + y, WHITE);
  };
  // 호랑이 옷(달새): 가장자리에서 안쪽으로 뻗은 삼각 줄무늬 + 크림색 배 + 검은 벨트와 버클
  const tri = (x, y, dir, c) => { // dir 1: 오른쪽을 향함, -1: 왼쪽
    for (const [dy, w] of [[0, 1], [1, 3], [2, 1]]) u.rect(dir > 0 ? x : x - w + 1, y + dy, w, 1, c);
  };
  // 가슴의 흰 털 무늬: 위가 둥글고 아래로 뾰족하며 가장자리가 삐죽삐죽하다
  const FUR = [[17, 22], [16, 23], [15, 24], [15, 24], [15, 24], [15, 24], [16, 23], [17, 22], [18, 21]];
  const tigerFront = () => {
    u.spans(27, FUR, '#fffaf3', { hi: 0.05, lo: -0.08, side: 0.04 });
    for (const [x, y] of [[14, 29], [25, 30], [14, 32], [25, 33], [16, 35], [23, 34]]) u.px(x, y, '#fffaf3');
    for (const y of [27, 30, 33]) { const s = TORSO[y + 1 - 26]; tri(s[0], y, 1, top2); tri(s[1], y, -1, top2); }
    u.rect(12, 26, 3, 1, top2); u.rect(25, 26, 3, 1, top2);
    row(37, top2); row(38, top2);
    u.rect(17, 36, 6, 4, top2); u.rect(18, 37, 4, 2, '#c9a24a'); u.rect(19, 37, 2, 2, top2); u.rect(17, 36, 6, 1, top2);
  };
  const tigerBack = () => {
    for (const y of [27, 30, 33]) { const s = TORSO[y + 1 - 26]; tri(s[0], y, 1, top2); tri(s[1], y, -1, top2); }
    for (const [x, y] of [[18, 29], [21, 32], [17, 34]]) { u.rect(x, y, 3, 1, top2); u.px(x + 1, y + 1, top2); }
    row(37, top2); row(38, top2);
  };
  const torsoFront = () => {
    u.spans(26, TORSO, topC, { hi: 0.2, side: 0.14 });
    const t = av.top;
    if (t === 0) { // 티셔츠: 목둘레 + 가슴 브릭 그림(보조색)
      u.rect(16, 26, 8, 1, shade(topC, -0.2)); u.rect(17, 26, 6, 1, shade(skin, -0.1));
      u.blk(17, 31, 6, 4, top2, { hi: 0.25 }); u.rect(17, 30, 2, 1, shade(top2, 0.2)); u.rect(21, 30, 2, 1, shade(top2, 0.2));
      row(39, shade(topC, -0.14));
    }
    if (t === 1) { // 실험 가운: 안쪽 셔츠 + 옷깃 + 명찰 + 주머니·펜
      u.rect(17, 26, 6, 14, top2); u.rect(18, 29, 4, 2, '#f5c518');
      for (let j = 0; j < 6; j++) { u.px(16 + Math.floor(j / 2), 26 + j, shade(topC, -0.18)); u.px(23 - Math.floor(j / 2), 26 + j, shade(topC, -0.18)); }
      u.rect(16, 32, 1, 8, shade(topC, -0.14)); u.rect(23, 32, 1, 8, shade(topC, -0.14));
      u.rect(12, 29, 3, 2, '#e04848'); u.px(13, 29, WHITE);
      u.rect(24, 30, 4, 1, shade(topC, -0.2)); u.rect(26, 27, 1, 3, '#2e6bd0');
      u.rect(12, 36, 3, 1, shade(topC, -0.2)); u.rect(25, 36, 3, 1, shade(topC, -0.2));
    }
    if (t === 2) vestFront();
    if (t === 3) tigerFront();
    if (t === 4) uniformFront();
    if (t === 5) { // 후드티: 목 주위 후드 테두리 + 끈 + 앞주머니
      u.rect(13, 26, 14, 2, shade(topC, -0.14)); u.rect(15, 26, 10, 1, shade(topC, -0.3));
      u.rect(16, 28, 1, 4, top2); u.rect(23, 28, 1, 4, top2); u.px(16, 32, shade(top2, -0.2)); u.px(23, 32, shade(top2, -0.2));
      u.blk(14, 33, 12, 5, shade(topC, -0.05), { hi: 0.2, lo: 0, side: 0.06 }); u.rect(14, 33, 12, 1, shade(topC, -0.24));
      row(39, shade(topC, -0.2));
    }
    if (t === 6) { // 운동복: 높은 깃 + 지퍼 + 옆선 두 줄(보조색)
      u.rect(15, 26, 10, 2, shade(topC, -0.12)); u.rect(19, 26, 2, 14, shade(topC, -0.3)); u.rect(19, 27, 1, 13, shade(top2, -0.1));
      for (let y = 27; y <= 39; y++) { const sp = TORSO[y - 26]; u.px(sp[0] + 1, y, top2); u.px(sp[1] - 1, y, top2); }
      u.rect(12, 30, 3, 2, top2);
    }
    if (t === 7) { // 한복 저고리: 흰 동정(깃) + 고름(보조색) — 소매는 색동
      for (let j = 0; j < 6; j++) { u.rect(14 + j, 26 + j, 2, 1, WHITE); u.rect(24 - j, 26 + j, 2, 1, WHITE); }
      u.rect(19, 32, 3, 2, top2); u.rect(19, 34, 1, 6, top2); u.rect(21, 34, 1, 5, top2); u.px(22, 32, shade(top2, -0.2));
      row(39, shade(topC, -0.2));
    }
    if (av.bottom === 3) overallsFront();
    if (av.back) { u.rect(13, 26, 2, 9, shade(backC, -0.12)); u.rect(25, 26, 2, 9, shade(backC, -0.12)); }
  };
  // 제복(선생님): 사선 빨간 띠 + 흰 깃·넥타이 + 금 견장 + 훈장과 늘어진 금줄. 금색은 보조색을 쓴다.
  const uniformFront = () => {
    const gd = shade(top2, -0.32);
    for (let i = 0; i < 12; i++) u.rect(14 + i, 28 + i, 2, 1, SASH);
    u.rect(17, 26, 6, 2, WHITE); u.px(18, 28, WHITE); u.px(21, 28, WHITE);
    u.rect(19, 27, 2, 5, '#1e1a22'); u.px(19, 32, '#1e1a22');
    u.rect(11, 26, 5, 2, top2); u.rect(24, 26, 5, 2, top2);
    for (const x of [11, 13, 15, 24, 26, 28]) u.px(x, 28, gd);
    u.rect(12, 30, 2, 2, '#d8343a'); u.rect(12, 32, 2, 2, top2); u.rect(15, 31, 2, 1, '#2e6bd0'); u.rect(15, 32, 2, 2, top2);
    for (const [x, y] of [[24, 29], [25, 30], [25, 31], [24, 32], [23, 33], [22, 34], [21, 35]]) u.px(x, y, top2);
    u.px(25, 34, top2); u.rect(24, 35, 3, 1, top2); u.px(25, 36, top2);
    u.rect(12, 35, 3, 3, top2); u.rect(12, 38, 3, 1, gd);
  };
  const coatSkirt = () => { if (av.top === 1) { u.blk(10, 40, 8, 5, topC, { hi: 0.1 }); u.blk(22, 40, 8, 5, topC, { hi: 0.1 }); } };

  const torsoBack = () => {
    u.spans(26, TORSO, topC, { hi: 0.2, side: 0.14 });
    const t = av.top;
    if (t === 0) u.rect(16, 26, 8, 1, shade(topC, -0.2));
    if (t === 1) { u.rect(19, 31, 2, 9, shade(topC, -0.14)); u.rect(14, 35, 12, 2, shade(topC, -0.08)); }
    if (t === 2) { u.rect(15, 26, 10, 1, '#dbe8ff'); quilt(true); u.rect(19, 30, 2, 9, shade(topC, -0.14)); }
    if (t === 3) tigerBack();
    if (t === 4) { for (let i = 0; i < 12; i++) u.rect(24 - i, 28 + i, 2, 1, SASH); u.rect(11, 26, 5, 2, top2); u.rect(24, 26, 5, 2, top2); u.rect(19, 34, 2, 6, shade(topC, -0.18)); }
    if (t === 5) { u.blk(13, 26, 14, 7, shade(topC, 0.06), { r: 2, hi: 0.2, lo: -0.25, side: 0.1 }); u.rect(15, 27, 10, 1, shade(topC, -0.2)); row(39, shade(topC, -0.2)); }
    if (t === 6) { for (let y = 27; y <= 39; y++) { const sp = TORSO[y - 26]; u.px(sp[0] + 1, y, top2); u.px(sp[1] - 1, y, top2); } u.rect(15, 26, 10, 2, shade(topC, -0.12)); }
    if (t === 7) { u.rect(15, 26, 10, 2, WHITE); row(39, shade(topC, -0.2)); }
    if (av.bottom === 3) overallsBack();
    if (av.back) {
      u.blk(12, 27, 16, 13, backC, { r: 2, hi: 0.22 });
      u.blk(12, 27, 16, 5, shade(backC, -0.14), { r: 2, hi: 0.18 });
      u.blk(15, 34, 10, 5, shade(backC, 0.1), { r: 1 }); u.rect(19, 31, 2, 2, '#f5c518');
    }
  };

  // ---------------------------------------------------------------- 팔·손
  const armX = (r) => 8 - Math.floor(r / 5);
  const sleeveDeco = (spans, y0, side = -1) => {
    spans.forEach((s, r) => {
      if (!s) return;
      const w = s[1] - s[0] + 1;
      if (av.top === 7) u.rect(s[0], y0 + r, w, 1, SAEKDONG[Math.floor(r / 2) % SAEKDONG.length]);
      if (av.top === 6) u.px(side < 0 ? s[0] + 1 : s[1] - 1, y0 + r, top2);
      if (av.top === 5 && r === 10) u.rect(s[0], y0 + r, w, 1, shade(topC, -0.2));
      if (av.top === 3 && (r === 2 || r === 6)) { u.rect(s[0], y0 + r, Math.min(3, w), 1, top2); u.px(s[0], y0 + r + 1, top2); u.rect(s[1] - 2, y0 + r + 2, 3, 1, top2); }
      if (av.top === 4 && r >= 9) u.rect(s[0], y0 + r, w, 1, top2);
      if (av.top === 1 && r === 10) u.rect(s[0], y0 + r, w, 1, shade(topC, -0.12));
    });
  };
  const hand = (x, y) => { u.blk(x, y, 5, 4, glove, { r: 1, hi: 0.24 }); u.rect(x + 2, y + 1, 1, 2, shade(glove, -0.42)); };
  const armDown = (side, sw) => {
    const spans = [];
    for (let r = 0; r < 11; r++) { const a = armX(r); spans.push(side < 0 ? [a, a + 3] : [36 - a, 39 - a]); }
    spans[0] = side < 0 ? [spans[0][0] + 1, spans[0][1]] : [spans[0][0], spans[0][1] - 1];
    u.spans(27 + sw, spans, sleeve, { hi: 0.22, side: 0.14 });
    sleeveDeco(spans, 27 + sw, side);
    hand(side < 0 ? armX(10) - 1 : 34 - armX(10), 38 + sw);
  };
  const armUp = (side, sway = 0) => {
    const spans = [];
    for (let j = 0; j < 14; j++) {
      const a = 29 + Math.floor((13 - j) / 5) + (j < 6 ? sway : 0);
      spans.push(side > 0 ? [a, a + 3] : [36 - a, 39 - a]);
    }
    u.spans(14, spans, sleeve, { hi: 0.22, side: 0.14 });
    if (av.top === 6 || av.top === 7) sleeveDeco(spans, 14, side);
    const a0 = 31 + sway;
    hand(side > 0 ? a0 : 35 - a0, 10);
  };

  // ---------------------------------------------------------------- 머리·얼굴(앞)
  const headFront = () => {
    u.rect(15, 25, 10, 1, shade(skin, -0.3));
    u.blk(11, 10, 18, 15, skin, { r: 3, hi: 0.2, lo: -0.18, side: 0.1 });
    u.rect(26, 13, 1, 9, shade(skin, -0.07));
    if (st === 0 && !hatOn) u.blk(15, 6, 10, 4, skin, { r: 1, hi: 0.28 });
  };
  const eyesFront = () => {
    if (laugh) {
      for (const x of [14, 22]) { u.px(x, 17, INK); u.rect(x + 1, 16, 2, 1, INK); u.px(x + 3, 17, INK); }
      if (ft === 5) { u.px(13, 16, INK); u.px(12, 15, INK); u.px(26, 16, INK); u.px(27, 15, INK); }
    }
    else if (ft === 2) for (const x of [14, 22]) { u.blk(x, 14, 4, 4, WHITE, { r: 1, ...FLAT }); u.rect(x + 1, 15, 2, 2, INK); }
    else if (ft !== 6) for (const x of [15, 23]) { u.rect(x, 15, 2, 3, INK); u.px(x, 15, WHITE); }
    if (ft === 4) { u.rect(14, 13, 2, 1, INK); u.rect(16, 14, 2, 1, INK); u.rect(22, 14, 2, 1, INK); u.rect(24, 13, 2, 1, INK); }
    if (ft === 6) { // 윙크: 왼눈 뜨고 오른눈 찡긋
      u.rect(15, 15, 2, 3, INK); u.px(15, 15, WHITE);
      for (const [x, y] of [[25, 15], [24, 15], [23, 16], [24, 17], [25, 17]]) u.px(x, y, INK);
    }
    if (av.beard !== 1 && ft !== 4) { u.rect(12, 19, 3, 1, BLUSH); u.rect(25, 19, 3, 1, BLUSH); }
  };
  const mouthFront = () => {
    if (ft === 0) { u.px(16, 20, INK); u.px(23, 20, INK); u.rect(17, 21, 6, 1, INK); }
    if (ft === 1) { u.rect(16, 20, 8, 3, MOUTH); u.rect(16, 20, 8, 1, WHITE); u.rect(18, 22, 4, 1, TONGUE); u.px(16, 22, skin); u.px(23, 22, skin); }
    if (ft === 2) u.blk(18, 20, 4, 3, MOUTH, { r: 1, ...FLAT });
    if (laugh) { u.rect(16, 20, 8, 2, MOUTH); u.rect(17, 22, 6, 1, MOUTH); u.rect(18, 22, 4, 1, TONGUE); u.rect(19, 21, 2, 1, TONGUE); }
    if (ft === 4) u.rect(17, 21, 6, 1, INK);
    if (ft === 6) { u.rect(17, 21, 6, 1, INK); u.px(23, 20, INK); u.px(24, 19, INK); u.px(16, 20, INK); }
  };
  // 찡그린 눈썹은 앞머리 위에 그린다
  const browsFront = () => { if (ft === 6) for (const [x, y] of [[13, 13], [14, 13], [15, 14], [16, 14], [23, 14], [24, 14], [25, 13], [26, 13]]) u.px(x, y, INK); };
  // 까슬 수염: 턱선·구레나룻·콧수염 자리에 점을 흩뿌린다
  const stubble = (inArea, x0, x1) => {
    for (let y = 14; y <= 24; y++) for (let x = x0; x <= x1; x++) {
      if (!inArea(x, y) || (x * 3 + y * 5) % 7 > 2) continue;
      u.px(x, y, (x + y) % 4 ? STUB : shade(STUB, 0.22));
    }
  };
  const beardFront = () => {
    if (av.beard === 2) {
      const head = (x, y) => (y <= 21 ? x >= 11 && x <= 28 : y <= 23 ? x >= 12 && x <= 27 : x >= 14 && x <= 25);
      const mouth = (x, y) => x >= 16 && x <= 23 && y >= 20 && y <= 22;
      stubble((x, y) => head(x, y) && !mouth(x, y) && ((y >= 16 && (x === 11 || x === 28)) || y >= 22 || (y === 21 && (x <= 14 || x >= 25)) || (y === 19 && x >= 16 && x <= 23)), 11, 28);
      return;
    }
    if (!av.beard) return;
    const bc = shade(hairC, -0.12);
    u.rect(11, 14, 2, 8, bc); u.rect(27, 14, 2, 8, bc);
    u.rect(11, 21, 18, 3, bc); u.rect(14, 24, 12, 1, bc);
    u.rect(13, 19, 3, 2, bc); u.rect(24, 19, 3, 2, bc); u.rect(15, 19, 10, 1, bc);
    for (let x = 12; x < 28; x += 2) u.px(x, 23, shade(hairC, -0.32));
    u.rect(16, 20, 8, 2, skin);
  };
  const glassesFront = () => {
    if (av.glasses === 1) {
      for (const x of [13, 21]) { u.rect(x + 1, 13, 4, 1, FRAME); u.rect(x + 1, 18, 4, 1, FRAME); u.rect(x, 14, 1, 4, FRAME); u.rect(x + 5, 14, 1, 4, FRAME); }
      u.rect(19, 15, 2, 1, FRAME); u.rect(11, 15, 2, 1, FRAME); u.rect(27, 15, 2, 1, FRAME);
    } else if (av.glasses === 2) {
      for (const x of [13, 21]) { u.blk(x, 14, 6, 4, LENS, { r: 1, ...FLAT }); u.rect(x + 1, 14, 2, 1, '#6e6e88'); }
      u.rect(19, 14, 2, 1, LENS); u.rect(11, 14, 2, 1, LENS); u.rect(27, 14, 2, 1, LENS);
    } else if (av.glasses === 3) { // 실험 고글: 머리를 두르는 끈 + 큰 렌즈 두 개
      u.rect(11, 14, 18, 2, shade(GOGGLE, -0.45));
      for (const x of [12, 21]) { u.blk(x, 12, 7, 6, GOGGLE, { r: 2, hi: 0.25, lo: -0.2, side: 0.1 }); u.rect(x + 1, 13, 5, 4, GOGGLE_LENS); u.rect(x + 1, 13, 2, 1, WHITE); u.px(x + 5, 16, shade(GOGGLE_LENS, -0.2)); }
      u.rect(19, 14, 2, 2, GOGGLE);
    }
  };
  // 옆가르마 윗머리 윤곽 (y 5~13): 왼쪽이 더 높고 머리 폭(11~28)보다 1칸씩만 넓다
  const SWEEP = [[13, 20], [11, 24], [10, 27], [10, 28], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29]];
  const BOB_L = [15, 12, 11, 10, 9, 9, 9, 8, 8, 8, 8, 7, 7, 6, 6, 5, 4, 4, 5, 7, 10];
  const BOBF = BOB_L.map((a) => [a, 39 - a]);
  // 단발 뒷덩어리: 얼굴 뒤(앞모습) 또는 뒤통수 전체(뒷모습)에 한 번에 그린다. 가운데 선 없이 윗부분에 윤기 띠.
  const bobMass = (back) => {
    u.spans(4, BOBF, hairC, { hi: 0.24, lo: -0.26, side: 0.12 });
    for (let j = 0; j < BOBF.length; j++) { const [a, b] = BOBF[j]; if (j > 6) { u.px(a + 1, 4 + j, shade(hairC, 0.1)); u.px(b - 1, 4 + j, hd); } }
    // 윤기 띠(둥근 호)
    for (let x = 12; x <= 27; x++) { const y = 7 + Math.round(((x - 19.5) / 8) ** 2 * 2); u.px(x, y, hh); if (x % 3) u.px(x, y + 1, shade(hairC, 0.14)); }
    if (back) {
      for (const x of [9, 15, 24, 30]) { u.px(x, 21, hd); u.px(x, 22, hd); } // 끝부분 머리 결
      u.rect(12, 18, 16, 1, shade(hairC, -0.08));
    } else {
      u.rect(10, 15, 1, 8, hd); u.rect(29, 15, 1, 8, hd); // 얼굴 옆 그림자
    }
  };
  const hairFront = () => {
    if (draft && !hatOn) { draft.front(draftApi()); return; }
    if (hatOn) {
      if (st === 1 || st === 2 || st === 5 || st === 6 || st === 7 || st === 9) { H(10, 12, 2, 5); H(28, 12, 2, 5); }
      if (st === 4) { H(7, 12, 6, 24, 1); H(27, 12, 6, 24, 1); u.rect(11, 17, 1, 17, hd); u.rect(28, 17, 1, 17, hd); }
      return;
    }
    if (st === 1) { // 옆가르마 짧은 머리(엘엠): 머리통에 붙고, 왼쪽이 솟았다가 오른쪽으로 쓸려 내려온다
      H(10, 12, 2, 4); H(28, 12, 2, 6);
      u.spans(5, SWEEP, hairC, { hi: 0.24, lo: 0, side: 0.1 });
      // 앞머리: 왼쪽은 이마가 보이고 오른쪽으로 갈수록 내려온다
      u.rect(12, 13, 16, 1, hairC); u.rect(17, 14, 11, 1, hairC); u.rect(22, 15, 6, 1, hairC); u.rect(26, 16, 2, 1, hairC);
      u.px(16, 14, hd); u.px(21, 15, hd); u.px(25, 16, hd);
      // 결 방향을 보여 주는 선과 광택
      for (const [x, y] of [[15, 10], [16, 11], [20, 9], [21, 10], [22, 11], [25, 10], [26, 11]]) u.px(x, y, hd);
      for (const [x, y] of [[13, 7], [14, 7], [15, 7], [16, 7], [17, 8], [18, 8], [12, 8]]) u.px(x, y, hh);
    }
    if (st === 2) {
      H(9, 5, 22, 9, 3); H(9, 12, 3, 6); H(28, 12, 2, 5);
      u.rect(11, 13, 14, 1, hairC); u.rect(11, 14, 9, 1, hairC); u.rect(11, 15, 4, 1, hd);
      for (const [x, y] of [[13, 7], [14, 7], [15, 8], [16, 8], [17, 9], [21, 6], [22, 6], [23, 7], [24, 7]]) u.px(x, y, hh);
      u.rect(25, 12, 4, 1, hd);
    }
    if (st === 3) { // 끝이 바깥으로 뻗친 단발(달새) + 비스듬히 쓸린 앞머리 (뒷덩어리는 얼굴 뒤에 먼저 그림)
      u.spans(4, BOBF.slice(0, 10), hairC, { hi: 0.24, lo: 0, side: 0.12 });
      for (let x = 12; x <= 27; x++) { const y = 7 + Math.round(((x - 19.5) / 8) ** 2 * 2); u.px(x, y, hh); if (x % 3) u.px(x, y + 1, shade(hairC, 0.14)); }
      // 왼쪽 가르마에서 오른쪽으로 쓸린 앞머리: 이마 왼쪽은 드러나고 오른쪽 끝이 볼 쪽으로 흘러내린다
      u.rect(15, 13, 13, 1, hairC); u.rect(20, 14, 8, 1, hairC); u.rect(24, 15, 4, 1, hairC); u.rect(26, 16, 2, 3, hairC);
      u.px(14, 13, hd); u.px(19, 14, hd); u.px(23, 15, hd); u.px(14, 12, hd); u.px(15, 11, hd);
    }
    if (st === 4) {
      H(9, 6, 22, 8, 3); H(7, 12, 6, 24, 1); H(27, 12, 6, 24, 1);
      u.rect(12, 13, 16, 1, hairC);
      u.rect(11, 17, 1, 17, hd); u.rect(28, 17, 1, 17, hd); u.rect(13, 7, 7, 1, hh);
    }
    if (st === 7) { // 결 올림머리(컴지): 오른쪽 위로 솟은 볼륨, 이마 왼쪽이 조금 드러남
      H(10, 11, 2, 6); H(28, 11, 2, 6);
      u.spans(3, [[18, 25], [15, 27], [12, 28], [11, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29]], hairC, { hi: 0.24, lo: 0, side: 0.1 });
      u.rect(12, 13, 3, 1, hairC); u.px(12, 14, hairC); u.rect(24, 13, 4, 1, hairC);
      strand(12, 12, 17, 5); strand(15, 12, 21, 4); strand(19, 12, 25, 5); strand(23, 12, 27, 8);
    }
    if (st === 8) { // 앞머리 단발(달새): 둥근 단발 + 일자 앞머리 (뒷덩어리는 얼굴 뒤에 먼저 그림)
      u.spans(4, BOBF.slice(0, 9), hairC, { hi: 0.24, lo: 0, side: 0.12 });
      for (let x = 12; x <= 27; x++) { const y = 7 + Math.round(((x - 19.5) / 8) ** 2 * 2); u.px(x, y, hh); }
      u.rect(12, 13, 16, 2, hairC); u.px(12, 15, hairC); u.px(27, 15, hairC);
      for (let x = 13; x <= 26; x += 3) u.px(x, 14, hd);
    }
    if (st === 9) { // 짧은 옆가르마(선생님): 단정한 윗머리 + 왼쪽 가르마 + 오른쪽으로 빗은 결
      u.spans(6, [[14, 24], [12, 26], [11, 28], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29]], hairC, { hi: 0.24, lo: 0, side: 0.1 });
      H(10, 12, 2, 3); H(28, 12, 2, 3);
      for (const [x, y] of [[14, 7], [14, 8], [13, 9], [13, 10]]) u.px(x, y, hd);
      strand(18, 7, 24, 12); strand(22, 7, 27, 11);
    }
    if (st === 6) { // 텁수룩 옆머리(선생님): 옆가르마 윤곽 + 결 + 삐죽한 앞머리 끝
      H(10, 12, 2, 6); H(28, 12, 2, 7);
      u.spans(5, SWEEP, hairC, { hi: 0.24, lo: 0, side: 0.1 });
      u.rect(11, 13, 18, 1, hairC);
      for (const [x, len] of [[11, 3], [12, 2], [17, 2], [18, 1], [22, 1], [26, 2], [27, 4], [28, 3]]) u.rect(x, 14, 1, len, hairC);
      u.px(12, 15, hd); u.px(27, 17, hd); u.px(18, 14, hd);
      // 결(가닥 경계)은 정수리에서 앞머리 쪽으로 이어진 선, 그 왼쪽에 광택
      strand(16, 6, 14, 12); strand(21, 6, 20, 12); strand(25, 7, 25, 12);
    }
    if (st === 5) {
      H(10, 8, 20, 6, 2); spikes([[12, 5], [16, 3], [20, 2], [24, 3], [28, 5]]);
      for (const x of [13, 17, 21, 25]) { u.rect(x, 13, 2, 1, hairC); u.px(x, 14, hd); }
      H(10, 12, 2, 5); H(28, 12, 2, 5);
    }
  };
  const hatAll = (side) => {
    const c = hatC;
    if (av.hat === 1) { // 안전모
      u.blk(side ? 10 : 9, 4, side ? 20 : 22, 10, c, { r: 4, hi: 0.3 });
      u.rect(side ? 17 : 19, 4, 2, 9, shade(c, 0.32));
      u.blk(8, 12, side ? 23 : 24, 3, shade(c, -0.14), { r: 1 });
    }
    if (av.hat === 2) { // 탐사 모자
      u.ell(side ? 4 : 3, 9, side ? 32 : 34, 6, shade(c, -0.08), { hi: 0.2, lo: -0.2, side: 0 });
      u.blk(side ? 12 : 11, 3, side ? 17 : 18, 8, c, { r: 3, hi: 0.26 });
      u.rect(side ? 12 : 11, 9, side ? 17 : 18, 2, shade(c, -0.45));
    }
    if (av.hat === 3) { // 야구 모자
      u.blk(side ? 11 : 10, 5, side ? 18 : 20, 8, c, { r: 4, hi: 0.28 });
      if (view === 'down') { u.ell(12, 11, 16, 4, shade(c, -0.22), { hi: 0.1, lo: -0.1, side: 0 }); u.blk(18, 7, 4, 3, WHITE, { r: 1, ...FLAT }); }
      if (side) u.blk(4, 11, 11, 3, shade(c, -0.22), { r: 1 });
      if (view === 'up') u.rect(16, 12, 8, 1, shade(c, -0.35));
      u.rect(19, 5, 2, 1, shade(c, -0.35));
    }
    if (av.hat === 4) { // 비니: 둥근 털모자 + 접힌 단(골지) + 방울
      u.ell(side ? 16 : 17, 0, 6, 5, shade(c, 0.45), { hi: 0.2, lo: -0.2, side: 0 });
      u.blk(side ? 11 : 10, 4, side ? 18 : 20, 9, c, { r: 4, hi: 0.26 });
      u.blk(side ? 10 : 9, 11, side ? 20 : 22, 3, shade(c, -0.14), { r: 1, hi: 0.15 });
      for (let x = (side ? 11 : 10); x < (side ? 30 : 31); x += 2) u.rect(x, 11, 1, 3, shade(c, -0.3));
    }
    if (av.hat === 5) { // 고양이 귀 머리띠: 머리카락 위에 얹는다
      const ear = (cxm, inner) => {
        for (let j = 0; j < 10; j++) {
          const hw = Math.floor(j / 2.5);
          u.rect(cxm - hw, j, hw * 2 + 1, 1, j === 9 ? shade(c, -0.2) : c);
          u.px(cxm - hw, j, shade(c, 0.28));
          if (inner && j >= 3 && j < 9 && hw >= 1) u.rect(cxm - hw + 1, j, hw * 2 - 1, 1, EAR_PINK);
        }
      };
      if (side) { ear(24, false); ear(18, true); } else { ear(12, view === 'down'); ear(27, view === 'down'); }
      u.rect(side ? 13 : 10, 9, side ? 14 : 20, 1, shade(c, -0.35));
    }
    if (av.hat === 6) { // 왕관: 뾰족한 금테 + 보석
      const x0 = side ? 13 : 12, w = side ? 14 : 16;
      for (let i = 0; i <= 4; i++) { const px = x0 + Math.round((i * (w - 2)) / 4); u.rect(px, 1, 2, 5, c); u.px(px, 1, shade(c, 0.4)); }
      u.blk(x0, 5, w, 4, c, { hi: 0.3, lo: -0.25, side: 0.1 });
      u.rect(x0 + 3, 6, 2, 2, '#d8343a'); u.rect(x0 + w / 2 - 1, 6, 2, 2, '#2e6bd0'); u.rect(x0 + w - 5, 6, 2, 2, '#3aa04b');
    }
    if (av.hat === 7) { // 헤드폰: 머리 위 띠 + 양쪽 귀 덮개
      const band = shade(c, -0.35);
      if (side) {
        u.rect(19, 3, 3, 1, band); u.rect(20, 4, 2, 9, band);
        u.blk(17, 12, 7, 9, c, { r: 2, hi: 0.3, lo: -0.25, side: 0.1 }); u.blk(19, 14, 3, 5, shade(c, -0.25), { r: 1, ...FLAT });
      } else {
        u.rect(15, 3, 10, 1, band); u.rect(12, 4, 3, 1, band); u.rect(25, 4, 3, 1, band);
        u.rect(10, 5, 2, 8, band); u.rect(28, 5, 2, 8, band);
        u.blk(7, 12, 5, 9, c, { r: 2, hi: 0.3, lo: -0.25, side: 0.1 }); u.blk(28, 12, 5, 9, c, { r: 2, hi: 0.3, lo: -0.25, side: 0.1 });
        u.rect(9, 14, 1, 5, shade(c, 0.3)); u.rect(30, 14, 1, 5, shade(c, 0.3));
      }
    }
  };

  // ---------------------------------------------------------------- 옆모습(왼쪽을 봄)
  const sideView = () => {
    const nearDx = step === 1 ? -3 : step === -1 ? 3 : 0;
    const legTop = 44 + d, legH = 56 - legTop + 1;
    if (av.back) u.blk(23, 27, 7, 12, backC, { r: 2, hi: 0.22 });
    leg(15 - nearDx, legTop, legH - (nearDx < 0 ? 1 : 0), { col: shade(botC, -0.16), foot: 3 });
    leg(15 + nearDx, legTop, legH - (nearDx > 0 ? 1 : 0), { foot: 3 });
    if (av.bottom === 2) skirt(14, 25, 1); else u.blk(14, 40, 12, 4, shade(botC, -0.06), { hi: 0.12 });
    if (av.top === 1) u.blk(15, 40, 10, 5, topC, { hi: 0.1 });
    // 몸통
    u.blk(15, 26, 10, 14, topC, { hi: 0.2, side: 0.14 });
    const t = av.top;
    if (t === 0) { u.rect(15, 26, 3, 1, shade(skin, -0.1)); u.rect(15, 31, 2, 4, top2); }
    if (t === 1) { u.rect(15, 26, 2, 14, top2); u.rect(17, 26, 1, 14, shade(topC, -0.16)); u.rect(20, 30, 3, 1, shade(topC, -0.2)); }
    if (t === 2) {
      u.rect(15, 26, 4, 1, '#dbe8ff'); u.rect(15, 27, 1, 13, shade(topC, -0.3));
      for (const y of [34, 38]) for (let x = 17; x < 24; x += 3) u.px(x, y, shade(topC, 0.28));
      u.rect(16, 30, 3, 2, '#d8343a');
    }
    if (t === 3) {
      u.blk(15, 28, 3, 9, '#fde3cc', { hi: 0.1, lo: -0.08, side: 0 });
      for (const y of [27, 31, 35]) tri(24, y, -1, top2);
      u.rect(15, 38, 10, 2, top2); u.rect(15, 37, 3, 4, '#d8891a'); u.rect(15, 38, 2, 2, top2);
    }
    if (t === 4) { u.rect(15, 26, 3, 3, WHITE); u.rect(15, 27, 1, 6, '#1e1a22'); for (const y of [30, 33, 36]) u.px(17, y, top2); u.rect(18, 26, 6, 2, top2); }
    if (t === 5) { u.blk(21, 26, 5, 6, shade(topC, 0.06), { r: 2, hi: 0.2, lo: -0.25, side: 0.1 }); u.rect(15, 33, 5, 5, shade(topC, -0.05)); u.rect(15, 33, 5, 1, shade(topC, -0.24)); u.rect(16, 28, 1, 4, top2); }
    if (t === 6) { u.rect(15, 26, 5, 2, shade(topC, -0.12)); u.rect(15, 27, 1, 13, shade(topC, -0.3)); u.rect(22, 27, 1, 13, top2); }
    if (t === 7) { for (let j = 0; j < 5; j++) u.rect(15 + Math.floor(j / 2), 26 + j, 2, 1, WHITE); u.rect(15, 32, 2, 2, top2); u.rect(15, 34, 1, 5, top2); }
    if (av.bottom === 3) { u.blk(15, 32, 5, 8, botC, { hi: 0.18, lo: 0, side: 0.1 }); u.rect(19, 26, 2, 7, botC); }
    if (av.back) u.rect(19, 26, 2, 9, shade(backC, -0.12));
    // 머리
    u.rect(16, 25, 8, 1, shade(skin, -0.3));
    u.blk(12, 10, 16, 15, skin, { r: 3, hi: 0.2, lo: -0.18, side: 0.1 });
    if (st === 0 && !hatOn) u.blk(16, 6, 8, 4, skin, { r: 1, hi: 0.28 });
    if (laugh) { u.px(13, 17, INK); u.rect(14, 16, 2, 1, INK); u.px(16, 17, INK); if (ft === 5) { u.px(17, 16, INK); u.px(18, 15, INK); } }
    else if (ft === 2) { u.blk(13, 14, 4, 4, WHITE, { r: 1, ...FLAT }); u.rect(13, 15, 2, 2, INK); }
    else { u.rect(14, 15, 2, 3, INK); u.px(14, 15, WHITE); }
    if (ft === 4) { u.rect(13, 14, 2, 1, INK); u.rect(15, 13, 2, 1, INK); }
    if (ft === 6) { u.rect(14, 15, 2, 3, INK); u.px(14, 15, WHITE); }
    if (av.beard !== 1 && ft !== 4) u.rect(18, 19, 3, 1, BLUSH);
    if (av.beard === 2) {
      const head = (x, y) => (y <= 21 ? x >= 12 && x <= 27 : y <= 23 ? x >= 13 && x <= 26 : x >= 15 && x <= 24);
      stubble((x, y) => head(x, y) && !(x <= 16 && y >= 20 && y <= 22) && ((x >= 20 && x <= 22 && y >= 14) || (y >= 21 && x <= 22) || (y === 19 && x <= 17)), 12, 22);
    }
    if (av.beard === 1) {
      const bc = shade(hairC, -0.12);
      u.rect(12, 21, 11, 3, bc); u.rect(14, 24, 8, 1, bc); u.rect(20, 14, 3, 8, bc); u.rect(12, 19, 6, 1, bc);
      u.rect(12, 20, 5, 1, skin);
    }
    if (ft === 0) { u.rect(13, 21, 3, 1, INK); u.px(16, 20, INK); }
    if (ft === 1) { u.rect(12, 20, 5, 3, MOUTH); u.rect(12, 20, 5, 1, WHITE); u.rect(13, 22, 3, 1, TONGUE); }
    if (ft === 2) u.rect(13, 20, 3, 3, MOUTH);
    if (laugh) { u.rect(12, 20, 5, 2, MOUTH); u.rect(12, 22, 4, 1, MOUTH); u.rect(13, 22, 2, 1, TONGUE); }
    if (ft === 4) u.rect(13, 21, 4, 1, INK);
    if (ft === 6) { u.rect(13, 21, 4, 1, INK); u.px(12, 20, INK); u.rect(13, 13, 2, 1, INK); u.rect(15, 14, 2, 1, INK); }
    if (av.glasses === 1) { u.rect(13, 13, 3, 1, FRAME); u.rect(13, 18, 3, 1, FRAME); u.rect(12, 14, 1, 4, FRAME); u.rect(16, 14, 1, 4, FRAME); u.rect(17, 15, 9, 1, FRAME); }
    if (av.glasses === 2) { u.blk(12, 14, 5, 4, LENS, { r: 1, ...FLAT }); u.px(13, 14, '#6e6e88'); u.rect(17, 14, 9, 1, LENS); }
    if (av.glasses === 3) { u.rect(17, 14, 11, 2, shade(GOGGLE, -0.45)); u.blk(11, 12, 7, 6, GOGGLE, { r: 2, hi: 0.25, lo: -0.2, side: 0.1 }); u.rect(12, 13, 4, 4, GOGGLE_LENS); u.rect(12, 13, 2, 1, WHITE); }
    // 머리카락(뒤통수는 오른쪽): 뒷머리를 먼저 그리고 윗머리를 덮어 이음선을 없앤다
    if (hatOn) {
      if (st === 1 || st === 2 || st === 5 || st === 6 || st === 7 || st === 9) HB(20, 11, 8, 7, 1);
      if (st === 3 || st === 8) u.spans(12, BOBF.slice(8).map(([a, b]) => [18, b - 1]), hairC, { hi: 0, lo: -0.26, side: 0.12 });
      if (st === 4) { HB(18, 11, 11, 25, 1); u.rect(22, 17, 1, 17, hd); }
    } else {
      if (st === 1) { HB(19, 9, 10, 9, 1); H(11, 6, 18, 8, 3); u.rect(19, 13, 10, 1, hairC); u.rect(12, 13, 5, 1, hairC); u.rect(11, 14, 3, 1, hairC); for (const [x, y] of [[14, 7], [15, 7], [16, 7], [17, 8]]) u.px(x, y, hh); for (const [x, y] of [[20, 9], [21, 10], [24, 9], [25, 10]]) u.px(x, y, hd); }
      if (st === 2) { HB(18, 9, 11, 10, 1); H(10, 5, 20, 9, 3); u.rect(18, 13, 11, 1, hairC); u.rect(11, 13, 7, 1, hairC); u.rect(11, 14, 4, 1, hairC); u.px(11, 15, hd); for (const [x, y] of [[14, 7], [15, 7], [16, 8], [17, 8], [22, 6], [23, 7]]) u.px(x, y, hh); }
      if (st === 3) { u.spans(4, BOBF.map(([a, b], j) => [j >= 8 ? 18 : a + 1, b - 1]), hairC, { hi: 0.24, lo: -0.26, side: 0.12 }); u.rect(15, 7, 9, 1, hh); u.rect(14, 8, 2, 1, hh); u.rect(19, 15, 1, 8, hd); u.rect(11, 13, 7, 1, hairC); u.rect(11, 14, 3, 1, hairC); }
      if (st === 4) { HB(18, 9, 11, 27, 1); H(10, 6, 20, 8, 3); u.rect(18, 13, 11, 1, hairC); u.rect(12, 13, 6, 1, hairC); u.rect(22, 17, 1, 17, hd); u.rect(14, 7, 6, 1, hh); }
      if (st === 7) { HB(19, 9, 10, 9, 1); u.spans(3, [[17, 24], [14, 27], [12, 28], [11, 28], [10, 28], [10, 28], [11, 28], [12, 28], [14, 28], [18, 28]], hairC, { hi: 0.24, lo: 0, side: 0.1 }); u.rect(12, 12, 2, 1, hairC); strand(13, 11, 19, 4); strand(17, 11, 23, 4); strand(21, 12, 26, 6); }
      if (st === 8) { u.spans(4, BOBF.map(([a, b], j) => [j >= 8 ? 18 : a + 1, b - 1]), hairC, { hi: 0.24, lo: -0.26, side: 0.12 }); u.rect(15, 7, 9, 1, hh); u.rect(14, 8, 2, 1, hh); u.rect(19, 15, 1, 8, hd); u.rect(11, 13, 7, 2, hairC); u.px(12, 14, hd); u.px(15, 14, hd); }
      if (st === 9) { HB(19, 9, 10, 8, 1); H(10, 6, 20, 8, 3); u.rect(19, 13, 10, 1, hairC); u.rect(11, 13, 6, 1, hairC); strand(15, 7, 13, 12); strand(21, 7, 24, 12); }
      if (st === 6) { HB(19, 9, 10, 10, 1); H(10, 5, 20, 9, 4); u.rect(19, 13, 10, 1, hairC); u.rect(11, 13, 7, 1, hairC); for (const [x, len] of [[11, 3], [12, 2], [14, 2], [16, 1]]) u.rect(x, 14, 1, len, hairC); strand(17, 6, 14, 12); strand(22, 7, 21, 13); strand(25, 9, 26, 17); }
      if (st === 5) { HB(20, 10, 8, 8, 1); H(11, 8, 18, 6, 2); u.rect(20, 13, 8, 1, hairC); spikes([[14, 5], [18, 3], [22, 2], [26, 4]]); u.rect(12, 13, 3, 1, hairC); }
    }
    hatAll(true);
    // 가까운 팔
    const sw = step * 2;
    u.blk(17 + sw, 27, 5, 11, sleeve, { r: 1, hi: 0.22, side: 0.14 });
    if (av.top === 3) { u.rect(17 + sw, 30, 5, 2, top2); u.rect(17 + sw, 34, 5, 2, top2); }
    if (av.top === 4) u.rect(17 + sw, 36, 5, 2, top2);
    if (av.top === 7) for (let r = 0; r < 11; r++) u.rect(17 + sw, 27 + r, 5, 1, SAEKDONG[Math.floor(r / 2) % SAEKDONG.length]);
    if (av.top === 6) u.rect(19 + sw, 27, 1, 11, top2);
    if (av.top === 5) u.rect(17 + sw, 37, 5, 1, shade(topC, -0.2));
    u.blk(17 + sw, 38, 5, 3, glove, { r: 1, hi: 0.24 }); u.px(18 + sw, 39, shade(glove, -0.42));
  };

  const draftApi = () => ({ u, H, HB, strand, hairC, hh, hd, skin, shade, SWEEP, BOBF });

  // ---------------------------------------------------------------- 그리는 순서
  if (view === 'left') { sideView(); return; }
  if (view === 'up') {
    legsFrontBack(); hips(); coatSkirt(); torsoBack();
    armDown(-1, isWalk ? step : 0); armDown(1, isWalk ? -step : 0);
    u.rect(15, 25, 10, 1, shade(skin, -0.3));
    u.blk(11, 10, 18, 15, skin, { r: 3, hi: 0.2, lo: -0.18, side: 0.1 });
    if (hatOn) {
      if (st === 1 || st === 2 || st === 5 || st === 6 || st === 7 || st === 9) H(10, 12, 20, 9, 2);
      if (st === 3 || st === 8) { u.spans(12, BOBF.slice(8), hairC, { hi: 0, lo: -0.26, side: 0.12 }); }
      if (st === 4) { H(8, 12, 24, 14, 2); H(9, 24, 22, 12, 2); u.rect(19, 24, 1, 11, hd); }
    } else {
      if (st === 0) u.blk(15, 6, 10, 4, skin, { r: 1, hi: 0.28 });
      if (st === 1) { HB(10, 11, 20, 10, 2); u.spans(5, SWEEP.map(([a, b]) => [39 - b, 39 - a]), hairC, { hi: 0.24, lo: 0, side: 0.1 }); for (const [x, y] of [[23, 7], [24, 7], [25, 7], [26, 8]]) u.px(x, y, hh); for (const [x, y] of [[18, 10], [19, 11], [22, 12], [23, 13]]) u.px(x, y, hd); }
      if (st === 2) { H(9, 5, 22, 15, 3); for (const [x, y] of [[14, 7], [15, 7], [16, 8], [22, 6], [23, 7]]) u.px(x, y, hh); }
      if (st === 3 || st === 8) bobMass(true);
      if (st === 4) { H(8, 6, 24, 20, 3); H(9, 24, 22, 12, 2); u.rect(19, 7, 1, 28, hd); u.rect(13, 7, 5, 1, hh); }
      if (st === 7) { HB(10, 11, 20, 9, 2); u.spans(3, [[14, 21], [12, 24], [11, 27], [10, 28], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29]], hairC, { hi: 0.24, lo: 0, side: 0.1 }); strand(15, 6, 14, 19); strand(20, 4, 20, 19); strand(25, 6, 26, 19); }
      if (st === 9) { HB(10, 11, 20, 8, 2); u.spans(6, [[15, 25], [13, 27], [11, 28], [10, 29], [10, 29], [10, 29], [10, 29]], hairC, { hi: 0.24, lo: 0, side: 0.1 }); strand(17, 8, 16, 18); strand(23, 8, 24, 18); }
      if (st === 6) { HB(10, 11, 20, 10, 2); u.spans(5, SWEEP.map(([a, b]) => [39 - b, 39 - a]), hairC, { hi: 0.24, lo: 0, side: 0.1 }); for (const x of [11, 14, 18, 22, 26]) u.rect(x, 21, 2, 1, hairC); strand(15, 8, 14, 20); strand(20, 6, 20, 20); strand(25, 7, 26, 20); }
      if (st === 5) { H(10, 8, 20, 13, 2); spikes([[12, 5], [16, 3], [20, 2], [24, 3], [28, 5]]); }
    }
    hatAll(false);
    return;
  }
  // 앞모습
  legsFrontBack(); hips(); torsoFront(); coatSkirt();
  if (!cheer) armDown(-1, isWalk ? -step : 0);
  if (!cheer && !wave) armDown(1, isWalk ? step : 0);
  if (draft?.behind) draft.behind(draftApi()); else if (st === 3 || st === 8) bobMass(false); // 단발은 얼굴 뒤에 깐다(모자를 써도 옆머리가 보임)
  headFront(); eyesFront(); beardFront(); mouthFront(); glassesFront(); hairFront(); browsFront(); hatAll(false);
  if (wave) armUp(1, col === 5 ? 1 : 0);
  if (cheer) { armUp(1, col === 7 ? 1 : 0); armUp(-1, col === 7 ? 1 : 0); }
}

const sheetCache = new Map();

// 아바타 시트: 가로 9칸(걷기4·손흔들기2·만세2·앉기1) × 세로 4줄(아래·왼쪽·오른쪽·위)
export function getAvatarSheet(av) {
  const key = avatarKey(av);
  let sheet = sheetCache.get(key);
  if (sheet) return sheet;
  sheet = document.createElement('canvas');
  sheet.width = COLS * FW; sheet.height = 4 * FH;
  const cx = sheet.getContext('2d', { willReadFrequently: true });
  for (let col = 0; col < COLS; col++) {
    const x = col * FW;
    paintCell(cx, x, 0, av, 'down', col); selout(cx, x, 0, FW, FH);
    if (col < 4) {
      paintCell(cx, x, FH, av, 'left', col); selout(cx, x, FH, FW, FH);
      cx.save(); cx.translate(2 * x + FW, 0); cx.scale(-1, 1);
      cx.drawImage(sheet, x, FH, FW, FH, x, 2 * FH, FW, FH); cx.restore();
      paintCell(cx, x, 3 * FH, av, 'up', col); selout(cx, x, 3 * FH, FW, FH);
    } else {
      for (let r = 1; r < 4; r++) cx.drawImage(sheet, x, 0, FW, FH, x, r * FH, FW, FH);
    }
  }
  if (sheetCache.size > 200) sheetCache.delete(sheetCache.keys().next().value);
  sheetCache.set(key, sheet);
  return sheet;
}

// 현재 상태에 맞는 (열, 줄)을 고른다.
export function frameFor({ dir, moving, run, emote, t }) {
  const row = ROW_OF[dir] ?? 0;
  if (emote === 'sit') return { col: COL.sit, row: 0 };
  if (emote === 'wave') return { col: COL.wave + (Math.floor(t * 5) % 2), row: 0 };
  if (emote === 'cheer') return { col: COL.cheer + (Math.floor(t * 4) % 2), row: 0 };
  if (!moving) return { col: 0, row };
  const fps = run ? 10 : 7;
  return { col: Math.floor(t * fps) % 4, row };
}
