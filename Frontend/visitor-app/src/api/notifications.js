import { requestJson } from './http.js'

export function listNotifications() {
  return requestJson('/api/notifications')
}

export function markAllNotificationsRead() {
  return requestJson('/api/notifications/read-all', { method: 'POST' })
}

export function markNotificationRead(id) {
  return requestJson(`/api/notifications/${id}/read`, { method: 'POST' })
}
