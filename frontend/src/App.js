import React, { useEffect, useMemo, useState } from 'react';

const demoUsers = [
  { email: 'athlete@sportslab.ai', password: 'password123', role: 'athlete', label: 'Athlete' },
  { email: 'coach@sportslab.ai', password: 'password123', role: 'coach', label: 'Coach' },
  { email: 'physio@sportslab.ai', password: 'password123', role: 'physiotherapist', label: 'Physiotherapist' },
  { email: 'scientist@sportslab.ai', password: 'password123', role: 'scientist', label: 'Sports Scientist' },
  { email: 'admin@sportslab.ai', password: 'password123', role: 'admin', label: 'Administrator' },
];

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

const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:8000';
  }
  return '';
};

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${getApiBase()}${path}`, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(payload.detail || payload.message || 'Request failed');
  }

  return payload;
};

const roleSidebar = {
  athlete: ['Dashboard', 'My Profile', 'Upload Video', 'Movement Analysis', 'Injury Risk', 'Performance', 'Training Load', 'Injury History', 'Recommendations', 'Reports', 'Notifications', 'Settings'],
  coach: ['Dashboard', 'My Team', 'Athletes', 'Risk Overview', 'Performance Analytics', 'Movement Analysis', 'Training Load', 'Training Recommendations', 'Injury Monitoring', 'Reports', 'Notifications', 'Settings'],
  physiotherapist: ['Dashboard', 'Athletes', 'Injury Assessment', 'Biomechanical Analysis', 'Rehabilitation', 'Movement Correction', 'Recovery Tracking', 'Exercises', 'Return-to-Sport', 'Reports', 'Notifications', 'Settings'],
  scientist: ['Dashboard', 'Athletes', 'Biomechanical Analytics', 'Motion Analysis', 'Injury Analytics', 'Performance Analytics', 'Comparative Analysis', 'Research Data', 'Datasets', 'Reports', 'Export Data', 'Settings'],
  admin: ['Dashboard', 'User Management', 'Role Management', 'Athletes', 'Coaches', 'Physiotherapists', 'Sports Scientists', 'Platform Analytics', 'System Monitoring', 'Security', 'Reports', 'System Configuration', 'Audit Logs', 'Settings'],
};

const athleteRiskBreakdown = [
  { label: 'ACL Risk', value: '18%' },
  { label: 'Hamstring Risk', value: '24%' },
  { label: 'Ankle Risk', value: '12%' },
  { label: 'Shoulder Risk', value: '8%' },
  { label: 'Lower Back Risk', value: '15%' },
  { label: 'Overuse Injury Risk', value: '20%' },
];

const athleteMovementMetrics = [
  { label: 'Knee Valgus', value: '16°' },
  { label: 'Hip Stability', value: '88%' },
  { label: 'Trunk Lean', value: '8°' },
  { label: 'Landing Mechanics', value: '82%' },
  { label: 'Joint Alignment', value: '86%' },
  { label: 'Balance', value: '91%' },
  { label: 'Stride Length', value: '1.42 m' },
  { label: 'Left/Right Symmetry', value: '94%' },
];

const athleteRecommendations = [
  'Progressive landing mechanics drills',
  'Mobility work for hip and hamstring flexibility',
  'Single-leg strength and balance progression',
  'Reduce sprint volume by 10% this week',
  'Daily recovery and sleep monitor',
];

const athleteInjuryHistory = [
  { injury: 'Hamstring strain', date: '2026-06-11', bodyPart: 'Hamstring', severity: 'Moderate', status: 'Recovery' },
  { injury: 'Ankle discomfort', date: '2026-04-20', bodyPart: 'Ankle', severity: 'Mild', status: 'Resolved' },
  { injury: 'Lower back tightness', date: '2026-02-14', bodyPart: 'Lower back', severity: 'Moderate', status: 'Monitoring' },
];

const teamRiskRows = [
  { athlete: 'Athlete 01', risk: 'High', movement: '62%', fatigue: 'High', load: '92%' },
  { athlete: 'Athlete 02', risk: 'Moderate', movement: '78%', fatigue: 'Medium', load: '76%' },
  { athlete: 'Athlete 03', risk: 'Low', movement: '91%', fatigue: 'Low', load: '65%' },
  { athlete: 'Athlete 04', risk: 'Moderate', movement: '73%', fatigue: 'Medium', load: '81%' },
];

const coachPerformance = [
  { label: 'Sprint Performance', value: '+6.3%' },
  { label: 'Jump Performance', value: '+4.1%' },
  { label: 'Running Efficiency', value: '89%' },
  { label: 'Movement Efficiency', value: '84%' },
];

const rehabAthletes = [
  { name: 'John', injury: 'ACL', recovery: '68%', phase: 'Mobility + Strength', status: 'In progress' },
  { name: 'Sara', injury: 'Ankle Sprain', recovery: '74%', phase: 'Functional Training', status: 'Progressing' },
  { name: 'Mason', injury: 'Hamstring', recovery: '82%', phase: 'Return to Sport', status: 'Assessment' },
];

const correctiveExercises = [
  { name: 'Single-Leg Squat', target: 'Knee / Hip', sets: '3', reps: '8', frequency: '4x/week', difficulty: 'Moderate' },
  { name: 'Nordic Hamstring Curl', target: 'Hamstring', sets: '3', reps: '6', frequency: '3x/week', difficulty: 'High' },
  { name: 'Ankle Mobility Drill', target: 'Ankle', sets: '2', reps: '10', frequency: 'Daily', difficulty: 'Low' },
];

const scientistAnalytics = [
  { label: 'Average Injury Risk', value: '41%' },
  { label: 'Average Movement Score', value: '84%' },
  { label: 'Team Performance Score', value: '88%' },
  { label: 'Research Analyses', value: '12' },
];

const adminUsers = [
  { user: 'Aarav Sharma', role: 'Athlete', status: 'Active', lastLogin: '2026-08-16', actions: 'View / Edit' },
  { user: 'Priya Nair', role: 'Coach', status: 'Active', lastLogin: '2026-08-17', actions: 'View / Edit' },
  { user: 'Mark Lee', role: 'Physiotherapist', status: 'Active', lastLogin: '2026-08-15', actions: 'View / Edit' },
  { user: 'Zoya Khan', role: 'Sports Scientist', status: 'Inactive', lastLogin: '2026-08-10', actions: 'Activate / Edit' },
];

const adminSystemHealth = [
  { label: 'API Status', value: 'Healthy' },
  { label: 'Database Status', value: 'Connected' },
  { label: 'AI Service', value: 'Operational' },
  { label: 'Storage Usage', value: '68%' },
  { label: 'CPU Load', value: '32%' },
  { label: 'Memory', value: '41%' },
];

const renderRoleWidget = (role) => {
  switch (role) {
    case 'athlete':
      return (
        <>
          <div className="widget-grid">
            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Injury Risk</p>
                <h3>Current Risk</h3>
              </div>
              <div className="risk-banner high">High Risk</div>
              <div className="metric-grid">
                {athleteRiskBreakdown.map((item) => (
                  <div className="mini-box" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Latest Video Analysis</p>
                <h3>Video Review</h3>
              </div>
              <div className="video-summary">
                <button className="upload-button">Upload New Video</button>
                <div className="video-metadata">
                  <span>Last Analysis Date</span>
                  <strong>2026-08-15</strong>
                </div>
                <div className="video-metadata">
                  <span>Activity analyzed</span>
                  <strong>Jumping + Landing</strong>
                </div>
                <div className="video-metadata">
                  <span>Detected anomalies</span>
                  <strong>Asymmetrical landing, knee valgus</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="widget-grid">
            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Movement Analysis</p>
                <h3>Biomechanical metrics</h3>
              </div>
              <div className="metric-grid">
                {athleteMovementMetrics.map((item) => (
                  <div className="mini-box" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Training & Performance</p>
                <h3>Performance trend</h3>
              </div>
              <div className="train-grid">
                <div><span>Weekly training load</span><strong>74%</strong></div>
                <div><span>Training intensity</span><strong>Moderate</strong></div>
                <div><span>Fatigue trend</span><strong>Rising</strong></div>
                <div><span>Recovery status</span><strong>82%</strong></div>
              </div>
            </div>
          </div>

          <div className="widget-grid">
            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Recommendations</p>
                <h3>Action plan</h3>
              </div>
              <ul className="list-box">
                {athleteRecommendations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Injury History</p>
                <h3>Previous records</h3>
              </div>
              <div className="history-list">
                {athleteInjuryHistory.map((entry) => (
                  <div className="history-row" key={`${entry.injury}-${entry.date}`}>
                    <strong>{entry.injury}</strong>
                    <span>{entry.date}</span>
                    <em>{entry.bodyPart}</em>
                    <i>{entry.severity}</i>
                    <b>{entry.status}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      );

    case 'coach':
      return (
        <>
          <div className="widget-grid">
            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Team Risk Overview</p>
                <h3>Squad assessment</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Athlete</th>
                      <th>Risk</th>
                      <th>Movement</th>
                      <th>Fatigue</th>
                      <th>Load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRiskRows.map((row) => (
                      <tr key={row.athlete}>
                        <td>{row.athlete}</td>
                        <td><span className={`risk-badge ${row.risk.toLowerCase() === 'high' ? 'high-risk' : row.risk.toLowerCase() === 'moderate' ? 'moderate-risk' : 'low-risk'}`}>{row.risk}</span></td>
                        <td>{row.movement}</td>
                        <td>{row.fatigue}</td>
                        <td>{row.load}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">High-Risk Athletes</p>
                <h3>Priority actions</h3>
              </div>
              <div className="high-risk-stack">
                <div className="alert-item high">
                  <strong>Athlete 01</strong>
                  <p>Risk category: High | Primary factor: Landing asymmetry</p>
                  <small>Action: modify drills and reduce speed volume</small>
                </div>
                <div className="alert-item medium">
                  <strong>Athlete 04</strong>
                  <p>Risk category: Moderate | Primary factor: workload spike</p>
                  <small>Action: brief recovery block and monitor fatigue</small>
                </div>
              </div>
            </div>
          </div>

          <div className="widget-grid">
            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Performance Analytics</p>
                <h3>Team trends</h3>
              </div>
              <div className="metric-grid">
                {coachPerformance.map((item) => (
                  <div className="mini-box" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Training Recommendations</p>
                <h3>Coaching actions</h3>
              </div>
              <ul className="list-box">
                <li>Reduce training intensity for athletes with rising fatigue.</li>
                <li>Modify jump and landing sessions for risk-prone players.</li>
                <li>Increase recovery between explosive drills.</li>
                <li>Prioritize individualized technique corrections.</li>
              </ul>
            </div>
          </div>
        </>
      );

    case 'physiotherapist':
      return (
        <>
          <div className="widget-grid">
            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Injury Risk Monitoring</p>
                <h3>Rehab overview</h3>
              </div>
              <div className="metric-grid">
                <div className="mini-box"><span>Athletes under rehab</span><strong>3</strong></div>
                <div className="mini-box"><span>High injury risk</span><strong>2</strong></div>
                <div className="mini-box"><span>Active injuries</span><strong>4</strong></div>
                <div className="mini-box"><span>Recovery progress</span><strong>74%</strong></div>
              </div>
            </div>

            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Biomechanical Assessment</p>
                <h3>Detailed metrics</h3>
              </div>
              <div className="metric-grid">
                <div className="mini-box"><span>Knee Valgus</span><strong>16°</strong></div>
                <div className="mini-box"><span>Hip ROM</span><strong>88°</strong></div>
                <div className="mini-box"><span>Knee ROM</span><strong>92°</strong></div>
                <div className="mini-box"><span>Trunk Lean</span><strong>8°</strong></div>
                <div className="mini-box"><span>Landing Mechanics</span><strong>82%</strong></div>
                <div className="mini-box"><span>Balance</span><strong>91%</strong></div>
              </div>
            </div>
          </div>

          <div className="widget-card full-width">
            <div className="card-header">
              <p className="section-tag">Rehabilitation Tracking</p>
              <h3>Recovery progress</h3>
            </div>
            <div className="rehab-list">
              {rehabAthletes.map((athlete) => (
                <div className="rehab-row" key={athlete.name}>
                  <div><span>Athlete</span><strong>{athlete.name}</strong></div>
                  <div><span>Injury</span><strong>{athlete.injury}</strong></div>
                  <div><span>Recovery</span><strong>{athlete.recovery}</strong></div>
                  <div><span>Phase</span><strong>{athlete.phase}</strong></div>
                  <div><span>Status</span><b>{athlete.status}</b></div>
                </div>
              ))}
            </div>
          </div>

          <div className="widget-grid">
            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Corrective Exercise Recommendations</p>
                <h3>Exercise plan</h3>
              </div>
              <div className="exercise-list">
                {correctiveExercises.map((exercise) => (
                  <div className="exercise-row" key={exercise.name}>
                    <strong>{exercise.name}</strong>
                    <span>{exercise.target}</span>
                    <small>{exercise.sets} sets × {exercise.reps} reps</small>
                    <em>{exercise.frequency}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Return-to-Sport Assessment</p>
                <h3>Readiness score</h3>
              </div>
              <div className="train-grid">
                <div><span>Movement quality</span><strong>85%</strong></div>
                <div><span>Strength</span><strong>80%</strong></div>
                <div><span>Balance</span><strong>91%</strong></div>
                <div><span>Readiness</span><strong>72%</strong></div>
              </div>
            </div>
          </div>
        </>
      );

    case 'scientist':
      return (
        <>
          <div className="widget-grid">
            {scientistAnalytics.map((item) => (
              <div className="mini-box large" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="widget-grid">
            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Biomechanical Analytics</p>
                <h3>Movement patterns</h3>
              </div>
              <div className="graph-bars">
                <div><label>Joint angles</label><i style={{ width: '86%' }} /></div>
                <div><label>Landing mechanics</label><i style={{ width: '79%' }} /></div>
                <div><label>Movement symmetry</label><i style={{ width: '88%' }} /></div>
                <div><label>Balance</label><i style={{ width: '92%' }} /></div>
              </div>
            </div>

            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">Movement Pattern Analysis</p>
                <h3>Comparison</h3>
              </div>
              <ul className="list-box">
                <li>Normal movement pattern: 72%</li>
                <li>Abnormal variation: 18%</li>
                <li>Movement consistency: 86%</li>
                <li>Technique variation: moderate</li>
              </ul>
            </div>
          </div>

          <div className="widget-card full-width">
            <div className="card-header">
              <p className="section-tag">Comparative Analysis</p>
              <h3>Research comparisons</h3>
            </div>
            <div className="comparison-list">
              <span>Athlete vs Athlete</span>
              <span>Athlete vs Team Average</span>
              <span>Position vs Position</span>
              <span>Before vs After</span>
              <span>Session vs Session</span>
            </div>
          </div>
        </>
      );

    case 'admin':
      return (
        <>
          <div className="widget-grid">
            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">User Management</p>
                <h3>Platform users</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((row) => (
                      <tr key={row.user}>
                        <td>{row.user}</td>
                        <td>{row.role}</td>
                        <td>{row.status}</td>
                        <td>{row.lastLogin}</td>
                        <td>{row.actions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="widget-card">
              <div className="card-header">
                <p className="section-tag">System Monitoring</p>
                <h3>Infrastructure health</h3>
              </div>
              <div className="metric-grid">
                {adminSystemHealth.map((item) => (
                  <div className="mini-box" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="widget-card full-width">
            <div className="card-header">
              <p className="section-tag">Security Monitoring</p>
              <h3>Access and activity</h3>
            </div>
            <div className="train-grid">
              <div><span>Login attempts</span><strong>148</strong></div>
              <div><span>Failed logins</span><strong>6</strong></div>
              <div><span>Active sessions</span><strong>19</strong></div>
              <div><span>Suspicious activity</span><strong>Low</strong></div>
            </div>
          </div>
        </>
      );

    default:
      return null;
  }
};

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: 'athlete@sportslab.ai', password: 'password123' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'athlete',
    sport: 'Cricket',
    position: 'Athlete',
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sir-user') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('sir-token') || '');
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleLabel = useMemo(() => {
    const role = currentUser?.role || 'athlete';
    return role.charAt(0).toUpperCase() + role.slice(1).replace('scientist', 'Scientist').replace('physiotherapist', 'Physiotherapist');
  }, [currentUser]);

  const fetchDashboard = async (roleName = currentUser?.role) => {
    if (!roleName) return;
    setLoading(true);
    setError('');
    try {
      const payload = await apiFetch(`/api/dashboard?role=${encodeURIComponent(roleName)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(payload);
    } catch (err) {
      setError('Session expired or access denied. Please log in again.');
      setCurrentUser(null);
      setToken('');
      localStorage.removeItem('sir-user');
      localStorage.removeItem('sir-token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && token) {
      fetchDashboard(currentUser.role);
    }
  }, [currentUser, token]);

  const persistSession = (payload) => {
    localStorage.setItem('sir-token', payload.token);
    localStorage.setItem('sir-user', JSON.stringify(payload.user));
    setToken(payload.token);
    setCurrentUser(payload.user);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      persistSession(payload);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const payload = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });
      persistSession(payload);
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken('');
    setData(defaultData);
    localStorage.removeItem('sir-user');
    localStorage.removeItem('sir-token');
  };

  const metrics = useMemo(
    () => [
      { label: 'Total athletes', value: data.summary?.total_athletes ?? 0 },
      { label: 'High risk', value: data.summary?.high_risk ?? 0 },
      { label: 'Avg risk', value: `${data.summary?.average_risk_score ?? 0} / 100` },
      { label: 'Alerts', value: data.summary?.alert_count ?? 0 },
    ],
    [data]
  );

  if (!currentUser) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-branding">
            <div className="brand-mark">S</div>
            <div>
              <p className="eyebrow auth-eyebrow">SportsLab AI</p>
              <h1>Injury intelligence portal</h1>
            </div>
          </div>

          <div className="tab-switcher">
            <button
              type="button"
              className={authMode === 'login' ? 'tab active' : 'tab'}
              onClick={() => setAuthMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={authMode === 'signup' ? 'tab active' : 'tab'}
              onClick={() => setAuthMode('signup')}
            >
              Sign up
            </button>
          </div>

          {authMode === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="field-group">
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                    placeholder="name@domain.com"
                  />
                </label>

                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                    placeholder="password123"
                  />
                </label>
              </div>

              <div className="demo-grid">
                {demoUsers.map((user) => (
                  <button
                    type="button"
                    className="demo-user"
                    key={user.email}
                    onClick={() => setLoginForm({ email: user.email, password: user.password })}
                  >
                    {user.label}
                  </button>
                ))}
              </div>

              {error && <div className="error-box">{error}</div>}
              <button className="primary-btn submit-btn" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignup}>
              <div className="field-group">
                <label>
                  <span>Full name</span>
                  <input
                    type="text"
                    value={signupForm.name}
                    onChange={(event) => setSignupForm({ ...signupForm, name: event.target.value })}
                    placeholder="Alex Morgan"
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })}
                    placeholder="alex@example.com"
                  />
                </label>

                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })}
                    placeholder="At least 6 characters"
                  />
                </label>

                <div className="two-col">
                  <label>
                    <span>Role</span>
                    <select
                      value={signupForm.role}
                      onChange={(event) => setSignupForm({ ...signupForm, role: event.target.value })}
                    >
                      <option value="athlete">Athlete</option>
                      <option value="coach">Coach</option>
                      <option value="physiotherapist">Physiotherapist</option>
                      <option value="scientist">Scientist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <label>
                    <span>Sport</span>
                    <input
                      type="text"
                      value={signupForm.sport}
                      onChange={(event) => setSignupForm({ ...signupForm, sport: event.target.value })}
                      placeholder="Cricket"
                    />
                  </label>
                </div>

                <label>
                  <span>Position</span>
                  <input
                    type="text"
                    value={signupForm.position}
                    onChange={(event) => setSignupForm({ ...signupForm, position: event.target.value })}
                    placeholder="Assistant Coach"
                  />
                </label>
              </div>

              {error && <div className="error-box">{error}</div>}
              <button className="primary-btn submit-btn" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SPORTS INJURY INTELLIGENCE</p>
          <h1>Sports Injury Risk Detection from Video</h1>
        </div>
        <div className="header-actions">
          <span className="status-pill">{roleLabel} dashboard</span>
          <button className="ghost-btn" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="profile-bar">
        <div>
          <strong>{currentUser.name}</strong>
          <span>{currentUser.email}</span>
        </div>
        <div>
          <strong>{currentUser.role}</strong>
          <span>{currentUser.position}</span>
        </div>
        <div>
          <strong>Firebase ID</strong>
          <span>{currentUser.firebase_uid || 'n/a'}</span>
        </div>
      </div>

      <div className="layout-shell">
        <aside className="sidebar">
          <div className="sidebar-title">Navigation</div>
          {roleSidebar[currentUser.role]?.map((item) => (
            <button className="sidebar-btn" type="button" key={item}>{item}</button>
          ))}
        </aside>

        <main className="dashboard-main">
          <section className="panel hero-panel">
            <div className="hero-copy">
              <p className="section-tag">WORKFLOW</p>
              <h2>{data.role_summary?.heading || 'Movement intelligence dashboard'}</h2>
              <p>{data.role_summary?.focus || 'Proactive injury prevention through athlete movement analysis.'}</p>
            </div>
            <div className="hero-stats">
              {data.role_summary?.metrics?.map((metric) => (
                <div className="stat-card" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              )) || metrics.map((metric) => (
                <div className="stat-card" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </section>

          {renderRoleWidget(currentUser.role)}
        </main>
      </div>

      {loading && <div className="loading-indicator">Loading dashboard...</div>}
    </div>
  );
}

export default App;
