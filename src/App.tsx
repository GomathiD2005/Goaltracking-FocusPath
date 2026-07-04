import React, { useState, useEffect } from 'react';
import {
  Flame,
  Award,
  TrendingUp,
  Calendar,
  Settings,
  Compass,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Brain,
  Bell,
  LogOut,
  CheckCircle,
  Circle,
  RotateCcw,
  User,
  Check,
  ChevronRight,
  Play,
  AlertTriangle,
  RefreshCw,
  Clock,
  BookOpen,
  ArrowRight,
  Shield,
  HelpCircle,
  CalendarDays
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { ApiClient } from './api/client';
import PercentageRing from './components/PercentageRing';

// Interface types
interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
  preferredStudyTime: 'morning' | 'afternoon' | 'night';
  workingDays: string[];
  availableHoursPerDay: number;
  streak: number;
  totalPoints: number;
}

interface Goal {
  _id: string;
  longTermGoal: string;
  shortTermGoals: string[];
  timelineMonths: number;
  status: 'active' | 'completed' | 'paused';
}

interface Task {
  _id: string;
  goalId: string;
  title: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  category?: 'Learning' | 'Coding' | 'Networking' | 'Planning';
  date: string;
  status: 'pending' | 'completed' | 'missed';
  rescheduledFrom: string | null;
  isLocked: boolean;
  estimatedMinutes: number;
}

interface Notification {
  _id: string;
  type: 'morning' | 'pre-task' | 'night-review' | 'alert';
  message: string;
  sentAt: string;
  read: boolean;
}

interface Reward {
  _id: string;
  type: 'streak' | 'milestone' | 'badge';
  title: string;
  description: string;
  earnedAt: string;
}

