import axios from "axios";
import { BASE_URL } from "../../utils/url";
import { getUserFromStorage } from "../../utils/getUserFromStorage";

// Always get fresh token for every request
//const getToken = () => getUserFromStorage();
// Always get fresh token for every request
const getToken = () => {
  // getUserFromStorage might return a stringified JSON or object - handle both
  const stored = getUserFromStorage();
  if (!stored) return null;

  try {
    const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
    // your login returns { token, user, message } so token is in parsed.token
    return parsed?.token || null;
  } catch (err) {
    console.warn("Failed to parse user from storage", err);
    return null;
  }
};
const token = getToken();
if (!token) throw new Error("Not authenticated");


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
