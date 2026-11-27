import { useState } from 'react';
import { saveProgress } from '../../../services/immersiveService';

const SCENARIOS = {
  'exp-training-admission': {
    title: 'Hospital Patient Admission & Triage',
    category: 'Emergency & Outpatient Intake',
    difficulty: 'Beginner',
    steps: [
      {
        id: 'step-1',
        title: 'Step 1: Patient Identity Verification',
        instruction: 'A 45-year-old patient arrives with acute distress. What is your mandatory first action?',
        options: [
          { text: 'Verify photo ID and scan hospital registration barcode', isCorrect: true, feedback: 'Correct! Two-point identity verification is critical before any procedure.' },
          { text: 'Immediately administer oral pain medication', isCorrect: false, feedback: 'Incorrect. Never administer medication without verifying identity and allergies.' },
          { text: 'Send patient to waiting lounge without check-in', isCorrect: false, feedback: 'Incorrect. Unregistered patients can deteriorate unmonitored.' },
        ],
      },
      {
        id: 'step-2',
        title: 'Step 2: Emergency Triage Priority Allocation',
        instruction: 'Patient reports severe substernal crushing chest pain radiating to left jaw. What triage priority should you assign?',
        options: [
          { text: 'Routine (Non-urgent wait)', isCorrect: false, feedback: 'Incorrect. Suspected acute coronary syndrome is never routine.' },
          { text: 'Emergency / Level 1 (Immediate physician attention & STAT ECG)', isCorrect: true, feedback: 'Correct! Cardinal signs of myocardial ischemia demand immediate emergency protocol.' },
          { text: 'Elective (Schedule appointment for tomorrow)', isCorrect: false, feedback: 'Incorrect. Delaying acute coronary cases is life-threatening.' },
        ],
      },
      {
        id: 'step-3',
        title: 'Step 3: Baseline Vitals Recording',
        instruction: 'Which vital signs are required for this admission baseline evaluation?',
        options: [
          { text: 'Blood Pressure, Heart Rate, Respiratory Rate, SpO2 & Temperature', isCorrect: true, feedback: 'Correct! Complete baseline vitals establish hemodynamic stability.' },
          { text: 'Only body weight and height', isCorrect: false, feedback: 'Incorrect. Hemodynamic vitals are essential during admission.' },
          { text: 'No vitals needed if patient is conscious', isCorrect: false, feedback: 'Incorrect. Conscious patients can still experience critical decompensation.' },
        ],
      },
      {
        id: 'step-4',
        title: 'Step 4: Allergy & Medical History Check',
        instruction: 'Patient mentions a prior rash after taking penicillin. How do you document this?',
        options: [
          { text: 'Attach a red allergy alert band and record penicillin anaphylaxis/allergy in chart', isCorrect: true, feedback: 'Correct! Clear visible allergy documentation prevents accidental adverse reactions.' },
          { text: 'Ignore it since patient only had a mild rash', isCorrect: false, feedback: 'Incorrect. Prior allergic reactions can escalate to anaphylaxis.' },
        ],
      },
      {
        id: 'step-5',
        title: 'Step 5: Clinical Routing',
        instruction: 'Where should this patient be transferred immediately?',
        options: [
          { text: 'Cardiac Resuscitation Bay / Emergency OPD with telemetry monitoring', isCorrect: true, feedback: 'Correct! The patient is safely admitted and routed to Cardiology.' },
          { text: 'Hospital Cafeteria', isCorrect: false, feedback: 'Incorrect.' },
        ],
      },
    ],
  },
  'exp-training-assessment': {
    title: 'Rapid Patient Assessment (ABCD)',
    category: 'Acute Clinical Care',
    difficulty: 'Intermediate',
    steps: [
      {
        id: 'step-1',
        title: 'A - Airway Assessment',
        instruction: 'You approach an unresponsive patient. How do you evaluate airway patency?',
        options: [
          { text: 'Look, listen, and feel for breath sounds; perform Head-Tilt Chin-Lift if no trauma suspected', isCorrect: true, feedback: 'Correct! Ensuring a clear airway is the first step in basic life support.' },
          { text: 'Pour water into the patient’s mouth', isCorrect: false, feedback: 'Danger! This causes immediate aspiration.' },
        ],
      },
      {
        id: 'step-2',
        title: 'B - Breathing Assessment',
        instruction: 'The patient has shallow respirations of 8 breaths/min with cyanotic lips. What is the priority?',
        options: [
          { text: 'Provide high-flow oxygen via bag-valve mask with supplemental reservoir', isCorrect: true, feedback: 'Correct! Severe hypoventilation requires assisted positive-pressure ventilation.' },
          { text: 'Wait 30 minutes to see if breathing rate improves', isCorrect: false, feedback: 'Incorrect. Hypoxia leads to cardiac arrest rapidly.' },
        ],
      },
      {
        id: 'step-3',
        title: 'C - Circulation Assessment',
        instruction: 'Radial pulse is weak and thready at 130 BPM; capillary refill is 4.5 seconds. What does this indicate?',
        options: [
          { text: 'Hypoperfusion / Compensated shock requiring immediate IV access and volume resuscitation', isCorrect: true, feedback: 'Correct! Delayed capillary refill (>2s) and tachycardia signify poor perfusion.' },
          { text: 'Normal athletic circulation', isCorrect: false, feedback: 'Incorrect. Tachycardia and delayed refill indicate shock.' },
        ],
      },
      {
        id: 'step-4',
        title: 'D - Disability (Neurological)',
        instruction: 'The patient groans only in response to a painful sternal rub. What is their AVPU classification?',
        options: [
          { text: 'P - Responds only to Pain', isCorrect: true, feedback: 'Correct! AVPU scale: Alert, Voice, Pain, Unresponsive.' },
          { text: 'A - Alert and fully oriented', isCorrect: false, feedback: 'Incorrect. Patient responds only to pain.' },
        ],
      },
    ],
  },
  'exp-training-safety': {
    title: 'Infection Control & Hospital Safety',
    category: 'Hospital Hygiene & Biosafety',
    difficulty: 'Beginner',
    steps: [
      {
        id: 'step-1',
        title: 'Step 1: Hand Hygiene Protocol',
        instruction: 'When is hand hygiene required according to WHO 5 Moments?',
        options: [
          { text: 'Before touching patient, before clean/aseptic procedure, after body fluid exposure, after touching patient, and after touching patient surroundings', isCorrect: true, feedback: 'Correct! The 5 Moments of Hand Hygiene break the transmission chain.' },
          { text: 'Only at the end of the shift', isCorrect: false, feedback: 'Incorrect. Cross-contamination occurs between every patient interaction.' },
        ],
      },
      {
        id: 'step-2',
        title: 'Step 2: PPE Donning Order',
        instruction: 'What is the recommended sequence for putting on (donning) PPE?',
        options: [
          { text: '1. Gown, 2. Mask/Respirator, 3. Goggles/Face Shield, 4. Gloves', isCorrect: true, feedback: 'Correct! Proper donning ensures gloves overlap gown cuffs.' },
          { text: '1. Gloves first, then gown', isCorrect: false, feedback: 'Incorrect. Donning gloves first contaminates them during gown adjustment.' },
        ],
      },
      {
        id: 'step-3',
        title: 'Step 3: Sharps Management',
        instruction: 'After administering an intramuscular injection, what should you do with the used needle?',
        options: [
          { text: 'Engage needle safety shield immediately with one hand and dispose directly into yellow sharps container without recapping', isCorrect: true, feedback: 'Correct! Two-handed needle recapping is the primary cause of accidental needle-stick injuries.' },
          { text: 'Recap the needle using both hands and throw in regular trash bin', isCorrect: false, feedback: 'Dangerous violation! Never recap used needles and never discard sharps in general waste.' },
        ],
      },
      {
        id: 'step-4',
        title: 'Step 4: Surface Disinfection',
        instruction: 'A blood droplet fell on the examination bed. How should it be cleaned?',
        options: [
          { text: 'Wear gloves, absorb spill with paper towel, and disinfect with hospital-grade sodium hypochlorite (bleach) solution with required contact time', isCorrect: true, feedback: 'Correct! Bloodborne pathogen protocol requires specific contact time with virucidal disinfectant.' },
          { text: 'Wipe with a dry cloth only', isCorrect: false, feedback: 'Incorrect. Leaves viable pathogens on the surface.' },
        ],
      },
    ],
  },
  'exp-training-equipment': {
    title: 'Medical Equipment Identification',
    category: 'Diagnostic Instrumentation',
    difficulty: 'Beginner',
    steps: [
      {
        id: 'step-1',
        title: 'Instrument 1: Acoustic Stethoscope',
        instruction: 'Which part of the stethoscope is best suited for detecting high-pitched sounds like normal heart beats and lung crackles?',
        options: [
          { text: 'The flat, wide Diaphragm', isCorrect: true, feedback: 'Correct! The diaphragm filters for high-frequency sounds, while the hollow bell detects low-frequency murmurs (S3/S4).' },
          { text: 'The ear tips', isCorrect: false, feedback: 'Incorrect. Ear tips are for the practitioner’s ears.' },
        ],
      },
      {
        id: 'step-2',
        title: 'Instrument 2: Sphygmomanometer',
        instruction: 'Where should the blood pressure cuff bladder center be aligned on the patient’s arm?',
        options: [
          { text: 'Over the brachial artery, approximately 2–3 cm above the antecubital fossa', isCorrect: true, feedback: 'Correct! Correct bladder placement ensures accurate acoustic arterial pressure measurement.' },
          { text: 'Over the wrist bone', isCorrect: false, feedback: 'Incorrect. That is for wrist units, not standard upper arm cuffs.' },
        ],
      },
      {
        id: 'step-3',
        title: 'Instrument 3: Pulse Oximeter',
        instruction: 'What physiological parameters does a finger pulse oximeter quantify?',
        options: [
          { text: 'Peripheral arterial oxygen saturation (SpO2) and pulse rate', isCorrect: true, feedback: 'Correct! Spectrophotometry measures oxyhemoglobin vs deoxyhemoglobin absorption.' },
          { text: 'Core body temperature only', isCorrect: false, feedback: 'Incorrect.' },
        ],
      },
      {
        id: 'step-4',
        title: 'Instrument 4: Automated External Defibrillator (AED)',
        instruction: 'Where are the two adult defibrillator pads positioned on the thorax?',
        options: [
          { text: 'Right upper chest (below clavicle) and left lower chest (mid-axillary line below breast/apex)', isCorrect: true, feedback: 'Correct! Anterolateral placement directs current directly through the myocardium.' },
          { text: 'Both on the abdomen', isCorrect: false, feedback: 'Incorrect. Current would bypass the heart completely.' },
        ],
      },
      {
        id: 'step-5',
        title: 'Instrument 5: Diagnostic Otoscope',
        instruction: 'What anatomical structure is primarily examined with an otoscope?',
        options: [
          { text: 'External auditory canal and tympanic membrane (eardrum)', isCorrect: true, feedback: 'Correct! Used to inspect for otitis media, cerumen impaction, or perforation.' },
          { text: 'Retinal vessels in the eye', isCorrect: false, feedback: 'Incorrect. Retinal inspection requires an ophthalmoscope.' },
        ],
      },
    ],
  },
};

