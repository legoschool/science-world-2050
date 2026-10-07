// 관리실 순찰 말판 (과학 83쪽, 실험관찰 43, 74쪽).
// 주사위나 속도 없이 순찰판의 필수 여섯 칸을 차례로 살펴본다. 칸을 누르면 그 장소의 모습이 나오고, 살펴본 칸은 표시가 남는다.
export function patrolBoard({el, button, mission, memory = {}, onReady}) {
  const spots = mission.patrol || [];
  const seen = new Set(memory.visited || []);
  const card = el('div', {class: 'pt-card', 'aria-live': 'polite'});
  const pins = el('div', {class: 'pt-pins'});
  const board = el('div', {class: 'pt-board'}, el('img', {src: mission.board, alt: '순찰판. 학교 건물의 여러 장소가 길로 이어져 있다.'}), pins);
  const list = el('div', {class: 'pt-list', role: 'group', 'aria-label': '순찰할 장소'});
  const node = el('div', {class: 'dex pt'}, el('div', {class: 'dex-head'}, el('strong', {}, '관리실 순찰판'), el('span', {}, '표시된 여섯 곳을 모두 살펴보세요. 만지지 않고 보기만 해요.')), board, list, card);
  let cur = null;
  function paint() {
    pins.replaceChildren(...spots.map((s, i) => {
      const b = button(String(i + 1), () => open(s.id), 'pt-pin' + (seen.has(s.id) ? ' seen' : '') + (cur === s.id ? ' sel' : ''));
      b.style.left = s.x + '%'; b.style.top = s.y + '%';
      b.setAttribute('aria-label', `${i + 1}번 ${s.label}${seen.has(s.id) ? ' (살펴봄)' : ''}`);
      return b;
    }));
    list.replaceChildren(...spots.map((s, i) => { const b = button(`${i + 1}. ${s.label}`, () => open(s.id), 'bench-opt pt-item' + (seen.has(s.id) ? ' seen' : '')); b.setAttribute('aria-pressed', String(cur === s.id)); return b; }),
      el('span', {class: 'pt-count'}, `살펴본 곳 ${seen.size} / ${spots.length}`));
  }
  function open(id) {
    const s = spots.find((x) => x.id === id);
    cur = id; seen.add(id); memory.visited = [...seen];
    card.replaceChildren(el('h3', {}, `${spots.indexOf(s) + 1}. ${s.label}`), el('p', {}, s.text));
    paint();
    if (seen.size >= spots.length) onReady?.();
  }
  paint();
  card.append(el('p', {class: 'dex-empty'}, '순찰판의 번호를 눌러 장소를 살펴보세요.'));
  if (seen.size >= spots.length) setTimeout(() => onReady?.(), 0);
  return {node, stop: () => {}};
}
