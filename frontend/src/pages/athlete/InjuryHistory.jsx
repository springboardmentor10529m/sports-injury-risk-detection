import { useMemo, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import '../InjuryHistory.css'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS, ROLES } from '../../config/roles'

const injuries = [
  { id: 1, athlete: 'Arjun Kumar', athleteId: 'ATH-001', sport: 'Football', injury: 'ACL Injury', date: '12 Aug 2026', severity: 'High', status: 'Under Recovery', recovery: '25 Sep 2026' },
  { id: 2, athlete: 'Rahul Das', athleteId: 'ATH-002', sport: 'Basketball', injury: 'Hamstring Strain', date: '08 Aug 2026', severity: 'Moderate', status: 'Recovering', recovery: '22 Aug 2026' },
  { id: 3, athlete: 'Aditya Singh', athleteId: 'ATH-003', sport: 'Athletics', injury: 'Ankle Sprain', date: '04 Aug 2026', severity: 'Low', status: 'Recovered', recovery: '14 Aug 2026' },
  { id: 4, athlete: 'Rohan Patel', athleteId: 'ATH-004', sport: 'Cricket', injury: 'Shoulder Strain', date: '01 Aug 2026', severity: 'Low', status: 'Recovered', recovery: '10 Aug 2026' },
  { id: 5, athlete: 'Vikram Sharma', athleteId: 'ATH-005', sport: 'Football', injury: 'Knee Injury', date: '28 Jul 2026', severity: 'Critical', status: 'Under Treatment', recovery: '30 Sep 2026' },
  { id: 6, athlete: 'Aman Verma', athleteId: 'ATH-006', sport: 'Tennis', injury: 'Lower Back Pain', date: '25 Jul 2026', severity: 'Moderate', status: 'Recovering', recovery: '20 Aug 2026' },
]

// Demo-only identity and assignment data. Backend authorization will replace this scope model.
const athleteIdentityMap = {
  'arjun kumar': 'ATH-001', 'arjun.kumar@example.com': 'ATH-001',
  'rahul das': 'ATH-002', 'rahul.das@example.com': 'ATH-002',
  'aditya singh': 'ATH-003', 'aditya.singh@example.com': 'ATH-003',
  'rohan patel': 'ATH-004', 'rohan.patel@example.com': 'ATH-004',
  'vikram sharma': 'ATH-005', 'vikram.sharma@example.com': 'ATH-005',
  'aman verma': 'ATH-006', 'aman.verma@example.com': 'ATH-006',
}

const roleScopes = {
  [ROLES.COACH]: ['ATH-001', 'ATH-002', 'ATH-003', 'ATH-004'],
  [ROLES.PHYSIOTHERAPIST]: ['ATH-001', 'ATH-002', 'ATH-003', 'ATH-005'],
  [ROLES.ADMIN]: injuries.map((item) => item.athleteId),
}

function resolveAthleteId(user) {
  const name = user?.name?.trim().toLowerCase()
  const email = user?.email?.trim().toLowerCase()
  return athleteIdentityMap[email] || athleteIdentityMap[name] || null
}

