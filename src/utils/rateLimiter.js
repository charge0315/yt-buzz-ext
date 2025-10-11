/**
 * Rate limiter for API calls with quota management
 */

import { RATE_LIMIT_CONFIG, STORAGE_KEYS } from './constants.js';
import logManager from './logger.js';

class RateLimiter {
  constructor(
    maxConcurrent = RATE_LIMIT_CONFIG.MAX_CONCURRENT,
    minDelay = RATE_LIMIT_CONFIG.MIN_DELAY_MS
  ) {
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
    this.queue = [];
    this.active = 0;
    this.lastRequest = 0;
    this.quotaUsed = 0;
    this.quotaLimit = RATE_LIMIT_CONFIG.DAILY_QUOTA_LIMIT;
    this.quotaResetTime = null;
    this.initialized = false;
  }

  /**
   * Initialize rate limiter with stored quota data
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const data = await chrome.storage.local.get([
        STORAGE_KEYS.QUOTA_USED,
        STORAGE_KEYS.QUOTA_RESET,
      ]);

      const now = Date.now();
      const resetTime = data[STORAGE_KEYS.QUOTA_RESET] || 0;

      // Reset quota if time has passed
      if (now >= resetTime) {
        this.quotaUsed = 0;
        this.quotaResetTime = this.getNextResetTime(now);
        await this.saveQuotaData();
      } else {
        this.quotaUsed = data[STORAGE_KEYS.QUOTA_USED] || 0;
        this.quotaResetTime = resetTime;
      }

      this.initialized = true;
      await logManager.info(
        `Rate limiter initialized. Quota: ${this.quotaUsed}/${this.quotaLimit}`
      );
    } catch (error) {
      console.error('Failed to initialize RateLimiter:', error);
      this.quotaUsed = 0;
      this.quotaResetTime = this.getNextResetTime(Date.now());
      this.initialized = true;
    }
  }

  /**
   * Calculate next quota reset time (midnight PST)
   */
  getNextResetTime(now) {
    const date = new Date(now);
    // YouTube API quota resets at midnight Pacific Time
    const pstOffset = -8 * 60; // PST is UTC-8
    const localOffset = date.getTimezoneOffset();
    const offsetDiff = localOffset - pstOffset;

    date.setHours(24, 0, 0, 0);
    date.setMinutes(date.getMinutes() + offsetDiff);

    return date.getTime();
  }

  /**
   * Save quota data to storage
   */
  async saveQuotaData() {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.QUOTA_USED]: this.quotaUsed,
        [STORAGE_KEYS.QUOTA_RESET]: this.quotaResetTime,
      });
    } catch (error) {
      console.error('Failed to save quota data:', error);
    }
  }

  /**
   * Execute a function with rate limiting
   * @param {Function} fn - The function to execute
   * @param {number} cost - Quota cost of this operation
   */
  async execute(fn, cost = 1) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check quota
    const now = Date.now();
    if (now >= this.quotaResetTime) {
      this.quotaUsed = 0;
      this.quotaResetTime = this.getNextResetTime(now);
      await this.saveQuotaData();
    }

    if (this.quotaUsed + cost > this.quotaLimit) {
      const timeUntilReset = this.quotaResetTime - now;
      const hours = Math.ceil(timeUntilReset / (1000 * 60 * 60));
      throw new Error(
        `Daily quota exceeded (${this.quotaUsed}/${this.quotaLimit}). Resets in ${hours} hours.`
      );
    }

    // Wait for available slot
    await this.waitForSlot();
    this.active++;

    try {
      const result = await fn();
      this.quotaUsed += cost;
      await this.saveQuotaData();
      return result;
    } finally {
      this.active--;
      this.lastRequest = Date.now();
      this.processQueue();
    }
  }

  /**
   * Wait for an available execution slot
   */
  async waitForSlot() {
    // Wait if max concurrent requests reached
    if (this.active >= this.maxConcurrent) {
      await new Promise((resolve) => this.queue.push(resolve));
    }

    // Enforce minimum delay between requests
    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < this.minDelay) {
      await new Promise((resolve) => setTimeout(resolve, this.minDelay - elapsed));
    }
  }

  /**
   * Process queued requests
   */
  processQueue() {
    if (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const resolve = this.queue.shift();
      resolve();
    }
  }

  /**
   * Get current quota status
   */
  getQuotaStatus() {
    return {
      used: this.quotaUsed,
      limit: this.quotaLimit,
      remaining: this.quotaLimit - this.quotaUsed,
      resetTime: this.quotaResetTime,
      resetIn: this.quotaResetTime - Date.now(),
    };
  }

  /**
   * Reset quota (for testing)
   */
  async resetQuota() {
    this.quotaUsed = 0;
    this.quotaResetTime = this.getNextResetTime(Date.now());
    await this.saveQuotaData();
    await logManager.info('Quota manually reset');
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

export default rateLimiter;
export { RateLimiter };
