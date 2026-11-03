/**
 * MediFlow AI 2.0 — Express ML Microservice Client
 * Communicates with the Python FastAPI ML service over HTTP with internal token authentication,
 * strict timeout handling, and graceful fallback behavior.
 */

const http = require('http');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002';
const ML_SERVICE_SECRET = process.env.ML_SERVICE_SECRET || 'mediflow_internal_ml_service_secret_2026';
const TIMEOUT_MS = 3000;

class MLServiceClient {
  constructor() {
    this.baseUrl = new URL(ML_SERVICE_URL);
    this.secret = ML_SERVICE_SECRET;
  }

  /**
   * Internal HTTP request helper with timeout and json parsing
   */
  _request(method, path, body = null, requireAuth = true) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl.hostname,
        port: this.baseUrl.port || 5002,
        path: path,
        method: method,
        timeout: TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      if (requireAuth) {
        options.headers['X-Internal-Token'] = this.secret;
      }

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.detail || `ML Service returned HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse ML service response: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`ML Service request timed out after ${TIMEOUT_MS}ms`));
      });

      req.on('error', (err) => {
        reject(new Error(`ML Service connection error: ${err.message}`));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * 1. Health Probe
   */
  async checkHealth() {
    try {
      return await this._request('GET', '/health', null, false);
    } catch (err) {
      return {
        status: 'unavailable',
        error: err.message,
        service: 'MediFlow AI ML Service',
        models_loaded: {},
      };
    }
  }

  /**
   * 2. Predict Patient Waiting Time
   */
  async predictWaitingTime({ doctorId, department, dayOfWeek, hourOfDay, queueLengthAhead, priorityLevel }) {
    try {
      const payload = {
        doctor_id: doctorId,
        department: department || 'General Medicine',
        day_of_week: (dayOfWeek || 'MONDAY').toUpperCase(),
        hour_of_day: hourOfDay || 10,
        queue_length_ahead: queueLengthAhead || 0,
        priority_level: priorityLevel || 'MEDIUM',
      };
      return await this._request('POST', '/predict/waiting-time', payload);
    } catch (err) {
      console.warn(`[MLServiceClient] Waiting time prediction fallback: ${err.message}`);
      return {
        status: 'insufficient_data',
        predicted_wait_minutes: null,
        model_version: null,
        explanation: [`ML service fallback: ${err.message}`],
        source: 'ml-service-fallback',
      };
    }
  }

  /**
   * 3. Predict Doctor Availability & Delay
   */
  async predictDoctorAvailability({ doctorId, date, startTime, dayOfWeek, department }) {
    try {
      const payload = {
        doctor_id: doctorId,
        date: date,
        start_time: startTime || '10:00',
        day_of_week: dayOfWeek,
        department: department,
      };
      return await this._request('POST', '/predict/doctor-availability', payload);
    } catch (err) {
      console.warn(`[MLServiceClient] Doctor availability prediction fallback: ${err.message}`);
      return {
        status: 'insufficient_data',
        availability_probability: null,
        delay_probability: null,
        model_version: null,
        explanation: [`ML service fallback: ${err.message}`],
        source: 'ml-service-fallback',
      };
    }
  }

  /**
   * 4. Predict Consultation Duration
   */
  async predictAppointmentDuration({ doctorId, department, dayOfWeek, hourOfDay, priorityLevel }) {
    try {
      const payload = {
        doctor_id: doctorId,
        department: department || 'General Medicine',
        day_of_week: (dayOfWeek || 'MONDAY').toUpperCase(),
        hour_of_day: hourOfDay || 10,
        priority_level: priorityLevel || 'MEDIUM',
      };
      return await this._request('POST', '/predict/appointment-duration', payload);
    } catch (err) {
      console.warn(`[MLServiceClient] Consultation duration prediction fallback: ${err.message}`);
      return {
        status: 'insufficient_data',
        predicted_duration_minutes: null,
        model_version: null,
        explanation: [`ML service fallback: ${err.message}`],
        source: 'ml-service-fallback',
      };
    }
  }

  /**
   * 5. Predict Department 7-Day Demand
   */
  async predictDepartmentDemand({ department, horizonDays = 7 }) {
    try {
      const payload = {
        department: department || 'General Medicine',
        horizon_days: horizonDays,
      };
      return await this._request('POST', '/predict/department-demand', payload);
    } catch (err) {
      console.warn(`[MLServiceClient] Department demand prediction fallback: ${err.message}`);
      return {
        status: 'insufficient_data',
        department: department || 'General Medicine',
        forecast: [],
        evaluation_status: `ML service fallback: ${err.message}`,
        source: 'ml-service-fallback',
      };
    }
  }

  /**
   * 6. Get Model Status
   */
  async getModelStatus() {
    try {
      return await this._request('GET', '/models/status');
    } catch (err) {
      return {
        status: 'unavailable',
        error: err.message,
      };
    }
  }

  /**
   * 7. Get Model Evaluation Registry (Admin Only)
   */
  async getModelEvaluation() {
    try {
      return await this._request('GET', '/models/evaluation');
    } catch (err) {
      return {
        status: 'unavailable',
        error: err.message,
      };
    }
  }
}

module.exports = new MLServiceClient();

