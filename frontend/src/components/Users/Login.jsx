import React, { useState } from "react";
import { useFormik } from "formik";
import { useDispatch } from "react-redux";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";

import {
  FaEnvelope,
  FaLock,
} from "react-icons/fa";

import {
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import { loginAPI } from "../../services/users/userService";
import AlertMessage from "../Alert/AlertMessage";
import { loginAction } from "../../redux/slice/authSlice";
import { IoReloadCircleOutline } from "react-icons/io5";


// VALIDATION
const validationSchema = Yup.object({

  email: Yup.string()
    .email("Invalid")
    .required("Email is required"),

  password: Yup.string()
    .min(5, "Password must be at least 5 characters long")
    .required("Password is required"),

});


const LoginForm = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);


  const {
    mutateAsync,
    isPending,
    isError,
    error,
    isSuccess,
  } = useMutation({

    mutationFn: loginAPI,
    mutationKey: ["login"],

  });


  const formik = useFormik({

    initialValues: {
      email: "ben@gmail.com",
      password: "123456",
    },

    validationSchema,

    onSubmit: async (values) => {

      try {

        const res = await mutateAsync(values);

        const payload = {
          id: res.user.id,
          email: res.user.email,
          username: res.user.username,
          isEmailVerified: res.user.isEmailVerified,
        };

        sessionStorage.setItem(
          "userInfo",
          JSON.stringify({
            ...payload,
            token: res.token,
          })
        );

        dispatch(loginAction(payload));

        navigate("/profile");

      } catch (e) {

        console.error(
          "Login Submission Error:",
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
        Login
      </h2>


      {/* LOADING */}

      {isPending && (
        <AlertMessage
          type="loading"
          message="Logging you in..."
        />
      )}


      {/* ERROR */}

      {isError && (
        <AlertMessage
          type="error"
          message={
            error?.response?.data?.message ||
            "Server error"
          }
        />
      )}


      {/* SUCCESS */}

      {isSuccess && (
        <AlertMessage
          type="success"
          message="Login successful!"
        />
      )}


      {/* EMAIL */}

      <div className="relative">

        <FaEnvelope
          className="absolute top-3 left-3 text-gray-400"
        />

        <input
          type="email"
          {...formik.getFieldProps("email")}
          placeholder="Email"
          disabled={isPending}
          className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300"
        />

        {formik.touched.email &&
          formik.errors.email && (

            <div className="text-red-500 text-sm">
              {formik.errors.email}
            </div>

          )}

      </div>


      {/* PASSWORD */}

      <div className="relative">

        <FaLock
          className="absolute top-3 left-3 top-3 text-gray-400"
        />

        <input
          type={showPassword ? "text" : "password"}
          {...formik.getFieldProps("password")}
          placeholder="Password"
          disabled={isPending}
          className="pl-10 pr-12 py-2 w-full rounded-md border border-gray-300"
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

            <div className="text-red-500 text-sm">
              {formik.errors.password}
            </div>

          )}

      </div>


      {/* SUBMIT BUTTON */}

      <button
        type="submit"
        disabled={isPending}
        className={`w-full text-white py-2 rounded-md flex items-center justify-center gap-2 transition
          ${
            isPending
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }
        `}
      >

        {isPending ? (

          <>
            <IoReloadCircleOutline
              className="h-5 w-5 animate-spin"
            />

            <span>Logging in...</span>
          </>

        ) : (

          <span>Login</span>

        )}
      </button>
      {/* FORGOT PASSWORD */}

      <div className="text-center mt-4">

        <Link
          to="/forgot-password"
          className="text-sm text-blue-500"
        >
          Forgot your password?
        </Link>
      </div>
    </form>
  );
};
export default LoginForm;
