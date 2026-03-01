import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  CartesianGrid,
} from "recharts";
import {
  FiTrendingUp,
  FiAward,
  FiStar,
  FiUser,
  FiDownload,
  FiSearch,
} from "react-icons/fi";
import api from "../../services/api";

/* ======================================================
 TYPES – SESUAI BACKEND
====================================================== */

type KPIResponse = {
  score: number;
  completedObjectives: number;
  peerRating: number;
  managerName: string | null;
};

type Objective = {
  id: string;
  title: string;
  progress: number;
  due: string | null;
};

type SkillPoint = {
  skill: string;
  value: number;
};

type TrendPoint = {
  month: string;
  score: number;
};

type Review = {
  id: string;
  reviewer: string;
  rating: number;
  note: string;
  date: string;
};

type PerformanceResponse = {
  kpis: KPIResponse;
  objectives: Objective[];
  skills: SkillPoint[];
  trend: TrendPoint[];
  reviews: Review[];
};

/* ======================================================
 HELPERS
====================================================== */

function exportToCsv(filename: string, rows: any[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/* ======================================================
 COMPONENT
====================================================== */

const UserPerformance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [skills, setSkills] = useState<SkillPoint[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [query, setQuery] = useState("");

  /* ======================================================
    FETCH DATA (FIXED ENDPOINT)
  ====================================================== */

  useEffect(() => {
    const loadPerformance = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<PerformanceResponse>(
          "/user/performance/me" // ✅ WAJIB ADA /me
        );

        setKpis(res.data.kpis);
        setObjectives(res.data.objectives ?? []);
        setSkills(res.data.skills ?? []);
        setTrend(res.data.trend ?? []);
        setReviews(res.data.reviews ?? []);
      } catch (err: any) {
        console.error("Performance error:", err);

        if (err.response?.status === 404) {
          setError("Data performance belum tersedia");
        } else if (err.response?.status === 401) {
          setError("Silakan login kembali");
        } else {
          setError("Gagal memuat data performance");
        }
      } finally {
        setLoading(false);
      }
    };

    loadPerformance();
  }, []);

  /* ======================================================
    DERIVED DATA
  ====================================================== */

  const filteredObjectives = useMemo(() => {
    if (!query) return objectives;
    return objectives.filter(o =>
      o.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [objectives, query]);

  /* ======================================================
    UI STATES
  ====================================================== */

  if (loading) {
    return <div className="p-6 text-slate-400">Loading performance...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  if (!kpis) {
    return <div className="p-6 text-slate-400">No performance data</div>;
  }

  /* ======================================================
    RENDER
  ====================================================== */

  return (
    <div className="min-h-screen p-6 bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">Performance</h1>
            <p className="text-slate-400 mt-1">
              Personal performance dashboard
            </p>
          </div>

          <button
            onClick={() => exportToCsv("performance_reviews.csv", reviews)}
            className="flex items-center gap-2 px-4 py-2 rounded
              bg-gradient-to-r from-amber-400 to-orange-500
              text-black font-semibold"
          >
            <FiDownload /> Export
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Performance Score"
            value={`${kpis.score} / 100`}
            icon={<FiTrendingUp />}
          />
          <KPICard
            title="Completed Objectives"
            value={kpis.completedObjectives}
            icon={<FiAward />}
          />
          <KPICard
            title="Peer Rating"
            value={kpis.peerRating.toFixed(1)}
            icon={<FiStar />}
          />
          <KPICard
            title="Manager"
            value={kpis.managerName || "-"}
            icon={<FiUser />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* OBJECTIVES */}
          <div className="lg:col-span-2 space-y-4">
            <motion.div className="p-4 rounded-xl bg-slate-900/50 border border-white/6">
              <div className="flex justify-between mb-3">
                <div className="font-semibold">Objectives</div>
                <div className="flex items-center gap-2 bg-slate-800/40 px-2 rounded">
                  <FiSearch />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Cari objective"
                    className="bg-transparent outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredObjectives.length === 0 ? (
                  <div className="text-slate-400 text-sm">
                    Tidak ada objective
                  </div>
                ) : (
                  filteredObjectives.map(o => (
                    <div
                      key={o.id}
                      className="p-3 bg-slate-900/40 rounded border border-white/6"
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="font-semibold">{o.title}</div>
                          <div className="text-xs text-slate-400">
                            Due:{" "}
                            {o.due
                              ? new Date(o.due).toLocaleDateString()
                              : "-"}
                          </div>
                        </div>
                        <div className="font-bold">{o.progress}%</div>
                      </div>
                      <div className="mt-2 h-2 bg-white/5 rounded overflow-hidden">
                        <div
                          className="h-2 bg-cyan-400"
                          style={{ width: `${o.progress}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* REVIEWS */}
            <motion.div className="p-4 rounded-xl bg-slate-900/50 border border-white/6">
              <div className="font-semibold mb-3">Feedback</div>
              <div className="space-y-3 max-h-64 overflow-auto">
                {reviews.length === 0 ? (
                  <div className="text-slate-400 text-sm">
                    Belum ada feedback
                  </div>
                ) : (
                  reviews.map(r => (
                    <div
                      key={r.id}
                      className="p-3 bg-slate-900/40 rounded border border-white/6"
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{r.reviewer}</div>
                          <div className="text-xs text-slate-400">
                            {new Date(r.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-amber-300 font-bold">
                          {r.rating.toFixed(1)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-slate-300">
                        {r.note}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* CHARTS */}
          <div className="space-y-4">
            <ChartCard title="Performance Trend">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    dataKey="score"
                    stroke="#34d399"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Skill Radar">
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={skills}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    dataKey="value"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ======================================================
 SMALL COMPONENTS
====================================================== */

const KPICard = ({ title, value, icon }: any) => (
  <div className="p-4 rounded-xl bg-slate-900/50 border border-white/6">
    <div className="flex items-center gap-3">
      <div className="text-xl text-cyan-300">{icon}</div>
      <div>
        <div className="text-xs text-slate-400">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  </div>
);

const ChartCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <motion.div className="p-4 rounded-xl bg-slate-900/50 border border-white/6">
    <div className="font-semibold mb-2">{title}</div>
    {children}
  </motion.div>
);

export default UserPerformance;
