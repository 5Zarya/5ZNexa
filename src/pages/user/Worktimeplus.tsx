import { useEffect, useState } from "react"
import api from "../../services/api"
import { motion, AnimatePresence } from "framer-motion"
import clsx from "clsx"
import { Play, Square, Clock, Coins, History } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

/* =====================
 * TYPES
 * ===================== */
type OvertimeState = "IDLE" | "ASSIGNED" | "ACTIVE"

type HistoryItem = {
  id: string
  date: string
  minutes: number
  status: "COMPLETED" | "AUTO_STOPPED"
}

/* =====================
 * COMPONENT
 * ===================== */
const UserWorktimePlus = () => {
  const [status, setStatus] = useState<OvertimeState>("IDLE")
  const [activeSince, setActiveSince] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiAdvice, setAiAdvice] = useState<string | null>(null)

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [payroll, setPayroll] = useState(0)

  const [request, setRequest] = useState({
    startTime: "",
    endTime: "",
    reason: "",
  })

  const generateAiAdvice = () => {
  if (history.length === 0) {
    setAiAdvice("No overtime history detected. Recommendation: normal workload.")
    return
  }

  if (history.length > 5) {
    setAiAdvice(
      "High overtime frequency detected. Recommendation: limit overtime to avoid burnout."
    )
  } else {
    setAiAdvice(
      "Overtime level is acceptable. Recommendation: max 2 hours today."
    )
  }
}

  /* =====================
   * LOAD DATA
   * ===================== */
  const loadAll = async () => {
    try {
      const [s, h, p] = await Promise.all([
        api.get("/user/worktimeplus/status"),
        api.get("/user/worktimeplus/history"),
        api.get("/user/worktimeplus/payroll-preview"),
      ])

      setStatus(s.data.status)
      setActiveSince(s.data.activeSince ?? null)
      setHistory(h.data)
      setPayroll(p.data.amount)
      setError(null)
    } catch (e: any) {
      setError("System unavailable")
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  /* =====================
   * LIVE TIMER
   * ===================== */
  useEffect(() => {
    if (status !== "ACTIVE") return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [status])

  const diff = activeSince
    ? Math.max(0, now - new Date(activeSince).getTime())
    : 0

  const min = Math.floor(diff / 60000)
  const sec = Math.floor(diff / 1000) % 60

  /* =====================
   * ACTIONS
   * ===================== */
  const start = async () => {
    setLoading(true)
    try {
      await api.post("/user/worktimeplus/start")
      toast.success("Overtime started")
      await loadAll()
    } catch (e: any) {
      toast.error("Start failed")
    } finally {
      setLoading(false)
    }
  }

  const stop = async () => {
    if (!confirm("Stop overtime session?")) return
    setLoading(true)
    try {
      await api.post("/user/worktimeplus/stop")
      toast.success("Session stopped")
      await loadAll()
    } catch (e: any) {
  toast.error(e.response?.data?.message ?? "Stop failed")
  console.error(e)
} finally {
      setLoading(false)
    }
  }

  const submitRequest = async () => {
    try {
      await api.post("/user/worktimeplus/request", request)
      toast.success("Request submitted")
      setRequest({ startTime: "", endTime: "", reason: "" })
    } catch {
      toast.error("Request failed")
    }
  }

  /* =====================
   * UI META
   * ===================== */
  const statusMeta = {
    ACTIVE: {
      label: "OVERTIME ACTIVE",
      gradient: "from-emerald-400 to-teal-400",
    },
    ASSIGNED: {
      label: "AWAITING START",
      gradient: "from-yellow-400 to-orange-400",
    },
    IDLE: {
      label: "NO OVERTIME",
      gradient: "from-gray-500 to-zinc-500",
    },
  }[status]

  /* =====================
   * RENDER
   * ===================== */
  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto space-y-14">
        {/* HEADER */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Worktime+
            </h1>
            <p className="text-xs text-gray-400">
              Enterprise Overtime System
            </p>
          </div>

          <span
            className={clsx(
              "px-4 py-2 rounded-full text-xs font-black bg-gradient-to-r",
              statusMeta.gradient
            )}
          >
            {status}
          </span>
        </header>

        {/* HERO */}
        <AnimatePresence mode="wait">
          <motion.section
            key={status}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl bg-white/5 p-10"
          >
            <h2 className="text-3xl font-black mb-4">
              {statusMeta.label}
            </h2>

            {status === "ACTIVE" && (
              <div className="flex items-end gap-2 font-mono">
                <span className="text-6xl font-black">
                  {String(min).padStart(2, "0")}
                </span>
                <span className="text-3xl">
                  :{String(sec).padStart(2, "0")}
                </span>
              </div>
            )}

            {status === "ASSIGNED" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={start}
                disabled={loading}
                className="mt-6 flex items-center gap-3 px-8 py-4 rounded-xl bg-emerald-500 text-black font-black"
              >
                <Play /> START
              </motion.button>
            )}

            {status === "ACTIVE" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stop}
                className="mt-6 flex items-center gap-3 px-8 py-4 rounded-xl bg-red-600 font-black"
              >
                <Square /> STOP
              </motion.button>
            )}
          </motion.section>
        </AnimatePresence>

        {/* KPI */}
        <section className="grid sm:grid-cols-3 gap-6">
          <Kpi icon={<Coins />} label="Payroll" value={`Rp ${payroll.toLocaleString("id-ID")}`} />
          <Kpi icon={<History />} label="Sessions" value={history.length} />
          <Kpi icon={<Clock />} label="Mode" value="LIVE" />
        </section>
        <motion.section
  whileHover={{ scale: 1.02 }}
  className="rounded-3xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 p-8 space-y-4 border border-white/10"
>
  <h3 className="font-black text-cyan-400">
    🤖 AI Overtime Recommendation
  </h3>

  <p className="text-sm text-gray-300">
    {aiAdvice ?? "Click below to generate recommendation"}
  </p>

  <button
    onClick={generateAiAdvice}
    className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-black"
  >
    Generate Recommendation
  </button>
</motion.section>
{/* REQUEST OVERTIME */}
<motion.section
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  className="rounded-3xl bg-white/5 p-8 space-y-4"
>
  <h3 className="font-black text-indigo-400">
    Request Overtime Approval
  </h3>

  <input
    type="datetime-local"
    value={request.startTime}
    onChange={e =>
      setRequest({ ...request, startTime: e.target.value })
    }
    className="w-full px-4 py-3 rounded-xl bg-black border border-white/10"
  />

  <input
    type="datetime-local"
    value={request.endTime}
    onChange={e =>
      setRequest({ ...request, endTime: e.target.value })
    }
    className="w-full px-4 py-3 rounded-xl bg-black border border-white/10"
  />

  <textarea
    placeholder="Reason for overtime"
    value={request.reason}
    onChange={e =>
      setRequest({ ...request, reason: e.target.value })
    }
    className="w-full px-4 py-3 rounded-xl bg-black border border-white/10"
  />

  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    onClick={submitRequest}
    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 font-black"
  >
    SUBMIT REQUEST
  </motion.button>
</motion.section>

      </div>
    </div>
  )
  
}

/* =====================
 * KPI COMPONENT
 * ===================== */
const Kpi = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: any
}) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className="rounded-2xl bg-white/5 p-6 space-y-2"
  >
    <div className="text-indigo-400">{icon}</div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-2xl font-black">{value}</p>
  </motion.div>
)

export default UserWorktimePlus
