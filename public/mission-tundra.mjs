// 얼어 있던 땅 탐사(R5-G10): 북쪽 자매 마을의 동토 이야기를 걸어 다니며 확인하는 장면들.
// 마을 지도는 몸속 탐험과 같은 탐험 엔진(mission-voyage.mjs)에 장면 자료를 더해 쓰고, 실험대 다섯 개는 이 파일의 조작 장면이다.
// 북쪽 마을, 제보 수, 땅속 온도, 아메바 수, 주민 반응은 수업용 모형 값이다. 실제 연구와 역사 자료는 장면 안에 출처를 적는다.
// 바이러스가 아메바를 감염시켰다는 연구를 사람 감염으로 넓히지 않고, 탄저병은 세균 때문이라는 것을 지킨다.
import {addVoyageModes, VOY} from './mission-voyage.mjs';
import {getAvatarSheet, drawFrame, playerAvatar} from './sprites.mjs';
import {residentAvatar} from './field.mjs';
import {drawChuck} from './chuck.mjs';

const {rr, txt, panel, dot, oval, line, clamp, seeded} = VOY;
const FONT = (s, b = true) => `${b ? 'bold ' : ''}${s}px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif`;
const INK = '#1d3550', SOFT = '#4f6178', GOOD = '#1f8a5b', BAD = '#b8452e', ICE = '#d7eef7';
const TAU = Math.PI * 2;
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const act = (task, fire) => (a) => { if (task.type === 'action') fire?.(a); };
const later = (on) => setTimeout(() => on?.(), 0);

