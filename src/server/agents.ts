import { GoogleGenAI, Type } from '@google/genai';
import { Task, db } from './db';

// Lazy initialization helper for Gemini
let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing. Please set it in Settings > Secrets.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

/**
 * Clean system prompts to ensure 100% JSON compliance.
 * We strip any markdown fence blocks if returned.
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/```$/, '');
  }
  return cleaned.trim();
}

/**
 * Agent 1: Goal Planning Agent
 * Converts a long term goal into monthly, weekly, and daily tasks
 */
export async function runGoalPlanningAgent(params: {
  longTermGoal: string;
  timelineMonths: number;
  availableHoursPerDay: number;
  workingDays: string[];
  preferredStudyTime: string;
}): Promise<{
  monthlyPlan: Array<{ month: number; focus: string; milestones: string[] }>;
  weeklyPlan: Array<{ week: number; month: number; goals: string[] }>;
  dailyTasks: Array<{
    day: number;
    week: number;
    title: string;
    priority: 'high' | 'medium' | 'low';
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedMinutes: number;
    category: 'Learning' | 'Coding' | 'Networking' | 'Planning';
  }>;
}> {
  try {
    const ai = getGeminiClient();
    const prompt = `You are FocusPath AI's Goal Planning Agent, an expert productivity coach.
Convert the following user's long-term goal into a comprehensive structured plan.
Input Details:
- Long-Term Goal: "${params.longTermGoal}"
- Timeline: ${params.timelineMonths} Months
- Available Hours Per Day: ${params.availableHoursPerDay} Hours
- Working Days per Week: ${params.workingDays.join(', ')}
- Preferred Study Time: ${params.preferredStudyTime}

Return ONLY a valid JSON object matching the schema below. Do not output any markdown text outside of the JSON block.

Required Output Schema:
{
  "monthlyPlan": [
    {
      "month": 1,
      "focus": "Focus theme description for Month 1",
      "milestones": ["Milestone 1", "Milestone 2"]
    }
  ],
  "weeklyPlan": [
    {
      "week": 1,
      "month": 1,
      "goals": ["Weekly goal 1", "Weekly goal 2"]
    }
  ],
  "dailyTasks": [
    {
      "day": 1,
      "week": 1,
      "title": "Clear action-oriented task name",
      "priority": "high", 
      "difficulty": "medium",
      "estimatedMinutes": 60,
      "category": "Learning"
    }
  ]
}

Note: The "category" field MUST be exactly one of: "Learning", "Coding", "Networking", or "Planning".
Ensure dailyTasks contains at least 15 logical tasks distributed across the early weeks so the user can immediately execute on them. Give highly specific technical or practical task names matching the goal of "${params.longTermGoal}". For example, if learning full-stack development, have specific tasks like "Set up Node.js project & Express" rather than "Study Node".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    const parsed = JSON.parse(cleanJsonString(text));
    return parsed;
  } catch (e: any) {
    console.error('GoalPlanningAgent error, using fallback:', e);
    // Return high quality fallback plan so the app works even without an API key
    return generateFallbackGoalPlan(params.longTermGoal, params.timelineMonths);
  }
}

/**
 * Agent 2: Scheduler Agent
 * Takes generated tasks and maps them onto specific calendar dates starting from today,
 * skipping non-working days and respecting daily hour limits.
 */
export function runSchedulerAgent(
  dailyTasks: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedMinutes: number;
    category?: 'Learning' | 'Coding' | 'Networking' | 'Planning';
  }>,
  workingDays: string[],
  availableHoursPerDay: number
): Array<{
  title: string;
  priority: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  category: 'Learning' | 'Coding' | 'Networking' | 'Planning';
  date: string; // YYYY-MM-DD
}> {
  const scheduled: Array<any> = [];
  const today = new Date();
  let currentDayOffset = 0;
  
  // Convert workingDays to short english lowercase strings for easy matching
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const workingDayIndices = workingDays.map(d => dayNames.indexOf(d.toLowerCase().slice(0, 3))).filter(i => i !== -1);

  if (workingDayIndices.length === 0) {
    // Fallback if empty
    workingDayIndices.push(1, 2, 3, 4, 5); // mon-fri
  }

  let taskIndex = 0;
  const maxDaysToSchedule = 60; // limit schedule range for sanity
  let daySafetyCounter = 0;

  while (taskIndex < dailyTasks.length && daySafetyCounter < maxDaysToSchedule) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + currentDayOffset);
    const dayOfWeek = targetDate.getDay();

    if (workingDayIndices.includes(dayOfWeek)) {
      // It is a working day, let's schedule tasks for this date up to the hourly limit
      let minutesAllocated = 0;
      const maxMinutes = availableHoursPerDay * 60;

      while (
        taskIndex < dailyTasks.length &&
        minutesAllocated + dailyTasks[taskIndex].estimatedMinutes <= maxMinutes
      ) {
        const t = dailyTasks[taskIndex];
        scheduled.push({
          title: t.title,
          priority: t.priority || 'medium',
          difficulty: t.difficulty || 'medium',
          estimatedMinutes: t.estimatedMinutes,
          category: t.category || 'Learning',
          date: targetDate.toISOString().split('T')[0],
        });
        minutesAllocated += t.estimatedMinutes;
        taskIndex++;
      }

      // If a single task is longer than availableHoursPerDay, allocate it anyway so we don't get stuck
      if (minutesAllocated === 0 && taskIndex < dailyTasks.length) {
        const t = dailyTasks[taskIndex];
        scheduled.push({
          title: t.title,
          priority: t.priority || 'medium',
          difficulty: t.difficulty || 'medium',
          estimatedMinutes: t.estimatedMinutes,
          category: t.category || 'Learning',
          date: targetDate.toISOString().split('T')[0],
        });
        taskIndex++;
      }
    }
    currentDayOffset++;
    daySafetyCounter++;
  }

  // If there are still left-over tasks, map them to the last working day or continue scheduling
  while (taskIndex < dailyTasks.length) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + currentDayOffset);
    scheduled.push({
      title: dailyTasks[taskIndex].title,
      priority: dailyTasks[taskIndex].priority || 'medium',
      difficulty: dailyTasks[taskIndex].difficulty || 'medium',
      estimatedMinutes: dailyTasks[taskIndex].estimatedMinutes,
      category: dailyTasks[taskIndex].category || 'Learning',
      date: targetDate.toISOString().split('T')[0],
    });
    taskIndex++;
    currentDayOffset++;
  }

  return scheduled;
}

/**
 * Agent 4: Performance Analysis Agent (Mathematical Logic)
 * Computes exact stats based on actual task history for a user.
 */
export function runPerformanceAgent(userId: string): {
  completionRate: number;
  consistencyScore: number;
  productivityScore: number;
  streak: number;
  totalPoints: number;
} {
  const allTasks = db.find('tasks', { userId });
  const completed = allTasks.filter(t => t.status === 'completed');
  const totalDue = allTasks.filter(t => t.status === 'completed' || t.status === 'missed');

  // 1. Completion Rate
  const completionRate = totalDue.length > 0 ? Math.round((completed.length / totalDue.length) * 100) : 100;

  // 2. Consistency Score (percentage of scheduled working days with at least one task completed)
  const completedDates = new Set(completed.map(t => t.date));
  const totalDueDates = new Set(totalDue.map(t => t.date));
  const consistencyScore = totalDueDates.size > 0 ? Math.round((completedDates.size / totalDueDates.size) * 100) : 100;

  // 3. Productivity Score (difficulty-weighted and priority-weighted points score)
  // High = 30pt, Medium = 20pt, Low = 10pt. Hard = x1.5, Medium = x1.0, Easy = x0.8
  let points = 0;
  completed.forEach(t => {
    let p = 10;
    if (t.priority === 'high') p = 30;
    else if (t.priority === 'medium') p = 20;

    let multiplier = 1.0;
    if (t.difficulty === 'hard') multiplier = 1.5;
    else if (t.difficulty === 'easy') multiplier = 0.8;

    points += Math.round(p * multiplier);
  });

  const user = db.findOne('users', { _id: userId });
  const streak = user?.streak || 0;

  // Adjust productivity score relative to total scheduled tasks to normalize between 0 and 100
  const maxPossiblePoints = allTasks.length * 30;
  const productivityScore = maxPossiblePoints > 0 ? Math.min(100, Math.round((points / maxPossiblePoints) * 100)) : 100;

  return {
    completionRate,
    consistencyScore,
    productivityScore,
    streak,
    totalPoints: points,
  };
}

/**
 * Agent 5: Rescheduling Agent
 * When tasks are marked as missed, automatically rearranges future schedule.
 * Crucial UX Rule: Preserves any task where isLocked === true!
 */
export async function runReschedulingAgent(userId: string, missedTaskId: string): Promise<{
  rescheduledCount: number;
  atRiskCount: number;
  reason: string;
}> {
  const missedTask = db.findOne('tasks', { _id: missedTaskId });
  if (!missedTask) return { rescheduledCount: 0, atRiskCount: 0, reason: 'Task not found' };

  // Set missed task status
  db.update('tasks', { _id: missedTaskId }, { status: 'missed' });

  const user = db.findOne('users', { _id: userId });
  if (!user) return { rescheduledCount: 0, atRiskCount: 0, reason: 'User not found' };

  // Get all pending future tasks that are NOT locked
  const futureTasks = db.find('tasks', { userId, status: 'pending' });
  const unlockedFutureTasks = futureTasks.filter(t => !t.isLocked);
  const lockedFutureTasks = futureTasks.filter(t => t.isLocked);

  // We want to move the missed task to the next available working day, sliding other unlocked tasks
  // Find next available date
  const todayStr = new Date().toISOString().split('T')[0];
  const allScheduledTasks = [
    { ...missedTask, _id: missedTask._id, status: 'pending', rescheduledFrom: missedTask.date, date: todayStr },
    ...unlockedFutureTasks,
  ];

  // Re-run the Scheduler Agent for all these tasks
  const rescheduledTasks = runSchedulerAgent(
    allScheduledTasks.map(t => ({
      title: t.title,
      priority: t.priority,
      difficulty: t.difficulty,
      estimatedMinutes: t.estimatedMinutes,
      category: t.category,
    })),
    user.workingDays,
    user.availableHoursPerDay
  );

  // Update dates of existing unlocked tasks
  let rescheduledCount = 0;
  for (let i = 0; i < unlockedFutureTasks.length; i++) {
    const originalTask = unlockedFutureTasks[i];
    const newSchedule = rescheduledTasks[i + 1]; // +1 because missedTask is mapped first
    if (newSchedule && originalTask.date !== newSchedule.date) {
      db.update(
        'tasks',
        { _id: originalTask._id },
        { date: newSchedule.date, rescheduledFrom: originalTask.date }
      );
      rescheduledCount++;
    }
  }

  // Update the missed task's duplicate as pending for the next day
  const nextDaySchedule = rescheduledTasks[0];
  if (nextDaySchedule) {
    db.insert('tasks', {
      goalId: missedTask.goalId,
      userId: missedTask.userId,
      title: `${missedTask.title} (Retry)`,
      type: missedTask.type,
      priority: missedTask.priority,
      difficulty: missedTask.difficulty,
      category: missedTask.category || 'Learning',
      date: nextDaySchedule.date,
      status: 'pending',
      rescheduledFrom: missedTask.date,
      isLocked: false,
      estimatedMinutes: missedTask.estimatedMinutes,
    });
    rescheduledCount++;
  }

  // Use Gemini to generate a smart coaching alert on why it was rescheduled
  let alertMessage = `We rescheduled your missed task "${missedTask.title}". Keep pushing!`;
  try {
    const ai = getGeminiClient();
    const prompt = `You are FocusPath AI's Scheduler Rescheduling Agent.
A student/professional missed the task: "${missedTask.title}" scheduled for ${missedTask.date}.
The system has auto-shifted their future plan to protect their timeline.
Provide a short, empathetic, but highly disciplined coaching/mentoring explanation (max 2 sentences) on how they can catch up tomorrow.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.7 },
    });
    if (response.text) {
      alertMessage = response.text.trim();
    }
  } catch (e) {
    console.warn('Fallback on Gemini Rescheduling text generation');
  }

  // Create a notification for the user
  db.insert('notifications', {
    userId,
    type: 'alert',
    message: alertMessage,
    sentAt: new Date().toISOString(),
    read: false,
  });

  return {
    rescheduledCount,
    atRiskCount: lockedFutureTasks.length,
    reason: alertMessage,
  };
}

