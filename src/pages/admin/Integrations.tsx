// src/pages/admin/Integrations.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlugZap,
  Video,
  Calendar,
  Plus,
  X,
  Link as LinkIcon,
  Clock,
  Users,
} from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";

/* ================= TYPES ================= */
type IntegrationType = "MEETING" | "WORK_SCHEDULE";

interface User {
  id: string;
  name: string;
}

interface WorkScheduleConfig {
  days: string[];
  startTime: string;
  endTime: string;
  users: User[];
}

interface Integration {
  id: string;
  name: string;
  description: string;
  type: IntegrationType;
  config: any;
}

/* ================= SHARED UI COMPONENTS ================= */

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900/90 backdrop-blur
                   p-6 rounded-2xl w-full max-w-md space-y-4"
      >
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

const Input = ({ value, onChange, ...p }: any) => (
  <input
    {...p}
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full p-2 rounded-lg bg-slate-800
               border border-slate-700
               text-slate-200 focus:outline-none
               focus:border-cyan-400/60"
  />
);

const Textarea = ({ value, onChange, ...p }: any) => (
  <textarea
    {...p}
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full p-2 rounded-lg bg-slate-800
               border border-slate-700
               text-slate-200 focus:outline-none
               focus:border-cyan-400/60"
  />
);

const PrimaryButton = ({ onClick, children = "Simpan" }: any) => (
  <button
    onClick={onClick}
    className="w-full py-2 rounded-lg
               bg-gradient-to-r from-cyan-400 to-blue-500
               text-black font-semibold
               hover:scale-[1.02] transition"
  >
    {children}
  </button>
);

const PeriodButton = ({ active, onClick, label }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2 rounded-lg text-sm font-medium transition
      ${
        active
          ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-black"
          : "bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
  >
    {label}
  </button>
);

/* ================= MAIN ================= */
export default function AdminIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeTab, setActiveTab] = useState<IntegrationType>("MEETING");

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    api
      .get("/admin/integrations")
      .then(res => setIntegrations(res.data))
      .catch(() => toast.error("Gagal memuat integrations"));
  }, []);

  const filtered = integrations.filter(i => i.type === activeTab);


  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* HEADER */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <PlugZap className="text-cyan-400" /> Integrations
        </h1>
        <p className="text-slate-400">
          Pengaturan meeting & jadwal kerja berbasis sistem
        </p>
      </header>

      {/* TABS */}
      <div className="flex gap-3">
        <TabButton
          active={activeTab === "MEETING"}
          icon={<Video size={18} />}
          label="Meeting"
          onClick={() => setActiveTab("MEETING")}
        />
        <TabButton
          active={activeTab === "WORK_SCHEDULE"}
          icon={<Calendar size={18} />}
          label="Work Schedule"
          onClick={() => setActiveTab("WORK_SCHEDULE")}
        />
      </div>

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filtered.length === 0 ? (
            <EmptyState
              type={activeTab}
              onAdd={() =>
                activeTab === "MEETING"
                  ? setShowMeetingModal(true)
                  : setShowScheduleModal(true)
              }
            />
          ) : (
            filtered.map(item => (
              <IntegrationCard key={item.id} data={item} />
            ))
          )}
        </motion.div>
      </AnimatePresence>

      {/* FLOATING BUTTON */}
      <button
        onClick={() =>
          activeTab === "MEETING"
            ? setShowMeetingModal(true)
            : setShowScheduleModal(true)
        }
        className="fixed bottom-8 right-8 flex items-center gap-2
                   px-6 py-3 rounded-full
                   bg-gradient-to-r from-cyan-400 to-blue-500
                   text-black font-semibold shadow-xl
                   hover:scale-105 transition"
      >
        <Plus size={18} /> Tambah
      </button>

      {showMeetingModal && (
  <CreateMeetingModal
    onClose={() => setShowMeetingModal(false)}
    onCreated={(d: Integration) =>
      setIntegrations(p => [d, ...p])
    }
  />
)}

