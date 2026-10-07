import './compat.mjs';
import {openTeaching} from './teaching-ui.mjs';
// 선생님·관리자용 학급 관리 화면. 학생 명부, 접속 코드 발급, 마을 인물(NPC), 학습 자료 링크, 반 친구 게시판 관리.
import {getAvatarSheet,FW,FH,drawFrame,cleanAvatar,preloadLook} from '/sprites.mjs';
import {PRESETS,randomAvatar,sanitizeAvatar} from '/vendor/shared/avatar.mjs';
import {dexIcon} from '/dex-icons.mjs';

const root=document.querySelector('#admin'),who=document.querySelector('#who'),topnav=document.querySelector('#topnav'),printArea=document.querySelector('#print-area');
const QUESTS=[['R3-G04','관리실 빛 자물쇠'],['R3-G05','가린 회로 추리'],['R3-G06','부두 전자석 공방']];
const S={me:null,overview:null,classId:null,tab:'roster',regions:{},defaults:[],mapSize:id=>id==='hub'?{w:1920,h:1280}:{w:960,h:640},npcRows:[],editing:null,lastCreated:null,printed:true};

function el(tag,props={},...children){
  const n=document.createElement(tag);
  for(const[k,v]of Object.entries(props)){
    if(v===undefined||v===null||v===false)continue;
    if(k==='class')n.className=v;
    else if(k==='text')n.textContent=v;
    else if(k.startsWith('on')&&typeof v==='function')n.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k==='value'||k==='checked')n[k]=v;
    else n.setAttribute(k,v===true?'':String(v));
  }
  for(const c of children.flat()){if(c!==null&&c!==undefined&&c!==false)n.append(typeof c==='string'||typeof c==='number'?document.createTextNode(String(c)):c)}
  return n;
}
const button=(text,fn,cls='',disabled=false)=>el('button',{type:'button',class:cls,onclick:fn,disabled},text);
function toast(text,kind='ok'){const n=document.querySelector('#toast');n.textContent=text;n.className='show '+kind;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{n.className=''},5000)}
async function api(path,data){
  const r=await fetch('/api/'+path,{credentials:'same-origin',headers:data?{'Content-Type':'application/json','X-Science-Client':'local-v1'}:{},method:data?'POST':'GET',body:data?JSON.stringify(data):undefined});
  let j={};try{j=await r.json()}catch{}
  if(!r.ok){const e=new Error(j.error||'요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');e.status=r.status;throw e}
  return j;
}
// 버튼 동작 공통 처리: 접속이 끊기면 로그인 화면으로, 나머지 오류는 알림으로.
const guard=fn=>async(...args)=>{try{await fn(...args)}catch(err){if(err.status===401){S.me=null;renderLogin();toast('접속이 끝났습니다. 다시 접속해 주세요.','error')}else toast(err.message,'error')}};

function avatarCanvas(av,scale=2,cls='av'){
  // 그림 캐릭터(look)와 조립 캐릭터를 같은 64×80 칸에 발끝 기준으로 그린다
  const c=el('canvas',{width:64*scale,height:80*scale,class:cls,role:'img','aria-label':'아바타 모습'});
  const paint=()=>{const ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;ctx.setTransform(scale,0,0,scale,0,0);try{drawFrame(ctx,getAvatarSheet(cleanAvatar(av)),32,76)}catch{}};
  paint();if(av?.look>0)preloadLook(av.look).then(paint);
  return c;
}
function formatTime(sec){
  if(!sec)return '기록 없음';
  const d=new Date(sec*1000),now=new Date(),hm=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return d.toDateString()===now.toDateString()?`오늘 ${hm}`:`${d.getMonth()+1}월 ${d.getDate()}일 ${hm}`;
}
const currentClass=()=>S.overview?.classes.find(c=>c.id===S.classId)||null;
const isAdmin=()=>S.me?.role==='admin';
const classParam=()=>isAdmin()?{classId:S.classId}:{};

// ------------------------------------------------------------------ 대화 상자
function modal(title,content,actions){
  return new Promise(resolve=>{
    const d=el('dialog',{class:'dlg','aria-label':title});
    const finish=v=>{if(d.open)d.close();d.remove();resolve(v)};
    const row=el('div',{class:'actions'});
    for(const a of actions){
      const b=button(a.label,async()=>{
        if(!a.run)return finish(a.value??null);
        b.disabled=true;
        try{const r=await a.run();if(r!==undefined)finish(r)}catch(err){toast(err.message,'error')}finally{b.disabled=false}
      },a.cls||'');
      row.append(b);
    }
    const form=el('form',{method:'dialog',onsubmit:e=>{e.preventDefault();row.lastChild?.click()}},el('h2',{},title),...[content].flat().filter(Boolean),row);
    d.append(form);
    d.addEventListener('cancel',e=>{e.preventDefault();finish(null)});
    document.body.append(d);d.showModal();
    d.querySelector('input,textarea,select')?.focus();
  });
}
const confirmBox=(title,text,okLabel,cls='danger')=>modal(title,el('p',{},text),[{label:'취소',cls:'secondary',value:false},{label:okLabel,cls,value:true}]);
function showCode(title,code,note,card){
  const actions=[{label:'닫기',cls:'secondary',value:true}];
  if(card)actions.unshift({label:'카드 인쇄',cls:'secondary',run:()=>{printCards(card.cls,[{...card.student,code}]);return undefined}});
  return modal(title,[el('p',{class:'bigcode'},code),el('p',{class:'note'},note)],actions);
}

// ------------------------------------------------------------------ 인쇄용 접속 카드
function accessUrl(){const lan=S.overview?.lan;return lan?.enabled&&lan.urls?.length?lan.urls[0]:location.origin+'/'}
function codeCards(cls,list){
  const url=accessUrl();
  return el('div',{class:'cards'},...list.map(s=>el('article',{class:'codecard'},
    el('div',{class:'cc-class'},`${cls.grade}학년 ${cls.room}반 ${s.number}번`),
    el('div',{class:'cc-nick'},s.nickname),
    el('div',{class:'cc-label'},'접속 코드'),el('div',{class:'cc-code'},s.code),
    el('div',{class:'cc-label'},'접속 주소'),el('div',{class:'cc-url'},url))));
}
function printCards(cls,list){
  printArea.replaceChildren(el('p',{class:'print-title'},`${cls.name} 접속 카드`),codeCards(cls,list));
  S.printed=true;window.print();
}
window.addEventListener('beforeunload',e=>{if(!S.printed){e.preventDefault();e.returnValue=''}});

// ------------------------------------------------------------------ 로그인
function setTopnav(){
  const items=[el('a',{class:'linkbtn',href:'/'},'게임 화면으로'),el('a',{class:'linkbtn',href:'/manual.html',target:'_blank',rel:'noopener'},'사용설명서')];
  if(S.me){
    if(S.me.role==='teacher')items.push(button('내 코드 바꾸기',guard(changeOwnCode),'secondary'));
    items.push(button('로그아웃',guard(logout),'secondary'));
  }
  topnav.replaceChildren(...items);
}
function renderLogin(){
  who.textContent='';S.me=null;setTopnav();
  const code=el('input',{id:'code',autocomplete:'off',autocapitalize:'characters',spellcheck:'false',placeholder:'예: CEDAR-WAVE-2345'});
  const submit=el('button',{type:'submit',class:'big'},'들어가기');
  const form=el('form',{class:'card narrow',onsubmit:async e=>{
    e.preventDefault();submit.disabled=true;
    try{S.me=await api('login',{code:code.value});await route()}
    catch(err){toast(err.message,'error');code.select()}
    finally{submit.disabled=false}
  }},el('h1',{},'선생님 접속'),el('p',{class:'muted'},'선생님 또는 관리자 접속 코드를 입력해 주세요.'),el('label',{for:'code'},'접속 코드'),code,el('div',{class:'actions'},submit));
  root.replaceChildren(form);code.focus();
  // 새로 연 주소에 관리자가 없으면, 처음 한 번만 관리자 코드를 만들어 보여 준다.
  api('setup').then(({needed})=>{
    if(!needed||!form.isConnected)return;
    const make=button('관리자 코드 만들기',guard(async()=>{
      make.disabled=true;
      try{
        const {code:made}=await api('setup',{});
        setup.remove();
        await showCode('관리자 코드',made,'이 코드는 다시 볼 수 없습니다. 종이에 적어 둔 뒤 아래 칸에 넣고 들어가세요. 들어가면 「새 학급 만들기」로 학급과 담임 선생님 코드를 만듭니다.');
        code.focus();
      }finally{make.disabled=false}
    }),'big');
    const setup=el('section',{class:'card narrow'},el('h1',{},'처음 설정'),el('p',{},'이 주소에는 아직 관리자 코드가 없습니다. 단추를 누르면 관리자 코드가 한 번 만들어져 화면에 나옵니다.'),el('div',{class:'actions'},make));
    root.prepend(setup);
  }).catch(()=>{});
}
function renderStudentNotice(){
  who.textContent=S.me.nickname;setTopnav();
  root.replaceChildren(el('section',{class:'card narrow'},el('h1',{},'이 화면은 선생님용입니다.'),el('p',{},'학생은 게임 화면에서 탐험을 이어 가면 됩니다.'),
    el('div',{class:'actions'},el('a',{class:'linkbtn big',href:'/'},'게임 화면으로 가기'),button('다른 코드로 접속',guard(logout),'secondary big'))));
}
async function logout(){
  if(!S.printed&&!(await confirmBox('로그아웃','방금 만든 접속 코드를 아직 인쇄하지 않았습니다. 이 화면을 떠나면 코드를 다시 볼 수 없습니다.','그래도 로그아웃')))return;
  try{await api('logout',{})}catch{}
  S.me=null;S.overview=null;S.lastCreated=null;S.printed=true;renderLogin();
}
async function changeOwnCode(){
  if(!(await confirmBox('내 접속 코드 바꾸기','새 접속 코드를 만듭니다. 예전 코드로는 더 이상 들어올 수 없고, 이 화면은 그대로 쓸 수 있습니다. 새 코드를 잃어버리면 관리자가 다시 만들어야 합니다.','새 코드 만들기','')))return;
  const {code}=await api('admin/me/reset-code',{});
  await showCode('내 새 접속 코드',code,'이 코드는 지금 한 번만 보입니다. 다음 접속부터 이 코드를 입력합니다.');
}

