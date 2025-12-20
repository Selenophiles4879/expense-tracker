import React from "react";
import { FaUserCircle, FaEnvelope } from "react-icons/fa";
import { useFormik } from "formik";
import { useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import UpdatePassword from "./UpdatePassword";
import { updateProfileAPI } from "../../services/users/userService";
import AlertMessage from "../Alert/AlertMessage";

const UserProfile = () => {
  // 🔐 Redux user
  const user = useSelector((state) => state.auth.user);

  // 🔄 Update profile mutation
  const { mutateAsync, isPending, isError, error, isSuccess } = useMutation({
    mutationFn: updateProfileAPI,
    mutationKey: ["update-profile"],
  });

  // 📝 Formik
  const formik = useFormik({
    initialValues: {
      email: user?.email || "",
      username: user?.username || "",
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await mutateAsync(values);
      } catch (e) {
        console.error(e);
      }
    },
  });

  return (
    <>
      <div className="max-w-4xl mx-auto my-10 p-8 bg-white rounded-lg shadow-md">

        {/* 🔔 EMAIL VERIFICATION WARNING */}
        {!user?.isEmailVerified && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded mb-6 text-center">
            ⚠️ <strong>Email not verified.</strong>  
            <br />
            Please check your inbox and verify your email to unlock all features.
          </div>
        )}

        <h1 className="mb-2 text-2xl text-center font-extrabold text-gray-800">
          Welcome, {user?.username}
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Manage your account information
        </p>

        {/* 🔔 STATUS MESSAGES */}
        {isPending && (
          <AlertMessage type="loading" message="Updating profile..." />
        )}
        {isError && (
          <AlertMessage
            type="error"
            message={error?.response?.data?.message || "Update failed"}
          />
        )}
        {isSuccess && (
          <AlertMessage
            type="success"
            message="Profile updated successfully"
          />
        )}

        {/* 📝 PROFILE FORM */}
        <form onSubmit={formik.handleSubmit} className="space-y-6">

          {/* USERNAME */}
          <div className="flex items-center gap-4">
            <FaUserCircle className="text-3xl text-gray-400" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                {...formik.getFieldProps("username")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* EMAIL */}
          <div className="flex items-center gap-4">
            <FaEnvelope className="text-3xl text-gray-400" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                {...formik.getFieldProps("email")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
              {!user?.isEmailVerified && (
                <p className="text-xs text-red-500 mt-1">
                  Changing email will require re-verification
                </p>
              )}
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* 🔐 PASSWORD SECTION */}
      <div className="max-w-4xl mx-auto">
        <UpdatePassword />
      </div>
    </>
  );
};

export default UserProfile;