/**
 * Agent 6: Motivation Agent
 * Personalized coaching feedback based on recent completion metrics
 */
export async function runMotivationAgent(userId: string): Promise<{
  message: string;
  tone: 'celebratory' | 'encouraging' | 'firm';
}> {
  const stats = runPerformanceAgent(userId);
  let tone: 'celebratory' | 'encouraging' | 'firm' = 'encouraging';

  if (stats.completionRate >= 80) {
    tone = 'celebratory';
  } else if (stats.completionRate < 50) {
    tone = 'firm';
  }

  try {
    const ai = getGeminiClient();
    const prompt = `You are FocusPath AI's Motivation Agent, a professional elite career coach.
Analyze the user's performance statistics:
- Completion Rate: ${stats.completionRate}%
- Consistency Score: ${stats.consistencyScore}%
- Daily Streak: ${stats.streak} Days
- Current Points Earned: ${stats.totalPoints} XP

Generate a personalized coaching feedback message (exactly 2-3 sentences).
The message must match the tone: "${tone}".
- If celebratory: Congratulate their high performance and motivate them to double down.
- If encouraging: Guide them to improve, focusing on small daily wins.
- If firm: Deliver a high-accountability call-to-action message challenging them to honor their commitments.

Return ONLY a valid JSON object matching the schema below:
{
  "message": "The custom coach message",
  "tone": "${tone}"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error('Empty response');
    return JSON.parse(cleanJsonString(text));
  } catch (e) {
    // Fallback coach messages based on stats
    let msg = 'Keep moving forward step-by-step! Daily consistency creates elite achievements.';
    if (tone === 'celebratory') {
      msg = `Incredible work! With an outstanding completion rate of ${stats.completionRate}%, you are pacing way ahead of schedule. Keep this elite momentum alive!`;
    } else if (tone === 'firm') {
      msg = `Your current task completion rate has dipped to ${stats.completionRate}%. Let's refocus today, clear your distractions, and reclaim control of your career goals.`;
    }
    return { message: msg, tone };
  }
}

