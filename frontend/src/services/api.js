import axios from 'axios';

// Create an Axios instance with the backend base URL and credentials enabled
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  timeout: 8000,
  withCredentials: true, // Enables sending and receiving HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// -----------------------------------------------------------------------------
// Health Check Service
// -----------------------------------------------------------------------------
export const getHealthStatus = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

// -----------------------------------------------------------------------------
// Authentication Services
// -----------------------------------------------------------------------------
export const registerUser = async (userData) => {
  const response = await api.post('/api/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/api/auth/logout');
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

// -----------------------------------------------------------------------------
// Doctor Management Services
// -----------------------------------------------------------------------------

// Fetch doctors directory with optional search & specialization filter
export const getDoctors = async (params = {}) => {
  const response = await api.get('/api/doctors', { params });
  return response.data;
};

// Fetch single doctor details by doctor ID
export const getDoctorById = async (id) => {
  const response = await api.get(`/api/doctors/${id}`);
  return response.data;
};

// Fetch authenticated doctor's profile
export const getDoctorProfile = async () => {
  const response = await api.get('/api/doctors/profile');
  return response.data;
};

// Update authenticated doctor's profile
export const updateDoctorProfile = async (profileData) => {
  const response = await api.put('/api/doctors/profile', profileData);
  return response.data;
};

// Fetch doctor schedule
export const getDoctorSchedule = async (doctorId) => {
  const response = await api.get(`/api/doctors/${doctorId}/schedule`);
  return response.data;
};

// Update authenticated doctor's schedule
export const updateDoctorSchedule = async (scheduleData) => {
  const response = await api.put('/api/doctors/schedule', scheduleData);
  return response.data;
};

// -----------------------------------------------------------------------------
// Doctor Presence Services
// -----------------------------------------------------------------------------

// Fetch current presence list of all doctors
export const getAllPresences = async () => {
  const response = await api.get('/api/presence');
  return response.data;
};

// Fetch presence and history for a specific doctor
export const getDoctorPresence = async (doctorId) => {
  const response = await api.get(`/api/presence/${doctorId}`);
  return response.data;
};

// Update authenticated doctor's presence status
export const updateDoctorPresence = async (status, notes = '') => {
  const response = await api.put('/api/presence/status', { status, notes });
  return response.data;
};

// -----------------------------------------------------------------------------
// Appointment Services
// -----------------------------------------------------------------------------

// Fetch available slots for a doctor on a specific date (YYYY-MM-DD)
export const getAvailableSlots = async (doctorId, date) => {
  const response = await api.get(`/api/appointments/slots/${doctorId}`, {
    params: { date },
  });
  return response.data;
};

// Book an appointment (Patient only)
export const bookAppointment = async (bookingData) => {
  const response = await api.post('/api/appointments', bookingData);
  return response.data;
};

// Get logged-in patient's appointments
export const getPatientAppointments = async () => {
  const response = await api.get('/api/appointments/my');
  return response.data;
};

// Get logged-in doctor's appointments
export const getDoctorAppointments = async () => {
  const response = await api.get('/api/appointments/doctor/my');
  return response.data;
};

// Get today's appointments for logged-in doctor
export const getTodayDoctorAppointments = async () => {
  const response = await api.get('/api/appointments/doctor/today');
  return response.data;
};

// Cancel an appointment
export const cancelAppointment = async (appointmentId) => {
  const response = await api.put(`/api/appointments/${appointmentId}/cancel`);
  return response.data;
};

// Reschedule an appointment (Phase 10)
export const rescheduleAppointment = async (appointmentId, rescheduleData) => {
  const response = await api.put(`/api/appointments/${appointmentId}/reschedule`, rescheduleData);
  return response.data;
};

// Update appointment status (Doctor only)
export const updateAppointmentStatus = async (appointmentId, status) => {
  const response = await api.put(`/api/appointments/${appointmentId}/status`, {
    status,
  });
  return response.data;
};

// -----------------------------------------------------------------------------
// Smart Waitlist Services (Phase 6)
// -----------------------------------------------------------------------------

// Join waitlist (Patient only)
export const joinWaitlist = async (waitlistData) => {
  const response = await api.post('/api/waitlist', waitlistData);
  return response.data;
};

// Get patient's active and historical waitlist entries
export const getMyWaitlist = async () => {
  const response = await api.get('/api/waitlist/my');
  return response.data;
};

// Get doctor's waitlist queue ranked by priority score
export const getDoctorWaitlist = async () => {
  const response = await api.get('/api/waitlist/doctor/my');
  return response.data;
};

// Leave waitlist (Patient only)
export const leaveWaitlist = async (waitlistId) => {
  const response = await api.put(`/api/waitlist/${waitlistId}/leave`);
  return response.data;
};

// Trigger smart allocation demonstration (Admin/Doctor)
export const triggerSmartAllocation = async (allocationData) => {
  const response = await api.post('/api/waitlist/allocate', allocationData);
  return response.data;
};

// -----------------------------------------------------------------------------
// Admin Analytics & Oversight Services (Phase 8)
// -----------------------------------------------------------------------------

// Fetch hospital-wide statistics (Admin only)
export const getAdminStats = async () => {
  const response = await api.get('/api/admin/stats');
  return response.data;
};

// Fetch all doctors with presence and metrics (Admin only)
export const getAdminDoctors = async () => {
  const response = await api.get('/api/admin/doctors');
  return response.data;
};

// Fetch single doctor's complete admin profile, schedule, and logs
export const getAdminDoctorDetails = async (doctorId) => {
  const response = await api.get(`/api/admin/doctors/${doctorId}`);
  return response.data;
};

// Fetch registered patients directory (Admin only)
export const getAdminPatients = async () => {
  const response = await api.get('/api/admin/patients');
  return response.data;
};

// Fetch hospital appointments with optional status, doctorId, date filters
export const getAdminAppointments = async (params = {}) => {
  const response = await api.get('/api/admin/appointments', { params });
  return response.data;
};

// Fetch hospital waitlist with optional status filter
export const getAdminWaitlist = async (params = {}) => {
  const response = await api.get('/api/admin/waitlist', { params });
  return response.data;
};

// -----------------------------------------------------------------------------
// Phase 10: AI Prediction & Smart Scheduling Services
// -----------------------------------------------------------------------------

// Predict doctor availability probability
export const getDoctorAvailabilityPrediction = async (doctorId, date, startTime) => {
  const response = await api.get('/api/ai/doctor-availability', {
    params: { doctorId, date, startTime },
  });
  return response.data;
};

// Forecast hospital / department appointment demand
export const getAppointmentDemandForecast = async (department) => {
  const response = await api.get('/api/ai/appointment-demand', {
    params: { department },
  });
  return response.data;
};

// Estimate patient waiting time
export const getEstimatedWaitingTime = async (doctorId, date, startTime) => {
  const response = await api.get('/api/ai/waiting-time', {
    params: { doctorId, date, startTime },
  });
  return response.data;
};

// Get smart slot recommendations
export const getSmartSlotRecommendations = async (params = {}) => {
  const response = await api.get('/api/ai/recommended-slots', { params });
  return response.data;
};

// Get doctor forecast & analytics
export const getDoctorForecast = async (doctorId) => {
  const response = await api.get(`/api/ai/forecast/doctor/${doctorId}`);
  return response.data;
};

// Get hospital executive AI analytics (Admin only)
export const getAdminAIAnalytics = async () => {
  const response = await api.get('/api/ai/admin/analytics');
  return response.data;
};

// -----------------------------------------------------------------------------
// Phase 11: QR Check-in & Live Queue Services
// -----------------------------------------------------------------------------

// Fetch signed QR code and token for an appointment
export const getAppointmentQR = async (appointmentId) => {
  const response = await api.get(`/api/check-in/appointment/${appointmentId}/qr`);
  return response.data;
};

// Process patient check-in via scanned QR token or appointment number
export const checkInAppointment = async (token) => {
  const response = await api.post('/api/check-in/scan', { token });
  return response.data;
};

// Fetch doctor's live OPD queue (supports public masked privacy mode)
export const getLiveQueue = async (doctorId, isPublic = false) => {
  const response = await api.get(`/api/check-in/queue/${doctorId}`, {
    params: { public: isPublic ? 'true' : 'false' },
  });
  return response.data;
};

// Doctor / Admin: Update consultation status (START / COMPLETE / NO_SHOW)
export const updateConsultationState = async (appointmentId, action) => {
  const response = await api.put(`/api/check-in/queue/consultation/${appointmentId}`, {
    action,
  });
  return response.data;
};

// Admin: Trigger scheduled reminder emails for upcoming appointments
export const sendAppointmentReminders = async () => {
  const response = await api.post('/api/check-in/reminders/send');
  return response.data;
};

// -----------------------------------------------------------------------------
// Doctor QR Attendance & Hospital Presence Services
// -----------------------------------------------------------------------------

// Admin: Generate a new hospital check-in QR code
export const generateHospitalQR = async ({ location, validityMinutes }) => {
  const response = await api.post('/api/presence/qr/generate', {
    location,
    validityMinutes,
  });
  return response.data;
};

// Admin: Revoke an active hospital QR code
export const revokeHospitalQR = async (codeId) => {
  const response = await api.post('/api/presence/qr/revoke', { codeId });
  return response.data;
};

// Admin: Get all currently active hospital QR codes
export const getActiveHospitalQRCodes = async () => {
  const response = await api.get('/api/presence/qr/active');
  return response.data;
};

// Admin: Get QR scan audit activity logs
export const getQRScanActivity = async (limit = 50) => {
  const response = await api.get('/api/presence/qr/scans', {
    params: { limit },
  });
  return response.data;
};

// Doctor: Scan hospital QR code and register check-in
export const doctorCheckInQR = async (token) => {
  const response = await api.post('/api/presence/qr/check-in', { token });
  return response.data;
};

// Doctor: Check out of hospital attendance
export const doctorCheckOutQR = async (notes = '') => {
  const response = await api.post('/api/presence/qr/check-out', { notes });
  return response.data;
};

// Doctor: Get current attendance status & today's work sessions
export const getDoctorMyAttendance = async () => {
  const response = await api.get('/api/presence/me');
  return response.data;
};

// Admin or Doctor: Get attendance history records with optional filters
export const getAttendanceHistory = async (params = {}) => {
  const response = await api.get('/api/presence/history', { params });
  return response.data;
};

export default api;
