import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil, IconTrash } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import ApprovalTokenModal from '../components/ApprovalTokenModal.jsx'
import { deletePreRegisterRequest, listPreRegisterRequests } from '../api/visitor.js'
import { isAdmin } from '../auth/authStorage.js'
import useIsMobile from '../hooks/useIsMobile.js'
import './VisitorListPage.css'

function formatEnumLabel(value) {
  if (!value) return '-'
  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function PreRegisterPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile('(max-width: 576px)')
  const desktopColumnsRef = useRef(null)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loadError, setLoadError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [tokenModalItem, setTokenModalItem] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    visitor: true,
    email: true,
    phone: true,
    organization: true,
    host: true,
    created: true,
    status: true,
  })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'visitor', label: 'Visitor' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'organization', label: 'Organization' },
    { key: 'host', label: 'Host' },
    { key: 'created', label: 'Date' },
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
      next.visitor = true
      next.phone = true
      next.host = true
      next.created = true
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
    listPreRegisterRequests()
      .then((data) => {
        if (cancelledRef?.current) return
        setItems(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (cancelledRef?.current) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load pre-register list.')
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

  const handleEdit = (id) => {
    navigate(`/preregister/create/${id}`)
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this pre-register request?')
    if (!confirmed) return

    try {
      setDeletingId(id)
      setLoadError('')
      await deletePreRegisterRequest(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to delete pre-register request.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewToken = (item) => {
    setTokenModalItem(item)
  }

  const handleCloseTokenModal = () => {
    setTokenModalItem(null)
  }

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
        item.createdAt,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [items, search])

  return (
    <DashboardShell pageTitle="Pre Register" breadcrumbItems={['Pre Register']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Pre Register</h2>
          </div>
          <div className="vm-visitor-head-actions">
            <button type="button" className="vm-btn vm-btn-orange" onClick={() => navigate('/preregister/create')}>
              + Add Pre Register
            </button>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search preregistered visitors"
          columns={columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        {loadError ? <div className="vm-inline-error">{loadError}</div> : null}

        <div className="vm-table-wrap">
          <table className="vm-table vm-visitor-table">
            <thead>
              <tr>
                {visibleColumns.id ? <th>ID</th> : null}
                {visibleColumns.visitor ? <th>Visitor</th> : null}
                {visibleColumns.email ? <th>Email</th> : null}
                {visibleColumns.phone ? <th>Phone</th> : null}
                {visibleColumns.organization ? <th>Organization</th> : null}
                {visibleColumns.host ? <th>Host</th> : null}
                {visibleColumns.created ? <th>Date</th> : null}
                {visibleColumns.status ? <th className="vm-col-status">Status</th> : null}
                <th className="vm-th-actions vm-col-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const status = item.status ? item.status.toString().toLowerCase() : 'pending'
                return (
                  <tr key={item.id}>
                    {visibleColumns.id ? <td>{item.id}</td> : null}
                    {visibleColumns.visitor ? <td>{item.visitorName ?? '-'}</td> : null}
                    {visibleColumns.email ? <td>{item.email ?? '-'}</td> : null}
                    {visibleColumns.phone ? <td>{item.phone ?? '-'}</td> : null}
                    {visibleColumns.organization ? <td>{formatEnumLabel(item.organizationType)}</td> : null}
                    {visibleColumns.host ? <td>{item.hostName ?? '-'}</td> : null}
                    {visibleColumns.created ? <td>{formatDate(item.createdAt)}</td> : null}
                    {visibleColumns.status ? (
                      <td className="vm-col-status">
                        <span className={`vm-visitor-status vm-visitor-status-${status}`}>{status.replace(/_/g, ' ')}</span>
                      </td>
                    ) : null}
                    <td className="vm-actions vm-col-actions">
                      {isAdmin() && status === 'approved' && item.approvalToken ? (
                        <button
                          type="button"
                          className="vm-action-btn"
                          aria-label="View Token"
                          onClick={() => handleViewToken(item)}
                          title="View approval token"
                          style={{ color: '#3b82f6' }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="vm-action-btn vm-action-edit"
                        aria-label="Edit"
                        onClick={() => handleEdit(item.id)}
                        disabled={deletingId === item.id}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="vm-action-btn vm-action-del"
                        aria-label="Delete"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} style={{ padding: '14px 12px', color: '#64748b' }}>
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {tokenModalItem ? (
          <ApprovalTokenModal item={tokenModalItem} onClose={handleCloseTokenModal} />
        ) : null}
      </section>
    </DashboardShell>
  )
}

export default PreRegisterPage
