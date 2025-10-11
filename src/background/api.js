/**
 * YouTube Data API wrapper
 */

import { API_BASE, QUOTA_COSTS } from '../utils/constants.js';
import { withRetry } from '../utils/retry.js';
import rateLimiter from '../utils/rateLimiter.js';
import cacheManager from '../utils/cache.js';
import logManager from '../utils/logger.js';

/**
 * Make an API request
 * @param {string} path - API endpoint path
 * @param {Object} options - Request options
 */
async function apiFetch(path, { method = 'GET', params = {}, body, token }) {
  const url = new URL(API_BASE + path);

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(
      `API ${method} ${url.pathname}: ${response.status} ${response.statusText} ${text}`
    );
    error.status = response.status;
    error.body = text;
    throw error;
  }

  return response.json();
}

/**
 * Get user's subscriptions
 */
export async function getSubscriptions(token, useCache = true) {
  const cacheKey = cacheManager.generateKey('cache:subscriptions', { mine: true });

  if (useCache) {
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      await logManager.info('Using cached subscriptions');
      return cached;
    }
  }

  const items = [];
  let pageToken;

  while (true) {
    const response = await rateLimiter.execute(
      () =>
        withRetry(() =>
          apiFetch('/subscriptions', {
            token,
            params: { part: 'snippet', mine: true, maxResults: 50, pageToken },
          })
        ),
      QUOTA_COSTS.LIST
    );

    items.push(...(response.items || []));
    pageToken = response.nextPageToken;

    if (!pageToken) {
      break;
    }
  }

  await cacheManager.set(cacheKey, items);
  await logManager.info(`Fetched ${items.length} subscriptions`);
  return items;
}

/**
 * Get channel details
 */
export async function getChannel(token, channelId, useCache = true) {
  const cacheKey = cacheManager.generateKey('cache:channel', { id: channelId });

  if (useCache) {
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const response = await rateLimiter.execute(
    () =>
      withRetry(() =>
        apiFetch('/channels', {
          token,
          params: { part: 'contentDetails,snippet', id: channelId },
        })
      ),
    QUOTA_COSTS.LIST
  );

  const channel = response.items?.[0] || null;
  if (channel) {
    await cacheManager.set(cacheKey, channel);
  }

  return channel;
}

/**
 * Get multiple channels (batch request)
 */
export async function getChannelsBatch(token, channelIds, useCache = true) {
  const batchSize = 50;
  const results = [];

  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const ids = batch.join(',');

    const response = await rateLimiter.execute(
      () =>
        withRetry(() =>
          apiFetch('/channels', {
            token,
            params: { part: 'contentDetails,snippet', id: ids },
          })
        ),
      QUOTA_COSTS.LIST
    );

    results.push(...(response.items || []));
  }

  return results;
}

/**
 * Get playlist items
 */
export async function getPlaylistItems(token, playlistId) {
  const results = [];
  let pageToken;

  while (true) {
    const response = await rateLimiter.execute(
      () =>
        withRetry(() =>
          apiFetch('/playlistItems', {
            token,
            params: {
              part: 'snippet,contentDetails',
              playlistId,
              maxResults: 50,
              pageToken,
            },
          })
        ),
      QUOTA_COSTS.LIST
    );

    for (const item of response.items || []) {
      results.push({
        playlistItemId: item.id,
        videoId: item.contentDetails?.videoId,
        position: item.snippet?.position ?? 0,
      });
    }

    pageToken = response.nextPageToken;
    if (!pageToken) {
      break;
    }
  }

  return results;
}

/**
 * Find user's playlist by title
 */
export async function findPlaylistByTitle(token, title) {
  let pageToken;

  while (true) {
    const response = await rateLimiter.execute(
      () =>
        withRetry(() =>
          apiFetch('/playlists', {
            token,
            params: { part: 'snippet', mine: true, maxResults: 50, pageToken },
          })
        ),
      QUOTA_COSTS.LIST
    );

    for (const item of response.items || []) {
      if (item?.snippet?.title === title) {
        return item;
      }
    }

    pageToken = response.nextPageToken;
    if (!pageToken) {
      break;
    }
  }

  return null;
}

/**
 * Create a playlist
 */
export async function createPlaylist(token, title, description, privacyStatus = 'private') {
  const response = await rateLimiter.execute(
    () =>
      withRetry(() =>
        apiFetch('/playlists', {
          token,
          method: 'POST',
          params: { part: 'snippet,status' },
          body: {
            snippet: { title, description },
            status: { privacyStatus },
          },
        })
      ),
    QUOTA_COSTS.INSERT
  );

  await logManager.success(`Created playlist: ${title}`);
  return response;
}

/**
 * Add video to playlist
 */
export async function addVideoToPlaylist(token, playlistId, videoId, position) {
  const body = {
    snippet: {
      playlistId,
      resourceId: { kind: 'youtube#video', videoId },
    },
  };

  if (position !== undefined) {
    body.snippet.position = position;
  }

  const response = await rateLimiter.execute(
    () =>
      withRetry(() =>
        apiFetch('/playlistItems', {
          token,
          method: 'POST',
          params: { part: 'snippet' },
          body,
        })
      ),
    QUOTA_COSTS.INSERT
  );

  return response;
}

/**
 * Remove video from playlist
 */
export async function removeVideoFromPlaylist(token, playlistItemId) {
  await rateLimiter.execute(
    () =>
      withRetry(() =>
        apiFetch('/playlistItems', {
          token,
          method: 'DELETE',
          params: { id: playlistItemId },
        })
      ),
    QUOTA_COSTS.DELETE
  );
}

/**
 * Update playlist item position
 */
export async function updatePlaylistItemPosition(token, playlistItemId, playlistId, position) {
  const response = await rateLimiter.execute(
    () =>
      withRetry(() =>
        apiFetch('/playlistItems', {
          token,
          method: 'PUT',
          params: { part: 'snippet' },
          body: {
            id: playlistItemId,
            snippet: { playlistId, position },
          },
        })
      ),
    QUOTA_COSTS.UPDATE
  );

  return response;
}

/**
 * Get recent videos from uploads playlist
 */
export async function getRecentVideos(token, uploadsPlaylistId, limit = 10) {
  const response = await rateLimiter.execute(
    () =>
      withRetry(() =>
        apiFetch('/playlistItems', {
          token,
          params: {
            part: 'contentDetails',
            playlistId: uploadsPlaylistId,
            maxResults: Math.min(limit, 50),
          },
        })
      ),
    QUOTA_COSTS.LIST
  );

  const videoIds = (response.items || [])
    .map((item) => item.contentDetails?.videoId)
    .filter(Boolean);

  return videoIds.slice(0, limit);
}

/**
 * Get latest video from uploads playlist
 */
export async function getLatestVideo(token, uploadsPlaylistId) {
  const response = await rateLimiter.execute(
    () =>
      withRetry(() =>
        apiFetch('/playlistItems', {
          token,
          params: {
            part: 'contentDetails',
            playlistId: uploadsPlaylistId,
            maxResults: 1,
          },
        })
      ),
    QUOTA_COSTS.LIST
  );

  const item = response.items?.[0];
  if (!item) {
    return null;
  }

  const videoId = item.contentDetails?.videoId;
  const publishedAt = item.contentDetails?.videoPublishedAt || null;

  if (!videoId) {
    return null;
  }

  return { videoId, publishedAt };
}
