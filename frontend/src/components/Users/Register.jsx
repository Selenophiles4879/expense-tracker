import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";

import {
  FaUser,
  FaEnvelope,
  FaLock,
} from "react-icons/fa";

import {
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import { IoReloadCircleOutline } from "react-icons/io5";

import { registerAPI } from "../../services/users/userService";
import AlertMessage from "../Alert/AlertMessage";


// ---------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------

const validationSchema = Yup.object({

  username: Yup.string()
    .trim()
    .max(30, "Username cannot exceed 30 characters")
    .required("Username is required"),

  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),

  password: Yup.string()
    .min(6, "Password must be at least 6 characters long")
    .required("Password is required"),

  confirmPassword: Yup.string()
    .oneOf(
      [Yup.ref("password"), null],
      "Passwords must match"
    )
    .required("Confirming your password is required"),

});


// ---------------------------------------------------------
// REGISTER COMPONENT
// ---------------------------------------------------------

const RegistrationForm = () => {

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);


  const {
    mutateAsync,
    isPending,
    isError,
    error,
    isSuccess,
  } = useMutation({

    mutationFn: registerAPI,
    mutationKey: ["register"],

  });


  const formik = useFormik({

    initialValues: {

      email: "",
      password: "",
      username: "",
      confirmPassword: "",

    },

    validationSchema,

    onSubmit: async (values) => {

      try {

        await mutateAsync({

          email: values.email,
          password: values.password,
          username: values.username.trim(),

        });

      } catch (e) {

        console.error(
          "Registration Error:",
          e
        );

      }

    },

  });


  return (

    <form
      onSubmit={formik.handleSubmit}
      className="max-w-md mx-auto my-10 bg-white p-6 rounded-xl shadow-lg space-y-6 border border-gray-200"
    >

      <h2 className="text-3xl font-semibold text-center text-gray-800">
        Sign Up
      </h2>


      {/* LOADING */}

      {isPending && (

        <AlertMessage
          type="loading"
          message="Creating your account..."
        />

      )}


      {/* ERROR */}

      {isError && (

        <AlertMessage
          type="error"
          message={
            error?.response?.data?.message ||
            "Registration failed"
          }
        />

      )}


      {/* SUCCESS */}

      {isSuccess && (

        <AlertMessage
          type="success"
          message="Registration successful. Please check your email to verify your account."
        />

      )}


      <p className="text-sm text-center text-gray-500">
        Join our community now!
      </p>


      {/* USERNAME */}

      <div className="relative">

        <FaUser
          className="absolute top-3 left-3 text-gray-400"
        />

        <input
          id="username"
          type="text"
          {...formik.getFieldProps("username")}
          placeholder="Username"
          maxLength={30}
          disabled={isPending}
          className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />

        {/* CHARACTER COUNTER */}

        <div className="text-right text-xs text-gray-500 mt-1">
          {formik.values.username.length}/30
        </div>


        {formik.touched.username &&
          formik.errors.username && (

            <span className="text-xs text-red-500">
              {formik.errors.username}
            </span>

          )}

      </div>


      {/* EMAIL */}

      <div className="relative">

        <FaEnvelope
          className="absolute top-3 left-3 text-gray-400"
        />

        <input
          id="email"
          type="email"
          {...formik.getFieldProps("email")}
          placeholder="Email"
          disabled={isPending}
          className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />

        {formik.touched.email &&
          formik.errors.email && (

            <span className="text-xs text-red-500">
              {formik.errors.email}
            </span>

          )}

      </div>


      {/* PASSWORD */}

      <div className="relative">

        <FaLock
          className="absolute top-3 left-3 text-gray-400"
        />

        <input
          id="password"
          type={showPassword ? "text" : "password"}
          {...formik.getFieldProps("password")}
          placeholder="Password"
          disabled={isPending}
          className="pl-10 pr-12 py-2 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />

        {/* SHOW / HIDE BUTTON */}

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={isPending}
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500"
        >

          {showPassword ? (
            <FiEyeOff size={20} />
          ) : (
            <FiEye size={20} />
          )}

        </button>


        {formik.touched.password &&
          formik.errors.password && (

            <span className="text-xs text-red-500">
              {formik.errors.password}
            </span>

          )}

      </div>


      {/* CONFIRM PASSWORD */}

      <div className="relative">

        <FaLock
          className="absolute top-3 left-3 text-gray-400"
        />

        <input
          id="confirmPassword"
          type={
            showConfirmPassword
              ? "text"
              : "password"
          }
          {...formik.getFieldProps("confirmPassword")}
          placeholder="Confirm Password"
          disabled={isPending}
          className="pl-10 pr-12 py-2 w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />

        {/* SHOW / HIDE BUTTON */}

        <button
          type="button"
          onClick={() =>
            setShowConfirmPassword(!showConfirmPassword)
          }
          disabled={isPending}
          aria-label={
            showConfirmPassword
              ? "Hide confirm password"
              : "Show confirm password"
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500"
        >

          {showConfirmPassword ? (
            <FiEyeOff size={20} />
          ) : (
            <FiEye size={20} />
          )}

        </button>


        {formik.touched.confirmPassword &&
          formik.errors.confirmPassword && (

            <span className="text-xs text-red-500">
              {formik.errors.confirmPassword}
            </span>

          )}

      </div>


      {/* REGISTER BUTTON */}

      <button
        type="submit"
        disabled={isPending}
        className={`w-full text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 transition duration-150 ease-in-out
          ${
            isPending
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
          }
        `}
      >

        {isPending ? (

          <>
            <IoReloadCircleOutline
              className="h-5 w-5 animate-spin"
            />

            <span>Creating account...</span>
          </>

        ) : (

          <span>Register</span>

        )}

      </button>

    </form>

  );

};


export default RegistrationForm;
