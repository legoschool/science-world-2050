// 머리 모양 후보(고르기용 시안). 2026-09-30 확정분(컴지 C·달새 B·선생님 B)은 정식 머리 7·8·9로 옮김. 앞모습만 새로 그리고, 옆·뒷모습은 base 스타일을 빌려 쓴다.
// 고른 시안은 avatar-render.mjs의 정식 머리 모양으로 옮기고 이 파일에서 지운다.
// 좌표는 40×60 프레임 기준(머리통 x11~28, y10~24 / 눈 y15~17).
const OT = { hi: 0.24, lo: 0, side: 0.1 }; // 아랫변을 어둡게 하지 않음(앞머리와 이어질 때)
const OM = { hi: 0.24, lo: -0.26, side: 0.12 };
const rows = (u, c, list) => list.forEach(([y, a, b]) => u.rect(a, y, b - a + 1, 1, c));

// 얼굴 뒤에 까는 뒷머리 덩어리(y4~24) + 윗부분 윤기 띠
function mass(api, left, right) {
  const { u, hairC, hh, hd } = api;
  u.spans(4, left.map((a, j) => [a, right[j]]), hairC, OM);
  for (let x = 12; x <= 27; x++) { const y = 7 + Math.round(((x - 19.5) / 8) ** 2 * 2); u.px(x, y, hh); }
  u.rect(10, 15, 1, 8, hd); u.rect(29, 15, 1, 8, hd);
}
const BOB_L = [15, 12, 11, 10, 9, 9, 9, 8, 8, 8, 8, 7, 7, 6, 6, 5, 4, 4, 5, 7, 10];
const mirror = (L) => L.map((a) => 39 - a);

