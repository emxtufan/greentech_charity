const TOKEN_KEY = 'wc_admin_token'

const parseBody = async (response) => {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error((data && data.message) || `HTTP ${response.status}`)
  }

  return data
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function login(password) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })

  const data = await parseBody(response)

  if (!data || !data.token) {
    throw new Error('Răspuns invalid: lipsește tokenul')
  }

  localStorage.setItem(TOKEN_KEY, data.token)

  return data.token
}

export async function me() {
  const token = getToken()
  if (!token) return false

  const response = await fetch('/api/admin/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 401) return false

  await parseBody(response)

  return true
}

export function logout() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // localStorage indisponibil
  }
}

const adminService = { login, me, logout, getToken }

export default adminService
