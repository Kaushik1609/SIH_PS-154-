import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL || "http://localhost:8000",
    withCredentials: true
});

export default api;
