const CONSENT_KEY = 'gt_consent'

export function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    return {
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      ts: parsed.ts,
    }
  } catch {
    return null
  }
}

export function setConsent({ analytics, marketing }) {
  const detail = {
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    ts: Date.now(),
  }

  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(detail))
  } catch {
    // localStorage indisponibil
  }

  window.dispatchEvent(new CustomEvent('gt-consent', { detail }))

  return detail
}
