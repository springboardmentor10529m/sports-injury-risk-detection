import { useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import './InjuryHistory.css'

function InjuryHistory() {
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('All Sports')
  const [severityFilter, setSeverityFilter] = useState('All Severity')

  const injuries = [
    {
      id: 1,
      athlete: 'Arjun Kumar',
      athleteId: 'ATH-001',
      sport: 'Football',
      injury: 'ACL Injury',
      date: '12 Aug 2026',
      severity: 'High',
      status: 'Under Recovery',
      recovery: '25 Sep 2026'
    },
    {
      id: 2,
      athlete: 'Rahul Das',
      athleteId: 'ATH-002',
      sport: 'Basketball',
      injury: 'Hamstring Strain',
      date: '08 Aug 2026',
      severity: 'Moderate',
      status: 'Recovering',
      recovery: '22 Aug 2026'
    },
    {
      id: 3,
      athlete: 'Aditya Singh',
      athleteId: 'ATH-003',
      sport: 'Athletics',
      injury: 'Ankle Sprain',
      date: '04 Aug 2026',
      severity: 'Low',
      status: 'Recovered',
      recovery: '14 Aug 2026'
    },
    {
      id: 4,
      athlete: 'Rohan Patel',
      athleteId: 'ATH-004',
      sport: 'Cricket',
      injury: 'Shoulder Strain',
      date: '01 Aug 2026',
      severity: 'Low',
      status: 'Recovered',
      recovery: '10 Aug 2026'
    },
    {
      id: 5,
      athlete: 'Vikram Sharma',
      athleteId: 'ATH-005',
      sport: 'Football',
      injury: 'Knee Injury',
      date: '28 Jul 2026',
      severity: 'Critical',
      status: 'Under Treatment',
      recovery: '30 Sep 2026'
    },
    {
      id: 6,
      athlete: 'Aman Verma',
      athleteId: 'ATH-006',
      sport: 'Tennis',
      injury: 'Lower Back Pain',
      date: '25 Jul 2026',
      severity: 'Moderate',
      status: 'Recovering',
      recovery: '20 Aug 2026'
    }
  ]

  const filteredInjuries = useMemo(() => {
    return injuries.filter((item) => {
      const matchesSearch =
        item.athlete.toLowerCase().includes(search.toLowerCase()) ||
        item.athleteId.toLowerCase().includes(search.toLowerCase()) ||
        item.injury.toLowerCase().includes(search.toLowerCase())

      const matchesSport =
        sportFilter === 'All Sports' ||
        item.sport === sportFilter

      const matchesSeverity =
        severityFilter === 'All Severity' ||
        item.severity === severityFilter

      return matchesSearch && matchesSport && matchesSeverity
    })
  }, [search, sportFilter, severityFilter])

  const getInitial = (name) => name.charAt(0).toUpperCase()

  const getSeverityClass = (severity) => severity.toLowerCase()

  const getStatusClass = (status) => {
    if (status === 'Recovered') return 'recovered'
    if (status === 'Under Treatment') return 'treatment'
    return 'recovering'
  }

  return (
    <div className="dashboard-page">

      <Sidebar />

      <main className="dashboard-main">

        <header className="dashboard-topbar">

          <div>
            <p className="dashboard-breadcrumb">
              Management / Injury History
            </p>

            <h1>
              Injury History
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
              S
            </div>

            <div className="user-info">
              <strong>
                Soumyajit
              </strong>

              <small>
                Coach
              </small>
            </div>

          </div>

        </header>


        <div className="dashboard-content">

          <div className="page-heading-row">

            <div>
              <h2 className="page-main-title">
                Injury History
              </h2>

              <p className="page-main-description">
                Track athlete injuries, severity and recovery progress.
              </p>
            </div>

          </div>


          <div className="row g-4 mb-4">

            <div className="col-md-6 col-xl-3">
              <div className="dashboard-stat-card">
                <span>🔴</span>
                <strong>06</strong>
                <small>Total Injuries</small>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="dashboard-stat-card">
                <span>⚠️</span>
                <strong>03</strong>
                <small>Active Cases</small>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="dashboard-stat-card">
                <span>✓</span>
                <strong>02</strong>
                <small>Recovered Athletes</small>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="dashboard-stat-card">
                <span>!</span>
                <strong>02</strong>
                <small>High / Critical</small>
              </div>
            </div>

          </div>


          <section className="dashboard-panel">

            <div className="panel-header">

              <div>
                <h3>
                  All Injury Records
                </h3>

                <p>
                  Complete history of recorded athlete injuries.
                </p>
              </div>

            </div>


            <div className="injury-filters">

              <div className="injury-search">

                <span>🔍</span>

                <input
                  type="text"
                  placeholder="Search athlete, ID or injury..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

              </div>

              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
              >
                <option>All Sports</option>
                <option>Football</option>
                <option>Basketball</option>
                <option>Athletics</option>
                <option>Cricket</option>
                <option>Tennis</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option>All Severity</option>
                <option>Low</option>
                <option>Moderate</option>
                <option>High</option>
                <option>Critical</option>
              </select>

            </div>


            <div className="table-responsive">

              <table className="dashboard-table injury-table">

                <thead>
                  <tr>
                    <th>Athlete</th>
                    <th>Sport</th>
                    <th>Injury Type</th>
                    <th>Injury Date</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Recovery Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredInjuries.length > 0 ? (

                    filteredInjuries.map((item) => (

                      <tr key={item.id}>

                        <td>

                          <div className="athlete-table-name">

                            <span className="athlete-initial">
                              {getInitial(item.athlete)}
                            </span>

                            <div>
                              <strong>{item.athlete}</strong>
                              <small>{item.athleteId}</small>
                            </div>

                          </div>

                        </td>

                        <td>{item.sport}</td>

                        <td>
                          <strong>{item.injury}</strong>
                        </td>

                        <td>{item.date}</td>

                        <td>
                          <span
                            className={`injury-severity ${getSeverityClass(
                              item.severity
                            )}`}
                          >
                            {item.severity}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`injury-status ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td>{item.recovery}</td>

                        <td>
                          <button
                            className="injury-view-button"
                            type="button"
                          >
                            View
                          </button>
                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-5"
                      >
                        No injury records found.
                      </td>
                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>

        </div>

      </main>

    </div>
  )
}

export default InjuryHistory