import { useEffect, useState } from 'react'
import Modal from '../common/Modal'
import useContent from '../../hooks/useContent'
import { SOCIAL_NETWORKS, isValidUrl } from '../../utils/social'

const LEGAL_FIELDS = [
  { key: 'name', label: 'Denumire legală' },
  { key: 'cif', label: 'Cod de identificare fiscală (CIF)' },
  { key: 'registry', label: 'Nr. în Registrul asociațiilor și fundațiilor' },
  { key: 'address', label: 'Sediu' },
  { key: 'representative', label: 'Reprezentant legal' },
  { key: 'iban', label: 'Cont bancar (IBAN)' },
  { key: 'bank', label: 'Banca' },
]

const CONTACT_FIELDS = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefon' },
  { key: 'address', label: 'Adresă' },
]

const SOCIAL_FIELDS = SOCIAL_NETWORKS.map(({ key, label }) => ({ key, label }))

const toText = (value) => (value === undefined || value === null ? '' : String(value))

const pickFields = (source, fields) => {
  const result = {}

  fields.forEach(({ key }) => {
    result[key] = toText(source?.[key])
  })

  return result
}

const normalizeIban = (value) => String(value ?? '').replace(/\s+/g, '').toUpperCase()

export function OrgDataView({ onCancel }) {
  const { content, update, save } = useContent()

  const [legalLocal, setLegalLocal] = useState(() => pickFields(null, LEGAL_FIELDS))
  const [contactLocal, setContactLocal] = useState(() => pickFields(null, CONTACT_FIELDS))
  const [socialLocal, setSocialLocal] = useState(() => pickFields(null, SOCIAL_FIELDS))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const site = content?.site || {}

    setLegalLocal(pickFields(site.legal, LEGAL_FIELDS))
    setContactLocal(pickFields(site.contact, CONTACT_FIELDS))
    setSocialLocal(pickFields(site.social, SOCIAL_FIELDS))
    setFormError('')
    setSaved(false)
    // se reîncarcă doar la montare, ca să nu pierdem modificările locale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLegalChange = (key, value) => {
    setLegalLocal((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleContactChange = (key, value) => {
    setContactLocal((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSocialChange = (key, value) => {
    setSocialLocal((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  // gol e permis; orice valoare completată trebuie să fie URL absolut http/https
  const invalidSocial = (key) => {
    const value = socialLocal[key].trim()
    return value !== '' && !isValidUrl(value)
  }

  const handleSave = async () => {
    if (!content) {
      setFormError('Conținutul nu este încărcat.')
      return
    }

    const invalidLabels = SOCIAL_FIELDS.filter(({ key }) => invalidSocial(key)).map(
      ({ label }) => label,
    )

    if (invalidLabels.length > 0) {
      setSaved(false)
      setFormError(
        `Link invalid (folosește http:// sau https://) pentru: ${invalidLabels.join(', ')}.`,
      )
      return
    }

    const nextLegal = { ...legalLocal, iban: normalizeIban(legalLocal.iban) }
    const nextContact = { ...contactLocal }
    const nextSocial = {}
    SOCIAL_FIELDS.forEach(({ key }) => {
      nextSocial[key] = toText(socialLocal[key]).trim()
    })

    setLegalLocal(nextLegal)
    setSocialLocal(nextSocial)
    setSaving(true)
    setSaved(false)
    setFormError('')

    try {
      update(['site', 'legal'], { ...content.site?.legal, ...nextLegal })
      update(['site', 'contact'], { ...content.site?.contact, ...nextContact })
      update(['site', 'social'], { ...content.site?.social, ...nextSocial })
      await save()
      setSaved(true)
    } catch (err) {
      setFormError(err.message || 'Datele nu au putut fi salvate.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <p className="text-muted small">
        Datele apar pe site (pagina de contact, footer, Formularul 230). Formularul 230 online se
        activează doar când sunt completate denumirea, CIF-ul și IBAN-ul.
      </p>

      <h6 className="mb-3">Date de identificare</h6>

      {LEGAL_FIELDS.map(({ key, label }) => (
        <div className="mb-2" key={key}>
          <label className="form-label small mb-1" htmlFor={`org-legal-${key}`}>
            {label}
          </label>
          <input
            id={`org-legal-${key}`}
            type="text"
            className="form-control form-control-sm"
            value={legalLocal[key]}
            onChange={(event) => handleLegalChange(key, event.target.value)}
          />
        </div>
      ))}

      <h6 className="mb-3 mt-4">Contact public</h6>

      {CONTACT_FIELDS.map(({ key, label }) => (
        <div className="mb-2" key={key}>
          <label className="form-label small mb-1" htmlFor={`org-contact-${key}`}>
            {label}
          </label>
          <input
            id={`org-contact-${key}`}
            type="text"
            className="form-control form-control-sm"
            value={contactLocal[key]}
            onChange={(event) => handleContactChange(key, event.target.value)}
          />
        </div>
      ))}

      <h6 className="mb-3 mt-4">Rețele sociale</h6>

      {SOCIAL_FIELDS.map(({ key, label }) => (
        <div className="mb-2" key={key}>
          <label className="form-label small mb-1" htmlFor={`org-social-${key}`}>
            {label}
          </label>
          <input
            id={`org-social-${key}`}
            type="url"
            className={`form-control form-control-sm${invalidSocial(key) ? ' is-invalid' : ''}`}
            placeholder={`https://www.${key}.com/...`}
            value={socialLocal[key]}
            onChange={(event) => handleSocialChange(key, event.target.value)}
          />
        </div>
      ))}

      <p className="text-muted small mt-2 mb-0">
        Lasă gol dacă nu vrei să afișezi rețeaua. Se acceptă doar linkuri complete (http:// sau
        https://).
      </p>

      {formError && <p className="text-danger mt-3 mb-0">{formError}</p>}

      <div className="d-flex align-items-center gap-2 mt-3">
        <button
          type="button"
          className="btn btn-sm btn-success"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Se salvează…' : 'Salvează pe site'}
        </button>

        {onCancel && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel}>
            Anulează
          </button>
        )}

        {saved && <span className="text-success small">Salvat ✓</span>}
      </div>
    </>
  )
}

export default function OrgDataPanel({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Date asociație">
      {open && <OrgDataView onCancel={onClose} />}
    </Modal>
  )
}
