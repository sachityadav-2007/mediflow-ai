const aiService = require('../services/ai/aiService');

/**
 * AI Prediction & Analytics Controller
 */

/**
 * GET /api/ai/doctor-availability
 * Predict doctor availability probability for a given date and time slot
 */
const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId, date, startTime } = req.query;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter doctorId is required.',
      });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Valid date (YYYY-MM-DD) is required.',
      });
    }

    const prediction = await aiService.getAvailability(doctorId, date, startTime);

    return res.status(200).json({
      success: true,
      prediction,
    });
  } catch (error) {
    console.error('Error in getDoctorAvailability:', error.message);
    const isNotFound = error.message.includes('not found');
    return res.status(isNotFound ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to predict doctor availability.',
    });
  }
};

/**
 * GET /api/ai/appointment-demand
 * Forecast appointment demand for days of week, time slots, and departments
 */
const getAppointmentDemand = async (req, res) => {
  try {
    const { department } = req.query;
    const demand = await aiService.getDemand(department);

    return res.status(200).json({
      success: true,
      demand,
    });
  } catch (error) {
    console.error('Error in getAppointmentDemand:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve appointment demand forecast.',
    });
  }
};

/**
 * GET /api/ai/waiting-time
 * Estimate patient waiting time for a doctor on a specific date & time slot
 */
const getWaitingTime = async (req, res) => {
  try {
    const { doctorId, date, startTime } = req.query;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter doctorId is required.',
      });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Valid date (YYYY-MM-DD) is required.',
      });
    }

    const waitTime = await aiService.getWaitTime(doctorId, date, startTime || '10:00');

    return res.status(200).json({
      success: true,
      waitTime,
    });
  } catch (error) {
    console.error('Error in getWaitingTime:', error.message);
    const isNotFound = error.message.includes('not found');
    return res.status(isNotFound ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to estimate patient waiting time.',
    });
  }
};

/**
 * GET /api/ai/recommended-slots
 * Discover top smart slot recommendations scored across availability, wait time, and demand
 */
const getRecommendedSlots = async (req, res) => {
  try {
    const { specialization, department, preferredDate, doctorId, limit } = req.query;

    const parsedLimit = limit ? Math.min(20, Math.max(1, parseInt(limit, 10))) : 5;

    const recommendations = await aiService.getSmartRecommendations({
      specialization,
      department,
      preferredDate,
      doctorId,
      limit: parsedLimit,
    });

    return res.status(200).json({
      success: true,
      ...recommendations,
    });
  } catch (error) {
    console.error('Error in getRecommendedSlots:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate smart slot recommendations.',
    });
  }
};

/**
 * GET /api/ai/forecast/department/:department
 * Focused 7-day demand and slot density for a specific medical department
 */
const getDepartmentForecast = async (req, res) => {
  try {
    const { department } = req.params;
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department parameter is required.',
      });
    }

    const demand = await aiService.getDemand(department);

    return res.status(200).json({
      success: true,
      department,
      ...demand,
    });
  } catch (error) {
    console.error('Error in getDepartmentForecast:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve department forecast.',
    });
  }
};

/**
 * GET /api/ai/forecast/doctor/:doctorId
 * Specific forecast and schedule analytics for a doctor
 */
const getDoctorForecast = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID parameter is required.',
      });
    }

    // Role check: If logged in as DOCTOR, doctor can only query their own ID unless ADMIN
    if (req.user.role === 'DOCTOR') {
      const doctorProfile = req.user.doctorProfile;
      if (doctorProfile && doctorProfile.id !== doctorId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You may only view forecasts for your own account.',
        });
      }
    }

    const forecast = await aiService.getDoctorForecast(doctorId);

    return res.status(200).json({
      success: true,
      ...forecast,
    });
  } catch (error) {
    console.error('Error in getDoctorForecast:', error.message);
    const isNotFound = error.message.includes('not found');
    return res.status(isNotFound ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to retrieve doctor forecast.',
    });
  }
};