// ================================================================ 마을 사람과 탐사대원
const NPC = {haneul: ['하늘 씨', 'tundra-1'], granny: ['할머니', 'tundra-2'], guest: ['여행객', 'tundra-3'], keeper: ['관측소 연구원', 'tundra-4']};
const sheets = {};
function npcSheet(id) {
  if (!sheets[id]) { const [name, key] = NPC[id]; try { sheets[id] = getAvatarSheet(residentAvatar(key, name)); } catch { sheets[id] = null; } }
  return sheets[id];
}
function person(c, id, x, y, {dir = 'down', moving = false, t = 0, emote} = {}) {
  c.fillStyle = 'rgba(30,50,70,.22)'; c.beginPath(); c.ellipse(x, y, 15, 5, 0, 0, TAU); c.fill();
  const sh = npcSheet(id);
  if (sh) { drawFrame(c, sh, x, y, {dir, moving, t, emote}); return; }
  dot(c, x, y - 42, 9, '#f2c9a0', '#8a5a3a', 1.5); rr(c, x - 9, y - 32, 18, 26, 6); c.fillStyle = '#4a7fb0'; c.fill();
}
function say(c, s, x, y, tone = 'plain', maxX = 1396) {
  c.font = FONT(12);
  const w = c.measureText(s).width + 16, h = 22, x0 = clamp(x - w / 2, 4, maxX - w);
  rr(c, x0, y - h, w, h, 9); c.fillStyle = tone === 'bad' ? '#ffe9e4' : tone === 'good' ? '#e5f7ec' : '#ffffff'; c.fill();
  c.strokeStyle = tone === 'bad' ? BAD : tone === 'good' ? GOOD : '#5a7a99'; c.lineWidth = 1.5; c.stroke();
  txt(c, s, x0 + w / 2, y - 7, {size: 12, color: INK, align: 'center'});
}
// 지도 이름표는 지금 보이는 화면 안에 글자가 다 들어올 때만 쓴다. 카메라 밖이나 가장자리에 반쯤 걸친 글자는 그리지 않는다.
function fits(c, s, x, y, size, align = 'center') {
  c.font = FONT(size);
  const w = c.measureText(s).width, l = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x, t = c.getTransform();
  if (t.b || t.c) return true;
  return t.a * l + t.e >= 0 && t.a * (l + w) + t.e <= c.canvas.width && t.d * (y - size) + t.f >= 0 && t.d * (y + 4) + t.f <= c.canvas.height;
}
// 탐사대원: 학생 아바타가 마을 길을 걷는다(아바타를 아직 못 받으면 단순한 모습으로 그린다)
function walker() {
  let px = null, py = null, dir = 'down';
  return (c, o) => {
    if (px != null) { const dx = o.x - px, dy = o.y - py; if (Math.abs(dx) + Math.abs(dy) > 0.3) dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
    px = o.x; py = o.y;
    c.fillStyle = 'rgba(30,50,70,.25)'; c.beginPath(); c.ellipse(o.x, o.y + 22, 16, 5, 0, 0, TAU); c.fill();
    let sheet = null;
    try { sheet = getAvatarSheet(playerAvatar()); } catch { sheet = null; }
    if (sheet) drawFrame(c, sheet, o.x, o.y + 22, {dir, moving: o.moving, t: o.t});
    else { dot(c, o.x, o.y - 20, 9, '#f2c9a0', '#8a5a3a', 1.5); rr(c, o.x - 10, o.y - 10, 20, 28, 6); c.fillStyle = '#e8743b'; c.fill(); }
  };
}

// ================================================================ 북쪽 자매 마을 그림
const PATH = [[420, 505], [555, 432], [690, 375], [820, 338], [950, 318], [1085, 292]];
const DETOUR = [[555, 432], [600, 470], [690, 482], [780, 455], [820, 338]];
// 여름 끝자락의 툰드라: 위쪽 땅이 녹는 계절이라 눈 대신 이끼, 북극황새풀, 키 작은 덤불, 녹은 물웅덩이를 그린다.
function blob(c, x, y, rx, ry, fill, rnd, n = 9) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = 0.72 + rnd() * 0.5; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
  c.beginPath(); c.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  c.closePath(); c.fillStyle = fill; c.fill();
}
function mountains(c) {
  const g = c.createLinearGradient(0, 0, 0, 175); g.addColorStop(0, '#8cc0e2'); g.addColorStop(1, '#e4f0f4'); c.fillStyle = g; c.fillRect(0, 0, 1400, 175);
  for (const [x, y, s] of [[220, 48, 1], [770, 34, 1.25], [1190, 60, 0.9]]) { oval(c, x, y, 48 * s, 12 * s, 0, 'rgba(255,255,255,.9)'); oval(c, x + 26 * s, y - 9 * s, 30 * s, 13 * s, 0, 'rgba(255,255,255,.9)'); oval(c, x - 22 * s, y - 4 * s, 22 * s, 9 * s, 0, 'rgba(255,255,255,.9)'); }
  for (let i = 0; i < 9; i++) {
    const x = i * 170 - 40, h = 70 + (i * 37) % 50;
    c.fillStyle = '#8aa3b8'; c.beginPath(); c.moveTo(x, 162); c.lineTo(x + 95, 162 - h); c.lineTo(x + 190, 162); c.fill();
    c.fillStyle = '#f4f9fc'; c.beginPath(); c.moveTo(x + 78, 162 - h * 0.82); c.lineTo(x + 95, 162 - h); c.lineTo(x + 113, 162 - h * 0.8); c.lineTo(x + 101, 162 - h * 0.76); c.lineTo(x + 92, 162 - h * 0.85); c.lineTo(x + 85, 162 - h * 0.76); c.fill();
  }
  c.fillStyle = '#93a879'; c.beginPath(); c.moveTo(0, 180);
  for (let x = 0; x <= 1400; x += 70) c.quadraticCurveTo(x + 35, 150 + ((x * 13) % 17), x + 70, 166 + ((x * 7) % 11));
  c.lineTo(1400, 190); c.lineTo(0, 190); c.fill();
}
function pond(c, x, y, rx, ry, rnd) {
  blob(c, x, y + 3, rx + 6, ry + 4, 'rgba(96,110,70,.45)', rnd);
  blob(c, x, y, rx, ry, '#6fa6c2', rnd);
  oval(c, x - rx * 0.15, y - ry * 0.2, rx * 0.55, ry * 0.28, 0, 'rgba(255,255,255,.28)');
  line(c, [[x - rx * 0.5, y + ry * 0.25], [x - rx * 0.1, y + ry * 0.25]], 'rgba(255,255,255,.45)', 1.5);
  for (let i = 0; i < 7; i++) { const a = rnd() * TAU, ex = x + Math.cos(a) * rx * 0.95, ey = y + Math.sin(a) * ry * 0.95; line(c, [[ex, ey], [ex - 3, ey - 11]], '#6f8a4a', 1.6); line(c, [[ex, ey], [ex + 3, ey - 9]], '#6f8a4a', 1.6); }
}
function cotton(c, x, y, rnd) { for (let k = 0; k < 4; k++) { const dx = (rnd() - 0.5) * 18, h = 12 + rnd() * 7; line(c, [[x + dx, y], [x + dx + 2, y - h]], '#7d8d5c', 1.3); dot(c, x + dx + 2, y - h - 2, 3.2, '#ffffff', 'rgba(170,175,160,.8)', 0.8); } }
function shrub(c, x, y, rnd) {
  oval(c, x, y + 3, 16, 4, 0, 'rgba(60,70,40,.25)');
  for (let k = 0; k < 13; k++) { const dx = (rnd() - 0.5) * 28, dy = -rnd() * 12; dot(c, x + dx, y + dy, 2.6 + rnd() * 1.8, rnd() < 0.22 ? '#c2643b' : rnd() < 0.5 ? '#5f7f45' : '#7c9a4f'); }
}
function larch(c, x, y, s = 1) {
  oval(c, x, y + 2, 16 * s, 5 * s, 0, 'rgba(60,70,40,.28)');
  line(c, [[x, y], [x, y - 70 * s]], '#6b5340', 3.2 * s);
  for (let k = 0; k < 8; k++) {
    const yy = y - 12 * s - k * 7.5 * s, w = (21 - k * 2.4) * s;
    c.fillStyle = k % 2 ? '#6e8f4e' : '#5b7b42'; c.beginPath(); c.moveTo(x - w, yy + 6 * s);
    c.quadraticCurveTo(x - w * 0.4, yy - 2 * s, x, yy - 6 * s); c.quadraticCurveTo(x + w * 0.4, yy - 2 * s, x + w, yy + 6 * s); c.quadraticCurveTo(x, yy + 2 * s, x - w, yy + 6 * s); c.fill();
  }
  line(c, [[x, y - 66 * s], [x, y - 76 * s]], '#5b7b42', 2 * s);
}
function ground(c) {
  const g = c.createLinearGradient(0, 170, 0, 900); g.addColorStop(0, '#bcc792'); g.addColorStop(1, '#a8b680'); c.fillStyle = g; c.fillRect(0, 170, 1400, 730);
  const rnd = seeded(77);
  const tones = ['rgba(128,156,92,.42)', 'rgba(176,150,96,.32)', 'rgba(214,220,190,.5)', 'rgba(110,140,86,.36)', 'rgba(150,170,110,.4)'];
  for (let i = 0; i < 70; i++) { const x = rnd() * 1400, y = 180 + rnd() * 720, r = 22 + rnd() * 44; blob(c, x, y, r, r * 0.42, tones[i % tones.length], rnd); }
  // 땅이 녹아 젖은 자리: 내려앉은 산책로 둘레가 더 짙다
  blob(c, 690, 405, 150, 62, 'rgba(84,104,70,.32)', rnd, 11); blob(c, 690, 408, 95, 38, 'rgba(70,92,64,.3)', rnd, 10);
  pond(c, 600, 232, 150, 38, rnd); pond(c, 95, 440, 52, 20, rnd); pond(c, 1362, 566, 40, 16, rnd); pond(c, 925, 560, 40, 15, rnd); pond(c, 1110, 862, 60, 20, rnd); pond(c, 70, 868, 48, 16, rnd);
  for (let i = 0; i < 110; i++) { const x = rnd() * 1400, y = 190 + rnd() * 700, col = rnd() < 0.6 ? '#7d9852' : '#c2ae6a'; oval(c, x, y + 1, 7, 2.5, 0, 'rgba(70,85,50,.3)'); line(c, [[x, y], [x - 5, y - 9]], col, 1.5); line(c, [[x, y], [x, y - 11]], col, 1.5); line(c, [[x, y], [x + 5, y - 8]], col, 1.5); }
  for (let i = 0; i < 26; i++) shrub(c, rnd() * 1400, 200 + rnd() * 690, rnd);
  for (let i = 0; i < 34; i++) cotton(c, rnd() * 1400, 200 + rnd() * 690, rnd);
  for (let i = 0; i < 18; i++) { const x = rnd() * 1400, y = 220 + rnd() * 660, r = 6 + rnd() * 7; oval(c, x, y + 2, r + 2, r * 0.5, 0, 'rgba(60,70,40,.25)'); oval(c, x, y, r, r * 0.62, 0, '#a9aea6', '#7f857c', 1); oval(c, x - r * 0.3, y - r * 0.2, r * 0.4, r * 0.2, 0, 'rgba(255,255,255,.4)'); }
}
// 마을 흙길: 포털에서 게시판과 산책로 입구로, 아래쪽으로는 집들과 보건소, 방송실로 이어진다
const LANES = [
  [[150, 716], [250, 690], [340, 662], [430, 606], [468, 560], [430, 512]],
  [[250, 690], [300, 790], [440, 814], [575, 816], [700, 812], [830, 816], [930, 776], [1015, 714], [1130, 690], [1250, 664]],
];
function lanes(c) {
  const draw = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); const e = pts[pts.length - 1]; c.lineTo(e[0], e[1]); c.stroke(); };
  for (const p of LANES) draw(p, 40, 'rgba(120,100,66,.35)');
  for (const p of LANES) draw(p, 32, '#cdb68c');
  for (const p of LANES) draw(p, 18, 'rgba(222,206,170,.75)');
  const rnd = seeded(31);
  for (const p of LANES) for (let i = 0; i < p.length - 1; i++) for (let k = 0; k < 9; k++) { const u = rnd(), x = p[i][0] + (p[i + 1][0] - p[i][0]) * u + (rnd() - 0.5) * 22, y = p[i][1] + (p[i + 1][1] - p[i][1]) * u + (rnd() - 0.5) * 14; dot(c, x, y, 1.2 + rnd() * 1.6, rnd() < 0.5 ? '#a8916b' : '#efe3c6'); }
  c.lineCap = 'butt'; c.lineJoin = 'miter';
}
function house(c, x, y, roof, w = 110, {label, smoke = false, t = 0} = {}) {
  oval(c, x, y + 2, w * 0.58, 9, 0, 'rgba(60,70,40,.28)');
  for (const sx of [-w / 2 + 10, -10, w / 2 - 14]) { c.fillStyle = '#6b5a48'; c.fillRect(x + sx, y - 14, 6, 16); }
  c.fillStyle = '#fbf6ec'; c.fillRect(x - w / 2, y - 72, w, 58); c.strokeStyle = '#7a6a58'; c.lineWidth = 2; c.strokeRect(x - w / 2, y - 72, w, 58);
  c.fillStyle = roof; c.beginPath(); c.moveTo(x - w / 2 - 10, y - 70); c.lineTo(x, y - 108); c.lineTo(x + w / 2 + 10, y - 70); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(x - w / 2 - 6, y - 72); c.lineTo(x, y - 104); c.lineTo(x + w / 2 + 6, y - 72); c.lineTo(x + w / 2 - 4, y - 76); c.lineTo(x, y - 98); c.lineTo(x - w / 2 + 4, y - 76); c.fill();
  c.fillStyle = '#7fb6d6'; c.fillRect(x - w / 2 + 12, y - 58, 22, 18); c.fillRect(x + w / 2 - 34, y - 58, 22, 18);
  c.fillStyle = '#8a5a3a'; c.fillRect(x - 11, y - 46, 22, 32);
  if (smoke) { c.fillStyle = '#7a6a58'; c.fillRect(x + w / 4, y - 112, 12, 22); for (let i = 0; i < 3; i++) { const k = ((t * 0.4 + i / 3) % 1); dot(c, x + w / 4 + 6 + Math.sin(k * 6) * 5, y - 116 - k * 34, 5 + k * 6, `rgba(190,196,204,${0.6 - k * 0.5})`); } }
  if (label && fits(c, label, x, y - 79, 11)) { rr(c, x - 30, y - 92, 60, 18, 4); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#7a6a58'; c.lineWidth = 1; c.stroke(); txt(c, label, x, y - 79, {size: 11, color: INK, align: 'center'}); }
}
function reindeer(c, x, y, s = 1, still = false, t = 0) {
  const b = still ? 0 : Math.sin(t * 2 + x) * 1.5;
  c.fillStyle = '#8a6a4c'; oval(c, x, y - 18 * s + b * 0.3, 22 * s, 11 * s, 0, '#8a6a4c');
  for (const lx of [-14, -6, 8, 15]) { c.fillStyle = '#6b513a'; c.fillRect(x + lx * s, y - 10 * s, 3 * s, 12 * s); }
  oval(c, x + 22 * s, y - 28 * s + b, 8 * s, 6 * s, 0, '#9a7a5a');
  line(c, [[x + 22 * s, y - 33 * s + b], [x + 18 * s, y - 46 * s + b], [x + 12 * s, y - 52 * s + b]], '#e6dcc8', 2 * s); line(c, [[x + 18 * s, y - 46 * s + b], [x + 24 * s, y - 52 * s + b]], '#e6dcc8', 2 * s);
  line(c, [[x + 25 * s, y - 33 * s + b], [x + 30 * s, y - 46 * s + b], [x + 36 * s, y - 50 * s + b]], '#e6dcc8', 2 * s);
}
function observatory(c, x, y, flag) {
  oval(c, x, y + 10, 104, 22, 0, '#c9bea4', 'rgba(120,100,66,.5)', 2);
  c.fillStyle = '#eef3f6'; c.fillRect(x - 46, y - 40, 92, 50); c.strokeStyle = '#6a7d8c'; c.lineWidth = 2; c.strokeRect(x - 46, y - 40, 92, 50);
  c.fillStyle = '#dfe8ee'; c.beginPath(); c.arc(x, y - 40, 46, Math.PI, 0); c.fill(); c.stroke();
  c.fillStyle = '#5a7088'; c.fillRect(x - 6, y - 86, 12, 22);
  line(c, [[x + 40, y - 40], [x + 60, y - 110]], '#5a6a78', 3); dot(c, x + 60, y - 112, 5, '#e4573d');
  if (flag) { line(c, [[x - 60, y - 30], [x - 60, y - 96]], '#5a6a78', 3); c.fillStyle = '#3fbf74'; c.beginPath(); c.moveTo(x - 60, y - 96); c.lineTo(x - 26, y - 86); c.lineTo(x - 60, y - 76); c.fill(); }
  c.fillStyle = '#8a5a3a'; c.fillRect(x - 10, y - 18, 20, 28);
}
function clinic(c, x, y) {
  house(c, x, y, '#4aa58f', 120);
  if (fits(c, '보건소', x, y - 81, 12)) { rr(c, x - 34, y - 96, 68, 20, 4); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#2f7d6a'; c.lineWidth = 1.5; c.stroke(); txt(c, '보건소', x, y - 81, {size: 12, color: '#1f5d4f', align: 'center'}); }
}
function radioStation(c, x, y, t, onAir) {
  house(c, x, y, '#d98a3a', 96, {label: '방송실'});
  line(c, [[x + 30, y - 100], [x + 52, y - 190]], '#596978', 4); line(c, [[x + 74, y - 100], [x + 52, y - 190]], '#596978', 4);
  for (let k = 0; k < 4; k++) line(c, [[x + 33 + k * 5, y - 110 - k * 20], [x + 71 - k * 5, y - 110 - k * 20]], '#596978', 2);
  dot(c, x + 52, y - 194, 6, '#e4573d');
  if (onAir) for (let i = 1; i <= 3; i++) { c.strokeStyle = `rgba(228,87,61,${0.7 - i * 0.18})`; c.lineWidth = 2; c.beginPath(); c.arc(x + 52, y - 194, 10 + i * 9 + (t * 12) % 9, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(x + 52, y - 194, 10 + i * 9 + (t * 12) % 9, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); }
}
function board(c, x, y, after) {
  c.fillStyle = '#7a5a3a'; c.fillRect(x - 46, y - 8, 7, 20); c.fillRect(x + 39, y - 8, 7, 20);
  c.fillStyle = '#a77b4f'; c.fillRect(x - 54, y - 70, 108, 64); c.strokeStyle = '#5a3f26'; c.lineWidth = 2; c.strokeRect(x - 54, y - 70, 108, 64);
  c.fillStyle = after ? '#e9f7ee' : '#fff4f0'; c.fillRect(x - 46, y - 62, 44, 48); c.fillStyle = '#ffffff'; c.fillRect(x + 4, y - 62, 42, 48);
  if (!after) { line(c, [[x - 40, y - 52], [x - 10, y - 52]], BAD, 3); for (let i = 0; i < 3; i++) line(c, [[x - 40, y - 42 + i * 8], [x - 8, y - 42 + i * 8]], '#c9a49a', 2); }
  else { line(c, [[x - 40, y - 52], [x - 10, y - 52]], GOOD, 3); for (let i = 0; i < 3; i++) line(c, [[x - 40, y - 42 + i * 8], [x - 8, y - 42 + i * 8]], '#9ec9ad', 2); }
  line(c, [[x + 10, y - 52], [x + 40, y - 52]], '#3a6f9a', 3); for (let i = 0; i < 3; i++) line(c, [[x + 10, y - 42 + i * 8], [x + 40, y - 42 + i * 8]], '#a9bed0', 2);
}
function planks(c, pts, sunk, after) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 14), ang = Math.atan2(y1 - y0, x1 - x0);
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
      const d = sunk ? Math.max(0, 1 - Math.hypot(x - 690, y - 375) / 85) : 0;
      c.save(); c.translate(x, y + d * 26); c.rotate(ang + Math.PI / 2 + (d ? Math.sin(k * 2.1) * 0.25 * d : 0));
      c.fillStyle = d > 0.15 ? '#8a6a48' : '#b88a5a'; c.fillRect(-22, -5, 44, 10); c.strokeStyle = 'rgba(80,50,20,.45)'; c.lineWidth = 1; c.strokeRect(-22, -5, 44, 10);
      c.restore();
    }
  }
  if (sunk) {
    oval(c, 690, 400, 62, 22, -0.4, after ? 'rgba(120,170,200,.35)' : 'rgba(110,165,200,.55)', 'rgba(70,110,140,.5)', 2);
    line(c, [[640, 360], [660, 372], [652, 388]], '#5a4a3a', 2); line(c, [[730, 372], [716, 392], [734, 404]], '#5a4a3a', 2);
  }
}
function sign(c, x, y, tilt, text, fresh) {
  c.save(); c.translate(x, y); c.rotate(tilt);
  c.fillStyle = '#6a5a48'; c.fillRect(-3, -54, 6, 56);
  rr(c, -40, -82, 80, 30, 5); c.fillStyle = fresh ? '#fff6cf' : '#e9e2d0'; c.fill(); c.strokeStyle = fresh ? '#c9921f' : '#8a7a68'; c.lineWidth = 2; c.stroke();
  if (fits(c, text, 0, -62, 12)) txt(c, text, 0, -62, {size: 12, color: INK, align: 'center'});
  c.restore();
}
function fence(c, x0, x1, y) { for (let x = x0; x <= x1; x += 22) { c.fillStyle = (x / 22) % 2 < 1 ? '#f08a3a' : '#ffffff'; c.fillRect(x, y - 26, 8, 28); } line(c, [[x0, y - 20], [x1 + 8, y - 20]], '#f08a3a', 4); line(c, [[x0, y - 8], [x1 + 8, y - 8]], '#ffffff', 4); }
function portal(c, x, y, t, still) {
  oval(c, x, y + 4, 52, 14, 0, 'rgba(21,75,88,.25)');
  c.fillStyle = '#789fac'; c.fillRect(x - 44, y - 74, 12, 74); c.fillRect(x + 32, y - 74, 12, 74);
  c.strokeStyle = '#bcecf1'; c.lineWidth = 12; c.beginPath(); c.arc(x, y - 70, 38, Math.PI, 0); c.stroke();
  const g = c.createLinearGradient(0, y - 110, 0, y); g.addColorStop(0, '#1a6e87'); g.addColorStop(1, '#a9ebe9'); c.fillStyle = g;
  c.beginPath(); c.moveTo(x - 31, y - 4); c.lineTo(x - 31, y - 70); c.arc(x, y - 70, 31, Math.PI, 0); c.lineTo(x + 31, y - 4); c.closePath(); c.fill();
  c.fillStyle = '#eaffff'; for (let i = 0; i < 7; i++) { const yy = y - 92 + ((i * 17 + (still ? 0 : t * 14)) % 80); c.fillRect(x - 22 + (i * 13) % 44, yy, 3, 3); }
}
export function drawVillage(c, S, E, after) {
  const t = E.t, still = E.RM, V = E.V;
  mountains(c); ground(c); lanes(c);
  for (const [x, y, k] of [[40, 240, 1.2], [92, 218, 0.95], [130, 252, 1.3], [1262, 244, 1.2], [1316, 216, 0.95], [1366, 254, 1.35], [1232, 280, 1.05], [872, 222, 0.85], [916, 236, 1]]) larch(c, x, y, k);
  for (let x = 170; x <= 370; x += 30) { c.fillStyle = '#8a7a68'; c.fillRect(x, 232, 5, 32); } line(c, [[170, 240], [375, 240]], '#8a7a68', 3); line(c, [[170, 254], [375, 254]], '#8a7a68', 3);
  reindeer(c, 230, 300, 0.9, still, t); reindeer(c, 300, 292, 0.8, still, t + 1); reindeer(c, 345, 305, 0.7, still, t + 2);
  observatory(c, 1150, 300, after);
  planks(c, PATH, true, after);
  if (after) { planks(c, DETOUR, false, true); fence(c, 640, 740, 372); sign(c, 480, 468, 0, '돌아가는 길', true); sign(c, 760, 360, 0, '안내판', true); }
  else sign(c, 728, 360, 0.32, '북쪽 산책로', false);
  house(c, 300, 760, '#5f8fc0', 100);
  house(c, 575, 770, '#c95f4f', 112, {smoke: true, t: still ? 0 : t});
  house(c, 820, 770, '#e0b13f', 112, {label: '민박'});
  clinic(c, 1015, 680);
  radioStation(c, 1250, 640, still ? 0 : t, after && !!V.msg);
  board(c, 340, 600, after);
  portal(c, 180, 690, t, still);
  if (after) drawChuck(c, 455, 640, {done: true}, performance.now());
  // 마을 사람
  const tt = still ? 0 : t;
  if (!after) {
    person(c, 'haneul', 470, 520, {t: tt}); person(c, 'granny', 540, 812, {t: tt}); person(c, 'guest', 856, 812, {t: tt}); person(c, 'keeper', 1150, 362, {t: tt});
  } else {
    const k = still ? 0.5 : (t * 0.08) % 1, i = Math.min(DETOUR.length - 2, Math.floor(k * (DETOUR.length - 1))), u = k * (DETOUR.length - 1) - i;
    const hx = DETOUR[i][0] + (DETOUR[i + 1][0] - DETOUR[i][0]) * u, hy = DETOUR[i][1] + (DETOUR[i + 1][1] - DETOUR[i][1]) * u;
    person(c, 'haneul', hx, hy + 18, {dir: 'right', moving: !still, t: tt});
    person(c, 'granny', 540, 812, {t: tt, emote: S.done.granny2 ? 'wave' : undefined}); person(c, 'guest', 780, 400, {dir: 'up', t: tt}); person(c, 'keeper', 1150, 362, {t: tt, emote: 'cheer'});
  }
}

