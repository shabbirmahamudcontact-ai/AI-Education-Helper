import {
  DailyStudyEntry,
  InsightsRange,
  LearningActivityLog,
  LearningInsightsData,
  StudyActivityType,
} from "../types";

export const LEARNING_INSIGHTS_STORAGE_KEY = "edugenius_ai_learning_insights_v1";
export const INSIGHTS_UPDATED_EVENT = "edugenius:insights-updated";

export const INSIGHTS_SUBJECTS = [
  "Physics",
  "Chemistry",
  "Biology",
  "Higher Mathematics",
  "English & IELTS",
  "ICT & Computer Science",
];

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addDays(base: Date, offset: number): Date {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + offset);
  return copy;
}

/**
 * Deterministic 30-day student baseline anchored to today so charts render
 * meaningful time spent and performance progression out of the box, while
 * updating live whenever the student studies or completes quizzes.
 */
export function createSeedInsightsData(anchorDate = new Date()): LearningInsightsData {
  const blueprint: Array<{
    studyHub: number;
    quiz: number;
    tutor: number;
    score: number | null;
    subject: string;
    topic: string;
    type: StudyActivityType;
  }> = [
    { studyHub: 22, quiz: 12, tutor: 10, score: 66, subject: "Physics", topic: "Kinematics & Vector Resolution", type: "Smart Quiz" },
    { studyHub: 28, quiz: 0, tutor: 16, score: null, subject: "English & IELTS", topic: "IELTS Task 2 Essay Cohesion", type: "Study Hub" },
    { studyHub: 18, quiz: 16, tutor: 14, score: 70, subject: "Chemistry", topic: "Periodic Trends & Hybridization", type: "Smart Quiz" },
    { studyHub: 34, quiz: 0, tutor: 12, score: null, subject: "Higher Mathematics", topic: "Differential Calculus Chain Rule", type: "Live Tutor" },
    { studyHub: 20, quiz: 15, tutor: 15, score: 72, subject: "Biology", topic: "সালোকসংশ্লেষণ (Light & Dark Phase)", type: "Smart Quiz" },
    { studyHub: 25, quiz: 0, tutor: 18, score: null, subject: "ICT & Computer Science", topic: "Binary Search & Big-O Notation", type: "Study Hub" },
    { studyHub: 32, quiz: 20, tutor: 12, score: 74, subject: "Physics", topic: "Newton's Laws & Momentum", type: "Smart Quiz" },
    { studyHub: 15, quiz: 0, tutor: 20, score: null, subject: "English & IELTS", topic: "True / False / Not Given Strategy", type: "Live Tutor" },
    { studyHub: 30, quiz: 18, tutor: 14, score: 76, subject: "Chemistry", topic: "Organic Functional Groups", type: "Smart Quiz" },
    { studyHub: 26, quiz: 0, tutor: 16, score: null, subject: "Higher Mathematics", topic: "Integration by Substitution", type: "Study Hub" },
    { studyHub: 24, quiz: 18, tutor: 12, score: 78, subject: "Physics", topic: "Thermodynamics First & Second Law", type: "Smart Quiz" },
    { studyHub: 35, quiz: 0, tutor: 22, score: null, subject: "Biology", topic: "Cellular Respiration & ATP Yield", type: "Study Hub" },
    { studyHub: 20, quiz: 16, tutor: 15, score: 75, subject: "ICT & Computer Science", topic: "SQL Joins & Normalization", type: "Smart Quiz" },
    { studyHub: 28, quiz: 18, tutor: 16, score: 80, subject: "English & IELTS", topic: "Complex Sentences & Academic Lexis", type: "Smart Quiz" },
    { studyHub: 16, quiz: 0, tutor: 14, score: null, subject: "Chemistry", topic: "Chemical Equilibrium & Le Chatelier", type: "Live Tutor" },
    { studyHub: 34, quiz: 22, tutor: 18, score: 82, subject: "Higher Mathematics", topic: "Matrices & Determinants", type: "Smart Quiz" },
    { studyHub: 30, quiz: 15, tutor: 12, score: 80, subject: "Physics", topic: "Electromagnetic Induction", type: "Smart Quiz" },
    { studyHub: 24, quiz: 0, tutor: 20, score: null, subject: "English & IELTS", topic: "Speaking Part 3 Abstract Framing", type: "Live Tutor" },
    { studyHub: 36, quiz: 20, tutor: 16, score: 83, subject: "Chemistry", topic: "Electrochemistry & Nernst Equation", type: "Smart Quiz" },
    { studyHub: 28, quiz: 14, tutor: 18, score: 81, subject: "Biology", topic: "Genetics & Mendelian Ratios", type: "Smart Quiz" },
    { studyHub: 32, quiz: 22, tutor: 20, score: 85, subject: "ICT & Computer Science", topic: "Recursion & Dynamic Programming", type: "Smart Quiz" },
    { studyHub: 26, quiz: 16, tutor: 14, score: 84, subject: "Physics", topic: "Wave Optics & Interference", type: "Study Hub" },
    { studyHub: 38, quiz: 24, tutor: 18, score: 86, subject: "Higher Mathematics", topic: "Probability & Bayes Theorem", type: "Smart Quiz" },
    { studyHub: 24, quiz: 18, tutor: 22, score: 88, subject: "English & IELTS", topic: "IELTS Listening Distractor Traps", type: "Smart Quiz" },
    { studyHub: 35, quiz: 20, tutor: 15, score: 87, subject: "Physics", topic: "Projectile Motion & Range Analysis", type: "Smart Quiz" },
    { studyHub: 28, quiz: 15, tutor: 24, score: 86, subject: "Chemistry", topic: "Acid-Base Titration Curves", type: "Live Tutor" },
    { studyHub: 40, quiz: 22, tutor: 16, score: 90, subject: "Higher Mathematics", topic: "Eigenvalues & Linear Transforms", type: "Smart Quiz" },
    { studyHub: 32, quiz: 20, tutor: 20, score: 89, subject: "Biology", topic: "Human Nervous System & Synapses", type: "Smart Quiz" },
    { studyHub: 36, quiz: 24, tutor: 18, score: 91, subject: "ICT & Computer Science", topic: "Graph Traversal BFS vs DFS", type: "Smart Quiz" },
    { studyHub: 30, quiz: 20, tutor: 16, score: 92, subject: "Physics", topic: "Ohm's Law & Circuit Analysis", type: "Smart Quiz" },
  ];

  const daily: DailyStudyEntry[] = [];
  const activities: LearningActivityLog[] = [];
  let rollingMastery = 66;

  for (let i = 0; i < 30; i++) {
    const offset = i - 29;
    const d = addDays(anchorDate, offset);
    const dateKey = formatDateKey(d);
    const item = blueprint[i];
    const totalMinutes = item.studyHub + item.quiz + item.tutor;

    if (item.score !== null) {
      rollingMastery = Math.round(rollingMastery * 0.55 + item.score * 0.45);
    } else {
      rollingMastery = Math.min(96, rollingMastery + 1);
    }

    daily.push({
      date: dateKey,
      label: formatShortLabel(dateKey),
      studyHubMinutes: item.studyHub,
      quizMinutes: item.quiz,
      tutorMinutes: item.tutor,
      totalMinutes,
      quizScore: item.score,
      masteryIndex: rollingMastery,
      sessionsCount: item.quiz > 0 ? 3 : 2,
    });

    activities.push({
      id: `seed_${dateKey}_${i}`,
      date: dateKey,
      timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 30).toISOString(),
      type: item.type,
      subject: item.subject,
      topic: item.topic,
      minutes: totalMinutes,
      ...(item.score !== null ? { scorePercent: item.score } : {}),
    });
  }

  return {
    daily,
    activities: activities.reverse(),
  };
}

