import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActionButton, DashboardShell, DataTable, EmptyState, Panel, SearchFilterBar, StatusBadge } from '../../components/DashboardUI'
import VideoUploadWorkspace from '../../components/VideoUploadWorkspace'
import { ROLES } from '../../config/roles'
import { authApi } from '../../services/authApi'

const pageConfig = {
  athletes: { title: 'Athletes', breadcrumb: 'Organization / Athletes', description: 'View and manage athlete organization profiles within your administrator scope.', action: 'Add Athlete', actionTo: '/admin/athletes/add', empty: 'No organization athletes have been added yet.' },
  coaches: { title: 'Coaches', breadcrumb: 'Organization / Coaches', description: 'Invite coaches, manage membership, and review assigned athlete scope.', action: 'Invite Coach', actionTo: '/admin/coaches/invite', empty: 'No coach membership records are available.' },
  physiotherapists: { title: 'Physiotherapists', breadcrumb: 'Organization / Physiotherapists', description: 'Invite physiotherapists and manage their organization assignments.', action: 'Invite Physiotherapist', actionTo: '/admin/physiotherapists/invite', empty: 'No physiotherapist membership records are available.' },
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
  athleteProfile: { title: 'Athlete Profile', breadcrumb: 'Organization / Athlete Profile', description: 'Review assigned athlete organization profile details and connected records.', empty: 'No athlete profile was found for this identifier.' },
}

