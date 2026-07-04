# FocusPath AI — System Architecture
**The 7-Agent System and Closed-Loop Data Flow**

---

## 1. High-Level Architecture Diagram
```
                     ┌───────────────────────────┐
                     │       CLIENT LAYER        │
                     │  React 19 + Tailwind CSS  │
                     └─────────────┬─────────────┘
                                   │ HTTPS REST API + JWT
                     ┌─────────────▼─────────────┐
                     │     APPLICATION LAYER     │
                     │  Node.js + Express API    │
                     └─────────────┬─────────────┘
                                   │ JSON ORM Helpers
                     ┌─────────────▼─────────────┐
                     │     DATA PERSISTENCE      │
                     │   Local JSON DB / Atlas   │
                     └─────────────┬─────────────┘
                                   │
                     ┌─────────────▼─────────────┐
                     │    AI ORCHESTRATION       │
                     │   7 Prompt-Engineered     │
                     │    Gemini API Agents      │
                     └───────────────────────────┘
```

---

## 2. The 7-Agent Orchestration Specification
All agents reside in `/src/server/agents.ts` and call a unified, lazy-initialized Gemini client.

| # | Agent Name | Trigger | Gemini Model | Functionality |
|---|---|---|---|---|
| **1** | **Goal Planning** | On Goal Creation | `gemini-3.5-flash` | Breaks goal down into monthly plans, weekly milestones, and daily logical tasks. |
| **2** | **Scheduler** | Immediately after planning | Deterministic algorithm | Maps logical tasks onto calendar dates matching user's `workingDays` and `availableHoursPerDay`. |
| **3** | **Reminder** | Client fetch | Deterministic logic | Serves custom in-app notifications. |
| **4** | **Performance** | Active task updates | Mathematical logic | Calculates exact completion rate, consistency indicators, and productivity points (XP). |
| **5** | **Rescheduling** | Overdue / Marked Missed | `gemini-3.5-flash` | Moves overdue tasks, slides upcoming items, respects locked tasks, and writes a mentoring update. |
| **6** | **Motivation** | Dashboard render | `gemini-3.5-flash` | Generates celebratory, encouraging, or firm mentoring quotes based on stats. |
| **7** | **Prediction** | Analytics panel loading | `gemini-3.5-flash` | Projects overall success probability (0-100%) and estimated goal completion dates. |

---

## 3. Data Model Relationships
FocusPath AI uses 8 integrated collections mimicking document schemas:

*   **Users:** Stores study hours, days, active streak, and XP score.
*   **Goals:** Stores the active high-level ambition, month roadmap, and status.
*   **Tasks:** Contains specific task details, scheduled date, isLocked toggle, difficulty, and completion status.
*   **Notifications:** System alerts and custom coaching messages.
*   **Progress:** Captures historical scores.
*   **Predictions:** Stores generated success metrics.
*   **Rewards:** Streaks and unlocked milestones.
*   **Activity Logs:** Keeps tracking records for review.
