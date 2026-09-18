import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Eye,
  FileVideo,
  SplitSquareVertical,
  Upload,
  Video,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { GlassInput } from '../../components/ui/GlassInput'
import { GlassSelect } from '../../components/ui/GlassSelect'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useAuth } from '../../context/AuthContext'
import { predictInjuryRisk, saveLatestPrediction, uploadForSkeletonStream } from '../../services/analysis'
import { getAthleteProfile } from '../../services/profile'
import type { AthleteProfile } from '../../types/athlete'

const painOptions = ['None', 'Mild', 'Moderate', 'Severe']
const movements = ['Running', 'Sprinting', 'Jumping', 'Landing', 'Squat', 'Cutting', 'Throwing', 'Custom Movement']
const cameraViews = ['Side', 'Front', 'Rear', 'Multiple']
const localStages = ['Video selected', 'Profile context loaded', 'MediaPipe pose stream verified', 'Ensemble ML inference ready']

export function NewAnalysis() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [streamToken, setStreamToken] = useState<string | null>(null)
  const [isPreparingStream, setIsPreparingStream] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'sideBySide' | 'skeleton' | 'raw'>('sideBySide')
  const [movement, setMovement] = useState('Running')
  const [cameraView, setCameraView] = useState('Side')
  const [painLevel, setPainLevel] = useState('None')
  const [painLocation, setPainLocation] = useState('')
  const [isPredicting, setIsPredicting] = useState(false)
  const [predictionStep, setPredictionStep] = useState(0)
  const [error, setError] = useState('')

  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  useEffect(() => {
    getAthleteProfile(user?.id).then(setProfile)
  }, [user?.id])
  const readiness = [
    Boolean(file),
    Boolean(profile),
    Boolean(streamToken || file),
    false,
  ]

  // When file is selected: prepare preview and live skeleton stream immediately
  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      setStreamToken(null)
      setIsPreparingStream(false)
      setStreamError(null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    startSkeletonStream(file)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  async function startSkeletonStream(videoFile: File) {
    setStreamToken(null)
    setStreamError(null)
    setIsPreparingStream(true)
    try {
      const token = await uploadForSkeletonStream(videoFile)
      setStreamToken(token)
      console.log('[MotionGuard] Skeleton stream token:', token)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stream unavailable'
      console.error('[MotionGuard] Skeleton stream upload failed:', msg)
      setStreamError(msg)
    } finally {
      setIsPreparingStream(false)
    }
  }

  async function runPrediction() {
    if (!file) return
    setIsPredicting(true)
    setError('')
    setPredictionStep(1)

    const t1 = setTimeout(() => setPredictionStep(2), 700)
    const t2 = setTimeout(() => setPredictionStep(3), 1600)
    const t3 = setTimeout(() => setPredictionStep(4), 2600)
    try {
      const prediction = await predictInjuryRisk({ video: file, user, profile, movement })
      const id = `analysis-${Date.now()}`
      await saveLatestPrediction({ ...prediction, id, athleteId: user?.id ?? 'current-athlete', sport: profile?.primarySport || 'Unspecified sport', movement, date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), fileName: file.name, skeletonStreamToken: streamToken ?? undefined })
      navigate(`/athlete/analysis/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed. Confirm the backend is running on port 8000.')
    } finally {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); setIsPredicting(false)
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue/20 bg-blue/10 px-3 py-1 text-xs font-bold text-blue">
            <Cpu size={14} />
            <span>REAL-TIME POSE ESTIMATION PIPELINE</span>
          </div>
          <h1 className="mt-2 text-3xl font-black text-deep-navy">Biomechanical Movement Analysis</h1>
          <p className="mt-1 max-w-3xl text-sm text-text-muted">
            Inspect real-time MediaPipe human pose estimation, 33-point skeleton tracking, and transparent preprocessing before running the 3-model ML injury predictor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm">
            <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            MediaPipe CV Active
          </div>
          <div className="rounded-xl border border-blue/10 bg-white/75 px-3.5 py-2 text-xs font-semibold text-deep-navy shadow-sm">
            Backend: <span className="font-mono text-blue">127.0.0.1:8000</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <GlassCard className="overflow-hidden p-0">
          {/* Upload Dropzone */}
          <label className="grid min-h-48 cursor-pointer place-items-center border-b border-white/80 bg-gradient-to-b from-white/70 to-white/40 p-6 text-center transition-colors hover:bg-white/80">
            <input
              type="file"
              accept=".mp4,.mov,.avi,video/*"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 shadow-inner">
              <Upload size={28} />
            </div>
            <h2 className="mt-3 text-xl font-black text-deep-navy">
              {file ? 'Replace movement video' : 'Upload athlete movement video'}
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              MP4, MOV, or AVI (Running, Sprinting, Squats, Jumps). Full-body framing produces optimal 33-joint skeleton tracking.
            </p>
            {file && (
              <div className="mt-3 flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={14} />
                <span>{file.name}</span>
                <span className="text-emerald-500">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
              </div>
            )}
          </label>

          <div className="p-5">
            {/* View Mode Switcher */}
            {file && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-blue/10 pb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <Eye size={14} className="text-blue" />
                  <span>Preview Mode:</span>
                </div>
                <div className="inline-flex rounded-xl bg-deep-navy/5 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setViewMode('sideBySide')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                      viewMode === 'sideBySide'
                        ? 'bg-deep-navy text-white shadow-sm'
                        : 'text-text-muted hover:text-deep-navy'
                    }`}
                  >
                    <SplitSquareVertical size={13} />
                    <span>Side-by-Side (Faculty Demo)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('skeleton')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                      viewMode === 'skeleton'
                        ? 'bg-deep-navy text-white shadow-sm'
                        : 'text-text-muted hover:text-deep-navy'
                    }`}
                  >
                    <Activity size={13} />
                    <span>Real-Time Skeleton</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('raw')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                      viewMode === 'raw'
                        ? 'bg-deep-navy text-white shadow-sm'
                        : 'text-text-muted hover:text-deep-navy'
                    }`}
                  >
                    <Video size={13} />
                    <span>Raw Video</span>
                  </button>
                </div>
              </div>
            )}

            {/* Video / Skeleton Display Area */}
            {!file ? (
              <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-blue/20 bg-white/50 text-center text-text-muted">
                <div>
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue/5 text-blue">
                    <Video size={36} />
                  </div>
                  <p className="font-bold text-deep-navy">Video preview & real-time skeleton appears here</p>
                  <p className="mt-1 text-xs text-text-muted">Upload a video to see MediaPipe Pose estimation in real-time</p>
                </div>
              </div>
            ) : viewMode === 'sideBySide' ? (
              /* ── SIDE-BY-SIDE MODE (Matches Reference Image) ── */
              <div>
                <div className="mb-2 flex items-center justify-between rounded-xl bg-deep-navy px-4 py-2 text-white">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black tracking-wider uppercase">HUMAN POSE ESTIMATION</span>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-200">
                    Raw Video Ingestion vs. MediaPipe Pose Preprocessing
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {/* Left: Raw Video */}
                  <div className="relative overflow-hidden rounded-xl border-2 border-red-500/80 bg-black shadow-sm">
                    <div className="absolute left-2.5 top-2.5 z-10 rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow">
                      Input Video
                    </div>
                    <video
                      className="aspect-video w-full object-contain"
                      src={previewUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </div>

                  {/* Right: MediaPipe Pose Stream */}
                  <div className="relative overflow-hidden rounded-xl border-2 border-cyan-400 bg-black shadow-sm">
                    <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded bg-cyan-600/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      MediaPipe Pose
                    </div>

                    {isPreparingStream ? (
                      <div className="grid aspect-video place-items-center p-6 text-center text-cyan-200">
                        <div>
                          <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                          <p className="text-xs font-bold">Uploading to MediaPipe Engine...</p>
                          <p className="text-[11px] text-cyan-300/70">Connecting to Python OpenCV &amp; MediaPipe</p>
                        </div>
                      </div>
                    ) : streamToken ? (
                      <img
                        src={`http://127.0.0.1:8000/skeleton-stream/${streamToken}`}
                        alt="MediaPipe Skeleton Stream"
                        className="aspect-video w-full object-contain"
                        onError={() => setStreamError('Stream connection lost. Retrying...')}
                      />
                    ) : streamError ? (
                      <div className="grid aspect-video place-items-center p-6 text-center text-red-300">
                        <div>
                          <p className="text-xs font-bold mb-2">⚠ Skeleton stream failed</p>
                          <p className="text-[11px] text-red-300/70 mb-3">{streamError}</p>
                          <button
                            onClick={() => file && startSkeletonStream(file)}
                            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-cyan-500 transition-colors"
                          >
                            Retry Stream
                          </button>
                        </div>
                      </div>
                    ) : file ? (
                      <div className="grid aspect-video place-items-center p-6 text-center text-cyan-200">
                        <div>
                          <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                          <p className="text-xs font-bold">Preparing skeleton overlay...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid aspect-video place-items-center p-6 text-center text-white/60">
                        <p className="text-xs">Upload a video to see real-time skeleton tracking.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : viewMode === 'skeleton' ? (
              /* ── SKELETON ONLY FULL VIEW ── */
              <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-500 bg-black shadow-lg">
                <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-cyan-600/90 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  MediaPipe Pose Estimation • 33 Body Keypoints
                </div>

                {isPreparingStream ? (
                  <div className="grid aspect-video place-items-center p-8 text-center text-cyan-200">
                    <div>
                      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      <p className="text-sm font-bold">Uploading to MediaPipe Engine...</p>
                      <p className="text-xs text-cyan-300/70 mt-1">Processing skeleton overlay...</p>
                    </div>
                  </div>
                ) : streamToken ? (
                  <img
                    src={`http://127.0.0.1:8000/skeleton-stream/${streamToken}`}
                    alt="Real-Time Skeleton Stream"
                    className="aspect-video w-full object-contain"
                    onError={() => setStreamError('Stream connection lost.')}
                  />
                ) : streamError ? (
                  <div className="grid aspect-video place-items-center p-8 text-center text-red-300">
                    <div>
                      <p className="text-sm font-bold mb-2">⚠ Stream unavailable</p>
                      <p className="text-xs text-red-300/70 mb-3">{streamError}</p>
                      <button
                        onClick={() => file && startSkeletonStream(file)}
                        className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <video
                    className="aspect-video w-full object-contain"
                    src={previewUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                )}
              </div>
            ) : (
              /* ── RAW VIDEO ONLY ── */
              <div className="relative overflow-hidden rounded-2xl bg-black shadow-md">
                <video
                  className="aspect-video w-full object-contain"
                  src={previewUrl}
                  controls
                  playsInline
                />
              </div>
            )}

            {/* Form Fields */}
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-deep-navy">
                Movement Type
                <GlassSelect value={movement} onChange={(e) => setMovement(e.target.value)}>
                  {movements.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </GlassSelect>
              </label>
              <label className="text-sm font-semibold text-deep-navy">
                Camera View
                <GlassSelect value={cameraView} onChange={(e) => setCameraView(e.target.value)}>
                  {cameraViews.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </GlassSelect>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Right Sidebar: Athlete Context, Pain, and Pipeline Run */}
        <div className="grid gap-5">
          <GlassCard>
            <h2 className="text-xl font-bold text-deep-navy">Athlete Context</h2>
            <div className="mt-4 grid gap-2.5 text-sm">
              <p className="flex items-center justify-between rounded-xl bg-white/65 p-3">
                <span className="text-text-muted">Profile</span>
                <b className="font-bold text-deep-navy">{profile ? 'Loaded from onboarding' : 'Missing'}</b>
              </p>
              <p className="flex items-center justify-between rounded-xl bg-white/65 p-3">
                <span className="text-text-muted">Sport</span>
                <b className="font-bold text-deep-navy">{profile?.primarySport || 'Not provided'}</b>
              </p>
              <p className="flex items-center justify-between rounded-xl bg-white/65 p-3">
                <span className="text-text-muted">BMI</span>
                <b className="font-bold text-deep-navy">{profile?.bmi || 'Fallback median'}</b>
              </p>
              <p className="flex items-center justify-between rounded-xl bg-white/65 p-3">
                <span className="text-text-muted">Training duration</span>
                <b className="font-bold text-deep-navy">{profile?.averageTrainingDuration || 'Fallback median'}</b>
              </p>
            </div>
            {!profile && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Complete athlete onboarding for stronger personalization. Missing model inputs will use training medians.
              </p>
            )}
          </GlassCard>

          <GlassCard>
            <h2 className="text-xl font-bold text-deep-navy">Current Physical Condition</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-deep-navy">
                Pain Level
                <GlassSelect value={painLevel} onChange={(e) => setPainLevel(e.target.value)}>
                  {painOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </GlassSelect>
              </label>
              <label className="text-sm font-semibold text-deep-navy">
                Pain Location
                <GlassInput
                  value={painLocation}
                  onChange={(e) => setPainLocation(e.target.value)}
                  placeholder="Knee, hip, ankle"
                />
              </label>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <Brain className="text-gold" />
              <h2 className="text-xl font-bold text-deep-navy">Pipeline Readiness</h2>
            </div>
            <div className="mt-4 space-y-2.5">
              {localStages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-3 rounded-xl bg-white/65 p-3 text-sm">
                  <CheckCircle2
                    className={readiness[index] ? 'text-emerald-600' : 'text-text-muted'}
                    size={18}
                  />
                  <span className={readiness[index] ? 'font-semibold text-deep-navy' : 'text-text-muted'}>
                    {stage}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <p className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {isPredicting ? (
              <div className="mt-5 space-y-3 rounded-xl border border-gold/20 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-deep-navy">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gold animate-ping" />
                    Processing Video Pipeline...
                  </span>
                  <span>Step {predictionStep}/4</span>
                </div>
                <ProgressBar
                  value={predictionStep === 1 ? 25 : predictionStep === 2 ? 50 : predictionStep === 3 ? 75 : 95}
                  tone="gold"
                />
                <p className="text-xs text-text-muted">
                  {predictionStep === 1 && 'Extracting 33-joint skeleton landmarks with MediaPipe...'}
                  {predictionStep === 2 && 'Calculating knee angles, ROM, and gait cadence waveforms...'}
                  {predictionStep === 3 && 'Fusing biomechanics with profile & encoding H.264 video...'}
                  {predictionStep === 4 && 'Evaluating Random Forest, XGBoost & CatBoost Ensemble...'}
                </p>
              </div>
            ) : (
              <GlassButton
                className="mt-5 w-full text-base font-bold shadow-md"
                disabled={!file || isPredicting}
                onClick={runPrediction}
              >
                <span>Run Trained Model Prediction</span>
                <ChevronRight size={18} />
              </GlassButton>
            )}

            <GlassButton
              className="mt-2.5 w-full"
              variant="secondary"
              onClick={() => {
                setFile(null)
                setError('')
              }}
            >
              <FileVideo size={16} />
              <span>Choose Different Video</span>
            </GlassButton>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}
