// 낱말 뜻 보기: 학생 화면 글 속의 어려운 낱말을 누르면 도우미가 뜻 카드를 보여 준다.
// - /glossary.json(tools/build_glossary.py가 data/glossary/*.json을 합쳐 만든다)을 한 번 읽는다.
// - 학생이 접속하면 startGlossary()로 켠다. body 아래 글이 바뀌는 것을 지켜보다가(MutationObserver) 낱말을
//   <button class="gloss-term">으로 잇는다. 단추, 입력 칸, 그림판, 머리 막대, data-no-gloss 안의 글은 건드리지 않는다.
// - 한 글 덩이(문단, 대사 한 줄, 목록 한 칸, 표 한 칸)에서 같은 낱말은 처음 한 번만 잇는다.
// - 지도 말풍선처럼 글자가 한 자씩 나오는 곳(data-full)은 글이 다 나온 뒤에 잇는다.
// - 의뢰 과제에서 보기 단추, 카드, 고르기 칸 안의 낱말은 단추 안에 단추를 둘 수 없으므로 과제 아래 「낱말 뜻」 줄에 모은다.
//   초성 맞히기, 빈칸 채우기, 끝말잇기는 낱말이 정답이라 이 줄을 두지 않는다.
// - 정답 보호: 보기와 같은 낱말, 보기끼리 다른 가운데 낱말(지구의 자전/공전), 뜻풀이에 보기 글이 들어 있는 낱말,
//   초성 맞히기의 초성과 맞는 낱말, 과제의 glossHide(data-gloss-hide)에 적은 낱말은 그 과제에서 잇지 않는다.
//   보기 속 낱말의 뜻이 묻는 글과 많이 겹치면 「낱말 뜻」 줄에도 넣지 않는다.
// - 뜻을 연 것은 진행이나 성취로 세지 않고 기록하지도 않는다.

const WORD_CH = /[가-힣A-Za-z]/;
const SPACE = /\s/;
const PARTICLES = ('은 는 이 가 을 를 에 에서 에게 께 한테 으로 로 와 과 의 도 만 까지 부터 처럼 보다 이나 나 이랑 랑 이에요 예요 '
  + '이었 였 이고 고 이며 며 이다 다 이라 라 라고 이란 란 이야 야 들 인 일 이지 입니 하 해 했 한 할 함 합 되 돼 됐 된 될 됨 됩 '
  + '시키 시켜 시킨 마다 뿐 조차 밖에 같이 이면 면 이든 든').split(' ');
// :has()를 모르는 브라우저에서는 그 선택자만 빼고 쓴다
const HAS = typeof CSS !== 'undefined' && CSS.supports?.('selector(:has(a))');
const sel = (list) => list.filter((x) => HAS || !x.includes(':has(')).join(',');
const PART_BY_FIRST = new Map();
for (const p of PARTICLES) { if (!PART_BY_FIRST.has(p[0])) PART_BY_FIRST.set(p[0], []); PART_BY_FIRST.get(p[0]).push(p); }
// 이 안의 글은 잇지 않는다
const SKIP = sel(['button', 'a', 'input', 'textarea', 'select', 'option', 'canvas', 'svg', 'code', 'pre', 'kbd', 'script', 'style', 'noscript', 'summary', 'h1',
  '[contenteditable]', '[data-no-gloss]', '[aria-hidden="true"]', '[role="button"]', '[role="radio"]', '[role="checkbox"]', '[role="tab"]', '[role="option"]', '[role="link"]', '[role="menuitem"]', '[role="switch"]', '[role="slider"]',
  'label:has(input[type="radio"])', 'label:has(input[type="checkbox"])',
  'body > header', '#notice', '.sr-only', '.gloss-pop', '.gloss-chips', '.game-login', '.adventure-bar', '.quest-chip', '.quest-banner', '.achieve-toast',
  '.speech-head', '.m-line-body > strong', '.m-task-no', '.mission-top', '.mission-intro-title > small', '.mission-finish-title', '.m-order', '.m-find', '.m-word-clue', '.m-word-boxes', '.m-chain', '.m-chain-pool', '.m-ghost', '.m-reflect > span',
  '[data-task-type="word"] .m-work', '[data-task-type="chain"] .m-work']);
