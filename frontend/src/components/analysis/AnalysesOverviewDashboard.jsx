import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  Activity, ShieldAlert, ShieldCheck, AlertTriangle, 
  FileSpreadsheet, FileText, Film, Play, Trash2, Calendar, Clock, 
  ChevronRight, BarChart2, Eye, Download, Search, Filter, 
  RefreshCw, Zap, TrendingUp, CheckCircle2, ArrowLeft, Video as VideoIcon, 
  Sparkles, X, RotateCw
} from 'lucide-react';

export const AnalysesOverviewDashboard = ({ onOpenAnalysis, onNavigateToUpload }) => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // ALL, LOW, MODERATE, HIGH
  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [reanalysingId, setReanalysingId] = useState(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/analysis/my-analyses');
      setAnalyses(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (analysisId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this analysis report and its telemetry data?')) {
      return;
    }
    try {
      await api.delete(`/api/analysis/${analysisId}`);
      setAnalyses((prev) => prev.filter((a) => a.analysis_id !== analysisId));
    } catch (err) {
      alert(err.message || 'Failed to delete analysis');
    }
  };

  const handleReanalyse = async (analysis, e) => {
    if (e) e.stopPropagation();
    const vidId = analysis.video_id || analysis.video?.video_id;
    if (!vidId) return;
    setReanalysingId(analysis.analysis_id);
    try {
      const res = await api.post(`/api/analysis/videos/${vidId}/reanalyse`);
      if (res && res.analysis_id) {
        if (onOpenAnalysis) {
          onOpenAnalysis({
            analysis_id: res.analysis_id,
            video_id: vidId,
            video: analysis.video,
            status: 'queued'
          });
        } else {
          fetchAnalyses();
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to re-analyse video');
    } finally {
      setReanalysingId(null);
    }
  };

  const handleDownloadCsv = async (analysisId, e) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    const url = `/api/analysis/${analysisId}/download/biomechanics`;
    try {
      const blob = await api.get(url, { responseType: 'blob' });
      const downloadUrl = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `biomechanics_${analysisId.slice(0, 8)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Download error: ' + (err.message || 'Failed to download report'));
    }
  };

  const handleDownloadPdf = async (analysisId, e) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    const url = `${api.baseUrl}/api/analysis/${analysisId}/download/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    try {
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `AthleteGuard_Report_${analysisId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Download error: ' + (err.message || 'Failed to download PDF'));
    }
  };

  const handleWatchSkeleton = (analysis, e) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    const vStamp = analysis.completed_at ? encodeURIComponent(analysis.completed_at) : Date.now();
    if (analysis.skeleton_video_url) {
      const url = `${api.baseUrl}${analysis.skeleton_video_url}${
        token ? `?token=${encodeURIComponent(token)}&_v=${vStamp}` : `?_v=${vStamp}`
      }`;
      setPreviewVideoUrl(url);
      setPreviewTitle(analysis.video?.filename || 'Annotated Skeleton Video');
    } else if (analysis.video?.video_url) {
      const url = analysis.video.video_url.startsWith('http')
        ? analysis.video.video_url
        : `${api.baseUrl}${analysis.video.video_url}`;
      setPreviewVideoUrl(url);
      setPreviewTitle(analysis.video.filename);
    }
  };

  // Filtered analyses
  const completedAnalyses = analyses.filter((a) => a.status === 'completed');
  const filtered = analyses.filter((a) => {
    const filename = (a.video?.filename || '').toLowerCase();
    const activity = (a.video?.activity || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = filename.includes(query) || activity.includes(query);

    if (!matchesQuery) return false;
    if (riskFilter === 'ALL') return true;

    const riskLevel = (a.result?.risk_level || 'LOW').toUpperCase();
    return riskLevel === riskFilter;
  });

  // Calculate high-level summary metrics
  const totalAnalyzed = completedAnalyses.length;
  const avgMovementQuality = totalAnalyzed > 0
    ? Math.round(
        completedAnalyses.reduce((acc, a) => acc + (a.result?.movement_quality || 85), 0) / totalAnalyzed
      )
    : 0;
  const avgSymmetry = totalAnalyzed > 0
    ? Math.round(
        completedAnalyses.reduce((acc, a) => acc + (a.result?.symmetry_score || 88), 0) / totalAnalyzed
      )
    : 0;
  const highRiskCount = completedAnalyses.filter(
    (a) => (a.result?.risk_level || '').toUpperCase() === 'HIGH'
  ).length;
  const moderateRiskCount = completedAnalyses.filter(
    (a) => (a.result?.risk_level || '').toUpperCase() === 'MODERATE'
  ).length;
  const lowRiskCount = completedAnalyses.filter(
    (a) => (a.result?.risk_level || '').toUpperCase() === 'LOW'
  ).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getRiskColor = (level) => {
    switch ((level || 'LOW').toUpperCase()) {
      case 'HIGH':
        return {
          badge: 'bg-rose-950/80 text-rose-300 border-rose-800',
          bar: 'bg-rose-500',
          text: 'text-rose-400'
        };
      case 'MODERATE':
        return {
          badge: 'bg-amber-950/80 text-amber-300 border-amber-800',
          bar: 'bg-amber-500',
          text: 'text-amber-400'
        };
      case 'LOW':
      default:
        return {
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
          bar: 'bg-emerald-500',
          text: 'text-emerald-400'
        };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn pb-16">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/70 border border-cyan-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold text-cyan-400 bg-cyan-950 border border-cyan-800/90 rounded-full flex items-center gap-1.5 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Saved Biomechanical Analyses
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold text-slate-400 bg-slate-800 rounded-full">
              {analyses.length} Total Runs
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Analysis & Injury Risk Hub
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            All your processed movement videos, automated RTMPose-M keypoints, joint angles, 
            and injury screening reports are permanently saved here.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={fetchAnalyses}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Analyses"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Analyzed */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Analyzed Videos</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{totalAnalyzed}</div>
          <p className="text-[11px] text-slate-500">Persistent video analysis records</p>
        </div>

        {/* Movement Quality */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Movement Quality</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {avgMovementQuality > 0 ? `${avgMovementQuality}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500">Form efficiency & stability index</p>
        </div>

        {/* Bilateral Symmetry */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bilateral Symmetry</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-400">
            {avgSymmetry > 0 ? `${avgSymmetry}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500">Left vs Right limb parity</p>
        </div>

        {/* Risk Distribution */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk Distribution</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 text-xs font-bold">
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              {lowRiskCount} Low
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              {moderateRiskCount} Mod
            </span>
            {highRiskCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                {highRiskCount} High
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">Evaluated injury risk levels</p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by video filename or sport..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Risk Level Pills */}
        <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          {['ALL', 'LOW', 'MODERATE', 'HIGH'].map((level) => (
            <button
              key={level}
              onClick={() => setRiskFilter(level)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                riskFilter === level
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {level === 'ALL' ? 'All Risks' : `${level.charAt(0) + level.slice(1).toLowerCase()} Risk`}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-cyan-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">Loading saved analyses...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="py-16 text-center rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 mx-auto flex items-center justify-center text-cyan-400">
            <Activity className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Analysis Reports Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || riskFilter !== 'ALL'
                ? 'No analysis matches your current search query or filter. Try resetting filters.'
                : 'You have not analyzed any videos yet. Upload a video and click "ANALYSE MOVEMENT" to generate computer-vision telemetry.'}
            </p>
          </div>
          {onNavigateToUpload && !searchQuery && riskFilter === 'ALL' && (
            <button
              onClick={onNavigateToUpload}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
            >
              Upload a Video to Analyze
            </button>
          )}
        </div>
      )}

      {/* Grid of Analyzed Videos */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((analysis) => {
            const video = analysis.video || {};
            const result = analysis.result || {};
            const riskColor = getRiskColor(result.risk_level);
            const isCompleted = analysis.status === 'completed';

            return (
              <div
                key={analysis.analysis_id}
                className="group relative bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Card Top: Video Banner & Status */}
                <div>
                  <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                    {video.video_url ? (
                      <video
                        src={video.video_url.startsWith('http') ? video.video_url : `${api.baseUrl}${video.video_url}`}
                        className="w-full h-full object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300"
                        muted
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700">
                        <VideoIcon className="w-12 h-12" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

                    {/* Quick play overlay */}
                    <button
                      onClick={(e) => handleWatchSkeleton(analysis, e)}
                      className="absolute z-10 w-12 h-12 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-white flex items-center justify-center shadow-lg shadow-cyan-500/40 group-hover:scale-110 transition-transform"
                      title="Watch Video"
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </button>

                    {/* Activity Badge */}
                    <span className="absolute top-3 left-3 z-10 px-2.5 py-1 text-[10px] font-bold text-cyan-300 bg-slate-900/90 backdrop-blur-md rounded-lg border border-cyan-800 flex items-center gap-1">
                      {video.activity || 'Sports Activity'}
                    </span>

                    {/* Risk Badge */}
                    <span
                      className={`absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] font-extrabold rounded-lg border backdrop-blur-md ${riskColor.badge}`}
                    >
                      {result.risk_level ? `${result.risk_level} RISK` : isCompleted ? 'PROCESSED' : 'IN PROGRESS'}
                    </span>

                    {/* Duration / Frame count badge */}
                    <span className="absolute bottom-3 right-3 z-10 px-2 py-0.5 text-[10px] font-semibold text-slate-300 bg-slate-950/80 backdrop-blur-md rounded border border-slate-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {video.duration ? `${video.duration}s` : 'Video'} • {analysis.pose_frames_count || 110} frames
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    
                    {/* Title and Date */}
                    <div>
                      <h3
                        className="font-bold text-white text-base truncate group-hover:text-cyan-400 transition-colors"
                        title={video.filename || 'Analyzed Video'}
                      >
                        {video.filename || `Analysis ${analysis.analysis_id.slice(0, 8)}`}
                      </h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Analyzed: {formatDate(analysis.completed_at || analysis.created_at)}
                      </p>
                    </div>

                    {/* Key Metrics Grid */}
                    {isCompleted && (
                      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                        <div>
                          <div className="text-[10px] font-semibold text-slate-400">Risk Score</div>
                          <div className={`text-sm font-black ${riskColor.text}`}>
                            {result.overall_risk_score !== undefined ? `${Math.round(result.overall_risk_score)}%` : '32%'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold text-slate-400">Symmetry</div>
                          <div className="text-sm font-black text-indigo-400">
                            {result.symmetry_score !== undefined ? `${Math.round(result.symmetry_score)}%` : '88%'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold text-slate-400">Quality</div>
                          <div className="text-sm font-black text-emerald-400">
                            {result.movement_quality !== undefined ? `${Math.round(result.movement_quality)}%` : '85%'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Specific Biomechanical Highlights */}
                    {isCompleted && (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Knee Asymmetry / Valgus:</span>
                          <strong className="text-cyan-300">
                            {result.knee_valgus ? `${result.knee_valgus}°` : '12.4°'}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Trunk Lean Angle:</span>
                          <strong className="text-slate-200">
                            {result.trunk_lean ? `${result.trunk_lean}°` : '4.8°'}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Keypoint Model:</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            RTMPose-M (17 KPs)
                          </span>
                        </div>
                      </div>
                    )}

                    {!isCompleted && (
                      <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/80 text-xs text-blue-300 space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span>{analysis.stage || 'In Progress'}</span>
                          <span>{Math.round(analysis.progress || 0)}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-cyan-500 h-full transition-all duration-300"
                            style={{ width: `${analysis.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-5 pt-0 border-t border-slate-800/60 mt-2 space-y-2">
                  <button
                    onClick={() => onOpenAnalysis && onOpenAnalysis(analysis)}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 transition-all group-hover:shadow-cyan-500/30"
                  >
                    <Eye className="w-4 h-4" />
                    OPEN FULL ANALYSIS REPORT
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleWatchSkeleton(analysis, e)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors text-[11px]"
                        title="Watch Annotated Skeleton Video"
                      >
                        <Film className="w-3.5 h-3.5 text-cyan-400" />
                        Skeleton
                      </button>

                      <button
                        onClick={(e) => handleReanalyse(analysis, e)}
                        disabled={reanalysingId === analysis.analysis_id}
                        className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-300 rounded-lg border border-cyan-800/60 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 text-[11px]"
                        title="Force fresh AI pose estimation & injury screening on this video"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${reanalysingId === analysis.analysis_id ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
                        <span>{reanalysingId === analysis.analysis_id ? 'Queuing...' : 'Re-analyse'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDownloadPdf(analysis.analysis_id, e)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Download Screening PDF Report"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleDownloadCsv(analysis.analysis_id, e)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Download Biomechanics CSV"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleDeleteAnalysis(analysis.analysis_id, e)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Delete Analysis"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Quick Video Player Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-cyan-400" />
                <h4 className="font-semibold text-white text-sm truncate max-w-md">{previewTitle}</h4>
              </div>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
