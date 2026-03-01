import React, { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  Building2,
  Eye,
  Sparkles,
  X,
  Timer,
  TrendingUp,
  CalendarCheck,
  Loader2,
} from "lucide-react"
import api from "../../services/api"

/* =====================================================
   TYPES — MUST MATCH BACKEND DTO / PRISMA
   ===================================================== */

export type Role = "USER" | "ADMIN" | "HR"
export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE"
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "NONE"

export interface Employee {
  id: string
  name: string
  email: string
  role: Role
  department: string | null
  jobTitle: string | null
  avatarUrl: string | null
  createdAt: string
  status: EmployeeStatus
  attendanceToday: AttendanceStatus
  performanceScore: number
}

/* =====================================================
   API LAYER (INLINE, CLEAN)
   ===================================================== */

const EmployeeAPI = {
  getAll: () => api.get<Employee[]>("/admin/employees"),
  assignOvertime: (payload: {
    userId: string
    date: string
    hours: number
  }) => api.post("/admin/employees/overtime", payload),
}

/* =====================================================
   MAIN PAGE
   ===================================================== */

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Employee | null>(null)
  const [detail, setDetail] = useState<Employee | null>(null)
  const [assigning, setAssigning] = useState(false)

  /* ================= FETCH ================= */
  useEffect(() => {
    EmployeeAPI.getAll()
      .then(res => setEmployees(res.data))
      .finally(() => setLoading(false))
  }, [])

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.department ?? "").toLowerCase().includes(q)
    )
  }, [employees, search])

  /* ================= METRICS ================= */
  const metrics = useMemo(() => {
    const total = employees.length
    const active = employees.filter(e => e.status === "ACTIVE").length
    const onLeave = employees.filter(e => e.status === "ON_LEAVE").length
    const avgPerformance =
      total === 0
        ? 0
        : Math.round(
            employees.reduce((a, b) => a + b.performanceScore, 0) / total
          )

    return { total, active, onLeave, avgPerformance }
  }, [employees])

  /* ================= ACTION ================= */
  const assignOvertime = async (emp: Employee) => {
    try {
      setAssigning(true)
      await EmployeeAPI.assignOvertime({
        userId: emp.id,
        date: new Date().toISOString(),
        hours: 2,
      })
      alert(`Overtime assigned to ${emp.name}`)
    } finally {
      setAssigning(false)
    }
  }

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000"
  
