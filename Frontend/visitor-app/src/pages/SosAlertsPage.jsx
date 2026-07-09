import { useEffect, useState } from 'react'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { listSosAlerts, resolveSosAlert } from '../api/sos.js'
import { hasPermission } from '../auth/authStorage.js'
import { PERMISSIONS } from '../rbac/access.js'
import '../components/sos/sos.css'

export default function SosAlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const canResolve = hasPermission(PERMISSIONS.sosResolve)

  const load = async () => {
    setLoading(true)
    try {
      const rows = await listSosAlerts()
      setAlerts(Array.isArray(rows) ? rows : [])
      setError('')
    } catch (e) {
      setError(e?.message || 'Failed to load alerts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const resolve = async (id) => {
    try {
      await resolveSosAlert(id)
      await load()
    } catch (e) {
      setError(e?.message || 'Could not resolve alert.')
    }
  }

  return (
    <DashboardShell pageTitle="SOS Alerts" breadcrumbItems={['Communication', 'SOS Alerts']}>
      <div className="vm-sos-log">
        {error && <div className="vm-sos-confirm-error">{error}</div>}
        {loading ? (
          <p>Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="vm-sos-log-empty">No SOS alerts have been raised.</p>
        ) : (
          <table className="vm-sos-log-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Raised By</th>
                <th>Role</th>
                <th>Message</th>
                <th>Location</th>
                <th>Time</th>
                <th>Resolved</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className={a.status === 'ACTIVE' ? 'vm-sos-row-active' : ''}>
                  <td>
                    <span className={`vm-sos-badge ${a.status === 'ACTIVE' ? 'active' : 'resolved'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>{a.triggeredByName || a.triggeredByUsername}</td>
                  <td>{a.role || '—'}</td>
                  <td>{a.message || '—'}</td>
                  <td>{a.location || '—'}</td>
                  <td>{a.createdAt}</td>
                  <td>
                    {a.status === 'RESOLVED'
                      ? `${a.resolvedAt || ''}${a.resolvedByUsername ? ` by ${a.resolvedByUsername}` : ''}`
                      : '—'}
                  </td>
                  <td>
                    {a.status === 'ACTIVE' && canResolve ? (
                      <button type="button" className="vm-sos-resolve" onClick={() => resolve(a.id)}>
                        Resolve
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  )
}
