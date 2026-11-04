import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const UPLOADS_DIR = path.join(__dirname, 'uploads')

const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_EXTENSIONS[file.mimetype]
    if (!ext) return cb(new Error('Tip de fișier nepermis (doar jpg, png, webp, gif)'))
    return cb(null, `${randomUUID()}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  if (!MIME_EXTENSIONS[file.mimetype]) {
    return cb(new Error('Tip de fișier nepermis (doar jpg, png, webp, gif)'))
  }
  return cb(null, true)
}

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('file')
