import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import AthleteLayout from '../components/AthleteLayout';
import { Save, Award, User, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [userInfo, setUserInfo] = useState({
    name: localStorage.getItem('name') || '',
    email: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'athlete';
  const isStaff = ['coach', 'physiotherapist', 'sports_scientist', 'admin'].includes(role.toLowerCase());

  useEffect(() => {
    const fetchProfileAndUser = async () => {
      // Fetch user profile info
      try {
        const userRes = await api.get('/auth/me');
        if (userRes.data) {
          setUserInfo({
            name: userRes.data.name,
            email: userRes.data.email
          });
          localStorage.setItem('name', userRes.data.name);
        }
      } catch (err) {
        // Ignore if unauthenticated handled below
      }

      try {
        const response = await api.get('/athlete/profile');
        const data = response.data;
        if (data) {
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
          if (data.user?.name) {
            setUserInfo(prev => ({
              ...prev,
              name: data.user.name,
              email: data.user.email || prev.email
            }));
            localStorage.setItem('name', data.user.name);
          }
        }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
          return;
        }
        if (err.response?.status !== 404) {
          setError(getErrorMessage(err, 'Failed to connect to backend server.'));
        }
      }
    };

    fetchProfileAndUser();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

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
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save athlete profile.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AthleteLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Athlete Profile Configuration</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage your body measurements, position, and sports attributes.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 max-w-4xl shadow-xs">
        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* User Identity Header */}
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              {(userInfo.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">{userInfo.name || 'Athlete'}</div>
              <div className="text-xs text-slate-500">{userInfo.email || 'Registered Athlete Account'}</div>
            </div>
          </div>
          <span className="uppercase text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            {role}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Sport & Position Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Sport Category
                </label>
                <input
                  type="text"
                  name="sport"
                  value={formData.sport}
                  onChange={handleChange}
                  placeholder="e.g. Football, Basketball, Track"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Position / Role
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g. Striker, Point Guard, Sprinter"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Anthropometric & Physical Metrics</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Age (Years)
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="24"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  placeholder="182"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="76.5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Biomechanical Baselines: Removed from athlete, only available for clinical staff / coaches */}
          {isStaff && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Biomechanical Baselines (Scale 1 - 10)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Staff Evaluation Only
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Flexibility</label>
                  <input
                    type="number"
                    step="0.1"
                    name="flexibility"
                    value={formData.flexibility}
                    onChange={handleChange}
                    placeholder="7.5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Strength</label>
                  <input
                    type="number"
                    step="0.1"
                    name="strength"
                    value={formData.strength}
                    onChange={handleChange}
                    placeholder="8.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Balance</label>
                  <input
                    type="number"
                    step="0.1"
                    name="balance"
                    value={formData.balance}
                    onChange={handleChange}
                    placeholder="8.5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Endurance</label>
                  <input
                    type="number"
                    step="0.1"
                    name="endurance"
                    value={formData.endurance}
                    onChange={handleChange}
                    placeholder="8.2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </AthleteLayout>
  );
};

export default Profile;
