const prisma = require('../../config/db');

/**
 * MediFlow AI — Clinical Health Navigation & Specialty Recommendation Engine
 *
 * GOAL:
 * Guide patients to appropriate medical departments or specialist consultations
 * based on described symptoms and health concerns.
 *
 * TRANSPARENCY & ETHICAL AI MANDATE:
 * - This engine is explicitly labeled as a rule-based clinical ontology baseline.
 * - It does NOT provide medical diagnoses or prescribe medications.
 * - It provides clinical outpatient routing and appointment discovery.
 * - It flags urgent/emergency symptoms requiring immediate in-person evaluation.
 */

// Method descriptor for transparent system responses
const RECOMMENDATION_METHOD = 'RULE_BASED_CLINICAL_SYMPTOM_NAVIGATION_BASELINE';
const METHOD_VERSION = '1.0.0-baseline';

// Red-flag emergency symptoms that warrant immediate hospital/emergency care
const EMERGENCY_INDICATORS = [
  {
    pattern: /\b(crushing chest pain|chest pain radiating|pain in (left )?arm and jaw|sudden chest tightness|heart attack)\b/i,
    flag: 'Acute Chest Pain / Potential Cardiac Emergency',
  },
  {
    pattern: /\b(severe difficulty breathing|cannot breathe|struggling to breathe|gasping for air|blue lips)\b/i,
    flag: 'Acute Respiratory Distress',
  },
  {
    pattern: /\b(sudden face drooping|slurred speech|sudden weakness on one side|cannot raise (both )?arms|stroke)\b/i,
    flag: 'Potential Acute Stroke (FAST)',
  },
  {
    pattern: /\b(coughing (up )?blood|vomiting blood|heavy bleeding|uncontrolled bleeding|hemorrhage)\b/i,
    flag: 'Acute Hemorrhage / Bleeding',
  },
  {
    pattern: /\b(sudden loss of consciousness|fainted and won't wake up|unresponsive|severe seizure)\b/i,
    flag: 'Loss of Consciousness / Unresponsiveness',
  },
  {
    pattern: /\b(worst headache of (my )?life|thunderclap headache|sudden blinding headache)\b/i,
    flag: 'Potential Acute Neurological Emergency',
  },
];

// Clinical Specialty Knowledge Base
const SPECIALTY_KNOWLEDGE_BASE = [
  {
    specialty: 'Cardiology',
    canonicalName: 'Cardiology / Cardiac Sciences',
    searchTerms: ['Cardiologist', 'Cardiac Sciences', 'Cardiology'],
    urgencyDefault: 'routine',
    department: 'Cardiology',
    keyPhrases: [
      { phrase: 'chest pain', weight: 4 },
      { phrase: 'chest tightness', weight: 4 },
      { phrase: 'palpitations', weight: 4 },
      { phrase: 'irregular heartbeat', weight: 4 },
      { phrase: 'shortness of breath on exertion', weight: 4 },
      { phrase: 'high blood pressure', weight: 3 },
      { phrase: 'hypertension', weight: 3 },
      { phrase: 'heart racing', weight: 3 },
      { phrase: 'angina', weight: 5 },
      { phrase: 'cardiovascular', weight: 4 },
      { phrase: 'swollen ankles', weight: 2 },
      { phrase: 'flutter in chest', weight: 3 },
    ],
    singleWords: [
      'heart', 'chest', 'bp', 'pulse', 'artery', 'cardiac', 'cholesterol', 'vascular'
    ],
    description: 'Specializes in diseases and conditions of the heart and blood vessels.',
    rationale: 'The reported symptoms relate to cardiovascular comfort, pulse stability, and blood pressure dynamics.',
  },
  {
    specialty: 'Neurology',
    canonicalName: 'Neurology & Neurosciences',
    searchTerms: ['Neurologist', 'Neurosciences', 'Neurology'],
    urgencyDefault: 'routine',
    department: 'Neurology',
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
      { phrase: 'nerve pain', weight: 4 },
      { phrase: 'neuropathy', weight: 4 },
      { phrase: 'memory loss', weight: 3 },
      { phrase: 'seizure', weight: 4 },
    ],
    singleWords: [
      'headache', 'brain', 'nerve', 'numb', 'tingling', 'dizzy', 'seizures', 'twitch', 'paralysis'
    ],
    description: 'Specializes in disorders of the nervous system, brain, spinal cord, and sensory nerves.',
    rationale: 'The described symptoms (e.g. headaches, sensory sensations, or balance issues) are commonly evaluated by a neurologist.',
  },
  {
    specialty: 'Orthopedics',
    canonicalName: 'Orthopedics & Spine Surgery',
    searchTerms: ['Orthopedics', 'Spine Surgery'],
    urgencyDefault: 'routine',
    department: 'Spine Surgery & Orthopedics',
    keyPhrases: [
      { phrase: 'knee pain', weight: 5 },
      { phrase: 'joint pain', weight: 4 },
      { phrase: 'back pain', weight: 4 },
      { phrase: 'lower back pain', weight: 4 },
      { phrase: 'spine pain', weight: 4 },
      { phrase: 'hip pain', weight: 4 },
      { phrase: 'shoulder pain', weight: 4 },
      { phrase: 'ankle sprain', weight: 4 },
      { phrase: 'difficulty walking', weight: 4 },
      { phrase: 'swollen knee', weight: 4 },
      { phrase: 'stiff joints', weight: 3 },
      { phrase: 'sports injury', weight: 4 },
      { phrase: 'ligament tear', weight: 5 },
      { phrase: 'fracture', weight: 5 },
      { phrase: 'arthritis', weight: 4 },
      { phrase: 'sciatica', weight: 4 },
      { phrase: 'slip disc', weight: 4 },
    ],
    singleWords: [
      'knee', 'joint', 'bone', 'spine', 'back', 'hip', 'shoulder', 'ankle', 'cartilage', 'ligament', 'orthopedic', 'fracture', 'sprain', 'limp'
    ],
    description: 'Specializes in bones, joints, ligaments, tendons, muscles, and spine care.',
    rationale: 'The described issues involve joint mobility, musculoskeletal stiffness, or spine and bone discomfort.',
  },
  {
    specialty: 'Urology',
    canonicalName: 'Urology & Renal Sciences',
    searchTerms: ['Urology', 'Urology & Renal Sciences'],
    urgencyDefault: 'routine',
    department: 'Urology & Renal Sciences',
    keyPhrases: [
      { phrase: 'burning urination', weight: 5 },
      { phrase: 'burning sensation while urinating', weight: 5 },
      { phrase: 'painful urination', weight: 4 },
      { phrase: 'kidney stone', weight: 5 },
      { phrase: 'flank pain', weight: 4 },
      { phrase: 'frequent urination', weight: 3 },
      { phrase: 'difficulty urinating', weight: 4 },
      { phrase: 'weak urine stream', weight: 4 },
      { phrase: 'urinary tract', weight: 4 },
      { phrase: 'prostate', weight: 4 },
      { phrase: 'blood in urine', weight: 4 },
    ],
    singleWords: [
      'urine', 'urination', 'bladder', 'urology', 'prostate', 'testicular', 'kidney stone', 'urinary'
    ],
    description: 'Specializes in the urinary system and male reproductive health.',
    rationale: 'The reported symptoms involve urinary function, bladder sensations, or flank discomfort.',
  },
  {
    specialty: 'Nephrology',
    canonicalName: 'Nephrology & Dialysis',
    searchTerms: ['Nephrology', 'Nephrology & Dialysis'],
    urgencyDefault: 'routine',
    department: 'Nephrology & Dialysis',
    keyPhrases: [
      { phrase: 'kidney disease', weight: 5 },
      { phrase: 'renal failure', weight: 5 },
      { phrase: 'fluid retention', weight: 4 },
      { phrase: 'puffy eyes', weight: 3 },
      { phrase: 'foamy urine', weight: 4 },
      { phrase: 'protein in urine', weight: 4 },
      { phrase: 'high creatinine', weight: 4 },
      { phrase: 'dialysis consultation', weight: 5 },
      { phrase: 'swelling in both feet', weight: 3 },
    ],
    singleWords: [
      'kidney', 'creatinine', 'dialysis', 'nephrology', 'renal', 'urea', 'edema', 'electrolyte'
    ],
    description: 'Specializes in comprehensive kidney care, filtration function, and renal health.',
    rationale: 'The symptoms or clinical indicators relate to renal filtration, fluid balance, or kidney management.',
  },
  {
    specialty: 'Oncology',
    canonicalName: 'Medical & Surgical Oncology',
    searchTerms: ['Oncology', 'Medical Oncology'],
    urgencyDefault: 'routine',
    department: 'Medical Oncology',
    keyPhrases: [
      { phrase: 'unexplained weight loss', weight: 4 },
      { phrase: 'abnormal lump', weight: 4 },
      { phrase: 'breast lump', weight: 5 },
      { phrase: 'swollen lymph nodes', weight: 4 },
      { phrase: 'biopsy evaluation', weight: 4 },
      { phrase: 'cancer screening', weight: 4 },
      { phrase: 'chemotherapy follow up', weight: 5 },
      { phrase: 'persistent night sweats', weight: 3 },
    ],
    singleWords: [
      'lump', 'tumor', 'oncology', 'cancer', 'biopsy', 'radiation', 'chemo', 'lymph'
    ],
    description: 'Specializes in the diagnosis, staging, and therapeutic management of cancers.',
    rationale: 'The health concerns involve palpable masses, abnormal cellular changes, or oncology consultations.',
  },
  {
    specialty: 'General Medicine',
    canonicalName: 'Internal & General Medicine',
    searchTerms: ['General Medicine', 'Internal Medicine'],
    urgencyDefault: 'routine',
    department: 'General Medicine',
    keyPhrases: [
      { phrase: 'fever and chills', weight: 4 },
      { phrase: 'sore throat', weight: 4 },
      { phrase: 'cough and cold', weight: 4 },
      { phrase: 'general weakness', weight: 3 },
      { phrase: 'stomach upset', weight: 3 },
      { phrase: 'mild fatigue', weight: 3 },
      { phrase: 'body ache', weight: 3 },
      { phrase: 'loss of appetite', weight: 3 },
    ],
    singleWords: [
      'fever', 'cough', 'cold', 'flu', 'fatigue', 'weakness', 'tired', 'throat', 'chills', 'nausea'
    ],
    description: 'Comprehensive primary medical evaluation, acute viral illness, and general outpatient triage.',
    rationale: 'General, non-localized systemic symptoms are best assessed initially by an Internal or General Medicine physician.',
  },
];

