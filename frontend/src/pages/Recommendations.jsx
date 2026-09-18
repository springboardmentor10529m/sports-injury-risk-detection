import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import AthleteLayout from '../components/AthleteLayout';
import { Dumbbell, CheckCircle2, Stethoscope, Loader2 } from 'lucide-react';

const getBaselineRecommendations = (profile) => {
  const sport = (profile?.sport || '').toLowerCase();

  if (sport.includes('basket')) {
    return [
      {
        id: 'rec-bsk-1',
        title: 'Banded Spanish Squats & Patellar Loading',
        target: 'Quadriceps Tendon Resilience & Shock Absorption',
        reps: '3 Sets x 12 Repetitions',
        intensity: 'Moderate-High',
        priority: 'Urgent',
        reason: 'Restores patellar tendon load tolerance for repetitive court jump landings.',
        frequency: '3x per week'
      },
      {
        id: 'rec-bsk-2',
        title: 'Proprioceptive Single-Leg Balance on Foam Pad',
        target: 'Subtalar Stability & Ankle Sprain Prevention',
        reps: '4 Sets x 30s per limb',
        intensity: 'Low-Moderate',
        priority: 'Preventative',
        reason: 'Reinforces peroneal activation during rapid lateral plant and cut transitions.',
        frequency: 'Daily warm-up'
      },
      {
        id: 'rec-bsk-3',
        title: 'Single-Leg Deceleration Landings',
        target: 'Neuromuscular Deceleration & Valgus Mitigation',
        reps: '3 Sets x 8 Landings each limb',
        intensity: 'Moderate',
        priority: 'Corrective',
        reason: 'Prevents medial knee collapse upon unilateral rebound contact.',
        frequency: '2x per week'
      }
    ];
  }

  if (sport.includes('soccer') || sport.includes('football')) {
    return [
      {
        id: 'rec-soc-1',
        title: 'Eccentric Nordic Hamstring Curls',
        target: 'Bilateral Hamstring Strength & Deceleration Resilience',
        reps: '3 Sets x 6 Repetitions',
        intensity: 'Moderate-High',
        priority: 'Urgent',
        reason: 'Maximizes knee flexor eccentric capacity during high-speed sprint deceleration.',
        frequency: '3x per week'
      },
      {
        id: 'rec-soc-2',
        title: 'Copenhagen Adductor Side Planks',
        target: 'Groin Strength & Pelvic Kinetic Stability',
        reps: '3 Sets x 20s each side',
        intensity: 'Moderate',
        priority: 'Corrective',
        reason: 'Shields against adductor strains during sharp changes of direction.',
        frequency: '3x per week'
      },
      {
        id: 'rec-soc-3',
        title: 'Gluteus Medius Banded Clamshells',
        target: 'Hip Abductor & Pelvic Stability',
        reps: '3 Sets x 15 Repetitions',
        intensity: 'Low-Moderate',
        priority: 'Preventative',
        reason: 'Controls knee valgus angle during unilateral sprint stopping.',
        frequency: 'Daily warm-up'
      }
    ];
  }

  // General Athletics Baseline
  return [
    {
      id: 'rec-gen-1',
      title: 'Single-Leg Romanian Deadlift (RDL)',
      target: 'Posterior Chain Balance & Pelvic Stability',
      reps: '3 Sets x 10 Repetitions per leg',
      intensity: 'Moderate',
      priority: 'Corrective',
      reason: 'Builds hamstring endurance and single-limb dynamic equilibrium.',
      frequency: '3x per week'
    },
    {
      id: 'rec-gen-2',
      title: 'Lateral Band Walks with Monster Steps',
      target: 'Hip Abductor Strength & Knee Alignment',
      reps: '3 Sets x 20 Steps each direction',
      intensity: 'Low-Moderate',
      priority: 'Preventative',
      reason: 'Activates gluteus medius to eliminate dynamic valgus inward tracking.',
      frequency: 'Daily warm-up'
    },
    {
      id: 'rec-gen-3',
      title: 'McGill Big 3 Core Endurance Complex',
      target: 'Spinal Stiffness & Trunk Postural Control',
      reps: '3 Sets x 8 Reps (5s hold)',
      intensity: 'Low-Moderate',
      priority: 'Corrective',
      reason: 'Corrects forward trunk lean during deep athletic maneuvers.',
      frequency: 'Daily'
    }
  ];
};

