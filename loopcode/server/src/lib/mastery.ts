/**
 * mastery.ts — derive a 0-5 "mastery level" per pattern (Duolingo skill-tree
 * style) from the aggregate spaced-repetition state of the problems in it.
 *
 * Mastery is intentionally *derived*, not stored, so it always reflects the
 * latest reviews. A pattern is more "mastered" when its problems have been
 * recalled successfully many times (high repetitions) and have drifted to a
 * high ease factor (the learner finds them easy). Both signals are averaged
 * across the problems in the pattern and blended into a 0-1 score, then mapped
 * to a 0-5 level for the UI.
 *
 * The function is pure so it can be unit-tested and reused by the dashboard.
 */

import { INITIAL_EASE_FACTOR, MIN_EASE_FACTOR } from "./spacedRepetition.js";

/** Minimal progress shape mastery needs (a subset of the UserProgress row). */
export interface ProgressLike {
  repetitions: number;
  easeFactor: number;
}

/** Repetitions at which a problem counts as "fully drilled" for the score. */
export const REPS_FOR_FULL_CREDIT = 5;

/** Maximum mastery level shown in the UI. */
export const MAX_MASTERY_LEVEL = 5;

// How much each signal contributes to the blended 0-1 score.
const REPETITION_WEIGHT = 0.6;
const EASE_WEIGHT = 0.4;

export interface PatternMastery {
  pattern: string;
  /** 0-5 integer level for the skill-tree tile. */
  level: number;
  /** Raw 0-1 score behind the level (useful for progress bars/sorting). */
  score: number;
  /** How many problems in this pattern have at least one review. */
  reviewedCount: number;
  /** Total problems in this pattern. */
  totalCount: number;
}

/**
 * Compute the blended 0-1 mastery score for a set of problems in one pattern.
 * Returns 0 for an empty pattern.
 */
export function masteryScore(progresses: ProgressLike[]): number {
  if (progresses.length === 0) return 0;

  const avgReps =
    progresses.reduce((sum, p) => sum + p.repetitions, 0) / progresses.length;

  const avgEase =
    progresses.reduce((sum, p) => sum + p.easeFactor, 0) / progresses.length;

  // Normalise each signal to 0-1.
  const repComponent = clamp01(avgReps / REPS_FOR_FULL_CREDIT);
  const easeComponent = clamp01(
    (avgEase - MIN_EASE_FACTOR) / (INITIAL_EASE_FACTOR + 0.5 - MIN_EASE_FACTOR)
  );

  return clamp01(repComponent * REPETITION_WEIGHT + easeComponent * EASE_WEIGHT);
}

/** Map a 0-1 score to a 0-5 integer level. */
export function scoreToLevel(score: number): number {
  return Math.round(clamp01(score) * MAX_MASTERY_LEVEL);
}

/**
 * Build a full PatternMastery summary for one pattern.
 * `progresses` should contain only problems belonging to `pattern`.
 */
export function patternMastery(
  pattern: string,
  progresses: ProgressLike[],
  totalCount: number
): PatternMastery {
  const reviewed = progresses.filter((p) => p.repetitions > 0);
  const score = masteryScore(progresses);
  return {
    pattern,
    score: Math.round(score * 100) / 100,
    level: scoreToLevel(score),
    reviewedCount: reviewed.length,
    totalCount,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
