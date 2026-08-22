import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_DASHBOARDS } from '../../config/roles'
import Logo from '../../components/Logo'

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', height: '', weight: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password must match.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await register(form)
      navigate('/login', {
        replace: true,
        state: {
          successMessage: response?.message || 'Registration successful. Please login with your email and password.',
          registeredEmail: form.email.trim(),
        },
      })
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand"><Logo linked /></div>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="auth-card">
              <div className="text-center mb-4">
                <div className="auth-icon">+</div>
                <h2 className="auth-title">Create Your Account</h2>
                <p className="auth-subtitle">Join the platform to monitor athlete injury risk and performance.</p>
              </div>

              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={update('name')}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={update('email')}
                    required
                  />
                </div>

                <div className="mb-3">
                  <span className="form-label d-block">Account Type</span>
                  <div className="role-selection-card selected" aria-label="Personal Athlete Account">
                    <span className="role-card-icon" aria-hidden="true">♟</span>
                    <span className="role-card-name">Personal Athlete Account</span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control form-control-lg"
                      placeholder="Create a password"
                      value={form.password}
                      onChange={update('password')}
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

                <div className="mb-4">
                  <label className="form-label">Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-control form-control-lg"
                      placeholder="Confirm your password"
                      value={form.confirmPassword}
                      onChange={update('confirmPassword')}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? '◉' : '👁'}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="registration-height">Height</label>
                  <div className="input-group input-group-lg">
                    <input
                      id="registration-height"
                      type="number"
                      className="form-control"
                      placeholder="Enter your height"
                      value={form.height}
                      onChange={update('height')}
                      min="30"
                      max="300"
                      step="0.1"
                      required
                    />
                    <span className="input-group-text">cm</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="registration-weight">Weight</label>
                  <div className="input-group input-group-lg">
                    <input
                      id="registration-weight"
                      type="number"
                      className="form-control"
                      placeholder="Enter your weight"
                      value={form.weight}
                      onChange={update('weight')}
                      min="1"
                      max="500"
                      step="0.1"
                      required
                    />
                    <span className="input-group-text">kg</span>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-100" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <div className="auth-divider"><span>Already have an account?</span></div>
              <div className="text-center">
                <Link to="/login" className="register-link">Login to Your Account</Link>
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

export default Register
