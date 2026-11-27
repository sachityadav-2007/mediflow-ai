import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-black text-slate-900">MediFlow <span className="text-[#0072CE]">AI</span></span>
          <span>&bull;</span>
          <span>Smart Hospital Appointment &amp; Immersive Care Platform</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link to="/" className="text-slate-600 hover:text-[#0072CE] transition">Home</Link>
          <Link to="/doctors" className="text-slate-600 hover:text-[#0072CE] transition">Doctors</Link>
          <Link to="/immersive" className="text-[#0072CE] hover:underline font-bold">Immersive Care</Link>
          <a href="tel:18002003569" className="text-slate-600 hover:text-rose-600 transition">Emergency 1800-200-FLOW</a>
        </div>
      </div>
      <div className="mt-4 text-[11px] text-slate-400">
        &copy; {new Date().getFullYear()} MediFlow AI. All rights reserved. Educational 3D &amp; AR/VR Modules.
      </div>
    </footer>
  );
}
