import { Link } from "react-router-dom";

import {
  Activity,
  Video,
  ShieldCheck,
  Brain,
  ArrowRight
} from "lucide-react";

function Landing() {
  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-tag">
            <Activity size={15} />
            AI-Powered Sports Performance
          </div>

          <h1>
            Understand movement.
            <br />
            <span>Reduce injury risk.</span>
          </h1>

          <p>
            Analyze athlete movement videos using computer
            vision and biomechanical intelligence to identify
            abnormal movement patterns and potential injury
            risk factors.
          </p>

          <div className="hero-actions">
            <Link to="/register" className="primary-button">
              Start Analysis
              <ArrowRight size={18} />
            </Link>

            <Link to="/login" className="secondary-button">
              Sign In
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="analysis-card">
            <div className="analysis-header">
              <span>Movement Analysis</span>

              <span className="live-dot">
                ● Live
              </span>
            </div>

            <div className="skeleton">
              <div className="head"></div>
              <div className="body"></div>

              <div className="arm left-arm"></div>
              <div className="arm right-arm"></div>

              <div className="leg left-leg"></div>
              <div className="leg right-leg"></div>
            </div>

            <div className="analysis-result">
              <div>
                <small>Risk Score</small>
                <strong>24%</strong>
              </div>

              <div>
                <small>Status</small>
                <strong className="safe">
                  Low Risk
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="section-heading">
          <span>CORE CAPABILITIES</span>

          <h2>
            Movement intelligence for modern sports
          </h2>
        </div>

        <div className="feature-grid">
          <Feature
            icon={Video}
            title="Video Analysis"
            text="Upload movement videos and analyze athlete biomechanics."
          />

          <Feature
            icon={Brain}
            title="AI Risk Assessment"
            text="Identify movement abnormalities and potential injury risk factors."
          />

          <Feature
            icon={ShieldCheck}
            title="Actionable Insights"
            text="Turn assessment results into useful corrective recommendations."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        <Icon size={22} />
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

export default Landing;