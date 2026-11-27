import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import TrainingScenario from '../../components/immersive/VR/TrainingScenario';

const SCENARIOS_LIST = [
  {
    id: 'exp-training-admission',
    title: 'Patient Admission & Triage',
    category: 'Emergency Intake',
    icon: '🏥',
  },
  {
    id: 'exp-training-assessment',
    title: 'Rapid Patient Assessment (ABCD)',
    category: 'Acute Care',
    icon: '🫀',
  },
  {
    id: 'exp-training-safety',
    title: 'Infection Control & Safety',
    category: 'Hospital Hygiene',
    icon: '🧼',
  },
  {
    id: 'exp-training-equipment',
    title: 'Medical Equipment Identification',
    category: 'Diagnostics',
    icon: '🩺',
  },
];

export default function VRTrainingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScenario = searchParams.get('scenario') || 'exp-training-admission';
  const [selectedScenario, setSelectedScenario] = useState(initialScenario);

  useEffect(() => {
    const q = searchParams.get('scenario');
    if (q && q !== selectedScenario) {
      setSelectedScenario(q);
    }
  }, [searchParams]);

  const handleSelectScenario = (id) => {
    setSelectedScenario(id);
    setSearchParams({ scenario: id });
  };

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
              <span className="text-slate-800 font-bold">VR Clinical Simulations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              VR Medical Training &amp; Clinical Simulations
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/immersive/progress"
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              View Learning Progress →
            </Link>
          </div>
        </div>

        {/* Scenario Selection Grid / Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {SCENARIOS_LIST.map((sc) => {
            const isSelected = selectedScenario === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectScenario(sc.id)}
                className={`text-left p-4 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-[#0072CE] text-white border-[#0072CE] shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isSelected ? 'bg-white/20' : 'bg-slate-100'
                  }`}
                >
                  {sc.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-[10px] font-bold block uppercase truncate ${
                      isSelected ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {sc.category}
                  </span>
                  <h4 className="font-bold text-xs truncate leading-snug">
                    {sc.title}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Scenario Viewport */}
        <div className="mb-8">
          <TrainingScenario key={selectedScenario} scenarioId={selectedScenario} />
        </div>

        {/* Clinical Disclaimer */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed text-center max-w-3xl mx-auto">
          <strong>⚠️ Educational Training Protocol:</strong> All simulation workflows, triage categories, and clinical procedures represent simulated educational modules. They are designed for medical students, healthcare staff orientation, and patient education.
        </div>
      </main>

      <Footer />
    </div>
  );
}
