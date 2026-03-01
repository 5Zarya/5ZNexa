import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");

      if (!token) {
        toast.error("Invalid verification link");
        navigate("/login");
        return;
      }

      try {
        await api.post("/auth/verify-email", { token });

        setSuccess(true);

        toast.success("Email verified successfully");

        setTimeout(() => {
          navigate("/login");
        }, 2000);

      } catch (err: any) {
        toast.error(
          err?.response?.data?.message ||
          "Verification failed"
        );
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, []);

  if (loading)
    return <div className="p-10">Verifying email...</div>;

  return (
    <div className="p-10">
      {success ? (
        <div>Email verified successfully. Redirecting...</div>
      ) : (
        <div>Verification failed.</div>
      )}
    </div>
  );
}
