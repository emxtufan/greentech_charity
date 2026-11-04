import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { requireAdmin } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const AUDIT_FILE = path.join(DATA_DIR, 'audit.log')

const RETENTION_DAYS = 180
const RETENTION_CHECK_MS = 24 * 60 * 60 * 1000

const TYPES = ['auth', 'content', 'upload', 'message', 'f230', 'system']
const LEVELS = ['info', 'warn', 'error']

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 1000

// în jurnal nu intră niciodată date personale sau secrete
const FORBIDDEN_META_KEYS = ['cnp', 'message', 'content', 'password', 'token', 'signature']

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const sanitizeMeta = (meta) => {
  if (!isPlainObject(meta)) return {}

  const cleaned = {}

  Object.entries(meta).forEach(([key, value]) => {
    if (FORBIDDEN_META_KEYS.includes(key.toLowerCase())) return
    cleaned[key] = value
  })

  return cleaned
}

// IPv4: ultimul octet devine 0 (192.168.1.0); IPv6: primele 3 grupuri + '::'
export function maskIp(ip) {
  const value = typeof ip === 'string' ? ip.trim() : ''
  if (!value) return ''

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value)
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.0`

  if (value.includes(':')) {
    // elimină eventuala zonă (ex. fe80::1%eth0) și grupurile goale
    const groups = value.split('%')[0].split(':').filter(Boolean)
    return `${groups.slice(0, 3).join(':')}::`
  }

  return ''
}

export function logEvent(type, message, meta = {}) {
  try {
    const safeMeta = sanitizeMeta(meta)
    const safeType = TYPES.includes(type) ? type : 'system'
    const level = LEVELS.includes(safeMeta.level) ? safeMeta.level : 'info'

    const event = {
      id: randomUUID(),
      ts: new Date().toISOString(),
      type: safeType,
      level,
      message: typeof message === 'string' ? message : String(message ?? ''),
      meta: safeMeta,
    }

    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.appendFileSync(AUDIT_FILE, `${JSON.stringify(event)}\n`, 'utf8')

    return event
  } catch (err) {
    // jurnalul nu trebuie să blocheze niciodată cererea care l-a generat
    console.warn('[audit] Evenimentul nu a putut fi scris:', err.message)
    return null
  }
}

const readEventsFile = () => {
  if (!fs.existsSync(AUDIT_FILE)) return []

  try {
    return fs
      .readFileSync(AUDIT_FILE, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter((event) => isPlainObject(event))
  } catch {
    return []
  }
}

export function readEvents({ type, q, limit = DEFAULT_LIMIT } = {}) {
  const needle = typeof q === 'string' ? q.trim().toLowerCase() : ''
  const parsedLimit = Number.parseInt(limit, 10)
  const max = Number.isNaN(parsedLimit)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)

  return readEventsFile()
    .filter((event) => !type || event.type === type)
    .filter((event) => !needle || String(event.message || '').toLowerCase().includes(needle))
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, max)
}

const prune = () => {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return

    const events = readEventsFile()
    if (events.length === 0) return

    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    const kept = events.filter((event) => {
      const time = new Date(event.ts).getTime()
      return Number.isNaN(time) || time >= cutoff
    })

    if (kept.length === events.length) return

    const tmpFile = `${AUDIT_FILE}.tmp`
    fs.writeFileSync(tmpFile, kept.map((event) => `${JSON.stringify(event)}\n`).join(''), 'utf8')
    fs.renameSync(tmpFile, AUDIT_FILE)
  } catch (err) {
    console.warn('[audit] Curățarea evenimentelor vechi a eșuat:', err.message)
  }
}

const handleListEvents = (req, res, next) => {
  try {
    const type =
      typeof req.query.type === 'string' && TYPES.includes(req.query.type) ? req.query.type : ''
    const q = typeof req.query.q === 'string' ? req.query.q : ''

    return res.json({ items: readEvents({ type, q, limit: req.query.limit }), types: [...TYPES] })
  } catch (err) {
    return next(err)
  }
}

export function registerAuditRoutes(app) {
  app.get('/api/admin/logs', requireAdmin, handleListEvents)

  fs.mkdirSync(DATA_DIR, { recursive: true })
  prune()
  setInterval(prune, RETENTION_CHECK_MS).unref()
}
