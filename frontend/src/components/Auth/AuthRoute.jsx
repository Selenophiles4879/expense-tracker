import React from "react";
import { Navigate } from "react-router-dom";
import { getUserFromStorage } from "../../utils/getUserFromStorage";
import { useSelector } from "react-redux";

const AuthRoute = ({ children }) => {
  //const token = getUserFromStorage();
  const user = useSelector((state) => state?.auth?.user);

  if (!user || !user.isEmailVerified) {
  return <Navigate to="/login" replace />;
}

  return children;
};

export default AuthRoute;
