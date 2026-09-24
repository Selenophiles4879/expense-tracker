import React from "react";

const Profile = () => {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-gray-900">
          
          {/* Photo */}
          <div className="flex justify-center pt-10">
            <img
              src="https://drive.google.com/uc?export=view&id=1xnum2OjGLKZ61K2WTvTyEbwx3m2S1wc9"
              alt="Profile"
              className="h-40 w-40 rounded-full object-cover border-4 border-white shadow-md dark:border-gray-800"
            />
          </div>

          {/* Details */}
          <div className="px-6 py-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Mrs. Seema Tiwari
            </h1>

            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              My Mom.
            </p>

            <p className="mx-auto mt-6 max-w-2xl leading-7 text-gray-600 dark:text-gray-300">
              Welcome to ExpenseTracker. This page contains some information
              about my mummy.
            </p>

            <div className="mx-auto mt-8 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-5 dark:bg-gray-800">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  About
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                 This is my loving and caring mummy.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
