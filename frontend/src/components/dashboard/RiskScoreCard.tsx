import React from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { RiskBadge } from '../ui/Badge';
import { RiskCategory } from '../../lib/types';
import { ShieldAlertIcon, InfoIcon } from '../ui/Icons';

interface RiskScoreCardProps {
  score?: number | null;
  category?: RiskCategory | string | null;
  title?: string;
  isPendingPipeline?: boolean;
}

export function RiskScoreCard({
  score,
  category,
  title = 'Injury Risk Assessment',
  isPendingPipeline = false,
}: RiskScoreCardProps) {
  const hasData = score !== undefined && score !== null;

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlertIcon className="w-5 h-5 text-brand-primary" />
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
        {hasData && <RiskBadge category={category} />}
      </CardHeader>
      <CardBody className="flex flex-col items-center justify-center p-6 text-center">
        {hasData ? (
          <div className="space-y-3">
            <div className="text-5xl font-extrabold text-slate-900 tracking-tight">
              {Math.round(score)}
              <span className="text-xl font-medium text-slate-400">/100</span>
            </div>
            <p className="text-sm font-medium text-slate-600">
              Risk Level: <span className="font-semibold text-slate-900">{category || 'Assessed'}</span>
            </p>
          </div>
        ) : isPendingPipeline ? (
          <div className="py-4 space-y-2">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <InfoIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">AI Risk Pipeline Pending</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Biomechanical computer-vision model & risk prediction services are scheduled for upcoming phases.
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            <p className="text-sm text-slate-500">No movement assessment recorded yet.</p>
            <p className="text-xs text-slate-400">Upload a movement video to generate a baseline risk profile.</p>
          </div>
        )}

        <div className="w-full mt-6 pt-4 border-t border-slate-100 flex items-start gap-2 text-left">
          <InfoIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-normal">
            <strong>Clinical Notice:</strong> SafeMove outputs are decision-support signals designed for injury risk stratification, not medical diagnoses.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
