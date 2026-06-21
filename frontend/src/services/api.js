import axios from "axios";

const api = axios.create({
  // Uses Vercel's environment variable if it exists, otherwise falls back to the production backend
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://api.praveenai.tech",
});

export default api;