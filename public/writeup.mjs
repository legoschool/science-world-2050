// 자기 말로 설명하기. 탐구에서 내가 본 관찰을 근거로 고르고, 주민에게 설명하는 글을 써서 보낸다.
// 서버는 꼭 넣을 말이 글에 들어 있는지만 알려 주고, 설명이 맞는지는 선생님이 읽고 피드백한다.
// 처음 설명과 고쳐 쓴 설명은 모두 따로 기록하고(writeup.submitted), 쓰던 글은 의뢰 기록(ms.writeup.draft)에 두어 다른 기기에서도 이어 쓴다.
import {drawScene} from './discovery.mjs';

const PORTRAIT = {'신항이': 'dodam', '엘엠': 'elm', '컴지': 'comji', '달새': 'dalsae'};
const STATUS = {pending: '선생님이 아직 읽는 중이에요.', revise: '선생님이 고쳐 쓰기를 부탁했어요.', confirmed: '선생님이 읽고 확인했어요.', insufficient: '선생님이 설명을 더 듣고 싶어 해요.'};
const keyOf = (roles) => JSON.stringify(Object.keys(roles || {}).sort().map((k) => [k, roles[k]]));
const short = (s) => s.replace(/\s/g, '').length;
// 받침이 있으면 앞 조사(을, 은), 없으면 뒤 조사(를, 는)
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? a : b; };

