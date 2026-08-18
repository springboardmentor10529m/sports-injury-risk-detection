import {
  Activity,
  ShieldCheck,
  TrendingUp,
  HeartPulse,
  Upload,
  ArrowUpRight,
  Target,
  Dumbbell,
  AlertTriangle,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import { getDashboardData } from "../../api/dashboard";


/* =====================================================
   MAIN DASHBOARD
===================================================== */

function Dashboard({ role = "athlete" }) {

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    async function loadDashboard() {

      try {

        const data = await getDashboardData();

        console.log("KINETIQ backend response:", data);

        setDashboardData(data);

      } catch (err) {

        console.error("Dashboard error:", err);

        setError(
          err?.message || "Unable to load dashboard data."
        );

      } finally {

        setLoading(false);

      }

    }

    loadDashboard();

  }, []);


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {

    return (
      <div className="dashboard-loading">
        LOADING KINETIQ DATA...
      </div>
    );

  }


  /* =====================================================
     ERROR
  ===================================================== */

  if (error) {

    return (
      <div className="dashboard-error">

        <h2>
          Unable to load dashboard
        </h2>

        <p>
          {error}
        </p>

        <button
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          RETRY
        </button>

      </div>
    );

  }


  /* =====================================================
     NORMALIZE ROLE
  ===================================================== */

  const normalizedRole =
    role === "sports_scientist"
      ? "sports-scientist"
      : role;


  /* =====================================================
     ROLE DASHBOARDS
  ===================================================== */

  switch (normalizedRole) {

    case "athlete":
      return (
        <AthleteDashboard data={dashboardData} />
      );

    case "coach":
      return (
        <CoachDashboard data={dashboardData} />
      );

    case "physiotherapist":
      return (
        <PhysiotherapistDashboard data={dashboardData} />
      );

    case "sports-scientist":
      return (
        <SportsScientistDashboard data={dashboardData} />
      );

    case "administrator":
      return (
        <AdminDashboard data={dashboardData} />
      );

    default:
      return (
        <AthleteDashboard data={dashboardData} />
      );
  }
}


/* =====================================================
   DASHBOARD HEADER
===================================================== */

function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  description,
}) {

  const navigate = useNavigate();

  return (
    <section className="dashboard-header">

      <div>

        <p className="eyebrow">
          {eyebrow}
        </p>

        <h1>
          {title}

          <br />

          <span>
            {subtitle}
          </span>
        </h1>

        <p className="dashboard-description">
          {description}
        </p>

      </div>


      <button
        className="primary-button"
        onClick={() => navigate("/upload")}
      >
        <Upload size={17} />

        UPLOAD VIDEO
      </button>

    </section>
  );
}


/* =====================================================
   ATHLETE DASHBOARD
===================================================== */

function AthleteDashboard({ data }) {

  const stats = data?.stats || {};

  return (
    <DashboardLayout role="athlete">

      <DashboardHeader
        eyebrow="ATHLETE WORKSPACE"
        title="Good morning."
        subtitle="Here's your movement overview."
        description="Monitor your movement quality, injury risk and training performance."
      />


      <section className="stats-grid">

        <StatCard
          title="INJURY RISK"
          value={
            stats.injury_risk
              ? String(stats.injury_risk).toUpperCase()
              : "--"
          }
          description="Current injury risk"
          status="good"
          icon={<ShieldCheck size={18} />}
        />


        <StatCard
          title="MOVEMENT SCORE"
          value={stats.movement_score ?? "--"}
          unit="/100"
          description="Current movement score"
          status="good"
          icon={<Activity size={18} />}
        />


        <StatCard
          title="FATIGUE LEVEL"
          value={stats.fatigue_level ?? "--"}
          unit="%"
          description="Current fatigue level"
          status="normal"
          icon={<HeartPulse size={18} />}
        />


        <StatCard
          title="TRAINING LOAD"
          value={stats.training_load ?? "--"}
          unit="%"
          description="Current weekly training load"
          status="good"
          icon={<Dumbbell size={18} />}
        />

      </section>


      <section className="dashboard-grid">

        <MovementOverview
          movementScore={stats.movement_score}
        />

        <RiskOverview
          risk={stats.injury_risk}
          fatigue={stats.fatigue_level}
        />

      </section>


      <section className="dashboard-grid">

        <TrainingOverview
          data={data}
        />

        <Recommendations />

      </section>


      <RecentSessions />

    </DashboardLayout>
  );
}


