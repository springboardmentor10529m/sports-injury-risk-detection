import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { VideoCard } from './VideoCard';
import { PerformanceRing3D } from './3d/PerformanceRing3D';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { LoadingState } from './ui/LoadingState';
import { 
  User, Activity, Dumbbell, HeartPulse, Scale, 
  Ruler, Edit3, Save, X, RefreshCw, CheckCircle2, 
  ShieldCheck, FileText, Video, Sparkles, Layers, Award, Zap
} from 'lucide-react';

export const AthleteDashboard = () => {
  const { user, fetchCurrentUser } = useAuth();
  const [athlete, setAthlete] = useState(null);
  const [myVideos, setMyVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    sport: 'General Sports',
    position: 'Athlete',
    age: 23,
    height: 180.0,
    weight: 75.0,
    training_load: 65.0,
    flexibility: 75.0,
    strength: 82.0,
    balance: 78.0,
    endurance: 85.0,
    coach_notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const athleteData = await api.get('/api/athletes/profile');
      setAthlete(athleteData);

      if (athleteData) {
        setEditForm({
          sport: athleteData.sport || 'General Sports',
          position: athleteData.position || 'Athlete',
          age: athleteData.age || 23,
          height: athleteData.height || 180.0,
          weight: athleteData.weight || 75.0,
          training_load: athleteData.training_load || 65.0,
          flexibility: athleteData.flexibility || 75.0,
          strength: athleteData.strength || 82.0,
          balance: athleteData.balance || 78.0,
          endurance: athleteData.endurance || 85.0,
          coach_notes: athleteData.coach_notes || ''
        });
      }

      const videoData = await api.get('/api/videos/my-videos');
      setMyVideos(videoData || []);
    } catch (err) {
      setError(err.message || 'Failed to load athlete profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess('');
    try {
      const updated = await api.put('/api/athletes/profile', editForm);
      setAthlete(updated);
      setSaveSuccess('Athlete profile & biomechanical ratings saved successfully!');
      setIsEditing(false);
      await fetchCurrentUser();
    } catch (err) {
      setError(err.message || 'Failed to save athlete details');
    } finally {
      setSaving(false);
    }
  };

  const handleVideoDeleted = (deletedId) => {
    setMyVideos((prev) => prev.filter((v) => v.video_id !== deletedId));
  };

  if (loading) {
    return <LoadingState message="SYNCHRONIZING ATHLETE BIOMETRICS..." subtext="Accessing PostgreSQL profile records & kinematics index" />;
  }

  const ath = athlete || {};
  const flexVal = ath.flexibility || 75.0;
  const strVal = ath.strength || 82.0;
  const balVal = ath.balance || 78.0;
  const endVal = ath.endurance || 85.0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn font-sans pb-12">
      
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess('')} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* TOP: ATHLETE PERFORMANCE OVERVIEW */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-600 p-1 flex-shrink-0 shadow-xl shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-white text-3xl font-mono">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/90 border border-cyan-800 rounded-full uppercase tracking-wider">
                ATHLETE PERFORMANCE OVERVIEW
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-800 rounded-full uppercase">
                {user?.role || 'ATHLETE'}
              </span>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight">
              {user?.name || 'Marcus Vance'}
            </h1>

            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 font-mono">
              <span>Sport: <strong className="text-white">{ath.sport || 'Basketball'}</strong></span>
              <span>•</span>
              <span>Position: <strong className="text-cyan-400">{ath.position || 'Point Guard'}</strong></span>
              <span>•</span>
              <span>ID: <code className="text-slate-400 font-mono text-[11px]">{ath.athlete_id?.slice(0, 8) || 'ATH-001'}</code></span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-white font-mono font-bold text-xs rounded-xl shadow-lg transition-all whitespace-nowrap self-start md:self-auto cursor-pointer"
        >
          {isEditing ? <X className="w-4 h-4 text-rose-400" /> : <Edit3 className="w-4 h-4 text-cyan-400" />}
          {isEditing ? 'Cancel Edit' : 'Edit Physical Bio'}
        </button>
      </div>

      {/* Edit Form Modal Drawer */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl space-y-6 animate-fadeIn font-mono">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              UPDATE ATHLETE ASSESSMENT & BIOMETRIC PROFILES
            </h3>
            <span className="text-[11px] text-slate-500">Persisted in PostgreSQL</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Sport</label>
              <input
                type="text"
                value={editForm.sport}
                onChange={(e) => setEditForm({ ...editForm, sport: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Position</label>
              <input
                type="text"
                value={editForm.position}
                onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Age (Years)</label>
              <input
                type="number"
                value={editForm.age}
                onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 20 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                value={editForm.height}
                onChange={(e) => setEditForm({ ...editForm, height: parseFloat(e.target.value) || 175 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={editForm.weight}
                onChange={(e) => setEditForm({ ...editForm, weight: parseFloat(e.target.value) || 70 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Flexibility (0-100)</label>
              <input
                type="number"
                value={editForm.flexibility}
                onChange={(e) => setEditForm({ ...editForm, flexibility: parseFloat(e.target.value) || 75 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Strength (0-100)</label>
              <input
                type="number"
                value={editForm.strength}
                onChange={(e) => setEditForm({ ...editForm, strength: parseFloat(e.target.value) || 80 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Endurance (0-100)</label>
              <input
                type="number"
                value={editForm.endurance}
                onChange={(e) => setEditForm({ ...editForm, endurance: parseFloat(e.target.value) || 75 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1 text-xs">Coach / Clinical Notes</label>
            <textarea
              rows="3"
              value={editForm.coach_notes}
              onChange={(e) => setEditForm({ ...editForm, coach_notes: e.target.value })}
              placeholder="Clinical observation or training history..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              SAVE PROFILE
            </button>
          </div>
        </form>
      )}

      {/* CENTRAL 3D PERFORMANCE INTELLIGENCE SHOWCASE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* LEFT COLUMN: Athlete Profile Bio */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-white uppercase">Athlete Profile</span>
              <User className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Sport & Discipline</span>
                <span className="text-white font-bold">{ath.sport || 'Basketball'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Field Position</span>
                <span className="text-cyan-400 font-bold">{ath.position || 'Point Guard'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Age</span>
                  <span className="text-white font-bold">{ath.age || 22} yrs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Stature</span>
                  <span className="text-teal-400 font-bold">{ath.height || 180} cm</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Mass</span>
                  <span className="text-indigo-400 font-bold">{ath.weight || 75} kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Load Index</span>
                  <span className="text-amber-400 font-bold">{ath.training_load || 65} pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coach Notes snippet */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
              <FileText className="w-3 h-3 text-cyan-400" />
              Coach Remarks
            </span>
            <p className="text-slate-300 italic text-[11px] leading-relaxed">
              {ath.coach_notes ? `"${ath.coach_notes}"` : 'No clinical training notes attached yet.'}
            </p>
          </div>
        </div>

        {/* CENTER COLUMN: 3D Performance Ring */}
        <div className="lg:col-span-6">
          <PerformanceRing3D
            flexibility={flexVal}
            strength={strVal}
            balance={balVal}
            endurance={endVal}
          />
        </div>

        {/* RIGHT COLUMN: Performance Intelligence Radial Gauges */}
        <div className="lg:col-span-3 space-y-3 font-mono">
          
          {/* Gauge 1: Flexibility */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Flexibility</span>
              <span className="text-cyan-400 font-black">
                <AnimatedNumber value={flexVal} duration={800} suffix="%" />
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                style={{ width: `${flexVal}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Joint Mobility & Elasticity</span>
          </div>

          {/* Gauge 2: Strength */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Strength</span>
              <span className="text-emerald-400 font-black">
                <AnimatedNumber value={strVal} duration={800} suffix="%" />
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                style={{ width: `${strVal}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Peak Force Transmission</span>
          </div>

          {/* Gauge 3: Balance */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Balance</span>
              <span className="text-amber-400 font-black">
                <AnimatedNumber value={balVal} duration={800} suffix="%" />
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                style={{ width: `${balVal}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Proprioception & Pelvic Control</span>
          </div>

          {/* Gauge 4: Endurance */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Endurance</span>
              <span className="text-violet-400 font-black">
                <AnimatedNumber value={endVal} duration={800} suffix="%" />
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-violet-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                style={{ width: `${endVal}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Fatigue & Strain Resistance</span>
          </div>

        </div>

      </div>

      {/* PERSONAL VIDEO LIBRARY FEED */}
      <div className="space-y-4 pt-6 border-t border-slate-900">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-cyan-400" />
              MY UPLOADED MOVEMENT SEQUENCES ({myVideos.length})
            </h3>
            <p className="text-xs text-slate-400">Strictly private video library linked to this athlete profile</p>
          </div>
        </div>

        {myVideos.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2 text-xs text-slate-400 font-mono">
            <p>No video sequences uploaded yet. Navigate to Movement Studio to upload your first clip.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myVideos.map((video) => (
              <VideoCard
                key={video.video_id}
                video={video}
                isPersonal={true}
                onDeleteSuccess={handleVideoDeleted}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
