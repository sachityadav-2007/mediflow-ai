import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getMyWaitlist, leaveWaitlist } from '../services/api';
import { useSocket } from '../hooks/useSocket';

function PatientWaitlistPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [leavingId, setLeavingId] = useState(null);

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const res = await getMyWaitlist();
      if (res?.success) {
        setEntries(res.waitlist || []);
      }
    } catch (err) {
      console.error('Failed to load waitlist entries:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load your waitlist status.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  // Real-time Socket.IO: refresh waitlist status automatically
  useSocket('waitlist_updated', () => fetchWaitlist());
  useSocket('appointment_allocated', () => fetchWaitlist());

  const handleLeave = async (id, doctorName) => {
    const confirmed = window.confirm(
      `Are you sure you want to leave the waitlist for ${doctorName}? You will lose your current priority queue position.`
    );
    if (!confirmed) return;

    setLeavingId(id);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await leaveWaitlist(id);
      if (res?.success) {
        setActionMessage({
          type: 'success',
          text: `You have successfully left the waitlist for ${doctorName}.`,
        });
        setEntries((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: 'CANCELLED' } : item
          )
        );
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to leave waitlist.',
      });
    } finally {
      setLeavingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            ● IN QUEUE (ACTIVE)
          </span>
        );
      case 'ALLOCATED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ✓ SLOT ALLOCATED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            ✕ LEFT WAITLIST
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
              <span>🧠 Smart Waitlist</span>
              <span>&bull;</span>
              <span>Phase 6 AI-Inspired Allocation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              My Waitlist Status
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Track your real-time priority score and automated queue position for high-demand doctors.
            </p>
          </div>

          <Link
            to="/book"
            className="w-fit px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition"
          >
            + Join Another Waitlist
          </Link>
        </div>

        {/* Explainable AI Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md border border-blue-800">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚖️</span>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-blue-100">
                How Smart Allocation Works
              </h2>
              <p className="text-xs text-blue-200 leading-relaxed">
                MediFlow AI uses a transparent priority scoring system to rank waitlisted patients
                based on medical priority, urgency, and waiting time. When a valid appointment slot
                becomes available, the system selects the highest-priority eligible patient.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-blue-300">
                <span className="bg-blue-800/60 px-2 py-0.5 rounded border border-blue-700">
                  Medical Severity: 10–40 pts
                </span>
                <span className="bg-blue-800/60 px-2 py-0.5 rounded border border-blue-700">
                  Clinical Urgency: 5–20 pts
                </span>
                <span className="bg-blue-800/60 px-2 py-0.5 rounded border border-blue-700">
                  Waiting Time: +1 pt / 30 mins (max 30 pts)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action / Error Banner */}
        {actionMessage.text && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
              actionMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-green-50 border-green-200 text-green-800'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage({ type: '', text: '' })}
              className="text-xs font-bold text-gray-400 hover:text-gray-700 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Waitlist Entries List */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-400">Loading your waitlist status...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-md mx-auto space-y-3">
            <span className="text-4xl block">📋</span>
            <h3 className="text-base font-bold text-gray-800">
              No Active Waitlist Entries
            </h3>
            <p className="text-xs text-gray-500">
              You are not currently in any doctor's waitlist. If a doctor's slots are fully booked,
              you can join their smart waitlist from the booking page.
            </p>
            <Link
              to="/book"
              className="inline-block mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              Find Doctors &amp; Check Slots
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((item) => {
              const doctorName = item.doctor?.user?.name || 'Specialist Doctor';
              const isPending = item.status === 'PENDING';
              const score = item.currentScore || item.priorityScore || 0;
              const joinedFormatted = new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 hover:shadow-md transition space-y-4"
                >
                  {/* Top Bar: Doctor & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-gray-900">{doctorName}</span>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-gray-500">
                        Requested for: <strong>{new Date(item.preferredDate).toLocaleDateString()}</strong> &bull; Joined: {joinedFormatted}
                      </p>
                    </div>

                    {/* Score Badge */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center sm:text-right">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">
                        Priority Score
                      </span>
                      <span className="text-2xl font-black text-blue-700 font-mono">
                        {score} <span className="text-xs font-normal text-gray-500">pts</span>
                      </span>
                    </div>
                  </div>

                  {/* Score Breakdown (Explainable AI) */}
                  {item.explanation && (
                    <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="flex items-center justify-between sm:block">
                        <span className="text-gray-400 block text-[10px]">Medical Priority:</span>
                        <strong className="text-gray-800">
                          {item.priority} ({item.explanation.breakdown.medicalPriority.points} pts)
                        </strong>
                      </div>
                      <div className="flex items-center justify-between sm:block">
                        <span className="text-gray-400 block text-[10px]">Clinical Urgency:</span>
                        <strong className="text-gray-800">
                          {item.urgency} ({item.explanation.breakdown.urgency.points} pts)
                        </strong>
                      </div>
                      <div className="flex items-center justify-between sm:block">
                        <span className="text-gray-400 block text-[10px]">Waiting Time Bonus:</span>
                        <strong className="text-green-700">
                          +{item.explanation.breakdown.waitingTime.points} pts ({item.explanation.breakdown.waitingTime.elapsedMinutes} mins)
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Notes / Reason */}
                  {item.notes && (
                    <p className="text-xs text-gray-600 italic">
                      Symptoms / Reason: "{item.notes}"
                    </p>
                  )}

                  {/* Actions */}
                  {isPending && (
                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        type="button"
                        disabled={leavingId === item.id}
                        onClick={() => handleLeave(item.id, doctorName)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-lg border border-red-200 transition cursor-pointer disabled:opacity-50"
                      >
                        {leavingId === item.id ? 'Leaving...' : 'Leave Waitlist'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 bg-white border-t border-gray-100">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Doctor Availability Management System
      </footer>
    </div>
  );
}

export default PatientWaitlistPage;

