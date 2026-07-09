import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { listSosAlerts, resolveSosAlert } from '../../api/sos.js'
import { getAuthSession, hasPermission, isLoggedIn } from '../../auth/authStorage.js'
import { PERMISSIONS } from '../../rbac/access.js'
import { useRealtime } from '../../realtime/RealtimeProvider.jsx'
import './sos.css'

/**
 * Global emergency overlay. Subscribes to `/topic/sos`, shows a full-screen red banner + siren for
 * every active alert — EXCEPT to the person who raised it (they don't get alarmed by their own SOS).
 * Resolving an alert broadcasts RESOLVED, which clears it and stops the siren for everyone.
 */
export default function SosAlertOverlay() {
  const rt = useRealtime()
  const [active, setActive] = useState([]) // SosResponse[] with status ACTIVE
  const [dismissed, setDismissed] = useState(() => new Set())
  const canResolve = hasPermission(PERMISSIONS.sosResolve)
  const me = (getAuthSession().username || '').toLowerCase()

  // Don't alarm the person who triggered the SOS — only everyone else.
  const raisedByMe = (a) => (a.triggeredByUsername || '').toLowerCase() === me

  // Seed with any alerts that are already active (e.g. user logged in after the alarm).
  useEffect(() => {
    if (!isLoggedIn() || !hasPermission(PERMISSIONS.sosView)) return
    listSosAlerts()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows.filter((a) => a.status === 'ACTIVE') : []
        setActive(list)
      })
      .catch(() => {})
  }, [])

  // Live updates.
  useEffect(() => {
    if (!rt) return undefined
    const unsub = rt.subscribe('/topic/sos', (alert) => {
      if (!alert || !alert.id) return
      setActive((prev) => {
        const others = prev.filter((a) => a.id !== alert.id)
        return alert.status === 'ACTIVE' ? [alert, ...others] : others
      })
    })
    return () => unsub && unsub()
  }, [rt])

  const visible = active.filter((a) => !dismissed.has(a.id) && !raisedByMe(a))

  // Siren while there are visible alerts.
  const audioCtxRef = useRef(null)
  useEffect(() => {
    if (visible.length === 0) return undefined
    let ctx
    let stopped = false
    let timer
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const wail = () => {
        if (stopped || !ctx) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        gain.gain.value = 0.12
        osc.connect(gain).connect(ctx.destination)
        const t = ctx.currentTime
        osc.frequency.setValueAtTime(660, t)
        osc.frequency.linearRampToValueAtTime(440, t + 0.5)
        osc.frequency.linearRampToValueAtTime(660, t + 1)
        osc.start(t)
        osc.stop(t + 1)
      }
      wail()
      timer = setInterval(wail, 1100)
    } catch {
      // no audio available
    }
    return () => {
      stopped = true
      clearInterval(timer)
      try {
        ctx?.close()
      } catch {
        // ignore
      }
    }
  }, [visible.length])

  if (visible.length === 0) return null

  const acknowledge = (id) => setDismissed((prev) => new Set(prev).add(id))

  const resolve = async (id) => {
    try {
      await resolveSosAlert(id)
      setActive((prev) => prev.filter((a) => a.id !== id))
    } catch {
      // broadcast will eventually clear it; ignore
    }
  }

  return createPortal(
    <div className="vm-sos-overlay">
      <div className="vm-sos-overlay-inner">
        <div className="vm-sos-overlay-title">🚨 EMERGENCY SOS</div>
        <div className="vm-sos-overlay-list">
          {visible.map((a) => (
            <div key={a.id} className="vm-sos-overlay-card">
              <div className="vm-sos-overlay-who">
                {a.triggeredByName || a.triggeredByUsername}
                {a.role ? <span className="vm-sos-overlay-role">{a.role}</span> : null}
              </div>
              <div className="vm-sos-overlay-msg">{a.message || 'Emergency! Help needed.'}</div>
              <div className="vm-sos-overlay-meta">
                {a.location ? <span>📍 {a.location}</span> : null}
                <span>🕒 {a.createdAt}</span>
              </div>
              <div className="vm-sos-overlay-actions">
                <button type="button" className="vm-sos-ack" onClick={() => acknowledge(a.id)}>
                  Acknowledge
                </button>
                {canResolve && (
                  <button type="button" className="vm-sos-resolve" onClick={() => resolve(a.id)}>
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
