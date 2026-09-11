import React, { useRef, useEffect, useState } from 'react';
import { Film, Play, Pause, RotateCcw, AlertTriangle, Maximize, Volume2, VolumeX, Gauge } from 'lucide-react';

export const PoseVideoPlayer = ({ videoUrl, onTimeUpdate, seekToTime }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize external seek command from time-series chart clicks
  useEffect(() => {
    if (videoRef.current && typeof seekToTime === 'number' && !isNaN(seekToTime)) {
      videoRef.current.currentTime = seekToTime;
      setCurrentTime(seekToTime);
    }
  }, [seekToTime]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      if (onTimeUpdate) {
        onTimeUpdate(cur);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setIsLoading(false);
      setHasError(false);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback failed:', err);
      });
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    if (onTimeUpdate) {
      onTimeUpdate(newTime);
    }
  };

  const handleReset = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    if (onTimeUpdate) {
      onTimeUpdate(0);
    }
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 1.0, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const handleToggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      }
    }
  };

  const handleError = (e) => {
    console.error('Annotated video playback error:', e);
    setIsLoading(false);
    setHasError(true);
    setErrorMessage('Browser could not decode or access this video file. Ensure H.264 transcode is complete.');
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00.0';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-white">Annotated Skeleton Video</h4>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
            H.264 / 1080p
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSpeedChange}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg transition-colors border border-slate-700"
            title="Toggle playback speed"
          >
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span>{playbackSpeed}x</span>
          </button>
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg transition-colors border border-slate-700"
          >
            <RotateCcw className="w-3 h-3" />
            Replay
          </button>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 group">
        {videoUrl && !hasError ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => { setIsLoading(false); setIsPlaying(true); }}
              onPause={() => setIsPlaying(false)}
              onError={handleError}
              className="w-full h-full object-contain cursor-pointer"
              onClick={handlePlayPause}
            />

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2 text-cyan-400">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-slate-300">Loading annotated video...</span>
                </div>
              </div>
            )}
          </>
        ) : hasError ? (
          <div className="text-center p-6 space-y-3 max-w-sm text-slate-400">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-400" />
            <p className="text-xs font-semibold text-slate-200">Playback Error</p>
            <p className="text-xs text-slate-400">{errorMessage}</p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          <div className="text-center p-6 space-y-2 text-slate-500">
            <Film className="w-10 h-10 mx-auto animate-pulse text-cyan-500" />
            <p className="text-xs">Skeleton video rendering in progress...</p>
          </div>
        )}
      </div>

      {/* Video Scrub & Controls Bar */}
      {videoUrl && !hasError && (
        <div className="space-y-2 pt-1">
          {/* Progress / Scrub bar */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.04"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-bold transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (videoRef.current) videoRef.current.muted = !isMuted;
                }}
                className="p-1.5 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>

              <span className="font-mono text-[11px] text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFullscreen}
                className="p-1.5 hover:text-white transition-colors"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
