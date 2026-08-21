'use client';

import React, { useEffect, useRef } from 'react';
import { PoseFrame, LandmarkCoordinate } from '../../lib/types';

interface PoseOverlayProps {
  frames: PoseFrame[];
  currentTime: number;
  showOverlay?: boolean;
  useSmoothed?: boolean;
}

// Skeletal connectivity pairs for 15 landmarks
const SKELETON_CONNECTIONS: Array<[string, string]> = [
  // Head & Neck
  ['NOSE', 'LEFT_SHOULDER'],
  ['NOSE', 'RIGHT_SHOULDER'],
  ['LEFT_SHOULDER', 'RIGHT_SHOULDER'],

  // Upper Limbs
  ['LEFT_SHOULDER', 'LEFT_ELBOW'],
  ['LEFT_ELBOW', 'LEFT_WRIST'],
  ['RIGHT_SHOULDER', 'RIGHT_ELBOW'],
  ['RIGHT_ELBOW', 'RIGHT_WRIST'],

  // Torso
  ['LEFT_SHOULDER', 'LEFT_HIP'],
  ['RIGHT_SHOULDER', 'RIGHT_HIP'],
  ['LEFT_HIP', 'RIGHT_HIP'],

  // Lower Limbs
  ['LEFT_HIP', 'LEFT_KNEE'],
  ['LEFT_KNEE', 'LEFT_ANKLE'],
  ['LEFT_ANKLE', 'LEFT_FOOT_INDEX'],

  ['RIGHT_HIP', 'RIGHT_KNEE'],
  ['RIGHT_KNEE', 'RIGHT_ANKLE'],
  ['RIGHT_ANKLE', 'RIGHT_FOOT_INDEX'],
];

export const PoseOverlay: React.FC<PoseOverlayProps> = ({
  frames,
  currentTime,
  showOverlay = true,
  useSmoothed = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showOverlay || !frames || frames.length === 0) {
      return;
    }

    // Binary search / find nearest frame to currentTime
    let closestFrame: PoseFrame | null = null;
    let minDiff = Infinity;

    for (let i = 0; i < frames.length; i++) {
      const diff = Math.abs(frames[i].timestamp_seconds - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = frames[i];
      }
    }

    // Only draw if within 0.2s of a frame
    if (!closestFrame || minDiff > 0.25) {
      return;
    }

    const landmarksDict = useSmoothed
      ? closestFrame.landmarks
      : (closestFrame.raw_landmarks || closestFrame.landmarks);

    if (!landmarksDict) return;

    const width = canvas.width;
    const height = canvas.height;

    // Helper to get canvas pixel point from normalized [0, 1] landmark
    const getPoint = (lm?: LandmarkCoordinate): { x: number; y: number; vis: number } | null => {
      if (!lm) return null;
      return {
        x: lm.x * width,
        y: lm.y * height,
        vis: lm.visibility ?? 1.0,
      };
    };

    // Draw Skeletal Bones / Connections
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    for (const [startName, endName] of SKELETON_CONNECTIONS) {
      const ptA = getPoint(landmarksDict[startName]);
      const ptB = getPoint(landmarksDict[endName]);

      if (ptA && ptB && ptA.vis > 0.25 && ptB.vis > 0.25) {
        // Color coding by limb side
        const isLeft = startName.startsWith('LEFT') || endName.startsWith('LEFT');
        const isRight = startName.startsWith('RIGHT') || endName.startsWith('RIGHT');

        if (isLeft) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)'; // Blue for Left
        } else if (isRight) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)'; // Emerald for Right
        } else {
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)'; // Amber for Central / Head
        }

        ctx.beginPath();
        ctx.moveTo(ptA.x, ptA.y);
        ctx.lineTo(ptB.x, ptB.y);
        ctx.stroke();
      }
    }

    // Draw Landmark Nodes
    for (const [name, lm] of Object.entries(landmarksDict)) {
      const pt = getPoint(lm);
      if (!pt || pt.vis < 0.2) continue;

      const isLeft = name.startsWith('LEFT');
      const isRight = name.startsWith('RIGHT');

      // Outer glow
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = isLeft ? '#3b82f6' : isRight ? '#10b981' : '#f59e0b';
      ctx.fill();

      // Inner center dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }, [frames, currentTime, showOverlay, useSmoothed]);

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      className="absolute inset-0 w-full h-full pointer-events-none object-contain z-10"
    />
  );
};
