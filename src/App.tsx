import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { AppSettings, PageId } from "./types";
import {
  applyTypographyPreferences,
  loadSettings,
  saveSettings,
} from "./services/api";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ToastProvider } from "./components/ToastProvider";
import { HomePage } from "./pages/HomePage";
import { StudyHubPage } from "./pages/StudyHubPage";
import { SmartQuizPage } from "./pages/SmartQuizPage";
import { LiveTutorPage } from "./pages/LiveTutorPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>("home");
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [studyHubPrefillTopic, setStudyHubPrefillTopic] = useState<string>("");

  useEffect(() => {
    applyTypographyPreferences(settings);
  }, [settings]);

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleOpenInStudyHub = (topic: string) => {
    setStudyHubPrefillTopic(topic);
    handleNavigate("study-hub");
  };

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E1B4B]">
          <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

          <main className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {currentPage === "home" && (
                  <HomePage
                    settings={settings}
                    onNavigate={handleNavigate}
                    onOpenInStudyHub={handleOpenInStudyHub}
                  />
                )}
                {currentPage === "study-hub" && (
                  <StudyHubPage
                    settings={settings}
                    onUpdateSettings={handleUpdateSettings}
                    initialTopic={studyHubPrefillTopic}
                    onConsumeInitialTopic={() => setStudyHubPrefillTopic("")}
                  />
                )}
                {currentPage === "smart-quiz" && <SmartQuizPage settings={settings} />}
                {currentPage === "live-tutor" && <LiveTutorPage settings={settings} />}
                {currentPage === "settings" && (
                  <SettingsPage settings={settings} onUpdateSettings={handleUpdateSettings} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          <Footer onNavigate={handleNavigate} />
        </div>
      </ToastProvider>
    </MotionConfig>
  );
}
