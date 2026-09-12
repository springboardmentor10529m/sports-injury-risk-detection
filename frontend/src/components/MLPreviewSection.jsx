import React from 'react';
import { Sparkles, Cpu, Activity, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

export const MLPreviewSection = ({ onUploadClick }) => {
  const steps = [
    {
      id: '01',
      title: 'Pose Estimation Engine',
      tech: 'RTMPose-M ONNX (SimCC • 17 COCO Keypoints)',
      desc: 'Tracks 17 anatomical keypoints at high speed using coordinate classification and One-Euro temporal filtering.',
      badge: 'Step 1',
      status: 'LIVE (RTMPose-M)'
    },
    {
      id: '02',
      title: 'Biomechanical Kinematics Engine',
      tech: '20 Standardized Kinematic Features',
      desc: 'Computes knee valgus angle, hip stability index, trunk lean, joint alignment, and bilateral asymmetry scores.',
      badge: 'Step 2',
      status: 'LIVE'
    },
    {
      id: '03',
      title: 'Supervised Injury Predictor',
      tech: 'Calibrated XGBoost (Platt Scaling)',
      desc: 'Evaluates 19 workload & kinematic proxy features trained on Lövdal & Swathikiran cohorts (AUC 0.814, Brier 0.051).',
      badge: 'Step 3',
      status: 'TRAINED & CALIBRATED'
    },
    {
      id: '04',
      title: 'Evidence-Based Recommendations',
      tech: 'Clinical Screening & Corrective Engine',
      desc: 'Generates targeted corrective mobility routines, strengthening exercises, and training workload modifications.',
      badge: 'Step 4',
      status: 'OPERATIONAL'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-purple-950/40 border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Production AI & Biomechanics Screening System
          </div>

          <h2 className="text-3xl font-extrabold text-white">
            Integrated Computer Vision & Supervised ML Architecture
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Athlete videos are processed frame-by-frame using the OpenMMLab RTMPose-M deep learning model. Extracted kinematic proxies and workload metrics feed into our Calibrated XGBoost classifier (trained on 45,000+ authentic athlete records with subject-level cross-validation) alongside our 5-factor screening engine.
          </p>

          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-purple-500/20 transition-all"
          >
            Upload Movement Video for Processing
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Step Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step) => (
          <div
            key={step.id}
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all shadow-xl relative flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-black text-slate-700">{step.id}</span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold text-purple-300 bg-purple-950 rounded-full border border-purple-800">
                  {step.badge}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-1">{step.title}</h3>
              <p className="text-[11px] font-semibold text-cyan-400 mb-3">{step.tech}</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{step.desc}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>STATUS</span>
              <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                {step.status}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
