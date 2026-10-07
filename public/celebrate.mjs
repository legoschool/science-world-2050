// 의뢰를 마치면 장면 위로 색종이를 짧게 뿌린다. 동작 줄이기 설정을 켠 기기에서는 뿌리지 않는다.
export function celebrate(host) {
  if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const colors = ['#f2c14e', '#e2503f', '#2f6fd6', '#3aa04b', '#b28cf0', '#ffffff'];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i');
    s.style.left = (Math.random() * 100).toFixed(1) + '%';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = (Math.random() * 0.7).toFixed(2) + 's';
    s.style.animationDuration = (1.6 + Math.random() * 1.2).toFixed(2) + 's';
    s.style.setProperty('--dx', Math.round(Math.random() * 90 - 45) + 'px');
    box.append(s);
  }
  host.append(box);
  setTimeout(() => box.remove(), 3800);
}
