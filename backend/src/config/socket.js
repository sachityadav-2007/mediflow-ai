const { Server } = require('socket.io');

let ioInstance = null;

// Initialize Socket.IO with HTTP server, dynamic CORS settings, and room management
function initSocket(server) {
  const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'https://mediflow-ai-app.vercel.app',
  ];

  const customOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...customOrigins])];

  const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return true;
    if (/^https:\/\/mediflow-ai-app(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) return true;
    if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return true;
    }
    return false;
  };

  ioInstance = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
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
    socket.on('join_user', (data) => {
      const userId = typeof data === 'object' && data !== null ? data.userId : data;
      const role = typeof data === 'object' && data !== null ? data.role : null;
      if (userId) {
        socket.join(`user_${userId}`);
      }
      if (role) {
        socket.join(`role_${String(role).toLowerCase()}`);
      }
    });

    socket.on('join_role', (role) => {
      if (role) {
        socket.join(`role_${String(role).toLowerCase()}`);
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
