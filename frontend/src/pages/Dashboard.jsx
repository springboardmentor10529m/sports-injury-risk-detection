import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { 
  LogOut, Activity, Film, User, PlusCircle, Sparkles, 
  Trophy, ChevronRight, CheckCircle2, ShieldAlert, Award
} from 'lucide-react';

const Dashboard = () => {
  const [athlete, setAthlete] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const userName = localStorage.getItem('name') || 'User';
  const userRole = localStorage.getItem('role') || 'athlete';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (userRole === 'athlete') {
          // Fetch athlete profile
          try {
            const profileRes = await api.get('/athlete/profile');
            setAthlete(profileRes.data);
          } catch (err) {
            if (err.response?.status !== 404) {
              setError('Failed to fetch athlete profile.');
            }
            // 404 means profile is simply not created yet
          }

          // Fetch videos
          try {
            const videosRes = await api.get('/video/list');
            setVideos(videosRes.data);
          } catch (err) {
            setError('Failed to load video history.');
          }
        }
      } catch (err) {
        setError('Error connecting to servers.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center">
        <Activity className="h-10 w-10 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-[#0e1726]/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-brand-400" />
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                SportsInjury.AI
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20 py-1 px-3 rounded-full">
                {userRole}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
                title="Log Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#0e1726] to-[#152033] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shadow-xl">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
              Hello, {userName} <Sparkles className="h-6 w-6 text-brand-400 animate-pulse" />
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {userRole === 'athlete' 
                ? "Track your physical metrics, upload videos, and analyze biomechanics risk scores."
                : "Welcome to your coach/physiotherapist dashboard portal."}
            </p>
          </div>
          {userRole === 'athlete' && (
            <Link
              to="/upload"
              disabled={!athlete}
              className={`inline-flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg ${
                athlete 
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-brand-500/20' 
                  : 'bg-gray-800 text-gray-500 border border-white/5 cursor-not-allowed'
              }`}
              onClick={(e) => !athlete && e.preventDefault()}
              title={!athlete ? "Complete your athlete profile first" : "Upload Video"}
            >
              <PlusCircle className="h-5 w-5" />
              Upload Assessment Video
            </Link>
          )}
        </div>

        {/* Athlete Flow */}
        {userRole === 'athlete' && (
          <div className="space-y-8">
            {/* If profile is missing */}
            {!athlete && (
              <div className="bg-[#1b1517] border border-red-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20 shrink-0">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Incomplete Athlete Profile</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      You must complete your physical profile before you can upload exercise videos for biomechanical risk scoring.
                    </p>
                  </div>
                </div>
                <Link
                  to="/profile"
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0 text-sm flex items-center gap-1 shadow-lg shadow-red-600/15"
                >
                  Configure Profile
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Profile Statistics Grid */}
            {athlete && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-brand-400" /> Physical Biometrics & Performance
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Sport Details */}
                  <div className="bg-[#0e1726]/50 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sport / Position</p>
                      <h4 className="text-lg font-bold mt-1 text-white truncate max-w-[150px]">{athlete.sport || 'Not set'}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">{athlete.position || 'Not set'}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-brand-400/40" />
                  </div>
                  
                  {/* Biometrics */}
                  <div className="bg-[#0e1726]/50 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Height / Weight</p>
                      <h4 className="text-lg font-bold mt-1 text-white">{athlete.height ? `${athlete.height} cm` : 'Not set'}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{athlete.weight ? `${athlete.weight} kg` : 'Not set'}</p>
                    </div>
                    <User className="h-8 w-8 text-brand-400/40" />
                  </div>

                  {/* Physical Assessments */}
                  <div className="bg-[#0e1726]/50 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assessments Avg</p>
                      <h4 className="text-lg font-bold mt-1 text-white">
                        {(( (athlete.strength || 0) + (athlete.flexibility || 0) + (athlete.balance || 0) + (athlete.endurance || 0) ) / 4 || 0).toFixed(1)} / 10
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">Strength, Flexibility, Balance, Endurance</p>
                    </div>
                    <Award className="h-8 w-8 text-brand-400/40" />
                  </div>

                  {/* Setup shortcut */}
                  <div className="bg-[#0e1726]/50 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Age</p>
                      <h4 className="text-lg font-bold mt-1 text-white">{athlete.age ? `${athlete.age} yrs` : 'Not set'}</h4>
                      <Link to="/profile" className="text-xs text-brand-400 hover:text-brand-300 font-semibold mt-1 inline-block transition-colors">
                        Edit stats &rarr;
                      </Link>
                    </div>
                    <Activity className="h-8 w-8 text-brand-400/40" />
                  </div>
                </div>
              </div>
            )}

            {/* Video List */}
            {athlete && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Film className="h-5 w-5 text-brand-400" /> Assessment Uploads History
                </h2>
                
                {videos.length === 0 ? (
                  <div className="bg-[#0e1726]/30 border border-white/5 rounded-2xl p-12 text-center">
                    <Film className="h-12 w-12 text-gray-600 mx-auto mb-4 animate-bounce" />
                    <h3 className="font-bold text-lg text-white">No videos uploaded yet</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                      Upload your exercise recordings to run automated pose analysis, biomechanical checks, and estimate joint stress risk factors.
                    </p>
                    <Link
                      to="/upload"
                      className="mt-6 inline-flex items-center gap-2 bg-[#152033]/80 hover:bg-[#1e2e4a] border border-white/5 font-semibold py-2 px-5 rounded-xl transition-all"
                    >
                      Upload First Video
                    </Link>
                  </div>
                ) : (
                  <div className="bg-[#0e1726]/50 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-[#0e1726] text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="py-4 px-6">Activity Type</th>
                          <th className="py-4 px-6">Date Uploaded</th>
                          <th className="py-4 px-6">File Path / URL</th>
                          <th className="py-4 px-6">Analysis Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {videos.map((vid) => (
                          <tr key={vid.video_id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 px-6 font-semibold text-white">
                              {vid.activity}
                            </td>
                            <td className="py-4 px-6 text-gray-400">
                              {new Date(vid.uploaded_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-4 px-6 font-mono text-xs text-brand-400 truncate max-w-[200px]">
                              {vid.video_url}
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {vid.processing_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Coach / Other roles fallback */}
        {userRole !== 'athlete' && (
          <div className="bg-[#0e1726]/30 border border-white/5 rounded-2xl p-12 text-center">
            <PlusCircle className="h-12 w-12 text-brand-400 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-white">Coach / Expert Analytics Panel</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
              This account type is registered as a {userRole}. The specialist dashboard for viewing athlete lists and prescribing rehabilitation exercises is part of the next implementation milestone.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
