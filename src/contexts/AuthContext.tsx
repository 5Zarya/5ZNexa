import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";

type Role = "admin" | "user";

export interface User {
  id: string;
  email: string;
  role: Role;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  authReady: boolean;
  isAuthenticated: boolean;

  login: (
    email: string,
    password: string,
    role: Role,
    remember?: boolean
  ) => Promise<any>;

  register: (
    payload: any
  ) => Promise<any>;

  logout: () => Promise<void>;

  refresh: () => Promise<void>;
  saveTokens: (
    accessToken: string,
    refreshToken: string,
    remember?: boolean
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const refreshing = useRef(false);
  const refreshPromise = useRef<Promise<void> | null>(null);

  // =============================
  // SAVE TOKENS
  // =============================
  const saveTokens = (
  accessToken: string,
  refreshToken: string,
  remember = true
) => {

  if (remember) {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
  } else {
    sessionStorage.setItem("access_token", accessToken);
    sessionStorage.setItem("refresh_token", refreshToken);
  }

  // ✅ SET STATE
  setAccessToken(accessToken);

  // ✅ SET HEADER GLOBAL
  api.defaults.headers.common.Authorization =
    `Bearer ${accessToken}`;
};

  // =============================
  // GET REFRESH TOKEN
  // =============================
  const getRefreshToken = () =>
    localStorage.getItem("refresh_token") ||
    sessionStorage.getItem("refresh_token");

  // =============================
  // CLEAR TOKENS
  // =============================
  const clearTokens = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
  };

  // =============================
  // LOAD USER
  // =============================
  const loadUser = async () => {
  try {
    const res = await api.get("/auth/me");
    const userData = res.data;

    // ✅ WAJIB
    setUser(userData);

    // optional kalau tetap pakai zustand
    useAuthStore.getState().setUser(userData);

  } catch (err: any) {
    setUser(null);
  }
};

  // =============================
// REGISTER
// =============================
const register = async (payload: any) => {

  let endpoint = "";

  if (payload.role === "admin") {
    endpoint = "/auth/register/admin";
  }

  if (payload.role === "user") {
    endpoint = "/auth/register/user";
  }

  if (!endpoint) {
    throw new Error("Invalid role");
  }

  const res = await api.post(endpoint, payload);

  return res.data;
};

  // =============================
// REFRESH TOKEN SYSTEM
// =============================
const refresh = async (): Promise<void> => {

  if (refreshPromise.current)
    return refreshPromise.current;

  refreshPromise.current = (async () => {

    try {

      const refreshToken = getRefreshToken();

      if (!refreshToken)
        throw new Error("No refresh token");

      const res = await api.post("/auth/refresh", {
        refreshToken,
      });

      const data = res.data;

      const remember =
        !!localStorage.getItem("refresh_token");

      saveTokens(
        data.accessToken,
        data.refreshToken,
        remember
      );

      // 🔥🔥🔥 FIX UTAMA DI SINI
      if (data.user) {
        setUser(data.user);
        useAuthStore.getState().setUser(data.user);
      }

      console.log("Token refreshed");

    } catch (err) {

      clearTokens();
      setUser(null);
      throw err;

    } finally {

      refreshPromise.current = null;

    }

  })();

  return refreshPromise.current;
};

  // =============================
  // LOGIN
  // =============================
  const login = async (
  email: string,
  password: string,
  role: Role,
  remember = true
) => {

  console.log("=== LOGIN START ===");
  console.log("email:", email);
  console.log("role:", role);

  try {

    const res = await api.post("/auth/login", {
      email,
      password,
      expectedRole: role,
    });

    console.log("LOGIN RESPONSE:", res.data);

    const data = res.data;

    if (data.requires2FA) {
      console.log("2FA REQUIRED");
      return data;
    }

    console.log("Saving tokens...");

    saveTokens(
  data.accessToken,
  data.refreshToken,
  remember
);

setUser(data.user);
setAuthReady(true);

    return data;

  } catch (err: any) {

    console.error("LOGIN ERROR:");
    console.error("status:", err.response?.status);
    console.error("data:", err.response?.data);
    console.error("full:", err);

    throw err;
  }
};

  // =============================
  // LOGOUT
  // =============================
  const logout = async () => {
    try {
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        await api.post("/auth/logout", {
          refreshToken,
        });
      }
    } catch {}

    clearTokens();

    setUser(null);
    setAccessToken(null);

    window.location.href = "/login";
  };

  // =============================
  // AUTO RESTORE SESSION
  // =============================
  useEffect(() => {

  const token =
  localStorage.getItem("access_token") ||
  sessionStorage.getItem("access_token");

if (token) {
  setAccessToken(token); // ✅ TAMBAH INI
  api.defaults.headers.common.Authorization =
    `Bearer ${token}`;
}
}, []);

  const initialized = useRef(false);

useEffect(() => {

  if (initialized.current) return;

  initialized.current = true;

  console.log("=== SESSION RESTORE START ===");

  (async () => {

    try {

      const refreshToken = getRefreshToken();

      console.log("Has refresh token:", !!refreshToken);
const accessToken =
  localStorage.getItem("access_token") ||
  sessionStorage.getItem("access_token");

if (refreshToken) {
  await refresh();
} else if (accessToken) {
  await loadUser();
}
// kalau tidak ada dua-duanya → jangan call API
    } catch (err) {

      console.log("Session restore failed");

    } finally {

      console.log("SESSION RESTORE DONE");
      setAuthReady(true);

      setLoading(false);

    }

  })();

}, []);

  // =============================
  // AUTO REFRESH INTERCEPTOR
  // =============================
  useEffect(() => {
  const interceptor = api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const originalRequest = err.config;

      // ❌ skip refresh endpoint
      if (originalRequest.url.includes("/auth/refresh")) {
        return Promise.reject(err);
      }

      // ❌ skip before auth ready (CRITICAL FIX)
      if (!authReady) {
        return Promise.reject(err);
      }

      if (originalRequest._retry) {
        return Promise.reject(err);
      }

      if (err.response?.status === 401) {
        originalRequest._retry = true;

        try {
          await refresh();

          const newToken =
            localStorage.getItem("access_token") ||
            sessionStorage.getItem("access_token");

          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          return api(originalRequest);
        } catch {
          clearTokens();
          setUser(null);
          return Promise.reject(err);
        }
      }

      return Promise.reject(err);
    }
  );

  return () => api.interceptors.response.eject(interceptor);
}, [authReady]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        isAuthenticated: !!user,
        authReady,
        login,
        register,
        logout,
        refresh,
        saveTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx)
    throw new Error("useAuth must be used inside AuthProvider");

  return ctx;
};
