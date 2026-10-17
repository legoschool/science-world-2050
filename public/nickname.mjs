// 닉네임은 계정에 저장하며 현재 의뢰와 입력 중인 응답은 그대로 둔다.
export function editNickname({el, button, nickname, api, onSaved}) {
  const existing = document.querySelector('.nickname-dialog');
  if (existing) { existing.querySelector('input')?.focus(); return; }
  const previous = document.activeElement;
  const input = el('input', {id:'nickname-new', value:nickname || '', maxlength:20, autocomplete:'off', required:'', 'aria-describedby':'nickname-help'});
  const status = el('p', {role:'status', 'aria-live':'polite', class:'nickname-status'});
  const cancel = button('취소', () => dialog.close(), 'secondary');
  const submit = el('button', {type:'submit'}, '닉네임 저장');
  let busy = false;
  const form = el('form', {}, el('h2', {}, '닉네임 바꾸기'),
    el('p', {id:'nickname-help'}, '친구들에게 보일 이름을 1~20자로 적어 주세요. 탐험 기록과 접근 코드는 그대로예요.'),
    el('label', {for:'nickname-new'}, '새 닉네임'), input, status, el('div', {class:'actions'}, submit, cancel));
  const dialog = el('dialog', {class:'nickname-dialog', 'aria-label':'닉네임 바꾸기'}, form);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const value = input.value.trim();
    if (!value || value.length > 20 || /[\u0000-\u001f\u007f]/.test(value)) { status.textContent = '닉네임을 1~20자로 적어 주세요.'; input.focus(); return; }
    busy = true; submit.disabled = true; cancel.disabled = true; input.disabled = true;
    status.textContent = '닉네임을 저장하고 있어요.';
    try {
      const result = await api('nickname', {nickname:value});
      onSaved(result); dialog.close();
    } catch (error) {
      status.textContent = error.status === 401 ? '다시 접속한 뒤 닉네임을 바꿔 주세요.' : '닉네임을 저장하지 못했어요. ' + (error.message || '연결을 확인하고 다시 눌러 주세요.');
    } finally { busy = false; submit.disabled = false; cancel.disabled = false; input.disabled = false; if (dialog.open) input.focus(); }
  });
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { dialog.remove(); if (previous?.isConnected) previous.focus(); });
  document.body.append(dialog); dialog.showModal(); input.focus(); input.select();
}
