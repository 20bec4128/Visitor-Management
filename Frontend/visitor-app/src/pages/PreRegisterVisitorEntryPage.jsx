import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { checkInVisitor, completePreRegisterEntry, createVisitRequest, createVisitor, listVisitRequests, matchFace, validatePreRegisterToken } from '../api/visitor.js'
import './CreateVisitorWizardPage.css'
import './CreateVisitorWizardPage.mobile.css'

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="6" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PreRegisterVisitorEntryPage() {
  const navigate = useNavigate()
  const { token } = useParams()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const visitHistoryRef = useRef(null)
  const checkinRef = useRef(null)

  const [step] = useState(0)
  const [cameraError, setCameraError] = useState('')
  const [loading, setLoading] = useState(true)
  const [cameraRetry, setCameraRetry] = useState(0)

  const [preRegisterData, setPreRegisterData] = useState(null)
  const [capture, setCapture] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [matchResult, setMatchResult] = useState(null)

  const [newVisitorId, setNewVisitorId] = useState(null)
  const [newVisitorForm, setNewVisitorForm] = useState(null)
  const [newVisitorSubmitting, setNewVisitorSubmitting] = useState(false)
  const [newVisitorError, setNewVisitorError] = useState('')

  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState('')
  const [, setShowCheckInSection] = useState(false)

  const recentVisits = matchResult && Array.isArray(matchResult.recentVisits) ? matchResult.recentVisits : []
  const isFaceMatched = matchResult && matchResult.matched

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase()
  }

  function normalizeDigits(value) {
    return String(value || '').replace(/[^\d]/g, '')
  }

  function tokenMatchesVisitor(pre, visitor) {
    if (!pre || !visitor) return false
    const tokenIdProof = `${normalizeText(pre.idProofType)}|${normalizeText(pre.idProofNumber)}`
    const visitorIdProof = `${normalizeText(visitor.idProofType)}|${normalizeText(visitor.idProofNumber)}`
    if (tokenIdProof !== '|' && visitorIdProof !== '|' && tokenIdProof === visitorIdProof) return true

    const tokenEmail = normalizeText(pre.email)
    const visitorEmail = normalizeText(visitor.email)
    if (tokenEmail && visitorEmail && tokenEmail === visitorEmail) return true

    const tokenPhone = normalizeDigits(pre.phoneDialCode) + normalizeDigits(pre.phoneNumber)
    const visitorPhone = normalizeDigits(visitor.phoneDialCode) + normalizeDigits(visitor.phoneNumber)
    if (tokenPhone && visitorPhone && tokenPhone === visitorPhone) return true

    return false
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    validatePreRegisterToken(token)
      .then((data) => {
        if (cancelled) return
        setPreRegisterData(data)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setCameraError(err instanceof Error ? err.message : 'Invalid or expired token.')
        setPreRegisterData(null)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    if (!matchResult || !matchResult.matched) return
    const timer = setTimeout(() => {
      visitHistoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => clearTimeout(timer)
  }, [matchResult])

  useEffect(() => {
    if (step !== 0) return

    let cancelled = false
    async function start() {
      setCameraError('')
      // Stop any lingering stream before requesting a new one
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop()
        streamRef.current = null
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (cancelled) return
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch (err) {
        if (cancelled) return
        const name = err?.name || ''
        if (name === 'NotReadableError' || name === 'TrackStartError') {
          setCameraError('Camera is in use by another app or tab. Close any other apps using the camera, then click Retry.')
        } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError('Camera permission denied. Please allow camera access in your browser settings and click Retry.')
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device.')
        } else {
          setCameraError(err instanceof Error ? err.message : 'Could not access camera.')
        }
      }
    }

    start()

    return () => {
      cancelled = true
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop()
        streamRef.current = null
      }
    }
  }, [step, cameraRetry])

  function handleCapture() {
    setVerifyError('')
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    let width = video.videoWidth
    let height = video.videoHeight
    
    if (!width || !height) {
      setVerifyError('Camera is not ready. Please wait a moment and try again.')
      return
    }
    
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setVerifyError('Unable to capture image. Please try again.')
      return
    }
    
    try {
      ctx.drawImage(video, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      setCapture(dataUrl)
      setMatchResult(null)
    } catch {
      setVerifyError('Failed to capture face. Please try again.')
    }
  }

  async function handleVerify() {
    setVerifyError('')
    if (!capture) {
      setVerifyError('Please capture a face image first.')
      return
    }

    if (!preRegisterData) {
      setVerifyError('Visitor data not loaded. Please refresh the page.')
      return
    }

    setVerifying(true)
    setShowCheckInSection(false)
    setNewVisitorId(null)
    setNewVisitorForm(null)
    setNewVisitorError('')
    try {
      const result = await matchFace({ imageBase64: capture })
      if (result?.matched && !tokenMatchesVisitor(preRegisterData, result.visitor)) {
        setMatchResult(null)
        setVerifyError('Face matched a different visitor than this token. Please re-capture and try again.')
        return
      }
      setMatchResult(result)
      if (!result.matched) {
        setNewVisitorForm({
          name: preRegisterData.visitorName || '',
          email: preRegisterData.email || '',
          phoneDialCode: preRegisterData.phoneDialCode || '',
          phoneNumber: preRegisterData.phoneNumber || '',
          organizationType: preRegisterData.organizationType || '',
          companyName: preRegisterData.companyName || '',
          idProofType: preRegisterData.idProofType || '',
          idProofNumber: preRegisterData.idProofNumber || '',
        })
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Face verification failed.')
      setMatchResult(null)
    } finally {
      setVerifying(false)
    }
  }

  async function handleNewVisitorSubmit(e) {
    e.preventDefault()
    setNewVisitorError('')
    setNewVisitorSubmitting(true)
    try {
      const result = await createVisitor({ ...newVisitorForm, imageBase64: capture })
      setNewVisitorId(result.id)
      setShowCheckInSection(true)
      setTimeout(() => checkinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (err) {
      setNewVisitorError(err instanceof Error ? err.message : 'Failed to register visitor.')
    } finally {
      setNewVisitorSubmitting(false)
    }
  }

  async function handleCompleteEntry() {
    setCompleteError('')
    setCompleting(true)
    try {
      const visitorId = isFaceMatched ? matchResult.visitor.id : newVisitorId

      // Reuse an existing open visit request for this visitor instead of
      // creating a duplicate row. The pre-registration/booking already created
      // a PENDING (or APPROVED) visit request; check that one in so it doesn't
      // stay stuck on "Pending" alongside a new CHECKED_IN row.
      let visitId = null
      try {
        const existing = await listVisitRequests()
        const open = (Array.isArray(existing) ? existing : []).find(
          (v) => v.visitorId === visitorId
            && (v.status === 'PENDING' || v.status === 'APPROVED')
        )
        if (open?.id) visitId = open.id
      } catch {
        // If lookup fails, fall back to creating a fresh request below.
      }

      if (!visitId) {
        const created = await createVisitRequest({
          visitorId,
          hostUserId: preRegisterData.hostUserId,
          visitAt: new Date().toISOString(),
          purpose: preRegisterData.details?.purpose || 'Pre-registered Visitor Check-In',
          preRegisterRequestId: preRegisterData.id
        })
        visitId = created?.id
      }

      if (visitId) {
        await checkInVisitor(visitId)
      }
      
      // Mark pre-registration token as COMPLETED
      await completePreRegisterEntry(token)
      
      // Navigate to dashboard
      navigate('/dashboard', { replace: true, state: { message: 'Visitor checked in successfully!' } })
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Failed to complete check-in')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell title="Pre-Registered Visitor Entry" hideNav>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading visitor information...</p>
        </div>
      </DashboardShell>
    )
  }

  if (!preRegisterData) {
    return (
      <DashboardShell title="Pre-Registered Visitor Entry" hideNav>
        <div style={{ textAlign: 'center', padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <h2 style={{ color: '#991b1b', margin: '0 0 10px', fontSize: '18px' }}>Invalid Token</h2>
            <p style={{ color: '#7f1d1d', margin: '0' }}>
              {cameraError || 'The token provided is invalid or has expired. Please request a new pre-registration token.'}
            </p>
          </div>
          <button
            type="button"
            className="vm-btn vm-btn-orange"
            onClick={() => window.location.href = '/'}
          >
            ← Go back to Dashboard
          </button>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell title="Pre-Registered Visitor Entry" hideNav>
      <div className="vm-create-visitor-page">
        <div className="user-wizard">
          <div className="wizard-progress-bar">
            <div className="wizard-progress" style={{ width: matchResult ? '100%' : '50%' }} />
          </div>

          <div className="wizard-circles-container">
            <button type="button" className="wizard-circle-item">
              <div className={`wizard-circle ${!matchResult ? 'active' : ''}`}>
                <IconCamera />
              </div>
              <div className="wizard-circle-label">Face Capture</div>
            </button>
            <button type="button" className="wizard-circle-item">
              <div className={`wizard-circle ${matchResult ? 'active' : ''}`}>
                <IconCheck />
              </div>
              <div className="wizard-circle-label">Check-In</div>
            </button>
          </div>

          <div className="wizard-step-content">
            {step === 0 && !matchResult && (
              <div className="vm-media-containers">
                <div>
                  <div className="vm-media-panel">
                    <video ref={videoRef} playsInline muted autoPlay />
                  </div>
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className="vm-media-caption">Camera started. Capture a face image.</div>
                  {cameraError && (
                    <div className="vm-inline-error">
                      {cameraError}
                      <button
                        type="button"
                        className="vm-btn vm-btn-orange vm-btn-compact"
                        style={{ marginTop: '8px', display: 'block' }}
                        onClick={() => setCameraRetry(r => r + 1)}
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}
                  <div className="vm-face-actions">
                    <button type="button" className="vm-btn vm-btn-orange vm-btn-compact" onClick={handleCapture}>
                      Capture
                    </button>
                  </div>
                </div>

                <div>
                  <div className="vm-media-panel">
                    {capture ? <img src={capture} alt="Captured face" /> : <div style={{ width: '100%', height: '100%' }} />}
                  </div>
                  <div className="vm-media-caption">{capture ? 'Captured image ready.' : 'No capture yet.'}</div>
                  {verifyError && <div className="vm-inline-error">{verifyError}</div>}
                  <div className="vm-face-actions">
                    <button type="button" className="vm-btn vm-btn-success vm-btn-compact" onClick={handleVerify} disabled={!capture || verifying}>
                      {verifying ? 'Verifying…' : 'Verify Face'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 0 && matchResult && (
              <div
                className="vm-match-panel"
                style={
                  matchResult.alreadyCheckedIn
                    ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2', padding: '16px', borderRadius: '12px' }
                    : {}
                }
              >
                <div className="vm-match-head">
                  <h3 style={{ color: matchResult.alreadyCheckedIn ? '#dc2626' : undefined }}>
                    {matchResult.alreadyCheckedIn
                      ? '✗ Already Checked In'
                      : matchResult.matched
                      ? '✓ Face Verified!'
                      : '✗ Face Not Recognized'}
                  </h3>
                  <button type="button" className="vm-btn vm-btn-orange" onClick={() => {
                    setCapture('')
                    setMatchResult(null)
                    setVerifyError('')
                    setShowCheckInSection(false)
                    setNewVisitorId(null)
                    setNewVisitorForm(null)
                    setNewVisitorError('')
                  }}>
                    ← Retake
                  </button>
                </div>

                {matchResult.matched && (() => {
                  const displayName = matchResult.visitor?.name || preRegisterData.visitorName || '-'
                  const displayEmail = matchResult.visitor?.email || preRegisterData.email || '-'
                  const displayPhone = (((matchResult.visitor?.phoneDialCode || '') + ' ' + (matchResult.visitor?.phoneNumber || '')).trim()) || '-'
                  const displayCompany = matchResult.visitor?.companyName || preRegisterData.companyName || '-'
                  return (
                    <>
                      {matchResult.alreadyCheckedIn ? (
                        <div className="vm-inline-error" style={{ marginBottom: '14px' }}>
                          ✗ Already Checked In: This visitor is currently checked in. Please check out first.
                        </div>
                      ) : (
                        <div className="vm-inline-success" style={{ marginBottom: '14px' }}>
                          Your identity has been verified successfully!
                        </div>
                      )}

                      <div className="vm-info-card">
                        <h4>Visitor Information</h4>
                        <div className="vm-info-grid">
                          <div className="vm-info-field">
                            <span>Full Name</span>
                            <strong>{displayName}</strong>
                          </div>
                          <div className="vm-info-field">
                            <span>Email</span>
                            <strong>{displayEmail}</strong>
                          </div>
                          <div className="vm-info-field">
                            <span>Phone</span>
                            <strong>{displayPhone}</strong>
                          </div>
                          <div className="vm-info-field">
                            <span>Company</span>
                            <strong>{displayCompany}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="vm-info-card">
                        <h4>Host &amp; Purpose</h4>
                        <div className="vm-info-grid">
                          <div className="vm-info-field">
                            <span>Host Name</span>
                            <strong>{preRegisterData.hostName || '-'}</strong>
                          </div>
                          <div className="vm-info-field">
                            <span>Purpose</span>
                            <strong>{preRegisterData.details?.purpose || '-'}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="vm-visit-history-section" style={{ marginTop: '16px' }}>
                        <h4 style={{ marginBottom: '10px', fontSize: '15px', fontWeight: '600', color: matchResult.alreadyCheckedIn ? '#dc2626' : '#1e293b' }}>Visit History</h4>
                        {recentVisits && recentVisits.length > 0 ? (
                          <div className="vm-table-wrap" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(148, 163, 184, 0.25)' }}>
                            <table className="vm-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Purpose</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recentVisits.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.visitAt ? new Date(item.visitAt).toLocaleString() : '-'}</td>
                                    <td>{item.purpose || '-'}</td>
                                    <td>{(item.status || 'PENDING').toString().toLowerCase().replace(/_/g, ' ')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p style={{ color: '#64748b', fontSize: '14px' }}>No previous visits recorded.</p>
                        )}
                      </div>

                      {!matchResult.alreadyCheckedIn && (
                        <div ref={checkinRef} className="vm-checkin-action" style={{ marginTop: '20px' }}>
                          <button
                            type="button"
                            className="vm-btn vm-btn-success"
                            onClick={handleCompleteEntry}
                            disabled={completing}
                            style={{ fontWeight: 600 }}
                          >
                            {completing ? 'Processing Check-In...' : 'Check In'}
                          </button>
                        </div>
                      )}

                      {completeError && <div className="vm-inline-error" style={{ marginTop: '14px' }}>{completeError}</div>}
                    </>
                  )
                })()}

                {!matchResult.matched && newVisitorForm && (
                  <>
                    <div className="vm-inline-error" style={{ marginBottom: '14px' }}>
                      Face not found in system. Please confirm your details below to register and proceed.
                    </div>
                    <form onSubmit={handleNewVisitorSubmit} className="vm-info-card" style={{ marginBottom: '14px' }}>
                      <h4>Confirm Your Details</h4>
                      <div className="vm-info-grid">
                        <div className="vm-info-field">
                          <span>Full Name *</span>
                          <input
                            className="vm-input"
                            required
                            value={newVisitorForm.name}
                            onChange={e => setNewVisitorForm(f => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div className="vm-info-field">
                          <span>Email</span>
                          <input
                            className="vm-input"
                            type="email"
                            value={newVisitorForm.email}
                            onChange={e => setNewVisitorForm(f => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                        <div className="vm-info-field">
                          <span>Phone Dial Code</span>
                          <input
                            className="vm-input"
                            value={newVisitorForm.phoneDialCode}
                            onChange={e => setNewVisitorForm(f => ({ ...f, phoneDialCode: e.target.value }))}
                          />
                        </div>
                        <div className="vm-info-field">
                          <span>Phone Number</span>
                          <input
                            className="vm-input"
                            value={newVisitorForm.phoneNumber}
                            onChange={e => setNewVisitorForm(f => ({ ...f, phoneNumber: e.target.value }))}
                          />
                        </div>
                        <div className="vm-info-field">
                          <span>Company</span>
                          <input
                            className="vm-input"
                            value={newVisitorForm.companyName}
                            onChange={e => setNewVisitorForm(f => ({ ...f, companyName: e.target.value }))}
                          />
                        </div>
                        <div className="vm-info-field">
                          <span>ID Proof Type</span>
                          <input
                            className="vm-input"
                            value={newVisitorForm.idProofType}
                            onChange={e => setNewVisitorForm(f => ({ ...f, idProofType: e.target.value }))}
                          />
                        </div>
                        <div className="vm-info-field">
                          <span>ID Proof Number</span>
                          <input
                            className="vm-input"
                            value={newVisitorForm.idProofNumber}
                            onChange={e => setNewVisitorForm(f => ({ ...f, idProofNumber: e.target.value }))}
                          />
                        </div>
                      </div>
                      {newVisitorError && <div className="vm-inline-error" style={{ marginTop: '10px' }}>{newVisitorError}</div>}
                      <div className="vm-face-actions" style={{ marginTop: '14px' }}>
                        <button type="submit" className="vm-btn vm-btn-success" disabled={newVisitorSubmitting}>
                          {newVisitorSubmitting ? 'Registering…' : 'Confirm & Continue →'}
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {!matchResult.matched && newVisitorId && (() => {
                  const displayName = newVisitorForm?.name || preRegisterData.visitorName || '-'
                  const displayEmail = newVisitorForm?.email || preRegisterData.email || '-'
                  const displayPhone = (((newVisitorForm?.phoneDialCode || '') + ' ' + (newVisitorForm?.phoneNumber || '')).trim()) || '-'
                  const displayCompany = newVisitorForm?.companyName || preRegisterData.companyName || '-'
                  return (
                    <>
                      <div className="vm-info-card">
                        <h4>Visitor Information</h4>
                        <div className="vm-info-grid">
                          <div className="vm-info-field">
                            <span>Full Name</span>
                            <strong>{displayName}</strong>
                          </div>
                          <div className="vm-info-field">
                            <span>Email</span>
                            <strong>{displayEmail}</strong>
                          </div>
                          <div className="vm-info-field">
                            <span>Phone</span>
                            <strong>{displayPhone}</strong>
                          </div>
                          <div className="vm-info-field">
                            <span>Company</span>
                            <strong>{displayCompany}</strong>
                          </div>
                        </div>
                      </div>
                      <div className="vm-info-card">
                        <h4>Host &amp; Purpose</h4>
                        <div className="vm-info-grid">
                          <div className="vm-info-field">
                            <span>Host Name</span>
                            <strong>{preRegisterData.hostName || '-'}</strong>
                          </div>
                          <div className="vm-info-field">
                            <span>Purpose</span>
                            <strong>{preRegisterData.details?.purpose || '-'}</strong>
                          </div>
                        </div>
                      </div>
                      <div ref={checkinRef} className="vm-checkin-action" style={{ marginTop: '20px' }}>
                        <button
                          type="button"
                          className="vm-btn vm-btn-success"
                          onClick={handleCompleteEntry}
                          disabled={completing}
                          style={{ fontWeight: 600 }}
                        >
                          {completing ? 'Processing Check-In...' : 'Check In'}
                        </button>
                      </div>
                      {completeError && <div className="vm-inline-error" style={{ marginTop: '14px' }}>{completeError}</div>}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

export default PreRegisterVisitorEntryPage
