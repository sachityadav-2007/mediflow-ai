const immersiveService = require('../services/immersive.service');

/**
 * Controller: List all immersive experiences with optional filtering
 */
async function getExperiences(req, res, next) {
  try {
    const { type, category } = req.query;
    const experiences = await immersiveService.getExperiences({ type, category });

    return res.status(200).json({
      success: true,
      count: experiences.length,
      data: experiences,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: List 3D models repository
 */
async function getModels(req, res, next) {
  try {
    const { category } = req.query;
    const models = await immersiveService.getModels({ category });

    return res.status(200).json({
      success: true,
      count: models.length,
      data: models,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Get specific 3D model metadata
 */
async function getModelById(req, res, next) {
  try {
    const { id } = req.params;
    const model = await immersiveService.getModelById(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: `3D Model not found with ID: ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: model,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Get current authenticated user's progress
 */
async function getProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const progress = await immersiveService.getUserProgress(userId);

    return res.status(200).json({
      success: true,
      count: progress.length,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Update or save user progress for an experience
 */
async function updateProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const { experienceId, completionPercentage, completed, score, lastStep } = req.body;

    if (!experienceId) {
      return res.status(400).json({
        success: false,
        message: 'experienceId is required in request body.',
      });
    }

    const progress = await immersiveService.upsertUserProgress(userId, {
      experienceId,
      completionPercentage,
      completed,
      score,
      lastStep,
    });

    return res.status(200).json({
      success: true,
      message: 'Progress recorded successfully.',
      data: progress,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Start telemetry session for AR/VR interaction
 */
async function createSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { experienceId, mode, deviceType, metadata } = req.body;

    if (!experienceId) {
      return res.status(400).json({
        success: false,
        message: 'experienceId is required in request body.',
      });
    }

    const session = await immersiveService.startSession(userId, {
      experienceId,
      mode,
      deviceType,
      metadata,
    });

    return res.status(201).json({
      success: true,
      message: 'Immersive session initialized.',
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Complete or update telemetry session
 */
async function updateSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, duration, metadata } = req.body;

    const session = await immersiveService.updateSession(id, userId, {
      status,
      duration,
      metadata,
    });

    return res.status(200).json({
      success: true,
      message: 'Immersive session updated.',
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getExperiences,
  getModels,
  getModelById,
  getProgress,
  updateProgress,
  createSession,
  updateSession,
};
