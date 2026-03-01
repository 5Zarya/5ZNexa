// src/pages/user/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  FiSearch,
  FiBell,
  FiDownload,
  FiClock,
  FiUser,
  FiLogOut,
  FiPlay,
  FiPlus,
} from "react-icons/fi";
import api from "../../services/api";

type AnnouncementType = "TEXT" | "IMAGE";

interface Announcement {
  id: string;
  type: AnnouncementType;
  title?: string;
  content?: string;
  imageUrl?: string;
  themeColor?: string;
  textColor?: string;
  pinned: boolean;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  publishAt?: string;
  gradientFrom?: string;
  gradientTo?: string;
  layout?: "LEFT" | "CENTER" | "RIGHT";
}

/* ---------------- Components ---------------- */
const Panel: React.FC<{ title?: string; subtitle?: string; className?: string; children?: React.ReactNode }> = ({
  title,
  subtitle,
  className = "",
  children,
}) => (
  <div
    className={`p-4 rounded-2xl border border-white/6 bg-gradient-to-br from-black/20 to-white/2 backdrop-blur-sm shadow-sm ${className}`}
  >
    {title && (
      <div className="mb-3">
        <div className="text-sm text-slate-300 font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
      </div>
    )}
    {children}
  </div>
);

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

const resolveImageUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
};

