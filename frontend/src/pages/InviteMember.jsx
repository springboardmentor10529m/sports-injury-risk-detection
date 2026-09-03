import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import { authApi } from '../services/authApi'
import './AthletePages.css'

function InviteMember({ role = ROLES.COACH }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const isCoach = role === ROLES.COACH
  const roleLabel = isCoach ? 'Coach' : 'Physiotherapist'
  const listPath = isCoach ? '/admin/coaches' : '/admin/physiotherapists'
  const defaultInitialPassword = isCoach ? 'Coach@123' : 'Physio@123'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(defaultInitialPassword)
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const adminOrgName = currentUser?.organizationName || 'Development Organization'
  const adminBaseOrgId = currentUser?.organizationId ? currentUser.organizationId.replace(/-\d+$/, '') : 'ORG-DEV'

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError('Please enter the full name.')
      return
    }

    if (!trimmedEmail) {
      setError('Please enter an email address.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. user@example.com).')
      return
    }

    if (password && password.length < 6) {
      setError('Initial password must be at least 6 characters long.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        password: password || defaultInitialPassword,
        phone: phone.trim() || undefined,
      }

      if (isCoach) {
        await authApi.inviteCoach(payload)
      } else {
        await authApi.invitePhysiotherapist(payload)
      }

      // Navigate back with success state message
      navigate(listPath, {
        state: { message: `${roleLabel} invited successfully.` },
        replace: true,
      })
    } catch (err) {
      console.error(`Invite ${roleLabel} error:`, err)
      setError(err.data?.message || err.message || `Failed to invite ${roleLabel.toLowerCase()}.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-main">
        {/* TOPBAR */}
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-breadcrumb">Organization / {roleLabel}s / Invite {roleLabel}</p>
            <h1>Invite {roleLabel}</h1>
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
          <Link to={listPath}>← Back to {roleLabel}s</Link>
        </div>

        {/* INVITATION FORM PANEL */}
        <section className="dashboard-panel add-athlete-panel">
          <div className="panel-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h3>{roleLabel} Invitation Details</h3>
              <p>Add a new {roleLabel.toLowerCase()} to {adminOrgName}. An account will be established with active organization membership.</p>
            </div>
          </div>

          {/* ORGANIZATION CONTEXT (READ-ONLY) */}
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
              <span>Role Assigned</span>
              <strong style={{ textTransform: 'capitalize', color: '#2563eb' }}>{roleLabel}</strong>
            </div>
            <div>
              <span>Membership Status</span>
              <strong style={{ color: '#16a34a' }}>Active</strong>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '14px 18px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              ✗ {error}
            </div>
          )}

          {/* FORM FIELDS */}
          <form onSubmit={handleSubmit}>
            <div className="form-section-title">Member Information</div>
            <div className="add-athlete-form-grid" style={{ marginBottom: '24px' }}>
              <div className="athlete-form-group">
                <label htmlFor="invite-name">Full Name *</label>
                <input
                  id="invite-name"
                  type="text"
                  placeholder={`e.g. Alex Johnson`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="athlete-form-group">
                <label htmlFor="invite-email">Email Address *</label>
                <input
                  id="invite-email"
                  type="email"
                  placeholder={`e.g. ${isCoach ? 'coach' : 'physio'}.alex@example.com`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="athlete-form-group">
                <label htmlFor="invite-phone">Phone Number (Optional)</label>
                <input
                  id="invite-phone"
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="athlete-form-group">
                <label htmlFor="invite-password">Initial Password *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="invite-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Initial password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: '#64748b',
                      padding: '4px',
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '◉' : '👁'}
                  </button>
                </div>
                <small style={{ color: '#64748b', marginTop: '4px', display: 'block', fontSize: '0.75rem' }}>
                  The {roleLabel.toLowerCase()} can use this password to log in. Minimum 6 characters.
                </small>
              </div>
            </div>

            <div className="form-actions">
              <Link to={listPath} className="btn btn-outline-secondary" style={{ textDecoration: 'none' }}>
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ minWidth: '150px' }}
              >
                {isSubmitting ? 'Inviting...' : `Send Invitation`}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default InviteMember
