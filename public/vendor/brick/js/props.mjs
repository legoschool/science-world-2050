// 레시피 소품 목록. 코드를 짜지 않고 "모양 + 팔레트 색"만 적으면 스타일 엔진(style.mjs)이 같은 규칙으로 그린다.
// 새 소품 추가 방법: 아래에 항목을 하나 더 적는다. 좌표는 도트 칸, 캔버스 가장자리는 1칸 비운다(윤곽선 자리).
// 색 이름: style.mjs PALETTE(예: 'wood', 'red+1' 밝게, 'red-1' 어둡게)
import { renderRecipe } from './style.mjs';

export const PROPS = {
  // ---------------- 요청서 C02: 시간 문과 통신 태블릿 (프롤로그, P0)
  // 시간 문은 이야기 장치(판타지)다. 실제 과학 장치처럼 설명하지 않는다.
  timeDoor: { name: '시간 문', cat: '이야기 장치', requestId: 'C02', gameIds: ['PROLOGUE'], w: 66, h: 88, anchor: { x: 33, y: 86 }, shadow: { rx: 28, ry: 4 },
    collision: { x: 5, y: 78, w: 56, h: 8 }, attach: { doorCenter: { x: 33, y: 50 } },
    parts: [
      { s: 'box', x: 4, y: 79, w: 58, h: 7, c: 'stone', r: 1 },
      { s: 'ell', x: 6, y: 2, w: 54, h: 34, c: 'stone' },
      { s: 'box', x: 6, y: 18, w: 11, h: 62, c: 'stone' }, { s: 'box', x: 49, y: 18, w: 11, h: 62, c: 'stone' },
      { s: 'ell', x: 17, y: 12, w: 32, h: 26, c: 'navy-2', flat: true }, { s: 'rect', x: 17, y: 25, w: 32, h: 55, c: 'navy-2' },
      // 닫힌 문짝(tag leaves)
      { tag: 'leaves', s: 'ell', x: 17, y: 12, w: 32, h: 26, c: 'darkwood' },
      { tag: 'leaves', s: 'box', x: 17, y: 25, w: 16, h: 55, c: 'darkwood' }, { tag: 'leaves', s: 'box', x: 33, y: 25, w: 16, h: 55, c: 'darkwood' },
      { tag: 'leaves', s: 'rect', x: 20, y: 40, w: 10, h: 1, c: 'darkwood-1' }, { tag: 'leaves', s: 'rect', x: 36, y: 40, w: 10, h: 1, c: 'darkwood-1' },
      { tag: 'leaves', s: 'rect', x: 20, y: 62, w: 10, h: 1, c: 'darkwood-1' }, { tag: 'leaves', s: 'rect', x: 36, y: 62, w: 10, h: 1, c: 'darkwood-1' },
      { tag: 'leaves', s: 'box', x: 29, y: 50, w: 3, h: 5, c: 'gold', flat: true }, { tag: 'leaves', s: 'box', x: 34, y: 50, w: 3, h: 5, c: 'gold', flat: true },
      // 준비: 문틈으로 새는 빛(tag gap)
      { tag: 'gap', s: 'rect', x: 32, y: 14, w: 2, h: 66, c: 'sky+2' },
      // 열림: 소용돌이 통로(tag portal)
      { tag: 'portal', s: 'ell', x: 17, y: 12, w: 32, h: 26, c: 'teal', flat: true }, { tag: 'portal', s: 'rect', x: 17, y: 25, w: 32, h: 55, c: 'teal' },
      { tag: 'portal', s: 'ell', x: 21, y: 22, w: 24, h: 40, c: 'teal+1', flat: true },
      { tag: 'portal', s: 'ell', x: 26, y: 32, w: 14, h: 24, c: 'sky+1', flat: true },
      { tag: 'portal', s: 'ell', x: 30, y: 40, w: 6, h: 10, c: 'paper', flat: true },
      { tag: 'portal', s: 'px', pts: [[22, 30], [42, 36], [24, 58], [41, 64], [30, 70], [37, 22]], c: 'paper' },
      // 기둥의 문양(tag runes): 꺼짐은 어두운 돌색, 켜지면 하늘색
      { tag: 'runes', s: 'rect', x: 10, y: 30, w: 3, h: 3, c: 'stone-2' }, { tag: 'runes', s: 'rect', x: 10, y: 44, w: 3, h: 3, c: 'stone-2' }, { tag: 'runes', s: 'rect', x: 10, y: 58, w: 3, h: 3, c: 'stone-2' },
      { tag: 'runes', s: 'rect', x: 53, y: 30, w: 3, h: 3, c: 'stone-2' }, { tag: 'runes', s: 'rect', x: 53, y: 44, w: 3, h: 3, c: 'stone-2' }, { tag: 'runes', s: 'rect', x: 53, y: 58, w: 3, h: 3, c: 'stone-2' },
      { s: 'box', x: 29, y: 2, w: 8, h: 8, c: 'gold', r: 1 },
      { tag: 'runes', s: 'rect', x: 31, y: 4, w: 4, h: 4, c: 'stone-2' },
    ],
    near: [[130, 'ready'], [70, 'open']], // 게임에서 플레이어와의 거리(월드 px)에 따라 상태가 바뀐다
    states: {
      closed: { hide: ['portal', 'gap'] },
      ready: { hide: ['portal'], recolor: { runes: 'sky+1' } },
      open: { hide: ['leaves', 'gap'], recolor: { runes: 'sky+2' } },
    },
    layers: { // 발광은 배경과 분리(게임에서 밝게 더해 그리기)
      glow: { blend: 'add', outline: false, parts: [
        { s: 'rect', x: 15, y: 24, w: 1, h: 56, c: 'sky+2' }, { s: 'rect', x: 50, y: 24, w: 1, h: 56, c: 'sky+2' },
        { s: 'px', pts: [[18, 12], [22, 9], [28, 7], [33, 6], [38, 7], [44, 9], [48, 12]], c: 'sky+2' },
      ], states: { closed: false } },
    },
  },
  tablet: { name: '통신 태블릿', cat: '이야기 장치', requestId: 'C02', gameIds: ['PROLOGUE'], w: 36, h: 32, anchor: { x: 18, y: 31 }, shadow: { rx: 14 },
    attach: { screenCenter: { x: 18, y: 12 } },
    parts: [
      { s: 'box', x: 10, y: 24, w: 16, h: 6, c: 'gray', r: 1 },
      { s: 'box', x: 16, y: 19, w: 4, h: 6, c: 'gray-1' },
      { s: 'box', x: 3, y: 2, w: 30, h: 20, c: 'black', r: 2 },
      { tag: 'screen', s: 'rect', x: 6, y: 5, w: 24, h: 14, c: 'navy' },
      { tag: 'idle', s: 'rect', x: 17, y: 11, w: 2, h: 2, c: 'navy+2' },
      { tag: 'signal', s: 'ell', x: 13, y: 6, w: 10, h: 10, c: 'sky+1', flat: true },
      { tag: 'signal', s: 'ell', x: 15, y: 8, w: 6, h: 6, c: 'teal', flat: true },
      { tag: 'signal', s: 'rect', x: 17, y: 9, w: 2, h: 3, c: 'paper' }, { tag: 'signal', s: 'px', pts: [[17, 13], [18, 13]], c: 'paper' },
      { tag: 'signal', s: 'px', pts: [[9, 8], [8, 10], [9, 12], [27, 8], [28, 10], [27, 12]], c: 'sky+2' },
      { s: 'px', pts: [[18, 20]], c: 'gray+1' },
    ],
    near: [[70, 'receiving']],
    states: {
      idle: { hide: ['signal'] },
      receiving: { hide: ['idle'], recolor: { screen: 'teal-1' } },
    },
  },
  // ---------------- 과학
  beaker: { name: '비커', cat: '과학', w: 22, h: 28, anchor: { x: 11, y: 27 }, shadow: { rx: 9 }, parts: [
    { s: 'box', x: 3, y: 6, w: 16, h: 20, c: 'sky+1', r: 2 },
    { s: 'box', x: 4, y: 14, w: 14, h: 11, c: 'lime', r: 1 },
    { s: 'rect', x: 4, y: 14, w: 14, h: 1, c: 'lime+2' },
    { s: 'box', x: 2, y: 4, w: 18, h: 3, c: 'paper', r: 1 },
    { s: 'rect', x: 5, y: 8, w: 4, h: 1, c: 'sky-2' }, { s: 'rect', x: 5, y: 11, w: 3, h: 1, c: 'sky-2' },
    { s: 'rect', x: 15, y: 8, w: 1, h: 14, c: 'paper' },
    { s: 'px', pts: [[8, 18], [11, 16], [13, 20], [9, 21]], c: 'paper' },
  ] },
  microscope: { name: '현미경', cat: '과학', w: 30, h: 40, anchor: { x: 15, y: 39 }, parts: [
    { s: 'box', x: 4, y: 33, w: 22, h: 5, c: 'navy', r: 1 },
    { s: 'box', x: 17, y: 12, w: 5, h: 22, c: 'navy', r: 1 },
    { s: 'box', x: 5, y: 24, w: 15, h: 3, c: 'gray' },
    { s: 'rect', x: 8, y: 23, w: 10, h: 1, c: 'sky' },
    { s: 'box', x: 9, y: 5, w: 7, h: 17, c: 'silver', r: 1 },
    { s: 'box', x: 8, y: 1, w: 9, h: 5, c: 'black', r: 1 },
    { s: 'box', x: 10, y: 20, w: 5, h: 4, c: 'black' },
    { s: 'ell', x: 20, y: 17, w: 7, h: 7, c: 'gray' },
  ] },
  globe: { name: '지구본', cat: '과학', w: 28, h: 38, anchor: { x: 14, y: 37 }, shadow: { rx: 9 }, parts: [
    { s: 'ell', x: 6, y: 31, w: 16, h: 6, c: 'wood' },
    { s: 'box', x: 13, y: 25, w: 3, h: 8, c: 'darkwood' },
    { s: 'ell', x: 3, y: 3, w: 22, h: 22, c: 'water' },
    { s: 'ell', x: 7, y: 6, w: 7, h: 5, c: 'water+2', flat: true },
    { s: 'rect', x: 7, y: 9, w: 5, h: 4, c: 'leaf' }, { s: 'rect', x: 9, y: 13, w: 3, h: 5, c: 'leaf' },
    { s: 'rect', x: 15, y: 13, w: 5, h: 4, c: 'leaf' }, { s: 'rect', x: 16, y: 8, w: 3, h: 2, c: 'leaf' },
    { s: 'px', pts: [[14, 1], [14, 2], [14, 25]], c: 'gold' },
  ] },
  robot: { name: '로봇', cat: '과학', w: 32, h: 46, anchor: { x: 16, y: 45 }, parts: [
    { s: 'box', x: 9, y: 33, w: 5, h: 11, c: 'gray' }, { s: 'box', x: 18, y: 33, w: 5, h: 11, c: 'gray' },
    { s: 'box', x: 2, y: 19, w: 4, h: 12, c: 'gray', r: 1 }, { s: 'box', x: 26, y: 19, w: 4, h: 12, c: 'gray', r: 1 },
    { s: 'box', x: 6, y: 17, w: 20, h: 17, c: 'silver', r: 1 },
    { s: 'box', x: 10, y: 21, w: 12, h: 8, c: 'navy', r: 1 },
    { s: 'px', pts: [[12, 23]], c: 'red' }, { s: 'px', pts: [[15, 23]], c: 'lime' }, { s: 'px', pts: [[18, 23]], c: 'yellow' },
    { s: 'rect', x: 12, y: 26, w: 8, h: 1, c: 'sky' },
    { s: 'box', x: 8, y: 5, w: 16, h: 12, c: 'silver', r: 2 },
    { s: 'box', x: 11, y: 8, w: 3, h: 3, c: 'sky', flat: true }, { s: 'box', x: 18, y: 8, w: 3, h: 3, c: 'sky', flat: true },
    { s: 'rect', x: 13, y: 13, w: 6, h: 1, c: 'gray-2' },
    { s: 'line', x0: 16, y0: 1, x1: 16, y1: 4, c: 'gray-1' }, { s: 'px', pts: [[16, 1]], c: 'red' },
  ] },
  // ---------------- 교실
  locker: { name: '사물함', cat: '교실', w: 34, h: 62, anchor: { x: 17, y: 61 }, shadow: { rx: 15 }, parts: [
    { s: 'box', x: 2, y: 2, w: 30, h: 58, c: 'blue' },
    { s: 'rect', x: 16, y: 4, w: 2, h: 54, c: 'blue-2' },
    { s: 'rect', x: 5, y: 8, w: 8, h: 1, c: 'blue-2' }, { s: 'rect', x: 5, y: 11, w: 8, h: 1, c: 'blue-2' }, { s: 'rect', x: 5, y: 14, w: 8, h: 1, c: 'blue-2' },
    { s: 'rect', x: 21, y: 8, w: 8, h: 1, c: 'blue-2' }, { s: 'rect', x: 21, y: 11, w: 8, h: 1, c: 'blue-2' }, { s: 'rect', x: 21, y: 14, w: 8, h: 1, c: 'blue-2' },
    { s: 'box', x: 12, y: 28, w: 2, h: 6, c: 'silver', flat: true }, { s: 'box', x: 20, y: 28, w: 2, h: 6, c: 'silver', flat: true },
    { s: 'box', x: 5, y: 44, w: 8, h: 4, c: 'paper', flat: true }, { s: 'box', x: 21, y: 44, w: 8, h: 4, c: 'paper', flat: true },
    { s: 'rect', x: 2, y: 57, w: 30, h: 3, c: 'blue-2' },
  ] },
  trashbin: { name: '분리수거함', cat: '교실', w: 24, h: 30, anchor: { x: 12, y: 29 }, shadow: { rx: 10 }, parts: [
    { s: 'box', x: 3, y: 8, w: 18, h: 20, c: 'green', r: 1 },
    { s: 'rect', x: 7, y: 11, w: 1, h: 14, c: 'green-1' }, { s: 'rect', x: 11, y: 11, w: 1, h: 14, c: 'green-1' }, { s: 'rect', x: 15, y: 11, w: 1, h: 14, c: 'green-1' },
    { s: 'box', x: 2, y: 4, w: 20, h: 5, c: 'green+1', r: 1 },
    { s: 'box', x: 9, y: 2, w: 6, h: 3, c: 'green-1', r: 1 },
    { s: 'px', pts: [[11, 16], [12, 16], [10, 17], [13, 17], [11, 19], [12, 19], [10, 18], [13, 18]], c: 'paper' },
  ] },
  bookstack: { name: '책 더미', cat: '교실', w: 30, h: 24, anchor: { x: 15, y: 23 }, shadow: { rx: 13 }, parts: [
    { s: 'box', x: 2, y: 17, w: 26, h: 5, c: 'red' }, { s: 'rect', x: 24, y: 18, w: 3, h: 3, c: 'paper' },
    { s: 'box', x: 4, y: 12, w: 23, h: 5, c: 'blue' }, { s: 'rect', x: 23, y: 13, w: 3, h: 3, c: 'paper' },
    { s: 'box', x: 3, y: 7, w: 22, h: 5, c: 'yellow' }, { s: 'rect', x: 21, y: 8, w: 3, h: 3, c: 'paper' },
    { s: 'box', x: 6, y: 2, w: 18, h: 5, c: 'green' }, { s: 'rect', x: 20, y: 3, w: 3, h: 3, c: 'paper' },
    { s: 'rect', x: 5, y: 19, w: 6, h: 1, c: 'gold' }, { s: 'rect', x: 7, y: 14, w: 6, h: 1, c: 'gold' },
  ] },
  // ---------------- 자연
  rock: { name: '바위', cat: '자연', w: 30, h: 22, anchor: { x: 15, y: 21 }, shadow: { rx: 13 }, parts: [
    { s: 'ell', x: 2, y: 5, w: 26, h: 16, c: 'stone' },
    { s: 'ell', x: 6, y: 2, w: 14, h: 10, c: 'stone+1' },
    { s: 'line', x0: 14, y0: 9, x1: 18, y1: 15, c: 'stone-2' }, { s: 'line', x0: 18, y0: 15, x1: 22, y1: 16, c: 'stone-2' },
    { s: 'px', pts: [[7, 14], [8, 14], [8, 15], [21, 8], [22, 8]], c: 'leaf' },
  ] },
  mushroom: { name: '버섯', cat: '자연', w: 22, h: 26, anchor: { x: 11, y: 25 }, shadow: { rx: 7 }, parts: [
    { s: 'box', x: 8, y: 13, w: 7, h: 12, c: 'cream', r: 1 },
    { s: 'ell', x: 1, y: 2, w: 20, h: 13, c: 'red' },
    { s: 'rect', x: 4, y: 13, w: 14, h: 1, c: 'cream-1' },
    { s: 'ell', x: 5, y: 4, w: 4, h: 3, c: 'white', flat: true }, { s: 'ell', x: 12, y: 3, w: 3, h: 3, c: 'white', flat: true },
    { s: 'ell', x: 14, y: 8, w: 4, h: 3, c: 'white', flat: true }, { s: 'ell', x: 3, y: 9, w: 3, h: 2, c: 'white', flat: true },
  ] },
  sunflower: { name: '해바라기', cat: '자연', w: 24, h: 46, anchor: { x: 12, y: 45 }, shadow: { rx: 6 }, parts: [
    { s: 'box', x: 11, y: 19, w: 3, h: 26, c: 'green' },
    { s: 'ell', x: 3, y: 27, w: 9, h: 5, c: 'leaf' }, { s: 'ell', x: 13, y: 32, w: 9, h: 5, c: 'leaf' },
    { s: 'ell', x: 1, y: 1, w: 22, h: 21, c: 'yellow' },
    { s: 'ell', x: 7, y: 7, w: 10, h: 9, c: 'darkwood' },
    { s: 'px', pts: [[9, 9], [12, 10], [14, 12], [10, 13]], c: 'wood' },
  ] },
  stump: { name: '그루터기', cat: '자연', w: 30, h: 24, anchor: { x: 15, y: 23 }, shadow: { rx: 13 }, parts: [
    { s: 'rect', x: 1, y: 19, w: 5, h: 3, c: 'darkwood' }, { s: 'rect', x: 24, y: 19, w: 5, h: 3, c: 'darkwood' },
    { s: 'box', x: 3, y: 8, w: 24, h: 14, c: 'darkwood', r: 1 },
    { s: 'ell', x: 3, y: 3, w: 24, h: 10, c: 'wood+1' },
    { s: 'ell', x: 8, y: 5, w: 14, h: 6, c: 'wood', flat: true }, { s: 'ell', x: 12, y: 7, w: 6, h: 2, c: 'wood-1', flat: true },
    { s: 'rect', x: 8, y: 13, w: 1, h: 7, c: 'darkwood-1' }, { s: 'rect', x: 19, y: 12, w: 1, h: 8, c: 'darkwood-1' },
  ] },
  // ---------------- 놀이
  ball: { name: '공', cat: '놀이', w: 20, h: 20, anchor: { x: 10, y: 19 }, shadow: { rx: 7 }, parts: [
    { s: 'ell', x: 2, y: 2, w: 16, h: 16, c: 'red' },
    { s: 'rect', x: 3, y: 9, w: 14, h: 2, c: 'white' },
    { s: 'px', pts: [[6, 5], [7, 5], [6, 6]], c: 'red+2' },
  ] },
  bricktower: { name: '브릭 탑', cat: '놀이', w: 38, h: 48, anchor: { x: 19, y: 47 }, shadow: { rx: 16 }, parts: [
    { s: 'brick', x: 3, y: 31, w: 32, c: 'red' },
    { s: 'brick', x: 7, y: 17, w: 24, c: 'blue' },
    { s: 'brick', x: 11, y: 3, w: 16, c: 'yellow' },
  ] },
};

const cache = new Map();
export function getPropSprite(id, state) {
  const key = `${id}|${state ?? ''}`;
  let s = cache.get(key);
  if (!s) { s = renderRecipe(PROPS[id], state); cache.set(key, s); }
  return s;
}
