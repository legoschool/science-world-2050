import {paint} from './assets/science-parts.mjs';
import {getAvatarSheet,playerAvatar,drawFrame} from './sprites.mjs';
import {DODAM_AVATAR,DODAM_SPRITE} from './npcs.mjs';
import {loadSheet} from './npc-sheets.mjs';
export function light(c,x,y,r,power=1){const g=c.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,`rgba(255,218,125,${.45*power})`);g.addColorStop(.4,`rgba(255,201,94,${.2*power})`);g.addColorStop(1,'rgba(255,196,90,0)');c.save();c.globalCompositeOperation='screen';c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
export function room(canvas,{lit=false,complete=false}={}){const c=canvas.getContext('2d'),hero=getAvatarSheet(playerAvatar());let npc=getAvatarSheet(DODAM_AVATAR),alive=true,raf;loadSheet(DODAM_SPRITE).then(s=>{npc=s}).catch(()=>{});const start=performance.now(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(now){if(!alive)return;const rise=reduce?1:Math.min(1,(now-start)/850);c.imageSmoothingEnabled=false;c.fillStyle='#172a37';c.fillRect(0,0,960,560);
for(let y=180;y<560;y+=32)for(let x=0;x<960;x+=64){c.fillStyle=((x/64+y/32)%2)?'#263d47':'#2b424a';c.fillRect(x+1,y+1,62,30)}
c.fillStyle='#314856';c.fillRect(38,30,884,148);c.fillStyle='#0d1928';c.fillRect(66,53,158,98);c.fillRect(733,53,158,98);c.strokeStyle='#526678';c.lineWidth=6;[145,812].forEach(x=>{c.beginPath();c.moveTo(x,53);c.lineTo(x,151);c.stroke()});
c.fillStyle=complete?'#eac76d':'#26323b';c.fillRect(328,56,302,85);c.strokeStyle='#658082';c.strokeRect(328,56,302,85);c.fillStyle=complete?'#273c39':'#59696c';c.font='bold 22px sans-serif';c.textAlign='center';c.fillText(complete?'도서관 가는 길 →':'…  →  …',480,108);
c.fillStyle='#0e1d25';c.fillRect(102,258,756,195);c.fillStyle='#8b6546';c.fillRect(94,240,772,185);c.fillStyle='#b18b61';c.fillRect(94,230,772,12);c.fillStyle='#493c33';c.fillRect(108,425,28,75);c.fillRect(824,425,28,75);
drawFrame(c,hero,230,503);drawFrame(c,npc,720,494,{dir:'left'});
c.fillStyle=`rgba(4,12,24,${complete?.12:.42})`;c.fillRect(0,0,960,560);light(c,230,462,90,.55);if(lit){light(c,300,280,140,.45*rise);light(c,660,280,200,rise)}if(complete){light(c,480,102,310,rise);light(c,760,210,230,rise)}
c.fillStyle='#e5e5d3';c.font='14px sans-serif';c.fillText(complete?'신항이  “이제 길을 읽을 수 있어요.”':lit?'신항이  “빛이 달라졌어요. 두 쪽을 비교해 보세요.”':'신항이  “너무 어두워서 안내판을 읽을 수 없어요…”',480,530);
raf=requestAnimationFrame(frame)}raf=requestAnimationFrame(frame);return()=>{alive=false;cancelAnimationFrame(raf)}}
