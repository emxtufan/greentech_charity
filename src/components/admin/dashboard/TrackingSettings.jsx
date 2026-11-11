import { useEffect, useState } from 'react'
import useContent from '../../../hooks/useContent'
import { TRACKING_FIELDS, normalizeTracking, trackingError } from '../../../../shared/tracking'

export default function TrackingSettings() {
  const { content, update, save } = useContent()
  const [local, setLocal] = useState(() => normalizeTracking(content?.site?.tracking))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!dirty) setLocal(normalizeTracking(content?.site?.tracking))
  }, [content?.site?.tracking, dirty])

  const handleSave = async (event) => {
    event.preventDefault()
    const next = normalizeTracking(local)
    const validationError = trackingError(next)
    setLocal(next)
    setError(validationError)
    setSaved(false)
    if (validationError || !content) return
    setSaving(true)
    try {
      update(['site', 'tracking'], next)
      await save()
      setDirty(false)
      setSaved(true)
    } catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }

  return <form className="gt-admin-card" onSubmit={handleSave}>
    <h2 className="h5">Analiză și publicitate</h2>
    <fieldset disabled={saving}>
      {TRACKING_FIELDS.map(({ key, label, placeholder }) => <div className="mb-3" key={key}>
        <label className="form-label" htmlFor={`tracking-${key}`}>{label}</label>
        <input id={`tracking-${key}`} className="form-control" value={local[key]} placeholder={placeholder} maxLength={100} onChange={(event) => {
          setLocal((previous) => ({ ...previous, [key]: event.target.value }))
          setDirty(true)
          setSaved(false)
          setError('')
        }} />
      </div>)}
      <p className="text-muted small">Analytics și Clarity se încarcă după acordul pentru analiză. Ads, Meta și TikTok folosesc acordul pentru marketing.</p>
      <p className="text-muted small">Pentru alte platforme poți folosi Tag Manager. Configurează consimțământul fiecărui tag în GTM și instalează fiecare platformă o singură dată, direct sau prin GTM.</p>
      <p className="text-muted small">După schimbarea codurilor, deschide o pagină nouă a site-ului pentru verificare.</p>
      <p className="text-muted small">Site-ul trimite vizualizările paginilor și conversia formularului de contact. Pentru numărare unică, dezactivează în GA4 măsurarea automată a vizualizărilor bazate pe schimbările istoricului. GTM primește evenimentele virtual_page_view și generate_lead.</p>
      {error && <p className="text-danger" role="alert">{error}</p>}
      {saved && <p className="text-success" role="status">Salvat ✓</p>}
      <button className="btn btn-success" type="submit">{saving ? 'Se salvează…' : 'Salvează codurile'}</button>
    </fieldset>
  </form>
}
