// 주민 인터뷰 (아파트 주민 인터뷰, 과학 82, 84~85쪽).
// 주민마다 목적, 사용 습관, 어려움 순서로 묻는다. 대사를 넘긴 것과 조사 기록은 따로 다루며, 들은 내용은 조사 기록에 쌓인다.
export function interview({el, button, mission, memory = {}, onReady}) {
  const people = mission.people || {};
  const ids = Object.keys(people);
  const heard = memory.heard ??= {};
  let cur = ids.find((id) => (heard[id] || 0) < people[id].qa.length) || ids[0];
  const tabs = el('div', {class: 'iv-tabs', role: 'tablist'});
  const body = el('div', {class: 'iv-body'});
  const notes = el('div', {class: 'iv-notes'});
  const node = el('div', {class: 'dex iv'}, el('div', {class: 'dex-head'}, el('strong', {}, '주민 인터뷰'), el('span', {}, '목적 → 사용 습관 → 어려움 순서로 물어보세요.')), tabs, body, notes);
  const done = () => ids.every((id) => (heard[id] || 0) >= people[id].qa.length);
  function paint() {
    tabs.replaceChildren(...ids.map((id) => {
      const p = people[id], n = heard[id] || 0;
      const b = button('', () => { cur = id; paint(); }, 'iv-tab' + (cur === id ? ' sel' : '') + (n >= p.qa.length ? ' done' : ''));
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(cur === id));
      b.append(el('img', {src: p.img, alt: ''}), el('span', {}, `${p.name} ${n}/${p.qa.length}`));
      return b;
    }));
    const p = people[cur], n = heard[cur] || 0;
    const lines = p.qa.slice(0, n).flatMap((x) => [el('p', {class: 'iv-q'}, '나: ' + x.q), el('p', {class: 'iv-a'}, `${p.name}: ${x.a}`)]);
    const next = p.qa[n];
    body.replaceChildren(el('div', {class: 'iv-person'}, el('img', {src: p.img, alt: p.name}), el('div', {}, el('h3', {}, p.name), el('p', {}, p.intro))),
      el('div', {class: 'iv-log', 'aria-live': 'polite'}, lines),
      next ? button(`${next.topic} 묻기: "${next.q}"`, () => { heard[cur] = n + 1; paint(); if (done()) onReady?.(); }, 'iv-ask') : el('p', {class: 'iv-end'}, `${p.name}의 이야기를 모두 들었어요.`));
    const all = ids.flatMap((id) => people[id].qa.slice(0, heard[id] || 0).filter((x) => x.note).map((x) => `${people[id].name}: ${x.note}`));
    notes.replaceChildren(el('strong', {}, '조사 기록'), all.length ? el('ul', {}, all.map((x) => el('li', {}, x))) : el('p', {}, '아직 적은 내용이 없어요.'));
  }
  paint();
  if (done()) setTimeout(() => onReady?.(), 0);
  return {node, stop: () => {}};
}
