/**
 * Authentication module for Google OAuth
 */

import { SCOPES } from '../utils/constants.js';
import logManager from '../utils/logger.js';

/**
 * Get authentication token
 * @param {boolean} interactive - Whether to show interactive login
 * @returns {Promise<string>} Authentication token
 */
export async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        const error = new Error(chrome.runtime.lastError.message);
        logManager.error(`Authentication failed: ${error.message}`);
        reject(error);
      } else if (!token) {
        const error = new Error('Failed to acquire auth token');
        logManager.error(error.message);
        reject(error);
      } else {
        logManager.info('Authentication successful');
        resolve(token);
      }
    });
  });
}

/**
 * Remove cached authentication token
 * @param {string} token - Token to remove
 */
export async function removeCachedToken(token) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        logManager.info('Token removed from cache');
        resolve();
      }
    });
  });
}

/**
 * Revoke authentication token
 * @param {string} token - Token to revoke
 */
export async function revokeToken(token) {
  try {
    const response = await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
    if (!response.ok) {
      throw new Error(`Failed to revoke token: ${response.status}`);
    }
    await removeCachedToken(token);
    await logManager.info('Token revoked successfully');
  } catch (error) {
    await logManager.error(`Failed to revoke token: ${error.message}`);
    throw error;
  }
}

/**
 * Get fresh authentication token (removes cache and gets new one)
 */
export async function getFreshToken() {
  try {
    const oldToken = await getAuthToken(false);
    if (oldToken) {
      await removeCachedToken(oldToken);
    }
  } catch {
    // Ignore errors from getting old token
  }

  return getAuthToken(true);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  try {
    await getAuthToken(false);
    return true;
  } catch {
    return false;
  }
}
