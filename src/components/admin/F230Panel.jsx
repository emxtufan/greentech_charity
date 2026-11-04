import { useEffect, useState } from 'react'
import Modal from '../common/Modal'
import useContent from '../../hooks/useContent'
import { deleteForm, downloadCsv, listForms, setStatus } from '../../services/f230AdminService'

const FILTERS = [
  { value: 'toate', label: 'Toate' },
  { value: 'primit', label: 'Primite' },
  { value: 'depus', label: 'Depuse' },
]

const PRINT_TITLE =
  'Cerere privind destinația sumei reprezentând până la 3,5% din impozitul anual (Formularul 230) — date colectate online'

const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ro-RO')
}

const fullName = (data) => [data?.lastName, data?.firstName].filter(Boolean).join(' ')

const showValue = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return '—'
  return String(value)
}

const yesNo = (value) => (value ? 'DA' : 'NU')

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const signatureSource = (data) => {
  const signature = typeof data?.signature === 'string' ? data.signature.trim() : ''
  return signature.startsWith('data:image/') ? signature : ''
}

const printAddress = (data) =>
  [
    [data.street, data.number].filter(Boolean).join(' nr. '),
    data.block ? `bl. ${data.block}` : '',
    data.staircase ? `sc. ${data.staircase}` : '',
    data.floor ? `et. ${data.floor}` : '',
    data.apartment ? `ap. ${data.apartment}` : '',
    [data.postalCode, data.city].filter(Boolean).join(' '),
    data.county,
  ]
    .filter(Boolean)
    .join(', ')

