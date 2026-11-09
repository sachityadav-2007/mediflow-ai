import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getDoctorProfile,
  updateDoctorProfile,
  updateDoctorPresence,
  getDoctorPresence,
  updateDoctorSchedule,
  updateAppointmentStatus,
  getDoctorWaitlist,
  triggerSmartAllocation,
  getDoctorForecast,
  updateConsultationState,
  getDoctorMyAttendance,
  doctorCheckInQR,
  doctorCheckOutQR,
  getActiveHospitalQRCodes,
} from '../services/api';
import { useSocket } from '../hooks/useSocket';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

function DoctorDashboard() {
  const { user } = useAuth();
  const [doctorData, setDoctorData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [updatingApptId, setUpdatingApptId] = useState(null);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '10:30',
  });
  const [presenceLogs, setPresenceLogs] = useState([]);
  const [doctorForecast, setDoctorForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Presence state
  const [currentStatus, setCurrentStatus] = useState('OFFLINE');
  const [updatingPresence, setUpdatingPresence] = useState(false);

  // Smart Doctor Presence & Shift Terminal State
  const [attendanceData, setAttendanceData] = useState(null);
  const [activeQRGates, setActiveQRGates] = useState([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkInTab, setCheckInTab] = useState('demo'); // 'demo' | 'camera' | 'manual'
  const [manualToken, setManualToken] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [submittingCheckOut, setSubmittingCheckOut] = useState(false);
  const [cameraScannerActive, setCameraScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  // Profile Edit Modal State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    specialization: '',
    department: '',
    experience: '',
    qualification: '',
    consultationFee: '',
    consultationDuration: '',
    roomNumber: '',
  });

  // Schedule Edit State
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [consultationDuration, setConsultationDuration] = useState(30);

  // Fetch doctor data on mount
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getDoctorProfile();
      if (data && data.success && data.doctor) {
        const doc = data.doctor;
        setDoctorData(doc);
        setAppointments(doc.appointments || []);
        setCurrentStatus(doc.currentPresence || 'OFFLINE');
        setConsultationDuration(doc.consultationDuration || 30);

        // Populate profile form
        setProfileForm({
          name: doc.user.name || '',
          phone: doc.user.phone || '',
          specialization: doc.specialization || '',
          department: doc.department || '',
          experience: doc.experience || 0,
          qualification: doc.qualification || '',
          consultationFee: doc.consultationFee || 500,
          consultationDuration: doc.consultationDuration || 30,
          roomNumber: doc.roomNumber || '',
        });

        // Initialize schedules for all 7 days
        const existingSchedules = doc.availabilities || [];
        const fullSchedule = DAYS_OF_WEEK.map((day) => {
          const found = existingSchedules.find((s) => s.dayOfWeek === day);
          return {
            dayOfWeek: day,
            startTime: found ? found.startTime : '09:00',
            endTime: found ? found.endTime : '17:00',
            isAvailable: found ? found.isAvailable : false,
          };
        });
        setSchedules(fullSchedule);

        // Fetch presence logs
        const presenceData = await getDoctorPresence(doc.id);
        if (presenceData && presenceData.success) {
          setPresenceLogs(presenceData.data.history || []);
        }

        // Fetch waitlist queue
        try {
          const waitlistData = await getDoctorWaitlist();
          if (waitlistData?.success) {
            setWaitlistEntries(waitlistData.waitlist || []);
          }
        } catch (wErr) {
          console.warn('Waitlist fetch warning:', wErr);
        }

        // Fetch AI doctor forecast (Phase 10)
        try {
          const aiData = await getDoctorForecast(doc.id);
          if (aiData?.success) {
            setDoctorForecast(aiData);
          }
        } catch (aiErr) {
          console.warn('AI forecast fetch notice:', aiErr.message);
        }
      }
    } catch (err) {
      console.error('Failed to load doctor dashboard:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load dashboard data.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    fetchAttendanceStatus();
  }, []);

  // Fetch doctor attendance status & active hospital QR gates
  const fetchAttendanceStatus = async () => {
    try {
      const [attRes, qrRes] = await Promise.all([
        getDoctorMyAttendance().catch(() => null),
        getActiveHospitalQRCodes().catch(() => null),
      ]);
      if (attRes?.success) {
        setAttendanceData(attRes);
        if (attRes.doctor?.currentPresence) {
          setCurrentStatus(attRes.doctor.currentPresence);
        }
      }
      if (qrRes?.success && qrRes.qrCodes) {
        setActiveQRGates(qrRes.qrCodes);
      }
    } catch (err) {
      console.warn('Attendance synchronization notice:', err.message);
    }
  };

  // Real-time Socket.IO listeners
  useSocket('doctor_status_changed', (data) => {
    if (!doctorData?.id || data?.doctorId === doctorData.id) {
      fetchAttendanceStatus();
      loadDashboardData();
    }
  });

  useSocket('doctor_attendance_updated', (data) => {
    if (!doctorData?.id || data?.doctorId === doctorData.id) {
      fetchAttendanceStatus();
      loadDashboardData();
    }
  });

  useSocket('hospital_qr_created', () => {
    fetchAttendanceStatus();
  });

  useSocket('hospital_qr_revoked', () => {
    fetchAttendanceStatus();
  });

  useSocket('appointment_created', (data) => {
    if (!data?.doctorId || data.doctorId === doctorData?.id) {
      loadDashboardData();
    }
  });

  useSocket('appointment_cancelled', (data) => {
    if (!data?.doctorId || data.doctorId === doctorData?.id) {
      loadDashboardData();
    }
  });

  useSocket('waitlist_updated', (data) => {
    if (!data?.doctorId || data.doctorId === doctorData?.id) {
      loadDashboardData();
    }
  });

  useSocket('appointment_allocated', (data) => {
    if (!data?.doctorId || data.doctorId === doctorData?.id) {
      loadDashboardData();
    }
  });

  useSocket('appointment_rescheduled', (data) => {
    if (!data?.doctorId || data.doctorId === doctorData?.id) {
      loadDashboardData();
    }
  });

  useSocket('ai_forecast_updated', (data) => {
    if (!data?.doctorId || data.doctorId === doctorData?.id) {
      loadDashboardData();
    }
  });

  // Manage camera QR scanner lifecycle
  useEffect(() => {
    if (!showCheckInModal || checkInTab !== 'camera' || !cameraScannerActive) {
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
      'doctor-dashboard-qr-scanner',
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
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
        await handleCheckInSubmit(decodedText);
      },
      (err) => {
        // frame drop
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
  }, [showCheckInModal, checkInTab, cameraScannerActive]);

  // Doctor QR Check-In Action
  const handleCheckInSubmit = async (token) => {
    if (!token || !token.trim()) {
      setActionMessage({
        type: 'error',
        text: 'Please select an active hospital QR gate or provide a valid signed token.',
      });
      return;
    }
    setSubmittingCheckIn(true);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await doctorCheckInQR({ token: token.trim() });
      if (res && res.success) {
        setActionMessage({
          type: 'success',
          text: `Check-in verified! Welcome Dr. ${doctorData?.user?.name || ''}. Your status is now marked PRESENT.`,
        });
        setShowCheckInModal(false);
        setManualToken('');
        setCameraScannerActive(false);
        await Promise.all([fetchAttendanceStatus(), loadDashboardData()]);
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text:
          err.response?.data?.message ||
          err.message ||
          'Check-in failed. Please verify that the hospital QR code is active and not expired.',
      });
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  // Doctor Shift Check-Out Action
  const handleCheckOutSubmit = async () => {
    setSubmittingCheckOut(true);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await doctorCheckOutQR(checkoutNotes);
      if (res && res.success) {
        setActionMessage({
          type: 'success',
          text: `Check-out successful! Shift duration: ${res.durationMinutes || 0} minute(s). Status set to OFFLINE (Off Duty).`,
        });
        setShowCheckOutModal(false);
        setCheckoutNotes('');
        await Promise.all([fetchAttendanceStatus(), loadDashboardData()]);
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Check-out failed.',
      });
    } finally {
      setSubmittingCheckOut(false);
    }
  };

  // Quick Presence Status Update Handler
  const handlePresenceChange = async (newStatus) => {
    if (newStatus === currentStatus) return;
    setUpdatingPresence(true);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await updateDoctorPresence(
        newStatus,
        `Status set to ${newStatus} from Doctor Dashboard`
      );
      if (res && res.success) {
        setCurrentStatus(newStatus);
        setActionMessage({
          type: 'success',
          text: `Presence status updated to ${newStatus}.`,
        });

        // Refresh presence history
        if (doctorData) {
          const historyRes = await getDoctorPresence(doctorData.id);
          if (historyRes?.success) {
            setPresenceLogs(historyRes.data.history || []);
          }
        }
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update presence.',
      });
    } finally {
      setUpdatingPresence(false);
    }
  };

  // Status Change Handler for Appointments
  const handleStatusChange = async (apptId, newStatus) => {
    setUpdatingApptId(apptId);
    setActionMessage({ type: '', text: '' });
    try {
      const res = await updateAppointmentStatus(apptId, newStatus);
      if (res && res.success) {
        setActionMessage({
          type: 'success',
          text: `Appointment status updated to ${newStatus}.`,
        });
        setAppointments((prev) =>
          prev.map((a) => (a.id === apptId ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update appointment status.',
      });
    } finally {
      setUpdatingApptId(null);
    }
  };

  // Consultation Lifecycle Action (START, COMPLETE, NO_SHOW)
  const handleConsultationAction = async (apptId, action) => {
    setUpdatingApptId(apptId);
    setActionMessage({ type: '', text: '' });
    try {
      const res = await updateConsultationState(apptId, action);
      if (res && res.success) {
        const nextStatus =
          action === 'START'
            ? 'IN_PROGRESS'
            : action === 'COMPLETE'
            ? 'COMPLETED'
            : 'NO_SHOW';
        setActionMessage({
          type: 'success',
          text: `Consultation marked as ${nextStatus}. OPD live queue updated.`,
        });
        setAppointments((prev) =>
          prev.map((a) => (a.id === apptId ? { ...a, status: nextStatus } : a))
        );
        if (action === 'START') setCurrentStatus('IN_CONSULTATION');
        if (action === 'COMPLETE') setCurrentStatus('AVAILABLE');
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update consultation state.',
      });
    } finally {
      setUpdatingApptId(null);
    }
  };

  // Smart Allocation Handler (Phase 6)
  const handleRunAllocation = async (e) => {
    e.preventDefault();
    if (!doctorData?.id) return;
    setIsAllocating(true);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await triggerSmartAllocation({
        doctorId: doctorData.id,
        appointmentDate: allocationForm.appointmentDate,
        startTime: allocationForm.startTime,
        endTime: allocationForm.endTime || '10:30',
      });

      if (res?.success) {
        if (res.allocated) {
          setActionMessage({
            type: 'success',
            text: `Slot successfully allocated to highest-priority patient: ${res.selectedPatient.name} (Priority Score: ${res.priorityScore} pts)!`,
          });
          setShowAllocateModal(false);
          loadDashboardData();
        } else {
          setActionMessage({
            type: 'warning',
            text: res.message || 'No eligible waitlist candidates found for this slot.',
          });
        }
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Smart allocation failed.',
      });
    } finally {
      setIsAllocating(false);
    }
  };

  // Profile Update Handler
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setActionMessage({ type: '', text: '' });
    try {
      const res = await updateDoctorProfile(profileForm);
      if (res && res.success) {
        setDoctorData(res.doctor);
        setIsEditingProfile(false);
        setActionMessage({
          type: 'success',
          text: 'Profile updated successfully.',
        });
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.',
      });
    }
  };

  // Schedule Update Handler
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setActionMessage({ type: '', text: '' });
    const activeSchedules = schedules.filter((s) => s.isAvailable);

    try {
      const res = await updateDoctorSchedule({
        schedules: activeSchedules,
        consultationDuration: parseInt(consultationDuration, 10),
      });

      if (res && res.success) {
        setIsEditingSchedule(false);
        setActionMessage({
          type: 'success',
          text: 'Working schedule & consultation duration saved successfully.',
        });
        loadDashboardData();
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save schedule.',
      });
    }
  };

  const checkedInCount = appointments.filter((a) => a.status === 'CHECKED_IN').length;
  const inProgressCount = appointments.filter((a) => a.status === 'IN_PROGRESS').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <Navbar />
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <LoadingSkeleton variant="card" count={4} />
          <div className="mt-8">
            <LoadingSkeleton variant="table" rows={6} cols={5} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        {/* Banner Alert Messages */}
        {actionMessage.text && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between shadow-2xs ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : actionMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span className="font-semibold">{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage({ type: '', text: '' })}
              className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Doctor Header & Actions */}
        <PageHeader
          title={`Dr. ${doctorData?.user?.name || user?.name || 'Doctor'}`}
          subtitle={`${doctorData?.specialization || 'Specialist'} • ${
            doctorData?.department || 'Department'
          } • Room ${doctorData?.roomNumber || 'OPD Cabin'} • Experience: ${
            doctorData?.experience || 0
          } Years`}
          badge={
            <Badge
              variant={
                currentStatus === 'PRESENT' || currentStatus === 'AVAILABLE'
                  ? 'success'
                  : currentStatus === 'IN_CONSULTATION' || currentStatus === 'BUSY'
                  ? 'warning'
                  : currentStatus === 'AWAY'
                  ? 'indigo'
                  : 'neutral'
              }
              size="sm"
              dot
              dotPulse={currentStatus === 'IN_CONSULTATION'}
            >
              {currentStatus}
            </Badge>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Link to="/doctor/attendance">
                <Button variant="success" size="sm" icon={<span>📷</span>}>
                  My Attendance &amp; Shift
                </Button>
              </Link>
              {doctorData?.id && (
                <a
                  href={`/queue/${doctorData.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" icon={<span>📺</span>}>
                    Live Queue Board ↗
                  </Button>
                </a>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
                icon={<span>✏️</span>}
              >
                Edit Profile
              </Button>
            </div>
          }
        />

        {/* Clinical Operations KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="Total Scheduled"
            value={appointments.length}
            subtitle="Today's registered consultations"
            icon="📅"
            iconBg="bg-blue-50 text-[#0072CE]"
          />

          <StatCard
            title="Checked In (At Clinic)"
            value={checkedInCount}
            subtitle="Patients waiting in waiting room"
            icon="🚶"
            iconBg="bg-amber-50 text-amber-700"
            badge={
              checkedInCount > 0 ? (
                <Badge variant="warning" size="xs">
                  Ready
                </Badge>
              ) : null
            }
          />

          <StatCard
            title="In Consultation"
            value={inProgressCount}
            subtitle="Currently inside doctor cabin"
            icon="🩺"
            iconBg="bg-purple-50 text-purple-700"
            badge={
              inProgressCount > 0 ? (
                <Badge variant="purple" size="xs" dot dotPulse>
                  Active
                </Badge>
              ) : null
            }
          />

          <StatCard
            title="Completed Visits"
            value={completedCount}
            subtitle="Concluded consultations today"
            icon="✅"
            iconBg="bg-emerald-50 text-emerald-700"
          />
        </div>

        {/* ============================================================= */}
        {/* SMART DOCTOR PRESENCE & SHIFT TERMINAL                        */}
        {/* ============================================================= */}
        <Card className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏥</span>
                <CardTitle>Smart Doctor Presence &amp; Shift Terminal</CardTitle>
                <Badge
                  variant={
                    attendanceData?.isCheckedIn || currentStatus === 'PRESENT' || currentStatus === 'AVAILABLE'
                      ? 'success'
                      : currentStatus === 'IN_CONSULTATION' || currentStatus === 'BUSY'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="xs"
                  dot
                  dotPulse={attendanceData?.isCheckedIn}
                >
                  {attendanceData?.isCheckedIn ? 'Shift Active: Present' : 'Shift Inactive: Off Duty'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Hospital QR attendance, real-time presence synchronization, and outpatient duty tracking.
              </p>
            </div>

            {/* Shift Action Buttons */}
            <div className="flex items-center gap-2.5">
              {attendanceData?.isCheckedIn ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowCheckOutModal(true)}
                  disabled={submittingCheckOut}
                  icon={<span>🚪</span>}
                >
                  Check Out of Hospital
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setShowCheckInModal(true);
                    setCheckInTab('demo');
                  }}
                  icon={<span>📷</span>}
                >
                  Check In via Hospital QR
                </Button>
              )}
            </div>
          </div>

          {/* Attendance Session Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: Status & Doctor Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-2xs ${
                  attendanceData?.isCheckedIn
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              >
                {attendanceData?.isCheckedIn ? '👨‍⚕️' : '🚪'}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Current Presence
                </span>
                <strong className="text-sm font-black text-slate-900 block">
                  {attendanceData?.isCheckedIn ? 'PRESENT / AVAILABLE' : 'OFF DUTY / UNAVAILABLE'}
                </strong>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                  Dr. {doctorData?.user?.name || user?.name} &bull; Room {doctorData?.roomNumber || 'Cabin'}
                </p>
              </div>
            </div>

            {/* Box 2: Check-In Location & Timestamp */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Arrival &amp; Shift Gate
              </span>
              {attendanceData?.isCheckedIn && attendanceData?.activeSession ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span>📍</span>
                    <span className="truncate">{attendanceData.activeSession.location}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Checked in at{' '}
                    <strong>
                      {new Date(attendanceData.activeSession.checkInTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>{' '}
                    &bull; QR Verified
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Not checked in. Please scan hospital QR upon arrival to accept consultations.
                </p>
              )}
            </div>

            {/* Box 3: Daily Working Hours */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Today&apos;s Clinical Duty Log
              </span>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xl font-black text-[#0072CE] font-mono">
                    {Math.floor((attendanceData?.totalMinutesToday || 0) / 60)}h{' '}
                    {(attendanceData?.totalMinutesToday || 0) % 60}m
                  </span>
                  <span className="text-[11px] text-slate-500 block font-medium">Logged hours today</span>
                </div>
                <Badge variant={attendanceData?.isCheckedIn ? 'success' : 'neutral'} size="xs">
                  {attendanceData?.todaySessions?.length || 0} Shift(s)
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Clinic Presence State Controller */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700">
                Quick Presence Mode Toggle:
              </span>
              <span className="text-[11px] text-slate-400">
                Synchronizes live presence across hospital directory &amp; appointment engine
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                disabled={updatingPresence}
                onClick={() => handlePresenceChange('PRESENT')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  currentStatus === 'PRESENT' || currentStatus === 'AVAILABLE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                🟢 AVAILABLE
              </button>

              <button
                type="button"
                disabled={updatingPresence}
                onClick={() => handlePresenceChange('BUSY')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  currentStatus === 'BUSY' || currentStatus === 'IN_CONSULTATION'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                🟡 IN CONSULTATION
              </button>

              <button
                type="button"
                disabled={updatingPresence}
                onClick={() => handlePresenceChange('AWAY')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  currentStatus === 'AWAY'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                ⏸️ AWAY (Break)
              </button>

              <button
                type="button"
                disabled={updatingPresence}
                onClick={() => handlePresenceChange('OFFLINE')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  currentStatus === 'OFFLINE'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                ⚪ OFFLINE (Shift End)
              </button>
            </div>
          </div>
        </Card>

        {/* Phase 10: AI Predictive Demand & Schedule Insights */}
        {doctorForecast && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-blue-50/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🧠</span>
                    <CardTitle>AI Demand Forecasting &amp; Workload Insights</CardTitle>
                    <Badge variant="indigo" size="xs">
                      Advisory ML
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Predictive outpatient workload modeling and historical attendance metrics based on clinical records.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-slate-600">
                    Expected Attendance: <strong className="text-emerald-700 font-bold">{Math.round((doctorForecast.todayAvailability?.probability || 0.9) * 100)}%</strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">
                    Pace: <strong className="text-indigo-900 font-bold">{doctorData?.consultationDuration || 20} min/visit</strong>
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>📅 Next 7 Days Projected Patient Volume</span>
                    <span className="text-[#0072CE]">
                      Total: {doctorForecast.sevenDayForecast?.expectedTotalVolume || 0} visits
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {doctorForecast.sevenDayForecast?.dailyForecast?.map((day, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-[11px]"
                      >
                        <div className="font-bold text-slate-600">{day.dayOfWeek.slice(0, 3)}</div>
                        <div className="text-xs font-black text-indigo-700 mt-1">
                          {day.expectedDemand}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-700">⏰ High-Demand Consultation Slots</div>
                  <p className="text-[11px] text-slate-500">
                    Identified rush slots with highest probability of clinical queue buildup:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {doctorForecast.slotDemandPatterns?.peakSlots?.map((slot, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-bold text-xs"
                      >
                        🔥 {slot}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 italic pt-1">
                    Tip: Allow slight buffer time following peak slots to maintain zero waiting room delays.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scheduled Appointments Table with Lifecycle Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>
                  <span>📅</span>
                  <span>Scheduled Outpatient Consultations</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time patient queue with consultation lifecycle state triggers (Call In &amp; Complete).
                </p>
              </div>
              <Badge variant="primary" size="sm">
                Total Booked: {appointments.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {appointments.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon="📅"
                  title="No Appointments Scheduled"
                  description="There are no patients booked under your care for today's session."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Token / ID</th>
                      <th className="py-3 px-4">Patient Details</th>
                      <th className="py-3 px-4">Slot Time</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4">Clinical Reason</th>
                      <th className="py-3 px-4">Consultation Lifecycle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0072CE]">
                          {apt.appointmentNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">
                            {apt.patient?.user?.name || 'Registered Patient'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {apt.patient?.user?.phone || 'No phone'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 font-semibold">
                          {apt.slot?.startTime} &ndash; {apt.slot?.endTime}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              apt.priority === 'EMERGENCY'
                                ? 'danger'
                                : apt.priority === 'HIGH'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="xs"
                          >
                            {apt.priority}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              apt.status === 'COMPLETED'
                                ? 'success'
                                : apt.status === 'IN_PROGRESS'
                                ? 'purple'
                                : apt.status === 'CHECKED_IN'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="xs"
                            dotPulse={apt.status === 'IN_PROGRESS'}
                          >
                            {apt.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={apt.reason}>
                          {apt.reason || 'General medical consultation'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={apt.status}
                              disabled={updatingApptId === apt.id}
                              onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[#0072CE]/40 outline-none cursor-pointer"
                            >
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="CHECKED_IN">CHECKED_IN</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                              <option value="NO_SHOW">NO_SHOW</option>
                            </select>

                            {/* Quick Consultation Lifecycle Buttons */}
                            {apt.status === 'CHECKED_IN' && (
                              <Button
                                variant="purple"
                                size="sm"
                                onClick={() => handleConsultationAction(apt.id, 'START')}
                                disabled={updatingApptId === apt.id}
                                title="Call patient into cabin and start consultation"
                              >
                                ▶️ Call In
                              </Button>
                            )}
                            {apt.status === 'IN_PROGRESS' && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleConsultationAction(apt.id, 'COMPLETE')}
                                disabled={updatingApptId === apt.id}
                                title="Complete consultation and free cabin"
                              >
                                ✅ Complete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Smart Waitlist Queue Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏳</span>
                  <CardTitle>Smart Standby Waitlist Queue</CardTitle>
                  <Badge variant="indigo" size="xs">
                    Rule-Based Priority Triage
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Patients ranked deterministically by Medical Urgency, Standby Duration, and Clinical Priority.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAllocateModal(true)}
                icon={<span>⚡</span>}
              >
                Demonstrate Smart Allocation
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {waitlistEntries.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon="⏳"
                  title="No Waitlisted Patients"
                  description="There are currently no standby patients waiting for open slots under your care."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Priority Score</th>
                      <th className="py-3 px-4">Severity Tier</th>
                      <th className="py-3 px-4">Clinical Urgency</th>
                      <th className="py-3 px-4">Joined Timestamp</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {waitlistEntries.map((entry, idx) => {
                      const score = entry.currentScore || entry.priorityScore || 0;
                      const isPending = entry.status === 'PENDING';

                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-slate-50 transition ${
                            entry.status === 'ALLOCATED' ? 'bg-emerald-50/30' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                            {isPending ? `#${idx + 1}` : '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">
                              {entry.patient?.user?.name || 'Waitlisted Patient'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {entry.patient?.user?.phone || 'No phone'}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-indigo-700 text-xs bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                              {score} pts
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                entry.priority === 'EMERGENCY'
                                  ? 'danger'
                                  : entry.priority === 'HIGH'
                                  ? 'warning'
                                  : 'neutral'
                              }
                              size="xs"
                            >
                              {entry.priority}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                entry.urgency === 'EMERGENCY'
                                  ? 'danger'
                                  : entry.urgency === 'HIGH'
                                  ? 'warning'
                                  : 'neutral'
                              }
                              size="xs"
                            >
                              {entry.urgency}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {new Date(entry.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                entry.status === 'ALLOCATED'
                                  ? 'success'
                                  : entry.status === 'PENDING'
                                  ? 'warning'
                                  : 'neutral'
                              }
                              size="xs"
                            >
                              {entry.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2-Column Section: Schedule & Presence History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Working Schedule Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Working Schedule</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consultation Duration: <strong>{doctorData?.consultationDuration || 30} mins</strong>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingSchedule(!isEditingSchedule)}
                >
                  {isEditingSchedule ? 'Cancel' : '⚙️ Configure'}
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {isEditingSchedule ? (
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Consultation Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      step={5}
                      value={consultationDuration}
                      onChange={(e) => setConsultationDuration(e.target.value)}
                      className="w-36 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {schedules.map((item, idx) => (
                      <div
                        key={item.dayOfWeek}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                          item.isAvailable
                            ? 'bg-blue-50/40 border-blue-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <label className="flex items-center gap-2 w-28 font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            onChange={(e) => {
                              const updated = [...schedules];
                              updated[idx].isAvailable = e.target.checked;
                              setSchedules(updated);
                            }}
                            className="rounded text-[#0072CE]"
                          />
                          {item.dayOfWeek.slice(0, 3)}
                        </label>

                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={item.startTime}
                            disabled={!item.isAvailable}
                            onChange={(e) => {
                              const updated = [...schedules];
                              updated[idx].startTime = e.target.value;
                              setSchedules(updated);
                            }}
                            className="px-2 py-1 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 text-xs"
                          />
                          <span className="text-slate-400">to</span>
                          <input
                            type="time"
                            value={item.endTime}
                            disabled={!item.isAvailable}
                            onChange={(e) => {
                              const updated = [...schedules];
                              updated[idx].endTime = e.target.value;
                              setSchedules(updated);
                            }}
                            className="px-2 py-1 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button type="submit" variant="primary" size="sm" className="w-full">
                    Save Working Schedule
                  </Button>
                </form>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {doctorData?.availabilities?.length === 0 ? (
                    <p className="text-slate-400 py-6 text-center">
                      No schedule configured yet. Click "Configure" above.
                    </p>
                  ) : (
                    doctorData?.availabilities?.map((slot) => (
                      <div
                        key={slot.id}
                        className="py-3 flex items-center justify-between text-slate-700"
                      >
                        <span className="font-bold text-slate-900 w-28">
                          {slot.dayOfWeek}
                        </span>
                        <span className="font-mono text-slate-600">
                          {slot.startTime} &ndash; {slot.endTime}
                        </span>
                        <Badge variant="success" size="xs">
                          Active Shift
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Presence History Audit Log */}
          <Card>
            <CardHeader>
              <CardTitle>Presence History Log</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological log of presence status transitions recorded in PresenceLog.
              </p>
            </CardHeader>

            <CardContent>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {presenceLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No presence transitions logged yet.
                  </p>
                ) : (
                  presenceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              log.status === 'PRESENT' || log.status === 'AVAILABLE'
                                ? 'success'
                                : log.status === 'BUSY'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="xs"
                          >
                            {log.status}
                          </Badge>
                          <span className="text-[11px] text-slate-400">
                            via {log.detectionMethod || 'MANUAL'}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-slate-600 text-[11px] mt-1">{log.notes}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono text-right">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Smart Allocation Modal */}
        <Modal
          isOpen={showAllocateModal}
          onClose={() => setShowAllocateModal(false)}
          title="Smart Allocation Engine"
          description="Specify an open consultation slot. The engine will evaluate the waitlist, pick the patient with the highest clinical score, and promote them."
        >
          <form onSubmit={handleRunAllocation} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Slot Date
              </label>
              <input
                type="date"
                required
                value={allocationForm.appointmentDate}
                onChange={(e) =>
                  setAllocationForm({
                    ...allocationForm,
                    appointmentDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={allocationForm.startTime}
                  onChange={(e) =>
                    setAllocationForm({
                      ...allocationForm,
                      startTime: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  required
                  value={allocationForm.endTime}
                  onChange={(e) =>
                    setAllocationForm({
                      ...allocationForm,
                      endTime: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllocateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isAllocating}
              >
                Execute Allocation
              </Button>
            </div>
          </form>
        </Modal>

        {/* Profile Edit Modal */}
        <Modal
          isOpen={isEditingProfile}
          onClose={() => setIsEditingProfile(false)}
          title="Edit Doctor Profile"
          description="Update your professional credentials, fees, and clinic details."
        >
          <form onSubmit={handleProfileSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Doctor Name
              </label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Room Number
                </label>
                <input
                  type="text"
                  value={profileForm.roomNumber}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, roomNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Specialization
                </label>
                <input
                  type="text"
                  value={profileForm.specialization}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      specialization: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={profileForm.department}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      department: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  value={profileForm.experience}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      experience: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Consultation Fee (₹)
                </label>
                <input
                  type="number"
                  value={profileForm.consultationFee}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      consultationFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Profile
              </Button>
            </div>
          </form>
        </Modal>

        {/* Doctor QR Check-In Modal */}
        <Modal
          isOpen={showCheckInModal}
          onClose={() => {
            setShowCheckInModal(false);
            setCameraScannerActive(false);
          }}
          title="Hospital Doctor QR Attendance Check-In"
          description="Verify your physical arrival at the hospital to unlock your OPD consultation queue and update live presence."
        >
          <div className="space-y-4 text-xs">
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setCheckInTab('demo');
                  setCameraScannerActive(false);
                }}
                className={`py-2 px-3 font-bold border-b-2 transition cursor-pointer text-xs ${
                  checkInTab === 'demo'
                    ? 'border-[#0072CE] text-[#0072CE]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                ⚡ 1-Click Verification (Demo / Viva)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckInTab('camera');
                  setCameraScannerActive(true);
                }}
                className={`py-2 px-3 font-bold border-b-2 transition cursor-pointer text-xs ${
                  checkInTab === 'camera'
                    ? 'border-[#0072CE] text-[#0072CE]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                📷 Camera Scanner
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckInTab('manual');
                  setCameraScannerActive(false);
                }}
                className={`py-2 px-3 font-bold border-b-2 transition cursor-pointer text-xs ${
                  checkInTab === 'manual'
                    ? 'border-[#0072CE] text-[#0072CE]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                ⌨️ Manual Token
              </button>
            </div>

            {/* TAB 1: 1-Click Demo / Active Hospital QR */}
            {checkInTab === 'demo' && (
              <div className="space-y-3.5 pt-1">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 leading-relaxed text-[11px]">
                  <strong>💡 Student Demonstration / Project Review:</strong> Click below to verify against an active hospital check-in gate without requiring a physical camera scan.
                </div>

                {activeQRGates.length > 0 ? (
                  activeQRGates.slice(0, 2).map((gate) => (
                    <div
                      key={gate.id}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {gate.qrDataUrl && (
                          <img
                            src={gate.qrDataUrl}
                            alt="Hospital QR Code"
                            className="w-16 h-16 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                          />
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{gate.location}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Code: {gate.code}</p>
                          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            ✓ Active Shift Gate &bull; Expires in {gate.validityMinutes}m
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={submittingCheckIn}
                        onClick={() => handleCheckInSubmit(gate.signedToken)}
                      >
                        {submittingCheckIn ? 'Verifying...' : '✓ Verify & Check In'}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No active hospital QR gates found. Loading active hospital gate...
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Camera Scanner */}
            {checkInTab === 'camera' && (
              <div className="space-y-3 pt-1">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <div id="doctor-dashboard-qr-scanner" className="w-full"></div>
                </div>
                {cameraError && (
                  <p className="text-xs text-rose-600 font-semibold text-center">{cameraError}</p>
                )}
                <p className="text-[11px] text-slate-400 text-center">
                  Align the hospital clinic check-in QR code in front of your camera.
                </p>
              </div>
            )}

            {/* TAB 3: Manual Token Input */}
            {checkInTab === 'manual' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCheckInSubmit(manualToken);
                }}
                className="space-y-3 pt-1"
              >
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Signed Hospital QR Token
                  </label>
                  <textarea
                    rows={3}
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste cryptographic hospital JWT token..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-[#0072CE] outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submittingCheckIn || !manualToken.trim()}
                  >
                    {submittingCheckIn ? 'Validating Token...' : 'Validate & Check In'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Modal>

        {/* Doctor Shift Check-Out Confirmation Modal */}
        <Modal
          isOpen={showCheckOutModal}
          onClose={() => setShowCheckOutModal(false)}
          title="Complete Hospital Shift Check-Out"
          description="Conclude your active consultation shift and update presence across the hospital appointment engine."
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed text-xs">
              <p className="font-bold">⚠️ Conclude Active Hospital Duty?</p>
              <p className="mt-1">
                Your presence status will be marked <strong>OFF DUTY / OFFLINE</strong>. New appointment slots will not accept walk-in consultations until your next check-in.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Shift Checkout Notes (Optional)
              </label>
              <input
                type="text"
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="e.g. Concluded OPD morning consultations, handed over emergencies."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0072CE] outline-none"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCheckOutModal(false)}
                disabled={submittingCheckOut}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCheckOutSubmit}
                disabled={submittingCheckOut}
              >
                {submittingCheckOut ? 'Checking Out...' : 'Confirm Shift Check-Out'}
              </Button>
            </div>
          </div>
        </Modal>
      </main>

      <footer className="text-center py-5 text-xs text-slate-400 bg-white border-t border-slate-200">
        MediFlow AI 2.0 &bull; Clinician Presence, Dynamic Queue &amp; Smart Hospital Management
      </footer>
    </div>
  );
}

export default DoctorDashboard;
