import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createChatChannel,
  deleteChatChannel,
  deleteChatMessage,
  dmChannelKey,
  getChatMessages,
  getPresence,
  listChatChannels,
  listChatContacts,
  listChatConversations,
  sendChatAttachment,
  sendChatMessage,
  setRoleChannelMembers,
} from '../api/chat.js'
import { getAuthSession } from '../auth/authStorage.js'
import { useRealtime } from './RealtimeProvider.jsx'

// Shared, lazily-created beep for incoming messages (best-effort; needs a prior user gesture).
let audioCtx = null
function playPop() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!audioCtx) audioCtx = new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.frequency.value = 600
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.26)
  } catch {
    // no audio
  }
}

/**
 * Encapsulates chat state: contacts, channels, conversation summaries (last-message preview +
 * recency for WhatsApp-style ordering), the active conversation, its messages, unread counts and
 * sending. Live messages arrive over STOMP; sends go through REST and reflect back via the same
 * subscription (no optimistic dupes).
 */
export default function useChat() {
  const rt = useRealtime()
  const me = getAuthSession().username || ''

  const [channels, setChannels] = useState([])
  const [contacts, setContacts] = useState([])
  const [summaries, setSummaries] = useState({}) // key -> { preview, lastSenderName, lastSenderUsername, lastAt, lastActivity }
  const [activeKey, setActiveKey] = useState('all')
  const [messages, setMessages] = useState([])
  const [unread, setUnread] = useState({})
  const [online, setOnline] = useState(() => new Set()) // lower-cased usernames currently connected
  const [loading, setLoading] = useState(false)

  const activeKeyRef = useRef(activeKey)
  useEffect(() => {
    activeKeyRef.current = activeKey
  }, [activeKey])

  // Load channels + conversation summaries (merging previews into any existing live state).
  const reloadChannels = useCallback(() => {
    listChatChannels().then((c) => setChannels(Array.isArray(c) ? c : [])).catch(() => {})
    listChatConversations()
      .then((rows) => {
        setSummaries((prev) => {
          const map = { ...prev }
          ;(Array.isArray(rows) ? rows : []).forEach((s) => {
            const existing = map[s.key]
            // Keep the livelier of server/live timestamps so ordering doesn't jump backwards.
            if (!existing || (s.lastActivity || 0) >= (existing.lastActivity || 0)) {
              map[s.key] = {
                preview: s.lastBody || '',
                lastSenderName: s.lastSenderName || '',
                lastSenderUsername: s.lastSenderUsername || '',
                lastAt: s.lastAt || '',
                lastActivity: s.lastActivity || 0,
              }
            }
          })
          return map
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    listChatContacts().then((c) => setContacts(Array.isArray(c) ? c : [])).catch(() => {})
    reloadChannels()
  }, [reloadChannels])

  // Refresh the channel list when an admin creates/deletes a channel anywhere.
  useEffect(() => {
    if (!rt) return undefined
    const unsub = rt.subscribe('/topic/chat/system', () => reloadChannels())
    return () => unsub && unsub()
  }, [rt, reloadChannels])

  // Online presence: initial snapshot + live updates.
  useEffect(() => {
    getPresence()
      .then((list) => setOnline(new Set((Array.isArray(list) ? list : []).map((u) => (u || '').toLowerCase()))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!rt) return undefined
    const unsub = rt.subscribe('/topic/presence', (list) => {
      setOnline(new Set((Array.isArray(list) ? list : []).map((u) => (u || '').toLowerCase())))
    })
    return () => unsub && unsub()
  }, [rt])

  // Load history for the active conversation and clear its unread badge.
  useEffect(() => {
    if (!activeKey) return
    setLoading(true)
    getChatMessages(activeKey)
      .then((m) => setMessages(Array.isArray(m) ? m : []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
    setUnread((prev) => (prev[activeKey] ? { ...prev, [activeKey]: 0 } : prev))
  }, [activeKey])

  // Live subscriptions: every channel topic + the personal DM/queue.
  useEffect(() => {
    if (!rt) return undefined
    const onIncoming = (msg) => {
      if (!msg || !msg.channel) return

      // Deletion notice — remove the message everywhere it's shown.
      if (msg.deleted) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id))
        return
      }

      const mine = (msg.senderUsername || '').toLowerCase() === (me || '').toLowerCase()

      setSummaries((prev) => ({
        ...prev,
        [msg.channel]: {
          preview: msg.body || '',
          lastSenderName: msg.senderName || '',
          lastSenderUsername: msg.senderUsername || '',
          lastAt: msg.createdAt || '',
          lastActivity: Date.now(),
        },
      }))

      if (msg.channel === activeKeyRef.current) {
        setMessages((prev) => [...prev, msg])
      } else if (!mine) {
        setUnread((prev) => ({ ...prev, [msg.channel]: (prev[msg.channel] || 0) + 1 }))
        playPop()
      }
    }
    const unsubs = []
    channels.forEach((c) => unsubs.push(rt.subscribe(c.destination, onIncoming)))
    unsubs.push(rt.subscribe('/user/queue/chat', onIncoming))
    return () => unsubs.forEach((u) => u && u())
  }, [rt, channels, me])

  const openChannel = useCallback((key) => setActiveKey(key), [])

  const openDirect = useCallback((username) => setActiveKey(dmChannelKey(me, username)), [me])

  const send = useCallback(async (body) => {
    const text = (body || '').trim()
    if (!text || !activeKeyRef.current) return
    await sendChatMessage(activeKeyRef.current, text)
  }, [])

  const deleteMessage = useCallback(async (id) => {
    await deleteChatMessage(id)
    // Optimistic removal; the broadcast will also clear it for everyone.
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const sendAttachment = useCallback(async (file, caption) => {
    if (!file || !activeKeyRef.current) return
    await sendChatAttachment(activeKeyRef.current, file, (caption || '').trim())
  }, [])

  const createChannel = useCallback(async (name) => {
    const created = await createChatChannel((name || '').trim())
    reloadChannels()
    if (created?.key) setActiveKey(created.key)
    return created
  }, [reloadChannels])

  const removeChannel = useCallback(async (key) => {
    const id = (key || '').startsWith('custom:') ? key.slice('custom:'.length) : null
    if (!id) return
    await deleteChatChannel(id)
    setActiveKey((cur) => (cur === key ? 'all' : cur))
    reloadChannels()
  }, [reloadChannels])

  // Set who's in a role channel (promotes/demotes roles). Refetch contacts since roles changed.
  const setRoleMembers = useCallback(async (roleKey, members) => {
    const role = (roleKey || '').startsWith('role:') ? roleKey.slice('role:'.length) : roleKey
    await setRoleChannelMembers(role, members)
    listChatContacts().then((c) => setContacts(Array.isArray(c) ? c : [])).catch(() => {})
    reloadChannels()
  }, [reloadChannels])

  const totalUnread = Object.values(unread).reduce((a, b) => a + (b || 0), 0)

  return {
    me,
    channels,
    contacts,
    summaries,
    activeKey,
    messages,
    unread,
    online,
    totalUnread,
    loading,
    openChannel,
    openDirect,
    send,
    sendAttachment,
    deleteMessage,
    createChannel,
    removeChannel,
    setRoleMembers,
  }
}
