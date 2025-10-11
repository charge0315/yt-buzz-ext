/**
 * Logger utility with message queuing and persistence
 */

import { STORAGE_KEYS, MESSAGE_TYPES, LOG_LEVELS } from './constants.js';

class LogManager {
  constructor() {
    this.queue = [];
    this.maxQueueSize = 100;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const { [STORAGE_KEYS.LOGS]: logs = [] } = await chrome.storage.local.get(
        STORAGE_KEYS.LOGS
      );
      this.queue = logs;
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize LogManager:', error);
      this.queue = [];
      this.initialized = true;
    }
  }

  /**
   * Log a message
   * @param {string} message - The message to log
   * @param {string} level - Log level (info, warn, error, success)
   */
  async log(message, level = LOG_LEVELS.INFO) {
    if (!this.initialized) {
      await this.initialize();
    }

    const entry = {
      timestamp: Date.now(),
      message,
      level,
      date: new Date().toISOString(),
    };

    this.queue.push(entry);

    // Maintain queue size
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift();
    }

    // Persist to storage
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.LOGS]: this.queue });
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }

    // Send to active popup/options page
    try {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.LOG,
        payload: { message, level, timestamp: entry.timestamp },
      });
    } catch (error) {
      // Popup/options page not open, ignore
    }
  }

  /**
   * Log info message
   */
  async info(message) {
    return this.log(message, LOG_LEVELS.INFO);
  }

  /**
   * Log warning message
   */
  async warn(message) {
    return this.log(message, LOG_LEVELS.WARN);
  }

  /**
   * Log error message
   */
  async error(message) {
    return this.log(message, LOG_LEVELS.ERROR);
  }

  /**
   * Log success message
   */
  async success(message) {
    return this.log(message, LOG_LEVELS.SUCCESS);
  }

  /**
   * Get all logs
   */
  async getLogs() {
    if (!this.initialized) {
      await this.initialize();
    }
    return [...this.queue];
  }

  /**
   * Get logs filtered by level
   */
  async getLogsByLevel(level) {
    const logs = await this.getLogs();
    return logs.filter((entry) => entry.level === level);
  }

  /**
   * Get logs within time range
   */
  async getLogsByTimeRange(startTime, endTime) {
    const logs = await this.getLogs();
    return logs.filter((entry) => entry.timestamp >= startTime && entry.timestamp <= endTime);
  }

  /**
   * Clear all logs
   */
  async clear() {
    this.queue = [];
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.LOGS);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Export logs as JSON
   */
  async exportLogs() {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
}

// Singleton instance
const logManager = new LogManager();

export default logManager;
export { LogManager };