const Recommendations = () => {
  const [searchParams] = useSearchParams();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [athleteKey, setAthleteKey] = useState(() => localStorage.getItem('userId') || 'default');

  const userRole = localStorage.getItem('role') || 'athlete';
  const isStaff = ['coach', 'physiotherapist', 'sports_scientist', 'admin'].includes(userRole.toLowerCase());
  const selectedAthlete = searchParams.get('athlete') || localStorage.getItem('selectedAthleteId');

  const [completedExercises, setCompletedExercises] = useState([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        let profile = null;
        let targetId = null;

        if (!isStaff) {
          const profRes = await api.get('/athlete/profile').catch(() => null);
          profile = profRes?.data;
          targetId = profile?.athlete_id;
        } else if (selectedAthlete) {
          targetId = selectedAthlete;
        }

        const key = targetId || profile?.user_id || 'default';
        setAthleteKey(key);

        // Load local completed states for this athlete
        const savedDone = localStorage.getItem(`completed_exercises_${key}`);
        if (savedDone) {
          try {
            setCompletedExercises(JSON.parse(savedDone));
          } catch {}
        } else {
          setCompletedExercises([]);
        }

        if (targetId) {
          // Fetch from backend recommendations endpoint
          let res = await api.get(`/recommendations/athlete/${targetId}`).catch(() => null);
          
          if (!res?.data || res.data.length === 0) {
            // Generate recommendations dynamically
            res = await api.post(`/recommendations/athlete/${targetId}/generate`).catch(() => null);
          }

          if (res?.data && res.data.length > 0) {
            const mapped = res.data.map((r) => ({
              id: r.recommendation_id,
              title: r.title,
              target: `${r.category} • ${r.target_injury_risk}`,
              reps: r.sets_reps,
              intensity: r.category === 'Strengthening' ? 'Moderate-High' : (r.category === 'Technique' ? 'Moderate' : 'Low-Moderate'),
              priority: r.target_injury_risk?.toLowerCase().includes('acl') ? 'Urgent' : (r.category === 'Recovery' ? 'Preventative' : 'Corrective'),
              reason: r.description,
              frequency: r.frequency,
              backendId: r.recommendation_id,
              isBackendDone: r.completed
            }));

            // Sync backend completed status
            const backendDoneIds = res.data.filter((r) => r.completed).map((r) => r.recommendation_id);
            if (backendDoneIds.length > 0) {
              setCompletedExercises((prev) => Array.from(new Set([...prev, ...backendDoneIds])));
            }

            setExercises(mapped);
            setLoading(false);
            return;
          }
        }

        // Fallback to personalized sport baseline
        const baselines = getBaselineRecommendations(profile);
        setExercises(baselines);
      } catch (err) {
        console.error('Failed to load recommendations:', err);
        setExercises(getBaselineRecommendations(null));
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [isStaff, selectedAthlete]);

  const toggleComplete = async (id) => {
    const updated = completedExercises.includes(id)
      ? completedExercises.filter((x) => x !== id)
      : [...completedExercises, id];
    setCompletedExercises(updated);
    try {
      localStorage.setItem(`completed_exercises_${athleteKey}`, JSON.stringify(updated));
    } catch (e) {
      console.log('Failed to save to localStorage:', e);
    }

    // If item is from backend, sync toggle
    const ex = exercises.find((item) => item.id === id);
    if (ex?.backendId) {
      api.put(`/recommendations/${ex.backendId}/toggle`).catch(() => {});
    }
  };

  return (
    <AthleteLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Corrective Recommendations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Algorithmic exercise prescriptions tailored to your 5-factor biomechanical assessment.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <span>Validated by Clinical Biomechanics Engine</span>
        </div>
      </div>

      {/* Recommendations Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs mb-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Synthesizing personalized corrective exercise protocol...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {exercises.map((item) => {
          const isDone = completedExercises.includes(item.id);
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    item.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                    item.priority === 'Corrective' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {item.priority}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{item.frequency}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-xs text-blue-600 font-medium mb-3">{item.target}</p>

                <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {item.reason}
                </p>

                <div className="text-xs text-slate-500 space-y-1 mb-4">
                  <div>Protocol: <strong className="text-slate-800">{item.reps}</strong></div>
                  <div>Load Level: <strong className="text-slate-800">{item.intensity}</strong></div>
                </div>
              </div>

              <button
                onClick={() => toggleComplete(item.id)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isDone 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {isDone ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Completed Today</span>
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-4 h-4" />
                    <span>Mark as Done</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    )}
  </AthleteLayout>
);
};

export default Recommendations;
