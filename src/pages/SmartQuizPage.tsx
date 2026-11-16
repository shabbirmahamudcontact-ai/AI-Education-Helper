import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { AppSettings, QuizPayload, StudyLanguage } from "../types";
import { getActiveModelId, requestQuizGeneration } from "../services/api";
import { useToast } from "../components/ToastProvider";
import { recordLearningActivity } from "../services/learningAnalytics";

interface SmartQuizPageProps {
  settings: AppSettings;
}

const QUIZ_SUBJECTS = [
  "Physics",
  "Chemistry",
  "Biology",
  "Higher Mathematics",
  "English & IELTS",
  "Bangla Literature & Grammar",
  "ICT & Computer Science",
  "General Knowledge & BCS",
];

const OPTION_LABELS = ["A", "B", "C", "D"];

const LANGUAGE_OPTIONS: { id: StudyLanguage; label: string }[] = [
  { id: "Auto", label: "Auto" },
  { id: "English", label: "English" },
  { id: "Bengali", label: "বাংলা" },
];

const SAMPLE_QUIZ_TOPICS = [
  { label: "Newton's Laws of Motion", subject: "Physics" },
  { label: "বাংলা সাহিত্যের যুগ বিভাগ", subject: "Bangla Literature & Grammar" },
  { label: "Organic Chemistry Functional Groups", subject: "Chemistry" },
  { label: "English Grammar: Conditionals & Modals", subject: "English & IELTS" },
];

const CELEBRATION_DOTS = [
  { x: -110, y: -38, color: "#10B981", delay: 0 },
  { x: -65, y: -56, color: "#7C3AED", delay: 0.05 },
  { x: -20, y: -48, color: "#4338CA", delay: 0.1 },
  { x: 30, y: -58, color: "#10B981", delay: 0.06 },
  { x: 80, y: -44, color: "#7C3AED", delay: 0.12 },
  { x: 120, y: -30, color: "#4338CA", delay: 0.08 },
];

