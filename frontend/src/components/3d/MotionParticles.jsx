import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Ambient floating biomechanical particles.
 * Uses a single Points buffer geometry with limited count for optimal 60 FPS performance.
 */
export const MotionParticles = ({ count = 60, radius = 3.5, color = '#38bdf8' }) => {
  const pointsRef = useRef();

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      pos[idx] = (Math.random() - 0.5) * radius * 2;
      pos[idx + 1] = (Math.random() - 0.5) * radius * 1.8;
      pos[idx + 2] = (Math.random() - 0.5) * radius * 1.5;

      vel[idx] = (Math.random() - 0.5) * 0.002;
      vel[idx + 1] = (Math.random() - 0.5) * 0.003;
      vel[idx + 2] = (Math.random() - 0.5) * 0.002;
    }

    return { positions: pos, velocities: vel };
  }, [count, radius]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position;
    const array = posAttr.array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      array[idx + 1] += velocities[idx + 1];

      // Wrap around bounds
      if (array[idx + 1] > radius) array[idx + 1] = -radius;
      if (array[idx + 1] < -radius) array[idx + 1] = radius;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color={color}
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
