import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && (window.location.port === "3000" || window.location.port === "80")
    ? "/api/v1"
    : "http://127.0.0.1:8000/api/v1");

export const registerUser = async (nameOrObj, email, password, role) => {
  let payload;
  if (typeof nameOrObj === "object" && nameOrObj !== null) {
    payload = nameOrObj;
  } else {
    payload = { name: nameOrObj, email, password, role };
  }
  const response = await axios.post(`${API_BASE_URL}/auth/register`, payload);
  return response.data;
};

export const loginUser = async (email, password, role) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email,
    password,
    role,
  });

  if (response.data.access_token) {
    // Store in sessionStorage so closing the tab/browser securely ends the session
    sessionStorage.setItem("user", JSON.stringify(response.data));
    localStorage.removeItem("user");
  }
  return response.data;
};

export const logoutUser = () => {
  sessionStorage.removeItem("user");
  localStorage.removeItem("user");
};

export const getCurrentUser = () => {
  try {
    const item = sessionStorage.getItem("user") || localStorage.getItem("user");
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

// Helper to pass JWT token in Authorization header
export const getAuthHeader = () => {
  const user = getCurrentUser();
  if (user && user.access_token) {
    return { Authorization: `Bearer ${user.access_token}` };
  }
  return {};
};
