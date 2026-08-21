'use client';

import React from 'react';
import { MetricDeviationDetail, AnomalySeverity } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardBody } from '../ui/Card';

interface DeviationMetricsCardProps {
  deviations: Record<string, MetricDeviationDetail>;
}

export const DeviationMetricsCard: React.FC<DeviationMetricsCardProps> = ({ deviations }) => {
  const entries = Object.entries(deviations);

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No metric deviation records available.
      </div>
    );
  }

  // Group by category
  const categories = Array.from(new Set(entries.map(([_, d]) => d.category)));

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
      {categories.map((cat) => {
        const catEntries = entries.filter(([_, d]) => d.category === cat);
        return (
          <Card key={cat}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{cat}</h3>
                <span className="text-xs text-slate-400">Developmental baseline comparisons</span>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {catEntries.length} Metrics
              </span>
            </CardHeader>

            <CardBody className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catEntries.map(([key, d]) => {
                  const obs = d.observed !== undefined ? d.observed : null;
                  return (
                    <div
                      key={key}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all space-y-2.5"
                    >
                      {/* Metric Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 leading-tight block">
                            {d.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {d.metric}
                          </span>
                        </div>
                        <Badge variant={getSeverityBadgeVariant(d.severity)} size="sm">
                          {formatSeverityLabel(d.severity)}
                        </Badge>
                      </div>

                      {/* Values */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                        <div>
                          <span className="text-[11px] text-slate-500 block">Observed:</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {obs !== null ? `${obs}${d.unit}` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">Baseline (Dev):</span>
                          <span className="font-mono font-bold text-slate-700 text-sm">
                            {d.baseline_mean}{d.unit}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            ± {d.baseline_std}{d.unit}
                          </span>
                        </div>
                      </div>

                      {/* Independent Statistical Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/40 font-mono">
                        <div>
                          <span>Z-Score: </span>
                          <strong className={d.z_score && Math.abs(d.z_score) > 2 ? 'text-rose-600' : 'text-slate-800'}>
                            {d.z_score !== null && d.z_score !== undefined ? `${d.z_score > 0 ? '+' : ''}${d.z_score}` : 'N/A'}
                          </strong>
                        </div>
                        <div>
                          <span>Percent Dev: </span>
                          <strong className="text-slate-800">
                            {d.percent_deviation !== null && d.percent_deviation !== undefined ? `${d.percent_deviation}%` : 'N/A'}
                          </strong>
                        </div>
                        <div>
                          <span>Abs Dev: </span>
                          <strong className="text-slate-800">
                            {d.absolute_deviation !== null && d.absolute_deviation !== undefined ? `${d.absolute_deviation}${d.unit}` : 'N/A'}
                          </strong>
                        </div>
                        <div>
                          <span>Range Dev: </span>
                          <strong className={d.is_out_of_range ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                            {d.range_deviation > 0 ? `+${d.range_deviation}${d.unit}` : '0.0'}
                          </strong>
                        </div>
                      </div>

                      {/* Rule Explanation */}
                      {d.severity_derivation_rule && (
                        <div className="text-[10px] text-slate-500 bg-white/70 p-2 rounded-xl border border-slate-200/50 leading-relaxed font-mono">
                          {d.severity_derivation_rule}
                        </div>
                      )}

                      {/* Footer Baseline Tag */}
                      <div className="text-[10px] text-slate-400 font-medium italic pt-1 flex items-center justify-between border-t border-slate-200/40">
                        <span>Type: {d.baseline_type}</span>
                        <span>Range: [{d.baseline_range[0]}–{d.baseline_range[1]}{d.unit}]</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};
