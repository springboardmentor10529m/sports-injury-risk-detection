import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getVideo } from "../api/client";
import RiskGauge from "../components/RiskGauge";
import { RecoList } from "./Dashboard";

const PIPELINE_STAGES = [
  ["uploaded", "Video uploaded"],
  ["extracting_frames", "Frame extraction"],
  ["running_pose", "Pose detection (MediaPipe BlazePose)"],
  ["analyzing_biomechanics", "Biomechanical analysis"],
  ["scoring_risk", "Injury risk prediction"],
  ["generating_recommendations", "Generating recommendations"],
  ["completed", "Done"],
];

export default function Result() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    async function poll() {
      try {
        const res = await getVideo(id);
        setVideo(res.data);
        if (res.data.status === "completed" || res.data.status === "failed") {
          clearInterval(pollRef.current);
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Could not load this analysis.");
        clearInterval(pollRef.current);
      }
    }
    poll();
    pollRef.current = setInterval(poll, 1500);
    return () => clearInterval(pollRef.current);
  }, [id]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!video) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  if (video.status !== "completed") {
    return <ProcessingView video={video} />;
  }

  const risk = video.risk_assessment;
  const bio = video.biomechanics;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4, textTransform: "capitalize" }}>{video.activity_type} Analysis</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
        {video.original_filename} · {new Date(video.created_at).toLocaleString()}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <RiskGauge score={risk.overall_risk_score} category={risk.risk_category} />
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Why this score - weighted components</h3>
          {Object.entries(risk.components).map(([key, value]) => (
            <ComponentBar key={key} label={formatLabel(key)} value={value} weight={risk.weights[toWeightKey(key)]} />
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginBottom: 14 }}>Potential injury-area flags</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {Object.entries(risk.injury_area_flags).map(([area, level]) => (
            <div key={area} className="card" style={{ padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "capitalize", marginBottom: 6 }}>
                {area.replace("_", " ")}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: flagColor(level) }}>{level}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginBottom: 14 }}>Biomechanics</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <Metric label="Knee angle (L)" value={bio.knee_angle_left_avg_deg} unit="°" />
          <Metric label="Knee angle (R)" value={bio.knee_angle_right_avg_deg} unit="°" />
          <Metric label="Knee valgus" value={bio.knee_valgus_avg_pct} unit="%" />
          <Metric label="Trunk lean" value={bio.trunk_lean_avg_deg} unit="°" />
          <Metric label="Symmetry" value={bio.symmetry_score} unit="/100" />
          <Metric label="Hip stability" value={bio.hip_stability_score} unit="/100" />
          <Metric label="Balance" value={bio.balance_score} unit="/100" />
          <Metric label="Fatigue signal" value={bio.fatigue_score} unit="/100" />
          {bio.stride_length_m ? <Metric label="Stride length" value={bio.stride_length_m} unit="m" /> : null}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 14 }}>
          Pose detected in {video.frames_with_pose_detected}/{video.frame_count_sampled} sampled frames
          ({Math.round(bio.detection_rate * 100)}% detection rate).
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 14 }}>Recommendations</h3>
        <RecoList recommendations={video.recommendations} />
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          {video.recommendations.note}
        </div>
      </div>
    </div>
  );
}

function ProcessingView({ video }) {
  const currentIndex = PIPELINE_STAGES.findIndex(([key]) => key === video.status);
  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Processing your video...</h1>
      <div className="card">
        {PIPELINE_STAGES.slice(0, -1).map(([key, label], i) => {
          const done = currentIndex > i || video.status === "completed";
          const active = currentIndex === i;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0" }}>
              <span
                style={{
                  width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${done ? "var(--accent)" : "var(--border)"}`,
                  background: done ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {done && <span style={{ color: "#06110e", fontSize: 10 }}>✓</span>}
              </span>
              <span style={{ fontSize: 13, color: active ? "var(--text)" : done ? "var(--text-dim)" : "var(--text-faint)" }}>
                {label}{active ? "..." : ""}
              </span>
            </div>
          );
        })}
        {video.status === "failed" && (
          <div className="error-banner" style={{ marginTop: 16 }}>
            Processing failed: {video.error_message}
          </div>
        )}
      </div>
    </div>
  );
}

function ComponentBar({ label, value, weight }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--text-dim)" }}>{label} <span className="mono" style={{ color: "var(--text-faint)" }}>({Math.round(weight * 100)}%)</span></span>
        <span className="mono">{value}</span>
      </div>
      <div style={{ height: 5, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: "var(--accent)" }} />
      </div>
    </div>
  );
}

function Metric({ label, value, unit }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 18 }}>{value ?? "—"}{value != null ? unit : ""}</div>
    </div>
  );
}

function formatLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function toWeightKey(componentKey) {
  const map = {
    biomechanical_deviation: "biomechanical_deviation",
    historical_injury_factors: "historical_injury",
    movement_asymmetry: "movement_asymmetry",
    training_load_indicators: "training_load",
    fatigue_indicators: "fatigue",
  };
  return map[componentKey];
}
function flagColor(level) {
  if (level === "HIGH") return "var(--risk-high)";
  if (level === "MODERATE") return "var(--risk-moderate)";
  return "var(--risk-low)";
}
