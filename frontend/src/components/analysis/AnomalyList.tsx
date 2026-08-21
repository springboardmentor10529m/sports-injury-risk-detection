'use client';

import React from 'react';
import { AnomalyEventItem, AnomalySeverity } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { ActivityIcon, CheckCircleIcon, ShieldAlertIcon } from '../ui/Icons';

interface AnomalyListProps {
  anomalies: AnomalyEventItem[];
  overallStatus: AnomalySeverity;
  onSeek?: (timestamp: number) => void;
}

export const AnomalyList: React.FC<AnomalyListProps> = ({
  anomalies,
  overallStatus,
  onSeek,
}) => {
  const getSeverityBadgeVariant = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'HIGH_DEVIATION':
        return 'danger';
      case 'MODERATE_DEVIATION':
        return 'warning';
      case 'MILD_DEVIATION':
        return 'info';
      case 'NORMAL':
      default:
        return 'success';
    }
  };

  const formatSeverityLabel = (severity: string) => {
    return severity.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      {/* Overall Assessment Status Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${
            overallStatus === 'HIGH_DEVIATION'
              ? 'bg-rose-100 text-rose-600'
              : overallStatus === 'MODERATE_DEVIATION'
              ? 'bg-amber-100 text-amber-600'
              : overallStatus === 'MILD_DEVIATION'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-emerald-100 text-emerald-600'
          }`}>
            {overallStatus === 'NORMAL' ? (
              <CheckCircleIcon className="w-6 h-6" />
            ) : (
              <ShieldAlertIcon className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Overall Movement Classification
              </span>
              <Badge variant={getSeverityBadgeVariant(overallStatus)} size="sm">
                {formatSeverityLabel(overallStatus)}
              </Badge>
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg">
              {overallStatus === 'NORMAL'
                ? 'Movement patterns match standard developmental ranges'
                : `${anomalies.length} Biomechanical Deviations Identified`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluated against SafeMove provisional developmental baselines.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 sm:text-right bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <span className="font-bold text-slate-700 block">Provisional Reference</span>
          <span className="italic text-[11px]">Non-clinical movement analysis</span>
        </div>
      </div>

      {/* Identified Deviations Feed */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-brand-primary" />
            <h3 className="font-bold text-slate-900 text-base">Identified Movement Deviations</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {anomalies.length} events logged
          </span>
        </CardHeader>

        <CardBody className="p-0 divide-y divide-slate-100">
          {anomalies.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">No Notable Deviations Detected</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Kinematic joint angles, symmetry indices, and angular velocities align with developmental baselines.
              </p>
            </div>
          ) : (
            anomalies.map((anom, idx) => {
              const obs = anom.observed !== undefined ? anom.observed : anom.observed_value;
              return (
                <div
                  key={idx}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {anom.metric_name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({anom.metric})
                      </span>
                      <Badge variant={getSeverityBadgeVariant(anom.severity)} size="sm">
                        {formatSeverityLabel(anom.severity)}
                      </Badge>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {anom.baseline_type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {anom.description}
                    </p>

                    {/* Independent Statistics Grid */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 pt-1">
                      <span>Observed: <strong className="text-slate-900">{obs}</strong></span>
                      <span>Mean: <strong className="text-slate-900">{anom.baseline_mean}</strong></span>
                      <span>Std: <strong className="text-slate-900">±{anom.baseline_std}</strong></span>
                      {anom.z_score !== null && anom.z_score !== undefined && (
                        <span>Z-Score: <strong className={Math.abs(anom.z_score) > 2 ? 'text-rose-600 font-bold' : 'text-slate-900'}>
                          {anom.z_score > 0 ? '+' : ''}{anom.z_score}
                        </strong></span>
                      )}
                      {anom.percent_deviation !== null && anom.percent_deviation !== undefined && (
                        <span>Percent Dev: <strong className="text-slate-900">{anom.percent_deviation}%</strong></span>
                      )}
                      {anom.range_deviation > 0 && (
                        <span>Range Dev: <strong className="text-amber-600">+{anom.range_deviation}</strong></span>
                      )}
                    </div>

                    {/* Explicit Derivation Rule */}
                    {anom.severity_derivation_rule && (
                      <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200/60 mt-1">
                        Rule: {anom.severity_derivation_rule}
                      </div>
                    )}
                  </div>

                  {/* Clickable Video Scrubbing Timestamp Button */}
                  {anom.timestamp_seconds !== null && anom.timestamp_seconds !== undefined && (
                    <div className="shrink-0">
                      <button
                        onClick={() => onSeek && onSeek(anom.timestamp_seconds!)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-brand-primary hover:bg-blue-100 text-xs font-bold transition-all border border-blue-200/60 shadow-sm"
                        title={`Jump video playback to ${anom.timestamp_seconds}s`}
                      >
                        <span>⏱</span>
                        <span>Seek to {anom.timestamp_seconds.toFixed(2)}s</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
};
