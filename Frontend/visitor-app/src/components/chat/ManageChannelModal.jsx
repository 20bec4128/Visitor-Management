import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { getChatChannelMembers, setChatChannelMembers } from '../../api/chat.js'
import './chat.css'

/**
 * Admin panel to manage a custom channel: add/remove members (checklist of staff) and delete the
 * channel. Opened from ChatView (also right after creating a channel).
 */
export default function ManageChannelModal({ channel, contacts, onClose, onDelete, readOnly = false }) {
  const channelId = (channel?.key || '').startsWith('custom:') ? channel.key.slice('custom:'.length) : null
  const [selected, setSelected] = useState(() => new Set()) // lower-cased usernames
  const [memberList, setMemberList] = useState([]) // resolved {username,name,role}
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!channelId) return
    setLoading(true)
    getChatChannelMembers(channelId)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setMemberList(list)
        setSelected(new Set(list.map((m) => (m.username || '').toLowerCase())))
      })
      .catch((e) => setError(e?.message || 'Could not load members'))
      .finally(() => setLoading(false))
  }, [channelId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => `${c.name} ${c.username} ${c.role}`.toLowerCase().includes(q))
  }, [contacts, query])

  const toggle = (username) => {
    const key = (username || '').toLowerCase()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const members = contacts.filter((c) => selected.has(c.username.toLowerCase())).map((c) => c.username)
      await setChatChannelMembers(channelId, members)
      onClose()
    } catch (e) {
      setError(e?.message || 'Could not save members')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete the channel "${channel?.label}"? This removes it for everyone.`)) return
    try {
      await onDelete(channel.key)
      onClose()
    } catch (e) {
      setError(e?.message || 'Could not delete channel')
    }
  }

  return createPortal(
    <div className="vm-mc-backdrop" onClick={onClose}>
      <div className="vm-mc" onClick={(e) => e.stopPropagation()}>
        <div className="vm-mc-head">
          <span>{readOnly ? `Members · ${channel?.label}` : `Manage: ${channel?.label}`}</span>
          <button type="button" className="vm-mc-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="vm-mc-sub">
          {readOnly
            ? `${memberList.length} member${memberList.length === 1 ? '' : 's'} in this channel.`
            : `Members (${selected.size}) — only selected staff can see and chat in this channel.`}
        </div>

        {!readOnly && (
          <input
            className="vm-mc-search"
            type="text"
            placeholder="Search staff…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        <div className="vm-mc-list">
          {loading ? (
            <div className="vm-chat-empty-hint">Loading…</div>
          ) : readOnly ? (
            memberList.length === 0 ? (
              <div className="vm-chat-empty-hint">No members yet.</div>
            ) : (
              memberList.map((m) => (
                <div key={m.username} className="vm-mc-row">
                  <span className="vm-mc-row-name">
                    {m.name}
                    <span className="vm-mc-row-role">{m.role}</span>
                  </span>
                </div>
              ))
            )
          ) : filtered.length === 0 ? (
            <div className="vm-chat-empty-hint">No staff found.</div>
          ) : (
            filtered.map((c) => {
              const checked = selected.has(c.username.toLowerCase())
              return (
                <label key={c.username} className={`vm-mc-row${checked ? ' checked' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(c.username)} />
                  <span className="vm-mc-row-name">
                    {c.name}
                    <span className="vm-mc-row-role">{c.role}</span>
                  </span>
                </label>
              )
            })
          )}
        </div>

        {error && <div className="vm-mc-error">{error}</div>}

        {readOnly ? (
          <div className="vm-mc-actions">
            <div />
            <button type="button" className="vm-mc-save" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <div className="vm-mc-actions">
            <button type="button" className="vm-mc-delete" onClick={remove}>
              Delete channel
            </button>
            <div className="vm-mc-actions-right">
              <button type="button" className="vm-mc-cancel" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="vm-mc-save" onClick={save} disabled={saving || loading}>
                {saving ? 'Saving…' : 'Save members'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
