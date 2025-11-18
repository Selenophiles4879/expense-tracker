import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { FaEnvelope } from "react-icons/fa";
import { forgotPasswordAPI } from "../../services/users/userService";
import AlertMessage from "../Alert/AlertMessage";

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email is required"),
});

const ForgotPassword = () => {
  const { mutateAsync, isPending, isError, error, isSuccess, data } =
    useMutation({
      mutationFn: forgotPasswordAPI,
      mutationKey: ["forgot-password"],
    });

  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema,
    onSubmit: (values) => {
      mutateAsync(values.email);
    },
  });

  return (
    <form
      onSubmit={formik.handleSubmit}
      className="max-w-md mx-auto my-10 bg-white p-6 rounded-xl shadow-lg space-y-6 border border-gray-200"
    >
      <h2 className="text-3xl font-semibold text-center text-gray-800">
        Forgot Password
      </h2>
      <p className="text-sm text-center text-gray-500">
        Enter your email address, and we'll send you a link to reset your
        password.
      </p>

      {/* Display messages */}
      {isPending && <AlertMessage type="loading" message="Loading..." />}
      {isError && (
        <AlertMessage
          type="error"
          message={error?.response?.data?.message || "An error occurred"}
        />
      )}
      {isSuccess && <AlertMessage type="success" message={data.message} />}

      {!isSuccess && (
        <>
          <div className="relative">
            <FaEnvelope className="absolute top-3 left-3 text-gray-400" />
            <input
              id="email"
              type="email"
              {...formik.getFieldProps("email")}
              placeholder="Email"
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            {formik.touched.email && formik.errors.email && (
              <span className="text-xs text-red-500">
                {formik.errors.email}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
          >
            Send Reset Link
          </button>
        </>
      )}
    </form>
  );
};

export default ForgotPassword;