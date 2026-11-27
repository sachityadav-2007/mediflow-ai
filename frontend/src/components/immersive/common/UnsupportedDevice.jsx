export default function UnsupportedDevice({ message, mode = 'AR' }) {
  return (
    <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-2xs">
      <div className="text-xl shrink-0 p-1 bg-amber-100 rounded-lg text-amber-700">
        ℹ️
      </div>
      <div className="flex-1">
        <h5 className="text-xs font-bold uppercase tracking-wider text-amber-800">
          {mode} Hardware Compatibility Notice
        </h5>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          {message ||
            'Your device does not support this immersive mode. You can still explore the 3D experience with desktop mouse/touch controls.'}
        </p>
      </div>
    </div>
  );
}
