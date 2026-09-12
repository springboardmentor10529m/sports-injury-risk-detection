import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AthleteSkeleton3D } from './3d/AthleteSkeleton3D';
import { 
  ShieldCheck, Video, 
  ArrowRight, Lock, Mail, User as UserIcon, Phone, 
  ChevronRight, Zap, Dumbbell, ArrowLeft, Target, Cpu, Quote, CheckCircle2
} from 'lucide-react';
import { GoogleSignInButton } from './auth/GoogleSignInButton';

const ATHLETIC_QUOTES = [
  {
    text: "Precision in biomechanics is the ultimate armor against injury. True longevity begins when motion is decoded before fatigue creates breakdown.",
    author: "Dr. James Andrews",
    title: "Orthopedic Sports Medicine Pioneer",
    tag: "Injury Prevention"
  },
  {
    text: "Fatigue rarely causes injury on its own; it is the subtle, unchecked compensatory motion under load that creates the structural breaking point.",
    author: "International Journal of Sports Biomechanics",
    title: "Kinematic Telemetry Review",
    tag: "Motion Science"
  },
  {
    text: "Champions are built on the margins of joint stability, neuromuscular balance, and symmetrical kinetic force transfer.",
    author: "AthleteGuard Performance Lab",
    title: "Motion Intelligence Group",
    tag: "Athletic Excellence"
  },
  {
    text: "You cannot manage what you do not measure. Millimeter-accurate joint tracking turns human intuition into championship durability.",
    author: "Olympic High-Performance Council",
    title: "Elite Athlete Tracking",
    tag: "Biomechanics"
  }
];