// ------------------------------------------------------------------ 전체 화면
async function loadOverview(){
  S.overview=await api('admin/overview');S.me=S.overview.me;
  const ids=S.overview.classes.map(c=>c.id);
  if(!ids.includes(S.classId))S.classId=ids[0]||null;
}
async function route(){
  if(!S.me)return renderLogin();
  if(S.me.role==='student')return renderStudentNotice();
  try{await loadOverview()}catch(err){if(err.status===401)return renderLogin();root.replaceChildren(el('section',{class:'card narrow'},el('p',{},err.message)));return}
  renderApp();
}
function renderApp(){
  const me=S.me;
  who.textContent=me.role==='admin'?'관리자':`${me.grade}학년 ${me.room}반 ${me.nickname}`;setTopnav();
  root.replaceChildren(el('div',{id:'classbar'}),el('div',{class:'tabs',role:'tablist',id:'tabs'}),el('div',{id:'panel'}));
  renderClassBar();renderTabs();renderPanel();
}
function renderClassBar(){
  const bar=document.querySelector('#classbar');if(!bar)return;
  const cl=currentClass();
  const count=cl?cl.students.filter(s=>s.active).length:0,resting=cl?cl.students.length-count:0;
  const summary=cl?el('p',{class:'muted'},`학생 ${count}명`+(resting?`, 쉬는 학생 ${resting}명`:'')):null;
  if(!isAdmin()){bar.replaceChildren(el('div',{class:'classhead'},el('h1',{},cl?cl.name:'학급 정보가 없습니다.'),summary));return}
  const select=el('select',{id:'class-select','aria-label':'학급 고르기',onchange:guard(async()=>{S.classId=select.value;S.editing=null;S.resEditing=null;renderClassBar();renderTabs();await renderPanel()})},
    ...S.overview.classes.map(c=>el('option',{value:c.id},`${c.name} (학생 ${c.students.filter(s=>s.active).length}명)`+(c.teacher?'':', 선생님 계정 없음'))));
  select.value=S.classId||'';
  const open=document.querySelector('#create-class');
  const createArea=open&&open.childElementCount?open:el('div',{id:'create-class'}); // 자동 새로 고침 때 입력 중인 양식을 지우지 않는다
  bar.replaceChildren(el('div',{class:'classhead'},
    el('div',{class:'classpick'},el('label',{for:'class-select'},'학급'),select),
    summary,
    el('div',{class:'actions'},button('새 학급 만들기',()=>{createArea.childElementCount?createArea.replaceChildren():createArea.replaceChildren(newClassForm())},'secondary'),
      cl&&cl.teacher?button('선생님 코드 재발급',guard(async()=>{
        if(!(await confirmBox('선생님 코드 재발급',`${cl.name} 선생님의 접속 코드를 새로 만듭니다. 예전 코드로는 더 이상 들어올 수 없습니다.`,'새 코드 만들기','')))return;
        const {code}=await api('admin/teachers/reset-code',{classId:cl.id});
        await showCode(`${cl.name} 선생님 새 접속 코드`,code,'이 코드는 지금 한 번만 보입니다. 선생님께 전달해 주세요.');
      }),'secondary'):null)),createArea);
}
function newClassForm(){
  const grade=el('select',{id:'new-grade'},...[1,2,3,4,5,6].map(g=>el('option',{value:g},`${g}학년`)));grade.value='6';
  const room=el('input',{id:'new-room',type:'number',min:1,max:20,value:'1',inputmode:'numeric'});
  const name=el('input',{id:'new-name',maxlength:30,placeholder:'비워 두면 학년과 반으로 정해집니다'});
  return el('form',{class:'card inline-form',onsubmit:guard(async e=>{
    e.preventDefault();
    const data=await api('admin/classes/create',{grade:Number(grade.value),room:Number(room.value),name:name.value});
    S.classId=data.class.id;await loadOverview();renderApp();
    await showCode(`${data.class.name} 선생님 접속 코드`,data.teacher.code,'이 코드는 지금 한 번만 보입니다. 담임 선생님께 전달해 주세요. 잃어버리면 "선생님 코드 재발급"으로 새로 만들 수 있습니다.');
  })},el('h2',{},'새 학급 만들기'),
    el('div',{class:'row3'},el('div',{},el('label',{for:'new-grade'},'학년'),grade),el('div',{},el('label',{for:'new-room'},'반'),room),el('div',{},el('label',{for:'new-name'},'학급 이름 (선택)'),name)),
    el('p',{class:'muted'},'학급을 만들면 담임 선생님 접속 코드가 함께 만들어집니다.'),
    el('div',{class:'actions'},el('button',{type:'submit'},'학급 만들기')));
}
const TABS=[['roster','학생 명부'],['learning','배움 현황'],['teaching','활동과 피드백'],['add','학생 추가'],['codes','전체 코드'],['npcs','마을 인물'],['resources','학습 자료'],['board','게시판'],['together','함께하기'],['answers','정답'],['reports','제보']];
function renderTabs(){
  const tabs=document.querySelector('#tabs');if(!tabs)return;
  const fresh=S.overview?.reportsNew||0,open=currentClass()?.boardOpen||0;
  const count={reports:fresh,board:open};
  tabs.replaceChildren(...TABS.map(([id,label])=>el('button',{type:'button',role:'tab',class:'tab'+(S.tab===id?' on':''),'aria-selected':S.tab===id?'true':'false',title:id==='board'&&open?`답이 없는 질문 ${open}개`:null,onclick:guard(async()=>{S.tab=id;renderTabs();await renderPanel()})},count[id]?`${label} (${count[id]})`:label)));
}
async function renderPanel(){
  const panel=document.querySelector('#panel');if(!panel)return;
  if(S.tab==='reports')return renderReports(panel);
  if(S.tab==='answers')return renderAnswers(panel);
  if(S.tab==='codes')return renderCodes(panel);
  const cl=currentClass();
  if(!cl){panel.replaceChildren(el('section',{class:'card'},el('p',{},isAdmin()?'학급이 없습니다. "새 학급 만들기"로 먼저 학급을 만들어 주세요.':'연결된 학급이 없습니다. 관리자에게 문의해 주세요.')));return}
  if(S.tab==='teaching'){panel.replaceChildren(el('section',{class:'card'},el('h2',{},'활동과 피드백'),button('활동 배정과 제출 기록 열기',()=>openTeaching({api,classId:S.classId}))));return;}
  if(S.tab==='resources')return renderResources(panel);
  if(S.tab==='board')return renderBoardAdmin(panel);
  if(S.tab==='together')return renderTogether(panel);
  if(S.tab==='learning')return renderLearning(panel);
  if(S.tab==='roster')panel.replaceChildren(...rosterBlocks(cl));
  else if(S.tab==='add')panel.replaceChildren(...addPanel(cl));
  else await renderNpcPanel(panel);
}
async function refreshRoster(){
  await loadOverview();renderClassBar();
  if(S.tab==='roster'){const panel=document.querySelector('#panel');const cl=currentClass();if(panel&&cl)panel.replaceChildren(...rosterBlocks(cl))}
}
setInterval(()=>{
  if(S.me&&S.me.role!=='student'&&S.overview&&S.tab==='reports'&&document.visibilityState==='visible'&&!document.querySelector('dialog[open]')){const panel=document.querySelector('#panel');loadOverview().then(()=>{renderTabs();if(panel)return renderReports(panel)}).catch(err=>{if(err.status===401)renderLogin()});return}
  if(S.me&&S.me.role!=='student'&&S.overview&&S.tab==='board'&&document.visibilityState==='visible'&&!document.querySelector('dialog[open]')&&![...document.querySelectorAll('#panel textarea,#panel input')].some(x=>x.value.trim()||x===document.activeElement)){const panel=document.querySelector('#panel');loadOverview().then(()=>{renderTabs();if(panel)return renderBoardAdmin(panel)}).catch(err=>{if(err.status===401)renderLogin()});return}
  if(S.me&&S.me.role!=='student'&&S.overview&&S.tab==='roster'&&!S.reissuing&&document.visibilityState==='visible'&&!document.querySelector('dialog[open]'))refreshRoster().catch(err=>{if(err.status===401)renderLogin()});
},30000);
// 함께하기 탭은 채팅을 지켜보도록 10초마다 새로 본다(입력 중이거나 창이 열려 있으면 쉰다)
setInterval(()=>{if(S.me&&S.me.role!=='student'&&S.tab==='together'&&document.visibilityState==='visible'&&!document.querySelector('dialog[open]')){const panel=document.querySelector('#panel');if(panel)renderTogether(panel).catch(err=>{if(err.status===401)renderLogin()})}},10000);


// ------------------------------------------------------------------ 정답 모음
// 의뢰(스테이지)를 고르면 과제마다 정답과 마지막 힌트를 보여 준다. 학생 화면에는 정답이 내려가지 않는다.
async function renderAnswers(panel){
  if(!S.answerList)S.answerList=(await api('admin/answers')).missions;
  const list=S.answerList;S.answerId=S.answerId||list[0]?.id;
  const at=list.findIndex(m=>m.id===S.answerId);
  const select=el('select',{id:'answer-pick','aria-label':'의뢰 고르기',onchange:()=>{S.answerId=select.value;renderAnswers(panel)}});
  let group=null,last='';
  for(const m of list){if(m.region!==last){group=el('optgroup',{label:m.region});select.append(group);last=m.region}const o=el('option',{value:m.id},`${m.id} ${m.title} (${m.count}단계)`);if(m.id===S.answerId)o.selected=true;group.append(o)}
  const go=d=>()=>{const n=list[at+d];if(n){S.answerId=n.id;renderAnswers(panel)}};
  const bar=el('div',{class:'answer-bar'},select,el('button',{type:'button',class:'secondary',onclick:go(-1),disabled:at<=0},'이전 의뢰'),el('button',{type:'button',class:'secondary',onclick:go(1),disabled:at>=list.length-1},'다음 의뢰'),el('button',{type:'button',class:'secondary',onclick:()=>window.print()},'인쇄하기'));
  panel.replaceChildren(el('section',{class:'card'},el('h2',{},'정답 모음'),el('p',{class:'muted'},'선생님이 학생을 도울 때 보는 정답표입니다. 학생 화면에는 정답이 내려가지 않으니 이 화면을 학생에게 보여 주지 마세요. 장면을 직접 조작하는 과제는 힌트 세 단계를 함께 보세요.'),bar,el('p',{class:'loading'},'불러오는 중입니다.')));
  const b=await api('admin/answers?gameId='+encodeURIComponent(S.answerId));
  const rows=b.tasks.map(t=>el('tr',{},
    el('td',{class:'answer-id'},t.id.replace(/^T0?/,'')+(t.id.startsWith('T')?'단계':''),t.optional?el('span',{class:'badge'},'선택'):'',t.diagnostic?el('span',{class:'badge'},'진단'):''),
    el('td',{},el('strong',{},t.title),t.prompt?el('p',{class:'muted'},t.prompt):''),
    el('td',{class:'answer-key'},...t.answer.map(a=>el('p',{},a)),t.diagnostic?el('p',{class:'muted'},'진단 문항이라 틀려도 넘어갑니다.'):''),
    el('td',{class:'answer-hint'},t.hints.length?el('ol',{},...t.hints.map(h=>el('li',{},h))):'')));
  panel.replaceChildren(el('section',{class:'card answer-sheet'},
    el('h2',{},'정답 모음'),el('p',{class:'muted no-print'},'선생님이 학생을 도울 때 보는 정답표입니다. 학생 화면에는 정답이 내려가지 않으니 이 화면을 학생에게 보여 주지 마세요. 장면을 직접 조작하는 과제는 힌트 세 단계를 함께 보세요.'),bar,
    el('h3',{class:'answer-title'},`${b.id} ${b.title||list[at]?.title||''}`),
    b.quest?el('p',{},el('b',{},'의뢰 '),b.quest,el('b',{},'  장소 '),b.place):'',b.goal?el('p',{},el('b',{},'배울 내용 '),b.goal):'',b.note?el('p',{class:'muted'},b.note):'',
    el('div',{class:'answer-table'},el('table',{},el('thead',{},el('tr',{},el('th',{},'단계'),el('th',{},'할 일'),el('th',{},'정답'),el('th',{},'힌트(1~3단계)'))),el('tbody',{},...rows)))));
}

