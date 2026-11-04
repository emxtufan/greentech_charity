import adminService from './adminService'

const parseBody = async (response) => {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error((data && data.message) || `HTTP ${response.status}`)
  }

  return data
}

const authHeaders = () => {
  const token = adminService.getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function listForms() {
  const response = await fetch('/api/f230', {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders() },
  })

  return parseBody(response)
}

export async function setStatus(id, status) {
  const response = await fetch(`/api/f230/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ status }),
  })

  return parseBody(response)
}

export async function deleteForm(id) {
  const response = await fetch(`/api/f230/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...authHeaders() },
  })

  return parseBody(response)
}

export async function downloadCsv(status) {
  const response = await fetch(
    `/api/f230/export.csv?status=${encodeURIComponent(status || 'toate')}`,
    {
      method: 'GET',
      headers: { Accept: 'text/csv', ...authHeaders() },
    }
  )

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error((data && data.message) || `HTTP ${response.status}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'formulare-230.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return blob
}

const f230AdminService = { listForms, setStatus, deleteForm, downloadCsv }

export default f230AdminService
