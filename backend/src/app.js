const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/health.routes');
const databaseRoutes = require('./routes/database.routes');
const authRoutes = require('./routes/auth.routes');
const doctorRoutes = require('./routes/doctor.routes');
const presenceRoutes = require('./routes/presence.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const waitlistRoutes = require('./routes/waitlist.routes');
const adminRoutes = require('./routes/admin.routes');
const aiRoutes = require('./routes/ai.routes');
const checkInRoutes = require('./routes/checkIn.routes');
const triageRoutes = require('./routes/triage.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// Trust reverse proxies (Render, Vercel, Cloudflare, Nginx) for secure cookie forwarding
app.set('trust proxy', 1);

// Configure dynamic CORS supporting single origin, comma-separated staging/prod domains, or localhost
const rawOrigins = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim().replace(/\/$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server health checks)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // Allow localhost variants in development or staging
      if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy rejection: Origin '${origin}' is not authorized.`));
    },
    credentials: true,
  })
);

// Parse incoming JSON requests and cookies
app.use(express.json());
app.use(cookieParser());

// Register API routes
app.use('/api', healthRoutes);
app.use('/api', databaseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/check-in', checkInRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/notifications', notificationRoutes);

// Catch-all 404 handler for unmapped routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized JSON error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production' && status === 500
        ? 'Internal server error.'
        : err.message || 'An unexpected error occurred.',
  });
});

module.exports = app;
