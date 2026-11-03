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

const app = express();

// Configure CORS for frontend access with cookie credentials
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientUrl,
  credentials: true
}));

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

module.exports = app;

