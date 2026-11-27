const prisma = require('../config/db');

// Built-in Default Catalog of Experiences
const DEFAULT_EXPERIENCES = [
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
      layers: ['skeletal', 'circulatory', 'respiratory', 'digestive'],
      educationalLevel: 'All Audiences',
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

// Built-in Default 3D Models
const DEFAULT_MODELS = [
  {
    id: 'model-anatomy-body',
    title: 'Full Body Anatomical Mesh',
    description: 'Segmented translucent human body geometry with embedded skeletal, nervous, and visceral systems.',
    modelUrl: '/models/anatomy_body.glb',
    previewUrl: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80',
    category: 'ANATOMY',
    format: 'PROCEDURAL',
    fileSizeMb: 1.8,
    isActive: true,
    metadata: {
      hotspots: [
        { name: 'Brain', position: [0, 1.6, 0], organId: 'exp-organ-brain' },
        { name: 'Heart', position: [-0.1, 1.25, 0.1], organId: 'exp-organ-heart' },
        { name: 'Lungs', position: [0, 1.25, 0], organId: 'exp-organ-lungs' },
        { name: 'Liver', position: [0.15, 1.05, 0.05], organId: 'exp-organ-liver' },
        { name: 'Stomach', position: [-0.15, 1.05, 0.05], organId: 'exp-organ-stomach' },
        { name: 'Kidneys', position: [0, 0.95, -0.05], organId: 'exp-organ-kidneys' },
      ],
    },
  },
  {
    id: 'model-organ-heart',
    title: 'Cardiac Myocardium & Coronary Arteries',
    description: 'High-fidelity anatomical heart geometry highlighting aorta, vena cava, atria, ventricles, and apex.',
    modelUrl: '/models/heart.glb',
    previewUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'PROCEDURAL',
    fileSizeMb: 1.2,
    isActive: true,
    metadata: {
      beatsPerMinute: 72,
      audioPulseEffect: true,
      educationalNote: 'Educational simulation only. Not intended for clinical diagnostic interpretation.',
    },
  },
  {
    id: 'model-organ-brain',
    title: 'Cerebral Cortex & Hemispheres',
    description: 'Dual-hemisphere brain geometry featuring sulci, gyri, cerebellum, and upper spinal cord.',
    modelUrl: '/models/brain.glb',
    previewUrl: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'PROCEDURAL',
    fileSizeMb: 1.4,
    isActive: true,
    metadata: {
      hemispheres: ['Left (Analytical)', 'Right (Creative & Spatial)'],
      lobesCount: 4,
    },
  },
  {
    id: 'model-organ-lungs',
    title: 'Pulmonary Lobes & Trachea',
    description: 'Bilateral lung model with bronchial branching, superior, middle, and inferior lobes.',
    modelUrl: '/models/lungs.glb',
    previewUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'PROCEDURAL',
    fileSizeMb: 1.1,
    isActive: true,
    metadata: {
      rightLobes: 3,
      leftLobes: 2,
    },
  },
  {
    id: 'model-organ-liver',
    title: 'Hepatic Lobes & Biliary Duct',
    description: 'Anatomical liver model featuring right and left lobes, falciform ligament, and gallbladder.',
    modelUrl: '/models/liver.glb',
    previewUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'PROCEDURAL',
    fileSizeMb: 0.9,
    isActive: true,
    metadata: {
      bloodSupply: 'Hepatic Artery (25%) & Portal Vein (75%)',
    },
  },
  {
    id: 'model-organ-kidneys',
    title: 'Renal Cortex, Medulla & Ureters',
    description: 'Dual kidney model with renal arteries, veins, cortex, medulla, and ureter ducts.',
    modelUrl: '/models/kidneys.glb',
    previewUrl: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'PROCEDURAL',
    fileSizeMb: 0.85,
    isActive: true,
    metadata: {
      nephronFiltration: true,
    },
  },
  {
    id: 'model-organ-stomach',
    title: 'Gastric Curvature & Sphincters',
    description: 'Interactive stomach model featuring fundus, body, antrum, pyloric sphincter, and rugae folds.',
    modelUrl: '/models/stomach.glb',
    previewUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
    category: 'ORGAN',
    format: 'PROCEDURAL',
    fileSizeMb: 0.95,
    isActive: true,
    metadata: {
      peristalsisRate: '3 waves/minute',
    },
  },
  {
    id: 'model-hospital-suite',
    title: 'Smart Hospital Clinical Suite',
    description: 'Complete 3D spatial layout including reception, waiting lobby, consultation chambers, and exam suite.',
    modelUrl: '/models/hospital_suite.glb',
    previewUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
    category: 'HOSPITAL',
    format: 'PROCEDURAL',
    fileSizeMb: 2.5,
    isActive: true,
    metadata: {
      zonesCount: 5,
      collisionBounds: true,
    },
  },
];

/**
 * Ensures seed experiences exist in the database; seeds them if empty.
 */
async function ensureCatalogSeeded() {
  try {
    const expCount = await prisma.immersiveExperience.count();
    if (expCount === 0) {
      for (const exp of DEFAULT_EXPERIENCES) {
        await prisma.immersiveExperience.upsert({
          where: { id: exp.id },
          update: exp,
          create: exp,
        });
      }
    }

    const modelCount = await prisma.immersiveModel.count();
    if (modelCount === 0) {
      for (const m of DEFAULT_MODELS) {
        await prisma.immersiveModel.upsert({
          where: { id: m.id },
          update: m,
          create: m,
        });
      }
    }
  } catch (error) {
    console.warn('Non-fatal: Could not seed immersive database tables:', error.message);
  }
}

// Auto-seed on server boot / first access
ensureCatalogSeeded();

/**
 * Retrieve experiences with optional category/type filtering.
 */
async function getExperiences({ type, category }) {
  await ensureCatalogSeeded();

  const where = { isActive: true };
  if (type) where.type = type.toUpperCase();
  if (category) where.category = category.toUpperCase();

  try {
    const experiences = await prisma.immersiveExperience.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    if (experiences.length > 0) return experiences;
  } catch (err) {
    console.warn('Falling back to built-in experiences catalog:', err.message);
  }

  // Graceful fallback to static in-memory data
  return DEFAULT_EXPERIENCES.filter((exp) => {
    if (type && exp.type !== type.toUpperCase()) return false;
    if (category && exp.category !== category.toUpperCase()) return false;
    return true;
  });
}

/**
 * Retrieve 3D models with optional category filtering.
 */
async function getModels({ category }) {
  await ensureCatalogSeeded();

  const where = { isActive: true };
  if (category) where.category = category.toUpperCase();

  try {
    const models = await prisma.immersiveModel.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    if (models.length > 0) return models;
  } catch (err) {
    console.warn('Falling back to built-in models catalog:', err.message);
  }

  return DEFAULT_MODELS.filter((m) => {
    if (category && m.category !== category.toUpperCase()) return false;
    return true;
  });
}

/**
 * Retrieve single 3D model by ID.
 */
async function getModelById(id) {
  try {
    const model = await prisma.immersiveModel.findUnique({
      where: { id },
    });
    if (model) return model;
  } catch (err) {
    console.warn('Database lookup failed for model:', id);
  }

  return DEFAULT_MODELS.find((m) => m.id === id) || null;
}

/**
 * Retrieve user's learning progress across experiences.
 */
async function getUserProgress(userId) {
  try {
    const progressList = await prisma.immersiveProgress.findMany({
      where: { userId },
      include: {
        experience: {
          select: {
            id: true,
            title: true,
            type: true,
            category: true,
            thumbnail: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return progressList;
  } catch (err) {
    console.warn('Database error fetching user progress:', err.message);
    return [];
  }
}

/**
 * Upsert or update progress for a user on an experience.
 */
async function upsertUserProgress(userId, { experienceId, completionPercentage, completed, score, lastStep }) {
  if (!experienceId) {
    throw new Error('Experience ID is required');
  }

  const percentage = Math.min(100, Math.max(0, parseInt(completionPercentage, 10) || 0));
  const isCompleted = completed !== undefined ? Boolean(completed) : percentage >= 100;

  try {
    const progress = await prisma.immersiveProgress.upsert({
      where: {
        userId_experienceId: {
          userId,
          experienceId,
        },
      },
      update: {
        completionPercentage: percentage,
        completed: isCompleted,
        score: score !== undefined ? parseInt(score, 10) : undefined,
        lastStep: lastStep || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId,
        experienceId,
        completionPercentage: percentage,
        completed: isCompleted,
        score: score !== undefined ? parseInt(score, 10) : null,
        lastStep: lastStep || null,
      },
    });

    return progress;
  } catch (err) {
    console.error('Error saving immersive progress to DB:', err.message);
    // Return optimistic object so client continues smoothly
    return {
      userId,
      experienceId,
      completionPercentage: percentage,
      completed: isCompleted,
      score,
      lastStep,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Create a new telemetry session for AR/VR interaction.
 */
async function startSession(userId, { experienceId, mode, deviceType, metadata }) {
  if (!experienceId) {
    throw new Error('Experience ID is required');
  }

  const validModes = ['AR', 'VR', 'THREE_D'];
  const sessionMode = validModes.includes(mode) ? mode : 'THREE_D';

  try {
    const session = await prisma.immersiveSession.create({
      data: {
        userId,
        experienceId,
        mode: sessionMode,
        status: 'IN_PROGRESS',
        deviceType: deviceType || 'DESKTOP',
        metadata: metadata || {},
      },
    });

    return session;
  } catch (err) {
    console.error('Error starting immersive session in DB:', err.message);
    return {
      id: `session-${Date.now()}`,
      userId,
      experienceId,
      mode: sessionMode,
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
    };
  }
}

/**
 * Complete or update a telemetry session.
 */
async function updateSession(sessionId, userId, { status, duration, metadata }) {
  try {
    const existing = await prisma.immersiveSession.findUnique({
      where: { id: sessionId },
    });

    if (existing && existing.userId !== userId) {
      throw new Error('Unauthorized to update this session');
    }

    const updated = await prisma.immersiveSession.update({
      where: { id: sessionId },
      data: {
        status: status || 'COMPLETED',
        completedAt: new Date(),
        duration: duration ? parseInt(duration, 10) : undefined,
        metadata: metadata || undefined,
      },
    });

    return updated;
  } catch (err) {
    console.error('Error updating immersive session:', err.message);
    return {
      id: sessionId,
      status: status || 'COMPLETED',
      completedAt: new Date().toISOString(),
      duration: duration || 0,
    };
  }
}

module.exports = {
  getExperiences,
  getModels,
  getModelById,
  getUserProgress,
  upsertUserProgress,
  startSession,
  updateSession,
};
