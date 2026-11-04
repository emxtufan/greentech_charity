export const img = (name) => new URL(`../assets/images/${name}`, import.meta.url).href

export const bg = (name) => ({ backgroundImage: `url(${img(name)})` })

export const cx = (...c) => c.filter(Boolean).join(' ')

export const formatNumber = (n) => {
  const value = Number(n)
  return Number.isFinite(value) ? value.toLocaleString('en-US') : ''
}

export const resolveImg = (v) => {
  if (!v) return ''
  const value = String(v)
  if (value.startsWith('/uploads/') || value.startsWith('https://')) return value
  return img(value)
}

const HREF_PREFIXES = ['/', '#', 'http://', 'https://', 'mailto:', 'tel:']

export const safeHref = (v) => {
  const href = String(v ?? '').trim()
  return HREF_PREFIXES.some((prefix) => href.startsWith(prefix)) ? href : '#'
}

export const isInternal = (v) => {
  const href = String(v ?? '').trim()
  return href.startsWith('/') && !href.startsWith('//')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const isValidEmail = (s) => EMAIL_RE.test(String(s ?? '').trim())
