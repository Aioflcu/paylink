import axios from 'axios';
import { trackAPIUsage } from './apiUsageService';
import { auth } from '../firebase';

// API Base URL - Change this to your deployed backend URL
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-deployed-backend-url.com/api'  // Replace with your actual deployed URL
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and start timing
api.interceptors.request.use(
  (config) => {
    // Start timing the request
    config.startTime = Date.now();

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and track usage
api.interceptors.response.use(
  async (response) => {
    // Track successful API usage
    try {
      const responseTime = Date.now() - response.config.startTime;
      const userId = getCurrentUserId();

      if (userId) {
        await trackAPIUsage({
          userId,
          apiKey: response.config.headers?.['X-API-Key'] || null,
          endpoint: response.config.url,
          method: response.config.method?.toUpperCase(),
          responseTime,
          success: true,
          statusCode: response.status,
          requestSize: JSON.stringify(response.config.data || {}).length,
          responseSize: JSON.stringify(response.data || {}).length,
          userAgent: navigator.userAgent
        });
      }
    } catch (trackingError) {
      console.error('Error tracking API usage:', trackingError);
      // Don't throw error to avoid breaking the response
    }

    return response;
  },
  async (error) => {
    // Track failed API usage
    try {
      const responseTime = Date.now() - (error.config?.startTime || Date.now());
      const userId = getCurrentUserId();

      if (userId) {
        await trackAPIUsage({
          userId,
          apiKey: error.config?.headers?.['X-API-Key'] || null,
          endpoint: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          responseTime,
          success: false,
          statusCode: error.response?.status || 0,
          requestSize: JSON.stringify(error.config?.data || {}).length,
          responseSize: 0,
          userAgent: navigator.userAgent
        });
      }
    } catch (trackingError) {
      console.error('Error tracking API usage:', trackingError);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function to get current user ID
function getCurrentUserId() {
  try {
    return auth.currentUser?.uid || null;
  } catch (error) {
    return null;
  }
}

export default api;
