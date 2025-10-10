const SCOPES = [
  'https://www.googleapis.com/auth/youtube'
];
const API_BASE = 'https://www.googleapis.com/youtube/v3';

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

async function apiFetch(path, { method='GET', params={}, body, token }) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
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
    throw new Error(`API ${method} ${url.pathname}: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

async function withRetry(fn, maxAttempts = 3, baseDelayMs = 1000) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      if (attempt >= maxAttempts) throw e;
      const delay = baseDelayMs * Math.pow(2, attempt-1) + Math.random()*250;
      sendLog(`一時的なエラーのため再試行します（${attempt}/${maxAttempts-1}）: ${e.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function durationToSeconds(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return 0;
  const h = parseInt(m[1] || '0',10);
  const min = parseInt(m[2] || '0',10);
  const s = parseInt(m[3] || '0',10);
  return h*3600 + min*60 + s;
}

async function getMySubscriptions(token) {
  const items = [];
  let pageToken;
  while (true) {
    const resp = await withRetry(() => apiFetch('/subscriptions', {
      token,
      params: { part: 'snippet', mine: true, maxResults: 50, pageToken }
    }));
    items.push(...(resp.items || []));
    pageToken = resp.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

async function listPlaylistItems(token, playlistId) {
  const results = [];
  let pageToken;
  while (true) {
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
  }
  return results;
}

async function findMyPlaylistByTitle(token, title) {
  let pageToken;
  while (true) {
    const resp = await withRetry(() => apiFetch('/playlists', {
      token,
      params: { part: 'snippet', mine: true, maxResults: 50, pageToken }
    }));
    for (const it of (resp.items || [])) {
      if (it?.snippet?.title === title) return it;
    }
    pageToken = resp.nextPageToken;
    if (!pageToken) break;
  }
  return null;
}

async function fetchRecentShorts(token, uploadsPlaylistId, limit) {
  const pl = await withRetry(() => apiFetch('/playlistItems', {
    token,
    params: { part: 'contentDetails', playlistId: uploadsPlaylistId, maxResults: 50 }
  }));
  const orderedIds = (pl.items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
  if (!orderedIds.length) return [];
  const videos = await withRetry(() => apiFetch('/videos', {
    token,
    params: { part: 'contentDetails', id: orderedIds.join(',') }
  }));
  const idToDur = new Map((videos.items || []).map(v => [v.id, v.contentDetails?.duration]));
  const out = [];
  for (const vid of orderedIds) {
    const d = idToDur.get(vid);
    if (d && durationToSeconds(d) <= 61) out.push(vid);
    if (out.length >= limit) break;
  }
  return out;
}

async function reorderPlaylistToMatch(token, playlistId, targetIds) {
  const items = await listPlaylistItems(token, playlistId);
  const map = new Map(items.map(it => [it.videoId, { id: it.playlistItemId, pos: it.position }]));
  let updated = 0;
  for (let i = 0; i < targetIds.length; i++) {
    const vid = targetIds[i];
    if (!map.has(vid)) continue;
    const { id, pos } = map.get(vid);
    if (pos !== i) {
      await withRetry(() => apiFetch('/playlistItems', {
        token, method: 'PUT',
        params: { part: 'snippet' },
        body: { id, snippet: { playlistId, position: i } }
      }));
      updated++;
    }
  }
  return updated;
}

async function syncPlaylistItems(token, playlistId, targetIds) {
  const items = await listPlaylistItems(token, playlistId);
  const currentIds = items.map(x => x.videoId);
  const idToItem = new Map(items.map(x => [x.videoId, x.playlistItemId]));
  const toAdd = targetIds.filter(v => !currentIds.includes(v));
  const toRemove = currentIds.filter(v => !targetIds.includes(v));

  for (const vid of toAdd) {
    await withRetry(() => apiFetch('/playlistItems', {
      token, method: 'POST',
      params: { part: 'snippet' },
      body: { snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId: vid } } }
    }));
  }
  for (const vid of toRemove) {
    const pid = idToItem.get(vid);
    if (!pid) continue;
    await withRetry(() => apiFetch('/playlistItems', { token, method: 'DELETE', params: { id: pid } }));
  }
  return { add: toAdd.length, del: toRemove.length };
}

async function createOrUpdateForChannel(token, channelId, channelTitle, { update, limit }) {
  const ch = await withRetry(() => apiFetch('/channels', { token, params: { part: 'contentDetails', id: channelId } }));
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) {
    sendLog(`エラー: チャンネルID ${channelId} が見つかりません。`);
    return;
  }
  const shorts = await fetchRecentShorts(token, uploads, limit);
  if (!shorts.length) {
    sendLog(`- ${channelTitle}: 直近のShorts動画が見つかりませんでした。`);
    return;
  }
  const title = `${channelTitle} - 最新Shorts`;
  if (update) {
    const existing = await findMyPlaylistByTitle(token, title);
    if (existing) {
      const pid = existing.id;
      const { add, del } = await syncPlaylistItems(token, pid, shorts);
      const reord = await reorderPlaylistToMatch(token, pid, shorts);
      sendLog(`- ${channelTitle}: 更新（追加 ${add} / 削除 ${del} / 並び替え ${reord}）`);
      return;
    }
  }
  const pl = await withRetry(() => apiFetch('/playlists', {
    token, method: 'POST',
    params: { part: 'snippet,status' },
    body: { snippet: { title, description: `${channelTitle}の直近のShorts動画を集めた再生リストです。` }, status: { privacyStatus: 'private' } }
  }));
  const newPid = pl.id;
  for (const vid of shorts) {
    await withRetry(() => apiFetch('/playlistItems', {
      token, method: 'POST', params: { part: 'snippet' },
      body: { snippet: { playlistId: newPid, resourceId: { kind: 'youtube#video', videoId: vid } } }
    }));
  }
  sendLog(`  -> 再生リスト '${title}' を作成しました。`);
}

async function runJob({ limit = 10, update = true } = {}) {
  const token = await getAuthTokenInteractive(true);
  const meSubs = await getMySubscriptions(token);
  sendLog(`登録チャンネルを取得: ${meSubs.length}件`);
  for (const sub of meSubs) {
    const channelId = sub?.snippet?.resourceId?.channelId;
    const channelTitle = sub?.snippet?.title;
    if (!channelId) continue;
    await createOrUpdateForChannel(token, channelId, channelTitle, { update, limit });
  }
  return { message: 'すべての処理が完了しました。' };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'RUN') {
      try {
        const defaults = await chrome.storage.sync.get(['limit','update']);
        const payload = Object.assign({ limit: defaults.limit ?? 10, update: defaults.update ?? true }, msg.payload || {});
        const res = await runJob(payload);
        sendResponse(res);
      } catch (e) {
        sendResponse({ message: `エラー: ${e?.message || e}` });
      }
      return;
    }
  })();
  return true; // async
});
