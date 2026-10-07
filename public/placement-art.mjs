export function paintPlacement(c,p){
const x=p.x,y=p.y;c.save();c.translate(x,y);c.fillStyle='#203a3855';c.fillRect(-23,-3,46,9);
if(p.kind==='bookshelf'){c.fillStyle='#633e30';c.fillRect(-22,-48,44,49);c.fillStyle='#c49255';c.fillRect(-18,-44,36,17);c.fillRect(-18,-23,36,17);for(let row=0;row<2;row++)for(let i=0;i<5;i++){c.fillStyle=['#d95d54','#70bca1','#eac865','#779dd3','#d49bbb'][i];c.fillRect(-16+i*7,-41+row*21,5,14)}}
else if(p.kind==='terminal'){c.fillStyle='#34475c';c.fillRect(-22,-49,44,34);c.fillRect(-5,-17,10,15);c.fillRect(-17,-3,34,5);c.fillStyle='#84d9d5';c.fillRect(-17,-44,34,23);c.fillStyle='#fff2bd';c.beginPath();c.moveTo(-4,-40);c.lineTo(8,-33);c.lineTo(-4,-26);c.fill()}
else{c.fillStyle='#70452f';c.fillRect(-18,-45,5,47);c.fillRect(13,-45,5,47);c.fillRect(-27,-47,54,35);c.fillStyle='#f2dbad';c.fillRect(-23,-43,46,27);c.fillStyle='#836b4e';c.fillRect(-17,-36,32,3);c.fillRect(-17,-29,24,3)}c.restore();}
