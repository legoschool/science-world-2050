// 배경음과 효과음. 소리 파일 없이 Web Audio로 그 자리에서 만든다(직접 지은 짧은 곡과 신호음).
// 브라우저는 사용자가 한 번 누르기 전에는 소리를 막으므로, 첫 클릭이나 키 입력 때 소리를 깨운다.
// 설정(켜기, 크기)은 이 기기의 브라우저에 저장한다.
const KEY = 'science-world:sound';
const DEFAULTS = {music: false, sfx: true, musicVol: 0.3, sfxVol: 0.6}; // 교실 소음을 줄이려고 배경음은 처음에 꺼 둔다
let settings = load();
let ctx = null, master = null, musicBus = null, sfxBus = null;
let theme = null, wanted = null, timer = 0, step = 0, nextAt = 0;

function load() {
  try { return {...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}')}; } catch { return {...DEFAULTS}; }
}
function store() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* 저장이 막힌 브라우저 */ } }

export const soundSettings = () => ({...settings});
export function setSound(patch) {
  settings = {...settings, ...patch};
  store();
  if (ctx) { musicBus.gain.setTargetAtTime(settings.music ? settings.musicVol : 0, ctx.currentTime, 0.05); sfxBus.gain.setTargetAtTime(settings.sfx ? settings.sfxVol : 0, ctx.currentTime, 0.05); }
  if (settings.music && wanted && !theme) music(wanted); else if (!settings.music) stopLoop();
}

function wake() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 5200;
    musicBus = ctx.createGain(); musicBus.gain.value = settings.music ? settings.musicVol : 0;
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx ? settings.sfxVol : 0;
    musicBus.connect(soft); sfxBus.connect(soft); soft.connect(master); master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().then(() => { if (wanted && settings.music && !theme) music(wanted); }).catch(() => {});
  return true;
}
// 첫 누르기에서 소리를 깨우고, 기다리던 배경음이 있으면 시작한다
function firstGesture() { if (wake() && wanted && settings.music && !theme) music(wanted); }
for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, firstGesture, {capture: true, passive: true});

const hz = (semi) => 440 * Math.pow(2, (semi - 9) / 12); // 0 = C4 기준 반음 수
function tone(bus, {f, f2, at = 0, dur = 0.12, type = 'sine', vol = 0.4, attack = 0.005, release}) {
  if (!ctx) return;
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain(), end = t + dur, rel = release ?? Math.min(0.08, dur / 2);
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, end);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, Math.max(t + attack, end - rel)); g.gain.exponentialRampToValueAtTime(0.0001, end);
  o.connect(g); g.connect(bus); o.start(t); o.stop(end + 0.02);
}

// ---------------------------------------------------------------- 효과음
const SFX = {
  click: () => tone(sfxBus, {f: 880, f2: 660, dur: 0.04, type: 'triangle', vol: 0.18}),
  blip: () => tone(sfxBus, {f: 620, dur: 0.035, type: 'square', vol: 0.05}),
  open: () => { tone(sfxBus, {f: 392, f2: 523, dur: 0.09, type: 'sine', vol: 0.25}); },
  ok: () => { tone(sfxBus, {f: hz(24), dur: 0.1, type: 'triangle', vol: 0.35}); tone(sfxBus, {f: hz(31), at: 0.09, dur: 0.18, type: 'triangle', vol: 0.35}); },
  wrong: () => { tone(sfxBus, {f: 300, f2: 210, dur: 0.22, type: 'triangle', vol: 0.3}); },
  hint: () => [0, 4, 7].forEach((s, i) => tone(sfxBus, {f: hz(28 + s), at: i * 0.06, dur: 0.12, type: 'sine', vol: 0.22})),
  item: () => [0, 4, 7, 12].forEach((s, i) => tone(sfxBus, {f: hz(24 + s), at: i * 0.07, dur: 0.16, type: 'square', vol: 0.12})),
  level: () => { [0, 4, 7].forEach((s, i) => tone(sfxBus, {f: hz(19 + s), at: i * 0.09, dur: 0.14, type: 'square', vol: 0.12})); tone(sfxBus, {f: hz(31), at: 0.3, dur: 0.45, type: 'triangle', vol: 0.3}); },
  quest: () => {
    [[0, 0], [4, 0.12], [7, 0.24], [12, 0.36]].forEach(([s, at]) => tone(sfxBus, {f: hz(19 + s), at, dur: 0.14, type: 'square', vol: 0.12}));
    [0, 4, 7, 12].forEach((s) => tone(sfxBus, {f: hz(24 + s), at: 0.52, dur: 0.9, type: 'triangle', vol: 0.16, release: 0.5}));
  },
  step: () => tone(sfxBus, {f: 140, f2: 90, dur: 0.05, type: 'triangle', vol: 0.06}),
};
export function sfx(name) { if (!settings.sfx || !wake()) return; SFX[name]?.(); }