/* =====================================================
   COACH DASHBOARD
===================================================== */

function CoachDashboard({ data }) {

  const stats = data?.stats || {};

  return (
    <DashboardLayout role="coach">

      <DashboardHeader
        eyebrow="COACH WORKSPACE"
        title="Team overview."
        subtitle="Monitor your athletes."
        description="Track team performance, injury risk and training load."
      />


      <section className="stats-grid">

        <StatCard
          title="ATHLETES"
          value={stats.athletes ?? 0}
          description="Active athletes"
          icon={<Target size={18} />}
        />


        <StatCard
          title="HIGH RISK"
          value={
            stats.high_risk !== undefined
              ? String(stats.high_risk).padStart(2, "0")
              : "00"
          }
          description="Athletes require attention"
          icon={<AlertTriangle size={18} />}
        />


        <StatCard
          title="AVG MOVEMENT"
          value={stats.movement_score ?? 0}
          unit="/100"
          description="Team average"
          icon={<Activity size={18} />}
        />


        <StatCard
          title="TRAINING LOAD"
          value={stats.training_load ?? 0}
          unit="%"
          description="Team average"
          icon={<Dumbbell size={18} />}
        />

      </section>


      <section className="dashboard-grid">

        <TeamRiskOverview
          highRisk={stats.high_risk}
          athletes={stats.athletes}
        />

        <TrainingLoad
          data={data}
        />

      </section>


      <AthleteTable />

    </DashboardLayout>
  );
}


/* =====================================================
   PHYSIOTHERAPIST DASHBOARD
===================================================== */

function PhysiotherapistDashboard({ data }) {

  const stats = data?.stats || {};

  return (
    <DashboardLayout role="physiotherapist">

      <DashboardHeader
        eyebrow="PHYSIOTHERAPIST WORKSPACE"
        title="Recovery overview."
        subtitle="Track athlete rehabilitation."
        description="Monitor injury history, recovery progress and corrective exercises."
      />


      <section className="stats-grid">

        <StatCard
          title="ATHLETES"
          value={stats.athletes ?? 0}
          description="Active rehabilitation cases"
          icon={<Target size={18} />}
        />


        <StatCard
          title="HIGH RISK"
          value={
            stats.high_risk !== undefined
              ? String(stats.high_risk).padStart(2, "0")
              : "00"
          }
          description="Requires immediate review"
          icon={<AlertTriangle size={18} />}
        />


        <StatCard
          title="RECOVERY"
          value={stats.recovery ?? 0}
          unit="%"
          description="Average recovery progress"
          icon={<HeartPulse size={18} />}
        />


        <StatCard
          title="ASSESSMENTS"
          value={
            stats.assessments !== undefined
              ? String(stats.assessments).padStart(2, "0")
              : "00"
          }
          description="Pending assessments"
          icon={<Activity size={18} />}
        />

      </section>


      <section className="dashboard-grid">

        <RecoveryOverview
          data={data}
        />

        <RiskOverview
          risk={stats.injury_risk}
          fatigue={stats.fatigue_level}
        />

      </section>


      <section className="dashboard-panel">

        <div className="panel-header">

          <div>

            <span className="panel-label">
              RECOVERY MANAGEMENT
            </span>

            <h2>
              Active Recovery Plans
            </h2>

          </div>


          <button className="panel-action">
            View All
            <ArrowUpRight size={15} />
          </button>

        </div>


        <div className="recovery-list">

          <RecoveryItem
            athlete="Athlete #104"
            injury="Knee strain"
            progress="78%"
            status="On Track"
          />

          <RecoveryItem
            athlete="Athlete #118"
            injury="Ankle injury"
            progress="54%"
            status="Monitoring"
          />

          <RecoveryItem
            athlete="Athlete #121"
            injury="Hamstring strain"
            progress="91%"
            status="On Track"
          />

        </div>

      </section>

    </DashboardLayout>
  );
}


