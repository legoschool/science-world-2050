// 퀘스트 수첩의 「내 배움 지도」와 「반짝 탐험가」.
// 내 배움 지도(/api/my-learning): 성취기준별로 해결한 의뢰와 한 번에 맞힌 과제, 처음 생각과 지금 생각, 의뢰를 끝내며 남긴 말.
// 처음 생각은 진단 과제에 처음 낸 답이고, 의뢰를 끝낸 뒤 광장의 달새가 다시 물어 본 답이 지금 생각이다(atlas.mjs, 같은 과제의 mission.answered).
// 반짝 탐험가(/api/weekly): 선생님이 켠 반에서 이번 주 다섯 갈래 기록의 위쪽 친구와 내 숫자. 점수 순위는 두지 않는다.
import {questInfo} from './quests.mjs';

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

export async function showLearning({el, api, box}) {
  box.replaceChildren(el('p', {class: 'muted'}, '배움 기록을 불러오고 있어요.'));
  let d;
  try { d = await api('my-learning'); } catch { box.replaceChildren(el('p', {}, '연결 상태를 확인한 뒤 다시 열어 주세요.')); return; }
  if (!box.isConnected) return;
  const games = d.games || {}, codes = d.gameCodes || {}, ids = Object.keys(codes);
  const sum = (list, k) => list.reduce((s, g) => s + (games[g]?.[k] || 0), 0);
  const title = (g) => games[g]?.title || questInfo(g)?.title || g;
  const stat = (label, value) => el('div', {class: 'learn-stat'}, el('strong', {}, value), el('span', {}, label));
  const done = ids.filter((g) => games[g]?.done).length, tried = sum(ids, 'tried');
  const out = [el('div', {class: 'learn-sum'}, stat('해결한 의뢰', `${done} / ${ids.length}`), stat('한 번에 맞힌 과제', tried ? `${sum(ids, 'ok')} / ${tried}` : '아직 없어요'))];

  // 막대 길이는 style 속성 대신 스크립트로 넣는다(보안 설정이 HTML 안의 style 속성을 막는다)
  const bar = (w, label) => { const i = el('i'); i.style.width = w + '%'; return el('span', {class: 'learn-bar', role: 'img', 'aria-label': label}, i); };
  function standardRow(r) {
    const n = r.games.filter((g) => games[g]?.done).length, t = sum(r.games, 'tried'), o = sum(r.games, 'ok');
    const list = el('ul', {class: 'learn-games'}, ...r.games.map((g) => el('li', {class: games[g]?.done ? 'done' : ''}, el('b', {}, title(g)), questInfo(g)?.goal ? el('span', {}, questInfo(g).goal) : '')));
    return el('details', {class: 'learn-std'},
      el('summary', {}, el('span', {class: 'learn-title'}, r.title),
        bar(pct(n, r.games.length), `의뢰 ${r.games.length}개 중 ${n}개 해결`),
        el('span', {class: 'learn-num'}, `의뢰 ${n}/${r.games.length}` + (t ? `, 한 번에 맞힌 과제 ${o}/${t}` : ''))),
      r.text ? el('p', {class: 'learn-text'}, '성취기준: ' + r.text) : '', list);
  }
  for (const reg of d.regions || []) {
    const rows = reg.standards.map((code) => ({code, title: d.standards[code].short, text: d.standards[code].text, games: ids.filter((g) => (codes[g] || []).includes(code))}));
    const loose = ids.filter((g) => g.startsWith(reg.id + '-') && !(codes[g] || []).length);
    if (loose.length) rows.unshift({code: '', title: '단원 들어가기', games: loose});
    out.push(el('section', {class: 'learn-region'}, el('h3', {}, reg.name), el('p', {class: 'quest-place'}, reg.unit), ...rows.map(standardRow)));
  }

  const mark = (ok) => el('span', {class: 'think-mark ' + (ok ? 'ok' : 'no')}, ok ? '과학 개념과 같아요' : '과학 개념과 달라요');
  function thinkCard(r) {
    const card = el('div', {class: 'learn-think'}, el('h4', {}, r.title), el('p', {class: 'quest-place'}, r.gameTitle));
    for (const p of r.parts) {
      card.append(el('div', {class: 'think-row'}, el('p', {class: 'think-q'}, r.type === 'sort' ? `「${p.prompt}」` : p.prompt),
        el('p', {}, el('b', {}, '처음 '), p.first ?? '답하지 않았어요', r.done && p.firstOk != null ? mark(p.firstOk) : ''),
        p.now != null ? el('p', {}, el('b', {}, '지금 '), p.now, r.done && p.nowOk != null ? mark(p.nowOk) : '') : ''));
    }
    if (!r.done) card.append(el('p', {class: 'muted'}, '의뢰를 끝내면 지금 생각을 다시 답할 수 있어요.'));
    else if (r.parts.every((p) => p.now == null)) card.append(el('p', {class: 'muted'}, '광장의 달새에게 말을 걸면 지금 생각을 다시 답할 수 있어요.'));
    return card;
  }
  if (d.rethink?.length) out.push(el('section', {class: 'learn-region'}, el('h3', {}, '처음 생각과 지금 생각'), ...d.rethink.map(thinkCard)));
  if (d.notes?.length) out.push(el('section', {class: 'learn-region'}, el('h3', {}, '의뢰를 끝내며 남긴 말'), el('ul', {class: 'learn-notes'}, ...d.notes.slice(0, 40).map((n) => el('li', {}, el('b', {}, n.title), ' ' + n.answer)))));
  box.replaceChildren(...out);
}

export const loadWeekly = (api) => api('weekly').catch(() => ({on: false}));
const day = (t) => new Date(t * 1000).toLocaleDateString('ko-KR', {month: 'long', day: 'numeric', weekday: 'short'});
export function showWeekly({el, box, data}) {
  if (!data?.on) { box.replaceChildren(el('p', {}, '선생님이 켜면 볼 수 있어요.')); return; }
  const unit = (c) => (c.id === 'dex' ? '장' : '개'), value = (c, v) => (c.id === 'growth' ? `+${v}개` : `${v}${unit(c)}`);
  const cards = data.cats.map((c) => {
    const rank = (v) => 1 + c.top.filter((x) => x.value > v).length;
    const list = el('ul', {class: 'weekly-top'}, ...c.top.map((x) => el('li', {class: x.mine ? 'mine' : ''}, el('span', {class: 'weekly-rank'}, String(rank(x.value))), el('span', {class: 'weekly-name'}, x.nickname + (x.mine ? '(나)' : '')), el('b', {}, value(c, x.value)))));
    const me = c.id === 'growth' ? `나: 이번 주 ${c.now ?? 0}개, 지난주 ${c.last ?? 0}개` : `나: ${c.me ?? 0}${unit(c)}`;
    return el('section', {class: 'weekly-card'}, el('h3', {}, c.title), c.top.length ? list : el('p', {class: 'muted'}, '아직 아무도 없어요.'), c.more ? el('p', {class: 'muted'}, `같은 기록인 친구 ${c.more}명 더`) : '', el('p', {class: 'weekly-me'}, me));
  });
  box.replaceChildren(el('p', {class: 'quest-place'}, `${day(data.start)}부터 ${day(data.end - 1)}까지`), el('div', {class: 'weekly-grid'}, ...cards));
}
