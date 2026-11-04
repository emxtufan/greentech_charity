import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EditableParagraphs, EditableText, useField } from '../editable'
import useContent from '../../hooks/useContent'
import { getStatus, submitForm } from '../../services/f230Service'
import { isValidEmail } from '../../utils/helpers'
import SignaturePad from '../common/SignaturePad'

export const defaultData = {
  anchor: 'completeaza-online',
  bg: 'light',
  eyebrow: 'Online',
  title: 'Titlu',
  intro: '',
  acceptUntil: '2027-05-20',
  closedText: 'Text',
  disabledText: 'Text',
  missingOrgText: 'Text',
  step1Title: 'Datele tale',
  step2Title: 'Verifică și semnează',
  shareDataText: 'Text',
  twoYearsText: 'Text',
  consentText: 'Text',
  consentLinkLabel: 'Detalii',
  signatureLabel: 'Semnătura',
  signatureHint: '',
  clearLabel: 'Șterge semnătura',
  backLabel: 'Înapoi',
  nextLabel: 'Continuă',
  submitLabel: 'Trimite',
  sendingLabel: 'Se trimite…',
  successText: 'Text',
  note: '',
}

const CNP_KEY = '279146358279'
const POSTAL_CODE_RE = /^\d{6}$/
const REQUIRED_MESSAGE = 'Câmp obligatoriu.'
const REQUIRED_FIELDS = ['lastName', 'firstName', 'cnp', 'street', 'number', 'county', 'city']

// cheia stării blocată -> câmpul cu textul afișat în locul formularului
const BLOCKED_FIELDS = {
  disabled: 'disabledText',
  org: 'missingOrgText',
  closed: 'closedText',
}

const emptyForm = {
  lastName: '',
  fatherInitial: '',
  firstName: '',
  cnp: '',
  phone: '',
  street: '',
  number: '',
  block: '',
  staircase: '',
  floor: '',
  apartment: '',
  county: '',
  city: '',
  postalCode: '',
  email: '',
  twoYears: false,
  shareData: false,
}

// aceeași regulă ca pe server: 13 cifre + cifra de control
const isValidCnp = (cnp) => {
  if (!/^\d{13}$/.test(cnp)) return false

  let sum = 0
  for (let i = 0; i < 12; i += 1) {
    sum += Number(cnp[i]) * Number(CNP_KEY[i])
  }

  let control = sum % 11
  if (control === 10) control = 1

  return control === Number(cnp[12])
}

function TextField({ id, col, label, error, inputMode, ...rest }) {
  return (
    <div className={col}>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`form-control${error ? ' is-invalid' : ''}`}
        inputMode={inputMode}
        {...rest}
      />
      <div className="invalid-feedback">{error}</div>
    </div>
  )
}

