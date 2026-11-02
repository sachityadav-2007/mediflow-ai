import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorDirectoryPage from './pages/DoctorDirectoryPage';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import BookAppointmentPage from './pages/BookAppointmentPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import PatientWaitlistPage from './pages/PatientWaitlistPage';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/doctors" element={<DoctorDirectoryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Role-Based Routes */}
          <Route
            path="/book"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <BookAppointmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-appointments"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <MyAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/waitlist"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <PatientWaitlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard initialTab="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/doctors"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard initialTab="doctors" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard initialTab="patients" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/appointments"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard initialTab="appointments" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/waitlist"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard initialTab="waitlist" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback wildcard redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
