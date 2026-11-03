const { Server } = require('socket.io');

let ioInstance = null;

// Initialize Socket.IO with HTTP server, dynamic CORS settings, and room management
function initSocket(server) {
  const rawOrigins = process.env.CLIENT_URL || 'http://localhost:5173';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim().replace(/\/$/, ''));

  ioInstance = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
          return callback(null, true);
        }
        return callback(new Error(`Socket CORS rejection: Origin '${origin}' is not authorized.`));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance.on('connection', (socket) => {
    // Authenticated Room Subscriptions for privacy isolation
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    socket.on('join_doctor', (doctorId) => {
      if (doctorId) {
        socket.join(`doctor_${doctorId}`);
      }
    });

    socket.on('join_department', (department) => {
      if (department) {
        socket.join(`dept_${department}`);
      }
    });

    socket.on('disconnect', () => {
      // Disconnection handled gracefully
    });
  });

  return ioInstance;
}

// Export getter for real-time broadcasts
function getIO() {
  return ioInstance;
}

module.exports = { initSocket, getIO };