/* =====================================================
   SPORTS SCIENTIST DASHBOARD
===================================================== */

function SportsScientistDashboard({ data }) {

  const stats = data?.stats || {};

  return (
    <DashboardLayout role="sports-scientist">

      <DashboardHeader
        eyebrow="SPORTS SCIENCE WORKSPACE"
        title="Performance intelligence."
        subtitle="Analyze movement and training data."
        description="Explore biomechanical trends, fatigue indicators and performance analytics."
      />


      <section className="stats-grid">

        <StatCard
          title="ATHLETES ANALYZED"
          value={stats.athletes_analyzed ?? 0}
          description="Across active teams"
          icon={<Target size={18} />}
        />


        <StatCard
          title="AVG MOVEMENT"
          value={stats.movement_score ?? 0}
          unit="/100"
          description="Team average"
          icon={<Activity size={18} />}
        />


        <StatCard
          title="FATIGUE INDEX"
          value={stats.fatigue_level ?? 0}
          unit="%"
          description="Team average"
          icon={<HeartPulse size={18} />}
        />


        <StatCard
          title="RISK DETECTIONS"
          value={stats.risk_detections ?? 0}
          description="This month"
          icon={<ShieldCheck size={18} />}
        />

      </section>


      <section className="dashboard-grid">

        <MovementOverview
          movementScore={stats.movement_score}
        />

        <PerformanceTrends />

      </section>


      <section className="dashboard-panel">

        <div className="panel-header">

          <div>

            <span className="panel-label">
              BIOMECHANICAL ANALYSIS
            </span>

            <h2>
              Key Movement Metrics
            </h2>

          </div>

        </div>


        <div className="metric-grid">

          <Metric
            name="Joint Stability"
            value="91%"
          />

          <Metric
            name="Movement Symmetry"
            value="88%"
          />

          <Metric
            name="Force Distribution"
            value="84%"
          />

          <Metric
            name="Technique Quality"
            value="92%"
          />

        </div>

      </section>

    </DashboardLayout>
  );
}


/* =====================================================
   ADMIN DASHBOARD
===================================================== */

function AdminDashboard({ data }) {

  const stats = data?.stats || {};

  return (
    <DashboardLayout role="administrator">

      <DashboardHeader
        eyebrow="ADMINISTRATOR WORKSPACE"
        title="System overview."
        subtitle="Monitor KINETIQ operations."
        description="Manage users, permissions, system activity and integrations."
      />


      <section className="stats-grid">

        <StatCard
          title="TOTAL USERS"
          value={stats.total_users ?? 0}
          description="Across all roles"
          icon={<Target size={18} />}
        />


        <StatCard
          title="ACTIVE USERS"
          value={stats.active_users ?? 0}
          description="Currently active"
          icon={<Activity size={18} />}
        />


        <StatCard
          title="ANALYSES"
          value={stats.analyses ?? 0}
          description="Processed this month"
          icon={<TrendingUp size={18} />}
        />


        <StatCard
          title="SYSTEM STATUS"
          value={stats.system_status ?? 0}
          unit="%"
          description="System availability"
          icon={<ShieldCheck size={18} />}
        />

      </section>


      <section className="dashboard-grid">

        <SystemActivity
          data={data}
        />

        <SystemHealth />

      </section>


      <section className="dashboard-panel">

        <div className="panel-header">

          <div>

            <span className="panel-label">
              USER MANAGEMENT
            </span>

            <h2>
              Recent Users
            </h2>

          </div>


          <button className="panel-action">
            Manage Users
            <ArrowUpRight size={15} />
          </button>

        </div>


        <div className="activity-table">

          <div className="table-row table-header">

            <span>USER</span>
            <span>ROLE</span>
            <span>STATUS</span>
            <span>LAST ACTIVE</span>
            <span>ACTION</span>

          </div>


          <AdminUserRow
            user="Athlete #104"
            role="Athlete"
            lastActive="2 min ago"
          />

          <AdminUserRow
            user="Coach #023"
            role="Coach"
            lastActive="8 min ago"
          />

          <AdminUserRow
            user="Physio #014"
            role="Physiotherapist"
            lastActive="14 min ago"
          />

        </div>

      </section>

    </DashboardLayout>
  );
}


