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

export async function sendMessage(data) {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  })

  return parseBody(response)
}

export async function listMessages() {
  const response = await fetch('/api/messages', {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders() },
  })

  return parseBody(response)
}

export async function deleteMessage(id) {
  const response = await fetch(`/api/messages/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...authHeaders() },
  })

  return parseBody(response)
}

const messageService = { sendMessage, listMessages, deleteMessage }

export default messageService
