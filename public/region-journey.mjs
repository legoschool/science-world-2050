// 개인의 의뢰 추적만 바꾼다. 완료, 보상, 반 공동 목표는 이 모듈에서 바꾸지 않는다.
export const JOURNEY_REGIONS=[
  {key:'farm',code:'R1',title:'햇살 농장 지구',problem:'계절이 뒤섞여 농사 달력을 믿을 수 없어요. 태양과 계절의 단서를 찾아요.'},
  {key:'fire',code:'R2',title:'불꽃 에너지 지구',problem:'불이 제멋대로 번지는 시장에서 연소 조건과 안전한 대처를 살펴봐요.'},
  {key:'power',code:'R3',title:'전력망 지구',problem:'학교와 항구 사이 신호가 끊겼어요. 전기 회로를 조사해 불빛과 기계를 되살려요.'},
  {key:'future',code:'R4',title:'미래 연구 본부',problem:'척척의 주장에 근거가 있는지 확인하며 과학으로 해결할 일과 나의 역할을 찾아요.'},
  {key:'life',code:'R5',title:'푸른 생활 지구',problem:'몸, 빛, 자원과 에너지에 관한 생활 속 문제를 탐구해요.',extra:true}
];
export const regionForQuest=id=>JOURNEY_REGIONS.find(r=>String(id||'').startsWith(r.code+'-'))?.key||'';
export const selectedRegion=a=>JOURNEY_REGIONS.some(r=>r.key===a?.selectedRegion)?a.selectedRegion:a?.welcomed?regionForQuest(a.tracked):'';
// 저장 충돌에서도 신규 학생의 기본 추적값을 실제 지역 선택으로 간주하지 않는다.
export function mergeRegionJourney(remote,local){
  const remoteChoice=!!(remote.welcomed||remote.selectedRegion),localChoice=!!(local.welcomed||local.selectedRegion);
  if(remote.regionTracks||local.regionTracks)remote.regionTracks={...(local.regionTracks||{}),...(remote.regionTracks||{})};
  const chosen=remoteChoice?remote:localChoice?local:null,key=regionForQuest(chosen?.tracked);
  if(key){remote.selectedRegion=key;remote.tracked=chosen.tracked;(remote.regionTracks??={})[key]=chosen.tracked;}
}
export function rememberQuest(a,id){
  const key=regionForQuest(id);if(!key)return false;
  a.regionTracks??={};const previous=regionForQuest(a.tracked);if(previous&&(a.welcomed||a.selectedRegion===previous))a.regionTracks[previous]=a.tracked;
  a.selectedRegion=key;a.tracked=id;a.regionTracks[key]=id;return true;
}
export function regionQuest(a,key,quests=[]){
  const r=JOURNEY_REGIONS.find(r=>r.key===key);if(!r)return null;
  const list=quests.filter(q=>regionForQuest(q.id)===key).sort((a,b)=>a.id.localeCompare(b.id));
  const saved=a.regionTracks?.[key]||(a.welcomed&&regionForQuest(a.tracked)===key?a.tracked:'');
  const current=list.find(q=>q.id===saved);
  return current&&current.status!=='completed'?current:list.find(q=>q.status==='active')||list.find(q=>q.status!=='completed')||current||list[0]||null;
}
export function chooseRegion(a,key,quests){const q=regionQuest(a,key,quests);if(q)rememberQuest(a,q.id);return q;}

export function openRegionChoice({adventure,quests,onSelect,onClose=()=>{},first=false}){
  const existing=document.querySelector('.region-choice-dialog');if(existing){existing.focus();return {close:()=>existing.close()};}
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const button=(text,fn,cls='')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
  const d=el('dialog','adventure-dialog region-choice-dialog');d.setAttribute('aria-label','복구할 지역 고르기');
  const head=el('div','dlg-head');head.append(el('h2','',first?'어느 지역부터 도울까요?':'어느 지역을 도울까요?'),button('닫기',()=>d.close()));d.append(head,el('p','quest-story','지역마다 다른 주민의 부탁이 기다리고 있어요. 하던 의뢰는 보관되므로 다른 지역에 다녀와도 이어갈 수 있어요.'));
  const list=el('div','region-choice-list');d.append(list);
  for(const r of JOURNEY_REGIONS){
    const q=regionQuest(adventure,r.key,quests),row=el('section','quest-row region-choice');row.dataset.region=r.key;
    const title=el('h3','',r.title);row.append(title,el('p','',r.problem));
    if(r.extra)row.append(el('p','quest-place','생활 속 과학을 더 탐구할 수 있는 지역이에요.'));
    const regionQs=quests.filter(item=>regionForQuest(item.id)===r.key),completed=regionQs.filter(item=>item.status==='completed').length;
    row.append(el('p','quest-place',`해결한 의뢰 ${completed}/${regionQs.length}`));
    if(q){
      const continuing=q.status==='active'||adventure.regionTracks?.[r.key]===q.id;
      row.append(el('p','',`${continuing?'이어갈':'살펴볼'} 의뢰: ${q.title||q.place||'지역의 의뢰'}`));
      if(q.place)row.append(el('p','quest-place',q.place));
      const choose=button(r.title+(continuing?' 이어하기':' 선택'),()=>{d.close();onSelect(r.key,q);},'region-select');choose.setAttribute('aria-pressed',String(adventure.selectedRegion===r.key));row.append(choose);
    }else row.append(el('p','', '의뢰를 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.'));
    list.append(row);
  }
  d.addEventListener('close',()=>{d.remove();onClose();},{once:true});document.body.append(d);d.showModal();return {close:()=>d.close()};
}
