import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Navbar from '../components/Navbar';
import { checkInAppointment } from '../services/api';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';

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
        // Frame scan drop, ignore
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

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        <PageHeader
          title="Reception OPD Check-In Terminal"
          subtitle="Scan patient digital QR tokens or enter appointment numbers to verify hospital arrival, assign live OPD queue positions, and notify the clinician."
          badge={
            <Badge variant="teal" size="sm" dot>
              Arrival Verification
            </Badge>
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScannerActive((prev) => !prev)}
              icon={<span>📷</span>}
            >
              {scannerActive ? 'Pause Camera Scanner' : 'Activate Camera Scanner'}
            </Button>
          }
        />

        {/* Success Alert Banner */}
        {lastCheckIn && (
          <Card className="p-6 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border-emerald-300 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-3xl shrink-0 shadow-xs">
                  ✓
                </div>
                <div className="space-y-1">
                  <Badge variant="success" size="sm" dot>
                    Check-In Confirmed &bull; Token Verified
                  </Badge>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {lastCheckIn.appointment?.patient?.user?.name || 'Registered Patient'}
                  </h3>
                  <p className="text-xs text-slate-700">
                    Appointment: <strong>{lastCheckIn.appointment?.appointmentNumber}</strong> &bull;
                    Consultant: <strong>Dr. {lastCheckIn.doctorName}</strong>
                  </p>
                  <p className="text-xs text-[#0072CE] font-bold">
                    📍 Destination: <strong>{lastCheckIn.cabinNumber}</strong> &bull; Arrival:{' '}
                    {new Date(lastCheckIn.checkedInAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Queue Position Card */}
              <div className="text-center bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs shrink-0 self-start sm:self-auto min-w-[140px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Assigned Queue
                </span>
                <strong className="text-3xl font-black text-[#0072CE] font-mono">
                  #{lastCheckIn.queuePosition}
                </strong>
                <Link
                  to={`/queue/${lastCheckIn.appointment?.doctorId}`}
                  className="mt-1 block text-xs font-bold text-slate-600 hover:text-[#0072CE] transition"
                  target="_blank"
                >
                  Live Queue Board ↗
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs font-semibold flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-rose-400 hover:text-rose-700 font-bold text-base ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Two-Column Grid: Camera Scanner & Manual Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* 1. Camera Scanner Box */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>
                <span>📸</span>
                <span>Camera QR Scanner</span>
              </CardTitle>
              <Badge variant="success" size="xs" dot dotPulse>
                Active Scanner
              </Badge>
            </div>

            {scannerActive ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <div id="qr-reader-container" className="w-full"></div>
              </div>
            ) : (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                <span className="text-4xl block text-slate-400">📷</span>
                <p className="text-xs font-semibold text-slate-600">Camera scanner is paused</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setScannerActive(true)}
                >
                  Activate Camera
                </Button>
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center">
              Hold the patient's verified digital check-in QR pass in front of the lens.
            </p>
          </Card>

          {/* 2. Manual Appointment Number / Token Input */}
          <Card className="p-6 space-y-5">
            <div>
              <CardTitle>
                <span>⌨️</span>
                <span>Manual Token Fallback</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                If the patient's display is unreadable or camera is offline, enter the appointment token manually.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Appointment Number / QR Token
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="e.g. APT-20261103-001 or JWT"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] outline-none"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                disabled={!manualToken.trim()}
                isLoading={loading}
              >
                Confirm Patient Arrival ➔
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
              <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                Automated Clinical Workflow Rules:
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-500 leading-relaxed">
                <li>Prevents duplicate check-ins for the same appointment.</li>
                <li>Calculates live OPD waiting room queue position instantly.</li>
                <li>Broadcasts real-time Socket.IO notification to doctor portal.</li>
                <li>Dispatches confirmation arrival notification to the patient.</li>
              </ul>
            </div>
          </Card>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-400">
        MediFlow AI 2.0 &bull; Reception Check-In Terminal &bull; Smart Outpatient Network
      </footer>
    </div>
  );
}

export default ReceptionCheckInPage;
