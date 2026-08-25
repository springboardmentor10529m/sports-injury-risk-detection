import axios from "axios";
import { getAuthHeader } from "./authService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && (window.location.port === "3000" || window.location.port === "80")
    ? "/api/v1"
    : "http://127.0.0.1:8000/api/v1");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to automatically attach authorization header
api.interceptors.request.use(
  (config) => {
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) {
      config.headers.Authorization = authHeader.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
