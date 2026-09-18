import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { VideoCard } from './VideoCard';
import { AnalysisDashboard } from './analysis/AnalysisDashboard';
import { PerformanceRing3D } from './3d/PerformanceRing3D';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { LoadingState } from './ui/LoadingState';
import { 
  User, Activity, Dumbbell, HeartPulse, Scale, 
  Ruler, Edit3, Save, X, RefreshCw, CheckCircle2, 
  ShieldCheck, FileText, Video, Sparkles, Layers, Award, Zap,
  Plus, Trash2, Calendar, Stethoscope, AlertCircle, ShieldAlert,
  TrendingUp, ArrowUpRight, Gauge, Clock, Sliders, ChevronRight, Play
} from 'lucide-react';

export const AthleteDashboard = () => {
  const { user, fetchCurrentUser } = useAuth();
  const [athlete, setAthlete] = useState(null);
  const [myVideos, setMyVideos] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  
  // Edit Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    sport: 'General Sports',
    position: 'Athlete',
    age: '',
    height: '',
    weight: '',
    training_load: 0.0,
    flexibility: 0.0,
    strength: 0.0,
    balance: 0.0,
    endurance: 0.0,
    coach_notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Injury History Form State
  const [isAddingInjury, setIsAddingInjury] = useState(false);
  const [submittingInjury, setSubmittingInjury] = useState(false);
  const [injuryError, setInjuryError] = useState('');
  const [injuryForm, setInjuryForm] = useState({
    body_part: 'Knee',
    injury_type: 'ACL Tear / Sprain',
    severity: 'MODERATE',
    injury_date: '',
    recovery_date: '',
    remarks: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchInjuries = async () => {
    try {
      const data = await api.get('/api/athletes/injuries');
      setInjuries(data || []);
    } catch (err) {
      console.error('Failed to load injury history:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [athleteData, videos, injuriesData, analysesData] = await Promise.all([
        api.get('/api/athletes/profile').catch(() => null),
        api.get('/api/videos/my-videos').catch(() => []),
        api.get('/api/athletes/injuries').catch(() => []),
        api.get('/api/analysis/my-analyses').catch(() => [])
      ]);
      
      setAthlete(athleteData);
      setMyVideos(videos || []);
      setInjuries(injuriesData || []);
      setAnalyses(analysesData || []);

      if (athleteData) {
        setEditForm({
          sport: athleteData.sport || 'General Sports',
          position: athleteData.position || 'Athlete',
          age: athleteData.age ?? '',
          height: athleteData.height ?? '',
          weight: athleteData.weight ?? '',
          training_load: athleteData.training_load ?? 50.0,
          flexibility: athleteData.flexibility ?? 0.0,
          strength: athleteData.strength ?? 0.0,
          balance: athleteData.balance ?? 0.0,
          endurance: athleteData.endurance ?? 0.0,
          coach_notes: athleteData.coach_notes || ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load athlete profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTrainingLoad = async (newLoad) => {
    const updated = Math.max(0, Math.min(100, Math.round(newLoad)));
    try {
      const res = await api.put('/api/athletes/profile', {
        ...editForm,
        training_load: updated
      });
      setAthlete(res);
      setEditForm(prev => ({ ...prev, training_load: updated }));
      setSaveSuccess(`Training load updated to ${updated} pts (ACWR: ${((updated / 50) * 1.1).toFixed(2)})!`);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update training load');
    }
  };

  const handleAddInjury = async (e) => {
    e.preventDefault();
    setSubmittingInjury(true);
    setInjuryError('');
    try {
      await api.post('/api/athletes/injuries', injuryForm);
      setInjuryForm({
        body_part: 'Knee',
        injury_type: 'ACL Tear / Sprain',
        severity: 'MODERATE',
        injury_date: '',
        recovery_date: '',
        remarks: ''
      });
      setIsAddingInjury(false);
      await fetchInjuries();
      setSaveSuccess('Previous injury logged into medical history! Risk engine will account for this history.');
    } catch (err) {
      setInjuryError(err.message || 'Failed to log injury record');
    } finally {
      setSubmittingInjury(false);
    }
  };

  const handleDeleteInjury = async (injuryId) => {
    if (!window.confirm('Delete this injury record from your medical profile?')) return;
    try {
      await api.delete(`/api/athletes/injuries/${injuryId}`);
      await fetchInjuries();
      setSaveSuccess('Injury record removed from history.');
    } catch (err) {
      alert(err.message || 'Failed to delete injury record');
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

  const handleAnalyseMovement = async (video, existingAnalysisId, forceRerun = false) => {
    if (existingAnalysisId && !forceRerun) {
      setActiveAnalysis({
        analysisId: existingAnalysisId,
        video: video
      });
      return;
    }

    if (forceRerun) {
      return handleReanalyseMovement(video);
    }

    try {
      const res = await api.post(`/api/analysis/videos/${video.video_id}/analyse`);
      if (res && res.analysis_id) {
        setActiveAnalysis({
          analysisId: res.analysis_id,
          video: video
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to initiate pose analysis');
    }
  };

  const handleReanalyseMovement = async (video) => {
    try {
      const res = await api.post(`/api/analysis/videos/${video.video_id}/reanalyse`);
      if (res && res.analysis_id) {
        setActiveAnalysis({
          analysisId: res.analysis_id,
          video: video
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to re-analyse video');
    }
  };

  if (activeAnalysis) {
    return (
      <AnalysisDashboard
        analysisId={activeAnalysis.analysisId}
        video={activeAnalysis.video}
        onBack={() => setActiveAnalysis(null)}
      />
    );
  }

  if (loading) {
    return <LoadingState message="SYNCHRONIZING ATHLETE BIOMETRICS..." subtext="Accessing PostgreSQL profile records & kinematics index" />;
  }

  const ath = athlete || {};
  const flexVal = typeof ath.flexibility === 'number' ? ath.flexibility : 0.0;
  const strVal = typeof ath.strength === 'number' ? ath.strength : 0.0;
  const balVal = typeof ath.balance === 'number' ? ath.balance : 0.0;
  const endVal = typeof ath.endurance === 'number' ? ath.endurance : 0.0;
  const hasPerformanceData = Boolean(flexVal > 0 || strVal > 0 || balVal > 0 || endVal > 0);

  // Analysis & Risk Score Calculations
  const completedAnalyses = analyses.filter(a => a.status === 'completed' && a.result);
  const latestAnalysis = completedAnalyses.length > 0 ? completedAnalyses[0] : null;
  const latestResult = latestAnalysis?.result || null;
  const currentTrainingLoad = typeof ath.training_load === 'number' ? ath.training_load : 50;
  const estimatedACWR = Number(((currentTrainingLoad / 50) * 1.1).toFixed(2));

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

      {/* ========================================================================= */}
      {/* 1. BIOMECHANICAL RISK SCORE, TRAINING LOAD & KINEMATICS HUD BANNER */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        
        {/* KPI 1: OVERALL INJURY RISK SCORE */}
        <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-3 relative overflow-hidden group">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">OVERALL INJURY RISK</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${
              !latestResult ? 'text-slate-400' :
              latestResult.overall_risk_score > 70 ? 'text-rose-400' :
              latestResult.overall_risk_score > 40 ? 'text-amber-400' :
              'text-emerald-400'
            }`}>
              {latestResult ? latestResult.overall_risk_score : '--'}
            </span>
            <span className="text-xs text-slate-500 font-bold">/ 100</span>
            
            {latestResult && (
              <span className={`ml-auto px-2 py-0.5 text-[9px] font-black rounded-full border uppercase ${
                latestResult.risk_level === 'CRITICAL' || latestResult.risk_level === 'HIGH'
                  ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                  : latestResult.risk_level === 'MODERATE'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
              }`}>
                {latestResult.risk_level} RISK
              </span>
            )}
          </div>

          {/* Progress gauge */}
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                !latestResult ? 'bg-slate-700' :
                latestResult.overall_risk_score > 70 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' :
                latestResult.overall_risk_score > 40 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
                'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
              }`}
              style={{ width: `${latestResult ? Math.min(100, latestResult.overall_risk_score) : 0}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-500 flex justify-between items-center">
            <span>5-Factor Clinical Weighting</span>
            <span className={latestResult ? "text-cyan-400 font-bold" : "text-slate-500"}>
              {latestResult ? 'Screened' : 'Awaiting Video'}
            </span>
          </div>
        </div>

        {/* KPI 2: TRAINING LOAD & ACWR (WORKLOAD CONTROLLER) */}
        <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">WEEKLY TRAINING LOAD</span>
            <Gauge className="w-4 h-4 text-amber-400" />
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">{currentTrainingLoad}</span>
              <span className="text-xs text-slate-400 font-bold">PTS</span>
            </div>

            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full border uppercase ${
              currentTrainingLoad > 70 ? 'bg-rose-950/80 text-rose-400 border-rose-800' :
              currentTrainingLoad < 40 ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' :
              'bg-cyan-950/80 text-cyan-300 border-cyan-800'
            }`}>
              ACWR: {estimatedACWR}
            </span>
          </div>

          {/* Quick Adjustment Slider & +/- Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUpdateTrainingLoad(currentTrainingLoad - 5)}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
              title="Decrease Training Load (-5 pts)"
            >
              -5
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={currentTrainingLoad}
              onChange={(e) => handleUpdateTrainingLoad(parseInt(e.target.value) || 0)}
              className="flex-1 accent-amber-400 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => handleUpdateTrainingLoad(currentTrainingLoad + 5)}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
              title="Increase Training Load (+5 pts)"
            >
              +5
            </button>
          </div>

          <div className="text-[10px] text-slate-500">
            {currentTrainingLoad > 70 ? '⚠️ High hazard workload spike' :
             currentTrainingLoad < 40 ? '🟢 Light / Recovery loading' :
             '⚡ Optimal conditioning window'}
          </div>
        </div>

        {/* KPI 3: CALIBRATED ML PROBABILITY */}
        <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">CALIBRATED ML PROBABILITY</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-400">
              {latestResult && typeof latestResult.calibrated_ml_probability === 'number'
                ? `${(latestResult.calibrated_ml_probability * 100).toFixed(1)}%`
                : '--'}
            </span>
            <span className="text-[10px] text-indigo-300 font-bold">INJURY CHANCE</span>
          </div>

          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
              style={{
                width: `${latestResult && typeof latestResult.calibrated_ml_probability === 'number'
                  ? Math.min(100, latestResult.calibrated_ml_probability * 100)
                  : 0}%`
              }}
            />
          </div>

          <div className="text-[10px] text-slate-500 flex justify-between items-center">
            <span>Supervised XGBoost Model</span>
            <span className="text-slate-400">Platt Scaled</span>
          </div>
        </div>

        {/* KPI 4: SCREENED MOVEMENTS & TELEMETRY */}
        <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">SCREENING SESSIONS</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{completedAnalyses.length}</span>
            <span className="text-xs text-slate-400 font-bold">COMPLETED</span>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Knee Valgus: <strong className="text-cyan-400">{latestResult?.knee_valgus ? `${latestResult.knee_valgus}°` : '--'}</strong></span>
            <span>•</span>
            <span>Asymmetry: <strong className="text-emerald-400">{latestResult?.symmetry_score ? `${latestResult.symmetry_score}%` : '--'}</strong></span>
          </div>

          <div className="text-[10px] text-slate-500">
            {latestAnalysis?.completed_at ? `Latest: ${String(latestAnalysis.completed_at).slice(0, 10)}` : 'RTMPose-M ONNX 17-Keypoints'}
          </div>
        </div>

      </div>

      {/* CENTRAL 3D PERFORMANCE INTELLIGENCE SHOWCASE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Athlete Profile Bio */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-4">
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-white uppercase">Athlete Profile</span>
              <User className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Sport & Discipline</span>
                <span className="text-white font-bold">{ath.sport || 'General'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Field Position</span>
                <span className="text-cyan-400 font-bold">{ath.position || 'Athlete'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Age</span>
                  <span className={ath.age ? "text-white font-bold" : "text-slate-500 italic"}>
                    {ath.age ? `${ath.age} yrs` : 'Not Set'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Stature</span>
                  <span className={ath.height ? "text-teal-400 font-bold" : "text-slate-500 italic"}>
                    {ath.height ? `${ath.height} cm` : 'Not Set'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Mass</span>
                  <span className={ath.weight ? "text-indigo-400 font-bold" : "text-slate-500 italic"}>
                    {ath.weight ? `${ath.weight} kg` : 'Not Set'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Load Index</span>
                  <span className={ath.training_load ? "text-amber-400 font-bold" : "text-slate-500 italic"}>
                    {ath.training_load ? `${ath.training_load} pts` : '0 pts'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coach Notes snippet */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs flex-1 flex flex-col justify-center">
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
        <div className="lg:col-span-6 flex flex-col">
          <PerformanceRing3D
            className="flex-1"
            flexibility={flexVal}
            strength={strVal}
            balance={balVal}
            endurance={endVal}
            hasData={hasPerformanceData}
          />
        </div>

        {/* RIGHT COLUMN: Performance Intelligence Radial Gauges */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-3 font-mono">
          
          {/* Gauge 1: Flexibility */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Flexibility</span>
              <span className={hasPerformanceData ? "text-cyan-400 font-black" : "text-slate-500 font-bold"}>
                {hasPerformanceData ? <AnimatedNumber value={flexVal} duration={800} suffix="%" /> : '--'}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                style={{ width: `${hasPerformanceData ? Math.min(flexVal, 100) : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Joint Mobility & Elasticity</span>
          </div>

          {/* Gauge 2: Strength */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Strength</span>
              <span className={hasPerformanceData ? "text-emerald-400 font-black" : "text-slate-500 font-bold"}>
                {hasPerformanceData ? <AnimatedNumber value={strVal} duration={800} suffix="%" /> : '--'}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                style={{ width: `${hasPerformanceData ? Math.min(strVal, 100) : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Peak Force Transmission</span>
          </div>

          {/* Gauge 3: Balance */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Balance</span>
              <span className={hasPerformanceData ? "text-amber-400 font-black" : "text-slate-500 font-bold"}>
                {hasPerformanceData ? <AnimatedNumber value={balVal} duration={800} suffix="%" /> : '--'}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                style={{ width: `${hasPerformanceData ? Math.min(balVal, 100) : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Proprioception & Pelvic Control</span>
          </div>

          {/* Gauge 4: Endurance */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Endurance</span>
              <span className={hasPerformanceData ? "text-violet-400 font-black" : "text-slate-500 font-bold"}>
                {hasPerformanceData ? <AnimatedNumber value={endVal} duration={800} suffix="%" /> : '--'}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-violet-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                style={{ width: `${hasPerformanceData ? Math.min(endVal, 100) : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Fatigue & Strain Resistance</span>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* PREVIOUS INJURY & CLINICAL HISTORY REGISTRY (20% RISK FACTOR WEIGHT) */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/40 shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-mono font-bold text-white tracking-wide">
                  PREVIOUS INJURY & CLINICAL HISTORY
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-black rounded-full bg-rose-950/90 border border-rose-700/80 text-rose-300">
                  {injuries.length} RECORDED
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Directly calibrates the <strong className="text-rose-400">20% Injury History Factor</strong> in our Biomechanical Risk Engine.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingInjury(!isAddingInjury)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            {isAddingInjury ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{isAddingInjury ? 'Cancel' : 'Log Past Injury'}</span>
          </button>
        </div>

        {/* Add Injury Form Drawer */}
        {isAddingInjury && (
          <form onSubmit={handleAddInjury} className="p-6 rounded-2xl bg-slate-900/90 border border-rose-500/40 space-y-4 font-mono text-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="font-bold text-white flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                RECORD PREVIOUS MUSCULOSKELETAL INJURY
              </span>
              <span className="text-[10px] text-slate-500">Persisted in Medical History DB</span>
            </div>

            {injuryError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {injuryError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Body Part */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Anatomical Region *</label>
                <select
                  value={injuryForm.body_part}
                  onChange={(e) => setInjuryForm({ ...injuryForm, body_part: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-rose-400"
                  required
                >
                  <option value="Knee">Knee (ACL / MCL / PCL / Meniscus)</option>
                  <option value="Hamstring">Hamstring (Biceps Femoris / Semi-T)</option>
                  <option value="Ankle">Ankle & Foot (ATFL / High Ankle / Achilles)</option>
                  <option value="Hip">Hip & Groin (Adductor / Labrum)</option>
                  <option value="Shoulder">Shoulder (Rotator Cuff / Labrum)</option>
                  <option value="Lower Back">Lower Back & Spine (Lumbar / Disc)</option>
                  <option value="Quad">Quadriceps / Thigh</option>
                  <option value="Calf">Calf / Gastrocnemius</option>
                  <option value="Other">Other Musculoskeletal Region</option>
                </select>
              </div>

              {/* Injury Type */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Injury Diagnosis / Type *</label>
                <input
                  type="text"
                  value={injuryForm.injury_type}
                  onChange={(e) => setInjuryForm({ ...injuryForm, injury_type: e.target.value })}
                  placeholder="e.g. ACL Tear / Reconstruction"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-rose-400"
                  required
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Clinical Severity *</label>
                <select
                  value={injuryForm.severity}
                  onChange={(e) => setInjuryForm({ ...injuryForm, severity: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-rose-400"
                >
                  <option value="MILD">MILD (Grade 1 - No game time lost)</option>
                  <option value="MODERATE">MODERATE (Grade 2 - 2 to 6 weeks rehab)</option>
                  <option value="SEVERE">SEVERE (Grade 3 - Complete tear, &gt;6 weeks)</option>
                  <option value="SURGICAL">SURGICAL (Operative reconstruction / repair)</option>
                </select>
              </div>

              {/* Date Occurred */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Approx. Date Occurred</label>
                <input
                  type="date"
                  value={injuryForm.injury_date}
                  onChange={(e) => setInjuryForm({ ...injuryForm, injury_date: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-rose-400"
                />
              </div>

              {/* Clinical Remarks */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-slate-400 font-semibold mb-1">Rehab Notes / Lingering Symptoms</label>
                <textarea
                  rows={2}
                  value={injuryForm.remarks}
                  onChange={(e) => setInjuryForm({ ...injuryForm, remarks: e.target.value })}
                  placeholder="e.g. Underwent surgical reconstruction in 2024. Occasional mild stiffness during deep deceleration landings."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-rose-400"
                />
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingInjury(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs rounded-xl border border-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingInjury}
                className="flex items-center gap-2 px-5 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-rose-500/20 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{submittingInjury ? 'Saving Record...' : 'Save to Medical History'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Existing Injuries Roster */}
        {injuries.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-2 font-mono text-xs">
            <Stethoscope className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold">No Previous Injuries Logged</p>
            <p className="text-slate-500 max-w-md mx-auto text-[11px]">
              If you have experienced prior ACL tears, ankle sprains, hamstring pulls, or surgeries, click 
              <span className="text-rose-400 font-bold"> "Log Past Injury" </span> 
              above to calibrate the 20% history weighting in your movement screenings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
            {injuries.map((inj) => {
              const regionColor = 
                inj.body_part?.toLowerCase().includes('knee') ? 'text-cyan-400 border-cyan-800/60 bg-cyan-950/60' :
                inj.body_part?.toLowerCase().includes('hamstring') ? 'text-amber-400 border-amber-800/60 bg-amber-950/60' :
                inj.body_part?.toLowerCase().includes('ankle') ? 'text-purple-400 border-purple-800/60 bg-purple-950/60' :
                inj.body_part?.toLowerCase().includes('shoulder') ? 'text-blue-400 border-blue-800/60 bg-blue-950/60' :
                'text-rose-400 border-rose-800/60 bg-rose-950/60';

              const severityBadge = 
                inj.severity === 'SURGICAL' ? 'bg-rose-950/90 text-rose-300 border-rose-700' :
                inj.severity === 'SEVERE' ? 'bg-rose-950/70 text-rose-400 border-rose-800' :
                inj.severity === 'MODERATE' ? 'bg-amber-950/70 text-amber-300 border-amber-800' :
                'bg-emerald-950/70 text-emerald-400 border-emerald-800';

              return (
                <div 
                  key={inj.injury_id} 
                  className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-rose-500/40 transition-all shadow-lg space-y-3 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border uppercase ${regionColor}`}>
                        {inj.body_part}
                      </span>

                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-full border uppercase ${severityBadge}`}>
                        {inj.severity || 'MODERATE'}
                      </span>
                    </div>

                    {/* Injury Type */}
                    <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                      {inj.injury_type}
                    </h4>

                    {/* Date */}
                    {inj.injury_date && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Occurred: {inj.injury_date}</span>
                      </div>
                    )}

                    {/* Remarks */}
                    {inj.remarks && (
                      <p className="text-[11px] text-slate-300 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 line-clamp-2">
                        "{inj.remarks}"
                      </p>
                    )}

                  </div>

                  {/* Card Bottom: Delete Action */}
                  <div className="pt-2 border-t border-slate-800/70 flex justify-end">
                    <button
                      onClick={() => handleDeleteInjury(inj.injury_id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Delete injury record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Explanatory Clinical Callout */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">How this impacts your analysis:</strong> Prior knee injuries cause the screening engine to heighten sensitivity for medial knee valgus collapse. Prior hamstring strains lower the threshold for bilateral asymmetry alerts during eccentric landing deceleration.
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* PREVIOUS SCREENING ANALYSES HISTORY */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-mono font-bold text-white tracking-wide">
                  PREVIOUS SCREENING ANALYSES
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-black rounded-full bg-cyan-950/90 border border-cyan-700/80 text-cyan-300">
                  {completedAnalyses.length} COMPLETED
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Historical biomechanical kinematic screenings, AI risk scores, and annotated pose telemetry.
              </p>
            </div>
          </div>
        </div>

        {completedAnalyses.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-2 font-mono text-xs">
            <Activity className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold">No Previous Screenings Found</p>
            <p className="text-slate-500 max-w-md mx-auto text-[11px]">
              Upload a movement video sequence below to execute your first RTMPose-M deep learning screening and compute your initial risk score.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-mono">
            {completedAnalyses.map((an) => {
              const res = an.result || {};
              const riskLevel = res.risk_level || 'LOW';
              const riskScore = res.overall_risk_score || res.screening_risk_score || 0;
              const mlProb = typeof res.calibrated_ml_probability === 'number' ? (res.calibrated_ml_probability * 100).toFixed(1) : '--';
              const screenedDate = an.completed_at ? String(an.completed_at).slice(0, 10) : an.created_at ? String(an.created_at).slice(0, 10) : 'Recent';

              const riskBadgeColor =
                riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'bg-rose-950/90 text-rose-300 border-rose-700' :
                riskLevel === 'MODERATE' ? 'bg-amber-950/90 text-amber-300 border-amber-700' :
                'bg-emerald-950/90 text-emerald-300 border-emerald-700';

              return (
                <div
                  key={an.analysis_id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-cyan-500/40 transition-all shadow-xl space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    
                    {/* Card Top: Activity Title & Risk Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors truncate max-w-[190px]">
                          {an.video?.activity || 'Movement Assessment'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>Screened: {screenedDate}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 text-[9px] font-black rounded-full border uppercase ${riskBadgeColor} shrink-0`}>
                        {riskScore}/100 {riskLevel}
                      </span>
                    </div>

                    {/* Kinematic Telemetry Grid */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center">
                      <div>
                        <span className="text-[9px] text-slate-500 block">VALGUS</span>
                        <span className={`text-xs font-black ${res.knee_valgus > 14 ? 'text-rose-400' : res.knee_valgus > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {res.knee_valgus ? `${res.knee_valgus}°` : '--'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 block">SYMMETRY</span>
                        <span className="text-xs font-black text-cyan-400">
                          {res.symmetry_score ? `${res.symmetry_score}%` : '--'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 block">ML PROB</span>
                        <span className="text-xs font-black text-indigo-400">
                          {mlProb}%
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Open 3D Analysis Action Button */}
                  <button
                    onClick={() => {
                      if (an.video) {
                        setActiveAnalysis({
                          analysisId: an.analysis_id,
                          video: an.video
                        });
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 hover:border-cyan-400 rounded-xl font-mono font-bold text-xs transition-all shadow-md cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open 3D Analysis Dashboard</span>
                  </button>

                </div>
              );
            })}
          </div>
        )}

      </div>


    </div>
  );
};
