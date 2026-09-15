/**
 * aggregations.ts — pure functions that turn raw rows into the shapes the
 * dashboard charts need. Kept out of the route handlers so they can be
 * unit-tested without a database.
 */

import { dayKey } from "./streak.js";
import { patternMastery, type ProgressLike, type PatternMastery } from "./mastery.js";

export interface DuePoint {
  date: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  reviews: number;
  /** Percent recalled (quality >= 3), or null on days with no reviews. */
  accuracy: number | null;
}

/**
 * Count how many problems fall due on each of the next `days` days.
 * Anything already overdue is bucketed into today (index 0).
 */
export function buildDueForecast(
  nextReviewDates: Date[],
  now: Date,
  days = 14
): DuePoint[] {
  const startOfToday = atMidnight(now);
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    buckets.set(dayKey(addDays(startOfToday, i)), 0);
  }
  for (const date of nextReviewDates) {
    const key =
      date <= startOfToday ? dayKey(startOfToday) : dayKey(date);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

/**
 * Build a per-day retention trend over the last `days` days: how many reviews
 * happened and what fraction were recalled (quality >= 3).
 */
export function buildRetentionTrend(
  reviews: { reviewedAt: Date; quality: number }[],
  now: Date,
  days = 30
): TrendPoint[] {
  const startOfToday = atMidnight(now);
  const buckets = new Map<string, { total: number; recalled: number }>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(dayKey(addDays(startOfToday, -i)), { total: 0, recalled: 0 });
  }
  for (const r of reviews) {
    const bucket = buckets.get(dayKey(r.reviewedAt));
    if (!bucket) continue;
    bucket.total += 1;
    if (r.quality >= 3) bucket.recalled += 1;
  }
  return Array.from(buckets.entries()).map(([date, { total, recalled }]) => ({
    date,
    reviews: total,
    accuracy: total === 0 ? null : Math.round((recalled / total) * 100),
  }));
}

/** A problem with just the fields mastery grouping needs. */
export interface ProblemForMastery {
  pattern: string;
  progress: ProgressLike | null;
}

/**
 * Group problems by pattern and compute a PatternMastery summary for each of
 * the given `patterns` (in that order), whether or not any problems exist yet.
 */
export function groupMasteryByPattern(
  problems: ProblemForMastery[],
  patterns: readonly string[]
): PatternMastery[] {
  const byPattern = new Map<string, { progresses: ProgressLike[]; total: number }>();
  for (const pattern of patterns) {
    byPattern.set(pattern, { progresses: [], total: 0 });
  }
  for (const problem of problems) {
    const bucket = byPattern.get(problem.pattern);
    if (!bucket) continue;
    bucket.total += 1;
    if (problem.progress) bucket.progresses.push(problem.progress);
  }
  return patterns.map((pattern) => {
    const bucket = byPattern.get(pattern)!;
    return patternMastery(pattern, bucket.progresses, bucket.total);
  });
}

function atMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
