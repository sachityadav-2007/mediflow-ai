import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * MediFlow AI Floating Assistant & Quick Help Widget
 * Responsive on mobile, tablet, and desktop with a clean glassmorphism card,
 * outside-click dismissal, keyboard navigation, and quick access to core AI features.
 */
export default function MediFlowHelperBubble() {
  const [cardOpen, setCardOpen] = useState(false);
  const containerRef = useRef(null);

  // Close popup on outside click or Escape key
  useEffect(() => {
    if (!cardOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setCardOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setCardOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [cardOpen]);

  return (
    <aside
      ref={containerRef}
      aria-label="MediFlow Outpatient Assistant"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none"
    >
      {/* Collapsible Smart Guidance Card */}
      {cardOpen && (
        <div
          role="dialog"
          aria-label="MediFlow AI Quick Navigation & Guidance"
          className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl text-slate-800 text-xs relative animate-in fade-in slide-in-from-bottom-2 duration-200 w-full overflow-hidden"
        >
          {/* Card Header with MediFlow Gradient */}
          <div className="bg-gradient-to-r from-[#0072CE] to-blue-600 text-white p-3.5 pr-8 relative">
            <div className="flex items-center gap-2">
              <span className="text-base">🏥</span>
              <div>
                <h4 className="font-extrabold text-xs tracking-tight text-white leading-tight">
                  MediFlow AI Assistant
                </h4>
                <p className="text-[10px] text-blue-100 font-medium">
                  Smart OPD &bull; AI Triage &bull; Live Queue Sync
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setCardOpen(false)}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xs font-bold transition cursor-pointer"
              title="Close Assistant"
              aria-label="Close assistant modal"
            >
              ✕
            </button>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-3">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Explore MediFlow AI&apos;s core intelligence features for appointment booking, real-time doctor availability, and smart standby waitlists:
            </p>

            {/* Feature Action Links */}
            <div className="space-y-2">
              <Link
                to="/find-specialist"
                onClick={() => setCardOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 text-blue-900 transition group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition">🧭</span>
                  <div>
                    <span className="font-bold text-[11px] block">AI Specialist Finder</span>
                    <span className="text-[10px] text-blue-700/80">Symptom triage &amp; department match</span>
                  </div>
                </div>
                <span className="text-blue-600 font-bold text-xs">&rarr;</span>
              </Link>

              <Link
                to="/waitlist"
                onClick={() => setCardOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200/80 text-purple-900 transition group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition">⏳</span>
                  <div>
                    <span className="font-bold text-[11px] block">Smart Waitlist Queue</span>
                    <span className="text-[10px] text-purple-700/80">Dynamic priority scoring &amp; reallocation</span>
                  </div>
                </div>
                <span className="text-purple-600 font-bold text-xs">&rarr;</span>
              </Link>

              <Link
                to="/doctors"
                onClick={() => setCardOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base group-hover:scale-110 transition">🩺</span>
                  <div>
                    <span className="font-bold text-[11px] block">Doctors &amp; Live OPD Queues</span>
                    <span className="text-[10px] text-slate-500">Real-time presence &amp; slot booking</span>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-slate-700 font-bold text-xs">&rarr;</span>
              </Link>
            </div>

            {/* Footer Dismiss Note */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono">ESC</kbd> to dismiss</span>
              <button
                type="button"
                onClick={() => setCardOpen(false)}
                className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Always Accessible) */}
      <button
        type="button"
        onClick={() => setCardOpen((prev) => !prev)}
        className="pointer-events-auto w-12 h-12 rounded-full bg-[#0072CE] hover:bg-[#005fa8] active:bg-[#004f8c] border-2 border-white shadow-xl flex items-center justify-center text-xl shrink-0 cursor-pointer text-white transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/50 focus:ring-offset-2 relative"
        title={cardOpen ? 'Close Assistant' : 'MediFlow AI Quick Help & Features'}
        aria-label={cardOpen ? 'Close MediFlow Assistant' : 'Open MediFlow Assistant'}
        aria-expanded={cardOpen}
      >
        <span>{cardOpen ? '✕' : '💬'}</span>

        {/* Pulse beacon when closed */}
        {!cardOpen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        )}
      </button>
    </aside>
  );
}
