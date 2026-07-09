import { getAuthToken } from '../auth/authStorage.js'
import { getApiBase } from './base.js'

export const API_BASE = getApiBase()

/** Shared JSON fetch wrapper that attaches the Bearer token (same shape as api/config.js). */
export async function requestJson(path, { method = 'GET', body } = {}) {
  const token = getAuthToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    const hint =
      err instanceof TypeError
        ? `Cannot reach API server at ${API_BASE}. Is the backend running and accessible?`
        : 'Request failed.'
    throw new Error(hint)
  }

  if (!response.ok) {
    let message = ''
    try {
      const data = await response.json()
      message = (data && (data.message || data.error)) || ''
    } catch {
      message = await response.text().catch(() => '')
    }
    throw new Error(message || `Request failed with ${response.status}`)
  }

  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
