const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('sports-injury-token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'An authentication error occurred.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (athleteData) => request('/auth/register', { method: 'POST', body: JSON.stringify(athleteData) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me', { method: 'GET' }),
  updateProfile: (updates) => request('/users/profile', { method: 'PUT', body: JSON.stringify(updates) }),
  forgotPassword: (data) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
};
