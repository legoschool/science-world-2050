// 학생 화면(app.mjs)과 관리 화면(admin.mjs)이 가장 먼저 불러오는 호환 보완.
// 학교망 실행(http://192.168...)처럼 보안 연결이 아닌 주소에서는 crypto.randomUUID가 없어 기록 번호를 만들 수 없다.
// 그때만 getRandomValues로 같은 모양(버전 4)의 값을 만든다.
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
