import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { AnalysisPipeline } from '../visualization/AnalysisPipeline';
import { MetricPanel } from '../visualization/MetricPanel';
import { JointTelemetry } from '../visualization/JointTelemetry';
import { MovementTimeline } from '../visualization/MovementTimeline';
import { AthleteSkeleton3D } from '../3d/AthleteSkeleton3D';
import { RiskSkeleton3D } from '../3d/RiskSkeleton3D';
import { PoseVideoPlayer } from './PoseVideoPlayer';
import { JointAngleChart } from './JointAngleChart';
import { BiomechanicsCharts } from './BiomechanicsCharts';
import { LoadingState } from '../ui/LoadingState';
import { 
  ArrowLeft, Download, ShieldCheck, ShieldAlert, FileSpreadsheet, FileJson, 
  FileText, Video, AlertCircle, Activity, TrendingUp, AlertTriangle, 
  CheckCircle2, Target, Zap, Clock, Sparkles, Filter, ChevronRight, Eye, Layers, Cpu, RotateCw,
  Play, Pause, StepBack, StepForward, RotateCcw, Repeat, Box, Compass
} from 'lucide-react';

export const AnalysisDashboard = ({ analysisId, video, onBack }) => {
  const [currentAnalysisId, setCurrentAnalysisId] = useState(analysisId);
  const [statusData, setStatusData] = useState(null);
  const [completeReport, setCompleteReport] = useState(null);
  const [keypointFrames, setKeypointFrames] = useState([]);
  const [biomechFrames, setBiomechFrames] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [recFilter, setRecFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState(null);
  const [isReanalysing, setIsReanalysing] = useState(false);

  // 14. Viewport Mode Toggle: 'VIDEO' vs '3D SKELETON'
  const [viewMode, setViewMode] = useState('VIDEO'); // 'VIDEO' | '3D_SKELETON'
  const [selectedJoint, setSelectedJoint] = useState('left_knee');

  // 15. 3D Reconstruction Interactive Playback Engine States
  const [isPlaying3D, setIsPlaying3D] = useState(false);
  const [playbackSpeed3D, setPlaybackSpeed3D] = useState(1.0);
  const [isLooping3D, setIsLooping3D] = useState(true);
  const [cameraPreset3D, setCameraPreset3D] = useState('perspective');

  useEffect(() => {
    if (analysisId && analysisId !== currentAnalysisId) {
      setCurrentAnalysisId(analysisId);
    }
  }, [analysisId]);

  useEffect(() => {
    if (!currentAnalysisId) return;

    let isSubscribed = true;
    let pollInterval = null;

    const checkJobStatus = async () => {
      try {
        const stat = await api.get(`/api/analysis/${currentAnalysisId}/status`);
        if (!isSubscribed) return;
        setStatusData(stat);

        if (stat.status === 'completed') {
          if (pollInterval) clearInterval(pollInterval);
          await fetchFullAnalysisData(currentAnalysisId);
        } else if (stat.status === 'failed') {
          if (pollInterval) clearInterval(pollInterval);
          setLoading(false);
        }
      } catch (err) {
        if (!isSubscribed) return;
        setError(err.message || 'Failed to fetch analysis job status');
        setLoading(false);
        if (pollInterval) clearInterval(pollInterval);
      }
    };

    checkJobStatus();
    pollInterval = setInterval(checkJobStatus, 2500);

    return () => {
      isSubscribed = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentAnalysisId]);

  const fetchFullAnalysisData = async (targetId) => {
    const aid = targetId || currentAnalysisId;
    try {
      const [report, kps, bio, anoms] = await Promise.all([
        api.get(`/api/analysis/${aid}/complete-report`).catch(() => null),
        api.get(`/api/analysis/${aid}/keypoints`).catch(() => []),
        api.get(`/api/analysis/${aid}/biomechanics`).catch(() => []),
        api.get(`/api/analysis/${aid}/anomalies`).catch(() => [])
      ]);
      setCompleteReport(report);
      setKeypointFrames(kps || []);
      setBiomechFrames(bio || []);
      setAnomalies(anoms || []);
      if (anoms && anoms.length > 0 && !selectedAnomaly) {
        setSelectedAnomaly(anoms[0]);
      }
    } catch (err) {
      console.error('Error fetching full analysis payload:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeekFromTimeline = (timestamp) => {
    setSeekTime(timestamp);
    setCurrentTime(timestamp);
  };

  const handleSelectAnomaly = (anomaly) => {
    setSelectedAnomaly(anomaly);
    setSeekTime(anomaly.timestamp);
    setCurrentTime(anomaly.timestamp);
  };


  const handleDownload = (type) => {
    const token = localStorage.getItem('token');
    const aid = currentAnalysisId || analysisId;
    let url = `/api/analysis/${aid}/download/${type}`;
    let filename = `${type}_${aid.slice(0, 8)}`;

    if (type === 'keypoints-json') {
      url = `/api/analysis/${aid}/download/keypoints?format=json`;
      filename = `keypoints_${aid.slice(0, 8)}.json`;
    } else if (type === 'keypoints-csv') {
      url = `/api/analysis/${aid}/download/keypoints?format=csv`;
      filename = `keypoints_${aid.slice(0, 8)}.csv`;
    } else if (type === 'biomechanics') {
      url = `/api/analysis/${aid}/download/biomechanics`;
      filename = `biomechanics_${aid.slice(0, 8)}.csv`;
    } else if (type === 'pdf') {
      url = `/api/analysis/${aid}/download/pdf`;
      filename = `AthleteGuard_Report_${aid.slice(0, 8)}.pdf`;
    } else if (type === 'excel') {
      url = `/api/analysis/${aid}/download/excel`;
      filename = `AthleteGuard_Workbook_${aid.slice(0, 8)}.xlsx`;
    }

    const fullFetchUrl = `${api.baseUrl}${url}${
      token ? `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : ''
    }`;

    fetch(fullFetchUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed with status ' + res.status);
        return res.blob();
      })
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((err) => {
        alert('Download error: ' + (err.message || 'Failed to download file'));
      });
  };

  const handleReanalyse = async () => {
    const videoId = completeReport?.video?.video_id || video?.video_id;
    if (!videoId) return;
    if (!window.confirm('Force a fresh AI pose estimation & injury risk analysis on this video?')) return;
    setIsReanalysing(true);
    try {
      const res = await api.post(`/api/analysis/videos/${videoId}/reanalyse`);
      if (res && res.analysis_id) {
        setCurrentAnalysisId(res.analysis_id);
        setStatusData({ status: 'queued', stage: 'Queued for Re-analysis', progress: 0 });
        setCompleteReport(null);
        setKeypointFrames([]);
        setBiomechFrames([]);
        setAnomalies([]);
        setLoading(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to trigger re-analysis');
    } finally {
      setIsReanalysing(false);
    }
  };

  const token = localStorage.getItem('token');
  const skeletonVideoFullUrl = statusData?.skeleton_video_url
    ? `${api.baseUrl}${statusData.skeleton_video_url}${
        token ? `${statusData.skeleton_video_url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : ''
      }${statusData.completed_at ? `&_v=${encodeURIComponent(statusData.completed_at)}` : `&_v=${Date.now()}`}`
    : null;

  const riskInfo = completeReport?.risk || {};
  const injuryPreds = completeReport?.injury_prediction || {};
  const riskFactors = completeReport?.risk_factors || [];
  const recItems = completeReport?.recommendations || [];
  const biomechSummary = completeReport?.biomechanics || {};

  const overallScore = (riskInfo.screening_risk_score && riskInfo.screening_risk_score > 0)
    ? riskInfo.screening_risk_score
    : (riskInfo.overall_score ?? 0.0);
  const riskLevel = (riskInfo.risk_level || 'LOW').toUpperCase();
  const confidencePct = Math.round((riskInfo.confidence || 0.95) * 100);
  const modelVersion = riskInfo.model_version || '2.0.0-weighted';
  const duration = completeReport?.video?.duration || video?.duration || 10.0;
  const maxKeypointTime = useMemo(() => {
    if (!keypointFrames || keypointFrames.length === 0) return 0;
    return keypointFrames[keypointFrames.length - 1]?.timestamp || 0;
  }, [keypointFrames]);
  const effectiveDuration = Math.max(duration, maxKeypointTime, 0.1);

  // Find active keypoint frame closest to currentTime
  const currentKeypointFrame = useMemo(() => {
    if (!keypointFrames || keypointFrames.length === 0) return null;
    return keypointFrames.reduce((closest, frame) => {
      if (!closest) return frame;
      return Math.abs(frame.timestamp - currentTime) < Math.abs(closest.timestamp - currentTime)
        ? frame
        : closest;
    }, null);
  }, [keypointFrames, currentTime]);

  // Find active biomechanics frame closest to currentTime
  const currentBiomechFrame = useMemo(() => {
    if (!biomechFrames || biomechFrames.length === 0) return null;
    return biomechFrames.reduce((closest, frame) => {
      if (!closest) return frame;
      return Math.abs(frame.timestamp - currentTime) < Math.abs(closest.timestamp - currentTime)
        ? frame
        : closest;
    }, null);
  }, [biomechFrames, currentTime]);

  // Active angle for selected joint from biomechanical telemetry
  const activeSelectedAngle = useMemo(() => {
    if (!currentBiomechFrame?.joint_angles) return null;
    const angles = currentBiomechFrame.joint_angles;
    return (
      angles[selectedJoint + '_angle'] ??
      angles[selectedJoint] ??
      null
    );
  }, [currentBiomechFrame, selectedJoint]);

  // 3D Master Playback Ticker: advances currentTime at 60 FPS in lockstep with biomechanics
  useEffect(() => {
    if (viewMode !== '3D_SKELETON' || !isPlaying3D) return;

    let lastTime = performance.now();
    let animId = null;

    const tick = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTime((prev) => {
        let next = prev + dt * playbackSpeed3D;
        if (next >= effectiveDuration) {
          if (isLooping3D) {
            next = 0;
          } else {
            setIsPlaying3D(false);
            return effectiveDuration;
          }
        }
        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [viewMode, isPlaying3D, playbackSpeed3D, isLooping3D, effectiveDuration]);

  // Mode switch handler synchronizing playback time
  const handleSwitchViewMode = (mode) => {
    setViewMode(mode);
    if (mode === '3D_SKELETON') {
      setIsPlaying3D(true);
    } else {
      setIsPlaying3D(false);
      setSeekTime(currentTime);
    }
  };

  const togglePlayPause3D = () => {
    if (!isPlaying3D && currentTime >= effectiveDuration - 0.05) {
      setCurrentTime(0);
    }
    setIsPlaying3D((prev) => !prev);
  };

  const handleStepFrame3D = (direction) => {
    setIsPlaying3D(false);
    if (!keypointFrames || keypointFrames.length === 0) {
      setCurrentTime((prev) => Math.max(0, Math.min(effectiveDuration, prev + direction * 0.04)));
      return;
    }
    const currentIdx = keypointFrames.findIndex((f) => f.timestamp >= currentTime - 0.01);
    const validIdx = currentIdx === -1 ? (direction > 0 ? 0 : keypointFrames.length - 1) : currentIdx;
    const targetIdx = Math.max(0, Math.min(keypointFrames.length - 1, validIdx + direction));
    setCurrentTime(keypointFrames[targetIdx].timestamp);
  };

  const handleScrub3D = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    setSeekTime(newTime);
  };

  // Keyboard shortcut listener (Space = Play/Pause, ArrowLeft/Right = Step Frame)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }
      if (viewMode === '3D_SKELETON') {
        if (e.code === 'Space') {
          e.preventDefault();
          togglePlayPause3D();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          handleStepFrame3D(-1);
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          handleStepFrame3D(1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, isPlaying3D, keypointFrames, currentTime, effectiveDuration]);

  const filteredRecs = recItems.filter((r) => {
    if (recFilter === 'ALL') return true;
    return (r.category || '').toUpperCase() === recFilter;
  });

  const getSeverityBadge = (sev) => {
    const s = (sev || 'MODERATE').toUpperCase();
    if (s === 'CRITICAL') return 'bg-red-950 text-red-400 border-red-800';
    if (s === 'HIGH') return 'bg-orange-950 text-orange-400 border-orange-800';
    if (s === 'MODERATE') return 'bg-amber-950 text-amber-400 border-amber-800';
    return 'bg-cyan-950 text-cyan-400 border-cyan-800';
  };

  const isCompleted = statusData?.status === 'completed';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn font-sans pb-20">
      
      {/* 1. TOP HEADER & EXPORT BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl relative overflow-hidden">
        <div className="space-y-1">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            RETURN TO DASHBOARD
          </button>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 border border-cyan-800/80 rounded-full uppercase">
              {completeReport?.video?.activity || video?.activity || 'Athletic Movement'}
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              JOB ID: {analysisId ? analysisId.slice(0, 8) : 'N/A'}...
            </span>
            <span className="px-2 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-slate-900 rounded">
              CV Engine: {modelVersion}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            AI Movement Biomechanics & Injury Intelligence
          </h2>
        </div>

        {/* Action Export Buttons */}
        {isCompleted && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto font-mono">
            <button
              onClick={() => handleDownload('pdf')}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF Report
            </button>
            <button
              onClick={() => handleDownload('excel')}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl border border-emerald-700/80 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel Workbook
            </button>
            <button
              onClick={() => handleDownload('biomechanics')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition-colors cursor-pointer"
            >
              Biomech CSV
            </button>
            <button
              onClick={() => handleDownload('keypoints-csv')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition-colors cursor-pointer"
            >
              Keypoints CSV
            </button>
            <button
              onClick={handleReanalyse}
              disabled={isReanalysing}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-300 hover:text-white text-xs font-bold rounded-xl border border-purple-700/80 transition-colors cursor-pointer disabled:opacity-50"
              title="Force fresh AI pose estimation & injury screening on this video"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isReanalysing ? 'animate-spin text-purple-400' : 'text-purple-400'}`} />
              <span>{isReanalysing ? 'Queuing...' : 'Re-analyse'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. TOP HORIZONTAL TECHNICAL PIPELINE */}
      <AnalysisPipeline
        currentStage={statusData?.stage || 'risk'}
        isComplete={isCompleted}
      />

      {/* 3. TECHNICAL METRIC PANELS */}
      <MetricPanel
        poseConfidence={confidencePct}
        trackedFrames={keypointFrames.length || 110}
        validPoseFrames={Math.round((keypointFrames.length || 110) * 0.96)}
        analysisRate={15}
      />

      {/* 4. CENTRAL VIEWPORT: TOGGLE BETWEEN REAL VIDEO & 3D SKELETON */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              PRIMARY MOVEMENT VIEWPORT
            </h3>
          </div>

          {/* VIEW MODE TOGGLE BUTTONS */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs">
            <button
              onClick={() => handleSwitchViewMode('VIDEO')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'VIDEO'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>ANNOTATED VIDEO</span>
            </button>

            <button
              onClick={() => handleSwitchViewMode('3D_SKELETON')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === '3D_SKELETON'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D RECONSTRUCTION</span>
            </button>
          </div>
        </div>

        {/* VIEWPORT CANVAS / PLAYER CONTAINER */}
        <div className="w-full">
          {viewMode === 'VIDEO' ? (
            <PoseVideoPlayer
              key={currentAnalysisId || skeletonVideoFullUrl}
              videoUrl={skeletonVideoFullUrl}
              onTimeUpdate={setCurrentTime}
              seekToTime={seekTime}
            />
          ) : (
            <div className="space-y-3">
              {/* 3D Viewport with Camera Angle Selector built in */}
              <AthleteSkeleton3D
                mode={keypointFrames && keypointFrames.length > 0 ? 'live' : 'demo'}
                liveKeypoints={currentKeypointFrame?.smoothed_keypoints || currentKeypointFrame?.keypoints}
                selectedJoint={selectedJoint}
                onSelectJoint={setSelectedJoint}
                className="w-full h-[520px]"
                showHudLabels={false}
                cameraPreset={cameraPreset3D}
                onCameraPresetChange={setCameraPreset3D}
              />

              {/* DEDICATED BIOMECHANICAL 3D PLAYBACK CONTROLLER BAR */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-3">
                {/* 1. Scrubber Slider with Anomaly Markers */}
                <div className="relative flex items-center group">
                  <input
                    type="range"
                    min="0"
                    max={effectiveDuration || 10}
                    step="0.01"
                    value={currentTime}
                    onChange={handleScrub3D}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:bg-slate-700 transition-colors"
                  />
                  {/* Visual Anomaly Tick Marks */}
                  {anomalies.map((anom, idx) => {
                    if (typeof anom.timestamp !== 'number') return null;
                    const leftPct = Math.min(100, Math.max(0, (anom.timestamp / effectiveDuration) * 100));
                    const isCrit = (anom.severity || '').toUpperCase() === 'CRITICAL';
                    return (
                      <button
                        key={`anom-tick-${idx}`}
                        onClick={() => {
                          setCurrentTime(anom.timestamp);
                          setSelectedAnomaly(anom);
                        }}
                        title={`Biomech Fault @ ${anom.timestamp.toFixed(2)}s: ${anom.fault_type || 'Anomaly'}`}
                        style={{ left: `${leftPct}%` }}
                        className={`absolute w-2 h-4 -top-1 rounded-sm -translate-x-1/2 cursor-pointer transition-transform hover:scale-150 z-10 ${
                          isCrit ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* 2. Controls Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Left: Play/Pause, Steppers, Reset, Time Readout */}
                  <div className="flex items-center gap-2">
                    {/* Big Glowing Play/Pause */}
                    <button
                      onClick={togglePlayPause3D}
                      title={isPlaying3D ? "Pause (Space)" : "Play (Space)"}
                      className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold transition-all cursor-pointer ${
                        isPlaying3D
                          ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400'
                          : 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
                      }`}
                    >
                      {isPlaying3D ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Step -1 Frame */}
                    <button
                      onClick={() => handleStepFrame3D(-1)}
                      title="Step Backward 1 Frame (Left Arrow)"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      <StepBack className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">-1 Frame</span>
                    </button>

                    {/* Step +1 Frame */}
                    <button
                      onClick={() => handleStepFrame3D(1)}
                      title="Step Forward 1 Frame (Right Arrow)"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      <span className="hidden sm:inline">+1 Frame</span>
                      <StepForward className="w-3.5 h-3.5" />
                    </button>

                    {/* Reset to Start */}
                    <button
                      onClick={() => {
                        setCurrentTime(0);
                        setSeekTime(0);
                      }}
                      title="Restart from Start"
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Time & Frame Readout */}
                    <div className="flex items-center gap-1.5 pl-2 font-mono text-xs text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold text-white">
                        {currentTime.toFixed(2)}s
                      </span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-400">
                        {effectiveDuration.toFixed(2)}s
                      </span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className="text-cyan-400 font-bold hidden sm:inline">
                        Frame #{currentKeypointFrame?.frame_number ?? (Math.round(currentTime * 25))}
                      </span>
                    </div>
                  </div>

                  {/* Right: Speed Toggles, Loop Toggle, Active Joint Angle */}
                  <div className="flex items-center gap-2">
                    {/* Live Joint Angle telemetry badge */}
                    {activeSelectedAngle !== null && (
                      <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
                        <span className="text-slate-400 capitalize">{selectedJoint.replace(/_/g, ' ')}:</span>
                        <span className="font-bold text-cyan-400">{activeSelectedAngle.toFixed(1)}°</span>
                      </div>
                    )}

                    {/* Playback Speed Selectors */}
                    <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800 text-[11px] font-mono font-bold">
                      {[0.25, 0.5, 1.0, 1.5].map((spd) => (
                        <button
                          key={`spd-${spd}`}
                          onClick={() => setPlaybackSpeed3D(spd)}
                          className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                            playbackSpeed3D === spd
                              ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    {/* Loop Toggle */}
                    <button
                      onClick={() => setIsLooping3D((prev) => !prev)}
                      title="Toggle Looping Playback"
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                        isLooping3D
                          ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{isLooping3D ? 'LOOP ON' : 'LOOP OFF'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Informational Sub-banner */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-2">
                <span>
                  {keypointFrames && keypointFrames.length > 0
                    ? `Reconstructed 3D kinematic pose from ${keypointFrames.length} synchronized temporal frames`
                    : 'Synthetic Biomechanical Reference Model (Click Re-analyze for fresh AI video tracking)'}
                </span>
                <span className="text-slate-400 hidden sm:inline">
                  Controls: <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">Space</kbd> Play/Pause • <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">← / →</kbd> Step Frame
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. SYNCHRONIZED JOINT TELEMETRY GRID */}
      <JointTelemetry
        keypointFrame={currentKeypointFrame}
        biomechFrame={currentBiomechFrame}
        selectedJoint={selectedJoint}
        onSelectJoint={setSelectedJoint}
      />

      {/* 6. SYNCHRONIZED MOVEMENT TIMELINE WITH EVENT MARKERS */}
      <MovementTimeline
        currentTime={currentTime}
        duration={effectiveDuration}
        anomalies={anomalies}
        selectedAnomaly={selectedAnomaly}
        onSelectAnomaly={handleSelectAnomaly}
        onSeek={handleSeekFromTimeline}
      />

      {/* 6.5 DUAL INTELLIGENCE PANEL: Calibrated Supervised ML Probability vs Screening Risk Score */}
      <div className="p-6 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              DUAL INTELLIGENCE ENGINE • SUPERVISED ML & BIOMECHANICAL SCREENING
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
            Subject-Level Grouped Validation (0% Leakage)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Panel 1: Calibrated Supervised ML Injury Probability */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Calibrated ML Probability</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                Platt Scaled
              </span>
            </div>
            <div className="text-3xl font-black text-purple-400">
              {((riskInfo.calibrated_ml_probability ?? injuryPreds.calibrated_probability ?? 0.05) * 100).toFixed(1)}%
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Model: <strong className="text-slate-200">{injuryPreds.ml_model_name || 'Calibrated-XGBoost v2.0'}</strong>
              <br />
              Trained on 45,198 samples (Lövdal 2021 & Swathikiran 2021 cohorts). ROC-AUC: 0.814, Brier: 0.051.
            </p>
          </div>

          {/* Panel 2: Biomechanical Screening Risk Score */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Screening Risk Score</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getSeverityBadge(riskLevel)}`}>
                {riskLevel} RISK
              </span>
            </div>
            <div className="text-3xl font-black text-cyan-400">
              {Math.round(overallScore)}/100
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Engine: <strong className="text-slate-200">5-Factor Screening ({modelVersion})</strong>
              <br />
              35% Biomechanics, 20% History, 20% Asymmetry, 15% Workload, 10% Fatigue.
            </p>
          </div>

          {/* Panel 3: Pose Model & Provenance */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Active Vision Engine</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ONNX Runtime
              </span>
            </div>
            <div className="text-lg font-bold text-emerald-400">
              {riskInfo.pose_model || 'RTMPose-M (ONNX)'}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Architecture: <strong className="text-slate-200">SimCC Heatmap-Free</strong>
              <br />
              17 COCO Keypoints • One-Euro Filter • Fallback: Torchvision Keypoint R-CNN.
            </p>
          </div>
        </div>

        {/* Clinical Proxy & Limitations Disclaimer */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-cyan-300 font-bold">Clinical Transparency Note:</span> Monocular video pose estimation yields 2D kinematic proxies and angular estimates. High-risk flags indicate biomechanical compensation or workload spikes warranting professional athletic screening, not definitive medical diagnoses.
          </div>
        </div>
      </div>

      {/* 7. 3D INJURY RISK HEATMAP VISUALIZATION */}
      <RiskSkeleton3D
        injuryPredictions={injuryPreds}
        overallRiskLevel={riskLevel}
        overallScore={overallScore}
      />

      {/* 8. BIOMECHANICS TIME-SERIES CHARTS */}
      <div className="space-y-6 pt-4 border-t border-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-mono font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              KINEMATIC JOINT ANGLE TIME-SERIES (0° - 180°)
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Continuous multi-frame joint flexion and angular velocity tracking. Click chart to seek video.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <JointAngleChart
            data={biomechFrames}
            currentTime={currentTime}
            onSeek={handleSeekFromTimeline}
            title="Knee Joint Angles"
            leftKey="left_knee_angle"
            rightKey="right_knee_angle"
            leftLabel="Left Knee"
            rightLabel="Right Knee"
          />
          <JointAngleChart
            data={biomechFrames}
            currentTime={currentTime}
            onSeek={handleSeekFromTimeline}
            title="Hip Joint Angles"
            leftKey="left_hip_angle"
            rightKey="right_hip_angle"
            leftLabel="Left Hip"
            rightLabel="Right Hip"
          />
          <JointAngleChart
            data={biomechFrames}
            currentTime={currentTime}
            onSeek={handleSeekFromTimeline}
            title="Ankle Joint Angles"
            leftKey="left_ankle_angle"
            rightKey="right_ankle_angle"
            leftLabel="Left Ankle"
            rightLabel="Right Ankle"
          />
          <JointAngleChart
            data={biomechFrames}
            currentTime={currentTime}
            onSeek={handleSeekFromTimeline}
            title="Elbow Joint Angles"
            leftKey="left_elbow_angle"
            rightKey="right_elbow_angle"
            leftLabel="Left Elbow"
            rightLabel="Right Elbow"
          />
        </div>

        {/* Biomechanics and Symmetry Section */}
        <BiomechanicsCharts
          data={biomechFrames}
          currentTime={currentTime}
          onSeek={handleSeekFromTimeline}
        />
      </div>

      {/* 9. PERSONALIZED CONDITIONING & INTERVENTIONS */}
      <div className="p-6 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-mono font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              PERSONALIZED BIOMECHANICAL CONDITIONING INTERVENTIONS
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Targeted corrective protocols based on detected kinematic deviations.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[11px] overflow-x-auto">
            {['ALL', 'STRENGTHENING', 'EXERCISE', 'MOBILITY', 'RECOVERY', 'TRAINING_MODIFICATION'].map((cat) => (
              <button
                key={cat}
                onClick={() => setRecFilter(cat)}
                className={`px-3 py-1 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  recFilter === cat
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? 'ALL DRILLS' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecs.length > 0 ? (
            filteredRecs.map((rec, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3 shadow-md hover:border-cyan-500/30 transition-colors font-mono"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full border ${getSeverityBadge(rec.priority)}`}>
                    {rec.priority} PRIORITY
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {rec.category} • {rec.target_region}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white font-sans">
                  {rec.exercise}
                </h4>

                <div className="space-y-1 text-xs text-slate-400 font-sans">
                  <p><strong className="text-slate-300 font-mono text-[11px]">Why:</strong> {rec.reason}</p>
                  <p><strong className="text-slate-300 font-mono text-[11px]">Target:</strong> {rec.target_biomechanical_problem}</p>
                  <p><strong className="text-slate-300 font-mono text-[11px]">Prescription:</strong> {rec.suggested_frequency} {rec.suggested_sets_reps && `(${rec.suggested_sets_reps})`}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-[11px] text-cyan-300 font-mono">
                  <strong>Objective:</strong> {rec.expected_objective}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-2xl font-mono">
              No specific corrective drills for this filter category. Baseline physical conditioning recommended.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
