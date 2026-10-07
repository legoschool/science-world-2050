// 과학 도감: 탐험가 정보 창의 「도감」 칸. 의뢰에서 만난 개념, 실험 도구, 현상, 직업 카드를 지구별로 모은다.
// 카드 내용은 서버(/api/dex)가 열린 카드만 보내 준다. 열리지 않은 카드는 그림자와 만날 곳만 보인다.
// 「새로」 표시는 이 기기에서 그 지구 쪽을 처음 펼쳤을 때까지 남는다.
import {dexIcon} from './dex-icons.mjs';

export const DEX_REGIONS = [
  {id: 'R1', name: '햇살 농장 지구', short: '햇살 농장', color: '#7fd36a'},
  {id: 'R2', name: '불꽃 에너지 지구', short: '불꽃 에너지', color: '#ff9a4a'},
  {id: 'R3', name: '전력망 지구', short: '전력망', color: '#ffd34d'},
  {id: 'R4', name: '미래 연구 본부', short: '미래 연구', color: '#b49bff'},
  {id: 'R5', name: '푸른 생활 지구', short: '푸른 생활', color: '#4fc7b0'},
];
export const KIND_COLOR = {concept: '#8fd3ff', tool: '#9fc0e6', part: '#ffd34d', matter: '#8fe07a', phenom: '#ffb36b', life: '#5fd38a', tech: '#f3a6e8', job: '#c9a2ff', method: '#f0c75e', safety: '#ff8a7a'};

const seenKey = (uid) => 'science-world:seen-dex:' + (uid || '');
export const dexSeen = (uid) => new Set(readList(seenKey(uid)));
export function markDexSeen(uid, ids) {
  const had = readList(seenKey(uid)), add = ids.filter((id) => !had.includes(id));
  if (!add.length) return;
  writeList(seenKey(uid), [...had, ...add]);
  window.dispatchEvent(new Event('dex-seen'));
}
const no = (n) => 'No.' + String(n).padStart(3, '0');