// ---------------------------------------------------------------- 배경음
// 지역마다 짧은 곡을 되풀이한다. 숫자는 C4에서 몇 반음 위인지, null은 쉼. 한 칸은 8분음표.
const THEMES = {
  hub: {bpm: 100, lead: 'triangle', bass: 'triangle',
    melody: [12, null, 16, 19, 21, null, 19, 16, 14, null, 16, 14, 12, null, 7, null, 12, null, 16, 19, 24, null, 21, 19, 17, 16, 14, 16, 12, null, null, null],
    low: [0, 0, 7, 7, -3, -3, 4, 4, 5, 5, 0, 0, -5, -5, 7, 7]},
  farm: {bpm: 88, lead: 'sine', bass: 'triangle',
    melody: [19, null, 21, 23, 26, null, 23, null, 21, 19, 21, null, 16, null, null, null, 19, null, 21, 23, 24, 23, 21, 19, 18, null, 21, null, 19, null, null, null],
    low: [7, 7, 0, 0, 2, 2, 7, 7, 7, 7, 0, 0, 2, 2, 7, 7]},
  fire: {bpm: 118, lead: 'square', bass: 'triangle',
    melody: [14, 17, 21, 17, 14, 17, 22, 21, 19, 17, 16, 17, 14, null, 9, null, 14, 17, 21, 24, 22, 21, 19, 17, 16, 19, 17, 16, 14, null, null, null],
    low: [2, 2, 2, 2, -2, -2, 0, 0, 2, 2, 5, 5, 0, 0, -3, -3]},
  power: {bpm: 112, lead: 'square', bass: 'square',
    melody: [9, 12, 16, 21, 16, 12, 9, 12, 8, 12, 16, 20, 16, 12, 8, 12, 5, 9, 12, 17, 12, 9, 5, 9, 7, 11, 14, 19, 14, 11, 7, 11],
    low: [-3, -3, -3, -3, -4, -4, -4, -4, -7, -7, -7, -7, -5, -5, -5, -5]},
  future: {bpm: 80, lead: 'sine', bass: 'sine',
    melody: [16, null, 23, null, 21, null, 18, null, 19, null, 16, null, 14, null, null, null, 16, null, 23, null, 26, null, 25, null, 23, null, 21, null, 18, null, null, null],
    low: [4, 4, 4, 4, 0, 0, 0, 0, 2, 2, 2, 2, -1, -1, -1, -1]},
  life: {bpm: 96, lead: 'triangle', bass: 'sine',
    melody: [17, null, 21, 24, 22, null, 21, null, 19, 17, 19, null, 14, null, null, null, 17, null, 21, 24, 26, 24, 22, 21, 19, null, 22, null, 21, null, null, null],
    low: [5, 5, 5, 5, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 5, 5]},
  mission: {bpm: 84, lead: 'sine', bass: 'triangle',
    melody: [12, null, null, 16, null, null, 19, null, 17, null, null, 14, null, null, 12, null, 9, null, null, 12, null, null, 16, null, 14, null, null, 11, null, null, 7, null],
    low: [0, 0, 0, 0, -3, -3, -3, -3, -7, -7, -7, -7, -5, -5, -5, -5]},
};
export function music(name) {
  wanted = THEMES[name] ? name : null;
  if (!wanted) { stopLoop(); return; }
  if (theme === wanted) return;
  if (!settings.music || !ctx || ctx.state !== 'running') { theme = null; clearInterval(timer); timer = 0; return; }
  theme = wanted; step = 0; nextAt = ctx.currentTime + 0.1;
  clearInterval(timer); timer = setInterval(schedule, 90); schedule();
}
function stopLoop() { clearInterval(timer); timer = 0; theme = null; }
function schedule() {
  if (!ctx || !theme) return;
  const th = THEMES[theme], beat = 60 / th.bpm / 2;
  if (nextAt < ctx.currentTime - 0.2) nextAt = ctx.currentTime + 0.05; // 탭을 다시 열었을 때 밀린 음을 한꺼번에 내지 않는다
  while (nextAt < ctx.currentTime + 0.3) {
    const at = nextAt - ctx.currentTime, n = th.melody[step % th.melody.length];
    if (n != null) tone(musicBus, {f: hz(n), at, dur: beat * 0.9, type: th.lead, vol: th.lead === 'square' ? 0.07 : 0.16, attack: 0.02, release: beat * 0.4});
    if (step % 2 === 0) { const b = th.low[(step / 2) % th.low.length]; tone(musicBus, {f: hz(b - 12), at, dur: beat * 1.8, type: th.bass, vol: th.bass === 'square' ? 0.05 : 0.14, attack: 0.02, release: beat * 0.6}); }
    nextAt += beat; step++;
  }
}
// 탭을 숨기면 배경음을 멈추고, 다시 보이면 이어서 튼다
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
});
