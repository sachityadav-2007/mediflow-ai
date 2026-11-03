import { io } from 'socket.io-client';

// Determine backend server URL from Vite environment or fallback to port 5001
const SOCKET_SERVER_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Create a single shared Socket.IO client instance
export const socket = io(SOCKET_SERVER_URL, {
  withCredentials: true,
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling'], // Fallback transport
});

// Basic client connection logging
socket.on('connect', () => {
  console.log(`[Socket.IO] Connected to MediFlow server with id: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
  console.log(`[Socket.IO] Disconnected from server: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.warn('[Socket.IO] Connection error (graceful fallback to REST APIs):', error.message);
});

export default socket;

