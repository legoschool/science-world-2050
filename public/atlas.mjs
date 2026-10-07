import {openTeaching} from './teaching-ui.mjs';
import {paintTundraPortal} from './mission-tundra.mjs';
// 탐험 지도: 중앙 광장(넓은 지도 + 이야기), 다섯 지구, 지구 안 구역.
// 좌표는 월드 픽셀이다. 중앙 광장은 1920×1280, 지구와 구역은 960×960(아래쪽 3분의 1은 주민 마을)이고 카메라가 학생을 따라간다.
// 교사가 배치한 자료 물체와 기존 장소 좌표는 960×640 기준이며, 중앙 광장에서는 HUB_OFFSET만큼 옮겨 광장 한가운데에 놓는다.
import {paintPlacement} from './placement-art.mjs';
import {openResources} from './resources.mjs';
import {buildSceneGround, getSceneSprite, getBuildingSprite, drawGlow, drawWire, THEMES} from './scene-kit.mjs';
import {getAvatarSheet, FW, FH, ANCHOR, frameFor, getPortrait, playerAvatar, drawFrame} from './sprites.mjs';
import {DEFAULT_NPCS, STORY_ITEMS, QUEST_REWARDS, PICKUPS, REPAIR} from './npcs.mjs';
import {openRepair} from './repair.mjs';
import {QUESTS, questSteps, SIDE_QUESTS, MISSIONS, loadMissions} from './quests.mjs';
import {loadSheet} from './npc-sheets.mjs';
import {holdButtons, typingMs, READ_MS} from './read-gate.mjs';
import {sfx, music} from './sound.mjs';
import {drawPet} from './wardrobe.mjs';
import {playerWear} from './sprites.mjs';
import {createTogether, loadClassGoal, drawTower, GOAL_STEPS} from './together.mjs';
import {drawChuck, DUEL_OF} from './chuck.mjs';
import {loadField, loadWorldExtra, REGION_CODE, fieldEntry, stateOf, fieldReady, fieldProgress, residentAvatar, drawFieldObject, drawFieldItem, SEE_FAR, SEE_NEAR} from './field.mjs';

const regions = await (await fetch('/regions.json')).json();
const VW = 960, VH = 540, T = 32, CELL = 16; // 화면은 16:9. 지도가 화면보다 크면 카메라가 학생을 따라간다
const SLOT4 = [[160, 240], [480, 175], [800, 240], [480, 420]];
// 척척 지구 단말 자리(지구 지도마다 도우미, 주민, 숨은 물건, 장식과 겹치지 않는 큰길 가)
const CHUCK_AT = {farm: [210, 625], fire: [210, 625], power: [210, 625], future: [210, 625], life: [210, 625]};
const SLOT6 = [[160, 210], [480, 175], [800, 210], [160, 410], [480, 410], [800, 410]];
const HUB_OFFSET = {x: 480, y: 320};
const HUB_LINKS = [{title: '햇살 농장 지구', map: 'farm'}, {title: '미래 연구 본부', map: 'future'}, {title: '전력망 지구', map: 'power'}, {title: '불꽃 에너지 지구', map: 'fire'}, {title: '푸른 생활 지구', map: 'life'}];
const NARRATOR = {name: '이야기'};
// 대화할 때 말풍선 위에 크게 뜨는 인물 일러스트
const CUTIN = {comji: '/assets/portraits/comji.png', dalsae: '/assets/portraits/dalsae.png', elm: '/assets/portraits/elm.png', dodam: '/assets/portraits/dodam.png', mystery: '/assets/portraits/mystery.png'};
const CUTIN_BY_NAME = {'컴지': 'comji', '달새': 'dalsae', '엘엠': 'elm', '신항이': 'dodam', '미스터리': 'mystery'};
// NPC는 그림 파일로 받은 걷기 시트(sprite)를 쓴다. 파일이 없거나 교사가 외형을 바꾸면 조립 캐릭터로 그린다.
const spriteUrl = (n) => (n.sprite ? '/assets/sprites/' + n.sprite + '.png' : null);
function cutinFor(who) { const k = who.helper || (who.story ? 'dodam' : who.mentor ? 'mystery' : null) || CUTIN_BY_NAME[who.name]; return k ? CUTIN[k] : null; }
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 도우미가 지금 추적 중인 의뢰에 맞춰 덧붙이는 말
const HINTS = {
  'R3-G04': {comji: '관리실 실험에서는 전구 규격은 같게, 전지 수만 다르게 해야 공정한 비교예요.', dalsae: '예상과 관찰을 따로 적어 둬요. 예상이 틀려도 괜찮아요.', elm: '관리실은 전력망 지구의 "전지와 불빛" 구역에 있어요. 동쪽 문으로 가요.'},
  'R3-G05': {comji: '같은 전동기, 같은 버저인지 먼저 확인해요. 그래야 전지 수 때문에 달라졌다고 말할 수 있어요.', dalsae: '회전 빠르기와 소리 크기를 각각 기록해 둬요.', elm: '정비소는 "전지와 불빛" 구역의 가린 회로 추리 장소예요.'},
  'R3-G06': {comji: '에나멜선은 감긴 부분의 피복은 그대로 두고, 양 끝만 벗겨야 전기가 통해요.', dalsae: '스위치를 닫았을 때와 열었을 때를 둘 다 적어야 비교가 돼요.', elm: '전자석 공방은 전력망 지구의 "전자석 부두" 구역에 있어요.'},
  'R3-G07': {comji: '스위치를 열면 전류가 끊겨서 전자석이 철을 끌어당기는 힘이 크게 약해져요.', dalsae: '붙는 정도가 얼마나 줄었는지 살펴보세요. 조금 남는 것도 그대로 기록해요.', elm: '크레인은 "전자석 부두" 구역에 있어요.'},
};
const HELPER_ITEM = {comji: STORY_ITEMS['safety-card'], dalsae: STORY_ITEMS.magnifier, elm: STORY_ITEMS.map};
const MEET_LINES = {
  comji: ['안녕하세요. 저는 실험 도우미 컴지예요. 척척이 멈춘 뒤로는 직접 실험해서 답을 찾고 있어요.', '실험에서는 바꿀 조건 하나만 바꾸고 나머지는 모두 같게 둬야 해요. 그래야 무엇 때문에 결과가 달라졌는지 알 수 있거든요.', '이 실험 안전 카드를 줄게요. 실험하다 막히면 언제든 저를 찾아와요.'],
  dalsae: ['반가워요. 저는 관찰 기록 도우미 달새예요. 척척 대신 제 눈으로 본 것을 기록하는 중이에요.', '본 것과 내 생각은 나눠서 적어야 해요. "불빛이 더 밝았다"는 관찰이고, "전지가 많아서 그렇다"는 생각이에요.', '이 돋보기를 줄게요. 작은 차이도 놓치지 말고 수첩에 남겨 주세요.'],
  elm: ['저는 길잡이 도우미 엘엠이에요. 척척 지도가 꺼진 뒤로 이 마을 길은 제가 다 외웠어요.', '이 마을 지도를 줄게요. 화면 구석 작은 지도에서 흰 점이 지금 내 위치, 노란 점이 다음 목적지예요.', '위쪽 "목적지 안내"를 누르면 그쪽으로 걸어가요. 길을 잃으면 저를 찾아와요.'],
};
const CHAPTERS = [
  {id: 'w04', quest: 'R3-G04', npc: 'mystery', lines: QUESTS['R3-G04'].wrap},
  {id: 'g04', quest: 'R3-G04', npc: 'dodam', lines: ['관리실 안내판에 불이 들어왔어요. 척척 말만 믿었으면 절대 몰랐을 거예요. 같은 전구로 전지 수만 바꿔 비교한 덕분이에요.', '관리실에서 고맙다며 전지 두 개를 보냈어요. 이걸로 광장 안내판도 고칠 수 있을 거예요.', '전구, 전선, 스위치를 모아서 안내판 앞에서 회로를 조립해 봐요. 모은 부품은 인벤토리에서 확인할 수 있어요.']},
  {id: 'w05', quest: 'R3-G05', npc: 'mystery', lines: QUESTS['R3-G05'].wrap},
  {id: 'g05', quest: 'R3-G05', npc: 'comji', from: 'R3-G05', to: 'R3-G06', lines: ['전동기 빠르기와 버저 소리까지 비교했군요. 조건을 같게 맞추는 솜씨가 늘었는걸요.', '이번엔 전기로 철을 붙였다 뗐다 하는 부두 전자석 공방에서 부탁이 왔어요.']},
  {id: 'w06', quest: 'R3-G06', npc: 'mystery', lines: QUESTS['R3-G06'].wrap},
  {id: 'g06', quest: 'R3-G06', npc: 'elm', from: 'R3-G06', to: 'R3-G07', lines: ['전자석을 직접 만들었다고요? 대단해요.', '부두 크레인이 철을 놓지 못해서 애를 먹고 있대요. 전자석 부두로 가 봐요.']},
  {id: 'w07', quest: 'R3-G07', npc: 'mystery', lines: QUESTS['R3-G07'].wrap},
  {id: 'g07', quest: 'R3-G07', npc: 'elm', lines: ['크레인이 다시 화물을 옮기기 시작했어요. 부두가 북적북적해요.', '그런데 거리 곳곳에도 전자석이 숨어 있대요. 전자석 부두 구역의 거리를 돌아보며 무엇이 보이는지 관찰 노트에 남겨 봐요.']},
];
const GATE_TEXT = {
  farm: '햇살 농장 지구로 가는 문이다. 밀밭 너머로 풍차가 천천히 돈다.',
  power: '전력망 지구로 가는 문이다. 항구 쪽 불빛이 드문드문하다.',
  fire: '불꽃 에너지 지구로 가는 문이다. 시장의 북적이는 소리가 들린다.',
  future: '미래 연구 본부로 가는 문이다. 높은 탑 꼭대기에서 불빛이 깜빡인다.',
  life: '푸른 생활 지구로 가는 문이다. 언덕 위 풍력 발전기 날개가 멈춰 있다.',
};

// ---------------------------------------------------------------- 지도 만들기 도구
const grid = (w, h, ch) => Array.from({length: h}, () => Array(w).fill(ch));
function fill(g, x0, y0, x1, y1, ch) { for (let y = Math.max(0, y0); y <= Math.min(g.length - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(g[0].length - 1, x1); x++) g[y][x] = ch; }
function blob(g, cx, cy, rx, ry, ch) { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && g[y]?.[x] !== undefined) g[y][x] = ch; }
function scene(id, W, H, base) { return {id, W, H, g: grid(W / T, H / T, base), items: [], targets: [], poles: [], lamps: []}; }
function put(S, kind, variant, x, y, extra = {}) {
  const s = getSceneSprite(kind, variant);
  if (!s?.c) return null;
  const item = {s, x, y, kind, variant, ...extra};
  S.items.push(item);
  if (kind === 'power-pole') S.poles.push({x: x + (s.wireTop?.x ?? 0), y: y + (s.wireTop?.y ?? -58)});
  if (kind === 'lamp' || kind === 'lantern-post') S.lamps.push({x, y: y - (s.h ? s.h * 0.85 : 50), on: variant === 'on' || kind === 'lantern-post'});
  return item;
}
function house(S, opts, x, y, target) {
  const s = getBuildingSprite(opts);
  const item = {s, x, y, kind: 'building', target};
  S.items.push(item);
  if (target) { target.x = x; target.y = y; target.sprite = s; target.approach ??= {x: x + (s.door?.x ?? 0), y: y + Math.max(22, s.door?.y ?? 22)}; S.targets.push(target); }
  return item;
}
const DECALS = new Set(['flowers', 'grass-tuft', 'lily']);
function blocksOf(item) {
  const s = item.s, list = s.blocks || (s.block ? [s.block] : []);
  return list.map((b) => ({x: item.x + b.x, y: item.y + b.y, w: b.w, h: b.h}));
}
const GATE_PILLARS = [{x: -80, y: -22, w: 26, h: 22}, {x: 54, y: -22, w: 26, h: 22}];

function styleFor(key, title, i) {
  const rules = [['등대', 'observatory'], ['탐험관', 'library'], ['상담소', 'office'], ['에너지관', 'lab'], ['모델하우스', 'house'], ['목장 자원', 'warehouse'], ['목장', 'barn'], ['관측소', 'observatory'], ['전망대', 'observatory'], ['공방', 'workshop'], ['정비', 'workshop'], ['제작소', 'workshop'], ['대장간', 'workshop'], ['창고', 'warehouse'], ['크레인', 'warehouse'], ['부두', 'warehouse'], ['도서관', 'library'], ['신문', 'office'], ['방송', 'office'], ['관리실', 'office'], ['아파트', 'house'], ['집', 'house'], ['온실', 'barn'], ['텃밭', 'barn'], ['농사', 'barn'], ['서버', 'lab'], ['관제', 'lab'], ['연구', 'lab'], ['학교', 'school'], ['교실', 'school'], ['과학실', 'school'], ['운동장', 'school'], ['시장', 'shop'], ['양초', 'shop'], ['치즈', 'shop'], ['박람회', 'shop'], ['명함', 'office'], ['회의', 'office'], ['열차', 'lab'], ['신호', 'lab'], ['광장', 'office'], ['농장', 'barn'], ['계절', 'barn'], ['해시계', 'observatory'], ['불꽃', 'workshop'], ['연소', 'workshop'], ['바닷가', 'warehouse'], ['전지', 'office'], ['전자석', 'workshop'], ['생활', 'house'], ['직업', 'shop'], ['시민', 'lab'], ['시간', 'observatory']];
  const hit = rules.find(([k]) => title.includes(k));
  if (hit) return hit[1];
  return ({farm: ['barn', 'house', 'observatory', 'shop'], fire: ['shop', 'workshop', 'house', 'warehouse'], power: ['warehouse', 'workshop', 'office', 'lab'], future: ['lab', 'observatory', 'office', 'library'], life: ['lab', 'workshop', 'barn', 'house']}[key] || ['house'])[i % 4];
}
const SIGN = {farm: 'leaf', fire: 'flame', power: 'bolt', future: 'star', life: 'heart'};
// 지도 가장자리를 나무로 둘러 걸어갈 수 있는 곳의 끝을 보이게 한다. skip은 길이 지나가는 구간.
function edge(S, axis, fixed, from, to, step, skips, variants = ['pine', 'oak']) {
  let n = 0;
  for (let v = from; v <= to; v += step) {
    if (skips.some(([a, b]) => v >= a && v <= b)) continue;
    const [x, y] = axis === 'x' ? [v, fixed] : [fixed, v];
    put(S, 'tree', variants[n++ % variants.length], x, y);
  }
}

