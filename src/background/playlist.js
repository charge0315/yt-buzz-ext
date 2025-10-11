/**
 * Playlist management module
 */

import * as api from './api.js';
import logManager from '../utils/logger.js';
import { MESSAGE_TYPES } from '../utils/constants.js';

/**
 * Sync playlist items with target video IDs
 */
export async function syncPlaylistItems(token, playlistId, targetIds, { dryRun = false } = {}) {
  const items = await api.getPlaylistItems(token, playlistId);
  const currentIds = items.map((x) => x.videoId);
  const idToItem = new Map(items.map((x) => [x.videoId, x.playlistItemId]));

  const toAdd = targetIds.filter((v) => !currentIds.includes(v));
  const toRemove = currentIds.filter((v) => !targetIds.includes(v));

  // Add new videos
  for (const videoId of toAdd) {
    if (dryRun) {
      await logManager.info(`[DRY-RUN] Would add: ${videoId}`);
    } else {
      await api.addVideoToPlaylist(token, playlistId, videoId);
      await logManager.info(`Added: ${videoId}`);
    }
  }

  // Remove old videos
  for (const videoId of toRemove) {
    const playlistItemId = idToItem.get(videoId);
    if (!playlistItemId) {
      continue;
    }

    if (dryRun) {
      await logManager.info(`[DRY-RUN] Would remove: ${videoId}`);
    } else {
      await api.removeVideoFromPlaylist(token, playlistItemId);
      await logManager.info(`Removed: ${videoId}`);
    }
  }

  return { added: toAdd.length, removed: toRemove.length };
}

/**
 * Reorder playlist to match target order
 */
export async function reorderPlaylist(token, playlistId, targetIds, { dryRun = false } = {}) {
  const items = await api.getPlaylistItems(token, playlistId);
  const map = new Map(items.map((it) => [it.videoId, { id: it.playlistItemId, pos: it.position }]));

  let updated = 0;

  for (let i = 0; i < targetIds.length; i++) {
    const videoId = targetIds[i];
    if (!map.has(videoId)) {
      continue;
    }

    const { id, pos } = map.get(videoId);
    if (pos !== i) {
      if (dryRun) {
        await logManager.info(`[DRY-RUN] Would reorder: ${videoId} -> position ${i}`);
      } else {
        await api.updatePlaylistItemPosition(token, id, playlistId, i);
      }
      updated++;
    }
  }

  return updated;
}

/**
 * Create or update playlist for a channel
 */
export async function createOrUpdateChannelPlaylist(
  token,
  channelId,
  channelTitle,
  { update = true, limit = 10, dryRun = false } = {}
) {
  const channel = await api.getChannel(token, channelId);
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    await logManager.error(`Channel not found: ${channelId}`);
    return;
  }

  const videoIds = await api.getRecentVideos(token, uploadsPlaylistId, limit);

  if (!videoIds.length) {
    await logManager.info(`- ${channelTitle}: No recent videos found`);
    return;
  }

  const playlistTitle = `${channelTitle} - 最新Movie`;

  if (update) {
    const existingPlaylist = await api.findPlaylistByTitle(token, playlistTitle);

    if (existingPlaylist) {
      const playlistId = existingPlaylist.id;
      const { added, removed } = await syncPlaylistItems(token, playlistId, videoIds, { dryRun });
      const reordered = await reorderPlaylist(token, playlistId, videoIds, { dryRun });

      await logManager.success(
        `- ${channelTitle}: Updated (added ${added}, removed ${removed}, reordered ${reordered})`
      );
      return { playlistId, added, removed, reordered };
    }
  }

  // Create new playlist
  if (dryRun) {
    await logManager.info(
      `[DRY-RUN] Would create playlist: '${playlistTitle}' with ${videoIds.length} videos`
    );
    return { added: videoIds.length, removed: 0, reordered: 0 };
  }

  const playlist = await api.createPlaylist(
    token,
    playlistTitle,
    `${channelTitle}の直近の動画を集めた再生リストです。`,
    'private'
  );

  const playlistId = playlist.id;

  for (const videoId of videoIds) {
    await api.addVideoToPlaylist(token, playlistId, videoId);
  }

  await logManager.success(`- ${channelTitle}: Created playlist with ${videoIds.length} videos`);
  return { playlistId, added: videoIds.length, removed: 0, reordered: 0 };
}

