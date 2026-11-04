import fs from 'node:fs'
import path from 'node:path'
import { createCipheriv, createDecipheriv, randomBytes, randomInt, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { requireAdmin } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const FORMS_FILE = path.join(DATA_DIR, 'f230.json')

const ALGORITHM = 'aes-256-gcm'
const KEY_BYTES = 32
const IV_BYTES = 12

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 5

const CODE_PREFIX = 'GT-'
const CODE_LENGTH = 6
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const STATUSES = ['primit', 'depus']

const CNP_KEY = '279146358279'
const NAME_RE = /^[A-Za-zĂÂÎȘȚăâîșțŞşŢţ\s'-]+$/
const POSTAL_CODE_RE = /^\d{6}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+().\-\s]+$/
const SIGNATURE_PREFIX = 'data:image/png;base64,'
const SIGNATURE_MAX_LENGTH = 400000
// elimină caracterele de control; semnătura e base64, restul câmpurilor sunt text simplu
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g

const CSV_SEPARATOR = ';'
const CSV_HEADER = [
  'Cod',
  'Data primirii',
  'Nume',
  'Inițiala tatălui',
  'Prenume',
  'CNP',
  'Stradă',
  'Număr',
  'Bloc',
  'Scara',
  'Etaj',
  'Ap.',
  'Județ/Sector',
  'Localitate',
  'Cod poștal',
  'Telefon',
  'Email',
  'Opțiune 2 ani',
  'Acord transmitere date',
  'Status',
  'Data depunerii',
]

// setată la înregistrarea rutelor (după ce dotenv a încărcat .env-urile)
let encryptionKey = null

// ip -> array de timestamp-uri ale formularelor trimise în ultima oră
const submissions = new Map()

const getClientIp = (req) => req.ip || req.socket.remoteAddress || 'unknown'

const isEnabled = () => encryptionKey !== null

const clean = (value) => (typeof value === 'string' ? value.replace(CONTROL_CHARS_RE, '').trim() : '')

const parseKey = () => {
  const raw = typeof process.env.F230_KEY === 'string' ? process.env.F230_KEY.trim() : ''
  if (!raw) return null

  try {
    const key = Buffer.from(raw, 'base64')
    return key.length === KEY_BYTES ? key : null
  } catch {
    return null
  }
}

const encrypt = (data) => {
  if (!encryptionKey) throw new Error('F230_KEY lipsește')

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv)
  const payload = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()])

  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    payload: payload.toString('base64'),
  }
}

const decrypt = (record) => {
  if (!encryptionKey) throw new Error('F230_KEY lipsește')

  const decipher = createDecipheriv(ALGORITHM, encryptionKey, Buffer.from(record.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(record.payload, 'base64')),
    decipher.final(),
  ]).toString('utf8')

  return JSON.parse(plain)
}