interface Prediction {
  successProbability: number;
  expectedCompletionDate: string;
  riskFactors: string[];
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('focuspath_token'));
  
  // Active Navigation View
  const [activeView, setActiveView] = useState<'dashboard' | 'tasks' | 'planner' | 'analytics' | 'settings'>('dashboard');
  
  // Category Filter State
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Learning' | 'Coding' | 'Networking' | 'Planning'>('All');
  
  // Auth Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState('Student');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Setup/Goal Form State
  const [longTermGoal, setLongTermGoal] = useState('');
  const [shortTermInput, setShortTermInput] = useState('');
  const [shortTermGoals, setShortTermGoals] = useState<string[]>([]);
  const [timelineMonths, setTimelineMonths] = useState(3);
  const [availableHours, setAvailableHours] = useState(2);
  const [preferredStudyTime, setPreferredStudyTime] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  
  // App Core Data State
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [performanceStats, setPerformanceStats] = useState({
    completionRate: 100,
    consistencyScore: 100,
    productivityScore: 100,
    streak: 0,
    totalPoints: 0,
  });
  const [aiCoachMessage, setAiCoachMessage] = useState({
    message: 'Welcome back! Design your path to start accelerating your execution.',
    tone: 'encouraging',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  // Load User details if token is found
  useEffect(() => {
    if (token) {
      localStorage.setItem('focuspath_token', token);
      fetchUserData();
    } else {
      localStorage.removeItem('focuspath_token');
      setUser(null);
    }
  }, [token]);

  // Load view-specific data when active view changes or active goal updates
  useEffect(() => {
    if (user && activeGoal) {
      if (activeView === 'dashboard') {
        fetchDashboardData();
      } else if (activeView === 'tasks') {
        fetchTasks();
      } else if (activeView === 'planner') {
        fetchPlannerData();
      } else if (activeView === 'analytics') {
        fetchAnalyticsData();
      } else if (activeView === 'settings') {
        fetchSettingsData();
      }
    }
  }, [user, activeGoal, activeView]);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.get('/api/auth/me');
      setUser(res.user);
      
      // Load current goals
      const goalsRes = await ApiClient.get('/api/goals');
      if (goalsRes.goals && goalsRes.goals.length > 0) {
        setActiveGoal(goalsRes.goals[0]);
      } else {
        setActiveGoal(null);
      }
    } catch (e: any) {
      setToken(null);
      setErrorMsg(e.message || 'Session expired. Please log in again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // 1. Get today's tasks
      const todayStr = new Date().toISOString().split('T')[0];
      const tasksRes = await ApiClient.get(`/api/tasks?date=${todayStr}`);
      setTasks(tasksRes.tasks || []);

      // 2. Fetch Notifications
      const notifRes = await ApiClient.get(`/api/notifications/${user._id}`);
      setNotifications(notifRes.notifications || []);

      // 3. Fetch performance metrics
      const perfRes = await ApiClient.get(`/api/progress/${user._id}`);
      setPerformanceStats(perfRes);

      // 4. Fetch motivation
      const motivateRes = await ApiClient.post(`/api/ai/motivate/${user._id}`);
      setAiCoachMessage(motivateRes);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const tasksRes = await ApiClient.get('/api/tasks');
      setTasks(tasksRes.tasks || []);
    } catch (e) {
      console.error('Error fetching all tasks:', e);
    }
  };

  const fetchPlannerData = async () => {
    if (!user) return;
    try {
      // Get AI Predictions
      const predRes = await ApiClient.get(`/api/predictions/${user._id}`);
      setPrediction(predRes);
      
      // Get rewards
      const rewardsRes = await ApiClient.get(`/api/rewards/${user._id}`);
      setRewards(rewardsRes.rewards || []);
    } catch (e) {
      console.error('Error fetching planner data:', e);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!user) return;
    try {
      const perfRes = await ApiClient.get(`/api/progress/${user._id}`);
      setPerformanceStats(perfRes);

      const predRes = await ApiClient.get(`/api/predictions/${user._id}`);
      setPrediction(predRes);

      const tasksRes = await ApiClient.get('/api/tasks');
      setTasks(tasksRes.tasks || []);
    } catch (e) {
      console.error('Error fetching analytics data:', e);
    }
  };

  const fetchSettingsData = async () => {
    if (!user) return;
    try {
      const rewardsRes = await ApiClient.get(`/api/rewards/${user._id}`);
      setRewards(rewardsRes.rewards || []);
    } catch (e) {
      console.error('Error fetching settings metrics:', e);
    }
  };

  // Auth Operations
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        const res = await ApiClient.post('/api/auth/register', {
          name: authName,
          email: authEmail,
          password: authPassword,
          role: authRole,
          preferredStudyTime,
          workingDays,
          availableHoursPerDay: availableHours,
        });
        setSuccessMsg('Account created successfully!');
        setToken(res.token);
      } else {
        const res = await ApiClient.post('/api/auth/login', {
          email: authEmail,
          password: authPassword,
        });
        setToken(res.token);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Authentication failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Profile Setup & Goal Generation
  const handleGoalSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longTermGoal) return;
    setErrorMsg('');
    setIsLoading(true);

    try {
      // 1. Update user profile schedule if different
      await ApiClient.put('/api/auth/profile', {
        preferredStudyTime,
        workingDays,
        availableHoursPerDay: availableHours,
        role: authRole,
      });

      // 2. Build Goal Path
      const res = await ApiClient.post('/api/goals', {
        longTermGoal,
        shortTermGoals,
        timelineMonths,
      });

      setActiveGoal(res.goal);
      setActiveView('dashboard');
      setSuccessMsg('AI has structured and scheduled your goal execution map!');
    } catch (e: any) {
      setErrorMsg(e.message || 'Error configuring path.');
    } finally {
      setIsLoading(false);
    }
  };

  // Action Handlers
  const toggleTaskComplete = async (taskId: string) => {
    setIsActionLoading(taskId);
    try {
      const res = await ApiClient.patch(`/api/tasks/${taskId}/complete`);
      // Update local state smoothly
      setTasks(tasks.map(t => (t._id === taskId ? { ...t, status: res.status } : t)));
      
      // Update points and streak
      if (user) {
        setUser({
          ...user,
          totalPoints: res.totalPoints,
          streak: res.streak,
        });
      }
      
      // Refresh Stats
      const perfRes = await ApiClient.get(`/api/progress/${user?._id}`);
      setPerformanceStats(perfRes);
    } catch (e: any) {
      console.error('Error toggling complete:', e);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleTaskMiss = async (taskId: string) => {
    setIsActionLoading(taskId);
    try {
      const res = await ApiClient.patch(`/api/tasks/${taskId}/miss`);
      // Update tasks list to reflect rescheduled items
      fetchTasks();
      
      // Update coach message & alert notify
      if (res.reason) {
        setAiCoachMessage({ message: res.reason, tone: 'firm' });
      }
      
      // Refresh stats
      const perfRes = await ApiClient.get(`/api/progress/${user?._id}`);
      setPerformanceStats(perfRes);
    } catch (e) {
      console.error('Error marking task as missed:', e);
    } finally {
      setIsActionLoading(null);
    }
  };

  const toggleTaskLock = async (taskId: string) => {
    try {
      const res = await ApiClient.patch(`/api/tasks/${taskId}/lock`);
      setTasks(tasks.map(t => (t._id === taskId ? { ...t, isLocked: res.isLocked } : t)));
    } catch (e) {
      console.error('Error locking task:', e);
    }
  };

  const dismissNotification = async (notifId: string) => {
    try {
      await ApiClient.patch(`/api/notifications/${notifId}/read`);
      setNotifications(notifications.filter(n => n._id !== notifId));
    } catch (e) {
      console.error('Error reading notice:', e);
    }
  };

  const addShortTermGoal = () => {
    if (shortTermInput.trim()) {
      setShortTermGoals([...shortTermGoals, shortTermInput.trim()]);
      setShortTermInput('');
    }
  };

  const removeShortTermGoal = (index: number) => {
    setShortTermGoals(shortTermGoals.filter((_, i) => i !== index));
  };

  const handleLogout = () => {
    localStorage.removeItem('focuspath_token');
    setToken(null);
    setUser(null);
    setActiveGoal(null);
    setTasks([]);
  };

  // Helper category utility functions
  const getCategoryBadgeClass = (category?: string) => {
    const cat = category || 'Learning';
    switch (cat) {
      case 'Learning':
        return 'bg-blue-950/60 text-blue-400 border border-blue-900/50';
      case 'Coding':
        return 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50';
      case 'Networking':
        return 'bg-purple-950/60 text-purple-400 border border-purple-900/50';
      case 'Planning':
        return 'bg-amber-950/60 text-amber-400 border border-amber-900/50';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  const getCategoryStats = () => {
    const categories: Array<'Learning' | 'Coding' | 'Networking' | 'Planning'> = ['Learning', 'Coding', 'Networking', 'Planning'];
    return categories.map(cat => {
      const catTasks = tasks.filter(t => (t.category || 'Learning') === cat);
      const completed = catTasks.filter(t => t.status === 'completed');
      const completionRate = catTasks.length > 0 ? Math.round((completed.length / catTasks.length) * 100) : 0;
      
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

      return {
        category: cat,
        total: catTasks.length,
        completed: completed.length,
        completionRate,
        points
      };
    });
  };

  const filteredTasks = tasks.filter(t => selectedCategory === 'All' || (t.category || 'Learning') === selectedCategory);

  // Helper mapping values for analytical mock graphics
  const analyticsData = [
    { name: 'Mon', completion: 60, target: 100 },
    { name: 'Tue', completion: 80, target: 100 },
    { name: 'Wed', completion: performanceStats.completionRate, target: 100 },
    { name: 'Thu', completion: Math.min(100, Math.round(performanceStats.completionRate * 1.1)), target: 100 },
    { name: 'Fri', completion: 100, target: 100 },
  ];

  // Render Login / Register View
  if (!token || !user) {
    return (
      <div 
        className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans bg-cover bg-center relative"
        style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.97), rgba(15, 23, 42, 0.94)), url('/src/assets/images/bg_gamified_dark_1783195535997.jpg')` }}
      >
        <div className="absolute inset-0 bg-slate-950/15 backdrop-blur-[2px]"></div>
        {/* Soft floating blur circles for neon backglow */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 max-w-md w-full space-y-8 bg-slate-900/80 p-8 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-xl transition-all duration-300">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Compass className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-100 tracking-tight">
              FocusPath AI
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              AI Powered Goal Execution & Productivity Coaching Platform
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleAuth}>
            {errorMsg && (
              <div className="bg-rose-950/50 border border-rose-800/60 rounded-xl p-3 text-rose-300 text-sm flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-3 text-emerald-300 text-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="rounded-md space-y-4">
              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                    placeholder="Gomathi D"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                  placeholder="name@domain.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>

              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Professional / Academic Role</label>
                  <select
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                  >
                    <option value="Student">Student (Hackathons, Placement, College)</option>
                    <option value="Software Engineer">Software Engineer (V2 migration, Development)</option>
                    <option value="Product Manager">Product Manager (Specs, Roadmap)</option>
                    <option value="UI/UX Designer">UI/UX Designer (Aesthetic Pairings)</option>
                    <option value="Entrepreneur">Founder / Startup Builder</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : isRegistering ? (
                'Create FocusPath Profile'
              ) : (
                'Access Goal Dashboard'
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-all"
            >
              {isRegistering ? 'Already have an account? Log in' : 'New to FocusPath? Register profile'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Goal Creation Setup View if user has no goal
  if (!activeGoal) {
    return (
      <div 
        className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans bg-cover bg-center relative"
        style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.94)), url('/src/assets/images/bg_peach_minimalist_1783195556668.jpg')` }}
      >
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]"></div>
        {/* Soft floating blur circles for setup neon backglow */}
        <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-xl w-full mx-auto bg-slate-900/85 p-8 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-xl space-y-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/30">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Setup Your Autonomous Goal Execution Map</h2>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              FocusPath AI acts as a personal accountability coach. Tell us your long-term ambition, daily availability, and schedule structure, and we will build your adaptive daily execution path.
            </p>
          </div>

          <form onSubmit={handleGoalSetup} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">What is your major long-term goal?</label>
              <textarea
                required
                rows={2}
                value={longTermGoal}
                onChange={(e) => setLongTermGoal(e.target.value)}
                placeholder="e.g. Learn Full Stack Development to build a startup, or Crack top product company placement in 6 months, or learn Data Structures & Algorithms (DSA)."
                className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Completion Timeline</label>
                <select
                  value={timelineMonths}
                  onChange={(e) => setTimelineMonths(Number(e.target.value))}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                >
                  <option value={1}>1 Month (Sprint)</option>
                  <option value={3}>3 Months (Quarterly execution)</option>
                  <option value={6}>6 Months (Deep adaptation)</option>
                  <option value={12}>12 Months (Comprehensive development)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Daily Available Study Hours</label>
                <select
                  value={availableHours}
                  onChange={(e) => setAvailableHours(Number(e.target.value))}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                >
                  <option value={1}>1 Hour per day</option>
                  <option value={2}>2 Hours per day</option>
                  <option value={3}>3 Hours per day</option>
                  <option value={4}>4 Hours per day</option>
                  <option value={6}>6 Hours per day (High priority)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Select Active Study Days</label>
              <div className="flex flex-wrap gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const isSelected = workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setWorkingDays(workingDays.filter((d) => d !== day));
                        } else {
                          setWorkingDays([...workingDays, day]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/15'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Preferred Study/Execution Time</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['morning', 'afternoon', 'night'] as const).map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setPreferredStudyTime(time)}
                      className={`py-2 rounded-lg border text-xs font-semibold capitalize transition-all ${
                        preferredStudyTime === time
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/15'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Add Specific Short-Term Milestones (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shortTermInput}
                    onChange={(e) => setShortTermInput(e.target.value)}
                    placeholder="e.g. Learn React, master sorting algorithms"
                    className="flex-1 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3 py-2 outline-none text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addShortTermGoal}
                    className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {shortTermGoals.map((milestone, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-slate-950 text-indigo-400 border border-indigo-950 rounded-lg px-2 py-0.5 text-[10px] font-medium"
                    >
                      {milestone}
                      <button type="button" onClick={() => removeShortTermGoal(i)}>
                        <Trash2 className="w-3 h-3 text-rose-500 hover:text-rose-400" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-xl text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>AI Agent is mapping your daily path... Please wait</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Launch My Autonomous FocusPath</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Premium ambient glow lights inspired by the Dribbble/Zapier designs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-emerald-500/5 blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] left-[60%] w-[35%] h-[35%] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none z-0"></div>

      {/* 1. Header/Navigation bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/10">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              FocusPath AI <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-900 font-semibold uppercase tracking-wide">Beta</span>
            </h1>
          </div>
        </div>

        {/* Desktop navbar */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: CalendarDays },
            { id: 'tasks', label: 'Execution Tasks', icon: CheckCircle },
            { id: 'planner', label: 'AI Plan Map', icon: Compass },
            { id: 'analytics', label: 'Intelligence Analytics', icon: TrendingUp },
            { id: 'settings', label: 'Schedule Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* User XP stats panel */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-amber-950/20 border border-amber-900/40 rounded-xl px-3 py-1">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold font-mono text-amber-500">{user.streak} Day Streak</span>
          </div>

          <div className="flex items-center gap-1 bg-indigo-950/30 border border-indigo-900/40 rounded-xl px-3 py-1">
            <Award className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold font-mono text-indigo-400">{user.totalPoints} XP</span>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile nav indicator bar */}
      <nav className="md:hidden flex justify-around bg-slate-900 border-b border-slate-800 px-2 py-1 sticky top-[53px] z-40">
        {[
          { id: 'dashboard', label: 'Dash', icon: CalendarDays },
          { id: 'tasks', label: 'Tasks', icon: CheckCircle },
          { id: 'planner', label: 'Planner', icon: Compass },
          { id: 'analytics', label: 'Stats', icon: TrendingUp },
          { id: 'settings', label: 'Config', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-semibold transition-all ${
                isSelected ? 'text-indigo-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Content Pane */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Active notifications banner alert if any */}
        {notifications.filter(n => !n.read).slice(0, 1).map((notif) => (
          <div key={notif._id} className="bg-indigo-950/40 border border-indigo-900/50 rounded-2xl p-4 flex items-start gap-3 justify-between">
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 flex-shrink-0 mt-0.5">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">AI Coaching Intelligence Update</h4>
                <p className="text-sm text-slate-200 mt-1">{notif.message}</p>
              </div>
            </div>
            <button
              onClick={() => dismissNotification(notif._id)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-2 py-1 border border-indigo-900/50 rounded-xl transition-all"
            >
              Dismiss
            </button>
          </div>
        ))}

        {/* 1. VIEW: DASHBOARD */}
        {activeView === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle Column (Goal overview, Today's path tasks) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Goal Overview Panel with Gamified Dark Dribbble Backdrop */}
              <div 
                className="relative overflow-hidden p-7 rounded-2xl border border-slate-800/80 shadow-2xl bg-cover bg-center transition-all duration-300 hover:scale-[1.005]"
                style={{ backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.65)), url('/src/assets/images/bg_gamified_dark_1783195535997.jpg')` }}
              >
                <div className="relative z-10">
                  <span className="text-[10px] font-extrabold tracking-wider text-indigo-400 bg-indigo-950/90 border border-indigo-900/80 px-3 py-1 rounded-lg uppercase backdrop-blur-sm">
                    Active Career Strategy Path
                  </span>
                  <h3 className="text-xl font-bold mt-4 text-slate-100 tracking-tight leading-snug drop-shadow">{activeGoal.longTermGoal}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/60">
                    <div className="space-y-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/30 backdrop-blur-sm">
                      <span className="text-xs text-slate-400">Target Completion</span>
                      <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        {activeGoal.timelineMonths} Months timeline
                      </p>
                    </div>
                    <div className="space-y-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/30 backdrop-blur-sm">
                      <span className="text-xs text-slate-400">Daily Study Target</span>
                      <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        {user.availableHours} Hours / day
                      </p>
                    </div>
                    <div className="space-y-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/30 backdrop-blur-sm">
                      <span className="text-xs text-slate-400">Execution Schedule</span>
                      <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-indigo-400" />
                        {user.workingDays.length} Working days
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's scheduled daily tasks */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-base font-bold tracking-tight text-slate-200 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-indigo-500" />
                    Today's AI Execution Path
                  </h3>
                  
                  {/* Category filters */}
                  <div className="flex flex-wrap gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                    {(['All', 'Learning', 'Coding', 'Networking', 'Planning'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          selectedCategory === cat
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                    <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm text-slate-400">
                      {tasks.length === 0 
                        ? "No execution tasks scheduled for today. Take a restful study break!"
                        : `No tasks matching the "${selectedCategory}" category filter today.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredTasks.map((task) => (
                      <div
                        key={task._id}
                        className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                          task.status === 'completed'
                            ? 'bg-slate-900/40 border-emerald-900/30 opacity-75'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTaskComplete(task._id)}
                            disabled={isActionLoading === task._id}
                            className="text-slate-400 hover:text-indigo-500 transition-all flex-shrink-0"
                          >
                            {task.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 fill-emerald-950" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-500" />
                            )}
                          </button>
                          
                          <div>
                            <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${getCategoryBadgeClass(task.category)}`}>
                                {task.category || 'Learning'}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                task.priority === 'high' ? 'bg-rose-950/60 text-rose-400 border border-rose-900/50' :
                                task.priority === 'medium' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' :
                                'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {task.priority} Priority
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> {task.estimatedMinutes} mins
                              </span>
                              {task.rescheduledFrom && (
                                <span className="text-[9px] text-rose-400 font-bold bg-rose-950/20 border border-rose-950 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <RotateCcw className="w-2.5 h-2.5 animate-spin-slow" /> Shifted
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleTaskLock(task._id)}
                            title={task.isLocked ? 'Task locked from auto-rescheduling' : 'Lock task to prevent auto-rescheduling'}
                            className={`p-1.5 rounded-lg border transition-all ${
                              task.isLocked
                                ? 'bg-indigo-950/30 border-indigo-900/60 text-indigo-400'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                            }`}
                          >
                            {task.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                          
                          {task.status !== 'completed' && (
                            <button
                              onClick={() => handleTaskMiss(task._id)}
                              title="Reschedule (Mark as missed)"
                              className="p-1.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-900/40 rounded-lg transition-all"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (AI Coach banner, analytics progress indicators) */}
            <div className="space-y-6">
              {/* Dynamic AI Motivation Coach Message */}
              <div 
                className="p-6 rounded-2xl border border-indigo-900/40 shadow-lg relative overflow-hidden bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(to bottom right, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.8)), url('/src/assets/images/bg_gamified_dark_1783195535997.jpg')` }}
              >
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Brain className="w-36 h-36" />
                </div>
                
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 bg-indigo-500 rounded-lg text-white">
                    <Brain className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Personal Productivity Coach</h4>
                </div>
                
                <blockquote className="text-sm font-medium text-slate-200 leading-relaxed italic">
                  "{aiCoachMessage.message}"
                </blockquote>
                
                <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-slate-800">
                  <span className="text-[10px] font-bold tracking-wide uppercase text-slate-400 flex items-center gap-1.5">
                    Coaching Mode: 
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      aiCoachMessage.tone === 'celebratory' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                      aiCoachMessage.tone === 'firm' ? 'bg-rose-950 text-rose-400 border border-rose-900' :
                      'bg-indigo-950 text-indigo-400 border border-indigo-900'
                    }`}>
                      {aiCoachMessage.tone}
                    </span>
                  </span>
                </div>
              </div>

              {/* Progress Gauges Widget with Premium Gamified Background */}
              <div 
                className="relative overflow-hidden p-6 rounded-2xl border border-indigo-950/40 shadow-2xl bg-cover bg-center space-y-6"
                style={{ backgroundImage: `linear-gradient(to bottom right, rgba(15, 23, 42, 0.96), rgba(30, 27, 75, 0.45)), url('/src/assets/images/bg_gamified_dark_1783195535997.jpg')` }}
              >
                <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest relative z-10">Goal Progress Intelligence</h4>
                
                <div className="flex items-center justify-center py-4">
                  <PercentageRing
                    percentage={performanceStats.completionRate}
                    size={130}
                    strokeWidth={10}
                    label="Completion"
                    colorClass="text-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div className="text-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Consistency</span>
                    <p className="text-base font-bold font-mono text-indigo-400 mt-1">{performanceStats.consistencyScore}%</p>
                  </div>
                  <div className="text-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Productivity Index</span>
                    <p className="text-base font-bold font-mono text-emerald-400 mt-1">{performanceStats.productivityScore}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. VIEW: TASKS EXECUTION LIST */}
        {activeView === 'tasks' && (
          <div className="space-y-6">
            {/* Pristine Clean White/Gray Header Banner inspired by Dribbble */}
            <div 
              className="relative overflow-hidden p-6 md:p-8 rounded-2xl border border-slate-200/25 shadow-2xl bg-cover bg-center text-slate-900"
              style={{ backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.96), rgba(240, 244, 248, 0.88)), url('/src/assets/images/bg_clean_dashboard_1783195567806.jpg')` }}
            >
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider text-indigo-700 bg-indigo-50/80 border border-indigo-200 px-2.5 py-1 rounded-lg uppercase">
                    Execution Board
                  </span>
                  <h2 className="text-xl md:text-2xl font-black mt-3 text-slate-900 tracking-tight flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-indigo-600" />
                    Your Planned Execution Schedule
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl font-medium">
                    Manage your daily tasks. Locked tasks remain anchored during auto-rescheduling calculations when milestones are shifted.
                  </p>
                </div>

                <div className="flex flex-col gap-2 items-start md:items-end bg-white/80 p-3 rounded-xl border border-slate-200/50 backdrop-blur-sm shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Auto-Rescheduling engine</span>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Operational & Active
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Target Path Checkpoints</h3>
              </div>

              <div className="flex items-center gap-3">
                {/* Category filters */}
                <div className="flex flex-wrap gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['All', 'Learning', 'Coding', 'Networking', 'Planning'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete Scheduled Tasks Board with subtle grid textures */}
            {filteredTasks.length === 0 ? (
              <div 
                className="relative overflow-hidden p-12 rounded-3xl border border-slate-800 text-center space-y-4 bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.92)), url('/src/assets/images/bg_clean_dashboard_1783195567806.jpg')` }}
              >
                <div className="relative z-10 space-y-3">
                  <Calendar className="w-12 h-12 text-slate-500 mx-auto animate-bounce" />
                  <p className="text-sm text-slate-300 font-medium">
                    {tasks.length === 0 
                      ? "No scheduled tasks found on your path."
                      : `No tasks found matching the "${selectedCategory}" category.`}
                  </p>
                </div>
              </div>
            ) : (
              <div 
                className="relative overflow-hidden p-6 md:p-8 rounded-3xl border border-slate-800/80 shadow-2xl bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.92)), url('/src/assets/images/bg_clean_dashboard_1783195567806.jpg')` }}
              >
                {/* Tasks categorized by status */}
                <div className="grid grid-cols-1 gap-4 relative z-10">
                  {filteredTasks.map((task) => (
                    <div
                      key={task._id}
                      className={`p-5 rounded-2xl border-y border-r transition-all duration-300 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm hover:shadow-lg relative overflow-hidden ${
                        task.status === 'completed' 
                          ? 'bg-slate-900/35 border-emerald-900/20 opacity-70 border-l-[5px] border-l-emerald-500/80' 
                          : task.status === 'missed' 
                            ? 'bg-slate-900/60 border-rose-950/20 border-l-[5px] border-l-rose-500/80' 
                            : `bg-slate-900/75 hover:bg-slate-900/90 border-slate-800/80 hover:border-slate-700/80 border-l-[5px] ${
                                task.category === 'Coding' ? 'border-l-emerald-500 hover:shadow-emerald-950/10' :
                                task.category === 'Networking' ? 'border-l-purple-500 hover:shadow-purple-950/10' :
                                task.category === 'Planning' ? 'border-l-amber-500 hover:shadow-amber-950/10' :
                                'border-l-indigo-500 hover:shadow-indigo-950/10'
                              }`
                      }`}
                    >
                      {/* Left side content */}
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleTaskComplete(task._id)}
                          disabled={isActionLoading === task._id}
                          className="mt-0.5 text-slate-400 hover:text-indigo-500 transition-all flex-shrink-0 cursor-pointer active:scale-90"
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle className="w-6 h-6 text-emerald-500 fill-emerald-950/60 animate-bounce" />
                          ) : task.status === 'missed' ? (
                            <AlertTriangle className="w-6 h-6 text-rose-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-slate-500 hover:text-indigo-400" />
                          )}
                        </button>
 
                        <div className="space-y-1.5">
                          <p className={`text-sm md:text-base font-bold tracking-tight ${task.status === 'completed' ? 'line-through text-slate-400 font-semibold' : 'text-slate-100'}`}>
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide ${getCategoryBadgeClass(task.category)}`}>
                              {task.category || 'Learning'}
                            </span>
                            <span className="text-[10px] text-slate-300 font-bold bg-slate-950/60 px-2.5 py-0.5 rounded-lg border border-slate-800/60 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-indigo-400" /> {task.date}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide ${
                              task.priority === 'high' ? 'bg-rose-950/60 text-rose-400 border border-rose-900/50' :
                              task.priority === 'medium' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' :
                              'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                            }`}>
                              {task.priority} Priority
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide ${
                              task.difficulty === 'hard' ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/50' :
                              'bg-slate-800/80 text-slate-300'
                            }`}>
                              {task.difficulty} Difficulty
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-0.5 bg-slate-950/30 px-1.5 py-0.5 rounded-md">
                              <Clock className="w-3 h-3 text-indigo-400" /> {task.estimatedMinutes} mins
                            </span>
                            {task.rescheduledFrom && (
                              <span className="text-[9px] text-rose-400 font-black bg-rose-950/30 border border-rose-950/40 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                                <RotateCcw className="w-2.5 h-2.5" /> Shifted from {task.rescheduledFrom}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
 
                      {/* Right side controls */}
                      <div className="flex items-center gap-2 ml-10 md:ml-0 self-end md:self-center">
                        {/* Lock Toggle */}
                        <button
                          onClick={() => toggleTaskLock(task._id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${
                            task.isLocked
                              ? 'bg-indigo-950/45 border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/60'
                              : 'bg-slate-950/80 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          {task.isLocked ? <Lock className="w-3.5 h-3.5 text-indigo-400" /> : <Unlock className="w-3.5 h-3.5" />}
                          <span className="text-[10px] tracking-wide uppercase">{task.isLocked ? 'Locked' : 'Lock'}</span>
                        </button>
 
                        {/* Miss Reschedule Trigger */}
                        {task.status !== 'completed' && task.status !== 'missed' && (
                          <button
                            onClick={() => handleTaskMiss(task._id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/80 border border-slate-800/80 text-slate-400 hover:text-rose-400 hover:border-rose-900/40 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-[10px] tracking-wide uppercase">Miss & Shift</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. VIEW: AI PLANNER MAP */}
        {activeView === 'planner' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Goals Map, Milestones */}
            <div className="lg:col-span-2 space-y-6">
              <div 
                className="relative overflow-hidden p-8 rounded-3xl border border-slate-800/80 shadow-2xl bg-cover bg-center transition-all duration-300 hover:scale-[1.002]"
                style={{ backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.8)), url('/src/assets/images/bg_orange_zen_1783195546057.jpg')` }}
              >
                <div className="relative z-10">
                  <span className="text-[10px] font-extrabold tracking-wider text-amber-400 bg-amber-950/80 border border-amber-900/60 px-3 py-1 rounded-lg uppercase backdrop-blur-sm">
                    AI Planning Roadmap
                  </span>
                  <h3 className="text-xl md:text-2xl font-black mt-4 text-slate-100 tracking-tight leading-none">Monthly Strategy & Weekly Milestones</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl font-medium">Autonomous layout of your developmental stages based on career timelines.</p>

                  <div className="space-y-6 mt-8 relative">
                    {/* Glowing path connection line */}
                    <div className="absolute left-[5px] top-2 bottom-6 w-0.5 bg-gradient-to-b from-indigo-500 via-amber-500 to-indigo-500/20"></div>

                    {[
                      { month: 1, focus: 'Foundation & Core Setup', goals: ['Configure environment & CLI setups', 'Master fundamental algorithm patterns'] },
                      { month: 2, focus: 'Advanced Implementation', goals: ['Build robust REST APIs with Express & SQL', 'Integrate state management engines'] },
                      { month: 3, focus: 'Optimization & Integration', goals: ['Conduct end-to-end load testing', 'Deploy Docker microservices to cloud'] },
                    ].map((m) => (
                      <div key={m.month} className="relative pl-8 pb-2 group">
                        {/* Glowing dot */}
                        <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-slate-950 border-[3px] border-amber-500 ring-4 ring-amber-500/15 group-hover:scale-110 transition-all duration-300 z-10"></div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-900/30">Month {m.month}</span>
                        <h4 className="text-base font-bold text-slate-100 mt-2 tracking-tight group-hover:text-amber-300 transition-colors">{m.focus}</h4>
                        
                        <ul className="mt-2.5 space-y-1.5 text-xs text-slate-300 list-disc list-inside bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 backdrop-blur-sm">
                          {m.goals.map((g, i) => <li key={i} className="leading-relaxed font-medium">{g}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Predictive Success and Badges */}
            <div className="space-y-6">
              {/* Prediction widget */}
              {prediction ? (
                <div 
                  className="relative overflow-hidden p-6 rounded-3xl border border-amber-950/30 shadow-2xl bg-cover bg-center space-y-4"
                  style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(30, 24, 18, 0.72)), url('/src/assets/images/bg_orange_zen_1783195546057.jpg')` }}
                >
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2 text-amber-400">
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                      <h4 className="text-xs font-extrabold uppercase tracking-widest">AI Completion Prediction</h4>
                    </div>
                    
                    <div className="pt-2 text-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800/30 backdrop-blur-sm">
                      <span className="text-4xl font-black font-mono text-amber-400 drop-shadow-md">{prediction.successProbability}%</span>
                      <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wide">Success Probability</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-800/50">
                      <div className="flex items-center justify-between text-xs bg-slate-950/30 p-2 rounded-lg">
                        <span className="text-slate-400 font-medium">Projected Completion</span>
                        <span className="font-extrabold text-amber-400 font-mono text-xs">{prediction.expectedCompletionDate}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Risk Factors Analyzed:</span>
                        {prediction.riskFactors.map((r, i) => (
                          <div key={i} className="flex gap-2.5 items-start text-xs text-rose-300 bg-rose-950/40 border border-rose-950/40 p-2.5 rounded-xl backdrop-blur-sm">
                            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
                            <span className="font-medium leading-normal">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  Generating performance success prediction...
                </div>
              )}

              {/* Achievements Rewards */}
              <div 
                className="relative overflow-hidden p-6 rounded-3xl border border-indigo-950/30 shadow-2xl bg-cover bg-center space-y-4"
                style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(24, 18, 36, 0.7)), url('/src/assets/images/bg_peach_minimalist_1783195556668.jpg')` }}
              >
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Award className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-widest">Unlocked Badges</h4>
                  </div>

                  {rewards.length === 0 ? (
                    <div className="text-xs text-slate-400 font-bold italic p-3 text-center bg-slate-950/60 rounded-2xl border border-slate-800/40 backdrop-blur-sm">
                      Earn XP points to unlock your first milestone badge!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {rewards.map((r) => (
                        <div key={r._id} className="p-3 bg-slate-950/75 rounded-2xl border border-indigo-500/10 flex gap-3 items-center hover:border-indigo-500/30 transition-all duration-300 backdrop-blur-sm shadow-sm">
                          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-100 tracking-tight">{r.title}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{r.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. VIEW: INTELLIGENCE ANALYTICS */}
        {activeView === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side: Charts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recharts chart completion rate with Premium Gamified Backdrop */}
              <div 
                className="relative overflow-hidden p-6 md:p-8 rounded-3xl border border-indigo-950/40 shadow-2xl bg-cover bg-center transition-all duration-300 hover:border-indigo-900/40"
                style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(20, 18, 48, 0.72)), url('/src/assets/images/bg_gamified_dark_1783195535997.jpg')` }}
              >
                <div className="relative z-10">
                  <h3 className="text-sm font-extrabold text-indigo-400 uppercase tracking-widest mb-6">Completion Consistency Curve</h3>
                  
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" strokeOpacity={0.5} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                        <YAxis stroke="#64748b" fontSize={11} fontWeight={600} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#312e81', borderRadius: '16px', color: '#f1f5f9' }} />
                        <Area type="monotone" dataKey="completion" stroke="#6366f1" fillOpacity={1} fill="url(#colorCompletion)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Workload distribution chart */}
              <div 
                className="relative overflow-hidden p-6 md:p-8 rounded-3xl border border-emerald-950/30 shadow-2xl bg-cover bg-center transition-all duration-300 hover:border-emerald-900/30"
                style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(16, 28, 24, 0.72)), url('/src/assets/images/bg_gamified_dark_1783195535997.jpg')` }}
              >
                <div className="relative z-10">
                  <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-widest mb-6">Execution Workload Balance</h3>
                  
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { day: 'Mon', tasks: 3 },
                        { day: 'Tue', tasks: 2 },
                        { day: 'Wed', tasks: tasks.length || 2 },
                        { day: 'Thu', tasks: 3 },
                        { day: 'Fri', tasks: 4 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" strokeOpacity={0.5} />
                        <XAxis dataKey="day" stroke="#64748b" fontSize={11} fontWeight={600} />
                        <YAxis stroke="#64748b" fontSize={11} fontWeight={600} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#064e3b', borderRadius: '16px', color: '#f1f5f9' }} />
                        <Bar dataKey="tasks" fill="#10b981" radius={[6, 6, 0, 0]}>
                          <Cell fill="#10b981" />
                          <Cell fill="#10b981" />
                          <Cell fill="#6366f1" />
                          <Cell fill="#10b981" />
                          <Cell fill="#10b981" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Goal Category Mastery breakdown with Soft Peach Minimalist Backdrop */}
              <div 
                className="relative overflow-hidden p-8 rounded-3xl border border-slate-800/80 shadow-2xl bg-cover bg-center space-y-6"
                style={{ backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.8)), url('/src/assets/images/bg_peach_minimalist_1783195556668.jpg')` }}
              >
                <div className="relative z-10">
                  <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-widest">Goal Category Mastery Breakdown</h3>
                  <p className="text-xs text-slate-300 mt-1 font-medium">Completion ratios and points accumulated across your learning, coding, networking, and planning schedules.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  {getCategoryStats().map((stat) => (
                    <div key={stat.category} className="p-5 bg-slate-950/85 rounded-2xl border border-slate-800/60 space-y-3.5 shadow-sm hover:border-slate-700/80 transition-all duration-300 backdrop-blur-sm">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${getCategoryBadgeClass(stat.category)}`}>
                          {stat.category}
                        </span>
                        <span className="text-xs font-mono text-indigo-400 font-extrabold">
                          {stat.points} XP
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                          <span>{stat.completed} of {stat.total} tasks</span>
                          <span className="font-extrabold text-slate-200">{stat.completionRate}%</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/40">
                          <div 
                            className="bg-indigo-500 h-full transition-all duration-500 rounded-full shadow-sm" 
                            style={{ width: `${stat.completionRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: performance indicators */}
            <div className="space-y-6">
              {/* Performance Scores with Clean Grid backdrop */}
              <div 
                className="relative overflow-hidden p-6 md:p-8 rounded-3xl border border-slate-800/60 shadow-2xl bg-cover bg-center space-y-4"
                style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.92)), url('/src/assets/images/bg_clean_dashboard_1783195567806.jpg')` }}
              >
                <div className="relative z-10 space-y-5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Aesthetic Performance Scores</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-bold">
                        <span className="text-slate-300">Task Completion Rate</span>
                        <span className="text-indigo-400 font-mono">{performanceStats.completionRate}%</span>
                      </div>
                      <div className="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden border border-slate-800">
                        <div className="bg-indigo-600 h-full transition-all duration-500 rounded-full" style={{ width: `${performanceStats.completionRate}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-bold">
                        <span className="text-slate-300">Daily Study Consistency</span>
                        <span className="text-emerald-400 font-mono">{performanceStats.consistencyScore}%</span>
                      </div>
                      <div className="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden border border-slate-800">
                        <div className="bg-emerald-500 h-full transition-all duration-500 rounded-full" style={{ width: `${performanceStats.consistencyScore}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-bold">
                        <span className="text-slate-300">Overall Productivity Score</span>
                        <span className="text-purple-400 font-mono">{performanceStats.productivityScore}%</span>
                      </div>
                      <div className="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden border border-slate-800">
                        <div className="bg-purple-600 h-full transition-all duration-500 rounded-full" style={{ width: `${performanceStats.productivityScore}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Predicted timeline achievement */}
              {prediction && (
                <div 
                  className="relative overflow-hidden p-6 rounded-3xl border border-slate-800/60 shadow-2xl bg-cover bg-center space-y-3"
                  style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.9)), url('/src/assets/images/bg_clean_dashboard_1783195567806.jpg')` }}
                >
                  <div className="relative z-10 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Goal Achievement Timeline</h4>
                    <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-sm backdrop-blur-sm">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-100 font-mono">{prediction.expectedCompletionDate}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">Predicted Achievement Date</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. VIEW: SETTINGS / SCHEDULE CONFIG with Premium Backdrop */}
        {activeView === 'settings' && (
          <div 
            className="max-w-2xl mx-auto p-6 md:p-8 rounded-2xl border border-slate-800/80 shadow-2xl space-y-6 bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9)), url('/src/assets/images/bg_peach_minimalist_1783195556668.jpg')` }}
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <Settings className="w-5.5 h-5.5 text-indigo-500" />
                Schedule Settings & User Profile
              </h2>
              <p className="text-xs text-slate-400 mt-1">Configure your daily learning parameters and study calendar preferences.</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Profile Name</label>
                  <p className="text-sm text-slate-200 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">{user.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Email Address</label>
                  <p className="text-sm text-slate-200 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Study Hours per Day</label>
                  <p className="text-sm text-slate-200 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">{user.availableHours} Hours</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Study Shift</label>
                  <p className="text-sm text-slate-200 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 capitalize">{user.preferredStudyTime} focus</p>
                </div>
              </div>

              <div className="pt-4">
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">My Active Study Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {user.workingDays.map((d) => (
                    <span key={d} className="bg-indigo-950 text-indigo-400 border border-indigo-900 text-xs font-semibold px-3 py-1 rounded-lg">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    // Triggers profile update flow by resetting active goal
                    setActiveGoal(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95"
                >
                  Edit Profile & Reschedule Goal
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