/**
 * Clean & sanitize user symptom text
 */
function sanitizeSymptomsInput(rawInput) {
  if (typeof rawInput !== 'string') return '';
  return rawInput
    .trim()
    .replace(/[<>]/g, '') // Strip basic HTML tags
    .slice(0, 1500); // Reasonable bound to prevent payload abuse
}

/**
 * Detect potential urgent or emergency red-flags
 */
function detectUrgencyAndSafety(text) {
  const detectedFlags = [];

  for (const indicator of EMERGENCY_INDICATORS) {
    if (indicator.pattern.test(text)) {
      detectedFlags.push(indicator.flag);
    }
  }

  if (detectedFlags.length > 0) {
    return {
      urgency: 'urgent',
      isUrgent: true,
      detectedFlags,
      emergencyWarning:
        'Some symptoms you described may require prompt medical attention. For immediate medical emergencies (such as acute chest pain, severe breathlessness, or sudden neurological weakness), contact emergency services immediately (1800-200-FLOW / 112) or visit the nearest hospital emergency room.',
    };
  }

  return {
    urgency: 'routine',
    isUrgent: false,
    detectedFlags: [],
    emergencyWarning: null,
  };
}

/**
 * Analyze symptoms against clinical specialty knowledge base
 */
function scoreSpecialties(symptomsText) {
  const normalized = symptomsText.toLowerCase();
  const scores = [];

  for (const entry of SPECIALTY_KNOWLEDGE_BASE) {
    let score = 0;
    const matchedTerms = [];

    // 1. Multi-word phrase matches (higher specificity)
    for (const item of entry.keyPhrases) {
      if (normalized.includes(item.phrase)) {
        score += item.weight;
        matchedTerms.push(item.phrase);
      }
    }

    // 2. Single keyword matches
    for (const word of entry.singleWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(normalized)) {
        score += 1;
        if (!matchedTerms.includes(word)) {
          matchedTerms.push(word);
        }
      }
    }

    scores.push({
      specialty: entry.specialty,
      canonicalName: entry.canonicalName,
      searchTerms: entry.searchTerms,
      department: entry.department,
      score,
      matchedTerms,
      description: entry.description,
      rationale: entry.rationale,
    });
  }

  // Sort descending by score
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

