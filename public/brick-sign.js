/* 레고브릭 서명: brick-stack을 읽어 콘솔에 브릭 탑을 그린다(새 브릭이 맨 위). 화면에는 나타나지 않고 통신도 하지 않는다. */
(()=>{try{
  const stack=JSON.parse(document.getElementById('brick-stack').textContent);
  const COL=['#C91A09','#F2CD37','#0055BF','#237841','#FE8A18','#A0A5A9'],INK=['#fff','#222','#fff','#fff','#222','#222'];
  const W=18,mono='font:13px/1.3 Consolas,monospace;',f=[],s=[],put=(t,st='')=>{f.push('%c'+t);s.push(st);};
  [...stack].reverse().forEach((b,i)=>{
    const k=(b.v-1)%COL.length,pad=' '.repeat(b.v%2?0:4),box=mono+'padding:2px 0;background:'+COL[k]+';color:'+INK[k];
    if(i===0){put(pad+' '+' ▄▄ '.repeat(4)+' ',mono+'color:'+COL[k]);put('\n');}
    const num=String(b.v),mid=Math.floor((W-num.length)/2);
    [[' '.repeat(W),`${b.v}판  ${b.by}${b.at?' · '+b.at:''}`,'font:700 13px/1.3 "Malgun Gothic",sans-serif'],
     [' '.repeat(mid)+num+' '.repeat(W-mid-num.length),b.share||'','font:12px/1.3 "Malgun Gothic",sans-serif;color:#888'],
     [' '.repeat(W),[b.did,b.date].filter(Boolean).join(' · '),'font:12px/1.3 "Malgun Gothic",sans-serif;color:#888']
    ].forEach(([fill,label,st])=>{put(pad,mono);put(fill,box);put('   '+label,st);put('\n');});
  });
  put('▀'.repeat(W+8),mono+'color:#9BA3AB');
  console.log(f.join(''),...s);
  console.log('%c레고브릭 서명 · 이 파일을 쌓아 온 사람들','font:700 15px/1.6 "Malgun Gothic",sans-serif;color:#C91A09');
  console.log('%c레고처럼 한 칸씩 쌓아 온 자료입니다.\n고쳐서 다시 나누신다면 소스(Ctrl+U)에서 brick-stack을 찾아 맨 끝에 한 줄을 보태 주세요.\n다음에 여는 사람에게 브릭이 하나 더 얹혀 보입니다. 앞 사람의 브릭은 그대로 두시면 됩니다.','font:13px/1.7 "Malgun Gothic",sans-serif');
}catch(e){}})();