export default function Form230Online() {
  const { content, editMode } = useContent()

  const { value: anchor } = useField('anchor')
  const { value: bg } = useField('bg')
  const { value: acceptUntil } = useField('acceptUntil')
  const { value: consentLinkLabel } = useField('consentLinkLabel')
  const { value: clearLabel } = useField('clearLabel')
  const { value: backLabel } = useField('backLabel')
  const { value: nextLabel } = useField('nextLabel')
  const { value: submitLabel } = useField('submitLabel')
  const { value: sendingLabel } = useField('sendingLabel')
  const { value: note } = useField('note')

  const cardRef = useRef(null)
  const signatureRef = useRef(null)

  const [enabled, setEnabled] = useState(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(emptyForm)
  const [consent, setConsent] = useState(false)
  const [signature, setSignature] = useState(null)
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    let active = true

    getStatus()
      .then((data) => {
        if (active) setEnabled(data?.enabled === true)
      })
      .catch(() => {
        if (active) setEnabled(false)
      })

    return () => {
      active = false
    }
  }, [])

  const legal = content?.site?.legal || {}
  const orgReady = !!(legal.name && legal.cif && legal.iban)
  const closed = new Date() > new Date(`${acceptUntil || ''}T23:59:59`)

  const blocked = enabled !== true ? 'disabled' : !orgReady ? 'org' : closed ? 'closed' : ''
  // cât timp getStatus() nu a răspuns nu se afișează nimic; în editMode formularul
  // rămâne vizibil chiar dacă e blocat, ca să poată fi editat textul din el
  const showForm = enabled !== null && (editMode || !blocked)

  const change = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => (previous[name] ? { ...previous, [name]: '' } : previous))
  }

  const validate = () => {
    const nextErrors = {}

    REQUIRED_FIELDS.forEach((name) => {
      if (!String(form[name]).trim()) nextErrors[name] = REQUIRED_MESSAGE
    })

    const cnp = form.cnp.trim()
    if (cnp && !isValidCnp(cnp)) nextErrors.cnp = 'CNP-ul nu pare corect.'

    const postalCode = form.postalCode.trim()
    if (postalCode && !POSTAL_CODE_RE.test(postalCode)) {
      nextErrors.postalCode = 'Codul poștal are 6 cifre.'
    }

    const email = form.email.trim()
    if (email && !isValidEmail(email)) nextErrors.email = 'Adresa de email nu pare corectă.'

    return nextErrors
  }

  const scrollToCard = () => {
    const card = cardRef.current
    if (!card) return

    window.scrollTo({
      top: card.getBoundingClientRect().top + window.scrollY - 20,
      behavior: 'smooth',
    })
  }

  const goNext = () => {
    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setStep(2)
    scrollToCard()
  }

  const goBack = () => {
    setStep(1)
    scrollToCard()
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
    setSignature(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setStep(1)
      scrollToCard()
      return
    }

    setSubmitError('')
    setStatus('sending')

    try {
      const result = await submitForm({
        ...form,
        consent,
        signature: signature || '',
        website,
      })

      setCode(result?.code || '')
      setStatus('sent')
      setStep(1)
      setForm(emptyForm)
      setConsent(false)
      setSignature(null)
      setWebsite('')
      setErrors({})
      signatureRef.current?.clear()
    } catch (error) {
      setSubmitError(error.message)
      setStatus('idle')
    }
  }

  const fullName = [form.lastName.trim(), form.fatherInitial.trim(), form.firstName.trim()]
    .filter(Boolean)
    .join(' ')

  const address = [
    form.street.trim() && `str. ${form.street.trim()}`,
    form.number.trim() && `nr. ${form.number.trim()}`,
    form.block.trim() && `bl. ${form.block.trim()}`,
    form.staircase.trim() && `sc. ${form.staircase.trim()}`,
    form.floor.trim() && `et. ${form.floor.trim()}`,
    form.apartment.trim() && `ap. ${form.apartment.trim()}`,
    form.city.trim(),
    form.county.trim(),
    form.postalCode.trim(),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <section id={anchor || undefined} className={`gt-section gt-bg-${bg || 'light'}`}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="title-one text-center">
              <EditableText field="eyebrow" as="div" className="upper-title font-amita" />
              <EditableText field="title" as="h2" />
            </div>
            <EditableParagraphs field="intro" className="gt-text gt-intro text-center" />

            {enabled !== null && !showForm && (
              <div className="gt-note">
                <EditableParagraphs field={BLOCKED_FIELDS[blocked]} />
              </div>
            )}

            {showForm && (
              <div className="gt-form-card mt-40" ref={cardRef}>
                {status === 'sent' ? (
                  <div className="gt-success">
                    <EditableParagraphs field="successText" />
                    <p className="mb-0 mt-10">
                      <strong>Codul formularului: {code}</strong>
                    </p>
                  </div>
                ) : (
                  <form noValidate onSubmit={handleSubmit}>
                    {step === 1 ? (
                      <>
                        <EditableText field="step1Title" as="h4" />

                        <div className="row g-3">
                          <TextField
                            col="col-md-5"
                            id="gt-f230-last-name"
                            name="lastName"
                            label="Nume*"
                            autoComplete="family-name"
                            maxLength={75}
                            value={form.lastName}
                            onChange={change('lastName')}
                            error={errors.lastName}
                          />
                          <TextField
                            col="col-md-2"
                            id="gt-f230-father-initial"
                            name="fatherInitial"
                            label="Inițiala tatălui"
                            maxLength={3}
                            value={form.fatherInitial}
                            onChange={change('fatherInitial')}
                            error={errors.fatherInitial}
                          />
                          <TextField
                            col="col-md-5"
                            id="gt-f230-first-name"
                            name="firstName"
                            label="Prenume*"
                            autoComplete="given-name"
                            maxLength={75}
                            value={form.firstName}
                            onChange={change('firstName')}
                            error={errors.firstName}
                          />
                          <TextField
                            col="col-md-6"
                            id="gt-f230-cnp"
                            name="cnp"
                            label="CNP*"
                            inputMode="numeric"
                            maxLength={13}
                            value={form.cnp}
                            onChange={change('cnp')}
                            error={errors.cnp}
                          />
                          <TextField
                            col="col-md-6"
                            id="gt-f230-phone"
                            name="phone"
                            type="tel"
                            label="Telefon (opțional)"
                            autoComplete="tel"
                            maxLength={30}
                            value={form.phone}
                            onChange={change('phone')}
                            error={errors.phone}
                          />
                          <TextField
                            col="col-md-8"
                            id="gt-f230-street"
                            name="street"
                            label="Strada*"
                            autoComplete="address-line1"
                            maxLength={100}
                            value={form.street}
                            onChange={change('street')}
                            error={errors.street}
                          />
                          <TextField
                            col="col-md-4"
                            id="gt-f230-number"
                            name="number"
                            label="Număr*"
                            maxLength={100}
                            value={form.number}
                            onChange={change('number')}
                            error={errors.number}
                          />
                          <TextField
                            col="col-6 col-md-3"
                            id="gt-f230-block"
                            name="block"
                            label="Bloc"
                            maxLength={10}
                            value={form.block}
                            onChange={change('block')}
                            error={errors.block}
                          />
                          <TextField
                            col="col-6 col-md-3"
                            id="gt-f230-staircase"
                            name="staircase"
                            label="Scara"
                            maxLength={10}
                            value={form.staircase}
                            onChange={change('staircase')}
                            error={errors.staircase}
                          />
                          <TextField
                            col="col-6 col-md-3"
                            id="gt-f230-floor"
                            name="floor"
                            label="Etaj"
                            maxLength={10}
                            value={form.floor}
                            onChange={change('floor')}
                            error={errors.floor}
                          />
                          <TextField
                            col="col-6 col-md-3"
                            id="gt-f230-apartment"
                            name="apartment"
                            label="Ap."
                            maxLength={10}
                            value={form.apartment}
                            onChange={change('apartment')}
                            error={errors.apartment}
                          />
                          <TextField
                            col="col-md-6"
                            id="gt-f230-county"
                            name="county"
                            label="Județ / Sector*"
                            maxLength={100}
                            value={form.county}
                            onChange={change('county')}
                            error={errors.county}
                          />
                          <TextField
                            col="col-md-6"
                            id="gt-f230-city"
                            name="city"
                            label="Localitate*"
                            maxLength={100}
                            value={form.city}
                            onChange={change('city')}
                            error={errors.city}
                          />
                          <TextField
                            col="col-md-6"
                            id="gt-f230-postal-code"
                            name="postalCode"
                            label="Cod poștal"
                            maxLength={6}
                            value={form.postalCode}
                            onChange={change('postalCode')}
                            error={errors.postalCode}
                          />
                          <TextField
                            col="col-md-6"
                            id="gt-f230-email"
                            name="email"
                            type="email"
                            label="Email (opțional)"
                            autoComplete="email"
                            maxLength={150}
                            value={form.email}
                            onChange={change('email')}
                            error={errors.email}
                          />
                        </div>

                        <div className="form-check mt-20">
                          <input
                            id="gt-f230-two-years"
                            name="twoYears"
                            type="checkbox"
                            className="form-check-input"
                            checked={form.twoYears}
                            onChange={change('twoYears')}
                          />
                          <label className="form-check-label" htmlFor="gt-f230-two-years">
                            <EditableText field="twoYearsText" as="span" />
                          </label>
                        </div>

                        <div className="form-check">
                          <input
                            id="gt-f230-share-data"
                            name="shareData"
                            type="checkbox"
                            className="form-check-input"
                            checked={form.shareData}
                            onChange={change('shareData')}
                          />
                          <label className="form-check-label" htmlFor="gt-f230-share-data">
                            <EditableText field="shareDataText" as="span" />
                          </label>
                        </div>

                        <button type="button" className="btn-one mt-20" onClick={goNext}>
                          {nextLabel}
                        </button>
                      </>
                    ) : (
                      <>
                        <EditableText field="step2Title" as="h4" />

                        <dl className="gt-info-list mt-20">
                          <dt>Nume</dt>
                          <dd>{fullName}</dd>
                          <dt>CNP</dt>
                          <dd>{form.cnp}</dd>
                          <dt>Adresa</dt>
                          <dd>{address}</dd>
                          {form.phone.trim() && (
                            <>
                              <dt>Telefon</dt>
                              <dd>{form.phone}</dd>
                            </>
                          )}
                          {form.email.trim() && (
                            <>
                              <dt>Email</dt>
                              <dd>{form.email}</dd>
                            </>
                          )}
                          <dt>Opțiunea pentru 2 ani</dt>
                          <dd>{form.twoYears ? 'DA' : 'NU'}</dd>
                          <dt>Acord transmitere date către entitate</dt>
                          <dd>{form.shareData ? 'DA' : 'NU'}</dd>
                        </dl>

                        <h5 className="mt-30">Entitatea care primește suma</h5>
                        <dl className="gt-info-list">
                          <dt>Denumire</dt>
                          <dd>{legal.name}</dd>
                          <dt>CIF</dt>
                          <dd>{legal.cif}</dd>
                          <dt>IBAN</dt>
                          <dd>{legal.iban}</dd>
                          <dt>Suma</dt>
                          <dd>o calculează ANAF</dd>
                        </dl>

                        <label className="form-label mt-30">
                          <EditableText field="signatureLabel" as="span" />
                        </label>
                        <EditableParagraphs field="signatureHint" className="gt-form-hint" />
                        <SignaturePad ref={signatureRef} onChange={setSignature} />
                        <button
                          type="button"
                          className="btn btn-link p-0 mt-10"
                          onClick={clearSignature}
                        >
                          {clearLabel}
                        </button>

                        <div className="form-check mt-20">
                          <input
                            id="gt-f230-consent"
                            name="consent"
                            type="checkbox"
                            className="form-check-input"
                            checked={consent}
                            onChange={(event) => setConsent(event.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="gt-f230-consent">
                            <EditableText field="consentText" as="span" />{' '}
                            <Link to="/confidentialitate">{consentLinkLabel}</Link>
                          </label>
                        </div>

                        <div className="gt-hp" aria-hidden="true">
                          <label>
                            Website
                            <input
                              name="website"
                              type="text"
                              tabIndex={-1}
                              autoComplete="off"
                              value={website}
                              onChange={(event) => setWebsite(event.target.value)}
                            />
                          </label>
                        </div>

                        <div className="d-flex gap-3 mt-20">
                          <button type="button" className="btn-two" onClick={goBack}>
                            {backLabel}
                          </button>
                          <button
                            type="submit"
                            className="btn-one"
                            disabled={!signature || !consent || status === 'sending'}
                          >
                            {status === 'sending' ? sendingLabel : submitLabel}
                          </button>
                        </div>

                        {submitError && <p className="gt-error">{submitError}</p>}
                      </>
                    )}
                  </form>
                )}
              </div>
            )}

            {editMode && (
              <div className="mt-30">
                <small className="text-muted d-block">
                  Afișat când formularul online este dezactivat
                </small>
                <EditableParagraphs field="disabledText" />
                <small className="text-muted d-block mt-20">
                  Afișat când lipsesc denumirea, CIF-ul sau IBAN-ul organizației
                </small>
                <EditableParagraphs field="missingOrgText" />
                <small className="text-muted d-block mt-20">
                  Afișat când termenul de depunere a trecut
                </small>
                <EditableParagraphs field="closedText" />
              </div>
            )}

            {(note || editMode) && (
              <div className="gt-note mt-30">
                <EditableParagraphs field="note" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
