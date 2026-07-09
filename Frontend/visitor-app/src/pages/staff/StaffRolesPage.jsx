import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../../components/dashboard/DashboardShell.jsx'
import ListPageToolbar from '../../components/dashboard/ListPageToolbar.jsx'
import { createRole, deleteRole, getRole, listRoles, updateRole } from '../../api/staff.js'
import { PERMISSIONS } from '../../rbac/access.js'
import './StaffRolesPage.css'

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

const PERMISSION_SECTIONS = [
  {
    title: 'Staff Management',
    items: [
      { key: PERMISSIONS.staffUsersView, label: 'View Users' },
      { key: PERMISSIONS.staffUsersCreate, label: 'Create Users' },
      { key: PERMISSIONS.staffUsersEdit, label: 'Edit Users' },
      { key: PERMISSIONS.staffUsersDelete, label: 'Delete Users' },
      { key: PERMISSIONS.staffRolesView, label: 'View Roles' },
      { key: PERMISSIONS.staffRolesManage, label: 'Manage Roles' },
      { key: PERMISSIONS.staffLoggedHistoryView, label: 'View Logged History' },
      { key: PERMISSIONS.staffLoggedHistoryDelete, label: 'Delete Logged History' },
    ],
  },
  {
    title: 'Visitor Management',
    items: [
      { key: PERMISSIONS.visitorsView, label: 'View Visitors' },
      { key: PERMISSIONS.visitorsCreate, label: 'Create Visitors' },
      { key: PERMISSIONS.visitorsEdit, label: 'Edit Visitors' },
      { key: PERMISSIONS.visitorsDelete, label: 'Delete Visitors' },
      { key: PERMISSIONS.visitsView, label: 'View Visits' },
      { key: PERMISSIONS.visitsCreate, label: 'Create Visits' },
      { key: PERMISSIONS.visitsEdit, label: 'Edit Visits' },
      { key: PERMISSIONS.visitsDelete, label: 'Delete Visits' },
      { key: PERMISSIONS.visitsCheckin, label: 'Check In Visitors' },
      { key: PERMISSIONS.visitsCheckout, label: 'Check Out Visitors' },
      { key: PERMISSIONS.visitorsFaceMatch, label: 'Face Match' },
    ],
  },
  {
    title: 'Pre-Registration',
    items: [
      { key: PERMISSIONS.preregisterView, label: 'View Pre-Register' },
      { key: PERMISSIONS.preregisterManage, label: 'Manage Pre-Register' },
      { key: PERMISSIONS.preregisterApprove, label: 'Approve Pre-Register' },
      { key: PERMISSIONS.preregisterReject, label: 'Reject Pre-Register' },
      { key: PERMISSIONS.preregisterEntry, label: 'Token Entry' },
    ],
  },
  {
    title: 'Approval Management',
    items: [
      { key: PERMISSIONS.visitsApprove, label: 'Approve Walk-in Requests' },
      { key: PERMISSIONS.visitsReject, label: 'Reject Walk-in Requests' },
    ],
  },
  {
    title: 'System Configuration',
    items: [
      { key: PERMISSIONS.contactView, label: 'View Contact Diary' },
      { key: PERMISSIONS.noticeView, label: 'View Notice Board' },
      { key: PERMISSIONS.visitCategoryManage, label: 'Manage Visit Category' },
      { key: PERMISSIONS.emailNotificationManage, label: 'Manage Email Notification' },
    ],
  },
  {
    title: 'System Settings',
    items: [
      { key: PERMISSIONS.pricingManage, label: 'Manage Pricing' },
      { key: PERMISSIONS.settingsManage, label: 'Manage Settings' },
    ],
  },
]

