import React from "react";
import ReactDOM from "react-dom/client";

import { Provider } from "react-redux";
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { registerSW } from "virtual:pwa-register";

import InternetChecker from "./components/InternetCheck/InternetChecker";
import App from "./App.jsx";

import "./index.css";
import { store } from "./redux/store/store.js";

import { isStandalonePWA } from "./utils/pwaMode";
import * as networkManager from "./utils/networkManager";

// Start the offline queue's event listeners (installed PWA only).
networkManager.init();

// Let React Query's online/offline state (which controls pausing
// and resuming queries) follow our own connectivity signal instead
// of just navigator.onLine, so it lines up with the network status
// indicator. Left untouched (React Query's default) in a normal
// browser tab.
if (isStandalonePWA()) {
  onlineManager.setEventListener((setOnline) =>
    networkManager.subscribe((state) => setOnline(state.connected))
  );
}

// Register service worker and check for updates on startup
registerSW({
  immediate: true,

  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Check for updates when the PWA starts
      registration.update();
    }
  },

  onRegisterError(error) {
    console.error("PWA registration error:", error);
  },
});

// React Query instance
//
// - retry/retryDelay: exponential backoff for transient network
//   failures; real API errors (4xx/5xx responses) aren't retried.
// - refetchOnReconnect: resume paused queries once the connection
//   returns (paired with the onlineManager hookup above).
const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error?.response) {
          return false;
        }

        return failureCount < 3;
      },

      retryDelay: (attempt) =>
        Math.min(1000 * 2 ** attempt, 30000),

      refetchOnReconnect: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <InternetChecker>
          <App />
        </InternetChecker>

        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
