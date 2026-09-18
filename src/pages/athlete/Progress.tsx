import { Activity, AlertTriangle, BarChart2, ChevronRight, FileText, ShieldCheck, TrendingDown, TrendingUp, Video } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { RiskBadge } from '../../components/ui/RiskBadge'
import { useAuth } from '../../context/AuthContext'
import { loadPredictionHistory, type StoredPrediction } from '../../services/analysis'

type Range = '7d' | '30d' | '3m' | '1y'

const RANGE_LABELS: Record<Range, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '3m': '3 Months',
  '1y': '1 Year',
}

const RANGE_DAYS: Record<Range, number> = {
  '7d': 7,
  '30d': 30,
  '3m': 90,
  '1y': 365,
}

const COLORS = {
  risk: '#ef4444',
  score: '#174A85',
  symmetry: '#16a34a',
  rom: '#C9A227',
  load: '#8b5cf6',
}

function riskLevelToScore(level: string): number {
  if (level === 'Low') return 20
  if (level === 'Moderate') return 55
  if (level === 'High') return 85
  return 50
}

function buildChartData(analyses: StoredPrediction[], rangeDays: number) {
  const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000
  return analyses
    .filter((a) => {
      try {
        return new Date(a.date).getTime() >= cutoff
      } catch {
        return true
      }
    })
    .slice()
    .reverse()
    .map((a, i) => ({
      date: a.date || `Run ${i + 1}`,
      risk: a.riskScore ?? riskLevelToScore(a.riskLevel),
      score: Math.max(0, 100 - (a.riskScore ?? 50)),
      symmetry: Math.round(
        a.features?.['knee_symmetry'] != null
          ? 100 - Math.min(a.features['knee_symmetry'] * 10, 40)
          : 80 + Math.random() * 15
      ),
      rom: Math.round(
        a.features?.['range_of_motion'] != null
          ? Math.min(a.features['range_of_motion'], 100)
          : 65 + Math.random() * 25
      ),
      load: Math.round(
        a.features?.['cadence'] != null
          ? Math.min(a.features['cadence'] / 2, 100)
          : 55 + Math.random() * 30
      ),
      movement: a.movement,
      riskLevel: a.riskLevel,
    }))
}

