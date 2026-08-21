import React from 'react';
import Link from 'next/link';
import {
  ActivityIcon,
  ShieldCheckIcon,
  UsersIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldAlertIcon,
} from '../components/ui/Icons';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-primary selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
              S
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">SafeMove</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-brand-primary transition-colors">How It Works</a>
            <a href="#risk-model" className="hover:text-brand-primary transition-colors">Risk Model</a>
            <a href="#roles" className="hover:text-brand-primary transition-colors">Roles</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-brand-primary px-3.5 py-2 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-brand-primary text-white hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-50 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-brand-primary text-xs font-semibold uppercase tracking-wider mb-6">
              <ShieldAlertIcon className="w-3.5 h-3.5" />
              <span>Next-Gen Sports Injury Risk Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-950 tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6">
              Prevent injuries <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-blue-600 to-teal-600">
                before they happen.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              SafeMove combines computer vision pose estimation, kinematic biomechanics, and multi-factor risk modeling to detect movement abnormalities and safeguard athlete longevity.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-brand-primary hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                <span>Get Started Free</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm transition-all active:scale-95"
              >
                Sign In to Dashboard
              </Link>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
              <div className="p-4 bg-white/80 rounded-2xl border border-slate-200/80 shadow-sm backdrop-blur-sm">
                <div className="text-2xl font-bold text-slate-900 mb-0.5">35%</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Biomechanical Weight</div>
              </div>
              <div className="p-4 bg-white/80 rounded-2xl border border-slate-200/80 shadow-sm backdrop-blur-sm">
                <div className="text-2xl font-bold text-brand-primary mb-0.5">15 Joints</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kinematic Tracking</div>
              </div>
              <div className="p-4 bg-white/80 rounded-2xl border border-slate-200/80 shadow-sm backdrop-blur-sm">
                <div className="text-2xl font-bold text-teal-600 mb-0.5">5 Roles</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinical & Team Workflows</div>
              </div>
              <div className="p-4 bg-white/80 rounded-2xl border border-slate-200/80 shadow-sm backdrop-blur-sm">
                <div className="text-2xl font-bold text-emerald-600 mb-0.5">Real-Time</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Decision Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* How SafeMove Works */}
        <section id="how-it-works" className="py-20 bg-white border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Pipeline Architecture</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-2 mb-4">
                From video capture to clinical mitigation
              </h2>
              <p className="text-slate-600 text-base">
                SafeMove converts standard smartphone or broadcast video into precision joint kinematics, evaluating risk across 5 critical dimensions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/70 relative">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-brand-primary font-bold flex items-center justify-center mb-4">1</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Video Ingestion</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload jump landings, sprint cuts, or squats in MP4/MOV format. Automated frame validation guarantees processing fidelity.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/70 relative">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center mb-4">2</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Pose & Kinematics</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Tracks 15 anatomical keypoints with sub-pixel precision. Calculates dynamic joint angles, range of motion, and symmetry indices.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/70 relative">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center mb-4">3</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Composite Risk Engine</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Integrates movement anomalies, historical injury records, bilateral asymmetry, training workload, and fatigue signals.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/70 relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center mb-4">4</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Targeted Action</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Delivers personalized corrective exercise prescriptions, load adjustments, and physiotherapist recommendations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Biomechanical Risk Model Specifications */}
        <section id="risk-model" className="py-20 bg-slate-50 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Evidence-Based Modeling</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-2 mb-4">
                Five-Factor Injury Risk Formulation
              </h2>
              <p className="text-slate-600 text-base">
                Multi-factorial risk calculation aligned with sports medicine research and sports science consensus.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-brand-primary mb-2">35%</div>
                  <h4 className="font-bold text-slate-900 text-base mb-1">Biomechanical Deviations</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dynamic knee valgus, trunk lateral tilt, landing impact stiffness, and hip drop angles.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-rose-600 mb-2">20%</div>
                  <h4 className="font-bold text-slate-900 text-base mb-1">Injury History</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Prior ACL reconstructions, recurring hamstring strains, and joint laxity records.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-amber-600 mb-2">20%</div>
                  <h4 className="font-bold text-slate-900 text-base mb-1">Bilateral Asymmetry</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Left-vs-right limb discrepancy during deceleration, cut mechanics, and vertical propulsions.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-teal-600 mb-2">15%</div>
                  <h4 className="font-bold text-slate-900 text-base mb-1">Training Load</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Acute-to-chronic workload spikes (ACWR) and session rate of perceived exertion (RPE).
                  </p>
                </div>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-blue-600 mb-2">10%</div>
                  <h4 className="font-bold text-slate-900 text-base mb-1">Fatigue Indicators</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Kinematic degradation across high-repetition series and late-session movement decay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section id="roles" className="py-20 bg-white border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Built for the Entire Sports Ecosystem</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-2 mb-4">
                Tailored workflows for all 5 roles
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-brand-primary flex items-center justify-center mb-4">
                  <ActivityIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Athletes</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Track individual risk scores, log daily training sessions, upload movement videos, and receive corrective exercises.
                </p>
                <ul className="text-xs text-slate-500 space-y-2">
                  <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" /> Personal injury risk dashboard</li>
                  <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" /> Training load & recovery logs</li>
                </ul>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                  <UsersIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Coaches</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Monitor team readiness, identify athletes in high-risk zones, and optimize training volume before matchday.
                </p>
                <ul className="text-xs text-slate-500 space-y-2">
                  <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" /> Team roster risk stratification</li>
                  <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" /> Session load management</li>
                </ul>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Physiotherapists</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Track rehabilitation progression, log specific musculoskeletal injuries, and prescribe targeted exercise regimens.
                </p>
                <ul className="text-xs text-slate-500 space-y-2">
                  <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" /> Longitudinal injury tracking</li>
                  <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" /> Exercise prescription workflows</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Clinical Disclaimer Callout */}
        <section className="py-12 bg-blue-50/50 border-b border-blue-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-2 text-brand-primary font-semibold text-sm mb-2">
              <ShieldAlertIcon className="w-4 h-4" />
              <span>Medical & Clinical Decision Support Disclaimer</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              SafeMove provides objective biomechanical measurements and probabilistic injury risk indicators for decision support. Outputs do not constitute clinical diagnoses, surgical recommendations, or medical clearance. Always consult qualified sports medicine physicians.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center font-bold text-xs text-white">
              S
            </div>
            <span className="font-bold text-base tracking-tight">SafeMove</span>
            <span className="text-slate-400 text-xs ml-2">© 2026 SafeMove Platform. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            <a href="#how-it-works" className="hover:text-white transition-colors">Architecture</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
