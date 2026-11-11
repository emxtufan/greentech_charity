import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import { requireAdmin } from './auth.js'
import { logEvent } from './audit.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = process.env.WEBCHARITY_DATA_DIR || path.join(ROOT, 'server/data')
const SETTINGS_FILE = path.join(DATA_DIR, 'integrations.json')
const KEY_FILE = path.join(DATA_DIR, 'integrations.key')
const TEST_SITE_KEY = '1x00000000000000000000AA'
const TEST_SECRET_KEY = '1x0000000000000000000000000000000AA'
const EMAIL = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/
const text = (value) => typeof value === 'string' ? value.trim() : ''
const boolean = (value) => /^(1|true|yes)$/i.test(String(value || ''))

function defaults() {
  const legacyPath = path.join(ROOT, 'greencube/.env')
  const legacy = process.env.WEBCHARITY_DATA_DIR || !fs.existsSync(legacyPath)
    ? {} : dotenv.parse(fs.readFileSync(legacyPath))
  const env = { ...legacy, ...process.env }
  return {
    revision: 0,
    smtp: {
      enabled: Boolean(env.SMTP_HOST && env.SMTP_USER && (env.SMTP_PASSWORD || env.SMTP_PASS)),
      host: env.SMTP_HOST || '', port: Number(env.SMTP_PORT || 587),
      security: boolean(env.SMTP_SECURE) ? 'tls' : 'starttls',
      user: env.SMTP_USER || '', password: env.SMTP_PASSWORD || env.SMTP_PASS || '',
      fromName: env.SMTP_FROM_NAME || 'GreenTech Charity',
      fromEmail: env.SMTP_FROM_EMAIL || env.SMTP_USER || '',
      to: env.SMTP_TO || env.SMTP_USER || '',
      autoReply: true,
      replySubject: 'Am primit mesajul tău — GreenTech Charity',
      replyText: 'Bună, {name}!\n\nAm primit mesajul tău și datele formularului au fost validate. Echipa noastră va analiza solicitarea și îți va răspunde.\n\nNumărul mesajului este {reference}.\n\nMulțumim,\n{siteName}',
    },
    turnstile: { mode: 'disabled', siteKey: '', secretKey: '', hostnames: '' },
  }
}

function encryptionKey() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(KEY_FILE)) {
    try { fs.writeFileSync(KEY_FILE, randomBytes(32), { flag: 'wx', mode: 0o600 }) }
    catch (error) { if (error.code !== 'EEXIST') throw error }
  }
  const key = fs.readFileSync(KEY_FILE)
  if (key.length !== 32) throw new Error('Cheia setărilor este invalidă.')
  return key
}

function encrypt(value) {
  if (!value) return ''
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }
}