export const SmartQuizPage: React.FC<SmartQuizPageProps> = ({ settings }) => {
  const { showToast } = useToast();
  const [subject, setSubject] = useState(QUIZ_SUBJECTS[0]);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<5 | 10>(5);
  const [language, setLanguage] = useState<StudyLanguage>("Auto");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showDashboard, setShowDashboard] = useState(false);

  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const totalQuestions = quiz?.questions.length || 0;
  const correctCount = quiz
    ? quiz.questions.reduce((sum, q, idx) => sum + (answers[idx] === q.correctIndex ? 1 : 0), 0)
    : 0;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  useEffect(() => {
    if (!showDashboard) {
      setAnimatedScore(0);
      setAnimatedPercent(0);
      return;
    }

    const durationMs = 550;
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(correctCount * eased));
      setAnimatedPercent(Math.round(scorePercent * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [showDashboard, correctCount, scorePercent]);

  const handleGenerateQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setError("Please enter a quiz topic before generating questions.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setQuiz(null);
    setCurrentIndex(0);
    setAnswers({});
    setShowDashboard(false);

    try {
      const payload = await requestQuizGeneration(
        { subject, topic: cleanTopic, count, language },
        settings
      );
      setQuiz(payload);
      showToast(`${payload.questions.length}-question quiz ready!`, "ai");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (answers[questionIdx] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [questionIdx]: optionIdx }));
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentIndex + 1 < quiz.questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowDashboard(true);
      recordLearningActivity({
        type: "Smart Quiz",
        subject: quiz.subject,
        topic: quiz.quizTitle,
        minutes: totalQuestions === 10 ? 18 : 10,
        scorePercent,
      });
      showToast(`Quiz completed: ${correctCount}/${totalQuestions} correct`, "success");
    }
  };

  const handleReattempt = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowDashboard(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] tracking-tight">
            Smart AI Quiz
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Dynamically generated MCQs with instant answer validation and detailed explanations.
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs font-mono text-[#7C3AED] whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Model: <strong className="text-[#1E1B4B]">{getActiveModelId(settings)}</strong></span>
        </p>
      </div>

      {/* Quiz Configuration Card */}
      <form
        onSubmit={handleGenerateQuiz}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3 space-y-1.5">
            <label htmlFor="quiz-subject" className="block text-sm font-semibold text-[#1E1B4B]">
              Subject
            </label>
            <select
              id="quiz-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15 transition-colors"
            >
              {QUIZ_SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label htmlFor="quiz-topic" className="block text-sm font-semibold text-[#1E1B4B]">
              Quiz Topic
            </label>
            <input
              id="quiz-topic"
              type="text"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Projectile Motion or ইংরেজি Grammar Tense"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15 transition-colors"
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <span className="block text-sm font-semibold text-[#1E1B4B]">Language</span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#F8FAFC] border border-slate-200 rounded-xl" role="group" aria-label="Quiz language">
              {LANGUAGE_OPTIONS.map((lang) => {
                const active = language === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setLanguage(lang.id)}
                    className={`relative py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      active ? "text-white" : "text-slate-600 hover:text-[#1E1B4B]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="quizLangPill"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-[#4338CA] shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <span className="block text-sm font-semibold text-[#1E1B4B]">Questions</span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F8FAFC] border border-slate-200 rounded-xl" role="group" aria-label="Question count">
              {([5, 10] as const).map((n) => {
                const active = count === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`relative py-2 rounded-lg text-sm font-semibold tabular-nums transition-colors cursor-pointer ${
                      active ? "text-white" : "text-slate-600 hover:text-[#1E1B4B]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="quizCountPill"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-[#4338CA] shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#1E1B4B] font-semibold">Sample topics:</span>
            {SAMPLE_QUIZ_TOPICS.map((item) => (
              <motion.button
                key={item.label}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSubject(item.subject);
                  setTopic(item.label);
                  setError(null);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-[#F8FAFC] hover:border-[#4338CA] hover:text-[#4338CA] text-[#1E1B4B] font-medium transition-colors cursor-pointer"
              >
                {item.label}
              </motion.button>
            ))}
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#4338CA] to-[#7C3AED] hover:shadow-[0_10px_28px_-8px_rgba(124,58,237,0.55)] disabled:opacity-60 transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Creating Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Generate Quiz</span>
              </>
            )}
          </motion.button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-5">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#7C3AED]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Building your {count}-question quiz on "{topic}" via Gemini AI...</span>
          </div>
          <div className="h-6 w-3/4 rounded-md bg-slate-200 skeleton-shimmer" />
          <div className="space-y-3 pt-2">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="h-13 w-full rounded-xl bg-slate-100 skeleton-shimmer" />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !quiz && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center space-y-3">
          <span className="w-12 h-12 rounded-2xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6" aria-hidden="true" />
          </span>
          <p className="text-base font-bold text-[#1E1B4B]">No Active Quiz Yet</p>
          <p className="text-sm text-slate-600 max-w-md">
            Enter a subject and topic above, choose 5 or 10 questions, and click{" "}
            <span className="font-semibold text-[#4338CA]">Generate Quiz</span> to begin.
          </p>
        </div>
      )}

      {/* Active Quiz Question Stage */}
      {!isLoading && quiz && !showDashboard && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Primary Dark Quiz Header */}
          <div className="px-6 sm:px-8 py-4 bg-[#1E1B4B] text-white flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4B5FD]">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>AI-Generated Quiz · {quiz.subject}</span>
              </p>
              <h2 className="text-lg font-bold text-white">{quiz.quizTitle}</h2>
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold tabular-nums">
              <span className="text-slate-200">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="text-[#10B981]">
                Score: {correctCount}/{Object.keys(answers).length}
              </span>
            </div>
          </div>

          {/* Animated Success Emerald Quiz Progress Bar */}
          <div className="w-full h-2 bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full bg-[#10B981]"
              initial={false}
              animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {(() => {
                const q = quiz.questions[currentIndex];
                const selectedOption = answers[currentIndex];
                const hasAnswered = selectedOption !== undefined;
                const isLastQuestion = currentIndex + 1 === totalQuestions;

                return (
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-6"
                  >
                    <p className="reading-prose text-lg sm:text-xl font-bold text-[#1E1B4B] leading-snug">
                      {currentIndex + 1}. {q.question}
                    </p>

                    <div className="space-y-3">
                      {q.options.map((optText, optIdx) => {
                        const isSelected = selectedOption === optIdx;
                        const isCorrectOption = q.correctIndex === optIdx;

                        let cardClasses =
                          "border-slate-200 bg-white hover:border-[#4338CA] hover:bg-[#4338CA]/5 hover:shadow-xs text-[#1E1B4B]";
                        let statusTag: React.ReactNode = null;

                        if (hasAnswered) {
                          if (isCorrectOption) {
                            cardClasses = "border-[#10B981] bg-[#10B981]/10 text-[#1E1B4B]";
                            statusTag = (
                              <motion.span
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 450, damping: 22 }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#10B981] shrink-0"
                              >
                                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                                <span>Correct</span>
                              </motion.span>
                            );
                          } else if (isSelected && !isCorrectOption) {
                            cardClasses = "border-red-500 bg-red-50 text-[#1E1B4B]";
                            statusTag = (
                              <motion.span
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 450, damping: 22 }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-red-600 shrink-0"
                              >
                                <XCircle className="w-4 h-4" aria-hidden="true" />
                                <span>Incorrect</span>
                              </motion.span>
                            );
                          } else {
                            cardClasses = "border-slate-200 bg-[#F8FAFC] text-slate-500";
                          }
                        }

                        return (
                          <motion.button
                            key={optIdx}
                            type="button"
                            disabled={hasAnswered}
                            whileHover={!hasAnswered ? { x: 3 } : undefined}
                            whileTap={!hasAnswered ? { scale: 0.99 } : undefined}
                            onClick={() => handleSelectOption(currentIndex, optIdx)}
                            className={`w-full text-left px-4 py-3.5 min-h-[52px] rounded-xl border-2 transition-colors duration-150 flex items-center justify-between gap-4 ${cardClasses} ${
                              hasAnswered ? "cursor-default" : "cursor-pointer"
                            }`}
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                  hasAnswered && isCorrectOption
                                    ? "bg-[#10B981] text-white"
                                    : hasAnswered && isSelected && !isCorrectOption
                                    ? "bg-red-600 text-white"
                                    : "bg-[#F8FAFC] border border-slate-200 text-[#1E1B4B]"
                                }`}
                              >
                                {OPTION_LABELS[optIdx]}
                              </span>
                              <span className="reading-prose font-medium leading-relaxed">
                                {optText}
                              </span>
                            </div>
                            {statusTag}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Detailed AI Answer Explanation */}
                    {hasAnswered && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2"
                      >
                        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C3AED]">
                          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>
                            AI Explanation · Correct Answer: {OPTION_LABELS[q.correctIndex]}
                          </span>
                        </p>
                        <p className="reading-prose text-[#1E1B4B] leading-relaxed">
                          {q.explanation}
                        </p>
                      </motion.div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleReattempt}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#4338CA] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Restart Quiz</span>
                      </button>

                      {hasAnswered && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={handleNext}
                          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer shadow-sm ${
                            isLastQuestion
                              ? "bg-[#10B981] hover:bg-[#059669]"
                              : "bg-[#4338CA] hover:bg-[#4F46E5]"
                          }`}
                        >
                          <span>
                            {isLastQuestion ? "Submit & View Final Score" : "Next Question"}
                          </span>
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Final Score Dashboard with Animated Counter & Subtle Completion Celebration */}
      {!isLoading && quiz && showDashboard && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="space-y-6"
        >
          <div className="relative bg-[#1E1B4B] text-white rounded-2xl border border-[#1E1B4B] shadow-md p-6 sm:p-8 space-y-5 overflow-hidden">
            {/* Subtle Completion Celebration Burst (for >= 60%) */}
            {scorePercent >= 60 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-14 left-36 hidden sm:block"
              >
                {CELEBRATION_DOTS.map((dot, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                    animate={{ opacity: [0, 1, 0], x: dot.x, y: dot.y, scale: [0.4, 1.1, 0.6] }}
                    transition={{ duration: 1.1, delay: dot.delay, ease: "easeOut" }}
                    style={{ backgroundColor: dot.color }}
                    className="absolute w-2.5 h-2.5 rounded-full"
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#10B981]">
                  <Award className="w-5 h-5" aria-hidden="true" />
                  <span>Quiz Completed · {quiz.quizTitle}</span>
                </div>
                <h2 className="text-3xl font-extrabold text-white tabular-nums">
                  {animatedScore} / {totalQuestions} Correct ({animatedPercent}%)
                </h2>
                <p className="text-sm text-slate-300 max-w-xl">
                  {scorePercent >= 80
                    ? "Outstanding mastery! Review any missed explanations below to lock in full marks."
                    : scorePercent >= 50
                    ? "Solid progress. Study the explanations for missed questions and re-attempt to boost your score."
                    : "Great diagnostic run. Read each explanation carefully, then re-attempt the quiz."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReattempt}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4338CA] hover:bg-[#4F46E5] transition-colors cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Re-attempt Quiz</span>
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    setQuiz(null);
                    setShowDashboard(false);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 text-sm font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <span>New Quiz</span>
                </button>
              </div>
            </div>

            {/* Animated Score Progress Bar in Success Emerald */}
            <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden relative z-10">
              <motion.div
                className="h-full bg-[#10B981]"
                initial={{ width: "0%" }}
                animate={{ width: `${scorePercent}%` }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* Full Answer Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1E1B4B]">Answer Key & Explanations</h3>
            {quiz.questions.map((q, idx) => {
              const userChoice = answers[idx];
              const isCorrect = userChoice === q.correctIndex;
              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.2) }}
                  className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-base font-bold text-[#1E1B4B]">
                      {idx + 1}. {q.question}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold shrink-0 ${
                        isCorrect ? "text-[#10B981]" : "text-red-600"
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          <span>Correct</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" aria-hidden="true" />
                          <span>Incorrect</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <p className="text-slate-600">
                      Your answer:{" "}
                      <span className="font-semibold text-[#1E1B4B]">
                        {userChoice !== undefined
                          ? `${OPTION_LABELS[userChoice]}. ${q.options[userChoice]}`
                          : "Not answered"}
                      </span>
                    </p>
                    <p className="text-[#10B981] font-semibold">
                      Correct answer: {OPTION_LABELS[q.correctIndex]}. {q.options[q.correctIndex]}
                    </p>
                  </div>

                  <p className="reading-prose text-[#1E1B4B] bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                    {q.explanation}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};