// ------------------------------------------------------------------ 제보
// 학생이 게임 화면의 「제보하기」로 보낸 오류와 개선점. 관리자는 모든 학급, 담임은 자기 반 제보를 본다.
const REPORT_KIND={error:'오류',hard:'불편',idea:'아이디어',other:'기타'};
const REPORT_STATUS={new:'새 제보',seen:'확인함',done:'해결함'};
function shortAgent(a=''){return /iPhone|iPad/.test(a)?'아이폰/아이패드':/Android/.test(a)?'안드로이드':/CrOS/.test(a)?'크롬북':/Edg\//.test(a)?'Edge':/Chrome\//.test(a)?'Chrome':/Safari\//.test(a)?'Safari':/Firefox\//.test(a)?'Firefox':''}
// 함께하기: 반 친구가 지도에 보이기와 채팅 켜고 끄기, 지금 지도에 있는 학생, 채팅 기록(막힌 말 포함)과 학생별 채팅 막기
function placeName(id){if(!id)return '';if(id==='hub')return '중앙 광장';for(const[k,r]of Object.entries(S.regions||{})){if(k===id)return r.title;const z=(r.zones||[]).find(z=>z.id===id);if(z)return `${r.title} ${z.title}`}return id}
function chatWhen(t){const d=new Date(t*1000),now=new Date(),hm=d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});return d.toDateString()===now.toDateString()?hm:`${d.getMonth()+1}/${d.getDate()} ${hm}`}
const chatState=m=>m.status==='blocked'?`막힘(${m.reason||'거른 말'})`:m.status==='hidden'?'가림':'보임';
function downloadChat(data){
  const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,"'$&").replaceAll('"','""')+'"';
  const rows=[['시각','번호','닉네임','장소','내용','상태','막은 이유'],...[...data.messages].reverse().map(m=>[new Date(m.created*1000).toLocaleString('ko-KR'),m.number??'',m.nickname||'',placeName(m.map),m.body,chatState(m),m.reason||''])];
  const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=el('a',{href:url,download:`채팅기록_${data.class?.name||'학급'}.csv`});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function renderTogether(panel){
  if(!panel.querySelector('.together-card'))panel.replaceChildren(el('section',{class:'card'},el('p',{class:'loading'},'함께하기 정보를 불러오는 중입니다.')));
  const [data,weekly]=await Promise.all([api('admin/together'+classQuery()),api('weekly'+classQuery()).catch(()=>null)]);
  if(S.tab!=='together')return;
  const cp=isAdmin()?{classId:S.classId}:{},st=data.settings,muted=new Set(st.muted);
  const save=patch=>guard(async()=>{await api('admin/together',{...patch,...cp});await renderTogether(panel)});
  const online=data.online.map(o=>`${o.number?o.number+'번 ':''}${o.nickname}(${placeName(o.map)})`);
  const settings=el('section',{class:'card together-card'},el('h2',{},'함께하기'),
    el('label',{class:'together-switch'},el('input',{type:'checkbox',checked:st.together,onchange:e=>save({together:e.target.checked})()}),' 반 친구가 지도에 보이기'),
    el('label',{class:'together-switch'+(st.together?'':' off')},el('input',{type:'checkbox',checked:st.chat,disabled:!st.together,onchange:e=>save({chat:e.target.checked})()}),' 채팅'),
    el('p',{class:'muted'},st.together?`지금 지도에 있는 학생 ${online.length}명`+(online.length?': '+online.join(', '):''):'꺼져 있습니다.'));
  S.chatFilter=S.chatFilter||'all';
  const counts={all:data.messages.length,blocked:0,hidden:0};for(const m of data.messages)if(m.status in counts)counts[m.status]++;
  const filters=el('div',{class:'report-filters',role:'group','aria-label':'채팅 거르기'},...[['all','전체'],['blocked','막힌 말'],['hidden','가린 말']].map(([k,label])=>el('button',{type:'button',class:'chip'+(S.chatFilter===k?' on':''),'aria-pressed':S.chatFilter===k?'true':'false',onclick:()=>{S.chatFilter=k;renderTogether(panel)}},`${label} ${counts[k]}`)));
  const setMsg=(id,status)=>guard(async()=>{await api('admin/chat/status',{id,status,...cp});await renderTogether(panel)});
  const shown=data.messages.filter(m=>S.chatFilter==='all'||m.status===S.chatFilter);
  const rows=shown.map(m=>el('tr',{class:'chat-'+m.status},el('td',{},chatWhen(m.created)),el('td',{},`${m.number?m.number+'번 ':''}${m.nickname||'알 수 없음'}`),el('td',{},placeName(m.map)),el('td',{class:'chat-body'},m.body),el('td',{},chatState(m)),
    el('td',{class:'chat-acts'},m.status==='shown'?button('가리기',setMsg(m.id,'hidden'),'secondary small'):button('보이기',setMsg(m.id,'shown'),'secondary small'),button(muted.has(m.owner)?'채팅 풀기':'채팅 막기',save({mute:{id:m.owner,on:!muted.has(m.owner)}}),'secondary small'))));
  const mutedStudents=data.students.filter(s=>muted.has(s.id));
  const log=el('section',{class:'card'},el('h2',{},'채팅 기록'),
    el('div',{class:'actions'},filters,button('새로 보기',()=>renderTogether(panel),'secondary small'),button('채팅 기록 내려받기(CSV)',()=>downloadChat(data),'secondary small')),
    mutedStudents.length?el('p',{class:'chat-muted'},'채팅을 막은 학생: ',...mutedStudents.map(s=>button(`${s.number?s.number+'번 ':''}${s.nickname} 풀기`,save({mute:{id:s.id,on:false}}),'secondary small'))):null,
    shown.length?el('div',{class:'tablewrap'},el('table',{class:'chat-log'},el('thead',{},el('tr',{},...['시각','학생','장소','내용','상태',''].map(h=>el('th',{},h)))),el('tbody',{},...rows))):el('p',{class:'muted'},data.messages.length?'이 조건에 맞는 말이 없습니다.':'아직 채팅이 없습니다.'));
  const weeklyCard=el('section',{class:'card weekly-admin'},el('h2',{},'이번 주 반짝 탐험가'),
    el('label',{class:'together-switch'},el('input',{type:'checkbox',checked:st.weekly,onchange:e=>save({weekly:e.target.checked})()}),' 학생 퀘스트 수첩에 보이기'),
    weekly?weeklyAdmin(weekly):null);
  panel.replaceChildren(settings,weeklyCard,log);
}
function weeklyAdmin(w){
  const day=t=>new Date(t*1000).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});
  const rank=(c,v)=>1+c.top.filter(x=>x.value>v).length; // 같은 기록은 같은 순위
  const cells=w.cats.map(c=>el('div',{class:'weekly-col'},el('h3',{},c.title),c.top.length?el('ul',{},...c.top.map(x=>el('li',{},`${rank(c,x.value)}. ${x.number?x.number+'번 ':''}${x.nickname} `,el('b',{},(c.id==='growth'?'+':'')+x.value+(c.id==='dex'?'장':'개'))))):el('p',{class:'muted'},'아직 없습니다.'),c.more?el('p',{class:'muted'},`같은 기록 ${c.more}명 더`):null));
  return el('div',{},el('p',{class:'muted'},`${day(w.start)}부터 ${day(w.end-1)}까지, 월요일 0시에 새로 시작합니다.`),el('div',{class:'weekly-cols'},...cells));
}
// 배움 현황: 성취기준별 해결, 처음에 많이 틀린 과제, 도움을 많이 본 과제, 처음 생각 조사, 과학 도감, 의뢰별 해결
const pctOf=(a,b)=>b?Math.round(100*a/b):0;
function learnTable(heads,rows,cls='learn-table'){return el('div',{class:'tablewrap'},el('table',{class:cls},el('thead',{},el('tr',{},...heads.map(h=>el('th',{},h)))),el('tbody',{},...rows)))}
async function renderLearning(panel){
  if(!panel.querySelector('.learn-card'))panel.replaceChildren(el('section',{class:'card'},el('p',{class:'loading'},'배움 현황을 불러오는 중입니다.')));
  const d=await api('admin/learning'+classQuery());
  if(S.tab!=='learning')return;
  const bar=(a,b)=>{const i=el('i');i.style.width=pctOf(a,b)+'%';return el('span',{class:'learn-bar',role:'img','aria-label':pctOf(a,b)+'%'},i)}; // style 속성은 보안 설정이 막는다
  const who=s=>`${s.number?s.number+'번 ':''}${s.nickname}`;
  const stdRows=[];
  for(const reg of d.regions){
    stdRows.push(el('tr',{class:'learn-reg'},el('th',{colspan:'5'},`${reg.name}, ${reg.unit}`)));
    for(const code of reg.standards){
      const s=d.standards.find(x=>x.code===code);if(!s)continue;
      stdRows.push(el('tr',{},el('td',{title:s.text},el('b',{},s.code),' '+s.short),el('td',{class:'num'},s.games+'개'),el('td',{class:'learn-rate'},bar(s.solved,s.target),` ${pctOf(s.solved,s.target)}%`),el('td',{class:'num'},s.all+'명'),
        el('td',{},s.none.length?el('details',{},el('summary',{},s.none.length+'명'),el('p',{},s.none.map(who).join(', '))):'없음')));
    }
  }
  const head=el('section',{class:'card learn-card'},el('h2',{},'성취기준별 해결'),
    el('div',{class:'actions'},el('span',{class:'muted'},`학생 ${d.students}명`),button('새로 보기',()=>renderLearning(panel),'secondary small')),
    learnTable(['성취기준','의뢰','해결률','모두 해결','해결한 의뢰가 없는 학생'],stdRows));
  const hard=el('section',{class:'card learn-card'},el('h2',{},'처음에 많이 틀린 과제'),el('p',{class:'muted'},'학생이 그 과제에 처음 낸 답 기준입니다.'),
    d.hard.length?learnTable(['의뢰','과제','첫 시도에 맞힘','자주 고른 답','도움을 본 학생'],d.hard.map(h=>el('tr',{},el('td',{},h.gameTitle),el('td',{},h.title),el('td',{class:'num'},`${h.ok}/${h.tried}명 (${h.rate}%)`),el('td',{},h.wrong?`${h.wrong.label} (${h.wrong.count}명)`:'-'),el('td',{class:'num'},h.hints+'명')))):el('p',{class:'muted'},'아직 기록이 없습니다.'));
  const helped=el('section',{class:'card learn-card'},el('h2',{},'도움을 많이 본 과제'),
    d.helped.length?learnTable(['의뢰','과제','도움을 본 학생','첫 시도에 맞힘'],d.helped.map(h=>el('tr',{},el('td',{},h.gameTitle),el('td',{},h.title),el('td',{class:'num'},h.hints+'명'),el('td',{class:'num'},h.tried?`${h.ok}/${h.tried}명`:'-')))):el('p',{class:'muted'},'아직 기록이 없습니다.'));
  const dist=(label,list)=>el('p',{class:'think-dist'},el('b',{},label+' '),...list.map(x=>el('span',{class:'think-opt'+(x.key?' key':'')},`${x.label} ${x.count}명`+(x.key?' (과학 개념)':''))));
  const think=d.rethink.filter(r=>r.first);
  const thinkCard=el('section',{class:'card learn-card'},el('h2',{},'처음 생각 조사'),
    think.length?el('div',{},...think.map(r=>el('article',{class:'think-block'},el('h3',{},`${r.gameTitle}: ${r.title}`),el('p',{class:'muted'},`처음 답한 학생 ${r.first}명, 의뢰를 끝내고 달새에게 다시 답한 학생 ${r.again}명`),
      ...r.parts.map(p=>el('div',{class:'think-part'},el('p',{class:'think-q'},p.prompt),dist('처음',p.first),r.again?dist('다시',p.again):null))))):el('p',{class:'muted'},'아직 기록이 없습니다.'));
  // 예상과 새 조건: 실험 장면 앞의 처음 예상(채점하지 않음), 결과를 본 뒤 돌아본 생각, 새 조건 문제
  const poe=d.poe||{predict:[],transfer:[]};
  const poeCard=el('section',{class:'card learn-card'},el('h2',{},'예상과 새 조건'),el('p',{class:'muted'},'실험 장면 앞에서 처음 고른 예상입니다. 결과와 많이 달랐던 과제부터 보입니다.'),
    poe.predict.length?el('div',{},...poe.predict.map(r=>el('article',{class:'think-block'},el('h3',{},`${r.gameTitle}: ${r.title}`),el('p',{class:'muted'},`예상한 학생 ${r.students}명, 결과와 같았던 학생 ${r.matched}명`),
      el('div',{class:'think-part'},el('p',{class:'think-q'},r.question),
        el('p',{class:'think-dist'},el('b',{},'예상 '),...r.options.map(x=>el('span',{class:'think-opt'+(x.key?' key':'')},`${x.label} ${x.count}명`+(x.key?' (실제 결과)':'')))),
        r.reflect.length?el('p',{class:'think-dist'},el('b',{},'돌아본 생각 '),...r.reflect.map(x=>el('span',{class:'think-opt'},`${x.label} ${x.count}명`))):null)))):el('p',{class:'muted'},'아직 기록이 없습니다.'),
    poe.transfer.length?learnTable(['의뢰','새 조건 문제','처음에 맞힘','다시 골라 맞힘','나중에 하기로 함','처음에 자주 고른 답'],poe.transfer.map(t=>el('tr',{},el('td',{},t.gameTitle),el('td',{},el('p',{class:'think-q'},t.question),t.situation?el('p',{class:'muted'},t.situation):null),el('td',{class:'num'},`${t.firstOk}/${t.students}명`),el('td',{class:'num'},t.laterOk+'명'),el('td',{class:'num'},t.skipped+'명'),el('td',{},t.wrong?`${t.wrong.label} (${t.wrong.count}명)`:'-')))):null);
  // 설명 쓰기: 학생마다 그 의뢰에 마지막으로 보낸 설명 기준. 꼭 넣을 말은 낱말이 들어 있는지만 센 수다.
  const wr=(d.writeup||[]);
  const writeupCard=el('section',{class:'card learn-card'},el('h2',{},'설명 쓰기'),
    el('p',{class:'muted'},'탐구를 마친 학생이 자기 관찰을 근거로 주민에게 설명한 글입니다. 「꼭 넣을 말」은 낱말이 들어 있는지만 센 수이고, 개념을 바르게 썼는지는 글을 읽고 확인합니다.'),
    wr.some(x=>x.students)?learnTable(['의뢰','꼭 넣을 말','보낸 학생','글로 씀','고쳐 씀','말로 설명하기로 함','꼭 넣을 말 모두 있음','확인 대기','보완 요청','교사 확인','판단 자료 부족'],wr.map(x=>el('tr',{},el('td',{},el('p',{class:'think-q'},x.gameTitle),el('p',{class:'muted'},x.title)),el('td',{},x.terms.join(', ')),el('td',{class:'num'},x.students+'명'),...(x.students?['written','revised','oral','allTerms','pending','revise','confirmed','insufficient'].map(k=>el('td',{class:'num'},x[k]+'명')):Array.from({length:8},()=>el('td',{class:'num'},'-')))))):el('p',{class:'muted'},'아직 보낸 설명이 없습니다.'),
    ...wr.filter(x=>x.waiting?.length).map(x=>el('details',{class:'learn-games-admin'},el('summary',{},`${x.gameTitle}: 확인을 기다리는 학생 ${x.waiting.length}명`),el('p',{},x.waiting.join(', ')))),
    wr.some(x=>x.students)?el('div',{class:'actions'},button('설명 글 확인하기',()=>openTeaching({api,classId:S.classId,kind:'writeup'}),'secondary small')):null);
  const byRegion=d.regions.map(reg=>{
    const gs=d.games.filter(g=>g.region===reg.id),solved=gs.reduce((a,g)=>a+g.solved,0);
    return el('details',{class:'learn-games-admin'},el('summary',{},`${reg.name}: 의뢰 ${gs.length}개, 해결 ${pctOf(solved,gs.length*d.students)}%`),
      learnTable(['의뢰','해결한 학생','진행 중인 학생'],gs.map(g=>el('tr',{},el('td',{},g.title),el('td',{class:'learn-rate'},bar(g.solved,d.students),` ${g.solved}/${d.students}명`),el('td',{class:'num'},g.started==null?'-':g.started+'명')))));
  });
  const duelCard=el('section',{class:'card learn-card'},el('h2',{},'척척 오류 대결'),el('p',{class:'muted'},'지구의 의뢰를 모두 해결한 학생이 지구 단말에서 척척의 틀린 말을 반박합니다. 첫 반박 기준입니다.'),
    ...(d.duels||[]).map(v=>el('details',{class:'learn-games-admin'},el('summary',{},`${v.title}: 이긴 학생 ${v.done}명, 시작한 학생 ${v.started}명`),
      learnTable(['척척의 틀린 말','첫 반박에 맞힘','자주 고른 답'],v.claims.map(x=>el('tr',{},el('td',{},x.claim),el('td',{class:'num'},x.tried?`${x.ok}/${x.tried}명 (${pctOf(x.ok,x.tried)}%)`:'-'),el('td',{},x.wrong?`${x.wrong.label} (${x.wrong.count}명)`:'-')))))));
  panel.replaceChildren(head,hard,helped,thinkCard,poeCard,writeupCard,dexAdmin(d,bar,who),duelCard,el('section',{class:'card learn-card'},el('h2',{},'의뢰별 해결'),...byRegion));
}
// 과학 도감: 학생마다 지금 회차에서 모은 카드, 지구별로 카드마다 연 학생과 아직 못 연 학생
function dexAdmin(d,bar,who){
  const dx=d.dex;if(!dx)return '';
  const n=dx.students.length,avg=n?Math.round(dx.students.reduce((a,s)=>a+s.got,0)/n):0,bonusN=dx.students.filter(s=>s.bonus).length;
  const total=r=>dx.cards.filter(c=>c.region===r).length;
  const rows=dx.students.map(s=>el('tr',{},el('td',{},who(s)),...d.regions.map(r=>el('td',{class:'num'},`${s.regions[r.id]||0}/${total(r.id)}`)),el('td',{class:'num'},s.bonus+'장'),el('td',{class:'learn-rate'},bar(s.got,dx.total),` ${s.got}장`)));
  const name=c=>el('span',{class:'dex-admin-name'},dexIcon(c.id,24),`No.${String(c.no).padStart(3,'0')} ${c.name}`+(c.key?' (핵심 낱말)':c.bonus?' (숨은 카드)':''));
  const regions=d.regions.map(r=>{
    const cs=dx.cards.filter(c=>c.region===r.id);
    return el('details',{class:'learn-games-admin'},el('summary',{},`${r.name}: 카드 ${cs.length}장, 한 명이라도 연 카드 ${cs.filter(c=>c.got).length}장`),
      learnTable(['카드','종류','연 학생','아직 못 연 학생'],cs.map(c=>el('tr',{},el('td',{},name(c)),el('td',{},dx.kinds[c.kind]||''),el('td',{class:'learn-rate'},bar(c.got,n),` ${c.got}/${n}명`),
        el('td',{},c.missing.length?el('details',{},el('summary',{},c.missing.length+'명'),el('p',{},c.missing.map(who).join(', '))):c.got?'없음':'전체')))));
  });
  return el('section',{class:'card learn-card'},el('h2',{},'과학 도감'),
    el('p',{class:'muted'},`학생이 지금 진행 중인 회차 기준입니다. 반 평균 ${avg}장(${dx.total}장 가운데), 숨은 카드를 연 학생 ${bonusN}명.`),
    n?learnTable(['학생',...d.regions.map(r=>r.name),'숨은 카드','모은 카드'],rows):el('p',{class:'muted'},'아직 학생이 없습니다.'),...regions);
}
async function renderReports(panel){
  panel.replaceChildren(el('section',{class:'card'},el('p',{class:'loading'},'제보를 불러오는 중입니다.')));
  const {reports}=await api('admin/reports');
  S.reportFilter=S.reportFilter||'all';
  const counts={all:reports.length,new:0,seen:0,done:0};for(const r of reports)counts[r.status]=(counts[r.status]||0)+1;
  const filters=el('div',{class:'report-filters',role:'group','aria-label':'제보 거르기'},...[['all','전체'],['new','새 제보'],['seen','확인함'],['done','해결함']].map(([k,label])=>el('button',{type:'button',class:'chip'+(S.reportFilter===k?' on':''),'aria-pressed':S.reportFilter===k?'true':'false',onclick:()=>{S.reportFilter=k;renderReports(panel)}},`${label} ${counts[k]||0}`)));
  const shown=reports.filter(r=>S.reportFilter==='all'||r.status===S.reportFilter);
  const list=el('div',{class:'report-list'});
  for(const r of shown){
    const c=r.context||{},who=r.role==='student'?`${r.className||''} ${r.number?r.number+'번 ':''}${r.nickname||''}`.trim():r.role==='teacher'?`${r.className||''} 선생님`.trim():'관리자';
    const where=[c.place,c.title,c.gameId&&(c.gameId+(c.taskId?' '+c.taskId:''))].filter(Boolean).join(', ')||({map:'지도',mission:'의뢰 화면',login:'접속 화면',board:'게시판'}[c.view]||'위치 정보 없음');
    const device=[c.screen,shortAgent(c.agent),c.sync].filter(Boolean).join(', ');
    const setStatus=st=>guard(async()=>{await api('admin/reports/status',{id:r.id,status:st});await loadOverview();renderTabs();await renderReports(panel)});
    const acts=r.status==='new'?[el('button',{type:'button',class:'secondary',onclick:setStatus('seen')},'확인함'),el('button',{type:'button',onclick:setStatus('done')},'해결함')]:[el('button',{type:'button',class:'secondary',onclick:setStatus('new')},'새 제보로 되돌리기'),...(r.status==='seen'?[el('button',{type:'button',onclick:setStatus('done')},'해결함')]:[])];
    list.append(el('article',{class:'report-card '+r.status},
      el('div',{class:'report-head'},el('span',{class:'report-kind '+r.kind},REPORT_KIND[r.kind]||r.kind),el('strong',{},who),el('span',{class:'muted'},formatTime(r.created)),el('span',{class:'badge'+(r.status==='done'?' done':'')},REPORT_STATUS[r.status]||r.status)),
      el('p',{class:'report-body'},r.body),
      el('p',{class:'report-where'},el('b',{},'위치 '),where),
      device?el('p',{class:'report-device muted'},device):'',
      el('div',{class:'actions'},...acts)));
  }
  panel.replaceChildren(el('section',{class:'card'},
    el('h2',{},'학생 제보'),
    el('p',{class:'muted'},'학생이 게임 화면 위쪽의 「제보하기」로 보낸 오류, 불편, 아이디어입니다. 학생이 있던 장소와 의뢰, 과제가 함께 저장됩니다. 확인한 제보는 「확인함」, 고친 제보는 「해결함」으로 표시해 두세요.'),
    filters,shown.length?list:el('p',{class:'muted'},reports.length?'이 조건에 맞는 제보가 없습니다.':'아직 들어온 제보가 없습니다.')));
}

