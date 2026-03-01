// src/pages/user/Attendance.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FiClock,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiCamera,
  FiDownload,
  FiUpload,
  FiInfo,
  FiAlertTriangle,
} from "react-icons/fi";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";

// ---------------- Types ----------------
type PunchType = "IN" | "OUT" | "MANUAL";
type Punch = {
  id: string;
  type: PunchType;
  timestamp: string; // ISO
  lat?: number;
  lng?: number;
  photoUrl?: string; // dataURL or server URL
  note?: string;
  source?: "app" | "manual"; // provenance
};

type TimesheetDay = {
  date: string; // YYYY-MM-DD
  hours: number; // hours total (float)
  punches: Punch[];
};

const STORAGE_KEY = "5znexa_user_attendance_local_punches_v1";

// Office geofence sample (latitude, longitude). Adjust to your office coords.
const OFFICE_COORDS = { lat: -6.200000, lng: 106.816666 }; // Jakarta example
const OFFICE_RADIUS_M = 500; // meters

// ---------------- Helpers ----------------
const uid = (prefix = "") => `${prefix}${Date.now()}${Math.floor(Math.random() * 9999)}`;

const isoDate = (d = new Date()) => d.toISOString();

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

const formatDateShort = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) : "—";

const hhmmFromMinutes = (m: number) => {
  const sign = m < 0 ? "-" : "";
  m = Math.abs(Math.round(m));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${sign}${h}h ${String(mm).padStart(2, "0")}m`;
};

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  // Haversine formula
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371e3; // m
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// CSV helper
function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows?.length) return;
  const header = Object.keys(rows[0]);
  const csv = [
    header.join(","),
    ...rows.map((row) =>
      header
        .map((fieldName) => {
          const v = row[fieldName] ?? "";
          if (typeof v === "string" && v.includes(",")) return `"${v.replace(/"/g, '""')}"`;
          return JSON.stringify(v ?? "");
        })
        .join(",")
    ),
  ].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------- Component ----------------
const UserAttendance: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  // State
  const [loading, setLoading] = useState(true);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [timesheet, setTimesheet] = useState<TimesheetDay[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isPunching, setIsPunching] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionDate, setCorrectionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [correctionType, setCorrectionType] = useState<PunchType>("MANUAL");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
  let active = true;

  async function load() {
    setLoading(true);
    try {
      // ✅ deklarasi variabel dengan const
      const respMonth = await api.get(`/user/attendance/month?month=${month}`);
      const respToday = await api.get("/user/attendance/today");

      if (!active) return;

      const serverPunches: Punch[] = Array.isArray(respMonth.data)
  ? respMonth.data.flatMap((day: any) =>
      Array.isArray(day.logs)
        ? day.logs.map((l: any) => ({
            id: l.id,
            type: l.type,
            timestamp: l.timestamp,
            lat: l.lat,
            lng: l.lng,
            photoUrl: l.photoUrl,
            source: l.source ?? "app",
          }))
        : []
    )
  : [];

      setPunches(
        serverPunches.sort(
          (a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)
        )
      );
    } catch (err) {
      console.error("Failed loading attendance:", err);
      setPunches([]); // fallback
    } finally {
      if (active) setLoading(false);
    }
  }

  load();
  return () => {
    active = false;
  };
}, [month]);

  // compute timesheet from punches
  useEffect(() => {
    // Group punches per date (local timezone)
    const dayMap = new Map<string, Punch[]>();
    for (const p of punches) {
      const dateKey = new Date(p.timestamp).toISOString().slice(0, 10);
      if (!dateKey.startsWith(month)) {
        // Allow cross-month but skip
      }
      const arr = dayMap.get(dateKey) ?? [];
      arr.push(p);
      dayMap.set(dateKey, arr);
    }

    // build days for the selected month
    const [y, m] = month.split("-").map((x) => parseInt(x, 10));
    const daysInMonth = new Date(y, m, 0).getDate();
    const ts: TimesheetDay[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateISO = new Date(y, m - 1, d).toISOString().slice(0, 10);
      const dayPunches = (dayMap.get(dateISO) ?? []).sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
      // pair IN/OUT sequentially
      let totalMinutes = 0;
      for (let i = 0; i < dayPunches.length; i++) {
        const p = dayPunches[i];
        if (p.type === "IN") {
          // find next OUT after this IN
          const out = dayPunches.slice(i + 1).find((q) => q.type === "OUT");
          if (out) {
            totalMinutes += Math.max(0, Math.round((+new Date(out.timestamp) - +new Date(p.timestamp)) / 60000));
          }
        }
      }
      ts.push({ date: dateISO, hours: +(totalMinutes / 60).toFixed(2), punches: dayPunches });
    }
    setTimesheet(ts);
  }, [punches, month]);

  // derived stats
  const monthlyTotalHours = useMemo(() => timesheet.reduce((s, d) => s + d.hours, 0), [timesheet]);
  const avgHours = useMemo(() => (timesheet.length ? monthlyTotalHours / timesheet.length : 0), [monthlyTotalHours, timesheet]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysPunches = punches
  .filter((p) => typeof p.timestamp === "string")
  .filter((p) => p.timestamp.slice(0, 10) === todayKey)
  .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  // determine current status: clocked in if there is unmatched IN (an IN without later OUT)
  const isClockedIn = useMemo(() => {
  const today = new Date().toISOString().slice(0, 10);

  const todayPunches = punches
    .filter((p) => p.timestamp?.slice(0, 10) === today)
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));

  if (todayPunches.length === 0) return false;

  const last = todayPunches[todayPunches.length - 1];
  return last.type === "IN";
}, [punches]);

  const lastInPunch = useMemo(() => punches.filter((p) => p.type === "IN").sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0] ?? null, [punches]);

  // time since clock-in
  const timeSince = useMemo(() => {
    if (!isClockedIn || !lastInPunch) return null;
    const diffMs = +new Date() - +new Date(lastInPunch.timestamp);
    const mins = Math.floor(diffMs / 60000);
    return hhmmFromMinutes(mins);
  }, [isClockedIn, lastInPunch]);

  // ---------- Camera control ----------
