import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getPatientAppointments, cancelAppointment } from '../services/api';
import { useSocket } from '../hooks/useSocket';

function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [cancellingId, setCancellingId] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await getPatientAppointments();
      if (res?.success) {
        setAppointments(res.appointments || []);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load your appointments.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Real-time Socket.IO: refresh patient appointments automatically
  useSocket('appointment_created', () => fetchAppointments());
  useSocket('appointment_cancelled', () => fetchAppointments());
  useSocket('appointment_allocated', () => fetchAppointments());
  useSocket('appointment_status_changed', () => fetchAppointments());

  const handleCancel = async (id, apptNumber) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel appointment ${apptNumber}? This will release the slot for other patients.`
    );
    if (!confirmed) return;

    setCancellingId(id);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await cancelAppointment(id);
      if (res?.success) {
        setActionMessage({
          type: 'success',
          text: `Appointment ${apptNumber} has been successfully cancelled.`,
        });
        // Update local status
        setAppointments((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: 'CANCELLED' } : item
          )
        );
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to cancel appointment.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((item) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') {
      return item.status === 'SCHEDULED' || item.status === 'CONFIRMED';
    }
    return item.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
            ● CONFIRMED
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            ● SCHEDULED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 animate-pulse">
            ● IN PROGRESS
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ✓ COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
            ✕ CANCELLED
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            NO SHOW
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'EMERGENCY':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200">
            EMERGENCY
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            HIGH PRIORITY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            ROUTINE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              My Appointments
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Track your scheduled consultations, review appointment tokens, or cancel upcoming visits.
            </p>
          </div>

          <Link
            to="/book"
            className="w-fit px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition"
          >
            + Book New Appointment
          </Link>
        </div>

        {/* Feedback Alert */}
        {actionMessage.text && (
          <div
            className={`mb-6 p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
              actionMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-green-50 border-green-200 text-green-800'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage({ type: '', text: '' })}
              className="text-xs font-bold text-gray-400 hover:text-gray-700 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2 text-xs">
          {[
            { id: 'ALL', label: 'All Appointments' },
            { id: 'ACTIVE', label: 'Upcoming / Active' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-400">Loading your appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-md mx-auto space-y-3">
            <span className="text-4xl block">🩺</span>
            <h3 className="text-base font-bold text-gray-800">
              No Appointments Found
            </h3>
            <p className="text-xs text-gray-500">
              {filterStatus === 'ALL'
                ? "You haven't scheduled any doctor appointments yet."
                : `No appointments match the filter "${filterStatus}".`}
            </p>
            <Link
              to="/book"
              className="inline-block mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              Book an Appointment Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appt) => {
              const isCancellable =
                appt.status === 'SCHEDULED' || appt.status === 'CONFIRMED';
              const formattedDate = new Date(appt.appointmentDate).toLocaleDateString(
                'en-US',
                {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }
              );

              return (
                <div
                  key={appt.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    {/* Top Row: Token & Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        {appt.appointmentNumber}
                      </span>
                      {getStatusBadge(appt.status)}
                      {getPriorityBadge(appt.priority)}
                    </div>

                    {/* Doctor Info */}
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        {appt.doctor?.user?.name || 'Assigned Doctor'}
                      </h3>
                      <p className="text-xs text-blue-600 font-semibold">
                        {appt.doctor?.specialization} &bull; {appt.doctor?.department}
                      </p>
                    </div>

                    {/* Date and Time */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
                      <span>
                        📅 <strong>{formattedDate}</strong>
                      </span>
                      <span>
                        ⏰{' '}
                        <strong>
                          {appt.slot?.startTime} &ndash; {appt.slot?.endTime}
                        </strong>
                      </span>
                      {appt.doctor?.roomNumber && (
                        <span>
                          📍 Cabin: <strong>{appt.doctor.roomNumber}</strong>
                        </span>
                      )}
                    </div>

                    {/* Reason */}
                    {appt.reason && (
                      <p className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                        Reason: <span className="text-gray-700 font-medium">{appt.reason}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <span className="text-xs text-gray-400">
                      Fee: <strong className="text-green-700">₹{appt.doctor?.consultationFee}</strong>
                    </span>

                    {isCancellable ? (
                      <button
                        type="button"
                        disabled={cancellingId === appt.id}
                        onClick={() => handleCancel(appt.id, appt.appointmentNumber)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-lg border border-red-200 transition cursor-pointer disabled:opacity-50"
                      >
                        {cancellingId === appt.id ? 'Cancelling...' : 'Cancel Appointment'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">
                        {appt.status === 'CANCELLED'
                          ? 'Cancelled'
                          : 'Completed'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 bg-white border-t border-gray-100">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Doctor Availability Management System
      </footer>
    </div>
  );
}

export default MyAppointmentsPage;

