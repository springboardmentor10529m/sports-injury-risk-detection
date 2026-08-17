import React, { useEffect, useMemo, useState } from 'react';

const defaultData = {
  summary: {
    total_athletes: 3,
    high_risk: 1,
    average_risk_score: 50.3,
    alert_count: 3,
  },
  athletes: [
    {
      athlete_id: 'ATH-1042',
      name: 'Aarav Sharma',
      sport: 'Cricket',
      position: 'Fast Bowler',
      risk_score: 72,
      risk_level: 'High Risk',
      movement_quality: 81,
      latest_alert: 'Knee valgus and asymmetrical landing detected',
    },
    {
      athlete_id: 'ATH-2156',
      name: 'Nia Patel',
      sport: 'Basketball',
      position: 'Guard',
      risk_score: 48,
      risk_level: 'Moderate Risk',
      movement_quality: 76,
      latest_alert: 'Landing mechanics need monitoring',
    },
    {
      athlete_id: 'ATH-3308',
      name: 'Daniel Moss',
      sport: 'Football',
      position: 'Midfielder',
      risk_score: 31,
      risk_level: 'Low Risk',
      movement_quality: 90,
      latest_alert: 'Movement quality remains stable',
    },
  ],
  alerts: [
    { title: 'High-risk landing pattern', severity: 'high', athlete: 'ATH-1042', message: 'Excessive knee valgus observed in final two jumps.' },
    { title: 'Training load warning', severity: 'medium', athlete: 'ATH-2156', message: 'Load increased 13% in the last 7 days.' },
    { title: 'Recovery reminder', severity: 'low', athlete: 'ATH-3308', message: 'Mobility follow-up scheduled for Thursday.' },
  ],
  workflow: [
    'User authentication & role access',
    'Athlete profile and training data',
    'Video ingestion and preprocessing',
    'Pose estimation and biomechanics analysis',
    'Risk scoring and corrective recommendations',
    'Coach/physio dashboards and reports',
  ],
};

const roleCards = [
  { label: 'Athlete', description: 'Risk trends, movement quality, recovery plan' },
  { label: 'Coach', description: 'Team overview, drill recommendations, alert review' },
  { label: 'Physiotherapist', description: 'Landing mechanics, rehab tracking, return-to-play checks' },
  { label: 'Sports Scientist', description: 'Biomechanics reports, workload monitoring, analysis' },
];

function App() {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend unavailable');
        }
        return response.json();
      })
      .then((payload) => {
        setData(payload);
      })
      .catch(() => {
        setData(defaultData);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const metrics = useMemo(
    () => [
      { label: 'Total athletes', value: data.summary?.total_athletes ?? 0 },
      { label: 'High risk', value: data.summary?.high_risk ?? 0 },
      { label: 'Avg risk', value: `${data.summary?.average_risk_score ?? 0} / 100` },
      { label: 'Alerts', value: data.summary?.alert_count ?? 0 },
    ],
    [data]
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SPORTS INJURY INTELLIGENCE</p>
          <h1>Sports Injury Risk Detection from Video</h1>
        </div>
        <div className="header-actions">
          <span className="status-pill">System online</span>
          <button className="primary-btn">Generate report</button>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="panel hero-panel">
          <div className="hero-copy">
            <p className="section-tag">WORKFLOW</p>
            <h2>Movement intelligence for proactive injury prevention</h2>
            <p>
              Analyze athlete video, identify biomechanical deviations, and surface
              actionable risk alerts before injury occurs.
            </p>
          </div>
          <div className="hero-stats">
            {metrics.map((metric) => (
              <div className="stat-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <p className="section-tag">CORE FLOW</p>
            <h3>Project workflow</h3>
          </div>
          <div className="workflow-list">
            {data.workflow?.map((item, idx) => (
              <div className="workflow-item" key={item}>
                <span>{idx + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <p className="section-tag">USER ROLES</p>
            <h3>Access by stakeholder</h3>
          </div>
          <div className="role-grid">
            {roleCards.map((role) => (
              <div className="role-card" key={role.label}>
                <h4>{role.label}</h4>
                <p>{role.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-header">
            <p className="section-tag">ATHLETE RISK TRACKER</p>
            <h3>Movement risk overview</h3>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Athlete</th>
                  <th>Sport</th>
                  <th>Position</th>
                  <th>Risk</th>
                  <th>Movement quality</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.athletes?.map((athlete) => (
                  <tr key={athlete.athlete_id}>
                    <td>
                      <div className="athlete-cell">
                        <strong>{athlete.name}</strong>
                        <span>{athlete.athlete_id}</span>
                      </div>
                    </td>
                    <td>{athlete.sport}</td>
                    <td>{athlete.position}</td>
                    <td>
                      <span className={`risk-badge ${athlete.risk_level.toLowerCase().replace(/\s+/g, '-')}`}>
                        {athlete.risk_level}
                      </span>
                    </td>
                    <td>{athlete.movement_quality}/100</td>
                    <td>{athlete.latest_alert}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <p className="section-tag">ALERTS</p>
            <h3>Priority notifications</h3>
          </div>
          <div className="alert-stack">
            {data.alerts?.map((alert) => (
              <div className={`alert-item ${alert.severity}`} key={`${alert.athlete}-${alert.title}`}>
                <div className="alert-meta">
                  <span>{alert.athlete}</span>
                  <em>{alert.severity}</em>
                </div>
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <p className="section-tag">VIDEO ANALYSIS</p>
            <h3>Assessment pipeline</h3>
          </div>
          <div className="analysis-list">
            <div>
              <span>Pose extraction</span>
              <div className="progress"><i style={{ width: '88%' }} /></div>
            </div>
            <div>
              <span>Landing mechanics</span>
              <div className="progress"><i style={{ width: '72%' }} /></div>
            </div>
            <div>
              <span>Symmetry analysis</span>
              <div className="progress"><i style={{ width: '81%' }} /></div>
            </div>
            <div>
              <span>Risk scoring</span>
              <div className="progress"><i style={{ width: '67%' }} /></div>
            </div>
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-header">
            <p className="section-tag">DATA MODEL</p>
            <h3>InfluxDB time-series schema</h3>
          </div>
          <div className="schema-box">
            <div className="schema-row">
              <span className="chip">Measurement</span>
              <strong>movement_metrics</strong>
            </div>
            <div className="schema-row">
              <span className="chip">Tags</span>
              <strong>athlete_id, sport, risk_level, side, session_id</strong>
            </div>
            <div className="schema-row">
              <span className="chip">Fields</span>
              <strong>risk_score, movement_quality, knee_valgus, hip_stability, trunk_lean, fatigue_index, training_load, stride_length, landing_mechanics, cadence, symmetry_index</strong>
            </div>
            <div className="schema-row">
              <span className="chip">Purpose</span>
              <strong>Track real-time movement health and biomechanical trends.</strong>
            </div>
          </div>
        </section>
      </main>

      {loading && <div className="loading-indicator">Loading dashboard...</div>}
    </div>
  );
}

export default App;