useEffect(() => {
  return () => {
    // cleanup stream on unmount
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
  };
}, [stream]);

async function openCamera() {
  try {
    const cam = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    setStream(cam);
    setCameraOpen(true);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = cam;
        videoRef.current.play(); // 🔥 WAJIB
      }
    }, 100);
  } catch (err) {
    console.error("Camera error:", err);
    setStatusMsg("❌ Tidak bisa mengakses kamera");
  }
}

const closeCamera = () => {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
  setStream(null);
  setCameraOpen(false);// reset photo
};

function capturePhoto() {
  const video = videoRef.current;
  const canvas = canvasRef.current;
  if (!video || !canvas) return;

  if (video.videoWidth === 0) {
    setStatusMsg("❌ Kamera belum siap");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const img = canvas.toDataURL("image/jpeg", 0.85);
  setCapturedPhoto(img);

  // stop stream setelah capture (hemat resource)
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  }
}

  // ---------- Punching logic ----------
  async function attemptPunch(type: PunchType) {
    if (!photoConfirmed || !capturedPhoto) {
  setStatusMsg("❌ Konfirmasi foto terlebih dahulu");
  return;
}
  if (type === "OUT" && !isClockedIn) {
  setStatusMsg("❌ Anda belum Clock In hari ini");
  return;
}

    setIsPunching(true);
    setStatusMsg(null);
    try {
      // get geolocation (best effort)
      // 🔴 GANTI SEMUA BLOK GEOLOCATION
const coords = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
  if (!("geolocation" in navigator)) {
    reject("GPS tidak didukung browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) =>
      resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }),
    () => reject("Lokasi wajib diaktifkan"),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

      const punch: Punch = {
  id: uid("p_"),
  type,
  timestamp: isoDate(),
  lat: coords.lat,          // 🟢 WAJIB
  lng: coords.lng,          // 🟢 WAJIB
  photoUrl: capturedPhoto ?? undefined,
  source: "app",
};

      // optimistic UI update
      setPunches((p) => [punch, ...p]);

      // save to server if available
      if (api.post) {
        try {
          await api.post("/user/attendance/punch", {
  type,
  timestamp: isoDate(),
  photoUrl: capturedPhoto,
  method: "app",
  location: {
    lat: coords.lat,
    lng: coords.lng,
  },
});


// 🔥 setelah server OK → reload data
const respToday = await api.get("/user/attendance/today");

setPunches(
  respToday.data.sort(
    (a: Punch, b: Punch) =>
      +new Date(b.timestamp) - +new Date(a.timestamp)
  )
);
          // on success maybe server returns processed object; ignored here
        } catch (err) {
          console.warn("Failed to send punch to server, will queue locally", err);
          // queue locally
          queueLocalPunch(punch);
        }
      } else {
        // queue locally for demo
        queueLocalPunch(punch);
      }

      // reset captured photo after punch (it got attached)
      setCapturedPhoto(null);
      setStatusMsg(`${type === "IN" ? "Clocked in" : "Clocked out"} successfully.`);
    } catch (err) {
      console.error(err);
      setStatusMsg("Error while performing punch.");
    } finally {
      setIsPunching(false);
      setCapturedPhoto(null);
      setPhotoConfirmed(false);

    }
  }

  function queueLocalPunch(p: Punch) {
    const existing = localStorage.getItem(STORAGE_KEY);
    const arr: Punch[] = existing ? JSON.parse(existing) : [];
    arr.unshift(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // Manual correction request (user)
  async function submitCorrectionRequest() {
    if (!correctionReason.trim()) {
      setStatusMsg("Isi alasan koreksi terlebih dahulu.");
      return;
    }
    const payload = {
      date: correctionDate,
      type: correctionType,
      reason: correctionReason,
      userId: (user as any)?.id ?? "unknown",
    };
    try {
      if (api.post) {
        await api.post("/attendance/correction", payload);
        setStatusMsg("Permintaan koreksi terkirim.");
      } else {
        // local demo: store as local punch (but flagged)
        const manualPunch: Punch = {
          id: uid("manual_"),
          type: correctionType,
          timestamp: `${correctionDate}T12:00:00.000Z`,
          note: `Request: ${correctionReason}`,
          source: "manual",
        };
        queueLocalPunch(manualPunch);
        setPunches((p) => [manualPunch, ...p]);
        setStatusMsg("Permintaan koreksi disimpan lokal (demo).");
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("Gagal mengirim permintaan koreksi.");
    } finally {
      setCorrectionModalOpen(false);
      setCorrectionReason("");
    }
  }

  // Export timesheet CSV
  function exportTimesheetCsv() {
    const rows: Record<string, any>[] = [];
    for (const d of timesheet) {
      rows.push({
        date: d.date,
        hours: d.hours,
        punches: d.punches.map((p) => `${p.type}@${formatTime(p.timestamp)}`).join(" | "),
      });
    }
    exportToCsv(`timesheet_${month}.csv`, rows);
  }

  // Quick helper for google maps link
  function mapsLink(lat?: number, lng?: number) {
    if (lat == null || lng == null) return undefined;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  // Geofence status for latest punch (if coords available)
  const geofenceStatus = useMemo(() => {
    const last = punches.find((p) => p.lat != null && p.lng != null);
    if (!last || last.lat == null || last.lng == null) return { ok: null, distance: null };
    const d = distanceMeters(last.lat, last.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);
    return { ok: d <= OFFICE_RADIUS_M, distance: Math.round(d) };
  }, [punches]);

  // UI
  return (
    <div className="min-h-screen p-6 bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold">Attendance</h1>
            <div className="text-sm text-slate-400 mt-1">Clock in / out, timesheet, and history</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right mr-2 hidden sm:block">
              <div className="text-xs text-slate-400">Monthly total</div>
              <div className="text-lg font-bold">{monthlyTotalHours.toFixed(2)} hrs</div>
              <div className="text-xs text-slate-400">Avg {avgHours.toFixed(2)} hrs/day</div>
            </div>

            <div className="bg-gradient-to-r from-[#06b6d4]/20 to-[#60a5fa]/10 p-3 rounded-lg border border-white/6">
              <div className="text-xs text-slate-300">Status</div>
              <div className="flex items-center gap-2">
                <FiClock className="text-cyan-300" />
                <div className="text-sm font-semibold">
                  {isClockedIn ? `On duty — ${timeSince ?? ""}` : "Off duty"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: controls + quick actions */}
          <div className="col-span-1 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-slate-300 font-semibold">Quick Actions</div>
                  <div className="text-xs text-slate-400">Tap to punch</div>
                </div>
                <div className="text-xs text-slate-400">{(user as any)?.name ?? "—"}</div>
              </div>

              <div className="flex flex-col gap-3">
                <button
  onClick={() => attemptPunch("IN")}
  disabled={isPunching || !photoConfirmed} // 🟢
                  className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-semibold hover:scale-[1.01] transition"
                >
                  <FiLogIn /> Clock In
                </button>

                <button
                  onClick={() => attemptPunch("OUT")}
                  disabled={isPunching || !capturedPhoto}
                  className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-rose-400 to-orange-400 text-black font-semibold hover:scale-[1.01] transition"
                >
                  <FiLogOut /> Clock Out
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openCamera}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 flex items-center gap-2 justify-center"
                  >
                    <FiCamera /> Capture selfie
                  </button>
                  {!capturedPhoto && (
  <div className="mt-2 text-xs text-amber-400">
    📸 Ambil foto selfie sebelum Clock In / Out
  </div>
)}
                  <button
                    onClick={() => {
                      // manual attach captured photo to next punch (if exists)
                      if (!capturedPhoto) {
                        setStatusMsg("Belum ada foto ter-capture. Buka kamera dulu.");
                        return;
                      }
                      setStatusMsg("Foto akan dilampirkan ke punch berikutnya.");
                    }}
                    className="px-3 py-2 rounded-lg bg-white/5"
                  >
                    <FiUpload /> Attach
                  </button>
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  Note: Jika backend tersedia, punch akan dikirim ke server. Jika tidak, data disimpan secara lokal.
                </div>
              </div>
            </div>

            {/* Correction */}
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-slate-300 font-semibold">Request Correction</div>
                <div className="text-xs text-slate-400">Submit if punch wrong</div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <input
                  type="date"
                  value={correctionDate}
                  onChange={(e) => setCorrectionDate(e.target.value)}
                  className="px-3 py-2 rounded bg-slate-800/50 border border-white/6 text-sm"
                />
                <select value={correctionType} onChange={(e) => setCorrectionType(e.target.value as PunchType)} className="px-3 py-2 rounded bg-slate-800/50 border border-white/6 text-sm">
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
                <textarea value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} placeholder="Alasan koreksi..." className="px-3 py-2 rounded bg-slate-800/50 border border-white/6 text-sm" />
                <div className="flex gap-2">
                  <button onClick={() => setCorrectionModalOpen(true)} className="px-3 py-2 rounded bg-white/5">Open advanced</button>
                  <button onClick={submitCorrectionRequest} className="px-3 py-2 rounded bg-cyan-500 text-black font-semibold">Submit</button>
                </div>
              </div>
            </div>

            {/* Geofence */}
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-slate-300 font-semibold">Location</div>
                <div className="text-xs text-slate-400">Office check</div>
              </div>
              <div className="text-sm">
                {geofenceStatus.ok == null ? (
                  <div className="text-xs text-slate-400">No recent location available</div>
                ) : geofenceStatus.ok ? (
                  <div className="flex items-center gap-2 text-green-300">
                    <FiMapPin /> In office ({geofenceStatus.distance} m)
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-300">
                    <FiAlertTriangle /> Outside office ({geofenceStatus.distance} m)
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Office center: {OFFICE_COORDS.lat.toFixed(4)},{OFFICE_COORDS.lng.toFixed(4)} (radius {OFFICE_RADIUS_M} m)
              </div>
            </div>
          </div>

          {/* Middle: chart + timesheet quick view */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-black/20 to-white/2 border border-white/6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-300 font-semibold">Monthly Timesheet</div>
                  <div className="text-xs text-slate-400">Visual overview — {month}</div>
                </div>

                <div className="flex items-center gap-2">
                  <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 rounded bg-slate-900/60 border border-white/6 text-sm">
                    {/* show last 6 months */}
                    {(() => {
                      const opts = [];
                      const now = new Date();
                      for (let i = 0; i < 6; i++) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                        opts.push(<option key={val} value={val}>{val}</option>);
                      }
                      return opts;
                    })()}
                  </select>

                  <button onClick={exportTimesheetCsv} className="px-3 py-2 rounded bg-white/5 text-sm flex items-center gap-2">
                    <FiDownload /> Export CSV
                  </button>
                </div>
              </div>

              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timesheet.map((d) => ({ date: typeof d.date === "string" ? d.date.slice(8) : "--", hours: +d.hours.toFixed(2) }))}>
                    <defs>
                      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0b1220", border: "none" }} />
                    <Area type="monotone" dataKey="hours" stroke="#06b6d4" fill="url(#g1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Today timeline & punches */}
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-slate-300 font-semibold">Today timeline</div>
                  <div className="text-xs text-slate-400">{formatDateShort(new Date().toISOString())}</div>
                </div>

                <div className="text-xs text-slate-400">Punches: {todaysPunches.length}</div>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-sm text-slate-400">Loading...</div>
                ) : todaysPunches.length === 0 ? (
                  <div className="text-sm text-slate-400">No punches today</div>
                ) : (
                  todaysPunches.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.type === "IN" ? "bg-cyan-500/10" : p.type === "OUT" ? "bg-rose-500/10" : "bg-white/5"}`}>
                          {p.type === "IN" ? <FiLogIn className="text-cyan-300" /> : p.type === "OUT" ? <FiLogOut className="text-rose-300" /> : <FiInfo />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{p.type}</div>
                          <div className="text-xs text-slate-400">{formatTime(p.timestamp)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {p.lat != null && p.lng != null && (
                          <a className="text-xs text-slate-300 hover:underline flex items-center gap-1" href={mapsLink(p.lat, p.lng)} target="_blank" rel="noreferrer">
                            <FiMapPin /> {Math.round(distanceMeters(p.lat, p.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng))} m
                          </a>
                        )}

                        {p.photoUrl && (
                          <a className="text-xs text-slate-300 hover:underline" href={p.photoUrl} target="_blank" rel="noreferrer">
                            <FiCamera />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status message */}
        {statusMsg && (
          <div className="mt-4 p-3 rounded bg-white/5 text-sm text-slate-200">
            {statusMsg}
            <button className="ml-4 text-xs text-slate-400" onClick={() => setStatusMsg(null)}>Dismiss</button>
          </div>
        )}
      </div>

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl p-4 rounded-2xl bg-slate-900/95 border border-white/6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Camera</div>
              <div className="flex items-center gap-2">
                {!capturedPhoto && (
  <button
    onClick={capturePhoto}
    className="px-3 py-1 rounded bg-cyan-500 text-black font-semibold"
  >
    Capture
  </button>
)}

{capturedPhoto && (
  <>
    <button
      onClick={() => {
        setCapturedPhoto(null);
        setPhotoConfirmed(false);
        openCamera();
      }}
      className="px-3 py-1 rounded bg-white/5"
    >
      Retake
    </button>

    <button
  onClick={() => {
    setPhotoConfirmed(true);
    closeCamera();
    setStatusMsg("Foto siap. Silakan Clock In / Out.");
  }}
      className="px-3 py-1 rounded bg-green-500 text-black font-semibold"
    >
      Use Photo & Clock In/Out
    </button>
  </>
)}
              </div>
            </div>

            {!capturedPhoto ? (
              <div className="w-full h-80 bg-black/20 rounded overflow-hidden flex items-center justify-center">
                <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  className="w-full h-full object-cover"
/>
              </div>
            ) : (
              <div className="w-full h-80 bg-black/20 rounded overflow-hidden flex items-center justify-center">
                <img src={capturedPhoto} alt="capture" className="max-h-full object-contain" />
              </div>
            )}

            <div className="mt-3 text-xs text-slate-400">
              Foto akan dilampirkan pada punch berikutnya jika dipilih.
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        </div>
      )}

      {/* Correction modal (advanced) */}
      {correctionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg p-6 rounded-2xl bg-slate-900/95 border border-white/6">
            <div className="text-lg font-semibold mb-2">Correction request</div>
            <div className="text-sm text-slate-400 mb-4">Provide details and why this correction is needed.</div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-xs text-slate-300">Date</label>
              <input type="date" value={correctionDate} onChange={(e) => setCorrectionDate(e.target.value)} className="px-3 py-2 rounded bg-slate-800/50 border border-white/6" />
              <label className="text-xs text-slate-300">Type</label>
              <select value={correctionType} onChange={(e) => setCorrectionType(e.target.value as PunchType)} className="px-3 py-2 rounded bg-slate-800/50 border border-white/6">
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="MANUAL">MANUAL</option>
              </select>
              <label className="text-xs text-slate-300">Reason</label>
              <textarea value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} rows={4} className="px-3 py-2 rounded bg-slate-800/50 border border-white/6" />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setCorrectionModalOpen(false)} className="px-3 py-2 rounded bg-white/5">Close</button>
                <button onClick={submitCorrectionRequest} className="px-3 py-2 rounded bg-cyan-500 text-black font-semibold">Submit</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UserAttendance;
