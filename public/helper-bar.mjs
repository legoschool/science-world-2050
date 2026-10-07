// 실험 화면 위에 뜨는 도우미 한 줄. 화면에 맞는 도우미가 먼저 말하고, 다른 도우미에게도 물어볼 수 있다.
import {HELPERS} from './npcs.mjs';

const TIPS = {
  'g05-intro': [['dalsae', '예전 밝기 기록은 위치가 아니라 조건을 보고 판단해 보세요. 같은 전구였는지부터.'], ['comji', '전동기는 도는 빠르기, 버저는 소리 크기를 조사하면 돼요.']],
  'motor-workshop': [['comji', '같은 3 V 전동기, 같은 날개인지 먼저 확인해요. 그래야 전지 수 때문이라고 말할 수 있어요.'], ['dalsae', '두 스위치를 함께 켜고 어느 쪽이 더 빨리 도는지 적어 둬요.'], ['elm', '다 끝나면 버저 작업대로 가 봐요.']],
  'buzzer-workshop': [['comji', '빨간 선은 +극, 검은 선은 −극에 이어야 해요.'], ['dalsae', '소리가 큰지 작은지 파동 그림으로도 비교할 수 있어요.'], ['elm', '다음은 가린 회로를 추리하는 곳이에요.']],
  'deduction-workshop': [['comji', '밝기, 회전, 소리 가운데 두 가지 이상을 조사해야 전지 수를 추리할 수 있어요.'], ['dalsae', '부품 규격이나 정상 상태를 모르면 판단을 미루는 것도 좋은 답이에요.']],
  'application-workshop': [['comji', '많을수록 언제나 좋은 건 아니에요. 의뢰한 주민이 무엇을 원하는지 먼저 생각해요.'], ['dalsae', '앞에서 관찰한 전동기와 버저 결과를 근거로 골라 보세요.']],
  'workshop-summary': [['dalsae', '비교한 결과를 자기 말로 정리해 보세요. 다음에 알아보고 싶은 질문도 하나 남겨요.'], ['elm', '정리가 끝나면 전자석 부두로 갈 수 있어요.']],
  'magnet-workshop': [['comji', '감긴 부분 피복은 그대로 두고 양 끝만 벗겨야 전기가 통해요. 조립은 전원을 끈 상태에서.'], ['dalsae', '스위치를 닫았을 때와 열었을 때 철이 어떻게 되는지 둘 다 적어요.'], ['elm', '다 만들면 제작 카드를 크레인 기사에게 가져가요.']],
  'crane-workshop': [['comji', '스위치를 열면 전류가 끊겨서 철을 끌어당기는 힘이 크게 약해져요.'], ['dalsae', '붙는 정도가 얼마나 줄었는지 살펴보세요. 조금 남는 것도 그대로 적어요.']],
};

export function mountHelperBar(map) {
  document.querySelector('.workshop-helper')?.remove();
  const tips = TIPS[map];
  if (!tips) return;
  let i = 0;
  const img = new Image(), name = document.createElement('strong'), role = document.createElement('span'), text = document.createElement('p');
  img.alt = '';
  const next = document.createElement('button');
  next.type = 'button'; next.className = 'secondary'; next.textContent = '다른 도우미에게 묻기';
  const bar = document.createElement('section');
  bar.className = 'workshop-helper'; bar.setAttribute('aria-live', 'polite');
  const body = document.createElement('div');
  body.append(name, role, text);
  bar.append(img, body, next);
  const show = () => { const [k, tip] = tips[i % tips.length], h = HELPERS[k]; img.src = `/assets/portraits/${k}.png`; name.textContent = h.name; role.textContent = h.role; text.textContent = tip; };
  next.onclick = () => { i++; show(); };
  if (tips.length < 2) next.hidden = true;
  show();
  document.querySelector('#app').before(bar);
}
