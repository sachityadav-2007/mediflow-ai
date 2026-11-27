import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ExperienceCard from '../../components/immersive/common/ExperienceCard';
import useDeviceCapabilities from '../../hooks/useDeviceCapabilities';
import { getExperiences, getUserProgress } from '../../services/immersiveService';

export default function ImmersiveDashboard() {
  const capabilities = useDeviceCapabilities();
  const [experiences, setExperiences] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
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
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = experiences.filter((exp) => {
    if (activeTab === 'ALL') return true;
    return exp.type === activeTab;
  });

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
                <span>Next-Gen MediFlow Immersive Care</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Augmented &amp; Virtual Reality Healthcare Experience
              </h1>
              <p className="text-sm sm:text-base text-slate-300 mt-3 leading-relaxed">
                Explore full-body 3D anatomical systems, interactive organ simulations, virtual hospital corridors, and clinical simulations in your browser or AR/VR headset.
              </p>

              {/* Hardware Capability Pill */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
                  <span className={`w-2 h-2 rounded-full ${capabilities.supportsAR ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>AR: {capabilities.supportsAR ? 'Ready' : '3D Fallback'}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
                  <span className={`w-2 h-2 rounded-full ${capabilities.supportsVR ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                  <span>VR: {capabilities.supportsVR ? 'WebXR Active' : 'Desktop 3D'}</span>
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
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                  style={{ width: `${totalExperiences ? (completedCount / totalExperiences) * 100 : 0}%` }}
                />
              </div>

              <Link
                to="/immersive/progress"
                className="w-full inline-flex items-center justify-center text-xs font-bold py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
              >
                View Full Progress &bull; Badges →
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Category Navigation Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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
                className={`text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer border ${
                  activeTab === tab.id
                    ? 'bg-[#0072CE] text-white border-[#0072CE] shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/immersive/anatomy"
              className="text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs transition"
            >
              Launch Full Anatomy ↗
            </Link>
            <Link
              to="/immersive/hospital"
              className="text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs transition"
            >
              Walk Virtual Hospital ↗
            </Link>
          </div>
        </div>

        {/* Experience Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-80 border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} userProgress={userProgress} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <p className="text-sm font-bold">No experiences found in this category.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
