import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Upload, Video, Globe, LogOut, LogIn } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onOpenAuth, onOpenProfile }) => {
  const { user, logout } = useAuth();

  return (
    <header className="glass-nav sticky top-0 z-40 w-full px-6 py-4 border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('upload')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                sportsinjuryanalyser
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 rounded-full">
                V1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Athlete Video Analysis Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </button>

            <button
              onClick={() => setActiveTab('my-videos')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'my-videos'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Video className="w-4 h-4" />
              My Videos
            </button>

            <button
              onClick={() => setActiveTab('all-videos')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'all-videos'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Globe className="w-4 h-4" />
              All Videos Library
            </button>
          </nav>
        )}

        {/* User / Auth Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900 border border-slate-700/60 rounded-xl hover:border-cyan-500/50 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {user.name}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/50">
                    {user.role}
                  </span>
                </div>
              </button>

              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-rose-900/50 rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
