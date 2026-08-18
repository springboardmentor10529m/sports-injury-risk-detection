import React, { useState } from 'react';
import { api } from '../api/client';
import { Play, Trash2, Calendar, Clock, Maximize2, Zap, User, Tag, Sparkles, X } from 'lucide-react';

export const VideoCard = ({ video, isPersonal, onDeleteSuccess }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fullVideoUrl = video.video_url.startsWith('http')
    ? video.video_url
    : `${api.baseUrl}${video.video_url}`;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/videos/${video.video_id}`);
      if (onDeleteSuccess) onDeleteSuccess(video.video_id);
    } catch (err) {
      alert(err.message || 'Failed to delete video');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl overflow-hidden transition-all hover:shadow-xl group flex flex-col">
        
        {/* Video Thumbnail Container with Play Overlay */}
        <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
          <video
            src={fullVideoUrl}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
            muted
            onLoadedData={() => {}}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

          {/* Play Button overlay */}
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute z-10 w-12 h-12 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-lg shadow-cyan-500/40 group-hover:scale-110 transition-transform"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>

          {/* Activity Tag */}
          <span className="absolute top-3 left-3 z-10 px-2.5 py-1 text-[11px] font-bold text-white bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700/80 flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-cyan-400" />
            {video.activity}
          </span>

          {/* Duration Badge */}
          <span className="absolute bottom-3 right-3 z-10 px-2 py-0.5 text-xs font-semibold text-slate-200 bg-slate-950/90 backdrop-blur-md rounded border border-slate-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {video.duration}s
          </span>
        </div>

        {/* Video Info Section */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-white text-base truncate" title={video.filename}>
                {video.filename}
              </h3>
              {isPersonal && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Delete Video"
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {!isPersonal && video.user_name && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Uploaded by <strong className="text-slate-200">{video.user_name}</strong></span>
              </div>
            )}

            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 flex items-center gap-1">
                <Maximize2 className="w-3 h-3 text-cyan-400" />
                {video.resolution}
              </span>
              <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                {video.fps} FPS
              </span>
              <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-400" />
                {formatDate(video.uploaded_at)}
              </span>
            </div>
          </div>

          {/* Processing Status Banner */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                {video.processing_status}
              </span>
            </div>
            
            <button
              onClick={() => setIsPlaying(true)}
              className="text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              Play Video &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Video Modal Player */}
      {isPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-cyan-400" />
                <h4 className="font-semibold text-white truncate max-w-md">{video.filename}</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold text-cyan-300 bg-cyan-950 rounded border border-cyan-800">
                  {video.activity}
                </span>
              </div>
              <button
                onClick={() => setIsPlaying(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center">
              <video src={fullVideoUrl} controls autoPlay className="w-full h-full object-contain" />
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span>Resolution: <strong className="text-white">{video.resolution}</strong></span>
                <span>FPS: <strong className="text-white">{video.fps} FPS</strong></span>
                <span>Duration: <strong className="text-white">{video.duration}s</strong></span>
                <span>Uploaded: <strong className="text-white">{formatDate(video.uploaded_at)}</strong></span>
              </div>


            </div>
          </div>
        </div>
      )}
    </>
  );
};
