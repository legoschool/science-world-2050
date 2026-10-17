const prompts={
'처음 생각과 경험':'자석을 써 본 기억부터 떠올려 봐요. 잘 몰라도 괜찮아요.',
'원인 후보':'버려진 장치의 전지, 접점, 선 끝을 조사하고 생각을 남겨 봐요.',
'재료와 역할':'재료 서랍에서 철 볼트를 찾고 네 부품의 역할을 살펴봐요.',
'안전 준비':'이제 만들 차례예요. 전원을 끄고 안전 준비부터 확인해요.',
'테이프와 감기':'볼트에 테이프를 붙이고 볼트 끝까지 선을 감아요. 「한 방향으로 촘촘하게 감기」를 세 번 누르면 끝까지 감겨요. 양 끝에는 여유를 남겨요.',
'끝 피복과 연결':'감긴 부분은 그대로 두고 양 끝 피복만 벗겨 회로에 연결해요.',
'스위치 전후 관찰':'스위치를 닫고 열며 철심 빵 끈이 어떻게 달라지는지 봐요.',
'고장 수정 후 재확인':'붙지 않는 옆 장치도 도와줘요. 한 곳씩 고친 뒤 다시 확인해 보세요.',
'전자석 설명과 사용 이유':'관찰한 것을 바탕으로 장치의 이름과 사용 안내를 남겨요.'};
export function magnetGuide(host,{el,button,api,state,pending,go}){
let alive=true,busy=false,stamp=-1,data=null;const text=el('p',{'aria-live':'polite'},'신항이: 탐구 기록을 확인하고 있어요.'),action=button('신항이와 이어가기',async()=>{const latest=await refresh(true);if(latest)go(latest.completed?'done':latest.missing[0]?.scene||'closure',latest.missing[0]?.title)});host.append(text,action);
function show(){if(pending()){text.textContent='신항이: 방금 남긴 기록을 전달하고 있어요. 도착하면 다음 일을 알려 줄게요.';action.disabled=true;return}action.disabled=!data; if(data)text.textContent='신항이: '+(data.completed?'제작 카드가 도착했어요. 이제 크레인 기사에게 질문을 가져가요.':data.missing.length?prompts[data.missing[0].title]:'우리가 알아낸 것을 제작 카드에 담아 동료에게 남겨요.');}
async function refresh(force=false){if(!alive||busy)return null;if(pending()){show();return null}if(!force&&stamp===state.sequence){show();return data}busy=true;try{const seq=state.sequence;const result=await api('magnet-progress?runId='+encodeURIComponent(state.runId));if(!alive)return null;data=result;stamp=seq;show();return pending()?null:result}catch{if(alive){text.textContent='신항이: 기록을 확인하지 못했어요. 연결된 뒤 다시 이어가요. 지금 활동은 계속할 수 있어요.';action.disabled=false}return null}finally{busy=false}}
refresh();const timer=setInterval(()=>refresh(),1200);return()=>{alive=false;clearInterval(timer)};
}
