// 과학 역량과 활동 성향 육각형(학생 탐험가 정보 창 「역량」 칸, 선생님 학습 대시보드 「역량」 칸이 함께 쓴다)과 역량 점검지.
// 점수는 서버(competency.py)가 학생 기록에서 계산한다. 성적이나 순위가 아니라 「게임 기록으로 본 모습」이고, 근거(무엇을 몇 번)를 함께 보인다.
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); kids.forEach((k) => k && n.append(k)); return n; };

// axes: [{label}], layers: [{values: [0~100], cls}]
export function radar(axes, layers, {size = 300, title = ''} = {}) {
  const c = size / 2, r = size * 0.32, n = axes.length;
  const at = (k, v) => { const a = -Math.PI / 2 + (2 * Math.PI * k) / n; return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v]; };
  const root = svg('svg', {viewBox: `0 0 ${size} ${size}`, class: 'radar', role: 'img', 'aria-label': title + ': ' + axes.map((x, k) => `${x.label} ${layers.at(-1)?.values[k] ?? 0}`).join(', ')});
  for (const ring of [0.25, 0.5, 0.75, 1]) root.append(svg('polygon', {class: 'radar-ring', points: axes.map((_, k) => at(k, ring).join(',')).join(' ')}));
  axes.forEach((x, k) => {
    const [px, py] = at(k, 1), [lx, ly] = at(k, 1.26);
    root.append(svg('line', {class: 'radar-axis', x1: c, y1: c, x2: px, y2: py}));
    const t = svg('text', {class: 'radar-label', x: lx, y: ly, 'text-anchor': Math.abs(lx - c) < 4 ? 'middle' : lx < c ? 'end' : 'start', 'dominant-baseline': 'middle'});
    t.textContent = x.label; root.append(t);
  });
  for (const layer of layers) {
    const pts = layer.values.map((v, k) => at(k, Math.max(0.02, Math.min(100, v || 0) / 100)));
    root.append(svg('polygon', {class: 'radar-shape ' + (layer.cls || ''), points: pts.map((p) => p.join(',')).join(' ')}));
    if (!layer.cls?.includes('before')) for (const [x, y] of pts) root.append(svg('circle', {class: 'radar-dot', cx: x, cy: y, r: 3.5}));
  }
  return root;
}

const basisText = (basis) => (basis || []).map((b) => `${b.label} ${b.count}`).join(', ');

// 학생 「역량」 칸
export async function renderCompetency(box, {el, button, api}) {
  box.replaceChildren(el('p', {class: 'skill-msg'}, '역량을 계산하고 있어요.'));
  let d;
  try { d = await api('my-competency'); } catch { box.replaceChildren(el('p', {class: 'skill-msg'}, '역량을 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.')); return; }
  const comp = d.competencies, tend = d.tendencies, now = d.profile.competencies, nowT = d.profile.tendencies;
  const first = d.growth.length > 1 ? d.growth[0].competencies : null;
  const layers = [...(first ? [{values: comp.map((x) => first[x.id]), cls: 'before'}] : []), {values: comp.map((x) => now[x.id].score), cls: 'now'}];
  const rows = (list, scores, start) => el('ul', {class: 'skill-rows'}, list.map((x) => {
    const s = scores[x.id], up = start ? s.score - start[x.id] : 0;
    const bar = el('span', {class: 'skill-bar'}, el('i')); bar.firstChild.style.width = s.score + '%';
    return el('li', {}, el('div', {class: 'skill-top'}, el('strong', {}, x.label), el('b', {}, String(s.score)), up > 0 ? el('span', {class: 'skill-up'}, `처음보다 ${up} 올랐어요`) : ''),
      bar, el('small', {}, s.basis.length ? '근거: ' + basisText(s.basis) : x.about));
  }));
  const thin = d.profile.evidence < 5 ? el('p', {class: 'skill-msg'}, '의뢰를 몇 개 더 풀면 육각형이 채워져요. 틀리거나 도움을 받아도 점수가 깎이지 않아요.') : '';
  const compPanel = el('section', {class: 'hero-panel skill-panel'}, el('h3', {}, '나의 과학 역량'),
    el('div', {class: 'skill-chart'}, radar(comp.map((x) => ({label: x.short})), layers, {title: '나의 과학 역량'})),
    first ? el('p', {class: 'skill-legend'}, el('span', {class: 'lg before'}, '처음 일주일'), el('span', {class: 'lg now'}, '지금')) : '',
    thin, rows(comp, now, first));
  const tendPanel = el('section', {class: 'hero-panel skill-panel'}, el('h3', {}, '나의 탐험 성향'),
    el('div', {class: 'skill-chart'}, radar(tend.map((x) => ({label: x.label})), [{values: tend.map((x) => nowT[x.id].score), cls: 'now tend'}], {title: '나의 탐험 성향'})),
    rows(tend, nowT, null));
  // 역량 점검: 처음과 최근
  const checks = d.checks || [], c0 = checks[0], c1 = checks.length > 1 ? checks.at(-1) : null;
  const checkPanel = el('section', {class: 'hero-panel skill-check'}, el('h3', {}, '역량 점검'));
  if (c0) {
    const head = el('tr', {}, el('th', {}, '역량'), el('th', {}, '처음 점검'), c1 ? el('th', {}, '최근 점검') : '');
    const cell = (ck, id) => el('td', {}, `문제 ${ck.right[id] ?? 0}/2, 나 돌아보기 ${ck.rates[id] ?? '-'}/4`);
    checkPanel.append(el('div', {class: 'skill-table'}, el('table', {}, el('thead', {}, head), el('tbody', {}, comp.map((x) => el('tr', {}, el('td', {}, x.short), cell(c0, x.id), c1 ? cell(c1, x.id) : ''))))));
  }
  checkPanel.append(button(c0 ? '다시 점검하기' : '역량 점검하기', () => openCheck({el, button, api, onDone: () => renderCompetency(box, {el, button, api})}), 'mission-go'));
  box.replaceChildren(el('div', {class: 'skill-grid'}, compPanel, tendPanel), checkPanel);
}

