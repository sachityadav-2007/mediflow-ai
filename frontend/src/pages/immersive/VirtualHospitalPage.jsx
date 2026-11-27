import { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import HospitalScene from '../../components/immersive/VR/HospitalScene';
import ConsultationRoom from '../../components/immersive/VR/ConsultationRoom';
import VRControls from '../../components/immersive/VR/VRControls';
import ExperienceLoader from '../../components/immersive/common/ExperienceLoader';
import UnsupportedDevice from '../../components/immersive/common/UnsupportedDevice';
import useDeviceCapabilities from '../../hooks/useDeviceCapabilities';
import useWebXR from '../../hooks/useWebXR';

const TELEPORT_POINTS = {
  reception: [-5.5, 1.6, -1.5],
  waiting: [-5.5, 1.6, 6.0],
  consultation: [5.8, 1.6, -1.5],
  exam: [5.8, 1.6, 6.0],
  overview: [0, 4.0, 7.0],
};

export default function VirtualHospitalPage() {
  const capabilities = useDeviceCapabilities();
  const { isSupported: isVRSupported, isInVR, startSession, endSession } = useWebXR();

  const [viewMode, setViewMode] = useState('WALKTHROUGH'); // 'WALKTHROUGH' | 'CONSULTATION_FOCUS'
  const [navMode, setNavMode] = useState('FIRST_PERSON'); // 'FIRST_PERSON' | 'ORBIT'
  const [teleportTarget, setTeleportTarget] = useState(null);
  const [activeZone, setActiveZone] = useState('reception');
  const orbitRef = useRef();

  const handleTeleport = (zone) => {
    setActiveZone(zone);
    if (TELEPORT_POINTS[zone]) {
      setTeleportTarget(TELEPORT_POINTS[zone]);
    }
  };

  const handleVRToggle = async () => {
    if (isInVR) {
      await endSession();
    } else {
      await startSession('immersive-vr');
    }
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
              <span className="text-slate-800 font-bold">Virtual Hospital</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Virtual MediFlow Hospital Campus &bull; 3D &amp; VR
            </h1>
          </div>

          {/* Top Actions: VR Headset button & Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleVRToggle}
              className={`text-xs font-bold px-4 py-2.5 rounded-xl border shadow-xs transition flex items-center gap-2 cursor-pointer ${
                isInVR
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white border-indigo-500'
              }`}
            >
              <span>🥽</span>
              <span>{isInVR ? 'Exit VR Headset' : 'Enter VR Headset'}</span>
            </button>

            <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('WALKTHROUGH')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'WALKTHROUGH'
                    ? 'bg-[#0072CE] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Hospital Campus
              </button>
              <button
                type="button"
                onClick={() => setViewMode('CONSULTATION_FOCUS')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'CONSULTATION_FOCUS'
                    ? 'bg-[#0072CE] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Consultation Chamber
              </button>
            </div>
          </div>
        </div>

        {/* Capability Info if VR is not supported on current device */}
        {!capabilities.supportsVR && capabilities.checked && (
          <div className="mb-6">
            <UnsupportedDevice message={capabilities.vrMessage} mode="VR" />
          </div>
        )}

        {/* Main 3D Viewport */}
        {viewMode === 'WALKTHROUGH' ? (
          <div className="relative w-full h-[620px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
            {/* 3D Hospital Canvas */}
            <Suspense fallback={<ExperienceLoader message="Loading Virtual Hospital Environment..." />}>
              <Canvas camera={{ position: [0, 1.8, 6.0], fov: 60 }}>
                <ambientLight intensity={0.65} />
                <directionalLight position={[10, 14, 8]} intensity={1.1} castShadow />
                <directionalLight position={[-10, 6, -8]} intensity={0.4} color="#80d8ff" />

                {/* 3D Hospital Architectural Layout */}
                <HospitalScene onSelectZone={(zone) => handleTeleport(zone)} />

                {/* First-person WASD Controls or Orbit Controls */}
                {navMode === 'FIRST_PERSON' ? (
                  <VRControls
                    teleportTarget={teleportTarget}
                    onTeleportComplete={() => setTeleportTarget(null)}
                  />
                ) : (
                  <OrbitControls
                    ref={orbitRef}
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={2}
                    maxDistance={20}
                  />
                )}
              </Canvas>
            </Suspense>

            {/* Top Toolbar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-white pointer-events-auto shadow-xs">
                <span className="text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Virtual Hospital Walkthrough
                </span>
              </div>

              {/* Navigation Mode Switcher */}
              <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/70 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setNavMode('FIRST_PERSON')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    navMode === 'FIRST_PERSON'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  🚶 First-Person (WASD)
                </button>
                <button
                  type="button"
                  onClick={() => setNavMode('ORBIT')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    navMode === 'ORBIT'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  🌐 Orbit View
                </button>
              </div>
            </div>

            {/* Teleportation Quick Links Bar (Bottom Left) */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md p-2 rounded-2xl border border-slate-700/70 text-white pointer-events-auto flex flex-wrap items-center gap-1.5 shadow-xl">
                <span className="text-[11px] font-bold text-slate-400 px-2">Teleport:</span>
                {[
                  { id: 'reception', label: '🏥 Reception' },
                  { id: 'waiting', label: '⏳ Waiting Lounge' },
                  { id: 'consultation', label: '🩺 Doctor Room' },
                  { id: 'exam', label: '🛏️ Exam Bed' },
                  { id: 'overview', label: '🔭 Overview' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTeleport(item.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      activeZone === item.id
                        ? 'bg-[#0072CE] text-white font-bold shadow-2xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Instructions Badge */}
              <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 pointer-events-auto">
                {navMode === 'FIRST_PERSON' ? (
                  <span>
                    Controls: <strong className="text-cyan-300 font-mono">W, A, S, D</strong> or <strong className="text-cyan-300 font-mono">Arrow Keys</strong> to walk.
                  </span>
                ) : (
                  <span>Left-drag to rotate view &bull; Scroll to zoom.</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Consultation Chamber Close-Up Mode */
          <div className="flex flex-col gap-4">
            <ConsultationRoom />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
