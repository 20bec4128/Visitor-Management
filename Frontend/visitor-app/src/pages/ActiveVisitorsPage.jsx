import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import VisitorDetailsModal from '../components/VisitorDetailsModal.jsx'
import EditVisitModal from '../components/EditVisitModal.jsx'
import { checkOutVisitor, listVisitRequests } from '../api/visitor.js'
import useIsMobile from '../hooks/useIsMobile.js'
import './VisitorListPage.css'

function formatDateOnly(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function formatTimeOnly(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ActiveVisitorsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile('(max-width: 576px)')
  const desktopColumnsRef = useRef(null)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loadError, setLoadError] = useState('')
  const [checkingOut, setCheckingOut] = useState(null)
  const checkoutTimersRef = useRef(new Map())
  const [selectedVisitor, setSelectedVisitor] = useState(null)
  const [editingVisitor, setEditingVisitor] = useState(null)

  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    name: true,
    email: true,
    phone: true,
    hostName: true,
    visitAt: true,
    entryTime: true,
    exitTime: true,
    status: true,
  })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Visitor Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'hostName', label: 'Host' },
    { key: 'visitAt', label: 'Visit Date' },
    { key: 'entryTime', label: 'Entry Time' },
    { key: 'exitTime', label: 'Exit Time' },
    { key: 'status', label: 'Status' },
  ]

  useEffect(() => {
    if (!isMobile) {
      if (desktopColumnsRef.current) {
        setVisibleColumns(desktopColumnsRef.current)
        desktopColumnsRef.current = null
      }
      return
    }

    setVisibleColumns((prev) => {
      if (!desktopColumnsRef.current) desktopColumnsRef.current = prev
      const next = Object.fromEntries(Object.keys(prev).map((key) => [key, false]))
      next.name = true
      next.hostName = true
      next.entryTime = true
      next.status = true
      return next
    })
  }, [isMobile])

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  const fetchItems = useCallback((cancelledRef) => {
    setLoadError('')
    listVisitRequests('CHECKED_IN')
      .then((data) => {
        if (cancelledRef?.current) return
        const list = Array.isArray(data) ? data : []
        setItems(
          list.filter((item) => String(item?.status ?? '').toUpperCase() === 'CHECKED_IN'),
        )
      })
      .catch((err) => {
        if (cancelledRef?.current) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load active visitors.')
        setItems([])
      })
  }, [])

  useEffect(() => {
    const cancelledRef = { current: false }
    fetchItems(cancelledRef)

    const handleUpdate = () => {
      fetchItems(cancelledRef)
    }
    window.addEventListener('vm:notifications-updated', handleUpdate)

    return () => {
      cancelledRef.current = true
      window.removeEventListener('vm:notifications-updated', handleUpdate)
    }
  }, [fetchItems])

  useEffect(() => {
    return () => {
      for (const timer of checkoutTimersRef.current.values()) {
        clearTimeout(timer)
      }
      checkoutTimersRef.current.clear()
    }
  }, [])

  const filteredItems = useMemo(() => {
    const list = Array.isArray(items) ? items : []
    if (!search.trim()) return list
    const query = search.trim().toLowerCase()
    return list.filter((item) =>
      [item.id, item.visitorName, item.visitorEmail, item.visitorPhone, item.hostName, item.status]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [items, search])

  const handleCheckOut = async (id) => {
    if (!window.confirm('Check out this visitor?')) return
    setCheckingOut(id)

    try {
      const updated = await checkOutVisitor(id)
      setItems((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                ...(updated && typeof updated === 'object' ? updated : {}),
                status: (updated && updated.status) || 'CHECKED_OUT',
                exitTime: (updated && updated.exitTime) || new Date().toISOString(),
              }
            : row,
        ),
      )

      const existing = checkoutTimersRef.current.get(id)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        setItems((prev) => prev.filter((row) => row.id !== id))
        checkoutTimersRef.current.delete(id)
      }, 1200)
      checkoutTimersRef.current.set(id, timer)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to check out.')
    } finally {
      setCheckingOut(null)
    }
  }

  const handleEditSaved = (updated) => {
    if (!editingVisitor) return
    setItems((prev) =>
      prev.map((row) => (row.id === editingVisitor.id ? { ...row, ...updated } : row)),
    )
    setEditingVisitor(null)
  }

  return (
    <DashboardShell pageTitle="Active Visitors" breadcrumbItems={['Active Visitors']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2>Active Visitors</h2>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search active visitors"
          columns={columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        {loadError ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>{loadError}</div>
        ) : null}

        <div className="vm-table-wrap">
          <table className="vm-table vm-visitor-table">
            <thead>
              <tr>
                {visibleColumns.id ? <th>ID</th> : null}
                {visibleColumns.name ? <th>Visitor Name</th> : null}
                {visibleColumns.email ? <th>Email</th> : null}
                {visibleColumns.phone ? <th>Phone</th> : null}
                {visibleColumns.hostName ? <th>Host</th> : null}
                {visibleColumns.visitAt ? <th>Visit Date</th> : null}
                {visibleColumns.entryTime ? <th>Entry Time</th> : null}
                {visibleColumns.exitTime ? <th>Exit Time</th> : null}
                {visibleColumns.status ? <th className="vm-col-status">Status</th> : null}
                <th className="vm-th-actions vm-col-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 18, textAlign: 'center', color: '#6b7280' }}>
                    No active visitors.
                  </td>
                </tr>
              ) : null}

              {filteredItems.map((item) => {
                const isCheckedIn = String(item?.status ?? '').toUpperCase() === 'CHECKED_IN'
                return (
                  <tr
                    key={item.id}
                    className="vm-clickable-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedVisitor(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedVisitor(item)
                      }
                    }}
                  >
                    {visibleColumns.id ? <td>{item.id}</td> : null}
                    {visibleColumns.name ? <td>{item.visitorName}</td> : null}
                    {visibleColumns.email ? <td>{item.visitorEmail || '-'}</td> : null}
                    {visibleColumns.phone ? <td>{item.visitorPhone || '-'}</td> : null}
                    {visibleColumns.hostName ? <td>{item.hostName || '-'}</td> : null}
                    {visibleColumns.visitAt ? <td>{formatDateOnly(item.visitAt)}</td> : null}
                    {visibleColumns.entryTime ? <td>{item.entryTime ? formatTimeOnly(item.entryTime) : '-'}</td> : null}
                    {visibleColumns.exitTime ? <td>{item.exitTime ? formatTimeOnly(item.exitTime) : '-'}</td> : null}
                    {visibleColumns.status ? (
                      <td className="vm-col-status">
                        <span className={`vm-visitor-status vm-visitor-status-${String(item.status || '').toLowerCase()}`}>
                          {String(item.status || '').toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </td>
                    ) : null}
                    <td className="vm-actions vm-col-actions">
                      <button
                        type="button"
                        className="vm-action-btn vm-action-edit"
                        aria-label="Edit visit"
                        title="Edit visit"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingVisitor(item)
                        }}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="vm-action-btn vm-action-reject vm-action-checkout"
                        aria-label="Check Out Visitor"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleCheckOut(item.id)
                        }}
                        disabled={!isCheckedIn || checkingOut === item.id}
                        title={isCheckedIn ? 'Check out' : 'Already checked out'}
                      >
                        <span className="vm-action-text">{checkingOut === item.id ? 'Checking...' : 'Check Out'}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <VisitorDetailsModal
        open={Boolean(selectedVisitor)}
        item={selectedVisitor}
        primaryAction={
          selectedVisitor
            ? {
                label: checkingOut === selectedVisitor.id ? 'Checking...' : 'Check Out',
                disabled: checkingOut === selectedVisitor.id,
                className: 'vm-btn-orange vm-btn-checkout',
                onClick: () => {
                  handleCheckOut(selectedVisitor.id)
                  setSelectedVisitor(null)
                },
              }
            : null
        }
        onClose={() => setSelectedVisitor(null)}
      />

      <EditVisitModal
        key={editingVisitor?.id ?? 'none'}
        open={Boolean(editingVisitor)}
        item={editingVisitor}
        onClose={() => setEditingVisitor(null)}
        onSaved={handleEditSaved}
      />
    </DashboardShell>
  )
}

export default ActiveVisitorsPage
