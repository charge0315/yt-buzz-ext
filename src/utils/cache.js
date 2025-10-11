/**
 * Cache manager for API responses
 */

import { CACHE_CONFIG } from './constants.js';
import logManager from './logger.js';

class CacheManager {
  constructor(ttl = CACHE_CONFIG.TTL) {
    this.ttl = ttl;
    this.memoryCache = new Map();
  }

  /**
   * Generate cache key
   */
  generateKey(prefix, params = {}) {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return paramStr ? `${prefix}:${paramStr}` : prefix;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (Date.now() - cached.timestamp < this.ttl) {
        return cached.value;
      }
      this.memoryCache.delete(key);
    }

    // Check storage cache
    try {
      const data = await chrome.storage.local.get(key);
      if (!data[key]) {
        return null;
      }

      const { value, timestamp } = data[key];
      if (Date.now() - timestamp > this.ttl) {
        await chrome.storage.local.remove(key);
        return null;
      }

      // Populate memory cache
      this.memoryCache.set(key, { value, timestamp });
      return value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value) {
    const timestamp = Date.now();
    const cacheEntry = { value, timestamp };

    // Set in memory cache
    this.memoryCache.set(key, cacheEntry);

    // Set in storage cache
    try {
      await chrome.storage.local.set({
        [key]: cacheEntry,
      });
    } catch (error) {
      console.error('Cache set error:', error);
      // Continue even if storage fails, memory cache is available
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    this.memoryCache.delete(key);
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries with a specific prefix
   */
  async clearPrefix(prefix) {
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear storage cache
    try {
      const allData = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(allData).filter((key) => key.startsWith(prefix));
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        await logManager.info(`Cleared ${keysToRemove.length} cache entries with prefix: ${prefix}`);
      }
    } catch (error) {
      console.error('Cache clear prefix error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    this.memoryCache.clear();
    try {
      const allData = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(allData).filter((key) => key.startsWith('cache:'));
      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys);
        await logManager.info(`Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const memoryCacheSize = this.memoryCache.size;

    let storageCacheSize = 0;
    try {
      const allData = await chrome.storage.local.get(null);
      storageCacheSize = Object.keys(allData).filter((key) => key.startsWith('cache:')).length;
    } catch (error) {
      console.error('Cache stats error:', error);
    }

    return {
      memoryCacheSize,
      storageCacheSize,
      ttl: this.ttl,
    };
  }

  /**
   * Wrap a function with caching
   */
  async wrap(key, fn, ttl = this.ttl) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value);
    return value;
  }
}

// Singleton instance
const cacheManager = new CacheManager();

export default cacheManager;
export { CacheManager };
