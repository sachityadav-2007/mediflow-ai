require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5001;

// Create HTTP server wrapping the Express app
const server = http.createServer(app);

// Initialize Socket.IO on the HTTP server
initSocket(server);

// Handle server startup errors (e.g., port already in use)
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use.`);
    if (PORT === 5000 || PORT === '5000') {
      console.error(
        '👉 Note for macOS users: macOS AirPlay Receiver uses port 5000 by default.\n' +
        '   You can either:\n' +
        '   1. Disable AirPlay Receiver: System Settings > General > AirDrop & AirPlay > Turn off "AirPlay Receiver".\n' +
        '   2. Or set PORT=5001 (or another free port) in server/.env and update client/.env (VITE_API_URL=http://localhost:5001).\n'
      );
    }
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});

// Start listening for incoming requests
server.listen(PORT, () => {
  console.log(`MediFlow AI server running on port ${PORT}`);
});
