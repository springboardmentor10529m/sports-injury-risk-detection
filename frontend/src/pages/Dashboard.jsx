import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { 
  LogOut, Activity, Film, User, PlusCircle, Sparkles, 
  Trophy, ChevronRight, CheckCircle2, ShieldAlert, Award,
  Search, X, Play, FileText, Phone, Mail, Calendar, Edit
} from 'lucide-react';

const Dashboard = () => {
  const [athlete, setAthlete] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Expert/Coach dashboard state
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [athleteVideos, setAthleteVideos] = useState([]);
  const [coachNotes, setCoachNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  const [viewAnnotated, setViewAnnotated] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();
  const userName = localStorage.getItem('name') || 'User';
  const userRole = localStorage.getItem('role') || 'athlete';

  const fetchAthleteList = async () => {
    try {
      const res = await api.get('/athlete/list');
      setAthletes(res.data);
      if (res.data.length > 0) {
        setSelectedAthlete(res.data[0]);
      }
    } catch (err) {
      setError('Failed to fetch athlete list.');
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
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
          }

          // Fetch videos
          try {
            const videosRes = await api.get('/video/list');
            setVideos(videosRes.data);
          } catch (err) {
            setError('Failed to load video history.');
          }
        } else {
          // Coach / Physiotherapist / Admin flow
          await fetchAthleteList();
        }
      } catch (err) {
        setError('Error connecting to servers.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  // Load selected athlete details (videos, notes) when selection changes
  useEffect(() => {
    if (userRole !== 'athlete' && selectedAthlete) {
      const fetchSelectedAthleteData = async () => {
        try {
          const videosRes = await api.get(`/athlete/${selectedAthlete.athlete_id}/videos`);
          setAthleteVideos(videosRes.data);
        } catch (err) {
          console.error('Failed to load athlete videos', err);
        }
        setCoachNotes(selectedAthlete.coach_notes || '');
        setSuccessMessage('');
      };
      fetchSelectedAthleteData();
    }
  }, [selectedAthlete, userRole]);

  // Poll active videos for status changes (athlete flow)
  useEffect(() => {
    if (userRole !== 'athlete' || videos.length === 0) return;
    
    const hasActiveProcessing = videos.some(
      vid => vid.processing_status === 'Uploaded' || vid.processing_status === 'Processing'
    );
    
    if (!hasActiveProcessing) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/video/list');
        setVideos(res.data);
      } catch (err) {
        console.error("Failed to poll video list:", err);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [videos, userRole]);

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (!selectedAthlete) return;
    setSavingNotes(true);
    setSuccessMessage('');
    setError('');
    try {
      const res = await api.put(`/athlete/${selectedAthlete.athlete_id}/notes`, {
        coach_notes: coachNotes
      });
      setSuccessMessage('Notes saved successfully!');
      
      // Update local athletes cache with the updated notes
      setAthletes(prev => prev.map(ath => 
        ath.athlete_id === selectedAthlete.athlete_id 
          ? { ...ath, coach_notes: res.data.coach_notes } 
          : ath
      ));
      
      // Update active selection reference
      setSelectedAthlete(prev => ({ ...prev, coach_notes: res.data.coach_notes }));
    } catch (err) {
      setError('Failed to save coach notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-600/20 border-blue-500/30 text-blue-400',
      'bg-purple-600/20 border-purple-500/30 text-purple-400',
      'bg-emerald-600/20 border-emerald-500/30 text-emerald-400',
      'bg-amber-600/20 border-amber-500/30 text-amber-400',
      'bg-rose-600/20 border-rose-500/30 text-rose-400'
    ];
    let sum = 0;
    for (let i = 0; name && i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

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
                          <th className="py-4 px-6">Analysis Status</th>
                          <th className="py-4 px-6 text-right">Action</th>
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
                            <td className="py-4 px-6">
                              {vid.processing_status === 'Completed' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Completed
                                </span>
                              ) : vid.processing_status === 'Processing' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                                  <Activity className="h-3.5 w-3.5 animate-spin" />
                                  Analyzing...
                                </span>
                              ) : vid.processing_status === 'Failed' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                  <ChevronRight className="h-3.5 w-3.5" />
                                  Queued
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveVideo(vid);
                                  setViewAnnotated(true);
                                }}
                                disabled={vid.processing_status !== 'Completed'}
                                className={`inline-flex items-center gap-1 font-semibold py-1.5 px-3.5 rounded-lg text-xs transition-all ${
                                  vid.processing_status === 'Completed'
                                    ? 'bg-brand-500/10 hover:bg-brand-500/25 border border-brand-500/20 text-brand-400 hover:text-brand-300 cursor-pointer'
                                    : 'bg-gray-800/40 border border-white/5 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <Play className="h-3 w-3 fill-current" />
                                Review Form & Report
                              </button>
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

        {/* Coach / Expert Dashboard Flow */}
        {userRole !== 'athlete' && (
          <div className="space-y-8">
            {error && (
              <div className="p-4 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-sm">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Athletes List */}
              <div className="lg:col-span-1 bg-[#0e1726]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col h-[700px]">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-brand-400" /> Athletes Directory
                </h3>
                
                {/* Search box */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or sport..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-all text-sm"
                  />
                </div>
                
                {/* Scrollable Athlete List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {athletes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No registered athletes found.
                    </div>
                  ) : (
                    athletes
                      .filter(ath => {
                        const name = ath.user?.name || '';
                        const email = ath.user?.email || '';
                        const sport = ath.sport || '';
                        const query = searchQuery.toLowerCase();
                        return (
                          name.toLowerCase().includes(query) ||
                          email.toLowerCase().includes(query) ||
                          sport.toLowerCase().includes(query)
                        );
                      })
                      .map((ath) => {
                        const isSelected = selectedAthlete?.athlete_id === ath.athlete_id;
                        const avgScore = (( (ath.strength || 0) + (ath.flexibility || 0) + (ath.balance || 0) + (ath.endurance || 0) ) / 4 || 0);
                        return (
                          <button
                            key={ath.athlete_id}
                            type="button"
                            onClick={() => setSelectedAthlete(ath)}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                              isSelected
                                ? 'bg-brand-600/10 border-brand-500 shadow-lg shadow-brand-500/5'
                                : 'bg-[#152033]/30 border-white/5 hover:bg-[#152033]/60 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarColor(ath.user?.name)}`}>
                                {getInitials(ath.user?.name)}
                              </div>
                              <div className="truncate">
                                <h4 className="font-semibold text-sm text-white truncate">{ath.user?.name || 'Unknown'}</h4>
                                <span className="text-xs text-gray-400 capitalize">{ath.sport || 'No Sport'}</span>
                              </div>
                            </div>
                            {avgScore > 0 && (
                              <span className={`text-xs font-bold py-1 px-2.5 rounded-full shrink-0 border ${
                                avgScore >= 7.5
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : avgScore >= 5.0
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {avgScore.toFixed(1)}
                              </span>
                            )}
                          </button>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Right Column: Detailed View */}
              <div className="lg:col-span-2 space-y-6">
                {!selectedAthlete ? (
                  <div className="bg-[#0e1726]/30 border border-white/5 rounded-2xl p-12 text-center h-full flex flex-col justify-center items-center">
                    <User className="h-12 w-12 text-gray-600 mb-4" />
                    <h3 className="font-bold text-lg text-white">No Athlete Selected</h3>
                    <p className="text-sm text-gray-400 mt-1">Select an athlete from the directory to review stats, watch uploaded motion videos, and update notes.</p>
                  </div>
                ) : (
                  <>
                    {/* Athlete Info Card */}
                    <div className="bg-[#0e1726]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-14 w-14 rounded-full border flex items-center justify-center font-bold text-lg shrink-0 ${getAvatarColor(selectedAthlete.user?.name)}`}>
                            {getInitials(selectedAthlete.user?.name)}
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-white">{selectedAthlete.user?.name || 'Unknown'}</h2>
                            <p className="text-xs text-brand-400 font-semibold tracking-wider uppercase mt-0.5">{selectedAthlete.sport || 'Sport Not Configured'} • {selectedAthlete.position || 'Position Not Configured'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sub-info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500 shrink-0" />
                          <span className="truncate">{selectedAthlete.user?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500 shrink-0" />
                          <span>{selectedAthlete.user?.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
                          <span>Age: {selectedAthlete.age ? `${selectedAthlete.age} years` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Performance Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Biometrics Card */}
                      <div className="bg-[#0e1726]/60 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Physical Biometrics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#152033]/30 p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-gray-400 uppercase font-semibold">Height</span>
                            <p className="text-lg font-bold text-white mt-1">{selectedAthlete.height ? `${selectedAthlete.height} cm` : 'Not set'}</p>
                          </div>
                          <div className="bg-[#152033]/30 p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-gray-400 uppercase font-semibold">Weight</span>
                            <p className="text-lg font-bold text-white mt-1">{selectedAthlete.weight ? `${selectedAthlete.weight} kg` : 'Not set'}</p>
                          </div>
                          <div className="bg-[#152033]/30 p-4 rounded-xl border border-white/5 col-span-2">
                            <span className="text-xs text-gray-400 uppercase font-semibold">Training Load / Intensity</span>
                            <p className="text-lg font-bold text-white mt-1">{selectedAthlete.training_load ? `${selectedAthlete.training_load} hours/wk` : '0.0 hours/wk'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Performance Scores Card */}
                      <div className="bg-[#0e1726]/60 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Performance Assessment (1 - 10)</h4>
                        <div className="space-y-3">
                          {[
                            { name: 'Strength', val: selectedAthlete.strength },
                            { name: 'Flexibility', val: selectedAthlete.flexibility },
                            { name: 'Balance', val: selectedAthlete.balance },
                            { name: 'Endurance', val: selectedAthlete.endurance },
                          ].map((metric) => {
                            const percent = metric.val ? (metric.val * 10) : 0;
                            const barColor = percent >= 75 
                              ? 'bg-emerald-500' 
                              : percent >= 50 
                              ? 'bg-amber-500' 
                              : 'bg-red-500';
                            return (
                              <div key={metric.name} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-gray-400">{metric.name}</span>
                                  <span className="text-white">{metric.val ? `${metric.val.toFixed(1)}/10` : 'Not assessed'}</span>
                                </div>
                                <div className="w-full bg-[#152033]/50 h-2 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Coach Notes Form */}
                    <div className="bg-[#0e1726]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Edit className="h-4 w-4 text-brand-400" /> Specialist Remarks & Injury Logs
                      </h4>
                      <form onSubmit={handleSaveNotes} className="space-y-4">
                        {successMessage && (
                          <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs font-semibold">
                            {successMessage}
                          </div>
                        )}
                        <textarea
                          rows="4"
                          placeholder="Log active clinical observations, past ligament/muscle tears, customized rehabilitation routines, or restrictions here..."
                          value={coachNotes}
                          onChange={(e) => setCoachNotes(e.target.value)}
                          className="w-full bg-[#152033]/50 border border-white/5 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm transition-all"
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={savingNotes}
                            className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2 px-5 rounded-xl transition-all duration-200 text-sm disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-brand-500/10"
                          >
                            <FileText className="h-4 w-4" />
                            {savingNotes ? 'Saving Remarks...' : 'Save Specialist Remarks'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Video Submissions Card */}
                    <div className="bg-[#0e1726]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Film className="h-4 w-4 text-brand-400" /> Motion Video Submissions
                      </h4>
                      
                      {athleteVideos.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          This athlete has not uploaded any assessment recordings yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 bg-[#0e1726]/80 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                                <th className="py-3 px-4">Movement Activity</th>
                                <th className="py-3 px-4">Submitted On</th>
                                <th className="py-3 px-4">Analysis Status</th>
                                <th className="py-3 px-4 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                              {athleteVideos.map((vid) => (
                                <tr key={vid.video_id} className="hover:bg-white/[0.01]">
                                  <td className="py-3.5 px-4 font-semibold text-white">{vid.activity}</td>
                                  <td className="py-3.5 px-4 text-gray-400">
                                    {new Date(vid.uploaded_at).toLocaleDateString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {vid.processing_status === 'Completed' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Completed
                                      </span>
                                    ) : vid.processing_status === 'Processing' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                                        Analyzing...
                                      </span>
                                    ) : vid.processing_status === 'Failed' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                        Failed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        Queued
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveVideo(vid);
                                        setViewAnnotated(true);
                                      }}
                                      disabled={vid.processing_status !== 'Completed'}
                                      className={`inline-flex items-center gap-1 font-semibold py-1.5 px-3 rounded-lg text-xs transition-all ${
                                        vid.processing_status === 'Completed'
                                          ? 'bg-brand-500/10 hover:bg-brand-500/25 border border-brand-500/20 text-brand-400 hover:text-brand-300 cursor-pointer'
                                          : 'bg-gray-800/40 border border-white/5 text-gray-500 cursor-not-allowed'
                                      }`}
                                    >
                                      <Play className="h-3 w-3 fill-current" />
                                      Review Form & Report
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Video Playback Modal Overlay */}
      {activeVideo && (() => {
        // Resolve target video source URL
        const videoSrc = viewAnnotated && activeVideo.analysis?.annotated_video_url
          ? activeVideo.analysis.annotated_video_url
          : activeVideo.video_url;
        const host = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:8000';
        const absoluteVideoUrl = `${host}${videoSrc}`;
        
        let jointAngles = null;
        let rom = null;
        try {
          if (activeVideo.analysis?.joint_angles) jointAngles = JSON.parse(activeVideo.analysis.joint_angles);
          if (activeVideo.analysis?.range_of_motion) rom = JSON.parse(activeVideo.analysis.range_of_motion);
        } catch (e) {
          console.error("Failed to parse analysis metadata", e);
        }

        const report = activeVideo.analysis;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#0e1726] border border-white/10 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl relative my-8">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#152033]/50">
                <div className="flex items-center gap-3">
                  <Film className="h-5 w-5 text-brand-400 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-white text-base">Form Review: {activeVideo.activity}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Uploaded: {new Date(activeVideo.uploaded_at).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Skeleton toggle */}
                  {report?.annotated_video_url && (
                    <div className="flex bg-[#070b13] p-1 rounded-xl border border-white/5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewAnnotated(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          viewAnnotated
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Skeleton Overlay
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewAnnotated(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          !viewAnnotated
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Raw Video
                      </button>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setActiveVideo(null)}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Main Content Pane Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/5 bg-[#070b13]">
                {/* Left Side: Video Player */}
                <div className="lg:col-span-6 p-6 flex flex-col justify-center items-center bg-black/40">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/5 bg-black">
                    <video
                      key={absoluteVideoUrl}
                      src={absoluteVideoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="w-full flex items-center justify-between text-xs text-gray-400 mt-4 px-1">
                    <span>Resolution: <span className="text-white font-medium">{activeVideo.resolution || 'N/A'}</span></span>
                    <span>FPS: <span className="text-white font-medium">{activeVideo.fps || 'N/A'}</span></span>
                    <span>Duration: <span className="text-white font-medium">{activeVideo.duration ? `${activeVideo.duration}s` : 'N/A'}</span></span>
                  </div>
                </div>

                {/* Right Side: Quantitative Biomechanics Report */}
                <div className="lg:col-span-6 p-6 flex flex-col max-h-[75vh] overflow-y-auto custom-scrollbar">
                  {!report ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                      <Activity className="h-10 w-10 text-brand-400 animate-spin mb-4" />
                      <h4 className="font-bold text-white">Biomechanical analysis in progress</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm">We are extracting joint coordinates and mapping stability. Please stand by...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Overall score and risk level banner */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-[#0e1726]/50">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Movement Form Quality</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-white">{report.movement_quality_score}</span>
                            <span className="text-sm text-gray-500 font-semibold">/ 10</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Injury Risk Assessment</p>
                          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                            report.risk_level === 'Low'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : report.risk_level === 'Moderate'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : report.risk_level === 'High'
                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                          }`}>
                            {report.risk_level} Risk
                          </span>
                        </div>
                      </div>

                      {/* Main finding alerts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Knee Valgus */}
                        <div className={`p-4 rounded-xl border ${
                          report.knee_valgus_detected === 'Yes'
                            ? 'bg-red-950/20 border-red-500/30 text-red-200'
                            : report.knee_valgus_detected === 'Borderline'
                            ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                            : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        }`}>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Knee Alignment</span>
                          <h4 className="font-bold text-sm mt-1">
                            {report.knee_valgus_detected === 'Yes' ? 'Medial Knee Collapse' : report.knee_valgus_detected === 'Borderline' ? 'Borderline Instability' : 'Stable Knee Track'}
                          </h4>
                          <p className="text-xs mt-1 opacity-80">
                            {report.knee_valgus_detected === 'Yes' ? 'Significant knee valgus detected.' : report.knee_valgus_detected === 'Borderline' ? 'Slight knee cave inward during load.' : 'Excellent leg tracking alignment.'}
                          </p>
                        </div>

                        {/* Balance stability */}
                        <div className={`p-4 rounded-xl border ${
                          report.balance_score >= 8.0
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                            : report.balance_score >= 6.0
                            ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                            : 'bg-red-950/20 border-red-500/30 text-red-200'
                        }`}>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Lateral Hip Balance</span>
                          <h4 className="font-bold text-sm mt-1">
                            Stability Index: {report.balance_score} / 10
                          </h4>
                          <p className="text-xs mt-1 opacity-80">
                            {report.balance_score >= 8.0 ? 'Minimal lateral hip sway.' : report.balance_score >= 6.0 ? 'Moderate stability sway.' : 'High lateral sway detected.'}
                          </p>
                        </div>
                      </div>

                      {/* Symmetry & Trunk Lean */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0e1726]/40 p-4 rounded-xl border border-white/5 text-center">
                          <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Joint Symmetry</span>
                          <h4 className="text-xl font-extrabold text-white mt-1">{report.symmetry_score}%</h4>
                          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                            <div className="bg-brand-500 h-full" style={{ width: `${report.symmetry_score}%` }}></div>
                          </div>
                        </div>

                        <div className="bg-[#0e1726]/40 p-4 rounded-xl border border-white/5 text-center">
                          <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Max Trunk Lean</span>
                          <h4 className="text-xl font-extrabold text-white mt-1">{report.trunk_lean}°</h4>
                          <p className="text-[11px] text-gray-400 mt-2 font-medium">
                            {report.trunk_lean > 22.0 ? 'Excessive forward tilt' : 'Optimal tilt alignment'}
                          </p>
                        </div>
                      </div>

                      {/* Joint Angle and ROM Details */}
                      {rom && jointAngles && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-1">Range of Motion Analysis</h4>
                          <div className="bg-[#0e1726]/30 border border-white/5 rounded-xl overflow-hidden text-xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-[#0e1726]/60 border-b border-white/5 text-gray-400 font-semibold">
                                  <th className="py-2 px-3">Joint / Side</th>
                                  <th className="py-2 px-3 text-center">Max Ext</th>
                                  <th className="py-2 px-3 text-center">Max Flex</th>
                                  <th className="py-2 px-3 text-right">ROM</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-gray-300">
                                <tr>
                                  <td className="py-2 px-3 font-semibold text-white">Left Knee</td>
                                  <td className="py-2 px-3 text-center">{jointAngles.left_knee_max_extension}°</td>
                                  <td className="py-2 px-3 text-center">{jointAngles.left_knee_max_flexion}°</td>
                                  <td className="py-2 px-3 text-right font-medium text-brand-400">{rom.left_knee_rom}°</td>
                                </tr>
                                <tr>
                                  <td className="py-2 px-3 font-semibold text-white">Right Knee</td>
                                  <td className="py-2 px-3 text-center">{jointAngles.right_knee_max_extension}°</td>
                                  <td className="py-2 px-3 text-center">{jointAngles.right_knee_max_flexion}°</td>
                                  <td className="py-2 px-3 text-right font-medium text-brand-400">{rom.right_knee_rom}°</td>
                                </tr>
                                <tr>
                                  <td className="py-2 px-3 font-semibold text-white">Left Hip</td>
                                  <td className="py-2 px-3 text-center">{jointAngles.left_hip_max_extension}°</td>
                                  <td className="py-2 px-3 text-center">{jointAngles.left_hip_max_flexion}°</td>
                                  <td className="py-2 px-3 text-right font-medium text-brand-400">{rom.left_hip_rom}°</td>
                                </tr>
                                <tr>
                                  <td className="py-2 px-3 font-semibold text-white">Right Hip</td>
                                  <td className="py-2 px-3 text-center">{jointAngles.right_hip_max_extension}°</td>
                                  <td className="py-2 px-3 text-center">{jointAngles.right_hip_max_flexion}°</td>
                                  <td className="py-2 px-3 text-right font-medium text-brand-400">{rom.right_hip_rom}°</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Injury Risk Forecast (Milestone 3) */}
                      {activeVideo.injury_prediction && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-1">Predictive Injury Risk Forecast</h4>
                          <div className="bg-[#0e1726]/30 border border-white/5 rounded-xl p-4 space-y-4">
                            {/* Overall Score */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Overall Risk Score</span>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                  <span className="text-2xl font-black text-white">{activeVideo.injury_prediction.overall_risk_score}</span>
                                  <span className="text-xs text-gray-500 font-semibold">/ 10</span>
                                </div>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                activeVideo.injury_prediction.risk_category === 'Low'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : activeVideo.injury_prediction.risk_category === 'Moderate'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : activeVideo.injury_prediction.risk_category === 'High'
                                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                              }`}>
                                {activeVideo.injury_prediction.risk_category} Risk
                              </span>
                            </div>

                            {/* Probabilities Sliders */}
                            <div className="space-y-2.5 text-xs">
                              {/* ACL */}
                              <div>
                                <div className="flex justify-between text-gray-300 font-medium mb-1">
                                  <span>ACL Injury Probability</span>
                                  <span className={activeVideo.injury_prediction.acl_risk_prob > 50 ? 'text-red-400 font-bold' : activeVideo.injury_prediction.acl_risk_prob > 25 ? 'text-amber-400' : 'text-emerald-400'}>
                                    {activeVideo.injury_prediction.acl_risk_prob}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${
                                      activeVideo.injury_prediction.acl_risk_prob > 50 ? 'bg-red-500' : activeVideo.injury_prediction.acl_risk_prob > 25 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${activeVideo.injury_prediction.acl_risk_prob}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Hamstring */}
                              <div>
                                <div className="flex justify-between text-gray-300 font-medium mb-1">
                                  <span>Hamstring Strain Probability</span>
                                  <span className={activeVideo.injury_prediction.hamstring_risk_prob > 50 ? 'text-red-400 font-bold' : activeVideo.injury_prediction.hamstring_risk_prob > 25 ? 'text-amber-400' : 'text-emerald-400'}>
                                    {activeVideo.injury_prediction.hamstring_risk_prob}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${
                                      activeVideo.injury_prediction.hamstring_risk_prob > 50 ? 'bg-red-500' : activeVideo.injury_prediction.hamstring_risk_prob > 25 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${activeVideo.injury_prediction.hamstring_risk_prob}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Ankle */}
                              <div>
                                <div className="flex justify-between text-gray-300 font-medium mb-1">
                                  <span>Ankle Sprain Probability</span>
                                  <span className={activeVideo.injury_prediction.ankle_risk_prob > 50 ? 'text-red-400 font-bold' : activeVideo.injury_prediction.ankle_risk_prob > 25 ? 'text-amber-400' : 'text-emerald-400'}>
                                    {activeVideo.injury_prediction.ankle_risk_prob}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${
                                      activeVideo.injury_prediction.ankle_risk_prob > 50 ? 'bg-red-500' : activeVideo.injury_prediction.ankle_risk_prob > 25 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${activeVideo.injury_prediction.ankle_risk_prob}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Shoulder */}
                              <div>
                                <div className="flex justify-between text-gray-300 font-medium mb-1">
                                  <span>Shoulder Impingement Probability</span>
                                  <span className={activeVideo.injury_prediction.shoulder_risk_prob > 50 ? 'text-red-400 font-bold' : activeVideo.injury_prediction.shoulder_risk_prob > 25 ? 'text-amber-400' : 'text-emerald-400'}>
                                    {activeVideo.injury_prediction.shoulder_risk_prob}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${
                                      activeVideo.injury_prediction.shoulder_risk_prob > 50 ? 'bg-red-500' : activeVideo.injury_prediction.shoulder_risk_prob > 25 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${activeVideo.injury_prediction.shoulder_risk_prob}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Lower Back */}
                              <div>
                                <div className="flex justify-between text-gray-300 font-medium mb-1">
                                  <span>Lower Back Strain Probability</span>
                                  <span className={activeVideo.injury_prediction.back_risk_prob > 50 ? 'text-red-400 font-bold' : activeVideo.injury_prediction.back_risk_prob > 25 ? 'text-amber-400' : 'text-emerald-400'}>
                                    {activeVideo.injury_prediction.back_risk_prob}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${
                                      activeVideo.injury_prediction.back_risk_prob > 50 ? 'bg-red-500' : activeVideo.injury_prediction.back_risk_prob > 25 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${activeVideo.injury_prediction.back_risk_prob}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Anomaly deviation baseline note */}
                            <div className="bg-[#152033]/40 border border-white/5 rounded-xl p-3 text-[11px] text-gray-400">
                              <span className="font-bold text-gray-300">Biomechanical Anomaly Index: </span>
                              {activeVideo.injury_prediction.anomaly_score} (calculated relative to SportsPose and Human3.6M standard references).
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Corrective Exercise Feedback */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-1">Automated Biomechanical Insights</h4>
                        <div className="bg-[#152033]/30 border border-white/5 p-4 rounded-xl text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                          {report.feedback}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Dashboard;

