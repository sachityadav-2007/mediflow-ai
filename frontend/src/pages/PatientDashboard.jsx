import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getPatientAppointments,
  getMyWaitlist,
  getSmartSlotRecommendations,
  getAppointmentQR,
  cancelAppointment,
  getLiveQueue,
} from '../services/api';
import { useSocket } from '../hooks/useSocket';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingSkeleton, { CardSkeleton, ListSkeleton } from '../components/ui/LoadingSkeleton';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

function PatientDashboard() {
  const { user } = useAuth();
  const profile = user?.patientProfile;

  // Main data states
  const [appointments, setAppointments] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [recommendedSlots, setRecommendedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionNotice, setActionNotice] = useState({ type: '', text: '' });

  // Live Queue state for today's appointment (if any)
  const [liveQueueData, setLiveQueueData] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // QR Modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrError, setQrError] = useState('');

  // Cancel Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [apptToCancel, setApptToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Formatted date string for the header
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Safe patient initials helper
  const getInitials = (name) => {
    if (!name) return 'PT';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Safe date formatter for appointment dates
  const formatAppointmentDate = (dateStr) => {
    if (!dateStr) return 'Date not specified';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Check if a date string is today
  const isDateToday = (dateStr) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      const now = new Date();
      return (
        d.getUTCFullYear() === now.getUTCFullYear() &&
        d.getUTCMonth() === now.getUTCMonth() &&
        d.getUTCDate() === now.getUTCDate()
      );
    } catch {
      return false;
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [aptRes, wlRes, recRes] = await Promise.all([
        getPatientAppointments().catch((err) => {
          console.warn('Appointments fetch notice:', err.message);
          return { appointments: [] };
        }),
        getMyWaitlist().catch((err) => {
          console.warn('Waitlist fetch notice:', err.message);
          return { waitlist: [] };
        }),
        getSmartSlotRecommendations({ limit: 4 }).catch((err) => {
          console.warn('AI recommendations fetch notice:', err.message);
          return { recommendations: [] };
        }),
      ]);

      let aptList = [];
      if (aptRes?.appointments) {
        aptList = aptRes.appointments;
        setAppointments(aptList);
      }
      if (wlRes?.waitlist) {
        setWaitlistEntries(wlRes.waitlist);
      }
      if (recRes?.recommendations) {
        setRecommendedSlots(recRes.recommendations);
      }

      // Check if there is an upcoming appointment today or active to fetch live queue for
      const upcomingApts = aptList.filter(
        (a) =>
          a.status === 'SCHEDULED' ||
          a.status === 'CONFIRMED' ||
          a.status === 'CHECKED_IN' ||
          a.status === 'IN_PROGRESS'
      );
      const todayOrNextApt =
        upcomingApts.find((a) => isDateToday(a.appointmentDate) || a.status === 'CHECKED_IN') ||
        upcomingApts[0];

      if (todayOrNextApt?.doctorId) {
        fetchDoctorQueue(todayOrNextApt.doctorId);
      } else {
        setLiveQueueData(null);
      }
    } catch (err) {
      console.error('Failed to load patient dashboard records:', err);
      setError('Unable to synchronize patient dashboard records. Please check connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch live OPD queue for a specific doctor
  const fetchDoctorQueue = async (doctorId) => {
    if (!doctorId) return;
    setLoadingQueue(true);
    try {
      const data = await getLiveQueue(doctorId, true);
      if (data && data.success) {
        setLiveQueueData(data);
      }
    } catch (err) {
      console.warn('Live queue fetch notice:', err.message);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time Socket.IO listeners for live synchronization
  useSocket('appointment_created', fetchDashboardData);
  useSocket('appointment_cancelled', fetchDashboardData);
  useSocket('appointment_allocated', fetchDashboardData);
  useSocket('appointment_rescheduled', fetchDashboardData);
  useSocket('appointment_status_changed', fetchDashboardData);
  useSocket('waitlist_updated', fetchDashboardData);
  useSocket('ai_forecast_updated', fetchDashboardData);
  useSocket('queue_updated', () => {
    if (nextAppointment?.doctorId) {
      fetchDoctorQueue(nextAppointment.doctorId);
    }
  });
  useSocket('patient_checked_in', () => {
    if (nextAppointment?.doctorId) {
      fetchDoctorQueue(nextAppointment.doctorId);
    }
  });

  // Filtered appointments
  const upcomingAppointments = appointments
    .filter(
      (a) =>
        a.status === 'SCHEDULED' ||
        a.status === 'CONFIRMED' ||
        a.status === 'CHECKED_IN' ||
        a.status === 'IN_PROGRESS'
    )
    .sort((a, b) => {
      const diff = new Date(a.appointmentDate) - new Date(b.appointmentDate);
      if (diff !== 0) return diff;
      return (a.slot?.startTime || '').localeCompare(b.slot?.startTime || '');
    });

  const nextAppointment = upcomingAppointments[0] || null;
  const secondaryUpcoming = upcomingAppointments.slice(1);
  const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED');
  const activeWaitlists = waitlistEntries.filter((w) => w.status === 'PENDING');
  const myQueueEntry = liveQueueData?.checkedInQueue?.find((item) => item.id === nextAppointment?.id);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <Badge variant="primary" size="sm" dot>
            CONFIRMED
          </Badge>
        );
      case 'SCHEDULED':
        return (
          <Badge variant="indigo" size="sm" dot>
            SCHEDULED
          </Badge>
        );
      case 'CHECKED_IN':
        return (
          <Badge variant="success" size="sm" dot dotPulse>
            CHECKED IN &bull; IN QUEUE
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="purple" size="sm" dot dotPulse>
            IN CONSULTATION
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="teal" size="sm">
            COMPLETED
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="danger" size="sm">
            CANCELLED
          </Badge>
        );
      case 'ALLOCATED':
        return (
          <Badge variant="teal" size="sm" dot>
            ALLOCATED
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="warning" size="sm" dot>
            WAITLIST STANDBY
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status}
          </Badge>
        );
    }
  };

  // Open QR modal for an appointment
  const handleOpenQRModal = async (apptId) => {
    setQrModalOpen(true);
    setQrLoading(true);
    setQrError('');
    setQrData(null);
    try {
      const data = await getAppointmentQR(apptId);
      if (data && data.success) {
        setQrData(data);
      } else {
        setQrError(data?.message || 'Unable to retrieve check-in QR pass.');
      }
    } catch (err) {
      setQrError(err.response?.data?.message || 'Unable to load QR check-in token.');
    } finally {
      setQrLoading(false);
    }
  };

  // Cancellation prompt
  const promptCancel = (appt) => {
    setApptToCancel(appt);
    setCancelModalOpen(true);
  };

  // Confirm cancellation
  const handleConfirmCancel = async () => {
    if (!apptToCancel) return;
    setCancelling(true);
    setActionNotice({ type: '', text: '' });
    try {
      const res = await cancelAppointment(apptToCancel.id);
      if (res?.success) {
        let msg = `Appointment ${apptToCancel.appointmentNumber} has been successfully cancelled.`;
        if (res.autoAllocated && res.allocatedPatient) {
          msg += ` [Smart Waitlist]: Slot automatically re-allocated to standby patient (${res.allocatedPatient.name})!`;
        }
        setActionNotice({ type: 'success', text: msg });
        setCancelModalOpen(false);
        setApptToCancel(null);
        fetchDashboardData();
      }
    } catch (err) {
      setActionNotice({
        type: 'error',
        text: err.response?.data?.message || 'Failed to cancel appointment. Please try again.',
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 space-y-6 sm:space-y-8">
        {/* ================================================================= */}
        {/* 1. DASHBOARD HEADER                                               */}
        {/* ================================================================= */}
        <section aria-labelledby="patient-welcome-heading">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white shadow-md border border-slate-800">
            {/* Ambient decorative background blurs */}
            <div
              className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left: Patient Avatar & Greeting */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#0072CE] to-sky-400 text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-md ring-2 ring-white/20 shrink-0"
                  aria-label={`Initials ${getInitials(user?.name)}`}
                >
                  {getInitials(user?.name)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Verified Patient Portal
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      📅 {todayFormatted}
                    </span>
                  </div>

                  <h1
                    id="patient-welcome-heading"
                    className="text-2xl sm:text-3xl font-black tracking-tight text-white"
                  >
                    Welcome back, {user?.name || 'Patient'}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                    Track your upcoming consultations, view touchless QR reception check-in passes, and monitor real-time OPD queues across hospital departments.
                  </p>
                </div>
              </div>

              {/* Right: Quick Action Header Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link to="/find-specialist">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<span>🧭</span>}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 focus:ring-white/40"
                  >
                    AI Specialist Finder
                  </Button>
                </Link>

                <Link to="/book">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<span>📅</span>}
                    className="shadow-sm"
                  >
                    Book Consultation
                  </Button>
                </Link>

                <Link to="/waitlist">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<span>⏳</span>}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 focus:ring-white/40"
                  >
                    Smart Waitlist
                  </Button>
                </Link>

                <Link to="/my-appointments">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<span>📲</span>}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 focus:ring-white/40"
                  >
                    My QR Passes
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Profile Pill Row */}
            <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="font-semibold text-white">Clinical Quick Snapshot:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                🩸 Blood Group: <strong className="text-sky-300">{profile?.bloodGroup || 'Not logged'}</strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                🩺 Emergency Contact: <strong className="text-white">{profile?.emergencyContact || 'None on file'}</strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                🏥 Hospital Campus: <strong className="text-white">{profile?.address || 'Pune Central Medical Campus'}</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Global Action Notification Banner */}
        {actionNotice.text && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition-all ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
            role="alert"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{actionNotice.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{actionNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice({ type: '', text: '' })}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 focus:outline-none"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sync / Connectivity Error Banner */}
        {error && (
          <ErrorState
            title="Dashboard Sync Notice"
            message={error}
            onRetry={fetchDashboardData}
          />
        )}

        {/* ================================================================= */}
        {/* 2. DASHBOARD OVERVIEW STATS                                       */}
        {/* ================================================================= */}
        <section aria-label="Dashboard Overview Statistics">
          {loading ? (
            <CardSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                title="Upcoming Visits"
                value={upcomingAppointments.length}
                subtitle={
                  nextAppointment
                    ? `Next: ${formatAppointmentDate(nextAppointment.appointmentDate)}`
                    : 'No visits currently scheduled'
                }
                icon="📅"
                iconBg="bg-blue-50 text-[#0072CE]"
                badge={
                  upcomingAppointments.length > 0 ? (
                    <Badge variant="primary" size="xs">
                      {upcomingAppointments.length} Active
                    </Badge>
                  ) : null
                }
              />

              <StatCard
                title="Total Consultations"
                value={appointments.length}
                subtitle={`${completedAppointments.length} completed clinical visits`}
                icon="📋"
                iconBg="bg-emerald-50 text-emerald-700"
                badge={
                  completedAppointments.length > 0 ? (
                    <Badge variant="success" size="xs">
                      History
                    </Badge>
                  ) : null
                }
              />

              <StatCard
                title="OPD Live Queue"
                value={
                  liveQueueData?.checkedInQueue?.length !== undefined
                    ? `${liveQueueData.checkedInQueue.length} Waiting`
                    : nextAppointment && isDateToday(nextAppointment.appointmentDate)
                    ? 'Active Today'
                    : 'Standby'
                }
                subtitle={
                  nextAppointment && isDateToday(nextAppointment.appointmentDate)
                    ? `Room ${nextAppointment.doctor?.roomNumber || 'OPD'} &bull; Scan QR to check in`
                    : 'Check-in opens on visit day'
                }
                icon="⏱️"
                iconBg="bg-purple-50 text-purple-700"
                badge={
                  <Badge variant={liveQueueData ? 'purple' : 'neutral'} size="xs" dot={Boolean(liveQueueData)}>
                    {liveQueueData ? 'Live Sync' : 'Standby'}
                  </Badge>
                }
              />

              <StatCard
                title="Waitlist Standby"
                value={activeWaitlists.length}
                subtitle={
                  activeWaitlists.length > 0
                    ? 'Monitored for slot cancellations'
                    : 'Not on any waitlist'
                }
                icon="⏳"
                iconBg="bg-amber-50 text-amber-700"
                badge={
                  activeWaitlists.length > 0 ? (
                    <Badge variant="warning" size="xs" dot>
                      Active Triage
                    </Badge>
                  ) : null
                }
              />
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* 3. UPCOMING APPOINTMENT (Hero & Priority Section)                  */}
        {/* ================================================================= */}
        <section aria-labelledby="upcoming-appointment-heading">
          <Card className="overflow-hidden border border-slate-200/90 shadow-xs">
            <CardHeader className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0072CE] flex items-center justify-center text-xl shrink-0">
                    🩺
                  </div>
                  <div>
                    <h2
                      id="upcoming-appointment-heading"
                      className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                    >
                      Upcoming Consultation
                    </h2>
                    <p className="text-xs text-slate-500">
                      Your immediate scheduled visit, digital check-in pass, and cabin status
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to="/my-appointments">
                    <Button variant="ghost" size="sm" icon={<span>📋</span>}>
                      View All History ➔
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {loading ? (
                <div className="space-y-4">
                  <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
                </div>
              ) : !nextAppointment ? (
                <EmptyState
                  icon="📅"
                  title="No Upcoming Consultations Scheduled"
                  description="You have no active doctor appointments at this time. Schedule a visit with one of our specialized hospital consultants or use our AI Health Assistant for guidance."
                  action={
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Link to="/book">
                        <Button variant="primary" size="md" icon={<span>📅</span>}>
                          Book An Appointment
                        </Button>
                      </Link>
                      <Link to="/find-specialist">
                        <Button variant="outline" size="md" icon={<span>🧭</span>}>
                          Find Specialist with AI
                        </Button>
                      </Link>
                    </div>
                  }
                />
              ) : (
                <div className="space-y-6">
                  {/* Hero Next Appointment Card */}
                  <div className="relative rounded-2xl border-2 border-blue-200/80 bg-gradient-to-br from-white via-blue-50/20 to-sky-50/30 p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left: Doctor Details & Time */}
                      <div className="space-y-3.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {getStatusBadge(nextAppointment.status)}
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                            Ref: {nextAppointment.appointmentNumber}
                          </span>
                          {isDateToday(nextAppointment.appointmentDate) && (
                            <Badge variant="teal" size="sm" dot dotPulse>
                              Today&apos;s Consultation
                            </Badge>
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {nextAppointment.doctor?.user?.name || 'Hospital Specialist'}
                          </h3>
                          <p className="text-xs sm:text-sm font-semibold text-[#0072CE] mt-0.5">
                            {nextAppointment.doctor?.specialization || 'General OPD'}{' '}
                            <span className="text-slate-400 font-normal">&bull;</span>{' '}
                            <span className="text-slate-700">
                              Cabin / Room: {nextAppointment.doctor?.roomNumber || 'Consultation Suite'}
                            </span>
                          </p>
                        </div>

                        {/* Date & Time Highlights */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-700">
                            <span className="text-xl">📅</span>
                            <div>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Appointment Date
                              </p>
                              <p className="font-bold text-slate-900 text-sm mt-0.5">
                                {formatAppointmentDate(nextAppointment.appointmentDate)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-700">
                            <span className="text-xl">⏰</span>
                            <div>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Consultation Slot
                              </p>
                              <p className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                                {nextAppointment.slot?.startTime} &ndash; {nextAppointment.slot?.endTime}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Queue note / arrival advice */}
                        <p className="text-xs text-slate-500 leading-relaxed">
                          💡 <strong>Arrival Guidance:</strong> Please arrive 10 minutes before your slot. Present your digital QR pass at any reception kiosk or OPD entrance scanner to check in and register your live queue number.
                        </p>
                      </div>

                      {/* Right: Primary Action Buttons */}
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
                        <Button
                          variant="success"
                          size="md"
                          icon={<span>📲</span>}
                          onClick={() => handleOpenQRModal(nextAppointment.id)}
                          className="w-full sm:w-auto shadow-xs"
                        >
                          View Check-In QR Pass
                        </Button>

                        <Link
                          to={`/queue/${nextAppointment.doctorId}`}
                          className="w-full sm:w-auto"
                        >
                          <Button
                            variant="primary"
                            size="md"
                            icon={<span>👀</span>}
                            className="w-full"
                          >
                            Live OPD Queue
                          </Button>
                        </Link>

                        <Link to="/my-appointments" className="w-full sm:w-auto">
                          <Button variant="outline" size="md" className="w-full">
                            Reschedule
                          </Button>
                        </Link>

                        {(nextAppointment.status === 'SCHEDULED' ||
                          nextAppointment.status === 'CONFIRMED') && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => promptCancel(nextAppointment)}
                            className="w-full sm:w-auto"
                          >
                            Cancel Appointment
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Secondary Upcoming Visits (if patient has more than 1) */}
                  {secondaryUpcoming.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Additional Scheduled Consultations ({secondaryUpcoming.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {secondaryUpcoming.map((apt) => (
                          <div
                            key={apt.id}
                            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col justify-between gap-3 shadow-2xs"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-sm text-slate-900">
                                  {apt.doctor?.user?.name || 'Doctor'}
                                </span>
                                {getStatusBadge(apt.status)}
                              </div>
                              <p className="text-xs text-slate-500">
                                {apt.doctor?.specialization} &bull; Room {apt.doctor?.roomNumber || 'OPD'}
                              </p>
                              <p className="text-xs font-mono font-bold text-[#0072CE]">
                                📅 {formatAppointmentDate(apt.appointmentDate)} | ⏰{' '}
                                {apt.slot?.startTime} &ndash; {apt.slot?.endTime}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<span>📲</span>}
                                onClick={() => handleOpenQRModal(apt.id)}
                                className="w-full"
                              >
                                QR Pass
                              </Button>
                              <Link to={`/queue/${apt.doctorId}`} className="w-full">
                                <Button variant="secondary" size="sm" className="w-full">
                                  Live Queue
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ================================================================= */}
        {/* 4. LIVE QUEUE STATUS & OPD MONITORING                             */}
        {/* ================================================================= */}
        <section aria-labelledby="live-queue-status-heading">
          <Card className="border border-slate-200/90 shadow-xs">
            <CardHeader className="bg-gradient-to-r from-purple-50/50 via-sky-50/30 to-white border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl shrink-0">
                    ⏱️
                  </div>
                  <div>
                    <h2
                      id="live-queue-status-heading"
                      className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                    >
                      Hospital OPD Live Queue Status
                    </h2>
                    <p className="text-xs text-slate-500">
                      Real-time Socket.IO synchronization with hospital reception &amp; doctor consultation cabins
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="purple" size="sm" dot dotPulse>
                    Socket.IO Active
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {loadingQueue ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Synchronizing with live OPD queue...
                </div>
              ) : liveQueueData ? (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {liveQueueData.doctor?.name || 'Attending Physician'}
                        </span>
                        <Badge variant="purple" size="xs">
                          {liveQueueData.doctor?.specialization || 'Specialist'}
                        </Badge>
                        <Badge variant="neutral" size="xs">
                          Room: {liveQueueData.doctor?.roomNumber || 'OPD Suite'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        {liveQueueData.currentConsultation ? (
                          <>
                            Currently in Cabin:{' '}
                            <strong className="text-purple-900">
                              Token {liveQueueData.currentConsultation.appointmentNumber}
                            </strong>
                          </>
                        ) : (
                          'Doctor is currently between patients or cabin is ready.'
                        )}
                      </p>
                      {myQueueEntry && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                          <span>🎫</span>
                          <span>Your Token: <strong>#{myQueueEntry.appointmentNumber}</strong> &bull; Position: <strong>#{myQueueEntry.queuePosition}</strong></span>
                        </div>
                      )}
                    </div>

                    <Link to={`/queue/${liveQueueData.doctor?.id || nextAppointment?.doctorId}`}>
                      <Button variant="purple" size="sm" icon={<span>📺</span>}>
                        Open Waiting-Room OPD Screen
                      </Button>
                    </Link>
                  </div>

                  {/* Queue Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {myQueueEntry ? 'Your Queue Position' : 'Patients Waiting'}
                      </p>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        {myQueueEntry ? `#${myQueueEntry.queuePosition}` : (liveQueueData.checkedInQueue?.length || 0)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {myQueueEntry
                          ? myQueueEntry.queuePosition === 1
                            ? 'You are next in line!'
                            : `${myQueueEntry.queuePosition - 1} patient(s) ahead`
                          : 'Checked in at reception'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {myQueueEntry ? 'Your Est. Wait' : 'Est. Wait Velocity'}
                      </p>
                      <p className="text-xl sm:text-2xl font-black text-indigo-700 mt-0.5">
                        {myQueueEntry
                          ? myQueueEntry.formattedWait
                          : liveQueueData.checkedInQueue?.length
                          ? `~${liveQueueData.checkedInQueue[liveQueueData.checkedInQueue.length - 1].estimatedWaitMinutes} mins`
                          : '~5 mins'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {myQueueEntry ? 'Dynamic queue + doctor presence' : 'Based on clinical pace'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Visits Completed Today
                      </p>
                      <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                        {liveQueueData.completedCount || 0}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Consultations completed</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" size="xs">
                        OPD Queue Standby
                      </Badge>
                      <span className="text-xs text-slate-500">Live reception monitoring ready</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Digital Queue Token Activation
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      On the day of your consultation, scanning your touchless QR pass at any hospital entrance kiosk will activate your live queue token. Your real-time position and estimated wait time will stream directly here.
                    </p>
                  </div>

                  <Link to="/doctors" className="shrink-0">
                    <Button variant="outline" size="sm" icon={<span>🩺</span>}>
                      Browse Doctor OPD Queues
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ================================================================= */}
        {/* 5. QUICK ACTIONS HUB                                              */}
        {/* ================================================================= */}
        <section aria-labelledby="quick-actions-heading">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                id="quick-actions-heading"
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
              >
                Quick Actions
              </h2>
              <span className="text-xs text-slate-400">Frequently accessed patient features</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Action 1: Book Consultation */}
              <Link
                to="/book"
                className="group p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-[#0072CE] hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0072CE] group-hover:bg-[#0072CE] group-hover:text-white flex items-center justify-center text-xl transition">
                    📅
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0072CE] transition">
                    Book Consultation
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select a specialist, available date, and confirmed time slot.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#0072CE] mt-3 inline-flex items-center gap-1">
                  Book now &rarr;
                </span>
              </Link>

              {/* Action 2: AI Health Navigation */}
              <Link
                to="/find-specialist"
                className="group p-4 bg-gradient-to-br from-white to-blue-50/40 rounded-2xl border border-blue-200 hover:border-[#0072CE] hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#0072CE] group-hover:bg-[#0072CE] group-hover:text-white flex items-center justify-center text-xl transition">
                    🧭
                  </div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0072CE] transition">
                      Find Specialist
                    </h3>
                    <Badge variant="primary" size="xs">
                      AI
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Describe symptoms to discover the right medical department.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#0072CE] mt-3 inline-flex items-center gap-1">
                  Ask AI &rarr;
                </span>
              </Link>

              {/* Action 3: My Appointments & QR Passes */}
              <Link
                to="/my-appointments"
                className="group p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-[#0072CE] hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-xl transition">
                    📲
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0072CE] transition">
                    My Appointments
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    View complete visit history, reschedule, or print QR passes.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-[#0072CE] mt-3 inline-flex items-center gap-1">
                  View passes &rarr;
                </span>
              </Link>

              {/* Action 4: Smart Waitlist Standby */}
              <Link
                to="/waitlist"
                className="group p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-amber-400 hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center text-xl transition">
                    ⏳
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition">
                    Smart Waitlist
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Join standby queues for fully booked physicians to get auto-allocated slots.
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-700 mt-3 inline-flex items-center gap-1">
                  Check waitlist &rarr;
                </span>
              </Link>

              {/* Action 5: Specialists Directory */}
              <Link
                to="/doctors"
                className="group p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-purple-400 hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center text-xl transition">
                    🩺
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-800 transition">
                    Doctors Directory
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Browse all verified hospital specialists, experience, and schedules.
                  </p>
                </div>
                <span className="text-xs font-bold text-purple-700 mt-3 inline-flex items-center gap-1">
                  Browse doctors &rarr;
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 6. AI HEALTHCARE INSIGHTS & SMART RECOMMENDATIONS                  */}
        {/* ================================================================= */}
        <section aria-labelledby="ai-insights-heading">
          {/* AI Health Navigation Assistant Banner */}
          <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-white rounded-3xl p-6 sm:p-7 border border-blue-200/90 shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0072CE] bg-blue-100/70 px-2.5 py-0.5 rounded-full border border-blue-200">
                <span>🧭</span>
                <span>AI Health Navigation Assistant</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Not sure which medical specialist you need to see?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Describe your symptoms in plain English. MediFlow AI matches your signs with the appropriate medical department and connects you directly with matching hospital specialists.
              </p>
            </div>

            <Link to="/find-specialist" className="shrink-0 w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                icon={<span>🧭</span>}
                className="w-full sm:w-auto shadow-xs"
              >
                Ask MediFlow AI &rarr;
              </Button>
            </Link>
          </div>

          {/* Smart AI Slot Recommendations Card */}
          <Card className="overflow-hidden border border-slate-200/90 shadow-xs">
            <CardHeader className="bg-gradient-to-r from-indigo-50/40 via-purple-50/30 to-white border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl shrink-0">
                    ✨
                  </div>
                  <div>
                    <h2
                      id="ai-insights-heading"
                      className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                    >
                      Smart AI Slot Recommendations
                    </h2>
                    <p className="text-xs text-slate-500">
                      Predictive operational scheduling based on doctor availability probability and intake velocity
                    </p>
                  </div>
                </div>

                <Link to="/book" className="shrink-0">
                  <Button variant="ghost" size="sm">
                    View All Doctor Slots ➔
                  </Button>
                </Link>
              </div>

              {/* Crucial Medical Ethics & Non-Diagnostic Advisory Banner */}
              <div className="mt-3.5 p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-950">
                <span className="shrink-0 text-base" aria-hidden="true">
                  ℹ️
                </span>
                <span className="leading-relaxed">
                  <strong>Operational Guidance Notice:</strong> Slot scores and queue estimates are AI-assisted administrative insights based on historical hospital patterns and doctor presence. They do not constitute medical diagnoses or prescriptions. Official confirmations occur atomically at booking.
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {loading ? (
                <LoadingSkeleton variant="card" count={4} />
              ) : recommendedSlots.length === 0 ? (
                <EmptyState
                  icon="🤖"
                  title="No AI Slot Recommendations Available"
                  description="We currently lack sufficient prospective scheduling data to recommend specialized slots. You can browse all verified specialists in the hospital directory."
                  action={
                    <Link to="/doctors">
                      <Button variant="primary" size="sm">
                        Browse Doctors Directory
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recommendedSlots.map((rec, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 hover:border-[#0072CE] rounded-2xl p-4.5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Badge variant="purple" size="xs">
                            ⭐ Score: {rec.aiScore}/100
                          </Badge>
                          <Badge variant="success" size="xs">
                            {Math.round(rec.availabilityProbability * 100)}% Certainty
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#0072CE] transition">
                            {rec.doctorName}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500">
                            {rec.specialization} &bull; {rec.department}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 text-slate-700 border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Date:</span>
                            <span className="font-bold font-mono">
                              {rec.date} ({rec.dayOfWeek?.slice(0, 3)})
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Slot Time:</span>
                            <span className="font-bold font-mono">
                              {rec.startTime} &ndash; {rec.endTime}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-indigo-900">
                            <span className="text-slate-500">Est. Intake:</span>
                            <span className="font-bold">
                              ~{rec.estimatedWaitMinutes} mins (Pos #{rec.queuePosition})
                            </span>
                          </div>
                        </div>

                        {rec.recommendationReason && (
                          <p className="text-[11px] text-slate-500 italic leading-snug">
                            &ldquo;{rec.recommendationReason}&rdquo;
                          </p>
                        )}
                      </div>

                      <Link
                        to={`/book?doctorId=${rec.doctorId}&date=${rec.date}`}
                        className="w-full"
                      >
                        <Button variant="primary" size="sm" className="w-full">
                          Select This Slot ➔
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ================================================================= */}
        {/* 7. PATIENT CLINICAL PROFILE & WAITLIST OVERVIEW                   */}
        {/* ================================================================= */}
        <section aria-label="Clinical Profile and Waitlist Details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Clinical Health Record Summary */}
            <Card className="p-5 sm:p-6 lg:col-span-1 space-y-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="text-xl">🩺</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Clinical Patient Profile
                  </h3>
                  <p className="text-[11px] text-slate-500">Registered health records</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Blood Group:</span>
                  <span className="font-bold text-[#0072CE]">
                    {profile?.bloodGroup || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Biological Gender:</span>
                  <span className="font-semibold text-slate-900">
                    {profile?.gender || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Emergency Contact:</span>
                  <span className="font-semibold text-rose-600">
                    {profile?.emergencyContact || 'None on file'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Registered Email:</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[170px]">
                    {user?.email}
                  </span>
                </div>
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">Medical Record Notes:</span>
                  <p className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 leading-relaxed border border-slate-100">
                    {profile?.medicalHistory || 'No historical surgical or allergy flags logged.'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Badge variant="success" size="xs" dot>
                  Verified Hospital Identity
                </Badge>
              </div>
            </Card>

            {/* Smart Waitlist Standby Monitor */}
            <Card className="lg:col-span-2 border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⏳</span>
                      <div>
                        <CardTitle>Smart Waitlist Standby</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Automated triage monitoring for freed appointment cancellations
                        </p>
                      </div>
                    </div>

                    <Link to="/waitlist">
                      <Button variant="ghost" size="sm">
                        Manage Waitlist ➔
                      </Button>
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="p-5 sm:p-6">
                  {loading ? (
                    <ListSkeleton count={2} />
                  ) : activeWaitlists.length === 0 ? (
                    <EmptyState
                      icon="⏳"
                      title="No Active Waitlist Entries"
                      description="When a specialist is fully booked, you can join their smart waitlist. MediFlow AI will automatically allocate slots to you when cancellations occur."
                      action={
                        <Link to="/waitlist">
                          <Button variant="amber" size="sm">
                            Explore Waitlist Options
                          </Button>
                        </Link>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {activeWaitlists.slice(0, 3).map((w) => (
                        <div
                          key={w.id}
                          className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">
                                {w.doctor?.user?.name || 'Consultant'}
                              </p>
                              <Badge variant="warning" size="xs">
                                Score: {w.priorityScore} pts
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              {w.doctor?.specialization} &bull; Preferred:{' '}
                              {formatAppointmentDate(w.preferredDate)}
                            </p>
                            <p className="text-[11px] text-amber-800 font-medium">
                              Priority Tier: {w.priority} &bull; Clinical Triage Active
                            </p>
                            {w.explanation?.formula && (
                              <p className="text-[10px] text-indigo-700 font-mono mt-0.5">
                                💡 Formula: {w.explanation.formula}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0">
                            <Link to="/waitlist">
                              <Button variant="outline" size="sm">
                                View Position
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
                <span>Want to see all your past visits?</span>
                <Link to="/my-appointments" className="font-bold text-[#0072CE] hover:underline">
                  Full Appointment History &rarr;
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* ================================================================= */}
      {/* MODAL 1: CHECK-IN QR CODE PASS                                    */}
      {/* ================================================================= */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Digital Check-In QR Pass"
        maxWidth="max-w-md"
      >
        {qrLoading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Generating secure touchless pass...</p>
          </div>
        ) : qrError ? (
          <div className="py-6 text-center space-y-3">
            <span className="text-3xl block">⚠️</span>
            <p className="text-xs font-semibold text-rose-600">{qrError}</p>
            <Button variant="outline" size="sm" onClick={() => setQrModalOpen(false)}>
              Close
            </Button>
          </div>
        ) : qrData ? (
          <div className="text-center space-y-4 py-2">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-2xs">
              <img
                src={qrData.qrDataUrl}
                alt="Touchless Arrival QR Code"
                className="w-48 h-48 mx-auto rounded-lg shadow-xs"
              />
            </div>

            <div>
              <span className="font-mono text-xs font-bold text-[#0072CE] bg-blue-50 px-3 py-1 rounded-md border border-blue-200 inline-block">
                {qrData.appointmentNumber}
              </span>
              <div className="mt-2">
                {qrData.status === 'CHECKED_IN' ? (
                  <Badge variant="success" size="sm" dot dotPulse>
                    Checked In at OPD &bull; Queue Active
                  </Badge>
                ) : (
                  <Badge variant="primary" size="sm" dot>
                    Ready for Touchless Check-In
                  </Badge>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-left space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Consultant:</span>
                <strong className="text-slate-900">{qrData.doctorName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cabin Suite:</span>
                <strong className="text-[#0072CE] font-bold">{qrData.cabin || 'OPD'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Schedule:</span>
                <span className="text-slate-800 font-mono font-medium">{qrData.slotTime}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              Present this pass at hospital reception kiosk or reception scanner upon arrival to receive your live queue number.
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.print()}
              >
                🖨️ Print Pass
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => setQrModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL 2: CANCEL APPOINTMENT CONFIRMATION DIALOG                   */}
      {/* ================================================================= */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        onClose={() => {
          if (!cancelling) {
            setCancelModalOpen(false);
            setApptToCancel(null);
          }
        }}
        onConfirm={handleConfirmCancel}
        title="Cancel This Consultation?"
        message={`Are you sure you want to cancel appointment ${apptToCancel?.appointmentNumber} with ${apptToCancel?.doctor?.user?.name || 'the physician'} on ${formatAppointmentDate(apptToCancel?.appointmentDate)}? If this slot has waitlisted patients, it will be automatically offered to them.`}
        confirmText="Yes, Cancel Visit"
        cancelText="Keep Appointment"
        variant="danger"
        isLoading={cancelling}
      />

      <footer className="text-center py-5 text-xs text-slate-400 bg-white border-t border-slate-200">
        MediFlow AI 2.0 &bull; Smart Hospital Appointment, Doctor Availability &amp; Queue Management Network
      </footer>
    </div>
  );
}

export default PatientDashboard;
