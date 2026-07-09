import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import logo from '../../assets/images/Vmlogo.png'
import { listVisitRequests, listPreRegisterRequests } from '../../api/visitor.js'
import { getAccount, mediaUrl, globalSearch } from '../../api/config.js'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notifications.js'
import { hasPermission } from '../../auth/authStorage.js'
import { PERMISSIONS } from '../../rbac/access.js'
import SosButton from '../sos/SosButton.jsx'

function TopbarIconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      className="vm-topbar-iconbtn"
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16.2 16.2 21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h7v7H4V4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M13 4h7v7h-7V4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 13h7v7H4v-7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M13 13h7v7h-7v-7Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
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

function timeAgo(value) {
  if (!value) return ''
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const POLL_MS = 30000

const NOTIF_READ_KEY = 'vm:notif-read'

function loadReadKeys() {
  try {
    const raw = localStorage.getItem(NOTIF_READ_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function NotificationsDropdown() {
  const navigate = useNavigate()
  const canViewVisits = hasPermission(PERMISSIONS.visitsView)
  const canViewPrebookings = hasPermission(PERMISSIONS.preregisterView)
  const canView = canViewVisits || canViewPrebookings
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [notifs, setNotifs] = useState([])
  const [readKeys, setReadKeys] = useState(loadReadKeys)
  const [loading, setLoading] = useState(canView)
  const [error, setError] = useState('')
  const ref = useRef(null)

  // Persisted in-app notifications (e.g. "an employee approved a visit"). Loaded for everyone,
  // refreshed on an interval and whenever a live toast arrives.
  useEffect(() => {
    let cancelled = false
    const loadNotifs = () => {
      listNotifications()
        .then((rows) => {
          if (!cancelled) setNotifs(Array.isArray(rows) ? rows : [])
        })
        .catch(() => {})
    }
    loadNotifs()
    const onUpdate = () => loadNotifs()
    window.addEventListener('vm:notifications-updated', onUpdate)
    const timer = setInterval(loadNotifs, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('vm:notifications-updated', onUpdate)
    }
  }, [])

  // Load pending walk-in visits + pending pre-bookings, merge, newest first.
  // Re-runs on an interval so new requests appear without a page reload.
  useEffect(() => {
    if (!canView) return undefined
    let cancelled = false

    const load = async () => {
      try {
        const [visits, prebookings] = await Promise.all([
          canViewVisits ? listVisitRequests('PENDING').catch(() => []) : Promise.resolve([]),
          canViewPrebookings ? listPreRegisterRequests().catch(() => []) : Promise.resolve([]),
        ])

        const walkins = (Array.isArray(visits) ? visits : [])
          .filter((v) => String(v?.status || '').toUpperCase() === 'PENDING')
          .map((v) => ({
            key: `visit-${v.id}`,
            kind: 'walkin',
            visitorName: v.visitorName,
            hostName: v.hostName,
            purpose: v.purpose,
            at: v.visitAt || v.createdAt,
            route: '/host-approvals',
          }))

        const bookings = (Array.isArray(prebookings) ? prebookings : [])
          .filter((p) => String(p?.status || '').toUpperCase() === 'PENDING')
          .map((p) => ({
            key: `prebooking-${p.id}`,
            kind: 'prebooking',
            visitorName: p.visitorName,
            hostName: p.hostName,
            purpose: 'Pre-booking request',
            at: p.createdAt,
            route: '/appointment-bookings',
          }))

        const merged = [...walkins, ...bookings].sort(
          (a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime(),
        )
        if (!cancelled) {
          setItems(merged)
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load notifications.')
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [canView, canViewVisits, canViewPrebookings])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const unreadNotifs = notifs.filter((n) => !n.read)
  const unreadItems = items.filter((item) => !readKeys.includes(item.key))
  const unreadCount = unreadItems.length + unreadNotifs.length

  const markAllRead = () => {
    const merged = Array.from(new Set([...readKeys, ...items.map((i) => i.key)]))
    setReadKeys(merged)
    try {
      localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(merged))
    } catch {
      // ignore storage failures
    }
    const notifUnread = unreadNotifs.length
    if (notifUnread > 0) {
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
      markAllNotificationsRead().catch(() => {})
    }
  }

  const toggleOpen = () => {
    setOpen((v) => !v)
  }

  return (
    <div className="vm-topbar-notif" ref={ref}>
      <TopbarIconButton label="Notifications" onClick={toggleOpen}>
        {unreadCount > 0 ? <span className="vm-topbar-badge-dot" /> : null}
        <IconBell />
      </TopbarIconButton>

      {open ? (
        <div className="vm-topbar-menu vm-topbar-notif-menu" role="menu">
          <div className="vm-topbar-notif-head">
            <span className="vm-topbar-notif-title">Notifications</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    markAllRead()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Mark all read
                </button>
              ) : null}
              {unreadCount > 0 ? <span className="vm-topbar-notif-count">{unreadCount}</span> : null}
            </div>
          </div>

          <div className="vm-topbar-notif-list">
            {unreadCount === 0 && !loading && !error ? (
              <div className="vm-topbar-notif-empty">You&apos;re all caught up.</div>
            ) : (
              <>
                {unreadNotifs.slice(0, 6).map((n) => (
                  <div
                    key={`notif-${n.id}`}
                    className="vm-topbar-notif-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{ flex: 1, textAlign: 'left', cursor: 'pointer' }}
                      onClick={() => {
                        setOpen(false)
                        setNotifs((prev) =>
                          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
                        )
                        markNotificationRead(n.id).catch(() => {})
                        if (n.link) navigate(n.link)
                      }}
                    >
                      <span className="vm-topbar-notif-body">
                        <span className="vm-topbar-notif-text">
                          <strong>{n.title}</strong>
                        </span>
                        {n.message ? <span className="vm-topbar-notif-sub">{n.message}</span> : null}
                        <span className="vm-topbar-notif-time">{timeAgo(n.createdAt)}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setNotifs((prev) =>
                          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
                        )
                        markNotificationRead(n.id).catch(() => {})
                      }}
                      title="Mark as read"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        marginLeft: '8px',
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        style={{ width: '16px', height: '16px' }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {loading ? (
                  <div className="vm-topbar-notif-empty">Loading…</div>
                ) : error ? (
                  <div className="vm-topbar-notif-empty">{error}</div>
                ) : (
                  unreadItems.slice(0, 6).map((item) => (
                    <div
                      key={item.key}
                      className="vm-topbar-notif-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{ flex: 1, textAlign: 'left', cursor: 'pointer' }}
                        onClick={() => {
                          setOpen(false)
                          const updated = [...readKeys, item.key]
                          setReadKeys(updated)
                          try {
                            localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(updated))
                          } catch {
                            // ignore
                          }
                          navigate(item.route)
                        }}
                      >
                        <span className="vm-topbar-notif-body">
                          <span className="vm-topbar-notif-text">
                            <strong>{item.visitorName || 'A visitor'}</strong>
                            {item.kind === 'prebooking' ? ' pre-booked a visit' : ' requested a visit'}
                            {item.hostName ? ` with ${item.hostName}` : ''}
                          </span>
                          {item.purpose ? (
                            <span className="vm-topbar-notif-sub">{item.purpose}</span>
                          ) : null}
                          <span className="vm-topbar-notif-time">{timeAgo(item.at)}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          const updated = [...readKeys, item.key]
                          setReadKeys(updated)
                          try {
                            localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(updated))
                          } catch {
                            // ignore
                          }
                        }}
                        title="Mark as read"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '6px',
                          color: '#10b981',
                          display: 'flex',
                          alignItems: 'center',
                          marginLeft: '8px',
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          style={{ width: '16px', height: '16px' }}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          <button
            type="button"
            className="vm-topbar-notif-foot"
            onClick={() => {
              setOpen(false)
              navigate('/host-approvals')
            }}
          >
            View all approvals
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ProfileDropdown({ username, role, onLogout }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const ref = useRef(null)
  const shownName = displayName || username
  const initials = (shownName || 'A').charAt(0).toUpperCase()

  useEffect(() => {
    let cancelled = false
    const load = () => {
      getAccount()
        .then((data) => {
          if (cancelled) return
          setPhotoUrl(mediaUrl(data?.profilePhoto))
          setDisplayName((data?.name || '').trim())
        })
        .catch(() => {})
    }
    load()
    window.addEventListener('vm:profile-updated', load)
    return () => {
      cancelled = true
      window.removeEventListener('vm:profile-updated', load)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const avatar = (extraClass = '') =>
    photoUrl ? (
      <img className={`vm-topbar-avatar vm-topbar-avatar-img ${extraClass}`.trim()} src={photoUrl} alt={username || 'User'} />
    ) : (
      <span className={`vm-topbar-avatar ${extraClass}`.trim()}>{initials}</span>
    )

  return (
    <div className="vm-topbar-profile" ref={ref}>
      <button
        type="button"
        className="vm-topbar-profilebtn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {avatar()}
        <span className="vm-topbar-profiletext">
          <span className="vm-topbar-username">{shownName}</span>
          <span className="vm-topbar-rolename">{(role || '').toString() || 'User'}</span>
        </span>
        <span className="vm-topbar-caret" aria-hidden="true">
          v
        </span>
      </button>

      {open ? (
        <div className="vm-topbar-menu" role="menu">
          <div className="vm-topbar-menu-head">
            {avatar('vm-topbar-avatar-lg')}
            <div>
              <div className="vm-topbar-menu-name">{shownName}</div>
              <div className="vm-topbar-menu-sub">{(role || '').toString() || 'User'}</div>
            </div>
          </div>
          <button
            type="button"
            className="vm-topbar-menu-item"
            role="menuitem"
            onClick={() => { setOpen(false); navigate('/settings') }}
          >
            <span className="vm-topbar-menu-item-icon" aria-hidden="true">
              &#9881;
            </span>{' '}
            Profile &amp; Settings
          </button>
          <button
            type="button"
            className="vm-topbar-menu-item vm-topbar-menu-item-danger"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout?.() }}
          >
            <span className="vm-topbar-menu-item-icon" aria-hidden="true">
              Exit
            </span>{' '}
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}

const APP_LINKS = [
  { path: '/dashboard', label: 'Dashboard', emoji: '\u{1F3E0}', perm: null },
  { path: '/today-visitor', label: "Today's Visitors", emoji: '\u{1F4CB}', perm: PERMISSIONS.visitsView },
  { path: '/active-visitors', label: 'Active Visitors', emoji: '\u{1F465}', perm: PERMISSIONS.visitsCheckout },
  { path: '/preregister', label: 'Pre-Register', emoji: '\u{1F4DD}', perm: PERMISSIONS.preregisterView },
  { path: '/contact-diary', label: 'Contact Diary', emoji: '\u{1F4D2}', perm: PERMISSIONS.contactView },
  { path: '/notice-board', label: 'Notice Board', emoji: '\u{1F4E2}', perm: PERMISSIONS.noticeView },
  { path: '/staff/users', label: 'Staff Users', emoji: '\u{1F464}', perm: PERMISSIONS.staffUsersView },
  { path: '/settings', label: 'Settings', emoji: '⚙️', perm: PERMISSIONS.settingsManage },
]

function AppsDropdown() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const links = APP_LINKS.filter((link) => !link.perm || hasPermission(link.perm))

  return (
    <div className="vm-topbar-apps" ref={ref}>
      <TopbarIconButton label="Apps" onClick={() => setOpen((v) => !v)}>
        <IconGrid />
      </TopbarIconButton>

      {open ? (
        <div className="vm-topbar-menu vm-topbar-apps-menu" role="menu">
          <div className="vm-topbar-apps-head">Quick links</div>
          <div className="vm-topbar-apps-grid">
            {links.map((link) => (
              <button
                key={link.path}
                type="button"
                className="vm-topbar-app-tile"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  navigate(link.path)
                }}
              >
                <span className="vm-topbar-app-emoji" aria-hidden="true">
                  {link.emoji}
                </span>
                <span className="vm-topbar-app-label">{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return undefined
    }
    setLoading(true)
    const handle = setTimeout(() => {
      globalSearch(q)
        .then((data) => {
          setResults(Array.isArray(data) ? data : [])
          setOpen(true)
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const go = (result) => {
    setOpen(false)
    setQuery('')
    if (result?.route) navigate(result.route)
  }

  return (
    <div className="vm-topbar-search" ref={ref} style={{ position: 'relative' }}>
      <span className="vm-topbar-search-icon" aria-hidden="true">
        <IconSearch />
      </span>
      <input
        placeholder="Search in VMS..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      <span className="vm-topbar-kbd">CTRL + /</span>

      {open && query.trim().length >= 2 ? (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
            background: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 10,
            boxShadow: '0 12px 38px rgba(15,23,42,0.16)', maxHeight: 360, overflowY: 'auto', padding: 6,
          }}
        >
          {loading ? (
            <div style={{ padding: '10px 12px', color: '#64748b', fontSize: 13 }}>Searching…</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '10px 12px', color: '#64748b', fontSize: 13 }}>No results for “{query.trim()}”.</div>
          ) : (
            results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                onClick={() => go(r)}
                style={{
                  display: 'flex', width: '100%', alignItems: 'center', gap: 10, textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#eff6ff',
                  borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap',
                }}>{r.type}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{r.title}</span>
                  {r.subtitle ? (
                    <span style={{ display: 'block', fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subtitle}</span>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function Topbar({
  pageTitle,
  breadcrumbItems,
  username,
  role,
  isSidebarOpen,
  isMobile,
  brandTitle = 'Visitor Management',
  brandLogo = '',
  onToggleSidebar,
  onLogout,
}) {
  const navigate = useNavigate()

  const handleFullscreen = () => {
    try {
      const el = document.documentElement
      if (document.fullscreenElement) {
        document.exitFullscreen?.()
      } else {
        el.requestFullscreen?.()
      }
    } catch {
      // ignore
    }
  }

  return (
    <header className="vm-topbar">
      <div className="vm-topbar-bar">
        <div className="vm-topbar-left">
          {isMobile ? (
            <button
              type="button"
              className={`vm-topbar-hamburger ${isSidebarOpen ? 'is-open' : ''}`}
              onClick={onToggleSidebar}
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            >
              <span />
              <span />
              <span />
            </button>
          ) : null}
        </div>

        <GlobalSearch />

        <div className="vm-topbar-actions">
          <SosButton />
          <AppsDropdown />
          <TopbarIconButton label="Settings" onClick={() => navigate('/settings')}>
            <IconSettings />
          </TopbarIconButton>
          <TopbarIconButton label="Fullscreen" onClick={handleFullscreen}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </TopbarIconButton>
          <NotificationsDropdown />
          {!isMobile ? (
            <ProfileDropdown username={username} role={role} onLogout={onLogout} />
          ) : null}
          {isMobile ? (
            <div className="vm-topbar-brand-mobile" role="button" tabIndex={0} onClick={() => navigate('/dashboard')}>
              <img className="vm-topbar-brand-logo" src={brandLogo || logo} alt={brandTitle} />
            </div>
          ) : null}
        </div>
      </div>

      {isMobile ? null : (
        <div className="vm-page-head">
          <div className="vm-breadcrumb top-5">
            <button
              type="button"
              className="vm-breadcrumb-home"
              onClick={() => navigate('/dashboard')}
              aria-label="Dashboard"
            >
              <IconHome />
            </button>
            {Array.isArray(breadcrumbItems) && breadcrumbItems.length > 0 ? (
              breadcrumbItems.map((item, idx) => (
                <span key={`${item}-${idx}`}>
                  <span>/</span> <span>{item}</span>
                </span>
              ))
            ) : (
              <>
                <span>/</span>
                <span>{pageTitle}</span>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default Topbar
