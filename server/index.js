import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import dotenv from 'dotenv'
import { adminLogin, requireAdmin } from './auth.js'
import { registerMessageRoutes } from './messages.js'
import { registerF230Routes } from './f230.js'
import { logEvent, registerAuditRoutes } from './audit.js'
import { applyEnvDefaults } from './orgDefaults.js'
import { UPLOADS_DIR, uploadImage } from './upload.js'
import { registerIntegrationRoutes } from './integrations.js'
import { normalizeTracking, trackingError } from '../shared/tracking.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(ROOT_DIR, '.env.local') })
dotenv.config({ path: path.join(ROOT_DIR, '.env') })

const PORT = Number(process.env.PORT) || 3001
const DATA_DIR = path.join(__dirname, 'data')
const BACKUPS_DIR = path.join(DATA_DIR, 'backups')
const CONTENT_FILE = path.join(DATA_DIR, 'content.json')
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const MAX_BACKUPS = 20

fs.mkdirSync(UPLOADS_DIR, { recursive: true })
fs.mkdirSync(BACKUPS_DIR, { recursive: true })

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const readContent = () => JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'))

const writeContentAtomic = (data) => {
  const tmpFile = `${CONTENT_FILE}.tmp`
  fs.writeFileSync(tmpFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  fs.renameSync(tmpFile, CONTENT_FILE)
}

const pruneBackups = () => {
  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter((file) => file.startsWith('content-') && file.endsWith('.json'))
    .sort()

  files.slice(0, Math.max(0, files.length - MAX_BACKUPS)).forEach((file) => {
    fs.rmSync(path.join(BACKUPS_DIR, file), { force: true })
  })
}

const backupContent = () => {
  if (!fs.existsSync(CONTENT_FILE)) return
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.copyFileSync(CONTENT_FILE, path.join(BACKUPS_DIR, `content-${stamp}.json`))
  pruneBackups()
}

const app = express()

app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(UPLOADS_DIR))

app.get('/api/content', (req, res, next) => {
  try {
    res.json(applyEnvDefaults(readContent()))
  } catch (err) {
    next(err)
  }
})

app.put('/api/content', requireAdmin, (req, res, next) => {
  try {
    const body = req.body
    if (!isPlainObject(body) || !isPlainObject(body.site) || !Array.isArray(body.pages)) {
      return res.status(400).json({ message: 'Conținut invalid: se așteaptă {site: object, pages: array}' })
    }
    if (body.site.tracking) {
      const tracking = normalizeTracking(body.site.tracking)
      const error = trackingError(tracking)
      if (error) return res.status(400).json({ message: error })
      body.site.tracking = tracking
    }
    backupContent()
    writeContentAtomic(body)
    logEvent('content', 'Conținutul site-ului a fost salvat')
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

app.post('/api/admin/login', adminLogin)

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ ok: true })
})

app.post('/api/upload', requireAdmin, (req, res) => {
  uploadImage(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Fișierul depășește limita de 5MB' : err.message || 'Încărcare eșuată'
      return res.status(400).json({ message })
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Niciun fișier încărcat' })
    }
    logEvent('upload', 'Imagine încărcată', { file: req.file.filename })
    return res.json({ url: `/uploads/${req.file.filename}` })
  })
})

registerIntegrationRoutes(app)
registerMessageRoutes(app)
registerF230Routes(app)
registerAuditRoutes(app)

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Endpoint inexistent' })
})

if (fs.existsSync(DIST_DIR)) {
  app.get(['/greencube', '/greencube/'], (req, res) => {
    return res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
  app.use(express.static(DIST_DIR))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    return res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500
  logEvent('system', `Eroare server: ${err.message}`, { level: 'error', path: req.path })
  res.status(status).json({ message: err.message || 'Eroare server' })
})

app.listen(PORT, () => {
  console.log(`[server] API pornit pe http://localhost:${PORT}`)
  logEvent('system', 'Server pornit')

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[server] ADMIN_PASSWORD nu este setat — login-ul admin răspunde 503')
  }
  if (!process.env.JWT_SECRET) {
    console.warn('[server] JWT_SECRET nu este setat — folosesc un secret aleator (tokenurile se pierd la restart)')
  }
  if (!fs.existsSync(DIST_DIR)) {
    console.log('[server] dist/ nu există — rulează `npm run build` pentru a servi build-ul')
  }
})
