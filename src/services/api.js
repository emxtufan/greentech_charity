export const API_URL = import.meta.env.VITE_API_URL || ''

const TOKEN_KEY = 'wc_token'

const buildHeaders = (headers = {}) => {
  const token = localStorage.getItem(TOKEN_KEY)
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }
}

export async function request(path, { method = 'GET', body, headers } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: buildHeaders(headers),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error((data && data.message) || `HTTP ${response.status}`)
  }

  return data
}

const get = (path, options) => request(path, { ...options, method: 'GET' })

const post = (path, body, options) => request(path, { ...options, method: 'POST', body })

const put = (path, body, options) => request(path, { ...options, method: 'PUT', body })

const del = (path, options) => request(path, { ...options, method: 'DELETE' })

export default { get, post, put, del }
