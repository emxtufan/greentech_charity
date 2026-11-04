import { useEffect, useRef, useState } from 'react'
import useContent from '../../../hooks/useContent'

const GDPR_FIELDS = [
  { key: 'title', label: 'Titlu' },
  {
    key: 'text',
    label: 'Text',
    multiline: true,
    rows: 8,
    hint: 'Paragrafe separate printr-un rând liber',
  },
  { key: 'linkLabel', label: 'Text link către politica de confidențialitate' },
  { key: 'closeLabel', label: 'Text buton închidere' },
]

const ANAF_FIELDS = [
  { key: 'title', label: 'Titlu' },
  { key: 'text', label: 'Text', multiline: true, rows: 8 },
  { key: 'linkLabel', label: 'Text link' },
  { key: 'linkUrl', label: 'Adresă link' },
  { key: 'closeLabel', label: 'Text buton închidere' },
]

const COOKIE_FIELDS = [
  { key: 'bannerText', label: 'Text banner', multiline: true, rows: 3 },
  { key: 'acceptAll', label: 'Buton „Accept toate”' },
  { key: 'rejectAll', label: 'Buton „Doar necesare”' },
  { key: 'settings', label: 'Buton „Setări”' },
  { key: 'modalTitle', label: 'Titlu fereastră' },
  { key: 'modalIntro', label: 'Introducere', multiline: true, rows: 3 },
  { key: 'necessaryTitle', label: 'Necesare – titlu' },
  { key: 'necessaryText', label: 'Necesare – text', multiline: true, rows: 2 },
  { key: 'analyticsTitle', label: 'Analiză – titlu' },
  { key: 'analyticsText', label: 'Analiză – text', multiline: true, rows: 2 },
  { key: 'marketingTitle', label: 'Marketing – titlu' },
  { key: 'marketingText', label: 'Marketing – text', multiline: true, rows: 2 },
  { key: 'save', label: 'Buton salvare' },
]

const toText = (value) => (value === undefined || value === null ? '' : String(value))

const pickFields = (source, fields) => {
  const result = {}

  fields.forEach(({ key }) => {
    result[key] = toText(source?.[key])
  })

  return result
}

function ModalCard({ modalKey, title, fields, previewUrl }) {
  const { content, update, save } = useContent()

  const [local, setLocal] = useState(() =>
    pickFields(content?.site?.modals?.[modalKey], fields)
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cardError, setCardError] = useState('')

  const savedTimer = useRef(null)
  const source = content?.site?.modals?.[modalKey]

  useEffect(() => {
    // nu suprascriem modificările locale nesalvate
    if (dirty) return

    setLocal(pickFields(source, fields))
    // fields este o constantă de modul
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, dirty])

  useEffect(
    () => () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current)
    },
    []
  )

  const handleChange = (key, value) => {
    setLocal((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    setSaved(false)
    setCardError('')
  }

  const handleSave = async () => {
    if (!content) {
      setCardError('Conținutul nu este încărcat.')
      return
    }

    setSaving(true)
    setSaved(false)
    setCardError('')

    try {
      update(['site', 'modals', modalKey], { ...local })
      await save()
      setDirty(false)
      setSaved(true)

      if (savedTimer.current) window.clearTimeout(savedTimer.current)
      savedTimer.current = window.setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setCardError(err.message || 'Modificările nu au putut fi salvate.')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    window.open(previewUrl, '_blank')
  }

  return (
    <div className="gt-admin-card mb-3">
      <h6 className="mb-3">{title}</h6>

      {fields.map((field) => (
        <div className="mb-2" key={field.key}>
          <label className="form-label small mb-1" htmlFor={`modal-${modalKey}-${field.key}`}>
            {field.label}
          </label>

          {field.multiline ? (
            <textarea
              id={`modal-${modalKey}-${field.key}`}
              className="form-control"
              rows={field.rows || 3}
              value={local[field.key]}
              onChange={(event) => handleChange(field.key, event.target.value)}
            />
          ) : (
            <input
              id={`modal-${modalKey}-${field.key}`}
              type="text"
              className="form-control"
              value={local[field.key]}
              onChange={(event) => handleChange(field.key, event.target.value)}
            />
          )}

          {field.hint && <div className="form-text small">{field.hint}</div>}
        </div>
      ))}

      {cardError && <p className="text-danger small mt-2 mb-0">{cardError}</p>}

      <div className="d-flex align-items-center gap-2 mt-3">
        <button
          type="button"
          className="btn btn-success btn-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Se salvează…' : 'Salvează'}
        </button>

        {previewUrl && (
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handlePreview}>
            Previzualizează pe site
          </button>
        )}

        {saved && <span className="text-success small">Salvat ✓</span>}
      </div>
    </div>
  )
}

export default function ModalsEditor() {
  return (
    <div>
      <p className="text-muted small">
        Ferestrele GDPR și ANAF se deschid din linkurile #informare-gdpr și #informatii-anaf de pe
        site. Bannerul de cookie-uri apare doar când ai setat cel puțin un cod de tracking.
      </p>

      <ModalCard
        modalKey="gdpr"
        title="Informare GDPR"
        fields={GDPR_FIELDS}
        previewUrl="/#informare-gdpr"
      />

      <ModalCard
        modalKey="anaf"
        title="Informații ANAF"
        fields={ANAF_FIELDS}
        previewUrl="/formular-230#informatii-anaf"
      />

      <ModalCard modalKey="cookie" title="Cookie-uri" fields={COOKIE_FIELDS} />
    </div>
  )
}
