import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URL}/api/v1/users/verify-email/${token}`)
      .then(() => {
        alert("Email verified successfully. You can now login.");
        navigate("/login");
      })
      .catch(() => {
        alert("Verification link expired or invalid.");
        navigate("/login");
      });
  }, []);

  return (
    <div className="text-center mt-20">
      <h2 className="text-xl font-bold">Verifying your email…</h2>
      <p>Please wait</p>
    </div>
  );
}
