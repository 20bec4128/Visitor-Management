import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { getPreRegisterQr } from '../api/visitor.js'

const overlay = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const dialog = {
  background: '#ffffff',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '500px',
  width: '90%',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  maxHeight: '85vh',
  overflowY: 'auto',
}

const labelStyle = { margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }
const boxStyle = { backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '12px', border: '1px solid rgba(148, 163, 184, 0.25)' }
const codeStyle = { flex: 1, fontSize: '13px', color: '#0f172a', wordBreak: 'break-all', fontFamily: 'monospace' }

/**
 * Shows an approved booking's entry token, check-in URL, and QR code (the same QR the
 * visitor receives by email). The QR is fetched from the backend on open.
 */
function ApprovalTokenModal({ item, onClose }) {
  const [qr, setQr] = useState('')
  const [qrError, setQrError] = useState('')

  const token = item?.approvalToken || ''
  const checkInUrl = token ? `${import.meta.env.VITE_FRONTEND_URL || window.location.origin}/pre-register-entry/${token}` : ''

  useEffect(() => {
    if (!item?.id) return undefined
    let cancelled = false
    setQr('')
    setQrError('')
    getPreRegisterQr(item.id)
      .then((data) => {
        if (cancelled) return
        setQr(data?.qrCode || '')
      })
      .catch((err) => {
        if (cancelled) return
        setQrError(err instanceof Error ? err.message : 'Failed to load QR code.')
      })
    return () => {
      cancelled = true
    }
  }, [item?.id])

  if (!item) return null

  const copy = (text, label) => {
    navigator.clipboard.writeText(text)
    alert(`${label} copied to clipboard!`)
  }

  return createPortal(
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Entry Token &amp; QR Code</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={labelStyle}>Visitor Name</p>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{item.visitorName || '-'}</p>
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <p style={labelStyle}>QR Code</p>
          {qr ? (
            <img src={qr} alt="Entry QR code" style={{ width: '220px', height: '220px', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '8px' }} />
          ) : qrError ? (
            <p style={{ color: '#dc2626', fontSize: '13px' }}>⚠ {qrError}</p>
          ) : (
            <p style={{ color: '#64748b', fontSize: '13px' }}>Loading QR code…</p>
          )}
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b' }}>Show this at the gate, or scan it on the QR Scan page.</p>
        </div>

        <div style={{ marginBottom: '20px', ...boxStyle }}>
          <p style={labelStyle}>Approval Token</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <code style={codeStyle}>{token}</code>
            <button
              type="button"
              onClick={() => copy(token, 'Token')}
              style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Copy
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={labelStyle}>Check-In URL</p>
          <div style={{ ...boxStyle, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <code style={{ ...codeStyle, fontSize: '12px' }}>{checkInUrl}</code>
            <button
              type="button"
              onClick={() => copy(checkInUrl, 'Check-in URL')}
              style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Copy URL
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '6px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ApprovalTokenModal
