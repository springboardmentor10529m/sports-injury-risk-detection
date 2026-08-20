import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AthleteDashboard } from './components/AthleteDashboard';
import { VideoUploadZone } from './components/VideoUploadZone';
import { MyVideosPage } from './components/MyVideosPage';
import { AuthModal } from './components/AuthModal';
import { AthleteProfileModal } from './components/AthleteProfileModal';
import { Upload, Video, Activity, ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';

function MainApp() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'my-videos' | 'upload'
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-400 space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Loading Athlete Hub...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      
      {/* Navbar Header */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  sportsinjuryanalyser
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-400 bg-cyan-950 border border-cyan-800 rounded-full">
                  Athlete Hub
                </span>
              </div>
              <p className="text-xs text-slate-400">Athlete Profile Details & Personal Videos</p>
            </div>
          </div>

          {/* Logged In Navigation Tabs */}
          {user && (
            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Athlete Dashboard
              </button>

              <button
                onClick={() => setActiveTab('my-videos')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'my-videos'
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4" />
                My Videos
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'upload'
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload Video
              </button>
            </div>
          )}

          {/* Auth Controls */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl hover:border-cyan-500/50 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-slate-200">
                      {user.name}
                    </div>
                    <span className="text-[9px] font-extrabold text-cyan-400 uppercase">
                      {user.role}
                    </span>
                  </div>
                </button>

                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-rose-900/50 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
              >
                Sign In / Register
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {!user ? (
          /* Unauthenticated Landing & Sign In Page */
          <LandingPage onAuthSuccess={() => setIsAuthOpen(false)} />
        ) : (
          /* Authenticated User Tab Views */
          activeTab === 'dashboard' ? (
            <AthleteDashboard />
          ) : activeTab === 'upload' ? (
            <VideoUploadZone
              onUploadSuccess={() => setActiveTab('my-videos')}
              onViewMyVideos={() => setActiveTab('my-videos')}
            />
          ) : (
            <MyVideosPage
              onNavigateToUpload={() => setActiveTab('upload')}
            />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">sportsinjuryanalyser</span>
          </div>

          <p>© 2026 Sports Injury Analyser Platform. Athlete Details Dashboard Active.</p>
        </div>
      </footer>

      {/* Modals */}
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
