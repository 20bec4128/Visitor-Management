import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { validatePreRegisterToken } from '../api/visitor.js'
import './QRScanPage.css'

// Pull the pre-register token out of whatever the QR encodes — either a raw
// token or a full link like ".../pre-register-entry/<token>".
function extractToken(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  const marker = '/pre-register-entry/'
  const idx = value.indexOf(marker)
  let token = idx >= 0 ? value.slice(idx + marker.length) : value
  token = token.split(/[?#]/)[0]
  try {
    token = decodeURIComponent(token)
  } catch {
    // leave as-is if it isn't percent-encoded
  }
  return token.trim()
}

function QRScanPage() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectorRef = useRef(null)

  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const [manualCode, setManualCode] = useState('')

  // Prefer the fast native API when present, otherwise decode with jsQR — which
  // works in every browser (Firefox, Safari, Chrome/Edge on Windows, …).
  const nativeSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  const stopScan = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    detectorRef.current = null
    setScanning(false)
  }

  // Stop the camera when leaving the page.
  useEffect(() => stopScan, [])

  const resolveToken = async (raw) => {
    const token = extractToken(raw)
    if (!token) {
      setError('No token found in the scanned code. Paste the token or link instead.')
      return
    }
    stopScan()
    setValidating(true)
    setError('')
    try {
      await validatePreRegisterToken(token)
      navigate(`/pre-register-entry/${encodeURIComponent(token)}`)
    } catch (err) {
      setValidating(false)
      setError(err instanceof Error ? err.message : 'Invalid or expired token.')
    }
  }

  const tick = async () => {
    const video = videoRef.current
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    // Fast path: native BarcodeDetector when the browser supports it.
    if (detectorRef.current) {
      try {
        const codes = await detectorRef.current.detect(video)
        if (codes && codes.length > 0 && codes[0].rawValue) {
          resolveToken(codes[0].rawValue)
          return
        }
      } catch {
        // transient detect errors — keep scanning
      }
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    // Universal path: grab a frame and decode with jsQR.
    const canvas = canvasRef.current
    if (canvas) {
      const w = video.videoWidth
      const h = video.videoHeight
      if (w && h) {
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        const result = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' })
        if (result && result.data) {
          resolveToken(result.data)
          return
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const startScan = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      detectorRef.current = nativeSupported ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null
      // Mount the <video> first; an effect attaches the stream + starts the loop
      // once the element actually exists in the DOM.
      setScanning(true)
    } catch {
      setScanning(false)
      setError('Could not access the camera. Check permissions, or paste the token below.')
    }
  }

  // Attach the stream to the freshly-mounted video element and start decoding.
  useEffect(() => {
    if (!scanning) return undefined
    const video = videoRef.current
    if (video && streamRef.current) {
      video.srcObject = streamRef.current
      video.play().catch(() => {})
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualCode.trim()) resolveToken(manualCode)
  }

  return (
    <DashboardShell pageTitle="QR Scan" breadcrumbItems={['Visitors', 'QR Scan']}>
      <section className="vm-qrpage">
        <div className="vm-qrpage-head">
          <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <h2>Scan Visitor QR</h2>
            <p>Scan a pre-registered visitor&apos;s QR code to start their check-in, or paste their token below.</p>
          </div>
        </div>

        <div className="vm-qrpage-grid">
          <div className="vm-qrpage-camera-card">
            {scanning ? (
              <div className="vm-qrpage-camera">
                <video ref={videoRef} className="vm-qrpage-video" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="vm-qrpage-canvas" aria-hidden="true" />
                <span className="vm-qrpage-reticle" aria-hidden="true" />
                <span className="vm-qrpage-hint">Point the camera at the QR code</span>
              </div>
            ) : (
              <div className="vm-qrpage-placeholder">
                <div className="vm-qrpage-placeholder-icon">📷</div>
                <p className="vm-qrpage-placeholder-title">Camera is off</p>
                <p className="vm-qrpage-placeholder-sub">Click “Start Camera” to scan a QR code.</p>
              </div>
            )}

            <div className="vm-qrpage-actions">
              {scanning ? (
                <button type="button" className="vm-btn vm-btn-ghost" onClick={stopScan}>
                  Stop Camera
                </button>
              ) : (
                <button type="button" className="vm-btn vm-btn-orange" onClick={startScan} disabled={validating}>
                  Start Camera
                </button>
              )}
            </div>
          </div>

          <div className="vm-qrpage-manual-card">
            <h3>Enter token manually</h3>
            <p>Paste the visitor&apos;s token or their pre-register link.</p>
            <form onSubmit={handleManualSubmit} className="vm-qrpage-form">
              <input
                type="text"
                className="vm-qrpage-input"
                placeholder="Paste token or link"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value)
                  setError('')
                }}
              />
              <button type="submit" className="vm-btn vm-btn-orange" disabled={validating || !manualCode.trim()}>
                {validating ? 'Checking…' : 'Continue'}
              </button>
            </form>

            {validating ? <div className="vm-qrpage-status">Validating token…</div> : null}
            {error ? <div className="vm-qrpage-error">⚠ {error}</div> : null}
          </div>
        </div>
      </section>
    </DashboardShell>
  )
}

export default QRScanPage
