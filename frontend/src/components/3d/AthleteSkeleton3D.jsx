import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { JointNode3D } from './JointNode3D';
import { BoneConnection3D } from './BoneConnection3D';
import { MotionParticles } from './MotionParticles';
import { isWebGLAvailable } from './webglCheck';
import { COCO_KEYPOINTS, COCO_CONNECTIONS } from './skeletonConstants';
import { Activity } from 'lucide-react';

export { COCO_KEYPOINTS, COCO_CONNECTIONS };

// Baseline anatomical standing pose in local 3D coordinates [x, y, z]
const BASE_POSE_3D = [
  [0.0, 0.85, 0.05],     // 0: nose
  [-0.04, 0.88, 0.03],   // 1: left_eye
  [0.04, 0.88, 0.03],    // 2: right_eye
  [-0.08, 0.86, -0.02],  // 3: left_ear
  [0.08, 0.86, -0.02],   // 4: right_ear
  [-0.22, 0.70, 0.0],    // 5: left_shoulder
  [0.22, 0.70, 0.0],     // 6: right_shoulder
  [-0.32, 0.42, 0.03],   // 7: left_elbow
  [0.32, 0.42, 0.03],    // 8: right_elbow
  [-0.35, 0.15, 0.08],   // 9: left_wrist
  [0.35, 0.15, 0.08],    // 10: right_wrist
  [-0.14, 0.08, 0.0],    // 11: left_hip
  [0.14, 0.08, 0.0],     // 12: right_hip
  [-0.16, -0.38, 0.04],  // 13: left_knee
  [0.16, -0.38, 0.04],   // 14: right_knee
  [-0.16, -0.85, 0.0],   // 15: left_ankle
  [0.16, -0.85, 0.0]     // 16: right_ankle
];

/**
 * Inner Three.js Scene containing the animated skeleton nodes, bones, and hover logic.
 */
function SkeletonScene({
  mode = 'demo',
  liveKeypoints = null,
  selectedJoint = null,
  onSelectJoint = null,
  onHoverJoint = null,
  highlightRisk = false,
  showParticles = true
}) {
  const [positions, setPositions] = useState(BASE_POSE_3D);
  const timeRef = useRef(0);

  // Compute live animated coordinates
  useFrame((_, delta) => {
    if (mode === 'demo') {
      timeRef.current += delta * 1.5;
      const t = timeRef.current;

      // 5-Phase Looping Athletic Motion (running / knee lift / weight shift)
      const cycle = t % 6;
      const progress = cycle / 6;

      const kneeLift = Math.max(0, Math.sin(progress * Math.PI * 2)) * 0.35;
      const armSwing = Math.sin(progress * Math.PI * 2) * 0.25;
      const hipShift = Math.sin(progress * Math.PI * 2) * 0.06;
      const bounce = Math.abs(Math.sin(progress * Math.PI * 4)) * 0.05;

      const newPos = BASE_POSE_3D.map((base, idx) => {
        const p = [...base];
        p[1] += bounce;

        // Left knee & ankle flexion
        if (idx === 13) {
          p[1] += kneeLift;
          p[2] += kneeLift * 0.8;
        } else if (idx === 15) {
          p[1] += kneeLift * 1.1;
          p[2] += kneeLift * 0.4;
        }

        // Right leg counter-stabilization
        if (idx === 14) {
          p[1] -= bounce * 0.5;
        }

        // Left Arm Forward Drive
        if (idx === 7) {
          p[2] += armSwing;
          p[1] += Math.abs(armSwing) * 0.15;
        } else if (idx === 9) {
          p[2] += armSwing * 1.5;
          p[1] += Math.abs(armSwing) * 0.25;
        }

        // Right Arm Backward Drive
        if (idx === 8) {
          p[2] -= armSwing * 0.8;
        } else if (idx === 10) {
          p[2] -= armSwing * 1.2;
        }

        // Torso weight shift
        if (idx === 11 || idx === 12) {
          p[0] += hipShift;
        }

        return p;
      });

      setPositions(newPos);
    } else if (mode === 'live' && liveKeypoints) {
      // Map detected COCO 17 keypoints from real video analysis
      const mapped = COCO_KEYPOINTS.map((name, idx) => {
        const kp = liveKeypoints[name] || (Array.isArray(liveKeypoints) ? liveKeypoints[idx] : null);
        if (!kp) return BASE_POSE_3D[idx];

        const normX = typeof kp.x === 'number' ? (kp.x > 1 ? (kp.x - 960) / 960 : (kp.x - 0.5) * 2) : BASE_POSE_3D[idx][0];
        const normY = typeof kp.y === 'number' ? (kp.y > 1 ? (540 - kp.y) / 540 : (0.5 - kp.y) * 2) : BASE_POSE_3D[idx][1];

        let estimatedZ = 0.0;
        if (idx === 7 || idx === 9) estimatedZ = 0.08;
        if (idx === 8 || idx === 10) estimatedZ = -0.08;
        if (idx === 13 || idx === 15) estimatedZ = 0.05;

        return [normX * 0.8, normY * 0.9, estimatedZ];
      });

      setPositions(mapped);
    }
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[3, 4, 3]} intensity={1.5} color="#38bdf8" />
      <pointLight position={[-3, -2, -2]} intensity={0.9} color="#818cf8" />
      <directionalLight position={[0, 5, 2]} intensity={1.2} />

      {/* Floating ambient motion particles */}
      {showParticles && <MotionParticles count={50} radius={2.5} />}

      {/* Render 16 Anatomical Bones */}
      {COCO_CONNECTIONS.map(([startIdx, endIdx], i) => (
        <BoneConnection3D
          key={`bone-${i}`}
          start={positions[startIdx]}
          end={positions[endIdx]}
          color="#0284c7"
          emissive="#0369a1"
          radius={0.016}
        />
      ))}

      {/* Render 17 COCO Joint Spheres */}
      {positions.map((pos, idx) => {
        const name = COCO_KEYPOINTS[idx];
        const isSelected = selectedJoint === name;
        const riskLevel = highlightRisk
          ? (idx === 13 || idx === 14 ? 'HIGH' : idx === 11 || idx === 12 ? 'MODERATE' : 'SAFE')
          : 'SAFE';

        return (
          <JointNode3D
            key={name}
            name={name}
            position={pos}
            confidence={0.97}
            riskLevel={riskLevel}
            isSelected={isSelected}
            onSelect={onSelectJoint}
            onHover={onHoverJoint}
            radius={idx < 5 ? 0.035 : 0.048}
          />
        );
      })}

      {/* Limited OrbitControls to prevent losing model off-screen */}
      <OrbitControls
        enablePan={false}
        minDistance={1.8}
        maxDistance={4.2}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={(2 * Math.PI) / 3}
        rotateSpeed={0.6}
        zoomSpeed={0.5}
      />
    </>
  );
}

