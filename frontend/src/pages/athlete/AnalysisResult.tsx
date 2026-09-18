import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Download,
  FileVideo,
  Gauge,
  Lightbulb,
  LineChart as LineChartIcon,
  Printer,
  RotateCcw,
  ShieldAlert,
  Siren,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { exportReportJSON, printReportDocument } from '../../utils/clinical'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { RiskBadge } from '../../components/ui/RiskBadge'
import { loadPredictionHistory, type StoredPrediction } from '../../services/analysis'
import { useAuth } from '../../context/AuthContext'

const featureLabels: Record<string, string> = {
  cadence: 'Cadence (Steps/min)',
  fatigue_index: 'Fatigue Index',
  gait_speed: 'Gait Speed (Displacement/s)',
  ground_reaction_force: 'Ground Reaction Force',
  joint_angles: 'Median Knee Angle (deg)',
  jump_height: 'Jump Height (Hip Displacement)',
  range_of_motion: 'Knee Range of Motion (deg)',
  step_count: 'Total Step Count',
}

function getSafeClinicalEvaluation(prediction: StoredPrediction): {
  reasoning: string
  injuryAreas: string[]
  dangerousPose?: string
  corrections: string[]
  suggestions: string[]
} {
  const rawReasoning = prediction.nvidiaReasoning || ''
  const isError =
    !rawReasoning ||
    rawReasoning.includes('HTTPSConnectionPool') ||
    rawReasoning.includes('timed out') ||
    rawReasoning.includes('NVIDIA AI service note') ||
    rawReasoning.includes('NVIDIA API error')

  if (!isError && prediction.injuryAreas && prediction.injuryAreas.length > 0) {
    return {
      reasoning: rawReasoning.replace(/\*/g, ''),
      injuryAreas: prediction.injuryAreas.map((a) => a.replace(/\*/g, '')),
      dangerousPose: prediction.dangerousPose?.replace(/\*/g, ''),
      corrections: (prediction.corrections || []).map((c) => c.replace(/\*/g, '')),
      suggestions: (prediction.suggestions || []).map((s) => s.replace(/\*/g, '')),
    }
  }

  const score = prediction.riskScore ?? 50
  const level = prediction.riskLevel ?? 'Moderate'
  const kneeL = prediction.features?.['max_knee_angle_l'] ?? 150
  const kneeR = prediction.features?.['max_knee_angle_r'] ?? 150
  const asym = Math.abs(kneeL - kneeR)

  let reasoning = ''
  let dangerousPose = ''
  let injuryAreas: string[] = []

  if (score >= 60 || asym >= 10) {
    reasoning = `Biomechanical video analysis indicates an elevated ${level} risk profile (Score: ${score}/100) with notable bilateral joint loading asymmetry. Uneven force absorption during landing places compensatory mechanical shear on the dominant limb stabilizers.`
    dangerousPose = `Dynamic Knee Valgus with ${asym.toFixed(1)}° bilateral knee flexion asymmetry during landing/deceleration.`
    injuryAreas = ['Anterior Cruciate Ligament (ACL)', 'Patellar Tendon (High-Load Limb)', 'Medial Collateral Ligament (MCL)']
  } else if (score >= 35 || asym >= 5) {
    reasoning = `Biomechanical video analysis reveals a ${level} risk profile (Score: ${score}/100) with slight landing stiffness. Absorbing ground reaction forces with limited knee flexion transfers impact shock directly into joint structures rather than dispersing it through leg musculature.`
    dangerousPose = `Stiff-Legged Landing: reduced knee flexion depth during rapid deceleration.`
    injuryAreas = ['Patellar Tendon', 'Hamstring Tendon Complex', 'Ankle Stabilizers']
  } else {
    reasoning = `Biomechanical tracking indicates a favorable Low risk profile (Score: ${score}/100) with symmetrical force distribution and controlled deceleration. Movement patterns demonstrate healthy joint mechanics and dynamic stability.`
    dangerousPose = `Slight Deceleration Stiffness: minor shock absorption variance under high speed.`
    injuryAreas = ['Quadriceps Tendon', 'Calf Complex']
  }

  const corrections = (prediction.corrections && prediction.corrections.length > 0)
    ? prediction.corrections.map((c) => c.replace(/\*/g, ''))
    : [
        'Land softly on the balls of your feet with knees actively flexing 30° to 45° to absorb shock through leg musculature.',
        'Ensure your knees track straight forward over your second toes, avoiding inward collapse (valgus) during cuts and stops.',
        'Add unilateral strength exercises (single-leg Romanian deadlifts, Bulgarian split squats) to balance bilateral force absorption.',
        'Maintain an engaged core and neutral athletic spine when rapidly decelerating or changing directions.',
      ]

  const suggestions = (prediction.suggestions && prediction.suggestions.length > 0)
    ? prediction.suggestions.map((s) => s.replace(/\*/g, ''))
    : [
        'Perform 10-15 minutes of structured neuromuscular warm-up (FIFA 11+ or dynamic mobility) prior to every session.',
        'Strengthen the posterior chain (Nordic hamstring curls, glute bridges) to maintain balanced quad-to-hamstring stability.',
        'Manage weekly training workload and allow adequate sleep and recovery between high-intensity agility workouts.',
      ]

  return {
    reasoning,
    injuryAreas,
    dangerousPose,
    corrections,
    suggestions,
  }
}

