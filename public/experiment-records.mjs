// 실제로 작동시킨 조건만 다시 보여 준다. 학생이 고른 답과 모형의 관찰을 구별한다.
export function componentRecord(el,state,kind,{open=false}={}) {
  const m=state[kind],motor=kind==='motor',name=motor?'전동기':'버저';
  const box=el('details',{class:'experiment-record'},el('summary',{},`${name}에서 내가 관찰한 기록`));
  box.open=open;
  if(!m?.hasRun){box.append(el('p',{},`아직 ${name}의 두 장치를 작동시킨 기록이 없어요. ${name} 작업대에서 스위치를 닫아 비교해 보세요.`));return box;}
  box.append(el('p',{},`같은 3 V ${name}${motor?', 같은 날개':''}를 쓰고 전지 수만 바꾸어 두 스위치를 함께 닫았어요.`),
    el('table',{},el('thead',{},el('tr',{},el('th',{},'전지 연결'),el('th',{},motor?'회전 빠르기':'소리 크기'))),
      el('tbody',{},el('tr',{},el('td',{},'전지 한 개'),el('td',{},motor?'상대적으로 느림':'상대적으로 작음')),
        el('tr',{},el('td',{},'전지 두 개 직렬'),el('td',{},motor?'더 빠름':'더 큼')))));
  if(m.answer)box.append(el('p',{},'내가 고른 관찰: '+(m.answer==='two'?(motor?'두 개 직렬 쪽이 더 빠름':'두 개 직렬 쪽이 더 큰 소리'):'두 쪽이 같음')));
  return box;
}

export function magnetRecord(el,state,{open=false}={}) {
  const m=state.magnet||{},box=el('details',{class:'experiment-record'},el('summary',{},'내 전자석 제작과 관찰 기록'));
  box.open=open;
  const rows=[];
  if(m.tape)rows.push('철 볼트에 테이프를 붙였어요.');
  if(m.turns)rows.push('피복 있는 에나멜선을 한 방향으로 감았어요.');
  if(m.tails)rows.push('양 끝에 연결할 여유를 남겼어요.');
  if(m.ends==='ends')rows.push('감긴 부분의 피복은 남기고 양 끝의 피복만 벗겼어요.');
  if(m.connected)rows.push('양 끝을 전지와 스위치가 있는 회로에 연결했어요.');
  if(m.ran)rows.push('스위치를 닫았을 때: 전류가 흐르고 철심 빵 끈이 붙었어요.');
  if(m.opened)rows.push('스위치를 열었을 때: 전류가 끊기고 붙는 정도가 크게 줄었어요.');
  box.append(rows.length?el('ul',{},rows.map(t=>el('li',{},t))):el('p',{},'아직 제작과 관찰한 기록이 없어요. 공방에서 재료와 스위치를 살펴보세요.'));
  return box;
}
