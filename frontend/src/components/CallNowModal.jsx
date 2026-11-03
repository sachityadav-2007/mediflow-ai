export default function CallNowModal({ doctor, onClose }) {
  if (!doctor) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-3xl mb-3 shadow-xs">
          📞
        </div>
        <h3 className="text-lg font-black text-gray-900">
          Connect to OPD Clinic
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Consultant: <strong>{doctor.user?.name || doctor.name}</strong> &bull; {doctor.specialization}
        </p>

        <div className="bg-gray-50 rounded-2xl p-4 my-4 border border-gray-100 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Hospital:</span>
            <strong className="text-gray-900">Apollo Hospitals Pune</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">OPD Suite:</span>
            <strong className="text-gray-900">{doctor.roomNumber || 'Room 101'}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Hospital Helpline:</span>
            <a href="tel:1066" className="text-blue-700 font-bold hover:underline">
              1066 (Toll-Free)
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Cabin Direct Desk:</span>
            <a href="tel:+912040151066" className="text-blue-700 font-bold hover:underline">
              +91 20 4015 1066
            </a>
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href="tel:1066"
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Dial 1066
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

