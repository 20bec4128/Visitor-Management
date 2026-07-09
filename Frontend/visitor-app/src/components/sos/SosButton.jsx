import { useState } from 'react'
import { createPortal } from 'react-dom'

import { triggerSos } from '../../api/sos.js'
import { hasPermission } from '../../auth/authStorage.js'
import { PERMISSIONS } from '../../rbac/access.js'
import './sos.css'

/** Emergency SOS trigger. Visible to everyone with chat.use; broadcasts to all logged-in users. */
export default function SosButton() {
  const [open, setOpen] = useState(false)
  const [selectedLoc, setSelectedLoc] = useState('Reception Desk')
  const [customLoc, setCustomLoc] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  if (!hasPermission(PERMISSIONS.chatUse)) return null

  const commonLocations = [
    'Reception Desk',
    'Main Security Gate',
    'Server Room',
    'Cafeteria',
    'Conference Room A',
    'Conference Room B',
    'HR Department',
    'Manager Cabin',
    'Other'
  ]

  const submit = async () => {
    setSending(true)
    setError('')
    const finalLocation = selectedLoc === 'Other' ? customLoc.trim() : selectedLoc
    if (!finalLocation) {
      setError('Please specify your location.')
      setSending(false)
      return
    }
    try {
      await triggerSos(message.trim() || 'Emergency! Help needed.', finalLocation)
      setOpen(false)
      setMessage('')
      setCustomLoc('')
      setSelectedLoc('Reception Desk')
    } catch (e) {
      setError(e?.message || 'Could not send SOS')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button type="button" className="vm-sos-trigger" onClick={() => setOpen(true)} title="Send emergency SOS alert">
        <span className="vm-sos-trigger-dot" />
        SOS
      </button>

      {open &&
        createPortal(
          <div className="vm-sos-confirm-backdrop" onClick={() => !sending && setOpen(false)}>
            <div className="vm-sos-confirm" onClick={(e) => e.stopPropagation()}>
              <h3>Send Emergency Alert?</h3>
              <p>This immediately alarms every logged-in staff member. Use only for real emergencies.</p>
              
              <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'left' }}>
                Select Emergency Location:
              </div>
              <select
                className="vm-sos-confirm-input"
                value={selectedLoc}
                onChange={(e) => setSelectedLoc(e.target.value)}
                style={{ width: '100%', marginBottom: '10px' }}
                disabled={sending}
              >
                {commonLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              {selectedLoc === 'Other' && (
                <input
                  type="text"
                  className="vm-sos-confirm-input"
                  placeholder="Specify physical location..."
                  value={customLoc}
                  onChange={(e) => setCustomLoc(e.target.value)}
                  style={{ width: '100%', marginBottom: '10px' }}
                  disabled={sending}
                  required
                />
              )}

              <div style={{ marginTop: '10px', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#374151', textAlign: 'left' }}>
                Emergency Message / Details (Optional):
              </div>
              <textarea
                className="vm-sos-confirm-input"
                placeholder="What is happening? (e.g. fire, medical emergency, trespasser)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                disabled={sending}
              />
              
              {error && <div className="vm-sos-confirm-error">{error}</div>}
              <div className="vm-sos-confirm-actions">
                <button type="button" className="vm-sos-cancel" onClick={() => setOpen(false)} disabled={sending}>
                  Cancel
                </button>
                <button type="button" className="vm-sos-send" onClick={submit} disabled={sending}>
                  {sending ? 'Sending…' : 'Send SOS'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
