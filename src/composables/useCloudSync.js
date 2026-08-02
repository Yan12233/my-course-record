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

/* ───── 扩展同步范围：新增模块的 localforage Key ───── */
const STORAGE_KEY_SCHEDULE = 'schedule_v1';
const STORAGE_KEY_ATTENDANCE = 'attendance_v1';
const STORAGE_KEY_HOUR_ACCOUNTS = 'student_hour_accounts_v1';
const STORAGE_KEY_RESOURCE_INDEX = 'resource_index_v1';

/** 需要同步的全部 localforage Key 及其远程 JSON 字段名 */
const SYNC_KEYS = [
  { storageKey: 'course_records_v1', remoteField: 'records' },
  { storageKey: STORAGE_KEY_SCHEDULE, remoteField: 'schedule' },
  { storageKey: STORAGE_KEY_ATTENDANCE, remoteField: 'attendance' },
  { storageKey: STORAGE_KEY_HOUR_ACCOUNTS, remoteField: 'hourAccounts' },
  { storageKey: STORAGE_KEY_RESOURCE_INDEX, remoteField: 'resources' },
];

let localforage = null;
let dataForage = null;

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
 * 获取业务数据存储实例（lesson_records object store）
 * 与 useDatabase.js 使用相同的 name/storeName，确保读取同一份数据。
 * 使用 createInstance 避免与 sync config store 互相干扰。
 */
async function getDataStore() {
  if (!dataForage) {
    const lf = (await import('localforage')).default;
    dataForage = lf.createInstance({
      name: 'MyCourseRecordH5',
      storeName: 'lesson_records',
      description: '上课记录（时间与课程及图片）',
    });
  }
  return dataForage;
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

  // PROPFIND 需要 Depth 头和 XML body
  if (method === 'PROPFIND') {
    headers['X-WebDAV-Depth'] = '0';
    headers['Content-Type'] = 'application/xml;charset=utf-8';
    fetchOpts.body = '<?xml version="1.0"?><D:propfind xmlns:D="DAV:"><D:allprop/></D:propfind>';
  } else if (body != null) {
    headers['Content-Type'] = 'application/json;charset=utf-8';
    fetchOpts.body = body;
  }

  const res = await fetch(proxyUrl, fetchOpts);

  if (res.status === 401 || res.status === 403) {
    throw new Error('认证失败，请检查账号和密码');
  }
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    const detail = text ? text.slice(0, 300) : '';
    throw new Error(`${method} 返回 ${res.status}${detail ? ': ' + detail : ''}`);
  }
  return res;
}

/* ───── 连接测试 ───── */

/**
 * 测试 WebDAV 连接
 * 尝试 GET 备份文件：
 *   - 200 → 文件存在，连接正常
 *   - 404 → 文件不存在但服务器可达（首次同步），连接正常
 *   - 401/403 → 认证失败
 *   - 其他 → 连接异常
 */
