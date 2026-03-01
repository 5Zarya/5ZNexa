import { useEffect, useState, useRef } from "react"
import type { ChangeEvent } from "react"
import { io, Socket } from "socket.io-client"
import api from "../../services/api"
import { motion } from "framer-motion"

import { useAuth } from "../../contexts/AuthContext"

interface CompanyUser {
  id: string
  name: string
  email: string
  avatar: string | null
  phone?: string | null
  location?: string | null
  activeCompany?: {
    id: string
    name: string
    code: string
  } | null
}

interface Message {
  id: string
  content: string
  createdAt: string
  type?: "text" | "image"
  replyTo?: Message | null
  sender: {
    id: string
    name: string
    avatar: string | null
  }
}

const SOCKET_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000"

export default function People() {
  const { user: me } = useAuth()

  const [users, setUsers] = useState<CompanyUser[]>([])
  const [selectedUser, setSelectedUser] =
    useState<CompanyUser | null>(null)
  const [conversationId, setConversationId] =
    useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] =
    useState<"profile" | "chat" | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUser, setTypingUser] =
    useState<string | null>(null)
  const [editingId, setEditingId] =
    useState<string | null>(null)
    const [editingContent, setEditingContent] = useState("")
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [replyMessage, setReplyMessage] = useState<Message | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
const [highlightedId, setHighlightedId] = useState<string | null>(null)
const messagesContainerRef = useRef<HTMLDivElement>(null)
const textareaRef = useRef<HTMLTextAreaElement>(null)
  /* ================= LOAD USERS ================= */
  useEffect(() => {
  api.get("/chat/users").then(res => {
    setUsers(res.data)

    // isi lastSeen awal dari database
    const map: Record<string, string> = {}
    res.data.forEach((u: any) => {
      if (u.lastSeen) {
        map[u.id] = u.lastSeen
      }
    })

    setLastSeenMap(map)
  })
}, [])

  /* ================= SOCKET INIT ================= */
  useEffect(() => {
  if (!me?.id) return

  const s = io(`${SOCKET_URL}/user`, {
  transports: ["websocket"],
  auth: {
    token: localStorage.getItem("access_token"),
  },
})

  setSocket(s)

  return () => {
    s.disconnect()
  }
}, [me])

  /* ================= ONLINE USERS ================= */
  useEffect(() => {
    if (!socket) return

    socket.on("userOnline", (userId: string) => {
  setOnlineUsers(prev =>
    prev.includes(userId) ? prev : [...prev, userId]
  )
})

    socket.on("userOffline", (userId: string) => {
      setOnlineUsers(prev =>
        prev.filter(id => id !== userId)
      )
    })

    return () => {
      socket.off("userOnline")
      socket.off("userOffline")
    }
  }, [socket])

  /* ================= TYPING ================= */
  useEffect(() => {
    if (!socket) return

    socket.on("userTyping", (userId: string) => {
      setTypingUser(userId)
      setTimeout(() => setTypingUser(null), 2000)
    })

    return () => {
      socket.off("userTyping")
    }
  }, [socket])

  useEffect(() => {
  const el = textareaRef.current
  if (!el) return

  el.style.height = "auto"
  el.style.height = el.scrollHeight + "px"
}, [input])

  /* ================= CREATE CONVERSATION ================= */
  useEffect(() => {
    if (!selectedUser) return

    api
      .post("/chat/conversation", {
        userId: selectedUser.id,
      })
      .then(res => {
        setConversationId(res.data.id)
      })
  }, [selectedUser])

  useEffect(() => {
  if (!socket) return

  socket.on("userLastSeen", (data: { userId: string; lastSeen: string }) => {
    console.log("LAST SEEN EVENT:", data)
    setLastSeenMap(prev => ({
        
      ...prev,
      [data.userId]: data.lastSeen,
    }))
  })

  return () => {
    socket.off("userLastSeen")
  }
}, [socket])

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!conversationId || !socket) return

    api
      .get(`/chat/messages/${conversationId}`)
      .then(res => setMessages(res.data))

    socket.emit("joinConversation", conversationId)

    socket.on("newMessage", (msg: Message) => {
      setMessages(prev => [...prev, msg])
    })

    return () => {
      socket.off("newMessage")
    }
  }, [conversationId, socket])

  useEffect(() => {
  if (!socket) return

  socket.on("messagedeleted", (id: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === id
          ? { ...m, content: "Message deleted" }
          : m
      )
    )
  })

  socket.on("messageedited", (updated: Message) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === updated.id ? updated : m
      )
    )
  })

  return () => {
    socket.off("messagedeleted")
    socket.off("messageedited")
  }
}, [socket])

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
  const container = messagesContainerRef.current
  if (!container) return

  const isAtBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight < 100

  if (isAtBottom) {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }
}, [messages])

  /* ================= HELPERS ================= */
  const getAvatar = (user: CompanyUser) => {
    if (!user.avatar) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.name
      )}`
    }

    if (user.avatar.startsWith("http"))
      return user.avatar

    return `${SOCKET_URL}/${user.avatar.replace(/^\/+/, "")}`
  }

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
  if (!conversationId) return

  try {
    // 🔹 FILE + CAPTION
    if (selectedFiles.length > 0) {
      const formData = new FormData()

      selectedFiles.forEach(file => {
        formData.append("files", file)
      })

      formData.append("conversationId", conversationId)
      formData.append("content", input || "")
      formData.append("replyToId", replyMessage?.id || "")

      const res = await api.post(
        "/chat/message/images",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      )

      setMessages(prev => [...prev, ...res.data])

      // ✅ RESET SEMUA
      setSelectedFiles([])
      setInput("")
      setReplyMessage(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      return
    }

    // 🔹 TEXT ONLY
    if (!input.trim()) return

    const res = await api.post("/chat/message", {
  conversationId,
  content: input,
  replyToId: replyMessage?.id || null,
})

setMessages(prev => [...prev, res.data]) // ✅ TAMBAHKAN INI

setInput("")
setReplyMessage(null)

  } catch (err) {
    console.error(err)
  }
}

const handleSend = async () => {
  if (!input.trim()) return

  const res = await api.post("/chat/message", {
    conversationId,
    content: input.trim(),
    replyToId: replyMessage?.id || null,
  })

  setMessages(prev => [...prev, res.data])
  setInput("")
  setReplyMessage(null)
}

const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  // Jangan kirim kalau sedang composition (IME)
  if (e.nativeEvent.isComposing) return

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault() // ⛔ cegah newline
    handleSend()
  }
}

const scrollToMessage = (id: string) => {
  const element = messageRefs.current[id]
  if (!element) return

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
  })

  setHighlightedId(id)

  setTimeout(() => {
    setHighlightedId(null)
  }, 2000)
}
  /* ================= IMAGE UPLOAD ================= */
  const handleImageUpload = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const files = e.target.files
  if (!files) return

  const newFiles = Array.from(files)

  setSelectedFiles((prev) => [...prev, ...newFiles])
}

  /* ================= DELETE ================= */
  const deleteMessage = async (id: string) => {
    await api.delete(`/chat/message/${id}`)
    setMessages(prev =>
      prev.filter(msg => msg.id !== id)
    )
  }

  /* ================= EDIT ================= */
  const saveEdit = async (
    id: string,
    content: string
  ) => {
    const res = await api.patch(`/chat/message/${id}`, {
  content,
    })

    setMessages(prev =>
      prev.map(m =>
        m.id === id ? res.data : m
      )
    )

    setEditingId(null)
  }

  const formatLastSeen = (dateString?: string) => {
  if (!dateString) return "Offline"

  const date = new Date(dateString)
  return `Last seen ${date.toLocaleString()}`
}
  /* ================= UI ================= */

  return (
    <div className="h-full flex flex-col relative bg-[#0b0f19] text-slate-200 overflow-hidden">

  {/* soft glow */}
  <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px]
                  bg-cyan-500/10 blur-[160px] rounded-full" />

  <div className="absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px]
                  bg-blue-500/10 blur-[160px] rounded-full" />

  <div className="relative z-10 flex w-full h-full">
      {/* SIDEBAR */}
      <div className={`
