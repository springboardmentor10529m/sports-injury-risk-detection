import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { VideoUploadZone } from './components/VideoUploadZone';
import { MyVideosPage } from './components/MyVideosPage';
import { AthleteProfileModal } from './components/AthleteProfileModal';
import { UploadCloud, LogIn, Activity, Shield } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'my-videos' | 'all-videos'
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-400 space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Initializing Platform...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => {
          if (!user) setIsAuthOpen(true);
          else setIsProfileOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Unauthenticated Guest Landing Prompt */}
        {!user && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-900/60 border border-cyan-700/60 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Sign In to Upload & Manage Videos</h3>
                <p className="text-xs text-slate-400">
                  Create a free athlete profile to upload videos, extract metadata, and store videos on the server.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              Sign In / Register
            </button>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'upload' && (
          user ? (
            <VideoUploadZone
              onUploadSuccess={() => {}}
              onViewMyVideos={() => setActiveTab('my-videos')}
            />
          ) : (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mx-auto">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Authentication Required</h2>
              <p className="text-xs text-slate-400">
                Please sign in or register an account to access the Video Upload Studio and save videos to the server.
              </p>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white text-sm font-semibold rounded-xl shadow-lg"
              >
                Sign In / Register Now
              </button>
            </div>
          )
        )}

        {activeTab === 'my-videos' && (
          user ? (
            <MyVideosPage
              initialTab="my-videos"
              onNavigateToUpload={() => setActiveTab('upload')}
            />
          ) : (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <h2 className="text-xl font-bold text-white">Please Sign In</h2>
              <p className="text-xs text-slate-400">Sign in to view your personal uploaded video library.</p>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-6 py-2.5 bg-cyan-500 text-white text-xs font-semibold rounded-xl"
              >
                Sign In
              </button>
            </div>
          )
        )}

        {activeTab === 'all-videos' && (
          <MyVideosPage
            initialTab="all-videos"
            onNavigateToUpload={() => setActiveTab('upload')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">sportsinjuryanalyser</span>
          </div>

          <p>© 2026 sportsinjuryanalyser Platform. Built with FastAPI & React.</p>
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
