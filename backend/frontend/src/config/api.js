/**
 * Central API base URL — uses VITE_API_URL in production, localhost in development.
 */
export const API_BASE = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export default API_BASE;
