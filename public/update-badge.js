// 오른쪽 아래에 마지막 업데이트 시각을 보여 준다.
// 시각과 기록은 같은 폴더 update-stamp.js(배포할 때 stamp.cjs가 새로 씀)에서 읽는다.
// 다른 게임에도 똑같이 쓰는 파일이므로 원본은 C:\Users\11130\vercel-deploy\_common 에서 고친다.
(function () {
  var me = document.currentScript;
  var pos = (me && me.getAttribute('data-pos')) || 'br';
  var base = me ? me.src.replace(/[^\/]*$/, '') : '';

  function css(el, o) { for (var k in o) el.style[k] = o[k]; return el; }
  function el(tag, text, o) { var e = document.createElement(tag); if (text != null) e.textContent = text; return css(e, o || {}); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parts(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return null;
    var k = new Date(d.getTime() + 9 * 3600e3);   // 한국 시각으로 고정해 보여 준다
    return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate(), w: '일월화수목금토'[k.getUTCDay()], h: k.getUTCHours(), mi: k.getUTCMinutes() };
  }
  function short(iso) { var p = parts(iso); return p ? p.m + '.' + p.d + ' ' + pad(p.h) + ':' + pad(p.mi) : '?'; }
  function long(iso) { var p = parts(iso); return p ? p.y + '년 ' + p.m + '월 ' + p.d + '일(' + p.w + ') ' + pad(p.h) + ':' + pad(p.mi) : '?'; }
  function ago(iso) {
    var m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (!(m >= 0)) return '';
    if (m < 60) return m < 1 ? '방금' : m + '분 전';
    if (m < 60 * 24) return Math.floor(m / 60) + '시간 전';
    return Math.floor(m / 60 / 24) + '일 전';
  }

  function render(st) {
    if (!st || !st.at || document.getElementById('update-badge')) return;
    var right = pos.indexOf('l') < 0, bottom = pos.indexOf('t') < 0;
    var side = {}; side[right ? 'right' : 'left'] = '6px'; side[bottom ? 'bottom' : 'top'] = '6px';

    var pill = css(el('button', '업데이트 ' + short(st.at)), Object.assign({
      position: 'fixed', zIndex: '2147483000', margin: '0', padding: '3px 8px',
      font: '600 11px/1.4 system-ui, "Malgun Gothic", sans-serif', letterSpacing: '0',
      color: '#fff', background: 'rgba(20,24,34,.62)', border: '1px solid rgba(255,255,255,.25)',
      borderRadius: '10px', cursor: 'pointer', opacity: '.8', boxShadow: 'none', textShadow: 'none',
      width: 'auto', height: 'auto', minWidth: '0', minHeight: '0', transform: 'none'
    }, side));
    pill.id = 'update-badge';
    pill.type = 'button';
    pill.title = '마지막 업데이트 ' + long(st.at) + ' (' + ago(st.at) + ') · 눌러서 기록 보기';

    var box = null;
    function close() { if (box) { box.remove(); box = null; } }

    // 게임 단추를 가리면 비어 있는 다른 모서리로 옮긴다(단추 2점, 캔버스 1점, 빈 곳 0점)
    function place(c) {
      right = c.indexOf('l') < 0; bottom = c.indexOf('t') < 0;
      pill.style.left = pill.style.right = pill.style.top = pill.style.bottom = '';
      pill.style[right ? 'right' : 'left'] = '6px'; pill.style[bottom ? 'bottom' : 'top'] = '6px';
    }
    function score(c) {
      var w = pill.offsetWidth, h = pill.offsetHeight, W = innerWidth, H = innerHeight;
      var x0 = c.indexOf('l') < 0 ? W - 6 - w : 6, y0 = c.indexOf('t') < 0 ? H - 6 - h : 6, worst = 0;
      [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]].forEach(function (p) {
        var x = Math.min(W - 1, Math.max(0, x0 + p[0])), y = Math.min(H - 1, Math.max(0, y0 + p[1]));
        var hit = document.elementsFromPoint(x, y);
        for (var i = 0; i < hit.length; i++) {
          var e = hit[i];
          if (e === pill || (box && box.contains(e))) continue;
          if (e.closest('button,a[href],input,select,textarea,label,summary,[onclick],[role=button]')) { worst = 2; break; }
          if (e.tagName === 'CANVAS' && worst < 1) worst = 1;
          break;   // 맨 위에 보이는 것 하나만 본다
        }
      });
      return worst;
    }
    function dodge() {
      if (box || document.hidden) return;
      var cur = (bottom ? 'b' : 't') + (right ? 'r' : 'l');
      var now = score(cur);
      if (cur !== pos && score(pos) <= now) return place(pos);   // 원래 자리가 비면 돌아간다
      if (now === 0) return;
      var order = [pos, 'br', 'bl', 'tr', 'tl'], best = cur, bs = now;
      for (var i = 0; i < order.length; i++) { var s = score(order[i]); if (s < bs) { bs = s; best = order[i]; } }
      if (best !== cur) place(best);
    }
    setInterval(dodge, 1500);
    setTimeout(dodge, 300);

    pill.addEventListener('click', function (e) {
      e.stopPropagation();
      if (box) return close();
      var bs = {}; bs[right ? 'right' : 'left'] = '6px'; bs[bottom ? 'bottom' : 'top'] = '30px';
      box = css(el('div'), Object.assign({
        position: 'fixed', zIndex: '2147483001', width: '270px', maxWidth: 'calc(100vw - 12px)',
        maxHeight: '60vh', overflowY: 'auto', padding: '10px 12px', boxSizing: 'border-box',
        font: '13px/1.5 system-ui, "Malgun Gothic", sans-serif', color: '#1d2330', textAlign: 'left',
        background: '#fff', border: '1px solid #c9cfdb', borderRadius: '10px', boxShadow: '0 6px 24px rgba(0,0,0,.25)'
      }, bs));
      box.addEventListener('click', function (ev) { ev.stopPropagation(); });
      box.appendChild(el('div', (st.site ? st.site + ' · ' : '') + '업데이트 기록', { fontWeight: '700', marginBottom: '4px' }));
      box.appendChild(el('div', '지금 화면: ' + long(st.at) + ' (' + ago(st.at) + ')', { fontSize: '12px', color: '#3b4558', marginBottom: '6px' }));
      var list = (st.history || []).slice(0, 8);
      list.forEach(function (h, i) {
        var row = el('div', null, { display: 'flex', gap: '8px', padding: '3px 0', borderTop: '1px solid #eef0f4', fontSize: '12px' });
        row.appendChild(el('span', short(h.at), { flex: '0 0 auto', color: '#5a6478', fontVariantNumeric: 'tabular-nums', fontWeight: i ? '400' : '700' }));
        row.appendChild(el('span', h.note || '업데이트', { flex: '1 1 auto', color: '#1d2330' }));
        box.appendChild(row);
      });
      box.appendChild(el('div', '고쳤다고 했는데 시각이 그대로면 Ctrl+F5(새로고침)를 눌러 보세요.', { fontSize: '11px', color: '#6b7588', marginTop: '6px' }));
      document.body.appendChild(box);
    });
    document.addEventListener('click', close);
    document.body.appendChild(pill);
  }

  // 페이지가 캐시에 남아 있어도 시각은 늘 새로 받아 온다
  var s = document.createElement('script');
  s.src = base + 'update-stamp.js?t=' + Date.now();
  s.onload = function () {
    var go = function () { render(window.UPDATE_STAMP); };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  };
  (document.head || document.documentElement).appendChild(s);
})();
