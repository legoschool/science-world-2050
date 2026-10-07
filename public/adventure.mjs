// 화면 위 모험 도구: 현재 의뢰, 목적지 안내, 퀘스트 수첩, 인벤토리, 시작 광장.
// 첫 이야기는 광장 지도 안에서 진행되므로(atlas.mjs) 여기서는 이야기 단계의 할 일만 보여 준다.
import {questInfo, questSteps, SIDE_QUESTS, loadMissions} from './quests.mjs';
import {BADGES, earnedBadges, explore, dexOf} from './progress.mjs';
import {sfx, soundSettings, setSound} from './sound.mjs';
import {WEAR, countDone, isOpen, cleanWear} from './wardrobe.mjs';
import {setPlayerWear} from './sprites.mjs';
import {showEnding} from './ending.mjs';
import {openBoard, loadBoard, boardNews} from './board.mjs';
import {loadField, loadWorldExtra, fieldProgress} from './field.mjs';
import {showLearning, showWeekly, loadWeekly} from './learning.mjs';
import {openHero} from './hero.mjs';
import {dexSeen} from './codex.mjs';
const REGION_NAME = {R1: '햇살 농장 지구', R2: '불꽃 에너지 지구', R3: '전력망 지구', R4: '미래 연구 본부', R5: '푸른 생활 지구'};
export function adventureHUD({el, button, state, api, save, go, route, pending, uid, preview = false}) {
  state.adventure ??= {welcomed: false, tracked: 'R3-G04'};
  const a = state.adventure, bar = el('section', {class: 'adventure-bar', 'aria-label': '모험 도구'}), mission = el('strong', {}, '의뢰를 확인하고 있어요'), dialog = el('dialog', {class: 'adventure-dialog'});
  let alive = true, data = null, stamp = -1, busy = false;
  // 구역 현장 활동 목록(퀘스트 수첩 아래쪽)
  let fieldData = null, extraData = null;
  const zoneTitles = {};
  Promise.all([loadField(), loadWorldExtra(), fetch('/regions.json').then((r) => r.json()).catch(() => null)]).then(([f, e, r]) => { fieldData = f; extraData = e; for (const reg of Object.values(r || {})) for (const z of reg.zones || []) zoneTitles[z.id] = `${reg.title} ${z.title}`; });
  // 위쪽 막대 단추: 그림 글자와 이름. 좁은 화면에서는 이름을 숨기고, 읽기 프로그램에는 aria-label로 이름을 알린다.
  const hudBtn = (icon, label, fn, cls = '') => el('button', {type: 'button', class: ('hud-btn ' + cls).trim(), 'aria-label': label, title: label, onclick: fn}, el('span', {class: 'hud-ico', 'aria-hidden': 'true'}, icon), el('span', {class: 'hud-label'}, label));
  const setLabel = (b, label) => { b.setAttribute('aria-label', label); b.title = label; b.querySelector('.hud-label').textContent = label; };
  const questsButton = hudBtn('📒', '퀘스트 수첩', () => showQuests(), 'hud-quests'), inventoryButton = hudBtn('🎒', '인벤토리', () => showInventory(), 'hud-inventory');
  questsButton.disabled = true;
  const restore = el('span', {class: 'restore-badge', title: '전력망 지구를 얼마나 되살렸는지 보여 줘요'}, '전력망 지구 복구 0%');
  const levelBox = el('div', {class: 'level-box', title: '단계와 의뢰를 끝내고 징표를 모으면 경험치가 쌓여요'}), levelText = el('strong', {}, 'Lv.1'), levelFill = el('span', {class: 'level-fill'});
  levelBox.append(levelText, el('span', {class: 'level-bar'}, levelFill));
  levelBox.setAttribute('role', 'button'); levelBox.tabIndex = 0; levelBox.setAttribute('aria-label', '탐험가 정보');
  levelBox.addEventListener('click', () => showInventory('status'));
  levelBox.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showInventory('status'); } });
  // 반 친구 게시판: 새 글과 내 글의 새 답 수를 단추에 붙인다
  const boardBadge = el('span', {class: 'board-badge', hidden: ''}), boardButton = hudBtn('💬', '게시판', () => showBoard(), 'board-open');
  boardButton.append(boardBadge);
  const paintBoard = (n) => { boardBadge.hidden = !n; boardBadge.textContent = n > 99 ? '99+' : String(n); boardButton.setAttribute('aria-label', n ? `게시판, 새 소식 ${n}개` : '게시판'); };
  const checkBoard = (maxAge = 60000) => { if (document.visibilityState !== 'visible' || !uid) return; loadBoard(api, maxAge).then((b) => { if (alive) paintBoard(boardNews(b, uid)); }).catch(() => {}); };
  let boardOpen = false;
  function showBoard() { if (boardOpen) return; boardOpen = true; if (dialog.open) dialog.close(); openBoard({el, button, api, uid, quests: () => data?.quests || [], current: () => a.tracked || '', onSeen: () => paintBoard(0), onClose: () => { boardOpen = false; checkBoard(); }}).catch(() => { boardOpen = false; }); }
  // 현재 의뢰는 지도 위 가운데 표지로 보인다. 보여 주기만 하고 아래의 장소 이름표 누르기를 막지 않는다.
  const questChip = el('div', {class: 'quest-chip'}, mission);
  bar.append(levelBox, restore, hudBtn('🧭', '목적지 안내', () => route(), 'hud-route'), questsButton, inventoryButton, boardButton, hudBtn('🏠', '시작 광장으로', () => { open('중앙 광장으로 돌아갈까요?'); dialog.append(el('p', {}, '현재 탐구 기록을 보관하고 중앙 광장으로 돌아갑니다.'), button('중앙 광장으로 돌아가기', () => { dialog.close(); go('hub'); })); }, 'hud-minor hud-home'));
  // 전체 화면: 브라우저가 지원할 때만 단추를 보인다(아이폰 사파리는 지원하지 않는다). Esc로도 끝난다.
  const fsRoot = document.documentElement, fsRequest = fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen;
  const fsNow = () => document.fullscreenElement || document.webkitFullscreenElement;
  const fullButton = hudBtn('⛶', '전체 화면', () => {
    if (fsNow()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else Promise.resolve(fsRequest.call(fsRoot)).catch(() => { setLabel(fullButton, '전체 화면을 열 수 없어요'); setTimeout(syncFull, 2500); });
  }, 'full-toggle hud-minor');
  fullButton.hidden = !fsRequest;
  const syncFull = () => { const on = Boolean(fsNow()); setLabel(fullButton, on ? '전체 화면 끝내기' : '전체 화면'); fullButton.setAttribute('aria-pressed', String(on)); fsRoot.classList.toggle('is-full', on); };
  document.addEventListener('fullscreenchange', syncFull); document.addEventListener('webkitfullscreenchange', syncFull);
  syncFull();
  // 게임 화면(16:9): 머리글의 이름, 저장 상태, 제보하기, 로그아웃을 이 막대 오른쪽으로 옮긴다. 막대를 치울 때 머리글로 돌려놓는다.
  const head = document.querySelector('body > header');
  const headItems = ['#identity', '#sync', '#report', '#logout'].map((q) => document.querySelector(q)).filter(Boolean);
  if (preview) bar.append(hudBtn('🔭', '둘러보기', () => showBrowse(), 'hud-browse'));
  bar.append(hudBtn('🔊', '소리', () => showSound(), 'hud-minor'), fullButton, hudBtn('❓', '조작 방법', () => showControls(), 'hud-minor hud-help'), el('div', {class: 'hud-me'}, ...headItems));
  document.body.classList.add('game-view');
  levelBox.title = headItems[0]?.textContent || '';
  setPlayerWear(a.wear || {});
  document.querySelector('#app').before(bar);
  bar.after(questChip);
  document.body.append(dialog);
  // 창 제목과 닫기는 위에 붙어 있어 내용을 내려도 보인다. Esc나 창 바깥을 눌러도 닫힌다(app.mjs).
  function open(title) { dialog.replaceChildren(el('div', {class: 'dlg-head'}, el('h2', {}, title), button('닫기', () => dialog.close()))); if (!dialog.open) dialog.showModal(); }
  let stepProgress = {};
  // 퀘스트 수첩 탭: 의뢰 목록, 내 배움 지도, 반짝 탐험가(선생님이 켠 반만)
  let questTab = 'quests', weekly = null;
  const notebookOpen = () => dialog.open && dialog.querySelector('h2')?.textContent === '퀘스트 수첩';
  function showQuests(refetch = true) {
    open('퀘스트 수첩');
    const tabList = [['quests', '의뢰 목록'], ['learning', '내 배움 지도'], ...(weekly?.on ? [['weekly', '반짝 탐험가']] : [])];
    if (!tabList.some(([k]) => k === questTab)) questTab = 'quests';
    const tabs = el('div', {class: 'inventory-tabs quest-tabs', role: 'tablist'});
    for (const [k, label] of tabList) { const b = button(label, () => { questTab = k; showQuests(false); }, 'inventory-tab'); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(questTab === k)); tabs.append(b); }
    dialog.append(tabs);
    if (refetch && uid) loadWeekly(api).then((w) => { const was = !!weekly?.on; weekly = w; if (alive && was !== !!w.on && notebookOpen()) showQuests(false); });
    if (questTab === 'learning') { const box = el('div', {class: 'learn-box'}); dialog.append(box); showLearning({el, api, box}); return; }
    if (questTab === 'weekly') { const box = el('div', {class: 'weekly-box'}); dialog.append(box); showWeekly({el, box, data: weekly}); return; }
    if (!data) { dialog.append(el('p', {}, '연결 상태를 확인한 뒤 다시 열어 주세요.')); return; }
    if (!a.welcomed) dialog.append(el('p', {class: 'quest-story'}, '지금 할 일: ' + (state.story?.hint || '중앙 광장에서 신항이를 만나 보세요')));
    if (allDone()) dialog.append(el('p', {class: 'quest-story'}, '네 지구 의뢰 52개를 모두 해결했어요. ', button('엔딩 다시 보기', () => { dialog.close(); openEnding(); })));
    for (const q of [...data.quests].sort((x, y) => x.id.localeCompare(y.id))) {
      const info = questInfo(q.id), steps = questSteps(q.id, state, stepProgress), doneCount = steps.filter(Boolean).length;
      const row = el('section', {class: 'quest-row' + (a.tracked === q.id ? ' tracked' : '')});
      row.append(el('div', {class: 'quest-head'}, el('h3', {}, q.title), el('span', {class: 'quest-status ' + q.status}, ({completed: '완료', active: '진행 중', available: '받을 수 있음'})[q.status])), el('p', {class: 'quest-place'}, q.place + (steps.length ? `, ${doneCount}/${steps.length}단계` : '')));
      if (info) {
        row.append(el('p', {class: 'quest-goal'}, '배울 내용: ' + info.goal));
        const list = el('ol', {class: 'quest-steps'});
        info.steps.forEach((s, i) => list.append(el('li', {class: steps[i] ? 'done' : (i === steps.indexOf(false) ? 'now' : '')}, s)));
        const more = el('details', {class: 'quest-more'}, el('summary', {}, '단계 보기'), list);
        if (a.tracked === q.id) more.open = true;
        row.append(more);
      }
      row.append(button(a.tracked === q.id ? '추적 중' : '이 의뢰 추적', () => { a.tracked = q.id; save(); draw(); showQuests(false); window.dispatchEvent(new Event('adventure-tracked')); }));
      dialog.append(row);
    }
    dialog.append(el('h3', {class: 'side-head'}, '주민 부탁'));
    for (const [k, q] of Object.entries(SIDE_QUESTS)) {
      const done = !!state.story?.side?.[k], got = (a.storyItems || []).includes(q.item);
      dialog.append(el('section', {class: 'quest-row side'}, el('div', {class: 'quest-head'}, el('h3', {}, q.title), el('span', {class: 'quest-status ' + (done ? 'completed' : got ? 'active' : 'available')}, done ? '완료' : got ? '전해 주기' : '찾는 중')), el('p', {class: 'quest-place'}, `부탁한 사람: ${q.who}, ${done ? '해결했어요' : got ? '단서를 찾았어요. 주인에게 가져다주세요.' : '단서가 있는 곳: ' + q.where}`)));
    }
    if (fieldData?.zones) {
      dialog.append(el('h3', {class: 'side-head'}, '구역 현장 활동'));
      for (const [zid, q] of Object.entries(fieldData.zones)) {
        const fs = a.field?.[zid] || {}, who = extraData?.residents?.[zid]?.[q.giver]?.name || '주민', [n, m] = fieldProgress(q, fs);
        const [cls, label] = fs.done ? ['completed', '완료'] : fs.on ? ['active', `진행 중 ${n}/${m}`] : ['available', '받을 수 있음'];
        dialog.append(el('section', {class: 'quest-row side'}, el('div', {class: 'quest-head'}, el('h3', {}, q.title), el('span', {class: 'quest-status ' + cls}, label)), el('p', {class: 'quest-place'}, `${zoneTitles[zid] || zid} 마을, 맡긴 사람: ${who}`), ...(fs.on && !fs.done ? [el('p', {class: 'quest-goal'}, '힌트: ' + q.hint)] : [])));
      }
    }
    if (refetch) Promise.all([api('workshop-progress?runId=' + encodeURIComponent(state.runId)).catch(() => null), api('magnet-progress?runId=' + encodeURIComponent(state.runId)).catch(() => null)]).then(([g05, g06]) => { stepProgress = {g05, g06}; if (notebookOpen() && questTab === 'quests') showQuests(false); });
  }
  // 인벤토리: 탐험가 정보 창(public/hero.mjs)의 「소지품」. 위쪽 막대의 레벨 칸은 「상태」로 연다.
  const heroCtx = {el, button, state, save, uid, data: () => data, who: () => document.querySelector('#identity')?.textContent || '',
    counts: () => countDone(doneIds()), wearCounts: () => wearCounts(), tasksDone: () => tasksDone(),
    dex: () => api('dex?runId=' + encodeURIComponent(state.runId)), dexIds: () => (data?.dex || []).map((c) => c.id), dexTotal: () => data?.dexTotal || 0,
    repair: () => { const inHub = (state.travel?.map || 'hub') === 'hub' && document.querySelector('.atlas-hub'); if (inHub) window.dispatchEvent(new Event('open-repair')); else go('hub'); }};
  function showInventory(tab = 'bag', card = null) { if (dialog.open) dialog.close(); openHero(heroCtx, tab, {card}); }
  // 과학 도감: 새로 열린 카드는 한 번 알리고(이 기기 기준), 아직 펼쳐 보지 않은 카드가 있으면 인벤토리 단추에 점을 찍는다.
  // 의뢰 화면에서 방금 알린 카드(dex-got)는 다시 알리지 않는다.
  const toldKey = 'science-world:told-dex:' + (uid || '');
  const dexNote = el('span', {id: 'hud-dex-note', class: 'sr-only'});
  bar.append(dexNote);
  const told = () => { try { const v = JSON.parse(localStorage.getItem(toldKey) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch { return new Set(); } };
  const tell = (ids) => { try { localStorage.setItem(toldKey, JSON.stringify([...new Set([...told(), ...ids])].slice(-400))); } catch { /* 저장하지 못하면 다음에 한 번 더 알린다 */ } };
  function checkDex() {
    if (!data?.dex) return;
    const had = told(), fresh = data.dex.filter((c) => !had.has(c.id));
    if (fresh.length) {
      tell(fresh.map((c) => c.id));
      if (!had.size && fresh.length > 2) achieve('dex', `카드 ${fresh.length}장을 모았어요`, '과학 도감이 열렸어요');
      else if (fresh.length > 2) achieve('dex', `새 카드 ${fresh.length}장`, '과학 도감');
      else fresh.forEach((c) => achieve('dex', c.name, '도감에 새 카드'));
    }
    paintDexDot();
  }
  function paintDexDot() {
    const seen = dexSeen(uid), unseen = (data?.dex || []).filter((c) => !seen.has(c.id)).length;
    inventoryButton.classList.toggle('has-new', unseen > 0);
    // 단추 이름은 「인벤토리」 그대로 두고, 새 카드 수는 설명으로 붙인다
    dexNote.textContent = unseen ? `도감 새 카드 ${unseen}장` : '';
    inventoryButton.title = unseen ? `인벤토리, 도감 새 카드 ${unseen}장` : '인벤토리';
    if (unseen) inventoryButton.setAttribute('aria-describedby', dexNote.id); else inventoryButton.removeAttribute('aria-describedby');
  }
  const onDexGot = (e) => tell(e.detail?.ids || []);
  const onOpenDex = (e) => showInventory('dex', e.detail?.card || null);
  window.addEventListener('dex-got', onDexGot);
  window.addEventListener('dex-seen', paintDexDot);
  window.addEventListener('open-dex', onOpenDex);
  // 징표·레벨: 새로 얻은 것이 있으면 알림을 띄우고 저장한다
  function achieve(kind, title, sub) {
    sfx(kind === 'level' ? 'level' : 'item');
    const n = el('div', {class: 'achieve-toast ' + kind, role: 'status'}, el('small', {}, sub), el('strong', {}, title));
    document.body.append(n); const stack = document.querySelectorAll('.achieve-toast'); n.style.top = (90 + (stack.length - 1) * 74) + 'px';
    setTimeout(() => n.remove(), 4200);
  }
  // ---------------------------------------------------------------- 소품
  const doneIds = () => (data?.quests || []).filter((q) => q.status === 'completed').map((q) => q.id);
  // 소품 열림: 의뢰 해결 수와 지금 레벨
  const wearCounts = () => ({...countDone(doneIds()), level: data ? explore(state, data.quests, dexOf(data)).level : 0});
  function syncWear() {
    if (!data) return;
    const counts = wearCounts(), opened = WEAR.filter((w) => isOpen(w, counts)).map((w) => w.id);
    const clean = cleanWear(a.wear, counts), seen = new Set(a.seenWear || []), fresh = opened.filter((id) => !seen.has(id));
    let changed = JSON.stringify(clean) !== JSON.stringify(a.wear || {});
    a.wear = clean; setPlayerWear(clean);
    if (fresh.length) {
      achieve('wear', fresh.length === 1 ? WEAR.find((w) => w.id === fresh[0]).name : `소품 ${fresh.length}개`, '새 소품 획득');
      a.seenWear = opened; changed = true;
    }
    if (changed) save();
  }
  // ---------------------------------------------------------------- 지구 복구와 엔딩
  const REGION_TOTAL = {R1: 13, R2: 14, R3: 14, R4: 11, R5: 9}, CUSTOM_STEPS = {'R3-G04': 8, 'R3-G05': 7, 'R3-G06': 7, 'R3-G07': 10};
  const tasksDone = () => Object.values(state.missions || {}).reduce((n, m) => n + Object.keys(m?.done || {}).length, 0) + doneIds().reduce((n, id) => n + (CUSTOM_STEPS[id] || 0), 0);
  // 엔딩은 1~4단원 네 지구의 의뢰 52개로 연다. 푸른 생활 지구(학습보완 단원)는 마치지 않아도 엔딩이 열린다.
  const mainQuests = () => (data?.quests || []).filter((q) => /^R[1-4]-/.test(q.id));
  const allDone = () => !!data && mainQuests().length >= 52 && mainQuests().every((q) => q.status === 'completed');
  function checkRegions() {
    if (!data) return;
    const counts = countDone(doneIds()), had = new Set(a.regionsDone || []);
    const fresh = Object.keys(REGION_TOTAL).filter((r) => counts[r] >= REGION_TOTAL[r] && !had.has(r));
    if (fresh.length) { fresh.forEach((r) => achieve('region', `${REGION_NAME[r]} 복구 완료`, '지구 복구')); a.regionsDone = [...had, ...fresh]; save(); }
    if (allDone() && !a.ended) { a.ended = Date.now(); save(); setTimeout(() => { if (alive) openEnding(); }, 1500); }
  }
  function openEnding() {
    const counts = countDone(doneIds());
    const tasks = tasksDone();
    showEnding({el, button, who: document.querySelector('#identity')?.textContent || '', stats: {quests: counts.all, tasks, badges: (state.story?.badges || []).length, wear: WEAR.filter((w) => isOpen(w, wearCounts())).length, dex: (data?.dex || []).length, level: levelText.textContent, life: counts.R5 >= REGION_TOTAL.R5}});
  }
  window.addEventListener('show-ending', openEnding);
  // ---------------------------------------------------------------- 둘러보기(체험 계정)
  // 지도와 의뢰를 바로 연다. 의뢰 안에서는 「다음 과제 보기」로 풀지 않고 넘겨 볼 수 있다. 전력망 지구의 전용 실험실 네 곳은 그 구역 지도로 간다.
  const DEDICATED = new Set(['R3-G04', 'R3-G05', 'R3-G06', 'R3-G07']);
  async function showBrowse() {
    open('둘러보기');
    const note = el('p', {class: 'muted'}, '체험 계정은 지도와 의뢰를 바로 열어 볼 수 있어요. 의뢰 안에서는 「다음 과제 보기」로 풀지 않고 넘겨 볼 수 있어요. 학생 명부와 진행 통계에는 들어가지 않아요.');
    dialog.append(note);
    let regions = {};
    try { regions = await (await fetch('/regions.json')).json(); } catch { note.textContent = '지도 목록을 불러오지 못했어요. 다시 열어 주세요.'; return; }
    // 처음 이야기를 보기 전에 다른 곳으로 가면 첫 이야기는 본 것으로 두어, 문지기와 주민 활동이 막히지 않게 한다
    const jump = (map) => () => {
      if (state.story?.step !== 'done') { state.story = {...(state.story || {}), step: 'done', met: {comji: true, dalsae: true, elm: true}, map: true, chapters: state.story?.chapters || {}}; a.welcomed = true; }
      dialog.close(); go(map);
    };
    const maps = el('div', {class: 'browse-block'}, el('div', {class: 'browse-row'}, button('중앙 광장', jump('hub'))));
    const quests = el('div', {class: 'browse-block'});
    for (const [key, r] of Object.entries(regions)) {
      maps.append(el('h4', {}, r.title), el('div', {class: 'browse-row'}, button(r.title + ' 입구', jump(key), 'secondary'), ...r.zones.map((z) => button(z.title, jump(z.id), 'secondary'))));
      quests.append(el('h4', {}, r.title), el('div', {class: 'browse-row'}, ...r.zones.flatMap((z) => z.games.map((g) => button(g.title, jump(DEDICATED.has(g.id) ? z.id : 'mission:' + g.id), 'secondary')))));
    }
    dialog.append(el('h3', {}, '지도 바로 가기'), maps, el('h3', {}, '의뢰 바로 열기'), quests);
  }
  // ---------------------------------------------------------------- 조작 방법과 단축키
  const KEYS = [['Q', '퀘스트 수첩'], ['C', '탐험가 정보'], ['I', '인벤토리'], ['K', '과학 도감'], ['B', '게시판'], ['M', '목적지 안내'], ['H', '조작 방법']];
  function showControls() {
    open('조작 방법');
    dialog.append(el('ul', {class: 'controls-list'},
      el('li', {}, el('b', {}, '걷기'), ' 방향키 또는 W, A, S, D를 눌러요. 지도를 누르면 그곳까지 걸어가요.'),
      el('li', {}, el('b', {}, '달리기'), ' Shift를 누른 채로 걸어요.'),
      el('li', {}, el('b', {}, '말 걸기, 조사하기'), ' 가까이 가서 E 또는 Enter를 눌러요. 사람이나 장소 이름표를 눌러도 돼요.'),
      el('li', {}, el('b', {}, '대사 넘기기'), ' 「다음」 단추의 숫자가 다 지나가면 눌러요. 그동안 대사를 읽어 봐요.'),
      el('li', {}, el('b', {}, '창 닫기'), ' Esc를 누르거나 창 바깥을 눌러요.')),
      el('h3', {}, '단축키'), el('div', {class: 'controls-keys'}, ...KEYS.map(([k, label]) => el('span', {}, el('kbd', {}, k), ' ' + label))));
    try { localStorage.setItem('science-world:controls-seen', '1'); } catch { /* 저장하지 못하면 다음에 다시 보인다 */ }
  }
  // 단축키는 글자판 위치(e.code)로 받아 한글 입력 상태에서도 된다. 글을 쓰는 중, 다른 창이나 대화가 열려 있을 때는 쓰지 않는다.
  const onKey = (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
    if (document.querySelector('dialog[open]') || document.querySelector('.rpg-speech:not([hidden])')) return;
    const act = {KeyQ: () => showQuests(), KeyC: () => showInventory('status'), KeyI: () => showInventory(), KeyK: () => showInventory('dex'), KeyB: () => showBoard(), KeyM: () => route(), KeyH: () => showControls()}[e.code];
    if (act) { e.preventDefault(); act(); }
  };
  window.addEventListener('keydown', onKey);
  // 처음 한 번은 지도에 들어오면 조작 방법을 보여 준다
  let seenControls = false;
  try { seenControls = localStorage.getItem('science-world:controls-seen') === '1'; } catch { seenControls = true; }
  // 자동 시험 브라우저(navigator.webdriver)에서는 띄우지 않는다. 학생 화면에서는 처음 한 번 뜬다.
  const firstGuide = !seenControls && a.welcomed && !navigator.webdriver ? setTimeout(() => { if (alive && document.querySelector('main#app > .atlas') && !document.querySelector('dialog[open]') && !document.querySelector('.rpg-speech:not([hidden])')) showControls(); }, 1500) : 0;
  // ---------------------------------------------------------------- 소리 설정
  function showSound() {
    open('소리');
    const s = soundSettings();
    const row = (label, onKey, volKey) => {
      const on = el('input', {type: 'checkbox', id: 'snd-' + onKey}); on.checked = s[onKey];
      const vol = el('input', {type: 'range', min: '0', max: '1', step: '0.05', id: 'snd-' + volKey, 'aria-label': label + ' 크기'}); vol.value = String(s[volKey]);
      on.onchange = () => setSound({[onKey]: on.checked});
      vol.oninput = () => { setSound({[volKey]: Number(vol.value), [onKey]: true}); on.checked = true; };
      vol.onchange = () => sfx('ok');
      return el('div', {class: 'sound-row'}, el('label', {for: 'snd-' + onKey}, on, ' ' + label), vol);
    };
    dialog.append(row('배경음', 'music', 'musicVol'), row('효과음', 'sfx', 'sfxVol'), el('p', {class: 'muted'}, '이 기기에만 저장돼요. 교실에서는 이어폰을 쓰거나 배경음을 꺼 두면 좋아요.'));
  }
  function checkProgress() {
    if (!data || !state.story) return;
    const st = state.story, seen = new Set(st.badges || []), got = earnedBadges(state, data.quests, dexOf(data)), fresh = got.filter((id) => !seen.has(id));
    const lv = explore(state, data.quests, dexOf(data));
    let changed = false;
    if (fresh.length) { st.badges = [...seen, ...fresh]; changed = true; if (seen.size || fresh.length < 4) fresh.forEach((id) => achieve('badge', BADGES.find((b) => b.id === id).title, '징표 획득')); }
    if (!st.level) { st.level = lv.level; changed = true; }
    else if (lv.level > st.level) { st.level = lv.level; changed = true; achieve('level', `Lv.${lv.level} ${lv.title}`, '레벨 업.'); }
    if (changed) save();
    levelText.textContent = `Lv.${lv.level} ${lv.title}`; levelFill.style.width = Math.round(lv.into / lv.per * 100) + '%'; levelBox.title = `경험치 ${lv.into}/${lv.per} (전체 ${lv.exp})`;
  }
  function draw() {
    questsButton.disabled = !data;
    checkProgress();
    checkDex();
    syncWear();
    checkRegions();
    const solved = (id) => !!data?.quests.some((q) => q.id === id && q.status === 'completed');
    // 위쪽 막대의 복구율은 지금 추적 중인 의뢰의 지구를 보여 준다. 전력망 지구는 광장 안내판 복구를 한 칸으로 더한다.
    const rk = /^R\d-/.test(a.tracked || '') ? a.tracked.slice(0, 2) : 'R3', rq = (data?.quests || []).filter((x) => x.id.startsWith(rk + '-'));
    const done = rq.filter((x) => solved(x.id)).length + (rk === 'R3' && state.story?.repaired ? 1 : 0), total = rq.length + (rk === 'R3' ? 1 : 0);
    restore.textContent = `${REGION_NAME[rk]} 복구 ${total ? Math.round((100 * done) / total) : 0}%`; restore.title = `${REGION_NAME[rk]}를 얼마나 되살렸는지 보여 줘요`;
    if (!a.welcomed) { mission.textContent = '지금 할 일: ' + (state.story?.hint || '중앙 광장에서 신항이를 만나 보세요'); return; }
    const cur = data?.quests.find((q) => q.id === a.tracked);
    if (cur?.status === 'completed') {
      const list = [...data.quests].sort((x, y) => x.id.localeCompare(y.id)).filter((q) => q.status !== 'completed');
      const next = list.find((q) => q.id.slice(0, 3) === cur.id.slice(0, 3) && q.id > cur.id) || list.find((q) => q.id.slice(0, 3) === cur.id.slice(0, 3)) || list[0];
      if (next) { a.tracked = next.id; save(); setTimeout(() => window.dispatchEvent(new Event('adventure-tracked')), 0); }
    }
    const q = data?.quests.find((q) => q.id === a.tracked);
    mission.textContent = q ? '현재 의뢰: ' + q.title + ' → ' + q.place : data ? '의뢰를 골라 주세요' : '의뢰를 확인하고 있어요';
    const info = q && questInfo(q.id);
    if (info) { const s = questSteps(q.id, state, stepProgress), i = s.indexOf(false); mission.append(el('span', {class: 'mission-step'}, i >= 0 ? `${i + 1}/${s.length}단계: ${info.steps[i]}` : '모든 단계 완료')); }
  }
  async function refresh() {
    if (busy || !alive || pending() || stamp === state.sequence) return;
    busy = true;
    try {
      const seq = state.sequence; data = await api('adventure?runId=' + encodeURIComponent(state.runId));
      if (['R3-G05', 'R3-G06'].includes(a.tracked)) { const k = a.tracked === 'R3-G05' ? 'g05' : 'g06'; stepProgress[k] = await api((k === 'g05' ? 'workshop' : 'magnet') + '-progress?runId=' + encodeURIComponent(state.runId)).catch(() => stepProgress[k]); }
      if (!alive) return; stamp = seq; draw();
    }
    catch { if (alive) mission.textContent = '의뢰 기록 확인 중, 연결을 확인해 주세요'; }
    finally { busy = false; }
  }
  const redraw = () => draw();
  window.addEventListener('adventure-story', redraw);
  window.addEventListener('adventure-tracked', redraw);
  window.addEventListener('open-class-board', showBoard);
  const openWeekly = () => { loadWeekly(api).then((w) => { if (!alive) return; weekly = w; questTab = w.on ? 'weekly' : 'quests'; showQuests(false); }); };
  window.addEventListener('open-weekly', openWeekly);
  draw(); refresh(); loadMissions().then(() => { if (alive) draw(); });
  const timer = setInterval(refresh, 2500);
  const onVisible = () => { if (document.visibilityState === 'visible') checkBoard(); };
  document.addEventListener('visibilitychange', onVisible);
  checkBoard(); const boardTimer = setInterval(() => { if (!document.querySelector('dialog[open]')) checkBoard(); }, 90000);
  return () => { alive = false; clearInterval(timer); clearInterval(boardTimer); clearTimeout(firstGuide); window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('open-class-board', showBoard); window.removeEventListener('open-weekly', openWeekly); window.removeEventListener('dex-got', onDexGot); window.removeEventListener('dex-seen', paintDexDot); window.removeEventListener('open-dex', onOpenDex); window.removeEventListener('adventure-story', redraw); window.removeEventListener('adventure-tracked', redraw); window.removeEventListener('show-ending', openEnding); document.removeEventListener('fullscreenchange', syncFull); document.removeEventListener('webkitfullscreenchange', syncFull); head?.append(...headItems); document.body.classList.remove('game-view'); dialog.remove(); questChip.remove(); bar.remove(); };
}
