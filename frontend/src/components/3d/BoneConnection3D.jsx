import React, { useMemo } from 'react';
import * as THREE from 'three';

const UP_VECTOR = new THREE.Vector3(0, 1, 0);

/**
 * 3D Bone Cylinder connection linking two 3D joint nodes.
 * Efficiently computes position, orientation, and height using useMemo.
 */
export const BoneConnection3D = ({
  start = [0, 0, 0],
  end = [0, 0, 0],
  color = '#0284c7',
  emissive = '#0369a1',
  radius = 0.018,
  opacity = 0.85
}) => {
  const { midpoint, quaternion, length } = useMemo(() => {
    const vStart = new THREE.Vector3(...start);
    const vEnd = new THREE.Vector3(...end);

    const length = vStart.distanceTo(vEnd);
    if (length < 0.001) {
      return { midpoint: vStart, quaternion: new THREE.Quaternion(), length: 0.001 };
    }

    const midpoint = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);

    const direction = new THREE.Vector3().subVectors(vEnd, vStart).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP_VECTOR, direction);

    return { midpoint, quaternion, length };
  }, [start, end]);

  if (length < 0.001) return null;

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0.4}
        transparent
        opacity={opacity}
        roughness={0.3}
        metalness={0.7}
      />
    </mesh>
  );
};
