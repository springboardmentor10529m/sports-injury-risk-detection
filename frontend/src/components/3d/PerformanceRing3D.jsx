import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isWebGLAvailable } from './webglCheck';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Sparkles, Activity } from 'lucide-react';

function RingSegmentsScene({
  flexibility = 75,
  strength = 82,
  balance = 78,
  endurance = 85
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
    <group ref={groupRef} onPointerMove={handlePointerMove}>
      <ambientLight intensity={0.7} />
      <pointLight position={[2, 2, 3]} intensity={1.5} color="#38bdf8" />

      {/* Ring 1: Flexibility (Outer Cyan) */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[1.35, 0.035, 16, 64, (flexibility / 100) * Math.PI * 1.9]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#22d3ee"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Ring 2: Strength (Emerald) */}
      <mesh rotation={[0, 0, Math.PI * 0.5]}>
        <torusGeometry args={[1.18, 0.035, 16, 64, (strength / 100) * Math.PI * 1.9]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#34d399"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Ring 3: Balance (Amber) */}
      <mesh rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[1.01, 0.035, 16, 64, (balance / 100) * Math.PI * 1.9]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#fbbf24"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Ring 4: Endurance (Indigo) */}
      <mesh rotation={[0, 0, Math.PI * 1.5]}>
        <torusGeometry args={[0.84, 0.035, 16, 64, (endurance / 100) * Math.PI * 1.9]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#a78bfa"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

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

function Ring2DFallback({ overallScore, flexibility, strength, balance, endurance }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-56 h-56 transform -rotate-90">
        {/* Ring 1 - Flexibility */}
        <circle cx="100" cy="100" r="75" stroke="#1e293b" strokeWidth="6" fill="none" />
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
        {/* Ring 2 - Strength */}
        <circle cx="100" cy="100" r="62" stroke="#1e293b" strokeWidth="6" fill="none" />
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
        {/* Ring 3 - Balance */}
        <circle cx="100" cy="100" r="49" stroke="#1e293b" strokeWidth="6" fill="none" />
        <circle
          cx="100"
          cy="100"
          r="49"
          stroke="#f59e0b"
          strokeWidth="6"
          fill="none"
          strokeDasharray={`${(balance / 100) * 308} 308`}
          className="transition-all duration-1000"
        />
        {/* Ring 4 - Endurance */}
        <circle cx="100" cy="100" r="36" stroke="#1e293b" strokeWidth="6" fill="none" />
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
      </svg>
    </div>
  );
}

export const PerformanceRing3D = ({
  flexibility = 75,
  strength = 82,
  balance = 78,
  endurance = 85
}) => {
  const [webglSupported] = useState(() => isWebGLAvailable());

  // Overall performance score is weighted average
  const overallScore = Math.round(
    flexibility * 0.25 + strength * 0.3 + balance * 0.25 + endurance * 0.2
  );

  return (
    <div className="relative w-full h-[320px] flex items-center justify-center rounded-3xl bg-slate-950/60 border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_65%)] pointer-events-none" />

      {/* 3D or 2D Radial Rings */}
      <div className="absolute inset-0">
        {webglSupported ? (
          <Suspense fallback={<Ring2DFallback overallScore={overallScore} flexibility={flexibility} strength={strength} balance={balance} endurance={endurance} />}>
            <Canvas camera={{ position: [0, 0, 3.4], fov: 45 }}>
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
          />
        )}
      </div>

      {/* Center Overall Score Floating Badge */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
          OVERALL PERFORMANCE
        </span>
        <div className="text-4xl font-mono font-black text-white drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]">
          <AnimatedNumber value={overallScore} duration={1000} />
        </div>
        <span className="text-[10px] font-mono text-cyan-400 font-semibold mt-0.5">
          INDEX SCORE
        </span>
      </div>

      {/* Legend Surrounding the Ring */}
      <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-900 pt-2 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Flex: {flexibility}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Str: {strength}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Bal: {balance}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-400" />
          <span>End: {endurance}%</span>
        </div>
      </div>
    </div>
  );
};
