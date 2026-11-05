import { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * MediFlow AI Floating Assistant & Quick Help Widget
 * Responsive on mobile, tablet, and desktop with collapsible card
 * and always-accessible floating toggle button.
 */
export default function MediFlowHelperBubble() {
  const [cardOpen, setCardOpen] = useState(false);

  return (
    <aside
      aria-label="MediFlow Outpatient Assistant"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-xs pointer-events-none"
    >
      {/* Collapsible Smart Waitlist & Help Card */}
      {cardOpen && (
        <div
          role="dialog"
          aria-label="Doctor Scheduling Help"
          className="pointer-events-auto bg-[#FFFBEB] border border-amber-200/90 rounded-2xl p-4 shadow-xl text-slate-800 text-xs relative animate-in fade-in slide-in-from-bottom-2 duration-200 w-full"
        >
          {/* Close/Minimize Button */}
          <button
            type="button"
            onClick={() => setCardOpen(false)}
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold transition cursor-pointer"
            title="Minimize Assistant"
            aria-label="Close help message"
          >
            ✕
          </button>

          <div className="flex items-center gap-1.5 text-amber-900 font-extrabold pr-6 mb-1">
            <span>🧭</span>
            <span>MediFlow AI Outpatient Assistant</span>
          </div>

          <p className="text-[11px] text-amber-950/80 leading-relaxed">
            Need guidance on which doctor to consult? Describe your symptoms to find the appropriate department, or join our Smart Priority Waitlist.
          </p>

          <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex flex-col gap-2">
            <Link
              to="/find-specialist"
              onClick={() => setCardOpen(false)}
              className="inline-flex items-center justify-between text-[11px] font-bold text-white bg-[#0072CE] hover:bg-[#005fa8] active:bg-[#004f8c] px-3 py-1.5 rounded-xl transition shadow-2xs"
            >
              <span>🧭 Ask AI: Find Right Specialist</span>
              <span>&rarr;</span>
            </Link>

            <div className="flex items-center justify-between text-[11px]">
              <Link
                to="/waitlist"
                onClick={() => setCardOpen(false)}
                className="font-bold text-amber-900 hover:text-amber-950 underline"
              >
                Smart Waitlist &rarr;
              </Link>
              <button
                type="button"
                onClick={() => setCardOpen(false)}
                className="text-amber-800 hover:underline font-semibold"
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
        title={cardOpen ? 'Close Assistant' : 'Need help? Click for MediFlow Assistant'}
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
