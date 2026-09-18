import React, { useState, useEffect } from 'react';
import api from '../api';
import AthleteLayout from '../components/AthleteLayout';
import { AlertTriangle, ShieldCheck, Activity, Plus, CheckCircle2, X, Stethoscope } from 'lucide-react';

const COMMON_INJURIES = [
  'Hamstring Strain (Grade 1)',
  'Hamstring Strain (Grade 2)',
  'Ankle Inversion Sprain',
  'Knee Meniscus Irritation',
  'Patellar Tendinopathy',
  'Adductor Groin Strain',
  'Quadriceps Contusion',
  'ACL Partial Sprain (Grade 1)',
  'Lumbar Spine Facet Strain'
];

const BODY_PARTS = [
  'Left Hamstring',
  'Right Hamstring',
  'Left Ankle',
  'Right Ankle',
  'Left Knee',
  'Right Knee',
  'Groin / Adductor',
  'Lower Back / Spine',
  'Right Shoulder',
  'Left Shoulder'
];

const getDefaultInjuriesForAthlete = (profile) => {
  const sport = (profile?.sport || '').toLowerCase();
  const athId = profile?.athlete_id || profile?.user_id || 'default';

  if (sport.includes('basket')) {
    return [
      {
        id: 1,
        type: 'Patellar Tendinopathy (Jumper\'s Knee)',
        body_part: 'Right Knee',
        severity: 'Moderate',
        date: '2026-05-18',
        status: 'Recovered',
        rehab_duration: '4 weeks',
        risk_factor_multiplier: 1.25,
        notes: 'High repetitive jumping load during playoff tournament. Completed heavy slow resistance protocol.'
      },
      {
        id: 2,
        type: 'Ankle Inversion Sprain',
        body_part: 'Left Ankle',
        severity: 'Mild',
        date: '2026-02-14',
        status: 'Fully Cleared',
        rehab_duration: '2 weeks',
        risk_factor_multiplier: 1.10,
        notes: 'Landed on teammate foot during rebound drill. Proprioceptive balance training verified.'
      }
    ];
  }

  if (sport.includes('soccer') || sport.includes('football')) {
    return [
      {
        id: 1,
        type: 'Hamstring Strain (Grade 1)',
        body_part: 'Right Thigh',
        severity: 'Moderate',
        date: '2026-06-12',
        status: 'Recovered',
        rehab_duration: '4 weeks',
        risk_factor_multiplier: 1.25,
        notes: 'Occurred during high-speed sprint deceleration. Completed eccentric hamstring protocol.'
      },
      {
        id: 2,
        type: 'Adductor Groin Strain',
        body_part: 'Groin / Adductor',
        severity: 'Mild',
        date: '2026-01-20',
        status: 'Fully Cleared',
        rehab_duration: '3 weeks',
        risk_factor_multiplier: 1.15,
        notes: 'Sharp cutting maneuver during training match. Copenhagen adduction exercises completed.'
      }
    ];
  }

  if (sport.includes('run') || sport.includes('track')) {
    return [
      {
        id: 1,
        type: 'Medial Tibial Stress Syndrome',
        body_part: 'Right Lower Leg',
        severity: 'Mild',
        date: '2026-04-10',
        status: 'Recovered',
        rehab_duration: '3 weeks',
        risk_factor_multiplier: 1.15,
        notes: 'Volume ramp-up during tempo training block. Load management and gait modification resolved symptoms.'
      }
    ];
  }

  // Default baseline for general athletics
  return [
    {
      id: 1,
      type: 'Quadriceps Contusion',
      body_part: 'Left Thigh',
      severity: 'Mild',
      date: '2026-03-22',
      status: 'Fully Cleared',
      rehab_duration: '10 days',
      risk_factor_multiplier: 1.05,
      notes: 'Direct contact during scrimmage. Soft tissue flush and active mobility resolved tension.'
    }
  ];
};