export const HAIR_DRAFTS = {
  // ------------------------------------------------ 컴지 (사진: 붉은 갈색, 위로 쓸어 올린 결 있는 머리)
  101: { who: 'comji', tag: 'A', name: '볼륨 올림머리', base: 2,
    front({ u, H, hairC, hd, skin, shade, strand }) {
      H(10, 11, 3, 6, 1); H(27, 11, 3, 6, 1);
      u.spans(3, [[14, 22], [12, 25], [11, 27], [10, 28], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29]], hairC, OT);
      u.rect(12, 12, 16, 1, shade(skin, -0.14)); // 올린 앞머리 아래 이마 그림자
      u.rect(12, 11, 16, 1, hd);
      strand(13, 11, 16, 4); strand(18, 11, 20, 4); strand(23, 11, 25, 5);
    } },
  102: { who: 'comji', tag: 'B', name: '옆으로 쓸어넘김', base: 2,
    front({ u, H, hairC, hd, strand }) {
      H(9, 12, 3, 6, 1); H(28, 12, 2, 5, 1);
      u.spans(4, [[13, 21], [11, 25], [10, 27], [9, 28], [9, 29], [9, 29], [9, 29], [9, 29], [9, 29], [9, 29]], hairC, OT);
      rows(u, hairC, [[14, 12, 21], [15, 12, 16], [16, 12, 13]]);
      u.px(22, 14, hd); u.px(17, 15, hd); u.px(14, 16, hd);
      strand(26, 6, 19, 13); strand(22, 5, 15, 13); strand(17, 5, 12, 11);
    } },

  // ------------------------------------------------ 엘엠 (사진: 붉은 갈색, 머리통에 붙는 옆가르마)
  111: { who: 'elm', tag: 'A', name: '둥근 옆가르마(사진)', base: 1,
    front({ u, H, hairC, hd, strand }) {
      H(10, 12, 2, 5);
      u.spans(12, [[27, 29], [27, 29], [27, 29], [27, 29], [27, 30], [28, 31], [29, 31]], hairC, OM);
      u.spans(5, [[14, 24], [12, 26], [11, 27], [10, 28], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29]], hairC, OT);
      rows(u, hairC, [[14, 16, 27], [15, 21, 28], [16, 25, 28]]);
      u.px(15, 14, hd); u.px(20, 15, hd); u.px(24, 16, hd);
      for (const [x, y] of [[14, 6], [14, 7], [13, 8]]) u.px(x, y, hd);
      strand(17, 6, 23, 13); strand(21, 6, 26, 12);
    } },
  112: { who: 'elm', tag: 'B', name: '짧은 스포츠', base: 1,
    front({ u, H, hairC, hh, hd }) {
      u.spans(7, [[13, 26], [11, 28], [10, 29], [10, 29], [10, 29], [10, 29]], hairC, OT);
      H(10, 12, 2, 4); H(28, 12, 2, 4);
      for (let x = 12; x <= 27; x += 2) u.px(x, 13, hairC);
      for (const x of [13, 16, 19, 22, 25]) { u.px(x, 9, hd); u.px(x + 1, 11, hd); }
      u.rect(14, 8, 6, 1, hh);
    } },
  113: { who: 'elm', tag: 'C', name: '윗머리 삐침', base: 1,
    front({ u, H, hairC, hh, hd, SWEEP, strand }) {
      H(10, 12, 2, 5); H(28, 12, 2, 6);
      for (const [x, top] of [[15, 3], [20, 1], [25, 3]]) for (let y = top; y < 6; y++) { const w = 1 + (y - top); u.rect(x - Math.floor(w / 2), y, w + 1, 1, hairC); u.px(x - Math.floor(w / 2), y, hh); }
      u.spans(5, SWEEP, hairC, OT);
      rows(u, hairC, [[13, 12, 27], [14, 17, 27], [15, 22, 27]]);
      u.px(16, 14, hd); u.px(21, 15, hd);
      strand(15, 6, 14, 12); strand(21, 6, 21, 12);
    } },

  // ------------------------------------------------ 달새 (사진: 짙은 주황, 한쪽으로 쓸린 단발, 끝이 바깥으로)
  121: { who: 'dalsae', tag: 'A', name: '한쪽으로 쓸린 단발(사진)', base: 3,
    behind(api) {
      mass(api, [15, 12, 11, 10, 10, 9, 9, 9, 9, 9, 9, 8, 8, 8, 7, 7, 6, 6, 7, 8, 11],
        mirror([14, 12, 10, 9, 8, 8, 7, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 3, 4, 6, 9]));
    },
    front({ u, hairC, hh, hd }) {
      u.spans(4, [[15, 25], [12, 27], [11, 29], [10, 30], [10, 31], [9, 31], [9, 32], [9, 32], [9, 32]], hairC, OT);
      for (let x = 12; x <= 27; x++) { const y = 7 + Math.round(((x - 19.5) / 8) ** 2 * 2); u.px(x, y, hh); }
      rows(u, hairC, [[13, 13, 28], [14, 17, 29], [15, 21, 29], [16, 24, 29], [17, 26, 29], [18, 27, 29]]);
      u.px(16, 14, hd); u.px(20, 15, hd); u.px(23, 16, hd); u.px(25, 17, hd); u.px(14, 12, hd); u.px(15, 11, hd);
    } },
  123: { who: 'dalsae', tag: 'C', name: '웨이브 단발', base: 3,
    behind(api) {
      const wave = [0, 0, 0, 0, 0, 0, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 0, 0];
      const L = BOB_L.map((a, j) => a + wave[j]);
      mass(api, L, mirror(L));
      const { u, hh } = api;
      for (const [x, y] of [[6, 20], [7, 19], [32, 20], [31, 19], [8, 16], [30, 17]]) u.px(x, y, hh);
    },
    front({ u, hairC, hd }) {
      u.spans(4, BOB_L.slice(0, 9).map((a) => [a, 39 - a]), hairC, OT);
      u.rect(19, 5, 1, 8, hd);
      rows(u, hairC, [[13, 12, 18], [13, 21, 27], [14, 12, 15], [14, 24, 27], [15, 12, 13], [15, 26, 27]]);
    } },

  // ------------------------------------------------ 선생님 (사진: 밝은 주황, 결 많은 옆머리, 앞머리가 한쪽으로 흘러내림)
  131: { who: 'teacher', tag: 'A', name: '결 많은 옆머리(사진)', base: 6,
    front({ u, H, hairC, hd, strand }) {
      H(9, 12, 2, 5); H(28, 12, 2, 6);
      u.spans(4, [[13, 21], [11, 25], [10, 27], [9, 28], [9, 29], [9, 29], [9, 29], [9, 29], [9, 29], [9, 29]], hairC, OT);
      rows(u, hairC, [[14, 12, 14]]);
      for (const [x, len] of [[19, 1], [20, 2], [21, 1], [22, 3], [23, 2], [24, 4], [25, 3], [26, 4], [27, 5], [28, 3]]) { u.rect(x, 14, 1, len, hairC); u.px(x, 13 + len, hd); }
      strand(14, 6, 18, 13); strand(17, 5, 22, 13); strand(21, 5, 26, 13); strand(25, 7, 28, 12);
    } },
  133: { who: 'teacher', tag: 'C', name: '올백', base: 6,
    front({ u, H, hairC, hh, hd }) {
      u.spans(5, [[14, 25], [12, 27], [11, 28], [10, 29], [10, 29], [10, 29], [10, 29]], hairC, OT);
      H(10, 11, 3, 6, 1); H(27, 11, 3, 6, 1);
      for (const x of [13, 16, 19, 22, 25]) for (let y = 7; y <= 11; y++) u.px(x + (y < 9 ? 1 : 0), y, hd);
      u.rect(14, 6, 6, 1, hh); u.rect(12, 11, 16, 1, hd);
    } },
};
