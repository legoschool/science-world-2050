import {answerHint} from './answer-support.mjs';

// 완료 기록을 보내기 전에 같은 판의 핵심어 규칙으로 확인한다.
export function closureAnswer({el,button,api,gameId,draft,record,save,isActive=()=>true}){
  let alive=true;
  const status=el('p',{role:'status'}),payload=()=>({gameId,taskId:'CLOSURE',...(draft.ruleRevision?{ruleRevision:draft.ruleRevision}:{})});
  const hint=answerHint({el,button,api,payload,isActive:()=>alive&&isActive(),onHint:r=>{draft.ruleRevision=r.ruleRevision;draft.answerHint=1;save();}});
  const node=el('section',{class:'closure-answer'},el('p',{},'관찰에 맞는 핵심 낱말이 들어 있는지 확인해요. 조사와 어미나 문장 모양은 달라도 괜찮아요.'),hint.node,status);
  return {node,async check(answer){
    status.textContent='설명의 핵심 내용을 확인하고 있어요.';
    try{
      const result=await api('answer-check',{...payload(),answer});
      if(!alive||!isActive())return null;
      draft.ruleRevision=result.ruleRevision;save();
      record('answer.submitted','answer',{gameId,taskId:'CLOSURE',answer,ruleRevision:result.ruleRevision,hint:draft.answerHint||0});
      status.textContent=result.answerFeedback|| (result.correct?'관찰에 맞는 핵심 내용을 담았어요.':'관찰 기록과 초성 힌트를 보고 설명을 보완해 주세요.');
      if(!result.correct){hint.offer();return null;}
      return result;
    }catch(error){if(alive&&isActive())status.textContent=error.status>=400&&error.status<500?error.message:'확인하지 못했어요. 작성한 설명은 그대로 있어요. 연결을 확인하고 다시 보내 주세요.';return null;}
  },dispose(){alive=false;hint.dispose();}};
}
