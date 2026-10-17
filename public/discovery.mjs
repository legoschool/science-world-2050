// A short investigation inside the mission. Initial ideas and help carry no penalty.
// 탐색 → 같이 정리하기(돌아보기) → 자기 말로 설명하기(writeup, 문항이 있는 의뢰만) → 새 조건 적용 순서로 간다.
import {writeupView} from './writeup.mjs';
import {learningSupport,termHints} from './learning-support.mjs';
const INQUIRY_HELP={
  sun:{goal:'막대 높이를 같게 두고 태양 고도에 따른 그림자 길이를 비교해요.',terms:[{word:'태양 고도',clue:'해가 뜬 높이'},{word:'그림자',clue:'빛이 가려져 생기는 것'}]},
  air:{goal:'시간과 공기 통로를 바꾸어 연소에 필요한 조건을 알아봐요.',terms:[{word:'산소',clue:'물질이 계속 탈 때 충분히 필요한 것'},{word:'공급',clue:'필요한 것이 계속 들어오는 것'}]},
  circuit:{goal:'스위치와 전구의 접점을 살펴 불이 켜지는 전기 회로를 만들어요.',terms:[{word:'꼭지',clue:'전구 아래쪽 금속 접점'},{word:'꼭지쇠',clue:'전구 옆면의 금속 접점'},{word:'전기 회로',clue:'전기가 흐를 수 있게 연결한 길'}]},
  evidence:{goal:'원래 자료와 비교 조건을 확인해 주장에 근거가 있는지 판단해요.',terms:[{word:'원래 자료',clue:'제목이 나온 처음 기록'},{word:'비교 조건',clue:'두 시험에서 같게 둬야 할 것'}]},
  insulation:{goal:'처음과 나중의 온도를 비교해 단열재의 역할을 설명해요.',terms:[{word:'단열재',clue:'집에서 열이 빠져나가는 것을 줄이는 재료'},{word:'열의 이동',clue:'단열재가 줄이는 것'}]}
};
export function discovery(host,{el,button,config,ms,save,record,api,id,uid,runId,version,revision,done,preview=false,writeup=null}) {
  const d=ms.discovery??={phase:'explore',choices:Object.fromEntries(config.controls.map(c=>[c.id,c.options[0].id])),trials:[],prediction:''};
  let alive=true,busy=false,stopSub=()=>{};
  const draftKey=`science-inquiry-draft:${uid}:${runId}:${id}:${revision}`;
  let drafts={};try{drafts=JSON.parse(localStorage.getItem(draftKey)||'{}');}catch{}
  const draftValue=key=>drafts[key]??d[key]??'';
  function storeDrafts(){try{localStorage.setItem(draftKey,JSON.stringify(drafts));}catch{status.textContent='이 기기에 작성 중인 글을 저장하지 못했어요. 저장 환경을 확인해 주세요.';}}
  const payload=extra=>({gameId:id,runId,gameVersion:version,contentRevision:revision,...extra});
  const remember=(kind,extra)=>{if(!preview)record('discovery.'+kind,'discovery',payload(extra));save();};
  const status=el('p',{class:'discovery-status',role:'status'});
  async function act(fn) {
    if(busy||!alive)return;busy=true;host.setAttribute('aria-busy','true');
    // 서버가 알려 준 안내(400대)만 그대로 보이고, 연결 끊김이나 서버 오류의 영문 메시지는 학생에게 보이지 않는다.
    try{await fn();}catch(e){if(alive)status.textContent=(e.status>=400&&e.status<500&&e.message)||'연결을 확인한 뒤 다시 시도해 주세요.';}
    finally{busy=false;host.removeAttribute('aria-busy');}
  }
  function prediction(){if(d.predicted)return;d.prediction=draftValue('prediction');remember('predicted',{answer:d.prediction});d.predicted=true;delete drafts.prediction;storeDrafts();save();}
  function support(type){remember('support',{answer:type});}
  async function trial() {
    const roles={...d.choices};
    const result=await api('discovery-check',{kind:'discovery.trial',payload:payload({roles})});
    if(!alive)return;
    prediction();remember('trial',{roles});
    d.trials.push({roles,...result});d.trials=d.trials.slice(-8);save();render();
    status.textContent=result.observation;
  }
  function summarize(){prediction();support('explain');d.phase='reflect';save();render();}
  function textInput(label,key){const n=el('textarea',{'aria-label':label,maxlength:300,rows:2});n.value=draftValue(key);n.oninput=()=>{drafts[key]=n.value;storeDrafts();};return el('label',{},el('span',{},label),n);}
  function history(open=d.trials.length>0){
    const h=el('details',{class:'discovery-history'},el('summary',{},`내 관찰 나란히 보기 (${d.trials.length})`));
    h.open=open;
    const list=el('div',{class:'discovery-observations'});
    d.trials.forEach((t,i)=>{const card=el('figure',{},scene(t.view,t.observation),el('figcaption',{},`${i+1}. ${t.conditionText}`,el('p',{},t.observation)));list.append(card);});
    if(!d.trials.length)list.append(el('p',{},'아직 관찰 전이에요. 설명을 보고 다시 실험해도 좋아요.'));
    h.append(list);return h;
  }
  function render(){
    stopSub();stopSub=()=>{};
    if(d.phase==='writeup'&&!writeup?.item)d.phase='transfer';
    host.className='discovery';host.dataset.phase=d.phase;
    const guide={explore:'조건을 바꾸어 관찰해요. 준비되면 「같이 정리하기」를 눌러요.',reflect:'관찰을 비교한 뒤 아래에서 지금 내 생각을 골라요.',writeup:'관찰을 근거로 설명을 보내거나 선생님께 말로 설명하기를 골라요.',transfer:'새 상황에서 할 일을 골라요. 확인한 뒤 「단서를 가지고 의뢰 이어가기」로 가요.'};
    host.replaceChildren(el('h2',{tabindex:-1},config.title),el('p',{class:'discovery-problem'},config.problem),el('p',{class:'discovery-safety'},config.safety),el('p',{class:'discovery-next-guide'},guide[d.phase]||guide.transfer));
    const help=INQUIRY_HELP[config.kind];
    if(help&&d.phase!=='writeup')host.append(learningSupport(el,{goal:help.goal}));
    status.textContent='';
    if(d.phase==='explore'){
      const last=d.trials.at(-1),stage=el('section',{class:'discovery-bench','aria-label':'현장 탐구'});
      stage.append(scene(last?.view,last?.observation||'조건을 고르고 현장을 살펴보세요.'));
      stage.append(el('p',{},last?'마지막 관찰: '+last.conditionText:'조건을 고른 뒤 「이 조건으로 관찰하기」를 눌러요.'));
      stage.append(el('p',{},'지금 고른 조건: '+config.controls.map(c=>c.label+' '+(c.options.find(o=>o.id===d.choices[c.id])?.label||'선택 전')).join(' / ')));
      const controls=el('div',{class:'discovery-controls'});
      for(const c of config.controls){
        if(c.advanced&&!d.advanced)continue;
        const group=el('fieldset',{},el('legend',{},c.label));
        for(const o of c.options){const b=button(o.label,()=>{if(busy)return;d.choices[c.id]=o.id;save();render();host.querySelector(`[data-control="${c.id}-${o.id}"]`)?.focus();});b.dataset.control=c.id+'-'+o.id;b.setAttribute('aria-pressed',String(d.choices[c.id]===o.id));group.append(b);}
        controls.append(group);
      }
      stage.append(controls,button('이 조건으로 관찰하기',()=>act(trial),'discovery-primary'));
      host.append(stage);
      if(!d.predicted)host.append(el('p',{},config.prompt),textInput('내 예상 (떠오르면 적어 주세요)','prediction'));
      else host.append(el('p',{class:'discovery-recall'},'처음 내 생각: '+(d.prediction||'관찰하면서 생각하기')));
      const actions=el('div',{class:'discovery-actions'},button('관찰 단서',()=>act(()=>{support('clue');d.clue=true;save();render();})),button('같이 정리하기',()=>act(summarize)));
      if(config.controls.some(c=>c.advanced))actions.prepend(button(d.advanced?'조건 줄이기':'조건 더 바꾸기',()=>act(()=>{d.advanced=!d.advanced;if(!d.advanced){for(const c of config.controls.filter(c=>c.advanced))d.choices[c.id]=c.options[0].id;support('focus');}save();render();})));
      host.append(actions);
      if(d.clue)host.append(el('p',{class:'discovery-clue'},config.clue));
      const repeated=d.trials.length>=2&&JSON.stringify(d.trials.at(-1).roles)===JSON.stringify(d.trials.at(-2).roles);
      if(repeated)host.append(el('p',{class:'discovery-clue'},'같은 조건을 다시 확인했네요. 한 조건만 바꾸어 볼까요? 단서를 보거나 함께 정리해도 좋아요.'));
      else if(d.trials.length)host.append(el('p',{},'다른 조건도 살펴보고 관찰을 나란히 비교해 보세요. 준비되면 같이 정리해요.'));
      host.append(history());
    }else if(d.phase==='reflect'){
      host.append(el('p',{class:'discovery-recall'},'처음 내 생각: '+(d.prediction||'관찰하면서 생각하기')),history(),el('section',{class:'discovery-explanation'},el('h3',{},'관찰과 생각을 이어 보아요'),el('p',{},config.explanation)),textInput('내 관찰 중 근거가 된 것 또는 더 궁금한 것 (선택)','reason'));
      const group=el('fieldset',{},el('legend',{},'다시 보니 내 생각은'));
      for(const [value,label] of [['changed','생각을 바꾸었어요'],['kept','근거를 찾아 생각을 유지해요'],['unsure','더 확인하고 싶어요']])group.append(button(label,()=>act(()=>{d.reason=draftValue('reason');remember('reflection',{answer:value,reason:d.reason});delete drafts.reason;storeDrafts();d.reflection=value;d.phase=writeup?.item&&!ms.writeup?.versions?.length?'writeup':'transfer';save();render();host.querySelector('h2').focus();})));
      host.append(group,button('현장으로 돌아가 더 실험하기',()=>{d.phase='explore';save();render();}));
    }else if(d.phase==='writeup'){
      const box=el('div',{class:'discovery-writeup'});host.append(box);
      stopSub=writeupView(box,{el,button,api,record,save,ms,wu:writeup,trials:d.trials,uid,runId,gameId:id,preview,
        nextLabel:'새 조건에 적용해 보기',onNext:()=>{d.phase='transfer';save();render();host.querySelector('h2').focus();},
        onObserve:()=>{d.phase='explore';save();render();host.querySelector('h2').focus();}});
    }else{
      host.append(el('h3',{},'다른 곳에서도 통할까요?'),el('p',{},config.transfer.question),textInput('그렇게 생각한 까닭 (선택)','transferReason'),el('p',{},'아래에서 내 생각과 맞는 것을 하나 골라 확인해요.'));
      for(const o of config.transfer.options)host.append(button(o.label,()=>act(async()=>{
        const p={answer:o.id,reason:draftValue('transferReason')};const result=await api('discovery-check',{kind:'discovery.transfer',payload:payload(p)});
        if(!alive)return;remember('transfer',p);d.transferReason=p.reason;delete drafts.transferReason;storeDrafts();d.transferAnswer=o.id;d.transferFeedback=result.feedback;d.transferPassed=result.correct===true;save();render();status.textContent=result.feedback;
      })));
      if(d.transferFeedback)host.append(el('p',{class:'discovery-clue'},d.transferFeedback));
      host.append(history(false),el('details',{class:'discovery-explanation'},el('summary',{},'관찰로 정리한 개념 다시 보기'),el('p',{},config.explanation)));
      host.append(button('내 관찰과 설명 다시 보기',()=>{d.phase='reflect';save();render();}));
      if(writeup?.item)host.append(button(ms.writeup?.versions?.length?'내가 쓴 설명 보기':'설명 쓰기',()=>{d.phase='writeup';save();render();host.querySelector('h2').focus();}));
      if(d.transferPassed)host.append(button('단서를 가지고 의뢰 이어가기',()=>{if(busy)return;d.complete=true;save();done();},'discovery-primary'));
    }
    if(help&&d.phase!=='writeup')host.append(termHints(el,help.terms,()=>support('clue')));
    host.append(status);
  }
  const scene=(view,description)=>drawScene(el,config.kind,view,description);
  render();return ()=>{alive=false;stopSub();};
}
// 탐구 장면 그림. 설명 쓰기(writeup.mjs)에서도 학생이 본 관찰 카드를 같은 그림으로 보여 준다.
export function drawScene(el,kind,view={},description=''){
    view=view||{};
    const cv=el('canvas',{width:620,height:320,role:'img','aria-label':description||'관찰 전의 탐구 장소'});
    const c=cv.getContext('2d');c.fillStyle='#142a3d';c.fillRect(0,0,620,320);
    const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
    const line=(pts,col='#aec1d2',w=5)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
    const circle=(x,y,r,col)=>{c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
    const label=(s,x,y,col='#f2f6fc')=>{c.fillStyle=col;c.font='18px sans-serif';c.textAlign='center';c.fillText(s,x,y);};
    if(!Object.keys(view).length){label('아직 관찰하기 전이에요',310,140);label('조건을 고르고 「이 조건으로 관찰하기」를 눌러요',310,184);return cv;}
    rect(0,268,620,52,'#344c4b');
    if(kind==='sun'){
      const h=view.height||74,L=view.length||170,x=300,y=264,sx=240,sy=y-h*(L+x-sx)/L;
      circle(140,view.high?60:146,22,'#ffe18a');rect(x,y-4,L,8,'#09171e');line([[sx,sy],[x+L,y]],'#edcf8b',2);rect(x-5,y-h,10,h,'#c49161');
      label('그늘이 생기는 자리',450,306);label('그림자 길이를 비교해 보세요',310,28);
    }else if(kind==='air'){
      rect(250,204,120,62,'#9faabc');line([[240,248],[240,100],[380,100],[380,248]],'#91b9d4',5);
      if(view.open){rect(276,92,68,17,'#142a3d');label('공기 통로 열림',310,72);}else label('공기 통로 닫힘',310,72);
      if(view.lit){c.fillStyle='#ffbd52';c.beginPath();c.moveTo(310,135);c.bezierCurveTo(260,205,340,221,332,179);c.closePath();c.fill();}else line([[305,193],[316,173],[309,157]],'#7991a2',3);
      label(view.lit?'불꽃이 있어요':'불꽃이 없어요',310,303);
    }else if(kind==='circuit'){
      if(view.lit){circle(445,142,92,'#5e5535');rect(478,248,120,20,'#dac18a');}else rect(478,248,120,20,'#1a272e');
      rect(70,163,80,77,'#7399c0');label('+',110,180);label('−',110,229);
      circle(420,145,39,view.lit?'#ffe48a':'#738591');rect(405,184,30,35,'#bdc5c9');rect(415,219,10,10,'#81919b');
      line([[110,164],[110,65],[237,65]],'#e6a878');line([[278,65],[475,65],[475,237],[420,237],[420,229]],'#e6a878');
      line([[237,65],[278,view.closed?65:40]],'#f3deb6');
      line([[110,241],[110,254],[360,254],[360,view.contact==='side'?199:145],[view.contact==='side'?405:381,view.contact==='side'?199:145]],'#9bc9e0');
      label(view.closed?'스위치 닫힘':'스위치 열림',258,30);label(view.lit?'길이 밝아졌어요':'어두운 비상 통로',495,305);
      label('전지',110,300);
      label('유리',495,126);label('꼭지쇠',532,197);label('꼭지',514,238);
      line([[470,121],[452,133]],'#cbd5de',1);line([[486,193],[437,200]],'#cbd5de',1);line([[485,233],[428,223]],'#cbd5de',1);
    }else if(kind==='evidence'){
      rect(105,48,410,205,'#f3eedb');rect(125,67,370,38,'#2b5367');label('새 분류 장치가 더 빠르다?',310,94);
      if(view.source){label(view.oldRecord,310,145,'#273e4a');label(view.newRecord,310,177,'#273e4a');label('같은 종류의 물건을 분류했어요',310,217,'#273e4a');}
      else {label('전해 들은 제목뿐이에요',310,158,'#273e4a');label('누가, 어떻게 비교했을까요?',310,203,'#273e4a');}
      label(view.ready?'확인한 조건을 함께 알리기':'주민에게 알리기 전에 더 확인하기',310,300);
    }else{
      c.fillStyle='#6383a1';c.beginPath();c.moveTo(175,122);c.lineTo(310,42);c.lineTo(445,122);c.closePath();c.fill();
      rect(195,122,230,142,view.insulated?'#d2ae70':'#8aa2b5');rect(213,135,194,129,'#465f72');rect(285,195,48,69,'#a7bacb');
      label(view.insulated?'단열재 있음':'단열재 없음',310,163);label(view.temperature===undefined?'온도를 관찰해 보세요':view.temperature.toFixed(1)+' °C',310,303);
    }
    return cv;
}