const BLOCK = 'p,li,td,th,dt,dd,legend,caption,figcaption,label,h2,h3,h4,h5,h6,blockquote';
// 정답 보호를 따지는 문제 덩이: 의뢰 과제, 지도 말풍선, 그 밖에 data-gloss-quiz를 단 곳(main#app 바로 아래의 실험 화면도 본다)
const QUIZ = '.mission-task, .speech-body, [data-gloss-quiz]';
// 보기처럼 고르는 것들(단추 안 글은 잇지 못하므로 정답 보호와 「낱말 뜻」 줄에 쓴다)
const CONTROLS = sel(['button:not(.gloss-term):not(.gloss-chip)', 'option', '[role="radio"]', '[role="checkbox"]', '[role="option"]', 'label:has(input[type="radio"])', 'label:has(input[type="checkbox"])', '.m-order-text', '.m-chain-word', '.m-bin > h3']);
// 다음, 닫기처럼 화면을 넘기는 단추 이름은 보기로 치지 않는다
const NAV = /^(다음|계속|닫기|그대로|잠깐|다시|나중|도와|확인|지도로|돌아|조사 시작|도움|의뢰|탐험|더 해보기|할 일|마무리|단계|여기에 놓기|카드를 끌어|고르기|뜻 고르기|선생님 자료|반박 시작|[▲▼◀▶])/;
const NO_CHIPS = new Set(['word', 'fill', 'chain']);
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const HELPER = {science: {key: 'comji', name: '컴지', tag: '과학 낱말'}, word: {key: 'dalsae', name: '달새', tag: '낱말 뜻'}};
const REGION_FALLBACK = {farm: 'R1', fire: 'R2', power: 'R3', future: 'R4', life: 'R5'};

let entries = [], trie = null, loaded = null, regionKeys = {...REGION_FALLBACK};
let active = false, observer = null, timer = 0, region = '';
const queue = new Set();
let pop = null, popTerm = null, popIdx = -1, popRect = null, escClosedAt = 0;

const norm = (s) => String(s || '').replace(/[^가-힣A-Za-z0-9]/g, '');
const isWord = (ch) => !!ch && WORD_CH.test(ch);