// ================================================================ 탐험 장면 1: 북쪽 마을 도착
const LOOK = ['board', 'haneul', 'path', 'granny', 'guest'];
const arrive = {
  owner: '북쪽 자매 마을 탐사 (2050년 이야기, 모형)',
  label: '여름이 끝나 가는 북쪽 자매 마을. 이끼 덮인 땅에 물웅덩이가 있고, 마을 게시판, 내려앉은 산책로, 할머니 집, 민박집, 관측소를 걸어서 둘러본다.',
  w: 1400, h: 900, rects: [[90, 230, 1320, 840]], start: [200, 720], answer: 'explored', bg: '#b4c08c',
  moverName: '탐사대', travel: '마을 길을 걷는 중이에요', trail: 'mud', listTitle: '둘러볼 곳', speed: 200,
  intro: '북쪽 자매 마을에 도착했어요. 방향키나 아래 단추로 걷고, 사람이나 장소 가까이 가면 할 일이 나와요. 「다음 장소로」를 누르면 저절로 걸어가요.',
  cheer: '마을을 다 둘러봤어요',
  finish: '마을을 둘러봤어요. 땅이 녹아 산책로가 내려앉은 것은 눈으로 확인했어요. 바이러스 이야기는 누가 확인했는지 모르는 소문이에요.',
  again: '마을을 다 둘러봤어요. 다시 걸어 봐도 괜찮아요.',
  stations: [
    {id: 'board', name: '마을 게시판', short: '마을 게시판', at: [340, 640], r: 70, lab: [0, -96], info: '마을 게시판이에요. 종이 두 장이 붙어 있어요.', cheer: '두 소식이 서로 달라요',
      acts: [
        {id: 'rumor', label: '주민 글 읽기', run: () => '주민 글: 「얼어 있던 땅에서 오래된 바이러스가 나왔대요. 이제 모두 감염되는 건가요?」 누가 확인했는지는 적혀 있지 않아요.'},
        {id: 'memo', label: '관측소 쪽지 읽기', run: () => '관측소 쪽지: 「산책로 땅이 녹아 내려앉은 것은 확인했어요. 사람에게 어떤 위험이 있는지는 자료를 더 살펴봐야 해요.」'},
      ]},
    {id: 'haneul', name: '하늘 씨', short: '출근하는 하늘 씨', at: [470, 540], r: 62, lab: [0, -90], info: '산책로 입구에서 일하러 가는 하늘 씨를 만났어요.', cheer: '날마다 이 길로 가요',
      acts: [{id: 'talk', label: '이야기 듣기', run: () => '하늘 씨: 「날마다 이 산책로로 일하러 가요. 마을 소식은 휴대전화 알림으로 바로 봐요. 길목 표지판도 지나가면서 보고, 집에서는 마을 방송도 들어요.」'}]},
    {id: 'path', name: '내려앉은 산책로', short: '내려앉은 산책로', at: [690, 400], r: 82, lab: [0, -110], info: '산책로 가운데가 푹 꺼져 있어요. 나무판 사이로 물이 고였어요.', cheer: '땅이 정말 내려앉았어요',
      acts: [
        {id: 'look', label: '꺼진 곳 살펴보기', run: (S, E) => { E.trigger('crack'); E.look(690, 400, 1.4); return '꺼진 나무판 아래 흙이 축축하게 젖어 있어요. 얼어 있던 땅이 녹은 것 같아요.'; }},
        {id: 'ruler', label: '자로 재기', need: ['look'], needMsg: '먼저 꺼진 곳을 살펴봐요.', run: (S, E) => { E.trigger('ruler'); S.v.ruler = 1; return '원래 길 높이보다 40 cm 내려앉았어요. 모형 값이에요.'; }},
        {id: 'sign', label: '기울어진 표지판 보기', run: () => '표지판 기둥이 꺼진 쪽으로 기울었어요. 지난해 사진에서는 똑바로 서 있었대요.'},
      ]},
    {id: 'granny', name: '할머니 집', short: '할머니 집', at: [560, 820], r: 70, lab: [0, -150], info: '할머니가 문 앞에 나와 계세요.', cheer: '방송은 꼭 들어요',
      acts: [{id: 'talk', label: '이야기 듣기', run: () => '할머니: 「휴대전화 글씨가 작아서 잘 안 봐요. 마을 방송은 꼭 듣지요. 이웃이 와서 알려 주면 제일 좋고요. 산책로가 무너져서 보건소 가는 길이 걱정이에요.」'}]},
    {id: 'guest', name: '민박집 여행객', short: '민박집 여행객', at: [850, 820], r: 70, lab: [0, -150], info: '민박집 앞에서 여행객을 만났어요.', cheer: '마을이 처음이에요',
      acts: [{id: 'talk', label: '이야기 듣기', run: () => '여행객: 「이 마을은 처음이라 마을 방송이 언제 나오는지 몰라요. 길목 표지판이나 민박집 주인이 알려 주는 말을 보고 다녀요.」'}]},
    {id: 'obs', name: '관측소', short: '관측소', at: [1150, 380], r: 86, lab: [0, -200], info: '언덕 위 관측소예요. 연구원이 땅속을 재는 기계를 손보고 있어요.', cheer: '땅속을 재어 봐요',
      acts: [{id: 'enter', label: '관측소에 들어가기', go: true, need: (S) => (LOOK.some((k) => !S.done[k]) ? '먼저 마을을 둘러봐요. 아직 들르지 않은 곳이 있어요.' : null), run: (S) => { S.v.entered = 1; return '관측소 연구원: 「어서 와요. 땅속 얼음층이 어떻게 바뀌었는지 같이 재어 봐요.」'; }}]},
  ],
  next: (S) => (LOOK.every((k) => S.done[k]) ? 'obs' : null),
  back: (c, S, E) => drawVillage(c, S, E, false),
  front: (c, S, E) => {
    const w = E.wave('crack', 1.4); if (w) { c.strokeStyle = `rgba(90,60,30,${w})`; c.lineWidth = 3; line(c, [[660, 380], [690, 395], [700, 418]], `rgba(90,60,30,${w})`, 3); }
    if (S.v.ruler) { line(c, [[760, 330], [760, 396]], '#e4573d', 3); line(c, [[752, 330], [768, 330]], '#e4573d', 3); line(c, [[752, 396], [768, 396]], '#e4573d', 3); if (fits(c, '40 cm', 797, 367, 12)) { rr(c, 770, 352, 54, 20, 4); c.fillStyle = '#ffffff'; c.fill(); txt(c, '40 cm', 797, 367, {size: 12, color: BAD, align: 'center'}); } }
  },
  mini: (c, ox, oy, sc) => { c.fillStyle = 'rgba(184,196,146,.92)'; c.fillRect(ox, oy, 1400 * sc, 900 * sc); line(c, PATH.map(([x, y]) => [ox + x * sc, oy + y * sc]), '#b88a5a', 3); },
};
arrive.drawMover = walker();