export function writeupView(host, {el, button, api, record, save, ms, wu, trials = [], uid, runId, gameId, preview = false, nextLabel = '다음으로', onNext, onObserve, onClose, closeLabel = '지금은 그만 쓰기'}) {
  const item = wu.item, w = ms.writeup ??= {versions: [], draft: '', picks: [], change: '', help: []};
  w.versions ??= []; w.picks ??= []; w.help ??= [];
  let alive = true, busy = false, reviews = null, saveSoon = 0;
  let view = w.versions.length && !w.editing ? 'sent' : 'edit';
  const status = el('p', {class: 'writeup-status', role: 'status'});
  const say = (s) => { status.textContent = s; };
  const keep = () => { clearTimeout(saveSoon); saveSoon = setTimeout(() => { if (alive) save(); }, 600); };
  // 같은 조건을 여러 번 관찰했으면 마지막 관찰 하나만 카드로 둔다
  const cards = [];
  for (const t of trials) { const key = keyOf(t.roles); const at = cards.findIndex((c) => c.key === key); if (at >= 0) cards.splice(at, 1); cards.push({...t, key}); }
  w.picks = w.picks.filter((k) => cards.some((c) => c.key === k));
  const last = () => w.versions.at(-1);
  const nextNo = () => (last()?.n || 0) + 1;

  function talk() {
    const key = PORTRAIT[item.who];
    return el('div', {class: 'writeup-talk'}, key ? el('img', {src: `/assets/portraits/${key}.png`, alt: ''}) : '', el('div', {}, el('strong', {}, item.who || ''), el('p', {}, item.say || '')));
  }
  function loadReviews() {
    if (preview || !w.versions.some((v) => v.id) || reviews) return;
    reviews = {};
    api('teaching?gameId=' + encodeURIComponent(gameId) + '&runId=' + encodeURIComponent(runId)).then((d) => {
      for (const e of d.events || []) if (e.kind === 'writeup.submitted' && e.teacherReview) reviews[e.id] = e.teacherReview;
      if (alive) paint();
    }).catch(() => {});
  }
  // 가장 최근에 선생님이 남긴 확인(마지막 설명이 아직 안 읽혔으면 앞 설명의 확인을 보여 준다)
  function feedbackBox() {
    const hit = [...w.versions].reverse().find((v) => v.id && reviews?.[v.id]);
    if (!hit) return el('div', {class: 'writeup-feedback'}, el('strong', {}, '선생님 피드백'), el('p', {}, reviews ? '아직 도착한 피드백이 없어요. 선생님이 읽으면 여기에 나와요.' : '피드백을 불러오는 중이에요.'));
    const r = reviews[hit.id];
    return el('div', {class: 'writeup-feedback ' + (r.status || '')}, el('strong', {}, `선생님 피드백 (${hit.n}번째로 보낸 설명)`), el('p', {}, STATUS[r.status] || ''), r.feedback ? el('p', {class: 'writeup-feedback-text'}, r.feedback) : '');
  }
  function evidenceSection() {
    const box = el('section', {class: 'writeup-evidence', 'aria-labelledby': 'wu-ev'}, el('h4', {id: 'wu-ev'}, '근거로 쓸 내 관찰'));
    if (!cards.length) {
      if (onObserve) box.append(el('p', {}, '아직 남긴 관찰이 없어요. 현장에서 관찰하고 오면 관찰 카드를 근거로 고를 수 있어요.'), button('현장으로 가서 관찰하기', () => { save(); onObserve(); }));
      else box.append(el('p', {}, '이 의뢰에서 남긴 관찰 카드가 없어요. 의뢰에서 본 것을 떠올려 글에 함께 써 주세요.'));
      return box;
    }
    box.append(el('p', {}, item.evidenceAsk || '설명의 근거로 쓸 내 관찰을 골라 주세요.'));
    const list = el('div', {class: 'writeup-cards', role: 'group', 'aria-label': '근거로 쓸 내 관찰'});
    cards.forEach((c, i) => {
      const on = w.picks.includes(c.key);
      const b = button('', () => {
        w.picks = on ? w.picks.filter((k) => k !== c.key) : [...w.picks, c.key]; keep(); paint();
        host.querySelector(`[data-card="${i}"]`)?.focus();
      }, 'writeup-card');
      b.dataset.card = String(i);
      b.setAttribute('aria-pressed', String(on));
      b.append(drawScene(el, wu.kind, c.view, c.observation), el('span', {class: 'writeup-card-text'}, el('b', {}, `관찰 ${i + 1}`), el('span', {}, c.conditionText), el('span', {}, c.observation)));
      list.append(b);
    });
    box.append(list);
    if (onObserve) box.append(button('현장으로 돌아가 더 관찰하기', () => { save(); onObserve(); }, 'writeup-quiet'));
    return box;
  }
  function editView() {
    const prev = last();
    const ta = el('textarea', {maxlength: '1200', rows: '7', 'aria-labelledby': 'wu-mine'});
    if (!w.draft && w.editing && prev?.mode === 'written') w.draft = prev.answer;
    ta.value = w.draft || '';
    ta.oninput = () => { w.draft = ta.value; keep(); };
    const change = el('input', {type: 'text', maxlength: '300', 'aria-labelledby': 'wu-change'});
    change.value = w.change || '';
    change.oninput = () => { w.change = change.value; keep(); };
    const concept = el('div', {class: 'writeup-concept', hidden: ''}, el('strong', {}, '같이 정리한 내용'), el('p', {}, wu.concept || ''));
    if (w.help.includes('concept') && w.showConcept) concept.hidden = false;
    const sendBtn = button(`${item.who || '주민'}에게 설명 보내기`, () => send(ta, change, sendBtn), 'writeup-primary');
    const parts = [el('h3', {}, item.title), talk()];
    if (prev) {
      parts.push(el('div', {class: 'writeup-prev', 'data-no-gloss': ''}, el('strong', {}, `${prev.n}번째로 보낸 설명`), el('p', {}, prev.mode === 'written' ? prev.answer : '선생님께 말로 설명하기로 했어요.' + (prev.answer ? ' 메모: ' + prev.answer : ''))));
      loadReviews(); parts.push(feedbackBox());
    }
    parts.push(evidenceSection(),
      el('section', {class: 'writeup-write', 'aria-labelledby': 'wu-mine'},
        el('h4', {}, prev ? '설명 고쳐 쓰기' : '설명 쓰기'), el('p', {class: 'writeup-ask'}, item.ask),
        item.guide?.length ? el('ul', {class: 'writeup-guide'}, item.guide.map((g) => el('li', {}, g))) : '',
        item.terms?.length ? el('p', {class: 'writeup-terms'}, el('b', {}, '꼭 넣을 말 '), ...item.terms.map((t) => el('span', {class: 'writeup-term'}, t.word))) : '',
        el('label', {class: 'writeup-field'}, el('span', {id: 'wu-mine'}, '내 설명'), ta),
        prev ? el('label', {class: 'writeup-field'}, el('span', {id: 'wu-change'}, '무엇을 고쳤나요 (선택)'), change) : ''),
      el('div', {class: 'writeup-actions'},
        button(concept.hidden ? '정리한 내용 다시 보기' : '정리한 내용 접기', function () {
          concept.hidden = !concept.hidden; w.showConcept = !concept.hidden;
          if (!concept.hidden && !w.help.includes('concept')) w.help.push('concept');
          this.textContent = concept.hidden ? '정리한 내용 다시 보기' : '정리한 내용 접기'; keep();
        }, 'writeup-quiet'),
        button('선생님께 말로 설명할게요', () => { view = 'oral'; paint(); }, 'writeup-quiet'),
        onClose ? button(closeLabel, () => { save(); onClose(); }, 'writeup-quiet') : '',
        sendBtn),
      concept);
    return parts;
  }
  function oralView() {
    const memo = el('textarea', {maxlength: '300', rows: '3', 'aria-labelledby': 'wu-memo'});
    memo.value = w.memo || '';
    memo.oninput = () => { w.memo = memo.value; keep(); };
    const sendBtn = button('말로 설명하기로 하고 알리기', () => sendOral(memo, sendBtn), 'writeup-primary');
    return [el('h3', {}, item.title), talk(),
      el('section', {class: 'writeup-write'}, el('h4', {}, '선생님께 말로 설명하기'),
        el('p', {}, '선생님께 직접 말로 설명할 수 있어요. 선생님이 들은 뒤 기록을 확인해요. 말할 내용을 짧게 적어 두어도 좋아요.'),
        el('p', {class: 'writeup-ask'}, item.ask),
        item.guide?.length ? el('ul', {class: 'writeup-guide'}, item.guide.map((g) => el('li', {}, g))) : '',
        el('label', {class: 'writeup-field'}, el('span', {id: 'wu-memo'}, '말할 내용 메모 (선택)'), memo)),
      el('div', {class: 'writeup-actions'}, button('글로 쓰기로 돌아가기', () => { view = 'edit'; paint(); }, 'writeup-quiet'), sendBtn)];
  }
  function sentView() {
    const v = last();
    loadReviews();
    const chosen = cards.filter((c) => (v.picks || []).includes(c.key));
    const head = v.mode !== 'written' ? `선생님께 말로 설명하기로 알렸어요. ${v.n}번째 응답이에요.` : v.n === 1 ? '처음 설명을 보냈어요.' : `고쳐 쓴 설명을 보냈어요. ${v.n}번째 설명이에요.`;
    const body = [el('h3', {}, item.title), el('p', {class: 'writeup-sent-head'}, head)];
    if (v.mode === 'written') {
      body.push(el('div', {class: 'writeup-mine', 'data-no-gloss': ''}, el('p', {}, v.answer)));
      if (chosen.length) body.push(el('div', {class: 'writeup-chosen'}, el('strong', {}, '근거로 고른 관찰'), el('ul', {}, chosen.map((c) => el('li', {}, `관찰 ${cards.indexOf(c) + 1}: ${c.conditionText}. ${c.observation}`)))));
      if (v.terms?.length) body.push(el('div', {class: 'writeup-check'}, el('strong', {}, '꼭 넣을 말'),
        el('ul', {}, v.terms.map((t) => el('li', {class: t.used ? 'used' : 'missing'}, t.used ? `「${t.word}」${josa(t.word, '을', '를')} 넣었어요.` : `「${t.word}」${josa(t.word, '은', '는')} 아직 없어요. 이 말을 넣어 설명을 다듬어 볼 수 있어요.`))),
        el('p', {class: 'writeup-note'}, '낱말이 들어 있는지만 살펴봤어요. 설명이 맞는지는 선생님이 읽고 알려 줘요.')));
    } else {
      body.push(el('div', {class: 'writeup-mine'}, el('p', {}, '선생님께 말로 설명하기로 했어요. 선생님께 설명을 들려 드리면 선생님이 기록을 확인해요.'), v.answer ? el('p', {'data-no-gloss': ''}, '메모: ' + v.answer) : ''));
    }
    if (preview) body.push(el('p', {class: 'writeup-note'}, '둘러보기에서는 설명이 선생님께 가지 않아요.'));
    else body.push(feedbackBox());
    if (w.versions.length > 1) body.push(el('details', {class: 'writeup-history'}, el('summary', {}, `앞서 보낸 설명 ${w.versions.length - 1}개`),
      el('ol', {'data-no-gloss': ''}, w.versions.slice(0, -1).map((x) => el('li', {}, `${x.n}번째: ` + (x.mode === 'written' ? x.answer : '말로 설명하기' + (x.answer ? ', 메모: ' + x.answer : '')) + (x.change ? ` (고친 점: ${x.change})` : ''))))));
    body.push(el('div', {class: 'writeup-actions'},
      button(v.mode === 'written' ? '고쳐 쓰기' : '글로 써 보기', () => { w.editing = true; w.draft = ''; w.change = ''; view = 'edit'; save(); paint(); host.querySelector('textarea')?.focus(); }, 'writeup-quiet'),
      onNext ? button(nextLabel, () => { save(); onNext(); }, 'writeup-primary') : ''));
    return body;
  }
  async function send(ta, change, sendBtn) {
    if (busy) return;
    const text = ta.value.trim();
    if (short(text) < 10) { ta.focus(); return say('한두 문장 이상 써 주세요.'); }
    if (cards.length && !w.picks.length) { host.querySelector('.writeup-card')?.focus(); return say('근거로 쓸 내 관찰을 하나 이상 골라 주세요.'); }
    const prev = last();
    const p = {gameId, itemRevision: wu.itemRevision, answer: text, evidence: cards.filter((c) => w.picks.includes(c.key)).map((c) => ({roles: c.roles})), version: nextNo(), revises: prev?.id || '', change: prev ? change.value.trim() : '', help: [...w.help], mode: 'written'};
    busy = true; sendBtn.disabled = true; say('보내는 중이에요.');
    let r;
    try { r = await api('writeup-check', {payload: {...p, runId}}); }
    catch (e) { busy = false; sendBtn.disabled = false; return say(e.status === 400 ? e.message : '연결을 확인하고 다시 보내 주세요. 쓴 글은 그대로 남아 있어요.'); }
    if (!alive) return;
    let id = '';
    try { if (!preview) id = record('writeup.submitted', 'writeup', {...p, gameVersion: 'writeup-1'}); }
    catch { busy = false; sendBtn.disabled = false; return say('이 기기에 저장하지 못했어요. 글을 따로 적어 두고 선생님께 알려 주세요.'); }
    w.versions = [...w.versions, {id, n: p.version, at: Date.now(), mode: 'written', answer: text, picks: [...w.picks], change: p.change, terms: r.terms.map((t) => ({word: t.word, used: t.used}))}].slice(-6);
    Object.assign(w, {draft: '', change: '', help: [], showConcept: false, editing: false});
    busy = false; view = 'sent'; reviews = null; save(); paint(); say('');
    host.querySelector('.writeup-sent-head')?.focus();
  }
  function sendOral(memo, sendBtn) {
    if (busy) return;
    const prev = last();
    const p = {gameId, itemRevision: wu.itemRevision, answer: memo.value.trim(), evidence: cards.filter((c) => w.picks.includes(c.key)).map((c) => ({roles: c.roles})), version: nextNo(), revises: prev?.id || '', change: '', help: [...w.help], mode: 'oral_teacher'};
    let id = '';
    try { if (!preview) id = record('writeup.submitted', 'writeup', {...p, gameVersion: 'writeup-1'}); }
    catch { sendBtn.disabled = false; return say('이 기기에 저장하지 못했어요. 선생님께 말로 알려 주세요.'); }
    w.versions = [...w.versions, {id, n: p.version, at: Date.now(), mode: 'oral', answer: p.answer, picks: [...w.picks], change: ''}].slice(-6);
    Object.assign(w, {memo: '', editing: false});
    view = 'sent'; reviews = null; save(); paint();
    host.querySelector('.writeup-sent-head')?.focus();
  }
  function paint() {
    if (!alive) return;
    host.classList.add('writeup');
    host.replaceChildren(...(view === 'sent' && last() ? sentView() : view === 'oral' ? oralView() : editView()), status);
    host.querySelector('.writeup-sent-head')?.setAttribute('tabindex', '-1');
  }
  paint();
  return () => { alive = false; clearTimeout(saveSoon); };
}
