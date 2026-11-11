export const TRACKING_FIELDS = [
  { key: 'ga4Id', label: 'Google Analytics 4', placeholder: 'G-XXXXXXXXXX', pattern: /^G-[A-Z0-9]+$/, group: 'analytics' },
  { key: 'gtmId', label: 'Google Tag Manager', placeholder: 'GTM-XXXXXXX', pattern: /^GTM-[A-Z0-9]+$/, group: 'manager' },
  { key: 'googleAdsId', label: 'Google Ads — Google tag', placeholder: 'AW-123456789', pattern: /^AW-\d+$/, group: 'marketing' },
  { key: 'googleAdsConversionLabel', label: 'Google Ads — eticheta conversiei pentru contact', placeholder: 'Eticheta din acțiunea de conversie', pattern: /^[A-Za-z0-9_-]+$/, group: 'conversion' },
  { key: 'facebookPixelId', label: 'Meta Pixel — Facebook / Instagram', placeholder: '123456789012345', pattern: /^\d+$/, group: 'marketing' },
  { key: 'tiktokPixelId', label: 'TikTok Pixel', placeholder: 'Codul pixelului TikTok', pattern: /^[A-Z0-9]+$/, group: 'marketing' },
  { key: 'clarityId', label: 'Microsoft Clarity', placeholder: 'ID-ul proiectului Clarity', pattern: /^[a-zA-Z0-9]+$/, group: 'analytics' },
]

export function normalizeTracking(source = {}) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) source = {}
  const result = Object.fromEntries(TRACKING_FIELDS.map(({ key }) => [key, typeof source[key] === 'string' ? source[key].trim() : '']))
  const legacy = typeof source.googleId === 'string' ? source.googleId.trim().toUpperCase() : ''
  for (const key of ['ga4Id', 'gtmId', 'googleAdsId']) {
    const field = TRACKING_FIELDS.find((item) => item.key === key)
    if (!(key in source) && field.pattern.test(legacy)) result[key] = legacy
    result[key] = result[key].toUpperCase()
  }
  result.tiktokPixelId = result.tiktokPixelId.toUpperCase()
  return result
}

export function trackingError(values) {
  const field = TRACKING_FIELDS.find(({ key, pattern }) => values[key] && (values[key].length > 100 || !pattern.test(values[key])))
  if (field) return `Verifică formatul câmpului ${field.label}.`
  if (values.googleAdsConversionLabel && !values.googleAdsId) return 'Completează și ID-ul Google Ads pentru conversie.'
  return ''
}

export function hasTracking(source) {
  const tracking = normalizeTracking(source)
  return TRACKING_FIELDS.some(({ key, pattern, group }) => group !== 'conversion' && tracking[key] && pattern.test(tracking[key]))
}
