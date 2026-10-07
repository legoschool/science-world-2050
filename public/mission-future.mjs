// 미래 연구 본부(4단원 과학과 나의 진로) 조작 장면. 계기판 높이, 구분 결과, 막대는 모형 값이고 숫자를 쓰지 않는다.
// 신문 면, 명함, 타임캡슐 편지는 학생이 고른 카드로만 만들고 자유 글을 넣지 않는다.
import {FONT, device} from './mission-fire.mjs';

const actOf = (task, fire) => (a) => { if (task.type === 'action') fire?.(a); };
const later = (on) => setTimeout(() => on?.(), 0);
const IMG = '/assets/missions/';
function panel(el, owner, cls, ...kids) {
  const status = el('p', {class: 'signal-status', role: 'status'});
  const node = el('div', {class: 'signal-device sun ' + cls}, el('div', {class: 'signal-owner'}, owner), ...kids, status);
  return {node, status};
}
function choose(el, button, label, list, cur, on, multi = false) {
  return el('div', {class: 'fu-pick'}, el('p', {class: 'eco-how'}, label), el('div', {class: 'bench-seg'}, list.map(([id, name]) => {
    const pressed = multi ? cur.includes(id) : cur === id;
    const b = button(name, () => on(id), 'bench-opt'); b.setAttribute('aria-pressed', String(pressed)); return b;
  })));
}
const toggle = (arr, id) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

