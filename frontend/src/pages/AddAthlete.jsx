import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/authApi'
import './AthletePages.css'

function AddAthlete() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [searchEmail, setSearchEmail] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [foundAthlete, setFoundAthlete] = useState(null)

  const [isAssigning, setIsAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState('')
  const [assignError, setAssignError] = useState('')

  const adminOrgName = currentUser?.organizationName || 'Development Organization'
  const adminBaseOrgId = currentUser?.organizationId ? currentUser.organizationId.replace(/-\d+$/, '') : 'ORG-DEV'

  const handleSearch = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }
    setSearchError('')
    setAssignSuccess('')
    setAssignError('')
    setFoundAthlete(null)

    if (!searchEmail.trim()) {
      setSearchError('Please enter a registered athlete email address.')
      return
    }

    setIsSearching(true)

    try {
      const res = await authApi.searchAthlete(searchEmail.trim())
      if (res?.athlete) {
        setFoundAthlete(res.athlete)
      } else {
        setSearchError('No registered Athlete found with this email address.')
      }
    } catch (err) {
      setSearchError(err.message || 'No registered Athlete found with this email address.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAssign = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation()
    }

    if (!foundAthlete) return
    setAssignError('')
    setAssignSuccess('')

    setIsAssigning(true)

    try {
      const targetId = foundAthlete.id || foundAthlete.userId
      await authApi.assignAthlete(targetId)
      
      // Successfully assigned! Redirect to Admin Athletes page with state message
      navigate('/admin/athletes', {
        state: { message: 'Athlete successfully added to the organization.' },
        replace: true,
      })
    } catch (err) {
      console.error('Assignment request error:', err)
      setAssignError(err.data?.message || err.message || 'Failed to assign athlete to organization.')
    } finally {
      setIsAssigning(false)
    }
  }

  const currentAthleteOrg = foundAthlete?.organizationId ? foundAthlete.organizationId.replace(/-\d+$/, '') : null
  const isAlreadyInSameOrg =
    foundAthlete?.membershipStatus === 'active' &&
    (currentAthleteOrg === adminBaseOrgId || foundAthlete?.organizationId === 'ORG-DEV-001')

  const isAlreadyInDifferentOrg =
    foundAthlete?.membershipStatus === 'active' &&
    currentAthleteOrg &&
    currentAthleteOrg !== adminBaseOrgId &&
    foundAthlete?.organizationId !== 'ORG-DEV-001'

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-main">
        {/* TOPBAR */}
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-breadcrumb">Management / Athletes / Add Athlete</p>
            <h1>Assign Athlete to Organization</h1>
          </div>

          <div className="dashboard-user">
            <div className="user-avatar">{currentUser?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
            <div className="user-info">
              <strong>{currentUser?.name || 'Admin'}</strong>
              <small>Administrator</small>
            </div>
          </div>
        </header>

        {/* BACK BUTTON */}
        <div className="profile-back">
          <Link to="/admin/athletes">← Back to Athletes</Link>
        </div>

        {/* STEP 1: FIND REGISTERED ATHLETE */}
        <section className="dashboard-panel add-athlete-panel" style={{ marginBottom: '24px' }}>
          <div className="panel-header">
            <div>
              <h3>Step 1: Find Registered Athlete</h3>
              <p>Search for an existing registered Athlete account using their registered email address.</p>
            </div>
          </div>

          <form onSubmit={handleSearch} style={{ marginTop: '16px' }}>
            <div className="add-athlete-form-grid">
              <div className="athlete-form-group full-width">
                <label htmlFor="search-email">Registered Athlete Email</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    id="search-email"
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="e.g. athlete@gmail.com"
                    className={searchError ? 'input-error' : ''}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={isSearching} style={{ whiteSpace: 'nowrap', minHeight: '44px' }}>
                    {isSearching ? 'Searching...' : 'Search Athlete'}
                  </button>
                </div>
                {searchError && <small className="form-error" style={{ fontSize: '0.85rem', marginTop: '8px' }}>{searchError}</small>}
              </div>
            </div>
          </form>
        </section>

        {/* STEP 2 & 3: ATHLETE DETAILS & ASSIGNMENT FORM */}
        {foundAthlete && (
          <section className="dashboard-panel add-athlete-panel">
            <form onSubmit={handleAssign}>
              <div className="panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <span className="badge badge-success" style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                    ✓ Registered Athlete Found
                  </span>
                  <h3 style={{ marginTop: '8px' }}>{foundAthlete.name}</h3>
                  <p>Review athlete details from PostgreSQL before assigning to your organization.</p>
                </div>
              </div>

              {/* ATHLETE READ-ONLY DETAILS */}
              <div className="form-section-title">Athlete Information</div>
              <div className="profile-details-grid" style={{ marginBottom: '24px' }}>
                <div>
                  <span>Full Name</span>
                  <strong>{foundAthlete.name}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{foundAthlete.email}</strong>
                </div>
                <div>
                  <span>Sport</span>
                  <strong>{foundAthlete.sport || 'Not specified'}</strong>
                </div>
                <div>
                  <span>Gender</span>
                  <strong>{foundAthlete.gender || 'Not specified'}</strong>
                </div>
                <div>
                  <span>Height</span>
                  <strong>{foundAthlete.height || 'Not provided'}</strong>
                </div>
                <div>
                  <span>Weight</span>
                  <strong>{foundAthlete.weight || 'Not provided'}</strong>
                </div>
                <div>
                  <span>Current Organization</span>
                  <strong>{foundAthlete.organizationName || 'None (Independent)'}</strong>
                </div>
                <div>
                  <span>Membership Status</span>
                  <strong style={{ textTransform: 'capitalize', color: foundAthlete.membershipStatus === 'active' ? '#16a34a' : '#0f2747' }}>
                    {foundAthlete.membershipStatus || 'independent'}
                  </strong>
                </div>
              </div>

              {/* ORGANIZATION ASSIGNMENT SECTION */}
              <div className="form-section-title">Organization Assignment</div>
              <div className="profile-details-grid" style={{ marginBottom: '24px' }}>
                <div>
                  <span>Organization Name</span>
                  <strong>{adminOrgName}</strong>
                </div>
                <div>
                  <span>Organization ID</span>
                  <strong>{adminBaseOrgId}</strong>
                </div>
                <div>
                  <span>Athlete Assignment ID</span>
                  <strong style={{ color: '#2563eb' }}>
                    {foundAthlete.organizationMemberId || `${adminBaseOrgId}-Next`}
                  </strong>
                </div>
                <div>
                  <span>Assigned Membership Status</span>
                  <strong style={{ color: '#16a34a' }}>Active</strong>
                </div>
              </div>

              {/* DUPLICATE / SAME ORG WARNING */}
              {isAlreadyInSameOrg && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ color: '#991b1b', fontWeight: 600, fontSize: '0.9rem' }}>
                    ⚠️ Athlete already exists in this organization.
                  </div>
                  <div style={{ color: '#7f1d1d', fontSize: '0.825rem', marginTop: '4px' }}>
                    This athlete is already an active member of {adminOrgName} (Member ID: {foundAthlete.organizationMemberId || 'ORG-DEV-001'}). Duplicate assignment is blocked.
                  </div>
                </div>
              )}

              {/* DIFFERENT ORG WARNING */}
              {isAlreadyInDifferentOrg && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ color: '#92400e', fontWeight: 600, fontSize: '0.9rem' }}>
                    ⚠️ This Athlete is already associated with another organization.
                  </div>
                  <div style={{ color: '#b45309', fontSize: '0.825rem', marginTop: '4px' }}>
                    This athlete belongs to {foundAthlete.organizationName || 'another organization'}. Direct reassignment is blocked.
                  </div>
                </div>
              )}

              {/* MESSAGES */}
              {assignSuccess && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    padding: '14px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  ✓ {assignSuccess}
                </div>
              )}

              {assignError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '14px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  ✗ {assignError}
                </div>
              )}

              {/* ACTIONS */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setFoundAthlete(null)
                    setSearchEmail('')
                  }}
                  className="btn btn-outline-secondary"
                >
                  Cancel / Reset
                </button>

                <button
                  type="submit"
                  disabled={isAssigning || isAlreadyInSameOrg || isAlreadyInDifferentOrg}
                  className="btn btn-primary"
                >
                  {isAssigning ? 'Assigning...' : 'Add Athlete to Organization'}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}

export default AddAthlete