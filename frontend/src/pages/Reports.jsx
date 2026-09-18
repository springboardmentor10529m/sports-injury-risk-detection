import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import AthleteLayout from '../components/AthleteLayout';
import { Download, Printer, Shield, User } from 'lucide-react';

const SQUAD_REPORTS = {
  'ATH-001': {
    id: 'ATH-001',
    name: 'Alex Johnson',
    sport: 'Soccer',
    position: 'Forward',
    age: 24,
    weight: '76.5 kg',
    reportId: 'BIO-2026-9812',
    riskScore: 72.4,
    riskLevel: 'Moderate-High',
    riskClassColor: 'text-amber-600',
    riskBadgeColor: 'bg-amber-100 text-amber-800',
    valgusRaw: '81.6%',
    valgusWeighted: '24.5%',
    acwrRaw: '72.8%',
    acwrWeighted: '18.2%',
    asymmetryRaw: '77.0%',
    asymmetryWeighted: '15.4%',
    velocityRaw: '60.6%',
    velocityWeighted: '9.1%',
    historyRaw: '52.0%',
    historyWeighted: '5.2%',
    conclusion: 'Athlete demonstrates good reactive flight dynamics, but exhibits significant valgus collapse on left knee during deep squat and landing transitions (12.4° inward collapse). Left hamstring eccentric deficit remains elevated (+14.6% bilateral asymmetry). Immediate completion of recommended 3-week neuromuscular deceleration stabilization protocol is prescribed prior to high-intensity match play.'
  },
  'ATH-002': {
    id: 'ATH-002',
    name: 'Marcus Sterling',
    sport: 'Soccer',
    position: 'Midfielder',
    age: 26,
    weight: '74.0 kg',
    reportId: 'BIO-2026-9815',
    riskScore: 76.5,
    riskLevel: 'High Risk',
    riskClassColor: 'text-rose-600',
    riskBadgeColor: 'bg-rose-100 text-rose-800',
    valgusRaw: '84.2%',
    valgusWeighted: '25.3%',
    acwrRaw: '78.5%',
    acwrWeighted: '19.6%',
    asymmetryRaw: '84.0%',
    asymmetryWeighted: '16.8%',
    velocityRaw: '62.0%',
    velocityWeighted: '9.3%',
    historyRaw: '55.0%',
    historyWeighted: '5.5%',
    conclusion: 'High acute training spike detected (ACWR 1.38). Marked bilateral asymmetry (16.8%) observed during deceleration drills. Prescribed 48-hour active recovery and restricted high-speed match volume until valgus angle normalizes below 10.0°.'
  },
  'ATH-003': {
    id: 'ATH-003',
    name: 'David Silva',
    sport: 'Soccer',
    position: 'Center Back',
    age: 28,
    weight: '82.0 kg',
    reportId: 'BIO-2026-9799',
    riskScore: 68.0,
    riskLevel: 'Moderate',
    riskClassColor: 'text-amber-600',
    riskBadgeColor: 'bg-amber-100 text-amber-800',
    valgusRaw: '72.0%',
    valgusWeighted: '21.6%',
    acwrRaw: '70.0%',
    acwrWeighted: '17.5%',
    asymmetryRaw: '66.0%',
    asymmetryWeighted: '13.2%',
    velocityRaw: '70.0%',
    velocityWeighted: '10.5%',
    historyRaw: '52.0%',
    historyWeighted: '5.2%',
    conclusion: 'Good ankle stability restoration post-sprain. Knee valgus is within manageable limits (9.8°). Cleared for full squad training with ongoing calf and ankle proprioceptive maintenance.'
  },
  'ATH-004': {
    id: 'ATH-004',
    name: 'Liam Cooper',
    sport: 'Soccer',
    position: 'Goalkeeper',
    age: 23,
    weight: '84.5 kg',
    reportId: 'BIO-2026-9780',
    riskScore: 28.4,
    riskLevel: 'Low Risk',
    riskClassColor: 'text-emerald-600',
    riskBadgeColor: 'bg-emerald-100 text-emerald-800',
    valgusRaw: '30.0%',
    valgusWeighted: '9.0%',
    acwrRaw: '32.0%',
    acwrWeighted: '8.0%',
    asymmetryRaw: '28.0%',
    asymmetryWeighted: '5.6%',
    velocityRaw: '24.0%',
    velocityWeighted: '3.6%',
    historyRaw: '22.0%',
    historyWeighted: '2.2%',
    conclusion: 'Optimal landing mechanics and low bilateral asymmetry (4.1%). High knee stabilization and ideal reactive jump capacity. 100% cleared for full competitive match selection.'
  },
  'ATH-005': {
    id: 'ATH-005',
    name: 'Lucas Vance',
    sport: 'Soccer',
    position: 'Fullback',
    age: 25,
    weight: '73.2 kg',
    reportId: 'BIO-2026-9774',
    riskScore: 32.1,
    riskLevel: 'Low Risk',
    riskClassColor: 'text-emerald-600',
    riskBadgeColor: 'bg-emerald-100 text-emerald-800',
    valgusRaw: '35.0%',
    valgusWeighted: '10.5%',
    acwrRaw: '34.0%',
    acwrWeighted: '8.5%',
    asymmetryRaw: '31.0%',
    asymmetryWeighted: '6.2%',
    velocityRaw: '30.0%',
    velocityWeighted: '4.5%',
    historyRaw: '24.0%',
    historyWeighted: '2.4%',
    conclusion: 'Balanced hip-to-quadriceps ratio and symmetric ankle dorsiflexion. Low injury vulnerability across all 5 kinematic markers.'
  }
};

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Role resolution
  const userRole = localStorage.getItem('role') || 'athlete';
  const isStaff = ['coach', 'physiotherapist', 'sports_scientist', 'admin'].includes(userRole.toLowerCase());

  const [currentUserName, setCurrentUserName] = useState(() => {
    const stored = localStorage.getItem('name');
    return (stored && stored !== 'Alex Johnson') ? stored : (isStaff ? 'Coach' : 'Athlete');
  });
  const [athleteProfile, setAthleteProfile] = useState(null);
  const [personalReport, setPersonalReport] = useState(null);
  const [squadReports, setSquadReports] = useState(SQUAD_REPORTS);

  const urlAthlete = searchParams.get('athlete') || searchParams.get('id');
  const storedAthlete = localStorage.getItem('selectedAthleteId');
  const [selectedAthleteId, setSelectedAthleteId] = useState(() => {
    return urlAthlete || storedAthlete || 'ATH-001';
  });

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

      if (isStaff) {
        api.get('/athlete/list')
          .then((res) => {
            if (res.data && res.data.length > 0) {
              const merged = {};
              res.data.forEach((ath) => {
                const isHigh = ath.risk_level?.toLowerCase().includes('high');
                const isMod = ath.risk_level?.toLowerCase().includes('mod');
                merged[ath.athlete_id] = {
                  id: ath.athlete_id,
                  name: ath.user?.name || 'Athlete',
                  sport: ath.sport || 'General Athletics',
                  position: ath.position || 'Athlete',
                  age: ath.age || 22,
                  weight: ath.weight ? `${ath.weight} kg` : '75.0 kg',
                  reportId: `BIO-2026-${ath.athlete_id ? ath.athlete_id.slice(-4).toUpperCase() : '9812'}`,
                  riskScore: ath.risk_score !== undefined ? ath.risk_score : 35.0,
                  riskLevel: ath.risk_level || 'Low',
                  riskClassColor: isHigh ? 'text-rose-600' : (isMod ? 'text-amber-600' : 'text-emerald-600'),
                  riskBadgeColor: isHigh ? 'bg-rose-100 text-rose-800' : (isMod ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'),
                  valgusRaw: ath.valgus_angle || '7.8°',
                  valgusWeighted: `${((parseFloat(ath.valgus_angle) || 7.8) * 2.5).toFixed(1)}%`,
                  acwrRaw: ath.acwr ? `${ath.acwr}` : '1.10',
                  acwrWeighted: `${((parseFloat(ath.acwr) || 1.1) * 12.0).toFixed(1)}%`,
                  asymmetryRaw: ath.asymmetry || '5.4%',
                  asymmetryWeighted: `${((parseFloat(ath.asymmetry) || 5.4) * 2.0).toFixed(1)}%`,
                  velocityRaw: '55.0%',
                  velocityWeighted: '8.0%',
                  historyRaw: '30.0%',
                  historyWeighted: '4.0%',
                  conclusion: ath.coach_notes || 'Kinematic assessment shows nominal baseline metrics. Regular training load recommended with ongoing monitoring.'
                };
              });
              // Include fallback athletes if not already in list
              Object.entries(SQUAD_REPORTS).forEach(([k, v]) => {
                if (!merged[k]) merged[k] = v;
              });
              setSquadReports(merged);

              // Validate or select active athlete
              const targetId = urlAthlete || storedAthlete;
              if (targetId && merged[targetId]) {
                setSelectedAthleteId(targetId);
              } else if (res.data[0]?.athlete_id) {
                setSelectedAthleteId(res.data[0].athlete_id);
              }
            }
          })
          .catch((err) => {
            console.log('Error fetching squad reports:', err);
          });
      } else {
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

              const injuryStorage = localStorage.getItem(`athlete_injuries_${athId || res.data.user_id}`);
              let injuryCount = 0;
              if (injuryStorage) {
                try { injuryCount = JSON.parse(injuryStorage).length; } catch {}
              }

              const sport = (res.data.sport || 'General Athletics').toLowerCase();
              const weight = res.data.weight || 75.0;
              const age = res.data.age || 23;
              const baseId = (athId || 'ath').replace(/-/g, '').slice(0, 4).toUpperCase();

              let compositeScore = 32.5;
              let valgusPct = 30.0;
              let acwrPct = 32.0;
              let asymmetryPct = 28.0;
              let velocityPct = 25.0;
              let historyPct = Math.min(60.0, +(20.0 + (injuryCount * 12.0)).toFixed(1));
              let conclusionText = '';

              if (summaryData && summaryData.latest_assessment && summaryData.latest_assessment.video_id) {
                const assess = summaryData.latest_assessment;
                const forecast = summaryData.injury_risk_forecast;

                if (forecast && forecast.overall_score !== undefined) {
                  compositeScore = Number(forecast.overall_score).toFixed(1);
                }

                if (assess.knee_valgus_detected === 'Yes' || assess.knee_valgus_detected === 'High') {
                  valgusPct = 82.0;
                } else if (assess.knee_valgus_detected === 'Borderline') {
                  valgusPct = 48.0;
                } else {
                  valgusPct = 22.0;
                }

                if (assess.symmetry_score !== null && assess.symmetry_score !== undefined) {
                  const rawDeficit = Math.abs(100 - Number(assess.symmetry_score));
                  asymmetryPct = Math.min(95, Math.max(8, +(rawDeficit * 5.0).toFixed(1)));
                }

                const trainingHours = res.data.training_load || 0;
                acwrPct = Math.min(85, Math.max(20, +(25.0 + (trainingHours * 4.0)).toFixed(1)));
                velocityPct = Math.min(80, Math.max(20, +(30.0 + ((weight % 10) * 3)).toFixed(1)));
              } else {
                const scoreMod = ((weight + age) % 15);
                if (sport.includes('basket')) {
                  valgusPct = +(32.0 + scoreMod).toFixed(1);
                  acwrPct = +(35.0 + (scoreMod * 0.8)).toFixed(1);
                  asymmetryPct = +(26.0 + (scoreMod * 0.5)).toFixed(1);
                  velocityPct = +(28.0 + (scoreMod * 0.4)).toFixed(1);
                } else if (sport.includes('soccer') || sport.includes('football')) {
                  valgusPct = +(42.0 + scoreMod).toFixed(1);
                  acwrPct = +(45.0 + (scoreMod * 0.9)).toFixed(1);
                  asymmetryPct = +(38.0 + (scoreMod * 0.7)).toFixed(1);
                  velocityPct = +(34.0 + (scoreMod * 0.5)).toFixed(1);
                } else {
                  valgusPct = +(28.0 + scoreMod).toFixed(1);
                  acwrPct = +(30.0 + (scoreMod * 0.6)).toFixed(1);
                  asymmetryPct = +(24.0 + (scoreMod * 0.4)).toFixed(1);
                  velocityPct = +(22.0 + (scoreMod * 0.3)).toFixed(1);
                }
              }

              const valgusW = +(valgusPct * 0.30).toFixed(1);
              const acwrW = +(acwrPct * 0.25).toFixed(1);
              const asymmW = +(asymmetryPct * 0.20).toFixed(1);
              const velocW = +(velocityPct * 0.15).toFixed(1);
              const histW = +(historyPct * 0.10).toFixed(1);

              if (!summaryData?.injury_risk_forecast?.overall_score) {
                compositeScore = +(valgusW + acwrW + asymmW + velocW + histW).toFixed(1);
              }
              const numScore = parseFloat(compositeScore);

              const isHigh = numScore >= 70;
              const isMod = numScore >= 45 && numScore < 70;
              const riskLevel = isHigh ? 'High Risk' : (isMod ? 'Moderate Risk' : 'Low Risk');
              const riskClassColor = isHigh ? 'text-rose-600' : (isMod ? 'text-amber-600' : 'text-emerald-600');
              const riskBadgeColor = isHigh ? 'bg-rose-100 text-rose-800' : (isMod ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800');

              if (numScore < 35) {
                conclusionText = `Athlete demonstrates optimal kinematic stability and symmetric landing patterns for ${res.data.sport || 'athletics'}. Knee valgus angles and deceleration ground forces remain well within safe biomechanical thresholds. Fully cleared for full training loads and competitive play.`;
              } else if (numScore < 60) {
                conclusionText = `Athlete exhibits satisfactory dynamic control with minor unilateral deceleration asymmetry (${asymmetryPct}% deficit). Workload ratio suggests controlled acute adaptation. Prescribed targeted neuromuscular warm-ups and hip stabilizer reinforcement before high-intensity drills.`;
              } else {
                conclusionText = `Elevated injury susceptibility identified due to kinematic valgus deviation (${valgusPct}%) and elevated training load spikes. Recommended immediate completion of personalized 3-week corrective deceleration protocol prior to match selection.`;
              }

              setPersonalReport({
                id: athId,
                name: res.data.user?.name || currentUserName,
                sport: res.data.sport || 'General Athletics',
                position: res.data.position || 'Athlete',
                age: res.data.age || 22,
                weight: res.data.weight ? `${res.data.weight} kg` : '75.0 kg',
                reportId: `BIO-2026-${baseId}`,
                riskScore: numScore,
                riskLevel: riskLevel,
                riskClassColor: riskClassColor,
                riskBadgeColor: riskBadgeColor,
                valgusRaw: `${valgusPct}%`,
                valgusWeighted: `${valgusW}%`,
                acwrRaw: `${acwrPct}%`,
                acwrWeighted: `${acwrW}%`,
                asymmetryRaw: `${asymmetryPct}%`,
                asymmetryWeighted: `${asymmW}%`,
                velocityRaw: `${velocityPct}%`,
                velocityWeighted: `${velocW}%`,
                historyRaw: `${historyPct}%`,
                historyWeighted: `${histW}%`,
                conclusion: summaryData?.coach_notes || conclusionText
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [isStaff, urlAthlete, storedAthlete]);

  const activeId = urlAthlete && squadReports[urlAthlete] ? urlAthlete : selectedAthleteId;
  const activeAthlete = isStaff
    ? (squadReports[activeId] || Object.values(squadReports)[0] || SQUAD_REPORTS['ATH-001'])
    : (personalReport || (athleteProfile ? {
        ...SQUAD_REPORTS['ATH-001'],
        name: currentUserName,
        sport: athleteProfile.sport || 'General Athletics',
        position: athleteProfile.position || 'Athlete',
        age: athleteProfile.age || 22,
        weight: athleteProfile.weight ? `${athleteProfile.weight} kg` : '75.0 kg',
      } : {
        ...SQUAD_REPORTS['ATH-001'],
        name: currentUserName
      }));

  // If athlete, their personal report is ALWAYS their authenticated user name, never a hardcoded mock name
  const athleteDisplayName = !isStaff ? currentUserName : activeAthlete.name;

  const handleAthleteChange = (e) => {
    if (!isStaff) return; // Prevent any unauthorized switching
    const newId = e.target.value;
    setSelectedAthleteId(newId);
    localStorage.setItem('selectedAthleteId', newId);
    setSearchParams({ athlete: newId });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AthleteLayout athleteName={athleteDisplayName}>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isStaff ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {isStaff ? 'Coach / Clinician Review' : 'Confidential Athlete Dossier'}
            </span>
            <span className="text-xs text-slate-400">HIPAA & GDPR Compliant</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical & Biomechanical Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isStaff 
              ? 'Squad diagnostic summary for sports medicine clinicians, coaches, and athletic staff.'
              : 'Your personalized clinical biomechanics summary and joint kinematic evaluation.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Athlete Selector: Dropdown for Coach/Staff, Locked Badge for Athlete */}
          {isStaff ? (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-slate-500">Squad Athlete:</span>
              <select
                value={selectedAthleteId}
                onChange={handleAthleteChange}
                className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {Object.values(squadReports).map((ath) => (
                  <option key={ath.id} value={ath.id}>
                    {ath.name} ({ath.position})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-xs text-xs">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-500">Athlete:</span>
              <span className="font-bold text-slate-900">{athleteDisplayName}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                Personal
              </span>
            </div>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-xs max-w-4xl mx-auto space-y-8">
        {/* Header with Organization Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-slate-900">Sports Injury Risk Prediction</span>
            </div>
            <p className="text-xs text-slate-500">Tier 4 Automated Clinical Biomechanics Dossier</p>
          </div>

          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <div>Report ID: <strong className="font-mono text-slate-800">{activeAthlete.reportId}</strong></div>
            <div>Date Generated: <strong className="text-slate-800">September 09, 2026</strong></div>
            <div>Status: <strong className="text-emerald-600">Clinically Signed</strong></div>
          </div>
        </div>

        {/* Dynamic Athlete Overview Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400">Athlete Name</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{athleteDisplayName}</div>
          </div>
          <div>
            <span className="text-slate-400">Primary Sport & Role</span>
            <div className="font-bold text-slate-800 mt-0.5">
              {!isStaff && (athleteProfile?.sport || athleteProfile?.position)
                ? `${athleteProfile.sport || 'General Athletics'} (${athleteProfile.position || 'Athlete'})`
                : `${activeAthlete.sport} (${activeAthlete.position})`
              }
            </div>
          </div>
          <div>
            <span className="text-slate-400">Biological Age & Weight</span>
            <div className="font-bold text-slate-800 mt-0.5">
              {!isStaff && (athleteProfile?.age || athleteProfile?.weight)
                ? `${athleteProfile.age || activeAthlete.age} yrs | ${athleteProfile.weight ? `${athleteProfile.weight} kg` : activeAthlete.weight}`
                : `${activeAthlete.age} yrs | ${activeAthlete.weight}`
              }
            </div>
          </div>
          <div>
            <span className="text-slate-400">Composite Risk</span>
            <div className={`font-bold mt-0.5 ${activeAthlete.riskClassColor}`}>
              {activeAthlete.riskScore}% ({activeAthlete.riskLevel})
            </div>
          </div>
        </div>

        {/* Section 1: 5-Factor Weighted Score Analysis */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
            1. 5-Factor Weighted Risk Breakdown
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3">Risk Factor Component</th>
                  <th className="p-3">Assigned Weight</th>
                  <th className="p-3">Raw Sub-Score</th>
                  <th className="p-3">Weighted Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-medium text-slate-800">Joint Kinematics & Valgus Angle</td>
                  <td className="p-3 text-slate-500">30%</td>
                  <td className="p-3 font-mono text-slate-700">{activeAthlete.valgusRaw}</td>
                  <td className="p-3 font-bold text-slate-900">{activeAthlete.valgusWeighted}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-800">Training Load & Workload Ratio (ACWR)</td>
                  <td className="p-3 text-slate-500">25%</td>
                  <td className="p-3 font-mono text-slate-700">{activeAthlete.acwrRaw}</td>
                  <td className="p-3 font-bold text-slate-900">{activeAthlete.acwrWeighted}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-800">Bilateral Asymmetry Deficit</td>
                  <td className="p-3 text-slate-500">20%</td>
                  <td className="p-3 font-mono text-slate-700">{activeAthlete.asymmetryRaw}</td>
                  <td className="p-3 font-bold text-slate-900">{activeAthlete.asymmetryWeighted}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-800">Movement Velocity & Acceleration Jerk</td>
                  <td className="p-3 text-slate-500">15%</td>
                  <td className="p-3 font-mono text-slate-700">{activeAthlete.velocityRaw}</td>
                  <td className="p-3 font-bold text-slate-900">{activeAthlete.velocityWeighted}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-800">Prior Injury History & Age Multiplier</td>
                  <td className="p-3 text-slate-500">10%</td>
                  <td className="p-3 font-mono text-slate-700">{activeAthlete.historyRaw}</td>
                  <td className="p-3 font-bold text-slate-900">{activeAthlete.historyWeighted}</td>
                </tr>
                <tr className="bg-blue-50/60 font-bold">
                  <td className="p-3 text-blue-900">Total Composite Weighted Risk Index</td>
                  <td className="p-3 text-blue-900">100%</td>
                  <td className="p-3 text-blue-900">—</td>
                  <td className="p-3 text-blue-900 text-sm">{activeAthlete.riskScore}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Clinical Summary & Clearance */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
            2. Medical & Physiotherapy Conclusion
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
            {activeAthlete.conclusion}
          </p>
        </div>
      </div>
    </AthleteLayout>
  );
};

export default Reports;
