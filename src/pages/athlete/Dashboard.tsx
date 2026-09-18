import { Activity, ChevronRight, Edit2, Gauge, Plus, ShieldCheck, User, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { RiskBadge } from '../../components/ui/RiskBadge'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { loadPredictionHistory, type StoredPrediction } from '../../services/analysis'
import { getAthleteProfile } from '../../services/profile'
import type { AthleteProfile } from '../../types/athlete'

export function Dashboard() {
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState<StoredPrediction[]>([])
  const [profile, setProfile] = useState<AthleteProfile | null>(null)

  useEffect(() => {
    loadPredictionHistory(user?.id).then(setAnalyses).catch(() => setAnalyses([]))
    if (user?.id) {
      getAthleteProfile(user.id).then(setProfile).catch(() => setProfile(null))
    }
  }, [user?.id])

  const latest = analyses[0]
  const averageRisk = analyses.length ? Math.round(analyses.reduce((sum, item) => sum + item.riskScore, 0) / analyses.length) : 0

  return (
    <section className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-deep-navy">Welcome back, {user?.name ?? 'Athlete'}</h1>
          <p className="text-text-muted">Your biometric injury risk dashboard powered by computer vision pose tracking and ensemble ML.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/athlete/profile">
            <GlassButton variant="secondary">
              <User size={18} /> My Profile
            </GlassButton>
          </Link>
          <Link to="/athlete/analysis/new">
            <GlassButton>
              <Plus size={18} /> New Analysis
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Latest Risk" value={latest ? `${latest.riskScore}/100` : 'No data'} sub={latest?.riskLevel ?? 'Upload video'} icon={ShieldCheck} />
        <StatCard label="Average Risk" value={analyses.length ? `${averageRisk}/100` : 'No data'} icon={Gauge} />
        <StatCard label="Processed Videos" value={String(analyses.length)} icon={Video} />
        <StatCard label="Model Runs" value={String(analyses.length)} icon={Activity} />
      </div>

      {/* Athlete Profile & Physical Metrics Section */}
      <GlassCard className="border border-white/80 bg-gradient-to-r from-white/70 via-white/85 to-white/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold/20 text-deep-navy">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-deep-navy">Athlete Profile & Physical Metrics</h2>
              <p className="text-xs text-text-muted">Current registered parameters fed into feature calculations</p>
            </div>
          </div>
          <Link to="/athlete/profile">
            <GlassButton variant="secondary" className="text-xs py-1.5 px-3">
              <Edit2 size={14} /> Edit Profile Details
            </GlassButton>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">Height</p>
            <p className="mt-1 font-black text-deep-navy">{profile?.height ? `${profile.height} cm` : '178 cm'}</p>
          </div>
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">Weight</p>
            <p className="mt-1 font-black text-deep-navy">{profile?.weight ? `${profile.weight} kg` : '72 kg'}</p>
          </div>
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">BMI</p>
            <p className="mt-1 font-black text-gold">{profile?.bmi || '22.7'}</p>
          </div>
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">Primary Sport</p>
            <p className="mt-1 font-black text-deep-navy truncate">{profile?.primarySport || 'Soccer'}</p>
          </div>
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">Position</p>
            <p className="mt-1 font-black text-deep-navy truncate">{profile?.playingPosition || 'Forward'}</p>
          </div>
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">Coach Affiliation</p>
            <p className="mt-1 font-black text-emerald-700 truncate">{profile?.coachInvitationStatus === 'Accepted' ? 'Connected' : 'Pending'}</p>
          </div>
        </div>
      </GlassCard>

      {analyses.length === 0 ? (
        <GlassCard className="grid min-h-80 place-items-center text-center">
          <div>
            <Video className="mx-auto text-gold" size={52} />
            <h2 className="mt-4 text-2xl font-black">Start with a real video analysis</h2>
            <p className="mt-2 max-w-xl text-text-muted">
              Upload a movement clip so the app can extract pose landmarks, prepare model features, and run your saved Random Forest/XGBoost predictor.
            </p>
            <Link to="/athlete/analysis/new">
              <GlassButton className="mt-5">Upload Video</GlassButton>
            </Link>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between border-b border-black/5 pb-3.5">
            <div>
              <h2 className="text-xl font-bold text-deep-navy">Recent Model Runs</h2>
              <p className="text-xs text-text-muted">Latest movement analyses and predicted injury risks</p>
            </div>
            <Link to="/athlete/analyses" className="inline-flex items-center gap-1 text-xs font-bold text-blue hover:underline">
              View All <ChevronRight size={13} />
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-black/5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  <th className="pb-3 pr-4 pl-1">Date</th>
                  <th className="pb-3 px-4">Movement</th>
                  <th className="pb-3 px-4">Risk Level</th>
                  <th className="pb-3 px-4 text-center">Score</th>
                  <th className="pb-3 px-4">Video File</th>
                  <th className="pb-3 pl-4 pr-1 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {analyses.slice(0, 6).map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-white/40">
                    <td className="py-3.5 pr-4 pl-1 text-xs text-text-muted whitespace-nowrap font-medium">
                      {a.date}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-deep-navy whitespace-nowrap">
                      {a.movement}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RiskBadge level={a.riskLevel} />
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="font-black text-deep-navy">{a.riskScore}</span>
                      <span className="text-[11px] text-text-muted">/100</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-text-muted">
                      <div className="max-w-[320px] truncate font-medium text-slate-700" title={a.fileName}>
                        {a.fileName}
                      </div>
                    </td>
                    <td className="py-3.5 pl-4 pr-1 text-right whitespace-nowrap">
                      <Link
                        to={`/athlete/analysis/${a.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue/20 bg-blue/10 px-3 py-1.5 text-xs font-bold text-blue transition hover:bg-blue hover:text-white"
                      >
                        View report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </section>
  )
}
