// 계절 카드 기억 놀이 (텃밭 창고의 계절 카드, 과학 13쪽 놀이 방법).
// 계절마다 여섯 장씩 카드 24장을 뒤집어 놓고 두 장씩 뒤집는다(계절마다 짝수라 모두 가져갈 수 있다). 그림은 달라도 같은 계절이면 가져가고, 다른 계절이면 다시 뒤집는다.
// 판단이 틀리면 두 카드의 계절을 알려 주고 다시 뒤집는다. 신항이 차례에 뒤집은 카드도 잠깐 보인다.
const SEASON = {spring: '봄', summer: '여름', autumn: '가을', winter: '겨울'};
const j = (w, withB, noB) => { const code = w.charCodeAt(w.length - 1) - 0xac00; return w + (code >= 0 && code < 11172 && code % 28 ? withB : noB); };

export function memoryGame({el, button, mission, memory = {}, onAction}) {
  const pool = mission.memory || [];
  const deck = ['spring', 'summer', 'autumn', 'winter'].flatMap((s) => pool.filter((c) => c.season === s).slice(0, 6));
  const fresh = !(memory.order && memory.order.length === deck.length);
  if (fresh) { memory.taken = []; memory.judged = 0; memory.right = 0; }
  const order = fresh ? shuffle(deck.map((_, i) => i)) : memory.order;
  memory.order = order;
  const taken = new Set(memory.taken || []);
  let open = [], busy = false, judged = memory.judged || 0, right = memory.right || 0, peek = new Set();
  const grid = el('div', {class: 'mem-grid', role: 'group', 'aria-label': '뒤집어 놓은 계절 카드'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const ctrl = el('div', {class: 'signal-tray'});
  const score = el('span', {class: 'mem-score'});
  const node = el('div', {class: 'dex mem'}, el('div', {class: 'dex-head'}, el('strong', {}, '계절 카드 기억 놀이'), el('span', {}, '두 장을 뒤집고, 같은 계절이면 가져가요.'), score), grid, ctrl, status);
  function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  const card = (pos) => deck[order[pos]];
  function paint() {
    grid.replaceChildren(...order.map((_, pos) => {
      const c = card(pos), shown = open.includes(pos) || peek.has(pos), gone = taken.has(pos);
      const b = button('', () => flip(pos), 'mem-card' + (shown ? ' up' : '') + (gone ? ' gone' : ''));
      b.disabled = gone || busy || open.includes(pos) || open.length >= 2;
      b.setAttribute('aria-label', gone ? '가져간 카드' : shown ? `${c.label} 카드` : `${pos + 1}번 카드, 뒤집혀 있음`);
      if (shown && !gone) b.append(el('img', {src: c.img, alt: ''}), el('span', {}, c.label));
      return b;
    }));
    score.textContent = `가져간 카드 ${taken.size} / ${deck.length}, 바른 판단 ${right}번`;
    ctrl.replaceChildren();
    if (open.length === 2) ctrl.append(button('같은 계절이에요, 가져가기', () => decide(true), 'mission-go'), button('다른 계절이에요, 다시 뒤집기', () => decide(false), 'secondary'));
  }
  function flip(pos) {
    if (busy || open.length >= 2 || taken.has(pos)) return;
    open.push(pos);
    status.textContent = open.length === 1 ? `${card(pos).label}. 한 장 더 뒤집어 보세요.` : `${j(card(open[0]).label, '과', '와')} ${card(pos).label}. 같은 계절일까요?`;
    paint();
  }
  function decide(same) {
    const [a, b] = open, sa = card(a).season, sb = card(b).season, truth = sa === sb;
    judged++;
    if (same === truth) right++;
    if (truth && same) { taken.add(a); taken.add(b); status.textContent = `맞아요. 둘 다 ${SEASON[sa]}이에요. 카드를 가져갔어요.`; }
    else if (!truth && !same) status.textContent = `맞아요. ${j(card(a).label, '은', '는')} ${SEASON[sa]}, ${j(card(b).label, '은', '는')} ${SEASON[sb]}이에요. 다시 뒤집어요.`;
    else if (truth && !same) status.textContent = `다시 보세요. 둘 다 ${SEASON[sa]}이었어요. 이번에는 다시 뒤집어요.`;
    else status.textContent = `다시 보세요. ${j(card(a).label, '은', '는')} ${SEASON[sa]}, ${j(card(b).label, '은', '는')} ${SEASON[sb]}이에요.`;
    memory.taken = [...taken]; memory.judged = judged; memory.right = right;
    open = [];
    if (taken.size >= deck.length) { paint(); status.textContent = `카드를 모두 가져갔어요. 바르게 판단한 횟수는 ${right}번이에요.`; onAction?.('played'); return; }
    busy = true; paint();
    setTimeout(() => { busy = false; dodam(); }, 900);
  }
  function dodam() {
    const left = order.map((_, i) => i).filter((i) => !taken.has(i));
    if (left.length < 4) { paint(); return; }
    const pick = shuffle(left).slice(0, 2);
    peek = new Set(pick); busy = true;
    status.textContent = `신항이 차례: ${card(pick[0]).label}, ${card(pick[1]).label}. 위치를 기억해 두세요.`;
    paint();
    setTimeout(() => { peek = new Set(); busy = false; status.textContent = '내 차례예요. 두 장을 뒤집어 보세요.'; paint(); }, 1500);
  }
  paint();
  status.textContent = taken.size ? '이어서 해 보세요.' : '카드 두 장을 뒤집어 보세요.';
  return {node, stop: () => {}};
}
