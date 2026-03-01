// src/pages/admin/AdminAttendance.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Fingerprint,
  Wifi,
  Download,
  Trash2,
  Info,
  Clock,
  MapPin,
  ToggleLeft,
  ToggleRight,
  Camera,
  User,
  Zap,
} from "lucide-react";
import api from "../../services/api";
import type { AxiosResponse } from "axios";

export type DailyAttendance = {
  date: string
  user: {
    id: string
    name: string
    jobTitle?: string | null
  }
  checkIn: string | null
  checkOut: string | null
  workDuration?: number
  status?: "Hadir" | "Telat" | "Alpha"
  logs: AttendanceLog[]
}

export type AttendanceLog = {
  id: string
  type: "IN" | "OUT" | "MANUAL"
  timestamp: string
  method: string
  photoUrl?: string | null
  location?: {
    lat?: number
    lng?: number
  } | null
  user: {
    id: string
    name: string
    jobTitle?: string | null
  }
}

// ---------------- Helpers ----------------
const formatDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString() : "—";
const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

function exportCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const header = Object.keys(rows[0]);
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      header
        .map((k) => {
          const v = r[k] ?? "";
          const s = typeof v === "string" ? v : JSON.stringify(v);
          return `"${String(s).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------- Component ----------------
const AdminAttendance: React.FC = () => {
  const [status, setStatus] = useState<string>("Memuat...")
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [dailyRows, setDailyRows] = useState<DailyAttendance[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isAuto, setIsAuto] = useState<boolean>(false)
  const [search, setSearch] = useState<string>("")
  const [filterUser, setFilterUser] = useState<string>("")
  const [filterType, setFilterType] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [month, setMonth] = useState<string>(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`
  })
  const [selected, setSelected] = useState<AttendanceLog | null>(null)
  const [showModal, setShowModal] = useState<boolean>(false)

  const connectionRef = useRef<WebSocket | EventSource | null>(null)
  const mountedRef = useRef(true)

  // chart data (count per day)
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([])

  // --- fetch initial data (month & today pattern like UserAttendance) ---
  useEffect(() => {
    mountedRef.current = true
    const load = async () => {
      setLoading(true)
      setStatus("Memuat data...")
      try {
        const resMonth: AxiosResponse = await api.get(`/admin/attendance/month?month=${month}`)
        const arr: DailyAttendance[] = Array.isArray(resMonth.data) ? resMonth.data : []
        // normalize: ensure timestamps & userName exist
        if (mountedRef.current) {
          // sort newest first
          arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
setDailyRows(arr)


// flatten logs untuk panel kanan, filter, stats
const flatLogs = arr.flatMap((d) => d.logs ?? [])
setLogs(flatLogs)

          setStatus("Data absen dimuat")
        }
      } catch (err) {
        console.error("load month error", err)
        setStatus("Gagal memuat data")
        setDailyRows([])
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    load()
    return () => {
      mountedRef.current = false
    }
  }, [month])

  // --- build chart data whenever punches change ---
  useEffect(() => {
    const map = new Map<string, number>()
    for (const d of dailyRows) {
  if (!d.checkIn) continue
  map.set(d.date, (map.get(d.date) || 0) + 1)
}

    const arr = Array.from(map.entries()).map(([date, count]) => ({ date, count }))
    arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setChartData(arr)
  }, [dailyRows])

  // --- cleanup connection on unmount ---
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        try {
          if (connectionRef.current instanceof WebSocket) connectionRef.current.close()
          else connectionRef.current.close()
        } catch (e) {
          /* ignore */
        }
        connectionRef.current = null
      }
    }
  }, [])

  // --- realtime connect / disconnect ---
  const trySSE = () => {
    try {
      const es = new EventSource(`/api/attendance/sse`)
      es.onopen = () => {
        setStatus("Auto-scan terhubung (SSE)")
        setIsAuto(true)
      }
      es.onmessage = (ev) => {
        try {
          const parsed: AttendanceLog = JSON.parse(ev.data)
          setLogs((prev) => [parsed, ...prev])
          setStatus("Absen diterima (SSE)")
        } catch (e) {
          console.warn("SSE parse fail", e)
        }
      }
      es.onerror = () => {
        es.close()
        setIsAuto(false)
        setStatus("SSE terputus")
      }
      connectionRef.current = es
    } catch (err) {
      console.error("SSE error", err)
      setStatus("Auto-scan gagal (SSE)")
      setIsAuto(false)
    }
  }
  const calcDuration = (inTime?: string | null, outTime?: string | null) => {
  if (!inTime || !outTime) return "—"
  const diff =
    new Date(outTime).getTime() - new Date(inTime).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}j ${m}m`
}

const getStatus = (checkIn?: string | null) => {
  if (!checkIn) return "Alpha"
  const hour = new Date(checkIn).getHours()
  return hour > 9 ? "Telat" : "Hadir"
}


  const toggleAuto = () => {
    if (isAuto) {
      if (connectionRef.current) {
        try {
          if (connectionRef.current instanceof WebSocket) connectionRef.current.close()
          else connectionRef.current.close()
        } catch (e) {}
        connectionRef.current = null
      }
      setIsAuto(false)
      setStatus("Auto-scan dimatikan")
      return
    }

    // try WS first
    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws"
      const wsUrl = `${wsProtocol}://${window.location.host}/ws/attendance`
      const ws = new WebSocket(wsUrl)
      ws.onopen = () => {
        setStatus("Auto-scan terhubung (WebSocket)")
        setIsAuto(true)
      }
      ws.onmessage = (ev) => {
        try {
          const parsed: AttendanceLog = JSON.parse(ev.data)
          setLogs((prev) => [parsed, ...prev])
          setStatus("Absen diterima (auto)")
        } catch (e) {
          console.warn("WS parse error", e)
        }
      }
      ws.onclose = () => {
        setIsAuto(false)
        setStatus("Auto-scan terputus")
      }
      ws.onerror = () => {
        // fallback to SSE
        try {
          if (ws.readyState !== WebSocket.OPEN) ws.close()
        } catch (e) {}
        trySSE()
      }
      connectionRef.current = ws
    } catch (e) {
      trySSE()
    }
  }

  // --- quick scan (simulate) ---
  const quickScan = async (payload: Partial<DailyAttendance> = {}) => {
    try {
      setStatus("Memproses quick-scan...")
      const body: any = {
        type: "MANUAL",
        timestamp: new Date().toISOString(),
        deviceId: "ADMIN-SIM",
        ...payload,
      }
      const res = await api.post("/attendance/quick-scan", body)
      const created: AttendanceLog = res.data
      setLogs((p) => [created, ...p])
      setStatus("Quick-scan diterima")
      return created
    } catch (err) {
      console.error("quick scan error", err)
      setStatus("Quick-scan gagal")
      return null
    }
  }

  // --- clear client logs (only client) ---
  const clearClient = () => {
    if (!confirm("Hapus semua log di tampilan admin (tanpa menghapus server)?")) return
    setDailyRows([])
    setStatus("Log dibersihkan (klien)")
  }

  // --- CSV export (respecting filters) ---
  const filteredPunches = useMemo(() => {
  return logs.filter((p) => {
    if (filterUser && p.user.id !== filterUser) return false
    if (filterType && p.type !== filterType) return false

    if (dateFrom && new Date(p.timestamp) < new Date(dateFrom)) return false
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      if (new Date(p.timestamp) > end) return false
    }

    if (search) {
      const hay = `${p.user.name} ${p.type}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }

    return true
  })
}, [logs, filterUser, filterType, search, dateFrom, dateTo])

  const exportFilteredCsv = () => {
  const dailyRows = filteredPunches.map((p) => ({
    id: p.id,
    user: p.user.name,
    jobTitle: p.user.jobTitle ?? "",
    type: p.type,
    timestamp: p.timestamp,
    method: p.method,
    lat: p.location?.lat ?? "",
    lng: p.location?.lng ?? "",
    photoUrl: p.photoUrl ?? "",
  }))

  exportCsv(`attendance_${month}.csv`, dailyRows)
}

  // --- simple stats ---
  const stats = useMemo(() => {
  const total = logs.length
  const byType = logs.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1
    return acc
  }, {})
  const uniqueUsers = new Set(logs.map((p) => p.user.id)).size
  return { total, byType, uniqueUsers }
}, [logs])

  // --- unique user list for filter dropdown ---
  const userList = useMemo(() => {
  const map = new Map<string, string>()
  dailyRows.forEach((p) => {
    map.set(p.user.id, p.user.name)
  })
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
}, [dailyRows])

  // --- modal open ---
  const openDetail = (p: AttendanceLog) => {
  setSelected(p)
  setShowModal(true)
}

  // --- map link helper ---
  const mapsLink = (lat?: number, lng?: number) =>
    lat == null || lng == null ? undefined : `https://www.google.com/maps?q=${lat},${lng}`

  return (
    <div className="min-h-screen p-6 bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900/60 to-slate-800/30 border border-slate-700/40 shadow-xl">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Left: main */}
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <motion.div
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 6, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 to-indigo-500/10 blur-md"
                  />
                  <div className="relative z-10 w-20 h-20 rounded-full bg-slate-900/40 border border-slate-700 flex items-center justify-center">
                    <Fingerprint className="w-8 h-8 text-cyan-300" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold">Admin — Attendance Hub</h2>
                  <p className="text-sm text-slate-400 mt-1">Monitor absen karyawan real-time, tinjau foto & lokasi, ekspor data, dan kelola koreksi.</p>

                  <div className="mt-3 flex flex-wrap gap-3 items-center">
                    <div className="px-3 py-2 bg-slate-800/40 rounded-md text-sm text-slate-300">Status: <span className="ml-1 font-semibold text-white">{status}</span></div>
                    <div className="px-3 py-2 bg-slate-800/30 rounded-md text-sm text-slate-300 flex items-center gap-2">
                      <Wifi className="w-4 h-4" /> Realtime: <span className={`ml-1 font-medium ${isAuto ? 'text-emerald-300' : 'text-amber-300'}`}>{isAuto ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={toggleAuto}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 flex items-center gap-2"
                >
                  {isAuto ? <ToggleRight className="w-4 h-4 text-emerald-300" /> : <ToggleLeft className="w-4 h-4 text-amber-300" />} Auto-Scan
                </button>

                <button
                  onClick={exportFilteredCsv}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>

                <button onClick={clearClient} className="px-4 py-2 rounded-lg border border-red-700 text-red-300 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Clear View
                </button>
              </div>

              {/* Stats & chart */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="col-span-2 p-4 rounded-lg bg-gradient-to-br from-white/3 to-transparent border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Ringkasan</div>
                      <div className="text-lg font-semibold text-white mt-1">Total {stats.total} punch · {stats.uniqueUsers} pengguna</div>
                    </div>

                    <div className="text-sm text-slate-300">
                      <div>IN: <span className="font-semibold">{stats.byType.IN ?? 0}</span></div>
                      <div>OUT: <span className="font-semibold">{stats.byType.OUT ?? 0}</span></div>
                      <div>MANUAL: <span className="font-semibold">{stats.byType.MANUAL ?? 0}</span></div>
                    </div>
                  </div>

                  <div style={{ height: 160 }} className="mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-white/3 to-transparent border border-white/5 flex flex-col gap-3">
                  <div className="text-xs text-slate-400">Quick Info</div>
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900/40 px-3 py-2 rounded w-full">
                      <div className="text-xs text-slate-400">Bulan</div>
                      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full bg-transparent text-white outline-none" />
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">Cari cepat</div>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, userId, note..." className="w-full px-3 py-2 rounded-md bg-slate-800/30 border border-slate-700/30 text-slate-200" />
                </div>
              </div>

              {/* Logs list */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-3">Log Terbaru ({filteredPunches.length})</h4>
                <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
                  {filteredPunches.length === 0 && <div className="text-slate-400">Belum ada log yang cocok filter.</div>}
                  {filteredPunches.map((p) => (
                    <motion.button
                      key={p.id}
                      onClick={() => openDetail(p)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.995 }}
                      className="w-full text-left p-3 rounded-lg bg-gradient-to-r from-slate-800/30 to-transparent border border-slate-700/20 flex items-center justify-between hover:brightness-105"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-md bg-slate-900/40 flex items-center justify-center overflow-hidden">
                          {p.photoUrl ? (
                            // thumbnail
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.photoUrl} alt="thumb" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-6 h-6 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm text-white font-medium">{p.user.name ?? "—"} <span className="ml-2 text-xs text-slate-400">{p.type}</span></div>
                          <div className="text-xs text-slate-400">{formatDateTime(p.timestamp)}</div>

                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-400">
                        <div>{p.location?.lat != null && p.location?.lng != null ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{`${p.location?.lat.toFixed(4)},${p.location?.lng.toFixed(4)}`}</span> : "—"}</div>
                        <div className="mt-1">ID: {p.id}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: filters & detail */}
            <div className="w-96 flex-shrink-0">
              <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/30">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-300 font-medium">Filter</div>
                  <Info className="w-4 h-4 text-slate-400" />
                </div>

                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-slate-400">User</label>
                    <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md bg-slate-800/30 border border-slate-700/30 text-slate-200">
                      <option value="">Semua pengguna</option>
                      {userList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Tipe</label>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md bg-slate-800/30 border border-slate-700/30 text-slate-200">
                      <option value="">Semua tipe</option>
                      <option value="IN">IN</option>
                      <option value="OUT">OUT</option>
                      <option value="MANUAL">MANUAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Dari</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md bg-slate-800/30 border border-slate-700/30 text-slate-200" />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Sampai</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md bg-slate-800/30 border border-slate-700/30 text-slate-200" />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setFilterUser(""); setFilterType(""); setDateFrom(""); setDateTo(""); setSearch(""); }} className="flex-1 px-3 py-2 rounded bg-slate-800/30 border border-slate-700/30 text-slate-200">Reset</button>
                    <button onClick={() => exportFilteredCsv()} className="px-3 py-2 rounded bg-cyan-600 text-white">Export</button>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-slate-900/30 to-transparent border border-slate-700/30">
                <div className="text-sm text-slate-300 font-medium flex items-center gap-2">Detail cepat <Zap className="w-4 h-4 text-amber-300" /></div>
                <div className="mt-3 text-xs text-slate-400">Klik salah satu log di sebelah kiri untuk melihat detail (foto penuh, lokasi, JSON lengkap).</div>

                <div className="mt-4 text-xs text-slate-400">
                  <div>Total yang ditampilkan: <span className="font-semibold text-white">{filteredPunches.length}</span></div>
                  <div className="mt-2">Tip: gunakan <kbd className="px-2 py-1 rounded bg-slate-800/30">S</kbd> untuk memicu simulasi.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal detail */}
          {showModal && selected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 w-11/12 md:w-3/4 lg:w-1/2 p-6 rounded-xl bg-slate-900/90 border border-slate-700/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-slate-300 font-semibold">Detail Punch</div>
                    <div className="text-xs text-slate-400 mt-1">{formatDateTime(selected.timestamp)}</div>
                    <div className="text-xs text-slate-400 mt-1">User: <span className="font-medium text-white">{selected.user.name ?? selected.user.id ?? "—"}</span></div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a className="px-3 py-1 rounded bg-slate-800/30" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(selected)); alert("Disalin!"); }}>Salin</a>
                    <button onClick={() => setShowModal(false)} className="px-3 py-1 rounded bg-slate-800/30">Tutup</button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400">Foto</div>
                    <div className="mt-2 rounded bg-slate-900/30 h-64 flex items-center justify-center overflow-hidden">
                      {selected.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selected.photoUrl} alt="photo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-slate-500 text-sm flex flex-col items-center gap-2">
                          <Camera className="w-6 h-6" />
                          <div>Tidak ada foto</div>
                        </div>
                      )}
                    </div>

                    {selected.location?.lat != null && selected.location?.lng != null && (
                      <div className="mt-2 text-xs">
                        <a href={mapsLink(selected.location?.lat, selected.location?.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-cyan-300 underline">
                          <MapPin className="w-4 h-4" /> Buka di Google Maps
                        </a>
                        <div className="text-slate-400 text-xs mt-1">Koordinat: {selected.location?.lat.toFixed(6)}, {selected.location?.lng.toFixed(6)}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Informasi</div>
                    <div className="mt-2 text-sm text-white">
                      <div><span className="text-slate-400">Nama:</span> {selected.user.name}</div>
                      <div><span className="text-slate-400">ID:</span> {selected.id}</div>
                      <div className="mt-1"><span className="text-slate-400">Tipe:</span> {selected.type}</div>
                      <div className="mt-1"><span className="text-slate-400">Sumber:</span> {selected.method ?? "—"}</div>
                      <div className="mt-1"><span className="text-slate-400">Waktu:</span> {formatDateTime(selected.timestamp)}</div>
                    </div>

                    <div className="mt-4 text-xs text-slate-400">Raw JSON</div>
                    <pre className="mt-2 text-xs bg-slate-800/30 p-3 rounded max-h-44 overflow-auto">{JSON.stringify(selected, null, 2)}</pre>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          <div className="mt-6 text-xs text-slate-400">
            Integrasi: perangkat / aplikasi user mengirim punch ke <code className="bg-slate-900/50 px-1 rounded">/attendance/punch</code>. Untuk realtime, sediakan WS di <code className="bg-slate-900/50 px-1 rounded">/ws/attendance</code> atau SSE di <code className="bg-slate-900/50 px-1 rounded">/api/attendance/sse</code>.
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAttendance
