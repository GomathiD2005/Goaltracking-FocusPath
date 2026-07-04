# FocusPath AI — REST API Documentation

All protected endpoints require a valid JWT token in the request headers:
`Authorization: Bearer <token>`

---

## 1. Authentication Endpoints

### POST `/api/auth/register`
Creates a new user profile.
*   **Request Body:**
    ```json
    {
      "name": "Gomathi D",
      "email": "name@domain.com",
      "password": "securepassword",
      "role": "Student",
      "preferredStudyTime": "morning",
      "workingDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
      "availableHoursPerDay": 2
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "_id": "abc123xyz",
        "name": "Gomathi D",
        "email": "name@domain.com",
        "streak": 0,
        "totalPoints": 0
      }
    }
    ```

### POST `/api/auth/login`
Logs in an existing user.
*   **Request Body:**
    ```json
    {
      "email": "name@domain.com",
      "password": "securepassword"
    }
    ```
*   **Response (200 OK):** Same as register payload.

---

## 2. Goal & Planning Endpoints

### POST `/api/goals`
Saves a long-term goal and triggers the Goal Planner + Scheduler agents to build daily tasks.
*   **Request Body:**
    ```json
    {
      "longTermGoal": "Learn Full Stack Web Development",
      "timelineMonths": 3,
      "shortTermGoals": ["Master JavaScript", "Build Express Backend"]
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "goal": {
        "_id": "goal987",
        "longTermGoal": "Learn Full Stack Web Development",
        "timelineMonths": 3,
        "status": "active"
      },
      "tasksCount": 45
    }
    ```

---

## 3. Tasks Endpoints

### GET `/api/tasks`
Gets all scheduled execution tasks for the user. Supports optional `date` filter.
*   **Query Parameters:**
    *   `date`: `YYYY-MM-DD` (optional)
*   **Response (200 OK):**
    ```json
    {
      "tasks": [
        {
          "_id": "task111",
          "title": "Set up Node.js & Express server boilerplate",
          "priority": "high",
          "difficulty": "medium",
          "date": "2026-07-04",
          "status": "pending",
          "isLocked": false,
          "estimatedMinutes": 60
        }
      ]
    }
    ```

### PATCH `/api/tasks/:id/complete`
Completes or toggles completion of a task. Awards points and advances streaks.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "status": "completed",
      "pointsEarned": 20,
      "streak": 1,
      "totalPoints": 20
    }
    ```

### PATCH `/api/tasks/:id/miss`
Marks a task as missed. Triggers the Rescheduling Agent to auto-shift future schedules.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "status": "missed",
      "rescheduledCount": 12,
      "atRiskCount": 0,
      "reason": "We shifted your missed task to tomorrow. Keep consistent!"
    }
    ```

### PATCH `/api/tasks/:id/lock`
Locks a task to prevent it from being moved during automatic rescheduling.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "isLocked": true
    }
    ```
