import { Activity, AlertTriangle, Briefcase, Edit2, User, UserCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { RiskBadge } from '../../components/ui/RiskBadge'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { getCoachAthletes, type CoachAthlete } from '../../services/athlete'
import { getCoachProfile, type CoachProfile } from '../../services/coach'

export function Dashboard() {
  const { user } = useAuth()
  const [athletes, setAthletes] = useState<CoachAthlete[]>([])
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)

  useEffect(() => {
    getCoachAthletes(user).then(setAthletes).catch(() => setAthletes([]))
    if (user?.id) {
      getCoachProfile(user.id).then(setCoachProfile).catch(() => setCoachProfile(null))
    }
  }, [user])

  const analysed = athletes.filter((athlete) => athlete.lastAnalysis !== 'No analysis').length
  const attention = athletes.filter((athlete) => athlete.risk !== 'Low').length

  return (
    <section className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-deep-navy">Welcome back, {user?.name ?? 'Coach'}</h1>
          <p className="text-text-muted">Coach oversight hub for monitoring athlete biomechanics, injury flags, and training readiness.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/coach/profile">
            <GlassButton variant="secondary">
              <User size={18} /> Coach Profile
            </GlassButton>
          </Link>
          <Link to="/coach/athletes">
            <GlassButton>
              <Users size={18} /> View All Athletes
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Connected Athletes" value={String(athletes.length)} icon={Users} />
        <StatCard label="Accepted Connections" value={String(athletes.filter((athlete) => athlete.status === 'Accepted').length)} icon={UserCheck} />
        <StatCard label="Analysed Athletes" value={String(analysed)} icon={Activity} />
        <StatCard label="Requiring Attention" value={String(attention)} icon={AlertTriangle} />
      </div>

      {/* Coach Profile & Invitation Overview Card */}
      <GlassCard className="border border-white/80 bg-gradient-to-r from-white/70 via-white/85 to-white/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold/20 text-deep-navy">
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-deep-navy">Coach Profile & Affiliation</h2>
              <p className="text-xs text-text-muted">Your active coaching credentials and connection ID for athlete roster pairing</p>
            </div>
          </div>
          <Link to="/coach/profile">
            <GlassButton variant="secondary" className="text-xs py-1.5 px-3">
              <Edit2 size={14} /> Edit Coach Profile
            </GlassButton>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">Coach ID Code</p>
            <p className="mt-1 font-black text-gold">{coachProfile?.coachId || 'MG-COACH-101'}</p>
          </div>
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">Specialty / Sport</p>
            <p className="mt-1 font-black text-deep-navy truncate">{coachProfile?.specialty || 'Soccer & Athletic Conditioning'}</p>
          </div>
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">Organization</p>
            <p className="mt-1 font-black text-deep-navy truncate">{coachProfile?.organization || 'Metro Athletics Club'}</p>
          </div>
          <div className="rounded-xl bg-white/65 p-3">
            <p className="text-xs text-text-muted">Certification</p>
            <p className="mt-1 font-black text-emerald-700 truncate">{coachProfile?.certification || 'USSF A-Senior / CSCS'}</p>
          </div>
        </div>
      </GlassCard>

      {/* Connected Athletes Table */}
      <GlassCard className="overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-deep-navy">Connected Athletes</h2>
          <span className="text-xs text-text-muted">{athletes.length} athlete(s) in roster</span>
        </div>
        {athletes.length ? (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-text-muted">
                <th className="pb-3">Athlete Name</th>
                <th className="pb-3">Sport & Position</th>
                <th className="pb-3">Model Risk Level</th>
                <th className="pb-3">Last Analysis Date</th>
                <th className="pb-3">Connection Status</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a.id} className="border-t border-white/80">
                  <td className="py-4">
                    <Link className="font-bold text-blue hover:underline" to={`/coach/athletes/${a.id}`}>
                      {a.name}
                    </Link>
                  </td>
                  <td>{a.sport} ({a.position})</td>
                  <td><RiskBadge level={a.risk} /></td>
                  <td>{a.lastAnalysis}</td>
                  <td>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      a.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-sm text-text-muted">No athletes are connected to this coach yet.</p>
        )}
      </GlassCard>
    </section>
  )
}
