import React, { useState } from 'react';
import AthleteLayout from '../components/AthleteLayout';
import { Settings as SettingsIcon, Bell, Cpu, Sliders, Shield, Save, CheckCircle2 } from 'lucide-react';

const Settings = () => {
  const [highRiskThreshold, setHighRiskThreshold] = useState(70);
  const [moderateRiskThreshold, setModerateRiskThreshold] = useState(45);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoProcessMediaPipe, setAutoProcessMediaPipe] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AthleteLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform & Model Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Configure biomechanical alert thresholds, ML model inference parameters, and notification triggers.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 max-w-3xl shadow-xs">
        {saved && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Thresholds */}
          <div className="pb-6 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Biomechanical Risk Categorization Thresholds</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Set percentage cutoffs for 5-factor weighted injury alerts.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  High Risk Cutoff (%)
                </label>
                <input
                  type="number"
                  value={highRiskThreshold}
                  onChange={(e) => setHighRiskThreshold(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Moderate Risk Cutoff (%)
                </label>
                <input
                  type="number"
                  value={moderateRiskThreshold}
                  onChange={(e) => setModerateRiskThreshold(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* AI Inference settings */}
          <div className="pb-6 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Edge AI & Computer Vision Pipelines</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Automation and landmark tracking features.</p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoProcessMediaPipe}
                  onChange={(e) => setAutoProcessMediaPipe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">
                  Automatically trigger MediaPipe 33-point pose landmark tracking immediately upon video upload
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700">
                  Send critical asymmetry alerts to team athletic trainer and head physiotherapist
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-5 rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </form>
      </div>
    </AthleteLayout>
  );
};

export default Settings;
