
/**
 * @type {string}
 */
const API_BASE = 'https://www.googleapis.com/youtube/v3';


/**
 * @param {string} msg
 */
function sendLog(msg) {
  chrome.runtime.sendMessage({ type: 'LOG', payload: msg }).catch(() => {});
}

async function getAuthTokenInteractive(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!token) {
        reject(new Error('Failed to acquire auth token'));
      } else {
        resolve(token);
      }
    });
  });
}

/**
 * @param {string} path
 * @param {{ method?: string, params?: Object, body?: any, token: string }} opts
 */
async function apiFetch(path, { method='GET', params={}, body, token }) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null) {
url.searchParams.set(k, String(v));
}
  });
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    /** @type {Error & { status?: number, body?: string }} */
    const err = new Error(`API ${method} ${url.pathname}: ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return res.json();
}

/**
 * @param {() => Promise<any>} fn
 * @param {number} [maxAttempts]
 * @param {number} [baseDelayMs]
 */
async function withRetry(fn, maxAttempts = 5, baseDelayMs = 1000) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      // 型ガード
      const status = typeof e === 'object' && e && 'status' in e ? e.status : undefined;
      const message = typeof e === 'object' && e && 'message' in e ? e.message : String(e);
      const retryable = [403, 429].includes(status) || (status >= 500 && status < 600) || !status;
      if (!retryable || attempt >= maxAttempts) {
        sendLog(`エラー: ${message}`);
        throw e;
      }
      const jitter = Math.random()*300;
      const delay = baseDelayMs * Math.pow(2, attempt-1) + jitter;
      sendLog(`一時的なエラーのため再試行します（${attempt}/${maxAttempts-1}）: ${message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * @param {string} iso
 * @returns {number}
 */

/**
 * @param {string} token
 * @returns {Promise<any[]>}
 */
/**
 * @param {string} token
 * @returns {Promise<any[]>}
 */
async function getMySubscriptions(token) {
  const items = [];
    /** @type {string|undefined} */
    let pageToken = undefined;
    do {
      const resp = await withRetry(() => apiFetch('/subscriptions', {
        token,
        params: { part: 'snippet', mine: true, maxResults: 50, pageToken }
      }));
      items.push(...(resp.items || []));
      pageToken = resp.nextPageToken;
    } while (pageToken);
  return items;
}

/**
 * @param {string} token
 * @param {string} playlistId
 * @returns {Promise<any[]>}
 */
/**
 * @param {string} token
 * @param {string} playlistId
 * @returns {Promise<any[]>}
 */
async function listPlaylistItems(token, playlistId) {
  /** @type {string|undefined} */
  let pageToken = undefined;
  const results = [];
  do {
    const resp = await withRetry(() => apiFetch('/playlistItems', {
      token,
      params: { part: 'snippet,contentDetails', playlistId, maxResults: 50, pageToken }
    }));
    for (const it of (resp.items || [])) {
      results.push({
        playlistItemId: it.id,
        videoId: it.contentDetails?.videoId,
        position: it.snippet?.position ?? 0,
      });
    }
    pageToken = resp.nextPageToken;
  } while (pageToken);
  return results;
}

/**
 * @param {string} token
 * @param {string} title
 * @returns {Promise<any|null>}
 */
async function findMyPlaylistByTitle(token, title) {
  /** @type {string|undefined} */
  let pageToken = undefined;
  do {
    const resp = await withRetry(() => apiFetch('/playlists', {
      token,
      params: { part: 'snippet', mine: true, maxResults: 50, pageToken }
    }));
    for (const it of (resp.items || [])) {
      if (it?.snippet?.title === title) {
        return it;
      }
    }
    pageToken = resp.nextPageToken;
  } while (pageToken);
  return null;
}

/**
 * @param {string} token
 * @param {string} uploadsPlaylistId
 * @param {number} limit
 * @returns {Promise<string[]>}
 */
async function fetchRecentVideos(token, uploadsPlaylistId, limit) {
  const pl = await withRetry(() => apiFetch('/playlistItems', {
    token,
    params: { part: 'contentDetails', playlistId: uploadsPlaylistId, maxResults: 50 }
  }));
  const orderedIds = (pl.items || []).map((/** @type {{contentDetails?: {videoId?: string}}} */i) => i.contentDetails?.videoId).filter(Boolean);
  if (!orderedIds.length) {
return [];
}
  return orderedIds.slice(0, Math.max(0, Math.min(limit, 50)));
}

/**
 * @param {string} token
 * @param {string} uploadsPlaylistId
 * @returns {Promise<{videoId: string, publishedAt: string|null}|null>}
 */
async function fetchLatestVideo(token, uploadsPlaylistId) {
  const pl = await withRetry(() => apiFetch('/playlistItems', {
    token,
    params: { part: 'contentDetails', playlistId: uploadsPlaylistId, maxResults: 1 }
  }));
  const it = pl.items?.[0];
  if (!it) {
return null;
}
  const vid = it.contentDetails?.videoId;
  const publishedAt = it.contentDetails?.videoPublishedAt || null;
  if (!vid) {
return null;
}
  return { videoId: vid, publishedAt };
}

/**
 * @param {string} token
 * @param {string} playlistId
 * @param {string[]} targetIds
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<number>}
 */
async function reorderPlaylistToMatch(token, playlistId, targetIds, { dryRun } = {}) {
  const items = await listPlaylistItems(token, playlistId);
  const map = new Map(items.map(it => [it.videoId, { id: it.playlistItemId, pos: it.position }]));
  let updated = 0;
  for (let i = 0; i < targetIds.length; i++) {
    const vid = targetIds[i];
    if (!map.has(vid)) {
      continue;
    }
    const item = map.get(vid);
    const id = item && item.id;
    const pos = item && item.pos;
    if (pos !== i) {
      if (dryRun) {
        sendLog(`[DRY-RUN] 並び替え: ${vid} -> pos ${i}`);
      } else {
        await withRetry(() => apiFetch('/playlistItems', {
          token, method: 'PUT',
          params: { part: 'snippet' },
          body: { id, snippet: { playlistId, position: i } }
        }));
      }
      updated++;
    }
  }
  return updated;
}

/**
 * @param {string} token
 * @param {string} playlistId
 * @param {string[]} targetIds
 * @param {{ dryRun?: boolean }} [opts]
 * @returns {Promise<{add: number, del: number}>}
 */
async function syncPlaylistItems(token, playlistId, targetIds, { dryRun } = {}) {
  const items = await listPlaylistItems(token, playlistId);
  const currentIds = items.map(x => x.videoId);
  const idToItem = new Map(items.map(x => [x.videoId, x.playlistItemId]));
  const toAdd = targetIds.filter(v => !currentIds.includes(v));
  const toRemove = currentIds.filter(v => !targetIds.includes(v));

  for (const vid of toAdd) {
    if (dryRun) {
      sendLog(`[DRY-RUN] 追加: ${vid}`);
    } else {
      await withRetry(() => apiFetch('/playlistItems', {
        token, method: 'POST',
        params: { part: 'snippet' },
        body: { snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId: vid } } }
      }));
    }
  }
  for (const vid of toRemove) {
    const pid = idToItem.get(vid);
    if (!pid) {
continue;
}
    if (dryRun) {
      sendLog(`[DRY-RUN] 削除: ${vid} (playlistItemId=${pid})`);
    } else {
      await withRetry(() => apiFetch('/playlistItems', { token, method: 'DELETE', params: { id: pid } }));
    }
  }
  return { add: toAdd.length, del: toRemove.length };
}

