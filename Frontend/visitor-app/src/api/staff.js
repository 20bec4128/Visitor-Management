import { getAuthToken } from '../auth/authStorage.js'
import { getApiBase } from './base.js'

const API_BASE = getApiBase()

async function requestJson(path, { method = 'GET', body } = {}) {
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

export function listRoles() {
  return requestJson('/api/staff/roles')
}

export function getRole(roleId) {
  return requestJson(`/api/staff/roles/${roleId}`)
}

export function createRole(payload) {
  return requestJson('/api/staff/roles', { method: 'POST', body: payload })
}

export function updateRole(roleId, payload) {
  return requestJson(`/api/staff/roles/${roleId}`, { method: 'PUT', body: payload })
}

export async function deleteRole(roleId) {
  await requestJson(`/api/staff/roles/${roleId}`, { method: 'DELETE' })
}

export function listStaffUsers() {
  return requestJson('/api/staff/users')
}

export function listEmployeeHosts() {
  return requestJson('/api/staff/users/hosts')
}

export function createStaffUser(payload) {
  return requestJson('/api/staff/users', { method: 'POST', body: payload })
}

export function updateStaffUser(userId, payload) {
  return requestJson(`/api/staff/users/${userId}`, { method: 'PUT', body: payload })
}

export async function deleteStaffUser(userId) {
  await requestJson(`/api/staff/users/${userId}`, { method: 'DELETE' })
}

export function listLoggedHistory() {
  return requestJson('/api/staff/logged-history')
}

export async function deleteLoggedHistory(id) {
  await requestJson(`/api/staff/logged-history/${id}`, { method: 'DELETE' })
}
