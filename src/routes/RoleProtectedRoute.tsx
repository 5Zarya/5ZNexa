import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type Role = "admin" | "user";

interface Props {
  role: Role;
}

const RoleProtectedRoute = ({ role }: Props) => {

  const { user, loading } = useAuth();

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Verifying access level...
      </div>
    );
  }

  // ❌ belum login
  if (!user) {

    return <Navigate to="/login" replace />;
  }

  // ❌ role tidak sesuai
  if (user.role !== role) {

    return <Navigate to="/login" replace />;
  }

  // ✅ role sesuai
  return <Outlet />;
};

export default RoleProtectedRoute;
