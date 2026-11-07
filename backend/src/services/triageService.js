const prisma = require('../config/db');

/**
 * =============================================================================
 * MediFlow AI 2.0 — Smart Symptom Triage & Health Guidance Service
 * =============================================================================
 *
 * ARCHITECTURAL PURPOSE:
 * Provides an explainable, data-driven heuristic algorithm that evaluates
 * patient-reported symptoms, estimates clinical urgency, and identifies the
 * most appropriate hospital department and medical specialist.
 *
 * MEDICAL SAFETY MANDATE (NON-DIAGNOSTIC):
 * - This service strictly functions as an outpatient navigation & triage assistant.
 * - It DOES NOT diagnose pathologies, interpret lab tests, or prescribe medications.
 * - Emergency keywords trigger an immediate red-flag safety circuit advising
 *   emergency medical services (112 / 1800-200-FLOW).
 *
 * COLLEGE VIVA PEDAGOGICAL BREAKDOWN:
 * 1. Emergency Detection: Regex-based high-risk patterns evaluated before scoring.
 * 2. Multi-Department Scoring: Weighted keyword & phrase matching across 10+ specialties.
 * 3. Urgency Calibration: Severity level & symptom duration modulate the urgency tier.
 * 4. Doctor Matching: Queries real PostgreSQL database for verified hospital physicians.
 * 5. Patient Data Isolation: Triage records are scoped strictly to the authenticated patient.
 */

// Method descriptor for transparent system responses
const TRIAGE_METHODOLOGY = {
  label: 'RULE_BASED_CLINICAL_SYMPTOM_TRIAGE_BASELINE',
  version: '2.0.0-triage',
  is_trained_ml: false,
  disclaimer:
    'This tool provides general health guidance and hospital department navigation. It is not a medical diagnosis or treatment plan. For emergencies, contact 112 or visit the nearest emergency room immediately.',
};

