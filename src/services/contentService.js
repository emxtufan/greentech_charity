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

export async function getContent() {
  const response = await fetch('/api/content', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  return parseBody(response)
}

export async function saveContent(content) {
  const response = await fetch('/api/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(content),
  })

  return parseBody(response)
}

export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })

  const data = await parseBody(response)

  if (!data || !data.url) {
    throw new Error('Răspuns invalid: lipsește url-ul imaginii')
  }

  return data.url
}

const contentService = { getContent, saveContent, uploadImage }

export default contentService
