import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M3.5 20c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20.5 20c0-3.314-2.686-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M9 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 12h.01M12 12h.01M18 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 21a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a8.5 8.5 0 0 0 .1-1l2-1.2-2-3.4-2.3.5a8.8 8.8 0 0 0-1.6-1l-.3-2.4H10.7l-.3 2.4a8.8 8.8 0 0 0-1.6 1l-2.3-.5-2 3.4 2 1.2a8.5 8.5 0 0 0 .1 1 8.5 8.5 0 0 0-.1 1l-2 1.2 2 3.4 2.3-.5c.5.4 1 .8 1.6 1l.3 2.4h4.6l.3-2.4c.6-.2 1.1-.6 1.6-1l2.3.5 2-3.4-2-1.2a8.5 8.5 0 0 0-.1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 8l4 4m0 0l-4 4m4-4H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconQr() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M7 7h2v2H7V7ZM15 7h2v2h-2V7ZM7 15h2v2H7v-2ZM13 13h1v1h-1v-1ZM15 13h2v2h-2v-2ZM13 16h4v1h-4v-1Z" fill="currentColor" />
    </svg>
  )
}

function MobileNavButton({ active, label, icon, onClick, badgeCount }) {
  return (
    <button type="button" className={`vm-mnav-item ${active ? 'is-active' : ''}`} onClick={onClick} aria-label={label}>
      <span className="vm-mnav-icon" aria-hidden="true">
        {badgeCount && badgeCount > 0 ? <span className="vm-mnav-badge" aria-hidden="true" /> : null}
        {icon}
      </span>
      <span className="vm-mnav-label">{label}</span>
    </button>
  )
}

function MobileBottomNav({ visitorsNotifyCount = 0, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)

  const activeKey = useMemo(() => {
    const path = location.pathname || ''
    if (path === '/dashboard') return 'home'
    if (path.startsWith('/visitors') || path.startsWith('/active-visitors')) return 'visitors'
    if (path.startsWith('/preregister')) return 'preregister'
    return ''
  }, [location.pathname])

  return (
    <nav className="vm-mobile-nav" aria-label="Mobile navigation">
      <div className="vm-mobile-nav-inner">
        <MobileNavButton active={activeKey === 'home'} label="Home" icon={<IconHome />} onClick={() => navigate('/dashboard')} />
        <MobileNavButton
          active={activeKey === 'visitors'}
          label="Visitors"
          icon={<IconUsers />}
          onClick={() => navigate('/visitors')}
          badgeCount={visitorsNotifyCount}
        />

        <button type="button" className="vm-mnav-fab" onClick={() => navigate('/preregister/create')} aria-label="Create Pre-Register">
          <span className="vm-mnav-fab-icon" aria-hidden="true">
            <IconQr />
          </span>
        </button>

        <MobileNavButton
          active={activeKey === 'preregister'}
          label="Pre-Reg"
          icon={<IconCalendar />}
          onClick={() => navigate('/preregister')}
        />
        <div className="vm-mnav-profile-container">
          <MobileNavButton active={profileOpen} label="Profile" icon={<IconUser />} onClick={() => setProfileOpen((v) => !v)} />
          {profileOpen ? (
            <div className="vm-mnav-profile-menu" role="menu">
              <button
                type="button"
                className="vm-mnav-profile-menu-item"
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/settings')
                }}
              >
                <span className="vm-mnav-profile-menu-icon" aria-hidden="true">
                  <IconSettings />
                </span>
                <span>Settings</span>
              </button>
              <button
                type="button"
                className="vm-mnav-profile-menu-item"
                onClick={() => {
                  setProfileOpen(false)
                  onLogout?.()
                }}
              >
                <span className="vm-mnav-profile-menu-icon" aria-hidden="true">
                  <IconLogout />
                </span>
                <span>Logout</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  )
}

export default MobileBottomNav
