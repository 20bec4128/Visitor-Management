import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil, IconTrash, IconApprove, IconReject } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import RejectReasonModal from '../components/RejectReasonModal.jsx'
import EditVisitModal from '../components/EditVisitModal.jsx'
import { approveVisitRequest, checkOutVisitor, deleteVisitRequest, listVisitRequests, rejectVisitRequest } from '../api/visitor.js'
import { hasPermission, isSecurity, isReceptionist, getAuthSession, isAdmin } from '../auth/authStorage.js'
import { PERMISSIONS } from '../rbac/access.js'
import './VisitorListPage.css'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function HostApprovalListPage() {
  const navigate = useNavigate()
  const session = getAuthSession()
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loadError, setLoadError] = useState('')
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [rejectingItem, setRejectingItem] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    visitorName: true,
    email: true,
    phone: true,
    hostName: true,
    visitAt: true,
    purpose: true,
    status: true,
  })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'visitorName', label: 'Visitor Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'hostName', label: 'Host Name' },
    { key: 'visitAt', label: 'Visit Date' },
    { key: 'purpose', label: 'Purpose' },
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
    listVisitRequests()
      .then((data) => {
        if (cancelledRef?.current) return
        setItems(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (cancelledRef?.current) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load approvals.')
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
        item.visitorEmail,
        item.visitorPhone,
        item.hostName,
        item.status,
        item.purpose,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [items, search])

  const handleApproveRequest = async (id, payload) => {
    setApprovalLoading(true)
    try {
      await approveVisitRequest(id, payload)
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'APPROVED' } : item,
        ),
      )
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Failed to approve request.',
      )
    } finally {
      setApprovalLoading(false)
    }
  }

  const handleQuickApprove = async (id) => {
    if (window.confirm('Are you sure you want to approve this request?')) {
      await handleApproveRequest(id, {})
    }
  }

  const rejectReasons = [
    'I am not available at this time',
    'I am out of office',
    'I have a scheduled meeting',
    'I am on leave',
    'I am busy with urgent work',
  ]

  const canEdit = hasPermission(PERMISSIONS.visitsEdit)
  const canApprove = hasPermission(PERMISSIONS.visitsApprove)
  const canReject = hasPermission(PERMISSIONS.visitsReject)
  const canDelete = hasPermission(PERMISSIONS.visitsDelete)
  const canCheckout = hasPermission(PERMISSIONS.visitsCheckout)

  const showActionColumn = !isSecurity() && !isReceptionist() && (
    isAdmin() ||
    canEdit ||
    canCheckout ||
    canDelete ||
    filteredItems.some((item) => session.username && item.hostEmail && session.username.toLowerCase() === item.hostEmail.toLowerCase() && item.status && item.status.toUpperCase() === 'PENDING')
  )

  const handleOpenReject = (item) => {
    setRejectingItem(item)
  }

  const handleSelectRejectReason = async (reason) => {
    if (!rejectingItem) return
    setApprovalLoading(true)
    try {
      const updated = await rejectVisitRequest(rejectingItem.id, { reason })
      setItems((prev) =>
        prev.map((item) =>
          item.id === rejectingItem.id
            ? { ...item, ...(updated && typeof updated === 'object' ? updated : {}), status: 'REJECTED', rejectionReason: reason }
            : item,
        ),
      )
      setRejectingItem(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject request.')
    } finally {
      setApprovalLoading(false)
    }
  }

  const handleEditSaved = (updated) => {
    if (!editingItem) return
    setItems((prev) => prev.map((row) => (row.id === editingItem.id ? { ...row, ...updated } : row)))
    setEditingItem(null)
  }

  const handleCheckOut = async (id) => {
    if (!window.confirm('Check out this visitor?')) return
    setApprovalLoading(true)
    try {
      const updated = await checkOutVisitor(id)
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...(updated && typeof updated === 'object' ? updated : {}), status: (updated && updated.status) || 'CHECKED_OUT' }
            : item,
        ),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to check out visitor.')
    } finally {
      setApprovalLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this visit request?')) return
    setApprovalLoading(true)
    try {
      await deleteVisitRequest(id)
      setItems((prev) => prev.filter((row) => row.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete request.')
    } finally {
      setApprovalLoading(false)
    }
  }

  return (
    <DashboardShell pageTitle="Host Approvals" breadcrumbItems={['Host Approvals']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Host Approvals</h2>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search host approvals"
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
                {visibleColumns.hostName ? <th>Host Name</th> : null}
                {visibleColumns.visitAt ? <th>Visit Date</th> : null}
                {visibleColumns.purpose ? <th>Purpose</th> : null}
                {visibleColumns.status ? <th>Status</th> : null}
                {showActionColumn ? <th className="vm-th-actions">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  {visibleColumns.id ? <td>{item.id}</td> : null}
                  {visibleColumns.visitorName ? <td>{item.visitorName}</td> : null}
                  {visibleColumns.email ? <td>{item.visitorEmail || '-'}</td> : null}
                  {visibleColumns.phone ? <td>{item.visitorPhone || '-'}</td> : null}
                  {visibleColumns.hostName ? <td>{item.hostName}</td> : null}
                  {visibleColumns.visitAt ? <td>{formatDate(item.visitAt)}</td> : null}
                  {visibleColumns.purpose ? <td>{item.purpose || '-'}</td> : null}
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
                            {canEdit ? (
                              <button type="button" className="vm-action-btn vm-action-edit" aria-label="Edit" onClick={() => setEditingItem(item)} title="Edit visit details" disabled={approvalLoading}>
                                <IconPencil />
                              </button>
                            ) : null}
                            {item.status && item.status.toUpperCase() === 'PENDING' && itemCanApprove ? (
                              <button
                                type="button"
                                className="vm-action-btn vm-action-approve"
                                aria-label="Accept"
                                onClick={() => handleQuickApprove(item.id)}
                                title="Accept and approve this request"
                                disabled={approvalLoading}
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
                                title="Reject this request"
                                disabled={approvalLoading}
                              >
                                <IconReject />
                              </button>
                            ) : null}
                          </>
                        )
                      })()}
                      {item.status && item.status.toUpperCase() === 'CHECKED_IN' && canCheckout ? (
                        <button
                          type="button"
                          className="vm-action-btn vm-action-reject vm-action-checkout"
                          aria-label="Check Out Visitor"
                          onClick={() => handleCheckOut(item.id)}
                          title="Check out this visitor"
                          disabled={approvalLoading}
                        >
                          <span className="vm-action-text">Check Out</span>
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className="vm-action-btn vm-action-del"
                          aria-label="Delete"
                          onClick={() => handleDelete(item.id)}
                          title="Delete this request"
                          disabled={approvalLoading}
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
        busy={approvalLoading}
        onClose={() => setRejectingItem(null)}
        onSelect={handleSelectRejectReason}
      />

      <EditVisitModal
        key={editingItem?.id ?? 'none'}
        open={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={handleEditSaved}
      />
    </DashboardShell>
  )
}

export default HostApprovalListPage
