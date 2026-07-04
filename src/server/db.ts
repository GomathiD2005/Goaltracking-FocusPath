import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: string;
  preferredStudyTime: 'morning' | 'afternoon' | 'night';
  workingDays: string[]; // e.g., ["Mon", "Tue", ...]
  availableHoursPerDay: number;
  streak: number;
  totalPoints: number;
  createdAt: string;
}

export interface Goal {
  _id: string;
  userId: string;
  longTermGoal: string;
  shortTermGoals: string[];
  timelineMonths: number;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  goalId: string;
  userId: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  category?: 'Learning' | 'Coding' | 'Networking' | 'Planning';
  date: string; // YYYY-MM-DD
  status: 'pending' | 'completed' | 'missed';
  rescheduledFrom: string | null; // YYYY-MM-DD or null
  isLocked: boolean;
  estimatedMinutes: number;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'morning' | 'pre-task' | 'night-review' | 'alert';
  message: string;
  sentAt: string;
  read: boolean;
}

export interface Progress {
  _id: string;
  userId: string;
  goalId: string;
  date: string; // YYYY-MM-DD
  completionRate: number; // percentage
  consistencyScore: number; // percentage
  productivityScore: number; // percentage
}

export interface Prediction {
  _id: string;
  userId: string;
  goalId: string;
  successProbability: number; // 0-100
  expectedCompletionDate: string; // YYYY-MM-DD
  riskFactors: string[];
  generatedAt: string;
}

export interface Reward {
  _id: string;
  userId: string;
  type: 'streak' | 'milestone' | 'badge';
  title: string;
  description: string;
  earnedAt: string;
}

export interface ActivityLog {
  _id: string;
  userId: string;
  action: string;
  metadata: any;
  timestamp: string;
}

interface DatabaseSchema {
  users: User[];
  goals: Goal[];
  tasks: Task[];
  notifications: Notification[];
  progress: Progress[];
  predictions: Prediction[];
  rewards: Reward[];
  activityLogs: ActivityLog[];
}

const initialDb: DatabaseSchema = {
  users: [],
  goals: [],
  tasks: [],
  notifications: [],
  progress: [],
  predictions: [],
  rewards: [],
  activityLogs: [],
};

class DatabaseManager {
  private data: DatabaseSchema = initialDb;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all keys exist
        this.data.users = this.data.users || [];
        this.data.goals = this.data.goals || [];
        this.data.tasks = this.data.tasks || [];
        this.data.notifications = this.data.notifications || [];
        this.data.progress = this.data.progress || [];
        this.data.predictions = this.data.predictions || [];
        this.data.rewards = this.data.rewards || [];
        this.data.activityLogs = this.data.activityLogs || [];
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Error loading local database, resetting:', e);
      this.data = { ...initialDb };
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving local database:', e);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Generic Helpers
  getCollection<K extends keyof DatabaseSchema>(collection: K): DatabaseSchema[K] {
    this.load(); // reload to get fresh changes
    return this.data[collection];
  }

  insert<K extends keyof DatabaseSchema>(collection: K, item: any): any {
    this.load();
    const newItem = {
      _id: this.generateId(),
      ...item,
    };
    (this.data[collection] as any[]).push(newItem);
    this.save();
    return newItem;
  }

  update<K extends keyof DatabaseSchema>(collection: K, query: Partial<any>, updateFields: Partial<any>): number {
    this.load();
    let updatedCount = 0;
    const list = this.data[collection] as any[];
    for (let i = 0; i < list.length; i++) {
      let matches = true;
      for (const key of Object.keys(query)) {
        if (list[i][key] !== query[key]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        list[i] = { ...list[i], ...updateFields };
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      this.save();
    }
    return updatedCount;
  }

  delete<K extends keyof DatabaseSchema>(collection: K, query: Partial<any>): number {
    this.load();
    const list = this.data[collection] as any[];
    const originalLength = list.length;
    const filtered = list.filter((item) => {
      let matches = true;
      for (const key of Object.keys(query)) {
        if (item[key] !== query[key]) {
          matches = false;
          break;
        }
      }
      return !matches;
    });
    this.data[collection] = filtered as any;
    const deletedCount = originalLength - filtered.length;
    if (deletedCount > 0) {
      this.save();
    }
    return deletedCount;
  }

  find<K extends keyof DatabaseSchema>(collection: K, query?: Partial<any>): DatabaseSchema[K] {
    this.load();
    const list = this.data[collection] as any[];
    if (!query || Object.keys(query).length === 0) {
      return list as any;
    }
    return list.filter((item) => {
      for (const key of Object.keys(query)) {
        if (item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    }) as any;
  }

  findOne<K extends keyof DatabaseSchema>(collection: K, query: Partial<any>): any | null {
    this.load();
    const list = this.data[collection] as any[];
    for (const item of list) {
      let matches = true;
      for (const key of Object.keys(query)) {
        if (item[key] !== query[key]) {
          matches = false;
          break;
        }
      }
      if (matches) return item;
    }
    return null;
  }
}

export const db = new DatabaseManager();
