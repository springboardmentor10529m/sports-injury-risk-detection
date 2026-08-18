import { ArrowUpRight, Activity, ShieldCheck, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">

      {/* NAVBAR */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-mark">
            K
          </div>

          <div>
            <div className="brand-name">KINETIQ</div>
            <div className="brand-subtitle">
              SPORTS INTELLIGENCE
            </div>
          </div>
        </div>

        <nav className="nav-links">
          <a href="#platform">Platform</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#roles">For Teams</a>
        </nav>

        <div className="nav-actions">
          <button
            className="nav-login"
            onClick={() => navigate("/login")}
          >
            Sign In
          </button>

          <button
            className="nav-cta"
            onClick={() => navigate("/roles")}
          >
            Get Started
            <ArrowUpRight size={16} />
          </button>
        </div>
      </header>

      {/* HERO */}
      <main>

        <section className="hero">

          <div className="hero-left">

            <div className="status-pill">
              <span className="status-dot"></span>
              AI SYSTEM ONLINE
            </div>

            <p className="eyebrow">
              AI-POWERED SPORTS ANALYTICS
            </p>

            <h1>
              MOVE
              <br />
              <span>SMARTER.</span>
              <br />
              STAY AHEAD.
            </h1>

            <p className="hero-description">
              Intelligent movement analysis designed to identify
              injury risk, understand biomechanics, and help athletes
              perform with confidence.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => navigate("/roles")}
              >
                GET STARTED
                <ArrowUpRight size={18} />
              </button>

              <a
                href="#how-it-works"
                className="secondary-button"
              >
                EXPLORE PLATFORM
              </a>
            </div>

          </div>

          <div className="hero-right">

            <div className="orb-wrapper">
              <div className="orb">
                <div className="orb-inner">
                  <Activity size={44} />
                </div>
              </div>

              <div className="orb-label top">
                MOVEMENT
              </div>

              <div className="orb-label bottom">
                INTELLIGENCE
              </div>
            </div>

          </div>

        </section>

        {/* STATS */}
        <section className="stats-section">

          <div className="stat">
            <strong>98.7%</strong>
            <span>ANALYSIS ACCURACY</span>
          </div>

          <div className="stat">
            <strong>24/7</strong>
            <span>RISK MONITORING</span>
          </div>

          <div className="stat">
            <strong>AI</strong>
            <span>POWERED INSIGHTS</span>
          </div>

          <div className="stat">
            <strong>01</strong>
            <span>UNIFIED PLATFORM</span>
          </div>

        </section>

        {/* PLATFORM */}
        <section
          className="platform-section"
          id="platform"
        >

          <div className="section-heading">

            <div>
              <p className="eyebrow">
                THE PLATFORM
              </p>

              <h2>
                MOVEMENT
                <br />
                <span>INTELLIGENCE.</span>
              </h2>
            </div>

            <p>
              Turn movement data into actionable sports
              performance insights.
            </p>

          </div>

          <div className="feature-grid">

            <FeatureCard
              number="01"
              icon={<Activity size={24} />}
              title="MOVEMENT ANALYSIS"
              description="Analyze movement patterns and identify biomechanical indicators."
            />

            <FeatureCard
              number="02"
              icon={<ShieldCheck size={24} />}
              title="RISK DETECTION"
              description="Monitor potential injury risk before it becomes a bigger problem."
            />

            <FeatureCard
              number="03"
              icon={<Brain size={24} />}
              title="PERFORMANCE INSIGHTS"
              description="Understand movement quality, symmetry and performance trends."
            />

          </div>

        </section>

        {/* HOW IT WORKS */}
        <section
          className="workflow-section"
          id="how-it-works"
        >

          <div className="section-heading">
            <div>
              <p className="eyebrow">
                SIMPLE WORKFLOW
              </p>

              <h2>
                HOW IT
                <br />
                <span>WORKS.</span>
              </h2>
            </div>
          </div>

          <div className="workflow-grid">

            <WorkflowStep
              number="01"
              title="UPLOAD"
              text="Upload a training or movement video."
            />

            <WorkflowStep
              number="02"
              title="ANALYZE"
              text="KINETIQ processes movement patterns."
            />

            <WorkflowStep
              number="03"
              title="IDENTIFY"
              text="Movement and biomechanical indicators are evaluated."
            />

            <WorkflowStep
              number="04"
              title="INSIGHTS"
              text="Receive risk and performance insights."
            />

          </div>

        </section>

        {/* ROLES */}
        <section
          className="roles-preview"
          id="roles"
        >

          <div className="section-heading centered">

            <p className="eyebrow">
              BUILT FOR EVERYONE
            </p>

            <h2>
              ONE PLATFORM.
              <br />
              <span>MULTIPLE ROLES.</span>
            </h2>

            <p>
              Every role gets the tools and insights
              they need to make better decisions.
            </p>

          </div>

          <div className="role-mini-grid">

            <RoleMini name="ATHLETE" />
            <RoleMini name="COACH" />
            <RoleMini name="PHYSIOTHERAPIST" />
            <RoleMini name="SPORTS SCIENTIST" />
            <RoleMini name="ADMINISTRATOR" />

          </div>

          <button
            className="primary-button centered-button"
            onClick={() => navigate("/roles")}
          >
            EXPLORE ROLES
            <ArrowUpRight size={18} />
          </button>

        </section>

      </main>

      {/* FOOTER */}
      <footer className="footer">

        <div className="brand">
          <div className="brand-mark">
            K
          </div>

          <div>
            <div className="brand-name">KINETIQ</div>
            <div className="brand-subtitle">
              SPORTS INTELLIGENCE
            </div>
          </div>
        </div>

        <p>
          Intelligent movement. Better decisions.
        </p>

        <span>
          © 2026 KINETIQ
        </span>

      </footer>

    </div>
  );
}


function FeatureCard({
  number,
  icon,
  title,
  description,
}) {
  return (
    <div className="feature-card">

      <div className="card-top">
        <span>{number}</span>
        <div className="icon-box">
          {icon}
        </div>
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <div className="card-arrow">
        <ArrowUpRight size={18} />
      </div>

    </div>
  );
}


function WorkflowStep({
  number,
  title,
  text,
}) {
  return (
    <div className="workflow-step">

      <span className="step-number">
        {number}
      </span>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

    </div>
  );
}


function RoleMini({ name }) {
  return (
    <div className="role-mini">
      <span>{name}</span>
      <ArrowUpRight size={17} />
    </div>
  );
}


export default Home;