import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ActionButton, DashboardShell, DataTable, EmptyState, Panel, SearchFilterBar, StatusBadge } from '../../components/DashboardUI'
import VideoUploadWorkspace from '../../components/VideoUploadWorkspace'
import { ROLES } from '../../config/roles'

const pageConfig = {
  athletes: { title: 'Athletes', breadcrumb: 'Organization / Athletes', description: 'View and manage athlete organization profiles within your administrator scope.', action: 'Add Athlete', actionTo: '/admin/athletes/add', empty: 'No organization athletes have been added yet.' },
  coaches: { title: 'Coaches', breadcrumb: 'Organization / Coaches', description: 'Invite coaches, manage membership, and review assigned athlete scope.', action: 'Invite Coach', empty: 'No coach membership records are available.' },
  physiotherapists: { title: 'Physiotherapists', breadcrumb: 'Organization / Physiotherapists', description: 'Invite physiotherapists and manage their organization assignments.', action: 'Invite Physiotherapist', empty: 'No physiotherapist membership records are available.' },
  teams: { title: 'Teams / Groups', breadcrumb: 'Organization / Teams', description: 'Create teams and coordinate athlete, coach, and physiotherapist assignments.', action: 'Create Team', empty: 'No teams or groups have been created.' },
  access: { title: 'Access & Permissions', breadcrumb: 'Organization / Access', description: 'Review organization members, roles, status, assignments, and access scope.', empty: 'No organization membership records are available.' },
  analytics: { title: 'Organization Analytics', breadcrumb: 'Organization / Analytics', description: 'Review the structure for population, assessment activity, injury trends, and team activity.', empty: 'Analytics will appear when organization records and assessments are available.' },
  reports: { title: 'Reports', breadcrumb: 'Workspace / Reports', description: 'Organize organization, team, athlete, injury, and assessment report requests.', empty: 'No report records are available to display.' },
  assessments: { title: 'Risk Assessments', breadcrumb: 'Health / Assessments', description: 'Review assessment history and assessment details. Risk outputs will be connected later.', empty: 'No assessment records are available.' },
  performance: { title: 'Performance', breadcrumb: 'Performance / Records', description: 'Track personal or assigned athlete performance records and progress history.', empty: 'No performance records are available.' },
  video: { title: 'Video Analysis & Upload', breadcrumb: 'Analysis / Video', description: 'Upload movement videos and manage recorded files for the permitted athlete scope.', empty: 'No video analysis records are available.' },
  recommendations: { title: 'Recommendations', breadcrumb: 'Care / Recommendations', description: 'Review recommendation records when they are provided by an authorized service.', empty: 'No recommendation records are available.' },
  recovery: { title: 'Recovery & Rehabilitation', breadcrumb: 'Care / Recovery', description: 'Manage recovery plans, rehabilitation activities, progress, and follow-up records.', action: 'Create Recovery Plan', empty: 'No recovery plans or follow-up records are available.' },
  management: { title: 'Injury Management', breadcrumb: 'Care / Injury Management', description: 'Review injury records, severity, treatment status, recovery status, and timelines.', empty: 'No injury records are available.' },
  injury: { title: 'Injury History', breadcrumb: 'Health / Injury History', description: 'Review injury records, status, severity, and recovery timelines within your permitted scope.', empty: 'No injury records are available.' },
  settings: { title: 'Organization Settings', breadcrumb: 'Organization / Settings', description: 'Manage organization information, status, preferences, and membership settings.', action: 'Edit Organization Settings', empty: 'Organization settings are ready for authorized configuration.' },
  athleteProfile: { title: 'Athlete Profile', breadcrumb: 'Team / Athlete Profile', description: 'Review an assigned athlete organization profile and its connected records.', empty: 'No athlete profile was found for this identifier.' },
}

function readAthletes() {
  try { const value = JSON.parse(localStorage.getItem('athletes')); return Array.isArray(value) ? value : [] } catch { return [] }
}

