import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DoctorCard from '../components/DoctorCard';
import CallNowModal from '../components/CallNowModal';
import { getSpecialtyRecommendation } from '../services/api';

export default function HealthAssistantPage() {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [callModalDoctor, setCallModalDoctor] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Pre-configured clinically safe example prompts
  const examplePrompts = [
    { text: 'I have a persistent headache.', category: 'Neurology' },
    { text: 'I have knee pain after walking.', category: 'Orthopedics' },
    { text: 'I have burning sensation during urination.', category: 'Urology' },
    { text: 'I have chest tightness and palpitations.', category: 'Cardiology' },
    { text: 'I am experiencing fever, chills and general fatigue.', category: 'General Medicine' },
    { text: 'I have lower back pain radiating down my leg.', category: 'Spine & Ortho' },
  ];

  const handleSelectExample = (promptText) => {
    setSymptoms(promptText);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = symptoms.trim();

    if (!trimmed || trimmed.length < 3) {
      setError('Please describe your symptoms or health concern (minimum 3 characters).');
      return;
    }

    if (trimmed.length > 1500) {
      setError('Symptom description exceeds 1,500 characters. Please summarize your primary symptoms.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await getSpecialtyRecommendation(trimmed);
      if (data && data.success) {
        setResult(data);
      } else {
        setError(data?.message || 'Unable to generate recommendation at this time. Please try again.');
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Hospital AI service is currently unreachable. Please verify the backend service on port 5001 is running.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to analyze symptoms. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSymptoms('');
    setResult(null);
    setError('');
  };

  const handleShare = (doc) => {
    const shareUrl = `${window.location.origin}/book?doctorId=${doc.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setToastMessage(`✓ Link copied for ${doc.name}`);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const recommendation = result?.recommendation;
  const matchingDoctors = result?.matchingDoctors || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 relative selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      {/* Copy Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-96 bg-blue-100/40 rounded-full blur-3xl opacity-60" />
      </div>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 flex-1 relative z-10">
        {/* ============================================================= */}
        {/* HEADER SECTION: Welcome & Clear Non-Diagnostic Disclaimer   */}
        {/* ============================================================= */}
        <section className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#0072CE] text-xs font-bold shadow-2xs">
            <span>🧭</span>
            <span>Clinical Routing &amp; Appointment Discovery</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Find the Right Medical Specialist
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Hello! I can help you find the right medical specialist or clinical department based on the symptoms or concerns you describe.
          </p>

          {/* Prominent Safety Disclaimer */}
          <div
            role="note"
            className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-3 text-left shadow-2xs"
          >
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 leading-relaxed">
              <strong className="font-bold text-amber-950">Clinical Disclaimer: </strong>
              I can help guide you to an appropriate medical department, but I cannot provide a medical diagnosis or prescribe treatments. For life-threatening emergencies, contact emergency services immediately (dial <strong>1800-200-FLOW</strong> or <strong>112</strong>).
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* INPUT CARD: Symptom Form & Suggested Example Chips          */}
        {/* ============================================================= */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="symptom-input"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Describe Your Symptoms or Health Concern <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {symptoms.length}/1500 characters
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
                placeholder="Describe your symptoms or health concern (e.g. I have had a throbbing headache on one side for two days with sensitivity to light)..."
                className="w-full p-4 rounded-2xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/30 focus:border-[#0072CE] transition disabled:bg-slate-50 disabled:text-slate-400 resize-y"
              />
            </div>

            {/* Error Message */}
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
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Suggested Example Symptoms (Click to try):
              </span>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectExample(prompt.text)}
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
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#0072CE] hover:bg-[#005fa8] active:bg-[#004f8c] disabled:bg-blue-300 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0072CE]/40"
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
                    <span>Analyzing Clinical Symptoms...</span>
                  </>
                ) : (
                  <>
                    <span>Find Medical Specialist</span>
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
            {/* Urgent / Emergency Red-Flag Warning (Phase 4) */}
            {recommendation.isUrgent && recommendation.emergencyWarning && (
              <div
                role="alert"
                className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-md space-y-3"
              >
                <div className="flex items-center gap-2.5 text-rose-900 font-extrabold text-sm sm:text-base">
                  <span className="text-2xl">🚨</span>
                  <span>Urgent Clinical Safety Alert</span>
                </div>

                <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-medium">
                  {recommendation.emergencyWarning}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="tel:18002003569"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <span>📞 Emergency Desk: 1800-200-FLOW</span>
                  </a>
                  <a
                    href="tel:112"
                    className="px-4 py-2 rounded-xl bg-white hover:bg-rose-100 text-rose-800 font-bold text-xs border border-rose-300 transition"
                  >
                    <span>National Emergency: 112</span>
                  </a>
                </div>
              </div>
            )}

            {/* AI Recommendation Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recommended Specialty
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                    <span>🩺</span>
                    <span>{recommendation.canonicalName || recommendation.recommendedSpecialty}</span>
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      recommendation.urgency === 'urgent'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        recommendation.urgency === 'urgent' ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    <span>{recommendation.urgency === 'urgent' ? 'Prompt Attention' : 'Routine Consultation'}</span>
                  </span>

                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0072CE] border border-blue-200">
                    {Math.round(recommendation.confidence * 100)}% Match
                  </span>
                </div>
              </div>

              {/* Clinical Rationale Explanation */}
              <div className="space-y-1.5 text-xs sm:text-sm">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                  Clinical Rationale:
                </span>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {recommendation.reason}
                </p>
              </div>

              {/* Differential Alternative (if applicable) */}
              {recommendation.alternativeSpecialty && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-800">Secondary Consideration: </span>
                    <span>{recommendation.alternativeSpecialty.canonicalName}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {Math.round(recommendation.alternativeSpecialty.confidence * 100)}% Match
                  </span>
                </div>
              )}

              {/* Transparent Engine Label */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  <strong>Algorithm:</strong> {recommendation.methodology?.label} ({recommendation.methodology?.version})
                </span>
                <span className="text-slate-400">
                  Non-diagnostic triage routing based on clinical symptom taxonomy.
                </span>
              </div>
            </div>

            {/* ============================================================= */}
            {/* MATCHING DOCTORS: Verified Hospital Specialists              */}
            {/* ============================================================= */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Matching Specialists In MediFlow Network
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verified consultants available in {recommendation.recommendedSpecialty}
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
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                  No specialists currently found for this department. Please consult our general outpatient desk.
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

