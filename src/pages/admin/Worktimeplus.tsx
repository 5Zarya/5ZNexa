import React, { useEffect, useMemo, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import api from "../../services/api"

/* ==========================
   TYPES
========================== */

type OvertimeRequest = {
  id: string
  user: {
    id: string
    name: string
    jobTitle?: string
  }
  plannedStart: string
  plannedEnd: string
  reason: string
  status: "REQUESTED" | "ASSIGNED" | "REJECTED"
  createdAt: string
}

type WorktimeSession = {
  startTime: string
  endTime: string | null
  durationMin: number
  status: "COMPLETED" | "AUTO_STOPPED"
}

type MonthlyReport = {
  user: {
    id: string
    name: string
    jobTitle?: string
  }
  date: string
  sessions: WorktimeSession[]

  // lembur
  totalOvertimeMinutes: number

  // 💰 payroll
  payrollPreview: number          // per tanggal
  monthlyPayrollTotal: number     // akumulasi per user per bulan
}

type OverviewUser = {
  user: {
    id: string
    name: string
    jobTitle?: string
  }
  isActive: boolean
  activeSession: {
    startTime: string
    overtimeId: string
  } | null
}
interface LiveOvertimeUser {
  id: string
  name: string
  startedAt: string
}

type Employee = {
  id: string
  name: string
  jobTitle?: string
  overtimeStatus: "IDLE" | "ASSIGNED" | "ACTIVE"
}
type UserOvertimeRate = {
  userId: string
  name: string
  jobTitle?: string
  ratePerMinute: number | null
  hasRate: boolean
}

/* ==========================
   UTIL
========================== */

const minutesToHHMM = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}m`
}

/* ==========================
   MAIN
========================== */

const AdminWorktimePlus: React.FC = () => {
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )
  const [overview, setOverview] = useState<OverviewUser[]>([])
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(false)
  const [liveEmployees, setLiveEmployees] = useState<LiveOvertimeUser[]>([])
  const [selectedReport, setSelectedReport] =
  useState<MonthlyReport | null>(null)
  const [requests, setRequests] = useState<OvertimeRequest[]>([])
  const [requestLoading, setRequestLoading] = useState(false)
  const [userRates, setUserRates] = useState<UserOvertimeRate[]>([])
const [editUser, setEditUser] = useState<UserOvertimeRate | null>(null)
const [editRate, setEditRate] = useState<number | null>(null)
const [rateUserLoading, setRateUserLoading] = useState(false)


  const [liveOvertimes, setLiveOvertimes] = useState<
  {
    id: string
    startTime: string
    user: {
      id: string
      name: string
      jobTitle?: string
    }
  }[]
>([])
  const [showLive, setShowLive] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
const [assignUser, setAssignUser] = useState<Employee | null>(null)
const [assignLoading, setAssignLoading] = useState(false)

const [assignForm, setAssignForm] = useState({
  startTime: "",
  endTime: "",
  reason: "",
})
const submitAssign = async () => {
  if (!assignUser) return

  if (!assignForm.startTime || !assignForm.endTime) {
    alert("Start & end time wajib diisi")
    return
  }

  setAssignLoading(true)
  try {
    await api.post("/admin/worktimeplus/assign", {
  userId: assignUser.id,
  plannedStart: assignForm.startTime,
  plannedEnd: assignForm.endTime,
  reason: assignForm.reason,
})

    // refresh employee & overview
    await Promise.all([loadEmployees(), loadData()])

    setAssignUser(null)
    setAssignForm({
      startTime: "",
      endTime: "",
      reason: "",
    })
  } catch (err: any) {
    alert(err.response?.data?.message ?? "Failed assign overtime")
  } finally {
    setAssignLoading(false)
  }
}

const loadUserOvertimeRates = async () => {
  const res = await api.get(
    "/admin/worktimeplus/user-overtime-rates"
  )

  setUserRates(res.data)
}
useEffect(() => {
  loadUserOvertimeRates()
}, [])

const saveUserRate = async () => {
  if (!editUser) return

  const rate = Number(editRate)

  if (Number.isNaN(rate)) {
    alert("Rate harus berupa angka")
    return
  }

  if (rate < 0) {
    alert("Rate tidak boleh negatif")
    return
  }

  setRateUserLoading(true)
  try {
    await api.post(
      `/admin/worktimeplus/user-overtime-rate/${editUser.userId}`,
      {
        ratePerMinute: rate
      }
    )

    await loadUserOvertimeRates()
    setEditUser(null)
  } finally {
    setRateUserLoading(false)
  }
}

const resetUserRate = async () => {
  if (!editUser) return

  setRateUserLoading(true)
  try {
    await api.post(
  `/admin/worktimeplus/user-overtime-rate/${editUser.userId}`,
  { reset: true }
)

    await loadUserOvertimeRates()
    setEditUser(null)
  } finally {
    setRateUserLoading(false)
  }
}

const loadRequests = async () => {
  setRequestLoading(true)
  try {
    const res = await api.get("/admin/worktimeplus/requests")
    setRequests(res.data)
  } finally {
    setRequestLoading(false)
  }
}

useEffect(() => {
  loadRequests()
}, [])
const approveRequest = async (id: string) => {
  await api.post(`/admin/worktimeplus/approve/${id}`)
  await Promise.all([loadRequests(), loadEmployees(), loadData()])
}

const rejectRequest = async (id: string) => {
  await api.post(`/admin/worktimeplus/reject/${id}`)
  await loadRequests()
}

const loadEmployees = async () => {
  const res = await api.get("/admin/worktimeplus/employees")
  setEmployees(res.data)
}

useEffect(() => {
  loadEmployees()
}, [])


  /* ==========================
     FETCH
  ========================== */

  const loadData = async () => {
    setLoading(true)
    try {
      const [overviewRes, reportRes] = await Promise.all([
        api.get(`/admin/worktimeplus/overview?month=${month}`),
        api.get(`/admin/worktimeplus/month?month=${month}`),
      ])
      setOverview(overviewRes.data)
      setReports(reportRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [month])

  /* ==========================
     SUMMARY
  ========================== */

  const totalEmployees = overview.length
  const activeEmployees = overview.filter(u => u.isActive).length

  const totalOvertimeMinutes = reports.reduce(
    (sum, r) => sum + r.totalOvertimeMinutes,
    0
  )

  /* ==========================
     CHART
  ========================== */

  const chartData = useMemo(() => {
    const map = new Map<string, number>()

    reports.forEach(r => {
      map.set(
        r.date,
        (map.get(r.date) ?? 0) + r.totalOvertimeMinutes / 60
      )
    })

    return Array.from(map.entries()).map(
      ([date, hours]) => ({
        date,
        hours: Number(hours.toFixed(2)),
      })
    )
  }, [reports])

  useEffect(() => {
  const fetchLive = async () => {
    const res = await api.get("/admin/worktimeplus/live")
    setLiveEmployees(res.data)
  }

  fetchLive()
  const interval = setInterval(fetchLive, 5000)

  return () => clearInterval(interval)
}, [])

  /* ==========================
     RENDER
  ========================== */

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      {/* HEADER */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-indigo-400">
            Worktime+ Report
          </h1>
          <p className="text-sm text-gray-400">
            Approved overtime analytics
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setShowLive(true)}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm"
          >
            🔴 Live Overtime ({liveEmployees.length})
          </button>

          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="bg-gray-800 px-3 py-2 rounded"
          />
        </div>
      </header>

      {/* SUMMARY */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-800 p-4 rounded-xl">
          <p className="text-xs text-gray-400">Employees</p>
          <p className="text-2xl font-bold">{totalEmployees}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl">
          <p className="text-xs text-gray-400">Total Overtime</p>
          <p className="text-2xl font-bold">
            {minutesToHHMM(totalOvertimeMinutes)}
          </p>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl">
          <p className="text-xs text-gray-400">Sessions</p>
          <p className="text-2xl font-bold">
            {reports.reduce(
              (sum, r) => sum + r.sessions.length,
              0
            )}
          </p>
        </div>
      </section>

      {/* TABLE */}
      <section className="mb-10">
        <div className="bg-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
  <tr>
    <th>Employee</th>
    <th>Date</th>
    <th>Sessions</th>
    <th>Payroll Preview</th>
    <th>Total Payroll</th>
    <th>Total Overtime</th>
  </tr>
</thead>
            <tbody>
  {reports.map(r => (
    <tr
      key={`${r.user.id}-${r.date}`}
      className="border-t border-gray-700"
    >
      <td className="px-4 py-2">
        {r.user.name}
        <div className="text-xs text-gray-400">
          {r.user.jobTitle}
        </div>
      </td>

      <td className="px-4 py-2 text-center">{r.date}</td>

      <td className="px-4 py-2 text-center">
        {r.sessions.length}
      </td>
<td className="text-center">
  Rp {r.payrollPreview.toLocaleString()}
</td>

<td className="text-center font-semibold text-indigo-400">
  Rp {r.monthlyPayrollTotal.toLocaleString()}
</td>

<td className="text-center">
  {minutesToHHMM(r.totalOvertimeMinutes)}
</td>
    </tr>
  ))}
</tbody>
          </table>

          {!loading && reports.length === 0 && (
            <p className="text-center text-gray-400 py-6">
              No approved overtime data
            </p>
          )}
        </div>
      </section>

      {/* CHART */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-indigo-300">
          📊 Overtime per Day
        </h2>

        <div className="bg-gray-800 p-4 rounded-xl">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip />
              <Bar dataKey="hours" fill="#6366F1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
<section className="mt-12">
  <h2 className="text-xl font-semibold mb-4 text-indigo-300">
    💰 User Overtime Rate
  </h2>

  <div className="bg-gray-800 rounded-xl overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-gray-700">
        <tr>
          <th className="px-4 py-2 text-left">Employee</th>
          <th className="px-4 py-2">Job</th>
          <th className="px-4 py-2">Rate / Min</th>
          <th className="px-4 py-2">Type</th>
          <th className="px-4 py-2">Action</th>
        </tr>
      </thead>

      <tbody>
        {userRates.map(u => (
          <tr
            key={u.userId}
            className="border-t border-gray-700"
          >
            <td className="px-4 py-2">{u.name}</td>
            <td className="px-4 py-2 text-center">
              {u.jobTitle ?? "-"}
            </td>
            <td className="px-4 py-2 text-center">
  {u.ratePerMinute === null ? (
    <span className="text-red-400 italic">
      Not set
    </span>
  ) : (
    <>Rp {u.ratePerMinute}</>
  )}
</td>

<td className="px-4 py-2 text-center">
  {u.hasRate ? (
    <span className="text-indigo-400">Custom</span>
  ) : (
    <span className="text-red-400">Required</span>
  )}
</td>
            <td className="px-4 py-2 text-center">
              <button
                onClick={() => {
                  setEditUser(u)
                  setEditRate(u.ratePerMinute)
                }}
                className="text-xs text-indigo-400 hover:underline"
              >
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
{editUser && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
    <div className="bg-gray-900 p-6 rounded-xl w-full max-w-sm">
      <h3 className="text-lg font-semibold mb-4">
        Overtime Rate – {editUser.name}
      </h3>

      <input
  type="number"
  value={editRate ?? ""}
  onChange={e =>
    setEditRate(
      e.target.value === ""
        ? null
        : Number(e.target.value)
    )
  }
        className="w-full bg-gray-800 p-2 rounded mb-4"
      />

      <div className="flex justify-between">
        <button
          onClick={resetUserRate}
          disabled={rateUserLoading}
          className="text-xs text-gray-400"
        >
          Reset to Default
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => setEditUser(null)}
            className="px-3 py-1 bg-gray-700 rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={saveUserRate}
            disabled={rateUserLoading}
            className="px-3 py-1 bg-indigo-600 rounded text-sm disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      <section className="mt-12">
  <h2 className="text-xl font-semibold mb-4 text-indigo-300">
    👥 Employee Overtime ControlControl
  </h2>

  <div className="bg-gray-800 rounded-xl overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-gray-700">
        <tr>
          <th className="px-4 py-2 text-left">Employee</th>
          <th className="px-4 py-2">Job</th>
          <th className="px-4 py-2">Status</th>
          <th className="px-4 py-2">Action</th>
        </tr>
      </thead>

      <tbody>
        {employees.map(emp => (
          <tr key={emp.id} className="border-t border-gray-700">
            <td className="px-4 py-2">{emp.name}</td>
            <td className="px-4 py-2 text-center">
              {emp.jobTitle ?? "-"}
            </td>
            <td className="px-4 py-2 text-center">
              {emp.overtimeStatus === "ACTIVE" && (
                <span className="text-green-400">Active</span>
              )}
              {emp.overtimeStatus === "ASSIGNED" && (
                <span className="text-yellow-400">Assigned</span>
              )}
              {emp.overtimeStatus === "IDLE" && (
                <span className="text-gray-400">Idle</span>
              )}
            </td>
            <td className="px-4 py-2 text-center">
              {emp.overtimeStatus === "IDLE" && (
                <button
                  onClick={() => setAssignUser(emp)}
                  className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded text-xs"
                >
                  Assign Overtime
                </button>
              )}
              {emp.overtimeStatus !== "IDLE" && (
                <span className="text-xs text-gray-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
<section className="mt-12">
  <h2 className="text-xl font-semibold mb-4 text-indigo-300">
    📝 Overtime Requests
  </h2>

  <div className="bg-gray-800 rounded-xl overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-gray-700">
        <tr>
          <th className="px-4 py-2 text-left">Employee</th>
          <th className="px-4 py-2">Time</th>
          <th className="px-4 py-2">Reason</th>
          <th className="px-4 py-2">Status</th>
          <th className="px-4 py-2">Action</th>
        </tr>
      </thead>

      <tbody>
        {requests.map(req => (
          <tr key={req.id} className="border-t border-gray-700">
            <td className="px-4 py-2">
              {req.user.name}
              <div className="text-xs text-gray-400">
                {req.user.jobTitle}
              </div>
            </td>

            <td className="px-4 py-2 text-center text-xs">
              {new Date(req.plannedStart).toLocaleString()}
              <br />–
              <br />
              {new Date(req.plannedEnd).toLocaleString()}
            </td>

            <td className="px-4 py-2 text-xs">
              {req.reason}
            </td>

            <td className="px-4 py-2 text-center">
              {req.status === "REQUESTED" && (
                <span className="text-yellow-400">Pending</span>
              )}
              {req.status === "ASSIGNED" && (
                <span className="text-green-400">Approved</span>
              )}
              {req.status === "REJECTED" && (
                <span className="text-red-400">Rejected</span>
              )}
            </td>

            <td className="px-4 py-2 text-center">
  {req.status === "REQUESTED" ? (
    <div className="flex justify-center gap-2">
      <button
        onClick={() => approveRequest(req.id)}
        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs"
      >
        Approve
      </button>
      <button
        onClick={() => rejectRequest(req.id)}
        className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-xs"
      >
        Reject
      </button>
    </div>
  ) : (
    <span className="text-xs text-gray-400">—</span>
  )}
</td>
          </tr>
        ))}
      </tbody>
    </table>

    {!requestLoading && requests.length === 0 && (
      <p className="text-center text-gray-400 py-6">
        No overtime requests
      </p>
    )}
  </div>
</section>

{assignUser && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
    <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md">
      <h3 className="text-lg font-semibold mb-4">
        Assign Overtime – {assignUser.name}
      </h3>

      <input
  type="datetime-local"
  value={assignForm.startTime}
  onChange={e =>
    setAssignForm({ ...assignForm, startTime: e.target.value })
  }
  className="w-full bg-gray-800 p-2 rounded mb-3"
/>

<input
  type="datetime-local"
  value={assignForm.endTime}
  onChange={e =>
    setAssignForm({ ...assignForm, endTime: e.target.value })
  }
  className="w-full bg-gray-800 p-2 rounded mb-3"
/>

<textarea
  placeholder="Reason"
  value={assignForm.reason}
  onChange={e =>
    setAssignForm({ ...assignForm, reason: e.target.value })
  }
  className="w-full bg-gray-800 p-2 rounded mb-4"
/>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAssignUser(null)}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          Cancel
        </button>
        <button
  onClick={submitAssign}
  disabled={assignLoading}
  className="px-4 py-2 bg-indigo-600 rounded disabled:opacity-50"
>
  {assignLoading ? "Assigning..." : "Assign"}
</button>
      </div>
    </div>
  </div>
)}

      {/* LIVE MODAL */}
      {/* LIVE MODAL */}
{showLive && (
  <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
    <div className="w-full max-w-md bg-gray-900 h-full p-6 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-red-400">
          Live Overtime
        </h2>
        <button onClick={() => setShowLive(false)}>✕</button>
      </div>

      <p className="text-xs text-yellow-400 mb-4">
        ⚠ Live data. Not included in payroll calculation.
      </p>

      {liveOvertimes.length === 0 && (
        <p className="text-gray-400 text-center py-6">
          No active overtime
        </p>
      )}

      {liveOvertimes.map(o => (
        <div
          key={o.id}
          className="flex justify-between items-center p-3 bg-gray-800 rounded mb-2"
        >
          <div>
            <p className="font-semibold">{o.user.name}</p>
            <p className="text-xs text-gray-400">
              {o.user.jobTitle ?? "-"}
            </p>
          </div>
          <span className="text-green-400 text-sm">
            since{" "}
            {new Date(o.startTime).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
{selectedReport && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
    <div className="bg-gray-900 p-6 rounded-xl w-full max-w-xl">
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-semibold text-indigo-400">
          Overtime Chart – {selectedReport.user.name}
        </h3>
        <button onClick={() => setSelectedReport(null)}>✕</button>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={selectedReport.sessions.map(s => ({
            start: new Date(s.startTime).toLocaleTimeString(),
            hours: s.durationMin / 60,
          }))}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="start" stroke="#aaa" />
          <YAxis stroke="#aaa" />
          <Tooltip />
          <Bar dataKey="hours" fill="#6366F1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)}
    </div>
  )
}

export default AdminWorktimePlus
