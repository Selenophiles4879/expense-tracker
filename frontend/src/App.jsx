import { BrowserRouter, Route, Routes } from "react-router-dom";
import HeroSection from "./components/Home/HomePage";
import PublicNavbar from "./components/NavBar/PublicNavBar";
import LoginForm from "./components/Users/Login";
import { useSelector } from "react-redux";
import RegistrationForm from "./components/Users/Register";
import PrivateNavbar from "./components/NavBar/PrivateNavBar";
import AddCategory from "./components/Category/AddCategory";
import CategoriesList from "./components/Category/CategoriesList";
import UpdateCategory from "./components/Category/UpdateCategory";
import TransactionForm from "./components/Transactions/TransactionForm";
import Dashboard from "./components/Users/Dashboard";
import UserProfile from "./components/Users/UserProfile";
import AuthRoute from "./components/Auth/AuthRoute";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { logoutAction } from "./redux/slice/authSlice";


import ForgotPassword from "./components/Users/ForgotPassword"; // <-- ADD
import ResetPassword from "./components/Users/ResetPassword"; // <-- ADD

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "userInfo" && !event.newValue) {
        dispatch(logoutAction());
        window.location.href = "/login";
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [dispatch]);

  const user = useSelector((state) => state?.auth?.user);

  return (
    <BrowserRouter>
      {/* Navbar */}

      {user ? <PrivateNavbar /> : <PublicNavbar />}
      <Routes>
        <Route path="/" element={<HeroSection />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegistrationForm />} />
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

        {/* --- ADD THESE NEW ROUTES --- */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/users/reset-password/:token" element={<ResetPassword />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
