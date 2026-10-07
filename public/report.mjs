// 제보 창: 학생이 화면에서 본 오류, 불편, 바라는 점을 적어 보낸다.
// 지금 있는 장소와 의뢰, 과제, 화면 크기는 자동으로 함께 보낸다. 선생님은 관리 화면의 「제보」 탭에서 본다.
export const REPORT_KINDS = [['error', '오류', '안 되거나 이상하게 움직여요'], ['hard', '불편', '어렵거나 헷갈려요'], ['idea', '아이디어', '이랬으면 좋겠어요'], ['other', '기타', '그 밖의 이야기']];

// 지금 화면에서 위치 정보를 모은다(서버가 받는 이름만, 글자 수 제한 안에서)
export function reportContext(extra = {}) {
  const cut = (v, n = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  const mission = document.querySelector('.mission');
  const ctx = {
    view: cut(extra.view || (mission ? 'mission' : document.querySelector('.atlas') ? 'map' : document.body.classList.contains('login-view') ? 'login' : 'other'), 40),
    map: cut(extra.map, 60),
    place: cut(document.querySelector('.rpg-location')?.textContent || document.querySelector('.mission-intro h1, .mission-top h1, .mission-top h2')?.textContent || document.querySelector('main h1')?.textContent),
    title: cut(document.querySelector('.mission-main h2, .mission-main h3, .mission-finish h1')?.textContent),
    gameId: cut(mission?.dataset.game, 20),
    taskId: cut(mission?.dataset.task, 20),
    screen: `${innerWidth}x${innerHeight}`,
    sync: cut(document.querySelector('#sync')?.textContent, 40),
    agent: cut(navigator.userAgent, 200),
    url: cut(location.pathname, 60),
  };
  if (ctx.title && ctx.title === ctx.place) delete ctx.title;
  for (const k of Object.keys(ctx)) if (!ctx[k]) delete ctx[k];
  return ctx;
}

export function openReport({el, button, api, toast, extra}) {
  const ctx = reportContext(extra);
  const where = [ctx.place, ctx.title].filter(Boolean).join(', ') || '지금 화면';
  let kind = 'error';
  const kinds = el('div', {class: 'report-kinds', role: 'radiogroup', 'aria-label': '제보 종류'});
  const paint = () => kinds.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.kind === kind)));
  for (const [id, label, sub] of REPORT_KINDS) {
    const b = button('', () => { kind = id; paint(); }, 'report-kind');
    b.dataset.kind = id; b.setAttribute('role', 'radio');
    b.append(el('strong', {}, label), el('small', {}, sub));
    kinds.append(b);
  }
  const text = el('textarea', {id: 'report-text', maxlength: '600', rows: '5', placeholder: '어디에서 무엇을 했더니 어떻게 되었는지 적어 주세요. 예: 크레인 실험대에서 스위치를 눌렀는데 아무 일도 없었어요.'});
  const count = el('small', {class: 'report-count'}, '0 / 600');
  text.addEventListener('input', () => { count.textContent = `${text.value.length} / 600`; });
  const status = el('p', {class: 'report-status', role: 'status'});
  const d = el('dialog', {class: 'report-dialog'});
  const send = button('보내기', async () => {
    const body = text.value.trim();
    if (body.length < 2) { status.textContent = '내용을 두 글자 이상 적어 주세요.'; text.focus(); return; }
    send.disabled = true; status.textContent = '보내는 중이에요.';
    try { await api('report', {kind, body, context: ctx}); d.close(); d.remove(); toast('제보를 보냈어요. 선생님이 확인할게요.'); }
    catch (e) { status.textContent = e.message || '보내지 못했어요. 연결을 확인하고 다시 눌러 주세요.'; send.disabled = false; }
  });
  d.append(
    el('h2', {}, '제보하기'),
    el('p', {}, '고장 난 곳이나 불편한 점, 바라는 점을 적어 주세요. 이름 대신 내 닉네임으로 선생님께 전해져요.'),
    el('p', {class: 'report-where'}, el('small', {}, '함께 보내는 위치'), el('span', {}, where)),
    kinds, el('label', {for: 'report-text'}, '내용'), text, count, status,
    el('div', {class: 'actions'}, button('취소', () => d.close(), 'secondary'), send),
  );
  paint();
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal(); text.focus();
}
