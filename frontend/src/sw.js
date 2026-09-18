import {
  precacheAndRoute,
  cleanupOutdatedCaches,
} from "workbox-precaching";

import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { clientsClaim } from "workbox-core";

import { getAll, remove } from "./utils/offlineQueue";

// =========================================================
// LIFECYCLE
// =========================================================
//
// Matches the previous `registerType: 'autoUpdate'` behavior
// now that we own the service worker file directly.
//

self.skipWaiting();
clientsClaim();

// =========================================================
// CACHE THE PWA SHELL AND STATIC ASSETS
// =========================================================

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(
    new NetworkFirst({ cacheName: "app-shell" })
  )
);

// =========================================================
// BACKGROUND SYNC - REPLAY THE OFFLINE QUEUE
// =========================================================
//
// Best-effort replay of queued POST/PUT/DELETE transaction
// requests, even if the app isn't open when connectivity
// returns.
//
// Background Sync isn't supported everywhere (notably Safari).
// IndexedDB is the reliable fallback there: utils/networkManager.js
// drains the same queue from the page itself on the 'online'
// event whenever the app is open.
//

const replayQueue = async () => {
  const items = await getAll();

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          ...item.headers,
        },
        body: item.data
          ? JSON.stringify(item.data)
          : undefined,
      });

      if (response.ok) {
        await remove(item.id);
      } else if (response.status < 500) {
        // The server rejected it outright - don't retry forever.
        await remove(item.id);
      } else {
        // Server-side trouble - stop, try again on the next sync.
        break;
      }
    } catch {
      // Still offline - stop, leave the remainder queued.
      break;
    }
  }
};

self.addEventListener("sync", (event) => {
  if (event.tag === "replay-transaction-queue") {
    event.waitUntil(replayQueue());
  }
});
