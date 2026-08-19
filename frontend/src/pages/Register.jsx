import { Link, useNavigate } from 'react-router-dom'

function Register() {
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
    navigate('/login')
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

          <div className="col-12 col-md-8 col-lg-6">

            <div className="auth-card">

              <div className="text-center mb-4">

                <div className="auth-icon">
                  +
                </div>

                <h2 className="auth-title">
                  Create Your Account
                </h2>

                <p className="auth-subtitle">
                  Join the platform to monitor athlete injury risk
                  and performance.
                </p>

              </div>


              <form onSubmit={handleSubmit}>

                {/* Full Name */}
                <div className="mb-3">

                  <label className="form-label">
                    Full Name
                  </label>

                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Enter your full name"
                    required
                  />

                </div>


                {/* Email */}
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


                {/* Role */}
                <div className="mb-3">

                  <label className="form-label">
                    Role
                  </label>

                  <select
                    className="form-select form-select-lg"
                    required
                  >
                    <option value="">
                      Select your role
                    </option>

                    <option value="athlete">
                      Athlete
                    </option>

                    <option value="coach">
                      Coach
                    </option>

                    <option value="medical_professional">
                      Medical Professional
                    </option>
                  </select>

                </div>


                {/* Password */}
                <div className="mb-3">

                  <label className="form-label">
                    Password
                  </label>

                  <input
                    type="password"
                    className="form-control form-control-lg"
                    placeholder="Create a password"
                    required
                  />

                </div>


                {/* Confirm Password */}
                <div className="mb-4">

                  <label className="form-label">
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    className="form-control form-control-lg"
                    placeholder="Confirm your password"
                    required
                  />

                </div>


                {/* Submit */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100"
                >
                  Create Account
                </button>

              </form>


              <div className="auth-divider">
                <span>Already have an account?</span>
              </div>


              <div className="text-center">

                <Link
                  to="/login"
                  className="register-link"
                >
                  Login to Your Account
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

export default Register