/**
 * GET /api/ai/admin/analytics
 * Executive analytics and forecast overview (Hospital Administrator only)
 */
const getAdminAnalytics = async (req, res) => {
  try {
    // Strict RBAC Guard: ADMIN role only
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required.',
      });
    }

    const analytics = await aiService.getAdminAnalytics();

    return res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error in getAdminAnalytics:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve hospital AI analytics.',
    });
  }
};

/**
 * GET /api/ai/appointment-duration
 * Predict expected consultation duration in minutes
 */
const getAppointmentDuration = async (req, res) => {
  try {
    const { doctorId, department, priorityLevel, hourOfDay } = req.query;
    const durationPrediction = await aiService.getAppointmentDuration({
      doctorId,
      department,
      priorityLevel,
      hourOfDay: hourOfDay ? parseInt(hourOfDay, 10) : 10,
    });

    return res.status(200).json({
      success: true,
      duration: durationPrediction,
    });
  } catch (error) {
    console.error('Error in getAppointmentDuration:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to predict appointment duration.',
    });
  }
};

/**
 * GET /api/ai/model-status
 * Check operational status and active versions of ML models
 */
const getModelStatus = async (req, res) => {
  try {
    const status = await aiService.getModelStatus();
    return res.status(200).json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Error in getModelStatus:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve ML model status.',
    });
  }
};

/**
 * GET /api/ai/admin/evaluation
 * Access master model registry and evaluation benchmarks (ADMIN only)
 */
const getAdminModelEvaluation = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required to access ML model evaluations.',
      });
    }

    const evaluation = await aiService.getModelEvaluation();
    return res.status(200).json({
      success: true,
      evaluation,
    });
  } catch (error) {
    console.error('Error in getAdminModelEvaluation:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve ML model evaluation registry.',
    });
  }
};

/**
 * GET /api/ai/admin/data-quality
 * Inspect operational dataset completeness against model minimum thresholds (ADMIN only)
 */
const getDataQualityAudit = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required.',
      });
    }

    const audit = await aiService.getDataQualityAudit();
    return res.status(200).json({
      success: true,
      audit,
    });
  } catch (error) {
    console.error('Error in getDataQualityAudit:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute data quality audit.',
    });
  }
};

/**
 * POST /api/ai/admin/retrain
 * Trigger controlled model retraining with data quality pre-validation (ADMIN only)
 */
const triggerModelRetraining = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required.',
      });
    }

    const { modelName, forceSyntheticBenchmark } = req.body || {};
    const result = await aiService.triggerRetraining({
      modelName,
      forceSyntheticBenchmark: Boolean(forceSyntheticBenchmark),
    });

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error in triggerModelRetraining:', error.message);
    return res.status(error.message.includes('INSUFFICIENT_DATA') ? 400 : 500).json({
      success: false,
      message: error.message || 'Model retraining failed.',
    });
  }
};

/**
 * POST /api/ai/specialty-recommendation
 * AI Health Navigation Assistant: Suggests medical specialty and matching doctors
 * based on patient-described symptoms.
 */
const recommendSpecialty = async (req, res) => {
  try {
    const { symptoms } = req.body || {};

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 3 characters describing your symptoms or health concern.',
      });
    }

    if (symptoms.trim().length > 1500) {
      return res.status(400).json({
        success: false,
        message: 'Symptom description exceeds the maximum length of 1,500 characters. Please summarize your primary symptoms.',
      });
    }

    const recommendationData = await aiService.getSpecialtyRecommendation(symptoms);

    return res.status(200).json(recommendationData);
  } catch (error) {
    console.error('Error in recommendSpecialty:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate medical specialty recommendation.',
    });
  }
};

module.exports = {
  getDoctorAvailability,
  getAppointmentDemand,
  getWaitingTime,
  getRecommendedSlots,
  getDepartmentForecast,
  getDoctorForecast,
  getAdminAnalytics,
  getAppointmentDuration,
  getModelStatus,
  getAdminModelEvaluation,
  getDataQualityAudit,
  triggerModelRetraining,
  recommendSpecialty,
};

