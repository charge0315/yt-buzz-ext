const logEl = document.getElementById('log');
const runBtn = document.getElementById('runBtn');
const limitEl = document.getElementById('limit');
const updateEl = document.getElementById('updateMode');

// i18n apply
for (const el of document.querySelectorAll('.i18n')) {
  const key = el.getAttribute('data-msg');
  if (!key) continue;
  const msg = chrome.i18n.getMessage(key);
  if (el.tagName === 'TITLE') {
    document.title = msg || el.textContent;
  } else {
    el.textContent = msg || el.textContent;
  }
}

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  logEl.textContent += `[${ts}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  log(chrome.i18n.getMessage('LOG_START') || '開始します…');
  try {
    const limit = Math.max(1, Math.min(50, Number(limitEl.value) || 10));
    const update = updateEl.checked;
    const res = await chrome.runtime.sendMessage({
      type: 'RUN',
      payload: { limit, update }
    });
    log(res?.message ?? (chrome.i18n.getMessage('LOG_DONE') || '完了'));
  } catch (e) {
    const msg = e?.message || String(e);
    // surface rate limit hints
    if (/quota|403|rate|userRateLimit/i.test(msg)) {
      log(`エラー(レート制限/クォータ): ${msg}`);
    } else {
      log(`エラー: ${msg}`);
    }
  } finally {
    runBtn.disabled = false;
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'LOG') {
    log(msg.payload);
  }
});
