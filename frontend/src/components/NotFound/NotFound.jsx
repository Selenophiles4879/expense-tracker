import { NavLink } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl font-bold text-gray-800">
        404
      </h1>

      <h2 className="mt-4 text-2xl font-semibold text-gray-700">
        Page Not Found
      </h2>

      <p className="mt-2 text-gray-500">
        Sorry, the page you're looking for doesn't exist.
      </p>

      <NavLink
        to="/"
        className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
      >
        Go Back Home
      </NavLink>
    </div>
  );
}
