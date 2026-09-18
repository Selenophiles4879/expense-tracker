import { BASE_URL } from "../../utils/url";
import { getUserFromStorage } from "../../utils/getUserFromStorage";
import apiClient from "../../utils/apiClient";
import { isStandalonePWA } from "../../utils/pwaMode";
import * as networkManager from "../../utils/networkManager";

const getToken = () => getUserFromStorage();

// =========================================================
// OFFLINE QUEUEING HELPERS
// =========================================================
//
// Only engages inside the installed PWA (isStandalonePWA). In a
// normal browser tab these calls behave exactly as before: a
// network failure just throws, same as today.
//

const buildAuthHeaders = (extra = {}) => ({
  Authorization: `Bearer ${getToken()}`,
  ...extra,
});

const isNetworkError = (error) => !error?.response;

// Queue a mutating request (used both when we already know we're
// offline, and as a fallback when a request fails mid-flight).
const queueMutation = ({ method, path, data, idempotencyKey }) =>
  networkManager.enqueueMutation({
    method,
    url: `${BASE_URL}${path}`,
    data,
    headers: buildAuthHeaders(
      idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : {}
    ),
    idempotencyKey,
  });

//! ADD TRANSACTION
export const addTransactionAPI = async ({
  type,
  category,
  date,
  description,
  amount,
  items = [],
}) => {
  const payload = {
    type,
    category,
    date,
    description,
    amount,
    items,
  };

  // Transaction creation isn't naturally idempotent (re-sending it
  // would create a duplicate), so it gets a key that survives a
  // retry/replay. The server uses this to recognize a request it
  // has already processed.
  const idempotencyKey = networkManager.generateIdempotencyKey();

  if (isStandalonePWA() && !networkManager.isConnected()) {
    await queueMutation({
      method: "post",
      path: "/transactions/create",
      data: payload,
      idempotencyKey,
    });

    return { queued: true, idempotencyKey, ...payload };
  }

  try {
    const response = await apiClient.post(
      "/transactions/create",
      payload,
      {
        headers: buildAuthHeaders({
          "Idempotency-Key": idempotencyKey,
        }),
      }
    );

    return response.data;
  } catch (error) {
    if (isStandalonePWA() && isNetworkError(error)) {
      // Connection dropped mid-request. Queue it with the SAME
      // idempotency key so the server can safely dedupe if the
      // original request actually made it through.
      await queueMutation({
        method: "post",
        path: "/transactions/create",
        data: payload,
        idempotencyKey,
      });

      return { queued: true, idempotencyKey, ...payload };
    }

    throw error;
  }
};

//! DELETE TRANSACTION
export const deleteTransactionAPI = async (id) => {
  if (isStandalonePWA() && !networkManager.isConnected()) {
    await queueMutation({
      method: "delete",
      path: `/transactions/delete/${id}`,
    });

    return { queued: true, id };
  }

  try {
    const response = await apiClient.delete(
      `/transactions/delete/${id}`,
      { headers: buildAuthHeaders() }
    );

    return response.data;
  } catch (error) {
    if (isStandalonePWA() && isNetworkError(error)) {
      // Deleting the same id twice is safe to repeat, so no
      // idempotency key is needed here.
      await queueMutation({
        method: "delete",
        path: `/transactions/delete/${id}`,
      });

      return { queued: true, id };
    }

    throw error;
  }
};

//! UPDATE TRANSACTION
export const updateTransactionAPI = async ({
  id,
  type,
  category,
  date,
  description,
  amount,
  items = [],
}) => {
  const payload = {
    type,
    category,
    date,
    description,
    amount,
    items,
  };

  if (isStandalonePWA() && !networkManager.isConnected()) {
    await queueMutation({
      method: "put",
      path: `/transactions/update/${id}`,
      data: payload,
    });

    return { queued: true, id, ...payload };
  }

  try {
    const response = await apiClient.put(
      `/transactions/update/${id}`,
      payload,
      { headers: buildAuthHeaders() }
    );

    return response.data;
  } catch (error) {
    if (isStandalonePWA() && isNetworkError(error)) {
      // Replacing the same id's fields twice is safe to repeat,
      // so no idempotency key is needed here.
      await queueMutation({
        method: "put",
        path: `/transactions/update/${id}`,
        data: payload,
      });

      return { queued: true, id, ...payload };
    }

    throw error;
  }
};

//! LIST TRANSACTIONS
export const listTransactionsAPI = async ({
  category,
  type,
  startDate,
  endDate,
} = {}) => {
  const response = await apiClient.get("/transactions/lists", {
    params: {
      category,
      type,
      startDate,
      endDate,
    },
    headers: buildAuthHeaders(),
  });

  return response.data;
};


//! DOWNLOAD EXPENSE REPORT
export const downloadExpensesAPI = async ({ startDate, endDate, format = "pdf" }) => {
  const response = await apiClient.get(`/transactions/export/${format}`, {
    params: { startDate, endDate },
    responseType: "blob",
    headers: buildAuthHeaders(),
  });

  const contentDisposition = response.headers["content-disposition"] || "";
  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  const filename = filenameMatch?.[1] || `expense-report.${format}`;

  return {
    blob: response.data,
    filename,
  };
};