/**
 * Agent 7: Prediction Agent
 * Predicts success probability and completion date based on pace.
 */
export async function runPredictionAgent(userId: string, goalId: string): Promise<{
  successProbability: number;
  expectedCompletionDate: string;
  riskFactors: string[];
}> {
  const goal = db.findOne('goals', { _id: goalId });
  if (!goal) {
    return { successProbability: 50, expectedCompletionDate: 'TBD', riskFactors: ['No active goal configured'] };
  }

  const stats = runPerformanceAgent(userId);
  const tasks = db.find('tasks', { userId, goalId });
  const completed = tasks.filter(t => t.status === 'completed');

  // Math calculation of projected date
  const totalTasksCount = tasks.length;
  const completedTasksCount = completed.length;
  
  let successProbability = 50;
  let riskFactors: string[] = [];
  
  // Calculate probability based on performance metrics
  if (totalTasksCount === 0) {
    successProbability = 75;
  } else {
    successProbability = Math.round(
      (stats.completionRate * 0.5) + (stats.consistencyScore * 0.3) + (Math.min(10, stats.streak) * 2)
    );
    successProbability = Math.max(10, Math.min(100, successProbability));
  }

  // Calculate expected completion date
  const today = new Date();
  let monthsOffset = goal.timelineMonths;
  if (stats.completionRate < 60) {
    // behind schedule, add buffer time
    const delayFactor = stats.completionRate > 0 ? (100 / stats.completionRate) : 2;
    monthsOffset = Math.min(24, Math.round(goal.timelineMonths * delayFactor));
  }
  const projectedDate = new Date(today);
  projectedDate.setMonth(today.getMonth() + monthsOffset);
  const expectedCompletionDate = projectedDate.toISOString().split('T')[0];

  if (stats.completionRate < 60) {
    riskFactors.push('Pace is slower than the timeline requirements');
  }
  if (stats.consistencyScore < 70) {
    riskFactors.push('Inconsistent active days causing workflow delays');
  }
  if (tasks.filter(t => t.status === 'missed').length > 3) {
    riskFactors.push('Frequent missed tasks leading to heavy rescheduling compression');
  }

  if (riskFactors.length === 0) {
    riskFactors.push('None! Excellent pace and continuous streak.');
  }

  // Refine using Gemini for smart insights if key is present
  try {
    const ai = getGeminiClient();
    const prompt = `You are FocusPath AI's Prediction Agent.
Analyze the user's progress towards their goal: "${goal.longTermGoal}"
- Timeline: ${goal.timelineMonths} months
- Total scheduled tasks: ${totalTasksCount}
- Completed tasks: ${completedTasksCount}
- Completion Rate: ${stats.completionRate}%
- Consistency: ${stats.consistencyScore}%
- Streak: ${stats.streak} days

Generate a calibrated risk factors list and success prediction.
Return ONLY valid JSON matching this schema:
{
  "successProbability": ${successProbability},
  "expectedCompletionDate": "${expectedCompletionDate}",
  "riskFactors": ["Specific threat to goal, e.g. lack of weekends schedule study hours", "..."]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(cleanJsonString(text));
    }
  } catch (e) {
    console.warn('Fallback on Gemini Prediction Agent');
  }

  return {
    successProbability,
    expectedCompletionDate,
    riskFactors,
  };
}

/**
 * Fallback Goal Generator for Offline/API-key-less usage
 */
function generateFallbackGoalPlan(longTermGoal: string, timelineMonths: number) {
  const monthlyPlan: any[] = [];
  const weeklyPlan: any[] = [];
  const dailyTasks: any[] = [];

  for (let m = 1; m <= timelineMonths; m++) {
    monthlyPlan.push({
      month: m,
      focus: `Master Phase ${m} of ${longTermGoal}`,
      milestones: [`Milestone A for Month ${m}`, `Milestone B for Month ${m}`],
    });

    for (let w = 1; w <= 4; w++) {
      const globalWeek = (m - 1) * 4 + w;
      weeklyPlan.push({
        week: globalWeek,
        month: m,
        goals: [`Core objective ${w} for Month ${m}`],
      });

      const categories: Array<'Learning' | 'Coding' | 'Networking' | 'Planning'> = ['Planning', 'Learning', 'Coding', 'Networking', 'Learning'];
      // Insert 5 generic study/action items per week
      for (let d = 1; d <= 5; d++) {
        dailyTasks.push({
          day: d,
          week: globalWeek,
          title: `Study & Practice: Milestone ${m}.${w}.${d} of "${longTermGoal}"`,
          priority: d === 1 || d === 3 ? 'high' : d === 5 ? 'low' : 'medium',
          difficulty: d % 3 === 0 ? 'hard' : d % 3 === 1 ? 'easy' : 'medium',
          estimatedMinutes: d % 2 === 0 ? 60 : 120,
          category: categories[(d - 1) % categories.length],
        });
      }
    }
  }

  return { monthlyPlan, weeklyPlan, dailyTasks };
}
