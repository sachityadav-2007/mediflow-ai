import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import OrganViewer from '../../components/immersive/AR/OrganViewer';
import OrganInfoPanel from '../../components/immersive/AR/OrganInfoPanel';
import ARModelViewer from '../../components/immersive/AR/ARModelViewer';
import UnsupportedDevice from '../../components/immersive/common/UnsupportedDevice';
import useDeviceCapabilities from '../../hooks/useDeviceCapabilities';

const ORGAN_GLB_MAP = {
  Heart: '/models/heart.glb',
  Brain: '/models/brain.glb',
  Lungs: '/models/lungs.glb',
  Liver: '/models/liver.glb',
  Kidneys: '/models/kidneys.glb',
  Stomach: '/models/stomach.glb',
};

export default function OrganExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrgan = searchParams.get('organ') || 'Heart';
  const [selectedOrgan, setSelectedOrgan] = useState(initialOrgan);
  const [arModalOpen, setArModalOpen] = useState(false);
  const capabilities = useDeviceCapabilities();

  useEffect(() => {
    const organQuery = searchParams.get('organ');
    if (organQuery && organQuery !== selectedOrgan) {
      setSelectedOrgan(organQuery);
    }
  }, [searchParams]);

  const handleSelectOrgan = (organ) => {
    setSelectedOrgan(organ);
    setSearchParams({ organ });
  };

  const organGlb = ORGAN_GLB_MAP[selectedOrgan] || '/models/heart.glb';

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
              <span className="text-slate-800 font-bold">Organ Explorer</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              3D &amp; AR Organ Visualization: {selectedOrgan}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setArModalOpen(true)}
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>📱</span>
              <span>Place {selectedOrgan} in AR</span>
            </button>
          </div>
        </div>

        {/* Capability Note */}
        {!capabilities.supportsAR && capabilities.checked && (
          <div className="mb-6">
            <UnsupportedDevice message={capabilities.arMessage} mode="AR" />
          </div>
        )}

        {/* Organ Selector Header Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['Heart', 'Brain', 'Lungs', 'Liver', 'Kidneys', 'Stomach'].map((organ) => (
            <button
              key={organ}
              type="button"
              onClick={() => handleSelectOrgan(organ)}
              className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition cursor-pointer flex items-center gap-2 ${
                selectedOrgan.toLowerCase() === organ.toLowerCase()
                  ? 'bg-[#0072CE] text-white border-[#0072CE] shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>
                {organ === 'Heart'
                  ? '🫀'
                  : organ === 'Brain'
                  ? '🧠'
                  : organ === 'Lungs'
                  ? '🫁'
                  : organ === 'Liver'
                  ? '🟤'
                  : organ === 'Kidneys'
                  ? '🥜'
                  : '🥣'}
              </span>
              <span>{organ}</span>
            </button>
          ))}
        </div>

        {/* Main Organ Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left/Center: 3D Organ Canvas */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <OrganViewer
              organName={selectedOrgan}
              onOpenAR={() => setArModalOpen(true)}
            />

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-base">🔬</span>
                <span>
                  High-resolution 3D mesh with real-time anatomical dynamics and physiological simulation.
                </span>
              </div>
              <Link to="/immersive/anatomy" className="text-blue-600 font-bold hover:underline shrink-0 ml-2">
                View in Full Body Context →
              </Link>
            </div>
          </div>

          {/* Right: Specifications Panel */}
          <div className="lg:col-span-4 h-full">
            <OrganInfoPanel
              selectedOrgan={selectedOrgan}
              onSelectOrgan={handleSelectOrgan}
            />
          </div>
        </div>

        {/* AR Modal */}
        {arModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
              <ARModelViewer
                src={organGlb}
                title={`${selectedOrgan} 3D Model`}
                onClose={() => setArModalOpen(false)}
              />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
