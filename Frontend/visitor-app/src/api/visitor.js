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
    console.error('[requestJson] Fetch error:', err, 'hint:', hint)
    throw new Error(hint)
  }

  if (!response.ok) {
    let message = ''
    try {
      const data = await response.json()
      message = (data && (data.message || data.error || data.detail)) || JSON.stringify(data)
    } catch {
      message = await response.text().catch(() => '')
    }
    const fullMsg = message || `Request failed with ${response.status}`
    console.error(`[requestJson] API Error (${response.status}):`, fullMsg)
    throw new Error(fullMsg)
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

export function listPreRegisterRequests() {
  return requestJson('/api/visitor/pre-register')
}

export function getPreRegisterRequest(id) {
  return requestJson(`/api/visitor/pre-register/${id}`)
}

export function sendPreRegisterForApproval(payload) {
  return requestJson('/api/visitor/pre-register/send', { method: 'POST', body: payload })
}

export function updatePreRegisterRequest(id, payload) {
  return requestJson(`/api/visitor/pre-register/${id}`, { method: 'PUT', body: payload })
}

export async function deletePreRegisterRequest(id) {
  await requestJson(`/api/visitor/pre-register/${id}`, { method: 'DELETE' })
}

export function approvePreRegister(id, payload) {
  return requestJson(`/api/visitor/pre-register/${id}/approve`, { method: 'POST', body: payload })
}

export function getPreRegisterQr(id) {
  return requestJson(`/api/visitor/pre-register/${id}/qr`)
}

export function rejectPreRegister(id, payload) {
  return requestJson(`/api/visitor/pre-register/${id}/reject`, { method: 'POST', body: payload })
}

export function checkInPreRegister(id) {
  return requestJson(`/api/visitor/pre-register/${id}/checkin`, { method: 'POST' })
}

export function matchFace(payload) {
  return requestJson('/api/visitors/face/match', { method: 'POST', body: payload })
}

export function createVisitor(payload) {
  return requestJson('/api/visitors', { method: 'POST', body: payload })
}

export function createVisitRequest(payload) {
  return requestJson('/api/visits', { method: 'POST', body: payload })
}

export function listVisitRequests(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return requestJson(`/api/visits${query}`)
}

export function getVisitRequest(id) {
  return requestJson(`/api/visits/${id}`)
}

export function approveVisitRequest(id, body) {
  return requestJson(`/api/visits/${id}/approve`, { method: 'POST', body })
}

export function rejectVisitRequest(id, body) {
  return requestJson(`/api/visits/${id}/reject`, { method: 'POST', body })
}

export function updateVisitRequest(id, body) {
  return requestJson(`/api/visits/${id}`, { method: 'PUT', body })
}

export async function deleteVisitRequest(id) {
  await requestJson(`/api/visits/${id}`, { method: 'DELETE' })
}

export function checkOutVisitor(id) {
  return requestJson(`/api/visits/${id}/checkout`, { method: 'POST' })
}

export function checkInVisitor(id) {
  return requestJson(`/api/visits/${id}/checkin`, { method: 'POST' })
}

export function getVisitor(id) {
  return requestJson(`/api/visitors/${id}`)
}

export function updateVisitor(id, body) {
  return requestJson(`/api/visitors/${id}`, { method: 'PUT', body })
}

export function validatePreRegisterToken(token) {
  return requestJson(`/api/visitor/pre-register/validate/${encodeURIComponent(token)}`)
}

export function completePreRegisterEntry(token) {
  return requestJson(`/api/visitor/pre-register/${encodeURIComponent(token)}/complete-entry`, { method: 'POST' })
}
