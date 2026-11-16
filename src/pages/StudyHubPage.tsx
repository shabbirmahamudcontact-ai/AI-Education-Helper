import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  Download,
  Loader2,
  RotateCw,
  Send,
  Sparkles,
} from "lucide-react";
import {
  AppSettings,
  FontPreset,
  StudyExplainResponse,
  StudyLanguage,
  StudyMode,
} from "../types";
import {
  FONT_PRESETS,
  getActiveModelId,
  requestStudyExplanation,
} from "../services/api";
import { RichTextRenderer } from "../components/RichTextRenderer";
import { useToast } from "../components/ToastProvider";
import { recordLearningActivity } from "../services/learningAnalytics";

interface StudyHubPageProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  initialTopic?: string;
  onConsumeInitialTopic?: () => void;
}

const SUBJECTS = [
  "Physics",
  "Chemistry",
  "Biology",
  "Higher Mathematics",
  "English & IELTS",
  "Bangla Literature & Grammar",
  "ICT & Computer Science",
  "Economics & Accounting",
  "General Knowledge & BCS",
];

const STUDENT_LEVELS = [
  "SSC (Class 9–10)",
  "HSC (Class 11–12)",
  "University Admission & Undergrad",
  "IELTS Candidate",
  "Job & BCS Exam",
];

const STUDY_MODES: StudyMode[] = ["Summary", "Detailed", "Flashcards"];
const LANGUAGE_OPTIONS: { id: StudyLanguage; label: string }[] = [
  { id: "Auto", label: "Auto" },
  { id: "English", label: "English" },
  { id: "Bengali", label: "বাংলা" },
];

const SAMPLE_TOPICS = [
  { label: "Thermodynamics 2nd Law", subject: "Physics", level: "HSC (Class 11–12)" },
  { label: "সালোকসংশ্লেষণ (Photosynthesis)", subject: "Biology", level: "SSC (Class 9–10)" },
  { label: "IELTS Writing Task 2 Cohesion", subject: "English & IELTS", level: "IELTS Candidate" },
  { label: "Binary Search & Time Complexity", subject: "ICT & Computer Science", level: "University Admission & Undergrad" },
];

