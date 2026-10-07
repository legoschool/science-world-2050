(function(){
  var q=document.getElementById('mission-filter'),all=document.querySelectorAll('details.m'),out=document.getElementById('filter-count');
  var openAll=document.getElementById('open-all');
  function run(){var v=(q.value||'').trim().toLowerCase(),n=0;
    all.forEach(function(d){var hit=!v||d.textContent.toLowerCase().indexOf(v)>=0;d.hidden=!hit;if(hit)n++;});
    document.querySelectorAll('section.region').forEach(function(s){var any=s.querySelectorAll('details.m:not([hidden])').length;s.querySelector('.missions').dataset.empty=any?'':'1';});
    out.textContent=v?('찾은 의뢰 '+n+'개'):('의뢰 '+all.length+'개');}
  q.addEventListener('input',run);
  openAll.addEventListener('click',function(){var o=openAll.dataset.state!=='open';all.forEach(function(d){if(!d.hidden)d.open=o;});openAll.dataset.state=o?'open':'';openAll.textContent=o?'모두 접기':'모두 펼치기';});
  run();
})();
