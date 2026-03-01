import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Login from "./pages/Login";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import Attendance from "./pages/admin/Attendance";
import Settings from "./pages/admin/Settings";
import Profile from "./pages/admin/Profile";
import Performance from "./pages/admin/Performance";
import Payroll from "./pages/admin/Payroll";
import Reports from "./pages/admin/Reports";
import Benefits from "./pages/admin/Benefits";
import Worktimeplus from "./pages/admin/Worktimeplus";
import Employees from "./pages/admin/Employees";
import Integrations from "./pages/admin/Integrations";
import Announcement from "./pages/admin/Announcement";
import Notifications from "./pages/admin/Notifications";

// User Pages
import UserDashboard from "./pages/user/Dashboard";
import UserProfile from "./pages/user/Profile";
import UserAttendance from "./pages/user/Attendance";
import UserPayroll from "./pages/user/Payroll";
import UserPeople from "./pages/user/People";
import UserPerformance from "./pages/user/Performance";
import UserBenefits from "./pages/user/Benefits";
import UserIntegrations from "./pages/user/Integrations";
import UserWorktimeplus from "./pages/user/Worktimeplus";
import UserReports from "./pages/user/Reports";
import UserNotifications from "./pages/user/Notifications";
import UserSettings from "./pages/user/Settings";

// Context
import { NavbarProvider } from "./contexts/NavbarContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Toast
import { Toaster } from "react-hot-toast";

/* ============================================================
   ProtectedRoute Component
============================================================ */

function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "admin" | "user";
}) {
  const { isAuthenticated, user, loading } = useAuth();

  // Tunggu restore session selesai
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Loading session...
      </div>
    );
  }

  // Belum login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Jika role diperlukan dan tidak sesuai
  if (role && user.role !== role) {
    if (user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (user.role === "user") {
      return <Navigate to="/user/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}



/* ============================================================
   App Routes (dipisah agar AuthProvider tidak re-render)
============================================================ */

function AppRoutes() {
  const location = useLocation();

  const hideNavbar =
    location.pathname === "/login" ||
    location.pathname === "/";

  return (
    <>
      {!hideNavbar && <Navbar />}

      <main
  className={`
    ${!hideNavbar ? "pt-20" : ""}
    h-screen
    overflow-y-auto
    custom-scrollbar
  `}
>
        <Routes>

          {/* Default */}
          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />

          <Route path="/login" element={<Login />} />



          {/* ================= ADMIN ================= */}

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/attendance"
            element={
              <ProtectedRoute role="admin">
                <Attendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute role="admin">
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/performance"
            element={
              <ProtectedRoute role="admin">
                <Performance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/payroll"
            element={
              <ProtectedRoute role="admin">
                <Payroll />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute role="admin">
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute role="admin">
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute role="admin">
                <Employees />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/benefits"
            element={
              <ProtectedRoute role="admin">
                <Benefits />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/worktimeplus"
            element={
              <ProtectedRoute role="admin">
                <Worktimeplus />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/integrations"
            element={
              <ProtectedRoute role="admin">
                <Integrations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/announcement"
            element={
              <ProtectedRoute role="admin">
                <Announcement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute role="admin">
                <Notifications />
              </ProtectedRoute>
            }
          />



          {/* ================= USER ================= */}

          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute role="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/profile"
            element={
              <ProtectedRoute role="user">
                <UserProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/attendance"
            element={
              <ProtectedRoute role="user">
                <UserAttendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/payroll"
            element={
              <ProtectedRoute role="user">
                <UserPayroll />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/people"
            element={
              <ProtectedRoute role="user">
                <UserPeople />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/performance"
            element={
              <ProtectedRoute role="user">
                <UserPerformance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/reports"
            element={
              <ProtectedRoute role="user">
                <UserReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/settings"
            element={
              <ProtectedRoute role="user">
                <UserSettings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/integrations"
            element={
              <ProtectedRoute role="user">
                <UserIntegrations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/benefits"
            element={
              <ProtectedRoute role="user">
                <UserBenefits />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/worktimeplus"
            element={
              <ProtectedRoute role="user">
                <UserWorktimeplus />
              </ProtectedRoute>
            }
          />

          <Route
            path="/user/notifications"
            element={
              <ProtectedRoute role="user">
                <UserNotifications />
              </ProtectedRoute>
            }
          />

        </Routes>
      </main>
    </>
  );
}



/* ============================================================
   ROOT APP
============================================================ */

function App() {
  return (
    <AuthProvider>
      <NavbarProvider>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0f172a",
              color: "#e5e7eb",
              border:
                "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />

        <AppRoutes />

      </NavbarProvider>
    </AuthProvider>
  );
}

export default App;
