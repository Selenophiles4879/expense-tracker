import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutAction } from "./redux/slice/authSlice";

// Public Components
import HeroSection from "./components/Home/HomePage";
import PublicNavbar from "./components/NavBar/PublicNavBar";
import LoginForm from "./components/Users/Login";
import RegistrationForm from "./components/Users/Register";
import ForgotPassword from "./components/Users/ForgotPassword";
import ResetPassword from "./components/Users/ResetPassword";
import VerifyEmail from "./components/Users/VerifyEmail";

// Private Components
import PrivateNavbar from "./components/NavBar/PrivateNavBar";
import AddCategory from "./components/Category/AddCategory";
import CategoriesList from "./components/Category/CategoriesList";
import UpdateCategory from "./components/Category/UpdateCategory";
import TransactionForm from "./components/Transactions/TransactionForm";
import Dashboard from "./components/Users/Dashboard";
import UserProfile from "./components/Users/UserProfile";
import AuthRoute from "./components/Auth/AuthRoute";

/**
 * INTERNAL APP CONTENT
 * (Needed so we can safely use useNavigate)
 */
function AppContent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // 🔐 Redux auth state (SINGLE SOURCE OF TRUTH)
  const user = useSelector((state) => state.auth.user);

  // 🔄 MULTI-TAB LOGOUT SYNC (MANDATORY FIX)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "userInfo" && !event.newValue) {
        dispatch(logoutAction());
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [dispatch, navigate]);

  return (
    <>
      {/* 🔁 AUTH-BASED NAVBAR */}
      {user ? <PrivateNavbar /> : <PublicNavbar />}

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<HeroSection />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/users/reset-password/:token" element={<ResetPassword />} />

        {/* PRIVATE ROUTES */}
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
      </Routes>
    </>
  );
}

/**
 * ROOT APP
 */
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
