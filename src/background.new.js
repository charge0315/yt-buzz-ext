/**
 * Background service worker (new modular version)
 */

import { MESSAGE_TYPES } from './utils/constants.js';
import logManager from './utils/logger.js';
import rateLimiter from './utils/rateLimiter.js';
import { runJob, handleStartup, handleAlarm, initializeScheduler } from './background/scheduler.js';

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  await logManager.info('Extension installed/updated');
  await rateLimiter.initialize();
  await initializeScheduler();
});

// Handle startup
chrome.runtime.onStartup.addListener(async () => {
  await logManager.info('Browser started');
  await handleStartup();
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  await handleAlarm(alarm);
});

// Handle messages from popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
        case MESSAGE_TYPES.RUN: {
          await logManager.info('Received RUN message');
          const result = await runJob(message.payload || {});
          sendResponse(result);
          break;
        }

        case MESSAGE_TYPES.SCHEDULE_UPDATE:
          await logManager.info('Received SCHEDULE_UPDATE message');
          await initializeScheduler();
          sendResponse({ ok: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      const msg = typeof error === 'object' && error && 'message' in error ? error.message : String(error);
      await logManager.error(`Message handler error: ${msg}`);
      sendResponse({ error: msg });
    }
  })();

  return true; // Keep channel open for async response
});

// Log initialization
logManager.info('Background service worker initialized');
