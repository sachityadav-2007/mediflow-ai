import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  getPatientAppointments,
  getMyWaitlist,
  getSmartSlotRecommendations,
} from '../services/api';
import { useSocket } from '../hooks/useSocket';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

function PatientDashboard() {
  const { user } = useAuth();
  const profile = user?.patientProfile;

  const [appointments, setAppointments] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [recommendedSlots, setRecommendedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [aptRes, wlRes, recRes] = await Promise.all([
        getPatientAppointments().catch((err) => {
          console.warn('Appointments fetch notice:', err.message);
          return { appointments: [] };
        }),
        getMyWaitlist().catch((err) => {
          console.warn('Waitlist fetch notice:', err.message);
          return { waitlist: [] };
        }),
        getSmartSlotRecommendations({ limit: 4 }).catch((err) => {
          console.warn('AI recommendations fetch notice:', err.message);
          return { recommendations: [] };
        }),
      ]);

      if (aptRes?.appointments) {
        setAppointments(aptRes.appointments);
      }
      if (wlRes?.waitlist) {
        setWaitlistEntries(wlRes.waitlist);
      }
      if (recRes?.recommendations) {
        setRecommendedSlots(recRes.recommendations);
      }
    } catch (err) {
      console.error('Failed to load patient dashboard records:', err);
      setError('Unable to synchronize patient dashboard records. Please check connectivity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time Socket.IO listeners
  useSocket('appointment_created', fetchDashboardData);
  useSocket('appointment_cancelled', fetchDashboardData);
  useSocket('appointment_allocated', fetchDashboardData);
  useSocket('waitlist_updated', fetchDashboardData);
  useSocket('ai_forecast_updated', fetchDashboardData);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS'
  );

  const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED');
  const activeWaitlists = waitlistEntries.filter((w) => w.status === 'PENDING');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="primary">CONFIRMED</Badge>;
      case 'SCHEDULED':
        return <Badge variant="indigo">SCHEDULED</Badge>;
      case 'IN_PROGRESS':
        return (
          <Badge variant="purple" dot dotPulse>
            IN PROGRESS
          </Badge>
        );
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      case 'ALLOCATED':
        return <Badge variant="teal">ALLOCATED</Badge>;
      case 'PENDING':
        return <Badge variant="warning">WAITLIST</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Welcome Page Header */}
        <PageHeader
          title={`Welcome back, ${user?.name || 'Patient'}!`}
          subtitle="Your personal MediFlow AI healthcare center: view scheduled visits, digital check-in QR passes, and automated waitlist standby."
          badge={
            <Badge variant="teal" size="sm" dot>
              Patient Care Portal
            </Badge>
          }
          actions={
            <div className="flex flex-wrap gap-2.5">
              <Link to="/find-specialist">
                <Button variant="outline" size="sm" icon={<span>🧭</span>}>
                  Find Specialist
                </Button>
              </Link>
              <Link to="/book">
                <Button variant="primary" size="sm" icon={<span>📅</span>}>
                  Book Consultation
                </Button>
              </Link>
              <Link to="/waitlist">
                <Button variant="outline" size="sm" icon={<span>⏳</span>}>
                  Smart Waitlist
                </Button>
              </Link>
              <Link to="/doctors">
                <Button variant="ghost" size="sm" icon={<span>🩺</span>}>
                  Find Doctors
                </Button>
              </Link>
            </div>
          }
        />

        {error && (
          <ErrorState
            title="Dashboard Sync Notice"
            message={error}
            onRetry={fetchDashboardData}
          />
        )}

        {/* High-Level Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <StatCard
            title="Upcoming Consultations"
            value={upcomingAppointments.length}
            subtitle={
              upcomingAppointments.length > 0
                ? 'Confirmed & scheduled visits'
                : 'No active upcoming visits'
            }
            icon="📅"
            iconBg="bg-blue-50 text-[#0072CE]"
            badge={
              upcomingAppointments.length > 0 ? (
                <Badge variant="primary" size="xs">
                  Active
                </Badge>
              ) : null
            }
          />

          <StatCard
            title="Waitlist Standby"
            value={activeWaitlists.length}
            subtitle={
              activeWaitlists.length > 0
                ? 'Monitored for cancellations'
                : 'Not on any waitlist'
            }
            icon="⏳"
            iconBg="bg-amber-50 text-amber-700"
            badge={
              activeWaitlists.length > 0 ? (
                <Badge variant="warning" size="xs">
                  Standby
                </Badge>
              ) : null
            }
          />

          <StatCard
            title="Completed Visits"
            value={completedAppointments.length}
            subtitle="Historical clinical consultations"
            icon="✅"
            iconBg="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            title="Digital QR Pass"
            value="Active"
            subtitle="Verified touchless reception token"
            icon="📲"
            iconBg="bg-purple-50 text-purple-700"
            badge={
              <Badge variant="purple" size="xs">
                HMAC Signed
              </Badge>
            }
          />
        </div>

        {/* AI Health Navigation Assistant Feature Card */}
        <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white rounded-3xl p-6 border border-blue-200 shadow-xs mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0072CE] bg-blue-100/70 px-2.5 py-0.5 rounded-full">
              <span>🧭</span>
              <span>AI Health Navigation Assistant</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Unsure which doctor or department to consult?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Describe your symptoms and our clinical health navigator will guide you to the appropriate medical department and matching hospital specialists.
            </p>
          </div>
          <Link to="/find-specialist" className="shrink-0 w-full sm:w-auto">
            <Button variant="primary" size="md" icon={<span>🧭</span>} className="w-full sm:w-auto">
              Ask MediFlow AI &rarr;
            </Button>
          </Link>
        </div>

        {/* Patient Profile & Health Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🩸</span>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Clinical Health Summary
              </h3>
            </div>
            <p className="text-lg font-black text-slate-900 mt-1">
              Blood Group:{' '}
              <span className="text-[#0072CE]">{profile?.bloodGroup || 'Not specified'}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Biological Gender: {profile?.gender || 'Not specified'}
            </p>
            <p className="text-xs text-rose-600 font-semibold mt-2.5">
              Emergency Contact: {profile?.emergencyContact || 'None on file'}
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📍</span>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Account &amp; Contact
              </h3>
            </div>
            <p className="text-sm font-bold text-slate-900 mt-1 truncate">{user?.email}</p>
            <p className="text-xs text-slate-500 mt-0.5">Contact: {user?.phone || 'No phone'}</p>
            <p className="text-xs text-slate-600 mt-2.5 truncate">
              {profile?.address || 'Pune Central Medical Campus'}
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📝</span>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Medical Records Notes
              </h3>
            </div>
            <p className="text-xs text-slate-700 mt-1 line-clamp-2 leading-relaxed">
              {profile?.medicalHistory || 'No historical surgical or allergy flags logged.'}
            </p>
            <div className="mt-3">
              <Badge variant="success" size="xs" dot>
                Verified Patient Profile
              </Badge>
            </div>
          </Card>
        </div>

        {/* Phase 10: Smart AI Slot Recommendations */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <CardTitle>Smart AI Appointment Recommendations</CardTitle>
                  <Badge variant="indigo" size="xs">
                    Predictive Triage
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Candidate consultation slots scored by doctor presence probability, expected queue intake velocity, and off-peak convenience.
                </p>
              </div>
              <Link to="/book" className="shrink-0">
                <Button variant="ghost" size="sm">
                  View All Doctor Slots ➔
                </Button>
              </Link>
            </div>

            {/* Advisory Governance Banner */}
            <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-2 text-xs text-amber-900">
              <span className="shrink-0 text-base">ℹ️</span>
              <span className="leading-snug">
                <strong>Advisory Recommendations:</strong> Slot scores and queue estimates are AI-assisted guidance. Official appointment confirmation and doctor shift verification occur atomically during booking.
              </span>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <LoadingSkeleton variant="card" count={4} />
            ) : recommendedSlots.length === 0 ? (
              <EmptyState
                icon="🤖"
                title="No AI Slot Recommendations Available"
                description="We currently lack sufficient prospective scheduling data to recommend specialized slots. You can browse all verified specialists in the hospital directory."
                action={
                  <Link to="/doctors">
                    <Button variant="primary" size="sm">
                      Browse Doctors Directory
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendedSlots.map((rec, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 hover:border-[#0072CE] rounded-2xl p-4.5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="purple" size="xs">
                          ⭐ Score: {rec.aiScore}/100
                        </Badge>
                        <Badge variant="success" size="xs">
                          {Math.round(rec.availabilityProbability * 100)}% Certainty
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#0072CE] transition">
                          {rec.doctorName}
                        </h4>
                        <p className="text-xs font-semibold text-slate-500">
                          {rec.specialization} &bull; {rec.department}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 text-slate-700 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Date:</span>
                          <span className="font-bold font-mono">
                            {rec.date} ({rec.dayOfWeek?.slice(0, 3)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Slot Time:</span>
                          <span className="font-bold font-mono">
                            {rec.startTime} &ndash; {rec.endTime}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-indigo-900">
                          <span className="text-slate-500">Est. Intake:</span>
                          <span className="font-bold">
                            ~{rec.estimatedWaitMinutes} mins (Pos #{rec.queuePosition})
                          </span>
                        </div>
                      </div>

                      {rec.recommendationReason && (
                        <p className="text-[11px] text-slate-500 italic leading-snug">
                          "{rec.recommendationReason}"
                        </p>
                      )}
                    </div>

                    <Link
                      to={`/book?doctorId=${rec.doctorId}&date=${rec.date}`}
                      className="w-full"
                    >
                      <Button variant="primary" size="sm" className="w-full">
                        Select This Slot ➔
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Overview Grid: Upcoming Consultations & Active Waitlists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Upcoming Consultations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    <span>📅</span>
                    <span>Upcoming Consultations</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your scheduled hospital visits and check-in tokens
                  </p>
                </div>
                <Link to="/my-appointments">
                  <Button variant="ghost" size="sm">
                    View All ➔
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <LoadingSkeleton variant="list" count={3} />
              ) : upcomingAppointments.length === 0 ? (
                <EmptyState
                  icon="📅"
                  title="No Upcoming Consultations"
                  description="You have no appointments booked at this time."
                  action={
                    <Link to="/book">
                      <Button variant="primary" size="sm">
                        Book An Appointment
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.slice(0, 4).map((apt) => (
                    <div
                      key={apt.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {apt.doctor?.user?.name || 'Medical Specialist'}
                          </p>
                          {getStatusBadge(apt.status)}
                        </div>
                        <p className="text-xs text-slate-500">
                          {apt.doctor?.specialization} &bull; Room {apt.doctor?.roomNumber || 'OPD'}
                        </p>
                        <p className="text-xs text-[#0072CE] font-mono font-bold">
                          📅 {new Date(apt.appointmentDate).toLocaleDateString()} | ⏰{' '}
                          {apt.slot?.startTime} &ndash; {apt.slot?.endTime}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link to="/my-appointments">
                          <Button variant="outline" size="sm" icon={<span>📲</span>}>
                            QR Pass
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Waitlists */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    <span>⏳</span>
                    <span>Smart Waitlist Standby</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated triage monitoring for patient cancellations
                  </p>
                </div>
                <Link to="/waitlist">
                  <Button variant="ghost" size="sm">
                    Manage Queue ➔
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <LoadingSkeleton variant="list" count={3} />
              ) : activeWaitlists.length === 0 ? (
                <EmptyState
                  icon="⏳"
                  title="No Active Waitlist Entries"
                  description="When fully booked, join a clinician's waitlist to receive auto-allocated slots."
                  action={
                    <Link to="/waitlist">
                      <Button variant="amber" size="sm">
                        Explore Waitlist Options
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {activeWaitlists.slice(0, 4).map((w) => (
                    <div
                      key={w.id}
                      className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {w.doctor?.user?.name || 'Consultant'}
                          </p>
                          <Badge variant="warning" size="xs">
                            Score: {w.priorityScore} pts
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {w.doctor?.specialization} &bull; Preferred:{' '}
                          {new Date(w.preferredDate).toLocaleDateString()}
                        </p>
                        <p className="text-[11px] text-amber-800 font-medium">
                          Priority Tier: {w.priority} &bull; Clinical Triage Active
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Link to="/waitlist">
                          <Button variant="outline" size="sm">
                            Queue Position
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="text-center py-5 text-xs text-slate-400 bg-white border-t border-slate-200">
        MediFlow AI 2.0 &bull; Smart Hospital Appointment, Doctor Availability &amp; Queue Management Network
      </footer>
    </div>
  );
}

export default PatientDashboard;
