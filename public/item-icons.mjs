// 인벤토리 칸에 들어가는 소품 그림(16×16 도트를 키워서 그린다).
const cache = new Map();
const O = '#2a2230';

function px(c, list, color) { c.fillStyle = color; for (const [x, y, w = 1, h = 1] of list) c.fillRect(x, y, w, h); }

const DRAW = {
  'safety-card'(c) { px(c, [[2, 3, 12, 10]], O); px(c, [[3, 4, 10, 8]], '#fff7e0'); px(c, [[3, 4, 10, 2]], '#e0503c'); px(c, [[5, 8, 6, 1], [5, 10, 4, 1]], '#7a6a58'); px(c, [[10, 8, 2, 2]], '#3aa04b'); },
  magnifier(c) { px(c, [[3, 2, 7, 7]], O); px(c, [[4, 3, 5, 5]], '#bfe6ff'); px(c, [[4, 3, 2, 2]], '#ffffff'); px(c, [[9, 9, 2, 2], [10, 10, 2, 2], [11, 11, 3, 3]], '#8a5a2b'); px(c, [[12, 12, 2, 2]], '#6b4220'); },
  map(c) { px(c, [[1, 3, 14, 10]], O); px(c, [[2, 4, 12, 8]], '#f3e3b5'); px(c, [[2, 4, 4, 8]], '#e8d49a'); px(c, [[10, 4, 4, 8]], '#e8d49a'); px(c, [[4, 6, 1, 1], [5, 7, 2, 1], [7, 8, 2, 1], [9, 9, 1, 1]], '#c0392b'); px(c, [[11, 6, 2, 2]], '#3a7bd5'); },
  'battery-pair'(c) { for (const x of [2, 9]) { px(c, [[x, 3, 5, 11]], O); px(c, [[x + 1, 4, 3, 9]], '#3a3f4b'); px(c, [[x + 1, 4, 3, 3]], '#e0b341'); px(c, [[x + 2, 2, 1, 1]], '#c0c4cc'); px(c, [[x + 1, 9, 1, 3]], '#6d7584'); } },
  bulb(c) { px(c, [[4, 1, 8, 9], [5, 10, 6, 1]], O); px(c, [[5, 2, 6, 7]], '#fff3b0'); px(c, [[5, 2, 2, 3]], '#ffffff'); px(c, [[7, 5, 2, 3]], '#e0a030'); px(c, [[5, 11, 6, 3]], '#9aa1ad'); px(c, [[5, 12, 6, 1]], '#6d7584'); px(c, [[7, 14, 2, 1]], '#3a3f4b'); },
  wire(c) { px(c, [[3, 4, 10, 8]], O); px(c, [[4, 5, 8, 6]], '#d8483a'); px(c, [[5, 6, 6, 4]], '#b0342a'); px(c, [[6, 7, 4, 2]], '#d8483a'); px(c, [[12, 3, 3, 1], [1, 12, 3, 1]], '#d98c3a'); px(c, [[14, 2, 1, 1], [0, 13, 1, 1]], '#f0c070'); },
  switch(c) { px(c, [[1, 8, 14, 6]], O); px(c, [[2, 9, 12, 4]], '#7d5a3a'); px(c, [[3, 7, 2, 2], [11, 7, 2, 2]], '#c0c4cc'); px(c, [[4, 4, 1, 1], [5, 5, 1, 1], [6, 6, 1, 1], [7, 7, 1, 1]], '#3a3f4b'); px(c, [[3, 3, 2, 2]], '#e0503c'); },
  'sign-badge'(c) { px(c, [[6, 1, 4, 5]], '#3a7bd5'); px(c, [[3, 5, 10, 10]], O); px(c, [[4, 6, 8, 8]], '#f0c040'); px(c, [[7, 7, 2, 6], [5, 9, 6, 2]], '#fff4b0'); px(c, [[4, 6, 2, 2]], '#fffbe0'); },
  'motor-part'(c) { px(c, [[3, 5, 9, 8]], O); px(c, [[4, 6, 7, 6]], '#8a93a3'); px(c, [[4, 6, 7, 2]], '#b6bdc9'); px(c, [[12, 8, 3, 2]], '#c0c4cc'); px(c, [[14, 4, 1, 10]], '#e0503c'); px(c, [[5, 13, 1, 2], [9, 13, 1, 2]], '#d8483a'); },
  'magnet-core'(c) { px(c, [[6, 1, 4, 14]], O); px(c, [[7, 1, 2, 14]], '#9aa1ad'); for (let y = 4; y < 12; y += 2) px(c, [[4, y, 8, 1]], '#c9772b'); px(c, [[3, 12, 2, 1], [11, 3, 2, 1]], '#c9772b'); },
  'sun-card'(c) { px(c, [[2, 2, 11, 12]], O); px(c, [[3, 3, 9, 10]], '#fff7e0'); px(c, [[5, 5, 5, 5]], '#f5b82e'); px(c, [[6, 4, 3, 1], [6, 10, 3, 1], [4, 6, 1, 3], [10, 6, 1, 3]], '#f08a24'); px(c, [[12, 9, 2, 2], [13, 11, 1, 3]], '#e8d9b8'); },
  candle(c) { px(c, [[5, 6, 6, 9]], O); px(c, [[6, 7, 4, 7]], '#f4ede0'); px(c, [[6, 7, 1, 7]], '#ffffff'); px(c, [[7, 4, 2, 3]], '#3a3f4b'); px(c, [[4, 13, 8, 2]], '#b98a4a'); px(c, [[6, 8, 1, 2]], '#e2d6c0'); },
  'news-clip'(c) { px(c, [[1, 2, 13, 12]], O); px(c, [[2, 3, 11, 10]], '#eeeae0'); px(c, [[3, 4, 9, 2]], '#3a3f4b'); px(c, [[3, 7, 4, 4]], '#9fb3cc'); px(c, [[8, 7, 4, 1], [8, 9, 4, 1], [8, 11, 3, 1], [3, 12, 6, 1]], '#8a8a8a'); px(c, [[12, 12, 2, 2]], '#d8cfb8'); },
  notebook(c) { px(c, [[3, 1, 11, 14]], O); px(c, [[4, 2, 9, 12]], '#3f7d5a'); px(c, [[4, 2, 2, 12]], '#2e5e43'); px(c, [[7, 5, 5, 3]], '#f3e3b5'); },
  record(c) { px(c, [[3, 1, 10, 14]], O); px(c, [[4, 2, 8, 12]], '#fdf6e3'); px(c, [[5, 4, 6, 1], [5, 6, 6, 1], [5, 8, 4, 1]], '#9a8a72'); px(c, [[9, 10, 3, 3]], '#e0503c'); },
};

export function itemIcon(id, size = 40) {
  const key = id + '@' + size;
  if (cache.has(key)) return cache.get(key).cloneNode ? copy(cache.get(key)) : cache.get(key);
  const base = document.createElement('canvas'); base.width = base.height = 16;
  const bx = base.getContext('2d');
  (DRAW[id] || DRAW.record)(bx);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(base, 0, 0, size, size);
  cache.set(key, c);
  return copy(c);
}
function copy(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); c.className = 'item-icon'; c.setAttribute('aria-hidden', 'true'); return c; }