// ------------------------------------------------------------------ 학습 자료(링크)
// 선생님이 주소만 넣어 올리는 자료. 학생 게임의 문제 발견 도서관 책장, 지구 지도의 「이 지역 자료」, 고른 학습 장소에 보인다.
const RES_KIND={link:'참고 링크',video:'영상 링크',reading:'읽기 자료',image:'이미지 파일',pdf:'PDF 파일'};
const RES_REGION=[['all','모든 지역'],['farm','햇살 농장 지구'],['fire','불꽃 에너지 지구'],['power','전력망 지구'],['future','미래 연구 본부'],['life','푸른 생활 지구']];
const classQuery=()=>isAdmin()?'?classId='+encodeURIComponent(S.classId):'';
function gameTitles(){const out={};for(const r of Object.values(S.regions||{}))for(const z of r.zones||[])for(const g of z.games||[])out[g.id]={title:g.title,region:r.title};return out}
function emptyResource(){return {id:'',title:'',kind:'link',region:'all',gameIds:[],source:'',question:'',body:[],url:'',published:true}}
async function renderResources(panel){
  panel.replaceChildren(el('section',{class:'card'},el('p',{class:'loading'},'자료를 불러오는 중입니다.')));
  const {resources}=await api('resources'+classQuery());
  const games=gameTitles(),r=S.resEditing||emptyResource(),file=['image','pdf'].includes(r.kind);
  const kind=el('select',{id:'res-kind',disabled:file||undefined},...(file?[[r.kind,RES_KIND[r.kind]]]:[['link','참고 링크 (새 창으로 열림)'],['video','영상 링크 (YouTube는 게임 안에서 재생)'],['reading','읽기 자료 (글을 직접 입력)']]).map(([v,t])=>el('option',{value:v},t)));kind.value=r.kind;
  const title=el('input',{id:'res-title',maxlength:120,value:r.title,placeholder:'예: 전자석으로 움직이는 크레인 영상'});
  const url=el('input',{id:'res-url',type:'url',maxlength:2000,value:file?'':r.url,placeholder:'https://',disabled:file||undefined});
  const source=el('input',{id:'res-source',maxlength:200,value:r.source,placeholder:'비워 두면 주소의 사이트 이름을 씁니다'});
  const question=el('input',{id:'res-question',maxlength:300,value:r.question,placeholder:'예: 스위치를 끄면 철이 어떻게 되는지 살펴보세요.'});
  const region=el('select',{id:'res-region'},...RES_REGION.map(([v,t])=>el('option',{value:v},t)));region.value=r.region;
  const places=el('select',{id:'res-places',multiple:true,size:8});
  for(const reg of Object.values(S.regions||{})){const g=el('optgroup',{label:reg.title});for(const z of reg.zones||[])for(const m of z.games||[]){const o=el('option',{value:m.id},m.title);o.selected=r.gameIds.includes(m.id);g.append(o)}places.append(g)}
  const text=el('textarea',{id:'res-body',rows:5,value:r.body.join('\n'),placeholder:'한 줄이 한 문단이 됩니다.'});
  const published=el('input',{id:'res-published',type:'checkbox',checked:r.published});
  const urlRow=el('div',{},el('label',{for:'res-url'},'자료 주소'),url,el('p',{class:'muted'},'https로 시작하는 주소만 올릴 수 있습니다.'));
  const bodyRow=el('div',{},el('label',{for:'res-body'},'읽기 내용'),text);
  const sync=()=>{urlRow.hidden=kind.value==='reading'||file;bodyRow.hidden=kind.value!=='reading'};kind.onchange=sync;sync();
  const save=guard(async e=>{
    e.preventDefault();
    const k=kind.value;let src=source.value.trim();
    if(!src&&['link','video'].includes(k)){try{src=new URL(url.value.trim()).hostname.replace(/^www\./,'')}catch{}}
    if(!src&&k==='reading')src='선생님 자료';
    const resource={id:r.id,title:title.value.trim(),kind:k,region:region.value,gameIds:[...places.selectedOptions].map(o=>o.value),source:src,question:question.value.trim(),body:k==='reading'?text.value.split('\n').map(x=>x.trim()).filter(Boolean):(file?r.body:[]),url:file?r.url:k==='reading'?'':url.value.trim(),published:published.checked};
    if(!resource.title)throw new Error('자료 제목을 적어 주세요.');
    if(['link','video'].includes(k)&&!/^https:\/\/[^\s]+$/.test(resource.url))throw new Error('https로 시작하는 자료 주소를 넣어 주세요.');
    if(k==='reading'&&!resource.body.length)throw new Error('읽기 내용을 적어 주세요.');
    if(!resource.question)throw new Error('학생이 살펴볼 질문을 적어 주세요.');
    const saved=await api('resources',{resource,...classParam()});
    S.resEditing=null;toast(saved.published?'저장했습니다. 학생 게임에 바로 보입니다.':'숨김 상태로 저장했습니다.');
    if(k==='video'&&!saved.youtubeId)toast('저장했습니다. YouTube 주소가 아니라서 학생이 누르면 새 창으로 열립니다.');
    await renderResources(panel);
  });
  const form=el('form',{class:'card res-form',onsubmit:save},
    el('h2',{},r.id?'자료 고치기':'새 자료 올리기'),
    el('div',{class:'row2'},el('div',{},el('label',{for:'res-kind'},'자료 종류'),kind),el('div',{},el('label',{for:'res-title'},'제목'),title)),
    urlRow,bodyRow,
    el('div',{class:'row2'},el('div',{},el('label',{for:'res-source'},'출처'),source),el('div',{},el('label',{for:'res-question'},'학생이 살펴볼 질문'),question)),
    el('div',{class:'row2'},el('div',{},el('label',{for:'res-region'},'보일 지역'),region,el('p',{class:'muted'},'중앙 광장 도서관 책장에는 지역과 상관없이 모두 보입니다. 지구 지도의 「이 지역 자료」에는 고른 지역 자료와 모든 지역 자료가 보입니다.')),
      el('div',{},el('label',{for:'res-places'},'학습 장소 (선택, Ctrl 키로 여러 개)'),places,el('p',{class:'muted'},'고르면 학생이 그 장소에 말을 걸 때 「선생님 자료 보기」가 함께 나옵니다.'))),
    el('label',{class:'check'},published,' 학생에게 바로 보이기'),
    el('div',{class:'actions'},r.id?button('새 자료로 바꾸기',()=>{S.resEditing=null;renderResources(panel)},'secondary'):null,el('button',{type:'submit'},r.id?'고친 내용 저장':'자료 올리기')));
  const rows=resources.slice().reverse().map(x=>{ // 새로 올린 자료가 위에
    const where=[RES_REGION.find(([v])=>v===x.region)?.[1]||x.region,...x.gameIds.map(id=>games[id]?.title||id)].join(', ');
    return el('article',{class:'res-row'+(x.published?'':' off')},
      el('div',{class:'res-main'},el('strong',{},x.title),el('span',{class:'badge'},RES_KIND[x.kind]||x.kind),el('span',{class:'badge'+(x.published?' done':'')},x.published?'게시 중':'숨김')),
      el('p',{class:'muted'},where+(x.source?' / 출처 '+x.source:'')),
      x.question?el('p',{class:'res-q'},'살펴볼 질문: '+x.question):null,
      ['link','video'].includes(x.kind)?el('p',{class:'res-url'},el('a',{href:x.url,target:'_blank',rel:'noopener noreferrer'},x.url)):null,
      el('div',{class:'actions'},
        button('고치기',()=>{S.resEditing=x;renderResources(panel);document.querySelector('#res-title')?.focus()},'secondary small'),
        button(x.published?'숨기기':'게시하기',guard(async()=>{const {youtubeId,...payload}=x;await api('resources',{resource:{...payload,published:!x.published},...classParam()});toast(x.published?'학생 화면에서 숨겼습니다.':'학생 게임에 게시했습니다.');await renderResources(panel)}),'small')));
  });
  panel.replaceChildren(
    el('section',{class:'card'},el('h2',{},'학습 자료'),
      el('p',{},'자료 주소를 올리면 이 반 학생의 게임 안에 바로 나타납니다. 학생은 중앙 광장의 「문제 발견 도서관」 책장, 지구 지도 「가방」의 「이 지역 자료」, 고른 학습 장소에서 자료를 엽니다. 새 자료가 생기면 학생이 그 지도에 들어올 때 한 번 알려 줍니다.'),
      el('p',{class:'muted'},'YouTube 영상은 게임 안에서 「여기서 영상 보기」로 재생되고, 다른 주소는 새 창으로 열립니다. 학생이 자료를 연 기록은 학습 성취나 영상 완주로 계산하지 않습니다.')),
    form,
    el('section',{class:'card'},el('h2',{},`이 반 자료 ${resources.length}개`),resources.length?el('div',{class:'res-list'},...rows):el('p',{class:'muted'},'아직 올린 자료가 없습니다.')));
}

