import axios from "axios";
import { isStandalonePWA } from "./pwaMode";
import * as offlineQueue from "./offlineQueue";

// =========================================================
// NETWORK MANAGER
// =========================================================
//
// Single source of truth for:
//
//   - The four network status values shown by
//     NetworkStatusIndicator: "connected" | "offline" |
//     "syncing" | "waiting".
//
//   - The offline request queue (pending POST/PUT/DELETE
//     transaction requests) and its replay logic.
//
//   - Idempotency key generation for non-idempotent (create)
//     requests that may get replayed.
//
// Actual connectivity is *not* determined here - InternetChecker
// keeps owning that (it already does careful health-check
// polling with its own timeout handling). This module simply
// reacts to what InternetChecker reports via setConnected().
//
// Everything in this file is a no-op outside the installed PWA
// (see isStandalonePWA), so normal browser tabs are unaffected.
//

// ---------------------------------------------------------
// STATE
// ---------------------------------------------------------

let connected = true;
let syncing = false;
let pendingCount = 0;

const listeners = new Set();

const deriveStatus = () => {
  if (!connected) {
    // Requests are queued but we can't reach the server yet.
    return pendingCount > 0 ? "waiting" : "offline";
  }

  return syncing ? "syncing" : "connected";
};

const snapshot = () => ({
  status: deriveStatus(),
  connected,
  syncing,
  pendingCount,
});

const notify = () => {
  const state = snapshot();
  listeners.forEach((listener) => listener(state));
};

// ---------------------------------------------------------
// PUBLIC READ API
// ---------------------------------------------------------

export const subscribe = (listener) => {
  listeners.add(listener);
  listener(snapshot());

  return () => listeners.delete(listener);
};

export const getStatus = () => deriveStatus();

export const isConnected = () => connected;

// ---------------------------------------------------------
// CONNECTIVITY
// ---------------------------------------------------------
//
// Called by InternetChecker whenever its own probing decides
// the app is genuinely online/offline.
//

export const setConnected = (value) => {
  if (!isStandalonePWA()) {
    return;
  }

  const changed = connected !== value;
  connected = value;

  if (changed) {
    notify();
  }

  if (value) {
    processQueue();
  }
};

// ---------------------------------------------------------
// IDEMPOTENCY KEYS
// ---------------------------------------------------------

export const generateIdempotencyKey = () => {
  if (
    typeof window !== "undefined" &&
    window.crypto?.randomUUID
  ) {
    return window.crypto.randomUUID();
  }

  return `idem-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
};

// ---------------------------------------------------------
// EXPONENTIAL BACKOFF
// ---------------------------------------------------------

export const backoffDelay = (attempt) => {
  const base = Math.min(1000 * 2 ** attempt, 30000);
  return base + Math.random() * 300; // jitter
};

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------
// OFFLINE QUEUE
// ---------------------------------------------------------

const refreshPendingCount = async () => {
  try {
    pendingCount = await offlineQueue.count();
  } catch {
    pendingCount = 0;
  }

  notify();
};

const registerBackgroundSync = async () => {
  try {
    const registration =
      await navigator.serviceWorker?.ready;

    await registration?.sync?.register(
      "replay-transaction-queue"
    );
  } catch {
    // Background Sync isn't supported here (e.g. Safari).
    // The 'online' listener + manual replay below remain the
    // reliable fallback.
  }
};

// Queue a mutating request (POST/PUT/DELETE) for later replay.
//
// `url` must be an ABSOLUTE url and `headers` must already
// contain everything the request needs (Authorization,
// Idempotency-Key, etc.) - replay can happen from the service
// worker, which has no access to the page's session storage.
export const enqueueMutation = async ({
  method,
  url,
  data,
  headers = {},
  idempotencyKey,
}) => {
  await offlineQueue.enqueue({
    method,
    url,
    data,
    headers,
    idempotencyKey,
  });

  await refreshPendingCount();
  await registerBackgroundSync();
};

// Replay everything in the queue, in order. Stops (without
// dropping anything) the moment a network-level failure happens
// again, so the remainder stays queued for the next attempt.
export const processQueue = async () => {
  if (!isStandalonePWA()) return;
  if (syncing || !connected) return;

  const items = await offlineQueue.getAll();

  if (items.length === 0) return;

  syncing = true;
  notify();

  for (const item of items) {
    let attempt = 0;
    let settled = false;

    while (attempt < 3 && !settled) {
      try {
        await axios({
          method: item.method,
          url: item.url,
          data: item.data,
          headers: item.headers,
        });

        await offlineQueue.remove(item.id);
        settled = true;
      } catch (error) {
        const isNetworkError = !error.response;

        if (!isNetworkError) {
          // The server rejected the request outright (validation,
          // auth, conflict, ...) - retrying won't help, so drop
          // it rather than blocking the rest of the queue.
          await offlineQueue.remove(item.id);
          settled = true;
          break;
        }

        attempt += 1;

        if (attempt < 3) {
          await sleep(backoffDelay(attempt));
        }
      }
    }

    if (!settled) {
      // Still unreachable - stop here, retry the rest on the
      // next 'online' event / background sync trigger.
      break;
    }
  }

  await refreshPendingCount();

  syncing = false;
  notify();
};

// ---------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------
//
// Call once from main.jsx.
//

export const init = () => {
  if (!isStandalonePWA()) return;

  refreshPendingCount();

  window.addEventListener("online", () => {
    processQueue();
    registerBackgroundSync();
  });
};
