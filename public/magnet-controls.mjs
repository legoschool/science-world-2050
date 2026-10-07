export function magnetControls(host,{el,button,invoke}){
function update(m,on){const previous=host.contains(document.activeElement)?document.activeElement.dataset.part:null;host.replaceChildren();if(!m.safe)return;
function part(id,label,caption,area,action,disabled=false){const b=button('',()=>invoke(action));b.className='magnet-part';b.dataset.part=id;b.setAttribute('aria-label',label);b.title=label;b.style.left=area[0]+'%';b.style.top=area[1]+'%';b.style.width=area[2]+'%';b.style.height=area[3]+'%';b.disabled=disabled;b.append(el('span',{},caption));host.append(b)}
part('coil',m.tape?'장면에서 에나멜선 감기':'장면에서 볼트에 테이프 붙이기',m.tape?'선 감기':'테이프',[31,25,38,23],m.tape?'한 방향으로 촘촘하게 감기':'볼트에 테이프 붙이기',on);
part('ends',m.tails?'장면에서 양 끝 피복 벗기기':'장면에서 선 끝 여유 남기기',m.tails?'끝 피복':'끝 여유',[69,34,8,30],m.tails?'양 끝의 피복만 벗기기':'양 끝에 약 5 cm 여유 남기기',on);
part('connection','장면에서 회로 연결하기','연결',[38,72,12,13],'양 끝을 회로에 연결',on);
if(m.connected)part('switch',on?'장면 스위치 열기':'장면 스위치 닫기',on?'열기':'닫기',[53,68,9,17],on?'스위치 열기':'스위치 닫고 철심 빵 끈 관찰');
if(previous)host.querySelector('[data-part="'+previous+'"]')?.focus({preventScroll:true});}
return {update};}
