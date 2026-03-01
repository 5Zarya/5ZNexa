import { io, Socket } from "socket.io-client"

const sockets: Record<string, Socket> = {}
let currentToken: string | null = null

const getBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE || ""
  return base.endsWith("/api") ? base.replace("/api", "") : base
}

export const getSocket = (
  namespace: "admin" | "user",
  token?: string
): Socket | null => {
  if (!token || token === "undefined") {
    console.warn("⛔ BLOCKED: invalid token for socket")
    return null
  }

  const key = `${namespace}-${token}`

  // 🔥 Jika sudah ada socket untuk namespace & token sama
  if (sockets[key]) {
    return sockets[key]
  }

  // 🔥 Disconnect socket namespace lain dengan token lama
  Object.keys(sockets).forEach((k) => {
    sockets[k].removeAllListeners()
    sockets[k].disconnect()
    delete sockets[k]
  })

  currentToken = token

  const socket = io(`${getBaseUrl()}/${namespace}`, {
    auth: { token },
    transports: ["websocket"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  socket.on("connect", () => {
    console.log(`🟢 ${namespace} socket connected:`, socket.id)
  })

  socket.on("disconnect", (reason) => {
    console.log(`🔴 ${namespace} socket disconnected:`, reason)
  })

  socket.on("connect_error", (err) => {
    console.error(`❌ ${namespace} socket error:`, err.message)
  })

  sockets[key] = socket
  return socket
}

export const disconnectSocket = () => {
  Object.values(sockets).forEach((socket) => {
    socket.removeAllListeners()
    socket.disconnect()
  })

  Object.keys(sockets).forEach((k) => delete sockets[k])

  currentToken = null
  console.log("🛑 All sockets disconnected")
}
