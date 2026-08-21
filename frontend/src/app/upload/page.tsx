'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { RoleGuard } from '../../components/layout/RoleGuard';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { ApiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { AthleteProfile, UserRole } from '../../lib/types';
import {
  UploadCloudIcon,
  VideoIcon,
  CheckCircleIcon,
  InfoIcon,
  XIcon,
  UsersIcon,
} from '../../components/ui/Icons';

export default function VideoUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sportType, setSportType] = useState('Jumping (Drop Jump Test)');
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{ type: 'success' | 'notice' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If user is staff/coach, load athlete roster for selection
  useEffect(() => {
    async function loadAthletes() {
      if (user && user.role !== UserRole.ATHLETE) {
        setIsLoadingAthletes(true);
        try {
          const list = await ApiClient.listAthletes();
          setAthletes(list);
          if (list.length > 0) {
            setSelectedAthleteId(list[0].id);
          }
        } catch (err) {
          console.error('Failed to load athletes list', err);
        } finally {
          setIsLoadingAthletes(false);
        }
      }
    }
    loadAthletes();
  }, [user]);

  const handleFileSelect = (selectedFile: File) => {
    // Validate format
    const validFormats = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    const validExts = ['.mp4', '.mov', '.webm', '.avi'];
    const hasValidExt = validExts.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

    if (!validFormats.includes(selectedFile.type) && !hasValidExt) {
      setUploadResult({
        type: 'error',
        message: 'Invalid video format. Supported formats: MP4, MOV, WebM, AVI.',
      });
      return;
    }

    // Validate size (100MB limit)
    if (selectedFile.size > 100 * 1024 * 1024) {
      setUploadResult({
        type: 'error',
        message: 'File size exceeds 100MB limit. Please compress the recording before uploading.',
      });
      return;
    }

    if (selectedFile.size === 0) {
      setUploadResult({
        type: 'error',
        message: 'Selected video file is empty (0 bytes).',
      });
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setUploadResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadProgress(0);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Validate athlete selection for staff roles
    if (user && user.role !== UserRole.ATHLETE && !selectedAthleteId) {
      setUploadResult({
        type: 'error',
        message: 'Please select a target athlete for this recording.',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sport_type', sportType);
    if (selectedAthleteId) {
      formData.append('athlete_id', selectedAthleteId);
    }

    try {
      setUploadProgress(65);
      const res = await ApiClient.uploadVideo(formData);
      setUploadProgress(100);
      setUploadResult({
        type: 'success',
        message: `Video "${res.original_filename || file.name}" uploaded successfully! Redirecting to analysis...`,
      });

      // Redirect to the newly created video analysis page
      setTimeout(() => {
        router.push(`/analysis/${res.id}`);
      }, 800);
    } catch (err: any) {
      setUploadProgress(0);
      setUploadResult({
        type: 'error',
        message: err.message || 'Video upload failed. Please verify server connection.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <RoleGuard>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Movement Ingestion</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
                  Upload Movement Video
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Ingest athletic drills (MP4, MOV, WebM, AVI up to 100MB) for kinematic pose extraction and risk assessment
                </p>
              </div>

              {/* Status Alert */}
              {uploadResult && (
                <Alert
                  variant={uploadResult.type === 'success' ? 'success' : uploadResult.type === 'notice' ? 'warning' : 'danger'}
                  title={uploadResult.type === 'success' ? 'Upload Successful' : uploadResult.type === 'notice' ? 'Pipeline Notice' : 'Upload Error'}
                >
                  {uploadResult.message}
                </Alert>
              )}

              {/* Main Upload Card */}
              <Card>
                <CardBody className="p-6 sm:p-8">
                  <form onSubmit={handleSubmitUpload} className="space-y-6">
                    {/* Target Athlete Selector for Staff / Coaches */}
                    {user && user.role !== UserRole.ATHLETE && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <UsersIcon className="w-4 h-4 text-brand-primary" />
                          <span>Target Athlete Roster</span>
                        </label>
                        {isLoadingAthletes ? (
                          <div className="text-xs text-slate-400 p-2 bg-slate-50 rounded-xl">Loading roster...</div>
                        ) : athletes.length > 0 ? (
                          <select
                            value={selectedAthleteId}
                            onChange={(e) => setSelectedAthleteId(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          >
                            {athletes.map((ath) => (
                              <option key={ath.id} value={ath.id}>
                                {ath.sport} — {ath.position || 'Athlete'} ({ath.id.substring(0, 8)}...)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                            No athlete records found in database. Create an athlete profile before uploading.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Activity / Drill Type Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Movement / Drill Assessment Type
                      </label>
                      <select
                        value={sportType}
                        onChange={(e) => setSportType(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      >
                        <option value="Jumping (Drop Jump Test)">Jumping (Drop Jump Test — Knee Valgus)</option>
                        <option value="Cutting (45-Degree Cut)">Cutting (45-Degree Cut — ACL Deceleration)</option>
                        <option value="Sprinting (Max Velocity)">Sprinting (Max Velocity — Hamstring Mechanics)</option>
                        <option value="Squatting (Overhead Squat)">Squatting (Overhead Squat — Hip & Trunk Stability)</option>
                        <option value="Landing (Single-Leg Land)">Landing (Single-Leg Land — Ankle & Knee Stability)</option>
                        <option value="Sport-Specific Drill">Sport-Specific Drill / General Movement</option>
                      </select>
                    </div>

                    {/* Drag & Drop Box */}
                    {!file ? (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-brand-primary rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all hover:bg-blue-50/20 group"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,.avi"
                          className="hidden"
                          onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
                        />
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-brand-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <UploadCloudIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">
                          Click to upload or drag & drop video
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
                          Supports MP4, MOV, WebM, or AVI recordings (Max 100MB, 60fps recommended)
                        </p>
                        <span className="inline-block px-3.5 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                          Browse Local Video
                        </span>
                      </div>
                    ) : (
                      /* Video Preview Card */
                      <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-brand-primary text-white shadow-sm">
                              <VideoIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{file.name}</p>
                              <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Video'}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            aria-label="Remove selected video"
                          >
                            <XIcon className="w-5 h-5" />
                          </button>
                        </div>

                        {previewUrl && (
                          <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner">
                            <video src={previewUrl} controls className="w-full h-full object-contain" />
                          </div>
                        )}

                        {isUploading && (
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-xs font-medium text-slate-700">
                              <span>Uploading recording to storage server...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-brand-primary h-full rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recording Protocol Guidelines */}
                    <div className="p-5 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2 text-brand-primary font-bold">
                        <InfoIcon className="w-4 h-4" />
                        <span>Optimal Capture Protocol for Biomechanical Extraction</span>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-1">
                        <li className="flex items-center gap-2">
                          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Ensure full body (head to feet) is in frame.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Capture from perpendicular side or frontal angle.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Maintain stable camera mount (tripod recommended).</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Use bright, uniform lighting with minimal motion blur.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveFile}
                        disabled={!file || isUploading}
                      >
                        Clear File
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!file || isUploading}
                        isLoading={isUploading}
                        leftIcon={<UploadCloudIcon className="w-4 h-4" />}
                      >
                        Submit for Biomechanical Analysis
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
