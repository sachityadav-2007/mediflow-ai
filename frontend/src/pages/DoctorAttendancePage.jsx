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
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

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
      }
      return;
    }

    setCameraError('');
    const qrScanner = new Html5QrcodeScanner(
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
        setScannerActive(false);
      },
      (err) => {
        // scan frame drop
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

  // Execute Check-in (QR or Manual)
  const handleCheckIn = async (token) => {
    if (!token || !token.trim()) {
      setActionMessage({
        type: 'error',
        text: 'Please provide a valid signed hospital QR token.',
      });
      return;
    }

    setActionLoading(true);
    setActionMessage({ type: '', text: '' });

    // Request browser geolocation coordinates
    let latitude = null;
    let longitude = null;
    try {
      if ('geolocation' in navigator) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 60000,
          });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
    } catch (geoErr) {
      console.warn('Geolocation capture skipped or denied:', geoErr.message);
    }

    try {
      const res = await doctorCheckInQR({
        token: token.trim(),
        latitude,
        longitude,
      });

      if (res && res.success) {
        setActionMessage({
          type: 'success',
          text: `Check-in confirmed! Presence updated to ${res.currentPresence || 'PRESENT'}. Shift started.`,
        });
        setManualToken('');
        setScannerActive(false);
        fetchMyAttendance();
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text:
          err.response?.data?.message ||
          'Failed to check in. Token may be expired or geofence boundary exceeded.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Check-out
  const handleCheckOut = async () => {
    setActionLoading(true);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await doctorCheckOutQR(checkoutNotes);
      if (res && res.success) {
        setActionMessage({
          type: 'success',
          text: `Check-out complete! Shift duration: ${res.durationMinutes || 0} min(s). Presence set to OFFLINE.`,
        });
        setShowCheckoutModal(false);
        setCheckoutNotes('');
        fetchMyAttendance();
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Check-out failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (mins) => {
    if (!mins && mins !== 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <Navbar />
        <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <LoadingSkeleton variant="card" count={3} />
        </main>
      </div>
    );
  }

  const doctor = attendanceData?.doctor;
  const isCheckedIn = attendanceData?.isCheckedIn || false;
  const activeSession = attendanceData?.activeSession;
  const todaySessions = attendanceData?.todaySessions || [];
  const totalMinutesToday = attendanceData?.totalMinutesToday || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        <PageHeader
          title="Clinician Attendance &amp; Shift Terminal"
          subtitle="Cryptographic QR shift verification, geofenced presence synchronization, and working hours audit log."
          badge={
            <Badge
              variant={isCheckedIn ? 'success' : 'neutral'}
              size="sm"
              dot
              dotPulse={isCheckedIn}
            >
              {isCheckedIn ? 'Shift Active' : 'Offline'}
            </Badge>
          }
          actions={
            <Link to="/doctor/dashboard">
              <Button variant="outline" size="sm" icon={<span>←</span>}>
                Back to Dashboard
              </Button>
            </Link>
          }
        />

        {/* Action Message Alert Banner */}
        {actionMessage.text && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between shadow-2xs ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
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
              className="font-bold text-base ml-2 cursor-pointer opacity-70 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        )}

        {/* Current Attendance Status Card */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xs shrink-0 ${
                  isCheckedIn
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                    : 'bg-slate-100 border border-slate-200 text-slate-400'
                }`}
              >
                {isCheckedIn ? '👨‍⚕️' : '🚪'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isCheckedIn ? 'success' : 'neutral'}
                    size="sm"
                    dot
                    dotPulse={isCheckedIn}
                  >
                    {isCheckedIn
                      ? `CHECKED IN (${doctor?.currentPresence || 'PRESENT'})`
                      : 'OFFLINE (NOT CHECKED IN)'}
                  </Badge>
                  <span className="text-xs text-slate-400 font-semibold">
                    Dr. {doctor?.name} ({doctor?.specialization})
                  </span>
                </div>

                {isCheckedIn && activeSession ? (
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="font-bold text-slate-900">
                      📍 Location: <span className="text-[#0072CE]">{activeSession.location}</span>
                    </p>
                    <p className="text-slate-500">
                      Arrival Time:{' '}
                      <strong className="text-slate-800 font-mono">
                        {new Date(activeSession.checkInTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </strong>{' '}
                      &bull; Method:{' '}
                      <span className="font-semibold text-emerald-700">
                        {activeSession.checkInMethod === 'QR_SCAN' ? 'QR Scan Verified' : 'Manual Shift Entry'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    You have not checked in to the hospital today. Please scan the QR code posted at the
                    OPD reception or clinic desk to mark your physical presence.
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              {isCheckedIn ? (
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setShowCheckoutModal(true)}
                  disabled={actionLoading}
                  icon={<span>🚪</span>}
                >
                  Complete Shift Check-Out
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setScannerActive((prev) => !prev)}
                  icon={<span>📷</span>}
                >
                  {scannerActive ? 'Close Scanner' : 'Scan Hospital QR'}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* QR Scanner Box */}
        {scannerActive && !isCheckedIn && (
          <Card className="p-6 border-2 border-blue-400 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <CardTitle>
                <span>📸</span>
                <span>Camera QR Scanner</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScannerActive(false)}
              >
                ✕ Close
              </Button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800">
                ⚠️ {cameraError}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <div id="doctor-qr-scanner-container" className="w-full"></div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center">
              Align the clinic check-in QR code on your desk within the viewfinder to verify arrival.
            </p>
          </Card>
        )}

        {/* Manual Code Fallback */}
        {!isCheckedIn && (
          <Card className="p-6 space-y-4">
            <div>
              <CardTitle>
                <span>⌨️</span>
                <span>Manual Token Input (Fallback)</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                If camera access is blocked in your browser, paste the signed hospital token directly.
              </p>
            </div>

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
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] outline-none"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!manualToken.trim()}
                isLoading={actionLoading}
              >
                Submit Check-In ➔
              </Button>
            </form>
          </Card>
        )}

        {/* Today's Attendance Sessions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Today's Shift Attendance Logs</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Verified clinical sessions recorded for today.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Shift Duration
                </span>
                <strong className="text-base font-black text-[#0072CE]">
                  {formatDuration(totalMinutesToday)}
                </strong>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {todaySessions.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon="📋"
                  title="No Shift Sessions Today"
                  description="You have not clocked in for any clinical sessions today yet."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Check-In</th>
                      <th className="py-3 px-4">Check-Out</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todaySessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{s.location}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {new Date(s.checkInTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {s.checkOutTime
                            ? new Date(s.checkOutTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : 'Ongoing'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#0072CE]">
                          {s.durationMinutes !== undefined && s.durationMinutes !== null
                            ? formatDuration(s.durationMinutes)
                            : 'In Progress'}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={s.status === 'CHECKED_IN' ? 'success' : 'neutral'}
                            size="xs"
                            dotPulse={s.status === 'CHECKED_IN'}
                          >
                            {s.status === 'CHECKED_IN' ? 'ACTIVE' : 'COMPLETED'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Checkout Confirmation Modal */}
      <Modal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        title="Confirm Shift Check-Out"
        description="Marking your shift complete will transition your presence to OFFLINE."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1.5">
              Shift Handoff / Notes (Optional)
            </label>
            <textarea
              rows="3"
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              placeholder="e.g. Completed 12 OPD consultations, handed ward rounds to duty registrar..."
              className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/30"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCheckoutModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCheckOut}
              isLoading={actionLoading}
            >
              Confirm Check-Out
            </Button>
          </div>
        </div>
      </Modal>

      <footer className="text-center py-5 text-xs text-slate-400 bg-white border-t border-slate-200">
        MediFlow AI 2.0 &bull; Clinician Presence &amp; Shift Terminal &bull; Smart Outpatient Network
      </footer>
    </div>
  );
}

export default DoctorAttendancePage;
