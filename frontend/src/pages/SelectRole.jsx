import { Link } from "react-router-dom";
import { AuthShell } from "./Login";

const ROLES = [
  { to: "/register", emoji: "🏃", title: "Athlete", desc: "Track your movement, injury risk and performance." },
  { to: "/register/coach", emoji: "🧑‍🏫", title: "Coach", desc: "Monitor your team's athletes and training risk." },
  { to: "/register/physiotherapist", emoji: "🩺", title: "Physiotherapist", desc: "Track rehabilitation and recovery." },
  { to: "/register/sports-scientist", emoji: "🔬", title: "Sports Scientist", desc: "Analyze biomechanics and performance data." },
];

export default function SelectRole() {
  return (
    <AuthShell>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>How will you use InjuryGuard AI?</h1>
      <p style={{ color: "var(--text-dim)", fontSize: 14, marginBottom: 24 }}>
        Choose your role to get started. (Administrator accounts are created by an existing admin.)
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {ROLES.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", padding: 16 }}
          >
            <span style={{ fontSize: 22 }}>{r.emoji}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{r.desc}</div>
            </div>
          </Link>
        ))}
      </div>
      <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-dim)" }}>
        Already have an account? <Link to="/login" style={{ color: "var(--accent)" }}>Log in</Link>
      </p>
    </AuthShell>
  );
}
