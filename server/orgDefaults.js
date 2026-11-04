// valori implicite pentru datele asociației, luate din env când lipsesc din content.json
const ENV_FIELDS = {
  legal: {
    name: 'ORG_NAME',
    cif: 'ORG_CIF',
    registry: 'ORG_REGISTRY',
    address: 'ORG_ADDRESS',
    representative: 'ORG_REPRESENTATIVE',
    iban: 'ORG_IBAN',
    bank: 'ORG_BANK',
  },
  contact: {
    email: 'ORG_EMAIL',
    phone: 'ORG_PHONE',
    address: 'ORG_CONTACT_ADDRESS',
  },
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const isEmpty = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

const envValue = (name) => {
  const raw = process.env[name]
  return typeof raw === 'string' ? raw.trim() : ''
}

// completează doar câmpurile goale; valorile deja setate în content.json au prioritate
export function applyEnvDefaults(content) {
  if (!isPlainObject(content)) return content
  if (!isPlainObject(content.site)) content.site = {}

  Object.entries(ENV_FIELDS).forEach(([group, fields]) => {
    if (!isPlainObject(content.site[group])) content.site[group] = {}

    const target = content.site[group]
    Object.entries(fields).forEach(([field, envName]) => {
      if (!isEmpty(target[field])) return

      const value = envValue(envName)
      if (!value) return

      target[field] = value
    })
  })

  return content
}
