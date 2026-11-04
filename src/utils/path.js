const NUMERIC_RE = /^\d+$/

const toSegment = (part) => (NUMERIC_RE.test(String(part)) ? Number(part) : String(part))

// "a.b.0" sau ["a", "b", 0] -> ["a", "b", 0]
export const toPath = (p) => {
  if (p === undefined || p === null || p === '') return []
  const parts = Array.isArray(p) ? p : String(p).split('.')
  return parts.filter((part) => part !== undefined && part !== null && part !== '').map(toSegment)
}

export const getIn = (obj, path) => {
  const segments = toPath(path)
  let current = obj

  for (const segment of segments) {
    if (current === undefined || current === null) return undefined
    current = current[segment]
  }

  return current
}

// copiază doar obiectele/array-urile de pe drum, restul rămâne partajat
export const setIn = (obj, path, value) => {
  const segments = toPath(path)
  if (segments.length === 0) return value

  const [head, ...rest] = segments
  const base = obj === undefined || obj === null ? (typeof head === 'number' ? [] : {}) : obj
  const next = Array.isArray(base) ? base.slice() : { ...base }

  next[head] = rest.length === 0 ? value : setIn(base[head], rest, value)

  return next
}

export const insertAt = (arr, index, item) => {
  const list = Array.isArray(arr) ? arr.slice() : []
  const at = index === undefined || index === null ? list.length : Number(index)
  const position = Number.isFinite(at) ? Math.max(0, Math.min(list.length, at)) : list.length

  list.splice(position, 0, item)

  return list
}

export const removeAt = (arr, index) => {
  if (!Array.isArray(arr)) return []

  const at = Number(index)
  if (!Number.isInteger(at) || at < 0 || at >= arr.length) return arr.slice()

  return arr.filter((_, i) => i !== at)
}

export const moveItem = (arr, from, to) => {
  if (!Array.isArray(arr)) return []

  const list = arr.slice()
  const start = Number(from)
  const end = Number(to)

  if (!Number.isInteger(start) || start < 0 || start >= list.length) return list

  const target = Number.isFinite(end) ? Math.max(0, Math.min(list.length - 1, end)) : start
  const [item] = list.splice(start, 1)
  list.splice(target, 0, item)

  return list
}

export const pathKey = (path) => toPath(path).join('.')
