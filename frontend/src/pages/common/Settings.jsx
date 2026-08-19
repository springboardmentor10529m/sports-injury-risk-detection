import Sidebar from '../../components/Sidebar'
import ThemeToggle from '../../components/ThemeToggle'
import '../Settings.css'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../config/roles'

function Settings() {
  const { currentUser, userName, userRole } = useAuth()
  const organizationLabel = currentUser?.organizationName || 'Independent'
  const membershipLabel = currentUser?.membershipStatus === 'active'
    ? 'Verified · Active'
    : 'Independent'

  return (
    <div className="dashboard-page">

      <Sidebar />

      <main className="dashboard-main">

        {/* =====================================================
            TOPBAR
        ===================================================== */}

        <header className="dashboard-topbar">

          <div>
            <p className="dashboard-breadcrumb">
              Settings
            </p>

            <h1>
              Settings
            </h1>
          </div>


          <div className="dashboard-user">

            <button
              className="notification-button"
              aria-label="Notifications"
              type="button"
            >
              ♧
              <span></span>
            </button>


            <div className="user-avatar">
              {userName.charAt(0).toUpperCase() || 'U'}
            </div>


            <div className="user-info">

              <strong>
                {userName}
              </strong>

              <small>
                {ROLE_LABELS[userRole]}
              </small>

            </div>

          </div>

        </header>


        {/* =====================================================
            SETTINGS CONTENT
        ===================================================== */}

        <div className="settings-content">


          {/* =================================================
              PAGE INTRODUCTION
          ================================================= */}

          <section className="settings-page-header">

            <div>

              <span className="settings-label">
                PREFERENCES
              </span>

              <h2>
                Application Settings
              </h2>

              <p>
                Manage your application preferences and account settings.
              </p>

            </div>

          </section>


          {/* =================================================
              APPEARANCE
          ================================================= */}

          <section className="dashboard-panel settings-panel">

            <div className="settings-section-header">

              <div className="settings-section-icon">
                ◐
              </div>

              <div>

                <h3>
                  Appearance
                </h3>

                <p>
                  Customize how Sports Injury Risk Prediction
                  looks on your device.
                </p>

              </div>

            </div>


            <div className="settings-option-row">

              <div className="settings-option-content">

                <strong>
                  Theme
                </strong>

                <span>
                  Choose between Light, Dark, or System mode.
                </span>

              </div>


              <div className="theme-control">
                <ThemeToggle />
              </div>

            </div>

          </section>


          {/* =================================================
              ACCOUNT
          ================================================= */}

          <section className="dashboard-panel settings-panel">

            <div className="settings-section-header">

              <div className="settings-section-icon">
                ♙
              </div>

              <div>

                <h3>
                  Account
                </h3>

                <p>
                  Manage your profile information.
                </p>

              </div>

            </div>


            <div className="settings-list">


              {/* NAME */}

              <div className="settings-list-row">

                <div className="settings-row-content">

                  <strong>
                    Name
                  </strong>

                  <span>
                    {currentUser?.name || userName}
                  </span>

                </div>


                <button
                  className="settings-action"
                  type="button"
                >
                  Edit
                </button>

              </div>


              {/* ACCOUNT TYPE */}

              <div className="settings-list-row">

                <div className="settings-row-content">

                  <strong>
                    Account Type
                  </strong>

                  <span>
                    {ROLE_LABELS[userRole]} account
                  </span>

                </div>


                <span className="settings-value-badge">
                  {ROLE_LABELS[userRole]}
                </span>

              </div>


              {/* ORGANIZATION MEMBERSHIP */}

              <div className="settings-list-row">

                <div className="settings-row-content">

                  <strong>
                    Organization
                  </strong>

                  <span>
                    {organizationLabel}
                  </span>

                </div>


                <span className="settings-value-badge">
                  {membershipLabel}
                </span>

              </div>

            </div>

          </section>


          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <section className="dashboard-panel settings-panel">

            <div className="settings-section-header">

              <div className="settings-section-icon">
                ♢
              </div>

              <div>

                <h3>
                  Notifications
                </h3>

                <p>
                  Manage injury risk and assessment notifications.
                </p>

              </div>

            </div>


            <div className="settings-list">


              {/* RISK ALERTS */}

              <div className="settings-list-row">

                <div className="settings-row-content">

                  <strong>
                    Risk Alerts
                  </strong>

                  <span>
                    Receive notifications when a high-risk
                    assessment is detected.
                  </span>

                </div>


                <label className="settings-switch">

                  <input
                    type="checkbox"
                    defaultChecked
                  />

                  <span></span>

                </label>

              </div>


              {/* ANALYSIS COMPLETION */}

              <div className="settings-list-row">

                <div className="settings-row-content">

                  <strong>
                    Analysis Completion
                  </strong>

                  <span>
                    Get notified when movement analysis is completed.
                  </span>

                </div>


                <label className="settings-switch">

                  <input
                    type="checkbox"
                    defaultChecked
                  />

                  <span></span>

                </label>

              </div>

            </div>

          </section>


          {/* =================================================
              ABOUT
          ================================================= */}

          <section className="dashboard-panel settings-panel settings-about">

            <div className="settings-section-header">

              <div className="settings-section-icon">
                ℹ
              </div>

              <div>

                <h3>
                  About
                </h3>

                <p>
                  Application information.
                </p>

              </div>

            </div>


            <div className="settings-about-content">

              <span>
                Application
              </span>

              <strong>
                Sports Injury Risk Prediction
              </strong>

              <small>
                AI-powered sports injury risk assessment platform
              </small>

            </div>

          </section>


        </div>

      </main>

    </div>
  )
}

export default Settings
