const express = require('express');
const {
  analyzeTriage,
  getTriageHistory,
  deleteTriageHistoryItem,
} = require('../controllers/triage.controller');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/triage/analyze — Analyze symptoms, detect emergencies, and generate recommendation
router.post('/analyze', authenticateUser, analyzeTriage);

// GET /api/triage/history — Retrieve authenticated patient's symptom evaluation history
router.get('/history', authenticateUser, getTriageHistory);

// DELETE /api/triage/history/:id — Delete a single history entry owned by patient
router.delete('/history/:id', authenticateUser, deleteTriageHistoryItem);

module.exports = router;

