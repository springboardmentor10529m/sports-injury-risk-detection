import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && (window.location.port === "3000" || window.location.port === "80")
    ? "/api/v1"
    : "http://127.0.0.1:8000/api/v1");

export const registerUser = async (name, email, password, role) => {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, {
    name,
    email,
    password,
    role,
  });
  return response.data;
};

export const loginUser = async (email, password, role) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email,
    password,
    role,
  });

  if (response.data.access_token) {
    localStorage.setItem("user", JSON.stringify(response.data));
  }
  return response.data;
};

export const logoutUser = () => {
  localStorage.removeItem("user");
};

export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem("user"));
};

// Helper to pass JWT token in Authorization header
export const getAuthHeader = () => {
  const user = getCurrentUser();
  if (user && user.access_token) {
    return { Authorization: `Bearer ${user.access_token}` };
  }
  return {};
};
