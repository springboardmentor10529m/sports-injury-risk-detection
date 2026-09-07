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

/**
 * Trigger background pose estimation analysis for an uploaded video.
 *
 * POST /videos/{videoId}/analyze
 *
 * @param {string} videoId - UUID of the uploaded video.
 * @returns {Promise<{analysis_id: string, video_id: string, status: string, message: string}>}
 */
export async function triggerAnalysis(videoId) {
    const response = await api.post(`/videos/${videoId}/analyze`);
    return response.data;
}

/**
 * Poll the analysis status for a video.
 *
 * GET /videos/{videoId}/analysis
 *
 * Returns the most recent AnalysisResult for the video.
 * Call repeatedly until status is "COMPLETED" or "FAILED".
 *
 * @param {string} videoId - UUID of the video.
 * @returns {Promise<Object>} AnalysisStatusResponse from the server.
 */
export async function getAnalysisStatus(videoId) {
    const response = await api.get(`/videos/${videoId}/analysis`);
    return response.data;
}

/**
 * Fetch the extracted biomechanical feature vector for an analysis.
 *
 * GET /videos/{videoId}/features
 *
 * @param {string} videoId - UUID of the video.
 * @returns {Promise<Object>} AnalysisFeatureResponse from the server.
 */
export async function getAnalysisFeatures(videoId) {
    const response = await api.get(`/videos/${videoId}/features`);
    return response.data;
}

/**
 * Fetch the Landing Error Scoring System (LESS) approximation result for an analysis.
 *
 * GET /videos/{videoId}/less
 *
 * @param {string} videoId - UUID of the video.
 * @returns {Promise<Object>} AnalysisLESSResponse from the server.
 */
export async function getLessResult(videoId) {
    const response = await api.get(`/videos/${videoId}/less`);
    return response.data;
}

