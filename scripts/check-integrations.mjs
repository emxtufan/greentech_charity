import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express from 'express'
import jwt from 'jsonwebtoken'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'webcharity-integrations-'))
process.env.WEBCHARITY_DATA_DIR = directory
process.env.JWT_SECRET = 'webcharity-isolated-integration-test'
const servingBrowser = process.argv.includes('--serve')
const received = []
let rejectTeam = false

// Cutie SMTP locală. Mesajele testului rămân în acest proces.
const smtp = net.createServer((socket) => {
  socket.setEncoding('utf8')
  socket.write('220 localhost ESMTP test\r\n')
  let buffer = ''
  let data = null
  socket.on('data', (chunk) => {
    buffer += chunk
    let newline
    while ((newline = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, newline)
      buffer = buffer.slice(newline + 2)
      if (data !== null) {
        if (line === '.') {
          received.push(data)
          data = null
          socket.write('250 Message accepted\r\n')
        } else data += line + '\r\n'
      } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250 localhost\r\n')
      else if (/^RCPT TO:/i.test(line) && rejectTeam && line.includes('team@example.test')) socket.write('550 Recipient rejected\r\n')
      else if (line === 'DATA') { data = ''; socket.write('354 End with a dot\r\n') }
      else if (line === 'QUIT') socket.end('221 Bye\r\n')
      else socket.write('250 OK\r\n')
    }
  })
  socket.on('error', () => {})
})
await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve))

const { registerIntegrationRoutes, saveIntegrationSettings, getIntegrationSettings } = await import('../server/integrations.js')
const { registerMessageRoutes } = await import('../server/messages.js')
const { requireAdmin } = await import('../server/auth.js')
const { normalizeTracking, trackingError } = await import('../shared/tracking.js')
saveIntegrationSettings({
  revision: 0,
  smtp: { enabled: true, host: '127.0.0.1', port: smtp.address().port, security: 'none', user: '', password: 'private-test-password', fromEmail: 'sender@example.test', to: 'team@example.test', autoReply: true },
  turnstile: { mode: 'test' },
})
const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })
const app = express()
app.use(express.json())
registerIntegrationRoutes(app)
registerMessageRoutes(app)
let content = JSON.parse(fs.readFileSync(path.join(root, 'server/data/content.json'), 'utf8'))
app.get('/api/content', (req, res) => res.json(content))
app.put('/api/content', requireAdmin, (req, res) => {
  const tracking = normalizeTracking(req.body.site.tracking)
  const error = trackingError(tracking)
  if (error) return res.status(400).json({ message: error })
  content = req.body
  content.site.tracking = tracking
  res.json({ ok: true })
})
app.get('/api/admin/me', requireAdmin, (req, res) => res.json({ ok: true }))
app.use('/uploads', express.static(path.join(root, 'server/uploads')))
app.use(express.static(path.join(root, 'dist')))
app.get('*', (req, res) => res.sendFile(path.join(root, 'dist/index.html')))
app.use((error, req, res, next) => res.status(error.status || 500).json({ message: error.message }))
const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
const base = `http://127.0.0.1:${server.address().port}`
const nativeFetch = globalThis.fetch
let turnstileResult = { success: true }
if (!servingBrowser) {
  globalThis.fetch = (url, options) => String(url).startsWith('https://challenges.cloudflare.com/')
    ? Promise.resolve(Response.json(turnstileResult)) : nativeFetch(url, options)
}
const request = async (route, { body, admin = false, method = body ? 'POST' : 'GET' } = {}) => {
  const response = await fetch(base + route, {
    method, headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, data: await response.json() }
}
const message = () => ({ submissionId: randomUUID(), name: 'Client Test', email: 'client@example.test', phone: '', topic: 'altceva', message: 'Verificarea formularului de contact.', consent: true, turnstileToken: 'test-token' })

async function cleanup() {
  globalThis.fetch = nativeFetch
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await new Promise((resolve) => smtp.close(resolve))
  if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir())) throw new Error('Director de test invalid.')
  fs.rmSync(directory, { recursive: true, force: true })
}

