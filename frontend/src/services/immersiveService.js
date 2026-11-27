import api from './api';

// Built-in Complete Catalog of 13 Immersive Experiences
export const DEFAULT_EXPERIENCES = [
  {
    id: 'exp-anatomy-3d',
    title: 'Interactive Human Anatomy Explorer',
    description:
      'Examine full-body human anatomical systems in high-definition 3D and Augmented Reality with interactive organ raycasting, transparency layering, and physiological facts.',
    type: 'ANATOMY',
    category: 'ANATOMY',
    thumbnail: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      defaultZoom: 2.5,
      supportedModes: ['3D', 'AR'],
      layers: ['skeletal', 'muscular', 'circulatory', 'respiratory', 'digestive', 'nervous'],
      educationalLevel: 'All Audiences',
      estimatedTimeMin: 15,
    },
  },
  {
    id: 'exp-organ-heart',
    title: 'Cardiovascular System: 3D Heart Simulation',
    description:
      'Interactive 3D model of the human heart featuring dynamic cardiac pulsation, ventricular chambers, coronary blood flow, and physiological parameters.',
    type: 'ORGAN',
    category: 'ORGAN',
    thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      organ: 'Heart',
      averageBpm: 72,
      chambers: ['Left Atrium', 'Right Atrium', 'Left Ventricle', 'Right Ventricle'],
      weightGrams: 310,
      estimatedTimeMin: 10,
    },
  },
  {
    id: 'exp-organ-brain',
    title: 'Neurology: 3D Cerebral Anatomy',
    description:
      'Explore the lobes, cerebrum, cerebellum, and neural pathways of the human brain with anatomical landmarks and cognitive function breakdowns.',
    type: 'ORGAN',
    category: 'ORGAN',
    thumbnail: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      organ: 'Brain',
      regions: ['Frontal Lobe', 'Parietal Lobe', 'Temporal Lobe', 'Occipital Lobe', 'Cerebellum', 'Brainstem'],
      weightGrams: 1400,
      neuronCount: '86 Billion',
      estimatedTimeMin: 12,
    },
  },
  {
    id: 'exp-organ-lungs',
    title: 'Pulmonology: Respiratory Tree & Lungs',
    description:
      'Visualize bilateral lungs, bronchial arborization, and alveolar gas exchange mechanics with real-time inspiratory rhythm and airway mapping.',
    type: 'ORGAN',
    category: 'ORGAN',
    thumbnail: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      organ: 'Lungs',
      capacityLiters: 6.0,
      respiratoryRateBpm: 16,
      alveoliCount: '480 Million',
      estimatedTimeMin: 10,
    },
  },
  {
    id: 'exp-organ-liver',
    title: 'Hepatic & Digestive System: Liver & Gallbladder',
    description:
      'Detailed 3D model of the liver and gallbladder with metabolic detoxification analysis, bile production mechanisms, and clinical trivia.',
    type: 'ORGAN',
    category: 'ORGAN',
    thumbnail: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      organ: 'Liver',
      functions: ['Detoxification', 'Protein Synthesis', 'Bile Production', 'Glycogen Storage'],
      weightGrams: 1500,
      estimatedTimeMin: 8,
    },
  },
  {
    id: 'exp-organ-kidneys',
    title: 'Renal Anatomy: Kidneys & Blood Filtration',
    description:
      'Interactive visualization of renal pyramids, nephron micro-structures, and blood filtration mechanics in 3D and Augmented Reality.',
    type: 'ORGAN',
    category: 'ORGAN',
    thumbnail: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      organ: 'Kidneys',
      filtrationRateMlMin: 125,
      nephronsPerKidney: '1 Million',
      primaryFunction: 'Osmoregulation & Waste Elimination',
      estimatedTimeMin: 10,
    },
  },
  {
    id: 'exp-organ-stomach',
    title: 'Gastroenterology: Stomach & Gastric Motility',
    description:
      'Explore gastric rugae, acid secretion zones, and digestive peristalsis through interactive 3D cross-sections and educational markers.',
    type: 'ORGAN',
    category: 'ORGAN',
    thumbnail: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      organ: 'Stomach',
      phLevel: '1.5 - 3.5',
      capacityLiters: 1.5,
      enzymes: ['Pepsin', 'Gastric Lipase'],
      estimatedTimeMin: 8,
    },
  },
  {
    id: 'exp-hospital-walkthrough',
    title: 'Virtual MediFlow Hospital Campus',
    description:
      'Explore the complete smart hospital environment: reception hall, waiting lounge, triage zone, doctor chambers, and diagnostic suites with first-person navigation and VR support.',
    type: 'HOSPITAL',
    category: 'HOSPITAL',
    thumbnail: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      zones: ['Reception', 'Waiting Area', 'Consultation Room', 'Exam Room', 'Info Desk'],
      firstPersonControls: true,
      vrSupport: true,
      estimatedTimeMin: 15,
    },
  },
  {
    id: 'exp-hospital-consultation',
    title: 'Simulated Clinical Consultation Suite',
    description:
      'Walk into an interactive doctor consultation chamber equipped with digital ECG monitors, patient examination beds, and diagnostic tools.',
    type: 'HOSPITAL',
    category: 'HOSPITAL',
    thumbnail: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      equipment: ['ECG Monitor', 'Stethoscope', 'Digital Chart', 'Examination Bed'],
      educationalPurpose: 'Simulated Clinical Familiarization',
      estimatedTimeMin: 12,
    },
  },
  {
    id: 'exp-training-admission',
    title: 'Clinical Simulation: Patient Admission & Triage',
    description:
      'Step-by-step interactive medical training scenario covering emergency intake, priority assessment, identification verification, and preliminary vitals recording.',
    type: 'TRAINING',
    category: 'TRAINING',
    thumbnail: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      estimatedTimeMin: 10,
      totalSteps: 5,
      difficulty: 'Beginner',
      passingScore: 80,
    },
  },
  {
    id: 'exp-training-assessment',
    title: 'Clinical Simulation: Rapid Patient Assessment (ABCD)',
    description:
      'Interactive clinical checklist: Airway, Breathing, Circulation, and Disability evaluation with immediate diagnostic feedback and clinical scoring.',
    type: 'TRAINING',
    category: 'TRAINING',
    thumbnail: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      estimatedTimeMin: 12,
      totalSteps: 4,
      difficulty: 'Intermediate',
      passingScore: 85,
    },
  },
  {
    id: 'exp-training-safety',
    title: 'Clinical Simulation: Infection Control & Safety Protocols',
    description:
      'Master sterile technique, PPE donning/doffing sequence, hazardous waste management, and sharps disposal safety in a simulated ward.',
    type: 'TRAINING',
    category: 'TRAINING',
    thumbnail: 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      estimatedTimeMin: 8,
      totalSteps: 4,
      difficulty: 'Beginner',
      passingScore: 90,
    },
  },
  {
    id: 'exp-training-equipment',
    title: 'Clinical Simulation: Medical Equipment Identification',
    description:
      'Inspect, identify, and configure essential hospital diagnostic instruments: Stethoscope, Sphygmomanometer, Otoscope, Pulse Oximeter, and Defibrillator.',
    type: 'TRAINING',
    category: 'TRAINING',
    thumbnail: 'https://images.unsplash.com/photo-1583912267670-6575ad472688?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    metadata: {
      estimatedTimeMin: 15,
      totalSteps: 5,
      difficulty: 'Beginner',
      passingScore: 80,
    },
  },
];