/**
 * 2D Fallback Component when WebGL is unavailable or fails.
 */
function Skeleton2DFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 rounded-2xl border border-cyan-500/20">
      <div className="relative w-48 h-64">
        <svg viewBox="0 0 100 140" className="w-full h-full text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
          <line x1="50" y1="26" x2="50" y2="65" stroke="#0284c7" strokeWidth="2.5" />
          <line x1="32" y1="36" x2="68" y2="36" stroke="#0284c7" strokeWidth="2.5" />
          <line x1="32" y1="36" x2="20" y2="54" stroke="#0284c7" strokeWidth="2" />
          <line x1="20" y1="54" x2="14" y2="72" stroke="#0284c7" strokeWidth="1.8" />
          <line x1="68" y1="36" x2="80" y2="54" stroke="#0284c7" strokeWidth="2" />
          <line x1="80" y1="54" x2="86" y2="72" stroke="#0284c7" strokeWidth="1.8" />
          <line x1="38" y1="65" x2="62" y2="65" stroke="#0284c7" strokeWidth="2.5" />
          <line x1="38" y1="65" x2="34" y2="96" stroke="#0284c7" strokeWidth="2.2" />
          <line x1="34" y1="96" x2="32" y2="128" stroke="#0284c7" strokeWidth="2" />
          <line x1="62" y1="65" x2="66" y2="96" stroke="#0284c7" strokeWidth="2.2" />
          <line x1="66" y1="96" x2="68" y2="128" stroke="#0284c7" strokeWidth="2" />
          
          <circle cx="50" cy="18" r="7" fill="#030712" stroke="#22d3ee" strokeWidth="2" />
          <circle cx="32" cy="36" r="3" fill="#06b6d4" />
          <circle cx="68" cy="36" r="3" fill="#06b6d4" />
          <circle cx="20" cy="54" r="3" fill="#06b6d4" />
          <circle cx="80" cy="54" r="3" fill="#06b6d4" />
          <circle cx="14" cy="72" r="2.5" fill="#38bdf8" />
          <circle cx="86" cy="72" r="2.5" fill="#38bdf8" />
          <circle cx="38" cy="65" r="3.5" fill="#818cf8" />
          <circle cx="62" cy="65" r="3.5" fill="#818cf8" />
          <circle cx="34" cy="96" r="3.5" fill="#34d399" />
          <circle cx="66" cy="96" r="3.5" fill="#34d399" />
          <circle cx="32" cy="128" r="3" fill="#38bdf8" />
          <circle cx="68" cy="128" r="3" fill="#38bdf8" />
        </svg>
      </div>
      <div className="mt-2 space-y-1">
        <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800">
          2D Biomechanics Mode Active
        </span>
        <p className="text-[11px] text-slate-400">WebGL hardware acceleration disabled or unavailable</p>
      </div>
    </div>
  );
}

