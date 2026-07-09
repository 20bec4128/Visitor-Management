import { useEffect, useMemo, useRef, useState } from 'react'

import { dmChannelKey } from '../../api/chat.js'
import { mediaUrl } from '../../api/config.js'
import { checkImageNsfw } from '../../moderation/nsfw.js'
import { hasPermission, isAdmin } from '../../auth/authStorage.js'
import { PERMISSIONS } from '../../rbac/access.js'
import { useCall } from '../call/CallProvider.jsx'
import ManageChannelModal from './ManageChannelModal.jsx'
import RoleMembersModal from './RoleMembersModal.jsx'
import './chat.css'

function Avatar({ name, online }) {
  return (
    <span className="vm-chat-avatar-wrap">
      <span className="vm-chat-avatar">{(name || '?').charAt(0).toUpperCase()}</span>
      {online ? <span className="vm-chat-online-dot" title="Online" /> : null}
    </span>
  )
}

const isImageAttachment = (type) => (type || '').startsWith('image/')

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Force a real download (works cross-origin) instead of opening the file in the browser.
async function downloadAttachment(rawPath, name) {
  const url = mediaUrl(rawPath)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const obj = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = obj
    a.download = name || 'file'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(obj), 1000)
  } catch {
    // Fallback (e.g. fetch blocked): still avoid inline-open by hinting download.
    const a = document.createElement('a')
    a.href = url
    a.download = name || 'file'
    a.target = '_blank'
    a.rel = 'noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
}

function MessageAttachment({ msg, mine }) {
  if (!msg.attachmentUrl) return null
  const url = mediaUrl(msg.attachmentUrl)
  const onDownload = () => downloadAttachment(msg.attachmentUrl, msg.attachmentName)
  const isImage = isImageAttachment(msg.attachmentType)

  if (isImage) {
    // Sender already has the file → just show the preview, no download control.
    if (mine) {
      return (
        <span className="vm-chat-msg-imglink no-dl">
          <img className="vm-chat-msg-img" src={url} alt={msg.attachmentName || 'image'} />
        </span>
      )
    }
    return (
      <button type="button" className="vm-chat-msg-imglink" title="Download image" onClick={onDownload}>
        <img className="vm-chat-msg-img" src={url} alt={msg.attachmentName || 'image'} />
        <span className="vm-chat-msg-dl-badge">⬇ Download</span>
      </button>
    )
  }

  const inner = (
    <>
      <span className="vm-chat-msg-file-ico">📄</span>
      <span className="vm-chat-msg-file-meta">
        <span className="vm-chat-msg-file-name">{msg.attachmentName || 'file'}</span>
        <span className="vm-chat-msg-file-size">
          {formatSize(msg.attachmentSize)}
          {mine ? '' : ' · ⬇ Download'}
        </span>
      </span>
    </>
  )

  if (mine) {
    return <span className="vm-chat-msg-file no-dl">{inner}</span>
  }
  return (
    <button type="button" className="vm-chat-msg-file" title="Download file" onClick={onDownload}>
      {inner}
    </button>
  )
}

/**
 * Two-pane chat surface (conversation list + thread). Presentational — the caller owns the
 * {@link useChat} instance and passes it in, so the page and the floating panel don't double-up
 * state. Used by ChatPage and FloatingChat.
 */
