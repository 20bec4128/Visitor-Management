import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import './VisitorDetailsModal.css'

function safeToDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatTime(value) {
  const date = safeToDate(value)
  if (!date) return '-'
  return date.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatStatus(value) {
  if (!value) return ''
  return String(value).toLowerCase()
}

function Field({ label, value }) {
  return (
    <div className="vm-details-field">
      <p className="vm-details-label">{label}</p>
      <p className="vm-details-value">{value}</p>
    </div>
  )
}

function VisitorDetailsModal({ open, item, onClose, primaryAction }) {
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

  const email = item?.visitorEmail || item?.email || '-'
  const phone = item?.visitorPhone || item?.phone || '-'
  const company = item?.companyName || '-'
  const purpose = item?.purpose || '-'

  const statusKey = formatStatus(item?.status)
  const statusLabel = statusKey ? statusKey.replace(/_/g, ' ') : '-'

  // Render in a portal on document.body so the fixed overlay isn't trapped inside
  // the dashboard's stacking contexts (e.g. .vm-content's fade-in animation), which
  // would let the sticky topbar paint over the modal.
  return createPortal(
    <div className="vm-modal-overlay vm-details-overlay" role="presentation" onClick={onClose}>
      <div
        className="vm-details-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Visitor details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="vm-details-header">
          <h3>Visitor Details</h3>
          <button type="button" className="vm-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="vm-details-body">
          <section className="vm-details-card">
            <h4 className="vm-details-card-title">VISITOR INFORMATION</h4>
            <Field label="FULL NAME" value={item?.visitorName || '-'} />
            <Field label="EMAIL" value={email} />
            <Field label="PHONE" value={phone} />
            <Field label="COMPANY" value={company} />
          </section>

          <section className="vm-details-card">
            <h4 className="vm-details-card-title">HOST & PURPOSE</h4>
            <Field label="HOST NAME" value={item?.hostName || '-'} />
            <Field label="VISIT CATEGORY" value={item?.visitCategory || '-'} />
            <Field label="PURPOSE" value={purpose} />
            <Field label="ENTRY TIME" value={formatTime(item?.entryTime)} />
            <Field label="EXIT TIME" value={formatTime(item?.exitTime)} />
            <div className="vm-details-field">
              <p className="vm-details-label">STATUS</p>
              <p className="vm-details-value">
                <span className={`vm-visitor-status vm-visitor-status-${statusKey}`}>
                  {statusLabel}
                </span>
              </p>
            </div>
          </section>
        </div>

        {primaryAction ? (
          <div className="vm-details-footer">
            <button
              type="button"
              className={`vm-btn ${primaryAction.className || 'vm-btn-orange'}`}
              onClick={primaryAction.onClick}
              disabled={Boolean(primaryAction.disabled)}
            >
              {primaryAction.label}
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export default VisitorDetailsModal
