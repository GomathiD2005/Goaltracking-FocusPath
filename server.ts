import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { db, User, Goal, Task, Notification, Progress, Prediction, Reward, ActivityLog } from './src/server/db';
import { hashPassword, comparePassword, generateToken, verifyToken } from './src/server/auth';
import {
  runGoalPlanningAgent,
  runSchedulerAgent,
  runPerformanceAgent,
  runReschedulingAgent,
  runMotivationAgent,
  runPredictionAgent,
} from './src/server/agents';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS headers (essential since Vite and Express live on same/different ports sometimes)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Auth Middleware
interface AuthRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  const user = db.findOne('users', { _id: decoded.userId });
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }

  req.user = user;
  next();
}

/**
 * Reactive Task Synchronizer
 * Automatically scans and marks overdue tasks as 'missed' and triggers scheduling
 * shift whenever user fetches their tasks, dashboard, or progress.
 */
async function syncUserTasks(userId: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasks = db.find('tasks', { userId, status: 'pending' });
  
  let missedTriggered = false;
  
  for (const task of pendingTasks) {
    if (task.date < todayStr) {
      // Mark as missed & reschedule
      await runReschedulingAgent(userId, task._id);
      db.insert('activityLogs', {
        userId,
        action: 'TASK_AUTO_MISSED',
        metadata: { taskId: task._id, taskTitle: task.title, originalDate: task.date },
        timestamp: new Date().toISOString(),
      });
      missedTriggered = true;
    }
  }

  // If there was rescheduling, we update streak/points accordingly
  if (missedTriggered) {
    // Reset streak if tasks were missed
    db.update('users', { _id: userId }, { streak: 0 });
  }
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Authentication
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role, preferredStudyTime, workingDays, availableHoursPerDay } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    const existingUser = db.findOne('users', { email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const passwordHash = hashPassword(password);
    const user = db.insert('users', {
      name,
      email,
      passwordHash,
      role: role || 'Student',
      preferredStudyTime: preferredStudyTime || 'morning',
      workingDays: workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      availableHoursPerDay: availableHoursPerDay || 2,
      streak: 0,
      totalPoints: 0,
      createdAt: new Date().toISOString(),
    }) as User;

    const token = generateToken({ userId: user._id });
    
    // Welcome Notification
    db.insert('notifications', {
      userId: user._id,
      type: 'alert',
      message: `Welcome to FocusPath AI, ${user.name}! Let's create your first goal and build your execution path.`,
      sentAt: new Date().toISOString(),
      read: false,
    });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredStudyTime: user.preferredStudyTime,
        workingDays: user.workingDays,
        availableHoursPerDay: user.availableHoursPerDay,
        streak: user.streak,
        totalPoints: user.totalPoints,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const user = db.findOne('users', { email }) as User;
    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({ userId: user._id });
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredStudyTime: user.preferredStudyTime,
        workingDays: user.workingDays,
        availableHoursPerDay: user.availableHoursPerDay,
        streak: user.streak,
        totalPoints: user.totalPoints,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({
    user: {
      _id: req.user?._id,
      name: req.user?.name,
      email: req.user?.email,
      role: req.user?.role,
      preferredStudyTime: req.user?.preferredStudyTime,
      workingDays: req.user?.workingDays,
      availableHoursPerDay: req.user?.availableHoursPerDay,
      streak: req.user?.streak,
      totalPoints: req.user?.totalPoints,
    },
  });
});

