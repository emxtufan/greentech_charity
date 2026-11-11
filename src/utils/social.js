export const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook', icon: 'fa-facebook-f' },
  { key: 'instagram', label: 'Instagram', icon: 'fa-instagram' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'fa-linkedin-in' },
]

export const emptySocial = () => ({ facebook: '', instagram: '', linkedin: '' })

const toText = (value) => (value === undefined || value === null ? '' : String(value).trim())

// acceptă doar URL-uri absolute http/https (blochează javascript:, data: etc.)
export const isValidUrl = (value) => {
  const raw = toText(value)
  if (!raw) return false

  try {
    const url = new URL(raw)
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname)
  } catch {
    return false
  }
}

// doar rețelele cu URL valid ajung în pagină
export const getSocialLinks = (site) => {
  const social = site?.social || {}

  return SOCIAL_NETWORKS.map(({ key, label, icon }) => ({
    key,
    label,
    icon,
    url: toText(social[key]),
  })).filter((item) => isValidUrl(item.url))
}
