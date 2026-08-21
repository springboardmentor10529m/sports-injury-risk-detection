'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient } from '../../../lib/api';
import { AthleteProfile } from '../../../lib/types';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { UsersIcon, ActivityIcon, ShieldAlertIcon, SearchIcon, ArrowRightIcon } from '../../../components/ui/Icons';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';

export default function CoachDashboard() {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTeamData() {
      try {
        const data = await ApiClient.listAthletes();
        setAthletes(data);
      } catch (err) {
        console.error('Failed to fetch team athletes', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTeamData();
  }, []);

  const sportsList = ['ALL', ...Array.from(new Set(athletes.map((a) => a.sport).filter(Boolean)))];

  const filteredAthletes = athletes.filter((a) => {
    const matchesSport = selectedSport === 'ALL' || a.sport === selectedSport;
    const matchesSearch =
      a.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.position && a.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Team Command</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
            Coach Operations Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time roster monitoring, workload tracking, and movement assessment reviews
          </p>
        </div>

        <Link href="/athletes">
          <Button variant="primary" size="md" leftIcon={<UsersIcon className="w-4 h-4" />}>
            Manage Athlete Roster
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Athletes Monitored"
          value={athletes.length}
          subtext="Active in database"
          icon={<UsersIcon className="w-5 h-5 text-brand-primary" />}
        />
        <StatCard
          label="Unique Sports / Teams"
          value={sportsList.length > 1 ? sportsList.length - 1 : 0}
          subtext="Registered sports cohorts"
          icon={<ActivityIcon className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          label="Movement Sessions"
          value="0"
          subtext="Pending Video Engine"
          icon={<ShieldAlertIcon className="w-5 h-5 text-amber-500" />}
        />
        <StatCard
          label="Team Readiness Score"
          value="Pending"
          subtext="Awaiting AI Risk Engine"
          icon={<ActivityIcon className="w-5 h-5 text-slate-400" />}
        />
      </div>

      {/* Athlete Roster Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Athlete Roster Directory</h3>
            <p className="text-xs text-slate-500">Live profiles from PostgreSQL / SQLite database</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search by sport or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Sport Filter */}
            {sportsList.length > 2 && (
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {sportsList.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? 'All Sports' : s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {filteredAthletes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Athlete ID</th>
                    <th className="px-6 py-3">Sport</th>
                    <th className="px-6 py-3">Position</th>
                    <th className="px-6 py-3">Dominant Side</th>
                    <th className="px-6 py-3">Height / Weight</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAthletes.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600">
                        {a.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900">{a.sport}</td>
                      <td className="px-6 py-3.5 text-slate-600">{a.position || '—'}</td>
                      <td className="px-6 py-3.5 text-slate-600">{a.dominant_side || '—'}</td>
                      <td className="px-6 py-3.5 text-slate-600 text-xs">
                        {a.height_cm ? `${a.height_cm} cm` : '—'} / {a.weight_kg ? `${a.weight_kg} kg` : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link href={`/athletes/${a.id}`}>
                          <Button variant="outline" size="sm" rightIcon={<ArrowRightIcon className="w-3.5 h-3.5" />}>
                            View Profile
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
                icon={<UsersIcon className="w-6 h-6" />}
                title="No athletes registered yet"
                description="When athletes register or profiles are created in the database, they will appear here."
                actionLabel="View Athletes Directory"
                actionHref="/athletes"
              />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