// ================================================================ 탐험 장면 2: 안내가 닿은 뒤의 마을
const after = {
  ...arrive,
  owner: '북쪽 자매 마을, 안내가 닿은 뒤 (2050년 이야기, 모형)',
  label: '안내가 닿은 뒤의 북쪽 마을. 내려앉은 산책로에는 울타리와 안내판이 서고 돌아가는 나무 길이 생겼다.',
  start: [200, 720], answer: 'toured', listTitle: '다시 들를 곳',
  intro: '방송이 나간 다음 날 북쪽 마을이에요. 무엇이 달라졌는지 걸어 다니며 살펴봐요.',
  cheer: '마을이 침착해졌어요',
  finish: '북쪽 마을 사람들이 확인한 것과 아직 모르는 것을 알고 침착하게 움직여요. 척척의 알림도 고쳐졌어요.',
  again: '마을을 다시 둘러봤어요.',
  stations: [
    {id: 'sign2', name: '새 안내판', short: '새 안내판', at: [760, 420], r: 70, lab: [0, -110], info: '내려앉은 산책로 앞에 울타리와 안내판이 섰어요.', cheer: '내가 만든 안내예요',
      acts: [{id: 'read', label: '안내판 읽기', run: (S, E) => { const m = E.V.msg; return m ? `안내판: 「${m.join(' ')}」` : '안내판: 「산책로 땅이 내려앉았어요. 돌아가는 길을 써 주세요.」'; }}]},
    {id: 'haneul2', name: '하늘 씨', short: '하늘 씨', at: [640, 500], r: 70, lab: [0, -100], info: '하늘 씨가 돌아가는 나무 길로 출근하고 있어요.', cheer: '넘어질 걱정이 없어요',
      acts: [{id: 'talk', label: '이야기 듣기', run: () => '하늘 씨: 「안내를 보고 돌아가는 길로 다녀요. 조금 멀어도 넘어질 걱정이 없어요. 몸이 아프면 보건소에 알리면 된다는 것도 알았어요.」'}]},
    {id: 'granny2', name: '할머니', short: '할머니', at: [560, 820], r: 70, lab: [0, -150], info: '할머니가 손을 흔들어요.', cheer: '덜 무서워요',
      acts: [{id: 'talk', label: '이야기 듣기', run: () => '할머니: 「방송을 들었어요. 확인한 것과 아직 모르는 것을 나눠서 알려 주니 덜 무서워요. 보건소 가는 돌아가는 길도 알았어요.」'}]},
    {id: 'guest2', name: '여행객', short: '여행객', at: [780, 430], r: 60, lab: [0, -100], info: '여행객이 안내판을 읽고 있어요.', cheer: '길을 알았어요',
      acts: [{id: 'talk', label: '이야기 듣기', run: () => '여행객: 「처음 온 마을인데도 어디로 다니면 되는지, 새 소식은 어디서 듣는지 알았어요.」'}]},
    {id: 'clinic', name: '보건소 기록판', short: '보건소 기록판', at: [1015, 720], r: 70, lab: [0, -130], info: '보건소 앞에 기록판이 붙어 있어요.', cheer: '같은 조건으로 계속 봐요',
      acts: [{id: 'read', label: '기록판 읽기', run: () => '보건소 기록판: 「같은 세 마을의 기록을 같은 방법으로 계속 비교하고 있어요. 돌아가는 길이 생긴 뒤 넘어져 다친 제보가 줄었어요. 모형 값이에요.」'}]},
    {id: 'chuck', name: '척척 단말', short: '척척 단말', at: [455, 660], r: 64, lab: [0, -120], info: '광장 앞 척척 단말의 화면이 초록색으로 바뀌었어요.', cheer: '알림이 고쳐졌어요',
      acts: [{id: 'read', label: '척척 알림 확인하기', go: true, need: (S) => (['sign2', 'haneul2', 'granny2', 'guest2', 'clinic'].some((k) => !S.done[k]) ? '마을을 먼저 둘러봐요. 아직 들르지 않은 곳이 있어요.' : null), run: () => '척척: 「땅이 녹아 산책로가 내려앉은 것은 확인했어요. 오래된 바이러스가 사람에게 퍼지는지는 확인되지 않았어요. 새 소식은 마을 방송으로 알려 드려요.」'}]},
  ],
  next: (S) => (['sign2', 'haneul2', 'granny2', 'guest2', 'clinic'].every((k) => S.done[k]) ? 'chuck' : null),
  back: (c, S, E) => drawVillage(c, S, E, true),
  front: null,
};
after.drawMover = walker();
addVoyageModes({tundra: arrive, 'tundra-after': after});

