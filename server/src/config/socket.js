const { Server } = require('socket.io');

let ioInstance = null;

// Initialize Socket.IO with HTTP server and CORS settings
function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

// Export getter for real-time broadcasts
function getIO() {
  return ioInstance;
}

module.exports = { initSocket, getIO };
