import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  Flame,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  InsightsRange,
  LearningInsightsData,
  PageId,
  StudyActivityType,
} from "../types";
import {
  clearLearningInsights,
  computeFilteredInsights,
  INSIGHTS_SUBJECTS,
  INSIGHTS_UPDATED_EVENT,
  loadLearningInsights,
  recordLearningActivity,
  resetLearningInsightsToSample,
} from "../services/learningAnalytics";
import { useToast } from "./ToastProvider";

interface LearningInsightsDashboardProps {
  onNavigate: (page: PageId) => void;
}

const RANGE_OPTIONS: { id: InsightsRange; label: string }[] = [
  { id: "7d", label: "7 Days" },
  { id: "14d", label: "14 Days" },
  { id: "30d", label: "30 Days" },
];

const SUBJECT_FILTERS = ["All", ...INSIGHTS_SUBJECTS];

function formatHoursAndMinutes(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
  unitSuffix?: string;
}

const InsightsChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  unitSuffix = "",
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#1E1B4B] text-white px-3.5 py-2.5 shadow-lg border border-white/15 text-xs space-y-1.5 min-w-[165px]">
      <p className="font-semibold text-slate-200 border-b border-white/10 pb-1">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-200">
              <span
                className="w-2 h-2 rounded-xs shrink-0"
                style={{ backgroundColor: entry.color || "#4338CA" }}
                aria-hidden="true"
              />
              <span>{entry.name}</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-white">
              {entry.value ?? "—"}
              {entry.value !== null && entry.value !== undefined ? unitSuffix : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LearningInsightsDashboard: React.FC<LearningInsightsDashboardProps> = ({
  onNavigate,
}) => {
  const { showToast } = useToast();
  const [data, setData] = useState<LearningInsightsData>(loadLearningInsights);
  const [range, setRange] = useState<InsightsRange>("14d");
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [timeChartView, setTimeChartView] = useState<"breakdown" | "trend">("breakdown");
  const [showLogForm, setShowLogForm] = useState(false);

  // Manual study log form state
  const [logSubject, setLogSubject] = useState<string>(INSIGHTS_SUBJECTS[0]);
  const [logType, setLogType] = useState<StudyActivityType>("Study Hub");
  const [logTopic, setLogTopic] = useState("");
  const [logMinutes, setLogMinutes] = useState("25");
  const [logScore, setLogScore] = useState("");

  useEffect(() => {
    const syncFromStorage = () => {
      setData(loadLearningInsights());
    };
    window.addEventListener(INSIGHTS_UPDATED_EVENT, syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(INSIGHTS_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const insights = useMemo(
    () => computeFilteredInsights(data, range, subjectFilter),
    [data, range, subjectFilter]
  );

  const hasAnyData = data.daily.length > 0 || data.activities.length > 0;
  const performanceChartSeries = useMemo(
    () =>
      insights.series.map((d) => ({
        ...d,
        displayQuizScore: d.quizScore,
      })),
    [insights.series]
  );

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMinutes = Math.min(360, Math.max(5, Number(logMinutes) || 25));
    const parsedScore =
      logScore.trim() !== ""
        ? Math.min(100, Math.max(0, Number(logScore)))
        : undefined;

    const updated = recordLearningActivity({
      type: logType,
      subject: logSubject,
      topic: logTopic.trim() || `${logSubject} Focus Revision`,
      minutes: parsedMinutes,
      scorePercent: Number.isFinite(parsedScore) ? parsedScore : undefined,
    });

    setData(updated);
    setLogTopic("");
    setLogScore("");
    setShowLogForm(false);
    showToast(`Logged ${parsedMinutes}m in ${logSubject}`, "success");
  };

  const handleResetSample = () => {
    const seeded = resetLearningInsightsToSample();
    setData(seeded);
    setSubjectFilter("All");
    showToast("Sample learning history restored", "info");
  };

  const handleClearData = () => {
    const empty = clearLearningInsights();
    setData(empty);
    showToast("Learning insights history cleared", "info");
  };

  return (
    <section
      id="learning-insights"
      aria-labelledby="learning-insights-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
    >
      {/* Section Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-2">
        <div className="space-y-1.5 max-w-2xl">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7C3AED]">
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Learning Insights · Student Progress & Analytics</span>
          </p>
          <h2
            id="learning-insights-heading"
            className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] tracking-tight"
          >
            Study Time & Performance Trends
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Track daily study hours across AI Study Hub, Smart Quiz, and Live Tutor alongside quiz
            accuracy progression.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Subject Filter */}
          <label htmlFor="insights-subject-filter" className="sr-only">
            Filter by subject
          </label>
          <select
            id="insights-subject-filter"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#1E1B4B] focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15 cursor-pointer"
          >
            {SUBJECT_FILTERS.map((sub) => (
              <option key={sub} value={sub}>
                {sub === "All" ? "All Subjects" : sub}
              </option>
            ))}
          </select>

          {/* Segmented Date Range Selector */}
          <div
            className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl"
            role="group"
            aria-label="Time window"
          >
            {RANGE_OPTIONS.map((opt) => {
              const active = range === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRange(opt.id)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active ? "text-white" : "text-slate-600 hover:text-[#1E1B4B]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="insightsRangePill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-lg bg-[#4338CA]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowLogForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#4338CA] hover:bg-[#4F46E5] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showLogForm ? "Close Form" : "Log Session"}</span>
          </button>
        </div>
      </div>

      {/* Expandable Inline Log Study Session Form */}
      <AnimatePresence>
        {showLogForm && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            onSubmit={handleLogSubmit}
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end"
          >
            <div className="lg:col-span-3 space-y-1">
              <label htmlFor="log-subject" className="block text-xs font-semibold text-[#1E1B4B]">
                Subject
              </label>
              <select
                id="log-subject"
                value={logSubject}
                onChange={(e) => setLogSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
              >
                {INSIGHTS_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label htmlFor="log-type" className="block text-xs font-semibold text-[#1E1B4B]">
                Activity
              </label>
              <select
                id="log-type"
                value={logType}
                onChange={(e) => setLogType(e.target.value as StudyActivityType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
              >
                <option value="Study Hub">Study Hub</option>
                <option value="Smart Quiz">Smart Quiz</option>
                <option value="Live Tutor">Live Tutor</option>
              </select>
            </div>

            <div className="lg:col-span-3 space-y-1">
              <label htmlFor="log-topic" className="block text-xs font-semibold text-[#1E1B4B]">
                Topic Studied
              </label>
              <input
                id="log-topic"
                type="text"
                value={logTopic}
                onChange={(e) => setLogTopic(e.target.value)}
                placeholder="e.g. Electromagnetic Induction"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA]"
              />
            </div>

            <div className="lg:col-span-1 space-y-1">
              <label htmlFor="log-minutes" className="block text-xs font-semibold text-[#1E1B4B]">
                Minutes
              </label>
              <input
                id="log-minutes"
                type="number"
                min={5}
                max={360}
                value={logMinutes}
                onChange={(e) => setLogMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono tabular-nums text-[#1E1B4B] focus:outline-none focus:border-[#4338CA]"
              />
            </div>

            <div className="lg:col-span-1 space-y-1">
              <label htmlFor="log-score" className="block text-xs font-semibold text-[#1E1B4B]">
                Score %
              </label>
              <input
                id="log-score"
                type="number"
                min={0}
                max={100}
                value={logScore}
                onChange={(e) => setLogScore(e.target.value)}
                placeholder="Opt."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono tabular-nums text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA]"
              />
            </div>

            <div className="lg:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                className="w-full px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] transition-colors whitespace-nowrap cursor-pointer"
              >
                Save Entry
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!hasAnyData ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
            <BarChart3 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-[#1E1B4B]">No Study Logs Recorded Yet</h3>
            <p className="text-sm text-slate-600">
              Complete a quiz, generate notes in AI Study Hub, or log your first session to visualize
              your progress trends.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowLogForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4338CA] hover:bg-[#4F46E5] cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Log First Entry</span>
            </button>
            <button
              type="button"
              onClick={handleResetSample}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1E1B4B] border border-slate-200 bg-[#F8FAFC] hover:border-[#4338CA] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Load Sample History</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4-Column KPI Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Total Study Time</span>
                <Clock className="w-4 h-4 text-[#4338CA]" aria-hidden="true" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1E1B4B] tabular-nums">
                {formatHoursAndMinutes(insights.totalMinutes)}
              </p>
              <p className="text-xs text-slate-600 tabular-nums">
                Avg {insights.avgDailyMinutes} min/day · {insights.activeDays} active days
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Avg. Quiz Performance</span>
                <TrendingUp className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#10B981] tabular-nums">
                {insights.avgQuizScore !== null ? `${insights.avgQuizScore}%` : "—"}
              </p>
              <p className="text-xs text-slate-600 tabular-nums">
                {insights.performanceDelta !== null ? (
                  <span
                    className={
                      insights.performanceDelta >= 0
                        ? "font-semibold text-[#10B981]"
                        : "font-semibold text-red-600"
                    }
                  >
                    {insights.performanceDelta >= 0 ? "+" : ""}
                    {insights.performanceDelta}% vs early window
                  </span>
                ) : (
                  "Take a quiz to track accuracy"
                )}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Completed Sessions</span>
                <Target className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1E1B4B] tabular-nums">
                {insights.totalSessions}
              </p>
              <p className="text-xs text-slate-600">
                Notes, quizzes & tutor dialogues
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Active Study Streak</span>
                <Flame className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1E1B4B] tabular-nums">
                {insights.streakDays} {insights.streakDays === 1 ? "Day" : "Days"}
              </p>
              <p className="text-xs text-slate-600">
                Consistent daily study cadence
              </p>
            </div>
          </div>

          {/* Primary Charts Grid: Time Spent Studying & Performance Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Chart (7 cols): Time Spent Studying */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-base sm:text-lg font-bold text-[#1E1B4B]">
                    Time Spent Studying (Minutes)
                  </h3>
                  <p className="text-xs text-slate-600">
                    {subjectFilter === "All" ? "All subjects" : subjectFilter} · Daily breakdown by
                    learning tool
                  </p>
                </div>

                <div
                  className="inline-flex items-center gap-1 p-1 bg-[#F8FAFC] border border-slate-200 rounded-lg self-start sm:self-auto"
                  role="group"
                  aria-label="Study time chart mode"
                >
                  <button
                    type="button"
                    onClick={() => setTimeChartView("breakdown")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      timeChartView === "breakdown"
                        ? "bg-[#4338CA] text-white"
                        : "text-slate-600 hover:text-[#1E1B4B]"
                    }`}
                  >
                    By Tool
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeChartView("trend")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      timeChartView === "trend"
                        ? "bg-[#4338CA] text-white"
                        : "text-slate-600 hover:text-[#1E1B4B]"
                    }`}
                  >
                    Total Area
                  </button>
                </div>
              </div>

              <div className="w-full h-[270px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  {timeChartView === "breakdown" ? (
                    <BarChart
                      data={insights.series}
                      margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E2E8F0" }}
                        minTickGap={18}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={false}
                        unit="m"
                      />
                      <Tooltip
                        content={<InsightsChartTooltip unitSuffix=" min" />}
                        cursor={{ fill: "#F8FAFC" }}
                      />
                      <Bar
                        dataKey="studyHubMinutes"
                        name="AI Study Hub"
                        stackId="study"
                        fill="#4338CA"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="tutorMinutes"
                        name="Live Tutor"
                        stackId="study"
                        fill="#7C3AED"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="quizMinutes"
                        name="Smart Quiz"
                        stackId="study"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  ) : (
                    <AreaChart
                      data={insights.series}
                      margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="studyTimeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4338CA" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#4338CA" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E2E8F0" }}
                        minTickGap={18}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={false}
                        unit="m"
                      />
                      <Tooltip content={<InsightsChartTooltip unitSuffix=" min" />} />
                      <Area
                        type="monotone"
                        dataKey="totalMinutes"
                        name="Total Study Time"
                        stroke="#4338CA"
                        strokeWidth={2.5}
                        fill="url(#studyTimeGradient)"
                        activeDot={{ r: 5, fill: "#4338CA", stroke: "#FFFFFF", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Clean Chart Legend (no pills) */}
              <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#4338CA]" aria-hidden="true" />
                  <span>AI Study Hub</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#7C3AED]" aria-hidden="true" />
                  <span>Live Tutor</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#10B981]" aria-hidden="true" />
                  <span>Smart Quiz</span>
                </span>
              </div>
            </div>

            {/* Right Chart (5 cols): Performance Trends Over Time */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 min-w-0">
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-bold text-[#1E1B4B]">
                  Performance Trend (%)
                </h3>
                <p className="text-xs text-slate-600">
                  Quiz accuracy vs rolling concept mastery · 80% target line
                </p>
              </div>

              <div className="w-full h-[270px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={performanceChartSeries}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="quizScoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                      minTickGap={22}
                    />
                    <YAxis
                      domain={[40, 100]}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip content={<InsightsChartTooltip unitSuffix="%" />} />
                    <ReferenceLine
                      y={80}
                      stroke="#1E1B4B"
                      strokeDasharray="4 4"
                      strokeOpacity={0.45}
                    />
                    <Area
                      type="monotone"
                      dataKey="displayQuizScore"
                      name="Quiz Accuracy"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fill="url(#quizScoreGradient)"
                      connectNulls
                      dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#10B981", stroke: "#FFFFFF", strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="masteryIndex"
                      name="Mastery Index"
                      stroke="#7C3AED"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      fill="transparent"
                      dot={false}
                      activeDot={{ r: 4, fill: "#7C3AED", stroke: "#FFFFFF", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#10B981]" aria-hidden="true" />
                  <span>Quiz Accuracy</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-[#7C3AED]" aria-hidden="true" />
                  <span>Mastery Index</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-[#1E1B4B]/60" aria-hidden="true" />
                  <span>80% Benchmark</span>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Split: Subject Distribution Bar Chart + Recent Activity Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Subject Breakdown Chart */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-[#1E1B4B]">
                    Time & Mastery by Subject
                  </h3>
                  <p className="text-xs text-slate-600">
                    Study minutes accumulated in the selected window
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("smart-quiz")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#4338CA] hover:text-[#7C3AED] whitespace-nowrap cursor-pointer"
                >
                  <span>Take Quiz</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              {insights.subjectBreakdown.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No subject activity recorded in this window.
                </div>
              ) : (
                <div className="w-full h-[230px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={insights.subjectBreakdown}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E2E8F0" }}
                        unit="m"
                      />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        width={92}
                        tick={{ fontSize: 11, fill: "#1E1B4B", fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={<InsightsChartTooltip unitSuffix=" min" />}
                        cursor={{ fill: "#F8FAFC" }}
                      />
                      <Bar dataKey="minutes" name="Study Minutes" radius={[0, 6, 6, 0]} barSize={18}>
                        {insights.subjectBreakdown.map((entry, idx) => (
                          <Cell
                            key={entry.subject}
                            fill={
                              subjectFilter === entry.subject
                                ? "#7C3AED"
                                : idx === 0
                                ? "#4338CA"
                                : idx % 2 === 0
                                ? "#4338CA"
                                : "#7C3AED"
                            }
                            fillOpacity={
                              subjectFilter === "All" || subjectFilter === entry.subject ? 0.92 : 0.3
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                <span>Click any tool to continue studying</span>
                <button
                  type="button"
                  onClick={() => onNavigate("study-hub")}
                  className="inline-flex items-center gap-1 font-semibold text-[#4338CA] hover:text-[#7C3AED] cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Open Study Hub</span>
                </button>
              </div>
            </div>

            {/* High-Density Recent Activity Log */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col justify-between space-y-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-[#1E1B4B]">Recent Study & Quiz Log</h3>
                  <p className="text-xs text-slate-600">
                    Live activity synced from Study Hub, Smart Quiz, and Live Tutor
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={handleResetSample}
                    className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-[#4338CA] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reset Sample</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearData}
                    className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {insights.activitiesInWindow.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No logged sessions match this filter. Try switching to All Subjects or log a new
                  session.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 px-3">Module</th>
                        <th className="py-2 px-3">Subject & Topic</th>
                        <th className="py-2 px-3 text-right">Duration</th>
                        <th className="py-2 pl-3 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {insights.activitiesInWindow.slice(0, 6).map((act) => (
                        <tr key={act.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap tabular-nums">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                              <span>{act.date.slice(5)}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#1E1B4B] whitespace-nowrap">
                            {act.type}
                          </td>
                          <td className="py-2.5 px-3 max-w-[240px]">
                            <p className="font-semibold text-[#1E1B4B] truncate">{act.subject}</p>
                            <p className="text-xs text-slate-500 truncate">{act.topic}</p>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#1E1B4B] whitespace-nowrap">
                            {act.minutes}m
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                            {typeof act.scorePercent === "number" ? (
                              <span
                                className={
                                  act.scorePercent >= 70 ? "text-[#10B981]" : "text-[#4338CA]"
                                }
                              >
                                {act.scorePercent}%
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
