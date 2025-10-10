// populate hour options 0..23 with locale suffix
const dailyHourEl = document.getElementById('dailyHour');
const suffix = ' ' + (chrome.i18n?.getMessage('OPT_HOUR_SUFFIX') || '時');
for (let h = 0; h < 24; h++) {
  const opt = document.createElement('option');
  opt.value = String(h);
  opt.textContent = `${h}${suffix}`;
  dailyHourEl.appendChild(opt);
}

const limitEl = document.getElementById('limit');
const updateEl = document.getElementById('updateMode');
const saveBtn = document.getElementById('save');
const dryEl = document.getElementById('dryRun');
const startupEl = document.getElementById('runOnStartup');
const runNowBtn = document.getElementById('runNow');

async function load() {
  const { limit = 10, update = true, dryRun = false, runOnStartup = false, dailyHour = '' } = await chrome.storage.sync.get([
    'limit',
    'update',
    'dryRun',
    'runOnStartup',
    'dailyHour',
  ]);
  limitEl.value = limit;
  updateEl.checked = update;
  dryEl.checked = !!dryRun;
  startupEl.checked = !!runOnStartup;
  dailyHourEl.value = dailyHour === undefined || dailyHour === null ? '' : String(dailyHour);
}

async function save() {
  const limit = Math.max(1, Math.min(50, Number(limitEl.value) || 10));
  const update = !!updateEl.checked;
  const dryRun = !!dryEl.checked;
  const runOnStartup = !!startupEl.checked;
  const dailyHour = dailyHourEl.value === '' ? '' : Number(dailyHourEl.value);
  await chrome.storage.sync.set({ limit, update, dryRun, runOnStartup, dailyHour });
  alert(chrome.i18n?.getMessage('OPT_SAVED') || '保存しました');
  // ask background to (re)schedule alarms
  chrome.runtime.sendMessage({ type: 'SCHEDULE_UPDATE' });
}

async function runNow() {
  const { limit = 10, update = true, dryRun = false } = await chrome.storage.sync.get(['limit', 'update', 'dryRun']);
  await chrome.runtime.sendMessage({ type: 'RUN', payload: { limit, update, dryRun } });
  alert(chrome.i18n?.getMessage('OPT_RUN_NOW_STARTED') || '実行を開始しました。ポップアップのログでご確認ください。');
}

// i18n apply (simple)
for (const el of document.querySelectorAll('.i18n')) {
  const key = el.getAttribute('data-msg');
  if (!key) continue;
  const msg = chrome.i18n?.getMessage(key);
  if (msg) el.textContent = msg;
}

saveBtn.addEventListener('click', save);
runNowBtn.addEventListener('click', runNow);
load();
