import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadVideo } from "../api/client";

const ACTIVITIES = [
  ["running", "Running"], ["sprinting", "Sprinting"], ["jumping", "Jumping"],
  ["squatting", "Squatting"], ["landing", "Landing"], ["cutting", "Cutting"],
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
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Analyze Movement</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
        Upload a video of the activity. It's run through real pose estimation, biomechanical analysis,
        and injury risk scoring - no synthetic or placeholder results.
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
          borderColor: dragActive ? "var(--accent)" : "var(--border)",
          textAlign: "center",
          padding: 48,
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Drag & drop your video, or click to browse</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>MP4 / MOV / AVI / MKV, up to 300MB</div>
          </div>
        )}
      </div>

      <div className="field">
        <label>Activity</label>
        <select value={activity} onChange={(e) => setActivity(e.target.value)}>
          {ACTIVITIES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>

      {uploading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", transition: "width 0.2s" }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
            {progress < 100 ? `Uploading... ${progress}%` : "Upload complete - starting analysis pipeline..."}
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-block" disabled={!file || uploading} onClick={handleSubmit}>
        {uploading ? "Processing..." : "Analyze Video"}
      </button>
    </div>
  );
}
