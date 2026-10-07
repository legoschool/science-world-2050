// 조사 카드 도감 (전자석이 숨은 거리, 과학 80~81쪽).
// 교사가 마련한 출처 표시 자료처럼 카드마다 쓰임과 출처를 적어 둔다. 학생은 카드를 열어 근거를 찾고, 연 카드는 기록해 둔다.
export function dexViewer({el, button, task, mission, memory = {}}) {
  const dex = mission.dex || {};
  const ids = (task.cards || Object.keys(dex)).filter((id) => dex[id]);
  const opened = new Set(memory.opened || []);
  const detail = el('div', {class: 'dex-detail', 'aria-live': 'polite'});
  const grid = el('div', {class: 'dex-grid', role: 'group', 'aria-label': '조사 카드'});
  const node = el('div', {class: 'dex'}, el('div', {class: 'dex-head'}, el('strong', {}, '조사 카드 도감'), el('span', {}, '카드를 눌러 쓰임과 출처를 확인하세요.')), grid, detail);
  function paint(cur) {
    grid.replaceChildren(...ids.map((id) => {
      const d = dex[id];
      const b = button('', () => show(id), 'dex-card' + (opened.has(id) ? ' seen' : '') + (cur === id ? ' sel' : ''));
      b.setAttribute('aria-pressed', String(cur === id));
      b.append(el('img', {src: d.img, alt: ''}), el('span', {}, d.label));
      return b;
    }));
  }
  function show(id) {
    const d = dex[id];
    opened.add(id); memory.opened = [...opened];
    detail.replaceChildren(el('img', {src: d.img, alt: d.label}), el('div', {}, el('h3', {}, d.label), ...(d.text || []).map((x) => el('p', {}, x)), el('p', {class: 'dex-source'}, '출처: ' + d.source)));
    paint(id);
  }
  paint();
  detail.append(el('p', {class: 'dex-empty'}, '위에서 카드를 하나 골라 보세요.'));
  return {node, stop: () => {}};
}
