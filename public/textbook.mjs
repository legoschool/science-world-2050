// 교과서 펼쳐 보기: 의뢰와 연결된 교과서(과학, 실험관찰) 쪽을 책장 넘기듯 본다.
// 그림은 로그인한 학급 학생과 선생님에게만 /api/textbook-page 로 온다(둘러보기 계정은 볼 수 없다). 열어 본 것을 학습 달성으로 세지 않는다.
// 출판사 저작물이라 학생 기기에 남기지 않는다: 서버가 no-store로 보내고, 여기서도 no-store로 받아 화면에 띄운 뒤 쪽을 넘기거나 닫으면 그림 주소를 바로 지운다.
const SOURCE = '천재교과서(정용재)';
let openNow = null;
const lastSeen = {}; // 의뢰마다 마지막으로 본 쪽과 보기 방식. 닫고 문제를 푼 뒤 다시 열면 보던 쪽부터 이어 본다(새로 고침하면 처음부터)

// start: {kind: '과학'|'실험관찰', page: 68} 처럼 처음 펼칠 쪽(없으면 첫 묶음 첫 쪽)
export function openTextbook({el, button, api, mission, start = null, onClose = () => {}}) {
  if (openNow?.isConnected && openNow.open) { openNow.focus(); return; }
  const opener = document.activeElement;
  const dialog = el('dialog', {class: 'textbook-dialog', 'aria-label': '교과서 펼쳐 보기'});
  const title = el('h2', {}, '교과서 펼쳐 보기');
  const tabs = el('div', {class: 'textbook-tabs', role: 'group', 'aria-label': '이 의뢰와 이어진 교과서 쪽'});
  const pick = el('select', {class: 'textbook-mission', 'aria-label': '다른 의뢰의 교과서 쪽 보기'});
  const stage = el('div', {class: 'textbook-stage', tabindex: '0'});
  const where = el('p', {class: 'textbook-where', role: 'status'});
  const source = el('p', {class: 'textbook-source', 'data-no-gloss': ''});
  const prev = button('앞쪽', () => go(at - 1), 'secondary');
  const next = button('뒤쪽', () => go(at + 1), 'secondary');
  const zoom = button('쪽 전체 보기', () => { big = !big; paint(); }, 'secondary');
  const close = button('닫기', () => finish(), 'secondary');
  dialog.append(el('div', {class: 'textbook-head'}, title, pick, close), tabs, stage, el('div', {class: 'textbook-foot'}, prev, where, next, zoom, source));
  document.body.append(dialog);
  openNow = dialog;
  let data = null, flat = [], at = 0, shown = '', ticket = 0, gid = mission, big = start ? true : (lastSeen[mission]?.big ?? true); // 처음에는 글자가 읽히는 너비로 펼친다

  // 닫기 단추와 Esc(close 사건) 어느 쪽으로 닫아도 한 번만 정리한다
  let done = false;
  function finish() { if (done) return; done = true; ticket++; drop(); if (dialog.open) dialog.close(); openNow = null; dialog.remove(); onClose(); if (opener?.isConnected) opener.focus({preventScroll: true}); }
  dialog.addEventListener('close', finish);
  dialog.addEventListener('keydown', (e) => {
    if (e.target === pick) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
  });
  pick.addEventListener('change', () => { gid = pick.value; start = null; big = lastSeen[gid]?.big ?? true; load(); });
  dialog.showModal();

  function go(i) { if (!flat.length) return; at = Math.max(0, Math.min(flat.length - 1, i)); paint(); }
  function keep() { const x = flat[at]; if (x) lastSeen[gid] = {book: x.sec.book, page: x.page.id, big}; }
  function drop() { if (shown) URL.revokeObjectURL(shown); shown = ''; }
  function paint() {
    if (!flat.length) return;
    const {sec, page, si} = flat[at];
    tabs.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === si)));
    const img = el('img', {alt: `${sec.title} ${sec.unit} ${page.n}쪽`, width: String(page.w), height: String(page.h), draggable: 'false'});
    img.addEventListener('contextmenu', (e) => e.preventDefault());
    const failed = (say) => { stage.replaceChildren(el('p', {class: 'textbook-msg'}, say || '이 쪽을 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.')); };
    const mine = ++ticket;
    fetch(`/api/textbook-page?book=${encodeURIComponent(sec.book)}&page=${encodeURIComponent(page.id)}`, {cache: 'no-store', credentials: 'same-origin'})
      .then(async (r) => { if (!r.ok) { const say = r.status === 429 ? (await r.json().catch(() => ({}))).error : ''; throw Object.assign(new Error(String(r.status)), {say}); } return r.blob(); })
      .then((blob) => { if (mine !== ticket) return; drop(); shown = URL.createObjectURL(blob); img.src = shown; })
      .catch((e) => { if (mine === ticket) failed(e.say); });
    stage.classList.toggle('big', big);
    stage.replaceChildren(img);
    stage.scrollTop = 0; stage.scrollLeft = 0;
    source.textContent = `출처: ${SOURCE} ${sec.title}${sec.unit ? ', ' + sec.unit : ''}`;
    where.textContent = `${sec.title} ${/^\d/.test(page.n) ? page.n + '쪽' : page.n} (${at + 1}/${flat.length})`;
    prev.disabled = at === 0; next.disabled = at === flat.length - 1;
    zoom.textContent = big ? '쪽 전체 보기' : '크게 보기';
    keep();
  }
  async function load() {
    stage.replaceChildren(el('p', {class: 'textbook-msg'}, '교과서를 펼치고 있어요.'));
    try { data = await api('textbook?mission=' + encodeURIComponent(gid)); }
    catch (e) { stage.replaceChildren(el('p', {class: 'textbook-msg'}, e.status === 403 ? e.message : '교과서를 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.')); tabs.replaceChildren(); where.textContent = ''; prev.disabled = next.disabled = true; return; }
    if (!pick.options.length) pick.replaceChildren(...(data.region || []).map((r) => el('option', {value: r.id}, `${r.title}: ${r.labels.join(', ')}`)));
    pick.value = gid;
    pick.hidden = (data.region || []).length < 2;
    flat = [];
    data.sections.forEach((sec, si) => sec.pages.forEach((page) => flat.push({sec, page, si})));
    tabs.replaceChildren(...data.sections.map((sec, si) => button(sec.label, () => go(flat.findIndex((x) => x.si === si)), 'textbook-tab')));
    if (!flat.length) { stage.replaceChildren(el('p', {class: 'textbook-msg'}, '이 의뢰와 이어진 교과서 쪽이 없어요. 위에서 다른 의뢰를 골라 보세요.')); where.textContent = ''; prev.disabled = next.disabled = true; return; }
    at = 0;
    const seen = !start && lastSeen[gid];
    if (seen) { const k = flat.findIndex(({sec, page}) => sec.book === seen.book && page.id === seen.page); if (k >= 0) at = k; }
    if (start) {
      const k = flat.findIndex(({sec, page}) => sec.label.includes(start.kind) && (!start.page || String(page.n).split('~').some((n) => Number(n) === Number(start.page))));
      const s = k >= 0 ? k : flat.findIndex(({sec}) => sec.label.includes(start.kind));
      if (s >= 0) at = s;
    }
    paint();
    stage.focus({preventScroll: true});
  }
  load();
  return dialog;
}
