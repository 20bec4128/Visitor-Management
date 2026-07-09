import { API_BASE, requestJson } from './http.js'
import { getAuthToken } from '../auth/authStorage.js'

export function listChatContacts() {
  return requestJson('/api/chat/contacts')
}

export function listChatChannels() {
  return requestJson('/api/chat/channels')
}

export function listChatConversations() {
  return requestJson('/api/chat/conversations')
}

export function createChatChannel(name, members = []) {
  return requestJson('/api/chat/channels', { method: 'POST', body: { name, members } })
}

export function deleteChatChannel(id) {
  return requestJson(`/api/chat/channels/${id}`, { method: 'DELETE' })
}

export function getChatChannelMembers(id) {
  return requestJson(`/api/chat/channels/${id}/members`)
}

export function setChatChannelMembers(id, members) {
  return requestJson(`/api/chat/channels/${id}/members`, { method: 'PUT', body: { members } })
}

/** Set who's in a role channel (promotes/demotes those users' roles). Admin only. */
export function setRoleChannelMembers(role, members) {
  return requestJson(`/api/chat/role-channels/${encodeURIComponent(role)}/members`, { method: 'PUT', body: { members } })
}

export function getChatMessages(channel) {
  return requestJson(`/api/chat/messages?channel=${encodeURIComponent(channel)}`)
}

export function sendChatMessage(channel, body) {
  return requestJson('/api/chat/messages', { method: 'POST', body: { channel, body } })
}

export function deleteChatMessage(id) {
  return requestJson(`/api/chat/messages/${id}`, { method: 'DELETE' })
}

export function getPresence() {
  return requestJson('/api/chat/presence')
}

export function logCall(peerUsername, body) {
  return requestJson('/api/chat/call-log', { method: 'POST', body: { peerUsername, body } })
}

/** Send a photo/document attachment (multipart; do NOT set Content-Type). */
export async function sendChatAttachment(channel, file, body) {
  const token = getAuthToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const fd = new FormData()
  fd.append('channel', channel)
  if (body) fd.append('body', body)
  fd.append('file', file)

  const res = await fetch(`${API_BASE}/api/chat/messages/upload`, { method: 'POST', headers, body: fd })
  if (!res.ok) {
    let message = ''
    try {
      const data = await res.json()
      message = (data && (data.message || data.error)) || ''
    } catch {
      message = await res.text().catch(() => '')
    }
    throw new Error(message || `Upload failed with ${res.status}`)
  }
  return res.json()
}

/** Canonical 1:1 channel key — must match ChatService.dmChannel on the backend. */
export function dmChannelKey(a, b) {
  const x = (a || '').toLowerCase()
  const y = (b || '').toLowerCase()
  return x <= y ? `dm:${x}|${y}` : `dm:${y}|${x}`
}
