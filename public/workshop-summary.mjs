import {componentRecord} from './experiment-records.mjs';
import {electricitySupport} from './electricity-support.mjs';
import {closureAnswer} from './closure-answer.mjs';
export function workshopSummary(host,{el,button,state,record,save,api,go}){
  const w=state.workshopClosure??={reason:'',question:''};let alive=true,timer,sending=false,check=null;
  const root=el('section',{class:'card'}),status=el('p',{role:'status'});host.replaceChildren(root);root.append(el('h1',{},'정비소의 탐구 장부'),status);
  async function load(){try{
    const data=await api('workshop-progress?runId='+encodeURIComponent(state.runId));if(!alive)return;
    if(sending&&!data.completed){status.textContent='설명과 질문을 전달하고 있어요. 연결되면 도착을 확인해요.';return;}
    check?.dispose();root.replaceChildren(el('h1',{},'정비소의 탐구 장부'),status);
    if(data.completed){clearInterval(timer);status.textContent='정비소에 비교 기록을 남겼어요.';root.append(el('h2',{},'내 설명'),el('p',{},data.reason),el('h2',{},'다음 공방으로 가져갈 질문'),el('p',{},data.question),button('전자석 부두로',()=>go('power-2')));return;}
    status.textContent='관찰한 결과를 서로 연결해 설명해 보세요.';
    if(data.missing.length){root.append(el('p',{},'아직 장부에 도착하지 않은 기록이 있어요.'));for(const item of data.missing)root.append(button(item.title+' 살펴보기',()=>go(item.map)));root.append(button('도착한 기록 다시 확인',load));return;}
    root.append(electricitySupport(el,'G05','closure','같게 둔 부품, 바꾼 전지 수, 전동기의 빠르기와 버저의 소리 크기를 기록에서 찾으세요. 자동차와 도서관의 목적도 연결해 보세요.'),componentRecord(el,state,'motor',{open:true}),componentRecord(el,state,'buzzer',{open:true}));
    const reason=el('textarea',{maxlength:300,'aria-label':'정비소 비교 결과 설명',placeholder:'무엇을 같게 두었고 무엇이 달라졌나요? 목적에 따라 왜 다른 연결을 제안했나요?'}),question=el('textarea',{maxlength:300,'aria-label':'전자석 공방에 보낼 질문'});
    reason.value=w.reason;question.value=w.question;
    reason.oninput=()=>{w.reason=reason.value;clearTimeout(reason.saveT);reason.saveT=setTimeout(save,800);};question.oninput=()=>{w.question=question.value;clearTimeout(question.saveT);question.saveT=setTimeout(save,800);};
    check=closureAnswer({el,button,api,record,gameId:'R3-G05',draft:w,save,isActive:()=>alive});
    root.append(el('label',{},'내 비교 결과 설명',reason),check.node,el('label',{},'다음에 알아볼 질문',question),button('전기로 철을 붙였다 떼었다 할 수 있을까요?',()=>{w.question='전기로 철을 붙였다 떼었다 할 수 있을까요?';question.value=w.question;save();}),button('설명과 다음 질문 보내기',async e=>{
      const answer=reason.value.trim(),nextQuestion=question.value.trim();if(!answer||!nextQuestion){status.textContent='비교 결과 설명과 다음 질문을 모두 남겨 주세요.';return;}
      const trigger=e.currentTarget;trigger.disabled=true;w.reason=reason.value;w.question=question.value;save();
      const result=await check.check(answer);if(!alive)return;
      if(!result){trigger.disabled=false;return;}
      if(reason.value.trim()!==answer||question.value.trim()!==nextQuestion){status.textContent='방금 고친 설명과 질문을 다시 보내 주세요.';trigger.disabled=false;return;}
      record('workshop.completed','closure5',{reason:answer,answer:nextQuestion,ruleRevision:result.ruleRevision});sending=true;save();status.textContent='설명과 질문을 전달하고 있어요.';timer=setInterval(load,1500);load();
    }),el('p',{class:'muted'},'다음 질문에는 정답이 없어요. 설명 내용과 실제 실험은 선생님이 함께 살펴봐요.'),button('전지와 불빛 거리로',()=>go('power-1')));
  }catch(e){if(alive){status.textContent='기록을 확인하지 못했어요. 연결 상태를 확인해 주세요.';if(!root.querySelector('#summary-retry')){const retry=button('기록 다시 확인',load);retry.id='summary-retry';root.append(retry,button('전지와 불빛 거리로',()=>go('power-1')));}}}}
  load();return()=>{alive=false;check?.dispose();clearInterval(timer);};
}