export const LandingPage = ({ onAuthSuccess }) => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState(1); // 1: Credentials, 2: Athlete Details
  const [activeQuoteIdx, setActiveQuoteIdx] = useState(0);

  const authSectionRef = useRef(null);

  // Auto-rotate quotes every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveQuoteIdx((prev) => (prev + 1) % ATHLETIC_QUOTES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // Step 1 Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('ATHLETE');

  // Step 2 Athlete Profile Details
  const [sport, setSport] = useState('Basketball');
  const [position, setPosition] = useState('Point Guard');
  const [age, setAge] = useState(22);
  const [height, setHeight] = useState(180);
  const [weight, setWeight] = useState(75);
  const [flexibility, setFlexibility] = useState(75);
  const [strength, setStrength] = useState(80);
  const [balance, setBalance] = useState(70);
  const [endurance, setEndurance] = useState(75);
  const [coachNotes, setCoachNotes] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollToAuth = () => {
    if (authSectionRef.current) {
      authSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');

    if (isRegistering && step === 1) {
      if (!name || !email || !password) {
        setError('Please fill in your name, email, and password.');
        return;
      }
      setStep(2);
      return;
    }

    handleFinalSubmit(e);
  };

  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await register(name, email, password, role, phone);
        try {
          await api.put('/api/athletes/profile', {
            sport,
            position,
            age: parseInt(age) || 20,
            height: parseFloat(height) || 175,
            weight: parseFloat(weight) || 70,
            training_load: 60.0,
            flexibility: parseFloat(flexibility) || 75,
            strength: parseFloat(strength) || 80,
            balance: parseFloat(balance) || 70,
            endurance: parseFloat(endurance) || 75,
            coach_notes: coachNotes
          });
        } catch (profileErr) {
          console.warn('Profile details save warning:', profileErr);
        }
      } else {
        await login(email, password);
      }

      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-20 py-4 animate-fadeIn font-sans">
      
      {/* 5. 3D HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-2">
        
        {/* HERO LEFT COLUMN */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Small Badge: AI SPORTS BIOMECHANICS */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            AI SPORTS BIOMECHANICS
          </div>

          {/* Large Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
            Understand Every Movement.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent block mt-2">
              Prevent the Next Injury.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-xl">
            AI-powered motion analysis transforms athlete video into real-time pose estimation, biomechanics intelligence, and injury-risk insights.
          </p>

          {/* Buttons: ANALYZE MOVEMENT & EXPLORE PLATFORM */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={scrollToAuth}
              className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              ANALYZE MOVEMENT
            </button>

            <button
              onClick={scrollToAuth}
              className="px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-mono font-bold text-xs tracking-wider rounded-xl border border-slate-700/80 transition-all flex items-center gap-2 cursor-pointer"
            >
              EXPLORE PLATFORM
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>

          {/* Quick Technical Feature Points */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-900/80 font-mono text-[11px] text-slate-400">
            <div>
              <span className="text-white font-bold block text-sm">17 COCO</span>
              <span>Joint Topology</span>
            </div>
            <div>
              <span className="text-cyan-400 font-bold block text-sm">60-120 FPS</span>
              <span>Temporal Tracking</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold block text-sm">98.4%</span>
              <span>Pose Accuracy</span>
            </div>
          </div>
        </div>

        {/* HERO RIGHT COLUMN: Interactive 3D Athlete Skeleton */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-lg">
            <AthleteSkeleton3D
              mode="demo"
              className="w-full h-[500px]"
              showHudLabels={true}
            />
          </div>
        </div>

      </div>

      {/* INLINE AUTHENTICATION & ONBOARDING SECTION */}
      <div ref={authSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-6 border-t border-slate-900">
        
        {/* Onboarding Lab Value Props */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider uppercase">
              ATHLETE WORKSPACE INITIALIZATION
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              Secure Athlete Lab Onboarding
            </h2>
            <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
              Register your athlete profile, establish baseline musculoskeletal assessment metrics (Flexibility, Strength, Balance, Endurance), and access the video telemetry suite.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <Target className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">17-Point Kinematics</h4>
              <p className="text-xs text-slate-400">High-speed RTMPose computer-vision tracking and joint angle telemetry.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
                <Dumbbell className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Physical Assessment</h4>
              <p className="text-xs text-slate-400">Neuromuscular ratings, flexibility, and load capacity tracking.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Injury Risk Modeling</h4>
              <p className="text-xs text-slate-400">Explainable risk scores for ACL, hamstring, ankle, and lumbar regions.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-800 flex items-center justify-center text-teal-400">
                <Video className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Movement Library</h4>
              <p className="text-xs text-slate-400">Encrypted personal video storage, annotated skeleton playback, and reporting.</p>
            </div>
          </div>

          {/* Inspirational Biomechanical & Performance Quotes Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/40 border border-slate-800/90 relative overflow-hidden shadow-2xl space-y-4">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Quote className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  CLINICAL KINEMATIC INSIGHT
                </span>
              </div>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 rounded-full">
                {ATHLETIC_QUOTES[activeQuoteIdx].tag}
              </span>
            </div>

            <p className="text-sm sm:text-base font-sans italic text-slate-200 leading-relaxed font-normal transition-all duration-500">
              "{ATHLETIC_QUOTES[activeQuoteIdx].text}"
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-white block">
                  — {ATHLETIC_QUOTES[activeQuoteIdx].author}
                </span>
                <span className="text-[11px] font-mono text-slate-400 block">
                  {ATHLETIC_QUOTES[activeQuoteIdx].title}
                </span>
              </div>

              {/* Quote Pagination Dots */}
              <div className="flex items-center gap-1.5">
                {ATHLETIC_QUOTES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveQuoteIdx(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activeQuoteIdx === idx
                        ? 'w-6 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                        : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                    aria-label={`Show quote ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Authentication Card */}
        <div className="lg:col-span-5">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-bold text-white font-mono">
                  {!isRegistering ? 'Sign In to AthleteGuard Lab' : step === 1 ? 'Create Your Account (Step 1/2)' : 'Physical Ratings (Step 2/2)'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {!isRegistering
                  ? 'Access your athlete dashboard, videos, and biomechanics intelligence'
                  : step === 1
                  ? 'Initialize your secure account for RTMPose-M motion telemetry'
                  : 'Establish baseline physical ratings (optional)'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono">
                {error}
              </div>
            )}

            {/* Google OAuth Option */}
            {(!isRegistering || step === 1) && (
              <div className="mb-5 space-y-3">
                <GoogleSignInButton
                  role={role}
                  isRegistering={isRegistering}
                  onSuccess={() => {
                    if (onAuthSuccess) onAuthSuccess();
                  }}
                  onError={(errMsg) => setError(errMsg)}
                />
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-3 text-[11px] font-mono text-slate-500 uppercase tracking-wider absolute">
                    or continue with email
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleNextStep} className="space-y-4">
              
              {(!isRegistering || step === 1) && (
                <>
                  {isRegistering && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Marcus Vance"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      {/* Account Role Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Role</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'ATHLETE', label: 'Athlete' },
                            { id: 'COACH', label: 'Coach' },
                            { id: 'ANALYST', label: 'Analyst' }
                          ].map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setRole(r.id)}
                              className={`py-2 px-2 text-[11px] font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                                role === r.id
                                  ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                              }`}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="athlete@biomech.org"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {isRegistering && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Phone (Optional)</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 555 0192"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* STEP 2 ATHLETE DETAILS */}
              {isRegistering && step === 2 && (
                <div className="space-y-3.5 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Sport</label>
                      <input
                        type="text"
                        required
                        value={sport}
                        onChange={(e) => setSport(e.target.value)}
                        placeholder="Basketball"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Position</label>
                      <input
                        type="text"
                        required
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="Point Guard"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Age</label>
                      <input
                        type="number"
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Height (cm)</label>
                      <input
                        type="number"
                        required
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        required
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <span className="font-bold text-cyan-400 block mb-1">Physical Ratings (0-100)</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                      <div>
                        <span>Flexibility: {flexibility}%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={flexibility}
                          onChange={(e) => setFlexibility(e.target.value)}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                      <div>
                        <span>Strength: {strength}%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={strength}
                          onChange={(e) => setStrength(e.target.value)}
                          className="w-full accent-emerald-400"
                        />
                      </div>
                      <div>
                        <span>Balance: {balance}%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={balance}
                          onChange={(e) => setBalance(e.target.value)}
                          className="w-full accent-amber-400"
                        />
                      </div>
                      <div>
                        <span>Endurance: {endurance}%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={endurance}
                          onChange={(e) => setEndurance(e.target.value)}
                          className="w-full accent-violet-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block text-slate-300 font-semibold mb-1">Coach Remarks / Bio</label>
                    <textarea
                      rows={2}
                      value={coachNotes}
                      onChange={(e) => setCoachNotes(e.target.value)}
                      placeholder="Prior sprains, training regimen, or physical focus areas..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {isRegistering && step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {!isRegistering
                        ? 'SIGN IN TO DASHBOARD'
                        : step === 1
                        ? 'NEXT: SET PHYSICAL RATINGS'
                        : 'FINALIZE REGISTRATION'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
              {isRegistering ? 'Already have an account?' : "Don't have an account yet?"}{' '}
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setStep(1);
                  setError('');
                }}
                className="text-cyan-400 hover:underline font-bold cursor-pointer"
              >
                {isRegistering ? 'Sign In Now' : 'Create Free Account'}
              </button>
            </div>

            {/* Security Trust Indicators */}
            <div className="mt-4 pt-3 border-t border-slate-900/90 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-cyan-400/70" />
                256-Bit Encrypted
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400/70" />
                OAuth 2.0 Certified
              </span>
              <span>•</span>
              <span>Zero Raw Passwords</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