function InjuryHistory() {
  const { currentUser, userName, userRole } = useAuth()
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('All Sports')
  const [severityFilter, setSeverityFilter] = useState('All Severity')
  const isPersonalView = userRole === ROLES.ATHLETE
  const athleteId = resolveAthleteId(currentUser)
  const scopedIds = isPersonalView ? (athleteId ? [athleteId] : []) : (roleScopes[userRole] || [])
  const scopedInjuries = useMemo(() => injuries.filter((item) => scopedIds.includes(item.athleteId)), [scopedIds])

  const filteredInjuries = useMemo(() => scopedInjuries.filter((item) => {
    if (isPersonalView) return true
    const matchesSearch = item.athlete.toLowerCase().includes(search.toLowerCase()) || item.athleteId.toLowerCase().includes(search.toLowerCase()) || item.injury.toLowerCase().includes(search.toLowerCase())
    const matchesSport = sportFilter === 'All Sports' || item.sport === sportFilter
    const matchesSeverity = severityFilter === 'All Severity' || item.severity === severityFilter
    return matchesSearch && matchesSport && matchesSeverity
  }), [isPersonalView, scopedInjuries, search, sportFilter, severityFilter])

  const activeCases = scopedInjuries.filter((item) => item.status !== 'Recovered').length
  const recoveredCases = scopedInjuries.filter((item) => item.status === 'Recovered').length
  const highRiskCases = scopedInjuries.filter((item) => ['High', 'Critical'].includes(item.severity)).length
  const viewCopy = {
    [ROLES.ATHLETE]: { title: 'My Injury History', description: 'Review your injury history and recovery progress.', panel: 'My Injury Records', panelDescription: 'Your recorded injuries and recovery timeline.' },
    [ROLES.COACH]: { title: 'Team Injury Monitoring', description: 'Monitor injuries within your assigned team scope.', panel: 'Team Injury Records', panelDescription: 'Injury history for athletes assigned to your team.' },
    [ROLES.PHYSIOTHERAPIST]: { title: 'Assigned Athlete Recovery', description: 'Manage injury and recovery information for your assigned athletes.', panel: 'Assigned Injury Records', panelDescription: 'Recovery and rehabilitation information for your assigned athletes.' },
    [ROLES.ADMIN]: { title: 'Organization Injury Records', description: 'Review organization-level injury and recovery information.', panel: 'Organization Injury Records', panelDescription: 'Complete injury history across the organization.' },
  }[userRole]

  const getSeverityClass = (severity) => severity.toLowerCase()
  const getStatusClass = (status) => status === 'Recovered' ? 'recovered' : status === 'Under Treatment' ? 'treatment' : 'recovering'

  return (
    <div className="dashboard-page"><Sidebar /><main className="dashboard-main">
      <header className="dashboard-topbar"><div><p className="dashboard-breadcrumb">{isPersonalView ? 'My Health / Injury History' : 'Injury Management / History'}</p><h1>{viewCopy.title}</h1></div>
        <div className="dashboard-user"><button className="notification-button" aria-label="Notifications" type="button">♧<span></span></button><div className="user-avatar">{userName.charAt(0).toUpperCase() || 'U'}</div><div className="user-info"><strong>{userName}</strong><small>{ROLE_LABELS[userRole]}</small></div></div>
      </header>
      <div className="dashboard-content"><div className="page-heading-row"><div><h2 className="page-main-title">{viewCopy.title}</h2><p className="page-main-description">{viewCopy.description}</p></div></div>
        <div className="row g-4 mb-4"><div className="col-md-6 col-xl-3"><div className="dashboard-stat-card"><span>🔴</span><strong>{String(scopedInjuries.length).padStart(2, '0')}</strong><small>{isPersonalView ? 'My Injuries' : 'Total Injuries'}</small></div></div><div className="col-md-6 col-xl-3"><div className="dashboard-stat-card"><span>⚠️</span><strong>{String(activeCases).padStart(2, '0')}</strong><small>Active Cases</small></div></div><div className="col-md-6 col-xl-3"><div className="dashboard-stat-card"><span>✓</span><strong>{String(recoveredCases).padStart(2, '0')}</strong><small>Recovered Cases</small></div></div><div className="col-md-6 col-xl-3"><div className="dashboard-stat-card"><span>!</span><strong>{String(highRiskCases).padStart(2, '0')}</strong><small>High / Critical</small></div></div></div>
        <section className="dashboard-panel"><div className="panel-header"><div><h3>{viewCopy.panel}</h3><p>{viewCopy.panelDescription}</p></div></div>
          {!isPersonalView && <div className="injury-filters"><div className="injury-search"><span>🔍</span><input type="text" placeholder="Search athlete, ID or injury..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><select value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}><option>All Sports</option>{[...new Set(scopedInjuries.map((item) => item.sport))].map((sport) => <option key={sport}>{sport}</option>)}</select><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}><option>All Severity</option><option>Low</option><option>Moderate</option><option>High</option><option>Critical</option></select></div>}
          <div className="table-responsive"><table className="dashboard-table injury-table"><thead><tr>{!isPersonalView && <th>Athlete</th>}<th>{isPersonalView ? 'Injury Type' : 'Sport'}</th>{!isPersonalView && <th>Injury Type</th>}<th>Injury Date</th><th>Severity</th><th>Status</th><th>Recovery Date</th><th>Action</th></tr></thead><tbody>
            {filteredInjuries.length > 0 ? filteredInjuries.map((item) => <tr key={item.id}>{!isPersonalView && <td><div className="athlete-table-name"><span className="athlete-initial">{item.athlete.charAt(0)}</span><div><strong>{item.athlete}</strong><small>{item.athleteId}</small></div></div></td>}<td>{isPersonalView ? <strong>{item.injury}</strong> : item.sport}</td>{!isPersonalView && <td><strong>{item.injury}</strong></td>}<td>{item.date}</td><td><span className={`injury-severity ${getSeverityClass(item.severity)}`}>{item.severity}</span></td><td><span className={`injury-status ${getStatusClass(item.status)}`}>{item.status}</span></td><td>{item.recovery}</td><td><button className="injury-view-button" type="button">View</button></td></tr>) : <tr><td colSpan={isPersonalView ? '6' : '8'} className="text-center py-5">{isPersonalView ? 'No injury records are connected to this athlete account.' : 'No injury records found in your assigned scope.'}</td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </main></div>
  )
}

export default InjuryHistory
