import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { getVisitor, updateVisitor, updateVisitRequest } from '../api/visitor.js'
import { COUNTRIES } from '../data/countries.js'
import './VisitorDetailsModal.css'
import './EditVisitModal.css'

// Convert an ISO/Date value into the "YYYY-MM-DDTHH:mm" shape a
// <input type="datetime-local"> expects, in the browser's local time.
function toLocalInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const EMPTY = {
  name: '',
  email: '',
  phoneDialCode: '+91',
  phoneNumber: '',
  companyName: '',
}

// The parent gives this component a `key` tied to the visit id, so it remounts
// per visit and these initializers seed the visit fields from the item.
// Visitor profile fields are loaded from the server on open (the list row only
// carries a combined phone string, not the separate dial-code/number).
function EditVisitModal({ open, item, onClose, onSaved }) {
  const [visitAt, setVisitAt] = useState(() => toLocalInputValue(item?.visitAt))
  const [purpose, setPurpose] = useState(() => item?.purpose || '')
  const [visitor, setVisitor] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load the full visitor record so name/email/phone/company are editable.
  useEffect(() => {
    if (!open || !item?.visitorId) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    getVisitor(item.visitorId)
      .then((data) => {
        if (cancelled || !data) return
        setVisitor({
          name: data.name ?? '',
          email: data.email ?? '',
          phoneDialCode: data.phoneDialCode || '+91',
          phoneNumber: data.phoneNumber ?? '',
          companyName: data.companyName ?? '',
        })
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load visitor.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, item?.visitorId])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const setVisitorField = (key) => (event) => {
    const { value } = event.target
    setVisitor((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving || loading) return
    setError('')

    if (!visitor.name.trim()) {
      setError('Visitor name is required.')
      return
    }

    let visitAtIso
    if (visitAt.trim()) {
      // datetime-local has no timezone; new Date() reads it as local time and
      // toISOString() normalises to UTC, matching what the backend expects.
      const parsed = new Date(visitAt)
      if (Number.isNaN(parsed.getTime())) {
        setError('Please enter a valid visit date and time.')
        return
      }
      visitAtIso = parsed.toISOString()
    }

    setSaving(true)
    try {
      // 1. Update the visitor profile (name/email/phone/company) if we have one.
      if (item?.visitorId) {
        await updateVisitor(item.visitorId, {
          name: visitor.name.trim(),
          email: visitor.email,
          phoneDialCode: visitor.phoneDialCode,
          phoneNumber: visitor.phoneNumber,
          companyName: visitor.companyName,
        })
      }
      // 2. Update the visit itself. The details response re-reads the (now
      //    updated) visitor, so the returned row reflects all the changes.
      const updated = await updateVisitRequest(item.id, {
        ...(visitAtIso ? { visitAt: visitAtIso } : {}),
        purpose,
      })
      onSaved?.(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || loading

  return createPortal(
    <div className="vm-modal-overlay vm-details-overlay" role="presentation" onClick={onClose}>
      <div
        className="vm-details-modal vm-edit-visit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Edit visit"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="vm-details-header">
          <h3>Edit Visit</h3>
          <button type="button" className="vm-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="vm-edit-visit-body" onSubmit={handleSubmit}>
          {loading ? <p className="vm-edit-visit-subject">Loading visitor details…</p> : null}

          <div className="vm-edit-visit-section">Visitor Information</div>

          <label className="vm-edit-visit-field">
            <span>Full name</span>
            <input value={visitor.name} onChange={setVisitorField('name')} placeholder="Visitor name" />
          </label>

          <label className="vm-edit-visit-field">
            <span>Email</span>
            <input
              type="email"
              value={visitor.email}
              onChange={setVisitorField('email')}
              placeholder="visitor@example.com"
            />
          </label>

          <div className="vm-edit-visit-field">
            <span>Phone</span>
            <div className="vm-edit-visit-phone">
              <select value={visitor.phoneDialCode} onChange={setVisitorField('phoneDialCode')} aria-label="Country code">
                {COUNTRIES.map((country) => (
                  <option key={`${country.name}-${country.dialCode}`} value={country.dialCode}>
                    {country.dialCode}
                  </option>
                ))}
              </select>
              <input
                value={visitor.phoneNumber}
                onChange={setVisitorField('phoneNumber')}
                placeholder="Phone number"
                inputMode="tel"
              />
            </div>
          </div>

          <label className="vm-edit-visit-field">
            <span>Company</span>
            <input value={visitor.companyName} onChange={setVisitorField('companyName')} placeholder="Company name" />
          </label>

          <div className="vm-edit-visit-section">Visit Details</div>

          <label className="vm-edit-visit-field">
            <span>Visit date &amp; time</span>
            <input type="datetime-local" value={visitAt} onChange={(event) => setVisitAt(event.target.value)} />
          </label>

          <label className="vm-edit-visit-field">
            <span>Purpose</span>
            <textarea
              rows={2}
              value={purpose}
              placeholder="Purpose of visit"
              onChange={(event) => setPurpose(event.target.value)}
            />
          </label>

          {error ? <p className="vm-edit-visit-error">{error}</p> : null}

          <div className="vm-edit-visit-footer">
            <button type="button" className="vm-btn vm-btn-light" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="vm-btn vm-btn-orange" disabled={busy}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

export default EditVisitModal
