// 그림 캐릭터 시트 불러오기. tools/process_sprites.py가 만든 파일은
// 64×80 칸이 4×4로 놓여 있다(행: 아래·왼쪽·오른쪽·위, 열: 걷기 네 장면, 발끝은 칸 아래에서 4픽셀 위).
export const SHEET_META = {fw: 64, fh: 80, ax: 32, ay: 76, cols: 4};
const cache = new Map();

export function loadSheet(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        c.meta = SHEET_META;
        resolve(c);
      };
      img.onerror = () => reject(new Error('캐릭터 그림을 불러오지 못했습니다: ' + url));
      img.src = url;
    }));
  }
  return cache.get(url);
}

// 걷는 중이면 네 장면을 돌고, 서 있으면 두 발을 모은 장면(두 번째 열)을 쓴다.
export function sheetFrame(meta, frame, moving) {
  return {col: moving ? frame.col % meta.cols : 1, row: frame.row};
}
