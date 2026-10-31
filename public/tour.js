// 미리 둘러보기: 그림을 누르면 크게 보는 창을 연다(Esc, 바깥 누르기, 닫기 단추로 닫힘)
const lb = document.getElementById('lb'), img = document.getElementById('lbImg'), cap = document.getElementById('lbCap');
document.querySelectorAll('.shot').forEach((b) => {
  b.addEventListener('click', () => {
    const small = b.querySelector('img'), fc = b.closest('figure')?.querySelector('figcaption');
    img.src = b.dataset.full; img.alt = small.alt;
    cap.textContent = fc ? fc.innerText.replace(/\s*\n\s*/g, ' ') : '';
    lb.showModal();
  });
});
document.getElementById('lbClose').addEventListener('click', () => lb.close());
lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
lb.addEventListener('close', () => { img.removeAttribute('src'); });
