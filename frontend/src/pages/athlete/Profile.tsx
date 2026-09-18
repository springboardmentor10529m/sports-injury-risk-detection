import { CheckCircle2, Edit3, Heart, Plus, Save, Trash2, User, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { GlassInput } from '../../components/ui/GlassInput'
import { GlassSelect } from '../../components/ui/GlassSelect'
import { useAuth } from '../../context/AuthContext'
import { updateUserApi } from '../../services/auth'
import { getAthleteProfile, saveAthleteProfile } from '../../services/profile'
import type { AthleteProfile, PreviousInjury } from '../../types/athlete'

const emptyInjury: PreviousInjury = {
  type: 'ACL',
  bodyPart: 'Knee',
  side: 'Left',
  year: '2024',
  severity: 'Mild',
  recoveryDuration: '6 weeks',
  fullyRecovered: true,
  recurring: false,
}

export function Profile() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState<AthleteProfile>({
    userId: user?.id ?? 'demo-athlete-id',
    height: '178',
    weight: '72',
    bmi: '22.7',
    dominantSide: 'Right',
    gender: 'Female',
    bodyMeasurements: '',
    primarySport: 'Soccer',
    secondarySport: 'Athletics',
    playingPosition: 'Forward',
    competitiveLevel: 'Collegiate',
    yearsExperience: '5 years',
    trainingDaysPerWeek: '5 days/week',
    averageTrainingDuration: '90 minutes',
    hasPreviousInjury: false,
    injuries: [],
    coachEmail: 'coach@motionguard.local',
    coachId: 'MG-COACH-101',
    coachInvitationStatus: 'Accepted',
  })

  const [personalInfo, setPersonalInfo] = useState({
    name: user?.name ?? 'Alex Morgan',
    country: user?.country ?? 'United States',
    phone: user?.phone ?? '+1 555-014-9922',
    dateOfBirthOrAge: user?.dateOfBirthOrAge ?? '24',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    getAthleteProfile(user.id).then((saved) => {
      if (saved) setProfile(saved)
    })
    setPersonalInfo({
      name: user.name ?? 'Alex Morgan',
      country: user.country ?? 'United States',
      phone: user.phone ?? '',
      dateOfBirthOrAge: user.dateOfBirthOrAge ?? '24',
    })
  }, [user])

  function updateField<K extends keyof AthleteProfile>(field: K, value: AthleteProfile[K]) {
    setProfile((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'height' || field === 'weight') {
        const h = Number(field === 'height' ? value : next.height) / 100
        const w = Number(field === 'weight' ? value : next.weight)
        if (h > 0 && w > 0) {
          next.bmi = (w / (h * h)).toFixed(1)
        }
      }
      return next
    })
  }

  function updateInjuryItem(index: number, key: keyof PreviousInjury, val: any) {
    const nextInjuries = profile.injuries.map((inj, i) => (i === index ? { ...inj, [key]: val } : inj))
    updateField('injuries', nextInjuries)
  }

  function addInjury() {
    updateField('hasPreviousInjury', true)
    updateField('injuries', [...profile.injuries, { ...emptyInjury }])
  }

  function removeInjury(index: number) {
    const nextInjuries = profile.injuries.filter((_, i) => i !== index)
    updateField('injuries', nextInjuries)
    if (nextInjuries.length === 0) {
      updateField('hasPreviousInjury', false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    setSaveSuccess(false)
    try {
      if (user?.id) {
        // 1. Update user account details (name, country, phone, age)
        await updateUserApi(user.id, personalInfo)
        updateUser(personalInfo)

        // 2. Update athlete physical and athletic profile
        await saveAthleteProfile({
          ...profile,
          userId: user.id,
        })
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile changes.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-deep-navy">Athlete Profile & Physical Data</h1>
          <p className="text-text-muted">
            Manage your personal metrics, sports background, and injury history. These are used in your injury risk models.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/athlete/dashboard">
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
            <p className="font-bold">Profile Updated Successfully!</p>
            <p className="text-sm">All changes have been saved to the database and will be reflected across your analyses.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-500/15 border border-red-500/30 p-4 text-red-800 backdrop-blur-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal & Account Info */}
        <GlassCard>
          <div className="flex items-center gap-2 border-b border-white/60 pb-3">
            <User className="text-gold" size={20} />
            <h2 className="text-xl font-black text-deep-navy">Personal Details</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Full Name
              <GlassInput
                value={personalInfo.name}
                onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                required
                placeholder="Alex Morgan"
              />
            </label>
            <label className="text-sm font-semibold">
              Email Address
              <GlassInput value={user?.email || ''} disabled className="opacity-75 cursor-not-allowed" />
            </label>
            <label className="text-sm font-semibold">
              Country
              <GlassInput
                value={personalInfo.country}
                onChange={(e) => setPersonalInfo({ ...personalInfo, country: e.target.value })}
                placeholder="United States"
              />
            </label>
            <label className="text-sm font-semibold">
              Age or Date of Birth
              <GlassInput
                value={personalInfo.dateOfBirthOrAge}
                onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirthOrAge: e.target.value })}
                placeholder="24"
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Contact Phone
              <GlassInput
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                placeholder="+1 555-014-9922"
              />
            </label>
          </div>
        </GlassCard>

        {/* Physical Metrics */}
        <GlassCard>
          <div className="flex items-center justify-between border-b border-white/60 pb-3">
            <div className="flex items-center gap-2">
              <Heart className="text-red-500" size={20} />
              <h2 className="text-xl font-black text-deep-navy">Physical & Biometric Metrics</h2>
            </div>
            {profile.bmi && (
              <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-black text-deep-navy">
                Calculated BMI: {profile.bmi}
              </span>
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold">
              Height (cm)
              <GlassInput
                type="number"
                value={profile.height}
                onChange={(e) => updateField('height', e.target.value)}
                required
                placeholder="178"
              />
            </label>
            <label className="text-sm font-semibold">
              Weight (kg)
              <GlassInput
                type="number"
                value={profile.weight}
                onChange={(e) => updateField('weight', e.target.value)}
                required
                placeholder="72"
              />
            </label>
            <label className="text-sm font-semibold">
              Dominant Side
              <GlassSelect
                value={profile.dominantSide}
                onChange={(e) => updateField('dominantSide', e.target.value)}
                required
              >
                <option value="">Select Side</option>
                <option value="Right">Right</option>
                <option value="Left">Left</option>
                <option value="Both">Both</option>
              </GlassSelect>
            </label>
            <label className="text-sm font-semibold">
              Gender
              <GlassSelect value={profile.gender} onChange={(e) => updateField('gender', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
              </GlassSelect>
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Body Measurements / Anthropometry Notes
              <GlassInput
                value={profile.bodyMeasurements}
                onChange={(e) => updateField('bodyMeasurements', e.target.value)}
                placeholder="e.g. Leg length 88cm, Wing span 182cm"
              />
            </label>
          </div>
        </GlassCard>

        {/* Sports & Training Information */}
        <GlassCard>
          <div className="flex items-center gap-2 border-b border-white/60 pb-3">
            <Edit3 className="text-blue" size={20} />
            <h2 className="text-xl font-black text-deep-navy">Sport & Training Discipline</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Primary Sport
              <GlassInput
                value={profile.primarySport}
                onChange={(e) => updateField('primarySport', e.target.value)}
                required
                placeholder="Soccer"
              />
            </label>
            <label className="text-sm font-semibold">
              Secondary Sport
              <GlassInput
                value={profile.secondarySport}
                onChange={(e) => updateField('secondarySport', e.target.value)}
                placeholder="Athletics / Running"
              />
            </label>
            <label className="text-sm font-semibold">
              Playing Position
              <GlassInput
                value={profile.playingPosition}
                onChange={(e) => updateField('playingPosition', e.target.value)}
                required
                placeholder="Forward / Winger"
              />
            </label>
            <label className="text-sm font-semibold">
              Competitive Level
              <GlassSelect
                value={profile.competitiveLevel}
                onChange={(e) => updateField('competitiveLevel', e.target.value)}
                required
              >
                <option value="Recreational">Recreational</option>
                <option value="Amateur">Amateur</option>
                <option value="Collegiate">Collegiate</option>
                <option value="Professional">Professional</option>
              </GlassSelect>
            </label>
            <label className="text-sm font-semibold">
              Years of Experience
              <GlassInput
                value={profile.yearsExperience}
                onChange={(e) => updateField('yearsExperience', e.target.value)}
                placeholder="5 years"
              />
            </label>
            <label className="text-sm font-semibold">
              Training Days / Week
              <GlassInput
                value={profile.trainingDaysPerWeek}
                onChange={(e) => updateField('trainingDaysPerWeek', e.target.value)}
                placeholder="5 days/week"
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Average Training Duration
              <GlassInput
                value={profile.averageTrainingDuration}
                onChange={(e) => updateField('averageTrainingDuration', e.target.value)}
                placeholder="90 minutes"
              />
            </label>
          </div>
        </GlassCard>

        {/* Injury History */}
        <GlassCard>
          <div className="flex items-center justify-between border-b border-white/60 pb-3">
            <div>
              <h2 className="text-xl font-black text-deep-navy">Previous Injuries & Medical History</h2>
              <p className="text-xs text-text-muted">Recorded injuries help calibrate baseline risk factors.</p>
            </div>
            <GlassButton type="button" variant="secondary" onClick={addInjury}>
              <Plus size={16} /> Add Injury
            </GlassButton>
          </div>

          <div className="mt-4 space-y-4">
            {profile.injuries.length === 0 ? (
              <p className="rounded-xl bg-white/50 p-4 text-sm text-text-muted">
                No past injuries recorded. Click "Add Injury" if you have any previous ligament, joint, or muscle issues.
              </p>
            ) : (
              profile.injuries.map((injury, idx) => (
                <div key={idx} className="rounded-2xl border border-white/80 bg-white/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-deep-navy">Injury Record #{idx + 1}</span>
                    <GlassButton
                      type="button"
                      variant="ghost"
                      onClick={() => removeInjury(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} /> Remove
                    </GlassButton>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-xs font-semibold">
                      Body Part
                      <GlassInput
                        value={injury.bodyPart}
                        onChange={(e) => updateInjuryItem(idx, 'bodyPart', e.target.value)}
                        placeholder="Knee / Ankle / Hamstring"
                      />
                    </label>
                    <label className="text-xs font-semibold">
                      Side
                      <GlassSelect
                        value={injury.side}
                        onChange={(e) => updateInjuryItem(idx, 'side', e.target.value)}
                      >
                        <option value="Left">Left</option>
                        <option value="Right">Right</option>
                        <option value="Both">Both</option>
                      </GlassSelect>
                    </label>
                    <label className="text-xs font-semibold">
                      Injury Type
                      <GlassSelect
                        value={injury.type}
                        onChange={(e) => updateInjuryItem(idx, 'type', e.target.value)}
                      >
                        <option value="ACL">ACL / Ligament</option>
                        <option value="Meniscus">Meniscus</option>
                        <option value="Sprain">Ankle Sprain</option>
                        <option value="Hamstring Strain">Hamstring Strain</option>
                        <option value="Tendinitis">Tendinitis</option>
                        <option value="Other">Other</option>
                      </GlassSelect>
                    </label>
                    <label className="text-xs font-semibold">
                      Year
                      <GlassInput
                        value={injury.year}
                        onChange={(e) => updateInjuryItem(idx, 'year', e.target.value)}
                        placeholder="2023"
                      />
                    </label>
                    <label className="text-xs font-semibold">
                      Severity
                      <GlassSelect
                        value={injury.severity}
                        onChange={(e) => updateInjuryItem(idx, 'severity', e.target.value)}
                      >
                        <option value="Mild">Mild</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe">Severe</option>
                      </GlassSelect>
                    </label>
                    <label className="text-xs font-semibold">
                      Recovery Duration
                      <GlassInput
                        value={injury.recoveryDuration}
                        onChange={(e) => updateInjuryItem(idx, 'recoveryDuration', e.target.value)}
                        placeholder="8 weeks"
                      />
                    </label>
                  </div>
                  <div className="flex gap-4 pt-1 text-xs font-semibold">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={injury.fullyRecovered}
                        onChange={(e) => updateInjuryItem(idx, 'fullyRecovered', e.target.checked)}
                      />
                      Fully Recovered
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={injury.recurring}
                        onChange={(e) => updateInjuryItem(idx, 'recurring', e.target.checked)}
                      />
                      Recurring Issue
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Coach Connection */}
        <GlassCard>
          <div className="flex items-center gap-2 border-b border-white/60 pb-3">
            <UserCheck className="text-emerald-600" size={20} />
            <h2 className="text-xl font-black text-deep-navy">Coach Affiliation</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Coach Email
              <GlassInput
                value={profile.coachEmail}
                onChange={(e) => updateField('coachEmail', e.target.value)}
                placeholder="coach@motionguard.local"
              />
            </label>
            <label className="text-sm font-semibold">
              Coach ID
              <GlassInput
                value={profile.coachId}
                onChange={(e) => updateField('coachId', e.target.value)}
                placeholder="MG-COACH-101"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/70 p-3 text-sm">
            <span>
              Connection Status: <b className="text-emerald-700">{profile.coachInvitationStatus}</b>
            </span>
            <span className="text-xs text-text-muted">Coach has permission to review risk models and reports</span>
          </div>
        </GlassCard>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/athlete/dashboard">
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
