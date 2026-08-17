import api from "./axios";

export async function getAssessments() {
    const response = await api.get("/assessments");

    return response.data;
}

export async function getAssessment(id) {
    const response = await api.get(`/assessments/${id}`);

    return response.data;
}

export async function uploadVideo(file) {
    const formData = new FormData();

    formData.append("file", file);

    const response = await api.post("/assessments/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });

    return response.data;
}