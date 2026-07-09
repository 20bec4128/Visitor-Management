import { requestJson } from './http.js'

export function getIceServers() {
  return requestJson('/api/calls/ice-servers')
}
