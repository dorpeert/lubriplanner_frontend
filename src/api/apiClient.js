// src/api/apiClient.js
import axios from "axios";


const apiClient = axios.create({
  baseURL: "https://lightcoral-emu-437776.hostingersite.com/web",
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// =======================
// REQUEST INTERCEPTOR
// =======================
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =======================
// RESPONSE INTERCEPTOR
// =======================
// ⬅️ DETECTOR DE SESIÓN CADUCADA
let redirecting = false;

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;

    if (!redirecting && (status === 401 || status === 419)) {
      redirecting = true;

      localStorage.removeItem("access_token");
      sessionStorage.setItem("SESSION_EXPIRED", "1");

      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default apiClient;
