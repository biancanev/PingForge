import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email, password, fullName) => {
    const response = await api.post('/auth/register', { 
      email, 
      password, 
      full_name: fullName 
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export const sessionAPI = {
  // Create a new session
  createSession: async (name, description = '') => {
    const response = await api.post('/sessions', { name, description });
    return response.data;
  },

  // Get user's sessions
  getUserSessions: async () => {
    const response = await api.get('/sessions');
    return response.data;
  },

  // Delete a session
  deleteSession: async (sessionId) => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  },

  // Get requests for a session
  getSessionRequests: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/requests`);
    return response.data;
  },

  // Replay a request
  replayRequest: async (sessionId, requestId, targetUrl) => {
    const response = await api.post(`/sessions/${sessionId}/replay`, {
      request_id: requestId,
      target_url: targetUrl,
    });
    return response.data;
  },
};

// Keep legacy webhook API for backward compatibility
export const webhookAPI = {
  createSession: async () => {
    const response = await api.post('/webhooks');
    return response.data;
  },

  getSessionRequests: async (sessionId) => {
    const response = await api.get(`/webhooks/${sessionId}`);
    return response.data;
  },

  replayRequest: async (sessionId, requestId, targetUrl) => {
    const response = await api.post(`/webhooks/${sessionId}/replay`, {
      request_id: requestId,
      target_url: targetUrl,
    });
    return response.data;
  },
};

export default api;