function WorkspacePage({ type, role = ROLES.ADMIN }) {
  const config = pageConfig[type] || pageConfig.reports
  const { id } = useParams()
  const [search, setSearch] = useState('')
  const localAthletes = type === 'athletes' ? readAthletes() : []
  const athlete = type === 'athleteProfile' ? readAthletes().find((item) => item.id === id) : null
  const rows = localAthletes.filter((athlete) => `${athlete.name} ${athlete.id} ${athlete.sport}`.toLowerCase().includes(search.toLowerCase()))
  const columns = [{ key: 'name', label: 'Athlete', render: (row) => <strong>{row.name}</strong> }, { key: 'id', label: 'ID' }, { key: 'sport', label: 'Sport' }, { key: 'status', label: 'Organization status', render: () => <StatusBadge tone="active">Active</StatusBadge> }, { key: 'action', label: 'Action', render: (row) => <ActionButton to={role === ROLES.ADMIN ? `/admin/athletes/${row.id}/edit` : `/coach/athletes/${row.id}`} secondary>View</ActionButton> }]
  const isAdminAthleteList = type === 'athletes' && role === ROLES.ADMIN

  return (
    <DashboardShell title={config.title} breadcrumb={config.breadcrumb} action={type !== 'video' && config.action && <ActionButton to={config.actionTo}>{config.action}</ActionButton>}>
      <section className="dashboard-intro">
        <h2>{config.title}</h2>
        <p>{config.description}</p>
      </section>

      {type === 'video' ? (
        <VideoUploadWorkspace />
      ) : type === 'athleteProfile' ? (
        <Panel title={athlete?.name || config.title} description={athlete ? `${athlete.id} · ${athlete.sport || 'Sport not specified'}` : undefined}>
          {athlete ? (
            <div className="profile-summary-grid">
              <div><span>Age</span><strong>{athlete.age || 'Not recorded'}</strong></div>
              <div><span>Height</span><strong>{athlete.height || 'Not recorded'}</strong></div>
              <div><span>Weight</span><strong>{athlete.weight || 'Not recorded'}</strong></div>
              <div><span>Organization status</span><StatusBadge tone="active">Active</StatusBadge></div>
            </div>
          ) : (
            <EmptyState title={config.empty} description="Only records available in the permitted organization scope can be displayed." />
          )}
        </Panel>
      ) : (
        <Panel title={type === 'access' ? 'Organization members' : type === 'analytics' ? 'Analytics workspace' : config.title} description={type === 'analytics' ? 'Risk distribution, assessment activity, injury trends, and team activity are intentionally empty until backend records are connected.' : undefined}>
          {isAdminAthleteList && (
            <SearchFilterBar placeholder="Search athletes by name, ID, or sport">
              <select aria-label="Filter athletes"><option>All statuses</option><option>Active</option><option>Inactive</option></select>
              <select aria-label="Filter sports"><option>All sports</option></select>
            </SearchFilterBar>
          )}
          {isAdminAthleteList ? (
            <DataTable columns={columns} rows={rows} emptyTitle={config.empty} emptyDescription="Use Add Athlete to create an organization athlete record." />
          ) : (
            <EmptyState title={config.empty} description="This production UI is ready for connected records. No business data has been fabricated." action={config.action && <ActionButton>{config.action}</ActionButton>} />
          )}
        </Panel>
      )}

      {(type === 'analytics' || type === 'reports' || type === 'access') && (
        <div className="dashboard-feature-grid">
          <Panel title={type === 'access' ? 'Access scope' : type === 'analytics' ? 'Activity summary' : 'Report categories'}>
            <EmptyState title="No records to summarize" description="The structure is ready for organization-level data from the backend." />
          </Panel>
          <Panel title={type === 'access' ? 'Membership controls' : type === 'analytics' ? 'Trend views' : 'Report requests'}>
            <EmptyState title="No requests or events" description="Controls will connect to authorized organization services later." />
          </Panel>
        </div>
      )}
    </DashboardShell>
  )
}

export default WorkspacePage
