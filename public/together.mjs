// 함께하기: 선생님이 반마다 켜면 같은 지도의 반 친구가 보이고, 반 친구 채팅과 함께 하는 현장 활동을 쓴다.
// 서버와 몇 초마다 위치를 주고받는다(/api/together). 꺼져 있으면 30초마다 켜졌는지만 확인한다.
// 채팅은 서버가 욕설, 비하, 성적 표현, 위험한 말, 개인 정보, 링크, 도배를 막고 모든 말을 선생님 화면에 남긴다.
import {getAvatarSheet, cleanAvatar, preloadLook} from './sprites.mjs';

export const QUICK = ['안녕', '같이 하자', '도와줘', '고마워', '잘했어'];
const POLL_ON = 2500, POLL_OFF = 30000, BUBBLE_MS = 6000;

export function createTogether({api, me, map, root, make, btn, getPos, onChange}) {
  let alive = true, on = false, chat = false, muted = false, since = 0, timer = 0, busy = false, first = true, unread = 0;
  const others = new Map(), bubbles = new Map(), messages = [];
  let stations = {};

  // ---------------------------------------------------------------- 채팅 창
  const box = make('section', 'tg-chat'); box.hidden = true; box.setAttribute('aria-label', '반 친구 채팅');
  const head = btn('채팅', () => toggle(), 'tg-head'); const badge = make('span', 'tg-badge'); badge.hidden = true; head.append(badge);
  const panel = make('div', 'tg-panel'); panel.hidden = true;
  const list = make('ol', 'tg-list'); list.setAttribute('aria-live', 'polite');
  const note = make('p', 'tg-note');
  const quick = make('div', 'tg-quick');
  for (const q of QUICK) quick.append(btn(q, () => post(q), 'secondary tg-q'));
  const form = make('form', 'tg-form');
  const input = make('input'); input.type = 'text'; input.maxLength = 60; input.autocomplete = 'off'; input.placeholder = '친구에게 보낼 말'; input.setAttribute('aria-label', '친구에게 보낼 말');
  const send = make('button', 'tg-send', '보내기'); send.type = 'submit';
  form.append(input, send);
  form.onsubmit = (e) => { e.preventDefault(); post(input.value); };
  panel.append(list, note, quick, form);
  box.append(head, panel);
  root.append(box);
  const say = (text, bad = false) => { note.textContent = text; note.classList.toggle('bad', bad); };

  function toggle(open = panel.hidden) {
    panel.hidden = !open; box.classList.toggle('open', open);
    if (open) { unread = 0; paint(); input.focus({preventScroll: true}); }
  }
  function paint() {
    badge.hidden = !unread; badge.textContent = unread > 99 ? '99+' : String(unread);
    list.replaceChildren(...messages.slice(-30).map((m) => { const li = make('li', m.mine ? 'mine' : ''); li.append(make('b', '', m.mine ? '나' : m.nickname), document.createTextNode(' ' + m.body)); return li; }));
    list.scrollTop = list.scrollHeight;
    input.disabled = send.disabled = muted; quick.hidden = muted;
    if (muted) say('선생님이 채팅을 잠시 막아 두었어요.', true);
    else if (note.textContent === '선생님이 채팅을 잠시 막아 두었어요.') say('');
  }
  async function post(text) {
    text = String(text || '').trim();
    if (!text || muted) return;
    send.disabled = true;
    try {
      const r = await api('chat', {body: text, map});
      if (r.blocked) say(`보낼 수 없는 말이 있어요(${r.reason}). 고운 말로 다시 써 주세요.`, true);
      else {
        input.value = ''; say('');
        if (!messages.some((m) => m.id === r.id)) messages.push({id: r.id, owner: me.id, nickname: me.nickname, body: text, created: r.created, mine: true, map});
        bubbles.set(me.id, {text, until: performance.now() + BUBBLE_MS});
        paint();
      }
    } catch (e) { say(e.message || '연결을 확인하고 다시 보내 주세요.', true); }
    send.disabled = muted;
  }

  // ---------------------------------------------------------------- 주고받기
  function apply(r) {
    const was = on;
    on = !!r.on; chat = !!r.chat; muted = !!r.muted;
    if (!on) { others.clear(); stations = {}; box.hidden = true; if (was) onChange?.('off'); return; }
    const seen = new Set(), now = performance.now();
    for (const o of r.others || []) {
      seen.add(o.id);
      let m = others.get(o.id);
      if (!m) { m = {id: o.id, x: o.x, y: o.y}; others.set(o.id, m); }
      if (JSON.stringify(m.avatar) !== JSON.stringify(o.avatar)) {
        m.avatar = o.avatar; m.sheet = null;
        const av = cleanAvatar(o.avatar || {});
        if (av.look > 0) preloadLook(av.look).then(() => { m.sheet = null; }).catch(() => {});
      }
      Object.assign(m, {tx: o.x, ty: o.y, dir: o.dir, moving: o.moving, nickname: o.nickname});
    }
    for (const id of [...others.keys()]) if (!seen.has(id)) others.delete(id);
    for (const msg of r.messages || []) {
      if (messages.some((x) => x.id === msg.id)) continue;
      messages.push(msg);
      since = Math.max(since, msg.created - 5); // 서버 시계가 조금씩 달라도 놓치지 않게 5초 겹쳐 받고 id로 거른다
      if (!first && (msg.map === map || msg.mine)) bubbles.set(msg.owner, {text: msg.body, until: now + BUBBLE_MS});
      if (!first && !msg.mine && panel.hidden) unread++;
    }
    while (messages.length > 80) messages.shift();
    first = false;
    stations = r.stations || {};
    box.hidden = !chat;
    paint();
    onChange?.('update');
  }
  async function tick() {
    if (!alive) return;
    let next = on ? POLL_ON : POLL_OFF;
    if (document.visibilityState === 'visible' && !busy) {
      busy = true;
      try {
        const p = getPos();
        const r = await api('together', {map, x: Math.round(p.x), y: Math.round(p.y), dir: p.dir, moving: !!p.moving, since});
        if (alive) apply(r);
        next = r.on ? POLL_ON : POLL_OFF;
      } catch { next = on ? 5000 : POLL_OFF; }
      busy = false;
    }
    if (alive) timer = setTimeout(tick, next);
  }
  timer = setTimeout(tick, 400);

  return {
    isOn: () => on,
    chatOn: () => chat,
    // 친구 위치는 받은 자리까지 부드럽게 따라간다(너무 멀면 바로 옮긴다)
    step(dt) {
      for (const m of others.values()) {
        const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
        if (d > 320) { m.x = m.tx; m.y = m.ty; m.walking = false; continue; }
        const k = Math.min(1, dt * 5); m.x += dx * k; m.y += dy * k; m.walking = d > 3 || m.moving;
      }
    },
    list: () => [...others.values()],
    sheetOf(m) { return (m.sheet ||= getAvatarSheet(cleanAvatar(m.avatar || {}))); },
    bubble(id) { const b = bubbles.get(id); if (!b) return null; if (performance.now() > b.until) { bubbles.delete(id); return null; } return b.text; },
    station: (id) => stations[id] || null,
    async coop(station, op, value) { const r = await api('coop', {station, op, value}); stations[station] = r; onChange?.('station'); return r; },
    stop() { alive = false; clearTimeout(timer); box.remove(); },
  };
}

