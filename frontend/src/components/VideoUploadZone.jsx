import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { UploadCloud, CheckCircle2, Film, Zap, Clock, Maximize2, Activity, Play, AlertCircle, ArrowRight } from 'lucide-react';

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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [lastUploadedVideo, setLastUploadedVideo] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    const validExts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
    
    if (!validExts.includes(ext)) {
      setError(`Unsupported file type (.${ext}). Please upload MP4, MOV, AVI, or WebM video.`);
      return;
    }

    setError('');
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setLastUploadedVideo(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
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

      const result = await api.uploadVideo(formData, (pct) => setProgress(pct));
      setLastUploadedVideo(result);
      setFile(null);
      setPreviewUrl('');
      if (onUploadSuccess) onUploadSuccess(result);
    } catch (err) {
      setError(err.message || 'Video upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Upload Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5" />
              Automated OpenCV Video Parsing
            </div>
            <h2 className="text-2xl font-bold text-white">Video Upload Studio</h2>
            <p className="text-sm text-slate-400 mt-1">
              Upload athlete movement videos for instant metadata extraction & server storage.
            </p>
          </div>

          <button
            onClick={onViewMyVideos}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold border border-slate-700 transition-all self-start md:self-auto"
          >
            <Film className="w-4 h-4 text-cyan-400" />
            Go to My Videos
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Upload Drag Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          file
            ? 'border-cyan-500/50 bg-slate-900/90'
            : 'border-slate-800 hover:border-cyan-500/50 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
        />

        {!file ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-950/40">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Drag & Drop your video file here
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Supports MP4, MOV, AVI, WebM (Up to 500MB). High-fps videos (60-120 FPS) yield optimal AI pose tracking accuracy.
            </p>
            <span className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-md">
              Browse Computer File
            </span>
          </div>
        ) : (
          <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              
              {/* Local Video Preview */}
              <div className="w-full md:w-1/2 aspect-video rounded-xl bg-black border border-slate-800 overflow-hidden relative group">
                <video src={previewUrl} controls className="w-full h-full object-contain" />
              </div>

              {/* Metadata Form & Activity Tag */}
              <div className="w-full md:w-1/2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Selected File</label>
                  <div className="text-sm font-semibold text-white truncate bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Movement Activity Category</label>
                  <select
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {ACTIVITIES.map((act) => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                  </select>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Uploading & Processing Video...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        Start Upload & Store Video
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl('');
                    }}
                    disabled={uploading}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Success & OpenCV Extracted Metadata Display Card */}
      {lastUploadedVideo && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950/60 border border-cyan-500/40 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-700 flex items-center justify-center text-teal-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Video Uploaded & Analyzed</h3>
                <p className="text-xs text-teal-400 font-medium">Stored in Server • OpenCV Metadata Extracted</p>
              </div>
            </div>

            <button
              onClick={onViewMyVideos}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
            >
              View in My Videos
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                Resolution
              </div>
              <div className="text-base font-bold text-white">{lastUploadedVideo.resolution}</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Frame Rate
              </div>
              <div className="text-base font-bold text-white">{lastUploadedVideo.fps} FPS</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Duration
              </div>
              <div className="text-base font-bold text-white">{lastUploadedVideo.duration}s</div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                Status
              </div>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-teal-300 bg-teal-950 rounded border border-teal-800">
                {lastUploadedVideo.processing_status}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