/**
 * Core Service: Recommend Medical Specialty Based on Patient Symptoms
 *
 * @param {string} symptoms - Raw text from patient
 * @returns {Promise<Object>} Recommendation payload with matched doctors
 */
async function recommendMedicalSpecialty(symptoms) {
  const sanitized = sanitizeSymptomsInput(symptoms);

  // Input Validation
  if (!sanitized || sanitized.length < 3) {
    throw new Error('Please provide at least 3 characters describing your symptoms or health concern.');
  }

  // 1. Check for emergency red flags
  const safetyAssessment = detectUrgencyAndSafety(sanitized);

  // 2. Score specialties
  const scored = scoreSpecialties(sanitized);
  const topMatch = scored[0];
  const secondMatch = scored[1];

  let recommendedSpecialty = 'General Medicine';
  let recommendedCanonicalName = 'Internal & General Medicine';
  let recommendedDepartment = 'General Medicine';
  let confidence = 0.65;
  let reason = '';
  let matchedEvidence = [];
  let alternativeSpecialty = null;

  if (topMatch && topMatch.score >= 2) {
    recommendedSpecialty = topMatch.specialty;
    recommendedCanonicalName = topMatch.canonicalName;
    recommendedDepartment = topMatch.department;
    matchedEvidence = topMatch.matchedTerms;

    // Confidence heuristic based on score intensity and separation
    const scoreMargin = secondMatch ? topMatch.score - secondMatch.score : topMatch.score;
    const baseConfidence = 0.70;
    const scoreBoost = Math.min(0.22, (topMatch.score / 15) * 0.15 + (scoreMargin > 1 ? 0.07 : 0.0));
    confidence = parseFloat((baseConfidence + scoreBoost).toFixed(2));

    reason = `${topMatch.rationale} Symptoms referencing "${matchedEvidence.slice(0, 3).join(', ')}" align with this department's clinical scope.`;

    if (secondMatch && secondMatch.score >= 2 && scoreMargin <= 2) {
      alternativeSpecialty = {
        specialty: secondMatch.specialty,
        canonicalName: secondMatch.canonicalName,
        confidence: parseFloat((confidence - 0.12).toFixed(2)),
      };
    }
  } else {
    // Low specificity / generalized complaint fallback
    recommendedSpecialty = 'General Medicine';
    recommendedCanonicalName = 'Internal & General Medicine';
    recommendedDepartment = 'General Medicine';
    confidence = 0.58;
    reason =
      'The described symptoms are broad or systemic. A General Medicine or Internal Medicine physician is recommended for an initial clinical evaluation and diagnostic triage.';
  }

  // 3. Query existing hospital doctors matching the recommended specialty/department
  let matchingDoctors = [];
  try {
    const searchConditions = [
      { specialization: { contains: recommendedSpecialty, mode: 'insensitive' } },
      { department: { contains: recommendedDepartment, mode: 'insensitive' } },
    ];

    // If top match has multiple alias search terms (e.g. Cardiologist vs Cardiac Sciences)
    if (topMatch && topMatch.searchTerms) {
      for (const term of topMatch.searchTerms) {
        searchConditions.push({
          specialization: { contains: term, mode: 'insensitive' },
        });
      }
    }

    matchingDoctors = await prisma.doctor.findMany({
      where: {
        OR: searchConditions,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        availabilities: {
          where: { isAvailable: true },
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isAvailable: true,
          },
        },
      },
      take: 4,
    });

    // If no direct doctors matched, query general available consultants so patient is never left stranded
    if (matchingDoctors.length === 0) {
      matchingDoctors = await prisma.doctor.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          availabilities: {
            where: { isAvailable: true },
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              isAvailable: true,
            },
          },
        },
        take: 3,
      });
    }
  } catch (dbError) {
    console.error('Error fetching matching doctors from database:', dbError.message);
    matchingDoctors = [];
  }

  // 4. Construct validated, explainable structured response
  return {
    success: true,
    recommendation: {
      recommendedSpecialty,
      canonicalName: recommendedCanonicalName,
      department: recommendedDepartment,
      confidence,
      reason,
      urgency: safetyAssessment.urgency,
      isUrgent: safetyAssessment.isUrgent,
      emergencyWarning: safetyAssessment.emergencyWarning,
      alternativeSpecialty,
      matchedEvidence,
      symptomsAnalyzedLength: sanitized.length,
      methodology: {
        engine: RECOMMENDATION_METHOD,
        version: METHOD_VERSION,
        is_trained_ml: false,
        label: 'Transparent Rule-Based Clinical Navigation Baseline',
        disclaimer:
          'This tool is intended strictly for health navigation, clinical routing, and specialist discovery. It does not formulate medical diagnoses or prescribe medications. In an emergency, seek urgent medical care immediately.',
      },
    },
    matchingDoctors: matchingDoctors.map((doc) => ({
      id: doc.id,
      name: doc.user?.name || 'Dr. Specialist',
      specialization: doc.specialization,
      department: doc.department,
      experience: doc.experience,
      qualification: doc.qualification,
      consultationFee: doc.consultationFee,
      consultationDuration: doc.consultationDuration,
      currentPresence: doc.currentPresence,
      roomNumber: doc.roomNumber,
      availabilities: doc.availabilities || [],
      bookingUrl: `/book?doctorId=${doc.id}`,
    })),
  };
}

module.exports = {
  recommendMedicalSpecialty,
  detectUrgencyAndSafety,
  sanitizeSymptomsInput,
  scoreSpecialties,
  RECOMMENDATION_METHOD,
};

