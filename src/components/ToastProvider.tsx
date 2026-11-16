import React, { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Sparkles, X } from "lucide-react";

export type ToastVariant = "success" | "ai" | "info" | "error";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const accentClass =
              toast.variant === "success"
                ? "border-[#10B981]/50 text-[#1E1B4B]"
                : toast.variant === "error"
                ? "border-red-300 text-red-900"
                : toast.variant === "ai"
                ? "border-[#7C3AED]/40 text-[#1E1B4B]"
                : "border-[#4338CA]/40 text-[#1E1B4B]";

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-white/95 backdrop-blur-md border shadow-lg ${accentClass}`}
              >
                {toast.variant === "success" && (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" aria-hidden="true" />
                )}
                {toast.variant === "error" && (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" aria-hidden="true" />
                )}
                {(toast.variant === "ai" || toast.variant === "info") && (
                  <Sparkles
                    className={`w-4 h-4 shrink-0 ${
                      toast.variant === "ai" ? "text-[#7C3AED]" : "text-[#4338CA]"
                    }`}
                    aria-hidden="true"
                  />
                )}
                <span className="text-xs sm:text-sm font-medium flex-1">{toast.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="p-1 rounded-md text-slate-400 hover:text-[#1E1B4B] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
