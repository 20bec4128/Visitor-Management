import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import QRScanModal from '../components/QRScanModal.jsx'
import '../components/QRScanModal.css'
import StatCard from '../components/dashboard/StatCard.jsx'
import { ApprovalDonut, VisitorTrendArea, WeeklyBar } from '../components/dashboard/DashboardAnalytics.jsx'
import useIsMobile from '../hooks/useIsMobile.js'
import useWebViewDesktopMode from '../hooks/useWebViewDesktopMode.js'
import { listPreRegisterRequests, listVisitRequests } from '../api/visitor.js'
import { listNotices } from '../api/config.js'
import './DashboardPage.css'

function MobileStat({ title, value, tone, onClick }) {
  return (
    <div className={`vm-mstat vm-mstat-${tone}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="vm-mstat-title">{title}</div>
      <div className="vm-mstat-value">{value}</div>
      <span className="vm-mstat-caret" aria-hidden="true">
        v
      </span>
    </div>
  )
}

function Tile({ label, icon, onClick }) {
  return (
    <button type="button" className="vm-mtile" onClick={onClick}>
      <span className="vm-mtile-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="vm-mtile-label">{label}</span>
    </button>
  )
}

function IconTileVisitors() {
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

function IconTileCalendarPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M12 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconTileCalendar() {
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

function IconTileNotice() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14H9a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M7 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M10 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

function IconTileBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M6 21h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconTileSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19.4 15a8.5 8.5 0 0 0 .1-1l2-1.2-2-3.4-2.3.5a8.8 8.8 0 0 0-1.6-1l-.3-2.4H10.7l-.3 2.4a8.8 8.8 0 0 0-1.6 1l-2.3-.5-2 3.4 2 1.2a8.5 8.5 0 0 0 .1 1 8.5 8.5 0 0 0-.1 1l-2 1.2 2 3.4 2.3-.5c.5.4 1 .8 1.6 1l.3 2.4h4.6l.3-2.4c.6-.2 1.1-.6 1.6-1l2.3.5 2-3.4-2-1.2a8.5 8.5 0 0 0-.1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16.2 16.2 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconBot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        fill="currentColor"
      />
      <path
        d="M7 14c1.1 1 2.6 1.6 5 1.6S15.9 15 17 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 21h10a4 4 0 0 0 4-4v-5a6 6 0 0 0-6-6H9a6 6 0 0 0-6 6v5a4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MobileSearch({ value, onChange, onSubmit }) {
  return (
    <form className="vm-msearch" onSubmit={onSubmit} role="search" aria-label="Search visitors">
      <span className="vm-msearch-icon" aria-hidden="true">
        <IconSearch />
      </span>
      <input value={value} onChange={onChange} placeholder="Search visitors..." />
      <button type="submit" className="vm-msearch-btn" aria-label="Search">
        <IconBot />
      </button>
    </form>
  )
}

function LatestNote({ title, description, onView }) {
  return (
    <section className="vm-mnotice" aria-label="Latest note">
      <div className="vm-mnotice-body">
        <div className="vm-mnotice-title">Important Announcement</div>
        <div className="vm-mnotice-text">
          <span className="vm-mnotice-lead">Please note:</span> {description || title || 'No announcements yet.'}
        </div>
        <button type="button" className="vm-mnotice-btn" onClick={onView}>
          View Details
        </button>
      </div>
      <div className="vm-mnotice-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M10 11 6 12v5l4-1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 9 18 6v12l-8-3V9Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M20.5 8.5c.9.9.9 6.1 0 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </section>
  )
}

function ScheduleItem({ tone, title, subtitle, onClick }) {
  return (
    <button type="button" className="vm-mschedule-item" onClick={onClick}>
      <span className={`vm-mschedule-icon vm-mschedule-icon-${tone}`} aria-hidden="true">
        {tone === 'orange' ? (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 3v2M16 3v2M6 7h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M7 5h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
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
        )}
      </span>
      <span className="vm-mschedule-main">
        <span className="vm-mschedule-title">{title}</span>
        <span className="vm-mschedule-sub">{subtitle}</span>
      </span>
      <span className="vm-mschedule-chevron" aria-hidden="true">
        {'>'}
      </span>
    </button>
  )
}

function DashboardPage() {
  const isMobileViewport = useIsMobile()
  const forceDesktopUi = useWebViewDesktopMode()
  const isMobileUi = isMobileViewport && !forceDesktopUi
  const navigate = useNavigate()

  const [showQRModal, setShowQRModal] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingVisitsCount, setPendingVisitsCount] = useState(0)
  const [todayVisitor, setTodayVisitor] = useState(0)
  const [checkedIn, setCheckedIn] = useState(0)
  const [mobileSearch, setMobileSearch] = useState('')
  const [totalVisitors, setTotalVisitors] = useState(0)
  const [totalPreRegister, setTotalPreRegister] = useState(0)
  const [todayVisitorsList, setTodayVisitorsList] = useState([])
  const [allVisits, setAllVisits] = useState([])
  const [allPreRegs, setAllPreRegs] = useState([])
  const [checkedOut, setCheckedOut] = useState(0)
  const [trendRange, setTrendRange] = useState('weekly') // today | weekly | monthly

  const fetchStats = useCallback((cancelledRef) => {
    Promise.all([
      listPreRegisterRequests().catch(() => []),
      listVisitRequests().catch(() => []),
    ])
      .then(([preRegsRaw, visitsRaw]) => {
        if (cancelledRef?.current) return
        const preRegs = Array.isArray(preRegsRaw) ? preRegsRaw : []
        const visits = Array.isArray(visitsRaw) ? visitsRaw : []

        setTotalVisitors(visits.length)
        setTotalPreRegister(preRegs.length)

        const pendingPreReg = preRegs.filter((r) => (r?.status ?? '').toString().toUpperCase() === 'PENDING').length
        const pendingVisits = visits.filter((r) => (r?.status ?? '').toString().toUpperCase() === 'PENDING').length
        setPendingCount(pendingPreReg + pendingVisits)
        setPendingVisitsCount(pendingVisits)

        const today = new Date().toDateString()
        const todayVisits = visits
          .filter((r) => {
            const d = r?.visitAt || r?.entryTime || r?.createdAt
            return d && new Date(d).toDateString() === today
          })
          .sort((a, b) => {
            const ad = new Date(a?.visitAt || a?.entryTime || a?.createdAt || 0).getTime()
            const bd = new Date(b?.visitAt || b?.entryTime || b?.createdAt || 0).getTime()
            return bd - ad
          })

        setTodayVisitor(todayVisits.length)
        setTodayVisitorsList(todayVisits.slice(0, 5))

        const checked = visits.filter((r) => (r?.status ?? '').toString().toUpperCase() === 'CHECKED_IN').length
        setCheckedIn(checked)

        const checkedOutCount = visits.filter((r) => (r?.status ?? '').toString().toUpperCase() === 'CHECKED_OUT').length
        setCheckedOut(checkedOutCount)

        setAllVisits(visits)
        setAllPreRegs(preRegs)
      })
      .catch(() => {
        if (cancelledRef?.current) return
        setPendingCount(0)
        setPendingVisitsCount(0)
        setTodayVisitor(0)
        setCheckedIn(0)
        setTotalVisitors(0)
        setTotalPreRegister(0)
        setTodayVisitorsList([])
        setAllVisits([])
        setAllPreRegs([])
        setCheckedOut(0)
      })
  }, [])

  useEffect(() => {
    const cancelledRef = { current: false }
    fetchStats(cancelledRef)

    const handleUpdate = () => {
      fetchStats(cancelledRef)
    }
    window.addEventListener('vm:notifications-updated', handleUpdate)

    return () => {
      cancelledRef.current = true
      window.removeEventListener('vm:notifications-updated', handleUpdate)
    }
  }, [fetchStats])

  const [latestNotice, setLatestNotice] = useState(null)

  useEffect(() => {
    let cancelled = false
    listNotices()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        // API returns newest-first; prefer a published notice if present.
        const published = list.filter((n) => String(n?.status || '').toLowerCase() === 'published')
        setLatestNotice((published[0] || list[0]) ?? null)
      })
      .catch(() => {
        if (!cancelled) setLatestNotice(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tiles = useMemo(
    () => [
      { label: 'Visitors', icon: <IconTileVisitors />, to: '/visitors' },
      { label: 'Pre-Register', icon: <IconTileCalendarPlus />, to: '/preregister' },
      { label: 'Today Visitor', icon: <IconTileCalendar />, to: '/today-visitor' },
      { label: 'Notice Board', icon: <IconTileNotice />, to: '/notice-board' },
      { label: 'Contact Diary', icon: <IconTileBook />, to: '/contact-diary' },
      { label: 'Settings', icon: <IconTileSettings />, to: '/settings' },
    ],
    [],
  )

  const trendData = useMemo(() => {
    const visits = Array.isArray(allVisits) ? allVisits : []
    const preRegs = Array.isArray(allPreRegs) ? allPreRegs : []

    const toDateKey = (value) => {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    if (trendRange === 'today') {
      const now = new Date()
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const hours = Array.from({ length: 12 }, (_, i) => i * 2)
      return hours.map((h) => {
        const t0 = new Date(start)
        t0.setHours(h, 0, 0, 0)
        const t1 = new Date(start)
        t1.setHours(h + 2, 0, 0, 0)

        const v = visits.filter((r) => {
          const d = new Date(r?.visitAt || r?.entryTime || r?.createdAt || 0)
          return d >= t0 && d < t1
        }).length

        const p = preRegs.filter((r) => {
          const d = new Date(r?.createdAt || r?.visitAt || r?.requestedAt || 0)
          return d >= t0 && d < t1
        }).length

        return { label: `${String(h).padStart(2, '0')}:00`, visitors: v, preRegs: p }
      })
    }

    const daysCount = trendRange === 'monthly' ? 30 : 7
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const days = []
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      days.push(d)
    }

    const keys = days.map((d) => toDateKey(d))
    const labels = days.map(
      (d) => `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en', { month: 'short' })}`,
    )
    const keySet = new Set(keys)

    const visitCountMap = {}
    visits.forEach((r) => {
      const k = toDateKey(r?.visitAt || r?.entryTime || r?.createdAt)
      if (!k || !keySet.has(k)) return
      visitCountMap[k] = (visitCountMap[k] || 0) + 1
    })

    const preregCountMap = {}
    preRegs.forEach((r) => {
      const k = toDateKey(r?.createdAt || r?.visitAt || r?.requestedAt)
      if (!k || !keySet.has(k)) return
      preregCountMap[k] = (preregCountMap[k] || 0) + 1
    })

    return keys.map((k, idx) => ({
      label: labels[idx],
      visitors: visitCountMap[k] || 0,
      preRegs: preregCountMap[k] || 0,
    }))
  }, [allPreRegs, allVisits, trendRange])

  const trendSeries = useMemo(() => {
    const rows = Array.isArray(trendData) ? trendData : []
    return {
      labels: rows.map((r) => r?.label ?? ''),
      visitors: rows.map((r) => Number(r?.visitors) || 0),
      preRegs: rows.map((r) => Number(r?.preRegs) || 0),
    }
  }, [trendData])

  const approvalsDonut = useMemo(() => {
    const preRegs = Array.isArray(allPreRegs) ? allPreRegs : []
    const status = (s) => (s ?? '').toString().toUpperCase()

    const pending = preRegs.filter((r) => status(r?.status) === 'PENDING').length
    const approved = preRegs.filter((r) => status(r?.status) === 'APPROVED').length
    const rejected = preRegs.filter((r) => status(r?.status) === 'REJECTED').length
    const other = Math.max(0, preRegs.length - pending - approved - rejected)

    const out = [
      { name: 'Pending', value: pending },
      { name: 'Approved', value: approved },
      { name: 'Rejected', value: rejected },
    ]
    if (other) out.push({ name: 'Other', value: other })
    return out
  }, [allPreRegs])

  const approvalsSeries = useMemo(() => {
    const rows = Array.isArray(approvalsDonut) ? approvalsDonut : []
    return {
      labels: rows.map((r) => r?.name ?? ''),
      values: rows.map((r) => Number(r?.value) || 0),
    }
  }, [approvalsDonut])

  const weeklyBarData = useMemo(() => {
    const visits = Array.isArray(allVisits) ? allVisits : []
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      days.push(d)
    }

    const toDateKey = (value) => {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const keySet = new Set(days.map((d) => toDateKey(d)))
    const countMap = {}
    visits.forEach((r) => {
      const k = toDateKey(r?.visitAt || r?.entryTime || r?.createdAt)
      if (!k || !keySet.has(k)) return
      countMap[k] = (countMap[k] || 0) + 1
    })

    return days.map((d) => {
      const k = toDateKey(d)
      const label = d.toLocaleString('en', { weekday: 'short' })
      return { label, visitors: countMap[k] || 0 }
    })
  }, [allVisits])

  const weeklySeries = useMemo(() => {
    const rows = Array.isArray(weeklyBarData) ? weeklyBarData : []
    return {
      labels: rows.map((r) => r?.label ?? ''),
      values: rows.map((r) => Number(r?.visitors) || 0),
    }
  }, [weeklyBarData])

  if (isMobileUi) {
    return (
      <DashboardShell pageTitle="Dashboard" breadcrumbItems={['Dashboard']} forceDesktopUi={forceDesktopUi}>
        <section className="vm-mobile-dashboard">
          <MobileSearch
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            onSubmit={(e) => {
              e.preventDefault()
              const q = mobileSearch.trim()
              navigate(q ? `/visitors?q=${encodeURIComponent(q)}` : '/visitors')
            }}
          />

          <div className="vm-mstats">
            <MobileStat title="Today Visitor" value={todayVisitor} tone="blue" onClick={() => navigate('/today-visitor')} />
            <MobileStat title="Pending Approvals" value={pendingCount} tone="orange" onClick={() => navigate(pendingVisitsCount > 0 ? '/host-approvals' : '/appointment-bookings')} />
            <MobileStat title="Active Visitors" value={checkedIn} tone="green" onClick={() => navigate('/active-visitors')} />
          </div>

          <div className="vm-mtiles" aria-label="Quick actions">
            {tiles.map((t) => (
              <Tile key={t.to} label={t.label} icon={t.icon} onClick={() => navigate(t.to)} />
            ))}
          </div>

          <LatestNote
            title={latestNotice?.title ?? ''}
            description={latestNotice?.description ?? ''}
            onView={() => navigate('/notice-board')}
          />

          <section className="vm-mschedule" aria-label="Visitor logs">
            <h3 className="vm-mschedule-head">Today's Schedule</h3>
            <div className="vm-mschedule-list">
              <ScheduleItem
                tone="orange"
                title="Visitor pending approval"
                subtitle={`${pendingCount} pending`}
                onClick={() => navigate(pendingVisitsCount > 0 ? '/host-approvals' : '/appointment-bookings')}
              />
              <ScheduleItem
                tone="blue"
                title="Awaiting check-in"
                subtitle={`${checkedIn} checked in`}
                onClick={() => navigate('/visitors')}
              />
            </div>
          </section>
        </section>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell pageTitle="Dashboard" breadcrumbItems={['Dashboard']} forceDesktopUi={forceDesktopUi}>
      <section className="vm-dashboard-desktop">
        <section className="vm-dashboard-kpis" aria-label="Dashboard statistics">
          <StatCard title="Total Visitors" value={String(totalVisitors)} icon="users" tone="info" subtitle="All time" />
          <StatCard title="Today Visitors" value={String(todayVisitor)} icon="cube" tone="success" subtitle="Last 24 hours" />
          <StatCard title="Pre-Registered" value={String(totalPreRegister)} icon="clock" tone="warning" subtitle="All requests" />
          <StatCard title="Pending Approvals" value={String(pendingCount)} icon="grid" tone="danger" subtitle="Awaiting action" />
          <StatCard title="Active Inside" value={String(checkedIn)} icon="users" tone="success" subtitle="Checked in" />
          <StatCard title="Checked Out" value={String(checkedOut)} icon="clock" tone="info" subtitle="Completed visits" />
        </section>

        <section className="vm-dashboard-grid">
          <section className="vm-panel vm-dashboard-analytics">
            <div className="vm-panel-head vm-panel-head-tight">
              <div>
                <h2 className="vm-panel-title">Visitor Analytics</h2>
                <div className="vm-panel-range">Trends and approvals</div>
              </div>
              <div className="vm-dash-filters" role="tablist" aria-label="Trend range">
                <button
                  type="button"
                  className={`vm-filter-btn ${trendRange === 'today' ? 'is-active' : ''}`}
                  onClick={() => setTrendRange('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`vm-filter-btn ${trendRange === 'weekly' ? 'is-active' : ''}`}
                  onClick={() => setTrendRange('weekly')}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  className={`vm-filter-btn ${trendRange === 'monthly' ? 'is-active' : ''}`}
                  onClick={() => setTrendRange('monthly')}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="vm-dash-analytics-main">
              <VisitorTrendArea labels={trendSeries.labels} visitors={trendSeries.visitors} preRegs={trendSeries.preRegs} />
            </div>

            <div className="vm-dash-analytics-split">
              <div className="vm-dash-analytics-card">
                <div className="vm-dash-card-head">
                  <div className="vm-dash-card-title">Approval Status</div>
                <div className="vm-dash-card-sub">Pre-bookings</div>
                </div>
                <ApprovalDonut labels={approvalsSeries.labels} values={approvalsSeries.values} />
              </div>
              <div className="vm-dash-analytics-card">
                <div className="vm-dash-card-head">
                  <div className="vm-dash-card-title">Weekly Visitors</div>
                  <div className="vm-dash-card-sub">Last 7 days</div>
                </div>
                <WeeklyBar labels={weeklySeries.labels} values={weeklySeries.values} />
              </div>
            </div>
          </section>

          <aside className="vm-dashboard-side" aria-label="Dashboard side panels">
            <section className="vm-panel">
              <div className="vm-panel-head">
                <h3 className="vm-panel-title">📢 Announcement</h3>
                <button type="button" className="vm-panel-link" onClick={() => navigate('/notice-board')}>
                  View All &gt;
                </button>
              </div>
              <div style={{ padding: '4px 2px' }}>
                {latestNotice ? (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{latestNotice.title}</div>
                    <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
                      {latestNotice.description || 'No details provided.'}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#64748b', fontSize: 13 }}>No announcements yet.</div>
                )}
              </div>
            </section>

            <section className="vm-panel vm-dashboard-actions">
              <div className="vm-panel-head">
                <h3 className="vm-panel-title">Quick Actions</h3>
                <span className="vm-panel-range">Shortcuts</span>
              </div>
              <div className="vm-quick-actions">
                <button type="button" className="vm-qa-btn is-primary" onClick={() => navigate('/visitors/create')}>
                  Add Visitor
                </button>
                <button type="button" className="vm-qa-btn" onClick={() => navigate('/preregister/create')}>
                  Pre Register
                </button>
                <button type="button" className="vm-qa-btn" onClick={() => setShowQRModal(true)}>
                  Scan QR
                </button>
                <button type="button" className="vm-qa-btn" onClick={() => navigate('/visitors')}>
                  Check In
                </button>
                <button type="button" className="vm-qa-btn" onClick={() => navigate('/host-approvals')}>
                  Approval Requests
                </button>
              </div>
            </section>

            <section className="vm-panel vm-dashboard-today">
              <div className="vm-panel-head">
                <h3 className="vm-panel-title">Today's Visitors</h3>
                <button type="button" className="vm-panel-link" onClick={() => navigate('/today-visitor')}>
                  View All &gt;
                </button>
              </div>
              <div className="vm-dashboard-tablewrap">
                <table className="vm-mini-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Host</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayVisitorsList.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="vm-mini-empty">
                          No visitors for today.
                        </td>
                      </tr>
                    ) : (
                      todayVisitorsList.map((item, idx) => {
                        const name = item?.visitorName || item?.name || item?.fullName || '-'
                        const host = item?.hostName || item?.host || item?.hostUserName || '-'
                        const status = (item?.status || '').toString()
                        const statusKey = status.toLowerCase().replace(/\s+/g, '_')
                        const label = status ? status.replace(/_/g, ' ').toLowerCase() : '-'
                        return (
                          <tr key={item?.id ?? `${idx}-${name}`}>
                            <td>{name}</td>
                            <td>{host}</td>
                            <td>
                              <span className={`vm-mini-status vm-mini-status-${statusKey}`}>{label}</span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="vm-panel vm-dashboard-pending">
              <div className="vm-panel-head">
                <h3 className="vm-panel-title">Pending Approvals</h3>
                <span className="vm-panel-range">{pendingCount} pending</span>
              </div>
              <div className="vm-dashboard-pending-body">
                <div className="vm-dashboard-pending-count">{pendingCount}</div>
                <div className="vm-dashboard-pending-meta">Approvals pending</div>
                <button type="button" className="vm-dashboard-cta" onClick={() => navigate(pendingVisitsCount > 0 ? '/host-approvals' : '/appointment-bookings')}>
                  Review Now
                </button>
              </div>
            </section>
          </aside>
        </section>
      </section>

      <QRScanModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onScan={(code) => {
          setShowQRModal(false)
          navigate(`/pre-register-entry/${encodeURIComponent(code)}`)
        }}
      />
    </DashboardShell>
  )
}

export default DashboardPage

