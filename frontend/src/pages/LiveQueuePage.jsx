import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getLiveQueue } from '../services/api';
import { useSocket } from '../hooks/useSocket';

function LiveQueuePage() {
  const { doctorId } = useParams();
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchQueue = async () => {
    if (!doctorId) return;
    try {
      // isPublic=true masks patient names for hospital waiting room privacy
      const data = await getLiveQueue(doctorId, true);
      if (data && data.success) {
        setQueueData(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load live OPD queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); // Polling backup
    return () => clearInterval(interval);
  }, [doctorId]);

  // Real-time Socket.IO listeners
  useSocket('queue_updated', (data) => {
    if (!data?.doctorId || data.doctorId === doctorId) {
      fetchQueue();
    }
  });

  useSocket('patient_checked_in', (data) => {
    if (!data?.doctorId || data.doctorId === doctorId) {
      fetchQueue();
    }
  });

  useSocket('appointment_status_changed', (data) => {
    if (!data?.doctorId || data.doctorId === doctorId) {
      fetchQueue();
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 font-semibold text-sm">Connecting to OPD Live Queue...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !queueData) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 max-w-lg mx-auto w-full p-6 flex items-center">
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center w-full">
            <span className="text-4xl block mb-3">⚠️</span>
            <h2 className="text-lg font-bold text-red-400">Queue Unavailable</h2>
            <p className="text-sm text-slate-400 mt-2">{error || 'Doctor not found'}</p>
            <Link
              to="/doctors"
              className="mt-6 inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-xs transition"
            >
              &larr; Back to Doctors Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { doctor, currentConsultation, checkedInQueue, scheduledUpcoming, completedCount } =
    queueData;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link to="/doctors" className="hover:text-blue-400 transition">
                Doctors
              </Link>
              <span>/</span>
              <span className="text-slate-200">OPD Queue Display</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🏥 Live OPD Consultation Board</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE SYNC
              </span>
              <span className="block text-[11px] text-slate-500 mt-1">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <button
              onClick={fetchQueue}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Doctor Information Banner */}
        <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-950/60 rounded-3xl p-6 border border-blue-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-3xl shrink-0">
              🩺
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">{doctor.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {doctor.currentPresence || 'AVAILABLE'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-300 font-medium mt-0.5">
                {doctor.specialization} &bull; {doctor.department}
              </p>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <span>📍 Consultation Suite:</span>
                <strong className="text-white font-bold">{doctor.roomNumber}</strong>
                <span>&bull;</span>
                <span>Avg. Duration: {doctor.consultationDuration || 30} mins</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="px-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                In Room
              </span>
              <strong className="text-lg font-black text-emerald-400">
                {currentConsultation ? '1' : '0'}
              </strong>
            </div>
            <div className="px-3 border-x border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                Waiting
              </span>
              <strong className="text-lg font-black text-amber-400">
                {checkedInQueue.length}
              </strong>
            </div>
            <div className="px-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                Completed
              </span>
              <strong className="text-lg font-black text-blue-400">{completedCount}</strong>
            </div>
          </div>
        </div>

        {/* NOW CONSULTING (Active Consultation) */}
        <div className="bg-slate-900/90 rounded-3xl p-6 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow-md">
            NOW IN CABIN
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            Currently In Consultation
          </h3>

          {currentConsultation ? (
            <div className="bg-slate-800/80 rounded-2xl p-5 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold block mb-1">
                  TOKEN #{currentConsultation.appointmentNumber}
                </span>
                <h4 className="text-2xl font-black text-white">
                  {currentConsultation.patientName}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Slot: {currentConsultation.slotTime} &bull; Priority:{' '}
                  <span className="text-amber-300 font-semibold">
                    {currentConsultation.priority}
                  </span>
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-700 sm:pl-6">
                <span className="text-xs text-slate-400 block font-medium">Status</span>
                <span className="inline-block mt-1 px-4 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  IN PROGRESS 🩺
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700">
              <span className="text-3xl block mb-2">🚪</span>
              <p className="text-sm font-semibold text-slate-300">
                Consultation suite is currently ready for the next patient.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Patients in queue will be called by token number.
              </p>
            </div>
          )}
        </div>

        {/* CHECKED-IN WAITING QUEUE */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>👥 Checked-In Waiting List</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {checkedInQueue.length} Present in OPD
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Names are masked to protect patient confidentiality. Please watch for your Token
                Number.
              </p>
            </div>
          </div>

          {checkedInQueue.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800">
              <span className="text-4xl block mb-2">🛋️</span>
              <p className="text-sm font-bold text-slate-300">No patients waiting right now</p>
              <p className="text-xs text-slate-500 mt-1">
                Patients who check in via QR code will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {checkedInQueue.map((item) => (
                <div
                  key={item.appointmentId}
                  className="bg-slate-800/70 hover:bg-slate-800 rounded-2xl p-4 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-black text-amber-300 text-base shrink-0">
                      #{item.queuePosition}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-base">
                          {item.patientName}
                        </span>
                        <span className="font-mono text-[11px] text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                          {item.appointmentNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Slot: {item.slotTime} &bull; Priority: {item.priority}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/60">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        Estimated Wait
                      </span>
                      <strong className="text-xs font-bold text-emerald-400">
                        ⏱️ ~{item.formattedWait}
                      </strong>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      CHECKED IN
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UPCOMING TODAY (NOT YET CHECKED IN) */}
        {scheduledUpcoming.length > 0 && (
          <div className="bg-slate-900/60 rounded-3xl p-5 border border-slate-800/70">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Upcoming Scheduled Today ({scheduledUpcoming.length} appointments pending check-in)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {scheduledUpcoming.map((item) => (
                <div
                  key={item.appointmentId}
                  className="bg-slate-800/40 rounded-xl p-3 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-200 block truncate">
                      {item.patientName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {item.appointmentNumber}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/60 px-2 py-1 rounded border border-blue-900/50">
                    {item.startTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <p className="text-center text-xs text-slate-500 pt-4">
          🔒 Patient privacy protected: Public queue displays do not expose full names or medical
          diagnoses.
        </p>
      </main>

      <footer className="bg-slate-950 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        MediFlow AI &bull; Smart Hospital OPD Live Queue &bull; Real-time Socket.IO Synchronized
      </footer>
    </div>
  );
}

export default LiveQueuePage;