{showScheduleModal && (
  <CreateWorkScheduleModal
    onClose={() => setShowScheduleModal(false)}
    onCreated={(d: Integration) =>
      setIntegrations(p => [d, ...p])
    }
  />
)}
    </div>
  );
}

/* ================= UI PARTS ================= */

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-xl flex items-center gap-2
      backdrop-blur border transition
      ${
        active
          ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-400"
          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function IntegrationCard({ data }: { data: Integration }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800
                    hover:border-cyan-500/40 transition">
      <h3 className="font-semibold text-lg mb-1">{data.name}</h3>
      <p className="text-sm text-slate-400 mb-4">{data.description}</p>

      {data.type === "MEETING" && (
        <div className="flex items-center gap-2 text-xs text-cyan-400">
          <LinkIcon size={14} />
          {data.config.meetingUrl}
        </div>
      )}

      {data.type === "WORK_SCHEDULE" && (
  <>
    <div className="space-y-2 text-xs text-slate-400">
      <div className="flex gap-2 items-center">
        <Clock size={14} />
        {data.config.startTime} – {data.config.endTime}
      </div>
      <div className="flex gap-2 items-center">
        <Calendar size={14} />
        {data.config.days.join(", ")}
      </div>
      <div className="flex gap-2 items-center">
        <Users size={14} />
        {data.config.users.length} user
      </div>
    </div>

    {/* 🔥 TAMBAHAN BARU */}
    <WeeklyCalendar config={data.config} />
    <UserWorkload config={data.config} />
  </>
)}

    </div>
  );
}
/* ================= ADVANCED VISUAL ================= */

