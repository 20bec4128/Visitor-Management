import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil, IconTrash } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import {
  listVisitCategories,
  createVisitCategory,
  updateVisitCategory,
  deleteVisitCategory,
} from '../api/config.js'
import './VisitorListPage.css'

function VisitCategoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    visitType: '',
    fees: '',
  })

  const loadData = async () => {
    try {
      const data = await listVisitCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories.')
    }
  }

  useEffect(() => {
    loadData()
     
  }, [])
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    title: true,
    visitType: true,
    fees: true,
    date: true,
  })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Category' },
    { key: 'visitType', label: 'Visit Type' },
    { key: 'fees', label: 'Fees' },
    { key: 'date', label: 'Date' },
  ]

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData({ title: '', visitType: '', fees: '' })
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData({ title: '', visitType: '', fees: '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormData({ title: item.title, visitType: item.visitType, fees: String(item.fees ?? '') })
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete category "${item.title}"?`)) return
    setError('')
    try {
      await deleteVisitCategory(item.id)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete category.')
    }
  }

  const handleSubmit = async () => {
    setError('')
    const payload = {
      title: formData.title,
      visitType: formData.visitType,
      fees: Number(formData.fees) || 0,
    }
    try {
      if (editingId != null) {
        await updateVisitCategory(editingId, payload)
      } else {
        await createVisitCategory(payload)
      }
      await loadData()
      closeModal()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save category.')
    }
  }

  const filteredItems = useMemo(() => {
    if (!search.trim()) return categories

    const query = search.trim().toLowerCase()
    return categories.filter((item) =>
      [
        item.id.toString(),
        item.title,
        item.visitType,
        item.fees.toString(),
        item.date,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search, categories])

  return (
    <DashboardShell pageTitle="Visit Category" breadcrumbItems={['System Configuration', 'Visit Category']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Visit Category</h2>
          </div>
          <div className="vm-visitor-head-actions">
            <button
              type="button"
              className="vm-btn vm-btn-orange"
              onClick={openCreate}
            >
              + Create Category
            </button>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search visit categories"
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
                {visibleColumns.title ? <th>Category</th> : null}
                {visibleColumns.visitType ? <th>Visit Type</th> : null}
                {visibleColumns.fees ? <th>Fees</th> : null}
                {visibleColumns.date ? <th>Date</th> : null}
                <th className="vm-th-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  {visibleColumns.id ? <td>{item.id}</td> : null}
                  {visibleColumns.title ? <td>{item.title}</td> : null}
                  {visibleColumns.visitType ? <td>{item.visitType}</td> : null}
                  {visibleColumns.fees ? <td>₹{item.fees}</td> : null}
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && createPortal(
        <div className="vm-modal-overlay" onClick={closeModal}>
          <div className="vm-modal-content vm-contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vm-modal-header">
              <h3>{editingId != null ? 'Edit Category' : 'Create Category'}</h3>
              <button
                type="button"
                className="vm-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form className="vm-contact-form" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
              <div className="vm-form-row">
                <div className="vm-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="title">Category Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="Enter category title"
                    required
                  />
                </div>
              </div>
              <div className="vm-form-row">
                <div className="vm-form-group">
                  <label htmlFor="visitType">Visit Type</label>
                  <input
                    type="text"
                    id="visitType"
                    name="visitType"
                    value={formData.visitType}
                    onChange={handleFormChange}
                    placeholder="e.g. Guest, Client, Contractor"
                  />
                </div>
                <div className="vm-form-group">
                  <label htmlFor="fees">Fees (₹)</label>
                  <input
                    type="number"
                    id="fees"
                    name="fees"
                    value={formData.fees}
                    onChange={handleFormChange}
                    placeholder="0 for free, or enter an amount"
                    min="0"
                  />
                </div>
              </div>
              <div className="vm-modal-actions">
                <button
                  type="button"
                  className="vm-btn vm-btn-ghost"
                  onClick={closeModal}
                >
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
      )}
    </DashboardShell>
  )
}

export default VisitCategoryPage
