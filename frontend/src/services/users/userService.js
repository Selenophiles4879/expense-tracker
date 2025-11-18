import axios from "axios";
import { BASE_URL } from "../../utils/url";
import { getUserFromStorage } from "../../utils/getUserFromStorage";

// Always get fresh token for every request
const getToken = () => getUserFromStorage();

// ---------------------- LOGIN ----------------------
export const loginAPI = async ({ email, password }) => {
  const response = await axios.post(`${BASE_URL}/users/login`, {
    email,
    password,
  });

  console.log("LOGIN API RESPONSE:", response.data);
  return response.data;
};

// ---------------------- REGISTER ----------------------
export const registerAPI = async ({ email, password, username }) => {
  const response = await axios.post(`${BASE_URL}/users/register`, {
    email,
    password,
    username,
  });

  console.log("REGISTER API RESPONSE:", response.data);
  return response.data;
};

// ---------------------- CHANGE PASSWORD ----------------------
export const changePasswordAPI = async (newPassword) => {
  const token = getToken();

  const response = await axios.put(
    `${BASE_URL}/users/change-password`,
    { newPassword },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log("CHANGE PASSWORD RESPONSE:", response.data);
  return response.data;
};

// ---------------------- UPDATE PROFILE ----------------------
export const updateProfileAPI = async ({ email, username }) => {
  const token = getToken();

  const response = await axios.put(
    `${BASE_URL}/users/update-profile`,
    { email, username },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log("UPDATE PROFILE RESPONSE:", response.data);
  return response.data;
};

// ---------------------- FORGOT PASSWORD ----------------------
export const forgotPasswordAPI = async (email) => {
  const response = await axios.post(`${BASE_URL}/users/forgot-password`, {
    email,
  });
  return response.data;
};

// ---------------------- RESET PASSWORD ----------------------
export const resetPasswordAPI = async ({ token, password }) => {
  const response = await axios.put(
    `${BASE_URL}/users/reset-password/${token}`,
    { password }
  );
  return response.data;
};