// ================================================================ 실험대 공통
function device(el, owner, label) {
  const canvas = el('canvas', {class: 'bench-canvas sun-canvas', width: 1440, height: 760, role: 'img', 'aria-label': label});
  const status = el('p', {class: 'signal-status', role: 'status'});
  const tray = el('div', {class: 'signal-tray'});
  const node = el('div', {class: 'signal-device sun tundra-lab'}, el('div', {class: 'signal-owner'}, owner), canvas, tray, status);
  const fill = tray.replaceChildren.bind(tray);
  tray.replaceChildren = (...kids) => {
    const a = document.activeElement, key = a && tray.contains(a) ? a.getAttribute('aria-label') || a.textContent : null;
    fill(...kids);
    if (key) queueMicrotask(() => { const all = [...tray.querySelectorAll('button')].filter((b) => !b.disabled); (all.find((b) => (b.getAttribute('aria-label') || b.textContent) === key) || all[0])?.focus({preventScroll: true}); });
  };
  return {canvas, status, tray, node, c: canvas.getContext('2d')};
}
function seg(el, button, name, list, cur, on, off = () => false) {
  return el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, name), el('span', {class: 'bench-seg'}, list.map(([v, n, aria]) => {
    const b = button(n, () => on(v), 'bench-opt');
    b.setAttribute('aria-pressed', String(Array.isArray(cur) ? cur.includes(v) : cur === v));
    if (aria) b.setAttribute('aria-label', aria);
    if (off(v)) b.disabled = true;
    return b;
  })));
}
function wrap(c, s, x, y, maxW, lh, {size = 12, bold = false, color = INK, align = 'left'} = {}) {
  c.font = FONT(size, bold); let cur = '', yy = y;
  for (const w of s.split(' ')) { const tt = cur ? cur + ' ' + w : w; if (cur && c.measureText(tt).width > maxW) { txt(c, cur, x, yy, {size, bold, color, align}); cur = w; yy += lh; } else cur = tt; }
  if (cur) txt(c, cur, x, yy, {size, bold, color, align});
  return yy;
}
function loop(c, draw) {
  let alive = true, raf = 0, last = performance.now(), T = 0;
  const frame = (now) => { if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt; c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#e8eef3'; c.fillRect(0, 0, 720, 380); draw(T, dt); raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  return () => { alive = false; cancelAnimationFrame(raf); };
}

// ================================================================ 실험대 1: 땅속 얼음층 관측기
// 녹는 깊이(모형): 겨울 0, 2026년 여름 50 cm, 2050년 여름 90 cm. 2050년에는 얼음이 녹은 만큼 땅이 40 cm 내려앉아 있다.
const PF_TEMP = {'winter-2026': [-15, -9, -6], 'summer-2026': [8, 0, -2], 'winter-2050': [-12, -7, -4], 'summer-2050': [11, 3, -1]};
const PF_THAW = {'winter-2026': 0, 'summer-2026': 50, 'winter-2050': 0, 'summer-2050': 90};
export function permafrost({el, button, task = {}, memory = {}, save, onAction: fire, onReady}) {
  const onAction = act(task, fire), RM = reduceMotion();
  const m = memory.pf ??= {rows: {}};
  let season = 'winter', year = 2026, probe = 0;
  const {canvas, status, tray, node, c} = device(el, '관측소 땅속 얼음층 관측기 (모형 값)', '땅을 세로로 자른 모습. 위에서부터 여름에 녹는 층과 계속 얼어 있는 층이 보이고, 오른쪽 막대로 땅속 온도를 잰다.');
  const key = () => `${season}-${year}`;
  const ready = () => m.rows['summer-2026'] && m.rows['summer-2050'];
  const sinkK = {v: year === 2050 ? 1 : 0}, thawK = {v: PF_THAW[key()]};
  function render() {
    tray.replaceChildren(
      seg(el, button, '계절', [['winter', '겨울'], ['summer', '여름']], season, (v) => { season = v; probe = 0; status.textContent = v === 'summer' ? '여름이에요. 땅 위쪽부터 녹기 시작해요.' : '겨울이에요. 땅이 모두 꽁꽁 얼어 있어요.'; render(); }),
      seg(el, button, '해', [[2026, '2026년'], [2050, '2050년 (더 더운 여름)']], year, (v) => { year = v; probe = 0; status.textContent = v === 2050 ? '2050년이에요. 여름 기온이 2026년보다 높아요.' : '2026년이에요.'; render(); }),
      el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, '재기'), el('span', {class: 'bench-seg'}, button('땅속 온도 재기', () => measure(), 'mission-go'))),
      table());
  }
  function table() {
    const rows = [['winter-2026', '2026년 겨울'], ['summer-2026', '2026년 여름'], ['winter-2050', '2050년 겨울'], ['summer-2050', '2050년 여름']].filter(([k]) => m.rows[k]);
    if (!rows.length) return el('p', {class: 'm-how'}, '계절과 해를 고르고 땅속 온도를 재면 기록표에 쌓여요. 2026년 여름과 2050년 여름을 꼭 재어 비교해요.');
    return el('div', {class: 'sun-table'}, el('table', {class: 'narrow'}, el('tr', {}, el('th', {}, '언제'), el('th', {}, '땅속 10 cm'), el('th', {}, '땅속 50 cm'), el('th', {}, '땅속 1 m'), el('th', {}, '녹은 깊이')),
      rows.map(([k, n]) => el('tr', {}, el('th', {}, n), PF_TEMP[k].map((v) => el('td', {}, `${v} °C`)), el('td', {}, PF_THAW[k] ? `${PF_THAW[k]} cm` : '녹지 않음')))));
  }
  function measure() {
    probe = performance.now(); m.rows[key()] = true; save?.();
    const th = PF_THAW[key()];
    status.textContent = th ? `${year}년 여름에는 땅속 ${th} cm까지 녹았어요. 그 아래는 0 °C보다 차가워 계속 얼어 있어요.` + (year === 2050 ? ' 녹은 얼음 자리만큼 땅이 내려앉아 길과 표지판이 기울었어요.' : '') : `${year}년 겨울에는 땅이 모두 얼어 있어요.` + (year === 2050 ? ' 겨울이 되어 다시 얼어도 한 번 내려앉은 땅은 그대로예요.' : '');
    render();
    if (ready()) { onAction('compared'); onReady?.(); }
  }
  const stop = loop(c, (T) => {
    const k = key(), thaw = PF_THAW[k];
    sinkK.v += ((year === 2050 ? 1 : 0) - sinkK.v) * (RM ? 1 : 0.08); thawK.v += (thaw - thawK.v) * (RM ? 1 : 0.08);
    const sink = sinkK.v * 56, y0 = 132, px = 1.0, thawPx = thawK.v * px;
    // 하늘
    const sky = c.createLinearGradient(0, 0, 0, y0); sky.addColorStop(0, season === 'summer' ? '#8fc8ec' : '#b6c9da'); sky.addColorStop(1, season === 'summer' ? '#d9f0fb' : '#e8eef4'); c.fillStyle = sky; c.fillRect(0, 0, 720, y0 + 30);
    if (season === 'summer') { dot(c, 640, 42, 22, year === 2050 ? '#ffb347' : '#ffd86a'); if (year === 2050 && !RM) for (let i = 0; i < 3; i++) line(c, [[600 + i * 30, 80 + Math.sin(T * 3 + i) * 3], [606 + i * 30, 70 + Math.sin(T * 3 + i) * 3], [600 + i * 30, 60]], 'rgba(255,140,60,.6)', 2); }
    else for (let i = 0; i < 26; i++) { const x = (i * 53 + (RM ? 0 : T * 20)) % 720, y = (i * 31 + (RM ? 0 : T * 26)) % (y0 + 10); dot(c, x, y, 2, '#ffffff'); }
    txt(c, `${year}년 ${season === 'summer' ? '여름' : '겨울'}`, 16, 28, {size: 18, color: INK});
    // 땅 위 모습: 길, 표지판, 말뚝 위 집
    const surf = (x) => { const d = Math.abs(x - 300); return y0 + (d < 190 ? sink * (1 + Math.cos(Math.PI * d / 190)) / 2 : 0); };
    for (const sx of [560, 600, 640]) { c.fillStyle = '#6b5a48'; c.fillRect(sx, y0 - 24, 6, 120); }
    c.fillStyle = '#fbf6ec'; c.fillRect(548, y0 - 70, 104, 46); c.fillStyle = '#c95f4f'; c.beginPath(); c.moveTo(540, y0 - 68); c.lineTo(600, y0 - 98); c.lineTo(660, y0 - 68); c.fill();
    // 땅속: 녹은 층과 영구동토
    const bottom = 372, dep = (cm) => y0 + 14 + cm * px * 1.4;
    c.fillStyle = '#9fb3c4'; c.fillRect(0, y0 + 14, 720, bottom - y0 - 14);
    const g = c.createLinearGradient(0, y0 + 14, 0, bottom); g.addColorStop(0, '#a9bfcf'); g.addColorStop(1, '#7f97ab'); c.fillStyle = g; c.fillRect(0, y0 + 14, 720, bottom - y0 - 14);
    const rnd = seeded(9);
    for (let i = 0; i < 70; i++) { const x = rnd() * 720, cm = 45 + rnd() * 60, y = dep(cm), w = 10 + rnd() * 26; if (cm < thawK.v) continue; oval(c, x, y, w, 4 + rnd() * 3, 0, 'rgba(240,250,255,.9)', 'rgba(170,200,220,.8)', 1); }
    for (let i = 0; i < 40; i++) { const x = rnd() * 720, cm = 110 + rnd() * 80, y = dep(cm); oval(c, x, y, 6 + rnd() * 10, 3, 0, 'rgba(230,245,255,.7)'); }
    if (thawPx > 1) {
      const yb = dep(thawK.v);
      const tg = c.createLinearGradient(0, y0 + 14, 0, yb); tg.addColorStop(0, '#8a6a48'); tg.addColorStop(1, '#6e5038'); c.fillStyle = tg; c.fillRect(0, y0 + 14, 720, yb - y0 - 14);
      for (let i = 0; i < 40; i++) { const x = rnd() * 720, y = y0 + 18 + rnd() * (yb - y0 - 22); dot(c, x, y, 1.6 + rnd() * 1.6, rnd() < 0.5 ? 'rgba(120,180,220,.8)' : 'rgba(60,40,25,.6)'); }
      c.setLineDash([8, 6]); line(c, [[0, yb], [720, yb]], '#e4573d', 2.5); c.setLineDash([]);
      rr(c, 610, yb - 22, 92, 20, 4); c.fillStyle = '#ffffff'; c.fill(); txt(c, '0 °C 선', 656, yb - 7, {size: 12, color: BAD, align: 'center'});
      txt(c, '여름에 녹는 층', 20, y0 + 34, {size: 12, color: '#fff6e0'});
    }
    txt(c, '영구동토: 2년 넘게 계속 얼어 있는 땅', 20, bottom - 12, {size: 12, color: '#f4fbff'});
    // 땅 위: 얼음이 녹은 만큼 가운데가 꺼진다. 꺼진 자리는 하늘색으로 비우고 겉흙 띠를 그 높이로 내린다.
    c.fillStyle = season === 'summer' ? '#d9f0fb' : '#e8eef4'; c.beginPath(); c.moveTo(0, y0); for (let x = 0; x <= 720; x += 10) c.lineTo(x, surf(x)); for (let x = 720; x >= 0; x -= 10) c.lineTo(x, y0); c.fill();
    c.fillStyle = season === 'summer' ? '#9db48a' : '#f4f9fc'; c.beginPath(); c.moveTo(0, y0); for (let x = 0; x <= 720; x += 10) c.lineTo(x, surf(x)); for (let x = 720; x >= 0; x -= 10) c.lineTo(x, surf(x) + 14); c.fill();
    if (sink > 1) { c.setLineDash([5, 4]); line(c, [[110, y0], [490, y0]], 'rgba(29,53,80,.45)', 1.5); c.setLineDash([]); }
    for (let x = 120; x < 480; x += 16) { const y = surf(x + 6) - 4, a = Math.atan2(surf(x + 13) - surf(x), 13); c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#b88a5a'; c.fillRect(0, 0, 13, 6); c.restore(); }
    c.save(); c.translate(250, surf(250) - 2); c.rotate(sinkK.v * 0.3); c.fillStyle = '#6a5a48'; c.fillRect(-2, -38, 4, 40); rr(c, -26, -56, 52, 20, 4); c.fillStyle = '#e9e2d0'; c.fill(); txt(c, '산책로', 0, -42, {size: 11, color: INK, align: 'center'}); c.restore();
    // 깊이 자
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(470, y0 + 14, 34, bottom - y0 - 14);
    for (const [cm, s] of [[0, '0'], [50, '50 cm'], [100, '1 m'], [150, '1.5 m']]) { const y = dep(cm); line(c, [[470, y], [482, y]], INK, 1.5); txt(c, s, 486, y + 4, {size: 10, color: INK}); }
    // 온도 막대
    c.fillStyle = '#d9dee4'; c.fillRect(530, y0 - 6, 8, dep(110) - y0 + 6); c.strokeStyle = '#596978'; c.lineWidth = 1.5; c.strokeRect(530, y0 - 6, 8, dep(110) - y0 + 6);
    if (probe) {
      const age = (performance.now() - probe) / 1000;
      PF_TEMP[k].forEach((v, i) => {
        if (!RM && age < i * 0.35) return;
        const y = dep([10, 50, 100][i]); dot(c, 534, y, 5, v > 0 ? '#e4573d' : '#3f86c8', '#ffffff', 1.5);
        rr(c, 404, y - 11, 60, 20, 5); c.fillStyle = v > 0 ? '#ffe9e4' : '#e4f1fb'; c.fill(); c.strokeStyle = v > 0 ? BAD : '#3f86c8'; c.lineWidth = 1.2; c.stroke();
        txt(c, `${v} °C`, 434, y + 4, {size: 12, color: v > 0 ? BAD : '#1f5f99', align: 'center'});
      });
    }
    if (sinkK.v > 0.5) { line(c, [[300, y0], [300, surf(300)]], BAD, 2.5); line(c, [[293, y0], [307, y0]], BAD, 2.5); line(c, [[293, surf(300)], [307, surf(300)]], BAD, 2.5); line(c, [[300, y0 - 4], [330, y0 - 34]], BAD, 1.5); rr(c, 318, y0 - 58, 140, 24, 5); c.fillStyle = 'rgba(255,255,255,.92)'; c.fill(); txt(c, '땅이 40 cm 내려앉음', 388, y0 - 41, {size: 12, color: BAD, align: 'center'}); }
    txt(c, '모형 값', 712, 372, {size: 10, color: '#eef4f8', align: 'right'});
  });
  render();
  status.textContent = ready() ? '2026년과 2050년 여름을 모두 재어 보았어요. 다시 재어 봐도 괜찮아요.' : '관측소 땅속 얼음층 관측기예요. 계절과 해를 바꾸고 땅속 온도를 재어 보세요.';
  if (ready()) later(onReady);
  return {node, stop};
}

