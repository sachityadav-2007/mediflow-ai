import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DoctorCard from '../components/DoctorCard';
import CallNowModal from '../components/CallNowModal';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import {
  analyzeTriageSymptoms,
  getTriageHistory,
  deleteTriageHistoryItem,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HealthAssistantPage() {
  const { user } = useAuth();

  // Symptom Form State
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('1-3 days');
  const [severity, setSeverity] = useState('Moderate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Results State
  const [result, setResult] = useState(null);
  const [callModalDoctor, setCallModalDoctor] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Triage History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('assessment'); // 'assessment' | 'history'

  // Pre-configured clinically safe example prompts
  const examplePrompts = [
    {
      text: 'I have had a throbbing headache and mild fever for two days.',
      duration: '1-3 days',
      severity: 'Moderate',
      category: 'General Medicine / Neurology',
    },
    {
      text: 'I have sharp pain in my right knee after jogging, making it hard to bear weight.',
      duration: '1-3 days',
      severity: 'Moderate',
      category: 'Orthopedics',
    },
    {
      text: 'I have a burning sensation and pain during urination for the past 24 hours.',
      duration: '< 24 hours',
      severity: 'Moderate',
      category: 'Urology',
    },
    {
      text: 'I am experiencing chest tightness, rapid heartbeat, and shortness of breath when climbing stairs.',
      duration: '1-3 days',
      severity: 'Severe',
      category: 'Cardiology',
    },
    {
      text: 'I have an itchy red skin rash with dry patches on my arms and neck.',
      duration: '3-7 days',
      severity: 'Mild',
      category: 'Dermatology',
    },
    {
      text: 'I have severe acid reflux, burning heartburn, and upper stomach pain after meals.',
      duration: '1-2 weeks',
      severity: 'Moderate',
      category: 'Gastroenterology',
    },
  ];

  // Fetch patient's triage history
  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const data = await getTriageHistory();
      if (data && data.success && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch (err) {
      console.warn('Failed to fetch triage history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  // Handle example selection
  const handleSelectExample = (prompt) => {
    setSymptoms(prompt.text);
    if (prompt.duration) setDuration(prompt.duration);
    if (prompt.severity) setSeverity(prompt.severity);
    setError('');
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = symptoms.trim();

    if (!trimmed || trimmed.length < 3) {
      setError('Please describe your symptoms or health concern (minimum 3 characters required).');
      return;
    }

    if (trimmed.length > 2000) {
      setError('Symptom description exceeds 2,000 characters. Please summarize your primary symptoms.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await analyzeTriageSymptoms({
        symptoms: trimmed,
        duration,
        severity,
      });

      if (data && data.success) {
        setResult(data);
        // Refresh history list automatically
        fetchHistory();
      } else {
        setError(data?.message || 'Unable to generate recommendation at this time. Please try again.');
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Hospital AI service is currently unreachable. If the server is waking up, please wait a moment and try again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to analyze symptoms. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete a history record
  const handleDeleteHistory = async (historyId) => {
    try {
      const res = await deleteTriageHistoryItem(historyId);
      if (res && res.success) {
        setHistory((prev) => prev.filter((item) => item.id !== historyId));
        showToast('✓ Assessment record removed.');
      }
    } catch (err) {
      showToast('⚠️ Unable to delete record.');
    }
  };

  const handleReset = () => {
    setSymptoms('');
    setDuration('1-3 days');
    setSeverity('Moderate');
    setResult(null);
    setError('');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleShare = (doc) => {
    const shareUrl = `${window.location.origin}/book?doctorId=${doc.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showToast(`✓ Link copied for ${doc.name}`);
    }
  };

  // Urgency Badge Formatter
  const getUrgencyBadge = (urgencyLevel) => {
    const level = (urgencyLevel || '').toUpperCase();
    switch (level) {
      case 'EMERGENCY':
        return (
          <Badge variant="danger" size="sm" dot dotPulse>
            EMERGENCY &bull; IMMEDIATE CARE
          </Badge>
        );
      case 'URGENT':
        return (
          <Badge variant="danger" size="sm" dot>
            URGENT EVALUATION
          </Badge>
        );
      case 'SOON':
        return (
          <Badge variant="warning" size="sm" dot>
            PROMPT CONSULTATION (1-3 DAYS)
          </Badge>
        );
      case 'ROUTINE':
      default:
        return (
          <Badge variant="success" size="sm" dot>
            ROUTINE CONSULTATION
          </Badge>
        );
    }
  };

  const recommendation = result?.recommendation;
  const matchingDoctors = result?.matchingDoctors || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 relative selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2"
        >
          {toastMessage}
        </div>
      )}

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-96 bg-blue-100/40 rounded-full blur-3xl opacity-60" />
      </div>

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 flex-1 relative z-10">
        {/* ============================================================= */}
        {/* 1. HEADER SECTION: Title, Mandate & Non-Diagnostic Disclaimer */}
        {/* ============================================================= */}
        <section className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#0072CE] text-xs font-bold shadow-2xs">
            <span>🧭</span>
            <span>AI Health Assistant &bull; Smart Symptom Triage</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            AI Health Assistant &amp; Smart Symptom Triage
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Describe your symptoms to receive transparent clinical department guidance, estimated consultation urgency, and direct connections to verified hospital specialists.
          </p>

          {/* Mandatory Non-Diagnostic Clinical Safety Disclaimer */}
          <div
            role="note"
            className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300/90 text-amber-950 text-xs flex items-start gap-3 text-left shadow-2xs"
          >
            <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">
              ⚠️
            </span>
            <div className="flex-1 leading-relaxed">
              <strong className="font-bold text-amber-950">Important Medical Safety Disclaimer: </strong>
              This tool provides general health information and hospital navigation guidance. It is not a medical diagnosis, clinical judgment, or treatment prescription. For medical emergencies, contact emergency services (dial <strong>112</strong> or <strong>1800-200-FLOW</strong>) or visit the nearest emergency department immediately.
            </div>
          </div>

          {/* Navigation Sub-Tabs: New Assessment vs History */}
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('assessment')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'assessment'
                  ? 'bg-[#0072CE] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>🩺 Symptom Triage Assessment</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[#0072CE] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>📜 Assessment History</span>
              {history.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 text-[10px] font-mono">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </section>

        {/* ============================================================= */}
        {/* VIEW 1: SYMPTOM ASSESSMENT INPUT & RESULTS                    */}
        {/* ============================================================= */}
        {activeTab === 'assessment' && (
          <div className="space-y-8">
            {/* INPUT CARD: Symptom Form & Structured Parameters */}
            <section className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Main Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="symptom-input"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Describe Your Symptoms or Health Concern <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {symptoms.length}/2000 characters
                    </span>
                  </div>

                  <textarea
                    id="symptom-input"
                    rows={4}
                    value={symptoms}
                    onChange={(e) => {
                      setSymptoms(e.target.value);
                      if (error) setError('');
                    }}
                    disabled={loading}
                    placeholder="Example: I have had a headache and fever for two days with body chills and fatigue..."
                    className="w-full p-4 rounded-2xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] transition disabled:bg-slate-50 disabled:text-slate-400 resize-y"
                  />
                </div>

                {/* 2. Structured Inputs: Duration & Severity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Duration Selector */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="duration-select"
                      className="block text-xs font-bold text-slate-600 uppercase tracking-wider"
                    >
                      Duration of Symptoms
                    </label>
                    <select
                      id="duration-select"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      disabled={loading}
                      className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] transition cursor-pointer"
                    >
                      <option value="< 24 hours">Less than 24 hours</option>
                      <option value="1-3 days">1 to 3 days (Recent)</option>
                      <option value="3-7 days">3 to 7 days (Ongoing)</option>
                      <option value="1-2 weeks">1 to 2 weeks (Persistent)</option>
                      <option value="> 2 weeks">More than 2 weeks (Chronic)</option>
                    </select>
                  </div>

                  {/* Severity Level Radio/Pill Buttons */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Severity Level
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { level: 'Mild', color: 'border-emerald-300 hover:bg-emerald-50 text-emerald-800', active: 'bg-emerald-500 text-white border-emerald-600 shadow-xs' },
                        { level: 'Moderate', color: 'border-amber-300 hover:bg-amber-50 text-amber-800', active: 'bg-amber-500 text-white border-amber-600 shadow-xs' },
                        { level: 'Severe', color: 'border-rose-300 hover:bg-rose-50 text-rose-800', active: 'bg-rose-600 text-white border-rose-700 shadow-xs' },
                      ].map((item) => (
                        <button
                          key={item.level}
                          type="button"
                          onClick={() => setSeverity(item.level)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            severity === item.level ? item.active : item.color + ' bg-white'
                          }`}
                        >
                          <span>{item.level}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Validation Error Banner */}
                {error && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
                  >
                    <span className="text-base shrink-0">⚠️</span>
                    <p className="flex-1 leading-relaxed">{error}</p>
                  </div>
                )}

                {/* Suggested Example Prompts */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Suggested Example Cases (Click to load):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {examplePrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectExample(prompt)}
                        className="text-xs py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0072CE] border border-slate-200/90 hover:border-blue-200 transition cursor-pointer text-left"
                      >
                        <span>&ldquo;{prompt.text}&rdquo;</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                  {result && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                    >
                      Clear &amp; Ask Another
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !symptoms.trim()}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0072CE] hover:bg-[#005fa8] active:bg-[#004f8c] disabled:bg-blue-300 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0072CE]/40"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Analyzing Symptoms &amp; Matching Specialists...</span>
                      </>
                    ) : (
                      <>
                        <span>Analyze Symptoms</span>
                        <span>&rarr;</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* ============================================================= */}
            {/* RESULTS SECTION: Triage Alert, Recommendation & Doctors      */}
            {/* ============================================================= */}
            {result && recommendation && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                {/* Emergency Red-Flag Alert Card (Step 4) */}
                {recommendation.isEmergency && recommendation.emergencyWarning && (
                  <div
                    role="alert"
                    className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-400 text-rose-950 shadow-md space-y-3.5"
                  >
                    <div className="flex items-center gap-2.5 text-rose-900 font-black text-base sm:text-lg">
                      <span className="text-3xl animate-pulse">🚨</span>
                      <span>Urgent Clinical Safety Alert</span>
                    </div>

                    <p className="text-xs sm:text-sm text-rose-900 leading-relaxed font-semibold">
                      {recommendation.emergencyWarning}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <a
                        href="tel:18002003569"
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                      >
                        <span>📞 Call Emergency Desk: 1800-200-FLOW</span>
                      </a>
                      <a
                        href="tel:112"
                        className="px-5 py-2.5 rounded-xl bg-white hover:bg-rose-100 text-rose-900 font-bold text-xs border border-rose-300 transition"
                      >
                        <span>National Emergency: 112</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* AI Recommendation Summary Card */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
                  {/* Top Header with Department, Specialist & Urgency */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Recommended Department &amp; Specialty
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
                        <span>🩺</span>
                        <span>{recommendation.department}</span>
                      </h2>
                      <p className="text-xs sm:text-sm font-semibold text-[#0072CE] mt-0.5">
                        Suggested Specialist: <strong>{recommendation.specialistType}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {getUrgencyBadge(recommendation.urgency)}

                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-[#0072CE] border border-blue-200">
                        {recommendation.confidence}% Match Confidence
                      </span>
                    </div>
                  </div>

                  {/* Why This Recommendation (Matched Symptoms) */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-xs block">
                      Why This Recommendation (Matched Symptom Indicators):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {recommendation.matchedSymptoms?.length > 0 ? (
                        recommendation.matchedSymptoms.map((sym, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                          >
                            <span>✓</span>
                            <span>{sym}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">General consultation review</span>
                      )}
                    </div>
                  </div>

                  {/* Clinical Guidance Explanation */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-xs block">
                      Clinical Department Guidance:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      {recommendation.guidance}
                    </p>
                  </div>

                  {/* Next Steps */}
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 text-xs sm:text-sm text-blue-950 space-y-1">
                    <strong className="font-bold block">Recommended Next Steps:</strong>
                    <p className="leading-relaxed">{recommendation.nextSteps}</p>
                  </div>

                  {/* Quick Action Navigation Bar */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Link to="/doctors">
                      <Button variant="outline" size="sm" icon={<span>🩺</span>}>
                        Find Doctors in Directory
                      </Button>
                    </Link>

                    {matchingDoctors.length > 0 && (
                      <Link to={`/book?doctorId=${matchingDoctors[0].id}`}>
                        <Button variant="primary" size="sm" icon={<span>📅</span>}>
                          Book with {matchingDoctors[0].name}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* ============================================================= */}
                {/* MATCHING DOCTORS: Verified Hospital Specialists              */}
                {/* ============================================================= */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        Verified Hospital Specialists in {recommendation.department}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Consultants available for booking in this hospital department
                      </p>
                    </div>
                    <Link
                      to="/doctors"
                      className="text-xs font-bold text-[#0072CE] hover:underline flex items-center gap-1"
                    >
                      <span>Explore Full Hospital Directory</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>

                  {matchingDoctors.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
                      <p className="font-semibold text-slate-700">
                        No specialists specifically indexed for this department right now.
                      </p>
                      <p>You can consult our general hospital outpatient department or explore all available doctors.</p>
                      <Link to="/doctors" className="inline-block mt-2">
                        <Button variant="primary" size="sm">
                          Browse Doctors Directory
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {matchingDoctors.map((doc) => (
                        <DoctorCard
                          key={doc.id}
                          doctor={doc}
                          selectedCity="Pune"
                          onCallDoctor={setCallModalDoctor}
                          onShare={handleShare}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* VIEW 2: PATIENT ASSESSMENT HISTORY (Step 9)                   */}
        {/* ============================================================= */}
        {activeTab === 'history' && (
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Your Past Symptom Assessments
                </h2>
                <p className="text-xs text-slate-500">
                  Historical triage guidance requests stored securely in your patient profile
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<span>🔄</span>}
                onClick={fetchHistory}
                isLoading={loadingHistory}
              >
                Refresh History
              </Button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading previous assessment records...</p>
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No Previous Assessments"
                description="You haven't run any symptom triage assessments yet. Submit a symptom description to receive personalized department routing."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('assessment')}
                  >
                    Run Symptom Assessment
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🩺</span>
                        <strong className="text-slate-900 text-sm font-bold">
                          {item.recommendedDepartment}
                        </strong>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-xs text-slate-600 font-medium">
                          {item.specialistType}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {getUrgencyBadge(item.urgency)}
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                        Reported Symptoms &amp; Duration ({item.duration || 'N/A'} &bull; Severity: {item.severity || 'Moderate'}):
                      </p>
                      <p className="text-xs sm:text-sm text-slate-800 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                        &ldquo;{item.symptoms}&rdquo;
                      </p>
                    </div>

                    {item.guidance && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong>Guidance:</strong> {item.guidance}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Match Confidence: <strong>{item.confidence}%</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteHistory(item.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
                      >
                        Delete Record
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* CALL NOW MODAL */}
        <CallNowModal
          doctor={callModalDoctor}
          onClose={() => setCallModalDoctor(null)}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Health Navigation System &bull; Non-Diagnostic Clinical Guidance
      </footer>
    </div>
  );
}
