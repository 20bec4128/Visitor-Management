import './RejectReasonModal.css'

function RejectReasonModal({ open, title = 'Select reason', reasons = [], onSelect, onClose, busy }) {
  if (!open) return null

  return (
    <div className="vm-modal-overlay" role="presentation" onClick={onClose}>
      <div className="vm-modal-content vm-reject-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="vm-modal-header">
          <h3>{title}</h3>
          <button type="button" className="vm-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="vm-reject-modal-body">
          {reasons.map((reason) => (
            <button
              key={reason}
              type="button"
              className="vm-reject-reason-btn"
              onClick={() => onSelect?.(reason)}
              disabled={busy}
            >
              {reason}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RejectReasonModal

