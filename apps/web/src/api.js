const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3010/api';

export async function request(path, options = {}) {
  const { method = 'GET', body } = options;

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const error = new Error(`无法连接后端服务，请确认后端已启动（${BASE}）`);
    error.isNetwork = true;
    throw error;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.ok === false) {
    const error = new Error((payload && payload.error) || '请求失败');
    error.status = response.status;
    throw error;
  }

  return payload.data;
}

export const apiGet = (path) => request(path);

export const apiPost = (path, body) => request(path, { method: 'POST', body });

export const apiPut = (path, body) => request(path, { method: 'PUT', body });

export const apiDelete = (path) => request(path, { method: 'DELETE' });
