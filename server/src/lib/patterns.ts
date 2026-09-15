/**
 * The 8 core coding-interview patterns LoopCode tracks, plus difficulty levels.
 * Kept in one place so the seed data, mastery map, and validation all agree.
 */

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

export type Pattern = (typeof PATTERNS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export function isPattern(value: unknown): value is Pattern {
  return typeof value === "string" && (PATTERNS as readonly string[]).includes(value);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return (
    typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value)
  );
}
