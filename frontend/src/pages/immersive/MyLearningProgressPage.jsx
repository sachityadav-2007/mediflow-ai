import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { getUserProgress, getExperiences } from '../../services/immersiveService';

export default function MyLearningProgressPage() {
  const [progressList, setProgressList] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [progRes, expRes] = await Promise.all([
          getUserProgress().catch(() => ({ data: [] })),
          getExperiences().catch(() => ({ data: [] })),
        ]);
        setProgressList(progRes.data || []);
        setExperiences(expRes.data || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalModules = experiences.length || 13;
  const completedModules = progressList.filter((p) => p.completed).length;
  const completionRate = Math.round((completedModules / totalModules) * 100);

  const scores = progressList.map((p) => p.score).filter((s) => s != null);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Badges logic
  const badges = [
    {
      id: 'badge-anatomy',
      title: 'AR Anatomy Explorer',
      description: 'Completed interactive 3D human anatomy inspection.',
      icon: '🫀',
      unlocked: progressList.some((p) => p.experienceId === 'exp-anatomy-3d' && p.completed),
    },
    {
      id: 'badge-cardiology',
      title: 'Cardiovascular Pioneer',
      description: 'Completed 3D Heart cardiac pulsation study.',
      icon: '💓',
      unlocked: progressList.some((p) => p.experienceId === 'exp-organ-heart' && p.completed),
    },
    {
      id: 'badge-hospital',
      title: 'Campus Navigator',
      description: 'Explored Virtual Hospital reception, OPD, and consultation chambers.',
      icon: '🏥',
      unlocked: progressList.some((p) => p.experienceId === 'exp-hospital-walkthrough' && p.completed),
    },
    {
      id: 'badge-triage',
      title: 'Clinical Triage Ace',
      description: 'Scored 85%+ on Clinical Patient Admission & Assessment.',
      icon: '🏅',
      unlocked: progressList.some((p) => (p.score || 0) >= 85),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Breadcrumbs & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/immersive" className="hover:text-[#0072CE] transition">
                Immersive Care
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-bold">My Learning Progress</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Clinical &amp; Anatomical Learning Progress
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/immersive"
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-[#0072CE] hover:bg-blue-700 text-white shadow-xs transition"
            >
              Browse Experiences →
            </Link>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Completed Modules
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900">{completedModules}</span>
              <span className="text-xs text-slate-500 font-semibold">/ {totalModules} Total</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Completion Rate
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-[#0072CE]">{completionRate}%</span>
              <span className="text-xs text-slate-500 font-semibold">Overall</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Average Simulation Score
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-600">
                {avgScore ? `${avgScore}%` : 'N/A'}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Clinical accuracy</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Learning Credit Hours
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-purple-600">
                {(completedModules * 0.5).toFixed(1)} hrs
              </span>
              <span className="text-xs text-slate-500 font-semibold">CME Equivalent</span>
            </div>
          </div>
        </div>

        {/* Earned Badges Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 mb-8">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Clinical Achievement Badges
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Earn certificates and badges by mastering 3D anatomical modules and clinical simulations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                  b.unlocked
                    ? 'bg-blue-50/70 border-blue-200 text-slate-900'
                    : 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div>
                  <div className="text-3xl mb-2">{b.icon}</div>
                  <h4 className="text-xs font-bold leading-snug">{b.title}</h4>
                  <p className="text-[11px] mt-1 text-slate-500 leading-relaxed">
                    {b.description}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200/60">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      b.unlocked
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {b.unlocked ? '✓ Unlocked' : '🔒 Locked'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Module Catalog Progress Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Module Performance Audit
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {experiences.length} Total Curricula
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Module Title</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {experiences.map((exp) => {
                  const prog = progressList.find((p) => p.experienceId === exp.id);
                  const isDone = prog?.completed;
                  const percent = prog?.completionPercentage || 0;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {exp.title}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium">
                        {exp.category}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : percent > 0
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isDone ? 'Completed' : percent > 0 ? `${percent}% In Progress` : 'Not Started'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold">
                        {prog?.score != null ? `${prog.score}/100` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          to={
                            exp.type === 'ORGAN'
                              ? `/immersive/organs?organ=${exp.metadata?.organ || 'Heart'}`
                              : exp.type === 'HOSPITAL'
                              ? '/immersive/hospital'
                              : exp.type === 'TRAINING'
                              ? `/immersive/training?scenario=${exp.id}`
                              : '/immersive/anatomy'
                          }
                          className="text-xs font-bold text-[#0072CE] hover:underline"
                        >
                          {isDone ? 'Review →' : 'Start →'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
