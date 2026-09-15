/**
 * streak.ts — compute the daily review streak from review timestamps.
 *
 * A "streak" is the number of consecutive calendar days (up to and including
 * today) on which the learner completed at least one review. The current streak
 * survives if the most recent review was today OR yesterday (so the counter
 * doesn't reset the instant midnight passes); it breaks after a full missed day.
 *
 * Pure and timezone-agnostic: callers pass in the list of review dates and the
 * reference "now", and days are compared by their local Y-M-D key.
 */

/** A local YYYY-MM-DD key for a date, used to collapse timestamps into days. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface StreakInfo {
  current: number;
  longest: number;
  /** Whether a review has already been done today (drives the flame UI). */
  reviewedToday: boolean;
}

/**
 * @param reviewDates timestamps of every review (any order).
 * @param now         reference time (injected for deterministic tests).
 */
export function computeStreak(reviewDates: Date[], now: Date = new Date()): StreakInfo {
  if (reviewDates.length === 0) {
    return { current: 0, longest: 0, reviewedToday: false };
  }

  // Unique active days, sorted ascending.
  const days = Array.from(new Set(reviewDates.map(dayKey))).sort();
  const daySet = new Set(days);

  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(addDays(now, -1));
  const reviewedToday = daySet.has(todayKey);

  // Longest run of consecutive days anywhere in the history.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (isNextDay(days[i - 1], days[i])) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak: walk backwards from today (or yesterday) while days exist.
  let current = 0;
  let cursor: Date;
  if (reviewedToday) {
    cursor = new Date(now);
  } else if (daySet.has(yesterdayKey)) {
    cursor = addDays(now, -1);
  } else {
    return { current: 0, longest, reviewedToday };
  }
  while (daySet.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest, reviewedToday };
}

function isNextDay(prevKey: string, nextKey: string): boolean {
  const prev = new Date(prevKey + "T00:00:00");
  const next = new Date(nextKey + "T00:00:00");
  return dayKey(addDays(prev, 1)) === dayKey(next);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}
