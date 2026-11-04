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
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [apptToCancel, setApptToCancel] = useState(null);

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
      const data = await getPatientAppointments();
      if (data && data.success) {
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load appointments.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Real-time Socket.IO listeners
  useSocket('appointment_created', fetchAppointments);
  useSocket('appointment_cancelled', fetchAppointments);
  useSocket('appointment_allocated', fetchAppointments);
  useSocket('appointment_rescheduled', fetchAppointments);
  useSocket('appointment_status_changed', fetchAppointments);

  const fetchRescheduleSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    setSlotsError('');
    try {
      const res = await getAvailableSlots(doctorId, date);
      if (res?.success && res.available && res.slots) {
        setRescheduleSlots(res.slots);
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
      setSlotsError('Please select an available time slot.');
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

  const promptCancel = (appt) => {
    setApptToCancel(appt);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!apptToCancel) return;
    setCancellingId(apptToCancel.id);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await cancelAppointment(apptToCancel.id);
      if (res?.success) {
        let cancelMsg = `Appointment ${apptToCancel.appointmentNumber} has been successfully cancelled.`;
        if (res.autoAllocated && res.allocatedPatient) {
          cancelMsg += ` [Smart Waitlist]: The freed slot was automatically allocated to waitlisted patient (${res.allocatedPatient.name})!`;
        }
        setActionMessage({
          type: 'success',
          text: cancelMsg,
        });
        setCancelModalOpen(false);
        setApptToCancel(null);
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
          <Badge variant="warning" dot dotPulse>
            CHECKED IN (OPD)
          </Badge>
        );
      case 'CONFIRMED':
        return <Badge variant="success">CONFIRMED</Badge>;
      case 'SCHEDULED':
        return <Badge variant="indigo">SCHEDULED</Badge>;
      case 'IN_PROGRESS':
        return (
          <Badge variant="purple" dot dotPulse>
            IN PROGRESS
          </Badge>
        );
      case 'COMPLETED':
        return <Badge variant="teal">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        <PageHeader
          title="My Consultations &amp; QR Passes"
          subtitle="Track your scheduled specialist visits, display verified reception check-in tokens, or reschedule appointments."
          badge={
            <Badge variant="primary" size="sm" dot>
              Patient Portal
            </Badge>
          }
          actions={
            <Link to="/book">
              <Button variant="primary" size="sm" icon={<span>+</span>}>
                Book Consultation
              </Button>
            </Link>
          }
        />

        {/* Feedback Alert */}
        {actionMessage.text && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between shadow-2xs ${
              actionMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span className="font-semibold">{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage({ type: '', text: '' })}
              className="text-slate-400 hover:text-slate-700 text-base font-bold ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {[
            { id: 'ALL', label: 'All Consultations' },
            { id: 'ACTIVE', label: 'Active & Upcoming' },
            { id: 'COMPLETED', label: 'Concluded Visits' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-[#0072CE] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {loading ? (
          <LoadingSkeleton variant="list" count={4} />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No Consultations Found"
            description={
              filterStatus === 'ALL'
                ? 'You have not scheduled any appointments yet.'
                : `No appointments match the filter "${filterStatus}".`
            }
            action={
              <Link to="/book">
                <Button variant="primary" size="sm">
                  Book A Consultation
                </Button>
              </Link>
            }
          />
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
                <Card
                  key={appt.id}
                  hover
                  className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0072CE] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        {appt.appointmentNumber}
                      </span>
                      {getStatusBadge(appt.status)}
                      <Badge
                        variant={
                          appt.priority === 'EMERGENCY'
                            ? 'danger'
                            : appt.priority === 'HIGH'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="xs"
                      >
                        {appt.priority}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Dr. {appt.doctor?.user?.name || 'Assigned Consultant'}
                      </h3>
                      <p className="text-xs text-[#0072CE] font-semibold">
                        {appt.doctor?.specialization} &bull; {appt.doctor?.department}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
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

                    {appt.reason && (
                      <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                        Clinical Notes: <span className="text-slate-700 font-medium">{appt.reason}</span>
                      </p>
                    )}

                    {appt.notes && (
                      <p className="text-[11px] text-blue-900 bg-blue-50 border border-blue-200/80 rounded-xl p-2.5 mt-1 leading-snug">
                        🗓️ <strong>Audit Note:</strong> {appt.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <span className="text-xs text-slate-400">
                      Fee: <strong className="text-emerald-700">₹{appt.doctor?.consultationFee}</strong>
                    </span>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {/* Check-in QR Pass Modal Trigger */}
                      {(appt.status === 'SCHEDULED' ||
                        appt.status === 'CONFIRMED' ||
                        appt.status === 'CHECKED_IN') && (
                        <Button
                          variant="success"
                          size="sm"
                          icon={<span>📲</span>}
                          onClick={() => handleOpenQRModal(appt.id)}
                        >
                          Check-In QR
                        </Button>
                      )}

                      {appt.status === 'CHECKED_IN' && (
                        <Link to={`/queue/${appt.doctorId}`}>
                          <Button variant="outline" size="sm" icon={<span>👀</span>}>
                            Live Queue
                          </Button>
                        </Link>
                      )}

                      {isCancellable && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenReschedule(appt)}
                          >
                            Reschedule
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => promptCancel(appt)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Rescheduling Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Consultation"
        description={`Appointment #${selectedApptToReschedule?.appointmentNumber}`}
      >
        {selectedApptToReschedule && (
          <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
              <p className="font-bold text-blue-950">
                Dr. {selectedApptToReschedule.doctor?.user?.name} (
                {selectedApptToReschedule.doctor?.specialization})
              </p>
              <p className="text-blue-800">
                Currently: {new Date(selectedApptToReschedule.appointmentDate).toLocaleDateString()} at{' '}
                {selectedApptToReschedule.slot?.startTime} &ndash;{' '}
                {selectedApptToReschedule.slot?.endTime}
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Select New Date *
              </label>
              <input
                type="date"
                min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())}
                value={rescheduleDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Select New Consultation Slot *
              </label>
              {loadingSlots ? (
                <div className="py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#0072CE] border-t-transparent rounded-full animate-spin"></div>
                  Checking clinician availability...
                </div>
              ) : slotsError ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl">
                  {slotsError}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl">
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
                        className={`p-2 rounded-lg border text-xs font-semibold text-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#0072CE] text-white border-[#0072CE] shadow-xs'
                            : isAvailable
                            ? 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
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

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Reason for Rescheduling
              </label>
              <textarea
                rows="2"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g. Schedule conflict, travel delay, physician recommendation..."
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRescheduleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!selectedNewSlot}
                isLoading={rescheduling}
              >
                Confirm Reschedule
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Digital Check-in QR Pass Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        maxWidth="max-w-sm"
        title="Digital Check-In Pass"
        description="MediFlow AI Central Hospital Outpatient Pass"
      >
        {qrLoading ? (
          <div className="py-12 space-y-3 text-center">
            <div className="w-10 h-10 border-4 border-[#0072CE] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-semibold">Generating verified QR token...</p>
          </div>
        ) : qrError ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-center">
            ⚠️ {qrError}
          </div>
        ) : qrData ? (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <img
                src={qrData.qrDataUrl}
                alt="Check-in QR Pass"
                className="w-48 h-48 mx-auto rounded-xl shadow-xs"
              />
            </div>

            <div>
              <span className="font-mono text-xs font-bold text-[#0072CE] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 block truncate">
                {qrData.appointmentNumber}
              </span>
              <div className="mt-2">
                {qrData.status === 'CHECKED_IN' ? (
                  <Badge variant="success" size="sm" dot>
                    Checked In at OPD &bull; Queue Active
                  </Badge>
                ) : (
                  <Badge variant="primary" size="sm" dot>
                    Ready for Touchless Check-In
                  </Badge>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-left space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Consultant:</span>
                <strong className="text-slate-900">{qrData.doctorName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cabin Suite:</span>
                <strong className="text-[#0072CE] font-bold">{qrData.cabin}</strong>
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

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Consultation?"
        message={`Are you sure you want to cancel appointment ${apptToCancel?.appointmentNumber}? This slot will be immediately reallocated to the highest-priority waitlisted patient.`}
        confirmText="Yes, Cancel Visit"
        cancelText="Keep Appointment"
        variant="danger"
        isLoading={Boolean(cancellingId)}
      />

      <footer className="text-center py-5 text-xs text-slate-400 bg-white border-t border-slate-200">
        MediFlow AI 2.0 &bull; Smart Hospital Appointment, Doctor Availability &amp; Queue Management Network
      </footer>
    </div>
  );
}

export default MyAppointmentsPage;
