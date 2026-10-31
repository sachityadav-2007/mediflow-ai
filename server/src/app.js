const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Configure CORS for frontend access
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientUrl,
  credentials: true
}));

// Parse incoming JSON requests
app.use(express.json());

// Register API routes
app.use('/api', healthRoutes);

module.exports = app;

