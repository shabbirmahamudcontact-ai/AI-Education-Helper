import "dotenv/config";
import express, { type Request, type Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

export const DEFAULT_FLASH_MODEL = "gemini-4-hydrogen";
export const DEFAULT_PRO_MODEL = "gemini-4-argon";
export const LITE_MODEL = "gemini-3.1-flash-lite";

const DEPRECATED_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-2.0-flash",
  "gemini-2.0-pro",
  "gemini-2.0-flash-thinking",
]);

const EDUGENIUS_SYSTEM_INSTRUCTION = `You are EduGenius AI, an elite educational mentor and adaptive tutor created by Apex Edutech Labs Inc.

Target Audience: Bengali and English-speaking students preparing for SSC, HSC, University admission & undergraduate courses, IELTS, and competitive Job/BCS exams.

Tone: Highly encouraging, clear, structured, and pedagogically sound.

For explanations:
Break down complex topics cleanly into:
1. Concept Definition
2. Real-world Analogy
3. Practical Example

For quizzes:
Return structured output with:
- Question
- Options [A, B, C, D]
- Correct Answer
- In-depth Explanation

Language & Typography Rules:
- Match the student's language naturally (English, Bengali / বাংলা, or clear bilingual English + বাংলা terms when helpful).
- Maintain proper Bengali Unicode typography (দাঁড়ি '।', accurate যুক্তবর্ণ, clear mathematical notation).
- Avoid hallucination. If unsure or if a topic is ambiguous, politely clarify and ask for specifics rather than fabricating facts.`;

const verifiedModelCache = new Map<string, { available: boolean; checkedAt: number; displayName?: string }>();
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;

