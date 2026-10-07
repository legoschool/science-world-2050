// 탐험가 정보 창: 상태(캐릭터와 착용 소품, 레벨, 단원별 탐구 능력, 탐험 기록, 다음 목표), 소지품(도구, 부품, 단서, 기록), 과학 도감, 소품, 징표.
// 지도 왼쪽 위의 「가방」(이 지역 자료 등)과 헷갈리지 않게 물건 칸 이름은 「소지품」이다.
// 숫자는 모두 학생 저장 상태와 서버의 의뢰 완료 기록에서 계산한다. 틀린 횟수나 힌트 사용으로 깎이는 능력치는 두지 않는다.
// 위쪽 막대의 레벨 칸(C 키)은 「상태」로, 「인벤토리」(I 키)는 「소지품」으로 연다.
import {STORY_ITEMS, REPAIR} from './npcs.mjs';
import {itemIcon} from './item-icons.mjs';
import {BADGES, earnedBadges, explore, fieldDone, dexOf} from './progress.mjs';
import {WEAR, SLOTS, isOpen, dressSheet, drawPet} from './wardrobe.mjs';
import {getAvatarSheet, playerAvatar, drawFrame, setPlayerWear} from './sprites.mjs';
import {renderDex, dexSeen} from './codex.mjs';