function Avatar({
  name,
  src,
  size = 48,
}: {
  name: string
  src?: string | null
  size?: number
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map(n => n[0])
    .join("")
    .toUpperCase()

  if (src) {
  return (
    <img
      src={`${BASE_URL}${src}`}
      alt={name}
      className="rounded-full object-cover border border-slate-700"
      style={{ width: size, height: size }}
      onError={e => {
        ;(e.target as HTMLImageElement).style.display = "none"
      }}
    />
  )
}

  return (
    <div
      className="rounded-full flex items-center justify-center
                 bg-gradient-to-br from-cyan-500 to-indigo-500
                 text-white font-bold border border-slate-700"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}
  
  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen p-8 bg-[#020617] text-slate-200">

      {/* ================= HEADER ================= */}
      <header className="flex justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20">
            <Users className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-sm text-slate-400">
              Workforce intelligence & HR command center
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-cyan-400">
          <Sparkles size={14} /> AI-Ready HRIS
        </div>
      </header>

      {/* ================= SUMMARY ================= */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <SummaryCard title="Total Employees" value={metrics.total} icon={Users} />
        <SummaryCard title="Active" value={metrics.active} icon={ShieldCheck} color="emerald" />
        <SummaryCard title="On Leave" value={metrics.onLeave} icon={CalendarCheck} color="amber" />
        <SummaryCard
          title="Avg Performance"
          value={`${metrics.avgPerformance}%`}
          icon={TrendingUp}
          color="cyan"
        />
      </div>

      {/* ================= TOOLBAR ================= */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee, email, department…"
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800"
          />
        </div>
        <button className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex gap-2">
          <Filter size={16} /> Filter
        </button>
      </div>

      {/* ================= GRID ================= */}
      <div className="grid grid-cols-12 gap-6">

        {/* ================= LIST ================= */}
        <div className="col-span-8 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="animate-spin" size={16} /> Loading employees…
            </div>
          )}

          {!loading && filtered.map(emp => (
            <motion.div
              key={emp.id}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelected(emp)}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer flex justify-between"
            >
              <div className="flex gap-4">
                <Avatar
  name={emp.name}
  src={emp.avatarUrl}
  size={48}
/>
                <div>
                  <div className="font-semibold text-white">{emp.name}</div>
                  <div className="text-xs text-slate-400">
                    {emp.jobTitle ?? "—"} • {emp.department ?? "—"}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Pill label={emp.status} />
                    <Pill label={emp.role} tone="indigo" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <StatusDot status={emp.attendanceToday} />
                <PerformanceBar score={emp.performanceScore} />
                <button
                  disabled={assigning}
                  onClick={e => {
                    e.stopPropagation()
                    assignOvertime(emp)
                  }}
                  className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 flex gap-1"
                >
                  <Timer size={14} /> Overtime
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ================= DETAIL ================= */}
        <div className="col-span-4">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-slate-500 border border-slate-800 rounded-xl">
              Select employee
            </div>
          ) : (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6">
              <div className="flex justify-between mb-4">
                <div className="flex gap-3">
                  <Avatar
  name={selected.name}
  src={selected.avatarUrl}
  size={64}
/>
                  <div>
                    <div className="font-semibold text-lg">{selected.name}</div>
                    <div className="text-xs text-slate-400">{selected.email}</div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)}><X /></button>
              </div>

              <div className="space-y-3 text-sm">
                <Info label="Role" value={selected.role} icon={ShieldCheck} />
                <Info label="Department" value={selected.department} icon={Building2} />
                <Info label="Attendance Today" value={selected.attendanceToday} icon={CalendarCheck} />
                <Info label="Performance" value={`${selected.performanceScore}%`} icon={TrendingUp} />
                <Info label="Joined" value={new Date(selected.createdAt).toLocaleDateString()} icon={Clock} />
              </div>

              <button
                onClick={() => setDetail(selected)}
                className="mt-6 w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white flex justify-center gap-2"
              >
                <Eye size={16} /> View Full Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL ================= */}
      <AnimatePresence>
        {detail && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <motion.div className="bg-slate-900 rounded-2xl p-6 w-full max-w-xl border border-slate-800">
              <div className="flex justify-between mb-4">
                <h2 className="font-semibold text-lg">Employee Profile</h2>
                <div className="flex items-center gap-4 mb-6">
  <Avatar
    name={detail.name}
    src={detail.avatarUrl}
    size={72}
  />
  <div>
    <div className="font-semibold text-lg">{detail.name}</div>
    <div className="text-xs text-slate-400">{detail.email}</div>
  </div>
</div>

                <button onClick={() => setDetail(null)}><X /></button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Name" value={detail.name} icon={Users} />
                <Info label="Email" value={detail.email} icon={ShieldCheck} />
                <Info label="Department" value={detail.department} icon={Building2} />
                <Info label="Attendance" value={detail.attendanceToday} icon={CalendarCheck} />
                <Info label="Performance" value={`${detail.performanceScore}%`} icon={TrendingUp} />
                <Info label="Status" value={detail.status} icon={ShieldCheck} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* =====================================================
   UI ATOMS
   ===================================================== */

   const COLOR_MAP: Record<string, string> = {
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  indigo: "text-indigo-400",
}

function SummaryCard({ title, value, icon: Icon, color = "cyan" }: any) {
  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Icon size={14} /> {title}
      </div>
      <div className={`text-2xl font-bold ${COLOR_MAP[color]} mt-2`}>
        {value}
      </div>
    </div>
  )
}

function Info({ label, value, icon: Icon }: any) {
  return (
    <div className="flex justify-between items-center bg-slate-800/40 px-3 py-2 rounded-lg">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={14} /> {label}
      </div>
      <div className="text-white">{value ?? "—"}</div>
    </div>
  )
}

function Pill({ label, tone = "emerald" }: any) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] bg-${tone}-500/10 text-${tone}-400`}>
      {label}
    </span>
  )
}

function StatusDot({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, string> = {
    PRESENT: "bg-emerald-400",
    LATE: "bg-yellow-400",
    ABSENT: "bg-red-400",
    NONE: "bg-slate-500",
  }
  return <span className={`w-3 h-3 rounded-full ${map[status]}`} />
}

function PerformanceBar({ score }: { score: number }) {
  return (
    <div className="w-24">
      <div className="h-1.5 bg-slate-700 rounded">
        <div
          className="h-1.5 bg-cyan-400 rounded"
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="text-[10px] text-cyan-400 mt-1">{score}%</div>
    </div>
  )
}