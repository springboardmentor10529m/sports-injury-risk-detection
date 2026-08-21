'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '../../../lib/api';
import { AthleteProfile, InjuryHistory, TrainingLoad, DominantSide } from '../../../lib/types';
import { Sidebar } from '../../../components/layout/Sidebar';
import { Header } from '../../../components/layout/Header';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatCard } from '../../../components/ui/StatCard';
import { RiskScoreCard } from '../../../components/dashboard/RiskScoreCard';
import { RiskBreakdown } from '../../../components/dashboard/RiskBreakdown';
import { ComingSoonNotice } from '../../../components/ui/Alert';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  UserIcon,
  ActivityIcon,
  HeartPulseIcon,
  VideoIcon,
} from '../../../components/ui/Icons';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';

export default function AthleteDetailPage() {
  const params = useParams();
  const athleteId = params.id as string;
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [injuries, setInjuries] = useState<InjuryHistory[]>([]);
  const [loads, setLoads] = useState<TrainingLoad[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'injuries' | 'training' | 'movement' | 'recommendations'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Edit Profile modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    sport: '',
    position: '',
    height_cm: 180,
    weight_kg: 75,
    dominant_side: DominantSide.RIGHT,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function loadAthleteData() {
      if (!athleteId) return;
      setIsLoading(true);
      try {
        const ath = await ApiClient.getAthlete(athleteId);
        setAthlete(ath);
        setEditForm({
          sport: ath.sport || '',
          position: ath.position || '',
          height_cm: ath.height_cm || 180,
          weight_kg: ath.weight_kg || 75,
          dominant_side: ath.dominant_side || DominantSide.RIGHT,
        });

        const [injHistory, loadHistory] = await Promise.all([
          ApiClient.getInjuryHistory(athleteId).catch(() => []),
          ApiClient.getTrainingLoad(athleteId).catch(() => []),
        ]);
        setInjuries(injHistory);
        setLoads(loadHistory);
      } catch (err) {
        console.error('Failed to load athlete details', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAthleteData();
  }, [athleteId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteId) return;
    setIsUpdating(true);
    try {
      const updated = await ApiClient.updateAthlete(athleteId, {
        sport: editForm.sport,
        position: editForm.position,
        height_cm: Number(editForm.height_cm),
        weight_kg: Number(editForm.weight_kg),
        dominant_side: editForm.dominant_side,
      });
      setAthlete(updated);
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update athlete profile', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <RoleGuard>
        <div className="p-8">
          <DashboardSkeleton />
        </div>
      </RoleGuard>
    );
  }

  if (!athlete) {
    return (
      <RoleGuard>
        <div className="p-12 text-center">
          <EmptyState
            icon={<UserIcon className="w-8 h-8" />}
            title="Athlete Profile Not Found"
            description="The requested athlete record does not exist in the database or you do not have permission to view it."
            actionLabel="Return to Athletes"
            onAction={() => router.push('/athletes')}
          />
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Profile Header Card */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-extrabold text-2xl shrink-0">
                    {athlete.sport?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                        {athlete.sport}
                      </h1>
                      <Badge variant="info" size="md">
                        {athlete.position || 'Athlete'}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-1">
                      ID: {athlete.id}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 mt-3">
                      <span>Height: <strong>{athlete.height_cm ? `${athlete.height_cm} cm` : 'Not set'}</strong></span>
                      <span>•</span>
                      <span>Weight: <strong>{athlete.weight_kg ? `${athlete.weight_kg} kg` : 'Not set'}</strong></span>
                      <span>•</span>
                      <span>Dominant Side: <strong>{athlete.dominant_side || 'Not set'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                    Edit Physical Stats
                  </Button>
                  <Link href="/upload">
                    <Button variant="primary" size="sm" leftIcon={<VideoIcon className="w-4 h-4" />}>
                      Upload Movement
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-sm font-semibold">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-3 px-4 transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === 'overview'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Overview & Risk
                </button>
                <button
                  onClick={() => setActiveTab('injuries')}
                  className={`pb-3 px-4 transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
                    activeTab === 'injuries'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>Injury History</span>
                  <Badge variant="neutral" size="sm">{injuries.length}</Badge>
                </button>
                <button
                  onClick={() => setActiveTab('training')}
                  className={`pb-3 px-4 transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
                    activeTab === 'training'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>Training Workload</span>
                  <Badge variant="neutral" size="sm">{loads.length}</Badge>
                </button>
                <button
                  onClick={() => setActiveTab('movement')}
                  className={`pb-3 px-4 transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === 'movement'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Movement Biomechanics
                </button>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`pb-3 px-4 transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === 'recommendations'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Prescriptions & Recs
                </button>
              </div>

              {/* Tab Content: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <StatCard
                      label="Training Logs Recorded"
                      value={loads.length}
                      subtext="Workload history entries"
                      icon={<ActivityIcon className="w-5 h-5 text-brand-primary" />}
                    />
                    <StatCard
                      label="Past Injury Records"
                      value={injuries.length}
                      subtext="Clinical historical factor"
                      icon={<HeartPulseIcon className="w-5 h-5 text-rose-600" />}
                      variant={injuries.length > 0 ? 'warning' : 'default'}
                    />
                    <StatCard
                      label="Movement Assessments"
                      value="0"
                      subtext="Awaiting Video Ingestion"
                      icon={<VideoIcon className="w-5 h-5 text-teal-600" />}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RiskScoreCard isPendingPipeline={true} />
                    <RiskBreakdown isPendingPipeline={true} />
                  </div>
                </div>
              )}

              {/* Tab Content: Injury History */}
              {activeTab === 'injuries' && (
                <Card>
                  <CardHeader>
                    <h3 className="font-bold text-slate-900 text-base">Documented Injury History</h3>
                    <p className="text-xs text-slate-500">Real clinical data from database</p>
                  </CardHeader>
                  <CardBody className="p-0">
                    {injuries.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-3">Injury Type</th>
                              <th className="px-6 py-3">Body Region</th>
                              <th className="px-6 py-3">Severity</th>
                              <th className="px-6 py-3">Occurred Date</th>
                              <th className="px-6 py-3">Recovery Duration</th>
                              <th className="px-6 py-3">Recurring</th>
                              <th className="px-6 py-3">Clinical Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {injuries.map((inj) => (
                              <tr key={inj.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-6 py-3.5 font-semibold text-slate-900">{inj.injury_type.replace('_', ' ')}</td>
                                <td className="px-6 py-3.5 text-slate-700">{inj.body_region}</td>
                                <td className="px-6 py-3.5">
                                  <Badge variant={inj.severity === 'SEVERE' ? 'danger' : 'warning'} size="sm">
                                    {inj.severity}
                                  </Badge>
                                </td>
                                <td className="px-6 py-3.5 text-slate-500 text-xs">{inj.date_occurred}</td>
                                <td className="px-6 py-3.5 text-slate-600 text-xs">
                                  {inj.recovery_duration_days ? `${inj.recovery_duration_days} days` : '—'}
                                </td>
                                <td className="px-6 py-3.5">
                                  {inj.is_recurring ? <Badge variant="danger" size="sm">Yes</Badge> : <span className="text-slate-400 text-xs">No</span>}
                                </td>
                                <td className="px-6 py-3.5 text-slate-600 text-xs max-w-xs truncate">
                                  {inj.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8">
                        <EmptyState
                          icon={<HeartPulseIcon className="w-6 h-6" />}
                          title="No injury history logged"
                          description="This athlete currently has no recorded musculoskeletal injuries in the database."
                        />
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* Tab Content: Training Load */}
              {activeTab === 'training' && (
                <Card>
                  <CardHeader>
                    <h3 className="font-bold text-slate-900 text-base">Recorded Training Sessions</h3>
                    <p className="text-xs text-slate-500">Real session duration, intensity, and RPE logs</p>
                  </CardHeader>
                  <CardBody className="p-0">
                    {loads.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Session Type</th>
                              <th className="px-6 py-3">Duration</th>
                              <th className="px-6 py-3">Intensity (1-10)</th>
                              <th className="px-6 py-3">RPE</th>
                              <th className="px-6 py-3">Athlete Notes</th>
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
                                <td className="px-6 py-3.5 text-slate-500 text-xs">{l.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8">
                        <EmptyState
                          icon={<ActivityIcon className="w-6 h-6" />}
                          title="No training sessions logged"
                          description="This athlete has not logged any workouts yet."
                        />
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* Tab Content: Movement & Recommendations (501 Stubs) */}
              {activeTab === 'movement' && (
                <Card>
                  <CardHeader>
                    <h3 className="font-bold text-slate-900 text-base">Movement Biomechanics & Pose Tracking</h3>
                    <p className="text-xs text-slate-500">15-joint kinematic analysis</p>
                  </CardHeader>
                  <CardBody className="p-8">
                    <ComingSoonNotice
                      feature="Biomechanical Computer Vision Pipeline"
                      phase="Phase 2-3 (Video & Pose Estimation)"
                    />
                  </CardBody>
                </Card>
              )}

              {activeTab === 'recommendations' && (
                <Card>
                  <CardHeader>
                    <h3 className="font-bold text-slate-900 text-base">Personalized Corrective Prescriptions</h3>
                    <p className="text-xs text-slate-500">Targeted exercise mapping</p>
                  </CardHeader>
                  <CardBody className="p-8">
                    <ComingSoonNotice
                      feature="Prescription & Corrective Exercise Engine"
                      phase="Phase 6 (Recommendation Engine)"
                    />
                  </CardBody>
                </Card>
              )}

              {/* Edit Stats Modal */}
              {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Physical Profile</h3>
                    <p className="text-xs text-slate-500 mb-4">Updates athlete baseline data in database</p>

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Primary Sport
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.sport}
                          onChange={(e) => setEditForm({ ...editForm, sport: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Position / Role
                        </label>
                        <input
                          type="text"
                          value={editForm.position}
                          onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Height (cm)
                          </label>
                          <input
                            type="number"
                            value={editForm.height_cm}
                            onChange={(e) => setEditForm({ ...editForm, height_cm: Number(e.target.value) })}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            value={editForm.weight_kg}
                            onChange={(e) => setEditForm({ ...editForm, weight_kg: Number(e.target.value) })}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Dominant Side
                        </label>
                        <select
                          value={editForm.dominant_side}
                          onChange={(e) => setEditForm({ ...editForm, dominant_side: e.target.value as DominantSide })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                        >
                          <option value={DominantSide.RIGHT}>Right</option>
                          <option value={DominantSide.LEFT}>Left</option>
                          <option value={DominantSide.AMBIDEXTROUS}>Ambidextrous</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-3 pt-3">
                        <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>
                          Cancel
                        </Button>
                        <Button variant="primary" type="submit" isLoading={isUpdating}>
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
