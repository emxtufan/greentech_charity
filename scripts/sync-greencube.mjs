import { cp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..')
const SOURCE_DIR = path.join(PROJECT_ROOT, 'greencube', 'dist')
const TARGET_DIR = path.join(PROJECT_ROOT, 'public', 'greencube')
const PUBLIC_PREFIX = '/greencube'
const TEXT_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.map',
  '.txt',
  '.xml',
  '.svg',
  '.webmanifest',
])
const EXCLUDED_PREFIXES = ['/api', '/uploads', PUBLIC_PREFIX]

// Candidat de URL absolut: "/" urmat de un caracter de nume de fisier.
const ABSOLUTE_URL = /\/[A-Za-z0-9._~%-][A-Za-z0-9._~%/%-]*/g

async function ensureSource() {
  let info
  try {
    info = await stat(SOURCE_DIR)
  } catch {
    throw new Error(
      `Sursa GreenCube lipseste: ${SOURCE_DIR}. Ruleaza build-ul in greencube/ inainte de sincronizare.`,
    )
  }
  if (!info.isDirectory()) {
    throw new Error(`Sursa GreenCube nu este un director: ${SOURCE_DIR}.`)
  }
  try {
    const index = await stat(path.join(SOURCE_DIR, 'index.html'))
    if (!index.isFile()) throw new Error('not a file')
  } catch {
    throw new Error(`Sursa GreenCube este incompleta: lipseste ${path.join(SOURCE_DIR, 'index.html')}.`)
  }
}

async function collectFiles(dir, result = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(fullPath, result)
    } else if (entry.isFile()) {
      result.push(fullPath)
    }
  }
  return result
}

// Indexul activelor copiate, ca sa rescriem doar URL-urile care indica fisiere reale.
async function indexCopiedAssets(dir, prefix = '', index = new Set([''])) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    index.add(relativePath)
    if (entry.isDirectory()) {
      await indexCopiedAssets(path.join(dir, entry.name), relativePath, index)
    }
  }
  return index
}

function isTextFile(filePath, buffer) {
  if (!TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return false
  const sample = buffer.subarray(0, 8000)
  return !sample.includes(0)
}

function normalizePathname(rawPath) {
  let decoded
  try {
    decoded = decodeURIComponent(rawPath)
  } catch {
    return null
  }
  const trimmed = decoded.replace(/^\/+/, '').replace(/\/+$/, '')
  return trimmed
}

function shouldSkip(candidate, assetIndex) {
  if (candidate === '/') return true
  if (candidate.startsWith('//')) return true
  for (const prefix of EXCLUDED_PREFIXES) {
    if (candidate === prefix || candidate.startsWith(`${prefix}/`)) return true
  }
  const normalized = normalizePathname(candidate)
  if (normalized === null || normalized === '') return true
  return !assetIndex.has(normalized)
}

async function rewriteTextFile(filePath, assetIndex) {
  const buffer = await readFile(filePath)
  if (!isTextFile(filePath, buffer)) return 0

  const text = buffer.toString('utf8')
  let replacements = 0

  const rewritten = text.replace(ABSOLUTE_URL, (match, offset) => {
    const previous = offset > 0 ? text[offset - 1] : ''
    if (previous === '\\' || previous === '/' || /[A-Za-z0-9]/.test(previous)) return match
    if (shouldSkip(match, assetIndex)) return match
    replacements += 1
    return `${PUBLIC_PREFIX}${match}`
  })

  if (replacements > 0) {
    await writeFile(filePath, rewritten, 'utf8')
  }
  return replacements
}

async function main() {
  await ensureSource()

  await rm(TARGET_DIR, { recursive: true, force: true })
  await cp(SOURCE_DIR, TARGET_DIR, { recursive: true })

  const assetIndex = await indexCopiedAssets(TARGET_DIR)
  const files = await collectFiles(TARGET_DIR)

  let rewrittenFiles = 0
  let totalReplacements = 0

  for (const filePath of files) {
    const replacements = await rewriteTextFile(filePath, assetIndex)
    if (replacements > 0) {
      rewrittenFiles += 1
      totalReplacements += replacements
    }
  }

  console.log(
    `[greencube] ${files.length} fisiere copiate in public/greencube, ` +
      `${rewrittenFiles} fisiere text rescrise, ${totalReplacements} URL-uri prefixate cu ${PUBLIC_PREFIX}.`,
  )
}

main().catch((error) => {
  console.error(`[greencube] Sincronizarea a esuat: ${error.message}`)
  process.exitCode = 1
})
