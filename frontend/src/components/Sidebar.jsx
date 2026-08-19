import { NavLink, useNavigate } from 'react-router-dom'

function Sidebar() {
  const navigate = useNavigate()

  const getNavClass = ({ isActive }) => {
    return `sidebar-link ${isActive ? 'active' : ''}`
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    navigate('/login')
  }

  return (
    <aside className="dashboard-sidebar">

      {/* =========================================
          LOGO
      ========================================= */}

      <div className="sidebar-brand">

        <div className="sidebar-brand-title">
          Sports Injury
        </div>

        <div className="sidebar-brand-subtitle">
          Risk Prediction
        </div>

      </div>


      {/* =========================================
          NAVIGATION
      ========================================= */}

      <nav className="sidebar-nav">


        {/* =========================================
            MAIN
        ========================================= */}

        <div className="sidebar-section-title">
          MAIN
        </div>


        {/* DASHBOARD */}

        <NavLink
          to="/dashboard"
          className={getNavClass}
        >
          <span className="sidebar-icon">
            ▦
          </span>

          <span>
            Dashboard
          </span>
        </NavLink>


        {/* ATHLETES */}

        <NavLink
          to="/athletes"
          className={getNavClass}
        >
          <span className="sidebar-icon">
            ♟
          </span>

          <span>
            Athletes
          </span>
        </NavLink>


        {/* INJURY HISTORY */}

        <NavLink
          to="/injury-history"
          className={getNavClass}
        >
          <span className="sidebar-icon">
            ♥
          </span>

          <span>
            Injury History
          </span>
        </NavLink>


        {/* =========================================
            ANALYSIS
        ========================================= */}

        <div className="sidebar-section-title">
          ANALYSIS
        </div>


        {/* VIDEO ANALYSIS */}

        <NavLink
          to="/video-analysis"
          className={getNavClass}
        >
          <span className="sidebar-icon">
            ▶
          </span>

          <span>
            Video Analysis
          </span>
        </NavLink>


        {/* RISK PREDICTION */}

        <NavLink
          to="/risk-prediction"
          className={getNavClass}
        >
          <span className="sidebar-icon">
            ◉
          </span>

          <span>
            Risk Prediction
          </span>
        </NavLink>


        {/* PERFORMANCE */}

        <NavLink
          to="/performance"
          className={getNavClass}
        >
          <span className="sidebar-icon">
            ↗
          </span>

          <span>
            Performance
          </span>
        </NavLink>


        {/* =========================================
            MANAGEMENT
        ========================================= */}

        <div className="sidebar-section-title">
          MANAGEMENT
        </div>


        {/* RECOMMENDATIONS */}

        <NavLink
          to="/recommendations"
          className={getNavClass}
        >
          <span className="sidebar-icon">
            ✦
          </span>

          <span>
            Recommendations
          </span>
        </NavLink>


        {/* REPORTS */}

        <NavLink
          to="/reports"
          className={getNavClass}
        >
          <span className="sidebar-icon">
            ▤
          </span>

          <span>
            Reports
          </span>
        </NavLink>


        {/* =========================================
            BOTTOM
        ========================================= */}

        <div className="sidebar-bottom">


          {/* SETTINGS */}

          <NavLink
            to="/settings"
            className={getNavClass}
          >
            <span className="sidebar-icon">
              ⚙
            </span>

            <span>
              Settings
            </span>
          </NavLink>


          {/* LOGOUT */}

          <button
            type="button"
            className="sidebar-link sidebar-logout"
            onClick={handleLogout}
          >
            <span className="sidebar-icon">
              ↪
            </span>

            <span>
              Logout
            </span>
          </button>


        </div>

      </nav>

    </aside>
  )
}

export default Sidebar