export async function testWebDAVConnection(serverUrl, username, password) {
  if (!serverUrl || !username || !password) {
    return { ok: false, message: '请填写完整的服务器地址、账号和密码' };
  }

  try {
    const fileUrl = getFileUrl(serverUrl);
    const res = await proxyWebDAV(fileUrl, 'GET', username, password);
    // 200=文件存在, 404=文件还未创建(第一次同步)
    if (res.status === 200 || res.status === 404) {
      return { ok: true, message: '连接成功 ✓' };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: '认证失败，请检查账号和密码' };
    }
    return { ok: false, message: `服务器返回 ${res.status}` };
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

/**
 * 去除记录中的大字段（图片等），只同步文本数据
 */
function stripLargeFields(record) {
  if (!record || typeof record !== 'object') return record;
  const clone = { ...record };
  delete clone.imageBase64;
  delete clone.imageFileName;
  delete clone.imageMimeType;
  return clone;
}

/**
 * 将记录列表中的大字段去除，只保留文本数据用于同步
 */
function stripRecordsForSync(records) {
  if (!Array.isArray(records)) return [];
  return records.map(r => stripLargeFields(r));
}

/**
 * 按 ID 合并两个数组，以 updatedAt 时间戳判断新旧。
 * @param {Array} localArr - 本地数组
 * @param {Array} remoteArr - 远程数组
 * @returns {{ merged: Array, mergeCount: number }}
 */
function mergeById(localArr, remoteArr) {
  const local = Array.isArray(localArr) ? localArr : [];
  const remote = Array.isArray(remoteArr) ? remoteArr : [];
  const map = new Map();
  for (const r of local) {
    if (r && r.id) map.set(r.id, { ...r });
  }
  let mergeCount = 0;
  for (const r of remote) {
    if (r && r.id) {
      const existing = map.get(r.id);
      if (!existing) {
        map.set(r.id, { ...r });
        mergeCount++;
      } else if ((r.updatedAt || 0) > (existing.updatedAt || 0)) {
        map.set(r.id, { ...existing, ...r });
        mergeCount++;
      }
    }
  }
  return { merged: Array.from(map.values()), mergeCount };
}

/**
 * 从 localforage 读取所有需同步的数据
 * @returns {Promise<object>} { records, schedule, attendance, hourAccounts, resources }
 */
async function readAllLocalData(localRecords) {
  const store = await getDataStore();
  const schedule = await store.getItem(STORAGE_KEY_SCHEDULE).catch(() => []) || [];
  const attendance = await store.getItem(STORAGE_KEY_ATTENDANCE).catch(() => []) || [];
  const hourAccounts = await store.getItem(STORAGE_KEY_HOUR_ACCOUNTS).catch(() => []) || [];
  const resources = await store.getItem(STORAGE_KEY_RESOURCE_INDEX).catch(() => []) || [];
  return {
    records: localRecords || [],
    schedule: Array.isArray(schedule) ? schedule : [],
    attendance: Array.isArray(attendance) ? attendance : [],
    hourAccounts: Array.isArray(hourAccounts) ? hourAccounts : [],
    resources: Array.isArray(resources) ? resources : [],
  };
}

/**
 * 将合并后的新模块数据写回 localforage
 */
async function writeMergedExtras(merged) {
  const store = await getDataStore();
  if (Array.isArray(merged.schedule)) {
    await store.setItem(STORAGE_KEY_SCHEDULE, merged.schedule).catch(() => {});
  }
  if (Array.isArray(merged.attendance)) {
    await store.setItem(STORAGE_KEY_ATTENDANCE, merged.attendance).catch(() => {});
  }
  if (Array.isArray(merged.hourAccounts)) {
    await store.setItem(STORAGE_KEY_HOUR_ACCOUNTS, merged.hourAccounts).catch(() => {});
  }
  if (Array.isArray(merged.resources)) {
    await store.setItem(STORAGE_KEY_RESOURCE_INDEX, merged.resources).catch(() => {});
  }
}

/* ───── 同步 ───── */

export async function syncRecords(serverUrl, username, password, localRecords) {
  if (!serverUrl || !username || !password) {
    return { ok: false, message: '请先配置同步设置', records: localRecords };
  }

  try {
    // 读取所有需同步的本地数据
    const allLocal = await readAllLocalData(localRecords);

    // 同步前剥离大字段（图片），只上传文本数据
    const strippedLocal = stripRecordsForSync(allLocal.records);

    let remoteData = null;
    let isFirstSync = false;
    try {
      const remote = await downloadFromWebDAV(serverUrl, username, password);
      if (remote && typeof remote === 'object') {
        if (Array.isArray(remote)) {
          // 旧格式：纯数组 → 仅包含 course_records
          remoteData = { records: remote, schedule: [], attendance: [], hourAccounts: [], resources: [] };
        } else {
          // 新格式：结构化对象
          remoteData = {
            records: Array.isArray(remote.records) ? remote.records : [],
            schedule: Array.isArray(remote.schedule) ? remote.schedule : [],
            attendance: Array.isArray(remote.attendance) ? remote.attendance : [],
            hourAccounts: Array.isArray(remote.hourAccounts) ? remote.hourAccounts : [],
            resources: Array.isArray(remote.resources) ? remote.resources : [],
          };
        }
      } else {
        isFirstSync = true;
      }
    } catch (downloadErr) {
      if (!strippedLocal.length && !allLocal.schedule.length && !allLocal.attendance.length) {
        const msg = `首次同步失败：${downloadErr.message}`;
        await saveSyncStatus({ lastSyncAt: Date.now(), lastSyncOk: false, lastSyncMessage: msg });
        return { ok: false, message: msg, records: localRecords };
      }
      // 首次上传：包含所有本地数据
      const uploadPayload = {
        records: strippedLocal,
        schedule: allLocal.schedule,
        attendance: allLocal.attendance,
        hourAccounts: allLocal.hourAccounts,
        resources: allLocal.resources,
      };
      await uploadToWebDAV(serverUrl, username, password, uploadPayload);
      await saveSyncStatus({ lastSyncAt: Date.now(), lastSyncOk: true, lastSyncMessage: '已上传本地数据' });
      return { ok: true, message: '已上传本地数据', records: localRecords };
    }

    // ── 合并 course_records（保留图片字段逻辑）──
    const mergedMap = new Map();
    for (const r of allLocal.records) {
      if (r && r.id) mergedMap.set(r.id, { ...r });
    }
    let recordsMergeCount = 0;
    for (const r of remoteData.records) {
      if (r && r.id) {
        const existing = mergedMap.get(r.id);
        if (!existing) {
          mergedMap.set(r.id, { ...r });
          recordsMergeCount++;
        } else if ((r.updatedAt || 0) > (existing.updatedAt || 0)) {
          const merged = { ...existing, ...r };
          if (existing.imageBase64 && !r.imageBase64) {
            merged.imageBase64 = existing.imageBase64;
            merged.imageFileName = existing.imageFileName;
            merged.imageMimeType = existing.imageMimeType;
          }
          mergedMap.set(r.id, merged);
          recordsMergeCount++;
        }
      }
    }
    const mergedRecords = Array.from(mergedMap.values());

    // ── 合并新模块数据（各 key 独立按 ID 合并）──
    const scheduleMerge = mergeById(allLocal.schedule, remoteData.schedule);
    const attendanceMerge = mergeById(allLocal.attendance, remoteData.attendance);
    const hourAccountsMerge = mergeById(allLocal.hourAccounts, remoteData.hourAccounts);
    const resourcesMerge = mergeById(allLocal.resources, remoteData.resources);

    // 将合并后的新模块数据写回 localforage
    const mergedExtras = {
      schedule: scheduleMerge.merged,
      attendance: attendanceMerge.merged,
      hourAccounts: hourAccountsMerge.merged,
      resources: resourcesMerge.merged,
    };
    await writeMergedExtras(mergedExtras);

    // 上传文本版本到云端（结构化对象）
    const strippedMerged = stripRecordsForSync(mergedRecords);
    const uploadPayload = {
      records: strippedMerged,
      schedule: mergedExtras.schedule,
      attendance: mergedExtras.attendance,
      hourAccounts: mergedExtras.hourAccounts,
      resources: mergedExtras.resources,
    };
    await uploadToWebDAV(serverUrl, username, password, uploadPayload);

    const totalMergeCount = recordsMergeCount + scheduleMerge.mergeCount +
      attendanceMerge.mergeCount + hourAccountsMerge.mergeCount + resourcesMerge.mergeCount;
    const msg = isFirstSync
      ? `首次同步完成，已上传 ${mergedRecords.length} 条记录`
      : `同步完成，合并 ${totalMergeCount} 条更新，共 ${mergedRecords.length} 条记录`;

    await saveSyncStatus({ lastSyncAt: Date.now(), lastSyncOk: true, lastSyncMessage: msg });
    return { ok: true, message: msg, records: mergedRecords };
  } catch (err) {
    const msg = `同步失败：${err && err.message ? err.message : '未知错误'}`;
    await saveSyncStatus({ lastSyncAt: Date.now(), lastSyncOk: false, lastSyncMessage: msg });
    return { ok: false, message: msg, records: localRecords };
  }
}
