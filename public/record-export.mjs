export const reviewStatus = (e) => e.teacherReview ? ({pending:'확인 대기',revise:'보완 요청',confirmed:'교사 확인',insufficient:'판단 자료 부족'})[e.teacherReview.status] : e.payload.evaluation === 'version_unavailable' ? '과제 원본 확인 필요' : e.payload.review === 'teacher_pending' || e.payload.explanationReview === 'teacher_pending' ? '교사 확인 대기' : e.payload.correct === true ? '충족 후보' : e.payload.correct === false ? '다시 확인' : '과정 기록';
export function recordsCSV(events, student, {name = e => e.payload.taskTitle || e.task, answer = e => e.payload.responseText || e.payload.answer || ''} = {}) {
  const json = v => v == null ? '' : JSON.stringify(v);
  const cell = v => '"' + String(v ?? '').replace(/^[\s]*[=+@-]/, "'$&").replaceAll('"', '""') + '"';
  // 설명 쓰기(writeup.submitted): 응답 방식, 몇 번째 제출인지, 학생이 적은 고친 점, 꼭 넣을 말 자동 확인(낱말 포함만), 받은 도움, 문항 판
  const terms = p => (p.terms || []).map(t => `${t.word} ${t.used ? '있음' : '없음'}`).join(', ');
  const mode = p => ({written:'글', oral_teacher:'선생님께 말로 설명'})[p.mode] || '';
  const rows = [['학년','반','번호','닉네임','학생 ID','회차','수신 시각','의뢰','과제','유형','응답 설명','응답 원문','세부 응답','설명','관찰표','근거','조립 상태','선택 표시','힌트','학습 요소','성취기준','판정','실제 수행','교사 피드백','관찰 점수','과제 버전','과제 원본','자료 제목','응답 방식','제출 차례','고친 점','꼭 넣을 말 확인','받은 도움','설명 문항 판','교사 확인 저장 횟수','전체 기록'], ...events.map(e => {
    const p = e.payload, r = e.teacherReview;
    return [student.grade,student.room,student.number,student.nickname,e.owner,p.runId,new Date(e.received*1000).toISOString(),p.missionTitle || p.gameId,p.taskTitle || name(e),e.kind,answer(e),p.answer,json(p.roles),p.reason,json(p.rows),json(p.evidence),json(p.assembly),json(p.marked),p.hint,json(p.elementIds),json(p.standardCodes),reviewStatus(e),r ? ({unverified:'확인 전',observed:'교사가 관찰함',not_applicable:'해당 없음'})[r.actual] : '확인 전',r?.feedback,json(r?.rubric),p.gameVersion,p.contentRevision,p.resourceTitle,mode(p),p.version,p.change,terms(p),(p.help || []).map(h => ({concept:'정리한 내용 다시 보기'})[h] || h).join(', '),p.itemRevision,r?.revision,json(p)];
  })];
  return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
