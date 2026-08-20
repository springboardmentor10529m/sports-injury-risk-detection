import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Database, Cpu, Activity, ShieldCheck, Terminal, Layers } from 'lucide-react';

export const ClinicalDashboard = () => {
  const { user } = useAuth();

  // Mock MongoDB ai_logs documents
  const aiLogs = [
    {
      _id: '66b1f2389a1c2d001e4a9001',
      video_id: 'vid_401',
      model_name: 'mediapipe-pose-v2',
      model_version: '2.4.1-cuda',
      inference_time: 18.4,
      confidence: 0.962,
      output: { status: 'success', keypoints_extracted: 33, frames_processed: 870 },
      created_at: '2026-08-20T14:21:10Z'
    },
    {
      _id: '66b1f2389a1c2d001e4a9002',
      video_id: 'vid_401',
      model_name: 'biomech-risk-classifier-xgboost',
      model_version: '1.8.0',
      inference_time: 4.2,
      confidence: 0.915,
      output: { risk_level: 'high', valgus_degrees: 14.8, acl_prob: 0.82 },
      created_at: '2026-08-20T14:21:25Z'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Admin / Clinical Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/60 border border-purple-500/30 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-purple-500/20">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-bold text-purple-400 bg-purple-950 border border-purple-800 rounded-full uppercase">
                CLINICAL & AI LOGS FEED ({user?.role || 'ADMIN'})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              MongoDB AI Model Logs & Pipeline Metrics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Unstructured Document Logs, Inference Latencies, and Computer Vision Model Outputs
            </p>
          </div>
        </div>
      </div>

      {/* MongoDB Logs Feed */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-400" />
          MongoDB Collection: <code class="font-mono text-purple-400">ai_logs</code>
        </h3>

        <div className="space-y-4">
          {aiLogs.map((log) => (
            <div key={log._id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 font-mono text-xs space-y-3 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-300 gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">_id: {log._id}</span>
                  <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800/60 rounded text-[10px]">
                    {log.model_name}:{log.model_version}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                  <span>Inference Latency: <strong class="text-emerald-400">{log.inference_time} ms</strong></span>
                  <span>Confidence: <strong class="text-cyan-400">{(log.confidence * 100).toFixed(1)}%</strong></span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto">
                <span className="text-slate-500 text-[10px] block mb-1">// Raw Output JSON Document</span>
                <pre>{JSON.stringify(log.output, null, 2)}</pre>
              </div>

              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>Ref video_id: {log.video_id}</span>
                <span>Timestamp: {log.created_at}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
