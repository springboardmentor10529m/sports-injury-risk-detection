import {
    Activity,
    Users,
    ClipboardCheck,
    AlertTriangle,
    ArrowUpRight
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import RiskBadge from "../components/RiskBadge";

import { useAuth } from "../context/AuthContext";

function Dashboard() {
    const { user } = useAuth();

    return (
        <div className="app-layout">
            <Sidebar />

            <main className="dashboard">
                <div className="page-header">
                    <div>
                        <span className="eyebrow">
                            OVERVIEW
                        </span>

                        <h1>
                            Good to see you
                            {user?.full_name
                                ? `, ${user.full_name}`
                                : ""}
                        </h1>

                        <p>
                            Monitor athlete movement and injury-risk
                            assessments.
                        </p>
                    </div>

                    <a
                        href="/analysis"
                        className="primary-button"
                    >
                        <Activity size={18} />
                        New Analysis
                    </a>
                </div>

                <div className="stats-grid">
                    <StatCard
                        title="Athletes"
                        value="24"
                        subtitle="+4 this month"
                        icon={Users}
                    />

                    <StatCard
                        title="Assessments"
                        value="86"
                        subtitle="12 this week"
                        icon={ClipboardCheck}
                    />

                    <StatCard
                        title="Average Risk"
                        value="28%"
                        subtitle="↓ 6% from last month"
                        icon={Activity}
                    />

                    <StatCard
                        title="High Risk"
                        value="5"
                        subtitle="Requires attention"
                        icon={AlertTriangle}
                        danger
                    />
                </div>

                <div className="dashboard-grid">
                    <section className="panel">
                        <div className="panel-header">
                            <div>
                                <h2>Recent Assessments</h2>
                                <p>
                                    Latest movement-risk assessments
                                </p>
                            </div>

                            <ArrowUpRight size={18} />
                        </div>

                        <div className="assessment-list">
                            <Assessment
                                name="Athlete 01"
                                date="Today, 10:30 AM"
                                score="18%"
                                risk="Low"
                            />

                            <Assessment
                                name="Athlete 02"
                                date="Today, 09:15 AM"
                                score="46%"
                                risk="Moderate"
                            />

                            <Assessment
                                name="Athlete 03"
                                date="Yesterday"
                                score="72%"
                                risk="High"
                            />

                            <Assessment
                                name="Athlete 04"
                                date="Yesterday"
                                score="21%"
                                risk="Low"
                            />
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-header">
                            <div>
                                <h2>Risk Overview</h2>
                                <p>
                                    Current athlete distribution
                                </p>
                            </div>
                        </div>

                        <div className="risk-overview">
                            <RiskBar
                                label="Low Risk"
                                value="65%"
                            />

                            <RiskBar
                                label="Moderate Risk"
                                value="24%"
                            />

                            <RiskBar
                                label="High Risk"
                                value="11%"
                            />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

function Assessment({
    name,
    date,
    score,
    risk
}) {
    return (
        <div className="assessment-row">
            <div className="assessment-person">
                <div className="avatar">
                    {name.charAt(name.length - 1)}
                </div>

                <div>
                    <strong>{name}</strong>
                    <small>{date}</small>
                </div>
            </div>

            <strong>{score}</strong>

            <RiskBadge level={risk} />
        </div>
    );
}

function RiskBar({ label, value }) {
    return (
        <div className="risk-bar-container">
            <div className="risk-bar-label">
                <span>{label}</span>
                <strong>{value}</strong>
            </div>

            <div className="risk-bar">
                <div
                    className="risk-bar-fill"
                    style={{ width: value }}
                ></div>
            </div>
        </div>
    );
}

export default Dashboard;