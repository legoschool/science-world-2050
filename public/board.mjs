// 반 친구 게시판: 같은 반 친구와 선생님만 보는 질문과 답, 의뢰 결과 나누기.
// 질문을 쓰는 동안 자주 묻는 질문과, 이미 답이 달린 반 친구 질문 가운데 비슷한 것을 먼저 보여 준다.
// 새 글과 내 글에 달린 새 답은 마지막으로 게시판을 열었을 때와 비교해 위쪽 단추에 숫자로 보인다(그 기기에만 저장).
import {getPortrait, cleanAvatar, preloadLook} from './sprites.mjs';

const KIND = {question: '질문', share: '결과 나누기'};
const REGION = {R1: '햇살 농장 지구', R2: '불꽃 에너지 지구', R3: '전력망 지구', R4: '미래 연구 본부', R5: '푸른 생활 지구'};

// 게임 사용법에 관한 자주 묻는 질문. 단추 이름은 화면에 보이는 그대로 적는다.
export const FAQ = [
  {q: '다음에 어디로 가야 하나요?', k: '어디로 가요 길 목적지 다음 장소 의뢰 찾기 모르겠 위치', a: '위쪽의 「목적지 안내」를 누르면 지금 추적 중인 의뢰 장소까지 가는 길이 보여요. 다른 의뢰를 하고 싶으면 「퀘스트 수첩」에서 「이 의뢰 추적」을 눌러요.'},
  {q: '문제가 어려워요. 도움은 어디서 받나요?', k: '힌트 도움 어려워 모르겠 막혔 틀렸 정답 답이 뭐', a: '의뢰 화면의 「도움 받기」를 누르면 도우미가 세 단계로 도와줘요. 틀려도 괜찮아요. 무엇을 바꿨는지 다시 살펴보고 고쳐 보세요.'},
  {q: '탐험은 저장되나요?', k: '저장 날아 사라 기록 전달 대기 충돌 새로고침 끊겼', a: '탐험은 저절로 저장돼요. 위쪽에 「선생님께 전달됨」이 보이면 서버까지 저장된 거예요. 「기기에 저장됨(전달 대기)」이면 인터넷이 다시 연결될 때 보내져요. 「저장 충돌(새로고침 필요)」이 보이면 새로고침해 주세요.'},
  {q: '내 캐릭터 모습을 바꾸고 싶어요.', k: '캐릭터 모습 바꾸기 옷 머리 얼굴 꾸미기 아바타', a: '중앙 광장의 탐구대 본부에 가거나, 지도 위의 「가방」에서 「내 모습 바꾸기」를 눌러요.'},
  {q: '모자나 동료는 어떻게 얻나요?', k: '소품 모자 동료 펫 등 착용 입기 얻기 잠김', a: '의뢰를 해결할수록 소품이 열려요. 「인벤토리」의 「소품」 칸에서 열린 소품을 골라 착용해요.'},
  {q: '중앙 광장으로 돌아가려면 어떻게 하나요?', k: '광장 돌아가기 처음 시작 집 귀환', a: '위쪽의 「시작 광장으로」를 누르면 중앙 광장으로 돌아가요. 지도 가장자리의 길 안내를 따라 걸어가도 돼요.'},
  {q: '자료나 영상은 어디서 보나요?', k: '자료 영상 책장 도서관 읽기 링크 선생님 자료', a: '중앙 광장의 문제 발견 도서관에서 책장을 열어 보세요. 지도 위의 「가방」에서 「이 지역 자료」를 눌러도 돼요.'},
  {q: '소리를 끄거나 켜고 싶어요.', k: '소리 음악 배경음 효과음 시끄러 안 들려', a: '위쪽의 「소리」에서 배경음과 효과음을 따로 켜고 끌 수 있어요. 처음에는 배경음이 꺼져 있어요.'},
  {q: '화면이 작아요. 크게 볼 수 있나요?', k: '전체 화면 크게 작아 화면', a: '위쪽의 「전체 화면」을 눌러요. Esc를 누르면 원래대로 돌아와요. 아이폰에서는 이 단추가 보이지 않아요.'},
  {q: '게임이 이상하게 움직여요.', k: '오류 고장 버그 이상 안 눌려 멈췄 안 돼', a: '맨 위의 「제보하기」를 눌러 어디에서 무엇을 했는지 적어 보내 주세요. 선생님이 확인해요.'},
  {q: '레벨은 어떻게 올라가나요?', k: '레벨 경험치 징표 올리기 등급', a: '의뢰의 단계를 끝내고 의뢰를 해결하고 징표를 모으면 경험치가 쌓여 레벨이 올라가요.'},
  {q: '대화 단추가 바로 안 눌려요.', k: '대화 대사 단추 안 눌려 다음 기다려 막대', a: '대사를 읽을 시간을 주려고 잠깐 기다려요. 단추 아래 막대가 다 차면 누를 수 있어요.'},
  {q: '이미 끝낸 의뢰를 다시 해 볼 수 있나요?', k: '다시 하기 복습 끝낸 의뢰 다시 들어가기', a: '해결한 의뢰 장소에 가서 말을 걸면 「다시 들어가기」로 단계를 다시 살펴볼 수 있어요.'},
  {q: '관찰한 것을 어디에 적어 두나요?', k: '관찰 노트 메모 적기 기록', a: '장소를 조사할 때 「관찰 남기기」로 노트에 적고, 「가방」의 「관찰 노트」에서 다시 볼 수 있어요.'},
  {q: '모든 의뢰를 끝내면 어떻게 되나요?', k: '엔딩 마지막 끝 모든 의뢰 52', a: '네 지구 의뢰 52개를 모두 해결하면 엔딩이 열려요. 그다음에는 「퀘스트 수첩」의 「엔딩 다시 보기」로 다시 볼 수 있어요.'},
];

