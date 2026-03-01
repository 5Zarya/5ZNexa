import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiX,
  FiFileText,
  FiCreditCard,
} from "react-icons/fi";
import api from "../../services/api";

/* =======================
   TYPES
======================= */
type SalaryItem = {
  label: string;
  amount: number;
};

type BankAccount = {
  bankName: string;
  accountNumber: string;
};

type PayslipStatus = "DRAFT" | "APPROVED" | "PAID";

type Payslip = {
  id: string;
  period: string;
  payDate: string;
  baseSalary: number;
  allowances: SalaryItem[];
  deductions: SalaryItem[];
  taxes: SalaryItem[];
  netPay: number;
  status: PayslipStatus; // ⬅️ WAJIB
};

/* =======================
   UTILS
======================= */
const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const COLORS = ["#22d3ee", "#60a5fa", "#fbbf24", "#fb7185", "#a78bfa"];

/* =======================
   MAIN COMPONENT
======================= */
const UserPayroll: React.FC = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selected, setSelected] = useState<Payslip | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [bankModal, setBankModal] = useState(false);
  const [bank, setBank] = useState<BankAccount>({
    bankName: "",
    accountNumber: "",
  });

  const statusLabel = {
  DRAFT: "Draft (Belum Final)",
  APPROVED: "Disetujui",
  PAID: "Sudah Dibayar",
}

