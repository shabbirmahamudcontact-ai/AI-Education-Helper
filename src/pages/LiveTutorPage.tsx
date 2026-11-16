import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  Copy,
  History,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AppSettings, ChatMessage, ChatThread } from "../types";
import {
  CHAT_THREADS_STORAGE_KEY,
  getActiveModelId,
  streamTutorChat,
} from "../services/api";
import { RichTextRenderer } from "../components/RichTextRenderer";
import { useToast } from "../components/ToastProvider";
import { recordLearningActivity } from "../services/learningAnalytics";

interface LiveTutorPageProps {
  settings: AppSettings;
}

const QUICK_PROMPTS = [
  "Explain Newton's 2nd Law with a real-life cricket analogy",
  "নিউটনের দ্বিতীয় সূত্রটি সহজ বাংলায় উদাহরণসহ বোঝাও",
  "Help me structure an IELTS Writing Task 2 essay for Band 8",
  "Solve x² - 5x + 6 = 0 step by step and explain why factoring works",
];

function createNewThread(): ChatThread {
  return {
    id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: "New Study Session",
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

function loadSavedThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(CHAT_THREADS_STORAGE_KEY);
    if (!raw) return [createNewThread()];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [createNewThread()];
  } catch {
    return [createNewThread()];
  }
}

