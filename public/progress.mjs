// 징표와 탐구 레벨. 모두 학생 저장 상태와 서버의 의뢰 완료 기록에서 계산한다.
// 힌트 사용이나 틀린 횟수로 불이익을 주는 징표는 두지 않는다. (server.py STORY_BADGES와 id를 같게 유지)
export const BADGES = [
  {id: 'arrive', title: '2050 도착', how: '망가진 2050 새빛시에 처음 도착하기', color: 'sky'},
  {id: 'friends', title: '도우미의 친구', how: '광장에서 컴지, 달새, 엘엠을 모두 만나기', color: 'sky'},
  {id: 'first-quest', title: '첫 의뢰', how: '미스터리 선생님께 첫 의뢰 받기', color: 'sky'},
  {id: 'predict', title: '예상의 달인', how: '관리실에서 까닭과 함께 예상 남기기', color: 'green'},
  {id: 'fair-test', title: '조건 지킴이', how: '같게 할 조건과 바꿀 조건을 바르게 정하기', color: 'green'},
  {id: 'recheck', title: '다시 확인', how: '틀린 답을 다시 살펴보고 고쳐서 제출하기', color: 'green'},
  {id: 'light', title: '어둠을 밝힌 자', how: '관리실 빛 자물쇠 의뢰 해결하기', color: 'gold'},
  {id: 'repair', title: '광장의 수리공', how: '모은 부품으로 광장 안내판 고치기', color: 'gold'},
  {id: 'detective', title: '회로 탐정', how: '가린 회로 추리 의뢰 해결하기', color: 'gold'},
  {id: 'magnet', title: '전자석 장인', how: '부두 전자석 공방 의뢰 해결하기', color: 'gold'},
  {id: 'crane', title: '크레인 조종사', how: '고철 부두 크레인 의뢰 해결하기', color: 'gold'},
  {id: 'explorer', title: '네 지구 탐험가', how: '햇살 농장, 불꽃 에너지, 전력망, 미래 연구 본부에 모두 가 보기', color: 'purple'},
  {id: 'collector', title: '단서 수집가', how: '세 지구에서 단서 세 개 모으기', color: 'purple'},
  {id: 'notes', title: '관찰 기록가', how: '여러 장소에서 관찰 메모 세 개 남기기', color: 'purple'},
  {id: 'helper-hand', title: '마을의 해결사', how: '주민 세 명의 부탁 모두 들어주기', color: 'purple'},
  {id: 'fieldwork', title: '현장 탐구가', how: '구역 주민이 맡긴 현장 활동 다섯 개 해결하기', color: 'purple'},
  {id: 'chuck-fixer', title: '척척 수리공', how: '지구 단말에서 척척 오류 대결 이기기', color: 'gold'},
  {id: 'dex-farm', title: '햇살 도감 완성', how: '햇살 농장 지구 도감 카드를 숨은 카드까지 모두 모으기', color: 'green'},
  {id: 'dex-fire', title: '불꽃 도감 완성', how: '불꽃 에너지 지구 도감 카드를 숨은 카드까지 모두 모으기', color: 'gold'},
  {id: 'dex-power', title: '전력망 도감 완성', how: '전력망 지구 도감 카드를 숨은 카드까지 모두 모으기', color: 'sky'},
  {id: 'dex-future', title: '미래 도감 완성', how: '미래 연구 본부 도감 카드를 숨은 카드까지 모두 모으기', color: 'purple'},
  {id: 'dex-life', title: '푸른 도감 완성', how: '푸른 생활 지구 도감 카드를 숨은 카드까지 모두 모으기', color: 'green'},
  {id: 'dex-master', title: '과학 도감 박사', how: '다섯 지구의 과학 도감 카드를 모두 모으기', color: 'gold'},
];
// 도감 징표용 모은 카드: 모험 정보(/api/adventure)의 dex, dexRegions, dexTotal
export const dexOf = (data) => (data?.dex ? {list: data.dex, totals: data.dexRegions || {}, total: data.dexTotal || 0} : null);
const DEX_BADGE = {'dex-farm': 'R1', 'dex-fire': 'R2', 'dex-power': 'R3', 'dex-future': 'R4', 'dex-life': 'R5'};
const dexFull = (dex, r) => !!dex && (dex.totals[r] || 0) > 0 && dex.list.filter((c) => c.region === r).length >= dex.totals[r];

// 구역 현장 활동(field.json)을 해결한 수
export const fieldDone = (a) => Object.values(a?.field || {}).filter((f) => f?.done).length;
const solved = (quests, id) => !!quests?.some((q) => q.id === id && q.status === 'completed');