// ================================================================ 실험대 2: 관측소 연구실 현미경
const AM_COUNT = {a: [20, 21, 21, 22], b: [20, 15, 8, 3]};
export function amoebaLab({el, button, task = {}, memory = {}, save, onAction: fire, onReady}) {
  const onAction = act(task, fire), RM = reduceMotion();
  const m = memory.am ??= {thawed: false, added: false, day: 0};
  const {canvas, status, tray, node, c} = device(el, '관측소 연구실 현미경 (실제 연구를 간단히 나타낸 모형)', '현미경으로 본 두 접시. 왼쪽은 아메바만, 오른쪽은 아메바와 동토 시료에서 꺼낸 바이러스.');
  const rnd = seeded(31), blobs = Array.from({length: 24}, (_, i) => ({x: rnd(), y: rnd(), a: rnd() * TAU, s: 0.8 + rnd() * 0.4, k: i}));
  let burstAt = 0;
  function render() {
    const b = [];
    if (!m.thawed) b.push(button('동토 시료 녹이기', () => { m.thawed = true; save?.(); status.textContent = '3만 년 넘게 얼어 있던 흙을 실험실에서 조심스럽게 녹였어요. 연구자는 이 흙에서 바이러스를 꺼내요.'; render(); }, 'mission-go'));
    else if (!m.added) b.push(button('B 접시에 바이러스 넣기', () => { m.added = true; save?.(); status.textContent = '동토 시료에서 꺼낸 바이러스를 B 접시에만 넣었어요. A 접시에는 넣지 않아요. 이제 하루씩 지켜봐요.'; render(); }, 'mission-go'));
    else if (m.day < 3) b.push(button('하루 지나기', () => { m.day++; burstAt = performance.now(); save?.(); status.textContent = `${m.day}일째예요. A 접시 아메바 ${AM_COUNT.a[m.day]}마리, B 접시 아메바 ${AM_COUNT.b[m.day]}마리예요.` + (m.day === 3 ? ' 아래 연구 카드를 읽어 봐요.' : ''); render(); if (m.day >= 3) { onAction('observed'); onReady?.(); } }, 'mission-go'));
    else b.push(button('처음부터 다시 보기', () => { m.day = 0; m.added = false; m.thawed = false; save?.(); status.textContent = '처음 상태로 돌아왔어요.'; render(); }, 'bench-opt'));
    tray.replaceChildren(el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, '실험'), el('span', {class: 'bench-seg'}, ...b)));
  }
  function dish(cx, cy, which, T) {
    c.save(); c.beginPath(); c.arc(cx, cy, 120, 0, TAU); c.clip();
    c.fillStyle = '#eaf4e6'; c.fillRect(cx - 120, cy - 120, 240, 240);
    for (let i = 0; i < 30; i++) dot(c, cx - 110 + ((i * 47) % 220), cy - 110 + ((i * 71) % 220), 2, 'rgba(160,190,150,.5)');
    const n = AM_COUNT[which][m.day], age = (performance.now() - burstAt) / 1000;
    blobs.forEach((bl, i) => {
      const lostNow = which === 'b' && i >= n && i < AM_COUNT.b[Math.max(0, m.day - 1)] && age < 1.6 && !RM;
      if (i >= n && !lostNow) { if (which === 'b' && m.day > 0 && i < 20) { const x = cx - 95 + bl.x * 190, y = cy - 95 + bl.y * 190; c.strokeStyle = 'rgba(140,120,100,.45)'; c.lineWidth = 1; for (let k = 0; k < 6; k++) { const a = k * TAU / 6; line(c, [[x + Math.cos(a) * 4, y + Math.sin(a) * 4], [x + Math.cos(a) * 9, y + Math.sin(a) * 9]], 'rgba(140,120,100,.45)', 1.2); } } return; }
      const x = cx - 95 + bl.x * 190 + (RM ? 0 : Math.sin(T * 0.6 + i) * 4), y = cy - 95 + bl.y * 190 + (RM ? 0 : Math.cos(T * 0.5 + i) * 4), s = bl.s * (lostNow ? 1 + age * 0.6 : 1);
      c.save(); c.translate(x, y); c.rotate(bl.a + (RM ? 0 : T * 0.2));
      c.beginPath(); for (let k = 0; k <= 12; k++) { const a = k * TAU / 12, r = (11 + Math.sin(a * 3 + T + i) * 3) * s; k ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fillStyle = lostNow ? `rgba(200,180,150,${1 - age / 1.6})` : 'rgba(170,205,160,.9)'; c.fill(); c.strokeStyle = 'rgba(80,120,70,.8)'; c.lineWidth = 1.2; c.stroke();
      dot(c, 2 * s, -1 * s, 3.2 * s, 'rgba(90,120,80,.85)');
      c.restore();
    });
    if (which === 'b' && m.added) for (let i = 0; i < 26; i++) { const x = cx - 100 + ((i * 37 + (RM ? 0 : T * 8)) % 200), y = cy - 100 + ((i * 59) % 200); dot(c, x, y, 1.8, '#8a4aa8'); }
    c.restore();
    dot(c, cx, cy, 120, null, '#4f6178', 6); dot(c, cx, cy, 126, null, 'rgba(255,255,255,.6)', 3);
  }
  const stop = loop(c, (T) => {
    c.fillStyle = '#1e2c3c'; c.fillRect(0, 0, 720, 380);
    txt(c, `${m.day}일째`, 360, 26, {size: 18, color: '#ffe08a', align: 'center'});
    dish(185, 190, 'a', T); dish(535, 190, 'b', T);
    txt(c, 'A 접시: 아메바만', 185, 336, {size: 13, color: '#ffffff', align: 'center'});
    txt(c, m.added ? 'B 접시: 아메바와 동토 바이러스' : 'B 접시: 아메바만 (아직)', 535, 336, {size: 13, color: '#ffffff', align: 'center'});
    txt(c, `아메바 ${AM_COUNT.a[m.day]}마리`, 185, 358, {size: 12, color: '#bfe6c8', align: 'center'});
    txt(c, `아메바 ${AM_COUNT.b[m.day]}마리`, 535, 358, {size: 12, color: m.day ? '#ffb4a4' : '#bfe6c8', align: 'center'});
    if (m.thawed && !m.added) { rr(c, 300, 56, 120, 70, 8); c.fillStyle = 'rgba(255,255,255,.9)'; c.fill(); rr(c, 340, 66, 40, 50, 6); c.fillStyle = '#9fb3c4'; c.fill(); c.fillStyle = '#6e5038'; c.fillRect(342, 92, 36, 22); txt(c, '녹인 시료', 360, 122, {size: 11, color: INK, align: 'center'}); }
    if (m.day >= 3) {
      panel(c, 196, 92, 328, 150, 'rgba(255,255,255,.96)');
      txt(c, '연구 카드 (2023년 발표 연구)', 212, 114, {size: 13, color: '#1f5f99'});
      wrap(c, '시베리아 영구동토 시료에서 꺼낸 바이러스가 아메바를 감염시켰어요. 연구자들은 안전을 위해 아메바만 감염시키는 바이러스를 골라 실험했어요. 사람이나 동물에게는 시험하지 않았어요.', 212, 136, 296, 17, {size: 12, color: INK});
      txt(c, '출처: Alempic 외, Viruses 15권 2호 (2023)', 212, 232, {size: 10, color: SOFT});
    }
  });
  render();
  status.textContent = m.day >= 3 ? '실험을 끝까지 보았어요. 다시 보려면 「처음부터 다시 보기」를 눌러요.' : '관측소 연구실이에요. 동토 시료를 녹여 바이러스가 아메바에게 어떤 일을 하는지 살펴봐요. 아메바는 물이나 흙에 사는 아주 작은 생물이에요.';
  if (m.day >= 3) later(onReady);
  return {node, stop};
}

// ================================================================ 실험대 3: 보건소 제보 기록판
const RP = {all: [12, 31], same: [12, 14], kinds: [['기침 감기', '#5aa9e6', [6, 6]], ['배탈', '#e8b94a', [4, 3]], ['넘어져 다침', '#e2683e', [2, 5]]]};
export function reportBoard({el, button, task = {}, memory = {}, save, onAction: fire, onReady}) {
  const onAction = act(task, fire), RM = reduceMotion();
  const m = memory.rp ??= {how: false, same: false, kinds: false};
  const {canvas, status, tray, node, c} = device(el, '북쪽 마을 보건소 제보 기록판 (모형 값)', '지난주와 이번 주의 건강 이상 제보 수를 막대로 비교하는 기록판.');
  const ready = () => m.how && m.same && m.kinds;
  let view = m.same ? 'same' : 'all', hk = {v: 0};
  function render() {
    tray.replaceChildren(el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, '살펴보기'), el('span', {class: 'bench-seg'},
      button('제보 받는 방법 보기', () => { m.how = true; save?.(); status.textContent = '지난주에는 북쪽 세 마을 사람이 보건소에 직접 와서 제보했어요. 이번 주부터는 휴대전화 제보 앱이 생기고, 이웃 세 마을도 함께 제보하기 시작했어요.'; done(); render(); }, 'bench-opt' + (m.how ? ' tested' : '')),
      button(view === 'same' ? '전체 제보 다시 보기' : '같은 조건만 비교하기', () => { if (!m.how) { status.textContent = '먼저 제보 받는 방법이 같았는지 살펴봐요.'; return; } view = view === 'same' ? 'all' : 'same'; if (view === 'same') { m.same = true; status.textContent = '같은 북쪽 세 마을에서 보건소에 직접 온 제보만 비교했어요. 지난주 12건, 이번 주 14건이에요.'; } else status.textContent = '모든 마을, 모든 방법의 제보를 합친 막대예요.'; save?.(); done(); render(); }, 'bench-opt' + (m.same ? ' tested' : '')),
      button('어떤 제보인지 나눠 보기', () => { if (!m.same) { status.textContent = '같은 조건으로 비교한 다음 나눠 봐요.'; return; } view = 'same'; m.kinds = true; save?.(); status.textContent = '같은 세 마을의 제보를 나눠 보니 기침 감기는 그대로, 배탈은 1건 줄고, 넘어져 다친 제보가 2건에서 5건으로 늘었어요.'; done(); render(); }, 'bench-opt' + (m.kinds ? ' tested' : '')))));
  }
  function done() { if (ready()) { onAction('compared'); onReady?.(); } }
  const stop = loop(c, () => {
    c.fillStyle = '#f6f1e6'; c.fillRect(0, 0, 720, 380);
    rr(c, 16, 14, 688, 352, 10); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#b9a98f'; c.lineWidth = 2; c.stroke();
    txt(c, '북쪽 마을 건강 이상 제보', 34, 44, {size: 17, color: INK});
    txt(c, view === 'same' ? '같은 세 마을, 보건소에 직접 온 제보만' : '모든 마을, 모든 방법의 제보', 34, 66, {size: 12, color: view === 'same' ? GOOD : SOFT});
    const vals = view === 'same' ? RP.same : RP.all, base = 320, top = 100, max = 34, bx = [96, 240];
    hk.v += ((view === 'same' ? 1 : 0) - hk.v) * (RM ? 1 : 0.12);
    for (let i = 0; i < 2; i++) {
      const v = RP.all[i] + (RP.same[i] - RP.all[i]) * hk.v, h = (base - top) * v / max, x = bx[i];
      if (m.kinds && view === 'same') {
        let y = base;
        for (const [, col, arr] of RP.kinds) { const hh = (base - top) * arr[i] / max; c.fillStyle = col; c.fillRect(x, y - hh, 80, hh); y -= hh; }
      } else { c.fillStyle = i ? '#e2683e' : '#7a9ab8'; c.fillRect(x, base - h, 80, h); }
      txt(c, `${Math.round(v)}건`, x + 40, base - h - 8, {size: 16, color: INK, align: 'center'});
      txt(c, i ? '이번 주' : '지난주', x + 40, base + 22, {size: 13, color: INK, align: 'center'});
    }
    line(c, [[80, base], [340, base]], '#596978', 2);
    if (m.kinds && view === 'same') RP.kinds.forEach(([n, col, arr], i) => { c.fillStyle = col; c.fillRect(372, 250 + i * 24, 14, 14); txt(c, `${n}: 지난주 ${arr[0]}건, 이번 주 ${arr[1]}건`, 394, 262 + i * 24, {size: 12, color: INK}); });
    if (m.how) {
      rr(c, 362, 84, 322, 150, 8); c.fillStyle = '#f3f8fc'; c.fill(); c.strokeStyle = '#a9bed0'; c.lineWidth = 1.5; c.stroke();
      txt(c, '제보 받는 방법', 378, 106, {size: 13, color: '#1f5f99'});
      txt(c, '지난주', 378, 132, {size: 12, color: INK}); txt(c, '북쪽 세 마을, 보건소에 직접 와서', 434, 132, {size: 12, color: SOFT});
      txt(c, '이번 주', 378, 160, {size: 12, color: INK}); wrap(c, '북쪽 세 마을과 이웃 세 마을, 보건소와 휴대전화 제보 앱', 434, 160, 236, 16, {size: 12, color: BAD});
      txt(c, '제보 수는 의사가 확인한 환자 수가 아니에요.', 378, 220, {size: 11, color: SOFT});
    }
    txt(c, '모형 값', 690, 356, {size: 10, color: SOFT, align: 'right'});
  });
  render();
  status.textContent = ready() ? '기록판을 모두 살펴보았어요.' : '보건소 기록판이에요. 제보가 지난주 12건에서 이번 주 31건으로 늘었어요. 왜 늘었는지 살펴봐요.';
  if (ready()) later(onReady);
  return {node, stop};
}

