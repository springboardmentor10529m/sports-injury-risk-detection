import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import './AthletePages.css'

const defaultAthletes = {
  'ATH-001': {
    id: 'ATH-001',
    name: 'Arjun Kumar',
    sport: 'Football',
    age: 22,
    gender: 'Male',
    height: '178 cm',
    weight: '72 kg',
    risk: 'High',
    score: 78,
    lastAssessment: 'Today',
    activity: 'Running',
  },

  'ATH-002': {
    id: 'ATH-002',
    name: 'Rahul Das',
    sport: 'Basketball',
    age: 21,
    gender: 'Male',
    height: '181 cm',
    weight: '75 kg',
    risk: 'Moderate',
    score: 45,
    lastAssessment: 'Yesterday',
    activity: 'Jumping',
  },

  'ATH-003': {
    id: 'ATH-003',
    name: 'Aditya Singh',
    sport: 'Athletics',
    age: 20,
    gender: 'Male',
    height: '175 cm',
    weight: '68 kg',
    risk: 'Low',
    score: 22,
    lastAssessment: 'Yesterday',
    activity: 'Sprinting',
  },

  'ATH-004': {
    id: 'ATH-004',
    name: 'Rohan Patel',
    sport: 'Cricket',
    age: 23,
    gender: 'Male',
    height: '179 cm',
    weight: '71 kg',
    risk: 'Low',
    score: 18,
    lastAssessment: '2 days ago',
    activity: 'Batting',
  },

  'ATH-005': {
    id: 'ATH-005',
    name: 'Vikram Sharma',
    sport: 'Football',
    age: 24,
    gender: 'Male',
    height: '182 cm',
    weight: '79 kg',
    risk: 'Critical',
    score: 91,
    lastAssessment: '2 days ago',
    activity: 'Running',
  },

  'ATH-006': {
    id: 'ATH-006',
    name: 'Aman Verma',
    sport: 'Tennis',
    age: 22,
    gender: 'Male',
    height: '176 cm',
    weight: '70 kg',
    risk: 'Moderate',
    score: 52,
    lastAssessment: '3 days ago',
    activity: 'Serving',
  },
}

