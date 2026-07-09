const DEFAULT_LOCAL_API_BASE = 'http://localhost:8081'

export function getApiBase() {
  const configuredBase = import.meta.env.VITE_API_BASE
  if (configuredBase && configuredBase.trim()) {
    return configuredBase.trim().replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
      return DEFAULT_LOCAL_API_BASE
    }
    return origin.replace(/\/+$/, '')
  }

  return DEFAULT_LOCAL_API_BASE
}
