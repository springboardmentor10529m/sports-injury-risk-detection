import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Upload, Video, Globe, LogOut, LogIn, Shield, Users, Database } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab, onOpenAuth, onOpenProfile }) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role) => {
    switch ((role || '').toUpperCase()) {
      case 'COACH':
        return { label: 'COACH', class: 'bg-indigo-950 text-indigo-400 border-indigo-800' };
      case 'PHYSIOTHERAPIST':
      case 'SPORTS_SCIENTIST':
      case 'ADMIN':
        return { label: role.toUpperCase(), class: 'bg-purple-950 text-purple-400 border-purple-800' };
      case 'ATHLETE':
      default:
        return { label: 'ATHLETE', class: 'bg-cyan-950 text-cyan-400 border-cyan-800' };
    }
  };

  const roleInfo = user ? getRoleBadge(user.role) : null;

  return (
    <header className="glass-nav sticky top-0 z-40 w-full px-4 sm:px-8 py-3 border-b border-cyan-500/20 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('feed')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                sportsinjuryanalyser
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 rounded-full">
                V1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">AI Movement & Injury Detection Engine</p>
          </div>
        </div>

        {/* User / Auth Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl hover:border-cyan-500/50 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {user.name}
                  </div>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${roleInfo.class}`}>
                    {roleInfo.label}
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
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
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
