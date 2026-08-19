import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { UploadCloud, Film, Play, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';

const ACTIVITIES = [
  'Running',
  'Sprinting',
  'Jumping',
  'Squatting',
  'Landing',
  'Throwing',
  'Cutting Movements',
  'Sport-Specific Drills'
];

const Upload = () => {
  const [file, setFile] = useState(null);
  const [activity, setActivity] = useState(ACTIVITIES[3]); // Default to Squatting
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setError('');
    setSuccess('');
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file extension
      const allowedExts = ['.mp4', '.mov', '.avi', '.mkv'];
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        setError(`Invalid format. Allowed formats: ${allowedExts.join(', ')}`);
        setFile(null);
        return;
      }
      
      // Limit to 50MB for capstone project purposes
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File is too large. Max size allowed is 50MB.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a video file to upload.');
      return;
    }
    
    setError('');
    setSuccess('');
    setUploading(true);
    setProgress(15);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('activity', activity);

    try {
      // Setup progress animation steps since axios progress events can be instant locally
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 85 ? prev + 10 : prev));
      }, 150);

      await api.post('/video/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(interval);
      setProgress(100);
      setSuccess('Video uploaded and stored securely!');
      setFile(null);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(getErrorMessage(err, 'An error occurred during video upload. Please complete your athlete profile first.'));
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#070b13] py-12 px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-2xl mx-auto relative z-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-6 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="bg-[#0e1726]/80 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
            <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/20 text-brand-400">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Upload Assessment Video</h2>
              <p className="text-sm text-gray-400">Upload video to run pose estimation and biomechanical analysis</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-emerald-200 text-sm flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Movement Activity</label>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm appearance-none cursor-pointer"
              >
                {ACTIVITIES.map((act) => (
                  <option key={act} value={act} className="bg-[#0e1726] text-white">
                    {act}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Upload File</label>
              <div className="border-2 border-dashed border-white/10 rounded-2xl hover:border-brand-500/50 transition-all duration-300 p-8 text-center bg-[#152033]/20 relative">
                <input
                  type="file"
                  accept=".mp4,.mov,.avi,.mkv"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-4 bg-[#1e2d4a]/50 rounded-full border border-white/5 text-gray-400">
                    <Film className="h-8 w-8 text-brand-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Click to upload</span> or drag and drop
                  </div>
                  <div className="text-xs text-gray-500">
                    MP4, MOV, AVI or MKV (Max. 50MB)
                  </div>
                </div>
              </div>
            </div>

            {file && (
              <div className="p-4 bg-[#152033]/50 border border-white/5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Play className="h-5 w-5 text-brand-400" />
                  <div className="text-sm">
                    <div className="font-semibold text-white truncate max-w-md">{file.name}</div>
                    <div className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-gray-400">
                  <span>Uploading video stream...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-[#152033]/50 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-brand-600 to-brand-400 h-full transition-all duration-350"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UploadCloud className="h-5 w-5" />
              {uploading ? 'Processing Video File...' : 'Upload Video File'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Upload;
