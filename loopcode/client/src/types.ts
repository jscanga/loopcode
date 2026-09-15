// Shared response shapes returned by the LoopCode API.

export type Rating = "again" | "hard" | "good" | "easy";
export type Difficulty = "easy" | "medium" | "hard";

export interface Progress {
  id: string;
  problemId: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
}

export interface Problem {
  id: string;
  title: string;
  url: string;
  pattern: string;
  difficulty: Difficulty;
  createdAt: string;
  progress: Progress | null;
}

export interface PatternMastery {
  pattern: string;
  level: number;
  score: number;
  reviewedCount: number;
  totalCount: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
  reviewedToday: boolean;
}

export interface Stats {
  streak: StreakInfo;
  totalXp: number;
  totalReviews: number;
  dueToday: number;
  totalProblems: number;
  mastery: PatternMastery[];
}

export interface ReviewResponse {
  progress: Progress;
  xpEarned: number;
  intervalDays: number;
  nextReviewDate: string;
}

export interface DashboardData {
  dueForecast: { date: string; count: number }[];
  retentionTrend: { date: string; reviews: number; accuracy: number | null }[];
  weakestPatterns: PatternMastery[];
}

export const PATTERNS = [
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "DFS/BFS",
  "Graphs",
  "Dynamic Programming",
  "Heaps",
  "Backtracking",
] as const;

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
