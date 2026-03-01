import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiBell,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiClock,
} from "react-icons/fi"
import api from "../../services/api"
import { getSocket } from "../../services/socket"
import { useAuth } from "../../contexts/AuthContext";

type NotificationType =
  | "OVERTIME_REQUEST"
  | "LEAVE_REQUEST"
  | "ATTENDANCE_CORRECTION"
  | "SYSTEM_ALERT"
  | "DAILY_GREETING"
  | "DAILY_SUMMARY"

interface AdminNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  entityId?: string
  createdAt: string
  readAt?: string | null
  requiresAction: boolean
}

const TYPE_META: Record<
  NotificationType,
  { icon: any; color: string }
> = {
  OVERTIME_REQUEST: {
    icon: FiClock,
    color: "text-orange-400",
  },
  LEAVE_REQUEST: {
    icon: FiClock,
    color: "text-blue-400",
  },
  ATTENDANCE_CORRECTION: {
    icon: FiClock,
    color: "text-purple-400",
  },
  SYSTEM_ALERT: {
    icon: FiAlertCircle,
    color: "text-red-400",
  },
  DAILY_GREETING: {
  icon: FiBell,
  color: "text-yellow-400",
},
DAILY_SUMMARY: {
  icon: FiBell,
  color: "text-cyan-400",
},
}

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] =
    useState<"all" | "unread" | "action">("all")

  /* ================= FETCH ================= */
  const fetchNotifications = async () => {
    setLoading(true)
    const res = await api.get("/admin/notifications")
    setNotifications(res.data)
    setLoading(false)
  }

  /* ================= SOCKET + INIT ================= */
 const { user, accessToken } = useAuth()

useEffect(() => {
  if (!user?.id || !accessToken) return

  fetchNotifications()

  const socket = getSocket("admin", accessToken)

  if (!socket) return

  socket.on("admin.notification", (notif: AdminNotification) => {
    setNotifications((prev) => [notif, ...prev])
  })

  socket.on("admin.broadcast", (notif: AdminNotification) => {
    setNotifications((prev) => [notif, ...prev])
  })

  return () => {
    socket.off("admin.notification")
    socket.off("admin.broadcast")
  }
}, [user?.id, accessToken])

  /* ================= ACTIONS ================= */
  const markAsRead = async (id: string) => {
    await api.patch(`/admin/notifications/${id}/read`)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, readAt: new Date().toISOString() }
          : n
      )
    )
  }

  const respondAction = async (
    id: string,
    action: "approve" | "reject"
  ) => {
    await api.post(`/admin/notifications/${id}/${action}`)
  }

  /* ================= FILTER ================= */
  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.readAt
    if (filter === "action") return n.requiresAction
    return true
  })

  const unreadCount = notifications.filter(
    (n) => !n.readAt
  ).length

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FiBell />
            Notifications
          </h1>
          <p className="text-sm text-slate-400">
            Semua permintaan & alert sistem
          </p>
        </div>

        <div className="flex gap-2">
          {["all", "unread", "action"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-sm
                ${
                  filter === f
                    ? "bg-orange-500 text-black"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
            >
              {f === "all" && "All"}
              {f === "unread" && `Unread (${unreadCount})`}
              {f === "action" && "Need Action"}
            </button>
          ))}
        </div>
      </div>

      {/* ================= LIST ================= */}
      <div className="space-y-4">
        {loading && (
          <div className="text-slate-400">
            Loading notifications...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-slate-500 text-center py-20">
            Tidak ada notifikasi
          </div>
        )}

        <AnimatePresence>
          {filtered.map((n) => {
  const meta =
    TYPE_META[n.type as NotificationType] ?? {
      icon: FiBell,
      color: "text-slate-400",
    }

  const Icon = meta.icon

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-2xl p-5 border
                ${
                  n.readAt
                    ? "bg-[#0e1117] border-white/5"
                    : "bg-[#121826] border-orange-500/40"
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`text-xl mt-1 ${meta.color}`}
                  >
                    <Icon />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-semibold">
                        {n.title}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {new Date(
                          n.createdAt
                        ).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 mt-1">
                      {n.message}
                    </p>

                    {/* ================= ACTION ================= */}
                    <div className="flex items-center gap-3 mt-4">
                      {n.requiresAction && (
                        <>
                          <button
                            onClick={() =>
                              respondAction(
                                n.id,
                                "approve"
                              )
                            }
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          >
                            <FiCheck />
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              respondAction(
                                n.id,
                                "reject"
                              )
                            }
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            <FiX />
                            Reject
                          </button>
                        </>
                      )}

                      {!n.readAt && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AdminNotifications
