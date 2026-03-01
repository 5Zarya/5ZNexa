import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { io } from "socket.io-client";
import {
  FiSend,
  FiMessageSquare,
  FiAlertCircle,
  FiPaperclip,
} from "react-icons/fi";

type Sender = "USER" | "ADMIN";

interface Message {
  id: string;
  sender: Sender;
  content?: string;
  image?: string;
  createdAt: string;
}

interface Report {
  id: string;
  title: string;
  status: string;
  messages: Message[];
}

const socket = io("http://localhost:4000", {
  transports: ["websocket"],
});

export default function UserReports() {

  const [reports, setReports] = useState<Report[]>([]);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  /* CREATE REPORT *//* ===== CREATE REPORT STATE ===== */
const [reportTitle, setReportTitle] = useState("");
const [reportDescription, setReportDescription] = useState("");
const [reportFile, setReportFile] = useState<File | null>(null);
const [preview, setPreview] = useState<string | null>(null);

  /* CHAT */
  const [chatInput, setChatInput] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [chatPreview, setChatPreview] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ================= LOAD ================= */
  const loadReports = async () => {
    setLoading(true);
    const res = await api.get("/user/reports/me");
    setReports(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeReport?.messages]);

  /* ================= CREATE REPORT ================= */
 const sendReport = async () => {
  if (!reportTitle || (!reportDescription && !reportFile)) return;

  const formData = new FormData();
  formData.append("title", reportTitle);
  formData.append("description", reportDescription || "");

  if (reportFile) {
    formData.append("file", reportFile);
  }

  try {
    const res = await api.post(
  "/user/reports",
  formData,
  {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }
)

    setReportTitle("");
    setReportDescription("");
    setReportFile(null);
    setPreview(null);

    loadReports();
    setActiveReport(res.data);
  } catch (err) {
    console.error("SEND REPORT ERROR:", err);
  }
};

  /* ================= SEND CHAT ================= */
  const sendChat = async () => {
    if (!activeReport || (!chatInput && !chatFile)) return;

    const form = new FormData();
    if (chatInput) form.append("content", chatInput);
    if (chatFile) form.append("file", chatFile);

    const res = await api.post(
  `/user/reports/${activeReport.id}/message`,
  form
);

    // 🔥 PUSH LANGSUNG KE UI
    setActiveReport((prev) =>
      prev
        ? { ...prev, messages: [...prev.messages, res.data] }
        : prev
    );

    setChatInput("");
    setChatFile(null);
    setChatPreview(null);
  };

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!activeReport) return;

    socket.on(`report:${activeReport.id}`, (msg: Message) => {
      setActiveReport((prev) =>
        prev
          ? { ...prev, messages: [...prev.messages, msg] }
          : prev
      );
    });

    return () => {
      socket.off(`report:${activeReport.id}`);
    };
  }, [activeReport?.id]);

  /* ================= UI ================= */
  return (
    <div className="grid grid-cols-3 gap-6 p-6 text-cyan-200 h-full">

      {/* LEFT */}
      <div className="bg-[#060b18] rounded-xl p-4">
        <h2 className="mb-3 flex items-center gap-2">
          <FiMessageSquare /> My Reports
        </h2>

        {loading && <p>Loading...</p>}

        {reports.map((r) => (
          <div
            key={r.id}
            onClick={() => setActiveReport(r)}
            className={`p-3 rounded cursor-pointer ${
              activeReport?.id === r.id
                ? "bg-cyan-500/20"
                : "hover:bg-white/5"
            }`}
          >
            {r.title}
          </div>
        ))}

        {/* CREATE */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <input
            placeholder="Title"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-full mb-2 bg-[#0b1220] p-2 rounded"
          />

          <textarea
            placeholder="Describe issue..."
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            className="w-full bg-[#0b1220] p-2 rounded"
          />

          <label className="text-xs cursor-pointer">
            <FiPaperclip /> Attach
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setReportFile(f);
                setPreview(URL.createObjectURL(f));
              }}
            />
          </label>

          {preview && (
            <img src={preview} className="mt-2 rounded max-w-xs" />
          )}

          <button onClick={sendReport} className="btn-cyan w-full mt-2">
            <FiSend /> Submit
          </button>
        </div>
      </div>

      {/* RIGHT */}
      <div className="col-span-2 bg-[#060b18] rounded-xl flex flex-col">
        {!activeReport && (
          <div className="flex-1 flex items-center justify-center">
            Select report
          </div>
        )}

        {activeReport && (
          <>
            <div className="p-3 border-b border-white/10">
              {activeReport.title}
            </div>

            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-2">
              {activeReport.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-xs p-2 rounded ${
                    m.sender === "USER"
                      ? "ml-auto bg-cyan-500/20"
                      : "bg-white/10"
                  }`}
                >
                  {m.content && <p>{m.content}</p>}
                  {m.image && (
                    <img
                      src={`http://localhost:4000${m.image}`}
                      className="mt-2 rounded"
                    />
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-white/10 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-[#0b1220] p-2 rounded"
                placeholder="Message..."
              />
              <button onClick={sendChat} className="btn-cyan">
                <FiSend />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
