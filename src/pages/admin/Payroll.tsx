import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { ChangeEvent } from "react";
import {
  FiUpload,
  FiDownload,
  FiPlus,
  FiSearch,
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiCheckCircle,
  FiTrash2,
  FiEdit2
} from "react-icons/fi";
import api from "../../services/api"; 
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";

type User = {
  id: string;
  name: string;
  jobTitle?: string;
  department?: string;
};
type PayrollFormData = {
  id?: string
  userId: string
  baseSalary: number
  taxRate: number 
  deductions: number
  notes?: string
}
type AllowancePreview = {
  id: string
  title: string
  amount: number
}

type PayrollStatus = "DRAFT" | "APPROVED" | "PAID"

type PayrollRecord = {
  id: string
  user: User
  baseSalary: number
  deductions: number
  netPay: number

  taxAmount: number     // ✅ GANTI
  taxRate: number       // ✅ ADA DI DB
  allowanceTotal: number

  payPeriodStart: string
  payPeriodEnd: string
  notes?: string
  status: PayrollStatus
}

type FormData = Partial<PayrollRecord> & { user?: User };
type DeptChartItem = { department: string; total: number };
const EmptyState = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <div className="py-10 text-center text-slate-400">
    <div className="font-semibold text-white">{title}</div>
    {subtitle && <div className="text-sm mt-1">{subtitle}</div>}
  </div>
);

const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({
  color,
  children,
}) => (
  <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
    {children}
  </span>
);

/* ================= COMPONENT ================= */

const Payroll: React.FC = () => {
  /* ================= STATE ================= */

  const [user, setUser] = useState<User[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [filtered, setFiltered] = useState<PayrollRecord[]>([]);
  const [pageItems, setPageItems] = useState<PayrollRecord[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deptChart, setDeptChart] = useState<DeptChartItem[]>([]);

  const [query, setQuery] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] =
  useState<PayrollStatus | "All">("All")


  const statusLabel: Record<PayrollStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  PAID: "Paid",
}
const statusColor: Record<PayrollStatus, string> = {
  DRAFT: "bg-slate-500",
  APPROVED: "bg-blue-600",
  PAID: "bg-emerald-600",
}

  const [sortKey, setSortKey] =
    useState<"payPeriodStart" | "netPay">("payPeriodStart");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [pages, setPages] = useState(1);
  
