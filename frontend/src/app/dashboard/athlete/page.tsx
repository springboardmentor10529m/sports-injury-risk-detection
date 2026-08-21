'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { ApiClient } from '../../../lib/api';
import {
  AthleteProfile,
  InjuryHistory,
  TrainingLoad,
  RiskScoreResponse,
} from '../../../lib/types';
import { StatCard } from '../../../components/ui/StatCard';
import { RiskScoreCard } from '../../../components/dashboard/RiskScoreCard';
import { RiskBreakdown } from '../../../components/dashboard/RiskBreakdown';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Alert } from '../../../components/ui/Alert';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  ActivityIcon,
  VideoIcon,
  HeartPulseIcon,
  PlusIcon,
  CheckCircleIcon,
} from '../../../components/ui/Icons';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';

export default function AthleteDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [injuries, setInjuries] = useState<InjuryHistory[]>([]);
  const [loads, setLoads] = useState<TrainingLoad[]>([]);
  const [riskData, setRiskData] = useState<RiskScoreResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Training load logging form state
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLoad, setNewLoad] = useState({
    session_type: 'Practice',
    duration_minutes: 60,
    intensity: 6,
    rpe: 6.0,
    notes: '',
  });
  const [isLogging, setIsLogging] = useState(false);

  const fetchAthleteData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Find athlete profile associated with user
      const athletes = await ApiClient.listAthletes();
      const myProfile = athletes.find((a) => a.user_id === user.id);

      if (myProfile) {
        setProfile(myProfile);
        const [injuryRes, loadRes] = await Promise.all([
          ApiClient.getInjuryHistory(myProfile.id).catch(() => []),
          ApiClient.getTrainingLoad(myProfile.id).catch(() => []),
        ]);
        setInjuries(injuryRes);
        setLoads(loadRes);

        // Attempt risk score fetch (handle 501 stub gracefully)
        try {
          const riskRes = await ApiClient.getCurrentRisk(myProfile.id);
          setRiskData(riskRes);
        } catch {
          setRiskData(null);
        }
      }
    } catch (err) {
      console.error('Error fetching athlete dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAthleteData();
  }, [fetchAthleteData]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const newProf = await ApiClient.createAthleteProfile({
        user_id: user.id,
        sport: 'All-Round Athlete',
        position: 'General',
      });
      setProfile(newProf);
    } catch (err) {
      console.error('Failed to create profile', err);
    }
  };

  const handleLogTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsLogging(true);
    try {
      const recorded = await ApiClient.logTrainingLoad(profile.id, {
        date: new Date().toISOString().split('T')[0],
        session_type: newLoad.session_type,
        duration_minutes: Number(newLoad.duration_minutes),
        intensity: Number(newLoad.intensity),
        rpe: Number(newLoad.rpe),
        notes: newLoad.notes || null,
      });
      setLoads([recorded, ...loads]);
      setShowLogModal(false);
      setNewLoad({ session_type: 'Practice', duration_minutes: 60, intensity: 6, rpe: 6.0, notes: '' });
    } catch (err) {
      console.error('Failed to log training load', err);
    } finally {
      setIsLogging(false);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Athlete Hub</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Athlete'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sport: <span className="font-semibold text-slate-800">{profile?.sport || 'General Athletics'}</span>
            {profile?.position && <> • Position: <span className="font-semibold text-slate-800">{profile.position}</span></>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<PlusIcon className="w-4 h-4 text-brand-primary" />}
              onClick={() => setShowLogModal(true)}
            >
              Log Training Session
            </Button>
          )}
          <Link href="/upload">
            <Button variant="primary" size="md" leftIcon={<VideoIcon className="w-4 h-4" />}>
              Upload Movement Video
            </Button>
          </Link>
        </div>
      </div>

      {/* If athlete profile not created yet, offer instant 1-click init */}
      {!profile && (
        <Alert variant="info" title="Complete Athlete Registration Profile">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
            <p className="text-sm">Initialize your athlete record to enable movement tracking and load logging.</p>
            <Button size="sm" onClick={handleCreateProfile}>Initialize Profile</Button>
          </div>
        </Alert>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Recent Training Logs"
          value={loads.length}
          subtext="Total recorded workloads"
          icon={<ActivityIcon className="w-5 h-5 text-brand-primary" />}
        />
        <StatCard
          label="Past Injury Records"
          value={injuries.length}
          subtext="Documented clinical history"
          icon={<HeartPulseIcon className="w-5 h-5 text-rose-600" />}
          variant={injuries.length > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Movement Videos"
          value="0"
          subtext="Awaiting Video Engine"
          icon={<VideoIcon className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          label="Active Prescriptions"
          value="0"
          subtext="Awaiting Rec Engine"
          icon={<CheckCircleIcon className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* AI Risk & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskScoreCard
          score={riskData?.composite_score}
          category={riskData?.risk_category}
          isPendingPipeline={!riskData}
        />
        <RiskBreakdown
          scores={riskData?.component_scores}
          isPendingPipeline={!riskData}
        />
      </div>

      {/* Training Load History & Injury Records */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training Load Table */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Recorded Training Sessions</h3>
                <p className="text-xs text-slate-500">Self-reported exertion and duration logs</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowLogModal(true)}>
                + Log Session
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              {loads.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Duration</th>
                        <th className="px-6 py-3">Intensity (1-10)</th>
                        <th className="px-6 py-3">RPE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loads.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-3.5 font-medium text-slate-900">{l.date}</td>
                          <td className="px-6 py-3.5 text-slate-700">{l.session_type}</td>
                          <td className="px-6 py-3.5 text-slate-600">{l.duration_minutes} mins</td>
                          <td className="px-6 py-3.5">
                            <Badge variant={l.intensity >= 8 ? 'danger' : l.intensity >= 5 ? 'warning' : 'success'} size="sm">
                              {l.intensity}/10
                            </Badge>
                          </td>
                          <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">{l.rpe.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <EmptyState
                    icon={<ActivityIcon className="w-6 h-6" />}
                    title="No training sessions logged yet"
                    description="Keep track of your training volume, intensity, and perceived exertion."
                    actionLabel="Log First Session"
                    onAction={() => setShowLogModal(true)}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Injury History Card */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <h3 className="font-bold text-slate-900 text-base">Injury History</h3>
              <p className="text-xs text-slate-500">Clinical records for 20% risk weighting</p>
            </CardHeader>
            <CardBody className="p-6">
              {injuries.length > 0 ? (
                <div className="space-y-3">
                  {injuries.map((inj) => (
                    <div key={inj.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{inj.injury_type.replace('_', ' ')}</span>
                        <Badge variant={inj.severity === 'SEVERE' ? 'danger' : 'warning'} size="sm">
                          {inj.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">Region: {inj.body_region}</p>
                      <p className="text-[11px] text-slate-400">Occurred: {inj.date_occurred}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm font-semibold text-slate-700">No injury history recorded</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Your physiotherapist or sports medicine physician can log relevant past injuries.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Log Training Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Log Training Session</h3>
            <p className="text-xs text-slate-500 mb-4">Record your workout for training load calculations</p>

            <form onSubmit={handleLogTraining} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Session Type
                </label>
                <input
                  type="text"
                  required
                  value={newLoad.session_type}
                  onChange={(e) => setNewLoad({ ...newLoad, session_type: e.target.value })}
                  placeholder="e.g. Sprint Drills, Match, Gym"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="360"
                    required
                    value={newLoad.duration_minutes}
                    onChange={(e) => setNewLoad({ ...newLoad, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Intensity (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={newLoad.intensity}
                    onChange={(e) => setNewLoad({ ...newLoad, intensity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  RPE (Rate of Perceived Exertion 1.0 - 10.0)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  required
                  value={newLoad.rpe}
                  onChange={(e) => setNewLoad({ ...newLoad, rpe: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="outline" type="button" onClick={() => setShowLogModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isLogging}>
                  Save Training Log
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
