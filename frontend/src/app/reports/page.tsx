'use client';

import React, { useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { RoleGuard } from '../../components/layout/RoleGuard';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { FileTextIcon, VideoIcon } from '../../components/ui/Icons';
import Link from 'next/link';

export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RoleGuard>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Clinical & Performance Reports</span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
                    Assessment Reports
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Archived biomechanical assessments, injury risk stratifications, and exported summary PDFs
                  </p>
                </div>

                <Link href="/upload">
                  <Button variant="primary" size="md" leftIcon={<VideoIcon className="w-4 h-4" />}>
                    Upload New Movement Session
                  </Button>
                </Link>
              </div>

              {/* Reports Table or Empty State */}
              <Card>
                <CardBody className="p-12">
                  <EmptyState
                    icon={<FileTextIcon className="w-8 h-8" />}
                    title="No assessment reports generated yet"
                    description="When video movement sessions are processed through the computer vision and risk scoring pipelines, printable clinical reports will appear here."
                    actionLabel="Upload Movement Drill"
                    actionHref="/upload"
                  />
                </CardBody>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