export const loadClassGoal = (api) => api('class-goal').catch(() => null);
export const GOAL_STEPS = [10, 25, 50, 75, 100];
const REGION_COLOR = {R1: '#7fd36a', R2: '#ff9a4a', R3: '#ffd34d', R4: '#b49bff', R5: '#4fc7b0'};

// 우리 반 복구 탑: 지구마다 막대가 반 학생들이 해결한 만큼 차오르고, 단계를 넘을 때마다 깃발과 불빛이 늘어난다
export function drawTower(c, x, y, goal, now, glow) {
  const pct = goal?.percent || 0, regions = goal?.regions || {};
  c.save(); c.translate(x, y); c.scale(1.5, 1.5);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 0, 34, 10, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#8b8f99'; c.strokeStyle = '#1b1f27'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-30, 0); c.lineTo(30, 0); c.lineTo(24, -12); c.lineTo(-24, -12); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#c9ced6'; c.fillRect(-20, -78, 40, 66); c.strokeRect(-20, -78, 40, 66);
  Object.keys(REGION_COLOR).forEach((rk, i) => {
    const r = regions[rk], v = r && r.target ? Math.min(1, (r.solved + r.fields) / r.target) : 0, bx = -17 + i * 7;
    c.fillStyle = '#2b2f36'; c.fillRect(bx, -74, 6, 58);
    c.fillStyle = REGION_COLOR[rk]; c.fillRect(bx + 1, -17 - 56 * v, 4, 56 * v);
  });
  const lit = pct >= 50, top = -92;
  c.fillStyle = lit ? '#fff6c0' : '#9fb0c8'; c.beginPath(); c.moveTo(0, top - 14); c.lineTo(10, top); c.lineTo(0, top + 14); c.lineTo(-10, top); c.closePath(); c.fill(); c.stroke();
  if (glow && pct > 0) glow(c, 0, top, 14 + pct * 0.4, '#fff1b0', 0.15 + pct / 200);
  GOAL_STEPS.forEach((s, i) => { if (pct < s) return; const fx = -26 + i * 13; c.strokeStyle = '#5a4630'; c.beginPath(); c.moveTo(fx, -12); c.lineTo(fx, -34); c.stroke(); c.fillStyle = ['#ff6b6b', '#ffd34d', '#7fd36a', '#7fd6ff', '#b49bff'][i]; c.fillRect(fx, -34, 8, 6); });
  c.restore();
}
