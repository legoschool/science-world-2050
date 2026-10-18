// 다시 들어올 까닭: 오늘의 탐구(날마다 세 문제, 끝낸 의뢰를 다시 떠올리기)와 도전 게시판(남은 더 해보기와 숨은 도감 카드).
// 연속 접속 보상이나 놓친 날의 불이익은 두지 않는다. 오늘의 탐구 경험치는 맞히면 10, 답하면 3이고 모험 기록(adventure.dailyExp)에 쌓인다.
const EXP_RIGHT = 10, EXP_TRY = 3;

function dialogShell(el, button, title, cls) {
  const d = el('dialog', {class: 'adventure-dialog ' + cls, 'aria-label': title});
  const body = el('div', {class: 'play-body'});
  d.append(el('div', {class: 'dlg-head'}, el('h2', {}, title), button('닫기', () => d.close())), body);
  d.addEventListener('close', () => d.remove(), {once: true});
  document.body.append(d); d.showModal();
  return {d, body};
}

export async function openDaily({el, button, api, state, save}) {
  const {body} = dialogShell(el, button, '오늘의 탐구', 'daily-dialog');
  body.append(el('p', {class: 'skill-msg'}, '오늘의 문제를 가져오고 있어요.'));
  let data;
  try { data = await api('daily'); } catch (e) { body.replaceChildren(el('p', {}, e.message || '문제를 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.')); return; }
  const status = el('p', {class: 'daily-status', role: 'status'});
  const paint = () => {
    const done = data.items.filter((x) => x.answered).length, ok = data.items.filter((x) => x.answered?.correct).length;
    status.textContent = done < data.items.length ? `${data.items.length}문제 가운데 ${done}문제를 풀었어요.` : `오늘의 탐구를 마쳤어요. ${ok}문제를 맞혔어요. 내일 새 문제가 와요.`;
  };
  const card = (it, n) => {
    const box = el('section', {class: 'daily-card'});
    const result = el('div', {class: 'daily-result'});
    const show = () => {
      const ok = it.answered.correct;
      result.replaceChildren(el('strong', {class: ok ? 'ok' : 'bad'}, ok ? '맞았어요.' : `정답은 「${it.keyLabel}」예요.`), it.explain ? el('p', {}, it.explain) : '');
      btns.forEach((b, k) => { b.disabled = true; const o = it.options[k]; b.classList.toggle('right', o.id === it.key); b.classList.toggle('picked', o.id === it.answered.answer && o.id !== it.key); });
    };
    const btns = it.options.map((o) => button(o.label, async () => {
      if (it.answered) return;
      btns.forEach((b) => (b.disabled = true));
      let r;
      try { r = await api('daily', {gameId: it.gameId, taskId: it.taskId, answer: o.id}); } catch (e) { btns.forEach((b) => (b.disabled = false)); result.textContent = e.message || '연결을 확인하고 다시 눌러 주세요.'; return; }
      it.answered = {answer: o.id, correct: r.correct}; Object.assign(it, {key: r.key, keyLabel: r.keyLabel, explain: r.explain});
      if (!r.already) { const a = state.adventure ??= {welcomed: false, tracked: 'R3-G04'}; a.dailyExp = (a.dailyExp || 0) + (r.correct ? EXP_RIGHT : EXP_TRY); save(); }
      show(); paint();
    }, 'm-option'));
    box.append(el('small', {class: 'daily-from'}, `${n + 1}. ${it.mission}`), el('h3', {}, it.title),
      ...(it.say || []).map(([who, text]) => el('p', {class: 'daily-say'}, el('b', {}, who === '미스터리' ? '미스터리 선생님' : who), ' ', text)),
      el('div', {class: 'm-options'}, btns), result);
    if (it.answered) show();
    return box;
  };
  body.replaceChildren(el('p', {class: 'skill-msg'}, '끝낸 의뢰에서 배운 것을 다시 떠올려 봐요. 문제마다 한 번 답할 수 있고, 답하면 해설이 나와요.'), status, ...data.items.map(card));
  paint();
}

// quick: 빠르게 문제만 길이면 의뢰의 그 과제로 바로 들어가고, 이야기 길이면 그 의뢰를 추적해 걸어간다
export async function openChallenges({el, button, api, state, quick, onEnter, onTrack}) {
  const {d, body} = dialogShell(el, button, '도전 게시판', 'challenge-dialog');
  body.append(el('p', {class: 'skill-msg'}, '도전 과제를 모으고 있어요.'));
  let data;
  try { data = await api('challenges?runId=' + encodeURIComponent(state.runId || '')); } catch (e) { body.replaceChildren(el('p', {}, e.message || '도전 과제를 불러오지 못했어요.')); return; }
  const list = data.missions.filter((m) => m.items.length);
  const left = list.reduce((n, m) => n + m.items.length, 0), hidden = list.reduce((n, m) => n + m.items.filter((t) => t.hidden.length).length, 0);
  if (!data.missions.length) { body.replaceChildren(el('p', {}, '의뢰를 하나 시작하면 그 의뢰의 더 해보기가 여기에 모여요.')); return; }
  body.replaceChildren(el('p', {class: 'daily-status'}, left ? `남은 더 해보기 ${left}개${hidden ? `, 숨은 도감 카드가 열리는 과제 ${hidden}개` : ''}` : '들어가 본 의뢰의 더 해보기를 모두 해결했어요.'),
    ...data.missions.map((m) => {
      const bar = el('span', {class: 'skill-bar'}, el('i')); bar.firstChild.style.width = Math.round((m.done / m.total) * 100) + '%';
      const head = el('div', {class: 'challenge-head'}, el('strong', {}, m.title), el('span', {}, `${m.done} / ${m.total}`));
      const rows = m.items.map((t) => el('li', {}, el('span', {}, t.title, t.hidden.length ? el('em', {class: 'challenge-hidden'}, '숨은 카드') : ''),
        quick ? button('바로 해 보기', () => { d.close(); onEnter(m.gameId, t.taskId); }, 'secondary') : ''));
      return el('section', {class: 'challenge-mission'}, head, bar, m.items.length ? el('ul', {}, rows) : el('p', {class: 'skill-msg'}, '모두 해결했어요.'),
        !quick && m.items.length ? button('이 의뢰로 걸어가기', () => { d.close(); onTrack(m.gameId); }, 'secondary') : '');
    }));
}
