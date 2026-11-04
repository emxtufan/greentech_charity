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

export async function listLogs({ type, q, limit = 500 } = {}) {
  const params = new URLSearchParams()

  if (type) params.set('type', type)
  if (q) params.set('q', q)
  params.set('limit', String(limit))

  const response = await fetch(`/api/admin/logs?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders() },
  })

  const data = await parseBody(response)

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    types: Array.isArray(data?.types) ? data.types : [],
  }
}

const adminLogsService = { listLogs }

export default adminLogsService
