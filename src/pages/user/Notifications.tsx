import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiBell,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
} from "react-icons/fi"
import { io, Socket } from "socket.io-client"
import { useAuth } from "../../contexts/AuthContext"
import { getSocket } from "../../services/socket"
import api from "../../services/api"

/* ======================================================
 * TYPES
 * ====================================================== */
type UserNotificationType =
  | "OVERTIME_APPROVED"
  | "OVERTIME_REJECTED"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "SYSTEM"
  | "INFO"

interface UserNotification {
  id: string
  type: UserNotificationType
  title: string
  message: string
  createdAt: string
  readAt?: string | null
}

/* ======================================================
 * META
 * ====================================================== */
const TYPE_META: Record<
  UserNotificationType,
  { icon: any; color: string }
> = {
  OVERTIME_APPROVED: {
    icon: FiCheckCircle,
    color: "text-green-400",
  },
  OVERTIME_REJECTED: {
    icon: FiXCircle,
    color: "text-red-400",
  },
  LEAVE_APPROVED: {
    icon: FiCheckCircle,
    color: "text-blue-400",
  },
  LEAVE_REJECTED: {
    icon: FiXCircle,
    color: "text-red-400",
  },
  SYSTEM: {
    icon: FiAlertTriangle,
    color: "text-orange-400",
  },
  INFO: {
    icon: FiClock,
    color: "text-slate-400",
  },
}
const DEFAULT_META = {
  icon: FiBell,
  color: "text-slate-400",
}
/* ======================================================
 * HELPERS
 * ====================================================== */
const isToday = (date: Date) => {
  const now = new Date()
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}

const isYesterday = (date: Date) => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  )
}
const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3 mt-12 mb-4">
    <div className="h-px flex-1 bg-white/10" />
    <span className="text-xs uppercase tracking-widest text-slate-400">
      {title}
    </span>
    <div className="h-px flex-1 bg-white/10" />
  </div>
)

/* ======================================================
 * COMPONENT
 * ====================================================== */
const UserNotifications = () => {
  const [notifications, setNotifications] =
    useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [openBell, setOpenBell] = useState(false)

  const socketRef = useRef<Socket | null>(null)

  /* ================= FETCH ================= */
  const fetchNotifications = async () => {
    setLoading(true)
    const res = await api.get("/user/notifications")
    setNotifications(res.data)
    setLoading(false)
  }

  const { accessToken } = useAuth()
  /* ================= SOCKET ================= */
  useEffect(() => {
  if (!accessToken) return

  fetchNotifications()

  const socket = getSocket("user", accessToken)
  if (!socket) return

  socket.on("user.notification", (notif: UserNotification) => {
    console.log("📩 Realtime notif:", notif)
    setNotifications((prev) => [notif, ...prev])
  })

  return () => {
    socket.off("user.notification")
  }
}, [accessToken])

  /* ================= ACTION ================= */
  const markAsRead = async (id: string) => {
    await api.patch(`/user/notifications/${id}/read`)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, readAt: new Date().toISOString() }
          : n
      )
    )
  }

  /* ================= GROUPING ================= */
  const grouped = useMemo(() => {
    const today: UserNotification[] = []
    const yesterday: UserNotification[] = []
    const earlier: UserNotification[] = []

    notifications.forEach((n) => {
      const d = new Date(n.createdAt)
      if (isToday(d)) today.push(n)
      else if (isYesterday(d)) yesterday.push(n)
      else earlier.push(n)
    })

    return { today, yesterday, earlier }
  }, [notifications])

  const unreadCount = notifications.filter(
    (n) => !n.readAt
  ).length
/* ======================================================
 * RENDER ITEM
 * ====================================================== */
const renderNotification = (n: UserNotification) => {
  const meta = TYPE_META[n.type as UserNotificationType] ?? DEFAULT_META
  const Icon = meta.icon

  return (
    <motion.div
      key={n.id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative rounded-2xl p-6 border backdrop-blur-xl
        ${
          n.readAt
            ? "bg-white/5 border-white/10"
            : "bg-[#121826]/80 border-orange-500/40"
        } shadow-xl`}
    >
      {!n.readAt && (
        <div className="absolute top-0 left-0 h-full w-1 bg-orange-400 rounded-l-2xl" />
      )}

      <div className="flex gap-5">
        <div className={`text-2xl mt-1 ${meta.color}`}>
          <Icon />
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-lg">{n.title}</h3>
            <span className="text-xs text-slate-500">
              {new Date(n.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <p className="text-slate-400 text-sm mt-2">
            {n.message}
          </p>

          {!n.readAt && (
            <button
              onClick={() => markAsRead(n.id)}
              className="mt-4 text-xs text-orange-400 hover:text-orange-300"
            >
              Tandai sudah dibaca
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

  /* ======================================================
   * RENDER
   * ====================================================== */
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      {/* ================= NAVBAR ================= */}
      <div className="h-16 flex items-center justify-end px-6 border-b border-white/10">
        <div className="relative">
          <button
            onClick={() => setOpenBell((v) => !v)}
            className="relative p-2 rounded-xl hover:bg-white/10"
          >
            <FiBell className="text-xl" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-xs px-1.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {/* ================= DROPDOWN ================= */}
          <AnimatePresence>
            {openBell && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 mt-3 w-96 bg-[#121826]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl z-50"
              >
                <div className="p-4 font-semibold border-b border-white/10">
                  Notifications
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.slice(0, 5).map((n) => {
  const meta =
    TYPE_META[n.type as UserNotificationType] ?? DEFAULT_META

  const Icon = meta.icon

  return (
    <div
      key={n.id}
      className={`flex gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer ${
        !n.readAt ? "bg-orange-500/5" : ""
      }`}
      onClick={() => markAsRead(n.id)}
    >
      <Icon className={meta.color} />
      <div className="text-sm">
        <div className="font-medium">{n.title}</div>
        <div className="text-xs text-slate-400">
          {n.message}
        </div>
      </div>
    </div>
  )
})}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ================= PAGE ================= */}
      {/* ================= PAGE ================= */}
<div className="max-w-6xl mx-auto p-8 space-y-6">
  {loading && (
    <div className="text-slate-400">
      Loading notifications...
    </div>
  )}

  {!loading &&
    grouped.today.length === 0 &&
    grouped.yesterday.length === 0 &&
    grouped.earlier.length === 0 && (
      <div className="text-center py-24 text-slate-500">
        Tidak ada notifikasi
      </div>
    )}

  {/* ================= TODAY ================= */}
  {grouped.today.length > 0 && (
    <>
      <SectionHeader title="Today" />
      <AnimatePresence>
        {grouped.today.map(renderNotification)}
      </AnimatePresence>
    </>
  )}

  {/* ================= YESTERDAY ================= */}
  {grouped.yesterday.length > 0 && (
    <>
      <SectionHeader title="Yesterday" />
      <AnimatePresence>
        {grouped.yesterday.map(renderNotification)}
      </AnimatePresence>
    </>
  )}

  {/* ================= EARLIER ================= */}
  {grouped.earlier.length > 0 && (
    <>
      <SectionHeader title="Earlier" />
      <AnimatePresence>
        {grouped.earlier.map(renderNotification)}
      </AnimatePresence>
    </>
  )}
</div>
      </div>
  )
}

export default UserNotifications
