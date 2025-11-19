import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FaLock } from "react-icons/fa";
import { resetPasswordAPI } from "../../services/users/userService";
import AlertMessage from "../Alert/AlertMessage";

const validationSchema = Yup.object({
  password: Yup.string()
    .min(5, "Password must be at least 5 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirming your password is required"),
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams(); // Get token from URL
  console.log("Reset token:",token);

  const { mutateAsync, isPending, isError, error, isSuccess, data } =
    useMutation({
      mutationFn: resetPasswordAPI,
      mutationKey: ["reset-password"],
    });

  const formik = useFormik({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: (values) => {
      mutateAsync({ token, password: values.password });
    },
  });

  return (
    <form
      onSubmit={formik.handleSubmit}
      className="max-w-md mx-auto my-10 bg-white p-6 rounded-xl shadow-lg space-y-6 border border-gray-200"
    >
      <h2 className="text-3xl font-semibold text-center text-gray-800">
        Reset Your Password
      </h2>

      {isPending && <AlertMessage type="loading" message="Resetting..." />}
      {isError && (
        <AlertMessage
          type="error"
          message={error?.response?.data?.message || "An error occurred"}
        />
      )}
      {isSuccess && (
        <>
          <AlertMessage type="success" message={data.message} />
          <Link
            to="/login"
            className="block text-center text-blue-500 hover:underline"
          >
            Go to Login
          </Link>
        </>
      )}

      {!isSuccess && (
        <>
          <div className="relative">
            <FaLock className="absolute top-3 left-3 text-gray-400" />
            <input
              id="password"
              type="password"
              {...formik.getFieldProps("password")}
              placeholder="New Password"
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            {formik.touched.password && formik.errors.password && (
              <span className="text-xs text-red-500">
                {formik.errors.password}
              </span>
            )}
          </div>
          <div className="relative">
            <FaLock className="absolute top-3 left-3 text-gray-400" />
            <input
              id="confirmPassword"
              type="password"
              {...formik.getFieldProps("confirmPassword")}
              placeholder="Confirm New Password"
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            {formik.touched.confirmPassword &&
              formik.errors.confirmPassword && (
                <span className="text-xs text-red-500">
                  {formik.errors.confirmPassword}
                </span>
              )}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
          >
            Reset Password
          </button>
        </>
      )}
    </form>
  );
};

export default ResetPassword;
