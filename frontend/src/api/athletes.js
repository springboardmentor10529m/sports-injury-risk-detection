import api from "./axios";

export async function getAthletes() {
    const response = await api.get("/athletes");

    return response.data;
}

export async function getAthlete(id) {
    const response = await api.get(`/athletes/${id}`);

    return response.data;
}

export async function updateAthlete(id, data) {
    const response = await api.patch(`/athletes/${id}`, data);

    return response.data;
}