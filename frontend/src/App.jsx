// src/App.jsx

import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  loginAction,
  logoutAction,
} from "./redux/slice/authSlice";

// =========================================================
// PUBLIC
// =========================================================

import HeroSection from "./components/Home/HomePage";
import PublicNavbar from "./components/NavBar/PublicNavBar";

import LoginForm from "./components/Users/Login";
import RegistrationForm from "./components/Users/Register";
import ForgotPassword from "./components/Users/ForgotPassword";
import ResetPassword from "./components/Users/ResetPassword";
import VerifyEmail from "./components/Users/VerifyEmail";

// =========================================================
// PRIVATE
// =========================================================

import PrivateNavbar from "./components/NavBar/PrivateNavBar";

import AddCategory from "./components/Category/AddCategory";
import CategoriesList from "./components/Category/CategoriesList";
import UpdateCategory from "./components/Category/UpdateCategory";

import TransactionForm from "./components/Transactions/TransactionForm";

import Dashboard from "./components/Users/Dashboard";
import UserProfile from "./components/Users/UserProfile";

import AuthRoute from "./components/Auth/AuthRoute";

// =========================================================
// DOCUMENT VERIFICATION
// =========================================================

import VerifyCSV from "./components/Transactions/verifyCSV";

// =========================================================
// APP CONTENT
// =========================================================

function AppContent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector(
    (state) => state.auth.user
  );

  // =======================================================
  // RESTORE AUTH ON REFRESH
  // =======================================================

  useEffect(() => {
    const stored =
      sessionStorage.getItem("userInfo");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        dispatch(
          loginAction({
            id: parsed.id,
            email: parsed.email,
            username: parsed.username,
            isEmailVerified:
              parsed.isEmailVerified,
          })
        );
      } catch (error) {
        console.error(
          "Failed to restore authentication:",
          error
        );

        sessionStorage.removeItem("userInfo");
      }
    }
  }, [dispatch]);

  // =======================================================
  // MULTI-TAB LOGOUT SYNC
  // =======================================================

  useEffect(() => {
    const handler = (event) => {
      if (
        event.key === "userInfo" &&
        !event.newValue
      ) {
        dispatch(logoutAction());

        navigate("/login", {
          replace: true,
        });
      }
    };

    window.addEventListener(
      "storage",
      handler
    );

    return () => {
      window.removeEventListener(
        "storage",
        handler
      );
    };
  }, [dispatch, navigate]);

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <>
      {/* =================================================
          NAVBAR
      ================================================= */}

      {user ? (
        <PrivateNavbar />
      ) : (
        <PublicNavbar />
      )}

      {/* =================================================
          ROUTES
      ================================================= */}

      <Routes>

        {/* ===============================================
            PUBLIC ROUTES
        =============================================== */}

        <Route
          path="/"
          element={<HeroSection />}
        />

        <Route
          path="/login"
          element={<LoginForm />}
        />

        <Route
          path="/register"
          element={<RegistrationForm />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/users/reset-password/:token"
          element={<ResetPassword />}
        />

        <Route
          path="/verify-email/:token"
          element={<VerifyEmail />}
        />

        {/* ===============================================
            DOCUMENT VERIFICATION

            IMPORTANT:
            This route is PUBLIC.

            Users must be able to verify an exported
            expense report without logging in.

            Supports:

            /verify

            /verify?verificationId=EXP-XXXX

            /verify-csv is kept for compatibility.
        =============================================== */}

        <Route
          path="/verify"
          element={<VerifyCSV />}
        />

        <Route
          path="/verify-csv"
          element={<VerifyCSV />}
        />

        {/* ===============================================
            PRIVATE ROUTES
        =============================================== */}

        <Route
          path="/dashboard"
          element={
            <AuthRoute>
              <Dashboard />
            </AuthRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <AuthRoute>
              <UserProfile />
            </AuthRoute>
          }
        />

        <Route
          path="/add-category"
          element={
            <AuthRoute>
              <AddCategory />
            </AuthRoute>
          }
        />

        <Route
          path="/categories"
          element={
            <AuthRoute>
              <CategoriesList />
            </AuthRoute>
          }
        />

        <Route
          path="/update-category/:id"
          element={
            <AuthRoute>
              <UpdateCategory />
            </AuthRoute>
          }
        />

        <Route
          path="/add-transaction"
          element={
            <AuthRoute>
              <TransactionForm />
            </AuthRoute>
          }
        />

        <Route
          path="/transactions/update/:id"
          element={
            <AuthRoute>
              <TransactionForm />
            </AuthRoute>
          }
        />

      </Routes>
    </>
  );
}

// =========================================================
// APP
// =========================================================

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}