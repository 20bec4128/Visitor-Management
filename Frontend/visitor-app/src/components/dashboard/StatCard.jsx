const ICONS = {
  users: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3.5 20c0-3.314 2.686-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20.5 20c0-3.314-2.686-6-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  ),
  cube: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 3.5 6.5 12 11l8.5-4.5L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 6.5V17.5L12 22V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 6.5V17.5L12 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 7v6l4 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h6v6H4V4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M14 4h6v6h-6V4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 14h6v6H4v-6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M14 14h6v6h-6v-6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
}

function StatCard({ title, value, icon, tone, subtitle, delta }) {
  const deltaNumber = Number(delta)
  const showDelta = Number.isFinite(deltaNumber) && deltaNumber !== 0
  const deltaUp = deltaNumber > 0
  const deltaLabel = showDelta ? `${deltaUp ? '+' : ''}${deltaNumber}%` : ''
  return (
    <div className="vm-stat-card">
      <div className={`vm-stat-icon vm-stat-icon-${tone}`}>
        <span className="vm-stat-svg" aria-hidden="true">
          {ICONS[icon]}
        </span>
      </div>
      <div className="vm-stat-body">
        <div className="vm-stat-title">{title}</div>
        <div className="vm-stat-value">{value}</div>
        {subtitle ? <div className="vm-stat-sub">{subtitle}</div> : null}
      </div>
      {showDelta ? (
        <div className={`vm-stat-delta ${deltaUp ? 'is-up' : 'is-down'}`} aria-label={`Change ${deltaLabel}`}>
          {deltaUp ? '^' : 'v'} {deltaLabel}
        </div>
      ) : null}
    </div>
  )
}

export default StatCard
