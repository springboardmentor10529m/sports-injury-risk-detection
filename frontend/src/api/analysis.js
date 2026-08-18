const API_BASE_URL = "http://localhost:8000";

export async function uploadVideo(file) {
  if (!file) {
    throw new Error("Please select a video.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid response from backend.");
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.message || "Video analysis failed."
    );
  }

  return data;
}