// ================================================================ 실험대 4: 역사 전시관 2016년 야말반도
const YM = [
  ['hot', '더운 여름', '2016년 여름, 러시아 야말반도는 유난히 더웠어요.'],
  ['thaw', '깊이 녹은 땅', '더위가 이어지자 땅이 평소보다 깊이 녹았어요.'],
  ['grave', '드러난 옛 무덤', '오래전 탄저병으로 죽어 묻힌 순록이 녹은 땅 밖으로 드러났을 수 있어요.'],
  ['germ', '탄저균', '탄저병은 탄저균이라는 세균 때문에 생겨요. 탄저균은 흙 속에서 아주 오래 살아남아요.'],
  ['vax', '멈춘 예방접종', '그 지역에서는 몇 해 전부터 순록에게 탄저병 예방접종을 하지 않고 있었어요.'],
  ['harm', '피해', '순록 2,000마리 넘게 죽고, 사람들도 병원에서 치료를 받았어요.'],
];
export function yamalMuseum({el, button, task = {}, memory = {}, save, onAction: fire, onReady}) {
  const onAction = act(task, fire), RM = reduceMotion();
  const m = memory.ym ??= {open: []};
  const {canvas, status, tray, node, c} = device(el, '역사 전시관: 2016년 러시아 야말반도 (실제 사건을 다시 꾸민 전시)', '야말반도의 툰드라와 순록 떼를 꾸민 전시. 전시 카드를 하나씩 켜면 그해 함께 있었던 조건이 장면에 나타난다.');
  const isOpen = (k) => m.open.includes(k);
  const all = () => YM.every(([k]) => isOpen(k));
  let lastAt = 0;
  function render() {
    tray.replaceChildren(el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, '전시 카드'), el('span', {class: 'bench-seg'},
      YM.map(([k, n, s]) => { const b = button(n, () => { if (!isOpen(k)) m.open.push(k); lastAt = performance.now(); save?.(); status.textContent = s + (all() ? ' 전시 카드를 모두 켰어요. 여러 조건이 한꺼번에 겹쳤다는 것을 장면에서 살펴봐요.' : ''); render(); if (all()) { onAction('assembled'); onReady?.(); } }, 'bench-opt' + (isOpen(k) ? ' tested' : '')); b.setAttribute('aria-pressed', String(isOpen(k))); return b; }))));
  }
  const spots = {hot: [96, 70], thaw: [210, 300], grave: [330, 280], germ: [430, 300], vax: [560, 170], harm: [640, 92]};
  const stop = loop(c, (T) => {
    const sky = c.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, isOpen('hot') ? '#ffcf8a' : '#a9cde6'); sky.addColorStop(1, '#f2f0e4'); c.fillStyle = sky; c.fillRect(0, 0, 720, 220);
    c.fillStyle = '#b9c48e'; c.fillRect(0, 200, 720, 180);
    if (isOpen('hot')) { dot(c, 96, 62, 30, '#ffb347'); if (!RM) for (let i = 0; i < 4; i++) line(c, [[150 + i * 40, 150 + Math.sin(T * 3 + i) * 4], [156 + i * 40, 136 + Math.sin(T * 3 + i) * 4], [150 + i * 40, 122]], 'rgba(255,120,40,.5)', 2.5); }
    else dot(c, 96, 62, 24, '#fff2b0');
    // 땅 단면
    c.fillStyle = '#7f97ab'; c.fillRect(0, 262, 720, 118);
    const tdep = isOpen('thaw') ? 70 : 30; c.fillStyle = '#7a5a3a'; c.fillRect(0, 262, 720, tdep);
    for (let i = 0; i < 30; i++) oval(c, (i * 61) % 720, 262 + tdep + 12 + (i * 23) % 60, 14, 4, 0, 'rgba(235,248,255,.8)');
    if (isOpen('grave')) { c.strokeStyle = '#efe6d2'; c.lineWidth = 4; for (const [x, y] of [[300, 300], [322, 290], [344, 302], [360, 288]]) line(c, [[x, y], [x + 16, y - 6]], '#efe6d2', 4); dot(c, 290, 296, 8, '#efe6d2'); }
    if (isOpen('germ')) for (let i = 0; i < 9; i++) { const x = 400 + (i * 17) % 70, y = 286 + (i * 13) % 36 + (RM ? 0 : Math.sin(T * 2 + i) * 2); oval(c, x, y, 6, 3, i, '#c97ad9', '#7a3a8a', 1); }
    // 순록 떼와 천막
    for (let i = 0; i < 6; i++) reindeer(c, 470 + (i % 3) * 60, 238 + Math.floor(i / 3) * 18, 0.8, RM, T + i);
    c.fillStyle = '#d9c8a8'; c.beginPath(); c.moveTo(640, 240); c.lineTo(670, 190); c.lineTo(700, 240); c.fill(); c.strokeStyle = '#8a7a58'; c.stroke();
    if (isOpen('vax')) { rr(c, 500, 150, 150, 28, 6); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = BAD; c.lineWidth = 2; c.stroke(); txt(c, '예방접종 멈춤', 575, 169, {size: 13, color: BAD, align: 'center'}); }
    if (isOpen('harm')) { rr(c, 590, 70, 112, 40, 6); c.fillStyle = 'rgba(255,255,255,.95)'; c.fill(); c.strokeStyle = '#596978'; c.stroke(); txt(c, '순록 피해,', 646, 87, {size: 11, color: INK, align: 'center'}); txt(c, '사람도 치료', 646, 102, {size: 11, color: INK, align: 'center'}); }
    // 이름표
    for (const [k, n] of YM) { if (!isOpen(k) || k === 'vax' || k === 'harm') continue; const [x, y] = spots[k], fresh = !RM && performance.now() - lastAt < 900 && m.open[m.open.length - 1] === k; rr(c, x - 44, y + 18, 88, 20, 5); c.fillStyle = fresh ? '#fff6cf' : 'rgba(255,255,255,.92)'; c.fill(); c.strokeStyle = '#c9921f'; c.lineWidth = 1.2; c.stroke(); txt(c, n, x, y + 32, {size: 11, color: INK, align: 'center'}); }
    if (all()) {
      const cx = 360, cy = 120;
      for (const k of ['hot', 'thaw', 'grave', 'germ', 'vax']) { const [x, y] = spots[k]; c.setLineDash([6, 5]); line(c, [[x, y + 18], [cx, cy + 16]], 'rgba(184,69,46,.75)', 2); c.setLineDash([]); }
      rr(c, cx - 70, cy - 4, 140, 30, 8); c.fillStyle = '#fff1ec'; c.fill(); c.strokeStyle = BAD; c.lineWidth = 2; c.stroke(); txt(c, '탄저병이 퍼짐', cx, cy + 16, {size: 14, color: BAD, align: 'center'});
    }
    txt(c, '출처: Reindeer Anthrax in the Russian Arctic, 2016 (2021년 논문)', 712, 372, {size: 10, color: '#f4f6ee', align: 'right'});
  });
  render();
  status.textContent = all() ? '전시를 모두 보았어요.' : '역사 전시관이에요. 2016년 러시아 야말반도에서 순록 탄저병이 퍼졌어요. 전시 카드를 하나씩 켜서 그해 무엇이 함께 있었는지 살펴봐요.';
  if (all()) later(onReady);
  return {node, stop};
}