// ------------------------------------------------------------------ 반 친구 게시판
// 학생 질문과 결과 나누기. 학생 화면에는 닉네임만 보이고 이 화면에는 번호도 보인다. 가린 글과 학생이 지운 글도 이 화면에는 남는다.
const BOARD_KIND={question:'질문',share:'결과 나누기'};
const BOARD_STATE={hidden:'가림',deleted:'학생이 지움'};
async function renderBoardAdmin(panel){
  panel.replaceChildren(el('section',{class:'card'},el('p',{class:'loading'},'게시판을 불러오는 중입니다.')));
  const {posts}=await api('board'+classQuery());
  const games=gameTitles(),cp=classParam();
  S.boardFilter=S.boardFilter||'all';
  const open=p=>p.kind==='question'&&p.status==='shown'&&!p.replies.some(r=>r.status==='shown');
  const tests={all:()=>true,open,question:p=>p.kind==='question',share:p=>p.kind==='share',hidden:p=>p.status!=='shown'||p.replies.some(r=>r.status!=='shown')};
  const filters=el('div',{class:'report-filters',role:'group','aria-label':'게시판 거르기'},...[['all','전체'],['open','답이 없는 질문'],['question','질문'],['share','결과 나누기'],['hidden','가리거나 지운 글']].map(([k,label])=>el('button',{type:'button',class:'chip'+(S.boardFilter===k?' on':''),'aria-pressed':S.boardFilter===k?'true':'false',onclick:()=>{S.boardFilter=k;renderBoardAdmin(panel)}},`${label} ${posts.filter(tests[k]).length}`)));
  const who=a=>a.role==='student'?`${a.number?a.number+'번 ':''}${a.nickname}`:a.role==='teacher'?'선생님':a.nickname;
  const setState=(type,id,status)=>guard(async()=>{await api('board/status',{type,id,status,...cp});await loadOverview();renderTabs();await renderBoardAdmin(panel)});
  const list=el('div',{class:'report-list'});
  for(const p of posts.filter(tests[S.boardFilter])){
    const replies=p.replies.map(r=>el('li',{class:'board-a'+(r.status!=='shown'?' off':'')+(p.solved===r.id?' chosen':'')},
      el('div',{class:'report-head'},el('strong',{},who(r.author)),el('span',{class:'muted'},formatTime(r.created)),p.solved===r.id?el('span',{class:'badge done'},'도움이 된 답'):null,r.status!=='shown'?el('span',{class:'badge'},BOARD_STATE[r.status]):null),
      el('p',{class:'report-body'},r.body),
      el('div',{class:'actions'},
        p.kind==='question'&&r.status==='shown'&&p.solved!==r.id?button('도움이 된 답으로 표시',guard(async()=>{await api('board/solve',{postId:p.id,replyId:r.id,...cp});await renderBoardAdmin(panel)}),'secondary small'):null,
        r.status==='shown'?button('가리기',setState('reply',r.id,'hidden'),'secondary small'):r.status==='hidden'?button('다시 보이기',setState('reply',r.id,'shown'),'secondary small'):null)));
    const reply=el('textarea',{rows:2,maxlength:300,placeholder:'선생님 답을 적어 주세요. 학생 화면에 「선생님」으로 보입니다.','aria-label':'선생님 답'});
    list.append(el('article',{class:'report-card board-card-admin'+(p.status!=='shown'?' off':'')},
      el('div',{class:'report-head'},el('span',{class:'board-kind-tag '+p.kind},BOARD_KIND[p.kind]),el('strong',{},who(p.author)),el('span',{class:'muted'},formatTime(p.created)),p.solved?el('span',{class:'badge done'},'해결됨'):null,p.status!=='shown'?el('span',{class:'badge'},BOARD_STATE[p.status]):null),
      el('h3',{class:'board-q'},p.title),
      p.gameId?el('p',{class:'muted'},'의뢰 장소: '+(games[p.gameId]?`${games[p.gameId].region}, ${games[p.gameId].title}`:p.gameId)+(p.done?' (이 학생이 해결한 의뢰)':'')):null,
      el('p',{class:'report-body'},p.body),
      replies.length?el('ol',{class:'board-answers'},...replies):el('p',{class:'muted'},'아직 답이 없습니다.'),
      p.status!=='deleted'?el('form',{class:'board-reply-form',onsubmit:guard(async e=>{e.preventDefault();if(reply.value.trim().length<2)throw new Error('답을 두 글자 이상 적어 주세요.');await api('board/reply',{postId:p.id,body:reply.value,...cp});toast('답을 올렸습니다.');await loadOverview();renderTabs();await renderBoardAdmin(panel)})},reply,el('button',{type:'submit',class:'small'},'답 올리기')):null,
      el('div',{class:'actions'},p.status==='shown'?button('이 글 가리기',setState('post',p.id,'hidden'),'secondary small'):p.status==='hidden'?button('다시 보이기',setState('post',p.id,'shown'),'secondary small'):null)));
  }
  // 선생님 글: 반 전체에 던지는 질문이나 안내
  const kind=el('select',{id:'bw-kind'},el('option',{value:'question'},'질문'),el('option',{value:'share'},'결과 나누기'));
  const game=el('select',{id:'bw-game'},el('option',{value:''},'고르지 않음'));
  for(const reg of Object.values(S.regions||{})){const g=el('optgroup',{label:reg.title});for(const z of reg.zones||[])for(const m of z.games||[])g.append(el('option',{value:m.id},m.title));game.append(g)}
  const title=el('input',{id:'bw-title',maxlength:40,placeholder:'예: 오늘 실험에서 가장 놀란 점은 무엇인가요?'}),body=el('textarea',{id:'bw-body',rows:3,maxlength:500});
  const write=el('details',{class:'card board-write'},el('summary',{},'선생님 글 쓰기'),
    el('form',{onsubmit:guard(async e=>{e.preventDefault();await api('board/post',{kind:kind.value,title:title.value,body:body.value,gameId:game.value,...cp});toast('게시판에 올렸습니다.');await renderBoardAdmin(panel)})},
      el('div',{class:'row3'},el('div',{},el('label',{for:'bw-kind'},'종류'),kind),el('div',{},el('label',{for:'bw-game'},'의뢰 장소'),game),el('div',{},el('label',{for:'bw-title'},'제목'),title)),
      el('label',{for:'bw-body'},'내용'),body,el('div',{class:'actions'},el('button',{type:'submit'},'올리기'))));
  panel.replaceChildren(el('section',{class:'card'},
    el('h2',{},'반 친구 게시판'),
    el('p',{class:'muted'},'학생이 게임 위쪽의 「게시판」이나 중앙 광장의 마을 게시판에서 올린 질문과 결과입니다. 같은 반 학생과 선생님만 봅니다. 학생 화면에는 닉네임만 보이고 이 화면에는 번호도 보입니다. 알맞지 않은 글이나 답은 「가리기」로 학생 화면에서 숨기세요. 학생이 지운 글도 이 화면에는 남습니다. 학생이 글 옆의 「선생님께 알리기」를 누르면 「제보」 탭에 들어옵니다.'),
    filters),write,
    el('section',{class:'card'},list.childElementCount?list:el('p',{class:'muted'},posts.length?'이 조건에 맞는 글이 없습니다.':'아직 올라온 글이 없습니다.')));
}

