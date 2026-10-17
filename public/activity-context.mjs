// 화면 문구나 응답 원문 대신 현재 활동의 식별자만 시간 수집기에 전달한다.
export function activityContext({user,state,view,root=document}) {
  const enabled=!!(user?.role==='student'&&!user.guest&&!user.test&&state?.runId&&!['login','teacher','avatar'].includes(view));
  const base={enabled,userId:user?.id||'',runId:state?.runId||''};
  if(!enabled)return {...base,gameId:'WORLD',taskId:'inactive'};
  // 가방·닉네임·설정 창을 보는 시간을 뒤에 가려진 학습 단계에 더하지 않는다.
  if(root.querySelector('dialog[open]'))base.enabled=false;
  const mission=root.querySelector('.mission[data-game]');
  if(mission){
    const phase=mission.querySelector('.discovery')?.dataset.phase;
    return {...base,gameId:mission.dataset.game,taskId:phase?'discovery:'+phase:mission.dataset.task||'intro'};
  }
  const dedicated=[...root.querySelectorAll('[data-learning-game][data-learning-stage]')].at(-1);
  if(dedicated)return {...base,gameId:dedicated.dataset.learningGame,taskId:dedicated.dataset.learningStage};
  if(view==='lab')return {...base,gameId:'R3-G04',taskId:'T'+String(Math.min(state.step||0,7)+1).padStart(2,'0')};
  return {...base,gameId:'WORLD',taskId:String(state.travel?.map||'hub').replace(/[^A-Za-z0-9._:-]/g,'').slice(0,80)||'hub'};
}
