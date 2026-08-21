import React from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { RiskComponentScores } from '../../lib/types';
import { ActivityIcon, InfoIcon } from '../ui/Icons';

interface RiskBreakdownProps {
  scores?: RiskComponentScores | null;
  isPendingPipeline?: boolean;
}

export function RiskBreakdown({ scores, isPendingPipeline = false }: RiskBreakdownProps) {
  const hasData = !!scores;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActivityIcon className="w-5 h-5 text-brand-secondary" />
          <h2 className="text-base font-semibold text-slate-900">Risk Factor Weights & Breakdown</h2>
        </div>
        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
          Standard Model
        </span>
      </CardHeader>
      <CardBody className="p-6">
        {hasData ? (
          <div className="space-y-4">
            <BreakdownBar label="Biomechanical Deviations" value={scores.biomechanical} weight={35} color="bg-indigo-600" />
            <BreakdownBar label="Historical Injury Factors" value={scores.historical} weight={20} color="bg-rose-500" />
            <BreakdownBar label="Movement Asymmetry" value={scores.asymmetry} weight={20} color="bg-amber-500" />
            <BreakdownBar label="Training Load Indicators" value={scores.training_load} weight={15} color="bg-teal-500" />
            <BreakdownBar label="Fatigue Indicators" value={scores.fatigue} weight={10} color="bg-blue-500" />
          </div>
        ) : isPendingPipeline ? (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-4 text-xs text-slate-500 flex items-center gap-2">
              <InfoIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Weights specification baseline. Bar values will compute dynamically upon ML pipeline release.</span>
            </div>
            <BreakdownBar label="Biomechanical Deviations" value={0} weight={35} color="bg-indigo-600" isPending />
            <BreakdownBar label="Historical Injury Factors" value={0} weight={20} color="bg-rose-500" isPending />
            <BreakdownBar label="Movement Asymmetry" value={0} weight={20} color="bg-amber-500" isPending />
            <BreakdownBar label="Training Load Indicators" value={0} weight={15} color="bg-teal-500" isPending />
            <BreakdownBar label="Fatigue Indicators" value={0} weight={10} color="bg-blue-500" isPending />
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-slate-400">
            No component breakdown recorded.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function BreakdownBar({
  label,
  value,
  weight,
  color,
  isPending = false,
}: {
  label: string;
  value: number;
  weight: number;
  color: string;
  isPending?: boolean;
}) {
  const percentage = Math.min(Math.max(value, 0), 100);

  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1.5">
        <span className="text-slate-700">
          {label} <span className="text-slate-400 font-normal">({weight}% weight)</span>
        </span>
        <span className="text-slate-900 font-semibold">{isPending ? 'Pending' : `${Math.round(value)}/100`}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        {isPending ? (
          <div className="h-full bg-slate-200 w-full animate-pulse" />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}