// ---------------------------------------------------------------- R4-G02 망원경 시간 창
export function telescope({el, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const m = memory.tele ??= {lo: false, hi: false};
  const top = el('img', {src: IMG + 'r4-g02-future.jpg', alt: '2050년 우리 마을', class: 'fu-top'});
  const view = el('div', {class: 'fu-scope'}, el('img', {src: IMG + 'r4-g02-now.jpg', alt: '2026년 우리 마을'}), top, el('span', {class: 'fu-tag l'}, '2026년'), el('span', {class: 'fu-tag r'}, '2050년 (모형)'));
  const range = el('input', {type: 'range', min: '0', max: '100', value: '50', 'aria-label': '망원경 시간 창'});
  const {node, status} = panel(el, '미래 전망대 망원경', 'fu-tele', view, el('label', {class: 'eco-slider'}, el('span', {}, '시간 창'), range, el('span', {class: 'eco-level'}, '밀어 보기')));
  let fired = m.lo && m.hi;
  function paint() {
    const v = Number(range.value);
    top.style.clipPath = `inset(0 0 0 ${v}%)`;
    if (v <= 8) m.lo = true; if (v >= 92) m.hi = true;
    status.textContent = m.lo && m.hi ? '두 시대를 모두 겹쳐 봤어요. 달라진 곳을 찾아보세요.' : '시간 창을 왼쪽 끝과 오른쪽 끝까지 밀어 2026년과 2050년을 겹쳐 보세요.';
    if (m.lo && m.hi && !fired) { fired = true; onAction('compared'); onReady?.(); }
  }
  range.addEventListener('input', paint);
  paint();
  if (fired) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- R4-G02 10년 뒤 나에게 타임캡슐 편지 (조립 문장만 저장, 최종장에서 다시 열림)
const CAP_FUT = [['robot', '로봇이 어르신의 생활을 돕는 모습'], ['drone', '드론이 섬 마을에 물건을 나르는 모습'], ['solar', '재생에너지로 마을 전기를 만드는 모습'], ['ai', '인공지능 비서가 집안일을 돕는 모습']];
const CAP_PREP = [['read', '과학 기사와 자료를 꾸준히 읽는 준비'], ['safe', '새 기술을 안전하게 쓰는 방법을 익히는 준비'], ['love', '내가 좋아하는 일을 깊이 공부하는 준비']];
const CAP_BASIS = [['senior', '2026년에 경로당이 새로 생긴 것'], ['vac', '2026년에 로봇 청소기가 늘어난 것'], ['panel', '2026년 지붕의 태양광 패널'], ['none', '근거 없이 떠오른 상상']];
export function capsule({el, button, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const m = memory.capsule ??= {fut: null, prep: null, basis: null, sealed: false, text: ''};
  const box = el('div', {class: 'fu-cap'});
  const {node, status} = panel(el, '10년 뒤 나에게 타임캡슐 편지', 'fu-capsule', box);
  const label = (list, id) => list.find((x) => x[0] === id)?.[1] || '(   )';
  const letter = () => `10년 뒤 우리 마을에는 ${label(CAP_FUT, m.fut)}이 있을 것 같습니다. 그때 나는 ${label(CAP_PREP, m.prep)}를 하고 있으면 좋겠습니다. 이렇게 예상한 근거는 ${label(CAP_BASIS, m.basis)}입니다.`;
  function paint() {
    if (m.sealed) { box.replaceChildren(el('div', {class: 'fu-letter sealed'}, el('p', {}, m.text), el('small', {}, '봉인했어요. 이름 없이 이 기기와 선생님 기록에만 남아요.'))); status.textContent = '편지를 봉인했어요. 연구 본부 어딘가에서 다시 열릴 거예요.'; return; }
    box.replaceChildren(choose(el, button, '10년 뒤 우리 마을의 모습', CAP_FUT, m.fut, (id) => { m.fut = id; paint(); }),
      choose(el, button, '그때 내가 하고 있을 준비', CAP_PREP, m.prep, (id) => { m.prep = id; paint(); }),
      choose(el, button, '이렇게 예상한 근거', CAP_BASIS, m.basis, (id) => { m.basis = id; paint(); }),
      el('div', {class: 'fu-letter'}, el('p', {}, letter())),
      button('편지 봉인하기', () => { if (!m.fut || !m.prep || !m.basis) { status.textContent = '세 칸을 모두 골라 주세요.'; return; } m.text = letter(); m.sealed = true; paint(); onAction('sealed'); onReady?.(); }, 'mission-go'));
    status.textContent = '세 칸을 골라 편지를 완성해요. 근거 칸도 솔직하게 골라요.';
  }
  paint();
  if (m.sealed) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- 우리 마을 미래 신문 (그림 면, 기사 면, 카드 뉴스 면, 인쇄)
const PIC_FIELD = [['pop', '인구'], ['tech', '기술'], ['env', '환경'], ['traffic', '교통'], ['energy', '에너지'], ['info', '정보']];
const PIC_STICK = [['car', '자율주행 자동차'], ['robot', '집안일을 돕는 로봇'], ['holo', '3D 홀로그램 토의'], ['space', '우주 소풍'], ['doctor', '원격 진료'], ['remote', '원격 제어'], ['drone', '드론 배송'], ['farm', '도시형 농장'], ['taxi', '날아다니는 택시']];
const PIC_BASIS = [['senior', '2026년 새로 생긴 경로당'], ['testcar', '2026년 자율주행 시험 차량'], ['panel', '2026년 지붕의 태양광 패널'], ['vac', '2026년 로봇 청소기'], ['ebook', '2026년 전자책을 읽는 사람']];
const ART = {
  title: [['sea', '바닷물 온도가 오르면 우리 마을 바다는 어떻게 될까요'], ['cyber', '디지털 생활이 늘면 개인 정보 피해가 늘 수 있어요'], ['pop', '아이는 줄고 어르신은 늘어요']],
  evid: [['sea', '평균기온 변화 (기상청, 2025)'], ['cyber', '사이버 범죄 발생 건수 (경찰청, 2024)'], ['pop', '어린이와 노인 인구의 변화 (국가데이터처, 2023)'], ['nosrc', '누가 썼는지 모르는 글']],
  prob: [['sea', '고등어, 우럭, 광어, 전복이 살기 어려워질 수 있어요'], ['cyber', '개인 정보가 새어 나가 범죄에 이용될 수 있어요'], ['pop', '경제 활동 인구가 줄어들 수 있어요']],
  who: [['sea', '바닷가 양식장 어민'], ['cyber', '정보를 함부로 입력한 이웃'], ['pop', '일할 사람이 모자란 마을 가게']],
};
const CARDS = {
  p1: [['renew', '이상 기후 문제, 재생에너지로 해결해요'], ['secure', '개인 정보 유출, 생체 인식과 암호화로 막아요'], ['fire', '대규모 산불, 인공지능과 드론이 도와요']],
  p2: [['renew', '태양광과 풍력으로 전기를 만들어 화석 연료를 덜 태워요'], ['secure', '지문이나 홍채로 본인만 열고, 데이터를 암호로 바꿔 보내요'], ['fire', '인공지능이 불이 번질 곳을 예상하고 드론이 불을 끄고 사람을 찾아요'], ['none', '설명 없이 좋다고만 적어요']],
  p3: [['renew', '계속 쓸 수 있고 탄소 배출을 줄여요. 날씨에 따라 전기 양이 달라져 여러 에너지를 함께 써요'], ['secure', '정보를 훔치기 어려워져요. 생체 정보도 안전하게 보관해야 해요'], ['fire', '사람이 들어가기 어려운 곳도 살필 수 있어요. 드론을 다룰 사람도 필요해요']],
  src: [['kma', '기상청 누리집 자료'], ['book', '과학 교과서 104~105쪽'], ['nosrc', '출처 없음']],
};
const lab = (list, id) => list.find((x) => x[0] === id)?.[1] || '';
export function newsPage({el, button, mode, task = {}, memory = {}, others = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const box = el('div', {class: 'fu-news'});
  const {node, status} = panel(el, {picture: '신문 그림 면 편집기', article: '신문 기사 면 편집기', cards: '카드 뉴스 면 편집기', print: '3층 인쇄기'}[mode], 'fu-newsdev', box);
  const pic = memory.picture ??= {field: null, stick: [], basis: [], done: false};
  const art = memory.article ??= {title: null, evid: null, prob: null, who: null, done: false};
  const cn = memory.cards ??= {p1: null, p2: null, p3: null, src: null, done: false};
  const pr = memory.print ??= {placed: false, checked: false, code: null, done: false};
  let fired = false;
  function finish(flag, action, text) { status.textContent = text; if (!fired) { fired = true; onAction(action); onReady?.(); } }
  function paintPicture() {
    const preview = el('div', {class: 'fu-page pic'}, el('small', {}, `그림 면: ${lab(PIC_FIELD, pic.field) || '분야를 골라요'}`), el('div', {class: 'fu-stickers'}, pic.stick.length ? pic.stick.map((id) => el('span', {}, lab(PIC_STICK, id))) : el('span', {class: 'empty'}, '장면 스티커를 붙여요')), el('p', {class: 'fu-basis'}, '근거: ' + (pic.basis.map((id) => lab(PIC_BASIS, id)).join(', ') || '없음')));
    box.replaceChildren(choose(el, button, '주제 분야 하나', PIC_FIELD, pic.field, (id) => { pic.field = id; paintPicture(); }),
      choose(el, button, '전망대 장면 스티커 (세 장까지)', PIC_STICK, pic.stick, (id) => { if (!pic.stick.includes(id) && pic.stick.length >= 3) { status.textContent = '스티커는 세 장까지 붙여요.'; return; } pic.stick = toggle(pic.stick, id); paintPicture(); }, true),
      choose(el, button, '근거 카드 (한 장 이상)', PIC_BASIS, pic.basis, (id) => { pic.basis = toggle(pic.basis, id); paintPicture(); }, true), preview,
      pic.done ? '' : button('그림 면 저장하기', () => { if (!pic.field || !pic.stick.length || !pic.basis.length) { status.textContent = '분야, 스티커, 근거 카드를 모두 골라 주세요. 근거 없는 그림은 저장되지 않아요.'; return; } pic.done = true; paintPicture(); finish(true, 'made', '그림 면을 저장했어요. 3층 인쇄기로 보내져요.'); }, 'mission-go'));
    if (!pic.done) status.textContent = '분야를 고르고, 망원경에서 본 장면 스티커와 근거 카드를 붙여요.';
  }
  function paintArticle() {
    const text = [lab(ART.title, art.title), art.evid ? '근거 자료: ' + lab(ART.evid, art.evid) : '', art.prob ? '계속되면: ' + lab(ART.prob, art.prob) : '', art.who ? '피해를 입는 사람: ' + lab(ART.who, art.who) : ''].filter(Boolean);
    box.replaceChildren(choose(el, button, '제목', ART.title, art.title, (id) => { art.title = id; paintArticle(); }), choose(el, button, '근거 자료와 출처', ART.evid, art.evid, (id) => { art.evid = id; paintArticle(); }),
      choose(el, button, '계속되면 생길 문제', ART.prob, art.prob, (id) => { art.prob = id; paintArticle(); }), choose(el, button, '피해를 입는 사람 (누가 다칠 수 있나요)', ART.who, art.who, (id) => { art.who = id; paintArticle(); }),
      el('div', {class: 'fu-page art'}, text.length ? text.map((t, i) => el(i ? 'p' : 'h4', {}, t)) : el('p', {class: 'empty'}, '칸을 골라 기사를 조립해요.')),
      art.done ? '' : button('기사 면 저장하기', () => {
        if (!art.title || !art.evid || !art.prob || !art.who) { status.textContent = '네 칸을 모두 골라 주세요.'; return; }
        if (art.evid === 'nosrc') { status.textContent = '누가 썼는지 모르는 글은 기사 근거로 쓰지 않아요. 출처가 있는 자료를 골라요.'; return; }
        if (new Set([art.title, art.evid, art.prob, art.who]).size > 1) { status.textContent = '제목, 근거 자료, 문제, 피해를 입는 사람이 서로 이어지지 않아요. 같은 변화에 대한 카드로 맞춰요.'; return; }
        art.done = true; paintArticle(); finish(true, 'written', '기사 면을 저장했어요. 3층 인쇄기로 보내져요.');
      }, 'mission-go'));
    if (!art.done) status.textContent = '제보 자료에서 고른 변화 하나로 기사를 조립해요.';
  }
  function paintCards() {
    box.replaceChildren(choose(el, button, '1면 제목', CARDS.p1, cn.p1, (id) => { cn.p1 = id; paintCards(); }), choose(el, button, '2면 문제를 해결할 과학기술 설명', CARDS.p2, cn.p2, (id) => { cn.p2 = id; paintCards(); }),
      choose(el, button, '3면 과학기술의 장점과 전망', CARDS.p3, cn.p3, (id) => { cn.p3 = id; paintCards(); }), choose(el, button, '자료 출처', CARDS.src, cn.src, (id) => { cn.src = id; paintCards(); }),
      el('div', {class: 'fu-cards3'}, ['p1', 'p2', 'p3'].map((k, i) => el('div', {class: 'fu-page cn'}, el('small', {}, `${i + 1}면`), el('p', {}, lab(CARDS[k], cn[k]) || '카드를 골라요'))), el('small', {class: 'fu-src'}, '출처: ' + (lab(CARDS.src, cn.src) || '비어 있음'))),
      cn.done ? '' : button('카드 뉴스 면 저장하기', () => {
        if (!cn.p1 || !cn.p2 || !cn.p3 || !cn.src) { status.textContent = '세 면과 출처를 모두 골라 주세요.'; return; }
        if (cn.p2 === 'none') { status.textContent = '2면에는 과학기술이 문제를 어떻게 푸는지 설명이 들어가야 해요.'; return; }
        if (cn.src === 'nosrc') { status.textContent = '출처가 없는 카드 뉴스는 믿기 어려워요. 출처를 골라요.'; return; }
        if (cn.p1 !== cn.p2 || cn.p2 !== cn.p3) { status.textContent = '세 면이 같은 주제로 이어져야 해요.'; return; }
        cn.done = true; paintCards(); finish(true, 'made', '카드 뉴스 면을 저장했어요.');
      }, 'mission-go'));
    if (!cn.done) status.textContent = '토의로 정한 주제에 맞게 세 면을 조립하고 출처를 밝혀요.';
  }
  function paintPrint() {
    const gp = others['R4-G02']?.mem?.picture, ga = others['R4-G03']?.mem?.article;
    const picOk = gp?.done, artOk = ga?.done, cardOk = cn.done;
    const slot = (name, ok, body, hint) => el('div', {class: 'fu-page slot' + (ok ? '' : ' missing')}, el('small', {}, name), ok ? body : el('p', {class: 'empty'}, hint));
    const picBody = picOk ? el('div', {}, el('p', {}, `${lab(PIC_FIELD, gp.field)} 분야 그림`), el('p', {class: 'fu-basis'}, (gp.stick || []).map((id) => lab(PIC_STICK, id)).join(', '))) : null;
    const artBody = artOk ? el('div', {}, el('h4', {}, lab(ART.title, ga.title)), el('p', {class: 'fu-basis'}, '근거: ' + lab(ART.evid, ga.evid))) : null;
    const cnBody = cardOk ? el('div', {}, el('p', {}, lab(CARDS.p1, cn.p1)), el('p', {class: 'fu-basis'}, '출처: ' + lab(CARDS.src, cn.src))) : null;
    const qr = el('canvas', {class: 'fu-qr', width: 168, height: 168, 'aria-label': '반 광장 공유 코드 (가상)'});
    if (pr.code) { const c = qr.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 168, 168); let seed = pr.code; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { seed = (seed * 9301 + 49297) % 233280; const corner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13); const on = corner ? (x % 6 === 0 || y % 6 === 0 || (x % 6 > 1 && x % 6 < 5 && y % 6 > 1 && y % 6 < 5)) : seed / 233280 > 0.5; if (on) { c.fillStyle = '#1d2433'; c.fillRect(x * 8, y * 8, 8, 8); } } }
    box.replaceChildren(el('div', {class: 'fu-frame'}, slot('그림 면', picOk, picBody, '미래 전망대에서 그림 면을 만들면 여기에 들어가요.'), slot('기사 면', artOk, artBody, '미래 신문사에서 기사 면을 만들면 여기에 들어가요.'), slot('카드 뉴스 면', cardOk, cnBody, '이 방송실에서 카드 뉴스 면을 먼저 만들어요.')),
      pr.done ? el('div', {class: 'fu-share'}, qr, el('p', {}, '반 광장 공유 코드를 만들었어요. 게임 안에서만 쓰는 가상 코드예요.')) : el('div', {class: 'bench-seg'},
        button('세 면을 인쇄기 틀에 배치하기', () => { if (!cardOk) { status.textContent = '카드 뉴스 면이 아직 없어요.'; return; } pr.placed = true; status.textContent = picOk && artOk ? '세 면을 배치했어요. 기사의 근거와 출처를 점검해요.' : '만든 면을 배치했어요. 비어 있는 면은 그 방에서 만들면 채워져요. 근거와 출처를 점검해요.'; paintPrint(); }, 'mission-go'),
        pr.placed ? button('근거와 출처 점검하기', () => { pr.checked = true; status.textContent = '면마다 근거와 출처가 있어요.'; paintPrint(); }, 'mission-go') : '',
        pr.checked ? button('신문 발행하고 공유 코드 만들기', () => { pr.code = 1 + Math.floor(Math.random() * 99999); pr.done = true; paintPrint(); finish(true, 'printed', '우리 마을 미래 신문을 발행했어요.'); }, 'mission-go') : ''));
    if (!pr.done && !pr.placed) status.textContent = '그림 면, 기사 면, 카드 뉴스 면을 모아 신문을 발행해요.';
  }
  const paint = {picture: paintPicture, article: paintArticle, cards: paintCards, print: paintPrint}[mode];
  paint();
  const was = {picture: pic.done, article: art.done, cards: cn.done, print: pr.done}[mode];
  if (was) { fired = true; later(onReady); status.textContent = '이미 만들었어요.'; }
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- R4-G04 마을 문제 계기판 (모형: 계기판 높이, 색만 보여 주고 숫자는 쓰지 않음)
const GAUGE = [['job', '일자리 감소'], ['privacy', '개인 정보 유출'], ['pop', '경제 활동 인구 감소'], ['climate', '이상 기후 증가']];
const TECH = [
  ['drone', '새 일자리: 드론 조종사', 'job', 35, '새 직업을 배우려면 교육과 준비가 필요해요', [['a', '새 직업 교육 기회를 넓혀요'], ['b', '교육 없이 바로 일하게 해요']]],
  ['bigdata', '새 일자리: 빅데이터 분석가', 'job', 35, '데이터를 모을 때 개인 정보를 지켜야 해요', [['a', '개인 정보 보호 규칙을 지켜요'], ['b', '모든 데이터를 그대로 공개해요']]],
  ['bio', '생체 인식 기술', 'privacy', 35, '생체 정보가 새어 나가면 바꾸기 어려워요', [['a', '생체 정보를 암호화해 안전하게 보관해요'], ['b', '생체 정보를 사진으로 찍어 둬요']]],
  ['crypto', '데이터 암호화 기술', 'privacy', 35, '열쇠를 잃으면 자료를 열지 못할 수 있어요', [['a', '열쇠를 안전하게 관리해요'], ['b', '열쇠를 게시판에 붙여 둬요']]],
  ['sensor', '스마트 센서로 건강 유지', 'pop', 25, '기기를 쓰기 어려운 어르신도 있어요', [['a', '쉬운 사용법을 안내하고 곁에서 도와요'], ['b', '어려우면 쓰지 않게 해요']]],
  ['helper', '인공지능 로봇의 생활 지원', 'pop', 25, '배운 자료에 따라 결과가 치우칠 수 있어요', [['a', '사람이 증거로 결과를 확인해요'], ['b', '로봇이 정하면 그대로 따라요']]],
  ['renew', '재생에너지 이용', 'climate', 25, '날씨에 따라 만드는 전기의 양이 달라져요', [['a', '여러 에너지를 함께 써요'], ['b', '맑은 날에만 전기를 써요']]],
  ['green', '친환경 건축 기술', 'climate', 25, '처음 짓는 데 비용이 들어요', [['a', '마을이 함께 계획을 세워요'], ['b', '짓지 않고 미뤄요']]],
  ['iot', '사물 인터넷 재해 알림', 'climate', 25, '편리하지만 개인 정보가 새어 나갈 수 있어요', [['a', '보안을 점검하고 믿을 수 있는 프로그램을 써요'], ['b', '편리하니 걱정하지 않아요']]],
];
const zone = (v) => (v >= 70 ? ['#d9483b', '빨강'] : v >= 40 ? ['#f0c24a', '노랑'] : ['#4caf6a', '초록']);
export function problemGauges({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const d = device(el, mode === 'limits' ? '한계 카드 모아 보기' : '마을 문제 계기판 (모형)', '문제 계기판 네 개');
  const {c, status, tray, node} = d;
  const m = memory.gauge ??= {placed: {}, flipped: {}, fixed: {}};
  let sel = null, alive = true, raf = 0, fired = false;
  const level = (g) => Math.max(10, 100 - TECH.filter((t) => t[2] === g && m.placed[t[0]]).reduce((a, t) => a + t[3], 0));
  const shown = {job: 100, privacy: 100, pop: 100, climate: 100};
  function draw() {
    if (!alive) return;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#1d2433'; c.fillRect(0, 0, 720, 380);
    GAUGE.forEach(([g, name], i) => {
      const cx = 95 + i * 177, cy = 190; shown[g] += (level(g) - shown[g]) * 0.08;
      for (let k = 0; k < 3; k++) { c.strokeStyle = ['#4caf6a', '#f0c24a', '#d9483b'][k]; c.lineWidth = 18; c.beginPath(); c.arc(cx, cy, 64, Math.PI + k * Math.PI / 3 + 0.02, Math.PI + (k + 1) * Math.PI / 3 - 0.02); c.stroke(); }
      const a = Math.PI + (shown[g] / 100) * Math.PI; c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56); c.stroke();
      c.fillStyle = '#e8ecf2'; c.beginPath(); c.arc(cx, cy, 6, 0, Math.PI * 2); c.fill();
      c.font = FONT(14, true); c.textAlign = 'center'; c.fillText(name, cx, cy + 34);
      const [col, zn] = zone(level(g)); c.fillStyle = col; c.fillText(zn, cx, cy + 56);
      if (g === 'pop' && TECH.filter((t) => t[2] === 'pop').every((t) => m.placed[t[0]])) { c.fillStyle = '#ffd35a'; c.font = FONT(12, true); c.fillText('과학만으로는 다 내려가지 않음', cx, cy + 78); }
    });
    c.fillStyle = '#e8ecf2'; c.font = FONT(15, true); c.textAlign = 'left'; c.fillText(mode === 'limits' ? '기술 카드를 뒤집어 한계를 보고 보완 방법을 골라요.' : `놓은 기술 카드 ${Object.keys(m.placed).length}/${TECH.length}`, 16, 28);
    raf = requestAnimationFrame(draw);
  }
  function renderTray() {
    tray.replaceChildren();
    if (mode === 'limits') {
      tray.append(el('div', {class: 'fu-limits'}, TECH.map(([id, name, , , limit, fixes]) => {
        const open = m.flipped[id];
        return el('div', {class: 'fu-limit' + (open ? ' open' : '') + (m.fixed[id] ? ' fixed' : '')}, el('strong', {}, name),
          open ? el('p', {}, '한계: ' + limit) : button('뒤집어 보기', () => { m.flipped[id] = true; renderTray(); check(); }, 'bench-opt'),
          open && !m.fixed[id] ? el('div', {class: 'bench-seg'}, fixes.map(([fid, f]) => button(f, () => { if (fid === 'a') { m.fixed[id] = true; status.textContent = '알맞은 보완 방법이에요.'; } else status.textContent = '그 방법은 한계를 줄이지 못해요. 다른 방법을 골라요.'; renderTray(); check(); }, 'bench-opt'))) : '',
          m.fixed[id] ? el('p', {class: 'fu-ok'}, '보완: ' + fixes.find((x) => x[0] === 'a')[1]) : '');
      })));
      return;
    }
    const pool = TECH.filter((t) => !m.placed[t[0]]);
    if (!pool.length) { tray.append(el('span', {class: 'eco-level'}, '기술 카드를 모두 놓았어요.')); return; }
    tray.append(el('div', {class: 'fu-deck'}, pool.map(([id, name]) => { const b = button(name, () => { sel = sel === id ? null : id; renderTray(); }, 'bench-opt'); b.setAttribute('aria-pressed', String(sel === id)); return b; })),
      el('div', {class: 'bench-seg'}, GAUGE.map(([g, name]) => button(`${name} 계기판에 놓기`, () => {
        if (!sel) { status.textContent = '기술 카드를 먼저 고르세요.'; return; }
        const t = TECH.find((x) => x[0] === sel);
        if (t[2] !== g) { status.textContent = `${t[1]} 카드는 다른 문제에 더 알맞아요. 이 기술이 무엇을 돕는지 떠올려요.`; return; }
        m.placed[sel] = true; status.textContent = `${t[1]} 카드를 놓자 ${name} 계기판이 내려가요.`; sel = null; renderTray(); check();
      }, 'mission-go'))));
  }
  function check() {
    if (fired) return;
    if (mode === 'limits') {
      const need = ['iot', 'helper'].every((k) => m.fixed[k]) && Object.keys(m.fixed).length >= 4;
      if (need) { fired = true; status.textContent = '한계 카드를 모아 봤어요. 편리한 기술에도 한계가 있어 보완이 필요해요.'; onAction('limited'); onReady?.(); }
      else if (!status.textContent) status.textContent = '사물 인터넷 재해 알림과 인공지능 로봇 카드를 포함해 네 장 이상 보완해요.';
      return;
    }
    if (TECH.every((t) => m.placed[t[0]])) { fired = true; status.textContent = '기술 카드를 모두 놓았어요. 경제 활동 인구 계기판은 노란색에서 더 내려가지 않아요.'; onAction('placed'); onReady?.(); }
  }
  status.textContent = mode === 'limits' ? '사물 인터넷 재해 알림과 인공지능 로봇 카드를 포함해 네 장 이상 뒤집고 보완 방법을 골라요.' : '기술 카드를 고른 뒤 알맞은 문제 계기판에 놓으세요.';
  renderTray();
  fired = mode === 'limits' ? ['iot', 'helper'].every((k) => m.fixed[k]) && Object.keys(m.fixed).length >= 4 : TECH.every((t) => m.placed[t[0]]);
  if (fired) { later(onReady); status.textContent = mode === 'limits' ? '한계 카드를 모아 봤어요.' : '기술 카드를 모두 놓았어요. 경제 활동 인구 계기판은 노란색에서 더 내려가지 않아요.'; }
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}

// ---------------------------------------------------------------- R4-G04 생체 인식 금고와 암호화 전송 (모형)
export function securityLab({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const m = memory.sec ??= {pwOwner: false, pwThief: false, bioOwner: false, bioTry: false, plain: false, crypt: false};
  const stage = el('div', {class: 'fu-sec'});
  const {node, status} = panel(el, mode === 'cipher' ? '암호화 전송 (모형)' : '두 금고 비교 (모형)', 'fu-security', stage);
  const MSG = '내일 3시 도서관 앞에서 만나요';
  const scramble = (s) => [...s].map((ch) => { const k = ch.charCodeAt(0); return k >= 0xac00 && k <= 0xd7a3 ? String.fromCharCode(0xac00 + ((k - 0xac00 + 4001) % 11172)) : ch === ' ' ? ' ' : '#'; }).join('');
  // thiefSeen: 도둑이 비밀번호 금고를 연 것을 한 번이라도 본 기록. 뒤에 주인이 다시 열어도 지워지지 않는다.
  const vaultDone = () => (m.pwThief || m.thiefSeen) && m.bioOwner && m.bioTry;
  let fired = mode === 'cipher' ? m.plain && m.crypt : vaultDone();
  function paint() {
    if (mode === 'cipher') {
      stage.replaceChildren(el('div', {class: 'fu-wire'}, el('div', {class: 'fu-end'}, el('strong', {}, '보내는 신항이'), el('p', {}, MSG)), el('div', {class: 'fu-mid'}, el('strong', {}, '중간에서 가로챈 사람'), el('p', {}, m.last === 'plain' ? MSG : m.last === 'crypt' ? scramble(MSG) : '...')), el('div', {class: 'fu-end'}, el('strong', {}, '받는 친구 (열쇠 있음)'), el('p', {}, m.last ? MSG : '...'))),
        el('div', {class: 'bench-seg'}, button('그대로 보내기', () => { m.plain = true; m.last = 'plain'; status.textContent = '가로챈 사람도 내용을 그대로 읽었어요.'; paint(); }, 'mission-go'), button('암호화해서 보내기', () => { m.crypt = true; m.last = 'crypt'; status.textContent = '가로챈 사람은 알아볼 수 없는 글자만 봤고, 열쇠가 있는 친구만 원래 내용을 읽었어요.'; paint(); }, 'mission-go')));
    } else {
      const v = (name, open, who) => el('div', {class: 'fu-vault' + (open ? ' open' : '')}, el('strong', {}, name), el('p', {}, open ? `${who}이 열었어요` : '잠김'));
      stage.replaceChildren(el('div', {class: 'fu-vaults'}, v('비밀번호 금고', m.pwOwner || m.pwThief, m.pwThief ? '도둑' : '주인'), v('생체 인식 금고', m.bioOwner, '주인')),
        el('div', {class: 'bench-seg'}, button('비밀번호 금고: 주인이 열기', () => { m.pwOwner = true; m.pwThief = false; status.textContent = '주인이 비밀번호로 열었어요.'; paint(); }, 'bench-opt'), button('비밀번호 금고: 도둑이 엿본 비밀번호로 열기', () => { m.pwThief = true; m.thiefSeen = true; status.textContent = '엿본 비밀번호만 알면 다른 사람도 열 수 있어요.'; paint(); check(); }, 'bench-opt')),
        el('div', {class: 'bench-seg'}, ...[['지문으로', 'finger'], ['얼굴로', 'face'], ['홍채로', 'iris']].map(([n]) => button(`생체 인식 금고: 주인의 ${n} 열기`, () => { m.bioOwner = true; status.textContent = `주인의 ${n} 열었어요.`; paint(); check(); }, 'bench-opt')),
          button('생체 인식 금고: 도둑이 흉내 내기', () => { m.bioTry = true; status.textContent = '몸의 특징이 달라 도둑은 열지 못했어요.'; paint(); check(); }, 'bench-opt')));
    }
    check();
  }
  function check() {
    const ok = mode === 'cipher' ? m.plain && m.crypt : vaultDone();
    if (ok && !fired) { fired = true; onAction(mode === 'cipher' ? 'ciphered' : 'vaulted'); onReady?.(); }
  }
  status.textContent = mode === 'cipher' ? '같은 메시지를 그대로 보낼 때와 암호화해서 보낼 때를 비교해요.' : '두 금고를 주인과 도둑이 열어 보게 해요.';
  paint();
  if (fired) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- R4-G08, G09 연구원 명함 (별명과 아바타만 쓰고 실명, 사진, 연락처 칸은 없음)
export const JOBS = {
  zoo: {name: '동물사육사', does: '동물의 생활 방식을 이해하고 돌봐요', k: '동물의 생활 방식에 대한 지식', s: '행동을 관찰해 건강 상태를 관리하는 기능', a: '생명에 대한 사랑과 책임감', effort: '동물도감을 꾸준히 읽고 주위 동물을 관찰하는 습관 기르기', future: '스마트 센서로 멀리서도 동물 건강을 살펴요'},
  vet: {name: '수의사', does: '아픈 동물을 치료해요', k: '동물 몸의 구조에 대한 지식', s: '증상을 관찰하고 원인을 추리하는 기능', a: '생명을 존중하는 태도', effort: '동물과 몸에 관한 책을 읽고 주변 동물 관찰하기', future: '인공지능과 함께 동물의 병을 진단해요'},
  soccer: {name: '축구 선수', does: '팀과 함께 경기에서 골을 넣어요', k: '공을 차는 원리 (발의 힘, 차는 방향)', s: '공의 속력과 방향을 관찰하고 이동할 위치를 예상하는 기능', a: '팀과 의사소통하며 협력하는 태도', effort: '꾸준히 연습하고 경기 영상을 분석하기', future: '센서로 움직임을 분석하며 훈련해요'},
  reporter: {name: '스포츠 전문기자', does: '경기를 분석해 기사를 써요', k: '경기 규칙에 대한 지식', s: '경기를 분석하는 기능', a: '열정과 존중', effort: '운동 관련 책을 많이 읽고 선수 움직임 관찰하기', future: '홀로그램으로 선수를 인터뷰해요'},
  cook: {name: '요리사', does: '재료를 손질해 음식을 만들어요', k: '열을 가하면 재료의 성질이 달라진다는 지식', s: '식재료를 분류하는 기능', a: '위생과 불 안전을 지키는 태도', effort: '여러 재료를 관찰하며 요리해 보기', future: '인공지능과 맞춤 식단을 만들어요'},
  doctor: {name: '의사', does: '아픈 사람을 치료해요', k: '인체 구조와 감염병에 대한 지식', s: '증상을 관찰하고 원인을 추리하는 기능', a: '생명을 사랑하고 존중하는 태도', effort: '몸과 건강에 관한 책을 꾸준히 읽기', future: '로봇과 함께 환자를 치료해요'},
  robot: {name: '로봇 공학자', does: '사람을 돕는 로봇을 만들어요', k: '로봇의 구조와 기능에 대한 지식', s: '움직임을 예상하고 모형을 활용하는 기능', a: '사회 문제 해결에 도움을 주려는 태도', effort: '만들기와 코딩을 꾸준히 연습하기', future: '어르신의 생활을 돕는 로봇을 만들어요'},
  climate: {name: '기후변화 대응 전문가', does: '이상 기후의 영향을 조사하고 대응 방법을 알려요', k: '기후와 탄소 배출에 대한 지식', s: '자료를 조사하고 분석하는 기능', a: '환경을 아끼는 태도', effort: '날씨와 기후 자료를 꾸준히 살펴보기', future: '탄소 배출을 줄이는 방법을 마을에 알려요'},
  landscape: {name: '조경원', does: '나무와 꽃으로 공간을 가꿔요', k: '식물이 자라는 조건에 대한 지식', s: '식물 상태를 관찰하는 기능', a: '자연을 아끼는 태도', effort: '식물을 길러 보며 관찰 일지 쓰기', future: '드론과 센서로 식물 상태를 실시간 확인해요'},
  fire: {name: '소방관', does: '불을 끄고 사람을 구해요', k: '연소의 조건에 대한 지식', s: '화재 원인을 추리하고 의사소통하는 기능', a: '생명을 존중하는 태도', effort: '체력을 기르고 안전 규칙 익히기', future: '인공지능 화재 감지 기술로 빨리 출동해요'},
  farmer: {name: '농부', does: '작물을 기르고 거둬요', k: '계절에 따라 태양 고도와 기온이 달라진다는 지식', s: '날씨 자료를 조사하고 기록하는 기능', a: '자연을 아끼는 태도', effort: '텃밭을 가꾸며 날씨를 기록하기', future: '인공지능과 로봇으로 멀리서 농장을 관리해요'},
  webtoon: {name: '웹툰 작가', does: '이야기를 그림으로 그려 올려요', k: '이야기 주제와 관련된 과학 지식', s: '주변 현상을 관찰하고 표현하는 기능', a: '문화를 공유하고 즐기는 태도', effort: '주변을 관찰하며 날마다 그려 보기', future: '가상 현실로 독자와 만나요'},
};
const JOB_LIST = Object.entries(JOBS).map(([id, j]) => [id, j.name]);
const other = (id, key) => { const ids = Object.keys(JOBS); const o = ids[(ids.indexOf(id) + 5) % ids.length]; return JOBS[o][key]; };
const FORMS = [['pages', '여러 장'], ['video', '동영상'], ['qr', 'QR 코드'], ['link', '링크'], ['audio', '오디오']];
export function nameCard({el, button, mode, task = {}, memory = {}, others = {}, avatarView, nickname = '연구원', onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const box = el('div', {class: 'fu-nc'});
  const {node, status} = panel(el, {design: '명함 설계도', make: '디지털 명함 만들기', check: '게시 전 점검표'}[mode], 'fu-namecard', box);
  const src = others['R4-G08']?.mem?.card;
  const card = memory.card ??= (src && src.done ? {...src} : {job: null, k: null, s: null, a: null, effort: null, future: null, done: false});
  const made = memory.made ??= {form: null, done: false};
  const chk = memory.chk ??= {extra: ['friendPhoto', 'friendPhone'], ticks: [], done: false};
  let fired = false;
  const face = () => { const v = avatarView?.(); return v ? el('div', {class: 'fu-avatar'}, v) : el('div', {class: 'fu-avatar empty'}, '아바타'); };
  function cardView(j, extra = []) {
    return el('div', {class: 'fu-card'}, face(), el('div', {class: 'fu-card-body'}, el('small', {}, nickname), el('h4', {}, j ? j.name : '직업을 골라요'), el('p', {}, j ? j.does : ''),
      el('ul', {}, card.k ? el('li', {}, '지식: ' + card.k) : '', card.s ? el('li', {}, '기능: ' + card.s) : '', card.a ? el('li', {}, '태도: ' + card.a) : ''),
      card.effort ? el('p', {}, '해야 할 노력: ' + card.effort) : '', card.future ? el('p', {}, '미래 모습: ' + card.future) : '', ...extra));
  }
  function field(label, key, j) {
    if (!j) return '';
    const opts = [[j[key], j[key]], [other(card.job, key), other(card.job, key)]].sort((a, b) => (a[0] > b[0] ? 1 : -1));
    return choose(el, button, label, opts, card[key], (v) => { card[key] = v; if (v !== j[key]) status.textContent = `그 카드는 ${j.name}과 관계가 약해요. 이 직업이 하는 일을 떠올려요.`; else status.textContent = '좋아요.'; paintDesign(); });
  }
  function paintDesign() {
    const j = JOBS[card.job];
    box.replaceChildren(choose(el, button, '희망 직업 (직업 카드에서 고르기)', JOB_LIST, card.job, (id) => { if (card.done) return; Object.assign(card, {job: id, k: null, s: null, a: null, effort: null, future: null}); paintDesign(); }),
      field('과학적 요소: 지식', 'k', j), field('과학적 요소: 기능', 's', j), field('과학적 요소: 태도', 'a', j), field('해야 할 노력', 'effort', j), field('미래 모습', 'future', j), cardView(j),
      card.done ? '' : button('설계도 저장하기', () => {
        if (!j) { status.textContent = '희망 직업을 먼저 골라요.'; return; }
        const keys = ['k', 's', 'a', 'effort', 'future']; if (keys.some((k) => !card[k])) { status.textContent = '모든 칸을 채워 주세요.'; return; }
        if (keys.some((k) => card[k] !== j[k])) { status.textContent = `${j.name}과 관계가 약한 카드가 있어요. 다시 살펴봐요.`; return; }
        card.done = true;
        if (mode !== 'design') { paintMake(); status.textContent = '설계도를 채웠어요. 이제 명함 형태를 골라요.'; return; }
        paintDesign(); status.textContent = '설계도를 저장했어요. 반 광장 전시관에서 명함으로 완성해요.'; if (!fired) { fired = true; onAction('designed'); onReady?.(); }
      }, 'mission-go'));
  }
  function formView(j) {
    const f = made.form;
    if (f === 'pages') return el('div', {class: 'fu-forms'}, el('div', {class: 'fu-card mini'}, face(), el('div', {class: 'fu-card-body'}, el('small', {}, '1면'), el('h4', {}, j.name), el('p', {}, j.does))), el('div', {class: 'fu-card mini'}, el('div', {class: 'fu-card-body'}, el('small', {}, '2면'), el('p', {}, '과학적 요소: ' + [card.k, card.s, card.a].join(', ')), el('p', {}, '해야 할 노력: ' + card.effort))));
    if (f === 'video') return el('div', {class: 'fu-forms'}, ['하는 일: ' + j.does, '과학적 요소: ' + card.k, '미래 모습: ' + card.future].map((t, i) => el('div', {class: 'fu-frame3'}, el('small', {}, `장면 ${i + 1}`), el('p', {}, t))));
    if (f === 'qr') { const q = el('canvas', {class: 'fu-qr', width: 120, height: 120, 'aria-label': '직업 사전 쪽으로 가는 가상 코드'}); const c = q.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 120, 120); let s = j.name.length * 977; for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) { s = (s * 9301 + 49297) % 233280; if (s / 233280 > 0.5 || (x < 4 && y < 4)) { c.fillStyle = '#1d2433'; c.fillRect(x * 8, y * 8, 8, 8); } } return el('div', {class: 'fu-forms'}, cardView(j), el('div', {}, q, el('p', {}, '게임 안 직업 사전 쪽으로 연결돼요.'))); }
    if (f === 'link') return el('div', {class: 'fu-forms'}, cardView(j, [el('span', {class: 'fu-linkbtn'}, '직업 사전에서 더 보기 (게임 안)')]));
    if (f === 'audio') return el('div', {class: 'fu-forms'}, cardView(j, [el('span', {class: 'fu-wave'}, '음성 소개: ' + j.does)]));
    return cardView(j);
  }
  function paintMake() {
    const j = JOBS[card.job];
    if (!card.done || !j) { box.replaceChildren(el('p', {class: 'eco-how'}, '명함 설계도가 아직 없어요. 여기서 먼저 설계도를 채워요.')); paintDesign(); return; }
    box.replaceChildren(choose(el, button, '명함 형태 고르기', FORMS, made.form, (id) => { made.form = id; paintMake(); }), formView(j),
      made.done ? '' : button('이 형태로 명함 완성하기', () => { if (!made.form) { status.textContent = '형태를 먼저 골라요.'; return; } made.done = true; paintMake(); status.textContent = '명함을 완성했어요.'; if (!fired) { fired = true; onAction('made'); onReady?.(); } }, 'mission-go'));
  }
  const CHECKS = [['noOther', '다른 사람의 개인 정보가 없어요'], ['nick', '실명 대신 별명만 썼어요'], ['avatar', '사진 자리에 아바타 그림을 썼어요'], ['sci', '과학적 요소와 해야 할 노력 칸이 있어요']];
  function paintCheck() {
    const j = JOBS[card.job];
    const extras = chk.extra.map((x) => x === 'friendPhoto' ? el('div', {class: 'fu-bad'}, '척척이 넣은 칸: 함께 찍은 친구 얼굴 사진', button('이 칸 빼기', () => { chk.extra = chk.extra.filter((y) => y !== x); paintCheck(); }, 'bench-opt')) : el('div', {class: 'fu-bad'}, '척척이 넣은 칸: 친구 연락처 010-0000-0000', button('이 칸 빼기', () => { chk.extra = chk.extra.filter((y) => y !== x); paintCheck(); }, 'bench-opt')));
    box.replaceChildren(j ? cardView(j, extras) : el('p', {}, '명함이 아직 없어요.'),
      el('ul', {class: 'cn-check'}, CHECKS.map(([id, t]) => { const on = chk.ticks.includes(id); return el('li', {class: on ? 'ok' : ''}, el('span', {}, t), button(on ? '확인함' : '확인하기', () => { if (id === 'noOther' && chk.extra.length) { status.textContent = '아직 다른 사람의 정보가 들어간 칸이 있어요. 먼저 빼요.'; return; } chk.ticks = toggle(chk.ticks, id); paintCheck(); }, 'bench-opt')); })));
    const pass = !chk.extra.length && CHECKS.every(([id]) => chk.ticks.includes(id));
    status.textContent = pass ? '점검을 모두 통과했어요.' : '명함을 살펴보고 점검표를 하나씩 확인해요.';
    if (pass && !fired) { fired = true; chk.done = true; onAction('checked'); onReady?.(); }
  }
  const run = {design: paintDesign, make: paintMake, check: paintCheck}[mode];
  run();
  const was = {design: card.done, make: made.done, check: chk.done}[mode];
  if (was) { fired = true; later(onReady); }
  else if (!status.textContent) status.textContent = mode === 'design' ? '희망 직업을 고르고 칸을 채워요.' : '';
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- R4-G09 2050년 전시관 전시물 8개
const EXHIBITS = [
  {t: '동물사육사 명함', body: ['하는 일: 동물의 생활 방식을 이해하고 돌봐요', '연락처: 010-0000-0000 (이웃 어른의 번호)']},
  {t: '축구 선수 명함', body: ['함께 찍은 친구 얼굴 사진이 붙어 있어요', '친구 말: 이 사진 올려도 된다고 한 적 없는데.']},
  {t: '웹툰 작가 명함의 댓글', body: ['댓글: 이런 꿈은 이상해. 그만둬.']},
  {t: '요리사 명함', body: ['좋아하는 음식: 떡볶이', '오늘의 날씨: 맑음']},
  {t: '로봇 공학자 명함', body: ['인터넷에서 가져온 로봇 사진', '사진 출처: 비어 있음']},
  {t: '수의사 명함', body: ['과학적 요소: 동물 몸의 구조에 대한 지식', '해야 할 노력: 주변 동물 관찰하기']},
  {t: '조경원 명함의 댓글', body: ['댓글: 멋진 꿈이에요. 응원해요.']},
  {t: '소방관 명함', body: ['사진 자리: 아바타 그림', '미래 모습: 인공지능 화재 감지 기술로 빨리 출동해요']},
];
export function exhibitWall({el, onReady}) {
  const {node, status} = panel(el, '2050년 반 광장 전시관', 'fu-exhibit', el('div', {class: 'fu-wall'}, EXHIBITS.map((x, i) => el('div', {class: 'fu-ex'}, el('small', {}, `전시물 ${i + 1}`), el('strong', {}, x.t), x.body.map((b) => el('p', {}, b))))));
  status.textContent = '전시물을 하나씩 살펴보세요.';
  later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- R4-G10 구분 프로그램의 치우친 자료 실험과 협력 비교 (모형)
const TRAP = '/assets/missions/r4g10/';
export function wildCam({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const m = memory.cam ??= {day: false, both: false, trained: null, coop: false};
  const box = el('div', {class: 'fu-cam'});
  const {node, status} = panel(el, mode === 'coop' ? '분류 시간 비교 (모형)' : '구분 프로그램 가르치기 (모형)', 'fu-wild', box);
  let fired = mode === 'coop' ? m.coop : m.day && m.both;
  const NIGHT = [['n1', '밤에 풀을 먹는 누', '먹기'], ['n2', '밤에 쉬는 기린', '쉬기'], ['n3', '밤에 걷는 사자', '이동하기']];
  const guess = {day: ['먹기', '모르겠어요', '모르겠어요'], both: ['먹기', '쉬기', '이동하기']};
  function paint() {
    if (mode === 'coop') {
      const long = el('i', {}, '오래 걸림'), short = el('i', {class: m.coop ? 'short' : 'hide'}, m.coop ? '빨리 끝남' : '');
      long.style.width = '95%'; short.style.width = m.coop ? '22%' : '0%';
      box.replaceChildren(el('div', {class: 'fu-bars'}, el('div', {}, el('span', {}, '과학자 세 명이 모두 분류'), long), el('div', {}, el('span', {}, '여러 사람이 나누어 분류'), short)),
        el('p', {class: 'eco-caption'}, '막대 길이는 모형 값이에요.'), m.coop ? '' : button('사진 더미를 여러 사람에게 나누어 주기', () => { m.coop = true; paint(); status.textContent = '많은 사람이 나누어 분류하니 훨씬 빨리 끝났어요.'; if (!fired) { fired = true; onAction('compared'); onReady?.(); } }, 'mission-go'));
      return;
    }
    const res = m.trained ? guess[m.trained] : null;
    box.replaceChildren(el('div', {class: 'fu-night'}, NIGHT.map(([id, alt, truth], i) => el('figure', {}, el('img', {src: TRAP + id + '.jpg', alt}), el('figcaption', {}, res ? `프로그램: ${res[i]} ${res[i] === truth ? '(맞음)' : '(틀림)'}` : '아직 시험하지 않았어요')))),
      el('div', {class: 'bench-seg'}, button('낮 사진만 가르치고 밤 사진으로 시험하기', () => { m.trained = 'day'; m.day = true; status.textContent = '낮 사진만 배운 프로그램은 밤 사진 세 장 가운데 한 장만 맞혔어요.'; paint(); check(); }, 'mission-go'),
        button('낮과 밤 사진을 함께 가르치고 시험하기', () => { m.trained = 'both'; m.both = true; status.textContent = '낮과 밤 사진을 함께 배운 프로그램은 세 장을 모두 맞혔어요.'; paint(); check(); }, 'mission-go')),
      el('p', {class: 'eco-caption'}, '맞힌 장수는 모형 값이에요.'));
  }
  function check() { if (m.day && m.both && !fired) { fired = true; onAction('tested'); onReady?.(); } }
  if (!status.textContent) status.textContent = mode === 'coop' ? '두 방법으로 사진을 분류하는 데 걸리는 시간을 비교해요.' : '가르친 사진에 따라 결과가 어떻게 달라지는지 두 번 시험해요.';
  paint();
  if (fired) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- R4-G11 소장실: 타임캡슐 편지와 소장의 정체
export function directorRoom({el, button, mode, task = {}, memory = {}, others = {}, avatarView, nickname = '연구원', onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const m = memory.dir ??= {revealed: false};
  // 명함은 직업 설계실(R4-G08)에서 만들지만, 거기서 만들지 않았으면 명함 전시회(R4-G09)에서 처음 채운 명함을 쓴다.
  const c8 = others['R4-G08']?.mem?.card, cap = others['R4-G02']?.mem?.capsule, card = c8?.done ? c8 : others['R4-G09']?.mem?.card, job = card?.done ? JOBS[card.job] : null;
  const box = el('div', {class: 'fu-dir'});
  const {node, status} = panel(el, mode === 'letter' ? '소장의 책상 위 편지' : '소장실', 'fu-director', box);
  let fired = m.revealed;
  function paint() {
    if (mode === 'letter') {
      box.replaceChildren(el('div', {class: 'fu-letter sealed'}, el('p', {}, cap?.sealed ? cap.text : '타임캡슐 편지가 없어요. 미래 전망대에서 쓴 편지가 있으면 여기에서 열려요.'), el('small', {}, '10년 전 전망대에서 쓴 편지')));
      status.textContent = '편지를 읽고 현재 정보를 근거로 한 예상을 찾아보세요.';
      return;
    }
    const v = m.revealed ? avatarView?.() : null;
    box.replaceChildren(el('div', {class: 'fu-reveal'}, m.revealed ? el('div', {class: 'fu-avatar big'}, v || el('span', {}, nickname)) : el('img', {src: IMG + 'r4-g11-director.jpg', alt: '얼굴 가리개를 쓴 소장'}),
      el('div', {}, el('h4', {}, m.revealed ? `2050년의 ${nickname}` : '미래 연구소장'), el('p', {}, m.revealed ? (job ? `직함: ${job.name}. ${job.future}` : '직함: 아직 찾는 중. 좋아하는 것에서 출발해 찾아가고 있어요.') : '얼굴 가리개를 쓰고 있어요.'),
        m.revealed ? el('p', {}, '"어떤 직업을 가져도 우리 마을의 작은 신호를 알아채는 사람이 될 수 있어요. 2026년의 당신이 알아챈 것이 지금의 우리 마을을 바꿨어요."') : '')),
      m.revealed ? '' : button('소장에게 가리개를 벗어 달라고 부탁하기', () => { m.revealed = true; paint(); status.textContent = '소장은 2050년의 나였어요.'; if (!fired) { fired = true; onAction('revealed'); onReady?.(); } }, 'mission-go'));
    if (!m.revealed) status.textContent = '소장이 무언가 말하려는 것 같아요.';
  }
  paint();
  if (mode === 'letter' || fired) later(onReady);
  return {node, stop: () => {}};
}

// ---------------------------------------------------------------- 가상 직업 사전 (연습용, 외부 누리집에 연결하지 않음)
const DICT = {
  // rows는 검색 연습(광고 줄 구별하기)에, fieldRows는 관심 분야에서 지식, 기능, 태도 카드를 모을 때 쓴다.
  drone: {name: '드론 조종사', field: 'tech', rows: [['does', '하는 일', '드론을 조종해 촬영, 배송, 농약 뿌리기 같은 일을 해요'], ['sci', '필요한 과학', '비행 원리와 날씨에 대한 지식'], ['same', '비슷한 직업', '항공기 조종사'], ['ad', '광고', '오늘만 할인하는 드론 장난감']],
    fieldRows: [['does', '하는 일', '드론을 조종해 촬영, 배송, 농약 뿌리기 같은 일을 해요'], ['k', '지식', '비행 원리와 날씨에 대한 지식'], ['s', '기능', '바람과 장애물을 살피며 드론을 정확하게 조종하는 기능'], ['a', '태도', '안전 규칙과 다른 사람의 사생활을 지키려는 태도']]},
  ...Object.fromEntries(Object.entries(JOBS).map(([id, j]) => [id, {name: j.name, rows: [['does', '하는 일', j.does], ['k', '지식', j.k], ['s', '기능', j.s], ['a', '태도', j.a]]}])),
};
const DICT_FIELD = [['health', '보건', ['doctor', 'vet']], ['sport', '예술 및 운동', ['soccer', 'reporter', 'webtoon']], ['env', '환경', ['landscape', 'climate', 'farmer']], ['tech', '기술', ['robot', 'drone']], ['society', '사회', ['fire', 'cook', 'zoo']]];
export function jobDict({el, button, mode, task = {}, memory = {}, onAction: fire, onReady}) {
  const onAction = actOf(task, fire);
  const m = memory.dict ??= {job: null, seen: [], done: false, field: null};
  const input = el('input', {type: 'text', maxlength: '20', placeholder: '직업 이름을 넣어 보세요', 'aria-label': '직업 검색어'});
  const out = el('div', {class: 'fu-dict'});
  const {node, status} = panel(el, '가상 직업 사전 (연습용)', 'fu-jobdict', mode === 'find' ? el('div', {class: 'bench-seg'}, input, button('검색하기', () => search(), 'mission-go')) : '', out);
  let fired = m.done;
  function search() { const q = input.value.replace(/\s/g, ''); const hit = Object.entries(DICT).find(([, d]) => d.name.replace(/\s/g, '').includes(q) && q.length >= 2); if (!hit) { status.textContent = '찾는 직업이 없어요. "드론 조종사"처럼 직업 이름을 넣어 보세요.'; return; } m.job = hit[0]; paint(); }
  function page(id) {
    const d = DICT[id];
    return el('div', {class: 'fu-page'}, el('h4', {}, d.name), ((mode === 'field' && d.fieldRows) || d.rows).map(([rid, h, t]) => { const b = button(`${h}: ${t}`, () => {
      if (rid === 'ad') { status.textContent = '광고는 직업 정보가 아니에요. 필요한 줄만 살펴요.'; return; }
      if (!m.seen.includes(id + '.' + rid)) m.seen.push(id + '.' + rid);
      if (mode === 'find' && id === 'drone' && rid === 'does' && !fired) { fired = m.done = true; status.textContent = '드론 조종사가 하는 일을 찾았어요.'; onAction('found'); onReady?.(); }
      if (mode === 'field' && ['k', 's', 'a'].every((k) => m.seen.includes(id + '.' + k)) && !fired) { fired = m.done = true; status.textContent = `${d.name}의 과학적 요소 후보 카드 세 장을 모았어요.`; onAction('collected'); onReady?.(); }
      paint();
    }, 'm-option' + (m.seen.includes(id + '.' + rid) ? ' picked' : '')); return b; }));
  }
  function paint() {
    if (mode === 'field') {
      const f = DICT_FIELD.find((x) => x[0] === m.field);
      out.replaceChildren(choose(el, button, '관심 분야', DICT_FIELD.map(([id, n]) => [id, n]), m.field, (id) => { m.field = id; m.job = null; paint(); }),
        f ? choose(el, button, '직업 목록', f[2].map((id) => [id, DICT[id].name]), m.job, (id) => { m.job = id; paint(); }) : '', m.job ? page(m.job) : '');
      if (!fired) status.textContent = '관심 분야에서 희망 직업을 찾아 지식, 기능, 태도 줄을 눌러 카드로 모아요.';
      return;
    }
    out.replaceChildren(m.job ? page(m.job) : el('p', {class: 'eco-how'}, '검색 결과가 여기에 나와요.'));
    if (!fired && m.job) status.textContent = '결과 화면에서 "하는 일" 줄을 찾아 누르세요.';
  }
  if (!fired) status.textContent = mode === 'find' ? '검색어 칸에 "드론 조종사"를 넣어 보세요.' : '';
  paint();
  if (fired) later(onReady);
  return {node, stop: () => {}};
}
