import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { registerSW } from 'virtual:pwa-register';
import InternetChecker from "./components/InternetCheck/InternetChecker";

import App from "./App.jsx";
import "./index.css";
import { store } from "./redux/store/store.js";

registerSW({
  immediate: true
})

//! instance of react query
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
