import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { listEmployeeHosts } from '../api/staff.js'
import { createVisitRequest, matchFace } from '../api/visitor.js'
import { listVisitCategories, listOrganizationTypes } from '../api/config.js'
import { payWithRazorpay } from '../api/payment.js'
import usePaymentEnabled from '../hooks/usePaymentEnabled.js'
import './CreateVisitorWizardPage.css'
import './CreateVisitorWizardPage.mobile.css'

const DEFAULT_ORG_TYPES = ['Factory', 'IT Company', 'Hospital', 'School']
const ID_PROOF_TYPES = ['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN']

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7a2 2 0 0 1 2-2h2l1.2-1.6A2 2 0 0 1 10.8 3h2.4a2 2 0 0 1 1.6.8L16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function WizardCircle({ active, label, icon, onClick }) {
  return (
    <button type="button" className="wizard-circle-item" onClick={onClick}>
      <span className={`wizard-circle ${active ? 'active' : ''}`} aria-hidden="true">
        {icon}
      </span>
      <span className="wizard-circle-label">{label}</span>
    </button>
  )
}

function toIsoFromDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function CreateVisitorWizardPage() {
  const navigate = useNavigate()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const matchPanelRef = useRef(null)

  const [step, setStep] = useState(0)
  const [cameraError, setCameraError] = useState('')

  const [capture, setCapture] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [matchResult, setMatchResult] = useState(null)

  const [visitorForm, setVisitorForm] = useState({
    name: '',
    email: '',
    phoneDialCode: '+91',
    phoneNumber: '',
    organizationType: 'Factory',
    companyName: '',
    idProofType: '',
    idProofNumber: '',
  })

  const [factoryForm, setFactoryForm] = useState({
    factoryPurpose: '',
    factorySafetyGearRequired: false,
    factoryAreaVisiting: '',
    factorySupervisorName: '',
    factoryMaterialCarrying: false,
  })

  const [approvalForm, setApprovalForm] = useState({
    hostUserId: '',
    visitAtLocal: '',
    purpose: '',
    visitCategory: '',
  })

  const [hosts, setHosts] = useState([])
  const [categories, setCategories] = useState([])
  const [orgTypes, setOrgTypes] = useState(DEFAULT_ORG_TYPES)
  const paymentsEnabled = usePaymentEnabled()
  const [hostLoadError, setHostLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const matchedVisitor = matchResult && matchResult.matched ? matchResult.visitor : null
  const recentVisits = matchResult && Array.isArray(matchResult.recentVisits) ? matchResult.recentVisits : []

  const selectedFee = useMemo(() => {
    if (!paymentsEnabled) return 0
    const cat = categories.find((c) => c.title === approvalForm.visitCategory)
    return cat ? Number(cat.fees) || 0 : 0
  }, [categories, approvalForm.visitCategory, paymentsEnabled])

  const canGoNextFromFace = useMemo(() => Boolean(capture), [capture])

  const progressPercent = useMemo(() => {
    if (step === 0) return 0
    if (step === 1) return 50
    return 100
  }, [step])

  useEffect(() => {
    let cancelled = false
    async function start() {
      setCameraError('')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (cancelled) return
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch (err) {
        if (cancelled) return
        setCameraError(err instanceof Error ? err.message : 'Camera permission denied.')
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
  }, [])

  useEffect(() => {
    let cancelled = false
    setHostLoadError('')
    listEmployeeHosts()
      .then((data) => {
        if (cancelled) return
        setHosts(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (cancelled) return
        setHosts([])
        setHostLoadError(err instanceof Error ? err.message : 'Failed to load hosts.')
      })
    listVisitCategories()
      .then((data) => {
        if (!cancelled) setCategories(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    listOrganizationTypes()
      .then((data) => {
        if (cancelled) return
        const names = Array.isArray(data) ? data.map((t) => t.name).filter(Boolean) : []
        if (names.length > 0) setOrgTypes(names)
      })
      .catch(() => {
        // keep the default list on failure
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-scroll to match panel when face is matched
  useEffect(() => {
    if (matchResult && matchResult.matched && matchPanelRef.current) {
      setTimeout(() => {
        matchPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [matchResult])

  function handleCapture() {
    setVerifyError('')
    setSubmitError('')
    setSubmitSuccess('')
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapture(dataUrl)
    setMatchResult(null)
  }

  async function handleVerify() {
    setVerifyError('')
    setSubmitError('')
    setSubmitSuccess('')
    if (!capture) {
      setVerifyError('Please capture a face image first.')
      return
    }

    setVerifying(true)
    try {
      console.log('[CreateVisitorWizard] Calling matchFace API...')
      const data = await matchFace({ imageBase64: capture })
      console.log('[CreateVisitorWizard] matchFace response:', data)
      setMatchResult(data || null)
      if (data && data.matched && data.visitor) {
        const v = data.visitor
        setVisitorForm((p) => ({
          ...p,
          name: v.name || '',
          email: v.email || '',
          phoneDialCode: v.phoneDialCode || '+91',
          phoneNumber: v.phoneNumber || '',
          organizationType: v.organizationType || p.organizationType || 'Factory',
          companyName: v.companyName || '',
          idProofType: v.idProofType || '',
          idProofNumber: v.idProofNumber || '',
        }))
        setFactoryForm({
          factoryPurpose: '',
          factorySafetyGearRequired: false,
          factoryAreaVisiting: '',
          factorySupervisorName: '',
          factoryMaterialCarrying: false,
        })
      }
      // Show a message when no match is found
      if (!data || !data.matched) {
        setVerifyError('')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Face verification failed.'
      console.error('[CreateVisitorWizard] matchFace error:', errorMsg, err)
      setVerifyError(errorMsg)
      setMatchResult(null)
    } finally {
      setVerifying(false)
    }
  }

  function handleNext() {
    setSubmitError('')
    setSubmitSuccess('')
    setStep((s) => Math.min(2, s + 1))
  }

  function handleBack() {
    setSubmitError('')
    setSubmitSuccess('')
    setStep((s) => Math.max(0, s - 1))
  }

  async function handleSubmit() {
    setSubmitError('')
    setSubmitSuccess('')
    const hostUserId = approvalForm.hostUserId ? Number(approvalForm.hostUserId) : 0
    if (!hostUserId) {
      setSubmitError('Please select a host.')
      return
    }

    const visitAtIso = toIsoFromDateTimeLocal(approvalForm.visitAtLocal)
    if (!visitAtIso) {
      setSubmitError('Please select a valid visit date & time.')
      return
    }

    if (!capture) {
      setSubmitError('Face capture is missing.')
      return
    }

    const payload = {
      hostUserId,
      visitAt: visitAtIso,
      purpose: approvalForm.purpose || '',
      visitCategory: approvalForm.visitCategory || '',
      imageBase64: capture,
    }

    const visitOrganizationType = (matchedVisitor?.organizationType || visitorForm.organizationType || '').toString()
    if (visitOrganizationType === 'Factory') {
      payload.factoryPurpose = factoryForm.factoryPurpose || null
      payload.factorySafetyGearRequired = Boolean(factoryForm.factorySafetyGearRequired)
      payload.factoryAreaVisiting = factoryForm.factoryAreaVisiting || null
      payload.factorySupervisorName = factoryForm.factorySupervisorName || null
      payload.factoryMaterialCarrying = Boolean(factoryForm.factoryMaterialCarrying)
    }

    if (matchedVisitor && matchedVisitor.id) {
      payload.visitorId = matchedVisitor.id
    } else {
      if (!visitorForm.name.trim()) {
        setSubmitError('Visitor name is required.')
        return
      }
      payload.visitor = {
        name: visitorForm.name,
        email: visitorForm.email,
        phoneDialCode: visitorForm.phoneDialCode,
        phoneNumber: visitorForm.phoneNumber,
        organizationType: visitorForm.organizationType,
        companyName: visitorForm.companyName,
        idProofType: visitorForm.idProofType,
        idProofNumber: visitorForm.idProofNumber,
      }
    }

    setSubmitting(true)

    // If the selected visit category is Paid, collect the fee before creating
    // the visit. If online payments aren't configured, this is skipped gracefully.
    const selectedCategory = categories.find((c) => c.title === approvalForm.visitCategory)
    const fee = paymentsEnabled && selectedCategory ? Number(selectedCategory.fees) || 0 : 0
    if (fee > 0) {
      try {
        const pay = await payWithRazorpay({
          amount: fee,
          description: `Visit fee — ${selectedCategory.title}`,
          visitorName: matchedVisitor?.name || visitorForm.name,
          visitCategory: selectedCategory.title,
          prefill: {
            name: matchedVisitor?.name || visitorForm.name || '',
            email: matchedVisitor?.email || visitorForm.email || '',
            contact: visitorForm.phoneNumber || '',
          },
        })
        if (pay && !pay.skipped && !pay.paid) {
          setSubmitError('Payment was not completed.')
          setSubmitting(false)
          return
        }
        // Link the payment to this visit record.
        if (pay && pay.paid && pay.paymentId) {
          payload.paymentId = String(pay.paymentId)
        }
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Payment failed.')
        setSubmitting(false)
        return
      }
    }

    try {
      await createVisitRequest(payload)
      setSubmitSuccess('Visit request created and sent for approval.')
      setTimeout(() => navigate('/host-approvals'), 600)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create visit request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardShell pageTitle="Create Visitor" breadcrumbItems={['Visitor', 'Create']}>
      <section className="vm-card vm-create-visitor-page">
        <div className="vm-card-head">
          <h2>Create Visitor</h2>
          <div className="vm-visitor-head-actions">
            <button type="button" className="vm-btn vm-btn-light" onClick={() => navigate('/visitors')}>
              Back
            </button>
          </div>
        </div>

        <div className="user-wizard">
          <div className="wizard-progress-bar" aria-hidden="true">
            <div className="wizard-progress" style={{ transform: `scaleX(${progressPercent / 100})` }} />
          </div>

          <div className="wizard-circles-container">
            <WizardCircle active={step === 0} label="Face" icon={<IconCamera />} onClick={() => setStep(0)} />
            <WizardCircle active={step === 1} label="Visitor" icon={<IconUser />} onClick={() => (step >= 1 ? setStep(1) : null)} />
            <WizardCircle active={step === 2} label="Approval" icon={<IconCheck />} onClick={() => (step >= 2 ? setStep(2) : null)} />
          </div>

          <div className="wizard-step-content">
            {step === 0 ? (
              <div className="vm-media-containers">
                <div>
                  <div className="vm-media-panel">
                    <video ref={videoRef} playsInline muted />
                  </div>
                  <div className="vm-media-caption">Camera started. Capture a face image.</div>
                  <div className="vm-face-actions">
                    <button type="button" className="vm-btn vm-btn-orange" onClick={handleCapture}>
                      Capture
                    </button>
                  </div>
                  {cameraError ? <div className="vm-inline-error">{cameraError}</div> : null}
                </div>

                <div>
                  <div className="vm-media-panel">
                    {capture ? <img src={capture} alt="Captured face" /> : <div style={{ width: '100%', height: '100%' }} />}
                  </div>
                  <div className="vm-media-caption">{capture ? 'Captured image ready.' : 'No capture yet.'}</div>
                  <div className="vm-face-actions">
                    <button type="button" className="vm-btn vm-btn-success" onClick={handleVerify} disabled={!capture || verifying}>
                      {verifying ? 'Verifying…' : 'Verify Face'}
                    </button>
                  </div>
                  {verifyError ? <div className="vm-inline-error">{verifyError}</div> : null}
                  {matchResult && !matchResult.matched ? (
                    <div style={{ padding: '12px', marginTop: '12px', borderRadius: '8px', backgroundColor: '#f0f4f8', borderLeft: '4px solid #f59e0b', color: '#92400e' }}>
                      <strong>No match found</strong>
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                        This visitor is new. Please fill in their details to continue.
                      </p>
                    </div>
                  ) : null}
                </div>

              {matchResult && matchResult.matched && matchedVisitor ? (
                <div
                  ref={matchPanelRef}
                  className="vm-match-panel"
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    backgroundColor: matchResult.alreadyCheckedIn ? '#fef2f2' : '#f0fdf4',
                    borderRadius: '12px',
                    border: matchResult.alreadyCheckedIn ? '2px solid #ef4444' : '2px solid #22c55e'
                  }}
                >
                  <div className="vm-match-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '600', color: matchResult.alreadyCheckedIn ? '#dc2626' : '#16a34a' }}>
                        {matchResult.alreadyCheckedIn ? '✗ Already Checked In' : '✓ Match Found'}
                      </h3>
                      <p style={{ margin: '0', fontSize: '13px', color: matchResult.alreadyCheckedIn ? '#b91c1c' : '#65a30d' }}>
                        {matchResult.alreadyCheckedIn ? 'This visitor is currently checked in. Please check them out first.' : 'Existing visitor recognized'}
                      </p>
                    </div>
                    <div style={{ display: 'inline-flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="vm-btn vm-btn-light"
                        onClick={() => {
                          setMatchResult(null)
                          setVerifyError('')
                          setVisitorForm((p) => ({
                            ...p,
                            name: '',
                            email: '',
                            phoneNumber: '',
                            companyName: '',
                            idProofType: '',
                            idProofNumber: '',
                          }))
                          setStep(1)
                        }}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        + Add New Visitor
                      </button>
                      {!matchResult.alreadyCheckedIn && (
                        <button type="button" className="vm-btn vm-btn-success" onClick={() => setStep(2)} style={{ whiteSpace: 'nowrap' }}>
                          + Add New Visit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="vm-summary-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '12px',
                    marginBottom: '20px'
                  }}>
                    <div className="vm-summary-card" style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID</span>
                        <strong style={{ fontSize: '16px', color: '#111827' }}>{matchedVisitor.id}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</span>
                        <strong style={{ fontSize: '16px', color: '#111827' }}>{matchedVisitor.name || '-'}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
                        <strong style={{ fontSize: '14px', color: '#111827', wordBreak: 'break-word' }}>{matchedVisitor.email || '-'}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</span>
                        <strong style={{ fontSize: '14px', color: '#111827' }}>
                          {(((matchedVisitor.phoneDialCode || '') + ' ' + (matchedVisitor.phoneNumber || '')).trim()) || '-'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {recentVisits.length > 0 ? (
                    <div style={{ marginTop: '16px' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: matchResult.alreadyCheckedIn ? '#dc2626' : '#16a34a' }}>Recent Visits</h4>
                      <div className="vm-table-wrap" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db', backgroundColor: 'white' }}>
                        <table className="vm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Date</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Purpose</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentVisits.map((item) => (
                              <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#1f2937' }}>{item.visitAt ? new Date(item.visitAt).toLocaleString() : '-'}</td>
                                <td style={{ padding: '10px 12px', fontSize: '13px', color: '#1f2937' }}>{item.purpose || '-'}</td>
                                <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                                  <span style={{ 
                                    display: 'inline-block', 
                                    padding: '4px 8px', 
                                    backgroundColor: '#e0f2fe', 
                                    color: '#0369a1', 
                                    borderRadius: '4px',
                                    fontWeight: '500',
                                    textTransform: 'uppercase',
                                    fontSize: '11px'
                                  }}>
                                    {(item.status || 'PENDING').toLowerCase().replace(/_/g, ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="vm-form-grid">
              <div className="vm-form-field">
                <label>Organization Type</label>
                <select
                  className="vm-select"
                  value={visitorForm.organizationType}
                  onChange={(e) => setVisitorForm((p) => ({ ...p, organizationType: e.target.value }))}
                >
                  <option value="">Select organization type</option>
                  {orgTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vm-form-field">
                <label>Visitor Name</label>
                <input
                  className="vm-input"
                  value={visitorForm.name}
                  onChange={(e) => setVisitorForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter visitor name"
                />
              </div>
              <div className="vm-form-field">
                <label>Email</label>
                <input
                  className="vm-input"
                  value={visitorForm.email}
                  onChange={(e) => setVisitorForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Enter email"
                />
              </div>
              <div className="vm-form-field">
                <label>Phone Dial Code</label>
                <input
                  className="vm-input"
                  value={visitorForm.phoneDialCode}
                  onChange={(e) => setVisitorForm((p) => ({ ...p, phoneDialCode: e.target.value }))}
                  placeholder="+91"
                />
              </div>
              <div className="vm-form-field">
                <label>Phone</label>
                <input
                  className="vm-input"
                  value={visitorForm.phoneNumber}
                  onChange={(e) => setVisitorForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder="Enter phone"
                />
              </div>
              <div className="vm-form-field">
                <label>Company Name</label>
                <input
                  className="vm-input"
                  value={visitorForm.companyName}
                  onChange={(e) => setVisitorForm((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Enter company name"
                />
              </div>
              <div className="vm-form-field">
                <label>ID Proof</label>
                <select
                  className="vm-select"
                  value={visitorForm.idProofType}
                  onChange={(e) => setVisitorForm((p) => ({ ...p, idProofType: e.target.value }))}
                >
                  <option value="">Select ID proof</option>
                  {ID_PROOF_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vm-form-field">
                <label>ID Proof Number</label>
                <input
                  className="vm-input"
                  value={visitorForm.idProofNumber}
                  onChange={(e) => setVisitorForm((p) => ({ ...p, idProofNumber: e.target.value }))}
                  placeholder="Enter ID number"
                />
              </div>

            </div>
          ) : null}

          {step === 2 ? (
            <>
              {hostLoadError ? <div className="vm-inline-error">{hostLoadError}</div> : null}
              <div className="vm-form-grid">
                <div className="vm-form-field">
                  <label>Host</label>
                  <select
                    className="vm-select"
                    value={approvalForm.hostUserId}
                    onChange={(e) => setApprovalForm((p) => ({ ...p, hostUserId: e.target.value }))}
                  >
                    <option value="">Select host</option>
                    {hosts.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="vm-form-field">
                  <label>Visit Date &amp; Time</label>
                  <input
                    className="vm-input"
                    type="datetime-local"
                    value={approvalForm.visitAtLocal}
                    onChange={(e) => setApprovalForm((p) => ({ ...p, visitAtLocal: e.target.value }))}
                  />
                </div>
                <div className="vm-form-field">
                  <label>Visit Category (optional)</label>
                  <select
                    className="vm-input"
                    value={approvalForm.visitCategory}
                    onChange={(e) => setApprovalForm((p) => ({ ...p, visitCategory: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => {
                      const paid = paymentsEnabled && Number(c.fees) > 0
                      return (
                        <option key={c.id} value={c.title}>
                          {c.title}{paid ? ` — ₹${c.fees}` : ''}
                        </option>
                      )
                    })}
                  </select>
                  {selectedFee > 0 ? (
                    <div style={{ marginTop: 6, fontSize: 13, color: '#b45309', fontWeight: 600 }}>
                      💳 Paid category — ₹{selectedFee} will be collected via Razorpay when you submit.
                    </div>
                  ) : null}
                </div>
                <div className="vm-form-field">
                  <label>Purpose (optional)</label>
                  <input
                    className="vm-input"
                    value={approvalForm.purpose}
                    onChange={(e) => setApprovalForm((p) => ({ ...p, purpose: e.target.value }))}
                    placeholder="Meeting, Delivery, etc."
                  />
                </div>

                {((matchedVisitor?.organizationType || visitorForm.organizationType || '').toString() === 'Factory') ? (
                  <>
                    <div className="vm-form-field">
                      <label>Factory Visit Purpose</label>
                      <input
                        className="vm-input"
                        value={factoryForm.factoryPurpose}
                        onChange={(e) => setFactoryForm((p) => ({ ...p, factoryPurpose: e.target.value }))}
                        placeholder="e.g. Maintenance, Inspection"
                      />
                    </div>
                    <div className="vm-form-field">
                      <label>Area Visiting</label>
                      <input
                        className="vm-input"
                        value={factoryForm.factoryAreaVisiting}
                        onChange={(e) => setFactoryForm((p) => ({ ...p, factoryAreaVisiting: e.target.value }))}
                        placeholder="e.g. Production Floor, Warehouse"
                      />
                    </div>
                    <div className="vm-form-field">
                      <label>Supervisor Name</label>
                      <input
                        className="vm-input"
                        value={factoryForm.factorySupervisorName}
                        onChange={(e) => setFactoryForm((p) => ({ ...p, factorySupervisorName: e.target.value }))}
                        placeholder="Enter supervisor name"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div className="vm-form-field vm-form-checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={factoryForm.factorySafetyGearRequired}
                            onChange={(e) => setFactoryForm((p) => ({ ...p, factorySafetyGearRequired: e.target.checked }))}
                          />
                          Safety Gear Required
                        </label>
                      </div>
                      <div className="vm-form-field vm-form-checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={factoryForm.factoryMaterialCarrying}
                            onChange={(e) => setFactoryForm((p) => ({ ...p, factoryMaterialCarrying: e.target.checked }))}
                          />
                          Carrying Material
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
              {submitError ? <div className="vm-inline-error">{submitError}</div> : null}
              {submitSuccess ? <div className="vm-inline-success">{submitSuccess}</div> : null}
            </>
          ) : null}
        </div>

        <div className="vm-wizard-footer">
          <button type="button" className="vm-btn vm-btn-light" onClick={handleBack} disabled={step === 0 || submitting}>
            Back
          </button>
          <div className="vm-wizard-footer-right">
            {step < 2 ? (
              <button
                type="button"
                className="vm-btn vm-btn-orange"
                onClick={handleNext}
                disabled={step === 0 ? !canGoNextFromFace : false}
              >
                Next
              </button>
            ) : (
              <button type="button" className="vm-btn vm-btn-orange" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Processing…' : selectedFee > 0 ? `Pay ₹${selectedFee} & Send For Approval` : 'Send For Approval'}
              </button>
            )}
          </div>
        </div>
      </div>
      </section>
    </DashboardShell>
  )
}

export default CreateVisitorWizardPage
