import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { VideoCard } from './VideoCard';
import { AnalysisDashboard } from './analysis/AnalysisDashboard';
import { LoadingState } from './ui/LoadingState';
import { EmptyState } from './ui/EmptyState';
import { Video, RefreshCw, UploadCloud, Film, Activity, Search, Sparkles, Layers } from 'lucide-react';

export const MyVideosPage = ({ onNavigateToUpload }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Analysis State
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [startingAnalysisId, setStartingAnalysisId] = useState(null);

  useEffect(() => {
    fetchMyVideos();
  }, []);

  const fetchMyVideos = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/videos/my-videos');
      setVideos(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch personal video sequences');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoDeleted = (deletedId) => {
    setVideos((prev) => prev.filter((v) => v.video_id !== deletedId));
  };

  const handleAnalyseMovement = async (video, existingAnalysisId, forceRerun = false) => {
    if (existingAnalysisId && !forceRerun) {
      setActiveAnalysis({
        analysisId: existingAnalysisId,
        video: video
      });
      return;
    }

    setStartingAnalysisId(video.video_id);
    try {
      const response = await api.post(`/api/analysis/videos/${video.video_id}/analyse`);
      if (response && response.analysis_id) {
        setActiveAnalysis({
          analysisId: response.analysis_id,
          video: video
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to start movement analysis job.');
    } finally {
      setStartingAnalysisId(null);
    }
  };

  const filteredVideos = (videos || []).filter((v) =>
    (v?.filename || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (v?.activity || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  if (activeAnalysis) {
    return (
      <AnalysisDashboard
        analysisId={activeAnalysis.analysisId}
        video={activeAnalysis.video}
        onBack={() => {
          setActiveAnalysis(null);
          fetchMyVideos();
        }}
      />
    );
  }

  const analyzedCount = videos.filter(
    (v) => v.latest_analysis_status === 'completed' || v.analysis_status === 'COMPLETE'
  ).length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn font-sans pb-12">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
              <Film className="w-3.5 h-3.5" />
              PRIVATE ATHLETE VAULT
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Movement Video Library
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Browse, play, and run computer-vision 3D pose extraction on your athletic clips.
          </p>
        </div>

        <button
          onClick={onNavigateToUpload}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          UPLOAD NEW CLIP
        </button>
      </div>

      {/* Quick Library Telemetry Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-slate-500 uppercase text-[10px] block">TOTAL CLIPS</span>
          <span className="text-xl font-black text-white">{videos.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-slate-500 uppercase text-[10px] block">ANALYSIS READY</span>
          <span className="text-xl font-black text-emerald-400">{analyzedCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-slate-500 uppercase text-[10px] block">3D SKELETON RECON</span>
          <span className="text-xl font-black text-cyan-400">{analyzedCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-slate-500 uppercase text-[10px] block">DATABASE PERSISTENCE</span>
          <span className="text-xl font-black text-indigo-400">SQLAlchemy</span>
        </div>
      </div>

      {/* Filter and Refresh */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename or movement activity..."
            className="w-full bg-slate-950 border border-slate-800/90 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          onClick={fetchMyVideos}
          className="p-2.5 px-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors flex items-center gap-2 text-xs font-bold self-end sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH VAULT</span>
        </button>
      </div>

      {/* Video Grid */}
      {loading ? (
        <LoadingState message="ACCESSING ATHLETE VAULT..." subtext="Retrieving personal video files and analysis job IDs" />
      ) : filteredVideos.length === 0 ? (
        <EmptyState
          icon={Film}
          title="NO MOVEMENT SEQUENCES FOUND"
          description="You have not uploaded any athlete movement videos to your account vault yet."
          actionLabel="Upload Your First Movement Clip"
          onAction={onNavigateToUpload}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.video_id}
              video={video}
              isPersonal={true}
              onDeleteSuccess={handleVideoDeleted}
              onAnalyseMovement={handleAnalyseMovement}
            />
          ))}
        </div>
      )}

    </div>
  );
};
