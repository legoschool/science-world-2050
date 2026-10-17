// 활동 장면 곁에서 목표, 관찰할 자료, 시작 방법을 함께 읽는다.
// 파일 경로와 내부 학습 요소 코드는 학생 화면에 표시하지 않는다.
export function learningSupport(el, support, {renderFigure, openBook} = {}) {
  if (!support) return null;
  const box = el('section', {class: 'learning-support', 'aria-label': '활동 길잡이'});
  if (support.goal) box.append(el('p', {class: 'learning-goal'}, el('strong', {}, '이번에 알아볼 것'), ' ', support.goal));
  if (support.next) box.append(el('p', {class: 'learning-next'}, el('strong', {}, '이렇게 시작해요'), ' ', support.next));
  if (support.lookFor) box.append(el('details', {class: 'learning-look'}, el('summary', {}, '무엇을 살펴볼까요?'), el('p', {}, support.lookFor)));
  for (const material of support.materials || []) {
    const card = el('figure', {class: 'learning-material'});
    if (material.title) card.append(el('figcaption', {}, material.title));
    const paragraphs = Array.isArray(material.text) ? material.text : material.text ? [material.text] : [];
    for (const paragraph of paragraphs) card.append(el('p', {}, paragraph));
    if (material.columns?.length && material.rows?.length) {
      const table = el('table', {},
        el('thead', {}, el('tr', {}, material.columns.map(label => el('th', {scope: 'col'}, label)))),
        el('tbody', {}, material.rows.map(row => el('tr', {}, row.map(value => el('td', {}, String(value)))))));
      if (material.title) table.setAttribute('aria-label', material.title);
      card.append(el('div', {class: 'learning-table'}, table));
    }
    if (material.figure && renderFigure) card.append(renderFigure(material.figure));
    box.append(card);
  }
  const sources = [...new Set((support.sources || []).filter(s => s.title).map(s => s.title + (s.page ? ` ${s.page}${String(s.page).endsWith('쪽') ? '' : '쪽'}` : '')))];
  // 과학, 실험관찰 쪽은 눌러서 교과서를 펼쳐 본다. 지도서(교사용)는 글자로만 남긴다.
  const book = (source) => { const m = openBook && !/지도서/.test(source) && source.match(/^(과학|실험관찰).*?(\d+)(?:\s*~\s*\d+)?쪽/); return m ? el('button', {type: 'button', class: 'learning-book', onclick: () => openBook({kind: m[1], page: Number(m[2])})}, source + ' 펼쳐 보기') : source; };
  if (sources.length) box.append(el('details', {class: 'learning-source'}, el('summary', {}, '관련 교과서와 자료'), el('ul', {}, sources.map(source => el('li', {}, book(source))))));
  return box.childElementCount ? box : null;
}

export function initialConsonants(text) {
  const letters = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  return Array.from(String(text || '').normalize('NFC'), c => c >= '가' && c <= '힣' ? letters[Math.floor((c.charCodeAt(0) - 0xac00) / 588)] : c).join('');
}

// 전용 실험의 개념 도움: 기존 실험 조건·선택 판정은 바꾸지 않는다.
export function termHints(el, terms, onOpen = () => {}) {
  if (!terms?.length) return null;
  const details = el('details', {class: 'term-hints'}, el('summary', {}, '초성 힌트'),
    el('p', {}, '관찰한 내용을 떠올리며 이 낱말을 넣어 설명해 보세요. 조사나 어미는 달라도 괜찮아요.'),
    el('ul', {}, terms.map(term => el('li', {}, typeof term === 'string' ? initialConsonants(term) : [term.clue ? `${term.clue}: ` : '', el('strong', {}, initialConsonants(term.word))]))));
  details.addEventListener('toggle', () => { if (details.open) onOpen(); });
  return details;
}
