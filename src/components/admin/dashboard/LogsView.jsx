import { useEffect, useState } from 'react'
import { listLogs } from '../../../services/adminLogsService'

const LIMIT = 500

const TYPE_LABELS = {
  auth: 'Autentificare',
  content: 'Conținut',
  upload: 'Upload',
  message: 'Mesaje',
  f230: 'Formular 230',
  system: 'Sistem',
}

const LEVEL_BADGES = {
  info: { label: 'Info', className: 'bg-secondary' },
  warn: { label: 'Atenție', className: 'bg-warning text-dark' },
  error: { label: 'Eroare', className: 'bg-danger' },
}

const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ro-RO')
}

const typeLabel = (type) => TYPE_LABELS[type] || type || ''

const formatMeta = (meta) => {
  if (!meta || typeof meta !== 'object') return ''

  return Object.entries(meta)
    .filter(([key, value]) => key !== 'level' && value !== undefined && value !== null)
    .map(([key, value]) => {
      const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return `${key}: ${text}`
    })
    .join(', ')
}

export default function LogsView() {
  const [items, setItems] = useState([])
  const [types, setTypes] = useState([])
  const [type, setType] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    listLogs({ type, q: debouncedQuery, limit: LIMIT })
      .then((data) => {
        if (!active) return
        setItems(data.items)
        setTypes(data.types)
      })
      .catch((err) => {
        if (!active) return
        setItems([])
        setError(err.message || 'Logurile nu au putut fi încărcate.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [type, debouncedQuery, reloadKey])

  return (
    <div className="gt-admin-card mb-3">
      <h5 className="mb-3">Loguri</h5>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <select
          className="form-select form-select-sm w-auto"
          value={type}
          onChange={(event) => setType(event.target.value)}
          aria-label="Tip eveniment"
        >
          <option value="">Toate</option>
          {types.map((item) => (
            <option key={item} value={item}>
              {typeLabel(item)}
            </option>
          ))}
        </select>

        <input
          type="search"
          className="form-control form-control-sm w-auto"
          placeholder="Caută în mesaje…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Caută în mesaje"
        />

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Reîncarcă
        </button>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {loading && <p className="mb-0">Se încarcă…</p>}

      {!loading && !error && items.length === 0 && <p className="mb-0">Nu există evenimente.</p>}

      {!loading && items.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Tip</th>
                <th scope="col">Nivel</th>
                <th scope="col">Mesaj</th>
                <th scope="col">Detalii</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const badge = LEVEL_BADGES[item.level] || LEVEL_BADGES.info
                const details = formatMeta(item.meta)

                return (
                  <tr key={item.id}>
                    <td className="text-nowrap">{formatDate(item.ts)}</td>
                    <td>{typeLabel(item.type)}</td>
                    <td>
                      <span className={`badge ${badge.className}`}>{badge.label}</span>
                    </td>
                    <td>{item.message}</td>
                    <td>
                      {details && <small className="text-muted">{details}</small>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
