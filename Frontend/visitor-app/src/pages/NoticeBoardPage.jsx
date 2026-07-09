import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil, IconTrash } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import { listNotices, createNotice, updateNotice, deleteNotice } from '../api/config.js'
import { hasPermission } from '../auth/authStorage.js'
import { PERMISSIONS } from '../rbac/access.js'
import './VisitorListPage.css'
import './NoticeBoardPage.css'

function NoticeBoardPage() {
  const navigate = useNavigate()
  const canManage = hasPermission(PERMISSIONS.noticeManage)
  const [notices, setNotices] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    title: true,
    category: true,
    postedBy: true,
    date: true,
    status: true,
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', attachment: null, description: '' })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'postedBy', label: 'Posted By' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
  ]

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  const loadData = async () => {
    try {
      const data = await listNotices()
      setNotices(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notices.')
    }
  }

  useEffect(() => {
    loadData()
     
  }, [])

  const filteredItems = useMemo(() => {
    if (!search.trim()) return notices

    const query = search.trim().toLowerCase()
    return notices.filter((item) =>
      [
        item.id.toString(),
        item.title,
        item.category,
        item.postedBy,
        item.date,
        item.status,
        item.description,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search, notices])

  const handleField = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleFile = (event) => {
    const file = event.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, attachment: file }))
  }

  const closeModal = () => {
    setCreateOpen(false)
    setEditingId(null)
    setForm({ title: '', attachment: null, description: '' })
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ title: '', attachment: null, description: '' })
    setCreateOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({ title: item.title, attachment: null, description: item.description || '' })
    setCreateOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const payload = {
      title: form.title,
      description: form.description,
      attachmentName: form.attachment?.name || '',
    }
    try {
      if (editingId != null) {
        await updateNotice(editingId, payload)
      } else {
        await createNotice(payload)
      }
      await loadData()
      closeModal()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save notice.')
    }
  }

  const handleDelete = async (id) => {
    setError('')
    try {
      await deleteNotice(id)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete notice.')
    }
  }

  const attachmentLabel = form.attachment?.name ?? 'No file chosen'

  return (
    <DashboardShell pageTitle="Notice Board" breadcrumbItems={['Notice Board']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Notice Board</h2>
          </div>
          {canManage ? (
            <div className="vm-visitor-head-actions">
              <button type="button" className="vm-btn vm-btn-orange" onClick={openCreate}>
                + Add Notice
              </button>
            </div>
          ) : null}
        </div>

        {createOpen ? createPortal(
          <div className="vm-modal-overlay" role="presentation" onClick={closeModal}>
            <div className="vm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="vm-modal-header">
                <h3>{editingId != null ? 'Edit Note' : 'Create Note'}</h3>
                <button type="button" className="vm-modal-close" onClick={closeModal} aria-label="Close">
                  {'\u2715'}
                </button>
              </div>

              <form className="vm-modal-body" onSubmit={handleSubmit}>
                <div className="vm-form-grid">
                  <div className="vm-field">
                    <label>Title</label>
                    <input
                      className="vm-input"
                      value={form.title}
                      onChange={handleField('title')}
                      placeholder="Enter note title"
                      required
                    />
                  </div>

                  <div className="vm-field">
                    <label>Attachment</label>
                    <input className="vm-input" type="file" onChange={handleFile} />
                    <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                      {attachmentLabel}
                    </div>
                  </div>

                  <div className="vm-field">
                    <label>Description</label>
                    <textarea
                      className="vm-input vm-textarea"
                      rows={5}
                      value={form.description}
                      onChange={handleField('description')}
                      placeholder="Enter description"
                    />
                  </div>
                </div>

                <div className="vm-modal-footer">
                  <button type="button" className="vm-btn vm-btn-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="vm-btn vm-btn-orange">
                    {editingId != null ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        ) : null}

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search notices"
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
                {visibleColumns.title ? <th>Title</th> : null}
                {visibleColumns.category ? <th>Category</th> : null}
                {visibleColumns.postedBy ? <th>Posted By</th> : null}
                {visibleColumns.date ? <th>Date</th> : null}
                {visibleColumns.status ? <th>Status</th> : null}
                {canManage ? <th className="vm-th-actions">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  {visibleColumns.id ? <td>{item.id}</td> : null}
                  {visibleColumns.title ? <td>{item.title}</td> : null}
                  {visibleColumns.category ? <td>{item.category}</td> : null}
                  {visibleColumns.postedBy ? <td>{item.postedBy}</td> : null}
                  {visibleColumns.date ? <td>{item.date}</td> : null}
                  {visibleColumns.status ? (
                    <td>
                    <span className={`vm-visitor-status vm-visitor-status-${item.status}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    </td>
                  ) : null}
                  {canManage ? (
                    <td className="vm-actions">
                      <button type="button" className="vm-action-btn vm-action-edit" aria-label="Edit" onClick={() => openEdit(item)}>
                        <IconPencil />
                      </button>
                      <button type="button" className="vm-action-btn vm-action-del" aria-label="Delete" onClick={() => handleDelete(item.id)}>
                        <IconTrash />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  )
}

export default NoticeBoardPage