const statusColor = {
  DRAFT: "bg-slate-500",
  APPROVED: "bg-amber-500",
  PAID: "bg-emerald-500",
}

  /* =======================
     FETCH PAYROLL
  ======================= */
  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        setLoading(true);
        const res = await api.get("/user/payroll");

        const data: Payslip[] = res.data
          .sort(
            (a: any, b: any) =>
              new Date(b.payDate).getTime() -
              new Date(a.payDate).getTime()
          )
          .map((p: any) => ({
  id: p.id,
  period: p.period,
  payDate: p.payDate,
  baseSalary: Number(p.baseSalary ?? 0),
  allowances: p.allowances?.items ?? [],
  deductions: p.deductions?.items ?? [],
  taxes: p.taxes?.items ?? [],
  netPay: Number(p.netPay ?? 0),
  status: p.status, // ⬅️ ambil status
}));


        setPayslips(data);
        setSelected(data[0] ?? null);
      } catch (error) {
        console.error("Failed to load payroll", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayroll();
  }, []);

  /* =======================
     FETCH BANK ACCOUNT
  ======================= */
  useEffect(() => {
    api.get("/users/me").then((res) => {
      setBank({
        bankName: res.data.bankName || "",
        accountNumber: res.data.bankAccount || "",
      });
    });
  }, []);

  /* =======================
     DERIVED DATA
  ======================= */
  const filteredPayslips = useMemo(() => {
    if (!query) return payslips;
    return payslips.filter(
      (p) =>
        p.period.toLowerCase().includes(query.toLowerCase()) ||
        p.id.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, payslips]);

  const latestPayslip = payslips[0];

  const ytdNetPay = useMemo(
    () => payslips.slice(0, 6).reduce((sum, p) => sum + p.netPay, 0),
    [payslips]
  );

  /* =======================
     ACTIONS
  ======================= */
  const saveBank = async () => {
    await api.patch("/users/me/bank", {
      bankName: bank.bankName,
      bankAccount: bank.accountNumber,
    });
    setBankModal(false);
  };

  const downloadPdf = (payslip: Payslip) => {
  if (payslip.status === "DRAFT") {
    alert("Payroll masih draft dan belum bisa di-download");
    return;
  }

  window.open(`/user/payroll/${payslip.id}/pdf`, "_blank");
};

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Payroll</h1>
            <p className="text-sm text-slate-400">
              Payslip & salary information
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2">
            <FiSearch className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search period / ID"
              className="bg-transparent outline-none text-sm text-white"
            />
          </div>
        </div>

        {/* KPI */}
        <div className="grid md:grid-cols-3 gap-4">
          <Kpi
            title="Last Net Pay"
            value={latestPayslip ? formatCurrency(latestPayslip.netPay) : "-"}
          />
          <Kpi title="YTD (6 months)" value={formatCurrency(ytdNetPay)} />
          <Kpi
            title="Bank Account"
            value={bank.bankName || "-"}
            sub={bank.accountNumber || "Not set"}
            action={() => setBankModal(true)}
          />
        </div>

        {/* CONTENT */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* PAYSLIP LIST */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            {loading && (
              <div className="p-10 text-center text-slate-400">
                Loading payroll...
              </div>
            )}

            {!loading && filteredPayslips.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                No payroll found
              </div>
            )}

            {filteredPayslips.map((p) => (
              <motion.button
                key={p.id}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                onClick={() => setSelected(p)}
                className={`w-full px-5 py-4 flex justify-between items-center border-b border-white/5 ${
                  selected?.id === p.id ? "bg-white/5" : ""
                }`}
              >
                <div className="text-left">
                  <div className="font-medium">{p.period}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
  {p.payDate}
  <span
    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
      p.status === "DRAFT"
        ? "bg-slate-600"
        : p.status === "APPROVED"
        ? "bg-amber-500"
        : "bg-emerald-500"
    }`}
  >
    {statusLabel[p.status]}
  </span>
</div>
                </div>
                <div className="font-semibold text-emerald-400">
                  {formatCurrency(p.netPay)}
                </div>
              </motion.button>
            ))}
          </div>
          {selected?.status === "DRAFT" && (
  <div className="mb-4 rounded-lg bg-slate-800/60 border border-slate-600 p-3 text-sm text-slate-300">
    Payroll ini masih <b>DRAFT</b>.  
    Nominal dapat berubah sebelum disetujui admin.
  </div>
)}
          {/* DETAIL */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
            {!selected ? (
              <EmptyState />
            ) : (
              <PayslipDetail
                payslip={selected}
                onDownload={downloadPdf}
              />
            )}
          </div>
        </div>
      </div>

      {/* BANK MODAL */}
      <BankModal
        open={bankModal}
        bank={bank}
        setBank={setBank}
        onClose={() => setBankModal(false)}
        onSave={saveBank}
      />
    </div>
  );
};

/* =======================
   SUB COMPONENTS
======================= */
const Kpi = ({
  title,
  value,
  sub,
  action,
}: {
  title: string;
  value: string;
  sub?: string;
  action?: () => void;
}) => (
  <motion.div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">
    <div className="text-xs uppercase text-slate-400">{title}</div>
    <div className="text-2xl font-bold">{value}</div>
    {sub && <div className="text-xs text-slate-400">{sub}</div>}
    {action && (
      <button onClick={action} className="mt-2 text-xs underline">
        Edit
      </button>
    )}
  </motion.div>
);

const PayslipDetail = ({
  payslip,
  onDownload,
}: {
  payslip: Payslip;
  onDownload: (payslip: Payslip) => void; // ⬅️ GANTI INI
}) => {
  const chartData = [
    { name: "Base Salary", value: payslip.baseSalary },
    ...payslip.allowances.map((a) => ({ name: a.label, value: a.amount })),
    ...payslip.deductions.map((d) => ({ name: d.label, value: d.amount })),
    ...payslip.taxes.map((t) => ({ name: t.label, value: t.amount })),
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="text-lg font-semibold">{payslip.period}</h3>
      <p className="text-xs text-slate-400 mb-4">
        Pay date: {payslip.payDate}
      </p>

      <div className="h-48">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={chartData} dataKey="value" innerRadius={45} outerRadius={80}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 pt-4 border-t border-white/10 flex justify-between text-lg font-semibold">
        <span>Net Pay</span>
        <span className="text-emerald-400">
          {formatCurrency(payslip.netPay)}
        </span>
      </div>

      <button
  disabled={payslip.status === "DRAFT"}
  onClick={() => onDownload(payslip)}
  className={`mt-5 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium
    ${
      payslip.status === "DRAFT"
        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
        : "bg-gradient-to-r from-cyan-400 to-blue-500 text-black"
    }
  `}
>
  <FiFileText />
  {payslip.status === "DRAFT" ? "Payslip Belum Final" : "Download Payslip"}
</button>
    </motion.div>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
    <FiFileText className="w-10 h-10" />
    <p className="text-sm">Select a payslip</p>
  </div>
);

const BankModal = ({
  open,
  bank,
  setBank,
  onClose,
  onSave,
}: any) => (
  <AnimatePresence>
    {open && (
      <motion.div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <motion.div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FiCreditCard /> Bank Account
            </h3>
            <button onClick={onClose}>
              <FiX />
            </button>
          </div>

          <input
            value={bank.bankName}
            onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
            placeholder="Bank name"
            className="w-full mb-3 p-2 rounded-lg bg-slate-800"
          />

          <input
            value={bank.accountNumber}
            onChange={(e) =>
              setBank({ ...bank, accountNumber: e.target.value })
            }
            placeholder="Account number"
            className="w-full mb-5 p-2 rounded-lg bg-slate-800"
          />

          <button
            onClick={onSave}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-medium"
          >
            Save
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default UserPayroll;
