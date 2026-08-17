import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Save, Award, User, ChevronLeft, Shield } from 'lucide-react';

const Profile = () => {
  const [formData, setFormData] = useState({
    sport: '',
    position: '',
    age: '',
    height: '',
    weight: '',
    training_load: '0.0',
    flexibility: '',
    strength: '',
    balance: '',
    endurance: '',
    coach_notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (role !== 'athlete') {
      navigate('/dashboard');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await api.get('/athlete/profile');
        const data = response.data;
        // Parse and populate if profile exists
        setFormData({
          sport: data.sport || '',
          position: data.position || '',
          age: data.age || '',
          height: data.height || '',
          weight: data.weight || '',
          training_load: data.training_load || '0.0',
          flexibility: data.flexibility || '',
          strength: data.strength || '',
          balance: data.balance || '',
          endurance: data.endurance || '',
          coach_notes: data.coach_notes || ''
        });
      } catch (err) {
        // Profile not created yet - swallow 404 since it's expected for new athletes
        if (err.response?.status !== 404) {
          setError('Failed to fetch profile details.');
        }
      }
    };

    fetchProfile();
  }, [role, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Convert numeric strings to actual numbers
    const payload = {
      ...formData,
      age: formData.age ? parseInt(formData.age) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      training_load: formData.training_load ? parseFloat(formData.training_load) : 0.0,
      flexibility: formData.flexibility ? parseFloat(formData.flexibility) : null,
      strength: formData.strength ? parseFloat(formData.strength) : null,
      balance: formData.balance ? parseFloat(formData.balance) : null,
      endurance: formData.endurance ? parseFloat(formData.endurance) : null,
    };

    try {
      await api.post('/athlete/profile', payload);
      setSuccess('Athlete profile updated successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save athlete profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] py-12 px-4 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-6 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="bg-[#0e1726]/80 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
            <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/20 text-brand-400">
              <Award className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Athlete Profile Configuration</h2>
              <p className="text-sm text-gray-400">Manage your body stats, sports attributes, and performance metrics</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-emerald-200 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Sport & Position */}
            <div>
              <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand-400" /> Sport Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sport Category</label>
                  <input
                    type="text"
                    name="sport"
                    value={formData.sport}
                    onChange={handleChange}
                    placeholder="e.g., Football, Basketball"
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Playing Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="e.g., Striker, Point Guard"
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Biometrics */}
            <div>
              <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-brand-400" /> Physical Biometrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g., 22"
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="e.g., 180"
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="e.g., 75"
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Performance Attributes */}
            <div>
              <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="h-4 w-4 text-brand-400" /> Performance & Assessment Metrics (1 - 10 Score)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Flexibility</label>
                  <input
                    type="number"
                    step="0.1"
                    name="flexibility"
                    value={formData.flexibility}
                    onChange={handleChange}
                    placeholder="e.g., 8.5"
                    min="1" max="10"
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Strength</label>
                  <input
                    type="number"
                    step="0.1"
                    name="strength"
                    value={formData.strength}
                    onChange={handleChange}
                    placeholder="e.g., 7.0"
                    min="1" max="10"
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Balance</label>
                  <input
                    type="number"
                    step="0.1"
                    name="balance"
                    value={formData.balance}
                    onChange={handleChange}
                    placeholder="e.g., 8.0"
                    min="1" max="10"
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Endurance</label>
                  <input
                    type="number"
                    step="0.1"
                    name="endurance"
                    value={formData.endurance}
                    onChange={handleChange}
                    placeholder="e.g., 9.0"
                    min="1" max="10"
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Coach notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Injury History / Remarks</label>
              <textarea
                name="coach_notes"
                value={formData.coach_notes}
                onChange={handleChange}
                rows="3"
                placeholder="List any past ACL, ankle, or muscle strains, and treatment protocols..."
                className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Saving Profile...' : 'Save Profile Details'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
