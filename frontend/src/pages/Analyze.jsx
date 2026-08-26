import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftRight, Dumbbell, Footprints, MoveDown, UploadCloud, Video, Wind, Zap,
} from "lucide-react";
import { uploadVideo } from "../api/client";

const ACTIVITIES = [
  { value: "running", label: "Running", icon: Footprints },
  { value: "sprinting", label: "Sprinting", icon: Zap },
  { value: "jumping", label: "Jumping", icon: Wind },
  { value: "squatting", label: "Squatting", icon: Dumbbell },
  { value: "landing", label: "Landing", icon: MoveDown },
  { value: "cutting", label: "Cutting", icon: ArrowLeftRight },
];

export default function Analyze() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [activity, setActivity] = useState("running");
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  }

  async function handleSubmit() {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const res = await uploadVideo(file, activity, (evt) => {
        setProgress(Math.round((evt.loaded * 100) / evt.total));
      });
      navigate(`/analysis/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>New Assessment</div>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Analyze Movement</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
        Upload a video of the activity. It's run through real pose estimation, biomechanical analysis,
        and injury risk scoring — no synthetic or placeholder results.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div
        className="card"
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          borderStyle: "dashed",
          borderWidth: 2,
          borderColor: dragActive ? "var(--accent)" : "var(--border)",
          background: dragActive
            ? "radial-gradient(circle at 50% 0%, var(--accent-soft), var(--surface) 75%)"
            : "linear-gradient(180deg, var(--surface-raised), var(--surface))",
          textAlign: "center",
          padding: 44,
          cursor: "pointer",
          marginBottom: 20,
          transition: "border-color 0.2s ease, background 0.2s ease",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <div
          style={{
            width: 48, height: 48, borderRadius: 12, margin: "0 auto 14px",
            background: "var(--accent-soft)", color: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {file ? <Video size={22} /> : <UploadCloud size={22} />}
        </div>
        {file ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{(file.size / 1024 / 1024).toFixed(1)} MB — click to replace</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 14, marginBottom: 6, fontWeight: 500 }}>Drag & drop your video, or click to browse</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>MP4 / MOV / AVI / MKV, up to 300MB</div>
          </div>
        )}
      </div>

      <div className="eyebrow" style={{ marginBottom: 10 }}>Activity</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        {ACTIVITIES.map((a) => {
          const Icon = a.icon;
          const selected = activity === a.value;
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => setActivity(a.value)}
              className={selected ? "" : "card-interactive"}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                padding: "16px 10px", borderRadius: "var(--radius)", cursor: "pointer",
                border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                background: selected
                  ? "linear-gradient(155deg, var(--accent-soft), var(--surface))"
                  : "linear-gradient(155deg, var(--surface-raised), var(--surface))",
                color: selected ? "var(--accent)" : "var(--text-dim)",
                fontWeight: selected ? 600 : 400,
                transition: "border-color 0.15s ease, color 0.15s ease",
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 12 }}>{a.label}</span>
            </button>
          );
        })}
      </div>

      {uploading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 6, background: "var(--border-soft)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                height: "100%", width: `${progress}%`,
                background: "linear-gradient(90deg, var(--accent-dim), var(--accent))",
                transition: "width 0.2s", boxShadow: "0 0 10px var(--accent)",
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
            {progress < 100 ? `Uploading... ${progress}%` : "Upload complete — starting analysis pipeline..."}
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-block" disabled={!file || uploading} onClick={handleSubmit}>
        {uploading ? "Processing..." : <><Video size={16} /> Analyze Video</>}
      </button>
    </div>
  );
}
