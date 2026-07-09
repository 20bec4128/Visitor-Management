import { requestJson } from './http.js'

export function triggerSos(message, location) {
  return requestJson('/api/sos', { method: 'POST', body: { message, location } })
}

export function listSosAlerts() {
  return requestJson('/api/sos')
}

export function resolveSosAlert(id) {
  return requestJson(`/api/sos/${id}/resolve`, { method: 'POST' })
}
