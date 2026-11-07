const triageService = require('../services/triageService');
const prisma = require('../config/db');

/**
 * =============================================================================
 * MediFlow AI 2.0 — Triage Controller
 * =============================================================================
 * Handles incoming symptom assessment requests, emergency detections,
 * and retrieval of authenticated patient triage history records.
 */

// POST /api/triage/analyze
// Protected: Authenticated User (PATIENT / general users)
const analyzeTriage = async (req, res) => {
  try {
    const { symptoms, duration, severity } = req.body;

    // Validation
    if (!symptoms || typeof symptoms !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Symptom description is required.',
      });
    }

    const trimmed = symptoms.trim();
    if (trimmed.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 3 characters describing your symptoms.',
      });
    }

    if (trimmed.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Symptom description exceeds maximum limit (2,000 characters). Please summarize your primary symptoms.',
      });
    }

    // Execute triage algorithm
    const recommendation = await triageService.analyzeSymptoms({
      symptoms: trimmed,
      duration: duration || '1-3 days',
      severity: severity || 'Moderate',
    });

    // Check if patient profile exists to persist history
    let savedHistoryRecord = null;
    let patientId = req.user?.patientProfile?.id;

    if (!patientId && req.user?.id) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id },
      });
      if (patient) {
        patientId = patient.id;
      }
    }

    if (patientId) {
      try {
        savedHistoryRecord = await triageService.saveTriageRecord({
          patientId,
          symptoms: trimmed,
          duration,
          severity,
          recommendation,
        });
      } catch (saveErr) {
        console.warn('Notice: Failed to save triage history log:', saveErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      recommendation,
      matchingDoctors: recommendation.matchingDoctors || [],
      historyId: savedHistoryRecord?.id || null,
    });
  } catch (error) {
    console.error('Error analyzing symptoms:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to process symptom triage analysis.',
    });
  }
};

// GET /api/triage/history
// Protected: Logged-in Patient only
const getTriageHistory = async (req, res) => {
  try {
    let patientId = req.user?.patientProfile?.id;

    if (!patientId && req.user?.id) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id },
      });
      if (patient) {
        patientId = patient.id;
      }
    }

    if (!patientId) {
      return res.status(200).json({
        success: true,
        history: [],
        message: 'No patient profile found for this account.',
      });
    }

    const history = await triageService.getPatientTriageHistory(patientId, 20);

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Error fetching triage history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient triage history.',
    });
  }
};

// DELETE /api/triage/history/:id
// Protected: Patient can delete their own history entry
const deleteTriageHistoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    let patientId = req.user?.patientProfile?.id;

    if (!patientId && req.user?.id) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id },
      });
      if (patient) patientId = patient.id;
    }

    if (!patientId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Patient profile required.',
      });
    }

    const result = await triageService.deletePatientTriageRecord(id, patientId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting triage record:', error);
    const statusCode = error.message.includes('Unauthorized') ? 403 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Unable to delete triage record.',
    });
  }
};

module.exports = {
  analyzeTriage,
  getTriageHistory,
  deleteTriageHistoryItem,
};

