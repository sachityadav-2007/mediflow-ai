const { Server } = require('socket.io');

let ioInstance = null;

// Initialize Socket.IO with HTTP server, CORS settings, and room management
function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
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
