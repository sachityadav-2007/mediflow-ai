import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import AnatomyViewer from '../../components/immersive/AR/AnatomyViewer';
import OrganInfoPanel from '../../components/immersive/AR/OrganInfoPanel';
import ARModelViewer from '../../components/immersive/AR/ARModelViewer';
import UnsupportedDevice from '../../components/immersive/common/UnsupportedDevice';
import useDeviceCapabilities from '../../hooks/useDeviceCapabilities';

export default function ARAnatomyPage() {
  const capabilities = useDeviceCapabilities();
  const [selectedOrgan, setSelectedOrgan] = useState('Heart');
  const [arModalOpen, setArModalOpen] = useState(false);

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
              <span className="text-slate-800 font-bold">AR Human Anatomy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Interactive 3D &amp; AR Human Anatomy
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setArModalOpen(true)}
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0072CE] to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <span>📱</span>
              <span>Launch AR in Room</span>
            </button>
          </div>
        </div>

        {/* Device Capability Warning if AR not supported */}
        {!capabilities.supportsAR && capabilities.checked && (
          <div className="mb-6">
            <UnsupportedDevice message={capabilities.arMessage} mode="AR" />
          </div>
        )}

        {/* Main 3D Anatomy Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left/Center: 3D Canvas */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <AnatomyViewer
              selectedOrgan={selectedOrgan}
              onSelectOrgan={(organ) => setSelectedOrgan(organ)}
              onOpenAR={() => setArModalOpen(true)}
            />

            {/* Quick Helper Tips */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>
                  <strong>Tip:</strong> Click directly on any glowing organ inside the body to view its clinical anatomy and functions.
                </span>
              </div>
              <Link
                to={`/immersive/organs?organ=${selectedOrgan}`}
                className="text-blue-600 font-bold hover:underline shrink-0 ml-2"
              >
                Deep-Dive 3D {selectedOrgan} →
              </Link>
            </div>
          </div>

          {/* Right: Organ Specification Panel */}
          <div className="lg:col-span-4 h-full">
            <OrganInfoPanel
              selectedOrgan={selectedOrgan}
              onSelectOrgan={(organ) => setSelectedOrgan(organ)}
            />
          </div>
        </div>

        {/* AR Modal */}
        {arModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
              <ARModelViewer
                src="/models/anatomy_body.glb"
                title="Full Body Anatomy"
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
