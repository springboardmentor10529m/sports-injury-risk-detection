import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileClock } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import RiskPill from "./RiskPill";
import Pose3DViewer from "./Pose3DViewer";

export default function StaffAthleteDetail({ athleteId, fetchProfile, fetchVideos, fetchPoseFrames, backTo, backLabel, extra }) {
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [poseFrames, setPoseFrames] = useState(null);

  const trendData = (videos ?? [])
    .filter((v) => v.status === "completed")
    .slice()
    .reverse()
    .map((v) => ({
      id: v.id,
      date: new Date(v.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: v.overall_risk_score,
    }));

  useEffect(() => {
    fetchProfile(athleteId).then((res) => setProfile(res.data));
    if (fetchVideos) fetchVideos(athleteId).then((res) => setVideos(res.data));
    setSelectedVideo(null);
    setPoseFrames(null);
  }, [athleteId]);

  useEffect(() => {
    if (!selectedVideo?.id || !selectedVideo.fetchPoseFrames) return;
    selectedVideo.fetchPoseFrames(athleteId, selectedVideo.id).then((res) => setPoseFrames(res.data)).catch(() => setPoseFrames(null));
  }, [athleteId, selectedVideo]);

  if (!profile) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  return (
    <div>
      <Link to={backTo} style={{ color: "var(--accent)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
        <ArrowLeft size={13} /> {backLabel}
      </Link>
      <div className="eyebrow" style={{ margin: "14px 0 4px" }}>Athlete Profile</div>
      <h1 style={{ fontSize: 26, marginBottom: 20, textTransform: "capitalize" }}>{profile.sport} athlete</h1>

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

      {trendData.length > 0 && (
        <div className="card animate-in" style={{ marginBottom: 20 }}>
          <div className="card-title">Risk trend</div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--text-faint)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--text-faint)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {poseFrames && <Pose3DViewer poseFrames={poseFrames} compact />}

      {videos && (
        <div className="card animate-in" style={{ marginBottom: 20 }}>
          <div className="card-title"><FileClock size={15} color="var(--accent)" /> Analysis history</div>
          {videos.length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No videos analyzed yet.</p>
          ) : (
            <table className="data-table">
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id}>
                    <td style={{ textTransform: "capitalize", width: 140 }}>{v.activity_type}</td>
                    <td style={{ color: "var(--text-dim)" }}>{new Date(v.created_at).toLocaleDateString()}</td>
                    <td style={{ textTransform: "capitalize" }}>{v.status.replace(/_/g, " ")}</td>
                    <td>
                      {v.status === "completed" ? <RiskPill category={v.risk_category} score={v.overall_risk_score} /> : null}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {v.status === "completed" && fetchPoseFrames ? (
                        <button className="btn" type="button" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setSelectedVideo({ ...v, fetchPoseFrames })}>
                          {selectedVideo?.id === v.id ? "Selected" : "View 3D"}
                        </button>
                      ) : null}
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
    <div className="stat-card">
      <div className="stat-card-label" style={{ marginTop: 0, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 17, color: warn ? "var(--risk-high)" : "var(--text)", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
