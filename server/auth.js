import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { logEvent, maskIp } from './audit.js'

const TOKEN_TTL = '8h'
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 5

const fallbackSecret = randomBytes(32).toString('hex')
const getJwtSecret = () => process.env.JWT_SECRET || fallbackSecret

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest()

// ip -> array de timestamp-uri ale încercărilor din ultimul minut
const loginAttempts = new Map()

const getClientIp = (req) => req.ip || req.socket.remoteAddress || 'unknown'

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token lipsă' })
  }

  try {
    req.admin = jwt.verify(token, getJwtSecret())
    return next()
  } catch {
    return res.status(401).json({ message: 'Token invalid sau expirat' })
  }
}

export function adminLogin(req, res) {
  const expectedPassword = process.env.ADMIN_PASSWORD

  if (!expectedPassword) {
    return res.status(503).json({ message: 'ADMIN_PASSWORD nu este setat' })
  }

  const ip = getClientIp(req)
  const now = Date.now()
  const recentAttempts = (loginAttempts.get(ip) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS)

  if (recentAttempts.length >= RATE_LIMIT_MAX) {
    loginAttempts.set(ip, recentAttempts)
    logEvent('auth', 'Prea multe încercări de autentificare', { ip: maskIp(ip), level: 'warn' })
    return res.status(429).json({ message: 'Prea multe încercări. Reîncearcă într-un minut.' })
  }

  recentAttempts.push(now)
  loginAttempts.set(ip, recentAttempts)

  const providedPassword = typeof req.body?.password === 'string' ? req.body.password : ''
  const isValid = timingSafeEqual(sha256(providedPassword), sha256(expectedPassword))

  if (!isValid) {
    logEvent('auth', 'Încercare de autentificare eșuată', { ip: maskIp(ip), level: 'warn' })
    return res.status(401).json({ message: 'Parolă greșită' })
  }

  const token = jwt.sign({ role: 'admin' }, getJwtSecret(), { expiresIn: TOKEN_TTL })
  logEvent('auth', 'Autentificare admin reușită', { ip: maskIp(ip) })
  return res.json({ token })
}