/**
 * @param {string} token
 * @param {string} channelId
 * @param {string} channelTitle
 * @param {{ update: boolean, limit: number, dryRun: boolean }} opts
 */
async function createOrUpdateForChannel(token, channelId, channelTitle, { update, limit, dryRun }) {
  const ch = await withRetry(() => apiFetch('/channels', { token, params: { part: 'contentDetails', id: channelId } }));
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) {
    sendLog(`エラー: チャンネルID ${channelId} が見つかりません。`);
    return;
  }
  const vids = await fetchRecentVideos(token, uploads, limit);
  if (!vids.length) {
    sendLog(`- ${channelTitle}: 直近の動画が見つかりませんでした。`);
    return;
  }
  const title = `${channelTitle} - 最新Movie`;
  if (update) {
    const existing = await findMyPlaylistByTitle(token, title);
    if (existing) {
      const pid = existing.id;
      const { add, del } = await syncPlaylistItems(token, pid, vids, { dryRun });
      const reord = await reorderPlaylistToMatch(token, pid, vids, { dryRun });
      sendLog(`- ${channelTitle}: 更新（追加 ${add} / 削除 ${del} / 並び替え ${reord}）`);
      return;
    }
  }
  const pl = await withRetry(() => apiFetch('/playlists', {
    token, method: dryRun ? 'GET' : 'POST',
    params: dryRun ? { part: 'snippet', mine: true, maxResults: 1 } : { part: 'snippet,status' },
    body: dryRun ? undefined : { snippet: { title, description: `${channelTitle}の直近の動画を集めた再生リストです。` }, status: { privacyStatus: 'private' } }
  }));
  if (dryRun) {
    sendLog(`[DRY-RUN] 再生リスト作成: '${title}'（${vids.length}件を追加予定）`);
  } else {
    const newPid = pl.id;
    for (const vid of vids) {
      await withRetry(() => apiFetch('/playlistItems', {
        token, method: 'POST', params: { part: 'snippet' },
        body: { snippet: { playlistId: newPid, resourceId: { kind: 'youtube#video', videoId: vid } } }
      }));
    }
    sendLog(`  -> 再生リスト '${title}' を作成しました。`);
  }
}

