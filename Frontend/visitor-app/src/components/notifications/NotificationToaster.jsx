import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import { isLoggedIn } from '../../auth/authStorage.js'
import { useRealtime } from '../../realtime/RealtimeProvider.jsx'
import './notifications.css'

let audioCtx = null
function ping() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!audioCtx) audioCtx = new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.32)
  } catch {
    // no audio
  }
}

/**
 * Global live toaster: pops a card (top-right) whenever a notification arrives on
 * `/user/queue/notifications`, plays a chime, and tells the topbar bell to refresh.
 */
export default function NotificationToaster() {
  const rt = useRealtime()
  const navigate = useNavigate()
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  useEffect(() => {
    if (!rt) return undefined
    const unsub = rt.subscribe('/user/queue/notifications', (n) => {
      if (!n) return
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, ...n }])
      ping()
      window.dispatchEvent(new CustomEvent('vm:notifications-updated'))
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 7000)
    })
    return () => unsub && unsub()
  }, [rt])

  if (!isLoggedIn() || toasts.length === 0) return null

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return createPortal(
    <div className="vm-toast-wrap">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="vm-toast"
          role="button"
          tabIndex={0}
          onClick={() => {
            dismiss(t.id)
            if (t.link) navigate(t.link)
          }}
        >
          <div className="vm-toast-icon">✅</div>
          <div className="vm-toast-body">
            <div className="vm-toast-title">{t.title}</div>
            {t.message && <div className="vm-toast-msg">{t.message}</div>}
          </div>
          <button
            type="button"
            className="vm-toast-close"
            onClick={(e) => {
              e.stopPropagation()
              dismiss(t.id)
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
