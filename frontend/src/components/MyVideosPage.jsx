import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { VideoCard } from './VideoCard';
import { Video, RefreshCw, UploadCloud, Film } from 'lucide-react';

export const MyVideosPage = ({ onNavigateToUpload }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMyVideos();
  }, []);

  const fetchMyVideos = async () => {
    setLoading(true);
    setError('');
    try {
      // Strictly fetch only the currently logged-in user's videos
      const data = await api.get('/api/videos/my-videos');
      setVideos(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch your videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoDeleted = (deletedId) => {
    setVideos((prev) => prev.filter((v) => v.video_id !== deletedId));
  };

  // Filter personal videos by search query
  const filteredVideos = videos.filter((v) =>
    v.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.activity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold text-cyan-400 bg-cyan-950 border border-cyan-800/80 rounded-full flex items-center gap-1">
              <Film className="w-3 h-3" />
              Personal Library
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">My Uploaded Videos</h2>
          <p className="text-sm text-slate-400">
            View, play, manage, and watch videos uploaded strictly by your account.
          </p>
        </div>

        <button
          onClick={onNavigateToUpload}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all whitespace-nowrap self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          Upload New Video
        </button>
      </div>

      {/* Filter and Refresh */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search my videos by filename or activity..."
          className="w-full sm:w-80 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />

        <button
          onClick={fetchMyVideos}
          title="Refresh my videos"
          className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Personal Video Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-slate-400">Loading your personal videos...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-center space-y-3">
          <p>{error}</p>
          <button
            onClick={fetchMyVideos}
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
            <h3 className="text-lg font-semibold text-white">No Personal Videos Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              You haven't uploaded any videos to your account yet.
            </p>
          </div>
          <button
            onClick={onNavigateToUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Your First Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
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
  );
};
