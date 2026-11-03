import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show simple loading spinner while session is being verified
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 font-medium">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required, verify user role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the user's role-appropriate dashboard
    const roleRoutes = {
      ADMIN: '/admin/dashboard',
      DOCTOR: '/doctor/dashboard',
      PATIENT: '/patient/dashboard',
    };
    const targetRoute = roleRoutes[user.role] || '/';
    return <Navigate to={targetRoute} replace />;
  }

  return children;
}

export default ProtectedRoute;

