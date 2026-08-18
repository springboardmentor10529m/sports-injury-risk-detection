const API_URL = "http://127.0.0.1:8000";


export async function uploadVideo(file) {

  if (!file) {
    throw new Error("Please select a video first.");
  }


  const formData = new FormData();

  formData.append("file", file);


  const response = await fetch(
    `${API_URL}/api/upload`,
    {
      method: "POST",
      body: formData
    }
  );


  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Server returned an invalid response (${response.status})`
    );
  }


  if (!response.ok) {

    throw new Error(
      data.detail ||
      data.message ||
      "Video upload failed."
    );

  }


  if (data.status === "error") {

    throw new Error(
      data.message ||
      "Video upload failed."
    );

  }


  return data;
}