// ================================================================ 실험대 5: 마을 방송실
// 안내문은 네 칸에서 카드를 하나씩 고르고, 안내 방법은 두 가지까지 고른다. 주민 반응은 정해진 조건으로 계산하는 모형이다.
const BC_SLOTS = [
  ['fact', '확인한 것', [['path', '땅속 얼음이 녹아 북쪽 산책로가 40 cm 내려앉았어요.'], ['virus', '얼어 있던 땅에서 나온 바이러스가 마을에 퍼졌어요.'], ['none', '마을에는 아무 문제도 없어요.']]],
  ['unknown', '아직 모르는 것', [['study', '제보가 늘어난 까닭은 아직 조사하고 있어요.'], ['all', '곧 모두 감염될 거예요.'], ['hide', '모르는 것은 알리지 않아요.']]],
  ['todo', '지금 할 일', [['detour', '산책로 대신 돌아가는 길을 써 주세요. 몸이 아프면 보건소에 알려 주세요.'], ['leave', '지금 바로 마을을 떠나세요.'], ['usual', '평소처럼 산책로로 다니세요.']]],
  ['next', '다음 소식', [['news', '새 소식은 마을 방송과 게시판으로 알려 드려요.'], ['nomore', '더 알려 드릴 소식은 없어요.'], ['spread', '이 소식을 친구들에게 널리 퍼뜨려 주세요.']]],
];
const BC_CH = [['phone', '휴대전화 알림'], ['speaker', '마을 방송'], ['sign', '길목 표지판'], ['visit', '이웃 방문']];
const BC_WHO = [['haneul', '하늘 씨', ['phone', 'sign', 'speaker'], 150], ['granny', '할머니', ['speaker', 'visit'], 330], ['guest', '여행객', ['sign', 'visit'], 510]];
const GOOD_CARD = {fact: 'path', unknown: 'study', todo: 'detour', next: 'news'};
function bcResult(cards, ch, day) {
  const usable = ch.filter((x) => !(day === 'storm' && (x === 'phone' || x === 'sign')));
  const exag = cards.fact === 'virus' || cards.unknown === 'all' || cards.todo === 'leave' || cards.next === 'spread';
  const dismiss = cards.fact === 'none' || cards.todo === 'usual';
  const people = BC_WHO.map(([id, name, uses]) => {
    const reached = uses.some((u) => usable.includes(u));
    let mood = 'calm', words;
    if (!reached) { mood = 'miss'; words = id === 'haneul' ? '소식을 못 듣고 무너진 산책로로 가요' : '소식을 듣지 못했어요'; }
    else if (exag) { mood = 'panic'; words = id === 'granny' ? '겁이 나서 짐을 싸요' : '마을을 떠나야 하나 걱정해요'; }
    else if (dismiss) { mood = 'risk'; words = id === 'guest' ? '산책로로 걷다가 미끄러져요' : '산책로로 가다가 넘어질 뻔해요'; }
    else if (cards.unknown === 'hide') { mood = 'doubt'; words = '조사 중인지 몰라 소문을 믿어요'; }
    else if (cards.next !== 'news') { mood = 'doubt'; words = '다음 소식을 어디서 볼지 몰라요'; }
    else words = id === 'haneul' ? '돌아가는 길로 출근해요' : id === 'granny' ? '돌아가는 길로 보건소에 가요' : '돌아가는 길을 알았어요';
    return {id, name, reached, mood, words};
  });
  return {people, ok: people.every((p) => p.mood === 'calm'), usable};
}
export function broadcastLab({el, button, task = {}, memory = {}, save, onAction: fire, onReady}) {
  const onAction = act(task, fire), RM = reduceMotion();
  const m = memory.bc ??= {cards: {}, ch: [], day: 'normal', tries: [], ok: {}};
  const {canvas, status, tray, node, c} = device(el, '북쪽 마을 방송실 (주민 반응은 정해진 조건으로 계산한 모형)', '방송실에서 안내문을 보내면 마을 길을 따라 하늘 씨, 할머니, 여행객에게 닿는지 보여 주는 장면.');
  let result = null, sentAt = 0;
  const done = () => m.ok.normal && m.ok.storm;
  function render() {
    const rows = BC_SLOTS.map(([k, name, opts]) => seg(el, button, name, opts.map(([v, s]) => [v, s]), m.cards[k], (v) => { m.cards[k] = v; result = null; save?.(); render(); }));
    rows.push(seg(el, button, '안내 방법', BC_CH.map(([v, s]) => [v, s]), m.ch, (v) => {
      if (m.ch.includes(v)) m.ch = m.ch.filter((x) => x !== v);
      else if (m.ch.length >= 2) { status.textContent = '안내 방법은 두 가지까지 고를 수 있어요. 하나를 빼고 골라요.'; return; }
      else m.ch = [...m.ch, v];
      result = null; save?.(); render();
    }, (v) => m.day === 'storm' && (v === 'phone' || v === 'sign')));
    rows.push(seg(el, button, '마을 상황', [['normal', '보통 날'], ['storm', '폭우 뒤']], m.day, (v) => {
      m.day = v; result = null;
      if (v === 'storm') { m.ch = m.ch.filter((x) => x !== 'phone' && x !== 'sign'); status.textContent = '폭우가 지나갔어요. 휴대전화 통신이 끊기고 길목 표지판이 쓰러졌어요. 남은 방법으로 다시 보내 봐요.'; }
      else status.textContent = '보통 날이에요. 네 가지 안내 방법을 모두 쓸 수 있어요.';
      save?.(); render();
    }));
    rows.push(el('div', {class: 'bench-wire'}, el('b', {class: 'bench-wire-name'}, '보내기'), el('span', {class: 'bench-seg'}, button('마을에 보내기', send, 'mission-go'))));
    tray.replaceChildren(...rows);
  }
  function send() {
    const miss = BC_SLOTS.filter(([k]) => !m.cards[k]).map(([, n]) => n);
    if (miss.length) { status.textContent = `안내문 칸을 채워요. 아직 고르지 않은 칸: ${miss.join(', ')}`; return; }
    if (!m.ch.length) { status.textContent = '안내 방법을 하나 이상 골라요.'; return; }
    result = bcResult(m.cards, m.ch, m.day); sentAt = performance.now();
    m.tries.push({day: m.day, ch: [...m.ch], cards: {...m.cards}, ok: result.ok});
    if (m.tries.length > 30) m.tries.splice(0, m.tries.length - 30);
    if (result.ok) {
      m.ok[m.day] = true;
      (memory.voyage ??= {}).msg = BC_SLOTS.map(([k, , opts]) => opts.find(([v]) => v === m.cards[k])[1]);
      status.textContent = done() ? '보통 날에도, 폭우 뒤에도 세 사람 모두에게 근거 있는 안내가 닿았어요.' : m.day === 'normal' ? '보통 날에는 세 사람 모두에게 안내가 닿았어요. 이번에는 「폭우 뒤」로 바꾸어 같은 안내가 닿는지 시험해 봐요.' : '폭우 뒤에도 세 사람 모두에게 안내가 닿았어요. 「보통 날」에도 시험해 봐요.';
    } else {
      const miss2 = result.people.filter((p) => p.mood === 'miss').map((p) => p.name), upset = result.people.filter((p) => p.mood !== 'miss' && p.mood !== 'calm').map((p) => p.name);
      status.textContent = [miss2.length ? `${miss2.join(', ')}에게는 안내가 닿지 않았어요.` : '', upset.length ? `${upset.join(', ')}의 반응을 보고 안내문 카드를 다시 살펴봐요.` : ''].filter(Boolean).join(' ');
    }
    save?.(); render();
    if (done()) { onAction('delivered'); onReady?.(); }
  }
  const icon = (k, x, y, on = true) => {
    c.globalAlpha = on ? 1 : 0.3;
    if (k === 'phone') { rr(c, x - 6, y - 10, 12, 20, 3); c.fillStyle = '#3a4a5a'; c.fill(); c.fillStyle = '#9fd3ff'; c.fillRect(x - 4, y - 7, 8, 12); }
    if (k === 'speaker') { c.fillStyle = '#d98a3a'; c.beginPath(); c.moveTo(x - 8, y - 4); c.lineTo(x - 2, y - 4); c.lineTo(x + 6, y - 10); c.lineTo(x + 6, y + 10); c.lineTo(x - 2, y + 4); c.lineTo(x - 8, y + 4); c.fill(); }
    if (k === 'sign') { c.fillStyle = '#6a5a48'; c.fillRect(x - 1.5, y - 2, 3, 12); rr(c, x - 9, y - 11, 18, 10, 2); c.fillStyle = '#fff6cf'; c.fill(); }
    if (k === 'visit') { dot(c, x - 4, y - 5, 4, '#f2c9a0'); rr(c, x - 8, y - 1, 8, 10, 3); c.fillStyle = '#4aa58f'; c.fill(); dot(c, x + 5, y - 5, 4, '#f2c9a0'); rr(c, x + 1, y - 1, 8, 10, 3); c.fillStyle = '#7a6ad0'; c.fill(); }
    c.globalAlpha = 1;
  };
  const stop = loop(c, (T) => {
    const storm = m.day === 'storm';
    const sky = c.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, storm ? '#7d8c9c' : '#a9d0ea'); sky.addColorStop(1, storm ? '#b9c4ce' : '#eaf5fb'); c.fillStyle = sky; c.fillRect(0, 0, 720, 380);
    c.fillStyle = storm ? '#dfe7ec' : '#f2f8fb'; c.fillRect(0, 200, 720, 180);
    if (storm && !RM) for (let i = 0; i < 60; i++) { const x = (i * 37 + T * 240) % 720, y = (i * 53 + T * 420) % 380; line(c, [[x, y], [x - 4, y + 12]], 'rgba(90,120,150,.5)', 1.5); }
    // 방송실과 안내문 종이
    c.save(); c.scale(0.62, 0.62); radioStation(c, 120, 520, RM ? 0 : T, !!result); c.restore();
    rr(c, 14, 14, 200, 120, 8); c.fillStyle = 'rgba(255,255,255,.95)'; c.fill(); c.strokeStyle = '#c9921f'; c.lineWidth = 1.5; c.stroke();
    txt(c, '우리 안내문', 26, 34, {size: 12, color: '#8a5a12'});
    let yy = 52;
    for (const [k, name, opts] of BC_SLOTS) { const pick = opts.find(([v]) => v === m.cards[k]); yy = wrap(c, pick ? pick[1] : `${name}: 아직 고르지 않음`, 26, yy, 178, 14, {size: 10, color: pick ? INK : '#9aa6b5'}) + 16; if (yy > 128) break; }
    // 길과 안내 방법
    line(c, [[150, 300], [690, 300]], '#d8c4a4', 18);
    if (storm) { c.save(); c.translate(400, 312); c.rotate(1.3); c.scale(1.6, 1.6); icon('sign', 0, 0); c.restore(); }
    for (const [id, name, uses, x] of BC_WHO) {
      const px = x + 120, py = 300;
      person(c, id, px, py + 8, {t: RM ? 0 : T});
      rr(c, px - 14 - uses.length * 14, py - 116, uses.length * 28 + 28, 36, 8); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill(); c.strokeStyle = '#a9bed0'; c.lineWidth = 1; c.stroke();
      uses.forEach((u, i) => { c.save(); c.translate(px - uses.length * 14 + 14 + i * 28, py - 98); c.scale(1.5, 1.5); icon(u, 0, 0, !(storm && (u === 'phone' || u === 'sign'))); c.restore(); });
      txt(c, name, px, py + 28, {size: 12, color: INK, align: 'center'});
      const r = result?.people.find((p) => p.id === id);
      if (r) {
        const age = (performance.now() - sentAt) / 1000;
        if (r.reached && !RM && age < 1.2) { const k2 = age / 1.2; dot(c, 150 + (px - 150) * k2, 240 - Math.sin(k2 * Math.PI) * 60, 6, '#ffd54a', '#c9921f', 1.5); }
        else say(c, r.words, px, py - 124, r.mood === 'calm' ? 'good' : 'bad', 716);
      }
    }
    rr(c, 10, 340, 500, 32, 8); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill();
    BC_CH.forEach(([k, n], i) => { const x = 28 + i * 122, off = storm && (k === 'phone' || k === 'sign'); c.save(); c.translate(x, 356); c.scale(1.2, 1.2); icon(k, 0, 0, !off); c.restore(); txt(c, n, x + 16, 361, {size: 11, color: off ? '#9aa6b5' : INK}); });
    txt(c, storm ? '폭우 뒤: 마을 방송과 이웃 방문만 쓸 수 있어요' : '보통 날: 네 가지 방법을 모두 쓸 수 있어요', 706, 78, {size: 11, color: storm ? BAD : SOFT, align: 'right'});
    const okN = m.ok.normal, okS = m.ok.storm;
    rr(c, 516, 14, 190, 46, 8); c.fillStyle = 'rgba(255,255,255,.9)'; c.fill();
    txt(c, `보통 날 시험: ${okN ? '세 사람 모두 닿음' : '아직'}`, 528, 33, {size: 11, color: okN ? GOOD : SOFT});
    txt(c, `폭우 뒤 시험: ${okS ? '세 사람 모두 닿음' : '아직'}`, 528, 51, {size: 11, color: okS ? GOOD : SOFT});
  });
  render();
  status.textContent = done() ? '두 상황 모두 시험을 마쳤어요. 카드나 방법을 바꾸어 다시 시험해 봐도 괜찮아요.' : '마을 방송실이에요. 안내문 네 칸에 카드를 하나씩 고르고, 안내 방법을 두 가지까지 골라 마을에 보내 봐요. 사람 머리 위 그림은 그 사람이 소식을 듣는 방법이에요.';
  if (done()) later(onReady);
  return {node, stop};
}

export const TUNDRA_COMPONENTS = {permafrost, amoeba: amoebaLab, reports: reportBoard, yamal: yamalMuseum, broadcast: broadcastLab};
export {portal as paintTundraPortal};
// 의뢰 표지 그림(public/assets/missions/r5-g10-2050.jpg)을 다시 만들 때 쓰는 함수. 학생 화면에서는 부르지 않는다.
export function paintTundraBanner(c, w, h) {
  const k = w / 1400;
  c.save(); c.scale(k, k); c.translate(0, -Math.max(0, Math.min(900 - h / k, 40)));
  drawVillage(c, {done: {}, v: {}}, {t: 0, RM: true, V: {}}, false);
  c.restore();
}