export const LiveTutorPage: React.FC<LiveTutorPageProps> = ({ settings }) => {
  const { showToast } = useToast();
  const [threads, setThreads] = useState<ChatThread[]>(loadSavedThreads);
  const [activeThreadId, setActiveThreadId] = useState<string>(() => loadSavedThreads()[0].id);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [waitingForFirstChunk, setWaitingForFirstChunk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread =
    threads.find((t) => t.id === activeThreadId) || threads[0] || createNewThread();

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_THREADS_STORAGE_KEY, JSON.stringify(threads));
    } catch {
      // ignore storage quota issues
    }
  }, [threads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread.messages.length, waitingForFirstChunk]);

  const handleCreateThread = () => {
    if (isStreaming) return;
    const fresh = createNewThread();
    setThreads((prev) => [fresh, ...prev]);
    setActiveThreadId(fresh.id);
    setError(null);
    setMobileHistoryOpen(false);
  };

  const handleDeleteThread = (id: string) => {
    if (isStreaming) return;
    setThreads((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fresh = createNewThread();
        setActiveThreadId(fresh.id);
        return [fresh];
      }
      if (activeThreadId === id) {
        setActiveThreadId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleClearCurrentChat = () => {
    if (isStreaming) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? { ...t, title: "New Study Session", messages: [], updatedAt: new Date().toISOString() }
          : t
      )
    );
    setError(null);
    showToast("Conversation cleared", "info");
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isStreaming) return;

    setError(null);
    if (!overrideText) setInput("");

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    const aiPlaceholderId = `msg_${Date.now()}_m`;
    const aiPlaceholder: ChatMessage = {
      id: aiPlaceholderId,
      role: "model",
      text: "",
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...activeThread.messages, userMsg];
    const updatedTitle =
      activeThread.messages.length === 0
        ? text.length > 40
          ? `${text.slice(0, 40)}...`
          : text
        : activeThread.title;

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? {
              ...t,
              title: updatedTitle,
              updatedAt: new Date().toISOString(),
              messages: [...nextMessages, aiPlaceholder],
            }
          : t
      )
    );

    setIsStreaming(true);
    setWaitingForFirstChunk(true);

    try {
      await streamTutorChat(
        nextMessages.map((m) => ({ role: m.role, text: m.text })),
        settings,
        (chunk) => {
          setWaitingForFirstChunk(false);
          setThreads((prev) =>
            prev.map((t) =>
              t.id === activeThread.id
                ? {
                    ...t,
                    messages: t.messages.map((m) =>
                      m.id === aiPlaceholderId ? { ...m, text: m.text + chunk } : m
                    ),
                  }
                : t
            )
          );
        }
      );
      const lower = text.toLowerCase();
      const inferredSubject =
        lower.includes("ielts") || lower.includes("essay") || lower.includes("grammar")
          ? "English & IELTS"
          : lower.includes("x²") || lower.includes("calculus") || lower.includes("solve") || lower.includes("math")
          ? "Higher Mathematics"
          : lower.includes("chem") || lower.includes("acid") || lower.includes("organic")
          ? "Chemistry"
          : lower.includes("bio") || lower.includes("cell") || lower.includes("সালোক")
          ? "Biology"
          : lower.includes("code") || lower.includes("binary") || lower.includes("sql")
          ? "ICT & Computer Science"
          : "Physics";
      recordLearningActivity({
        type: "Live Tutor",
        subject: inferredSubject,
        topic: text.slice(0, 65),
        minutes: 6,
      });
    } catch (err) {
      setWaitingForFirstChunk(false);
      const errMsg = err instanceof Error ? err.message : "Failed to get response from Live Tutor.";
      setError(errMsg);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id
            ? {
                ...t,
                messages: t.messages.filter((m) => !(m.id === aiPlaceholderId && m.text === "")),
              }
            : t
        )
      );
    } finally {
      setIsStreaming(false);
      setWaitingForFirstChunk(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast("Tutor reply copied to clipboard!", "success");
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore clipboard denial
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex h-[calc(100vh-11rem)] min-h-[560px] max-h-[820px] relative">
        {/* Conversation History Sidebar (Desktop) */}
        <aside className="hidden md:flex w-72 shrink-0 border-r border-slate-200 bg-[#F8FAFC] flex-col">
          <div className="p-4 border-b border-slate-200 bg-white">
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCreateThread}
              disabled={isStreaming}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4338CA] hover:bg-[#4F46E5] disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
            >
              <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
              <span>New Chat</span>
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <p className="px-2 py-1 text-xs font-semibold text-[#1E1B4B]">Conversation History</p>
            {threads.map((thread) => {
              const isSelected = thread.id === activeThread.id;
              return (
                <div
                  key={thread.id}
                  className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    isSelected
                      ? "bg-[#4338CA] text-white font-semibold shadow-xs"
                      : "text-[#1E1B4B] hover:bg-white hover:text-[#4338CA]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isStreaming) {
                        setActiveThreadId(thread.id);
                        setError(null);
                      }
                    }}
                    className="flex-1 text-left truncate cursor-pointer"
                  >
                    {thread.title}
                  </button>
                  {threads.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteThread(thread.id)}
                      aria-label={`Delete conversation ${thread.title}`}
                      className={`p-1 rounded transition-opacity cursor-pointer ${
                        isSelected
                          ? "text-white/80 hover:text-white"
                          : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Animated Mobile History Drawer */}
        <AnimatePresence>
          {mobileHistoryOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="md:hidden fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-72 bg-[#F8FAFC] h-full flex flex-col border-r border-slate-200 shadow-xl"
              >
                <div className="p-4 border-b border-white/10 bg-[#1E1B4B] text-white flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Chat History</span>
                  <button
                    type="button"
                    onClick={() => setMobileHistoryOpen(false)}
                    className="p-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                    aria-label="Close history"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3">
                  <button
                    type="button"
                    onClick={handleCreateThread}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4338CA] hover:bg-[#4F46E5]"
                  >
                    <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
                    <span>New Chat</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm ${
                        thread.id === activeThread.id
                          ? "bg-[#4338CA] text-white font-semibold"
                          : "text-[#1E1B4B] hover:bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveThreadId(thread.id);
                          setMobileHistoryOpen(false);
                        }}
                        className="flex-1 text-left truncate"
                      >
                        {thread.title}
                      </button>
                      {threads.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteThread(thread.id)}
                          className={`p-1 ${
                            thread.id === activeThread.id
                              ? "text-white/80 hover:text-white"
                              : "text-slate-400 hover:text-red-600"
                          }`}
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
              <div className="flex-1" onClick={() => setMobileHistoryOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Primary Dark Chat Header */}
          <div className="px-4 sm:px-6 py-3.5 bg-[#1E1B4B] text-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileHistoryOpen(true)}
                className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/20 text-white hover:bg-white/10"
                aria-label="Open chat history"
              >
                <History className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-white truncate">
                  {activeThread.title}
                </h1>
                <p className="inline-flex items-center gap-1.5 text-xs text-[#C4B5FD] font-mono truncate">
                  <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>Live AI Tutor · {getActiveModelId(settings)}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearCurrentChat}
              disabled={isStreaming || activeThread.messages.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear Chat</span>
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-[#F8FAFC]">
            {activeThread.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6 py-6">
                <div className="space-y-2">
                  <span className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#4338CA] to-[#7C3AED] text-white flex items-center justify-center shadow-[0_10px_28px_-8px_rgba(124,58,237,0.5)]">
                    <Sparkles className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <h2 className="text-xl font-bold text-[#1E1B4B]">
                    Your Personal Bilingual AI Tutor
                  </h2>
                  <p className="text-sm text-slate-600">
                    Ask a question in English or বাংলা. I will walk you through concepts step by
                    step with analogies and worked examples.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                  {QUICK_PROMPTS.map((prompt) => (
                    <motion.button
                      key={prompt}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => handleSend(prompt)}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-[#4338CA] hover:text-[#4338CA] text-xs sm:text-sm font-medium text-[#1E1B4B] transition-colors cursor-pointer shadow-xs"
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              activeThread.messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 sm:px-5 py-3.5 ${
                        isUser
                          ? "bg-[#4338CA] text-white shadow-sm"
                          : "bg-white/95 backdrop-blur-sm border border-slate-200 text-[#1E1B4B] shadow-xs"
                      }`}
                    >
                      {isUser ? (
                        <p className="reading-prose leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      ) : msg.text === "" && waitingForFirstChunk ? (
                        <div className="flex items-center gap-2 py-1.5 text-[#7C3AED] text-sm">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce" />
                          </span>
                          <span className="text-xs font-semibold">AI Tutor is thinking...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7C3AED]">
                            <Sparkles className="w-3 h-3" aria-hidden="true" />
                            <span>EduGenius AI Tutor</span>
                          </div>
                          <RichTextRenderer content={msg.text} />
                          {!isStreaming && msg.text && (
                            <div className="pt-2 border-t border-slate-100 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.text)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#4338CA] transition-colors cursor-pointer"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                                    <span className="text-[#10B981] font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="px-4 sm:px-6 pt-3 bg-[#F8FAFC]">
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-4 sm:px-6 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-3 bg-[#F8FAFC] rounded-2xl border border-slate-200 p-2 focus-within:border-[#4338CA] focus-within:ring-2 focus-within:ring-[#4338CA]/15 transition-all">
              <label htmlFor="tutor-chat-input" className="sr-only">
                Ask the Live AI Tutor
              </label>
              <textarea
                id="tutor-chat-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question in English or বাংলা..."
                className="flex-1 min-w-0 max-h-32 px-3 py-2 text-sm sm:text-[15px] text-[#1E1B4B] placeholder:text-slate-400 bg-transparent focus:outline-none resize-none"
              />
              <motion.button
                type="button"
                whileHover={!isStreaming && input.trim() ? { scale: 1.03 } : undefined}
                whileTap={!isStreaming && input.trim() ? { scale: 0.96 } : undefined}
                onClick={() => handleSend()}
                disabled={isStreaming || !input.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#4338CA] to-[#7C3AED] hover:shadow-[0_8px_22px_-6px_rgba(124,58,237,0.55)] disabled:opacity-40 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                <span>Send</span>
                <Send className="w-4 h-4" aria-hidden="true" />
              </motion.button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 text-center">
              Press Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
