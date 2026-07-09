import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil, IconTrash } from '../components/dashboard/ActionIcons.jsx'
import ListPageToolbar from '../components/dashboard/ListPageToolbar.jsx'
import {
  listContactDiary,
  createContactDiary,
  updateContactDiary,
  deleteContactDiary,
} from '../api/config.js'
import './VisitorListPage.css'

function ContactDiaryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [entries, setEntries] = useState([])
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    visitor: '',
    contactPerson: '',
    phone: '',
    purpose: '',
    status: 'active',
  })

  const loadEntries = async () => {
    try {
      const data = await listContactDiary()
      setEntries(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contact diary.')
    }
  }

  useEffect(() => {
    loadEntries()
     
  }, [])
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    visitor: true,
    contactPerson: true,
    phone: true,
    purpose: true,
    date: true,
    status: true,
  })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'visitor', label: 'Visitor' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'purpose', label: 'Purpose' },
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

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData({ visitor: '', contactPerson: '', phone: '', purpose: '', status: 'active' })
  }

  const openAdd = () => {
    setEditingId(null)
    setFormData({ visitor: '', contactPerson: '', phone: '', purpose: '', status: 'active' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormData({
      visitor: item.visitor,
      contactPerson: item.contactPerson,
      phone: item.phone,
      purpose: item.purpose,
      status: item.status || 'active',
    })
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete contact entry for "${item.visitor}"?`)) return
    setError('')
    try {
      await deleteContactDiary(item.id)
      await loadEntries()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete entry.')
    }
  }

  const handleSubmit = async () => {
    setError('')
    try {
      if (editingId != null) {
        await updateContactDiary(editingId, formData)
      } else {
        await createContactDiary(formData)
      }
      await loadEntries()
      closeModal()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save entry.')
    }
  }

  const filteredItems = useMemo(() => {
    if (!search.trim()) return entries

    const query = search.trim().toLowerCase()
    return entries.filter((item) =>
      [
        item.id.toString(),
        item.visitor,
        item.contactPerson,
        item.phone,
        item.purpose,
        item.date,
        item.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search, entries])

  return (
    <DashboardShell pageTitle="Contact Diary" breadcrumbItems={['Contact Diary']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Contact Diary</h2>
          </div>
          <div className="vm-visitor-head-actions">
            <button
              type="button"
              className="vm-btn vm-btn-orange"
              onClick={openAdd}
            >
              + Add Entry
            </button>
          </div>
        </div>

        <ListPageToolbar
          searchValue={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          searchPlaceholder="Search contact diary entries"
          columns={columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        {error ? <div className="vm-page-error" style={{ padding: '8px 16px', color: '#dc2626' }}>{error}</div> : null}

        <div className="vm-table-wrap">
          <table className="vm-table vm-visitor-table">
            <thead>
              <tr>
                {visibleColumns.id ? <th>ID</th> : null}
                {visibleColumns.visitor ? <th>Visitor</th> : null}
                {visibleColumns.contactPerson ? <th>Contact Person</th> : null}
                {visibleColumns.phone ? <th>Phone Number</th> : null}
                {visibleColumns.purpose ? <th>Purpose</th> : null}
                {visibleColumns.date ? <th>Date</th> : null}
                {visibleColumns.status ? <th>Status</th> : null}
                <th className="vm-th-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  {visibleColumns.id ? <td>{item.id}</td> : null}
                  {visibleColumns.visitor ? <td>{item.visitor}</td> : null}
                  {visibleColumns.contactPerson ? <td>{item.contactPerson}</td> : null}
                  {visibleColumns.phone ? <td>{item.phone}</td> : null}
                  {visibleColumns.purpose ? <td>{item.purpose}</td> : null}
                  {visibleColumns.date ? <td>{item.date}</td> : null}
                  {visibleColumns.status ? (
                    <td>
                    <span className={`vm-visitor-status vm-visitor-status-${item.status}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    </td>
                  ) : null}
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
              <h3>{editingId != null ? 'Edit Contact Entry' : 'Add Contact Entry'}</h3>
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
                <div className="vm-form-group">
                  <label htmlFor="visitor">Visitor Name</label>
                  <input
                    type="text"
                    id="visitor"
                    name="visitor"
                    value={formData.visitor}
                    onChange={handleFormChange}
                    placeholder="Enter visitor name"
                    required
                  />
                </div>
                <div className="vm-form-group">
                  <label htmlFor="contactPerson">Contact Person</label>
                  <input
                    type="text"
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleFormChange}
                    placeholder="Enter contact person"
                    required
                  />
                </div>
              </div>
              <div className="vm-form-row">
                <div className="vm-form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="vm-form-group">
                  <label htmlFor="purpose">Purpose</label>
                  <input
                    type="text"
                    id="purpose"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleFormChange}
                    placeholder="Enter purpose"
                    required
                  />
                </div>
              </div>
              <div className="vm-form-row">
                <div className="vm-form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div className="vm-form-group">
                  {/* Spacer column */}
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
                  {editingId != null ? 'Update Entry' : 'Add Entry'}
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

export default ContactDiaryPage
