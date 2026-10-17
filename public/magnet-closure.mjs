import {magnetRecord} from './experiment-records.mjs';
import {electricitySupport} from './electricity-support.mjs';
import {closureAnswer} from './closure-answer.mjs';
export function magnetClosure(panel,{el,button,state,record,save,api,resume,back,leave}){
  const q=state.magnetClosure??={reason:'',question:''};let alive=true,timer,sending=false,check=null;const status=el('p',{role:'status'});
  async function load(){try{
    const data=await api('magnet-progress?runId='+encodeURIComponent(state.runId));if(!alive)return;
    if(sending&&!data.completed){status.textContent='카드를 전달하고 있어요. 연결되면 도착을 확인합니다.';return;}
    check?.dispose();panel.replaceChildren(el('h2',{},'동료에게 남길 제작 카드'),status);
    if(data.completed){clearInterval(timer);status.textContent='공방에 제작 카드가 도착했어요.';panel.append(el('h3',{},'내 제작 설명'),el('p',{},data.reason),el('h3',{},'크레인 기사에게 가져갈 질문'),el('p',{},data.question),button('크레인 기사를 만나러 부두로',leave),button('공방으로 돌아가기',back));return;}
    if(data.missing.length){status.textContent='카드에 함께 담을 탐구 기록이 아직 부족해요.';for(const item of data.missing)panel.append(button(item.title+' 이어가기',()=>resume(item.scene)));panel.append(button('도착한 기록 다시 확인',load),button('공방으로 돌아가기',back));return;}
    status.textContent='동료가 다시 만들 수 있도록 사용한 재료, 선 끝 처리, 연결과 관찰 결과를 설명해 주세요.';
    panel.append(electricitySupport(el,'G06','closure','감긴 부분과 양 끝의 피복 처리를 구별하세요. 전류가 흐를 때와 끊겼을 때의 기록도 비교하세요.'),magnetRecord(el,state,{open:true}));
    const reason=el('textarea',{'aria-label':'전자석 제작 설명',maxlength:300}),question=el('textarea',{'aria-label':'크레인 기사에게 보낼 질문',maxlength:300});reason.value=q.reason;question.value=q.question;
    reason.oninput=()=>{q.reason=reason.value;clearTimeout(reason.saveT);reason.saveT=setTimeout(save,800);};question.oninput=()=>{q.question=question.value;clearTimeout(question.saveT);question.saveT=setTimeout(save,800);};
    check=closureAnswer({el,button,api,record,gameId:'R3-G06',draft:q,save,isActive:()=>alive});
    panel.append(el('label',{},'내 제작 설명',reason),check.node,el('label',{},'다음 질문',question),button('무거운 철도 옮길 수 있을까요?',()=>{q.question='무거운 철도 옮길 수 있을까요?';question.value=q.question;save();}),button('제작 카드 남기기',async e=>{
      const answer=reason.value.trim(),nextQuestion=question.value.trim();if(!answer||!nextQuestion){status.textContent='제작 설명과 다음 질문을 모두 남겨 주세요.';return;}
      const trigger=e.currentTarget;trigger.disabled=true;q.reason=reason.value;q.question=question.value;save();const result=await check.check(answer);if(!alive)return;
      if(!result){trigger.disabled=false;return;}
      if(reason.value.trim()!==answer||question.value.trim()!==nextQuestion){status.textContent='방금 고친 설명과 질문을 다시 보내 주세요.';trigger.disabled=false;return;}
      record('magnet.completed','closure6',{reason:answer,answer:nextQuestion,ruleRevision:result.ruleRevision});sending=true;save();timer=setInterval(load,1500);load();
    }),el('p',{},'다음 질문에는 정답이 없어요. 설명 내용과 실제 제작 과정은 선생님이 함께 살펴봐요.'),button('공방으로 돌아가기',back));
  }catch(e){if(alive){panel.replaceChildren(el('p',{role:'status'},'기록을 확인하지 못했어요. 연결을 확인하고 다시 살펴보세요.'),button('기록 다시 확인',load),button('공방으로 돌아가기',back));}}}
  load();return {dispose(){alive=false;check?.dispose();clearInterval(timer);}};
}
