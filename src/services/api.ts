import {
  AppSettings,
  ChatMessage,
  FontPreset,
  QuizPayload,
  ServerStatus,
  StudyExplainResponse,
  StudyLanguage,
  StudyMode,
} from "../types";

export const SETTINGS_STORAGE_KEY = "edugenius_ai_settings_v1";
export const CHAT_THREADS_STORAGE_KEY = "edugenius_ai_chat_threads_v1";
export const SESSION_STATS_STORAGE_KEY = "edugenius_ai_session_stats_v1";

export const FONT_PRESETS: Record<
  FontPreset,
  {
    label: string;
    subtitle: string;
    displayFont: string;
    bodyFont: string;
    bengaliFont: string;
  }
> = {
  editorial: {
    label: "Modern Editorial",
    subtitle: "Bricolage Grotesque + Plus Jakarta Sans + Noto Sans Bengali",
    displayFont: '"Bricolage Grotesque", "Noto Sans Bengali", ui-sans-serif, system-ui, sans-serif',
    bodyFont: '"Plus Jakarta Sans", "Noto Sans Bengali", ui-sans-serif, system-ui, sans-serif',
    bengaliFont: '"Noto Sans Bengali", "Hind Siliguri", ui-sans-serif, system-ui, sans-serif',
  },
  geometric: {
    label: "Clean Geometric",
    subtitle: "Outfit + DM Sans + Hind Siliguri",
    displayFont: '"Outfit", "Hind Siliguri", ui-sans-serif, system-ui, sans-serif',
    bodyFont: '"DM Sans", "Hind Siliguri", ui-sans-serif, system-ui, sans-serif',
    bengaliFont: '"Hind Siliguri", "Noto Sans Bengali", ui-sans-serif, system-ui, sans-serif',
  },
  academic: {
    label: "Academic Serif",
    subtitle: "Lora + Plus Jakarta Sans + Noto Sans Bengali",
    displayFont: '"Lora", "Noto Sans Bengali", ui-serif, Georgia, serif',
    bodyFont: '"Plus Jakarta Sans", "Noto Sans Bengali", ui-sans-serif, system-ui, sans-serif',
    bengaliFont: '"Noto Sans Bengali", "Hind Siliguri", ui-sans-serif, system-ui, sans-serif',
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  customApiKey: "",
  flashModelId: "gemini-4-hydrogen",
  proModelId: "gemini-4-argon",
  activeTier: "flash",
  temperature: 0.4,
  verifiedModels: {
    "gemini-4-hydrogen": true,
  },
  fontPreset: "editorial",
  readingScale: 1,
};

export function applyTypographyPreferences(settings: AppSettings): void {
  if (typeof document === "undefined") return;
  const preset = FONT_PRESETS[settings.fontPreset] || FONT_PRESETS.editorial;
  const scale = Math.min(1.25, Math.max(0.9, Number(settings.readingScale) || 1));
  const root = document.documentElement;
  root.style.setProperty("--active-display-font", preset.displayFont);
  root.style.setProperty("--active-body-font", preset.bodyFont);
  root.style.setProperty("--active-bengali-font", preset.bengaliFont);
  root.style.setProperty("--reading-scale", String(scale));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      temperature:
        typeof parsed.temperature === "number"
          ? Math.min(0.7, Math.max(0.2, parsed.temperature))
          : DEFAULT_SETTINGS.temperature,
      fontPreset: parsed.fontPreset && parsed.fontPreset in FONT_PRESETS ? parsed.fontPreset : "editorial",
      readingScale:
        typeof parsed.readingScale === "number"
          ? Math.min(1.25, Math.max(0.9, parsed.readingScale))
          : 1,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  applyTypographyPreferences(settings);
}

export function getActiveModelId(settings: AppSettings): string {
  return settings.activeTier === "pro" ? settings.proModelId : settings.flashModelId;
}

function buildHeaders(customApiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (customApiKey?.trim()) {
    headers["X-Gemini-Api-Key"] = customApiKey.trim();
  }
  return headers;
}

export async function fetchServerStatus(): Promise<ServerStatus> {
  const res = await fetch("/api/status");
  if (!res.ok) {
    throw new Error("Unable to read server configuration status.");
  }
  return res.json();
}

export async function verifyModelId(
  modelId: string,
  customApiKey?: string
): Promise<{ available: boolean; modelId: string; displayName?: string; error?: string }> {
  const res = await fetch("/api/models/verify", {
    method: "POST",
    headers: buildHeaders(customApiKey),
    body: JSON.stringify({ modelId }),
  });
  return res.json();
}

export async function testGeminiConnection(
  modelId: string,
  customApiKey?: string
): Promise<{ ok: boolean; modelId?: string; displayName?: string; latencyMs?: number; reply?: string; error?: string }> {
  const res = await fetch("/api/test-connection", {
    method: "POST",
    headers: buildHeaders(customApiKey),
    body: JSON.stringify({ modelId }),
  });
  return res.json();
}

export async function requestStudyExplanation(
  params: {
    subject: string;
    level: string;
    topic: string;
    mode: StudyMode;
    language?: StudyLanguage;
  },
  settings: AppSettings
): Promise<StudyExplainResponse> {
  const model = getActiveModelId(settings);
  const res = await fetch("/api/study/explain", {
    method: "POST",
    headers: buildHeaders(settings.customApiKey),
    body: JSON.stringify({
      ...params,
      model,
      temperature: settings.temperature,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to generate explanation.");
  }
  return data;
}

export async function requestQuizGeneration(
  params: {
    subject: string;
    topic: string;
    count: 5 | 10;
    language?: StudyLanguage;
  },
  settings: AppSettings
): Promise<QuizPayload> {
  const model = getActiveModelId(settings);
  const res = await fetch("/api/quiz/generate", {
    method: "POST",
    headers: buildHeaders(settings.customApiKey),
    body: JSON.stringify({
      ...params,
      model,
      temperature: settings.temperature,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to generate quiz.");
  }
  return data;
}

export async function streamTutorChat(
  messages: Pick<ChatMessage, "role" | "text">[],
  settings: AppSettings,
  onChunk: (textChunk: string) => void
): Promise<void> {
  const model = getActiveModelId(settings);
  const res = await fetch("/api/tutor/chat", {
    method: "POST",
    headers: buildHeaders(settings.customApiKey),
    body: JSON.stringify({
      messages,
      model,
      temperature: settings.temperature,
    }),
  });

  if (!res.ok) {
    let errorMsg = "Unable to reach the Live AI Tutor.";
    try {
      const errData = await res.json();
      if (errData.error) errorMsg = errData.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(errorMsg);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response is unavailable in this browser.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data:")) continue;
      const jsonText = line.slice(5).trim();
      if (!jsonText) continue;

      const payload = JSON.parse(jsonText);
      if (payload.error) {
        throw new Error(payload.error);
      }
      if (payload.text) {
        onChunk(payload.text);
      }
    }
  }
}
