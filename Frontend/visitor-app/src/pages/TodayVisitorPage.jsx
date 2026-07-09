import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import { IconPencil, IconTrash } from '../components/dashboard/ActionIcons.jsx'
import VisitorDetailsModal from '../components/VisitorDetailsModal.jsx'
import EditVisitModal from '../components/EditVisitModal.jsx'
import { checkInPreRegister, checkInVisitor, checkOutVisitor, deleteVisitRequest, deletePreRegisterRequest, listVisitRequests, listPreRegisterRequests } from '../api/visitor.js'
import { hasPermission } from '../auth/authStorage.js'
import { PERMISSIONS } from '../rbac/access.js'
import useIsMobile from '../hooks/useIsMobile.js'
import './VisitorListPage.css'

async function fetchTodayItems() {
  const today = new Date().toDateString()
  // Only fetch pre-registrations when the user can view them (e.g. employees can't);
  // otherwise that call 403s and would break the whole page.
  const canViewPrereg = hasPermission(PERMISSIONS.preregisterView)
  const [visitData, preregData] = await Promise.all([
    listVisitRequests(),
    // Skip when not permitted; also tolerate a 403 from a stale session so the
    // page still renders the visits instead of erroring out entirely.
    canViewPrereg ? listPreRegisterRequests().catch(() => []) : Promise.resolve([]),
  ])
  const visits = (Array.isArray(visitData) ? visitData : []).filter((item) => {
    const d = item.visitAt ? new Date(item.visitAt) : null
    return d && d.toDateString() === today
  }).map((item) => ({ ...item, _source: 'visit' }))
  const preregs = (Array.isArray(preregData) ? preregData : []).filter((item) => {
    const d = item.createdAt ? new Date(item.createdAt) : null
    return d && d.toDateString() === today
  }).map((item) => ({ ...item, _source: 'prereg', _uid: `prereg-${item.id}` }))
  const combined = [...visits, ...preregs]
  combined.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.visitAt || 0).getTime()
    const timeB = new Date(b.createdAt || b.visitAt || 0).getTime()
    return timeB - timeA
  })
  return combined
}

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

function TodayVisitorPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile('(max-width: 576px)')
  const desktopColumnsRef = useRef(null)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loadError, setLoadError] = useState('')
  const [checkingOut, setCheckingOut] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [selectedVisitor, setSelectedVisitor] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    type: true,
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
    { key: 'type', label: 'Type' },
    { key: 'name', label: 'Visitor Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'hostName', label: 'Host' },
    { key: 'visitAt', label: 'Date' },
    { key: 'entryTime', label: 'Entry Time' },
    { key: 'exitTime', label: 'Exit Time' },
    { key: 'status', label: 'Status' },
  ]

  const mobileColumns = [
    { key: 'name', label: 'Visitor Name' },
    { key: 'hostName', label: 'Host' },
    { key: 'entryTime', label: 'Entry Time' },
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
    if (isMobile && !['name', 'hostName', 'entryTime', 'status'].includes(key)) return
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  const fetchItems = useCallback((cancelledRef) => {
    setLoadError('')
    fetchTodayItems()
      .then((data) => {
        if (cancelledRef?.current) return
        setItems(data)
      })
      .catch((err) => {
        if (cancelledRef?.current) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load today visitors.')
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

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const query = search.trim().toLowerCase()
    return items.filter((item) =>
      [
        item.id,
        item.visitorName,
        item.visitorEmail || item.email,
        item.visitorPhone || item.phone,
        item.hostName,
        item.status,
        item._source === 'prereg' ? 'visit' : 'Walk-in',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search, items])

  const handleCheckOut = async (id) => {
    if (!window.confirm('Check out this visitor?')) return
    setCheckingOut(id)
    try {
      await checkOutVisitor(id)
      setItems((prev) =>
        prev.filter((item) => item.id !== id),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to check out.')
    } finally {
      setCheckingOut(null)
    }
  }

  const handleEditSaved = (updated) => {
    if (!editingItem) return
    setItems((prev) =>
      prev.map((row) =>
        row.id === editingItem.id && row._source === 'visit' ? { ...row, ...updated } : row,
      ),
    )
    setEditingItem(null)
  }

  const canCheckIn = hasPermission(PERMISSIONS.visitsCheckin)
  const canCheckOut = hasPermission(PERMISSIONS.visitsCheckout)
  const canEdit = hasPermission(PERMISSIONS.visitsEdit)
  const canDelete = hasPermission(PERMISSIONS.visitsDelete)
  const canDeletePrereg = hasPermission(PERMISSIONS.preregisterManage)
  const canAddVisitor = hasPermission(PERMISSIONS.visitorsCreate)
  const showActions = canCheckIn || canCheckOut || canEdit || canDelete || canDeletePrereg

  const handleCheckIn = async (item) => {
    if (!window.confirm('Check in this visitor now?')) return
    setActionBusy(true)
    try {
      if (item._source === 'prereg') {
        await checkInPreRegister(item.id)
      } else {
        await checkInVisitor(item.id)
      }
      const data = await fetchTodayItems()
      setItems(data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to check in visitor.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this record?')) return
    setActionBusy(true)
    try {
      if (item._source === 'prereg') {
        await deletePreRegisterRequest(item.id)
        setItems((prev) => prev.filter((row) => row._uid !== item._uid))
      } else {
        await deleteVisitRequest(item.id)
        setItems((prev) => prev.filter((row) => row.id !== item.id || row._source !== 'visit'))
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete record.')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <DashboardShell pageTitle="Today Visitor" breadcrumbItems={['Today Visitor']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Today Visitor</h2>
          </div>
          {canAddVisitor ? (
            <div className="vm-visitor-head-actions">
              <button type="button" className="vm-btn vm-btn-orange" onClick={() => navigate('/visitors/create')}>
                + Add Visitor
              </button>
            </div>
          ) : null}
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search today's visitors"
          columns={isMobile ? mobileColumns : columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        {loadError ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
            {loadError}
          </div>
        ) : null}

        <div className="vm-table-wrap">
          <table className="vm-table vm-visitor-table">
            <thead>
              <tr>
                {visibleColumns.id ? <th>ID</th> : null}
                {visibleColumns.type ? <th>Type</th> : null}
                {visibleColumns.name ? <th>Visitor Name</th> : null}
                {visibleColumns.email ? <th>Email</th> : null}
                {visibleColumns.phone ? <th>Phone</th> : null}
                {visibleColumns.hostName ? <th>Host</th> : null}
                {visibleColumns.visitAt ? <th>Date</th> : null}
                {visibleColumns.entryTime ? <th>Entry Time</th> : null}
                {visibleColumns.exitTime ? <th>Exit Time</th> : null}
                {visibleColumns.status ? <th className="vm-col-status">Status</th> : null}
                {showActions ? <th className="vm-th-actions vm-col-actions">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={99} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No visitors found for today.
                  </td>
                </tr>
              ) : filteredItems.map((item) => {
                const isPrereg = item._source === 'prereg'
                const isPreregType = isPrereg || !!item.preRegisterRequestId
                const rowKey = item._uid ?? item.id
                const visitorName = item.visitorName || '-'
                const email = item.visitorEmail || item.email || '-'
                const phone = item.visitorPhone || item.phone || '-'
                const dateVal = item.visitAt || item.createdAt
                const statusKey = (item.status || '').toLowerCase()
                const showCheckOut = !isPrereg && canCheckOut && (item.status === 'CHECKED_IN' || item.status === 'APPROVED')
                return (
                  <tr
                    key={rowKey}
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
                    {visibleColumns.type ? (
                      <td>
                        <span
                          className="vm-visitor-status"
                          style={isPreregType
                            ? { background: 'rgba(139,92,246,0.12)', color: '#7c3aed' }
                            : { background: 'rgba(37,99,235,0.1)', color: '#1d4ed8' }
                          }
                        >
                          {isPreregType ? 'Pre-Register' : 'Walk-in'}
                        </span>
                      </td>
                    ) : null}
                    {visibleColumns.name ? <td>{visitorName}</td> : null}
                    {visibleColumns.email ? <td>{email}</td> : null}
                    {visibleColumns.phone ? <td>{phone}</td> : null}
                    {visibleColumns.hostName ? <td>{item.hostName || '-'}</td> : null}
                    {visibleColumns.visitAt ? <td>{formatDateOnly(dateVal)}</td> : null}
                    {visibleColumns.entryTime ? <td>{item.entryTime ? formatTimeOnly(item.entryTime) : '-'}</td> : null}
                    {visibleColumns.exitTime ? <td>{item.exitTime ? formatTimeOnly(item.exitTime) : '-'}</td> : null}
                    {visibleColumns.status ? (
                      <td className="vm-col-status">
                        <span className={`vm-visitor-status vm-visitor-status-${statusKey}`}>
                          {(item.status || '').replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </td>
                    ) : null}
                    {showActions ? (
                    <td className="vm-actions vm-col-actions">
                      <span className="vm-action-lead">
                        {((isPrereg && item.status === 'APPROVED') || (!isPrereg && item.status === 'APPROVED')) && canCheckIn ? (
                          <button
                            type="button"
                            className="vm-action-btn vm-action-approve vm-action-checkout"
                            aria-label="Check In"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleCheckIn(item)
                            }}
                            disabled={actionBusy}
                            title="Check in this visitor now"
                          >
                            <span className="vm-action-text">Check In</span>
                          </button>
                        ) : null}
                        {showCheckOut ? (
                          <button
                            type="button"
                            className="vm-action-btn vm-action-reject vm-action-checkout"
                            aria-label="Check Out"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleCheckOut(item.id)
                            }}
                            disabled={checkingOut === item.id}
                          >
                            <span className="vm-action-text">{checkingOut === item.id ? 'Checking...' : 'Check Out'}</span>
                          </button>
                        ) : null}
                      </span>
                      {!isPrereg && canEdit ? (
                        <button
                          type="button"
                          className="vm-action-btn vm-action-edit"
                          aria-label="Edit"
                          onClick={(event) => {
                            event.stopPropagation()
                            setEditingItem(item)
                          }}
                          disabled={actionBusy || checkingOut === item.id}
                        >
                          <IconPencil />
                        </button>
                      ) : null}
                      {(isPrereg ? canDeletePrereg : canDelete) ? (
                        <button
                          type="button"
                          className="vm-action-btn vm-action-del"
                          aria-label="Delete"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDelete(item)
                          }}
                          disabled={actionBusy || checkingOut === item.id}
                        >
                          <IconTrash />
                        </button>
                      ) : null}
                    </td>
                    ) : null}
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
        onClose={() => setSelectedVisitor(null)}
      />

      <EditVisitModal
        key={editingItem?._uid ?? editingItem?.id ?? 'none'}
        open={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={handleEditSaved}
      />
    </DashboardShell>
  )
}

export default TodayVisitorPage
