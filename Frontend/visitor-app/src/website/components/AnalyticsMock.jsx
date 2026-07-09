function AnalyticsMock() {
  return (
    <div className="website-analytics-grid">
      <article className="website-analytics-card website-analytics-card-large">
        <div className="website-card-head">
          <div>
            <p className="website-card-label">Zone-wise visitors</p>
            <h3>Live traffic by zone</h3>
          </div>
          <span className="website-status-pill">Updated 2 min ago</span>
        </div>
        <div className="website-zone-bars">
          <div>
            <span>Main Gate</span>
            <strong>78</strong>
            <div className="website-bar"><i style={{ width: '82%' }} /></div>
          </div>
          <div>
            <span>Production Block</span>
            <strong>56</strong>
            <div className="website-bar"><i style={{ width: '64%' }} /></div>
          </div>
          <div>
            <span>Safety Briefing</span>
            <strong>24</strong>
            <div className="website-bar"><i style={{ width: '34%' }} /></div>
          </div>
        </div>
      </article>

      <article className="website-analytics-card">
        <div className="website-card-head">
          <div>
            <p className="website-card-label">Peak hours</p>
            <h3>Entry pulse</h3>
          </div>
        </div>
        <div className="website-peak-chart" aria-hidden="true">
          <span style={{ height: '35%' }} />
          <span style={{ height: '68%' }} />
          <span style={{ height: '86%' }} />
          <span style={{ height: '58%' }} />
          <span style={{ height: '73%' }} />
          <span style={{ height: '42%' }} />
          <span style={{ height: '64%' }} />
        </div>
        <p className="website-card-note">Peak check-ins happen between 9:00 AM and 11:00 AM.</p>
      </article>

      <article className="website-analytics-card">
        <div className="website-card-head">
          <div>
            <p className="website-card-label">Safety insights</p>
            <h3>Risk posture</h3>
          </div>
        </div>
        <ul className="website-safety-list">
          <li><span className="website-safety-dot is-green" /> PPE verified for 93% of active visitors</li>
          <li><span className="website-safety-dot is-blue" /> 14 escorts assigned to restricted zones</li>
          <li><span className="website-safety-dot is-orange" /> 3 visitors pending induction video</li>
        </ul>
      </article>
    </div>
  )
}

export default AnalyticsMock