export function earnedBadges(state, quests, dex = null) {
  const s = state.story || {}, a = state.adventure || {}, t = state.travel || {}, items = a.storyItems || [];
  const has = {
    arrive: !!s.step && s.step !== 'arrival',
    friends: ['comji', 'dalsae', 'elm'].every((k) => s.met?.[k]),
    'first-quest': !!a.welcomed,
    predict: !!state.prediction,
    'fair-test': state.conditions === 'same' || (state.step || 0) >= 2,
    recheck: Object.values(state.responses || {}).some((n) => n >= 2),
    light: !!state.complete || solved(quests, 'R3-G04'),
    repair: !!s.repaired,
    detective: solved(quests, 'R3-G05'),
    magnet: solved(quests, 'R3-G06'),
    crane: solved(quests, 'R3-G07'),
    explorer: ['farm', 'fire', 'power', 'future'].every((k) => t.positions?.[k]),
    collector: ['sun-card', 'candle', 'news-clip'].every((k) => items.includes(k)),
    notes: Object.values(t.notes || {}).filter(Boolean).length >= 3,
    'helper-hand': ['grandma', 'chorong', 'narae'].every((k) => s.side?.[k]),
    fieldwork: fieldDone(a) >= 5,
    'chuck-fixer': (a.duels || []).length >= 1,
    ...Object.fromEntries(Object.entries(DEX_BADGE).map(([id, r]) => [id, dexFull(dex, r)])),
    'dex-master': !!dex && dex.total > 0 && dex.list.length >= dex.total,
  };
  return BADGES.filter((b) => has[b.id]).map((b) => b.id);
}

export const LEVEL_TITLES = ['초보 탐구자', '견습 탐구자', '탐구자', '숙련 탐구자', '베테랑 탐구자', '새빛시의 탐구 영웅'];
// Lv.6 뒤에도 칭호가 이어진다(필수 단계만 풀어도 Lv.60 안팎까지 오른다). [이 레벨부터, 칭호]
export const LEVEL_BANDS = [[1, '초보 탐구자'], [2, '견습 탐구자'], [3, '탐구자'], [4, '숙련 탐구자'], [5, '베테랑 탐구자'], [6, '새빛시의 탐구 영웅'],
  [10, '별빛 연구원'], [15, '은하 연구원'], [20, '새빛시 수석 연구원'], [25, '미래 과학 탐험대장'], [30, '2050 수호자'], [40, '새빛시의 전설'],
  [50, '과학의 별'], [60, '시간을 건넌 탐험가'], [70, '미래를 바꾼 탐험가'], [80, '새빛시의 빛']];
export const levelTitle = (level) => LEVEL_BANDS.filter(([lv]) => level >= lv).at(-1)[1];
export const nextTitle = (level) => LEVEL_BANDS.find(([lv]) => lv > level) || null;
// 빛 고리: Lv.20부터 캐릭터 발밑에 빛나는 고리. 레벨이 오를수록 색이 바뀐다
export const AURAS = [[20, '청록 빛 고리', '#4fe0c8'], [30, '은빛 고리', '#dfe8ff'], [40, '금빛 고리', '#ffd36e'], [50, '노을빛 고리', '#ff8a5c'], [60, '무지개 고리', 'rainbow']];
export const auraOf = (level) => AURAS.filter(([lv]) => level >= lv).at(-1) || null;
const PER_LEVEL = 120;

export function explore(state, quests, dex = null) {
  const s = state.story || {}, items = state.adventure?.storyItems || [];
  let exp = 0;
  exp += Math.min(state.complete ? 8 : state.step || 0, 8) * 10;
  exp += ['R3-G04', 'R3-G05', 'R3-G06', 'R3-G07'].filter((id) => solved(quests, id)).length * 60;
  exp += earnedBadges(state, quests, dex).length * 20;
  exp += items.length * 5;
  exp += Object.values(s.side || {}).filter(Boolean).length * 30;
  exp += (state.adventure?.duels || []).length * 40; // 척척 오류 대결에서 이긴 지구
  exp += Math.min(Object.values(state.travel?.notes || {}).filter(Boolean).length, 10) * 5;
  exp += fieldDone(state.adventure) * 30;
  // 공용 의뢰 화면에서 푼 과제(이번 모험 회차)와 해결한 의뢰도 경험치가 된다
  for (const m of Object.values(state.missions || {})) if (m && m.run === state.runId) exp += Object.values(m.done || {}).filter((v) => v && v !== 'skip').length * 5;
  exp += (quests || []).filter((q) => q.status === 'completed' && !['R3-G04', 'R3-G05', 'R3-G06', 'R3-G07'].includes(q.id)).length * 40;
  exp += Math.max(0, Math.min(200000, state.adventure?.dailyExp || 0)); // 오늘의 탐구(맞히면 10, 답하면 3)
  const level = 1 + Math.floor(exp / PER_LEVEL);
  return {exp, level, into: exp % PER_LEVEL, per: PER_LEVEL, title: levelTitle(level)};
}

// 빛 고리 그리기: 발밑 (x, y)에 납작한 고리. rainbow는 시간에 따라 색이 돈다
export function drawAura(c, x, y, aura, t = 0) {
  if (!aura) return;
  const color = aura[2] === 'rainbow' ? `hsl(${Math.floor(t * 60) % 360} 90% 65%)` : aura[2];
  c.save();
  c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3);
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, 17, 6, 0, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.9; c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 16, 5.5, 0, 0, Math.PI * 2); c.stroke();
  c.restore();
}
