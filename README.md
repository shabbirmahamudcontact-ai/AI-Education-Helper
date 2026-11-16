# EduGenius AI

**EduGenius AI** is an AI-powered educational web application built for **Apex Edutech Labs Inc.** designed for Bengali (`বাংলা`) and English-speaking students preparing for SSC, HSC, University, IELTS, and competitive Job/BCS exams.

## Features

1. **Home / Landing Page** — Interactive **Ask AI** hero prompt, platform track metrics, and direct entry points to every learning tool.
2. **AI Study Hub** — Subject & student level selectors, **Summary / Detailed / Flashcards** modes, structured 3-part explanations (*Concept Definition*, *Real-world Analogy*, *Practical Example*), one-click **Copy Answer**, and **Download Notes** (`.md`).
3. **Smart AI Quiz** — Dynamic 5- or 10-question MCQs generated via Google Gemini structured JSON output, instant green/red validation, detailed answer explanations, score dashboard, and quiz re-attempt.
4. **Live AI Tutor** — Streaming ChatGPT-style bilingual tutor with persistent conversation history, quick exam prompts, copyable answers, and clear-chat controls.
5. **Settings** — Server proxy status indicator, optional local test API key override with show/hide, live API connection test, configurable Gemini Flash (`gemini-4-hydrogen`) and Pro (`gemini-4-argon`) model IDs with availability verification, and temperature slider (`0.2–0.7`).

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, `Plus Jakarta Sans`, `Noto Sans Bengali`, `IBM Plex Mono`
- **Backend:** Node.js + Express (`server.ts`) with Vite dev middleware
- **AI SDK:** `@google/genai` (server-side proxy routes under `/api/*`)

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
   > **Security Notice:** Never hardcode or expose a production Gemini API key in frontend source code or `VITE_*` variables. All Gemini calls run strictly through `/api/*` on the server.

3. **Run in development mode:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build and run in production:**
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

## Deployment Instructions

### Deploying with a Node.js Host (Cloud Run / Render / Railway / Fly.io)
This project uses `server.ts` as a unified Express + Vite server so the `/api/*` Gemini proxy remains secure on the server.
- **Build Command:** `npm run build`
- **Start Command:** `NODE_ENV=production npm start`
- **Environment Variable:** Set `GEMINI_API_KEY` in your hosting provider's Secrets / Environment Variables dashboard.

### Deploying to Vercel
1. Push the repository to GitHub/GitLab/Bitbucket and import it into Vercel.
2. Because Vercel serves static Vite assets from `dist/` and serverless functions from `/api/*`, convert or wrap the `/api/*` routes in `server.ts` as Vercel Serverless Functions under an `api/` directory (or deploy the Express app with a `vercel.json` rewrite to an API handler).
3. Configure `GEMINI_API_KEY` in **Project Settings → Environment Variables**.
4. Set **Build Command** to `npm run build` and **Output Directory** to `dist`.

### Deploying to Netlify
1. Connect your repository in Netlify.
2. Set **Build Command** to `npm run build` and **Publish Directory** to `dist`.
3. Move the `/api/*` Express handlers into `netlify/functions/` (using `@netlify/functions` or `serverless-http`) and add a redirect rule in `netlify.toml` from `/api/*` to `/.netlify/functions/:splat`.
4. Add `GEMINI_API_KEY` under **Site Configuration → Environment Variables**.
