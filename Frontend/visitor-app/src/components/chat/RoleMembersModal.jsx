import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import './chat.css'

/**
 * Members of a role channel (e.g. "Manager Team"). Read-only for members; for admins it's an
 * editable checklist where ticking PROMOTES a user to the role and unticking DEMOTES them to
 * EMPLOYEE — i.e. it changes their app-wide role.
 */
export default function RoleMembersModal({ channel, contacts, me, readOnly, onClose, onSave }) {
  const roleTitle = (channel?.key || '').startsWith('role:') ? channel.key.slice('role:'.length) : ''
  const isInRole = (c) => (c.role || '').toUpperCase() === roleTitle.toUpperCase()

  const [selected, setSelected] = useState(() => new Set(contacts.filter(isInRole).map((c) => c.username.toLowerCase())))
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const currentMembers = useMemo(() => contacts.filter(isInRole), [contacts, roleTitle])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => `${c.name} ${c.username} ${c.role}`.toLowerCase().includes(q))
  }, [contacts, query])

  const toggle = (username) => {
    const k = username.toLowerCase()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const members = contacts.filter((c) => selected.has(c.username.toLowerCase())).map((c) => c.username)
      await onSave(members)
      onClose()
    } catch (e) {
      setError(e?.message || 'Could not update members')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="vm-mc-backdrop" onClick={onClose}>
      <div className="vm-mc" onClick={(e) => e.stopPropagation()}>
        <div className="vm-mc-head">
          <span>{readOnly ? `Members · ${channel?.label}` : `Manage ${channel?.label}`}</span>
          <button type="button" className="vm-mc-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {readOnly ? (
          <>
            <div className="vm-mc-sub">
              {currentMembers.length} member{currentMembers.length === 1 ? '' : 's'} with the {roleTitle} role.
            </div>
            <div className="vm-mc-list">
              {currentMembers.length === 0 ? (
                <div className="vm-chat-empty-hint">No members.</div>
              ) : (
                currentMembers.map((m) => (
                  <div key={m.username} className="vm-mc-row">
                    <span className="vm-mc-row-name">
                      {m.name}
                      <span className="vm-mc-row-role">{m.role}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="vm-mc-actions">
              <div />
              <button type="button" className="vm-mc-save" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="vm-mc-warn">
              ⚠ Ticking a person makes them a <strong>{roleTitle}</strong>; unticking demotes them to{' '}
              <strong>EMPLOYEE</strong>. This changes their access across the whole app.
            </div>
            <input
              className="vm-mc-search"
              type="text"
              placeholder="Search staff…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="vm-mc-list">
              {filtered.map((c) => {
                const checked = selected.has(c.username.toLowerCase())
                const self = (c.username || '').toLowerCase() === (me || '').toLowerCase()
                return (
                  <label key={c.username} className={`vm-mc-row${checked ? ' checked' : ''}`}>
                    <input type="checkbox" checked={checked} disabled={self} onChange={() => toggle(c.username)} />
                    <span className="vm-mc-row-name">
                      {c.name}
                      {self ? ' (you)' : ''}
                      <span className="vm-mc-row-role">{c.role}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            {error && <div className="vm-mc-error">{error}</div>}
            <div className="vm-mc-actions">
              <div />
              <div className="vm-mc-actions-right">
                <button type="button" className="vm-mc-cancel" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="vm-mc-save" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
