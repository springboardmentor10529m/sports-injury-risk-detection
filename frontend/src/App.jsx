import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AthleteDashboard } from './components/AthleteDashboard';
import { CoachDashboard } from './components/CoachDashboard';
import { VideoUploadZone } from './components/VideoUploadZone';
import { MyVideosPage } from './components/MyVideosPage';
import { AuthModal } from './components/AuthModal';
import { AthleteProfileModal } from './components/AthleteProfileModal';
import { AnalysesOverviewDashboard } from './components/analysis/AnalysesOverviewDashboard';
import { AnalysisDashboard } from './components/analysis/AnalysisDashboard';
import { LoadingState } from './components/ui/LoadingState';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'analyses' | 'my-videos' | 'upload'
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isCoach = user?.role === 'COACH';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <LoadingState
          message="INITIALIZING SPORTS BIOMECHANICS LAB..."
          subtext="Loading secure authentication & athlete profile state"
        />
      </div>
    );
  }

  const activeKey = !user ? 'landing' : selectedAnalysis ? `analysis-${selectedAnalysis.analysisId}` : `${activeTab}-${user?.role || 'user'}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] lab-ambient-bg text-slate-100 selection:bg-cyan-500 selection:text-white">
      
      {/* 23. Premium Floating Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedAnalysis(null);
          setActiveTab(tab);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Viewport with Framer Motion Page Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full"
          >
            {!user ? (
              /* Unauthenticated 3D Landing & Sign In Page */
              <LandingPage onAuthSuccess={() => setIsAuthOpen(false)} />
            ) : selectedAnalysis ? (
              /* Deep-dive Interactive 3D Analysis Dashboard */
              <AnalysisDashboard
                analysisId={selectedAnalysis.analysisId}
                video={selectedAnalysis.video}
                onBack={() => setSelectedAnalysis(null)}
              />
            ) : activeTab === 'dashboard' ? (
              isCoach ? (
                /* Tactical Coach Command Center */
                <CoachDashboard 
                  onOpenAnalysis={(analysis) => {
                    setSelectedAnalysis({
                      analysisId: analysis.analysis_id,
                      video: analysis.video
                    });
                  }}
                />
              ) : (
                /* Individual Athlete Dashboard */
                <AthleteDashboard />
              )
            ) : activeTab === 'analyses' ? (
              <AnalysesOverviewDashboard
                onOpenAnalysis={(analysis) => {
                  setSelectedAnalysis({
                    analysisId: analysis.analysis_id,
                    video: analysis.video
                  });
                }}
                onNavigateToUpload={() => setActiveTab('upload')}
              />
            ) : activeTab === 'upload' ? (
              <VideoUploadZone
                onUploadSuccess={() => setActiveTab('analyses')}
                onViewMyVideos={() => setActiveTab('my-videos')}
              />
            ) : (
              <MyVideosPage
                onNavigateToUpload={() => setActiveTab('upload')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900/80 bg-[#030712]/90 py-6 text-center text-xs font-mono text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">SPORTS INJURY ANALYSER</span>
            <span className="text-[10px] text-cyan-500 font-mono">v2.0 3D Lab</span>
          </div>

          <p>© 2026 AI Sports Biomechanics & Injury Intelligence Platform. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth & Profile Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <AthleteProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
