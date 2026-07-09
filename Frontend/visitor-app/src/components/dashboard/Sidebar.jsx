import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { hasAnyPermission } from '../../auth/authStorage.js'
import { PERMISSIONS } from '../../rbac/access.js'
import usePaymentEnabled from '../../hooks/usePaymentEnabled.js'
import logo from '../../assets/images/sidebarLogo.png'

const MENU_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    to: '/dashboard',
    section: 'MAIN',
  },
  {
    id: 'staff',
    label: 'Staff Management',
    icon: 'users',
    section: 'MAIN',
    items: [
      { label: 'Users', to: '/staff/users', permission: PERMISSIONS.staffUsersView },
      { label: 'Roles', to: '/staff/roles', permission: PERMISSIONS.staffRolesView },
      { label: 'Logged History', to: '/staff/logged-history', permission: PERMISSIONS.staffLoggedHistoryView },
    ],
  },
  {
    id: 'visitors',
    label: 'Visitor Management',
    icon: 'calendar',
    section: 'VISITOR OPERATIONS',
    items: [
      { label: 'All Visitor', to: '/visitors', permission: PERMISSIONS.visitorsView },
      { label: 'QR Scan', to: '/visitors/qr-scan', permission: PERMISSIONS.visitsCheckin },
      { label: 'Active Visitors', to: '/active-visitors', permission: PERMISSIONS.visitsCheckout },
      { label: 'Pre Register', to: '/preregister', permission: PERMISSIONS.preregisterManage },
      { label: 'Today Visitor', to: '/today-visitor', permission: PERMISSIONS.visitsView },
      { label: 'Contact Diary', to: '/contact-diary', permission: PERMISSIONS.contactView },
      { label: 'Notice Board', to: '/notice-board', permission: PERMISSIONS.noticeView },
    ],
  },
  {
    id: 'approvals',
    label: 'Approval Management',
    icon: 'checkUser',
    section: 'APPROVALS',
    items: [
      { label: 'Walk-in Requests', to: '/host-approvals', permission: PERMISSIONS.visitsView },
      { label: 'Pre-booking Requests', to: '/appointment-bookings', permission: PERMISSIONS.preregisterView },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'mail',
    section: 'COMMUNICATION',
    items: [
      { label: 'Team Chat', to: '/chat', permission: PERMISSIONS.chatUse },
      { label: 'SOS Alerts', to: '/sos-alerts', permission: PERMISSIONS.sosView },
    ],
  },
  {
    id: 'configuration',
    label: 'System Configuration',
    icon: 'mail',
    section: 'SETTINGS',
    items: [
      { label: 'Visit Category', to: '/visit-category', permission: PERMISSIONS.visitCategoryManage },
      { label: 'Organization Types', to: '/organization-types', permission: PERMISSIONS.organizationTypeManage },
      { label: 'Email Notification', to: '/email-notification', permission: PERMISSIONS.emailNotificationManage },
    ],
  },
  {
    id: 'settings',
    label: 'System Settings',
    icon: 'settings',
    section: 'SETTINGS',
    items: [
      { label: 'Pricing', to: '/pricing', permission: PERMISSIONS.pricingManage },
      { label: 'Payments', to: '/payments', permission: PERMISSIONS.paymentsView, requiresPayments: true },
      { label: 'Settings', to: '/settings', permission: PERMISSIONS.settingsManage },
    ],
  },
]

