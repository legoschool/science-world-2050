// 초성은 학생이 요청할 때 현재 문항 판의 서버 규칙으로 받는다.
let hintSequence = 0;
// missing: 마지막 답에서 빠진 핵심 내용 묶음 id 목록을 돌려주는 함수(있으면 그 줄에 「아직 없어요」를 붙인다)
export function answerHint({el, button, api, payload, onHint = () => {}, isActive = () => true, missing = () => []}) {
  let alive = true, busy = false, received = false;
  const id = `answer-hint-${++hintSequence}`;
  const content = el('div', {id, class: 'answer-hint-content', role: 'status'});
  content.hidden = true;
  const trigger = button('초성 힌트', async () => {
    if (busy) return;
    if (received) { content.hidden = !content.hidden; trigger.setAttribute('aria-expanded', String(!content.hidden)); return; }
    busy = true; trigger.disabled = true; content.hidden = false;
    trigger.setAttribute('aria-expanded', 'true'); content.textContent = '힌트를 가져오고 있어요.';
    try {
      const result = await api('answer-hint', typeof payload === 'function' ? payload() : payload);
      if (!alive || !isActive()) return;
      content.replaceChildren(el('p', {}, result.message || '관찰한 내용과 초성을 함께 보고 핵심 낱말을 떠올려 보세요.'),
        el('ul', {}, (result.hints || []).map(hint => el('li', {'data-hint-group': hint.id || ''}, hint.label ? `${hint.label}: ` : '', el('strong', {}, hint.pattern || '')))));
      received = true; mark(); trigger.textContent = '초성 힌트 접기'; trigger.classList.remove('m-help-pulse'); onHint(result);
    } catch (error) {
      if (alive && isActive()) content.textContent = error.status >= 400 && error.status < 500 ? error.message : '힌트를 가져오지 못했어요. 연결을 확인하고 다시 눌러 주세요.';
    } finally { if (alive) { busy = false; trigger.disabled = false; } }
  }, 'secondary answer-hint-button');
  trigger.setAttribute('aria-controls', id); trigger.setAttribute('aria-expanded', 'false');
  const node = el('div', {class: 'answer-hint'}, trigger, content);
  function mark() {
    const gap = new Set((missing() || []).map(String));
    for (const li of content.querySelectorAll('li[data-hint-group]')) {
      li.querySelector('.answer-hint-gap')?.remove();
      const miss = gap.has(li.dataset.hintGroup);
      li.classList.toggle('missing', miss);
      if (miss) li.append(el('span', {class: 'answer-hint-gap'}, '아직 없어요'));
    }
  }
  trigger.addEventListener('click', () => { if (received) trigger.textContent = content.hidden ? '초성 힌트 다시 보기' : '초성 힌트 접기'; });
  return {node, offer: () => trigger.classList.add('m-help-pulse'), mark, dispose: () => { alive = false; }};
}
