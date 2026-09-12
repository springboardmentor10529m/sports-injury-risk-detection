import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

const bones = [
  ["left_shoulder", "right_shoulder"], ["left_hip", "right_hip"],
  ...["left", "right"].flatMap(s => [[`${s}_shoulder`, `${s}_elbow`],
    [`${s}_elbow`, `${s}_wrist`], [`${s}_shoulder`, `${s}_hip`],
    [`${s}_hip`, `${s}_knee`], [`${s}_knee`, `${s}_ankle`]]),
];

export default function VideoPoseOverlay({ videoId, frames }) {
  const player = useRef(null);
  const canvas = useRef(null);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  useEffect(() => {
    const controller = new AbortController();
    let url;
    api.get(`/api/videos/${videoId}/original`, { responseType: "blob", signal: controller.signal, timeout: 180000 })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(data);
        setSource(url);
      }).catch(() => {
        if (!controller.signal.aborted) setError("Original video unavailable. Older uploads may have been removed; upload again to enable playback.");
      });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [videoId]);

  useEffect(() => {
    let request;
    function draw() {
      const video = player.current;
      const layer = canvas.current;
      if (video && layer && video.videoWidth) {
        if (layer.width !== video.videoWidth || layer.height !== video.videoHeight) {
          layer.width = video.videoWidth; layer.height = video.videoHeight;
        }
        const ctx = layer.getContext("2d");
        ctx.clearRect(0, 0, layer.width, layer.height);
        const time = video.currentTime * 1000;
        const nearest = frames.reduce((best, frame) => Number.isFinite(frame.timestamp_ms) &&
          (!best || Math.abs(frame.timestamp_ms - time) < Math.abs(best.timestamp_ms - time)) ? frame : best, null);
        const landmarks = nearest?.detected && Math.abs(nearest.timestamp_ms - time) <= 150 ? nearest.image_landmarks : null;
        const visible = p => p && p.length === 4 && p.every(Number.isFinite) && p[3] >= 0.5;
        if (landmarks) {
          ctx.strokeStyle = "#5ee7a8"; ctx.fillStyle = "#ffda66";
          ctx.lineWidth = Math.max(2, layer.width / 350);
          for (const [a, b] of bones) {
            const p = landmarks[a], q = landmarks[b];
            if (!visible(p) || !visible(q)) continue;
            ctx.beginPath(); ctx.moveTo(p[0] * layer.width, p[1] * layer.height);
            ctx.lineTo(q[0] * layer.width, q[1] * layer.height); ctx.stroke();
          }
          for (const p of Object.values(landmarks)) {
            if (!visible(p)) continue;
            ctx.beginPath(); ctx.arc(p[0] * layer.width, p[1] * layer.height, Math.max(3, layer.width / 250), 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      request = requestAnimationFrame(draw);
    }
    request = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(request);
  }, [frames]);

  return <section className="card" style={{ marginBottom: 20 }}>
    <h2 style={{ fontSize: 18, marginBottom: 8 }}>Video with pose overlay</h2>
    <p style={{ fontSize: 13, marginBottom: 16 }}>Play, pause or seek to inspect your movement with the detected skeleton overlay.</p>
    {error ? <p role="alert">{error}</p> : !source ? <p>Loading original video...</p> :
      <div style={{ position: "relative", width: `min(100%, 680px, ${aspectRatio * 55}vh, ${aspectRatio * 480}px)`, margin: "auto", borderRadius: 8, overflow: "hidden", background: "#000" }}>
        <video ref={player} src={source} controls playsInline style={{ width: "100%", display: "block" }}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (video.videoWidth && video.videoHeight) setAspectRatio(video.videoWidth / video.videoHeight);
          }}
          onError={() => setError("Your browser cannot play this encoding. Try an H.264 MP4 video.")} />
        <canvas ref={canvas} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      </div>}
  </section>;
}
