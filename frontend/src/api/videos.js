import api from "./axios";

/**
 * Upload a video file for the authenticated athlete.
 *
 * Sends the file as multipart/form-data to POST /videos.
 * The JWT is automatically attached by the axios request interceptor.
 * athlete_id is derived server-side from the JWT — never passed from here.
 *
 * @param {File} file  - The video File object from an <input type="file" />.
 * @param {Function} [onUploadProgress] - Optional axios progress callback.
 * @returns {Promise<Object>} Metadata response from the server.
 */
export async function uploadVideoFile(file, onUploadProgress) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/videos", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
    });

    return response.data;
}
