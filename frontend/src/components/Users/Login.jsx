import React from "react";
import { useFormik } from "formik";
import { useDispatch } from "react-redux";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { loginAPI } from "../../services/users/userService";
import AlertMessage from "../Alert/AlertMessage";
import { loginAction } from "../../redux/slice/authSlice";
import { IoReloadCircleOutline, IoLogInOutline } from "react-icons/io5";

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid").required("Email is required"),
  password: Yup.string()
    .min(5, "Password must be at least 5 characters long")
    .required("Password is required"),
});

const LoginForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { mutateAsync, isLoading, isError, error, isSuccess } = useMutation({
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
       id: res?.user?.id,
       email: res?.user?.email,
       username: res?.user?.username,
       token: res?.token,
        };

        sessionStorage.setItem("userInfo", JSON.stringify(payload));
        dispatch(loginAction(payload));

        navigate("/profile");
      } catch (e) {
        console.error("Login Submission Error:", e);
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

      {isLoading && <AlertMessage type="loading" message="Logging you in..." />}
      {isError && (
        <AlertMessage
          type="error"
          message={error?.response?.data?.message || "Server error"}
        />
      )}
      {isSuccess && (
        <AlertMessage type="success" message="Login successful!" />
      )}

      {/* Email Field */}
      <div className="relative">
        <FaEnvelope className="absolute top-3 left-3 text-gray-400" />
        <input
          type="email"
          {...formik.getFieldProps("email")}
          placeholder="Email"
          disabled={isLoading}
          className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300"
        />
        {formik.touched.email && formik.errors.email && (
          <div className="text-red-500 text-sm">{formik.errors.email}</div>
        )}
      </div>

      {/* Password Field */}
      <div className="relative">
        <FaLock className="absolute top-3 left-3 text-gray-400" />
        <input
          type="password"
          {...formik.getFieldProps("password")}
          placeholder="Password"
          disabled={isLoading}
          className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300"
        />
        {formik.touched.password && formik.errors.password && (
          <div className="text-red-500 text-sm">{formik.errors.password}</div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 text-white py-2 rounded-md flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <IoReloadCircleOutline className="h-5 w-5 animate-spin" />
            <span>Logging in...</span>
          </>
        ) : (
          <>
            <span>Login</span>
          </>
        )}
      </button>

      <div className="text-center mt-4">
        <Link to="/forgot-password" className="text-sm text-blue-500">
          Forgot your password?
        </Link>
      </div>
    </form>
  );
};

export default LoginForm;