// ---------------------------------------------------------------- 중앙 광장
function buildHub(ctx) {
  const S = scene('hub-v2', 1920, 1280, 'g'), g = S.g;
  fill(g, 1, 1, 13, 8, 'G'); fill(g, 1, 24, 15, 38, 'G'); fill(g, 44, 26, 52, 38, 'G');
  fill(g, 16, 12, 43, 30, 'P');
  fill(g, 29, 0, 31, 11, 'p'); fill(g, 26, 0, 34, 4, 'm');
  fill(g, 29, 31, 31, 39, 'h'); fill(g, 25, 34, 35, 39, 'h');
  fill(g, 0, 19, 15, 21, 'p');
  fill(g, 44, 19, 55, 21, 'x');
  fill(g, 54, 0, 55, 39, 's'); fill(g, 56, 0, 59, 39, 'w'); fill(g, 54, 19, 55, 21, 'x'); fill(g, 56, 19, 59, 21, 'k');
  fill(g, 3, 12, 11, 16, 'd');
  fill(g, 44, 28, 51, 30, 'p'); fill(g, 49, 30, 51, 39, 'p'); // 남동쪽 푸른 생활 지구 문으로 가는 길
  blob(g, 8, 31, 4, 3, 'w');
  edge(S, 'x', 36, 30, 1740, 64, [[860, 1060]]);
  edge(S, 'y', 22, 110, 1240, 64, [[560, 730]]);
  edge(S, 'x', 1276, 30, 1720, 64, [[740, 1180], [1530, 1710]], ['oak', 'autumn']);

  // 광장 가운데 (옛 좌표 슬롯 자리와 겹치게 놓아 교사 배치 규칙을 그대로 쓴다)
  house(S, {w: 200, style: 'school', sign: 'clock'}, 960, 470, {id: 'school', title: '우리 학교', school: true});
  house(S, {w: 170, style: 'workshop', sign: 'gear'}, 640, 545, {id: 'hq', title: '탐구대 본부', hq: true});
  house(S, {w: 170, style: 'library', sign: 'book'}, 1280, 545, {id: 'library', title: '문제 발견 도서관', library: true});
  put(S, 'fountain', null, 960, 722);
  const signOn = ctx.signOn;
  const sign = put(S, 'plaza-sign', signOn ? 'on' : 'off', 1086, 732);
  if (sign) S.targets.push({id: 'plaza-sign', title: '광장 안내판', x: 1086, y: 732, approach: {x: 1086, y: 760}, sign: true, silent: true});
  put(S, 'noticeboard', null, 560, 876);
  S.targets.push({id: 'board', title: '마을 게시판', x: 560, y: 876, approach: {x: 560, y: 904}, board: true});
  S.targets.push({id: 'frozen-ground-portal', title: '얼어 있는 땅 포털', x: 660, y: 830, labelY: 688, approach: {x: 660, y: 866}, healthPortal: true});
  put(S, 'statue', null, 770, 790);
  for (const [x, y] of [[720, 690], [1200, 690], [720, 940], [1200, 940], [900, 300], [1020, 300], [900, 1050], [1020, 1050], [420, 590], [420, 730], [1500, 590], [1500, 730]]) put(S, 'lamp', 'off', x, y);
  for (const [x, y] of [[830, 640], [1100, 630], [830, 1000], [1090, 1000]]) put(S, 'bench', null, x, y);
  for (const [x, y] of [[560, 700], [1360, 700]]) put(S, 'flowerbed', null, x, y);
  for (const [x, y, v] of [[530, 410, 'oak'], [1390, 410, 'oak'], [530, 990, 'blossom'], [1390, 990, 'blossom']]) put(S, 'tree', v, x, y);
  put(S, 'banner', 'farm', 540, 600); put(S, 'banner', 'power', 1380, 600); put(S, 'banner', 'future', 1050, 340); put(S, 'banner', 'fire', 880, 1020); put(S, 'banner', 'life', 1712, 980);

  // 다섯 지구로 가는 문(남동쪽은 푸른 생활 지구)
  const gates = [['future', 960, 200, {x: 960, y: 238}], ['fire', 960, 1160, {x: 960, y: 1196}], ['farm', 140, 640, {x: 140, y: 676}], ['power', 1760, 640, {x: 1760, y: 676}], ['life', 1620, 1160, {x: 1620, y: 1196}]];
  for (const [key, x, y, approach] of gates) {
    const item = put(S, 'gate', key, x, y);
    if (item && !item.s.blocks && !item.s.block) item.extraBlocks = GATE_PILLARS;
    const link = HUB_LINKS.find((l) => l.map === key);
    S.targets.push({...link, id: 'gate-' + key, gate: key, x, y, approach, labelY: y - 150});
  }

  // 서쪽: 농장 쪽 밭과 풍차
  put(S, 'windmill', null, 150, 336);
  for (let ty = 12; ty <= 16; ty++) for (let tx = 3; tx <= 11; tx++) put(S, 'crops', ['wheat', 'cabbage', 'sprout', 'corn', 'wheat'][ty - 12], tx * 32 + 16, ty * 32 + 28);
  for (let tx = 3; tx <= 11; tx++) { put(S, 'fence-h', null, tx * 32 + 16, 380); if (tx !== 7) put(S, 'fence-h', null, tx * 32 + 16, 552); }
  put(S, 'scarecrow', null, 250, 470); put(S, 'haystack', null, 450, 520);
  for (const [x, y, v] of [[70, 70, 'pine'], [210, 60, 'oak'], [340, 110, 'oak'], [120, 230, 'pine'], [440, 60, 'pine'], [480, 210, 'oak'], [300, 250, 'blossom'], [60, 480, 'oak']]) put(S, 'tree', v, x, y);
  // 북쪽: 연구 본부 쪽
  put(S, 'crystal', null, 830, 170); put(S, 'crystal', null, 1090, 150); put(S, 'radar-dish', null, 1300, 230); put(S, 'observation-tower', null, 650, 240); put(S, 'holo-board', null, 1180, 300);
  for (const [x, y, v] of [[760, 90, 'pine'], [1200, 90, 'pine'], [1380, 120, 'oak']]) put(S, 'tree', v, x, y);
  // 동쪽: 전력망 쪽 태양광판·전봇대·항구
  for (const [x, y] of [[1480, 300], [1570, 300], [1660, 300], [1480, 390], [1570, 390], [1660, 390]]) put(S, 'solar-panel', null, x, y);
  put(S, 'transformer', null, 1680, 520);
  for (const x of [1300, 1440, 1600, 1712]) put(S, 'power-pole', null, x, 598);
  put(S, 'boat', null, 1870, 430); put(S, 'lighthouse', null, 1866, 1140);
  for (const y of [200, 420, 860, 1000]) put(S, 'reeds', null, 1745, y);
  put(S, 'bollard', null, 1800, 606); put(S, 'bollard', null, 1880, 606);
  // 남쪽: 불꽃 지구 쪽 시장
  put(S, 'stall', 'red', 810, 1100); put(S, 'stall', 'blue', 1110, 1090); put(S, 'stall', 'green', 760, 1230); put(S, 'stall', 'yellow', 1170, 1236);
  put(S, 'barrel', null, 690, 1130); put(S, 'barrel', null, 1236, 1130); put(S, 'crates', null, 1250, 1180);
  // 남서쪽: 연못과 들꽃
  for (const [x, y] of [[235, 990], [295, 1012]]) put(S, 'lily', null, x, y);
  for (const [x, y] of [[140, 960], [380, 1000], [260, 1086]]) put(S, 'reeds', null, x, y);
  for (const [x, y, v] of [[80, 820, 'autumn'], [430, 860, 'autumn'], [100, 1190, 'autumn'], [460, 1200, 'oak'], [300, 1240, 'autumn']]) put(S, 'tree', v, x, y);
  for (const [x, y, v] of [[200, 880, 'yellow'], [520, 1120, 'purple'], [380, 1150, 'white'], [620, 1000, 'red'], [150, 1100, 'red']]) put(S, 'flowers', v, x, y);
  put(S, 'rock', 'large', 490, 1010);
  // 남동쪽: 주민 집과 푸른 생활 지구로 가는 길
  house(S, {w: 170, style: 'house'}, 1440, 1140);
  put(S, 'well', null, 1420, 900);
  for (const [x, y, v] of [[1320, 1180, 'blossom'], [1745, 1040, 'oak'], [1560, 860, 'oak']]) put(S, 'tree', v, x, y);
  for (const [x, y, v] of [[1500, 940, 'yellow'], [1700, 880, 'white'], [1720, 1130, 'red']]) put(S, 'flowers', v, x, y);
  return S;
}

// ---------------------------------------------------------------- 지구와 구역
function buildRegion(loc, key, links, isZone, ctx) {
  const base = {farm: 'g', fire: 'g', power: 'g', future: 'G', life: 'g'}[key], road = {farm: 'p', fire: 'h', power: 'x', future: 'm', life: 'p'}[key];
  const S = scene('map-' + loc, 960, 960, base), g = S.g;
  fill(g, 13, 0, 16, 19, road); fill(g, 0, 14, 29, 17, road); fill(g, 0, 7, 29, 8, road);
  if (key === 'farm') { fill(g, 0, 0, 29, 2, 'G'); if (!isZone) fill(g, 19, 11, 28, 12, 'd'); }
  if (key === 'fire') { fill(g, 10, 12, 19, 19, 'h'); fill(g, 26, 0, 27, 29, 's'); fill(g, 28, 0, 29, 29, 'w'); }
  if (key === 'power') { fill(g, 17, 9, 26, 13, 'x'); fill(g, 27, 0, 29, 29, 'w'); fill(g, 26, 14, 29, 17, 'k'); }
  // 아래쪽 주민 마을: 큰길에서 내려오는 길, 마을 길(21~22줄), 과학 안내판으로 가는 샛길
  const shore = key === 'fire' ? 25 : key === 'power' ? 26 : 29;
  fill(g, 13, 18, 16, 22, road); fill(g, 0, 21, shore, 22, road); fill(g, 14, 23, 15, 26, road);
  if (key === 'future') fill(g, 17, 9, 26, 13, 'm');

  edge(S, 'x', 34, 30, 930, 64, [[390, 570]]);
  edge(S, 'y', 20, 110, 420, 64, [[205, 300]]);
  edge(S, 'y', 20, 650, 930, 64, [[660, 750]]);
  if (key === 'farm' || key === 'future' || key === 'life') { const v = key === 'future' ? ['blossom'] : key === 'life' ? ['oak', 'blossom'] : ['oak']; edge(S, 'y', 942, 110, 600, 64, [[205, 300], [430, 590]], v); edge(S, 'y', 942, 650, 930, 64, [[660, 750]], v); }
  const coords = links.length <= 4 ? SLOT4 : SLOT6;
  links.forEach((link, i) => {
    const [x, y] = coords[i];
    house(S, {w: 160, style: styleFor(key, link.title, i), sign: SIGN[key]}, x, y, {...link, approach: {x, y: y + 28}});
  });
  put(S, 'signpost', null, 70, 548);
  S.targets.push({title: isZone ? '지역 광장' : '중앙 학교', label: isZone ? '지역 광장으로' : '중앙 학교로', map: isZone ? key : 'hub', x: 80, y: 550, approach: {x: 80, y: 578}, back: true});
  // 주민 마을: 집 두 채와 과학 안내판. 주민은 atlas()가 world-extra.json에서 세운다(S.village 자리).
  const homes = {farm: ['house', 'barn'], fire: ['shop', 'house'], power: ['house', 'workshop'], future: ['house', 'lab'], life: ['house', 'barn']}[key];
  house(S, {w: 150, style: homes[0]}, 140, 910); house(S, {w: 150, style: homes[1]}, {power: 750, fire: 780}[key] ?? 820, 910);
  put(S, 'noticeboard', null, 480, 870);
  S.targets.push({id: 'village-board', title: '과학 안내판', x: 480, y: 870, approach: {x: 480, y: 898}, villageBoard: true});
  for (const [x, y, v] of [[250, 940, 'white'], [720, 762, 'yellow'], [250, 762, 'red']]) put(S, 'flowers', v, x, y);
  put(S, 'bush', 'green', 40, 948); if (key === 'farm' || key === 'future' || key === 'life') put(S, 'bush', 'green', 920, 948);
  S.village = [[240, 790], [720, 790]];

  if (!isZone) {
    if (key === 'farm') {
      for (let ty = 11; ty <= 12; ty++) for (let tx = 19; tx <= 28; tx++) put(S, 'crops', ty === 11 ? 'wheat' : 'cabbage', tx * 32 + 16, ty * 32 + 28);
      for (let tx = 19; tx <= 28; tx++) put(S, 'fence-h', null, tx * 32 + 16, 348);
      put(S, 'windmill', null, 650, 190); put(S, 'scarecrow', null, 770, 410); put(S, 'haystack', null, 900, 612); put(S, 'sundial', null, 300, 612); put(S, 'beehive', null, 40, 430);
      for (const [x, y, v] of [[40, 130, 'oak'], [930, 110, 'oak'], [300, 90, 'blossom'], [930, 420, 'oak'], [600, 612, 'oak']]) put(S, 'tree', v, x, y);
      for (const [x, y, v] of [[250, 470, 'yellow'], [700, 470, 'white'], [380, 600, 'red']]) put(S, 'flowers', v, x, y);
    }
    if (key === 'fire') {
      put(S, 'stall', 'red', 300, 360); put(S, 'stall', 'blue', 640, 608); put(S, 'stall', 'yellow', 760, 612);
      put(S, 'alarm-tower', null, 650, 190); put(S, 'forge', null, 64, 432); put(S, 'tent', null, 850, 612); put(S, 'firepit', 'out', 760, 470);
      put(S, 'lantern-post', null, 400, 600); put(S, 'lantern-post', null, 580, 446); put(S, 'barrel', null, 580, 250); put(S, 'crates', null, 610, 262); put(S, 'sensor-post', null, 860, 150);
      put(S, 'tree', 'palm', 850, 420);
    }
    if (key === 'power') {
      for (const x of [280, 620, 800]) put(S, 'power-pole', null, x, 446);
      put(S, 'solar-panel', null, 300, 330); put(S, 'solar-panel', null, 300, 392); put(S, 'transformer', null, 620, 612); put(S, 'cargo', null, 770, 612); put(S, 'crates', null, 540, 612);
      put(S, 'lighthouse', null, 930, 150); put(S, 'boat', null, 920, 310); put(S, 'signal-tower', ctx.signOn ? 'on' : 'off', 650, 190); put(S, 'bollard', null, 850, 460);
    }
    if (key === 'future') {
      put(S, 'wind-turbine', null, 650, 190); put(S, 'crystal', null, 300, 350); put(S, 'crystal', null, 620, 612); put(S, 'holo-board', null, 770, 606);
      put(S, 'radar-dish', null, 60, 432); put(S, 'robot-helper', null, 560, 470); put(S, 'server-tower', null, 900, 612);
      for (const [x, y] of [[40, 130], [930, 110]]) put(S, 'tree', 'blossom', x, y);
    }
    if (key === 'life') {
      put(S, 'wind-turbine', null, 650, 190); put(S, 'flowerbed', null, 300, 612); put(S, 'beehive', null, 40, 430); put(S, 'haystack', null, 900, 612);
      put(S, 'lamp', ctx.lifeLit ? 'on' : 'off', 580, 446); put(S, 'lamp', ctx.lifeLit ? 'on' : 'off', 400, 600); put(S, 'solar-panel', null, 760, 612); put(S, 'bench', null, 640, 612);
      for (const [x, y, v] of [[40, 130, 'oak'], [930, 110, 'blossom'], [300, 90, 'blossom']]) put(S, 'tree', v, x, y);
      for (const [x, y, v] of [[250, 470, 'red'], [700, 470, 'white']]) put(S, 'flowers', v, x, y);
      // 의뢰를 풀면 2050년 마을이 바뀐다: 재활 로봇이 다시 일하고(R5-G01), 목장 건초가 다시 쌓이고(R5-G07), 재생에너지 시설이 들어선다(R5-G08)
      if (ctx.lifeArm) put(S, 'robot-helper', null, 770, 410);
      if (ctx.lifeHay) for (const x of [840, 780]) put(S, 'haystack', null, x, 540);
      if (ctx.lifeWind) { put(S, 'wind-turbine', null, 820, 190); put(S, 'solar-panel', null, 300, 350); }
      // 몸속 탐험관의 몸속 지도 화면(R5-G02), 예방 캠페인 부스(R5-G03), 다시 켜진 등대 불빛(R5-G05), 빛 공방 앞 렌즈 가로등(R5-G06), 지붕에 창을 낸 모델하우스(R5-G09)
      if (ctx.lifeMap) put(S, 'holo-board', null, 380, 435);
      if (ctx.lifeClinic) put(S, 'stall', 'green', 130, 395);
      put(S, 'lighthouse', null, 930, 420); if (ctx.lifeBeam) S.lamps.push({x: 930, y: 290, on: true});
      if (ctx.lifeLens) { put(S, 'lantern-post', null, 395, 300); put(S, 'lantern-post', null, 565, 300); }
      if (ctx.lifeHouse) put(S, 'greenhouse', null, 300, 200);
    }
  } else {
    const kinds = {farm: [['tree', 'oak'], ['haystack'], ['scarecrow'], ['flowers', 'yellow'], ['tree', 'blossom'], ['bush', 'flower']], fire: [['stall', 'red'], ['barrel'], ['lantern-post'], ['crates'], ['stall', 'green'], ['barrel']], power: [['power-pole'], ['transformer'], ['crates'], ['solar-panel'], ['cargo'], ['bollard']], future: [['crystal'], ['holo-board'], ['robot-helper'], ['wind-turbine'], ['crystal'], ['radar-dish']], life: [['flowerbed'], ['lamp', 'off'], ['haystack'], ['solar-panel'], ['tree', 'blossom'], ['wind-turbine']]}[key];
    const spots = [[320, 112], [640, 112], [320, 300], [640, 300], [40, 132], [930, 132]];
    spots.forEach(([x, y], i) => put(S, kinds[i][0], kinds[i][0] === 'lamp' ? (ctx.lifeLit ? 'on' : 'off') : kinds[i][1], x, y));
    if (key === 'power') { fill(g, 28, 0, 29, 19, 'w'); put(S, 'boat', null, 928, 330); }
    for (const [x, y, v] of [[930, 612, 'oak'], [600, 612, 'bush']]) key === 'future' ? put(S, 'crystal', null, x, y) : put(S, v === 'bush' ? 'bush' : 'tree', v === 'bush' ? 'green' : 'oak', x, y);
  }
  return S;
}

