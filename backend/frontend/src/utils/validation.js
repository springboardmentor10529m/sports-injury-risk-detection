/**
 * Shared client-side validation helpers (mirrors backend rules).
 */

const INDIAN_MOBILE_PATTERN = /^[6789]\d{9}$/;

export const parseErrorMessage = (data, defaultMsg) => {
  if (!data) return defaultMsg;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((d) => d.msg || `${d.loc?.join(".")}: ${d.type}`)
      .join(", ");
  }
  if (typeof data.detail === "object" && data.detail !== null) {
    return JSON.stringify(data.detail);
  }
  if (data.message) return data.message;
  return defaultMsg;
};

export const validateRegistration = ({ name, email, password, phone }) => {
  const trimmedName = (name || "").trim();
  if (trimmedName.length < 2) {
    return "Name must be at least 2 characters.";
  }
  if (!/[A-Za-z]/.test(trimmedName)) {
    return "Name must contain at least one letter.";
  }

  const trimmedEmail = (email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return "Please enter a valid email address.";
  }

  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (/^\d+$/.test(password)) {
    return "Password cannot be numeric only (e.g. 123 is not allowed).";
  }

  if (!phone || !phone.trim()) {
    return "Phone number is required.";
  }
  const digits = phone.replace(/\D/g, "");
  if (!INDIAN_MOBILE_PATTERN.test(digits)) {
    return "Phone must be a 10-digit Indian mobile number starting with 6, 7, 8, or 9.";
  }

  return null;
};

export const validateAthleteProfile = (data) => {
  if (!data.sport || !data.sport.trim()) {
    return "Please select a sport.";
  }
  if (!data.position || !data.position.trim()) {
    return "Position is required.";
  }

  const age = Number(data.age);
  if (Number.isNaN(age) || age < 5 || age > 100) {
    return "Age must be between 5 and 100.";
  }

  const height = Number(data.height);
  if (Number.isNaN(height) || height < 50 || height > 250) {
    return "Height must be a realistic human value between 50 cm and 250 cm.";
  }

  const weight = Number(data.weight);
  if (Number.isNaN(weight) || weight < 20 || weight > 250) {
    return "Weight must be a realistic human value between 20 kg and 250 kg.";
  }

  const metricFields = [
    ["training_load", "Training load"],
    ["flexibility", "Flexibility"],
    ["strength", "Strength"],
    ["balance", "Balance"],
    ["endurance", "Endurance"],
  ];

  for (const [field, label] of metricFields) {
    const value = Number(data[field]);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      return `${label} must be between 0 and 100.`;
    }
  }

  return null;
};

export const normalizePhone = (phone) => {
  if (!phone || !phone.trim()) return "";
  return phone.replace(/\D/g, "");
};
