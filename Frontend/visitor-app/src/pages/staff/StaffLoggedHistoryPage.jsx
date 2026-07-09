import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../../components/dashboard/DashboardShell.jsx'
import ListPageToolbar from '../../components/dashboard/ListPageToolbar.jsx'
import { deleteLoggedHistory, listLoggedHistory } from '../../api/staff.js'
import './StaffLoggedHistoryPage.css'

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function cellOrDash(value) {
  const v = String(value ?? '').trim()
  return v ? v : '-'
}

function StaffLoggedHistoryPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [visibleColumns, setVisibleColumns] = useState({
    user: true,
    email: true,
    event: true,
    loginDate: true,
    systemIp: true,
    city: true,
    state: true,
    country: true,
    system: true,
  })

  const columns = [
    { key: 'user', label: 'User' },
    { key: 'email', label: 'Email' },
    { key: 'event', label: 'Event' },
    { key: 'loginDate', label: 'Login Date' },
    { key: 'systemIp', label: 'System IP' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'country', label: 'Country' },
    { key: 'system', label: 'System' },
  ]

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  const loadRows = async () => {
    setLoading(true)
    try {
      const data = await listLoggedHistory()
      setRows(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : 'Failed to load login history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
     
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = [
        r.username,
        r.email,
        r.event,
        r.systemIp,
        r.city,
        r.state,
        r.country,
        r.system,
      ]
        .map((x) => String(x ?? '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [query, rows])

  const handleDelete = async (id) => {
    try {
      await deleteLoggedHistory(id)
      await loadRows()
    } catch {
      await loadRows()
    }
  }

  return (
    <DashboardShell pageTitle="Logged History" breadcrumbItems={['Staff Management', 'Logged History']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Logged History List</h2>
          </div>
          <div />
        </div>

        <ListPageToolbar
          searchValue={query}
          onSearchChange={(e) => setQuery(e.target.value)}
          searchPlaceholder="Search"
          columns={columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        <div className="vm-table-wrap">
          <table className="vm-table vm-logged-table">
            <thead>
              <tr>
                {visibleColumns.user ? <th>USER</th> : null}
                {visibleColumns.email ? <th>EMAIL</th> : null}
                {visibleColumns.event ? <th>EVENT</th> : null}
                {visibleColumns.loginDate ? <th>LOGIN DATE</th> : null}
                {visibleColumns.systemIp ? <th>SYSTEM IP</th> : null}
                {visibleColumns.city ? <th>CITY</th> : null}
                {visibleColumns.state ? <th>STATE</th> : null}
                {visibleColumns.country ? <th>COUNTRY</th> : null}
                {visibleColumns.system ? <th>SYSTEM</th> : null}
                <th className="vm-th-actions">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="vm-empty">
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="vm-empty" style={{ color: '#dc2626' }}>
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="vm-empty">
                    No login history yet
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    {visibleColumns.user ? <td>{cellOrDash(r.username)}</td> : null}
                    {visibleColumns.email ? <td>{cellOrDash(r.email)}</td> : null}
                    {visibleColumns.event ? <td>{cellOrDash(r.event)}</td> : null}
                    {visibleColumns.loginDate ? <td>{formatDate(r.occurredAt)}</td> : null}
                    {visibleColumns.systemIp ? <td>{cellOrDash(r.systemIp)}</td> : null}
                    {visibleColumns.city ? <td>{cellOrDash(r.city)}</td> : null}
                    {visibleColumns.state ? <td>{cellOrDash(r.state)}</td> : null}
                    {visibleColumns.country ? <td>{cellOrDash(r.country)}</td> : null}
                    {visibleColumns.system ? <td>{cellOrDash(r.system)}</td> : null}
                    <td className="vm-actions">
                      <button
                        type="button"
                        className="vm-action-btn vm-action-del"
                        aria-label="Delete"
                        onClick={() => handleDelete(r.id)}
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  )
}

export default StaffLoggedHistoryPage
