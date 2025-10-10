const logEl = document.getElementById('log');
const runBtn = document.getElementById('runBtn');
const limitEl = document.getElementById('limit');
const updateEl = document.getElementById('updateMode');

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  logEl.textContent += `[${ts}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  log('開始します…');
  try {
    const limit = Math.max(1, Math.min(50, Number(limitEl.value) || 10));
    const update = updateEl.checked;
    const res = await chrome.runtime.sendMessage({
      type: 'RUN',
      payload: { limit, update }
    });
    log(res?.message ?? '完了');
  } catch (e) {
    log(`エラー: ${e?.message || e}`);
  } finally {
    runBtn.disabled = false;
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'LOG') {
    log(msg.payload);
  }
});
