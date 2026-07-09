import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import { listPayments } from '../api/payment.js'
import './VisitorListPage.css'

function PaymentsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    visitorName: true,
    visitCategory: true,
    amount: true,
    paymentId: true,
    status: true,
    date: true,
  })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'visitorName', label: 'Visitor' },
    { key: 'visitCategory', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'paymentId', label: 'Payment ID' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date' },
  ]

  useEffect(() => {
    setLoading(true)
    listPayments()
      .then((data) => {
        setItems(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load payments.'))
      .finally(() => setLoading(false))
  }, [])

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter((p) =>
      [p.id, p.visitorName, p.visitCategory, p.amount, p.paymentId, p.status, p.date]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [search, items])

  const totalCollected = useMemo(
    () => filtered.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [filtered],
  )
  const currency = items[0]?.currency || 'INR'
  const colCount = Object.values(visibleColumns).filter(Boolean).length

  return (
    <DashboardShell pageTitle="Payments" breadcrumbItems={['System Settings', 'Payments']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Payments</h2>
          </div>
          <div className="vm-visitor-head-actions">
            <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 16 }}>
              Total collected: {currency} {totalCollected.toLocaleString()}
            </span>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search payments"
          columns={columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        {error ? <div style={{ padding: '8px 16px', color: '#dc2626' }}>{error}</div> : null}

        <div className="vm-table-wrap">
          <table className="vm-table vm-visitor-table">
            <thead>
              <tr>
                {visibleColumns.id ? <th>ID</th> : null}
                {visibleColumns.visitorName ? <th>Visitor</th> : null}
                {visibleColumns.visitCategory ? <th>Category</th> : null}
                {visibleColumns.amount ? <th>Amount</th> : null}
                {visibleColumns.paymentId ? <th>Payment ID</th> : null}
                {visibleColumns.status ? <th>Status</th> : null}
                {visibleColumns.date ? <th>Date</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} className="vm-empty">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={colCount} className="vm-empty">No payments collected yet</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    {visibleColumns.id ? <td>{p.id}</td> : null}
                    {visibleColumns.visitorName ? <td>{p.visitorName || '-'}</td> : null}
                    {visibleColumns.visitCategory ? <td>{p.visitCategory || '-'}</td> : null}
                    {visibleColumns.amount ? <td>{p.currency} {Number(p.amount).toLocaleString()}</td> : null}
                    {visibleColumns.paymentId ? <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.paymentId || '-'}</td> : null}
                    {visibleColumns.status ? (
                      <td>
                        <span className="vm-visitor-status vm-visitor-status-published">{p.status}</span>
                      </td>
                    ) : null}
                    {visibleColumns.date ? <td>{p.date}</td> : null}
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

export default PaymentsPage
