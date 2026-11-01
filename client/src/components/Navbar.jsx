import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardPath = (role) => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'DOCTOR':
        return '/doctor/dashboard';
      case 'PATIENT':
        return '/patient/dashboard';
      default:
        return '/';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🏥</span>
              <span className="font-extrabold text-xl text-blue-700 tracking-tight">
                MediFlow AI
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md"
            >
              Home
            </Link>
            <Link
              to="/doctors"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md"
            >
              Doctors Directory
            </Link>

            {user?.role === 'PATIENT' && (
              <>
                <Link
                  to="/book"
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md"
                >
                  Book Appointment
                </Link>
                <Link
                  to="/my-appointments"
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md"
                >
                  My Appointments
                </Link>
              </>
            )}

            {user ? (
              <>
                <Link
                  to={getDashboardPath(user.role)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md bg-blue-50"
                >
                  Dashboard
                </Link>

                <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-gray-800">
                      {user.name}
                    </p>
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 uppercase">
                      {user.role}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="ml-2 text-xs font-semibold px-3 py-2 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200 transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

