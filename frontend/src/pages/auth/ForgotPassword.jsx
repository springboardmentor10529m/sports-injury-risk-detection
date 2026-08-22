import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../../components/Logo'

function ForgotPassword() {
  const navigate = useNavigate()
  const { forgotPassword, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your registered email address.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Verify email exists in PostgreSQL
      await forgotPassword(trimmedEmail)

      // 2. Perform password reset in PostgreSQL
      const response = await resetPassword(trimmedEmail, newPassword)

      // 3. Redirect to login with success message and pre-filled email
      navigate('/login', {
        replace: true,
        state: {
          successMessage: response?.message || 'Password reset successfully. Please login with your new password.',
          registeredEmail: trimmedEmail,
        },
      })
    } catch (err) {
      setError(err.message || 'Password reset failed. Please verify your email and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Logo linked />
      </div>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-7 col-lg-5">
            <div className="auth-card">
              <div className="text-center mb-4">
                <div className="auth-icon">⚙</div>
                <h2 className="auth-title">Reset Password</h2>
                <p className="auth-subtitle">Enter your registered email and a new password to update your account.</p>
              </div>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="alert alert-danger py-2 mb-3" role="alert">
                    {error}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Registered Email Address</label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setError('')
                    }}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-control form-control-lg"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value)
                        setError('')
                      }}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword((visible) => !visible)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showNewPassword}
                    >
                      {showNewPassword ? '◉' : '👁'}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-control form-control-lg"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        setError('')
                      }}
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

                <button type="submit" className="btn btn-primary btn-lg w-100 mb-3" disabled={isSubmitting}>
                  {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>

              <div className="text-center mt-3">
                <Link to="/login" className="back-home">
                  ← Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
