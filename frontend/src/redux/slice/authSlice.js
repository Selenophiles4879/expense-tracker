import { createSlice } from "@reduxjs/toolkit";

// 1. Get the "userInfo" object from localStorage.
// This object is { message, token, id, email, username }
//const userInfoFromStorage = JSON.parse(localStorage.getItem("userInfo")) || null;
const userInfoFromStorage = JSON.parse(sessionStorage.getItem("userInfo")) || null;


//!Initial State
const authSlice = createSlice({
  name: "auth",
  initialState: {
    // 2. Set the state.user to be the CLEAN user object
    user: userInfoFromStorage
      ? {
          id: userInfoFromStorage.id,
          email: userInfoFromStorage.email,
          username: userInfoFromStorage.username,
        }
      : null,
  },
  //1 Reducers
  reducers: {
    loginAction: (state, action) => {
  // 3. Create the clean user object from the payload
  state.user = {
    id: action.payload.id,
    email: action.payload.email,
    username: action.payload.username,
    isEmailVerified: action.payload.isEmailVerified,
  };
},
    //Logout
    logoutAction: (state, action) => {
  state.user = null;
  // 4. (FIXED) This now correctly removes the item from localStorage
  //localStorage.removeItem("userInfo");
      sessionStorage.removeItem("userInfo");
},
  },
});
//! Generate actions
export const { loginAction, logoutAction } = authSlice.actions;
//! Generate the reducers
const authReducer = authSlice.reducer;
export default authReducer;