/* =====================================================
   MOVEMENT OVERVIEW
===================================================== */

function MovementOverview({ movementScore }) {

  return (
    <div className="dashboard-panel movement-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            MOVEMENT ANALYSIS
          </span>

          <h2>
            Movement Overview
          </h2>

        </div>


        <div className="panel-action">
          {movementScore ?? "--"}/100
        </div>

      </div>


      <div className="movement-chart">

        <div className="chart-grid">

          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>

        </div>


        <svg
          viewBox="0 0 700 250"
          preserveAspectRatio="none"
        >

          <polyline
            points="
              0,190
              70,165
              140,180
              210,120
              280,140
              350,95
              420,115
              490,65
              560,90
              630,45
              700,60
            "
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />

        </svg>


        <div className="chart-labels">

          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
          <span>SUN</span>

        </div>

      </div>

    </div>
  );
}


/* =====================================================
   RISK OVERVIEW
===================================================== */

function RiskOverview({
  risk = "low",
  fatigue = 23
}) {

  const normalizedRisk =
    String(risk || "low").toLowerCase();


  const displayRisk =
    normalizedRisk === "high"
      ? "HIGH"
      : normalizedRisk === "moderate"
        ? "MODERATE"
        : "LOW";


  return (
    <div className="dashboard-panel risk-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            RISK PREDICTION
          </span>

          <h2>
            Risk Factors
          </h2>

        </div>

      </div>


      <div className="risk-meter">

        <div className="risk-circle">

          <strong>
            {displayRisk}
          </strong>

          <span>
            RISK
          </span>

        </div>

      </div>


      <div className="risk-list">

        <RiskItem
          name="Knee Load"
          value="Normal"
        />

        <RiskItem
          name="Movement Symmetry"
          value="Good"
        />

        <RiskItem
          name="Joint Stress"
          value="Low"
        />

        <RiskItem
          name="Fatigue"
          value={`${fatigue ?? 0}%`}
        />

      </div>

    </div>
  );
}


