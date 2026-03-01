import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUsers,
  FiGift,
  FiClock,
  FiLayers,
  FiActivity,
  FiSend,
  FiCheckCircle,
  FiCalendar,
  FiXCircle
} from "react-icons/fi";
import api from "../../services/api";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

/* ================= TYPES ================= */
type Tab = "ASSIGN" | "TEMPLATE" | "TIMELINE" | "LOG" | "LEAVE";
type BenefitType = "ALLOWANCE" | "LEAVE";
type BenefitStatus = "APPROVED" | "PENDING";
type AllowanceType =
  | "BPJS_HEALTH"
  | "BPJS_EMPLOYMENT"
  | "TRANSPORT"
  | "MEAL"
  | "OTHER";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

interface LeaveRequest {
  id: string;
  user: {
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
}

interface Props {
  selectedUsers: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  activeBenefits: number;
}

interface BenefitTemplate {
  id: string;
  title: string;
  type: BenefitType;
  amount?: number;
  total?: number;
}

interface TimelineItem {
  id: string;
  userName: string;
  title: string;
  status: BenefitStatus;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  message: string;
  companyId: string;
  createdAt: string;
  meta?: {
    type?: "LEAVE_APPROVED";
    userName?: string;
    startDate?: string;
    endDate?: string;
    days?: number;
    approvedAt?: string;
  };
}

/* ================= COMPONENT ================= */
export default function AdminBenefits() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("ASSIGN");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [templates, setTemplates] = useState<BenefitTemplate[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  /* ================= INITIAL DATA ================= */
  useEffect(() => {
  const fetchAll = async () => {
    try {
      const [
        usersRes,
        templatesRes,
        timelineRes,
        activityRes,
        leaveRes
      ] = await Promise.all([
        api.get("/admin/benefits/users"),
        api.get("/admin/benefits/templates"),
        api.get("/admin/benefits/timeline"),
        api.get("/admin/benefits/activity"),
        api.get("/admin/benefits/leave-requests"),
      ]);

      console.log("USERS:", usersRes.data);

      setUsers(usersRes.data);
      setTemplates(templatesRes.data);
      setTimeline(timelineRes.data);
      setActivities(activityRes.data);
      setLeaveRequests(leaveRes.data);
    } catch (e) {
      toast.error("Gagal memuat data benefits");
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  fetchAll();
}, []);

  /* ================= SOCKET REALTIME ================= */
  useEffect(() => {
    const socket: Socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: localStorage.getItem("token") }
    });

    socket.on("benefit:timeline", (item: TimelineItem) => {
      setTimeline(prev => [item, ...prev]);
    });

    socket.on("benefit:activity", (log: ActivityLog) => {
      setActivities(prev => [log, ...prev]);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  return (
    <div className="h-full grid grid-cols-[320px_1fr] bg-[#030712] text-slate-200">
      {/* ================= LEFT USERS ================= */}
      <aside className="border-r border-white/10 p-4 bg-[#050a18]">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <FiUsers /> Employees
        </h2>

        <div className="space-y-2 overflow-auto max-h-[calc(100vh-100px)] pr-1">
          {users.map(u => {
            const selected = selectedUsers.includes(u.id);
            return (
              <motion.div
                key={u.id}
                whileHover={{ scale: 1.02 }}
                onClick={() =>
                  setSelectedUsers(prev =>
                    selected
                      ? prev.filter(id => id !== u.id)
                      : [...prev, u.id]
                  )
                }
                className={`cursor-pointer p-4 rounded-xl border transition
                  ${
                    selected
                      ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
              >
                <p className="text-sm font-semibold">{u.name}</p>
                <p className="text-xs opacity-60">{u.email}</p>
                <span className="text-[10px] opacity-50">
                  {u.activeBenefits} active benefits
                </span>
              </motion.div>
            );
          })}
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FiGift /> Benefit Control Center
          </h1>
          <p className="text-sm opacity-60">
            Assign, monitor & manage benefits in realtime
          </p>
        </header>

        {/* ================= TABS ================= */}
        <div className="flex gap-3">
          <Tab label="Assign" icon={<FiSend />} active={activeTab==="ASSIGN"} onClick={()=>setActiveTab("ASSIGN")} />
          <Tab label="Templates" icon={<FiLayers />} active={activeTab==="TEMPLATE"} onClick={()=>setActiveTab("TEMPLATE")} />
          <Tab label="Timeline" icon={<FiClock />} active={activeTab==="TIMELINE"} onClick={()=>setActiveTab("TIMELINE")} />
          <Tab label="Activity" icon={<FiActivity />} active={activeTab==="LOG"} onClick={()=>setActiveTab("LOG")} />
          <Tab
            label="Leave Requests"
            icon={<FiCalendar />}
            active={activeTab === "LEAVE"}
            onClick={() => setActiveTab("LEAVE")}
          />
        </div>

        {/* ================= CONTENT ================= */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#060b18]/80 border border-white/10 rounded-2xl p-6"
          >
            {activeTab === "ASSIGN" && (
              <AssignPanel selectedUsers={selectedUsers} />
            )}

            {activeTab === "TEMPLATE" && (
              <TemplatePanel templates={templates} />
            )}

            {activeTab === "TIMELINE" && (
              <TimelinePanel timeline={timeline} />
            )}

            {activeTab === "LOG" && (
              <ActivityPanel activities={activities} />
            )}
            {activeTab === "LEAVE" && (
  <LeavePanel
    data={leaveRequests}
    refresh={() =>
  api.get("/admin/benefits/leave-requests").then(r => setLeaveRequests(r.data))
}
  />
)}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ================= UI PARTS ================= */
function Tab({ label, icon, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl flex items-center gap-2 transition
        ${
          active
            ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 shadow-lg"
            : "bg-white/5 hover:bg-white/10"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ================= ASSIGN ================= */
export function AssignPanel({ selectedUsers }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<BenefitType>("ALLOWANCE");
  const [allowanceType, setAllowanceType] = useState<AllowanceType>("BPJS_HEALTH");
  const [total, setTotal] = useState<number | "">("");
  const [otherNote, setOtherNote] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
  if (!title || selectedUsers.length === 0) {
    toast.error("Pilih user & isi judul");
    return;
  }

  if (type === "LEAVE" && total === "") {
    toast.error("Masukkan jumlah cuti");
    return;
  }

  const payload: any = {
    title,
    type,
    users: selectedUsers,
  };

  // ===== ALLOWANCE =====
  if (type === "ALLOWANCE") {
    payload.allowanceType = allowanceType;

    if (
      ["MEAL", "TRANSPORT", "BPJS_HEALTH", "BPJS_EMPLOYMENT"].includes(
        allowanceType
      )
    ) {
      if (total === "") {
        toast.error("Nominal wajib diisi");
        return;
      }
      payload.allowanceAmount = Number(total);
    }

    if (allowanceType === "OTHER") {
      if (!otherNote) {
        toast.error("Keterangan wajib diisi");
        return;
      }
      payload.description = otherNote;
    }
  }

  // ===== LEAVE =====
  if (type === "LEAVE") {
    payload.leaveTotal = Number(total);
  }

  try {
    setLoading(true);
    await api.post("/admin/benefits/assign", payload);
    toast.success("Benefit berhasil diberikan");

    // optional reset
    setTitle("");
    setTotal("");
    setOtherNote("");
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal assign benefit");
  } finally {
    setLoading(false);
  }
};

  return (
  <div className="space-y-4 p-6 rounded-xl bg-slate-900/70 border border-slate-700">
    <h2 className="text-lg font-semibold text-white">Assign Benefit</h2>

    {/* === JUDUL === */}
    <input
      value={title}
      onChange={e => setTitle(e.target.value)}
      placeholder="Judul benefit"
      className="w-full px-4 py-2 rounded bg-slate-800 text-white"
    />

    {/* === TIPE BENEFIT === */}
    <select
      value={type}
      onChange={e => {
        setType(e.target.value as BenefitType);
        setTotal("");
      }}
      className="w-full px-4 py-2 rounded bg-slate-800 text-white"
    >
      <option value="ALLOWANCE">Tunjangan</option>
      <option value="LEAVE">Cuti</option>
    </select>

    {/* === SUBTYPE TUNJANGAN === */}
    {type === "ALLOWANCE" && (
      <select
        value={allowanceType}
        onChange={e => {
          setAllowanceType(e.target.value as AllowanceType);
          setTotal("");
        }}
        className="w-full px-4 py-2 rounded bg-slate-800 text-white"
      >
        <option value="BPJS_HEALTH">BPJS Kesehatan</option>
        <option value="BPJS_EMPLOYMENT">BPJS Ketenagakerjaan</option>
        <option value="TRANSPORT">Transport</option>
        <option value="MEAL">Makan</option>
        <option value="OTHER">Lainnya</option>
      </select>
    )}
{/* === CUTI === */}
{type === "LEAVE" && (
  <input
    type="number"
    value={total}
    onChange={e =>
      setTotal(e.target.value === "" ? "" : Number(e.target.value))
    }
    placeholder="Jumlah hari cuti"
    className="w-full px-4 py-2 rounded bg-slate-800 text-white"
  />
)}

{/* === ALLOWANCE - NOMINAL === */}
{type === "ALLOWANCE" &&
  ["MEAL", "TRANSPORT", "BPJS_HEALTH", "BPJS_EMPLOYMENT"].includes(allowanceType) && (
    <div className="space-y-1">
      <input
        type="number"
        value={total}
        onChange={e =>
          setTotal(e.target.value === "" ? "" : Number(e.target.value))
        }
        placeholder="Nominal (Rp)"
        className="w-full px-4 py-2 rounded bg-slate-800 text-white"
      />

      {/* === HELPER TEXT BPJS === */}
      {allowanceType?.includes("BPJS") && (
        <p className="text-xs text-slate-400">
          Masukkan nominal BPJS per periode payroll
        </p>
      )}
    </div>
)}

{/* === ALLOWANCE - OTHER === */}
{type === "ALLOWANCE" && allowanceType === "OTHER" && (
  <textarea
    value={otherNote}
    onChange={e => setOtherNote(e.target.value)}
    placeholder="Keterangan benefit lainnya (bebas)"
    className="w-full px-4 py-2 rounded bg-slate-800 text-white"
  />
)}

    {/* === AUTO APPROVE === */}
    <label className="flex items-center gap-2 text-slate-300">
      <input
        type="checkbox"
        checked={autoApprove}
        onChange={e => setAutoApprove(e.target.checked)}
      />
      Auto approve
    </label>

    {/* === SUBMIT === */}
    <button
      onClick={submit}
      disabled={loading}
      className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-semibold disabled:opacity-60"
    >
      {loading ? "Mengirim..." : "Kirim Benefit"}
    </button>
  </div>
);
}
/* ================= TEMPLATE ================= */
function TemplatePanel({ templates }: { templates: BenefitTemplate[] }) {
  return (
    <div className="space-y-3">
      {templates.map(t => (
        <div key={t.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="font-semibold">{t.title}</p>
          <p className="text-xs opacity-60">{t.type}</p>
        </div>
      ))}
    </div>
  );
}

/* ================= TIMELINE ================= */
function TimelinePanel({ timeline }: { timeline: TimelineItem[] }) {
  return (
    <div className="space-y-3">
      {timeline.map(t => (
        <div key={t.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between">
          <div>
            <p className="font-medium">{t.title}</p>
            <p className="text-xs opacity-60">{t.userName}</p>
          </div>
          {t.status === "APPROVED" ? (
            <FiCheckCircle className="text-green-400" />
          ) : (
            <FiXCircle className="text-yellow-400" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ================= ACTIVITY ================= */
function ActivityPanel({ activities }: { activities: ActivityLog[] }) {
  return (
    <div className="space-y-3">
      {activities.map(a => (
        <div
          key={a.id}
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm"
        >
          <p className="font-medium">{a.message}</p>

          {a.meta?.type === "LEAVE_APPROVED" && (
            <p className="text-xs text-blue-400 mt-1">
              📅 {formatDate(a.meta.startDate!)} –{" "}
              {formatDate(a.meta.endDate!)} ({a.meta.days} hari)
            </p>
          )}

          <p className="text-[11px] opacity-50 mt-1">
            {formatDateTime(a.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function LeavePanel({
  data,
  refresh,
}: {
  data: LeaveRequest[];
  refresh: () => void;
}) {
  const updateStatus = async (
    id: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    try {
      const action =
        status === "APPROVED" ? "approve" : "reject";

      await api.patch(
        `/admin/benefits/leave-requests/${id}/${action}`
      );

      toast.success(
        `Cuti ${status === "APPROVED" ? "disetujui" : "ditolak"}`
      );

      refresh();
    } catch {
      toast.error("Gagal update cuti");
    }
  };

  return (
    <div className="space-y-4">
      {data.map(lr => (
        <div
          key={lr.id}
          className="p-4 rounded-xl bg-white/5 border border-white/10"
        >
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="font-semibold">{lr.user.name}</p>
              <p className="text-xs opacity-60">
                {lr.user.email}
              </p>

              <p className="text-sm mt-2">
                📅 {formatDate(lr.startDate)} →{" "}
                {formatDate(lr.endDate)}
              </p>

              <p className="text-xs opacity-70">
                {lr.days} hari
              </p>
            </div>

            {lr.status === "PENDING" ? (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updateStatus(lr.id, "APPROVED")
                  }
                  className="px-3 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                >
                  Approve
                </button>

                <button
                  onClick={() =>
                    updateStatus(lr.id, "REJECTED")
                  }
                  className="px-3 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  Reject
                </button>
              </div>
            ) : (
              <span
                className={`text-xs font-semibold ${
                  lr.status === "APPROVED"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {lr.status}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
