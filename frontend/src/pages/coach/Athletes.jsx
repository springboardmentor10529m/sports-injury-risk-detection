import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import '../Athletes.css'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../config/roles'

function Athletes() {
  const { userName, userRole } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [sportFilter, setSportFilter] = useState('All Sports')
  const [riskFilter, setRiskFilter] = useState('All Risk Levels')

  const athletes = [
    {
      id: 'ATH-001',
      name: 'Arjun Kumar',
      sport: 'Football',
      age: 22,
      risk: 'High',
      score: 78,
      lastAssessment: 'Today',
    },
    {
      id: 'ATH-002',
      name: 'Rahul Das',
      sport: 'Basketball',
      age: 21,
      risk: 'Moderate',
      score: 45,
      lastAssessment: 'Yesterday',
    },
    {
      id: 'ATH-003',
      name: 'Aditya Singh',
      sport: 'Athletics',
      age: 20,
      risk: 'Low',
      score: 22,
      lastAssessment: 'Yesterday',
    },
    {
      id: 'ATH-004',
      name: 'Rohan Patel',
      sport: 'Cricket',
      age: 23,
      risk: 'Low',
      score: 18,
      lastAssessment: '2 days ago',
    },
    {
      id: 'ATH-005',
      name: 'Vikram Sharma',
      sport: 'Football',
      age: 24,
      risk: 'Critical',
      score: 91,
      lastAssessment: '2 days ago',
    },
    {
      id: 'ATH-006',
      name: 'Aman Verma',
      sport: 'Tennis',
      age: 22,
      risk: 'Moderate',
      score: 52,
      lastAssessment: '3 days ago',
    },
  ]

  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      const search = searchTerm.toLowerCase().trim()

      const matchesSearch =
        athlete.name.toLowerCase().includes(search) ||
        athlete.id.toLowerCase().includes(search)

      const matchesSport =
        sportFilter === 'All Sports' ||
        athlete.sport === sportFilter

      const matchesRisk =
        riskFilter === 'All Risk Levels' ||
        athlete.risk === riskFilter

      return matchesSearch && matchesSport && matchesRisk
    })
  }, [searchTerm, sportFilter, riskFilter])

  return (
    <div className="dashboard-page">

      <Sidebar />

      <main className="dashboard-main">

        {/* =================================================
            TOPBAR
        ================================================= */}

        <header className="dashboard-topbar">

          <div>
            <p className="dashboard-breadcrumb">
              Management / Athletes
            </p>

            <h1>
              Athletes
            </h1>
          </div>

          <div className="dashboard-user">

            <button
              className="notification-button"
              type="button"
              aria-label="Notifications"
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


        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className="athletes-page-header">

          <div>

            <h2>
              Athlete Management
            </h2>

            <p>
              Manage athlete profiles and monitor their injury risk assessments.
            </p>

          </div>

        </section>


        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="dashboard-stats">

          <div className="dashboard-stat-card">

            <div className="stat-icon blue">
              ♙
            </div>

            <div>
              <span>
                Total Athletes
              </span>

              <strong>
                24
              </strong>

              <small>
                Registered athletes
              </small>
            </div>

          </div>


          <div className="dashboard-stat-card">

            <div className="stat-icon green">
              ✓
            </div>

            <div>
              <span>
                Low Risk
              </span>

              <strong>
                12
              </strong>

              <small>
                50% of athletes
              </small>
            </div>

          </div>


          <div className="dashboard-stat-card">

            <div className="stat-icon orange">
              ⚠
            </div>

            <div>
              <span>
                Moderate Risk
              </span>

              <strong>
                07
              </strong>

              <small>
                Needs monitoring
              </small>
            </div>

          </div>


          <div className="dashboard-stat-card">

            <div className="stat-icon orange">
              !
            </div>

            <div>
              <span>
                High / Critical
              </span>

              <strong>
                05
              </strong>

              <small>
                Needs attention
              </small>
            </div>

          </div>

        </section>


        {/* =================================================
            ATHLETE LIST
        ================================================= */}

        <section className="dashboard-panel athletes-list-panel">

          <div className="panel-header athletes-panel-header">

            <div>

              <h3>
                All Athletes
              </h3>

              <p>
                {filteredAthletes.length} athlete
                {filteredAthletes.length !== 1 ? 's' : ''} found
              </p>

            </div>

          </div>


          {/* =================================================
              SEARCH AND FILTERS
          ================================================= */}

          <div className="athletes-toolbar">

            <div className="athlete-search">

              <span>
                🔍
              </span>

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search athlete by name or ID..."
              />

            </div>


            <select
              className="athlete-filter"
              value={sportFilter}
              onChange={(event) =>
                setSportFilter(event.target.value)
              }
            >

              <option>
                All Sports
              </option>

              <option>
                Football
              </option>

              <option>
                Basketball
              </option>

              <option>
                Athletics
              </option>

              <option>
                Cricket
              </option>

              <option>
                Tennis
              </option>

            </select>


            <select
              className="athlete-filter"
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value)
              }
            >

              <option>
                All Risk Levels
              </option>

              <option>
                Low
              </option>

              <option>
                Moderate
              </option>

              <option>
                High
              </option>

              <option>
                Critical
              </option>

            </select>

          </div>


          {/* =================================================
              TABLE
          ================================================= */}

          <div className="table-responsive">

            <table className="table dashboard-table athletes-table">

              <thead>

                <tr>

                  <th>
                    Athlete
                  </th>

                  <th>
                    Athlete ID
                  </th>

                  <th>
                    Sport
                  </th>

                  <th>
                    Age
                  </th>

                  <th>
                    Risk Score
                  </th>

                  <th>
                    Risk Level
                  </th>

                  <th>
                    Last Assessment
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredAthletes.length > 0 ? (

                  filteredAthletes.map((athlete) => (

                    <tr key={athlete.id}>

                      {/* Athlete */}

                      <td>

                        <div className="athlete-name-cell">

                          <div className="athlete-avatar">
                            {athlete.name.charAt(0)}
                          </div>

                          <strong>
                            {athlete.name}
                          </strong>

                        </div>

                      </td>


                      {/* ID */}

                      <td>
                        {athlete.id}
                      </td>


                      {/* Sport */}

                      <td>
                        {athlete.sport}
                      </td>


                      {/* Age */}

                      <td>
                        {athlete.age}
                      </td>


                      {/* Risk Score */}

                      <td>

                        <strong>
                          {athlete.score}%
                        </strong>

                      </td>


                      {/* Risk Level */}

                      <td>

                        <span
                          className={`risk-status ${athlete.risk.toLowerCase()}-status`}
                        >
                          {athlete.risk}
                        </span>

                      </td>


                      {/* Last Assessment */}

                      <td>
                        {athlete.lastAssessment}
                      </td>


                      {/* Action */}

                      <td>

                        <Link
                          to={`/athletes/${athlete.id}`}
                          className="athlete-view-link"
                        >
                          View
                        </Link>

                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td
                      colSpan="8"
                      className="no-athletes-found"
                    >

                      <div>

                        <strong>
                          No athletes found
                        </strong>

                        <span>
                          Try changing your search or filters.
                        </span>

                      </div>

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>


        {/* =================================================
            BOTTOM INFORMATION
        ================================================= */}

        <section className="dashboard-content-grid athletes-info-grid">


          {/* Risk Guide */}

          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Risk Level Guide
                </h3>

                <p>
                  Understanding athlete risk categories
                </p>

              </div>

            </div>


            <div className="risk-guide">

              <div className="risk-guide-item">

                <span className="risk-guide-dot low-dot"></span>

                <div>

                  <strong>
                    Low
                  </strong>

                  <small>
                    0–30% risk score
                  </small>

                </div>

              </div>


              <div className="risk-guide-item">

                <span className="risk-guide-dot moderate-dot"></span>

                <div>

                  <strong>
                    Moderate
                  </strong>

                  <small>
                    31–60% risk score
                  </small>

                </div>

              </div>


              <div className="risk-guide-item">

                <span className="risk-guide-dot high-dot"></span>

                <div>

                  <strong>
                    High
                  </strong>

                  <small>
                    61–80% risk score
                  </small>

                </div>

              </div>


              <div className="risk-guide-item">

                <span className="risk-guide-dot critical-dot"></span>

                <div>

                  <strong>
                    Critical
                  </strong>

                  <small>
                    81–100% risk score
                  </small>

                </div>

              </div>

            </div>

          </div>


          {/* Athlete Monitoring */}

          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Athlete Monitoring
                </h3>

                <p>
                  Current platform activity
                </p>

              </div>

            </div>


            <div className="monitoring-info">

              <div>

                <span>
                  Active Athletes
                </span>

                <strong>
                  21
                </strong>

              </div>


              <div>

                <span>
                  Needs Assessment
                </span>

                <strong>
                  03
                </strong>

              </div>


              <div>

                <span>
                  Assessments Today
                </span>

                <strong>
                  08
                </strong>

              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  )
}

export default Athletes
