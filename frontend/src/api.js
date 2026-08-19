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

export const getErrorMessage = (err, defaultMsg = 'An error occurred.') => {
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

