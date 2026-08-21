'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient } from '../../../lib/api';
import { AthleteProfile, InjuryHistory, InjuryType, Severity } from '../../../lib/types';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ShieldCheckIcon, HeartPulseIcon, PlusIcon, ArrowRightIcon } from '../../../components/ui/Icons';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';

export default function PhysiotherapistDashboard() {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [recentInjuries, setRecentInjuries] = useState<{ athlete: AthleteProfile; injury: InjuryHistory }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Injury Log Modal State
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [injuryForm, setInjuryForm] = useState({
    injury_type: InjuryType.ACL,
    body_region: 'Left Knee',
    severity: Severity.MODERATE,
    date_occurred: new Date().toISOString().split('T')[0],
    recovery_duration_days: 30,
    is_recurring: false,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const athleteList = await ApiClient.listAthletes();
      setAthletes(athleteList);

      // Collect recent injuries across all athletes
      const injuryList: { athlete: AthleteProfile; injury: InjuryHistory }[] = [];
      await Promise.all(
        athleteList.map(async (ath) => {
          try {
            const injHistory = await ApiClient.getInjuryHistory(ath.id);
            injHistory.forEach((inj) => {
              injuryList.push({ athlete: ath, injury: inj });
            });
          } catch {
            // Ignore if individual fetch errors
          }
        })
      );
      setRecentInjuries(injuryList);
    } catch (err) {
      console.error('Failed to load clinical data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddInjury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthleteId) return;
    setIsSubmitting(true);
    try {
      await ApiClient.addInjuryRecord(selectedAthleteId, {
        injury_type: injuryForm.injury_type,
        body_region: injuryForm.body_region,
        severity: injuryForm.severity,
        date_occurred: injuryForm.date_occurred,
        recovery_duration_days: Number(injuryForm.recovery_duration_days),
        is_recurring: injuryForm.is_recurring,
        notes: injuryForm.notes || null,
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to log injury record', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Clinical Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Sports Medicine & Rehabilitation</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
            Clinical Management Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Injury diagnosis logs, recovery milestones, and movement fault prescriptions
          </p>
        </div>

        {athletes.length > 0 && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusIcon className="w-4 h-4" />}
            onClick={() => {
              setSelectedAthleteId(athletes[0].id);
              setShowModal(true);
            }}
          >
            Record Injury Event
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Patients / Athletes Under Care"
          value={athletes.length}
          subtext="Active in platform"
          icon={<ShieldCheckIcon className="w-5 h-5 text-brand-primary" />}
        />
        <StatCard
          label="Total Recorded Injuries"
          value={recentInjuries.length}
          subtext="Documented clinical history"
          icon={<HeartPulseIcon className="w-5 h-5 text-rose-600" />}
          variant={recentInjuries.length > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Active Prescriptions"
          value="0"
          subtext="Awaiting Recommendation Engine"
          icon={<ShieldCheckIcon className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Main Grid: Injury Timeline & Athlete Cohort */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Injury Events */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Documented Injury History</h3>
                <p className="text-xs text-slate-500">Real clinical records stored in PostgreSQL</p>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {recentInjuries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3">Athlete Sport</th>
                        <th className="px-6 py-3">Injury Type</th>
                        <th className="px-6 py-3">Body Region</th>
                        <th className="px-6 py-3">Severity</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentInjuries.map(({ athlete, injury }) => (
                        <tr key={injury.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-3.5 font-medium text-slate-900">{athlete.sport}</td>
                          <td className="px-6 py-3.5 font-semibold text-slate-900">{injury.injury_type.replace('_', ' ')}</td>
                          <td className="px-6 py-3.5 text-slate-600">{injury.body_region}</td>
                          <td className="px-6 py-3.5">
                            <Badge variant={injury.severity === 'SEVERE' ? 'danger' : 'warning'} size="sm">
                              {injury.severity}
                            </Badge>
                          </td>
                          <td className="px-6 py-3.5 text-slate-500 text-xs">{injury.date_occurred}</td>
                          <td className="px-6 py-3.5 text-right">
                            <Link href={`/athletes/${athlete.id}`}>
                              <Button variant="outline" size="sm" rightIcon={<ArrowRightIcon className="w-3.5 h-3.5" />}>
                                View
                              </Button>
                            </Link>
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
                    title="No injury records logged"
                    description="Record athlete injuries to factor historical vulnerabilities into the 20% risk model."
                    actionLabel={athletes.length > 0 ? 'Record First Injury' : undefined}
                    onAction={athletes.length > 0 ? () => setShowModal(true) : undefined}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Athletes List */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <h3 className="font-bold text-slate-900 text-base">Athletes Cohort</h3>
              <p className="text-xs text-slate-500">Quick patient navigation</p>
            </CardHeader>
            <CardBody className="p-4 space-y-2">
              {athletes.length > 0 ? (
                athletes.map((ath) => (
                  <Link
                    key={ath.id}
                    href={`/athletes/${ath.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group"
                  >
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block">{ath.sport}</span>
                      <span className="text-[11px] text-slate-400 font-mono">ID: {ath.id.substring(0, 8)}...</span>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:text-brand-primary transition-colors" />
                  </Link>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">No athletes available</div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Record Injury Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Record Athlete Injury Event</h3>
            <p className="text-xs text-slate-500 mb-4">Adds to the athlete's permanent clinical history</p>

            <form onSubmit={handleAddInjury} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Athlete
                </label>
                <select
                  value={selectedAthleteId}
                  onChange={(e) => setSelectedAthleteId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                >
                  {athletes.map((ath) => (
                    <option key={ath.id} value={ath.id}>
                      {ath.sport} ({ath.position || 'General'}) — ID: {ath.id.substring(0, 8)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Injury Type
                  </label>
                  <select
                    value={injuryForm.injury_type}
                    onChange={(e) => setInjuryForm({ ...injuryForm, injury_type: e.target.value as InjuryType })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value={InjuryType.ACL}>ACL</option>
                    <option value={InjuryType.HAMSTRING}>Hamstring</option>
                    <option value={InjuryType.ANKLE_SPRAIN}>Ankle Sprain</option>
                    <option value={InjuryType.SHOULDER}>Shoulder</option>
                    <option value={InjuryType.LOWER_BACK}>Lower Back</option>
                    <option value={InjuryType.OVERUSE}>Overuse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Severity
                  </label>
                  <select
                    value={injuryForm.severity}
                    onChange={(e) => setInjuryForm({ ...injuryForm, severity: e.target.value as Severity })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value={Severity.MILD}>Mild</option>
                    <option value={Severity.MODERATE}>Moderate</option>
                    <option value={Severity.SEVERE}>Severe</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Body Region (e.g. Left Knee, Right Hamstring)
                </label>
                <input
                  type="text"
                  required
                  value={injuryForm.body_region}
                  onChange={(e) => setInjuryForm({ ...injuryForm, body_region: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date Occurred
                  </label>
                  <input
                    type="date"
                    required
                    value={injuryForm.date_occurred}
                    onChange={(e) => setInjuryForm({ ...injuryForm, date_occurred: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Recovery Est. (Days)
                  </label>
                  <input
                    type="number"
                    value={injuryForm.recovery_duration_days}
                    onChange={(e) => setInjuryForm({ ...injuryForm, recovery_duration_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Clinical Notes
                </label>
                <textarea
                  rows={2}
                  value={injuryForm.notes}
                  onChange={(e) => setInjuryForm({ ...injuryForm, notes: e.target.value })}
                  placeholder="Mechanism of injury, MRI findings, or initial rehab restrictions..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting}>
                  Save Injury Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
