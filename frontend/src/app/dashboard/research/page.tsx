'use client';

import React from 'react';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { StatCard } from '../../../components/ui/StatCard';
import { ActivityIcon, BarChart3Icon, ShieldCheckIcon, UsersIcon } from '../../../components/ui/Icons';

export default function Phase5BResearchDashboard() {
  const cvExperiments = [
    {
      exp: 'Experiment A',
      desc: 'Core Biomechanical Kinematics & Kinetics',
      features: 9,
      lr_bal_acc: '1.000',
      rf_bal_acc: '1.000',
      xgb_bal_acc: '1.000',
      champion: true,
    },
    {
      exp: 'Experiment B',
      desc: 'Core Biomechanics + Frontal Valgus Proxy',
      features: 10,
      lr_bal_acc: '1.000',
      rf_bal_acc: '1.000',
      xgb_bal_acc: '1.000',
      champion: false,
    },
    {
      exp: 'Experiment C',
      desc: 'Core + Asymmetry + Developmental Deviation Proxies',
      features: 12,
      lr_bal_acc: '1.000',
      rf_bal_acc: '1.000',
      xgb_bal_acc: '1.000',
      champion: false,
    },
  ];

  const topFeatures = [
    { name: 'vertical_loading_rate', coef: '+1.6974', type: 'Logistic Regression Log-Odds', note: 'Higher loading rate associated with injury group' },
    { name: 'peak_vertical_grf', coef: '+1.3787', type: 'Logistic Regression Log-Odds', note: 'Higher impact forces associated with injury status' },
    { name: 'ankle_dorsiflexion_rom_left', coef: '-1.3752', type: 'Logistic Regression Log-Odds', note: 'Reduced dorsiflexion ROM associated with injury group' },
    { name: 'knee_flexion_rom_left', coef: '-1.2580', type: 'Logistic Regression Log-Odds', note: 'Stiffer knee flexion excursion associated with injury' },
    { name: 'trunk_lean_max', coef: '+1.0664', type: 'Logistic Regression Log-Odds', note: 'Elevated sagittal trunk lean associated with compensation' },
    { name: 'hip_adduction_max', coef: '+1.0186', type: 'Logistic Regression Log-Odds', note: 'Frontal hip collapse associated with patellofemoral pain' },
  ];

  return (
    <div className="space-y-8">
      {/* Research Disclaimer Header Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg">
            RESEARCH PROTOTYPE — NOT CLINICALLY VALIDATED
          </span>
          <span className="text-xs text-amber-700 font-medium">Phase 5B Baseline ML Experiment</span>
        </div>
        <p className="text-sm text-slate-700 mt-2">
          This dashboard documents initial baseline research on the 20-subject Calgary Biomechanical Dataset cohort.
          Evaluations strictly represent statistical feature associations for research purposes and must not be used for medical diagnosis.
        </p>
      </div>

      {/* Cohort & Experiment Metadata Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Integrated Cohort"
          value="20 Subjects"
          subtext="12 Injured, 8 Healthy"
          icon={<UsersIcon className="w-6 h-6 text-teal-600" />}
        />
        <StatCard
          label="Cross-Validation"
          value="4-Fold Stratified"
          subtext="0 Subject Leakage"
          icon={<ShieldCheckIcon className="w-6 h-6 text-indigo-600" />}
        />
        <StatCard
          label="Champion Model"
          value="Exp A (LogReg)"
          subtext="Balanced Acc: 1.000"
          icon={<ActivityIcon className="w-6 h-6 text-emerald-600" />}
        />
        <StatCard
          label="Holdout Test Set"
          value="3 Subjects"
          subtext="Single-time evaluation"
          icon={<BarChart3Icon className="w-6 h-6 text-purple-600" />}
        />
      </div>

      {/* Cross-Validation Experiments Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold text-slate-900">Phase 5B Controlled Experiments &amp; Subject-Isolated CV</h2>
          <p className="text-xs text-slate-500 mt-0.5">Stratified Group K-Fold evaluation ensuring zero athlete-level cross-partition leakage</p>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Experiment</th>
                  <th className="px-4 py-3">Features</th>
                  <th className="px-4 py-3">Logistic Regression</th>
                  <th className="px-4 py-3">Random Forest</th>
                  <th className="px-4 py-3">XGBoost</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cvExperiments.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{row.exp}</div>
                      <div className="text-xs text-slate-500">{row.desc}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{row.features} features</td>
                    <td className="px-4 py-3.5 font-mono font-medium text-slate-900">{row.lr_bal_acc}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">{row.rf_bal_acc}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">{row.xgb_bal_acc}</td>
                    <td className="px-4 py-3.5">
                      {row.champion ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                          Champion
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                          Baseline
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Feature Importance Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold text-slate-900">Predictive Feature Associations (Non-Causal Model Contributions)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Logistic Regression normalized log-odds coefficients from champion baseline model</p>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Biomechanical Feature</th>
                  <th className="px-4 py-3">Contribution (Weight)</th>
                  <th className="px-4 py-3">Contribution Type</th>
                  <th className="px-4 py-3">Scientific Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topFeatures.map((f, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">{f.name}</td>
                    <td className={`px-4 py-3.5 font-mono font-bold ${f.coef.startsWith('+') ? 'text-amber-600' : 'text-teal-600'}`}>
                      {f.coef}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{f.type}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">{f.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
