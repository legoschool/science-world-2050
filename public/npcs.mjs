// 월드에 서 있는 인물(NPC) 기본값.
// 교사·관리자가 관리자 페이지에서 대사·위치·게시 여부를 바꾸면 서버 값(/api/npcs)이 같은 id를 덮어쓰고,
// 새로 만든 인물은 id가 'custom-'으로 시작한다. 좌표는 캐릭터 발밑(기준점) 위치다.
import {PRESETS} from './vendor/shared/avatar.mjs';

export const HUB_SIZE = {w: 1920, h: 1280};
export const mapSize = (id) => (id === 'hub' ? HUB_SIZE : {w: 960, h: 960});

// 신항이는 마을 안내자다. 컴지·달새·엘엠과 다른 모습으로 구별한다.
export const DODAM_AVATAR = {skin: 1, hair: 3, hairColor: 1, face: 1, glasses: 0, beard: 0, top: 5, topColor: 6, top2Color: 0, bottom: 0, bottomColor: 1, gloves: 0, hat: 2, hatColor: 13, back: 1, backColor: 7};

// 학습을 돕는 세 도우미
export const HELPERS = {
  comji: {name: '컴지', role: '실험 도우미', avatar: PRESETS.comji.avatar},
  dalsae: {name: '달새', role: '관찰 기록 도우미', avatar: PRESETS.dalsae.avatar},
  elm: {name: '엘엠', role: '길잡이 도우미', avatar: PRESETS.elm.avatar},
};

// 모험에서 얻는 소품. 저장은 id만 한다. kind: 도구·부품·단서·기록
export const STORY_ITEMS = {
  'safety-card': {id: 'safety-card', kind: '도구', title: '실험 안전 카드', description: '실험 전에 확인하기: 선생님 안내 듣기, 한 번에 조건 하나만 바꾸기, 뜨거워지는 부품은 오래 켜 두지 않기.', source: '중앙 광장의 컴지'},
  magnifier: {id: 'magnifier', kind: '도구', title: '관찰 돋보기', description: '작은 차이를 살펴보고, 본 것과 내 생각을 나눠 적을 때 쓰는 돋보기.', source: '중앙 광장의 달새'},
  map: {id: 'map', kind: '도구', title: '마을 지도', description: '지금 위치와 다음 목적지를 보여 주는 지도. 화면 구석의 작은 지도로 볼 수 있다.', source: '중앙 광장의 엘엠'},
  'battery-pair': {id: 'battery-pair', kind: '부품', title: '전지 두 개', description: '1.5 V 전지 두 개. 관리실에서 안내판을 밝혀 준 고마움으로 보냈다.', source: '관리실 빛 자물쇠 의뢰 보상'},
  bulb: {id: 'bulb', kind: '부품', title: '전구', description: '광장 안내판에 들어가는 전구. 유리가 깨지지 않았고 필라멘트도 멀쩡하다.', source: '전력망 지구 항구 길'},
  wire: {id: 'wire', kind: '부품', title: '전선 묶음', description: '양 끝의 피복이 벗겨진 전선. 부품과 부품을 이어 전기가 흐르는 길을 만든다.', source: '중앙 광장의 관리인 아저씨'},
  switch: {id: 'switch', kind: '부품', title: '스위치', description: '회로를 이었다 끊었다 하는 스위치. 누르면 딸깍 소리가 난다.', source: '전력망 지구 전지와 불빛 구역'},
  'sign-badge': {id: 'sign-badge', kind: '기록', title: '광장 복구 배지', description: '모은 부품으로 회로를 만들어 광장 안내판을 다시 밝힌 탐구대원에게 주는 배지.', source: '중앙 광장 안내판 수리'},
  'motor-part': {id: 'motor-part', kind: '부품', title: '작은 전동기', description: '정비소에서 받은 작은 전동기. 전지 수에 따라 날개가 도는 빠르기를 비교했다.', source: '가린 회로 추리 의뢰 보상'},
  'magnet-core': {id: 'magnet-core', kind: '부품', title: '내가 만든 전자석', description: '철 볼트에 에나멜선을 감아 만든 전자석. 전류가 흐를 때만 철을 끌어당긴다.', source: '부두 전자석 공방 의뢰 보상'},
  'sun-card': {id: 'sun-card', kind: '단서', title: '계절 카드 조각', description: '"여름, 낮이 가장 길다"라는 글씨가 남은 카드 조각. 햇살 농장의 뒤섞인 계절 카드와 관련 있어 보인다.', source: '햇살 농장 지구'},
  candle: {id: 'candle', kind: '단서', title: '타다 남은 양초', description: '처음보다 길이가 짧아진 양초. 줄어든 초는 어디로 갔을까요?', source: '불꽃 에너지 지구'},
  'mirror-shard': {id: 'mirror-shard', kind: '단서', title: '작은 거울 조각', description: '햇빛에 비추면 벽에 밝은 점이 생기는 거울 조각. 빛 공방 거리의 깨진 진열장에서 떨어진 것 같다.', source: '푸른 생활 지구'},
  'news-clip': {id: 'news-clip', kind: '단서', title: '미래 신문 조각', description: '"2050년 우리 마을, 여름이 길어졌다"는 제목의 신문 조각. 이 기사의 근거는 무엇일까요?', source: '미래 연구 본부'},
};

// 의뢰를 마치면 받는 보상 (서버의 완료 기록으로 판단)
export const QUEST_REWARDS = {'R3-G04': 'battery-pair', 'R3-G05': 'motor-part', 'R3-G06': 'magnet-core'};

// 지도에 떨어져 있어 주울 수 있는 소품
export const PICKUPS = [
  {item: 'bulb', map: 'power', x: 720, y: 500, text: '창고 앞 상자 사이에서 전구를 찾았다.'},
  {item: 'switch', map: 'power-1', x: 720, y: 510, text: '길가에 떨어진 스위치를 주웠다.'},
  {item: 'sun-card', map: 'farm', x: 560, y: 480, text: '밭 가장자리에서 카드 조각을 주웠다.'},
  {item: 'candle', map: 'fire', x: 520, y: 480, text: '시장 골목에서 타다 남은 양초를 주웠다.'},
  {item: 'news-clip', map: 'future', x: 720, y: 480, text: '바람에 날리던 신문 조각을 잡았다.'},
  {item: 'mirror-shard', map: 'life', x: 720, y: 490, text: '풀숲에서 반짝이는 거울 조각을 주웠다.'},
];

// 인벤토리로 푸는 문제: 광장 안내판 고치기
export const REPAIR = {
  needs: ['battery-pair', 'bulb', 'wire', 'switch'],
  where: {
    'battery-pair': '전력망 지구의 "관리실 빛 자물쇠" 의뢰를 마치면 받을 수 있어요.',
    bulb: '전력망 지구 항구 길에서 반짝이는 것을 찾아보세요.',
    wire: '광장의 학교 관리인 아저씨에게 물어보세요.',
    switch: '전력망 지구 "전지와 불빛" 구역 길가를 살펴보세요.',
  },
};

const V = (skin, hair, hairColor, face, top, topColor, bottom, bottomColor, extra = {}) => ({skin, hair, hairColor, face, glasses: 0, beard: 0, top, topColor, top2Color: 0, bottom, bottomColor, gloves: 0, hat: 0, hatColor: 5, back: 0, backColor: 2, ...extra});

