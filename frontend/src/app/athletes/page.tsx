'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient } from '../../lib/api';
import { AthleteProfile } from '../../lib/types';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { RoleGuard } from '../../components/layout/RoleGuard';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { UsersIcon, SearchIcon, ArrowRightIcon } from '../../components/ui/Icons';
import { TableSkeleton } from '../../components/ui/Skeleton';

export default function AthletesDirectoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAthletes() {
      try {
        const data = await ApiClient.listAthletes();
        setAthletes(data);
      } catch (err) {
        console.error('Failed to load athletes list', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAthletes();
  }, []);

  const sportsList = ['ALL', ...Array.from(new Set(athletes.map((a) => a.sport).filter(Boolean)))];

  const filteredAthletes = athletes.filter((a) => {
    const matchesSport = sportFilter === 'ALL' || a.sport === sportFilter;
    const matchesSearch =
      a.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.position && a.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  return (
    <RoleGuard>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Directory</span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
                    Athletes Roster
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Complete registry of active athletes, physical profiles, and movement histories
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search athletes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {sportsList.length > 2 && (
                    <select
                      value={sportFilter}
                      onChange={(e) => setSportFilter(e.target.value)}
                      className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      {sportsList.map((s) => (
                        <option key={s} value={s}>
                          {s === 'ALL' ? 'All Sports' : s}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Table or Skeleton */}
              {isLoading ? (
                <TableSkeleton rows={6} />
              ) : (
                <Card>
                  <CardBody className="p-0">
                    {filteredAthletes.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-3.5">Athlete UUID</th>
                              <th className="px-6 py-3.5">Primary Sport</th>
                              <th className="px-6 py-3.5">Position / Role</th>
                              <th className="px-6 py-3.5">Height & Weight</th>
                              <th className="px-6 py-3.5">Dominant Side</th>
                              <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredAthletes.map((ath) => (
                              <tr key={ath.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">
                                  {ath.id}
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-900">{ath.sport}</td>
                                <td className="px-6 py-4 text-slate-600">{ath.position || '—'}</td>
                                <td className="px-6 py-4 text-slate-600 text-xs">
                                  {ath.height_cm ? `${ath.height_cm} cm` : '—'} • {ath.weight_kg ? `${ath.weight_kg} kg` : '—'}
                                </td>
                                <td className="px-6 py-4">
                                  {ath.dominant_side ? (
                                    <Badge variant="neutral" size="sm">
                                      {ath.dominant_side}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Link href={`/athletes/${ath.id}`}>
                                    <Button variant="outline" size="sm" rightIcon={<ArrowRightIcon className="w-3.5 h-3.5" />}>
                                      Full Profile
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <EmptyState
                          icon={<UsersIcon className="w-8 h-8" />}
                          title="No athletes found"
                          description="No athlete records match your search criteria or are registered in the database."
                        />
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
