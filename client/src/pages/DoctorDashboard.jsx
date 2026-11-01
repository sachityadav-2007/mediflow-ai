import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getDoctorProfile,
  updateDoctorProfile,
  updateDoctorPresence,
  getDoctorPresence,
  updateDoctorSchedule,
  updateAppointmentStatus,
} from '../services/api';

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
  const { user, logout } = useAuth();
  const [doctorData, setDoctorData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [updatingApptId, setUpdatingApptId] = useState(null);
  const [presenceLogs, setPresenceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Presence state
  const [currentStatus, setCurrentStatus] = useState('OFFLINE');
  const [updatingPresence, setUpdatingPresence] = useState(false);

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
  }, []);

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

    // Filter to active schedules or save all
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

  const getPresenceBadgeColor = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'BUSY':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'AWAY':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
        <Navbar />
        <div className="text-center py-24 space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 font-medium">Loading Doctor Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        {/* Banner Alert Messages */}
        {actionMessage.text && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
              actionMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage({ type: '', text: '' })}
              className="text-xs font-bold text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Doctor Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-500/30 border border-blue-300/30 rounded-full">
                  🩺 Doctor Control Panel
                </span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getPresenceBadgeColor(
                    currentStatus
                  )}`}
                >
                  ● {currentStatus}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {doctorData?.user?.name || user?.name}
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                {doctorData?.specialization} &bull; {doctorData?.department} &bull; Room {doctorData?.roomNumber || 'N/A'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition cursor-pointer"
              >
                ✏️ Edit Profile
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Live Presence Quick Controls */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Clinic Presence Controller
              </h2>
              <p className="text-xs text-gray-500">
                Update your live clinic availability for patients and receptionists in real time.
              </p>
            </div>
            <span className="text-xs text-gray-400">
              Current: <strong className="text-gray-800">{currentStatus}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              disabled={updatingPresence}
              onClick={() => handlePresenceChange('PRESENT')}
              className={`py-3 px-4 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                currentStatus === 'PRESENT'
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white hover:bg-green-50 text-green-700 border-green-200'
              }`}
            >
              🟢 PRESENT
            </button>

            <button
              type="button"
              disabled={updatingPresence}
              onClick={() => handlePresenceChange('BUSY')}
              className={`py-3 px-4 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                currentStatus === 'BUSY'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              🟡 BUSY (In Consultation)
            </button>

            <button
              type="button"
              disabled={updatingPresence}
              onClick={() => handlePresenceChange('AWAY')}
              className={`py-3 px-4 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                currentStatus === 'AWAY'
                  ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm'
                  : 'bg-white hover:bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}
            >
              ⏸️ AWAY (Break)
            </button>

            <button
              type="button"
              disabled={updatingPresence}
              onClick={() => handlePresenceChange('OFFLINE')}
              className={`py-3 px-4 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                currentStatus === 'OFFLINE'
                  ? 'bg-gray-700 text-white border-gray-700 shadow-sm'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              ⚪ OFFLINE (Left Clinic)
            </button>
          </div>
        </div>

        {/* Today's Appointments Section */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Scheduled Appointments
              </h2>
              <p className="text-xs text-gray-500">
                Patients scheduled for consultation with live clinical status controls.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
              Total: {appointments.length}
            </span>
          </div>

          {appointments.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              <span className="text-2xl block mb-1">📅</span>
              No appointments scheduled.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="pb-2">Token / ID</th>
                    <th className="pb-2">Patient</th>
                    <th className="pb-2">Slot Time</th>
                    <th className="pb-2">Priority</th>
                    <th className="pb-2">Current Status</th>
                    <th className="pb-2">Reason</th>
                    <th className="pb-2">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 font-mono font-bold text-blue-600">
                        {apt.appointmentNumber}
                      </td>
                      <td className="py-3">
                        <p className="font-semibold text-gray-800">
                          {apt.patient?.user?.name || 'Unknown Patient'}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {apt.patient?.user?.phone || 'No phone'}
                        </p>
                      </td>
                      <td className="py-3 font-mono text-gray-700">
                        {apt.slot?.startTime} &ndash; {apt.slot?.endTime}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            apt.priority === 'EMERGENCY'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : apt.priority === 'HIGH'
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : apt.priority === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {apt.priority}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            apt.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : apt.status === 'IN_PROGRESS'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : apt.status === 'CONFIRMED'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : apt.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          ● {apt.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600 max-w-xs truncate" title={apt.reason}>
                        {apt.reason || 'General checkup'}
                      </td>
                      <td className="py-3">
                        <select
                          value={apt.status}
                          disabled={updatingApptId === apt.id}
                          onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                          className="px-2 py-1 text-[11px] font-medium rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="NO_SHOW">NO_SHOW</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2-Column Section: Schedule & Presence History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Working Schedule Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Working Schedule</h3>
                  <p className="text-xs text-gray-500">
                    Slot Duration: <strong>{doctorData?.consultationDuration || 30} mins</strong>
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingSchedule(!isEditingSchedule)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition"
                >
                  {isEditingSchedule ? 'Cancel' : '⚙️ Configure Schedule'}
                </button>
              </div>

              {isEditingSchedule ? (
                /* Schedule Edit Form */
                <form onSubmit={handleScheduleSubmit} className="space-y-3">
                  <div className="mb-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Consultation Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      step={5}
                      value={consultationDuration}
                      onChange={(e) => setConsultationDuration(e.target.value)}
                      className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {schedules.map((item, idx) => (
                      <div
                        key={item.dayOfWeek}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                          item.isAvailable ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <label className="flex items-center gap-2 w-28 font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            onChange={(e) => {
                              const updated = [...schedules];
                              updated[idx].isAvailable = e.target.checked;
                              setSchedules(updated);
                            }}
                            className="rounded text-blue-600"
                          />
                          {item.dayOfWeek.slice(0, 3)}
                        </label>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={item.startTime}
                            disabled={!item.isAvailable}
                            onChange={(e) => {
                              const updated = [...schedules];
                              updated[idx].startTime = e.target.value;
                              setSchedules(updated);
                            }}
                            className="px-2 py-1 border rounded bg-white disabled:bg-gray-100 text-xs"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={item.endTime}
                            disabled={!item.isAvailable}
                            onChange={(e) => {
                              const updated = [...schedules];
                              updated[idx].endTime = e.target.value;
                              setSchedules(updated);
                            }}
                            className="px-2 py-1 border rounded bg-white disabled:bg-gray-100 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition"
                  >
                    Save Working Schedule
                  </button>
                </form>
              ) : (
                /* Schedule View Table */
                <div className="divide-y divide-gray-100 text-xs">
                  {doctorData?.availabilities?.length === 0 ? (
                    <p className="text-gray-400 py-4 text-center">
                      No schedule configured yet. Click "Configure Schedule" above.
                    </p>
                  ) : (
                    doctorData?.availabilities?.map((slot) => (
                      <div
                        key={slot.id}
                        className="py-2.5 flex items-center justify-between text-gray-700"
                      >
                        <span className="font-semibold text-gray-900 w-28">
                          {slot.dayOfWeek}
                        </span>
                        <span className="font-mono text-gray-600">
                          {slot.startTime} &ndash; {slot.endTime}
                        </span>
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 font-semibold rounded text-[10px]">
                          Active
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Presence History Audit Log */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Presence History Log
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Chronological log of presence status transitions recorded in PresenceLog.
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {presenceLogs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  No presence transitions logged yet.
                </p>
              ) : (
                presenceLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-gray-100 bg-gray-50/70 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPresenceBadgeColor(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          via {log.detectionMethod || 'MANUAL'}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-gray-600 text-[11px] mt-1">{log.notes}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 text-right">
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
          </div>
        </div>

        {/* Profile Edit Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b mb-4">
                <h3 className="text-base font-bold text-gray-900">
                  Edit Doctor Profile
                </h3>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Doctor Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Room / Clinic
                    </label>
                    <input
                      type="text"
                      value={profileForm.roomNumber}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          roomNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.specialization}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          specialization: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.department}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          department: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Experience (yrs)
                    </label>
                    <input
                      type="number"
                      value={profileForm.experience}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          experience: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={profileForm.consultationFee}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          consultationFee: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      value={profileForm.consultationDuration}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          consultationDuration: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Qualifications
                  </label>
                  <input
                    type="text"
                    value={profileForm.qualification}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        qualification: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 border rounded-lg font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        MediFlow AI &copy; Smart Hospital Appointment System &bull; Phase 4 Doctor Dashboard
      </footer>
    </div>
  );
}

export default DoctorDashboard;