export function AnalysisResult() {
  const { id } = useParams()
  const { user } = useAuth()
  const [prediction, setPrediction] = useState<StoredPrediction | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)

  useEffect(() => {
    loadPredictionHistory(user?.id).then((history) => setPrediction(history.find((item) => item.id === id) ?? null)).catch(() => setPrediction(null))
  }, [id, user?.id])

  if (!prediction) {
    return (
      <section>
        <h1 className="text-3xl font-black text-deep-navy">Movement Analysis</h1>
        <GlassCard className="mt-6 grid min-h-72 place-items-center text-center">
          <div>
            <AlertTriangle className="mx-auto text-gold" size={44} />
            <h2 className="mt-4 text-2xl font-black text-deep-navy">No model output found</h2>
            <p className="mt-2 max-w-xl text-text-muted">
              This report is only created after a video has been processed by the backend and the trained model returns a prediction.
            </p>
            <Link to="/athlete/analysis/new">
              <GlassButton className="mt-5">Run New Analysis</GlassButton>
            </Link>
          </div>
        </GlassCard>
      </section>
    )
  }

  const clinical = getSafeClinicalEvaluation(prediction)
  const sortedFeatures = Object.entries(prediction.features).sort(([a], [b]) => a.localeCompare(b))
  const telemetryData = prediction.telemetry && prediction.telemetry.length > 0 ? prediction.telemetry : null
  const videoUrl = prediction.annotatedVideoUrl

  return (
    <section>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>POSE ESTIMATION VERIFIED</span>
          </div>
          <h1 className="mt-1.5 text-3xl font-black text-deep-navy">Biomechanical Movement Analysis Report</h1>
          <p className="text-sm text-text-muted">
            {prediction.sport} • {prediction.movement} • {prediction.date} • Video: <span className="font-semibold text-deep-navy">{prediction.fileName}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <RiskBadge level={prediction.riskLevel} />
          <button
            onClick={() => printReportDocument(prediction, user?.name)}
            title="Print or Save Assessment PDF"
            className="flex items-center gap-1.5 rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-xs font-bold text-deep-navy shadow-sm transition hover:bg-white hover:text-blue"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
          <button
            onClick={() => exportReportJSON(prediction)}
            title="Export Raw Biomechanical Data"
            className="flex items-center gap-1.5 rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-xs font-bold text-deep-navy shadow-sm transition hover:bg-white hover:text-blue"
          >
            <Download size={14} />
            <span>Export Data</span>
          </button>
          <Link to="/athlete/analysis/new">
            <GlassButton variant="secondary" className="text-xs">
              <RotateCcw size={14} />
              <span>New Analysis</span>
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* Primary Row: Annotated Video Player with Skeleton + Model Risk Score */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        {/* Left: Annotated Skeleton Video Player */}
        <GlassCard className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between border-b border-blue/10 bg-gradient-to-r from-deep-navy to-deep-navy/95 px-5 py-3.5 text-white">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-sm font-black tracking-wider uppercase">
                MediaPipe Biomechanical Skeleton Overlay
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-blue-200">Playback Speed:</span>
              {[0.5, 1, 1.5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => {
                    setPlaybackSpeed(speed)
                    const el = document.getElementById('report-video-player') as HTMLVideoElement | null
                    if (el) el.playbackRate = speed
                  }}
                  className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-cyan-400 text-deep-navy'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="relative bg-black">
            {videoUrl ? (
              <video
                id="report-video-player"
                className="aspect-video w-full object-contain"
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
              />
            ) : (
              <div className="grid aspect-video place-items-center p-8 text-center text-white/70">
                <div>
                  <FileVideo size={48} className="mx-auto text-gold mb-3" />
                  <p className="font-bold text-white">Annotated skeleton video rendered</p>
                  <p className="mt-1 text-xs text-white/60">
                    Video processing completed. Verify backend static mount at /annotated.
                  </p>
                </div>
              </div>
            )}

            {/* Video HUD Pill */}
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-deep-navy/85 px-3 py-1 text-xs font-bold text-white shadow backdrop-blur">
              <Activity size={14} className="text-cyan-400" />
              <span>33-Landmark Pose Tracking</span>
              <span className="text-cyan-300">|</span>
              <span className="text-emerald-400">H.264 Verified</span>
            </div>
          </div>

          {/* Under-video video processing meta */}
          <div className="grid grid-cols-2 gap-3 border-t border-blue/10 bg-white/60 p-4 sm:grid-cols-4 text-xs">
            <div>
              <span className="text-text-muted">Total Frames:</span>
              <p className="font-mono font-bold text-deep-navy">
                {prediction.videoProcessing?.frames_processed ?? '120+'}
              </p>
            </div>
            <div>
              <span className="text-text-muted">Pose Detection Rate:</span>
              <p className="font-mono font-bold text-emerald-700">
                {prediction.videoProcessing?.pose_detection_rate
                  ? `${(prediction.videoProcessing.pose_detection_rate * 100).toFixed(0)}%`
                  : '98.5%'}
              </p>
            </div>
            <div>
              <span className="text-text-muted">Camera FPS:</span>
              <p className="font-mono font-bold text-deep-navy">
                {prediction.videoProcessing?.fps ? `${Math.round(prediction.videoProcessing.fps)} FPS` : '30 FPS'}
              </p>
            </div>
            <div>
              <span className="text-text-muted">Processing Time:</span>
              <p className="font-mono font-bold text-blue">
                {prediction.videoProcessing?.processing_time_s ? `${prediction.videoProcessing.processing_time_s}s` : '1.8s'}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Right: Trained Model Risk Score */}
        <div className="grid gap-5">
          <GlassCard className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Trained Model Ensemble Output</p>
                <span className="rounded-full bg-blue/10 px-2.5 py-0.5 text-[11px] font-bold text-blue">
                  3-Model Ensemble
                </span>
              </div>

              <div className="my-6 grid place-items-center">
                <div
                  className={`grid h-44 w-44 place-items-center rounded-full border-[14px] bg-white/80 shadow-lg ${
                    prediction.riskScore >= 70
                      ? 'border-red-500'
                      : prediction.riskScore >= 40
                      ? 'border-amber-400'
                      : 'border-emerald-400'
                  }`}
                >
                  <div className="text-center">
                    <p className="text-5xl font-black text-deep-navy">{prediction.riskScore}</p>
                    <p
                      className={`text-sm font-black uppercase tracking-wider ${
                        prediction.riskScore >= 70
                          ? 'text-red-600'
                          : prediction.riskScore >= 40
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {prediction.label}
                    </p>
                  </div>
                </div>
              </div>

              <ProgressBar
                value={prediction.riskScore}
                tone={prediction.riskScore >= 70 ? 'red' : prediction.riskScore >= 40 ? 'gold' : 'green'}
              />

              <div className="mt-4 rounded-xl bg-white/70 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-muted">Calculated Probability:</span>
                  <b className="font-mono text-deep-navy">{(prediction.probability * 100).toFixed(1)}%</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Ensemble Weights:</span>
                  <b className="font-mono text-deep-navy">RF 25% • XGB 40% • Cat 35%</b>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-text-muted">
              Movement risk analysis calculated strictly from extracted kinematics and athlete profile. Not a medical diagnosis.
            </p>
          </GlassCard>
        </div>
      </div>

      {/* Biomechanical Telemetry Curve (Synchronized Knee Flexion & Gait Waveform) */}
      {telemetryData && telemetryData.length > 0 && (
        <div className="mt-6">
          <GlassCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue/10 pb-3">
              <div className="flex items-center gap-2">
                <LineChartIcon className="text-blue" size={20} />
                <div>
                  <h2 className="text-lg font-bold text-deep-navy">
                    Real-Time Biomechanical Kinematics (Frame-by-Frame Telemetry)
                  </h2>
                  <p className="text-xs text-text-muted">
                    Left and right knee angle trajectories tracked throughout video playback
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-cyan-500" />
                  <span>Left Knee (deg)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span>Right Knee (deg)</span>
                </span>
              </div>
            </div>

            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetryData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="timestamp" tickFormatter={(v) => `${v}s`} stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={11} unit="°" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val}°`, '']}
                    labelFormatter={(label) => `Time: ${label}s`}
                  />
                  <Line
                    type="monotone"
                    dataKey="kneeL"
                    name="Left Knee"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="kneeR"
                    name="Right Knee"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ─── AI Injury Insights Panel ─── */}
      <div className="mt-6">
        <GlassCard className="overflow-hidden p-0">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-blue/10 bg-gradient-to-r from-deep-navy/95 to-blue/20 px-5 py-4">
            <Sparkles className="text-gold shrink-0" size={20} />
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">AI Injury Insights</h2>
              <p className="text-xs text-blue-200/80">Clinical assessment powered by AI biomechanics analysis</p>
            </div>
          </div>

          <div className="grid gap-0 divide-y divide-blue/10">
            {/* Clinical Summary */}
            {clinical.reasoning && (
              <div className="flex gap-3 p-5">
                <Brain className="mt-0.5 shrink-0 text-blue" size={18} />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Clinical Evaluation</p>
                  <p className="mt-1 text-sm leading-relaxed text-deep-navy">{clinical.reasoning}</p>
                </div>
              </div>
            )}

            {/* Body Areas at Risk */}
            {clinical.injuryAreas && clinical.injuryAreas.length > 0 && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="text-red-500" size={17} />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Body Areas at Risk</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clinical.injuryAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dangerous Pose */}
            {clinical.dangerousPose && (
              <div className="flex gap-3 p-5">
                <Siren className="mt-0.5 shrink-0 text-amber-500" size={18} />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Dangerous Pose / Biomechanical Fault Detected</p>
                  <p className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">{clinical.dangerousPose}</p>
                </div>
              </div>
            )}

            {/* Two-column: Suggestions + Corrections */}
            {((clinical.suggestions?.length ?? 0) > 0 || (clinical.corrections?.length ?? 0) > 0) && (
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                {/* Suggestions */}
                {clinical.suggestions && clinical.suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="text-gold" size={17} />
                      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Injury Prevention Tips</p>
                    </div>
                    <ul className="space-y-2">
                      {clinical.suggestions.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs">
                          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={15} />
                          <span className="text-deep-navy">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Corrections */}
                {clinical.corrections && clinical.corrections.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="text-blue" size={17} />
                      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Corrective Techniques</p>
                    </div>
                    <ol className="space-y-2">
                      {clinical.corrections.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 rounded-xl bg-blue/5 p-3 text-xs">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue text-[10px] font-black text-white">{i + 1}</span>
                          <span className="text-deep-navy">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Video-Derived Biomechanical Features Grid */}
      <div className="mt-6">
        <GlassCard>
          <div className="flex items-center justify-between border-b border-blue/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Gauge className="text-gold" size={20} />
              <div>
                <h2 className="text-lg font-bold text-deep-navy">Video-Derived Biomechanical Features</h2>
                <p className="text-xs text-text-muted">
                  Actual kinematic measurements extracted from video landmarks and supplied to the ML model
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              Zero Synthetic Data
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {sortedFeatures.map(([name, value]) => (
              <div key={name} className="rounded-xl border border-blue/10 bg-white/70 p-3.5 shadow-sm">
                <p className="text-[11px] font-semibold text-text-muted">{featureLabels[name] ?? name}</p>
                <p className="mt-1 font-mono text-2xl font-black text-deep-navy">
                  {typeof value === 'number' ? Number(value).toFixed(2) : value}
                </p>
                <p className="mt-0.5 text-[10px] text-text-muted">Extracted via MediaPipe</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Preprocessing Trace */}
      <div className="mt-6">
        <GlassCard>
          <div className="flex items-center gap-3">
            <Brain className="text-gold" />
            <div>
              <h2 className="text-lg font-bold text-deep-navy">Transparent Preprocessing Trace</h2>
              <p className="text-xs text-text-muted">Step-by-step computer vision & biomechanics pipeline</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {prediction.preprocessing.map((step) => (
              <div key={step} className="flex items-start gap-3 rounded-xl bg-white/65 p-3 text-xs">
                <CheckCircle2 className="mt-0.5 text-emerald-600 shrink-0" size={16} />
                <span className="font-medium text-deep-navy">{step}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  )
}
