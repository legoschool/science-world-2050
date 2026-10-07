// 척척 지구 단말: 지구 지도 가운데에 서 있는 고장 난 척척의 단말기.
// 상태에 따라 화면이 바뀐다. 잠김(회색, 점 세 개), 대결 가능(빨간 화면, 오류 막대, 머리 위 「!」), 복구(초록 화면, 웃는 얼굴).
// 오류 막대는 남은 틀린 말의 수만큼 칸이 켜진다. 동작 줄이기 설정이면 깜빡임을 멈춘다.
export const DUEL_OF = {farm: 'R1', fire: 'R2', power: 'R3', future: 'R4', life: 'R5'};
const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function drawChuck(c, x, y, st, now) {
  const t = reduce ? 0 : now / 1000, ready = !!st?.ready && !st?.done, done = !!st?.done;
  const flick = ready && Math.floor(t * 6) % 7 === 0;
  c.save(); c.translate(x, y); c.scale(1.4, 1.4);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#1b1f27'; c.lineWidth = 2;
  c.fillStyle = '#3d4450'; c.fillRect(-14, -6, 28, 6); c.strokeRect(-14, -6, 28, 6);
  c.fillStyle = '#6b7482'; c.fillRect(-4, -30, 8, 24); c.strokeRect(-4, -30, 8, 24);
  // 머리(화면 상자)
  c.fillStyle = '#c9ced6'; c.beginPath(); c.roundRect ? c.roundRect(-24, -74, 48, 44, 8) : c.rect(-24, -74, 48, 44); c.fill(); c.stroke();
  c.fillStyle = done ? '#2fae74' : ready ? (flick ? '#7a2a20' : '#d9493a') : '#7d8696';
  c.fillRect(-18, -68, 36, 30); c.strokeRect(-18, -68, 36, 30);
  c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 2;
  if (done) {
    for (const ex of [-8, 8]) { c.beginPath(); c.moveTo(ex - 4, -55); c.lineTo(ex, -59); c.lineTo(ex + 4, -55); c.stroke(); }
    c.beginPath(); c.arc(0, -50, 6, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  } else if (ready) {
    for (const ex of [-8, 8]) { c.beginPath(); c.moveTo(ex - 3, -60); c.lineTo(ex + 3, -54); c.moveTo(ex + 3, -60); c.lineTo(ex - 3, -54); c.stroke(); }
    c.beginPath(); c.moveTo(-7, -46); c.lineTo(-3, -48); c.lineTo(1, -45); c.lineTo(6, -47); c.stroke();
    if (!reduce) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-18, -68 + ((t * 40) % 30), 36, 2); }
  } else {
    const k = Math.floor(t * 2) % 4;
    for (let i = 0; i < 3; i++) { c.globalAlpha = i < k ? 1 : 0.35; c.fillRect(-9 + i * 7, -54, 4, 4); }
    c.globalAlpha = 1;
  }
  // 안테나
  c.strokeStyle = '#1b1f27'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -74); c.lineTo(0, -84); c.stroke();
  c.fillStyle = done ? '#7dffb5' : ready ? (Math.floor(t * 2) % 2 ? '#ff6b5b' : '#ffd0c9') : '#aab2c0';
  c.beginPath(); c.arc(0, -86, 3.5, 0, Math.PI * 2); c.fill(); c.stroke();
  // 오류 막대: 남은 틀린 말 수만큼 칸이 켜진다
  if (ready && st.total) {
    const left = st.total - (st.fixed?.length || 0), w = 6, gap = 2, all = st.total * (w + gap) - gap;
    for (let i = 0; i < st.total; i++) {
      c.fillStyle = i < left ? '#ff5a4a' : '#3a404c'; c.strokeStyle = '#1b1f27'; c.lineWidth = 1;
      c.fillRect(-all / 2 + i * (w + gap), -100, w, 6); c.strokeRect(-all / 2 + i * (w + gap), -100, w, 6);
    }
    const bob = reduce ? 0 : Math.sin(t * 4) * 2;
    c.fillStyle = '#ffd93b'; c.strokeStyle = '#1b1f27'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, -116 + bob, 8, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#1b1f27'; c.fillRect(-1.5, -121 + bob, 3, 6); c.fillRect(-1.5, -113 + bob, 3, 2.5);
  }
  c.restore();
}
