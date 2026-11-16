import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import { AppSettings, PageId } from "../types";
import { requestStudyExplanation } from "../services/api";
import { RichTextRenderer } from "../components/RichTextRenderer";
import { Hero3DStage } from "../components/Hero3DStage";
import { TiltCard3D } from "../components/TiltCard3D";
import { useToast } from "../components/ToastProvider";
import { LearningInsightsDashboard } from "../components/LearningInsightsDashboard";
import { recordLearningActivity } from "../services/learningAnalytics";

interface HomePageProps {
  settings: AppSettings;
  onNavigate: (page: PageId) => void;
  onOpenInStudyHub: (topic: string) => void;
}

type ExamTrack = "SSC" | "HSC" | "University" | "IELTS" | "Job / BCS";

const TRACK_PROMPTS: Record<ExamTrack, string[]> = {
  SSC: [
    "সালোকসংশ্লেষণ প্রক্রিয়া সহজ উদাহরণসহ বোঝাও",
    "Explain Ohm's Law with a real-life analogy",
    "বাংলা ব্যাকরণে কারক ও বিভক্তি চেনার সহজ উপায়",
  ],
  HSC: [
    "Explain Newton's 2nd Law with a cricket analogy",
    "জৈব রসায়নে অ্যালকেন ও অ্যালকিনের পার্থক্য বোঝাও",
    "Derive Projectile Motion maximum height clearly",
  ],
  University: [
    "Explain Big-O Time Complexity with everyday examples",
    "Macroeconomics: Fiscal vs Monetary Policy",
    "Linear Algebra: What are Eigenvalues intuitively?",
  ],
  IELTS: [
    "How to structure an IELTS Band 8 Task 2 essay?",
    "IELTS Reading: True / False / Not Given strategy",
    "High-impact vocabulary for IELTS Speaking Part 3",
  ],
  "Job / BCS": [
    "বাংলাদেশের সংবিধানের মূলনীতিসমূহ সংক্ষেপে বোঝাও",
    "Percentage & Profit-Loss shortcut formulas with examples",
    "English Idioms & Prepositions commonly asked in BCS",
  ],
};

const TRACKS: ExamTrack[] = ["SSC", "HSC", "University", "IELTS", "Job / BCS"];

