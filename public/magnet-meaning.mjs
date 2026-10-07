export function magnetMeaning(host,{el,button,state,record,save}){
const q=state.magnetMeaning??={name:'',reason:'',hint:0};let feedback='';
function render(){host.replaceChildren(el('h2',{},'공방에 남길 사용 안내'),el('p',{},'신항이: “스위치를 닫았을 때와 열었을 때 달랐지요. 이 장치를 무엇이라고 설명하면 좋을까요?”'));
const group=(label,key,options)=>{const box=el('fieldset',{class:'magnet-choices'},el('legend',{},label));for(const[value,title]of options){const input=el('input',{type:'radio',name:'magnet-'+key,value,'aria-label':title});input.checked=q[key]===value;input.onchange=()=>{q[key]=value;save()};box.append(el('label',{},input,title))}host.append(box)};
group('장치의 이름과 성질','name',[['electromagnet','전기가 흐를 때 자석 성질이 나타나는 전자석'],['always','선만 감겨 있으면 언제나 붙는 자석'],['conductor','전기가 흐르는 모든 물체는 자석']]);
group('필요할 때만 켜는 까닭','reason',[['heat','오래 켜 두면 전지와 전선이 뜨거워질 수 있기 때문에'],['strong','켜 둔 시간만큼 계속 더 세지기 때문에'],['empty','철이 모두 없어지기 때문에']]);
host.append(button('사용 안내 남기기',()=>{if(!q.name||!q.reason){feedback='장치의 설명과 전원을 끄는 까닭을 함께 골라 주세요.';render();return}record('magnetMeaning.submitted','magnetMeaning',{roles:{name:q.name,reason:q.reason},hint:q.hint});feedback=q.name==='electromagnet'&&q.reason==='heat'?'사용 안내를 남겼어요. 필요한 때만 스위치를 닫고, 관찰이 끝나면 전원을 꺼요.':'스위치 전후의 관찰과 전지와 전선이 뜨거워질 수 있다는 점을 다시 연결해 보세요.';save();render()}),button('설명 생각 열쇠',()=>{q.hint=Math.min(3,q.hint+1);record('magnetMeaning.hint','magnetMeaning',{answer:'help',hint:q.hint});save();render()}));
if(q.hint)host.append(el('p',{class:'hint'},['선이 감겨 있는 모습은 같았는데, 스위치를 열고 닫았을 때 무엇이 달랐나요?','전기가 흐를 때 자석 성질이 나타나는 장치를 전자석이라고 해요.','전류가 계속 흐르면 전지와 전선이 뜨거워질 수 있어요. 필요한 때만 켜고 관찰 후에는 꺼요.'][q.hint-1]));if(feedback)host.append(el('p',{role:'status'},feedback));}
render();}
