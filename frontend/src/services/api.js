import axios from 'axios';

const API_BASE_URL = 'https://pingforge.onrender.com';

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
  // Existing session methods
  createSession: async (name, description = '') => {
    const response = await api.post('/sessions', { name, description });
    return response.data;
  },

  getUserSessions: async () => {
    const response = await api.get('/sessions');
    return response.data;
  },

  deleteSession: async (sessionId) => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  },

  getSessionRequests: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/requests`);
    return response.data;
  },

  replayRequest: async (sessionId, requestId, targetUrl) => {
    const response = await api.post(`/sessions/${sessionId}/replay`, {
      request_id: requestId,
      target_url: targetUrl,
    });
    return response.data;
  },

  // ADD THESE MISSING ENVIRONMENT METHODS:
  getEnvironments: async () => {
    const response = await api.get('/environments');
    return response.data;
  },

  createEnvironment: async (environmentData) => {
    const response = await api.post('/environments', environmentData);
    return response.data;
  },

  updateEnvironment: async (envId, environmentData) => {
    const response = await api.put(`/environments/${envId}`, environmentData);
    return response.data;
  },

  deleteEnvironment: async (envId) => {
    const response = await api.delete(`/environments/${envId}`);
    return response.data;
  },

  // ADD THESE MISSING COLLECTION METHODS:
  getCollections: async () => {
    const response = await api.get('/collections');
    return response.data;
  },

  createCollection: async (collectionData) => {
    const response = await api.post('/collections', collectionData);
    return response.data;
  },

  deleteCollection: async (collectionId) => {
    const response = await api.delete(`/collections/${collectionId}`);
    return response.data;
  },

  getCollection: async (collectionId) => {
    const response = await api.get(`/collections/${collectionId}`);
    return response.data;
  },

  addRequestToCollection: async (collectionId, requestData) => {
    const response = await api.post(`/collections/${collectionId}/requests`, requestData);
    return response.data;
  },

  executeCollectionRequest: async (collectionId, requestId) => {
    const response = await api.post(`/collections/${collectionId}/requests/${requestId}/execute`);
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