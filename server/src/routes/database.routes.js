const express = require('express');
const { getDatabaseOverview } = require('../controllers/database.controller');

const router = express.Router();

// GET /api/db-overview - Test reading sample records from PostgreSQL
router.get('/db-overview', getDatabaseOverview);

module.exports = router;

