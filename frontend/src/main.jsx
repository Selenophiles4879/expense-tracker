import React from "react";
import ReactDOM from "react-dom/client";

import { Provider } from "react-redux";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { registerSW } from "virtual:pwa-register";

import InternetChecker from "./components/InternetCheck/InternetChecker";
import App from "./App.jsx";

import "./index.css";
import { store } from "./redux/store/store.js";

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
const client = new QueryClient();

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