export default function TrainingScenario({
  scenarioId = 'exp-training-admission',
  onComplete,
}) {
  const scenario = SCENARIOS[scenarioId] || SCENARIOS['exp-training-admission'];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState('');

  const currentStep = scenario.steps[currentStepIndex];
  const totalSteps = scenario.steps.length;
  const progressPercent = Math.round(((currentStepIndex + (completed ? 1 : 0)) / totalSteps) * 100);

  const handleSelectOption = (idx) => {
    if (answered) return;
    setSelectedOption(idx);
    const chosen = currentStep.options[idx];
    setAnswered(true);
    setFeedback(chosen.feedback);

    if (chosen.isCorrect) {
      setScore((prev) => prev + Math.round(100 / totalSteps));
    }
  };

  const handleNextStep = async () => {
    if (currentStepIndex + 1 < totalSteps) {
      setCurrentStepIndex((prev) => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
      setFeedback('');
    } else {
      // Completed scenario
      setCompleted(true);
      const finalScore = Math.min(100, score + (currentStep.options[selectedOption]?.isCorrect ? Math.round(100 / totalSteps) : 0));
      
      // Save progress to backend
      await saveProgress({
        experienceId: scenarioId,
        completionPercentage: 100,
        completed: true,
        score: finalScore,
        lastStep: 'Completed Simulation',
      });

      if (onComplete) onComplete({ score: finalScore });
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setCompleted(false);
    setFeedback('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl mx-auto flex flex-col">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
            {scenario.category} &bull; {scenario.difficulty}
          </span>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {scenario.title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Score:</span>
          <span className="text-sm font-black text-[#0072CE] bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
            {score} pts
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-4">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1.5">
          <span>
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <span>{progressPercent}% Complete</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
          <div
            className="h-full bg-gradient-to-r from-[#0072CE] to-cyan-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {!completed ? (
        <div className="space-y-5">
          {/* Instruction */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-1">
              {currentStep.title}
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {currentStep.instruction}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {currentStep.options.map((opt, idx) => {
              let btnClass = 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
              if (answered) {
                if (opt.isCorrect) {
                  btnClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
                } else if (selectedOption === idx) {
                  btnClass = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
                } else {
                  btnClass = 'bg-slate-50 text-slate-400 border-slate-200 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(idx)}
                  disabled={answered}
                  className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer text-xs flex items-center justify-between gap-3 ${btnClass}`}
                >
                  <span className="flex-1">{opt.text}</span>
                  {answered && opt.isCorrect && (
                    <span className="text-emerald-600 font-bold">✓ Correct</span>
                  )}
                  {answered && selectedOption === idx && !opt.isCorrect && (
                    <span className="text-rose-600 font-bold">✕ Incorrect</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback Box */}
          {answered && (
            <div
              className={`p-3.5 rounded-xl text-xs leading-relaxed border ${
                currentStep.options[selectedOption]?.isCorrect
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span className="font-bold block mb-0.5">Clinical Feedback:</span>
              {feedback}
            </div>
          )}

          {/* Next Button */}
          {answered && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                className="text-xs font-bold px-5 py-2.5 rounded-xl bg-[#0072CE] hover:bg-blue-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{currentStepIndex + 1 < totalSteps ? 'Next Step' : 'View Results'}</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Completion View */
        <div className="py-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mb-3 shadow-inner">
            🏅
          </div>
          <h4 className="text-lg font-black text-slate-900 mb-1">
            Simulation Completed Successfully!
          </h4>
          <p className="text-xs text-slate-600 max-w-md mb-4 leading-relaxed">
            You have successfully completed all clinical steps for{' '}
            <strong className="text-slate-900">{scenario.title}</strong>. Your performance has been logged to your learning record.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full max-w-xs mb-6">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Final Clinical Score
            </span>
            <span className="text-3xl font-black text-emerald-600 block mt-1">
              {score} / 100
            </span>
            <span className="text-[11px] font-bold text-slate-500 block mt-1">
              {score >= 80 ? '🌟 Outstanding Performance' : '👍 Good Effort - Review Key Steps'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRestart}
            className="text-xs font-bold px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer"
          >
            ↺ Replay Simulation
          </button>
        </div>
      )}
    </div>
  );
}
