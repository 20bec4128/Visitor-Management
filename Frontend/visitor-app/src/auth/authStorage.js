const AUTH_STORAGE_KEY = 'visitorManagement.auth'

export function setAuthSession({ username, role, permissions = {}, token = '' }) {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ loggedIn: true, username, role, permissions, token }),
  )
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getAuthSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return { loggedIn: false }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { loggedIn: false }
    if (parsed.loggedIn && !parsed.token) return { loggedIn: false }
    return { loggedIn: Boolean(parsed.loggedIn), ...parsed }
  } catch {
    return { loggedIn: false }
  }
}

export function isLoggedIn() {
  const session = getAuthSession()
  return session.loggedIn === true && Boolean(session.token)
}

export function isAdmin() {
  const session = getAuthSession()
  return session.loggedIn === true && (session.role ?? '').toString().toUpperCase() === 'ADMIN'
}

export function isSecurity() {
  const session = getAuthSession()
  return session.loggedIn === true && (session.role ?? '').toString().toUpperCase() === 'SECURITY'
}

export function isReceptionist() {
  const session = getAuthSession()
  return session.loggedIn === true && (session.role ?? '').toString().toUpperCase() === 'RECEPTIONIST'
}

export function hasPermission(permissionKey) {
  const session = getAuthSession()
  if (!session.loggedIn) return false
  if ((session.role ?? '').toString().toUpperCase() === 'ADMIN') return true
  if (!permissionKey) return true
  return Boolean(session.permissions && session.permissions[permissionKey])
}

export function hasAnyPermission(permissionKeys = []) {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) return true
  return permissionKeys.some((key) => hasPermission(key))
}

export function hasAllPermissions(permissionKeys = []) {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) return true
  return permissionKeys.every((key) => hasPermission(key))
}

export function getAuthToken() {
  return getAuthSession().token ?? ''
}
