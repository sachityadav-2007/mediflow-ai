import axios from 'axios';

// Create an Axios instance with the backend base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check service function to test backend connectivity
export const getHealthStatus = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;