const loadPayrolls = async () => {
  try {
    const res = await api.get("/admin/payrolls")

    const mapped: PayrollRecord[] = res.data.map((p: any) => {
      const deductionItems =
        p.deductions?.items && Array.isArray(p.deductions.items)
          ? p.deductions.items
          : []

      const taxItems =
        p.taxes?.items && Array.isArray(p.taxes.items)
          ? p.taxes.items
          : []

      const allowanceTotal =
        typeof p.allowances?.total === "number"
          ? p.allowances.total
          : 0

      const deductions = deductionItems.reduce(
        (s: number, i: any) => s + Number(i.amount || 0),
        0,
      )

      const taxAmount =
  typeof p.taxAmount === "number"
    ? p.taxAmount
    : taxItems.reduce(
        (s: number, i: any) => s + Number(i.amount || 0),
        0,
      )
      const netPay = Number(p.netPay)
return {
  id: p.id,
  user: {
    id: p.user.id,
    name: p.user.name,
    department: p.user.department ?? "Other",
  },
  baseSalary: Number(p.baseSalary),
  deductions,
  allowanceTotal,
  taxAmount,           // ✅
  taxRate: Number(p.taxRate ?? 0), // ✅
  netPay: Number(p.netPay),        // ✅ DARI BACKEND
  status: p.status as PayrollStatus,
  payPeriodStart: p.payDate,
  payPeriodEnd: p.payDate,
  notes: p.notes ?? "",
}
    })

    setPayrolls(mapped)
  } catch (err) {
    console.error("Load payrolls failed:", err)
  }
}

  useEffect(() => {
  loadPayrolls()
}, [])
      
  /* ================= FILTER + SORT + PAGINATION ================= */
  useEffect(() => {
  const loadUsers = async () => {
  try {
    const res = await api.get("/admin/users");

    const usersData =
      Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.users || [];

    setUser(usersData);
  } catch (err) {
    console.error("Failed to load users", err);
  }
};


  loadUsers();
}, []);


  useEffect(() => {
    let data = [...payrolls];

    if (query) {
      const q = query.toLowerCase();
      data = data.filter(
        (p) =>
          p.user.name.toLowerCase().includes(q) ||
          p.user.department?.toLowerCase().includes(q) ||
          p.user.id.toLowerCase().includes(q)
      );
    }

    if (filterDept !== "All") {
      data = data.filter((p) => p.user.department === filterDept);
    }

    if (filterStatus !== "All") {
      data = data.filter((p) => p.status === filterStatus);
    }

    data.sort((a, b) => {
      if (sortKey === "netPay") {
        return sortDir === "asc"
          ? a.netPay - b.netPay
          : b.netPay - a.netPay;
      }

      return sortDir === "asc"
        ? new Date(a.payPeriodStart).getTime() -
            new Date(b.payPeriodStart).getTime()
        : new Date(b.payPeriodStart).getTime() -
            new Date(a.payPeriodStart).getTime();
    });

    setFiltered(data);
    setPages(Math.ceil(data.length / pageSize));

    const start = (page - 1) * pageSize;
    setPageItems(data.slice(start, start + pageSize));
  }, [
    payrolls,
    query,
    filterDept,
    filterStatus,
    sortKey,
    sortDir,
    page,
  ]);

  /* ================= CHART ================= */

  useEffect(() => {
    const map = new Map<string, number>();

    payrolls.forEach((p) => {
      const dept = p.user.department || "Other";
      map.set(dept, (map.get(dept) || 0) + p.netPay);
    });

    setDeptChart(
      Array.from(map.entries()).map(([department, total]) => ({
        department,
        total,
      }))
    );
  }, [payrolls]);

  /* ================= HELPERS ================= */

  const currency = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);

  const toggleSelect = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const selectAllOnPage = (checked: boolean) => {
    const updates: Record<string, boolean> = {};
    pageItems.forEach((p) => (updates[p.id] = checked));
    setSelected(updates);
  };
    /* ================= EXTRA STATE (WAJIB) ================= */

  const [uploading, setUploading] = useState(false);
  const [modalRecord, setModalRecord] = useState<PayrollRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<PayrollFormData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [previewAllowances, setPreviewAllowances] = useState<AllowancePreview[]>([])
  const departments = Array.from(
    new Set(payrolls.map((p) => p.user.department))
  );

  /* ================= ACTION HANDLERS ================= */

  const loadAllowancePreview = async (userId: string) => {
  const res = await api.get(`/admin/benefits/user/${userId}`)
  setPreviewAllowances(
    res.data
      .filter((b: any) => b.type === "ALLOWANCE" && b.status === "APPROVED")
      .map((b: any) => ({
        id: b.id,
        title: b.title,
        amount: b.allowanceAmount,
      })),
  ) 
}

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    console.log("CSV uploaded:", file.name);
    setTimeout(() => setUploading(false), 1000);
  };

  const exportCSV = (rows: PayrollRecord[]) => {
    console.log("Export payroll CSV:", rows);
  };

  const bulkUpdateStatus = async (status: PayrollStatus) => {
  const ids = Object.keys(selected).filter((id) => selected[id])
  if (!ids.length) return

  await Promise.all(
    ids.map((id) =>
      api.patch(`/admin/payroll/${id}/status`, { status }),
    )
  )

  setSelected({})
  await loadPayrolls()
}


  const bulkMarkPaid = () => {
    console.log("Bulk mark paid:", selected);
  };

  const deleteSelected = () => {
    console.log("Delete selected:", selected);
    setSelected({});
  };
