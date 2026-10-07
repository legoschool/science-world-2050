// 아바타 꾸미기 규격. 클라이언트 편집기·렌더러와 서버 검증이 함께 사용한다.
// 아바타는 그림 파일이 아니라 "숫자 몇 개"로 저장한다. 그림은 접속자 화면에서 조립한다.

export const SKIN = ['#ffd21f', '#f6c9a0', '#d9a071', '#a86b43', '#6b4226', '#9fd6c2'];
export const HAIR = ['#7a3b1e', '#3d2417', '#24211f', '#c8621f', '#d9491a', '#e8c05a', '#a3a3aa', '#c4302b', '#3b6fd4', '#e46aa6', '#e8731f'];
export const CLOTH = ['#f4f4f4', '#2a2a30', '#d8343a', '#2659c8', '#1f3163', '#f5c518', '#f28a1a', '#3aa04b', '#1fa5a0', '#7a4bc4', '#ee7fb0', '#8b8f99', '#f7ae2b', '#cfae5a'];

export const LABELS = {
  hair: ['민머리', '짧은 머리', '쓸어넘김', '단발', '긴 머리', '뾰족 머리', '텁수룩 옆머리', '결 올림머리', '앞머리 단발', '짧은 옆가르마'],
  face: ['미소', '활짝', '놀람', '웃는 눈', '진지', '깔깔(속눈썹)', '윙크'],
  beard: ['없음', '수염', '까슬 수염'],
  glasses: ['없음', '동그란 안경', '선글라스', '실험 고글'],
  top: ['티셔츠', '실험 가운', '레이싱 조끼', '호랑이 옷', '제복', '후드티', '운동복', '한복 저고리'],
  bottom: ['긴바지', '반바지', '치마', '멜빵바지'],
  hat: ['없음', '안전모', '탐사 모자', '야구 모자', '비니', '고양이 귀', '왕관', '헤드폰'],
};

// 각 항목의 값 개수(0 ~ n-1)
export const RANGES = {
  skin: SKIN.length,
  hair: LABELS.hair.length,
  hairColor: HAIR.length,
  face: LABELS.face.length,
  glasses: LABELS.glasses.length,
  beard: LABELS.beard.length,
  top: LABELS.top.length,
  topColor: CLOTH.length,
  top2Color: CLOTH.length,
  bottom: LABELS.bottom.length,
  bottomColor: CLOTH.length,
  gloves: CLOTH.length + 1, // 0 = 피부색 손, 1.. = 장갑 색(CLOTH[n-1])
  hat: LABELS.hat.length,
  hatColor: CLOTH.length,
  back: 2,
  backColor: CLOTH.length,
};

export const DEFAULT_AVATAR = {
  skin: 0, hair: 1, hairColor: 0, face: 0, glasses: 0, beard: 0,
  top: 0, topColor: 3, top2Color: 0, bottom: 0, bottomColor: 4,
  gloves: 0, hat: 0, hatColor: 5, back: 0, backColor: 2,
};

// 네 친구의 기본 모습
export const PRESETS = {
  comji: {
    name: '컴지',
    avatar: { skin: 0, hair: 7, hairColor: 0, face: 0, glasses: 1, beard: 0, top: 1, topColor: 0, top2Color: 1, bottom: 0, bottomColor: 1, gloves: 0, hat: 0, hatColor: 5, back: 0, backColor: 2 },
  },
  dalsae: {
    name: '달새',
    avatar: { skin: 0, hair: 8, hairColor: 3, face: 5, glasses: 0, beard: 0, top: 3, topColor: 12, top2Color: 1, bottom: 0, bottomColor: 12, gloves: 0, hat: 0, hatColor: 5, back: 0, backColor: 2 },
  },
  elm: {
    name: '엘엠',
    avatar: { skin: 0, hair: 1, hairColor: 0, face: 3, glasses: 0, beard: 0, top: 2, topColor: 3, top2Color: 0, bottom: 0, bottomColor: 3, gloves: 3, hat: 0, hatColor: 5, back: 0, backColor: 2 },
  },
  teacher: {
    name: '선생님',
    avatar: { skin: 0, hair: 9, hairColor: 10, face: 6, glasses: 0, beard: 2, top: 4, topColor: 4, top2Color: 13, bottom: 0, bottomColor: 4, gloves: 2, hat: 0, hatColor: 5, back: 0, backColor: 2 },
  },
};

// 어떤 값이 들어와도 항상 유효한 아바타로 정리한다(서버가 클라이언트를 믿지 않기 위함).
export function sanitizeAvatar(input) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const key of Object.keys(DEFAULT_AVATAR)) {
    const n = Number.isInteger(src[key]) ? src[key] : DEFAULT_AVATAR[key];
    out[key] = n >= 0 && n < RANGES[key] ? n : DEFAULT_AVATAR[key];
  }
  return out;
}

export function avatarKey(av) {
  return Object.keys(DEFAULT_AVATAR).map((k) => av[k]).join('.');
}

export function randomAvatar(rand = Math.random) {
  const out = {};
  for (const key of Object.keys(DEFAULT_AVATAR)) out[key] = Math.floor(rand() * RANGES[key]);
  out.beard = rand() < 0.2 ? 1 + Math.floor(rand() * 2) : 0;
  out.back = rand() < 0.3 ? 1 : 0;
  out.hat = rand() < 0.3 ? out.hat : 0;
  return out;
}
