import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  ShieldCheck, Activity, Video, Sparkles, UserCheck, 
  ArrowRight, Lock, Mail, User as UserIcon, Phone, 
  ChevronRight, Award, Zap, HeartPulse, CheckCircle2, Dumbbell, Ruler, Scale, ArrowLeft
} from 'lucide-react';

export const LandingPage = ({ onAuthSuccess }) => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState(1); // 1: Credentials, 2: Athlete Details (for registration)

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
        // 1. Register User & Login
        await register(name, email, password, role, phone);
        
        // 2. Save Athlete Profile Details
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
    <div className="w-full max-w-7xl mx-auto space-y-16 py-6 animate-fadeIn">
      
      {/* Hero Section & Inline Sign In / Registration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* App Intro & Value Proposition */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Full Athlete Registration & Profile Onboarding
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Sports Injury Analyser <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Athlete Profile & Media Hub
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Register your account, complete your physical assessment profile (<strong className="text-cyan-400">Flexibility, Strength, Balance, Endurance</strong>), 
            and upload your movement videos to build your private athlete dashboard.
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Detailed Athlete Bio</h4>
              <p className="text-xs text-slate-400">Sport, position, age, height & body weight</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                <Dumbbell className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Physical Assessment</h4>
              <p className="text-xs text-slate-400">Flexibility, Strength & Balance gauges</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 col-span-2 sm:col-span-1">
              <div className="w-9 h-9 rounded-xl bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400">
                <Video className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Private Media Library</h4>
              <p className="text-xs text-slate-400">Personal video storage & playback</p>
            </div>
          </div>
        </div>

        {/* Inline Authentication / Registration Card */}
        <div className="lg:col-span-5">
          <div className="relative p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-white">
                  {!isRegistering ? 'Sign In to Your Dashboard' : step === 1 ? 'Create Account (Step 1/2)' : 'Athlete Details (Step 2/2)'}
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                {!isRegistering
                  ? 'Sign in to access your personal dashboard & videos'
                  : step === 1
                  ? 'Enter your name, email, and password'
                  : 'Fill in your sport & physical assessment details'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleNextStep} className="space-y-4">
              
              {/* LOGIN FORM or STEP 1 REGISTRATION */}
              {(!isRegistering || step === 1) && (
                <>
                  {isRegistering && (
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
                        placeholder="athlete@sports.org"
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
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

              {/* STEP 2 ATHLETE DETAILS (REGISTRATION ONLY) */}
              {isRegistering && step === 2 && (
                <div className="space-y-3.5 animate-fadeIn">
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Primary Sport</label>
                      <input
                        type="text"
                        required
                        value={sport}
                        onChange={(e) => setSport(e.target.value)}
                        placeholder="e.g. Basketball"
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
                        placeholder="e.g. Point Guard"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Age (yrs)</label>
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
                    <span className="font-bold text-cyan-400 block mb-1">Physical Ratings (0 to 100 scale)</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Flexibility: {flexibility}/100</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={flexibility}
                          onChange={(e) => setFlexibility(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Strength: {strength}/100</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={strength}
                          onChange={(e) => setStrength(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Balance: {balance}/100</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={balance}
                          onChange={(e) => setBalance(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Endurance: {endurance}/100</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={endurance}
                          onChange={(e) => setEndurance(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">Notes / Remarks</label>
                    <textarea
                      rows="2"
                      value={coachNotes}
                      onChange={(e) => setCoachNotes(e.target.value)}
                      placeholder="Optional notes or health history..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    ></textarea>
                  </div>

                </div>
              )}

              <div className="flex gap-2 pt-2">
                {isRegistering && step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {!isRegistering
                        ? 'Sign In to My Dashboard'
                        : step === 1
                        ? 'Next: Fill Athlete Details'
                        : 'Complete Registration & Open Dashboard'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
              {isRegistering ? 'Already registered?' : "Don't have an account yet?"}{' '}
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setStep(1);
                  setError('');
                }}
                className="text-cyan-400 hover:underline font-bold"
              >
                {isRegistering ? 'Sign In Now' : 'Register Account'}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
