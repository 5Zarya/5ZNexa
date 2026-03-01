import React, { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid
} from "recharts";
import { FiUsers, FiClock, FiCheckCircle, FiDollarSign, FiSearch, FiBookOpen, FiBell, FiDownload, FiFilter } from "react-icons/fi";
import UiCard from "../../components/UiCard";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

/* ================= TYPES ================= */
type EmployeeRow = {
  id: string;
  name: string;
  department: string;
  status: "Present" | "Absent" | "Remote";
  lastCheck: string;
};

type DeptItem = {
  department: string;
  short: string;
  count: number;
};

type KPI = {
  totalEmployees: number;
  presentToday: number;
  pendingApprovals: number;
  payrollEstimate: number;
};

type AttendanceSummary = {
  date: string;
  present: number;
  absent: number;
};

type ApprovalSummary = {
  leave: number;
  overtime: number;
};

type PayrollStatus = {
  period: string;
  status: "DRAFT" | "APPROVED" | "PAID";
};

/* ------------------ Helper: CSV export ------------------ */
function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows?.length) return;
  const header = Object.keys(rows[0]);
  const csv = [
    header.join(","),
    ...rows.map((row) =>
      header.map((fieldName) => JSON.stringify(row[fieldName] ?? "")).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const KpiCard = ({ icon, label, value }: any) => (
  <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
    <div className="flex items-center gap-3">
      <div className="text-xl text-yellow-400">{icon}</div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-2xl font-bold">{value ?? "—"}</div>
      </div>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary[]>([]);
  const [approvals, setApprovals] = useState<ApprovalSummary | null>(null);
  const [payroll, setPayroll] = useState<PayrollStatus | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
const [departments, setDepartments] = useState<DeptItem[]>([]);
const [sortKey, setSortKey] = useState<keyof EmployeeRow | null>(null);

  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterDept, setFilterDept] = useState<string | "All">("All");
  const [error, setError] = useState<string | null>(null);

  const { authReady, isAuthenticated } = useAuth();

useEffect(() => {

  if (!authReady) return;
  if (!isAuthenticated) return;

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/admin/dashboard");
      const d = res.data;

      setKpi(d.kpi);
      setAttendance(d.attendanceTrend);
      setApprovals(d.approvals);
      setPayroll(d.payrollRun);
      setEmployees(d.employees ?? []);
      setDepartments(d.departments ?? []);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  };

  fetchDashboard();

}, [authReady, isAuthenticated]);

  const FloatingLegend = ({ items }: {
  items: { label: string; color: string }[];
}) => (
  <div className="absolute top-4 right-4 flex gap-4 text-xs bg-slate-900/80
    backdrop-blur border border-white/10 rounded-lg px-3 py-2">
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span className="text-slate-300">{item.label}</span>
      </div>
    ))}
  </div>
);

  /* ------------------ Filtering / sorting / search ------------------ */
  const filteredRows = useMemo(() => {
    let rows = [...employees];
    if (filterDept !== "All") rows = rows.filter((r) => r.department === filterDept);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
      );
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const av = (a as any)[sortKey];
        const bv = (b as any)[sortKey];
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [employees, query, sortKey, sortDir, filterDept]);

  return (
    <div className="min-h-screen p-6 bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Ringkasan operasional & statistik real-time</p>
            {error && <div className="mt-2 text-xs text-amber-400">⚠ {error}</div>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-200 border border-slate-300 
                dark:bg-slate-900/40 dark:border-white/10 rounded-lg px-3 py-2">
              <FiSearch className="text-slate-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari karyawan / id / departemen..."
                className="bg-transparent outline-none text-sm placeholder:text-slate-500"
              />
            </div>
            <button
              onClick={() => exportToCsv("employees.csv", filteredRows)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-semibold"
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </div>

        {/* KPI */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <KPIWrapper loading={loading} kpi={kpi} />
</div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <UiCard title="Attendance Trend (7 days)" subtitle="Present vs Absent">
  <div className="relative" style={{ height: 220 }}>
    
    {/* LEGEND FLOATING */}
    <FloatingLegend
      items={[
        { label: "Present", color: "#22c55e" },
        { label: "Absent", color: "#ef4444" },
      ]}
    />

    {loading ? (
      <div className="h-full w-full animate-pulse bg-white/5 rounded" />
    ) : (
                <ResponsiveContainer width="100%" height="100%">
  <AreaChart
  data={attendance}
  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
>
    <defs>
      <linearGradient id="presentGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
      </linearGradient>

      <linearGradient id="absentGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
      </linearGradient>
    </defs>

    {/* AXIS DIHALUSKAN */}
    <XAxis
      dataKey="date"
      tick={{ fill: "#64748b", fontSize: 12 }}
      axisLine={false}
      tickLine={false}
    />

    <YAxis hide />

    {/* TOOLTIP MODERN */}
    <Tooltip
      cursor={{ stroke: "#334155", strokeDasharray: "4 4" }}
      contentStyle={{
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,.4)",
      }}
      labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
      itemStyle={{ color: "#94a3b8" }}
    />

    {/* ABSENT — DI BELAKANG */}
    <Area
  type="monotone"
  dataKey="absent"
  stroke="#ef4444"
  strokeWidth={1.5}
  fill="url(#absentGlow)"
  dot={false}
  isAnimationActive
  animationDuration={350}
  animationEasing="ease-out"
/>

<Area
  type="monotone"
  dataKey="present"
  stroke="#22c55e"
  strokeWidth={2.5}
  fill="url(#presentGlow)"
  dot={false}
  isAnimationActive
  animationDuration={450}
  animationEasing="ease-out"
  activeDot={{
    r: 5,
    strokeWidth: 2,
    stroke: "#22c55e",
    fill: "#0f172a",
  }}
/>
  </AreaChart>
</ResponsiveContainer>
              )}
            </div>
          </UiCard>
          </div>

          <UiCard title="Department Distribution" subtitle="Employees per department">
            <div style={{ height: 220 }}>
              {loading ? (
                <div className="h-full w-full animate-pulse bg-white/5 rounded" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
  <BarChart
    data={departments}
    margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
  >
    {/* GRID DIHILANGKAN TOTAL */}
    <CartesianGrid vertical={false} strokeOpacity={0.05} />

    <XAxis
      dataKey="short"
      tick={{ fill: "#64748b", fontSize: 12 }}
      axisLine={false}
      tickLine={false}
    />

    <YAxis hide />

    <Tooltip
      cursor={{ fill: "rgba(255,255,255,0.03)" }}
      contentStyle={{
        background: "rgba(15,23,42,0.9)",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
      }}
      formatter={(value: number) => [`${value} Employees`, "Total"]}
      labelFormatter={(shortLabel) => {
        const item = departments.find((d) => d.short === shortLabel);
        return item?.department ?? shortLabel;
      }}
    />

    <Bar
  dataKey="count"
  radius={[10, 10, 10, 10]}
  fill="url(#barGlow)"
  isAnimationActive
  animationDuration={500}
  animationEasing="ease-out"
/>

    <defs>
      <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.3} />
      </linearGradient>
    </defs>
  </BarChart>
</ResponsiveContainer>

              )}
            </div>
          </UiCard>
        </div>

        {/* Employee table */}
        <div className="mt-6 bg-slate-900/40 border border-white/6 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">Filter:</span>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="bg-transparent border border-white/6 rounded px-3 py-1 text-sm"
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d.department} value={d.department}>
                    {d.department}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <FiFilter /> Sort:
              <button
                onClick={() => {
                  setSortKey("name");
                  setSortDir(sortDir === "asc" ? "desc" : "asc");
                }}
                className="ml-2 px-2 py-1 rounded bg-white/5"
              >
                Name
              </button>
              <button
                onClick={() => {
                  setSortKey("department");
                  setSortDir(sortDir === "asc" ? "desc" : "asc");
                }}
                className="ml-2 px-2 py-1 rounded bg-white/5"
              >
                Dept
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left text-slate-700 dark:text-slate-400 text-sm border-b border-slate-300 dark:border-white/10">
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Last Check</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {["w-20", "w-40", "w-32", "w-24", "w-20"].map((w, j) => (
                          <td key={j} className="py-3 px-3">
                            <div className={`h-4 ${w} bg-white/6 rounded`} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filteredRows.map((r: EmployeeRow) => (
                      <tr key={r.id} className="border-b border-white/6 hover:bg-white/2">
                        <td className="py-3 px-3 text-slate-200">{r.id}</td>
                        <td className="py-3 px-3 text-white font-medium">{r.name}</td>
                        <td className="py-3 px-3 text-slate-300">{r.department}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              r.status === "Present"
                                ? "bg-green-500/20 text-green-300"
                                : r.status === "Absent"
                                ? "bg-red-500/20 text-red-300"
                                : r.status === "Remote"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-yellow-400/10 text-yellow-300"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{r.lastCheck}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPIWrapper: React.FC<{ loading: boolean; kpi: KPI | null }> = ({ loading, kpi }) => {
  if (loading || !kpi) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 bg-white/5 animate-pulse" />
        ))}
      </>
    );
  }

  return (
    <>
      <KpiCard icon={<FiUsers />} label="Karyawan" value={kpi.totalEmployees} />
      <KpiCard icon={<FiClock />} label="Hadir Hari Ini" value={kpi.presentToday} />
      <KpiCard icon={<FiCheckCircle />} label="Approval Pending" value={kpi.pendingApprovals} />
      <KpiCard
        icon={<FiDollarSign />}
        label="Estimasi Payroll"
        value={`Rp ${kpi.payrollEstimate.toLocaleString()}`}
      />
    </>
  );
};

export default AdminDashboard;