// ------------------------------------------------------------------ 전체 코드
// 코드를 만들거나 다시 만들 때마다 서버가 함께 저장한다. 관리자는 모든 학급, 담임은 자기 반만 본다.
async function renderCodes(panel){
  panel.replaceChildren(el('section',{class:'card'},el('p',{class:'loading'},'코드를 불러오는 중입니다.')));
  const data=await api('admin/codes');
  const total=data.classes.reduce((n,c)=>n+c.students.length,0),known=data.classes.reduce((n,c)=>n+c.students.filter(s=>s.code).length,0);
  const q=el('input',{id:'code-q',type:'search',autocomplete:'off',spellcheck:'false',placeholder:'코드 일부(TUNA)나 반-번호(3-12)로 찾기','aria-label':'코드 찾기',value:S.codeQuery||''});
  const list=el('div',{class:'codes-list'});
  const draw=()=>{S.codeQuery=q.value;list.replaceChildren(...codeSections(data,q.value))};
  q.addEventListener('input',draw);
  const head=el('section',{class:'card'},
    el('div',{class:'cardhead'},el('h2',{},'전체 접속 코드'),el('div',{class:'actions'},
      button('전체 명단 인쇄',()=>printCodeLists(data.classes)),
      button('엑셀 파일로 저장',()=>downloadCodes(data),'secondary'),
      button('새로 고침',guard(()=>renderCodes(panel)),'secondary'))),
    el('p',{class:'muted'},`코드를 만들거나 다시 만들 때마다 자동으로 저장되어 이 화면에서 언제든 다시 볼 수 있습니다. 학생 ${total}명 가운데 ${known}명의 코드가 저장되어 있습니다.`),
    known<total?el('p',{class:'note'},'「모름」은 이 기능이 생기기 전에 만든 코드입니다. 그 학생이 한 번 접속하면 저절로 채워지고, 바로 채우려면 아래 「가지고 있는 코드 등록」에 붙여 넣거나 명부에서 코드를 다시 만듭니다.'):null,
    isAdmin()?myCodeRow(data.myCode):null,
    q);
  panel.replaceChildren(...[head,list,isAdmin()&&known<total?importCard(panel):null].filter(Boolean));
  draw();
}
function codeSections(data,query){
  const t=query.trim().toUpperCase().replace(/\s+/g,''),m=t.match(/^(\d{1,2})[-./반](\d{1,2})번?$/),out=[];
  for(const cl of data.classes){
    let rows=cl.students;
    if(t){
      rows=m?(cl.room===Number(m[1])?rows.filter(s=>s.number===Number(m[2])):[]):rows.filter(s=>(s.code||'').includes(t)||String(s.nickname).toUpperCase().includes(t));
      if(!rows.length&&(m||!(cl.teacherCode||'').includes(t)))continue;
    }
    const printable=cl.students.filter(s=>s.active&&s.code);
    out.push(el('section',{class:'card codes-class'},
      el('div',{class:'cardhead'},el('h3',{},cl.name),el('div',{class:'actions'},
        button('명단 인쇄',()=>printCodeLists([cl]),'secondary small'),
        button('학생 카드 인쇄',()=>printCards(cl,printable),'secondary small',!printable.length))),
      el('p',{class:'codes-teacher'},el('span',{class:'muted'},'담임 선생님 코드'),el('b',{class:'mono'},cl.teacherCode||'모름')),
      cl.testCode?el('p',{class:'codes-teacher'},el('span',{class:'muted'},'체험 계정 코드'),el('b',{class:'mono'},cl.testCode)):null,
      codeTable(rows)));
  }
  return out.length?out:[el('p',{class:'muted'},'맞는 코드가 없습니다.')];
}
function codeTable(rows){
  return el('div',{class:'tablewrap'},el('table',{class:'codes'},
    el('thead',{},el('tr',{},...['번호','닉네임','접속 코드','상태'].map(h=>el('th',{scope:'col'},h)))),
    el('tbody',{},...rows.map(s=>el('tr',{class:s.active?'':'inactive'},
      el('td',{class:'num'},`${s.number}번`),el('td',{},s.nickname),
      el('td',{class:'code'},s.code||el('span',{class:'muted'},'모름')),
      el('td',{},s.active?'사용 중':'쉬는 중'))))));
}
function myCodeRow(code){
  const hidden='●●●●-●●●●-●●●●';let shown=false;
  const val=el('b',{class:'mono'},hidden);
  const btn=button('보기',()=>{shown=!shown;val.textContent=shown?(code||'모름 (다음 접속 때 저장됩니다)'):hidden;btn.textContent=shown?'가리기':'보기'},'secondary small');
  return el('p',{class:'codes-admin'},el('span',{class:'muted'},'관리자 코드'),val,btn);
}
function printCodeLists(classes){
  printArea.replaceChildren(...classes.map(cl=>el('section',{class:'print-sheet'},
    el('p',{class:'print-title'},`${cl.name} 접속 코드 명단 · 담임 선생님 코드 ${cl.teacherCode||'모름'} · 학생 주소 ${accessUrl()}`),
    codeTable(cl.students))));
  window.print();
}
function downloadCodes(data){
  const rows=[['학급','구분','번호','닉네임','접속 코드','상태']];
  if(isAdmin())rows.push(['','관리자','','',data.myCode||'모름','']);
  for(const cl of data.classes){
    rows.push([cl.name,'담임','','',cl.teacherCode||'모름','']);
    for(const s of cl.students)rows.push([cl.name,'학생',s.number,s.nickname,s.code||'모름',s.active?'사용 중':'쉬는 중']);
  }
  const cell=v=>{v=String(v);if(/^[=+\-@]/.test(v))v="'"+v;return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}; // 엑셀 수식으로 읽히지 않게
  const csv='\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
  const d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const a=el('a',{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),download:`접속코드_${day}.csv`});
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
}
function importCard(panel){
  const text=el('textarea',{id:'code-import',rows:6,spellcheck:'false',placeholder:'CUBE-9296\nSUGAR-9247'});
  const go=button('코드 등록',guard(async()=>{
    const codes=[...new Set(text.value.toUpperCase().match(/[A-Z]+(?:-[A-Z]+)?-\d{4}/g)||[])]; // 인쇄물 글자를 통째로 붙여 넣어도 코드만 골라낸다
    if(!codes.length){toast('등록할 코드를 찾지 못했습니다. CUBE-9296처럼 생긴 코드를 넣어 주세요.','error');return}
    go.disabled=true;let saved=0,unknown=0;
    try{for(let i=0;i<codes.length;i+=400){const r=await api('admin/codes/import',{codes:codes.slice(i,i+400)});saved+=r.saved;unknown+=r.unknown.length}}
    finally{go.disabled=false}
    toast(`코드 ${saved}개를 등록했습니다.`+(unknown?` 맞는 학생이 없는 코드 ${unknown}개는 뺐습니다.`:''));
    await renderCodes(panel);
  }));
  return el('section',{class:'card'},el('h2',{},'가지고 있는 코드 등록'),
    el('p',{class:'muted'},'예전에 인쇄하거나 옮겨 적은 코드를 붙여 넣습니다. 접속 카드 PDF의 글자를 통째로 붙여 넣어도 코드만 골라 내고, 서버가 맞는 학생을 찾은 코드만 저장합니다.'),
    el('label',{for:'code-import'},'코드'),text,el('div',{class:'actions'},go));
}

// ------------------------------------------------------------------ 학생 명부
function accessPanel(){
  const lan=S.overview.lan;
  if(lan.public)return el('section',{class:'card access'},el('h2',{},'학생 접속 주소'),el('p',{class:'muted'},'어디서든 이 주소로 들어옵니다. 학생에게 링크를 보내거나 접속 카드를 인쇄해 나눠 줍니다.'),el('p',{class:'url'},location.origin+'/'));
  if(lan.enabled&&lan.urls.length)return el('section',{class:'card access'},el('h2',{},'학생 접속 주소'),el('p',{class:'muted'},'학생 기기의 인터넷 주소창에 아래 주소를 그대로 입력합니다.'),...lan.urls.map(u=>el('p',{class:'url'},u)));
  if(lan.enabled)return el('section',{class:'card access'},el('h2',{},'학생 접속 주소'),el('p',{},'이 컴퓨터의 학교 네트워크 주소를 찾지 못해서, 네트워크 연결을 확인한 뒤 서버를 다시 시작해야 합니다.'));
  return el('section',{class:'card access'},el('h2',{},'학생 접속 주소'),el('p',{},'지금은 이 컴퓨터에서만 접속할 수 있어서, 학생 기기에서 들어오게 하려면 서버를 "실행_학급.ps1"로 다시 시작해야 합니다.'));
}
// 체험 계정: 선생님이 학생 화면을 직접 해 볼 때 쓰는 반마다 하나인 계정(0번). 학생 명부와 진행 통계에는 들어가지 않는다.
function testPanel(cl){
  return el('section',{class:'card test-account'},el('h2',{},'체험 계정'),
    el('p',{class:'muted'},'선생님이 학생 화면을 직접 해 볼 때 쓰는 계정입니다. 게임 위쪽의 「둘러보기」로 아무 지도나 의뢰로 바로 가고, 의뢰 안에서는 「다음 과제 보기」로 풀지 않고 넘겨 볼 수 있습니다. 학생 명부와 진행 통계에는 들어가지 않습니다. 지금 코드는 「전체 코드」 탭에서도 볼 수 있습니다.'),
    el('div',{class:'actions'},button('체험 계정 코드 받기',guard(async()=>{
      const r=await api('admin/test-account',{...classParam()});
      await showCode(`${cl.name} 체험 계정 코드`,r.code,(r.created?'체험 계정을 만들었습니다. ':'체험 계정의 코드를 새로 바꿨습니다. 예전 코드로는 들어올 수 없습니다. ')+'게임 주소에서 이 코드로 들어가면 「둘러보기」 단추가 보입니다.');
    }),'secondary')));
}
function rosterBlocks(cl){return [S.lastCreated&&S.lastCreated.cls.id===cl.id?createdSheet(S.lastCreated):null,accessPanel(),testPanel(cl),rosterCard(cl)].filter(Boolean)}
function rosterCard(cl){
  const students=cl.students;
  const head=el('div',{class:'cardhead'},el('h2',{},'학생 명부'),el('div',{class:'actions'},
    students.some(s=>s.active)?el('button',{type:'button',id:'reissue-all',class:'secondary',onclick:guard(()=>reissueAll(cl))},'학생 코드 모두 새로 만들기'):null,
    button('새로 고침',guard(async()=>{await refreshRoster();toast('최신 기록을 불러왔습니다.')}),'secondary')));
  if(!students.length)return el('section',{class:'card'},head,el('p',{},'아직 학생이 없습니다. "학생 추가"에서 번호와 닉네임을 넣어 만들어 주세요.'));
  const table=el('table',{class:'roster'},
    el('thead',{},el('tr',{},...['번호','닉네임','아바타','진행','마지막 활동','기록 수','상태','관리'].map(h=>el('th',{scope:'col'},h)))),
    el('tbody',{},...students.map(s=>rosterRow(cl,s))));
  return el('section',{class:'card'},head,el('p',{class:'muted'},'진행은 지역마다 끝까지 마친 의뢰 수입니다. 명부는 30초마다 새로 불러옵니다.'),el('div',{class:'tablewrap'},table));
}
function rosterRow(cl,s){
  return el('tr',{class:s.active?'':'inactive'},
    el('td',{class:'num'},`${s.number}번`),
    el('td',{class:'nick'},s.nickname),
    el('td',{class:'avcell'},s.avatar?avatarCanvas(s.avatar,2,'av roster-av'):el('span',{class:'muted'},'아직 만들지 않음')),
    el('td',{},s.regions?el('div',{class:'regions'},...s.regions.map(r=>{const bar=el('i',{class:'fill'});bar.style.width=(r.total?Math.round(r.done/r.total*100):0)+'%';return el('div',{class:'region'+(r.done&&r.done===r.total?' done':'')},el('span',{class:'rname'},r.title),el('span',{class:'rbar','aria-hidden':'true'},bar),el('span',{class:'rnum'},`${r.done}/${r.total}`))})):el('div',{class:'badges'},...QUESTS.map(([id,name])=>el('span',{class:'badge'+(s.quests[id]?' done':'')},name,el('span',{class:'sr'},s.quests[id]?' 완료':' 아직 안 함'))))),
    el('td',{},formatTime(s.lastActive)),
    el('td',{class:'num'},String(s.eventCount)),
    el('td',{},el('span',{class:'state '+(s.active?'on':'off')},s.active?'사용 중':'쉬는 중')),
    el('td',{class:'rowactions'},
      button('닉네임 수정',guard(()=>editStudent(s)),'secondary small'),
      button('코드 재발급',guard(()=>reissue(cl,s)),'secondary small'),
      button('아바타 초기화',guard(()=>resetAvatar(s)),'secondary small',!s.avatar),
      button(s.active?'비활성화':'다시 활성화',guard(()=>toggleActive(s)),s.active?'danger small':'small')));
}
async function editStudent(s){
  const nick=el('input',{id:'edit-nick',value:s.nickname,maxlength:20,autocomplete:'off'});
  const num=el('input',{id:'edit-num',type:'number',min:1,max:60,value:String(s.number),inputmode:'numeric'});
  const saved=await modal(`${s.number}번 ${s.nickname}`,[el('label',{for:'edit-nick'},'닉네임'),nick,el('label',{for:'edit-num'},'번호'),num],[
    {label:'취소',cls:'secondary',value:false},
    {label:'저장',run:async()=>{
      const body={id:s.id};
      if(nick.value.trim()!==s.nickname)body.nickname=nick.value.trim();
      const n=Number(num.value);if(n!==s.number)body.number=n;
      if(Object.keys(body).length>1)await api('admin/students/update',body);
      return true;
    }}]);
  if(saved){await refreshRoster();toast('저장했습니다.')}
}
async function reissue(cl,s){
  if(!(await confirmBox('코드 재발급',`${s.number}번 ${s.nickname} 학생의 접속 코드를 새로 만듭니다. 예전 코드로는 더 이상 들어올 수 없고, 지금 접속 중인 기기도 새 코드로 다시 들어와야 합니다.`,'새 코드 만들기','')))return;
  const {code}=await api('admin/students/reset-code',{id:s.id});
  await showCode(`${s.number}번 ${s.nickname} 새 접속 코드`,code,'이 코드는 지금 한 번만 보입니다. 학생에게 알려 주거나 카드로 인쇄해 주세요.',{cls:cl,student:s});
}
// 반 전체 코드를 한 명씩 차례로 새로 만든다. 중간에 끊겨도 이미 바뀐 학생의 새 코드는 카드로 남긴다.
async function reissueAll(cl){
  const list=cl.students.filter(s=>s.active);
  if(!list.length)return;
  if(!(await confirmBox('학생 코드 모두 새로 만들기',`${cl.name} 학생 ${list.length}명의 접속 코드를 모두 새로 만듭니다. 예전 코드와 이미 나눠 준 카드로는 더 이상 들어올 수 없고, 학습 기록은 그대로 남습니다.`,`${list.length}명 새로 만들기`)))return;
  const btn=document.querySelector('#reissue-all'),made=[];
  if(btn)btn.disabled=true;
  S.reissuing=true; // 도는 동안 30초 자동 새로 고침이 단추를 다시 그리지 않게 한다
  try{
    for(const s of list){
      if(btn)btn.textContent=`만드는 중 ${made.length}/${list.length}`;
      const {code}=await api('admin/students/reset-code',{id:s.id});
      made.push({id:s.id,number:s.number,nickname:s.nickname,code});
    }
  }finally{
    S.reissuing=false;
    if(made.length){S.lastCreated={cls:{id:cl.id,name:cl.name,grade:cl.grade,room:cl.room},students:made};S.printed=false;await refreshRoster()}
    else if(btn){btn.disabled=false;btn.textContent='학생 코드 모두 새로 만들기'}
  }
  toast(`학생 ${made.length}명의 코드를 새로 만들었습니다. 위 접속 카드를 인쇄해 주세요.`);
}
async function resetAvatar(s){
  if(!(await confirmBox('아바타 초기화',`${s.number}번 ${s.nickname} 학생의 아바타를 지웁니다. 학생은 다음에 접속할 때 아바타를 새로 만듭니다. 학습 기록은 그대로 남습니다.`,'아바타 지우기')))return;
  await api('admin/students/reset-avatar',{id:s.id});await refreshRoster();toast('아바타를 초기화했습니다.');
}
async function toggleActive(s){
  const off=s.active;
  const ok=await confirmBox(off?'학생 비활성화':'다시 활성화',off?`${s.number}번 ${s.nickname} 학생이 더 이상 접속할 수 없게 됩니다. 지금까지의 학습 기록은 지워지지 않고, 필요하면 다시 활성화할 수 있습니다.`:`${s.number}번 ${s.nickname} 학생이 원래 접속 코드로 다시 들어올 수 있게 됩니다.`,off?'비활성화':'다시 활성화',off?'danger':'');
  if(!ok)return;
  await api('admin/students/update',{id:s.id,active:!off});await refreshRoster();toast(off?'비활성화했습니다.':'다시 활성화했습니다.');
}

