// 학생이 처음 들어올 때 자기 캐릭터를 정하는 화면.
// 미리 그린 캐릭터 12종 가운데 하나를 고르고, 옷 색을 여덟 가지 가운데 골라 바꾼다.
import {getAvatarSheet, drawFrame, cleanAvatar, preloadLook, LOOK_COUNT, TINT_COUNT} from './sprites.mjs';

const DIRS = ['down', 'left', 'up', 'right'];
const DIR_NAMES = {down: '앞모습', left: '왼쪽', up: '뒷모습', right: '오른쪽'};
export const LOOK_NAMES = ['남색 후드티', '빨간 운동복', '안경과 조끼', '파란 모자', '보라 점퍼', '교복 셔츠', '분홍 후드 포니테일', '양갈래 세일러복', '별 핀 단발', '하늘색 재킷', '땋은 머리 안경', '주황 바람막이'];

export function avatarMaker(host, {el, button, value, nickname = '', title = '나만의 탐험가 고르기', confirmLabel = '이 모습으로 모험 시작', onDone, onCancel}) {
  let av = cleanAvatar(value || {});
  let dir = 0, alive = true, raf, walking = true;
  const available = new Map();
  const preview = el('canvas', {width: 256, height: 320, class: 'maker-preview', 'aria-label': '내 탐험가 미리보기'});
  const dirLabel = el('span', {class: 'maker-dir'}, DIR_NAMES[DIRS[dir]]);
  const body = el('div', {class: 'maker-body'});
  const status = el('p', {class: 'maker-status', role: 'status'});
  const done = button(confirmLabel, async () => {
    if (!available.has(av.look)) { status.textContent = '마음에 드는 캐릭터를 하나 골라 주세요.'; return; }
    done.disabled = true; status.textContent = '저장하는 중…';
    try { await onDone(cleanAvatar(av)); } catch (e) { status.textContent = e.message || '저장하지 못했어요. 다시 눌러 주세요.'; done.disabled = false; }
  }, 'maker-done');

  function thumb(look, tint, w = 64, h = 80) {
    const c = el('canvas', {width: w, height: h, class: 'look-thumb', 'aria-hidden': 'true'});
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.setTransform(w / 64, 0, 0, h / 80, 0, 0);
    drawFrame(x, getAvatarSheet({look, tint}), 32, 76);
    return c;
  }
  function render() {
    body.replaceChildren(el('p', {class: 'maker-lead'}, '2050년 새빛시에서 함께할 내 캐릭터를 골라 주세요. 나중에 가방에서 다시 바꿀 수 있어요.'));
    const grid = el('div', {class: 'look-grid', role: 'radiogroup', 'aria-label': '캐릭터 고르기'});
    for (let n = 1; n <= LOOK_COUNT; n++) {
      if (!available.has(n)) continue;
      const b = button('', () => { av.look = n; render(); }, 'look-card');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(av.look === n)); b.setAttribute('aria-label', LOOK_NAMES[n - 1]);
      b.append(thumb(n, av.look === n ? av.tint : 0), el('span', {}, LOOK_NAMES[n - 1]));
      grid.append(b);
    }
    if (!available.size) grid.append(el('p', {}, '캐릭터 그림을 불러오는 중이에요…'));
    body.append(grid);
    if (available.has(av.look)) {
      const row = el('div', {class: 'tint-row', role: 'radiogroup', 'aria-label': '옷 색'});
      for (let i = 0; i < TINT_COUNT; i++) {
        const b = button('', () => { av.tint = i; render(); }, 'tint-choice');
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(av.tint === i)); b.setAttribute('aria-label', i ? `옷 색 ${i}번` : '원래 색');
        b.append(thumb(av.look, i, 48, 60), el('span', {}, i ? `${i}번` : '원래 색'));
        row.append(b);
      }
      body.append(el('h3', {class: 'tint-head'}, '옷 색 바꾸기'), row);
    }
  }
  function draw(now) {
    if (!alive) return;
    const c = preview.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 256, 320);
    c.fillStyle = 'rgba(40,60,50,.18)'; c.beginPath(); c.ellipse(128, 306, 60, 12, 0, 0, Math.PI * 2); c.fill();
    if (available.has(av.look)) {
      c.setTransform(4, 0, 0, 4, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      drawFrame(c, getAvatarSheet(av), 32, 76, {dir: DIRS[dir], moving: walking, t: now / 1000});
    }
    raf = requestAnimationFrame(draw);
  }
  const turn = (d) => { dir = (dir + d + 4) % 4; dirLabel.textContent = DIR_NAMES[DIRS[dir]]; };
  const root = el('section', {class: 'maker'},
    el('div', {class: 'maker-stage'},
      el('div', {class: 'maker-name'}, nickname || '나의 탐험가'),
      preview,
      el('div', {class: 'maker-turn'}, button('◀', () => turn(-1), 'maker-arrow'), dirLabel, button('▶', () => turn(1), 'maker-arrow')),
      el('div', {class: 'maker-tools'}, button('걷기 멈춤/재생', () => { walking = !walking; }, 'secondary'))),
    el('div', {class: 'maker-editor'},
      el('h1', {}, title), body,
      el('div', {class: 'maker-footer'}, onCancel ? button('취소', onCancel, 'secondary') : null, done),
      status));
  host.replaceChildren(root);
  render();
  raf = requestAnimationFrame(draw);
  for (let n = 1; n <= LOOK_COUNT; n++) preloadLook(n).then((s) => { if (s && alive) { available.set(n, s); render(); } });
  return () => { alive = false; cancelAnimationFrame(raf); };
}
