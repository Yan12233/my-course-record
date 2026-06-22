/**
 * WebDAV 云同步
 *
 * 浏览器因 CORS 限制不能直接请求坚果云等 WebDAV 服务。
 * 通过 Netlify Function 同域代理（/.netlify/functions/webdav-proxy），
 * 部署后自动可用，无需额外配置。
 *
 * 代理协议（对前端透明）：
 *   前端 → POST /.netlify/functions/webdav-proxy
 *   Headers 中携带目标 URL 和原始方法
 *   后端转发到坚果云，返回结果
 */

const STORAGE_KEY_SYNC_CONFIG = 'cloud_sync_config_v1';
const STORAGE_KEY_SYNC_STATUS = 'cloud_sync_status_v1';
const REMOTE_FILE_NAME = 'my-course-record-backup.json';

let localforage = null;

async function getStore() {
  if (!localforage) {
    localforage = (await import('localforage')).default;
    localforage.config({
      name: 'MyCourseRecordH5',
      storeName: 'cloud_sync',
      description: '云同步配置与状态',
    });
  }
  return localforage;
}

/**
 * 保存同步配置
 */
export async function saveSyncConfig(config) {
  const store = await getStore();
  const safe = {
    serverUrl: String(config.serverUrl || '').trim(),
    username: String(config.username || '').trim(),
    password: String(config.password || '').trim(),
    enabled: !!config.enabled,
  };
  await store.setItem(STORAGE_KEY_SYNC_CONFIG, safe);
  return safe;
}

/**
 * 读取同步配置
 */
export async function loadSyncConfig() {
  const store = await getStore();
  const val = await store.getItem(STORAGE_KEY_SYNC_CONFIG);
  if (val && typeof val === 'object') {
    return {
      serverUrl: String(val.serverUrl || '').trim(),
      username: String(val.username || '').trim(),
      password: String(val.password || '').trim(),
      enabled: !!val.enabled,
    };
  }
  return { serverUrl: '', username: '', password: '', enabled: false };
}

/**
 * 保存同步状态
 */
export async function saveSyncStatus(status) {
  const store = await getStore();
  await store.setItem(STORAGE_KEY_SYNC_STATUS, {
    lastSyncAt: status.lastSyncAt || Date.now(),
    lastSyncOk: !!status.lastSyncOk,
    lastSyncMessage: String(status.lastSyncMessage || ''),
  });
}

/**
 * 读取同步状态
 */
export async function loadSyncStatus() {
  const store = await getStore();
  const val = await store.getItem(STORAGE_KEY_SYNC_STATUS);
  if (val && typeof val === 'object') {
    return {
      lastSyncAt: val.lastSyncAt || 0,
      lastSyncOk: !!val.lastSyncOk,
      lastSyncMessage: String(val.lastSyncMessage || ''),
    };
  }
  return { lastSyncAt: 0, lastSyncOk: false, lastSyncMessage: '' };
}

/* ───── 认证 ───── */

function authHeader(username, password) {
  const token = btoa(`${username}:${password}`);
  return `Basic ${token}`;
}

function getFileUrl(serverUrl) {
  const base = String(serverUrl || '').replace(/\/+$/, '');
  return `${base}/${REMOTE_FILE_NAME}`;
}

/* ───── 核心：通过 Netlify Function 代理 WebDAV 请求 ───── */

/** Netlify Function 地址（同域，无 CORS 问题） */
function getProxyBase() {
  const origin = window.location.origin;
  return `${origin}/.netlify/functions/webdav-proxy`;
}

/**
 * 通过 Netlify Function 发送 WebDAV 请求
 * 前端 POST 给同域 Function，Function 转发到真实 WebDAV
 */
