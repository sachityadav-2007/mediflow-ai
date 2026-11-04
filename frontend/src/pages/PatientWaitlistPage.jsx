import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getMyWaitlist, leaveWaitlist } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

function PatientWaitlistPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [leavingId, setLeavingId] = useState(null);
  const [confirmLeaveModalOpen, setConfirmLeaveModalOpen] = useState(false);
  const [entryToLeave, setEntryToLeave] = useState(null);

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

  // Real-time Socket.IO listeners
  useSocket('waitlist_updated', () => fetchWaitlist());
  useSocket('appointment_allocated', () => fetchWaitlist());

  const promptLeave = (entry) => {
    setEntryToLeave(entry);
    setConfirmLeaveModalOpen(true);
  };

  const handleConfirmLeave = async () => {
    if (!entryToLeave) return;
    setLeavingId(entryToLeave.id);
    setActionMessage({ type: '', text: '' });

    try {
      const res = await leaveWaitlist(entryToLeave.id);
      if (res?.success) {
        setActionMessage({
          type: 'success',
          text: `You have successfully left the waitlist for Dr. ${
            entryToLeave.doctor?.user?.name || 'the doctor'
          }.`,
        });
        setEntries((prev) =>
          prev.map((item) =>
            item.id === entryToLeave.id ? { ...item, status: 'CANCELLED' } : item
          )
        );
        setConfirmLeaveModalOpen(false);
        setEntryToLeave(null);
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
          <Badge variant="warning" size="xs" dot dotPulse>
            IN QUEUE (ACTIVE)
          </Badge>
        );
      case 'ALLOCATED':
        return (
          <Badge variant="success" size="xs" dot>
            SLOT ALLOCATED
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="neutral" size="xs">
            LEFT WAITLIST
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        <PageHeader
          title="My Standby Waitlist Queue"
          subtitle="Track your real-time clinical priority score, standby queue standings, and automated reallocation when cancellations arise."
          badge={
            <Badge variant="indigo" size="sm" dot>
              Rule-Based AI Triage
            </Badge>
          }
          actions={
            <Link to="/book">
              <Button variant="primary" size="sm" icon={<span>📅</span>}>
                Browse Open Slots
              </Button>
            </Link>
          }
        />

        {/* Feedback Alert */}
        {actionMessage.text && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between shadow-2xs ${
              actionMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span className="font-semibold">{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage({ type: '', text: '' })}
              className="text-slate-400 hover:text-slate-700 text-base font-bold ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Waitlist Entries List */}
        {loading ? (
          <LoadingSkeleton variant="list" count={3} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon="⏳"
            title="Not On Any Waitlist"
            description="When your preferred specialist has no open booking slots, you can join their standby queue for automated allocation."
            action={
              <Link to="/doctors">
                <Button variant="primary" size="sm">
                  Find Doctors
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const isPending = entry.status === 'PENDING';
              const formattedDate = new Date(entry.preferredDate).toLocaleDateString(
                'en-US',
                {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }
              );

              return (
                <Card key={entry.id} hover className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          Dr. {entry.doctor?.user?.name || 'Medical Specialist'}
                        </h3>
                        {getStatusBadge(entry.status)}
                      </div>
                      <p className="text-xs text-[#0072CE] font-semibold">
                        {entry.doctor?.specialization} &bull; {entry.doctor?.department}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700 text-sm bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                        Score: {entry.priorityScore || 0} pts
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Preferred Date</span>
                      <strong className="text-slate-800">{formattedDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Severity Tier</span>
                      <strong className="text-slate-800">{entry.priority}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Clinical Urgency</span>
                      <strong className="text-slate-800">{entry.urgency}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Joined Standby</span>
                      <span className="text-slate-600 font-mono">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {entry.status === 'ALLOCATED' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                      <span className="font-semibold">
                        🎉 Great news! An open slot was automatically allocated to you!
                      </span>
                      <Link to="/my-appointments">
                        <Button variant="success" size="sm">
                          View Pass
                        </Button>
                      </Link>
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 italic">
                        Standing by for slot releases from cancellations or reschedules.
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => promptLeave(entry)}
                        isLoading={leavingId === entry.id}
                      >
                        Leave Waitlist
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Explainable AI Formula Card */}
        <Card className="p-6 bg-slate-900 text-white border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
            <span>⚖️ Algorithmic Transparency</span>
            <span>&bull;</span>
            <span>Deterministic Triage</span>
          </div>
          <h4 className="text-sm font-bold text-white tracking-tight">
            How Your Priority Score Is Calculated
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            MediFlow AI’s allocation engine ensures medical justice. Standby positions are calculated using:
            <br />
            <code className="text-emerald-400 font-mono mt-1 inline-block">
              Priority Score = (Severity Tier Weight) + (Urgency Weight) + (+1 pt per 30 mins standby)
            </code>
          </p>
        </Card>
      </main>

      {/* Confirmation Dialog for Leaving Waitlist */}
      <ConfirmDialog
        isOpen={confirmLeaveModalOpen}
        onClose={() => setConfirmLeaveModalOpen(false)}
        onConfirm={handleConfirmLeave}
        title="Leave Waitlist Standby?"
        message={`Are you sure you want to leave the waitlist for Dr. ${
          entryToLeave?.doctor?.user?.name || 'the doctor'
        }? You will forfeit your accumulated priority score and queue position.`}
        confirmText="Yes, Leave Queue"
        cancelText="Stay on Standby"
        variant="danger"
        isLoading={Boolean(leavingId)}
      />

      <footer className="text-center py-5 text-xs text-slate-400 bg-white border-t border-slate-200">
        MediFlow AI 2.0 &bull; Smart Hospital Appointment, Doctor Availability &amp; Queue Management Network
      </footer>
    </div>
  );
}

export default PatientWaitlistPage;