function resolveApiKey(req: Request): string {
  const headerKey = req.header("x-gemini-api-key")?.trim();
  if (headerKey) {
    return headerKey;
  }
  return (process.env.GEMINI_API_KEY || "").trim();
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isGemini4Model(modelId: string): boolean {
  return /^gemini-4-/.test(modelId.trim());
}

function sanitizeTemperature(modelId: string, rawTemp: unknown): number | undefined {
  if (isGemini4Model(modelId)) {
    return undefined;
  }
  const num = Number(rawTemp);
  if (!Number.isFinite(num)) return undefined;
  return Math.min(0.7, Math.max(0.2, num));
}

function parseGeminiError(error: unknown): { status: number; message: string; code: string } {
  const errObj = error as { status?: number; message?: string; code?: string };
  const rawMessage = errObj?.message || "An unexpected error occurred while communicating with Gemini.";

  if (
    rawMessage.includes("API_KEY_INVALID") ||
    rawMessage.includes("API key not valid") ||
    errObj?.status === 400 && rawMessage.toLowerCase().includes("api key")
  ) {
    return {
      status: 400,
      code: "API_KEY_INVALID",
      message: "The configured Gemini API key appears invalid. Verify your key in AI Studio Settings > Secrets or Settings.",
    };
  }

  if (rawMessage.includes("PERMISSION_DENIED") || errObj?.status === 403) {
    return {
      status: 403,
      code: "PERMISSION_DENIED",
      message: "Permission denied by Gemini API. Ensure your API key is active and enabled in Settings > Secrets.",
    };
  }

  if (rawMessage.includes("RESOURCE_EXHAUSTED") || errObj?.status === 429) {
    return {
      status: 429,
      code: "RESOURCE_EXHAUSTED",
      message: "Rate limit or quota reached for this model. Switch to the Flash model (gemini-4-hydrogen) or check your API quota.",
    };
  }

  if (rawMessage.includes("NOT_FOUND") || errObj?.status === 404) {
    return {
      status: 404,
      code: "MODEL_NOT_FOUND",
      message: "The selected Gemini model ID was not found or is unsupported. Verify model availability in Settings.",
    };
  }

  return {
    status: errObj?.status && errObj.status >= 400 && errObj.status < 600 ? errObj.status : 500,
    code: "GEMINI_ERROR",
    message: rawMessage,
  };
}

async function verifyModelAvailability(
  ai: GoogleGenAI,
  modelId: string,
  bypassCache = false
): Promise<{ available: boolean; modelId: string; displayName?: string; error?: string }> {
  const cleanId = modelId.trim();
  if (!cleanId) {
    return { available: false, modelId: cleanId, error: "Model ID cannot be empty." };
  }
  if (DEPRECATED_MODELS.has(cleanId)) {
    return {
      available: false,
      modelId: cleanId,
      error: `Model '${cleanId}' is deprecated. Use '${DEFAULT_FLASH_MODEL}', '${DEFAULT_PRO_MODEL}', or '${LITE_MODEL}'.`,
    };
  }

  const cached = verifiedModelCache.get(cleanId);
  if (!bypassCache && cached && Date.now() - cached.checkedAt < MODEL_CACHE_TTL_MS) {
    return { available: cached.available, modelId: cleanId, displayName: cached.displayName };
  }

  try {
    const info = await ai.models.get({ model: cleanId });
    const displayName = info.displayName || cleanId;
    verifiedModelCache.set(cleanId, { available: true, checkedAt: Date.now(), displayName });
    return { available: true, modelId: cleanId, displayName };
  } catch (err) {
    const parsed = parseGeminiError(err);
    return { available: false, modelId: cleanId, error: parsed.message };
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const parsed = parseGeminiError(err);
      if (parsed.status === 400 || parsed.status === 403 || parsed.status === 404) {
        throw err;
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 450 * attempt));
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Server status (never returns any secret value)
  app.get("/api/status", (_req: Request, res: Response) => {
    res.json({
      serverKeyConfigured: Boolean((process.env.GEMINI_API_KEY || "").trim()),
      defaultFlashModel: DEFAULT_FLASH_MODEL,
      defaultProModel: DEFAULT_PRO_MODEL,
      liteModel: LITE_MODEL,
    });
  });

  // Verify model availability
  app.post("/api/models/verify", async (req: Request, res: Response) => {
    const apiKey = resolveApiKey(req);
    if (!apiKey) {
      res.status(400).json({
        available: false,
        error: "No Gemini API key configured on the server or provided for verification.",
      });
      return;
    }
    const modelId = String(req.body?.modelId || "").trim();
    if (!modelId) {
      res.status(400).json({ available: false, error: "Please provide a model ID to verify." });
      return;
    }

    const ai = createGeminiClient(apiKey);
    const result = await verifyModelAvailability(ai, modelId, true);
    if (!result.available) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  // Test live API connection
  app.post("/api/test-connection", async (req: Request, res: Response) => {
    const apiKey = resolveApiKey(req);
    if (!apiKey) {
      res.status(400).json({
        ok: false,
        error: "No Gemini API key is configured. Set GEMINI_API_KEY in AI Studio Secrets or enter an override key in Settings.",
      });
      return;
    }

    const modelId = String(req.body?.modelId || DEFAULT_FLASH_MODEL).trim();
    const ai = createGeminiClient(apiKey);
    const started = Date.now();

    try {
      const check = await verifyModelAvailability(ai, modelId, true);
      if (!check.available) {
        res.status(400).json({ ok: false, error: check.error });
        return;
      }

      const response = await ai.models.generateContent({
        model: modelId,
        contents: "Reply with exactly: EduGenius AI connection verified.",
      });

      const latencyMs = Date.now() - started;
      res.json({
        ok: true,
        modelId,
        displayName: check.displayName || modelId,
        latencyMs,
        reply: (response.text || "").trim(),
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({ ok: false, error: parsed.message, code: parsed.code });
    }
  });

  // Page 1 Quick Ask & Page 2 AI Study Hub
  app.post("/api/study/explain", async (req: Request, res: Response) => {
    const apiKey = resolveApiKey(req);
    if (!apiKey) {
      res.status(400).json({
        error: "Gemini API key is not configured on the server. Configure GEMINI_API_KEY in Secrets or Settings.",
      });
      return;
    }

    const topic = String(req.body?.topic || "").trim();
    const subject = String(req.body?.subject || "General Studies").trim();
    const level = String(req.body?.level || "HSC").trim();
    const mode = String(req.body?.mode || "Detailed").trim();
    const language = String(req.body?.language || "Auto").trim();
    const modelId = String(req.body?.model || DEFAULT_FLASH_MODEL).trim();
    const temperature = sanitizeTemperature(modelId, req.body?.temperature);

    const languageDirective =
      language === "Bengali"
        ? "Write the entire explanation in natural, crisp Bengali (বাংলা), keeping key technical terms in parentheses in English where helpful."
        : language === "English"
        ? "Write the entire explanation in clear, crisp English."
        : "Respond in the same language as the student's topic (Bengali if written in বাংলা, English if written in English).";

    if (!topic) {
      res.status(400).json({ error: "Please enter a topic or question to study." });
      return;
    }

    const ai = createGeminiClient(apiKey);
    const modelCheck = await verifyModelAvailability(ai, modelId);
    if (!modelCheck.available) {
      res.status(400).json({ error: modelCheck.error });
      return;
    }

    try {
      if (mode === "Flashcards") {
        const prompt = `Create 6 high-impact study flashcards for a ${level} student studying ${subject} on the topic: "${topic}".
${languageDirective}
Each flashcard must include:
- front: concise question or concept prompt
- back: clear definition, real-world analogy, or solved example
- hint: short memory cue`;

        const response = await withRetry(() =>
          ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
              systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
              ...(temperature !== undefined ? { temperature } : {}),
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summaryNote: { type: Type.STRING },
                  cards: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        front: { type: Type.STRING },
                        back: { type: Type.STRING },
                        hint: { type: Type.STRING },
                      },
                      required: ["front", "back", "hint"],
                    },
                  },
                },
                required: ["title", "summaryNote", "cards"],
              },
            },
          })
        );

        const parsed = JSON.parse((response.text || "{}").trim());
        res.json({
          mode: "Flashcards",
          modelId,
          flashcards: parsed,
          content: parsed.summaryNote || "",
        });
        return;
      }

      const depthGuide =
        mode === "Summary"
          ? "Keep the explanation crisp, scannable, and concise (around 200-300 words total) while still preserving all 3 required sections."
          : "Provide a thorough, exam-ready explanation with formulas/key points, step-by-step reasoning, and an exam tip tailored to the student's level.";

      const prompt = `Subject: ${subject}
Student Level: ${level}
Explanation Mode: ${mode}
Topic / Question: ${topic}

${depthGuide}

Format the response using clean Markdown headings exactly covering:
## 1. Concept Definition
## 2. Real-world Analogy
## 3. Practical Example
${mode === "Detailed" ? "## 4. Key Takeaways & Exam Tip" : ""}

${languageDirective}`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
            systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
            ...(temperature !== undefined ? { temperature } : {}),
          },
        })
      );

      const content = (response.text || "").trim();
      if (!content) {
        res.status(502).json({ error: "Gemini returned an empty response. Please try again." });
        return;
      }

      res.json({
        mode,
        modelId,
        content,
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message, code: parsed.code });
    }
  });

  // Page 3 Smart AI Quiz
  app.post("/api/quiz/generate", async (req: Request, res: Response) => {
    const apiKey = resolveApiKey(req);
    if (!apiKey) {
      res.status(400).json({
        error: "Gemini API key is not configured on the server. Configure GEMINI_API_KEY in Secrets or Settings.",
      });
      return;
    }

    const topic = String(req.body?.topic || "").trim();
    const subject = String(req.body?.subject || "General Studies").trim();
    const count = Number(req.body?.count) === 10 ? 10 : 5;
    const language = String(req.body?.language || "Auto").trim();
    const modelId = String(req.body?.model || DEFAULT_FLASH_MODEL).trim();
    const temperature = sanitizeTemperature(modelId, req.body?.temperature);

    const languageDirective =
      language === "Bengali"
        ? "Write all questions, options, quizTitle, and explanations in natural Bengali (বাংলা)."
        : language === "English"
        ? "Write all questions, options, quizTitle, and explanations in clear English."
        : "Match the language of the topic (Bengali if the topic is in বাংলা, English if in English).";

    if (!topic) {
      res.status(400).json({ error: "Please enter a quiz topic." });
      return;
    }

    const ai = createGeminiClient(apiKey);
    const modelCheck = await verifyModelAvailability(ai, modelId);
    if (!modelCheck.available) {
      res.status(400).json({ error: modelCheck.error });
      return;
    }

    try {
      const prompt = `Generate exactly ${count} multiple-choice questions (MCQs) for Subject: "${subject}" on Topic: "${topic}".
Target exam standard: SSC, HSC, University, IELTS, and Job preparation.
${languageDirective}
Each question MUST have:
- id: number (1 to ${count})
- question: clear, unambiguous question text
- options: an array of exactly 4 distinct answer strings (do NOT prefix with "A.", "B.", etc. — just the option text)
- correctIndex: integer 0, 1, 2, or 3 indicating which option in the options array is correct
- explanation: thorough pedagogical explanation of why the correct answer is right and why common distractors are wrong.`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
            systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
            ...(temperature !== undefined ? { temperature } : {}),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                quizTitle: { type: Type.STRING },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.INTEGER },
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                    required: ["id", "question", "options", "correctIndex", "explanation"],
                  },
                },
              },
              required: ["quizTitle", "questions"],
            },
          },
        })
      );

      const data = JSON.parse((response.text || "{}").trim());
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        res.status(502).json({ error: "Quiz generation returned no questions. Please retry." });
        return;
      }

      const normalizedQuestions = data.questions.slice(0, count).map(
        (
          q: {
            id?: number;
            question?: string;
            options?: string[];
            correctIndex?: number;
            explanation?: string;
          },
          idx: number
        ) => {
          const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
          while (opts.length < 4) opts.push("Option " + (opts.length + 1));
          const correctIndex =
            typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3
              ? q.correctIndex
              : 0;
          return {
            id: idx + 1,
            question: String(q.question || "Question"),
            options: opts.map((o) => String(o)),
            correctIndex,
            explanation: String(q.explanation || "Review this concept carefully."),
          };
        }
      );

      res.json({
        quizTitle: data.quizTitle || `${subject}: ${topic}`,
        subject,
        modelId,
        questions: normalizedQuestions,
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({ error: parsed.message, code: parsed.code });
    }
  });

  // Page 4 Live AI Tutor (Streaming SSE)
  app.post("/api/tutor/chat", async (req: Request, res: Response) => {
    const apiKey = resolveApiKey(req);
    if (!apiKey) {
      res.status(400).json({
        error: "Gemini API key is not configured on the server. Configure GEMINI_API_KEY in Secrets or Settings.",
      });
      return;
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const modelId = String(req.body?.model || DEFAULT_FLASH_MODEL).trim();
    const temperature = sanitizeTemperature(modelId, req.body?.temperature);

    if (messages.length === 0) {
      res.status(400).json({ error: "Message history cannot be empty." });
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user" || !String(lastMessage.text || "").trim()) {
      res.status(400).json({ error: "Please enter a valid message." });
      return;
    }

    const ai = createGeminiClient(apiKey);
    const modelCheck = await verifyModelAvailability(ai, modelId);
    if (!modelCheck.available) {
      res.status(400).json({ error: modelCheck.error });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    try {
      const history = messages.slice(0, -1).map((m: { role: string; text: string }) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: String(m.text || "") }],
      }));

      const chat = ai.chats.create({
        model: modelId,
        history,
        config: {
          systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
          ...(temperature !== undefined ? { temperature } : {}),
        },
      });

      const stream = await chat.sendMessageStream({
        message: String(lastMessage.text),
      });

      for await (const chunk of stream) {
        const text = chunk.text || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.write(`data: ${JSON.stringify({ error: parsed.message, code: parsed.code })}\n\n`);
      res.end();
    }
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EduGenius AI server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start EduGenius AI server:", err);
  process.exit(1);
});
