import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { 
  LayoutDashboard, 
  User, 
  Heart, 
  ShieldAlert, 
  TrendingUp, 
  Play, 
  Sparkles, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Shield
} from 'lucide-react';

const AthleteLayout = ({ children, athleteName }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentRole = localStorage.getItem('role') || 'athlete';
  const [userName, setUserName] = useState(() => {
    return athleteName || localStorage.getItem('name') || (currentRole === 'coach' ? 'Coach' : 'Athlete');
  });

  useEffect(() => {
    if (athleteName) {
      setUserName(athleteName);
    } else {
      const stored = localStorage.getItem('name');
      if (stored && stored !== 'Alex Johnson') {
        setUserName(stored);
      }
    }
  }, [athleteName]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('name');
    if (token && (!stored || stored === 'Alex Johnson')) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data?.name) {
            localStorage.setItem('name', res.data.name);
            if (!athleteName) {
              setUserName(res.data.name);
            }
          }
        })
        .catch(() => {});
    }
  }, [athleteName]);

  const currentUserName = userName;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/athlete/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/athlete/profile', icon: User },
    { name: 'Injury History', path: '/athlete/injury-history', icon: Heart },
    { name: 'Risk Assessments', path: '/athlete/risk-assessments', icon: ShieldAlert },
    { name: 'Performance', path: '/athlete/performance', icon: TrendingUp },
    { name: 'Video Analysis', path: '/athlete/video-analysis', icon: Play },
    { name: 'Recommendations', path: '/athlete/recommendations', icon: Sparkles },
    { name: 'Reports', path: '/athlete/reports', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#0B1528] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white leading-tight">Sports Injury</div>
            <div className="text-[9px] font-bold tracking-widest text-sky-400 uppercase leading-none">RISK PREDICTION</div>
          </div>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#0B1528] text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:min-h-screen
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col flex-1">
          {/* Brand Header */}
          <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-blue-600/90 border border-blue-400/30 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
              <Shield className="w-5 h-5 fill-white/20 text-white" />
            </div>
            <div>
              <div className="font-bold text-base text-white tracking-tight leading-snug">Sports Injury</div>
              <div className="text-[10px] font-bold tracking-widest text-sky-400 uppercase leading-none mt-0.5">RISK PREDICTION</div>
            </div>
          </div>

          {/* MAIN Category Label */}
          <div className="px-5 pt-6 pb-2">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">MAIN</span>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path === '/athlete/video-analysis' && location.pathname === '/upload') ||
                (item.path === '/athlete/dashboard' && location.pathname === '/dashboard') ||
                (item.path === '/athlete/profile' && location.pathname === '/profile');

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${isActive 
                      ? 'bg-[#2563eb] text-white shadow-md shadow-blue-600/20 font-semibold' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Utility Area */}
        <div className="p-4 border-t border-slate-800/80 space-y-2.5">
          <NavLink
            to="/athlete/settings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/athlete/settings' 
                ? 'bg-[#2563eb] text-white font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>

          {/* User info badge */}
          <div className="pt-1 px-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate max-w-[130px] font-medium text-slate-300">{currentUserName}</span>
            <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {currentRole}
            </span>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile Navigation */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Main Canvas Container */}
      <main className="flex-1 min-w-0 bg-[#f8fafc] overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AthleteLayout;
