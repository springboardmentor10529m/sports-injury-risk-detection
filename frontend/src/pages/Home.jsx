import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="home-page">

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg bg-white border-bottom">
        <div className="container py-2">

          <Link to="/" className="navbar-brand fw-bold brand-name">
            Sports Injury Risk Detection
          </Link>

          <div className="d-flex align-items-center gap-3">
            <Link to="/login" className="login-link">
              Login
            </Link>

            <Link to="/register" className="btn btn-primary px-4">
              Register
            </Link>
          </div>

        </div>
      </nav>


      {/* Hero Section */}
      <section className="hero-section">

        <div className="container">

          <div className="row align-items-center min-vh-75">

            {/* Left Content */}
            <div className="col-lg-7">

              <span className="badge hero-badge mb-3">
                AI-Powered Sports Health Technology
              </span>

              <h1 className="hero-title">
                Smarter Detection.
                <br />
                <span>Safer Athletes.</span>
              </h1>

              <p className="hero-description">
                Analyze athlete movement and identify potential injury
                risks using computer vision, movement analysis and
                machine learning.
              </p>

              <div className="d-flex gap-3 flex-wrap">

                <Link
                  to="/register"
                  className="btn btn-primary btn-lg px-4"
                >
                  Get Started →
                </Link>

                <a
                  href="#features"
                  className="btn btn-outline-primary btn-lg px-4"
                >
                  Learn More
                </a>

              </div>

            </div>


            {/* Right Assessment Card */}
            <div className="col-lg-5 mt-5 mt-lg-0">

              <div className="assessment-card">

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <p className="small text-muted mb-1">
                      Example Assessment
                    </p>

                    <h4 className="fw-bold mb-0">
                      Athlete Risk Overview
                    </h4>
                  </div>

                  <span className="status-dot"></span>
                </div>


                <div className="risk-score-box">

                  <div>
                    <p className="text-muted mb-1">
                      Overall Risk Score
                    </p>

                    <h2 className="risk-score mb-0">
                      78%
                    </h2>
                  </div>

                  <span className="risk-badge-high">
                    HIGH
                  </span>

                </div>


                <div className="risk-item">
                  <div className="d-flex justify-content-between">
                    <span>ACL Risk</span>
                    <strong>78%</strong>
                  </div>

                  <div className="progress mt-2">
                    <div
                      className="progress-bar risk-high-bar"
                      style={{ width: '78%' }}
                    ></div>
                  </div>
                </div>


                <div className="risk-item">
                  <div className="d-flex justify-content-between">
                    <span>Hamstring Risk</span>
                    <strong>61%</strong>
                  </div>

                  <div className="progress mt-2">
                    <div
                      className="progress-bar risk-moderate-bar"
                      style={{ width: '61%' }}
                    ></div>
                  </div>
                </div>


                <div className="risk-item mb-0">
                  <div className="d-flex justify-content-between">
                    <span>Shoulder Risk</span>
                    <strong>27%</strong>
                  </div>

                  <div className="progress mt-2">
                    <div
                      className="progress-bar risk-low-bar"
                      style={{ width: '27%' }}
                    ></div>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* Features */}
      <section id="features" className="features-section">

        <div className="container">

          <div className="text-center mb-5">

            <span className="section-label">
              OUR PLATFORM
            </span>

            <h2 className="section-title">
              Built for Athlete Safety
            </h2>

            <p className="section-description">
              A simple platform for movement analysis, injury risk
              assessment and personalized recommendations.
            </p>

          </div>


          <div className="row g-4">

            <div className="col-md-4">
              <div className="feature-card">

                <div className="feature-icon">
                  🎥
                </div>

                <h5>Movement Analysis</h5>

                <p>
                  Analyze athlete videos and identify important
                  movement patterns and biomechanical indicators.
                </p>

              </div>
            </div>


            <div className="col-md-4">
              <div className="feature-card">

                <div className="feature-icon">
                  📊
                </div>

                <h5>Risk Prediction</h5>

                <p>
                  Evaluate injury risk across different injury types
                  using movement and performance indicators.
                </p>

              </div>
            </div>


            <div className="col-md-4">
              <div className="feature-card">

                <div className="feature-icon">
                  💡
                </div>

                <h5>Recommendations</h5>

                <p>
                  Provide useful recommendations related to exercise,
                  strengthening, mobility and recovery.
                </p>

              </div>
            </div>

          </div>

        </div>

      </section>


      {/* Risk Levels */}
      <section className="risk-level-section">

        <div className="container">

          <div className="text-center mb-4">

            <span className="section-label">
              RISK MONITORING
            </span>

            <h2 className="section-title">
              Clear Risk Levels
            </h2>

          </div>


          <div className="row g-3 justify-content-center">

            <div className="col-6 col-md-3">
              <div className="risk-level-card low">
                <span>Low</span>
                <small>Lower risk</small>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="risk-level-card moderate">
                <span>Moderate</span>
                <small>Needs attention</small>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="risk-level-card high">
                <span>High</span>
                <small>Significant risk</small>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="risk-level-card critical">
                <span>Critical</span>
                <small>Immediate attention</small>
              </div>
            </div>

          </div>

        </div>

      </section>


      {/* Footer */}
      <footer className="footer">

        <div className="container text-center">

          <h5 className="fw-bold">
            Sports Injury Risk Detection
          </h5>

          <p className="mb-0">
            AI-powered technology for safer athletic performance.
          </p>

        </div>

      </footer>

    </div>
  )
}

export default Home