function RiskItem({
  name,
  value
}) {

  return (
    <div className="risk-item">

      <span>
        {name}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


/* =====================================================
   TRAINING OVERVIEW
===================================================== */

function TrainingOverview({ data }) {

  const trainingLoad =
    data?.stats?.training_load ?? 0;


  return (
    <div className="dashboard-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            TRAINING
          </span>

          <h2>
            Training Load
          </h2>

        </div>

      </div>


      <div className="large-metric">

        <strong>
          {trainingLoad}%
        </strong>

        <span>
          Weekly Training Load
        </span>

      </div>


      <div className="progress-bar">

        <div
          style={{
            width: `${Math.min(trainingLoad, 100)}%`
          }}
        />

      </div>


      <p className="metric-description">
        Training load is currently within the
        recommended range.
      </p>

    </div>
  );
}


/* =====================================================
   RECOMMENDATIONS
===================================================== */

function Recommendations() {

  return (
    <div className="dashboard-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            RECOMMENDATIONS
          </span>

          <h2>
            Today's Guidance
          </h2>

        </div>

      </div>


      <div className="recommendation">

        <div className="recommendation-icon">
          <Activity size={18} />
        </div>


        <div>

          <strong>
            Mobility Exercise
          </strong>

          <p>
            Add 10 minutes of mobility work before training.
          </p>

        </div>

      </div>


      <div className="recommendation">

        <div className="recommendation-icon">
          <HeartPulse size={18} />
        </div>


        <div>

          <strong>
            Recovery
          </strong>

          <p>
            Maintain adequate recovery between sessions.
          </p>

        </div>

      </div>

    </div>
  );
}


/* =====================================================
   RECENT SESSIONS
===================================================== */

function RecentSessions() {

  return (
    <section className="dashboard-panel activity-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            TRAINING HISTORY
          </span>

          <h2>
            Recent Sessions
          </h2>

        </div>


        <button className="panel-action">
          View All
          <ArrowUpRight size={15} />
        </button>

      </div>


      <div className="activity-table">

        <div className="table-row table-header">

          <span>SESSION</span>
          <span>DATE</span>
          <span>MOVEMENT</span>
          <span>RISK</span>
          <span>STATUS</span>

        </div>


        <ActivityRow
          session="Training Session #24"
          date="17 Aug 2026"
          movement="91"
          risk="Low"
        />

        <ActivityRow
          session="Sprint Analysis #23"
          date="15 Aug 2026"
          movement="87"
          risk="Low"
        />

        <ActivityRow
          session="Strength Session #22"
          date="13 Aug 2026"
          movement="84"
          risk="Moderate"
        />

      </div>

    </section>
  );
}


function ActivityRow({
  session,
  date,
  movement,
  risk
}) {

  return (
    <div className="table-row">

      <span className="session-name">
        {session}
      </span>

      <span>
        {date}
      </span>

      <span className="movement-score">
        {movement}/100
      </span>

      <span>

        <b
          className={
            risk === "Low"
              ? "risk-low"
              : "risk-medium"
          }
        >
          {risk}
        </b>

      </span>


      <span className="completed">
        ANALYZED
      </span>

    </div>
  );
}


/* =====================================================
   TEAM RISK
===================================================== */

function TeamRiskOverview({
  highRisk = 3,
  athletes = 24
}) {

  const high = Number(highRisk || 0);
  const total = Number(athletes || 24);

  const moderate = Math.min(3, Math.max(total - high - 18, 0));
  const low = Math.max(total - high - moderate, 0);


  return (
    <div className="dashboard-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            TEAM RISK
          </span>

          <h2>
            Risk Distribution
          </h2>

        </div>

      </div>


      <div className="risk-distribution">

        <div>
          <strong>{low}</strong>
          <span>Low Risk</span>
        </div>

        <div>
          <strong>{moderate}</strong>
          <span>Moderate</span>
        </div>

        <div>
          <strong>{high}</strong>
          <span>High Risk</span>
        </div>

      </div>

    </div>
  );
}


/* =====================================================
   TRAINING LOAD
===================================================== */

function TrainingLoad({ data }) {

  const trainingLoad =
    data?.stats?.training_load ?? 0;


  return (
    <div className="dashboard-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            TRAINING ANALYTICS
          </span>

          <h2>
            Team Load
          </h2>

        </div>

      </div>


      <div className="large-metric">

        <strong>
          {trainingLoad}%
        </strong>

        <span>
          Average Training Load
        </span>

      </div>


      <div className="progress-bar">

        <div
          style={{
            width: `${Math.min(trainingLoad, 100)}%`
          }}
        />

      </div>

    </div>
  );
}


/* =====================================================
   ATHLETE TABLE
===================================================== */

function AthleteTable() {

  const athletes = [
    ["Athlete #104", "87", "Low"],
    ["Athlete #108", "82", "Low"],
    ["Athlete #112", "71", "Moderate"],
    ["Athlete #118", "64", "High"],
  ];


  return (
    <section className="dashboard-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            ATHLETE MANAGEMENT
          </span>

          <h2>
            Team Athletes
          </h2>

        </div>


        <button className="panel-action">
          View All
          <ArrowUpRight size={15} />
        </button>

      </div>


      <div className="activity-table">

        <div className="table-row table-header">

          <span>ATHLETE</span>
          <span>MOVEMENT</span>
          <span>RISK</span>
          <span>STATUS</span>
          <span>ACTION</span>

        </div>


        {athletes.map((athlete) => (

          <div
            className="table-row"
            key={athlete[0]}
          >

            <span className="session-name">
              {athlete[0]}
            </span>

            <span className="movement-score">
              {athlete[1]}/100
            </span>

            <span>

              <b
                className={
                  athlete[2] === "Low"
                    ? "risk-low"
                    : athlete[2] === "Moderate"
                      ? "risk-medium"
                      : "risk-high"
                }
              >
                {athlete[2]}
              </b>

            </span>


            <span className="risk-low">
              ACTIVE
            </span>


            <span>
              VIEW
            </span>

          </div>

        ))}

      </div>

    </section>
  );
}


/* =====================================================
   RECOVERY OVERVIEW
===================================================== */

function RecoveryOverview({ data }) {

  const recovery =
    data?.stats?.recovery ?? 0;


  return (
    <div className="dashboard-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            RECOVERY ANALYTICS
          </span>

          <h2>
            Recovery Progress
          </h2>

        </div>

      </div>


      <div className="large-metric">

        <strong>
          {recovery}%
        </strong>

        <span>
          Average Recovery
        </span>

      </div>


      <div className="progress-bar">

        <div
          style={{
            width: `${Math.min(recovery, 100)}%`
          }}
        />

      </div>

    </div>
  );
}


/* =====================================================
   RECOVERY ITEM
===================================================== */

function RecoveryItem({
  athlete,
  injury,
  progress,
  status
}) {

  return (
    <div className="recovery-item">

      <div>

        <strong>
          {athlete}
        </strong>

        <span>
          {injury}
        </span>

      </div>


      <div className="recovery-progress">
        {progress}
      </div>


      <div className="risk-low">
        {status}
      </div>

    </div>
  );
}


/* =====================================================
   PERFORMANCE TRENDS
===================================================== */

function PerformanceTrends() {

  return (
    <div className="dashboard-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            PERFORMANCE
          </span>

          <h2>
            Performance Trend
          </h2>

        </div>

      </div>


      <div className="large-metric">

        <strong>
          +5.4%
        </strong>

        <span>
          Quarterly improvement
        </span>

      </div>

    </div>
  );
}


/* =====================================================
   METRIC
===================================================== */

function Metric({
  name,
  value
}) {

  return (
    <div className="metric-box">

      <span>
        {name}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


/* =====================================================
   SYSTEM ACTIVITY
===================================================== */

function SystemActivity({ data }) {

  const analyses =
    data?.stats?.analyses ?? 0;


  return (
    <div className="dashboard-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            SYSTEM ACTIVITY
          </span>

          <h2>
            Platform Usage
          </h2>

        </div>

      </div>


      <div className="large-metric">

        <strong>
          {analyses}
        </strong>

        <span>
          Analyses processed this month
        </span>

      </div>


      <div className="progress-bar">

        <div
          style={{
            width: "84%"
          }}
        />

      </div>

    </div>
  );
}


/* =====================================================
   SYSTEM HEALTH
===================================================== */

function SystemHealth() {

  return (
    <div className="dashboard-panel">

      <div className="panel-header">

        <div>

          <span className="panel-label">
            SYSTEM HEALTH
          </span>

          <h2>
            Services
          </h2>

        </div>

      </div>


      <div className="health-list">

        <HealthItem name="API Gateway" />
        <HealthItem name="Database" />
        <HealthItem name="Video Service" />
        <HealthItem name="Notification Service" />

      </div>

    </div>
  );
}


/* =====================================================
   HEALTH ITEM
===================================================== */

function HealthItem({
  name
}) {

  return (
    <div className="health-item">

      <span>
        {name}
      </span>

      <strong>
        OPERATIONAL
      </strong>

    </div>
  );
}


/* =====================================================
   ADMIN USER ROW
===================================================== */

function AdminUserRow({
  user,
  role,
  lastActive
}) {

  return (
    <div className="table-row">

      <span className="session-name">
        {user}
      </span>

      <span>
        {role}
      </span>

      <span className="risk-low">
        ACTIVE
      </span>

      <span>
        {lastActive}
      </span>

      <span>
        VIEW
      </span>

    </div>
  );
}


/* =====================================================
   EXPORT
===================================================== */

export default Dashboard;