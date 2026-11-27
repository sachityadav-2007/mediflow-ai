import { Link } from 'react-router-dom';

export default function ExperienceCard({ experience, userProgress }) {
  const { id, title, description, type, category, thumbnail, metadata } = experience;

  const progress = userProgress?.find((p) => p.experienceId === id);
  const percentage = progress?.completionPercentage || 0;
  const isCompleted = progress?.completed || false;

  const getTypeBadge = (expType) => {
    switch (expType) {
      case 'ANATOMY':
        return { label: 'AR & 3D Anatomy', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'ORGAN':
        return { label: '3D Organ Explorer', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'HOSPITAL':
        return { label: 'VR Virtual Hospital', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'TRAINING':
        return { label: 'VR Clinical Simulation', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: '3D Interactive', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  };

  const badge = getTypeBadge(type);

  // Determine path
  let launchPath = '/immersive/anatomy';
  if (type === 'ORGAN') {
    launchPath = `/immersive/organs?organ=${metadata?.organ || 'Heart'}`;
  } else if (type === 'HOSPITAL') {
    launchPath = '/immersive/hospital';
  } else if (type === 'TRAINING') {
    launchPath = `/immersive/training?scenario=${id}`;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-200 flex flex-col overflow-hidden group">
      {/* Thumbnail Banner */}
      <div className="relative h-44 overflow-hidden bg-slate-900">
        <img
          src={thumbnail || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80'}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        
        {/* Type Badge */}
        <div className="absolute top-3 left-3">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border backdrop-blur-md ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        {/* Completion status */}
        {isCompleted && (
          <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1">
            <span>✓</span> Completed
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-base leading-tight drop-shadow-xs line-clamp-1">
            {title}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {description}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 mb-1">
            <span>Progress</span>
            <span className="font-bold text-slate-700">{percentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                percentage === 100
                  ? 'bg-emerald-500'
                  : percentage > 0
                  ? 'bg-[#0072CE]'
                  : 'bg-transparent'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Footer Action */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-medium">
            {metadata?.estimatedTimeMin ? `⏱ ~${metadata.estimatedTimeMin} min` : '🎮 Interactive 3D'}
          </div>

          <Link
            to={launchPath}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#0072CE] hover:bg-blue-700 text-white transition shadow-2xs hover:scale-102"
          >
            <span>Launch</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
