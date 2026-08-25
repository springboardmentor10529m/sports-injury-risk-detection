import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RiskPill from "./RiskPill";

export default function StaffAthleteDetail({ athleteId, fetchProfile, fetchVideos, backTo, backLabel, extra }) {
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState(null);

  useEffect(() => {
    fetchProfile(athleteId).then((res) => setProfile(res.data));
    if (fetchVideos) fetchVideos(athleteId).then((res) => setVideos(res.data));
  }, [athleteId]);

  if (!profile) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  return (
    <div>
      <Link to={backTo} style={{ color: "var(--accent)", fontSize: 13 }}>← {backLabel}</Link>
      <h1 style={{ fontSize: 24, margin: "10px 0 20px" }}>{profile.sport} athlete profile</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatBox label="Sport" value={profile.sport} />
        <StatBox label="Position" value={profile.position || "—"} />
        <StatBox label="Age" value={profile.age} />
        <StatBox label="Height" value={`${profile.height_cm} cm`} />
        <StatBox label="Weight" value={`${profile.weight_kg} kg`} />
        <StatBox label="Weekly training" value={`${profile.weekly_training_hours} hrs`} />
        <StatBox label="Previous injuries" value={profile.previous_injury_count} />
        <StatBox label="In pain now" value={profile.current_pain_flag ? "Yes" : "No"} warn={profile.current_pain_flag} />
      </div>

      {videos && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Analysis history</h3>
          {videos.length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No videos analyzed yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 4px", textTransform: "capitalize" }}>{v.activity_type}</td>
                    <td style={{ padding: "10px 4px", color: "var(--text-dim)" }}>{new Date(v.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "10px 4px", textTransform: "capitalize" }}>{v.status.replace(/_/g, " ")}</td>
                    <td style={{ padding: "10px 4px" }}>
                      {v.status === "completed" ? <RiskPill category={v.risk_category} score={v.overall_risk_score} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {extra}
    </div>
  );
}

function StatBox({ label, value, warn }) {
  return (
    <div className="card">
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, color: warn ? "var(--risk-high)" : "var(--text)" }}>{value}</div>
    </div>
  );
}