const InjuryHistory = () => {
  const [athleteProfile, setAthleteProfile] = useState(null);
  const [athleteKey, setAthleteKey] = useState(() => localStorage.getItem('userId') || 'default');
  const [injuries, setInjuries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    api.get('/athlete/profile')
      .then((res) => {
        if (res.data) {
          setAthleteProfile(res.data);
          const key = res.data.athlete_id || res.data.user_id || 'default';
          setAthleteKey(key);

          const storageKey = `athlete_injuries_${key}`;
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            try {
              setInjuries(JSON.parse(saved));
            } catch {
              setInjuries(getDefaultInjuriesForAthlete(res.data));
            }
          } else {
            const defaults = getDefaultInjuriesForAthlete(res.data);
            setInjuries(defaults);
            localStorage.setItem(storageKey, JSON.stringify(defaults));
          }
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(`athlete_injuries_${athleteKey}`);
        if (saved) {
          try {
            setInjuries(JSON.parse(saved));
          } catch {
            setInjuries([]);
          }
        } else {
          setInjuries([]);
        }
      });
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    type: 'Hamstring Strain (Grade 1)',
    body_part: 'Left Hamstring',
    severity: 'Moderate',
    date: new Date().toISOString().split('T')[0],
    status: 'Active Rehab',
    rehab_duration: '3 weeks',
    notes: ''
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const multiplierMap = {
      Mild: 1.10,
      Moderate: 1.25,
      Severe: 1.45
    };

    const newIncident = {
      id: Date.now(),
      type: formData.type,
      body_part: formData.body_part,
      severity: formData.severity,
      date: formData.date,
      status: formData.status,
      rehab_duration: formData.rehab_duration,
      risk_factor_multiplier: multiplierMap[formData.severity] || 1.20,
      notes: formData.notes.trim() || 'Documented during team clinical assessment session.'
    };

    const updated = [newIncident, ...injuries];
    setInjuries(updated);
    try {
      const storageKey = `athlete_injuries_${athleteKey}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save injury log:', err);
    }

    setIsModalOpen(false);
    setToastMessage(`Incident "${newIncident.type}" successfully logged to medical record!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Recurrence vulnerability calculation
  const recurrenceScore = (injuries.length * 5.0).toFixed(1);
  const hasActiveInjury = injuries.some((i) => i.status === 'Active Rehab' || i.status === 'Modified Training');

  return (
    <AthleteLayout>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Injury History & Clearance</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Documented clinical records, previous trauma incidents, and kinetic recovery timeline.
          </p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Incident</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Historical Incidents</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{injuries.length}</div>
          <p className="text-xs text-slate-500 mt-2">Recorded clinical incidents in history</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Recurrence Vulnerability</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-600">+{recurrenceScore}%</div>
          <p className="text-xs text-slate-500 mt-2">Factor 5 weighting applied to overall risk index</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Medical Clearance</span>
            <ShieldCheck className={`w-4 h-4 ${hasActiveInjury ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <div className={`text-3xl font-bold ${hasActiveInjury ? 'text-amber-600' : 'text-emerald-600'}`}>
            {hasActiveInjury ? 'Under Rehab' : 'Cleared'}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {hasActiveInjury ? 'Modified training schedule active' : 'Signed off by Lead Physiotherapist'}
          </p>
        </div>
      </div>

      {/* Injury Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Detailed Incident Records</h3>
            <p className="text-xs text-slate-500">Chronological log of injury, functional rehab, and tissue history</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {injuries.length} Record{injuries.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-4">
          {injuries.map((injury) => {
            const isRecovered = injury.status === 'Recovered' || injury.status === 'Fully Cleared';
            return (
              <div key={injury.id} className="p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${isRecovered ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <h4 className="font-bold text-slate-900 text-sm">{injury.type}</h4>
                    <span className="text-xs text-slate-500 font-medium">({injury.body_part})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      isRecovered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {injury.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{injury.date}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-3">{injury.notes}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-200/60 pt-2.5 font-medium">
                  <span>Severity: <strong className="text-slate-700">{injury.severity}</strong></span>
                  <span>Rehabilitation: <strong className="text-slate-700">{injury.rehab_duration}</strong></span>
                  <span>Factor Weight Impact: <strong className="text-slate-700">{injury.risk_factor_multiplier}x</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log New Incident Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Log New Clinical Incident</h3>
                  <p className="text-[11px] text-slate-500">Record trauma or physical strain for AI risk recalibration</p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Injury Type */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Incident / Injury Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {COMMON_INJURIES.map((inj) => (
                      <option key={inj} value={inj}>{inj}</option>
                    ))}
                  </select>
                </div>

                {/* Anatomical Body Part */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Body Part Affected</label>
                  <select
                    name="body_part"
                    value={formData.body_part}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {BODY_PARTS.map((bp) => (
                      <option key={bp} value={bp}>{bp}</option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clinical Severity</label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Mild">Mild (Grade 1 - 1.10x)</option>
                    <option value="Moderate">Moderate (Grade 2 - 1.25x)</option>
                    <option value="Severe">Severe (Grade 3 - 1.45x)</option>
                  </select>
                </div>

                {/* Incident Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Incident Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Active Rehab">Active Rehab (Restricted)</option>
                    <option value="Modified Training">Modified Training</option>
                    <option value="Recovered">Recovered</option>
                    <option value="Fully Cleared">Fully Cleared</option>
                  </select>
                </div>

                {/* Expected Rehab Duration */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Rehab Duration</label>
                  <input
                    type="text"
                    name="rehab_duration"
                    value={formData.rehab_duration}
                    onChange={handleInputChange}
                    placeholder="e.g., 3 weeks, 10 days"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Mechanism / Clinical Notes */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Clinical Notes & Mechanism</label>
                  <textarea
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Describe how the trauma occurred (e.g. sharp turn during sprint, landing on opponent foot)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Incident Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AthleteLayout>
  );
};

export default InjuryHistory;