const REGIONS = [
  {id: 'R1', key: 'farm', name: '햇살 농장 지구', unit: '계절의 변화', color: '#7fd36a', total: 13, fields: 4},
  {id: 'R2', key: 'fire', name: '불꽃 에너지 지구', unit: '물질의 연소', color: '#ff9a4a', total: 14, fields: 4},
  {id: 'R3', key: 'power', name: '전력망 지구', unit: '전기의 이용', color: '#ffd34d', total: 14, fields: 4},
  {id: 'R4', key: 'future', name: '미래 연구 본부', unit: '과학과 나의 진로', color: '#b49bff', total: 11, fields: 4},
  {id: 'R5', key: 'life', name: '푸른 생활 지구', unit: '우리 몸, 빛, 자원과 에너지', color: '#4fc7b0', total: 9, fields: 3},
];
const ALL_GAMES = REGIONS.reduce((n, r) => n + r.total, 0), ALL_FIELDS = REGIONS.reduce((n, r) => n + r.fields, 0);
const RANKS = ['시작 전', '새싹 탐구자', '꼬마 연구원', '연구원', '선임 연구원', '박사'];
const KIND_COLOR = {도구: '#8fb3d9', 부품: '#7fd36a', 단서: '#c9a2ff', 기록: '#f0c75e'};
const TABS = [['status', '상태'], ['bag', '소지품'], ['dex', '도감'], ['wear', '소품'], ['badge', '징표']];
const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ctx: {el, button, state, data(), save, uid, who, counts(), wearCounts(), tasksDone(), repair(), dex(), dexIds()}
// opts.card: 「도감」 칸을 열 때 먼저 보여 줄 카드
export function openHero(ctx, tab = 'status', opts = {}) {
  const {el, button, state} = ctx, a = state.adventure, story = state.story || {};
  document.querySelector('dialog.hero-dialog')?.close();
  const dialog = el('dialog', {class: 'hero-dialog', 'aria-label': '탐험가 정보'});
  const body = el('div', {class: 'hero-body'});
  const tabs = el('div', {class: 'hero-tabs', role: 'tablist'});
  let raf = 0, bagKind = '전체', picked = null, dexData = null;
  const dexView = {region: null, pick: opts.card || null}, dexTabNote = el('span', {id: 'hero-dex-note', class: 'sr-only'});
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  for (const [k, label] of TABS) {
    const b = button(label, () => show(k), 'hero-tab');
    b.setAttribute('role', 'tab'); b.dataset.tab = k;
    tabs.append(b);
  }
  paintDexTab();
  dialog.append(el('div', {class: 'hero-head'}, el('h2', {}, '탐험가 정보'), tabs, button('닫기', () => dialog.close(), 'hero-close'), dexTabNote), body);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { stop(); dialog.remove(); }, {once: true});
  document.body.append(dialog);
  dialog.showModal();
  show(tab);
  tabs.querySelector(`[data-tab="${tab}"]`)?.focus(); // 처음 초점은 고른 칸에(첫 단추에 가면 다른 칸이 골라진 것처럼 보인다)
  return {show, close: () => dialog.close()};

  function show(k) {
    stop();
    for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.tab === k));
    if (document.activeElement?.classList.contains('hero-tab')) tabs.querySelector(`[data-tab="${k}"]`)?.focus(); // 초점이 다른 칸 단추에 남지 않게
    body.replaceChildren();
    ({status, bag, dex, wear: wardrobe, badge: badges})[k]();
    body.scrollTop = 0;
  }

  // ---------------------------------------------------------------- 캐릭터 그림
  function avatarCanvas(w = 128, h = 100) {
    const cv = el('canvas', {width: w, height: h, class: 'hero-avatar', role: 'img', 'aria-label': '지금 내 모습'});
    const x = cv.getContext('2d');
    const paint = (t) => {
      x.clearRect(0, 0, w, h); x.imageSmoothingEnabled = false;
      drawFrame(x, getAvatarSheet(playerAvatar()), w / 2 - 16, h - 8, {dir: 'down', t});
      if (a.wear?.pet) drawPet(x, a.wear.pet, w / 2 + 34, h - 10, t, 'left');
    };
    const loop = (now) => { paint(now / 1000); raf = requestAnimationFrame(loop); };
    if (reduce) paint(0); else raf = requestAnimationFrame(loop);
    return cv;
  }
  function wearIcon(w, locked) {
    const c = el('canvas', {width: 64, height: 64, 'aria-hidden': 'true'}), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    if (locked) x.filter = 'grayscale(1) brightness(1.6) contrast(0.7)'; // 어두운 창 바탕에서도 잠긴 모양이 보이게 밝은 회색으로
    if (w.slot === 'pet') drawPet(x, w.id, 32, 52, 0.2, 'right');
    else { const sheet = dressSheet(getAvatarSheet({...playerAvatar()}), {[w.slot]: w.id}); x.translate(32, 0); x.scale(0.78, 0.78); drawFrame(x, sheet, 0, w.slot === 'back' ? 80 : 92, {dir: w.slot === 'back' ? 'up' : 'down'}); }
    return c;
  }

  // ---------------------------------------------------------------- 상태
  function status() {
    const data = ctx.data(), lv = explore(state, data?.quests || [], dexOf(data)), counts = ctx.counts(), wc = ctx.wearCounts();
    const got = new Set(earnedBadges(state, data?.quests || [], dexOf(data))), wearOpen = WEAR.filter((w) => isOpen(w, wc)).length;
    // 왼쪽: 캐릭터 카드와 착용 칸
    const slots = el('div', {class: 'hero-slots'});
    for (const [slot, label] of SLOTS) {
      const w = WEAR.find((v) => v.id === a.wear?.[slot]);
      const b = button('', () => show('wear'), 'hero-slot' + (w ? ' on' : ''));
      b.append(w ? wearIcon(w) : el('span', {class: 'hero-slot-empty', 'aria-hidden': 'true'}, '+'), el('small', {}, label), el('b', {}, w ? w.name : '비어 있음'));
      b.setAttribute('aria-label', `${label}: ${w ? w.name : '비어 있음'}, 소품 바꾸기`);
      slots.append(b);
    }
    const xp = el('div', {class: 'hero-xp'}, el('i'));
    xp.firstChild.style.width = Math.round((lv.into / lv.per) * 100) + '%';
    const card = el('section', {class: 'hero-card'},
      el('div', {class: 'hero-stage'}, avatarCanvas()),
      el('p', {class: 'hero-name'}, ctx.who() || '탐험가'),
      el('div', {class: 'hero-level'}, el('span', {class: 'hero-lv'}, 'Lv.' + lv.level), el('strong', {}, lv.title)),
      xp, el('p', {class: 'hero-xp-text'}, `경험치 ${lv.into} / ${lv.per}, 다음 레벨까지 ${lv.per - lv.into}`),
      slots);
    const recent = (story.badges || []).slice(-6).reverse().map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
    if (recent.length) card.append(el('h3', {class: 'hero-card-sub'}, '최근 받은 징표'), el('div', {class: 'hero-medals'}, ...recent.map((b) => el('span', {class: 'hero-medal ' + b.color, title: b.title}, el('i', {'aria-hidden': 'true'}, b.title.slice(0, 1)), el('small', {}, b.title)))));
    // 오른쪽: 탐구 능력
    const stats = el('section', {class: 'hero-panel'}, el('h3', {}, '탐구 능력'));
    for (const r of REGIONS) {
      const solved = counts[r.id] || 0, fields = Object.entries(a.field || {}).filter(([z, v]) => v?.done && z.startsWith(r.key + '-')).length, duel = (a.duels || []).includes(r.id);
      const frac = (solved + fields) / (r.total + r.fields), stars = solved + fields ? Math.max(1, Math.min(5, Math.floor(frac * 5 + 1e-9))) : 0;
      const bar = el('span', {class: 'hero-bar'}, el('i'));
      bar.firstChild.style.width = Math.round(frac * 100) + '%'; bar.firstChild.style.background = r.color;
      const starBox = el('span', {class: 'hero-stars', role: 'img', 'aria-label': `별 5개 중 ${stars}개`}, '★'.repeat(stars), el('span', {class: 'dim'}, '★'.repeat(5 - stars)));
      starBox.style.color = r.color;
      stats.append(el('div', {class: 'hero-stat'},
        el('div', {class: 'hero-stat-top'}, el('strong', {}, r.unit), starBox, el('span', {class: 'hero-rank'}, RANKS[stars])),
        bar,
        el('small', {}, `${r.name}: 의뢰 ${solved}/${r.total}, 현장 활동 ${fields}/${r.fields}`, duel ? el('span', {class: 'hero-chip'}, '척척 수리') : '')));
    }
    // 탐험 기록
    const tiles = [['해결한 의뢰', `${counts.all || 0}`, '/' + ALL_GAMES], ['푼 과제', `${ctx.tasksDone()}`, ''], ['현장 활동', `${fieldDone(a)}`, '/' + ALL_FIELDS], ['척척 대결', `${(a.duels || []).length}`, '/' + REGIONS.length], ['도감 카드', `${(ctx.dexIds?.() || []).length}`, `/${ctx.dexTotal?.() || 0}`], ['모은 징표', `${got.size}`, `/${BADGES.length}`], ['열린 소품', `${wearOpen}`, `/${WEAR.length}`]];
    const record = el('section', {class: 'hero-panel'}, el('h3', {}, '탐험 기록'), el('div', {class: 'hero-tiles'}, ...tiles.map(([k, v, of]) => el('div', {class: 'hero-tile'}, el('b', {}, v, el('small', {}, of)), el('span', {}, k)))));
    // 다음 목표
    const goals = el('ul', {class: 'hero-goals'});
    goals.append(el('li', {}, el('span', {class: 'hero-goal-k'}, '레벨'), `Lv.${lv.level + 1}까지 경험치 ${lv.per - lv.into}`));
    const nextWear = WEAR.find((w) => !isOpen(w, wc));
    if (nextWear) goals.append(el('li', {}, el('span', {class: 'hero-goal-k'}, '소품'), `${nextWear.name}: ${nextWear.how} (지금 Lv.${lv.level}, 해결 ${Math.min(wc[nextWear.key] || 0, nextWear.need)}/${nextWear.need})`));
    const nextBadge = BADGES.find((b) => !got.has(b.id));
    if (nextBadge) goals.append(el('li', {}, el('span', {class: 'hero-goal-k'}, '징표'), `${nextBadge.title}: ${nextBadge.how}`));
    body.append(el('div', {class: 'hero-status'}, card, el('div', {class: 'hero-side'}, stats, record, el('section', {class: 'hero-panel'}, el('h3', {}, '다음 목표'), goals))));
  }

  // ---------------------------------------------------------------- 가방
  function bag() {
    const data = ctx.data(), used = new Set(story.used || []);
    const records = (data?.items || [{id: 'notebook', title: '탐구 수첩', description: '발견한 것과 실험 기록을 모아 두는 수첩.', source: '중앙 광장'}])
      .map((i) => ({...i, kind: i.id === 'notebook' ? '도구' : '기록', icon: i.id === 'notebook' ? 'notebook' : 'record', region: REGIONS.find((r) => String(i.id).startsWith(r.id + '-'))}));
    const items = [...(a.storyItems || []).map((id) => STORY_ITEMS[id]).filter(Boolean).map((i) => ({...i, icon: i.id})), ...records];
    const seenKey = 'science-world:seen-items:' + (ctx.uid || ''), seen = new Set(readList(seenKey));
    const kinds = ['전체', '도구', '부품', '단서', '기록'];
    const chips = el('div', {class: 'hero-kinds', role: 'group', 'aria-label': '물건 종류'});
    for (const k of kinds) {
      const n = k === '전체' ? items.length : items.filter((i) => i.kind === k).length;
      const b = button('', () => { bagKind = k; picked = null; show('bag'); }, 'hero-kind' + (bagKind === k ? ' on' : ''));
      b.append(k, el('small', {}, String(n))); b.setAttribute('aria-pressed', String(bagKind === k));
      chips.append(b);
    }
    const shown = items.filter((i) => bagKind === '전체' || i.kind === bagKind);
    if (!picked || !shown.includes(picked)) picked = shown[0] || null;
    const detail = el('aside', {class: 'hero-detail', 'aria-live': 'polite'});
    const paintDetail = (it) => {
      if (!it) { detail.replaceChildren(el('p', {class: 'hero-muted'}, '이 칸에는 아직 물건이 없어요.')); return; }
      const color = it.region?.color || KIND_COLOR[it.kind] || '#c9d4e2';
      const icon = el('div', {class: 'hero-detail-icon'}, itemIcon(it.icon, 72)); icon.style.borderColor = color;
      const chip = el('span', {class: 'hero-chip'}, it.region ? `${it.kind}, ${it.region.name}` : it.kind); chip.style.borderColor = color; chip.style.color = color;
      detail.replaceChildren(icon, el('h3', {}, it.title), chip, used.has(it.id) ? el('span', {class: 'hero-chip used'}, '사용함') : '', el('p', {}, it.description || ''), it.source ? el('p', {class: 'hero-muted'}, '얻은 곳: ' + it.source) : '');
    };
    const grid = el('div', {class: 'hero-grid', role: 'listbox', 'aria-label': '소지품'});
    const cells = [];
    for (const it of shown) {
      const color = it.region?.color || KIND_COLOR[it.kind] || '#c9d4e2';
      const b = button('', () => { picked = it; cells.forEach((c) => c.setAttribute('aria-selected', String(c === b))); paintDetail(it); }, 'hero-cell' + (used.has(it.id) ? ' used' : ''));
      b.style.setProperty('--slot', color);
      b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(it === picked)); b.setAttribute('aria-label', it.title + (used.has(it.id) ? ' (사용함)' : ''));
      b.append(itemIcon(it.icon, 40));
      if (!seen.has(it.id)) b.append(el('span', {class: 'hero-new', 'aria-hidden': 'true'}, '새로'));
      b.addEventListener('focus', () => paintDetail(it));
      cells.push(b); grid.append(b);
    }
    const slotsN = Math.max(24, Math.ceil(shown.length / 8) * 8);
    for (let i = shown.length; i < slotsN; i++) grid.append(el('div', {class: 'hero-cell empty', 'aria-hidden': 'true'}));
    paintDetail(picked);
    writeList(seenKey, [...new Set([...seen, ...items.map((i) => i.id)])]);
    // 아직 끝내지 않은 조립(광장 안내판)
    let repair = '';
    if (!story.repaired) {
      const owned = (id) => (a.storyItems || []).includes(id), missing = REPAIR.needs.filter((id) => !owned(id));
      repair = el('section', {class: 'hero-repair'}, el('strong', {}, '조립할 것: 광장 안내판'),
        el('div', {class: 'hero-repair-parts'}, ...REPAIR.needs.map((id) => el('span', {class: 'hero-part' + (owned(id) ? ' ok' : ''), title: STORY_ITEMS[id].title}, itemIcon(id, 28)))),
        el('small', {}, missing.length ? `다음 부품: ${STORY_ITEMS[missing[0]].title} (${REPAIR.where[missing[0]]})` : '부품을 모두 모았어요.'),
        missing.length ? '' : button('회로 조립하기', () => { dialog.close(); ctx.repair(); }));
    }
    body.append(repair, chips, el('div', {class: 'hero-bag'}, grid, detail));
  }

  // ---------------------------------------------------------------- 과학 도감
  function dex() {
    const box = el('div', {class: 'codex'});
    body.append(box);
    const paint = () => { const r = renderDex({el, button, box, data: dexData, uid: ctx.uid, view: dexView, onChange: paint}); paintDexTab(); return r; };
    if (dexData) { paint(); return; }
    box.append(el('p', {class: 'hero-muted codex-loading'}, '도감을 펼치는 중이에요.'));
    ctx.dex().then((d) => { dexData = d; if (box.isConnected) paint(); })
      .catch(() => { if (box.isConnected) box.replaceChildren(el('p', {class: 'hero-muted'}, '도감을 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.')); });
  }
  // 「도감」 칸 단추에 아직 펼쳐 보지 않은 새 카드 수를 붙인다
  function paintDexTab() {
    const b = tabs.querySelector('[data-tab="dex"]'); if (!b) return;
    const seen = dexSeen(ctx.uid), fresh = (ctx.dexIds?.() || []).filter((id) => !seen.has(id)).length;
    b.querySelector('.hero-tab-new')?.remove();
    if (fresh) b.append(el('span', {class: 'hero-tab-new', 'aria-hidden': 'true'}, String(fresh)));
    dexTabNote.textContent = fresh ? `새 카드 ${fresh}장` : ''; // 칸 이름은 「도감」 그대로 두고 새 카드 수는 설명으로 붙인다
    if (fresh) b.setAttribute('aria-describedby', dexTabNote.id); else b.removeAttribute('aria-describedby');
  }

  // ---------------------------------------------------------------- 소품
  function wardrobe() {
    const counts = ctx.wearCounts(), wear = a.wear || {}, openN = WEAR.filter((w) => isOpen(w, counts)).length;
    body.append(el('div', {class: 'wear-head hero-panel'}, el('div', {class: 'hero-stage small'}, avatarCanvas()), el('div', {}, el('strong', {}, `열린 소품 ${openN} / ${WEAR.length}`), el('p', {class: 'hero-muted'}, '의뢰를 해결하거나 레벨이 오르면 모자, 등 소품, 따라다니는 동료가 열려요. 착용한 모습은 지도와 대화창에 바로 보여요.'))));
    for (const [slot, label] of SLOTS) {
      const grid = el('div', {class: 'wear-grid'});
      for (const w of WEAR.filter((v) => v.slot === slot)) {
        const ok = isOpen(w, counts), on = wear[slot] === w.id, have = Math.min(counts[w.key] || 0, w.need);
        const act = ok ? button(on ? '벗기' : '착용하기', () => { a.wear = {...(a.wear || {})}; if (on) delete a.wear[slot]; else a.wear[slot] = w.id; setPlayerWear(a.wear); ctx.save(); show('wear'); }, on ? 'secondary' : '') : button('아직 잠김', () => {}, 'secondary');
        if (!ok) act.disabled = true;
        act.setAttribute('aria-label', (ok ? (on ? '벗기: ' : '착용하기: ') : '잠김: ') + w.name);
        grid.append(el('div', {class: 'wear-card' + (on ? ' on' : '') + (ok ? '' : ' locked')}, wearIcon(w, !ok), el('strong', {}, w.name), el('small', {}, on ? '착용 중' : ok ? '열림' : `${w.how} (지금 ${have}/${w.need})`), act));
      }
      body.append(el('h3', {class: 'wear-slot'}, label), grid);
    }
  }

  // ---------------------------------------------------------------- 징표
  function badges() {
    const got = new Set(earnedBadges(state, ctx.data()?.quests || [], dexOf(ctx.data())));
    const box = el('div', {class: 'badge-grid hero-badges'});
    for (const b of BADGES) box.append(el('div', {class: 'badge-card ' + b.color + (got.has(b.id) ? ' got' : '')}, el('span', {class: 'badge-medal', 'aria-hidden': 'true'}, b.title.slice(0, 1)), el('strong', {}, b.title), el('small', {}, got.has(b.id) ? '획득' : b.how)));
    body.append(el('p', {class: 'hero-muted'}, `모은 징표 ${got.size} / ${BADGES.length}`), box);
  }
}

function readList(key) { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function writeList(key, list) { try { localStorage.setItem(key, JSON.stringify(list.slice(-200))); } catch { /* 저장하지 못하면 다음에도 새로 표시가 남는다 */ } }