// ------------------------------------------------------------------ 학생 추가
function parseBulk(text,used){
  const entries=[],errors=[],seen=new Set();
  text.split(/\r?\n/).forEach((raw,i)=>{
    const line=raw.trim();if(!line)return;
    let numPart=line,nick='';
    const k=line.search(/[,，\t]/);
    if(k>=0){numPart=line.slice(0,k);nick=line.slice(k+1)}else{const sp=line.search(/\s/);if(sp>=0){numPart=line.slice(0,sp);nick=line.slice(sp+1)}}
    numPart=numPart.trim().replace(/번$/,'');nick=nick.trim();
    const where=`${i+1}번째 줄`;
    if(!/^\d{1,2}$/.test(numPart)){errors.push(`${where}: "번호,닉네임" 모양으로 써 주세요.`);return}
    const number=Number(numPart),nickname=nick||`탐험가${number}`;
    if(number<1||number>60)errors.push(`${where}: 번호는 1부터 60까지 쓸 수 있습니다.`);
    else if(seen.has(number))errors.push(`${where}: ${number}번이 두 번 들어 있습니다.`);
    else if(used.has(number))errors.push(`${where}: ${number}번 학생이 이미 있습니다.`);
    else if([...nickname].length>20)errors.push(`${where}: 닉네임은 20자까지 쓸 수 있습니다.`);
    else{seen.add(number);entries.push({number,nickname})}
  });
  if(entries.length>60)errors.push('한 번에 60명까지 만들 수 있습니다.');
  return {entries,errors};
}
function addPanel(cl){
  const used=new Set(cl.students.filter(s=>s.active).map(s=>s.number));
  const from=el('input',{id:'fill-from',type:'number',min:1,max:60,value:'1',inputmode:'numeric','aria-label':'시작 번호'});
  const to=el('input',{id:'fill-to',type:'number',min:1,max:60,value:'25',inputmode:'numeric','aria-label':'끝 번호'});
  const text=el('textarea',{id:'bulk',rows:12,spellcheck:'false',placeholder:'7,별빛탐험가\n8,바람연구원\n9'});
  const status=el('div',{class:'bulkstatus',role:'status'});
  const createBtn=el('button',{type:'button',class:'big',disabled:true},'학생 만들기');
  const update=()=>{
    const {entries,errors}=parseBulk(text.value,used);
    status.replaceChildren(...[entries.length&&!errors.length?el('p',{class:'ok'},`학생 ${entries.length}명을 만듭니다.`):null,errors.length?el('ul',{class:'errors'},...errors.slice(0,8).map(e=>el('li',{},e)),errors.length>8?el('li',{},`그 밖에 ${errors.length-8}줄을 더 확인해 주세요.`):null):null].filter(Boolean));
    createBtn.disabled=!entries.length||errors.length>0;
  };
  text.addEventListener('input',update);
  const fill=()=>{
    const a=Number(from.value),b=Number(to.value);
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b>60||a>b){toast('1부터 60 사이에서 시작 번호가 끝 번호보다 작거나 같게 넣어 주세요.','error');return}
    const lines=[],skipped=[];
    for(let n=a;n<=b;n++)(used.has(n)?skipped:lines).push(n);
    text.value=lines.join('\n');update();
    if(skipped.length)toast(`이미 있는 번호 ${skipped.length}개(${skipped.slice(0,6).join(', ')}${skipped.length>6?' 등':''}번)는 뺐습니다.`);
  };
  createBtn.addEventListener('click',guard(async()=>{
    const {entries,errors}=parseBulk(text.value,used);if(!entries.length||errors.length)return;
    createBtn.disabled=true;createBtn.textContent='만드는 중입니다';
    try{
      const made=await api('admin/students/create',{...classParam(),entries});
      S.lastCreated={cls:{id:cl.id,name:cl.name,grade:cl.grade,room:cl.room},students:made};S.printed=false;
      await loadOverview();renderClassBar();await renderPanel();
      toast(`학생 ${made.length}명을 만들었습니다. 아래 접속 카드를 인쇄해 주세요.`);
    }finally{createBtn.textContent='학생 만들기';createBtn.disabled=false}
  }));
  const blocks=[];
  if(S.lastCreated&&S.lastCreated.cls.id===cl.id)blocks.push(createdSheet(S.lastCreated));
  blocks.push(el('section',{class:'card'},el('h2',{},'번호로 빠르게 채우기'),
    el('div',{class:'fillrow'},el('span',{},'번호'),from,el('span',{},'번부터'),to,el('span',{},'번까지'),button('채우기',fill,'secondary')),
    el('p',{class:'muted'},'이미 있는 번호는 빼고 아래 칸에 채웁니다. 닉네임은 채운 뒤 번호 옆에 쉼표를 찍고 써도 됩니다.')));
  blocks.push(el('section',{class:'card'},el('h2',{},'번호와 닉네임 입력'),
    el('label',{for:'bulk'},'한 줄에 한 명씩 "번호,닉네임"으로 씁니다. 닉네임을 비우면 "탐험가7"처럼 정해집니다.'),text,status,
    el('p',{class:'muted'},'접속 코드는 만든 직후에 한 번만 보입니다. 코드를 잃어버린 학생은 명부에서 "코드 재발급"으로 새 코드를 받을 수 있습니다.'),
    el('div',{class:'actions'},createBtn)));
  return blocks;
}
function createdSheet(last){
  return el('section',{class:'card created'},
    el('div',{class:'cardhead'},el('h2',{},`방금 만든 학생 ${last.students.length}명의 접속 카드`),
      el('div',{class:'actions'},button('인쇄하기',()=>printCards(last.cls,last.students),'big'),button('카드 닫기',async()=>{
        if(!S.printed&&!(await confirmBox('카드 닫기','아직 인쇄하지 않았습니다. 닫으면 이 코드들을 다시 볼 수 없습니다.','닫기')))return;
        S.lastCreated=null;S.printed=true;await renderPanel();
      },'secondary'))),
    el('p',{class:'note'},'이 코드는 지금 한 번만 보입니다. 인쇄하거나 옮겨 적어 두세요. 잃어버린 코드는 명부에서 다시 발급할 수 있습니다.'),
    codeCards(last.cls,last.students));
}

