import adminService from './adminService'

async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authenticated ? { Authorization: `Bearer ${adminService.getToken()}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.message || 'Serviciul nu este disponibil.')
  return result
}

export const getIntegrations = () => request('/api/admin/integrations')
export const saveIntegrations = (body) => request('/api/admin/integrations', { method: 'PUT', body })
export const testSmtp = (body) => request('/api/admin/integrations/smtp-test', { method: 'POST', body })
export const getPublicIntegrations = () => request('/api/integrations/public', { authenticated: false })
