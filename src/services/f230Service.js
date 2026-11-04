const parseBody = async (response) => {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error((data && data.message) || `HTTP ${response.status}`)
  }

  return data
}

export async function getStatus() {
  const response = await fetch('/api/f230/status', {
    headers: { Accept: 'application/json' },
  })

  return parseBody(response)
}

export async function submitForm(data) {
  const response = await fetch('/api/f230', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  })

  return parseBody(response)
}

const f230Service = { getStatus, submitForm }

export default f230Service
