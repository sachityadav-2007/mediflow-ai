export default function ExperienceLoader({ message = 'Loading 3D Anatomy Scene...' }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md text-white p-6 transition-all duration-300">
      {/* Animated Pulsing Ring */}
      <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping" />
        <div className="w-16 h-16 rounded-full border-4 border-t-cyan-400 border-r-cyan-400/30 border-b-cyan-400/10 border-l-cyan-400/60 animate-spin" />
        <span className="absolute text-xl">🫀</span>
      </div>

      <h4 className="text-sm font-bold text-slate-100 tracking-wide uppercase mb-1">
        MediFlow Immersive Care
      </h4>
      <p className="text-xs text-slate-300 max-w-xs text-center font-medium animate-pulse">
        {message}
      </p>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-cyan-300/80 bg-cyan-950/60 border border-cyan-800/50 px-3 py-1.5 rounded-full">
        <span>⚡</span> High-Fidelity WebGL Engine Active
      </div>
    </div>
  );
}