/**
 * @param {string} token
 * @param {Array<{videoId: string, publishedAt: string|null}>} latestItems
 * @param {{ title?: string, dryRun?: boolean, update?: boolean }} [opts]
 */
async function createOrUpdateAggregatePlaylist(token, latestItems, { title = '登録チャンネル - 最新', dryRun = false, update = true } = {}) {
  // latestItems: Array<{ videoId, publishedAt }>
  if (!latestItems.length) {
    sendLog('集約用: 追加対象の最新動画がありません。');
    return;
  }
  // sort by publishedAt desc when available
  latestItems.sort((a,b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
  const targetIds = latestItems.map(x => x.videoId);

  if (update) {
    const existing = await findMyPlaylistByTitle(token, title);
    if (existing) {
      const pid = existing.id;
      const { add, del } = await syncPlaylistItems(token, pid, targetIds, { dryRun });
      const reord = await reorderPlaylistToMatch(token, pid, targetIds, { dryRun });
      sendLog(`- 集約: 更新（追加 ${add} / 削除 ${del} / 並び替え ${reord}）`);
      return;
    }
  }
  const pl = await withRetry(() => apiFetch('/playlists', {
    token, method: dryRun ? 'GET' : 'POST',
    params: dryRun ? { part: 'snippet', mine: true, maxResults: 1 } : { part: 'snippet,status' },
    body: dryRun ? undefined : { snippet: { title, description: '登録チャンネルの最新動画を集めた再生リストです。' }, status: { privacyStatus: 'private' } }
  }));
  if (dryRun) {
    sendLog(`[DRY-RUN] 集約再生リスト作成: '${title}'（${targetIds.length}件を追加予定）`);
  } else {
    const newPid = pl.id;
    for (const vid of targetIds) {
      await withRetry(() => apiFetch('/playlistItems', {
        token, method: 'POST', params: { part: 'snippet' },
        body: { snippet: { playlistId: newPid, resourceId: { kind: 'youtube#video', videoId: vid } } }
      }));
    }
    sendLog(`  -> 集約再生リスト '${title}' を作成しました。`);
  }
}

/**
 * @param {{ limit?: number, update?: boolean, dryRun?: boolean }} [opts]
 * @returns {Promise<{message: string}>}
 */
async function runJob({ limit = 10, update = true, dryRun = false } = {}) {
  const token = await getAuthTokenInteractive(true);
  const meSubs = await getMySubscriptions(token);
  sendLog(`登録チャンネルを取得: ${meSubs.length}件`);
  const aggregate = [];
  let processed = 0;
  for (const sub of meSubs) {
    const channelId = sub?.snippet?.resourceId?.channelId;
    const channelTitle = sub?.snippet?.title;
    if (!channelId) {
continue;
}
    await createOrUpdateForChannel(token, channelId, channelTitle, { update, limit, dryRun });
    let first = true;
    do {
      const resp = await withRetry(() => apiFetch('/subscriptions', {
        token,
        params: { part: 'snippet', mine: true, maxResults: 50, pageToken }
      }));
      items.push(...(resp.items || []));
      pageToken = resp.nextPageToken;
      if (!pageToken) break;
      first = false;
    } while (pageToken || first);
      // non-fatal for aggregate
    }
    processed++;
    if (processed % 5 === 0) {
      sendLog(`進捗: ${processed}/${meSubs.length}`);
    }
  }
  // finalize aggregate playlist
  try {
    await createOrUpdateAggregatePlaylist(token, aggregate, { title: '登録チャンネル - 最新', dryRun, update });
  } catch (e) {
  sendLog(`集約プレイリスト作成/更新エラー: ${typeof e === 'object' && e && 'message' in e ? e.message : String(e)}`);
  }
  return { message: 'すべての処理が完了しました。' };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'RUN') {
      try {
  const defaults = await chrome.storage.sync.get(['limit','update','dryRun']);
  const payload = Object.assign({ limit: defaults.limit ?? 10, update: defaults.update ?? true, dryRun: !!(defaults.dryRun) }, msg.payload || {});
        const res = await runJob(payload);
        sendResponse(res);
      } catch (e) {
  sendResponse({ message: `エラー: ${typeof e === 'object' && e && 'message' in e ? e.message : String(e)}` });
      }
      return;
    }
    if (msg?.type === 'SCHEDULE_UPDATE') {
      await scheduleFromSettings();
      sendResponse({ ok: true });
      return;
    }
  let first = true;
  do {
    const resp = await withRetry(() => apiFetch('/playlistItems', {
      token,
      params: { part: 'snippet,contentDetails', playlistId, maxResults: 50, pageToken }
    }));
    for (const it of (resp.items || [])) {
      results.push({
        playlistItemId: it.id,
        videoId: it.contentDetails?.videoId,
        position: it.snippet?.position ?? 0,
      });
    }
    pageToken = resp.nextPageToken;
    if (!pageToken) break;
    first = false;
  } while (pageToken || first);
  sendLog(`起動時実行エラー: ${typeof e === 'object' && e && 'message' in e ? e.message : String(e)}`);
    let first = true;
    do {
      const resp = await withRetry(() => apiFetch('/playlists', {
        token,
        params: { part: 'snippet', mine: true, maxResults: 50, pageToken }
      }));
      for (const it of (resp.items || [])) {
        if (it?.snippet?.title === title) {
          return it;
        }
      }
      pageToken = resp.nextPageToken;
      if (!pageToken) break;
      first = false;
    } while (pageToken || first);
});

async function scheduleFromSettings() {
  const { dailyHour='' } = await chrome.storage.sync.get(['dailyHour']);
  await chrome.alarms.clear('daily-run');
  if (dailyHour === '' || dailyHour === null || dailyHour === undefined) {
    return;
  }
  const h = Number(dailyHour);
  // schedule: first fire at next selected hour in local time, then every 24 hours
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0);
  if (first <= now) {
    first.setDate(first.getDate() + 1);
  }
  const delayMinutes = Math.ceil((first.getTime() - now.getTime()) / 60000);
  await chrome.alarms.create('daily-run', { delayInMinutes: Math.max(1, delayMinutes), periodInMinutes: 24*60 });
  sendLog(`毎日スケジュール設定: ${h}時（初回まで約${delayMinutes}分）`);
}
