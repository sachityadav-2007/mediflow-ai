import { useState, useEffect } from 'react';
import { getHealthStatus } from '../services/api';

function ServerStatus() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'connected' | 'error'
  const [serverMessage, setServerMessage] = useState('');
  const [lastChecked, setLastChecked] = useState(null);

  // Function to call the backend health API
  const checkBackendHealth = async () => {
    setStatus('loading');
    try {
      const data = await getHealthStatus();
      if (data && data.success) {
        setStatus('connected');
        setServerMessage(data.message || 'Server is healthy');
      } else {
        setStatus('error');
        setServerMessage('Unexpected response from server');
      }
    } catch (error) {
      setStatus('error');
      setServerMessage(error.message || 'Unable to reach backend server');
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  // Run health check once when the component mounts
  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 max-w-md w-full mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
        System Health Status
      </h2>

      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">Backend Server:</span>
          {status === 'loading' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
              Checking status...
            </span>
          )}
          {status === 'connected' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
              🟢 Backend Connected
            </span>
          )}
          {status === 'error' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
              🔴 Backend Not Connected
            </span>
          )}
        </div>

        {/* Server Response Message */}
        {serverMessage && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 font-mono border border-gray-100">
            <span className="font-semibold text-gray-500">Response: </span>
            {serverMessage}
          </div>
        )}

        {/* Last Checked Timestamp */}
        {lastChecked && (
          <p className="text-xs text-gray-400 text-right">
            Last checked: {lastChecked}
          </p>
        )}

        {/* Retry / Refresh Button */}
        <button
          onClick={checkBackendHealth}
          disabled={status === 'loading'}
          className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition duration-150 ease-in-out cursor-pointer"
        >
          {status === 'loading' ? 'Checking...' : 'Check Connection Again'}
        </button>
      </div>
    </div>
  );
}

export default ServerStatus;

