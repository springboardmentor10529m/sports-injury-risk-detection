import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js'

import Sidebar from '../components/Sidebar'
import './Dashboard.css'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
)

function Dashboard() {

  /* =====================================================
     SAMPLE DATA
  ===================================================== */

  const riskDistributionData = {
    labels: ['Low', 'Moderate', 'High', 'Critical'],
    datasets: [
      {
        data: [12, 7, 4, 1],
        backgroundColor: [
          '#16a34a',
          '#f59e0b',
          '#f97316',
          '#dc2626'
        ],
        borderWidth: 0,
        hoverOffset: 6
      }
    ]
  }

  const riskDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',

    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true
      }
    }
  }

  const injuryRiskData = {
    labels: [
      'ACL',
      'Hamstring',
      'Ankle',
      'Shoulder',
      'Lower Back',
      'Overuse'
    ],

    datasets: [
      {
        label: 'Risk Score',

        data: [78, 61, 42, 27, 55, 64],

        backgroundColor: [
          '#f97316',
          '#f59e0b',
          '#f59e0b',
          '#16a34a',
          '#f59e0b',
          '#f97316'
        ],

        borderRadius: 6,

        barThickness: 30
      }
    ]
  }

  const injuryRiskOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false
      },

      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.raw}%`
          }
        }
      }
    },

    scales: {
      x: {
        grid: {
          display: false
        },

        ticks: {
          color: '#64748b',
          font: {
            size: 11
          }
        }
      },

      y: {
        beginAtZero: true,
        max: 100,

        ticks: {
          stepSize: 10,

          callback: function (value) {
            return `${value}%`
          },

          color: '#64748b',

          font: {
            size: 11
          }
        },

        grid: {
          color: '#e2e8f0'
        }
      }
    }
  }

  return (
    <div className="dashboard-page">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar />


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="dashboard-main">


        {/* =====================================================
            TOPBAR
        ===================================================== */}

        <header className="dashboard-topbar">

          <div>

            <p className="dashboard-breadcrumb">
              Dashboard
            </p>

            <h1>
              Overview
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



        {/* =====================================================
            DASHBOARD CONTENT
        ===================================================== */}

        <div className="dashboard-content">


          {/* =====================================================
              WELCOME
          ===================================================== */}

          <section className="dashboard-welcome">

            <div>

              <h2>
                Good afternoon, Soumyajit 👋
              </h2>

              <p>
                Here's an overview of your sports injury risk
                assessment and performance.
              </p>

            </div>


            <button
              className="primary-button"
              type="button"
            >
              + New Analysis
            </button>

          </section>



          {/* =====================================================
              STATISTICS
          ===================================================== */}

          <section className="dashboard-stats">


            {/* Total Athletes */}

            <div className="stat-card">

              <div className="stat-icon blue">
                ♟
              </div>

              <div className="stat-content">

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


            {/* Total Analyses */}

            <div className="stat-card">

              <div className="stat-icon cyan">
                ◎
              </div>

              <div className="stat-content">

                <span>
                  Total Analyses
                </span>

                <strong>
                  86
                </strong>

                <small>
                  Movement assessments
                </small>

              </div>

            </div>


            {/* High Risk */}

            <div className="stat-card">

              <div className="stat-icon orange">
                ⚠
              </div>

              <div className="stat-content">

                <span>
                  High Risk Cases
                </span>

                <strong>
                  05
                </strong>

                <small>
                  Need attention
                </small>

              </div>

            </div>


            {/* Completed */}

            <div className="stat-card">

              <div className="stat-icon green">
                ✓
              </div>

              <div className="stat-content">

                <span>
                  Completed
                </span>

                <strong>
                  81
                </strong>

                <small>
                  Completed analyses
                </small>

              </div>

            </div>

          </section>



          {/* =====================================================
              CHARTS
          ===================================================== */}

          <section className="dashboard-chart-grid">


            {/* =================================================
                INJURY RISK DISTRIBUTION
            ================================================= */}

            <div className="dashboard-panel chart-panel">

              <div className="panel-header">

                <div>

                  <h3>
                    Injury Risk Distribution
                  </h3>

                  <p>
                    Current athlete risk levels
                  </p>

                </div>


                <button
                  className="period-button"
                  type="button"
                >
                  This Month ▾
                </button>

              </div>


              <div className="risk-distribution-layout">


                {/* Doughnut Chart */}

                <div className="doughnut-wrapper">

                  <Doughnut
                    data={riskDistributionData}
                    options={riskDistributionOptions}
                  />


                  <div className="doughnut-center">

                    <strong>
                      24
                    </strong>

                    <span>
                      Athletes
                    </span>

                  </div>

                </div>


                {/* Legend */}

                <div className="risk-legend">


                  <div className="risk-legend-item">

                    <span className="legend-dot low"></span>

                    <strong>
                      Low
                    </strong>

                    <small>
                      12 athletes
                    </small>

                  </div>


                  <div className="risk-legend-item">

                    <span className="legend-dot moderate"></span>

                    <strong>
                      Moderate
                    </strong>

                    <small>
                      07 athletes
                    </small>

                  </div>


                  <div className="risk-legend-item">

                    <span className="legend-dot high"></span>

                    <strong>
                      High
                    </strong>

                    <small>
                      04 athletes
                    </small>

                  </div>


                  <div className="risk-legend-item">

                    <span className="legend-dot critical"></span>

                    <strong>
                      Critical
                    </strong>

                    <small>
                      01 athlete
                    </small>

                  </div>

                </div>

              </div>

            </div>



            {/* =================================================
                INJURY RISK BY TYPE
            ================================================= */}

            <div className="dashboard-panel chart-panel">

              <div className="panel-header">

                <div>

                  <h3>
                    Injury Risk by Type
                  </h3>

                  <p>
                    Current prediction scores
                  </p>

                </div>

              </div>


              <div className="bar-chart-wrapper">

                <Bar
                  data={injuryRiskData}
                  options={injuryRiskOptions}
                />

              </div>

            </div>

          </section>



          {/* =====================================================
              ALERTS + OVERALL RISK
          ===================================================== */}

          <section className="dashboard-lower-grid">


            {/* =================================================
                RECENT ALERTS
            ================================================= */}

            <div className="dashboard-panel alerts-panel">

              <div className="panel-header">

                <div>

                  <h3>
                    Recent Alerts
                  </h3>

                  <p>
                    Latest risk notifications
                  </p>

                </div>

                <button
                  className="text-button"
                  type="button"
                >
                  View All
                </button>

              </div>


              <div className="alert-list">


                {/* High Risk */}

                <div className="alert-item danger">

                  <div className="alert-icon">
                    !
                  </div>

                  <div className="alert-text">

                    <strong>
                      High injury risk detected
                    </strong>

                    <span>
                      Athlete assessment requires attention
                    </span>

                  </div>

                  <small>
                    10m
                  </small>

                </div>


                {/* Moderate Risk */}

                <div className="alert-item warning">

                  <div className="alert-icon">
                    !
                  </div>

                  <div className="alert-text">

                    <strong>
                      Moderate risk assessment
                    </strong>

                    <span>
                      Movement quality needs monitoring
                    </span>

                  </div>

                  <small>
                    1h
                  </small>

                </div>


                {/* Completed */}

                <div className="alert-item success">

                  <div className="alert-icon">
                    ✓
                  </div>

                  <div className="alert-text">

                    <strong>
                      Analysis completed
                    </strong>

                    <span>
                      Movement analysis is ready
                    </span>

                  </div>

                  <small>
                    3h
                  </small>

                </div>

              </div>

            </div>



            {/* =================================================
                OVERALL RISK
            ================================================= */}

            <div className="dashboard-panel overall-risk-panel">

              <div className="panel-header">

                <div>

                  <h3>
                    Overall Risk
                  </h3>

                  <p>
                    Current assessment score
                  </p>

                </div>

                <span className="risk-status-high">
                  HIGH
                </span>

              </div>


              <div className="overall-risk-content">

                <strong>
                  78%
                </strong>

                <span>
                  Overall injury risk score
                </span>


                <div className="overall-risk-progress">

                  <div
                    style={{
                      width: '78%'
                    }}
                  ></div>

                </div>


                <div className="risk-scale">

                  <span>
                    Low
                  </span>

                  <span>
                    Moderate
                  </span>

                  <span>
                    High
                  </span>

                  <span>
                    Critical
                  </span>

                </div>

              </div>

            </div>

          </section>



          {/* =====================================================
              RECENT ACTIVITY
          ===================================================== */}

          <section className="dashboard-panel recent-activity">

            <div className="panel-header">

              <div>

                <h3>
                  Recent Activity
                </h3>

                <p>
                  Latest movement assessments
                </p>

              </div>

              <button
                className="text-button"
                type="button"
              >
                View All
              </button>

            </div>


            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      Athlete
                    </th>

                    <th>
                      Activity
                    </th>

                    <th>
                      Risk Score
                    </th>

                    <th>
                      Risk Level
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Date
                    </th>

                  </tr>

                </thead>


                <tbody>


                  <tr>

                    <td>
                      <strong>
                        Arjun Kumar
                      </strong>
                    </td>

                    <td>
                      Running
                    </td>

                    <td>
                      78%
                    </td>

                    <td>
                      <span className="table-risk high">
                        High
                      </span>
                    </td>

                    <td>
                      <span className="table-status completed">
                        Completed
                      </span>
                    </td>

                    <td>
                      Today
                    </td>

                  </tr>


                  <tr>

                    <td>
                      <strong>
                        Rahul Das
                      </strong>
                    </td>

                    <td>
                      Jumping
                    </td>

                    <td>
                      45%
                    </td>

                    <td>
                      <span className="table-risk moderate">
                        Moderate
                      </span>
                    </td>

                    <td>
                      <span className="table-status completed">
                        Completed
                      </span>
                    </td>

                    <td>
                      Yesterday
                    </td>

                  </tr>


                  <tr>

                    <td>
                      <strong>
                        Aditya Singh
                      </strong>
                    </td>

                    <td>
                      Sprinting
                    </td>

                    <td>
                      22%
                    </td>

                    <td>
                      <span className="table-risk low">
                        Low
                      </span>
                    </td>

                    <td>
                      <span className="table-status processing">
                        Processing
                      </span>
                    </td>

                    <td>
                      Yesterday
                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          </section>

        </div>

      </main>

    </div>
  )
}

export default Dashboard