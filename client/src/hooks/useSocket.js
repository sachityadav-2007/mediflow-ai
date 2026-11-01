import { useEffect, useState } from 'react';
import { socket } from '../services/socket';

/**
 * Custom React Hook: useSocket
 * Subscribes to a real-time Socket.IO event and automatically cleans up
 * the listener when the component unmounts.
 *
 * Example usage:
 *   useSocket('doctor_status_changed', (data) => {
 *     console.log('Doctor changed status:', data);
 *     fetchDoctors(); // Refresh from REST API
 *   });
 */
export function useSocket(eventName, callback) {
  useEffect(() => {
    if (!socket || !eventName || typeof callback !== 'function') return;

    // Attach listener
    socket.on(eventName, callback);

    // Cleanup on unmount to prevent duplicate listeners
    return () => {
      socket.off(eventName, callback);
    };
  }, [eventName, callback]);
}

/**
 * Custom React Hook: useSocketStatus
 * Tracks live connection status of Socket.IO.
 */
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return isConnected;
}

export default useSocket;

