// 자료 책장: 왼쪽은 자료 목록(종류와 제목), 오른쪽은 고른 자료의 내용과 살펴볼 질문.
// 선생님이 올린 자료(/api/resources의 게시된 자료)를 먼저, 기본 자료(resources.json)를 뒤에 둔다.
// 자료를 열거나 원본, 영상을 연 기록은 onRecord로 남긴다(읽기 완료나 영상 완주를 뜻하지 않는다).
let recorder = () => {};
export function setResourceRecorder(fn) { recorder = fn; }
const defaults = await (await fetch('/resources.json')).json();
const node = (tag, text, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; };
const KIND = {reading: '읽기', video: '영상', link: '참고', image: '그림', pdf: 'PDF'};

export async function openResources({gameId, region, resourceIds, onRecord = recorder} = {}) {
  let custom = [];
  try { const response = await fetch('/api/resources'); if (response.ok) custom = (await response.json()).resources; } catch { /* 연결이 없으면 기본 자료만 */ }
  const items = [...custom.filter((r) => r.published).map((r) => ({...r, teacher: true})), ...defaults]
    .filter((r) => (!resourceIds || resourceIds.includes(r.id)) && (!gameId || !r.gameIds.length || r.gameIds.includes(gameId)) && (!region || r.region === 'all' || r.region === region));
  const dialog = node('dialog', '', 'resource-dialog');
  const close = node('button', '탐험으로 돌아가기', 'res-close'); close.type = 'button'; close.onclick = () => dialog.close();
  const head = node('div', '', 'res-head'); head.append(node('h2', '자료 책장'), node('span', items.length ? `${items.length}개` : '', 'res-count'), close);
  const list = node('nav', '', 'res-list'); list.setAttribute('aria-label', '학습 자료');
  const detail = node('article', '', 'res-detail'); detail.setAttribute('aria-live', 'polite');
  const body = node('div', '', 'res-layout'); body.append(list, detail);
  dialog.append(head, body);
  const previous = document.activeElement;
  const buttons = new Map();

  function show(r) {
    for (const [id, b] of buttons) b.setAttribute('aria-current', String(id === r.id));
    const top = node('div', '', 'res-detail-head');
    top.append(node('span', KIND[r.kind] || '자료', 'res-kind ' + r.kind), r.teacher ? node('span', '선생님 자료', 'res-tag') : '');
    detail.replaceChildren(top, node('h3', r.title));
    if (r.source) detail.append(node('p', '출처: ' + r.source, 'res-source'));
    if (r.kind === 'reading') { const text = node('div', '', 'res-body'); for (const t of r.body) text.append(node('p', t)); detail.append(text); }
    else if (['image', 'pdf'].includes(r.kind) && /^\/api\/files\/[a-f0-9]{32}$/.test(r.url)) {
      if (r.kind === 'image') { const img = node('img'); img.src = r.url; img.alt = r.title; img.className = 'resource-image'; detail.append(img); }
      else { const frame = node('iframe'); frame.src = r.url; frame.title = r.title; frame.className = 'resource-pdf'; detail.append(frame); }
      const link = node('a', '파일 원본 열기', 'res-open'); link.href = r.url; link.target = '_blank'; link.rel = 'noopener'; link.onclick = () => onRecord('external_opened', r.id); detail.append(link);
    } else {
      let u; try { u = new URL(r.url); } catch { return; }
      if (u.protocol !== 'https:') return;
      const link = node('a', r.kind === 'video' ? '영상 원본 열기' : '참고자료 원본 열기', 'res-open'); link.href = u.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.onclick = () => onRecord('external_opened', r.id);
      detail.append(link);
      if (r.kind === 'video' && r.youtubeId && /^[a-zA-Z0-9_-]{11}$/.test(r.youtubeId)) {
        const play = node('button', '여기서 영상 보기'); play.type = 'button';
        play.onclick = () => { const frame = node('iframe'); frame.src = 'https://www.youtube-nocookie.com/embed/' + r.youtubeId; frame.title = r.title; frame.allow = 'fullscreen'; frame.referrerPolicy = 'strict-origin-when-cross-origin'; detail.append(frame); play.remove(); onRecord('video_requested', r.id); };
        detail.append(play);
      }
    }
    if (r.question) { const q = node('div', '', 'res-question'); q.append(node('h4', '살펴볼 질문'), node('p', r.question)); detail.append(q); }
    onRecord('opened', r.id);
  }

  let group = null;
  for (const r of items) {
    const g = r.teacher ? '선생님 자료' : '기본 자료';
    if (g !== group && custom.some((x) => x.published) && defaults.length) { list.append(node('h3', g, 'res-group')); group = g; }
    const b = node('button', '', 'res-item'); b.type = 'button';
    b.setAttribute('aria-label', r.title + (r.teacher ? ' (선생님 자료)' : ''));
    const kind = node('span', KIND[r.kind] || '자료', 'res-kind ' + r.kind); kind.setAttribute('aria-hidden', 'true');
    b.append(kind, node('span', r.title, 'res-title'));
    b.onclick = () => show(r);
    buttons.set(r.id, b); list.append(b);
  }
  if (items.length) show(items[0]);
  else detail.append(node('p', '노트에 적은 질문을 가지고 주변 장소를 더 살펴봐요.'));
  dialog.addEventListener('close', () => { dialog.remove(); previous?.focus(); }, {once: true});
  document.body.append(dialog);
  dialog.showModal();
  close.focus();
  return () => dialog.close();
}