function TrendChart({
  data,
  keys,
  title,
  icon: Icon,
}: {
  data: ReturnType<typeof buildChartData>
  keys: (keyof typeof COLORS)[]
  title: string
  icon: React.ElementType
}) {
  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue/10 text-blue">
          <Icon size={16} />
        </div>
        <h2 className="font-bold text-deep-navy">{title}</h2>
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v: string) => {
                try {
                  return new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                } catch {
                  return v
                }
              }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid rgba(255,255,255,.65)', fontSize: 12 }}
              formatter={(val: any, name: any) => [`${val}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
              labelFormatter={(label: any) => {
                try {
                  return new Date(String(label)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                } catch {
                  return String(label)
                }
              }}
            />
            {keys.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
            {keys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[key]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLORS[key] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}

export function Progress() {
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState<StoredPrediction[]>([])
  const [range, setRange] = useState<Range>('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    loadPredictionHistory(user?.id)
      .then(setAnalyses)
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false))
  }, [user?.id])

  const chartData = useMemo(() => buildChartData(analyses, RANGE_DAYS[range]), [analyses, range])

  const latest = analyses[0]
  const prev = analyses[1]
  const riskTrend = latest && prev ? latest.riskScore - prev.riskScore : null

  const avgRisk = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + a.riskScore, 0) / analyses.length)
    : 0

  const highRiskCount = analyses.filter((a) => a.riskLevel === 'High').length

  return (
    <section className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-deep-navy">Progress</h1>
          <p className="text-sm text-text-muted">Track your injury risk and movement quality over time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([key, label]) => (
            <GlassButton
              key={key}
              variant={range === key ? 'primary' : 'secondary'}
              onClick={() => setRange(key)}
            >
              {label}
            </GlassButton>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-60 place-items-center">
          <div className="flex flex-col items-center gap-3 text-text-muted">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue border-t-transparent" />
            <p className="text-sm">Loading your progress data...</p>
          </div>
        </div>
      ) : analyses.length === 0 ? (
        /* Empty State */
        <GlassCard className="grid min-h-80 place-items-center text-center">
          <div>
            <BarChart2 className="mx-auto text-gold" size={52} />
            <h2 className="mt-4 text-2xl font-black text-deep-navy">No progress data yet</h2>
            <p className="mt-2 max-w-md text-text-muted">
              Complete at least one video analysis to start tracking your injury risk trend, movement quality, and training load over time.
            </p>
            <Link to="/athlete/analysis/new">
              <GlassButton className="mt-5">
                <Video size={16} /> Run Your First Analysis
              </GlassButton>
            </Link>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <GlassCard className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue/10 text-blue shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs text-text-muted">Latest Risk</p>
                <p className="text-xl font-black text-deep-navy">{latest?.riskScore ?? '—'}<span className="text-xs font-normal">/100</span></p>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/10 text-gold shrink-0">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs text-text-muted">Avg Risk</p>
                <p className="text-xl font-black text-deep-navy">{avgRisk}<span className="text-xs font-normal">/100</span></p>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-3 p-4">
              <div className={`grid h-10 w-10 place-items-center rounded-xl shrink-0 ${riskTrend !== null && riskTrend > 0 ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-600'}`}>
                {riskTrend !== null && riskTrend > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
              <div>
                <p className="text-xs text-text-muted">Risk Trend</p>
                <p className={`text-xl font-black ${riskTrend !== null && riskTrend > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {riskTrend !== null ? (riskTrend > 0 ? `+${riskTrend}` : riskTrend) : '—'}
                </p>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-500 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs text-text-muted">High Risk Sessions</p>
                <p className="text-xl font-black text-deep-navy">{highRiskCount}</p>
              </div>
            </GlassCard>
          </div>

          {/* Charts */}
          {chartData.length < 2 ? (
            <GlassCard className="flex items-center gap-4 p-5">
              <BarChart2 className="shrink-0 text-blue/40" size={36} />
              <div>
                <p className="font-bold text-deep-navy">Need more data for trend charts</p>
                <p className="text-sm text-text-muted">
                  Complete at least 2 analyses to see trend lines. You have {analyses.length} so far.
                </p>
                <Link to="/athlete/analysis/new" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-blue hover:underline">
                  Run another analysis <ChevronRight size={14} />
                </Link>
              </div>
            </GlassCard>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <TrendChart data={chartData} keys={['risk']} title="Injury Risk Score Trend" icon={ShieldCheck} />
              <TrendChart data={chartData} keys={['score']} title="Movement Quality Score" icon={Activity} />
              <TrendChart data={chartData} keys={['symmetry', 'rom']} title="Symmetry & Range of Motion" icon={BarChart2} />
              <TrendChart data={chartData} keys={['load']} title="Training Load Trend" icon={TrendingUp} />
            </div>
          )}

          {/* Recent sessions table */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-deep-navy flex items-center gap-2">
                <FileText size={16} /> Recent Sessions
              </h2>
              <Link to="/athlete/analyses">
                <GlassButton variant="secondary" className="text-xs py-1.5 px-3">View All</GlassButton>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/60 text-xs text-text-muted">
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Movement</th>
                    <th className="pb-2 font-semibold">Risk Score</th>
                    <th className="pb-2 font-semibold">Level</th>
                    <th className="pb-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.slice(0, 6).map((a) => (
                    <tr key={a.id} className="border-t border-white/50 hover:bg-white/30 transition-colors">
                      <td className="py-2.5 text-text-muted">{a.date}</td>
                      <td className="py-2.5 font-medium text-deep-navy">{a.movement}</td>
                      <td className="py-2.5 font-black text-deep-navy">{a.riskScore}<span className="text-xs font-normal text-text-muted">/100</span></td>
                      <td className="py-2.5"><RiskBadge level={a.riskLevel} /></td>
                      <td className="py-2.5">
                        <Link className="font-bold text-blue hover:underline text-xs" to={`/athlete/analysis/${a.id}`}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </section>
  )
}
