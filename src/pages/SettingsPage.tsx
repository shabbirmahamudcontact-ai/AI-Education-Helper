import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Type as TypeIcon,
} from "lucide-react";
import { ActiveModelTier, AppSettings, FontPreset, ServerStatus } from "../types";
import {
  FONT_PRESETS,
  applyTypographyPreferences,
  fetchServerStatus,
  getActiveModelId,
  testGeminiConnection,
  verifyModelId,
} from "../services/api";
import { useToast } from "../components/ToastProvider";

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
}

const FLASH_PRESETS = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
const PRO_PRESETS = ["gemini-4-argon", "gemini-4-carbon"];
const FONT_PRESET_KEYS: FontPreset[] = ["editorial", "geometric", "academic"];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const { showToast } = useToast();
  const [apiKeyInput, setApiKeyInput] = useState(settings.customApiKey);
  const [showKey, setShowKey] = useState(false);
  const [flashModelId, setFlashModelId] = useState(settings.flashModelId);
  const [proModelId, setProModelId] = useState(settings.proModelId);
  const [activeTier, setActiveTier] = useState<ActiveModelTier>(settings.activeTier);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [fontPreset, setFontPreset] = useState<FontPreset>(settings.fontPreset);
  const [readingScale, setReadingScale] = useState<number>(settings.readingScale);
  const [verifiedModels, setVerifiedModels] = useState<Record<string, boolean>>(
    settings.verifiedModels
  );

  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [keyStatusMsg, setKeyStatusMsg] = useState<string | null>(null);
  const [settingsStatusMsg, setSettingsStatusMsg] = useState<string | null>(null);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const [verifyingModel, setVerifyingModel] = useState<string | null>(null);
  const [modelVerifyMsg, setModelVerifyMsg] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchServerStatus()
      .then(setServerStatus)
      .catch(() => setServerStatus(null));
  }, []);

  const handleFontPresetChange = (nextPreset: FontPreset) => {
    setFontPreset(nextPreset);
    const updated: AppSettings = {
      ...settings,
      fontPreset: nextPreset,
      readingScale,
    };
    applyTypographyPreferences(updated);
    onUpdateSettings(updated);
    showToast(`Applied ${FONT_PRESETS[nextPreset].label} font pairing`, "info");
  };

  const handleReadingScaleChange = (nextScale: number) => {
    setReadingScale(nextScale);
    const updated: AppSettings = {
      ...settings,
      fontPreset,
      readingScale: nextScale,
    };
    applyTypographyPreferences(updated);
    onUpdateSettings(updated);
  };

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    const next: AppSettings = {
      ...settings,
      customApiKey: trimmed,
    };
    onUpdateSettings(next);
    const msg = trimmed
      ? "Optional browser override key saved for local session testing via the server proxy."
      : "Browser override cleared. Requests use the server-side GEMINI_API_KEY environment variable.";
    setKeyStatusMsg(msg);
    showToast(trimmed ? "Override API key saved" : "Using server environment key", "success");
    setTimeout(() => setKeyStatusMsg(null), 4000);
  };

  const handleVerifyModel = async (targetModelId: string) => {
    const cleanId = targetModelId.trim();
    if (!cleanId) {
      setModelVerifyMsg({ ok: false, message: "Please enter a model ID to verify." });
      return false;
    }

    setVerifyingModel(cleanId);
    setModelVerifyMsg(null);
    try {
      const res = await verifyModelId(cleanId, apiKeyInput);
      if (res.available) {
        setVerifiedModels((prev) => ({ ...prev, [cleanId]: true }));
        const msg = `Verified available: ${res.displayName || cleanId} (${cleanId}).`;
        setModelVerifyMsg({ ok: true, message: msg });
        showToast(`Model ${cleanId} verified!`, "success");
        return true;
      } else {
        setVerifiedModels((prev) => ({ ...prev, [cleanId]: false }));
        const errMsg = res.error || `Model '${cleanId}' is unavailable.`;
        setModelVerifyMsg({ ok: false, message: errMsg });
        showToast(errMsg, "error");
        return false;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to verify model availability.";
      setModelVerifyMsg({ ok: false, message: errMsg });
      showToast(errMsg, "error");
      return false;
    } finally {
      setVerifyingModel(null);
    }
  };

  const handleTestConnection = async () => {
    const targetModel = activeTier === "pro" ? proModelId.trim() : flashModelId.trim();
    setIsTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await testGeminiConnection(targetModel, apiKeyInput);
      if (res.ok) {
        setVerifiedModels((prev) => ({ ...prev, [targetModel]: true }));
        const msg = `Connected to ${res.displayName || targetModel} in ${res.latencyMs}ms: "${res.reply}"`;
        setConnectionResult({ ok: true, message: msg });
        showToast(`Gemini API connected (${res.latencyMs}ms)`, "success");
      } else {
        const errMsg = res.error || "Connection test failed.";
        setConnectionResult({ ok: false, message: errMsg });
        showToast(errMsg, "error");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Network error while testing connection.";
      setConnectionResult({ ok: false, message: errMsg });
      showToast(errMsg, "error");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFlash = flashModelId.trim();
    const cleanPro = proModelId.trim();
    const targetActive = activeTier === "pro" ? cleanPro : cleanFlash;

    setSettingsStatusMsg(null);
    setModelVerifyMsg(null);

    if (!verifiedModels[targetActive]) {
      const ok = await handleVerifyModel(targetActive);
      if (!ok) return;
    }

    const nextSettings: AppSettings = {
      customApiKey: apiKeyInput.trim(),
      flashModelId: cleanFlash,
      proModelId: cleanPro,
      activeTier,
      temperature,
      fontPreset,
      readingScale,
      verifiedModels: {
        ...verifiedModels,
        [targetActive]: true,
      },
    };
    onUpdateSettings(nextSettings);
    const msg = `Settings saved. Active model: ${getActiveModelId(nextSettings)} · Font: ${FONT_PRESETS[fontPreset].label} · Temperature: ${temperature.toFixed(2)}`;
    setSettingsStatusMsg(msg);
    showToast("All settings saved!", "success");
    setTimeout(() => setSettingsStatusMsg(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6 space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1E1B4B] tracking-tight">
          Settings, Typography & Model Configuration
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Customize bilingual font pairings, reading scale, server proxy options, and verified Gemini model IDs.
        </p>
      </div>

      {/* Dynamic Typography & Font Switcher Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <TypeIcon className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[#1E1B4B]">Dynamic Typography & Fonts</h2>
          </div>
          <span className="text-xs font-semibold text-[#7C3AED]">Instant Live Preview</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FONT_PRESET_KEYS.map((key) => {
            const preset = FONT_PRESETS[key];
            const isSelected = fontPreset === key;
            return (
              <motion.button
                key={key}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleFontPresetChange(key)}
                className={`relative text-left p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                  isSelected
                    ? "border-[#4338CA] bg-[#4338CA]/5 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-base font-bold text-[#1E1B4B]"
                    style={{ fontFamily: preset.displayFont }}
                  >
                    {preset.label}
                  </span>
                  {isSelected && (
                    <span className="text-xs font-semibold text-[#4338CA]">Active</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{preset.subtitle}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Reading Font Scale Slider */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label htmlFor="reading-scale-slider" className="text-sm font-semibold text-[#1E1B4B]">
              Study & Chat Reading Font Scale
            </label>
            <span className="font-mono text-sm font-bold text-[#4338CA] tabular-nums">
              {Math.round(readingScale * 100)}%
            </span>
          </div>
          <input
            id="reading-scale-slider"
            type="range"
            min={0.9}
            max={1.25}
            step={0.05}
            value={readingScale}
            onChange={(e) => handleReadingScaleChange(parseFloat(e.target.value))}
            className="w-full accent-[#4338CA] cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 tabular-nums">
            <span>90% (Compact)</span>
            <span>100% (Standard)</span>
            <span>125% (Large Reading)</span>
          </div>
        </div>

        {/* Live Bilingual Typography Specimen */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-1.5">
          <p className="text-xs font-semibold text-[#7C3AED]">Live Bilingual Font Specimen</p>
          <p
            className="text-lg font-bold text-[#1E1B4B]"
            style={{ fontFamily: FONT_PRESETS[fontPreset].displayFont }}
          >
            Newton's Second Law · নিউটনের দ্বিতীয় সূত্র (F = ma)
          </p>
          <p className="reading-prose text-slate-700">
            Clear English academic prose paired seamlessly with crisp বাংলা typography for SSC,
            HSC, University, and IELTS preparation.
          </p>
        </div>
      </section>

      {/* Security Architecture Card (Primary Dark Banner) */}
      <section className="bg-[#1E1B4B] text-white rounded-2xl p-6 space-y-3 shadow-sm">
        <div className="flex items-start gap-3.5">
          <span className="w-9 h-9 rounded-xl bg-[#4338CA] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-white">
              Production API Key Security Architecture
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Browser storage (<code className="font-mono text-xs bg-white/10 text-white px-1.5 py-0.5 rounded">localStorage</code>) is{" "}
              <strong className="text-white">not secure</strong> for production API credentials. Never embed
              or expose a production Gemini API key in public frontend source code. EduGenius AI routes every AI
              request through our server-side Express proxy (<code className="font-mono text-xs bg-white/10 text-white px-1.5 py-0.5 rounded">/api/*</code>),
              which reads <code className="font-mono text-xs bg-white/10 text-white px-1.5 py-0.5 rounded">process.env.GEMINI_API_KEY</code> safely on the server.
            </p>
            <p className="text-xs font-medium text-slate-300 pt-1">
              Server Environment Key Status:{" "}
              {serverStatus === null ? (
                <span className="text-slate-400">Checking...</span>
              ) : serverStatus.serverKeyConfigured ? (
                <span className="text-[#10B981] font-semibold">
                  Configured via server environment (GEMINI_API_KEY active)
                </span>
              ) : (
                <span className="text-amber-300 font-semibold">
                  Not detected in server environment — configure GEMINI_API_KEY in Secrets or enter a temporary testing key below
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* API Key & Connection Test Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <KeyRound className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#1E1B4B]">Gemini API Key & Connection</h2>
        </div>

        <div className="space-y-2">
          <label htmlFor="gemini-api-key-input" className="block text-sm font-semibold text-[#1E1B4B]">
            Optional Custom Gemini API Key (for local session override)
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                id="gemini-api-key-input"
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Leave blank to use server GEMINI_API_KEY automatically"
                autoComplete="off"
                className="w-full pr-11 pl-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-[#1E1B4B] placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-[#1E1B4B] hover:bg-slate-100 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveApiKey}
              className="px-4 py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#4F46E5] text-sm font-semibold text-white transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              Save API Key
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#4338CA] to-[#7C3AED] hover:shadow-[0_8px_22px_-6px_rgba(124,58,237,0.5)] disabled:opacity-60 transition-all whitespace-nowrap cursor-pointer shadow-sm"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Test API Connection</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {keyStatusMsg && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-semibold text-[#10B981]"
            >
              {keyStatusMsg}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {connectionResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm ${
                connectionResult.ok
                  ? "bg-[#10B981]/10 border-[#10B981]/40 text-[#1E1B4B]"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {connectionResult.ok ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#10B981]" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
              )}
              <span>{connectionResult.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Model & Temperature Settings Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#1E1B4B]">Model Selection & Sampling</h2>
        </div>

        {/* Active Tier Toggle */}
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-[#1E1B4B]">Active Model Profile</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => setActiveTier("flash")}
              className={`text-left p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                activeTier === "flash"
                  ? "border-[#4338CA] bg-[#4338CA]/5 shadow-xs"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1E1B4B]">Gemini Flash</span>
                <span className="text-xs font-semibold text-[#4338CA]">
                  {activeTier === "flash" ? "Selected" : "Select"}
                </span>
              </div>
              <p className="mt-1 text-xs font-mono text-[#1E1B4B]">{flashModelId}</p>
              <p className="mt-1 text-xs text-slate-600">Fast responses for study notes, quizzes, and chat.</p>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => setActiveTier("pro")}
              className={`text-left p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                activeTier === "pro"
                  ? "border-[#7C3AED] bg-[#7C3AED]/5 shadow-xs"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1E1B4B]">Gemini Pro</span>
                <span className="text-xs font-semibold text-[#7C3AED]">
                  {activeTier === "pro" ? "Selected" : "Select"}
                </span>
              </div>
              <p className="mt-1 text-xs font-mono text-[#1E1B4B]">{proModelId}</p>
              <p className="mt-1 text-xs text-slate-600">Advanced STEM reasoning (requires billing-enabled key).</p>
            </motion.button>
          </div>
        </div>

        {/* Configurable Flash Model ID */}
        <div className="space-y-2">
          <label htmlFor="flash-model-id" className="block text-sm font-semibold text-[#1E1B4B]">
            Configurable Gemini Flash Model ID
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="flash-model-id"
              type="text"
              value={flashModelId}
              onChange={(e) => setFlashModelId(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-[#1E1B4B] focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15"
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => handleVerifyModel(flashModelId)}
              disabled={verifyingModel === flashModelId}
              className="px-4 py-2.5 rounded-xl border border-[#4338CA] text-xs font-semibold text-[#4338CA] hover:bg-[#4338CA]/5 whitespace-nowrap cursor-pointer"
            >
              {verifyingModel === flashModelId ? "Verifying..." : "Verify Flash Model"}
            </motion.button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Presets:</span>
            {FLASH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setFlashModelId(preset)}
                className="font-mono text-[#4338CA] hover:text-[#7C3AED] hover:underline cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Configurable Pro Model ID */}
        <div className="space-y-2">
          <label htmlFor="pro-model-id" className="block text-sm font-semibold text-[#1E1B4B]">
            Configurable Gemini Pro Model ID
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="pro-model-id"
              type="text"
              value={proModelId}
              onChange={(e) => setProModelId(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-[#1E1B4B] focus:outline-none focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15"
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => handleVerifyModel(proModelId)}
              disabled={verifyingModel === proModelId}
              className="px-4 py-2.5 rounded-xl border border-[#7C3AED] text-xs font-semibold text-[#7C3AED] hover:bg-[#7C3AED]/5 whitespace-nowrap cursor-pointer"
            >
              {verifyingModel === proModelId ? "Verifying..." : "Verify Pro Model"}
            </motion.button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Presets:</span>
            {PRO_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setProModelId(preset)}
                className="font-mono text-[#4338CA] hover:text-[#7C3AED] hover:underline cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {modelVerifyMsg && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm ${
                modelVerifyMsg.ok
                  ? "bg-[#10B981]/10 border-[#10B981]/40 text-[#1E1B4B]"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {modelVerifyMsg.ok ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#10B981]" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              )}
              <span>{modelVerifyMsg.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Temperature Slider (0.2 - 0.7) */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label htmlFor="temperature-slider" className="text-sm font-semibold text-[#1E1B4B]">
              Temperature (0.2 – 0.7)
            </label>
            <span className="font-mono text-sm font-bold text-[#4338CA] tabular-nums">
              {temperature.toFixed(2)}
            </span>
          </div>
          <input
            id="temperature-slider"
            type="range"
            min={0.2}
            max={0.7}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-[#4338CA] cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500 tabular-nums">
            <span>0.20 (Precise / Exam-focused)</span>
            <span>0.45 (Balanced)</span>
            <span>0.70 (Creative Analogies)</span>
          </div>
        </div>

        <AnimatePresence>
          {settingsStatusMsg && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className="flex items-center gap-2 p-3.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/40 text-sm font-medium text-[#1E1B4B]"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" aria-hidden="true" />
              <span>{settingsStatusMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end">
          <motion.button
            type="submit"
            disabled={verifyingModel !== null}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 transition-all shadow-sm cursor-pointer"
          >
            Save Settings
          </motion.button>
        </div>
      </form>
    </div>
  );
};
