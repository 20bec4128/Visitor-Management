import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil, IconTrash } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import {
  listEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from '../api/config.js'
import './VisitorListPage.css'

const EMPTY_FORM = { module: 'New User', subject: '', message: '', enabled: true }

function EmailNotificationPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    module: true,
    subject: true,
    status: true,
    date: true,
  })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'module', label: 'Module' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date' },
  ]

  const loadData = () => {
    setLoading(true)
    listEmailTemplates()
      .then((data) => {
        setItems(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load templates.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setFormError('')
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormData({
      module: item.module || 'New User',
      subject: item.subject || '',
      message: item.message || '',
      enabled: item.enabled !== false,
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.subject.trim()) {
      setFormError('Subject is required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        module: formData.module,
        subject: formData.subject,
        message: formData.message,
        enabled: formData.enabled,
      }
      if (editingId == null) {
        await createEmailTemplate(payload)
      } else {
        await updateEmailTemplate(editingId, payload)
      }
      setShowModal(false)
      setFormData(EMPTY_FORM)
      setEditingId(null)
      loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save template.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete the "${item.subject}" template?`)) return
    try {
      await deleteEmailTemplate(item.id)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template.')
    }
  }

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const query = search.trim().toLowerCase()
    return items.filter((item) =>
      [item.id, item.module, item.subject, item.enabled ? 'enabled' : 'disabled', item.date]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search, items])

  const activeColCount = Object.values(visibleColumns).filter(Boolean).length + 1

  return (
    <DashboardShell pageTitle="Email Notification" breadcrumbItems={['System Configuration', 'Email Notification']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Email Notification Template list</h2>
          </div>
          <div className="vm-visitor-head-actions">
            <button type="button" className="vm-btn vm-btn-orange" onClick={openCreate}>
              Create Template +
            </button>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search email templates"
          columns={columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        {error ? <div className="vm-error-banner" style={{ margin: '0 0 12px', color: '#dc2626', fontWeight: 600 }}>{error}</div> : null}

        <div className="vm-table-wrap">
          <table className="vm-table vm-visitor-table">
            <thead>
              <tr>
                {visibleColumns.id ? <th>ID</th> : null}
                {visibleColumns.module ? <th>Module</th> : null}
                {visibleColumns.subject ? <th>Subject</th> : null}
                {visibleColumns.status ? <th>Status</th> : null}
                {visibleColumns.date ? <th>Date</th> : null}
                <th className="vm-th-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeColCount} className="vm-empty">Loading…</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={activeColCount} className="vm-empty">No email templates found</td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    {visibleColumns.id ? <td>{item.id}</td> : null}
                    {visibleColumns.module ? <td>{item.module}</td> : null}
                    {visibleColumns.subject ? <td>{item.subject}</td> : null}
                    {visibleColumns.status ? (
                      <td>
                        <span className={`vm-visitor-status ${item.enabled ? 'vm-visitor-status-published' : 'vm-visitor-status-draft'}`}>
                          {item.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                    ) : null}
                    {visibleColumns.date ? <td>{item.date}</td> : null}
                    <td className="vm-actions">
                      <button type="button" className="vm-action-btn vm-action-edit" aria-label="Edit" onClick={() => openEdit(item)}>
                        <IconPencil />
                      </button>
                      <button type="button" className="vm-action-btn vm-action-del" aria-label="Delete" onClick={() => handleDelete(item)}>
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

      {showModal && createPortal(
        <div className="vm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="vm-modal-content vm-email-template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vm-modal-header">
              <h3>{editingId == null ? 'Create Template' : 'Edit Template'}</h3>
              <button type="button" className="vm-modal-close" onClick={() => setShowModal(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <form className="vm-email-template-form" onSubmit={handleSubmit}>
              <div className="vm-form-row">
                <div className="vm-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="module">Module</label>
                  <select
                    id="module"
                    name="module"
                    value={formData.module}
                    onChange={handleFormChange}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="New User">New User</option>
                    <option value="Visitor Arrival">Visitor Arrival</option>
                    <option value="Host Approval">Host Approval</option>
                    <option value="Visitor Departure">Visitor Departure</option>
                  </select>
                </div>
              </div>

              <div className="vm-form-row">
                <div className="vm-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleFormChange}
                    placeholder="Welcome to {company_name}"
                    required
                  />
                </div>
              </div>

              <div className="vm-form-row">
                <div className="vm-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="message">User Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleFormChange}
                    placeholder="Enter your message here..."
                    rows="5"
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              <div className="vm-form-row">
                <div className="vm-form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="enabled"
                    name="enabled"
                    checked={formData.enabled}
                    onChange={handleFormChange}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label htmlFor="enabled" style={{ margin: 0, cursor: 'pointer', fontSize: '14px' }}>
                    Enabled Email Notification
                  </label>
                </div>
              </div>

              <div className="vm-form-row" style={{ gridColumn: '1 / -1', marginTop: '8px', marginBottom: '0' }}>
                <div style={{ width: '100%' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', marginTop: '0', color: '#64748b' }}>Shortcodes</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', marginTop: '0' }}>Click to add shortcodes:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {[
                      '(company_name)',
                      '(company_email)',
                      '(company_phone_number)',
                      '(company_address)',
                      '(company_currency)',
                      '(new_user_name)',
                      '(app_link)',
                      '(username)',
                      '(password)',
                    ].map((label) => (
                      <button
                        key={label}
                        type="button"
                        className="vm-shortcode-btn"
                        onClick={() => setFormData((prev) => ({ ...prev, message: prev.message + label }))}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: 'white',
                          cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {formError ? (
                <div className="vm-form-row" style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>⚠ {formError}</span>
                </div>
              ) : null}

              <div className="vm-modal-actions">
                <button type="button" className="vm-btn vm-btn-ghost" onClick={() => setShowModal(false)}>
                  Close
                </button>
                <button type="submit" className="vm-btn vm-btn-orange" disabled={saving}>
                  {saving ? 'Saving…' : editingId == null ? 'Create' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </DashboardShell>
  )
}

export default EmailNotificationPage
