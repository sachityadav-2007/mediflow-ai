import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ApolloHelperBubble() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
      <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-3 shadow-lg max-w-xs animate-in slide-in-from-bottom-3 duration-200 relative">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute top-1.5 right-2 text-amber-800 hover:text-amber-950 text-xs font-bold p-0.5 cursor-pointer"
          title="Dismiss"
        >
          ✕
        </button>
        <p className="text-xs font-extrabold text-amber-950 pr-4">
          Need help choosing a doctor?
        </p>
        <p className="text-[11px] text-amber-800 mt-0.5">
          If your preferred slot is booked, our Smart Priority Triage Waitlist will automatically allocate open slots.
        </p>
        <Link
          to="/waitlist"
          className="mt-2 inline-block text-[11px] font-bold text-amber-950 bg-amber-300 hover:bg-amber-400 px-3 py-1 rounded-lg transition"
        >
          Explore Smart Waitlist &rarr;
        </Link>
      </div>

      <div
        className="w-12 h-12 rounded-full bg-[#0072CE] border-2 border-white shadow-xl flex items-center justify-center text-xl shrink-0 cursor-pointer animate-bounce text-white"
        title="MediFlow AI Live Health Assistant"
      >
        💬
      </div>
    </div>
  );
}
