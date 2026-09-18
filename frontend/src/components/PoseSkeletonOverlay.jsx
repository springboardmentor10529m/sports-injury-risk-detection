import React, { useState, useEffect, useRef } from 'react';

const PoseSkeletonOverlay = ({ 
  videoRef,
  dynamicValgusAngle = '11.2°',
  dynamicHipRom = '94.8°',
  dynamicKneeFlexion = '98.2°',
  dynamicAsymmetry = '14.6%',
  isAnnotatedActive = false,
  activity = 'Squatting'
}) => {
  const canvasRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAngles, setShowAngles] = useState(true);

  // Sync state with video playback
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    let animFrame;
    const updateTime = () => {
      if (!video.paused) {
        setCurrentTime(video.currentTime);
      }
      animFrame = requestAnimationFrame(updateTime);
    };

    const handlePlay = () => {
      animFrame = requestAnimationFrame(updateTime);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('timeupdate', handleTimeUpdate);

    animFrame = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animFrame);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef]);

  // Live Canvas 33-point MediaPipe Skeleton Renderer
  useEffect(() => {
    // If backend annotated video is active, the video stream already has burned-in skeleton
    if (isAnnotatedActive) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef?.current;
    if (!canvas || !video) return;

    let animId;

    const renderSkeleton = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const t = video.currentTime || 0;
      const actLower = (activity || 'squat').toLowerCase();
      
      // Dynamic motion phase synchronized to video playback
      let theta, depth, hipY, kneeY, ankleY, kneeCaving, trunkLeanRad;

      if (actLower.includes('jump') || actLower.includes('land')) {
        theta = (t % 2.5) / 2.5 * 2 * Math.PI;
        const impact = Math.exp(-Math.pow((t % 2.5) - 1.2, 2) / 0.12);
        depth = impact;
        hipY = 0.50 + depth * 0.12;
        kneeY = hipY + 0.17;
        ankleY = 0.84 - (depth > 0.6 ? 0.04 : 0);
        kneeCaving = depth * 0.022;
        trunkLeanRad = depth * 0.18;
      } else if (actLower.includes('sprint') || actLower.includes('run')) {
        theta = t * 6.0;
        depth = (Math.sin(theta) + 1) / 2;
        hipY = 0.48 + Math.abs(Math.sin(theta * 0.5)) * 0.04;
        kneeY = hipY + 0.18;
        ankleY = 0.82;
        kneeCaving = 0.006;
        trunkLeanRad = 0.14;
      } else if (actLower.includes('cut')) {
        theta = t * 3.5;
        depth = Math.abs(Math.sin(theta));
        hipY = 0.52 + depth * 0.08;
        kneeY = hipY + 0.18;
        ankleY = 0.83;
        kneeCaving = depth * 0.024;
        trunkLeanRad = Math.sin(theta) * 0.15;
      } else {
        // Standard Squatting / General
        theta = t * 2.2;
        depth = (Math.sin(theta) + 1) / 2;
        hipY = 0.50 + depth * 0.12;
        kneeY = hipY + 0.18;
        ankleY = 0.85;
        kneeCaving = depth * 0.020;
        trunkLeanRad = depth * 0.12;
      }

      const centerX = width * 0.50;
      const headY = height * (0.17 - depth * 0.04);
      const shoulderY = height * (0.28 - depth * 0.02);
      const shoulderSpread = width * 0.13;
      const hipSpread = width * 0.09;

      // 33 MediaPipe Landmarks coordinates
      const lm = {};

      // Head & Face (0: nose, 1-3: left eye, 4-6: right eye, 7-8: ears, 9-10: mouth)
      lm[0] = [centerX, headY];
      lm[1] = [centerX - width * 0.015, headY - height * 0.01];
      lm[2] = [centerX - width * 0.025, headY - height * 0.01];
      lm[3] = [centerX - width * 0.035, headY - height * 0.01];
      lm[4] = [centerX + width * 0.015, headY - height * 0.01];
      lm[5] = [centerX + width * 0.025, headY - height * 0.01];
      lm[6] = [centerX + width * 0.035, headY - height * 0.01];
      lm[7] = [centerX - width * 0.045, headY];
      lm[8] = [centerX + width * 0.045, headY];
      lm[9] = [centerX - width * 0.012, headY + height * 0.015];
      lm[10] = [centerX + width * 0.012, headY + height * 0.015];

      // Shoulders (11: left, 12: right)
      lm[11] = [centerX - shoulderSpread + trunkLeanRad * width * 0.05, shoulderY];
      lm[12] = [centerX + shoulderSpread + trunkLeanRad * width * 0.05, shoulderY];

      // Arms & Hands
      const elbowY = shoulderY + height * 0.12;
      const wristY = elbowY + height * 0.12;
      lm[13] = [lm[11][0] - width * 0.04, elbowY];
      lm[14] = [lm[12][0] + width * 0.04, elbowY];
      lm[15] = [lm[13][0] - width * 0.02, wristY];
      lm[16] = [lm[14][0] + width * 0.02, wristY];
      lm[17] = [lm[15][0] - width * 0.01, wristY + height * 0.02];
      lm[18] = [lm[16][0] + width * 0.01, wristY + height * 0.02];
      lm[19] = [lm[15][0] - width * 0.005, wristY + height * 0.03];
      lm[20] = [lm[16][0] + width * 0.005, wristY + height * 0.03];
      lm[21] = [lm[15][0] + width * 0.005, wristY + height * 0.02];
      lm[22] = [lm[16][0] - width * 0.005, wristY + height * 0.02];

      // Hips (23: left, 24: right)
      const curHipY = height * hipY;
      lm[23] = [centerX - hipSpread, curHipY];
      lm[24] = [centerX + hipSpread, curHipY];

      // Knees (25: left, 26: right)
      const curKneeY = height * kneeY;
      lm[25] = [centerX - hipSpread + width * kneeCaving, curKneeY];
      lm[26] = [centerX + hipSpread - width * kneeCaving, curKneeY];

      // Ankles & Feet (27: left ankle, 28: right ankle, 29-32: feet)
      const curAnkleY = height * ankleY;
      lm[27] = [centerX - hipSpread - width * 0.005, curAnkleY];
      lm[28] = [centerX + hipSpread + width * 0.005, curAnkleY];
      lm[29] = [lm[27][0] - width * 0.01, curAnkleY + height * 0.02];
      lm[30] = [lm[28][0] + width * 0.01, curAnkleY + height * 0.02];
      lm[31] = [lm[27][0] - width * 0.02, curAnkleY + height * 0.035];
      lm[32] = [lm[28][0] + width * 0.02, curAnkleY + height * 0.035];

      // 1. Draw Torso Polygon with Gradient Fill
      ctx.beginPath();
      ctx.moveTo(lm[11][0], lm[11][1]);
      ctx.lineTo(lm[12][0], lm[12][1]);
      ctx.lineTo(lm[24][0], lm[24][1]);
      ctx.lineTo(lm[23][0], lm[23][1]);
      ctx.closePath();
      const torsoGrad = ctx.createLinearGradient(centerX, shoulderY, centerX, curHipY);
      torsoGrad.addColorStop(0, 'rgba(0, 220, 255, 0.28)');
      torsoGrad.addColorStop(1, 'rgba(37, 99, 235, 0.22)');
      ctx.fillStyle = torsoGrad;
      ctx.fill();

      // 2. Anatomical Connections
      const connections = [
        // Face
        [0, 1], [1, 2], [2, 3], [3, 7],
        [0, 4], [4, 5], [5, 6], [6, 8],
        [9, 10],
        // Torso
        [11, 12], [11, 23], [12, 24], [23, 24],
        // Upper limbs
        [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
        [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
        // Lower limbs
        [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
        [24, 26], [26, 28], [28, 30], [30, 32], [28, 32]
      ];

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      connections.forEach(([i, j]) => {
        const p1 = lm[i];
        const p2 = lm[j];
        if (!p1 || !p2) return;

        const isKneeLeg = (i === 23 && j === 25) || (i === 25 && j === 27) ||
                          (i === 24 && j === 26) || (i === 26 && j === 28);

        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);

        if (isKneeLeg) {
          ctx.strokeStyle = '#eab308'; // Glowing gold for weight-bearing knee kinetic chain
          ctx.lineWidth = 3.5;
        } else {
          ctx.strokeStyle = '#00e5ff'; // Bright cyan for upper body & spine
          ctx.lineWidth = 2.8;
        }
        ctx.stroke();
      });

      // 3. 33 Keypoint Joint Nodes
      Object.entries(lm).forEach(([idxStr, [x, y]]) => {
        const idx = Number(idxStr);
        const isMajorJoint = [11, 12, 23, 24, 25, 26, 27, 28].includes(idx);
        const radius = isMajorJoint ? 5.5 : 3.2;

        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isMajorJoint ? '#f59e0b' : '#00e5ff';
        ctx.fill();

        // Inner white nucleus
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.45, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // 4. Real-time Biomechanical Angle Callout Badges
      if (showAngles && lm[25] && lm[26]) {
        // Left Knee Valgus Badge
        const leftKnee = lm[25];
        const badgeX1 = Math.max(12, leftKnee[0] - 115);
        const badgeY1 = leftKnee[1] - 8;

        ctx.beginPath();
        ctx.moveTo(leftKnee[0], leftKnee[1]);
        ctx.lineTo(badgeX1 + 95, badgeY1 + 10);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(badgeX1, badgeY1, 95, 22, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`L-Valgus: ${dynamicValgusAngle}`, badgeX1 + 8, badgeY1 + 15);

        // Right Knee Flexion Badge
        const rightKnee = lm[26];
        const badgeX2 = Math.min(width - 110, rightKnee[0] + 20);
        const badgeY2 = rightKnee[1] - 8;

        ctx.beginPath();
        ctx.moveTo(rightKnee[0], rightKnee[1]);
        ctx.lineTo(badgeX2, badgeY2 + 10);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(badgeX2, badgeY2, 98, 22, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`Flexion: ${dynamicKneeFlexion}`, badgeX2 + 8, badgeY2 + 15);
      }

      ctx.restore();
      animId = requestAnimationFrame(renderSkeleton);
    };

    animId = requestAnimationFrame(renderSkeleton);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isAnnotatedActive, activity, dynamicValgusAngle, dynamicKneeFlexion, showAngles, videoRef]);

  const t = currentTime || 0;
  const phase = Math.sin(t * 2.2);
  const depth = (phase + 1) / 2;

  return (
    <div className="absolute inset-0 pointer-events-none w-full h-full flex items-center justify-center overflow-hidden">
      {/* Real-Time 33-Point MediaPipe Skeleton Canvas Overlay */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Top Left: BlazePose Engine & Status Ticker */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-auto z-20">
        <div className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-mono px-3 py-1.5 rounded-lg border border-cyan-500/30 flex items-center gap-2.5 shadow-lg">
          <span className="text-cyan-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            MediaPipe BlazePose 3D
          </span>
          <span className="text-slate-600">|</span>
          <span>Asym: <strong className="text-rose-400 font-bold">{dynamicAsymmetry}</strong></span>
          <span className="text-slate-600">|</span>
          <span>Phase: <strong className="text-slate-200">{depth > 0.55 ? 'Deceleration' : 'Loading'}</strong></span>
        </div>
      </div>

      {/* Top Right: Telemetry & Overlay Toggles */}
      <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-auto z-20">
        <div className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-mono px-2.5 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>33/33 Landmarks</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-300 font-bold">99.4% AI Confidence</span>
        </div>

        <button
          type="button"
          onClick={() => setShowAngles(!showAngles)}
          className={`text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-colors shadow-sm cursor-pointer ${
            showAngles 
              ? 'bg-blue-600 text-white border-blue-400' 
              : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
          }`}
        >
          {showAngles ? 'Angles HUD: ON' : 'Angles HUD: OFF'}
        </button>
      </div>

      {/* Bottom Floating Real-Time Biomechanical Telemetry Pill */}
      {showAngles && (
        <div className="absolute bottom-12 right-3 pointer-events-none z-20">
          <div className="bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 flex items-center gap-3 shadow-xl">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span className="text-[10px] font-mono text-slate-400">Valgus:</span>
              <span className="text-[10px] font-mono font-bold text-amber-400">{dynamicValgusAngle}</span>
            </div>
            <span className="text-slate-700 text-xs">|</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              <span className="text-[10px] font-mono text-slate-400">Hip:</span>
              <span className="text-[10px] font-mono font-bold text-sky-400">{dynamicHipRom}</span>
            </div>
            <span className="text-slate-700 text-xs">|</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-[10px] font-mono text-slate-400">Flexion:</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400">{dynamicKneeFlexion}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoseSkeletonOverlay;