// Built-in 3D Model Catalog
export const DEFAULT_MODELS = [
  {
    id: 'model-anatomy-body',
    title: 'Full Body Anatomical Mesh',
    description: 'Segmented human body geometry with embedded skeletal, nervous, and visceral systems.',
    modelUrl: '/models/anatomy_body.glb',
    previewUrl: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80',
    category: 'ANATOMY',
    format: 'GLB',
    fileSizeMb: 1.8,
    isActive: true,
  },
  {
    id: 'model-organ-heart',
    title: 'Cardiac Myocardium & Coronary Arteries',
    description: 'High-fidelity anatomical heart geometry highlighting aorta, vena cava, atria, ventricles, and apex.',
    modelUrl: '/models/heart.glb',
    previewUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'GLB',
    fileSizeMb: 1.2,
    isActive: true,
  },
  {
    id: 'model-organ-brain',
    title: 'Cerebral Cortex & Hemispheres',
    description: 'Dual-hemisphere brain geometry featuring sulci, gyri, cerebellum, and upper spinal cord.',
    modelUrl: '/models/brain.glb',
    previewUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'GLB',
    fileSizeMb: 1.4,
    isActive: true,
  },
  {
    id: 'model-organ-lungs',
    title: 'Pulmonary Lobes & Trachea',
    description: 'Bilateral lung model with bronchial branching, superior, middle, and inferior lobes.',
    modelUrl: '/models/lungs.glb',
    previewUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'GLB',
    fileSizeMb: 1.1,
    isActive: true,
  },
  {
    id: 'model-organ-liver',
    title: 'Hepatic Lobes & Biliary Duct',
    description: 'Anatomical liver model featuring right and left lobes, falciform ligament, and gallbladder.',
    modelUrl: '/models/liver.glb',
    previewUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'GLB',
    fileSizeMb: 0.9,
    isActive: true,
  },
  {
    id: 'model-organ-kidneys',
    title: 'Renal Cortex, Medulla & Ureters',
    description: 'Dual kidney model with renal arteries, veins, cortex, medulla, and ureter ducts.',
    modelUrl: '/models/kidneys.glb',
    previewUrl: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'GLB',
    fileSizeMb: 0.85,
    isActive: true,
  },
  {
    id: 'model-organ-stomach',
    title: 'Gastric Curvature & Sphincters',
    description: 'Interactive stomach model featuring fundus, body, antrum, pyloric sphincter, and rugae folds.',
    modelUrl: '/models/stomach.glb',
    previewUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'GLB',
    fileSizeMb: 0.95,
    isActive: true,
  },
  {
    id: 'model-hospital-suite',
    title: 'Smart Hospital Clinical Suite',
    description: 'Complete 3D spatial layout including reception, waiting lobby, consultation chambers, and exam suite.',
    modelUrl: '/models/hospital_suite.glb',
    previewUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
    category: 'HOSPITAL',
    format: 'GLB',
    fileSizeMb: 2.5,
    isActive: true,
  },
];

