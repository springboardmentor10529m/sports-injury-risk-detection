import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { VideoCard } from './VideoCard';
import { 
  User, Activity, Dumbbell, HeartPulse, Scale, 
  Ruler, Edit3, Save, X, RefreshCw, CheckCircle2, 
  ShieldCheck, FileText, Video, Sparkles, Layers
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
      // 1. Fetch Athlete Profile
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

      // 2. Fetch Athlete Personal Videos
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
      setSaveSuccess('Athlete profile & physical assessment saved successfully!');
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
    return (
      <div className="flex flex-col items-center justify-center py-24 text-cyan-400 space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Loading Athlete Details...</p>
      </div>
    );
  }

  const ath = athlete || {};

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Save Toast Notification */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Athlete Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-600 p-1 flex-shrink-0 shadow-xl shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-extrabold text-white text-3xl">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold text-cyan-400 bg-cyan-950 border border-cyan-800 rounded-full uppercase">
                ATHLETE PROFILE & DASHBOARD
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-800 rounded-full uppercase">
                {user?.role || 'ATHLETE'}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-white">
              {user?.name || 'Athlete Name'}
            </h1>

            <p className="text-xs text-slate-400 flex items-center gap-3 font-medium">
              <span>Sport: <strong className="text-white">{ath.sport || 'General Sports'}</strong></span>
              <span>•</span>
              <span>Position: <strong className="text-cyan-400">{ath.position || 'Athlete'}</strong></span>
              <span>•</span>
              <span>Email: <strong className="text-slate-300">{user?.email}</strong></span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all whitespace-nowrap self-start md:self-auto"
        >
          {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          {isEditing ? 'Cancel Edit' : 'Edit Athlete Details'}
        </button>
      </div>

      {/* Edit Form Drawer */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-cyan-400" />
              Update Athlete Assessment & Profile Details
            </h3>
            <span className="text-xs text-slate-400">Database: SQLAlchemy PostgreSQL</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Primary Sport</label>
              <input
                type="text"
                value={editForm.sport}
                onChange={(e) => setEditForm({ ...editForm, sport: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Position / Sub-discipline</label>
              <input
                type="text"
                value={editForm.position}
                onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Age (Years)</label>
              <input
                type="number"
                value={editForm.age}
                onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 20 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                value={editForm.height}
                onChange={(e) => setEditForm({ ...editForm, height: parseFloat(e.target.value) || 175 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={editForm.weight}
                onChange={(e) => setEditForm({ ...editForm, weight: parseFloat(e.target.value) || 70 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Flexibility (0-100)</label>
              <input
                type="number"
                value={editForm.flexibility}
                onChange={(e) => setEditForm({ ...editForm, flexibility: parseFloat(e.target.value) || 75 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Strength Rating (0-100)</label>
              <input
                type="number"
                value={editForm.strength}
                onChange={(e) => setEditForm({ ...editForm, strength: parseFloat(e.target.value) || 80 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Endurance Rating (0-100)</label>
              <input
                type="number"
                value={editForm.endurance}
                onChange={(e) => setEditForm({ ...editForm, endurance: parseFloat(e.target.value) || 75 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-xs">Coach / Clinical Notes</label>
            <textarea
              rows="3"
              value={editForm.coach_notes}
              onChange={(e) => setEditForm({ ...editForm, coach_notes: e.target.value })}
              placeholder="Enter training notes or movement observations..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Primary Athlete Physical Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Physical Bio 1: Age / DOB */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Age & Bio</span>
            <User className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {ath.age || 20} <span className="text-sm font-normal text-slate-400">years</span>
          </div>
          <p className="text-[11px] text-slate-400">Registered Athlete Bio</p>
        </div>

        {/* Physical Bio 2: Height */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Height</span>
            <Ruler className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-teal-400">
            {ath.height || 175} <span className="text-sm font-normal text-slate-400">cm</span>
          </div>
          <p className="text-[11px] text-slate-400">Stature measurement</p>
        </div>

        {/* Physical Bio 3: Weight */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Body Weight</span>
            <Scale className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-400">
            {ath.weight || 70} <span className="text-sm font-normal text-slate-400">kg</span>
          </div>
          <p className="text-[11px] text-slate-400">Mass metric</p>
        </div>

        {/* Physical Bio 4: Weekly Training Load */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Weekly Workload</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {ath.training_load || 50} <span className="text-sm font-normal text-slate-400">Score</span>
          </div>
          <p className="text-[11px] text-slate-400">Training load index</p>
        </div>

      </div>

      {/* Physical Assessment Progress Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 lg:col-span-2 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-cyan-400" />
                Physical Assessment Metrics
              </h3>
              <p className="text-xs text-slate-400">Neuromuscular ratings and mobility progress (0 to 100 scale)</p>
            </div>
            <span className="px-3 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-full text-xs font-bold">
              Active Assessment
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            
            {/* Gauge 1: Flexibility */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-slate-300">Flexibility Score</span>
                <span className="text-cyan-400">{ath.flexibility || 75} / 100</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${ath.flexibility || 75}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500">Joint range of motion & hamstrings elasticity</p>
            </div>

            {/* Gauge 2: Strength */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-slate-300">Strength Rating</span>
                <span className="text-emerald-400">{ath.strength || 80} / 100</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${ath.strength || 80}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500">Peak quadriceps & gluteus max force output</p>
            </div>

            {/* Gauge 3: Balance & Stability */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-slate-300">Balance & Stability</span>
                <span className="text-amber-400">{ath.balance || 70} / 100</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${ath.balance || 70}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500">Single-leg balance & pelvic control index</p>
            </div>

            {/* Gauge 4: Endurance */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-slate-300">Endurance Level</span>
                <span className="text-indigo-400">{ath.endurance || 75} / 100</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${ath.endurance || 75}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500">Aerobic capacity & fatigue resistance</p>
            </div>

          </div>
        </div>

        {/* Coach / Clinical Notes Box */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-cyan-400" />
              Coach & Training Notes
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed italic">
              {ath.coach_notes ? (
                `"${ath.coach_notes}"`
              ) : (
                'No coach notes added yet. Click "Edit Athlete Details" above to add remarks.'
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-300 space-y-1">
            <span className="font-bold text-white block">Athlete ID:</span>
            <code className="font-mono text-[11px] text-cyan-400">{ath.athlete_id || 'N/A'}</code>
          </div>
        </div>

      </div>

      {/* Personal Video Upload Summary Feed */}
      <div className="space-y-4 pt-4 border-t border-slate-900">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-cyan-400" />
              My Uploaded Videos ({myVideos.length})
            </h3>
            <p className="text-xs text-slate-400">Strictly personal video library uploaded by this account</p>
          </div>
        </div>

        {myVideos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2 text-xs text-slate-400">
            <p>No uploaded videos yet.</p>
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
