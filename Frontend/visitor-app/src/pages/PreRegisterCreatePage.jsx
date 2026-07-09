import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { listEmployeeHosts } from '../api/staff.js'
import { getPreRegisterRequest, sendPreRegisterForApproval, updatePreRegisterRequest } from '../api/visitor.js'
import { listOrganizationTypes, listVisitCategories } from '../api/config.js'
import { payWithRazorpay } from '../api/payment.js'
import usePaymentEnabled from '../hooks/usePaymentEnabled.js'
import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { COUNTRIES } from '../data/countries.js'
import './PreRegisterCreatePage.css'
import './PreRegisterCreatePage.mobile.css'

const DEFAULT_ORG_TYPES = ['Factory', 'IT Company', 'Hospital', 'School']
const ID_PROOF_TYPES = ['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'PAN']
const EMPTY_FORM = {
  visitorName: '',
  email: '',
  phoneDialCode: '+91',
  phoneNumber: '',
  companyName: '',
  idProofType: '',
  idProofNumber: '',
  hostUserId: '',
  organizationType: 'Factory',
  visitCategory: '',
  factoryPurpose: '',
  factorySafetyGearRequired: false,
  factoryAreaVisiting: '',
  factorySupervisorName: '',
  factoryMaterialCarrying: false,
  itPurpose: '',
  itEmployeeToMeet: '',
  itMeetingRoom: '',
  itLaptopCarrying: '',
  itNdaSigned: '',
  hospitalPatientName: '',
  hospitalWardRoom: '',
  hospitalRelation: '',
  hospitalVisitTimeSlot: '',
  schoolStudentName: '',
  schoolClass: '',
  schoolReason: '',
  supportingDocs: null,
}

function toOrgTypeLabel(value) {
  if (!value) return ''
  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function mapRequestToForm(data) {
  const details = data?.details ?? {}

  return {
    ...EMPTY_FORM,
    visitorName: data?.visitorName ?? '',
    email: data?.email ?? '',
    phoneDialCode: data?.phoneDialCode ?? '+91',
    phoneNumber: data?.phoneNumber ?? '',
    companyName: data?.companyName ?? '',
    idProofType: data?.idProofType ?? '',
    idProofNumber: data?.idProofNumber ?? '',
    hostUserId: data?.hostUserId ? String(data.hostUserId) : '',
    organizationType: toOrgTypeLabel(data?.organizationType),
    visitCategory: data?.visitCategory ?? '',
    factoryPurpose: details.purpose ?? '',
    factorySafetyGearRequired: details.safetyGearRequired ?? '',
    factoryAreaVisiting: details.areaVisiting ?? '',
    factorySupervisorName: details.supervisorName ?? '',
    factoryMaterialCarrying: details.materialCarrying === 'Yes' || details.materialCarrying === true,
    itPurpose: details.purpose ?? '',
    itEmployeeToMeet: details.employeeToMeet ?? '',
    itMeetingRoom: details.meetingRoom ?? '',
    itLaptopCarrying: details.laptopCarrying ?? '',
    itNdaSigned: details.ndaSigned ?? '',
    hospitalPatientName: details.patientName ?? '',
    hospitalWardRoom: details.wardRoom ?? '',
    hospitalRelation: details.relation ?? '',
    hospitalVisitTimeSlot: details.visitTimeSlot ?? '',
    schoolStudentName: details.studentName ?? '',
    schoolClass: details.studentClass ?? '',
    schoolReason: details.reason ?? '',
  }
}

function IconDetails() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconHostOrg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M8 21v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
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

function PreRegisterCreatePage() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const formRef = useRef(null)
  const isEditMode = Boolean(editId)

  const [step, setStep] = useState(0)
  const [hosts, setHosts] = useState([])
  const [orgTypes, setOrgTypes] = useState(DEFAULT_ORG_TYPES)
  const [categories, setCategories] = useState([])
  const paymentsEnabled = usePaymentEnabled()
  const [hostLoadError, setHostLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingRequest, setLoadingRequest] = useState(isEditMode)
  const [form, setForm] = useState(EMPTY_FORM)

  const progressPercent = useMemo(() => (step === 0 ? 0 : 100), [step])

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
        setHostLoadError(err instanceof Error ? err.message : 'Failed to load hosts.')
        setHosts([])
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

    listVisitCategories()
      .then((data) => {
        if (!cancelled) setCategories(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const selectedFee = useMemo(() => {
    if (!paymentsEnabled) return 0
    const cat = categories.find((c) => c.title === form.visitCategory)
    return cat ? Number(cat.fees) || 0 : 0
  }, [categories, form.visitCategory, paymentsEnabled])

  useEffect(() => {
    if (!isEditMode) {
      setLoadingRequest(false)
      return undefined
    }

    let cancelled = false
    setSubmitError('')
    setLoadingRequest(true)

    getPreRegisterRequest(editId)
      .then((data) => {
        if (cancelled) return
        setForm(mapRequestToForm(data))
      })
      .catch((err) => {
        if (cancelled) return
        setSubmitError(err instanceof Error ? err.message : 'Failed to load pre-register request.')
      })
      .finally(() => {
        if (!cancelled) setLoadingRequest(false)
      })

    return () => {
      cancelled = true
    }
  }, [editId, isEditMode])

  const setField = (key) => (e) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const setFiles = (key) => (e) => {
    const files = e.target.files ?? null
    setForm((prev) => ({ ...prev, [key]: files }))
  }

  const showFactory = form.organizationType === 'Factory'
  const showIt = form.organizationType === 'IT Company'
  const showHospital = form.organizationType === 'Hospital'
  const showSchool = form.organizationType === 'School'

  const handleBack = () => setStep((currentStep) => Math.max(0, currentStep - 1))

  const handleGoNext = () => {
    setSubmitError('')
    const ok = formRef.current ? formRef.current.reportValidity() : true
    if (ok) setStep(1)
  }

  const buildOrgDetails = () => {
    if (showFactory) {
      return {
        purpose: form.factoryPurpose,
        safetyGearRequired: form.factorySafetyGearRequired ? 'Yes' : 'No',
        areaVisiting: form.factoryAreaVisiting,
        supervisorName: form.factorySupervisorName,
        materialCarrying: form.factoryMaterialCarrying ? 'Yes' : 'No',
      }
    }
    if (showIt) {
      return {
        purpose: form.itPurpose,
        employeeToMeet: form.itEmployeeToMeet,
        meetingRoom: form.itMeetingRoom,
        laptopCarrying: form.itLaptopCarrying,
        ndaSigned: form.itNdaSigned,
      }
    }
    if (showHospital) {
      return {
        patientName: form.hospitalPatientName,
        wardRoom: form.hospitalWardRoom,
        relation: form.hospitalRelation,
        visitTimeSlot: form.hospitalVisitTimeSlot,
      }
    }
    if (showSchool) {
      return {
        studentName: form.schoolStudentName,
        studentClass: form.schoolClass,
        reason: form.schoolReason,
      }
    }
    return {}
  }

  const handleSendForApproval = async () => {
    setSubmitError('')
    if (submitting || loadingRequest) return

    const ok = formRef.current ? formRef.current.reportValidity() : true
    if (!ok) return

    const payload = {
      visitorName: form.visitorName,
      email: form.email,
      phoneDialCode: form.phoneDialCode,
      phoneNumber: form.phoneNumber,
      companyName: form.companyName,
      idProofType: form.idProofType,
      idProofNumber: form.idProofNumber,
      hostUserId: form.hostUserId ? Number(form.hostUserId) : null,
      organizationType: form.organizationType,
      visitCategory: form.visitCategory || null,
      details: buildOrgDetails(),
    }

    try {
      setSubmitting(true)

      // Collect the fee for a paid visit category before booking (create only —
      // editing an existing booking must not re-charge). Skipped gracefully if
      // online payments aren't configured.
      if (!isEditMode && selectedFee > 0) {
        const pay = await payWithRazorpay({
          amount: selectedFee,
          description: `Visit fee — ${form.visitCategory}`,
          visitorName: form.visitorName,
          visitCategory: form.visitCategory,
          prefill: {
            name: form.visitorName || '',
            email: form.email || '',
            contact: form.phoneNumber || '',
          },
        })
        if (pay && !pay.skipped && !pay.paid) {
          setSubmitError('Payment was not completed.')
          setSubmitting(false)
          return
        }
        // Link the payment to this booking.
        if (pay && pay.paid && pay.paymentId) {
          payload.paymentId = String(pay.paymentId)
        }
      }

      if (isEditMode) {
        await updatePreRegisterRequest(editId, payload)
      } else {
        await sendPreRegisterForApproval(payload)
      }
      navigate('/preregister')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'send'} pre-register request.`)
    } finally {
      setSubmitting(false)
    }
  }

  const pageTitle = isEditMode ? 'Edit Pre Register' : 'Create Pre Register'
  const submitLabel = isEditMode
    ? 'Update Pre Register'
    : selectedFee > 0
      ? `Pay ₹${selectedFee} & Send for Approval`
      : 'Send for Approval'

  return (
    <DashboardShell pageTitle={pageTitle} breadcrumbItems={['Pre Register', isEditMode ? 'Edit' : 'Create']}>
      <section className="vm-card vm-preregister-create">
        <div className="vm-card-head">
          <h2>{pageTitle}</h2>
          <button type="button" className="vm-preregister-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        <div className="vm-preregister-body">
          {loadingRequest ? <div className="vm-inline-error">Loading pre-register request...</div> : null}

          <form ref={formRef} className="user-wizard" onSubmit={(event) => event.preventDefault()}>
            <div className="wizard-progress-bar" aria-hidden="true">
              <div className="wizard-progress" style={{ transform: `scaleX(${progressPercent / 100})` }} />
            </div>

            <div className="wizard-circles-container">
              <WizardCircle active={step === 0} label="Details" icon={<IconDetails />} onClick={() => setStep(0)} />
              <WizardCircle active={step === 1} label="Host & Org" icon={<IconHostOrg />} onClick={() => setStep(1)} />
            </div>

            <div className="wizard-step-content">
              {step === 0 ? (
                <div className="vm-wizard-step">
                  <div className="vm-wizard-grid">
                    <div className="vm-field">
                      <label>Visitor Name</label>
                      <input
                        className="user-wizard-input"
                        value={form.visitorName}
                        onChange={setField('visitorName')}
                        placeholder="Enter visitor name"
                        required
                      />
                    </div>

                    <div className="vm-field">
                      <label>Email</label>
                      <input
                        className="user-wizard-input"
                        value={form.email}
                        onChange={setField('email')}
                        placeholder="Enter email"
                        type="email"
                        required
                      />
                    </div>

                    <div className="vm-field">
                      <label>Phone</label>
                      <div className="vm-phonebox" aria-label="Phone number">
                        <select
                          className="vm-phonebox-select"
                          value={form.phoneDialCode}
                          onChange={setField('phoneDialCode')}
                          aria-label="Country code"
                        >
                          {COUNTRIES.map((country) => (
                            <option key={`${country.name}-${country.dialCode}`} value={country.dialCode}>
                              {country.name} ({country.dialCode})
                            </option>
                          ))}
                        </select>
                        <div className="vm-phonebox-code-wrapper">
                          <div className="vm-phonebox-code">{form.phoneDialCode}</div>
                        </div>
                        <input
                          className="vm-phonebox-input"
                          value={form.phoneNumber}
                          onChange={setField('phoneNumber')}
                          placeholder="Phone number"
                          inputMode="tel"
                          required
                        />
                      </div>
                    </div>

                    <div className="vm-field">
                      <label>Company Name</label>
                      <input
                        className="user-wizard-input"
                        value={form.companyName}
                        onChange={setField('companyName')}
                        placeholder="Enter company name"
                        required
                      />
                    </div>
                  </div>

                  <div className="vm-wizard-grid">
                    <div className="vm-field">
                      <label>ID Proof</label>
                      <select className="user-wizard-input" value={form.idProofType} onChange={setField('idProofType')} required>
                        <option value="">Select ID proof</option>
                        {ID_PROOF_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="vm-field">
                      <label>ID Proof Number</label>
                      <input
                        className="user-wizard-input"
                        value={form.idProofNumber}
                        onChange={setField('idProofNumber')}
                        placeholder="Enter ID proof number"
                        required
                      />
                    </div>

                    <div className="vm-field">
                      <label>Proof Document</label>
                      <input className="user-wizard-input vm-file-input" type="file" multiple onChange={setFiles('supportingDocs')} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="vm-wizard-step">
                  <div className="vm-wizard-grid">
                    <div className="vm-field">
                      <label>Host</label>
                      <select className="user-wizard-input" value={form.hostUserId} onChange={setField('hostUserId')} required>
                        <option value="">Select host</option>
                        {hosts.map((host) => {
                          const roles =
                            Array.isArray(host.roles) && host.roles.length > 0 ? host.roles.map((role) => role.title).join(', ') : '-'

                          return (
                            <option key={host.id} value={String(host.id)}>
                              {host.name} ({roles})
                            </option>
                          )
                        })}
                      </select>
                      {hostLoadError ? <div className="vm-inline-error">{hostLoadError}</div> : null}
                    </div>

                    <div className="vm-field">
                      <label>Organization Type</label>
                      <select className="user-wizard-input" value={form.organizationType} onChange={setField('organizationType')} required>
                        <option value="">Select organization type</option>
                        {orgTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="vm-field">
                      <label>Visit Category (optional)</label>
                      <select className="user-wizard-input" value={form.visitCategory} onChange={setField('visitCategory')}>
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
                      {selectedFee > 0 && !isEditMode ? (
                        <div style={{ marginTop: 6, fontSize: 13, color: '#b45309', fontWeight: 600 }}>
                          💳 Paid category — ₹{selectedFee} will be collected via Razorpay when you submit.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {showFactory ? (
                    <div className="vm-org-section">
                      <div className="vm-org-title">Factory</div>
                      <div className="vm-wizard-grid">
                        <div className="vm-field">
                          <label>Purpose</label>
                          <input
                            className="user-wizard-input"
                            value={form.factoryPurpose}
                            onChange={setField('factoryPurpose')}
                            placeholder="Enter purpose"
                            required
                          />
                        </div>
                        <div className="vm-field">
                          <label>Area Visiting</label>
                          <input
                            className="user-wizard-input"
                            value={form.factoryAreaVisiting}
                            onChange={setField('factoryAreaVisiting')}
                            placeholder="Enter area visiting"
                            required
                          />
                        </div>
                        <div className="vm-field">
                          <label>Supervisor Name</label>
                          <input
                            className="user-wizard-input"
                            value={form.factorySupervisorName}
                            onChange={setField('factorySupervisorName')}
                            placeholder="Enter supervisor name"
                            required
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <div className="vm-field vm-form-checkbox">
                            <label>
                              <input
                                type="checkbox"
                                checked={form.factorySafetyGearRequired}
                                onChange={(e) => setForm((p) => ({ ...p, factorySafetyGearRequired: e.target.checked }))}
                              />
                              Safety Gear Required
                            </label>
                          </div>
                          <div className="vm-field vm-form-checkbox">
                            <label>
                              <input
                                type="checkbox"
                                checked={form.factoryMaterialCarrying}
                                onChange={(e) => setForm((p) => ({ ...p, factoryMaterialCarrying: e.target.checked }))}
                              />
                              Carrying Material
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {showIt ? (
                    <div className="vm-org-section">
                      <div className="vm-org-title">IT Company</div>
                      <div className="vm-wizard-grid">
                        <div className="vm-field">
                          <label>Purpose</label>
                          <input className="user-wizard-input" value={form.itPurpose} onChange={setField('itPurpose')} placeholder="Enter purpose" required />
                        </div>
                        <div className="vm-field">
                          <label>Employee to Meet</label>
                          <input
                            className="user-wizard-input"
                            value={form.itEmployeeToMeet}
                            onChange={setField('itEmployeeToMeet')}
                            placeholder="Enter employee to meet"
                            required
                          />
                        </div>
                        <div className="vm-field">
                          <label>Meeting Room</label>
                          <input
                            className="user-wizard-input"
                            value={form.itMeetingRoom}
                            onChange={setField('itMeetingRoom')}
                            placeholder="Enter meeting room"
                            required
                          />
                        </div>
                        <div className="vm-field">
                          <label>Laptop Carrying (Yes/No)</label>
                          <select className="user-wizard-input" value={form.itLaptopCarrying} onChange={setField('itLaptopCarrying')} required>
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div className="vm-field">
                          <label>NDA Signed (Yes/No)</label>
                          <select className="user-wizard-input" value={form.itNdaSigned} onChange={setField('itNdaSigned')} required>
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {showHospital ? (
                    <div className="vm-org-section">
                      <div className="vm-org-title">Hospital</div>
                      <div className="vm-wizard-grid">
                        <div className="vm-field">
                          <label>Patient Name</label>
                          <input
                            className="user-wizard-input"
                            value={form.hospitalPatientName}
                            onChange={setField('hospitalPatientName')}
                            placeholder="Enter patient name"
                            required
                          />
                        </div>
                        <div className="vm-field">
                          <label>Ward / Room</label>
                          <input
                            className="user-wizard-input"
                            value={form.hospitalWardRoom}
                            onChange={setField('hospitalWardRoom')}
                            placeholder="Enter ward/room"
                            required
                          />
                        </div>
                        <div className="vm-field">
                          <label>Relation</label>
                          <input
                            className="user-wizard-input"
                            value={form.hospitalRelation}
                            onChange={setField('hospitalRelation')}
                            placeholder="Enter relation"
                            required
                          />
                        </div>
                        <div className="vm-field">
                          <label>Visit Time Slot</label>
                          <input
                            className="user-wizard-input"
                            value={form.hospitalVisitTimeSlot}
                            onChange={setField('hospitalVisitTimeSlot')}
                            placeholder="e.g. 10:00 AM - 11:00 AM"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {showSchool ? (
                    <div className="vm-org-section">
                      <div className="vm-org-title">School</div>
                      <div className="vm-wizard-grid">
                        <div className="vm-field">
                          <label>Student Name</label>
                          <input
                            className="user-wizard-input"
                            value={form.schoolStudentName}
                            onChange={setField('schoolStudentName')}
                            placeholder="Enter student name"
                            required
                          />
                        </div>
                        <div className="vm-field">
                          <label>Class</label>
                          <input className="user-wizard-input" value={form.schoolClass} onChange={setField('schoolClass')} placeholder="Enter class" required />
                        </div>
                        <div className="vm-field">
                          <label>Reason (Pickup / Meeting / Event)</label>
                          <select className="user-wizard-input" value={form.schoolReason} onChange={setField('schoolReason')} required>
                            <option value="">Select</option>
                            <option value="Pickup">Pickup</option>
                            <option value="Meeting">Meeting</option>
                            <option value="Event">Event</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="wizard-nav">
              <button type="button" className="vm-btn vm-btn-light" onClick={handleBack} disabled={step === 0 || submitting || loadingRequest}>
                Back
              </button>
              <div className="wizard-nav-spacer" />
              {step === 1 ? (
                <button type="button" className="vm-btn vm-btn-orange" onClick={handleSendForApproval} disabled={submitting || loadingRequest}>
                  {submitting ? (isEditMode ? 'Updating...' : 'Sending...') : submitLabel}
                </button>
              ) : (
                <button type="button" className="vm-btn vm-btn-orange" onClick={handleGoNext} disabled={loadingRequest}>
                  Next
                </button>
              )}
            </div>

            {submitError ? <div className="vm-inline-error vm-preregister-submit-error">{submitError}</div> : null}
          </form>
        </div>
      </section>
    </DashboardShell>
  )
}

export default PreRegisterCreatePage
