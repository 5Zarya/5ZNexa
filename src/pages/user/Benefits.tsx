import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiGift,
  FiCalendar,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { io, Socket } from "socket.io-client";
import api from "../../services/api";
import toast from "react-hot-toast";

/* ================= TYPES ================= */
type BenefitType =
  | "LEAVE"
  | "BONUS"
  | "ALLOWANCE"
  | "CUSTOM";
type BenefitStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Benefit {
  id: string;
  title: string;
  type: BenefitType;
  status: BenefitStatus;
  description?: string | null;

  // LEAVE
  leaveTotal?: number | null;
  leaveUsed?: number | null;

  // ALLOWANCE
  allowanceAmount?: number | null;

  total?: number | null;

  createdAt: string;
}

/* ================= HELPERS ================= */
const rupiah = (v?: number | null) =>
  v
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(v)
    : "-";

const dateFmt = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const iconByType = (type: BenefitType) => {
  switch (type) {
    case "LEAVE":
      return <FiCalendar className="text-cyan-400" />;
    case "BONUS":
    case "ALLOWANCE":
      return <FiDollarSign className="text-green-400" />;
    case "CUSTOM":
      return <FiClock className="text-purple-400" />;
    default:
      return <FiCheckCircle />;
  }
};

/* ================= COMPONENT ================= */
export default function UserBenefits() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const requestLeave = async (
  benefitId: string,
  startDate: string,
  endDate: string
) => {
  const days =
    Math.ceil(
      (new Date(endDate).getTime() -
        new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  try {
    await api.post("/user/benefits/leave-requests", {
      benefitId,
      startDate,
      endDate,
      days,
    });

    toast.success("Pengajuan cuti dikirim ke admin 📨");
  } catch (e: any) {
    toast.error(
      e?.response?.data?.message ??
        "Gagal mengajukan cuti"
    );
  }
};

  /* ================= FETCH ================= */
  useEffect(() => {
    api
      .get<Benefit[]>("/user/benefits")
      .then(r => setBenefits(r.data))
      .catch(() => toast.error("Gagal memuat benefit"))
      .finally(() => setLoading(false));
  }, []);

  /* ================= SOCKET ================= */
  useEffect(() => {
  socketRef.current = io(import.meta.env.VITE_API_URL, {
    transports: ["websocket"],
    withCredentials: true,
  });

  socketRef.current.on("benefit:new", b => {
    setBenefits(prev => [b, ...prev]);
  });

  socketRef.current.on("benefit:update", b => {
    setBenefits(prev => [b, ...prev.filter(x => x.id !== b.id)]);

    if (b.status === "APPROVED")
      toast.success(`Benefit "${b.title}" disetujui 🎉`);
    if (b.status === "REJECTED")
      toast.error(`Benefit "${b.title}" ditolak ❌`);
  });

  socketRef.current.on("benefit:remove", (id: string) => {
    setBenefits(prev => prev.filter(b => b.id !== id));
  });

  return () => {
    socketRef.current?.disconnect(); // ✅ void cleanup
  };
}, []);

  const pending = benefits.filter(b => b.status === "PENDING");
  const active = benefits.filter(b => b.status === "APPROVED");

  /* ================= ANALYTICS ================= */
  const stats = useMemo(() => {
    return {
      activeCount: active.length,
      totalValue: active.reduce(
  (a, b) => a + (b.allowanceAmount ?? b.total ?? 0),
  0
),

leaveRemaining: active
  .filter(b => b.type === "LEAVE")
  .reduce(
    (a, b) =>
      a + ((b.leaveTotal ?? 0) - (b.leaveUsed ?? 0)),
    0
  ),
    };
  }, [active]);

  /* ================= EMPTY ================= */
  if (!loading && benefits.length === 0) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-cyan-200">
        <FiGift className="text-6xl mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">
          Belum ada benefit
        </h2>
        <p className="text-sm opacity-70">
          Semua benefit Anda akan muncul di sini
        </p>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="p-6 text-cyan-100 space-y-10">
      <h1 className="text-3xl font-semibold flex items-center gap-3">
        <FiGift className="text-cyan-400" /> My Benefits
      </h1>

      {/* ================= SUMMARY ================= */}
      <div className="grid md:grid-cols-3 gap-4">
        <Summary label="Benefit Aktif" value={stats.activeCount} />
        <Summary label="Total Benefit" value={rupiah(stats.totalValue)} />
        <Summary label="Sisa Cuti" value={`${stats.leaveRemaining} hari`} />
      </div>

      {/* ================= LOADING ================= */}
      {loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-white/5 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* ================= PENDING ================= */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SectionTitle title="Menunggu Persetujuan" color="yellow" />
            <div className="grid md:grid-cols-2 gap-4">
              {pending.map(b => (
                <BenefitCard key={b.id} benefit={b} />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ================= ACTIVE ================= */}
      <AnimatePresence>
        {active.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SectionTitle title="Benefit Aktif" color="green" />
            <div className="grid md:grid-cols-2 gap-4">
              {active.map(b => (
  <BenefitCard
    key={b.id}
    benefit={b}
    active
    onRequestLeave={requestLeave}
  />
))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================= SUMMARY ================= */
function Summary({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-xl">
      <p className="text-xs opacity-60 mb-1">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

/* ================= SECTION TITLE ================= */
const SectionTitle = ({
  title,
  color,
}: {
  title: string;
  color: "green" | "yellow";
}) => (
  <h2
    className={`text-sm uppercase tracking-widest mb-3 text-${color}-400`}
  >
    {title}
  </h2>
);

/* ================= CARD ================= */
function BenefitCard({
  benefit,
  active,
  onRequestLeave,
}: {
  benefit: Benefit;
  active?: boolean;
  onRequestLeave?: (
  benefitId: string,
  startDate: string,
  endDate: string
) => void;
}) {
  const remaining =
  benefit.type === "LEAVE" && benefit.leaveTotal != null
    ? benefit.leaveTotal - (benefit.leaveUsed ?? 0)
    : null;

function LeaveUsage({
  benefit,
  remaining,
  active,
  onRequestLeave,
}: {
  benefit: Benefit;
  remaining: number;
  active?: boolean;
  onRequestLeave?: (
    id: string,
    startDate: string,
    endDate: string
  ) => void;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!onRequestLeave || !startDate || !endDate) return;

    setLoading(true);
    await onRequestLeave(benefit.id, startDate, endDate);
    setLoading(false);

    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="text-sm text-cyan-300">
        Sisa {remaining} / {benefit.leaveTotal} hari
      </div>

      {active && (
        <>
          <div className="flex gap-3 p-3 rounded-xl
  bg-gradient-to-br from-cyan-500/10 to-sky-500/5
  border border-cyan-400/20
  backdrop-blur-xl
">
  <div className="flex flex-col gap-1">
    <label className="text-xs text-cyan-300/80">
      Mulai
    </label>
    <input
      type="date"
      value={startDate}
      onChange={e => setStartDate(e.target.value)}
      className="
        bg-cyan-500/10
        text-cyan-100
        border border-cyan-400/20
        rounded-lg
        px-3 py-2
        text-sm
        focus:outline-none
        focus:ring-2
        focus:ring-cyan-400/40
        focus:border-cyan-400
        transition
      "
    />
  </div>

  <div className="flex flex-col gap-1">
    <label className="text-xs text-cyan-300/80">
      Selesai
    </label>
    <input
      type="date"
      value={endDate}
      onChange={e => setEndDate(e.target.value)}
      className="
        bg-cyan-500/10
        text-cyan-100
        border border-cyan-400/20
        rounded-lg
        px-3 py-2
        text-sm
        focus:outline-none
        focus:ring-2
        focus:ring-cyan-400/40
        focus:border-cyan-400
        transition
      "
    />
  </div>
</div>
          <button
            disabled={!startDate || !endDate || loading}
            onClick={submit}
            className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
          >
            {loading ? "Mengirim..." : "Ajukan Cuti"}
          </button>
        </>
      )}
    </div>
  );
}

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      className={`rounded-2xl p-5 border backdrop-blur-xl transition
        ${
          active
            ? "bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-400/20"
            : "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-400/20"
        }
      `}
    >
      <div className="flex justify-between mb-3">
        <h3 className="flex items-center gap-2 font-semibold text-lg">
          {iconByType(benefit.type)}
          {benefit.title}
        </h3>
        <span className="text-xs opacity-60">
          {dateFmt(benefit.createdAt)}
        </span>
      </div>

      {benefit.description && (
        <p className="text-xs opacity-70 mb-3">
          {benefit.description}
        </p>
      )}

      {(benefit.type === "BONUS" || benefit.type === "ALLOWANCE") && (
        <p className="text-2xl font-bold text-green-400">
          {rupiah(benefit.allowanceAmount)}
        </p>
      )}

      {benefit.type === "LEAVE" && remaining != null && (
  <LeaveUsage
    benefit={benefit}
    remaining={remaining}
    active={active}
    onRequestLeave={onRequestLeave}
  />
)}

    </motion.div>
  );
}
