import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { getIceServers } from '../../api/call.js'
import { logCall } from '../../api/chat.js'
import { useRealtime } from '../../realtime/RealtimeProvider.jsx'
import CallOverlay from './CallOverlay.jsx'
import IncomingCallModal from './IncomingCallModal.jsx'
import './call.css'

const CallContext = createContext(null)

export function useCall() {
  return useContext(CallContext)
}

/**
 * Drives 1:1 WebRTC voice/video calls. Signaling is relayed over STOMP (`/app/call.signal` out,
 * `/user/queue/call` in). Exposes `startCall(username, name, mode)` to the rest of the app and
 * renders the incoming-call modal and in-call overlay through a portal.
 */
export function CallProvider({ children }) {
  const rt = useRealtime()

  const [status, setStatus] = useState('idle') // idle | calling | ringing | connected
  const [peer, setPeer] = useState(null) // { username, name, mode }
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const pendingOfferRef = useRef(null)
  const peerRef = useRef(null)
  const statusRef = useRef('idle')
  const initiatedRef = useRef(false) // true only on the side that placed the call
  const connectedAtRef = useRef(null) // epoch ms when media connected

  // Keep the refs (read inside long-lived callbacks/subscriptions) in sync without touching them
  // during render. Critical transitions also set them imperatively below for immediacy.
  useEffect(() => {
    peerRef.current = peer
  }, [peer])
  useEffect(() => {
    statusRef.current = status
  }, [status])

  const sendSignal = useCallback(
    (type, to, payload, mode) => {
      rt?.publish('/app/call.signal', { type, to, mode, payload })
    },
    [rt],
  )

  const cleanup = useCallback(() => {
    try {
      pcRef.current?.close()
    } catch {
      // ignore
    }
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    pendingCandidatesRef.current = []
    pendingOfferRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
    setMuted(false)
    setCameraOff(false)
  }, [])

  const reset = useCallback(() => {
    cleanup()
    statusRef.current = 'idle'
    peerRef.current = null
    setStatus('idle')
    setPeer(null)
  }, [cleanup])

  // Write a call-log entry into the DM — only from the side that placed the call (avoids dupes).
  const finalizeCallLog = useCallback(() => {
    if (!initiatedRef.current) return
    initiatedRef.current = false
    const p = peerRef.current
    const startedAt = connectedAtRef.current
    connectedAtRef.current = null
    if (!p) return
    const icon = p.mode === 'audio' ? '📞' : '🎥'
    const label = p.mode === 'audio' ? 'Voice call' : 'Video call'
    let text
    if (startedAt) {
      const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
      const mm = Math.floor(secs / 60)
      const ss = String(secs % 60).padStart(2, '0')
      text = `${icon} ${label} · ${mm}:${ss}`
    } else {
      text = `${icon} ${label} · No answer`
    }
    logCall(p.username, text).catch(() => {})
  }, [])

  const endCall = useCallback(
    (notify = true) => {
      const p = peerRef.current
      if (notify && p) sendSignal('hangup', p.username)
      finalizeCallLog()
      reset()
    },
    [finalizeCallLog, reset, sendSignal],
  )

  const createPeer = useCallback(
    async (mode) => {
      let iceServers = []
      try {
        const cfg = await getIceServers()
        iceServers = cfg?.iceServers || []
      } catch {
        // fall back to no ICE servers (same-host only)
      }
      const pc = new RTCPeerConnection({ iceServers })
      pc.onicecandidate = (e) => {
        if (e.candidate && peerRef.current) sendSignal('ice', peerRef.current.username, e.candidate)
      }
      pc.ontrack = (e) => {
        const [stream] = e.streams
        setRemoteStream(stream)
      }
      pcRef.current = pc

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' })
      localStreamRef.current = stream
      setLocalStream(stream)
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      return pc
    },
    [sendSignal],
  )

  const startCall = useCallback(
    async (username, name, mode = 'video') => {
      if (statusRef.current !== 'idle' || !username) return
      const p = { username, name: name || username, mode }
      peerRef.current = p
      statusRef.current = 'calling'
      initiatedRef.current = true
      connectedAtRef.current = null
      setPeer(p)
      setStatus('calling')
      try {
        const pc = await createPeer(mode)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignal('offer', username, offer, mode)
      } catch (e) {
        reset()
        window.alert(`Could not start call: ${e?.message || e}`)
      }
    },
    [createPeer, reset, sendSignal],
  )

  const acceptCall = useCallback(async () => {
    const p = peerRef.current
    const offer = pendingOfferRef.current
    if (!p || !offer) return
    try {
      const pc = await createPeer(p.mode)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      for (const c of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c))
        } catch {
          // ignore bad candidate
        }
      }
      pendingCandidatesRef.current = []
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendSignal('answer', p.username, answer)
      statusRef.current = 'connected'
      connectedAtRef.current = Date.now()
      setStatus('connected')
    } catch (e) {
      endCall(true)
      window.alert(`Could not accept call: ${e?.message || e}`)
    }
  }, [createPeer, endCall, sendSignal])

  const rejectCall = useCallback(() => {
    const p = peerRef.current
    if (p) sendSignal('reject', p.username)
    reset()
  }, [reset, sendSignal])

  const toggleMute = useCallback(() => {
    const s = localStreamRef.current
    if (!s) return
    const wasEnabled = s.getAudioTracks().some((t) => t.enabled)
    s.getAudioTracks().forEach((t) => (t.enabled = !wasEnabled))
    setMuted(wasEnabled)
  }, [])

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current
    if (!s) return
    const wasEnabled = s.getVideoTracks().some((t) => t.enabled)
    s.getVideoTracks().forEach((t) => (t.enabled = !wasEnabled))
    setCameraOff(wasEnabled)
  }, [])

  // Incoming signaling.
  useEffect(() => {
    if (!rt) return undefined
    const unsub = rt.subscribe('/user/queue/call', async (sig) => {
      if (!sig || !sig.type) return
      const fromUser = sig.from
      switch (sig.type) {
        case 'offer': {
          if (statusRef.current !== 'idle') {
            rt.publish('/app/call.signal', { type: 'reject', to: fromUser })
            return
          }
          pendingOfferRef.current = sig.payload
          const p = { username: fromUser, name: sig.fromName || fromUser, mode: sig.mode || 'video' }
          peerRef.current = p
          statusRef.current = 'ringing'
          initiatedRef.current = false // this side received the call
          connectedAtRef.current = null
          setPeer(p)
          setStatus('ringing')
          break
        }
        case 'answer': {
          const pc = pcRef.current
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload))
            for (const c of pendingCandidatesRef.current) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c))
              } catch {
                // ignore
              }
            }
            pendingCandidatesRef.current = []
            statusRef.current = 'connected'
            connectedAtRef.current = Date.now()
            setStatus('connected')
          }
          break
        }
        case 'ice': {
          const pc = pcRef.current
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(sig.payload))
            } catch {
              // ignore
            }
          } else {
            pendingCandidatesRef.current.push(sig.payload)
          }
          break
        }
        case 'reject':
        case 'hangup':
          finalizeCallLog()
          reset()
          break
        default:
          break
      }
    })
    return () => unsub && unsub()
  }, [rt, reset, finalizeCallLog])

  return (
    <CallContext.Provider value={{ status, startCall }}>
      {children}
      {status === 'ringing' &&
        createPortal(
          <IncomingCallModal peer={peer} onAccept={acceptCall} onReject={rejectCall} />,
          document.body,
        )}
      {(status === 'calling' || status === 'connected') &&
        createPortal(
          <CallOverlay
            peer={peer}
            status={status}
            muted={muted}
            cameraOff={cameraOff}
            localStream={localStream}
            remoteStream={remoteStream}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onHangup={() => endCall(true)}
          />,
          document.body,
        )}
    </CallContext.Provider>
  )
}
