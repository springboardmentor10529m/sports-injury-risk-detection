import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { isWebGLAvailable } from './webglCheck';
import { MotionParticles } from './MotionParticles';

export const BiomechanicsScene = ({
  children,
  cameraPosition = [0, 0, 3],
  fov = 45,
  showParticles = true,
  enableOrbit = true,
  className = 'w-full h-full'
}) => {
  const [webglSupported] = useState(() => isWebGLAvailable());

  if (!webglSupported) {
    return (
      <div className={`${className} flex items-center justify-center p-6 bg-slate-950/90 rounded-2xl border border-slate-800 text-center`}>
        <span className="text-xs font-mono text-slate-400">
          3D Canvas Acceleration Disabled — 2D Engine Active
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className} overflow-hidden rounded-2xl`}>
      <Suspense fallback={<div className="w-full h-full bg-slate-950 animate-pulse" />}>
        <Canvas
          camera={{ position: cameraPosition, fov }}
          gl={{ antialias: true, alpha: true }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          <ambientLight intensity={0.7} />
          <pointLight position={[4, 5, 4]} intensity={1.5} color="#38bdf8" />
          <pointLight position={[-4, -3, -3]} intensity={0.8} color="#818cf8" />
          <directionalLight position={[0, 6, 2]} intensity={1.0} />

          {showParticles && <MotionParticles count={40} radius={3.0} />}

          {children}

          {enableOrbit && (
            <OrbitControls
              enablePan={false}
              minDistance={1.8}
              maxDistance={5.0}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={(3 * Math.PI) / 4}
              rotateSpeed={0.6}
            />
          )}
        </Canvas>
      </Suspense>
    </div>
  );
};
