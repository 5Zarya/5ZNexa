import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = () => {

  const { isAuthenticated, loading } = useAuth();

  // ⏳ Tunggu loading selesai
  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Checking authentication...
      </div>
    );
  }

  // ❌ Belum login → redirect ke login
  if (!isAuthenticated) {

    return <Navigate to="/login" replace />;
  }

  // ✅ Sudah login → lanjut
  return <Outlet />;
};

export default ProtectedRoute;
