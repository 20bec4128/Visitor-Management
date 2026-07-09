import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { clearAuthSession, getAuthSession } from '../../auth/authStorage.js'
import { logout } from '../../api/auth.js'
import useIsMobile from '../../hooks/useIsMobile.js'
import useBranding from '../../hooks/useBranding.js'
import MobileBottomNav from './MobileBottomNav.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import './dashboard.css'
import { listPreRegisterRequests } from '../../api/visitor.js'

function DashboardShell({ children, pageTitle, breadcrumbItems, forceDesktopUi = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useMemo(() => getAuthSession(), [])
  const isMobileViewport = useIsMobile()
  const isMobileUi = isMobileViewport && !forceDesktopUi
  const { brandTitle, logoUrl } = useBranding()

  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const sidebarOpen = isMobileViewport ? mobileSidebarOpen : true
  const [mobileVisitorsNotifyCount, setMobileVisitorsNotifyCount] = useState(0)

  useEffect(() => {
    if (!isMobileViewport) return
    const t = setTimeout(() => setMobileSidebarOpen(false), 0)
    return () => clearTimeout(t)
  }, [isMobileViewport, location.pathname])

  useEffect(() => {
    if (!isMobileUi) return
    let cancelled = false
    listPreRegisterRequests()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        const pending = list.filter((r) => (r?.status ?? '').toString().toUpperCase() === 'PENDING').length
        setMobileVisitorsNotifyCount(pending)
      })
      .catch(() => {
        if (cancelled) return
        setMobileVisitorsNotifyCount(0)
      })

    return () => {
      cancelled = true
    }
  }, [isMobileUi, location.pathname])

  const handleLogout = () => {
    try {
      logout(session.username ?? '').catch(() => {})
    } catch {
      // ignore
    }
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={[
        'vm-shell',
        forceDesktopUi ? 'vm-shell-force-desktop' : '',
        !isMobileUi && desktopSidebarCollapsed ? 'vm-shell-collapsed' : '',
      ].filter(Boolean).join(' ')}
    >
      <Sidebar
        open={sidebarOpen}
        collapsed={!isMobileUi && desktopSidebarCollapsed}
        showCloseButton={isMobileViewport && !forceDesktopUi}
        onClose={() => (isMobileViewport ? setMobileSidebarOpen(false) : null)}
        onToggleCollapse={() => setDesktopSidebarCollapsed((prev) => !prev)}
        onLogout={handleLogout}
        brandTitle={brandTitle}
        brandLogo={logoUrl}
      />

      <div className="vm-main">
        <Topbar
          pageTitle={pageTitle}
          breadcrumbItems={breadcrumbItems}
          username={session.username ?? 'admin'}
          role={(session.role ?? '').toString()}
          isSidebarOpen={sidebarOpen}
          isSidebarCollapsed={!isMobileUi && desktopSidebarCollapsed}
          isMobile={isMobileUi}
          brandTitle={brandTitle}
          brandLogo={logoUrl}
          onToggleSidebar={() =>
            isMobileViewport ? setMobileSidebarOpen((prev) => !prev) : setDesktopSidebarCollapsed((prev) => !prev)
          }
          onLogout={handleLogout}
        />

        <main className="vm-content">{children}</main>

        {isMobileUi ? (
          <MobileBottomNav
            isSidebarOpen={sidebarOpen}
            visitorsNotifyCount={mobileVisitorsNotifyCount}
            onOpenMore={() => setMobileSidebarOpen(true)}
            onLogout={handleLogout}
          />
        ) : null}
      </div>
    </div>
  )
}

export default DashboardShell
