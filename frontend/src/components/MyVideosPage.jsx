import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { VideoCard } from './VideoCard';
import { Video, Globe, Search, Filter, RefreshCw, UploadCloud, Film, Layers, Sparkles } from 'lucide-react';

export const MyVideosPage = ({ initialTab = 'my-videos', onNavigateToUpload }) => {
  const [viewMode, setViewMode] = useState(initialTab); // 'my-videos' | 'all-videos'
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('ALL');

  useEffect(() => {
    fetchVideos();
  }, [viewMode]);

  const fetchVideos = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = viewMode === 'my-videos' ? '/api/videos/my-videos' : '/api/videos/all';
      const data = await api.get(endpoint);
      setVideos(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoDeleted = (deletedId) => {
    setVideos((prev) => prev.filter((v) => v.video_id !== deletedId));
  };

  // Filter logic
  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      v.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.user_name && v.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      v.activity.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesActivity =
      selectedActivity === 'ALL' || v.activity.toLowerCase().includes(selectedActivity.toLowerCase());

    return matchesSearch && matchesActivity;
  });

  const activityOptions = ['ALL', 'Running', 'Jumping', 'Squatting', 'Cutting', 'Throwing', 'Balance'];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Header & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold text-cyan-400 bg-cyan-950 border border-cyan-800/80 rounded-full flex items-center gap-1">
              <Film className="w-3 h-3" />
              Central Media Storage
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {viewMode === 'my-videos' ? 'My Uploaded Videos' : 'All Platform Videos Library'}
          </h2>
          <p className="text-sm text-slate-400">
            {viewMode === 'my-videos'
              ? 'View, play, manage, and inspect metadata for your uploaded movement videos.'
              : 'Explore and watch all videos uploaded by athletes across the platform.'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setViewMode('my-videos')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'my-videos'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            My Videos ({viewMode === 'my-videos' ? videos.length : '—'})
          </button>

          <button
            onClick={() => setViewMode('all-videos')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'all-videos'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            Sea All Other Videos ({viewMode === 'all-videos' ? videos.length : '—'})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename, athlete or activity..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Activity Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          {activityOptions.map((act) => (
            <button
              key={act}
              onClick={() => setSelectedActivity(act)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap transition-all ${
                selectedActivity === act
                  ? 'bg-slate-800 border-cyan-500 text-cyan-400 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {act}
            </button>
          ))}

          <button
            onClick={fetchVideos}
            title="Refresh videos"
            className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-slate-400">Loading video library...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-center space-y-3">
          <p>{error}</p>
          <button
            onClick={fetchVideos}
            className="px-4 py-2 bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl"
          >
            Try Again
          </button>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
            <Film className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">No Videos Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {viewMode === 'my-videos'
                ? "You haven't uploaded any movement videos yet."
                : 'No videos match your active filter criteria.'}
            </p>
          </div>
          {viewMode === 'my-videos' && (
            <button
              onClick={onNavigateToUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Your First Video
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.video_id}
              video={video}
              isPersonal={viewMode === 'my-videos'}
              onDeleteSuccess={handleVideoDeleted}
            />
          ))}
        </div>
      )}

    </div>
  );
};