export const StudyHubPage: React.FC<StudyHubPageProps> = ({
  settings,
  onUpdateSettings,
  initialTopic,
  onConsumeInitialTopic,
}) => {
  const { showToast } = useToast();
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [level, setLevel] = useState(STUDENT_LEVELS[1]);
  const [topic, setTopic] = useState(initialTopic || "");
  const [mode, setMode] = useState<StudyMode>("Detailed");
  const [language, setLanguage] = useState<StudyLanguage>("Auto");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudyExplainResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
      onConsumeInitialTopic?.();
    }
  }, [initialTopic, onConsumeInitialTopic]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setError("Please enter a topic, chapter concept, or question in the topic box.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setFlippedCards({});

    try {
      const response = await requestStudyExplanation(
        { subject, level, topic: cleanTopic, mode, language },
        settings
      );
      setResult(response);
      recordLearningActivity({
        type: "Study Hub",
        subject,
        topic: cleanTopic.slice(0, 70),
        minutes: mode === "Detailed" ? 20 : 12,
      });
      showToast(`${mode} study guide generated!`, "ai");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate explanation.");
    } finally {
      setIsLoading(false);
    }
  };

  const adjustReadingScale = (delta: number) => {
    const nextScale = Math.min(1.25, Math.max(0.9, Number((settings.readingScale + delta).toFixed(2))));
    onUpdateSettings({ ...settings, readingScale: nextScale });
  };

  const cycleFontPreset = () => {
    const order: FontPreset[] = ["editorial", "geometric", "academic"];
    const nextIdx = (order.indexOf(settings.fontPreset) + 1) % order.length;
    const nextPreset = order[nextIdx];
    onUpdateSettings({ ...settings, fontPreset: nextPreset });
    showToast(`Font changed to ${FONT_PRESETS[nextPreset].label}`, "info");
  };

  const buildPlainTextNotes = (): string => {
    if (!result) return "";
    if (result.mode === "Flashcards" && result.flashcards) {
      const cardsText = result.flashcards.cards
        .map(
          (card, idx) =>
            `Card ${idx + 1}\nFront: ${card.front}\nBack: ${card.back}\nHint: ${card.hint}\n`
        )
        .join("\n");
      return `# ${result.flashcards.title}\nSubject: ${subject} | Level: ${level}\n\n${result.flashcards.summaryNote}\n\n${cardsText}`;
    }
    return `# ${topic.trim()}\nSubject: ${subject} | Level: ${level} | Mode: ${result.mode}\n\n${result.content}`;
  };

  const handleCopy = async () => {
    const text = buildPlainTextNotes();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast("Study notes copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard access was blocked by your browser. Please select and copy manually.");
    }
  };

  const handleDownloadNotes = () => {
    const text = buildPlainTextNotes();
    if (!text) return;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeFileName = (topic.trim() || "edugenius-notes")
      .toLowerCase()
      .replace(/[^\w\u0980-\u09FF-]+/g, "-")
      .slice(0, 48);
    link.href = url;
    link.download = `${safeFileName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded Markdown study notes!", "success");
  };

  const toggleCardFlip = (idx: number) => {
    setFlippedCards((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] tracking-tight">
            AI Study Hub
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Break down complex concepts into clear definitions, real-world analogies, and practical examples.
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs font-mono text-[#7C3AED] whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Model: <strong className="text-[#1E1B4B]">{getActiveModelId(settings)}</strong></span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Control Panel */}
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm"
        >
          <div className="space-y-1.5">
            <label htmlFor="study-subject" className="block text-sm font-semibold text-[#1E1B4B]">
              Subject
            </label>
            <select
              id="study-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15 transition-colors"
            >
              {SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="study-level" className="block text-sm font-semibold text-[#1E1B4B]">
              Student Level
            </label>
            <select
              id="study-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#1E1B4B] focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15 transition-colors"
            >
              {STUDENT_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-[#1E1B4B]">Explanation Mode</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#F8FAFC] border border-slate-200 rounded-xl" role="group" aria-label="Explanation mode">
                {STUDY_MODES.map((m) => {
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`relative py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        active ? "text-white" : "text-slate-600 hover:text-[#1E1B4B]"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="studyModePill"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-lg bg-[#4338CA] shadow-xs"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10">{m}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-semibold text-[#1E1B4B]">Output Language</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#F8FAFC] border border-slate-200 rounded-xl" role="group" aria-label="Output language">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const active = language === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setLanguage(lang.id)}
                      className={`relative py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        active ? "text-white" : "text-slate-600 hover:text-[#1E1B4B]"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="studyLangPill"
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
          </div>

          <div className="space-y-1.5">
            <label htmlFor="study-topic" className="block text-sm font-semibold text-[#1E1B4B]">
              Topic or Question (English or বাংলা)
            </label>
            <textarea
              id="study-topic"
              rows={4}
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Explain Faraday's Law of Electromagnetic Induction or বাংলা ব্যাকরণে সমাসের প্রকারভেদ বোঝাও"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15 resize-y transition-colors"
            />
          </div>

          {/* Sample Topic Quick Picks */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#1E1B4B]">Quick sample topics:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TOPICS.map((item) => (
                <motion.button
                  key={item.label}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSubject(item.subject);
                    setLevel(item.level);
                    setTopic(item.label);
                    setError(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-[#F8FAFC] hover:border-[#4338CA] hover:text-[#4338CA] text-xs font-medium text-[#1E1B4B] transition-colors cursor-pointer"
                >
                  {item.label}
                </motion.button>
              ))}
            </div>
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

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#4338CA] to-[#7C3AED] hover:shadow-[0_10px_28px_-8px_rgba(124,58,237,0.55)] disabled:opacity-60 transition-all shadow-sm cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Generating {mode}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Generate Explanation</span>
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              </>
            )}
          </motion.button>
        </form>

        {/* Right Output Display */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[460px] flex flex-col overflow-hidden">
          <div className="px-6 py-4 bg-[#1E1B4B] text-white flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Study Output</h2>
                {result && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C4B5FD]">
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    <span>AI-Generated {result.mode}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {subject} · {level} · {mode}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Live Dynamic Font Controls */}
              <div className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => adjustReadingScale(-0.05)}
                  disabled={settings.readingScale <= 0.9}
                  title="Decrease reading font size"
                  className="px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-40 cursor-pointer"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={cycleFontPreset}
                  title={`Switch font style (Current: ${FONT_PRESETS[settings.fontPreset].label})`}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-200 border-x border-white/15 hover:bg-white/15 cursor-pointer whitespace-nowrap"
                >
                  {FONT_PRESETS[settings.fontPreset].label.split(" ")[0]}
                </button>
                <button
                  type="button"
                  onClick={() => adjustReadingScale(0.05)}
                  disabled={settings.readingScale >= 1.25}
                  title="Increase reading font size"
                  className="px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-40 cursor-pointer"
                >
                  A+
                </button>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                disabled={!result}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" aria-hidden="true" />
                    <span className="text-[#10B981]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy Answer</span>
                  </>
                )}
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadNotes}
                disabled={!result}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#4338CA] hover:bg-[#4F46E5] text-xs font-semibold text-white disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download Notes</span>
              </motion.button>
            </div>
          </div>

          <div className="p-6 flex-1 bg-white">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 py-4"
                >
                  <div className="flex items-center gap-3 text-sm font-semibold text-[#7C3AED]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Crafting structured {mode.toLowerCase()} study guide via Gemini...</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="h-5 w-48 rounded-md bg-slate-200 skeleton-shimmer" />
                      <div className="h-3.5 w-full rounded bg-slate-100 skeleton-shimmer" />
                      <div className="h-3.5 w-5/6 rounded bg-slate-100 skeleton-shimmer" />
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="h-5 w-44 rounded-md bg-slate-200 skeleton-shimmer" />
                      <div className="h-3.5 w-full rounded bg-slate-100 skeleton-shimmer" />
                      <div className="h-3.5 w-3/4 rounded bg-slate-100 skeleton-shimmer" />
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="h-5 w-40 rounded-md bg-slate-200 skeleton-shimmer" />
                      <div className="h-3.5 w-11/12 rounded bg-slate-100 skeleton-shimmer" />
                    </div>
                  </div>
                </motion.div>
              ) : !result ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[340px] flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto"
                >
                  <span className="w-12 h-12 rounded-2xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
                    <BookOpen className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-[#1E1B4B]">Ready to Explain Any Topic</p>
                    <p className="text-sm text-slate-600">
                      Choose your subject, level, mode, and language on the left, then click{" "}
                      <span className="font-semibold text-[#4338CA]">Generate Explanation</span>.
                    </p>
                  </div>
                </motion.div>
              ) : result.mode === "Flashcards" && result.flashcards ? (
                <motion.div
                  key="flashcards"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[#1E1B4B]">{result.flashcards.title}</h3>
                    <p className="text-sm text-slate-600">{result.flashcards.summaryNote}</p>
                  </div>

                  {/* True 3D Flip Flashcards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {result.flashcards.cards.map((card, idx) => {
                      const isFlipped = Boolean(flippedCards[idx]);
                      return (
                        <div key={idx} className="perspective-1100 min-h-[185px]">
                          <motion.button
                            type="button"
                            onClick={() => toggleCardFlip(idx)}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                            style={{ transformStyle: "preserve-3d" }}
                            className="relative w-full h-full min-h-[185px] text-left cursor-pointer"
                          >
                            {/* Front Face */}
                            <div
                              style={{ backfaceVisibility: "hidden" }}
                              className="absolute inset-0 p-5 rounded-xl border-2 border-slate-200 hover:border-[#4338CA]/60 bg-[#F8FAFC] flex flex-col justify-between shadow-xs"
                            >
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                <span className="tabular-nums text-[#1E1B4B]">Card {idx + 1}</span>
                                <span className="inline-flex items-center gap-1 text-[#4338CA]">
                                  <RotateCw className="w-3 h-3" aria-hidden="true" />
                                  <span>Flip</span>
                                </span>
                              </div>
                              <p className="reading-prose font-semibold text-[#1E1B4B] my-2 line-clamp-4">
                                {card.front}
                              </p>
                              <p className="pt-2 border-t border-slate-200/70 text-xs text-slate-500 truncate">
                                Hint: {card.hint}
                              </p>
                            </div>

                            {/* Back Face */}
                            <div
                              style={{
                                backfaceVisibility: "hidden",
                                transform: "rotateY(180deg)",
                              }}
                              className="absolute inset-0 p-5 rounded-xl border-2 border-[#4338CA] bg-indigo-50/75 flex flex-col justify-between shadow-sm"
                            >
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="tabular-nums text-[#1E1B4B]">Card {idx + 1}</span>
                                <span className="inline-flex items-center gap-1 text-[#7C3AED]">
                                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                                  <span>AI Answer</span>
                                </span>
                              </div>
                              <p className="reading-prose font-medium text-[#1E1B4B] my-2 overflow-y-auto">
                                {card.back}
                              </p>
                              <p className="pt-2 border-t border-[#4338CA]/20 text-xs text-[#4338CA] font-medium">
                                Click to flip back
                              </p>
                            </div>
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24 }}
                >
                  <RichTextRenderer content={result.content} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
