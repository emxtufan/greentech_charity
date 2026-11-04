import { API_URL, request } from './api'

const USERS_KEY = 'wc_users'
const TOKEN_KEY = 'wc_token'
const USER_KEY = 'wc_user'
const MOCK_DELAY = 400

const delay = (ms = MOCK_DELAY) => new Promise((resolve) => setTimeout(resolve, ms))

const hashPassword = (password) => btoa(String(password))

const readUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const users = raw ? JSON.parse(raw) : []
    return Array.isArray(users) ? users : []
  } catch {
    return []
  }
}

const writeUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users))

const toPublicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
})

const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase()

const saveSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email)

  if (API_URL) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email: normalizedEmail, password },
    })
    const user = data.user
    saveSession(data.token, user)
    return user
  }

  await delay()

  const users = readUsers()
  const found = users.find(
    (user) => user.email === normalizedEmail && user.passwordHash === hashPassword(password)
  )

  if (!found) {
    throw new Error('Email sau parolă greșită')
  }

  const user = toPublicUser(found)
  saveSession(btoa(`${found.id}:${Date.now()}`), user)
  return user
}

export async function register({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email)
  const cleanName = String(name ?? '').trim()

  if (API_URL) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: { name: cleanName, email: normalizedEmail, password },
    })
    const user = data.user
    saveSession(data.token, user)
    return user
  }

  await delay()

  const users = readUsers()

  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error('Email deja înregistrat')
  }

  const newUser = {
    id: Date.now().toString(36),
    name: cleanName,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }

  writeUsers([...users, newUser])

  const user = toPublicUser(newUser)
  saveSession(btoa(`${newUser.id}:${Date.now()}`), user)
  return user
}

export async function logout() {
  clearSession()
}

export async function getCurrentUser() {
  if (API_URL) {
    if (!localStorage.getItem(TOKEN_KEY)) return null
    try {
      return await request('/auth/me', { method: 'GET' })
    } catch {
      clearSession()
      return null
    }
  }

  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

const authService = { login, register, logout, getCurrentUser, getToken }

export default authService
