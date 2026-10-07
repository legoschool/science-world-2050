// 엔딩: 네 지구 의뢰 52개를 모두 해결하면 한 번 저절로 열리고, 퀘스트 수첩에서 다시 볼 수 있다.
// 푸른 생활 지구(학습보완 단원)까지 마쳤으면 그 지구 이야기와 수료증 문구를 더한다.
// 이야기 마무리, 탐험 기록, 수료증을 보여 준다. 수료증은 인쇄할 수 있다.
import {celebrate} from './celebrate.mjs';
import {sfx} from './sound.mjs';

const REGIONS = [
  ['햇살 농장 지구', '태양 고도와 그림자를 다시 재어 운동장 그늘막을 알맞게 옮겼어요. 텃밭 달력도 계절을 되찾았어요.'],
  ['불꽃 에너지 지구', '연소의 조건과 연소 뒤에 생기는 물질을 밝혀 시장 경보탑이 알코올 불까지 알아채게 되었어요.'],
  ['전력망 지구', '전지 연결과 전자석의 성질을 실험으로 확인해 안내판에 불이 들어오고 고철 부두 크레인이 다시 움직여요.'],
  ['미래 연구 본부', '미래 사회의 문제와 과학 진로를 조사해 비어 있던 미래 신문을 채우고 척척을 다시 가르쳤어요.'],
];
const LIFE = ['푸른 생활 지구', '근육이 뼈를 당겨 움직인다는 것을 밝혀 로봇 팔이 다시 컵을 들고, 빛이 있어야 물체가 보인다는 것을 확인해 거리의 등을 켰어요. 목장에는 풍력 발전기가 돌아요.'];

export function showEnding({el, button, stats, who}) {
  const d = el('dialog', {class: 'ending-dialog', 'aria-label': '탐험 엔딩'});
  const today = new Date(), date = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const scene = el('section', {class: 'ending-scene'},
    el('small', {}, '미래과학탐험 엔딩'),
    el('h2', {tabindex: '-1'}, '2050년 마을이 다시 깨어났어요'),
    el('p', {}, '척척에게 모든 일을 맡겼던 마을은 척척이 고장 나자 함께 멈췄어요. 탐험가는 척척의 말을 그대로 믿지 않고, 직접 재고 비교하고 기록해서 하나씩 바로잡았어요.'));
  const regions = el('div', {class: 'ending-regions'}, ...(stats.life ? [...REGIONS, LIFE] : REGIONS).map(([name, text]) => el('div', {class: 'ending-region'}, el('strong', {}, name), el('p', {}, text))));
  const rows = [['해결한 의뢰', `${stats.quests}개`], ['푼 과제', `${stats.tasks}개`], ['모은 징표', `${stats.badges}개`], ...(stats.dex === undefined ? [] : [['도감 카드', `${stats.dex}장`]]), ['연 소품', `${stats.wear}개`], ['탐험가 레벨', stats.level]];
  const record = el('div', {class: 'ending-stats'}, ...rows.map(([k, v]) => el('div', {}, el('small', {}, k), el('strong', {}, String(v)))));
  const cert = el('section', {class: 'ending-cert'},
    el('small', {}, '미래과학탐험'),
    el('h3', {}, '수료증'),
    el('p', {class: 'ending-who'}, who || '탐험가'),
    el('p', {}, stats.life ? '위 탐험가는 2050년 마을의 햇살 농장 지구, 불꽃 에너지 지구, 전력망 지구, 미래 연구 본부, 푸른 생활 지구를 과학 탐구로 되살렸기에 이 증서를 드립니다.' : '위 탐험가는 2050년 마을의 햇살 농장 지구, 불꽃 에너지 지구, 전력망 지구, 미래 연구 본부를 과학 탐구로 되살렸기에 이 증서를 드립니다.'),
    el('p', {class: 'ending-date'}, date),
    el('p', {class: 'ending-sign'}, '마을 구조대 대장 신항이, 도우미 컴지, 달새, 엘엠, 미스터리 선생님'));
  d.append(scene, regions, el('h3', {class: 'ending-sub'}, '나의 탐험 기록'), record, cert,
    el('p', {class: 'ending-note'}, '탐험은 여기서 끝나지 않아요. 지도를 다시 돌아다니며 해결한 의뢰를 다시 살펴보거나, 아직 착용하지 않은 소품을 골라 보세요.'),
    el('div', {class: 'actions'}, button('수료증 인쇄하기', () => { document.body.classList.add('print-cert'); window.print(); setTimeout(() => document.body.classList.remove('print-cert'), 500); }, 'secondary'), button('탐험 계속하기', () => { d.close(); d.remove(); })));
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal();
  scene.querySelector('h2').focus({preventScroll: true}); d.scrollTop = 0;
  sfx('quest'); celebrate(scene);
}
