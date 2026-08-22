import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_DASHBOARDS, ROLE_LABELS, ROLES } from '../../config/roles'
import Logo from '../../components/Logo'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState(location.state?.registeredEmail || '')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState(ROLES.ATHLETE)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.successMessage || '')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const user = await login({ email: email.trim(), password, role: selectedRole })
      navigate(ROLE_DASHBOARDS[user.role], { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand"><Logo linked /></div>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-7 col-lg-5">
            <div className="auth-card">
              <div className="text-center mb-4">
                <div className="auth-icon">⚕</div>
                <h2 className="auth-title">Welcome Back</h2>
                <p className="auth-subtitle">Sign in to access your injury risk dashboard.</p>
              </div>

              <form onSubmit={handleSubmit}>
                {success && <div className="alert alert-success py-2 mb-3" role="status">{success}</div>}
                {error && <div className="alert alert-danger py-2 mb-3" role="alert">{error}</div>}

                <fieldset className="role-selection mb-4">
                  <legend className="form-label">Login As</legend>
                  <div className="role-card-grid">
                    {[ROLES.ATHLETE, ROLES.COACH, ROLES.PHYSIOTHERAPIST, ROLES.ADMIN].map((role) => (
                      <label className={`role-selection-card${selectedRole === role ? ' selected' : ''}`} key={role}>
                        <input
                          type="radio"
                          name="login-role"
                          value={role}
                          checked={selectedRole === role}
                          onChange={(event) => { setSelectedRole(event.target.value); setError('') }}
                        />
                        <span className="role-card-icon" aria-hidden="true">
                          {role === ROLES.ATHLETE ? '♟' : role === ROLES.COACH ? '⚑' : role === ROLES.PHYSIOTHERAPIST ? '+' : '◆'}
                        </span>
                        <span className="role-card-name">{ROLE_LABELS[role]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="mb-3">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); setError('') }}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control form-control-lg"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => { setPassword(event.target.value); setError('') }}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? '◉' : '👁'}
                    </button>
                  </div>
                </div>

                <div className="text-end mb-4">
                  <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-100" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Login'}
                </button>
              </form>

              <div className="auth-divider"><span>New to the platform?</span></div>
              <div className="text-center">
                <Link to="/register" className="register-link">Create an Account</Link>
              </div>
              <div className="text-center mt-4">
                <Link to="/" className="back-home">← Back to Home</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
