import React, { useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * 3D Joint Node representing a single COCO anatomical landmark.
 * Features an emissive core sphere and an outer glow sphere.
 */
export const JointNode3D = ({
  position,
  name,
  confidence = 0.95,
  angle = null,
  riskLevel = 'SAFE',
  isSelected = false,
  onSelect = null,
  onHover = null,
  radius = 0.05
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const meshRef = useRef();

  // Color mapping based on risk
  let primaryColor = '#06b6d4'; // Cyan default
  let emissiveColor = '#22d3ee';
  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    primaryColor = '#ef4444';
    emissiveColor = '#f87171';
  } else if (riskLevel === 'MODERATE') {
    primaryColor = '#f59e0b';
    emissiveColor = '#fbbf24';
  } else if (riskLevel === 'SAFE' || riskLevel === 'LOW') {
    primaryColor = '#10b981';
    emissiveColor = '#34d399';
  }

  const effectiveRadius = isSelected ? radius * 1.5 : isHovered ? radius * 1.3 : radius;

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setIsHovered(true);
    if (onHover) {
      onHover({ name, position, confidence, angle, riskLevel });
    }
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setIsHovered(false);
    if (onHover) {
      onHover(null);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(name);
    }
  };

  return (
    <group position={position}>
      {/* Core solid sphere */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[effectiveRadius, 16, 16]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={emissiveColor}
          emissiveIntensity={isSelected ? 1.5 : isHovered ? 1.2 : 0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer subtle glow halo */}
      <mesh>
        <sphereGeometry args={[effectiveRadius * 1.8, 12, 12]} />
        <meshBasicMaterial
          color={emissiveColor}
          transparent
          opacity={isSelected ? 0.35 : isHovered ? 0.25 : 0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
