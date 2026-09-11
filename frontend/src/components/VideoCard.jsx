import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { 
  Play, Trash2, Calendar, Clock, Maximize2, Zap, 
  Tag, Activity, CheckCircle2, Eye, RotateCw, AlertTriangle, Film
} from 'lucide-react';

export const VideoCard = ({ video, isPersonal, onDeleteSuccess, onAnalyseMovement }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(800px) rotateX(0deg) rotateY(0deg)' });

  if (!video) return null;

  const fullVideoUrl = video.video_url
    ? video.video_url.startsWith('http')
      ? video.video_url
      : `${api.baseUrl}${video.video_url}`
    : '';

  // 22. Subtle 3D tilt effect: max ±3 degrees
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((centerY - y) / centerY) * 3; // ±3 deg
    const rotateY = ((x - centerX) / centerX) * 3;

    setTiltStyle({
      transform: `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg)',
      transition: 'transform 0.4s ease-out'
    });
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this movement video sequence?')) return;
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

  const hasAnalysis = video.latest_analysis_status === 'completed' || video.analysis_status === 'COMPLETE';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className="bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 rounded-3xl overflow-hidden shadow-xl transition-all duration-200 group flex flex-col font-sans"
    >
      {/* Video Thumbnail Container with Hover Scanning Animation */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        <video
          src={fullVideoUrl}
          className="w-full h-full object-cover opacity-75 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500"
          muted
          playsInline
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

        {/* Scanning beam overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent h-10 -translate-y-full group-hover:translate-y-[400%] transition-all duration-1000 pointer-events-none" />

        {/* Activity Tag */}
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 text-[10px] font-mono font-bold text-white bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700/80 flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-cyan-400" />
          {video.activity || 'Movement'}
        </span>

        {/* Analysis Status Badge */}
        {hasAnalysis && (
          <span className="absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 backdrop-blur-md rounded-lg border border-emerald-800/80 flex items-center gap-1 shadow-md">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Analysis Ready
          </span>
        )}

        {/* Play Icon / Overlay Trigger */}
        <button
          onClick={() => {
            if (onAnalyseMovement) {
              onAnalyseMovement(video, video.latest_analysis_id);
            } else {
              setIsPlaying(true);
            }
          }}
          className="absolute z-10 w-12 h-12 rounded-2xl bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current ml-0.5" />
        </button>

        {/* Duration Badge */}
        <span className="absolute bottom-3 right-3 z-10 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-200 bg-slate-950/90 backdrop-blur-md rounded border border-slate-800 flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          {video.duration || 0}s
        </span>
      </div>

      {/* Video Technical Telemetry & Metadata Section */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4 font-mono">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-white text-sm truncate" title={video.filename}>
              {video.filename}
            </h3>
            {isPersonal && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Delete Video"
                className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
            <div>
              <span className="text-slate-600 block text-[9px] uppercase">Sampling</span>
              <span className="text-slate-300 font-bold">{video.fps || 30} FPS</span>
            </div>
            <div>
              <span className="text-slate-600 block text-[9px] uppercase">Format</span>
              <span className="text-cyan-400 font-bold">1080p HD</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {hasAnalysis ? (
            <button
              onClick={() => onAnalyseMovement && onAnalyseMovement(video, video.latest_analysis_id)}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-300" />
              <span>OPEN 3D ANALYSIS LAB</span>
            </button>
          ) : (
            <button
              onClick={() => onAnalyseMovement && onAnalyseMovement(video, null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-white border border-cyan-500/30 font-mono font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>RUN AI POSE EXTRACTION</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
