import { Link, useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="auth-page">

      {/* Brand */}
      <div className="auth-brand">
        <Link to="/" className="brand-name">
          Sports Injury Risk Detection
        </Link>
      </div>

      <div className="container">
        <div className="row justify-content-center">

          <div className="col-12 col-md-7 col-lg-5">

            <div className="auth-card">

              <div className="text-center mb-4">
                <div className="auth-icon">
                  ⚕
                </div>

                <h2 className="auth-title">
                  Welcome Back
                </h2>

                <p className="auth-subtitle">
                  Sign in to access your athlete risk dashboard.
                </p>
              </div>


              <form onSubmit={handleSubmit}>

                <div className="mb-3">
                  <label className="form-label">
                    Email Address
                  </label>

                  <input
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="Enter your email"
                    required
                  />
                </div>


                <div className="mb-2">
                  <label className="form-label">
                    Password
                  </label>

                  <input
                    type="password"
                    className="form-control form-control-lg"
                    placeholder="Enter your password"
                    required
                  />
                </div>


                <div className="text-end mb-4">
                  <a href="#" className="forgot-link">
                    Forgot Password?
                  </a>
                </div>


                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100"
                >
                  Login
                </button>

              </form>


              <div className="auth-divider">
                <span>New to the platform?</span>
              </div>


              <div className="text-center">
                <Link
                  to="/register"
                  className="register-link"
                >
                  Create an Account
                </Link>
              </div>


              <div className="text-center mt-4">
                <Link
                  to="/"
                  className="back-home"
                >
                  ← Back to Home
                </Link>
              </div>

            </div>

          </div>

        </div>
      </div>

    </div>
  )
}

export default Login