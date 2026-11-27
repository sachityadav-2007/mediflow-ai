import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ExperienceCard from '../../components/immersive/common/ExperienceCard';
import useDeviceCapabilities from '../../hooks/useDeviceCapabilities';
import {
  getExperiences,
  getUserProgress,
  getRecentExperiences,
} from '../../services/immersiveService';

export default function ImmersiveDashboard() {
  const capabilities = useDeviceCapabilities();
  const [experiences, setExperiences] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [recentExpIds, setRecentExpIds] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [expRes, progRes] = await Promise.all([
          getExperiences().catch(() => ({ data: [] })),
          getUserProgress().catch(() => ({ data: [] })),
        ]);
        setExperiences(expRes.data || []);
        setUserProgress(progRes.data || []);
        setRecentExpIds(getRecentExperiences());
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredExperiences = useMemo(() => {
    return experiences.filter((exp) => {
      const matchesTab = activeTab === 'ALL' || exp.type === activeTab;
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const title = (exp.title || '').toLowerCase();
      const desc = (exp.description || '').toLowerCase();
      const cat = (exp.category || '').toLowerCase();
      return title.includes(query) || desc.includes(query) || cat.includes(query);
    });
  }, [experiences, activeTab, searchQuery]);

  const recentExperiences = useMemo(() => {
    if (!recentExpIds.length) return [];
    return recentExpIds
      .map((id) => experiences.find((e) => e.id === id))
      .filter(Boolean);
  }, [experiences, recentExpIds]);

  const totalExperiences = experiences.length;
  const completedCount = userProgress.filter((p) => p.completed).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-10 mb-8 overflow-hidden border border-slate-800 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-bold mb-4">
                <span>🥽</span>
                <span>Next-Gen MediFlow Immersive Care 3.0</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Augmented &amp; Virtual Reality Healthcare Suite
              </h1>
              <p className="text-sm sm:text-base text-slate-300 mt-3 leading-relaxed">
                Explore full-body 3D anatomical systems, interactive organ simulations, virtual hospital corridors, and clinical training modules directly in your browser or AR/VR headset.
              </p>

              {/* Hardware Capability Pills */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
                  <span className={`w-2 h-2 rounded-full ${capabilities.supportsAR ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>AR: {capabilities.supportsAR ? 'Mobile WebXR / QuickLook Ready' : '3D Fallback Mode'}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
                  <span className={`w-2 h-2 rounded-full ${capabilities.supportsVR ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
                  <span>VR: {capabilities.supportsVR ? 'WebXR Headset Active' : 'Desktop 3D Orbit / WASD'}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>WebGL: Hardware Accelerated</span>
                </div>
              </div>
            </div>

            {/* Quick Progress Card */}
            <div className="bg-slate-800/70 backdrop-blur-md rounded-2xl border border-slate-700/80 p-5 w-full lg:w-72 shrink-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Your Learning Record
              </span>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-black text-white">{completedCount}</span>
                <span className="text-xs text-slate-400">/ {totalExperiences} modules completed</span>
              </div>

              <div className="w-full bg-slate-700/80 rounded-full h-2 mb-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalExperiences ? (completedCount / totalExperiences) * 100 : 0}%` }}
                />
              </div>

              <Link
                to="/immersive/progress"
                className="w-full inline-flex items-center justify-center text-xs font-bold py-2.5 px-3 rounded-xl bg-[#0072CE] hover:bg-blue-600 text-white transition shadow-sm"
              >
                View Learning Progress &bull; Badges →
              </Link>
            </div>
          </div>
        </div>

        {/* Recently Used Experiences Row (if available) */}
        {recentExperiences.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>⏱</span>
                <span>Recently Explored</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentExperiences.map((exp) => (
                <ExperienceCard key={`recent-${exp.id}`} experience={exp} userProgress={userProgress} />
              ))}
            </div>
          </div>
        )}

        {/* Search & Category Filter Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Modules' },
              { id: 'ANATOMY', label: '🫀 AR Anatomy' },
              { id: 'ORGAN', label: '🔬 Organ Explorer' },
              { id: 'HOSPITAL', label: '🏥 Virtual Hospital' },
              { id: 'TRAINING', label: '🎯 VR Simulations' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer border ${
                  activeTab === tab.id
                    ? 'bg-[#0072CE] text-white border-[#0072CE] shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar Input */}
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experiences..."
              className="w-full text-xs font-medium pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Experience Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-80 border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filteredExperiences.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExperiences.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} userProgress={userProgress} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-[#0072CE] flex items-center justify-center text-xl mb-3">
              🔍
            </div>
            <p className="text-base font-bold text-slate-800">No matching experiences found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No modules matched "${searchQuery}" in this category.`
                : 'No experiences found in this category.'}
            </p>
            {(searchQuery || activeTab !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('ALL');
                }}
                className="mt-4 text-xs font-bold px-4 py-2 rounded-xl bg-blue-50 text-[#0072CE] hover:bg-blue-100 transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
