import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FiVideo,
  FiCalendar,
  FiActivity,
  FiLink,
  FiCpu,
} from "react-icons/fi";
import api from "../../services/api";

/* ================= TYPES ================= */
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type IntegrationStatus = "ACTIVE" | "INACTIVE";

interface MeetingIntegration {
  id: string;
  name: string;
  description: string;
  meetingUrl: string;
  status: IntegrationStatus;
}

interface WorkScheduleIntegration {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;

  periodType: "DATE" | "MONTH";
  startDate?: string | null;
  endDate?: string | null;
  startMonth?: string | null;
  endMonth?: string | null;

  usersCount: number;
}

interface CalendarEvent {
  day: string;
  label: string;
  load: number;
}

interface ApiResponse {
  meetings: MeetingIntegration[];
  workSchedules: WorkScheduleIntegration[];
  weeklyCalendar: CalendarEvent[];
  workloadPercentage: number;
}

/* ================= MAIN ================= */
function renderPeriod(s: WorkScheduleIntegration) {
  if (s.periodType === "DATE" && s.startDate && s.endDate) {
    return `${formatDate(s.startDate)} – ${formatDate(s.endDate)}`;
  }

  if (s.periodType === "MONTH" && s.startMonth && s.endMonth) {
    return `${s.startMonth} – ${s.endMonth}`;
  }

  return "Tanpa periode";
}

export default function UserIntegrations() {
  const [meetings, setMeetings] = useState<MeetingIntegration[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleIntegration[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [workload, setWorkload] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
  try {
    const res = await api.get<ApiResponse>("/user/integrations");
    const data = res.data;

    setMeetings(data.meetings);
    setSchedules(data.workSchedules);
    setCalendar(data.weeklyCalendar);
    setWorkload(data.workloadPercentage);
  } catch (err: any) {
    console.error("INTEGRATION ERROR:", err.response?.data || err.message);
  } finally {
    setLoading(false);
  }
}

  const workloadColor =
    workload < 40
      ? "text-emerald-400"
      : workload < 70
      ? "text-yellow-400"
      : "text-red-400";

  if (loading) {
    return (
      <div className="p-10 text-slate-400">
        Loading integrations...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-12">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <FiCpu className="text-cyan-400 text-2xl" />
        <h1 className="text-3xl font-semibold text-white">
          Integrations
        </h1>
      </div>

      {/* ================= MEETINGS ================= */}
      <section className="space-y-4">
        <h2 className="text-xl text-white flex items-center gap-2">
          <FiVideo className="text-indigo-400" /> Meetings
        </h2>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {meetings.map((m) => (
            <motion.div
              key={m.id}
              whileHover={{ scale: 1.03 }}
              className="rounded-2xl p-6 bg-white/5 backdrop-blur-xl border border-white/10"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg text-white">{m.name}</h3>
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    m.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-500/20 text-slate-400"
                  }`}
                >
                  {m.status}
                </span>
              </div>

              <p className="text-sm text-slate-400 mt-2">
                {m.description}
              </p>

              <a
                href={m.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-cyan-400 text-sm hover:underline"
              >
                <FiLink /> Join Meeting
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= WORK SCHEDULE ================= */}
      <section className="space-y-4">
        <h2 className="text-xl text-white flex items-center gap-2">
          <FiCalendar className="text-cyan-400" /> Work Schedule
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {schedules.map((s) => (
  <motion.div
    key={s.id}
    whileHover={{ scale: 1.02 }}
    className="rounded-2xl p-6 bg-white/5 backdrop-blur-xl border border-white/10 space-y-3"
  >
    {/* Days */}
    <div className="flex flex-wrap gap-2 text-xs">
      {s.days.map((d) => (
        <span
          key={d}
          className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400"
        >
          {d}
        </span>
      ))}
    </div>

    {/* Time */}
    <div className="text-lg text-white font-semibold">
      {s.startTime} – {s.endTime}
    </div>

    {/* Period */}
    <div className="flex items-center gap-2 text-sm text-slate-300">
      <FiCalendar className="text-orange-400" />
      {renderPeriod(s)}
    </div>

    {/* Users */}
    <div className="text-xs text-slate-400">
      {s.usersCount} users assigned
    </div>
  </motion.div>
))}

        </div>
      </section>

      {/* ================= WEEKLY CALENDAR ================= */}
      <section className="space-y-4">
        <h2 className="text-xl text-white">Weekly View</h2>

        <div className="grid grid-cols-5 gap-4">
          {calendar.map((c, i) => (
            <div
              key={i}
              className="rounded-xl p-4 bg-slate-900/50 border border-white/5"
            >
              <div className="text-sm text-slate-300">{c.day}</div>
              <div className="text-xs text-slate-400 mt-1">
                {c.label}
              </div>
              <div className="mt-3 h-2 bg-slate-700 rounded">
                <div
                  className="h-full rounded bg-gradient-to-r from-cyan-400 to-indigo-500"
                  style={{ width: `${c.load}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= WORKLOAD ================= */}
      <section className="rounded-2xl p-6 bg-white/5 backdrop-blur-xl border border-white/10 flex justify-between items-center">
        <div>
          <h3 className="text-lg text-white flex items-center gap-2">
            <FiActivity /> Workload Indicator
          </h3>
          <p className="text-sm text-slate-400">
            Calculated from meetings & schedules
          </p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-white">
            {workload}%
          </div>
          <div className={`text-sm ${workloadColor}`}>
            {workload < 40
              ? "Low"
              : workload < 70
              ? "Medium"
              : "High"}
          </div>
        </div>
      </section>
    </div>
  );
}