// -----------------------------------------------------------------------------
// 1. EMERGENCY KEYWORD SAFETY CIRCUIT
// -----------------------------------------------------------------------------
const EMERGENCY_PATTERNS = [
  {
    pattern: /\b(crushing chest pain|chest pain radiating|pain in (left )?arm and jaw|sudden chest tightness|heart attack)\b/i,
    flag: 'Acute Chest Pain / Potential Cardiac Event',
  },
  {
    pattern: /\b(severe difficulty breathing|cannot breathe|struggling to breathe|gasping for air|blue lips|severe asthma attack)\b/i,
    flag: 'Acute Respiratory Distress',
  },
  {
    pattern: /\b(sudden face drooping|slurred speech|sudden weakness on one side|cannot raise (both )?arms|stroke symptoms|stroke)\b/i,
    flag: 'Potential Acute Stroke (FAST)',
  },
  {
    pattern: /\b(coughing (up )?blood|vomiting blood|heavy bleeding|uncontrolled bleeding|severe hemorrhage)\b/i,
    flag: 'Acute Severe Hemorrhage',
  },
  {
    pattern: /\b(sudden loss of consciousness|fainted and (won\'t|cannot) wake up|unresponsive|collapsed|severe seizure)\b/i,
    flag: 'Loss of Consciousness / Unresponsiveness',
  },
  {
    pattern: /\b(worst headache of (my )?life|thunderclap headache|sudden blinding headache|headache with stiff neck and confusion)\b/i,
    flag: 'Potential Acute Neurological Emergency',
  },
  {
    pattern: /\b(anaphylaxis|swollen tongue and throat|throat closing up|cannot swallow and breathing restricted)\b/i,
    flag: 'Severe Anaphylactic Reaction',
  },
];

// -----------------------------------------------------------------------------
// 2. CLINICAL DEPARTMENT & SPECIALTY KNOWLEDGE BASE
// -----------------------------------------------------------------------------
const DEPARTMENT_CATALOG = [
  {
    department: 'Cardiology',
    specialistType: 'Cardiologist',
    aliases: ['Cardiology', 'Cardiac Sciences', 'Cardiothoracic Surgery'],
    keyPhrases: [
      { phrase: 'chest pain', weight: 4 },
      { phrase: 'chest tightness', weight: 4 },
      { phrase: 'palpitations', weight: 4 },
      { phrase: 'irregular heartbeat', weight: 4 },
      { phrase: 'heart racing', weight: 3 },
      { phrase: 'shortness of breath on walking', weight: 4 },
      { phrase: 'high blood pressure', weight: 3 },
      { phrase: 'hypertension', weight: 3 },
      { phrase: 'angina', weight: 5 },
      { phrase: 'swollen ankles', weight: 2 },
      { phrase: 'flutter in chest', weight: 3 },
    ],
    keywords: ['heart', 'chest', 'bp', 'pulse', 'cardiac', 'cholesterol', 'vascular', 'artery'],
    defaultGuidance:
      'Your reported symptoms involve cardiovascular sensations, pulse regularity, or blood pressure dynamics. Consider consulting a Cardiologist for an outpatient evaluation and ECG screening.',
    nextSteps: 'Schedule a consultation with a cardiologist. Avoid strenuous exertion until evaluated.',
  },
  {
    department: 'Neurology',
    specialistType: 'Neurologist',
    aliases: ['Neurology', 'Neurosciences', 'Neurosurgery'],
    keyPhrases: [
      { phrase: 'persistent headache', weight: 4 },
      { phrase: 'migraine', weight: 4 },
      { phrase: 'chronic headache', weight: 4 },
      { phrase: 'dizziness', weight: 3 },
      { phrase: 'vertigo', weight: 4 },
      { phrase: 'numbness in fingers', weight: 4 },
      { phrase: 'tingling sensation', weight: 3 },
      { phrase: 'pins and needles', weight: 3 },
      { phrase: 'loss of balance', weight: 4 },
      { phrase: 'unsteadiness', weight: 3 },
      { phrase: 'tremors', weight: 4 },
      { phrase: 'muscle twitching', weight: 3 },
      { phrase: 'memory loss', weight: 3 },
      { phrase: 'nerve pain', weight: 4 },
    ],
    keywords: ['headache', 'dizzy', 'numb', 'tingling', 'migraine', 'nerve', 'seizure', 'balance', 'memory'],
    defaultGuidance:
      'Your reported symptoms suggest central or peripheral neurological involvement such as cranial pain, balance disturbance, or nerve sensitivity. A Neurologist consultation is appropriate.',
    nextSteps: 'Consult a neurologist. Keep a log of symptom triggers, duration, and frequency.',
  },
  {
    department: 'Orthopedics',
    specialistType: 'Orthopedic Surgeon',
    aliases: ['Orthopedics', 'Spine Surgery & Orthopedics', 'Joint Replacement'],
    keyPhrases: [
      { phrase: 'knee pain', weight: 4 },
      { phrase: 'joint pain', weight: 4 },
      { phrase: 'back pain', weight: 4 },
      { phrase: 'lower back pain', weight: 4 },
      { phrase: 'shoulder pain', weight: 4 },
      { phrase: 'stiff joints', weight: 3 },
      { phrase: 'difficulty walking', weight: 3 },
      { phrase: 'swollen knee', weight: 4 },
      { phrase: 'hip pain', weight: 4 },
      { phrase: 'bone pain', weight: 4 },
      { phrase: 'sciatica', weight: 5 },
      { phrase: 'sports injury', weight: 4 },
      { phrase: 'fracture', weight: 5 },
      { phrase: 'sprained ankle', weight: 4 },
    ],
    keywords: ['bone', 'joint', 'knee', 'spine', 'back', 'shoulder', 'hip', 'fracture', 'sprain', 'ortho', 'arthritis'],
    defaultGuidance:
      'Your described symptoms pertain to the musculoskeletal system, joints, spine, or connective tissues. An Orthopedic specialist can assess joint mobility, stability, and imaging.',
    nextSteps: 'Consult an orthopedic specialist. Avoid putting excessive weight or strain on the affected joint.',
  },
  {
    department: 'Urology',
    specialistType: 'Urologist',
    aliases: ['Urology', 'Urology & Renal Sciences'],
    keyPhrases: [
      { phrase: 'burning urination', weight: 5 },
      { phrase: 'burning sensation while peeing', weight: 5 },
      { phrase: 'frequent urination', weight: 4 },
      { phrase: 'blood in urine', weight: 5 },
      { phrase: 'kidney stone', weight: 5 },
      { phrase: 'flank pain', weight: 4 },
      { phrase: 'urinary incontinence', weight: 4 },
      { phrase: 'pelvic pain', weight: 3 },
      { phrase: 'prostate issues', weight: 5 },
    ],
    keywords: ['urine', 'urination', 'bladder', 'urology', 'prostate', 'hematuria', 'dysuria'],
    defaultGuidance:
      'Your reported symptoms relate to the urinary tract or urogenital system. A consultation with a Urologist is recommended for diagnostic urinalysis and targeted evaluation.',
    nextSteps: 'Consult a urologist. Stay well-hydrated unless restricted, and monitor urine appearance.',
  },
  {
    department: 'Nephrology',
    specialistType: 'Nephrologist',
    aliases: ['Nephrology', 'Nephrology & Dialysis'],
    keyPhrases: [
      { phrase: 'foamy urine', weight: 4 },
      { phrase: 'kidney function', weight: 4 },
      { phrase: 'swelling in legs and face', weight: 4 },
      { phrase: 'fluid retention', weight: 4 },
      { phrase: 'high creatinine', weight: 5 },
      { phrase: 'chronic kidney disease', weight: 5 },
      { phrase: 'dialysis consultation', weight: 5 },
    ],
    keywords: ['kidney', 'renal', 'creatinine', 'dialysis', 'nephro', 'albumin'],
    defaultGuidance:
      'The symptoms described suggest potential renal or fluid balance concerns. A Nephrologist specializing in kidney health and renal physiology should be consulted.',
    nextSteps: 'Schedule an evaluation with a nephrologist and bring any recent metabolic panel or urine test records.',
  },
  {
    department: 'Dermatology',
    specialistType: 'Dermatologist',
    aliases: ['Dermatology', 'Skin & Cosmetology'],
    keyPhrases: [
      { phrase: 'skin rash', weight: 4 },
      { phrase: 'itchy skin', weight: 4 },
      { phrase: 'red spots on skin', weight: 4 },
      { phrase: 'dry patches', weight: 3 },
      { phrase: 'acne breakout', weight: 4 },
      { phrase: 'hair loss', weight: 4 },
      { phrase: 'eczema', weight: 5 },
      { phrase: 'psoriasis', weight: 5 },
      { phrase: 'fungal infection', weight: 4 },
      { phrase: 'mole changing color', weight: 5 },
    ],
    keywords: ['skin', 'rash', 'itch', 'spots', 'acne', 'eczema', 'dermatology', 'scalp', 'pigmentation'],
    defaultGuidance:
      'Your symptoms focus on dermatological concerns affecting skin, hair, or scalp. A Dermatologist can perform a close visual dermoscopic exam.',
    nextSteps: 'Book a consultation with a dermatologist. Avoid harsh soaps or unprescribed topical creams.',
  },
  {
    department: 'Gastroenterology',
    specialistType: 'Gastroenterologist',
    aliases: ['Gastroenterology', 'Digestive Health', 'GI & Hepatology'],
    keyPhrases: [
      { phrase: 'stomach pain', weight: 4 },
      { phrase: 'abdominal pain', weight: 4 },
      { phrase: 'acid reflux', weight: 4 },
      { phrase: 'heartburn', weight: 4 },
      { phrase: 'severe nausea', weight: 3 },
      { phrase: 'bloating and gas', weight: 3 },
      { phrase: 'constipation', weight: 4 },
      { phrase: 'chronic diarrhea', weight: 4 },
      { phrase: 'indigestion', weight: 3 },
      { phrase: 'jaundice', weight: 5 },
    ],
    keywords: ['stomach', 'abdomen', 'digestive', 'gastric', 'reflux', 'bowel', 'gut', 'gastro', 'liver', 'nausea'],
    defaultGuidance:
      'Your reported symptoms involve the digestive system, stomach, or bowel habits. A Gastroenterologist can provide comprehensive gastrointestinal assessment.',
    nextSteps: 'Consult a gastroenterologist. Eat light, non-greasy meals and stay hydrated.',
  },
  {
    department: 'ENT',
    specialistType: 'ENT Specialist',
    aliases: ['ENT', 'Otolaryngology', 'Ear Nose Throat'],
    keyPhrases: [
      { phrase: 'sore throat', weight: 4 },
      { phrase: 'ear pain', weight: 4 },
      { phrase: 'ear discharge', weight: 4 },
      { phrase: 'ringing in ears', weight: 4 },
      { phrase: 'tinnitus', weight: 4 },
      { phrase: 'sinus pressure', weight: 4 },
      { phrase: 'nasal congestion', weight: 3 },
      { phrase: 'hearing loss', weight: 4 },
      { phrase: 'hoarseness of voice', weight: 4 },
      { phrase: 'tonsillitis', weight: 4 },
    ],
    keywords: ['ear', 'nose', 'throat', 'sinus', 'tonsil', 'hearing', 'tinnitus', 'ent'],
    defaultGuidance:
      'The symptoms described localize to the ears, nose, sinuses, or throat. An ENT specialist (Otolaryngologist) can examine these areas with specialized scopes.',
    nextSteps: 'Consult an ENT specialist. Avoid inserting foreign objects or cotton buds into the ear canal.',
  },
  {
    department: 'Oncology',
    specialistType: 'Medical Oncologist',
    aliases: ['Oncology', 'Medical Oncology', 'Surgical Oncology'],
    keyPhrases: [
      { phrase: 'unexplained weight loss', weight: 4 },
      { phrase: 'unexplained lump', weight: 5 },
      { phrase: 'swollen lymph nodes', weight: 4 },
      { phrase: 'chronic night sweats', weight: 4 },
      { phrase: 'cancer screening', weight: 5 },
      { phrase: 'oncology second opinion', weight: 5 },
      { phrase: 'persistent fatigue and fever', weight: 3 },
    ],
    keywords: ['tumor', 'lump', 'oncology', 'cancer', 'chemotherapy', 'biopsy'],
    defaultGuidance:
      'The concerns involve specialized oncological evaluation, tumor screening, or systemic signs warranting comprehensive screening by an Oncologist.',
    nextSteps: 'Consult an oncologist and bring all prior imaging reports, scans, and blood counts.',
  },
  {
    department: 'General Medicine',
    specialistType: 'General Physician',
    aliases: ['General Medicine', 'Internal Medicine', 'Family Medicine'],
    keyPhrases: [
      { phrase: 'fever and chills', weight: 4 },
      { phrase: 'high fever', weight: 4 },
      { phrase: 'body ache', weight: 3 },
      { phrase: 'general fatigue', weight: 3 },
      { phrase: 'viral infection', weight: 4 },
      { phrase: 'cough and cold', weight: 4 },
      { phrase: 'feeling unwell', weight: 2 },
      { phrase: 'loss of appetite', weight: 3 },
      { phrase: 'headache and fever', weight: 4 },
      { phrase: 'weakness and dizziness', weight: 3 },
    ],
    keywords: ['fever', 'chills', 'cough', 'cold', 'fatigue', 'weakness', 'flu', 'general', 'infection'],
    defaultGuidance:
      'Your reported symptoms present as systemic, constitutional, or multi-symptom illness (such as fever, body aches, or general malaise). A General Physician / Internal Medicine specialist is the most appropriate primary consultation.',
    nextSteps: 'Consult a general physician for baseline examination, vital signs check, and primary blood work if needed.',
  },
];

// -----------------------------------------------------------------------------
// 3. CORE SYMPTOM TRIAGE ALGORITHM
// -----------------------------------------------------------------------------
/**
 * Analyzes patient symptom text, duration, and severity to generate explainable recommendations.
 *
 * @param {Object} input
 * @param {string} input.symptoms - Natural language description of symptoms
 * @param {string} [input.duration] - e.g. "< 24 hours", "1-3 days", "3-7 days", "> 2 weeks"
 * @param {string} [input.severity] - "Mild" | "Moderate" | "Severe"
 * @returns {Promise<Object>} Triage recommendation payload with matching doctors
 */
const analyzeSymptoms = async ({ symptoms, duration = '1-3 days', severity = 'Moderate' }) => {
  if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 3) {
    throw new Error('Please describe your symptoms (minimum 3 characters required).');
  }

  const cleanText = symptoms.trim();
  const lowerText = cleanText.toLowerCase();

  // STEP 1: SAFETY-FIRST EMERGENCY DETECTION
  let emergencyMatch = null;
  for (const item of EMERGENCY_PATTERNS) {
    if (item.pattern.test(lowerText)) {
      emergencyMatch = item.flag;
      break;
    }
  }

  // STEP 2: DEPARTMENT MULTI-FACTOR SCORING
  const scores = [];
  const allMatchedSymptoms = new Set();

  for (const dept of DEPARTMENT_CATALOG) {
    let deptScore = 0;
    const deptMatched = [];

    // 2A. Keyphrase matching (higher weight, e.g. "chest pain" = 4)
    for (const kp of dept.keyPhrases) {
      if (lowerText.includes(kp.phrase.toLowerCase())) {
        deptScore += kp.weight;
        deptMatched.push(kp.phrase);
        allMatchedSymptoms.add(kp.phrase);
      }
    }

    // 2B. Single keyword boundary matching (weight: 1)
    for (const kw of dept.keywords) {
      const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
      if (kwRegex.test(lowerText)) {
        deptScore += 1;
        if (!deptMatched.includes(kw)) {
          deptMatched.push(kw);
          allMatchedSymptoms.add(kw);
        }
      }
    }

    if (deptScore > 0) {
      scores.push({
        department: dept.department,
        specialistType: dept.specialistType,
        score: deptScore,
        matchedSymptoms: deptMatched,
        defaultGuidance: dept.defaultGuidance,
        nextSteps: dept.nextSteps,
        aliases: dept.aliases,
      });
    }
  }

  // Sort candidate departments descending by score
  scores.sort((a, b) => b.score - a.score);

  // STEP 3: FALLBACK TO GENERAL MEDICINE IF NO SPECIFIC KEYWORD FOUND
  let topResult;
  if (scores.length > 0) {
    topResult = scores[0];
  } else {
    const generalMed = DEPARTMENT_CATALOG.find((d) => d.department === 'General Medicine');
    topResult = {
      department: generalMed.department,
      specialistType: generalMed.specialistType,
      score: 1,
      matchedSymptoms: ['general health review'],
      defaultGuidance:
        'Your description does not specifically match an isolated specialty. A General Physician consultation is recommended to perform a comprehensive primary health evaluation.',
      nextSteps: 'Schedule an appointment with a general physician for initial clinical evaluation.',
      aliases: generalMed.aliases,
    };
    allMatchedSymptoms.add('general consultation');
  }

  // STEP 4: URGENCY LEVEL CALIBRATION
  // Tiers: "Routine" | "Soon" | "Urgent" | "Emergency"
  let urgency = 'Routine';
  let isEmergency = false;
  let emergencyWarning = null;

  if (emergencyMatch) {
    urgency = 'Emergency';
    isEmergency = true;
    emergencyWarning = `Safety Alert: Symptoms match high-urgency clinical indicator (${emergencyMatch}). Please seek immediate hospital or emergency room evaluation (dial 112 or 1800-200-FLOW).`;
  } else if (severity === 'Severe') {
    urgency = 'Urgent';
  } else if (severity === 'Moderate' || duration === '1-2 weeks' || duration === '> 2 weeks') {
    urgency = 'Soon';
  } else {
    urgency = 'Routine';
  }

  // STEP 5: NORMALIZED CONFIDENCE SCORE (e.g. 60% to 95%)
  // Based on score magnitude and symptom match count
  const rawConfidence = Math.min(95, Math.max(55, 50 + topResult.score * 7 + (allMatchedSymptoms.size * 3)));
  const confidence = Math.round(rawConfidence);

  // STEP 6: FIND MATCHING DOCTORS IN POSTGRESQL DATABASE
  const matchingDoctors = await findMatchingDoctors(topResult.department, topResult.specialistType, topResult.aliases);

  return {
    department: topResult.department,
    specialistType: topResult.specialistType,
    urgency,
    confidence,
    guidance: topResult.defaultGuidance,
    nextSteps: isEmergency
      ? 'Seek immediate professional emergency medical care or call 112.'
      : topResult.nextSteps,
    matchedSymptoms: Array.from(allMatchedSymptoms).slice(0, 8),
    isEmergency,
    emergencyWarning,
    matchingDoctors,
    methodology: TRIAGE_METHODOLOGY,
  };
};

/**
 * Queries PostgreSQL database for verified hospital doctors in the recommended department.
 */
const findMatchingDoctors = async (department, specialistType, aliases = []) => {
  try {
    const searchConditions = [
      { department: { contains: department, mode: 'insensitive' } },
      { specialization: { contains: specialistType, mode: 'insensitive' } },
      { specialization: { contains: department, mode: 'insensitive' } },
    ];

    if (aliases && aliases.length > 0) {
      for (const alias of aliases) {
        searchConditions.push({ department: { contains: alias, mode: 'insensitive' } });
        searchConditions.push({ specialization: { contains: alias, mode: 'insensitive' } });
      }
    }

    const doctors = await prisma.doctor.findMany({
      where: {
        OR: searchConditions,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        availabilities: true,
      },
      take: 4,
    });

    return doctors.map((doc) => ({
      id: doc.id,
      name: doc.user.name,
      specialization: doc.specialization,
      department: doc.department,
      experience: doc.experience,
      qualification: doc.qualification,
      consultationFee: doc.consultationFee,
      consultationDuration: doc.consultationDuration,
      currentPresence: doc.currentPresence,
      roomNumber: doc.roomNumber || 'OPD Suite',
      availabilities: doc.availabilities || [],
    }));
  } catch (err) {
    console.warn('Matching doctors query notice:', err.message);
    return [];
  }
};

// -----------------------------------------------------------------------------
// 4. DATABASE HISTORY MANAGEMENT (Prisma TriageHistory)
// -----------------------------------------------------------------------------
/**
 * Persists an authorized triage record into PostgreSQL for the patient.
 */
const saveTriageRecord = async ({
  patientId,
  symptoms,
  duration,
  severity,
  recommendation,
}) => {
  if (!patientId) {
    throw new Error('Patient ID is required to save triage history.');
  }

  const record = await prisma.triageHistory.create({
    data: {
      patientId,
      symptoms,
      duration: duration || 'Not specified',
      severity: severity || 'Moderate',
      recommendedDepartment: recommendation.department,
      specialistType: recommendation.specialistType,
      urgency: recommendation.urgency,
      confidence: parseFloat(recommendation.confidence) || 75.0,
      guidance: recommendation.guidance,
      matchedSymptoms: recommendation.matchedSymptoms || [],
      isEmergency: Boolean(recommendation.isEmergency),
    },
  });

  return record;
};

/**
 * Retrieves past triage requests for a specific authenticated patient.
 */
const getPatientTriageHistory = async (patientId, limit = 10) => {
  if (!patientId) {
    throw new Error('Patient ID is required to query history.');
  }

  const history = await prisma.triageHistory.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return history;
};

/**
 * Deletes a single triage history record owned by the authenticated patient.
 */
const deletePatientTriageRecord = async (historyId, patientId) => {
  const existing = await prisma.triageHistory.findUnique({
    where: { id: historyId },
  });

  if (!existing) {
    throw new Error('Triage record not found.');
  }

  if (existing.patientId !== patientId) {
    throw new Error('Unauthorized: You can only delete your own triage records.');
  }

  await prisma.triageHistory.delete({
    where: { id: historyId },
  });

  return { success: true, message: 'Triage history record removed.' };
};

module.exports = {
  analyzeSymptoms,
  saveTriageRecord,
  getPatientTriageHistory,
  deletePatientTriageRecord,
  TRIAGE_METHODOLOGY,
};

