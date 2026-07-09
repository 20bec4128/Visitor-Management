import { Navigate } from 'react-router-dom'

import { hasAllPermissions, isLoggedIn } from '../auth/authStorage.js'

function ProtectedRoute({ children, requiredPermissions = [] }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default ProtectedRoute
