// Shared axios instance used by every API helper in this folder.
// It automatically attaches the login token and handles expired sessions.
import axios from "axios";

// baseURL "/api": calls like api.get("/resumes") go to /api/resumes (proxied to the backend by Vite in dev).
const api = axios.create({
  baseURL: "/api",
});

// Request interceptor: runs before EVERY request. If a login token is saved in
// localStorage, send it as a "Bearer" token so the backend knows who we are.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("resumeai-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: runs on every response. Successful ones pass straight through.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 = Unauthorized (token missing/expired). Clear the saved login and send the user
    // to /login (unless they are already there, which would cause a redirect loop).
    if (err.response?.status === 401) {
      localStorage.removeItem("resumeai-token");
      localStorage.removeItem("resumeai-user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    // Re-throw the error so the calling code can still catch it and show a message.
    return Promise.reject(err);
  }
);

export default api;
