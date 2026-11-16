export type PageId = "home" | "study-hub" | "smart-quiz" | "live-tutor" | "settings";

export type StudyMode = "Summary" | "Detailed" | "Flashcards";

export type StudyLanguage = "Auto" | "English" | "Bengali";

export type FontPreset = "editorial" | "geometric" | "academic";

export interface FlashcardItem {
  front: string;
  back: string;
  hint: string;
}

export interface FlashcardDeck {
  title: string;
  summaryNote: string;
  cards: FlashcardItem[];
}

export interface StudyExplainResponse {
  mode: StudyMode;
  modelId: string;
  content: string;
  flashcards?: FlashcardDeck;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizPayload {
  quizTitle: string;
  subject: string;
  modelId: string;
  questions: QuizQuestion[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface ChatThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type ActiveModelTier = "flash" | "pro";

export interface AppSettings {
  customApiKey: string;
  flashModelId: string;
  proModelId: string;
  activeTier: ActiveModelTier;
  temperature: number;
  verifiedModels: Record<string, boolean>;
  fontPreset: FontPreset;
  readingScale: number;
}

export interface ServerStatus {
  serverKeyConfigured: boolean;
  defaultFlashModel: string;
  defaultProModel: string;
  liteModel: string;
}

export type StudyActivityType = "Study Hub" | "Smart Quiz" | "Live Tutor" | "Quick Ask";

export type InsightsRange = "7d" | "14d" | "30d";

export interface DailyStudyEntry {
  date: string; // YYYY-MM-DD
  label: string; // e.g., "Nov 01"
  studyHubMinutes: number;
  quizMinutes: number;
  tutorMinutes: number;
  totalMinutes: number;
  quizScore: number | null; // 0-100
  masteryIndex: number; // 0-100 rolling performance index
  sessionsCount: number;
}

export interface LearningActivityLog {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  type: StudyActivityType;
  subject: string;
  topic: string;
  minutes: number;
  scorePercent?: number;
}

export interface LearningInsightsData {
  daily: DailyStudyEntry[];
  activities: LearningActivityLog[];
}

