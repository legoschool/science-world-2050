import {learningSupport,termHints} from './learning-support.mjs';

const GOALS={
  G04:['불이 켜지는 회로와 비교에 필요한 조건을 찾아요.','전지 수만 바꾸어 밝기를 비교할 준비를 해요.','전지의 서로 다른 극을 한 줄로 연결해요.','밝기를 예상하고 실험으로 확인할 생각을 남겨요.','전지 수에 따른 전구의 밝기를 관찰해요.','같게 둔 조건과 실제 관찰을 근거로 밝기를 설명해요.','위치와 부품이 달라져도 공정하게 비교할 수 있는지 판단해요.','관찰 근거로 안내판에 쓸 연결을 제안해요.'],
  G05:{intro:'전동기와 버저에서 비교할 특징을 찾아요.',motor:'전지 수에 따른 같은 전동기의 회전 빠르기를 비교해요.',buzzer:'전지 수에 따른 같은 버저의 소리 크기를 비교해요.',deduction:'부품과 조건을 확인하고 여러 관찰로 전지 연결을 추리해요.',application:'관찰 기록을 근거로 주민의 목적에 맞는 전지 연결을 골라요.',closure:'같은 조건에서 관찰한 빠르기와 소리 크기를 연결해 설명해요.'},
  G06:{intro:'전기가 통하는 성질과 자석에 붙는 성질을 구별하고 장치를 조사해요.',materials:'전자석에 쓸 재료를 고르고 철심, 전선, 전지, 스위치의 역할을 알아봐요.',repair:'전지, 접점, 선 끝을 조사하고 한 곳씩 고쳐 결과를 다시 확인해요.',build:'전류가 흐를 때 자석의 성질이 나타나는 전자석을 안전하게 만들어요.',meaning:'스위치 전후의 관찰로 전자석의 성질과 사용법을 설명해요.',closure:'재료, 선 끝 처리, 연결과 관찰을 담아 전자석 제작 방법을 설명해요.'},
  G07:['전자석을 만드는 조건과 전류의 역할을 떠올려요.','철을 붙이는 때와 놓는 때를 비교할 질문을 만들어요.','스위치를 열고 닫을 때 전자석의 성질을 비교해요.','전지 수만 바꾸어 전자석의 세기를 비교해요.','나침반 바늘과 자석의 서로 다른 극이 끌어당기는 모습을 관찰해요.','전지 방향을 바꿀 때 전자석의 극이 어떻게 되는지 알아봐요.','막대자석과 전자석의 공통점과 차이점을 비교해요.','전자석의 성질을 이용해 철 화물을 붙이고 옮기고 놓아요.','세기와 극에 관한 주장을 서로 다른 관찰 근거로 설명해요.','화물을 붙이고 놓는 경험으로 전자석 크레인의 쓰임을 설명해요.']
};
const PAGES={G04:'72~73',G05:'74~75',G06:'76~77',G07:'78~79'};
export function electricitySupport(el,game,stage,lookFor=''){
  const node=learningSupport(el,{goal:GOALS[game]?.[stage],lookFor,sources:[{title:'6학년 과학, 전기의 이용',page:PAGES[game]}]});
  if(node){node.dataset.learningGame='R3-'+game;node.dataset.learningStage=typeof stage==='number'?'T'+String(stage+1).padStart(2,'0'):stage;}
  return node;
}
export function electricityTerms(el,game,stage){
  const terms=game==='G04'?(stage===2?[{word:'직렬연결',clue:'서로 다른 극을 한 줄로 잇는 연결'}]:stage===1?[{word:'같은 전구',clue:'비교할 때 그대로 둘 부품'},{word:'전지 수',clue:'바꿀 조건'}]:[{word:'전지 수',clue:'바꾸어 본 조건'},{word:'밝기',clue:'관찰할 전구의 특징'}]):
    game==='G05'?(stage==='motor'?[{word:'전동기',clue:'회전하는 부품'},{word:'빠르기',clue:'비교할 특징'}]:stage==='buzzer'?[{word:'버저',clue:'소리 내는 부품'},{word:'소리 크기',clue:'비교할 특징'}]:[{word:'직렬연결',clue:'전지 두 개를 한 줄로 잇는 방법'},{word:'같은 조건',clue:'전지 수를 비교하기 위한 약속'}]):
    game==='G06'?[{word:'에나멜선',clue:'철 볼트에 감은 선'},{word:'피복',clue:'감긴 부분에는 남기고 양 끝에서 벗길 것'},{word:'전자석',clue:'전류가 흐를 때 자석이 되는 장치'}]:
    stage===3?[{word:'전지 수',clue:'바꾼 조건'},{word:'세기',clue:'붙은 개수로 비교한 성질'}]:stage===4||stage===5?[{word:'다른 극',clue:'서로 끌어당기는 두 극'},{word:'전지 방향',clue:'극을 바꾸기 위해 바꾼 것'}]:[{word:'전류',clue:'스위치를 닫으면 흐르는 것'},{word:'스위치',clue:'철을 붙이거나 놓을 때 조작할 것'}];
  return termHints(el,terms);
}
