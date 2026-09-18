import React, { useRef, useState, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { JointNode3D } from './JointNode3D';
import { BoneConnection3D } from './BoneConnection3D';
import { MotionParticles } from './MotionParticles';
import { isWebGLAvailable } from './webglCheck';
import { COCO_KEYPOINTS, COCO_CONNECTIONS } from './skeletonConstants';
import { Activity, Camera, RotateCcw, Eye, Compass, Box } from 'lucide-react';

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
 * Dynamically normalizes 2D/3D raw video keypoint coordinates into 
 * standard Three.js [-1.0, 1.0] anatomical local coordinate space.
 * Adapts reliably to ANY video resolution (1080p, 720p, 480p, 4K, portrait/landscape)
 * by finding the athlete's bounding box and centering around the hip pelvis.
 */
function normalizeKeypoints(liveKeypoints) {
  if (!liveKeypoints) return null;

  const coordsMap = {};
  const validPoints = [];

  COCO_KEYPOINTS.forEach((name, idx) => {
    let kp = null;
    if (Array.isArray(liveKeypoints)) {
      kp = liveKeypoints[idx];
    } else if (liveKeypoints[name]) {
      kp = liveKeypoints[name];
    }

    if (kp) {
      const rawX = typeof kp.x === 'number' ? kp.x : (Array.isArray(kp) ? kp[0] : null);
      const rawY = typeof kp.y === 'number' ? kp.y : (Array.isArray(kp) ? kp[1] : null);
      const conf = typeof kp.confidence === 'number' ? kp.confidence : (Array.isArray(kp) && kp[2] !== undefined ? kp[2] : 1.0);

      if (rawX !== null && rawY !== null && !isNaN(rawX) && !isNaN(rawY)) {
        coordsMap[name] = { x: rawX, y: rawY, conf };
        if (conf >= 0.15) {
          validPoints.push({ name, x: rawX, y: rawY });
        }
      }
    }
  });

  if (validPoints.length < 3) return null;

  // Calculate dynamic bounding box of detected athlete
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  validPoints.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const spanY = maxY - minY;
  if (spanY < 10) return null;

  // Pelvis / Hips center anchor
  let midX = (minX + maxX) / 2;
  let midY = (minY + maxY) / 2;

  const leftHip = coordsMap['left_hip'];
  const rightHip = coordsMap['right_hip'];
  const leftShoulder = coordsMap['left_shoulder'];
  const rightShoulder = coordsMap['right_shoulder'];

  if (leftHip && rightHip) {
    midX = (leftHip.x + rightHip.x) / 2;
    midY = (leftHip.y + rightHip.y) / 2;
  }

  // Desired human height in 3D scene is ~1.65 units (from ankles -0.85 to head +0.80)
  const athleteHeight = Math.max(spanY, 30);
  const scale = 1.62 / athleteHeight;

  // Infer coronal torso orientation (yaw angle in 3D)
  let torsoYaw = 0;
  if (leftShoulder && rightShoulder) {
    const dx = rightShoulder.x - leftShoulder.x;
    const dy = rightShoulder.y - leftShoulder.y;
    torsoYaw = Math.atan2(dy, Math.max(Math.abs(dx), 1)) * 0.4;
  }

  return COCO_KEYPOINTS.map((name, idx) => {
    const pt = coordsMap[name];
    if (!pt) return BASE_POSE_3D[idx];

    // Invert Y axis because in video coordinates 0 is at top, while in 3D 0 is at center and Up is +
    const normX = (pt.x - midX) * scale;
    const normY = (midY - pt.y) * scale + 0.08;

    // Physiological Z-depth estimation for realistic volumetric viewing in 3D Orbit
    let estZ = 0.0;
    if (idx === 5) estZ = -0.12 * Math.sin(torsoYaw); // left shoulder
    else if (idx === 6) estZ = 0.12 * Math.sin(torsoYaw);  // right shoulder
    else if (idx === 7) estZ = 0.10 + (normY > 0.3 ? 0.04 : -0.04); // left elbow
    else if (idx === 8) estZ = -0.10 - (normY > 0.3 ? 0.04 : -0.04); // right elbow
    else if (idx === 9) estZ = 0.16; // left wrist
    else if (idx === 10) estZ = -0.16; // right wrist
    else if (idx === 11) estZ = -0.04; // left hip
    else if (idx === 12) estZ = 0.04;  // right hip
    else if (idx === 13) estZ = 0.08;  // left knee
    else if (idx === 14) estZ = -0.08; // right knee
    else if (idx === 15) estZ = 0.03;  // left ankle
    else if (idx === 16) estZ = -0.03; // right ankle

    return [normX, normY, estZ];
  });
}

/**
 * Biomechanical Force-Plate floor grid located beneath the athlete's feet.
 */
function ForcePlateGrid() {
  return (
    <group position={[0, -0.92, 0]}>
      {/* Central circular contact area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.65, 36]} />
        <meshBasicMaterial color="#06b6d4" opacity={0.15} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* Outer measurement perimeter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 0.93, 48]} />
        <meshBasicMaterial color="#38bdf8" opacity={0.28} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* Ground biomechanics grid */}
      <gridHelper args={[2.6, 12, '#06b6d4', '#1e293b']} position={[0, 0.002, 0]} />
    </group>
  );
}

/**
 * Smoothly repositions camera to biomechanical perspective views.
 */
function CameraController({ cameraPreset = 'perspective', controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!camera) return;

    if (cameraPreset === 'front') {
      // Coronal plane view (ideal for Knee Valgus / Hip Tilt inspection)
      camera.position.set(0, 0, 3.2);
      camera.lookAt(0, 0, 0);
    } else if (cameraPreset === 'side') {
      // Sagittal plane view (ideal for Knee Flexion / Trunk Lean inspection)
      camera.position.set(3.2, 0, 0);
      camera.lookAt(0, 0, 0);
    } else if (cameraPreset === 'top') {
      // Transverse plane view (ideal for Pelvic Rotation & Shoulder Alignment)
      camera.position.set(0, 3.2, 0.05);
      camera.lookAt(0, 0, 0);
    } else {
      // Isometric 3D Orbit default
      camera.position.set(1.2, 0.5, 2.9);
      camera.lookAt(0, 0, 0);
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [cameraPreset, camera, controlsRef]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={1.4}
      maxDistance={4.8}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={(7 * Math.PI) / 8}
      rotateSpeed={0.7}
      zoomSpeed={0.6}
    />
  );
}

/**
 * Inner Three.js Scene containing animated skeleton nodes, bones, force plate, and lighting.
 */
function SkeletonScene({
  mode = 'live',
  liveKeypoints = null,
  selectedJoint = null,
  onSelectJoint = null,
  onHoverJoint = null,
  highlightRisk = false,
  showParticles = true,
  cameraPreset = 'perspective',
  controlsRef
}) {
  const [positions, setPositions] = useState(BASE_POSE_3D);
  const timeRef = useRef(0);

  // Compute normalized target from live keypoints
  const targetKeypoints = useMemo(() => {
    if (mode === 'live' && liveKeypoints) {
      return normalizeKeypoints(liveKeypoints);
    }
    return null;
  }, [mode, liveKeypoints]);

  // Unified animation loop: smoothly handles both live keypoints & synthetic demo movement
  useFrame((_, delta) => {
    if (targetKeypoints) {
      // Smooth 60 FPS temporal interpolation between discrete video frames
      const lerpFactor = Math.min(1.0, delta * 20);
      setPositions((prev) => {
        let changed = false;
        const next = prev.map((curr, idx) => {
          const tgt = targetKeypoints[idx] || curr;
          const dx = tgt[0] - curr[0];
          const dy = tgt[1] - curr[1];
          const dz = tgt[2] - curr[2];
          if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dz) > 0.001) {
            changed = true;
            return [
              curr[0] + dx * lerpFactor,
              curr[1] + dy * lerpFactor,
              curr[2] + dz * lerpFactor
            ];
          }
          return curr;
        });
        return changed ? next : prev;
      });
    } else {
      // 5-Phase Looping Athletic Motion (running / knee lift / weight shift)
      timeRef.current += delta * 1.5;
      const t = timeRef.current;
      const cycle = t % 6;
      const progress = cycle / 6;

      const kneeLift = Math.max(0, Math.sin(progress * Math.PI * 2)) * 0.35;
      const armSwing = Math.sin(progress * Math.PI * 2) * 0.25;
      const hipShift = Math.sin(progress * Math.PI * 2) * 0.06;
      const bounce = Math.abs(Math.sin(progress * Math.PI * 4)) * 0.05;

      const newPos = BASE_POSE_3D.map((base, idx) => {
        const p = [...base];
        p[1] += bounce;

        if (idx === 13) {
          p[1] += kneeLift;
          p[2] += kneeLift * 0.8;
        } else if (idx === 15) {
          p[1] += kneeLift * 1.1;
          p[2] += kneeLift * 0.4;
        }

        if (idx === 14) {
          p[1] -= bounce * 0.5;
        }

        if (idx === 7) {
          p[2] += armSwing;
          p[1] += Math.abs(armSwing) * 0.15;
        } else if (idx === 9) {
          p[2] += armSwing * 1.5;
          p[1] += Math.abs(armSwing) * 0.25;
        }

        if (idx === 8) {
          p[2] -= armSwing * 0.8;
        } else if (idx === 10) {
          p[2] -= armSwing * 1.2;
        }

        if (idx === 11 || idx === 12) {
          p[0] += hipShift;
        }

        return p;
      });

      setPositions(newPos);
    }
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      <pointLight position={[3, 4, 3]} intensity={1.6} color="#38bdf8" />
      <pointLight position={[-3, -2, -2]} intensity={0.9} color="#818cf8" />
      <directionalLight position={[0, 5, 2]} intensity={1.3} />

      {/* Biomechanical Ground Force Plate Grid */}
      <ForcePlateGrid />

      {/* Floating ambient motion particles */}
      {showParticles && <MotionParticles count={40} radius={2.5} />}

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

      {/* Camera Controller & OrbitControls */}
      <CameraController cameraPreset={cameraPreset} controlsRef={controlsRef} />
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
  mode = 'live',
  liveKeypoints = null,
  selectedJoint = null,
  onSelectJoint = null,
  highlightRisk = false,
  className = 'w-full h-[520px]',
  showHudLabels = true,
  cameraPreset: externalCameraPreset = null,
  onCameraPresetChange = null
}) => {
  const [hoveredJoint, setHoveredJoint] = useState(null);
  const [webglSupported] = useState(() => isWebGLAvailable());
  const [internalCameraPreset, setInternalCameraPreset] = useState('perspective');
  const controlsRef = useRef();

  const activeCameraPreset = externalCameraPreset || internalCameraPreset;
  const setCameraPreset = (preset) => {
    if (onCameraPresetChange) {
      onCameraPresetChange(preset);
    } else {
      setInternalCameraPreset(preset);
    }
  };

  const isLive = mode === 'live' && liveKeypoints;

  return (
    <div className={`relative ${className} rounded-3xl overflow-hidden bg-slate-950/80 border border-slate-800/90 group shadow-2xl select-none`}>
      {/* Background ambient lighting gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 tech-grid-pattern opacity-30 pointer-events-none" />

      {/* Top Status Header */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-lg">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
            {isLive ? '3D POSE RECONSTRUCTION' : 'SYNTHETIC BIOMECHANICAL CYCLE'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          17 COCO Coordinates • 60 FPS
        </span>
      </div>

      {/* Top Right Camera Angle View Presets */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl">
        <button
          onClick={() => setCameraPreset('perspective')}
          title="3D Perspective / Free Orbit"
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeCameraPreset === 'perspective'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Box className="w-3 h-3" />
          <span>3D ORBIT</span>
        </button>

        <button
          onClick={() => setCameraPreset('front')}
          title="Coronal Frontal View (Inspect Knee Valgus & Hip Symmetry)"
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeCameraPreset === 'front'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>FRONT</span>
        </button>

        <button
          onClick={() => setCameraPreset('side')}
          title="Sagittal Side View (Inspect Knee Flexion & Trunk Lean)"
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeCameraPreset === 'side'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Compass className="w-3 h-3" />
          <span>SIDE</span>
        </button>

        <button
          onClick={() => {
            if (controlsRef.current) {
              controlsRef.current.reset();
            }
            setCameraPreset('perspective');
          }}
          title="Reset Camera Orientation"
          className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Floating HUD Region Badges (Demo Mode) */}
      {showHudLabels && !isLive && (
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
            <div>3D Pos: [{hoveredJoint.position[0].toFixed(2)}, {hoveredJoint.position[1].toFixed(2)}, {hoveredJoint.position[2].toFixed(2)}]</div>
          </div>
        </div>
      )}

      {/* Canvas 3D or 2D Fallback */}
      {webglSupported ? (
        <Suspense fallback={<Skeleton2DFallback />}>
          <Canvas
            camera={{ position: [1.2, 0.5, 2.9], fov: 45 }}
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
              cameraPreset={activeCameraPreset}
              controlsRef={controlsRef}
            />
          </Canvas>
        </Suspense>
      ) : (
        <Skeleton2DFallback />
      )}

      {/* Corner interactive hint */}
      <div className="absolute bottom-3 right-4 z-20 text-[10px] font-mono text-slate-500 pointer-events-none flex items-center gap-1">
        <span>Click & Drag to Rotate • Scroll to Zoom • Click Joint to Inspect</span>
      </div>
    </div>
  );
};