/**
 * Main Exported AthleteSkeleton3D Component.
 */
export const AthleteSkeleton3D = ({
  mode = 'demo',
  liveKeypoints = null,
  selectedJoint = null,
  onSelectJoint = null,
  highlightRisk = false,
  className = 'w-full h-[450px]',
  showHudLabels = true
}) => {
  const [hoveredJoint, setHoveredJoint] = useState(null);
  const [webglSupported] = useState(() => isWebGLAvailable());

  return (
    <div className={`relative ${className} rounded-3xl overflow-hidden bg-slate-950/70 border border-slate-800/80 group shadow-2xl`}>
      {/* Background ambient lighting gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 tech-grid-pattern opacity-40 pointer-events-none" />

      {/* Top Status Header */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
            {mode === 'demo' ? 'DEMO MOVEMENT CYCLE' : 'ESTIMATED 3D POSE'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
          17 COCO Keypoints • 60 FPS
        </span>
      </div>

      {/* Floating HUD Region Badges (Demo Mode) */}
      {showHudLabels && mode === 'demo' && (
        <div className="absolute top-16 right-4 z-20 pointer-events-none space-y-2 hidden md:block">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md text-[11px] font-mono">
            <span className="text-slate-400 block text-[9px] uppercase">Knee Flexion</span>
            <span className="text-cyan-400 font-bold">42.8° • Optimal</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md text-[11px] font-mono">
            <span className="text-slate-400 block text-[9px] uppercase">Hip Symmetry</span>
            <span className="text-emerald-400 font-bold">96.2% • Balanced</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md text-[11px] font-mono">
            <span className="text-slate-400 block text-[9px] uppercase">Trunk Lean</span>
            <span className="text-slate-300 font-bold">3.2° • Stable</span>
          </div>
        </div>
      )}

      {/* Hovered Joint Telemetry Tooltip */}
      {hoveredJoint && (
        <div className="absolute bottom-4 left-4 z-30 p-3 rounded-xl bg-slate-900/95 border border-cyan-500/50 backdrop-blur-xl shadow-2xl font-mono text-xs space-y-1 animate-fadeIn pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase">{hoveredJoint.name.replace(/_/g, ' ')}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
              {hoveredJoint.riskLevel}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 space-y-0.5">
            <div>Confidence: <strong className="text-cyan-400">{((hoveredJoint.confidence || 0.97) * 100).toFixed(1)}%</strong></div>
            <div>Pos X: {hoveredJoint.position[0].toFixed(2)} | Y: {hoveredJoint.position[1].toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Canvas 3D or 2D Fallback */}
      {webglSupported ? (
        <Suspense fallback={<Skeleton2DFallback />}>
          <Canvas
            camera={{ position: [0, 0, 3.2], fov: 45 }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            gl={{ antialias: true, alpha: true }}
          >
            <SkeletonScene
              mode={mode}
              liveKeypoints={liveKeypoints}
              selectedJoint={selectedJoint}
              onSelectJoint={onSelectJoint}
              onHoverJoint={setHoveredJoint}
              highlightRisk={highlightRisk}
            />
          </Canvas>
        </Suspense>
      ) : (
        <Skeleton2DFallback />
      )}

      {/* Corner interactive hint */}
      <div className="absolute bottom-3 right-4 z-20 text-[10px] font-mono text-slate-500 pointer-events-none flex items-center gap-1">
        <span>Rotate • Zoom • Hover Joints</span>
      </div>
    </div>
  );
};
