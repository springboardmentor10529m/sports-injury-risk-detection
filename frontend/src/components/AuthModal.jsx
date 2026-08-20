import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, Lock, Mail, User as UserIcon, Phone, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';

export const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState(1);
  
  // Step 1 states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('ATHLETE');

  // Step 2 Athlete Details
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

  if (!isOpen) return null;

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
        // 1. Register & Login
        await register(name, email, password, role, phone);
        
        // 2. Save Athlete Details
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
        } catch (errProfile) {
          console.warn('Profile save warning:', errProfile);
        }
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">
              {!isRegistering ? 'Welcome Back' : step === 1 ? 'Create Account' : 'Fill Athlete Details'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {!isRegistering
              ? 'Sign in to access your personal dashboard'
              : step === 1
              ? 'Step 1 of 2: Basic account credentials'
              : 'Step 2 of 2: Fill in your physical profile details'}
          </p>
        </div>

        {/* Form error alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleNextStep} className="space-y-4">
          {(!isRegistering || step === 1) && (
            <>
              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Marcus Vance"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="athlete@sports.org"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 0192"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {isRegistering && step === 2 && (
            <div className="space-y-3 text-xs animate-fadeIn">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sport</label>
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
                    placeholder="e.g. Guard"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
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

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-cyan-400 block mb-1">Physical Ratings (0 to 100)</span>
                
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
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {isRegistering && step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {!isRegistering
                    ? 'Sign In'
                    : step === 1
                    ? 'Next: Fill Athlete Details'
                    : 'Complete Registration'}
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
            {isRegistering ? 'Sign In' : 'Register Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
