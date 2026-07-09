import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil, IconTrash } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import {
  listOrganizationTypes,
  createOrganizationType,
  updateOrganizationType,
  deleteOrganizationType,
} from '../api/config.js'
import './VisitorListPage.css'

function OrganizationTypePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({ id: true, name: true, date: true })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Organization Type' },
    { key: 'date', label: 'Date' },
  ]

  const loadData = () => {
    setLoading(true)
    listOrganizationTypes()
      .then((data) => {
        setItems(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load organization types.'))
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

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setName('')
    setError('')
  }

  const openCreate = () => {
    setEditingId(null)
    setName('')
    setError('')
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setName(item.name || '')
    setError('')
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete organization type "${item.name}"?`)) return
    try {
      await deleteOrganizationType(item.id)
      loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    try {
      if (editingId != null) {
        await updateOrganizationType(editingId, { name: name.trim() })
      } else {
        await createOrganizationType({ name: name.trim() })
      }
      closeModal()
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter((item) => [item.id, item.name, item.date].join(' ').toLowerCase().includes(q))
  }, [search, items])

  const colCount = Object.values(visibleColumns).filter(Boolean).length + 1

  return (
    <DashboardShell pageTitle="Organization Types" breadcrumbItems={['System Configuration', 'Organization Types']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Organization Types</h2>
          </div>
          <div className="vm-visitor-head-actions">
            <button type="button" className="vm-btn vm-btn-orange" onClick={openCreate}>
              + Add Organization Type
            </button>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search organization types"
          columns={columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        {error && !showModal ? <div style={{ padding: '8px 16px', color: '#dc2626' }}>{error}</div> : null}

        <div className="vm-table-wrap">
          <table className="vm-table vm-visitor-table">
            <thead>
              <tr>
                {visibleColumns.id ? <th>ID</th> : null}
                {visibleColumns.name ? <th>Organization Type</th> : null}
                {visibleColumns.date ? <th>Date</th> : null}
                <th className="vm-th-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} className="vm-empty">Loading…</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={colCount} className="vm-empty">No organization types found</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    {visibleColumns.id ? <td>{item.id}</td> : null}
                    {visibleColumns.name ? <td>{item.name}</td> : null}
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
        <div className="vm-modal-overlay" onClick={closeModal}>
          <div className="vm-modal-content vm-contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vm-modal-header">
              <h3>{editingId != null ? 'Edit Organization Type' : 'Add Organization Type'}</h3>
              <button type="button" className="vm-modal-close" onClick={closeModal} aria-label="Close">✕</button>
            </div>
            <form className="vm-contact-form" onSubmit={handleSubmit}>
              <div className="vm-form-row">
                <div className="vm-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="org-name">Name</label>
                  <input
                    type="text"
                    id="org-name"
                    name="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError('') }}
                    placeholder="e.g. Factory, Hospital, IT Company"
                    required
                  />
                </div>
              </div>
              {error ? <div style={{ color: '#dc2626', fontWeight: 600, fontSize: 13, padding: '0 4px' }}>⚠ {error}</div> : null}
              <div className="vm-modal-actions">
                <button type="button" className="vm-btn vm-btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="vm-btn vm-btn-orange" disabled={saving}>
                  {saving ? 'Saving…' : editingId != null ? 'Update' : 'Create'}
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

export default OrganizationTypePage
