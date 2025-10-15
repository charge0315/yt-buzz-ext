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
        const errorMessage = chrome.runtime.lastError.message;

        // 特定のエラーメッセージに対する対処法を提供
        if (errorMessage.includes('bad client id')) {
          const setupError = new Error(
            'OAuth Client ID が無効です。Google Cloud Project の設定を確認してください。\n' +
            '詳細: docs/GOOGLE_CLOUD_SETUP.md を参照\n' +
            '設定コマンド: npm run setup'
          );
          logManager.error(`Authentication setup error: ${setupError.message}`);
          reject(setupError);
        } else if (errorMessage.includes('OAuth2 request failed')) {
          const configError = new Error(
            'OAuth2 設定に問題があります。Extension ID と Client ID の対応を確認してください。\n' +
            'Google Cloud Console でOAuth設定を更新する必要があります。'
          );
          logManager.error(`OAuth configuration error: ${configError.message}`);
          reject(configError);
        } else {
          const error = new Error(errorMessage);
          logManager.error(`Authentication failed: ${error.message}`);
          reject(error);
        }
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
 * @returns {Promise<void>}
 */
export async function removeCachedToken(token) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'Failed to remove cached token'));
      } else {
        logManager.info('Token removed from cache');
        // @ts-ignore - JSDoc indicates this resolve can be called without arguments
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logManager.error(`Failed to revoke token: ${errorMessage}`);
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
