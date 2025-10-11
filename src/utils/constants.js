/**
 * Constants for the extension
 */

export const API_BASE = 'https://www.googleapis.com/youtube/v3';

export const SCOPES = ['https://www.googleapis.com/auth/youtube'];

export const QUOTA_COSTS = {
  LIST: 1,
  INSERT: 50,
  UPDATE: 50,
  DELETE: 50,
};

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 5,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 32000,
  RETRYABLE_STATUS_CODES: [403, 429, 500, 502, 503, 504],
};

export const RATE_LIMIT_CONFIG = {
  MAX_CONCURRENT: 5,
  MIN_DELAY_MS: 100,
  DAILY_QUOTA_LIMIT: 10000,
};

export const CACHE_CONFIG = {
  TTL: 3600000, // 1 hour
  KEYS: {
    SUBSCRIPTIONS: 'cache:subscriptions',
    CHANNELS: 'cache:channels',
    PLAYLISTS: 'cache:playlists',
  },
};

export const STORAGE_KEYS = {
  LIMIT: 'limit',
  UPDATE: 'update',
  DRY_RUN: 'dryRun',
  RUN_ON_STARTUP: 'runOnStartup',
  DAILY_HOUR: 'dailyHour',
  LOGS: 'logs',
  QUOTA_USED: 'quotaUsed',
  QUOTA_RESET: 'quotaReset',
};

export const ALARM_NAMES = {
  DAILY_RUN: 'daily-run',
  QUOTA_RESET: 'quota-reset',
};

export const MESSAGE_TYPES = {
  LOG: 'LOG',
  RUN: 'RUN',
  PROGRESS: 'PROGRESS',
  SCHEDULE_UPDATE: 'SCHEDULE_UPDATE',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
};

export const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SUCCESS: 'success',
};

export const DEFAULT_SETTINGS = {
  limit: 10,
  update: true,
  dryRun: false,
  runOnStartup: false,
  dailyHour: '',
};
