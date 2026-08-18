const API_URL = "http://127.0.0.1:8000";

export async function uploadVideo(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Video upload failed");
  }

  return data;
}