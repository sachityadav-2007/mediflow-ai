const express = require('express');
const { checkHealth } = require('../controllers/health.controller');

const router = express.Router();

// GET /api/health - Health check endpoint
router.get('/health', checkHealth);

module.exports = router;

