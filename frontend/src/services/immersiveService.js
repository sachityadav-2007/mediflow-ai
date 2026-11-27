import api from './api';

/**
 * Fetch all active immersive experiences with optional filtering.
 * @param {Object} params - { type: 'ANATOMY'|'ORGAN'|'HOSPITAL'|'TRAINING', category: string }
 */
export async function getExperiences(params = {}) {
  try {
    const res = await api.get('/api/immersive/experiences', { params });
    return res.data;
  } catch (err) {
    console.warn('API error fetching experiences:', err);
    throw err;
  }
}

/**
 * Fetch 3D models repository.
 * @param {Object} params - { category: string }
 */
export async function getModels(params = {}) {
  try {
    const res = await api.get('/api/immersive/models', { params });
    return res.data;
  } catch (err) {
    console.warn('API error fetching models:', err);
    throw err;
  }
}

/**
 * Fetch single 3D model metadata by ID.
 */
export async function getModelById(id) {
  try {
    const res = await api.get(`/api/immersive/models/${id}`);
    return res.data;
  } catch (err) {
    console.warn(`API error fetching model ${id}:`, err);
    throw err;
  }
}

/**
 * Fetch logged-in user's learning progress.
 */
export async function getUserProgress() {
  try {
    const res = await api.get('/api/immersive/progress');
    return res.data;
  } catch (err) {
    console.warn('API error fetching user progress:', err);
    return { success: false, data: [] };
  }
}

/**
 * Save or update learning progress for an experience.
 */
export async function saveProgress({ experienceId, completionPercentage, completed, score, lastStep }) {
  try {
    const res = await api.post('/api/immersive/progress', {
      experienceId,
      completionPercentage,
      completed,
      score,
      lastStep,
    });
    return res.data;
  } catch (err) {
    console.warn('API error saving progress:', err);
    return { success: false };
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
    console.warn('API error starting session:', err);
    return { success: false };
  }
}

/**
 * Update or complete a telemetry session.
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
    console.warn('API error updating session:', err);
    return { success: false };
  }
}
