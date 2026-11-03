import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  getPatientAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getAvailableSlots,
  getAppointmentQR,
} from '../services/api';
import { useSocket } from '../hooks/useSocket';

function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [cancellingId, setCancellingId] = useState(null);

  // Phase 10: Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedApptToReschedule, setSelectedApptToReschedule] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [selectedNewSlot, setSelectedNewSlot] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  // Phase 11: Check-in QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrError, setQrError] = useState('');

  const handleOpenQRModal = async (apptId) => {
    setQrModalOpen(true);
    setQrLoading(true);
    setQrError('');
    setQrData(null);
    try {
      const data = await getAppointmentQR(apptId);
      if (data && data.success) {
        setQrData(data);
      }
    } catch (err) {
      setQrError(
        err.response?.data?.message || 'Unable to load QR check-in token.'
      );
    } finally {
      setQrLoading(false);
    }
  };

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
  useSocket('appointment_rescheduled', () => fetchAppointments());

  // Fetch open slots for rescheduling on a specific doctor and date
  const fetchRescheduleSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    setSlotsError('');
    setSelectedNewSlot(null);
    try {
      const res = await getAvailableSlots(doctorId, date);
      if (res?.success) {
        const slots = res.slots || [];
        setRescheduleSlots(slots);
        if (slots.length === 0) {
          setSlotsError('No available consultation slots on this date.');
        }
      } else {
        setRescheduleSlots([]);
        setSlotsError(res?.message || 'No slots available for the selected date.');
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
      setRescheduleSlots([]);
      setSlotsError(err.response?.data?.message || 'Failed to load available slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleOpenReschedule = (appt) => {
    setSelectedApptToReschedule(appt);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setRescheduleDate(dateStr);
    setSelectedNewSlot(null);
    setRescheduleReason('');
    setSlotsError('');
    setRescheduleModalOpen(true);
    fetchRescheduleSlots(appt.doctorId, dateStr);
  };

  const handleDateChange = (newDate) => {
    setRescheduleDate(newDate);
    if (selectedApptToReschedule) {
      fetchRescheduleSlots(selectedApptToReschedule.doctorId, newDate);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedNewSlot) {
      alert('Please select an available time slot.');
      return;
    }

    setRescheduling(true);
    setActionMessage({ type: '', text: '' });
    try {
      const res = await rescheduleAppointment(selectedApptToReschedule.id, {
        newDate: rescheduleDate,
        newStartTime: selectedNewSlot.startTime,
        newEndTime: selectedNewSlot.endTime,
        reason: rescheduleReason,
      });

      if (res?.success) {
        let successMsg = `Appointment ${selectedApptToReschedule.appointmentNumber} successfully rescheduled to ${rescheduleDate} at ${selectedNewSlot.startTime}!`;
        if (res.autoAllocated && res.allocatedPatient) {
          successMsg += ` [Smart Waitlist]: Your previously freed slot was automatically allocated to waitlisted patient (${res.allocatedPatient.name})!`;
        }
        setActionMessage({
          type: 'success',
          text: successMsg,
        });
        setRescheduleModalOpen(false);
        setSelectedApptToReschedule(null);
        fetchAppointments();
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to reschedule appointment.',
      });
    } finally {
      setRescheduling(false);
    }
  };

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
        let cancelMsg = `Appointment ${apptNumber} has been successfully cancelled.`;
        if (res.autoAllocated && res.allocatedPatient) {
          cancelMsg += ` [Smart Waitlist]: The freed slot was automatically allocated to waitlisted patient (${res.allocatedPatient.name})!`;
        }
        setActionMessage({
          type: 'success',
          text: cancelMsg,
        });
        fetchAppointments();
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
      return (
        item.status === 'SCHEDULED' ||
        item.status === 'CONFIRMED' ||
        item.status === 'CHECKED_IN'
      );
    }
    return item.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CHECKED_IN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            CHECKED IN (OPD)
          </span>
        );
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

                    {/* Reschedule Notes / Audit Trail */}
                    {appt.notes && (
                      <p className="text-[11px] text-blue-800 bg-blue-50/70 border border-blue-200/60 rounded-lg p-2 mt-1">
                        🗓️ <strong>Note:</strong> {appt.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <span className="text-xs text-gray-400">
                      Fee: <strong className="text-green-700">₹{appt.doctor?.consultationFee}</strong>
                    </span>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {/* View Check-in QR pass for all active visits */}
                      {(appt.status === 'SCHEDULED' ||
                        appt.status === 'CONFIRMED' ||
                        appt.status === 'CHECKED_IN') && (
                        <button
                          type="button"
                          onClick={() => handleOpenQRModal(appt.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg border border-emerald-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <span>📲 Check-In QR</span>
                        </button>
                      )}

                      {/* If already checked in, show quick link to OPD live queue */}
                      {appt.status === 'CHECKED_IN' && (
                        <Link
                          to={`/queue/${appt.doctorId}`}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-lg border border-amber-200 transition cursor-pointer flex items-center gap-1"
                        >
                          <span>👀 Live Queue</span>
                        </Link>
                      )}

                      {isCancellable && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenReschedule(appt)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 transition cursor-pointer"
                          >
                            🗓️ Reschedule
                          </button>
                          <button
                            type="button"
                            disabled={cancellingId === appt.id}
                            onClick={() => handleCancel(appt.id, appt.appointmentNumber)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-lg border border-red-200 transition cursor-pointer disabled:opacity-50"
                          >
                            {cancellingId === appt.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        </>
                      )}

                      {!isCancellable && appt.status !== 'CHECKED_IN' && (
                        <span className="text-[11px] text-gray-400 italic">
                          {appt.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Phase 10: Appointment Rescheduling Modal */}
      {rescheduleModalOpen && selectedApptToReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-200 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Reschedule Appointment</h2>
                <p className="text-xs text-gray-500 font-mono">
                  {selectedApptToReschedule.appointmentNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Details */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs space-y-1">
              <p className="font-semibold text-blue-900">
                Doctor: {selectedApptToReschedule.doctor?.user?.name || 'Assigned Doctor'} (
                {selectedApptToReschedule.doctor?.specialization})
              </p>
              <p className="text-blue-700">
                Currently Scheduled:{' '}
                {new Date(selectedApptToReschedule.appointmentDate).toLocaleDateString()} at{' '}
                {selectedApptToReschedule.slot?.startTime} &ndash;{' '}
                {selectedApptToReschedule.slot?.endTime}
              </p>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select New Consultation Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={rescheduleDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Slot Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select New Available Slot *
                </label>
                {loadingSlots ? (
                  <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Checking doctor availability...
                  </div>
                ) : slotsError ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                    {slotsError}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-gray-100 rounded-xl">
                    {rescheduleSlots.map((slot, idx) => {
                      const isSelected = selectedNewSlot?.startTime === slot.startTime;
                      const isAvailable =
                        slot.isAvailable !== false && slot.status !== 'BOOKED';
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedNewSlot(slot)}
                          className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : isAvailable
                              ? 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <div>{slot.startTime}</div>
                          <div className="text-[10px] font-normal">
                            {isAvailable ? 'Open' : 'Booked'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for Rescheduling (Optional)
                </label>
                <textarea
                  rows="2"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g., Doctor advised another day, patient travel conflict..."
                  className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedNewSlot || rescheduling}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule 🗓️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 11: Patient Check-In QR Pass Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-sm w-full p-6 space-y-5 animate-in fade-in duration-200 my-8 text-center">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 text-left">
              <div>
                <h3 className="text-base font-black text-gray-900">Digital Check-In Pass</h3>
                <p className="text-[11px] text-gray-500">MediFlow AI Hospital OPD Terminal</p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {qrLoading ? (
              <div className="py-12 space-y-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-500 font-medium">Generating signed QR token...</p>
              </div>
            ) : qrError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                ⚠️ {qrError}
              </div>
            ) : qrData ? (
              <div className="space-y-4">
                {/* QR Code Frame */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 inline-block shadow-inner">
                  <img
                    src={qrData.qrDataUrl}
                    alt="Check-in QR Code"
                    className="w-48 h-48 mx-auto rounded-xl shadow-xs"
                  />
                </div>

                {/* Status Indicator */}
                <div>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 block truncate">
                    {qrData.appointmentNumber}
                  </span>
                  {qrData.status === 'CHECKED_IN' ? (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-300">
                      <span>✓</span>
                      <span>Checked In at OPD &bull; Queue Active</span>
                    </div>
                  ) : (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <span>●</span>
                      <span>Ready for Hospital Check-In</span>
                    </div>
                  )}
                </div>

                {/* Consultation Details */}
                <div className="bg-gray-50 rounded-2xl p-3.5 text-xs text-left space-y-1.5 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Doctor:</span>
                    <strong className="text-gray-900">{qrData.doctorName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cabin Suite:</span>
                    <strong className="text-blue-700 font-bold">{qrData.cabin}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Schedule:</span>
                    <span className="text-gray-800 font-medium">{qrData.slotTime}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 leading-tight">
                  Present this QR code to the hospital OPD kiosk or reception scanner upon arrival to receive your queue number.
                </p>

                {/* Actions */}
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    🖨️ Print Pass
                  </button>
                  <button
                    onClick={() => setQrModalOpen(false)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <footer className="text-center py-4 text-xs text-gray-400 bg-white border-t border-gray-100">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Doctor Availability Management System
      </footer>
    </div>
  );
}

export default MyAppointmentsPage;

