// 모은 부품으로 광장 안내판 회로를 조립하는 문제.
// 전지 두 개를 서로 다른 극끼리 한 줄로(직렬) 잇고, 전구·스위치·전선으로 닫힌 회로를 만들면 안내판이 켜진다.
import {STORY_ITEMS, REPAIR} from './npcs.mjs';
import {itemIcon} from './item-icons.mjs';

const W = 600, H = 300;

const josa = (w, withB, noB) => { const code = w.charCodeAt(w.length - 1) - 0xac00; return w + (code >= 0 && code < 11172 && code % 28 ? withB : noB); };
export function openRepair({state, onSuccess, onClose}) {
  const adv = state.adventure, has = (id) => (adv.storyItems || []).includes(id);
  const placed = {battery: false, bulb: false, switch: false, wire: false};
  const plusRight = [true, false]; // 두 번째 전지는 처음에 반대로 놓여 있다
  let closed = false, lit = false, done = false, tries = 0;
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const btn = (label, fn, cls = '') => { const b = make('button', cls, label); b.type = 'button'; b.onclick = fn; return b; };
  const dialog = make('dialog', 'adventure-dialog repair-dialog');
  const canvas = make('canvas', 'repair-board'); canvas.width = W; canvas.height = H;
  canvas.setAttribute('aria-label', '안내판 회로 조립판');
  const tray = make('div', 'repair-tray'), controls = make('div', 'actions'), feedback = make('p', 'repair-feedback'); feedback.setAttribute('role', 'status');

  function describe() {
    const parts = [];
    parts.push(placed.battery ? `전지 두 개: 왼쪽 전지 +극 ${plusRight[0] ? '오른쪽' : '왼쪽'}, 오른쪽 전지 +극 ${plusRight[1] ? '오른쪽' : '왼쪽'}` : '전지 자리 비어 있음');
    parts.push(placed.bulb ? '전구 있음' : '전구 자리 비어 있음', placed.switch ? `스위치 ${closed ? '닫힘' : '열림'}` : '스위치 자리 비어 있음', placed.wire ? '전선 연결됨' : '전선 없음');
    canvas.setAttribute('aria-label', '안내판 회로 조립판. ' + parts.join(', '));
  }
  function battery(c, x, y, right, filled) {
    if (!filled) { c.setLineDash([5, 4]); c.strokeStyle = '#8ea3b8'; c.strokeRect(x - 52, y - 20, 104, 40); c.setLineDash([]); c.fillStyle = '#8ea3b8'; c.font = '13px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.fillText('전지 자리', x, y + 5); return; }
    c.fillStyle = '#2f3440'; c.fillRect(x - 50, y - 18, 100, 36);
    c.fillStyle = '#e0b341'; c.fillRect(right ? x + 14 : x - 50, y - 18, 36, 36);
    c.fillStyle = '#c0c4cc'; c.fillRect(right ? x + 50 : x - 56, y - 6, 6, 12);
    c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff';
    c.fillText('+', right ? x + 32 : x - 32, y + 7); c.fillText('−', right ? x - 32 : x + 32, y + 7);
  }
  function draw(glow = 0) {
    const c = canvas.getContext('2d');
    c.fillStyle = '#1d2b3a'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#2a3d52'; c.fillRect(12, 12, W - 24, H - 24);
    // 전선 길
    c.lineWidth = 5; c.strokeStyle = placed.wire ? '#d8483a' : '#56687c';
    if (!placed.wire) c.setLineDash([10, 10]);
    c.beginPath(); c.moveTo(90, 70); c.lineTo(510, 70); c.lineTo(510, 128); c.moveTo(510, 176); c.lineTo(510, 240); c.lineTo(90, 240); c.lineTo(90, 70); c.stroke(); c.setLineDash([]);
    // 전구
    const bx = 300, by = 70;
    if (glow > 0) { const g = c.createRadialGradient(bx, by, 4, bx, by, 120); g.addColorStop(0, `rgba(255,236,150,${0.8 * glow})`); g.addColorStop(1, 'rgba(255,220,120,0)'); c.fillStyle = g; c.fillRect(bx - 130, by - 130, 260, 260); }
    if (placed.bulb) { c.fillStyle = lit ? '#fff3b0' : '#c9cfd8'; c.beginPath(); c.arc(bx, by - 6, 22, 0, Math.PI * 2); c.fill(); c.fillStyle = '#8a93a3'; c.fillRect(bx - 12, by + 12, 24, 14); c.strokeStyle = lit ? '#e0a030' : '#6d7584'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx - 8, by); c.lineTo(bx - 3, by - 10); c.lineTo(bx + 3, by); c.lineTo(bx + 8, by - 10); c.stroke(); }
    else { c.setLineDash([5, 4]); c.strokeStyle = '#8ea3b8'; c.lineWidth = 2; c.beginPath(); c.arc(bx, by, 24, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
    // 스위치
    const sx = 510, sy = 152;
    if (placed.switch) { c.fillStyle = '#7d5a3a'; c.fillRect(sx - 22, sy - 30, 44, 60); c.fillStyle = '#c0c4cc'; c.fillRect(sx - 4, sy - 26, 8, 8); c.fillRect(sx - 4, sy + 18, 8, 8); c.strokeStyle = '#e8e8e8'; c.lineWidth = 5; c.beginPath(); c.moveTo(sx, sy + 22); c.lineTo(closed ? sx : sx + 20, closed ? sy - 22 : sy - 14); c.stroke(); }
    else { c.setLineDash([5, 4]); c.strokeStyle = '#8ea3b8'; c.lineWidth = 2; c.strokeRect(sx - 22, sy - 30, 44, 60); c.setLineDash([]); }
    // 전지 두 개
    battery(c, 230, 240, plusRight[0], placed.battery); battery(c, 370, 240, plusRight[1], placed.battery);
    c.font = '14px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#dfe8f2';
    c.fillText('전구', bx, 122); c.fillText('스위치', sx, 200); c.fillText('왼쪽 전지', 230, 282); c.fillText('오른쪽 전지', 370, 282);
    describe();
  }
  function renderTray() {
    tray.replaceChildren();
    const parts = [['battery-pair', 'battery'], ['bulb', 'bulb'], ['switch', 'switch'], ['wire', 'wire']];
    for (const [id, slot] of parts) {
      const item = STORY_ITEMS[id], owned = has(id);
      const b = btn('', () => { placed[slot] = true; closed = false; lit = false; feedback.textContent = ''; renderTray(); renderControls(); draw(); }, 'repair-part');
      b.append(itemIcon(id, 36), make('span', '', item.title), make('small', '', placed[slot] ? '넣음' : owned ? '눌러서 넣기' : '아직 없음'));
      b.disabled = !owned || placed[slot];
      if (!owned) b.title = REPAIR.where[id];
      tray.append(b);
    }
  }
  function renderControls() {
    controls.replaceChildren();
    // 전지 방향을 바꾸면 회로가 달라지므로 다시 스위치를 닫아 확인해야 완료할 수 있다.
    const flip = (i) => { plusRight[i] = !plusRight[i]; closed = false; lit = false; done = false; feedback.textContent = ''; renderControls(); draw(); };
    if (placed.battery) controls.append(btn('왼쪽 전지 방향 바꾸기', () => flip(0), 'secondary'), btn('오른쪽 전지 방향 바꾸기', () => flip(1), 'secondary'));
    controls.append(btn(done ? '안내판 복구 완료' : '스위치 닫고 확인하기', done ? finish : test));
  }
  function test() {
    tries++;
    const missing = REPAIR.needs.filter((id) => !has(id));
    if (missing.length) { feedback.textContent = '아직 모으지 못한 부품이 있어요. ' + missing.map((id) => `${STORY_ITEMS[id].title}: ${REPAIR.where[id]}`).join(' / '); return; }
    const empty = [['battery', '전지'], ['bulb', '전구'], ['switch', '스위치'], ['wire', '전선']].filter(([k]) => !placed[k]).map(([, n]) => n);
    if (empty.length) { feedback.textContent = `${josa(empty.join(', '), '을', '를')} 아직 조립판에 넣지 않았어요. 위의 부품을 눌러 넣어 보세요.`; return; }
    if (!placed.switch) return;
    closed = true;
    if (plusRight[0] !== plusRight[1]) { lit = false; draw(); feedback.textContent = '스위치를 닫았는데 전구가 켜지지 않아요. 두 전지가 마주 보는 곳의 극을 살펴보세요. 서로 다른 극끼리 이어져야 해요.'; return; }
    lit = true; done = true;
    feedback.textContent = '불이 들어왔어요. 전지 두 개를 서로 다른 극끼리 한 줄로 이었더니(직렬연결) 안내판 전구가 밝게 켜졌어요.';
    renderControls();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return draw(1);
    const t0 = performance.now();
    const anim = (now) => { const k = Math.min(1, (now - t0) / 700); draw(k); if (k < 1 && dialog.open) requestAnimationFrame(anim); };
    requestAnimationFrame(anim);
  }
  // 불이 들어온 뒤에는 「안내판 복구 완료」, 「닫기」, Esc 어느 쪽으로 나가도 복구를 기록한다.
  function finish() { dialog.close(); }

  dialog.append(
    btn('닫기', () => dialog.close(), 'repair-close'),
    make('h2', '', '광장 안내판 고치기'),
    make('p', 'repair-lead', '인벤토리에서 모은 부품을 조립판에 넣고 회로를 완성해 봐요. 부품을 모두 넣었으면 스위치를 닫아 확인해요.'),
    tray, canvas, controls, feedback);
  dialog.addEventListener('close', () => { dialog.remove(); onClose?.(); if (done) onSuccess?.({tries}); }, {once: true});
  document.body.append(dialog);
  renderTray(); renderControls(); draw();
  dialog.showModal();
}
