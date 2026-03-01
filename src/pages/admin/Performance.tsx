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
  FiPlus,
  FiTrash2,
  FiSave,
  FiSearch,
} from "react-icons/fi";
import api from "../../services/api";

/* ======================================================
 TYPES
====================================================== */

/* ===================== TYPES ===================== */
type User = {
  id: string;
  name: string;
  email: string;
  department?: string;
};

type KPI = {
  score: number;
  completedObjectives: number;
  peerRating: number;
};

type Objective = {
  id: string;
  title: string;
  progress: number;
  due?: string | null;
};

type Skill = {
  id: string;
  skill: string;
  value: number;
};

type PerformanceTrend = {
  id: string;
  month: string;
  score: number;
};

type Review = {
  id: string;
  rating: number;
  note?: string;
  createdAt: string;
};

type PerformanceState = {
  score: number;
  objectives: Objective[];
  skills: Skill[];
  trends: PerformanceTrend[];
  reviews: Review[];
};

/* ===================== COMPONENT ===================== */
const AdminPerformance: React.FC = () => {
  // ===================== STATES =====================
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<string>("");

  // KPI
  const [kpiForm, setKpiForm] = useState<KPI>({
    score: 0,
    completedObjectives: 0,
    peerRating: 0,
  });

  // Performance
  const EMPTY_PERFORMANCE: PerformanceState = {
    score: 0,
    objectives: [],
    skills: [],
    trends: [],
    reviews: [],
  };
  const [performance, setPerformance] =
    useState<PerformanceState>(EMPTY_PERFORMANCE);

  // Loading
  const [loading, setLoading] = useState(false);

  // Forms
  const [objective, setObjective] = useState({
    title: "",
    progress: 0,
    due: "",
  });

  const [review, setReview] = useState({
    rating: 5,
    note: "",
  });

  const [skillName, setSkillName] = useState("");
  const [skillValue, setSkillValue] = useState<number>(0);

  const [trendMonth, setTrendMonth] = useState("");
  const [trendScore, setTrendScore] = useState<number>(0);

  const [query, setQuery] = useState("");

  // ===================== LOAD USERS =====================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/admin/users");
        setUsers(res.data);
      } catch (err) {
        console.error("Gagal fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  // ===================== LOAD PERFORMANCE =====================
  const loadPerformance = async (id: string) => {
    if (!id) return;

    setLoading(true);
    setPerformance(EMPTY_PERFORMANCE);
    setKpiForm({ score: 0, completedObjectives: 0, peerRating: 0 });

    try {
      const res = await api.get(`/admin/performance/${id}`);
      const data = res.data;

      setPerformance({
        score: Number(data.score ?? 0),
        objectives: data.objectives ?? [],
        skills: data.skills ?? [],
        trends: data.trends ?? [],
        reviews: data.reviews ?? [],
      });

      setKpiForm({
        score: Number(data.score ?? 0),
        completedObjectives: Number(data.completedObjectives ?? 0),
        peerRating: Number(data.peerRating ?? 0),
      });
    } catch (err) {
      console.error("Gagal load performance:", err);
    } finally {
      setLoading(false);
    }
  };

  // ===================== ACTIONS =====================
  const saveKPI = async () => {
  if (!userId) return alert("Pilih user terlebih dahulu");

  try {
    await api.patch(`/admin/performance/${userId}/kpi`, {
      score: kpiForm.score,
      peerRating: kpiForm.peerRating,
    });
    loadPerformance(userId);
  } catch (err) {
    console.error(err);
  }
};

  const addObjective = async () => {
  if (!userId) return;
  if (!objective.title.trim()) return;

  await api.post(`/admin/performance/${userId}/objective`, {
  title: objective.title.trim(),
  progress: Number(objective.progress),
  ...(objective.due && {
    due: new Date(objective.due),
  }),
});

  setObjective({ title: "", progress: 0, due: "" });
  loadPerformance(userId);
};

  const deleteObjective = async (id: string) => {
    try {
      await api.delete(`/admin/performance/objective/${id}`);
      loadPerformance(userId);
    } catch (err) {
      console.error(err);
    }
  };

 const addReview = async () => {
  if (!userId) return;
  if (!review.rating || review.rating <= 0) return;

  await api.post(`/admin/performance/${userId}/review`, {
  rating: Number(review.rating),
  note: review.note?.trim() || undefined,
});

  setReview({ rating: 5, note: "" });
  loadPerformance(userId);
};

  const deleteReview = async (id: string) => {
    try {
      await api.delete(`/admin/performance/review/${id}`);
      loadPerformance(userId);
    } catch (err) {
      console.error(err);
    }
  };

  const addSkill = async () => {
    if (!userId || !skillName.trim()) return;

    try {
      await api.post(`/admin/performance/${userId}/skill`, {
        skill: skillName,
        value: Number(skillValue),
      });
      setSkillName("");
      setSkillValue(0);
      loadPerformance(userId);
    } catch (err) {
      console.error(err);
    }
  };

  const addTrend = async () => {
  if (!userId || !trendMonth.trim()) return;

  await api.post(`/admin/performance/${userId}/trend`, {
    month: trendMonth,
    score: Number(trendScore),
  });

  setTrendMonth("");
  setTrendScore(0);
  loadPerformance(userId);
};

  // ===================== DERIVED DATA =====================
  const filteredObjectives = useMemo(() => {
    if (!performance) return [];
    if (!query) return performance.objectives;
    return performance.objectives.filter(o =>
      o.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [performance, query]);

  // ===================== RADAR DATA =====================
  const radarData =
    performance.skills.length === 1
      ? [...performance.skills, ...performance.skills, ...performance.skills]
      : performance.skills.length === 2
      ? [...performance.skills, performance.skills[0]]
      : performance.skills;
  /* ======================================================
    UI
  ====================================================== */

  return (
  <div className="min-h-screen p-6 bg-slate-950 text-white">
    <div className="max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">
            Performance Management
          </h1>
          <p className="text-slate-400">
            Admin control panel
          </p>
        </div>

        <select
        value={userId}
        onChange={e => {
          setUserId(e.target.value);
          loadPerformance(e.target.value);
        }}
        className="bg-slate-900 px-4 py-2 rounded"
      >
        <option value="">-- Pilih User --</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.email})
          </option>
        ))}
      </select>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-slate-400">Loading...</div>
      )}

      {/* BELUM PILIH USER */}
      {!loading && !userId && (
        <div className="text-slate-500 text-center mt-20">
          Pilih user terlebih dahulu untuk melihat performance
        </div>
      )}

      {/* DATA PERFORMANCE */}
      {!loading && userId && performance && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            <KPICard title="Score">
              <input
                type="number"
                value={kpiForm.score}
                onChange={(e) =>
                  setKpiForm({ ...kpiForm, score: Number(e.target.value) })
                }
                className="bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-2
                  focus:ring-2 focus:ring-cyan-400/40"
              />
            </KPICard>

            <KPICard title="Objectives">
              <input
                type="number"
                value={kpiForm.completedObjectives}
                onChange={(e) =>
                  setKpiForm({
                    ...kpiForm,
                    completedObjectives: Number(e.target.value),
                  })
                }
                className="bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-2
                  focus:ring-2 focus:ring-cyan-400/40"
              />
            </KPICard>

            <KPICard title="Peer Rating">
              <input
                type="number"
                step="0.1"
                value={kpiForm.peerRating}
                onChange={(e) =>
                  setKpiForm({
                    ...kpiForm,
                    peerRating: Number(e.target.value),
                  })
                }
                className="bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-2
                  focus:ring-2 focus:ring-cyan-400/40"
              />
            </KPICard>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveKPI();
              }}
              className="flex items-end"
            >
              <button
                type="submit"
                className="w-full p-4 rounded-xl bg-cyan-400 text-black font-bold
                  flex items-center justify-center gap-2"
              >
                <FiSave /> Save KPI
              </button>
            </form>
          </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* OBJECTIVES */}
              <div className="lg:col-span-2 space-y-4">
                <Card title="Objectives">
                  <div className="flex items-center gap-2 mb-3">
                    <FiSearch />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Cari objective"
                      className="bg-transparent outline-none text-sm"
                    />
                  </div>

                  {filteredObjectives.map(o => (
                    <div
                      key={o.id}
                      className="flex justify-between items-center p-3 bg-slate-900/40 rounded border border-white/6 mb-2"
                    >
                      <div>
                        <div className="font-semibold">
                          {o.title}
                        </div>
                        <div className="text-xs text-slate-400">
                          {o.progress}%
                        </div>
                      </div>
                      <button
                        onClick={() => deleteObjective(o.id)}
                        className="text-red-400"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}

                  <div className="mt-3 space-y-2">
                    <input
                      placeholder="Objective title"
                      value={objective.title}
                      onChange={e =>
                        setObjective({
                          ...objective,
                          title: e.target.value,
                        })
                      }
                      className="bg-slate-900 text-white
    placeholder-slate-400
    border border-white/10
    rounded-lg px-3 py-2
    focus:ring-2 focus:ring-cyan-400/40"
                    />
                    <input
                      type="number"
                      placeholder="Progress %"
                      value={objective.progress}
                      onChange={e =>
                        setObjective({
                          ...objective,
                          progress: +e.target.value,
                        })
                      }
                      className="bg-slate-900 text-white
    placeholder-slate-400
    border border-white/10
    rounded-lg px-3 py-2
    focus:ring-2 focus:ring-cyan-400/40"
                    />
                    <button
                      onClick={addObjective}
                      className="btn-primary"
                    >
                      <FiPlus /> Add Objective
                    </button>
                  </div>
                </Card>

                {/* REVIEWS */}
                <Card title="Reviews">
                  {performance.reviews.map(r => (
                    <div
                      key={r.id}
                      className="p-3 bg-slate-900/40 rounded border border-white/6 mb-2"
                    >
                      <div className="flex justify-between">
                        <div className="font-medium">
                          {r.rating} ⭐
                        </div>
                        <button
                          onClick={() => deleteReview(r.id)}
                          className="text-red-400"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                      <div className="text-sm text-slate-300 mt-1">
                        {r.note}
                      </div>
                    </div>
                  ))}

                  <textarea
                    placeholder="Review note"
                    value={review.note}
                    onChange={e =>
                      setReview({
                        ...review,
                        note: e.target.value,
                      })
                    }
                    className="bg-slate-900 text-white
    placeholder-slate-400
    border border-white/10
    rounded-lg px-3 py-2
    focus:ring-2 focus:ring-cyan-400/40"
                  />

                  <button
                    onClick={addReview}
                    className="btn-amber"
                  >
                    <FiStar /> Add Review
                  </button>
                </Card>
              </div>

              {/* CHARTS */}
              <div className="space-y-4">
              <ChartCard title="Performance Trend">
  <div className="space-y-4">

    <div className="grid grid-cols-3 gap-3">
      <input
        value={trendMonth}
        onChange={(e) => setTrendMonth(e.target.value)}
        placeholder="Month (Jan)"
        className="
    w-full
    bg-[#0b1220]
    text-cyan-200
    border border-cyan-500/30
    rounded-lg
    px-3 py-2
    placeholder:text-cyan-400/40
    focus:outline-none
    focus:ring-2
    focus:ring-cyan-400/50
  "
      />

      <input
        type="number"
        value={trendScore}
        onChange={(e) => setTrendScore(Number(e.target.value))}
        placeholder="Score"
        className="
    w-full
    bg-[#0b1220]
    text-cyan-200
    border border-cyan-500/30
    rounded-lg
    px-3 py-2
    placeholder:text-cyan-400/40
    focus:outline-none
    focus:ring-2
    focus:ring-cyan-400/50
  "
      />

      <button
        onClick={addTrend}
        className="btn-primary flex items-center justify-center gap-2"
      >
        <FiPlus /> Add
      </button>
    </div>

    <div className="h-[220px] rounded-xl bg-[#060b18] p-3 border border-white/5">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={performance.trends}>
          <CartesianGrid opacity={0.08} />
          <XAxis dataKey="month" stroke="#67e8f9" />
          <YAxis domain={[0, 100]} stroke="#67e8f9" />
          <Tooltip />
          <Line
            dataKey="score"
            stroke="#34d399"
            strokeWidth={3}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>

  </div>
</ChartCard>
              <ChartCard title="Skills Radar">
  <div className="space-y-4">

    {/* INPUT */}
    <div className="grid grid-cols-3 gap-3">
      <input
        value={skillName}
        onChange={(e) => setSkillName(e.target.value)}
        placeholder="Skill (React)"
        className="
          w-full bg-[#0b1220] text-cyan-200
          border border-cyan-500/30 rounded-lg
          px-3 py-2 placeholder:text-cyan-400/40
          focus:outline-none focus:ring-2 focus:ring-cyan-400/50
        "
      />

      <input
        type="number"
        min={1}
        max={100}
        value={skillValue}
        onChange={(e) => setSkillValue(Number(e.target.value))}
        placeholder="Value"
        className="
          w-full bg-[#0b1220] text-cyan-200
          border border-cyan-500/30 rounded-lg
          px-3 py-2 placeholder:text-cyan-400/40
          focus:outline-none focus:ring-2 focus:ring-cyan-400/50
        "
      />

      <button
        onClick={addSkill}
        className="btn-cyan flex items-center justify-center gap-2"
      >
        <FiPlus /> Add
      </button>
    </div>

    {/* RADAR */}
    <div className="h-[260px] rounded-xl bg-[#060b18] p-4 border border-white/5">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          data={radarData}
          startAngle={90}
          endAngle={-270}   // bikin arah "horizontal-like"
        >
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis
            dataKey="skill"
            stroke="#67e8f9"
            tick={{ fontSize: 12 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            stroke="#67e8f9"
            tick={{ fontSize: 10 }}
          />

          <Radar
            dataKey="value"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={performance.skills.length >= 3 ? 0.25 : 0}
            dot={{ r: 4 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>

  </div>
</ChartCard>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ======================================================
 SMALL COMPONENTS
====================================================== */

const KPICard = ({ title, children }: any) => (
  <div className="p-4 rounded-xl bg-slate-900/50 border border-white/6">
    <div className="text-xs text-slate-400 mb-1">{title}</div>
    {children}
  </div>
);

const Card = ({ title, children }: any) => (
  <motion.div className="p-4 rounded-xl bg-slate-900/50 border border-white/6">
    <div className="font-semibold mb-3">{title}</div>
    {children}
  </motion.div>
);

const ChartCard = ({ title, children }: any) => (
  <motion.div className="p-4 rounded-xl bg-slate-900/50 border border-white/6">
    <div className="font-semibold mb-2">{title}</div>
    {children}
  </motion.div>
);

export default AdminPerformance;