// view: {region, pick, fresh} 창을 닫기 전까지 유지하는 펼친 쪽과 고른 카드
export function renderDex({el, button, box, data, uid, view, onChange}) {
  const cards = data.cards, seen = dexSeen(uid), kinds = data.kinds || {};
  const regionOf = (id) => cards.find((c) => c.id === id)?.region;
  if (view.pick && !view.region) view.region = regionOf(view.pick);
  if (!view.region) view.region = (cards.find((c) => c.got && !seen.has(c.id)) || cards.find((c) => !c.got) || cards[0]).region;
  const list = cards.filter((c) => c.region === view.region);
  if (view.freshFor !== view.region) { view.fresh = new Set(list.filter((c) => c.got && !seen.has(c.id)).map((c) => c.id)); view.freshFor = view.region; }
  let picked = list.find((c) => c.id === view.pick) || list.find((c) => view.fresh.has(c.id)) || list.find((c) => c.got) || list[0];
  const region = DEX_REGIONS.find((r) => r.id === view.region), rs = data.regions[view.region] || {got: 0, total: list.length};

  // 위쪽: 모은 수와 지구 쪽
  const bar = el('span', {class: 'codex-bar'}, el('i'));
  bar.firstChild.style.width = Math.round((data.got / Math.max(1, data.total)) * 100) + '%';
  const head = el('div', {class: 'codex-head'}, el('div', {class: 'codex-total'}, el('strong', {}, `모은 카드 ${data.got}`, el('small', {}, ` / ${data.total}`)), bar));
  const tabs = el('div', {class: 'codex-regions', role: 'group', 'aria-label': '지구별 도감'});
  for (const r of DEX_REGIONS) {
    const st = data.regions[r.id] || {got: 0, total: 0}, on = r.id === view.region;
    const fresh = cards.some((c) => c.region === r.id && c.got && !seen.has(c.id) && !(on && view.fresh.has(c.id)));
    const b = button('', () => { view.region = r.id; view.pick = null; onChange(); }, 'codex-region' + (on ? ' on' : '') + (st.total && st.got === st.total ? ' done' : ''));
    b.style.setProperty('--region', r.color);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', `${r.name}, ${st.total}장 가운데 ${st.got}장` + (fresh ? ', 새 카드 있음' : ''));
    b.append(el('span', {class: 'codex-region-name'}, r.short), el('small', {}, `${st.got}/${st.total}`));
    if (fresh) b.append(el('i', {class: 'codex-dot', 'aria-hidden': 'true'}));
    tabs.append(b);
  }
  head.append(tabs);

  // 가운데: 카드 격자, 오른쪽: 고른 카드
  const detail = el('aside', {class: 'codex-detail', 'aria-live': 'polite'});
  detail.style.setProperty('--region', region.color);
  const grid = el('div', {class: 'codex-grid', role: 'listbox', 'aria-label': region.name + ' 카드'});
  grid.style.setProperty('--region', region.color);
  const cells = [];
  const select = (c, b) => { picked = c; view.pick = c.id; cells.forEach((x) => x.setAttribute('aria-selected', String(x === b))); paintDetail(c); };
  for (const c of list) {
    const b = button('', () => select(c, b), 'codex-card' + (c.got ? ' got' : ' locked') + (c.key ? ' key' : '') + (c.bonus ? ' bonus' : ''));
    b.dataset.card = c.id;
    b.style.setProperty('--kind', KIND_COLOR[c.kind] || '#8ea2c9');
    b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(c === picked));
    b.setAttribute('aria-label', `${no(c.no)} ` + (c.got ? `${c.name}, ${kinds[c.kind] || ''}` : c.bonus ? '아직 만나지 못한 숨은 카드' : '아직 만나지 못한 카드'));
    b.append(el('small', {class: 'codex-no'}, no(c.no)), el('span', {class: 'codex-pic'}, dexIcon(c.id, 48, !c.got)), el('b', {class: 'codex-name'}, c.got ? c.name : c.bonus ? '숨은 카드' : '???'));
    if (c.got && c.key) b.append(el('span', {class: 'codex-star', 'aria-hidden': 'true'}, '★'));
    if (view.fresh.has(c.id)) b.append(el('span', {class: 'hero-new', 'aria-hidden': 'true'}, '새로'));
    b.addEventListener('focus', () => { if (picked !== c) select(c, b); });
    cells.push(b); grid.append(b);
  }
  // 방향키로 카드 사이를 옮겨 다닌다(위아래는 한 줄의 카드 수만큼)
  grid.addEventListener('keydown', (e) => {
    const i = cells.indexOf(document.activeElement);
    if (i < 0) return;
    const cols = Math.max(1, cells.filter((x) => x.offsetTop === cells[0].offsetTop).length);
    const to = {ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols, Home: 0, End: cells.length - 1}[e.key];
    if (to === undefined) return;
    e.preventDefault();
    cells[Math.max(0, Math.min(cells.length - 1, to))].focus();
  });
  const done = rs.total && rs.got === rs.total;
  const gridBox = el('div', {class: 'codex-pages'}, el('div', {class: 'codex-page-head'}, el('strong', {}, region.name), el('small', {}, `${rs.total}장 가운데 ${rs.got}장`), done ? el('span', {class: 'codex-stamp'}, '도감 완성') : ''), grid);
  paintDetail(picked);
  box.style.setProperty('--region', region.color);
  box.replaceChildren(head, el('div', {class: 'codex-body'}, gridBox, detail));
  markDexSeen(uid, list.filter((c) => c.got).map((c) => c.id));
  return {focusCard: (id) => cells.find((x) => x.dataset.card === id)?.focus()};

  function paintDetail(c) {
    if (!c) { detail.replaceChildren(el('p', {class: 'hero-muted'}, '이 지구에는 아직 카드가 없어요.')); return; }
    const pic = el('div', {class: 'codex-detail-pic' + (c.got ? '' : ' locked') + (c.key && c.got ? ' key' : '')}, dexIcon(c.id, 96, !c.got));
    const top = el('div', {class: 'codex-detail-top'}, el('small', {class: 'codex-no'}, no(c.no)), el('small', {class: 'codex-detail-region'}, region.name));
    if (!c.got) {
      const where = c.where || {};
      detail.replaceChildren(top, pic, el('h3', {}, c.bonus ? '숨은 카드' : '아직 만나지 못한 카드'),
        el('p', {}, c.bonus ? `「${where.title}」 의뢰의 더 해보기 과제에서 만날 수 있어요.` : `「${where.title}」 의뢰에서 만날 수 있어요.`),
        where.place ? el('p', {class: 'codex-where'}, el('span', {}, '만날 곳'), where.place) : '');
      return;
    }
    const chips = el('div', {class: 'codex-chips'});
    const kind = el('span', {class: 'codex-chip'}, kinds[c.kind] || ''); kind.style.setProperty('--chip', KIND_COLOR[c.kind] || '#8ea2c9'); chips.append(kind);
    if (c.key) chips.append(el('span', {class: 'codex-chip key'}, '핵심 낱말'));
    if (c.bonus) chips.append(el('span', {class: 'codex-chip bonus'}, '숨은 카드'));
    const nodes = [top, pic, el('h3', {}, c.name), chips, el('p', {class: 'codex-text'}, c.text)];
    if (c.note) nodes.push(el('div', {class: 'codex-note'}, el('strong', {}, '탐구 노트'), el('p', {}, c.note)));
    if (c.where) nodes.push(el('p', {class: 'codex-where'}, el('span', {}, '만난 곳'), `${c.where.title} (${c.where.place})`));
    const see = (c.see || []).map((id) => cards.find((x) => x.id === id)).filter(Boolean);
    if (see.length) {
      const row = el('div', {class: 'codex-see'}, el('span', {}, '함께 보면 좋은 카드'));
      for (const s of see) {
        const b = button('', () => { view.region = s.region; view.pick = s.id; const r = onChange(); r?.focusCard?.(s.id); }, 'codex-see-card' + (s.got ? '' : ' locked'));
        b.append(dexIcon(s.id, 24, !s.got), s.got ? s.name : '???');
        b.setAttribute('aria-label', s.got ? `${s.name} 카드 보기` : '아직 만나지 못한 카드 보기');
        row.append(b);
      }
      nodes.push(row);
    }
    detail.replaceChildren(...nodes);
  }
}

// 의뢰 화면에서 쓰는 작은 카드 줄: 방금 얻은 카드나 이 의뢰에서 모은 카드
export function dexStrip(el, button, cards, label, onOpen) {
  const row = el('div', {class: 'm-dex'}, el('strong', {}, label));
  for (const c of cards) row.append(el('span', {class: 'm-dex-card' + (c.key ? ' key' : '')}, dexIcon(c.id, 32), c.name));
  if (onOpen) row.append(button('도감에서 보기', () => onOpen(cards[0].id), 'secondary m-dex-open'));
  return row;
}

function readList(key) { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function writeList(key, list) { try { localStorage.setItem(key, JSON.stringify(list.slice(-400))); } catch { /* 저장하지 못하면 다음에도 새로 표시가 남는다 */ } }
