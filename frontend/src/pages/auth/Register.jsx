import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createIndependentAthleteAccount } from '../../config/organizationAccess'

const REGISTRATION_KEY = 'sports-injury-demo-registration'

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password must match.')
      return
    }
    const account = createIndependentAthleteAccount(form)
    localStorage.setItem(REGISTRATION_KEY, JSON.stringify(account))
    navigate('/login')
  }

  return (
    <div className="auth-page"><div className="auth-brand"><Link to="/" className="brand-name">Sports Injury Risk Detection</Link></div>
      <div className="container"><div className="row justify-content-center"><div className="col-12 col-md-8 col-lg-6"><div className="auth-card">
        <div className="text-center mb-4"><div className="auth-icon">+</div><h2 className="auth-title">Create Your Account</h2><p className="auth-subtitle">Join the platform to monitor athlete injury risk and performance.</p></div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          <div className="mb-3"><label className="form-label">Full Name</label><input type="text" className="form-control form-control-lg" placeholder="Enter your full name" value={form.name} onChange={update('name')} required /></div>
          <div className="mb-3"><label className="form-label">Email Address</label><input type="email" className="form-control form-control-lg" placeholder="Enter your email" value={form.email} onChange={update('email')} required /></div>
          <div className="mb-3"><span className="form-label d-block">Account Type</span><div className="role-selection-card selected" aria-label="Personal Athlete Account"><span className="role-card-icon" aria-hidden="true">♟</span><span className="role-card-name">Personal Athlete Account</span></div></div>
          <div className="mb-3"><label className="form-label">Password</label><div className="password-input-wrapper"><input type={showPassword ? 'text' : 'password'} className="form-control form-control-lg" placeholder="Create a password" value={form.password} onChange={update('password')} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? '◉' : '👁'}</button></div></div>
          <div className="mb-4"><label className="form-label">Confirm Password</label><div className="password-input-wrapper"><input type={showConfirmPassword ? 'text' : 'password'} className="form-control form-control-lg" placeholder="Confirm your password" value={form.confirmPassword} onChange={update('confirmPassword')} required /><button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirmPassword}>{showConfirmPassword ? '◉' : '👁'}</button></div></div>
          <button type="submit" className="btn btn-primary btn-lg w-100">Create Account</button>
        </form>
        <div className="auth-divider"><span>Already have an account?</span></div>
        <div className="text-center"><Link to="/login" className="register-link">Login to Your Account</Link></div>
        <div className="text-center mt-4"><Link to="/" className="back-home">← Back to Home</Link></div>
      </div></div></div></div>
    </div>
  )
}

export default Register
