import { getApiBase } from './base.js'
import { getAuthToken } from '../auth/authStorage.js'

const API_BASE = getApiBase()

async function postJson(path, body) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
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
      message =
        (data && (data.message || data.error)) ||
        (typeof data === 'string' ? data : '')
    } catch {
      message = await response.text().catch(() => '')
    }

    if (message && message.length > 160) {
      message = message.slice(0, 160) + '...'
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

export function bootstrapAdmin() {
  return postJson('/api/auth/bootstrap-admin', {})
}

export function login(username, password) {
  return postJson('/api/auth/login', { username, password })
}

export function logout(username) {
  return postJson('/api/auth/logout', { username })
}

// Fetches the current user's freshly-resolved role + permissions. Throws an Error whose
// message contains the HTTP status (e.g. "401") so callers can detect an invalid session.
export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  })
  if (!response.ok) {
    throw new Error(String(response.status))
  }
  return response.json()
}
