import axios from 'axios';

// Create an Axios instance with the backend base URL and credentials enabled
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
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

export default api;
