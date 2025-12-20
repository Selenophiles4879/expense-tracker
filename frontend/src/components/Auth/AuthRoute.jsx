// src/components/Auth/AuthRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const AuthRoute = ({ children }) => {
  const user = useSelector((state) => state?.auth?.user);

  // ✅ Only check login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AuthRoute;
