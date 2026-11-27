const express = require('express');
const {
  getExperiences,
  getModels,
  getModelById,
  getProgress,
  updateProgress,
  createSession,
  updateSession,
} = require('../controllers/immersive.controller');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

// -----------------------------------------------------------------------------
// Immersive Care AR & VR Catalog (Public Accessible)
// -----------------------------------------------------------------------------
router.get('/experiences', getExperiences);
router.get('/models', getModels);
router.get('/models/:id', getModelById);

// -----------------------------------------------------------------------------
// User Telemetry & Progress (Authenticated)
// -----------------------------------------------------------------------------
router.get('/progress', authenticateUser, getProgress);
router.post('/progress', authenticateUser, updateProgress);
router.post('/sessions', authenticateUser, createSession);
router.patch('/sessions/:id', authenticateUser, updateSession);

module.exports = router;
