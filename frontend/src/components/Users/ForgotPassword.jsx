import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { FaEnvelope } from "react-icons/fa";
import axios from "axios";

import { forgotPasswordAPI } from "../../services/users/userService";
import AlertMessage from "../Alert/AlertMessage";

const validationSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email")
    .required("Email is required"),
});

const RESEND_COOLDOWN = 3 * 60; // 3 minutes

const ForgotPassword = () => {
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

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
    onSubmit: async (values) => {
      setResendMessage("");
      setResendError("");

      try {
        await mutateAsync(values.email);
        setResendSeconds(RESEND_COOLDOWN);
      } catch {
        // React Query already exposes the error through isError and error.
      }
    },
  });

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const resendResetEmail = async () => {
    if (!formik.values.email || resendSeconds > 0) return;

    setResendMessage("");
    setResendError("");

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/users/resend-password-reset`,
        {
          email: formik.values.email,
        }
      );

      setResendMessage(
        response.data?.message || "A new reset email has been sent."
      );

      setResendSeconds(
        response.data?.retryAfterSeconds || RESEND_COOLDOWN
      );
    } catch (err) {
      const retryAfter = err?.response?.data?.retryAfterSeconds;

      setResendError(
        err?.response?.data?.message ||
          "We could not resend the reset email. Please try again later."
      );

      if (retryAfter) {
        setResendSeconds(retryAfter);
      }
    }
  };

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

      {/* Status messages */}
      {isPending && (
        <AlertMessage type="loading" message="Sending reset email..." />
      )}

      {isError && (
        <AlertMessage
          type="error"
          message={
            error?.response?.data?.message || "An error occurred"
          }
        />
      )}

      {isSuccess && (
        <AlertMessage
          type="success"
          message={data?.message || "Reset email sent successfully."}
        />
      )}

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
            disabled={isPending}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
          >
            {isPending ? "Sending..." : "Send Reset Link"}
          </button>
        </>
      )}

      {/* Resend reset email section */}
      {isSuccess && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-gray-600">
            Didn't receive the email?
          </p>

          {resendMessage && (
            <AlertMessage type="success" message={resendMessage} />
          )}

          {resendError && (
            <AlertMessage type="error" message={resendError} />
          )}

          <button
            type="button"
            onClick={resendResetEmail}
            disabled={resendSeconds > 0}
            className="w-full bg-gray-700 hover:bg-gray-800 disabled:opacity-60 text-white font-bold py-2 px-4 rounded-md"
          >
            {resendSeconds > 0
              ? `Resend available in ${formatTime(resendSeconds)}`
              : "Resend reset email"}
          </button>
        </div>
      )}
    </form>
  );
};

export default ForgotPassword;
