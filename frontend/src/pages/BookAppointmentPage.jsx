import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  getDoctors,
  getAvailableSlots,
  bookAppointment,
  joinWaitlist,
  getDoctorAvailabilityPrediction,
  getEstimatedWaitingTime,
} from '../services/api';
import { useSocket } from '../hooks/useSocket';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';

function BookAppointmentPage() {
  const [searchParams] = useSearchParams();
  const preselectedDoctorId = searchParams.get('doctorId') || '';
  const preselectedDate = searchParams.get('date') || '';

  // Doctors & Selection
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(preselectedDoctorId);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Timezone-safe hospital today
  const getHospitalTodayStr = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  const getSensibleDefaultDate = () => {
    try {
      const now = new Date();
      const istTimeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        hour12: false,
      }).format(now);
      const hour = parseInt(istTimeStr, 10);
      if (hour >= 17) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrow);
      }
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  const todayStr = getHospitalTodayStr();
  const [selectedDate, setSelectedDate] = useState(preselectedDate || getSensibleDefaultDate());

  // Slots states
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsData, setSlotsData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Phase 10: AI Predictive Insights
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAIInsight, setLoadingAIInsight] = useState(false);

  // Clinical details
  const [priority, setPriority] = useState('MEDIUM');
  const [reason, setReason] = useState('');

  // Waitlist form states (Phase 6)
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistUrgency, setWaitlistUrgency] = useState('MEDIUM');
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

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

  // Real-time Socket.IO: live presence synchronization without page reload
  useSocket('doctor_status_changed', (data) => {
    if (data?.doctorId) {
      const nextStatus = data.presenceStatus || data.status;
      setDoctors((prev) =>
        prev.map((doc) =>
          doc.id === data.doctorId ? { ...doc, currentPresence: nextStatus } : doc
        )
      );
      if (data.doctorId === selectedDoctorId) {
        fetchSlots();
      }
    }
  });

  useSocket('doctor_attendance_updated', (data) => {
    if (data?.doctorId) {
      const nextStatus =
        data.action === 'CHECK_OUT' ? 'OFFLINE' : data.presenceStatus || 'PRESENT';
      setDoctors((prev) =>
        prev.map((doc) =>
          doc.id === data.doctorId ? { ...doc, currentPresence: nextStatus } : doc
        )
      );
      if (data.doctorId === selectedDoctorId) {
        fetchSlots();
      }
    }
  });

  // Fetch AI predictive availability and wait-time estimate when slot is chosen
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate || !selectedSlot?.startTime) {
      setAiInsight(null);
      return;
    }

    let isMounted = true;
    const fetchAI = async () => {
      setLoadingAIInsight(true);
      try {
        const [availRes, waitRes] = await Promise.all([
          getDoctorAvailabilityPrediction(selectedDoctorId, selectedDate, selectedSlot.startTime).catch(() => null),
          getEstimatedWaitingTime(selectedDoctorId, selectedDate, selectedSlot.startTime).catch(() => null),
        ]);
        if (isMounted) {
          setAiInsight({
            availability: availRes?.prediction || null,
            waitTime: waitRes?.waitTime || null,
          });
        }
      } catch (err) {
        console.warn('AI insight fetch notice:', err.message);
      } finally {
        if (isMounted) setLoadingAIInsight(false);
      }
    };

    fetchAI();
    return () => {
      isMounted = false;
    };
  }, [selectedDoctorId, selectedDate, selectedSlot]);

  // Handle appointment booking submission
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
        setFeedback({
          type: 'success',
          message: 'Appointment booked successfully! Digital check-in QR pass is now active.',
        });
        fetchSlots();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to book appointment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle waitlist submission
  const handleWaitlistSubmit = async () => {
    if (!selectedDoctorId || !selectedDate) {
      setFeedback({ type: 'error', message: 'Doctor and preferred date are required to join the waitlist.' });
      return;
    }

    setWaitlistSubmitting(true);
    try {
      const res = await joinWaitlist({
        doctorId: selectedDoctorId,
        preferredDate: selectedDate,
        priority,
        urgency: waitlistUrgency,
      });

      if (res?.success) {
        setFeedback({
          type: 'success',
          message: `Successfully joined waitlist for ${res.entry?.doctor?.user?.name || 'the selected doctor'} with calculated score ${res.entry?.priorityScore || '—'} pts!`,
        });
        setShowWaitlistForm(false);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to join waitlist.',
      });
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  // Determine current active step in booking journey
  const currentStep = bookingSuccess
    ? 4
    : selectedSlot
    ? 3
    : selectedDoctorId && selectedDate
    ? 2
    : 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        <PageHeader
          title="Book Doctor Consultation"
          subtitle="Select your verified specialist, choose an open consultation time slot, and receive a cryptographically signed QR arrival pass."
          badge={
            <Badge variant="primary" size="sm" dot>
              Real-Time Slot Engine
            </Badge>
          }
        />

        {/* Step-by-Step User Journey Progress Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div
              className={`p-2 rounded-xl transition ${
                currentStep >= 1
                  ? 'bg-blue-50 text-[#0072CE] font-bold border border-blue-200'
                  : 'text-slate-400'
              }`}
            >
              <span className="block text-[10px] uppercase font-bold text-slate-400">Step 1</span>
              <span>1. Specialist</span>
            </div>
            <div
              className={`p-2 rounded-xl transition ${
                currentStep >= 2
                  ? 'bg-blue-50 text-[#0072CE] font-bold border border-blue-200'
                  : 'text-slate-400'
              }`}
            >
              <span className="block text-[10px] uppercase font-bold text-slate-400">Step 2</span>
              <span>2. Date &amp; Slot</span>
            </div>
            <div
              className={`p-2 rounded-xl transition ${
                currentStep >= 3
                  ? 'bg-blue-50 text-[#0072CE] font-bold border border-blue-200'
                  : 'text-slate-400'
              }`}
            >
              <span className="block text-[10px] uppercase font-bold text-slate-400">Step 3</span>
              <span>3. Review &amp; AI</span>
            </div>
            <div
              className={`p-2 rounded-xl transition ${
                currentStep >= 4
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                  : 'text-slate-400'
              }`}
            >
              <span className="block text-[10px] uppercase font-bold text-slate-400">Step 4</span>
              <span>4. Confirmed</span>
            </div>
          </div>
        </div>

        {/* Success Modal / Banner */}
        {bookingSuccess && (
          <Card className="p-6 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border-emerald-200 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                🎉
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-emerald-950 tracking-tight">
                    Appointment Successfully Confirmed!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your appointment has been registered in the hospital database and assigned a digital QR arrival pass.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-emerald-100 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-2xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Token Number</span>
                    <strong className="font-mono text-[#0072CE] font-bold text-sm">
                      {bookingSuccess.appointmentNumber}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Consultant</span>
                    <strong className="text-slate-800">
                      {bookingSuccess.doctor?.user?.name || selectedDoctor?.user?.name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Date</span>
                    <strong className="text-slate-800">
                      {new Date(bookingSuccess.appointmentDate).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Slot Time</span>
                    <strong className="text-emerald-700">
                      {bookingSuccess.slot?.startTime} &ndash; {bookingSuccess.slot?.endTime}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Link to="/my-appointments">
                    <Button variant="success" size="sm" icon={<span>📲</span>}>
                      View My Digital QR Pass
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBookingSuccess(null);
                      setSelectedSlot(null);
                      setReason('');
                    }}
                  >
                    Book Another Appointment
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Feedback Alert */}
        {feedback.message && !bookingSuccess && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between shadow-2xs ${
              feedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span className="font-semibold">{feedback.message}</span>
            <button
              onClick={() => setFeedback({ type: '', message: '' })}
              className="text-slate-400 hover:text-slate-700 text-base font-bold ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Main Booking Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleBookingSubmit} className="space-y-6">
            {/* Step 1: Doctor & Date Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Select Medical Specialist <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={handleDoctorChange}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] outline-none cursor-pointer"
                >
                  <option value="">-- Choose verified doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.user.name} ({doc.specialization} &bull; ₹{doc.consultationFee})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Choose Consultation Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] outline-none"
                />
              </div>
            </div>

            {/* Doctor Info Card Preview */}
            {selectedDoctor && (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-blue-950 text-sm">
                    Dr. {selectedDoctor.user.name}
                  </h4>
                  <p className="text-blue-700 font-semibold">
                    {selectedDoctor.specialization} &bull; {selectedDoctor.department}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Consultation Fee</span>
                    <strong className="text-emerald-700 text-sm">₹{selectedDoctor.consultationFee}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Duration</span>
                    <strong className="text-slate-800">{selectedDoctor.consultationDuration || 30} mins</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Live Presence</span>
                    <Badge
                      variant={
                        selectedDoctor.currentPresence === 'PRESENT' || selectedDoctor.currentPresence === 'AVAILABLE'
                          ? 'success'
                          : selectedDoctor.currentPresence === 'BUSY'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="xs"
                    >
                      {selectedDoctor.currentPresence}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Available Slots Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Select Consultation Slot <span className="text-rose-500">*</span>
                </label>
                {slotsData && (
                  <span className="text-xs text-slate-500 font-medium">
                    Day: <strong>{slotsData.dayOfWeek}</strong> &bull; Open Slots:{' '}
                    <strong className="text-emerald-700">{slotsData.availableCount}</strong> /{' '}
                    {slotsData.totalSlots}
                  </span>
                )}
              </div>

              {!selectedDoctorId ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Select a doctor and appointment date above to inspect real-time slot availability.
                </div>
              ) : slotsLoading ? (
                <div className="py-8 text-center space-y-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 border-2 border-[#0072CE] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-500">Checking clinician presence and generating discrete slots...</p>
                </div>
              ) : !slotsData || !slotsData.available || slotsData.slots.length === 0 ? (
                <div className="p-6 text-center text-xs bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                  <span className="text-3xl block">⏰</span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    No Consultation Slots Available on this Date
                  </h4>
                  <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                    {slotsData?.message || 'All consultation slots for this date are fully booked or clinician is offline.'}
                  </p>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setShowWaitlistForm(!showWaitlistForm)}
                    >
                      {showWaitlistForm ? '✕ Hide Waitlist Form' : '⚡ Join Smart Standby Waitlist'}
                    </Button>
                  </div>

                  {/* Inline Waitlist Form */}
                  {showWaitlistForm && (
                    <div className="mt-4 p-5 bg-white rounded-xl border border-slate-200 text-left space-y-4 shadow-sm text-xs">
                      <div className="border-b border-slate-100 pb-2">
                        <h5 className="font-bold text-slate-900 text-sm">
                          Join Standby Waitlist Queue
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          If a booked patient cancels or reschedules, our engine promotes the highest-priority candidate.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 uppercase mb-1">
                            Medical Priority Tier
                          </label>
                          <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="LOW">Low (Routine Checkup) — 10 pts</option>
                            <option value="MEDIUM">Medium (Moderate Symptoms) — 20 pts</option>
                            <option value="HIGH">High (Severe Discomfort) — 30 pts</option>
                            <option value="CRITICAL">Critical (Urgent Intervention) — 40 pts</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 uppercase mb-1">
                            Clinical Urgency
                          </label>
                          <select
                            value={waitlistUrgency}
                            onChange={(e) => setWaitlistUrgency(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="LOW">Low (Flexible Timeline) — 5 pts</option>
                            <option value="MEDIUM">Medium (Standard Outpatient) — 10 pts</option>
                            <option value="HIGH">High (Same-Day Review Needed) — 15 pts</option>
                            <option value="EMERGENCY">Emergency (Immediate Allocation) — 20 pts</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <span className="text-[11px] text-slate-500 font-mono">
                          Formula: Priority + Urgency + (+1 pt / 30m standby)
                        </span>

                        <Button
                          type="button"
                          variant="amber"
                          size="sm"
                          isLoading={waitlistSubmitting}
                          onClick={handleWaitlistSubmit}
                        >
                          Confirm Join Waitlist
                        </Button>
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
                        className={`p-3 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#0072CE] text-white border-[#0072CE] shadow-xs ring-2 ring-blue-300'
                            : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <span className="block font-mono text-xs font-bold">{slot.startTime}</span>
                        <span className="block text-[10px] opacity-75">to {slot.endTime}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected Slot Callout & AI Prediction */}
              {selectedSlot && (
                <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                      <span>✓</span>
                      <span>
                        Selected Slot: <strong>{selectedSlot.startTime} &ndash; {selectedSlot.endTime}</strong>
                      </span>
                    </p>
                    <Badge variant="indigo" size="xs">
                      Advisory ML Insight
                    </Badge>
                  </div>

                  {loadingAIInsight ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      Computing AI queue velocity &amp; availability confidence...
                    </div>
                  ) : aiInsight ? (
                    <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/40 rounded-xl border border-indigo-100 text-xs space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🟢</span>
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">
                              Predicted Clinician Availability
                            </span>
                            <span className="font-bold text-emerald-800">
                              {aiInsight.availability?.percentage || 90}% Certainty ({aiInsight.availability?.confidence || 'HIGH'})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-base">⏳</span>
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">
                              Expected Clinic Wait
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-indigo-900">
                                {aiInsight.waitTime?.formattedWaitRange || '~5 - 10 mins'} (Queue Pos #{aiInsight.waitTime?.queuePosition || 1})
                              </span>
                              {aiInsight.waitTime?.source && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                  aiInsight.waitTime.source === 'HYBRID_ML_QUEUE'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {aiInsight.waitTime.source === 'HYBRID_ML_QUEUE' ? 'Hybrid AI + Queue' : 'Queue Fallback'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {aiInsight.waitTime?.explanation && (
                        <p className="text-[11px] text-slate-600 border-t border-indigo-100/80 pt-2 leading-relaxed">
                          ⏱️ <em>{aiInsight.waitTime.explanation}</em>
                        </p>
                      )}

                      {aiInsight.availability?.explanation && (
                        <p className="text-[11px] text-slate-600 border-t border-indigo-100/80 pt-2 leading-relaxed">
                          💡 <em>{aiInsight.availability.explanation}</em>
                        </p>
                      )}

                      <p className="text-[10px] text-slate-400 italic">
                        * Recommendations are advisory. Final appointment confirmation occurs atomically upon booking.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Step 3: Priority & Clinical Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  4. Clinical Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] outline-none cursor-pointer"
                >
                  <option value="LOW">Low (Routine Checkup)</option>
                  <option value="MEDIUM">Medium (General Symptoms)</option>
                  <option value="HIGH">High (Severe Discomfort)</option>
                  <option value="EMERGENCY">Emergency (Urgent Attention)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  5. Clinical Symptoms / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Follow-up consultation, recurring migraine, chest discomfort..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!selectedSlot}
                isLoading={submitting}
                className="w-full sm:w-auto"
              >
                Confirm Appointment Booking ➔
              </Button>
            </div>
          </form>
        </Card>

        {/* Transparent Medical Ethics & Heuristics Breakdown */}
        <Card className="p-6 bg-slate-900 text-white border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
            <span>⚖️ Clinical Ethics &amp; Transparency</span>
            <span>&bull;</span>
            <span>Deterministic Triage</span>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            How MediFlow AI Triage &amp; Smart Allocation Operates
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            MediFlow AI strictly isolates clinical triage from stochastic unpredictability. When a confirmed consultation is cancelled or rescheduled, the engine evaluates eligible waitlist candidates using an explainable multi-tier formula:
          </p>
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[10px] text-blue-400 block font-bold uppercase">1. Medical Severity</span>
              <strong className="text-base text-white">10 to 40 pts</strong>
              <p className="text-[10px] text-slate-400 mt-0.5">Assigned by clinical triage tier (Low to Critical)</p>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[10px] text-blue-400 block font-bold uppercase">2. Temporal Urgency</span>
              <strong className="text-base text-white">5 to 20 pts</strong>
              <p className="text-[10px] text-slate-400 mt-0.5">Sensitivity to consultation delay (Low to Emergency)</p>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[10px] text-blue-400 block font-bold uppercase">3. Waiting Time Bonus</span>
              <strong className="text-base text-white">+1 pt / 30 mins</strong>
              <p className="text-[10px] text-slate-400 mt-0.5">Prevents queue stagnation while maintaining priority</p>
            </div>
          </div>
        </Card>
      </main>

      <footer className="text-center py-5 text-xs text-slate-400 bg-white border-t border-slate-200">
        MediFlow AI 2.0 &bull; Smart Hospital Appointment, Doctor Availability &amp; Queue Management Network
      </footer>
    </div>
  );
}

export default BookAppointmentPage;