// ------------------------------------------------------------------ 마을 인물(NPC)
function mapOptions(){
  const out=[{id:'hub',name:'중앙 광장'}];
  for(const [key,r] of Object.entries(S.regions||{})){out.push({id:key,name:r.title});for(const z of r.zones||[])out.push({id:z.id,name:`${r.title}: ${z.title}`})}
  return out;
}
const mapName=id=>mapOptions().find(m=>m.id===id)?.name||'알 수 없는 장소';
function mergedNpcs(){
  const over=new Map(S.npcRows.map(n=>[n.id,n])),defaultIds=new Set(S.defaults.map(d=>d.id));
  const list=S.defaults.map(d=>{const o=over.get(d.id);return o?{...d,...o,kind:'overridden'}:{...d,published:true,kind:'default'}});
  for(const o of S.npcRows)if(!defaultIds.has(o.id))list.push({...o,kind:'custom'});
  return list;
}
async function loadNpcRows(){S.npcRows=(await api('npcs'+(isAdmin()?'?classId='+encodeURIComponent(S.classId):''))).npcs}
async function renderNpcPanel(panel){
  panel.replaceChildren(el('section',{class:'card'},el('p',{},'마을 인물을 불러오는 중입니다.')));
  await loadNpcRows();
  const list=mergedNpcs();
  if(S.editing&&!S.editing.isNew)S.editing=list.find(n=>n.id===S.editing.id)||null;
  const listCol=el('div',{class:'npclist'});
  const head=el('section',{class:'card'},el('div',{class:'cardhead'},el('h2',{},'마을 인물'),button('새 인물 만들기',()=>openEditor(newNpc()),'')),
    el('p',{class:'muted'},'게임에 나오는 인물의 이름, 위치, 대사를 이 학급에 맞게 바꿉니다. 바꾼 내용은 이 학급 학생에게만 보입니다.'),
    S.defaults.length?null:el('p',{class:'note'},'기본 인물 목록을 불러오지 못했습니다. 새로 만든 인물과 바꾼 인물만 보입니다.'));
  listCol.append(head);
  for(const m of mapOptions()){
    const group=list.filter(n=>n.map===m.id);if(!group.length)continue;
    listCol.append(el('section',{class:'card npcgroup'},el('h3',{},m.name),el('ul',{},...group.map(n=>el('li',{},el('button',{type:'button',class:'npcitem'+(S.editing&&S.editing.id===n.id?' on':''),'data-id':n.id,'aria-label':[n.name,n.role,n.kind==='overridden'?'바뀜':n.kind==='custom'?'새 인물':'',n.published===false?'숨김':''].filter(Boolean).join(', '),onclick:()=>openEditor(n)},
      avatarCanvas(n.avatar,1,'av mini'),el('span',{class:'npcname'},n.name),el('span',{class:'npcrole'},n.role||''),
      el('span',{class:'tags'},n.kind==='overridden'?el('span',{class:'tag changed'},'바뀜'):null,n.kind==='custom'?el('span',{class:'tag custom'},'새 인물'):null,n.published===false?el('span',{class:'tag hidden'},'숨김'):null)))))));
  }
  const unknown=list.filter(n=>!mapOptions().some(m=>m.id===n.map));
  if(unknown.length)listCol.append(el('section',{class:'card npcgroup'},el('h3',{},'기타 장소'),el('ul',{},...unknown.map(n=>el('li',{},el('button',{type:'button',class:'npcitem',onclick:()=>openEditor(n)},avatarCanvas(n.avatar,1,'av mini'),el('span',{class:'npcname'},n.name)))))));
  const editCol=el('div',{class:'npceditor',id:'npc-editor'});
  panel.replaceChildren(el('div',{class:'npcgrid'},listCol,editCol));
  if(S.editing)renderEditor(S.editing);else editCol.append(el('section',{class:'card'},el('p',{class:'muted'},'왼쪽 목록에서 인물을 고르거나 "새 인물 만들기"를 눌러 주세요.')));
}
function newNpc(){const {w,h}=S.mapSize('hub');return {id:'',name:'',role:'',map:'hub',x:Math.round(w/2),y:Math.round(h/2),avatar:randomAvatar(),lines:[''],published:true,kind:'new',isNew:true}}
function openEditor(n){
  S.editing=n;renderEditor(n);
  document.querySelectorAll('.npcitem').forEach(b=>b.classList.toggle('on',!!n.id&&b.dataset.id===n.id));
  const box=document.querySelector('#npc-editor');if(box&&window.matchMedia('(max-width: 1000px)').matches)box.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderEditor(n){
  const box=document.querySelector('#npc-editor');if(!box)return;
  const draft={id:n.isNew?'':n.id,avatar:sanitizeAvatar(n.avatar),original:sanitizeAvatar(n.avatar)};
  const name=el('input',{id:'npc-name',value:n.name||'',maxlength:20,autocomplete:'off'});
  const role=el('input',{id:'npc-role',value:n.role||'',maxlength:30,autocomplete:'off'});
  const map=el('select',{id:'npc-map'},...mapOptions().map(m=>el('option',{value:m.id},m.name)));map.value=mapOptions().some(m=>m.id===n.map)?n.map:'hub';
  const x=el('input',{id:'npc-x',type:'number',value:String(n.x),inputmode:'numeric'}),y=el('input',{id:'npc-y',type:'number',value:String(n.y),inputmode:'numeric'});
  const lines=el('textarea',{id:'npc-lines',rows:6},);lines.value=(n.lines||[]).join('\n');
  const lineCount=el('p',{class:'muted'});
  const published=el('input',{id:'npc-published',type:'checkbox',checked:n.published!==false});
  const look=el('select',{id:'npc-look'},el('option',{value:'keep'},'지금 모습 유지'),...Object.entries(PRESETS).map(([k,p])=>el('option',{value:k},p.name)),el('option',{value:'random'},'무작위'));
  const reroll=button('다른 모습 뽑기',()=>{draft.avatar=sanitizeAvatar(randomAvatar());drawPreview()},'secondary');reroll.hidden=true;
  const preview=el('canvas',{width:FW*3,height:FH*3,class:'av preview',role:'img','aria-label':'인물 모습 미리 보기'});
  const place=el('canvas',{class:'place',width:480,height:320,'aria-label':'지도에서 위치 고르기'});
  const bounds=()=>{const {w,h}=S.mapSize(map.value);return {w,h,minX:20,maxX:w-20,minY:40,maxY:h-10}};
  const clampInputs=()=>{const b=bounds();for(const [input,lo,hi] of [[x,b.minX,b.maxX],[y,b.minY,b.maxY]]){const v=Math.round(Number(input.value));input.value=String(Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):lo)}};
  function drawPreview(){const c=preview.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,preview.width,preview.height);c.setTransform(3,0,0,3,0,0);drawFrame(c,getAvatarSheet(draft.avatar),preview.width/6,preview.height/3-4);c.setTransform(1,0,0,1,0,0)}
  function drawPlace(){
    const b=bounds(),W=480,H=Math.round(480*b.h/b.w);place.width=W;place.height=H;
    const s=W/b.w,c=place.getContext('2d');
    c.fillStyle='#cfe3bd';c.fillRect(0,0,W,H);
    c.strokeStyle='rgba(36,61,53,.12)';c.lineWidth=1;
    for(let gx=0;gx<=b.w;gx+=160){c.beginPath();c.moveTo(gx*s+.5,0);c.lineTo(gx*s+.5,H);c.stroke()}
    for(let gy=0;gy<=b.h;gy+=160){c.beginPath();c.moveTo(0,gy*s+.5);c.lineTo(W,gy*s+.5);c.stroke()}
    c.setLineDash([6,4]);c.strokeStyle='#1b6353';c.strokeRect(b.minX*s,b.minY*s,(b.maxX-b.minX)*s,(b.maxY-b.minY)*s);c.setLineDash([]);
    c.font='12px "Malgun Gothic", sans-serif';c.textAlign='center';
    for(const o of mergedNpcs()){
      if(o.map!==map.value||(n.id&&o.id===n.id))continue;
      c.beginPath();c.arc(o.x*s,o.y*s,5,0,Math.PI*2);c.fillStyle=o.published===false?'#ffffff':'#6b7b72';c.fill();c.strokeStyle='#44544b';c.stroke();
      c.fillStyle='#243d35';c.fillText(o.name,o.x*s,o.y*s-9);
    }
    const px=Number(x.value)*s,py=Number(y.value)*s;
    c.beginPath();c.arc(px,py,8,0,Math.PI*2);c.fillStyle='#e8731f';c.fill();c.lineWidth=2;c.strokeStyle='#fff';c.stroke();c.lineWidth=1;
    c.fillStyle='#8a3d06';c.font='bold 13px "Malgun Gothic", sans-serif';c.fillText(name.value.trim()||'새 인물',px,py-13);
  }
  place.addEventListener('click',e=>{
    const r=place.getBoundingClientRect(),b=bounds();
    x.value=String(Math.round((e.clientX-r.left)/r.width*b.w));y.value=String(Math.round((e.clientY-r.top)/r.height*b.h));clampInputs();drawPlace();
  });
  const countLines=()=>{const k=lines.value.split(/\r?\n/).filter(v=>v.trim()).length;lineCount.textContent=`대사 ${k}줄 / 최대 8줄`;lineCount.className=k<1||k>8?'warn':'muted'};
  lines.addEventListener('input',countLines);
  x.addEventListener('input',drawPlace);y.addEventListener('input',drawPlace);x.addEventListener('change',()=>{clampInputs();drawPlace()});y.addEventListener('change',()=>{clampInputs();drawPlace()});
  name.addEventListener('input',drawPlace);
  map.addEventListener('change',()=>{
    const b=bounds(),vx=Number(x.value),vy=Number(y.value);
    if(!(vx>=b.minX&&vx<=b.maxX&&vy>=b.minY&&vy<=b.maxY)){x.value=String(Math.round(b.w/2));y.value=String(Math.round(b.h/2))} // 새 지도 밖이면 가운데로
    clampInputs();drawPlace();
  });
  look.addEventListener('change',()=>{
    reroll.hidden=look.value!=='random';
    draft.avatar=look.value==='keep'?draft.original:look.value==='random'?sanitizeAvatar(randomAvatar()):sanitizeAvatar(PRESETS[look.value].avatar);drawPreview();
  });
  const save=guard(async()=>{
    clampInputs();
    const text=lines.value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
    if(!name.value.trim()){toast('이름을 써 주세요.','error');name.focus();return}
    if(!text.length||text.length>8){toast('대사는 1줄에서 8줄까지 쓸 수 있습니다.','error');lines.focus();return}
    if(text.some(v=>v.length>200)){toast('대사 한 줄은 200자까지 쓸 수 있습니다.','error');lines.focus();return}
    const npc={id:draft.id,name:name.value.trim(),role:role.value.trim(),map:map.value,x:Number(x.value),y:Number(y.value),avatar:draft.avatar,lines:text,published:published.checked};
    const saved=await api('admin/npcs',{...classParam(),npc});
    S.editing={id:saved.id};await renderNpcPanel(document.querySelector('#panel'));
    toast('저장했습니다. 학생 기기에서는 게임 화면을 새로 고치면 바뀐 내용이 보입니다.');
  });
  const remove=guard(async()=>{
    const custom=n.kind==='custom';
    if(!(await confirmBox(custom?'인물 지우기':'기본값으로 되돌리기',custom?`"${n.name}" 인물을 이 학급 지도에서 지웁니다. 학생 학습 기록에는 영향이 없습니다.`:`"${n.name}"의 이름, 위치, 대사, 모습이 처음 상태로 돌아갑니다.`,custom?'지우기':'되돌리기',custom?'danger':'')))return;
    await api('admin/npcs/reset',{...classParam(),id:n.id});
    S.editing=custom?null:{id:n.id};await renderNpcPanel(document.querySelector('#panel'));
    toast(custom?'인물을 지웠습니다.':'기본값으로 되돌렸습니다.');
  });
  const kindNote=n.isNew?'새 인물':n.kind==='overridden'?'기본 인물을 이 학급에 맞게 바꾼 상태':n.kind==='custom'?'이 학급에서 만든 인물':'기본 인물';
  box.replaceChildren(el('section',{class:'card editor'},
    el('div',{class:'cardhead'},el('h2',{},n.isNew?'새 인물 만들기':`${n.name} 고치기`),button('닫기',()=>{S.editing=null;document.querySelectorAll('.npcitem').forEach(b=>b.classList.remove('on'));box.replaceChildren(el('section',{class:'card'},el('p',{class:'muted'},'왼쪽 목록에서 인물을 고르거나 "새 인물 만들기"를 눌러 주세요.')))},'secondary')),
    el('p',{class:'muted'},kindNote),
    el('div',{class:'row2'},el('div',{},el('label',{for:'npc-name'},'이름'),name),el('div',{},el('label',{for:'npc-role'},'역할'),role)),
    el('label',{for:'npc-map'},'지도'),map,
    el('div',{class:'row2'},el('div',{},el('label',{for:'npc-x'},'가로 위치 (x)'),x),el('div',{},el('label',{for:'npc-y'},'세로 위치 (y)'),y)),
    el('p',{class:'muted'},'아래 지도 그림을 누르면 그 자리로 옮겨집니다. 회색 점은 같은 지도의 다른 인물, 흰 점은 숨긴 인물입니다.'),
    place,
    el('label',{for:'npc-lines'},'대사 (한 줄이 말풍선 하나)'),lines,lineCount,
    el('label',{class:'check',for:'npc-published'},published,el('span',{},'학생 화면에 보이기')),
    el('div',{class:'lookrow'},el('div',{},el('label',{for:'npc-look'},'외형'),look,reroll),preview),
    el('div',{class:'actions'},button('저장',save,'big'),n.kind==='overridden'||n.kind==='custom'?button(n.kind==='custom'?'이 인물 지우기':'기본값으로 되돌리기',remove,n.kind==='custom'?'danger':'secondary'):null)));
  countLines();drawPreview();drawPlace();
}

// ------------------------------------------------------------------ 시작
async function boot(){
  try{S.regions=await (await fetch('/regions.json')).json()}catch{S.regions={}}
  try{const m=await import('/npcs.mjs');if(Array.isArray(m.DEFAULT_NPCS))S.defaults=m.DEFAULT_NPCS;if(typeof m.mapSize==='function')S.mapSize=m.mapSize}catch{S.defaults=[]}
  try{S.me=await api('me')}catch{S.me=null}
  await route();
}
boot();
