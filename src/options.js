/**
 * Options page script
 * @file Options page for configuring extension settings
 */

/* global chrome */

// Get DOM elements with proper type casting
const dailyHourEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById('dailyHour')
);
const limitEl = /** @type {HTMLInputElement | null} */ (document.getElementById('limit'));
const updateEl = /** @type {HTMLInputElement | null} */ (document.getElementById('updateMode'));
const saveBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('save'));
const dryEl = /** @type {HTMLInputElement | null} */ (document.getElementById('dryRun'));
const startupEl = /** @type {HTMLInputElement | null} */ (
  document.getElementById('runOnStartup')
);
const runNowBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('runNow'));

// Populate hour options 0..23 with locale suffix
if (dailyHourEl) {
  const suffix = ' ' + (chrome.i18n?.getMessage('OPT_HOUR_SUFFIX') || '時');
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    opt.value = String(h);
    opt.textContent = `${h}${suffix}`;
    dailyHourEl.appendChild(opt);
  }
}

/**
 * Load settings from storage
 */
async function load() {
  const {
    limit = 10,
    update = true,
    dryRun = false,
    runOnStartup = false,
    dailyHour = '',
  } = await chrome.storage.sync.get(['limit', 'update', 'dryRun', 'runOnStartup', 'dailyHour']);

  if (limitEl) {
    limitEl.value = String(limit);
  }
  if (updateEl) {
    updateEl.checked = update;
  }
  if (dryEl) {
    dryEl.checked = !!dryRun;
  }
  if (startupEl) {
    startupEl.checked = !!runOnStartup;
  }
  if (dailyHourEl) {
    dailyHourEl.value = dailyHour === undefined || dailyHour === null ? '' : String(dailyHour);
  }
}

/**
 * Save settings to storage
 */
async function save() {
  const limit = Math.max(1, Math.min(50, Number(limitEl?.value) || 10));
  const update = !!updateEl?.checked;
  const dryRun = !!dryEl?.checked;
  const runOnStartup = !!startupEl?.checked;
  const dailyHour = dailyHourEl?.value === '' ? '' : Number(dailyHourEl?.value);

  await chrome.storage.sync.set({ limit, update, dryRun, runOnStartup, dailyHour });
  // eslint-disable-next-line no-alert
  alert(chrome.i18n?.getMessage('OPT_SAVED') || '保存しました');

  // Ask background to (re)schedule alarms
  chrome.runtime.sendMessage({ type: 'SCHEDULE_UPDATE' }).catch(() => {
    // Ignore if background is not ready
  });
}

/**
 * Run job immediately
 */
async function runNow() {
  const { limit = 10, update = true, dryRun = false } = await chrome.storage.sync.get([
    'limit',
    'update',
    'dryRun',
  ]);

  await chrome.runtime.sendMessage({ type: 'RUN', payload: { limit, update, dryRun } });
  // eslint-disable-next-line no-alert
  alert(
    chrome.i18n?.getMessage('OPT_RUN_NOW_STARTED') ||
      '実行を開始しました。ポップアップのログでご確認ください。'
  );
}

/**
 * Apply i18n to page elements
 */
function applyI18n() {
  const elements = document.querySelectorAll('.i18n');
  elements.forEach((el) => {
    const key = el.getAttribute('data-msg');
    if (!key) {
      return;
    }
    const msg = chrome.i18n?.getMessage(key);
    if (msg) {
      el.textContent = msg;
    }
  });
}

// Initialize
applyI18n();

if (saveBtn) {
  saveBtn.addEventListener('click', save);
}

if (runNowBtn) {
  runNowBtn.addEventListener('click', runNow);
}

load();
