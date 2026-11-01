import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getDoctors, getAvailableSlots, bookAppointment, joinWaitlist } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

function BookAppointmentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const preselectedDoctorId = searchParams.get('doctorId') || '';

  // Form states
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(preselectedDoctorId);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Today's date formatted as YYYY-MM-DD for min date
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Slots states
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsData, setSlotsData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Clinical details
  const [priority, setPriority] = useState('MEDIUM');
  const [reason, setReason] = useState('');

  // Waitlist form states (Phase 6)
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistUrgency, setWaitlistUrgency] = useState('MEDIUM');
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(null);

  // Submission & feedback states
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // 1. Fetch all doctors on mount
  useEffect(() => {
    const fetchDoctorsList = async () => {
      try {
        const res = await getDoctors();
        if (res?.success) {
          setDoctors(res.doctors || []);
          if (preselectedDoctorId) {
            const found = res.doctors.find((d) => d.id === preselectedDoctorId);
            if (found) setSelectedDoctor(found);
          }
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    };
    fetchDoctorsList();
  }, [preselectedDoctorId]);

  // When selected doctor changes
  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    setSelectedDoctorId(docId);
    setSelectedSlot(null);
    setSlotsData(null);
    setFeedback({ type: '', message: '' });

    const found = doctors.find((d) => d.id === docId);
    setSelectedDoctor(found || null);
  };

  // 2. Fetch slots when doctor or date changes
  const fetchSlots = async () => {
    if (!selectedDoctorId || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    setFeedback({ type: '', message: '' });

    try {
      const data = await getAvailableSlots(selectedDoctorId, selectedDate);
      setSlotsData(data);
      if (!data.available) {
        setFeedback({
          type: 'warning',
          message: data.message || 'No available slots for this date.',
        });
      }
    } catch (err) {
      setSlotsData(null);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to fetch appointment slots.',
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchSlots();
    }
  }, [selectedDoctorId, selectedDate]);

  // Real-time Socket.IO: refresh slots when any appointment is booked or cancelled for this doctor
  useSocket('appointment_created', (data) => {
    if (!data?.doctorId || data.doctorId === selectedDoctorId) {
      fetchSlots();
    }
  });

  useSocket('appointment_cancelled', (data) => {
    if (!data?.doctorId || data.doctorId === selectedDoctorId) {
      fetchSlots();
    }
  });

  useSocket('appointment_allocated', (data) => {
    if (!data?.doctorId || data.doctorId === selectedDoctorId) {
      fetchSlots();
    }
  });

  // 3. Handle appointment booking submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setFeedback({ type: 'error', message: 'Please select a doctor.' });
      return;
    }
    if (!selectedDate) {
      setFeedback({ type: 'error', message: 'Please select an appointment date.' });
      return;
    }
    if (!selectedSlot) {
      setFeedback({ type: 'error', message: 'Please choose an available time slot.' });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = {
        doctorId: selectedDoctorId,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        priority,
        reason: reason.trim() || 'General consultation',
      };

      const res = await bookAppointment(payload);
      if (res?.success) {
        setBookingSuccess(res.appointment);
        // Refresh slots so the booked one disappears
        fetchSlots();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to confirm booking. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Waitlist submission handler
  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setFeedback({ type: 'error', message: 'Please select a doctor.' });
      return;
    }

    setWaitlistSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = {
        doctorId: selectedDoctorId,
        medicalPriority: priority,
        urgency: waitlistUrgency,
        preferredDate: selectedDate,
        notes: reason.trim() || 'Waiting for next available cancellation slot',
      };

      const res = await joinWaitlist(payload);
      if (res?.success) {
        setWaitlistSuccess(res.waitlist);
        setShowWaitlistForm(false);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to join waitlist. Please try again.',
      });
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <span>📅 Appointment System</span>
            <span>&bull;</span>
            <span>Phase 5</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Book an Appointment
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Choose a specialist doctor, select your preferred date, pick an open consultation slot, and confirm.
          </p>
        </div>

        {/* Waitlist Success Modal / Banner */}
        {waitlistSuccess && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🧠</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-950">
                  Added to Smart Priority Waitlist!
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  You have been registered on the doctor's queue. When an appointment slot is cancelled or becomes available, the smart allocation engine will automatically assign the slot to the highest-scoring candidate.
                </p>

                <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-gray-400 block">Doctor:</span>
                    <strong className="text-gray-800">
                      {waitlistSuccess.doctor?.user?.name || selectedDoctor?.user?.name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Initial Priority Score:</span>
                    <strong className="text-blue-700 text-sm font-mono font-black">
                      {waitlistSuccess.priorityScore} pts
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Medical Priority:</span>
                    <strong className="text-gray-800">{waitlistSuccess.priority}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Status:</span>
                    <strong className="text-amber-700">● {waitlistSuccess.status}</strong>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <Link
                    to="/waitlist"
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    View My Waitlist Status
                  </Link>
                  <button
                    onClick={() => setWaitlistSuccess(null)}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal / Banner */}
        {bookingSuccess && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🎉</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-900">
                  Appointment Confirmed!
                </h3>
                <p className="text-xs text-green-700 mt-1">
                  Your appointment has been registered in the hospital database.
                </p>

                <div className="mt-4 p-4 bg-white rounded-xl border border-green-100 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-gray-400 block">Token Number:</span>
                    <strong className="font-mono text-blue-700 font-bold">
                      {bookingSuccess.appointmentNumber}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Doctor:</span>
                    <strong className="text-gray-800">
                      {bookingSuccess.doctor?.user?.name || selectedDoctor?.user?.name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Date:</span>
                    <strong className="text-gray-800">
                      {new Date(bookingSuccess.appointmentDate).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Slot Time:</span>
                    <strong className="text-green-700">
                      {bookingSuccess.slot?.startTime} &ndash; {bookingSuccess.slot?.endTime}
                    </strong>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <Link
                    to="/my-appointments"
                    className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    View My Appointments
                  </Link>
                  <button
                    onClick={() => {
                      setBookingSuccess(null);
                      setSelectedSlot(null);
                      setReason('');
                    }}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition"
                  >
                    Book Another Slot
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback.message && (
          <div
            className={`mb-6 p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
              feedback.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-green-50 border-green-200 text-green-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback({ type: '', message: '' })}
              className="text-xs font-bold text-gray-400 hover:text-gray-700 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Booking Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
          <form onSubmit={handleBookingSubmit} className="space-y-6">
            {/* Step 1: Doctor & Date Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Doctor Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  1. Select Doctor
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={handleDoctorChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Choose a doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.user.name} ({doc.specialization} &bull; ₹{doc.consultationFee})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  2. Select Date
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Doctor Info Card Preview */}
            {selectedDoctor && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-blue-900 text-sm">
                    {selectedDoctor.user.name}
                  </h4>
                  <p className="text-blue-700">
                    {selectedDoctor.specialization} &bull; {selectedDoctor.department}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-gray-600">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Fee:</span>
                    <strong className="text-green-700">₹{selectedDoctor.consultationFee}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Duration:</span>
                    <strong className="text-gray-800">{selectedDoctor.consultationDuration || 30} mins</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Presence:</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedDoctor.currentPresence === 'PRESENT'
                          ? 'bg-green-100 text-green-800'
                          : selectedDoctor.currentPresence === 'BUSY'
                          ? 'bg-amber-100 text-amber-800'
                          : selectedDoctor.currentPresence === 'AWAY'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      ● {selectedDoctor.currentPresence}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Available Slots Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  3. Available Time Slots
                </label>
                {slotsData && (
                  <span className="text-xs text-gray-500">
                    Day: <strong>{slotsData.dayOfWeek}</strong> &bull; Open:{' '}
                    <strong className="text-green-700">{slotsData.availableCount}</strong> /{' '}
                    {slotsData.totalSlots}
                  </span>
                )}
              </div>

              {/* Slot Rendering */}
              {!selectedDoctorId ? (
                <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Please select a doctor and date above to load available consultation slots.
                </div>
              ) : slotsLoading ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-gray-400">Checking doctor availability and generating slots...</p>
                </div>
              ) : !slotsData || !slotsData.available || slotsData.slots.length === 0 ? (
                <div className="p-6 text-center text-xs bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
                  <span className="text-3xl block">⏰</span>
                  <h4 className="font-bold text-gray-800 text-sm">
                    No Appointment Slots Available
                  </h4>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {slotsData?.message || 'All consultation slots for this date are currently fully booked or unavailable.'}
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowWaitlistForm(!showWaitlistForm)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                    >
                      {showWaitlistForm ? '✕ Cancel Waitlist Request' : '⚡ Join Smart Waitlist Queue'}
                    </button>
                  </div>

                  {/* Inline Waitlist Form */}
                  {showWaitlistForm && (
                    <div className="mt-4 p-5 bg-white rounded-xl border border-gray-200 text-left space-y-4 shadow-sm animate-fadeIn">
                      <div className="border-b border-gray-100 pb-2">
                        <h5 className="font-bold text-gray-900 text-sm">
                          Join {selectedDoctor?.user?.name}'s Priority Waitlist
                        </h5>
                        <p className="text-[11px] text-gray-400">
                          Our rule-based allocation engine ranks patients by clinical severity, urgency, and wait time.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-gray-700 mb-1">
                            Medical Priority
                          </label>
                          <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-white"
                          >
                            <option value="LOW">Low (Routine Checkup) — 10 pts</option>
                            <option value="MEDIUM">Medium (Moderate Symptoms) — 20 pts</option>
                            <option value="HIGH">High (Severe Discomfort) — 30 pts</option>
                            <option value="CRITICAL">Critical (Urgent Intervention) — 40 pts</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-gray-700 mb-1">
                            Clinical Urgency
                          </label>
                          <select
                            value={waitlistUrgency}
                            onChange={(e) => setWaitlistUrgency(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-white"
                          >
                            <option value="LOW">Low (Flexible Timeline) — 5 pts</option>
                            <option value="MEDIUM">Medium (Standard Outpatient) — 10 pts</option>
                            <option value="HIGH">High (Same-Day Review Needed) — 15 pts</option>
                            <option value="EMERGENCY">Emergency (Immediate Allocation) — 20 pts</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 text-xs mb-1">
                          Brief Symptoms / Reason
                        </label>
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="e.g. Chest pain with shortness of breath..."
                          className="w-full px-3 py-2 border rounded-lg text-xs"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 font-mono">
                          Base Score: <strong>{priority === 'CRITICAL' ? 40 : priority === 'HIGH' ? 30 : priority === 'MEDIUM' ? 20 : 10} + {waitlistUrgency === 'EMERGENCY' ? 20 : waitlistUrgency === 'HIGH' ? 15 : waitlistUrgency === 'MEDIUM' ? 10 : 5} pts</strong> (+1 pt / 30m wait)
                        </span>

                        <button
                          type="button"
                          disabled={waitlistSubmitting}
                          onClick={handleWaitlistSubmit}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                        >
                          {waitlistSubmitting ? 'Joining Queue...' : 'Confirm Join Waitlist'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-60 overflow-y-auto p-1">
                  {slotsData.slots.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        type="button"
                        key={slot.startTime}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                            : 'bg-white hover:bg-blue-50 text-gray-800 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <span className="block font-mono text-xs">{slot.startTime}</span>
                        <span className="block text-[10px] opacity-75">to {slot.endTime}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSlot && (
                <p className="text-xs text-green-700 font-medium mt-2">
                  ✓ Selected Slot: <strong>{selectedSlot.startTime} &ndash; {selectedSlot.endTime}</strong>
                </p>
              )}
            </div>

            {/* Step 3: Priority & Clinical Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  4. Clinical Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="LOW">Low (Routine Checkup)</option>
                  <option value="MEDIUM">Medium (General Symptoms)</option>
                  <option value="HIGH">High (Severe Discomfort)</option>
                  <option value="EMERGENCY">Emergency (Urgent Attention)</option>
                </select>
              </div>

              {/* Reason / Symptoms */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  5. Reason / Symptoms (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Chest tightness, headache since 2 days, follow-up..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <span>Confirm Appointment Booking</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Explainable AI Section */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md border border-blue-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
            <span>⚖️ Transparency &amp; Medical Ethics</span>
            <span>&bull;</span>
            <span>Explainable AI</span>
          </div>
          <h3 className="text-base font-bold text-white">
            How Smart Allocation Works
          </h3>
          <p className="text-xs text-blue-100 leading-relaxed">
            "MediFlow AI uses a transparent priority scoring system to rank waitlisted patients based on medical priority, urgency, and waiting time. When a valid appointment slot becomes available, the system selects the highest-priority eligible patient."
          </p>
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] text-blue-300 block font-semibold">1. Medical Priority</span>
              <strong className="text-sm">10 to 40 pts</strong>
              <p className="text-[10px] text-blue-200 mt-0.5">Based on clinical severity level (Low to Critical)</p>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] text-blue-300 block font-semibold">2. Clinical Urgency</span>
              <strong className="text-sm">5 to 20 pts</strong>
              <p className="text-[10px] text-blue-200 mt-0.5">Temporal sensitivity (Low to Emergency)</p>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] text-blue-300 block font-semibold">3. Waiting Time Bonus</span>
              <strong className="text-sm">+1 pt / 30 mins</strong>
              <p className="text-[10px] text-blue-200 mt-0.5">Capped at 30 pts (15 hrs) to prevent queue stagnation</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        MediFlow AI &copy; Smart Hospital Appointment System &bull; Phase 5 Slot Booking
      </footer>
    </div>
  );
}

export default BookAppointmentPage;

