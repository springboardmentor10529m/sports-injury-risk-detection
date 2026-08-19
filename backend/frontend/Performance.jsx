import "./Performance.css";

function Performance() {
  return (
    <main className="performance-page">
      <div className="performance-container">

        {/* HEADER */}
        <section className="performance-header">
          <div>
            <span className="performance-kicker">
              PERFORMANCE CENTER
            </span>

            <h1>Track your progress.</h1>

            <p>
              Monitor your athletic performance and understand how
              your training is changing over time.
            </p>
          </div>

          <div className="performance-status">
            <span className="status-dot"></span>
            Performance tracking active
          </div>
        </section>

        {/* PERFORMANCE SUMMARY */}
        <section className="performance-stats">

          <div className="performance-stat-card">
            <div className="stat-icon blue">📊</div>

            <span>Overall Performance</span>

            <strong>78%</strong>

            <small>
              <b>↑ 8%</b> from last session
            </small>
          </div>

          <div className="performance-stat-card">
            <div className="stat-icon green">💪</div>

            <span>Strength</span>

            <strong>80%</strong>

            <small>
              <b>Good</b> current level
            </small>
          </div>

          <div className="performance-stat-card">
            <div className="stat-icon purple">⚖️</div>

            <span>Balance</span>

            <strong>82%</strong>

            <small>
              <b>Excellent</b> stability
            </small>
          </div>

          <div className="performance-stat-card">
            <div className="stat-icon orange">🏃</div>

            <span>Endurance</span>

            <strong>72%</strong>

            <small>
              <b>+5%</b> this month
            </small>
          </div>

        </section>

        {/* CHART */}
        <section className="performance-card">

          <div className="performance-card-header">
            <div>
              <h2>Weekly performance</h2>

              <p>
                Your performance score over the last seven sessions.
              </p>
            </div>

            <select defaultValue="7">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>

          <div className="chart">

            <div className="chart-y-axis">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>

            <div className="chart-area">

              <div className="chart-grid">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="bars">

                <div className="bar-wrapper">
                  <div
                    className="bar"
                    style={{ height: "62%" }}
                  ></div>
                  <span>Mon</span>
                </div>

                <div className="bar-wrapper">
                  <div
                    className="bar"
                    style={{ height: "80%" }}
                  ></div>
                  <span>Tue</span>
                </div>

                <div className="bar-wrapper">
                  <div
                    className="bar"
                    style={{ height: "70%" }}
                  ></div>
                  <span>Wed</span>
                </div>

                <div className="bar-wrapper">
                  <div
                    className="bar"
                    style={{ height: "94%" }}
                  ></div>
                  <span>Thu</span>
                </div>

                <div className="bar-wrapper">
                  <div
                    className="bar"
                    style={{ height: "84%" }}
                  ></div>
                  <span>Fri</span>
                </div>

                <div className="bar-wrapper">
                  <div
                    className="bar"
                    style={{ height: "100%" }}
                  ></div>
                  <span>Sat</span>
                </div>

                <div className="bar-wrapper today">
                  <div
                    className="bar"
                    style={{ height: "92%" }}
                  ></div>
                  <span>Today</span>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="performance-card">

          <div className="performance-card-header">
            <div>
              <h2>Physical performance</h2>

              <p>
                Your current athletic capability scores.
              </p>
            </div>
          </div>

          <div className="metric-list">

            <div className="performance-metric">
              <div className="metric-info">
                <span>Strength</span>
                <strong>80%</strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: "80%" }}
                ></div>
              </div>
            </div>

            <div className="performance-metric">
              <div className="metric-info">
                <span>Flexibility</span>
                <strong>75%</strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: "75%" }}
                ></div>
              </div>
            </div>

            <div className="performance-metric">
              <div className="metric-info">
                <span>Balance</span>
                <strong>82%</strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: "82%" }}
                ></div>
              </div>
            </div>

            <div className="performance-metric">
              <div className="metric-info">
                <span>Endurance</span>
                <strong>72%</strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: "72%" }}
                ></div>
              </div>
            </div>

          </div>
        </section>

        {/* INSIGHT */}
        <section className="performance-insight">

          <div className="insight-icon">💡</div>

          <div>
            <span>PERFORMANCE INSIGHT</span>

            <h3>
              Your performance is trending positively.
            </h3>

            <p>
              Your overall performance has improved compared with
              your previous sessions. Keep maintaining a balanced
              combination of strength, flexibility and recovery.
            </p>
          </div>

        </section>

      </div>
    </main>
  );
}

export default Performance;