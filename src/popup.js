const logEl = document.getElementById('log');
const runBtn = document.getElementById('runBtn');
const limitEl = document.getElementById('limit');
const updateEl = document.getElementById('updateMode');
const dryRunEl = document.getElementById('dryRun');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// i18n apply
for (const el of document.querySelectorAll('.i18n')) {
  const key = el.getAttribute('data-msg');
  if (!key) {
    continue;
  }
  const msg = chrome.i18n.getMessage(key);
  if (el.tagName === 'TITLE') {
    document.title = msg || el.textContent;
  } else {
    el.textContent = msg || el.textContent;
  }
}

function log(msg, level = 'info') {
  const ts = new Date().toLocaleTimeString();
  const className = `log-entry ${level}`;
  const line = document.createElement('div');
  line.className = className;
  line.innerHTML = `<span class="log-timestamp">[${ts}]</span>${msg}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function updateProgress(current, total) {
  if (!progressContainer.classList.contains('active')) {
    progressContainer.classList.add('active');
  }

  const percent = total > 0 ? (current / total) * 100 : 0;
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${current} / ${total}`;
}

function hideProgress() {
  progressContainer.classList.remove('active');
  progressBar.style.width = '0%';
  progressText.textContent = '0 / 0';
}

runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  logEl.textContent = '';
  hideProgress();

  log(chrome.i18n.getMessage('LOG_START') || '開始します…', 'info');

  try {
    const limit = Math.max(1, Math.min(50, Number(limitEl.value) || 10));
    const update = updateEl.checked;
    const dryRun = !!dryRunEl?.checked;

    const res = await chrome.runtime.sendMessage({
      type: 'RUN',
      payload: { limit, update, dryRun },
    });

    if (res?.error) {
      throw new Error(res.error);
    }

    log(res?.message ?? (chrome.i18n.getMessage('LOG_DONE') || '完了'), 'success');
    showNotification(
      chrome.i18n.getMessage('LOG_DONE') || '完了しました!',
      'success'
    );
  } catch (e) {
    const msg = e?.message || String(e);
    // Surface rate limit hints
    if (/quota|403|rate|userRateLimit/i.test(msg)) {
      log(`エラー(レート制限/クォータ): ${msg}`, 'error');
      showNotification('クォータ制限に達しました', 'error');
    } else {
      log(`エラー: ${msg}`, 'error');
      showNotification('エラーが発生しました', 'error');
    }
  } finally {
    runBtn.disabled = false;
    hideProgress();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'LOG') {
    const level = msg.payload?.level || 'info';
    log(msg.payload?.message || msg.payload, level);
  } else if (msg?.type === 'PROGRESS') {
    const { current, total } = msg.payload;
    updateProgress(current, total);
  }
});
