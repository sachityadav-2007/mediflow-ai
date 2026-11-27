import { useEffect, useRef, useState } from 'react';
import '@google/model-viewer/dist/model-viewer.min.js';

/**
 * ARModelViewer Component
 * Wraps Google's <model-viewer> custom element for native Android Scene Viewer,
 * iOS Quick Look, and WebXR AR placement in physical environments.
 */
export default function ARModelViewer({
  src = '/models/anatomy_body.glb',
  iosSrc,
  poster,
  alt = 'MediFlow 3D Anatomical Model',
  title = 'Anatomical Model',
  onClose,
}) {
  const modelViewerRef = useRef(null);
  const [arStatus, setArStatus] = useState('ready');

  useEffect(() => {
    const viewer = modelViewerRef.current;
    if (!viewer) return;

    const handleARStatus = (event) => {
      setArStatus(event.detail.status);
    };

    viewer.addEventListener('ar-status', handleARStatus);
    return () => {
      viewer.removeEventListener('ar-status', handleARStatus);
    };
  }, []);

  return (
    <div className="relative w-full h-[520px] bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center">
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 text-white pointer-events-auto">
          <span className="text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {title} &bull; AR Placement Mode
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-700 transition pointer-events-auto cursor-pointer"
            aria-label="Close AR view"
          >
            ✕
          </button>
        )}
      </div>

      {/* Google model-viewer element */}
      <model-viewer
        ref={modelViewerRef}
        src={src}
        ios-src={iosSrc}
        poster={poster}
        alt={alt}
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        shadow-softness="0.8"
        exposure="1"
        loading="lazy"
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
      >
        {/* Custom AR Button */}
        <button
          slot="ar-button"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#0072CE] to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg border border-cyan-400/30 flex items-center gap-2 cursor-pointer transition transform hover:scale-105 active:scale-95"
        >
          <span className="text-base">📱</span>
          <span>View in Your Room (AR)</span>
        </button>

        <div id="ar-prompt" className="hidden">
          <span className="text-white text-xs">Point your camera to an open floor or table.</span>
        </div>
      </model-viewer>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-4 text-[11px] text-slate-400 font-medium">
        <span>Supported: Android (Scene Viewer), iOS (Quick Look), &amp; WebXR AR.</span>
      </div>
    </div>
  );
}
