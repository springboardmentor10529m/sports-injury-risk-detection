import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Activity, AlertTriangle, Bone, CheckCircle2, Gauge, HeartPulse, Loader2, Move, Scale,
} from "lucide-react";
import { getVideo } from "../api/client";
import RiskGauge from "../components/RiskGauge";
import Pose3DViewer from "../components/Pose3DViewer";
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
  const [poseFrames, setPoseFrames] = useState(null);
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

  useEffect(() => {
    if (video?.status === "completed") setPoseFrames(video.pose_frames || null);
  }, [video]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!video) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  if (video.status !== "completed") {
    return <ProcessingView video={video} />;
  }

  const risk = video.risk_assessment;
  const bio = video.biomechanics;

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Analysis Report</div>
      <h1 style={{ fontSize: 26, marginBottom: 4, textTransform: "capitalize" }}>{video.activity_type} Analysis</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
        {video.original_filename} · {new Date(video.created_at).toLocaleString()}
      </p>

      {poseFrames && <Pose3DViewer poseFrames={poseFrames} />}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>
        <div
          className="card animate-in"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "radial-gradient(circle at 50% 0%, var(--accent-soft), var(--surface) 70%)",
          }}
        >
          <RiskGauge score={risk.overall_risk_score} category={risk.risk_category} />
        </div>

        <div className="card animate-in">
          <div className="card-title"><Gauge size={15} color="var(--accent)" /> Why this score — weighted components</div>
          {Object.entries(risk.components).map(([key, value]) => (
            <ComponentBar key={key} label={formatLabel(key)} value={value} weight={risk.weights[toWeightKey(key)]} />
          ))}
        </div>
      </div>

      <div className="card animate-in" style={{ marginBottom: 20 }}>
        <div className="card-title"><AlertTriangle size={15} color="var(--accent)" /> Potential injury-area flags</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {Object.entries(risk.injury_area_flags).map(([area, level]) => (
            <div
              key={area}
              style={{
                padding: "14px 12px", textAlign: "center", borderRadius: "var(--radius-sm)",
                border: `1px solid ${flagColor(level)}33`, background: `${flagColor(level)}0d`,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "capitalize", marginBottom: 6 }}>
                {area.replace("_", " ")}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: flagColor(level) }}>{level}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card animate-in" style={{ marginBottom: 20 }}>
        <div className="card-title"><Bone size={15} color="var(--accent)" /> Biomechanics</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 18 }}>
          <Metric icon={Move} label="Knee angle (L)" value={bio.knee_angle_left_avg_deg} unit="°" />
          <Metric icon={Move} label="Knee angle (R)" value={bio.knee_angle_right_avg_deg} unit="°" />
          <Metric icon={AlertTriangle} label="Knee valgus" value={bio.knee_valgus_avg_pct} unit="%" />
          <Metric icon={Activity} label="Trunk lean" value={bio.trunk_lean_avg_deg} unit="°" />
          <Metric icon={Scale} label="Symmetry" value={bio.symmetry_score} unit="/100" />
          <Metric icon={Gauge} label="Hip stability" value={bio.hip_stability_score} unit="/100" />
          <Metric icon={Scale} label="Balance" value={bio.balance_score} unit="/100" />
          <Metric icon={Activity} label="Fatigue signal" value={bio.fatigue_score} unit="/100" />
          {bio.stride_length_m ? <Metric icon={Move} label="Stride length" value={bio.stride_length_m} unit="m" /> : null}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
          Pose detected in {video.frames_with_pose_detected}/{video.frame_count_sampled} sampled frames
          ({Math.round(bio.detection_rate * 100)}% detection rate).
        </div>
      </div>

      <div className="card animate-in">
        <div className="card-title"><HeartPulse size={15} color="var(--accent)" /> Recommendations</div>
        <RecoList recommendations={video.recommendations} />
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 18, borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
          {video.recommendations.note}
        </div>
      </div>
    </div>
  );
}

function ProcessingView({ video }) {
  const currentIndex = PIPELINE_STAGES.findIndex(([key]) => key === video.status);
  return (
    <div style={{ maxWidth: 500 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Analysis Pipeline</div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Processing your video...</h1>
      <div className="card animate-in">
        {PIPELINE_STAGES.slice(0, -1).map(([key, label], i) => {
          const done = currentIndex > i || video.status === "completed";
          const active = currentIndex === i;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
              <span
                style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${done ? "var(--accent)" : active ? "var(--accent-dim)" : "var(--border)"}`,
                  background: done ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: done ? "0 0 10px var(--accent)" : "none",
                }}
              >
                {done ? (
                  <CheckCircle2 size={13} color="#06110e" />
                ) : active ? (
                  <Loader2 size={12} color="var(--accent)" className="spin" />
                ) : null}
              </span>
              <span style={{ fontSize: 13, color: active ? "var(--text)" : done ? "var(--text-dim)" : "var(--text-faint)", fontWeight: active ? 500 : 400 }}>
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
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: "var(--text-dim)" }}>{label} <span className="mono" style={{ color: "var(--text-faint)" }}>({Math.round(weight * 100)}%)</span></span>
        <span className="mono">{value}</span>
      </div>
      <div style={{ height: 6, background: "var(--border-soft)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: "linear-gradient(90deg, var(--accent-dim), var(--accent))", borderRadius: 4 }} />
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, unit }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className="mono" style={{ fontSize: 19 }}>{value ?? "—"}{value != null ? unit : ""}</div>
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
