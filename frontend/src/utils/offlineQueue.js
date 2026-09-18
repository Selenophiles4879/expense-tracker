// =========================================================
// OFFLINE REQUEST QUEUE (IndexedDB)
// =========================================================
//
// Stores pending POST/PUT/DELETE requests while the app is
// offline so they can be replayed once the connection returns.
//
// This module is imported both from the page (via
// networkManager.js) and from the custom service worker
// (sw.js), which is why it only uses plain IndexedDB - no
// browser-only globals beyond `indexedDB` itself.
//

const DB_NAME = "expense-tracker-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-requests";

let dbPromise = null;

const openDB = () => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error("IndexedDB is not available in this context.")
      );
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });

        store.createIndex("createdAt", "createdAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

// -----------------------------------------------------------
// entry shape:
// {
//   method: "post" | "put" | "delete",
//   url: "<absolute URL>",
//   data: <JSON-serializable body, optional>,
//   headers: { Authorization, "Idempotency-Key", ... },
//   idempotencyKey: "<uuid>" (optional),
//   createdAt: <timestamp>,
// }
// -----------------------------------------------------------

export const enqueue = async (entry) => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.add({
      ...entry,
      createdAt: entry.createdAt || Date.now(),
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAll = async () => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const request = index.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const remove = async (id) => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const count = async () => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result || 0);
    request.onerror = () => reject(request.error);
  });
};
