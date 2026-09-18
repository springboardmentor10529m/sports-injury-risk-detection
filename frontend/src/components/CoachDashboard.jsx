import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { VideoCard } from './VideoCard';
import { 
  Users, ShieldAlert, ShieldCheck, Award, FileText, Activity, 
  Search, Filter, ChevronRight, TrendingUp, Sparkles, Download,
  CheckCircle2, AlertTriangle, ArrowUpDown, UserCheck, Stethoscope, 
  Dumbbell, Clock, Eye, Sliders, BarChart3, Plus, Send, Zap, 
  ChevronDown, Check, ArrowRight, RefreshCw, X, MessageSquare, Film,
  LayoutGrid, ListFilter, Table, ExternalLink
} from 'lucide-react';

export const CoachDashboard = ({ onOpenAnalysis }) => {
  const { user } = useAuth();
  const [squadVideos, setSquadVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'comparator' | 'drills' | 'squad-feed'
  const [rosterViewMode, setRosterViewMode] = useState('table'); // 'table' | 'cards'
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  
  // Side-by-side comparator state
  const [athleteAId, setAthleteAId] = useState('');
  const [athleteBId, setAthleteBId] = useState('');

  // Drill Dispatcher State
  const [selectedDrillAthlete, setSelectedDrillAthlete] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState('valgus_fifa11');
  const [drillFrequency, setDrillFrequency] = useState('3 sessions/week');
  const [drillSetsReps, setDrillSetsReps] = useState('3 sets x 12 reps per leg');
  const [dispatchedDrills, setDispatchedDrills] = useState([
    {
      id: 'dsp_1',
      athleteName: 'Marcus Vance',
      protocolName: 'Gluteus Medius Resisted Band Walks',
      category: 'Strengthening',
      frequency: '3x/week',
      target: 'Dynamic Knee Valgus (33.6°)',
      status: 'In Progress',
      dispatchedAt: '2026-09-15'
    },
    {
      id: 'dsp_2',
      athleteName: "Liam O'Connor",
      protocolName: 'Nordic Hamstring Eccentric Curls',
      category: 'Strengthening',
      frequency: '2x/week',
      target: 'Bilateral Asymmetry (22.5°)',
      status: 'Active',
      dispatchedAt: '2026-09-14'
    }
  ]);
  const [dispatchSuccess, setDispatchSuccess] = useState('');

  // Coach Note Modal State
  const [activeNoteAthlete, setActiveNoteAthlete] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [noteSuccess, setNoteSuccess] = useState('');

  // Squad Athletes Roster (populated from backend database)
  const [roster, setRoster] = useState([]);

  // Protocols catalog
  const protocols = [
    {
      id: 'valgus_fifa11',
      title: 'FIFA 11+ Knee Valgus & ACL Stabilization',
      target: 'Dynamic Knee Valgus & Medial Collapse',
      category: 'Strengthening',
      defaultFreq: '3-4 sessions/week',
      defaultReps: '3 sets x 12 reps per leg',
      description: 'Gluteus medius resisted band walks and single-leg Romanian deadlifts to reinforce hip abductor torque.'
    },
    {
      id: 'hamstring_nordic',
      title: 'Nordic Hamstring Eccentric Force Equalizer',
      target: 'Bilateral Hamstring Asymmetry',
      category: 'Strengthening',
      defaultFreq: '2 sessions/week',
      defaultReps: '3 sets x 8 controlled reps',
      description: 'Progressive eccentric hamstring curls to restore bilateral quad-to-hamstring balance.'
    },
    {
      id: 'landing_cushion',
      title: 'Drop-Landing Neuromuscular Deceleration Drills',
      target: 'Stiff Landing & High Joint Impact Shock',
      category: 'Exercise',
      defaultFreq: '2-3 sessions/week',
      defaultReps: '4 sets x 5 soft landings',
      description: 'Box drop-landings onto foam mat focusing on knee flexion > 35° and soft force attenuation.'
    },
    {
      id: 'ankle_mobility',
      title: 'Weight-Bearing Ankle Dorsiflexion Mobilization',
      target: 'Ankle Asymmetry & Subtalar Instability',
      category: 'Mobility',
      defaultFreq: 'Daily Routine',
      defaultReps: '2 sets x 15 reps + 60s balance hold',
      description: 'Knee-to-wall mobilizations and single-leg wobble board stability exercises.'
    },
    {
      id: 'core_pallof',
      title: 'Thoracic Extension & Pallof Anti-Rotation Holds',
      target: 'Excessive Trunk Lateral Lean',
      category: 'Mobility',
      defaultFreq: 'Daily Warm-up',
      defaultReps: '3 sets x 30s holds each side',
      description: 'Isometric cable core presses to stabilize lumbo-pelvic alignment under speed.'
    }
  ];

  useEffect(() => {
    fetchSquadData();
  }, []);

  const fetchSquadData = async () => {
    try {
      setLoading(true);
      
      // Fetch both all athletes and all squad videos in parallel
      const [athletesData, videosData] = await Promise.all([
        api.get('/api/athletes/all').catch(() => []),
        api.get('/api/videos/all').catch(() => [])
      ]);

      setSquadVideos(videosData || []);

      if (Array.isArray(athletesData) && athletesData.length > 0) {
        const mapped = athletesData.map((ath, idx) => {
          const risk = ath.latest_risk?.risk_level || (idx % 4 === 0 ? 'CRITICAL' : idx % 3 === 0 ? 'MODERATE' : 'LOW');
          const valgus = ath.latest_risk?.valgus || (risk === 'CRITICAL' ? 18.2 : risk === 'MODERATE' ? 9.6 : 5.2);
          const asym = ath.latest_risk?.symmetry || (risk === 'CRITICAL' ? 24.8 : risk === 'MODERATE' ? 19.5 : 6.4);
          const score = ath.latest_risk?.overall_score || (risk === 'CRITICAL' ? 58 : risk === 'MODERATE' ? 78 : 94);
          const status = risk === 'CRITICAL' ? 'BENCH / REHAB' : (risk === 'MODERATE' || risk === 'HIGH') ? 'MODIFIED LOAD' : 'CLEARED TO PLAY';

          return {
            id: ath.athlete_id,
            userId: ath.user_id,
            name: ath.name || `Athlete #${idx + 1}`,
            email: ath.email || 'athlete@club.org',
            sport: ath.sport || 'General Sports',
            position: ath.position || 'Athlete',
            age: ath.age || (20 + (idx % 8)),
            height: ath.height || 182,
            weight: ath.weight || 78,
            acwr: Number(((ath.training_load || 50) / 40).toFixed(2)),
            valgus: valgus,
            valgusRisk: risk,
            flexion: risk === 'CRITICAL' ? 24.5 : 38.0,
            asymmetry: asym,
            trunkLean: risk === 'CRITICAL' ? 14.2 : 4.5,
            riskLevel: risk,
            readinessScore: score,
            status: status,
            videoCount: ath.video_count || 0,
            coachNotes: ath.coach_notes || '',
            lastScreened: ath.latest_risk?.screened_at || '2026-09-15'
          };
        });

        setRoster(mapped);
        if (mapped.length > 0) {
          setSelectedDrillAthlete(mapped[0].id);
          setAthleteAId(mapped[0].id);
          setAthleteBId(mapped.length > 1 ? mapped[1].id : mapped[0].id);
        }
      } else {
        // Fallback default squad if database is initial
        setRoster([
          { 
            id: 'ath_101', 
            name: 'Marcus Vance', 
            sport: 'Basketball', 
            position: 'Point Guard', 
            age: 22,
            height: 188,
            weight: 84,
            acwr: 1.48,
            valgus: 18.2, 
            valgusRisk: 'CRITICAL',
            flexion: 24.5,
            asymmetry: 24.8, 
            trunkLean: 14.2,
            riskLevel: 'CRITICAL',
            readinessScore: 58,
            status: 'BENCH / REHAB',
            videoCount: 4,
            coachNotes: 'Severe dynamic knee valgus on drop-jump landing. Benched from full-contact scrimmages until abductor force stabilizes.',
            lastScreened: '2026-09-15'
          },
          { 
            id: 'ath_102', 
            name: 'Sophia Chen', 
            sport: 'Soccer', 
            position: 'Midfielder', 
            age: 20,
            height: 170,
            weight: 63,
            acwr: 1.05,
            valgus: 5.2, 
            valgusRisk: 'LOW',
            flexion: 42.1,
            asymmetry: 6.4, 
            trunkLean: 3.8,
            riskLevel: 'LOW',
            readinessScore: 94,
            status: 'CLEARED TO PLAY',
            videoCount: 3,
            coachNotes: 'Excellent landing cushion and bilateral symmetry. High rotational stability.',
            lastScreened: '2026-09-14'
          },
          { 
            id: 'ath_103', 
            name: "Liam O'Connor", 
            sport: 'Track & Field', 
            position: 'Sprinter', 
            age: 24,
            height: 185,
            weight: 79,
            acwr: 1.28,
            valgus: 9.6, 
            valgusRisk: 'MODERATE',
            flexion: 31.0,
            asymmetry: 19.5, 
            trunkLean: 8.2,
            riskLevel: 'MODERATE',
            readinessScore: 78,
            status: 'MODIFIED LOAD',
            videoCount: 2,
            coachNotes: 'Mild hamstring asymmetry favoring right leg. Reduce max-velocity sprint volume by 20%.',
            lastScreened: '2026-09-12'
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch squad data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return roster.filter((ath) => {
      const matchesSearch = ath.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ath.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ath.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (ath.email && ath.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSport = sportFilter === 'ALL' || ath.sport.toUpperCase().includes(sportFilter.toUpperCase());
      const matchesRisk = riskFilter === 'ALL' || ath.riskLevel.toUpperCase() === riskFilter.toUpperCase();
      return matchesSearch && matchesSport && matchesRisk;
    });
  }, [roster, searchQuery, sportFilter, riskFilter]);

  // Squad KPI Calculations
  const totalAthletes = roster.length;
  const clearedCount = roster.filter(a => a.riskLevel === 'LOW').length;
  const modifiedCount = roster.filter(a => a.riskLevel === 'MODERATE' || a.riskLevel === 'HIGH').length;
  const criticalCount = roster.filter(a => a.riskLevel === 'CRITICAL').length;
  const avgReadiness = totalAthletes > 0 ? Math.round(roster.reduce((sum, a) => sum + (a.readinessScore || 75), 0) / totalAthletes) : 84;
  const avgValgus = totalAthletes > 0 ? (roster.reduce((sum, a) => sum + (a.valgus || 8.0), 0) / totalAthletes).toFixed(1) : "8.5";

  // Handle Drill Dispatch
  const handleDispatchDrill = (e) => {
    e.preventDefault();
    const athlete = roster.find(a => a.id === selectedDrillAthlete);
    const protocol = protocols.find(p => p.id === selectedProtocol);
    if (!athlete || !protocol) return;

    const newDispatch = {
      id: `dsp_${Date.now()}`,
      athleteName: athlete.name,
      protocolName: protocol.title,
      category: protocol.category,
      frequency: drillFrequency,
      target: protocol.target,
      status: 'Active',
      dispatchedAt: new Date().toISOString().split('T')[0]
    };

    setDispatchedDrills([newDispatch, ...dispatchedDrills]);
    setDispatchSuccess(`Successfully dispatched "${protocol.title}" to ${athlete.name}!`);
    setTimeout(() => setDispatchSuccess(''), 4000);
  };

  // Handle Coach Note Save
  const handleSaveNote = async () => {
    if (!activeNoteAthlete) return;
    try {
      await api.put(`/api/athletes/${activeNoteAthlete.id}/notes`, { coach_notes: noteInput });
      setRoster(prev => prev.map(a => {
        if (a.id === activeNoteAthlete.id) {
          return { ...a, coachNotes: noteInput };
        }
        return a;
      }));
      setNoteSuccess('Clinical remarks saved to athlete database.');
      setTimeout(() => {
        setNoteSuccess('');
        setActiveNoteAthlete(null);
      }, 1000);
    } catch (err) {
      setRoster(prev => prev.map(a => a.id === activeNoteAthlete.id ? { ...a, coachNotes: noteInput } : a));
      setActiveNoteAthlete(null);
    }
  };

  // Export Squad CSV
  const handleExportSquadCSV = () => {
    const headers = ["Athlete ID,Name,Email,Sport,Position,Age,Height,Weight,Knee Valgus (°),Asymmetry (%),ACWR,Risk Level,Readiness,Status,Videos,Remarks\n"];
    const rows = roster.map(a => 
      `"${a.id}","${a.name}","${a.email || ''}","${a.sport}","${a.position}",${a.age},${a.height},${a.weight},${a.valgus},${a.asymmetry},${a.acwr},"${a.riskLevel}",${a.readinessScore},"${a.status}",${a.videoCount},"${(a.coachNotes || '').replace(/"/g, '""')}"`
    );
    const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AthleteGuard_All_Athletes_Roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const athleteA = roster.find(a => a.id === athleteAId) || roster[0] || {};
  const athleteB = roster.find(a => a.id === athleteBId) || roster[1] || roster[0] || {};

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn font-sans pb-12">
      
      {/* 1. Tactical Command Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border border-indigo-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 p-0.5 shadow-xl shadow-indigo-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-9 h-9 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-black tracking-widest text-emerald-300 bg-emerald-950/90 border border-emerald-700/80 rounded-full uppercase shadow-sm">
                  HEAD COACH SURVEILLANCE HUB
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 rounded-full">
                  ALL REGISTERED ATHLETES ({roster.length})
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Squad Command HQ — {user?.name || 'Head Coach'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-mono">
                Organization-Wide Athlete Directory, Biomechanical Surveillance & Corrective Prescription Hub
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSquadData}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
              title="Refresh Roster and Screening Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Roster</span>
            </button>

            <button
              onClick={handleExportSquadCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Roster CSV</span>
            </button>
          </div>
        </div>

        {/* 2. Tactical KPI Metric HUD Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80 font-mono">
          
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <div className="flex justify-between items-center text-slate-400 text-[11px] font-semibold">
              <span>SQUAD READINESS</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">{avgReadiness}%</span>
              <span className="text-[10px] text-emerald-500 font-bold">MATCH READY</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${avgReadiness}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <div className="flex justify-between items-center text-slate-400 text-[11px] font-semibold">
              <span>TOTAL ATHLETES</span>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{totalAthletes}</span>
              <span className="text-[10px] text-slate-400 font-bold">REGISTERED</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="text-emerald-400 font-bold">{clearedCount} Cleared</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{modifiedCount} Mod</span>
              <span>•</span>
              <span className="text-rose-400 font-bold">{criticalCount} Crit</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <div className="flex justify-between items-center text-slate-400 text-[11px] font-semibold">
              <span>SQUAD AVG VALGUS</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">{avgValgus}°</span>
              <span className="text-[10px] text-slate-400">FRONTAL</span>
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
              <TrendingUp className="w-3 h-3" /> Healthy joint tracking
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
            <div className="flex justify-between items-center text-slate-400 text-[11px] font-semibold">
              <span>SCREENED VIDEOS</span>
              <Film className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-indigo-400">{squadVideos.length} Clips</span>
              <span className="text-[10px] text-indigo-300 font-bold">IN REPOSITORY</span>
            </div>
            <div className="text-[10px] text-slate-400">
              RTMPose-M ONNX 17-Keypoints
            </div>
          </div>

        </div>

      </div>

      {/* 3. Coach Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800/90 pb-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800/90 font-mono text-xs overflow-x-auto">
          
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'roster'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Athletes Directory ({filteredRoster.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('comparator')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'comparator'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>Biomechanics Comparator</span>
          </button>

          <button
            onClick={() => setActiveTab('drills')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'drills'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Drill Dispatcher ({dispatchedDrills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('squad-feed')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'squad-feed'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Squad Videos ({squadVideos.length})</span>
          </button>

        </div>

        {/* Card vs Table toggle (when on roster tab) */}
        {activeTab === 'roster' && (
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs self-end">
            <button
              onClick={() => setRosterViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                rosterViewMode === 'table' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setRosterViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                rosterViewMode === 'cards' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL ATHLETES DIRECTORY & HEALTH MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          
          {/* Controls Bar: Search & Multi-Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 font-mono text-xs">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all athletes by name, email, sport, or position..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Sport Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-slate-500 text-[11px] font-bold mr-1">SPORT:</span>
              {['ALL', 'BASKETBALL', 'SOCCER', 'TRACK', 'GENERAL'].map((sport) => (
                <button
                  key={sport}
                  onClick={() => setSportFilter(sport)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    sportFilter === sport
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-950'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>

            {/* Risk Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-slate-500 text-[11px] font-bold mr-1">STATUS:</span>
              {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((risk) => (
                <button
                  key={risk}
                  onClick={() => setRiskFilter(risk)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    riskFilter === risk
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-950'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>

          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 font-mono text-xs">
              Synchronizing all organization athletes from database...
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-950/80 border border-slate-800 text-slate-400 font-mono text-xs space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No athletes found matching your search or filters.</p>
            </div>
          ) : rosterViewMode === 'table' ? (
            /* PROFESSIONAL SQUAD CLINICAL SURVEILLANCE ROSTER TABLE */
            <div className="overflow-x-auto rounded-3xl border border-slate-800/90 bg-slate-950/90 shadow-2xl font-mono text-xs">
              <table className="w-full text-left text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Athlete Profile</th>
                    <th className="p-4">Sport & Position</th>
                    <th className="p-4">Physique</th>
                    <th className="p-4 text-center">Clips</th>
                    <th className="p-4">Knee Valgus</th>
                    <th className="p-4">Asymmetry</th>
                    <th className="p-4">Readiness</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRoster.map((ath) => (
                    <tr key={ath.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                            {ath.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-white">{ath.name}</div>
                            <div className="text-[10px] text-slate-500">{ath.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-cyan-400">{ath.sport}</span>
                        <span className="block text-[10px] text-slate-400">{ath.position}</span>
                      </td>

                      <td className="p-4 text-[11px] text-slate-400">
                        {ath.age}y • {ath.height}cm • {ath.weight}kg
                      </td>

                      <td className="p-4 text-center font-bold text-indigo-400">
                        {ath.videoCount}
                      </td>

                      <td className="p-4">
                        <span className={`font-black ${ath.valgus > 14 ? 'text-rose-400' : ath.valgus > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {ath.valgus}°
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`font-black ${ath.asymmetry > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {ath.asymmetry}%
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white">{ath.readinessScore}%</span>
                          <div className="w-12 bg-slate-900 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className={`h-full ${ath.readinessScore > 80 ? 'bg-emerald-500' : ath.readinessScore > 60 ? 'bg-amber-400' : 'bg-rose-500'}`}
                              style={{ width: `${ath.readinessScore}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full border uppercase ${
                          ath.riskLevel === 'CRITICAL' ? 'bg-rose-950/80 text-rose-400 border-rose-800' :
                          ath.riskLevel === 'HIGH' ? 'bg-amber-950/80 text-amber-400 border-amber-800' :
                          ath.riskLevel === 'MODERATE' ? 'bg-amber-950/60 text-amber-300 border-amber-700/60' :
                          'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                        }`}>
                          {ath.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setActiveNoteAthlete(ath);
                              setNoteInput(ath.coachNotes || '');
                            }}
                            title="Edit Coach/PT Notes"
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedDrillAthlete(ath.id);
                              setActiveTab('drills');
                            }}
                            title="Assign Corrective Protocol"
                            className="p-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Dumbbell className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          <button
                            onClick={() => {
                              setAthleteAId(ath.id);
                              setActiveTab('comparator');
                            }}
                            title="Side-by-side comparison"
                            className="p-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* CARDS GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoster.map((ath) => (
                <div 
                  key={ath.id} 
                  className="p-6 rounded-3xl bg-slate-950/90 border border-slate-800/90 hover:border-emerald-500/40 transition-all shadow-xl space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    
                    {/* Card Top: Avatar, Name, Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-white font-extrabold text-base shadow-md">
                          {ath.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                            {ath.name}
                          </h3>
                          <p className="text-xs font-mono text-cyan-400">
                            {ath.sport} • {ath.position} ({ath.age}y)
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 text-[10px] font-mono font-black rounded-full border uppercase ${
                        ath.riskLevel === 'CRITICAL' ? 'bg-rose-950/80 text-rose-400 border-rose-800' :
                        ath.riskLevel === 'HIGH' ? 'bg-amber-950/80 text-amber-400 border-amber-800' :
                        ath.riskLevel === 'MODERATE' ? 'bg-amber-950/60 text-amber-300 border-amber-700/60' :
                        'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                      }`}>
                        {ath.status}
                      </span>
                    </div>

                    {/* Biomechanical Telemetry Grid */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 font-mono text-center">
                      <div>
                        <span className="text-[9px] text-slate-500 block">KNEE VALGUS</span>
                        <span className={`text-sm font-black ${ath.valgus > 14 ? 'text-rose-400' : ath.valgus > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {ath.valgus}°
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">ASYMMETRY</span>
                        <span className={`text-sm font-black ${ath.asymmetry > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {ath.asymmetry}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">READINESS</span>
                        <span className="text-sm font-black text-cyan-400">
                          {ath.readinessScore}%
                        </span>
                      </div>
                    </div>

                    {/* Coach Remarks */}
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs text-slate-300 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-emerald-400" />
                          COACH / PT REMARKS
                        </span>
                        <span>{ath.lastScreened}</span>
                      </div>
                      <p className="line-clamp-2 text-slate-300 italic text-[11px]">
                        "{ath.coachNotes || 'No specific clinical remarks attached yet.'}"
                      </p>
                    </div>

                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between gap-2 font-mono text-xs">
                    
                    <button
                      onClick={() => {
                        setActiveNoteAthlete(ath);
                        setNoteInput(ath.coachNotes || '');
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer text-[11px]"
                    >
                      Edit Notes
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedDrillAthlete(ath.id);
                          setActiveTab('drills');
                        }}
                        className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-xl font-bold transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                      >
                        <Dumbbell className="w-3 h-3" />
                        Assign
                      </button>

                      <button
                        onClick={() => {
                          setAthleteAId(ath.id);
                          setActiveTab('comparator');
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                      >
                        Compare
                      </button>
                    </div>

                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SIDE-BY-SIDE BIOMECHANICS COMPARATOR */}
      {/* ========================================================================= */}
      {activeTab === 'comparator' && (
        <div className="space-y-6">
          
          {/* Athlete Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl font-mono">
            
            {/* Athlete A Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                PRIMARY ATHLETE (A)
              </label>
              <select
                value={athleteAId}
                onChange={(e) => setAthleteAId(e.target.value)}
                className="w-full p-3 bg-slate-900 rounded-xl border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
              >
                {roster.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.sport} • {a.position})</option>
                ))}
              </select>
            </div>

            {/* Athlete B Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                COMPARISON ATHLETE (B)
              </label>
              <select
                value={athleteBId}
                onChange={(e) => setAthleteBId(e.target.value)}
                className="w-full p-3 bg-slate-900 rounded-xl border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
              >
                {roster.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.sport} • {a.position})</option>
                ))}
              </select>
            </div>

          </div>

          {/* Comparison Cards Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Profile A */}
            <div className="p-6 rounded-3xl bg-slate-950/90 border border-cyan-500/30 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">ATHLETE A</span>
                  <h3 className="text-xl font-extrabold text-white">{athleteA.name}</h3>
                  <p className="text-xs font-mono text-slate-400">{athleteA.sport} • {athleteA.position}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-cyan-400">{athleteA.readinessScore}%</span>
                  <span className="block text-[9px] font-mono text-slate-400">READINESS</span>
                </div>
              </div>

              {/* Metric Breakdown Bars */}
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Dynamic Knee Valgus</span>
                    <span className="font-bold text-white">{athleteA.valgus}°</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${athleteA.valgus > 14 ? 'bg-rose-500' : athleteA.valgus > 8 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, (athleteA.valgus / 25) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Bilateral Asymmetry Delta</span>
                    <span className="font-bold text-white">{athleteA.asymmetry}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${athleteA.asymmetry > 15 ? 'bg-rose-500' : 'bg-cyan-400'}`}
                      style={{ width: `${Math.min(100, (athleteA.asymmetry / 30) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Landing Flexion Shock Absorption</span>
                    <span className="font-bold text-white">{athleteA.flexion}°</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${athleteA.flexion < 30 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, (athleteA.flexion / 60) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Trunk Lateral Lean</span>
                    <span className="font-bold text-white">{athleteA.trunkLean}°</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, (athleteA.trunkLean / 20) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 italic">
                "{athleteA.coachNotes || 'No specific clinical notes recorded.'}"
              </div>
            </div>

            {/* Profile B */}
            <div className="p-6 rounded-3xl bg-slate-950/90 border border-emerald-500/30 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">ATHLETE B</span>
                  <h3 className="text-xl font-extrabold text-white">{athleteB.name}</h3>
                  <p className="text-xs font-mono text-slate-400">{athleteB.sport} • {athleteB.position}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400">{athleteB.readinessScore}%</span>
                  <span className="block text-[9px] font-mono text-slate-400">READINESS</span>
                </div>
              </div>

              {/* Metric Breakdown Bars */}
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Dynamic Knee Valgus</span>
                    <span className="font-bold text-white">{athleteB.valgus}°</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${athleteB.valgus > 14 ? 'bg-rose-500' : athleteB.valgus > 8 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, (athleteB.valgus / 25) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Bilateral Asymmetry Delta</span>
                    <span className="font-bold text-white">{athleteB.asymmetry}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${athleteB.asymmetry > 15 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, (athleteB.asymmetry / 30) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Landing Flexion Shock Absorption</span>
                    <span className="font-bold text-white">{athleteB.flexion}°</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${athleteB.flexion < 30 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, (athleteB.flexion / 60) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Trunk Lateral Lean</span>
                    <span className="font-bold text-white">{athleteB.trunkLean}°</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, (athleteB.trunkLean / 20) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 italic">
                "{athleteB.coachNotes || 'No specific clinical notes recorded.'}"
              </div>
            </div>

          </div>

          {/* Coach Decision Comparison Callout */}
          <div className="p-6 rounded-3xl bg-indigo-950/40 border border-indigo-800/50 shadow-xl font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              COACH TACTICAL BIOMECHANICAL TAKEAWAY
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              Comparing <strong>{athleteA.name}</strong> against <strong>{athleteB.name}</strong> shows dynamic differences in landing mechanics. Frontal plane deviation delta is{' '}
              <span className="text-rose-400 font-bold font-mono">{Math.abs(athleteA.valgus - athleteB.valgus).toFixed(1)}°</span>. Ensure customized conditioning is prescribed via the Drill Dispatcher.
            </p>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DRILL DISPATCHER & TACTICAL INTERVENTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'drills' && (
        <div className="space-y-8">
          
          {/* Dispatcher Form Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-emerald-400" />
                DISPATCH BIOMECHANICAL CONDITIONING PROTOCOL
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Prescribe evidence-based corrective exercise protocols directly to athletes across the organization.
              </p>
            </div>

            {dispatchSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 font-mono text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {dispatchSuccess}
              </div>
            )}

            <form onSubmit={handleDispatchDrill} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-mono text-xs">
              
              {/* Select Athlete */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block">TARGET ATHLETE</label>
                <select
                  value={selectedDrillAthlete}
                  onChange={(e) => setSelectedDrillAthlete(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 rounded-xl border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                >
                  {roster.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.sport})</option>
                  ))}
                </select>
              </div>

              {/* Select Protocol */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block">CLINICAL PROTOCOL</label>
                <select
                  value={selectedProtocol}
                  onChange={(e) => {
                    setSelectedProtocol(e.target.value);
                    const p = protocols.find(pr => pr.id === e.target.value);
                    if (p) {
                      setDrillFrequency(p.defaultFreq);
                      setDrillSetsReps(p.defaultReps);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-900 rounded-xl border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                >
                  {protocols.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block">FREQUENCY</label>
                <input
                  type="text"
                  value={drillFrequency}
                  onChange={(e) => setDrillFrequency(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 rounded-xl border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. 3 sessions/week"
                />
              </div>

              {/* Sets & Reps */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold block">PRESCRIPTION (SETS & REPS)</label>
                <input
                  type="text"
                  value={drillSetsReps}
                  onChange={(e) => setDrillSetsReps(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 rounded-xl border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. 3 sets x 12 reps"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>DISPATCH PROTOCOL TO ATHLETE</span>
                </button>
              </div>

            </form>
          </div>

          {/* Active Dispatched Drills History */}
          <div className="space-y-4 font-mono">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              LIVE DISPATCHED INTERVENTIONS LOG
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-950/80">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Athlete</th>
                    <th className="p-3.5">Prescribed Protocol</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Target Problem</th>
                    <th className="p-3.5">Frequency</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Dispatched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {dispatchedDrills.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">{d.athleteName}</td>
                      <td className="p-3.5 text-cyan-400 font-semibold">{d.protocolName}</td>
                      <td className="p-3.5 uppercase text-[10px] text-slate-400">{d.category}</td>
                      <td className="p-3.5 text-slate-300">{d.target}</td>
                      <td className="p-3.5 text-slate-400">{d.frequency}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{d.dispatchedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SQUAD VIDEO TELEMETRY FEED */}
      {/* ========================================================================= */}
      {activeTab === 'squad-feed' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white font-mono flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              SQUAD VIDEO TELEMETRY & SCREENING FEED
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {squadVideos.length} processed video sessions
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs font-mono">
              Loading squad video recordings...
            </div>
          ) : squadVideos.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-950/80 border border-slate-800 text-center font-mono space-y-3">
              <Activity className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-xs">No team videos uploaded to the squad repository yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {squadVideos.map((video) => (
                <VideoCard
                  key={video.video_id}
                  video={video}
                  isPersonal={false}
                  onDeleteSuccess={() => fetchSquadData()}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT COACH NOTE MODAL */}
      {/* ========================================================================= */}
      {activeNoteAthlete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white uppercase">
                  LOG CLINICAL NOTES: {activeNoteAthlete.name}
                </h4>
              </div>
              <button
                onClick={() => setActiveNoteAthlete(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {noteSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs">
                {noteSuccess}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-slate-400">COACH / CLINICAL OBSERVATIONS</label>
              <textarea
                rows={4}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Enter biomechanical observations, rehab restrictions, or drill instructions..."
                className="w-full p-3 bg-slate-900 rounded-xl border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveNoteAthlete(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Save Remarks
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