// 비슷한 글 찾기: 낱말마다 두 글자씩 끊어 겹치는 조각을 센다. 흔한 말끝 조각은 뺀다.
const STOP = new Set(['어요', '해요', '나요', '세요', '까요', '에요', '이에', '있어', '없어', '는데', '은데', '아요', '했어', '데요', '니다', '습니', '합니', '하면', '되나', '할까', '는지', '은지', '가요', '돼요', '되요', '이요', '어떻', '떻게', '하나', '나요', '거예', '예요', '해서', '어서']);
function grams(text) {
  const out = new Set();
  for (const w of String(text).toLowerCase().replace(/[^가-힣a-z0-9]+/g, ' ').split(' ')) for (let i = 0; i < w.length - 1; i++) { const g = w.slice(i, i + 2); if (!STOP.has(g)) out.add(g); }
  return out;
}
export function similar(query, items, text, limit = 3) {
  const q = grams(query);
  if (q.size < 2) return [];
  return items.map((it) => { const g = grams(text(it)); let n = 0; for (const x of q) if (g.has(x)) n++; return {it, n, s: n / q.size}; })
    .filter((x) => x.n >= 2 && x.s >= 0.2).sort((a, b) => b.s - a.s || b.n - a.n).slice(0, limit).map((x) => x.it);
}

// 게시판 목록은 잠깐 기억해 두고, 지도를 옮길 때마다 서버에 다시 묻지 않는다
let cache = null, cacheAt = 0, draft = null;
export async function loadBoard(api, maxAge = 60000) {
  if (cache && Date.now() - cacheAt < maxAge) return cache;
  cache = await api('board'); cacheAt = Date.now();
  return cache;
}
const seenKey = (uid) => 'science-world:board-seen:' + uid;
function getSeen(uid) { try { return Number(localStorage.getItem(seenKey(uid))) || 0; } catch { return 0; } }
function setSeen(uid, t) { try { localStorage.setItem(seenKey(uid), String(t)); } catch { /* 저장할 수 없으면 새 소식 표시만 남는다 */ } }
const latest = (data) => Math.max(0, ...data.posts.flatMap((p) => [p.created, ...p.replies.map((r) => r.created)]));
function isNew(p, seen) { return (!p.author.mine && p.created > seen) || (p.author.mine && p.replies.some((r) => !r.author.mine && r.created > seen)); }
export function boardNews(data, uid) {
  const seen = getSeen(uid);
  let n = 0;
  for (const p of data.posts) {
    if (!p.author.mine && p.created > seen) n++;
    if (p.author.mine) n += p.replies.filter((r) => !r.author.mine && r.created > seen).length;
  }
  return n;
}

