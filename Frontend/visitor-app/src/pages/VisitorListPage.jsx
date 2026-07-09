import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil, IconTrash } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import QRScanModal from '../components/QRScanModal.jsx'
import VisitorDetailsModal from '../components/VisitorDetailsModal.jsx'
import EditVisitModal from '../components/EditVisitModal.jsx'
import { deleteVisitRequest, listVisitRequests } from '../api/visitor.js'
import useIsMobile from '../hooks/useIsMobile.js'
import './VisitorListPage.css'
import '../components/QRScanModal.css'

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

function VisitorListPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile('(max-width: 576px)')
  const desktopColumnsRef = useRef(null)
  const [search, setSearch] = useState('')
  const [visitors, setVisitors] = useState([])
  const [loadError, setLoadError] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedVisitor, setSelectedVisitor] = useState(null)
  const [editingVisitor, setEditingVisitor] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    name: true,
    email: true,
    phone: true,
    hostName: true,
    date: true,
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
    { key: 'date', label: 'Visit Date' },
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

  // Fetch visit requests (all statuses)
  useEffect(() => {
    let cancelled = false
    setLoadError('')
    listVisitRequests()
      .then((data) => {
        if (cancelled) return
        setVisitors(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load visitors.')
        setVisitors([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  const filteredVisitors = useMemo(() => {
    if (!search.trim()) return visitors
    const query = search.trim().toLowerCase()
    return visitors.filter((visitor) =>
      [
        visitor.id,
        visitor.visitorName,
        visitor.visitorEmail,
        visitor.visitorPhone,
        visitor.hostName,
        visitor.visitAt,
        visitor.entryTime,
        visitor.exitTime,
        visitor.status,
        visitor.purpose,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search, visitors])

  const handleEditSaved = (updated) => {
    if (!editingVisitor) return
    setVisitors((prev) =>
      prev.map((row) => (row.id === editingVisitor.id ? { ...row, ...updated } : row)),
    )
    setEditingVisitor(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this visit record?')) return
    setActionBusy(true)
    try {
      await deleteVisitRequest(id)
      setVisitors((prev) => prev.filter((row) => row.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete visit.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleQRScan = async (scannedCode) => {
    // For testing: directly navigate with the scanned code as dummy token
    // Skip actual validation
    navigate(`/pre-register-entry/${encodeURIComponent(scannedCode)}`)
  }

  return (
    <DashboardShell pageTitle="All Visitor" breadcrumbItems={['All Visitor']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>All Visitor</h2>
          </div>
          <div className="vm-visitor-head-actions">
            <button type="button" className="vm-btn vm-btn-light" onClick={() => setShowQRModal(true)}>
              QR Scan
            </button>
            <button type="button" className="vm-btn vm-btn-orange" onClick={() => navigate('/visitors/create')}>
              Add Visitor +
            </button>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search visitors"
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
                {visibleColumns.name ? <th>Visitor Name</th> : null}
                {visibleColumns.email ? <th>Email</th> : null}
                {visibleColumns.phone ? <th>Phone</th> : null}
                {visibleColumns.hostName ? <th>Host</th> : null}
                {visibleColumns.date ? <th>Date</th> : null}
                {visibleColumns.entryTime ? <th>Entry Time</th> : null}
                {visibleColumns.exitTime ? <th>Exit Time</th> : null}
                {visibleColumns.status ? <th className="vm-col-status">Status</th> : null}
                <th className="vm-th-actions vm-col-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.map((visitor) => (
                <tr
                  key={visitor.id}
                  className="vm-clickable-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedVisitor(visitor)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedVisitor(visitor)
                    }
                  }}
                >
                  {visibleColumns.id ? <td>{visitor.id}</td> : null}
                  {visibleColumns.name ? <td>{visitor.visitorName}</td> : null}
                  {visibleColumns.email ? <td>{visitor.visitorEmail || '-'}</td> : null}
                  {visibleColumns.phone ? <td>{visitor.visitorPhone || '-'}</td> : null}
                  {visibleColumns.hostName ? <td>{visitor.hostName || '-'}</td> : null}
                  {visibleColumns.date ? <td>{formatDateOnly(visitor.visitAt)}</td> : null}
                  {visibleColumns.entryTime ? <td>{visitor.entryTime ? formatTimeOnly(visitor.entryTime) : '-'}</td> : null}
                  {visibleColumns.exitTime ? <td>{visitor.exitTime ? formatTimeOnly(visitor.exitTime) : '-'}</td> : null}
                  {visibleColumns.status ? (
                    <td className="vm-col-status">
                    <span className={`vm-visitor-status vm-visitor-status-${String(visitor.status || '').toLowerCase()}`}>{String(visitor.status || '').toLowerCase().replace(/_/g, ' ')}</span>
                    </td>
                  ) : null}
                  <td className="vm-actions vm-col-actions">
                    <button
                      type="button"
                      className="vm-action-btn vm-action-edit"
                      aria-label="Edit"
                      onClick={(event) => {
                        event.stopPropagation()
                        setEditingVisitor(visitor)
                      }}
                      disabled={actionBusy}
                    >
                      <IconPencil />
                    </button>
                    <button
                      type="button"
                      className="vm-action-btn vm-action-del"
                      aria-label="Delete"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDelete(visitor.id)
                      }}
                      disabled={actionBusy}
                    >
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <QRScanModal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false)
        }}
        onScan={handleQRScan}
      />

      <VisitorDetailsModal
        open={Boolean(selectedVisitor)}
        item={selectedVisitor}
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

export default VisitorListPage