const buildPrintHtml = (form, legal) => {
  const data = form.data || {}
  const signature = signatureSource(data)

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(PRINT_TITLE)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; }
  h1 { font-size: 13pt; text-align: center; margin: 0 0 16pt; }
  h2 { font-size: 11pt; margin: 16pt 0 6pt; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 3pt 0; vertical-align: top; }
  th { width: 40%; font-weight: normal; color: #444; }
  .code { text-align: right; color: #444; font-size: 10pt; margin: 0 0 8pt; }
  .signature { margin-top: 18pt; }
  .signature img { display: block; max-height: 120px; background: #fff; }
</style>
</head>
<body>
  <p class="code">Cod formular: ${escapeHtml(form.code)}</p>
  <h1>${escapeHtml(PRINT_TITLE)}</h1>

  <h2>I. Contribuabil</h2>
  <table>
    <tr><th>Nume</th><td>${escapeHtml(showValue(data.lastName))}</td></tr>
    <tr><th>Inițiala tatălui</th><td>${escapeHtml(showValue(data.fatherInitial))}</td></tr>
    <tr><th>Prenume</th><td>${escapeHtml(showValue(data.firstName))}</td></tr>
    <tr><th>CNP</th><td>${escapeHtml(showValue(data.cnp))}</td></tr>
    <tr><th>Adresa</th><td>${escapeHtml(showValue(printAddress(data)))}</td></tr>
    <tr><th>Telefon</th><td>${escapeHtml(showValue(data.phone))}</td></tr>
    <tr><th>Email</th><td>${escapeHtml(showValue(data.email))}</td></tr>
  </table>

  <h2>II. Entitatea beneficiară</h2>
  <table>
    <tr><th>Denumire</th><td>${escapeHtml(showValue(legal.name))}</td></tr>
    <tr><th>Cod de identificare fiscală</th><td>${escapeHtml(showValue(legal.cif))}</td></tr>
    <tr><th>Cont bancar (IBAN)</th><td>${escapeHtml(showValue(legal.iban))}</td></tr>
  </table>

  <h2>Opțiuni</h2>
  <table>
    <tr><th>Opțiune pentru următorii 2 ani</th><td>${escapeHtml(yesNo(data.twoYears))}</td></tr>
    <tr><th>Acord pentru transmiterea datelor</th><td>${escapeHtml(yesNo(data.shareData))}</td></tr>
  </table>

  <p class="signature">Data: ${escapeHtml(showValue(formatDate(data.consentAt)))}</p>
  <p class="signature">Semnătura:${
    signature ? `<br /><img src="${escapeHtml(signature)}" alt="Semnătura" />` : ' —'
  }</p>
</body>
</html>`
}

function DetailRow({ label, children }) {
  return (
    <>
      <dt className="col-sm-4">{label}</dt>
      <dd className="col-sm-8">{children}</dd>
    </>
  )
}

export function F230View() {
  const { content } = useContent()

  const [forms, setForms] = useState([])
  const [filter, setFilter] = useState('toate')
  const [expandedId, setExpandedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')
    setExpandedId('')

    listForms()
      .then((data) => {
        if (active) setForms(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!active) return
        setForms([])
        setError(err.message || 'Formularele nu au putut fi încărcate.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const legal = content?.site?.legal || {}

  const counts = {
    toate: forms.length,
    primit: forms.filter((form) => form.status === 'primit').length,
    depus: forms.filter((form) => form.status === 'depus').length,
  }

  const visible = forms.filter((form) => filter === 'toate' || form.status === filter)

  const handleStatus = async (form, status) => {
    setError('')

    try {
      await setStatus(form.id, status)
      setForms((prev) =>
        prev.map((item) =>
          item.id === form.id
            ? {
                ...item,
                status,
                submittedAt: status === 'depus' ? new Date().toISOString() : null,
              }
            : item
        )
      )
    } catch (err) {
      setError(err.message || 'Statusul formularului nu a putut fi schimbat.')
    }
  }

  const handleDelete = async (form) => {
    if (
      !window.confirm(`Ștergi definitiv formularul ${form.code}? Datele nu mai pot fi recuperate.`)
    ) {
      return
    }

    setError('')

    try {
      await deleteForm(form.id)
      setForms((prev) => prev.filter((item) => item.id !== form.id))
    } catch (err) {
      setError(err.message || 'Formularul nu a putut fi șters.')
    }
  }

  const handleExport = async (status) => {
    setError('')
    setExporting(true)

    try {
      await downloadCsv(status)
    } catch (err) {
      setError(err.message || 'Exportul nu a putut fi descărcat.')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = (form) => {
    if (!form.data) {
      setError('Formularul nu are date care pot fi printate.')
      return
    }

    const popup = window.open('', '_blank', 'width=800,height=900')

    if (!popup) {
      setError('Fereastra de printare a fost blocată de browser.')
      return
    }

    const triggerPrint = () => {
      popup.focus()
      popup.print()
    }

    popup.document.write(buildPrintHtml(form, legal))
    popup.document.close()

    if (popup.document.readyState === 'complete') triggerPrint()
    else popup.addEventListener('load', triggerPrint, { once: true })
  }

  return (
    <>
      {error && <p className="text-danger">{error}</p>}

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <div className="btn-group btn-group-sm" role="group" aria-label="Filtru formulare">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`btn ${filter === item.value ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label} ({counts[item.value]})
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handleExport('primit')}
          disabled={exporting}
        >
          Exportă CSV (primite)
        </button>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => handleExport('toate')}
          disabled={exporting}
        >
          Exportă CSV (toate)
        </button>
      </div>

      <p className="small text-muted">
        Exportul conține CNP-uri. Păstrează fișierul în siguranță și șterge-l după ce depui
        formularele.
      </p>

      {loading && <p>Se încarcă…</p>}
      {!loading && forms.length === 0 && <p>Nu ai formulare primite.</p>}
      {!loading && forms.length > 0 && visible.length === 0 && (
        <p>Nu există formulare pentru filtrul ales.</p>
      )}

      {!loading && visible.length > 0 && (
        <ul className="list-unstyled mb-0">
          {visible.map((form) => (
            <li key={form.id} className="border-bottom pb-3 mb-3">
              <div className="small">
                <div className="fw-bold">
                  {form.code} — {form.data ? fullName(form.data) : '(date indisponibile)'}
                </div>
                <div className="text-muted">{formatDate(form.createdAt)}</div>
                <div className="mt-1">
                  {form.status === 'depus' ? (
                    <span className="badge bg-success">
                      Depus la ANAF pe {formatDate(form.submittedAt)}
                    </span>
                  ) : (
                    <span className="badge bg-secondary">Primit</span>
                  )}
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => setExpandedId(expandedId === form.id ? '' : form.id)}
                >
                  {expandedId === form.id ? 'Ascunde' : 'Detalii'}
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => handlePrint(form)}
                >
                  Printează
                </button>

                {form.status === 'depus' ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleStatus(form, 'primit')}
                  >
                    Marchează ca primit
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleStatus(form, 'depus')}
                  >
                    Marchează ca depus
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDelete(form)}
                >
                  Șterge
                </button>
              </div>

              {expandedId === form.id && (
                <>
                  {form.error && <p className="text-danger small mt-2 mb-0">{form.error}</p>}
                  {form.data ? (
                    <dl className="row small mb-0 mt-3">
                      <DetailRow label="Nume">{showValue(form.data.lastName)}</DetailRow>
                      <DetailRow label="Inițiala tatălui">
                        {showValue(form.data.fatherInitial)}
                      </DetailRow>
                      <DetailRow label="Prenume">{showValue(form.data.firstName)}</DetailRow>
                      <DetailRow label="CNP">{showValue(form.data.cnp)}</DetailRow>
                      <DetailRow label="Stradă">{showValue(form.data.street)}</DetailRow>
                      <DetailRow label="Număr">{showValue(form.data.number)}</DetailRow>
                      <DetailRow label="Bloc">{showValue(form.data.block)}</DetailRow>
                      <DetailRow label="Scară">{showValue(form.data.staircase)}</DetailRow>
                      <DetailRow label="Etaj">{showValue(form.data.floor)}</DetailRow>
                      <DetailRow label="Apartament">{showValue(form.data.apartment)}</DetailRow>
                      <DetailRow label="Județ/Sector">{showValue(form.data.county)}</DetailRow>
                      <DetailRow label="Localitate">{showValue(form.data.city)}</DetailRow>
                      <DetailRow label="Cod poștal">{showValue(form.data.postalCode)}</DetailRow>
                      <DetailRow label="Telefon">{showValue(form.data.phone)}</DetailRow>
                      <DetailRow label="Email">
                        {form.data.email ? (
                          <a href={`mailto:${form.data.email}`}>{form.data.email}</a>
                        ) : (
                          '—'
                        )}
                      </DetailRow>
                      <DetailRow label="Opțiune 2 ani">{yesNo(form.data.twoYears)}</DetailRow>
                      <DetailRow label="Acord transmitere date">
                        {yesNo(form.data.shareData)}
                      </DetailRow>
                      <DetailRow label="Data acordului">
                        {showValue(formatDate(form.data.consentAt))}
                      </DetailRow>
                      <DetailRow label="Semnătura">
                        {signatureSource(form.data) ? (
                          <img
                            src={signatureSource(form.data)}
                            alt="Semnătura"
                            style={{ maxHeight: 120, background: '#fff' }}
                          />
                        ) : (
                          '—'
                        )}
                      </DetailRow>
                    </dl>
                  ) : (
                    <p className="text-danger small mt-2 mb-0">
                      Datele formularului nu pot fi afișate.
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function F230Panel({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Formulare 230">
      {open && <F230View />}
    </Modal>
  )
}