// ---------------------------------------------------------------- 자료 읽기
function load() {
  loaded ??= Promise.all([
    fetch('/glossary.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    fetch('/regions.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]).then(([list, regions]) => {
    entries = Array.isArray(list) ? list.filter((e) => e && typeof e.t === 'string' && typeof e.d === 'string') : [];
    if (regions && typeof regions === 'object') {
      for (const [key, r] of Object.entries(regions)) {
        const g = r?.zones?.flatMap((z) => z.games || []).find((x) => /^R\d/.test(x?.id || ''));
        if (g) regionKeys[key] = g.id.slice(0, 2);
      }
    }
    buildTrie();
  });
  return loaded;
}

// 낱말과 다른 꼴(alts)을 글자 나무로 만든다. 띄어쓰기는 글 속의 공백 여러 개와도 맞는다.
// 같은 꼴에 지역마다 뜻이 다른 항목(동음이의어, 예: 소화 R2 불 끄기, R5 음식물 쪼개기)이 여럿 붙을 수 있다.
function buildTrie() {
  trie = new Map();
  entries.forEach((e, idx) => {
    for (const w of [e.t, ...(e.alts || [])]) {
      const word = String(w).split(/\s+/).filter(Boolean).join(' ');
      if (!word) continue;
      let node = {c: trie};
      for (const ch of word) { if (!node.c.has(ch)) node.c.set(ch, {c: new Map()}); node = node.c.get(ch); }
      (node.es ??= []).includes(idx) || node.es.push(idx);
    }
  });
}

// 낱말 뒤 경계: 글 끝, 한글과 영문이 아닌 글자, 또는 조사와 어미
function endOk(text, j) {
  if (j >= text.length || !isWord(text[j])) return true;
  const list = PART_BY_FIRST.get(text[j]);
  return !!list && list.some((p) => text.startsWith(p, j));
}
// i에서 시작하는 낱말 후보(긴 것 먼저)
function matchesAt(text, i) {
  const out = [];
  let map = trie, j = i;
  while (j < text.length) {
    let node;
    if (SPACE.test(text[j])) { node = map.get(' '); if (!node) break; while (j < text.length && SPACE.test(text[j])) j++; }
    else { node = map.get(text[j]); if (!node) break; j++; }
    if (node.es && endOk(text, j)) out.push([j, node.es]);
    map = node.c;
  }
  return out.reverse();
}
// 같은 꼴의 항목 가운데 지금 지역의 것: scope에 지역이 든 항목, 없으면 scope가 빈 항목, 그것도 없으면 -1(잇지 않음)
export function pickEntry(list, reg) {
  let free = -1;
  for (const i of list) {
    const sc = entries[i]?.scope;
    if (sc && sc.length) { if (sc.includes(reg)) return i; } else if (free < 0) free = i;
  }
  return free;
}
// 글 하나에서 이을 자리 [시작, 끝, 낱말 번호]. used에 있는 낱말은 다시 잇지 않는다.
function findAll(text, used, ctx) {
  const hits = [];
  if (!trie || !trie.size) return hits;
  for (let i = 0; i < text.length; i++) {
    if (i && isWord(text[i - 1])) continue;
    if (!trie.has(text[i])) continue;
    const cands = matchesAt(text, i);
    if (!cands.length) continue;
    let pick = null;
    for (const [end, list] of cands) { const idx = pickEntry(list, ctx.reg); if (idx >= 0 && ctx.guard(idx)) { pick = [end, idx]; break; } }
    if (!pick) continue;
    const [end, idx] = pick;
    if (!used.has(idx)) { used.add(idx); hits.push([i, end, idx]); }
    i = end - 1;
  }
  return hits;
}

// ---------------------------------------------------------------- 지역과 정답 보호
export function regionOf(map = '') {
  const s = String(map || '');
  const m = s.match(/^mission:(R\d)/);
  if (m) return m[1];
  const key = s.split('-')[0];
  if (regionKeys[key]) return regionKeys[key];
  if (/workshop|g05-intro|power-lab/.test(s)) return 'R3';
  return '';
}
// 지금 지도나 의뢰의 지역(R1~R5). 지도를 옮길 때 app.mjs가 부른다.
export function setGlossRegion(map) { region = /^R\d$/.test(map || '') ? map : regionOf(map); }

const textOf = (n) => {
  let s = '';
  for (const c of n.childNodes) {
    if (c.nodeType === 3) s += c.data;
    else if (c.nodeType === 1 && c.getAttribute('aria-hidden') !== 'true' && !c.classList.contains('read-count')) s += textOf(c);
  }
  return s;
};
const labelOf = (c) => (c.tagName === 'BUTTON' && c.getAttribute('aria-label') && !textOf(c).trim() ? c.getAttribute('aria-label') : textOf(c)).replace(/\s+/g, ' ').trim();
function quizRoot(el) {
  const q = el.closest(QUIZ);
  if (q) return q;
  const app = document.querySelector('main#app');
  if (!app || !app.contains(el) || el === app) return null;
  let x = el;
  while (x.parentElement && x.parentElement !== app) x = x.parentElement;
  return x.matches('.atlas, .mission') ? null : x;
}
function controlsOf(q) {
  const scope = q.matches('.mission-task') ? [...q.querySelectorAll(':scope > .m-work, :scope > .m-stage')] : q.matches('.speech-body') ? [...q.querySelectorAll('.actions')] : [q];
  return scope.flatMap((s) => [...s.querySelectorAll(CONTROLS)]).filter((c) => !c.closest('.gloss-chips, .gloss-pop'));
}
const bigrams = (s) => { const out = []; for (let i = 0; i + 1 < s.length; i++) out.push(s.slice(i, i + 2)); return out; };
// a의 두 글자 묶음 가운데 set에도 있는 것의 비율
const share = (a, set) => { const bg = bigrams(a); return bg.length ? bg.filter((b) => set.has(b)).length / bg.length : 0; };
// 보기끼리 앞뒤가 같고 이 낱말 자리만 다른지(「지구의 공전」, 「지구의 자전」의 공전). 묻는 개념 그 자체라 뜻을 보이지 않는다.
function swapped(f, labels) {
  for (const x of labels) for (let s = x.indexOf(f); s >= 0; s = x.indexOf(f, s + 1)) {
    const pre = x.slice(0, s), post = x.slice(s + f.length);
    if (labels.some((y) => y !== x && y.length - pre.length - post.length >= 1 && y.length - pre.length - post.length <= 6 && y.startsWith(pre) && y.endsWith(post))) return true;
  }
  return false;
}
const chosung = (s) => [...s].map((ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ''; }).join('');
// 문제 덩이 하나의 보기 글과 초성 맞히기 초성을 모아, 낱말 번호마다 이어도 되는지 알려 주는 함수를 만든다
function guardFor(q) {
  if (!q) return () => true;
  const labels = [...new Set(controlsOf(q).map(labelOf).filter((l) => l && !NAV.test(l)).map(norm).filter((l) => (l.match(/[가-힣]/g) || []).length >= 2))];
  const pattern = q.matches('[data-task-type="word"]') ? [...q.querySelectorAll('.m-word-box small')].map((s) => s.textContent).join('') : '';
  const cache = new Map();
  return (idx) => {
    if (cache.has(idx)) return cache.get(idx);
    const e = entries[idx], forms = [e.t, ...(e.alts || [])].map(norm), dn = norm(e.d);
    let ok = !forms.some((f) => f.length >= 2 && swapped(f, labels));
    const dset = new Set(bigrams(dn));
    if (ok) for (const l of labels) {
      // 보기 글이 곧 이 낱말이거나, 짧은 보기 글이 뜻풀이에 들어 있거나, 긴 보기 글의 두 글자 묶음이 뜻풀이에 많이 들어 있으면 잇지 않는다
      if (forms.includes(l) || (l.length <= 3 ? dn.includes(l) : share(l, dset) >= 0.6)) { ok = false; break; }
    }
    if (ok && pattern) {
      const n = pattern.length;
      if (forms.some((f) => chosung(f) === pattern)) ok = false;
      else for (const run of e.d.match(/[가-힣]+/g) || []) for (let i = 0; i + n <= run.length; i++) if (chosung(run.slice(i, i + n)) === pattern) ok = false;
    }
    cache.set(idx, ok);
    return ok;
  };
}
// data-gloss-hide="낱말|낱말": 의뢰 과제(glossHide)가 뜻이 답을 알려 준다고 정한 낱말. term이나 alts 가운데 하나라도 같으면 잇지 않는다.
function hideFor(h) {
  const list = new Set(String(h?.dataset.glossHide || '').split('|').map(norm).filter(Boolean));
  return list.size ? (idx) => ![entries[idx].t, ...(entries[idx].alts || [])].some((f) => list.has(norm(f))) : null;
}
function ctxFor(el, pass) {
  const reg = el.closest('[data-region]')?.dataset.region || region;
  const q = quizRoot(el), h = el.closest('[data-gloss-hide]');
  let c = pass.ctx.get(q || 'none');
  if (!c) { c = {guard: guardFor(q), regs: new Map()}; pass.ctx.set(q || 'none', c); }
  const key = reg + '|' + (h ? (pass.hides.has(h) ? pass.hides.get(h) : pass.hides.set(h, pass.hides.size).get(h)) : '');
  let r = c.regs.get(key);
  if (!r) { const hide = hideFor(h); r = {reg, guard: hide ? (idx) => hide(idx) && c.guard(idx) : c.guard}; c.regs.set(key, r); }
  return r;
}

// ---------------------------------------------------------------- 낱말 잇기
const typingNow = (el) => el.dataset && el.dataset.full !== undefined && el.textContent !== el.dataset.full;
function skipEl(el) { return el.matches(SKIP) || typingNow(el); }
function blocked(el) {
  if (!el.isConnected || el.closest(SKIP)) return true;
  for (let x = el; x && x !== document.body; x = x.parentElement) if (typingNow(x)) return true;
  return false;
}
function termButton(text, idx) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'gloss-term'; b.textContent = text; b.dataset.gloss = String(idx);
  b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
  return b;
}
function usedIn(block, pass) {
  let s = pass.blocks.get(block);
  if (!s) { s = new Set([...block.querySelectorAll('.gloss-term')].map((b) => Number(b.dataset.gloss))); pass.blocks.set(block, s); }
  return s;
}
function linkNode(t, pass) {
  const parent = t.parentElement;
  if (!parent) return;
  const block = parent.closest(BLOCK) || parent;
  const hits = findAll(t.data, usedIn(block, pass), ctxFor(parent, pass));
  if (!hits.length) return;
  const text = t.data, frag = document.createDocumentFragment();
  let last = 0;
  for (const [s, e, idx] of hits) { if (s > last) frag.append(text.slice(last, s)); frag.append(termButton(text.slice(s, e), idx)); last = e; }
  if (last < text.length) frag.append(text.slice(last));
  let disp = pass.disp.get(parent);
  if (disp === undefined) { disp = getComputedStyle(parent).display; pass.disp.set(parent, disp); }
  // 글이 flex, grid 칸에 바로 들어 있으면 한 덩이로 감싸 칸 나눔이 바뀌지 않게 한다
  if (/flex|grid/.test(disp)) { const w = document.createElement('span'); w.className = 'gloss-run'; w.append(frag); t.replaceWith(w); }
  else t.replaceWith(frag);
}
function scan(root, pass) {
  if (root.nodeType !== 1 || blocked(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === 1 ? (skipEl(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : n.data.length > 1 && /[가-힣A-Za-z]/.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
  });
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  for (const t of texts) linkNode(t, pass);
}

// 의뢰 과제: 보기 단추, 카드, 고르기 칸 안의 낱말을 과제 아래 「낱말 뜻」 줄에 모은다
function updateChips(panel, pass) {
  const old = panel.querySelector(':scope > .gloss-chips');
  const work = panel.querySelector(':scope > .m-work');
  if (!work || NO_CHIPS.has(panel.dataset.taskType || '')) { old?.remove(); return; }
  const ctx = ctxFor(work, pass);
  const linked = new Set([...panel.querySelectorAll('.gloss-term')].filter((b) => b.getClientRects().length).map((b) => Number(b.dataset.gloss)));
  // 묻는 글(제목, 대사, 안내, 문항): 보기 속 낱말의 뜻풀이가 묻는 글과 많이 겹치면 그 뜻이 곧 답이 되므로 줄에 넣지 않는다
  const ask = new Set(bigrams(norm([...panel.querySelectorAll(':scope > .m-task-head, :scope > .m-talk, :scope > .m-note, legend, .m-sub, .m-how')].map(textOf).join(' '))));
  const found = [];
  for (const c of controlsOf(panel)) {
    if (!c.getClientRects().length && c.tagName !== 'OPTION') continue;
    for (const [, , idx] of findAll(labelOf(c), new Set(linked), ctx)) if (!found.includes(idx) && share(norm(entries[idx].d), ask) < 0.4) found.push(idx);
    if (found.length >= 12) break;
  }
  const key = found.join(',');
  if (old && old.dataset.key === key) return;
  if (!found.length) { old?.remove(); return; }
  const row = document.createElement('div');
  row.className = 'gloss-chips'; row.dataset.noGloss = ''; row.dataset.key = key;
  row.setAttribute('role', 'group'); row.setAttribute('aria-label', '보기 속 낱말 뜻');
  const label = document.createElement('span');
  label.className = 'gloss-chips-label'; label.textContent = '낱말 뜻';
  row.append(label);
  for (const idx of found) {
    const b = termButton(entries[idx].t, idx);
    b.className = 'gloss-chip';
    row.append(b);
  }
  if (old) old.replaceWith(row); else work.after(row);
}

function schedule(n) {
  if (!n) return;
  queue.add(n);
  if (!timer) timer = setTimeout(flush, 90);
}
function flush() {
  timer = 0;
  if (!active || !trie) { queue.clear(); return; }
  const els = new Set();
  for (const n of queue) { const e = n.nodeType === 1 ? n : n.parentElement; if (e && e.isConnected) els.add(e); }
  queue.clear();
  // 다른 고칠 곳 안에 든 것은 뺀다
  const roots = [...els].filter((e) => { for (let x = e.parentElement; x; x = x.parentElement) if (els.has(x)) return false; return true; });
  const pass = {ctx: new Map(), blocks: new Map(), disp: new Map(), hides: new Map()};
  const panels = new Set();
  try {
    for (const r of roots) {
      scan(r, pass);
      const p = r.closest('.mission-task');
      if (p) panels.add(p); else r.querySelectorAll('.mission-task').forEach((x) => panels.add(x));
    }
    for (const p of panels) updateChips(p, pass);
  } catch (err) { console.warn('glossary', err); }
  observer?.takeRecords();
  keepPopover();
}
function onMutations(list) {
  for (const m of list) {
    if (m.type === 'characterData') schedule(m.target);
    else for (const n of m.addedNodes) if (n.nodeType === 1 || n.nodeType === 3) {
      if (n.nodeType === 1 && (n.classList.contains('gloss-pop') || n.classList.contains('gloss-term'))) continue;
      schedule(n);
    }
  }
}

// ---------------------------------------------------------------- 뜻 카드
function host(trigger) {
  const dlg = trigger.closest('dialog[open]');
  if (dlg) return dlg;
  const fs = document.fullscreenElement || document.webkitFullscreenElement;
  return fs && fs !== document.documentElement && fs !== document.body && fs.contains(trigger) ? fs : document.body;
}
function bounds(trigger) {
  const b = {l: 0, t: 0, r: innerWidth, b: innerHeight};
  const stage = document.body.classList.contains('game-view') && !trigger.closest('dialog') ? document.querySelector('main#app') : null;
  if (stage) { const s = stage.getBoundingClientRect(); b.l = Math.max(0, s.left); b.r = Math.min(innerWidth, s.right); }
  return b;
}
function place() {
  if (!pop || !popTerm?.isConnected) return;
  const r = popTerm.getBoundingClientRect(), b = bounds(popTerm);
  if (r.bottom < b.t || r.top > b.b || (!r.width && !r.height)) { closePop(false); return; }
  popRect = r;
  const w = pop.offsetWidth, h = pop.offsetHeight, gap = 10;
  const x = Math.max(b.l + 8, Math.min(b.r - 8 - w, r.left + r.width / 2 - w / 2));
  const room = {down: b.b - r.bottom, up: r.top - b.t};
  const down = room.down >= h + gap + 6 || room.down >= room.up;
  const y = Math.max(b.t + 6, Math.min(b.b - 6 - h, down ? r.bottom + gap : r.top - gap - h));
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
  // 창 안(dialog)처럼 기준 상자가 다른 곳에 붙었을 때는 실제 자리를 재어 맞춘다
  const got = pop.getBoundingClientRect();
  if (Math.abs(got.left - x) > 0.5 || Math.abs(got.top - y) > 0.5) { pop.style.left = (2 * x - got.left) + 'px'; pop.style.top = (2 * y - got.top) + 'px'; }
  pop.dataset.dir = down ? 'down' : 'up';
  pop.style.setProperty('--gloss-tail', Math.max(18, Math.min(w - 18, r.left + r.width / 2 - x)) + 'px');
}
function openPop(trigger) {
  const idx = Number(trigger.dataset.gloss), e = entries[idx];
  if (!e) return;
  closePop(false);
  const kind = HELPER[e.k] || HELPER.science;
  const box = document.createElement('div');
  box.className = 'gloss-pop'; box.dataset.noGloss = ''; box.dataset.kind = e.k === 'word' ? 'word' : 'science';
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-labelledby', 'gloss-pop-term'); box.setAttribute('aria-describedby', 'gloss-pop-def');
  const pic = document.createElement('img');
  pic.className = 'gloss-pop-helper'; pic.alt = ''; pic.src = `/assets/portraits/${kind.key}.png`;
  pic.addEventListener('error', () => pic.remove());
  const main = document.createElement('div'); main.className = 'gloss-pop-main';
  const head = document.createElement('div'); head.className = 'gloss-pop-head';
  const tag = document.createElement('span'); tag.className = 'gloss-pop-tag'; tag.textContent = kind.tag;
  const who = document.createElement('span'); who.className = 'gloss-pop-who'; who.textContent = `${kind.name}가 알려 줘요`;
  head.append(tag, who);
  const term = document.createElement('strong'); term.className = 'gloss-pop-term'; term.id = 'gloss-pop-term'; term.textContent = e.t;
  const def = document.createElement('p'); def.className = 'gloss-pop-def'; def.id = 'gloss-pop-def'; def.textContent = e.d;
  main.append(head, term, def);
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'gloss-pop-close'; close.textContent = '닫기';
  close.addEventListener('click', (ev) => { ev.stopPropagation(); closePop(true); });
  const tail = document.createElement('span'); tail.className = 'gloss-pop-tail'; tail.setAttribute('aria-hidden', 'true');
  // 자리를 잡는 상자(box)와 튀어나오는 카드(card)를 나눠, 카드가 움직이는 동안에도 자리를 바로 잴 수 있게 한다
  const card = document.createElement('div'); card.className = 'gloss-pop-card';
  card.append(tail, pic, main, close);
  box.append(card);
  box.addEventListener('click', (ev) => ev.stopPropagation());
  pop = box; popTerm = trigger; popIdx = idx;
  host(trigger).append(box);
  trigger.setAttribute('aria-expanded', 'true');
  place();
  close.focus({preventScroll: true});
}
function closePop(returnFocus) {
  if (!pop) return;
  const t = popTerm, inside = pop.contains(document.activeElement);
  pop.remove(); pop = null; popTerm = null; popIdx = -1; popRect = null;
  if (t) { t.setAttribute('aria-expanded', 'false'); if ((returnFocus || inside) && t.isConnected) t.focus({preventScroll: true}); }
}
// 화면이 다시 그려져 낱말 단추가 바뀌었으면 같은 자리의 새 단추로 옮기고, 없으면 닫는다. 새 창이 열리면 닫는다.
function keepPopover() {
  if (!pop) return;
  const dialogs = [...document.querySelectorAll('dialog[open]')];
  if (dialogs.length && !dialogs[dialogs.length - 1].contains(pop)) { closePop(false); return; }
  if (popTerm?.isConnected) { place(); return; }
  const near = [...document.querySelectorAll(`.gloss-term[data-gloss="${popIdx}"], .gloss-chip[data-gloss="${popIdx}"]`)].find((b) => { const r = b.getBoundingClientRect(); return popRect && Math.abs(r.left - popRect.left) < 60 && Math.abs(r.top - popRect.top) < 60; });
  if (near) { popTerm = near; near.setAttribute('aria-expanded', 'true'); place(); } else closePop(false);
}

function onClick(e) {
  const t = e.target instanceof Element ? e.target.closest('.gloss-term, .gloss-chip') : null;
  if (!t || !active) return;
  // 낱말을 누른 것은 둘레의 단추나 말풍선 누르기로 넘기지 않는다
  e.stopPropagation(); e.preventDefault();
  if (pop && popTerm === t) closePop(true); else openPop(t);
}
function onPointerDown(e) {
  if (!pop) return;
  const t = e.target instanceof Node ? e.target : null;
  if (t && (pop.contains(t) || popTerm?.contains(t))) return;
  closePop(false);
}
function onKey(e) {
  if (!pop || e.key !== 'Escape') return;
  e.preventDefault(); e.stopImmediatePropagation();
  escClosedAt = performance.now();
  closePop(true);
}
// Esc로 뜻 카드만 닫을 때 그 아래 창(dialog)까지 닫히지 않게 한다
function onCancel(e) { if (performance.now() - escClosedAt < 300) e.preventDefault(); }
function onScroll() { if (pop) place(); }

// ---------------------------------------------------------------- 켜고 끄기
export async function startGlossary() {
  if (active) return;
  active = true;
  await load();
  if (!active) return;
  if (!entries.length) return;
  observer = new MutationObserver(onMutations);
  observer.observe(document.body, {childList: true, subtree: true, characterData: true});
  document.addEventListener('click', onClick, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('keydown', onKey, true);
  document.addEventListener('cancel', onCancel, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onScroll);
  schedule(document.querySelector('main#app'));
  for (const d of document.querySelectorAll('dialog[open], .workshop-helper')) schedule(d);
}
export function stopGlossary() {
  active = false;
  clearTimeout(timer); timer = 0; queue.clear();
  closePop(false);
  observer?.disconnect(); observer = null;
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('pointerdown', onPointerDown, true);
  window.removeEventListener('keydown', onKey, true);
  document.removeEventListener('cancel', onCancel, true);
  document.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', onScroll);
  document.querySelectorAll('.gloss-chips').forEach((r) => r.remove());
  document.querySelectorAll('.gloss-term').forEach((b) => b.replaceWith(b.textContent));
  document.querySelectorAll('.gloss-run').forEach((s) => s.replaceWith(...s.childNodes));
}
// 시험과 화면 점검용: 지금 읽은 낱말 수, 글 하나를 어느 지역에서 어떻게 잇는지(정답 보호는 빼고 본다)
export const glossaryInfo = () => ({active, terms: entries.length, region});
export async function glossaryMatch(text, reg = region) {
  await load();
  return findAll(String(text), new Set(), {reg, guard: () => true}).map(([s, e, idx]) => ({text: String(text).slice(s, e), term: entries[idx].t, def: entries[idx].d, scope: entries[idx].scope || []}));
}