// ---------------------------------------------------------------- 탐험 화면
const josa = (w, withB, noB) => { const code = w.charCodeAt(w.length - 1) - 0xac00; return w + (code >= 0 && code < 11172 && code % 28 ? withB : noB); };
export function atlas(host, travel, opts) {
  const {getTracked, save, enterGame, complete, logout, restart, navigate, runId, onHandoff, enterMotor, enterBuzzer, enterDeduction, enterApplication, enterInquiry, enterSummary, enterMagnet, enterCrane, enterMission, state = {}, nickname = '', editAvatar, api, record, me} = opts;
  const loc = travel.map || 'hub';
  const regionKey = loc === 'hub' ? 'hub' : regions[loc] ? loc : Object.keys(regions).find((k) => regions[k].zones.some((z) => z.id === loc));
  const region = regions[regionKey], zone = region?.zones.find((z) => z.id === loc);
  const title = loc === 'hub' ? '우리 학교 반 광장' : zone?.title || region.title;
  state.adventure ??= {welcomed: false, tracked: 'R3-G04'};
  const adv = state.adventure;
  adv.storyItems ??= [];
  state.story ??= adv.welcomed ? {step: 'done', met: {comji: true, dalsae: true, elm: true}, map: true, chapters: {}} : {step: 'arrival', met: {}, map: false, chapters: {}};
  const story = state.story;
  story.chapters ??= {};

  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const btn = (label, fn, cls = '') => { const b = make('button', cls, label); b.type = 'button'; b.onclick = fn; return b; };
  const root = make('section', 'atlas' + (loc === 'hub' ? ' atlas-hub' : '')), canvas = make('canvas');
  canvas.width = VW; canvas.height = VH; canvas.tabIndex = 0; canvas.setAttribute('aria-label', title + ' 탐험 지도. 방향키로 걷고 E 키로 말을 걸거나 조사합니다.');
  const locBadge = make('div', 'rpg-location', title);
  const speech = make('section', 'rpg-speech'); speech.hidden = true; speech.setAttribute('aria-live', 'polite');
  const mini = make('canvas', 'world-minimap'); mini.width = 180; mini.height = 120; mini.setAttribute('aria-label', '미니맵: 흰 점은 내 위치, 노란 점은 다음 목적지');
  const skip = btn('이야기 건너뛰기', () => skipStory(), 'story-skip'); skip.hidden = true;
  root.append(canvas, locBadge, mini, skip, speech);

  let cancelled = false, alive = true, raf = 0, last = performance.now(), locked = false, pending = null, path = [], keys = new Set(), dir = 'down', camX = 0, camY = 0, gateArmed = true, running = false;
  let progress = {quests: []}, npcs = [], S = null, ground = null, walkGrid = null, miniBg = null, targets = [], buttons = [];
  // 선생님이 관리 화면에서 올린 자료. 학습 장소를 고른 자료는 그 장소에 말을 걸 때 함께 연다.
  let teacherRes = [];
  // 구역 현장 활동(field.json)과 지역 이야기·주민(world-extra.json)
  let F = null, FS = null, extra = null, fieldItems = [], fieldLamps = [], fieldDecor = [], rewardShown = false;
  // 함께하기(같은 지도의 반 친구, 채팅, 함께 하는 활동)와 우리 반 복구 탑
  let tg = null, classGoal = null, towerT = null, goalTimer = 0, openField = null, coopKey = '', weeklyOn = false, thinkPending = false, chuckT = null, duelSt = null;
  const withRes = (id, options) => {
    const ids = teacherRes.filter((r) => r.gameIds?.includes(id)).map((r) => r.id);
    if (id === 'R5-G03' && enterMission) options = [...options.slice(0, -1), ['북쪽 마을 동토 탐사', () => { close(); keys.clear(); path = []; pending = null; checkpoint(); dispose(); enterMission('R5-G10'); }], options[options.length - 1]];
    options=[...options.slice(0,-1),['선생님 활동과 피드백',()=>{close();keys.clear();path=[];openTeaching({api,gameId:id,runId,uid:me.id});}],options[options.length-1]];
    return ids.length ? [...options.slice(0, -1), ['선생님 자료 보기', () => { close(); keys.clear(); path = []; openResources({resourceIds: ids}); }], options[options.length - 1]] : options;
  };
  const posKey = loc === 'hub' ? 'hub@2' : loc;
  const spawn = loc === 'hub' ? {x: 960, y: 800} : {x: 480, y: 520};
  let {x, y} = travel.positions?.[posKey] || spawn;
  const heroSheet = () => getAvatarSheet(playerAvatar());
  // 동료는 학생 뒤를 조금 늦게 따라온다
  const petPos = {x: x - 24, y: y + 4, dir: 'right'};
  let petSide = -1;
  function followPet() { if (dir === 'left') petSide = 1; else if (dir === 'right') petSide = -1; const dx = x + petSide * 26 - petPos.x, dy = y + 4 - petPos.y, d = Math.hypot(dx, dy); if (d > 1.5) { const k = d > 160 ? 1 : 0.09; petPos.x += dx * k; petPos.y += dy * k; if (Math.abs(dx) > 0.6) petPos.dir = dx < 0 ? 'left' : 'right'; } }
  music(loc === 'hub' ? 'hub' : loc.split('-')[0]);

  const introDone = () => story.step === 'done';
  const questDone = (id) => progress.quests.some((q) => q.id === id && q.status === 'completed') || (id === 'R3-G04' && complete);
  const pendingChapter = () => (loc === 'hub' && introDone() ? CHAPTERS.find((c) => questDone(c.quest) && !story.chapters[c.id] && npcs.some((n) => n.id === c.npc)) : null);
  const mentor = () => npcs.find((n) => n.id === 'mystery');
  const afterMeet = () => (mentor() ? '미스터리 선생님께 가서 첫 의뢰를 받으세요' : '신항이에게 돌아가 첫 의뢰를 받으세요');
  const hasMap = () => story.map || introDone();
  const has = (id) => (adv.storyItems || []).includes(id);
  const missingParts = () => REPAIR.needs.filter((id) => !has(id));
  const needParts = () => questDone('R3-G04') && !story.repaired;
  function repairStatusLine() { const m = missingParts(); return m.length ? `안내판을 고치려면 ${josa(m.map((id) => STORY_ITEMS[id].title).join(', '), '이', '가')} 더 필요해요. ${REPAIR.where[m[0]]}` : '부품을 모두 모았어요. 이제 회로를 조립해 봐요.'; }

  function checkpoint() { travel.map = loc; travel.positions ??= {}; travel.positions[posKey] = {x: Math.round(x), y: Math.round(y)}; save(); }
  function setHint(text) { story.hint = text; window.dispatchEvent(new Event('adventure-story')); markObjective(); }

  // ---------------------------------------------------------------- 말풍선
  let typing = null, hold = null;
  function close() { clearInterval(typing); speech.hidden = true; speech.replaceChildren(); openField = null; if (!locked) canvas.focus({preventScroll: true}); }
  function speakerBox(who, text) {
    speech.replaceChildren();
    const cut = cutinFor(who);
    if (cut) { const img = new Image(); img.className = 'speech-cutin'; img.alt = ''; img.src = cut; img.onerror = () => { img.remove(); if (who.avatar) { const p = getPortrait(who.avatar, 84); p.className = 'speech-portrait'; speech.prepend(p); } }; speech.append(img); }
    else if (who.avatar) { const p = getPortrait(who.avatar, 84); p.className = 'speech-portrait'; speech.append(p); }
    const body = make('div', 'speech-body'), head = make('div', 'speech-head');
    head.append(make('strong', '', who.name || ''));
    if (who.role) head.append(make('span', 'speech-role', who.role));
    const p = make('p');
    body.append(head, p);
    speech.append(body);
    clearInterval(typing);
    if (reduceMotion) p.textContent = text;
    else { let i = 0; typing = setInterval(() => { i += 2; p.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typing); }, 22); p.dataset.full = text; }
    speech.onclick = (e) => { if (e.target.tagName !== 'BUTTON') { const early = p.textContent.length < text.length; clearInterval(typing); p.textContent = text; if (early) hold?.restart(READ_MS); } };
    body.readMs = typingMs(text, reduceMotion) + READ_MS;
    return body;
  }
  // 여러 줄을 차례로 보여 주고 마지막 줄에서 선택지를 보인다
  function say(who, lines, options = [['계속 걷기', close]]) {
    keys.clear(); path = []; pending = null; checkpoint();
    lines = lines.filter(Boolean);
    let i = 0;
    const show = () => {
      speech.hidden = false;
      const body = speakerBox(who, lines[i]);
      const actions = make('div', 'actions');
      if (i < lines.length - 1) actions.append(btn('다음 ▶', () => { i++; show(); }));
      else { options.forEach(([label, fn]) => actions.append(btn(label, fn))); if (options.some(([label]) => label.length > 24)) actions.classList.add('long'); }
      body.append(actions);
      actions.querySelector('button').focus();
      hold = holdButtons(actions.querySelectorAll('button'), body.readMs);
      sfx('blip');
    };
    show();
  }
  const talk = (name, text, options) => say(typeof name === 'string' ? {name} : name, [text], options);
  // 이야기 장면용: 한 줄을 보여 주고 '다음'을 누를 때까지 기다린다
  const line = (who, text) => new Promise((resolve) => {
    if (cancelled) return;
    speech.hidden = false;
    const body = speakerBox(who, text), actions = make('div', 'actions');
    actions.append(btn('다음 ▶', () => { close(); resolve(); }));
    body.append(actions);
    actions.querySelector('button').focus();
    hold = holdButtons(actions.querySelectorAll('button'), body.readMs);
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, cancelled || reduceMotion ? 0 : ms));

  function banner(text, sub = '') {
    const b = make('div', 'quest-banner'); b.append(make('small', '', sub || '새 의뢰'), make('strong', '', text));
    root.append(b); setTimeout(() => b.remove(), 4200);
  }

  // ---------------------------------------------------------------- NPC
  function loadNpcs(overrides) {
    const byId = new Map(overrides.map((o) => [o.id, o]));
    const list = [];
    for (const n of DEFAULT_NPCS) {
      const o = byId.get(n.id);
      if (o && o.published === false) continue;
      const m = o ? {...n, ...o, helper: n.helper, gate: n.gate, story: n.story} : n;
      if (m.map === loc) list.push(m);
    }
    for (const o of overrides) if (!DEFAULT_NPCS.some((n) => n.id === o.id) && o.published !== false && o.map === loc && o.avatar) list.push(o);
    return list.map((n) => {
      const m = {...n, home: {x: n.x, y: n.y}, dir: 'down', walk: null, wave: 0, next: performance.now() + 2000 + Math.random() * 6000, wander: !n.helper && !n.gate && !n.story};
      const base = DEFAULT_NPCS.find((d) => d.id === n.id), url = spriteUrl(base || n);
      if (url && (!base || JSON.stringify(base.avatar) === JSON.stringify(n.avatar))) loadSheet(url).then((s) => { m.sheet = s; }).catch(() => {});
      return m;
    });
  }
  const npcById = (id) => npcs.find((n) => n.id === id);
  const sideFor = (n) => Object.entries(SIDE_QUESTS).find(([, q]) => q.npc === n.id);
  function faceTo(n) { const dx = x - n.x, dy = y - n.y; n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; }
  function walkNpc(n, tx, ty, speed = 120) {
    return new Promise((resolve) => {
      if (cancelled || reduceMotion) { n.x = tx; n.y = ty; return resolve(); }
      n.walk = {tx, ty, speed, resolve};
    });
  }
  function markerFor(n) {
    if (n.resident) return fieldMarker(n);
    const sq = sideFor(n);
    if (sq && introDone() && !story.side?.[sq[0]]) return has(sq[1].item) ? '!' : '?';
    if (loc !== 'hub') return '';
    if (!introDone()) {
      if (story.step === 'meet' && n.helper && !story.met[n.helper]) return '!';
      if (story.step === 'meet' && n.id === (mentor() ? 'mystery' : 'dodam') && ['comji', 'dalsae', 'elm'].every((k) => story.met[k])) return '!';
      return '';
    }
    const ch = pendingChapter();
    return ch && ch.npc === n.id ? '!' : n.helper === 'dalsae' && thinkPending ? '!' : '';
  }

  // ---------------------------------------------------------------- 이야기
  async function arrival() {
    locked = true; skip.hidden = false; setHint('무슨 일이 일어나는지 지켜보세요');
    const dodam = npcById('dodam'), helpers = ['comji', 'dalsae', 'elm'].map(npcById).filter(Boolean);
    const spots = helpers.map((h) => ({x: h.x, y: h.y})), me = {name: nickname || '나', avatar: playerAvatar()};
    if (dodam) { dodam.x = 1150; dodam.y = 600; dodam.hidden = true; }
    helpers.forEach((h) => { h.x = 640; h.y = 580; h.hidden = true; });
    x = spawn.x; y = spawn.y; dir = 'up';
    signState = 'off'; flash = 1;
    await line(NARRATOR, '2026년 과학 시간. 미스터리 선생님 책상 위의 낡은 돋보기를 들여다본 순간, 눈앞이 하얗게 번쩍였다.');
    for (let i = 0; i < 20 && !cancelled; i++) { flash = 1 - i / 20; await wait(45); }
    flash = 0;
    if (cancelled) return;
    await line(NARRATOR, '눈을 떠 보니 낯선 광장이었다. 꺼질 듯 말 듯 깜빡이는 안내판에 "2050년 새빛시"라는 글씨가 보였다.');
    for (let i = 0; i < 6 && !cancelled; i++) { signState = i % 2 ? 'off' : 'on'; await wait(160); }
    signState = 'off';
    await line(NARRATOR, '가로등은 꺼져 있고 거리는 조용했다. 이 마을은 모든 일을 인공지능 척척에게 맡겼다가, 척척이 고장 나자 함께 망가져 버렸다.');
    if (dodam) { dodam.hidden = false; await walkNpc(dodam, 1150, 800); await walkNpc(dodam, 1010, 800); faceTo(dodam); }
    if (cancelled) return;
    dir = 'right';
    const d = dodam || {name: '신항이'};
    await line(d, '어… 처음 보는 옷이네요? 혹시 척척이 말하던 "과거에서 온 사람"이에요? 저는 이 마을에 사는 신항이예요.');
    await line(d, '우리 마을은 척척 없이는 아무것도 못 해요. 전기가 끊기고, 계절이 뒤섞이고, 불이 제멋대로 번져요. 척척은 틀린 답만 내놓고.');
    await line(d, '척척이 그러는데 항구 안내판은 전지만 더 넣으면 된대요. 그런데… 그렇게 해도 안 켜졌어요.');
    await line(me, '짐작으로 정하지 말고 확인해 봐요. 조건을 같게 두고 하나만 바꿔서 비교하면 알 수 있어요.');
    await line(d, '확인…? 그런 건 해 본 적 없는데요. 좋아요, 우리 탐구대 친구들을 소개할게요. 컴지, 달새, 엘엠. 이리 와 보세요.');
    if (cancelled) return;
    helpers.forEach((h) => { h.hidden = false; });
    await Promise.all(helpers.map((h, i) => walkNpc(h, spots[i].x, spots[i].y, 140)));
    helpers.forEach(faceTo);
    await line(d, '머리 위에 느낌표가 떠 있는 친구들에게 말을 걸어 보세요. 모두 탐구를 도와줄 거예요.');
    if (mentor()) await line(d, '그리고 학교 앞에 미스터리 선생님이 계세요. 탐험가처럼 과거에서 오셨다는 소문이 있어요. 탐구대 의뢰는 선생님이 주세요.');
    if (cancelled) return;
    helpers.forEach((h, i) => { h.hidden = false; h.x = spots[i].x; h.y = spots[i].y; h.walk = null; });
    if (dodam) { dodam.hidden = false; dodam.x = 1010; dodam.y = 800; dodam.walk = null; }
    story.step = 'meet';
    locked = false; skip.hidden = !introDone() ? false : true;
    setHint('광장의 컴지, 달새, 엘엠에게 말을 걸어 보세요 (0/3)');
    checkpoint(); canvas.focus({preventScroll: true});
  }
  function metCount() { return ['comji', 'dalsae', 'elm'].filter((k) => story.met[k]).length; }
  function giveItem(item) { sfx('item'); adv.storyItems = adv.storyItems.filter((i) => typeof i === 'string'); if (!adv.storyItems.includes(item.id)) adv.storyItems.push(item.id); }
  function meetHelper(n) {
    faceTo(n);
    say(n, MEET_LINES[n.helper], [[`${HELPER_ITEM[n.helper].title} 받기`, () => {
      story.met[n.helper] = true; giveItem(HELPER_ITEM[n.helper]);
      if (n.helper === 'elm') { story.map = true; mini.classList.add('reveal'); }
      const count = metCount();
      setHint(count < 3 ? `광장의 컴지, 달새, 엘엠에게 말을 걸어 보세요 (${count}/3)` : afterMeet());
      checkpoint();
      talk('가방', `${josa(HELPER_ITEM[n.helper].title, '을', '를')} 받았다. 가방의 "인벤토리"에서 다시 볼 수 있다.`);
      markObjective();
    }]]);
  }
  function finishIntro() {
    for (const k of ['comji', 'dalsae', 'elm']) { story.met[k] = true; giveItem(HELPER_ITEM[k]); }
    story.map = true; story.step = 'done';
    const isNew = !adv.welcomed; adv.welcomed = true; if (isNew || !adv.tracked) adv.tracked = firstQuest().id;
    skip.hidden = true; mini.classList.add('reveal');
    setHint('');
    checkpoint();
    window.dispatchEvent(new Event('adventure-tracked'));
    markObjective();
  }
  function skipStory() {
    cancelled = true;
    const dodam = npcById('dodam');
    for (const n of npcs) { if (n.walk) { n.x = n.walk.tx; n.y = n.walk.ty; const r = n.walk.resolve; n.walk = null; r(); } n.hidden = false; n.x = n.home.x; n.y = n.home.y; }
    if (dodam) { dodam.x = 1010; dodam.y = 800; }
    signState = ctxSignOn ? 'on' : 'off'; flash = 0;
    close(); locked = false; finishIntro();
    banner(firstQuest().name, '첫 의뢰');
    canvas.focus({preventScroll: true});
  }
  function dodamTalk(n) {
    faceTo(n);
    if (story.step === 'meet') {
      if (metCount() < 3) return say(n, [`아직 만나지 못한 친구가 있어요. 느낌표가 떠 있는 친구에게 말을 걸어 보세요. (${metCount()}/3)`]);
      if (mentor()) return say(n, ['모두 만났군요. 이제 미스터리 선생님께 가요.', '탐구대 의뢰는 선생님이 정해 주세요. 학교 앞에 계세요.'], [['선생님께 가기', () => { close(); walk(npcTarget(mentor())); }], ['조금 더 둘러보기', close]]);
      return say(n, ['모두 만났군요. 이제 진짜 첫 의뢰예요.', ...firstQuest().go, '노란 표식을 따라가면 돼요. 거기서 다시 만나요.'], [['첫 의뢰 받기', () => { close(); finishIntro(); banner(firstQuest().name, '첫 의뢰'); }]]);
    }
    const ch = pendingChapter();
    if (ch && ch.npc === n.id) return chapterTalk(n, ch);
    if (needParts()) return say(n, [repairStatusLine()], [['목적지까지 걸어가기', () => { close(); routeObjective(); }], ['조금 더 둘러보기', close]]);
    const tracked = getTracked?.() || 'R3-G04';
    const text = {'R3-G04': '전력망 지구의 관리실로 가 봐요. 동쪽 문을 지나면 돼요.', 'R3-G05': '항구 정비소에서 전동기와 버저를 비교해 봐요.', 'R3-G06': '부두 전자석 공방에서 전자석을 만들어 봐요.', 'R3-G07': '크레인이 철을 놓지 못하는 까닭을 알아봐요.'}[tracked] || (MISSIONS[tracked] ? `${MISSIONS[tracked].place}에서 "${MISSIONS[tracked].quest}" 의뢰를 해결해 봐요.` : n.lines[0]);
    say(n, [text], [['목적지까지 걸어가기', () => { close(); routeObjective(); }], ['조금 더 둘러보기', close]]);
  }
  // 미스터리 선생님: 의뢰를 주고, 배울 내용과 단계를 알려 주고, 마친 뒤 정리한다
  function mentorTalk(n) {
    faceTo(n);
    const ch = pendingChapter();
    if (ch && ch.npc === n.id) return chapterTalk(n, ch);
    if (loc === 'hub' && !introDone()) {
      if (story.step !== 'meet' || metCount() < 3) return say(n, [`어서 와요. 먼저 광장의 컴지, 달새, 엘엠과 인사하고 오세요. (${metCount()}/3)`]);
      const fq = firstQuest(), q = fq.info;
      return say(n, ['어서 와요. 그 돋보기를 들여다본 탐험가군요. 저는 미스터리 선생님이에요.', '이 세상을 고칠 수 있는 건 직접 관찰하고 확인하는 사람뿐이에요. 네 지구를 하나씩 되살리다 보면 돌아갈 길도 찾을 수 있을 거예요.', `첫 의뢰는 "${fq.name}"이에요. ${fq.story}`, '이번 의뢰에서 배울 것: ' + q.goal, `할 일은 모두 ${q.steps.length}단계예요. 첫 단계는 "${q.steps[0]}". 단계마다 퀘스트 수첩에 체크가 되니 확인해 보세요.`, '막히면 컴지, 달새, 엘엠에게 물어보세요. 도움을 받아도 감점은 없어요. 자, 동쪽 문으로 출발.'], [['첫 의뢰 받기', () => { close(); finishIntro(); banner(fq.name, '첫 의뢰'); }]]);
    }
    const id = getTracked?.() || 'R3-G04', q = QUESTS[id] || MISSIONS[id];
    if (!q) return say(n, n.lines);
    const s = questSteps(id, state, {}), i = s.indexOf(false), known = id === 'R3-G04' || id === 'R3-G07' || !!MISSIONS[id];
    const next = !known ? '다음 단계는 퀘스트 수첩에서 확인해 보세요. 끝낸 단계에는 체크가 되어 있어요.' : i >= 0 ? `지금 할 단계는 ${i + 1}번, "${q.steps[i]}"이에요.` : '이 의뢰의 단계는 모두 끝냈군요. 정말 잘했어요.';
    say(n, ['지금 의뢰에서 배울 것: ' + q.goal, next, n.lines[1] || ''], [['목적지까지 걸어가기', () => { close(); routeObjective(); }], ['퀘스트 수첩 보기', () => { close(); document.querySelector('.adventure-bar .hud-quests')?.click(); }], ['알겠어요', close]]);
  }
  function chapterTalk(n, ch) {
    faceTo(n);
    say(n, ch.lines, [['알겠어요.', () => {
      story.chapters[ch.id] = true;
      if ((getTracked?.() || 'R3-G04') === ch.from) { adv.tracked = ch.to; window.dispatchEvent(new Event('adventure-tracked')); }
      checkpoint(); close(); markObjective();
    }]]);
  }
  // 인벤토리의 부품으로 광장 안내판 고치기
  function startRepair() {
    if (story.repaired) return talk(NARRATOR, '광장 안내판은 이미 환하게 켜져 있다.');
    if (!questDone('R3-G04')) return talk(NARRATOR, '안내판을 고치려면 먼저 전력망 지구 관리실에서 빛을 되찾는 방법을 알아봐야 한다.');
    keys.clear(); path = []; pending = null; checkpoint();
    openRepair({state, onSuccess: repaired, onClose: () => canvas.focus({preventScroll: true})});
  }
  function repaired() {
    story.repaired = true;
    story.used = [...new Set([...(story.used || []), ...REPAIR.needs])];
    story.chapters.repair = true;
    giveItem(STORY_ITEMS['sign-badge']);
    signState = 'on';
    if ((getTracked?.() || 'R3-G04') === 'R3-G04') { adv.tracked = 'R3-G05'; window.dispatchEvent(new Event('adventure-tracked')); }
    checkpoint();
    banner('광장 안내판 복구', '문제 해결');
    const d = npcById('dodam') || {name: '신항이'};
    setTimeout(() => { if (alive) say(d, ['광장에 불이 돌아왔어요. 모은 부품으로 직접 회로를 만들었군요. 망가졌던 세상이 조금 되살아났어요.', '광장 복구 배지는 인벤토리에 넣어 두었어요.', '항구 정비소에서도 도움을 청했어요. 전구 대신 전동기와 버저로도 같은 비교를 할 수 있을까요?'], [['다음 의뢰 받기', () => { close(); markObjective(); }]]); }, reduceMotion ? 0 : 1200);
  }
  function talkNpc(n, skipThink = false) {
    if (locked) return;
    faceTo(n);
    if (n.resident) return residentTalk(n);
    if (n.story && loc === 'hub') return dodamTalk(n);
    if (n.mentor) return mentorTalk(n);
    if (n.helper && loc === 'hub' && story.step === 'meet' && !story.met[n.helper]) return meetHelper(n);
    const ch = pendingChapter();
    if (ch && ch.npc === n.id) return chapterTalk(n, ch);
    if (n.gate && !introDone()) return say(n, ['광장의 신항이가 탐험가를 찾고 있어요. 신항이를 먼저 만나 봐요.']);
    const sq = sideFor(n);
    if (sq && introDone() && !story.side?.[sq[0]]) {
      const [k, q] = sq;
      if (!has(q.item)) return say(n, q.ask);
      return say(n, q.give, [[`${STORY_ITEMS[q.item].title} 건네주기`, () => {
        story.side = {...(story.side || {}), [k]: true};
        story.used = [...new Set([...(story.used || []), q.item])];
        checkpoint(); banner(q.title, '주민 부탁 해결');
        say(n, q.thanks, [['기뻐요.', () => { close(); markObjective(); }]]);
      }], ['조금 더 가지고 있을게요', close]]);
    }
    if (n.id === 'janitor' && introDone() && !has('wire')) return say(n, ['광장 안내판을 고쳐 보려고요? 그럼 이게 필요할 거예요.', '창고에 남아 있던 전선 묶음이에요. 양 끝 피복을 벗겨 두었으니 바로 이을 수 있어요.'], [['전선 묶음 받기', () => { giveItem(STORY_ITEMS.wire); checkpoint(); talk('가방', '전선 묶음을 받았다. 가방의 "인벤토리"에서 다시 볼 수 있다.'); markObjective(); }]]);
    if (n.helper === 'dalsae' && !skipThink && introDone() && api && record && me && !me.guest) return dalsaeThink(n);
    const lines = [...(n.lines || [])];
    if (n.helper && introDone()) { const h = HINTS[getTracked?.() || 'R3-G04']?.[n.helper]; if (h) lines.push(h); }
    if (n.gate) return say(n, lines, [[`${HUB_LINKS.find((l) => l.map === n.gate).title}로 가기`, () => { close(); walk(targets.find((t) => t.gate === n.gate)); }], ['계속 걷기', close]]);
    say(n, lines.length ? lines : ['안녕하세요.']);
  }

  // 달새는 의뢰를 시작할 때 물었던 처음 생각을 의뢰를 끝낸 뒤 다시 묻는다.
  // 답은 같은 진단 과제의 기록(mission.answered)으로 남고 퀘스트 수첩 「내 배움 지도」에 처음 생각과 나란히 보인다.
  let thinking = false;
  // 의뢰 마무리 앞의 새 조건 문제를 「나중에 다시 해 볼게요」로 넘긴 의뢰(지금 회차). 달새가 광장에서 다시 권한다.
  const laterTransfer = () => Object.entries(state.missions || {}).find(([, ms]) => ms && ms.run === state.runId && ms.completed && ms.poe?.T?.done && !ms.poe.T.ok)?.[0];
  async function dalsaeThink(n) {
    if (thinking) return;
    thinking = true;
    let d = null;
    try { d = await api('my-learning'); } catch { d = null; }
    thinking = false;
    if (!alive) return;
    const r = d?.rethink?.find((x) => x.done && x.parts.every((p) => p.now == null)), later = laterTransfer();
    thinkPending = !!r || !!later;
    if (!r && later) return say(n, [`${MISSIONS[later]?.title || '지난'} 의뢰를 마칠 때 새 조건 문제를 다음에 풀기로 했지요. 지금 다시 풀어 볼래요?`],
      [['새 조건 문제 풀기', () => { close(); state.missions[later].poe.T.again = true; save(); enterMission(later); }], ['다음에 할게요', close]]);
    if (!r) return talkNpc(n, true);
    say(n, [`${r.gameTitle} 의뢰를 시작할 때 처음 생각을 적어 두었지요. 의뢰를 끝낸 지금은 어떻게 생각하는지 다시 들려줄래요?`], [['다시 답해 보기', () => askThink(n, r)], ['다음에 할게요', close]]);
  }
  function askThink(n, r) {
    const pick = {};
    const label = (p) => p.options.find((o) => o.id === pick[p.id])?.label;
    const step = (i) => {
      const p = r.parts[i], q = r.type === 'sort' ? `「${p.prompt}」, 어느 쪽에 넣을까요?` : /[?？]$/.test(p.prompt) ? p.prompt : `${r.title}
${p.prompt}`;
      say(n, [(r.parts.length > 1 ? `${i + 1}/${r.parts.length}. ` : '') + q + (p.first ? `\n처음 생각: ${p.first}` : '')],
        p.options.map((o) => [o.label, () => { pick[p.id] = o.id; if (i + 1 < r.parts.length) step(i + 1); else finish(); }]));
    };
    const finish = () => {
      const [gameId, taskId] = r.id.split('.');
      try { record('mission.answered', 'mission', r.type === 'choice' ? {gameId, taskId, answer: pick.answer, roles: {}, hint: 0} : {gameId, taskId, answer: '', roles: pick, hint: 0}); }
      catch { return say(n, ['이 기기에 저장하지 못했어요. 잠시 뒤 다시 말을 걸어 주세요.']); }
      thinkPending = false;
      const changed = r.parts.filter((p) => p.first && label(p) !== p.first).length;
      const sum = r.parts.length === 1 ? `처음에는 「${r.parts[0].first}」, 지금은 「${label(r.parts[0])}」라고 답했어요.` : changed ? `문항 ${r.parts.length}개 가운데 ${changed}개에서 생각이 바뀌었어요.` : `문항 ${r.parts.length}개 모두 처음 생각 그대로예요.`;
      say(n, [sum, '처음 생각과 지금 생각은 퀘스트 수첩의 「내 배움 지도」에 나란히 적어 둘게요.']);
    };
    step(0);
  }

  // ---------------------------------------------------------------- 척척 오류 대결
  // 지구의 의뢰를 모두 해결하면 척척 지구 단말이 그 지구에서 배운 내용을 틀리게 말한다. 의뢰에서 찾은 증거를 골라 반박하면 오류 막대가 한 칸씩 줄고,
  // 틀리게 골라도 손해 없이 힌트를 듣고 다시 고른다. 채점과 기록은 서버가 한다(/api/duel, data/duels.json).
  const CHUCK = {name: '척척 지구 단말', role: '고장 난 인공지능 단말'};
  let dueling = false;
  async function chuckTalk() {
    if (dueling) return;
    dueling = true;
    let d = null;
    try { d = await api('duel?region=' + DUEL_OF[loc]); } catch { d = null; }
    dueling = false;
    if (!alive) return;
    if (!d) return say(CHUCK, ['삐… 연결이 끊겼어요. 잠시 뒤 다시 말을 걸어 주세요.']);
    duelSt = d;
    if (d.done) return say(CHUCK, d.doneLines);
    if (!d.ready) return say(CHUCK, [`삐… 저는 척척 지구 단말이에요. ${d.title} 기억이 뒤죽박죽이에요.`, `이 지구의 의뢰를 모두 해결한 탐험가라면 제 기억을 바로잡을 수 있을 거예요. 남은 의뢰는 ${d.left}개예요.`]);
    say(CHUCK, [`삐… ${d.title} 기억 저장소에 오류가 ${d.total - d.fixed.length}개 남았어요.`, '제가 틀리게 기억한 말을 하나씩 들려줄게요. 의뢰에서 찾은 증거를 골라 바로잡아 주세요.'], [['반박 시작', nextClaim], ['다음에 할게요', close]]);
  }
  function nextClaim() {
    const d = duelSt, x = d?.claims.find((q) => !d.fixed.includes(q.id));
    if (!x) return close();
    say(CHUCK, [`오류 ${d.fixed.length + 1}/${d.total}. ${x.claim}`], [...x.options.map((o) => [o.label, () => answerClaim(x, o)]), ['잠깐 쉬기', close]]);
  }
  async function answerClaim(x, o) {
    let r;
    try { r = await api('duel', {region: DUEL_OF[loc], claim: x.id, answer: o.id}); }
    catch (e) { return say(CHUCK, [e.message || '삐… 연결을 확인하고 다시 골라 주세요.'], [['다시 고르기', nextClaim], ['잠깐 쉬기', close]]); }
    if (!alive) return;
    duelSt = {...duelSt, fixed: r.fixed, done: r.done};
    if (!r.correct) { sfx('wrong'); return say(CHUCK, [r.reply], [['다시 고르기', nextClaim], ['잠깐 쉬기', close]]); }
    sfx('ok');
    if (r.done) return duelWon(r.reply);
    say(CHUCK, [r.reply], [['다음 오류', nextClaim], ['잠깐 쉬기', close]]);
  }
  function duelWon(reply) {
    adv.duels = [...new Set([...(adv.duels || []), DUEL_OF[loc]])]; checkpoint();
    sfx('quest'); banner(`${duelSt.title} 척척 기억 복구`, '척척 오류 대결');
    window.dispatchEvent(new Event('adventure-story'));
    say(CHUCK, [reply, ...duelSt.doneLines]);
  }

  // ---------------------------------------------------------------- 주민과 현장 활동
  // 지역 주민(world-extra.json)은 마을 자리에 서서 힌트를 준다. 구역에서는 한 사람이 현장 활동(field.json)을 맡긴다.
  function addResidents(list, spots) {
    list.slice(0, spots.length).forEach((r, i) => {
      const [hx, hy] = spots[i];
      npcs.push({id: `res-${loc}-${i}`, name: r.name, role: r.role, map: loc, x: hx, y: hy, lines: r.lines, avatar: residentAvatar(loc, r.name), resident: i + 1, home: {x: hx, y: hy}, dir: 'down', walk: null, wave: 0, next: performance.now() + 2000 + Math.random() * 6000, wander: true});
    });
  }
  const giver = () => (F ? npcs.find((n) => n.resident === F.giver + 1) : null);
  function setupField(q, exp) {
    F = {...q, exp}; FS = fieldEntry(adv, loc);
    if (F.kind === 'collect') refreshItems();
    else for (const o of F.objs) targets.push({id: 'field-' + o.id, title: o.label, x: o.x, y: o.y, labelY: o.y - 92, approach: {x: o.x, y: o.y + 28}, field: o});
    for (const [lx, ly] of F.lamps || []) { const item = put(S, 'lamp', FS.done ? 'on' : 'off', lx, ly); if (item) { S.lamps.pop(); fieldLamps.push({item, x: lx, y: ly - (item.s.h ? item.s.h * 0.85 : 50), on: !!FS.done}); } }
    if (FS.done) showReward();
  }
  function refreshItems() { fieldItems = F?.kind === 'collect' && FS.on && !FS.done ? F.items.filter((i) => !FS.got?.includes(i.id)).map((i) => ({...i})) : []; if (walkGrid) nudgeField(); }
  // 장치 앞자리와 숨은 물건이 걸을 수 없는 칸에 걸리면 가장 가까운 빈칸으로 옮긴다
  function nudgeField() {
    const free = (px, py) => { const [i, j] = nearestFree(Math.floor(px / CELL), Math.floor(py / CELL)); return {x: i * CELL + CELL / 2, y: j * CELL + CELL / 2}; };
    for (const t of targets) if (t.field && blockedAt(t.approach.x, t.approach.y)) t.approach = free(t.approach.x, t.approach.y);
    for (const it of fieldItems) if (blockedAt(it.x, it.y)) Object.assign(it, free(it.x, it.y));
  }
  function showReward() {
    if (rewardShown || !F) return;
    rewardShown = true;
    for (const [kind, variant, rx, ry] of F.reward || []) kind.startsWith('@') ? fieldDecor.push({art: kind.slice(1), x: rx, y: ry}) : put(S, kind, variant, rx, ry);
  }
  function fieldMarker(n) {
    if (!F || n !== giver() || !introDone() || FS.done) return '';
    return !FS.on || fieldReady(F, FS) ? '!' : '?';
  }
  function residentTalk(n) {
    if (F && n === giver() && introDone()) return fieldTalk(n);
    const lines = [...(n.lines || [])];
    if (F && introDone() && !FS.done) lines.push(`${josa(giver()?.name || '이웃', '이', '가')} 도움이 필요하대요. 마을 쪽에 있어요.`);
    say(n, lines.length ? lines : ['안녕하세요.']);
  }
  function fieldTalk(n) {
    if (FS.done) return say(n, [F.after, ...(n.lines || []).slice(0, 1)]);
    if (!FS.on) return say(n, F.intro, [['도와줄게요', () => startField(n)], ['나중에 할게요', close]]);
    // 다 모으거나 맞춘 뒤 「다 모았어요」를 누르기 전에 나갔다가 돌아와도, 주민에게 말을 걸면 활동을 마친다.
    if (fieldReady(F, FS)) return finishField();
    const [a, b] = fieldProgress(F, FS);
    say(n, [F.hint, `${F.kind === 'collect' ? '찾아서 모은 것' : F.record ? '바르게 적은 기록' : '바르게 맞춘 장치'}: ${a}/${b}`]);
  }
  function startField(n) {
    FS.on = true; FS.got ??= []; checkpoint(); close();
    banner(F.title, '현장 활동');
    if (fieldReady(F, FS)) return finishField();
    refreshItems(); sfx('quest');
    say(n, [F.hint]);
  }
  // 켜고 끄기, 돌려 맞추기: 말풍선에서 상태를 바꾸면 지도 위 장치가 바로 바뀐다
  // 기록하며 맞추기: 혼자서는 직접 돌리고 적는다. 함께하기가 켜져 있으면 반 친구와 장치 하나를 함께 쓴다(한 명은 돌리고 한 명은 적는다).
  const shared = () => !!(tg?.isOn() && F?.coop && F.record);
  const fieldIdx = (o) => { const cs = shared() ? tg.station(loc) : null; return cs ? cs.s : stateOf(FS, o); };
  function fieldObject(t) {
    if (!F.record) return plainFieldObject(t);
    const o = t.field, cs = shared() ? tg.station(loc) : null, i = cs ? cs.s : stateOf(FS, o);
    const rec = cs ? cs.rec : (FS.rec || {}), ok = cs ? cs.ok : Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, F.record.answers[k] === v]));
    openField = t; coopKey = cs ? JSON.stringify([cs.s, cs.rec, cs.ops, cs.recs, cs.done]) : '';
    keys.clear(); path = []; pending = null; clearInterval(typing);
    speech.hidden = false;
    const body = speakerBox({name: o.label, role: '지금: ' + o.states[i]}, o.desc[i]);
    // 장치가 말풍선에 가려도 볼 수 있게 지금 막대 높이를 말풍선 안에도 보인다
    if (o.meter) { const v = o.meter[i], bar = make('div', 'field-meter'), fill = make('i'); fill.style.width = Math.round(v * 100) + '%'; fill.style.background = v > 0.85 ? '#7be06a' : v > 0.5 ? '#ffd34d' : '#ff8a4a'; bar.append(fill); bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', `막대 높이 ${Math.round(v * 100)}%`); body.append(bar); }
    const table = make('table', 'field-rec'); table.append(make('caption', '', F.record.title));
    o.states.forEach((label, k) => { const tr = make('tr', k === i ? 'now' : ''), v = rec[k]; tr.append(make('th', '', label), make('td', v ? (ok[k] ? 'ok' : 'bad') : '', v ? (ok[k] ? v : v + ', 다시 보기') : '')); table.append(tr); });
    body.append(table);
    if (cs && (cs.ops.length || cs.recs.length)) body.append(make('p', 'field-who', [cs.ops.length ? '돌린 친구: ' + cs.ops.join(', ') : '', cs.recs.length ? '적은 친구: ' + cs.recs.join(', ') : ''].filter(Boolean).join(' / ')));
    if (cs?.done && !cs.by.includes(me?.id)) body.append(make('p', 'field-who', `${josa(cs.byNames.join(', '), '이', '가')} 먼저 해결했어요. 잠시 뒤 장치가 처음으로 돌아가요.`));
    const actions = make('div', 'actions');
    const act = async (op, value) => {
      if (cs) {
        actions.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        try { const r = await tg.coop(loc, op, value); sfx('click'); if (r.done && r.by.includes(me?.id)) return coopDone(r); fieldObject(t); }
        catch (e) { fieldObject(t); speech.querySelector('.speech-body')?.append(make('p', 'field-err', e.message || '연결을 확인하고 다시 눌러 주세요.')); }
        return;
      }
      if (op === 'turn') FS.set = {...(FS.set || {}), [o.id]: (i + value + o.states.length) % o.states.length};
      else FS.rec = {...(FS.rec || {}), [i]: value};
      sfx('click'); checkpoint(); fieldObject(t);
      if (FS.on && !FS.done && fieldReady(F, FS)) setTimeout(() => { if (alive && !FS.done) finishField(); }, 1100);
    };
    actions.append(btn('◀ 돌리기', () => act('turn', -1)), btn('돌리기 ▶', () => act('turn', 1)));
    for (const ch of F.record.choices) actions.append(btn('기록: ' + ch, () => act('record', ch), 'secondary'));
    actions.append(btn('그대로 두기', close));
    body.append(actions);
    actions.querySelector('button').focus();
  }
  // 함께 해결하면 해결한 친구 모두가 해결로 남는다
  function coopDone(cs) {
    if (!F || FS.done || !cs.by.includes(me?.id)) return;
    const o = F.objs[0];
    FS.on = true; FS.set = {...(FS.set || {}), [o.id]: o.goal}; FS.rec = Object.fromEntries(F.record.answers.map((a, k) => [k, a]));
    finishField(cs.byNames.filter((_, k) => cs.by[k] !== me?.id));
  }
  function onTogether() {
    if (!F?.coop || !tg) return;
    const cs = tg.station(loc);
    if (cs?.done && cs.by.includes(me?.id) && !FS.done) return coopDone(cs);
    if (openField && !speech.hidden && cs && JSON.stringify([cs.s, cs.rec, cs.ops, cs.recs, cs.done]) !== coopKey) fieldObject(openField);
  }
  function plainFieldObject(t) {
    const o = t.field, i = stateOf(FS, o);
    keys.clear(); path = []; pending = null; clearInterval(typing);
    speech.hidden = false;
    const body = speakerBox({name: o.label, role: '지금: ' + o.states[i]}, o.desc[i]);
    const actions = make('div', 'actions');
    const setTo = (k) => { FS.set = {...(FS.set || {}), [o.id]: k}; sfx('click'); checkpoint(); fieldObject(t); if (FS.on && !FS.done && fieldReady(F, FS)) setTimeout(() => { if (alive && !FS.done) finishField(); }, 1100); };
    if (F.kind === 'toggle') actions.append(btn(o.actions[1 - i], () => setTo(1 - i)));
    else actions.append(btn('◀ 돌리기', () => setTo((i + o.states.length - 1) % o.states.length)), btn('돌리기 ▶', () => setTo((i + 1) % o.states.length)));
    actions.append(btn('그대로 두기', close));
    body.append(actions);
    actions.querySelector('button').focus();
  }
  // 찾아 모으기: 숨은 물건 위에 서거나 E를 누르면 줍는다. 고르는 활동(ok가 있는 물건)은 모을지 둘지 묻는다
  function nearItem(r) { return fieldItems.find((it) => Math.hypot(it.x - x, it.y - y) < r) || null; }
  function gotItem(it) { FS.got = [...new Set([...(FS.got || []), it.id])]; fieldItems = fieldItems.filter((f) => f.id !== it.id); checkpoint(); }
  function pickItem(it) {
    it.armed = false; keys.clear(); path = []; pending = null;
    const after = () => { const [a, b] = fieldProgress(F, FS); return [[a < b ? `계속 찾기 (${a}/${b})` : '다 모았어요', () => { close(); if (a >= b) finishField(); }]]; };
    if (it.ok === undefined) { gotItem(it); sfx('item'); return say({name: it.label, role: '찾았어요'}, [it.fact], after()); }
    say({name: it.label}, [it.ask], [[F.take || '모으기', () => {
      if (!it.ok) { sfx('wrong'); return say({name: it.label}, [it.no], [['다시 생각해 볼게요', close]]); }
      gotItem(it); sfx('item'); say({name: it.label, role: '모았어요'}, [it.fact], after());
    }], [F.leave || '두고 가기', () => {
      if (it.ok) return say({name: it.label}, ['그대로 두었어요. 다시 와서 살펴볼 수 있어요.'], [['계속 걷기', close]]);
      gotItem(it); sfx('ok'); say({name: it.label, role: '잘 골랐어요'}, [it.fact], after());
    }]]);
  }
  function finishField(mates = []) {
    if (!F || FS.done) return;
    const withText = mates.length ? `${josa(mates.join(', '), '과', '와')} 함께 ` : '';
    FS.done = true; fieldItems = []; checkpoint();
    for (const l of fieldLamps) { l.on = true; l.item.s = getSceneSprite('lamp', 'on') || l.item.s; }
    showReward(); buildWalkGrid();
    sfx('quest'); banner(F.success || F.title, `${withText}현장 활동 해결, 경험치 ${F.exp}`);
    window.dispatchEvent(new Event('adventure-story'));
    say(giver() || {name: '주민'}, mates.length ? [`${withText}해냈군요.`, ...F.done] : F.done, [['기뻐요.', () => { close(); markObjective(); }]]);
  }
  // 우리 반 복구 탑: 반 학생들이 함께 해결한 의뢰와 현장 활동
  function towerTalk() {
    const g = classGoal;
    if (!g || !g.students) return talk({name: '우리 반 복구 탑'}, '우리 반 기록을 불러오는 중이에요. 잠시 뒤 다시 살펴봐요.');
    const names = {R1: '햇살 농장 지구', R2: '불꽃 에너지 지구', R3: '전력망 지구', R4: '미래 연구 본부', R5: '푸른 생활 지구'};
    const rows = Object.entries(g.regions).map(([rk, r]) => `${names[rk]}: 의뢰 ${r.solved}개, 현장 활동 ${r.fields}개 (${r.target ? Math.round((100 * (r.solved + r.fields)) / r.target) : 0}%)`);
    const next = GOAL_STEPS.find((s) => g.percent < s), need = next ? Math.max(1, Math.ceil((g.target * next) / 100) - g.done) : 0;
    const opts = [...(weeklyOn ? [['반짝 탐험가 보기', () => { close(); window.dispatchEvent(new Event('open-weekly')); }]] : []), ['계속 걷기', close]];
    say({name: '우리 반 복구 탑'}, [`우리 반 ${g.students}명이 함께 되살린 정도는 ${g.percent}%예요.`, rows.join('\n'), next ? `${next}%까지 의뢰나 현장 활동 ${need}개가 더 필요해요.` : '우리 반이 새빛시를 모두 되살렸어요.'], opts);
  }
  // 반 전체가 다음 단계를 넘으면 한 번 알린다(이 기기, 이 학생 기준)
  function goalBanner(g) {
    const reached = [...GOAL_STEPS].reverse().find((s) => g.percent >= s) || 0, key = 'science-world:goal-step:' + (me?.id || '');
    let prev = null; try { prev = localStorage.getItem(key); } catch { prev = null; }
    if (prev !== null && reached > Number(prev)) banner(`우리 반 복구 ${reached}%`, '반 공동 목표');
    try { localStorage.setItem(key, String(reached)); } catch { /* 저장할 수 없으면 다음에 처음처럼 본다 */ }
  }
  // 마을 과학 안내판: 이 구역 의뢰 상황, 지금 배울 내용, 현장 활동 안내
  function villageBoard() {
    const st = (id) => ({completed: '해결', active: '조사 중', available: '도움 요청'})[progress.quests.find((q) => q.id === id)?.status || 'available'];
    if (lifeDark()) return say({name: '과학 안내판'}, ['너무 어두워서 안내판 글씨가 하나도 보이지 않아요. 손전등을 가까이 대 봐도 빛이 닿는 한 줄만 겨우 보여요.', '빛 공방 어둠 창고에서 물체를 보려면 무엇이 있어야 하는지 알아내면 거리의 등을 다시 켤 수 있어요.']);
    if (zone) {
      const rows = zone.games.filter((g) => MISSIONS[g.id]).map((g) => `${MISSIONS[g.id].quest}: ${st(g.id)}`);
      const id = getTracked?.(), now = MISSIONS[id]?.zone === loc ? `지금 추적 중인 의뢰에서 배울 것: ${MISSIONS[id].goal}` : '';
      const field = F ? `[현장 활동] ${F.title}: ${FS.done ? '해결' : FS.on ? `진행 중 (${fieldProgress(F, FS).join('/')})` : `${giver()?.name || '주민'}에게 이야기를 들어 봐요`}` : '';
      return say({name: '과학 안내판'}, [`[${zone.title} 의뢰]\n` + (rows.length ? rows.join('\n') : '이 구역의 의뢰를 불러오는 중이에요.'), now, field].filter(Boolean));
    }
    const rows = region.zones.map((z) => { const ids = z.games.map((g) => g.id), d = progress.quests.filter((q) => ids.includes(q.id) && q.status === 'completed').length; return `${z.title}: 의뢰 ${d}/${ids.length} 해결`; });
    say({name: '과학 안내판'}, [`[${region.title} 구역 안내]\n` + rows.join('\n'), '구역마다 마을 주민이 맡기는 현장 활동이 있어요. 머리 위에 느낌표가 뜬 주민에게 말을 걸어 봐요.']);
  }
  // 지역 이야기: 지구 지도에 들어올 때 처음, 의뢰 절반, 모두 해결한 뒤에 한 번씩 보여 준다
  function playRegionScene() {
    const R = REGION_CODE[regionKey], st = extra?.story?.[R];
    if (!st || !introDone()) return;
    adv.scenes ??= [];
    const qs = progress.quests.filter((q) => q.id.startsWith(R + '-')), done = qs.filter((q) => q.status === 'completed').length;
    const seen = (k) => adv.scenes.includes(`${R}-${k}`);
    const stage = qs.length && done === qs.length && !seen('outro') ? 'outro' : qs.length && done * 2 >= qs.length && !seen('middle') ? 'middle' : !seen('intro') ? 'intro' : null;
    if (!stage || !st[stage]?.length) return;
    const order = ['intro', 'middle', 'outro'];
    adv.scenes = [...new Set([...adv.scenes, ...order.slice(0, order.indexOf(stage) + 1).map((k) => `${R}-${k}`)])];
    checkpoint();
    const who = (name) => (name === '이야기' ? NARRATOR : npcs.find((n) => n.name === name) || {name});
    const lines = st[stage];
    const step = (i) => { const [name, text] = lines[i], last = i === lines.length - 1; say(who(name), [text], last ? [['계속 걷기', close]] : [['다음 ▶', () => step(i + 1)], ...(i === 0 ? [['이야기 건너뛰기', close]] : [])]); };
    banner(region.title, {intro: '지역 이야기', middle: '이야기 중반', outro: '지역 복구'}[stage]);
    step(0);
  }

  // ---------------------------------------------------------------- 장소 조사
  function move(map) { checkpoint(); travel.map = map; save(); dispose(); navigate(); }
  function inspect(t) {
    if (locked) return;
    if (t.healthPortal) { close(); keys.clear(); path = []; pending = null; checkpoint(); dispose(); return enterMission?.('R5-G10'); }
    if (t.field) return fieldObject(t);
    if (t.villageBoard) return villageBoard();
    if (t.tower) return towerTalk();
    if (t.chuck) return chuckTalk();
    if (t.gate) {
      if (!introDone()) return talk(NARRATOR, '문 앞에 선 관리인이 고개를 젓는다. 먼저 광장의 신항이를 만나 봐요.');
      return talk({name: t.title}, GATE_TEXT[t.gate], [['이 길로 가기', () => move(t.map)], ['둘러보기', close]]);
    }
    if (t.pickup) {
      giveItem(STORY_ITEMS[t.pickup]); targets.splice(targets.indexOf(t), 1); removeButton(t); checkpoint();
      return say({name: '발견.'}, [t.text, `[${STORY_ITEMS[t.pickup].kind}] ${STORY_ITEMS[t.pickup].title}: ${STORY_ITEMS[t.pickup].description}`], [['가방에 넣기', () => { close(); markObjective(); }]]);
    }
    if (t.sign) {
      if (story.repaired) return talk(NARRATOR, '안내판에 불이 환하게 들어와 있다. "← 햇살 농장, 전력망 지구 →" 글씨가 또렷하다.');
      if (!introDone() || !questDone('R3-G04')) return talk(NARRATOR, '안내판의 불이 꺼져 글씨가 잘 보이지 않는다. 뚜껑을 열어 보니 전지, 전구, 스위치를 넣는 자리가 비어 있다. 전력망 지구에서 빛을 되찾는 방법부터 알아봐요.');
      return say({name: '광장 안내판'}, [repairStatusLine()], [['회로 조립하기', () => { close(); startRepair(); }], ['나중에 하기', close]]);
    }
    if (t.school) return talk(NARRATOR, '우리가 다니는 학교다. 과학실 창문에 불이 켜져 있다.');
    if (t.hq) return talk({name: '탐구대 본부'}, '탐구대원들이 모이는 곳이다. 거울 앞에서 내 모습을 다시 꾸밀 수 있다.', [...(editAvatar ? [['내 모습 바꾸기', () => { close(); checkpoint(); dispose(); editAvatar(); }]] : []), ['나가기', close]]);
    if (t.board) return showBoard();
    if (t.placement) { keys.clear(); path = []; pending = null; checkpoint(); return openResources({resourceIds: t.resourceIds}); }
    if (t.map) return talk(t.back ? '길 안내' : t.title, t.back ? '왔던 길을 따라 돌아간다.' : t.title + ' 쪽으로 길이 이어져 있다.', [[t.label || '이 길로 가기', () => move(t.map)], ['둘러보기', close]]);
    if (t.library) { keys.clear(); path = []; return openResources(); }
    if (t.id === 'R3-G07') {
      talk('크레인 기사', '공방에서 온 질문을 찾는 중이에요.');
      fetch('/api/magnet-progress?runId=' + encodeURIComponent(runId)).then((r) => { if (!r.ok) throw Error(); return r.json(); }).then((data) => { if (alive) talk('크레인 기사', data.completed ? `공방에서 가져온 질문: “${data.question}”\n내 제작 설명: ${data.reason}\n이 질문을 가지고 부두의 철 부품을 살펴봐요.` : '공방에서 전자석을 만들어 보고, 무거운 철을 옮길 때 궁금한 점을 가져와 봐요.', [['크레인 옆 실험대로', () => { checkpoint(); dispose(); enterCrane(); }], ['공방 제작대 찾아가기', () => { checkpoint(); dispose(); enterMagnet(); }], ['계속 둘러보기', close]]); }).catch(() => { if (alive) talk('크레인 기사', '질문을 불러오지 못했어요. 연결을 확인하고 다시 찾아와 주세요.'); });
      return;
    }
    if (t.id === 'R3-G06') {
      talk('공방지기', '도착한 의뢰를 찾는 중이에요.');
      fetch('/api/workshop-progress?runId=' + encodeURIComponent(runId)).then((r) => { if (!r.ok) throw Error(); return r.json(); }).then((data) => { if (alive) talk('공방지기', data.completed ? `정비소에서 가져온 질문: “${data.question}”\n전기와 철 사이에서 어떤 일이 일어나는지 살펴봐요.` : '정비소에서 알아낸 것을 질문으로 챙겨 와요. 전동기와 버저의 비교 기록을 이어갈 수 있어요.', [['전자석 제작대 살펴보기', () => { checkpoint(); dispose(); enterMagnet(); }], ['계속 둘러보기', close]]); }).catch(() => { if (alive) talk('공방지기', '의뢰를 불러오지 못했어요. 연결을 확인하고 다시 조사해 봐요.'); });
      return;
    }
    if (t.id === 'R3-G05' && complete) {
      talk('항구 정비소', '관리실에서 보낸 질문을 찾는 중이에요.');
      fetch('/api/handoff?runId=' + encodeURIComponent(runId)).then((r) => { if (!r.ok) throw Error(); return r.json(); }).then(({handoff}) => {
        if (!alive) return;
        if (!handoff) return talk('항구 정비소', '관리실의 질문이 아직 도착하지 않았어요. 기록이 전달된 뒤 다시 살펴봐요.');
        const question = handoff.question;
        talk('항구 정비소', `관리실에서 가져온 내 질문: “${question}”\n전구 대신 전동기나 버저를 연결하면 무엇을 비교할 수 있을까요?`, [[handoff.received ? '가져온 질문 다시 확인' : '이 질문으로 조사 이어가기', () => { if (!handoff.received) { onHandoff(question); handoff.received = true; } talk('조사 노트', `내 질문: “${question}”\n같은 전구의 밝기 비교 기록을 챙겼다. 이제 같은 전동기의 빠르기와 같은 버저의 소리 크기도 살펴봐요.`); }], ['정비소 기록 마무리', () => { checkpoint(); dispose(); enterSummary(); }], ['새 조사 시작하기', () => { checkpoint(); dispose(); enterInquiry(); }], ['주민의 의뢰 살펴보기', () => { checkpoint(); dispose(); enterApplication(); }], ['가린 장치 조사하기', () => { checkpoint(); dispose(); enterDeduction(); }], ['버저 작업대로', () => { checkpoint(); dispose(); enterBuzzer(); }], ['전동기 작업대로', () => { checkpoint(); dispose(); enterMotor(); }], ['계속 둘러보기', close]]);
      }).catch(() => { if (alive) talk('조사 노트', '질문을 불러오지 못했어요. 연결을 확인하고 다시 조사해 봐요.'); });
      return;
    }
    if (MISSIONS[t.id] && enterMission) {
      const mi = MISSIONS[t.id], done = questDone(t.id);
      return talk({name: mi.place}, done ? `"${mi.quest}" 의뢰를 해결한 곳이다. 다시 들어가 단계를 살펴볼 수 있다.` : `"${mi.quest}"
${mi.goal}`, withRes(t.id, [[done ? '다시 들어가기' : '조사 시작하기', () => { checkpoint(); dispose(); enterMission(t.id); }], ['계속 둘러보기', close]]));
    }
    if (t.id === 'R3-G04') return talk('신항이', '안내판이 어두워 길을 읽을 수 없어요. 관리실 앞에서 같이 살펴봐요.', withRes('R3-G04', [['신항이를 따라가기', () => { checkpoint(); dispose(); enterGame(); }], ['계속 걷기', close]]));
    travel.visited[t.id] = true;
    talk(t.title, '주변을 살펴보고 궁금한 점을 노트에 남겨 봐요.', [['관찰 남기기', () => {
      speech.replaceChildren(make('strong', '', t.title));
      const input = make('textarea'); input.maxLength = 160; input.setAttribute('aria-label', '내가 발견한 점'); input.placeholder = '무엇이 보이나요? 어떤 점이 궁금한가요?'; input.value = travel.notes[t.id] || '';
      speech.append(input, btn('노트에 보관', () => { travel.notes[t.id] = input.value.trim(); checkpoint(); talk('노트', '관찰을 보관했어요. 다른 장소에서도 단서를 찾아봐요.'); }), btn('돌아가기', close));
      input.focus();
    }], ['계속 걷기', close]]);
  }
  // 광장 게시판: 반 친구 게시판(질문과 결과 나누기)과 탐구대 소식
  function showBoard() {
    say({name: '마을 게시판'}, ['반 친구들이 남긴 질문과 결과 쪽지가 붙어 있다. 한쪽에는 탐구대 소식도 걸려 있다.'], [['반 친구 게시판 보기', () => { close(); keys.clear(); path = []; window.dispatchEvent(new Event('open-class-board')); }], ['탐구대 소식 보기', () => { close(); showNews(); }], ['돌아가기', close]]);
  }
  function showNews() {
    const names = {'R3-G04': '관리실 빛 자물쇠', 'R3-G05': '가린 회로 추리', 'R3-G06': '부두 전자석 공방', 'R3-G07': '고철 부두 크레인'};
    const rows = progress.quests.length ? progress.quests.map((q) => `${q.title} (${names[q.id] || q.place}): ${({completed: '해결', active: '조사 중', available: '도움 요청'})[q.status]}`) : ['전력망 지구: 항구 안내판이 꺼져 탐구대원을 찾습니다.'];
    say({name: '마을 게시판'}, ['[탐구대 소식]\n' + rows.join('\n'), '[알림] 햇살 농장, 불꽃 에너지, 미래 연구 본부, 푸른 생활 지구에서도 이상한 일이 생겼다는 제보가 들어오고 있습니다. 둘러보며 단서를 노트에 남겨 주세요.']);
  }

  // ---------------------------------------------------------------- 이동과 충돌
  let gw = 0, gh = 0;
  function buildWalkGrid() {
    gw = S.W / CELL; gh = S.H / CELL;
    walkGrid = new Uint8Array(gw * gh);
    const rects = [];
    for (const it of S.items) { rects.push(...blocksOf(it)); for (const b of it.extraBlocks || []) rects.push({x: it.x + b.x, y: it.y + b.y, w: b.w, h: b.h}); }
    for (const t of targets.filter((t) => t.placement || t.field || t.tower || t.chuck)) rects.push(t.tower ? {x: t.x - 46, y: t.y - 20, w: 92, h: 22} : t.chuck ? {x: t.x - 22, y: t.y - 14, w: 44, h: 16} : {x: t.x - 24, y: t.y - 22, w: 48, h: 24});
    for (const n of npcs) rects.push({x: n.home.x - 9, y: n.home.y - 8, w: 18, h: 10});
    for (const t of targets.filter(t => t.healthPortal)) rects.push({x:t.x-50,y:t.y-20,w:100,h:24});
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const cx = i * CELL + CELL / 2, cy = j * CELL + CELL / 2;
      const ch = S.g[Math.floor(cy / T)]?.[Math.floor(cx / T)];
      let b = ch === 'w' || cx < 14 || cy < 24 || cx > S.W - 14 || cy > S.H - 6;
      if (!b) for (const r of rects) if (cx > r.x - 6 && cx < r.x + r.w + 6 && cy > r.y - 4 && cy < r.y + r.h + 4) { b = true; break; }
      walkGrid[j * gw + i] = b ? 1 : 0;
    }
  }
  const blockedAt = (px, py) => { const i = Math.floor(px / CELL), j = Math.floor(py / CELL); return i < 0 || j < 0 || i >= gw || j >= gh || walkGrid[j * gw + i] === 1; };
  function nearestFree(i, j) {
    if (!walkGrid[j * gw + i]) return [i, j];
    for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < gw && b < gh && !walkGrid[b * gw + a]) return [a, b]; }
    return [i, j];
  }
  function findPath(tx, ty) {
    const start = nearestFree(Math.floor(x / CELL), Math.floor(y / CELL));
    const goal = nearestFree(Math.max(0, Math.min(gw - 1, Math.floor(tx / CELL))), Math.max(0, Math.min(gh - 1, Math.floor(ty / CELL))));
    const key = (a, b) => b * gw + a, prev = new Int32Array(gw * gh).fill(-2), q = [start[0], start[1]];
    prev[key(...start)] = -1;
    const gk = key(...goal);
    for (let h = 0; h < q.length && prev[gk] === -2; h += 2) {
      const a = q[h], b = q[h + 1];
      for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const na = a + da, nb = b + db;
        if (na < 0 || nb < 0 || na >= gw || nb >= gh || prev[key(na, nb)] !== -2 || walkGrid[key(na, nb)]) continue;
        if (da && db && (walkGrid[key(a + da, b)] || walkGrid[key(a, b + db)])) continue;
        prev[key(na, nb)] = key(a, b); q.push(na, nb);
      }
    }
    if (prev[gk] === -2) return [];
    const out = [];
    for (let k = gk; k !== -1; k = prev[k]) out.push({x: (k % gw) * CELL + CELL / 2, y: Math.floor(k / gw) * CELL + CELL / 2});
    out.reverse();
    if (out.length) { out[out.length - 1] = {x: tx, y: ty}; if (blockedAt(tx, ty)) out.pop(); }
    return out;
  }
  function walk(t) {
    if (!t || locked || !speech.hidden) return;
    const a = t.approach || {x: t.x, y: t.y + 28};
    if (Math.hypot(a.x - x, a.y - y) < 26) { pending = null; return inspectTarget(t); }
    pending = t; path = findPath(a.x, a.y);
    if (!path.length) { pending = null; if (Math.hypot(a.x - x, a.y - y) < 70) inspectTarget(t); }
    canvas.focus({preventScroll: true});
  }
  const inspectTarget = (t) => (t.npc ? talkNpc(t.npc) : inspect(t));
  const npcTarget = (n) => ({npc: n, x: n.x, y: n.y, approach: {x: n.x, y: n.y + 26}});

  // ---------------------------------------------------------------- 목적지
  // 단원 첫 차시 의뢰(깜빡이 신호탑)가 있으면 그것부터, 없으면 관리실 빛 자물쇠부터 시작한다
  function firstQuest() {
    if (MISSIONS['R3-G01']) { const m = MISSIONS['R3-G01']; return {id: 'R3-G01', name: m.quest, info: m, story: '전력망 지구가 멈추면서 항구와 학교 사이 연락이 끊겼어요. 회로 수리 거리의 깜빡이 신호탑부터 살려 봐요.', go: ['동쪽 문을 지나 전력망 지구로 가요. "회로 수리 거리"의 깜빡이 신호탑이에요.']}; }
    return {id: 'R3-G04', name: '어두운 안내판에 빛을', info: QUESTS['R3-G04'], story: '전력망 지구가 멈추면서 광장까지 어두워졌지요. 관리실 안내판부터 살려 봐요.', go: ['동쪽 문을 지나 전력망 지구로 가요. "전지와 불빛" 구역의 관리실 앞 안내판을 살펴보는 거예요.']};
  }
  function trackedZone() { const id = getTracked?.() || 'R3-G04'; return MISSIONS[id]?.zone || (['R3-G04', 'R3-G05'].includes(id) ? 'power-1' : 'power-2'); }
  function objective() {
    if (loc === 'hub') {
      if (!introDone()) {
        const id = story.step === 'meet' ? (['comji', 'dalsae', 'elm'].find((k) => !story.met[k]) || (mentor() ? 'mystery' : 'dodam')) : 'dodam';
        const n = npcById(id) || npcs.find((m) => m.helper === id);
        return n ? {npcRef: n} : null;
      }
      const ch = pendingChapter();
      if (ch) { const n = npcById(ch.npc); if (n) return {npcRef: n}; }
      if (needParts()) {
        if (!has('wire')) { const j = npcById('janitor'); if (j) return {npcRef: j}; }
        if (missingParts().length) return targets.find((t) => t.gate === 'power');
        return targets.find((t) => t.sign);
      }
      return targets.find((t) => t.gate === trackedZone().split('-')[0]) || targets.find((t) => t.gate === 'power');
    }
    if (needParts()) {
      const p = targets.find((t) => t.pickup && REPAIR.needs.includes(t.pickup));
      if (p) return p;
      if (loc === 'power' && !has('switch')) return targets.find((t) => t.map === 'power-1');
      if (loc === 'power' || loc === 'power-1' || !missingParts().length) return targets.find((t) => t.back);
    }
    const id = getTracked?.() || 'R3-G04', z = trackedZone();
    if (loc === z.split('-')[0]) return targets.find((t) => t.map === z);
    if (loc === z) return targets.find((t) => t.id === id);
    return targets.find((t) => t.back);
  }
  function markObjective() {
    const o = objective();
    for (const b of buttons) b.el.classList.toggle('quest-target', Boolean(o && ((b.t && b.t === o) || (o.npcRef && b.npc === o.npcRef))));
  }
  function routeObjective() {
    if (!speech.hidden) close();
    const o = objective();
    if (!o) return;
    if (o.npcRef) walk(npcTarget(o.npcRef)); else walk(o);
  }

  // ---------------------------------------------------------------- 화면 버튼(장소 이름표)
  function addButton(t, n) {
    const label = n ? n.name : t.label || t.title;
    const b = btn(label, () => (n ? walk(npcTarget(n)) : walk(t)), n ? 'atlas-target npc-tag' + (n.helper ? ' helper' : '') : 'atlas-target');
    b.setAttribute('aria-label', n ? `${n.name} (${n.role || '주민'})` : label);
    root.append(b);
    buttons.push({el: b, t, npc: n, w: b.offsetWidth || 80});
  }
  function removeButton(t) { const i = buttons.findIndex((b) => b.t === t); if (i >= 0) { buttons[i].el.remove(); buttons.splice(i, 1); } }
  function placeButtons() {
    const scale = VW / (root.clientWidth || VW), miniOn = mini.classList.contains('reveal'), miniW = (mini.offsetWidth + 16) * scale, miniH = (mini.offsetHeight + 16) * scale;
    for (const b of buttons) {
      let wx, wy;
      if (b.npc) { if (b.npc.hidden) { b.el.hidden = true; continue; } wx = b.npc.x; wy = b.npc.y + 14; }
      else { wx = b.t.x; wy = b.t.labelY ?? (b.t.sprite ? b.t.y - Math.min(b.t.sprite.h - 18, 150) : b.t.placement ? b.t.y - 76 : b.t.y - 12); }
      const sx = wx - camX, sy = wy - camY;
      const inside = sx > -30 && sx < VW + 30 && sy > -10 && sy < VH + 10;
      // 16:9 화면에서는 구역 지도의 위나 아래 일부가 화면 밖에 있다. 그쪽 장소 이름표는 가장자리에 붙여 두어 눌러서 걸어갈 수 있게 한다.
      const pin = !inside && !b.npc && !b.t.field && !b.t.villageBoard && S.W <= VW + 40 && S.H <= 1000;
      const vis = inside || pin;
      b.el.hidden = !vis; b.el.classList.toggle('edge-up', pin && sy < 0); b.el.classList.toggle('edge-down', pin && sy >= 0);
      if (vis) { const half = b.w * scale / 2 + 4, cx = Math.max(half, Math.min(VW - half, sx)); let ly = Math.max(10, Math.min(VH - 24, sy)); if (miniOn && cx + half > VW - miniW && ly < miniH) ly = miniH + 14; b.el.style.left = (cx / VW * 100) + '%'; b.el.style.top = (ly / VH * 100) + '%'; }
    }
  }

  // ---------------------------------------------------------------- 가방
  const menu = make('details', 'rpg-menu');
  menu.append(make('summary', '', '가방'));
  menu.append(
    btn('관찰 노트', () => { menu.open = false; const entries = Object.entries(travel.notes || {}).filter(([, v]) => v); talk('관찰 노트', entries.length ? entries.map(([id, v]) => { const game = Object.values(regions).flatMap((r) => r.zones.flatMap((z) => z.games)).find((g) => g.id === id); return (game?.title || id) + ': ' + v; }).join(' / ') : '아직 남긴 관찰이 없어요. 주변 장소를 찾아가 봐요.'); }),
    btn('선생님 피드백',()=>{keys.clear();path=[];menu.open=false;openTeaching({api,runId,uid:me.id});}),
    btn('이 지역 자료', () => { keys.clear(); path = []; menu.open = false; openResources({region: loc === 'hub' ? undefined : regionKey}); }),
    btn('못 가는 곳 표시 켜기/끄기', () => { showBlocked = !showBlocked; menu.open = false; canvas.focus({preventScroll: true}); }),
    ...(editAvatar ? [btn('내 모습 바꾸기', () => { menu.open = false; checkpoint(); dispose(); editAvatar(); })] : []),
    btn('새 모험 시작', restart), btn('학생 바꾸기 / 교사 화면', logout));
  root.append(menu);
  host.replaceChildren(root, make('p', 'rpg-controls', '방향키 또는 화면을 눌러 걷기, 사람과 장소를 누르면 다가가기, E 또는 Enter로 말 걸기'));

  // ---------------------------------------------------------------- 입력
  // W, A, S, D와 E는 글자판 위치(e.code)로 받아 한글 입력 상태에서도 걷고 말을 건다
  const KEYMAP = {KeyW: 'ArrowUp', KeyA: 'ArrowLeft', KeyS: 'ArrowDown', KeyD: 'ArrowRight'};
  const typingIn = (e) => { const t = e.target; return t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)); };
  const down = (e) => {
    if (e.key === 'Shift') running = true;
    if (!speech.hidden || locked || typingIn(e) || document.querySelector('dialog[open]') || !canvas.isConnected || e.ctrlKey || e.altKey || e.metaKey) return;
    const k = KEYMAP[e.code] || e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) { e.preventDefault(); keys.add(k); path = []; pending = null; if (document.activeElement !== canvas && !root.contains(document.activeElement)) canvas.focus({preventScroll: true}); }
    const onControl = e.target instanceof HTMLElement && e.target !== canvas && !!e.target.closest('button, a, summary, [role=button]');
    if (e.code === 'KeyE' || (['Enter', ' '].includes(e.key) && !onControl)) {
      const n = npcs.filter((n) => !n.hidden && Math.hypot(n.x - x, n.y - y) < 64).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
      if (n) { e.preventDefault(); return talkNpc(n); }
      const it = nearItem(48);
      if (it) { e.preventDefault(); return pickItem(it); }
      const t = targets.find((t) => { const a = t.approach || {x: t.x, y: t.y + 28}; return Math.hypot(a.x - x, a.y - y) < 60; });
      if (t) { e.preventDefault(); inspect(t); }
    }
  };
  const up = (e) => { if (e.key === 'Shift') running = false; keys.delete(KEYMAP[e.code] || e.key); };
  // 창을 떠나거나 다른 창이 열리면 눌린 키를 잊는다(캐릭터가 혼자 계속 걷지 않게)
  const release = () => { keys.clear(); running = false; };
  window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', release); document.addEventListener('visibilitychange', release);
  canvas.addEventListener('pointerdown', (e) => {
    if (!speech.hidden || locked || !S) return;
    const r = canvas.getBoundingClientRect(), wx = (e.clientX - r.left) * VW / r.width + camX, wy = (e.clientY - r.top) * VH / r.height + camY;
    canvas.focus({preventScroll: true});
    const n = npcs.find((n) => !n.hidden && Math.abs(n.x - wx) < 22 && wy > n.y - 66 && wy < n.y + 6);
    if (n) return walk(npcTarget(n));
    const it = fieldItems.find((it) => it.seen && Math.abs(it.x - wx) < 20 && wy > it.y - 30 && wy < it.y + 10);
    if (it) { pending = null; path = findPath(it.x, it.y); clickMark = {x: it.x, y: it.y, ok: true, t: performance.now()}; return; }
    const t = targets.find((t) => {
      if (t.silent && !t.sign) return false;
      if (t.placement) return Math.abs(t.x - wx) < 30 && wy > t.y - 55 && wy < t.y + 10;
      if (t.sprite) return Math.abs(t.x - wx) < t.sprite.w / 2 && wy > t.y - t.sprite.h * 0.75 && wy < t.y + 12;
      if (t.gate) return Math.abs(t.x - wx) < 80 && wy > t.y - 150 && wy < t.y + 20;
      return Math.abs(t.x - wx) < 36 && wy > t.y - 70 && wy < t.y + 20;
    });
    if (t) return walk(t);
    const gx = Math.max(16, Math.min(S.W - 16, wx)), gy = Math.max(28, Math.min(S.H - 8, wy));
    if (blockedAt(gx, gy)) { clickMark = {x: gx, y: gy, ok: false, t: performance.now()}; return; }
    pending = null; path = findPath(gx, gy);
    clickMark = {x: gx, y: gy, ok: path.length > 0, t: performance.now()};
  });

  // ---------------------------------------------------------------- 그리기
  let signState = 'off', ctxSignOn = false, signSprites = null, clickMark = null, showBlocked = false, flash = 0, flickerAt = 0, flickerEnd = 0, darkLayer = null;
  // 망가진 2050: 광장은 처음에 어둡고, 안내판을 고치고 의뢰를 풀수록 밝아진다
  // 광장의 어둠은 전력망 지구 의뢰를 해결한 만큼 걷힌다 (안내판 복구 포함)
  const hubDark = () => { if (loc !== 'hub') return 0; const r3 = progress.quests.filter((q) => q.id.startsWith('R3-')); const done = r3.filter((q) => questDone(q.id)).length + (story.repaired ? 1 : 0); return Math.max(0, 0.42 * (1 - done / Math.max(1, r3.length + 1))); };
  // 빛 공방 거리는 어둠 창고 의뢰(R5-G04)를 풀기 전까지 등이 모두 꺼져 깜깜하다. 손전등이 비추는 내 둘레만 보인다.
  const lifeDark = () => (loc === 'life-1' && !questDone('R5-G04') ? 0.9 : 0);
  function sparkle(c, sx, sy, now) {
    const tw = reduceMotion ? 1 : 0.6 + 0.4 * Math.sin(now / 160 + sx);
    drawGlow(c, sx, sy - 10, 26, '#fff6c0', 0.45 * tw);
    c.save(); c.translate(sx, sy - 12); c.rotate(reduceMotion ? 0 : now / 900); c.fillStyle = '#fffbe0';
    const r = 9 * tw; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore();
  }
  canvas.addEventListener('pointermove', (e) => {
    if (!S || !walkGrid) return;
    const r = canvas.getBoundingClientRect(), wx = (e.clientX - r.left) * VW / r.width + camX, wy = (e.clientY - r.top) * VH / r.height + camY;
    const over = npcs.some((n) => !n.hidden && Math.abs(n.x - wx) < 22 && wy > n.y - 66 && wy < n.y + 6);
    canvas.style.cursor = over ? 'pointer' : blockedAt(wx, wy) ? 'not-allowed' : 'crosshair';
  });
  function drawMini() {
    if (!miniBg) return;
    const c = mini.getContext('2d'), sx = mini.width / S.W, sy = mini.height / S.H;
    c.drawImage(miniBg, 0, 0);
    const o = objective(), blink = Math.floor(performance.now() / 400) % 2;
    if (tg) for (const m of tg.list()) { c.fillStyle = '#a8ffbe'; c.fillRect(m.x * sx - 1.5, m.y * sy - 1.5, 3, 3); }
    if (chuckT && duelSt?.ready && !duelSt.done) { c.fillStyle = blink ? '#ff5a4a' : '#ffb3a8'; c.fillRect(chuckT.x * sx - 3, chuckT.y * sy - 3, 6, 6); }
    for (const n of npcs) { if (n.hidden) continue; const ask = n.resident && fieldMarker(n); c.fillStyle = ask ? '#ffd93b' : n.helper ? '#7fe0ff' : '#ffb3c7'; const r = ask ? 2.5 : 1.5; c.fillRect(n.x * sx - r, n.y * sy - r, r * 2, r * 2); }
    if (F && FS?.on && !FS.done && F.objs) for (const o2 of F.objs) if (stateOf(FS, o2) !== o2.goal) { c.fillStyle = '#ff9f43'; c.fillRect(o2.x * sx - 2, o2.y * sy - 2, 4, 4); }
    if (o) { const ox = o.npcRef ? o.npcRef.x : o.x, oy = o.npcRef ? o.npcRef.y : o.y; c.fillStyle = blink ? '#ffe45c' : '#ffb400'; c.beginPath(); c.arc(ox * sx, oy * sy, 4.5, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#fff'; c.strokeStyle = '#1b2d2a'; c.lineWidth = 1.5; c.beginPath(); c.arc(x * sx, y * sy, 3.5, 0, Math.PI * 2); c.fill(); c.stroke();
    if (S.W > VW || S.H > VH) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.strokeRect(camX * sx + 0.5, camY * sy + 0.5, VW * sx, VH * sy); }
  }
  // 채팅 말풍선: 한 줄 13자, 세 줄까지
  function chatBubble(c, text, px, py) {
    const lines = []; let rest = String(text);
    while (rest && lines.length < 3) { lines.push(rest.slice(0, 13)); rest = rest.slice(13); }
    if (rest) lines[2] = lines[2].slice(0, 12) + '…';
    c.font = 'bold 13px "Malgun Gothic",sans-serif'; c.textAlign = 'center';
    const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 16, h = lines.length * 16 + 8, bx = px - w / 2, by = py - h - 8;
    c.fillStyle = 'rgba(255,255,255,.96)'; c.strokeStyle = '#2b3a4a'; c.lineWidth = 2;
    c.beginPath(); c.roundRect ? c.roundRect(bx, by, w, h, 8) : c.rect(bx, by, w, h); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(px - 6, by + h); c.lineTo(px, by + h + 7); c.lineTo(px + 6, by + h); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.96)'; c.fillRect(px - 5, by + h - 2, 10, 3);
    c.fillStyle = '#1b2733'; lines.forEach((l, k) => c.fillText(l, px, by + 18 + k * 16));
  }
  function nameTag(c, text, px, py, color = '#fff') {
    c.font = 'bold 12px "Malgun Gothic",sans-serif'; c.textAlign = 'center';
    c.lineWidth = 3; c.strokeStyle = 'rgba(20,24,32,.85)'; c.strokeText(text, px, py); c.fillStyle = color; c.fillText(text, px, py);
  }
  function drawChar(c, sheet, cx, cy, d, moving, t, emote) {
    drawFrame(c, sheet, cx, cy, {dir: d, moving, t, emote});
  }
  function frame(now) {
    if (!alive) return;
    const dt = Math.min((now - last) / 1000, 0.04); last = now;
    let dx = 0, dy = 0;
    if (speech.hidden && !locked) {
      dx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
      dy = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
      // 이미 지나온 쪽 칸으로 되돌아가지 않게, 다음 점이 더 가까우면 앞 점을 건너뛴다
      while (path.length > 1 && Math.hypot(path[1].x - x, path[1].y - y) <= Math.hypot(path[1].x - path[0].x, path[1].y - path[0].y)) path.shift();
      if (path.length) { const p = path[0], d = Math.hypot(p.x - x, p.y - y); if (d < 5) path.shift(); else { dx = (p.x - x) / d; dy = (p.y - y) / d; } }
      if (pending && !path.length) { const t = pending; pending = null; inspectTarget(t); }
    }
    const moving = !!(dx || dy);
    if (moving) {
      const len = Math.hypot(dx, dy); dx /= len; dy /= len;
      // 대각선으로 걸을 때 얼굴 방향이 매 장면 뒤집히지 않게, 다른 축이 확실히 클 때만 방향을 바꾼다
      const horiz = dir === 'left' || dir === 'right', ax = Math.abs(dx), ay = Math.abs(dy);
      if (horiz ? ay > ax * 1.4 : ax > ay * 1.4) dir = ax > ay ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      else dir = horiz ? (dx > 0 ? 'right' : dx < 0 ? 'left' : dir) : (dy > 0 ? 'down' : dy < 0 ? 'up' : dir);
      const sp = (running ? 300 : 190) * dt;
      if (!blockedAt(x + dx * sp, y)) x += dx * sp;
      if (!blockedAt(x, y + dy * sp)) y += dy * sp;
      // 문 안으로 걸어 들어가면 이동을 묻는다
      if (!pending && !path.length && introDone()) {
        const g = targets.find((t) => t.gate && Math.hypot(t.approach.x - x, t.approach.y - y) < 22);
        if (g && gateArmed) { gateArmed = false; inspect(g); }
      }
    }
    if (!gateArmed && !targets.some((t) => t.gate && Math.hypot(t.approach.x - x, t.approach.y - y) < 60)) gateArmed = true;
    for (const it of fieldItems) if (it.armed === false && Math.hypot(it.x - x, it.y - y) > 46) it.armed = true;
    if (fieldItems.length && speech.hidden && !locked && !document.querySelector('dialog[open]')) { const it = nearItem(22); if (it && it.armed !== false) pickItem(it); }
    // NPC 움직임
    for (const n of npcs) {
      if (n.walk) {
        const w = n.walk, d = Math.hypot(w.tx - n.x, w.ty - n.y);
        if (d < 3) { n.x = w.tx; n.y = w.ty; n.walk = null; n.moving = false; w.resolve(); }
        else { const s = Math.min(d, w.speed * dt); const vx = (w.tx - n.x) / d, vy = (w.ty - n.y) / d; n.x += vx * s; n.y += vy * s; n.moving = true; n.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up'; }
      } else if (!locked && speech.hidden && now > n.next) {
        n.next = now + 4000 + Math.random() * 7000;
        if (n.wander && Math.random() < 0.7) { const tx = n.home.x + (Math.random() * 2 - 1) * 40, ty = n.home.y + (Math.random() * 2 - 1) * 24; if (!blockedAt(tx, ty) || Math.hypot(tx - n.home.x, ty - n.home.y) < 30) n.walk = {tx, ty, speed: 45, resolve: () => {}}; }
        else n.wave = now + 1200;
      }
    }
    // 카메라
    const tx = Math.max(0, Math.min(S.W - VW, Math.round(x) - VW / 2)), ty = Math.max(0, Math.min(S.H - VH, Math.round(y) - VH / 2 - 20));
    if (Math.abs(tx - camX) > 48 || Math.abs(ty - camY) > 48) { camX += (tx - camX) * Math.min(1, dt * 8); camY += (ty - camY) * Math.min(1, dt * 8); }
    else { camX = tx; camY = ty; }
    const cX = Math.round(camX), cY = Math.round(camY);
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(ground, cX, cY, VW, VH, 0, 0, VW, VH);
    c.save(); c.translate(-cX, -cY);
    const inView = (px, py, w = 260, h = 320) => px > cX - w && px < cX + VW + w && py > cY - 40 && py < cY + VH + h;
    const layers = [];
    for (const it of S.items) {
      if (!inView(it.x, it.y)) continue;
      let s = it.s;
      if (it.kind === 'plaza-sign' && signSprites) s = signSprites[signState];
      const paint = () => c.drawImage(s.c, Math.round(it.x - s.ax), Math.round(it.y - s.ay));
      if (DECALS.has(it.kind)) paint(); else layers.push({y: it.y, paint});
    }
    for (const t of targets) if (t.placement && inView(t.x, t.y)) layers.push({y: t.y, paint: () => paintPlacement(c, t)});
    for (const t of targets) if (t.healthPortal && inView(t.x, t.y)) layers.push({y: t.y, paint: () => paintTundraPortal(c, t.x, t.y, now / 1000, reduceMotion)});
    const tt = now / 1000;
    for (const n of npcs) {
      if (n.hidden || !inView(n.x, n.y)) continue;
      if (!n.sheet) n.sheet = getAvatarSheet(n.avatar);
      layers.push({y: n.y, paint: () => drawChar(c, n.sheet, n.x, n.y, n.dir, !!n.walk, tt + (n.home.x % 7), now < n.wave ? 'wave' : undefined)});
    }
    for (const t of targets) if (t.field && inView(t.x, t.y)) layers.push({y: t.y, paint: () => drawFieldObject(c, t.field, fieldIdx(t.field), now, {glow: drawGlow, still: reduceMotion})});
    if (towerT && inView(towerT.x, towerT.y)) layers.push({y: towerT.y, paint: () => drawTower(c, towerT.x, towerT.y, classGoal, now, drawGlow)});
    if (chuckT && inView(chuckT.x, chuckT.y)) layers.push({y: chuckT.y, paint: () => drawChuck(c, chuckT.x, chuckT.y, duelSt, now)});
    if (tg) { tg.step(dt); for (const m of tg.list()) if (inView(m.x, m.y)) layers.push({y: m.y, paint: () => drawChar(c, tg.sheetOf(m), m.x, m.y, m.dir || 'down', m.walking, tt + (m.x % 5))}); }
    for (const d of fieldDecor) if (inView(d.x, d.y)) layers.push({y: d.y, paint: () => drawFieldItem(c, d, d.x, d.y, 2.2)});
    for (const it of fieldItems) { it.dist = Math.hypot(it.x - x, it.y - y); if (it.dist < SEE_NEAR) { it.seen = true; layers.push({y: it.y, paint: () => drawFieldItem(c, it, it.x, it.y, 1.6)}); } }
    const hero = heroSheet();
    layers.push({y, paint: () => drawChar(c, hero, x, y, dir, moving, tt)});
    const pet = playerWear().pet;
    if (pet) { followPet(); layers.push({y: petPos.y, paint: () => drawPet(c, pet, petPos.x, petPos.y, tt, petPos.dir)}); }
    layers.sort((a, b) => a.y - b.y).forEach((l) => l.paint());
    for (let i = 1; i < S.poles.length; i++) { const a = S.poles[i - 1], b = S.poles[i]; if (Math.abs(a.x - b.x) < 380 && Math.abs(a.y - b.y) < 80) drawWire(c, a.x, a.y, b.x, b.y); }
    for (const t of targets) if (t.pickup && inView(t.x, t.y)) sparkle(c, t.x, t.y, now);
    // 숨은 물건은 가까이 갈수록 반짝임이 또렷해진다
    for (const it of fieldItems) if (it.dist < SEE_FAR) { c.save(); c.globalAlpha = Math.min(1, (SEE_FAR - it.dist) / (SEE_FAR - SEE_NEAR)); sparkle(c, it.x, it.y - 8, now); c.restore(); }
    if (showBlocked) {
      c.fillStyle = 'rgba(220,40,40,.28)';
      const i0 = Math.max(0, Math.floor(cX / CELL)), j0 = Math.max(0, Math.floor(cY / CELL)), i1 = Math.min(gw - 1, Math.ceil((cX + VW) / CELL)), j1 = Math.min(gh - 1, Math.ceil((cY + VH) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (walkGrid[j * gw + i]) c.fillRect(i * CELL, j * CELL, CELL, CELL);
    }
    if (clickMark && now - clickMark.t < 900) {
      const k = (now - clickMark.t) / 900;
      c.save(); c.globalAlpha = 1 - k; c.lineWidth = 3;
      if (clickMark.ok) { c.strokeStyle = '#ffe45c'; c.beginPath(); c.ellipse(clickMark.x, clickMark.y, 16 - k * 8, 8 - k * 4, 0, 0, Math.PI * 2); c.stroke(); }
      else { c.strokeStyle = '#ff4a3d'; c.beginPath(); c.moveTo(clickMark.x - 9, clickMark.y - 9); c.lineTo(clickMark.x + 9, clickMark.y + 9); c.moveTo(clickMark.x + 9, clickMark.y - 9); c.lineTo(clickMark.x - 9, clickMark.y + 9); c.stroke(); nameTag(c, '갈 수 없는 곳', clickMark.x, clickMark.y - 16, '#ffd0cc'); }
      c.restore();
    }
    // 이름표와 느낌표
    for (const n of npcs) {
      if (n.hidden || !inView(n.x, n.y)) continue;
      const m = markerFor(n);
      if (m) { const bob = reduceMotion ? 0 : Math.sin(now / 220) * 3; c.fillStyle = '#ffd93b'; c.strokeStyle = '#6b4a00'; c.lineWidth = 2; c.beginPath(); c.arc(n.x, n.y - FH - 8 + bob, 10, 0, Math.PI * 2); c.fill(); c.stroke(); nameTag(c, m, n.x, n.y - FH - 3 + bob, '#5a3b00'); }
    }
    nameTag(c, nickname || '나', x, y + 16, '#fff6c2');
    if (tg) {
      for (const m of tg.list()) if (inView(m.x, m.y)) { nameTag(c, m.nickname || '친구', m.x, m.y + 16, '#a8ffbe'); const b = tg.bubble(m.id); if (b) chatBubble(c, b, m.x, m.y - FH - 4); }
      const mine = tg.bubble(me?.id); if (mine) chatBubble(c, mine, x, y - FH - 4);
    }
    const o = objective();
    if (o && !o.npcRef && inView(o.x, o.y)) { const bob = reduceMotion ? 0 : Math.sin(now / 250) * 4; const ay = (o.labelY ?? (o.sprite ? o.y - Math.min(o.sprite.h - 18, 150) : o.y - 30)) - 26 + bob; c.fillStyle = '#ffd93b'; c.strokeStyle = '#6b4a00'; c.lineWidth = 2; c.beginPath(); c.moveTo(o.x - 10, ay - 12); c.lineTo(o.x + 10, ay - 12); c.lineTo(o.x, ay); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
    const theme = THEMES[regionKey] || THEMES.hub;
    if (theme?.tint) { c.fillStyle = theme.tint; c.fillRect(0, 0, VW, VH); }
    const dk = hubDark();
    if (dk > 0) { c.fillStyle = `rgba(10,16,34,${dk})`; c.fillRect(0, 0, VW, VH); }
    const lk = lifeDark();
    if (lk > 0) {
      if (!darkLayer) { darkLayer = document.createElement('canvas'); darkLayer.width = VW; darkLayer.height = VH; }
      const d = darkLayer.getContext('2d');
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, VW, VH); d.fillStyle = `rgba(4,8,20,${lk})`; d.fillRect(0, 0, VW, VH);
      d.globalCompositeOperation = 'destination-out';
      const hole = (hx, hy, r, a) => { const g = d.createRadialGradient(hx, hy, r * 0.2, hx, hy, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.beginPath(); d.arc(hx, hy, r, 0, Math.PI * 2); d.fill(); };
      hole(x - cX, y - 28 - cY, 118, 0.92); // 손전등이 비추는 곳
      const door = targets.find((t) => t.id === 'R5-G04'); if (door) hole(door.x - cX, door.y - 70 - cY, 120, 0.55); // 어둠 창고 문틈의 희미한 불빛
      c.drawImage(darkLayer, 0, 0);
    }
    // 어둠 위에 켜진 불빛을 다시 그린다
    c.save(); c.translate(-cX, -cY);
    for (const l of S.lamps) if ((l.on || (story.repaired && regionKey !== 'life')) && inView(l.x, l.y)) drawGlow(c, l.x, l.y, 52, '#ffd98a', 0.45); // 푸른 생활 지구의 꺼진 등은 켜져야만 빛난다
    if (loc === 'hub' && signState === 'on') drawGlow(c, 1086, 660, 110, '#ffe7a6', 0.6);
    if (dk > 0.2) drawGlow(c, x, y - 30, 90, '#fff1c9', 0.28);
    if (lk > 0) drawGlow(c, x, y - 28, 70, '#fff1c9', 0.16);
    for (const l of fieldLamps) if (l.on && inView(l.x, l.y)) drawGlow(c, l.x, l.y, 56, '#ffd98a', 0.5);
    c.restore();
    if (loc === 'hub' && !story.repaired && !locked) { if (now > flickerAt) { signState = 'on'; flickerEnd = now + 80 + Math.random() * 140; flickerAt = now + 2500 + Math.random() * 4000; } else if (now > flickerEnd) signState = 'off'; }
    if (flash > 0) { c.fillStyle = `rgba(255,255,255,${flash})`; c.fillRect(0, 0, VW, VH); }
    placeButtons();
    drawMini();
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- 시작
  // 5초마다 위치를 남기되, 지도와 자리가 그대로면 서버로 다시 보내지 않는다(가만히 서 있는 학생 수만큼 전체 기록을 계속 보내던 것을 막는다).
  let lastSpot = '';
  const timer = setInterval(() => { if (locked) return; const spot = `${loc}|${Math.round(x)}|${Math.round(y)}`; if (spot === lastSpot) return; lastSpot = spot; checkpoint(); }, 5000);
  const onRoute = () => routeObjective(), onTracked = () => markObjective(), onRepair = () => { if (loc === 'hub' && S) { close(); startRepair(); } };
  window.addEventListener('open-repair', onRepair);
  window.addEventListener('adventure-route', onRoute); window.addEventListener('adventure-tracked', onTracked);
  async function init() {
    const get = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [npcData, prog, placeData, , resData, fieldData, extraData, builtinRes] = await Promise.all([get('/api/npcs'), get('/api/adventure?runId=' + encodeURIComponent(runId || '')), get('/api/placements'), loadMissions(), get('/api/resources'), loadField(), loadWorldExtra(), get('/resources.json')]);
    if (!alive) return;
    teacherRes = (resData?.resources || []).filter((r) => r.published);
    progress = prog || {quests: []};
    ctxSignOn = !!story.repaired;
    signState = ctxSignOn ? 'on' : 'off';
    S = loc === 'hub' ? buildHub({signOn: ctxSignOn}) : buildRegion(loc, regionKey, zone ? zone.games : region.zones.map((z) => ({title: z.title, map: z.id})), !!zone, {signOn: questDone('R3-G04'), lifeLit: questDone('R5-G04'), lifeArm: questDone('R5-G01'), lifeHay: questDone('R5-G07'), lifeWind: questDone('R5-G08'), lifeMap: questDone('R5-G02'), lifeClinic: questDone('R5-G03'), lifeBeam: questDone('R5-G05'), lifeLens: questDone('R5-G06'), lifeHouse: questDone('R5-G09')});
    if (loc === 'hub') signSprites = {on: getSceneSprite('plaza-sign', 'on'), off: getSceneSprite('plaza-sign', 'off')};
    targets = S.targets;
    for (const p of placeData?.placements?.filter((p) => p.map === loc) || []) {
      const off = loc === 'hub' ? HUB_OFFSET : {x: 0, y: 0};
      targets.push({...p, map: undefined, placement: true, x: p.x + off.x, y: p.y + off.y, approach: {x: p.x + off.x, y: p.y + off.y + 26}});
    }
    // 기본 자료(public/resources.json)에 place가 있으면 그 구역에 책장이나 안내판으로 세운다. 같은 자리의 자료는 한 물체에 모은다.
    const shelves = new Map();
    for (const r of (Array.isArray(builtinRes) ? builtinRes : []).filter((r) => r.place?.map === loc)) {
      const k = r.place.x + ',' + r.place.y;
      if (!shelves.has(k)) shelves.set(k, {id: 'builtin-' + loc + '-' + k, title: r.place.title, kind: r.place.kind, x: r.place.x, y: r.place.y, resourceIds: []});
      shelves.get(k).resourceIds.push(r.id);
    }
    for (const p of shelves.values()) targets.push({...p, placement: true, approach: {x: p.x, y: p.y + 26}});
    npcs = loadNpcs(npcData?.npcs || []);
    extra = extraData;
    if (loc !== 'hub') addResidents(extra?.residents?.[loc] || [], S.village || []);
    if (zone && fieldData?.zones?.[loc]) setupField(fieldData.zones[loc], fieldData.exp || 30);
    if (DUEL_OF[loc] && api && me) { const [cx, cy] = CHUCK_AT[loc]; chuckT = {id: 'chuck-terminal', title: '척척 지구 단말', x: cx, y: cy, labelY: cy - 178, approach: {x: cx, y: cy + 28}, chuck: true}; targets.push(chuckT); }
    if (loc === 'hub' && api && me && !me.guest) { towerT = {id: 'class-tower', title: '우리 반 복구 탑', x: 1310, y: 830, labelY: 668, approach: {x: 1310, y: 864}, tower: true}; targets.push(towerT); }
    // 의뢰 보상과 주울 수 있는 소품
    const rewards = introDone() ? Object.entries(QUEST_REWARDS).filter(([q, id]) => questDone(q) && !has(id)).map(([, id]) => id) : [];
    for (const id of rewards) giveItem(STORY_ITEMS[id]);
    if (rewards.length) { checkpoint(); setTimeout(() => { if (alive) banner(rewards.map((id) => STORY_ITEMS[id].title).join(', ') + ' 획득', '의뢰 보상'); }, 700); }
    // 선생님이 새로 올린 자료는 그 자료가 보이는 지도에 처음 들어올 때 한 번 알린다(이 기기, 이 모험 회차 기준)
    if (introDone()) {
      const seenKey = 'science-world:res-seen:' + (runId || '');
      let seenRes = [];
      try { seenRes = JSON.parse(localStorage.getItem(seenKey)) || []; } catch { seenRes = []; }
      const fresh = teacherRes.filter((r) => (loc === 'hub' || r.region === 'all' || r.region === regionKey) && !seenRes.includes(r.id));
      if (fresh.length) {
        try { localStorage.setItem(seenKey, JSON.stringify([...seenRes, ...fresh.map((r) => r.id)].slice(-300))); } catch { /* 저장할 수 없으면 다음에 다시 알린다 */ }
        setTimeout(() => { if (alive) banner(`새 자료 ${fresh.length}개, ${loc === 'hub' ? '문제 발견 도서관 책장' : '가방의 「이 지역 자료」'}에서 볼 수 있어요`, '선생님 자료'); }, rewards.length ? 4800 : 900);
      }
    }
    for (const p of PICKUPS.filter((p) => p.map === loc && !has(p.item))) targets.push({pickup: p.item, text: p.text, id: 'pickup-' + p.item, title: '반짝이는 물건', x: p.x, y: p.y, approach: {x: p.x, y: p.y + 18}});
    ground = buildSceneGround({id: S.id, w: S.W / T, h: S.H / T, tiles: S.g.map((r) => r.join(''))});
    // 정사각형 지도(지구와 구역)는 미니맵도 정사각형으로 그린다
    mini.width = S.W === S.H ? 140 : 180; mini.height = Math.round(mini.width * S.H / S.W); mini.classList.toggle('square', S.W === S.H);
    const mw = mini.width, mh = mini.height;
    miniBg = document.createElement('canvas'); miniBg.width = mw; miniBg.height = mh;
    { const m = miniBg.getContext('2d'); m.imageSmoothingEnabled = true; m.drawImage(ground, 0, 0, mw, mh); m.fillStyle = 'rgba(40,30,20,.55)'; for (const it of S.items) if (it.kind === 'building') { const b = blocksOf(it)[0]; if (b) m.fillRect(b.x * mw / S.W, b.y * mh / S.H, Math.max(2, b.w * mw / S.W), Math.max(2, b.h * mh / S.H)); } }
    buildWalkGrid();
    nudgeField();
    if (blockedAt(x, y)) { const [i, j] = nearestFree(Math.floor(x / CELL), Math.floor(y / CELL)); x = i * CELL + CELL / 2; y = j * CELL + CELL / 2; }
    for (const t of targets) if (!t.silent || t.sign) addButton(t);
    for (const n of npcs) addButton(null, n);
    camX = Math.max(0, Math.min(S.W - VW, x - VW / 2)); camY = Math.max(0, Math.min(S.H - VH, y - VH / 2 - 20));
    if (hasMap()) mini.classList.add('reveal');
    markObjective();
    raf = requestAnimationFrame(frame);
    canvas.focus({preventScroll: true});
    if (api && me && !me.guest) {
      tg = createTogether({api, me: {id: me.id, nickname}, map: loc, root, make, btn, getPos: () => ({x, y, dir, moving: keys.size > 0 || path.length > 0}), onChange: onTogether});
      if (towerT) { const pull = () => { loadClassGoal(api).then((g) => { if (alive && g) { classGoal = g; goalBanner(g); } }); api('weekly').then((w) => { weeklyOn = !!w?.on; }).catch(() => {}); }; pull(); goalTimer = setInterval(pull, 60000); }
      if (chuckT) api('duel?region=' + DUEL_OF[loc]).then((d) => { duelSt = d; }).catch(() => {});
      if (loc === 'hub' && record) api('my-learning').then((d) => { thinkPending = !!d?.rethink?.some((r) => r.done && r.parts.every((p) => p.now == null)) || !!laterTransfer(); }).catch(() => {});
    }
    if (chuckT && me?.guest) api('duel?region=' + DUEL_OF[loc]).then((d) => { duelSt = d; }).catch(() => {});
    if (loc === 'hub' && story.step === 'arrival') arrival();
    else if (loc === 'hub' && story.step === 'meet') { skip.hidden = false; setHint(metCount() < 3 ? `광장의 컴지, 달새, 엘엠에게 말을 걸어 보세요 (${metCount()}/3)` : afterMeet()); }
    else if (!introDone() && loc !== 'hub') setHint('중앙 광장으로 돌아가 신항이를 만나 보세요');
    else if (loc !== 'hub' && !zone) setTimeout(() => { if (alive && speech.hidden && !locked) playRegionScene(); }, 700);
    else if (lifeDark()) setTimeout(() => { if (alive) banner('빛 공방 거리', '등이 모두 꺼져서 손전등이 비추는 곳만 보여요'); }, 700);
  }
  init().catch((e) => { console.error(e); talk('안내', '지도를 불러오지 못했어요. 새로고침해 주세요.'); });

  function dispose() {
    tg?.stop(); tg = null; clearInterval(goalTimer);
    window.removeEventListener('adventure-route', onRoute); window.removeEventListener('adventure-tracked', onTracked); window.removeEventListener('open-repair', onRepair);
    alive = false; cancelAnimationFrame(raf); clearInterval(timer); clearInterval(typing); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', release);
  }
  return dispose;
}
