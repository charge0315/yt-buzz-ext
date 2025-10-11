/**
 * Scheduler for automated runs
 */

import { STORAGE_KEYS, ALARM_NAMES, DEFAULT_SETTINGS } from '../utils/constants.js';
import logManager from '../utils/logger.js';
import { getAuthToken } from './auth.js';
import { processSubscriptions } from './playlist.js';

/**
 * Get settings from storage
 */
async function getSettings() {
  const data = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS, ...data };
}

/**
 * Schedule alarms based on settings
 */
export async function scheduleFromSettings() {
  const { dailyHour } = await getSettings();

  // Clear existing daily alarm
  await chrome.alarms.clear(ALARM_NAMES.DAILY_RUN);

  if (dailyHour === '' || dailyHour === null || dailyHour === undefined) {
    await logManager.info('Daily schedule disabled');
    return;
  }

  const hour = Number(dailyHour);

  // Calculate next run time
  const now = new Date();
  const nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const delayMinutes = Math.ceil((nextRun.getTime() - now.getTime()) / 60000);

  // Create alarm
  await chrome.alarms.create(ALARM_NAMES.DAILY_RUN, {
    delayInMinutes: Math.max(1, delayMinutes),
    periodInMinutes: 24 * 60,
  });

  await logManager.info(
    `Daily schedule set for ${hour}:00 (next run in ${delayMinutes} minutes)`
  );
}

/**
 * Run the main job
 */
export async function runJob(options = {}) {
  try {
    // Get settings
    const settings = await getSettings();
    const jobOptions = { ...settings, ...options };

    await logManager.info(
      `Starting job with settings: limit=${jobOptions.limit}, update=${jobOptions.update}, dryRun=${jobOptions.dryRun}`
    );

    // Get authentication token
    const token = await getAuthToken(true);

    // Process subscriptions
    const result = await processSubscriptions(token, jobOptions);

    await logManager.success(
      `Job completed: ${result.processed}/${result.total} subscriptions processed`
    );

    return { message: 'すべての処理が完了しました。', result };
  } catch (error) {
    await logManager.error(`Job failed: ${error.message}`);
    throw error;
  }
}

/**
 * Handle startup run
 */
export async function handleStartup() {
  const { runOnStartup } = await getSettings();

  if (runOnStartup) {
    await logManager.info('Running scheduled startup job');
    try {
      await runJob();
    } catch (error) {
      await logManager.error(`Startup job failed: ${error.message}`);
    }
  }
}

/**
 * Handle alarm events
 */
export async function handleAlarm(alarm) {
  if (alarm?.name === ALARM_NAMES.DAILY_RUN) {
    await logManager.info('Running scheduled daily job');
    try {
      await runJob();
    } catch (error) {
      await logManager.error(`Daily job failed: ${error.message}`);
    }
  }
}

/**
 * Initialize scheduler
 */
export async function initializeScheduler() {
  await scheduleFromSettings();
  await logManager.info('Scheduler initialized');
}
