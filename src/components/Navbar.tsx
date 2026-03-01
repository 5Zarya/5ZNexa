// src/components/Navbar.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import type { FC, ReactNode, CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { getSocket } from "../services/socket"
import api from "../services/api"
import {
  FiUser,
  FiSearch,
  FiSun,
  FiMoon,
  FiSettings,
  FiLogOut,
  FiBell,
  FiMenu,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import Logo from "../assets/images/5Z.png";
import { useAuthStore } from "../stores/auth";

interface Notification {
  id: string
  title: string
  createdAt: string
  read: boolean
}

const Navbar: FC = () => {
  const user: any = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
  });

  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 6);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
      localStorage.setItem("theme", isDark ? "dark" : "light");
    }
  }, [isDark]);

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) setIsProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setIsNotifOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsProfileOpen(false);
        setIsNotifOpen(false);
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    console.log("Search:", query);
    // implement actual search if needed
  };

  const handleLogout = useCallback(() => {
    try {
      // call zustand logout (implementation in store should update state & localStorage)
      logout();
    } catch (err) {
      // fallback: clear local storage keys we use
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
    }
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  // dummy notifikasi (bisa ambil dari API)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const accessToken = useAuthStore((s) => s.accessToken)
  const unreadCount = notifications.filter((n) => !n.read).length;
  
  const markAsRead = async (id: string) => {
  try {
    await api.patch(`${notifBase}/${id}/read`)

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    )
  } catch (err) {
    console.error("Failed mark as read")
  }
}

  const markAllRead = async () => {
  try {
    await api.patch(`${notifBase}/read-all`)

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    )
  } catch (err) {
    console.error("Failed mark all read")
  }
}

const normalizeNotif = (n: any): Notification => ({
  id: n.id,
  title: n.title,
  createdAt: n.createdAt,
  read: !!n.readAt,
})
  const avatarUrl = user?.avatar ?? null;
  console.log(user)
console.log(avatarUrl)
  const resolvedUserName = user?.name ?? "Pengguna";
   // --- normalize roles ---
  const rolesRaw = (user && ((user.roles && user.roles) || (user.role && user.role))) ?? null;
  const roles: string[] = Array.isArray(rolesRaw)
    ? rolesRaw.map((r) => String(r).toLowerCase())
    : typeof rolesRaw === "string"
    ? [rolesRaw.toLowerCase()]
    : [];

  const isAdmin = roles.includes("admin") || roles.includes("administrator") || roles.includes("superadmin");

  const basePath = isAdmin
  ? "/admin/notifications"
  : "/user/notifications"
  const notifBase = isAdmin
  ? "/admin/notifications"
  : "/user/notifications"

const socketEvent = isAdmin
  ? "admin.notification"
  : "user.notification"
  
 const fetchNotifications = async () => {
  if (!accessToken) return
  try {
    const res = await api.get(notifBase)

    const mapped = res.data
      .map(normalizeNotif)
      .sort(
        (a: Notification, b: Notification) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )

    setNotifications(mapped)
  } catch (err) {
    console.error("FETCH ERROR:", err)
  }
}

useEffect(() => {
  if (!user?.id || !accessToken) return
  fetchNotifications()
}, [user?.id, accessToken, isAdmin])

useEffect(() => {
  if (isNotifOpen) {
    fetchNotifications()
  }
}, [isNotifOpen])

useEffect(() => {
  if (!user?.id || !accessToken) return

  const socket = getSocket(isAdmin ? "admin" : "user", accessToken)
  if (!socket) return

  const handler = (notif: any) => {
    const normalized = normalizeNotif(notif)

    setNotifications((prev) => {
      // prevent duplicate id
      if (prev.find((n) => n.id === normalized.id)) return prev

      return [normalized, ...prev]
    })
  }

  socket.on(socketEvent, handler)

  return () => {
    socket.off(socketEvent, handler)
  }

}, [user?.id, accessToken, isAdmin])