function RoleModal({ open, roleId, onClose, onSaved }) {
  const [title, setTitle] = useState('')
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    if (!open) return

    setErrorText('')
    if (!roleId) {
      setTitle('')
      setPermissions({})
      return
    }

    let cancelled = false
    setLoading(true)
    getRole(roleId)
      .then((data) => {
        if (cancelled) return
        setTitle(data.title ?? '')
        setPermissions(data.permissions ?? {})
      })
      .catch((e) => {
        if (cancelled) return
        setErrorText(e instanceof Error ? e.message : 'Failed to load role.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, roleId])

  const togglePermission = (key) => (e) => {
    const checked = e.target.checked
    setPermissions((prev) => ({ ...prev, [key]: checked }))
  }

  const setAllPermissions = (keys, checked = true) => {
    setPermissions((prev) => {
      const next = { ...prev }
      keys.forEach((key) => {
        next[key] = checked
      })
      return next
    })
  }

  const allPermissionKeys = useMemo(
    () => PERMISSION_SECTIONS.flatMap((section) => section.items.map((item) => item.key)),
    [],
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorText('')
    setLoading(true)
    try {
      const payload = { title, permissions }
      if (roleId) {
        await updateRole(roleId, payload)
      } else {
        await createRole(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Failed to save role.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="vm-modal-overlay" role="presentation" onClick={onClose}>
      <div className="vm-modal vm-role-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="vm-modal-header">
          <h3>{roleId ? 'Update Role' : 'Create Role'}</h3>
          <button type="button" className="vm-modal-close" onClick={onClose} aria-label="Close">
            {'\u2715'}
          </button>
        </div>

        <form className="vm-modal-body" onSubmit={handleSubmit}>
          <div className="vm-field">
            <label>Role Title</label>
            <input className="vm-input" placeholder="Enter role title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="vm-permissions">
            {PERMISSION_SECTIONS.map((section) => (
              <div className="vm-perm-section" key={section.title}>
                <div className="vm-perm-head">
                  <div className="vm-perm-title">{section.title}</div>
                  <button
                    type="button"
                    className="vm-perm-checkall"
                    onClick={() => setAllPermissions(section.items.map((item) => item.key), true)}
                  >
                    Check All
                  </button>
                </div>
                <div className="vm-perm-grid">
                  {section.items.map((item) => (
                    <label className="vm-check" key={item.key}>
                      <input
                        type="checkbox"
                        checked={Boolean(permissions[item.key])}
                        onChange={togglePermission(item.key)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="vm-perm-footer-actions">
              <button
                type="button"
                className="vm-perm-checkall vm-perm-checkall-wide"
                onClick={() => setAllPermissions(allPermissionKeys, true)}
              >
                Check All Permissions
              </button>
            </div>
          </div>

          {errorText ? <div className="vm-form-error">{errorText}</div> : null}

          <div className="vm-modal-footer">
            <button type="button" className="vm-btn vm-btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="vm-btn vm-btn-orange" disabled={loading}>
              {loading ? 'Saving...' : roleId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function StaffRolesPage() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [query, setQuery] = useState('')
  const [visibleColumns, setVisibleColumns] = useState({
    role: true,
    level: true,
    users: true,
  })

  const columns = [
    { key: 'role', label: 'Role' },
    { key: 'level', label: 'Level' },
    { key: 'users', label: 'Users' },
  ]

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length
      if (prev[key] && activeCount === 1) return prev
      return { ...prev, [key]: !prev[key] }
    })
  }
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState(null)
  const [errorText, setErrorText] = useState('')

  const loadRoles = async () => {
    setErrorText('')
    try {
      const data = await listRoles()
      setRoles(Array.isArray(data) ? data : [])
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : 'Failed to load roles.')
    }
  }

  useEffect(() => {
    loadRoles()
     
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return roles
    return roles.filter((r) => String(r.title ?? '').toLowerCase().includes(q))
  }, [query, roles])

  const handleCreate = () => {
    setEditingRoleId(null)
    setModalOpen(true)
  }

  const handleEdit = (id) => {
    setEditingRoleId(id)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    setErrorText('')
    try {
      await deleteRole(id)
      await loadRoles()
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : 'Failed to delete role.')
    }
  }

  return (
    <DashboardShell pageTitle="Roles" breadcrumbItems={['Staff Management', 'Roles']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Role List</h2>
          </div>
          <button type="button" className="vm-btn vm-btn-orange" onClick={handleCreate}>
            + Create Role
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
                {visibleColumns.role ? <th>ROLE</th> : null}
                {visibleColumns.level ? <th>LEVEL</th> : null}
                {visibleColumns.users ? <th>USERS</th> : null}
                <th className="vm-th-actions">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  {visibleColumns.role ? <td>{r.title}</td> : null}
                  {visibleColumns.level ? <td>{r.level}</td> : null}
                  {visibleColumns.users ? <td>{r.usersCount}</td> : null}
                  <td className="vm-actions">
                    <button type="button" className="vm-action-btn vm-action-edit" aria-label="Edit" onClick={() => handleEdit(r.id)}>
                      <IconPencil />
                    </button>
                    <button type="button" className="vm-action-btn vm-action-del" aria-label="Delete" onClick={() => handleDelete(r.id)}>
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="vm-empty">
                    No roles found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <RoleModal
        open={modalOpen}
        roleId={editingRoleId}
        onClose={() => setModalOpen(false)}
        onSaved={loadRoles}
      />
    </DashboardShell>
  )
}

export default StaffRolesPage
