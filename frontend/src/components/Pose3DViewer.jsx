import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

const BONES = [
  ["nose", "left_shoulder"], ["nose", "right_shoulder"],
  ["left_shoulder", "right_shoulder"], ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"], ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"], ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"], ["left_hip", "right_hip"],
  ["left_hip", "left_knee"], ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"], ["right_knee", "right_ankle"],
];

export default function Pose3DViewer({ poseFrames, compact = false }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rotation, setRotation] = useState({ x: -0.12, y: 0.35 });
  const dragRef = useRef(null);
  const frames = (poseFrames?.frames || []).filter((frame) => frame.detected && frame.world_landmarks);

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;
    animationRef.current = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, 100);
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
      context.scale(ratio, ratio);
      context.clearRect(0, 0, rect.width, rect.height);
      const landmarks = frames[frameIndex % frames.length].world_landmarks;
      const points = {};
      const scale = Math.min(rect.width, rect.height) * 0.85;
      Object.entries(landmarks).forEach(([name, [x, y, z]]) => {
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
      context.lineWidth = 2;
      context.lineCap = "round";
      BONES.forEach(([from, to]) => {
        if (!points[from] || !points[to]) return;
        context.strokeStyle = "#9ee83f";
        context.beginPath();
        context.moveTo(points[from].x, points[from].y);
        context.lineTo(points[to].x, points[to].y);
        context.stroke();
      });
      context.fillStyle = "#e8ffbd";
      Object.values(points).forEach(({ x, y, depth }) => {
        context.globalAlpha = Math.max(0.45, Math.min(1, depth));
        context.beginPath();
        context.arc(x, y, 4, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [frameIndex, frames, rotation]);

  if (frames.length === 0) return null;

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
        style={{ height: compact ? 220 : 300, background: "radial-gradient(circle, var(--accent-soft), var(--surface-raised) 68%)", borderRadius: 8, overflow: "hidden", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
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
        <button className="btn" type="button" onClick={() => setRotation({ x: -0.12, y: 0.35 })} title="Reset view">
          <RotateCcw size={14} />
        </button>
      </div>
      <div style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 8 }}>
        Frame {frameIndex + 1} of {frames.length} · Drag the viewer to rotate
      </div>
    </div>
  );
}