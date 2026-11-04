export const img = (name) => new URL(`../assets/images/${name}`, import.meta.url).href

export const bg = (name) => ({ backgroundImage: `url(${img(name)})` })

export const cx = (...c) => c.filter(Boolean).join(' ')

export const formatNumber = (n) => {
  const value = Number(n)
  return Number.isFinite(value) ? value.toLocaleString('en-US') : ''
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const isValidEmail = (s) => EMAIL_RE.test(String(s ?? '').trim())
