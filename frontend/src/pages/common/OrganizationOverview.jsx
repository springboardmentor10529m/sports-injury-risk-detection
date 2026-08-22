import { ActionButton, DashboardShell, EmptyState, Panel, StatCard } from '../../components/DashboardUI'

const sections = [
  ['Organization members', 'Review members, roles, membership status, assignments, and access scope.', '/admin/access-permissions'],
  ['Athletes', 'Add, edit, assign, and manage organization athlete profiles.', '/admin/athletes'],
  ['Coaches', 'Invite coaches and manage organization membership and assignments.', '/admin/coaches'],
  ['Physiotherapists', 'Invite physiotherapists and manage organization membership and assignments.', '/admin/physiotherapists'],
  ['Teams / Groups', 'Create groups and assign athletes, coaches, and physiotherapists.', '/admin/teams'],
  ['Organization settings', 'Manage organization information, preferences, and membership settings.', '/admin/organization-settings'],
]

function OrganizationOverview() {
  return <DashboardShell title="Organization Overview" breadcrumb="Organization / Overview"><section className="dashboard-intro"><h2>Organization administration</h2><p>Manage members, assignments, teams, access, and organization settings from this administrator-only workspace.</p></section><section className="dashboard-stat-grid"><StatCard label="Athletes" value="0" detail="Organization members" icon="♟" tone="blue" /><StatCard label="Coaches" value="0" detail="Organization members" icon="♙" tone="cyan" /><StatCard label="Physiotherapists" value="0" detail="Organization members" icon="⚕" tone="green" /><StatCard label="Active members" value="0" detail="Membership records" icon="✓" tone="orange" /></section><div className="dashboard-feature-grid">{sections.map(([title, description, to]) => <Panel key={title} title={title} description={description} action={<ActionButton to={to} secondary>Manage</ActionButton>}><EmptyState title="No records available" description="Organization records will appear here when they are created or connected." /></Panel>)}</div></DashboardShell>
}

export default OrganizationOverview
