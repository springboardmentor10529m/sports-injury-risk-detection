import { Briefcase, CheckCircle2, Copy, Save, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { GlassInput } from '../../components/ui/GlassInput'
import { useAuth } from '../../context/AuthContext'
import { updateUserApi } from '../../services/auth'
import { getCoachProfile, saveCoachProfile, type CoachProfile as CoachProfileType } from '../../services/coach'

export function Profile() {
  const { user, updateUser } = useAuth()
  const [coachProfile, setCoachProfile] = useState<CoachProfileType>({
    userId: user?.id ?? 'demo-coach-id',
    name: user?.name ?? 'Coach Marcus',
    email: user?.email ?? 'coach@motionguard.local',
    phone: '+1 555-019-2834',
    country: 'United States',
    specialty: 'Soccer & Athletic Conditioning',
    organization: 'Metro Athletics Club',
    certification: 'USSF A-Senior / CSCS',
    yearsExperience: '12 years',
    coachId: 'MG-COACH-101',
    bio: 'Specialized in biomechanical injury risk reduction and high-performance athletic development.',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    getCoachProfile(user.id).then((profile) => {
      if (profile) {
        setCoachProfile(profile)
      } else {
        setCoachProfile((prev) => ({
          ...prev,
          userId: user.id,
          name: user.name ?? prev.name,
          email: user.email ?? prev.email,
        }))
      }
    })
  }, [user])

  function updateField<K extends keyof CoachProfileType>(field: K, val: CoachProfileType[K]) {
    setCoachProfile((prev) => ({ ...prev, [field]: val }))
  }

  function copyCoachId() {
    navigator.clipboard.writeText(coachProfile.coachId)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2500)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    setSaveSuccess(false)
    try {
      if (user?.id) {
        // 1. Sync account name
        await updateUserApi(user.id, {
          name: coachProfile.name,
          country: coachProfile.country,
          phone: coachProfile.phone,
        })
        updateUser({
          name: coachProfile.name,
          country: coachProfile.country,
          phone: coachProfile.phone,
        })

        // 2. Save coach profile details
        await saveCoachProfile(user.id, {
          ...coachProfile,
          userId: user.id,
        })
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setError(err?.message || 'Failed to save coach profile changes.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-deep-navy">Coach Profile & Credentials</h1>
          <p className="text-text-muted">
            Manage your coaching identity, athletic affiliations, certifications, and connection credentials.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/coach/dashboard">
            <GlassButton variant="secondary">Back to Dashboard</GlassButton>
          </Link>
          <GlassButton onClick={handleSave} disabled={isSaving}>
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </GlassButton>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-emerald-800 backdrop-blur-md">
          <CheckCircle2 className="text-emerald-600" size={22} />
          <div>
            <p className="font-bold">Coach Profile Updated Successfully!</p>
            <p className="text-sm">Your updated information and connection ID are saved in the database.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-500/15 border border-red-500/30 p-4 text-red-800 backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Coach Connection Card */}
      <GlassCard className="border border-white/80 bg-gradient-to-r from-white/70 via-white/85 to-white/70">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold">Athlete Connection Code</p>
            <h2 className="mt-1 text-2xl font-black text-deep-navy">{coachProfile.coachId}</h2>
            <p className="mt-1 text-xs text-text-muted">
              Athletes enter this ID or your email (<b>{user?.email}</b>) in their profile to link their risk analyses to your dashboard.
            </p>
          </div>
          <GlassButton type="button" variant="secondary" onClick={copyCoachId} className="flex items-center gap-2">
            <Copy size={16} />
            {copiedId ? 'Copied to Clipboard!' : 'Copy Coach ID'}
          </GlassButton>
        </div>
      </GlassCard>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <GlassCard>
          <div className="flex items-center gap-2 border-b border-white/60 pb-3">
            <User className="text-gold" size={20} />
            <h2 className="text-xl font-black text-deep-navy">Personal Details</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Full Name
              <GlassInput
                value={coachProfile.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                placeholder="Coach Marcus"
              />
            </label>
            <label className="text-sm font-semibold">
              Email Address
              <GlassInput value={user?.email || ''} disabled className="opacity-75 cursor-not-allowed" />
            </label>
            <label className="text-sm font-semibold">
              Contact Phone
              <GlassInput
                value={coachProfile.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 555-019-2834"
              />
            </label>
            <label className="text-sm font-semibold">
              Country
              <GlassInput
                value={coachProfile.country}
                onChange={(e) => updateField('country', e.target.value)}
                placeholder="United States"
              />
            </label>
          </div>
        </GlassCard>

        {/* Professional & Coaching Info */}
        <GlassCard>
          <div className="flex items-center gap-2 border-b border-white/60 pb-3">
            <Briefcase className="text-blue" size={20} />
            <h2 className="text-xl font-black text-deep-navy">Professional Experience & Affiliations</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Coaching Specialty / Primary Sport
              <GlassInput
                value={coachProfile.specialty}
                onChange={(e) => updateField('specialty', e.target.value)}
                required
                placeholder="Soccer & Athletic Conditioning"
              />
            </label>
            <label className="text-sm font-semibold">
              Club / Team / Organization
              <GlassInput
                value={coachProfile.organization}
                onChange={(e) => updateField('organization', e.target.value)}
                placeholder="Metro Athletics Club"
              />
            </label>
            <label className="text-sm font-semibold">
              Certifications & Qualifications
              <GlassInput
                value={coachProfile.certification}
                onChange={(e) => updateField('certification', e.target.value)}
                placeholder="USSF A-Senior / CSCS"
              />
            </label>
            <label className="text-sm font-semibold">
              Years of Coaching Experience
              <GlassInput
                value={coachProfile.yearsExperience}
                onChange={(e) => updateField('yearsExperience', e.target.value)}
                placeholder="12 years"
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Custom Coach Identifier (Used by athletes to link accounts)
              <GlassInput
                value={coachProfile.coachId}
                onChange={(e) => updateField('coachId', e.target.value)}
                required
                placeholder="MG-COACH-101"
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Coaching Philosophy & Bio
              <textarea
                rows={4}
                value={coachProfile.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                placeholder="Brief summary of your coaching methodologies, athlete load management philosophy..."
                className="w-full rounded-2xl border border-white/70 bg-white/60 p-3 text-sm outline-none backdrop-blur-xl transition focus:border-gold"
              />
            </label>
          </div>
        </GlassCard>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/coach/dashboard">
            <GlassButton type="button" variant="secondary">Cancel</GlassButton>
          </Link>
          <GlassButton type="submit" disabled={isSaving}>
            <Save size={18} />
            {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
          </GlassButton>
        </div>
      </form>
    </section>
  )
}