function NavIcon({ name }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <path d="M4 4h8v8H4V4Z" stroke="currentColor" strokeWidth="2" />
          <path d="M14 4h6v5h-6V4Z" stroke="currentColor" strokeWidth="2" />
          <path d="M14 11h6v9h-6v-9Z" stroke="currentColor" strokeWidth="2" />
          <path d="M4 14h8v6H4v-6Z" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
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
          <path
            d="M3.5 20c0-3.314 2.686-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M20.5 20c0-3.314-2.686-6-6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'scan':
      return (
        <svg {...common}>
          <path
            d="M7 3H4a1 1 0 0 0-1 1v3M17 3h3a1 1 0 0 1 1 1v3M7 21H4a1 1 0 0 1-1-1v-3M17 21h3a1 1 0 0 0 1-1v-3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M8 12h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 8v8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>
      )
    case 'userPlus':
      return (
        <svg {...common}>
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
          <path
            d="M19 8v6M16 11h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <path
            d="M7 3v3M17 3v3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M4 7h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M9 13h3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'book':
      return (
        <svg {...common}>
          <path
            d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M6 21h11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'notebook':
      return (
        <svg {...common}>
          <path
            d="M7 3h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M9 7h6M9 11h6M9 15h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'checkUser':
      return (
        <svg {...common}>
          <path
            d="M10.5 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M3 21a7.5 7.5 0 0 1 13-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="m16 19 2 2 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'activeVisitors':
      return (
        <svg {...common}>
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
          <path
            d="M18 3v6M15 6h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'category':
      return (
        <svg {...common}>
          <path
            d="M4 4h7v7H4V4Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M13 4h7v5h-7V4Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M13 11h7v9h-7v-9Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M4 13h7v7H4v-7Z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )
    case 'mail':
      return (
        <svg {...common}>
          <path
            d="M4 6h16v12H4V6Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="m4 7 8 6 8-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'box':
      return (
        <svg {...common}>
          <path
            d="M12 2 3.5 6.5 12 11l8.5-4.5L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 6.5V17.5L12 22V11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M20.5 6.5V17.5L12 22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
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
    case 'clipboardList':
      return (
        <svg {...common}>
          <path
            d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M9 12h6M9 16h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    default:
      return null
  }
}

function Sidebar({
  open,
  collapsed = false,
  showCloseButton = true,
  onClose,
  onToggleCollapse,
  brandTitle = 'VMS',
  brandLogo = '',
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const sidebarRef = useRef(null)
  const paymentsEnabled = usePaymentEnabled()

  // A nav item shows when its permission is met AND (if it's payment-related)
  // online payments are enabled in Settings.
  const itemVisible = (item) =>
    (!item.permission || hasAnyPermission([item.permission])) &&
    (!item.requiresPayments || paymentsEnabled)
  const flyoutRef = useRef(null)
  const flyoutAnchorRef = useRef(null)

  const pathMatches = (pathname, target) => {
    if (!target) return false
    if (pathname === target) return true
    return pathname.startsWith(`${target}/`)
  }

  const matchingGroupId = useMemo(() => {
    const match = MENU_GROUPS.find((group) => {
      if (group.to) return pathMatches(location.pathname, group.to)
      const visibleItems = Array.isArray(group.items)
        ? group.items.filter((item) => itemVisible(item))
        : []
      if (visibleItems.length === 0) return false
      if (group.to) return pathMatches(location.pathname, group.to)
      return visibleItems.some((item) => pathMatches(location.pathname, item.to))
    })
    return match?.id ?? null
  }, [location.pathname])

  const [openGroups, setOpenGroups] = useState(() => {
    // Only the group that contains the current route starts open; all others stay closed.
    const initial = {}
    const activeGroup = MENU_GROUPS.find(
      (group) =>
        Array.isArray(group.items) &&
        group.items.some(
          (item) =>
            itemVisible(item) &&
            pathMatches(location.pathname, item.to),
        ),
    )
    if (activeGroup) initial[activeGroup.id] = true
    return initial
  })

  const setOnlyOpenGroup = (groupId) => {
    setOpenGroups(() => {
      const next = {}
      MENU_GROUPS.forEach((g) => {
        if (Array.isArray(g.items)) next[g.id] = false
      })
      if (groupId) next[groupId] = true
      return next
    })
  }

  const [flyout, setFlyout] = useState(() => ({
    groupId: null,
    anchorRect: null,
    left: 0,
    top: 0,
  }))

  const closeFlyout = () => {
    setFlyout((prev) => ({ ...prev, groupId: null, anchorRect: null }))
    flyoutAnchorRef.current = null
  }

  const openFlyout = (groupId, anchorEl) => {
    const rect = anchorEl?.getBoundingClientRect?.()
    const sidebarRect = sidebarRef.current?.getBoundingClientRect?.()

    const leftBase = sidebarRect?.right ?? rect?.right ?? 0
    const left = Math.round(leftBase + 12)
    const top = Math.round((rect?.top ?? 0) + 2)

    setFlyout({ groupId, anchorRect: rect ?? null, left, top })
    flyoutAnchorRef.current = anchorEl ?? null
  }

  useEffect(() => {
    // Keep only the group for the current route open. On routes with no submenu
    // (e.g. Dashboard) close every group instead of leaving them all open.
    const group = MENU_GROUPS.find((g) => g.id === matchingGroupId)
    if (group && Array.isArray(group.items)) {
      setOnlyOpenGroup(matchingGroupId)
    } else {
      setOnlyOpenGroup(null)
    }
     
  }, [matchingGroupId])

  useEffect(() => {
    // Close flyout on route change.
    closeFlyout()
     
  }, [location.pathname])

  useEffect(() => {
    // If sidebar is expanded, flyout is not needed.
    if (!collapsed) closeFlyout()
     
  }, [collapsed])

  useEffect(() => {
    if (!flyout.groupId) return

    const onPointerDown = (e) => {
      const t = e.target
      if (!t) return
      const fly = flyoutRef.current
      const anchor = flyoutAnchorRef.current

      if (fly && fly.contains(t)) return
      if (anchor && anchor.contains && anchor.contains(t)) return
      closeFlyout()
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeFlyout()
    }

    const onReposition = () => {
      const anchor = flyoutAnchorRef.current
      const rect = anchor?.getBoundingClientRect?.()
      const sidebarRect = sidebarRef.current?.getBoundingClientRect?.()
      if (!rect) return

      const leftBase = sidebarRect?.right ?? rect.right
      const left = Math.round(leftBase + 12)
      const top = Math.round(rect.top + 2)
      setFlyout((prev) => (prev.groupId ? { ...prev, anchorRect: rect, left, top } : prev))
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [flyout.groupId])

  useLayoutEffect(() => {
    if (!flyout.groupId) return

    const el = flyoutRef.current
    if (!el) return

    const margin = 12
    const rect = el.getBoundingClientRect()
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin)
    const clampedTop = Math.min(Math.max(flyout.top, margin), maxTop)

    if (clampedTop !== flyout.top) {
      setFlyout((prev) => (prev.groupId ? { ...prev, top: clampedTop } : prev))
    }
  }, [flyout.groupId, flyout.top])

  const flyoutGroup = useMemo(() => {
    if (!flyout.groupId) return null
    const group = MENU_GROUPS.find((g) => g.id === flyout.groupId)
    if (!group || !Array.isArray(group.items)) return null

    const visibleItems = group.items.filter((item) => itemVisible(item))
    return { group, visibleItems }
  }, [flyout.groupId])

  return (
    <>
      <div
        className={`vm-sidebar-overlay ${open && showCloseButton ? 'is-open' : ''}`}
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="Close menu"
      />

      <aside ref={sidebarRef} className={`vm-sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
        <div className="vm-sidebar-top">
          <div className="vm-sidebar-brand">
            <img className="vm-sidebar-logo" src={brandLogo || logo} alt={brandTitle} />
            <span className="vm-sidebar-brand-text">{brandTitle}</span>
          </div>
          <button
            type="button"
            className="vm-sidebar-collapse"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '\u00BB' : '\u00AB'}
          </button>
          {showCloseButton ? (
            <button
              type="button"
              className="vm-icon-btn vm-sidebar-close"
              onClick={onClose}
              aria-label="Close menu"
            >
              {'\u2715'}
            </button>
          ) : null}
        </div>

        <nav className="vm-nav">
          {MENU_GROUPS.map((group) => {
            const visibleItems = Array.isArray(group.items)
              ? group.items.filter((item) => itemVisible(item))
              : []
            const isVisible = group.to ? true : visibleItems.length > 0
            if (!isVisible) return null

            const isOpen = Boolean(openGroups[group.id])
            const isActive = group.to
              ? pathMatches(location.pathname, group.to)
              : visibleItems.some((item) => pathMatches(location.pathname, item.to))

            const labelNode = <span className="vm-nav-label">{group.label}</span>

            return (
              <div key={group.id}>
                {group.to ? (
                  <NavLink
                    to={group.to}
                    className={({ isActive: navActive }) => `vm-nav-item vm-nav-item-muted ${navActive || isActive ? 'active' : ''}`}
                    title={collapsed ? group.label : undefined}
                  >
                    <span className="vm-nav-icon">
                      <NavIcon name={group.icon} />
                    </span>
                    {labelNode}
                  </NavLink>
                ) : (
                  <button
                    type="button"
                    className={`vm-nav-item vm-nav-item-muted ${isOpen ? 'is-open' : ''} ${isActive ? 'is-active' : ''}`}
                    onClick={(e) => {
                      // In collapsed desktop mode the labels/submenu are hidden, so
                      // navigate straight to the section's first accessible page.
                      if (collapsed) {
                        const first = visibleItems.find((item) => item.to)
                        if (first) {
                          closeFlyout()
                          navigate(first.to)
                        } else {
                          openFlyout(group.id, e.currentTarget)
                        }
                        return
                      }

                      if (isOpen) setOnlyOpenGroup(null)
                      else setOnlyOpenGroup(group.id)
                    }}
                    title={collapsed ? group.label : undefined}
                  >
                    <span className="vm-nav-icon">
                      <NavIcon name={group.icon} />
                    </span>
                    {labelNode}
                    <span className="vm-nav-caret">{'\u25BE'}</span>
                  </button>
                )}

                {visibleItems.length > 0 ? (
                  <div className={`vm-subnav ${isOpen && !collapsed ? 'is-open' : ''}`}>
                    {visibleItems.map((item) =>
                      item.to ? (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive: navActive }) => `vm-subnav-item${navActive ? ' active' : ''}`}
                        >
                          {item.label}
                        </NavLink>
                      ) : (
                        <button key={`${group.id}-${item.label}`} type="button" className="vm-subnav-item" aria-disabled="true" disabled>
                          {item.label}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

      </aside>

      {collapsed && flyoutGroup
        ? createPortal(
            <div
              ref={flyoutRef}
              className="vm-flyout"
              style={{ left: `${flyout.left}px`, top: `${flyout.top}px` }}
              role="dialog"
              aria-label={`${flyoutGroup.group.label} menu`}
            >
              <div className="vm-flyout-head">
                <div className="vm-flyout-title">{flyoutGroup.group.label}</div>
              </div>
              <div className="vm-flyout-body">
                {flyoutGroup.visibleItems.length === 0 ? (
                  <div className="vm-flyout-empty">No accessible items</div>
                ) : (
                  flyoutGroup.visibleItems.map((item) =>
                    item.to ? (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive: navActive }) => `vm-flyout-item${navActive ? ' active' : ''}`}
                        onClick={() => closeFlyout()}
                      >
                        {item.label}
                      </NavLink>
                    ) : (
                      <button key={`${flyoutGroup.group.id}-${item.label}`} type="button" className="vm-flyout-item" disabled>
                        {item.label}
                      </button>
                    ),
                  )
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export default Sidebar