// Local storage helper for resilient learning progress persistence
const LOCAL_PROGRESS_KEY = 'mediflow_immersive_progress';

function getLocalProgress() {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalProgress(list) {
  try {
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Fetch all active immersive experiences with automatic fallback.
 */
export async function getExperiences(params = {}) {
  try {
    const res = await api.get('/api/immersive/experiences', { params });
    if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.info('Live API lookup pending; utilizing built-in catalog fallback.');
  }

  // Resilient fallback to built-in verified catalog
  const filtered = DEFAULT_EXPERIENCES.filter((exp) => {
    if (params.type && exp.type !== params.type.toUpperCase()) return false;
    if (params.category && exp.category !== params.category.toUpperCase()) return false;
    return true;
  });

  return {
    success: true,
    count: filtered.length,
    data: filtered,
  };
}

/**
 * Fetch 3D models repository with automatic fallback.
 */
export async function getModels(params = {}) {
  try {
    const res = await api.get('/api/immersive/models', { params });
    if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.info('Models API lookup pending; utilizing built-in model definitions.');
  }

  const filtered = DEFAULT_MODELS.filter((m) => {
    if (params.category && m.category !== params.category.toUpperCase()) return false;
    return true;
  });

  return {
    success: true,
    count: filtered.length,
    data: filtered,
  };
}

/**
 * Fetch single 3D model metadata by ID with automatic fallback.
 */
export async function getModelById(id) {
  try {
    const res = await api.get(`/api/immersive/models/${id}`);
    if (res.data?.success && res.data?.data) {
      return res.data;
    }
  } catch (err) {
    // Fallback lookup
  }

  const model = DEFAULT_MODELS.find((m) => m.id === id);
  if (model) {
    return { success: true, data: model };
  }
  return { success: false, message: 'Model not found' };
}

/**
 * Fetch user progress with local storage sync.
 */
export async function getUserProgress() {
  const localList = getLocalProgress();

  try {
    const res = await api.get('/api/immersive/progress');
    if (res.data?.success && Array.isArray(res.data?.data)) {
      // Merge server progress with local progress
      const serverList = res.data.data;
      const mergedMap = new Map();

      // Put server records first
      serverList.forEach((item) => mergedMap.set(item.experienceId, item));

      // Merge local records if higher completion
      localList.forEach((localItem) => {
        const existing = mergedMap.get(localItem.experienceId);
        if (!existing || (localItem.completionPercentage > (existing.completionPercentage || 0))) {
          mergedMap.set(localItem.experienceId, { ...existing, ...localItem });
        }
      });

      const mergedList = Array.from(mergedMap.values());
      setLocalProgress(mergedList);

      return {
        success: true,
        count: mergedList.length,
        data: mergedList,
      };
    }
  } catch (err) {
    // Network offline/unauthenticated: return local progress
  }

  return {
    success: true,
    count: localList.length,
    data: localList,
  };
}

/**
 * Save progress both to backend and local storage.
 */
export async function saveProgress({ experienceId, completionPercentage, completed, score, lastStep }) {
  const percentage = Math.min(100, Math.max(0, parseInt(completionPercentage, 10) || 0));
  const isDone = completed !== undefined ? Boolean(completed) : percentage >= 100;

  // Optimistically update local storage
  const currentLocal = getLocalProgress();
  const existingIdx = currentLocal.findIndex((p) => p.experienceId === experienceId);
  const updatedItem = {
    experienceId,
    completionPercentage: percentage,
    completed: isDone,
    score: score !== undefined ? score : currentLocal[existingIdx]?.score || null,
    lastStep: lastStep || currentLocal[existingIdx]?.lastStep || null,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    currentLocal[existingIdx] = { ...currentLocal[existingIdx], ...updatedItem };
  } else {
    currentLocal.push(updatedItem);
  }
  setLocalProgress(currentLocal);

  // Sync with backend API
  try {
    const res = await api.post('/api/immersive/progress', {
      experienceId,
      completionPercentage: percentage,
      completed: isDone,
      score,
      lastStep,
    });
    return res.data;
  } catch (err) {
    console.info('Saved progress to local cache (offline mode active).');
    return { success: true, data: updatedItem };
  }
}

/**
 * Start a telemetry session for AR/VR interaction.
 */
export async function startSession({ experienceId, mode = 'THREE_D', deviceType = 'DESKTOP', metadata = {} }) {
  try {
    const res = await api.post('/api/immersive/sessions', {
      experienceId,
      mode,
      deviceType,
      metadata,
    });
    return res.data;
  } catch (err) {
    return {
      success: true,
      data: {
        id: `local-session-${Date.now()}`,
        experienceId,
        mode,
        deviceType,
        startedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Complete a telemetry session.
 */
export async function updateSession(sessionId, { status = 'COMPLETED', duration = 0, metadata = {} }) {
  try {
    const res = await api.patch(`/api/immersive/sessions/${sessionId}`, {
      status,
      duration,
      metadata,
    });
    return res.data;
  } catch (err) {
    return { success: true };
  }
}

/**
 * Helper to record recently accessed experience
 */
export function recordRecentExperience(expId) {
  try {
    const recents = JSON.parse(localStorage.getItem('mediflow_recent_experiences') || '[]');
    const filtered = recents.filter((id) => id !== expId);
    filtered.unshift(expId);
    localStorage.setItem('mediflow_recent_experiences', JSON.stringify(filtered.slice(0, 4)));
  } catch {}
}

export function getRecentExperiences() {
  try {
    return JSON.parse(localStorage.getItem('mediflow_recent_experiences') || '[]');
  } catch {
    return [];
  }
}