const regions = await (await fetch('/regions.json')).json();
const PLACES = {};
for (const r of Object.values(regions)) for (const z of r.zones) for (const g of z.games) PLACES[g.id] = g.title;

export async function openBoard({el, button, api, uid, quests = () => [], current = () => '', onSeen = () => {}, onClose = () => {}}) {
  const d = el('dialog', {class: 'board-dialog', 'aria-label': '반 친구 게시판'});
  const body = el('div', {class: 'board-body'}), status = el('p', {class: 'board-status', role: 'status'});
  d.append(el('div', {class: 'board-top'}, el('h2', {}, '반 친구 게시판'), button('닫기', () => d.close(), 'secondary')), status, body);
  d.addEventListener('close', () => { d.remove(); onClose(); });
  document.body.append(d); d.showModal();
  let data = null, filter = 'all';
  const seenBefore = getSeen(uid);

  const questName = (id) => { const q = quests().find((x) => x.id === id); return q ? `${q.title} (${q.place})` : PLACES[id] || '의뢰'; };
  const who = (a) => (a.role === 'student' ? a.nickname : a.role === 'teacher' ? '선생님' : a.nickname) + (a.mine ? ' (나)' : '');
  function when(t) {
    const s = Math.max(0, Date.now() / 1000 - t);
    if (s < 60) return '방금';
    if (s < 3600) return `${Math.floor(s / 60)}분 전`;
    if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
    const dt = new Date(t * 1000);
    return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
  }
  function face(a) {
    const box = el('span', {class: 'board-face' + (a.role === 'student' ? '' : ' staff'), 'aria-hidden': 'true'});
    if (a.role !== 'student') { box.textContent = '선'; return box; }
    const av = cleanAvatar(a.avatar || {});
    const paint = () => { try { box.replaceChildren(getPortrait(av, 40)); } catch { /* 그릴 수 없으면 빈 칸 */ } };
    paint();
    if (av.look > 0) preloadLook(av.look).then(paint);
    return box;
  }
  const fill = (node, ...kids) => node.replaceChildren(...kids.filter((k) => k !== null && k !== undefined && k !== ''));
  const say = (text, bad = false) => { status.textContent = text; status.classList.toggle('bad', bad); };
  const failText = (e) => (e && e.status ? e.message : '연결을 확인하고 다시 눌러 주세요.');

  async function reload() {
    try { data = await loadBoard(api, 0); say(''); setSeen(uid, Math.max(seenBefore, latest(data))); onSeen(); }
    catch (e) { say(failText(e), true); }
  }
  // 한 번 더 눌러야 실행하는 단추(지우기, 선생님께 알리기)
  function twoStep(label, sure, fn) {
    let armed = false;
    const b = button(label, async () => {
      if (!armed) { armed = true; b.textContent = sure; b.classList.add('armed'); setTimeout(() => { if (b.isConnected) { armed = false; b.textContent = label; b.classList.remove('armed'); } }, 4000); return; }
      b.disabled = true;
      try { await fn(); } finally { b.disabled = false; }
    }, 'secondary');
    return b;
  }
  async function act(path, payload, done, then) {
    try { await api(path, payload); await reload(); say(done); then(); }
    catch (e) { say(failText(e), true); }
  }
  const tell = (p, r) => twoStep('선생님께 알리기', '한 번 더 누르면 알려요', () => act('report', {kind: 'other', body: `게시판 ${r ? '답' : '글'}을 확인해 주세요. 제목: ${p.title}` + (r ? ` / 답: ${r.body.slice(0, 120)}` : ''), context: {view: 'board', title: p.title}}, '선생님께 알렸어요. 고마워요.', () => showPost(p.id)));

  function showList() {
    const posts = data ? data.posts.filter((p) => filter === 'all' || (filter === 'mine' ? p.author.mine : p.kind === filter)) : [];
    const chips = el('div', {class: 'board-filters', role: 'group', 'aria-label': '글 거르기'});
    for (const [k, label] of [['all', '전체'], ['question', '질문'], ['share', '결과 나누기'], ['mine', '내 글']]) {
      const b = button(label, () => { filter = k; showList(); }, 'board-chip');
      b.setAttribute('aria-pressed', String(filter === k));
      chips.append(b);
    }
    const list = el('div', {class: 'board-list'});
    for (const p of posts) {
      const fresh = isNew(p, seenBefore);
      list.append(el('button', {type: 'button', class: 'board-card' + (fresh ? ' fresh' : ''), onclick: () => showPost(p.id)},
        el('span', {class: 'board-tags'}, el('span', {class: 'board-kind ' + p.kind}, KIND[p.kind]), p.kind === 'question' && p.solved ? el('span', {class: 'board-solved'}, '해결됨') : null, fresh ? el('span', {class: 'board-new'}, '새 소식') : null),
        el('strong', {class: 'board-title'}, p.title),
        el('span', {class: 'board-meta'}, face(p.author), el('span', {}, `${who(p.author)}, ${when(p.created)}` + (p.gameId ? `, ${questName(p.gameId)}` : '')), el('span', {class: 'board-replies-n'}, `답 ${p.replies.length}`))));
    }
    fill(body, 
      el('p', {class: 'board-intro'}, '궁금한 점을 묻고, 의뢰에서 알아낸 결과를 나눠요. 같은 반 친구와 선생님만 볼 수 있어요.'),
      el('div', {class: 'board-actions'}, button('질문하기', () => compose('question')), button('결과 나누기', () => compose('share')), button('새로 불러오기', async () => { await reload(); showList(); }, 'secondary')),
      chips,
      posts.length ? list : el('p', {class: 'board-empty'}, !data ? '' : filter === 'all' ? '아직 올라온 글이 없어요. 첫 질문을 올려 보세요.' : '이 조건에 맞는 글이 없어요.'));
  }

  function showPost(id) {
    const p = data?.posts.find((x) => x.id === id);
    if (!p) { say('찾는 글이 없어요. 지워졌을 수 있어요.', true); showList(); return; }
    const mineQ = p.kind === 'question' && p.author.mine;
    const replies = el('ol', {class: 'board-replies'});
    for (const r of p.replies) {
      const acts = [];
      if (mineQ && !r.author.mine) acts.push(p.solved === r.id ? button('고른 답 풀기', () => act('board/solve', {postId: p.id, replyId: null}, '고른 답을 풀었어요.', () => showPost(p.id)), 'secondary') : button('도움이 된 답으로 고르기', () => act('board/solve', {postId: p.id, replyId: r.id}, '도움이 된 답으로 골랐어요.', () => showPost(p.id))));
      acts.push(r.author.mine ? twoStep('지우기', '한 번 더 누르면 지워요', () => act('board/remove', {replyId: r.id}, '답을 지웠어요.', () => showPost(p.id))) : tell(p, r));
      replies.append(el('li', {class: 'board-reply' + (p.solved === r.id ? ' chosen' : '') + (r.author.role !== 'student' ? ' staff' : '')},
        el('div', {class: 'board-byline'}, face(r.author), el('strong', {}, who(r.author)), el('small', {}, when(r.created)), p.solved === r.id ? el('span', {class: 'board-solved'}, '도움이 된 답') : null),
        el('p', {class: 'board-text'}, r.body),
        el('div', {class: 'board-row-actions'}, ...acts)));
    }
    const text = el('textarea', {id: 'board-reply', maxlength: '300', rows: '3', placeholder: p.kind === 'question' ? '정답을 그대로 알려 주기보다 어디를 다시 살펴보면 좋을지 알려 주세요.' : '친구 결과를 보고 궁금한 점이나 좋은 점을 적어 주세요.'});
    const count = el('small', {class: 'board-count'}, '0 / 300');
    text.addEventListener('input', () => { count.textContent = `${text.value.length} / 300`; });
    const send = button('답 올리기', async () => {
      const v = text.value.trim();
      if (v.length < 2) { say('답을 두 글자 이상 적어 주세요.', true); text.focus(); return; }
      send.disabled = true;
      try { await api('board/reply', {postId: p.id, body: v}); await reload(); say('답을 올렸어요.'); showPost(p.id); }
      catch (e) { say(failText(e), true); send.disabled = false; }
    });
    fill(body, 
      button('목록으로', showList, 'secondary board-back'),
      el('article', {class: 'board-post'},
        el('div', {class: 'board-byline'}, el('span', {class: 'board-kind ' + p.kind}, KIND[p.kind]), face(p.author), el('strong', {}, who(p.author)), el('small', {}, when(p.created)), p.kind === 'question' && p.solved ? el('span', {class: 'board-solved'}, '해결됨') : null),
        el('h3', {}, p.title),
        p.gameId ? el('p', {class: 'board-quest'}, '의뢰: ' + questName(p.gameId) + (p.done ? ' (해결한 의뢰)' : '')) : null,
        el('p', {class: 'board-text'}, p.body),
        el('div', {class: 'board-row-actions'},
          p.author.mine ? twoStep('이 글 지우기', '한 번 더 누르면 지워요', () => act('board/remove', {postId: p.id}, '글을 지웠어요.', showList)) : tell(p))),
      el('h4', {}, p.replies.length ? `답 ${p.replies.length}개` : '아직 답이 없어요. 먼저 답해 보세요.'),
      p.replies.length ? replies : null,
      el('label', {for: 'board-reply'}, '내 답'), text, count,
      el('div', {class: 'board-actions'}, send));
  }

  function compose(kind) {
    if (!draft) draft = {kind, title: '', body: '', gameId: current() || ''};
    if (kind) draft.kind = kind;
    const share = draft.kind === 'share';
    const kinds = el('div', {class: 'board-kinds', role: 'radiogroup', 'aria-label': '글 종류'});
    for (const [id, label, sub] of [['question', '질문하기', '궁금한 점을 물어요'], ['share', '결과 나누기', '의뢰에서 알아낸 것을 나눠요']]) {
      const b = button('', () => { keep(); compose(id); }, 'board-kind-pick');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(draft.kind === id));
      b.append(el('strong', {}, label), el('small', {}, sub));
      kinds.append(b);
    }
    const game = el('select', {id: 'board-game'});
    game.append(el('option', {value: ''}, share ? '의뢰를 골라 주세요' : '고르지 않아요'));
    const list = quests().length ? quests() : Object.keys(PLACES).map((id) => ({id, title: PLACES[id], place: PLACES[id], status: ''}));
    const solved = list.filter((q) => q.status === 'completed');
    const group = (label, items) => { if (!items.length) return; const g = el('optgroup', {label}); for (const q of items) g.append(el('option', {value: q.id}, q.title === q.place ? q.title : `${q.title} (${q.place})`)); game.append(g); };
    group('해결한 의뢰', solved);
    for (const [key, name] of Object.entries(REGION)) group(name, list.filter((q) => q.id.startsWith(key + '-') && q.status !== 'completed'));
    game.value = draft.gameId;
    if (game.value !== draft.gameId) game.value = '';
    const title = el('input', {id: 'board-title', maxlength: '40', autocomplete: 'off', placeholder: share ? '예: 크레인 실험에서 알아낸 것' : '예: 전지를 두 개 이으면 왜 더 밝아요?'});
    const text = el('textarea', {id: 'board-text', maxlength: '500', rows: '6', placeholder: share ? '무엇을 바꿔 보았고 어떤 결과가 나왔는지 적어 주세요. 정답을 그대로 적기보다 내가 관찰한 것을 나눠요.' : '무엇이 궁금한지, 어디까지 해 봤는지 적어 주세요.'});
    title.value = draft.title; text.value = draft.body;
    const count = el('small', {class: 'board-count'});
    const suggest = el('section', {class: 'board-suggest', 'aria-live': 'polite'});
    function keep() { if (draft) { draft.title = title.value; draft.body = text.value; draft.gameId = game.value; } }
    function paintSuggest() {
      count.textContent = `${text.value.length} / 500`;
      if (share) { suggest.replaceChildren(); return; }
      const query = title.value + ' ' + text.value;
      const faq = similar(query, FAQ, (f) => f.q + ' ' + f.k);
      const friends = similar(query, (data?.posts || []).filter((p) => p.kind === 'question' && p.replies.length), (p) => p.title + ' ' + p.body);
      if (!faq.length && !friends.length) { suggest.replaceChildren(); return; }
      suggest.replaceChildren(el('h4', {}, '먼저 살펴보세요. 비슷한 질문에 이미 답이 있어요.'),
        ...faq.map((f) => el('details', {class: 'board-faq'}, el('summary', {}, f.q), el('p', {}, f.a))),
        ...friends.map((p) => button(`친구 질문: ${p.title} (답 ${p.replies.length}개${p.solved ? ', 해결됨' : ''})`, () => { keep(); showPost(p.id); }, 'board-friend')));
    }
    let timer = 0;
    const typed = () => { keep(); clearTimeout(timer); timer = setTimeout(paintSuggest, 250); };
    title.addEventListener('input', typed); text.addEventListener('input', typed); game.addEventListener('change', keep);
    const send = button('올리기', async () => {
      keep();
      const t = title.value.trim(), b = text.value.trim();
      if (t.length < 2) { say('제목을 두 글자 이상 적어 주세요.', true); title.focus(); return; }
      if (b.length < 2) { say('내용을 두 글자 이상 적어 주세요.', true); text.focus(); return; }
      if (share && !game.value) { say('어느 의뢰에서 얻은 결과인지 골라 주세요.', true); game.focus(); return; }
      send.disabled = true;
      try {
        const res = await api('board/post', {kind: draft.kind, title: t, body: b, gameId: game.value});
        draft = null; await reload();
        say('게시판에 올렸어요.'); showPost(res.id);
      } catch (e) { say(failText(e), true); send.disabled = false; }
    });
    fill(body, 
      button('목록으로', () => { keep(); showList(); }, 'secondary board-back'),
      el('h3', {}, '새 글 쓰기'), kinds,
      el('label', {for: 'board-game'}, share ? '어느 의뢰의 결과인가요?' : '어느 의뢰에서 궁금했나요? (고르지 않아도 돼요)'), game,
      el('label', {for: 'board-title'}, '제목'), title,
      el('label', {for: 'board-text'}, '내용'), text, count,
      el('p', {class: 'board-rule'}, '친구 이름이나 연락처, 사는 곳은 적지 않아요. 고운 말로 써 주세요.'),
      suggest,
      el('div', {class: 'board-actions'}, button('쓰기 그만두기', () => { draft = null; say(''); showList(); }, 'secondary'), send));
    paintSuggest();
    title.focus();
  }

  say('게시판을 불러오고 있어요.');
  await reload();
  if (data) { setSeen(uid, Math.max(seenBefore, latest(data))); onSeen(); }
  showList();
  return d;
}
