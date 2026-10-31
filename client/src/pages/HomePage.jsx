import ServerStatus from '../components/ServerStatus';

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-2 shadow-inner text-3xl">
            🏥
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            MediFlow AI
          </h1>
          <p className="text-xl text-blue-700 font-medium">
            Smart Hospital Appointment &amp; Doctor Availability System
          </p>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            A full-stack healthcare platform designed to optimize appointment allocation,
            manage doctor presence, and streamline patient waitlists.
          </p>
        </div>

        {/* Server Connectivity Section */}
        <div>
          <ServerStatus />
        </div>

        {/* Phase 1 Overview Info Box */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-xl mx-auto">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Phase 1 — Project Foundation
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>React frontend with Vite &amp; Tailwind CSS</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Express.js backend with modular routing &amp; controller</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>CORS configured for cross-origin client communication</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Socket.IO initialized for real-time infrastructure</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Axios client configured with API health monitoring</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 mt-12">
        MediFlow AI &copy; Capstone Project &bull; Built with React, Vite, Node.js &amp; Express
      </footer>
    </div>
  );
}

export default HomePage;

