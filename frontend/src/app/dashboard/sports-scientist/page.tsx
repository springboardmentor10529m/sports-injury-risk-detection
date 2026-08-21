'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../../lib/api';
import { AthleteProfile } from '../../../lib/types';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ComingSoonNotice } from '../../../components/ui/Alert';
import { BarChart3Icon, ActivityIcon, UsersIcon, FileTextIcon } from '../../../components/ui/Icons';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';

export default function SportsScientistDashboard() {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCohort() {
      try {
        const data = await ApiClient.listAthletes();
        setAthletes(data);
      } catch (err) {
        console.error('Failed to load athletes cohort', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCohort();
  }, []);

  const handleExportCSV = () => {
    if (athletes.length === 0) return;
    const headers = 'ID,Sport,Position,Height_CM,Weight_KG,Dominant_Side\n';
    const rows = athletes
      .map((a) => `${a.id},${a.sport},${a.position || ''},${a.height_cm || ''},${a.weight_kg || ''},${a.dominant_side || ''}`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `safemove_cohort_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Research Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Biomechanics & Sports Science</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
            Kinematic Research & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Population-level movement trends, asymmetry indices, and load-fatigue correlations
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          leftIcon={<FileTextIcon className="w-4 h-4 text-teal-600" />}
          onClick={handleExportCSV}
          disabled={athletes.length === 0}
        >
          Export Cohort CSV ({athletes.length})
        </Button>
      </div>

      {/* Cohort Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Cohort Size (Athletes)"
          value={athletes.length}
          subtext="Profiles in research database"
          icon={<UsersIcon className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          label="Biomechanical Timeseries"
          value="0 sessions"
          subtext="Awaiting Pose Engine"
          icon={<ActivityIcon className="w-5 h-5 text-brand-primary" />}
        />
        <StatCard
          label="Kinematic Anomalies"
          value="0"
          subtext="Awaiting Anomaly Pipeline"
          icon={<BarChart3Icon className="w-5 h-5 text-amber-500" />}
        />
      </div>

      {/* Analytics Coming Soon / Non-fabricated Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-bold text-slate-900 text-base">Longitudinal Asymmetry Curves</h3>
            <p className="text-xs text-slate-500">Limb balance across sprint deceleration & cut phases</p>
          </CardHeader>
          <CardBody className="p-6">
            <ComingSoonNotice
              feature="Bilateral Asymmetry Timeseries Chart"
              phase="Phase 3 (Kinematic Engine)"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-bold text-slate-900 text-base">Acute:Chronic Workload Ratio (ACWR)</h3>
            <p className="text-xs text-slate-500">Coupled training load indicators</p>
          </CardHeader>
          <CardBody className="p-6">
            <ComingSoonNotice
              feature="Workload vs Fatigue Trajectory Chart"
              phase="Phase 4 (Fatigue & Anomaly Engine)"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