function decrypt(value) {
  if (!value) return ''
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(value.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8')
}

export function getIntegrationSettings() {
  const base = defaults()
  if (!fs.existsSync(SETTINGS_FILE)) return base
  const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
  return {
    revision: saved.revision || 0,
    smtp: { ...base.smtp, ...saved.smtp, password: decrypt(saved.smtp?.password) },
    turnstile: { ...base.turnstile, ...saved.turnstile, secretKey: decrypt(saved.turnstile?.secretKey) },
  }
}

function safeSettings(settings) {
  return {
    ...settings,
    smtp: { ...settings.smtp, password: '', hasPassword: Boolean(settings.smtp.password) },
    turnstile: { ...settings.turnstile, secretKey: '', hasSecretKey: Boolean(settings.turnstile.secretKey) },
  }
}

export function saveIntegrationSettings(input) {
  const previous = getIntegrationSettings()
  if (input.revision !== previous.revision) {
    throw Object.assign(new Error('Setările au fost modificate. Reîncarcă fila înainte de salvare.'), { status: 409 })
  }
  const next = structuredClone(previous)
  for (const key of ['host', 'security', 'user', 'fromName', 'fromEmail', 'to', 'replySubject', 'replyText']) {
    if (typeof input.smtp?.[key] === 'string') next.smtp[key] = input.smtp[key].trim()
  }
  for (const key of ['enabled', 'autoReply']) {
    if (typeof input.smtp?.[key] === 'boolean') next.smtp[key] = input.smtp[key]
  }
  if (input.smtp?.port !== undefined) next.smtp.port = Number(input.smtp.port)
  if (text(input.smtp?.password)) next.smtp.password = input.smtp.password
  for (const key of ['mode', 'siteKey', 'hostnames']) {
    if (typeof input.turnstile?.[key] === 'string') next.turnstile[key] = input.turnstile[key].trim()
  }
  if (text(input.turnstile?.secretKey)) next.turnstile.secretKey = text(input.turnstile.secretKey)
  const { smtp, turnstile } = next
  const reject = (message) => { throw Object.assign(new Error(message), { status: 400 }) }
  if (!Number.isInteger(smtp.port) || smtp.port < 1 || smtp.port > 65535) reject('Port SMTP invalid.')
  if (!['tls', 'starttls', 'none'].includes(smtp.security)) reject('Alege securitatea conexiunii SMTP.')
  if (!['disabled', 'test', 'live'].includes(turnstile.mode)) reject('Mod Turnstile invalid.')
  if (Object.values(smtp).some((value) => typeof value === 'string' && value.length > 5000)) reject('Un câmp SMTP este prea lung.')
  if (/[\r\n]/.test(smtp.fromName + smtp.replySubject + smtp.host + smtp.user)) reject('Câmp SMTP invalid.')
  if (smtp.enabled) {
    if (!/^[a-zA-Z0-9.:[\]-]+$/.test(smtp.host)) reject('Completează serverul SMTP.')
    if (!EMAIL.test(smtp.fromEmail) || !smtp.to || smtp.to.split(',').some((email) => !EMAIL.test(email.trim()))) reject('Completează adresele de expeditor și destinatar.')
    if (smtp.user && !smtp.password) reject('Completează parola SMTP.')
    if (smtp.autoReply && (!smtp.replySubject || !smtp.replyText)) reject('Completează confirmarea automată.')
  }
  if (turnstile.mode === 'live') {
    if (!/^[a-zA-Z0-9_-]{10,100}$/.test(turnstile.siteKey) || !turnstile.secretKey || turnstile.secretKey.length > 200) reject('Completează cheile Turnstile.')
    if (/^[123]x0/.test(turnstile.siteKey) || /^[123]x0/.test(turnstile.secretKey)) reject('Cheile de test se folosesc în modul Test local.')
    if (!turnstile.hostnames || turnstile.hostnames.split(',').some((host) => !/^[a-zA-Z0-9.-]+$/.test(host.trim()))) reject('Completează domeniile permise, fără https:// sau căi.')
  }
  next.revision += 1
  const stored = { ...next, smtp: { ...smtp, password: encrypt(smtp.password) }, turnstile: { ...turnstile, secretKey: encrypt(turnstile.secretKey) } }
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const temporary = `${SETTINGS_FILE}.${randomUUID()}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(stored, null, 2), { mode: 0o600 })
  fs.renameSync(temporary, SETTINGS_FILE)
  return safeSettings(next)
}

function isLocalRequest(req) {
  const loopback = (ip) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)
  return process.env.NODE_ENV !== 'production' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(req.hostname) &&
    loopback(req.socket.remoteAddress) &&
    (!req.headers['x-forwarded-for'] || req.headers['x-forwarded-for'].split(',').every((ip) => loopback(ip.trim())))
}

export function publicIntegrations(req) {
  const { turnstile } = getIntegrationSettings()
  const testAllowed = turnstile.mode === 'test' && isLocalRequest(req)
  return { turnstile: {
    mode: turnstile.mode,
    enabled: turnstile.mode !== 'disabled',
    siteKey: testAllowed ? TEST_SITE_KEY : turnstile.mode === 'live' ? turnstile.siteKey : '',
  } }
}

export async function verifyTurnstile(req, token) {
  const { turnstile } = getIntegrationSettings()
  if (turnstile.mode === 'disabled') return
  if (turnstile.mode === 'test' && !isLocalRequest(req)) {
    throw Object.assign(new Error('Protecția formularului trebuie configurată pentru acest domeniu.'), { status: 503 })
  }
  if (typeof token !== 'string' || !token || token.length > 2048) {
    throw Object.assign(new Error('Completează verificarea Turnstile.'), { status: 400 })
  }
  let result
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: turnstile.mode === 'test' ? TEST_SECRET_KEY : turnstile.secretKey, response: token }),
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error('Turnstile unavailable')
    result = await response.json()
  } catch {
    throw Object.assign(new Error('Verificarea de securitate nu este disponibilă. Reîncearcă.'), { status: 503 })
  }
  const expectedHosts = turnstile.hostnames.toLowerCase().split(',').map((host) => host.trim())
  if (!result.success || (turnstile.mode === 'live' &&
    (!expectedHosts.includes(String(result.hostname).toLowerCase()) || result.action !== 'contact'))) {
    throw Object.assign(new Error('Verificarea Turnstile a expirat sau a eșuat. Reîncearcă.'), { status: 400 })
  }
}

export function smtpTransport(smtp) {
  return nodemailer.createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.security === 'tls',
    requireTLS: smtp.security === 'starttls', ignoreTLS: smtp.security === 'none',
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 20000,
    tls: { minVersion: 'TLSv1.2' }, disableFileAccess: true, disableUrlAccess: true,
  })
}

export async function sendContactEmail(message, channel, smtp) {
  const confirmation = channel === 'confirmation'
  const reference = message.id.slice(0, 8).toUpperCase()
  const values = { name: message.name, reference, siteName: smtp.fromName }
  const interpolate = (template) => template.replace(/\{(name|reference|siteName)\}/g, (_, key) => values[key])
  const body = confirmation ? interpolate(smtp.replyText) :
    `Mesaj nou ${reference}\n\nNume: ${message.name}\nEmail: ${message.email}\nTelefon: ${message.phone || '—'}\nSubiect: ${message.topic}\n\n${message.message}`
  const transport = smtpTransport(smtp)
  try {
    const result = await transport.sendMail({
      from: { name: smtp.fromName, address: smtp.fromEmail },
      to: confirmation ? message.email : smtp.to,
      replyTo: confirmation ? smtp.fromEmail : message.email,
      subject: confirmation ? interpolate(smtp.replySubject).replace(/[\r\n]+/g, ' ') : `Mesaj de contact ${reference} — ${smtp.fromName}`,
      text: body,
      messageId: `<${message.id}.${channel}@${smtp.fromEmail.split('@')[1]}>`,
      headers: confirmation ? { 'Auto-Submitted': 'auto-replied', 'X-Auto-Response-Suppress': 'All' } : undefined,
    })
    if (result.rejected?.length) throw Object.assign(new Error('Destinatar refuzat.'), { code: 'ERECIPIENT' })
  } finally { transport.close() }
}

export function registerIntegrationRoutes(app) {
  app.get('/api/integrations/public', (req, res, next) => {
    try { res.set('Cache-Control', 'no-store').json(publicIntegrations(req)) }
    catch (error) { next(error) }
  })
  app.get('/api/admin/integrations', requireAdmin, (req, res, next) => {
    try { res.set('Cache-Control', 'no-store').json(safeSettings(getIntegrationSettings())) }
    catch (error) { next(error) }
  })
  app.put('/api/admin/integrations', requireAdmin, (req, res, next) => {
    try {
      const settings = saveIntegrationSettings(req.body || {})
      logEvent('system', 'Setările SMTP și Turnstile au fost salvate')
      res.json(settings)
    } catch (error) { next(error) }
  })
  app.post('/api/admin/integrations/smtp-test', requireAdmin, async (req, res) => {
    let transport
    try {
      const { smtp } = getIntegrationSettings()
      if (!smtp.enabled) return res.status(400).json({ message: 'Activează și salvează configurația SMTP.' })
      transport = smtpTransport(smtp)
      await transport.verify()
      if (req.body?.send === true) {
        if (!EMAIL.test(text(req.body.to))) return res.status(400).json({ message: 'Adresă de test invalidă.' })
        await transport.sendMail({ from: { name: smtp.fromName, address: smtp.fromEmail }, to: req.body.to.trim(), subject: 'Test SMTP — GreenTech Charity', text: 'Conexiunea SMTP și trimiterea emailurilor funcționează.' })
      }
      res.json({ ok: true, message: req.body?.send ? 'Emailul de test a fost acceptat de serverul SMTP.' : 'Conexiunea și autentificarea SMTP funcționează.' })
    } catch (error) {
      logEvent('system', 'Verificarea SMTP a eșuat', { level: 'warn', code: error.code || 'SMTP' })
      res.status(502).json({ message: `Verificarea SMTP a eșuat (${error.code || 'SMTP'}). Verifică datele și portul.` })
    } finally { transport?.close() }
  })
}