// --- role-based menus ---
  const userLinks = [
    { label: "Dashboard", href: "/user/dashboard" },
    { label: "Attendance", href: "/user/attendance" },
    { label: "Reports", href: "/user/reports" },
    { label: "Worktime+", href: "/user/worktimeplus" },
    { label: "Benefits", href: "/user/benefits" },
    { label: "Notifications", href: "/user/notifications" },
    { label: "Payroll", href: "/user/payroll" },
    { label: "People", href: "/user/people" },
    { label: "Integrations", href: "/user/integrations" },
    { label: "Performance", href: "/user/performance" },
  ];

  const adminLinks = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Attendance", href: "/admin/attendance" },
    { label: "Worktime+", href: "/admin/worktimeplus" },
    { label: "Performance", href: "/admin/performance" },
    { label: "Payroll", href: "/admin/payroll" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Announcement", href: "/admin/announcement" },
    { label: "Benefits", href: "/admin/benefits" },
    { label: "Integrations", href: "/admin/integrations" },
    { label: "Employees", href: "/admin/employees" },
    { label: "Notifications", href: "/admin/notifications" },
  ];

  const activeLinks = isAdmin ? adminLinks : userLinks;

  // NavLink uses react-router Link
  const NavLink: FC<{ href: string; children: ReactNode }> = ({ href, children }) => (
    <li>
      <Link
        to={href}
        className="relative block text-slate-100 font-semibold text-sm tracking-wide py-2 px-1 transition-all duration-300 hover:scale-105 group"
      >
        {children}
        <span className="absolute bottom-1 left-0 block h-[2px] w-0 bg-[#ff8a00] transition-all group-hover:w-full"></span>
      </Link>
    </li>
  );

  const STRIP_CLIP =
    "polygon(0 0, 36% 0, 40% 100%, 60% 100%, 64% 0, 100% 0, 100% 100%, 0 100%)";
  const stripStyle: CSSProperties = {
    height: 6,
    background:
      "linear-gradient(90deg, #ffdf4a 0%, #ffb347 30%, #ff6a00 55%, #ff6a00 70%, #ffdf4a 100%)",
    backgroundSize: "200% 100%",
    animation: "navGradientMove 6s linear infinite",
    WebkitClipPath: STRIP_CLIP,
    clipPath: STRIP_CLIP,
    boxShadow: "0 6px 18px rgba(255,100,0,0.12)",
  };

  const BASE_URL = "http://localhost:4000"
  return (
    <>
      {/* Navbar */}
      <motion.div
        initial={{ opacity: 0, y: -56 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="fixed top-0 left-0 w-full z-50"
      >
        <header
          className={`relative z-20 transition-all duration-400 ${isScrolled ? "backdrop-blur-sm shadow-sm" : ""}`}
          style={{
            backgroundColor: isScrolled ? "rgba(8,12,25,0.72)" : "rgba(8,12,25,0.82)",
            borderBottom: isScrolled ? "1px solid rgba(255,255,255,0.04)" : "none",
          }}
        >
          <nav className="container mx-auto flex items-center justify-between px-4 py-3">
            {/* Logo */}
            <Link to={isAdmin ? "/admin/dashboard" : "/user/dashboard"} className="flex items-center gap-2">
              <img src={Logo} alt="Logo" className="h-10 w-10 object-contain" />
              <div className="hidden sm:block leading-tight">
                <h1 className="text-sm font-semibold text-[#ffb06b]">HRS — 5ZNexa</h1>
                <p className="text-[10px] text-[#ffd6a5]">HR System</p>
              </div>
            </Link>

            {/* Links */}
            <ul className="hidden md:flex items-center gap-6 list-none">
              {activeLinks.slice(0, 6).map((l) => (
                <NavLink key={l.href} href={l.href}>
                  {l.label}
                </NavLink>
              ))}

              {activeLinks.length > 6 && (
                <li className="relative">
                  <details className="relative group">
                    <summary className="list-none cursor-pointer px-2 py-2 rounded-md text-slate-100 font-semibold hover:scale-105 flex items-center gap-2">
                      More <FiChevronDown />
                    </summary>
                    <div className="absolute left-0 mt-2 min-w-[200px] bg-slate-900/95 border border-white/6 rounded-lg shadow-lg p-2 z-40">
                      {activeLinks.slice(6).map((l) => (
                        <Link
                          key={l.href}
                          to={l.href}
                          className="block px-3 py-2 text-sm text-slate-200 hover:bg-white/5 rounded"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                </li>
              )}
            </ul>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              <button onClick={() => setIsMobileOpen((s) => !s)} className="md:hidden p-2 rounded-md hover:bg-white/5" aria-label="Open menu">
                <FiMenu className="text-slate-100" />
              </button>

              {/* Search */}
              <form onSubmit={submitSearch} className="hidden md:flex items-center">
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari karyawan / id / departemen..."
                  className="bg-slate-900/60 text-sm text-white px-3 py-1.5 rounded-md focus:ring-2 focus:ring-orange-500 outline-none w-50"
                />
                <button type="submit" className="ml-1 text-slate-300 p-2 rounded-md hover:bg-white/5">
                  <FiSearch />
                </button>
              </form>

              {/* Theme */}
              <button onClick={() => setIsDark((p) => !p)} className="p-2 rounded-md hover:bg-white/5">
                {isDark ? <FiSun className="text-xl text-slate-200" /> : <FiMoon className="text-xl text-slate-200" />}
              </button>

              {/* Notifikasi */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setIsNotifOpen((s) => !s);
                    setIsProfileOpen(false);
                  }}
                  className="p-2 rounded-md hover:bg-white/5 relative"
                >
                  <FiBell className="text-slate-200" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold text-white bg-rose-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-80 rounded-md bg-slate-900/95 border border-white/6 shadow-lg z-50"
                    >
                      <div className="p-3 border-b border-white/6 flex items-center justify-between">
                        <div className="text-sm text-slate-200 font-semibold">Notifications</div>
                        <button onClick={markAllRead} className="text-xs text-slate-400 hover:text-white">
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-60 overflow-auto">
                        {notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => markAsRead(n.id)}
                            className={`w-full text-left p-3 hover:bg-white/5 flex items-start gap-3 ${n.read ? "opacity-80" : "bg-slate-900/40"}`}
                          >
                            <div className={`w-2 h-2 mt-2 rounded-full ${n.read ? "bg-slate-600" : "bg-rose-400"}`} />
                            <div className="flex-1">
                              <div className="text-sm text-slate-100 font-medium">{n.title}</div>
                              <div className="text-xs text-slate-400 mt-1">
  {new Date(n.createdAt).toLocaleString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  })}
</div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="p-3 border-t border-white/6 text-center">
                        <Link to={isAdmin ? "/admin/notifications" : "/user/notifications"} className="text-sm text-cyan-300 hover:underline">
                          See all
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => {
                    setIsProfileOpen((s) => !s);
                    setIsNotifOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5"
                >
                  {user?.avatar ? (
  <img
    src={`${BASE_URL}${user.avatar}`}
    alt={resolvedUserName}
    className="h-8 w-8 rounded-full object-cover"
  />
) : (
  <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm text-white">
    {resolvedUserName[0]?.toUpperCase() ?? "?"}
  </div>
)}
                  <div className="hidden sm:block text-left">
                    <div className="text-xs text-slate-300 leading-none">{resolvedUserName}</div>
                    <div className="text-[10px] text-slate-400 leading-none">{isAdmin ? "Admin" : "User"}</div>
                  </div>
                  <span className="hidden md:block">{isProfileOpen ? <FiChevronUp className="text-slate-200" /> : <FiChevronDown className="text-slate-200" />}</span>
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-44 rounded-md bg-slate-900/95 border border-orange-400/10 shadow-lg z-50"
                    >
                      <Link to={isAdmin ? "/admin/profile" : "/user/profile"} className="block px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
                        <FiUser className="inline mr-2" /> Profile
                      </Link>
                      <Link to={isAdmin ? "/admin/settings" : "/user/settings"} className="block px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
                        <FiSettings className="inline mr-2" /> Settings
                      </Link>
                      <div className="border-t border-white/6" />
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
                        <FiLogOut className="inline mr-2" /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </nav>
          <div className="absolute left-0 right-0 -bottom-[3px] hidden md:block" style={stripStyle} />
        </header>
      </motion.div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="md:hidden fixed top-[72px] left-0 right-0 z-40 bg-slate-900/95 border-t border-white/6 shadow-lg">
            <div className="p-4 space-y-2">
              <form onSubmit={submitSearch} className="flex items-center gap-2">
                <input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari karyawan / id / departemen..." className="flex-1 bg-slate-800/60 text-sm text-white px-3 py-2 rounded-md outline-none" />
                <button type="submit" className="p-2 rounded-md hover:bg-white/5">
                  <FiSearch />
                </button>
              </form>

              <div className="grid grid-cols-2 gap-2">
                {activeLinks.map((l) => (
                  <Link key={l.href} to={l.href} onClick={() => setIsMobileOpen(false)} className="block px-3 py-2 bg-slate-800/40 rounded text-center text-slate-200">
                    {l.label}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => setIsDark((p) => !p)} className="flex-1 px-3 py-2 rounded bg-slate-800/40">
                  {isDark ? "Light Mode" : "Dark Mode"}
                </button>
                <Link to={isAdmin ? "/admin/profile" : "/user/profile"} className="px-3 py-2 rounded bg-slate-800/40">
                  Profile
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes navGradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
