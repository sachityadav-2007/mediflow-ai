import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Navbar from '../components/Navbar';
import { checkInAppointment } from '../services/api';

function ReceptionCheckInPage() {
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [error, setError] = useState('');
  const [scannerActive, setScannerActive] = useState(true);
  const scannerRef = useRef(null);

  // Initialize camera QR scanner
  useEffect(() => {
    if (!scannerActive) return;

    const qrScanner = new Html5QrcodeScanner(
      'qr-reader-container',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    qrScanner.render(
      async (decodedText) => {
        // Stop scanning while processing
        try {
          qrScanner.pause();
        } catch (e) {
          // ignore
        }
        await handleProcessCheckIn(decodedText);
        setTimeout(() => {
          try {
            qrScanner.resume();
          } catch (e) {
            // ignore
          }
        }, 3000);
      },
      () => {
        // Scan failure frame, ignore
      }
    );

    scannerRef.current = qrScanner;

    return () => {
      try {
        qrScanner.clear();
      } catch (e) {
        // ignore
      }
    };
  }, [scannerActive]);

  const handleProcessCheckIn = async (tokenString) => {
    if (!tokenString || !tokenString.trim()) {
      setError('Please provide a valid QR check-in token or appointment number.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await checkInAppointment(tokenString.trim());
      if (data && data.success) {
        setLastCheckIn(data);
        setManualToken('');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to check in appointment. Please ensure QR code is valid.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleProcessCheckIn(manualToken);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link to="/admin/dashboard" className="hover:text-blue-600">
                Hospital Administration
              </Link>
              <span>/</span>
              <span className="text-gray-800 font-semibold">OPD Check-In</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>📲 Reception QR Patient Check-In</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Scan patient appointment QR code or enter appointment token to verify arrival and assign queue position.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScannerActive((prev) => !prev)}
              className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 shadow-xs transition"
            >
              {scannerActive ? '📷 Hide Camera Scanner' : '📷 Open Camera Scanner'}
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {lastCheckIn && (
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-3xl shrink-0 shadow-sm">
                  ✓
                </div>
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Check-In Confirmed
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                    {lastCheckIn.appointment?.patient?.user?.name || 'Patient'}
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Appointment: <strong>{lastCheckIn.appointment?.appointmentNumber}</strong> &bull;
                    Consultant: <strong>{lastCheckIn.doctorName}</strong>
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    📍 Cabin: <strong>{lastCheckIn.cabinNumber}</strong> &bull; Checked In:{' '}
                    {new Date(lastCheckIn.checkedInAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Queue Position Pill */}
              <div className="text-center bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                  Assigned Queue
                </span>
                <strong className="text-2xl sm:text-3xl font-black text-blue-700">
                  #{lastCheckIn.queuePosition}
                </strong>
                <Link
                  to={`/queue/${lastCheckIn.appointment?.doctorId}`}
                  className="mt-1 block text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                  target="_blank"
                >
                  View Live Queue &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 rounded-2xl p-4 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700 font-bold text-sm ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Two-Column Grid: Camera Scanner & Manual Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* 1. Camera Scanner Box */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>📸 Camera QR Scanner</span>
              </h2>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ● Live Camera
              </span>
            </div>

            {scannerActive ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-2">
                <div id="qr-reader-container" className="w-full"></div>
              </div>
            ) : (
              <div className="py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <span className="text-3xl block mb-2">📷</span>
                <p className="text-xs font-semibold text-gray-600">Camera scanner is paused</p>
                <button
                  onClick={() => setScannerActive(true)}
                  className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Activate Camera
                </button>
              </div>
            )}

            <p className="text-[11px] text-gray-400 text-center">
              Hold the patient&apos;s digital check-in QR code in front of the camera lens to scan.
            </p>
          </div>

          {/* 2. Manual Appointment Number / Token Input */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-5">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>⌨️ Manual Token Fallback</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                If the patient&apos;s phone screen is cracked or camera is unavailable, enter the appointment token manually.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Appointment Number / Token
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="e.g. APT-20261103-001-4921 or QR JWT"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !manualToken.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying Check-In...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Patient Arrival</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-2">
              <h4 className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">
                Check-In Rules &amp; Protection
              </h4>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-500">
                <li>Prevents duplicate check-ins for the same appointment.</li>
                <li>Rejects cancelled or expired appointments.</li>
                <li>Calculates live OPD queue position instantly.</li>
                <li>Broadcasts real-time Socket.IO notification to doctor and waiting board.</li>
                <li>Dispatches confirmation email to the patient automatically.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        MediFlow AI &bull; Reception Check-In Terminal &bull; Capstone Production Architecture
      </footer>
    </div>
  );
}

export default ReceptionCheckInPage;

