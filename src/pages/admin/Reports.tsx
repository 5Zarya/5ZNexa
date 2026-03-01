import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMessageSquare,
  FiSend,
  FiUser,
  FiClock,
  FiChevronDown,
} from "react-icons/fi";

/* ================= TYPES ================= */
type ReportStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";
type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Message {
  sender: "USER" | "ADMIN";
  content?: string;
  image?: string;
  attachmentUrl?: string;
  createdAt?: string;
}

interface Report {
  id: string;
  title: string;
  status: ReportStatus;
  user: User;
  messages: Message[];
  createdAt: string;

  // 🔥 AI FEATURES
  summary?: string;
  sentiment?: Sentiment;
}

/* ================= SOCKET ================= */
const socket: Socket = io("http://localhost:4000", {
  transports: ["websocket"],
});

/* ================= HELPERS ================= */
const calcSLA = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diff / 60000);
};

const SentimentBadge = ({ sentiment }: { sentiment?: Sentiment }) => {
  if (!sentiment) return null;

  const map = {
    POSITIVE: "bg-green-500/20 text-green-300",
    NEUTRAL: "bg-gray-500/20 text-gray-300",
    NEGATIVE: "bg-red-500/20 text-red-300",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] ${map[sentiment]}`}>
      🧠 {sentiment}
    </span>
  );
};

/* ================= COMPONENT ================= */
export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [message, setMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
const [file, setFile] = useState<File | null>(null);
const [preview, setPreview] = useState<string | null>(null);


  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeReport?.messages]);

  /* ================= LOAD REPORTS ================= */
  const loadReports = async () => {
    const res = await api.get("/admin/reports");
    setReports(res.data);
  };

  useEffect(() => {
    loadReports();
  }, []);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
  if (!activeReport || (!message && !file)) return;

  const form = new FormData();
  if (message) form.append("content", message);
  if (file) form.append("file", file);

  const optimistic: Message = {
    sender: "ADMIN",
    content: message,
    image: preview ?? undefined,
  };

  setActiveReport((prev) =>
    prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev
  );

  setMessage("");
  setFile(null);
  setPreview(null);

  await api.post(
    `/admin/reports/${activeReport.id}/message`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (status: ReportStatus) => {
    if (!activeReport) return;

    setActiveReport({ ...activeReport, status });

    await api.patch(`/admin/reports/${activeReport.id}/status`, { status });
    loadReports();
  };

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!activeReport) return;

    socket.emit("join-report", activeReport.id);

    socket.on(`report:${activeReport.id}`, (msg: Message) => {
      setActiveReport((prev) =>
        prev ? { ...prev, messages: [...prev.messages, msg] } : prev
      );
    });

    return () => {
      socket.off(`report:${activeReport.id}`);
    };
  }, [activeReport?.id]);

  /* ================= UI ================= */
 return (
  <div className="p-6 grid grid-cols-3 gap-6 h-[calc(100vh-80px)] text-cyan-200">

    {/* ================= LEFT: REPORT LIST ================= */}
    <div className="bg-[#060b18]/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex flex-col">
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <FiMessageSquare /> Reports
      </h2>

      <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
        <AnimatePresence>
          {reports.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveReport(r)}
              className={`p-3 rounded-xl cursor-pointer transition border
                ${
                  activeReport?.id === r.id
                    ? "bg-cyan-500/20 border-cyan-400/40"
                    : "border-white/5 hover:bg-white/5"
                }`}
            >
              <h3 className="text-sm font-semibold">{r.title}</h3>

              <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
                <FiUser /> {r.user.name}
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] opacity-60 flex items-center gap-1">
                  <FiClock /> SLA {calcSLA(r.createdAt)}m
                </span>

                <SentimentBadge sentiment={r.sentiment} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>

    {/* ================= RIGHT: CHAT ================= */}
    <div className="col-span-2 bg-[#060b18]/80 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col">

      {!activeReport && (
        <div className="flex flex-1 items-center justify-center text-cyan-400/50 text-sm">
          Select a report to start conversation
        </div>
      )}

      {activeReport && (
        <>
          {/* HEADER */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <div>
              <h2 className="font-semibold">{activeReport.title}</h2>
              <p className="text-xs opacity-60">
                {activeReport.user.name} • {activeReport.user.email}
              </p>
            </div>

            <div className="relative">
              <select
                value={activeReport.status}
                onChange={(e) =>
                  updateStatus(e.target.value as ReportStatus)
                }
                className="bg-[#0b1220] border border-white/10 rounded-lg px-3 py-1 text-xs pr-7"
              >
                <option>PENDING</option>
                <option>IN_PROGRESS</option>
                <option>RESOLVED</option>
              </select>
              <FiChevronDown className="absolute right-2 top-2 text-xs opacity-40 pointer-events-none" />
            </div>
          </div>

          {/* AI SUMMARY */}
          {activeReport.summary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="m-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-xs"
            >
              🤖 <b>AI Summary:</b> {activeReport.summary}
            </motion.div>
          )}

          {/* MESSAGES */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            <AnimatePresence>
              {activeReport.messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm backdrop-blur
                    ${
                      m.sender === "ADMIN"
                        ? "bg-gradient-to-br from-purple-500/30 to-cyan-500/20 ml-auto"
                        : "bg-white/5 mr-auto"
                    }`}
                >
                  {m.content && <p>{m.content}</p>}

                  {m.image && (
                    <img
                      src={`http://localhost:4000${m.image}`}
                      className="mt-2 rounded-lg max-w-xs border border-white/10"
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-4 border-t border-white/10 space-y-2">
            {preview && (
              <img
                src={preview}
                className="w-24 rounded-xl border border-white/10"
              />
            )}

            <div className="flex gap-3 items-center">
              <label className="cursor-pointer text-cyan-400">
                📎
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (!selected) return;
                    setFile(selected);
                    setPreview(URL.createObjectURL(selected));
                  }}
                />
              </label>

              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a reply…"
                className="flex-1 bg-[#0b1220] rounded-xl px-4 py-2 text-sm"
              />

              <button
                onClick={sendMessage}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-black"
              >
                <FiSend />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);
}