async function proxyWebDAV(targetUrl, method, username, password, body) {
  const proxyUrl = getProxyBase();

  const headers = {
    'X-Target-URL': targetUrl,
    'X-HTTP-Method': method,
    'Authorization': authHeader(username, password),
  };

  const fetchOpts = { method: 'POST', headers };
  if (body != null) {
    headers['Content-Type'] = 'application/json;charset=utf-8';
    fetchOpts.body = body;
  }

  const res = await fetch(proxyUrl, fetchOpts);

  if (res.status === 401 || res.status === 403) {
    throw new Error('认证失败，请检查账号和密码');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} 返回 ${res.status}${text ? ': ' + text.slice(0, 200) : ''}`);
  }
  return res;
}

/* ───── 连接测试 ───── */

export async function testWebDAVConnection(serverUrl, username, password) {
  if (!serverUrl || !username || !password) {
    return { ok: false, message: '请填写完整的服务器地址、账号和密码' };
  }

  try {
    const dirUrl = String(serverUrl || '').replace(/\/+$/, '') + '/';
    await proxyWebDAV(dirUrl, 'PROPFIND', username, password);
    return { ok: true, message: '连接成功 ✓' };
  } catch (err) {
    const msg = err && err.message ? err.message : '网络错误';
    return { ok: false, message: `连接失败：${msg}` };
  }
}

/* ───── 下载 ───── */

async function downloadFromWebDAV(serverUrl, username, password) {
  const fileUrl = getFileUrl(serverUrl);
  const res = await proxyWebDAV(fileUrl, 'GET', username, password);
  if (res.status === 404) return null;
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error('远程数据格式错误'); }
}

/* ───── 上传 ───── */

async function uploadToWebDAV(serverUrl, username, password, data) {
  const fileUrl = getFileUrl(serverUrl);
  const json = JSON.stringify(data, null, 2);
  await proxyWebDAV(fileUrl, 'PUT', username, password, json);
  return true;
}

/* ───── 同步 ───── */

export async function syncRecords(serverUrl, username, password, localRecords) {
  if (!serverUrl || !username || !password) {
    return { ok: false, message: '请先配置同步设置', records: localRecords };
  }

  try {
    let remoteRecords = [];
    let isFirstSync = false;
    try {
      const remote = await downloadFromWebDAV(serverUrl, username, password);
      if (remote && Array.isArray(remote)) {
        remoteRecords = remote;
      } else {
        isFirstSync = true;
      }
    } catch (downloadErr) {
      if (!localRecords.length) {
        const msg = `首次同步失败：${downloadErr.message}`;
        await saveSyncStatus({ lastSyncAt: Date.now(), lastSyncOk: false, lastSyncMessage: msg });
        return { ok: false, message: msg, records: localRecords };
      }
      await uploadToWebDAV(serverUrl, username, password, localRecords);
      await saveSyncStatus({ lastSyncAt: Date.now(), lastSyncOk: true, lastSyncMessage: '已上传本地数据' });
      return { ok: true, message: '已上传本地数据', records: localRecords };
    }

    const merged = new Map();
    for (const r of localRecords) {
      if (r && r.id) merged.set(r.id, { ...r });
    }
    let mergeCount = 0;
    for (const r of remoteRecords) {
      if (r && r.id) {
        const existing = merged.get(r.id);
        if (!existing) {
          merged.set(r.id, { ...r });
          mergeCount++;
        } else if ((r.updatedAt || 0) > (existing.updatedAt || 0)) {
          merged.set(r.id, { ...r });
          mergeCount++;
        }
      }
    }

    const mergedRecords = Array.from(merged.values());
    await uploadToWebDAV(serverUrl, username, password, mergedRecords);

    const msg = isFirstSync
      ? `首次同步完成，已上传 ${mergedRecords.length} 条记录`
      : `同步完成，合并 ${mergeCount} 条更新，共 ${mergedRecords.length} 条记录`;

    await saveSyncStatus({ lastSyncAt: Date.now(), lastSyncOk: true, lastSyncMessage: msg });
    return { ok: true, message: msg, records: mergedRecords };
  } catch (err) {
    const msg = `同步失败：${err && err.message ? err.message : '未知错误'}`;
    await saveSyncStatus({ lastSyncAt: Date.now(), lastSyncOk: false, lastSyncMessage: msg });
    return { ok: false, message: msg, records: localRecords };
  }
}
