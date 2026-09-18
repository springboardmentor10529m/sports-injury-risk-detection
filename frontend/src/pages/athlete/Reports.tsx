import {
  Activity,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Video,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { RiskBadge } from '../../components/ui/RiskBadge'
import { useAuth } from '../../context/AuthContext'
import {
  loadPredictionHistory,
  saveLatestPrediction,
  type StoredPrediction,
} from '../../services/analysis'
import { exportReportJSON, getSafeClinicalEvaluation, printReportDocument } from '../../utils/clinical'

type RiskFilter = 'All' | 'Low' | 'Moderate' | 'High'
type SortOrder = 'newest' | 'oldest' | 'highest-risk' | 'lowest-risk'

export function Reports() {
  const { user } = useAuth()
  const [reports, setReports] = useState<StoredPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('All')
  const [sortBy, setSortBy] = useState<SortOrder>('newest')

  const fetchReports = () => {
    setLoading(true)
    loadPredictionHistory(user?.id)
      .then((data) => setReports(data))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchReports()
  }, [user?.id])

  // Filter & Sort
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        if (riskFilter !== 'All' && r.riskLevel !== riskFilter) return false
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
          r.movement.toLowerCase().includes(q) ||
          r.sport.toLowerCase().includes(q) ||
          r.fileName.toLowerCase().includes(q) ||
          r.date.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        }
        if (sortBy === 'oldest') {
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        }
        if (sortBy === 'highest-risk') {
          return (b.riskScore ?? 50) - (a.riskScore ?? 50)
        }
        if (sortBy === 'lowest-risk') {
          return (a.riskScore ?? 50) - (b.riskScore ?? 50)
        }
        return 0
      })
  }, [reports, riskFilter, searchQuery, sortBy])

  // Stats
  const totalReports = reports.length
  const avgRiskScore = totalReports
    ? Math.round(reports.reduce((acc, r) => acc + (r.riskScore ?? 50), 0) / totalReports)
    : 0
  const lowRiskCount = reports.filter((r) => r.riskLevel === 'Low').length
  const highRiskCount = reports.filter((r) => r.riskLevel === 'High').length
  const optimalPercentage = totalReports ? Math.round((lowRiskCount / totalReports) * 100) : 0

  // Seed sample report helper for testing
  const generateSampleReport = async () => {
    const sampleId = `analysis-${Date.now()}`
    const sample: StoredPrediction = {
      id: sampleId,
      athleteId: user?.id || 'demo-athlete-id',
      sport: 'Athletics / Running',
      movement: 'Running Gait',
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      fileName: 'running_gait_assessment.mp4',
      riskScore: 32,
      riskLevel: 'Low',
      label: 'NO RISK',
      probability: 0.28,
      features: {
        max_knee_angle_l: 154.2,
        max_knee_angle_r: 151.8,
        knee_symmetry: 97.4,
        range_of_motion: 88.5,
        cadence: 178,
        pelvic_tilt: 4.2,
      },
      warnings: [],
      preprocessing: ['StandardScaler', 'Pose-Landmark Extraction'],
      model: {
        source: 'MotionGuard Biomechanical Ensemble',
        models: ['RandomForestClassifier', 'DecisionTreeClassifier'],
        weights: { rf: 0.65, dt: 0.35 },
        featureCount: 6,
      },
    }
    await saveLatestPrediction(sample)
    fetchReports()
  }

  return (
    <section className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue/20 bg-blue/10 px-3 py-1 text-xs font-bold text-blue">
            <CheckCircle2 size={13} />
            <span>CLINICAL REPORT REPOSITORY</span>
          </div>
          <h1 className="mt-1.5 text-3xl font-black text-deep-navy">Movement Assessment Reports</h1>
          <p className="text-sm text-text-muted">
            Official biomechanical assessments, injury risk screenings, and clinical kinematic evaluations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/athlete/analysis/new">
            <GlassButton variant="primary">
              <Plus size={16} /> Run New Analysis
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* Stats Summary Banner */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GlassCard className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue/10 text-blue shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Reports</p>
              <p className="text-xl font-black text-deep-navy">{totalReports}</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/10 text-gold shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted">Average Risk</p>
              <p className="text-xl font-black text-deep-navy">
                {avgRiskScore}
                <span className="text-xs font-normal text-text-muted">/100</span>
              </p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted">Optimal Mechanics</p>
              <p className="text-xl font-black text-emerald-600">{optimalPercentage}%</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-500 shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted">High Risk Sessions</p>
              <p className="text-xl font-black text-red-500">{highRiskCount}</p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Filter and Search Bar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search reports by movement, sport, or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/50 py-2 pl-9 pr-3 text-sm text-deep-navy placeholder:text-text-muted focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            />
          </div>

          {/* Risk Filters */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-muted mr-1 hidden sm:inline">Risk:</span>
            {(['All', 'Low', 'Moderate', 'High'] as RiskFilter[]).map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  riskFilter === level
                    ? 'bg-deep-navy text-white shadow-sm'
                    : 'bg-white/40 text-text-muted hover:bg-white/70'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOrder)}
              className="rounded-xl border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-bold text-deep-navy focus:border-blue focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest-risk">Highest Risk</option>
              <option value="lowest-risk">Lowest Risk</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Reports List */}
      {loading ? (
        <div className="grid min-h-60 place-items-center">
          <div className="flex flex-col items-center gap-3 text-text-muted">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue border-t-transparent" />
            <p className="text-sm">Loading biomechanical reports...</p>
          </div>
        </div>
      ) : filteredReports.length === 0 ? (
        <GlassCard className="grid min-h-80 place-items-center text-center p-8">
          <div className="max-w-md">
            <FileText className="mx-auto text-gold" size={54} />
            <h2 className="mt-4 text-2xl font-black text-deep-navy">
              {reports.length === 0 ? 'No assessment reports yet' : 'No matching reports found'}
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              {reports.length === 0
                ? 'Complete your first video analysis to produce an in-depth clinical kinematic and injury risk report.'
                : 'Try adjusting your search terms or risk filters to find the report you are looking for.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/athlete/analysis/new">
                <GlassButton variant="primary">
                  <Video size={16} /> Run Video Analysis
                </GlassButton>
              </Link>
              {reports.length === 0 && (
                <GlassButton variant="secondary" onClick={generateSampleReport}>
                  <Plus size={16} /> Generate Demo Report
                </GlassButton>
              )}
            </div>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredReports.map((report) => {
            const clinical = getSafeClinicalEvaluation(report)
            const kneeL = report.features?.['max_knee_angle_l']
            const kneeR = report.features?.['max_knee_angle_r']
            const symmetry =
              report.features?.['knee_symmetry'] ??
              (kneeL != null && kneeR != null ? Math.max(0, 100 - Math.abs(kneeL - kneeR) * 2) : 92)

            return (
              <GlassCard
                key={report.id}
                className="flex flex-col justify-between border-white/60 p-5 transition-all hover:border-blue/30 hover:shadow-lg"
              >
                <div>
                  {/* Top Bar: Date & Risk Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-black/5 pb-3">
                    <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                      <Calendar size={13} />
                      <span>{report.date}</span>
                    </div>
                    <RiskBadge level={report.riskLevel} />
                  </div>

                  {/* Title & Sport */}
                  <div className="mt-3">
                    <h2 className="text-xl font-black text-deep-navy">
                      {report.movement}
                    </h2>
                    <p className="text-xs text-text-muted font-medium mt-0.5">
                      {report.sport} • <span className="font-semibold text-deep-navy">{report.fileName}</span>
                    </p>
                  </div>

                  {/* Risk Score Gauge */}
                  <div className="mt-4 rounded-xl bg-slate-50/80 p-3 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-deep-navy">Kinematic Risk Score</span>
                      <span className="text-base font-black text-deep-navy">
                        {report.riskScore ?? 50}
                        <span className="text-xs font-normal text-text-muted">/100</span>
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          report.riskLevel === 'High'
                            ? 'bg-red-500'
                            : report.riskLevel === 'Moderate'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, report.riskScore ?? 50)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                      <span>Symmetry: <strong>{Math.round(symmetry)}%</strong></span>
                      <span>Ensemble Confidence: <strong>{Math.round((report.probability ?? 0.5) * 100)}%</strong></span>
                    </div>
                  </div>

                  {/* Clinical Assessment Excerpt */}
                  <div className="mt-3.5">
                    <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                      {clinical.reasoning}
                    </p>
                  </div>

                  {/* Vulnerability Tags */}
                  {clinical.injuryAreas && clinical.injuryAreas.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {clinical.injuryAreas.slice(0, 2).map((area) => (
                        <span
                          key={area}
                          className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-100"
                        >
                          {area}
                        </span>
                      ))}
                      {clinical.injuryAreas.length > 2 && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-text-muted">
                          +{clinical.injuryAreas.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 border-t border-black/5 pt-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => printReportDocument(report, user?.name)}
                      title="Print / Save PDF Report"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/80 bg-white/70 text-deep-navy transition hover:bg-white hover:text-blue"
                    >
                      <Printer size={15} />
                    </button>
                    <button
                      onClick={() => exportReportJSON(report)}
                      title="Export Raw Data (JSON)"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/80 bg-white/70 text-deep-navy transition hover:bg-white hover:text-blue"
                    >
                      <Download size={15} />
                    </button>
                  </div>

                  <Link to={`/athlete/analysis/${report.id}`}>
                    <GlassButton variant="primary" className="text-xs py-1.5 px-3">
                      <span>View Full Report</span>
                      <ArrowUpRight size={13} />
                    </GlassButton>
                  </Link>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </section>
  )
}
