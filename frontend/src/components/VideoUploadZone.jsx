import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { AIProcessingLoader } from './ui/AIProcessingLoader';
import { 
  UploadCloud, Film, Zap, Clock, Activity, AlertCircle, 
  ArrowRight, ShieldCheck, CheckCircle2, Sparkles, Cpu, Layers
} from 'lucide-react';

const ACTIVITIES = [
  'Running / Sprinting',
  'Jumping & Landing',
  'Squatting & Knee Flexion',
  'Cutting & Direction Changes',
  'Overhead Throwing',
  'Balance & Posture',
  'General Athletic Movement'
];

export const VideoUploadZone = ({ onUploadSuccess, onViewMyVideos }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    const validExts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
    
    if (!validExts.includes(ext)) {
      setError(`Unsupported format (.${ext}). Supported: MP4, MOV, AVI, WEBM, MKV.`);
      return;
    }

    setError('');
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('activity', activity);

      // Phase 1: Uploading Video Data
      const result = await api.uploadVideo(formData, (pct) => setProgress(pct));

      // Phase 2: Processing Motion & Pose Extraction
      setUploading(false);
      setProcessing(true);

      // Trigger automatic analysis job if not already initiated
      try {
        if (result && result.video_id) {
          await api.post(`/api/analysis/videos/${result.video_id}/analyse`).catch(() => {});
        }
      } catch (e) {
        console.warn('Auto analysis kick warning:', e);
      }

      setProcessing(false);
      setFile(null);
      setPreviewUrl('');
      if (onUploadSuccess) onUploadSuccess(result);
    } catch (err) {
      setError(err.message || 'Video upload or pose extraction failed');
      setUploading(false);
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12">
        <AIProcessingLoader currentStageText="PROCESSING MOTION: Extracting 17 COCO Keypoints..." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn font-sans pb-12">
      
      {/* Studio Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Cpu className="w-3.5 h-3.5" />
            AI COMPUTER VISION PIPELINE
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            MOVEMENT ANALYSIS STUDIO
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            High-throughput pose estimation, 17-point spatial kinematics, and injury risk profiling.
          </p>
        </div>

        <button
          onClick={onViewMyVideos}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono font-bold border border-slate-700/80 transition-all self-start md:self-auto cursor-pointer"
        >
          <Film className="w-4 h-4 text-cyan-400" />
          Browse Video Library
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* CENTRAL 3D SCANNING PORTAL DRAG ZONE */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_30px_rgba(6,182,212,0.3)] scale-[1.01]'
            : file
            ? 'border-cyan-500/50 bg-slate-950/90'
            : 'border-slate-800 hover:border-cyan-500/50 bg-slate-950/60 hover:bg-slate-950/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
        />

        {/* Ambient Portal Scanning Ring Graphics */}
        <div className="absolute inset-0 tech-grid-pattern opacity-30 pointer-events-none" />

        {!file ? (
          <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
            
            {/* Animated Scanning Portal Ring */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Outer pulsing scanning ring */}
              <div className={`absolute inset-0 rounded-full border-2 border-dashed ${isDragOver ? 'border-cyan-400 animate-spin' : 'border-cyan-500/30 animate-spin'}`} style={{ animationDuration: '10s' }} />
              {/* Middle glowing aura */}
              <div className="absolute inset-3 rounded-full bg-cyan-500/10 blur-md pointer-events-none" />
              {/* Center icon */}
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-950">
                <UploadCloud className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-mono font-black text-white tracking-wider uppercase">
                {isDragOver ? 'SCAN READY' : 'DROP ATHLETE VIDEO'}
              </h3>
              <p className="text-xs font-mono text-slate-400 max-w-sm">
                Supported formats: <strong className="text-cyan-400">MP4, MOV, AVI, WEBM, MKV</strong>
              </p>
            </div>

            <div className="pt-2">
              <span className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-950 transition-all">
                Browse Files from Device
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-500 pt-2">
              Optimal AI accuracy: 60 to 120 FPS high-speed motion capture clips
            </div>
          </div>
        ) : (
          <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              
              {/* Local Video Preview */}
              <div className="w-full md:w-1/2 aspect-video rounded-2xl bg-black border border-slate-800 overflow-hidden relative shadow-2xl">
                <video src={previewUrl} controls className="w-full h-full object-contain" />
              </div>

              {/* Metadata Form & Activity Tag */}
              <div className="w-full md:w-1/2 space-y-4 font-mono">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Selected Movement File
                  </label>
                  <div className="text-xs font-bold text-white truncate bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Movement Activity Category
                  </label>
                  <select
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {ACTIVITIES.map((act) => (
                      <option key={act} value={act} className="bg-slate-950">
                        {act}
                      </option>
                    ))}
                  </select>
                </div>

                {uploading && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span className="text-cyan-400 font-bold">UPLOADING MOVEMENT DATA</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-3">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>START POSE ANALYSIS</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl('');
                    }}
                    disabled={uploading}
                    className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs border border-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
