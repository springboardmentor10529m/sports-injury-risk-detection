import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

const BONES = [
  ["nose", "left_shoulder"],
  ["nose", "right_shoulder"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

const BONE_COLORS = {
  left: "#5ee7a8",
  right: "#ff6b6b",
  center: "#73c2ff",
};

const DEFAULT_ROTATION = { x: -0.28, y: Math.PI + 0.45 };

function getBoneColor(from, to) {
  const leftBones = new Set(["left_shoulder", "left_elbow", "left_wrist", "left_hip", "left_knee", "left_ankle"]);
  const rightBones = new Set(["right_shoulder", "right_elbow", "right_wrist", "right_hip", "right_knee", "right_ankle"]);
  if (leftBones.has(from) || leftBones.has(to)) return BONE_COLORS.left;
  if (rightBones.has(from) || rightBones.has(to)) return BONE_COLORS.right;
  return BONE_COLORS.center;
}

function getLandmarks(frame) {
  const candidates = [frame?.world_landmarks, frame?.image_landmarks, frame?.landmarks, frame?.pose_landmarks];
  return candidates.find((landmarks) => landmarks && Object.keys(landmarks).length > 0) || {};
}

export default function Pose3DViewer({ poseFrames, compact = false }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [rotation, setRotation] = useState(DEFAULT_ROTATION);
  const dragRef = useRef(null);

  const rawFrames = Array.isArray(poseFrames)
    ? poseFrames
    : poseFrames && Array.isArray(poseFrames.frames)
      ? poseFrames.frames
      : [];

  const frames = rawFrames.filter((frame) => {
    if (!frame || typeof frame !== "object") return false;

    const landmarks = getLandmarks(frame);
    const hasLandmarks = landmarks && Object.keys(landmarks).length > 0;
    const detected = frame.detected !== undefined ? Boolean(frame.detected) : hasLandmarks;

    return detected && hasLandmarks;
  }).map((frame) => {
    const landmarks = getLandmarks(frame);
    const normalizedLandmarks = {};

    Object.entries(landmarks).forEach(([name, value]) => {
      if (Array.isArray(value)) {
        normalizedLandmarks[name] = value;
        return;
      }

      if (value && typeof value === "object") {
        const coords = Array.isArray(value.coords)
          ? value.coords
          : Object.values(value).filter((entry) => typeof entry === "number");

        if (coords.length >= 3) normalizedLandmarks[name] = coords;
      }
    });

    return {
      ...frame,
      world_landmarks: normalizedLandmarks,
      image_landmarks: normalizedLandmarks,
    };
  });

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;
    animationRef.current = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, 90);
    return () => window.clearInterval(animationRef.current);
  }, [playing, frames.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return undefined;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;

      const context = canvas.getContext("2d");
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      context.fillStyle = "rgba(12, 19, 21, 0.96)";
      context.fillRect(0, 0, rect.width, rect.height);

      const frame = frames[frameIndex % frames.length];
      const rawLandmarks = getLandmarks(frame);
      const points = {};
      const scale = Math.min(rect.width, rect.height) * 0.72;

      Object.entries(rawLandmarks).forEach(([name, values]) => {
        const coords = Array.isArray(values) ? values : Object.values(values || {});
        if (!coords || coords.length < 2) return;

        const x = Number(coords[0]);
        const y = Number(coords[1]);
        const z = Number(coords[2] ?? 0);

        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        const rotatedX = x * Math.cos(rotation.y) - z * Math.sin(rotation.y);
        const rotatedZ = x * Math.sin(rotation.y) + z * Math.cos(rotation.y);
        const projectedY = y * Math.cos(rotation.x) - rotatedZ * Math.sin(rotation.x);
        const depth = 1 + (y * Math.sin(rotation.x) + rotatedZ * Math.cos(rotation.x)) * 0.12;

        points[name] = {
          x: rect.width / 2 + (rotatedX / depth) * scale,
          y: rect.height / 2 - (projectedY / depth) * scale,
          depth,
        };
      });

      context.lineCap = "round";
      context.lineJoin = "round";

      BONES.forEach(([from, to]) => {
        if (!points[from] || !points[to]) return;
        const color = getBoneColor(from, to);
        context.beginPath();
        context.moveTo(points[from].x, points[from].y);
        context.lineTo(points[to].x, points[to].y);
        context.strokeStyle = color;
        context.lineWidth = 3;
        context.shadowColor = color;
        context.shadowBlur = 12;
        context.stroke();
      });

      context.shadowBlur = 0;
      Object.entries(points).forEach(([name, { x, y, depth }]) => {
        const isCore = ["nose", "left_shoulder", "right_shoulder", "left_hip", "right_hip"].includes(name);
        context.beginPath();
        context.fillStyle = isCore ? "#d9f8ff" : "#f7fff7";
        context.arc(x, y, 4.5, 0, Math.PI * 2);
        context.fill();
        context.lineWidth = 1.5;
        context.strokeStyle = "rgba(0, 0, 0, 0.4)";
        context.stroke();
        context.globalAlpha = Math.max(0.7, Math.min(1, depth));
      });
      context.globalAlpha = 1;
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [frameIndex, frames, rotation]);

  function handlePointerDown(event) {
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setRotation((current) => ({ x: current.x + dy * 0.01, y: current.y + dx * 0.01 }));
  }

  return (
    <div className="card animate-in" style={{ marginBottom: 20 }}>
      <div className="card-title">3D pose playback</div>
      <div
        style={{ height: compact ? 220 : 300, background: "linear-gradient(180deg, #0d1719, #121b1d)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        {frames.length > 0 ? (
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", textAlign: "center", padding: 24 }}>
            Pose landmarks are not available for this video yet.
          </div>
        )}
      </div>
      {frames.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <button className="btn" type="button" onClick={() => setPlaying((value) => !value)} title={playing ? "Pause playback" : "Play playback"}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <input
          type="range"
          min="0"
          max={frames.length - 1}
          value={frameIndex}
          onChange={(event) => setFrameIndex(Number(event.target.value))}
          style={{ flex: 1, accentColor: "var(--accent)" }}
          aria-label="Pose frame"
        />
        <button className="btn" type="button" onClick={() => setRotation(DEFAULT_ROTATION)} title="Reset view">
          <RotateCcw size={14} />
        </button>
      </div>}
      {frames.length > 0 && <div style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 8 }}>
        Frame {frameIndex + 1} of {frames.length} · Drag the viewer to rotate
      </div>}
    </div>
  );
}