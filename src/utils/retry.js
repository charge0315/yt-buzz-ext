/**
 * Retry utility with exponential backoff
 */

import { RETRY_CONFIG } from './constants.js';
import logManager from './logger.js';

/**
 * Execute a function with exponential backoff retry
 * @param {Function} fn - The function to execute
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @returns {Promise<any>} Result of the function
 */
export async function withRetry(
  fn,
  maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
  baseDelayMs = RETRY_CONFIG.BASE_DELAY_MS
) {
  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      // Check if error is retryable
      const isRetryable =
        RETRY_CONFIG.RETRYABLE_STATUS_CODES.includes(error.status) ||
        !error.status || // Network errors
        error.message?.includes('network') ||
        error.message?.includes('timeout');

      if (!isRetryable || attempt >= maxAttempts) {
        await logManager.error(`Error: ${error.message}`);
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 300;
      const delay = Math.min(exponentialDelay + jitter, RETRY_CONFIG.MAX_DELAY_MS);

      await logManager.warn(
        `Retrying after error (${attempt}/${maxAttempts - 1}): ${error.message}. Waiting ${Math.round(delay)}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper for a function
 * @param {Function} fn - The function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} Wrapped function with retry logic
 */
export function createRetryWrapper(fn, options = {}) {
  const { maxAttempts, baseDelayMs } = { ...RETRY_CONFIG, ...options };

  return async function (...args) {
    return withRetry(() => fn(...args), maxAttempts, baseDelayMs);
  };
}

/**
 * Retry a promise-returning function until it succeeds or a condition is met
 * @param {Function} fn - Function that returns a promise
 * @param {Function} shouldRetry - Function that determines if retry should happen
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} baseDelayMs - Base delay between retries
 */
export async function retryUntil(
  fn,
  shouldRetry,
  maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
  baseDelayMs = RETRY_CONFIG.BASE_DELAY_MS
) {
  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    try {
      const result = await fn();
      if (!shouldRetry(result)) {
        return result;
      }
      lastError = new Error('Condition not met');
    } catch (error) {
      lastError = error;
    }

    attempt++;
    if (attempt >= maxAttempts) {
      break;
    }

    const delay = Math.min(
      baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 300,
      RETRY_CONFIG.MAX_DELAY_MS
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError || new Error('Max attempts reached');
}