// 역량 점검지: 나 돌아보기 여섯, 상황 문제 열둘
export async function openCheck({el, button, api, onDone = () => {}}) {
  let paper;
  const d = el('dialog', {class: 'adventure-dialog skill-dialog', 'aria-label': '역량 점검'});
  try { paper = await api('competency-check'); } catch (e) {
    d.append(el('div', {class: 'dlg-head'}, el('h2', {}, '역량 점검'), button('닫기', () => d.close())), el('p', {}, e.message || '점검지를 불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.'));
    d.addEventListener('close', () => d.remove(), {once: true}); document.body.append(d); d.showModal(); return;
  }
  const rates = {}, answers = {};
  const fb = el('p', {class: 'm-feedback', role: 'status'});
  const radio = (label, on) => { const b = button(label, on, 'm-option'); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); return b; };
  const group = (set, choose) => set.forEach((b, k) => b.setAttribute('aria-checked', String(k === choose)));
  const rateRows = paper.rate.map((q) => {
    const bs = paper.scale.map((s, k) => radio(s.label, () => { rates[q.code] = s.id; group(bs, k); }));
    return el('fieldset', {class: 'm-quiz'}, el('legend', {}, q.stem), el('div', {class: 'm-options skill-scale', role: 'radiogroup', 'aria-label': q.stem}, bs));
  });
  const itemRows = paper.items.map((it, n) => {
    const bs = it.options.map((o, k) => radio(o.label, () => { answers[it.id] = o.id; group(bs, k); }));
    return el('fieldset', {class: 'm-quiz', 'data-item': it.id}, el('legend', {}, `${n + 1}. ${it.stem}`), el('div', {class: 'm-options', role: 'radiogroup', 'aria-label': it.stem}, bs));
  });
  const send = button('점검 마치기', async () => {
    if (Object.keys(rates).length < paper.rate.length) return (fb.textContent = '나를 돌아보는 문항에 모두 답해 주세요.');
    if (Object.keys(answers).length < paper.items.length) return (fb.textContent = '문제에 모두 답해 주세요.');
    send.disabled = true;
    let r;
    try { r = await api('competency-check', {form: paper.form, rates, answers}); } catch (e) { send.disabled = false; return (fb.textContent = e.message || '연결을 확인하고 다시 눌러 주세요.'); }
    const why = Object.fromEntries(r.review.map((x) => [x.id, x]));
    for (const row of d.querySelectorAll('[data-item]')) {
      const x = why[row.dataset.item];
      row.classList.add(x.ok ? 'ok' : 'recheck');
      row.append(el('p', {class: 'skill-why'}, (x.ok ? '맞았어요. ' : '다시 볼 점: ') + x.why));
    }
    fb.textContent = `점검을 마쳤어요. 상황 문제 ${paper.items.length}개 가운데 ${Object.values(r.right).reduce((a, b) => a + b, 0)}개를 맞혔어요. 아래에서 문제마다 까닭을 살펴봐요.`;
    const back = button('역량 칸으로 돌아가기', () => d.close(), 'mission-go');
    send.replaceWith(back);
    d.querySelector('.skill-paper').prepend(el('div', {class: 'skill-result'}, el('p', {}, fb.textContent), el('ul', {}, paper.rate.map((q) => el('li', {}, `${paper.labels?.[q.code] || q.code}: 상황 문제 ${r.right[q.code]}/${r.total[q.code]}`))), button('역량 칸으로 돌아가기', () => d.close(), 'mission-go')));
    d.scrollTop = 0;
  }, 'mission-go');
  d.append(el('div', {class: 'dlg-head'}, el('h2', {}, '역량 점검'), button('닫기', () => d.close())),
    el('div', {class: 'skill-paper'}, el('h3', {}, '나를 돌아봐요'), ...rateRows, el('h3', {}, '상황 문제'), ...itemRows, fb, send));
  d.addEventListener('close', () => { d.remove(); onDone(); }, {once: true});
  document.body.append(d); d.showModal();
}
