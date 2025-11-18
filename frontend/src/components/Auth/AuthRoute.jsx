import React from "react";
import { Navigate } from "react-router-dom";
import { getUserFromStorage } from "../../utils/getUserFromStorage";

const AuthRoute = ({ children }) => {
  const token = getUserFromStorage();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AuthRoute;
