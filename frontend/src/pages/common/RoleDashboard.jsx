import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../config/roles'
import { ActionButton, ChartPanel, DashboardShell, EmptyState, Panel, StatCard } from '../../components/DashboardUI'

const dashboardCopy = {
  [ROLES.ATHLETE]: { title: 'Athlete Dashboard', heading: 'Your performance overview', description: 'Review your personal performance, recovery, assessment history, and recent activity.' },
  [ROLES.COACH]: { title: 'Coach Dashboard', heading: 'Assigned team performance', description: 'Monitor performance and activity for athletes assigned to your organization scope.' },
  [ROLES.PHYSIOTHERAPIST]: { title: 'Physiotherapist Dashboard', heading: 'Assigned recovery overview', description: 'Track recovery and rehabilitation activity for athletes assigned to your clinical scope.' },
  [ROLES.ADMIN]: { title: 'Admin Dashboard', heading: 'Organization analytics', description: 'Review organization-level performance, activity, and recovery structures.' },
}

const chartSets = {
  [ROLES.ATHLETE]: [['My Performance Trend', 'Your performance history will appear here when records are available.'], ['My Progress', 'Personal progress tracking will be connected to performance records.'], ['My Recovery Overview', 'Your recovery overview will appear when injury and recovery records exist.']],
  [ROLES.COACH]: [['Team Performance Trend', 'Assigned team performance history will appear when records are available.'], ['Athlete Performance Comparison', 'Comparison views will use only assigned organization athletes.'], ['Athlete Progress', 'Assigned athlete progress will appear when performance records exist.']],
  [ROLES.PHYSIOTHERAPIST]: [['Recovery Progress', 'Assigned athlete recovery progress will appear when clinical records exist.'], ['Rehabilitation Trend', 'Rehabilitation activity trends will be connected to authorized records.'], ['Active Injury Overview', 'Active injury information will appear when assigned cases exist.']],
  [ROLES.ADMIN]: [['Organization Performance Trend', 'Organization performance history will appear when backend records are available.'], ['Athlete Performance Overview', 'Organization athlete performance will be summarized without invented results.'], ['Team Comparison', 'Team comparisons will appear after team performance records are connected.'], ['Injury / Recovery Overview', 'Injury and recovery summaries will remain empty until authorized records exist.']],
}

function RoleDashboard() {
  const { currentUser, userRole } = useAuth()
  const copy = dashboardCopy[userRole]
  const stats = userRole === ROLES.ADMIN
    ? [['Athletes', '0', 'Organization records', '♟', 'blue'], ['Teams', '0', 'Configured groups', '◫', 'cyan'], ['Assessments', '0', 'Organization activity', '◎', 'green'], ['Active members', '0', 'Membership records', '✓', 'orange']]
    : userRole === ROLES.ATHLETE
      ? [['Performance records', '0', 'Your history', '↗', 'blue'], ['Assessments', '0', 'Your assessments', '◎', 'cyan'], ['Injury records', '0', 'Your records', '♥', 'orange'], ['Recent activity', '0', 'Your activity', '✓', 'green']]
      : userRole === ROLES.COACH
        ? [['Assigned athletes', '0', 'Assigned scope', '♟', 'blue'], ['Assessments', '0', 'Assigned records', '◎', 'cyan'], ['Injury records', '0', 'Assigned scope', '♥', 'orange'], ['Team activity', '0', 'Recorded activity', '✓', 'green']]
        : [['Assigned athletes', '0', 'Assigned scope', '♟', 'blue'], ['Active injuries', '0', 'Assigned cases', '♥', 'orange'], ['Recovery cases', '0', 'Recovery records', '✓', 'green'], ['Clinical activity', '0', 'Recorded activity', '◎', 'cyan']]

  return <DashboardShell title={copy.title} breadcrumb="Dashboard"><section className="dashboard-intro"><h2>{copy.heading}</h2><p>{copy.description}</p></section><section className="dashboard-stat-grid">{stats.map(([label, value, detail, icon, tone]) => <StatCard key={label} label={label} value={value} detail={detail} icon={icon} tone={tone} />)}</section><section className="dashboard-chart-grid">{chartSets[userRole].map(([title, description]) => <ChartPanel key={title} title={title} description={description} />)}</section><div className="dashboard-feature-grid"><Panel title={userRole === ROLES.ADMIN ? 'Organization activity' : 'Recent activity'} description="Only authorized records will appear here."><EmptyState title="No activity available yet" description="This dashboard is ready for connected activity records. No business data has been fabricated." /></Panel><Panel title="Next actions" description="Open the role-specific workspace when you need detailed records."><div className="action-list">{userRole === ROLES.ADMIN ? <><ActionButton to="/admin/overview">Open Organization Overview</ActionButton><ActionButton to="/admin/reports" secondary>Open reports</ActionButton></> : userRole === ROLES.ATHLETE ? <><ActionButton to="/athlete/profile">Review my profile</ActionButton><ActionButton to="/athlete/risk-assessments" secondary>View assessments</ActionButton></> : <><ActionButton to={userRole === ROLES.COACH ? '/coach/athletes' : '/physiotherapist/athletes'}>View assigned athletes</ActionButton><ActionButton to={userRole === ROLES.COACH ? '/coach/reports' : '/physiotherapist/reports'} secondary>Open reports</ActionButton></>}</div></Panel></div><Panel title="Scope and access" description="Your visible data is limited by the authenticated role and organization membership."><p className="scope-note">{currentUser?.organizationName ? `${currentUser.organizationName} · ${currentUser.membershipStatus || 'member'}` : 'Independent athlete account · personal records only'}</p>{userRole === ROLES.ADMIN && <Link className="text-button" to="/admin/overview">Open organization management</Link>}</Panel></DashboardShell>
}

export default RoleDashboard
