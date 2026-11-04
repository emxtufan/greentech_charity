import { useEffect, useState } from 'react'
import useContent from '../../../hooks/useContent'

const GOOGLE_ID_PATTERN = /^(G-[A-Z0-9]+|GTM-[A-Z0-9]+|AW-\d+)$/
const FACEBOOK_ID_PATTERN = /^\d+$/
const TIKTOK_ID_PATTERN = /^[A-Z0-9]+$/

const FIELDS = [
  {
    key: 'googleId',
    label: 'Google (GA4 G-…, Google Ads AW-…, Tag Manager GTM-…)',
    placeholder: 'G-XXXXXXX',
  },
  { key: 'facebookPixelId', label: 'Facebook Pixel ID', hint: 'doar cifre' },
  { key: 'tiktokPixelId', label: 'TikTok Pixel ID' },
]

const toText = (value) => (value === undefined || value === null ? '' : String(value))

const pickTracking = (source) => {
  const result = {}

  FIELDS.forEach(({ key }) => {
    result[key] = toText(source?.[key])
  })

  return result
}

const normalize = (values) => ({
  googleId: toText(values?.googleId).trim().toUpperCase(),
  facebookPixelId: toText(values?.facebookPixelId).trim(),
  tiktokPixelId: toText(values?.tiktokPixelId).trim().toUpperCase(),
})

const validate = (values) => {
  if (values.googleId && !GOOGLE_ID_PATTERN.test(values.googleId)) {
    return 'Codul Google nu are formatul corect.'
  }

  if (values.facebookPixelId && !FACEBOOK_ID_PATTERN.test(values.facebookPixelId)) {
    return 'Pixelul Facebook are doar cifre.'
  }

  if (values.tiktokPixelId && !TIKTOK_ID_PATTERN.test(values.tiktokPixelId)) {
    return 'Codul TikTok nu are formatul corect.'
  }

  return ''
}

export default function TrackingSettings() {
  const { content, update, save } = useContent()

  const [local, setLocal] = useState(() => pickTracking(content?.site?.tracking))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState('')

  const source = content?.site?.tracking

  useEffect(() => {
    // nu suprascriem modificările locale nesalvate
    if (dirty) return

    setLocal(pickTracking(source))
  }, [source, dirty])

  const handleChange = (key, value) => {
    setLocal((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    setSaved(false)
    setFormError('')
  }

  const handleSave = async () => {
    if (!content) {
      setFormError('Conținutul nu este încărcat.')
      return
    }

    const next = normalize(local)
    const validationError = validate(next)

    setLocal(next)
    setSaved(false)
    setFormError(validationError)

    if (validationError) return

    setSaving(true)

    try {
      update(['site', 'tracking'], { ...content.site?.tracking, ...next })
      await save()
      setDirty(false)
      setSaved(true)
    } catch (err) {
      setFormError(err.message || 'Codurile nu au putut fi salvate.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gt-admin-card mb-3">
      <h6 className="mb-3">Coduri de tracking</h6>

      {FIELDS.map(({ key, label, placeholder, hint }) => (
        <div className="mb-2" key={key}>
          <label className="form-label small mb-1" htmlFor={`tracking-${key}`}>
            {label}
          </label>
          <input
            id={`tracking-${key}`}
            type="text"
            className="form-control"
            placeholder={placeholder}
            value={local[key]}
            onChange={(event) => handleChange(key, event.target.value)}
          />
          {hint && <div className="form-text small">{hint}</div>}
        </div>
      ))}

      <p className="text-muted small mt-3 mb-0">
        Codurile se încarcă pe site doar după ce vizitatorul își dă acordul în bannerul de
        cookie-uri. Google Analytics și Tag Manager țin de „Analiză”; Facebook, TikTok și Google Ads
        țin de „Marketing”.
      </p>

      {formError && <p className="text-danger small mt-2 mb-0">{formError}</p>}

      <div className="d-flex align-items-center gap-2 mt-3">
        <button
          type="button"
          className="btn btn-success btn-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Se salvează…' : 'Salvează'}
        </button>

        {saved && <span className="text-success small">Salvat ✓</span>}
      </div>
    </div>
  )
}
