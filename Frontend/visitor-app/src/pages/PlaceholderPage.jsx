import DashboardShell from '../components/dashboard/DashboardShell.jsx'

function PlaceholderPage({ title }) {
  return (
    <DashboardShell pageTitle={title}>
      <div className="vm-panel">
        <h2 className="vm-panel-title">{title}</h2>
        <p className="vm-panel-subtitle">Page UI will be added next.</p>
      </div>
    </DashboardShell>
  )
}

export default PlaceholderPage

