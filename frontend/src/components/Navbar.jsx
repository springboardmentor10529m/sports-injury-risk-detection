import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, Upload, Video, LogOut, LogIn, LayoutDashboard, 
  Sparkles, Bell, Settings, User, Cpu, ShieldCheck
} from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onOpenAuth, onOpenProfile }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-8 py-3.5 border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo: SPORTS INJURY ANALYSER */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-mono font-black tracking-wider text-white uppercase group-hover:text-cyan-300 transition-colors">
                SPORTS INJURY ANALYSER
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-800 rounded-full">
                3D AI LAB
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-500 hidden sm:block">
              AI Sports Biomechanics & Injury Intelligence
            </p>
          </div>
        </div>

        {/* Central Navigation Tabs (When Authenticated) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-2xl border border-slate-800/90 font-mono text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Movement Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('my-videos')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'my-videos'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>My Videos</span>
            </button>

            <button
              onClick={() => setActiveTab('analyses')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'analyses'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-300" />
              <span>Analytics</span>
            </button>
          </nav>
        )}

        {/* Right Controls: Profile, Notifications, Logout */}
        <div className="flex items-center gap-3 font-mono">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification icon */}
              <button
                title="System Notifications"
                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-xl transition-all cursor-pointer hidden sm:block"
              >
                <Bell className="w-4 h-4" />
              </button>

              {/* Profile Card Button */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl transition-all text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden lg:block">
                  <div className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
                    {user.name}
                  </div>
                  <span className="text-[9px] font-black text-cyan-400 uppercase">
                    {user.role}
                  </span>
                </div>
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-rose-900/50 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-mono font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 fill-current" />
              <span>SIGN IN / REGISTER</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Bar (When screen < md) */}
      {user && (
        <div className="flex md:hidden items-center justify-between gap-1 pt-2 mt-2 border-t border-slate-900 font-mono text-[11px] overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 rounded-lg ${activeTab === 'dashboard' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded-lg ${activeTab === 'upload' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('my-videos')}
            className={`px-2.5 py-1 rounded-lg ${activeTab === 'my-videos' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            My Videos
          </button>
          <button
            onClick={() => setActiveTab('analyses')}
            className={`px-2.5 py-1 rounded-lg ${activeTab === 'analyses' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            Analytics
          </button>
        </div>
      )}
    </header>
  );
};
