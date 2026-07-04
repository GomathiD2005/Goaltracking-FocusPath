---
title: FocusPath AI
emoji: 🎯
colorFrom: indigo
colorTo: green
sdk: docker
pinned: false
---

# FocusPath AI — Autonomous Goal Execution Platform

FocusPath AI is a state-of-the-art, full-stack AI-powered goal execution, productivity intelligence, and career development platform. Unlike traditional to-do lists that only remind you of tasks, FocusPath AI acts as a personal accountability coach—planning, scheduling, monitoring, predicting, and dynamically rescheduling tasks using Google Gemini.

---

## 🛠️ Complete Tech Stack
*   **Backend:** Node.js, Express, TypeScript, esbuild
*   **Database:** Zero-configuration local JSON database (`/data/db.json`) replicating Mongo/NoSQL structures with high durability
*   **AI Engine:** Google Gemini API (`gemini-3.5-flash`), featuring 7 specialized prompt-engineered agents with elegant offline fallbacks
*   **Frontend:** React 19 (Vite), Tailwind CSS, Lucide Icons, Recharts for advanced analytics
*   **Authentication:** Stateless lightweight signed JWT-like authorization with SHA-256 secure hashing

---

## 🚀 Quick Start Guide

### 1. Configure Secrets
Create a `.env` file in the root directory (or use the Secrets panel in AI Studio) with the following parameters:
```env
# Google Gemini API key (Required for AI generation)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Authentication signing secret
JWT_SECRET="focus-path-ai-super-secret-key-2026"

# Environment
NODE_ENV="development"
```

### 2. Install & Launch Server
Install all package dependencies and boot the development server on Port `3000`:
```bash
npm install
npm run dev
```

### 3. Build & Compile for Production
```bash
npm run build
npm start
```

---

## 📂 Architecture Structure
```
├── /src
│   ├── /components
│   │   └── PercentageRing.tsx   # Interactive progress SVG dial
│   ├── /api
│   │   └── client.ts            # Fetch API client with automatic JWT authorization
│   ├── /server
│   │   ├── db.ts                # Persistent local JSON data layer
│   │   ├── auth.ts              # Password hashing and token security
│   │   └── agents.ts            # 7 specialized AI coach agents wrapping Gemini
│   ├── App.tsx                  # Main single-page interactive React applet
│   ├── main.tsx                 # Core bundle entry point
│   └── index.css                # Custom fonts and utility layout theme
├── server.ts                    # Full-stack Express server entrypoint
├── package.json                 # Scripts and package definitions
└── tsconfig.json                # TypeScript settings
```

---

## 🎖️ The 7 Specialized AI Agents
1.  **Goal Planning Agent:** Translates long-term user ambitions into month-by-month focus categories and daily action plans.
2.  **Scheduler Agent:** Automatically maps action items onto real calendar dates skipping non-working days.
3.  **Reminder Agent:** Prompts the user based on study hour constraints.
4.  **Performance Agent:** Conducts mathematical scoring of completion rates, daily consistency levels, and XP accumulation.
5.  **Rescheduling Agent:** Detects overdue pending items and dynamically shifts remaining workflows forward while strictly protecting user-locked tasks (`isLocked`).
6.  **Motivation Agent:** Acts as an empathetic/firm personal mentor sending personalized feedback quotes.
7.  **Prediction Agent:** Evaluates risks and projects the success probability percentage and targeted goal completion dates.
