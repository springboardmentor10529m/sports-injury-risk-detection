const API_BASE_URL = "http://127.0.0.1:8000";

export async function getDashboardData() {
  const response = await fetch(`${API_BASE_URL}/api/dashboard`);

  if (!response.ok) {
    throw new Error(
      `Dashboard API failed with status ${response.status}`
    );
  }

  const data = await response.json();

  return data;
}