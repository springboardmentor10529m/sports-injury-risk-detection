import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isWebGLAvailable } from './webglCheck';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Sparkles, Activity } from 'lucide-react';

function RingSegmentsScene({
  flexibility = 0,
  strength = 0,
  balance = 0,
  endurance = 0
}) {
  const groupRef = useRef();
  const mouseRef = useRef({ x: 0, y: 0 });

  const handlePointerMove = (e) => {
    mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 0.4;
    mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 0.4;
  };

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Slow continuous harmonic rotation
    groupRef.current.rotation.z += delta * 0.15;

    // Subtle responsive tilt to mouse position
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      mouseRef.current.y * 0.8,
      0.05
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      mouseRef.current.x * 0.8,
      0.05
    );
  });

  return (
    <group ref={groupRef} onPointerMove={handlePointerMove} position={[0, 0.18, 0]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[2, 2, 3]} intensity={1.5} color="#38bdf8" />

      {/* Background Track Rings (visible in neutral slate) */}
      <mesh>
        <torusGeometry args={[1.35, 0.015, 16, 64, Math.PI * 2]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.4} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.18, 0.015, 16, 64, Math.PI * 2]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.4} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.01, 0.015, 16, 64, Math.PI * 2]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.4} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.84, 0.015, 16, 64, Math.PI * 2]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.4} />
      </mesh>

      {/* Ring 1: Flexibility (Outer Cyan) */}
      {flexibility > 0 && (
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[1.35, 0.035, 16, 64, (Math.min(flexibility, 100) / 100) * Math.PI * 1.9]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#22d3ee"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      )}

      {/* Ring 2: Strength (Emerald) */}
      {strength > 0 && (
        <mesh rotation={[0, 0, Math.PI * 0.5]}>
          <torusGeometry args={[1.18, 0.035, 16, 64, (Math.min(strength, 100) / 100) * Math.PI * 1.9]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#34d399"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      )}

      {/* Ring 3: Balance (Amber) */}
      {balance > 0 && (
        <mesh rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[1.01, 0.035, 16, 64, (Math.min(balance, 100) / 100) * Math.PI * 1.9]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#fbbf24"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      )}

      {/* Ring 4: Endurance (Indigo) */}
      {endurance > 0 && (
        <mesh rotation={[0, 0, Math.PI * 1.5]}>
          <torusGeometry args={[0.84, 0.035, 16, 64, (Math.min(endurance, 100) / 100) * Math.PI * 1.9]} />
          <meshStandardMaterial
            color="#8b5cf6"
            emissive="#a78bfa"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      )}

      {/* Inner Central Glowing Core Disc */}
      <mesh>
        <circleGeometry args={[0.65, 32]} />
        <meshBasicMaterial
          color="#030712"
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

function Ring2DFallback({ overallScore, flexibility = 0, strength = 0, balance = 0, endurance = 0, isAssessed = true }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center -translate-y-4">
      <svg viewBox="0 0 200 200" className="w-68 h-68 transform -rotate-90">
        {/* Ring 1 - Flexibility */}
        <circle cx="100" cy="100" r="75" stroke="#1e293b" strokeWidth="6" fill="none" />
        {isAssessed && flexibility > 0 && (
          <circle
            cx="100"
            cy="100"
            r="75"
            stroke="#06b6d4"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${(flexibility / 100) * 471} 471`}
            className="transition-all duration-1000"
          />
        )}
        {/* Ring 2 - Strength */}
        <circle cx="100" cy="100" r="62" stroke="#1e293b" strokeWidth="6" fill="none" />
        {isAssessed && strength > 0 && (
          <circle
            cx="100"
            cy="100"
            r="62"
            stroke="#10b981"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${(strength / 100) * 390} 390`}
            className="transition-all duration-1000"
          />
        )}
        {/* Ring 3 - Balance */}
        <circle cx="100" cy="100" r="49" stroke="#1e293b" strokeWidth="6" fill="none" />
        {isAssessed && balance > 0 && (
          <circle
            cx="100"
            cy="100"
            r="49"
            stroke="#f59e0b"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${(balance / 100) * 307} 307`}
            className="transition-all duration-1000"
          />
        )}
        {/* Ring 4 - Endurance */}
        <circle cx="100" cy="100" r="36" stroke="#1e293b" strokeWidth="6" fill="none" />
        {isAssessed && endurance > 0 && (
          <circle
            cx="100"
            cy="100"
            r="36"
            stroke="#8b5cf6"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${(endurance / 100) * 226} 226`}
            className="transition-all duration-1000"
          />
        )}
      </svg>
    </div>
  );
}

export const PerformanceRing3D = ({
  flexibility = 0,
  strength = 0,
  balance = 0,
  endurance = 0,
  hasData = true,
  className = '',
}) => {
  const [webglSupported] = useState(() => isWebGLAvailable());

  // Check if athlete has real evaluated metrics
  const isAssessed = Boolean(hasData && (flexibility > 0 || strength > 0 || balance > 0 || endurance > 0));

  // Overall performance score is weighted average if assessed
  const overallScore = isAssessed
    ? Math.round(flexibility * 0.25 + strength * 0.3 + balance * 0.25 + endurance * 0.2)
    : null;

  return (
    <div className={`relative w-full min-h-[460px] h-[460px] md:h-[480px] flex items-center justify-center rounded-3xl bg-slate-950/70 border border-slate-800/80 overflow-hidden shadow-2xl ${className}`}>
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* 3D or 2D Radial Rings */}
      <div className="absolute inset-0">
        {webglSupported ? (
          <Suspense fallback={<Ring2DFallback overallScore={overallScore} flexibility={flexibility} strength={strength} balance={balance} endurance={endurance} isAssessed={isAssessed} />}>
            <Canvas camera={{ position: [0, 0, 4.15], fov: 45 }}>
              <RingSegmentsScene
                flexibility={flexibility}
                strength={strength}
                balance={balance}
                endurance={endurance}
              />
            </Canvas>
          </Suspense>
        ) : (
          <Ring2DFallback
            overallScore={overallScore}
            flexibility={flexibility}
            strength={strength}
            balance={balance}
            endurance={endurance}
            isAssessed={isAssessed}
          />
        )}
      </div>

      {/* Center Overall Score Floating Badge */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none -translate-y-4">
        <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
          OVERALL PERFORMANCE
        </span>
        {isAssessed ? (
          <>
            <div className="text-5xl font-mono font-black text-white drop-shadow-[0_0_16px_rgba(6,182,212,0.6)] my-0.5">
              <AnimatedNumber value={overallScore} duration={1000} />
            </div>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold tracking-wider">
              INDEX SCORE
            </span>
          </>
        ) : (
          <>
            <div className="text-4xl font-mono font-black text-slate-500 my-1">
              --
            </div>
            <span className="text-[10px] font-mono text-cyan-400/90 font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/50">
              AWAITING SCREENING
            </span>
          </>
        )}
      </div>

      {/* Legend Surrounding the Ring */}
      <div className="absolute bottom-4 left-6 right-6 z-20 flex items-center justify-between text-xs font-mono text-slate-300 border border-slate-800/80 bg-slate-900/60 backdrop-blur-md rounded-2xl px-5 py-3 pointer-events-none shadow-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isAssessed ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'bg-slate-600'}`} />
          <span>Flex: {isAssessed ? `${flexibility}%` : '--'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isAssessed ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`} />
          <span>Str: {isAssessed ? `${strength}%` : '--'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isAssessed ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]' : 'bg-slate-600'}`} />
          <span>Bal: {isAssessed ? `${balance}%` : '--'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isAssessed ? 'bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.8)]' : 'bg-slate-600'}`} />
          <span>End: {isAssessed ? `${endurance}%` : '--'}</span>
        </div>
      </div>
    </div>
  );
};
