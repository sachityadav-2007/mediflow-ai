import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target after login
  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);

      // Redirect based on user role or previous location
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'DOCTOR') {
        navigate('/doctor/dashboard', { replace: true });
      } else {
        navigate('/patient/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for quick viva demonstration
  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <span className="text-4xl">🔐</span>
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
              Sign In to MediFlow AI
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Access your personalized clinical or administrative portal
            </p>
          </div>

          <div className="mt-8 bg-white py-8 px-6 shadow-md rounded-2xl border border-gray-100 sm:px-10">
            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm rounded-lg shadow-sm transition duration-150 cursor-pointer"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Quick Demo Credentials Box for Viva */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Quick Demo Accounts (Click to Fill):
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@mediflow.com', 'password123')}
                  className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium rounded border border-purple-200 transition"
                >
                  👑 Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('dr.sharma@mediflow.com', 'password123')}
                  className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded border border-blue-200 transition"
                >
                  🩺 Doctor
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('rahul.verma@example.com', 'password123')}
                  className="py-1.5 px-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200 transition"
                >
                  🧑‍⚕️ Patient
                </button>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
                Register as Patient or Doctor
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-4 text-xs text-gray-400">
        MediFlow AI &copy; Smart Hospital Appointment System &bull; Phase 3
      </footer>
    </div>
  );
}

export default LoginPage;

