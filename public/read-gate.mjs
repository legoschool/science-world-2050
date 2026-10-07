// 대사를 읽을 시간을 지킨다. 줄이 다 보인 뒤 READ_MS 동안은 넘기는 단추가 눌리지 않고, 단추 안에 남은 초(2, 1)가 보이며 아래 막대가 차오른다.
// 잠금이 풀리면 첫 단추에 초점을 돌려주어 Enter나 스페이스로 바로 넘길 수 있다.
export const READ_MS = 2000;

export function holdButtons(buttons, ms = READ_MS) {
  const list = [...buttons].filter((b) => b && !b.disabled);
  let timer = 0, tick = 0, until = 0;
  // 남은 초를 단추 안에 보인다. 읽기 프로그램이 단추 이름으로 읽지 않게 aria-hidden
  function paintCount() {
    const left = Math.max(0, Math.ceil((until - performance.now()) / 1000));
    for (const b of list) {
      let c = b.querySelector(':scope > .read-count');
      if (!left) { c?.remove(); continue; }
      if (!c) { c = document.createElement('span'); c.className = 'read-count'; c.setAttribute('aria-hidden', 'true'); b.append(c); }
      c.textContent = String(left);
    }
  }
  function lock(wait) {
    clearTimeout(timer); clearInterval(tick);
    until = performance.now() + wait; paintCount(); tick = setInterval(paintCount, 100);
    for (const b of list) {
      b.disabled = true;
      b.classList.remove('read-hold');
      void b.offsetWidth; // 막대 애니메이션을 처음부터 다시 그린다
      b.style.setProperty('--read-ms', wait + 'ms');
      b.classList.add('read-hold');
    }
    timer = setTimeout(release, wait);
  }
  function release() {
    clearTimeout(timer); timer = 0; clearInterval(tick); until = 0; paintCount();
    for (const b of list) { b.disabled = false; b.classList.remove('read-hold'); }
    const first = list.find((b) => b.isConnected);
    const free = !document.activeElement || document.activeElement === document.body;
    if (first && free) first.focus({preventScroll: true});
  }
  if (list.length && ms > 0) lock(ms);
  // restart: 글자가 다 나오기 전에 화면을 눌러 줄을 다 보였을 때, 그때부터 다시 READ_MS를 센다
  return {release, restart: (wait = READ_MS) => { if (timer) lock(wait); }};
}

// 글자가 한 자씩 나오는 데 걸리는 시간(두 자씩 22 ms마다)
export const typingMs = (text, reduce) => (reduce ? 0 : Math.ceil(String(text || '').length / 2) * 22);
