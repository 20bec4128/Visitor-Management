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

// ---- Contact Diary ----
export function listContactDiary() {
  return requestJson('/api/contact-diary')
}
export function createContactDiary(payload) {
  return requestJson('/api/contact-diary', { method: 'POST', body: payload })
}
export function updateContactDiary(id, payload) {
  return requestJson(`/api/contact-diary/${id}`, { method: 'PUT', body: payload })
}
export async function deleteContactDiary(id) {
  await requestJson(`/api/contact-diary/${id}`, { method: 'DELETE' })
}

// ---- Notices ----
export function listNotices() {
  return requestJson('/api/notices')
}
export function createNotice(payload) {
  return requestJson('/api/notices', { method: 'POST', body: payload })
}
export function updateNotice(id, payload) {
  return requestJson(`/api/notices/${id}`, { method: 'PUT', body: payload })
}
export async function deleteNotice(id) {
  await requestJson(`/api/notices/${id}`, { method: 'DELETE' })
}

// ---- Visit Categories ----
export function listVisitCategories() {
  return requestJson('/api/visit-categories')
}
export function createVisitCategory(payload) {
  return requestJson('/api/visit-categories', { method: 'POST', body: payload })
}
export function updateVisitCategory(id, payload) {
  return requestJson(`/api/visit-categories/${id}`, { method: 'PUT', body: payload })
}
export async function deleteVisitCategory(id) {
  await requestJson(`/api/visit-categories/${id}`, { method: 'DELETE' })
}

// ---- Organization Types ----
export function listOrganizationTypes() {
  return requestJson('/api/organization-types')
}
export function createOrganizationType(payload) {
  return requestJson('/api/organization-types', { method: 'POST', body: payload })
}
export function updateOrganizationType(id, payload) {
  return requestJson(`/api/organization-types/${id}`, { method: 'PUT', body: payload })
}
export async function deleteOrganizationType(id) {
  await requestJson(`/api/organization-types/${id}`, { method: 'DELETE' })
}

// ---- Email Templates ----
export function listEmailTemplates() {
  return requestJson('/api/email-templates')
}
export function createEmailTemplate(payload) {
  return requestJson('/api/email-templates', { method: 'POST', body: payload })
}
export function updateEmailTemplate(id, payload) {
  return requestJson(`/api/email-templates/${id}`, { method: 'PUT', body: payload })
}
export async function deleteEmailTemplate(id) {
  await requestJson(`/api/email-templates/${id}`, { method: 'DELETE' })
}

// ---- Settings (app sections) ----
export function getSettingsSection(section) {
  return requestJson(`/api/settings/${section}`)
}
export function saveSettingsSection(section, payload) {
  return requestJson(`/api/settings/${section}`, { method: 'PUT', body: payload })
}
export function sendTestEmail(to) {
  return requestJson('/api/settings/email/test', { method: 'POST', body: { to } })
}
// Public branding (company name + logo) for the app header — readable by any user.
export function getBranding() {
  return requestJson('/api/settings/branding')
}
// Global search across visitors, staff, visits and pre-registrations.
export function globalSearch(q) {
  return requestJson(`/api/search?q=${encodeURIComponent(q)}`)
}

// ---- Account (current user) ----
export function getAccount() {
  return requestJson('/api/account/me')
}
export function updateAccountProfile(payload) {
  return requestJson('/api/account/profile', { method: 'PUT', body: payload })
}
export function changeAccountPassword(payload) {
  return requestJson('/api/account/password', { method: 'POST', body: payload })
}

// Multipart upload (do NOT set Content-Type — the browser sets the boundary).
export async function uploadAccountPhoto(file) {
  const token = getAuthToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/api/account/profile/photo`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!response.ok) {
    let message = ''
    try {
      const data = await response.json()
      message = (data && (data.message || data.error)) || ''
    } catch {
      message = await response.text().catch(() => '')
    }
    throw new Error(message || `Upload failed with ${response.status}`)
  }
  return response.json()
}

// Multipart upload for the General settings company logo.
export async function uploadCompanyLogo(file) {
  const token = getAuthToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/api/settings/general/logo`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!response.ok) {
    let message = ''
    try {
      const data = await response.json()
      message = (data && (data.message || data.error)) || ''
    } catch {
      message = await response.text().catch(() => '')
    }
    throw new Error(message || `Upload failed with ${response.status}`)
  }
  return response.json()
}

// Build an absolute URL for a server-relative media path like "/uploads/...".
export function mediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE}${path}`
}