function AthleteProfile() {
  const { id } = useParams()

  const [athlete, setAthlete] = useState(null)

  useEffect(() => {
    if (defaultAthletes[id]) {
      setAthlete(defaultAthletes[id])
      return
    }

    const savedAthletes =
      JSON.parse(localStorage.getItem('athletes')) || []

    const savedAthlete =
      savedAthletes.find(
        (item) => item.id === id
      )

    if (savedAthlete) {
      setAthlete(savedAthlete)
    } else {
      setAthlete(null)
    }

  }, [id])

  if (!athlete) {
    return (
      <div className="dashboard-page">

        <Sidebar />

        <main className="dashboard-main">

          <header className="dashboard-topbar">

            <div>

              <p className="dashboard-breadcrumb">
                Management / Athletes / Profile
              </p>

              <h1>
                Athlete Profile
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

            <div className="dashboard-panel">

              <h3>
                Athlete Not Found
              </h3>

              <p>
                No athlete profile was found for ID:
                {' '}
                <strong>{id}</strong>
              </p>

              <Link
                to="/athletes"
                className="btn btn-primary"
              >
                ← Back to Athletes
              </Link>

            </div>

          </div>

        </main>

      </div>
    )
  }

  const riskClass =
    athlete.risk?.toLowerCase() || 'low'

  return (
    <div className="dashboard-page">

      <Sidebar />

      <main className="dashboard-main">

        {/* TOPBAR */}

        <header className="dashboard-topbar">

          <div>

            <p className="dashboard-breadcrumb">
              Management / Athletes / Profile
            </p>

            <h1>
              Athlete Profile
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


        {/* BACK */}

        <div className="profile-back">

          <Link to="/athletes">
            ← Back to Athletes
          </Link>

        </div>


        {/* PROFILE HEADER */}

        <section className="profile-header-card">

          <div className="profile-main-info">

            <div className="profile-large-avatar">
              {athlete.name?.charAt(0).toUpperCase()}
            </div>


            <div>

              <p className="profile-id">
                {athlete.id}
              </p>

              <h2>
                {athlete.name}
              </h2>

              <p className="profile-sport">
                {athlete.sport} · {athlete.age} years old
              </p>

            </div>

          </div>


          <div className="profile-header-actions">

            <span
              className={`risk-status ${riskClass}-status`}
            >
              {athlete.risk} Risk
            </span>


            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                alert(
                  `New analysis will be started for ${athlete.name}.`
                )
              }}
            >
              New Analysis
            </button>

          </div>

        </section>


        {/* PROFILE INFORMATION */}

        <section className="dashboard-content-grid profile-grid">

          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Personal Information
                </h3>

                <p>
                  Athlete profile details
                </p>

              </div>

            </div>


            <div className="profile-details-grid">

              <div>
                <span>Full Name</span>
                <strong>{athlete.name}</strong>
              </div>

              <div>
                <span>Athlete ID</span>
                <strong>{athlete.id}</strong>
              </div>

              <div>
                <span>Sport</span>
                <strong>{athlete.sport}</strong>
              </div>

              <div>
                <span>Age</span>
                <strong>{athlete.age} years</strong>
              </div>

              <div>
                <span>Gender</span>
                <strong>
                  {athlete.gender || 'Not specified'}
                </strong>
              </div>

              <div>
                <span>Height</span>
                <strong>
                  {athlete.height || 'Not specified'}
                </strong>
              </div>

              <div>
                <span>Weight</span>
                <strong>
                  {athlete.weight || 'Not specified'}
                </strong>
              </div>

              <div>
                <span>Latest Activity</span>
                <strong>
                  {athlete.activity || 'Not available'}
                </strong>
              </div>

            </div>

          </div>


          {/* OVERALL RISK */}

          <div className="dashboard-panel profile-risk-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Overall Risk
                </h3>

                <p>
                  Latest assessment score
                </p>

              </div>


              <span
                className={`risk-status ${riskClass}-status`}
              >
                {athlete.risk}
              </span>

            </div>


            <div className="profile-risk-score">
              {athlete.score}%
            </div>


            <p className="profile-risk-description">

              Current injury risk score based on the latest
              movement and performance assessment.

            </p>


            <div className="profile-risk-progress">

              <div
                className={`profile-risk-progress-bar ${riskClass}`}
                style={{
                  width: `${athlete.score}%`,
                }}
              ></div>

            </div>


            <div className="profile-risk-labels">

              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
              <span>Critical</span>

            </div>

          </div>

        </section>


        {/* INJURY RISK BREAKDOWN */}

        <section className="dashboard-panel">

          <div className="panel-header">

            <div>

              <h3>
                Injury Risk Breakdown
              </h3>

              <p>
                Current prediction scores by injury type
              </p>

            </div>

          </div>


          <div className="profile-injury-list">

            <div className="profile-injury-item">

              <div className="profile-injury-heading">

                <span>
                  ACL
                </span>

                <strong>
                  {athlete.score}%
                </strong>

              </div>


              <div className="profile-injury-bar">

                <div
                  className="injury-high"
                  style={{
                    width: `${athlete.score}%`,
                  }}
                ></div>

              </div>

            </div>


            <div className="profile-injury-item">

              <div className="profile-injury-heading">

                <span>
                  Hamstring
                </span>

                <strong>
                  {Math.max(
                    0,
                    athlete.score - 17
                  )}%
                </strong>

              </div>


              <div className="profile-injury-bar">

                <div
                  className="injury-moderate"
                  style={{
                    width: `${Math.max(
                      0,
                      athlete.score - 17
                    )}%`,
                  }}
                ></div>

              </div>

            </div>


            <div className="profile-injury-item">

              <div className="profile-injury-heading">

                <span>
                  Ankle
                </span>

                <strong>
                  {Math.max(
                    0,
                    athlete.score - 36
                  )}%
                </strong>

              </div>


              <div className="profile-injury-bar">

                <div
                  className="injury-moderate"
                  style={{
                    width: `${Math.max(
                      0,
                      athlete.score - 36
                    )}%`,
                  }}
                ></div>

              </div>

            </div>


            <div className="profile-injury-item">

              <div className="profile-injury-heading">

                <span>
                  Shoulder
                </span>

                <strong>
                  {Math.max(
                    0,
                    athlete.score - 51
                  )}%
                </strong>

              </div>


              <div className="profile-injury-bar">

                <div
                  className="injury-low"
                  style={{
                    width: `${Math.max(
                      0,
                      athlete.score - 51
                    )}%`,
                  }}
                ></div>

              </div>

            </div>

          </div>

        </section>


        {/* LATEST ASSESSMENT */}

        <section className="dashboard-panel profile-assessment-panel">

          <div className="panel-header">

            <div>

              <h3>
                Latest Assessment
              </h3>

              <p>
                Most recent movement assessment
              </p>

            </div>


            <span className="analysis-status completed">

              {athlete.lastAssessment === 'Not assessed'
                ? 'Pending'
                : 'Completed'}

            </span>

          </div>


          <div className="assessment-info-grid">

            <div>

              <span>
                Activity
              </span>

              <strong>
                {athlete.activity || 'Not available'}
              </strong>

            </div>


            <div>

              <span>
                Risk Score
              </span>

              <strong>
                {athlete.score}%
              </strong>

            </div>


            <div>

              <span>
                Risk Level
              </span>

              <strong>
                {athlete.risk}
              </strong>

            </div>


            <div>

              <span>
                Assessment Date
              </span>

              <strong>
                {athlete.lastAssessment}
              </strong>

            </div>

          </div>

        </section>

      </main>

    </div>
  )
}

export default AthleteProfile