import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { requireAdmin } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json')

const RETENTION_DAYS = 365
const RETENTION_CHECK_MS = 24 * 60 * 60 * 1000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5

const TOPICS = ['situatie', 'companie', 'materiale', 'voluntariat', 'formular230', 'altceva']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+().\-\s]+$/
// păstrează newline-ul (mesajul e afișat cu pre-wrap), elimină restul caracterelor de control
const CONTROL_CHARS_RE = /[\u0000-\u0009\u000B-\u001F\u007F]/g

// ip -> array de timestamp-uri ale mesajelor trimise în ultimele 10 minute
const submissions = new Map()

const getClientIp = (req) => req.ip || req.socket.remoteAddress || 'unknown'

const clean = (value) =>
  typeof value === 'string' ? value.replace(CONTROL_CHARS_RE, '').trim() : ''

const readMessages = () => {
  if (!fs.existsSync(MESSAGES_FILE)) return []

  try {
    const parsed = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeMessagesAtomic = (messages) => {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmpFile = `${MESSAGES_FILE}.tmp`
  fs.writeFileSync(tmpFile, `${JSON.stringify(messages, null, 2)}\n`, 'utf8')
  fs.renameSync(tmpFile, MESSAGES_FILE)
}

const sortNewestFirst = (messages) =>
  [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

const prune = () => {
  try {
    const messages = readMessages()
    if (messages.length === 0) return

    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    const kept = messages.filter((message) => {
      const created = new Date(message.createdAt).getTime()
      return Number.isNaN(created) || created >= cutoff
    })

    if (kept.length !== messages.length) writeMessagesAtomic(kept)
  } catch (err) {
    console.warn('[messages] Curățarea mesajelor vechi a eșuat:', err.message)
  }
}

const validateMessage = (payload) => {
  if (payload.name.length < 2) return 'Te rugăm să scrii un nume.'
  if (payload.name.length > 100) return 'Numele este prea lung.'
  if (!payload.email || payload.email.length > 150 || !EMAIL_RE.test(payload.email)) {
    return 'Adresa de email nu pare corectă.'
  }
  if (payload.phone.length > 30) return 'Numărul de telefon este prea lung.'
  if (payload.phone && !PHONE_RE.test(payload.phone)) return 'Numărul de telefon nu pare corect.'
  if (!TOPICS.includes(payload.topic)) return 'Te rugăm să alegi un subiect.'
  if (payload.message.length < 10) return 'Mesajul este prea scurt.'
  if (payload.message.length > 4000) return 'Mesajul este prea lung.'

  return ''
}

const handleCreateMessage = (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}

    // honeypot: roboții completează câmpul ascuns — răspundem ca și cum ar fi reușit
    if (clean(body.website)) return res.json({ ok: true })

    const ip = getClientIp(req)
    const now = Date.now()
    const recent = (submissions.get(ip) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS)

    if (recent.length >= RATE_LIMIT_MAX) {
      submissions.set(ip, recent)
      return res.status(429).json({
        message: 'Ai trimis deja câteva mesaje. Te rugăm să încerci din nou peste câteva minute.',
      })
    }

    const payload = {
      name: clean(body.name),
      email: clean(body.email),
      phone: clean(body.phone),
      topic: clean(body.topic),
      message: clean(body.message),
      consent: body.consent,
    }

    const error = validateMessage(payload)

    if (error) return res.status(400).json({ message: error })
    if (payload.consent !== true) {
      return res
        .status(400)
        .json({ message: 'Ca să putem trimite mesajul, avem nevoie de acordul tău.' })
    }

    const messages = readMessages()
    messages.push({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      topic: payload.topic,
      message: payload.message,
    })
    writeMessagesAtomic(messages)

    recent.push(now)
    submissions.set(ip, recent)

    return res.status(201).json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

const handleListMessages = (req, res, next) => {
  try {
    return res.json(sortNewestFirst(readMessages()))
  } catch (err) {
    return next(err)
  }
}

const handleDeleteMessage = (req, res, next) => {
  try {
    const messages = readMessages()
    const kept = messages.filter((message) => message.id !== req.params.id)

    if (kept.length === messages.length) {
      return res.status(404).json({ message: 'Mesajul nu a fost găsit.' })
    }

    writeMessagesAtomic(kept)

    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

export function registerMessageRoutes(app) {
  app.post('/api/messages', handleCreateMessage)
  app.get('/api/messages', requireAdmin, handleListMessages)
  app.delete('/api/messages/:id', requireAdmin, handleDeleteMessage)

  fs.mkdirSync(DATA_DIR, { recursive: true })
  prune()
  setInterval(prune, RETENTION_CHECK_MS).unref()
}