export const HomePage: React.FC<HomePageProps> = ({
  settings,
  onNavigate,
  onOpenInStudyHub,
}) => {
  const { showToast } = useToast();
  const [selectedTrack, setSelectedTrack] = useState<ExamTrack>("HSC");
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickAnswer, setQuickAnswer] = useState<string | null>(null);
  const [lastAskedTopic, setLastAskedTopic] = useState("");
  const [studyImgFailed, setStudyImgFailed] = useState(false);
  const [tutorImgFailed, setTutorImgFailed] = useState(false);

  const handleAskAi = async (e?: React.FormEvent, overrideQuestion?: string) => {
    if (e) e.preventDefault();
    const promptText = (overrideQuestion ?? question).trim();
    if (!promptText) {
      setError("Please enter a question or topic to ask EduGenius AI.");
      return;
    }

    if (overrideQuestion) {
      setQuestion(overrideQuestion);
    }

    setError(null);
    setIsLoading(true);
    setQuickAnswer(null);

    try {
      const result = await requestStudyExplanation(
        {
          subject: "General Studies",
          level: selectedTrack,
          topic: promptText,
          mode: "Summary",
        },
        settings
      );
      setQuickAnswer(result.content);
      setLastAskedTopic(promptText);
      recordLearningActivity({
        type: "Quick Ask",
        subject: selectedTrack === "IELTS" ? "English & IELTS" : "Physics",
        topic: promptText.slice(0, 60),
        minutes: 8,
      });
      showToast("Instant concept summary generated!", "ai");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch AI answer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-20 pb-20 bg-[#F8FAFC] overflow-x-clip">
      {/* Hero Section with Animated Ambient Background & 3D Interactive Stage */}
      <section className="relative pt-10 sm:pt-14 lg:pt-16 pb-6">
        {/* Subtle Animated Background Layer */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-edu-grid opacity-75 [mask-image:linear-gradient(to_bottom,white_60%,transparent)]" />
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#4338CA]/10 blur-3xl animate-orb-glow" />
          <div className="hidden sm:block absolute top-12 right-0 w-96 h-96 rounded-full bg-[#7C3AED]/10 blur-3xl animate-orb-glow [animation-delay:1.5s]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Headline, Description, Track Switcher & Ask AI Input */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 flex flex-col justify-center space-y-6"
            >
              <div className="space-y-4">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#7C3AED]">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Apex Edutech Labs Inc. · AI-Powered Bilingual Mentor</span>
                </p>
                <h1 className="text-[clamp(2.35rem,4.3vw,3.85rem)] font-extrabold leading-[1.08] tracking-tight text-[#1E1B4B]">
                  Learn Anything 3X Faster with AI
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                  Structured concept breakdowns, dynamic exam quizzes, and live bilingual tutoring
                  crafted for SSC, HSC, University, IELTS, and Job exam learners.
                </p>
              </div>

              {/* Dynamic Exam Track Selector with Shared Layout Pill */}
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl w-fit shadow-xs">
                  {TRACKS.map((track) => {
                    const active = selectedTrack === track;
                    return (
                      <button
                        key={track}
                        type="button"
                        onClick={() => setSelectedTrack(track)}
                        className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          active ? "text-white" : "text-slate-600 hover:text-[#1E1B4B]"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="homeTrackPill"
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                            className="absolute inset-0 rounded-lg bg-[#4338CA] shadow-xs"
                            aria-hidden="true"
                          />
                        )}
                        <span className="relative z-10">{track}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Ask AI Form */}
              <form onSubmit={(e) => handleAskAi(e)} className="space-y-3 max-w-2xl">
                <div className="flex flex-col sm:flex-row gap-2.5 p-2 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm focus-within:border-[#4338CA] focus-within:ring-2 focus-within:ring-[#4338CA]/15 transition-all">
                  <label htmlFor="hero-ask-input" className="sr-only">
                    Ask any study question
                  </label>
                  <input
                    id="hero-ask-input"
                    type="text"
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={`Ask ${selectedTrack} question — e.g., ${TRACK_PROMPTS[selectedTrack][0]}`}
                    className="flex-1 min-w-0 px-3.5 py-2.5 text-sm sm:text-base text-[#1E1B4B] placeholder:text-slate-400 bg-transparent focus:outline-none"
                  />
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#4338CA] to-[#7C3AED] hover:shadow-[0_8px_24px_-6px_rgba(124,58,237,0.5)] disabled:opacity-60 transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Thinking...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" aria-hidden="true" />
                        <span>Ask AI</span>
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Dynamic clickable sample prompts for the selected track */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedTrack}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500"
                  >
                    <span className="font-semibold text-[#1E1B4B]">{selectedTrack} topics:</span>
                    {TRACK_PROMPTS[selectedTrack].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => handleAskAi(undefined, sample)}
                        className="text-left font-medium text-[#4338CA] hover:text-[#7C3AED] hover:underline transition-colors cursor-pointer"
                      >
                        {sample}
                      </button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </form>

              {error && (
                <div
                  role="alert"
                  className="max-w-2xl flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {/* Loading Skeleton for Hero Ask AI */}
              {isLoading && (
                <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3">
                  <div className="h-4 w-44 rounded bg-slate-200 skeleton-shimmer" />
                  <div className="h-3.5 w-full rounded bg-slate-100 skeleton-shimmer" />
                  <div className="h-3.5 w-5/6 rounded bg-slate-100 skeleton-shimmer" />
                  <div className="h-3.5 w-2/3 rounded bg-slate-100 skeleton-shimmer" />
                </div>
              )}

              <AnimatePresence>
                {quickAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="max-w-2xl bg-white/95 backdrop-blur-md rounded-2xl border border-[#7C3AED]/25 shadow-md p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          <span>Answer Ready</span>
                        </span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED]">
                          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>AI-Generated Summary ({selectedTrack})</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenInStudyHub(lastAskedTopic)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4338CA] hover:text-[#7C3AED] whitespace-nowrap cursor-pointer"
                      >
                        <span>Open in AI Study Hub</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <RichTextRenderer content={quickAnswer} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right Column: Interactive 3D Hero Stage */}
            <div className="lg:col-span-5 flex items-center">
              <Hero3DStage selectedTrack={selectedTrack} />
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section aria-label="Platform Capabilities Summary" className="border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#1E1B4B] tabular-nums tracking-tight">
                50,000+
              </p>
              <p className="text-sm font-semibold text-[#1E1B4B]">Active Students</p>
              <p className="text-xs text-slate-600">Learning across SSC, HSC, Uni & IELTS</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#4338CA] tabular-nums tracking-tight">
                99.98%
              </p>
              <p className="text-sm font-semibold text-[#1E1B4B]">Verified Accuracy</p>
              <p className="text-xs text-slate-600">Structured explanations & checked answers</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#7C3AED] tabular-nums tracking-tight">
                3X
              </p>
              <p className="text-sm font-semibold text-[#1E1B4B]">Faster Concept Mastery</p>
              <p className="text-xs text-slate-600">Definition, analogy, and solved example</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#1E1B4B] tabular-nums tracking-tight">
                5 Tracks
              </p>
              <p className="text-sm font-semibold text-[#1E1B4B]">Exam Curricula</p>
              <p className="text-xs text-slate-600">English & বাংলা bilingual study support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Three 3D Interactive Feature Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.25 }}
          className="max-w-2xl space-y-2"
        >
          <p className="text-xs font-semibold text-[#7C3AED] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>AI-Powered Study Suite</span>
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] tracking-tight">
            Three Focused Tools for Deep Academic Retention
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Move smoothly from structured explanations to self-testing and real-time Socratic dialogue.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature Card 1: AI Study Hub */}
          <TiltCard3D delay={0}>
            <article className="h-full bg-white rounded-2xl border border-slate-200 group-hover:border-[#4338CA]/45 overflow-hidden flex flex-col shadow-xs transition-colors duration-200">
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden border-b border-slate-100">
                {!studyImgFailed ? (
                  <img
                    src="/src/assets/images/feature_study_notes_1794629636945.jpg"
                    alt="Structured physics and mathematics notebook with digital study notes"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => setStudyImgFailed(true)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#4338CA]/10 text-[#4338CA]">
                    <BookOpen className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5 relative z-20">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#7C3AED] inline-flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                    <span>01. AI Study Hub</span>
                  </p>
                  <h3 className="text-lg font-bold text-[#1E1B4B]">
                    Structured Notes & Flashcards
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Select your subject and level to generate Summary, Detailed, or interactive
                    Flashcard decks with one-click copy and Markdown download.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("study-hub")}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#4338CA] hover:text-[#7C3AED] transition-colors cursor-pointer whitespace-nowrap w-fit"
                >
                  <span>Open AI Study Hub</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </div>
            </article>
          </TiltCard3D>

          {/* Feature Card 2: Smart AI Quiz */}
          <TiltCard3D delay={0.07}>
            <article className="h-full bg-white rounded-2xl border border-slate-200 group-hover:border-[#4338CA]/45 overflow-hidden flex flex-col shadow-xs transition-colors duration-200">
              <div className="aspect-[4/3] bg-[#1E1B4B] p-6 flex flex-col justify-between text-white border-b border-slate-100 relative overflow-hidden">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#7C3AED]/25 blur-2xl"
                />
                <div className="flex items-center justify-between text-xs text-slate-300 relative z-10">
                  <span className="text-[#C4B5FD] font-semibold">AI MCQ Generator</span>
                  <span className="font-mono tabular-nums">5 or 10 Questions</span>
                </div>
                <div className="space-y-2.5 my-auto relative z-10">
                  <p className="text-sm font-semibold text-white">
                    Sample Check: Which law explains action-reaction force pairs?
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="px-3 py-2 rounded-lg bg-white/10 text-slate-200">
                      A. Newton's First Law
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-[#10B981]/20 border border-[#10B981] text-white flex items-center justify-between">
                      <span>C. Newton's Third Law</span>
                      <span className="font-semibold text-[#10B981]">Correct</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-300 relative z-10">Instant verification & detailed rationale</p>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5 relative z-20">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#7C3AED] inline-flex items-center gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                    <span>02. Smart AI Quiz</span>
                  </p>
                  <h3 className="text-lg font-bold text-[#1E1B4B]">
                    Dynamic Topic Assessments
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Generate fresh 5 or 10-question MCQs on any chapter with immediate green/red
                    feedback, deep explanations, and score review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("smart-quiz")}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#4338CA] hover:text-[#7C3AED] transition-colors cursor-pointer whitespace-nowrap w-fit"
                >
                  <span>Launch Smart Quiz</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </div>
            </article>
          </TiltCard3D>

          {/* Feature Card 3: Live AI Tutor */}
          <TiltCard3D delay={0.14}>
            <article className="h-full bg-white rounded-2xl border border-slate-200 group-hover:border-[#4338CA]/45 overflow-hidden flex flex-col shadow-xs transition-colors duration-200">
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden border-b border-slate-100">
                {!tutorImgFailed ? (
                  <img
                    src="/src/assets/images/feature_tutor_session_1794629636763.jpg"
                    alt="Student in a quiet contemporary study room working with a laptop tutor"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => setTutorImgFailed(true)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#7C3AED]/10 text-[#7C3AED]">
                    <MessageSquareText className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5 relative z-20">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#7C3AED] inline-flex items-center gap-1.5">
                    <MessageSquareText className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                    <span>03. Live AI Tutor</span>
                  </p>
                  <h3 className="text-lg font-bold text-[#1E1B4B]">
                    Real-Time Bilingual Dialogue
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Ask follow-up doubts in English or বাংলা, explore step-by-step problem solving,
                    and revisit saved conversation threads anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("live-tutor")}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#4338CA] hover:text-[#7C3AED] transition-colors cursor-pointer whitespace-nowrap w-fit"
                >
                  <span>Chat with Live Tutor</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </div>
            </article>
          </TiltCard3D>
        </div>
      </section>

      {/* Learning Insights Recharts Analytics Dashboard */}
      <LearningInsightsDashboard onNavigate={onNavigate} />
    </div>
  );
};