export default function ChatView({ chat, compact = false }) {
  const call = useCall()
  const [draft, setDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [channelError, setChannelError] = useState('')
  const [manageChannel, setManageChannel] = useState(null)
  const [manageReadOnly, setManageReadOnly] = useState(false)
  const [roleModal, setRoleModal] = useState(null)
  const [uploading, setUploading] = useState(false)
  const threadRef = useRef(null)
  const fileInputRef = useRef(null)
  const canManageChannels = hasPermission(PERMISSIONS.chatChannelsManage)

  const {
    me,
    channels,
    contacts,
    summaries,
    activeKey,
    messages,
    unread,
    online,
    loading,
    openChannel,
    openDirect,
    send,
    sendAttachment,
    deleteMessage,
    createChannel,
    removeChannel,
    setRoleMembers,
  } = chat

  const onPickFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setUploading(true)
    try {
      // Screen images for adult/NSFW content before uploading (best-effort, client-side).
      if (file.type.startsWith('image/')) {
        try {
          const { blocked } = await checkImageNsfw(file)
          if (blocked) {
            window.alert('This image looks like adult/explicit content and was blocked.')
            return
          }
        } catch (err) {
          // Model unavailable (e.g. offline) — fall through and allow the upload.
          console.warn('NSFW check skipped:', err?.message || err)
        }
      }
      await sendAttachment(file, draft)
      setDraft('')
    } catch (err) {
      window.alert(err?.message || 'Could not send file')
    } finally {
      setUploading(false)
    }
  }

  const admin = isAdmin()

  const onDeleteMessage = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this message for everyone?')) return
    try {
      await deleteMessage(id)
    } catch (err) {
      window.alert(err?.message || 'Could not delete message')
    }
  }

  const submitNewChannel = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setChannelError('')
    try {
      const created = await createChannel(name)
      setNewName('')
      setCreating(false)
      // Immediately open the manage panel so the admin can add members.
      if (created?.key) {
        setManageReadOnly(false)
        setManageChannel(created)
      }
    } catch (err) {
      setChannelError(err?.message || 'Could not create channel')
    }
  }

  const openManage = (e, channel) => {
    e.stopPropagation()
    setManageReadOnly(false)
    setManageChannel(channel)
  }

  const openMembers = () => {
    if (!activeChannelMeta) return
    setManageReadOnly(!admin) // admins manage; members get a read-only view
    if (activeKey.startsWith('role:')) setRoleModal(activeChannelMeta)
    else setManageChannel(activeChannelMeta)
  }

  // Most-recently-active conversations first (WhatsApp-style), then alphabetical.
  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const aw = summaries[dmChannelKey(me, a.username)]?.lastActivity || 0
      const bw = summaries[dmChannelKey(me, b.username)]?.lastActivity || 0
      if (aw !== bw) return bw - aw
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [contacts, summaries, me])

  const previewText = (key) => {
    const s = summaries[key]
    if (!s || !s.preview) return ''
    const mine = (s.lastSenderUsername || '').toLowerCase() === (me || '').toLowerCase()
    return `${mine ? 'You: ' : ''}${s.preview}`
  }

  const activeContact = useMemo(
    () => contacts.find((c) => dmChannelKey(me, c.username) === activeKey) || null,
    [contacts, me, activeKey],
  )
  const activeChannelMeta = useMemo(
    () => channels.find((c) => c.key === activeKey) || null,
    [channels, activeKey],
  )
  const activeTitle = activeContact?.name || activeChannelMeta?.label || 'Select a conversation'

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const submit = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    try {
      await send(text)
    } catch {
      setDraft(text)
    }
  }

  return (
    <div className={`vm-chat${compact ? ' vm-chat-compact' : ''}`}>
      <aside className="vm-chat-list">
        <div className="vm-chat-list-section vm-chat-list-section-row">
          <span>Channels</span>
          {canManageChannels && (
            <button
              type="button"
              className="vm-chat-add-channel"
              title="Create channel"
              onClick={() => {
                setCreating((v) => !v)
                setChannelError('')
              }}
            >
              +
            </button>
          )}
        </div>

        {creating && canManageChannels && (
          <form className="vm-chat-new-channel" onSubmit={submitNewChannel}>
            <input
              type="text"
              autoFocus
              placeholder="Channel name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" disabled={!newName.trim()}>
              Create
            </button>
            {channelError && <span className="vm-chat-new-channel-error">{channelError}</span>}
          </form>
        )}

        {channels.map((c) => {
          const deletable = canManageChannels && c.key.startsWith('custom:')
          return (
            <button
              key={c.key}
              type="button"
              className={`vm-chat-list-item${activeKey === c.key ? ' active' : ''}${unread[c.key] ? ' unread' : ''}${deletable ? ' has-delete' : ''}`}
              onClick={() => openChannel(c.key)}
            >
              <Avatar name={c.label} />
              <span className="vm-chat-list-label">
                <span className="vm-chat-list-name">{c.label}</span>
                <span className="vm-chat-list-preview">{previewText(c.key) || 'No messages yet'}</span>
              </span>
              {unread[c.key] ? <span className="vm-chat-unread">{unread[c.key]}</span> : null}
              {deletable && (
                <span
                  className="vm-chat-manage-channel"
                  title="Manage members / delete"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => openManage(e, c)}
                >
                  ⚙
                </span>
              )}
            </button>
          )
        })}

        <div className="vm-chat-list-section">Direct Messages</div>
        {sortedContacts.map((p) => {
          const key = dmChannelKey(me, p.username)
          const preview = previewText(key)
          return (
            <button
              key={p.username}
              type="button"
              className={`vm-chat-list-item${activeKey === key ? ' active' : ''}${unread[key] ? ' unread' : ''}`}
              onClick={() => openDirect(p.username)}
            >
              <Avatar name={p.name} online={online.has((p.username || '').toLowerCase())} />
              <span className="vm-chat-list-label">
                <span className="vm-chat-list-name">{p.name}</span>
                <span className="vm-chat-list-preview">{preview || p.role}</span>
              </span>
              {unread[key] ? <span className="vm-chat-unread">{unread[key]}</span> : null}
            </button>
          )
        })}
        {contacts.length === 0 && <div className="vm-chat-empty-hint">No other users yet.</div>}
      </aside>

      <section className="vm-chat-thread-pane">
        <header className="vm-chat-thread-header">
          <span className="vm-chat-thread-titlebox">
            <span className="vm-chat-thread-title">{activeTitle}</span>
            {activeContact && (
              <span
                className={`vm-chat-thread-status${
                  online.has((activeContact.username || '').toLowerCase()) ? ' online' : ''
                }`}
              >
                {online.has((activeContact.username || '').toLowerCase()) ? 'online' : 'offline'}
              </span>
            )}
          </span>
          {(activeKey.startsWith('custom:') || activeKey.startsWith('role:')) && activeChannelMeta && (
            <span className="vm-chat-thread-actions">
              <button type="button" className="vm-chat-call-btn" title="Members" onClick={openMembers}>
                👥
              </button>
            </span>
          )}
          {activeContact && call && (
            <span className="vm-chat-thread-actions">
              <button
                type="button"
                className="vm-chat-call-btn"
                title="Voice call"
                onClick={() => call.startCall(activeContact.username, activeContact.name, 'audio')}
              >
                📞
              </button>
              <button
                type="button"
                className="vm-chat-call-btn"
                title="Video call"
                onClick={() => call.startCall(activeContact.username, activeContact.name, 'video')}
              >
                🎥
              </button>
            </span>
          )}
        </header>

        <div className="vm-chat-thread" ref={threadRef}>
          {loading ? (
            <div className="vm-chat-empty-hint">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="vm-chat-empty-hint">No messages yet. Say hello 👋</div>
          ) : (
            messages.map((m) => {
              const mine = (m.senderUsername || '').toLowerCase() === (me || '').toLowerCase()
              const canDelete = mine || admin
              if (m.messageType === 'CALL') {
                return (
                  <div key={m.id} className="vm-chat-callentry">
                    <span className="vm-chat-callentry-pill">
                      {m.body}
                      <span className="vm-chat-callentry-time">{m.createdAt}</span>
                    </span>
                  </div>
                )
              }
              return (
                <div key={m.id} className={`vm-chat-msg${mine ? ' mine' : ''}`}>
                  {!mine && <span className="vm-chat-msg-sender">{m.senderName}</span>}
                  <MessageAttachment msg={m} mine={mine} />
                  {m.body && <span className="vm-chat-msg-body">{m.body}</span>}
                  <span className="vm-chat-msg-time">{m.createdAt}</span>
                  {canDelete && (
                    <button
                      type="button"
                      className="vm-chat-msg-del"
                      title="Delete for everyone"
                      onClick={(e) => onDeleteMessage(e, m.id)}
                    >
                      🗑
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        <form className="vm-chat-composer" onSubmit={submit}>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            onChange={onPickFile}
          />
          <button
            type="button"
            className="vm-chat-attach-btn"
            title="Attach photo or document"
            disabled={uploading}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            {uploading ? '⏳' : '📎'}
          </button>
          <input
            type="text"
            placeholder={uploading ? 'Sending file…' : 'Type a message…'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      </section>

      {manageChannel && (
        <ManageChannelModal
          channel={manageChannel}
          contacts={contacts}
          readOnly={manageReadOnly}
          onClose={() => setManageChannel(null)}
          onDelete={removeChannel}
        />
      )}

      {roleModal && (
        <RoleMembersModal
          channel={roleModal}
          contacts={contacts}
          me={me}
          readOnly={manageReadOnly}
          onClose={() => setRoleModal(null)}
          onSave={(members) => setRoleMembers(roleModal.key, members)}
        />
      )}
    </div>
  )
}
