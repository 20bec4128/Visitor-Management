import { useEffect, useRef } from 'react'

/** Incoming-call prompt with a looping ringtone. Rendered through a portal by CallProvider. */
export default function IncomingCallModal({ peer, onAccept, onReject }) {
  const audioCtxRef = useRef(null)

  useEffect(() => {
    let ctx
    let stopped = false
    let timer
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const ring = () => {
        if (stopped || !ctx) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 480
        gain.gain.value = 0.08
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      }
      ring()
      timer = setInterval(ring, 1500)
    } catch {
      // audio not available — silent ring
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
  }, [])

  const mode = peer?.mode === 'audio' ? 'Voice' : 'Video'

  return (
    <div className="vm-call-incoming-backdrop">
      <div className="vm-call-incoming">
        <div className="vm-call-incoming-avatar">{(peer?.name || '?').charAt(0).toUpperCase()}</div>
        <div className="vm-call-incoming-name">{peer?.name || peer?.username}</div>
        <div className="vm-call-incoming-sub">Incoming {mode} Call…</div>
        <div className="vm-call-incoming-actions">
          <button type="button" className="vm-call-btn vm-call-reject" onClick={onReject}>
            Decline
          </button>
          <button type="button" className="vm-call-btn vm-call-accept" onClick={onAccept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
