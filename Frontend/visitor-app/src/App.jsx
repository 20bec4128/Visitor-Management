import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'

import { appRoutes } from './routes/appRoutes.jsx'
import { getCurrentUser } from './api/auth.js'
import { clearAuthSession, getAuthSession, isLoggedIn, setAuthSession } from './auth/authStorage.js'
import { RealtimeProvider } from './realtime/RealtimeProvider.jsx'
import { CallProvider } from './components/call/CallProvider.jsx'
import SosAlertOverlay from './components/sos/SosAlertOverlay.jsx'
import FloatingChat from './components/chat/FloatingChat.jsx'
import NotificationToaster from './components/notifications/NotificationToaster.jsx'

function PageLoader({ visible }) {
  return (
    <div className={`vm-page-loader${visible ? ' vm-page-loader-visible' : ''}`} aria-hidden="true">
      <div className="vm-page-loader-overlay">
        <div className="vm-balls">
          <div className="vm-ball" />
          <div className="vm-ball" />
          <div className="vm-ball" />
        </div>
      </div>
    </div>
  )
}

function RouterContent() {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const prevPath = useRef(location.pathname)
  const timerRef = useRef(null)

  useEffect(() => {
    if (location.pathname === prevPath.current) return
    prevPath.current = location.pathname
    setLoading(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timerRef.current)
  }, [location.pathname])

  return (
    <RealtimeProvider>
      <CallProvider>
        <PageLoader visible={loading} />
        <Routes>
          {appRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
        {/* Global comms surfaces — active on every logged-in page, persist across navigation. */}
        <SosAlertOverlay />
        <FloatingChat />
        <NotificationToaster />
      </CallProvider>
    </RealtimeProvider>
  )
}

function App() {
  // Refresh the stored role/permissions from the backend on load, so permission changes
  // take effect on the next page load instead of requiring a manual logout/login.
  const [ready, setReady] = useState(!isLoggedIn())

  useEffect(() => {
    if (!isLoggedIn()) return
    let cancelled = false
    getCurrentUser()
      .then((me) => {
        if (cancelled || !me) return
        const session = getAuthSession()
        setAuthSession({
          username: me.username ?? session.username,
          role: me.role ?? session.role,
          permissions: me.permissions ?? {},
          token: session.token,
        })
      })
      .catch((err) => {
        // Drop a stale/invalid session so the user is sent back to login.
        if (err && /\b(401|403)\b/.test(String(err.message))) clearAuthSession()
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) return <PageLoader visible />

  return (
    <BrowserRouter>
      <RouterContent />
    </BrowserRouter>
  )
}

export default App

