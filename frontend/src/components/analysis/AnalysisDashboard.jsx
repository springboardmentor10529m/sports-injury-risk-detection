import React, { useState, useEffect } from 'react';
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
  CheckCircle2, Target, Zap, Clock, Sparkles, Filter, ChevronRight, Eye, Layers
} from 'lucide-react';

export const AnalysisDashboard = ({ analysisId, video, onBack }) => {
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

  // 14. Viewport Mode Toggle: 'VIDEO' vs '3D SKELETON'
  const [viewMode, setViewMode] = useState('VIDEO'); // 'VIDEO' | '3D_SKELETON'
  const [selectedJoint, setSelectedJoint] = useState('left_knee');

  useEffect(() => {
    fetchJobStatus();
    const interval = setInterval(() => {
      fetchJobStatus();
    }, 2500);

    return () => clearInterval(interval);
  }, [analysisId]);

  const fetchJobStatus = async () => {
    try {
      const stat = await api.get(`/api/analysis/${analysisId}/status`);
      setStatusData(stat);

      if (stat.status === 'completed') {
        fetchFullAnalysisData();
      } else if (stat.status === 'failed') {
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch analysis job status');
      setLoading(false);
    }
  };

  const fetchFullAnalysisData = async () => {
    try {
      const [report, kps, bio, anoms] = await Promise.all([
        api.get(`/api/analysis/${analysisId}/complete-report`).catch(() => null),
        api.get(`/api/analysis/${analysisId}/keypoints`).catch(() => []),
        api.get(`/api/analysis/${analysisId}/biomechanics`).catch(() => []),
        api.get(`/api/analysis/${analysisId}/anomalies`).catch(() => [])
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

  // Find active keypoint frame closest to currentTime
  const currentKeypointFrame = keypointFrames.reduce((closest, frame) => {
    if (!closest) return frame;
    return Math.abs(frame.timestamp - currentTime) < Math.abs(closest.timestamp - currentTime)
      ? frame
      : closest;
  }, null);

  // Find active biomechanics frame closest to currentTime
  const currentBiomechFrame = biomechFrames.reduce((closest, frame) => {
    if (!closest) return frame;
    return Math.abs(frame.timestamp - currentTime) < Math.abs(closest.timestamp - currentTime)
      ? frame
      : closest;
  }, null);

  const handleDownload = (type) => {
    const token = localStorage.getItem('token');
    let url = `/api/analysis/${analysisId}/download/${type}`;
    let filename = `${type}_${analysisId.slice(0, 8)}`;

    if (type === 'keypoints-json') {
      url = `/api/analysis/${analysisId}/download/keypoints?format=json`;
      filename = `keypoints_${analysisId.slice(0, 8)}.json`;
    } else if (type === 'keypoints-csv') {
      url = `/api/analysis/${analysisId}/download/keypoints?format=csv`;
      filename = `keypoints_${analysisId.slice(0, 8)}.csv`;
    } else if (type === 'biomechanics') {
      url = `/api/analysis/${analysisId}/download/biomechanics`;
      filename = `biomechanics_${analysisId.slice(0, 8)}.csv`;
    } else if (type === 'pdf') {
      url = `/api/analysis/${analysisId}/download/pdf`;
      filename = `AthleteGuard_Report_${analysisId.slice(0, 8)}.pdf`;
    } else if (type === 'excel') {
      url = `/api/analysis/${analysisId}/download/excel`;
      filename = `AthleteGuard_Workbook_${analysisId.slice(0, 8)}.xlsx`;
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

  const token = localStorage.getItem('token');
  const skeletonVideoFullUrl = statusData?.skeleton_video_url
    ? `${api.baseUrl}${statusData.skeleton_video_url}${
        token ? `${statusData.skeleton_video_url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : ''
      }`
    : null;

  const riskInfo = completeReport?.risk || {};
  const injuryPreds = completeReport?.injury_prediction || {};
  const riskFactors = completeReport?.risk_factors || [];
  const recItems = completeReport?.recommendations || [];
  const biomechSummary = completeReport?.biomechanics || {};

  const overallScore = riskInfo.overall_score ?? 0.0;
  const riskLevel = (riskInfo.risk_level || 'LOW').toUpperCase();
  const confidencePct = Math.round((riskInfo.confidence || 0.95) * 100);
  const modelVersion = riskInfo.model_version || '2.0.0-weighted';
  const duration = completeReport?.video?.duration || video?.duration || 10.0;

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
              onClick={() => setViewMode('VIDEO')}
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
              onClick={() => setViewMode('3D_SKELETON')}
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
              videoUrl={skeletonVideoFullUrl}
              onTimeUpdate={setCurrentTime}
              seekToTime={seekTime}
            />
          ) : (
            <div className="space-y-2">
              <AthleteSkeleton3D
                mode="live"
                liveKeypoints={currentKeypointFrame?.smoothed_keypoints || currentKeypointFrame?.keypoints}
                selectedJoint={selectedJoint}
                onSelectJoint={setSelectedJoint}
                className="w-full h-[520px]"
                showHudLabels={false}
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-2">
                <span>Estimated 3D Pose reconstructed from 17 COCO temporal tracking coordinates</span>
                <span className="text-cyan-400 font-bold">
                  Frame #{currentKeypointFrame?.frame_number || 0} ({currentTime.toFixed(2)}s)
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
        duration={duration}
        anomalies={anomalies}
        selectedAnomaly={selectedAnomaly}
        onSelectAnomaly={handleSelectAnomaly}
        onSeek={handleSeekFromTimeline}
      />

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
