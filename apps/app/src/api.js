const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3010/api'

function buildQuery(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    const error = new Error(`无法连接后端服务，请确认后端已启动（${BASE}）`)
    error.isNetwork = true
    throw error
  }

  let payload = null
  try {
    payload = await response.json()
  } catch (cause) {
    payload = null
  }

  if (!response.ok || !payload || payload.ok === false) {
    const error = new Error((payload && payload.error) || '请求失败')
    error.status = response.status
    throw error
  }

  return payload.data
}

export const api = {
  getCategories: () => request('/categories'),
  createCategory: (body) => request('/categories', { method: 'POST', body }),
  updateCategory: (id, body) =>
    request(`/categories/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteCategory: (id) =>
    request(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getRecords: (params = {}) => request(`/records${buildQuery(params)}`),
  createRecord: (body) => request('/records', { method: 'POST', body }),
  updateRecord: (id, body) =>
    request(`/records/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteRecord: (id) =>
    request(`/records/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getSummary: (month) => request(`/stats/summary${buildQuery({ month })}`),
  getByCategory: (month) => request(`/stats/by-category${buildQuery({ month })}`),
  getDaily: (month) => request(`/stats/daily${buildQuery({ month })}`),
  getMonthly: (endMonth, months = 6) =>
    request(`/stats/monthly${buildQuery({ endMonth, months })}`),
}
