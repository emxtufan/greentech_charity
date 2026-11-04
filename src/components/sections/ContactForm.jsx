import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { EditableParagraphs, EditableText, ListItem, useField } from '../editable'
import useContent from '../../hooks/useContent'
import { sendMessage } from '../../services/messageService'
import { isValidEmail } from '../../utils/helpers'

export const defaultData = {
  anchor: 'formular',
  bg: 'light',
  eyebrow: 'Contact',
  title: 'Titlu',
  intro: '',
  topics: [{ key: 'altceva', label: 'Altceva' }],
  situationNote: '',
  privacyNote: '',
  nameLabel: 'Nume',
  emailLabel: 'Email',
  phoneLabel: 'Telefon (opțional)',
  topicLabel: 'Subiect',
  messageLabel: 'Mesaj',
  consentText: 'Sunt de acord cu prelucrarea datelor.',
  consentLinkLabel: 'Detalii',
  submitLabel: 'Trimite',
  sendingLabel: 'Se trimite…',
  successText: 'Mesajul a fost trimis.',
  errorText: 'Mesajul nu a putut fi trimis.',
}

export default function ContactForm() {
  const { editMode } = useContent()
  const location = useLocation()

  const { value: anchor } = useField('anchor')
  const { value: bg } = useField('bg')
  const { value: topics = [] } = useField('topics')
  const { value: consentLinkLabel } = useField('consentLinkLabel')
  const { value: submitLabel } = useField('submitLabel')
  const { value: sendingLabel } = useField('sendingLabel')
  const { value: errorText } = useField('errorText')

  const topicFromLocation = (list) => {
    const key = new URLSearchParams(location.search).get('subiect')
    const items = list || []

    return items.some((item) => item?.key === key) ? key : items[0]?.key || ''
  }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [topic, setTopic] = useState(() => topicFromLocation(topics))
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  // subiectul se ia din query (?subiect=...) doar când se schimbă adresa
  useEffect(() => {
    setTopic(topicFromLocation(topics))
  }, [location.search])

  const clearError = (field) => {
    setErrors((previous) => (previous[field] ? { ...previous, [field]: '' } : previous))
  }

  const update = (setter, field) => (event) => {
    setter(event.target.value)
    clearError(field)
  }

  const validate = () => {
    const nextErrors = {}

    if (name.trim().length < 2) nextErrors.name = 'Te rugăm să scrii numele tău.'
    if (!isValidEmail(email)) nextErrors.email = 'Adresa de email nu pare corectă.'
    if (message.trim().length < 10) {
      nextErrors.message = 'Scrie-ne câteva cuvinte în plus, te rugăm.'
    }
    if (!consent) nextErrors.consent = 'Avem nevoie de acordul tău ca să îți putem răspunde.'

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate()
    setErrors(nextErrors)
    setServerError('')

    if (Object.keys(nextErrors).length > 0) return

    setStatus('sending')

    try {
      await sendMessage({ name, email, phone, topic, message, consent, website })
      setStatus('sent')
    } catch (error) {
      setServerError(error.message || errorText)
      setStatus('idle')
    }
  }

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
            <div className="gt-form-card mt-40">
              {status === 'sent' ? (
                <div className="gt-success">
                  <EditableParagraphs field="successText" />
                </div>
              ) : (
                <form noValidate onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="gt-name">
                      <EditableText field="nameLabel" as="span" />
                    </label>
                    <input
                      id="gt-name"
                      name="name"
                      type="text"
                      className={`form-control${errors.name ? ' is-invalid' : ''}`}
                      autoComplete="name"
                      maxLength={100}
                      value={name}
                      onChange={update(setName, 'name')}
                    />
                    <div className="invalid-feedback">{errors.name}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="gt-email">
                      <EditableText field="emailLabel" as="span" />
                    </label>
                    <input
                      id="gt-email"
                      name="email"
                      type="email"
                      className={`form-control${errors.email ? ' is-invalid' : ''}`}
                      autoComplete="email"
                      maxLength={150}
                      value={email}
                      onChange={update(setEmail, 'email')}
                    />
                    <div className="invalid-feedback">{errors.email}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="gt-phone">
                      <EditableText field="phoneLabel" as="span" />
                    </label>
                    <input
                      id="gt-phone"
                      name="phone"
                      type="tel"
                      className="form-control"
                      autoComplete="tel"
                      maxLength={30}
                      value={phone}
                      onChange={update(setPhone, 'phone')}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="gt-topic">
                      <EditableText field="topicLabel" as="span" />
                    </label>
                    <select
                      id="gt-topic"
                      name="topic"
                      className="form-select"
                      value={topic}
                      onChange={update(setTopic, 'topic')}
                    >
                      {topics.map((item, index) => (
                        <option key={item?.key || index} value={item?.key}>
                          {item?.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="gt-message">
                      <EditableText field="messageLabel" as="span" />
                    </label>
                    <textarea
                      id="gt-message"
                      name="message"
                      className={`form-control${errors.message ? ' is-invalid' : ''}`}
                      rows={6}
                      maxLength={4000}
                      value={message}
                      onChange={update(setMessage, 'message')}
                    />
                    <div className="invalid-feedback">{errors.message}</div>
                    {topic === 'situatie' && (
                      <div className="gt-form-hint">
                        <EditableParagraphs field="situationNote" />
                      </div>
                    )}
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

                  <div className="form-check mt-20">
                    <input
                      id="gt-consent"
                      name="consent"
                      type="checkbox"
                      className={`form-check-input${errors.consent ? ' is-invalid' : ''}`}
                      checked={consent}
                      onChange={(event) => {
                        setConsent(event.target.checked)
                        clearError('consent')
                      }}
                    />
                    <label className="form-check-label" htmlFor="gt-consent">
                      <EditableText field="consentText" as="span" />{' '}
                      <Link to="/confidentialitate">{consentLinkLabel}</Link>
                    </label>
                    <div className="invalid-feedback">{errors.consent}</div>
                  </div>

                  <div className="gt-form-hint">
                    <EditableParagraphs field="privacyNote" />
                  </div>

                  <button type="submit" className="btn-one mt-20" disabled={status === 'sending'}>
                    {status === 'sending' ? sendingLabel : submitLabel}
                  </button>

                  {serverError && <p className="gt-error mt-15">{serverError}</p>}
                </form>
              )}
            </div>

            {editMode && (
              <div className="mt-30">
                <small className="text-muted d-block">Subiecte din listă (editare)</small>
                {topics.map((item, index) => (
                  <ListItem key={index} field="topics" index={index}>
                    <div>
                      <EditableText field="label" as="span" />{' '}
                      <small className="text-muted">({item?.key})</small>
                    </div>
                  </ListItem>
                ))}
                <div className="mt-20">
                  <small className="text-muted d-block">Text buton</small>
                  <EditableText field="submitLabel" as="div" />
                  <EditableText field="sendingLabel" as="div" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
