import axios from "axios";

const api = axios.create({
  // Uses Vercel's environment variable if it exists, otherwise falls back to local
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
});

export default api;