import {reviewStatus} from './record-export.mjs';
import {openLearningDashboard as showLearningDashboard} from './learning-dashboard.mjs';
export function openLearningDashboard(options = {}) {
  return showLearningDashboard({...options, onReview:options.onReview || (({student,classId}) => openTeaching({api:options.api,classId,initialStudent:student}))});
}
const el = (tag, props = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(props)) { if (k.startsWith('on')) n.addEventListener(k.slice(2),v); else if (k === 'class') n.className=v; else n.setAttribute(k,v); }
  for (const c of children.flat()) if (c != null) n.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return n;
};
const button = (s, fn) => el('button',{type:'button',onclick:fn},s);
const field = (s, input) => {if(!input.hasAttribute('aria-label'))input.setAttribute('aria-label',s);return el('label',{},el('span',{},s),input);};
const option = (v,s) => el('option',{value:v},s);
export async function openTeaching({api, classId, gameId, runId, uid, onTask, edition, kind = 'all', initialStudent = ''} = {}) {
  const d = el('dialog',{class:'teaching-dialog'}), body = el('div'), status = el('p',{role:'status'});
  d.append(button('닫기',()=>d.close()),el('h2',{},'선생님 활동과 피드백'),status,body);
  d.addEventListener('close',()=>d.remove(),{once:true}); document.body.append(d); d.showModal();
  let selected=initialStudent, data, filter=kind;
  const query = () => new URLSearchParams(Object.fromEntries(Object.entries({classId,gameId,runId,student:selected}).filter(([,v])=>v))).toString();
  const act = fn => async () => { try { await fn(); } catch(e) { status.textContent=(e.status>=400&&e.status<500&&e.message)||'연결을 확인한 뒤 다시 시도해 주세요.'; } };
  async function load() {
    data=await api('teaching?'+query()); if (!d.isConnected) return;
    if (data.staff && !selected && data.students.length) { selected=data.students[0].id; data=await api('teaching?'+query()); }
    draw();
  }
  function draw() { body.replaceChildren(); if (data.staff) {
    body.append(button('학습 대시보드',()=>openLearningDashboard({api,classId,gameId,runId,onReview:async value=>{selected=value.student;classId=value.classId;await act(load)();}})));
    editor(); reviewer();
  } else student(); }
  function editor() {
    let draft=null;
    const area=el('details',{},el('summary',{},'활동 등록과 차시 배정'));
    const title=el('input',{maxlength:100,required:''}), kind=el('select',{},option('custom','관찰 활동 만들기'),option('assignment','기존 과제 배정하기'));
    const place=el('select',{},data.catalog.map(m=>option(m.id,m.place))), question=el('textarea',{maxlength:600,required:''}), evidence=el('textarea',{maxlength:600,required:''});
    const published=el('input',{type:'checkbox'}), tasks=el('fieldset',{},el('legend',{},'함께 할 과제')), notice=el('p',{role:'status'});
    function choices(ids=[]) { tasks.replaceChildren(el('legend',{},'함께 할 과제')); const m=data.catalog.find(m=>m.id===place.value); for(const t of m?.tasks||[]) {const c=el('input',{type:'checkbox',value:t.id});c.checked=ids.includes(t.id);tasks.append(field(t.title+(t.optional?' (더 해보기)':''),c));} tasks.hidden=kind.value!=='assignment'; }
    place.onchange=()=>choices();kind.onchange=()=>choices();choices();
    const form=el('form',{},field('활동 제목',title),field('활동 종류',kind),field('학습 장소',place),field('관찰할 질문',question),field('제출할 근거',evidence),tasks,field('학생에게 게시하기',published),el('button',{type:'submit'},'활동 저장'),notice);
    function edit(a) {draft=a;title.value=a?.title||'';kind.value=a?.kind||'custom';place.value=a?.gameId||data.catalog[0]?.id;question.value=a?.question||'';evidence.value=a?.evidence||'';published.checked=!!a?.published;choices(a?.taskIds||[]);area.open=true;title.focus();}
    form.onsubmit=async e=>{e.preventDefault();try{const a=await api('teaching/activity',{classId,activity:{id:draft?.id,revision:draft?.revision||0,title:title.value,kind:kind.value,gameId:place.value,question:question.value,evidence:evidence.value,published:published.checked,taskIds:[...tasks.querySelectorAll('input:checked')].map(c=>c.value)}});draft=a;notice.textContent=a.published?'저장하고 게시했습니다.':'숨김 상태로 저장했습니다.';data.activities=data.activities.filter(x=>x.id!==a.id).concat(a);listing();}catch(e){notice.textContent=e.message}};
    const list=el('div'); function listing(){list.replaceChildren(...data.activities.map(a=>el('p',{},a.title+' / '+a.place+' / '+(a.published?'게시 중':'숨김'),button('수정',()=>edit(a)))));}
    listing();area.append(button('새 활동',()=>edit(null)),form,list);body.append(area);
  }
  const isWriteup=e=>e.kind==='writeup.submitted', isTransfer=e=>e.kind==='discovery.transfer'||e.kind==='mission.transfer';
  // 설명 글은 개념, 관찰과 자료, 연결, 용어를 따로 본다. 새 조건 적용은 그 응답에서만 본다. 나머지 과정 기록은 예전 네 항목을 쓴다.
  const RUBRIC={process:{prediction:'예상',control:'조건 비교',evidence:'근거 활용',revision:'설명 수정'},writeup:{concept:'과학 개념',data:'관찰과 자료 활용',link:'근거와 판단의 연결',terms:'핵심 용어 사용'},transfer:{transfer:'새 조건 적용'}};
  const SCALE={process:['0: 추가 도움이 필요함','1: 도움을 받아 수행함','2: 스스로 근거를 들어 수행함'],writeup:['0: 아직 드러나지 않음','1: 일부 드러남','2: 분명히 드러남']};
  function writeupDetail(e) {
    const p=e.payload,item=data.writeups?.[p.itemRevision];
    const same=data.events.filter(x=>isWriteup(x)&&x.payload.gameId===p.gameId&&x.payload.runId===p.runId).sort((a,b)=>a.received-b.received);
    const n=same.indexOf(e)+1,oral=p.mode==='oral_teacher';
    const crit=item?.criteria||{};
    return [
      el('p',{},el('b',{},'문항 '),item?.ask||p.taskTitle||''),
      item?.terms?.length?el('p',{},el('b',{},'꼭 넣을 말 '),item.terms.map(t=>t.word).join(', ')):'',
      el('p',{},el('b',{},'제출 '),`${n}번째 / ${oral?'선생님께 말로 설명하기로 함':'글로 씀'}`+(p.change?` / 학생이 적은 고친 점: ${p.change}`:'')),
      el('pre',{class:'teaching-evidence'},p.answer||(oral?'메모 없음':'')),
      p.evaluation==='core_keywords'?el('p',{},el('b',{},'게임 핵심어 판정 '),p.correct?'정답':'핵심어 보완 필요',el('br'),el('small',{},'제출 당시 핵심어와 같은 뜻의 표현을 확인한 결과입니다. 조사와 어미는 채점하지 않으며 교사 평가는 별도로 남깁니다.')):'',
      el('div',{},el('b',{},'근거로 고른 관찰'),p.evidence?.length?el('ul',{},p.evidence.map(c=>el('li',{},`${c.conditionText} → ${c.observation}`+(c.recorded===false?' (이 회차 탐구 기록에서 찾지 못함)':'')))):el('p',{},'고른 관찰이 없습니다.')),
      p.terms?.length?el('p',{},el('b',{},'낱말 자동 확인 '),p.terms.map(t=>`${t.word} ${t.used?'있음'+(t.form&&t.form!==t.word?`(${t.form})`:''):'없음'}`).join(', '),el('br'),el('small',{},'낱말이 글에 들어 있는지만 센 결과입니다. 바르게 썼는지는 아래 항목에서 선생님이 판단합니다.')):'',
      p.help?.includes('concept')?el('p',{},'쓰는 동안 「정리한 내용 다시 보기」를 열었습니다.'):'',
      p.help?.includes('initials')?el('p',{},'쓰는 동안 초성 힌트를 열었습니다.'):'',
      p.overlap>=20?el('p',{},`정리한 내용과 ${p.overlap}자가 그대로 겹칩니다. 자기 말로 다시 설명할 수 있는지 확인해 보세요.`):'',
      same.length>1?el('details',{},el('summary',{},`같은 의뢰에서 보낸 설명 ${same.length}개 차례로 보기`),...same.map((x,i)=>el('div',{class:'teaching-card'},el('strong',{},`${i+1}번째, ${new Date(x.received*1000).toLocaleString('ko-KR')}, ${reviewStatus(x)}`),el('pre',{class:'teaching-evidence'},x.payload.answer||'말로 설명하기'),x.teacherReview?.feedback?el('p',{},'보낸 피드백: '+x.teacherReview.feedback):''))):'',
      Object.keys(crit).length||item?.samples?el('details',{},el('summary',{},'평가 기준과 예시 답'),...Object.entries(RUBRIC.writeup).filter(([k])=>crit[k]).map(([k,v])=>el('p',{},el('b',{},v+' '),crit[k])),
        ...Object.entries({good:'충분한 설명 예',misconception:'낱말은 있으나 개념이 틀린 예',noTerms:'개념은 맞으나 낱말이 빠진 예'}).filter(([k])=>item?.samples?.[k]).map(([k,v])=>el('p',{},el('b',{},v+' '),item.samples[k]))):'',
    ];
  }
  function reviewer() {
    const students=el('select',{'aria-label':'확인할 학생'},data.students.map(s=>option(s.id,`${s.number}번 ${s.nickname}`)));students.value=selected;students.onchange=act(async()=>{selected=students.value;await load()});
    const kinds=el('select',{'aria-label':'기록 종류'},option('all','모든 제출 기록'),option('writeup','설명 쓰기'),option('transfer','새 조건 적용'));kinds.value=filter;kinds.onchange=()=>{filter=kinds.value;draw();body.querySelector('[aria-label="기록 종류"]')?.focus();};
    const events=data.events.filter(e=>e.task!=='resource'&&!e.kind.endsWith('.hint')&&(filter==='all'||(filter==='writeup'?isWriteup(e):isTransfer(e)))).reverse();
    const select=el('select',{'aria-label':'확인할 제출 기록'},events.map((e,i)=>option(String(i),`${new Date(e.received*1000).toLocaleString('ko-KR')} / ${e.payload.missionTitle||'탐구'} / ${e.payload.taskTitle||'탐구 기록'}${isWriteup(e)?` (${e.payload.version||1}번째)`:''} / ${reviewStatus(e)}`)));
    const pane=el('div');body.append(el('h3',{},'제출 기록 확인'),field('학생',students),field('기록 종류',kinds),field('제출 기록',select),pane);
    function show() {
      const e=events[Number(select.value)];pane.replaceChildren();if(!e){pane.append(el('p',{},filter==='all'?'제출 기록이 없습니다.':'이 종류의 제출 기록이 없습니다.'));return;}
      const r=e.teacherReview||{},p=e.payload,type=isWriteup(e)?'writeup':isTransfer(e)?'transfer':'process';
      const verdict=el('select',{},option('pending','확인 대기'),option('revise','보완 요청'),option('confirmed','교사 확인'),option('insufficient','판단 자료 부족'));
      const actual=el('select',{},option('unverified','실제 수행 확인 전'),option('observed','교사가 실제 수행을 관찰함'),option('not_applicable','실제 수행 해당 없음'));
      verdict.value=r.status||'pending';actual.value=r.actual||'unverified';
      const feedback=el('textarea',{maxlength:1000});feedback.value=r.feedback||'';
      const rubric={},scale=SCALE[type==='process'?'process':'writeup'];
      const scores=el('fieldset',{},el('legend',{},'관찰한 항목만 기록하기'));
      for(const [k,v] of Object.entries(RUBRIC[type])){const s=el('select',{},option('','관찰하지 않음'),...scale.map((t,i)=>option(String(i),t)));s.value=r.rubric?.[k]??'';rubric[k]=s;scores.append(field(v,s));}
      const saved=el('p',{role:'status'});
      const shown=type==='writeup'?writeupDetail(e):[el('p',{},p.activity?.question||''),el('pre',{class:'teaching-evidence'},[p.responseText||p.answer,p.reason,!p.responseText&&p.roles?Object.values(p.roles).join(', '):'',p.rows?Object.values(p.rows).join(', '):''].filter(Boolean).join('\n')||'조작 과정 기록')];
      pane.append(...shown,field('확인 상태',verdict),field('실제 수행',actual),scores,field('학생에게 보낼 피드백',feedback),button('확인 내용 저장',act(async()=>{e.teacherReview=await api('teaching/review',{eventId:e.id,revision:e.teacherReview?.revision||0,status:verdict.value,actual:actual.value,feedback:feedback.value,rubric:Object.fromEntries(Object.entries(rubric).filter(([,s])=>s.value!=='').map(([k,s])=>[k,Number(s.value)]))});saved.textContent='확인 내용이 저장되었습니다.';})),saved);
    }
    select.onchange=show;show();
  }
  function student() {
    if(!data.activities.length)body.append(el('p',{},'이 장소에 새로 배정된 활동은 없습니다.'));
    for(const a of data.activities) {
      const card=el('section',{class:'teaching-card'},el('h3',{},a.title),el('p',{},a.question),el('p',{},'남길 근거: '+a.evidence));
      if(a.kind==='assignment'&&(!onTask||edition!==a.contentRevision))card.append(el('p',{},'해당 장소의 의뢰 안에서 선생님 활동을 열어 과제를 골라 보세요. 목록이 다르면 선생님께 알려 주세요.'));
      if(a.kind==='assignment')for(const t of a.taskIds){const done=data.events.some(e=>e.kind==='mission.answered'&&e.payload.gameId===a.gameId&&e.payload.taskId===a.gameId+'.'+t&&e.payload.contentRevision===a.contentRevision&&e.payload.correct!==false);const label=a.taskTitles[t]+(done?' (제출함)':' (해 볼 활동)');card.append(onTask&&edition===a.contentRevision?button(label,()=>{d.close();onTask(t);}):el('p',{},label));}
      else {
        const key=`science-world:activity:${uid}:${runId}:${a.id}:${a.revision}`;
        let draft={answer:'',id:crypto.randomUUID()};try{draft=JSON.parse(localStorage.getItem(key))||draft;}catch{}
        const input=el('textarea',{maxlength:2000,'aria-label':a.title+' 관찰 근거'}),msg=el('p',{role:'status'});input.value=draft.answer;
        input.oninput=()=>{draft.answer=input.value;try{localStorage.setItem(key,JSON.stringify(draft));msg.textContent='작성 내용을 이 기기에 보관했어요.';}catch{msg.textContent='이 기기에 보관하지 못했어요. 창을 닫기 전에 제출해 주세요.';}};
        const submit=button('관찰 근거 제출',async()=>{submit.disabled=true;try{await api('teaching/submit',{id:draft.id,activityId:a.id,revision:a.revision,runId,answer:input.value});localStorage.removeItem(key);msg.textContent='선생님께 제출했어요.';draft={answer:input.value,id:crypto.randomUUID()};}catch(e){msg.textContent=e.message;}finally{submit.disabled=false;}});
        card.append(field('관찰한 내용과 근거',input),submit,msg);
      }
      body.append(card);
    }
    body.append(el('h3',{},'선생님 피드백'));
    const reviewed=data.events.filter(e=>e.teacherReview);
    if(!reviewed.length)body.append(el('p',{},'아직 도착한 피드백이 없습니다.'));
    for(const e of reviewed)body.append(el('article',{class:'teaching-card'},el('strong',{},e.payload.taskTitle||'탐구 기록'),el('p',{},reviewStatus(e)),el('p',{},e.teacherReview.feedback||'선생님이 기록을 확인했어요.'),
      isWriteup(e)&&['revise','insufficient'].includes(e.teacherReview.status)?el('p',{},`「${e.payload.missionTitle||'의뢰'}」 의뢰 마무리 화면의 「내가 쓴 설명」에서 고쳐 쓸 수 있어요.`):''));
  }
  await act(load)();
}
