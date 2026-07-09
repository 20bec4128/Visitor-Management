import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { hasPermission, isLoggedIn } from '../../auth/authStorage.js'
import { PERMISSIONS } from '../../rbac/access.js'
import useChat from '../../realtime/useChat.js'
import ChatView from './ChatView.jsx'
import './chat.css'

/**
 * Bottom-right chat launcher available on every logged-in page. Owns one {@link useChat} instance
 * so the unread badge stays live even while the panel is closed.
 */
export default function FloatingChat() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const chat = useChat()

  if (!isLoggedIn() || !hasPermission(PERMISSIONS.chatUse)) return null

  return (
    <>
      {open && (
        <div className="vm-chat-floating-panel">
          <div className="vm-chat-floating-head">
            <span>Team Chat</span>
            <div className="vm-chat-floating-head-actions">
              <button
                type="button"
                title="Open full page"
                onClick={() => {
                  setOpen(false)
                  navigate('/chat')
                }}
              >
                ⤢
              </button>
              <button type="button" title="Close" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
          </div>
          <ChatView chat={chat} compact />
        </div>
      )}

      <button
        type="button"
        className="vm-chat-fab"
        onClick={() => setOpen((v) => !v)}
        title="Team chat"
      >
        💬
        {chat.totalUnread > 0 && <span className="vm-chat-fab-badge">{chat.totalUnread}</span>}
      </button>
    </>
  )
}