function WorkspacePage({ type, role = ROLES.ADMIN }) {
  const config = pageConfig[type] || pageConfig.reports
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [search, setSearch] = useState('')
  const [dbAthletes, setDbAthletes] = useState([])
  const [dbCoaches, setDbCoaches] = useState([])
  const [dbPhysios, setDbPhysios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successBanner, setSuccessBanner] = useState('')

  const [memberToRemove, setMemberToRemove] = useState(null)
  const [removeRole, setRemoveRole] = useState('athlete')
  const [isRemoving, setIsRemoving] = useState(false)

  const isAthleteScope = type === 'athletes' || type === 'athleteProfile'
  const isCoachScope = type === 'coaches'
  const isPhysioScope = type === 'physiotherapists'

  const fetchData = useCallback(() => {
    if (isAthleteScope) {
      setLoading(true)
      setError('')
      authApi
        .getAthletes()
        .then((res) => {
          if (Array.isArray(res?.athletes)) {
            setDbAthletes(res.athletes)
          } else {
            setDbAthletes([])
          }
        })
        .catch((err) => {
          console.error('Failed to fetch organization athletes:', err)
          setError(err.message || 'Failed to fetch organization athletes.')
        })
        .finally(() => {
          setLoading(false)
        })
    } else if (isCoachScope) {
      setLoading(true)
      setError('')
      authApi
        .getCoaches()
        .then((res) => {
          if (Array.isArray(res?.coaches)) {
            setDbCoaches(res.coaches)
          } else {
            setDbCoaches([])
          }
        })
        .catch((err) => {
          console.error('Failed to fetch organization coaches:', err)
          setError(err.message || 'Failed to fetch organization coaches.')
        })
        .finally(() => {
          setLoading(false)
        })
    } else if (isPhysioScope) {
      setLoading(true)
      setError('')
      authApi
        .getPhysiotherapists()
        .then((res) => {
          if (Array.isArray(res?.physiotherapists)) {
            setDbPhysios(res.physiotherapists)
          } else {
            setDbPhysios([])
          }
        })
        .catch((err) => {
          console.error('Failed to fetch organization physiotherapists:', err)
          setError(err.message || 'Failed to fetch organization physiotherapists.')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isAthleteScope, isCoachScope, isPhysioScope])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (location.state?.message) {
      setSuccessBanner(location.state.message)
      window.history.replaceState({}, document.title)
    }
  }, [location])

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return
    const targetId = memberToRemove.id || memberToRemove.userId
    setIsRemoving(true)
    setSuccessBanner('')
    try {
      if (removeRole === 'coach') {
        await authApi.unassignCoach(targetId)
        setSuccessBanner('Coach removed from the organization successfully.')
      } else if (removeRole === 'physiotherapist') {
        await authApi.unassignPhysiotherapist(targetId)
        setSuccessBanner('Physiotherapist removed from the organization successfully.')
      } else {
        await authApi.unassignAthlete(targetId)
        setSuccessBanner('Athlete removed from the organization successfully.')
      }
      setMemberToRemove(null)
      fetchData()
      if (type === 'athleteProfile') {
        navigate('/admin/athletes', { replace: true })
      }
    } catch (err) {
      console.error(`Failed to remove ${removeRole}:`, err)
      alert(err.message || `Failed to remove ${removeRole} from organization.`)
    } finally {
      setIsRemoving(false)
    }
  }

  const athlete = type === 'athleteProfile' ? dbAthletes.find((item) => item.id === id || item.userId === id || item.athleteId === id) : null

  const rows = dbAthletes.filter((a) =>
    `${a.name} ${a.email} ${a.id} ${a.sport} ${a.organizationId} ${a.organizationMemberId} ${a.organizationName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const columns = [
    {
      key: 'name',
      label: 'Athlete Name',
      render: (row) => (
        <div>
          <strong>{row.name}</strong>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.email}</div>
        </div>
      ),
    },
    { key: 'sport', label: 'Sport', render: (row) => row.sport || 'Not specified' },
    { key: 'organizationMemberId', label: 'Member ID', render: (row) => <strong>{row.organizationMemberId || 'ORG-DEV-001'}</strong> },
    { key: 'height', label: 'Height', render: (row) => row.height || 'N/A' },
    { key: 'weight', label: 'Weight', render: (row) => row.weight || 'N/A' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge tone={row.membershipStatus === 'active' ? 'active' : 'neutral'}>
          {row.membershipStatus === 'active' ? 'Active' : row.membershipStatus || 'Independent'}
        </StatusBadge>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <ActionButton to={role === ROLES.ADMIN ? `/admin/athletes/${row.id || row.userId}` : `/coach/athletes/${row.id || row.userId}`} secondary>
          View Profile
        </ActionButton>
      ),
    },
  ]

  const coachRows = dbCoaches.filter((c) =>
    `${c.name} ${c.email} ${c.organizationMemberId || ''} ${c.organizationName || ''} ${c.phone || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const coachColumns = [
    {
      key: 'name',
      label: 'Coach Name',
      render: (row) => (
        <div>
          <strong>{row.name}</strong>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.email}</div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: (row) => row.phone || 'N/A' },
    { key: 'organizationMemberId', label: 'Member ID', render: (row) => <strong>{row.organizationMemberId || 'ORG-DEV'}</strong> },
    { key: 'organizationName', label: 'Organization', render: (row) => row.organizationName || 'Development Organization' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge tone={row.membershipStatus === 'active' ? 'active' : 'neutral'}>
          {row.membershipStatus === 'active' ? 'Active' : row.membershipStatus || 'Independent'}
        </StatusBadge>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        role === ROLES.ADMIN ? (
          <button
            type="button"
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            onClick={() => {
              setMemberToRemove(row)
              setRemoveRole('coach')
            }}
          >
            Remove
          </button>
        ) : null
      ),
    },
  ]

  const physioRows = dbPhysios.filter((p) =>
    `${p.name} ${p.email} ${p.organizationMemberId || ''} ${p.organizationName || ''} ${p.phone || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const physioColumns = [
    {
      key: 'name',
      label: 'Physiotherapist Name',
      render: (row) => (
        <div>
          <strong>{row.name}</strong>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.email}</div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: (row) => row.phone || 'N/A' },
    { key: 'organizationMemberId', label: 'Member ID', render: (row) => <strong>{row.organizationMemberId || 'ORG-DEV'}</strong> },
    { key: 'organizationName', label: 'Organization', render: (row) => row.organizationName || 'Development Organization' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge tone={row.membershipStatus === 'active' ? 'active' : 'neutral'}>
          {row.membershipStatus === 'active' ? 'Active' : row.membershipStatus || 'Independent'}
        </StatusBadge>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        role === ROLES.ADMIN ? (
          <button
            type="button"
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            onClick={() => {
              setMemberToRemove(row)
              setRemoveRole('physiotherapist')
            }}
          >
            Remove
          </button>
        ) : null
      ),
    },
  ]

  return (
    <DashboardShell title={config.title} breadcrumb={config.breadcrumb} action={type !== 'video' && type !== 'athleteProfile' && config.action && <ActionButton to={config.actionTo}>{config.action}</ActionButton>}>
      <section className="dashboard-intro">
        <h2>{type === 'athleteProfile' && athlete ? athlete.name : config.title}</h2>
        <p>{type === 'athleteProfile' && athlete ? `Member ID: ${athlete.organizationMemberId || 'ORG-DEV-001'} · ${athlete.sport || 'Sport not specified'}` : config.description}</p>
      </section>

      {successBanner && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '14px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          ✓ {successBanner}
        </div>
      )}

      {type === 'video' ? (
        <VideoUploadWorkspace />
      ) : type === 'athleteProfile' ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Link to={role === ROLES.ADMIN ? '/admin/athletes' : '/coach/athletes'} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
              ← Back to Athletes
            </Link>
          </div>

          <Panel title="Athlete Details" description="Database-backed athlete information from PostgreSQL.">
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading athlete profile...</div>
            ) : athlete ? (
              <div>
                <div className="profile-details-grid" style={{ marginBottom: '24px' }}>
                  <div>
                    <span>Full Name</span>
                    <strong>{athlete.name}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{athlete.email}</strong>
                  </div>
                  <div>
                    <span>Sport</span>
                    <strong>{athlete.sport || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span>Height</span>
                    <strong>{athlete.height || 'N/A'}</strong>
                  </div>
                  <div>
                    <span>Weight</span>
                    <strong>{athlete.weight || 'N/A'}</strong>
                  </div>
                  <div>
                    <span>Organization ID</span>
                    <strong>{athlete.organizationId || 'ORG-DEV'}</strong>
                  </div>
                  <div>
                    <span>Member ID</span>
                    <strong style={{ color: '#2563eb' }}>{athlete.organizationMemberId || 'ORG-DEV-001'}</strong>
                  </div>
                  <div>
                    <span>Membership Status</span>
                    <strong style={{ textTransform: 'capitalize', color: athlete.membershipStatus === 'active' ? '#16a34a' : '#0f2747' }}>
                      {athlete.membershipStatus || 'active'}
                    </strong>
                  </div>
                </div>

                {role === ROLES.ADMIN && (
                  <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => {
                        setMemberToRemove(athlete)
                        setRemoveRole('athlete')
                      }}
                    >
                      Remove Athlete from Organization
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState title={config.empty} description="No athlete profile was found for this identifier in your organization." />
            )}
          </Panel>
        </div>
      ) : (
        <Panel title={type === 'access' ? 'Organization members' : type === 'analytics' ? 'Analytics workspace' : config.title} description={type === 'analytics' ? 'Risk distribution, assessment activity, injury trends, and team activity are intentionally empty until backend records are connected.' : undefined}>
          {type === 'athletes' && (
            <SearchFilterBar placeholder="Search athletes by name, Member ID, or sport" value={search} onChange={(e) => setSearch(e.target.value)}>
              <select aria-label="Filter athletes"><option>All statuses</option><option>Active</option></select>
              <select aria-label="Filter sports"><option>All sports</option></select>
            </SearchFilterBar>
          )}
          {type === 'coaches' && (
            <SearchFilterBar placeholder="Search coaches by name, email, or Member ID" value={search} onChange={(e) => setSearch(e.target.value)}>
              <select aria-label="Filter status"><option>All statuses</option><option>Active</option></select>
            </SearchFilterBar>
          )}
          {type === 'physiotherapists' && (
            <SearchFilterBar placeholder="Search physiotherapists by name, email, or Member ID" value={search} onChange={(e) => setSearch(e.target.value)}>
              <select aria-label="Filter status"><option>All statuses</option><option>Active</option></select>
            </SearchFilterBar>
          )}

          {type === 'athletes' ? (
            loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading organization athletes...</div>
            ) : error ? (
              <div style={{ padding: '16px', color: '#dc2626', background: '#fef2f2', borderRadius: '8px' }}>{error}</div>
            ) : (
              <DataTable columns={columns} rows={rows} emptyTitle={config.empty} emptyDescription="Use Add Athlete to assign a registered athlete to your organization." />
            )
          ) : type === 'coaches' ? (
            loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading organization coaches...</div>
            ) : error ? (
              <div style={{ padding: '16px', color: '#dc2626', background: '#fef2f2', borderRadius: '8px' }}>{error}</div>
            ) : (
              <DataTable columns={coachColumns} rows={coachRows} emptyTitle={config.empty} emptyDescription="Click Invite Coach above to invite a coach to your organization." />
            )
          ) : type === 'physiotherapists' ? (
            loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading organization physiotherapists...</div>
            ) : error ? (
              <div style={{ padding: '16px', color: '#dc2626', background: '#fef2f2', borderRadius: '8px' }}>{error}</div>
            ) : (
              <DataTable columns={physioColumns} rows={physioRows} emptyTitle={config.empty} emptyDescription="Click Invite Physiotherapist above to invite a physiotherapist to your organization." />
            )
          ) : (
            <EmptyState title={config.empty} description="This production UI is ready for connected records. No business data has been fabricated." action={config.action && <ActionButton to={config.actionTo}>{config.action}</ActionButton>} />
          )}
        </Panel>
      )}

      {memberToRemove && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: '#0f172a', textTransform: 'capitalize' }}>
              Remove {removeRole} from Organization?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5' }}>
              This will remove the {removeRole} from your organization, but their user account will not be deleted.
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
              }}
            >
              <strong style={{ display: 'block', color: '#1e293b' }}>{memberToRemove.name}</strong>
              <small style={{ color: '#64748b' }}>{memberToRemove.email} · Member ID: {memberToRemove.organizationMemberId || 'N/A'}</small>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => setMemberToRemove(null)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRemoving}
                onClick={handleConfirmRemove}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {isRemoving ? 'Removing...' : `Remove ${removeRole.charAt(0).toUpperCase() + removeRole.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
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