fixed sm:relative
z-30
w-full sm:w-80
h-full
bg-white/5
backdrop-blur-2xl
border-r border-white/10
px-4 py-3
overflow-y-auto
transition-transform duration-300
${selectedUser && viewMode !== null ? "-translate-x-full sm:translate-x-0" : "translate-x-0"}
`}>
        <h2 className="font-semibold mb-4">
          Company Users
        </h2>

        {users.map(u => (
          <div
            key={u.id}
            onClick={() => {
              setSelectedUser(u)
              setViewMode("profile")
            }}
            className="
p-3
rounded-xl
cursor-pointer
mb-2
hover:bg-white/10
transition-all
duration-200
"
          >
            <div className="flex items-center justify-between">
              <span>{u.name}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  onlineUsers.includes(u.id)
                    ? "bg-green-500"
                    : "bg-gray-500"
                }`}
              />
            </div>
            <div className="text-xs text-slate-400">
              {u.email}
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT PANEL */}
<div className={`
flex-1 flex flex-col min-h-0 w-full
transition-transform duration-300
${selectedUser ? "translate-x-0 sm:translate-x-0" : "translate-x-full sm:translate-x-0"}
`}>
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select someone
          </div>
        ) : viewMode === "profile" ? (
          <div className="flex-1 p-6">
            <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-xl border border-slate-800">

  <div className="flex flex-col items-center">
    <img
      src={getAvatar(selectedUser)}
      alt={selectedUser.name}
      className="w-24 h-24 rounded-full object-cover border border-slate-700"
    />

    <h2 className="mt-4 text-xl font-semibold">
      {selectedUser.name}
    </h2>

    <p className="text-sm text-slate-400">
      {selectedUser.email}
    </p>

    {/* ONLINE STATUS */}
    <div className="flex items-center gap-2 mt-2">
      <div
        className={`w-2 h-2 rounded-full ${
          onlineUsers.includes(selectedUser.id)
            ? "bg-green-500"
            : "bg-gray-500"
        }`}
      />
      <span className="text-xs text-slate-400">
        {onlineUsers.includes(selectedUser.id)
          ? "Online"
          : formatLastSeen(lastSeenMap[selectedUser.id])}
      </span>
    </div>
  </div>

  {/* DETAIL INFO */}
  <div className="mt-6 space-y-2 text-sm">

    <div>
      <span className="text-slate-400">Phone:</span>{" "}
      {selectedUser.phone || "-"}
    </div>

    <div>
      <span className="text-slate-400">Location:</span>{" "}
      {selectedUser.location || "-"}
    </div>

    <div>
      <span className="text-slate-400">Company:</span>{" "}
      {selectedUser.activeCompany?.name || "-"}
    </div>
  </div>

  <button
    onClick={() => setViewMode("chat")}
    className="mt-6 w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 transition"
  >
    Start Chat
  </button>
</div>
          </div>
        ) : (
          <>
          <div className="
sticky top-0 z-20
px-4 py-3
bg-[#0b0f19]/90
backdrop-blur-xl
border-b border-white/10
flex items-center gap-3
">
<button
  onClick={() => {
    setSelectedUser(null)
    setViewMode(null)
  }}
  className="sm:hidden mr-2 text-slate-400"
>
  ←
</button>
  <img
    src={getAvatar(selectedUser)}
    alt={selectedUser.name}
    className="w-10 h-10 rounded-full object-cover"
  />

  <div>
    <div className="font-semibold">
      {selectedUser.name}
    </div>
    <div className="text-xs text-slate-400">
      {selectedUser.email}
    </div>
  </div>

  <div className="ml-auto flex items-center gap-2">
    <div
      className={`w-2 h-2 rounded-full ${
        onlineUsers.includes(selectedUser.id)
          ? "bg-green-500"
          : "bg-gray-500"
      }`}
    />
    <span className="text-xs text-slate-400">
      {onlineUsers.includes(selectedUser.id)
        ? "Online"
        : formatLastSeen(lastSeenMap[selectedUser.id])}
    </span>
  </div>
</div>
            {/* MESSAGES */}
            <div
  ref={messagesContainerRef}
  className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2"
>
  {messages.map((msg) => (
    <motion.div
      key={msg.id}
      ref={(el) => {
  messageRefs.current[msg.id] = el
}}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
transition={{
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1]
}}
      className={`max-w-xs text-[15px] sm:text-sm break-words whitespace-pre-wrap ${
  msg.sender?.id === me?.id
    ? "ml-auto max-w-[75%] sm:max-w-[60%] px-3 py-2 rounded-2xl rounded-br-md bg-gradient-to-br from-cyan-400 to-cyan-500 text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
    : "max-w-[75%] sm:max-w-[60%] px-3 py-2 rounded-2xl rounded-bl-md bg-white/5 backdrop-blur-xl border border-white/10 text-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
} ${
  highlightedId === msg.id
    ? "ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
    : ""
}`}
    >
                    {msg.replyTo && (
  <div
    onClick={() => scrollToMessage(msg.replyTo!.id)}
    className="
bg-slate-800/60
backdrop-blur-md
border-l-2 border-slate-500/60
pl-3 py-2
rounded-lg
mb-2
hover:bg-slate-700/60
transition-all
duration-200
"
  >
    <p className="text-xs text-gray-300">
      {msg.replyTo.sender?.name}
    </p>

    {msg.replyTo.type === "image" ? (
      <img
        src={`${SOCKET_URL}/uploads/chat/${msg.replyTo.content}`}
        className="w-16 h-16 object-cover rounded mt-1"
      />
    ) : (
      <p className="text-xs truncate">
        {msg.replyTo.content}
      </p>
    )}
  </div>
)}
                  {editingId === msg.id ? (
  <div className="flex flex-col gap-2">
    <input
      value={editingContent}
      onChange={e => setEditingContent(e.target.value)}
      className="text-black px-2 py-1 rounded"
    />

    <div className="flex gap-2 text-xs">
      <button
        onClick={() => saveEdit(msg.id, editingContent)}
        className="bg-green-500 px-2 py-1 rounded"
      >
        Save
      </button>

      <button
        onClick={() => setEditingId(null)}
        className="bg-gray-500 px-2 py-1 rounded"
      >
        Cancel
      </button>
    </div>
  </div>

) : msg.type === "image" ? (

  <div>
    <img
      src={`${SOCKET_URL}/uploads/chat/${msg.content}`}
      className="rounded-lg"
    />

    {/* caption */}
    {msg.content && (
      <div className="mt-1 text-sm">
        {msg.content}
      </div>
    )}
  </div>

) : (

  <div>{msg.content}</div>

)}
                  <div className="mt-1 text-xs flex gap-2">

  {/* Reply boleh ke SEMUA pesan */}
  <button onClick={() => setReplyMessage(msg)}>
    Reply
  </button>

  {/* Edit & Delete hanya milik sendiri */}
  {msg.sender?.id === me?.id && (
    <>
      <button
        onClick={() => {
          setEditingId(msg.id)
          setEditingContent(msg.content)
        }}
      >
        ✏
      </button>

      <button onClick={() => deleteMessage(msg.id)}>
        🗑
      </button>
    </>
  )}
</div>
    </motion.div>
  ))}
  {typingUser === selectedUser.id && (
    <div className="text-xs text-slate-400">
      Typing...
    </div>
  )}

  <div ref={bottomRef} />
</div>
{replyMessage && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="
bg-slate-900/70
backdrop-blur-xl
p-3
rounded-xl
mb-3
border-l-4 border-slate-500/70
shadow-lg
"
  >
    <p className="text-sm text-gray-400">
      Replying to {replyMessage.sender?.name}
    </p>

    {replyMessage.type === "image" ? (
      <img
        src={`${SOCKET_URL}/uploads/chat/${replyMessage.content}`}
        className="w-16 h-16 object-cover rounded mt-1"
      />
    ) : (
      <p className="text-sm truncate">
        {replyMessage.content}
      </p>
    )}

    <button
      onClick={() => setReplyMessage(null)}
      className="text-xs mt-1 text-red-400"
    >
      Cancel
    </button>
  </motion.div>
)}
            {/* INPUT AREA */}
