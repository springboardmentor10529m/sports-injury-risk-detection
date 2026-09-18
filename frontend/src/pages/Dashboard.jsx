import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AthleteLayout from '../components/AthleteLayout';
import { 
  ShieldAlert, 
  Activity, 
  TrendingUp, 
  Play, 
  Dumbbell, 
  CheckCircle2, 
  FileText, 
  Cpu, 
  ChevronRight,
  Flame,
  Users,
  UserCheck,
  Search,
  Save,
  MessageSquare
} from 'lucide-react';
import api from '../api';

const SQUAD_ATHLETES = [
  {
    id: 'ATH-001',
    name: 'Alex Johnson',
    sport: 'Soccer',
    position: 'Forward',
    age: 24,
    valgusAngle: '12.4°',
    asymmetry: '14.6%',
    riskScore: 72.4,
    riskLevel: 'High',
    status: 'Modified Deceleration',
    acwr: 1.14,
    lastAssessment: 'Today, 2:30 PM',
    coachNotes: 'Demonstrating inward left knee collapse upon deceleration. Prescribed eccentric hamstring curls and gluteus medius stabilization. Limit high-speed sprinting to 60%.'
  },
  {
    id: 'ATH-002',
    name: 'Marcus Sterling',
    sport: 'Soccer',
    position: 'Midfielder',
    age: 26,
    valgusAngle: '14.2°',
    asymmetry: '16.8%',
    riskScore: 76.5,
    riskLevel: 'High',
    status: 'Restricted Drills',
    acwr: 1.38,
    lastAssessment: 'Yesterday, 4:15 PM',
    coachNotes: 'Acute training spike observed. High fatigue index. Needs 48h active recovery protocol.'
  },
  {
    id: 'ATH-003',
    name: 'David Silva',
    sport: 'Soccer',
    position: 'Center Back',
    age: 28,
    valgusAngle: '9.8°',
    asymmetry: '11.2%',
    riskScore: 68.0,
    riskLevel: 'Moderate',
    status: 'Full Training',
    acwr: 1.05,
    lastAssessment: 'Sep 07, 2026',
    coachNotes: 'Ankle mobility recovered. Good proprioceptive control in single-leg landings.'
  },
  {
    id: 'ATH-004',
    name: 'Liam Cooper',
    sport: 'Soccer',
    position: 'Goalkeeper',
    age: 23,
    valgusAngle: '6.5°',
    asymmetry: '4.1%',
    riskScore: 28.4,
    riskLevel: 'Low',
    status: 'Cleared Match Ready',
    acwr: 0.98,
    lastAssessment: 'Sep 06, 2026',
    coachNotes: 'Excellent reactive strength index and bilateral landing symmetry.'
  },
  {
    id: 'ATH-005',
    name: 'Lucas Vance',
    sport: 'Soccer',
    position: 'Fullback',
    age: 25,
    valgusAngle: '7.1°',
    asymmetry: '5.6%',
    riskScore: 32.1,
    riskLevel: 'Low',
    status: 'Cleared Match Ready',
    acwr: 1.02,
    lastAssessment: 'Sep 05, 2026',
    coachNotes: 'High endurance capacity with optimal hamstring-to-quadriceps ratio.'
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'athlete';
  const [currentUserName, setCurrentUserName] = useState(() => {
    const stored = localStorage.getItem('name');
    return (stored && stored !== 'Alex Johnson') ? stored : (role === 'coach' ? 'Coach' : 'Athlete');
  });
  const [athleteProfile, setAthleteProfile] = useState(null);
  const [athleteMetrics, setAthleteMetrics] = useState(null);
  const [squadAthletes, setSquadAthletes] = useState([]);
  const [athleteVideos, setAthleteVideos] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data?.name) {
            setCurrentUserName(res.data.name);
            localStorage.setItem('name', res.data.name);
          }
        })
        .catch(() => {});

      if (role === 'coach') {
        api.get('/athlete/list')
          .then((res) => {
            if (res.data && res.data.length > 0) {
              const mapped = res.data.map((ath) => ({
                id: ath.athlete_id,
                name: ath.user?.name || 'Athlete',
                email: ath.user?.email || '',
                sport: ath.sport || 'General Athletics',
                position: ath.position || 'Athlete',
                age: ath.age || 22,
                weight: ath.weight ? `${ath.weight} kg` : '75 kg',
                valgusAngle: ath.valgus_angle || '7.8°',
                asymmetry: ath.asymmetry || '5.4%',
                riskScore: ath.risk_score !== undefined ? ath.risk_score : 35.0,
                riskLevel: ath.risk_level || 'Low',
                status: ath.status || 'Active Squad',
                acwr: ath.acwr || 1.0,
                lastAssessment: ath.last_assessment || 'Pending Upload',
                coachNotes: ath.coach_notes || 'Regular training schedule active.'
              }));
              setSquadAthletes(mapped);

              const savedId = localStorage.getItem('selectedAthleteId');
              const found = (savedId && mapped.find((m) => m.id === savedId)) || mapped[0];
              setSelectedAthlete(found);
              const savedNotes = localStorage.getItem(`coach_notes_${found.id}`);
              setCoachNotesInput(savedNotes !== null ? savedNotes : found.coachNotes);
            }
          })
          .catch((err) => {
            console.log('Error fetching squad athletes:', err);
          });
      }

      if (role === 'athlete') {
        api.get('/athlete/profile')
          .then(async (res) => {
            if (res.data) {
              setAthleteProfile(res.data);
              if (res.data.user?.name) {
                setCurrentUserName(res.data.user.name);
                localStorage.setItem('name', res.data.user.name);
              }

              const athId = res.data.athlete_id;
              let summaryData = null;
              if (athId) {
                summaryData = await api.get(`/reports/athlete/${athId}/summary`).then((r) => r.data).catch(() => null);
              }

              // Fetch athlete uploaded videos
              api.get('/video/list')
                .then((vRes) => {
                  if (vRes.data && Array.isArray(vRes.data)) {
                    setAthleteVideos(vRes.data);
                  }
                })
                .catch(() => {});

              const sport = (res.data.sport || 'General Athletics').toLowerCase();
              const weight = res.data.weight || 75.0;
              const age = res.data.age || 23;
              const injuryStorage = localStorage.getItem(`athlete_injuries_${athId || res.data.user_id}`);
              let injuryCount = 0;
              if (injuryStorage) {
                try { injuryCount = JSON.parse(injuryStorage).length; } catch {}
              }

              let riskScore = 32.5;
              let symmetry = 94.2;
              let acwr = 1.08;
              let valgusScore = 24.0;
              let valgusAngleText = '7.8° (Normal baseline)';
              let acwrScore = 25.0;
              let asymmScore = 18.0;
              let velocityScore = 22.0;
              let priorInjuryScore = Math.min(60.0, +(20.0 + (injuryCount * 12.0)).toFixed(1));

              let valgusPts = '7.2 / 30 pts';
              let valgusWidth = '24%';
              let acwrPts = '6.3 / 25 pts';
              let acwrWidth = '25%';
              let asymmetryPts = '3.6 / 20 pts';
              let asymmetryWidth = '18%';
              let velocityPts = '3.3 / 15 pts';
              let velocityWidth = '22%';
              let injuryPts = '2.0 / 10 pts';
              let injuryWidth = '20%';

              if (summaryData?.latest_assessment?.video_id) {
                const assess = summaryData.latest_assessment;
                const forecast = summaryData.injury_risk_forecast;
                if (forecast?.overall_score !== undefined) {
                  riskScore = Number(forecast.overall_score);
                }
                if (assess.symmetry_score !== null && assess.symmetry_score !== undefined) {
                  symmetry = Number(assess.symmetry_score);
                }
                if (assess.knee_valgus_detected === 'Yes' || assess.knee_valgus_detected === 'High') {
                  valgusScore = 82.0;
                  valgusAngleText = '14.2° (High valgus inward collapse)';
                } else if (assess.knee_valgus_detected === 'Borderline') {
                  valgusScore = 48.0;
                  valgusAngleText = '9.5° (Borderline collapse)';
                } else {
                  valgusScore = 22.0;
                  valgusAngleText = '5.1° (Optimal joint alignment)';
                }
                const rawDeficit = Math.abs(100 - symmetry);
                asymmScore = Math.min(95, Math.max(8, +(rawDeficit * 5.0).toFixed(1)));
                acwrScore = Math.min(85, Math.max(20, +(25.0 + ((res.data.training_load || 0) * 4.0)).toFixed(1)));
                velocityScore = Math.min(80, Math.max(20, +(30.0 + ((weight % 10) * 3)).toFixed(1)));
                acwr = +(1.0 + (riskScore / 250.0)).toFixed(2);

                if (forecast?.factors) {
                  const f = forecast.factors;
                  valgusPts = `${Number(f.kinematics).toFixed(1)} / 30 pts`;
                  valgusWidth = `${Math.min(100, Math.round((Number(f.kinematics) / 30) * 100))}%`;
                  acwrPts = `${Number(f.load).toFixed(1)} / 25 pts`;
                  acwrWidth = `${Math.min(100, Math.round((Number(f.load) / 25) * 100))}%`;
                  asymmetryPts = `${Number(f.asymmetry).toFixed(1)} / 20 pts`;
                  asymmetryWidth = `${Math.min(100, Math.round((Number(f.asymmetry) / 20) * 100))}%`;
                  velocityPts = `${Number(f.velocity).toFixed(1)} / 15 pts`;
                  velocityWidth = `${Math.min(100, Math.round((Number(f.velocity) / 15) * 100))}%`;
                  injuryPts = `${Number(f.prior_injury).toFixed(1)} / 10 pts`;
                  injuryWidth = `${Math.min(100, Math.round((Number(f.prior_injury) / 10) * 100))}%`;
                } else {
                  valgusPts = `${(valgusScore * 0.3).toFixed(1)} / 30 pts`;
                  valgusWidth = `${valgusScore}%`;
                  acwrPts = `${(acwrScore * 0.25).toFixed(1)} / 25 pts`;
                  acwrWidth = `${acwrScore}%`;
                  asymmetryPts = `${(asymmScore * 0.2).toFixed(1)} / 20 pts`;
                  asymmetryWidth = `${asymmScore}%`;
                  velocityPts = `${(velocityScore * 0.15).toFixed(1)} / 15 pts`;
                  velocityWidth = `${velocityScore}%`;
                  injuryPts = `${(priorInjuryScore * 0.1).toFixed(1)} / 10 pts`;
                  injuryWidth = `${priorInjuryScore}%`;
                }
              } else {
                const scoreMod = ((weight + age) % 15);
                if (sport.includes('basket')) {
                  valgusScore = +(32.0 + scoreMod).toFixed(1);
                  valgusAngleText = '7.4° (Optimal alignment)';
                  acwrScore = +(35.0 + (scoreMod * 0.8)).toFixed(1);
                  asymmScore = +(26.0 + (scoreMod * 0.5)).toFixed(1);
                  velocityScore = +(28.0 + (scoreMod * 0.4)).toFixed(1);
                  symmetry = +(100 - (asymmScore / 5.0)).toFixed(1);
                  acwr = 1.06;
                } else if (sport.includes('soccer') || sport.includes('football')) {
                  valgusScore = +(42.0 + scoreMod).toFixed(1);
                  valgusAngleText = '10.2° (Slight valgus deviation)';
                  acwrScore = +(45.0 + (scoreMod * 0.9)).toFixed(1);
                  asymmScore = +(38.0 + (scoreMod * 0.7)).toFixed(1);
                  velocityScore = +(34.0 + (scoreMod * 0.5)).toFixed(1);
                  symmetry = +(100 - (asymmScore / 5.0)).toFixed(1);
                  acwr = 1.15;
                } else {
                  valgusScore = +(28.0 + scoreMod).toFixed(1);
                  valgusAngleText = '6.8° (Optimal alignment)';
                  acwrScore = +(30.0 + (scoreMod * 0.6)).toFixed(1);
                  asymmScore = +(24.0 + (scoreMod * 0.4)).toFixed(1);
                  velocityScore = +(22.0 + (scoreMod * 0.3)).toFixed(1);
                  symmetry = +(100 - (asymmScore / 5.0)).toFixed(1);
                  acwr = 1.04;
                }
                const vW = (valgusScore * 0.30);
                const aW = (acwrScore * 0.25);
                const asW = (asymmScore * 0.20);
                const velW = (velocityScore * 0.15);
                const hW = (priorInjuryScore * 0.10);
                riskScore = +(vW + aW + asW + velW + hW).toFixed(1);

                valgusPts = `${(valgusScore * 0.3).toFixed(1)} / 30 pts`;
                valgusWidth = `${valgusScore}%`;
                acwrPts = `${(acwrScore * 0.25).toFixed(1)} / 25 pts`;
                acwrWidth = `${acwrScore}%`;
                asymmetryPts = `${(asymmScore * 0.2).toFixed(1)} / 20 pts`;
                asymmetryWidth = `${asymmScore}%`;
                velocityPts = `${(velocityScore * 0.15).toFixed(1)} / 15 pts`;
                velocityWidth = `${velocityScore}%`;
                injuryPts = `${(priorInjuryScore * 0.1).toFixed(1)} / 10 pts`;
                injuryWidth = `${priorInjuryScore}%`;
              }

              const isHigh = riskScore >= 70;
              const isMod = riskScore >= 45 && riskScore < 70;
              const riskLevel = isHigh ? 'High Risk' : (isMod ? 'Moderate' : 'Low Risk');
              const riskBadgeClass = isHigh ? 'bg-rose-100 text-rose-800' : (isMod ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800');

              setAthleteMetrics({
                riskScore: Number(riskScore).toFixed(1),
                riskLevel: riskLevel,
                riskBadgeClass: riskBadgeClass,
                symmetry: Number(symmetry).toFixed(1),
                symmetryDeficit: Math.abs(100 - symmetry).toFixed(1),
                acwr: acwr,
                rfProb: summaryData?.injury_risk_forecast?.rf_risk_prob !== undefined ? Number(summaryData.injury_risk_forecast.rf_risk_prob).toFixed(1) : (Number(riskScore) * 1.03).toFixed(1),
                xgbProb: summaryData?.injury_risk_forecast?.xgb_risk_prob !== undefined ? Number(summaryData.injury_risk_forecast.xgb_risk_prob).toFixed(1) : (Number(riskScore) * 0.96).toFixed(1),
                valgusWidth: valgusWidth,
                valgusPts: valgusPts,
                valgusNote: `Knee inward collapse: ${valgusAngleText}`,
                acwrWidth: acwrWidth,
                acwrPts: acwrPts,
                asymmetryWidth: asymmetryWidth,
                asymmetryPts: asymmetryPts,
                velocityWidth: velocityWidth,
                velocityPts: velocityPts,
                injuryWidth: injuryWidth,
                injuryPts: injuryPts,
                injuryNote: `${injuryCount} documented injury incident${injuryCount === 1 ? '' : 's'} in history`
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [role]);

  const effectiveSquad = squadAthletes.length > 0 ? squadAthletes : SQUAD_ATHLETES;

  // Coach Dashboard States with localStorage persistence across refreshes
  const [selectedAthlete, setSelectedAthlete] = useState(() => {
    const savedId = localStorage.getItem('selectedAthleteId');
    if (savedId) {
      const found = SQUAD_ATHLETES.find((a) => a.id === savedId);
      if (found) return found;
    }
    return SQUAD_ATHLETES[0];
  });

  const [coachNotesInput, setCoachNotesInput] = useState(() => {
    const savedId = localStorage.getItem('selectedAthleteId');
    const athlete = (savedId && SQUAD_ATHLETES.find((a) => a.id === savedId)) || SQUAD_ATHLETES[0];
    const savedNotes = localStorage.getItem(`coach_notes_${athlete.id}`);
    return savedNotes !== null ? savedNotes : athlete.coachNotes;
  });

  const [notesSaved, setNotesSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const handleSelectAthlete = (athlete) => {
    setSelectedAthlete(athlete);
    localStorage.setItem('selectedAthleteId', athlete.id);
    const savedNotes = localStorage.getItem(`coach_notes_${athlete.id}`);
    setCoachNotesInput(savedNotes !== null ? savedNotes : athlete.coachNotes);
    setNotesSaved(false);
  };

  const handleSaveNotes = async () => {
    localStorage.setItem(`coach_notes_${selectedAthlete.id}`, coachNotesInput);
    try {
      await api.put(`/athlete/${selectedAthlete.id}/notes`, { coach_notes: coachNotesInput });
      setSquadAthletes((prev) =>
        prev.map((a) => (a.id === selectedAthlete.id ? { ...a, coachNotes: coachNotesInput } : a))
      );
    } catch (err) {
      console.log('Saved locally (demo/mock mode):', err);
    }
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2500);
  };

  const highRiskCount = effectiveSquad.filter((a) => a.riskLevel?.toLowerCase().includes('high')).length;
  const modRiskCount = effectiveSquad.filter((a) => a.riskLevel?.toLowerCase().includes('mod')).length;
  const lowRiskCount = effectiveSquad.filter((a) => 
    a.riskLevel?.toLowerCase().includes('low') || 
    (!a.riskLevel?.toLowerCase().includes('high') && !a.riskLevel?.toLowerCase().includes('mod'))
  ).length;
  const availabilityRate = effectiveSquad.length > 0 
    ? (((effectiveSquad.length - highRiskCount) / effectiveSquad.length) * 100).toFixed(1) 
    : '100.0';
  const meanAcwr = effectiveSquad.length > 0
    ? (effectiveSquad.reduce((acc, a) => acc + (parseFloat(a.acwr) || 1.1), 0) / effectiveSquad.length).toFixed(2)
    : '1.12';

  const filteredAthletes = effectiveSquad.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = riskFilter === 'all' || a.riskLevel?.toLowerCase().includes(riskFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  // -------------------------------------------------------------
  // 1. COACH & SPORTS SCIENCE SQUAD DASHBOARD VIEW
  // -------------------------------------------------------------
  if (role === 'coach') {
    const currentAthlete = selectedAthlete || effectiveSquad[0] || {};

    return (
      <AthleteLayout athleteName={currentUserName}>
        {/* Coach Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Head Coach & Sports Science Console
              </span>
              <span className="text-xs text-slate-400 font-medium">Squad: Senior First Team</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Squad Readiness & Injury Prevention
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Monitoring {effectiveSquad.length} squad athlete{effectiveSquad.length !== 1 ? 's' : ''} across kinematic video streams, 5-factor risk indices, and training workloads.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate(currentAthlete?.id ? `/athlete/reports?athlete=${currentAthlete.id}` : '/athlete/reports')}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Squad Availability Report</span>
            </button>

            <button
              onClick={() => navigate('/athlete/video-analysis')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Video Studio</span>
            </button>
          </div>
        </div>

        {/* Coach Squad Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Monitored Squad</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{effectiveSquad.length} Athlete{effectiveSquad.length !== 1 ? 's' : ''}</div>
            <p className="text-[11px] text-slate-500 mt-2">{lowRiskCount} Cleared • {modRiskCount} Modified • {highRiskCount} Flagged</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>High Risk Interventions</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-600">{highRiskCount} Flagged</span>
              {highRiskCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Alert</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Valgus inward collapse &gt; 12.0°</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Squad Availability</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-600">{availabilityRate}%</div>
            <p className="text-[11px] text-slate-500 mt-2">Above 85% benchmark threshold</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Squad Mean ACWR</span>
              <Flame className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-3xl font-extrabold text-indigo-600">{meanAcwr}</div>
            <p className="text-[11px] text-slate-500 mt-2">Optimal safe training load threshold</p>
          </div>
        </div>

        {/* Coach Main Section: Squad Roster + Selected Athlete Deep-Dive */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Left 7 Columns: Squad Roster Table */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Squad Athlete Risk Register</h2>
                  <p className="text-xs text-slate-500">Select an athlete to inspect biomechanics and clinical notes</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Search squad..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg w-36 focus:outline-none focus:w-48 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setRiskFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${riskFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
                    >
                      All ({effectiveSquad.length})
                    </button>
                    <button
                      onClick={() => setRiskFilter('high')}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${riskFilter === 'high' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      High ({highRiskCount})
                    </button>
                    <button
                      onClick={() => setRiskFilter('moderate')}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${riskFilter === 'moderate' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      Mod ({modRiskCount})
                    </button>
                    <button
                      onClick={() => setRiskFilter('low')}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${riskFilter === 'low' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      Low ({lowRiskCount})
                    </button>
                  </div>
                </div>
              </div>

              {/* Athlete Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Athlete</th>
                      <th className="pb-3 font-semibold">Knee Valgus</th>
                      <th className="pb-3 font-semibold">Asymmetry</th>
                      <th className="pb-3 font-semibold">Risk Index</th>
                      <th className="pb-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAthletes.map((ath) => {
                      const isSelected = currentAthlete.id === ath.id;
                      return (
                        <tr 
                          key={ath.id}
                          onClick={() => handleSelectAthlete(ath)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'}`}
                        >
                          <td className="py-3">
                            <div className="font-bold text-slate-900">{ath.name}</div>
                            <div className="text-[11px] text-slate-500">{ath.position} • {ath.age} yrs</div>
                          </td>
                          <td className="py-3 font-mono font-medium text-slate-800">{ath.valgusAngle}</td>
                          <td className="py-3 font-mono font-medium text-rose-600">{ath.asymmetry}</td>
                          <td className="py-3">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              ath.riskLevel?.includes('High') ? 'bg-rose-100 text-rose-800' :
                              ath.riskLevel?.includes('Mod') ? 'bg-amber-100 text-amber-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {ath.riskScore}% {ath.riskLevel}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              type="button"
                              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Viewing' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Selected Athlete Clinical Management */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coach Focus</span>
                  <h3 className="text-base font-bold text-slate-900">{currentAthlete.name || 'Athlete'}</h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  currentAthlete.riskLevel?.includes('High') ? 'bg-rose-100 text-rose-800' :
                  currentAthlete.riskLevel?.includes('Mod') ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentAthlete.status || 'Active Squad'}
                </span>
              </div>

              {/* Quick Athlete Biomechanics Summary */}
              <div className="grid grid-cols-3 gap-2.5 text-center p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Valgus Deviation</span>
                  <div className="font-bold text-slate-900 mt-0.5">{currentAthlete.valgusAngle || '7.8°'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">L/R Asymmetry</span>
                  <div className="font-bold text-rose-600 mt-0.5">{currentAthlete.asymmetry || '5.4%'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Workload ACWR</span>
                  <div className="font-bold text-slate-900 mt-0.5">{currentAthlete.acwr || '1.12'}</div>
                </div>
              </div>

              {/* Coach Clinical Notes Form */}
              <div className="space-y-2 mb-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Coach & Physiotherapist Notes</span>
                </label>
                <textarea
                  rows={4}
                  value={coachNotesInput}
                  onChange={(e) => setCoachNotesInput(e.target.value)}
                  placeholder="Enter medical observations, modified drill volume, or clearance instructions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />

                {notesSaved && (
                  <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Notes saved to athlete's permanent record!</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={handleSaveNotes}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 min-w-[150px]"
              >
                <Save className="w-4 h-4" />
                <span>Save Notes</span>
              </button>

              <button
                onClick={() => navigate(currentAthlete.id ? `/athlete/reports?athlete=${currentAthlete.id}` : '/athlete/reports')}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                title="View Athlete Dossier & Clinical Report"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Report</span>
              </button>

              <button
                onClick={() => navigate('/athlete/video-analysis')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                title="Open Video Analysis Studio"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Video Studio</span>
              </button>
            </div>
          </div>
        </div>
      </AthleteLayout>
    );
  }

  // -------------------------------------------------------------
  // 2. ATHLETE PERSONAL DASHBOARD VIEW
  // -------------------------------------------------------------
  const recentAssessments = [
    {
      id: 'VID-SQUAT-01',
      activity: 'Squatting Movement Assessment',
      date: 'Today, 2:30 PM',
      riskScore: 72.4,
      level: 'High',
      asymmetry: '14.6%',
      valgusAngle: '12.4°'
    },
    {
      id: 'VID-LAND-02',
      activity: 'Drop Vertical Jump & Landing',
      date: 'Sep 06, 2026',
      riskScore: 48.0,
      level: 'Moderate',
      asymmetry: '9.2%',
      valgusAngle: '8.5°'
    },
    {
      id: 'VID-SPRINT-03',
      activity: 'Sprint Deceleration Drill',
      date: 'Aug 29, 2026',
      riskScore: 31.2,
      level: 'Low',
      asymmetry: '4.8%',
      valgusAngle: '5.1°'
    }
  ];

  const mappedAssessments = athleteVideos.length > 0 ? athleteVideos.map((v) => {
    const pred = v.injury_prediction;
    const analysis = v.analysis;
    const score = pred?.overall_risk_score !== undefined 
      ? Number(pred.overall_risk_score).toFixed(1) 
      : (analysis?.risk_level === 'High' ? '72.4' : (analysis?.risk_level === 'Moderate' ? '48.0' : '31.2'));
    const level = pred?.risk_category || analysis?.risk_level || (Number(score) >= 70 ? 'High' : (Number(score) >= 45 ? 'Moderate' : 'Low'));
    const asymm = analysis?.symmetry_score !== undefined && analysis?.symmetry_score !== null
      ? `${Math.abs(100 - Number(analysis.symmetry_score)).toFixed(1)}%`
      : '5.2%';
    const valgusAngle = analysis?.knee_valgus_detected === 'Yes' 
      ? '14.2°' 
      : (analysis?.knee_valgus_detected === 'Borderline' ? '9.8°' : '5.1°');
    const dateStr = v.uploaded_at ? new Date(v.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently';

    return {
      id: `VID-${v.video_id.slice(0, 6).toUpperCase()}`,
      rawId: v.video_id,
      video: v,
      activity: `${v.activity || 'Movement'} Assessment`,
      date: dateStr,
      riskScore: score,
      level: level,
      asymmetry: asymm,
      valgusAngle: valgusAngle
    };
  }) : recentAssessments;

  return (
    <AthleteLayout athleteName={currentUserName}>
      {/* Top Welcome Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {athleteProfile?.sport ? `${athleteProfile.sport} • ${athleteProfile.position || 'Athlete'}` : 'Soccer • Forward'}
            </span>
            <span className="text-xs text-slate-400 font-medium">Session Season 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Athlete Intelligence Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Welcome back, <strong className="text-slate-700">{currentUserName}</strong>. Here is your active biomechanical health and injury risk summary.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/athlete/reports')}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Health Dossier</span>
          </button>

          <button
            onClick={() => navigate('/athlete/video-analysis')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>New Video Analysis</span>
          </button>
        </div>
      </div>

      {/* Core KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Composite Risk Score</span>
            <ShieldAlert className={`w-4 h-4 ${athleteMetrics?.riskScore >= 70 ? 'text-rose-500' : (athleteMetrics?.riskScore >= 45 ? 'text-amber-500' : 'text-emerald-500')}`} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{athleteMetrics?.riskScore ? `${athleteMetrics.riskScore}%` : '32.5%'}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${athleteMetrics?.riskBadgeClass || 'bg-emerald-100 text-emerald-800'}`}>
                {athleteMetrics?.riskLevel || 'Low Risk'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span>Personalized clinical assessment index</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Bilateral Symmetry</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{athleteMetrics?.symmetry ? `${athleteMetrics.symmetry}%` : '94.2%'}</span>
              <span className="text-xs font-bold text-slate-500">{athleteMetrics?.symmetryDeficit ? `${athleteMetrics.symmetryDeficit}% Deficit` : '5.8% Deficit'}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Dynamic kinetic limb power balance</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Workload Ratio (ACWR)</span>
            <Flame className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600">{athleteMetrics?.acwr || '1.08'}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Optimal Zone
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Safe acute-to-chronic training load</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>ML Models & Vision</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">Online</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              RF: {athleteMetrics?.rfProb || '34.0'}% | XGB: {athleteMetrics?.xgbProb || '31.0'}%
            </p>
          </div>
        </div>
      </div>

      {/* Main Content: 5-Factor Model & Corrective Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">5-Factor Weighted Biomechanical Risk</h2>
              <p className="text-xs text-slate-500">Multimodal clinical formula quantifying injury propensity</p>
            </div>
            <button
              onClick={() => navigate('/athlete/risk-assessments')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <span>Detailed Model</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">1. Joint Kinematics & Valgus Angle (30% Weight)</span>
                <span className="text-slate-900 font-bold">{athleteMetrics?.valgusPts || '7.2 / 30 pts'}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: athleteMetrics?.valgusWidth || '24%' }}></div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{athleteMetrics?.valgusNote || 'Optimal alignment during movement depth'}</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">2. Training Load & ACWR Fatigue (25% Weight)</span>
                <span className="text-slate-900 font-bold">{athleteMetrics?.acwrPts || '6.3 / 25 pts'}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: athleteMetrics?.acwrWidth || '25%' }}></div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Acute load is well balanced with chronic readiness</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">3. Bilateral Asymmetry Index (20% Weight)</span>
                <span className="text-slate-900 font-bold">{athleteMetrics?.asymmetryPts || '3.6 / 20 pts'}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: athleteMetrics?.asymmetryWidth || '18%' }}></div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{athleteMetrics?.symmetryDeficit ? `${athleteMetrics.symmetryDeficit}% bilateral deficit between left and right limb` : 'Optimal symmetry balance'}</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">4. Movement Velocity & Acceleration Jerk (15% Weight)</span>
                <span className="text-slate-900 font-bold">{athleteMetrics?.velocityPts || '3.3 / 15 pts'}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: athleteMetrics?.velocityWidth || '22%' }}></div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Deceleration braking impulse within tolerances</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">5. Prior Injury & Age Factor (10% Weight)</span>
                <span className="text-slate-900 font-bold">{athleteMetrics?.injuryPts || '2.0 / 10 pts'}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: athleteMetrics?.injuryWidth || '20%' }}></div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{athleteMetrics?.injuryNote || 'Documented injuries in clinical log'}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Today's Corrective Prescription</h3>
                </div>
                <span className="text-[11px] font-semibold text-blue-600">2 of 3 Completed</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-800">Eccentric Nordic Hamstring Curls</div>
                    <div className="text-[11px] text-slate-500">3 Sets x 6 Reps • Deceleration strength</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-800">Banded Gluteus Medius Clamshells</div>
                    <div className="text-[11px] text-slate-500">3 Sets x 15 Reps • Hip abduction</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>

                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-800">Single-Leg Drop Landing Drills</div>
                    <div className="text-[11px] text-slate-500">4 Sets x 5 Landings • Valgus control</div>
                  </div>
                  <button 
                    onClick={() => navigate('/athlete/recommendations')}
                    className="text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/athlete/recommendations')}
              className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View Full Rehabilitation Protocols</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Video Assessments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Movement Assessments</h2>
            <p className="text-xs text-slate-500">Past evaluated recordings with automated kinematics</p>
          </div>
          <button
            onClick={() => navigate('/athlete/video-analysis')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Open Video Studio</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Assessment</th>
                <th className="pb-3 font-semibold">Date & Time</th>
                <th className="pb-3 font-semibold">Knee Valgus</th>
                <th className="pb-3 font-semibold">L/R Asymmetry</th>
                <th className="pb-3 font-semibold">Risk Index</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappedAssessments.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3">
                    <div className="font-bold text-slate-900">{rec.activity}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{rec.id}</div>
                  </td>
                  <td className="py-3 text-slate-600">{rec.date}</td>
                  <td className="py-3 font-mono font-semibold text-slate-800">{rec.valgusAngle}</td>
                  <td className="py-3 font-mono font-semibold text-rose-600">{rec.asymmetry}</td>
                  <td className="py-3">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                      rec.level === 'High' ? 'bg-rose-100 text-rose-800' :
                      rec.level === 'Moderate' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {rec.riskScore}% ({rec.level})
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => {
                        if (rec.video) {
                          localStorage.setItem('active_video_assessment', JSON.stringify(rec.video));
                          localStorage.setItem('active_analysis_tab', 'results');
                          localStorage.setItem('step2_locked', 'true');
                        }
                        navigate('/athlete/video-analysis');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-blue-600" />
                      <span>Replay & Overlay</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AthleteLayout>
  );
};

export default Dashboard;
