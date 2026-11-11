import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../common/Modal'
import useContent from '../../hooks/useContent'
import { getConsent, setConsent } from '../../utils/consent'
import { hasTracking } from '../../../shared/tracking'

const POLICY_LABEL = 'Politica de cookies'

function paragraphs(text) {
  return (text || '')
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p, i) => <p key={i}>{p}</p>)
}

export default function CookieConsent() {
  const { content } = useContent()

  const [consent, setConsentState] = useState(getConsent)
  const [bannerClosed, setBannerClosed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [analytics, setAnalytics] = useState(() => Boolean(getConsent()?.analytics))
  const [marketing, setMarketing] = useState(() => Boolean(getConsent()?.marketing))

  const trackingConfigured = hasTracking(content?.site?.tracking)

  const cookie = content?.site?.modals?.cookie || {}

  useEffect(() => {
    setConsentState(getConsent())

    const onConsent = () => setConsentState(getConsent())

    window.addEventListener('gt-consent', onConsent)

    return () => window.removeEventListener('gt-consent', onConsent)
  }, [])

  useEffect(() => {
    const handleClick = (event) => {
      const anchor = event.target?.closest?.('a')
      if (!anchor) return

      const href = anchor.getAttribute('href') || ''
      if (!href.endsWith('#setari-cookie')) return

      event.preventDefault()
      setSettingsOpen(true)
    }

    document.addEventListener('click', handleClick, true)

    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  const applyConsent = (next) => {
    setConsent(next)
    setAnalytics(next.analytics)
    setMarketing(next.marketing)
    setConsentState(getConsent())
    setBannerClosed(true)
    setSettingsOpen(false)
  }

  const acceptAll = () => applyConsent({ analytics: true, marketing: true })

  const rejectAll = () => applyConsent({ analytics: false, marketing: false })

  const saveSettings = () => applyConsent({ analytics, marketing })

  const showBanner = trackingConfigured && consent === null && !bannerClosed

  return (
    <>
      {showBanner && (
        <div className="gt-cookie-banner" role="dialog">
          <p>{cookie.bannerText}</p>

          <div className="gt-cookie-actions">
            <button type="button" className="btn-one" onClick={acceptAll}>
              {cookie.acceptAll || 'Accept toate'}
            </button>

            <button type="button" className="btn-two" onClick={rejectAll}>
              {cookie.rejectAll || 'Doar cele necesare'}
            </button>

            <button
              type="button"
              className="btn btn-link"
              onClick={() => setSettingsOpen(true)}
            >
              {cookie.settings || 'Setări'}
            </button>

            <Link to="/politica-cookies" className="btn btn-link">
              {POLICY_LABEL}
            </Link>
          </div>
        </div>
      )}

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={cookie.modalTitle}
        footer={
          <button type="button" className="btn-one" onClick={saveSettings}>
            {cookie.save || 'Salvează alegerile'}
          </button>
        }
      >
        <div className="gt-modal-text">{paragraphs(cookie.modalIntro)}</div>

        <p className="mb-3">
          <Link to="/politica-cookies" onClick={() => setSettingsOpen(false)}>
            {POLICY_LABEL}
          </Link>
        </p>

        <div className="gt-cookie-row">
          <div>
            <strong>{cookie.necessaryTitle}</strong>
            <p>{cookie.necessaryText}</p>
          </div>
          <input
            type="checkbox"
            className="form-check-input"
            checked
            disabled
          />
        </div>

        <div className="gt-cookie-row">
          <div>
            <strong>{cookie.analyticsTitle}</strong>
            <p>{cookie.analyticsText}</p>
          </div>
          <input
            type="checkbox"
            className="form-check-input form-switch"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
          />
        </div>

        <div className="gt-cookie-row">
          <div>
            <strong>{cookie.marketingTitle}</strong>
            <p>{cookie.marketingText}</p>
          </div>
          <input
            type="checkbox"
            className="form-check-input"
            checked={marketing}
            onChange={(event) => setMarketing(event.target.checked)}
          />
        </div>
      </Modal>
    </>
  )
}
