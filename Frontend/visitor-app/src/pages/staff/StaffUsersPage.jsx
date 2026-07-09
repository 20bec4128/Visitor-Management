import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import { createStaffUser, listRoles, listStaffUsers, updateStaffUser, deleteStaffUser } from '../../api/staff.js'
import DashboardShell from '../../components/dashboard/DashboardShell.jsx'
import ListPageToolbar from '../../components/dashboard/ListPageToolbar.jsx'
import './StaffUsersPage.css'

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function UserModal({ open, roles, editingUser, onClose, onSaved }) {
  const [form, setForm] = useState({
    roleId: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    profile: null,
  })
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    if (!open) return
    setErrorText('')
    setLoading(false)
    if (editingUser) {
      setForm({
        roleId: editingUser.roles?.[0]?.id ? String(editingUser.roles[0].id) : '',
        name: editingUser.name || '',
        email: editingUser.email || '',
        password: '',
        phone: editingUser.phone || '',
        profile: null,
      })
    } else {
      setForm({
        roleId: '',
        name: '',
        email: '',
        password: '',
        phone: '',
        profile: null,
      })
    }
  }, [open, editingUser])

  const handleChange = (key) => (e) => {
    const value = key === 'profile' ? e.target.files?.[0] ?? null : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorText('')

    const email = form.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorText('Please enter a valid email address (e.g. name@example.com).')
      return
    }

    setLoading(true)
    try {
      const roleIdNum = Number(form.roleId)
      const roleIds = Number.isFinite(roleIdNum) && roleIdNum > 0 ? [roleIdNum] : []

      if (editingUser) {
        await updateStaffUser(editingUser.id, {
          name: form.name,
          email,
          password: form.password,
          phone: form.phone,
          roleIds,
        })
      } else {
        await createStaffUser({
          name: form.name,
          email,
          password: form.password,
          phone: form.phone,
          roleIds,
        })
      }

      onSaved?.()
      onClose()
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Failed to save user.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="vm-modal-overlay" role="presentation" onClick={onClose}>
      <div className="vm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="vm-modal-header">
          <h3>{editingUser ? 'Update User' : 'Create User'}</h3>
          <button type="button" className="vm-modal-close" onClick={onClose} aria-label="Close">
            {'\u2715'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="vm-modal-body">
          <div className="vm-form-grid">
            <div className="vm-field">
              <label>Assign Role</label>
              <select value={form.roleId} onChange={handleChange('roleId')} className="vm-input">
                <option value="">Select role</option>
                {Array.isArray(roles)
                  ? roles.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.title}
                      </option>
                    ))
                  : null}
              </select>
            </div>

            <div className="vm-field">
              <label>Name</label>
              <input
                className="vm-input"
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Enter Name"
                required
              />
            </div>

            <div className="vm-field">
              <label>Email</label>
              <input
                className="vm-input"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="Enter email"
                required
              />
            </div>

            <div className="vm-field">
              <label>Password {editingUser ? '(leave blank to keep current)' : ''}</label>
              <input
                className="vm-input"
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder={editingUser ? 'Leave blank to keep' : '********'}
                required={!editingUser}
              />
            </div>

            <div className="vm-field">
              <label>Phone Number</label>
              <input
                className="vm-input"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="Enter phone number"
              />
            </div>

            <div className="vm-field">
              <label>Profile</label>
              <input className="vm-input vm-file" type="file" onChange={handleChange('profile')} />
            </div>
          </div>

          {errorText ? <div className="vm-form-error">{errorText}</div> : null}

          <div className="vm-modal-footer">
            <button type="button" className="vm-btn vm-btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="vm-btn vm-btn-orange" disabled={loading}>
              {loading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function StaffUsersPage() {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [query, setQuery] = useState('')
  const [visibleColumns, setVisibleColumns] = useState({
    userProfile: true,
    email: true,
    assignRole: true,
  })

  const columns = [
    { key: 'userProfile', label: 'User Profile' },
    { key: 'email', label: 'Email' },
    { key: 'assignRole', label: 'Assign Role' },
  ]

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [errorText, setErrorText] = useState('')

  const loadData = async () => {
    setErrorText('')
    try {
      const [rolesData, usersData] = await Promise.all([listRoles(), listStaffUsers()])
      setRoles(Array.isArray(rolesData) ? rolesData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Failed to load users.')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => String(u.name ?? '').toLowerCase().includes(q) || String(u.email ?? '').toLowerCase().includes(q),
    )
  }, [query, users])

  const handleCreate = () => {
    setEditingUser(null)
    setModalOpen(true)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.name}"?`)) return
    setErrorText('')
    try {
      await deleteStaffUser(user.id)
      await loadData()
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Failed to delete user.')
    }
  }

  return (
    <DashboardShell pageTitle="User" breadcrumbItems={['Staff Management', 'Users']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>User List</h2>
          </div>
          <button type="button" className="vm-btn vm-btn-orange" onClick={handleCreate}>
            + Create User
          </button>
        </div>

        <ListPageToolbar
          searchValue={query}
          onSearchChange={(e) => setQuery(e.target.value)}
          searchPlaceholder="Search"
          columns={columns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        {errorText ? <div className="vm-page-error">{errorText}</div> : null}

        <div className="vm-table-wrap">
          <table className="vm-table">
            <thead>
              <tr>
                {visibleColumns.userProfile ? <th>USER PROFILE</th> : null}
                {visibleColumns.email ? <th>EMAIL</th> : null}
                {visibleColumns.assignRole ? <th>ASSIGN ROLE</th> : null}
                <th className="vm-th-actions">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  {visibleColumns.userProfile ? <td>
                    <div className="vm-usercell">
                      <span className="vm-usericon" aria-hidden="true">
                        {'\u{1F464}'}
                      </span>
                      <span className="vm-username">{u.name}</span>
                    </div>
                  </td> : null}
                  {visibleColumns.email ? <td>{u.email}</td> : null}
                  {visibleColumns.assignRole ? <td>{Array.isArray(u.roles) && u.roles.length > 0 ? u.roles.map((r) => r.title).join(', ') : '-'}</td> : null}
                  <td className="vm-actions">
                    <button type="button" className="vm-action-btn vm-action-edit" aria-label="Edit" onClick={() => handleEdit(u)}>
                      <IconPencil />
                    </button>
                    <button type="button" className="vm-action-btn vm-action-del" aria-label="Delete" onClick={() => handleDelete(u)}>
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="vm-empty">
                    No users found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <UserModal
        open={modalOpen}
        roles={roles}
        editingUser={editingUser}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
      />
    </DashboardShell>
  )
}

export default StaffUsersPage