export function loadLearningInsights(): LearningInsightsData {
  try {
    const raw = localStorage.getItem(LEARNING_INSIGHTS_STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedInsightsData();
      localStorage.setItem(LEARNING_INSIGHTS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.daily) && Array.isArray(parsed?.activities)) {
      return parsed as LearningInsightsData;
    }
  } catch {
    // fallback below
  }
  return createSeedInsightsData();
}

function persistLearningInsights(data: LearningInsightsData): void {
  try {
    localStorage.setItem(LEARNING_INSIGHTS_STORAGE_KEY, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(INSIGHTS_UPDATED_EVENT));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function resetLearningInsightsToSample(): LearningInsightsData {
  const seeded = createSeedInsightsData();
  persistLearningInsights(seeded);
  return seeded;
}

export function clearLearningInsights(): LearningInsightsData {
  const empty: LearningInsightsData = { daily: [], activities: [] };
  persistLearningInsights(empty);
  return empty;
}

export function recordLearningActivity(params: {
  type: StudyActivityType;
  subject: string;
  topic: string;
  minutes: number;
  scorePercent?: number;
}): LearningInsightsData {
  const current = loadLearningInsights();
  const today = new Date();
  const todayKey = formatDateKey(today);
  const cleanMinutes = Math.max(1, Math.round(params.minutes));
  const cleanSubject = params.subject.trim() || "General Studies";
  const cleanTopic = params.topic.trim() || "Study Session";

  const newActivity: LearningActivityLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: todayKey,
    timestamp: today.toISOString(),
    type: params.type,
    subject: cleanSubject,
    topic: cleanTopic,
    minutes: cleanMinutes,
    ...(typeof params.scorePercent === "number"
      ? { scorePercent: Math.min(100, Math.max(0, Math.round(params.scorePercent))) }
      : {}),
  };

  const daily = [...current.daily];
  const existingIdx = daily.findIndex((d) => d.date === todayKey);

  const addStudyHub = params.type === "Study Hub" || params.type === "Quick Ask" ? cleanMinutes : 0;
  const addQuiz = params.type === "Smart Quiz" ? cleanMinutes : 0;
  const addTutor = params.type === "Live Tutor" ? cleanMinutes : 0;

  if (existingIdx >= 0) {
    const prev = daily[existingIdx];
    const nextScore =
      typeof newActivity.scorePercent === "number"
        ? prev.quizScore !== null
          ? Math.round((prev.quizScore + newActivity.scorePercent) / 2)
          : newActivity.scorePercent
        : prev.quizScore;
    const nextMastery =
      nextScore !== null
        ? Math.round(prev.masteryIndex * 0.6 + nextScore * 0.4)
        : Math.min(99, prev.masteryIndex + 1);

    daily[existingIdx] = {
      ...prev,
      studyHubMinutes: prev.studyHubMinutes + addStudyHub,
      quizMinutes: prev.quizMinutes + addQuiz,
      tutorMinutes: prev.tutorMinutes + addTutor,
      totalMinutes: prev.totalMinutes + cleanMinutes,
      quizScore: nextScore,
      masteryIndex: nextMastery,
      sessionsCount: prev.sessionsCount + 1,
    };
  } else {
    const lastMastery = daily.length > 0 ? daily[daily.length - 1].masteryIndex : 72;
    const score = typeof newActivity.scorePercent === "number" ? newActivity.scorePercent : null;
    daily.push({
      date: todayKey,
      label: formatShortLabel(todayKey),
      studyHubMinutes: addStudyHub,
      quizMinutes: addQuiz,
      tutorMinutes: addTutor,
      totalMinutes: cleanMinutes,
      quizScore: score,
      masteryIndex: score !== null ? Math.round(lastMastery * 0.6 + score * 0.4) : lastMastery,
      sessionsCount: 1,
    });
  }

  daily.sort((a, b) => a.date.localeCompare(b.date));

  const next: LearningInsightsData = {
    daily: daily.slice(-60),
    activities: [newActivity, ...current.activities].slice(0, 60),
  };

  persistLearningInsights(next);
  return next;
}

export function getRangeDayCount(range: InsightsRange): number {
  if (range === "7d") return 7;
  if (range === "14d") return 14;
  return 30;
}

export function computeFilteredInsights(
  data: LearningInsightsData,
  range: InsightsRange,
  subjectFilter: string
) {
  const days = getRangeDayCount(range);
  const cutoffDate = formatDateKey(addDays(new Date(), -(days - 1)));

  const activitiesInWindow = data.activities.filter((act) => {
    const inDateRange = act.date >= cutoffDate;
    const matchesSubject = subjectFilter === "All" || act.subject === subjectFilter;
    return inDateRange && matchesSubject;
  });

  // Build daily series: if All subjects, use daily entries; if specific subject, aggregate from activities + daily dates
  const dailyInWindow = data.daily.filter((d) => d.date >= cutoffDate);

  const series: DailyStudyEntry[] =
    subjectFilter === "All"
      ? dailyInWindow
      : dailyInWindow.map((day) => {
          const dayActs = activitiesInWindow.filter((a) => a.date === day.date);
          if (dayActs.length === 0) {
            return {
              ...day,
              studyHubMinutes: 0,
              quizMinutes: 0,
              tutorMinutes: 0,
              totalMinutes: 0,
              quizScore: null,
              sessionsCount: 0,
            };
          }
          let studyHubMinutes = 0;
          let quizMinutes = 0;
          let tutorMinutes = 0;
          const scores: number[] = [];

          for (const act of dayActs) {
            if (act.type === "Study Hub" || act.type === "Quick Ask") studyHubMinutes += act.minutes;
            else if (act.type === "Smart Quiz") quizMinutes += act.minutes;
            else if (act.type === "Live Tutor") tutorMinutes += act.minutes;
            if (typeof act.scorePercent === "number") scores.push(act.scorePercent);
          }

          const avgScore =
            scores.length > 0
              ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
              : null;

          return {
            ...day,
            studyHubMinutes,
            quizMinutes,
            tutorMinutes,
            totalMinutes: studyHubMinutes + quizMinutes + tutorMinutes,
            quizScore: avgScore,
            masteryIndex: avgScore ?? day.masteryIndex,
            sessionsCount: dayActs.length,
          };
        });

  const totalMinutes = series.reduce((sum, d) => sum + d.totalMinutes, 0);
  const activeDays = series.filter((d) => d.totalMinutes > 0).length;
  const avgDailyMinutes = series.length > 0 ? Math.round(totalMinutes / series.length) : 0;

  const scoredDays = series.filter((d) => d.quizScore !== null) as Array<
    DailyStudyEntry & { quizScore: number }
  >;
  const avgQuizScore =
    scoredDays.length > 0
      ? Number(
          (scoredDays.reduce((sum, d) => sum + d.quizScore, 0) / scoredDays.length).toFixed(1)
        )
      : null;

  // Performance delta: compare second half vs first half of scored days in window
  let performanceDelta: number | null = null;
  if (scoredDays.length >= 2) {
    const mid = Math.floor(scoredDays.length / 2);
    const firstHalf = scoredDays.slice(0, mid);
    const secondHalf = scoredDays.slice(mid);
    const avgFirst = firstHalf.reduce((s, d) => s + d.quizScore, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, d) => s + d.quizScore, 0) / secondHalf.length;
    performanceDelta = Number((avgSecond - avgFirst).toFixed(1));
  }

  const totalSessions = series.reduce((sum, d) => sum + d.sessionsCount, 0);

  // Study streak from most recent day backwards
  let streakDays = 0;
  for (let i = data.daily.length - 1; i >= 0; i--) {
    if (data.daily[i].totalMinutes > 0) streakDays += 1;
    else break;
  }

  // Subject breakdown across window (regardless of subjectFilter for comparison chart, or highlighted)
  const subjectMap = new Map<
    string,
    { subject: string; shortName: string; minutes: number; scores: number[]; sessions: number }
  >();
  for (const act of data.activities) {
    if (act.date < cutoffDate) continue;
    const existing = subjectMap.get(act.subject) || {
      subject: act.subject,
      shortName: act.subject
        .replace("Higher Mathematics", "Higher Math")
        .replace("ICT & Computer Science", "ICT & CS")
        .replace("English & IELTS", "English/IELTS"),
      minutes: 0,
      scores: [],
      sessions: 0,
    };
    existing.minutes += act.minutes;
    existing.sessions += 1;
    if (typeof act.scorePercent === "number") existing.scores.push(act.scorePercent);
    subjectMap.set(act.subject, existing);
  }

  const subjectBreakdown = Array.from(subjectMap.values())
    .map((item) => ({
      subject: item.subject,
      shortName: item.shortName,
      minutes: item.minutes,
      avgScore:
        item.scores.length > 0
          ? Math.round(item.scores.reduce((s, v) => s + v, 0) / item.scores.length)
          : 78,
      sessions: item.sessions,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    series,
    activitiesInWindow,
    totalMinutes,
    activeDays,
    avgDailyMinutes,
    avgQuizScore,
    performanceDelta,
    totalSessions,
    streakDays,
    subjectBreakdown,
  };
}
