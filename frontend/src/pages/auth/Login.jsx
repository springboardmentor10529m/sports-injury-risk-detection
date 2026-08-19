import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_DASHBOARDS } from '../../config/roles'
import { hasActiveOrganizationMembership, isOrganizationRole } from '../../config/organizationAccess'

const REGISTRATION_KEY = 'sports-injury-demo-registration'

function readRegisteredAccount() {
  try {
    return JSON.parse(localStorage.getItem(REGISTRATION_KEY))
  } catch {
    return null
  }
}

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const registeredAccount = readRegisteredAccount()
  const [email, setEmail] = useState(registeredAccount?.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const account = readRegisteredAccount()

    if (!account || account.email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
      setError('No registered account was found for this email address.')
      return
    }

    if (!account.password || account.password !== password) {
      setError('The email address or password is incorrect.')
      return
    }

    if (isOrganizationRole(account.role) && !hasActiveOrganizationMembership(account)) {
      setError('Professional access requires an active organization membership.')
      return
    }

    const user = login(account)
    navigate(ROLE_DASHBOARDS[user.role], { replace: true })
  }

  return (
    <div className="auth-page"><div className="auth-brand"><Link to="/" className="brand-name">Sports Injury Risk Detection</Link></div>
      <div className="container"><div className="row justify-content-center"><div className="col-12 col-md-7 col-lg-5"><div className="auth-card">
        <div className="text-center mb-4"><div className="auth-icon">⚕</div><h2 className="auth-title">Welcome Back</h2><p className="auth-subtitle">Sign in to access your injury risk dashboard.</p></div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          <div className="mb-3"><label className="form-label">Email Address</label><input type="email" className="form-control form-control-lg" placeholder="Enter your email" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} required /></div>
          <div className="mb-2"><label className="form-label">Password</label><div className="password-input-wrapper"><input type={showPassword ? 'text' : 'password'} className="form-control form-control-lg" placeholder="Enter your password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? '◉' : '👁'}</button></div></div>
          <div className="text-end mb-4"><a href="#" className="forgot-link">Forgot Password?</a></div>
          <button type="submit" className="btn btn-primary btn-lg w-100">Login</button>
        </form>
        <div className="auth-divider"><span>New to the platform?</span></div>
        <div className="text-center"><Link to="/register" className="register-link">Create an Account</Link></div>
        <div className="text-center mt-4"><Link to="/" className="back-home">← Back to Home</Link></div>
      </div></div></div></div>
    </div>
  )
}

export default Login