function WeeklyCalendar({ config }: { config: WorkScheduleConfig }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="mt-4 rounded-xl border border-white/10 overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-800 text-xs text-center">
        {days.map(d => (
          <div key={d} className="p-2 border-r border-white/5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 h-20 bg-slate-900">
        {days.map(d => (
          <div
            key={d}
            className={`relative border-r border-white/5 ${
              config.days.includes(d)
                ? "bg-cyan-500/10"
                : "bg-transparent"
            }`}
          >
            {config.days.includes(d) && (
              <div className="absolute inset-2 rounded-md
                              bg-gradient-to-r from-cyan-400/40 to-blue-500/40
                              text-[10px] text-black flex items-center justify-center">
                {config.startTime} – {config.endTime}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserWorkload({ config }: { config: WorkScheduleConfig }) {
  const duration =
    parseInt(config.endTime) - parseInt(config.startTime);
  const score = config.days.length * duration;

  const level =
    score < 20 ? "LOW" : score < 35 ? "MEDIUM" : "HIGH";

  const color =
    level === "LOW"
      ? "bg-emerald-400"
      : level === "MEDIUM"
      ? "bg-yellow-400"
      : "bg-red-500";

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-xs text-slate-400 uppercase tracking-wide">
        User Workload
      </h4>

      {config.users.map(u => (
        <div key={u.id} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{u.name}</span>
            <span className="text-slate-400">{level}</span>
          </div>

          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full ${color}`}
              style={{ width: `${Math.min(score * 3, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}


function EmptyState({ type, onAdd }: any) {
  return (
    <div className="col-span-full p-14 text-center rounded-2xl
                    border border-dashed border-white/10
                    bg-white/5">
      <p className="text-slate-400 mb-4">
        Belum ada {type === "MEETING" ? "Meeting Integration" : "Work Schedule"}
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2 rounded-lg
                   bg-cyan-500/20 text-cyan-400
                   hover:bg-cyan-500/30 transition"
      >
        Tambah
      </button>
    </div>
  );
}

/* ================= MODALS ================= */

function CreateMeetingModal({ onClose, onCreated }: any) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");

  const submit = async () => {
    if (!name || !url) return toast.error("Lengkapi data");

    const res = await api.post("/admin/integrations", {
      type: "MEETING",
      name,
      description: desc,
      config: { meetingUrl: url },
    });

    onCreated(res.data);
    toast.success("Meeting integration dibuat");
    onClose();
  };

  return (
    <Modal title="Tambah Meeting Integration" onClose={onClose}>
      <Input placeholder="Nama integration" value={name} onChange={setName} />
      <Input placeholder="Link Zoom / Google Meet" value={url} onChange={setUrl} />
      <Textarea placeholder="Deskripsi" value={desc} onChange={setDesc} />
      <PrimaryButton onClick={submit} />
    </Modal>
  );
}

function CreateWorkScheduleModal({ onClose, onCreated }: any) {
  const [days, setDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const [periodType, setPeriodType] = useState<"DATE" | "MONTH">("DATE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    api.get("/admin/users").then(res => setUsers(res.data));
  }, []);

  const toggleDay = (d: string) =>
    setDays(p => (p.includes(d) ? p.filter(x => x !== d) : [...p, d]));

  const toggleUser = (id: string) =>
    setSelectedUserIds(p =>
      p.includes(id) ? p.filter(x => x !== id) : [...p, id]
    );

  const submit = async () => {
  if (!days.length) return toast.error("Pilih hari kerja");

  if (periodType === "DATE" && (!startDate || !endDate))
    return toast.error("Pilih rentang tanggal");

  if (periodType === "MONTH" && (!startMonth || !endMonth))
    return toast.error("Pilih rentang bulan");

  const payload = {
  type: "WORK_SCHEDULE",
  name: "Work Schedule",
  status: "ACTIVE", // ⬅️ WAJIB
  description: "Jadwal kerja karyawan",

  startDate: periodType === "DATE" ? startDate : null,
  endDate: periodType === "DATE" ? endDate : null,

  config: {
    periodType,
    days,
    startTime,
    endTime,

    startMonth: periodType === "MONTH" ? startMonth : null,
    endMonth: periodType === "MONTH" ? endMonth : null,

    users: users.filter(u => selectedUserIds.includes(u.id)),
  },
};

  const res = await api.post("/admin/integrations", payload);

  onCreated(res.data);
  toast.success("Work schedule berhasil dibuat");
  onClose();
};

  return (
    <Modal title="Atur Work Schedule" onClose={onClose}>
      {/* Days */}
      <div className="flex flex-wrap gap-2">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <button
            key={d}
            onClick={() => toggleDay(d)}
            className={`px-3 py-1 rounded-lg text-sm
              ${days.includes(d)
                ? "bg-cyan-500/30 text-cyan-400"
                : "bg-white/5 text-slate-300"}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Time */}
      <div className="flex gap-3">
        <Input type="time" value={startTime} onChange={setStartTime} />
        <Input type="time" value={endTime} onChange={setEndTime} />
      </div>

      {/* Period Type */}
      <div className="flex gap-2">
        <PeriodButton
          active={periodType === "DATE"}
          onClick={() => setPeriodType("DATE")}
          label="Per Tanggal"
        />
        <PeriodButton
          active={periodType === "MONTH"}
          onClick={() => setPeriodType("MONTH")}
          label="Per Bulan"
        />
      </div>

      {/* Period Inputs */}
      {periodType === "DATE" ? (
        <div className="flex gap-2">
          <Input type="date" value={startDate} onChange={setStartDate} />
          <Input type="date" value={endDate} onChange={setEndDate} />
        </div>
      ) : (
        <div className="flex gap-2">
          <Input type="month" value={startMonth} onChange={setStartMonth} />
          <Input type="month" value={endMonth} onChange={setEndMonth} />
        </div>
      )}

      {/* Users */}
      <div className="space-y-2 max-h-40 overflow-auto">
        {users.map(u => (
          <label key={u.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedUserIds.includes(u.id)}
              onChange={() => toggleUser(u.id)}
            />
            {u.name}
          </label>
        ))}
      </div>

      <PrimaryButton onClick={submit} />
    </Modal>
  );
}