const updateStatus = async (id: string, status: PayrollStatus) => {
  await api.patch(`/admin/payrolls/${id}/status`, { status })
  await loadPayrolls()
}

  const deleteOne = async (id: string) => {
  const ok = confirm("Yakin ingin menghapus payroll ini?");
  if (!ok) return;

  try {
    await api.delete(`/admin/payroll/${id}`);
    await loadPayrolls();
  } catch (err) {
    console.error("Failed to delete payroll", err);
    alert("Gagal menghapus payroll");
  }
};

  const runPayrollForAll = () => {
    setIsRunning(true);
    console.log("Running payroll...");
    setTimeout(() => setIsRunning(false), 1500);
  };

  const openEdit = (p: PayrollRecord) => {
  setFormData({
    userId: p.user.id,
    baseSalary: p.baseSalary,
    taxRate: p.taxRate, // ✅
    deductions: p.deductions,
    notes: p.notes ?? "",
  })
  setFormOpen(true)
};
  const saveForm = async (data: PayrollFormData) => {
  if (!data.userId) {
    alert("User wajib dipilih");
    return;
  }

  const payload = {
  userId: data.userId,
  taxes: data.taxRate
  ? [
      {
        name: "Company Tax",
        rate: Number(data.taxRate),
      },
    ]
  : [],
  period: new Date().toISOString().slice(0, 7),
  baseSalary: Number(data.baseSalary),

  deductions: data.deductions
    ? [{ label: "Manual Deduction", amount: data.deductions }]
    : [],

  payDate: new Date().toISOString(),
}
  console.log("PAYLOAD SENT:", payload); // 🔍 DEBUG

  await api.post("/admin/payrolls", payload);

  await loadPayrolls();
  setFormOpen(false);
  setFormData(null);
};

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 bg-gradient-to-br from-slate-900/60 to-slate-800/30 border border-slate-700/40 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Payroll — Run & Manage</h2>
            <p className="text-slate-400 mt-1">Kelola penggajian, slip, approvals, dan export. Tampilan futuristik & audit-ready.</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-300 mr-2">Upload CSV (bulk)</label>
            <label className="relative inline-flex items-center px-3 py-2 bg-slate-800/50 rounded-lg border border-white/6 cursor-pointer hover:brightness-105">
              <FiUpload />
              <input accept=".csv" onChange={handleUpload} disabled={uploading} type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>

            <button onClick={() => exportCSV(Object.values(selected).some(Boolean) ? payrolls.filter((p) => selected[p.id]) : payrolls)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-semibold flex items-center gap-2">
              <FiDownload /> Export CSV
            </button>

            <button onClick={() => { setFormOpen(true); setFormData(null); }} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:brightness-105 flex items-center gap-2">
              <FiPlus /> New
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="col-span-2 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900/40 rounded px-2 py-1">
                <FiSearch className="text-slate-400" />
                <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search user, id, department..."
                className="bg-transparent outline-none text-slate-200 text-sm w-36"
                />
                {query && (
                <button
                    onClick={() => setQuery("")}
                    className="text-slate-400 hover:text-red-400 transition"
                    aria-label="Clear search"
                >
                    <FiX className="text-lg" />
                </button>
                )}
            </div>
            <div className="flex items-center gap-2">
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value as any)} className="bg-slate-900/40 text-slate-200 px-3 py-1 rounded border border-white/6 text-sm">
                <option value="All">All departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="bg-slate-900/40 text-slate-200 px-3 py-1 rounded border border-white/6 text-sm">
                <option value="All">All status</option>
                <option value="Draft">Draft</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>

              </select>

              <div className="flex items-center gap-1">
                <button onClick={() => { setSortKey("payPeriodStart"); setSortDir((d) => (d === "asc" ? "desc" : "asc")); }} className="px-2 py-1 rounded bg-slate-800/40 text-slate-200 text-sm flex items-center gap-2">
                  Date {sortKey === "payPeriodStart" ? (sortDir === "asc" ? <FiArrowUp /> : <FiArrowDown />) : null}
                </button>
                <button onClick={() => { setSortKey("netPay"); setSortDir((d) => (d === "asc" ? "desc" : "asc")); }} className="px-2 py-1 rounded bg-slate-800/40 text-slate-200 text-sm flex items-center gap-2">
                  Net {sortKey === "netPay" ? (sortDir === "asc" ? <FiArrowUp /> : <FiArrowDown />) : null}
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-2 flex items-center justify-end gap-2">
            <button onClick={() => selectAllOnPage(true)} className="px-3 py-1 rounded bg-slate-800/40 text-slate-200 text-sm">Select page</button>
            <button onClick={() => selectAllOnPage(false)} className="px-3 py-1 rounded bg-slate-800/30 text-slate-200 text-sm">Clear page</button>

            <button onClick={() => bulkUpdateStatus("APPROVED")}><FiCheckCircle /> Approve</button>
            <button onClick={bulkMarkPaid} className="px-3 py-1 rounded bg-cyan-600 text-white text-sm flex items-center gap-2"><FiCheckCircle/> Mark Paid</button>
            <button onClick={deleteSelected} className="px-3 py-1 rounded bg-rose-600 text-white text-sm flex items-center gap-2"><FiTrash2/> Delete</button>
            <button onClick={runPayrollForAll} className="px-3 py-1 rounded bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-sm flex items-center gap-2">
              {isRunning ? "Running..." : (<><FiPlayIcon/> Run</>)}
            </button>
          </div>
        </div>

        {/* Overview + chart */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-4 rounded-lg bg-slate-900/40 border border-white/6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-slate-400">Payroll records</div>
                <div className="text-xl font-semibold text-white">{filtered.length} total</div>
              </div>
              <div className="text-sm text-slate-400">Period: <strong className="text-white">{new Date().toLocaleString()}</strong></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-white/6">
                    <th className="py-2 px-2"><input type="checkbox" onChange={(e) => selectAllOnPage(e.target.checked)} /></th>
                    <th className="py-2 px-2">User</th>
                    <th className="py-2 px-2">Department</th>
                    <th className="py-2 px-2">Allowance</th>
                    <th className="py-2 px-2">Net</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={7}><EmptyState title="No payroll records found" subtitle="Adjust filters or create new payroll." /></td>
                    </tr>
                  )}

                  {pageItems.map((p) => (
                    <tr key={p.id} className="hover:bg-white/2 border-b border-white/6">
  <td className="py-3 px-2">
    <input
      checked={!!selected[p.id]}
      onChange={() => toggleSelect(p.id)}
      type="checkbox"
    />
  </td>

  <td className="py-3 px-2">
    <div className="font-medium text-white">{p.user.name}</div>
    <div className="text-xs text-slate-400">{p.user.id}</div>
  </td>

  <td className="py-3 px-2 text-slate-300">
    {p.user.department}
  </td>

  <td className="py-3 px-2 font-semibold">
    {currency(p.allowanceTotal)}
  </td>

  <td className="py-3 px-2 font-extrabold">
    {currency(p.netPay)}
  </td>

  {/* ✅ FIX DI SINI */}
  <td className="py-3 px-2">
    <Badge color={statusColor[p.status]}>
      {statusLabel[p.status]}
    </Badge>
  </td>

  <td className="py-3 px-2">
    <div className="flex items-center gap-2">
      <button
        onClick={() => setModalRecord(p)}
        className="px-2 py-1 rounded bg-slate-800/30 text-slate-200 text-sm"
      >
        Preview
      </button>

      <button
        onClick={() => openEdit(p)}
        className="px-2 py-1 rounded bg-slate-800/30 text-slate-200 text-sm"
      >
        <FiEdit2 />
      </button>

      {p.status === "DRAFT" && (
  <button onClick={() => updateStatus(p.id, "APPROVED")}
  className="px-2 py-1 rounded bg-amber-600 text-black text-sm"
  >
  Approve</button>
)}

{p.status === "APPROVED" && (
  <button onClick={() => updateStatus(p.id, "PAID")}
  className="px-2 py-1 rounded bg-green-600 text-black text-sm"
  >
  Pay</button>
)}
      <button
        onClick={() => deleteOne(p.id)}
        className="px-2 py-1 rounded bg-rose-600 text-white text-sm"
      >
        <FiTrash2 />
      </button>
    </div>
  </td>
</tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-slate-400">Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-{Math.min(filtered.length, page * pageSize)} of {filtered.length}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded bg-slate-800/30">Prev</button>
                <div className="px-3 py-1 rounded bg-slate-800/20">{page} / {pages}</div>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} className="px-3 py-1 rounded bg-slate-800/30">Next</button>
              </div>
            </div>
          </div>

          {/* Right column: summary + chart */}
          <div className="p-4 rounded-lg bg-slate-900/40 border border-white/6">
            <div className="text-sm text-slate-400">Payroll Summary (by department)</div>
            <div style={{ height: 220 }} className="mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.06} />
                  <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(v: any) => currency(v)} />
                  <Bar dataKey="total" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-400">Totals</div>
              <div className="mt-2 text-white font-semibold">{currency(payrolls.reduce((s, p) => s + p.netPay, 0))} net</div>
              <div className="text-sm text-slate-400 mt-2">Pay cycle: Monthly</div>
            </div>
          </div>
        </div>

        {/* Modal: preview payslip */}
        {modalRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setModalRecord(null)} />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 w-11/12 md:w-3/4 lg:w-2/3 p-6 rounded-xl bg-slate-900/95 border border-white/6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-slate-200 font-bold">Payslip — {modalRecord.user.name}</div>
                  <div className="text-xs text-slate-400">{new Date(modalRecord.payPeriodStart).toLocaleDateString()} - {new Date(modalRecord.payPeriodEnd).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(modalRecord)); alert("Copied"); }} className="px-3 py-1 rounded bg-slate-800/30">Copy JSON</button>
                  <button onClick={() => setModalRecord(null)} className="px-3 py-1 rounded bg-slate-800/30">Close</button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded bg-slate-800/30">
                  <div className="text-xs text-slate-400">User</div>
                  <div className="text-white font-semibold">{modalRecord.user.name}</div>
                  <div className="text-xs text-slate-400 mt-2">ID: {modalRecord.user.id}</div>
                  <div className="text-xs text-slate-400">Department: {modalRecord.user.department}</div>
                </div>

                <div className="p-3 rounded bg-slate-800/30">
                  <div className="text-xs text-slate-400">Payment</div>
                  <div className="text-white font-semibold">{currency(modalRecord.netPay)}</div>
                  <div className="text-xs text-slate-400 mt-2">Status: <strong className="ml-1">{modalRecord.status}</strong></div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded bg-slate-800/20">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400">Base Salary</div>
                    <div className="text-white font-semibold">{currency(modalRecord.baseSalary)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Deductions</div>
                    <div className="text-white font-semibold">-{currency(modalRecord.deductions)}</div>
                  </div>
                  <div>
  <div className="text-xs text-slate-400">Allowance</div>
  <div className="text-white font-semibold">
    {currency(modalRecord.allowanceTotal)}
  </div>
</div>

<div>
  <div>
  <div className="text-xs text-slate-400">
    Tax ({modalRecord.taxRate}%)
  </div>
  <div className="text-white font-semibold">
    -{currency(modalRecord.taxAmount)}
  </div>
</div>
</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-slate-400">Notes</div>
                <div className="text-sm text-slate-200">{modalRecord.notes || "—"}</div>
                <div />
                <div className="flex items-center gap-2">
                  <button onClick={() => { /* download as simple payslip text */ const txt = JSON.stringify(modalRecord, null, 2); const blob = new Blob([txt], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `payslip-${modalRecord.id}.json`; a.click(); URL.revokeObjectURL(url); }} className="px-3 py-1 rounded bg-slate-800/40 text-sm">Download JSON</button>
                  <button onClick={() => { updateStatus(modalRecord.id, "APPROVED"); }} className="px-3 py-1 rounded bg-amber-500 text-black text-sm">Approve</button>
                  <button onClick={() => { updateStatus(modalRecord.id, "PAID"); }} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm">Pay</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: quick form create/edit */}
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setFormOpen(false)} />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 w-full max-w-2xl p-6 rounded-xl bg-slate-900/95 border border-white/6">
              <h3 className="text-lg font-semibold text-white mb-3">{formData?.id ? "Edit Payroll" : "Create Payroll (Quick)"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">User</label>
                  <select
  value={formData?.userId ?? ""}
  onChange={(e) => {
    const userId = e.target.value
    if (!userId) return

    loadAllowancePreview(userId) // 👈 DI SINI
    setFormData({
      userId,
      baseSalary: 0,
      deductions: 0,
      taxRate: 0,
      notes: "",
    })
  }}
  className="w-full px-3 py-2 rounded bg-slate-800/40 text-slate-200"
>

  <option value="">-- Select User --</option>
  {user.map((u) => (
    <option key={u.id} value={u.id}>
      {u.name}{u.department ? ` — ${u.department}` : ""}
    </option>
  ))}
</select>

                </div>
                <div>
                  <label className="text-xs text-slate-400">Base Salary</label>
                  <input type="number" value={formData?.baseSalary ?? ""} onChange={(e) => {
                      if (!formData) return;
                      setFormData({ ...formData, baseSalary: Number(e.target.value) });
                    }}
                    className="w-full px-3 py-2 rounded bg-slate-800/40 text-slate-200"
                  />
                </div>
                <div>
  <label className="text-xs text-slate-400">Tax (%)</label>
  <input
    type="number"
    min={0}
    max={100}
    value={formData?.taxRate ?? 0}
    onChange={(e) => {
      if (!formData) return
      setFormData({
        ...formData,
        taxRate: Number(e.target.value),
      })
    }}
    className="w-full px-3 py-2 rounded bg-slate-800/40 text-slate-200"
  />
</div>
                <div className="md:col-span-2">
  <label className="text-xs text-slate-400">Allowances (from benefits)</label>

  <div className="mt-2 rounded bg-slate-800/40 p-3 text-sm">
    {previewAllowances.length === 0 ? (
      <div className="text-slate-400 italic">
        Tidak ada allowance aktif
      </div>
    ) : (
      previewAllowances.map((a) => (
  <div
    key={a.id}              // ✅ PALING BENAR
    className="flex justify-between text-slate-200"
  >
    <span>{a.title}</span>
    <span>{currency(a.amount)}</span>
  </div>
))
    )}
  </div>
</div>

                <div>
                  <label className="text-xs text-slate-400">Deductions</label>
                  <input type="number" value={formData?.deductions ?? ""} onChange={(e) => {
                      if (!formData) return;
                      setFormData({ ...formData, deductions: Number(e.target.value) });
                    }} className="w-full px-3 py-2 rounded bg-slate-800/40 text-slate-200" />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400">Notes</label>
                  <input
  value={formData?.notes ?? ""}
  onChange={(e) => {
    if (!formData) return;
    setFormData({
      ...formData,
      notes: e.target.value, // ✅ STRING
    });
  }}
  className="w-full px-3 py-2 rounded bg-slate-800/40 text-slate-200"
/>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => { setFormOpen(false); setFormData(null); }} className="px-3 py-1 rounded bg-slate-800/30">Cancel</button>
                <button
  onClick={() => {
    if (!formData) return;
    saveForm(formData);
  }}
  className="px-4 py-1 rounded bg-gradient-to-r from-cyan-500 to-indigo-600 text-white"
>
  {formData?.id ? "Save" : "Create"}
</button>
              </div>
            </motion.div>
          </div>
        )}

      </motion.div>
    </div>
  );
};

export default Payroll;

// small helper icon to avoid import overhead for FiPlay inlined
function FiPlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block">
      <path d="M5 3v18l15-9L5 3z" fill="currentColor"></path>
    </svg>
  );
}
