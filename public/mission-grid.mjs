// 스마트 그리드 관제 모형 (과학으로 보는 세상, 과학 90~91쪽).
// 전기가 가는 선(굵은 노란 선)과 정보가 오가는 선(파란 점선 화살표)을 모양과 범례로 구별한다.
// 사용량 막대는 가상 모형이며 실제 전력량 자료가 아니다.
const W = 720, H = 420;
const N = {
  plant: {x: 95, y: 90, label: '발전소'}, solar: {x: 95, y: 210, label: '태양광'}, wind: {x: 95, y: 330, label: '풍력'},
  screen: {x: 360, y: 64, label: '관제 화면'}, storage: {x: 360, y: 340, label: '저장 장치'}, bus: {x: 360, y: 210, label: ''},
  apt: {x: 620, y: 90, label: '아파트'}, school: {x: 620, y: 210, label: '학교'}, shop: {x: 620, y: 330, label: '가게'},
};
const POWER = [['plant', 'bus'], ['solar', 'bus'], ['wind', 'bus'], ['storage', 'bus'], ['bus', 'apt'], ['bus', 'school'], ['bus', 'shop']];
const INFO = [['apt', 'screen'], ['school', 'screen'], ['shop', 'screen'], ['storage', 'screen'], ['screen', 'plant'], ['screen', 'solar']];
const USE = {apt: 0.8, school: 0.45, shop: 0.3};
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function gridModel({el, button, onReady}) {
  const canvas = el('canvas', {class: 'bench-canvas grid-canvas', width: W * 2, height: H * 2, role: 'img', 'aria-label': '스마트 그리드 관제 모형. 발전소, 태양광, 풍력, 저장 장치에서 아파트, 학교, 가게로 전기가 가고, 정보를 받은 뒤에는 쓰는 곳의 정보가 관제 화면으로 온다.'});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const legend = el('div', {class: 'grid-legend'}, el('span', {class: 'lg power'}, '전기가 가는 선'), el('span', {class: 'lg info'}, '정보가 오가는 선'), el('span', {class: 'lg note'}, '막대와 경고는 가상 모형'));
  const node = el('div', {class: 'signal-device'}, el('div', {class: 'signal-owner'}, '관제실 모형'), canvas, legend, tray, status);
  const c = canvas.getContext('2d');
  let mode = 'before', alive = true, raf = 0;
  const seen = new Set(['before']);
  function set(m) { mode = m; seen.add(m); paintTray(); say(); if (seen.has('before') && seen.has('after')) onReady?.(); }
  function say() { status.textContent = mode === 'before' ? '정보를 받기 전: 관제 화면에는 발전량만 보여요. 쓰는 곳에서 무슨 일이 일어나는지는 알 수 없어요.' : '정보를 받은 뒤: 아파트, 학교, 가게에서 쓰는 양과 학교의 과열 신호가 관제 화면으로 와요.'; }
  function paintTray() {
    tray.replaceChildren(...[['before', '정보를 받기 전'], ['after', '정보를 받은 뒤']].map(([m, l]) => { const b = button(l, () => set(m), 'bench-opt'); b.setAttribute('aria-pressed', String(mode === m)); return b; }));
  }
  function icon(k, now) {
    const {x, y} = N[k];
    c.save(); c.translate(x, y);
    c.fillStyle = '#e9eef5'; c.strokeStyle = '#5a6b82'; c.lineWidth = 2;
    if (k === 'plant') { c.fillStyle = '#b8c0ca'; c.fillRect(-30, -10, 60, 34); c.fillRect(10, -34, 12, 26); c.fillStyle = '#e0a52a'; c.beginPath(); c.moveTo(-18, 6); c.lineTo(-10, -6); c.lineTo(-12, 4); c.lineTo(-4, 4); c.lineTo(-14, 18); c.lineTo(-12, 8); c.closePath(); c.fill(); }
    if (k === 'solar') { c.fillStyle = '#2f5fa8'; c.beginPath(); c.moveTo(-32, 14); c.lineTo(-18, -18); c.lineTo(32, -18); c.lineTo(18, 14); c.closePath(); c.fill(); c.strokeStyle = '#9cc3ff'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-32 + i * 12.5, 14); c.lineTo(-18 + i * 12.5, -18); c.stroke(); } c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(30, -30, 8, 0, Math.PI * 2); c.fill(); }
    if (k === 'wind') { c.strokeStyle = '#8e97a3'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 26); c.lineTo(0, -14); c.stroke(); const a = reduceMotion() ? 0 : now / 400; c.strokeStyle = '#dfe4ea'; c.lineWidth = 5; for (let i = 0; i < 3; i++) { const t = a + (i * Math.PI * 2) / 3; c.beginPath(); c.moveTo(0, -14); c.lineTo(Math.cos(t) * 26, -14 + Math.sin(t) * 26); c.stroke(); } }
    if (k === 'storage') { c.fillStyle = '#3f7d5a'; c.fillRect(-28, -16, 56, 32); c.fillStyle = '#c9ced6'; c.fillRect(28, -6, 6, 12); c.fillStyle = '#9fe0b0'; c.fillRect(-24, -12, 34, 24); }
    if (k === 'screen') { c.fillStyle = '#1b2231'; c.fillRect(-84, -30, 168, 66); c.strokeStyle = '#5a6b82'; c.strokeRect(-84, -30, 168, 66); c.fillStyle = '#39424e'; c.fillRect(-8, 36, 16, 6);
      c.font = '10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#ffd35a'; c.fillRect(-72, 18, 18, -34); c.fillStyle = '#cfd8e6'; c.fillText('발전량', -63, 28);
      if (mode === 'after') { ['apt', 'school', 'shop'].forEach((kk, i) => { const bx = -30 + i * 36; c.fillStyle = kk === 'school' ? '#ff8a6a' : '#7fb6ff'; c.fillRect(bx, 18, 18, -38 * USE[kk]); c.fillStyle = '#cfd8e6'; c.fillText(N[kk].label, bx + 9, 28); }); }
      else { c.fillStyle = '#8793a3'; c.fillText('쓰는 곳 정보 없음', 20, 2); } }
    if (k === 'apt' || k === 'school' || k === 'shop') {
      c.fillStyle = k === 'apt' ? '#c9b89a' : k === 'school' ? '#e6d7b0' : '#d9c2c2'; const h = k === 'apt' ? 56 : 40;
      c.fillRect(-26, 24 - h, 52, h);
      c.fillStyle = '#ffe9a0'; for (let i = 0; i < 3; i++) for (let j = 0; j < (k === 'apt' ? 4 : 2); j++) c.fillRect(-20 + i * 16, 30 - h + j * 12, 8, 7);
      if (k === 'school') { c.strokeStyle = '#5a6b82'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 24 - h); c.lineTo(0, 8 - h); c.stroke(); c.fillStyle = '#c0392b'; c.fillRect(0, 8 - h, 12, 7); }
      if (k === 'school' && mode === 'after' && (reduceMotion() || Math.floor(now / 400) % 2 === 0)) { c.fillStyle = '#c0392b'; c.beginPath(); c.arc(30, -18, 11, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 14px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 30, -18); }
    }
    c.restore();
    if (N[k].label) { c.fillStyle = '#e8ecf2'; c.font = 'bold 13px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(N[k].label, x, y + (k === 'screen' ? 54 : 40)); }
  }
  function draw(now) {
    if (!alive) return;
    c.setTransform(2, 0, 0, 2, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1f2633'); g.addColorStop(1, '#141922'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.lineCap = 'round';
    for (const [a, b] of POWER) { c.strokeStyle = '#ffd35a'; c.lineWidth = 6; c.beginPath(); c.moveTo(N[a].x, N[a].y); c.lineTo(N[b].x, N[b].y); c.stroke(); }
    if (!reduceMotion()) { const t = (now / 1400) % 1; c.fillStyle = '#fff6c8'; for (const [a, b] of POWER) { const x = N[a].x + (N[b].x - N[a].x) * t, y = N[a].y + (N[b].y - N[a].y) * t; c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill(); } }
    c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(N.bus.x, N.bus.y, 16, 0, Math.PI * 2); c.fill(); c.fillStyle = '#3a2605'; c.font = 'bold 10px "Malgun Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('전력망', N.bus.x, N.bus.y);
    if (mode === 'after') {
      c.setLineDash([7, 6]); c.lineWidth = 2.5; c.strokeStyle = '#7fb6ff';
      for (const [a, b] of INFO) {
        const ax = N[a].x, ay = N[a].y - 18, bx = N[b].x, by = N[b].y + (b === 'screen' ? 34 : -18);
        c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 40, bx, by); c.stroke();
        c.setLineDash([]); c.fillStyle = '#7fb6ff'; const ang = Math.atan2(by - (Math.min(ay, by) - 40), bx - (ax + bx) / 2); c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - Math.cos(ang - 0.5) * 10, by - Math.sin(ang - 0.5) * 10); c.lineTo(bx - Math.cos(ang + 0.5) * 10, by - Math.sin(ang + 0.5) * 10); c.closePath(); c.fill(); c.setLineDash([7, 6]);
      }
      c.setLineDash([]);
    }
    for (const k of Object.keys(N)) if (k !== 'bus') icon(k, now);
    raf = requestAnimationFrame(draw);
  }
  paintTray(); say();
  raf = requestAnimationFrame(draw);
  return {node, stop: () => { alive = false; cancelAnimationFrame(raf); }};
}
