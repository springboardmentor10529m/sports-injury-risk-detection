import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { VideoCard } from './VideoCard';
import { 
  Users, ShieldAlert, Award, FileText, Activity, 
  Search, Filter, ChevronRight, TrendingUp, Sparkles, Download
} from 'lucide-react';

export const CoachDashboard = () => {
  const { user } = useAuth();
  const [squadVideos, setSquadVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('squad-feed'); // 'squad-feed' | 'athletes' | 'reports'

  useEffect(() => {
    fetchSquadVideos();
  }, []);

  const fetchSquadVideos = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/videos/all');
      setSquadVideos(data || []);
    } catch (err) {
      console.error('Failed to fetch squad videos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mock Squad Roster
  const athletesRoster = [
    { id: 'ath_101', name: 'Marcus Vance', sport: 'Basketball', position: 'Point Guard', valgus: 18.2, risk: 'critical', aclProb: 94 },
    { id: 'ath_102', name: 'Sophia Chen', sport: 'Soccer', position: 'Midfielder', valgus: 5.2, risk: 'low', aclProb: 18 },
    { id: 'ath_103', name: "Liam O'Connor", sport: 'Track & Field', position: 'Sprinter', valgus: 9.6, risk: 'medium', aclProb: 42 }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Coach Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-indigo-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-bold text-indigo-400 bg-indigo-950 border border-indigo-800 rounded-full uppercase">
                COACH SQUAD FEED
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Coach Dashboard — {user?.name || 'Coach'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Squad Movement Monitoring, Team Risk Distribution & Comparison Reports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('squad-feed')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'squad-feed'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Squad Video Feed ({squadVideos.length})
          </button>

          <button
            onClick={() => setActiveTab('athletes')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'athletes'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Athlete Roster (3)
          </button>
        </div>
      </div>

      {/* Top Squad Risk Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Roster Athletes</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">3 Active</div>
          <p className="text-[11px] text-slate-400">Basketball & Track squads</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>High / Critical Alerts</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400">1 Critical</div>
          <p className="text-[11px] text-slate-400">Marcus Vance (18.2° Knee Valgus)</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Squad Videos Processed</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{squadVideos.length} Clips</div>
          <p className="text-[11px] text-slate-400">Pose keypoint pipeline active</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Reports Generated</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">3 Ready</div>
          <p className="text-[11px] text-slate-400">Weekly comparison PDF reports</p>
        </div>
      </div>

      {/* Squad Tab Panes */}
      {activeTab === 'squad-feed' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white">Team Video Analysis Feed</h3>
          
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading squad videos...</div>
          ) : squadVideos.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              No team videos uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {squadVideos.map((video) => (
                <VideoCard
                  key={video.video_id}
                  video={video}
                  isPersonal={false}
                  onDeleteSuccess={() => fetchSquadVideos()}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'athletes' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white">Squad Athletes Roster & Risk Profiles</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {athletesRoster.map((ath) => (
              <div key={ath.id} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-base">{ath.name}</h4>
                    <p className="text-xs text-cyan-400 font-medium">{ath.sport} • {ath.position}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full uppercase ${
                    ath.risk === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                    ath.risk === 'medium' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {ath.risk}
                  </span>
                </div>

                <div className="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dynamic Knee Valgus:</span>
                    <span className={`font-bold ${ath.valgus > 12 ? 'text-rose-400' : 'text-emerald-400'}`}>{ath.valgus}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Predicted ACL Tear Risk:</span>
                    <span className="font-bold text-white">{ath.aclProb}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