app.put('/api/auth/profile', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { preferredStudyTime, workingDays, availableHoursPerDay, role } = req.body;
    db.update(
      'users',
      { _id: req.user?._id },
      {
        preferredStudyTime: preferredStudyTime || req.user?.preferredStudyTime,
        workingDays: workingDays || req.user?.workingDays,
        availableHoursPerDay: Number(availableHoursPerDay) || req.user?.availableHoursPerDay,
        role: role || req.user?.role,
      }
    );
    const updatedUser = db.findOne('users', { _id: req.user?._id });
    res.json({ user: updatedUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Goals & Planning
app.post('/api/goals', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { longTermGoal, shortTermGoals, timelineMonths } = req.body;
    const userId = req.user?._id!;

    if (!longTermGoal || !timelineMonths) {
      return res.status(400).json({ error: 'Please provide long term goal and timeline.' });
    }

    // Delete any existing goals for this user to keep a single-active path focus
    db.delete('goals', { userId });
    db.delete('tasks', { userId });

    const goal = db.insert('goals', {
      userId,
      longTermGoal,
      shortTermGoals: shortTermGoals || [],
      timelineMonths: Number(timelineMonths),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }) as Goal;

    // Trigger AI Goal Planner Agent
    const plan = await runGoalPlanningAgent({
      longTermGoal,
      timelineMonths: Number(timelineMonths),
      availableHoursPerDay: req.user?.availableHoursPerDay || 2,
      workingDays: req.user?.workingDays || ['Mon', 'Tue'],
      preferredStudyTime: req.user?.preferredStudyTime || 'morning',
    });

    // Run AI Scheduler Agent to lay out tasks onto actual calendar dates
    const scheduledTasks = runSchedulerAgent(
      plan.dailyTasks,
      req.user?.workingDays || ['Mon', 'Tue'],
      req.user?.availableHoursPerDay || 2
    );

    // Insert scheduled tasks into DB
    for (const task of scheduledTasks) {
      db.insert('tasks', {
        goalId: goal._id,
        userId,
        title: task.title,
        type: 'daily',
        priority: task.priority,
        difficulty: task.difficulty,
        category: task.category || 'Learning',
        date: task.date,
        status: 'pending',
        rescheduledFrom: null,
        isLocked: false,
        estimatedMinutes: task.estimatedMinutes,
      });
    }

    // Insert Log
    db.insert('activityLogs', {
      userId,
      action: 'GOAL_CREATED',
      metadata: { goalId: goal._id, longTermGoal },
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ goal, plan, tasksCount: scheduledTasks.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/goals', authMiddleware, (req: AuthRequest, res) => {
  try {
    const goals = db.find('goals', { userId: req.user?._id });
    res.json({ goals });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Tasks
app.get('/api/tasks', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id!;
    
    // Auto-sync tasks (reactive checking for overdue pending tasks)
    await syncUserTasks(userId);

    const { date, status } = req.query;
    const query: any = { userId };
    if (date) query.date = date;
    if (status) query.status = status;

    const tasks = db.find('tasks', query);
    res.json({ tasks });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/tasks/:id/complete', authMiddleware, (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user?._id!;

    const task = db.findOne('tasks', { _id: taskId });
    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Toggle complete or revert
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    db.update('tasks', { _id: taskId }, { status: newStatus });

    // Handle rewards/points updates
    let pointDelta = 0;
    let updatedStreak = req.user?.streak || 0;

    if (newStatus === 'completed') {
      // High = 30pt, Medium = 20pt, Low = 10pt
      let p = 10;
      if (task.priority === 'high') p = 30;
      else if (task.priority === 'medium') p = 20;

      let multiplier = 1.0;
      if (task.difficulty === 'hard') multiplier = 1.5;
      else if (task.difficulty === 'easy') multiplier = 0.8;

      pointDelta = Math.round(p * multiplier);
      
      // Calculate streak logic (if completed today and haven't completed any task today already)
      const todayStr = new Date().toISOString().split('T')[0];
      const otherCompletedToday = db.find('tasks', { userId, status: 'completed', date: todayStr }).filter(t => t._id !== taskId);
      
      if (otherCompletedToday.length === 0) {
        updatedStreak += 1;
      }

      db.insert('activityLogs', {
        userId,
        action: 'TASK_COMPLETED',
        metadata: { taskId, title: task.title, pointsAwarded: pointDelta },
        timestamp: new Date().toISOString(),
      });

      // Check milestones for rewards
      if (updatedStreak > 0 && updatedStreak % 5 === 0) {
        db.insert('rewards', {
          userId,
          type: 'streak',
          title: `${updatedStreak}-Day Streak Elite`,
          description: `Maintained a perfect continuous streak of ${updatedStreak} active study days!`,
          earnedAt: new Date().toISOString(),
        });
        db.insert('notifications', {
          userId,
          type: 'alert',
          message: `🎖️ Streak Achieved! You earned the "${updatedStreak}-Day Streak Elite" badge!`,
          sentAt: new Date().toISOString(),
          read: false,
        });
      }
    } else {
      // Reverting completed task
      pointDelta = -20; // minor deduct
      db.insert('activityLogs', {
        userId,
        action: 'TASK_REVERTED',
        metadata: { taskId, title: task.title },
        timestamp: new Date().toISOString(),
      });
    }

    const currentPoints = req.user?.totalPoints || 0;
    const finalPoints = Math.max(0, currentPoints + pointDelta);

    db.update('users', { _id: userId }, {
      totalPoints: finalPoints,
      streak: updatedStreak,
    });

    res.json({
      success: true,
      status: newStatus,
      pointsEarned: pointDelta,
      streak: updatedStreak,
      totalPoints: finalPoints,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/tasks/:id/miss', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user?._id!;

    const task = db.findOne('tasks', { _id: taskId });
    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Trigger AI rescheduling flow
    const result = await runReschedulingAgent(userId, taskId);

    // Reset streak on missing tasks
    db.update('users', { _id: userId }, { streak: 0 });

    res.json({
      success: true,
      status: 'missed',
      rescheduledCount: result.rescheduledCount,
      atRiskCount: result.atRiskCount,
      reason: result.reason,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/tasks/:id/lock', authMiddleware, (req: AuthRequest, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user?._id!;

    const task = db.findOne('tasks', { _id: taskId });
    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const nextLock = !task.isLocked;
    db.update('tasks', { _id: taskId }, { isLocked: nextLock });

    res.json({ success: true, isLocked: nextLock });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Progress & Coaching Insights
app.get('/api/progress/:userId', authMiddleware, (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;
    const stats = runPerformanceAgent(userId);
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/predictions/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;
    const activeGoal = db.findOne('goals', { userId, status: 'active' });
    if (!activeGoal) {
      return res.status(400).json({ error: 'No active goal configured.' });
    }

    const prediction = await runPredictionAgent(userId, activeGoal._id);
    res.json(prediction);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/motivate/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;
    const motivation = await runMotivationAgent(userId);
    res.json(motivation);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Notifications
app.get('/api/notifications/:userId', authMiddleware, (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;
    const list = db.find('notifications', { userId }).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    res.json({ notifications: list });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/notifications/:id/read', authMiddleware, (req: AuthRequest, res) => {
  try {
    const notificationId = req.params.id;
    db.update('notifications', { _id: notificationId }, { read: true });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Rewards
app.get('/api/rewards/:userId', authMiddleware, (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;
    const list = db.find('rewards', { userId });
    res.json({ rewards: list });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// VITE CLIENT MIDDLEWARE
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FocusPath AI platform server listening on http://localhost:${PORT}`);
  });
}

startServer();
