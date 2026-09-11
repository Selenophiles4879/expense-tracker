import axios from "axios";
import { BASE_URL } from "../../utils/url";
import { getUserFromStorage } from "../../utils/getUserFromStorage";

const getToken = () => getUserFromStorage();

//! ADD TRANSACTION
export const addTransactionAPI = async ({
  type,
  category,
  date,
  description,
  amount,
  items = [],
}) => {
  const response = await axios.post(
    `${BASE_URL}/transactions/create`,
    {
      type,
      category,
      date,
      description,
      amount,
      items,
    },
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  return response.data;
};

//! DELETE TRANSACTION
export const deleteTransactionAPI = async (id) => {
  const response = await axios.delete(
    `${BASE_URL}/transactions/delete/${id}`,
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  return response.data;
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
  const response = await axios.put(
    `${BASE_URL}/transactions/update/${id}`,
    {
      type,
      category,
      date,
      description,
      amount,
      items,
    },
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  return response.data;
};

//! LIST TRANSACTIONS
export const listTransactionsAPI = async ({
  category,
  type,
  startDate,
  endDate,
} = {}) => {
  const response = await axios.get(
    `${BASE_URL}/transactions/lists`,
    {
      params: {
        category,
        type,
        startDate,
        endDate,
      },
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  return response.data;
};


//! DOWNLOAD EXPENSE REPORT
export const downloadExpensesAPI = async ({ startDate, endDate, format = "pdf" }) => {
  const response = await axios.get(
    `${BASE_URL}/transactions/export/${format}`,
    {
      params: { startDate, endDate },
      responseType: "blob",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  const contentDisposition = response.headers["content-disposition"] || "";
  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  const filename = filenameMatch?.[1] || `expense-report.${format}`;

  return {
    blob: response.data,
    filename,
  };
};
