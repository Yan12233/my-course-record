/**
 * WebDAV CORS 代理 — Netlify Function
 *
 * 部署后自动在 /.netlify/functions/webdav-proxy 可用。
 * 浏览器 → Netlify Function（同域，无 CORS）→ 坚果云 WebDAV
 *
 * 协议：
 *   POST /.netlify/functions/webdav-proxy
 *   Headers:
 *     X-Target-URL:  真实的 WebDAV URL（含路径）
 *     X-HTTP-Method: 真实的 HTTP 方法 (GET/PUT/PROPFIND)
 *     Authorization:  Basic xxx
 *   Body: PUT 时为 JSON 数据
 */

exports.handler = async (event) => {
  // OPTIONS 预检
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(event), body: JSON.stringify({ error: '仅支持 POST' }) };
  }

  const targetUrl = event.headers['x-target-url'];
  const httpMethod = event.headers['x-http-method'] || 'GET';
  const auth = event.headers['authorization'];

  if (!targetUrl) {
    return { statusCode: 400, headers: corsHeaders(event), body: JSON.stringify({ error: '缺少 X-Target-URL' }) };
  }

  const forwardHeaders = {
    Authorization: auth || '',
    'User-Agent': 'NetlifyFunction-WebDAVProxy/1.0',
  };

  const contentType = event.headers['content-type'];
  if (contentType) forwardHeaders['Content-Type'] = contentType;

  // PROPFIND 需要 Depth 头
  const depth = event.headers['x-webdav-depth'];
  if (depth) forwardHeaders['Depth'] = depth;

  try {
    const response = await fetch(targetUrl, {
      method: httpMethod,
      headers: forwardHeaders,
      body: (httpMethod === 'PUT' || httpMethod === 'PROPFIND') ? event.body : undefined,
    });

    const responseBody = await response.text();

    const headers = corsHeaders(event);
    headers['Content-Type'] = response.headers.get('content-type') || 'application/octet-stream';

    return {
      statusCode: response.status,
      headers,
      body: responseBody,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders(event),
      body: JSON.stringify({ error: `代理请求失败：${err.message}` }),
    };
  }
};

function corsHeaders(event) {
  const origin = event.headers['origin'] || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, POST, PROPFIND, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Target-URL, X-HTTP-Method, X-WebDAV-Depth',
    'Access-Control-Max-Age': '86400',
  };
}