/**
 * Create or update aggregate playlist
 */
export async function createOrUpdateAggregatePlaylist(
  token,
  latestItems,
  { title = '登録チャンネル - 最新', update = true, dryRun = false } = {}
) {
  if (!latestItems.length) {
    await logManager.info('Aggregate: No videos to add');
    return;
  }

  // Sort by published date (newest first)
  latestItems.sort((a, b) => {
    const timeA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const timeB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return timeB - timeA;
  });

  const targetIds = latestItems.map((x) => x.videoId);

  if (update) {
    const existingPlaylist = await api.findPlaylistByTitle(token, title);

    if (existingPlaylist) {
      const playlistId = existingPlaylist.id;
      const { added, removed } = await syncPlaylistItems(token, playlistId, targetIds, { dryRun });
      const reordered = await reorderPlaylist(token, playlistId, targetIds, { dryRun });

      await logManager.success(
        `- Aggregate: Updated (added ${added}, removed ${removed}, reordered ${reordered})`
      );
      return { playlistId, added, removed, reordered };
    }
  }

  // Create new aggregate playlist
  if (dryRun) {
    await logManager.info(
      `[DRY-RUN] Would create aggregate playlist: '${title}' with ${targetIds.length} videos`
    );
    return { added: targetIds.length, removed: 0, reordered: 0 };
  }

  const playlist = await api.createPlaylist(
    token,
    title,
    '登録チャンネルの最新動画を集めた再生リストです。',
    'private'
  );

  const playlistId = playlist.id;

  for (const videoId of targetIds) {
    await api.addVideoToPlaylist(token, playlistId, videoId);
  }

  await logManager.success(`- Aggregate: Created playlist with ${targetIds.length} videos`);
  return { playlistId, added: targetIds.length, removed: 0, reordered: 0 };
}

/**
 * Send progress update
 */
function sendProgress(current, total) {
  try {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.PROGRESS,
      payload: { current, total },
    });
  } catch {
    // Ignore if no listener
  }
}

/**
 * Main job to process all subscriptions
 */
export async function processSubscriptions(token, { limit = 10, update = true, dryRun = false } = {}) {
  await logManager.info('Starting subscription processing...');

  const subscriptions = await api.getSubscriptions(token);
  await logManager.info(`Found ${subscriptions.length} subscriptions`);

  const aggregateVideos = [];
  let processed = 0;

  for (const subscription of subscriptions) {
    const channelId = subscription?.snippet?.resourceId?.channelId;
    const channelTitle = subscription?.snippet?.title;

    if (!channelId) {
      continue;
    }

    try {
      await createOrUpdateChannelPlaylist(token, channelId, channelTitle, {
        update,
        limit,
        dryRun,
      });

      // Collect latest video for aggregate playlist
      try {
        const channel = await api.getChannel(token, channelId);
        const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;

        if (uploadsPlaylistId) {
          const latest = await api.getLatestVideo(token, uploadsPlaylistId);
          if (latest?.videoId) {
            aggregateVideos.push(latest);
          }
        }
      } catch (error) {
        // Non-fatal for aggregate
        await logManager.warn(`Failed to get latest video for ${channelTitle}: ${error.message}`);
      }

      processed++;
      sendProgress(processed, subscriptions.length);

      if (processed % 5 === 0) {
        await logManager.info(`Progress: ${processed}/${subscriptions.length}`);
      }
    } catch (error) {
      await logManager.error(`Failed to process ${channelTitle}: ${error.message}`);
    }
  }

  // Create/update aggregate playlist
  try {
    await createOrUpdateAggregatePlaylist(token, aggregateVideos, {
      title: '登録チャンネル - 最新',
      update,
      dryRun,
    });
  } catch (error) {
    await logManager.error(`Failed to create/update aggregate playlist: ${error.message}`);
  }

  await logManager.success('All processing completed!');
  return { processed, total: subscriptions.length };
}
