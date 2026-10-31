import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-2.5 py-1 text-xs font-bold bg-purple-500/30 border border-purple-300/30 rounded-full mb-2">
                👑 Hospital Administrator
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome, {user?.name || 'Administrator'}!
              </h1>
              <p className="text-purple-100 text-sm mt-1">
                MediFlow AI Control Center &bull; Hospital-wide Oversight
              </p>
            </div>
            <button
              onClick={logout}
              className="self-start sm:self-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Admin Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-2xl">👥</span>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mt-2">Account Details</h3>
            <p className="text-base font-bold text-gray-800 mt-1">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <p className="text-xs text-purple-600 font-semibold mt-1">Role: {user?.role}</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-2xl">🏥</span>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mt-2">Hospital System</h3>
            <p className="text-base font-bold text-gray-800 mt-1">MediFlow AI Core</p>
            <p className="text-xs text-gray-500">PostgreSQL + Prisma</p>
            <p className="text-xs text-green-600 font-semibold mt-1">Status: Operational</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <span className="text-2xl">🛡️</span>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mt-2">Security Level</h3>
            <p className="text-base font-bold text-gray-800 mt-1">Full Administrative Access</p>
            <p className="text-xs text-gray-500">HTTP-only JWT Authentication</p>
            <p className="text-xs text-blue-600 font-semibold mt-1">Role-Based Guard Active</p>
          </div>
        </div>

        {/* Phase 3 Status Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
          <h4 className="font-bold flex items-center gap-2 mb-1">
            <span>✅</span>
            <span>Phase 3 — Authentication &amp; RBAC Successfully Activated</span>
          </h4>
          <p className="text-xs text-blue-700">
            You are securely logged into the Admin portal via HTTP-only cookie.
            Full administrative features (doctor approvals, queue analytics, system configurations)
            will be expanded in subsequent phases.
          </p>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        MediFlow AI &copy; Smart Hospital Appointment System &bull; Phase 3 Admin Portal
      </footer>
    </div>
  );
}

export default AdminDashboard;

