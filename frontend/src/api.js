import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
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

// Response interceptor to handle expired/invalid tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('name');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err, defaultMsg = 'An error occurred.') => {
  if (!err?.response) {
    if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
      return 'Unable to connect to backend server. Please make sure the FastAPI backend is running on http://localhost:8000.';
    }
    return err?.message || defaultMsg;
  }
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map(d => {
      const field = d.loc[d.loc.length - 1];
      // Format to be more user friendly (e.g. capitalize field name)
      const fieldName = typeof field === 'string' ? field.charAt(0).toUpperCase() + field.slice(1) : field;
      return `${fieldName}: ${d.msg}`;
    }).join(', ');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  return defaultMsg;
};

export default api;

