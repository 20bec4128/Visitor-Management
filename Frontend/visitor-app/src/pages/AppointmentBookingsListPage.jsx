import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconTrash, IconApprove, IconReject } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import RejectReasonModal from '../components/RejectReasonModal.jsx'
import ApprovalTokenModal from '../components/ApprovalTokenModal.jsx'
import { listPreRegisterRequests, approvePreRegister, rejectPreRegister, deletePreRegisterRequest } from '../api/visitor.js'
import { hasPermission, isAdmin, isSecurity, isReceptionist, getAuthSession } from '../auth/authStorage.js'
import { PERMISSIONS } from '../rbac/access.js'
import './VisitorListPage.css'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function AppointmentBookingsListPage() {
  const navigate = useNavigate()
  const session = getAuthSession()
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loadError, setLoadError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectingItem, setRejectingItem] = useState(null)
  const [tokenModalItem, setTokenModalItem] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    visitorName: true,
    email: true,
    phone: true,
    organizationType: true,
    hostName: true,
    createdAt: true,
    status: true,
  })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'visitorName', label: 'Visitor Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'organizationType', label: 'Organization Type' },
    { key: 'hostName', label: 'Host Name' },
    { key: 'createdAt', label: 'Created Date' },
    { key: 'status', label: 'Status' },
  ]

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  const fetchItems = useCallback((cancelledRef) => {
    setLoadError('')
    listPreRegisterRequests()
      .then((data) => {
        if (cancelledRef?.current) return
        setItems(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (cancelledRef?.current) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load appointment bookings.')
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
    const list = Array.isArray(items) ? items : []
    if (!search.trim()) return list
    const query = search.trim().toLowerCase()
    return list.filter((item) =>
      [
        item.id,
        item.visitorName,
        item.email,
        item.phone,
        item.organizationType,
        item.hostName,
        item.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [items, search])

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this appointment? The visitor will receive an email notification.')) return
    setActionLoading(true)
    try {
      const updated = await approvePreRegister(id, {})
      // Keep the approval token from the response so the QR/token can be viewed.
      const merged = (prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...(updated && typeof updated === 'object' ? updated : {}), status: 'APPROVED' }
            : item,
        )
      setItems(merged)
      // Surface the entry token + QR right after approving — admins only.
      if (isAdmin() && updated && typeof updated === 'object' && updated.approvalToken) {
        setTokenModalItem({ ...updated, status: 'APPROVED' })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve appointment.')
    } finally {
      setActionLoading(false)
    }
  }

  const rejectReasons = [
    'Requested time is not suitable',
    'Please reschedule to another slot',
    'Visit requested outside working hours',
    'Too many visitors already scheduled',
  ]

  const canApprove = hasPermission(PERMISSIONS.preregisterApprove)
  const canReject = hasPermission(PERMISSIONS.preregisterReject)
  const canDelete = hasPermission(PERMISSIONS.preregisterManage)

  const showActionColumn = !isSecurity() && !isReceptionist() && (
    isAdmin() ||
    canDelete ||
    filteredItems.some((item) => session.username && item.hostEmail && session.username.toLowerCase() === item.hostEmail.toLowerCase() && item.status && item.status.toUpperCase() === 'PENDING')
  )

  const handleOpenReject = (item) => {
    setRejectingItem(item)
  }

  const handleSelectRejectReason = async (reason) => {
    if (!rejectingItem) return
    setActionLoading(true)
    try {
      const updated = await rejectPreRegister(rejectingItem.id, { reason })
      setItems((prev) =>
        prev.map((item) =>
          item.id === rejectingItem.id
            ? { ...item, ...(updated && typeof updated === 'object' ? updated : {}), status: 'REJECTED', rejectionReason: reason }
            : item,
        ),
      )
      setRejectingItem(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject appointment.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment booking?')) return
    setActionLoading(true)
    try {
      await deletePreRegisterRequest(id)
      setItems((prev) => prev.filter((row) => row.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete appointment.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <DashboardShell pageTitle="Appointment Bookings" breadcrumbItems={['Appointment Bookings']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Appointment Bookings</h2>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search appointment bookings"
          columns={columns}
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
                {visibleColumns.visitorName ? <th>Visitor Name</th> : null}
                {visibleColumns.email ? <th>Email</th> : null}
                {visibleColumns.phone ? <th>Phone</th> : null}
                {visibleColumns.organizationType ? <th>Org Type</th> : null}
                {visibleColumns.hostName ? <th>Host Name</th> : null}
                {visibleColumns.createdAt ? <th>Created Date</th> : null}
                {visibleColumns.status ? <th>Status</th> : null}
                {showActionColumn ? <th className="vm-th-actions">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 && !loadError ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + (showActionColumn ? 1 : 0)} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    No appointment bookings found.
                  </td>
                </tr>
              ) : null}
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  {visibleColumns.id ? <td>{item.id}</td> : null}
                  {visibleColumns.visitorName ? <td>{item.visitorName}</td> : null}
                  {visibleColumns.email ? <td>{item.email || '-'}</td> : null}
                  {visibleColumns.phone ? <td>{item.phone || '-'}</td> : null}
                  {visibleColumns.organizationType ? <td>{item.organizationType || '-'}</td> : null}
                  {visibleColumns.hostName ? <td>{item.hostName || '-'}</td> : null}
                  {visibleColumns.createdAt ? <td>{formatDate(item.createdAt)}</td> : null}
                  {visibleColumns.status ? (
                    <td>
                      <span className={`vm-visitor-status vm-visitor-status-${String(item.status || '').toLowerCase()}`}>
                        {String(item.status || '').toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                  ) : null}
                   {showActionColumn ? (
                    <td className="vm-actions">
                      {(() => {
                        const isItemHost = session.username && item.hostEmail && session.username.toLowerCase() === item.hostEmail.toLowerCase()
                        const itemCanApprove = isAdmin() || isItemHost
                        const itemCanReject = isAdmin() || isItemHost
                        return (
                          <>
                            {isAdmin() && item.status && item.status.toUpperCase() === 'APPROVED' && item.approvalToken ? (
                              <button
                                type="button"
                                className="vm-action-btn"
                                aria-label="View QR & Token"
                                onClick={() => setTokenModalItem(item)}
                                title="View entry token and QR code"
                                style={{ color: '#3b82f6' }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                              </button>
                            ) : null}
                            {item.status && item.status.toUpperCase() === 'PENDING' && itemCanApprove ? (
                              <button
                                type="button"
                                className="vm-action-btn vm-action-approve"
                                aria-label="Approve"
                                onClick={() => handleApprove(item.id)}
                                title="Approve this appointment and notify visitor"
                                disabled={actionLoading}
                              >
                                <IconApprove />
                              </button>
                            ) : null}
                            {item.status && item.status.toUpperCase() === 'PENDING' && itemCanReject ? (
                              <button
                                type="button"
                                className="vm-action-btn vm-action-reject"
                                aria-label="Reject"
                                onClick={() => handleOpenReject(item)}
                                title="Reject this appointment"
                                disabled={actionLoading}
                              >
                                <IconReject />
                              </button>
                            ) : null}
                          </>
                        )
                      })()}
                      {canDelete ? (
                        <button
                          type="button"
                          className="vm-action-btn vm-action-del"
                          aria-label="Delete"
                          onClick={() => handleDelete(item.id)}
                          title="Delete this appointment"
                          disabled={actionLoading}
                        >
                          <IconTrash />
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <RejectReasonModal
        open={Boolean(rejectingItem)}
        title="Reject reason"
        reasons={rejectReasons}
        busy={actionLoading}
        onClose={() => setRejectingItem(null)}
        onSelect={handleSelectRejectReason}
      />

      {tokenModalItem ? (
        <ApprovalTokenModal item={tokenModalItem} onClose={() => setTokenModalItem(null)} />
      ) : null}
    </DashboardShell>
  )
}

export default AppointmentBookingsListPage