const readForms = () => {
  if (!fs.existsSync(FORMS_FILE)) return []

  try {
    const parsed = JSON.parse(fs.readFileSync(FORMS_FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeFormsAtomic = (forms) => {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmpFile = `${FORMS_FILE}.tmp`
  fs.writeFileSync(tmpFile, `${JSON.stringify(forms, null, 2)}\n`, 'utf8')
  fs.renameSync(tmpFile, FORMS_FILE)
}

const sortNewestFirst = (forms) =>
  [...forms].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

const createCode = (forms) => {
  const used = new Set(forms.map((form) => form.code))

  let code = ''
  do {
    let suffix = ''
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
    }
    code = `${CODE_PREFIX}${suffix}`
  } while (used.has(code))

  return code
}

const isValidCnp = (cnp) => {
  if (!/^\d{13}$/.test(cnp)) return false

  let sum = 0
  for (let i = 0; i < 12; i += 1) {
    sum += Number(cnp[i]) * Number(CNP_KEY[i])
  }

  let control = sum % 11
  if (control === 10) control = 1

  return control === Number(cnp[12])
}

const validateForm = (payload) => {
  const nameError = 'Te rugăm să scrii numele și prenumele corect.'

  if (payload.lastName.length < 1 || payload.lastName.length > 75 || !NAME_RE.test(payload.lastName)) {
    return nameError
  }
  if (payload.firstName.length < 1 || payload.firstName.length > 75 || !NAME_RE.test(payload.firstName)) {
    return nameError
  }
  if (payload.fatherInitial.length > 3) return nameError

  if (!isValidCnp(payload.cnp)) return 'CNP-ul nu pare corect. Te rugăm să îl verifici.'

  const addressError = 'Te rugăm să completezi adresa: strada, numărul, județul și localitatea.'
  if (
    !payload.street ||
    !payload.number ||
    !payload.county ||
    !payload.city ||
    payload.street.length > 100 ||
    payload.number.length > 100 ||
    payload.county.length > 100 ||
    payload.city.length > 100
  ) {
    return addressError
  }

  const extras = [payload.block, payload.staircase, payload.floor, payload.apartment]
  if (extras.some((value) => value.length > 10)) return addressError

  if (payload.postalCode && !POSTAL_CODE_RE.test(payload.postalCode)) {
    return 'Codul poștal are 6 cifre.'
  }

  if (payload.phone.length > 30 || (payload.phone && !PHONE_RE.test(payload.phone))) {
    return 'Numărul de telefon nu pare corect.'
  }

  if (payload.email && (payload.email.length > 150 || !EMAIL_RE.test(payload.email))) {
    return 'Adresa de email nu pare corectă.'
  }

  if (payload.consent !== true) {
    return 'Ca să putem depune formularul, avem nevoie de acordul tău.'
  }

  if (
    payload.signature.length > SIGNATURE_MAX_LENGTH ||
    !payload.signature.startsWith(SIGNATURE_PREFIX)
  ) {
    return 'Te rugăm să semnezi formularul.'
  }

  return ''
}

const handleStatus = (req, res) => res.json({ enabled: isEnabled() })

const handleCreateForm = (req, res, next) => {
  try {
    if (!isEnabled()) {
      return res.status(503).json({ message: 'Formularul online nu este activ încă.' })
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {}

    // honeypot: roboții completează câmpul ascuns — răspundem ca și cum ar fi reușit
    if (clean(body.website)) return res.json({ ok: true })

    const ip = getClientIp(req)
    const now = Date.now()
    const recent = (submissions.get(ip) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS)

    if (recent.length >= RATE_LIMIT_MAX) {
      submissions.set(ip, recent)
      return res.status(429).json({
        message: 'Ai trimis deja mai multe formulare. Încearcă din nou mai târziu.',
      })
    }

    const payload = {
      lastName: clean(body.lastName),
      fatherInitial: clean(body.fatherInitial),
      firstName: clean(body.firstName),
      cnp: clean(body.cnp),
      street: clean(body.street),
      number: clean(body.number),
      block: clean(body.block),
      staircase: clean(body.staircase),
      floor: clean(body.floor),
      apartment: clean(body.apartment),
      county: clean(body.county),
      city: clean(body.city),
      postalCode: clean(body.postalCode),
      phone: clean(body.phone),
      email: clean(body.email),
      twoYears: body.twoYears === true,
      shareData: body.shareData === true,
      consent: body.consent === true,
      signature: clean(body.signature),
    }

    const error = validateForm(payload)

    if (error) return res.status(400).json({ message: error })

    // consimțământul nu se stochează; păstrăm doar momentul acordului
    const data = { ...payload, consentAt: new Date().toISOString() }
    delete data.consent

    const forms = readForms()
    const code = createCode(forms)

    forms.push({
      id: randomUUID(),
      code,
      createdAt: data.consentAt,
      status: 'primit',
      submittedAt: null,
      ...encrypt(data),
    })
    writeFormsAtomic(forms)

    recent.push(now)
    submissions.set(ip, recent)

    return res.status(201).json({ ok: true, code })
  } catch (err) {
    return next(err)
  }
}

const handleListForms = (req, res, next) => {
  try {
    const forms = sortNewestFirst(readForms()).map((form) => {
      const base = {
        id: form.id,
        code: form.code,
        createdAt: form.createdAt,
        status: form.status,
        submittedAt: form.submittedAt ?? null,
      }

      try {
        return { ...base, data: decrypt(form) }
      } catch {
        return { ...base, data: null, error: 'Nu se poate decripta' }
      }
    })

    return res.json(forms)
  } catch (err) {
    return next(err)
  }
}

const handleUpdateStatus = (req, res, next) => {
  try {
    const status = req.body && typeof req.body === 'object' ? req.body.status : undefined

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Status invalid.' })
    }

    const forms = readForms()
    const form = forms.find((item) => item.id === req.params.id)

    if (!form) {
      return res.status(404).json({ message: 'Formularul nu a fost găsit.' })
    }

    form.status = status
    form.submittedAt = status === 'depus' ? new Date().toISOString() : null
    writeFormsAtomic(forms)

    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

const handleDeleteForm = (req, res, next) => {
  try {
    const forms = readForms()
    const kept = forms.filter((form) => form.id !== req.params.id)

    if (kept.length === forms.length) {
      return res.status(404).json({ message: 'Formularul nu a fost găsit.' })
    }

    writeFormsAtomic(kept)

    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value)
  return /["\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const handleExportCsv = (req, res, next) => {
  try {
    const requested = typeof req.query.status === 'string' ? req.query.status : 'toate'
    const filter = requested === 'primit' || requested === 'depus' ? requested : 'toate'

    const forms = sortNewestFirst(readForms()).filter(
      (form) => filter === 'toate' || form.status === filter
    )

    const rows = forms.map((form) => {
      let data = {}

      try {
        data = decrypt(form) || {}
      } catch {
        data = {}
      }

      return [
        form.code,
        form.createdAt,
        data.lastName,
        data.fatherInitial,
        data.firstName,
        // scris ca ="..." ca Excel să păstreze CNP-ul ca text, nu ca număr
        data.cnp ? `="${data.cnp}"` : '',
        data.street,
        data.number,
        data.block,
        data.staircase,
        data.floor,
        data.apartment,
        data.county,
        data.city,
        data.postalCode,
        data.phone,
        data.email,
        data.twoYears ? 'DA' : 'NU',
        data.shareData ? 'DA' : 'NU',
        form.status,
        form.submittedAt,
      ]
    })

    const csv = [CSV_HEADER, ...rows]
      .map((row) => row.map(csvCell).join(CSV_SEPARATOR))
      .join('\r\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="formulare-230.csv"')

    return res.send(`\uFEFF${csv}\r\n`)
  } catch (err) {
    return next(err)
  }
}

export function registerF230Routes(app) {
  encryptionKey = parseKey()

  if (!encryptionKey) {
    console.warn('[server] F230_KEY lipsește sau nu are 32 de bytes — formularul 230 online e dezactivat')
  }

  fs.mkdirSync(DATA_DIR, { recursive: true })

  app.get('/api/f230/status', handleStatus)
  app.get('/api/f230/export.csv', requireAdmin, handleExportCsv)
  app.post('/api/f230', handleCreateForm)
  app.get('/api/f230', requireAdmin, handleListForms)
  app.patch('/api/f230/:id', requireAdmin, handleUpdateStatus)
  app.delete('/api/f230/:id', requireAdmin, handleDeleteForm)
}
