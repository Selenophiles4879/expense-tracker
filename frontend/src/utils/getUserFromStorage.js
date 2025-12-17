// src/utils/getUserFromStorage.js

export const getUserFromStorage = () => {
  try {
    // 1. Get the "userInfo" string from localStorage
    const userInfoString = sessionStorage.getItem("userInfo");

    // 2. If it doesn't exist, return null
    if (!userInfoString) {
      return null;
    }

    // 3. Parse the JSON string into an object
    const userInfo = JSON.parse(userInfoString);

    // 4. Return the token from the object
    return userInfo?.token || null;
  } catch (err) {
    console.error("Error reading token from userInfo:", err);
    return null;
  }
};