export const DEFAULT_NPCS = [
  // ---------------------------------------------------------------- 중앙 광장
  {id: 'dodam', name: '신항이', role: '마을 안내자', map: 'hub', x: 1010, y: 820, avatar: DODAM_AVATAR, story: true,
    lines: ['노란 표식이 지금 의뢰로 가는 길이에요. 막히면 광장의 세 친구에게 물어보세요.']},
  {id: 'mystery', name: '미스터리', role: '선생님, 비밀이 많은 안내자', map: 'hub', x: 1120, y: 525, mentor: true, avatar: PRESETS.teacher.avatar,
    lines: ['탐구대 의뢰는 제가 정리해서 알려 줄게요. 퀘스트 수첩에 배울 내용과 단계가 적혀 있어요.', '틀려도 괜찮아요. 예상과 결과가 다를 때 진짜 탐구가 시작되거든요.']},
  {id: 'comji', name: '컴지', role: '실험 도우미', map: 'hub', x: 830, y: 850, helper: 'comji', avatar: PRESETS.comji.avatar,
    lines: ['실험할 때는 바꿀 조건 하나만 바꾸고 나머지는 같게 둬야 무엇 때문인지 알 수 있어요.', '실험 중에 막히면 작업대의 생각 열쇠를 눌러 보세요. 도움을 받아도 감점은 없어요.']},
  {id: 'dalsae', name: '달새', role: '관찰 기록 도우미', map: 'hub', x: 1110, y: 870, helper: 'dalsae', avatar: PRESETS.dalsae.avatar,
    lines: ['본 것과 내 생각은 나눠서 적어요. "불빛이 더 밝았다"는 관찰이고, "전지가 많아서"는 생각이에요.', '예상이 틀려도 괜찮아요. 틀린 예상도 수첩에 남겨 두면 나중에 비교할 수 있어요.']},
  {id: 'elm', name: '엘엠', role: '길잡이 도우미', map: 'hub', x: 960, y: 930, helper: 'elm', avatar: PRESETS.elm.avatar,
    lines: ['미니맵의 노란 점이 다음 목적지예요. 화면 위 "목적지 안내"를 누르면 그쪽으로 걸어가요.', '광장 네 방향 끝에 지구로 가는 문이 있어요. 동쪽이 전력망, 서쪽이 햇살 농장, 남쪽이 불꽃 에너지, 북쪽이 미래 연구 본부예요. 남동쪽 주민 집 옆 문은 푸른 생활 지구로 가요.']},
  {id: 'gate-farm', name: '소담', role: '햇살 농장 지구 문지기', map: 'hub', x: 250, y: 700, gate: 'farm', avatar: V(2, 4, 5, 3, 0, 7, 3, 11, {hat: 2, hatColor: 13}),
    lines: ['햇살 농장에서는 계절 카드가 뒤섞여 농사 달력이 엉망이 됐대요. 해의 높이와 그림자를 살펴보면 단서가 있을지도 몰라요.']},
  {id: 'gate-power', name: '하준', role: '전력망 지구 관리인', map: 'hub', x: 1680, y: 700, gate: 'power', avatar: V(3, 1, 2, 4, 4, 4, 0, 1, {hat: 1, hatColor: 5}),
    lines: ['전력망 지구의 항구 쪽 안내판이 꺼져서 주민들이 길을 못 찾고 있어요. 관리실에 가 보면 도울 방법이 있을 거예요.']},
  {id: 'gate-fire', name: '나리', role: '불꽃 에너지 지구 소방대원', map: 'hub', x: 1064, y: 1200, gate: 'fire', avatar: V(1, 3, 6, 4, 4, 2, 0, 1, {hat: 1, hatColor: 2}),
    lines: ['불꽃 에너지 지구 시장에서는 불과 관련된 사건이 자주 생겨요. 불이 타는 조건을 알아야 안전하게 막을 수 있어요.']},
  {id: 'gate-future', name: '이음', role: '미래 연구 본부 안내원', map: 'hub', x: 1090, y: 240, gate: 'future', avatar: V(4, 9, 8, 0, 1, 0, 0, 9, {glasses: 1}),
    lines: ['미래 연구 본부에서는 2050년 우리 마을을 예측하고 있어요. 여러 지구에서 모은 기록이 예측의 근거가 된대요.']},
  {id: 'gate-life', name: '보람', role: '푸른 생활 지구 보건소 간호사', map: 'hub', x: 1500, y: 1200, gate: 'life', avatar: V(1, 3, 2, 1, 1, 0, 0, 4, {hat: 6, hatColor: 0}),
    lines: ['푸른 생활 지구에는 보건소와 빛 공방, 목장이 있어요. 척척이 우리 몸과 빛, 자원에 대해 틀린 안내를 해서 마을이 엉망이 됐어요. 직접 관찰하고 실험해서 바로잡아 주세요.']},
  {id: 'janitor', name: '관리인 아저씨', role: '학교 관리인', map: 'hub', x: 700, y: 610, avatar: V(2, 1, 6, 4, 6, 11, 0, 1, {beard: 1, hat: 3, hatColor: 11}),
    lines: ['광장 안내판이 갑자기 꺼져서 깜짝 놀랐어요. 전구는 멀쩡해 보이던데 말이에요.']},
  {id: 'kid-daon', name: '다온', role: '꼬마 주민', map: 'hub', x: 1240, y: 1000, avatar: V(0, 5, 4, 1, 3, 6, 1, 3),
    lines: ['저도 탐구대 하고 싶어요. 형아 누나들이 실험하는 거 보고 배울 거예요.']},

  // ---------------------------------------------------------------- 햇살 농장 지구
  {id: 'farm-dalsae', name: '달새', role: '관찰 기록 도우미', map: 'farm', x: 320, y: 470, helper: 'dalsae', avatar: PRESETS.dalsae.avatar,
    lines: ['그림자 길이를 잴 때는 같은 막대, 같은 자리에서 시각만 바꿔 재야 비교할 수 있어요.', '시각과 그림자 길이를 표로 적어 두면 규칙이 보여요.']},
  {id: 'farm-grandma', name: '보리 할머니', role: '농부', map: 'farm', x: 650, y: 330, avatar: V(1, 4, 10, 3, 7, 12, 2, 8, {hat: 2, hatColor: 13}),
    lines: ['계절 카드가 뒤섞여서 언제 씨를 뿌려야 할지 모르겠군요. 해가 가장 높이 뜨는 계절이 언제였을까요?']},
  {id: 'farm-haerang', name: '해랑', role: '관측소 연구원', map: 'farm', x: 880, y: 520, avatar: V(3, 2, 1, 4, 1, 0, 0, 4, {glasses: 1}),
    lines: ['해가 남쪽 하늘에서 가장 높이 뜰 때를 태양이 남중했다고 해요. 그때 하루 중 그림자가 가장 짧아요.']},

  // ---------------------------------------------------------------- 불꽃 에너지 지구
  {id: 'fire-comji', name: '컴지', role: '실험 도우미', map: 'fire', x: 320, y: 470, helper: 'comji', avatar: PRESETS.comji.avatar,
    lines: ['물질이 타려면 탈 물질, 산소, 발화점 이상의 온도가 모두 있어야 해요.', '진짜 불을 쓰는 실험은 꼭 선생님과 함께, 보안경을 쓰고 해야 해요.']},
  {id: 'fire-chorong', name: '초롱', role: '양초 공방 주인', map: 'fire', x: 650, y: 330, avatar: V(2, 8, 3, 5, 7, 2, 2, 12),
    lines: ['양초를 태우고 나면 초가 줄어들어 있어요. 줄어든 초는 어디로 간 걸까요? 타고 난 뒤 생기는 물질을 찾아보세요.']},
  {id: 'fire-danbi', name: '단비', role: '소방대원', map: 'fire', x: 880, y: 520, avatar: V(0, 1, 1, 4, 4, 2, 0, 1, {hat: 1, hatColor: 2}),
    lines: ['불을 끌 때는 타는 조건 가운데 하나 이상을 없애. 모래를 덮으면 산소가 닿지 않게 막을 수 있어요.']},

  // ---------------------------------------------------------------- 전력망 지구
  {id: 'power-elm', name: '엘엠', role: '길잡이 도우미', map: 'power', x: 320, y: 470, helper: 'elm', avatar: PRESETS.elm.avatar,
    lines: ['관리실은 "전지와 불빛" 구역에 있어요. 노란 표식을 따라가면 돼요.', '전자석 공방과 크레인은 "전자석 부두" 구역이에요.']},
  {id: 'power-volt', name: '볼트', role: '항구 정비사', map: 'power', x: 650, y: 330, avatar: V(3, 6, 2, 4, 2, 5, 3, 4, {gloves: 12}),
    lines: ['안내판을 밝히려면 전지를 무작정 더 넣으면 될까요? 같은 전구를 쓰고 전지 수만 바꿔 비교해 봐야 알 수 있지요.']},
  {id: 'power-pado', name: '파도', role: '어부', map: 'power', x: 880, y: 520, avatar: V(4, 2, 2, 0, 5, 8, 0, 4, {hat: 3, hatColor: 3}),
    lines: ['밤이면 항구에 불빛이 거의 없어서 배를 댈 때 조마조마해요.']},
  {id: 'power1-comji', name: '컴지', role: '실험 도우미', map: 'power-1', x: 320, y: 520, helper: 'comji', avatar: PRESETS.comji.avatar, hints: true,
    lines: ['비교할 때 바꾸는 조건은 하나만. 전구 규격은 같게, 전지 수만 다르게.']},
  {id: 'power2-dalsae', name: '달새', role: '관찰 기록 도우미', map: 'power-2', x: 320, y: 520, helper: 'dalsae', avatar: PRESETS.dalsae.avatar, hints: true,
    lines: ['스위치를 닫았을 때와 열었을 때 철이 어떻게 되는지 둘 다 적어 둬요.']},
  {id: 'power2-crane', name: '두루', role: '부두 노동자', map: 'power-2', x: 650, y: 540, avatar: V(2, 1, 1, 4, 6, 7, 0, 1, {hat: 1, hatColor: 6, gloves: 7}),
    lines: ['무거운 고철은 전자석 크레인으로 옮겨요. 그런데 요즘 크레인이 철을 놓지 못할 때가 있어요.']},

  // ---------------------------------------------------------------- 미래 연구 본부
  {id: 'future-elm', name: '엘엠', role: '길잡이 도우미', map: 'future', x: 320, y: 470, helper: 'elm', avatar: PRESETS.elm.avatar,
    lines: ['2050년 모습은 지금 모은 기록을 근거로 예상해 볼 수 있어요. 근거 없는 예상과는 달라요.']},
  {id: 'future-hanul', name: '한울', role: '미래 연구소장', map: 'future', x: 650, y: 330, avatar: V(1, 9, 7, 4, 1, 0, 0, 1, {glasses: 1, beard: 2}),
    lines: ['연구 본부의 서버 "척척"이 마을 기록을 모으고 있어요. 여러 지구의 문제를 풀수록 척척이 알려 줄 수 있는 것이 많아질 거예요.']},
  {id: 'future-narae', name: '나래', role: '미래 신문 기자', map: 'future', x: 880, y: 520, avatar: V(0, 4, 1, 1, 0, 9, 2, 1, {hat: 7, hatColor: 1}),
    lines: ['제보가 들어왔는데 사실인지 확인해야 해요. 기사에 쓰려면 누가, 어떻게 확인했는지 근거가 필요하거든요.']},

  // ---------------------------------------------------------------- 푸른 생활 지구
  {id: 'life-comji', name: '컴지', role: '실험 도우미', map: 'life', x: 320, y: 470, helper: 'comji', avatar: PRESETS.comji.avatar,
    lines: ['팔 모형에서는 빨대가 근육이에요. 빨대 길이가 줄어들면 뼈 모형이 어떻게 되는지 직접 해 봐요.', '레이저 빛은 눈에 비추지 않아요. 빛 실험 전에는 보안경부터 써요.']},
  {id: 'life-yunsol', name: '윤솔', role: '빛 공방 장인', map: 'life', x: 650, y: 330, avatar: V(2, 7, 4, 4, 2, 9, 0, 11, {glasses: 2}),
    lines: ['척척이 등을 꺼도 눈에서 나오는 빛으로 다 보인다고 해서 거리 등을 모두 껐대요. 그날부터 넘어지는 사람이 생겼어요.', '거울은 빛을 되돌려 보내고, 렌즈는 빛을 꺾어요. 공방 물건마다 어느 쪽을 쓰는지 살펴보세요.']},
  {id: 'life-hangyeol', name: '한결', role: '목장 주인', map: 'life', x: 880, y: 520, avatar: V(3, 1, 6, 4, 5, 3, 0, 1, {hat: 2, hatColor: 13}),
    lines: ['자원은 끝없이 나온다는 척척 말만 믿고 마구 썼더니 목장 창고가 텅 비었어요.', '바람 언덕에는 바람이 늘 세게 불어요. 그 바람을 쓸 방법이 있을까요?']},
];

// 걷기 시트 파일 이름(public/assets/sprites/*.png). 도우미와 신항이는 자기 이름, 주민은 npc-이름.
const NPC_SPRITES = {janitor: 'npc-janitor', 'kid-daon': 'npc-daon', 'gate-farm': 'npc-sodam', 'gate-power': 'npc-hajun', 'gate-fire': 'npc-nari', 'gate-future': 'npc-ieum', 'farm-grandma': 'npc-grandma', 'farm-haerang': 'npc-haerang', 'fire-chorong': 'npc-chorong', 'fire-danbi': 'npc-danbi', 'power-volt': 'npc-volt', 'power-pado': 'npc-pado', 'power2-crane': 'npc-duru', 'future-hanul': 'npc-hanul', 'future-narae': 'npc-narae'};
for (const n of DEFAULT_NPCS) n.sprite = n.helper || (n.story ? 'dodam' : n.mentor ? 'mystery' : NPC_SPRITES[n.id]);
export const MENTOR = {name: '미스터리', role: '선생님, 비밀이 많은 안내자', avatar: PRESETS.teacher.avatar};
export const DODAM_SPRITE = '/assets/sprites/dodam.png';