try {
  if (servingBrowser) {
    console.log(JSON.stringify({ base, token }))
    process.stdin.setEncoding('utf8')
    await new Promise((resolve) => process.stdin.once('data', resolve))
    console.log(`BROWSER_SMTP_MESSAGES=${received.length}`)
    process.stdin.pause()
  } else {
    assert.equal((await request('/api/admin/integrations')).status, 401)
    const settings = (await request('/api/admin/integrations', { admin: true })).data
    assert.equal(settings.smtp.password, '')
    assert.equal(settings.smtp.hasPassword, true)
    assert.ok(!fs.readFileSync(path.join(directory, 'integrations.json'), 'utf8').includes('private-test-password'))
    const publicSettings = (await request('/api/integrations/public')).data
    assert.equal(publicSettings.smtp, undefined)
    assert.equal(publicSettings.turnstile.secretKey, undefined)
    const saved = await request('/api/admin/integrations', { admin: true, method: 'PUT', body: settings })
    assert.equal(saved.status, 200)
    assert.equal(getIntegrationSettings().smtp.password, 'private-test-password')
    assert.equal((await request('/api/admin/integrations', { admin: true, method: 'PUT', body: settings })).status, 409)
    assert.equal((await request('/api/admin/integrations/smtp-test', { admin: true, body: {} })).status, 200)
    console.log('PASS protected settings, encrypted secrets, blank-password preservation, concurrent-save conflict, SMTP verify')

    const invalid = message()
    invalid.turnstileToken = ''
    assert.equal((await request('/api/messages', { body: invalid })).status, 400)
    assert.equal(received.length, 0)
    turnstileResult = { success: false }
    assert.equal((await request('/api/messages', { body: message() })).status, 400)
    turnstileResult = { success: true }
    const valid = message()
    const sent = await request('/api/messages', { body: valid })
    assert.equal(sent.status, 201)
    assert.equal(sent.data.confirmationStatus, 'sent')
    assert.equal(received.length, 2)
    assert.ok(received.some((email) => email.includes('To: client@example.test')))
    assert.equal((await request('/api/messages', { body: valid })).data.id, sent.data.id)
    assert.equal(received.length, 2)
    const conflict = await request('/api/messages', { body: { ...valid, message: 'Acesta este un alt mesaj.' } })
    assert.equal(conflict.status, 409)
    console.log('PASS captcha enforcement, notification and confirmation, idempotent contact retries')

    rejectTeam = true
    const partial = await request('/api/messages', { body: message() })
    assert.equal(partial.status, 201)
    assert.equal(partial.data.confirmationStatus, 'sent')
    assert.equal(received.length, 3)
    rejectTeam = false
    const retried = await request(`/api/messages/${partial.data.id}/retry-email`, { admin: true, body: {} })
    assert.equal(retried.data.delivery.notification.status, 'sent')
    assert.equal(retried.data.delivery.confirmation.status, 'sent')
    assert.equal(received.length, 4)
    await request(`/api/messages/${partial.data.id}/retry-email`, { admin: true, body: {} })
    assert.equal(received.length, 4)
    console.log('PASS partial SMTP failure retains message and retries only the failed email')

    const existing = getIntegrationSettings()
    saveIntegrationSettings({ ...existing, turnstile: { mode: 'live', siteKey: '0x4AAAAA-valid-test-site', secretKey: 'server-test-secret', hostnames: 'example.test' } })
    turnstileResult = { success: true, hostname: 'wrong.test', action: 'contact' }
    assert.equal((await request('/api/messages', { body: message() })).status, 400)
    assert.equal(received.length, 4)
    console.log('PASS production hostname verification')
  }
} finally { await cleanup() }
