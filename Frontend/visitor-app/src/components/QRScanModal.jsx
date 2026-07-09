import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import jsQR from 'jsqr'

function QRScanModal({ isOpen, onClose, onScan }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const detectorRef = useRef(null)
  const handledRef = useRef(false)
  const [isScanning, setIsScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState('')

  // Prefer the browser's native scanner when available, otherwise fall back to jsQR.
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
    setIsScanning(false)
  }

  const handleResult = (code) => {
    const value = (code || '').trim()
    if (!value || handledRef.current) return
    handledRef.current = true
    stopScan()
    onScan(value)
    onClose()
  }

  const tick = async () => {
    const video = videoRef.current
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    // Fast path: native BarcodeDetector.
    if (detectorRef.current) {
      try {
        const codes = await detectorRef.current.detect(video)
        if (codes && codes.length > 0 && codes[0].rawValue) {
          handleResult(codes[0].rawValue)
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
          handleResult(result.data)
          return
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const startScan = async () => {
    setError('')
    handledRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      detectorRef.current = nativeSupported ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null
      // Mount the <video> first; an effect attaches the stream + starts the loop.
      setIsScanning(true)
    } catch {
      setError('Failed to access camera. Please paste code instead.')
      setIsScanning(false)
    }
  }

  // Attach the stream to the freshly-mounted video element and start decoding.
  useEffect(() => {
    if (!isScanning) return undefined
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
  }, [isScanning])

  // Stop the camera when the modal closes/unmounts.
  useEffect(() => {
    if (!isOpen) stopScan()
    return stopScan
  }, [isOpen])

  const handleClose = () => {
    stopScan()
    onClose()
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualCode.trim()) {
      const code = manualCode.trim()
      setManualCode('')
      handleResult(code)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="vm-qr-modal-overlay" onClick={handleClose}>
      <div className="vm-qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vm-qr-modal-head">
          <h2>Scan QR</h2>
          <button
            type="button"
            className="vm-qr-modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="vm-qr-modal-content">
          {isScanning ? (
            <div className="vm-qr-camera-container">
              <video
                ref={videoRef}
                className="vm-qr-video"
                autoPlay
                playsInline
                muted
              />
              <span className="vm-qr-hint">Point the camera at a QR code</span>
            </div>
          ) : (
            <div className="vm-qr-placeholder">
              <div className="vm-qr-placeholder-icon">📷</div>
              <p className="vm-qr-placeholder-title">Camera preview</p>
              <p className="vm-qr-placeholder-sub">Click “Start Scan” to turn on your camera, or paste a token below.</p>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {error && <div className="vm-qr-error">{error}</div>}

          <div className="vm-qr-manual-section">
            <label className="vm-qr-label">Or paste code</label>
            <form onSubmit={handleManualSubmit} className="vm-qr-form">
              <input
                type="text"
                className="vm-qr-input"
                placeholder="Paste token or link"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <button type="submit" className="vm-qr-btn-manual">
                Use Token
              </button>
            </form>
          </div>
        </div>

        <div className="vm-qr-modal-footer">
          <button
            type="button"
            className="vm-qr-btn vm-qr-btn-close"
            onClick={handleClose}
          >
            Close
          </button>
          {isScanning ? (
            <button
              type="button"
              className="vm-qr-btn vm-qr-btn-stop"
              onClick={stopScan}
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="vm-qr-btn vm-qr-btn-start"
              onClick={startScan}
            >
              Start Scan
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default QRScanModal
