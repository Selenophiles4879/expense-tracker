import axios from "axios";
import { BASE_URL } from "./url";
import { getUserFromStorage } from "./getUserFromStorage";
import { isStandalonePWA } from "./pwaMode";

// =========================================================
// API CLIENT
// =========================================================
//
// A thin wrapper around axios that:
//
//   1. Attaches the auth token automatically (same behavior
//      every service file was already doing by hand).
//
//   2. Retries failed GET requests with exponential backoff,
//      but only inside the installed PWA. Normal browser tabs
//      keep today's plain, no-retry axios behavior.
//
// Timeouts are treated as retryable rather than as an instant
// "not connected" - a single slow response shouldn't flip the
// UI to an error state.
//

const MAX_GET_RETRIES = 3;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = getUserFromStorage();

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const backoffDelay = (attempt) => {
  const base = Math.min(500 * 2 ** attempt, 8000);
  return base + Math.random() * 250; // jitter
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};

    // Leave browser-tab behavior exactly as it was, and only
    // ever retry idempotent GET requests.
    if (
      !isStandalonePWA() ||
      String(config.method).toLowerCase() !== "get"
    ) {
      return Promise.reject(error);
    }

    const isTimeout = error.code === "ECONNABORTED";
    const isNetworkError = !error.response;

    // A real server error (4xx/5xx with a response) is not a
    // connectivity problem - don't retry those.
    if (!isTimeout && !isNetworkError) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount >= MAX_GET_RETRIES) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;

    await sleep(backoffDelay(config.__retryCount));

    return apiClient(config);
  }
);

export default apiClient;