<div className="border-t border-white/10 bg-[#0b0f19]/95 backdrop-blur-xl">
  <div className="px-4 py-2">

    {selectedFiles.length > 0 && (
      <div className="flex gap-2 mb-2 flex-wrap">
        {selectedFiles.map((file, index) => {
          const preview = URL.createObjectURL(file)
          return (
            <div
              key={index}
              className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/10"
            >
              <img
                src={preview}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() =>
                  setSelectedFiles(prev =>
                    prev.filter((_, i) => i !== index)
                  )
                }
                className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    )}

    <div className="flex items-end gap-2 bg-white/5 px-3 py-2 rounded-xl">
      <textarea
        ref={textareaRef}
        value={input}
        rows={1}
        onChange={(e) => {
          setInput(e.target.value)
          socket?.emit("typing", { conversationId })
        }}
        onKeyDown={handleKeyDown}
        className="
          flex-1
          bg-transparent
          outline-none
          text-sm
          resize-none
          max-h-32
        "
        placeholder="Type a message..."
      />

      <label className="cursor-pointer text-lg px-2">
        📎
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>

      <button
        onClick={sendMessage}
        className="px-4 py-1.5 rounded-lg bg-cyan-500 text-sm"
      >
        Send
      </button>
    </div>

  </div>
</div>
          </>
        )}
      </div>
    </div>
    </div>
  )
}