'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '../../../components/layout/Sidebar';
import { Header } from '../../../components/layout/Header';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Alert, ComingSoonNotice } from '../../../components/ui/Alert';
import { RiskScoreCard } from '../../../components/dashboard/RiskScoreCard';
import { RiskBreakdown } from '../../../components/dashboard/RiskBreakdown';
import { EmptyState } from '../../../components/ui/EmptyState';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';
import { PoseOverlay } from '../../../components/analysis/PoseOverlay';
import { KinematicsChart } from '../../../components/analysis/KinematicsChart';
import { AnomalyList } from '../../../components/analysis/AnomalyList';
import { DeviationMetricsCard } from '../../../components/analysis/DeviationMetricsCard';
import { ApiClient } from '../../../lib/api';
import {
  VideoSession,
  VideoStatus,
  KeypointsResponse,
  KinematicsResponse,
  AnomalyAssessmentResponse,
} from '../../../lib/types';
import { VideoIcon, CheckCircleIcon, ActivityIcon, PlayIcon } from '../../../components/ui/Icons';

export default function MovementAnalysisPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [video, setVideo] = useState<VideoSession | null>(null);
  const [keypoints, setKeypoints] = useState<KeypointsResponse | null>(null);
  const [kinematics, setKinematics] = useState<KinematicsResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyAssessmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatusMessage, setProcessStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [useSmoothed, setUseSmoothed] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'kinematics' | 'anomalies' | 'prescriptions'>('kinematics');
  const [deviationSubTab, setDeviationSubTab] = useState<'events' | 'metrics'>('events');

  const fetchVideoDetails = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await ApiClient.getVideo(sessionId);
      setVideo(data);

      if (data.status === VideoStatus.ANALYZED) {
        try {
          const [kp, kin, anom] = await Promise.all([
            ApiClient.getKeypoints(sessionId),
            ApiClient.getKinematics(sessionId),
            ApiClient.getAnomalies(sessionId),
          ]);
          setKeypoints(kp);
          setKinematics(kin);
          setAnomalies(anom);
        } catch (err) {
          console.error('Failed to load keypoints, kinematics, or anomalies', err);
        }
      }
    } catch (err: any) {
      console.error('Failed to load video details', err);
      setErrorMessage(err.message || 'Video session not found or access denied.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchVideoDetails();
  }, [fetchVideoDetails]);

  // Handle Pipeline Trigger
  const handleTriggerAnalysis = async () => {
    if (!video) return;
    setIsProcessing(true);
    setProcessStatusMessage('Extracting 15 anatomical landmarks via MediaPipe Pose...');
    setErrorMessage(null);

    try {
      await ApiClient.processVideo(video.id, true, useSmoothed ? 'SAVITZKY_GOLAY' : 'MOVING_AVERAGE');
      setProcessStatusMessage('Computing joint angles, statistical deviations, and developmental baselines...');

      // Reload updated session, kinematics, and anomalies
      const [updatedVideo, kp, kin, anom] = await Promise.all([
        ApiClient.getVideo(video.id),
        ApiClient.getKeypoints(video.id),
        ApiClient.getKinematics(video.id),
        ApiClient.getAnomalies(video.id),
      ]);

      setVideo(updatedVideo);
      setKeypoints(kp);
      setKinematics(kin);
      setAnomalies(anom);
      setActiveTab('kinematics');
      setProcessStatusMessage(null);
    } catch (err: any) {
      console.error('Processing failed', err);
      setErrorMessage(err.message || 'Kinematics and anomaly processing failed.');
      setProcessStatusMessage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      // Auto-play / pause momentarily to focus
      videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (isLoading) {
    return (
      <RoleGuard>
        <div className="p-8">
          <DashboardSkeleton />
        </div>
      </RoleGuard>
    );
  }

  if (errorMessage && !video) {
    return (
      <RoleGuard>
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex flex-col flex-1 w-full overflow-hidden">
            <Header onOpenSidebar={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
              <EmptyState
                icon={<VideoIcon className="w-8 h-8 text-slate-400" />}
                title="Video Session Not Found"
                description={errorMessage || `No recording session found matching ID: ${sessionId}`}
                actionLabel="Upload New Video"
                onAction={() => router.push('/upload')}
              />
            </main>
          </div>
        </div>
      </RoleGuard>
    );
  }

  const streamUrl = video ? ApiClient.getVideoStreamUrl(video.id) : '';

  return (
    <RoleGuard>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Top Header Card */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                      {video?.sport_type || 'Movement Recording'}
                    </span>
                    <Badge
                      variant={
                        video?.status === VideoStatus.ANALYZED
                          ? 'success'
                          : video?.status === VideoStatus.FAILED
                          ? 'danger'
                          : 'info'
                      }
                      size="sm"
                    >
                      {video?.status}
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                    {video?.original_filename || `Session #${video?.id.substring(0, 8)}`}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                    <span>Athlete ID: <strong className="font-mono text-slate-700">{video?.athlete_id}</strong></span>
                    <span>•</span>
                    <span>Uploaded: <strong>{video?.uploaded_at ? new Date(video.uploaded_at).toLocaleString() : ''}</strong></span>
                    {video?.fps && (
                      <>
                        <span>•</span>
                        <span>Framerate: <strong>{video.fps} FPS</strong></span>
                      </>
                    )}
                    {keypoints && (
                      <>
                        <span>•</span>
                        <span>Keypoints: <strong className="text-emerald-700">{keypoints.frame_count} Frames</strong></span>
                      </>
                    )}
                    {anomalies && (
                      <>
                        <span>•</span>
                        <span>Deviations: <strong className="text-blue-700">{anomalies.anomalies.length} Flagged</strong></span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {video?.status === VideoStatus.UPLOADED && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleTriggerAnalysis}
                      isLoading={isProcessing}
                      leftIcon={<PlayIcon className="w-4 h-4" />}
                    >
                      Analyze Movement Kinematics
                    </Button>
                  )}
                  {video?.status === VideoStatus.ANALYZED && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTriggerAnalysis}
                      isLoading={isProcessing}
                    >
                      Re-run Pipeline
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => router.push('/upload')}>
                    Upload Another Drill
                  </Button>
                </div>
              </div>

              {/* Status Alert */}
              {isProcessing && processStatusMessage && (
                <Alert variant="warning" title="Analysis Pipeline in Progress">
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-amber-800">
                    <ActivityIcon className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                    <span>{processStatusMessage}</span>
                  </div>
                </Alert>
              )}

              {video?.status === VideoStatus.ANALYZED && (
                <Alert variant="success" title="Kinematics & Developmental Deviations Analyzed">
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-emerald-800">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      15 anatomical landmarks extracted with MediaPipe Pose and filtered with Savitzky-Golay smoothing. Statistical movement deviations evaluated against provisional developmental baselines.
                    </span>
                  </div>
                </Alert>
              )}

              {/* Video Player & Real Pose Overlay */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="overflow-hidden">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <VideoIcon className="w-5 h-5 text-brand-primary" />
                        <h3 className="font-bold text-slate-900 text-base">
                          {keypoints ? '15-Keypoint Pose Tracking' : 'Movement Video Playback'}
                        </h3>
                      </div>

                      {/* Pose Controls */}
                      {keypoints && (
                        <div className="flex items-center gap-4 text-xs font-semibold">
                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={showSkeleton}
                              onChange={(e) => setShowSkeleton(e.target.checked)}
                              className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <span>Skeleton Overlay</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={useSmoothed}
                              onChange={(e) => setUseSmoothed(e.target.checked)}
                              className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <span>Savitzky-Golay Smoothing</span>
                          </label>
                        </div>
                      )}
                    </CardHeader>

                    <CardBody className="p-0 bg-slate-950 aspect-video relative flex items-center justify-center overflow-hidden">
                      <video
                        ref={videoRef}
                        src={streamUrl}
                        controls
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        className="w-full h-full object-contain"
                      />
                      {keypoints && (
                        <PoseOverlay
                          frames={keypoints.frames}
                          currentTime={currentTime}
                          showOverlay={showSkeleton}
                          useSmoothed={useSmoothed}
                        />
                      )}
                    </CardBody>
                  </Card>
                </div>

                <div>
                  <RiskScoreCard isPendingPipeline={true} />
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-sm font-semibold">
                <button
                  onClick={() => setActiveTab('kinematics')}
                  className={`pb-3 px-4 transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === 'kinematics'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Joint Kinematics
                </button>
                <button
                  onClick={() => setActiveTab('anomalies')}
                  className={`pb-3 px-4 transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === 'anomalies'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Biomechanical Deviations
                  {anomalies && anomalies.anomalies.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-rose-100 text-rose-700 rounded-full font-bold">
                      {anomalies.anomalies.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-3 px-4 transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === 'overview'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Risk Overview
                </button>
                <button
                  onClick={() => setActiveTab('prescriptions')}
                  className={`pb-3 px-4 transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === 'prescriptions'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Corrective Prescriptions
                </button>
              </div>

              {/* Tab: Joint Kinematics */}
              {activeTab === 'kinematics' && (
                <div>
                  {kinematics ? (
                    <KinematicsChart
                      kinematics={kinematics}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                    />
                  ) : (
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-base">Mathematical Joint Angle Curves</h3>
                        <p className="text-xs text-slate-500">Sagittal and frontal plane angles from 15 anatomical keypoints</p>
                      </CardHeader>
                      <CardBody className="p-8 text-center space-y-4">
                        <p className="text-sm text-slate-600">
                          Video session is awaiting pose extraction. Click below to execute the 15-keypoint MediaPipe model and calculate joint angle timeseries.
                        </p>
                        <Button
                          variant="primary"
                          onClick={handleTriggerAnalysis}
                          isLoading={isProcessing}
                          leftIcon={<PlayIcon className="w-4 h-4" />}
                        >
                          Execute Pose & Kinematic Engine
                        </Button>
                      </CardBody>
                    </Card>
                  )}
                </div>
              )}

              {/* Tab: Biomechanical Deviations (Phase 4) */}
              {activeTab === 'anomalies' && (
                <div className="space-y-6">
                  {anomalies ? (
                    <div className="space-y-6">
                      {/* Subtab selector */}
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeviationSubTab('events')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              deviationSubTab === 'events'
                                ? 'bg-brand-primary text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Identified Deviations ({anomalies.anomalies.length})
                          </button>
                          <button
                            onClick={() => setDeviationSubTab('metrics')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              deviationSubTab === 'metrics'
                                ? 'bg-brand-primary text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            All Developmental Baseline Metrics
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-400 font-medium italic hidden sm:block">
                          Click timestamp to seek video playback
                        </div>
                      </div>

                      {deviationSubTab === 'events' ? (
                        <AnomalyList
                          anomalies={anomalies.anomalies}
                          overallStatus={anomalies.overall_status}
                          onSeek={handleSeek}
                        />
                      ) : (
                        <DeviationMetricsCard
                          deviations={anomalies.metric_deviations}
                        />
                      )}
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-base">Statistical Movement Deviations</h3>
                        <p className="text-xs text-slate-500">Z-score deviations against developmental baselines</p>
                      </CardHeader>
                      <CardBody className="p-8 text-center space-y-4">
                        <p className="text-sm text-slate-600">
                          Video session is awaiting processing. Click below to execute pose extraction and compare movement metrics against developmental baselines.
                        </p>
                        <Button
                          variant="primary"
                          onClick={handleTriggerAnalysis}
                          isLoading={isProcessing}
                          leftIcon={<PlayIcon className="w-4 h-4" />}
                        >
                          Execute Biomechanical Anomaly Engine
                        </Button>
                      </CardBody>
                    </Card>
                  )}
                </div>
              )}

              {/* Tab: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <RiskBreakdown isPendingPipeline={true} />
                </div>
              )}

              {/* Tab: Prescriptions */}
              {activeTab === 'prescriptions' && (
                <Card>
                  <CardHeader>
                    <h3 className="font-bold text-slate-900 text-base">Targeted Exercise Recommendations</h3>
                    <p className="text-xs text-slate-500">Corrective movement prescriptions</p>
                  </CardHeader>
                  <CardBody className="p-8">
                    <ComingSoonNotice
                      feature="Evidence-Based Prescription Engine"
                      phase="Phase 6 (Recommendation Engine)"
                    />
                  </CardBody>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
