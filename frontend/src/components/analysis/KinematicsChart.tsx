'use client';

import React, { useState } from 'react';
import { KinematicsResponse, JointMetricStats, AsymmetryMetricDetail } from '../../lib/types';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ActivityIcon, BarChartIcon } from '../ui/Icons';

interface KinematicsChartProps {
  kinematics: KinematicsResponse;
  currentTime: number;
  onSeek?: (timestamp: number) => void;
}

type MetricCategory = 'knee' | 'hip' | 'valgus' | 'trunk' | 'ankle' | 'velocity';

export const KinematicsChart: React.FC<KinematicsChartProps> = ({
  kinematics,
  currentTime,
  onSeek,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricCategory>('knee');

  const timestamps = kinematics.timestamps || [];
  const curves = kinematics.joint_angle_curves || {};
  const velocities = kinematics.angular_velocities || {};
  const asymmetry = kinematics.asymmetry_metrics || {};
  const summary = kinematics.summary_metrics || {};

  if (timestamps.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No kinematic timeseries data available.
      </div>
    );
  }

  // Determine series to display based on selected category
  let series1Name = 'Left Knee';
  let series2Name = 'Right Knee';
  let series1Data: Array<number | null> = curves.left_knee_angle || [];
  let series2Data: Array<number | null> = curves.right_knee_angle || [];
  let unit = '°';
  let asymmetryInfo: AsymmetryMetricDetail | undefined = asymmetry.knee_flexion_asymmetry;
  let statsLeft = summary.left_knee as JointMetricStats | undefined;
  let statsRight = summary.right_knee as JointMetricStats | undefined;

  if (selectedMetric === 'hip') {
    series1Name = 'Left Hip';
    series2Name = 'Right Hip';
    series1Data = curves.left_hip_angle || [];
    series2Data = curves.right_hip_angle || [];
    asymmetryInfo = asymmetry.hip_flexion_asymmetry;
    statsLeft = summary.left_hip as JointMetricStats | undefined;
    statsRight = summary.right_hip as JointMetricStats | undefined;
  } else if (selectedMetric === 'valgus') {
    series1Name = 'Left Knee Valgus';
    series2Name = 'Right Knee Valgus';
    series1Data = curves.left_knee_valgus || [];
    series2Data = curves.right_knee_valgus || [];
    asymmetryInfo = asymmetry.knee_valgus_asymmetry;
    statsLeft = summary.left_knee_valgus as JointMetricStats | undefined;
    statsRight = summary.right_knee_valgus as JointMetricStats | undefined;
  } else if (selectedMetric === 'trunk') {
    series1Name = 'Trunk Forward Lean';
    series2Name = 'Lateral Tilt';
    series1Data = curves.trunk_lean || [];
    series2Data = curves.trunk_lateral_tilt || [];
    asymmetryInfo = undefined;
    statsLeft = summary.trunk_lean as JointMetricStats | undefined;
    statsRight = summary.trunk_lateral_tilt as JointMetricStats | undefined;
  } else if (selectedMetric === 'ankle') {
    series1Name = 'Left Ankle';
    series2Name = 'Right Ankle';
    series1Data = curves.left_ankle_angle || [];
    series2Data = curves.right_ankle_angle || [];
    asymmetryInfo = undefined;
    statsLeft = undefined;
    statsRight = undefined;
  } else if (selectedMetric === 'velocity') {
    series1Name = 'Left Knee Velocity';
    series2Name = 'Right Knee Velocity';
    series1Data = velocities.left_knee_angle_velocity || [];
    series2Data = velocities.right_knee_angle_velocity || [];
    unit = '°/s';
    asymmetryInfo = undefined;
    statsLeft = undefined;
    statsRight = undefined;
  }

  // Compute bounding dimensions for SVG plotting
  const validValues = [...series1Data, ...series2Data].filter((v): v is number => v !== null && !isNaN(v));
  const minY = validValues.length > 0 ? Math.floor(Math.min(...validValues) / 10) * 10 - 5 : 0;
  const maxY = validValues.length > 0 ? Math.ceil(Math.max(...validValues) / 10) * 10 + 5 : 180;
  const rangeY = Math.max(1, maxY - minY);

  const minTime = timestamps[0] || 0;
  const maxTime = timestamps[timestamps.length - 1] || 1;
  const duration = Math.max(0.1, maxTime - minTime);

  // SVG viewport
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const getSvgX = (t: number) => paddingLeft + ((t - minTime) / duration) * plotWidth;
  const getSvgY = (v: number) => paddingTop + plotHeight - ((v - minY) / rangeY) * plotHeight;

  // Build SVG Path strings
  const buildPath = (data: Array<number | null>) => {
    let path = '';
    let isDrawing = false;

    for (let i = 0; i < timestamps.length; i++) {
      const val = data[i];
      if (val !== null && !isNaN(val)) {
        const x = getSvgX(timestamps[i]);
        const y = getSvgY(val);
        if (!isDrawing) {
          path += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
          isDrawing = true;
        } else {
          path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      } else {
        isDrawing = false;
      }
    }
    return path;
  };

  const path1 = buildPath(series1Data);
  const path2 = buildPath(series2Data);
  const cursorX = getSvgX(currentTime);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const normX = (clickX - (paddingLeft / svgWidth) * rect.width) / ((plotWidth / svgWidth) * rect.width);
    const clampedNorm = Math.max(0, Math.min(1, normX));
    const targetTime = minTime + clampedNorm * duration;
    onSeek(targetTime);
  };

  return (
    <div className="space-y-6">
      {/* Metric Selector Buttons */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs font-semibold">
        <button
          onClick={() => setSelectedMetric('knee')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            selectedMetric === 'knee'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Knee Flexion Angle
        </button>
        <button
          onClick={() => setSelectedMetric('hip')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            selectedMetric === 'hip'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Hip Flexion Angle
        </button>
        <button
          onClick={() => setSelectedMetric('valgus')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            selectedMetric === 'valgus'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Dynamic Knee Valgus
        </button>
        <button
          onClick={() => setSelectedMetric('trunk')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            selectedMetric === 'trunk'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Trunk Lean & Tilt
        </button>
        <button
          onClick={() => setSelectedMetric('ankle')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            selectedMetric === 'ankle'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Ankle Angle
        </button>
        <button
          onClick={() => setSelectedMetric('velocity')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            selectedMetric === 'velocity'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Angular Velocity
        </button>
      </div>

      {/* Main Graph Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-brand-primary" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Kinematic Angle Timeseries</h3>
              <p className="text-xs text-slate-500 font-mono">
                Duration: {duration.toFixed(2)}s • Frames: {timestamps.length}
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span className="text-slate-700">{series1Name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-700">{series2Name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span className="text-slate-500">Cursor ({currentTime.toFixed(2)}s)</span>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-4 sm:p-6">
          <div className="relative w-full overflow-hidden bg-slate-950 rounded-2xl p-2 shadow-inner">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto cursor-crosshair select-none"
              onClick={handleSvgClick}
            >
              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                const yVal = minY + frac * rangeY;
                const yPos = getSvgY(yVal);
                return (
                  <g key={frac}>
                    <line
                      x1={paddingLeft}
                      y1={yPos}
                      x2={svgWidth - paddingRight}
                      y2={yPos}
                      stroke="#334155"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={yPos + 4}
                      fill="#94a3b8"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {yVal.toFixed(0)}{unit}
                    </text>
                  </g>
                );
              })}

              {/* Time Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
                const tVal = minTime + frac * duration;
                const xPos = getSvgX(tVal);
                return (
                  <text
                    key={frac}
                    x={xPos}
                    y={svgHeight - 10}
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {tVal.toFixed(1)}s
                  </text>
                );
              })}

              {/* Series 1 Line (Blue) */}
              <path
                d={path1}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Series 2 Line (Emerald) */}
              <path
                d={path2}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Synchronized Playback Cursor Line (Rose) */}
              {cursorX >= paddingLeft && cursorX <= svgWidth - paddingRight && (
                <line
                  x1={cursorX}
                  y1={paddingTop}
                  x2={cursorX}
                  y2={paddingTop + plotHeight}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
              )}
            </svg>
          </div>
        </CardBody>
      </Card>

      {/* Quantitative Mathematical Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Left Stats */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            {series1Name} Stats
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs text-slate-500">Peak Angle:</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {statsLeft?.max !== undefined && statsLeft?.max !== null ? `${statsLeft.max}${unit}` : 'N/A'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Range of Motion:</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {statsLeft?.range !== undefined && statsLeft?.range !== null ? `${statsLeft.range}${unit}` : 'N/A'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Mean Angle:</span>
            <span className="text-sm font-bold text-slate-700 font-mono">
              {statsLeft?.mean !== undefined && statsLeft?.mean !== null ? `${statsLeft.mean}${unit}` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Right Stats */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            {series2Name} Stats
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs text-slate-500">Peak Angle:</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {statsRight?.max !== undefined && statsRight?.max !== null ? `${statsRight.max}${unit}` : 'N/A'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Range of Motion:</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {statsRight?.range !== undefined && statsRight?.range !== null ? `${statsRight.range}${unit}` : 'N/A'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Mean Angle:</span>
            <span className="text-sm font-bold text-slate-700 font-mono">
              {statsRight?.mean !== undefined && statsRight?.mean !== null ? `${statsRight.mean}${unit}` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Bilateral Asymmetry Index */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
            Bilateral Asymmetry
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs text-slate-500">Mean Asymmetry:</span>
            <span className="text-sm font-bold text-purple-900 font-mono">
              {asymmetryInfo?.mean !== undefined && asymmetryInfo?.mean !== null
                ? `${asymmetryInfo.mean.toFixed(1)}%`
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Peak Asymmetry:</span>
            <span className="text-sm font-bold text-rose-600 font-mono">
              {asymmetryInfo?.peak !== undefined && asymmetryInfo?.peak !== null
                ? `${asymmetryInfo.peak.toFixed(1)}%`
                : 'N/A'}
            </span>
          </div>
          <div className="pt-1">
            <Badge
              variant={
                asymmetryInfo?.mean && asymmetryInfo.mean > 15
                  ? 'danger'
                  : asymmetryInfo?.mean && asymmetryInfo.mean > 10
                  ? 'warning'
                  : 'success'
              }
              size="sm"
            >
              {asymmetryInfo?.mean && asymmetryInfo.mean > 15
                ? 'High Asymmetry'
                : asymmetryInfo?.mean && asymmetryInfo.mean > 10
                ? 'Moderate Asymmetry'
                : 'Symmetric Range (<10%)'}
            </Badge>
          </div>
        </div>

        {/* Mathematical Model Info */}
        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 shadow-sm space-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 text-brand-primary font-bold">
            <BarChartIcon className="w-4 h-4" />
            <span>Biomechanical Kinematics</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500 pt-1">
            Planar 3-point joint angles &theta; = arccos(&mu; &middot; v / (||u|| ||v||)) computed from 15 MediaPipe anatomical landmarks with temporal Savitzky-Golay filtering.
          </p>
        </div>
      </div>
    </div>
  );
};