const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: string; accent?: string }> = ({
  label,
  value,
  hint,
  accent = "bg-gradient-to-r from-yellow-400 to-orange-400",
}) => (
  <motion.div
    whileHover={{ y: -6 }}
    className={`p-4 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md ${accent}`}
  >
    <div className="text-xs text-slate-300">{label}</div>
    <div className="text-2xl font-extrabold text-white leading-none">
      {value}
    </div>
    {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
  </motion.div>
);


const ProgressBar: React.FC<{ progress: number; label?: string }> = ({
  progress,
  label,
}) => (
  <div>
    {label && <div className="text-xs text-slate-300 mb-1">{label}</div>}
    <div className="h-2 rounded-full bg-slate-800/60 overflow-hidden">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400"
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      />
    </div>
    <div className="text-xs text-slate-400 mt-1">{progress}%</div>
  </div>
);

/* ---------------- Main Dashboard ---------------- */
const UserDashboard: React.FC = () => {
/* -------- Dashboard state -------- */
const [dashboard, setDashboard] = useState<{
  user?: {
    name: string;
    role: string;
    lastPunch: string | null;
  };
  stats?: {
  remainingLeave?: number;
  avgAttendance?: number;
  totalPayrollThisMonth?: number;
  totalOvertimeThisMonth?: number;
  totalWorkingDaysThisMonth?: number;
};
  attendanceTrend?: {
  date: string;
  hadir: number;
  absen: number;
}[];
} | null>(null);
const remainingLeave = dashboard?.stats?.remainingLeave;
const avgAttendance = dashboard?.stats?.avgAttendance ?? 0;
const totalPayroll = dashboard?.stats?.totalPayrollThisMonth ?? 0;
const totalOvertime = dashboard?.stats?.totalOvertimeThisMonth ?? 0;
const workingDays = dashboard?.stats?.totalWorkingDaysThisMonth ?? 0;
const navigate = useNavigate();

/* -------- User summary -------- */
const [user, setUser] = useState<{
  name: string;
  role: string;
  lastPunch: string | null;
} | null>(null);

/* -------- Attendance -------- */
const [attendanceData, setAttendanceData] = useState<
  { date: string; hadir: number; absen: number }[]
>([]);

const { authReady, isAuthenticated } = useAuth();

useEffect(() => {

  if (!authReady) return;
  if (!isAuthenticated) return;

  const loadAll = async () => {
    try {
      const [dashboardRes, announcementRes] = await Promise.all([
        api.get("/user/dashboard"),
        api.get("/user/announcements"),
      ]);

      setDashboard(dashboardRes.data);
      setUser(dashboardRes.data.user);
      setAttendanceData(dashboardRes.data.attendanceTrend ?? []);
      setAnnouncements(announcementRes.data);
    } catch (err) {
      console.error("Failed load dashboard", err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  setLoadingAnnouncements(true);
  loadAll();

}, [authReady, isAuthenticated]);

  /* -------- Announcements -------- */
const [announcements, setAnnouncements] = useState<Announcement[]>([]);
const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
const sortedAnnouncements = useMemo(() => {
  const priorityOrder = {
    URGENT: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };

  return [...announcements].sort((a, b) => {

    /* pinned first */
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    /* priority */
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }

    /* newest first */
    return new Date(b.publishAt ?? 0).getTime()
      - new Date(a.publishAt ?? 0).getTime();

  });

}, [announcements]);

const AnnouncementCard: React.FC<{ data: Announcement }> = ({ data }) => {
  const date = data.publishAt
    ? new Date(data.publishAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  /* ================= IMAGE ================= */
  if (data.type === "IMAGE" && data.imageUrl) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40"
    >

      {/* IMAGE */}
<div className="w-full aspect-[16/5] overflow-hidden">
  <img
    src={resolveImageUrl(data.imageUrl)}
    alt="announcement"
    className="w-full h-full object-cover"
  />
</div>

      {/* ✅ OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* ✅ CONTENT */}
      <div className="absolute bottom-0 left-0 right-0 p-4">

        {/* PINNED BADGE */}
        {data.pinned && (
          <span className="inline-block mb-1 text-[10px] px-2 py-1 bg-yellow-400 text-black rounded">
            PINNED
          </span>
        )}

        {/* TITLE */}
        {data.title && (
          <div className="text-white font-semibold text-sm">
            {data.title}
          </div>
        )}

        {/* META */}
        <div className="flex justify-between text-xs text-slate-300 mt-1">

          <span className={
            data.priority === "URGENT"
              ? "text-red-400 font-semibold"
              : data.priority === "HIGH"
              ? "text-orange-400"
              : ""
          }>
            {data.priority}
          </span>

          <span>{date}</span>

        </div>

      </div>

    </motion.div>
  );
}

  /* ================= TEXT ================= */
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl p-6 border border-white/10"
      style={{
        background: `linear-gradient(135deg,
          ${data.gradientFrom ?? "#0f172a"},
          ${data.gradientTo ?? "#020617"})`,
        color: data.textColor ?? "#ffffff",
      }}
    >
      <div
        className={`flex ${
          data.layout === "LEFT"
            ? "justify-start text-left"
            : data.layout === "RIGHT"
            ? "justify-end text-right"
            : "justify-center text-center"
        }`}
      >
        <div className="max-w-xl">
          <div className="flex items-center gap-2">

  <h3 className="text-xl font-bold">
    {data.title}
  </h3>

  {data.pinned && (
    <span className="text-[10px] px-2 py-1 bg-yellow-400 text-black rounded">
      PINNED
    </span>
  )}

</div>
          <p className="text-sm opacity-90">
            {data.content}
          </p>

          <div className="text-xs opacity-70 mt-4">
            {date}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

  /* -------- Payslips (empty) -------- */
  const [payslips] = useState<any[]>([]);


  /* -------- Courses (empty) -------- */
  const [courses] = useState<any[]>([]);

  const avgLearning = useMemo(() => {
    if (!courses.length) return 0;
    return Math.round(
      courses.reduce((s, c) => s + c.progress, 0) / courses.length
    );
  }, [courses]);
  /* -------- Notifications (empty) -------- */
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; text: string; ts: string; read: boolean }[]
  >([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markNotifRead = (id: string) => {
    setNotifications((s) =>
      s.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };
  return (
    <div className="min-h-screen p-6 bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Halo, {user?.name ?? "User"} 👋</h1>
<div className="text-sm text-slate-400">
  {user?.role ?? "—"} • Last active: {user?.lastPunch ?? "—"}
</div>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/40 rounded px-3 py-2">
              <FiSearch className="text-slate-400" />
              <input
                placeholder="Cari..."
                className="bg-transparent outline-none text-slate-200 text-sm w-52"
              />
            </div>

            {/* Notification */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((s) => !s)}
                className="p-2 rounded-md hover:bg-white/5"
              >
                <FiBell className="text-slate-200" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 text-xs font-bold bg-rose-500 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-80 rounded-md bg-slate-900/95 border border-white/6 shadow-lg z-40"
                >
                  <div className="p-3 border-b border-white/6">
                    <div className="text-sm font-semibold">Notifications</div>
                  </div>

                  <div className="max-h-64 overflow-auto">
                    {notifications.length === 0 ? (
                      <div className="p-3 text-sm text-slate-400">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotifRead(n.id)}
                          className="p-3 border-b border-white/6 cursor-pointer"
                        >
                          <div className="text-sm">{n.text}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {n.ts}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
                {/* ANNOUNCEMENTS */}
<Panel
  title="Announcements"
  subtitle={
    loadingAnnouncements
      ? "Memuat pengumuman..."
      : announcements.length === 0
      ? "Tidak ada pengumuman"
      : "Informasi terbaru dari admin"
  }
>
  {loadingAnnouncements ? (
    <div className="text-sm text-slate-400">Loading...</div>
  ) : announcements.length === 0 ? (
    <div className="text-center py-10 text-slate-400">

  <div className="text-3xl mb-2">📢</div>

  <div className="text-sm font-medium">
    Belum ada announcement
  </div>

  <div className="text-xs text-slate-500 mt-1">
    Pengumuman dari admin akan muncul di sini
  </div>

</div>
  ) : (
    <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide">
  <div className="flex">

    {sortedAnnouncements.map((a) => (
      <div
        key={a.id}
        className="w-full flex-shrink-0 snap-center px-1"
      >
        <AnnouncementCard data={a} />
      </div>
    ))}

  </div>
</div>
  )}
</Panel>

<Panel title="Quick Actions">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

    <button
      onClick={() => navigate("/user/attendance")}
      className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 transition"
    >
      <FiClock className="mb-2 text-emerald-400" />
      <div className="text-sm">Absen</div>
    </button>

    <button
      onClick={() => navigate("/user/payroll")}
      className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 transition"
    >
      <FiDownload className="mb-2 text-cyan-400" />
      <div className="text-sm">Download Slip Gaji</div>
    </button>

    <button
      onClick={() => navigate("/user/benefits")}
      className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 transition"
    >
      <FiPlus className="mb-2 text-indigo-400" />
      <div className="text-sm">Ajukan Cuti</div>
    </button>

    <button
      onClick={() => navigate("/user/profile")}
      className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 transition"
    >
      <FiUser className="mb-2 text-purple-400" />
      <div className="text-sm">Profil Saya</div>
    </button>

  </div>
</Panel>

<Panel title="Hari Ini">
  <div className="flex items-center gap-3">
    <FiClock className="text-emerald-400" />
    <div>
      <div className="text-sm font-semibold">Status Kehadiran</div>
      <div className="text-xs text-slate-400">
        {user?.lastPunch ? "Sudah absen" : "Belum absen"}
      </div>
    </div>
  </div>
</Panel>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
  label="Kehadiran"
  value={`${avgAttendance}%`}
  hint="14 hari terakhir"
  accent="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 ring-1 ring-emerald-400/30"
/>

<StatCard
  label="Sisa Cuti"
  value={remainingLeave ?? "—"}
  hint="Total Sisa Cuti Bulan ini"
  accent="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 ring-1 ring-indigo-400/30"
/>
<StatCard
  label="Payroll Bulan Ini"
  value={`Rp ${totalPayroll.toLocaleString("id-ID")}`}
  hint="Sudah termasuk lembur"
  accent="bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 ring-1 ring-cyan-400/30"
/>
<StatCard
  label="Total Lembur"
  value={`${totalOvertime} Jam`}
  hint="Bulan berjalan"
  accent="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 ring-1 ring-indigo-400/30"
/>
<StatCard
  label="Hari Kerja"
  value={`${workingDays} Hari`}
  hint="Bulan ini"
  accent="bg-gradient-to-br from-sky-500/10 to-blue-500/10 ring-1 ring-sky-400/30"
/>

        </div>
        <ProgressBar
  label="Pemakaian Cuti"
  progress={
    remainingLeave !== undefined
      ? Math.round(((12 - remainingLeave) / 12) * 100)
      : 0
  }
/>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Charts */}
          <div className="lg:col-span-2 space-y-6">
            <Panel
  title="Attendance Trend"
  subtitle="14 hari terakhir"
  className="bg-slate-900/70"
>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
  data={attendanceData}
  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
>
  <XAxis
  dataKey="date"
  tick={{ fill: "#94a3b8", fontSize: 12 }}
  axisLine={false}
  tickLine={false}
/>

<YAxis
  allowDecimals={false}
  tick={{ fill: "#94a3b8", fontSize: 12 }}
  axisLine={false}
  tickLine={false}
/>
  <Tooltip />
  <Area
  type="monotone"
  dataKey="hadir"
  stroke="#34d399"
  fill="url(#hadirGradient)"
  strokeWidth={2}
/>

<Area
  type="monotone"
  dataKey="absen"
  stroke="#f87171"
  fill="url(#absenGradient)"
  strokeWidth={2}
/>

  <defs>
  <linearGradient id="hadirGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
    <stop offset="100%" stopColor="#34d399" stopOpacity={0.05} />
  </linearGradient>

  <linearGradient id="absenGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#f87171" stopOpacity={0.3} />
    <stop offset="100%" stopColor="#f87171" stopOpacity={0.05} />
  </linearGradient>
</defs>
</AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserDashboard;
