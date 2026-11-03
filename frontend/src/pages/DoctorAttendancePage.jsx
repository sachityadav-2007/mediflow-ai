import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Navbar from '../components/Navbar';
import {
  doctorCheckInQR,
  doctorCheckOutQR,
  getDoctorMyAttendance,
} from '../services/api';
import { useSocket } from '../hooks/useSocket';

function DoctorAttendancePage() {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const scannerRef = useRef(null);

  // Fetch doctor's current attendance state
  const fetchMyAttendance = async () => {
    try {
      const data = await getDoctorMyAttendance();
      if (data && data.success) {
        setAttendanceData(data);
      }
    } catch (err) {
      console.error('Failed to fetch doctor attendance status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  // Real-time Socket.IO synchronization
  useSocket('doctor_status_changed', (data) => {
    if (!attendanceData?.doctor?.id || data?.doctorId === attendanceData.doctor.id) {
      fetchMyAttendance();
    }
  });

  useSocket('doctor_attendance_updated', (data) => {
    if (!attendanceData?.doctor?.id || data?.doctorId === attendanceData.doctor.id) {
      fetchMyAttendance();
    }
  });

  // Handle Camera QR Scanner
  useEffect(() => {
    if (!scannerActive) {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          // ignore
        }
        scannerRef.current = null;
      }
      return;
    }

    setCameraError('');
    let qrScanner = null;

    try {
      qrScanner = new Html5QrcodeScanner(
        'doctor-qr-scanner-container',
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
          await handleCheckIn(decodedText);
          setTimeout(() => {
            try {
              qrScanner.resume();
            } catch (e) {
              // ignore
            }
          }, 4000);
        },
        (errorFrame) => {
          // Scan frame failure, normal while scanning
        }
      );

      scannerRef.current = qrScanner;
    } catch (err) {
      setCameraError(
        'Unable to initialize camera scanner. Please ensure camera permissions are granted or use manual token input below.'
      );
      setScannerActive(false);
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          // ignore
        }
        scannerRef.current = null;
      }
    };
  }, [scannerActive]);

  // Execute Check-In
  const handleCheckIn = async (tokenString) => {
    if (!tokenString || !tokenString.trim()) {
      setActionMessage({
        type: 'error',
        text: 'Please scan or enter a valid hospital QR attendance token.',
      });
      return;
    }

    setActionLoading(true);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await doctorCheckInQR(tokenString.trim());
      if (res && res.success) {
        setActionMessage({
          type: 'success',
          text: res.message || 'Check-in confirmed! Live presence marked as PRESENT.',
        });
        setManualToken('');
        setScannerActive(false);
        await fetchMyAttendance();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Check-in failed. Please verify the QR code is authentic and unexpired.';
      setActionMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Check-Out
  const handleCheckOut = async (e) => {
    e?.preventDefault();
    setActionLoading(true);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await doctorCheckOutQR(checkoutNotes);
      if (res && res.success) {
        setActionMessage({
          type: 'success',
          text: res.message || 'Checked out successfully. Status marked as OFFLINE.',
        });
        setShowCheckoutModal(false);
        setCheckoutNotes('');
        await fetchMyAttendance();
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Checkout failed. Please try again.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Format minutes to readable hours and minutes
  const formatDuration = (mins) => {
    if (!mins || mins < 1) return '0 mins';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} mins`;
    if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
    return `${h} hr${h > 1 ? 's' : ''} ${m} min${m > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-gray-600">Loading doctor attendance...</p>
          </div>
        </div>
      </div>
    );
  }

  const isCheckedIn = attendanceData?.isCheckedIn;
  const activeSession = attendanceData?.activeSession;
  const doctor = attendanceData?.doctor;
  const todaySessions = attendanceData?.todaySessions || [];
  const totalMinutesToday = attendanceData?.totalMinutesToday || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link to="/doctor/dashboard" className="hover:text-blue-600">
                Doctor Dashboard
              </Link>
              <span>/</span>
              <span className="text-gray-800 font-semibold">Attendance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>🩺 Doctor QR Attendance Terminal</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Scan hospital attendance QR codes to verify OPD arrival and log clinical working sessions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/doctor/dashboard"
              className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 shadow-xs transition"
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Action Message Alert Banner */}
        {actionMessage.text && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                : 'bg-red-50 border border-red-300 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">
                {actionMessage.type === 'success' ? '✓' : '⚠️'}
              </span>
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage({ type: '', text: '' })}
              className="font-bold text-sm ml-2 cursor-pointer opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Current Attendance Status Card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 overflow-hidden relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0 ${
                  isCheckedIn
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                    : 'bg-gray-100 border border-gray-200 text-gray-400'
                }`}
              >
                {isCheckedIn ? '👨‍⚕️' : '🚪'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      isCheckedIn
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isCheckedIn ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'
                      }`}
                    ></span>
                    {isCheckedIn ? 'CHECKED IN (ON DUTY)' : 'OFFLINE (NOT CHECKED IN)'}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    Dr. {doctor?.name} ({doctor?.specialization})
                  </span>
                </div>

                {isCheckedIn && activeSession ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-bold text-gray-900">
                      📍 Location: <span className="text-blue-700">{activeSession.location}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Arrival Time:{' '}
                      <strong className="text-gray-800">
                        {new Date(activeSession.checkInTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </strong>{' '}
                      &bull; Verification:{' '}
                      <span className="font-semibold text-emerald-700">QR Scan Verified</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">
                    You have not checked in to the hospital today. Please scan the QR code posted at the
                    OPD reception or clinic desk to mark your clinical presence.
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              {isCheckedIn ? (
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(true)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🚪 Complete Shift Check-Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setScannerActive((prev) => !prev)}
                  className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📷 {scannerActive ? 'Close Scanner' : 'Scan Hospital QR'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* QR SCANNER SECTION (WHEN ACTIVE) */}
        {scannerActive && !isCheckedIn && (
          <div className="bg-white rounded-3xl border-2 border-blue-500 shadow-md p-6 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span>📸 Camera QR Scanner</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ● Camera Active
                </span>
              </h2>
              <button
                onClick={() => setScannerActive(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-800">
                ⚠️ {cameraError}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-2">
                <div id="doctor-qr-scanner-container" className="w-full"></div>
              </div>
            )}

            <p className="text-[11px] text-gray-400 text-center">
              Align the hospital check-in QR code on the clinic desk within the frame to verify arrival.
            </p>
          </div>
        )}

        {/* MANUAL CODE FALLBACK SECTION (FOR CAMERA UNAVAILABILITY) */}
        {!isCheckedIn && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>⌨️ Manual Hospital Token Input (Fallback)</span>
            </h2>
            <p className="text-xs text-gray-500">
              If camera access is blocked in your browser or lighting is low, paste the signed hospital token below.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCheckIn(manualToken);
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste signed hospital QR token..."
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={actionLoading || !manualToken.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                {actionLoading ? 'Verifying...' : 'Submit Check-In &rarr;'}
              </button>
            </form>
          </div>
        )}

        {/* TODAY'S ATTENDANCE SESSIONS & SUMMARY */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-black text-gray-900">Today&apos;s Attendance Summary</h2>
              <p className="text-xs text-gray-500">Clinical shift logs recorded for today.</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Total Worked Today
              </span>
              <strong className="text-base font-black text-blue-700">
                {formatDuration(totalMinutesToday)}
              </strong>
            </div>
          </div>

          {todaySessions.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              <span className="text-3xl block mb-2">📋</span>
              No attendance sessions logged for today yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Location</th>
                    <th className="py-2.5">Check-In</th>
                    <th className="py-2.5">Check-Out</th>
                    <th className="py-2.5">Duration</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todaySessions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 font-semibold text-gray-900">{s.location}</td>
                      <td className="py-3 font-mono text-gray-600">
                        {new Date(s.checkInTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 font-mono text-gray-600">
                        {s.checkOutTime
                          ? new Date(s.checkOutTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Ongoing'}
                      </td>
                      <td className="py-3 font-semibold text-blue-700">
                        {s.durationMinutes ? formatDuration(s.durationMinutes) : 'In Progress'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'CHECKED_IN'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}
                        >
                          {s.status === 'CHECKED_IN' ? '● ACTIVE' : '✓ COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security & Regulatory Notice */}
        <p className="text-center text-xs text-gray-400">
          🔒 Verification Notice: Scanning hospital QR codes authenticates a verified check-in interaction and
          initializes clinical availability tracking. Continuous presence is maintained in accordance with hospital OPD policy.
        </p>
      </main>

      {/* CHECKOUT CONFIRMATION MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span>🚪 Confirm Shift Check-Out</span>
              </h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to check out from{' '}
              <strong>{activeSession?.location || 'Hospital OPD'}</strong>? Your live presence will be
              transitioned to <strong>OFFLINE</strong> and shift duration recorded.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Handover / Checkout Notes (Optional)
              </label>
              <textarea
                rows="2"
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="e.g., Handed over ward coverage to Dr. Sharma..."
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              ></textarea>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCheckOut}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Checking out...' : 'Confirm Check-Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        MediFlow AI &bull; Doctor Clinical Attendance &bull; Security &amp; Audit Logged
      </footer>
    </div>
  );
}

export default DoctorAttendancePage;

